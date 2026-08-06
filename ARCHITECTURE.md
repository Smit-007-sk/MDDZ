# NUDOT Architecture Documentation

This document describes the decoupled, modular directory structure and animation orchestration engine of the refactored NUDOT website.

---

## Directory Structure

```
nudot.com.tw/
├── index.html                   # Clean, production-ready index entry point
├── ARCHITECTURE.md              # Core architecture details (this file)
├── README.md                    # Setup and customization instructions
│
├── css/                         # Decoupled design systems and layout tokens
│   ├── variables.css            # Central design tokens (fonts, colors, clamps)
│   ├── reset.css                # Base browser normalizations
│   ├── animations.css           # Consolidated keyframes
│   ├── global.css               # Typography overrides and utility utilities
│   └── sections/                # Independent, component-specific styles
│       ├── page-transitions.css
│       ├── loader.css
│       ├── nav.css
│       ├── cursor.css
│       ├── hero.css
│       ├── scs.css              # Cinematic Scroll Showcase (section-2)
│       ├── dark-wrapper.css
│       ├── stm.css
│       ├── core-capabilities.css
│       ├── gallery.css
│       ├── footer.css
│       └── mobile-cube.css
│
├── js/                          # Modular scripting modules
│   ├── site-config.js           #Central site content settings (Editable)
│   ├── animation-config.js      #Central animation timings/easings (Editable)
│   ├── main.js                  #DOM orchestrator and bootstrap logger
│   ├── transitions-helper.js    #Pre-DOMContentLoaded sessionStorage transition hook
│   ├── video-prewarm.js         #Preheat video stream logic to eliminate loading lag
│   ├── lazy-media.js            #Custom media streaming and image lazy-loader
│   ├── main-script.js           #Slideshow transitions, Lenis wrapper, cursor, gsap timelines
│   └── animations/
│       ├── loader.js            #Loader dismissal controller
│       ├── core-capabilities.js #WebGL ring gallery Canvas (Sketch class)
│       └── section-transitions.js#gsap exit timeline controller (stm -> ccap -> s3)
│
├── sections/                    # Clean HTML layout references (partials)
│   ├── page-transition.html
│   ├── loader.html
│   ├── nav.html
│   ├── hero.html
│   ├── dark-wrapper.html
│   ├── mobile-cube.html
│   ├── stm.html
│   ├── core-capabilities.html
│   ├── gallery.html
│   └── footer.html
│
└── archive/                     # Preserved backups and legacy assets
    ├── original-backup/         # Original monolith files
    ├── debug-tools/             # Legacy extraction helper scripts
    └── cloudflare/              # Email decoder scripts
```

---

## Core Systems

### 1. Style Decoupling
Global style variables are isolated in `css/variables.css`. Section component properties (like `.hero-section` or `#nudot-loader`) are separated into modular stylesheets under `css/sections/`. The load order linked in `index.html` preserves cascade specificity.

### 2. Video Pre-Warming & Hydration
- **Pre-Warm:** `js/video-prewarm.js` executes immediately to preheat the first video slide (`slider01.mp4`) in a hidden DOM wrapper. When `WebGLManager` initializes, it promotes this decoded stream instead of rebuilding a texture, eliminating black frames.
- **Hydration:** `js/lazy-media.js` checks element visibility and streams resources only when a user interacts or scrolls near them, saving CPU cycles and bandwidth.

### 3. Three.js & Canvas Effects
- **Hero Slider:** Built in `js/main-script.js` using a custom shader transition with a displacement noise map.
- **Core Capabilities:** Built in `js/animations/core-capabilities.js` (`Sketch` class), displaying a floating ring gallery in response to cursor position.
