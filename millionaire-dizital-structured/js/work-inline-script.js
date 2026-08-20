/* ─────────────────────────────────────────────────────────────────
       Hover Reveal — GSAP-driven overlay animations
       5 layers: image scale • blur fade • desaturate • video scale-in • text slide-up
    ───────────────────────────────────────────────────────────────── */
    (function () {
      function initHoverReveal() {
        var gsap = window.gsap;
        if (!gsap) return;

        var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (!canHover) return;

        /* ─ 1. Inject DOM layers into every .work-box ─────────────────── */
        document.querySelectorAll('.work-card').forEach(function (card) {
          var box = card.querySelector('.work-box');
          if (!box || box.dataset.hoverReveal) return;
          box.dataset.hoverReveal = '1';

          /* Frosted-glass layer */
          var blur = document.createElement('div');
          blur.className = 'work-blur';
          blur.setAttribute('aria-hidden', 'true');

          /* Desaturation blend layer */
          var blend = document.createElement('div');
          blend.className = 'work-color-blend';
          blend.setAttribute('aria-hidden', 'true');

          /* Slide-up text */
          var text = document.createElement('div');
          text.className = 'work-text-bottom';
          text.setAttribute('aria-hidden', 'true');
          var metaIdx = card.querySelector('.work-meta span:first-child');
          text.innerHTML =
            '<span class="work-text-bottom__index">' + (metaIdx ? metaIdx.textContent.trim() : '') + '</span>' +
            '<span class="work-text-bottom__action">VIEW PROJECT </span>';

          /* Insert blur + blend after the cover image, before the video */
          var cover = box.querySelector('.work-cover');
          var videoWrap = box.querySelector('.work-video');
          if (cover) {
            cover.after(blur, blend);
          } else {
            box.prepend(blur, blend);
          }
          box.appendChild(text);
        });

        /* ─ 2. GSAP initial states ─────────────────────────────── */
        gsap.set('.work-blur', { opacity: 0 });
        gsap.set('.work-color-blend', { opacity: 0 });
        gsap.set('.work-text-bottom', { opacity: 0, y: 30 });
        gsap.set('.work-video video', { scale: 0.5 });

        /* ─ 3. Per-card hover timelines ─────────────────────────── */
        document.querySelectorAll('.work-card').forEach(function (card) {
          var box = card.querySelector('.work-box');
          if (!box) return;
          var cover = box.querySelector('.work-cover');
          var blur = box.querySelector('.work-blur');
          var blend = box.querySelector('.work-color-blend');
          var videoWrap = box.querySelector('.work-video');
          var videoEl = videoWrap ? videoWrap.querySelector('video') : null;
          var text = box.querySelector('.work-text-bottom');

          var tl = null;

          card.addEventListener('mouseenter', function () {
            if (tl) tl.kill();
            tl = gsap.timeline();

            /* 1. 背景圖微放大 */
            if (cover) tl.to(cover, { scale: 1.05, duration: 0.6, ease: 'power1.inOut' }, 0);

            /* 2. 毛玻璃遂即顯現 */
            if (blur) tl.to(blur, { opacity: 1, duration: 0.1, ease: 'power1.in' }, 0);

            /* 3. 去色滾鸡層 */
            if (blend) tl.to(blend, { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, 0);

            /* 4. 影片 scale-in + 淡入 */
            if (videoWrap) tl.to(videoWrap, { opacity: 1, duration: 0.4, ease: 'power2.inOut' }, 0);
            if (videoEl) tl.to(videoEl, { scale: 1, duration: 0.4, ease: 'power2.inOut' }, 0);

            /* 5. 文字上滑顯現 */
            if (text) tl.to(text, { opacity: 1, y: 0, duration: 0.5, ease: 'power1.inOut' }, 0.05);
          });

          card.addEventListener('mouseleave', function () {
            if (tl) tl.kill();
            tl = gsap.timeline();

            if (cover) tl.to(cover, { scale: 1, duration: 0.5, ease: 'power1.inOut' }, 0);
            if (blur) tl.to(blur, { opacity: 0, duration: 0.35, ease: 'power1.out' }, 0);
            if (blend) tl.to(blend, { opacity: 0, duration: 0.45, ease: 'power1.inOut' }, 0);
            if (videoWrap) tl.to(videoWrap, { opacity: 0, duration: 0.35, ease: 'power2.inOut' }, 0);
            if (videoEl) tl.to(videoEl, { scale: 0.5, duration: 0.35, ease: 'power2.inOut' }, 0);
            if (text) tl.to(text, { opacity: 0, y: 30, duration: 0.3, ease: 'power1.inOut' }, 0);
          });

          /* Navigate on click if card has data-href */
          var href = card.getAttribute('data-href');
          var label = card.getAttribute('data-transition-label');
          if (href) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', function (e) {
              e.preventDefault();
              if (window.barba && label) {
                window.barba.go(href);
              } else {
                window.location.href = href;
              }
            });
          }
        });
      }

      /* ─ work-card 影片：桌機才載入 ────────────────────────────
         手機 / 平板 / 觸控裝置上 .work-video 是 display:none、且沒有 hover，
         影片完全用不到。原本 <source src> + preload="metadata" 會在這些裝置
         一載入就把 ~3MB 影片抓下來，餓死 lazy 封面圖（第二塊以後要等 ~2 秒）。
         改用 data-src，只有桌機（可 hover、精細指標、寬度 > 1024）才還原 src 載入。 */
      function hydrateWorkVideosForDesktop() {
        var isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth > 1024;
        if (!isDesktop) return; // 手機/觸控：完全不載，封面圖立即取得頻寬
        document.querySelectorAll('.work-video video').forEach(function (v) {
          var hydrated = false;
          v.querySelectorAll('source[data-src]').forEach(function (s) {
            if (!s.getAttribute('src')) { s.src = s.dataset.src; hydrated = true; }
          });
          if (hydrated) v.load();
        });
      }

      /* ─ 連結點擊邏輯：所有裝置都需要，獨立於 hover reveal ─── */
      function initCardLinks() {
        /* 已由 HTML <a> 標籤處理，無需 JS */
      }

      /* Init as soon as the DOM is parsed — GSAP is loaded synchronously in
         <head>, so we don't need to wait for window.load (images/videos). */
      function boot() {
        initCardLinks();
        hydrateWorkVideosForDesktop();
        initHoverReveal();
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
      } else {
        boot();
      }
    })();
  

(function () {
      var track = document.querySelector('.lab-marquee__track');
      if (track) {
        gsap.to(track, {
          x: '-50%',
          ease: 'none',
          scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1
          }
        });
      }

      gsap.from('.lab-marquee', {
        clipPath: 'inset(100% 0 0 0)',
        duration: 1.0,
        ease: 'power3.inOut',
        scrollTrigger: {
          trigger: '.lab-marquee',
          start: 'top 92%'
        }
      });

      (function () {
        var sepImgs = document.querySelectorAll('.lab-marquee__sep img');
        var half    = Math.round(sepImgs.length / 2);
        var period  = 3;
        sepImgs.forEach(function (img, i) {
          img.style.animationDelay = '-' + ((i % half) * (period / half)).toFixed(3) + 's';
        });
      })();
    })();
  

(function () {
      const footer = document.getElementById('site-footer');
      if (!footer || !window.gsap) return;

      const contactInfo = footer.querySelector('.footer-contact-info');
      const addrDiv     = footer.querySelector('.footer-main-content > div > div[style]');
      const navLinks    = footer.querySelector('.footer-nav-links');
      const thumb       = footer.querySelector('.footer-video-thumb');

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

      const navAnchors = navLinks ? [...navLinks.querySelectorAll('a')] : [];
      navAnchors.forEach(a => {
        const wrap = document.createElement('span');
        wrap.className = 'frev-wrap';
        a.parentNode.insertBefore(wrap, a);
        wrap.appendChild(a);
      });
      gsap.set(navAnchors, { y: '120%' });

      let videoCover = null;
      if (thumb) {
        videoCover = document.createElement('div');
        videoCover.className = 'footer-video-cover';
        thumb.appendChild(videoCover);
      }

      const tl = gsap.timeline({
        scrollTrigger: { trigger: footer, start: 'top 82%' }
      });

      if (contactEmail) tl.to(contactEmail, { y: '0%', duration: 1.2, ease: 'power4.out' }, 0);
      if (contactPhone) tl.to(contactPhone, { y: '0%', duration: 0.9, ease: 'power3.out' }, 0.2);
      if (addrDiv)      tl.from(addrDiv,    { y: 14, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.35);
      if (navAnchors.length) tl.to(navAnchors, { y: '0%', duration: 0.85, stagger: 0.07, ease: 'power4.out' }, 0.48);
      if (videoCover) {
        tl.fromTo(videoCover,
          { scaleX: 1 },
          { scaleX: 0, duration: 0.85, ease: 'power4.inOut', transformOrigin: 'right center' },
          0.1
        );
      }

      const parallaxBg = document.getElementById('footer-parallax-bg');
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
  

(function () {
      // 1. Lenis smooth scroll — exposed as window._lenis for transitions.js
      var lenis = new Lenis({
        duration: 1.2,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.85,
        touchMultiplier: 1.2,
      });
      window._lenis = lenis;
      function raf(time) { lenis.raf(time); window.requestAnimationFrame(raf); }
      window.requestAnimationFrame(raf);
    })();
  