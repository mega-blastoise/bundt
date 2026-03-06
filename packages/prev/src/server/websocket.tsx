import { renderToString } from 'react-dom/server';

import type { CompositionEngine } from '../composition/engine';
import type { FragmentRegistry } from '../registry/fragment-registry';
import type { DataSourceRegistry } from '../registry/data-source-registry';
import type { PrevDatabase } from './database';
import type { SessionManager } from './session';
import type { ClientMessage, Frame, ResolvedBinding, ServerMessage } from '../types';
import { FragmentRenderer } from './ssr';

export interface WebSocketData {
  sessionId: string;
}

interface FrameState {
  frame: Frame;
  resolvedData: Map<string, Record<string, unknown>>;
  resolvedBindings: ResolvedBinding[];
}

export interface WebSocketHandler {
  frameStates: Map<string, FrameState>;
  registerFrame(frameId: string, state: FrameState): void;
  handleMessage(ws: { send(data: string): void }, message: string): Promise<void>;
}

export function createWebSocketHandler(
  _compositionEngine: CompositionEngine,
  _sessionManager: SessionManager,
  database: PrevDatabase,
  fragmentRegistry: FragmentRegistry,
  dataSourceRegistry: DataSourceRegistry
): WebSocketHandler {
  const frameStates = new Map<string, FrameState>();

  function registerFrame(frameId: string, state: FrameState): void {
    frameStates.set(frameId, state);
  }

  function send(ws: { send(data: string): void }, msg: ServerMessage): void {
    ws.send(JSON.stringify(msg));
  }

  async function handleInteraction(
    ws: { send(data: string): void },
    msg: Extract<ClientMessage, { type: 'interaction' }>
  ): Promise<void> {
    const state = frameStates.get(msg.frameId);
    if (!state) {
      send(ws, { type: 'error', message: `Frame "${msg.frameId}" not found` });
      return;
    }

    const affectedBindings = state.resolvedBindings.filter(
      (b) =>
        b.sourceFragmentInstanceId === msg.fragmentInstanceId &&
        b.sourceInteraction === msg.interaction
    );

    for (const binding of affectedBindings) {
      const targetInstance = state.frame.fragments.find(
        (f) => f.instanceId === binding.targetFragmentInstanceId
      );
      if (!targetInstance) continue;

      const targetDef = fragmentRegistry.get(targetInstance.fragmentId);

      if (binding.targetType === 'dataParam') {
        const dataBinding = targetInstance.dataBindings[binding.targetKey];
        if (dataBinding) {
          const newParams = { ...dataBinding.params, ...extractPayload(msg.payload, binding.transform) };
          const ds = dataSourceRegistry.get(dataBinding.source);
          const newData = await ds.fetch(newParams);

          const existingData = state.resolvedData.get(targetInstance.instanceId) ?? {};
          existingData[binding.targetKey] = newData;
          state.resolvedData.set(targetInstance.instanceId, existingData);

          database.fragmentState.set(
            msg.frameId,
            targetInstance.instanceId,
            existingData
          );
        }
      } else if (binding.targetType === 'prop') {
        targetInstance.props[binding.targetKey] = extractPayloadValue(msg.payload, binding.transform);
      }

      const data = state.resolvedData.get(targetInstance.instanceId) ?? {};
      const html = renderToString(
        <FragmentRenderer instance={targetInstance} data={data} render={targetDef.render} />
      );

      send(ws, {
        type: 'fragment-update',
        fragmentInstanceId: targetInstance.instanceId,
        html,
        data
      });
    }
  }

  async function handleMessage(ws: { send(data: string): void }, message: string): Promise<void> {
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message) as ClientMessage;
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    if (parsed.type === 'ping') {
      send(ws, { type: 'pong' });
      return;
    }

    if (parsed.type === 'interaction') {
      await handleInteraction(ws, parsed);
    }
  }

  return { frameStates, registerFrame, handleMessage };
}

function extractPayload(payload: unknown, transform?: string): Record<string, unknown> {
  if (transform) {
    return { [transform]: extractPayloadValue(payload, transform) };
  }
  if (typeof payload === 'object' && payload !== null) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function extractPayloadValue(payload: unknown, transform?: string): unknown {
  if (!transform || typeof payload !== 'object' || payload === null) return payload;
  const parts = transform.split('.');
  let current: unknown = payload;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
