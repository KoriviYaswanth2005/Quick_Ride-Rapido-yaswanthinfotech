
(function () {
    'use strict';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    document.querySelectorAll('[data-split]').forEach((el) => {
        const words = el.textContent.trim().split(/\s+/);
        el.setAttribute('aria-label', el.textContent.trim());
        el.textContent = '';
        words.forEach((word, i) => {
            const span = document.createElement('span');
            span.className = 'w';
            span.setAttribute('aria-hidden', 'true');
            span.style.setProperty('--i', i);
            span.textContent = word;
            el.appendChild(span);
            if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
    });

    if (reduceMotion || !canHover) return;
    document.querySelectorAll('.tilt').forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = 'perspective(800px) rotateX(' + (-y * 8).toFixed(2) + 'deg) rotateY(' + (x * 10).toFixed(2) + 'deg) translateY(-6px)';
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
    const glow = document.createElement('div');
    glow.className = 'lp-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    let raf = 0;
    window.addEventListener('pointermove', (e) => {
        glow.classList.add('on');
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            glow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
        });
    }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));
})();
