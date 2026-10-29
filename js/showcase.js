/* Home-page showcase: fare comparison, scroll story, rider stories. Guarded so it is harmless elsewhere. */
(function () {
    'use strict';
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const RATES = { bike: { base: 25, perKm: 9 }, auto: { base: 20, perKm: 11 }, cab: { base: 40, perKm: 16 } };

    /* Fare comparison with count-up numbers */
    const slider = document.getElementById('fcKm');
    if (slider) {
        const out = document.getElementById('fcKmOut');
        const tween = (el, to) => {
            const from = Number(el.dataset.v || 0); el.dataset.v = to;
            if (reduce) { el.textContent = '₹' + to; return; }
            const t0 = performance.now(), dur = 450;
            const step = (now) => {
                const k = Math.min(1, (now - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
                el.textContent = '₹' + Math.round(from + (to - from) * eased);
                if (k < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };
        const render = () => {
            const km = Number(slider.value);
            out.textContent = km + ' km';
            Object.keys(RATES).forEach((t) => {
                const fare = Math.round(RATES[t].base + km * RATES[t].perKm);
                tween(document.querySelector('[data-fare="' + t + '"]'), fare);
                const bar = document.querySelector('[data-bar="' + t + '"]');
                if (bar) bar.style.transform = 'scaleX(' + Math.min(1, fare / 600).toFixed(3) + ')';
            });
        };
        slider.addEventListener('input', render);
        render();
    }

    /* Map city chips: move the highlight */
    document.querySelectorAll('[data-city]').forEach((chip) => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('[data-city]').forEach((c) => c.classList.toggle('active', c === chip));
            const g = document.getElementById('mapCityLabel');
            if (g) { g.classList.remove('swap'); void g.offsetWidth; g.textContent = chip.dataset.city; g.classList.add('swap'); }
        });
    });

    /* Scroll story: steps light up as they enter the middle of the screen */
    const steps = document.querySelectorAll('.story-step');
    if (steps.length && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => { if (en.isIntersecting) en.target.classList.add('lit'); });
        }, { rootMargin: '-35% 0px -35% 0px' });
        steps.forEach((s) => io.observe(s));
        const bar = document.getElementById('storyProgress');
        if (bar) {
            const onScroll = () => {
                const sec = document.getElementById('story');
                const r = sec.getBoundingClientRect();
                const k = Math.min(1, Math.max(0, (innerHeight * .5 - r.top) / (r.height)));
                bar.style.transform = 'scaleY(' + k.toFixed(3) + ')';
            };
            addEventListener('scroll', onScroll, { passive: true }); onScroll();
        }
    }

    /* Rider stories: stagger-in once visible */
    const cards = document.querySelectorAll('.rider-card');
    if (cards.length && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                en.target.style.transitionDelay = (en.target.dataset.i || 0) * 120 + 'ms';
                en.target.classList.add('in'); obs.unobserve(en.target);
            });
        }, { threshold: .2 });
        cards.forEach((c, i) => { c.dataset.i = i; io.observe(c); });
    }
})();
