import type { ReactNode } from 'react';
import type { ChatConfig, ChatMessage } from '../types';

function DefaultMessage({ message }: { message: ChatMessage }): ReactNode {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={`prev-chat-message prev-chat-message--${message.role}`}
      data-role={message.role}
    >
      {!isSystem && (
        <div className="prev-chat-message__author">
          {isUser ? 'You' : 'Agent'}
        </div>
      )}
      <div className="prev-chat-message__content">{message.content}</div>
      {message.toolCalls?.map((tc, i) => (
        <div key={i} className={`prev-chat-tool-call prev-chat-tool-call--${tc.status}`}>
          <div className="prev-chat-tool-call__name">{tc.name}</div>
          <div className="prev-chat-tool-call__status">{tc.status}</div>
        </div>
      ))}
    </div>
  );
}

function DefaultInput({ onSend }: { onSend: (message: string) => void }): ReactNode {
  return (
    <form
      className="prev-chat-input"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const input = form.elements.namedItem('message') as HTMLInputElement;
        if (input.value.trim()) {
          onSend(input.value.trim());
          input.value = '';
        }
      }}
    >
      <input
        type="text"
        name="message"
        placeholder="Message the agent..."
        autoComplete="off"
        className="prev-chat-input__field"
      />
      <button type="submit" className="prev-chat-input__send">Send</button>
    </form>
  );
}

export function ChatPanel({
  messages,
  config,
  sessionId,
  connected
}: {
  messages: ChatMessage[];
  config?: ChatConfig;
  sessionId?: string;
  connected?: boolean;
}): ReactNode {
  const renderMessage = config?.renderMessage ?? ((msg: ChatMessage) => <DefaultMessage message={msg} />);

  return (
    <div className="prev-chat-panel" data-session-id={sessionId}>
      <div className="prev-chat-header">
        <span className="prev-chat-header__title">Agent</span>
        <span className={`prev-chat-header__status prev-chat-header__status--${connected ? 'connected' : 'disconnected'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="prev-chat-messages">
        {messages.map((msg) => (
          <div key={msg.id}>{renderMessage(msg)}</div>
        ))}
      </div>
      <DefaultInput onSend={() => {}} />
    </div>
  );
}

export function generateChatCSS(theme: 'dark' | 'light' = 'dark'): string {
  const colors = theme === 'dark' ? {
    bg: '#0c0c0f',
    headerBg: '#111116',
    messageBg: '#16161e',
    userBg: '#1a1a2e',
    agentBg: '#0f1a2e',
    systemBg: '#1a1a1a',
    text: '#e0e0e0',
    textMuted: '#888',
    border: '#1e1e2a',
    inputBg: '#111116',
    inputBorder: '#2a2a3a',
    accent: '#3b82f6',
    toolPending: '#eab308',
    toolSuccess: '#22c55e',
    toolError: '#ef4444'
  } : {
    bg: '#ffffff',
    headerBg: '#f8f8f8',
    messageBg: '#f0f0f0',
    userBg: '#e8f0fe',
    agentBg: '#f0f0f0',
    systemBg: '#f5f5f5',
    text: '#1a1a1a',
    textMuted: '#666',
    border: '#e0e0e0',
    inputBg: '#ffffff',
    inputBorder: '#d0d0d0',
    accent: '#2563eb',
    toolPending: '#ca8a04',
    toolSuccess: '#16a34a',
    toolError: '#dc2626'
  };

  return `
    .prev-chat-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: ${colors.bg};
      border-left: 1px solid ${colors.border};
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      color: ${colors.text};
    }
    .prev-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid ${colors.border};
      background: ${colors.headerBg};
      flex-shrink: 0;
    }
    .prev-chat-header__title { font-weight: 600; font-size: 13px; }
    .prev-chat-header__status { font-size: 11px; color: ${colors.textMuted}; display: flex; align-items: center; gap: 6px; }
    .prev-chat-header__status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
    .prev-chat-header__status--connected::before { background: ${colors.toolSuccess}; }
    .prev-chat-header__status--disconnected::before { background: ${colors.toolError}; }
    .prev-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .prev-chat-message { padding: 8px 12px; border-radius: 6px; }
    .prev-chat-message--user { background: ${colors.userBg}; }
    .prev-chat-message--agent { background: ${colors.agentBg}; }
    .prev-chat-message--system { background: ${colors.systemBg}; font-size: 12px; color: ${colors.textMuted}; }
    .prev-chat-message__author { font-size: 11px; font-weight: 600; margin-bottom: 4px; color: ${colors.textMuted}; }
    .prev-chat-message__content { line-height: 1.5; white-space: pre-wrap; }
    .prev-chat-tool-call { margin-top: 6px; padding: 6px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); }
    .prev-chat-tool-call__status { font-size: 10px; text-transform: uppercase; font-weight: 600; }
    .prev-chat-tool-call--pending .prev-chat-tool-call__status { color: ${colors.toolPending}; }
    .prev-chat-tool-call--success .prev-chat-tool-call__status { color: ${colors.toolSuccess}; }
    .prev-chat-tool-call--error .prev-chat-tool-call__status { color: ${colors.toolError}; }
    .prev-chat-input {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid ${colors.border};
      flex-shrink: 0;
    }
    .prev-chat-input__field {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid ${colors.inputBorder};
      border-radius: 6px;
      background: ${colors.inputBg};
      color: ${colors.text};
      font-size: 13px;
      outline: none;
      font-family: inherit;
    }
    .prev-chat-input__field:focus { border-color: ${colors.accent}; }
    .prev-chat-input__send {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: ${colors.accent};
      color: white;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
    }
    .prev-chat-input__send:hover { opacity: 0.9; }
  `;
}

export { DefaultMessage, DefaultInput };
