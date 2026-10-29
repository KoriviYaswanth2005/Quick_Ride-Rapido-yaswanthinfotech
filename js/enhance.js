/* Rapido enhancement layer: page transitions, animated pop-ups, confetti. Safe to load on every page. */
(function () {
    'use strict';
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function safeGet(k, fb) { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch (e) { return fb; } }
    function safeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }

    /* 1. Page transitions: yellow curtain wipe between pages on the same site */
    const curtain = document.createElement('div');
    curtain.className = 'pt-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.innerHTML = '<div class="pt-brand"><img src="images/logo.svg" alt=""><p>Developed by Korivi Yaswanth</p><small>@yaswanthinfotech.in</small></div>';
    document.body.appendChild(curtain);
    if (!reduce) {
        document.body.classList.add('pt-enter');
        curtain.classList.add('cover');
        requestAnimationFrame(() => requestAnimationFrame(() => { curtain.classList.remove('cover'); curtain.classList.add('reveal-out'); }));
        setTimeout(() => { curtain.style.transition = 'none'; curtain.classList.remove('reveal-out'); }, 1100);
        setTimeout(() => { curtain.style.transition = ''; }, 1160);
        setTimeout(() => document.body.classList.remove('pt-enter'), 1600);
    }
    document.addEventListener('click', (e) => {
        if (reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
        const samePage = url.pathname === location.pathname && url.search === location.search;
        if (samePage) return; /* hash links on the same page scroll normally */
        e.preventDefault();
        curtain.style.transition = '';
        curtain.classList.remove('reveal-out');
        curtain.classList.add('cover');
        setTimeout(() => { location.href = url.href; }, 1050);
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) curtain.classList.remove('cover'); });

    /* 2. Pop-ups: animated exit for every <dialog> */
    const nativeClose = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.close = function (rv) {
        if (reduce || !this.hasAttribute('open') || this.classList.contains('is-closing')) return nativeClose.call(this, rv);
        this.classList.add('is-closing');
        const dlg = this;
        const done = () => { dlg.classList.remove('is-closing'); nativeClose.call(dlg, rv); };
        dlg.addEventListener('animationend', function h(ev) { if (ev.target === dlg) { dlg.removeEventListener('animationend', h); done(); } });
        setTimeout(() => { if (dlg.classList.contains('is-closing')) done(); }, 400); /* safety net */
    };

    /* 3. Promo pop-up: slides in once per device after a short delay */
    const PROMO_KEY = 'rc.promoSeen';
    function showPromo(force) {
        if (document.querySelector('.promo-pop')) return;
        const card = document.createElement('div');
        card.className = 'promo-pop';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-label', 'Special offer');
        card.innerHTML =
            '<div class="promo-ico"><i class="fa-solid fa-gift"></i></div>' +
            '<div><h4>20% off your first ride</h4><p>Use this code at checkout on any bike, auto or cab.</p>' +
            '<button type="button" class="promo-code" title="Copy code">WELCOME20</button></div>' +
            '<button type="button" class="promo-x" aria-label="Close offer">&times;</button>';
        document.body.appendChild(card);
        const hide = () => {
            card.classList.add('hide');
            setTimeout(() => card.remove(), 450);
        };
        card.querySelector('.promo-x').addEventListener('click', hide);
        card.querySelector('.promo-code').addEventListener('click', (ev) => {
            const btn = ev.currentTarget;
            if (navigator.clipboard) navigator.clipboard.writeText('WELCOME20').catch(() => {});
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = 'WELCOME20'; }, 1500);
        });
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('show')));
        setTimeout(() => { if (card.isConnected) hide(); }, 30000);
    }
    setTimeout(showPromo, 5000);

    /* 4. Confetti burst when a success toast appears */
    let canvas = null, ctx = null, parts = [], raf = null;
    function ensureCanvas() {
        if (canvas) return;
        canvas = document.createElement('canvas');
        canvas.className = 'confetti-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        const resize = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); };
        resize();
        window.addEventListener('resize', resize);
    }
    const colors = ['#f9c935', '#ffe27a', '#111111', '#ffffff', '#f0b800'];
    function burst(x, y) {
        if (reduce) return;
        ensureCanvas();
        for (let i = 0; i < 60; i++) {
            const ang = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 7;
            parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 4, s: 4 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[i % colors.length], life: 0 });
        }
        if (!raf) raf = requestAnimationFrame(tick);
    }
    function tick() {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        parts.forEach((p) => { p.vy += .22; p.vx *= .98; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++; });
        parts = parts.filter((p) => p.life < 110 && p.y < innerHeight + 20);
        parts.forEach((p) => {
            ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p.life / 110); ctx.translate(p.x, p.y); ctx.rotate(p.r);
            ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
        });
        raf = parts.length ? requestAnimationFrame(tick) : null;
        if (!parts.length) ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
    const toastRoot = document.getElementById('toasts');
    if (toastRoot) {
        new MutationObserver((muts) => {
            muts.forEach((m) => m.addedNodes.forEach((n) => {
                if (n.nodeType === 1 && n.classList.contains('type-success')) {
                    const r = n.getBoundingClientRect();
                    burst(r.left + r.width / 2, r.top + r.height / 2);
                }
            }));
        }).observe(toastRoot, { childList: true });
    }
    window.RapidoFX = { burst, showPromo };
})();

/* Extra pop-ups: cookie banner, exit-intent offer, live ride tracker, ride-complete rating */
(function () {
    'use strict';
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const get = (k, fb) => { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch (e) { return fb; } };
    const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* unavailable */ } };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* Cookie consent banner */
    function cookieBanner(force) {
        if (document.querySelector('.cookie-bar')) return;
        const bar = document.createElement('div');
        bar.className = 'cookie-bar';
        bar.setAttribute('role', 'region');
        bar.setAttribute('aria-label', 'Cookie notice');
        bar.innerHTML = '<i class="fa-solid fa-cookie-bite"></i><p>We use storage on this device to remember your rides, theme and preferences. No ads.</p>' +
            '<div class="cookie-actions"><button type="button" class="cookie-decline">Only essentials</button><button type="button" class="cookie-accept">Accept</button></div>';
        document.body.appendChild(bar);
        const close = () => { bar.classList.add('hide'); setTimeout(() => bar.remove(), 500); };
        bar.querySelector('.cookie-accept').addEventListener('click', close);
        bar.querySelector('.cookie-decline').addEventListener('click', close);
        setTimeout(() => bar.classList.add('show'), 1800);
    }
    cookieBanner();
    window.RapidoPopups = window.RapidoPopups || {};
    window.RapidoPopups.cookie = () => cookieBanner(true);

    /* Exit-intent offer: once per browser session when the cursor leaves through the top */
    function exitIntent(force) {
        if (document.querySelector('.exit-modal')) return;
        const wrap = document.createElement('div');
        wrap.className = 'exit-modal';
        wrap.innerHTML = '<div class="exit-card" role="dialog" aria-modal="true" aria-labelledby="exitTitle">' +
            '<button type="button" class="exit-x" aria-label="Close">&times;</button>' +
            '<div class="exit-badge"><i class="fa-solid fa-bolt"></i></div>' +
            '<h3 id="exitTitle">Before you go&hellip;</h3>' +
            '<p>Your first ride is <strong>20% off</strong>. Use the code below at checkout.</p>' +
            '<button type="button" class="promo-code exit-code">WELCOME20</button>' +
            '<a class="exit-cta" href="booking.html">Book a ride <i class="fa-solid fa-arrow-right"></i></a></div>';
        document.body.appendChild(wrap);
        const close = () => { wrap.classList.add('hide'); setTimeout(() => wrap.remove(), 400); };
        wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('.exit-x')) close(); });
        wrap.querySelector('.exit-code').addEventListener('click', (e) => {
            if (navigator.clipboard) navigator.clipboard.writeText('WELCOME20').catch(() => {});
            e.currentTarget.textContent = 'Copied!';
        });
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('show')));
    }
    window.RapidoPopups.exit = () => exitIntent(true);
    let armed = false;
    setTimeout(() => { armed = true; }, 8000);
    document.addEventListener('mouseleave', (e) => { if (armed && e.clientY <= 0) exitIntent(); });

    /* Live ride tracker: a mini card for the trip in progress */
    function trackerHTML(t) {
        const steps = { requested: 1, accepted: 2, 'in-progress': 3, active: 3, completed: 4 };
        const n = steps[t.status] || 1;
        const labels = ['Requested', 'Captain on the way', 'On the ride', 'Arrived'];
        return '<div class="trk-head"><span class="live-dot"></span><strong>' + esc(labels[n - 1]) + '</strong></div>' +
            '<p class="trk-route">' + esc(t.pickup) + ' <i class="fa-solid fa-arrow-right"></i> ' + esc(t.drop) + '</p>' +
            '<div class="trk-bar"><span style="transform:scaleX(' + (n / 4).toFixed(2) + ')"></span></div>';
    }
    function renderTracker() {
        const trips = get('rc.trips', []);
        const active = Array.isArray(trips) && trips.find((t) => t && ['requested', 'accepted', 'in-progress', 'active'].includes(t.status));
        let el = document.querySelector('.ride-tracker');
        if (!active) { if (el) el.remove(); return; }
        if (!el) { el = document.createElement('div'); el.className = 'ride-tracker'; document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('show')); }
        el.innerHTML = trackerHTML(active);
    }
    renderTracker();
    setInterval(renderTracker, 4000);

    /* Ride-complete celebration: rating pop-up when a "Ride completed" toast appears */
    function ratingPopup(text) {
        const wrap = document.createElement('div');
        wrap.className = 'exit-modal rate-modal';
        wrap.innerHTML = '<div class="exit-card" role="dialog" aria-modal="true" aria-labelledby="rateTitle">' +
            '<div class="exit-badge"><i class="fa-solid fa-flag-checkered"></i></div>' +
            '<h3 id="rateTitle">You made it!</h3><p>' + esc(text) + '</p>' +
            '<div class="star-pick" role="radiogroup" aria-label="Rate your ride">' +
            [1, 2, 3, 4, 5].map((n) => '<button type="button" role="radio" aria-checked="false" data-s="' + n + '">★</button>').join('') +
            '</div><button type="button" class="exit-cta rate-done" disabled>Submit rating</button></div>';
        document.body.appendChild(wrap);
        const stars = wrap.querySelectorAll('.star-pick button');
        const paint = (n) => stars.forEach((b) => b.classList.toggle('on', Number(b.dataset.s) <= n));
        stars.forEach((b) => {
            b.addEventListener('mouseenter', () => paint(Number(b.dataset.s)));
            b.addEventListener('click', () => {
                wrap.dataset.rating = b.dataset.s; paint(Number(b.dataset.s));
                stars.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
                wrap.querySelector('.rate-done').disabled = false;
            });
        });
        wrap.querySelector('.star-pick').addEventListener('mouseleave', () => paint(Number(wrap.dataset.rating || 0)));
        wrap.querySelector('.rate-done').addEventListener('click', () => {
            const rating = Number(wrap.dataset.rating || 0);
            const list = get('rc.feedback', []); if (Array.isArray(list)) { list.push({ rating, at: Date.now() }); set('rc.feedback', list.slice(-50)); }
            if (window.RapidoFX) window.RapidoFX.burst(innerWidth / 2, innerHeight / 2);
            wrap.classList.add('hide'); setTimeout(() => wrap.remove(), 400);
        });
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('show')));
        if (window.RapidoFX) window.RapidoFX.burst(innerWidth / 2, innerHeight * .4);
    }
    window.RapidoPopups.rating = (text) => ratingPopup(text || 'Thanks for riding with Rapido.');
    const toastRoot = document.getElementById('toasts');
    if (toastRoot) {
        new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => {
            if (n.nodeType === 1 && /Ride completed/.test(n.textContent || '')) ratingPopup(n.querySelector('.toast-body') ? n.querySelector('.toast-body').textContent : 'Thanks for riding with Rapido.');
        }))).observe(toastRoot, { childList: true });
    }
})();
