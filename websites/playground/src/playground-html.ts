export function generatePlaygroundHtml(fragmentCount: number, dataSourceCount: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>prev playground</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-0: #09090b; --bg-1: #0f0f14; --bg-2: #161621; --bg-3: #1e1e2a;
      --border: #1e1e2a; --border-hover: #2a2a3a;
      --text-0: #f0f0f5; --text-1: #b0b0c0; --text-2: #6b6b80;
      --violet: #8b5cf6; --violet-hover: #7c3aed; --violet-dim: #8b5cf620;
      --green: #10b981; --red: #ef4444;
      --sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      --mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--sans); background: var(--bg-0); color: var(--text-0); min-height: 100vh; }

    .pg-header { height: 48px; display: flex; align-items: center; padding: 0 24px; border-bottom: 1px solid var(--border); gap: 12px; }
    .pg-header__logo { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; }
    .pg-header__logo span { color: var(--violet); }
    .pg-header__tag { font-size: 10px; font-weight: 600; color: var(--violet); background: var(--violet-dim); padding: 2px 8px; border-radius: 9999px; font-family: var(--mono); }
    .pg-header__stats { margin-left: auto; font-size: 11px; font-family: var(--mono); color: var(--text-2); display: flex; gap: 16px; }
    .pg-header__link { font-size: 12px; color: var(--text-2); text-decoration: none; }
    .pg-header__link:hover { color: var(--text-1); }

    .pg-container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }

    /* Mode tabs */
    .pg-modes { display: flex; gap: 4px; margin-bottom: 20px; }
    .pg-mode { padding: 8px 16px; font-size: 13px; font-weight: 500; font-family: var(--sans); background: none; border: 1px solid transparent; border-radius: 8px; color: var(--text-2); cursor: pointer; transition: all 0.15s; }
    .pg-mode:hover { color: var(--text-1); background: var(--bg-1); }
    .pg-mode--active { color: var(--text-0); background: var(--bg-2); border-color: var(--border); }

    /* Prompt */
    .pg-prompt { position: relative; margin-bottom: 24px; }
    .pg-prompt__input { width: 100%; padding: 14px 120px 14px 16px; font-size: 14px; font-family: var(--sans); background: var(--bg-1); border: 1px solid var(--border); border-radius: 10px; color: var(--text-0); outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
    .pg-prompt__input:focus { border-color: var(--violet); box-shadow: 0 0 0 3px var(--violet-dim); }
    .pg-prompt__input::placeholder { color: var(--text-2); }
    .pg-prompt__btn { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); padding: 8px 16px; font-size: 13px; font-weight: 600; font-family: var(--sans); background: var(--violet); color: #fff; border: none; border-radius: 7px; cursor: pointer; transition: background 0.15s; }
    .pg-prompt__btn:hover { background: var(--violet-hover); }
    .pg-prompt__btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Chat panel */
    .pg-chat { display: none; margin-bottom: 24px; }
    .pg-chat--visible { display: block; }
    .pg-chat__key { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
    .pg-chat__key-input { flex: 1; max-width: 400px; padding: 10px 14px; font-size: 13px; font-family: var(--mono); background: var(--bg-1); border: 1px solid var(--border); border-radius: 8px; color: var(--text-0); outline: none; }
    .pg-chat__key-input:focus { border-color: var(--violet); }
    .pg-chat__key-label { font-size: 11px; color: var(--text-2); font-family: var(--mono); }
    .pg-chat__key-status { font-size: 11px; font-family: var(--mono); padding: 2px 8px; border-radius: 4px; }
    .pg-chat__messages { max-height: 320px; overflow-y: auto; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 12px; background: var(--bg-1); }
    .pg-chat__msg { padding: 12px 16px; border-bottom: 1px solid var(--border); font-size: 13px; line-height: 1.6; }
    .pg-chat__msg:last-child { border-bottom: none; }
    .pg-chat__msg--user { color: var(--text-0); }
    .pg-chat__msg--user::before { content: 'you '; font-weight: 600; color: var(--violet); font-family: var(--mono); font-size: 11px; margin-right: 8px; }
    .pg-chat__msg--assistant { color: var(--text-1); background: var(--bg-2); }
    .pg-chat__msg--assistant::before { content: 'claude '; font-weight: 600; color: var(--green); font-family: var(--mono); font-size: 11px; margin-right: 8px; }
    .pg-chat__msg--tool { font-family: var(--mono); font-size: 11px; color: var(--text-2); background: var(--bg-0); padding: 8px 16px; }
    .pg-chat__msg--error { color: var(--red); }
    .pg-chat__input-row { display: flex; gap: 8px; }
    .pg-chat__input { flex: 1; padding: 12px 14px; font-size: 13px; font-family: var(--sans); background: var(--bg-1); border: 1px solid var(--border); border-radius: 8px; color: var(--text-0); outline: none; }
    .pg-chat__input:focus { border-color: var(--violet); }
    .pg-chat__send { padding: 10px 20px; font-size: 13px; font-weight: 600; font-family: var(--sans); background: var(--violet); color: #fff; border: none; border-radius: 8px; cursor: pointer; }
    .pg-chat__send:hover { background: var(--violet-hover); }
    .pg-chat__send:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Presets */
    .pg-presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin-bottom: 24px; }
    .pg-preset { background: var(--bg-1); border: 1px solid var(--border); border-radius: 10px; padding: 14px; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
    .pg-preset:hover { border-color: var(--border-hover); background: var(--bg-2); }
    .pg-preset--active { border-color: var(--violet); }
    .pg-preset__name { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .pg-preset__desc { font-size: 11px; color: var(--text-2); line-height: 1.5; margin-bottom: 8px; }
    .pg-preset__meta { font-size: 10px; font-family: var(--mono); color: var(--text-2); }

    /* Workspace */
    .pg-workspace { display: none; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 24px; }
    .pg-workspace--visible { display: block; }
    .pg-workspace__header { height: 36px; display: flex; align-items: center; padding: 0 14px; background: var(--bg-2); border-bottom: 1px solid var(--border); font-size: 11px; color: var(--text-2); gap: 8px; font-family: var(--mono); }
    .pg-workspace__frame { width: 100%; height: 600px; border: none; background: #0a0a0f; }

    /* Loading */
    .pg-loading { display: none; align-items: center; justify-content: center; height: 200px; gap: 12px; color: var(--text-2); font-size: 13px; }
    .pg-loading--visible { display: flex; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .pg-loading__spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--violet); border-radius: 50%; animation: spin 0.6s linear infinite; }

    /* Catalog */
    .pg-catalog { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .pg-catalog__toggle { display: flex; align-items: center; width: 100%; padding: 12px 16px; background: var(--bg-1); border: none; color: var(--text-1); font-size: 13px; font-weight: 500; font-family: var(--sans); cursor: pointer; gap: 8px; }
    .pg-catalog__toggle:hover { background: var(--bg-2); }
    .pg-catalog__arrow { transition: transform 0.2s; font-size: 10px; }
    .pg-catalog__arrow--open { transform: rotate(90deg); }
    .pg-catalog__body { display: none; padding: 12px 16px; }
    .pg-catalog__body--open { display: block; }
    .pg-catalog__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
    .pg-catalog__item { padding: 10px; background: var(--bg-2); border-radius: 6px; border: 1px solid transparent; }
    .pg-catalog__item-name { font-size: 12px; font-weight: 600; font-family: var(--mono); color: var(--text-0); margin-bottom: 2px; }
    .pg-catalog__item-desc { font-size: 11px; color: var(--text-2); line-height: 1.4; }
    .pg-catalog__item-tags { margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
    .pg-catalog__tag { font-size: 10px; padding: 1px 6px; border-radius: 3px; background: var(--violet-dim); color: var(--violet); font-family: var(--mono); }

    /* Error */
    .pg-error { display: none; padding: 12px 16px; background: #1a0a0a; border: 1px solid #3f1d1d; border-radius: 8px; color: #fca5a5; font-size: 13px; margin-bottom: 16px; }
    .pg-error--visible { display: block; }

    /* Footer */
    .pg-footer { margin-top: 32px; padding: 16px 0; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-2); font-family: var(--mono); }
    .pg-footer a { color: var(--violet); text-decoration: none; }
    .pg-footer a:hover { text-decoration: underline; }

    @media (max-width: 640px) {
      .pg-presets { grid-template-columns: 1fr; }
      .pg-container { padding: 16px; }
    }
  </style>
</head>
<body>
  <header class="pg-header">
    <div class="pg-header__logo"><span>prev</span> playground</div>
    <span class="pg-header__tag">v1.0</span>
    <div class="pg-header__stats">
      <span>${fragmentCount} fragments</span>
      <span>${dataSourceCount} sources</span>
    </div>
    <a href="https://bundt-dev.io" class="pg-header__link" target="_blank">bundt-dev.io</a>
  </header>

  <main class="pg-container">
    <div class="pg-modes">
      <button class="pg-mode pg-mode--active" data-mode="instant" type="button">Instant</button>
      <button class="pg-mode" data-mode="chat" type="button">Chat with Claude</button>
    </div>

    <!-- Instant mode -->
    <div id="instantPanel">
      <form class="pg-prompt" id="promptForm">
        <input type="text" class="pg-prompt__input" id="promptInput" placeholder="Describe the UI you want..." autocomplete="off" />
        <button type="submit" class="pg-prompt__btn" id="promptBtn">Compose</button>
      </form>
      <div class="pg-presets" id="presets"></div>
    </div>

    <!-- Chat mode -->
    <div class="pg-chat" id="chatPanel">
      <div class="pg-chat__key">
        <span class="pg-chat__key-label">Anthropic API Key</span>
        <input type="password" class="pg-chat__key-input" id="apiKeyInput" placeholder="sk-ant-..." autocomplete="off" />
        <span class="pg-chat__key-status" id="keyStatus"></span>
      </div>
      <div class="pg-chat__messages" id="chatMessages"></div>
      <div class="pg-chat__input-row">
        <input type="text" class="pg-chat__input" id="chatInput" placeholder="Tell Claude what to build..." autocomplete="off" />
        <button class="pg-chat__send" id="chatSend" type="button">Send</button>
      </div>
    </div>

    <div class="pg-error" id="error"></div>
    <div class="pg-loading" id="loading"><div class="pg-loading__spinner"></div><span>Composing workspace...</span></div>

    <div class="pg-workspace" id="workspace">
      <div class="pg-workspace__header"><span id="frameInfo"></span></div>
      <iframe class="pg-workspace__frame" id="viewport"></iframe>
    </div>

    <div class="pg-catalog" id="catalog">
      <button class="pg-catalog__toggle" id="catalogToggle" type="button">
        <span class="pg-catalog__arrow" id="catalogArrow">&#9654;</span>
        Fragment Catalog (${fragmentCount} fragments, ${dataSourceCount} data sources)
      </button>
      <div class="pg-catalog__body" id="catalogBody"></div>
    </div>

    <footer class="pg-footer">
      <span>${fragmentCount} fragments &middot; ${dataSourceCount} data sources</span>
      <a href="https://github.com/mega-blastoise/bundt" target="_blank">github</a>
    </footer>
  </main>

  <script>
  (function() {
    var state = { sessionId: null, composing: false, mode: 'instant', chatSessionId: null };

    // Fetch presets and catalog
    fetch('/api/registry').then(function(r) { return r.json(); }).then(function(data) { renderCatalog(data.fragments, data.dataSources); });
    fetch('/api/presets').then(function(r) { return r.json(); }).then(function(presets) { renderPresets(presets); });

    // Mode switching
    document.querySelectorAll('.pg-mode').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.mode = btn.dataset.mode;
        document.querySelectorAll('.pg-mode').forEach(function(b) { b.classList.remove('pg-mode--active'); });
        btn.classList.add('pg-mode--active');
        document.getElementById('instantPanel').style.display = state.mode === 'instant' ? 'block' : 'none';
        document.getElementById('chatPanel').classList.toggle('pg-chat--visible', state.mode === 'chat');
      });
    });

    // Chat
    var chatMessages = document.getElementById('chatMessages');
    var chatInput = document.getElementById('chatInput');
    var chatSend = document.getElementById('chatSend');
    var apiKeyInput = document.getElementById('apiKeyInput');
    var keyStatus = document.getElementById('keyStatus');

    apiKeyInput.addEventListener('input', function() {
      var hasKey = apiKeyInput.value.startsWith('sk-');
      keyStatus.textContent = hasKey ? 'ready' : '';
      keyStatus.style.color = hasKey ? 'var(--green)' : '';
    });

    function addChatMsg(role, text) {
      var div = document.createElement('div');
      div.className = 'pg-chat__msg pg-chat__msg--' + role;
      div.textContent = text;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendChat() {
      var msg = chatInput.value.trim();
      var key = apiKeyInput.value.trim();
      if (!msg || !key || state.composing) return;

      addChatMsg('user', msg);
      chatInput.value = '';
      state.composing = true;
      chatSend.disabled = true;
      showLoading(true);

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey: key, message: msg, sessionId: state.chatSessionId })
      }).then(function(res) {
        if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'Chat failed'); });
        return res.json();
      }).then(function(data) {
        state.chatSessionId = data.sessionId;
        if (data.toolCalls && data.toolCalls.length > 0) {
          data.toolCalls.forEach(function(tc) {
            addChatMsg('tool', tc.name + '(' + JSON.stringify(tc.args).slice(0, 100) + ')');
          });
        }
        if (data.response) addChatMsg('assistant', data.response);
        if (data.frameId) {
          document.getElementById('frameInfo').textContent = 'frame: ' + data.frameId.slice(0, 8);
          document.getElementById('viewport').src = '/frame/' + data.frameId;
          document.getElementById('workspace').classList.add('pg-workspace--visible');
        }
        showLoading(false);
      }).catch(function(err) {
        addChatMsg('error', err.message);
        showLoading(false);
      }).finally(function() {
        state.composing = false;
        chatSend.disabled = false;
      });
    }

    chatSend.addEventListener('click', sendChat);
    chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });

    function renderPresets(presets) {
      var el = document.getElementById('presets');
      el.innerHTML = presets.map(function(p) {
        return '<div class="pg-preset" data-preset="' + p.id + '">' +
          '<div class="pg-preset__name">' + p.name + '</div>' +
          '<div class="pg-preset__desc">' + p.description + '</div>' +
          '<div class="pg-preset__meta">' + p.fragmentCount + ' fragments</div></div>';
      }).join('');
      el.addEventListener('click', function(e) {
        var card = e.target.closest('.pg-preset');
        if (!card || state.composing) return;
        compose({ preset: card.dataset.preset });
        el.querySelectorAll('.pg-preset').forEach(function(c) { c.classList.remove('pg-preset--active'); });
        card.classList.add('pg-preset--active');
      });
    }

    function renderCatalog(fragments, dataSources) {
      var body = document.getElementById('catalogBody');
      var html = '<div class="pg-catalog__grid">';
      fragments.forEach(function(f) {
        html += '<div class="pg-catalog__item"><div class="pg-catalog__item-name">' + f.id + '</div>' +
          '<div class="pg-catalog__item-desc">' + (f.description || '') + '</div>' +
          '<div class="pg-catalog__item-tags">' +
          (f.tags || []).map(function(t) { return '<span class="pg-catalog__tag">' + t + '</span>'; }).join('') +
          '</div></div>';
      });
      dataSources.forEach(function(ds) {
        html += '<div class="pg-catalog__item"><div class="pg-catalog__item-name">' + ds.id + ' <span style="color:var(--text-2)">(source)</span></div>' +
          '<div class="pg-catalog__item-desc">' + (ds.description || '') + '</div>' +
          '<div class="pg-catalog__item-tags">' +
          (ds.tags || []).map(function(t) { return '<span class="pg-catalog__tag">' + t + '</span>'; }).join('') +
          (ds.supportsSubscription ? '<span class="pg-catalog__tag" style="background:#10b98120;color:#10b981">live</span>' : '') +
          '</div></div>';
      });
      html += '</div>';
      body.innerHTML = html;
    }

    document.getElementById('catalogToggle').addEventListener('click', function() {
      var body = document.getElementById('catalogBody');
      var arrow = document.getElementById('catalogArrow');
      var open = body.classList.toggle('pg-catalog__body--open');
      arrow.classList.toggle('pg-catalog__arrow--open', open);
    });

    document.getElementById('promptForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var input = document.getElementById('promptInput');
      var text = input.value.trim();
      if (!text || state.composing) return;
      compose({ intent: text });
    });

    function compose(body) {
      state.composing = true;
      showLoading(true);
      showError(null);
      document.getElementById('promptBtn').disabled = true;
      var url = '/api/compose';
      if (state.sessionId) url += '?sessionId=' + encodeURIComponent(state.sessionId);
      fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(function(res) {
          state.sessionId = res.headers.get('x-prev-session-id') || state.sessionId;
          var frameId = res.headers.get('x-prev-frame-id');
          if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'Composition failed'); });
          document.getElementById('frameInfo').textContent = 'frame: ' + (frameId || '?').slice(0, 8);
          document.getElementById('viewport').src = '/frame/' + frameId;
          document.getElementById('workspace').classList.add('pg-workspace--visible');
          showLoading(false);
        })
        .catch(function(err) { showError(err.message); showLoading(false); })
        .finally(function() { state.composing = false; document.getElementById('promptBtn').disabled = false; });
    }

    function showLoading(v) { document.getElementById('loading').classList.toggle('pg-loading--visible', v); }
    function showError(msg) {
      var el = document.getElementById('error');
      if (msg) { el.textContent = msg; el.classList.add('pg-error--visible'); }
      else { el.classList.remove('pg-error--visible'); }
    }
  })();
  </script>
</body>
</html>`;
}
