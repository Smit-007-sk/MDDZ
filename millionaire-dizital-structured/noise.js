/* ============================================================================
   Unified film-grain / noise  —  shared across all MDZ pages
   Performance-optimized: 256x256 tiled pattern with idle initialization
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('bg--noise') ||
               document.getElementById('film-grain-canvas') ||
               document.getElementById('ai-grain-canvas');

  if (!canvas) return;

  if (window.innerWidth <= 768 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  if (!canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ── tuneable constants ────────────────────────────────────────────────────
  var GRAIN_OPACITY   = 0.06;
  var GRAIN_DENSITY   = 0.7;   // 0–1 fraction of pixels lit
  var FRAMES          = 6;     // pre-baked pattern frames
  var PATTERN_SIZE    = 256;   // 256x256 tiled pattern (instant to bake)
  var FPS             = 24;    // normal playback
  var FPS_HOLD        = 12;    // playback while scroll is cooling
  var SCROLL_HOLD_MS  = 180;
  var RESIZE_DEBOUNCE = 200;
  // ─────────────────────────────────────────────────────────────────────────

  Object.assign(canvas.style, {
    display:       'block',
    position:      'fixed',
    top:           '0',
    left:          '0',
    width:         '100vw',
    height:        '100vh',
    zIndex:        '9999',
    pointerEvents: 'none',
    mixBlendMode:  'screen',
    transform:     'translateZ(0)',
    willChange:    'opacity',
    contain:       'strict',
    opacity:       String(GRAIN_OPACITY),
  });

  var wW = 0, wH = 0;
  var patterns = [], patternIdx = 0;
  var rafId = 0, timerId = 0, resizeTimer = 0;
  var scrollHoldUntil = 0;
  var running = false;

  function bakePatterns() {
    patterns = [];
    for (var i = 0; i < FRAMES; i++) {
      var offscreen = document.createElement('canvas');
      offscreen.width = PATTERN_SIZE;
      offscreen.height = PATTERN_SIZE;
      var octx = offscreen.getContext('2d');
      if (!octx) continue;

      var idata = octx.createImageData(PATTERN_SIZE, PATTERN_SIZE);
      var buf = new Uint32Array(idata.data.buffer);
      for (var p = 0; p < buf.length; p++) {
        if (Math.random() < GRAIN_DENSITY) {
          buf[p] = 0xffffffff;
        }
      }
      octx.putImageData(idata, 0, 0);
      var pattern = ctx.createPattern(offscreen, 'repeat');
      if (pattern) patterns.push(pattern);
    }
  }

  function drawFrame() {
    if (patterns.length === 0) return;
    patternIdx = (patternIdx + 1) % patterns.length;
    ctx.clearRect(0, 0, wW, wH);
    ctx.fillStyle = patterns[patternIdx];
    ctx.fillRect(0, 0, wW, wH);
  }

  function tick() {
    if (!running) return;
    rafId = 0;
    var cooling = performance.now() < scrollHoldUntil;
    if (!cooling && document.visibilityState !== 'hidden') {
      drawFrame();
    }
    timerId = window.setTimeout(function () {
      rafId = window.requestAnimationFrame(tick);
    }, 1000 / (cooling ? FPS_HOLD : FPS));
  }

  function stop() {
    running = false;
    window.clearTimeout(timerId);
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
  }

  function start() {
    if (running || patterns.length === 0) return;
    running = true;
    rafId = window.requestAnimationFrame(tick);
  }

  function setup() {
    stop();
    wW = canvas.width  = Math.min(window.innerWidth, 1920);
    wH = canvas.height = Math.min(window.innerHeight, 1080);
    ctx.clearRect(0, 0, wW, wH);
    if (patterns.length === 0) {
      bakePatterns();
    }
    start();
  }

  function holdGrain() {
    scrollHoldUntil = performance.now() + SCROLL_HOLD_MS;
  }

  window._holdFilmGrain                 = holdGrain;
  window._holdLabsFilmGrainDuringScroll = holdGrain;
  window._holdWorkFilmGrain             = holdGrain;

  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(setup, RESIZE_DEBOUNCE);
  }, { passive: true });

  window.addEventListener('scroll', holdGrain, { passive: true });

  window.setTimeout(function () {
    if (window._lenis) window._lenis.on('scroll', holdGrain);
  }, 300);

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  // Non-blocking idle init
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(setup, { timeout: 1200 });
  } else {
    window.setTimeout(setup, 150);
  }
})();
