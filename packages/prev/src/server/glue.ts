import type { Frame, ResolvedBinding } from '../types';

export function generateGlueScript(
  frame: Frame,
  bindings: ResolvedBinding[]
): string {
  const config = {
    frameId: frame.id,
    fragments: frame.fragments.map((f) => ({
      instanceId: f.instanceId,
      fragmentId: f.fragmentId
    })),
    bindings: bindings.map((b) => ({
      id: b.id,
      sourceFragmentInstanceId: b.sourceFragmentInstanceId,
      sourceInteraction: b.sourceInteraction,
      targetFragmentInstanceId: b.targetFragmentInstanceId,
      targetType: b.targetType,
      targetKey: b.targetKey,
      transform: b.transform
    }))
  };

  return `
    (function() {
      var config = ${JSON.stringify(config)};
      window.__PREV_FRAME_CONFIG__ = config;

      var proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      var wsUrl = proto + '//' + window.location.host + '/prev/ws?sessionId=' + encodeURIComponent('${frame.sessionId}');
      var ws = new WebSocket(wsUrl);
      var reconnectAttempts = 0;
      var maxReconnect = 5;

      function connect() {
        ws = new WebSocket(wsUrl);
        ws.onopen = function() {
          reconnectAttempts = 0;
          console.log('[prev] WebSocket connected');
        };
        ws.onmessage = handleMessage;
        ws.onclose = function() {
          if (reconnectAttempts < maxReconnect) {
            reconnectAttempts++;
            setTimeout(connect, Math.min(1000 * reconnectAttempts, 5000));
          }
        };
      }

      function handleMessage(event) {
        var msg = JSON.parse(event.data);
        if (msg.type === 'fragment-update') {
          var el = document.querySelector('[data-prev-fragment="' + msg.fragmentInstanceId + '"]');
          if (el) el.innerHTML = msg.html;
        } else if (msg.type === 'subscription-update') {
          var el = document.querySelector('[data-prev-fragment="' + msg.fragmentInstanceId + '"]');
          if (el) {
            var event = new CustomEvent('prev:data-update', { detail: { dataKey: msg.dataKey, data: msg.data } });
            el.dispatchEvent(event);
          }
        } else if (msg.type === 'error') {
          console.error('[prev]', msg.message);
        }
      }

      ws.onopen = function() { console.log('[prev] WebSocket connected'); };
      ws.onmessage = handleMessage;
      ws.onclose = function() {
        if (reconnectAttempts < maxReconnect) {
          reconnectAttempts++;
          setTimeout(connect, Math.min(1000 * reconnectAttempts, 5000));
        }
      };

      window.__PREV_WS__ = ws;
      window.__PREV_EMIT__ = function(fragmentInstanceId, interaction, payload) {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({
          type: 'interaction',
          frameId: config.frameId,
          fragmentInstanceId: fragmentInstanceId,
          interaction: interaction,
          payload: payload
        }));
      };

      document.addEventListener('click', function(e) {
        var target = e.target;
        while (target && target !== document) {
          if (target.dataset && target.dataset.prevInteraction) {
            var fragmentEl = target.closest('[data-prev-fragment]');
            if (fragmentEl) {
              var instanceId = fragmentEl.dataset.prevFragment;
              var interaction = target.dataset.prevInteraction;
              var payload = target.dataset.prevPayload ? JSON.parse(target.dataset.prevPayload) : {};
              window.__PREV_EMIT__(instanceId, interaction, payload);
            }
            break;
          }
          target = target.parentElement;
        }
      });
    })();
  `;
}
