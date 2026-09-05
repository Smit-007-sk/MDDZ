const NEXT = 1;
    const PREV = -1;

    let currentHoveredThumb = null;
    let mouseOverThumbnails = false;
    let lastHoveredThumbIndex = null;
    let heroSlides = [];
    let heroSlideCount = 0;
    let dragLinesCache = null;
    let webglManager = null;

    let isAnimating = false;
    let pendingNavigation = null;
    let sliderLocked = false;

    function ensureTopAndLock() {
      if (window.scrollY > 0) {
        // 🎯  Lenis,; Lenis  fallback 
        if (window._lenis) window._lenis.scrollTo(0, { duration: 1.2 });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    function updateNavigationUI(disabled) {
      document.querySelectorAll(".counter-nav, .slide-thumb").forEach(el => {
        el.style.opacity = disabled && el.classList.contains('counter-nav') ? "0.3" : "";
        el.style.pointerEvents = disabled ? "none" : "auto";
      });
    }

    function updateSlideCounter(index) {
      const el = document.querySelector(".current-slide");
      if (el) el.textContent = String(index + 1).padStart(2, "0");
    }

    const HERO_MOBILE_MEDIA_QUERY = "(max-width: 767px)";

    function shouldUseMobileHeroMedia() {
      if (window.matchMedia) return window.matchMedia(HERO_MOBILE_MEDIA_QUERY).matches;
      return window.innerWidth <= 767;
    }

    function readHeroMediaAttr(el, key) {
      return (el.dataset[key] || "").trim();
    }

    function collectHeroSlides() {
      const useMobileMedia = shouldUseMobileHeroMedia();

      return Array.from(document.querySelectorAll(".slide__img"))
        .map((el, index) => {
          const desktopImage = readHeroMediaAttr(el, "image");
          const desktopVideo = readHeroMediaAttr(el, "video");
          const desktopThumb = readHeroMediaAttr(el, "thumb");
          const mobileImage = readHeroMediaAttr(el, "mobileImage");
          const mobileVideo = readHeroMediaAttr(el, "mobileVideo");
          const mobileThumb = readHeroMediaAttr(el, "mobileThumb");
          const hasMobileAsset = Boolean(mobileImage || mobileVideo);
          const assetUrl = useMobileMedia && hasMobileAsset
            ? (mobileVideo || mobileImage)
            : (desktopVideo || desktopImage);

          if (!assetUrl) return null;

          const isVideo = /\.(mp4|webm|ogg|m3u8)$/i.test(assetUrl);
          const thumbUrl = useMobileMedia
            ? (mobileThumb || mobileImage || desktopThumb || desktopImage || (!isVideo ? assetUrl : ""))
            : (desktopThumb || mobileThumb || mobileImage || desktopImage || (!isVideo ? assetUrl : ""));

          return {
            assetUrl,
            thumbUrl,
            title: (el.dataset.title || `Slide ${String(index + 1).padStart(2, "0")}`).trim()
          };
        })
        .filter(Boolean);
    }

    function updateSlideTitle(index) {
      const container = document.querySelector(".slide-title-container");
      const current = document.querySelector(".slide-title");
      if (!container || !current) return;

      const newTitle = document.createElement("div");
      newTitle.className = "slide-title enter-up";
      newTitle.textContent = heroSlides[index]?.title || "";

      container.appendChild(newTitle);
      current.classList.add("exit-up");

      requestAnimationFrame(() => newTitle.classList.remove("enter-up"));
      setTimeout(() => current.remove(), 500);
    }

    // 🎯 :line-base-height CSS var , getComputedStyle
    let _lineBaseHeight = 15;
    try {
      const _rootStyle = getComputedStyle(document.documentElement);
      _lineBaseHeight = parseInt(_rootStyle.getPropertyValue("--line-base-height")) || 15;
    } catch (e) { }

    function updateDragLines(activeIndex, forceUpdate = false) {
      const lines = dragLinesCache || Array.from(document.querySelectorAll(".drag-line"));
      if (!lines.length) return;

      lines.forEach(line => {
        line.style.height = "var(--line-base-height)";
        line.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
      });

      if (activeIndex === null) return;

      const thumbWidth = 720 / Math.max(heroSlideCount || heroSlides.length || 1, 1);
      const centerPosition = (activeIndex + 0.5) * thumbWidth;
      const lineWidth = 720 / lines.length;

      // 🎯 : CSS  transition-delay ,,
      //     60  setTimeout  timer overhead 
      lines.forEach((line, i) => {
        const linePosition = (i + 0.5) * lineWidth;
        const distFromCenter = Math.abs(linePosition - centerPosition);
        const maxDistance = thumbWidth * 0.7;

        if (distFromCenter <= maxDistance) {
          const normalizedDist = distFromCenter / maxDistance;
          const waveHeight = Math.cos((normalizedDist * Math.PI) / 2);
          const height = _lineBaseHeight + waveHeight * 35;
          const opacity = 0.3 + waveHeight * 0.4;

          // CSS  cubic-bezier transition , setTimeout
          line.style.transitionDelay = `${normalizedDist * 0.08}s`;
          line.style.height = `${height}px`;
          line.style.backgroundColor = `rgba(255, 255, 255, ${opacity})`;
        } else {
          line.style.transitionDelay = '0s';
        }
      });
    }

    function getOptimalDPR() {
      const dpr = window.devicePixelRatio || 1;
      const mem = navigator.deviceMemory || 8;
      if (mem <= 4) return 1;
      if (window.innerWidth <= 768) return Math.min(dpr, 1.5);
      return Math.min(dpr, 2);
    }

    // =========================================================
    // HLS Helper —  HLS (.m3u8)  WebGLManager
    // =========================================================
    /**
     *  HLS  <video> 。
     * ：
     *   1. Safari / iOS —  HLS， vid.src
     *   2. Chrome / Firefox / Edge —  hls.js 
     *   3.  fallback —  .mp4（server  fallback）
     */
    function attachHLSToVideo(vid, hlsUrl) {
      // ① Safari / iOS  HLS
      if (vid.canPlayType('application/vnd.apple.mpegurl')) {
        vid.src = hlsUrl;
        return;
      }
      // ② hls.js（Chrome / Firefox / Edge）
      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 30,       //  30 
          maxMaxBufferLength: 60,
          startLevel: -1,            // ABR：（-1 = auto）
          autoStartLoad: true,
          enableWorker: true,
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(vid);
        vid._hls = hls;             //  cleanup 
        return;
      }
      // ③  fallback： .m3u8  .mp4（ server ）
      const mp4 = hlsUrl.replace(/\.m3u8(\?.*)?$/i, '.mp4');
      if (mp4 !== hlsUrl) vid.src = mp4;
    }

    // =========================================================
    // WebGL Ultra-Premium Manager
    // =========================================================
    class WebGLManager {
      constructor(containerId, imageUrls) {
        this.container = document.getElementById(containerId);
        this.imageUrls = imageUrls;
        this.textures = [];
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderPaused = false;
        this.activeTextureIndex = 0;
        this.textureLoader = new THREE.TextureLoader();
        this.texturePromises = {};
        this.videoEls = {};
        this.textureResolutions = {};

        const initialRenderSize = this.getRenderSize();

        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        this.renderer.setSize(initialRenderSize.width, initialRenderSize.height);
        this.container.appendChild(this.renderer.domElement);

        this.mouse = new THREE.Vector2(0, 0);
        this.targetMouse = new THREE.Vector2(0, 0);

        this.initShader();
        this.loadTextures();

        this._resizeRaf = 0;
        this._boundResize = () => {
          if (this._resizeRaf) return;
          this._resizeRaf = requestAnimationFrame(() => {
            this._resizeRaf = 0;
            this.onResize();
          });
        };

        window.addEventListener('resize', this._boundResize, { passive: true });
        window.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
      }

      getRenderSize() {
        if (!this.container) {
          return {
            width: window.innerWidth,
            height: window.innerHeight
          };
        }

        const width = Math.max(1, Math.round(this.container.clientWidth || window.innerWidth));
        const height = Math.max(1, Math.round(this.container.clientHeight || window.innerHeight));

        return { width, height };
      }

      onMouseMove(e) {
        this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      }

      initShader() {
        const initialRenderSize = this.getRenderSize();
        const vertexShader = `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `;

        const fragmentShader = `
          uniform sampler2D uTex1;
          uniform sampler2D uTex2;
          uniform float uProgress;
          uniform float uDirection;
          uniform float uTexReady;
          uniform vec2 uResolution;
          uniform vec2 uImageResolution;   // tex1's intrinsic resolution
          uniform vec2 uImageResolution2;  // tex2's intrinsic resolution
          uniform vec2 uMouse;
          varying vec2 vUv;

          vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
          float snoise(vec2 v){
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          // 🎯  0.5s bug:
          //     ratio,/(),
          //    , transition 。
          //     uImageResolution  cover ratio。
          vec2 fitCover(vec2 vUv, vec2 imgRes) {
            vec2 ratio = vec2(
                min((uResolution.x / uResolution.y) / (imgRes.x / imgRes.y), 1.0),
                min((uResolution.y / uResolution.x) / (imgRes.y / imgRes.x), 1.0)
            );
            return vec2(
                vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
                vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
            );
          }

          void main() {
            vec2 uvA = fitCover(vUv, uImageResolution);
            vec2 uvB = fitCover(vUv, uImageResolution2);

            uvA = (uvA - 0.5) * 0.95 + 0.5;
            uvA -= uMouse * 0.015;
            uvB = (uvB - 0.5) * 0.95 + 0.5;
            uvB -= uMouse * 0.015;

            float p = uProgress;

            vec2 uvNoise = mix(uvA, uvB, 0.5);
            float noiseVal = (p > 0.001 && p < 0.999) ? snoise(uvNoise * 3.0 + p * 2.0) : 0.0;
            float warp = noiseVal * p * (1.0 - p) * 0.3;

            vec2 center = vec2(0.5, 0.5);
            vec2 uv1 = mix(uvA, center, p * 0.15) + vec2(0.0, uDirection * p * 0.3) + warp;
            vec2 uv2 = mix(uvB, center, (1.0 - p) * 0.15) - vec2(0.0, uDirection * (1.0 - p) * 0.3) + warp;

            float shift = 0.04 * p * (1.0 - p) * (noiseVal + 1.0);

            vec4 t1 = vec4(
                texture2D(uTex1, uv1 + vec2(shift, 0.0)).r,
                texture2D(uTex1, uv1).g,
                texture2D(uTex1, uv1 - vec2(shift, 0.0)).b,
                1.0
            );

            vec4 t2 = vec4(
                texture2D(uTex2, uv2 + vec2(shift, 0.0)).r,
                texture2D(uTex2, uv2).g,
                texture2D(uTex2, uv2 - vec2(shift, 0.0)).b,
                1.0
            );

            // ， poster 
            if (uTexReady < 0.5) { gl_FragColor = vec4(0.0); return; }
            gl_FragColor = mix(t1, t2, smoothstep(0.0, 1.0, p));
          }
        `;

        this.material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            uTex1: { value: null },
            uTex2: { value: null },
            uProgress: { value: 0 },
            uDirection: { value: 1 },
            uTexReady: { value: 0 },
            uResolution: { value: new THREE.Vector2(initialRenderSize.width, initialRenderSize.height) },
            uImageResolution: { value: new THREE.Vector2(1920, 1080) },   // for uTex1
            uImageResolution2: { value: new THREE.Vector2(1920, 1080) },  // for uTex2
            uMouse: { value: new THREE.Vector2(0, 0) }
          }
        });

        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
        this.scene.add(this.mesh);
      }

      loadTextures() {
        this.loadTextureAt(0);
        if (this.imageUrls.length > 1) {
          requestAnimationFrame(() => this.loadTextureAt(1));
        }
      }

      rememberTextureResolution(index, width, height) {
        if (!width || !height) return;
        this.textureResolutions[index] = { width, height };
        //  slot, ratio。
        if (index === this.activeTextureIndex) {
          this.applyTextureResolution(index, null, 1);
          //  uTex2 (), slot2 , nextRes 
          this.applyTextureResolution(index, null, 2);
        }
      }

      applyTextureResolution(index, texture, slot) {
        // slot: 1 → uImageResolution ( uTex1);2 → uImageResolution2 ( uTex2)
        const targetSlot = slot === 2 ? 2 : 1;
        const uniformName = targetSlot === 2 ? 'uImageResolution2' : 'uImageResolution';
        const resolution = this.textureResolutions[index];
        if (resolution) {
          this.material.uniforms[uniformName].value.set(resolution.width, resolution.height);
          return;
        }
        if (texture && texture.image && texture.image.width && texture.image.height) {
          this.material.uniforms[uniformName].value.set(texture.image.width, texture.image.height);
        }
      }

      loadTextureAt(index) {
        if (this.texturePromises[index]) return this.texturePromises[index];
        if (this.textures[index]) return Promise.resolve(this.textures[index]);

        const url = this.imageUrls[index];
        if (!url) return Promise.resolve(null);

        if (/\.(mp4|webm|ogg|m3u8)$/i.test(url)) {
          this.texturePromises[index] = new Promise((resolve) => {
            // 🎯 index=0  prewarm video element（ decode，readyState  >= 2）
            //     →  decode，uTexReady  1，。
            let vid;
            const prewarm = window._prewarmVideo;
            const canReuse = index === 0 && prewarm && prewarm.el && prewarm.src === url && !/\.m3u8/i.test(url);
            if (canReuse) {
              vid = prewarm.el;
              window._prewarmVideo = null; // ， 8s timer 
              vid.loop = true;
              // ⚠️ ： 1×1！
              //     texture  ready（readyState < 2，）
              //     promotePrwarmToHeroBg  → hero  #000 ，
              //    「」。
              //    ： hero ， resolveTexture（uTexReady=1）
              //     2  RAF（ WebGL canvas ） container。
            } else {
              vid = document.createElement('video');
              // ， src / HLS， iOS Safari autoplay policy 
              vid.loop = true;
              vid.muted = true;
              vid.playsInline = true;
              vid.preload = 'auto';
              vid.setAttribute('muted', '');
              vid.setAttribute('playsinline', '');
              vid.setAttribute('webkit-playsinline', '');
              //  autoplay， iOS / Android 
              if (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) {
                vid.autoplay = true;
                vid.setAttribute('autoplay', '');
              }
              //  src：HLS (.m3u8)  attachHLSToVideo()， src
              if (/\.m3u8(\?.*)?$/i.test(url)) {
                attachHLSToVideo(vid, url);
              } else {
                vid.src = url;
              }
              this.container.appendChild(vid);
              vid.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
            } // end else (new video element)
            this.videoEls[index] = vid;
            const texture = new THREE.VideoTexture(vid);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            this.textures[index] = texture;
            const rememberVideoResolution = () => {
              this.rememberTextureResolution(index, vid.videoWidth || 1920, vid.videoHeight || 1080);
            };
            vid.addEventListener('loadedmetadata', rememberVideoResolution, { once: true });
            let didResolveTexture = false;
            let textureFallbackTimer = null;
            const clearTextureFallback = () => {
              if (!textureFallbackTimer) return;
              clearTimeout(textureFallbackTimer);
              textureFallbackTimer = null;
            };
            const resolveTexture = () => {
              if (didResolveTexture) return;
              didResolveTexture = true;
              clearTextureFallback();
              rememberVideoResolution();
              if (index === 0) {
                this.material.uniforms.uTex1.value = texture;
                this.material.uniforms.uTexReady.value = 1;
                this.applyTextureResolution(index, texture, 1);
                //  uTex2 , slot2 ,
                this.applyTextureResolution(index, texture, 2);
              }
              // 🎯 reuse ： ready  2  RAF（GSAP ticker  uTexReady ），
              //     hero  1×1  webgl container → 。
              if (canReuse && index === 0) {
                requestAnimationFrame(() => requestAnimationFrame(() => {
                  vid.dataset.ndPromoted = '';
                  vid.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
                  try { this.container.appendChild(vid); } catch (_) { }
                }));
              }
              resolve(texture);
            };
            const resolveEmptyTexture = () => {
              if (didResolveTexture) return;
              didResolveTexture = true;
              clearTextureFallback();
              resolve(null);
            };
            // ⚠️ ： 2.5  resolveTexture() 
            //    （readyState < 2） uTexReady  1 → shader  VideoTexture → 。
            //    ： 400ms ， readyState >= 2  resolve。
            const fallbackTick = () => {
              textureFallbackTimer = null;
              if (didResolveTexture) return;
              if (vid.readyState >= 2) { resolveTexture(); return; }
              textureFallbackTimer = setTimeout(fallbackTick, 400);
            };
            textureFallbackTimer = setTimeout(fallbackTick, 2500);
            if (vid.readyState >= 2) resolveTexture();
            else vid.addEventListener('loadeddata', resolveTexture, { once: true });
            vid.addEventListener('error', resolveEmptyTexture, { once: true });
            // hls.js ， vid.load()（）
            if (vid.readyState === 0 && !vid._hls) vid.load();
            if (index === 0) this._safePlay(vid);
          });
          return this.texturePromises[index];
        }

        this.texturePromises[index] = new Promise((resolve) => {
          this.textureLoader.load(
            url,
            (texture) => {
              texture.generateMipmaps = true;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              this.textures[index] = texture;
              if (texture.image) {
                this.rememberTextureResolution(index, texture.image.width, texture.image.height);
              }
              if (index === 0) {
                this.material.uniforms.uTex1.value = texture;
                this.applyTextureResolution(index, texture, 1);
                //  slot2,
                this.applyTextureResolution(index, texture, 2);
              }
              resolve(texture);
            },
            undefined,
            () => resolve(null)
          );
        });
        return this.texturePromises[index];
      }

      preloadTexture(index) {
        return this.loadTextureAt(index);
      }

      _safePlay(vid) {
        if (!vid) return;
        const playPromise = vid.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function (e) {
            if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) {
              vid.addEventListener('canplay', function onCanPlay() {
                vid.removeEventListener('canplay', onCanPlay);
                vid.play().catch(function () { });
              }, { once: true });
            }
          });
        }
      }

      syncVideoPlayback() {
        const active = this.renderPaused
          ? new Set()
          : new Set(Array.prototype.slice.call(arguments).map(Number));
        Object.keys(this.videoEls || {}).forEach((key) => {
          const vid = this.videoEls[key];
          if (!vid) return;
          if (active.has(Number(key))) {
            this._safePlay(vid);
          } else if (!vid.paused) {
            vid.pause();
          }
        });
      }

      setRenderPaused(paused) {
        if (this.renderPaused === paused) return;
        this.renderPaused = paused;
        if (this.container) this.container.style.visibility = paused ? 'hidden' : '';
        if (paused) this.syncVideoPlayback();
        else this.syncVideoPlayback(this.activeTextureIndex);
      }

      onResize() {
        const nextRenderSize = this.getRenderSize();
        const nextDpr = window.devicePixelRatio || 1;
        if (this.renderer.getPixelRatio && this.renderer.getPixelRatio() !== nextDpr) {
          this.renderer.setPixelRatio(nextDpr);
        }
        this.renderer.setSize(nextRenderSize.width, nextRenderSize.height);
        this.material.uniforms.uResolution.value.set(nextRenderSize.width, nextRenderSize.height);
      }

      render() {
        // 🎯 dark-wrapper ,hero WebGL ; render  texture
        const scrollY = window._lenis && typeof window._lenis.scroll === 'number'
          ? window._lenis.scroll
          : window.scrollY;
        if (scrollY > window.innerHeight * 1.1) {
          this.setRenderPaused(true);
          return;
        }
        this.setRenderPaused(false);

        this.mouse.lerp(this.targetMouse, 0.05);
        this.material.uniforms.uMouse.value.copy(this.mouse);

        const t1 = this.material.uniforms.uTex1.value;
        const t2 = this.material.uniforms.uTex2.value;

        for (const idx in this.videoEls) {
          const vid = this.videoEls[idx];
          const tex = this.textures[idx];
          if (tex && (tex === t1 || tex === t2) && vid.readyState >= 2) {
            tex.needsUpdate = true;
          }
        }
        this.renderer.render(this.scene, this.camera);
      }

      transition(currentIndex, nextIndex, direction, onCompleteCallback) {
        const transitionToken = {};
        this._transitionToken = transitionToken;

        Promise.all([
          this.loadTextureAt(currentIndex),
          this.loadTextureAt(nextIndex)
        ]).then(([currentTexture, nextTexture]) => {
          if (this._transitionToken !== transitionToken) return;
          if (!currentTexture || !nextTexture) {
            if (onCompleteCallback) onCompleteCallback();
            return;
          }

          this.material.uniforms.uTex1.value = currentTexture;
          this.material.uniforms.uTex2.value = nextTexture;
          // 🎯  slot,
          this.applyTextureResolution(currentIndex, currentTexture, 1);
          this.applyTextureResolution(nextIndex, nextTexture, 2);
          this.material.uniforms.uDirection.value = direction;
          this.material.uniforms.uProgress.value = 0;
          this.activeTextureIndex = currentIndex;
          this.syncVideoPlayback(currentIndex, nextIndex);

          gsap.to(this.material.uniforms.uProgress, {
            value: 1,
            duration: 1.4,
            ease: "expo.inOut",
            onComplete: () => {
              this.material.uniforms.uTex1.value = nextTexture;
              this.material.uniforms.uProgress.value = 0;
              this.activeTextureIndex = nextIndex;
              // uTex1  nextTexture, slot1  next
              this.applyTextureResolution(nextIndex, nextTexture, 1);
              this.applyTextureResolution(nextIndex, nextTexture, 2);
              this.syncVideoPlayback(nextIndex);
              if (onCompleteCallback) onCompleteCallback();
            }
          });
        });
      }
    }

    class Slideshow {
      constructor(webglManager, totalSlides) {
        this.webgl = webglManager;
        this.current = 0;
        this.slidesTotal = totalSlides;
      }

      next() { this.navigate(NEXT); }
      prev() { this.navigate(PREV); }

      goTo(index) {
        if (isAnimating) {
          pendingNavigation = { type: "goto", index };
          return false;
        }
        if (index === this.current) return false;

        isAnimating = true;
        updateNavigationUI(true);

        const previous = this.current;
        this.current = index;
        const direction = index > previous ? 1 : -1;

        document.querySelectorAll(".slide-thumb").forEach((thumb, i) => thumb.classList.toggle("active", i === index));
        updateSlideCounter(index);
        updateSlideTitle(index);
        updateDragLines(index, true);

        this.webgl.transition(previous, this.current, direction, () => {
          isAnimating = false;
          updateNavigationUI(false);
          if (pendingNavigation) {
            const { type, index, direction } = pendingNavigation;
            pendingNavigation = null;
            setTimeout(() => type === "goto" ? this.goTo(index) : this.navigate(direction), 50);
          }
          const hoverIdx = (mouseOverThumbnails && lastHoveredThumbIndex !== null) ? lastHoveredThumbIndex : this.current;
          updateDragLines(hoverIdx, true);
        });
      }

      navigate(direction) {
        if (isAnimating) {
          pendingNavigation = { type: "navigate", direction };
          return false;
        }

        isAnimating = true;
        updateNavigationUI(true);

        const previous = this.current;
        this.current = direction === 1
          ? this.current < this.slidesTotal - 1 ? ++this.current : 0
          : this.current > 0 ? --this.current : this.slidesTotal - 1;

        document.querySelectorAll(".slide-thumb").forEach((thumb, index) => {
          thumb.classList.toggle("active", index === this.current);
        });
        updateSlideCounter(this.current);
        updateSlideTitle(this.current);
        updateDragLines(this.current, true);

        this.webgl.transition(previous, this.current, direction, () => {
          isAnimating = false;
          updateNavigationUI(false);
          if (pendingNavigation) {
            const { type, index, direction } = pendingNavigation;
            pendingNavigation = null;
            setTimeout(() => type === "goto" ? this.goTo(index) : this.navigate(direction), 50);
          }
          const hoverIdx2 = (mouseOverThumbnails && lastHoveredThumbIndex !== null) ? lastHoveredThumbIndex : this.current;
          updateDragLines(hoverIdx2, true);
        });
      }
    }

    // =========================================================
    // INITIALIZATION & SCROLL ANIMATION TIE-IN
    // =========================================================
    document.addEventListener("DOMContentLoaded", () => {

      let winW = window.innerWidth;
      let winH = window.innerHeight;
      const isMobileInit = winW <= 768;
      window.addEventListener('resize', () => {
        winW = window.innerWidth;
        winH = window.innerHeight;
      }, { passive: true });

      const HERO_RENDER_SLEEP_VH = 1.1;
      function getPerformanceScrollY() {
        return window._lenis && typeof window._lenis.scroll === 'number'
          ? window._lenis.scroll
          : window.scrollY;
      }
      function isHeroRenderSleeping() {
        return getPerformanceScrollY() > winH * HERO_RENDER_SLEEP_VH;
      }

      let heroSlideshowInitialized = false;
      function initHeroSlideshow() {
        if (heroSlideshowInitialized) return;

        heroSlides = collectHeroSlides();
        const imageUrls = heroSlides.map(slide => slide.assetUrl);
        const slideCount = imageUrls.length;

        if (!slideCount) return;
        heroSlideshowInitialized = true;
        heroSlideCount = slideCount;

        const initialTitle = document.querySelector(".slide-title");
        if (initialTitle) initialTitle.textContent = heroSlides[0].title;

        webglManager = new WebGLManager("webgl-container", imageUrls);
        const slideshow = new Slideshow(webglManager, slideCount);

        const thumbsContainer = document.querySelector(".slide-thumbs");
        if (thumbsContainer) {
          thumbsContainer.innerHTML = "";
          heroSlides.forEach((slide, index) => {
            const thumb = document.createElement("div");
            thumb.className = "slide-thumb";
            if (slide.thumbUrl) {
              thumb.style.backgroundImage = `url("${slide.thumbUrl}")`;
            } else if (/\.(mp4|webm|ogg)$/i.test(slide.assetUrl)) {
              thumb.style.background = '#111';
              thumb.innerHTML = '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px;opacity:0.6;">&#9654;</span>';
            } else {
              thumb.style.backgroundImage = `url("${slide.assetUrl}")`;
            }
            if (index === 0) thumb.classList.add("active");

            thumb.addEventListener("click", () => {
              lastHoveredThumbIndex = index;
              webglManager?.preloadTexture(index);
              ensureTopAndLock();
              slideshow.goTo(index);
              startAutoLoop();
            });

            thumb.addEventListener("mouseenter", () => {
              currentHoveredThumb = index;
              lastHoveredThumbIndex = index;
              mouseOverThumbnails = true;
              webglManager?.preloadTexture(index);
              if (!isAnimating) updateDragLines(index, true);
            });

            thumb.addEventListener("mouseleave", () => {
              if (currentHoveredThumb === index) currentHoveredThumb = null;
            });

            thumbsContainer.appendChild(thumb);
          });
        }

        const dragIndicator = document.querySelector(".drag-indicator");
        if (dragIndicator) {
          dragIndicator.innerHTML = "";
          const linesContainer = document.createElement("div");
          linesContainer.className = "lines-container";
          dragIndicator.appendChild(linesContainer);
          dragLinesCache = [];
          for (let i = 0; i < 60; i++) {
            const line = document.createElement("div");
            line.className = "drag-line";
            linesContainer.appendChild(line);
            dragLinesCache.push(line);
          }
        }

        const totalSlidesEl = document.querySelector(".total-slides");
        if (totalSlidesEl) totalSlidesEl.textContent = String(slideCount).padStart(2, "0");
        document.documentElement.style.setProperty("--thumb-width", `${720 / slideCount}px`);

        document.querySelector(".prev-slide")?.addEventListener("click", () => { ensureTopAndLock(); slideshow.prev(); });
        document.querySelector(".next-slide")?.addEventListener("click", () => { ensureTopAndLock(); slideshow.next(); });

        updateSlideCounter(0);
        updateDragLines(0, true);

        // 🎯 ／：（touch  mouse events）
        if (!isMobileInit) {
          const thumbsArea = document.querySelector(".thumbs-container");
          if (thumbsArea) {
            thumbsArea.addEventListener("mouseenter", () => { mouseOverThumbnails = true; stopAutoLoop(); });
            thumbsArea.addEventListener("mouseleave", () => { mouseOverThumbnails = false; currentHoveredThumb = null; updateDragLines(slideshow.current, true); startAutoLoop(); });
          }

          let dragStartX = 0;
          let isDragging = false;
          const heroEl = document.querySelector('.hero-section');
          if (heroEl) {
            heroEl.style.cursor = 'grab';
            heroEl.addEventListener('mousedown', (e) => {
              isDragging = true;
              dragStartX = e.clientX;
              heroEl.style.cursor = 'grabbing';
              stopAutoLoop();
            }, { passive: true });
            document.addEventListener('mouseup', (e) => {
              if (!isDragging) return;
              isDragging = false;
              heroEl.style.cursor = 'grab';
              const diff = dragStartX - e.clientX;
              if (Math.abs(diff) > 50 && !isAnimating) {
                if (diff > 0) slideshow.next();
                else slideshow.prev();
              }
              startAutoLoop();
            }, { passive: true });
            heroEl.addEventListener('mouseleave', () => { isDragging = false; heroEl.style.cursor = 'grab'; }, { passive: true });
          }
        }

        let autoLoopTimer = null;
        let autoLoopStartToken = 0;
        function startAutoLoop() {
          stopAutoLoop();
          const token = ++autoLoopStartToken;
          const armAutoLoop = () => {
            if (token !== autoLoopStartToken) return;
            autoLoopTimer = setInterval(() => {
              if (!isAnimating && !isHeroRenderSleeping()) slideshow.next();
            }, 5000);
          };
          const loaderReady = (window._mdzLoaderDismissed === true || !document.getElementById('mdz-loader'))
            ? Promise.resolve()
            : new Promise((resolve) => {
              document.addEventListener('mdz:loader-dismissed', resolve, { once: true });
            });
          const activeTextureReady = webglManager?.preloadTexture(slideshow.current);
          const textureReady = activeTextureReady && typeof activeTextureReady.then === 'function'
            ? Promise.race([
              activeTextureReady.catch(() => null),
              new Promise((resolve) => setTimeout(resolve, 1800))
            ])
            : Promise.resolve();
          Promise.allSettled([loaderReady, textureReady]).then(armAutoLoop);
        }
        function stopAutoLoop() {
          autoLoopStartToken++;
          if (autoLoopTimer) { clearInterval(autoLoopTimer); autoLoopTimer = null; }
        }
        startAutoLoop();

        // 🎯 loader  600ms  slide 1（slider02）
        //     Promise.all  resolve，。
        //    600ms  hero canvas 、 slider01 。
        (function () {
          function _preloadSlide1() {
            if (webglManager && heroSlideCount > 1) webglManager.preloadTexture(1);
          }
          if (window._mdzLoaderDismissed) {
            setTimeout(_preloadSlide1, 600);
          } else {
            document.addEventListener('mdz:loader-dismissed', function () {
              setTimeout(_preloadSlide1, 600);
            }, { once: true });
          }
        }());

        let touchStartY = 0;
        document.addEventListener("touchstart", (e) => { touchStartY = e.touches[0].clientY; window._touchStartX = e.touches[0].clientX; }, { passive: true });

        // 🎯  touchmove ()

        document.addEventListener("touchend", (e) => {
          const touchEndX = e.changedTouches[0].clientX;
          const touchDiffX = (window._touchStartX || touchEndX) - touchEndX;
          if (Math.abs(touchDiffX) > 50 && window.scrollY < window.innerHeight && !isAnimating) {
            if (touchDiffX > 0) slideshow.next();
            else slideshow.prev();
          }
        }, { passive: true });

        document.addEventListener("keydown", (e) => {
          if (window.scrollY <= window.innerHeight * 0.5 && !isAnimating) {
            if (e.key === "ArrowRight") slideshow.next();
            else if (e.key === "ArrowLeft") slideshow.prev();
          }
        });
      }

      function revealSetup(el) {
        if (!el) return null;
        el.style.overflow = 'hidden';
        const inner = document.createElement('div');
        inner.style.willChange = 'transform';
        while (el.firstChild) inner.appendChild(el.firstChild);
        el.appendChild(inner);
        gsap.set(inner, { yPercent: 110 });
        return inner;
      }

      // 🎯 ：top-header  grid-section  mobile CSS  display:none， DOM wrapping
      const rvHuge = isMobileInit ? [] : [...document.querySelectorAll('.overlay-top .huge-text')].map(revealSetup);
      const rvTag = isMobileInit ? null : revealSetup(document.querySelector('.overlay-top .small-tag'));
      const rvSvcLi = isMobileInit ? [] : [...document.querySelectorAll('.overlay-top .services-list li')].map(revealSetup);
      const rvGrid = isMobileInit ? [] : [...document.querySelectorAll('.overlay-bottom .hero-quick-links-row > div, .overlay-bottom .border-top-line > div')].map(revealSetup);
      const rvFooter = [...document.querySelectorAll('.overlay-bottom .footer-col')].map(revealSetup);
      gsap.set('.bottom-ui-container', { autoAlpha: 0, y: 22 });

      const heroTl = gsap.timeline({ paused: true });
      window._heroTl = heroTl;
      heroTl
        .to(rvHuge, {
          yPercent: 0, duration: 0.85, stagger: 0.14, ease: 'power4.out'
        }, 0.4)
        .to(rvTag, {
          yPercent: 0, duration: 0.75, ease: 'power3.out'
        }, '-=0.9')
        .to(rvSvcLi, {
          yPercent: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out'
        }, '-=0.65')
        .to(rvGrid, {
          yPercent: 0, duration: 0.42, stagger: 0.05, ease: 'power3.out'
        }, 0.35)
        .to(rvFooter, {
          yPercent: 0, duration: 0.25, stagger: 0.03, ease: 'power3.out'
        }, 0.3)
        .to('.bottom-ui-container', {
          autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out'
        }, 0.7);

      // 🎯 ： prewarm video  hero 
      //    prewarm  <head>  decode， readyState  >= 2（）。
      //     hero-section  opacity:1 → ，。
      //     WebGLManager.loadTextureAt(0)  VideoTexture，
      //     uTexReady  1，WebGL canvas（z-index:1, alpha:true）。
      (function promotePrwarmToHeroBg() {
        const pw = window._prewarmVideo;
        if (!pw || !pw.el) return;
        const heroSec = document.querySelector('.hero-section');
        if (!heroSec) return;
        const pv = pw.el;
        pv.dataset.ndPromoted = '1'; // 🛡️  head  8s  timer：，
        pv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;opacity:1;';
        heroSec.insertBefore(pv, heroSec.firstChild);
      })();

      // 🎯  DOMContentLoaded ：
      //    loader （ 3.2 ） WebGL ，
      //    loader  ready，。
      initHeroSlideshow();

      const cube = document.getElementById('cube');
      const sceneWrapper = document.getElementById('sceneWrapper');
      const section2 = document.getElementById('section-2-content');
      const imgOverlay = document.getElementById('img-overlay');
      const darkWrapper = document.getElementById('dark-wrapper');
      const darkWrapperMask = document.getElementById('dark-wrapper-mask');
      const dwBlackOverlay = document.getElementById('dw-black-overlay');
      const stmLogoEl = document.getElementById('stmLogo');
      const titleLine1 = document.getElementById('title-line1');
      const titleLine2 = document.getElementById('title-line2');
      const titleMarquee = document.getElementById('title-marquee');
      const titleSubtitle = document.getElementById('title-subtitle');
      const titleDesc = document.getElementById('title-desc');
      const newSubtitle = document.getElementById('new-subtitle');
      const newLine1 = document.getElementById('new-line1');
      const newLine2 = document.getElementById('new-line2');
      const newDesc = document.getElementById('new-desc');
      const newTextGroup = document.getElementById('new-text-group');
      const uiNav = document.getElementById('ui-nav');
      const uiScroll = document.getElementById('ui-scroll');
      const uiGlow1 = document.getElementById('ui-glow1');
      const uiGlow2 = document.getElementById('ui-glow2');
      const fixedLogoEl = document.getElementById('fixed-logo');

      // 🎯 dark-wrapper-mask  display:none，
      if (!isMobileInit) {
        if (uiNav) { gsap.set(uiNav, { opacity: 0, y: -25 }); }
        if (uiScroll) { gsap.set(uiScroll, { opacity: 0 }); }
        if (uiGlow1) { gsap.set(uiGlow1, { opacity: 0, scale: 0.4 }); }
        if (uiGlow2) { gsap.set(uiGlow2, { opacity: 0, scale: 0.4 }); }
        if (darkWrapper) gsap.set(darkWrapper, { force3D: true });
      }

      // 🎯 #nav display:none ， logo 
      if (!isMobileInit && fixedLogoEl) {
        gsap.set(fixedLogoEl, { y: -16 });
        gsap.to(fixedLogoEl, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 2.8 });
      }

      function resetReveal() {
        gsap.set(titleSubtitle, { yPercent: 130 });
        gsap.set(titleLine1, { yPercent: 130 });
        gsap.set(titleLine2, { yPercent: 130 });
        gsap.set(titleMarquee, { yPercent: 130 });
        gsap.set(titleDesc, { yPercent: 130 });
        gsap.set(newSubtitle, { yPercent: 130 });
        gsap.set(newLine1, { yPercent: 130 });
        gsap.set(newLine2, { yPercent: 130 });
        gsap.set(newDesc, { yPercent: 130 });
      }
      // 🎯 dark-wrapper ，
      if (!isMobileInit) resetReveal();

      const faceFront = document.querySelector('.face.front');
      const scene = document.querySelector('.scene');
      const introPanel = document.getElementById('intro-panel');
      const introTopHeader = document.querySelector('.ip-top-header');
      const introBottomLetter = document.querySelector('.ip-bottom-letter');
      const introTopTitle = introTopHeader?.querySelector('.ip-top-title');
      const introBottomTitle = introBottomLetter?.querySelector('.ip-top-title');

      // 🎯 _ipWave  intro-panel（dark-wrapper ）， display:none，
      const _ipWave = !isMobileInit ? (function () {
        const wrapper = document.getElementById('ip-wave-wrapper');
        const leftCol = wrapper.querySelector('.wave-column-left');
        const rightCol = wrapper.querySelector('.wave-column-right');
        const thumb = document.getElementById('ip-wave-thumb');
        const leftTexts = gsap.utils.toArray(leftCol.querySelectorAll('.animated-text'));
        const rightTexts = gsap.utils.toArray(rightCol.querySelectorAll('.animated-text'));
        const WAVE_NUM = 12;
        const WAVE_SPD = 1;
        let currentSrc = '';
        let _ranges = null;
        let _lastFocused = -1; // ， DOM
        let _wrapperH = 0; // 🎯 : offsetHeight, layout 
        let _initialized = false;

        const lqx = leftTexts.map(t => gsap.quickTo(t, 'x', { duration: 0.6, ease: 'power4.out' }));
        const rqx = rightTexts.map(t => gsap.quickTo(t, 'x', { duration: 0.6, ease: 'power4.out' }));

        function calcRanges() {
          const maxLW = Math.max(...leftTexts.map(t => t.offsetWidth));
          const maxRW = Math.max(...rightTexts.map(t => t.offsetWidth));
          return {
            l: { min: 0, max: Math.max(0, leftCol.offsetWidth - maxLW) },
            r: { min: 0, max: Math.max(0, rightCol.offsetWidth - maxRW) },
          };
        }

        function waveX(index, progress, range) {
          const phase = WAVE_NUM * index + WAVE_SPD * progress * Math.PI * 2 - Math.PI / 2;
          return range.min + ((Math.sin(phase) + 1) / 2) * (range.max - range.min);
        }

        function closestToCenter(progress) {
          const total = leftTexts.length;
          if (total === 0) return 0;
          let index = Math.round(progress * (total - 1));
          return Math.max(0, Math.min(total - 1, index));
        }

        function ensureInit() {
          if (_initialized) return;
          _ranges = calcRanges();
          _wrapperH = wrapper.offsetHeight; // 🎯 
          leftTexts.forEach((t, i) => gsap.set(t, { x: waveX(i, 0, _ranges.l) }));
          rightTexts.forEach((t, i) => gsap.set(t, { x: -waveX(i, 0, _ranges.r) }));
          _initialized = true;
        }
        window.addEventListener('resize', () => {
          if (!_initialized) return;
          _ranges = calcRanges();
          _wrapperH = wrapper.offsetHeight; // 🎯 resize 
        }, { passive: true });

        return {
          update(progress) {
            ensureInit();
            if (!_ranges) _ranges = calcRanges();
            if (!_wrapperH) _wrapperH = wrapper.offsetHeight;

            // 🎯 , layout thrashing
            const centerBias = winW <= 768 ? 0.36 : 0.5;
            gsap.set(wrapper, { y: _wrapperH * (centerBias - progress) });

            const focused = closestToCenter(progress);
            const focusChanged = focused !== _lastFocused;

            leftTexts.forEach((t, i) => {
              lqx[i](waveX(i, progress, _ranges.l));
              if (focusChanged) t.classList.toggle('focused', i === focused);
            });
            rightTexts.forEach((t, i) => {
              rqx[i](-waveX(i, progress, _ranges.r));
              if (focusChanged) t.classList.toggle('focused', i === focused);
            });

            if (focusChanged) {
              const src = leftTexts[focused] && leftTexts[focused].dataset.image;
              if (src && src !== currentSrc) { currentSrc = src; thumb.src = src; }
              _lastFocused = focused;
            }
          }
        };
      })() : { update() { } };
      // 🎯 ip-wave-wrapper  DOM ，
      if (!isMobileInit) (function () {
        const zhMap = {
          'Core-Site': '（）', 'Gen-AI Visual': '（ AI ）',
          'Motion Flow': '（）', 'WebGL Realm': '（WebGL ）',
          '3D Matrix': '（3D ）', 'Interaction': '（）',
          'Pixel Perfect': '（）', 'Logic Build': '（）',
          'Fluid UI': '（）', 'Aero Design': '（）',
          'Pure Code': '（）', 'Digital Art': '（）',
          'Strategy': '（）', 'Design': '（）', 'Tech': '（）',
          'Creative': '（）', 'Motion': '（）', 'Brand': '（）',
          'Future': '（）', 'Vision': '（）', 'System': '（）',
          'Labs': '（）', 'Core': '（）', 'Craft': '（）',
        };
        document.querySelectorAll('#ip-wave-wrapper .animated-text').forEach(el => {
          const en = el.textContent.trim();
          const zh = zhMap[en];
          if (!zh) return;
          el.innerHTML = '';
          const wrap = document.createElement('span');
          wrap.className = 'flip-wrap';
          const enS = document.createElement('span');
          enS.className = 'at-en'; enS.textContent = en;
          const zhS = document.createElement('span');
          zhS.className = 'at-zh'; zhS.textContent = zh;
          wrap.appendChild(enS);
          wrap.appendChild(zhS);
          el.appendChild(wrap);
        });
      })();

      let baseRotY = -45;
      let targetScrollProgress = 0;
      let currentScrollProgress = 0;
      let scrollMediaActivated = false;
      const scrollTrack = document.querySelector('.scroll-track');
      let maxScroll = 0;

      function activateScrollMediaOnce() {
        if (scrollMediaActivated) return;
        scrollMediaActivated = true;
        document.dispatchEvent(new Event('mdz:activate-scroll-media'));
      }

      function updateMaxScroll() {
        maxScroll = scrollTrack ? Math.max(0, scrollTrack.offsetHeight - winH) : 0;
      }

      function syncScrollState(jumpToCurrent = false) {
        const currentScrollY = window._lenis ? window._lenis.scroll : window.scrollY;
        const nextProgress = maxScroll > 0
          ? Math.max(0, Math.min(currentScrollY / maxScroll, 1))
          : 0;
        targetScrollProgress = nextProgress;
        if (jumpToCurrent) currentScrollProgress = nextProgress;
      }

      // 🎯 :, window 'scroll'  lenis 'scroll' 
      let _scrollSyncScheduled = false;
      function scheduleSyncScrollState() {
        if (_scrollSyncScheduled) return;
        _scrollSyncScheduled = true;
        requestAnimationFrame(() => {
          _scrollSyncScheduled = false;
          syncScrollState();
        });
      }

      window.addEventListener('scroll', scheduleSyncScrollState, { passive: true });

      window.addEventListener('pageshow', () => {
        updateMaxScroll();
        syncScrollState(true);
      });

      window.addEventListener('resize', () => {
        updateMaxScroll();
        syncScrollState(true);
      }, { passive: true });

      if (window._lenis) {
        window._lenis.on('scroll', scheduleSyncScrollState);
      }

      if (scrollTrack && 'ResizeObserver' in window) {
        const scrollTrackResizeObserver = new ResizeObserver(() => {
          updateMaxScroll();
          scheduleSyncScrollState();
        });
        scrollTrackResizeObserver.observe(scrollTrack);
      }

      updateMaxScroll();

      requestAnimationFrame(() => {
        updateMaxScroll();
        syncScrollState(true);
      });

      function easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      }

      function setDarkWrapperReveal(hiddenPercent) {
        if (winW <= 768) {
          if (darkWrapperMask) darkWrapperMask.style.height = '';
          if (darkWrapperMask) {
            darkWrapperMask.style.clipPath = '';
            darkWrapperMask.style.webkitClipPath = '';
          }
          if (darkWrapper) darkWrapper.style.clipPath = 'none';
          return;
        }
        if (darkWrapperMask) {
          const safeHiddenPercent = Math.max(0, Math.min(hiddenPercent, 100));
          const nextClip = `inset(${safeHiddenPercent}% 0 0 0)`;
          if (darkWrapperMask.style.clipPath !== nextClip) {
            darkWrapperMask.style.clipPath = nextClip;
            darkWrapperMask.style.webkitClipPath = nextClip;
          }
          return;
        }
        if (darkWrapper) {
          gsap.set(darkWrapper, { clipPath: `inset(${hiddenPercent}% 0 0 0)` });
        }
      }

      class RevealGL {
        constructor(canvas) {
          this.canvas = canvas;
          this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
          if (!this.gl) return;
          this._build();
          this._resize();
          this._resizeRaf = 0;
          window.addEventListener('resize', () => {
            if (this._resizeRaf) return;
            this._resizeRaf = requestAnimationFrame(() => {
              this._resizeRaf = 0;
              this._resize();
            });
          }, { passive: true });
        }
        _build() {
          const gl = this.gl;
          const vert = `attribute vec2 a_pos; varying vec2 vUv;
            void main(){ vUv=a_pos*0.5+0.5; gl_Position=vec4(a_pos,0.,1.); }`;
          const frag = `
            precision highp float;
            varying vec2 vUv;
            uniform float uReveal;
            uniform float uTime;
            vec3 permute(vec3 x){return mod(((x*34.)+1.)*x,289.);}
            float snoise(vec2 v){
              const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
              vec2 i=floor(v+dot(v,C.yy)), x0=v-i+dot(i,C.xx);
              vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
              vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
              i=mod(i,289.);
              vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
              vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
              m=m*m; m=m*m;
              vec3 xv=2.*fract(p*C.www)-1., h=abs(xv)-.5, ox=floor(xv+.5), a0=xv-ox;
              m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
              vec3 g; g.x=a0.x  * x0.x  + h.x  * x0.y;
              g.yz = a0.yz * x12.xz + h.yz * x12.yw;
              return 130.0 * dot(m, g);
            }
            void main(){
              float yBias = vUv.y * 0.50;
              float n = snoise(vUv*3.6 + vec2(uTime*0.08, uTime*0.05)) * 0.68
                      + snoise(vUv*7.8 + vec2(-uTime*0.06, uTime*0.12)) * 0.32;
              float thr  = uReveal * 2.8 - 1.4 + yBias;
              float edge = 0.13 + (1.0 - uReveal) * 0.05;
              float mask = smoothstep(thr - edge, thr + edge, n);
              gl_FragColor = vec4(0., 0., 0., mask);
            }`;
          const mk = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src); gl.compileShader(s); return s;
          };
          this.prog = gl.createProgram();
          gl.attachShader(this.prog, mk(gl.VERTEX_SHADER, vert));
          gl.attachShader(this.prog, mk(gl.FRAGMENT_SHADER, frag));
          gl.linkProgram(this.prog);
          const buf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
          const loc = gl.getAttribLocation(this.prog, 'a_pos');
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
          this.uReveal = gl.getUniformLocation(this.prog, 'uReveal');
          this.uTime = gl.getUniformLocation(this.prog, 'uTime');

          gl.useProgram(this.prog);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        _resize() {
          const dpr = typeof getOptimalDPR === 'function' ? getOptimalDPR() : Math.min(devicePixelRatio || 1, 2);
          const nextWidth = Math.max(1, Math.floor(this.canvas.offsetWidth * dpr));
          const nextHeight = Math.max(1, Math.floor(this.canvas.offsetHeight * dpr));
          if (this.canvas.width === nextWidth && this.canvas.height === nextHeight) return;
          this.canvas.width = nextWidth;
          this.canvas.height = nextHeight;
          if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
        render(reveal) {
          const gl = this.gl; if (!gl) return;
          gl.disable(gl.BLEND);
          gl.clearColor(0, 0, 0, reveal <= 0 ? 1 : 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          if (reveal <= 0 || reveal >= 1) return;
          gl.useProgram(this.prog);
          gl.uniform1f(this.uReveal, reveal);
          gl.uniform1f(this.uTime, performance.now() * 0.001);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
      }

      const revealCanvas = document.getElementById('ip-reveal-canvas');
      // WebGL reveal is currently opt-in. The default path uses the CSS clip-path mask above
      // because the canvas stays display:none and should not allocate a WebGL context.
      const enableIpRevealGL = revealCanvas?.dataset.revealMode === 'webgl';
      const revealGL = enableIpRevealGL
        ? new RevealGL(revealCanvas)
        : null;

      // 🎯 : progress,,
      //     gsap.set , scroll 
      let _lastAppliedProgress = -2;

      const heroBlendHintEls = Array.from(document.querySelectorAll('.overlay-ui, .huge-text, .small-tag'));
      let heroBlendHintsEnabled = true;
      const heroSectionEl = document.querySelector('.hero-section');
      let heroSectionHidden = false;

      function setHeroBlendHints(enabled) {
        if (heroBlendHintsEnabled === enabled) return;
        heroBlendHintsEnabled = enabled;
        heroBlendHintEls.forEach(el => { el.style.willChange = enabled ? 'transform' : 'auto'; });
      }

      function setHeroSectionHidden(hidden) {
        if (!heroSectionEl) return;
        if (window.innerWidth <= 767) {
          heroSectionHidden = false;
          heroSectionEl.style.visibility = '';
          return;
        }
        if (heroSectionHidden === hidden) return;
        heroSectionHidden = hidden;
        heroSectionEl.style.visibility = hidden ? 'hidden' : '';
      }

      let mobileHeroStaticReady = false;
      let _mobileWebglFrameToggle = 0;

      function updateMobileSceneSize() {
        if (!scene) return;
        const mobileSceneSize = Math.min(window.innerWidth * 0.56, 220);
        scene.style.setProperty('--scene-size', `${mobileSceneSize}px`);
        scene.style.setProperty('--scene-depth', `${mobileSceneSize / 2}px`);
      }

      function applyMobileHeroStaticState() {
        if (mobileHeroStaticReady) return;
        mobileHeroStaticReady = true;
        if (darkWrapperMask) darkWrapperMask.style.height = '';
        if (darkWrapper) darkWrapper.style.clipPath = 'none';
        if (dwBlackOverlay) gsap.set(dwBlackOverlay, { opacity: 0 });
        if (stmLogoEl) stmLogoEl.classList.remove('is-visible');
        if (section2) gsap.set(section2, { opacity: 0, pointerEvents: 'none', zIndex: 18 });
        if (newTextGroup) gsap.set(newTextGroup, { opacity: 0 });
        if (sceneWrapper) {
          gsap.set(sceneWrapper, { xPercent: -50, yPercent: -50, scale: 1, top: '50%', opacity: 1 });
        }
        updateMobileSceneSize();
      }

      window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) updateMobileSceneSize();
      }, { passive: true });

      if (winW <= 768) applyMobileHeroStaticState();

      // =========================================================
      // Gallery Header WebGL Wave Effect
      // =========================================================
      gsap.ticker.add(() => {
        const heroRenderSleeping = isHeroRenderSleeping();
        setHeroSectionHidden(heroRenderSleeping);
        setHeroBlendHints(!heroRenderSleeping);
        if (webglManager) {
          if (heroRenderSleeping) webglManager.setRenderPaused(true);
          else {
            const isMobileNow = winW <= 768;
            if (!isMobileNow || (++_mobileWebglFrameToggle & 1)) {
              webglManager.render();
            }
          }
        }

        // 🎯 Lenis , lerp 0.1 ( 0.06) 「」
        //    lerp 0.1 =  10 ,
        currentScrollProgress += (targetScrollProgress - currentScrollProgress) * 0.1;
        if (currentScrollProgress < 0.0001) currentScrollProgress = 0;

        const isMobile = winW <= 768;

        // 🎯  progress ,
        //    : 20+  gsap.set
        //    mobile scene  ticker  cube ， mobile 
        const progressDelta = Math.abs(currentScrollProgress - _lastAppliedProgress);
        const targetDelta = Math.abs(targetScrollProgress - currentScrollProgress);
        if (!isMobile && progressDelta < 0.0001 && targetDelta < 0.0001) {
          return;
        }
        _lastAppliedProgress = currentScrollProgress;

        let progress = currentScrollProgress;
        if (progress > 0.035 || targetScrollProgress > 0.035) activateScrollMediaOnce();

        const p_Reveal = 0.12;
        const p_TextIn = 0.24;
        const p_TextOut = 0.44;
        const p_Tumble = 0.60;
        const p_Spin = 0.78;
        const p_PreExit = p_Spin - 0.06;
        const p_Zoom = 1.00;
        document.documentElement.classList.remove('is-dark-wrapper-mobile-intro');

        if (isMobile) {
          applyMobileHeroStaticState();
          baseRotY += 0.25;
          if (cube) {
            cube.style.transform = `rotateX(-12deg) rotateY(${baseRotY}deg)`;
          }
          window._marqueeRAFActive = false;
          return;
        }

        // 🎯 marquee rAF  title （p_TextOut → p_Spin + buffer）
        //    zoom ， GPU 
        window._marqueeRAFActive = (progress > p_TextOut && progress < p_Zoom);
        if (window._marqueeRAFActive && typeof window._requestMarqueeRAF === 'function') {
          window._requestMarqueeRAF();
        }

        let pr_Reveal = Math.max(0, Math.min(progress / p_Reveal, 1));
        let easeReveal = easeInOutCubic(pr_Reveal);

        if (progress <= p_Reveal) {
          baseRotY += 0.4;
        }
        let targetY_Phase1 = Math.ceil(baseRotY / 360) * 360 + 360;

        let currentTop = isMobile ? 40 : 50;
        let baseSceneSize = isMobile ? 173 : 230;
        const cubeZoomScale = 0.9; //cubeZoomScale  zoom ， 0.85 ~ 0.95 
        const zoomedSceneSize = Math.min(
          winW * (isMobile ? 0.78 : 0.44) * cubeZoomScale,
          winH * (isMobile ? 0.58 : 0.72) * cubeZoomScale
        );
        let currentSceneSize = baseSceneSize;

        setDarkWrapperReveal((1 - easeReveal) * 100);

        const uiEntrance = Math.max(0, Math.min((pr_Reveal - 0.60) / 0.40, 1));
        const uiEase = easeInOutCubic(uiEntrance);

        if (uiNav) gsap.set(uiNav, { opacity: uiEase, y: (1 - uiEase) * -25 });
        if (uiScroll) gsap.set(uiScroll, { opacity: uiEase * 0.7 });

        // 🎯 ： 0 ， GPU
        if (uiGlow1) gsap.set(uiGlow1, { opacity: uiEase, scale: 0.4 + uiEase * 0.6, visibility: uiEase > 0 ? 'visible' : 'hidden' });
        if (uiGlow2) gsap.set(uiGlow2, { opacity: uiEase * 0.8, scale: 0.4 + uiEase * 0.6, visibility: uiEase > 0 ? 'visible' : 'hidden' });

        {
          const waveRp = progress <= p_Reveal
            ? Math.max(0, (pr_Reveal - 0.45) / 0.55)
            : 1.0;

          if (progress <= p_TextOut) {
            // 🎯 ：
            gsap.set(introPanel, { opacity: waveRp > 0 ? 1 : 0, visibility: waveRp > 0 ? 'visible' : 'hidden' });

            if (waveRp > 0) {
              if (revealGL) revealGL.render(waveRp);
              const panelT = progress <= p_Reveal
                ? 0
                : (progress - p_Reveal) / (p_TextOut - p_Reveal);
              const ndIn = easeInOutCubic(Math.max(0, Math.min((waveRp - 0.30) / 0.65, 1)));
              const ndOut = easeInOutCubic(Math.max(0, (panelT - 0.84) / 0.16));
              const ndOpacity = Math.max(0, ndIn * (1 - ndOut));

              if (introTopHeader) gsap.set(introTopHeader, { opacity: ndOpacity });
              if (introTopTitle) gsap.set(introTopTitle, { yPercent: (1 - ndIn) * 110 });
              if (introBottomLetter) gsap.set(introBottomLetter, { opacity: ndOpacity });
              if (introBottomTitle) gsap.set(introBottomTitle, { yPercent: (1 - ndIn) * -110 });

              const outT = easeInOutCubic(Math.max(0, (panelT - 0.83) / 0.17));
              if (outT > 0) gsap.set(introPanel, { opacity: Math.max(0, 1 - outT) });

              _ipWave.update(panelT);
            }
          } else {
            // 
            gsap.set(introPanel, { opacity: 0, visibility: 'hidden' });
            if (introTopHeader) gsap.set(introTopHeader, { opacity: 0 });
            if (introTopTitle) gsap.set(introTopTitle, { yPercent: 110 });
            if (introBottomLetter) gsap.set(introBottomLetter, { opacity: 0 });
            if (introBottomTitle) gsap.set(introBottomTitle, { yPercent: -110 });
          }
        }

        let currentScale = 0.0001;
        let currentX = -15;
        let currentY = baseRotY;

        if (progress > p_TextOut) {

          const revealTotal = p_PreExit - p_TextOut;
          const revealPr = Math.max(0, Math.min((progress - p_TextOut) / revealTotal, 1));

          // 🎯 ， GSAP 
          gsap.set(titleSubtitle, { yPercent: (1 - easeInOutCubic(Math.max(0, Math.min(revealPr / 0.40, 1)))) * 130 });
          gsap.set(titleLine1, { yPercent: (1 - easeInOutCubic(Math.max(0, Math.min((revealPr - 0.08) / 0.42, 1)))) * 130 });
          gsap.set(titleLine2, { yPercent: (1 - easeInOutCubic(Math.max(0, Math.min((revealPr - 0.18) / 0.42, 1)))) * 130 });
          gsap.set(titleMarquee, { yPercent: (1 - easeInOutCubic(Math.max(0, Math.min((revealPr - 0.08) / 0.42, 1)))) * 130 });
          gsap.set(titleDesc, { yPercent: (1 - easeInOutCubic(Math.max(0, Math.min((revealPr - 0.32) / 0.42, 1)))) * 130 });

          gsap.set(newTextGroup, { opacity: 0 });
          gsap.set(newSubtitle, { yPercent: 130 });
          gsap.set(newLine1, { yPercent: 130 });
          gsap.set(newLine2, { yPercent: 130 });
          gsap.set(newDesc, { yPercent: 130 });

          if (progress <= p_Tumble) {
            let pr = (progress - p_TextOut) / (p_Tumble - p_TextOut);
            let ease = easeInOutCubic(pr);

            currentScale = 1.5 * ease;
            currentX = -15 * (1 - ease) + 360 * ease;
            currentY = baseRotY * (1 - ease) + targetY_Phase1 * ease;

            gsap.set(section2, { opacity: 1, pointerEvents: 'none', zIndex: 18 });
            gsap.set(imgOverlay, { opacity: 0 });
            gsap.set(faceFront, { boxShadow: 'inset 0 0 40px rgba(0,0,0,1)', border: '1px solid rgba(255,255,255,0.05)' });

          } else if (progress <= p_Spin) {
            let pr = (progress - p_Tumble) / (p_Spin - p_Tumble);
            let ease = easeInOutCubic(pr);

            currentScale = 1.5;
            currentX = 360;
            currentY = targetY_Phase1 + 360 * ease;

            gsap.set(section2, { opacity: 1, pointerEvents: 'none', zIndex: 18 });
            gsap.set(imgOverlay, { opacity: 0 });
            gsap.set(faceFront, { boxShadow: 'inset 0 0 40px rgba(0,0,0,1)', border: '1px solid rgba(255,255,255,0.05)' });

          } else {
            let pr = (progress - p_Spin) / (p_Zoom - p_Spin);
            let ease = easeInOutCubic(pr);

            const spinDisplaySize = baseSceneSize * 1.5;
            const targetSceneSize = zoomedSceneSize;
            currentSceneSize = spinDisplaySize + (targetSceneSize - spinDisplaySize) * ease;
            currentScale = 1;
            currentX = 360;
            currentY = targetY_Phase1 + 360;

            const titleExitPr = Math.max(0, Math.min(ease, 1));
            const titleExitEase = easeInOutCubic(titleExitPr);

            gsap.set(section2, { opacity: Math.max(0, 1 - titleExitEase), pointerEvents: 'none', zIndex: 18 });
            gsap.set(imgOverlay, { opacity: ease * 0 });
            gsap.set(faceFront, {
              boxShadow: `inset 0 0 ${40 * (1 - ease)}px rgba(0,0,0,1)`,
              border: `1px solid rgba(255,255,255,${0.05 * (1 - ease)})`
            });

            if (dwBlackOverlay) gsap.set(dwBlackOverlay, { opacity: ease });
            if (stmLogoEl) stmLogoEl.classList.remove('is-visible');

            gsap.set(titleDesc, { yPercent: -easeInOutCubic(Math.min(titleExitPr, 1)) * 130 });
            gsap.set(titleLine2, { yPercent: -easeInOutCubic(Math.max(0, Math.min((titleExitPr - 0.10) / 0.90, 1))) * 130 });
            gsap.set(titleLine1, { yPercent: -easeInOutCubic(Math.max(0, Math.min((titleExitPr - 0.20) / 0.80, 1))) * 130 });
            gsap.set(titleMarquee, { yPercent: -easeInOutCubic(Math.max(0, Math.min((titleExitPr - 0.10) / 0.90, 1))) * 130 });
            gsap.set(titleSubtitle, { yPercent: -easeInOutCubic(Math.max(0, Math.min((titleExitPr - 0.30) / 0.70, 1))) * 130 });

            gsap.set(newTextGroup, { opacity: titleExitPr > 0 ? 1 : 0 });
            const enterPr = Math.max(0, Math.min(titleExitPr / 0.70, 1));
            gsap.set(newSubtitle, { yPercent: (1 - easeInOutCubic(Math.min(enterPr / 0.60, 1))) * 130 });
            gsap.set(newLine1, { yPercent: (1 - easeInOutCubic(Math.max(0, Math.min((enterPr - 0.10) / 0.60, 1)))) * 130 });
            gsap.set(newLine2, { yPercent: (1 - easeInOutCubic(Math.max(0, Math.min((enterPr - 0.20) / 0.60, 1)))) * 130 });
            gsap.set(newDesc, { yPercent: (1 - easeInOutCubic(Math.max(0, Math.min((enterPr - 0.35) / 0.55, 1)))) * 130 });
          }

        } else if (progress > p_Zoom) {
          const targetSceneSize = zoomedSceneSize;
          currentSceneSize = targetSceneSize;
          currentScale = 1;
          currentX = 360;
          currentY = targetY_Phase1 + 360;

          gsap.set(section2, { opacity: 0, pointerEvents: 'none', zIndex: 18 });
          gsap.set(imgOverlay, { opacity: 0 });

          if (dwBlackOverlay) gsap.set(dwBlackOverlay, { opacity: 1 });
          if (stmLogoEl) stmLogoEl.classList.remove('is-visible');

          gsap.set(newTextGroup, { opacity: 1 });
          gsap.set([titleDesc, titleLine2, titleLine1, titleMarquee, titleSubtitle], { yPercent: -130 });
        } else {
          currentScale = 0.0001;

          gsap.set(section2, { opacity: 0, pointerEvents: 'none', zIndex: 22 });
          gsap.set(imgOverlay, { opacity: 0 });

          if (dwBlackOverlay) gsap.set(dwBlackOverlay, { opacity: 0 });
          if (stmLogoEl) stmLogoEl.classList.remove('is-visible');
          gsap.set(newTextGroup, { opacity: 0 });

          resetReveal();
        }

        gsap.set(scene, {
          '--scene-size': `${currentSceneSize}px`,
          '--scene-depth': `${currentSceneSize / 2}px`
        });

        gsap.set(cube, {
          rotationX: currentX,
          rotationY: currentY,
          rotationZ: 0
        });

        gsap.set(sceneWrapper, {
          xPercent: -50,
          yPercent: -50,
          scale: currentScale,
          top: `${currentTop}%`
        });

        if (stmLogoEl && progress <= p_TextOut) {
          stmLogoEl.classList.remove('is-visible');
        }
      });

      gsap.registerPlugin(ScrollTrigger);
      // Flip / ScrambleTextPlugin：，（ library）
      if (typeof Flip !== 'undefined') gsap.registerPlugin(Flip);
      if (typeof ScrambleTextPlugin !== 'undefined') gsap.registerPlugin(ScrambleTextPlugin);

      // 🎯 ScrollTrigger :
      //   - limitCallbacks:  callback , CPU 
      //   - ignoreMobileResize:  URL bar 
      ScrollTrigger.config({
        limitCallbacks: true,
        ignoreMobileResize: true,
      });

      // 🎯 ， paint
      var _ric = typeof requestIdleCallback === 'function' ? requestIdleCallback : function (cb) { setTimeout(cb, 200); };

      function runWhenNear(target, callback, rootMargin = '1600px 0px') {
        let didRun = false;
        const run = () => {
          if (didRun) return;
          didRun = true;
          callback();
        };

        if (!target || !('IntersectionObserver' in window)) {
          _ric(run);
          return;
        }

        const observer = new IntersectionObserver((entries) => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          observer.disconnect();
          _ric(run);
        }, { rootMargin });
        observer.observe(target);
      }

      runWhenNear(document.getElementById('stm-section'), function () {
        if (isMobileInit) return; //  stm-section display:none，
        _ric(function () {
          (function initSTM() {
            const stmSection = document.getElementById('stm-section');
            if (!stmSection) return;
            //  plugin ；
            if (typeof Flip !== 'undefined') gsap.registerPlugin(Flip);
            if (typeof ScrambleTextPlugin !== 'undefined') gsap.registerPlugin(ScrambleTextPlugin);
            const stmLogo = document.getElementById('stmLogo');
            const stmEls = stmSection.querySelectorAll('.stm-el');

            stmEls.forEach(el => { el.dataset.text = el.textContent; });

            const scrambleChars = 'upperAndLowerCase';
            function stmScramble(el) {
              const text = el.dataset.text ?? el.textContent;
              const dur = el.dataset.stmScramble !== undefined ? parseFloat(el.dataset.stmScramble) : 1;
              gsap.killTweensOf(el);
              gsap.fromTo(el,
                { scrambleText: { text: '', chars: '' } },
                { scrambleText: { text, chars: scrambleChars, revealDelay: 0 }, duration: dur }
              );
            }

            stmEls.forEach(el => {
              ScrollTrigger.create({
                id: 'stm-scramble',
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                onEnter: () => stmScramble(el),
                onEnterBack: () => stmScramble(el),
              });
            });

            stmEls.forEach(el => {
              const originalClass = [...el.classList].find(c => c.startsWith('stm-pos-'));
              const targetClass = el.dataset.stmAlt;
              if (!originalClass || !targetClass) return;
              const flipEase = el.dataset.stmFlipEase || 'expo.inOut';

              el.classList.add(targetClass);
              el.classList.remove(originalClass);
              const flipState = Flip.getState(el, { props: 'opacity, filter, width' });
              el.classList.add(originalClass);
              el.classList.remove(targetClass);

              Flip.to(flipState, {
                ease: flipEase,
                scrollTrigger: { trigger: el, start: 'clamp(bottom bottom-=10%)', end: 'clamp(center center)', scrub: true }
              });
              Flip.from(flipState, {
                ease: flipEase,
                scrollTrigger: { trigger: el, start: 'clamp(center center)', end: 'clamp(top top)', scrub: true }
              });
            });
          })();
        });
      }, '2200px 0px'); // end lazy initSTM

      runWhenNear(document.querySelector('.gallery-header'), function () {
        _ric(function () {
          (function initMaskedReveal() {
            document.querySelectorAll('[data-reveal]').forEach(function (el) {
              var type = el.dataset.reveal || 'line';
              var delay = parseFloat(el.dataset.revealDelay || 0);
              var stagger = parseFloat(el.dataset.revealStagger || 0.08);
              var alreadyPastStart = el.getBoundingClientRect().top <= window.innerHeight * 0.85;
              var targets = [];

              if (type === 'word' || type === 'line') {
                var text = el.innerText.trim();
                var words = text.split(/\s+/);
                el.innerHTML = '';
                words.forEach(function (w, i) {
                  var wrap = document.createElement('span');
                  wrap.style.cssText = 'display:inline-block;overflow:clip;vertical-align:bottom;';
                  var inner = document.createElement('span');
                  inner.style.cssText = 'display:inline-block;';
                  inner.textContent = w + (i < words.length - 1 ? '\u00A0' : '');
                  wrap.appendChild(inner);
                  el.appendChild(wrap);
                  targets.push(inner);
                });
              } else {
                if (alreadyPastStart) {
                  gsap.set(el, { autoAlpha: 1, y: 0 });
                  return;
                }

                gsap.set(el, { autoAlpha: 0, y: 28 });
                gsap.to(el, {
                  autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out',
                  delay: delay,
                  scrollTrigger: { trigger: el, start: 'top 85%', once: true }
                });
                return;
              }

              if (alreadyPastStart) {
                gsap.set(targets, { yPercent: 0 });
                return;
              }

              gsap.set(targets, { yPercent: 130 });
              gsap.to(targets, {
                yPercent: 0,
                duration: 1.2,
                ease: 'power4.out',
                stagger: stagger,
                delay: delay,
                scrollTrigger: { trigger: el, start: 'top 85%', once: true }
              });
            });
          })();
        });
      }, '1800px 0px'); // end lazy initMaskedReveal

      runWhenNear(document.querySelector('.gallery-header'), function () {
        _ric(function () {
          (function initGalleryHeader() {
            const header = document.querySelector('.gallery-header');
            if (!header) return;
            const lastItem = document.querySelector('.pg-item-6') || document.querySelector('.pg-item-5');
            if (!lastItem) return;

            // ──  ──
            const textLastItem = document.querySelector('.pg-item-5') || lastItem;
            let wordSpans = header.querySelectorAll('.gh-line span span');
            if (!wordSpans.length) wordSpans = header.querySelectorAll('.gh-line');
            const label = header.querySelector('.gallery-header-label');
            const sub = header.querySelector('.gallery-header-sub');
            const sideRails = header.querySelectorAll('.gh-side-rail');
            const sideLines = header.querySelectorAll('.gh-side-line');
            const sideLetters = header.querySelectorAll('.gh-side-letter');

            const exitTl = gsap.timeline({
              scrollTrigger: {
                trigger: textLastItem,
                start: 'bottom 65%',
                end: 'bottom 5%',
                scrub: 1.2,
              }
            });

            if (wordSpans.length) {
              exitTl.to(wordSpans, { yPercent: -130, ease: 'power2.in', stagger: { each: 0.04, from: 'start' } }, 0);
            }
            if (label) exitTl.to(label, { autoAlpha: 0, y: -15, ease: 'power2.in' }, 0);
            if (sub) exitTl.to(sub, { autoAlpha: 0, y: -15, ease: 'power2.in' }, 0.05);
            if (sideLines.length) exitTl.to(sideLines, { scaleX: 0.35, opacity: 0, ease: 'power2.in' }, 0);
            if (sideLetters.length) exitTl.to(sideLetters, { autoAlpha: 0, ease: 'power2.in' }, 0);
            if (sideRails.length) {
              exitTl.to(sideRails[0], { x: 44, ease: 'power2.in' }, 0);
              exitTl.to(sideRails[1], { x: -44, ease: 'power2.in' }, 0);
            }
          })();
        });
      }, '1800px 0px'); // end lazy initGalleryHeader

      // ★  macro-task， DXM pin spacer  + ScrollTrigger.refresh() 
      //    pg-item ScrollTriggers， pin  trigger 
      runWhenNear(document.querySelector('.pg-gallery') || document.querySelector('.gallery-header'), function () {
        setTimeout(function initPgItems() {
          // ★  GSAP ，「→」（ CSS  html.pg-anim-ready）。
          //    gsap （LINE  CDN ），，。
          if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
          document.documentElement.classList.add('pg-anim-ready');

          // ── core-capabilities （ refresh  trigger ）──
          const ccapSection = document.getElementById('core-capabilities');
          /* .gh-vline  DXM  */
          const headerEl = document.querySelector('.gallery-header');
          const sideRails = headerEl ? headerEl.querySelectorAll('.gh-side-rail') : [];
          const sideLines = headerEl ? headerEl.querySelectorAll('.gh-side-line') : [];
          const sideLetters = headerEl ? headerEl.querySelectorAll('.gh-side-letter') : [];



          if (sideRails.length) {
            gsap.set(sideRails[0], { x: 44, autoAlpha: 0 });
            gsap.set(sideRails[1], { x: -44, autoAlpha: 0 });
          }
          if (sideLines.length) gsap.set(sideLines, { scaleX: 0, opacity: 0.24 });
          if (sideLetters.length) gsap.set(sideLetters, { autoAlpha: 0 });

          if (sideRails.length || sideLines.length || sideLetters.length) {
            const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;
            if (headerRect && headerRect.bottom < window.innerHeight * 0.5) {
              if (sideRails.length) gsap.set(sideRails, { x: 0, autoAlpha: 1 });
              if (sideLines.length) gsap.set(sideLines, { scaleX: 1, opacity: 1 });
              if (sideLetters.length) gsap.set(sideLetters, { autoAlpha: 1 });
            } else if (headerEl) {
              ScrollTrigger.create({
                trigger: headerEl,
                start: 'top center',
                once: true,
                onEnter: () => {
                  const headerIntroTl = gsap.timeline();
                  if (sideRails.length) {
                    headerIntroTl.to(sideRails[0], {
                      x: 0,
                      autoAlpha: 1,
                      duration: 1.05,
                      ease: 'power3.out'
                    }, 0.18);
                    headerIntroTl.to(sideRails[1], {
                      x: 0,
                      autoAlpha: 1,
                      duration: 1.05,
                      ease: 'power3.out'
                    }, 0.18);
                  }
                  if (sideLines.length) {
                    headerIntroTl.to(sideLines, {
                      scaleX: 1,
                      opacity: 1,
                      duration: 0.95,
                      ease: 'power3.out',
                      stagger: 0.06
                    }, 0.28);
                  }
                  if (sideLetters.length) {
                    headerIntroTl.to(sideLetters, {
                      autoAlpha: 1,
                      duration: 0.72,
                      ease: 'power2.out',
                      stagger: 0.05
                    }, 0.22);
                  }
                }
              });
            }
          }

          document.querySelectorAll('.pg-item').forEach((item, i) => {
            const wrap = item.querySelector('.pg-img-wrap');
            const media = item.querySelector('.pg-img-wrap img') || item.querySelector('.pg-img-wrap video');
            const isVideo = media && media.tagName === 'VIDEO';

            //  viewport （ pg-item-1），，
            const rect = item.getBoundingClientRect();
            const alreadyVisible = rect.top < window.innerHeight * 0.9;

            if (wrap) gsap.set(wrap, { clipPath: alreadyVisible ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)' });
            if (media && !isVideo) gsap.set(media, { scale: alreadyVisible ? 0.9 : 1.3 });

            const enterTl = gsap.timeline({
              scrollTrigger: {
                trigger: item,
                start: 'top 90%',
                toggleActions: 'play none none reverse'
              }
            });

            if (wrap) {
              enterTl.to(wrap, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'expo.out' }, 0);
            }
            if (media && !isVideo) {
              enterTl.to(media, { scale: 1.0, duration: 1.0, ease: 'power3.out' }, 0);
            }

            if (media && !isVideo) {
              const speed = [12, 18, 10, 20, 15, 22][i % 6];
              gsap.fromTo(media,
                { yPercent: -speed },
                {
                  yPercent: speed,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: item,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.2
                  }
                }
              );
              if (!isMobileInit) {
                item.addEventListener('mouseenter', () =>
                  gsap.to(media, { scale: 1.0, duration: 0.8, ease: 'power2.out', overwrite: 'auto' })
                );
                item.addEventListener('mouseleave', () =>
                  gsap.to(media, { scale: 1.0, duration: 1.2, ease: 'expo.out', overwrite: 'auto' })
                );
              }
            }
          });
          //  pg-item triggers  refresh，
          if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();

          // ── ：pg-item  vw 、 position:absolute ，
          //   ， load  refresh（ scrub  snap、）。

          // ★ LINE ：。 ScrollTrigger 
          //    reveal（ inset(100%) ），，。
          const pgRevealStuck = () => {
            document.querySelectorAll('.pg-gallery .pg-item').forEach((item) => {
              const wrap = item.querySelector('.pg-img-wrap');
              if (!wrap) return;
              const rect = item.getBoundingClientRect();
              const inView = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
              const clipped = (getComputedStyle(wrap).clipPath || '').indexOf('100%') !== -1;
              if (inView && clipped) gsap.set(wrap, { clipPath: 'inset(0% 0% 0% 0%)' });
            });
          };
          setTimeout(pgRevealStuck, 1500);
          setTimeout(pgRevealStuck, 4000);
          window.addEventListener('load', () => setTimeout(pgRevealStuck, 600), { once: true });
        }, 0);
      }, '2200px 0px');

      // =========================================================
      // pg-item Hover Copy Effect (AWW-style float reveal)
      // =========================================================
      (function initPgHoverStories() {
        document.querySelectorAll('.pg-gallery .pg-item').forEach((item) => {
          item.classList.remove('pg-item--hover-story', 'is-hovered');
        });
        document.querySelectorAll('.pg-gallery .pg-hover-copy').forEach((overlay) => overlay.remove());
      })();

      const _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const _useNativeTouchScroll = window.matchMedia('(hover: none), (pointer: coarse)').matches;

      // 🎯  Lenis， ScrollTrigger
      window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => { });
      }

      if (typeof Lenis !== 'undefined' && !_useNativeTouchScroll) {

        // 🎯 ：
        //   -  lerp （ duration ），「」
        //   - lerp 0.09： 9%，~12 ，
        //   - wheelMultiplier 1.0：，
        //   - touchMultiplier 1.5：，
        const lenis = new Lenis({
          lerp: _prefersReducedMotion ? 1 : 0.09,
          smoothWheel: !_prefersReducedMotion,
          wheelMultiplier: 1.0,
          touchMultiplier: 1.5,
          syncTouch: false,
          infinite: false,
          //  Lenis 1.0.42  fallback（lerp ）
          duration: 1.0,
          easing: t => 1 - Math.pow(1 - t, 3),
        });
        lenis.on('scroll', ScrollTrigger.update);
        lenis.on('scroll', scheduleSyncScrollState);

        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        window._lenis = lenis;

        // 🎯 ,Lenis  rAF ,「」
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && window._lenis) {
            // , velocity
            window._lenis.scrollTo(window._lenis.scroll, { immediate: true, force: true });
          }
        });

        // 🎯  (href="#xxx")  Lenis, Lenis 
        document.addEventListener('click', (e) => {
          const a = e.target.closest('a[href^="#"]');
          if (!a) return;
          const href = a.getAttribute('href');
          if (!href || href === '#' || href.length < 2) return;
          const target = document.querySelector(href);
          if (!target) return;
          e.preventDefault();
          window._lenis.scrollTo(target, { duration: 1.4, offset: 0 });
        }, { passive: false });
      } else {
        window._lenis = null;
      }

      let currentVelocity = 0;
      const isMobileHomeNav = () => window.innerWidth <= 767;
      const isSimpleTouchNavMode = () => window.innerWidth <= 1024;

      // scroll > 300px →  #nav， #nav_scroll
      let _showingScrollNav = false;
      const navScrollContainer = document.getElementById('nav_scroll_container');
      const navScrollEl = document.getElementById('nav_scroll');
      const navScrollMenuBtn = document.getElementById('nav-scroll-menu-btn');
      const navScrollDropdown = document.getElementById('nav-scroll-dropdown');
      const navScrollDropdownContent = document.getElementById('nav-scroll-dropdown-content');
      const navScrollDropdownItems = navScrollDropdown
        ? navScrollDropdown.querySelectorAll('.ns-dropdown__item, .ns-social-link')
        : [];
      const navScrollLinks = navScrollDropdown
        ? navScrollDropdown.querySelectorAll('a')
        : [];
      const navShowcaseRows = navScrollDropdown
        ? navScrollDropdown.querySelectorAll('.ns-showcase-row')
        : [];
      const navShowcaseThumbs = navScrollDropdown
        ? navScrollDropdown.querySelectorAll('.ns-showcase-row__thumb')
        : [];
      const navShowcaseThumbImages = navScrollDropdown
        ? navScrollDropdown.querySelectorAll('.ns-showcase-row__thumb img')
        : [];
      let isNavScrollMenuOpen = false;
      let navScrollMenuAnimating = false;
      let navScrollMenuTl = null;
      let navScrollMenuCloseTl = null;
      let navScrollHoverCloseTimer = null;
      let navScrollBlendFadeTimer = null;
      let activeNavShowcaseRow = null;
      const navRowHoverTimelines = new Map();
      const NAV_SCROLL_CLOSED_HEIGHT = 64;
      const NAV_SCROLL_COLLAPSED_HEIGHT = 4;
      const NAV_SCROLL_CLOSED_RADIUS = 6;
      const NAV_SCROLL_LINE_RADIUS = 999;
      const NAV_SCROLL_CLOSED_BG = '#f4efe6';
      const NAV_SCROLL_OPEN_BG = '#FDFAF6';
      const NAV_SCROLL_THUMB_IDLE_SCALE = 1.3;
      const NAV_SCROLL_TITLE_SHIFT = 104;
      const NAV_SCROLL_HOVER_TRACK_SHIFT = 26;
      const NAV_SCROLL_HOVER_INDEX_SHIFT = 9;

      function clearNavScrollBlend() {
        if (!navScrollContainer) return;
        if (navScrollBlendFadeTimer) {
          clearTimeout(navScrollBlendFadeTimer);
          navScrollBlendFadeTimer = null;
        }
        navScrollContainer.classList.remove('is-blend-fadeout');
      }

      function activateNavScrollBlend() {
        if (!navScrollContainer) return;
        clearNavScrollBlend();
      }

      function releaseNavScrollBlend() {
        if (!navScrollContainer) return;
        clearNavScrollBlend();
        navScrollContainer.classList.add('is-blend-fadeout');
        navScrollBlendFadeTimer = setTimeout(() => {
          navScrollContainer.classList.remove('is-blend-fadeout');
          navScrollBlendFadeTimer = null;
        }, 260);
      }

      function stopNavScrollCloseTimeline() {
        if (!navScrollMenuCloseTl) return;
        navScrollMenuCloseTl.kill();
        navScrollMenuCloseTl = null;
      }

      function syncNavScrollMenuCursorLabel() {
        if (!navScrollMenuBtn) return;
        const isMenuOpen = navScrollMenuBtn.getAttribute('aria-expanded') === 'true';
        const cursorLabel = isMenuOpen ? 'CLOSE' : 'OPEN';
        const cursorSide = isMenuOpen ? 'left' : 'right';
        navScrollMenuBtn.dataset.cursor = cursorLabel;
        navScrollMenuBtn.dataset.cursorSide = cursorSide;

        const cursorRing = document.getElementById('cursor-ring');
        if (cursorRing && navScrollMenuBtn.matches(':hover')) {
          cursorRing.setAttribute('data-cursor-label', cursorLabel);
          cursorRing.setAttribute('data-cursor-side', cursorSide);
        }
      }

      function finalizeNavScrollClosedState() {
        navScrollMenuAnimating = false;
        stopNavScrollCloseTimeline();
        navScrollContainer?.classList.remove('is-menu-open', 'is-menu-animating');
        navScrollDropdown.style.pointerEvents = 'none';
        navScrollMenuBtn?.setAttribute('aria-expanded', 'false');
        syncNavScrollMenuCursorLabel();
        navScrollDropdown.setAttribute('aria-hidden', 'true');
        setNavScrollShellState('closed');
        releaseNavScrollBlend();
        setNavScrollPointerState();
      }

      function getNavScrollClosedWidth() {
        const inset = window.innerWidth <= 767 ? 24 : 80;
        return Math.min(500, Math.max(280, window.innerWidth - inset));
      }

      function getNavScrollClosedTop() {
        return window.innerWidth <= 767 ? 16 : 30;
      }

      function getNavScrollCollapsedTop() {
        return getNavScrollClosedTop() + ((NAV_SCROLL_CLOSED_HEIGHT - NAV_SCROLL_COLLAPSED_HEIGHT) / 2);
      }

      function getNavScrollOpenWidth() {
        return window.innerWidth;
      }

      function getNavScrollOpenRadius() {
        return 0;
      }

      function getNavScrollOpenHeight() {
        return window.innerHeight;
      }

      function setActiveNavShowcaseRow(row = null) {
        if (isSimpleTouchNavMode()) {
          activeNavShowcaseRow = null;
          navShowcaseRows.forEach((item) => {
            item.classList.remove('is-previewed');
          });
          return;
        }
        activeNavShowcaseRow = row;
        navShowcaseRows.forEach((item) => {
          item.classList.toggle('is-previewed', item === row);
        });
      }

      function getNavShowcaseThumbHiddenClip(target) {
        return target.classList.contains('is-right')
          ? 'inset(0% 100% 0% 0%)'
          : 'inset(0% 0% 0% 100%)';
      }

      function getNavShowcaseThumbTargets(row = null) {
        const thumbs = row
          ? Array.from(row.querySelectorAll('.ns-showcase-row__thumb'))
          : Array.from(navShowcaseThumbs);
        const images = row
          ? thumbs.map((thumb) => thumb.querySelector('img')).filter(Boolean)
          : Array.from(navShowcaseThumbImages);
        return { thumbs, images };
      }

      function getNavShowcaseTitleTargets(row = null) {
        const track = row ? row.querySelector('.ns-showcase-row__title-track') : null;
        const primary = row ? row.querySelector('.ns-showcase-row__title-layer.is-primary') : null;
        const accent = row ? row.querySelector('.ns-showcase-row__title-layer.is-accent') : null;
        const indexEl = row ? row.querySelector('.ns-showcase-row__index') : null;
        return { track, primary, accent, indexEl };
      }

      function hydrateNavShowcaseImages(scope = navScrollDropdown) {
        if (!scope) return;
        scope.querySelectorAll('img[data-nav-src]').forEach((img) => {
          img.src = img.dataset.navSrc;
          img.removeAttribute('data-nav-src');
        });
      }

      function setNavShowcaseThumbsHidden(row = null) {
        if (typeof gsap === 'undefined') return;
        const { thumbs, images } = getNavShowcaseThumbTargets(row);
        if (!thumbs.length) return;
        gsap.set(thumbs, {
          autoAlpha: 0,
          clipPath: (_, target) => getNavShowcaseThumbHiddenClip(target)
        });
        if (images.length) gsap.set(images, { scale: NAV_SCROLL_THUMB_IDLE_SCALE });
      }

      function resetNavShowcaseHoverState(row = null) {
        if (!row) {
          navShowcaseRows.forEach((item) => resetNavShowcaseHoverState(item));
          setActiveNavShowcaseRow(null);
          return;
        }

        const timeline = navRowHoverTimelines.get(row);
        if (timeline) {
          timeline.pause(0);
        } else {
          setNavShowcaseThumbsHidden(row);
        }

        const { track, primary, accent, indexEl } = getNavShowcaseTitleTargets(row);
        if (typeof gsap !== 'undefined') {
          if (track) gsap.set(track, { x: 0 });
          if (primary) gsap.set(primary, { yPercent: 0 });
          if (accent) gsap.set(accent, { yPercent: NAV_SCROLL_TITLE_SHIFT });
          if (indexEl) gsap.set(indexEl, { x: 0, color: '' });
          gsap.set(row, { clearProps: 'backgroundColor' });
        }
      }

      function initNavShowcaseHoverTimelines() {
        if (typeof gsap === 'undefined') return;

        navShowcaseRows.forEach((row) => {
          if (navRowHoverTimelines.has(row)) return;

          const { thumbs, images } = getNavShowcaseThumbTargets(row);
          const { track, primary, accent, indexEl } = getNavShowcaseTitleTargets(row);

          if (!thumbs.length || !track || !primary || !accent) return;

          gsap.set(thumbs, {
            autoAlpha: 0,
            clipPath: (_, target) => getNavShowcaseThumbHiddenClip(target)
          });
          if (images.length) gsap.set(images, { scale: NAV_SCROLL_THUMB_IDLE_SCALE });
          gsap.set(track, { x: 0 });
          gsap.set(primary, { yPercent: 0 });
          gsap.set(accent, { yPercent: NAV_SCROLL_TITLE_SHIFT });
          if (indexEl) gsap.set(indexEl, { x: 0 });

          const tl = gsap.timeline({
            paused: true,
            defaults: { overwrite: 'auto' },
            onStart: () => {
              setActiveNavShowcaseRow(row);
            },
            onReverseComplete: () => {
              if (activeNavShowcaseRow === row) {
                setActiveNavShowcaseRow(null);
              }
            }
          });

          tl.to(thumbs, {
            autoAlpha: 1,
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.42,
            ease: 'expo.out',
            stagger: 0.025
          }, 0);
          if (images.length) {
            tl.to(images, {
              scale: 1,
              duration: 0.46,
              ease: 'expo.out',
              stagger: 0.025
            }, 0.02);
          }
          tl.to(primary, {
            yPercent: -NAV_SCROLL_TITLE_SHIFT,
            duration: 0.46,
            ease: 'expo.out'
          }, 0.02)
            .to(accent, {
              yPercent: 0,
              duration: 0.46,
              ease: 'expo.out'
            }, 0.02);

          if (indexEl) {
            tl.to(indexEl, {
              color: 'rgba(23, 20, 17, 0.55)',
              duration: 0.38,
              ease: 'expo.out'
            }, 0.04);
          }

          navRowHoverTimelines.set(row, tl);
        });
      }

      function hideNavScrollPreview(row = activeNavShowcaseRow, immediate = false) {
        if (typeof gsap === 'undefined') return;
        if (navScrollHoverCloseTimer) {
          clearTimeout(navScrollHoverCloseTimer);
          navScrollHoverCloseTimer = null;
        }

        if (isSimpleTouchNavMode()) {
          resetNavShowcaseHoverState(row || null);
          return;
        }

        if (!row) {
          resetNavShowcaseHoverState();
          return;
        }

        const timeline = navRowHoverTimelines.get(row);
        if (!timeline) {
          resetNavShowcaseHoverState(row);
          return;
        }

        if (immediate || isSimpleTouchNavMode()) {
          resetNavShowcaseHoverState(row);
        } else {
          timeline.timeScale(1.8).reverse();
        }
      }

      function showNavScrollPreview(row) {
        if (!row || typeof gsap === 'undefined') return;
        if (isSimpleTouchNavMode() || !isNavScrollMenuOpen) return;
        hydrateNavShowcaseImages(row);

        if (navScrollHoverCloseTimer) {
          clearTimeout(navScrollHoverCloseTimer);
          navScrollHoverCloseTimer = null;
        }

        if (activeNavShowcaseRow && activeNavShowcaseRow !== row) {
          const previousTimeline = navRowHoverTimelines.get(activeNavShowcaseRow);
          previousTimeline?.timeScale(1.6).reverse();
        }

        setActiveNavShowcaseRow(row);
        const timeline = navRowHoverTimelines.get(row);
        if (!timeline) return;
        timeline.timeScale(1).play();
      }

      function scheduleHideNavScrollPreview(row = activeNavShowcaseRow) {
        if (navScrollHoverCloseTimer) clearTimeout(navScrollHoverCloseTimer);
        navScrollHoverCloseTimer = setTimeout(() => {
          hideNavScrollPreview(row);
          navScrollHoverCloseTimer = null;
        }, 110);
      }

      function setNavScrollShellState(state = 'closed') {
        if (!navScrollContainer || !navScrollDropdown || typeof gsap === 'undefined') return;

        if (state === 'open') {
          gsap.set(navScrollContainer, {
            top: 0,
            width: getNavScrollOpenWidth(),
            height: getNavScrollOpenHeight(),
            borderRadius: getNavScrollOpenRadius(),
            backgroundColor: NAV_SCROLL_OPEN_BG
          });
          gsap.set(navScrollDropdown, { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', filter: 'blur(0px)' });
          if (navScrollDropdownItems.length) gsap.set(navScrollDropdownItems, { y: 0, opacity: 1, filter: 'blur(0px)' });
          return;
        }

        gsap.set(navScrollContainer, {
          top: getNavScrollClosedTop(),
          width: getNavScrollClosedWidth(),
          height: NAV_SCROLL_CLOSED_HEIGHT,
          borderRadius: NAV_SCROLL_CLOSED_RADIUS,
          backgroundColor: NAV_SCROLL_CLOSED_BG
        });
        gsap.set(navScrollDropdown, { opacity: 0, y: 24, clipPath: 'inset(6% 0% 0% 0%)', filter: 'blur(12px)' });
        if (navScrollDropdownItems.length) gsap.set(navScrollDropdownItems, { y: 34, opacity: 0, filter: 'blur(14px)' });
        resetNavShowcaseHoverState();
      }

      function setNavScrollPointerState() {
        if (!navScrollContainer) return;
        const isInteractive = isMobileHomeNav() || _showingScrollNav || isNavScrollMenuOpen;
        navScrollContainer.style.pointerEvents = isInteractive ? 'auto' : 'none';
        if (isInteractive) {
          navScrollContainer.removeAttribute('inert');
        } else {
          if (navScrollContainer.contains(document.activeElement)) {
            document.activeElement?.blur?.();
          }
          navScrollContainer.setAttribute('inert', '');
        }
      }

      function initNavScrollMenu() {
        if (!navScrollContainer || !navScrollDropdown || !navScrollDropdownContent || typeof gsap === 'undefined') return;

        setNavScrollShellState('closed');
        syncNavScrollMenuCursorLabel();
        initNavShowcaseHoverTimelines();
        resetNavShowcaseHoverState();
        stopNavScrollCloseTimeline();

        if (isMobileHomeNav()) {
          _showingScrollNav = true;
          document.documentElement.classList.add('show-nav-scroll');
          navScrollContainer.classList.remove('ns-enter', 'ns-exit');
          setNavScrollPointerState();
        }

        navScrollMenuTl = gsap.timeline({
          paused: true,
          defaults: { ease: 'expo.inOut' },
          onStart: () => {
            stopNavScrollCloseTimeline();
            navScrollMenuAnimating = true;
            navScrollDropdown.style.pointerEvents = 'auto';
            navScrollContainer?.classList.add('is-menu-open', 'is-menu-animating');
            activateNavScrollBlend();
            navScrollMenuBtn?.setAttribute('aria-expanded', 'true');
            syncNavScrollMenuCursorLabel();
            navScrollDropdown.setAttribute('aria-hidden', 'false');
            setNavScrollPointerState();
          },
          onComplete: () => {
            navScrollMenuAnimating = false;
            navScrollContainer?.classList.remove('is-menu-animating');
          },
          onReverseComplete: () => {
            finalizeNavScrollClosedState();
          }
        });

        navScrollMenuTl
          .to(navScrollContainer, {
            top: () => getNavScrollCollapsedTop(),
            height: NAV_SCROLL_COLLAPSED_HEIGHT,
            borderRadius: NAV_SCROLL_LINE_RADIUS,
            duration: 0.2,
            ease: 'power3.inOut'
          }, 0)
          .to(navScrollContainer, {
            width: () => getNavScrollOpenWidth(),
            duration: 0.25,
            ease: 'power3.inOut'
          }, 0.1)
          .to(navScrollContainer, {
            top: 0,
            height: () => getNavScrollOpenHeight(),
            borderRadius: () => getNavScrollOpenRadius(),
            backgroundColor: NAV_SCROLL_OPEN_BG,
            duration: 0.35,
            ease: 'power3.inOut'
          }, 0.3)
          .to(navScrollDropdown, {
            opacity: 1,
            y: 0,
            clipPath: 'inset(0% 0% 0% 0%)',
            filter: 'blur(0px)',
            duration: 0.3,
            ease: 'power2.out'
          }, 0.35)
          .to(navScrollDropdownItems, {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 0.35,
            stagger: 0.02,
            ease: 'power2.out'
          }, 0.4);
      }

      function openNavScrollMenu() {
        if (!navScrollMenuTl || isNavScrollMenuOpen || navScrollMenuAnimating) return;
        stopNavScrollCloseTimeline();
        hydrateNavShowcaseImages();
        isNavScrollMenuOpen = true;
        navScrollMenuAnimating = true;
        navScrollMenuTl.timeScale(1);
        navScrollMenuTl.play(0);
      }

      function closeNavScrollMenu(options = {}) {
        const menuClassOpen = navScrollContainer?.classList.contains('is-menu-open');
        if (!navScrollMenuTl || (!isNavScrollMenuOpen && !navScrollMenuAnimating && !menuClassOpen)) return;
        const immediate = options.immediate === true;
        const onAfterClose = typeof options.onAfterClose === 'function' ? options.onAfterClose : null;
        isNavScrollMenuOpen = false;
        navScrollMenuAnimating = true;
        hideNavScrollPreview(activeNavShowcaseRow, true);
        if (immediate) {
          stopNavScrollCloseTimeline();
          navScrollMenuTl.pause(0);
          finalizeNavScrollClosedState();
          if (onAfterClose) onAfterClose();
          return;
        }
        hideNavScrollPreview(activeNavShowcaseRow, true);
        //  is-menu-open， CSS 
        stopNavScrollCloseTimeline();
        navScrollMenuTl.pause();
        navScrollDropdown.style.pointerEvents = 'none';
        navScrollContainer?.classList.add('is-menu-animating');

        navScrollMenuCloseTl = gsap.timeline({
          defaults: { overwrite: 'auto' },
          onComplete: () => {
            finalizeNavScrollClosedState();
            if (onAfterClose) onAfterClose();
          }
        });

        navScrollMenuCloseTl
          .to(navScrollDropdown, {
            opacity: 0,
            y: 10,
            clipPath: 'inset(2% 0% 0% 0%)',
            filter: 'blur(4px)',
            duration: 0.18,
            ease: 'power2.in'
          }, 0)
          .to(navScrollContainer, {
            top: () => getNavScrollCollapsedTop(),
            height: NAV_SCROLL_COLLAPSED_HEIGHT,
            borderRadius: NAV_SCROLL_LINE_RADIUS,
            duration: 0.2,
            ease: 'power3.inOut'
          }, 0.05)
          .to(navScrollContainer, {
            width: () => getNavScrollClosedWidth(),
            duration: 0.25,
            ease: 'power3.inOut'
          }, 0.2)
          .add(() => {
            navScrollContainer?.classList.remove('is-menu-open');
          }, 0.45)
          .to(navScrollContainer, {
            top: () => getNavScrollClosedTop(),
            height: NAV_SCROLL_CLOSED_HEIGHT,
            borderRadius: NAV_SCROLL_CLOSED_RADIUS,
            backgroundColor: NAV_SCROLL_CLOSED_BG,
            duration: 0.25,
            ease: 'power3.out'
          }, 0.45);
      }

      function syncNavScrollMenuLayout() {
        if (!navScrollContainer || typeof gsap === 'undefined') return;
        if (isNavScrollMenuOpen) {
          setNavScrollShellState('open');
          return;
        }
        if (!navScrollMenuAnimating) {
          setNavScrollShellState('closed');
        }
      }

      initNavScrollMenu();

      // hover auto-open removed — menu opens only on hamburger click

      navScrollMenuBtn?.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!_showingScrollNav || navScrollMenuAnimating) return;
        if (isNavScrollMenuOpen) closeNavScrollMenu();
        else openNavScrollMenu();
      });

      navScrollLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
          const menuClassOpen = navScrollContainer?.classList.contains('is-menu-open');
          if (!isNavScrollMenuOpen && !navScrollMenuAnimating && !menuClassOpen) return;
          e.preventDefault();
          e.stopPropagation();
          const href = link.getAttribute('href');
          const label = link.dataset.transitionLabel || '';
          document.documentElement.classList.add('is-menu-link-transition');
          closeNavScrollMenu({
            onAfterClose: () => {
              document.documentElement.classList.remove('is-menu-link-transition');
              if (!href) return;
              const dest = new URL(href, window.location.href);
              const isSamePage = isSameOriginSamePath(dest);
              if (isSamePage && dest.hash) {
                const target = document.querySelector(dest.hash);
                if (target) {
                  if (window._lenis && typeof window._lenis.scrollTo === 'function') {
                    window._lenis.scrollTo(target, { duration: 1.15, offset: -24 });
                  } else {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }
              } else if (window._mdzNavigate) {
                window._mdzNavigate(dest.href, label);
              } else {
                window.location.href = dest.href;
              }
            }
          });
        });
      });

      function isSameOriginSamePath(url) {
        if (url.origin !== window.location.origin) return false;
        const normalize = (p) => p.replace(/\/index\.html$/i, '/').replace(/\/$/, '') || '/';
        return normalize(url.pathname) === normalize(window.location.pathname);
      }

      navShowcaseRows.forEach((row) => {
        row.addEventListener('pointerenter', () => {
          showNavScrollPreview(row);
        });
        row.addEventListener('focus', () => {
          showNavScrollPreview(row);
        });
        row.addEventListener('pointerleave', () => {
          scheduleHideNavScrollPreview(row);
        });
        row.addEventListener('blur', () => {
          scheduleHideNavScrollPreview(row);
        });
      });

      navScrollDropdown?.addEventListener('pointerenter', () => {
        if (navScrollHoverCloseTimer) {
          clearTimeout(navScrollHoverCloseTimer);
          navScrollHoverCloseTimer = null;
        }
      });

      navScrollDropdown?.addEventListener('pointerleave', () => {
        hideNavScrollPreview();
      });

      document.addEventListener('click', (event) => {
        if (!isNavScrollMenuOpen || !navScrollContainer) return;
        if (!navScrollContainer.contains(event.target)) {
          closeNavScrollMenu();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeNavScrollMenu();
      });

      window.addEventListener('resize', () => {
        syncNavScrollMenuLayout();
        if (isSimpleTouchNavMode()) {
          hideNavScrollPreview(null, true);
        } else if (activeNavShowcaseRow && isNavScrollMenuOpen) {
          showNavScrollPreview(activeNavShowcaseRow);
        }
      }, { passive: true });

      let navScrollAnimRaf = 0;
      function scheduleNavScrollState(nextClass) {
        if (!navScrollContainer) return;
        if (isMobileHomeNav()) {
          if (navScrollAnimRaf) cancelAnimationFrame(navScrollAnimRaf);
          navScrollAnimRaf = 0;
          navScrollContainer.classList.remove('ns-enter', 'ns-exit');
          return;
        }
        if (navScrollAnimRaf) cancelAnimationFrame(navScrollAnimRaf);
        navScrollContainer.classList.remove('ns-enter', 'ns-exit');
        navScrollAnimRaf = requestAnimationFrame(() => {
          navScrollAnimRaf = 0;
          navScrollContainer.classList.add(nextClass);
        });
      }

      function triggerNavScrollEnter() {
        if (!navScrollContainer) return;
        if (isMobileHomeNav()) {
          navScrollContainer.classList.remove('ns-enter', 'ns-exit');
          setNavScrollShellState('closed');
          setNavScrollPointerState();
          return;
        }
        clearNavScrollBlend();
        setNavScrollShellState('closed');
        scheduleNavScrollState('ns-enter');
        setNavScrollPointerState();
      }
      function triggerNavScrollExit() {
        if (!navScrollContainer) return;
        if (isMobileHomeNav()) {
          navScrollContainer.classList.remove('ns-enter', 'ns-exit');
          setNavScrollShellState('closed');
          setNavScrollPointerState();
          return;
        }
        closeNavScrollMenu({ immediate: true });
        scheduleNavScrollState('ns-exit');
        setNavScrollPointerState();
      }

      const syncNavScrollFromPosition = (scroll, velocity = 0) => {
        currentVelocity = velocity;
        if (isMobileHomeNav()) {
          if (!_showingScrollNav) {
            _showingScrollNav = true;
            document.documentElement.classList.add('show-nav-scroll');
            navScrollContainer?.classList.remove('ns-enter', 'ns-exit');
            setNavScrollShellState('closed');
          }
          setNavScrollPointerState();
          return;
        }
        const shouldSwitch = scroll > 300;
        if (shouldSwitch !== _showingScrollNav) {
          _showingScrollNav = shouldSwitch;
          document.documentElement.classList.toggle('show-nav-scroll', _showingScrollNav);
          if (_showingScrollNav) triggerNavScrollEnter();
          else triggerNavScrollExit();
        }
      };

      if (window._lenis && typeof window._lenis.on === 'function') {
        window._lenis.on('scroll', ({ velocity, scroll }) => {
          syncNavScrollFromPosition(scroll, velocity);
        });
      } else {
        window.addEventListener('scroll', () => {
          syncNavScrollFromPosition(window.scrollY || window.pageYOffset || 0, 0);
        }, { passive: true });
        syncNavScrollFromPosition(window.scrollY || window.pageYOffset || 0, 0);
      }

      const progressBar = document.getElementById('scroll-progress');
      if (progressBar) {
        let currentWidth = 0;
        let targetWidth = 0;
        let progressRaf = 0;
        let _lastWrittenWidth = -1; // 🎯  style
        let _progressMax = 1;
        let _progressMaxRaf = 0;

        function updateProgressMax() {
          _progressMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          updateProgressTarget();
        }

        function requestProgressTick() {
          if (!progressRaf) progressRaf = requestAnimationFrame(progressTick);
        }

        function updateProgressTarget() {
          const scrollY = window._lenis ? window._lenis.scroll : window.scrollY;
          targetWidth = _progressMax > 0 ? (scrollY / _progressMax) * 100 : 0;
          requestProgressTick();
        }

        function progressTick() {
          progressRaf = 0;
          currentWidth += (targetWidth - currentWidth) * 0.12;
          if (Math.abs(currentWidth - _lastWrittenWidth) > 0.05) {
            progressBar.style.transform = 'scaleX(' + (currentWidth / 100) + ')';
            _lastWrittenWidth = currentWidth;
          }
          if (Math.abs(targetWidth - currentWidth) > 0.05) requestProgressTick();
        }

        function scheduleProgressMaxUpdate() {
          if (_progressMaxRaf) return;
          _progressMaxRaf = requestAnimationFrame(() => {
            _progressMaxRaf = 0;
            updateProgressMax();
          });
        }

        updateProgressMax();
        window.addEventListener('load', scheduleProgressMaxUpdate, { once: true });
        window.addEventListener('resize', scheduleProgressMaxUpdate, { passive: true });
        window.addEventListener('scroll', updateProgressTarget, { passive: true });
        if (window._lenis) window._lenis.on('scroll', updateProgressTarget);
        if ('ResizeObserver' in window && document.body) {
          new ResizeObserver(scheduleProgressMaxUpdate).observe(document.body);
        }
      }

      /* footer-time ， initFooterClock  JS  */

      runWhenNear(document.getElementById('site-footer'), function () {
        _ric(function () {
          (function initFooterReveal() {
            const footer = document.getElementById('site-footer');
            if (!footer) return;

            const infoBar = footer.querySelector('.footer-info-bar');
            const description = footer.querySelector('.footer-description');
            const contactInfo = footer.querySelector('.footer-contact-info');
            const webAdd = footer.querySelector('.web_add');
            const navLinks = footer.querySelector('.footer-nav-links');
            const thumb = footer.querySelector('.footer-video-thumb');
            const cBridge = document.getElementById('footer-c-bridge');
            const parallaxBg = document.getElementById('footer-parallax-bg');

            if (parallaxBg && parallaxBg.dataset.bg) {
              parallaxBg.style.setProperty('--footer-bg-image', `url("${parallaxBg.dataset.bg}")`);
            }

            // ── 1. Animated border line (replaces CSS border-top on infoBar)
            let infoLine = null;
            if (infoBar) {
              infoLine = document.createElement('div');
              infoLine.className = 'footer-info-line';
              infoBar.parentNode.insertBefore(infoLine, infoBar);
              infoBar.style.borderTop = 'none';
              gsap.set(infoLine, { scaleX: 0 });
            }

            // ── 2. Wrap info-bar spans for y-clip reveal
            const rawSpans = infoBar ? [...infoBar.querySelectorAll('span')] : [];
            const spanInners = rawSpans.map(span => {
              const wrap = document.createElement('span');
              wrap.className = 'frev-wrap';
              const inner = document.createElement('span');
              inner.style.display = 'inline-block';
              inner.textContent = span.textContent;
              span.textContent = '';
              wrap.appendChild(inner);
              span.appendChild(wrap);
              return inner;
            });
            if (spanInners.length) gsap.set(spanInners, { y: '110%' });

            // ── 3. Wrap nav links for y-clip reveal
            const navAnchors = navLinks ? [...navLinks.querySelectorAll('a')] : [];
            navAnchors.forEach(a => {
              const wrap = document.createElement('span');
              wrap.className = 'frev-wrap';
              a.parentNode.insertBefore(wrap, a);
              wrap.appendChild(a);
            });
            if (navAnchors.length) gsap.set(navAnchors, { y: '120%' });

            // ── 4. Wrap email / phone individually for y reveal
            const contactEmail = contactInfo ? contactInfo.querySelector('a') : null;
            const contactPhone = contactInfo ? contactInfo.querySelector('span') : null;
            if (contactEmail) {
              const ew = document.createElement('div');
              ew.style.overflow = 'hidden';
              contactEmail.parentNode.insertBefore(ew, contactEmail);
              ew.appendChild(contactEmail);
              gsap.set(contactEmail, { y: '105%' });
            }
            if (contactPhone) {
              const pw = document.createElement('div');
              pw.style.cssText = 'overflow:hidden;display:block;';
              contactPhone.parentNode.insertBefore(pw, contactPhone);
              pw.appendChild(contactPhone);
              gsap.set(contactPhone, { display: 'inline-block', y: '105%' });
            }

            // ── 5. Video cover overlay (wipe reveal)
            let videoCover = null;
            if (thumb) {
              videoCover = document.createElement('div');
              videoCover.className = 'footer-video-cover';
              thumb.appendChild(videoCover);
            }

            // ── Entry timeline
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: footer,
                start: 'top 82%',
              }
            });

            // Border line: scaleX wipe left→right
            if (infoLine) {
              tl.to(infoLine, {
                scaleX: 1, duration: 1.1, ease: 'power3.inOut'
              }, 0);
            }

            // Info-bar spans: stagger slide up from clip
            if (spanInners.length) {
              tl.to(spanInners, {
                y: '0%', duration: 1.0, stagger: 0.1, ease: 'power4.out'
              }, 0.2);
            }

            // Description: clipPath reveal upward
            if (description) {
              tl.fromTo(description,
                { clipPath: 'inset(0 0 100% 0)', y: 20 },
                { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.1, ease: 'power4.out' },
                0.5
              );
            }

            // Email: slide up from overflow wrap
            if (contactEmail) {
              tl.to(contactEmail, {
                y: '0%', duration: 1.2, ease: 'power4.out'
              }, 0.68);
            }

            // Phone: clip reveal
            if (contactPhone) {
              tl.to(contactPhone, {
                y: '0%', duration: 0.9, ease: 'power3.out'
              }, 0.85);
            }

            // Address
            if (webAdd) {
              tl.from(webAdd, {
                y: 14, opacity: 0, duration: 0.8, ease: 'power3.out'
              }, 0.95);
            }

            // Nav links: stagger slide up
            if (navAnchors.length) {
              tl.to(navAnchors, {
                y: '0%', duration: 0.85, stagger: 0.07, ease: 'power4.out'
              }, 1.05);
            }

            // Video cover: wipe right→left (sweep away) — faster entrance
            if (videoCover) {
              tl.fromTo(videoCover,
                { scaleX: 1 },
                { scaleX: 0, duration: 0.85, ease: 'power4.inOut', transformOrigin: 'right center' },
                0.15
              );
            }

            // © bridge: scale + rotation
            if (cBridge) {
              tl.from(cBridge, {
                scale: 0, rotation: -20, duration: 1.1, ease: 'back.out(1.3)'
              }, 0.8);
            }

            // ── Parallax scroll
            if (cBridge) {
              gsap.to(cBridge, {
                y: '30%',
                ease: 'none',
                scrollTrigger: {
                  trigger: '#footer-parallax-section',
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: true
                }
              });
            }

            if (parallaxBg) {
              gsap.fromTo(parallaxBg, 
                { y: '25px', scale: 0.97, opacity: 0.7 },
                {
                  y: '0px',
                  scale: 1,
                  opacity: 1,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: '#footer-parallax-section',
                    start: 'top bottom',
                    end: 'bottom bottom',
                    scrub: true
                  }
                }
              );
            }
          })();
        });
      }, '2200px 0px'); // end lazy initFooterReveal

      runWhenNear(document.querySelector('.pg-gallery'), function () {
        _ric(function () {
          (function initGalleryExit() {
            const pgGallery = document.querySelector('.pg-gallery');
            if (!pgGallery) return;
            gsap.to(pgGallery, {
              opacity: 0,
              y: -30,
              ease: 'power2.in',
              scrollTrigger: {
                trigger: pgGallery,
                start: 'bottom 55%',
                end: 'bottom top',
                scrub: 1.5,
              }
            });
          })();
        });
      }, '1800px 0px'); // end lazy initGalleryExit

      // 🎯 : PC( >1024、 hover、),iPad/
      const disableCustomCursor = window.matchMedia('(max-width: 1024px), (hover: none), (pointer: coarse)').matches;

      if (!disableCustomCursor) {
        // ── Grid Mouse Tracker ──
        (function () {
          const settings = {
            GRID_SIZE: 5,
            MAX_BLOCKS: 50,
            FADE_OUT_DURATION: 1.0,
            COLOR: '#ffffff'
          };

          const pool = [];
          let poolIndex = 0;
          const activeBlockKeys = new Set();
          let prevX = null;
          let prevY = null;
          let gridCols = 0;
          let gridRows = 0;

          const updateDynamicStyles = () => {
            const styleId = 'dynamic-block-style';
            let styleElement = document.getElementById(styleId);
            if (!styleElement) {
              styleElement = document.createElement('style');
              styleElement.id = styleId;
              document.head.appendChild(styleElement);
            }
            styleElement.innerHTML = `
                .mouseTracker--01 {
                    width: ${settings.GRID_SIZE}px;
                    height: ${settings.GRID_SIZE}px;
                    background-color: ${settings.COLOR};
                    animation: none !important;
                    opacity: 0;
                    top: 0; left: 0;
                    will-change: transform, opacity;
                }
            `;
          };

          const initializeGrid = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            gridCols = Math.ceil(width / settings.GRID_SIZE);
            gridRows = Math.ceil(height / settings.GRID_SIZE);

            activeBlockKeys.clear();

            if (pool.length === 0) {
              const fragment = document.createDocumentFragment();
              for (let i = 0; i < settings.MAX_BLOCKS; i++) {
                const el = document.createElement('div');
                el.className = 'mouseTracker--01';
                fragment.appendChild(el);
                pool.push(el);
              }
              document.body.appendChild(fragment);
            }
          };

          const getInterpolatedPoints = (x1, y1, x2, y2) => {
            const points = [];
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.max(Math.abs(dx), Math.abs(dy));
            const steps = dist / settings.GRID_SIZE;

            for (let i = 0; i <= steps; i++) {
              const t = steps > 0 ? i / steps : 0;
              const x = Math.round(x1 + dx * t);
              const y = Math.round(y1 + dy * t);
              points[i] = { x, y };
            }
            return points;
          };

          const handleMouseMove = (e) => {
            const currX = e.clientX;
            const currY = e.clientY;

            if (prevX !== null && prevY !== null) {
              const points = getInterpolatedPoints(prevX, prevY, currX, currY);
              points.forEach(({ x, y }) => {
                const cellX = Math.floor(x / settings.GRID_SIZE);
                const cellY = Math.floor(y / settings.GRID_SIZE);
                if (cellX >= 0 && cellX < gridCols && cellY >= 0 && cellY < gridRows) {
                  drawBlock(cellX * settings.GRID_SIZE, cellY * settings.GRID_SIZE);
                }
              });
            }
            prevX = currX;
            prevY = currY;
          };

          const drawBlock = (x, y) => {
            const key = `${x},${y}`;
            if (activeBlockKeys.has(key)) return;

            const el = pool[poolIndex];
            poolIndex = (poolIndex + 1) % settings.MAX_BLOCKS;

            if (el.dataset.pos) {
              activeBlockKeys.delete(el.dataset.pos);
            }

            el.dataset.pos = key;
            activeBlockKeys.add(key);

            el.style.transform = `translate3d(${x}px, ${y}px, 0)`;

            if (el._anim) {
              el._anim.cancel();
            }

            el._anim = el.animate([
              { opacity: 1 },
              { opacity: 0 }
            ], {
              duration: settings.FADE_OUT_DURATION * 1000,
              fill: 'forwards'
            });

            el._anim.onfinish = () => {
              activeBlockKeys.delete(key);
              el.dataset.pos = "";
            };
          };

          updateDynamicStyles();
          initializeGrid();
          window.addEventListener('mousemove', handleMouseMove, { passive: true });
          window.addEventListener('resize', initializeGrid, { passive: true });
        })();

        const dot = document.getElementById('cursor-dot');
        const ring = document.getElementById('cursor-ring');
        if (dot && ring) {
          let mx = 0, my = 0, rx = 0, ry = 0;
          let magnetTarget = null;
          let magRect = null;
          let magnetStrength = 0.22;
          let cursorLeaveTimer = null;
          let cursorEnterRaf = 0;
          const cursorExitDuration = 140;

          // 🎯 :, style.transform 
          let _lastDotX = -1, _lastDotY = -1, _lastRingX = -1, _lastRingY = -1;
          let _cursorRaf = 0;
          let _lastCursorWake = 0;

          const wakeCursorLoop = () => {
            _lastCursorWake = performance.now();
            if (!_cursorRaf) _cursorRaf = requestAnimationFrame(cursorLoop);
          };

          const showCursorLabel = (label, side) => {
            if (cursorLeaveTimer) {
              clearTimeout(cursorLeaveTimer);
              cursorLeaveTimer = null;
            }

            dot.classList.add('is-link');
            ring.classList.remove('is-leaving');
            ring.classList.remove('is-link');
            ring.setAttribute('data-cursor-label', label);
            ring.setAttribute('data-cursor-side', side);

            if (cursorEnterRaf) cancelAnimationFrame(cursorEnterRaf);
            cursorEnterRaf = requestAnimationFrame(() => {
              cursorEnterRaf = 0;
              ring.classList.add('is-link');
              wakeCursorLoop();
            });
          };

          const hideCursorLabel = () => {
            if (cursorEnterRaf) {
              cancelAnimationFrame(cursorEnterRaf);
              cursorEnterRaf = 0;
            }
            ring.classList.remove('is-link');
            ring.classList.add('is-leaving');
            wakeCursorLoop();

            if (cursorLeaveTimer) {
              clearTimeout(cursorLeaveTimer);
            }

            cursorLeaveTimer = window.setTimeout(() => {
              ring.classList.remove('is-leaving');
              dot.classList.remove('is-link');
              ring.setAttribute('data-cursor-label', 'EXPLORE');
              ring.setAttribute('data-cursor-side', 'right');
              cursorLeaveTimer = null;
              wakeCursorLoop();
            }, cursorExitDuration);
          };

          document.addEventListener('mousemove', e => {
            mx = e.clientX;
            my = e.clientY;
            wakeCursorLoop();
          }, { passive: true });

          function cursorLoop() {
            _cursorRaf = 0;

            const targetX = (magnetTarget && magRect)
              ? mx + ((magRect.left + magRect.width / 2) - mx) * magnetStrength
              : mx;
            const targetY = (magnetTarget && magRect)
              ? my + ((magRect.top + magRect.height / 2) - my) * magnetStrength
              : my;

            rx += (targetX - rx) * 0.18;
            ry += (targetY - ry) * 0.18;

            // 🎯  style, DOM 
            if (targetX !== _lastDotX || targetY !== _lastDotY) {
              dot.style.transform = `translate(${targetX}px,${targetY}px)`;
              _lastDotX = targetX;
              _lastDotY = targetY;
            }
            if (Math.abs(rx - _lastRingX) > 0.05 || Math.abs(ry - _lastRingY) > 0.05) {
              ring.style.transform = `translate(${rx}px,${ry}px)`;
              _lastRingX = rx;
              _lastRingY = ry;
            }

            const ringSettled = Math.abs(rx - targetX) < 0.08 && Math.abs(ry - targetY) < 0.08;
            const recentlyAwake = performance.now() - _lastCursorWake < 260;
            if (!ringSettled || recentlyAwake) {
              _cursorRaf = requestAnimationFrame(cursorLoop);
            }
          }

          const linkSelectors = 'a, button, .slide-thumb, .pg-item, [data-cursor]';
          const getCursorTarget = (node) => node && typeof node.closest === 'function'
            ? node.closest(linkSelectors)
            : null;

          document.addEventListener('pointerover', (e) => {
            const el = getCursorTarget(e.target);
            if (!el) return;

            const previous = getCursorTarget(e.relatedTarget);
            if (previous === el) return;

            const shouldMagnetize = el.offsetWidth < 300;
            const nextMagRect = shouldMagnetize ? el.getBoundingClientRect() : null;

            showCursorLabel(el.dataset.cursor || 'EXPLORE', el.dataset.cursorSide || 'right');
            if (shouldMagnetize) {
              magnetTarget = el;
              magRect = nextMagRect;
            } else {
              magnetTarget = null;
              magRect = null;
            }
            wakeCursorLoop();
          });

          document.addEventListener('pointerout', (e) => {
            const el = getCursorTarget(e.target);
            if (!el) return;

            const next = getCursorTarget(e.relatedTarget);
            if (next) return;

            hideCursorLabel();
            magnetTarget = null;
            magRect = null;
            wakeCursorLoop();
          });

          document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; wakeCursorLoop(); });
          document.addEventListener('mouseenter', () => { dot.style.opacity = ''; ring.style.opacity = ''; wakeCursorLoop(); });
        }
      }

      // ──  mobile-cube-section：scroll-driven  ──
      (function () {
        var cube = document.querySelector('.mobile-cube');
        var scene = document.querySelector('.mobile-cube-scene');
        if (!cube) return;

        var angle = 0;
        var extra = 0;
        var touchRotateX = 0;
        var touchRotateY = 0;
        var isTouching = false;
        var snapBackBoost = 0;
        var BASE = 0.21;   // deg/frame baseline (~13°/s @ 60fps)
        var FRIC = 0.87;   // 
        var K = 0.07;   // scroll velocity → extra 
        var MAX_EXTRA = 1.12;
        var TOUCH_DRAG_X = 0.55;
        var TOUCH_DRAG_Y = 0.48;
        var TOUCH_MOMENTUM = 0.16;
        var RETURN_EASE = 0.1;
        var RETURN_EASE_SCROLL = 0.22;
        var rafId = 0;
        var isVisible = false;

        function addVelocity(v) {
          extra += v * K;
          if (extra > MAX_EXTRA) extra = MAX_EXTRA;
          if (extra < -MAX_EXTRA) extra = -MAX_EXTRA;
        }

        // Lenis scroll velocity
        function hookLenis() {
          if (window._lenis) {
            window._lenis.on('scroll', function (e) { addVelocity(e.velocity * 3.2); });
          } else {
            setTimeout(hookLenis, 300);
          }
        }
        hookLenis();

        if (scene) {
          var lastTouchX = 0;
          var lastTouchY = 0;

          scene.addEventListener('touchstart', function (e) {
            if (!e.touches || !e.touches.length) return;
            isTouching = true;
            snapBackBoost = 0;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
          }, { passive: true });

          scene.addEventListener('touchmove', function (e) {
            if (!e.touches || !e.touches.length) return;
            var touchX = e.touches[0].clientX;
            var touchY = e.touches[0].clientY;
            var deltaX = touchX - lastTouchX;
            var deltaY = touchY - lastTouchY;
            lastTouchX = touchX;
            lastTouchY = touchY;
            touchRotateY += deltaX * TOUCH_DRAG_X;
            touchRotateX -= deltaY * TOUCH_DRAG_Y;
            addVelocity(deltaX * TOUCH_MOMENTUM);
          }, { passive: true });

          scene.addEventListener('touchend', function () {
            isTouching = false;
            snapBackBoost = RETURN_EASE_SCROLL;
            lastTouchX = 0;
            lastTouchY = 0;
          }, { passive: true });

          scene.addEventListener('touchcancel', function () {
            isTouching = false;
            snapBackBoost = RETURN_EASE_SCROLL;
            lastTouchX = 0;
            lastTouchY = 0;
          }, { passive: true });
        }

        // native scroll fallback
        var lastY = window.scrollY;
        window.addEventListener('scroll', function () {
          var deltaY = window.scrollY - lastY;
          addVelocity(deltaY);
          if (deltaY > 0) snapBackBoost = RETURN_EASE_SCROLL;
          lastY = window.scrollY;
        }, { passive: true });

        function tick() {
          rafId = 0;
          extra *= FRIC;
          angle += BASE + extra;

          if (!isTouching) {
            var returnEase = Math.max(RETURN_EASE, snapBackBoost);
            touchRotateX += (0 - touchRotateX) * returnEase;
            touchRotateY += (0 - touchRotateY) * returnEase;
            snapBackBoost *= 0.92;
          }

          cube.style.transform = 'rotateX(' + touchRotateX + 'deg) rotateY(' + (angle + touchRotateY) + 'deg)';
          rafId = isVisible ? requestAnimationFrame(tick) : 0;
        }

        if ('IntersectionObserver' in window && scene) {
          const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && !isVisible) {
                isVisible = true;
                if (!rafId) tick();
              } else if (!entry.isIntersecting && isVisible) {
                isVisible = false;
                if (rafId) {
                  cancelAnimationFrame(rafId);
                  rafId = 0;
                }
              }
            });
          }, { rootMargin: '200px 0px' });
          io.observe(scene);
        } else {
          isVisible = true;
          tick();
        }
      })();

      // ── Scroll-driven marquee ( .js-scroll-marquee ) ──
      (function () {
        const inners = Array.from(document.querySelectorAll('.js-scroll-marquee'));
        //  ID 
        const legacy = document.getElementById('marquee-inner');
        if (legacy && !inners.includes(legacy)) inners.unshift(legacy);
        if (!inners.length) return;

        const baseSpeed = 1;   // px per tick baseline
        let lenisVel = 0;
        let marqueeRaf = 0;

        const tracks = inners.map(function (inner) {
          const dirAttr = parseFloat(inner.getAttribute('data-marquee-dir'));
          const firstSet = inner.querySelector('.marquee-set');
          const templateSet = firstSet ? firstSet.cloneNode(true) : null;
          return {
            inner: inner,
            templateSet: templateSet,
            xPos: 0,
            setWidth: 0,
            dir: isFinite(dirAttr) && dirAttr !== 0 ? Math.sign(dirAttr) : -1
          };
        }).filter(function (track) {
          return !!track.templateSet;
        });

        function rebuildTrack(track) {
          if (!track.templateSet) return;
          const outer = track.inner.parentElement;
          track.inner.innerHTML = '';
          const firstClone = track.templateSet.cloneNode(true);
          track.inner.appendChild(firstClone);

          const setWidth = firstClone.scrollWidth || Math.ceil(firstClone.getBoundingClientRect().width) || 0;
          const outerWidth = outer ? outer.clientWidth : window.innerWidth;
          track.setWidth = setWidth;

          if (!setWidth) return;

          const minTrackWidth = outerWidth + setWidth * 2;
          const cloneCount = Math.max(2, Math.ceil(minTrackWidth / setWidth));
          for (let i = 1; i < cloneCount; i++) {
            track.inner.appendChild(track.templateSet.cloneNode(true));
          }
          track.xPos = ((track.xPos % setWidth) + setWidth) % setWidth;
          if (track.dir < 0 && track.xPos > 0) track.xPos -= setWidth;
          track.inner.style.transform = 'translate3d(' + track.xPos + 'px, 0, 0)';
        }

        function rebuildMarquees() {
          tracks.forEach(rebuildTrack);
        }

        window.addEventListener('load', rebuildMarquees, { once: true });
        window.addEventListener('resize', rebuildMarquees, { passive: true });
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(rebuildMarquees).catch(function () { });
        }
        rebuildMarquees();

        // Hook into Lenis velocity
        setTimeout(function () {
          if (window._lenis) {
            window._lenis.on('scroll', function (e) {
              lenisVel = (e.velocity || 0) * 0.25;
              if (shouldRunMarquee()) requestMarqueeTick();
            });
          }
        }, 200);

        function requestMarqueeTick() {
          if (!marqueeRaf) marqueeRaf = requestAnimationFrame(tick);
        }
        window._requestMarqueeRAF = requestMarqueeTick;

        // 🎯  marquee section, cube ScrollTrigger 
        const isMobileBreakpoint = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
        let mobileMarqueeVisible = !isMobileBreakpoint;

        function shouldRunMarquee() {
          return isMobileBreakpoint ? mobileMarqueeVisible : window._marqueeRAFActive;
        }

        if (isMobileBreakpoint && 'IntersectionObserver' in window && inners.length) {
          const observedSections = new Set();
          const io = new IntersectionObserver((entries) => {
            mobileMarqueeVisible = entries.some((entry) => entry.isIntersecting);
            if (mobileMarqueeVisible) requestMarqueeTick();
          }, { rootMargin: '300px 0px' });

          inners.forEach(function (inner) {
            const section = inner.closest('.mobile-marquee-section, .section-2-content, section') || inner.parentElement;
            if (section && !observedSections.has(section)) {
              observedSections.add(section);
              io.observe(section);
            }
          });
        } else if (isMobileBreakpoint) {
          mobileMarqueeVisible = true;
        }

        function tick() {
          marqueeRaf = 0;
          lenisVel *= 0.93;
          if (!shouldRunMarquee()) return;

          tracks.forEach(function (t) {
            // dir = -1 → (),+1 → ; Lenis 
            t.xPos += (baseSpeed + lenisVel) * t.dir;
            if (t.setWidth > 0) {
              while (t.xPos <= -t.setWidth) t.xPos += t.setWidth;
              while (t.xPos >= t.setWidth) t.xPos -= t.setWidth;
            }
            t.inner.style.transform = 'translate3d(' + t.xPos + 'px, 0, 0)';
          });
          requestMarqueeTick();
        }
        if (shouldRunMarquee()) requestMarqueeTick();
      })();

    // Section-2 animation loaded externally — see section-2/section-2.js

    });  // end document.addEventListener / DOMContentLoaded wrapper