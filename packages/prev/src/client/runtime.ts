import type { ResolvedBinding } from '../types';

export interface FrameConfig {
  frameId: string;
  fragments: Array<{ instanceId: string; fragmentId: string }>;
  bindings: Array<{
    id: string;
    sourceFragmentInstanceId: string;
    sourceInteraction: string;
    targetFragmentInstanceId: string;
    targetType: 'prop' | 'dataParam';
    targetKey: string;
    transform?: string;
  }>;
  wsUrl: string;
}

let ws: WebSocket | null = null;
let frameConfig: FrameConfig | null = null;

export function initRuntime(): void {
  // Runtime initializes from glue bundle — this is a no-op placeholder
  // The glue bundle sets up WebSocket and event delegation directly
}

export function initFrame(config: FrameConfig): void {
  frameConfig = config;

  const wsUrl = config.wsUrl.replace('localhost', window.location.hostname);
  ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data as string) as { type: string; fragmentInstanceId?: string; html?: string };
    if (msg.type === 'fragment-update' && msg.fragmentInstanceId) {
      const el = document.querySelector(`[data-prev-fragment="${msg.fragmentInstanceId}"]`);
      if (el) {
        el.innerHTML = msg.html ?? '';
      }
    }
  };

  setupInteractionDelegation();
}

export function emit(fragmentInstanceId: string, interaction: string, payload: unknown): void {
  if (!ws || ws.readyState !== WebSocket.OPEN || !frameConfig) return;

  ws.send(JSON.stringify({
    type: 'interaction',
    frameId: frameConfig.frameId,
    fragmentInstanceId,
    interaction,
    payload
  }));
}

function setupInteractionDelegation(): void {
  document.addEventListener('click', (e) => {
    let target = e.target as HTMLElement | null;
    while (target && target !== document.documentElement) {
      if (target.dataset?.['prevInteraction']) {
        const fragmentEl = target.closest('[data-prev-fragment]') as HTMLElement | null;
        if (fragmentEl) {
          const instanceId = fragmentEl.dataset['prevFragment'];
          const interaction = target.dataset['prevInteraction'];
          const payloadStr = target.dataset['prevPayload'];
          const payload = payloadStr ? JSON.parse(payloadStr) : {};
          if (instanceId && interaction) {
            emit(instanceId, interaction, payload);
          }
        }
        break;
      }
      target = target.parentElement;
    }
  });
}

export function getFrameConfig(): FrameConfig | null {
  return frameConfig;
}

export function getWebSocket(): WebSocket | null {
  return ws;
}
