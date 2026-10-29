/* Feature pack v14: languages, bento section, parallax, text reveal, card-to-booking motion,
   mobile bottom sheet, dashboard skeletons, live chat, saved places and referrals. */
(function () {
    'use strict';
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const get = (k, fb) => { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch (e) { return fb; } };
    const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* unavailable */ } };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const page = (location.pathname.split('/').pop() || 'index.html');
    const isHome = page === 'index.html' || page === '';

    /* ---------- 1. Languages (home page) ---------- */
    const I18N = {
        en: { home: 'Home', about: 'About', book: 'Book a ride', safety: 'Safety', blog: 'Blog', dashboard: 'Dashboard', careers: 'Careers', landing: 'Welcome', contact: 'Contact', developer: 'Developer', login: 'Sign in', t1: 'Good rides.', t2: 'Good vibes.', lead: 'Skip the wait and move through your day with a ride that fits. Simple booking, clear estimates, and a smoother way to get there.', cta: 'Book your ride' },
        hi: { home: 'होम', about: 'हमारे बारे में', book: 'राइड बुक करें', safety: 'सुरक्षा', blog: 'ब्लॉग', dashboard: 'डैशबोर्ड', careers: 'करियर', landing: 'स्वागत', contact: 'संपर्क', developer: 'डेवलपर', login: 'साइन इन', t1: 'अच्छी सवारी।', t2: 'अच्छा मूड।', lead: 'इंतज़ार छोड़िए और अपने दिन के हिसाब से राइड लीजिए। आसान बुकिंग, साफ़ अनुमान।', cta: 'राइड बुक करें' },
        kn: { home: 'ಮುಖಪುಟ', about: 'ನಮ್ಮ ಬಗ್ಗೆ', book: 'ರೈಡ್ ಬುಕ್ ಮಾಡಿ', safety: 'ಸುರಕ್ಷತೆ', blog: 'ಬ್ಲಾಗ್', dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', careers: 'ವೃತ್ತಿ', landing: 'ಸ್ವಾಗತ', contact: 'ಸಂಪರ್ಕ', developer: 'ಡೆವಲಪರ್', login: 'ಸೈನ್ ಇನ್', t1: 'ಉತ್ತಮ ಸವಾರಿ.', t2: 'ಉತ್ತಮ ಭಾವ.', lead: 'ಕಾಯದೆ ಸವಾರಿ ಮಾಡಿ. ಸರಳ ಬುಕಿಂಗ್, ಸ್ಪಷ್ಟ ಅಂದಾಜು.', cta: 'ರೈಡ್ ಬುಕ್ ಮಾಡಿ' },
        ta: { home: 'முகப்பு', about: 'எங்களைப் பற்றி', book: 'பயணம் பதிவு', safety: 'பாதுகாப்பு', blog: 'வலைப்பதிவு', dashboard: 'டாஷ்போர்டு', careers: 'வேலைவாய்ப்பு', landing: 'வரவேற்பு', contact: 'தொடர்பு', developer: 'உருவாக்குநர்', login: 'உள்நுழை', t1: 'நல்ல பயணம்.', t2: 'நல்ல அதிர்வு.', lead: 'காத்திருக்காமல் பயணம் செய்யுங்கள். எளிய பதிவு, தெளிவான கட்டண மதிப்பீடு.', cta: 'பயணத்தை பதிவு செய்' }
    };
    function applyLang(code) {
        const t = I18N[code] || I18N.en;
        $$('.navigationmenu a[data-key]').forEach((a) => { const k = a.dataset.key; if (t[k] && k !== 'landing' || t.landing) { if (t[k]) a.textContent = t[k]; } });
        const l1 = $('.hero-lite-title .line'); if (l1) l1.textContent = t.t1;
        const hl = $('.hero-lite-title .hl-under'); if (hl) hl.textContent = t.t2;
        const lead = $('.hero-lite-lead'); if (lead) lead.textContent = t.lead;
        const cta = $('.hero-lite-cta a.btn1'); if (cta && cta.firstChild && cta.firstChild.nodeType === 3) cta.firstChild.nodeValue = t.cta + ' ';
        document.documentElement.lang = code;
    }
    /* ---------- 1b. Pop-up demo panel (home): every pop-up on demand ---------- */
    if (isHome) {
        const anchorDemo = $('#captain');
        if (anchorDemo) {
            const demo = document.createElement('section');
            demo.className = 'popdemo';
            demo.setAttribute('aria-labelledby', 'popdemoTitle');
            demo.innerHTML = '<div class="sc-head"><p class="eyebrow-line"><i class="fa-solid fa-window-restore"></i> POP-UPS</p><h2 id="popdemoTitle" class="reveal-text">See every pop-up in action</h2><p class="muted">Each button opens one pop-up on demand. Real pop-ups appear once per device, or when their trigger happens.</p></div>' +
                '<div class="popdemo-grid">' +
                '<button type="button" class="glass pd-btn" data-pop="promo"><i class="fa-solid fa-gift"></i><strong>Promo card</strong><span>20% off, slides up bottom-right</span></button>' +
                '<button type="button" class="glass pd-btn" data-pop="cookie"><i class="fa-solid fa-cookie-bite"></i><strong>Cookie notice</strong><span>Animated consent bar</span></button>' +
                '<button type="button" class="glass pd-btn" data-pop="exit"><i class="fa-solid fa-bolt"></i><strong>Exit offer</strong><span>Springs in before you leave</span></button>' +
                '<button type="button" class="glass pd-btn" data-pop="rating"><i class="fa-solid fa-star"></i><strong>Ride complete</strong><span>Confetti and a star rating</span></button>' +
                '<button type="button" class="glass pd-btn" data-pop="app"><i class="fa-solid fa-mobile-screen"></i><strong>Get the app</strong><span>Store links dialog</span></button>' +
                '<button type="button" class="glass pd-btn" data-pop="sheet"><i class="fa-solid fa-motorcycle"></i><strong>Quick ride sheet</strong><span>Bottom sheet with ride types</span></button>' +
                '</div>';
            anchorDemo.parentNode.insertBefore(demo, anchorDemo);
            demo.addEventListener('click', (e) => {
                const b = e.target.closest('[data-pop]'); if (!b) return;
                const k = b.dataset.pop;
                if (k === 'promo' && window.RapidoFX) window.RapidoFX.showPromo(true);
                if (k === 'cookie' && window.RapidoPopups) window.RapidoPopups.cookie();
                if (k === 'exit' && window.RapidoPopups) window.RapidoPopups.exit();
                if (k === 'rating' && window.RapidoPopups) window.RapidoPopups.rating('Demo trip: MG Road to Indiranagar, ₹120.');
                if (k === 'app') { const d = $('[data-open-download]'); if (d) d.click(); }
                if (k === 'sheet') { const sh = $('.sheet'); if (sh) sh.classList.add('open'); }
            });
        }
    }

    /* ---------- 2. Bento feature section + text reveal (home) ---------- */
    if (isHome) {
        const anchor = $('#captain');
        if (anchor) {
            const bento = document.createElement('section');
            bento.className = 'bento-section';
            bento.setAttribute('aria-labelledby', 'bentoTitle');
            bento.innerHTML =
                '<div class="sc-head"><p class="eyebrow-line"><i class="fa-solid fa-star"></i> WHY RAPIDO</p><h2 id="bentoTitle" class="reveal-text">Everything in one ride</h2></div>' +
                '<div class="bento">' +
                '<article class="glass b-big"><i class="fa-solid fa-location-dot"></i><h3>Live tracking</h3><p>Follow your captain on the map from pickup to drop.</p><div class="b-route"><span></span></div></article>' +
                '<article class="glass"><i class="fa-solid fa-bookmark"></i><h3>Saved places</h3><p>Home, work and favourite spots in one tap.</p></article>' +
                '<article class="glass"><i class="fa-solid fa-gift"></i><h3>Rewards</h3><p>Invite friends and unlock ride credits.</p></article>' +
                '<article class="glass b-wide"><i class="fa-solid fa-shield-halved"></i><h3>Safety on every ride</h3><p>SOS, trip sharing and verified captains, always one tap away.</p></article>' +
                '<article class="glass"><i class="fa-solid fa-language"></i><h3>Your language</h3><p>English, हिंदी, ಕನ್ನಡ and தமிழ்.</p></article>' +
                '</div>';
            anchor.parentNode.insertBefore(bento, anchor);
        }
        $$('h2:not(.reveal-text)').forEach((h) => {
            if (h.children.length || !h.textContent.trim() || h.closest('.navigationmenu,.notif-panel,.toasts')) return;
            if (!h.closest('section')) return;
            h.classList.add('reveal-text');
        });
        $$('.reveal-text').forEach((h) => {
            if (h.dataset.split) return;
            h.dataset.split = '1';
            const words = h.textContent.trim().split(/\s+/);
            h.setAttribute('aria-label', h.textContent.trim());
            h.innerHTML = words.map((w, i) => '<span class="rw" aria-hidden="true" style="--d:' + (i * 70) + 'ms">' + esc(w) + '</span>').join(' ');
        });
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .4 });
            $$('.reveal-text').forEach((h) => io.observe(h));
        } else $$('.reveal-text').forEach((h) => h.classList.add('in'));
    }

    /* ---------- 3. Parallax hero (home) ---------- */
    if (isHome && !reduce) {
        let ticking = false;
        const art = $('.hero-lite-art'), txt = $('.hero-lite-text');
        const onScroll = () => {
            if (ticking) return; ticking = true;
            requestAnimationFrame(() => {
                const y = Math.min(scrollY, 900);
                if (art) art.style.transform = 'translateY(' + (y * .18).toFixed(1) + 'px)';
                if (txt) txt.style.transform = 'translateY(' + (y * -.06).toFixed(1) + 'px)';
                const disc = $('.art-disc'); if (disc) disc.style.transform = 'scale(' + (1 + Math.min(y, 600) / 3000).toFixed(3) + ')';
                ticking = false;
            });
        };
        addEventListener('scroll', onScroll, { passive: true }); onScroll();
    }

    /* ---------- 4. Card grows into booking (FLIP) on fare cards (home) ---------- */
    if (isHome && !reduce) {
        $$('.fare-opt').forEach((card) => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const target = $('#book'); if (!target) return;
                const from = card.getBoundingClientRect();
                const clone = card.cloneNode(true);
                clone.className = 'flip-clone';
                clone.style.cssText = 'position:fixed;left:' + from.left + 'px;top:' + from.top + 'px;width:' + from.width + 'px;height:' + from.height + 'px;margin:0;z-index:9300;transition:all .65s cubic-bezier(.7,0,.2,1);border-radius:22px;pointer-events:none';
                document.body.appendChild(clone);
                const to = target.getBoundingClientRect();
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    clone.style.left = (to.left + to.width * .1) + 'px';
                    clone.style.top = Math.max(80, to.top + 80) + 'px';
                    clone.style.width = (to.width * .8) + 'px';
                    clone.style.height = Math.min(320, to.height) + 'px';
                    clone.style.opacity = '.92';
                }));
                setTimeout(() => { location.href = 'booking.html?type=' + encodeURIComponent(card.dataset.type || 'bike'); }, 650);
            });
        });
    }

    /* ---------- 5. Mobile bottom sheet (home) ---------- */
    if (isHome) {
        const fab = document.createElement('button');
        fab.type = 'button'; fab.className = 'sheet-fab'; fab.innerHTML = '<i class="fa-solid fa-motorcycle"></i> Quick ride';
        const sheet = document.createElement('div');
        sheet.className = 'sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Quick ride');
        sheet.innerHTML = '<div class="sheet-card"><div class="sheet-grab"></div><h3>Where to?</h3><p>Pick a ride type, then set your pickup and drop.</p>' +
            '<div class="sheet-types"><a href="booking.html?type=bike"><i class="fa-solid fa-motorcycle"></i>Bike</a><a href="booking.html?type=auto"><i class="fa-solid fa-taxi"></i>Auto</a><a href="booking.html?type=cab"><i class="fa-solid fa-car-side"></i>Cab</a></div>' +
            '<button type="button" class="sheet-close">Close</button></div>';
        document.body.appendChild(fab); document.body.appendChild(sheet);
        const open = () => sheet.classList.add('open');
        const close = () => sheet.classList.remove('open');
        fab.addEventListener('click', open);
        sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('.sheet-close')) close(); });
        const mq = matchMedia('(max-width: 700px)');
        const syncFab = () => fab.classList.toggle('show', mq.matches);
        mq.addEventListener ? mq.addEventListener('change', syncFab) : null; syncFab();
    }

    /* ---------- 6. Skeleton shimmer while dashboard lists load ---------- */
    if (/dashboard\.html$/.test(page) || page === 'customer-dashboard.html' || page === 'captain-dashboard.html') {
        const targets = $$('.dash-card, #requests, #activeTrips, #capHistory, .list');
        targets.forEach((el) => el.classList.add('shimmer-load'));
        setTimeout(() => targets.forEach((el) => el.classList.remove('shimmer-load')), 900);
    }

    /* ---------- 7. Customer dashboard: live chat, saved places, referrals ---------- */
    if (page === 'customer-dashboard.html') {
        const host = $('.dash');
        if (host) {
            const sec = document.createElement('section');
            sec.className = 'dash-section v14-panels';
            sec.innerHTML =
                '<div class="panel-grid">' +
                '<article class="panel glass" id="chatPanel"><h3><i class="fa-solid fa-comments"></i> Live ride chat</h3><div id="chatBody"></div></article>' +
                '<article class="panel glass"><h3><i class="fa-solid fa-bookmark"></i> Saved places</h3>' +
                '<form id="placeForm" class="place-form" novalidate><input id="placeName" placeholder="e.g. Home, Office" maxlength="30" aria-label="Place name"><input id="placeAddr" placeholder="Address or area" maxlength="80" aria-label="Address"><button class="btn btn1" type="submit">Save</button></form>' +
                '<ul class="place-list" id="placeList"></ul></article>' +
                '<article class="panel glass"><h3><i class="fa-solid fa-gift"></i> Invite and earn</h3><p class="muted">Share your code. Complete 5 rides to unlock a ride credit.</p>' +
                '<div class="ref-code"><strong id="refCode">—</strong><button type="button" class="btn btn2" id="refCopy">Copy code</button></div>' +
                '<div class="ref-bar"><span id="refFill"></span></div><p class="muted" id="refText"></p></article>' +
                '</div>';
            host.appendChild(sec);
            renderPanels();
            setInterval(renderPanels, 4000);
        }
    }

    function session() { return get('rc.session', null) || {}; }
    function myTrips() { const phone = session().phone; return (get('rc.trips', []) || []).filter((t) => t && t.customer === phone); }
    function renderPanels() {
        const s = session();
        const trips = myTrips();
        const active = trips.find((t) => ['requested', 'accepted', 'in-progress', 'active'].includes(t.status));
        const body = $('#chatBody');
        if (body) {
            if (!active) body.innerHTML = '<p class="muted">No ride in progress. Chat with your captain appears here during a trip.</p>';
            else {
                const key = 'rc.chat.' + active.id;
                const msgs = get(key, []);
                body.innerHTML = '<div class="chat-log" id="chatLog">' + (msgs.length ? msgs.map((m) => '<p class="bubble ' + (m.from === 'me' ? 'me' : 'them') + '">' + esc(m.text) + '</p>').join('') : '<p class="muted">Say hello to your captain.</p>') + '</div>' +
                    '<form class="chat-form" id="chatForm"><input id="chatText" maxlength="160" placeholder="Type a message" aria-label="Message"><button class="btn btn1" type="submit">Send</button></form>' +
                    '<div class="trip-progress"><span style="transform:scaleX(' + ({ requested: .25, accepted: .5, 'in-progress': .75, active: .75 }[active.status] || .25) + ')"></span></div>';
                const form = $('#chatForm');
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const input = $('#chatText'); const text = input.value.trim(); if (!text) return;
                    const list = get(key, []); list.push({ from: 'me', text }); set(key, list.slice(-60));
                    renderPanels();
                    const replies = ['On my way!', 'Reaching in 2 minutes.', 'I am at the pickup point.', 'Thanks, see you soon.'];
                    setTimeout(() => { const l = get(key, []); l.push({ from: 'them', text: replies[Math.floor(Math.random() * replies.length)] }); set(key, l.slice(-60)); renderPanels(); }, 1400);
                };
                const log = $('#chatLog'); if (log) log.scrollTop = log.scrollHeight;
            }
        }
        const list = $('#placeList');
        if (list) {
            const places = get('rc.places', []);
            list.innerHTML = places.length ? places.map((p, i) => '<li class="place-item" style="--i:' + i + '"><div><strong>' + esc(p.name) + '</strong><small>' + esc(p.addr) + '</small></div><div class="place-actions"><a class="btn btn2" href="booking.html">Book</a><button type="button" class="place-del" data-i="' + i + '" aria-label="Remove ' + esc(p.name) + '">×</button></div></li>').join('') : '<li class="muted">No saved places yet.</li>';
        }
        const code = 'RAPIDO' + String(s.phone || '0000').slice(-4);
        const refCode = $('#refCode'); if (refCode) refCode.textContent = code;
        const done = trips.filter((t) => t.status === 'completed').length;
        const fill = $('#refFill'); if (fill) fill.style.transform = 'scaleX(' + Math.min(1, done / 5).toFixed(2) + ')';
        const refText = $('#refText'); if (refText) refText.textContent = done >= 5 ? 'Reward unlocked: ₹50 ride credit.' : (5 - done) + ' more completed ride(s) to unlock your ₹50 credit.';
    }
    document.addEventListener('submit', (e) => {
        if (e.target.id !== 'placeForm') return;
        e.preventDefault();
        const name = $('#placeName').value.trim(), addr = $('#placeAddr').value.trim();
        if (!name || !addr) { if (window.Notify) window.Notify.toast('Enter a name and an address.', { type: 'warning', title: 'Missing details' }); return; }
        const list = get('rc.places', []); list.push({ name, addr }); set('rc.places', list.slice(0, 20));
        e.target.reset(); renderPanels();
    });
    document.addEventListener('click', (e) => {
        const del = e.target.closest && e.target.closest('.place-del');
        if (del) { const list = get('rc.places', []); list.splice(Number(del.dataset.i), 1); set('rc.places', list); renderPanels(); }
        if (e.target.closest && e.target.closest('#refCopy')) {
            const code = ($('#refCode') || {}).textContent || '';
            if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
            e.target.closest('#refCopy').textContent = 'Copied!';
            setTimeout(() => { const b = $('#refCopy'); if (b) b.textContent = 'Copy code'; }, 1500);
        }
    });
})();
