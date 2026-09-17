/* ─────────────────────────────────────────────────────────────────
       Hover Reveal — GSAP-driven overlay animations
       Clean hover state: actual image zoom + elegant 'VIEW PROJECT' tag
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

          /* Slide-up text */
          var text = document.createElement('div');
          text.className = 'work-text-bottom';
          text.setAttribute('aria-hidden', 'true');
          var metaIdx = card.querySelector('.work-meta span:first-child');
          text.innerHTML =
            '<span class="work-text-bottom__index">' + (metaIdx ? metaIdx.textContent.trim() : '') + '</span>' +
            '<span class="work-text-bottom__action">VIEW PROJECT ↗</span>';

          box.appendChild(text);
        });

        /* ─ 2. GSAP initial states ─────────────────────────────── */
        gsap.set('.work-text-bottom', { opacity: 0, y: 20 });

        /* ─ 3. Per-card hover timelines ─────────────────────────── */
        document.querySelectorAll('.work-card').forEach(function (card) {
          var box = card.querySelector('.work-box');
          if (!box) return;
          var cover = box.querySelector('.work-cover');
          var text = box.querySelector('.work-text-bottom');

          var tl = null;

          card.addEventListener('mouseenter', function () {
            if (tl) tl.kill();
            tl = gsap.timeline();

            /* 1. Actual project image zooms smoothly and stays vibrant */
            if (cover) tl.to(cover, { scale: 1.05, filter: 'brightness(1.05) saturate(1.05)', duration: 0.5, ease: 'power2.out' }, 0);

            /* 2. Text badge slides up */
            if (text) tl.to(text, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.05);
          });

          card.addEventListener('mouseleave', function () {
            if (tl) tl.kill();
            tl = gsap.timeline();

            if (cover) tl.to(cover, { scale: 1, filter: 'brightness(0.96) saturate(0.98)', duration: 0.45, ease: 'power2.out' }, 0);
            if (text) tl.to(text, { opacity: 0, y: 20, duration: 0.3, ease: 'power2.in' }, 0);
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

      function hydrateWorkVideosForDesktop() {
        // Videos removed in favor of actual high-res project artwork
      }

      function initCardLinks() {
        /* Handled by standard anchor tags */
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
      // 1. Lenis smooth scroll — managed by smooth-scroll.js
      if (!window._lenis && typeof window.initSmoothScroll === 'function') {
        window.initSmoothScroll();
      }
    })();
  