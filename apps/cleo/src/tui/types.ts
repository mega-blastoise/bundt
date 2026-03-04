export type SessionStatus = 'running' | 'waiting' | 'done' | 'error';

export interface Session {
  id: string;
  name: string;
  prompt: string;
  status: SessionStatus;
  model: string;
  agent?: string;
  bcpContext?: string;
  templateName?: string;
  lines: string[];
  startedAt: number;
  finishedAt?: number;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  turnCount: number;
  error?: string;
  proc?: ReturnType<typeof Bun.spawn>;
  sessionId?: string;
  availableAgents?: string[];
}

export type PaneFocus = 'sidebar' | 'main';
export type InputMode = 'none' | 'chat';

export type ModalKind =
  | 'help'
  | 'new-session'
  | 'select-model'
  | 'select-agent'
  | 'select-template'
  | 'dispatch-tasks'
  | 'confirm-quit'
  | 'confirm-kill'
  | null;

export interface TaskTemplateEntry {
  name: string;
  description: string;
  model: string;
  source: 'local' | 'global';
  fileCount: number;
  commandCount: number;
  documentCount: number;
}

export interface WorkflowStep {
  template: string;
  dependsOn?: string[];
  contextFrom?: string[];
}

export interface Workflow {
  name: string;
  steps: WorkflowStep[];
}

export interface AppState {
  sessions: Session[];
  activeIndex: number;
  focus: PaneFocus;
  inputMode: InputMode;
  modal: ModalKind;
  inputBuffer: string;
  inputLabel: string;
  scrollOffset: number;
  sidebarWidth: number;
  running: boolean;
  themeName: string;
  // New session staging
  pendingModel: string;
  pendingAgent: string;
  pendingBcpContext: string;
  pendingTemplateName: string;
  modelSelectIndex: number;
  agentSelectIndex: number;
  // Template picker
  templates: TaskTemplateEntry[];
  templateSelectIndex: number;
  // Batch dispatch
  dispatchSelectIndex: number;
  dispatchSelected: Set<number>;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StreamJsonInit {
  type: 'system';
  subtype: 'init';
  session_id: string;
  model: string;
  agents?: string[];
}

export interface StreamJsonAssistant {
  type: 'assistant';
  message: {
    content: Array<{ type: string; text?: string; name?: string; input?: unknown }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
}

export interface StreamJsonResult {
  type: 'result';
  subtype: 'success' | 'error';
  result?: string;
  total_cost_usd?: number;
  duration_ms?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export type StreamJsonEvent = StreamJsonInit | StreamJsonAssistant | StreamJsonResult | { type: string };

export const MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-haiku-3-5',
  'sonnet',
  'opus',
  'haiku',
] as const;

export const DEFAULT_MODEL = 'claude-sonnet-4-6';
