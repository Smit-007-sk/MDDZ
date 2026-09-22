(function() {
    'use strict';

    var TRANSITION_KEY = 'mdz:page-transition';
    var TRANSITION_TTL = 12000;
    var gsap = window.gsap;
    var state = {
        leaving: false,
        entryCleanupTimer: null,
        entryFailSafeTimer: null,
    };
    var sharedMenuState = {
        open: false,
        animating: false,
        openTl: null,
        closeTl: null,
        phaseTimer: null,
        finishTimer: null,
    };

    function readPayload() {
        try {
            var raw = window.sessionStorage.getItem(TRANSITION_KEY);
            if (!raw) return null;
            var payload = JSON.parse(raw);
            if (!payload || !payload.at || Date.now() - payload.at > TRANSITION_TTL) {
                window.sessionStorage.removeItem(TRANSITION_KEY);
                return null;
            }
            return payload;
        } catch (error) {
            try {
                window.sessionStorage.removeItem(TRANSITION_KEY);
            } catch (ignored) {}
            return null;
        }
    }

    function consumePayload() {
        var payload = readPayload();
        if (!payload) return null;
        try {
            window.sessionStorage.removeItem(TRANSITION_KEY);
        } catch (ignored) {}
        return payload;
    }

    function normalizePathname(pathname) {
        return pathname.replace(/\/index\.html$/i, '/').replace(/\/$/, '') || '/';
    }

    function isSameDocument(url) {
        var current = normalizePathname(window.location.pathname);
        var next = normalizePathname(url.pathname);
        return current === next;
    }

    function getLenis() {
        return window._lenis || null;
    }

    function stopLenis() {
        var lenis = getLenis();
        if (!lenis || typeof lenis.stop !== 'function') return;
        try {
            lenis.stop();
        } catch (error) {}
    }

    function startLenis() {
        var lenis = getLenis();
        if (!lenis || typeof lenis.start !== 'function') return;
        try {
            lenis.start();
        } catch (error) {}
    }

    function scrollToTarget(target) {
        if (!target) return;
        var lenis = getLenis();
        if (lenis && typeof lenis.scrollTo === 'function') {
            try {
                lenis.scrollTo(target, {
                    duration: 1.15,
                    offset: -24
                });
                return;
            } catch (error) {}
        }
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    function getShellRefs() {
        var shell = document.querySelector('.js-page-transition-shell');
        if (!shell) return { shell: null };

        var scrim = shell.querySelector('.page-transition-scrim');
        if (!scrim) {
            scrim = document.createElement('div');
            scrim.className = 'page-transition-scrim js-page-transition-scrim';
            scrim.setAttribute('aria-hidden', 'true');
            shell.appendChild(scrim);
        }

        var progress = shell.querySelector('.page-transition-progress');
        if (!progress) {
            progress = document.createElement('div');
            progress.className = 'page-transition-progress js-page-transition-progress';
            shell.appendChild(progress);
        }

        var badge = shell.querySelector('.page-transition-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'page-transition-badge js-page-transition-badge';
            badge.innerHTML = '<span class="page-transition-badge__logo">MILLIONAIRE</span><div class="page-transition-badge__line"></div><span class="page-transition-badge__label js-page-transition-badge-label">STUDIO</span>';
            scrim.appendChild(badge);
        }

        var badgeLabel = shell.querySelector('.js-page-transition-badge-label');

        return {
            shell: shell,
            scrim: scrim,
            progress: progress,
            badge: badge,
            badgeLabel: badgeLabel
        };
    }

    function deriveLabel(url, fallback) {
        if (fallback) return fallback.trim().toUpperCase();
        if (url.hash) {
            return url.hash.replace(/^#/, '').replace(/[-_]+/g, ' ').trim().toUpperCase() || 'SECTION';
        }
        var pathname = url.pathname.toLowerCase();
        if (pathname.endsWith('/work.html') || pathname.endsWith('work.html')) return 'WORK';
        if (pathname.endsWith('/project.html') || pathname.endsWith('project.html')) return 'WORK';
        if (pathname.endsWith('/about.html') || pathname.endsWith('about.html')) return 'ABOUT';
        if (pathname.endsWith('/contact.html') || pathname.endsWith('contact.html')) return 'CONTACT';
        if (pathname.endsWith('/mdz-makes-ai.html') || pathname.endsWith('mdz-makes-ai.html')) return 'AI AUTOMATION';
        if (pathname.endsWith('/index.html') || pathname === '/' || pathname === '') return 'HOME';
        var last = pathname.split('/').filter(Boolean).pop() || 'PAGE';
        return last.replace(/\.html$/i, '').replace(/[-_]+/g, ' ').trim().toUpperCase();
    }

    function finalizeEntryTransition(refs) {
        if (state.entryCleanupTimer) {
            window.clearTimeout(state.entryCleanupTimer);
            state.entryCleanupTimer = null;
        }
        state.leaving = false;

        var g = window.gsap || gsap;

        if (refs) {
            if (refs.shell) {
                refs.shell.classList.remove('is-active');
                refs.shell.style.opacity = '0';
                refs.shell.style.visibility = 'hidden';
                refs.shell.style.pointerEvents = 'none';
            }
            if (refs.scrim) {
                refs.scrim.style.opacity = '0';
                refs.scrim.style.visibility = 'hidden';
                refs.scrim.style.pointerEvents = 'none';
            }
            if (refs.progress) {
                refs.progress.style.opacity = '0';
                refs.progress.style.transform = 'scaleX(0)';
            }

            if (g) {
                if (refs.scrim) g.killTweensOf(refs.scrim);
                if (refs.progress) g.killTweensOf(refs.progress);
                if (refs.badge) g.killTweensOf(refs.badge);
                if (refs.shell) g.killTweensOf(refs.shell);
                if (refs.scrim) g.set(refs.scrim, { opacity: 0 });
                if (refs.progress) g.set(refs.progress, { scaleX: 0, opacity: 0 });
                if (refs.shell) g.set(refs.shell, { autoAlpha: 0 });
            }
        }

        var mainEl = document.querySelector('main') || document.querySelector('.site-wrapper') || document.querySelector('.work-archive') || document.body;
        if (mainEl) {
            mainEl.style.opacity = '1';
            mainEl.style.visibility = 'visible';
            if (g) {
                g.killTweensOf(mainEl);
                g.set(mainEl, { opacity: 1, y: 0, autoAlpha: 1, clearProps: 'transform' });
            }
        }

        document.documentElement.classList.remove('has-pending-page-transition', 'is-page-transitioning');
        document.body && document.body.classList.remove('has-pending-page-transition', 'is-page-transitioning');
        document.body && (document.body.style.opacity = '1');
        document.body && (document.body.style.visibility = 'visible');

        startLenis();
        if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
            try { window.ScrollTrigger.refresh(); } catch (e) {}
        }
    }

    function playEntryTransition(payload) {
        var refs = getShellRefs();
        if (!refs.shell) {
            document.documentElement.classList.remove('has-pending-page-transition', 'is-page-transitioning');
            startLenis();
            return;
        }

        if (!payload) {
            finalizeEntryTransition(refs);
            return;
        }

        var destination = new URL(payload.href || window.location.href, window.location.href);
        var targetLabel = deriveLabel(destination, payload.label || '');
        if (refs.badgeLabel) {
            refs.badgeLabel.textContent = targetLabel || 'STUDIO';
        }

        refs.shell.classList.add('is-active');

        var g = window.gsap || gsap;
        if (!g) {
            finalizeEntryTransition(refs);
            return;
        }

        if (state.entryCleanupTimer) {
            window.clearTimeout(state.entryCleanupTimer);
            state.entryCleanupTimer = null;
        }

        state.entryCleanupTimer = window.setTimeout(function() {
            finalizeEntryTransition(refs);
        }, 1200);

        var mainEl = document.querySelector('main') || document.querySelector('.site-wrapper') || document.body;

        var tl = g.timeline({
            onComplete: function() {
                finalizeEntryTransition(refs);
            }
        });

        // 1. Progress bar completes to 100% then fades
        tl.fromTo(refs.progress, {
            scaleX: 0.85,
            opacity: 1
        }, {
            scaleX: 1,
            duration: 0.22,
            ease: 'power2.out'
        }, 0);

        // 2. Scrim and badge smoothly fade out
        tl.to(refs.scrim, {
            opacity: 0,
            duration: 0.38,
            ease: 'power2.out'
        }, 0.06);

        tl.to(refs.progress, {
            opacity: 0,
            duration: 0.2,
            ease: 'power1.out'
        }, 0.2);

        // 3. New page content slides up smoothly from y: 20 to 0
        if (mainEl) {
            tl.fromTo(mainEl, {
                opacity: 0,
                y: 18
            }, {
                opacity: 1,
                y: 0,
                duration: 0.44,
                ease: 'power3.out',
                clearProps: 'transform'
            }, 0.04);
        }
    }

    function armEntryFailSafe(payload) {
        function finalizeIfStuck() {
            state.entryFailSafeTimer = null;
            if (state.leaving) return;
            var refs = getShellRefs();
            finalizeEntryTransition(refs);
        }

        function schedule(delay) {
            if (state.entryFailSafeTimer) {
                window.clearTimeout(state.entryFailSafeTimer);
            }
            state.entryFailSafeTimer = window.setTimeout(finalizeIfStuck, delay);
        }

        schedule(800);
        window.addEventListener('load', function() {
            schedule(300);
        }, { once: true });
        window.addEventListener('pageshow', function() {
            schedule(300);
        }, { once: true });
    }

    function navigateWithTransition(href, label) {
        if (state.leaving) return;
        state.leaving = true;

        if (state.entryCleanupTimer) {
            window.clearTimeout(state.entryCleanupTimer);
            state.entryCleanupTimer = null;
        }
        if (state.entryFailSafeTimer) {
            window.clearTimeout(state.entryFailSafeTimer);
            state.entryFailSafeTimer = null;
        }

        var refs = getShellRefs();
        var destination = new URL(href, window.location.href);
        var targetLabel = deriveLabel(destination, label || '');

        try {
            window.sessionStorage.setItem(TRANSITION_KEY, JSON.stringify({
                href: destination.href,
                label: targetLabel,
                at: Date.now()
            }));
        } catch (error) {}

        stopLenis();
        document.documentElement.classList.add('is-page-transitioning');

        if (!refs.shell || !gsap) {
            window.location.href = destination.href;
            return;
        }

        if (refs.badgeLabel) {
            refs.badgeLabel.textContent = targetLabel || 'STUDIO';
        }

        refs.shell.classList.add('is-active');
        gsap.set(refs.shell, { autoAlpha: 1 });

        var navigated = false;
        function go() {
            if (navigated) return;
            navigated = true;
            window.location.href = destination.href;
        }

        var fallbackTimer = window.setTimeout(go, 750);

        var tl = gsap.timeline({
            onComplete: function() {
                window.clearTimeout(fallbackTimer);
                go();
            }
        });

        // 1. Top gold progress bar sweep
        tl.fromTo(refs.progress, {
            scaleX: 0,
            opacity: 1
        }, {
            scaleX: 0.85,
            duration: 0.3,
            ease: 'power2.inOut'
        }, 0);

        // 2. Smooth luxury fade & subtle upward slide of scrim
        tl.fromTo(refs.scrim, {
            opacity: 0
        }, {
            opacity: 1,
            duration: 0.28,
            ease: 'power2.inOut'
        }, 0);

        tl.fromTo(refs.badge, {
            opacity: 0,
            y: 10
        }, {
            opacity: 1,
            y: 0,
            duration: 0.26,
            ease: 'power3.out'
        }, 0.04);

        // 3. Subtle page content fade out
        var mainEl = document.querySelector('main') || document.querySelector('.site-wrapper') || document.body;
        if (mainEl) {
            tl.to(mainEl, {
                opacity: 0.35,
                y: -10,
                duration: 0.26,
                ease: 'power2.in'
            }, 0);
        }
    }

    window._mdzNavigate = navigateWithTransition;

    function initLinkRouting() {
        document.addEventListener('click', function(event) {
            var link = event.target.closest('a[href]');
            if (!link || event.defaultPrevented) return;
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (link.target === '_blank' || link.hasAttribute('download')) return;

            var rawHref = link.getAttribute('href');
            if (!rawHref || rawHref.indexOf('mailto:') === 0 || rawHref.indexOf('tel:') === 0 || rawHref.indexOf('javascript:') === 0) {
                return;
            }

            var destination = new URL(rawHref, window.location.href);
            if (destination.origin !== window.location.origin) return;

            if (rawHref.charAt(0) === '#' || isSameDocument(destination)) {
                if (!destination.hash) return;
                var target = document.querySelector(destination.hash);
                if (!target) return;
                event.preventDefault();
                closeSharedMenu(false);
                scrollToTarget(target);
                return;
            }

            event.preventDefault();
            var transitionLabel = link.dataset.transitionLabel || link.textContent || '';
            var navContainer = document.getElementById('nav_scroll_container');
            if (document.body.classList.contains('shared-nav-page') && navContainer && (navContainer.classList.contains('is-menu-open') || sharedMenuState.animating)) {
                document.documentElement.classList.add('is-menu-link-transition');
                closeSharedMenu(false, function() {
                    document.documentElement.classList.remove('is-menu-link-transition');
                    navigateWithTransition(destination.href, transitionLabel);
                });
                return;
            }

            var navContainerEl = document.getElementById('nav_scroll_container');
            var menuIsOpen = !!(navContainerEl && navContainerEl.classList.contains('is-menu-open'));
            if (menuIsOpen) {
                document.documentElement.classList.add('is-menu-link-transition');
                closeSharedMenu(false, function() {
                    document.documentElement.classList.remove('is-menu-link-transition');
                    navigateWithTransition(destination.href, transitionLabel);
                });
            } else {
                closeSharedMenu(true);
                navigateWithTransition(destination.href, transitionLabel);
            }
        }, false);
    }

    function getMenuClosedWidth() {
        var inset = window.innerWidth <= 767 ? 24 : 80;
        return Math.min(500, Math.max(280, window.innerWidth - inset));
    }

    function getMenuClosedTop() {
        return window.innerWidth <= 767 ? 16 : 30;
    }

    function getMenuCollapsedTop() {
        return getMenuClosedTop() + 30;
    }

    function killSharedMenuTimeline(key) {
        if (!sharedMenuState[key]) return;
        sharedMenuState[key].kill();
        sharedMenuState[key] = null;
    }

    function clearSharedMenuFinishTimer() {
        if (!sharedMenuState.finishTimer) return;
        window.clearTimeout(sharedMenuState.finishTimer);
        sharedMenuState.finishTimer = null;
    }

    function clearSharedMenuPhaseTimer() {
        if (!sharedMenuState.phaseTimer) return;
        window.clearTimeout(sharedMenuState.phaseTimer);
        sharedMenuState.phaseTimer = null;
    }

    function clearSharedMenuTimers() {
        clearSharedMenuPhaseTimer();
        clearSharedMenuFinishTimer();
    }

    function scheduleSharedMenuFinish(callback, delay) {
        clearSharedMenuFinishTimer();
        sharedMenuState.finishTimer = window.setTimeout(function() {
            sharedMenuState.finishTimer = null;
            callback();
        }, delay);
    }

    function scheduleSharedMenuPhase(callback, delay) {
        clearSharedMenuPhaseTimer();
        sharedMenuState.phaseTimer = window.setTimeout(function() {
            sharedMenuState.phaseTimer = null;
            callback();
        }, delay);
    }

    function syncSharedMenuLayoutVars(container) {
        if (!container) return;
        container.style.setProperty('--ns-menu-collapse-top', getMenuCollapsedTop() + 'px');
        container.style.setProperty('--ns-menu-closed-width', getMenuClosedWidth() + 'px');
    }

    function setSharedMenuShellStyles(container, styles) {
        if (!container) return;
        Object.keys(styles).forEach(function(key) {
            container.style[key] = styles[key];
        });
    }

    function clearSharedMenuShellStyles(container) {
        if (!container) return;
        container.style.removeProperty('top');
        container.style.removeProperty('left');
        container.style.removeProperty('width');
        container.style.removeProperty('max-width');
        container.style.removeProperty('height');
        container.style.removeProperty('border-radius');
        container.style.removeProperty('transform');
        container.style.removeProperty('background-color');
    }

    function finishSharedMenuOpen(container, dropdown) {
        clearSharedMenuTimers();
        sharedMenuState.animating = false;
        container.classList.remove('is-menu-animating', 'is-menu-phase-compact', 'is-menu-phase-line');
        sharedMenuState.openTl = null;
    }

    function finishSharedMenuClosed(container, dropdown, items) {
        clearSharedMenuTimers();
        setMenuExpanded(container, false);
        sharedMenuState.animating = false;
        container.classList.remove('is-menu-animating', 'is-menu-phase-compact', 'is-menu-phase-line');
        clearSharedMenuShellStyles(container);
        sharedMenuState.closeTl = null;
    }

    function setMenuExpanded(container, expanded) {
        var menuBtn = document.getElementById('nav-scroll-menu-btn');
        var dropdown = document.getElementById('nav-scroll-dropdown');
        if (!container || !menuBtn || !dropdown) return;

        sharedMenuState.open = expanded;
        container.classList.toggle('is-menu-open', expanded);
        document.body.classList.toggle('nav-menu-open', expanded);
        menuBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        menuBtn.setAttribute('aria-label', expanded ? 'Close menu' : 'Open menu');
        menuBtn.dataset.cursor = expanded ? 'CLOSE' : 'OPEN';
        dropdown.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    }

    function animateMenuItems(expanded) {
        var items = Array.prototype.slice.call(document.querySelectorAll('#nav-scroll-dropdown .ns-dropdown__item'));
        if (!items.length || !gsap) return;

        if (expanded) {
            gsap.fromTo(items, {
                autoAlpha: 0,
                y: 18
            }, {
                autoAlpha: 1,
                y: 0,
                duration: 0.44,
                stagger: 0.05,
                ease: 'power3.out',
                overwrite: 'auto'
            });
            return;
        }

        gsap.to(items, {
            autoAlpha: 0,
            y: 18,
            filter: 'blur(8px)',
            duration: 0.18,
            ease: 'power2.in',
            stagger: 0.02,
            overwrite: 'auto'
        });
    }

    function isSimpleTouchNavMode() {
        return window.innerWidth <= 1280;
    }

    function previewRow(row) {
        if (!row) return;
        if (isSimpleTouchNavMode()) {
            clearPreviewRow();
            return;
        }
        var rows = document.querySelectorAll('#nav-scroll-dropdown .ns-showcase-row');
        rows.forEach(function(item) {
            item.classList.toggle('is-previewed', item === row);
        });
    }

    function clearPreviewRow(row) {
        var rows = document.querySelectorAll('#nav-scroll-dropdown .ns-showcase-row');
        if (!row) {
            rows.forEach(function(item) {
                item.classList.remove('is-previewed');
            });
            return;
        }
        row.classList.remove('is-previewed');
    }

    function closeSharedMenu(skipAnimation, onClosed) {
        var container = document.getElementById('nav_scroll_container');
        var dropdown = document.getElementById('nav-scroll-dropdown');
        var items = Array.prototype.slice.call(document.querySelectorAll('#nav-scroll-dropdown .ns-dropdown__item'));
        var done = typeof onClosed === 'function' ? onClosed : null;
        if (!container) {
            if (done) done();
            return;
        }
        if (!container.classList.contains('is-menu-open') && !sharedMenuState.animating) {
            if (done) done();
            return;
        }

        killSharedMenuTimeline('openTl');

        clearSharedMenuTimers();
        sharedMenuState.animating = true;
        sharedMenuState.open = false;
        syncSharedMenuLayoutVars(container);
        clearSharedMenuShellStyles(container);
        container.classList.add('is-menu-animating');
        container.classList.remove('ns-enter', 'ns-exit');

        startLenis();

        if (skipAnimation) {
            killSharedMenuTimeline('closeTl');
            finishSharedMenuClosed(container, dropdown, items);
            if (done) done();
            return;
        }

        container.classList.remove('is-menu-phase-compact');
        container.classList.add('is-menu-phase-line');

        scheduleSharedMenuPhase(function() {
            container.classList.remove('is-menu-phase-line');
            container.classList.add('is-menu-phase-compact');

            scheduleSharedMenuPhase(function() {
                setMenuExpanded(container, false);
                container.classList.remove('is-menu-phase-compact');
                setSharedMenuShellStyles(container, {
                    top: getMenuClosedTop() + 'px',
                    left: '50%',
                    width: getMenuClosedWidth() + 'px',
                    height: '64px',
                    borderRadius: '6px',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#141414'
                });
            }, 250);
        }, 220);

        scheduleSharedMenuFinish(function() {
            finishSharedMenuClosed(container, dropdown, items);
            if (done) done();
        }, 780);
    }

    function initSharedMenu() {
        if (!document.body.classList.contains('shared-nav-page')) return;

        var container = document.getElementById('nav_scroll_container');
        var menuBtn = document.getElementById('nav-scroll-menu-btn');
        var dropdown = document.getElementById('nav-scroll-dropdown');
        if (!container || !menuBtn || !dropdown) return;

        var items = Array.prototype.slice.call(dropdown.querySelectorAll('.ns-dropdown__item'));

        setMenuExpanded(container, false);
        container.classList.remove('is-menu-animating', 'is-menu-phase-compact', 'is-menu-phase-line');

        menuBtn.addEventListener('click', function() {
            var expanded = sharedMenuState.open;
            killSharedMenuTimeline('closeTl');

            if (expanded) {
                closeSharedMenu(false);
                return;
            }

            clearSharedMenuTimers();
            sharedMenuState.animating = true;
            sharedMenuState.open = true;
            syncSharedMenuLayoutVars(container);
            clearSharedMenuShellStyles(container);
            container.classList.add('is-menu-animating');
            container.classList.remove('ns-enter', 'ns-exit');
            setMenuExpanded(container, true);
            container.classList.add('is-menu-phase-compact');

            stopLenis();
            container.classList.remove('is-menu-phase-line');

            scheduleSharedMenuPhase(function() {
                container.classList.remove('is-menu-phase-compact');
                container.classList.add('is-menu-phase-line');

                scheduleSharedMenuPhase(function() {
                    container.classList.remove('is-menu-phase-line');
                    setSharedMenuShellStyles(container, {
                        top: '0px',
                        left: '0px',
                        width: '100vw',
                        maxWidth: '100vw',
                        height: '100vh',
                        borderRadius: '0px',
                        transform: 'none',
                        backgroundColor: '#ffffff'
                    });
                }, 250);
            }, 220);

            scheduleSharedMenuFinish(function() {
                finishSharedMenuOpen(container, dropdown);
            }, 860);
        });

        document.addEventListener('click', function(event) {
            if (!container.classList.contains('is-menu-open')) return;
            if (container.contains(event.target)) return;
            closeSharedMenu();
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') closeSharedMenu();
        });

        window.addEventListener('resize', function() {
            if (isSimpleTouchNavMode()) clearPreviewRow();
        }, {
            passive: true
        });

        Array.prototype.slice.call(dropdown.querySelectorAll('.ns-showcase-row')).forEach(function(row) {
            row.addEventListener('mouseenter', function() {
                previewRow(row);
            });
            row.addEventListener('mouseleave', function() {
                clearPreviewRow(row);
            });
            row.addEventListener('focus', function() {
                previewRow(row);
            });
            row.addEventListener('blur', function() {
                clearPreviewRow(row);
            });
        });

    }

    function initIndexSyncedSharedNav() {
        if (!document.body.classList.contains('index-nav-sync')) return;

        var container = document.getElementById('nav_scroll_container');
        var progressBar = document.getElementById('scroll-progress');
        if (!container) return;

        var visibleOnLoad = document.body.classList.contains('nav-visible-on-load');
        var showing = false;
        var raf = 0;
        var hideTimer = null;
        var enterTimer = null;
        var exitTimer = null;
        var lenisHooked = false;

        function clearEnterTimer() {
            if (!enterTimer) return;
            window.clearTimeout(enterTimer);
            enterTimer = null;
        }

        function clearExitTimer() {
            if (!exitTimer) return;
            window.clearTimeout(exitTimer);
            exitTimer = null;
        }

        function getScrollTop() {
            return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        }

        function updateProgress() {
            if (!progressBar) return;
            var doc = document.documentElement;
            var max = Math.max(1, doc.scrollHeight - window.innerHeight);
            var progress = Math.max(0, Math.min(1, getScrollTop() / max));
            progressBar.style.width = (progress * 100).toFixed(2) + '%';
        }

        function setInteractive(active) {
            if (active || container.classList.contains('is-menu-open')) {
                container.removeAttribute('inert');
                container.style.pointerEvents = 'auto';
                return;
            }

            if (container.contains(document.activeElement) && document.activeElement && document.activeElement.blur) {
                document.activeElement.blur();
            }
            container.setAttribute('inert', '');
            container.style.pointerEvents = 'none';
        }

        function showNav() {
            if (showing) return;
            showing = true;
            if (hideTimer) {
                window.clearTimeout(hideTimer);
                hideTimer = null;
            }
            clearEnterTimer();
            clearExitTimer();
            document.documentElement.classList.add('show-nav-scroll');
            container.classList.remove('ns-exit');
            container.classList.add('ns-enter');
            setInteractive(true);
            enterTimer = window.setTimeout(function() {
                container.classList.remove('ns-enter');
                enterTimer = null;
            }, 700);
        }

        function hideNav() {
            if (!showing) return;
            showing = false;
            clearEnterTimer();
            clearExitTimer();
            document.documentElement.classList.remove('show-nav-scroll');
            closeSharedMenu(true);
            container.classList.remove('ns-enter');
            container.classList.add('ns-exit');
            setInteractive(false);
            exitTimer = window.setTimeout(function() {
                if (!showing) {
                    container.classList.remove('ns-exit');
                }
                exitTimer = null;
            }, 520);
            hideTimer = window.setTimeout(function() {
                if (!showing && !container.classList.contains('is-menu-open')) setInteractive(false);
            }, 520);
        }

        function syncFromScroll(scrollTop) {
            updateProgress();
            if (visibleOnLoad || scrollTop > 300) showNav();
            else hideNav();
        }

        function scheduleSync() {
            if (raf) return;
            raf = window.requestAnimationFrame(function() {
                raf = 0;
                syncFromScroll(getScrollTop());
            });
        }

        function hookLenis() {
            var lenis = getLenis();
            if (lenisHooked || !lenis || typeof lenis.on !== 'function') return;
            lenisHooked = true;
            lenis.on('scroll', function(event) {
                var scrollTop = event && typeof event.scroll === 'number' ? event.scroll : getScrollTop();
                syncFromScroll(scrollTop);
            });
        }

        setInteractive(false);
        scheduleSync();
        window.addEventListener('scroll', scheduleSync, {
            passive: true
        });
        window.addEventListener('resize', scheduleSync, {
            passive: true
        });
        hookLenis();
        window.setTimeout(function() {
            hookLenis();
            scheduleSync();
        }, 100);
        window.setTimeout(function() {
            hookLenis();
            scheduleSync();
        }, 300);
        window.setTimeout(function() {
            hookLenis();
            scheduleSync();
        }, 1000);
    }

    function initBarbaMarkers() {
        if (!window.barba) return;
        document.documentElement.setAttribute('data-barba-mode', 'reload-safe');
    }

    //  bfcache （）—  Lenis / ScrollTrigger /  / 
    // ： stopLenis()，bfcache  Lenis ，
    function restoreFromBfcache() {
        // 1.  +  CSS class
        state.leaving = false;
        if (state.entryCleanupTimer) {
            window.clearTimeout(state.entryCleanupTimer);
            state.entryCleanupTimer = null;
        }
        if (state.entryFailSafeTimer) {
            window.clearTimeout(state.entryFailSafeTimer);
            state.entryFailSafeTimer = null;
        }
        document.documentElement.classList.remove(
            'has-pending-page-transition',
            'is-page-transitioning',
            'is-menu-link-transition'
        );
        try {
            window.sessionStorage.removeItem(TRANSITION_KEY);
        } catch (ignored) {}

        // 2.  shell（curtain / shell ）
        var refs = getShellRefs();
        finalizeEntryTransition(refs);

        // 3. 【】 Lenis， scroll target 
        //    ,Lenis , = 
        var lenis = getLenis();
        if (lenis) {
            try {
                if (typeof lenis.start === 'function') lenis.start();
                var currentY = window.scrollY || document.documentElement.scrollTop || 0;
                if (typeof lenis.scrollTo === 'function') {
                    lenis.scrollTo(currentY, {
                        immediate: true,
                        force: true
                    });
                }
            } catch (err) { /* ignore */ }
        }

        // 4.  ScrollTrigger,（ scroll ）
        if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
            try {
                window.ScrollTrigger.refresh();
            } catch (err) { /* ignore */ }
        }

        // 5. ，
        var navContainer = document.getElementById('nav_scroll_container');
        if (navContainer) {
            killSharedMenuTimeline('openTl');
            killSharedMenuTimeline('closeTl');
            clearSharedMenuTimers();
            sharedMenuState.animating = false;
            sharedMenuState.open = false;
            navContainer.classList.remove(
                'is-menu-animating',
                'is-menu-phase-compact',
                'is-menu-phase-line',
                'is-menu-open',
                'ns-enter',
                'ns-exit'
            );
            clearSharedMenuShellStyles(navContainer);
            navContainer.removeAttribute('inert');
            navContainer.style.removeProperty('pointer-events');
            document.body.classList.remove('nav-menu-open');

            var menuBtn = document.getElementById('nav-scroll-menu-btn');
            var dropdown = document.getElementById('nav-scroll-dropdown');
            if (menuBtn) {
                menuBtn.setAttribute('aria-expanded', 'false');
                menuBtn.setAttribute('aria-label', 'Open menu');
                menuBtn.dataset.cursor = 'OPEN';
            }
            if (dropdown) dropdown.setAttribute('aria-hidden', 'true');
        }
    }

    window.addEventListener('pageshow', function(e) {
        state.leaving = false;
        restoreFromBfcache();
        window.requestAnimationFrame(function() {
            var refs = getShellRefs();
            finalizeEntryTransition(refs);
            var lenis = getLenis();
            if (lenis && typeof lenis.start === 'function') {
                try {
                    lenis.start();
                } catch (err) { /* ignore */ }
            }
        });
    });

    function cleanupStalePageShowTransition() {
        state.leaving = false;
        var refs = getShellRefs();
        finalizeEntryTransition(refs);
    }

    window.addEventListener('pageshow', function(e) {
        window.setTimeout(cleanupStalePageShowTransition, 100);
        window.setTimeout(cleanupStalePageShowTransition, 500);
    });

    function boot() {
        //  gsap ：IIFE  gsap （ script ／ defer），
        //  boot ， gsap 。
        if (!gsap && window.gsap) gsap = window.gsap;

        var payload = consumePayload();
        initBarbaMarkers();
        initSharedMenu();
        initIndexSyncedSharedNav();
        initLinkRouting();
        armEntryFailSafe(payload);
        playEntryTransition(payload);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, {
            once: true
        });
    } else {
        boot();
    }
})();