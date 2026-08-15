document.addEventListener("DOMContentLoaded", function () {

  // ── 1. Lenis Smooth Scroll ──────────────────────────────────
  let lenis = window._lenis || null;
  if (!lenis && typeof Lenis !== "undefined") {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    window._lenis = lenis;
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  // ── 2. Navbar Toggle ────────────────────────────────────────
  const navBtn = document.getElementById("nav-scroll-menu-btn");
  const navContainer = document.getElementById("nav_scroll_container");
  const dropdown = document.getElementById("nav-scroll-dropdown");

  if (navBtn && navContainer && dropdown) {
    navBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = navContainer.classList.toggle("is-menu-open");
      navBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      dropdown.setAttribute("aria-hidden", isOpen ? "false" : "true");
      if (lenis) {
        isOpen ? lenis.stop() : lenis.start();
      }
    });

    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navContainer.classList.contains("is-menu-open")) {
        navContainer.classList.remove("is-menu-open");
        navBtn.setAttribute("aria-expanded", "false");
        dropdown.setAttribute("aria-hidden", "true");
        if (lenis) lenis.start();
      }
    });
  }

  // ── 3. GSAP Scroll Animations ───────────────────────────────
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);

    // Hero heading reveal
    gsap.fromTo(".ai-hero__eyebrow",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.3 }
    );
    gsap.fromTo(".ai-hero__heading",
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", delay: 0.5 }
    );
    gsap.fromTo(".ai-hero__sub",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.9 }
    );

    // Section reveals
    gsap.utils.toArray(".ai-service-card").forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
          delay: i * 0.08,
          scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none none" }
        }
      );
    });

    gsap.utils.toArray(".ai-process-item").forEach((item, i) => {
      gsap.fromTo(item,
        { opacity: 0, x: -30 },
        {
          opacity: 1, x: 0, duration: 0.7, ease: "power2.out",
          delay: i * 0.07,
          scrollTrigger: { trigger: item, start: "top 88%", toggleActions: "play none none none" }
        }
      );
    });

    gsap.utils.toArray(".ai-case-card").forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, scale: 0.94 },
        {
          opacity: 1, scale: 1, duration: 0.8, ease: "power3.out",
          delay: i * 0.1,
          scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none none" }
        }
      );
    });

    gsap.utils.toArray(".ai-stat-cell__num").forEach((el) => {
      gsap.fromTo(el,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" }
        }
      );
    });

    // Section titles
    gsap.utils.toArray(".ai-section-title").forEach((el) => {
      gsap.fromTo(el,
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0, duration: 1, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" }
        }
      );
    });
  }

  // ── 4. Animated counter for stat numbers ────────────────────
  function animateCountUp(el) {
    const target = parseFloat(el.getAttribute("data-target") || "0");
    const suffix = el.getAttribute("data-suffix") || "";
    const decimals = el.getAttribute("data-decimals") || "0";
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const value = (target * eased).toFixed(parseInt(decimals));
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCountUp(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll(".js-count-up").forEach((el) => observer.observe(el));
  }

  // ── 5. Film grain canvas ────────────────────────────────────
  const canvas = document.getElementById("ai-grain-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    function drawGrain() {
      const w = canvas.width, h = canvas.height;
      const img = ctx.createImageData(w, h);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255 | 0;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 18;
      }
      ctx.putImageData(img, 0, 0);
      requestAnimationFrame(drawGrain);
    }
    drawGrain();
  }

});
