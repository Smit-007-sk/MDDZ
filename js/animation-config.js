/* =============================================================
   ANIMATION CONFIGURATION — Centralized settings for GSAP and Three.js
   ============================================================= */

window.MDZ_ANIMATION_CONFIG = {
  // ── Loader Timings ──
  loader: {
    targetMs: 2700,         // Time to hold the loader on screen (from performance.now())
    dismissTargetMs: 3200   // Time to release the loader shield click block
  },

  // ── Hero WebGL Slide Transitions ──
  heroSlideshow: {
    dprLimit: 2,            // Maximum device pixel ratio (clamped to 1.5 on mobile for performance)
    transitionDuration: 1.2,// Slide change transition duration in seconds
    autoPlayDelay: 8000,    // Time between autoplay transitions (currently manual but hook is prepared)
    waveIntensity: 35,      // Wave lines animation height modifier
    waveBaseHeight: 15      // Wave lines default rest height
  },

  // ── Custom Cursor Settings ──
  cursor: {
    lerp: 0.1,             // Lower = smoother, higher = tighter response to mouse movement
    ringHoverScale: 1.0,    // Scale factor of the outer ring on interactive hover
    ringRestScale: 0.529    // Rest scale factor of the outer ring
  },

  // ── Lenis Smooth Scroll Settings ──
  scroll: {
    duration: 1.2,          // Scrolling animation duration
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing curve
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true
  }
};
