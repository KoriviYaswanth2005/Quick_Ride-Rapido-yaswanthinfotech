
(function () {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const rupees = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE_RE = /^[6-9][0-9]{9}$/;
    const VEHICLE_RE = /^[A-Za-z]{2}[0-9]{1,2}[A-Za-z]{0,3}[0-9]{4}$/;

    
    const store = {
        get(key, fallback) {
            try {
                const raw = window.localStorage.getItem('rc.' + key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (err) {
                return fallback;
            }
        },
        set(key, value) {
            try {
                window.localStorage.setItem('rc.' + key, JSON.stringify(value));
            } catch (err) {
                
            }
        }
    };

    
    const Notify = (function () {
        const toastRoot = $('#toasts');
        const bell = $('#bellBtn');
        const badge = $('#bellCount');
        const panel = $('#notifPanel');
        const list = $('#notifList');
        const empty = $('#notifEmpty');
        const ICON = {
            success: 'fa-circle-check',
            info: 'fa-circle-info',
            warning: 'fa-triangle-exclamation',
            error: 'fa-circle-exclamation',
            ride: 'fa-motorcycle'
        };
        let items = store.get('notifications', []);
        let refreshTimer = null;

        function save() {
            items = items.slice(0, 50);
            store.set('notifications', items);
        }

        function timeAgo(ts) {
            const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
            if (s < 60) return 'just now';
            if (s < 3600) return Math.floor(s / 60) + ' min ago';
            if (s < 86400) return Math.floor(s / 3600) + ' h ago';
            return Math.floor(s / 86400) + ' d ago';
        }

        function unreadCount() {
            return items.filter((i) => !i.read).length;
        }

        function renderBadge() {
            const n = unreadCount();
            badge.hidden = n === 0;
            badge.textContent = n > 9 ? '9+' : String(n);
            bell.setAttribute('aria-label', 'Notifications, ' + n + ' unread');
        }

        function renderList() {
            list.innerHTML = '';
            items.forEach((item) => {
                const li = document.createElement('li');
                li.className = 'notif-item type-' + item.type + (item.read ? '' : ' unread');

                const icon = document.createElement('i');
                icon.className = 'fa-solid ' + (ICON[item.type] || ICON.info);

                const body = document.createElement('div');
                body.className = 'notif-body';
                const title = document.createElement('strong');
                title.textContent = item.title;
                const msg = document.createElement('p');
                msg.textContent = item.message;
                const time = document.createElement('time');
                time.textContent = timeAgo(item.at);
                body.append(title, msg, time);

                li.append(icon, body);
                list.appendChild(li);
            });
            empty.hidden = items.length > 0;
            renderBadge();
        }

        function bellShake() {
            if (reduceMotion) return;
            bell.classList.remove('shake');
            void bell.offsetWidth;
            bell.classList.add('shake');
        }

        function toast(message, opts = {}) {
            const type = opts.type || 'info';
            const duration = opts.duration || 4800;
            const el = document.createElement('div');
            el.className = 'toast type-' + type;
            el.setAttribute('role', type === 'error' ? 'alert' : 'status');

            const icon = document.createElement('i');
            icon.className = 'fa-solid ' + (ICON[type] || ICON.info);

            const body = document.createElement('div');
            body.className = 'toast-body';
            if (opts.title) {
                const t = document.createElement('strong');
                t.textContent = opts.title;
                body.appendChild(t);
            }
            const p = document.createElement('p');
            p.textContent = message;
            body.appendChild(p);

            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'toast-close';
            close.setAttribute('aria-label', 'Dismiss notification');
            close.innerHTML = '&times;';

            const bar = document.createElement('span');
            bar.className = 'toast-bar';
            bar.style.animationDuration = duration + 'ms';

            el.append(icon, body, close, bar);
            toastRoot.appendChild(el);
            requestAnimationFrame(() => el.classList.add('in'));
            const live = Array.from(toastRoot.children).filter((n) => !n.dataset.closing);
            while (live.length > 4) {
                dismiss(live.shift());
            }

            let timer = setTimeout(() => dismiss(el), duration);
            el.addEventListener('mouseenter', () => { clearTimeout(timer); bar.style.animationPlayState = 'paused'; });
            el.addEventListener('mouseleave', () => {
                bar.style.animationPlayState = 'running';
                timer = setTimeout(() => dismiss(el), 1500);
            });
            close.addEventListener('click', () => dismiss(el));

            function dismiss(node) {
                if (!node || node.dataset.closing) return;
                node.dataset.closing = '1';
                node.classList.remove('in');
                node.classList.add('out');
                setTimeout(() => node.remove(), reduceMotion ? 0 : 300);
            }
        }
        function notify(message, opts = {}) {
            const type = opts.type || 'info';
            const title = opts.title || defaultTitle(type);
            items.unshift({ id: uid(), title, message, type, read: false, at: Date.now() });
            save();
            renderList();
            bellShake();
            toast(message, { ...opts, type, title });
        }

        function defaultTitle(type) {
            return { success: 'Success', info: 'Update', warning: 'Heads up', error: 'Alert', ride: 'Ride update' }[type] || 'Update';
        }
        function addSilently(message, opts = {}) {
            items.unshift({ id: uid(), title: opts.title || defaultTitle(opts.type || 'info'), message, type: opts.type || 'info', read: false, at: Date.now() });
            save();
            renderList();
        }

        function setOpen(open) {
            panel.hidden = !open;
            bell.setAttribute('aria-expanded', String(open));
            if (open) {
                renderList();
                clearInterval(refreshTimer);
                refreshTimer = setInterval(renderList, 30000);
                panel.classList.remove('closing');
            } else {
                clearInterval(refreshTimer);
            }
        }

        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            setOpen(panel.hidden);
        });
        document.addEventListener('click', (e) => {
            if (!panel.hidden && !panel.contains(e.target) && e.target !== bell) setOpen(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !panel.hidden) { setOpen(false); bell.focus(); }
        });
        $('#markAllRead').addEventListener('click', () => {
            items.forEach((i) => { i.read = true; });
            save();
            renderList();
        });
        $('#clearAll').addEventListener('click', () => {
            items = [];
            save();
            renderList();
        });

        renderList();
        return { notify, toast, addSilently, renderList };
    })();

    
    const header = $('#header');
    const menu = $('#menu');
    const menuToggle = $('#menuToggle');
    const progress = $('#scrollProgress');
    const toTop = $('#toTop');

    function setMenu(open) {
        menu.classList.toggle('open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menuToggle.classList.toggle('is-open', open);
    }
    menuToggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
    menu.addEventListener('click', (e) => { if (e.target.tagName === 'A') setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    function onScroll() {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
        header.classList.toggle('scrolled', y > 20);
        toTop.classList.toggle('show', y > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
    const navLinks = $$('[data-link]');
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['home', 'about', 'impact', 'book', 'reviews', 'captain', 'business', 'contact'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) sectionObserver.observe(el);
    });

    
    const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((el) => revealObserver.observe(el));

    function countUp(el) {
        const target = Number(el.dataset.count);
        if (reduceMotion) { el.textContent = target; return; }
        const start = performance.now();
        const duration = 1400;
        function frame(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * eased);
            if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }
    const countObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            countUp(entry.target);
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => countObserver.observe(el));

    
    document.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.btn, .btntext, .round-btn');
        if (!btn || reduceMotion) return;
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    });

    if (canHover && !reduceMotion) {
        $$('.magnetic').forEach((btn) => {
            btn.addEventListener('pointermove', (e) => {
                const r = btn.getBoundingClientRect();
                const x = (e.clientX - r.left - r.width / 2) * 0.18;
                const y = (e.clientY - r.top - r.height / 2) * 0.25;
                btn.style.transform = 'translate(' + x + 'px,' + y + 'px)';
            });
            btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
        });
    }

    
    
    const DEFAULT_REVIEWS = [
        { name: 'Priya S.', city: 'Bengaluru', rating: 5, text: 'Got a bike within minutes during peak hour. The fare matched what the app showed.' },
        { name: 'Arjun K.', city: 'Hyderabad', rating: 5, text: 'Easy booking and the captain was polite. A quick way to beat the traffic.' },
        { name: 'Meena R.', city: 'Chennai', rating: 4, text: 'Doorstep pick-up is exactly what I needed for short trips to the station.' },
        { name: 'Rahul D.', city: 'Pune', rating: 5, text: 'Affordable and reliable. The emergency button gives me peace of mind.' },
        { name: 'Sneha G.', city: 'Mumbai', rating: 4, text: 'Clear pricing and a live timeline so I always know where my captain is.' }
    ];
    const track = $('#reviewTrack');
    const carousel = $('#carousel');
    const dotsBox = $('#dots');
    let reviews = DEFAULT_REVIEWS.concat(store.get('reviews', []));
    let perView = 1;
    let index = 0;
    let autoTimer = null;

    function stars(n) {
        return '★'.repeat(n) + '☆'.repeat(5 - n);
    }

    function renderReviews() {
        track.innerHTML = '';
        reviews.forEach((r) => {
            const slide = document.createElement('div');
            slide.className = 'slide';
            slide.setAttribute('role', 'group');
            slide.setAttribute('aria-roledescription', 'slide');

            const card = document.createElement('article');
            card.className = 'review';
            const rating = document.createElement('div');
            rating.className = 'review-stars';
            rating.setAttribute('aria-label', r.rating + ' out of 5 stars');
            rating.textContent = stars(r.rating);
            const p = document.createElement('p');
            p.textContent = '“' + r.text + '”';
            const h = document.createElement('h3');
            h.textContent = r.name + ' · ' + r.city;
            card.append(rating, p, h);
            slide.appendChild(card);
            track.appendChild(slide);
        });
        layout();
    }

    function maxIndex() {
        return Math.max(0, reviews.length - perView);
    }

    function layout() {
        perView = window.matchMedia('(min-width: 900px)').matches ? 3 : 1;
        $$('.slide', track).forEach((s) => { s.style.flex = '0 0 ' + (100 / perView) + '%'; });
        index = Math.min(index, maxIndex());
        dotsBox.innerHTML = '';
        for (let i = 0; i <= maxIndex(); i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'dot' + (i === index ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to review group ' + (i + 1));
            dot.addEventListener('click', () => goTo(i));
            dotsBox.appendChild(dot);
        }
        move();
    }

    function move() {
        track.style.transform = 'translateX(' + (-index * (100 / perView)) + '%)';
        $$('.dot', dotsBox).forEach((d, i) => d.classList.toggle('active', i === index));
    }

    function goTo(i) {
        const max = maxIndex();
        index = ((i % (max + 1)) + (max + 1)) % (max + 1);
        move();
    }

    function startAuto() {
        stopAuto();
        if (reduceMotion) return;
        autoTimer = setInterval(() => goTo(index + 1), 5000);
    }
    function stopAuto() { clearInterval(autoTimer); }

    $('#prevRev').addEventListener('click', () => goTo(index - 1));
    $('#nextRev').addEventListener('click', () => goTo(index + 1));
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
    carousel.addEventListener('focusin', stopAuto);
    carousel.addEventListener('focusout', startAuto);
    carousel.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') goTo(index + 1);
        if (e.key === 'ArrowLeft') goTo(index - 1);
    });
    let swipeX = null;
    carousel.addEventListener('pointerdown', (e) => { swipeX = e.clientX; });
    carousel.addEventListener('pointerup', (e) => {
        if (swipeX === null) return;
        const dx = e.clientX - swipeX;
        swipeX = null;
        if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1));
    });

    window.addEventListener('resize', layout);
    renderReviews();
    startAuto();
    $('#reviewForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const err = $('#reviewError');
        err.textContent = '';
        const name = f.name.value.trim();
        const city = f.city.value.trim();
        const text = f.text.value.trim();
        const rating = Number(f.rating.value);
        if (!name || !city) { err.textContent = 'Please enter your name and city.'; return; }
        if (text.length < 10) { err.textContent = 'Please write at least 10 characters.'; return; }

        const review = { name, city, rating, text };
        const mine = store.get('reviews', []);
        mine.unshift(review);
        store.set('reviews', mine.slice(0, 20));
        reviews = DEFAULT_REVIEWS.concat(store.get('reviews', []));
        renderReviews();
        goTo(0);
        f.reset();
        Notify.notify('Thanks, ' + name + '! Your review is now live in the carousel.', { type: 'success', title: 'Review posted' });
    });

    window.__rcNotify = Notify;

    
    const RATES = { bike: { base: 25, perKm: 9, label: 'Bike' }, auto: { base: 20, perKm: 11, label: 'Auto' }, cab: { base: 40, perKm: 16, label: 'Cab' }, 'bike-plus': { base: 25, perKm: 12, label: 'Bike Plus' } };
    const CAPTAINS = [
        { name: 'Ravi Kumar', vehicle: 'Bajaj Pulsar · KA01 AB 1234' },
        { name: 'Sanjay M.', vehicle: 'Honda Activa · KA05 CD 5678' },
        { name: 'Imran A.', vehicle: 'TVS Jupiter · KA09 EF 9012' }
    ];
    const form = $('#bookForm');
    if (form) {
    const pickup = $('#pickup');
    const drop = $('#drop');
    const fareValue = $('#fareValue');
    const bookError = $('#bookError');
    const statusIdle = $('#statusIdle');
    const statusActive = $('#statusActive');
    const statusDone = $('#statusDone');
    const statusLabel = $('#statusLabel');
    const progressBar = $('#progressBar');
    const captainCard = $('#captainCard');
    const captainName = $('#captainName');
    const captainVehicle = $('#captainVehicle');
    const sosNote = $('#sosNote');
    const stepItems = $$('#stepper li');
    const historyList = $('#historyList');
    const historyEmpty = $('#historyEmpty');

    let timers = [];
    let ride = null;
    let selectedStars = 0;

    function currentRideType() {
        const checked = form.querySelector('input[name="ride"]:checked');
        return checked ? checked.value : 'bike';
    }

    function estimateFare(km, type) {
        const rate = RATES[type] || RATES.bike;
        return Math.round(rate.base + km * rate.perKm);
    }

    
    const picks = { pickup: null, drop: null };      // chosen place objects {name, lat, lng}
    const route = { km: null, minutes: null, source: null };
    const placeFields = {
        pickup: { input: pickup, list: $('#pickupList') },
        drop: { input: drop, list: $('#dropList') }
    };
    const placeSeq = { pickup: 0, drop: 0 };
    let routeSeq = 0;

    function setRouteText(msg) { $('#routeText').textContent = msg; }

    function hidePlaces(kind) {
        const f = placeFields[kind];
        f.list.hidden = true;
        f.input.setAttribute('aria-expanded', 'false');
    }

    function showPlaces(kind, html) {
        const f = placeFields[kind];
        f.list.innerHTML = html;
        f.list.hidden = false;
        f.input.setAttribute('aria-expanded', 'true');
    }

    function pickPlace(kind, place) {
        picks[kind] = place;
        placeFields[kind].input.value = place.name;
        hidePlaces(kind);
        updateRoute();
    }

    function renderPlaceOptions(kind, items) {
        const list = $$('li', placeFields[kind].list);
        const html = items.map((p, i) =>
            '<li role="option" tabindex="-1" data-index="' + i + '" title="' + esc(p.full) + '">' +
            '<i class="fa-solid fa-location-dot"></i><span>' + esc(p.name) + '<small>' + esc(p.full) + '</small></span></li>'
        ).join('');
        showPlaces(kind, html || '<li class="place-status">No matching place in India. Add the city name.</li>');
        $$('li[data-index]', placeFields[kind].list).forEach((li, i) => {
            li.addEventListener('mousedown', (e) => { e.preventDefault(); pickPlace(kind, items[i]); });
        });
        placeFields[kind].options = items;
    }

    function bindPlace(kind) {
        const f = placeFields[kind];
        let timer = null;
        f.input.addEventListener('input', () => {
            picks[kind] = null;
            route.km = null;
            updateFare();
            setRouteText('Pick a place from the suggestions to measure the road distance.');
            clearTimeout(timer);
            const q = f.input.value.trim();
            if (q.length < 3) { hidePlaces(kind); return; }
            timer = setTimeout(async () => {
                const seq = ++placeSeq[kind];
                showPlaces(kind, '<li class="place-status">Searching the map…</li>');
                try {
                    const items = await RideRoute.search(q, 5);
                    if (seq !== placeSeq[kind]) return;
                    renderPlaceOptions(kind, items);
                } catch (err) {
                    if (seq !== placeSeq[kind]) return;
                    showPlaces(kind, '<li class="place-status">Could not reach the map. Check your connection and try again.</li>');
                }
            }, 350);
        });
        f.input.addEventListener('keydown', (e) => {
            if (f.list.hidden) return;
            const items = $$('li[data-index]', f.list);
            if (!items.length) return;
            const current = items.findIndex((li) => li.classList.contains('active'));
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const next = (current + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                items.forEach((li) => li.classList.remove('active'));
                items[next].classList.add('active');
            } else if (e.key === 'Enter' && current >= 0) {
                e.preventDefault();
                pickPlace(kind, f.options[current]);
            } else if (e.key === 'Escape') {
                hidePlaces(kind);
            }
        });
        f.input.addEventListener('blur', () => setTimeout(() => hidePlaces(kind), 150));
    }
    bindPlace('pickup');
    bindPlace('drop');

    async function updateRoute() {
        route.km = null;
        updateFare();
        if (!picks.pickup || !picks.drop) {
            setRouteText('Pick both places from the suggestions. The road distance is measured online.');
            return;
        }
        if (picks.pickup.lat === picks.drop.lat && picks.pickup.lng === picks.drop.lng) {
            setRouteText('Pickup and drop are the same place.');
            return;
        }
        const seq = ++routeSeq;
        setRouteText('Measuring the road distance…');
        const res = await RideRoute.roadDistance(picks.pickup, picks.drop);
        if (seq !== routeSeq) return;
        route.km = res.km;
        route.minutes = res.minutes;
        route.source = res.source;
        setRouteText(res.source === 'road'
            ? res.km + ' km by road · about ' + res.minutes + ' min drive'
            : 'About ' + res.km + ' km (estimated, the map service is unreachable)');
        updateFare();
        document.dispatchEvent(new CustomEvent('routechange', { detail: { km: res.km, source: res.source } }));
    }
    window.RideBooking = {
        async setPlaces(pickupText, dropText) {
            const jobs = [['pickup', pickupText], ['drop', dropText]];
            for (const [kind, text] of jobs) {
                if (!text || !text.trim()) continue;
                try {
                    const items = await RideRoute.search(text.trim(), 1);
                    if (items[0]) { picks[kind] = items[0]; placeFields[kind].input.value = items[0].name; }
                } catch (err) {  }
            }
            if (!picks.pickup || !picks.drop) {
                setRouteText('Choose both places from the suggestions so we can measure the road distance.');
                return null;
            }
            await updateRoute();
            return route.km;
        },
        quote() {
            if (!Number.isFinite(route.km)) return null;
            const type = currentRideType();
            return { km: route.km, fare: estimateFare(route.km, type), label: (RATES[type] || RATES.bike).label };
        },
        setRideType(type) {
            const radio = form.querySelector('input[name="ride"][value="' + type + '"]');
            if (radio) { radio.checked = true; updateFare(); }
        },
        focus(kind) {
            const f = placeFields[kind || 'pickup'];
            if (f) f.input.focus({ preventScroll: true });
        }
    };

    let lastFare = null;
    function updateFare() {
        const km = route.km;
        const valid = Number.isFinite(km) && km >= 1;
        const text = valid ? rupees(estimateFare(km, currentRideType())) : '—';
        if (text !== lastFare) {
            lastFare = text;
            fareValue.textContent = text;
            if (!reduceMotion) {
                fareValue.classList.remove('bump');
                void fareValue.offsetWidth;
                fareValue.classList.add('bump');
            }
        }
    }
    form.addEventListener('input', updateFare);
    form.addEventListener('change', updateFare);
    updateFare();

    function clearTimers() {
        timers.forEach(clearTimeout);
        timers = [];
    }
    function later(ms, fn) {
        timers.push(setTimeout(fn, ms));
    }

    function showPanel(which) {
        const map = { idle: statusIdle, active: statusActive, done: statusDone };
        Object.keys(map).forEach((k) => {
            const el = map[k];
            const show = k === which;
            if (show && el.hidden) {
                el.hidden = false;
                el.classList.remove('panel-in');
                void el.offsetWidth;
                el.classList.add('panel-in');
            } else if (!show) {
                el.hidden = true;
            }
        });
    }

    function setStep(n, label, percent) {
        stepItems.forEach((li, i) => {
            li.classList.toggle('done', i + 1 < n);
            li.classList.toggle('active', i + 1 === n);
        });
        statusLabel.classList.remove('swap');
        void statusLabel.offsetWidth;
        statusLabel.textContent = label;
        statusLabel.classList.add('swap');
        progressBar.style.width = percent + '%';
    }

    function renderHistory() {
        const rides = store.get('rides', []);
        historyList.innerHTML = '';
        historyEmpty.hidden = rides.length > 0;
        rides.forEach((r, i) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.style.setProperty('--i', i);

            const icon = document.createElement('i');
            icon.className = 'fa-solid ' + (r.type === 'bike-plus' ? 'fa-bolt' : 'fa-motorcycle');

            const info = document.createElement('div');
            info.className = 'history-info';
            const route = document.createElement('strong');
            route.textContent = r.pickup + ' → ' + r.drop;
            const meta = document.createElement('small');
            meta.textContent = RATES[r.type].label + ' · ' + r.km + ' km · ' +
                new Date(r.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            info.append(route, meta);

            const right = document.createElement('div');
            right.className = 'history-right';
            const fare = document.createElement('span');
            fare.className = 'history-fare';
            fare.textContent = rupees(r.fare);
            const badge = document.createElement('span');
            badge.className = 'status-pill s-' + r.status;
            badge.textContent = { completed: 'Completed', cancelled: 'Cancelled', active: 'In progress', ended: 'Ended' }[r.status] || r.status;
            right.append(fare, badge);
            if (r.rating) {
                const rt = document.createElement('small');
                rt.className = 'history-rating';
                rt.textContent = stars(r.rating);
                right.appendChild(rt);
            }

            li.append(icon, info, right);
            historyList.appendChild(li);
        });
    }

    function updateRecord(id, patch) {
        const rides = store.get('rides', []);
        const idx = rides.findIndex((r) => r.id === id);
        if (idx >= 0) {
            rides[idx] = { ...rides[idx], ...patch };
            store.set('rides', rides);
        }
        renderHistory();
    }
    (function closeStaleRides() {
        const rides = store.get('rides', []);
        if (rides.some((r) => r.status === 'active')) {
            store.set('rides', rides.map((r) => (r.status === 'active' ? { ...r, status: 'ended' } : r)));
        }
    })();
    renderHistory();

    function runRide(r) {
        setStep(1, 'Finding a captain nearby…', 8);
        Notify.notify('Searching for a captain near ' + r.pickup + '.', { type: 'ride', title: 'Booking confirmed' });

        later(1800, () => {
            const c = CAPTAINS[Math.floor(Math.random() * CAPTAINS.length)];
            ride.captain = c;
            captainName.textContent = c.name;
            captainVehicle.textContent = c.vehicle;
            captainCard.hidden = false;
            captainCard.classList.remove('slide-in');
            void captainCard.offsetWidth;
            captainCard.classList.add('slide-in');
            setStep(2, c.name + ' is heading to your pickup', 35);
            Notify.notify(c.name + ' (' + c.vehicle.split(' · ')[0] + ') accepted your ride.', { type: 'success', title: 'Captain assigned' });
        });
        later(4800, () => {
            setStep(2, 'Captain is 2 minutes away', 55);
            Notify.notify('Your captain is 2 minutes away. Please be at the pickup point.', { type: 'info', title: 'Captain nearby' });
        });
        later(7200, () => {
            setStep(2, 'Captain has arrived. Please board.', 70);
            Notify.notify('Your captain has arrived at ' + r.pickup + '.', { type: 'warning', title: 'Captain arrived' });
        });
        later(9000, () => {
            setStep(3, 'Ride in progress to ' + r.drop, 85);
            Notify.notify('Ride started. Enjoy your trip to ' + r.drop + '.', { type: 'ride', title: 'Ride started' });
        });
        later(12500, () => {
            setStep(4, 'Ride completed', 100);
            if (ride) ride.running = false;
            updateRecord(r.id, { status: 'completed' });
            later(700, () => {
                $('#doneFare').textContent = 'Total ' + rupees(r.fare) + ' · UPI payment selected';
                showPanel('done');
                Notify.notify('You reached ' + r.drop + '. Total fare ' + rupees(r.fare) + '.', { type: 'success', title: 'Ride completed' });
            });
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        bookError.textContent = '';
        if (!pickup.value.trim() || !drop.value.trim()) {
            bookError.textContent = 'Please enter both pickup and drop locations.';
            Notify.toast('Enter pickup and drop locations to continue.', { type: 'warning', title: 'Missing details' });
            return;
        }
        if (pickup.value.trim().toLowerCase() === drop.value.trim().toLowerCase()) {
            bookError.textContent = 'Pickup and drop cannot be the same place.';
            return;
        }
        const km = route.km;
        if (!picks.pickup || !picks.drop || !Number.isFinite(km)) {
            bookError.textContent = 'Choose both places from the suggestions so we can measure the road distance.';
            return;
        }
        if (ride && ride.running) {
            Notify.toast('You already have a ride in progress.', { type: 'warning', title: 'Ride active' });
            return;
        }

        clearTimers();
        const type = currentRideType();
        const record = {
            id: uid(), pickup: pickup.value.trim(), drop: drop.value.trim(),
            km, type, fare: estimateFare(km, type), status: 'active', rating: 0, at: Date.now()
        };
        ride = { ...record, running: true, captain: null };
        const rides = store.get('rides', []);
        rides.unshift(record);
        store.set('rides', rides.slice(0, 10));
        renderHistory();

        captainCard.hidden = true;
        sosNote.hidden = true;
        selectedStars = 0;
        paintStars(0);
        showPanel('active');
        $('#rideStatus').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
        runRide(record);
    });

    $('#cancelBtn').addEventListener('click', () => {
        if (!ride || !ride.running) return;
        clearTimers();
        ride.running = false;
        updateRecord(ride.id, { status: 'cancelled' });
        Notify.notify('Your ride from ' + ride.pickup + ' was cancelled.', { type: 'warning', title: 'Ride cancelled' });
        ride = null;
        showPanel('idle');
    });

    $('#sosBtn').addEventListener('click', () => {
        sosNote.hidden = false;
        sosNote.classList.remove('pulse');
        void sosNote.offsetWidth;
        sosNote.classList.add('pulse');
        Notify.notify('Emergency noted for your trip. If you are in danger, call 112 now.', { type: 'error', title: 'Emergency', duration: 8000 });
    });

    $('#captainCall').addEventListener('click', (e) => {
        e.preventDefault();
        Notify.toast('Calling is not configured on this website yet.', { type: 'info', title: 'Feature unavailable' });
    });

    
    const starButtons = $$('#stars [data-star]');
    function paintStars(n) {
        starButtons.forEach((b) => {
            const v = Number(b.dataset.star);
            b.classList.toggle('on', v <= n);
            b.setAttribute('aria-checked', String(v === n));
        });
    }
    starButtons.forEach((b, i) => {
        b.addEventListener('click', () => {
            selectedStars = Number(b.dataset.star);
            paintStars(selectedStars);
        });
        b.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const next = starButtons[(i + (e.key === 'ArrowRight' ? 1 : -1) + starButtons.length) % starButtons.length];
            next.focus();
            next.click();
        });
    });

    const ratingThanks = $('#ratingThanks');
    $('#submitRating').addEventListener('click', () => {
        if (!selectedStars) {
            ratingThanks.hidden = false;
            ratingThanks.textContent = 'Please select a star rating first.';
            return;
        }
        const feedback = $('#feedback').value.trim();
        const rideId = ride ? ride.id : (store.get('rides', [])[0] || {}).id;
        if (rideId) updateRecord(rideId, { rating: selectedStars, feedback });
        ratingThanks.textContent = 'Thanks for rating ' + selectedStars + ' star' + (selectedStars > 1 ? 's' : '') + '!';
        ratingThanks.hidden = false;
        Notify.notify('You rated your ride ' + selectedStars + ' out of 5. Thank you!', { type: 'success', title: 'Feedback received' });
    });

    $('#newRideBtn').addEventListener('click', () => {
        clearTimers();
        ride = null;
        selectedStars = 0;
        paintStars(0);
        $('#feedback').value = '';
        ratingThanks.hidden = true;
        form.reset();
        updateFare();
        showPanel('idle');
    });

    $('#clearHistory').addEventListener('click', () => {
        if (!store.get('rides', []).length) {
            Notify.toast('There is no ride history to clear.', { type: 'info', title: 'History' });
            return;
        }
        store.set('rides', []);
        renderHistory();
        Notify.notify('Your ride history was cleared on this device.', { type: 'info', title: 'History cleared' });
    });

    
    }

    const captainForm = $('#captainForm');
    const captainError = $('#captainError');
    const captainOk = $('#captainOk');
    let okTimer = null;

    captainForm.addEventListener('submit', (e) => {
        e.preventDefault();
        captainError.textContent = '';
        const f = e.currentTarget;
        const name = f.name.value.trim();
        const phone = f.phone.value.replace(/\s+/g, '');
        const vehicle = f.vehicle.value.replace(/\s+/g, '').toUpperCase();
        const city = f.city.value.trim();

        if (!name || !city) { captainError.textContent = 'Please fill in your name and city.'; return; }
        if (!PHONE_RE.test(phone)) { captainError.textContent = 'Enter a valid 10-digit mobile number starting with 6-9.'; return; }
        if (!VEHICLE_RE.test(vehicle)) { captainError.textContent = 'Enter a valid registration number, e.g. KA01AB1234.'; return; }

        const apps = store.get('captainApps', []);
        apps.unshift({ name, phone, vehicle, city, at: Date.now() });
        store.set('captainApps', apps.slice(0, 20));

        f.reset();
        captainOk.hidden = false;
        captainOk.classList.remove('pop');
        void captainOk.offsetWidth;
        captainOk.classList.add('pop');
        clearTimeout(okTimer);
        okTimer = setTimeout(() => { captainOk.hidden = true; }, 7000);
        Notify.notify('Application received for ' + name + '. We will call you on ' + phone.slice(0, 2) + 'XXXXXX' + phone.slice(-2) + '.', { type: 'success', title: 'Application received' });
    });

    
    const dialog = $('#businessDialog');
    const businessForm = $('#businessForm');
    $('#openBusiness').addEventListener('click', () => {
        $('#bizError').textContent = '';
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        const first = businessForm.querySelector('input');
        if (first) setTimeout(() => first.focus(), 50);
    });
    $('#bizCancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });
    businessForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const company = f.company.value.trim();
        const email = f.email.value.trim();
        const rides = Number(f.rides.value);
        const err = $('#bizError');
        err.textContent = '';
        if (!company) { err.textContent = 'Please enter your company name.'; return; }
        if (!EMAIL_RE.test(email)) { err.textContent = 'Enter a valid contact email.'; return; }
        if (!Number.isFinite(rides) || rides < 1) { err.textContent = 'Enter an estimated number of rides per month.'; return; }

        const reqs = store.get('businessRequests', []);
        reqs.unshift({ company, email, rides, at: Date.now() });
        store.set('businessRequests', reqs.slice(0, 20));
        f.reset();
        dialog.close();
        Notify.notify('Business request sent for ' + company + '. Our team will reply to ' + email + '.', { type: 'success', title: 'Request sent' });
    });

    
    $('#contactForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const err = $('#contactError');
        err.textContent = '';
        const name = f.name.value.trim();
        const email = f.email.value.trim();
        const message = f.message.value.trim();
        if (!name) { err.textContent = 'Please enter your name.'; return; }
        if (!EMAIL_RE.test(email)) { err.textContent = 'Enter a valid email address.'; return; }
        if (message.length < 10) { err.textContent = 'Your message should be at least 10 characters.'; return; }
        const msgs = store.get('messages', []);
        msgs.unshift({ name, email, message, at: Date.now() });
        store.set('messages', msgs.slice(0, 20));
        f.reset();
        Notify.notify('Thanks ' + name + '! We received your message and will reply to ' + email + '.', { type: 'success', title: 'Message sent' });
    });

    $('#newsletter').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('#nlEmail');
        const err = $('#nlError');
        err.textContent = '';
        const email = input.value.trim();
        if (!EMAIL_RE.test(email)) { err.textContent = 'Enter a valid email address.'; return; }
        const subs = store.get('subscribers', []);
        if (subs.includes(email)) {
            Notify.toast('This email is already subscribed.', { type: 'info', title: 'Already subscribed' });
            return;
        }
        subs.push(email);
        store.set('subscribers', subs);
        input.value = '';
        Notify.notify('Subscribed! Ride offers will be sent to ' + email + '.', { type: 'success', title: 'Subscribed' });
    });

    
    $$('[data-app-link]').forEach((el) => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (event) => {
            event.preventDefault();
            const isApple = (el.getAttribute('src') || '').includes('appstore') || el.querySelector('.fa-apple');
            window.open(isApple ? 'https://apps.apple.com/in/app/rapido-bike-taxi-auto-cabs/id1198464606' : 'https://play.google.com/store/apps/details?id=com.rapido.passenger', '_blank', 'noopener,noreferrer');
        });
    });
    $$('[data-social]').forEach((a) => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            Notify.toast(a.dataset.social + ' link is not configured yet.', { type: 'info', title: 'Follow us' });
        });
    });

    
    if (!store.get('welcomed', false)) {
        store.set('welcomed', true);
        Notify.addSilently('Welcome to Rapido! Book a ride, rate your trip, and share a review.', { type: 'info', title: 'Welcome' });
        setTimeout(() => {
            Notify.toast('Welcome! Book your first bike ride below.', { type: 'info', title: 'Welcome', duration: 5000 });
        }, 4500);
    }

    
    window.addEventListener('load', () => document.body.classList.add('loaded'));
})();
