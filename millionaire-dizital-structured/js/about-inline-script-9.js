

    import * as THREE from 'https://esm.sh/three@0.175.0';



    let _mx = 0, _my = 0;

    const _mmCbs = [];

    let _mmTicking = false;

    document.addEventListener('mousemove', e => {

      _mx = e.clientX; _my = e.clientY;

      if (_mmTicking) return;

      _mmTicking = true;

      requestAnimationFrame(() => {

        _mmTicking = false;

        for (let i = 0; i < _mmCbs.length; i++) _mmCbs[i](_mx, _my);

      });

    }, { passive: true });



    // ── Shaders ──────────────────────────────────────────────────

    const vertexShader = `

      varying vec2 v_uv;

      void main() { v_uv = uv; gl_Position = vec4(position, 1.0); }

    `;



    // Circular inversion: a single soft-edged inverted circle tracking the cursor.

    const fragmentShader = `

      precision highp float;

      uniform sampler2D u_texture;

      uniform vec2      u_resolution;

      uniform float     u_imageAspect;

      uniform vec2      u_mouse;        // Mouse UV position (0-1)

      uniform float     u_radius;       // Circle radius in screen UV

      uniform float     u_opacity;      // Circle opacity (0-1)

      varying vec2 v_uv;



      void main() {

        vec2 uv = v_uv;

        float sa    = u_resolution.x / u_resolution.y;

        float ratio = u_imageAspect / sa;

        vec2 tc  = vec2(mix(0.5 - 0.5/ratio, 0.5 + 0.5/ratio, uv.x), uv.y);

        vec3 orig = texture2D(u_texture, tc).rgb;



        // Aspect-corrected screen coords (height = 1.0)

        vec2 sUV = vec2(uv.x * sa, uv.y);

        vec2 mUV = vec2(u_mouse.x * sa, u_mouse.y);



        float dist = distance(sUV, mUV);

        // Soft edge: ~3 pixels of blur at 1080p

        float mask = smoothstep(u_radius, u_radius - 0.003, dist) * u_opacity;



        float lum  = dot(orig, vec3(0.299, 0.587, 0.114));

        gl_FragColor = vec4(mix(orig, vec3(1.0 - lum), mask), 1.0);

      }

    `;



    // ── Config ───────────────────────────────────────────────────

    const config = {

      maskPixelRadius: 110,   // ← activation circle size in px

      appearDuration: 0.25,  // seconds to fade in circle

      frameSkip: 0

    };



    let frameCount = 0, lastTime = 0;

    const activeContainers = new Set();



    function globalAnimate(ts) {

      requestAnimationFrame(globalAnimate);

      const dt = ts - lastTime; lastTime = ts; frameCount++;

      if (config.frameSkip > 0 && frameCount % (config.frameSkip + 1) !== 0) return;

      activeContainers.forEach(c => {

        if (!c.isInView || !c.uniforms) return;

        if (!c._videoTexture && !c.isMouseInsideContainer && c.uniforms.u_opacity.value <= 0.001) return;

        updateContainer(c, dt);

      });

    }

    requestAnimationFrame(globalAnimate);



    function updateContainer(c, dt) {

      if (!c.uniforms) return;

      c.lerpedMouse.lerp(c.targetMouse, 0.35); // Smooth cursor tracking (higher = faster)

      c.uniforms.u_mouse.value.copy(c.lerpedMouse);

      if (c._videoTexture) c._videoTexture.needsUpdate = true;

      if (c.renderer && c.scene && c.camera) c.renderer.render(c.scene, c.camera);

    }



    // ── Lazy init ────────────────────────────────────────────────

    const lazyInitObs = new IntersectionObserver((entries, obs) => {

      entries.forEach((entry, i) => {

        if (entry.isIntersecting) {

          obs.unobserve(entry.target);

          setTimeout(() => initHoverEffect(entry.target), i * 180);

        }

      });

    }, { rootMargin: '900px' });

    document.querySelectorAll('.inversion-lens').forEach(c => lazyInitObs.observe(c));



    function initHoverEffect(container) {

      container.scene = container.camera = container.renderer = container.uniforms = null;

      container.isInView = true;

      container.isMouseInsideContainer = false;

      container.targetMouse = new THREE.Vector2(0.5, 0.5);

      container.lerpedMouse = new THREE.Vector2(0.5, 0.5);

      container.opacityTween = null;

      activeContainers.add(container);



      const vid = container.querySelector('video');

      const img = container.querySelector('img');

      if (vid) {

        // VideoTexture path

        const onReady = () => {

          const tex = new THREE.VideoTexture(vid);

          tex.minFilter = tex.magFilter = THREE.LinearFilter;

          tex.format = THREE.RGBAFormat;

          container._videoTexture = tex;

          setupScene(tex, vid.videoWidth / vid.videoHeight);

          setupListeners();

        };

        if (vid.readyState >= 1) { onReady(); }

        else { vid.addEventListener('loadedmetadata', onReady, { once: true }); }

      } else {

        new THREE.TextureLoader().load(img.src, tex => { setupScene(tex); setupListeners(); });

      }



      function shaderRadius() { return config.maskPixelRadius / container.clientHeight; }



      function setupScene(texture, forcedAspect) {

        const aspect = forcedAspect || texture.image.width / texture.image.height;

        texture.minFilter = texture.magFilter = THREE.LinearFilter;

        texture.anisotropy = 8; texture.generateMipmaps = false;



        container.scene = new THREE.Scene();

        const W = container.clientWidth, H = container.clientHeight;

        container.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);



        container.uniforms = {

          u_texture: { value: texture },

          u_resolution: { value: new THREE.Vector2(W, H) },

          u_imageAspect: { value: aspect },

          u_mouse: { value: new THREE.Vector2(0.5, 0.5) },

          u_radius: { value: shaderRadius() },

          u_opacity: { value: 0.0 }

        };



        const mesh = new THREE.Mesh(

          new THREE.PlaneGeometry(2, 2),

          new THREE.ShaderMaterial({ uniforms: container.uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false })

        );

        container.scene.add(mesh);

        container.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: true });

        container.renderer.setPixelRatio(1);

        container.renderer.setSize(W, H);

        container.appendChild(container.renderer.domElement);



        let rt;

        new ResizeObserver(() => {

          if (rt) return;

          rt = setTimeout(() => {

            const w = container.clientWidth, h = container.clientHeight;

            if (container.renderer) container.renderer.setSize(w, h);

            if (container.uniforms) {

              container.uniforms.u_resolution.value.set(w, h);

              container.uniforms.u_radius.value = config.maskPixelRadius / h;

            }

            rt = null;

          }, 200);

        }).observe(container);



        container.renderer.render(container.scene, container.camera);

      }



      function setupListeners() {

        _mmCbs.push((x, y) => { updateCursor(x, y); });

        new IntersectionObserver(entries => {

          entries.forEach(en => {

            container.isInView = en.isIntersecting;

            if (!container.isInView && container.opacityTween) {

              container.opacityTween.kill();

              container.uniforms.u_opacity.value = 0.0;

            }

          });

        }, { threshold: 0.1 }).observe(container);

      }



      function updateCursor(x, y) {

        const r = container.getBoundingClientRect();

        const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

        if (container.isMouseInsideContainer !== inside) {

          container.isMouseInsideContainer = inside;

          if (container.opacityTween) container.opacityTween.kill();

          if (inside) {

            container.targetMouse.set((x - r.left) / r.width, 1 - (y - r.top) / r.height);

            container.lerpedMouse.copy(container.targetMouse); // Snap immediately on enter

            container.opacityTween = gsap.to(container.uniforms.u_opacity, { value: 1.0, duration: config.appearDuration, ease: 'power2.out' });

          } else {

            // Instantly disappear on leaving the image

            container.uniforms.u_opacity.value = 0.0;

            if (container.renderer && container.scene && container.camera) {

              container.renderer.render(container.scene, container.camera);

            }

          }

        }

        if (inside) {

          container.targetMouse.set((x - r.left) / r.width, 1 - (y - r.top) / r.height);

        }

      }

    }



    // ── awp-item-1 year counter ──

    (function () {

      // Keep box.mp4 playing

      const bgVid = document.querySelector('.awp-lens-1 video');

      if (bgVid) {

        bgVid.addEventListener('pause', () => { bgVid.play().catch(() => { }); });

        bgVid.play().catch(() => { });

      }

      // CSS mix-blend-mode cursor circle

      const lens1 = document.querySelector('.awp-lens-1');

      const yrCircle = lens1 && lens1.querySelector('.yr-cursor-circle');

      if (lens1 && yrCircle) {

        lens1.addEventListener('mouseenter', () => { yrCircle.style.opacity = '1'; });

        lens1.addEventListener('mouseleave', () => { yrCircle.style.opacity = '0'; });

        lens1.addEventListener('mousemove', e => {

          const r = lens1.getBoundingClientRect();

          yrCircle.style.left = (e.clientX - r.left) + 'px';

          yrCircle.style.top = (e.clientY - r.top) + 'px';

        });

      }

      // CSS mix-blend-mode cursor circle — lens-2

      const lens2 = document.querySelector('.awp-lens-2');

      const yrCircle2 = lens2 && lens2.querySelector('.yr-cursor-circle');

      if (lens2 && yrCircle2) {

        lens2.addEventListener('mouseenter', () => { yrCircle2.style.opacity = '1'; });

        lens2.addEventListener('mouseleave', () => { yrCircle2.style.opacity = '0'; });

        lens2.addEventListener('mousemove', e => {

          const r = lens2.getBoundingClientRect();

          yrCircle2.style.left = (e.clientX - r.left) + 'px';

          yrCircle2.style.top = (e.clientY - r.top) + 'px';

        });

      }

      // CSS mix-blend-mode cursor circle — lens-3

      const lens3 = document.querySelector('.awp-lens-3');

      const yrCircle3 = lens3 && lens3.querySelector('.yr-cursor-circle');

      if (lens3 && yrCircle3) {

        lens3.addEventListener('mouseenter', () => { yrCircle3.style.opacity = '1'; });

        lens3.addEventListener('mouseleave', () => { yrCircle3.style.opacity = '0'; });

        lens3.addEventListener('mousemove', e => {

          const r = lens3.getBoundingClientRect();

          yrCircle3.style.left = (e.clientX - r.left) + 'px';

          yrCircle3.style.top = (e.clientY - r.top) + 'px';

        });

      }

      // CSS mix-blend-mode cursor circle — lens-4

      const lens4 = document.querySelector('.awp-lens-4');

      const yrCircle4 = lens4 && lens4.querySelector('.yr-cursor-circle');

      if (lens4 && yrCircle4) {

        lens4.addEventListener('mouseenter', () => { yrCircle4.style.opacity = '1'; });

        lens4.addEventListener('mouseleave', () => { yrCircle4.style.opacity = '0'; });

        lens4.addEventListener('mousemove', e => {

          const r = lens4.getBoundingClientRect();

          yrCircle4.style.left = (e.clientX - r.left) + 'px';

          yrCircle4.style.top = (e.clientY - r.top) + 'px';

        });

      }

      const el = document.getElementById('yr-counter');

      if (!el) return;

      const target = 14, dur = 2500;

      let start = null;

      function ease(t) { return t * (2 - t); }

      function tick(ts) {

        if (!start) start = ts;

        const p = Math.min((ts - start) / dur, 1);

        el.textContent = Math.floor(ease(p) * target);

        if (p < 1) requestAnimationFrame(tick);

        else el.textContent = target;

      }

      setTimeout(() => requestAnimationFrame(tick), 400);

    })();

  