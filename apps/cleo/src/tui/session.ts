import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import type { Session, StreamJsonEvent } from './types';
import { addLine, setStatus } from './state';
import { fg, type Theme } from './themes';
import { getTheme } from './themes';

async function findClaude(): Promise<string> {
  const proc = Bun.spawn(['which', 'claude'], { stdout: 'pipe', stderr: 'pipe' });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error('claude not found in PATH');
  return text.trim();
}

let claudePath: string | null = null;

async function getClaude(): Promise<string> {
  if (claudePath) return claudePath;
  claudePath = await findClaude();
  return claudePath;
}

export async function launchSession(
  session: Session,
  themeName: string,
  onUpdate: () => void
): Promise<void> {
  const theme = getTheme(themeName);
  setStatus(session, 'running');
  session.turnCount = 1;
  addLine(session, fg(theme.textDim, `$ claude "${session.prompt}"`));
  addLine(session, '');
  onUpdate();

  let claude: string;
  try {
    claude = await getClaude();
  } catch {
    setStatus(session, 'error');
    session.error = 'claude not found in PATH';
    addLine(session, fg(theme.error, 'Error: claude not found in PATH'));
    onUpdate();
    return;
  }

  const env = { ...process.env };
  delete env['CLAUDECODE'];

  const args = [
    claude,
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--model', session.model,
    '--permission-mode', 'acceptEdits',
  ];

  if (session.agent) {
    args.push('--agent', session.agent);
  }

  // When BCP context is present, embed it in the prompt and pipe via stdin
  // to avoid E2BIG (ARG_MAX) when context is large
  let stdinFile: string | undefined;
  if (session.bcpContext) {
    const combined = `${session.prompt}\n\n<context>\n${session.bcpContext}\n</context>`;
    stdinFile = join(tmpdir(), `cleo-tui-${randomBytes(8).toString('hex')}.txt`);
    writeFileSync(stdinFile, combined, 'utf8');
  } else {
    args.push(session.prompt);
  }

  await runTurn(session, args, env, theme, onUpdate, stdinFile);
}

export async function sendFollowUp(
  session: Session,
  message: string,
  themeName: string,
  onUpdate: () => void
): Promise<void> {
  if (session.status !== 'waiting' || !session.sessionId) return;

  const theme = getTheme(themeName);
  session.turnCount++;
  setStatus(session, 'running');

  addLine(session, '');
  addLine(session, fg(theme.userMessage, `\u276f ${message}`));
  addLine(session, '');
  onUpdate();

  let claude: string;
  try {
    claude = await getClaude();
  } catch {
    setStatus(session, 'error');
    session.error = 'claude not found in PATH';
    onUpdate();
    return;
  }

  const env = { ...process.env };
  delete env['CLAUDECODE'];

  // Resume the existing conversation — no --model flag, claude remembers
  const args = [
    claude,
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--resume', session.sessionId,
    '--permission-mode', 'acceptEdits',
    message,
  ];

  await runTurn(session, args, env, theme, onUpdate);
}

async function runTurn(
  session: Session,
  args: string[],
  env: Record<string, string | undefined>,
  theme: Theme,
  onUpdate: () => void,
  stdinFile?: string
): Promise<void> {
  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: stdinFile ? Bun.file(stdinFile).stream() : undefined,
    env,
  });

  session.proc = proc;

  // Read stderr concurrently
  void readStderr(session, proc, theme, onUpdate);

  // Process stdout stream-json lines
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const processChunk = (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as StreamJsonEvent;
        handleEvent(session, event, theme, onUpdate);
      } catch {
        addLine(session, line);
        onUpdate();
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      processChunk(decoder.decode(value, { stream: true }));
    }
    if (buffer.trim()) {
      processChunk(buffer + '\n');
    }
  } catch {
    // Stream closed
  }

  await proc.exited;

  if (stdinFile) {
    try { unlinkSync(stdinFile); } catch { /* ignore */ }
  }

  // If status is 'waiting', the turn completed normally — keep waiting for follow-ups
  // Only set done/error if we're still in 'running' (no result event received)
  if (session.status === 'running') {
    if (proc.exitCode === 0) {
      setStatus(session, 'done');
    } else {
      setStatus(session, 'error');
      session.error = `Exit code ${proc.exitCode}`;
      addLine(session, fg(theme.error, `Process exited with code ${proc.exitCode}`));
    }
    onUpdate();
  }
}

async function readStderr(
  session: Session,
  proc: ReturnType<typeof Bun.spawn>,
  theme: Theme,
  onUpdate: () => void
) {
  try {
    const stderr = proc.stderr as ReadableStream<Uint8Array>;
    const reader = stderr.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) {
          addLine(session, fg(theme.textDim, `stderr: ${line}`));
          onUpdate();
        }
      }
    }
  } catch {
    // Stream closed
  }
}

function handleEvent(session: Session, event: StreamJsonEvent, theme: Theme, onUpdate: () => void) {
  switch (event.type) {
    case 'system': {
      const e = event as { subtype?: string; session_id?: string; model?: string; agents?: string[] };
      if (e.subtype === 'init') {
        session.sessionId = e.session_id;
        if (e.agents) {
          session.availableAgents = e.agents;
        }
        addLine(session, fg(theme.textDim, `Session: ${e.session_id?.slice(0, 8)}\u2026`));
        addLine(session, fg(theme.textDim, `Model: ${e.model}`));
        addLine(session, '');
      }
      break;
    }
    case 'assistant': {
      const e = event as { message?: { content?: Array<{ type: string; text?: string; name?: string; input?: unknown }> } };
      const content = e.message?.content;
      if (!content) break;

      for (const block of content) {
        if (block.type === 'text' && block.text) {
          for (const line of block.text.split('\n')) {
            addLine(session, line);
          }
        } else if (block.type === 'tool_use') {
          addLine(session, fg(theme.toolCall, `\u2192 ${block.name ?? 'tool'}`));
          if (block.input && typeof block.input === 'object') {
            const inp = block.input as Record<string, unknown>;
            if (inp['command']) {
              addLine(session, fg(theme.textDim, `  $ ${String(inp['command']).slice(0, 120)}`));
            } else if (inp['file_path']) {
              addLine(session, fg(theme.textDim, `  ${String(inp['file_path'])}`));
            } else if (inp['pattern']) {
              addLine(session, fg(theme.textDim, `  /${String(inp['pattern'])}/`));
            }
          }
        }
      }
      break;
    }
    case 'result': {
      const e = event as { subtype?: string; total_cost_usd?: number; usage?: { input_tokens?: number; output_tokens?: number } };
      addLine(session, '');
      if (e.total_cost_usd !== undefined) {
        session.costUsd = (session.costUsd ?? 0) + e.total_cost_usd;
        addLine(session, fg(theme.textDim, `Cost: $${session.costUsd.toFixed(4)} (turn: $${e.total_cost_usd.toFixed(4)})`));
      }
      if (e.usage) {
        session.inputTokens = (session.inputTokens ?? 0) + (e.usage.input_tokens ?? 0);
        session.outputTokens = (session.outputTokens ?? 0) + (e.usage.output_tokens ?? 0);
        addLine(session, fg(theme.textDim, `Tokens: ${session.inputTokens} in / ${session.outputTokens} out`));
      }

      // Turn complete — process will exit, but session can accept follow-ups via --resume
      if (e.subtype === 'success') {
        setStatus(session, 'waiting');
        addLine(session, '');
        addLine(session, fg(theme.info, '\u25c6 Ready for follow-up (press i to type)'));
      } else {
        setStatus(session, 'error');
      }
      break;
    }
  }
  onUpdate();
}

export function killSession(session: Session, themeName: string) {
  if (session.proc && (session.status === 'running' || session.status === 'waiting')) {
    session.proc.kill();
    setStatus(session, 'error');
    session.error = 'Killed by user';
    addLine(session, fg(getTheme(themeName).error, 'Session killed.'));
  }
}
