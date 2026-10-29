import type { CompositionEngine, WebSocketHandler, SubscriptionManager, SessionManager, FragmentRegistry } from '@bundt/prev/server';
import type { ServerMessage } from '@bundt/prev';
import { renderFrame } from '@bundt/prev/server';
import { presetsById } from './presets';

interface ComposeHandlerDeps {
  compositionEngine: CompositionEngine;
  sessionManager: SessionManager;
  fragmentRegistry: FragmentRegistry;
  wsHandler: WebSocketHandler;
  subscriptionManager: SubscriptionManager;
  broadcast: (msg: ServerMessage) => void;
}

export async function handleCompose(req: Request, deps: ComposeHandlerDeps): Promise<Response> {
  const { compositionEngine, sessionManager, fragmentRegistry, wsHandler, subscriptionManager, broadcast } = deps;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sessionId = new URL(req.url).searchParams.get('sessionId');
  const session = sessionManager.getOrCreateSession(sessionId ?? undefined);

  try {
    // Route: preset
    if (typeof body['preset'] === 'string') {
      const preset = presetsById.get(body['preset']);
      if (!preset) {
        return Response.json({ error: `Unknown preset: ${body['preset']}` }, { status: 400 });
      }
      const result = await compositionEngine.compose(preset.composition, session.id);
      return finalize(result, session.id, deps);
    }

    // Route: intent (natural language via prev's built-in resolver)
    if (typeof body['intent'] === 'string') {
      const result = await compositionEngine.composeFromRequest(
        { type: 'intent', composition: { description: body['intent'] as string } },
        session.id
      );
      return finalize(result, session.id, deps);
    }

    return Response.json({ error: 'Request must include "preset" or "intent"' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Composition failed';
    return Response.json({ error: message }, { status: 400 });
  }
}

async function finalize(
  result: Awaited<ReturnType<CompositionEngine['compose']>>,
  sessionId: string,
  deps: ComposeHandlerDeps
): Promise<Response> {
  const { sessionManager, fragmentRegistry, wsHandler, subscriptionManager, broadcast } = deps;

  sessionManager.pushFrame(sessionId, result.frame);

  wsHandler.registerFrame(result.frame.id, {
    frame: result.frame,
    resolvedData: result.resolvedData,
    resolvedBindings: result.resolvedBindings,
  });

  subscriptionManager.setupFrameSubscriptions(result.frame, result.resolvedData, broadcast);

  const stream = await renderFrame(result.frame, fragmentRegistry, result.resolvedData);

  return new Response(stream, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-prev-session-id': sessionId,
      'x-prev-frame-id': result.frame.id,
    },
  });
}
