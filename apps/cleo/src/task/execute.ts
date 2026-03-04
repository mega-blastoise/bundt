import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createContext, buildAndDecodeContext, isBcpAvailable } from '../integrations/bcp';
import { pc, info, warn, sep, heading } from '../ui';
import { SYSTEM_PROMPT } from '../prompt';
import { smolResponseSchema, smolJsonSchema } from '../schema';
import type { TaskDefinition } from './schema';

interface ExecuteResult {
  summary: string;
  filesChanged: string[];
  errors: string[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  bcpStats?: {
    blockCount: number;
    totalSize: number;
  };
}

type JsonResult = {
  result?: string;
  is_error?: boolean;
  usage?: { input_tokens?: number; output_tokens?: number };
  cost_usd?: number;
};

const findClaude = async (): Promise<string> => {
  const proc = Bun.spawn(['which', 'claude'], { stdout: 'pipe', stderr: 'pipe' });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error('claude not found in PATH. Install Claude Code first.');
  return text.trim();
};

const runCommand = async (cmd: string): Promise<string> => {
  const proc = Bun.spawn(['sh', '-c', cmd], {
    stdout: 'pipe',
    stderr: 'pipe',
    cwd: process.cwd()
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  return stdout + (stderr ? `\n${stderr}` : '');
};

const assembleContext = async (task: TaskDefinition): Promise<{ text: string; blockCount: number; totalSize: number } | null> => {
  const available = await isBcpAvailable();
  if (!available) {
    warn('bcp binary not found — falling back to raw context injection.');
    return null;
  }

  const ctx = createContext(`Task: ${task.description}`);

  // Add files
  for (const file of task.files) {
    const absPath = resolve(process.cwd(), file.path);
    if (!existsSync(absPath)) {
      warn(`Skipping missing file: ${file.path}`);
      continue;
    }
    const content = readFileSync(absPath, 'utf8');
    ctx.addFile(file.path, content, {
      priority: file.priority,
      summary: file.summary
    });
  }

  // Run commands and capture output
  for (const cmd of task.commands) {
    info(`Running: ${pc.dim(cmd.run)}`);
    const output = await runCommand(cmd.run);
    ctx.addToolResult(cmd.run, output, undefined, {
      priority: cmd.priority,
      summary: cmd.summary
    });
  }

  // Add documents
  for (const doc of task.documents) {
    ctx.addDocument(doc.title, doc.content, {
      format: doc.format,
      priority: doc.priority,
      summary: doc.summary
    });
  }

  // Add the task description as a conversation block
  ctx.addConversation('user', task.description, { priority: 'critical' });

  if (ctx.blockCount === 0) {
    return null;
  }

  info(`Assembled ${ctx.blockCount} BCP blocks`);

  const result = await buildAndDecodeContext(ctx, {
    budget: task.budget,
    mode: 'xml'
  });

  return result;
};

const buildFallbackContext = async (task: TaskDefinition): Promise<string> => {
  const parts: string[] = [];

  for (const file of task.files) {
    const absPath = resolve(process.cwd(), file.path);
    if (!existsSync(absPath)) continue;
    const content = readFileSync(absPath, 'utf8');
    parts.push(`<file path="${file.path}">\n${content}\n</file>`);
  }

  for (const cmd of task.commands) {
    const output = await runCommand(cmd.run);
    parts.push(`<tool_result command="${cmd.run}">\n${output}\n</tool_result>`);
  }

  for (const doc of task.documents) {
    parts.push(`<document title="${doc.title}">\n${doc.content}\n</document>`);
  }

  return parts.join('\n\n');
};

export const executeTask = async (task: TaskDefinition): Promise<ExecuteResult> => {
  const start = performance.now();

  console.log();
  console.log(heading('Preparing context'));
  console.log(sep());

  // Try BCP assembly, fall back to raw
  let contextText: string;
  let bcpStats: ExecuteResult['bcpStats'];

  const bcpResult = await assembleContext(task);
  if (bcpResult) {
    contextText = bcpResult.text;
    bcpStats = { blockCount: bcpResult.blockCount, totalSize: bcpResult.totalSize };
    info(`BCP context ready: ${bcpResult.blockCount} blocks, ~${Math.round(bcpResult.totalSize / 4)} tokens`);
  } else {
    info('Assembling raw context (no BCP)');
    contextText = await buildFallbackContext(task);
  }

  console.log();
  console.log(heading('Running Claude'));
  console.log(sep());

  const claudePath = await findClaude();
  info(`Model: ${task.model} | Claude: ${claudePath}`);

  const systemPrompt = contextText
    ? `${SYSTEM_PROMPT}\n\n<context>\n${contextText}\n</context>`
    : SYSTEM_PROMPT;

  const args = [
    claudePath,
    '--print',
    '--output-format', 'json',
    '--model', task.model,
    '--system-prompt', systemPrompt,
    '--json-schema', smolJsonSchema,
    '--permission-mode', 'acceptEdits'
  ];

  if (task.maxBudgetUsd !== undefined) {
    args.push('--max-budget-usd', String(task.maxBudgetUsd));
  }

  args.push(task.description);

  const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe', env: { ...process.env } });
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;

  if (proc.exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`claude exited with code ${proc.exitCode}: ${stderr.trim()}`);
  }

  let raw: JsonResult;
  try {
    raw = JSON.parse(stdout) as JsonResult;
  } catch {
    throw new Error(`Failed to parse claude output: ${stdout.slice(0, 200)}`);
  }

  const parsed = smolResponseSchema.safeParse(JSON.parse(raw.result ?? '{}'));
  if (!parsed.success) {
    throw new Error(`Structured output validation failed: ${parsed.error.message}`);
  }

  return {
    summary: parsed.data.summary,
    filesChanged: parsed.data.filesChanged,
    errors: parsed.data.errors,
    inputTokens: raw.usage?.input_tokens ?? 0,
    outputTokens: raw.usage?.output_tokens ?? 0,
    costUsd: raw.cost_usd ?? 0,
    durationMs: performance.now() - start,
    bcpStats
  };
};
