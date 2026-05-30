export function videoPlayerHtml(payload: {
  fileName: string;
  fileUrl?: string;
  posterUrl?: string;
  title: string;
}) {
  const data = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { color-scheme: light; --toolbar: #f3f3f3; --line: #d6d6d6; --control: rgba(84, 64, 52, .78); }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif; background: #ececec; color: #20242a; }
    body { display: grid; grid-template-rows: 40px minmax(0, 1fr); }
    .toolbar { display: grid; grid-template-columns: 168px minmax(0, 1fr) 168px; align-items: center; height: 40px; padding: 0 8px; border-bottom: 1px solid var(--line); background: var(--toolbar); user-select: none; }
    .nav, .actions { display: flex; align-items: center; gap: 2px; min-width: 0; }
    .actions { justify-content: flex-end; }
    .title { justify-self: center; max-width: 100%; overflow: hidden; color: #5f6368; font-size: 13px; line-height: 40px; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
    .separator { width: 1px; height: 22px; margin: 0 8px; background: #d0d0d0; }
    button { display: grid; width: 30px; height: 30px; place-items: center; border: 0; border-radius: 4px; background: transparent; color: #394150; cursor: pointer; font: inherit; }
    button:hover { background: rgba(0,0,0,.07); }
    button:disabled { opacity: .42; cursor: default; }
    button svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 1.9; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .stage { position: relative; display: grid; min-height: 0; place-items: center; padding: 0 47px; background: #ececec; }
    .video-wrap { position: relative; display: grid; width: 100%; height: 100%; place-items: center; overflow: hidden; background: #ececec; }
    .poster { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 1; transition: opacity .16s ease; pointer-events: none; }
    video { display: block; position: relative; z-index: 1; max-width: 100%; max-height: 100%; background: transparent; outline: none; object-fit: contain; opacity: 0; transition: opacity .16s ease; }
    .video-wrap.no-poster.ready video,
    .video-wrap.has-poster.started.ready video { opacity: 1; }
    .video-wrap.has-poster.started .poster { opacity: 0; }
    .controls { position: absolute; left: 50%; bottom: 18px; z-index: 2; display: grid; grid-template-columns: 26px auto minmax(130px, 1fr) auto auto 24px; align-items: center; gap: 10px; width: min(460px, calc(100% - 68px)); padding: 9px 12px; border-radius: 9px; background: var(--control); color: #fff; font-size: 14px; line-height: 1; opacity: 1; transform: translateX(-50%); transition: opacity .16s ease, transform .16s ease; backdrop-filter: blur(12px); box-shadow: 0 8px 24px rgba(0,0,0,.16); }
    .video-wrap:not(.ready) .controls { opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(6px); }
    .video-wrap.started.playing:not(.controls-visible) .controls { opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(6px); }
    .controls button { width: 24px; height: 24px; color: #fff; border-radius: 4px; }
    .controls button:hover { background: rgba(255,255,255,.15); }
    .rate { width: auto !important; min-width: 36px; padding: 0 5px; font-size: 13px; white-space: nowrap; }
    .time { color: #fff; font-variant-numeric: tabular-nums; white-space: nowrap; }
    input[type="range"] { width: 100%; height: 16px; margin: 0; accent-color: #fff; cursor: pointer; }
    .state { position: absolute; inset: 0; display: none; place-items: center; align-content: center; gap: 10px; background: rgba(236,236,236,.18); color: #4b5563; font-size: 13px; z-index: 3; }
    .state.show { display: grid; }
    .state button { width: auto; height: 34px; padding: 0 14px; border: 1px solid rgba(0,0,0,.12); background: rgba(255,255,255,.94); color: #1f2937; box-shadow: 0 8px 24px rgba(15,23,42,.1); }
    .state p { margin: 0; padding: 0 14px; color: rgba(31,41,55,.68); font-size: 12px; text-align: center; }
    .state-title { color: #1f2937 !important; font-size: 13px !important; font-weight: 650; }
    .state-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
    .state.loading .state-actions { display: none; }
    .state.gesture #openSystem { display: none; }
    .state.unsupported #openSystem { display: none; }
  </style>
</head>
<body>
  <header class="toolbar">
    <div class="nav">
      <button disabled title="&#32622;&#39030;">${icon('pin')}</button>
      <span class="separator"></span>
      <button disabled title="&#19978;&#19968;&#26465;">${icon('left')}</button>
      <button disabled title="&#19979;&#19968;&#26465;">${icon('right')}</button>
      <button disabled title="&#21015;&#34920;">${icon('grid')}</button>
    </div>
    <div class="title">${escapeHtml(payload.title)}</div>
    <div class="actions">
      <button id="download" title="&#19979;&#36733;">${icon('download')}</button>
      <button disabled title="&#26356;&#22810;">${icon('more')}</button>
    </div>
  </header>
  <main class="stage">
    <div id="wrap" class="video-wrap ${payload.posterUrl ? 'has-poster' : 'no-poster'}">
      ${payload.posterUrl ? `<img id="poster" class="poster" src="${escapeHtml(payload.posterUrl)}" alt="" />` : ''}
      <video id="video" ${payload.fileUrl ? `src="${escapeHtml(payload.fileUrl)}"` : ''} ${payload.posterUrl ? `poster="${escapeHtml(payload.posterUrl)}"` : ''} playsinline preload="auto"></video>
      <div id="state" class="state">
        <p id="stateTitle" class="state-title">&#35270;&#39057;&#25171;&#24320;&#20013;</p>
        <div class="state-actions">
          <button id="retry">&#37325;&#35797;</button>
          <button id="openSystem">&#29992;&#31995;&#32479;&#25773;&#25918;&#22120;&#25171;&#24320;</button>
        </div>
        <p id="stateDetail"></p>
      </div>
      <div class="controls">
        <button id="play" aria-label="&#25773;&#25918;">${icon('play')}</button>
        <span id="current" class="time">00:00</span>
        <input id="seek" type="range" min="0" max="1" step="0.1" value="0" aria-label="&#36827;&#24230;" />
        <span id="duration" class="time">00:00</span>
        <button id="rate" class="rate">倍速</button>
        <button id="mute" aria-label="&#38899;&#37327;">${icon('volume')}</button>
      </div>
    </div>
  </main>
  <script>
    const payload = ${data};
    const icons = {
      play: ${JSON.stringify(icon('play'))},
      pause: ${JSON.stringify(icon('pause'))},
      volume: ${JSON.stringify(icon('volume'))},
      muted: ${JSON.stringify(icon('muted'))},
    };
    const wrap = document.getElementById('wrap');
    const video = document.getElementById('video');
    const state = document.getElementById('state');
    const stateTitle = document.getElementById('stateTitle');
    const stateDetail = document.getElementById('stateDetail');
    const retry = document.getElementById('retry');
    const openSystem = document.getElementById('openSystem');
    const play = document.getElementById('play');
    const seek = document.getElementById('seek');
    const current = document.getElementById('current');
    const duration = document.getElementById('duration');
    const rate = document.getElementById('rate');
    const mute = document.getElementById('mute');
    const rates = [1, 1.25, 1.5, 2, 0.5];
    const playerState = { value: 'loading' };
    const loadingChromeDelayMs = 320;
    let rateIndex = 0;
    let retryAttempts = 0;
    let shouldAutoplay = true;
    let controlsTimer = 0;
    let loadingChromeTimer = 0;
    const fmt = (value) => {
      const s = Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
      return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    };
    function sync() {
      play.innerHTML = video.paused ? icons.play : icons.pause;
      current.textContent = fmt(video.currentTime);
      duration.textContent = fmt(video.duration);
      seek.max = Math.max(1, video.duration || 1);
      seek.value = Math.min(video.currentTime, Number(seek.max));
      mute.innerHTML = video.muted ? icons.muted : icons.volume;
      rate.textContent = video.playbackRate === 1 ? '\u500d\u901f' : video.playbackRate + 'x';
      wrap.classList.toggle('playing', !video.paused && playerState.value === 'ready');
    }
    function clearLoadingChrome() {
      window.clearTimeout(loadingChromeTimer);
      wrap.classList.remove('loading-visible');
      if (playerState.value === 'loading') state.classList.remove('show');
    }
    function showLoadingChrome() {
      window.clearTimeout(loadingChromeTimer);
      loadingChromeTimer = window.setTimeout(() => {
        if (playerState.value !== 'loading') return;
        wrap.classList.toggle('loading-visible', true);
        state.classList.add('show');
      }, loadingChromeDelayMs);
    }
    function setPlayerState(nextState, detail) {
      playerState.value = nextState;
      state.className = 'state ' + nextState;
      wrap.classList.toggle('ready', nextState === 'ready');
      if (nextState === 'loading') showLoadingChrome();
      else clearLoadingChrome();
      const isFailure = nextState === 'failed' || nextState === 'unsupported';
      const showState = isFailure || nextState === 'gesture';
      state.classList.toggle('show', showState);
      retry.disabled = nextState === 'loading';
      openSystem.disabled = nextState === 'loading';
      stateTitle.textContent = nextState === 'unsupported'
        ? '\u89c6\u9891\u683c\u5f0f\u6682\u4e0d\u652f\u6301'
        : nextState === 'gesture'
          ? ''
        : nextState === 'loading'
          ? '\u89c6\u9891\u6253\u5f00\u4e2d'
          : '\u89c6\u9891\u52a0\u8f7d\u5931\u8d25';
      retry.textContent = nextState === 'gesture'
        ? '\u64ad\u653e'
        : nextState === 'unsupported'
        ? '\u7528\u7cfb\u7edf\u64ad\u653e\u5668\u6253\u5f00'
        : nextState === 'loading'
          ? '\u6253\u5f00\u4e2d'
          : '\u91cd\u8bd5';
      stateDetail.textContent = detail || '';
    }
    function videoMimeType() {
      const name = String(payload.fileName || '').toLowerCase();
      if (name.endsWith('.webm')) return 'video/webm';
      if (name.endsWith('.ogg') || name.endsWith('.ogv')) return 'video/ogg';
      if (name.endsWith('.mp4') || name.endsWith('.m4v') || name.endsWith('.mov')) return 'video/mp4';
      return '';
    }
    function canPlayCurrentType() {
      const type = videoMimeType();
      if (!type || typeof video.canPlayType !== 'function') return 'maybe';
      return video.canPlayType(type) || '';
    }
    function canOpenCurrentInSystem() {
      return currentVideoUrl().length > 0;
    }
    function videoFailureState() {
      const errorCode = video.error?.code;
      if (errorCode === 4 || canPlayCurrentType() === '') return 'unsupported';
      if (canOpenCurrentInSystem()) return 'unsupported';
      return 'failed';
    }
    function videoFailureDetail() {
      const errorCode = video.error?.code;
      const type = videoMimeType();
      if (errorCode === 4) return type ? '\u5f53\u524d\u5185\u7f6e\u64ad\u653e\u5668\u4e0d\u652f\u6301 ' + type : '\u5f53\u524d\u5185\u7f6e\u64ad\u653e\u5668\u4e0d\u652f\u6301\u8be5\u89c6\u9891\u683c\u5f0f';
      if (canOpenCurrentInSystem()) return '\u5185\u7f6e\u64ad\u653e\u5668\u65e0\u6cd5\u64ad\u653e\uff0c\u5efa\u8bae\u4f7f\u7528\u7cfb\u7edf\u64ad\u653e\u5668';
      return errorCode ? 'code ' + errorCode : '';
    }
    function toggle() {
      shouldAutoplay = false;
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    }
    function requestAutoplay() {
      if (!shouldAutoplay || !video.paused) return;
      video.play().catch(() => { setPlayerState('gesture'); sync(); });
    }
    function showPlayerControls() {
      wrap.classList.add('controls-visible');
      window.clearTimeout(controlsTimer);
      if (video.paused) return;
      controlsTimer = window.setTimeout(() => wrap.classList.remove('controls-visible'), 1800);
    }
    play.onclick = toggle;
    video.onclick = toggle;
    wrap.onmousemove = showPlayerControls;
    seek.oninput = () => { video.currentTime = Number(seek.value); sync(); };
    rate.onclick = () => {
      rateIndex = (rateIndex + 1) % rates.length;
      video.playbackRate = rates[rateIndex];
      sync();
    };
    mute.onclick = () => { video.muted = !video.muted; sync(); };
    function currentVideoUrl() {
      return video.currentSrc || video.src || payload.fileUrl || '';
    }
    function openCurrentInSystem() {
      const url = currentVideoUrl();
      if (url) window.desktopApi?.openMediaFile({ url, fileName: payload.fileName, kind: 'video' });
    }
    function setVideoSource(fileUrl) {
      payload.fileUrl = fileUrl;
      video.src = fileUrl;
      shouldAutoplay = true;
      const playSupport = canPlayCurrentType();
      if (playSupport === '') {
        setPlayerState('unsupported', videoFailureDetail());
        return;
      }
      setPlayerState('loading');
      video.load();
    }
    function setVideoFailure(detail) {
      setPlayerState('failed', detail || '\u89c6\u9891\u51c6\u5907\u5931\u8d25');
    }
    window.__lppSetVideoSource = setVideoSource;
    window.__lppSetVideoFailure = setVideoFailure;
    document.getElementById('download').onclick = () => {
      const url = currentVideoUrl();
      if (url) window.desktopApi?.saveMediaAs({ url, fileName: payload.fileName, kind: 'video' });
    };
    openSystem.onclick = openCurrentInSystem;
    document.getElementById('retry').onclick = () => {
      if (playerState.value === 'gesture') {
        shouldAutoplay = false;
        video.play().catch(() => { sync(); });
        return;
      }
      if (playerState.value === 'unsupported') {
        openCurrentInSystem();
        return;
      }
      retryAttempts += 1;
      setPlayerState('loading', retryAttempts > 1 ? '\u6b63\u5728\u91cd\u8bd5' : '');
      video.load();
    };
    video.onplay = () => { wrap.classList.add('started'); setPlayerState('ready'); sync(); showPlayerControls(); };
    video.onpause = () => { sync(); showPlayerControls(); }; video.ontimeupdate = sync; video.onloadedmetadata = sync; video.onended = () => { sync(); showPlayerControls(); };
    video.onloadeddata = () => { setPlayerState('ready'); requestAutoplay(); sync(); };
    video.oncanplay = () => { setPlayerState('ready'); requestAutoplay(); sync(); };
    video.onerror = () => {
      const failureState = videoFailureState();
      if (failureState === 'unsupported') setPlayerState('unsupported', videoFailureDetail());
      else setPlayerState('failed', videoFailureDetail());
    };
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') window.close();
      if (event.key === ' ') { event.preventDefault(); toggle(); }
      if (event.key === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - 5);
      if (event.key === 'ArrowRight') video.currentTime = Math.min(video.duration || video.currentTime + 5, video.currentTime + 5);
    });
    setPlayerState(payload.fileUrl ? 'loading' : 'loading', payload.fileUrl ? '' : '\u6b63\u5728\u51c6\u5907\u89c6\u9891');
    sync();
  </script>
</body>
</html>`;
}

function icon(name: string) {
  const icons: Record<string, string> = {
    pin: '<svg viewBox="0 0 24 24"><path d="M12 17v5"/><path d="M5 17h14"/><path d="m9 10-2 7h10l-2-7"/><path d="M9 10V4h6v6"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h6v6h-6z"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    more: '<svg viewBox="0 0 24 24"><path d="M5 12h.01"/><path d="M12 12h.01"/><path d="M19 12h.01"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14"/><path d="M16 5v14"/></svg>',
    volume: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
    muted: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m17 9 4 4"/><path d="m21 9-4 4"/></svg>',
  };
  return icons[name] || '';
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char));
}
