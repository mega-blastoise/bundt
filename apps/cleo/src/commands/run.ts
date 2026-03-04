import { pc, info, warn } from '../ui';
import { SYSTEM_PROMPT } from '../prompt';
import { smolResponseSchema, smolJsonSchema, type SmolResponse } from '../schema';
import { prepareBcpContext } from '../integrations/bcp';

export interface RunOptions {
  prompt: string;
  model: string;
  maxBudget?: number;
}

export interface RunResult {
  response: SmolResponse;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
}

type JsonResult = {
  result?: string;
  is_error?: boolean;
  usage?: { input_tokens?: number; output_tokens?: number };
  cost_usd?: number;
};

async function findClaude(): Promise<string> {
  const proc = Bun.spawn(['which', 'claude'], { stdout: 'pipe', stderr: 'pipe' });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error('claude not found in PATH. Install Claude Code first.');
  return text.trim();
}

export async function runCommand(task: string[], options: { model: string; maxBudget?: string; bcp?: string; budget?: string }) {
  const prompt = task.join(' ');

  if (!prompt) {
    console.error(pc.red('Error: No task provided.'));
    console.error(pc.dim('Usage: cleo run "describe your task here"'));
    process.exit(1);
  }

  console.log(pc.bold(pc.cyan('cleo run')) + pc.dim(' — token-lean Claude Code runner'));
  console.log();
  console.log(pc.bold('Task: ') + prompt);
  console.log();

  let bcpContext: string | undefined;
  if (options.bcp) {
    try {
      const bcpResult = await prepareBcpContext({
        filePath: options.bcp,
        budget: options.budget ? Number(options.budget) : undefined
      });
      if (bcpResult) {
        bcpContext = bcpResult.text;
        info(`BCP context: ${bcpResult.blockCount} blocks, ${bcpResult.totalSize} bytes`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      warn(`BCP context preparation failed: ${msg}`);
    }
  }

  const result = await run({
    prompt,
    model: options.model,
    maxBudget: options.maxBudget ? Number(options.maxBudget) : undefined,
    bcpContext
  });

  const { response } = result;

  console.log();
  console.log(pc.bold(pc.cyan('Summary')));
  console.log(pc.dim('─'.repeat(50)));
  console.log(response.summary);

  if (response.filesChanged.length > 0) {
    console.log();
    console.log(pc.bold('Files changed:'));
    for (const f of response.filesChanged) {
      console.log(pc.green(`  + ${f}`));
    }
  }

  if (response.errors.length > 0) {
    console.log();
    console.log(pc.bold(pc.red('Errors:')));
    for (const e of response.errors) {
      console.log(pc.red(`  - ${e}`));
    }
  }

  console.log();
  console.log(pc.bold(pc.cyan('Stats')));
  console.log(pc.dim('─'.repeat(50)));
  console.log(`${pc.bold('Tokens:')}   ${pc.yellow(result.inputTokens.toLocaleString())} in / ${pc.yellow(result.outputTokens.toLocaleString())} out`);

  const costStr = result.costUsd > 0 ? `$${result.costUsd.toFixed(4)}` : 'N/A';
  console.log(`${pc.bold('Cost:')}     ${pc.yellow(costStr)}`);
  console.log(`${pc.bold('Duration:')} ${pc.yellow(`${(result.durationMs / 1000).toFixed(1)}s`)}`);
}

async function run(options: RunOptions & { bcpContext?: string }): Promise<RunResult> {
  const { prompt, model, maxBudget, bcpContext } = options;
  const start = performance.now();
  const claudePath = await findClaude();

  console.log(pc.dim(`Model: ${model} | Claude: ${claudePath}`));
  console.log(pc.dim('─'.repeat(50)));

  const systemPrompt = bcpContext
    ? `${SYSTEM_PROMPT}\n\n<bcp-context>\n${bcpContext}\n</bcp-context>`
    : SYSTEM_PROMPT;

  const args = [
    claudePath,
    '--print',
    '--output-format', 'json',
    '--model', model,
    '--system-prompt', systemPrompt,
    '--json-schema', smolJsonSchema,
    '--permission-mode', 'acceptEdits'
  ];

  if (maxBudget !== undefined) {
    args.push('--max-budget-usd', String(maxBudget));
  }

  args.push(prompt);

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
    response: parsed.data,
    inputTokens: raw.usage?.input_tokens ?? 0,
    outputTokens: raw.usage?.output_tokens ?? 0,
    costUsd: raw.cost_usd ?? 0,
    durationMs: performance.now() - start
  };
}
