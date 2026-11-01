/*! LeadLock live demo widget — Dominion AI
 *  Adds a "talk to the agent in your browser" demo to the site.
 *  Needs only: this file + vapi-web.bundle.js in the same folder.
 *  Add before </body>:   <script src="leadlock-demo.js" defer></script>
 */
(function () {
  'use strict';
  if (window.__leadlockDemoLoaded) return;
  window.__leadlockDemoLoaded = true;

  /* ───────────────  CONFIG — edit here only  ─────────────── */
  var CONFIG = {
    publicKey:   'afddc8a5-183b-4fae-8a0a-b2850512101a',   // Vapi PUBLIC key (safe to be in the page)
    assistantId: 'bd7b306a-130b-4c66-b6a4-368b58764b82',   // demo agent
    sdkFile:     'vapi-web.bundle.js',                     // self-hosted SDK, same folder as this file
    maxSeconds:  180,                                      // hard cap per demo call (3 min)
    dailyLimit:  5,                                        // demo calls per browser per day (soft limit)
    phoneLabel:  '(740) 730-4160',
    phoneTel:    '+17407304160'
  };

  /* ───────────────  helpers  ─────────────── */
  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    for (var i = s.length - 1; i >= 0; i--) if (/leadlock-demo/.test(s[i].src || '')) return s[i];
    return null;
  })();
  var SDK_URL = new URL(CONFIG.sdkFile, (script && script.src) || location.href).href;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmt(s) { s = Math.max(0, s | 0); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function usesToday() {
    try { var d = JSON.parse(localStorage.getItem('ll_demo') || '{}'); return d.day === today() ? (d.n || 0) : 0; }
    catch (e) { return 0; }
  }
  function bumpUses() {
    try { localStorage.setItem('ll_demo', JSON.stringify({ day: today(), n: usesToday() + 1 })); } catch (e) {}
  }

  /* ───────────────  styles  ─────────────── */
  var CSS = '' +
  '.lld-overlay{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.84);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
  '.lld-overlay.lld-open{display:flex}' +
  '.lld-modal{position:relative;width:100%;max-width:480px;max-height:94vh;overflow:auto;background:var(--card,#161820);border:1px solid rgba(200,120,58,.32);border-radius:16px;box-shadow:0 40px 90px rgba(0,0,0,.65);font-family:"Outfit",system-ui,sans-serif;color:var(--text,#D8D4CC);animation:lldUp .28s cubic-bezier(.16,1,.3,1)}' +
  '@keyframes lldUp{from{opacity:0;transform:translateY(26px) scale(.97)}to{opacity:1;transform:none}}' +
  '.lld-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:22px 24px 0}' +
  '.lld-eyebrow{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--copper,#C8783A)}' +
  '.lld-live{width:8px;height:8px;border-radius:50%;background:#8A8882;transition:background .3s}' +
  '.lld-s-live .lld-live{background:#EF5350;animation:lldBlink 1.4s infinite}' +
  '@keyframes lldBlink{0%,100%{opacity:1}50%{opacity:.35}}' +
  '.lld-title{font-family:"Bebas Neue",sans-serif;font-size:30px;letter-spacing:1.5px;line-height:1.05;color:var(--white,#F2EDE6);margin-top:6px;font-weight:400}' +
  '.lld-x{background:none;border:0;color:#8A8882;font-size:26px;line-height:1;cursor:pointer;padding:0 0 0 8px;transition:color .2s}' +
  '.lld-x:hover{color:#F2EDE6}' +
  '.lld-stage{text-align:center;padding:18px 24px 6px}' +
  '.lld-orb-wrap{position:relative;width:132px;height:132px;margin:10px auto 18px}' +
  '.lld-ring{position:absolute;inset:-16px;border-radius:50%;border:1px solid rgba(200,120,58,.4);transform:scale(var(--lld-lvl,1));transition:transform .09s linear,opacity .3s;opacity:.0}' +
  '.lld-ring.r2{inset:-30px;border-color:rgba(200,120,58,.18);transform:scale(calc(var(--lld-lvl,1) * 1.03))}' +
  '.lld-s-live .lld-ring{opacity:1}' +
  '.lld-orb{position:absolute;inset:0;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 28%,#F0A868,#C8783A 55%,#8C4F1F);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 14px 44px rgba(200,120,58,.3)}' +
  '.lld-s-idle .lld-orb,.lld-s-ended .lld-orb{animation:lldBreath 3.6s ease-in-out infinite}' +
  '.lld-s-connecting .lld-orb{animation:lldBreath 1.1s ease-in-out infinite}' +
  '@keyframes lldBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}' +
  '.lld-orb svg{width:44px;height:44px;stroke:#0D0F14;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
  '.lld-status{font-size:15px;font-weight:500;color:var(--white,#F2EDE6);min-height:22px}' +
  '.lld-timer{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;color:#8A8882;margin-top:4px;letter-spacing:.5px}' +
  '.lld-timer.lld-warn{color:#FFB800}' +
  '.lld-caps{margin:14px 24px 0;height:150px;overflow-y:auto;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:9px}' +
  '.lld-empty{margin:auto;font-size:12.5px;color:#8A8882;text-align:center;line-height:1.6}' +
  '.lld-line{font-size:13.5px;line-height:1.5;font-weight:300}' +
  '.lld-who{display:block;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:2px}' +
  '.lld-ag .lld-who{color:var(--copper,#C8783A)}.lld-ag .lld-txt{color:#F2EDE6}' +
  '.lld-us .lld-who{color:#5BB8D4}.lld-us .lld-txt{color:#B9B5AD}' +
  '.lld-tips{margin:12px 24px 0;font-size:12px;color:#8A8882;line-height:1.7}' +
  '.lld-tips b{color:#D8D4CC;font-weight:500}' +
  '.lld-tips span{display:inline-block;margin:3px 4px 0 0;padding:3px 10px;border:1px solid rgba(255,255,255,.1);border-radius:20px;color:#B9B5AD}' +
  '.lld-err{margin:14px 24px 0;padding:12px 14px;border-radius:9px;background:rgba(239,83,80,.1);border:1px solid rgba(239,83,80,.28);color:#F3B0AE;font-size:13px;line-height:1.6}' +
  '.lld-err a{color:#F2EDE6;font-weight:600}' +
  '.lld-actions{display:flex;gap:10px;padding:18px 24px 6px}' +
  '.lld-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 16px;border-radius:8px;font-family:inherit;font-size:14.5px;font-weight:700;cursor:pointer;border:1px solid transparent;transition:background .2s,transform .15s,border-color .2s}' +
  '.lld-btn:hover{transform:translateY(-1px)}' +
  '.lld-btn[disabled]{opacity:.5;cursor:not-allowed;transform:none}' +
  '.lld-primary{background:var(--copper,#C8783A);color:#0D0F14}.lld-primary:hover{background:var(--copper-lt,#E09050)}' +
  '.lld-ghost{background:transparent;color:#D8D4CC;border-color:rgba(255,255,255,.14);flex:0 0 auto}.lld-ghost:hover{border-color:rgba(200,120,58,.5);color:#E09050}' +
  '.lld-ghost.lld-on{background:rgba(239,83,80,.12);border-color:rgba(239,83,80,.35);color:#F3B0AE}' +
  '.lld-end{background:#C0392B;color:#fff}.lld-end:hover{background:#D84A3A}' +
  '.lld-after{margin:6px 24px 0;padding:16px;border-radius:10px;background:linear-gradient(135deg,rgba(200,120,58,.14),rgba(200,120,58,.04));border:1px solid rgba(200,120,58,.3);text-align:center}' +
  '.lld-after p{font-size:13.5px;color:#D8D4CC;line-height:1.6;margin-bottom:12px;font-weight:300}' +
  '.lld-after .lld-btn{width:100%}' +
  '.lld-fine{padding:12px 24px 20px;font-size:11.5px;color:#6E6C67;line-height:1.65;text-align:center}' +
  '.lld-fine a{color:#8A8882}' +
  '[hidden]{display:none!important}' +
  /* injected triggers */
  '.lld-trigger{display:inline-flex;align-items:center;gap:10px;padding:15px 28px;border-radius:4px;border:0;background:var(--copper,#C8783A);color:#090A0C;font-family:"Outfit",sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:background .2s,transform .15s}' +
  '.lld-trigger:hover{background:var(--copper-lt,#E09050);transform:translateY(-2px)}' +
  '.lld-trigger svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}' +
  '.lld-barlink{color:var(--copper,#C8783A);font-weight:700;border-bottom:1px solid rgba(200,120,58,.45);text-decoration:none;white-space:nowrap;cursor:pointer}' +
  '.lld-float{position:fixed;right:18px;bottom:18px;z-index:2147482000;box-shadow:0 10px 30px rgba(0,0,0,.5);border-radius:100px}' +
  '@media(max-width:520px){.lld-modal{max-height:100vh;border-radius:14px}.lld-title{font-size:26px}.lld-actions{flex-wrap:wrap}.lld-ghost{flex:1}}' +
  '@media(prefers-reduced-motion:reduce){.lld-modal,.lld-orb,.lld-live{animation:none!important}.lld-ring{transition:none}}';

  var MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>';

  /* ───────────────  build modal  ─────────────── */
  var ui = {};
  var state = 'idle';           // idle | connecting | live | ended
  var vapi = null;
  var sdkPromise = null;
  var timer = null, elapsed = 0;
  var openLine = { user: null, assistant: null };

  function build() {
    var style = el('style'); style.textContent = CSS; document.head.appendChild(style);

    var ov = el('div', 'lld-overlay lld-s-idle');
    ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML =
      '<div class="lld-modal" role="dialog" aria-modal="true" aria-labelledby="lld-title">' +
        '<div class="lld-hd"><div>' +
          '<div class="lld-eyebrow"><span class="lld-live"></span><span class="lld-eb">Live demo</span></div>' +
          '<h2 class="lld-title" id="lld-title">Talk to LeadLock</h2></div>' +
          '<button type="button" class="lld-x" aria-label="Close demo">&times;</button></div>' +
        '<div class="lld-stage">' +
          '<div class="lld-orb-wrap"><div class="lld-ring r2"></div><div class="lld-ring"></div><div class="lld-orb">' + MIC_SVG + '</div></div>' +
          '<div class="lld-status" role="status">Ready when you are</div>' +
          '<div class="lld-timer">0:00 / ' + fmt(CONFIG.maxSeconds) + '</div>' +
        '</div>' +
        '<div class="lld-caps" aria-live="polite"><div class="lld-empty">Live captions appear here as you talk.<br>Allow the microphone when your browser asks.</div></div>' +
        '<div class="lld-tips"><b>Try saying:</b> ' +
          '<span>“My AC stopped cooling and it’s 100°F”</span>' +
          '<span>“Hola, necesito un técnico”</span>' +
          '<span>“How much is a service call?”</span></div>' +
        '<div class="lld-err" hidden></div>' +
        '<div class="lld-actions">' +
          '<button type="button" class="lld-btn lld-primary lld-start">Start the call</button>' +
          '<button type="button" class="lld-btn lld-ghost lld-mute" hidden>Mute</button>' +
          '<button type="button" class="lld-btn lld-end lld-stop" hidden>End call</button>' +
        '</div>' +
        '<div class="lld-after" hidden><p>That’s exactly what your callers would get — 24/7, in English and Spanish, every call at once.</p>' +
          '<button type="button" class="lld-btn lld-primary lld-cta">Get it on my line →</button></div>' +
        '<p class="lld-fine">Browser call using your microphone. Limited to ' + Math.round(CONFIG.maxSeconds / 60) + ' minutes. ' +
          'This demo call may be recorded and transcribed to improve the service. ' +
          'Prefer a phone? Call <a href="tel:' + CONFIG.phoneTel + '">' + CONFIG.phoneLabel + '</a>.</p>' +
      '</div>';
    document.body.appendChild(ov);

    ui.ov = ov;
    ui.status = ov.querySelector('.lld-status');
    ui.timer = ov.querySelector('.lld-timer');
    ui.caps = ov.querySelector('.lld-caps');
    ui.tips = ov.querySelector('.lld-tips');
    ui.err = ov.querySelector('.lld-err');
    ui.eb = ov.querySelector('.lld-eb');
    ui.start = ov.querySelector('.lld-start');
    ui.mute = ov.querySelector('.lld-mute');
    ui.stop = ov.querySelector('.lld-stop');
    ui.after = ov.querySelector('.lld-after');
    ui.rings = ov.querySelectorAll('.lld-ring');

    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.querySelector('.lld-x').addEventListener('click', close);
    ui.start.addEventListener('click', startCall);
    ui.stop.addEventListener('click', function () { endCall(); });
    ui.mute.addEventListener('click', toggleMute);
    ov.querySelector('.lld-cta').addEventListener('click', function () {
      close();
      if (typeof window.openLeadForm === 'function') window.openLeadForm();
      else location.hash = '#contact';
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) close(); });
  }

  /* ───────────────  state / UI updates  ─────────────── */
  function setState(s) {
    state = s;
    ui.ov.className = ui.ov.className.replace(/\blld-s-\w+/g, '').trim() + ' lld-s-' + s;
    var live = s === 'live', conn = s === 'connecting';
    ui.start.hidden = live || conn;
    ui.stop.hidden = !(live || conn);
    ui.mute.hidden = !live;
    ui.tips.hidden = live || conn;
    ui.eb.textContent = live ? 'Live — on the call' : conn ? 'Connecting' : s === 'ended' ? 'Call ended' : 'Live demo';
    ui.start.textContent = s === 'ended' ? 'Call again' : 'Start the call';
    if (s === 'idle') ui.status.textContent = 'Ready when you are';
    if (conn) ui.status.textContent = 'Connecting to the agent…';
    if (live) ui.status.textContent = 'Listening — go ahead and speak';
    if (s === 'ended') ui.status.textContent = 'Call ended';
  }
  function showError(html) { ui.err.innerHTML = html; ui.err.hidden = false; }
  function clearError() { ui.err.hidden = true; ui.err.textContent = ''; }
  function phoneLink() { return '<a href="tel:' + CONFIG.phoneTel + '">' + CONFIG.phoneLabel + '</a>'; }

  function resetCaptions() {
    ui.caps.innerHTML = '';
    openLine.user = openLine.assistant = null;
  }
  function addCaption(role, text, partial) {
    if (!text) return;
    var other = role === 'assistant' ? 'user' : 'assistant';
    openLine[other] = null;                       // keep order: finishing a speaker closes the other's bubble
    var line = openLine[role];
    if (!line) {
      var empty = ui.caps.querySelector('.lld-empty'); if (empty) empty.remove();
      line = el('div', 'lld-line ' + (role === 'assistant' ? 'lld-ag' : 'lld-us'));
      line.appendChild(el('span', 'lld-who', role === 'assistant' ? 'LeadLock' : 'You'));
      line.appendChild(el('span', 'lld-txt'));
      ui.caps.appendChild(line);
      openLine[role] = line;
    }
    line.lastChild.textContent = text;            // textContent only — never innerHTML with transcript data
    if (!partial) openLine[role] = null;
    ui.caps.scrollTop = ui.caps.scrollHeight;
  }
  function setLevel(v) {
    var lvl = 1 + Math.min(1, Math.max(0, v || 0)) * 0.38;
    for (var i = 0; i < ui.rings.length; i++) ui.rings[i].style.setProperty('--lld-lvl', lvl.toFixed(3));
  }

  /* ───────────────  SDK loader (self-hosted)  ─────────────── */
  function loadSdk() {
    if (window.Vapi) return Promise.resolve(window.Vapi);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SDK_URL; s.async = true;
      s.onload = function () { window.Vapi ? resolve(window.Vapi) : reject(new Error('sdk-missing')); };
      s.onerror = function () { sdkPromise = null; reject(new Error('sdk-load')); };
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  /* ───────────────  call lifecycle  ─────────────── */
  function describeError(e) {
    var msg = '';
    try {
      msg = (e && (e.errorMsg || e.message || (e.error && (e.error.message || e.error.errorMsg)) || e.msg)) || '';
      if (typeof msg !== 'string') msg = JSON.stringify(msg);
    } catch (x) {}
    var name = (e && e.name) || '';
    if (/NotAllowed|Permission|denied|microphone|getUserMedia/i.test(name + ' ' + msg))
      return 'Microphone access was blocked. Click the lock icon in your address bar, allow the microphone, then press <b>Call again</b> — or call ' + phoneLink() + '.';
    if (/NotFound|no.*(device|microphone)/i.test(name + ' ' + msg))
      return 'No microphone was found on this device. You can call the agent directly at ' + phoneLink() + '.';
    if (name === 'sdk-load' || /sdk-load|sdk-missing/.test(msg))
      return 'The voice engine couldn’t load. Check your connection and try again, or call ' + phoneLink() + '.';
    return 'The demo couldn’t connect right now. Please try again in a moment, or call ' + phoneLink() + '.';
  }

  function startCall() {
    if (state === 'connecting' || state === 'live') return;
    clearError();
    ui.after.hidden = true;

    if (!window.isSecureContext && location.hostname !== 'localhost') {
      showError('Browser calls need a secure (https) connection. Call the agent at ' + phoneLink() + ' instead.');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('This browser can’t access a microphone. Call the agent at ' + phoneLink() + ' instead.');
      return;
    }
    if (usesToday() >= CONFIG.dailyLimit) {
      showError('You’ve reached today’s demo limit on this device. Call the agent at ' + phoneLink() + ' — it’s the same agent.');
      return;
    }

    resetCaptions();
    ui.caps.innerHTML = '<div class="lld-empty">Connecting…</div>';
    elapsed = 0; ui.timer.textContent = '0:00 / ' + fmt(CONFIG.maxSeconds); ui.timer.className = 'lld-timer';
    setState('connecting');

    loadSdk().then(function (Vapi) {
      if (state !== 'connecting') return;          // user closed while loading
      vapi = new Vapi(CONFIG.publicKey);
      wire(vapi);
      var overrides = {
        maxDurationSeconds: CONFIG.maxSeconds,     // server-side cap as well
        clientMessages: ['transcript', 'conversation-update', 'speech-update', 'status-update', 'user-interrupted']
      };
      return Promise.resolve(vapi.start(CONFIG.assistantId, overrides));
    }).catch(function (e) {
      fail(e);
    });
  }

  function wire(v) {
    v.on('call-start', function () {
      bumpUses();
      setState('live');
      resetCaptions();
      ui.caps.innerHTML = '<div class="lld-empty">Say hello — the agent is listening.</div>';
      timer = setInterval(tick, 1000);
    });
    v.on('speech-start', function () { if (state === 'live') ui.status.textContent = 'LeadLock is speaking…'; });
    v.on('speech-end',   function () { if (state === 'live') { ui.status.textContent = 'Listening — go ahead and speak'; setLevel(0); } });
    v.on('volume-level', function (lvl) { if (state === 'live') setLevel(lvl); });
    v.on('message', function (m) {
      if (!m || typeof m.type !== 'string') return;
      if (m.type.indexOf('transcript') === 0 && m.transcript) {
        addCaption(m.role === 'assistant' ? 'assistant' : 'user', m.transcript, m.transcriptType === 'partial');
      }
    });
    v.on('call-end', function () { finish(); });
    v.on('error', function (e) {
      try { console.warn('[LeadLock demo] vapi error', e); } catch (x) {}
      if (state === 'connecting') fail(e);
      else if (state === 'live') { showError(describeError(e)); }
    });
  }

  function tick() {
    elapsed++;
    ui.timer.textContent = fmt(elapsed) + ' / ' + fmt(CONFIG.maxSeconds);
    if (CONFIG.maxSeconds - elapsed <= 15) ui.timer.className = 'lld-timer lld-warn';
    if (elapsed >= CONFIG.maxSeconds) endCall();
  }

  function toggleMute() {
    if (!vapi) return;
    var m = !vapi.isMuted();
    vapi.setMuted(m);
    ui.mute.textContent = m ? 'Unmute' : 'Mute';
    ui.mute.classList.toggle('lld-on', m);
  }

  function cleanup() {
    clearInterval(timer); timer = null;
    setLevel(0);
    ui.mute.textContent = 'Mute'; ui.mute.classList.remove('lld-on');
    if (vapi) { try { vapi.removeAllListeners(); } catch (e) {} vapi = null; }
  }
  function endCall() {
    if (vapi) { try { vapi.stop(); } catch (e) {} }
    finish();
  }
  function finish() {
    var wasLive = state === 'live' || state === 'connecting';
    cleanup();
    if (!wasLive && state === 'idle') return;
    setState('ended');
    if (elapsed >= 8) ui.after.hidden = false;     // only pitch after a real conversation
  }
  function fail(e) {
    try { console.warn('[LeadLock demo] failed', e); } catch (x) {}
    if (vapi) { try { vapi.stop(); } catch (x) {} }
    cleanup();
    setState('idle');
    ui.caps.innerHTML = '<div class="lld-empty">Live captions appear here as you talk.<br>Allow the microphone when your browser asks.</div>';
    showError(describeError(e));
  }

  /* ───────────────  open / close  ─────────────── */
  function isOpen() { return ui.ov && ui.ov.classList.contains('lld-open'); }
  function open() {
    if (!ui.ov) build();
    ui.ov.classList.add('lld-open'); ui.ov.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (state === 'ended') { setState('idle'); ui.after.hidden = true; }
    setTimeout(function () { try { ui.start.focus(); } catch (e) {} }, 60);
  }
  function close() {
    if (!ui.ov) return;
    if (state === 'live' || state === 'connecting') { if (vapi) { try { vapi.stop(); } catch (e) {} } cleanup(); setState('idle'); }
    ui.ov.classList.remove('lld-open'); ui.ov.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    clearError(); ui.after.hidden = true;
    if (location.hash === '#live-demo') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  }

  /* ───────────────  trigger buttons  ─────────────── */
  function triggerButton(label, extraClass) {
    var b = el('button', 'lld-trigger' + (extraClass ? ' ' + extraClass : ''));
    b.type = 'button';
    b.setAttribute('data-vapi-demo', '');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>';
    b.appendChild(document.createTextNode(label));
    return b;
  }
  function injectTriggers() {
    var added = 0;
    var hero = document.querySelector('.hero-ctas');
    if (hero) { hero.insertBefore(triggerButton('Talk to It Right Here'), hero.firstChild); added++; }

    var bar = document.querySelector('.demo-bar');
    if (bar) {
      bar.appendChild(document.createTextNode(' or '));
      var a = el('a', 'lld-barlink', 'talk to it in your browser →');
      a.href = '#live-demo'; a.setAttribute('data-vapi-demo', '');
      bar.appendChild(a); added++;
    }

    var cta = document.querySelector('.cta-btns');
    if (cta) { cta.insertBefore(triggerButton('Talk to It Right Here'), cta.firstChild); added++; }

    if (!added && !document.querySelector('[data-vapi-demo]')) {
      var f = triggerButton('Try the live demo', 'lld-float'); document.body.appendChild(f);
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-vapi-demo]') : null;
    if (t) { e.preventDefault(); e.stopPropagation(); open(); }
  }, true);

  function init() {
    injectTriggers();
    if (location.hash === '#live-demo') open();
    window.addEventListener('hashchange', function () { if (location.hash === '#live-demo') open(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.LeadLockDemo = { open: open, close: close };
})();
