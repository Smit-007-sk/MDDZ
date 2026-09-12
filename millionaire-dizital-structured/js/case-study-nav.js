(function () {
  'use strict';

  function initCaseStudyNav() {
    const container = document.getElementById('nav_scroll_container');
    const menuBtn = document.getElementById('nav-scroll-menu-btn');
    const dropdown = document.getElementById('nav-scroll-dropdown');
    const body = document.body;

    if (!container || !menuBtn) return;

    let isOpen = false;

    function openMenu() {
      isOpen = true;
      container.classList.add('is-menu-open');
      body.classList.add('nav-menu-open');
      menuBtn.setAttribute('aria-expanded', 'true');
      if (dropdown) dropdown.setAttribute('aria-hidden', 'false');

      // Animate hamburger to cross
      const l1 = menuBtn.querySelector('.ns-ham-l1');
      const l2 = menuBtn.querySelector('.ns-ham-l2');
      if (l1 && l2 && window.gsap) {
        gsap.to(l1, { rotation: 45, transformOrigin: 'center center', y: 3, duration: 0.35, ease: 'power2.out' });
        gsap.to(l2, { rotation: -45, transformOrigin: 'center center', y: -3, duration: 0.35, ease: 'power2.out' });
      }
    }

    function closeMenu() {
      isOpen = false;
      container.classList.remove('is-menu-open');
      body.classList.remove('nav-menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      if (dropdown) dropdown.setAttribute('aria-hidden', 'true');

      // Revert hamburger
      const l1 = menuBtn.querySelector('.ns-ham-l1');
      const l2 = menuBtn.querySelector('.ns-ham-l2');
      if (l1 && l2 && window.gsap) {
        gsap.to(l1, { rotation: 0, y: 0, duration: 0.35, ease: 'power2.out' });
        gsap.to(l2, { rotation: 0, y: 0, duration: 0.35, ease: 'power2.out' });
      }
    }

    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close on ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
      }
    });

    // Setup hover thumbnail previews for menu rows
    const showcaseRows = document.querySelectorAll('.ns-showcase-row');
    showcaseRows.forEach(function (row) {
      const leftThumb = row.querySelector('.ns-showcase-row__thumb.is-left');
      const rightThumb = row.querySelector('.ns-showcase-row__thumb.is-right');

      row.addEventListener('mouseenter', function () {
        if (leftThumb && window.gsap) {
          gsap.to(leftThumb, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
        }
        if (rightThumb && window.gsap) {
          gsap.to(rightThumb, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
        }
      });

      row.addEventListener('mouseleave', function () {
        if (leftThumb && window.gsap) {
          gsap.to(leftThumb, { opacity: 0, scale: 0.85, duration: 0.3, ease: 'power2.in' });
        }
        if (rightThumb && window.gsap) {
          gsap.to(rightThumb, { opacity: 0, scale: 0.85, duration: 0.3, ease: 'power2.in' });
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCaseStudyNav);
  } else {
    initCaseStudyNav();
  }
})();
