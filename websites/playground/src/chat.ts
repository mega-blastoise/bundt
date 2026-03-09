import type { McpHandler } from '@bundt/prev/server';
import type { McpToolDefinition } from '@bundt/prev';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

interface ChatRequest {
  apiKey: string;
  message: string;
  sessionId?: string;
  history?: ChatMessage[];
}

interface ChatState {
  history: ChatMessage[];
  sessionId: string;
  frameId?: string;
}

const chatStates = new Map<string, ChatState>();

function buildSystemPrompt(tools: McpToolDefinition[]): string {
  const toolList = tools.map((t) => `- **${t.name}**: ${t.description}`).join('\n');
  return `You are a UI composition assistant for the prev playground. You help users build dashboards and workspaces by composing fragments (UI components) with data sources.

You have access to these tools:
${toolList}

## How to compose UIs:

1. First, use \`list_fragments\` and \`list_data_sources\` to see what's available if you're unsure.
2. Use \`compose_frame\` to create a workspace. You can compose by intent (natural language) or structured (explicit fragment selection).
3. Use \`mutate_frame\` to modify an existing workspace — add, remove, or replace fragments.
4. Use \`get_frame_state\` to inspect the current workspace.

## Guidelines:
- Always compose a frame when the user asks to "show", "build", "create", or "display" something.
- Pick the most relevant fragments for the user's request.
- Use the "structured" composition type when you know exactly which fragments to use.
- Use the "intent" type when the request is vague and you want the engine to figure it out.
- After composing, briefly describe what was created.
- Keep responses concise — the UI speaks for itself.`;
}

function convertToolsToClaudeFormat(tools: McpToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

export async function handleChat(
  req: Request,
  mcpHandler: McpHandler
): Promise<Response> {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.apiKey || typeof body.apiKey !== 'string') {
    return Response.json({ error: 'API key is required' }, { status: 400 });
  }

  if (!body.message || typeof body.message !== 'string') {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  const sessionId = body.sessionId ?? crypto.randomUUID();
  const state = chatStates.get(sessionId) ?? { history: [], sessionId, frameId: undefined };

  const tools = mcpHandler.getToolDefinitions();
  const systemPrompt = buildSystemPrompt(tools);
  const claudeTools = convertToolsToClaudeFormat(tools);

  state.history.push({ role: 'user', content: body.message });

  try {
    const result = await runAgentLoop(body.apiKey, systemPrompt, state.history, claudeTools, mcpHandler);
    state.history = result.history;
    state.frameId = result.frameId ?? state.frameId;
    chatStates.set(sessionId, state);

    return Response.json({
      sessionId,
      response: result.response,
      frameId: state.frameId,
      toolCalls: result.toolCalls,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    if (message.includes('401') || message.includes('authentication')) {
      return Response.json({ error: 'Invalid API key' }, { status: 401 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}

interface AgentResult {
  response: string;
  history: ChatMessage[];
  frameId?: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: string }>;
}

async function runAgentLoop(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  tools: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>,
  mcpHandler: McpHandler
): Promise<AgentResult> {
  const maxIterations = 128;
  const toolCalls: AgentResult['toolCalls'] = [];
  let currentHistory = [...history];
  let frameId: string | undefined;

  for (let i = 0; i < maxIterations; i++) {
    const response = await callClaude(apiKey, systemPrompt, currentHistory, tools);

    const textBlocks: string[] = [];
    const toolUseBlocks: Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }> = [];

    for (const block of response.content) {
      if (block.type === 'text') textBlocks.push(block.text);
      if (block.type === 'tool_use') toolUseBlocks.push(block);
    }

    currentHistory.push({ role: 'assistant', content: response.content });

    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      return {
        response: textBlocks.join('\n'),
        history: currentHistory,
        frameId,
        toolCalls,
      };
    }

    const toolResults: ContentBlock[] = [];
    for (const toolUse of toolUseBlocks) {
      const result = await mcpHandler.handleToolCall(toolUse.name, toolUse.input);
      const resultText = result.content.map((c) => c.text).join('\n');
      toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: resultText });
      toolCalls.push({ name: toolUse.name, args: toolUse.input, result: resultText });

      if (toolUse.name === 'compose_frame' || toolUse.name === 'mutate_frame') {
        try {
          const parsed = JSON.parse(resultText);
          if (parsed.frameId) frameId = parsed.frameId;
        } catch { /* ignore parse failures */ }
      }
    }

    currentHistory.push({ role: 'user', content: toolResults });
  }

  return {
    response: 'Reached maximum tool call iterations.',
    history: currentHistory,
    frameId,
    toolCalls,
  };
}

interface ClaudeResponse {
  content: ContentBlock[];
  stop_reason: string;
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  tools: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>
): Promise<ClaudeResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      tools,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error (${res.status}): ${text}`);
  }

  return (await res.json()) as ClaudeResponse;
}
