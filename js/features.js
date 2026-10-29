
(function () {
    'use strict';
    const RC = window.RC;
    if (!RC) return;
    const { notify, toast, store, session, users } = RC;

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const page = document.body.dataset.page || '';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const UPI_ID = 'koriviyaswanth4@oksbi';
    // UPI deep link for a ride. Amount is in rupees; the note ties the payment to the ride.
    function upiLink(amount, note) {
        return 'upi://pay?pa=' + UPI_ID + '&pn=' + encodeURIComponent('Korivi Yaswanth') + '&am=' + Number(amount).toFixed(2) + '&cu=INR&tn=' + encodeURIComponent(note);
    }
    const rupees = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
    const PHONE_RE = /^[6-9][0-9]{9}$/;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const maskPhone = (p) => (p ? p.slice(0, 2) + 'XXXXXX' + p.slice(-2) : '');
    const fmtDate = (ts) => new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    
    const LOCALITIES = [
        { name: 'MG Road', city: 'Bengaluru', lat: 12.9756, lng: 77.6066 },
        { name: 'Koramangala', city: 'Bengaluru', lat: 12.9352, lng: 77.6245 },
        { name: 'Indiranagar', city: 'Bengaluru', lat: 12.9719, lng: 77.6412 },
        { name: 'Whitefield', city: 'Bengaluru', lat: 12.9698, lng: 77.7500 },
        { name: 'Electronic City', city: 'Bengaluru', lat: 12.8399, lng: 77.6770 },
        { name: 'HSR Layout', city: 'Bengaluru', lat: 12.9116, lng: 77.6389 },
        { name: 'Jayanagar', city: 'Bengaluru', lat: 12.9308, lng: 77.5838 },
        { name: 'BTM Layout', city: 'Bengaluru', lat: 12.9166, lng: 77.6101 },
        { name: 'Hebbal', city: 'Bengaluru', lat: 13.0358, lng: 77.5970 },
        { name: 'Marathahalli', city: 'Bengaluru', lat: 12.9591, lng: 77.6974 },
        { name: 'T. Nagar', city: 'Chennai', lat: 13.0418, lng: 80.2341 },
        { name: 'Adyar', city: 'Chennai', lat: 13.0067, lng: 80.2572 },
        { name: 'Anna Nagar', city: 'Chennai', lat: 13.0850, lng: 80.2101 },
        { name: 'Velachery', city: 'Chennai', lat: 12.9815, lng: 80.2180 },
        { name: 'Guindy', city: 'Chennai', lat: 13.0067, lng: 80.2206 },
        { name: 'Hitech City', city: 'Hyderabad', lat: 17.4435, lng: 78.3772 },
        { name: 'Banjara Hills', city: 'Hyderabad', lat: 17.4156, lng: 78.4347 },
        { name: 'Secunderabad', city: 'Hyderabad', lat: 17.4399, lng: 78.4983 },
        { name: 'Gachibowli', city: 'Hyderabad', lat: 17.4401, lng: 78.3489 },
        { name: 'Ameerpet', city: 'Hyderabad', lat: 17.4375, lng: 78.4487 },
        { name: 'Koregaon Park', city: 'Pune', lat: 18.5362, lng: 73.8939 },
        { name: 'Hinjewadi', city: 'Pune', lat: 18.5912, lng: 73.7389 },
        { name: 'Kothrud', city: 'Pune', lat: 18.5074, lng: 73.8077 },
        { name: 'Viman Nagar', city: 'Pune', lat: 18.5679, lng: 73.9143 }
    ];
    const DEFAULT_PRICING = {
        bike: { label: 'Bike', base: 25, perKm: 9, eta: 3 },
        auto: { label: 'Auto', base: 30, perKm: 14, eta: 5 },
        cab: { label: 'Cab', base: 50, perKm: 18, eta: 7 }
    };
    const TYPE_ICON = { bike: 'fa-motorcycle', auto: 'fa-taxi', cab: 'fa-car', 'bike-plus': 'fa-bolt' };
    const STATUS_LABEL = { scheduled: 'Scheduled', requested: 'Requested', accepted: 'Accepted', 'in-progress': 'In progress', completed: 'Completed', cancelled: 'Cancelled', active: 'In progress', ended: 'Ended' };
    const STATUS_CLASS = { scheduled: 's-requested', requested: 's-requested', accepted: 's-accepted', 'in-progress': 's-in-progress', completed: 's-completed', cancelled: 's-cancelled', active: 's-in-progress', ended: '' };

    function pricing() {
        const saved = store.get('pricing', {});
        const out = {};
        Object.keys(DEFAULT_PRICING).forEach((k) => { out[k] = { ...DEFAULT_PRICING[k], ...(saved[k] || {}) }; });
        return out;
    }
    function promos() { return store.get('promos', [{ code: 'WELCOME20', percent: 20, active: true }]); }
    function trips() { return store.get('trips', []); }
    function saveTrips(list) { store.set('trips', list.slice(0, 200)); }
    function legacyRides() { return store.get('rides', []); }
    function me() {
        const s = session();
        if (!s) return null;
        const u = users()[s.phone] || {};
        return { phone: s.phone, role: s.role || u.role || 'customer', name: u.name || s.name || ('Rider ' + maskPhone(s.phone)) };
    }
    function distanceKm(a, b) {
        const R = 6371, toRad = (d) => d * Math.PI / 180;
        const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.asin(Math.sqrt(h)) * 1.3; // 1.3: rough road-distance factor
    }
    function fareFor(km, type) {
        const p = pricing()[type] || DEFAULT_PRICING.bike;
        return Math.max(p.base, Math.round(p.base + km * p.perKm));
    }

    
    function gate(role) {
        const user = me();
        const gateEl = $('#gate');
        const content = $('#content');
        const ok = user && user.role === role;
        if (gateEl) gateEl.hidden = ok;
        if (content) content.hidden = !ok;
        if (!ok && gateEl) {
            $('#gateText').textContent = user
                ? 'You are signed in as a ' + user.role + '. This page is for ' + role + ' accounts.'
                : 'Log in with your mobile number to open this page.';
        }
        return ok;
    }

    
    function initBooking() {
        const pickupInput = $('#bkPickup');
        const dropInput = $('#bkDrop');
        const sugPickup = $('#sugPickup');
        const sugDrop = $('#sugDrop');
        const summaryBox = $('#bkSummary');
        const promoInput = $('#promoInput');
        const promoMsg = $('#promoMsg');
        const bookBtn = $('#bookBtn');
        const state = { pickup: null, drop: null, type: 'bike', promo: null, pay: 'upi', when: 'now', scheduledFor: null };
        let map = null, markers = {}, line = null;
        const bookingQuery = new URLSearchParams(location.search);
        const requestedType = bookingQuery.get('ride');
        if (['bike','auto','cab','bike-plus'].includes(requestedType)) state.type = requestedType;
        const queryPickup = bookingQuery.get('pickup');
        const queryDrop = bookingQuery.get('drop');
        if (queryPickup) pickupInput.value = queryPickup;
        if (queryDrop) dropInput.value = queryDrop;
        function bindSuggest(input, list, key) {
            let hi = -1;
            let online = [];
            let onlineTimer = null;
            let onlineSeq = 0;
            function matches() {
                const q = input.value.trim().toLowerCase();
                const local = q ? LOCALITIES.filter((l) => (l.name + ' ' + l.city).toLowerCase().includes(q)).slice(0, 8) : LOCALITIES.slice(0, 8);
                return local.concat(online);
            }
            function render() {
                const items = matches();
                list.innerHTML = '';
                hi = -1;
                if (!items.length) { list.hidden = true; return; }
                items.forEach((l, i) => {
                    const li = document.createElement('li');
                    li.setAttribute('role', 'option');
                    li.innerHTML = esc(l.name) + '<small>' + esc(l.city) + '</small>';
                    if (l.online) li.classList.add('online');
                    li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(l); });
                    list.appendChild(li);
                    if (i === hi) li.classList.add('hi');
                });
                list.hidden = false;
            }
            function choose(loc) {
                state[key] = loc;
                input.value = loc.online ? loc.name : loc.name + ', ' + loc.city;
                list.hidden = true;
                input.setCustomValidity('');
                refresh();
            }
            input.addEventListener('focus', render);
            input.addEventListener('input', () => {
                state[key] = null;
                online = [];
                render();
                refresh();
                clearTimeout(onlineTimer);
                const q = input.value.trim();
                if (q.length < 3) return;
                onlineTimer = setTimeout(async () => {
                    const seq = ++onlineSeq;
                    try {
                        const res = await window.RideRoute.search(q, 5);
                        if (seq !== onlineSeq || input.value.trim() !== q) return;
                        online = res.map((p) => ({ name: p.name, city: p.full.length > 60 ? p.full.slice(0, 57) + '…' : p.full, lat: p.lat, lng: p.lng, online: true }));
                        render();
                    } catch (err) {  }
                }, 350);
            });
            input.addEventListener('blur', () => { setTimeout(() => { list.hidden = true; }, 120); });
            input.addEventListener('keydown', (e) => {
                const items = $$('li', list);
                if (list.hidden || !items.length) return;
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    hi = (hi + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
                    items.forEach((li, i) => li.classList.toggle('hi', i === hi));
                } else if (e.key === 'Enter' && hi >= 0) {
                    e.preventDefault();
                    choose(matches()[hi]);
                } else if (e.key === 'Escape') {
                    list.hidden = true;
                }
            });
        }
        bindSuggest(pickupInput, sugPickup, 'pickup');
        bindSuggest(dropInput, sugDrop, 'drop');
        if (queryPickup) pickupInput.dispatchEvent(new Event('input', {bubbles:true}));
        if (queryDrop) dropInput.dispatchEvent(new Event('input', {bubbles:true}));
        function renderTypes() {
            const p = pricing();
            const km = routeKm();
            $$('.fare-opt[data-type]').forEach((card) => {
                const t = card.dataset.type;
                const price = km ? fareFor(km, t) : null;
                card.classList.toggle('selected', t === state.type);
                card.querySelector('input').checked = t === state.type;
                card.querySelector('.price').textContent = price ? rupees(price) : 'from ' + rupees(p[t].base);
                card.querySelector('small').textContent = 'about ' + p[t].eta + ' min away';
            });
        }
        $$('.fare-opt[data-type]').forEach((card) => {
            card.addEventListener('click', () => { state.type = card.dataset.type; refresh(); });
            card.querySelector('input').addEventListener('change', () => { state.type = card.dataset.type; refresh(); });
        });
        function routeKey() {
            return state.pickup.lat.toFixed(5) + ',' + state.pickup.lng.toFixed(5) + '|' + state.drop.lat.toFixed(5) + ',' + state.drop.lng.toFixed(5);
        }
        function hasRoad() {
            return !!(state.pickup && state.drop && state.road && state.roadFor === routeKey());
        }
        function measureRoad() {
            if (!state.pickup || !state.drop || !window.RideRoute) return;
            const key = routeKey();
            if (state.roadFor === key || state.roadBusy === key) return;
            state.roadBusy = key;
            window.RideRoute.roadDistance(state.pickup, state.drop).then((res) => {
                state.roadBusy = null;
                if (!state.pickup || !state.drop || routeKey() !== key) return;
                state.road = res;
                state.roadFor = key;
                refresh();
            });
        }
        function routeKm() {
            if (!state.pickup || !state.drop) return 0;
            if (hasRoad()) return state.road.km;
            return Math.max(1, Math.round(distanceKm(state.pickup, state.drop) * 10) / 10);
        }

        function promoDiscount(fare) {
            if (!state.promo) return 0;
            return Math.round(fare * state.promo.percent / 100);
        }

        function refresh() {
            renderTypes();
            measureRoad();
            const km = routeKm();
            if (!km) {
                summaryBox.innerHTML = '<p class="muted">Choose a pickup and a drop-off to see your fare.</p>';
            } else {
                const base = fareFor(km, state.type);
                const disc = promoDiscount(base);
                const total = base - disc;
                const p = pricing()[state.type];
                summaryBox.innerHTML =
                    '<div><span>' + (hasRoad() ? 'Distance by road' : 'Distance (estimate)') + '</span><strong>' + km + ' km</strong></div>' +
                    '<div><span>' + esc(p.label) + ' fare</span><strong>' + rupees(base) + '</strong></div>' +
                    (disc ? '<div><span>Promo ' + esc(state.promo.code) + '</span><strong>− ' + rupees(disc) + '</strong></div>' : '') +
                    '<div class="total"><span>Estimated total</span><span>' + rupees(total) + '</span></div>';
            }
            const who = me();
            bookBtn.textContent = !who ? 'Log in to book' : who.role === 'customer' ? 'Review and book' : 'Riders only';
            drawMap();
        }

        function drawMap() {
            if (!map) return;
            ['pickup', 'drop'].forEach((k) => {
                const loc = state[k];
                if (markers[k]) { map.removeLayer(markers[k]); delete markers[k]; }
                if (loc) {
                    markers[k] = window.L.marker([loc.lat, loc.lng], {
                        icon: window.L.divIcon({ className: '', html: '<div class="map-pin ' + (k === 'drop' ? 'drop' : '') + '"></div>', iconSize: [26, 26], iconAnchor: [13, 26] })
                    }).addTo(map).bindTooltip(k === 'pickup' ? 'Pickup' : 'Drop-off');
                }
            });
            if (line) { map.removeLayer(line); line = null; }
            if (state.pickup && state.drop) {
                line = window.L.polyline([[state.pickup.lat, state.pickup.lng], [state.drop.lat, state.drop.lng]], { color: '#f9c935', weight: 5, opacity: 0.9, dashArray: '2 8' }).addTo(map);
                map.fitBounds(line.getBounds(), { padding: [40, 40] });
            }
        }

        function initMap() {
            const el = $('#map');
            const note = $('#mapNote');
            if (!el) return;
            if (!window.L) {
                note.textContent = 'The map could not load. Check your internet connection. You can still book from the lists.';
                el.hidden = true;
                return;
            }
            if (!el) return;
            map = window.L.map(el, { zoomControl: true }).setView([12.9716, 77.5946], 11);
            setTimeout(() => map.invalidateSize(), 300);
            window.addEventListener('resize', () => map && map.invalidateSize());
            // Use Esri tiles when available, with a local fallback so the map
            // never shows CARTO/API-key or OpenStreetMap 403 error tiles.
            const fallbackBounds = [[12.85, 77.45], [13.10, 77.75]];
            let fallbackShown = false;
            const showFallback = () => {
                if (fallbackShown) return;
                fallbackShown = true;
                try { map.eachLayer(layer => { if (layer && layer._url) map.removeLayer(layer); }); } catch (_) {}
                window.L.imageOverlay('images/map-fallback.svg', fallbackBounds, { opacity: 1, interactive: false }).addTo(map);
                map.fitBounds(fallbackBounds, { padding: [8, 8] });
                note.textContent = 'Map preview mode: online map tiles are unavailable. Pickup and drop-off still work.';
            };
            const tiles = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: '&copy; Esri, HERE, Garmin, and OpenStreetMap contributors'
            }).addTo(map);
            let tileErrors = 0;
            tiles.on('tileerror', () => {
                tileErrors++;
                if (tileErrors >= 3) showFallback();
            });
            setTimeout(() => {
                if (tileErrors >= 1) showFallback();
            }, 5000);
            map.on('click', (e) => {
                const loc = { name: 'Pinned point', city: '', lat: e.latlng.lat, lng: e.latlng.lng };
                const key = !state.pickup ? 'pickup' : 'drop';
                state[key] = loc;
                const input = key === 'pickup' ? pickupInput : dropInput;
                input.value = 'Pinned point (' + loc.lat.toFixed(4) + ', ' + loc.lng.toFixed(4) + ')';
                note.textContent = 'Tip: click the map to set the pickup, then the drop-off.';
                refresh();
            });
            note.textContent = 'Tip: click the map to set the pickup, then the drop-off.';
            drawMap();
        }
        $('#promoBtn').addEventListener('click', () => {
            const code = promoInput.value.trim().toUpperCase();
            if (!code) { promoMsg.className = 'promo-msg bad'; promoMsg.textContent = 'Enter a promo code.'; return; }
            const p = promos().find((x) => x.code === code && x.active);
            if (!p) {
                state.promo = null;
                promoMsg.className = 'promo-msg bad';
                promoMsg.textContent = 'That code is not valid right now.';
            } else {
                state.promo = p;
                promoMsg.className = 'promo-msg ok';
                promoMsg.textContent = p.percent + '% off applied with ' + p.code + '.';
                notify('Promo ' + p.code + ' applied: ' + p.percent + '% off.', { type: 'success', title: 'Promo applied' });
            }
            refresh();
        });
        const whenCards = Array.from(document.querySelectorAll('.when-opt'));
        const scheduleField = $('#scheduleField');
        const scheduleInput = $('#bkSchedule');
        const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        if (scheduleInput) scheduleInput.min = toLocalInput(new Date(Date.now() + 15 * 60000));
        whenCards.forEach((card) => {
            card.querySelector('input').addEventListener('change', () => {
                state.when = card.dataset.when;
                whenCards.forEach((c) => c.classList.toggle('selected', c === card));
                scheduleField.hidden = state.when !== 'later';
                if (state.when === 'later' && !scheduleInput.value) {
                    scheduleInput.value = toLocalInput(new Date(Date.now() + 30 * 60000));
                }
            });
        });
        const payCards = Array.from(document.querySelectorAll('.pay-opt'));
        const upiPrepayCard = $('#upiPrepayCard');
        function syncPay() {
            payCards.forEach((card) => {
                const on = card.dataset.pay === state.pay;
                card.classList.toggle('selected', on);
                card.querySelector('input').checked = on;
            });
            if (upiPrepayCard) upiPrepayCard.hidden = state.pay !== 'upi';
        }
        payCards.forEach((card) => {
            card.querySelector('input').addEventListener('change', () => { state.pay = card.dataset.pay; syncPay(); });
        });
        syncPay();
        const dialog = $('#confirmDialog');
        bookBtn.addEventListener('click', () => {
            const user = me();
            if (!user) {
                toast('Please log in first. Your booking is saved to your account.', { type: 'warning', title: 'Log in required' });
                setTimeout(() => { window.location.href = 'login.html'; }, 900);
                return;
            }
            if (user.role !== 'customer') {
                toast('Only rider accounts can book rides. Captain and admin accounts cannot book.', { type: 'warning', title: 'Riders only' });
                return;
            }
            if (!state.pickup || !state.drop) {
                const msg = !state.pickup ? 'Choose a pickup from the list or the map.' : 'Choose a drop-off from the list or the map.';
                $('#bkError').textContent = msg;
                toast(msg, { type: 'warning', title: 'Missing location' });
                return;
            }
            if (state.pickup.lat === state.drop.lat && state.pickup.lng === state.drop.lng) {
                $('#bkError').textContent = 'Pickup and drop-off cannot be the same.';
                return;
            }
            $('#bkError').textContent = '';
            state.scheduledFor = null;
            if (state.when === 'later') {
                const ts = scheduleInput.value ? new Date(scheduleInput.value).getTime() : NaN;
                const now = Date.now();
                if (!ts || isNaN(ts)) { $('#scheduleError').textContent = 'Pick a date and time for your ride.'; return; }
                if (ts < now + 15 * 60000) { $('#scheduleError').textContent = 'Scheduled rides must be at least 15 minutes ahead.'; return; }
                if (ts > now + 7 * 864e5) { $('#scheduleError').textContent = 'You can schedule a ride up to 7 days ahead.'; return; }
                state.scheduledFor = ts;
            }
            $('#scheduleError').textContent = '';
            const km = routeKm();
            const base = fareFor(km, state.type);
            const total = base - promoDiscount(base);
            $('#confirmList').innerHTML =
                '<li><span>From</span><strong>' + esc(state.pickup.name) + '</strong></li>' +
                '<li><span>To</span><strong>' + esc(state.drop.name) + '</strong></li>' +
                '<li><span>Ride</span><strong>' + esc(pricing()[state.type].label) + ' · ' + km + ' km</strong></li>' +
                (state.scheduledFor ? '<li><span>When</span><strong>' + esc(new Date(state.scheduledFor).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</strong></li>' : '<li><span>When</span><strong>Now</strong></li>') +
                '<li><span>Estimated total</span><strong>' + rupees(total) + '</strong></li>';
            const isCash = state.pay === 'cash';
            $('#confirmPayLabel').innerHTML = isCash ? '<i class="fa-solid fa-money-bill-wave"></i> Cash' : '<i class="fa-brands fa-google-pay"></i> UPI payment';
            $('#confirmPayDetail').textContent = isCash ? 'Pay your captain ' + rupees(total) + ' in cash at drop-off.' : 'UPI ID: ' + UPI_ID + ' · ' + rupees(total);
            $('#confirmPayNote').textContent = isCash ? 'No online payment is made. Your captain collects the fare.' : 'Your UPI app opens with the fare pre-filled. Complete the payment there.';
            $('#confirmOk').textContent = isCash ? 'Confirm ride (cash)' : 'Pay with UPI & Confirm';
            if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
        });
        $('#confirmCancel').addEventListener('click', () => dialog.close());
        $('#confirmOk').addEventListener('click', () => {
            const user = me();
            const km = routeKm();
            const base = fareFor(km, state.type);
            const fare = base - promoDiscount(base);
            const trip = {
                id: uid(), pickup: state.pickup.name, drop: state.drop.name,
                pickupPt: { lat: state.pickup.lat, lng: state.pickup.lng }, dropPt: { lat: state.drop.lat, lng: state.drop.lng },
                km, type: state.type, base, fare,
                paymentMethod: state.pay === 'cash' ? 'Cash' : 'UPI',
                paymentStatus: state.pay === 'cash' ? 'cash on arrival' : 'pending', upiId: UPI_ID,
                promo: state.promo ? state.promo.code : '', status: state.scheduledFor ? 'scheduled' : 'requested', scheduledFor: state.scheduledFor, captain: null,
                customer: user.phone, customerName: user.name, rating: 0, at: Date.now()
            };
            const list = trips();
            list.unshift(trip);
            saveTrips(list);
            dialog.close();
            notify(trip.status === 'scheduled' ? 'Ride scheduled for ' + new Date(trip.scheduledFor).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '. Payment: ' + (state.pay === 'cash' ? 'cash' : 'UPI') + '.' : state.pay === 'cash' ? 'Ride requested. Pay ' + rupees(fare) + ' in cash to your captain.' : 'Ride requested. Pay ' + rupees(fare) + ' by UPI, or scan your captain\'s QR code.', { type: 'ride', title: 'Booking confirmed' });
            showCurrent(trip.id);
        });
        const current = $('#currentTrip');
        function showCurrent(id) {
            currentId = id;
            const trip = trips().find((t) => t.id === id);
            current.hidden = !trip;
            if (!trip) return;
            current.innerHTML = '';
            const wrap = document.createElement('div');
            wrap.className = 'trip-card';
            wrap.dataset.tripId = String(trip.id);
            wrap.innerHTML = '<div><strong>' + esc(trip.pickup) + ' → ' + esc(trip.drop) + '</strong><small>' + esc(pricing()[trip.type].label) + ' · ' + rupees(trip.fare) + '</small></div>';
            const badge = document.createElement('span');
            badge.className = 'badge-status ' + (STATUS_CLASS[trip.status] || '');
            badge.textContent = STATUS_LABEL[trip.status] || trip.status;
            badge.id = 'tripStatus';
            wrap.appendChild(badge);
            if (trip.paymentMethod === 'UPI') {
                wrap.appendChild(paymentPanel(trip, id));
            } else if (trip.paymentMethod === 'Cash' && trip.status !== 'cancelled') {
                const note = document.createElement('p');
                note.className = 'pay-note';
                note.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Pay ' + rupees(trip.fare) + ' in cash to your captain at drop-off.';
                wrap.appendChild(note);
            }
            if (trip.status === 'scheduled') {
                const when = document.createElement('p');
                when.className = 'pay-note';
                when.innerHTML = '<i class="fa-regular fa-calendar"></i> Scheduled for ' + esc(new Date(trip.scheduledFor).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '. We will look for a captain 15 minutes before.';
                wrap.appendChild(when);
            }
            if (['requested', 'accepted', 'in-progress'].includes(trip.status)) {
                const safety = document.createElement('div');
                safety.className = 'trip-safety';
                safety.innerHTML = '<button type="button" class="btn sos-btn" data-sos><i class="fa-solid fa-triangle-exclamation"></i> SOS</button>' +
                    '<button type="button" class="btn btn2" data-share><i class="fa-solid fa-share-nodes"></i> Share trip</button>';
                safety.querySelector('[data-sos]').addEventListener('click', () => openSos(trip, id));
                safety.querySelector('[data-share]').addEventListener('click', () => shareTrip(trip));
                wrap.appendChild(safety);
            }
            if (trip.status === 'completed' && !trip.rating) {
                wrap.appendChild(ratingPanel(trip, id));
            }
            if (['requested', 'scheduled'].includes(trip.status)) {
                const cancel = document.createElement('button');
                cancel.type = 'button';
                cancel.className = 'btn btn3';
                cancel.textContent = 'Cancel request';
                cancel.addEventListener('click', () => {
                    const list = trips();
                    const t = list.find((x) => x.id === id);
                    if (t) t.status = 'cancelled';
                    saveTrips(list);
                    notify('Your ride request was cancelled.', { type: 'warning', title: 'Cancelled' });
                    showCurrent(id);
                });
                wrap.appendChild(cancel);
            }
            current.appendChild(wrap);
        }
        function paymentPanel(trip, id) {
            const box = document.createElement('section');
            box.className = 'pay-panel';
            if (trip.paymentStatus === 'confirmed') {
                box.innerHTML = '<p class="pay-ok"><i class="fa-solid fa-circle-check"></i> Payment of ' + rupees(trip.fare) + ' confirmed by your captain.</p>';
                return box;
            }
            if (trip.paymentStatus === 'paid') {
                box.innerHTML = '<p class="pay-ok"><i class="fa-solid fa-clock"></i> Payment reported (UTR ' + esc(trip.utr || '–') + '). Waiting for your captain to confirm.</p>';
                return box;
            }
            const defaultLink = RapidoPay.upiLink(trip.fare, 'Ride ' + trip.id);
            box.innerHTML =
                '<p class="pay-title"><i class="fa-brands fa-google-pay"></i> Pay ' + rupees(trip.fare) + ' by UPI</p>' +
                '<p class="muted">Pay to <strong>' + esc(RapidoPay.UPI_ID) + '</strong>, or scan the QR code your captain shows.</p>' +
                '<div class="pay-actions">' +
                    '<a class="btn btn1" data-upi href="' + esc(defaultLink) + '" target="_blank" rel="noopener">Open UPI app</a>' +
                    '<button class="btn btn2" type="button" data-scan><i class="fa-solid fa-qrcode"></i> Scan captain\'s QR</button>' +
                '</div>' +
                '<p class="scan-result" data-result aria-live="polite"></p>' +
                '<form class="utr-form" novalidate><label>UTR / reference number' +
                    '<input name="utr" inputmode="numeric" maxlength="22" autocomplete="off" placeholder="The 12-digit UTR from your UPI app"></label>' +
                    '<button class="btn btn1" type="submit">I have paid</button>' +
                    '<p class="form-error" role="alert"></p>' +
                '</form>';
            const link = box.querySelector('[data-upi]');
            const result = box.querySelector('[data-result]');
            box.querySelector('[data-scan]').addEventListener('click', () => {
                RapidoPay.scan((url) => {
                    const info = RapidoPay.parseUpi(url);
                    if (!info) return;
                    link.href = url;
                    const mismatch = info.am && Math.abs(info.am - trip.fare) > 0.5;
                    result.innerHTML = '<i class="fa-solid fa-circle-check"></i> Scanned: pay ' + (info.am ? rupees(info.am) : 'any amount') + ' to ' + esc(info.pn || info.pa) + '.' +
                        (mismatch ? ' <span class="warn-text">The QR amount differs from your fare of ' + rupees(trip.fare) + '.</span>' : '');
                    notify('QR scanned. Open the UPI app to pay.', { type: 'success', title: 'QR scanned' });
                });
            });
            box.querySelector('.utr-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const err = box.querySelector('.form-error');
                const utr = e.currentTarget.utr.value.trim();
                if (!/^[A-Za-z0-9]{8,22}$/.test(utr)) { err.textContent = 'Enter the UTR from your UPI app (8 to 22 letters or numbers).'; return; }
                const list = trips();
                const t = list.find((x) => x.id === id);
                if (t) { t.paymentStatus = 'paid'; t.utr = utr; saveTrips(list); }
                notify('Payment reported. Your captain will confirm it.', { type: 'success', title: 'Payment reported' });
                showCurrent(id);
            });
            return box;
        }
        function shareText(t) {
            return 'I am on a Rapido ride from ' + t.pickup + ' to ' + t.drop + '. Captain: ' + (t.captain || 'being assigned') + '. Fare ' + rupees(t.fare) + '. Status: ' + (STATUS_LABEL[t.status] || t.status) + '.';
        }
        async function shareTrip(t) {
            const text = shareText(t);
            if (navigator.share) {
                try { await navigator.share({ title: 'My Rapido ride', text }); return; } catch (e) { /* cancelled or unavailable: fall through to copy */ }
            }
            try { await navigator.clipboard.writeText(text); notify('Trip details copied. Paste them in any app to share.', { type: 'success', title: 'Trip shared' }); }
            catch (e) { notify(text, { type: 'info', title: 'Trip details' }); }
        }
        function openSos(trip, id) {
            const contacts = store.get('contacts', []);
            const dlg = document.createElement('dialog');
            dlg.className = 'modal sos-modal';
            dlg.setAttribute('aria-labelledby', 'sosTitle');
            dlg.innerHTML =
                '<form method="dialog" class="modal-close-wrap"><button class="modal-x" aria-label="Close">&times;</button></form>' +
                '<h3 id="sosTitle"><i class="fa-solid fa-triangle-exclamation"></i> Emergency SOS</h3>' +
                '<p class="muted">If you are in danger, call 112 now. Then alert your captain and your contacts.</p>' +
                '<div class="sos-actions"><a class="btn sos-btn" href="tel:112"><i class="fa-solid fa-phone"></i> Call 112</a>' +
                '<button class="btn btn1" type="button" id="sosAlert">Alert my captain</button></div>' +
                '<h4>Your emergency contacts</h4>' +
                '<ul class="sos-contacts">' + (contacts.length
                    ? contacts.map((c) => '<li><span>' + esc(c.name) + '</span><span class="sos-contact-links"><a href="tel:' + esc(c.phone) + '">Call</a><a href="sms:' + esc(c.phone) + '?body=' + encodeURIComponent(shareText(trip)) + '">Text trip</a></span></li>').join('')
                    : '<li class="muted">No contacts saved yet. Add them on the Safety page.</li>') + '</ul>';
            document.body.appendChild(dlg);
            dlg.addEventListener('close', () => dlg.remove());
            dlg.showModal();
            dlg.querySelector('#sosAlert').addEventListener('click', () => {
                const list = trips();
                const t = list.find((x) => x.id === id);
                if (t) { t.sos = { at: Date.now() }; delete t.sosAck; saveTrips(list); }
                notify('SOS sent. Your captain has been alerted.', { type: 'error', title: 'SOS alert' });
                dlg.close();
            });
        }
        function ratingPanel(trip, id) {
            const box = document.createElement('section');
            box.className = 'rate-panel';
            let stars = 5, tip = 0;
            box.innerHTML =
                '<p class="pay-title">Rate your captain</p>' +
                '<div class="stars" role="radiogroup" aria-label="Rating">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" class="star" data-star="' + n + '" aria-label="' + n + ' stars">★</button>').join('') + '</div>' +
                '<p class="muted">Add a tip for your captain (optional)</p>' +
                '<div class="tip-chips">' + [0, 10, 20, 50].map((v) => '<button type="button" class="chip" data-tip="' + v + '">' + (v ? rupees(v) : 'No tip') + '</button>').join('') + '</div>' +
                '<label class="review-field">Comments (optional)<textarea rows="2" maxlength="200" placeholder="How was the ride?"></textarea></label>' +
                '<button class="btn btn1" type="button" data-submit>Submit rating</button>';
            const paint = () => {
                box.querySelectorAll('[data-star]').forEach((b) => b.classList.toggle('on', Number(b.dataset.star) <= stars));
                box.querySelectorAll('[data-tip]').forEach((b) => b.classList.toggle('on', Number(b.dataset.tip) === tip));
            };
            box.querySelectorAll('[data-star]').forEach((b) => b.addEventListener('click', () => { stars = Number(b.dataset.star); paint(); }));
            box.querySelectorAll('[data-tip]').forEach((b) => b.addEventListener('click', () => { tip = Number(b.dataset.tip); paint(); }));
            box.querySelector('[data-submit]').addEventListener('click', async () => {
                const list = trips();
                const t = list.find((x) => x.id === id);
                const review = box.querySelector('textarea').value.trim();
                if (t) { t.rating = stars; t.tip = tip; t.review = review; saveTrips(list); }
                try {
                    if (window.RapidoAPI && window.RapidoAPI.getToken()) {
                        await window.RapidoAPI.request('/rides/' + encodeURIComponent(String(id)) + '/rating', { method:'POST', body: JSON.stringify({ rating: stars, review }) });
                    }
                } catch (err) { /* local rating remains saved and backend.js retries the sync */ }
                notify('Thanks for rating ' + stars + ' star' + (stars > 1 ? 's' : '') + (tip ? '. Tip of ' + rupees(tip) + ' sent to your captain.' : '.'), { type: 'success', title: 'Rating saved' });
                showCurrent(id);
            });
            paint();
            return box;
        }
        let currentId = null;
        const myPhone = session() && session().phone;
        const latest = trips().find((t) => t.customer === myPhone && ['requested', 'scheduled', 'accepted', 'in-progress'].includes(t.status))
            || trips().find((t) => t.customer === myPhone && t.status === 'completed' && !t.rating);
        if (latest) { currentId = latest.id; showCurrent(latest.id); }
        window.addEventListener('storage', (e) => {
            if (e.key !== 'rc.trips') return;
            const trip = currentId ? trips().find((t) => t.id === currentId) : null;
            if (trip && trip.status !== 'cancelled') {
                const prev = $('#tripStatus');
                if (prev && prev.textContent !== (STATUS_LABEL[trip.status] || trip.status)) {
                    /* ride progress toasts come from js/live.js */
                }
                showCurrent(currentId);
            }
        });
        if (document.readyState === 'complete') initMap(); else window.addEventListener('load', initMap);
        refresh();
    }

    
    /* v18: captains get a random Captain ID at registration and sign in with it (not a phone OTP). */
    function newCaptainId(all) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const taken = new Set(Object.values(all).map((u) => u && u.captainId).filter(Boolean));
        let id;
        do {
            const buf = new Uint32Array(6);
            (window.crypto || window.msCrypto).getRandomValues(buf);
            id = 'CAP-' + Array.from(buf, (n) => chars[n % chars.length]).join('');
        } while (taken.has(id));
        return id;
    }
    function showCaptainId(form, name, id) {
        form.hidden = true;
        const card = document.createElement('div');
        card.className = 'captain-id-card reveal in';
        card.innerHTML =
            '<p class="eyebrow">Welcome, ' + esc(name) + '</p>' +
            '<h2>Your Captain ID</h2>' +
            '<p class="captain-id-value" id="newCaptainId">' + esc(id) + '</p>' +
            '<p class="muted">Keep this ID safe. You will need it to sign in as a captain. It is not shown again after you leave this page.</p>' +
            '<div class="hero-actions"><button class="btn btn2" type="button" id="copyCaptainId"><i class="fa-solid fa-copy"></i> Copy ID</button>' +
            '<a class="btn btn1" href="login.html">Go to captain sign-in</a></div>';
        form.insertAdjacentElement('afterend', card);
        card.querySelector('#copyCaptainId').addEventListener('click', () => {
            const done = () => notify('Captain ID copied.', { type: 'success', title: 'Copied' });
            if (navigator.clipboard) navigator.clipboard.writeText(id).then(done, done); else done();
        });
    }

    function initRegister() {
        const form = $('#registerForm');
        const err = $('#regError');
        const seg = $$('.seg label');
        function syncSeg() {
            seg.forEach((l) => l.classList.toggle('selected', l.querySelector('input').checked));
        }
        seg.forEach((l) => l.querySelector('input').addEventListener('change', syncSeg));
        syncSeg();
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            err.textContent = '';
            const name = form.name.value.trim();
            const phone = form.phone.value.replace(/\s+/g, '');
            const city = form.city.value.trim();
            const role = form.querySelector('input[name="role"]:checked').value;
            if (!name) return (err.textContent = 'Please enter your full name.');
            if (!PHONE_RE.test(phone)) return (err.textContent = 'Enter a valid 10-digit mobile number starting with 6-9.');
            if (!city) return (err.textContent = 'Please enter your city.');
            const all = users();
            if (all[phone] && all[phone].role !== role) {
                return (err.textContent = 'This number is already registered as a ' + all[phone].role + '. Log in instead.');
            }
            const existing = all[phone];
            const captainId = role === 'captain' ? (existing && existing.captainId) || newCaptainId(all) : null;
            all[phone] = { name, city, role, ...(captainId ? { captainId } : {}), at: existing ? existing.at : Date.now() };
            store.set('users', all);
            const s = session();
            if (s && s.phone === phone) store.set('session', { ...s, role, name });
            form.reset();
            syncSeg();
            if (captainId) {
                showCaptainId(form, name, captainId);
                notify('Captain account created. Your Captain ID is ' + captainId + '.', { type: 'success', title: 'Registered' });
                return;
            }
            notify('Account created for ' + name + ' as a ' + role + '. Log in with your number to continue.', { type: 'success', title: 'Registered' });
            setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        });
    }

    
    function allRidesForCustomer(phone) {
        const mine = trips().filter((t) => t.customer === phone).map((t) => ({ ...t, source: 'booking' }));
        const legacy = legacyRides().map((r) => ({
            id: r.id, pickup: r.pickup, drop: r.drop, km: r.km, type: r.type === 'bike-plus' ? 'bike' : r.type,
            fare: r.fare, status: r.status, rating: r.rating || 0, at: r.at, source: 'quick-booking'
        }));
        return mine.concat(legacy).sort((a, b) => b.at - a.at);
    }

    function initCustomer() {
        const user = me();
        if (!gate('customer')) return;
        $('#hello').textContent = 'Hi, ' + user.name;
        const profile = store.get('profile', {});
        const form = $('#profileForm');
        form.name.value = profile.name || user.name;
        form.city.value = profile.city || (users()[user.phone] || {}).city || '';
        form.pref.value = profile.pref || 'bike';
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const p = { name: form.name.value.trim(), city: form.city.value.trim(), pref: form.pref.value };
            if (!p.name) return toast('Please enter your name.', { type: 'warning', title: 'Profile' });
            store.set('profile', p);
            const all = users();
            if (all[user.phone]) { all[user.phone].name = p.name; all[user.phone].city = p.city; store.set('users', all); }
            notify('Profile saved.', { type: 'success', title: 'Profile updated' });
            $('#hello').textContent = 'Hi, ' + p.name;
        });

        function render() {
            const rides = allRidesForCustomer(user.phone);
            const done = rides.filter((r) => r.status === 'completed');
            const spent = done.reduce((s, r) => s + (r.fare || 0), 0);
            const rated = rides.filter((r) => r.rating);
            const avg = rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1) : '–';
            setText('#statRides', rides.length);
            setText('#statDone', done.length);
            setText('#statSpent', rupees(spent));
            setText('#statRating', avg);
            const body = $('#customerRows');
            body.innerHTML = '';
            rides.slice(0, 50).forEach((r, i) => {
                const tr = document.createElement('tr');
                tr.style.animationDelay = (i * 40) + 'ms';
                tr.innerHTML =
                    '<td>' + esc(fmtDate(r.at)) + '</td>' +
                    '<td>' + esc(r.pickup) + ' → ' + esc(r.drop) + '</td>' +
                    '<td><i class="fa-solid ' + (TYPE_ICON[r.type] || 'fa-motorcycle') + '"></i> ' + esc((pricing()[r.type] || DEFAULT_PRICING.bike).label) + '</td>' +
                    '<td>' + rupees(r.fare || 0) + '</td>' +
                    '<td><span class="badge-status ' + (STATUS_CLASS[r.status] || '') + '">' + esc(STATUS_LABEL[r.status] || r.status) + '</span></td>' +
                    '<td>' + (r.rating ? '★ ' + r.rating : '–') + '</td>' +
                    '<td>' + (r.status === 'completed' && !r.rating ? '<button type="button" class="btn-link rate-completed" data-rate-id="' + esc(r.id) + '">Rate captain</button>' : '') + '</td>';
                body.appendChild(tr);
            });
            $$('#customerRows [data-rate-id]').forEach((btn) => btn.addEventListener('click', () => {
                const id = btn.dataset.rateId;
                const trip = rides.find((r) => String(r.id) === String(id));
                if (!trip) return;
                const panel = $('#customerRatingPanel');
                if (!panel) return;
                panel.innerHTML = '<div class="dash-rating-editor"><strong>Rate ' + esc(trip.captain || 'your captain') + '</strong><div class="stars" role="radiogroup" aria-label="Captain rating">' + [1,2,3,4,5].map(n => '<button type="button" data-dash-star="'+n+'" aria-label="'+n+' stars">★</button>').join('') + '</div><textarea id="dashReview" rows="3" maxlength="300" placeholder="Optional feedback"></textarea><button type="button" class="btn btn1" id="dashRateSubmit">Submit rating</button></div>';
                panel.scrollIntoView({behavior:'smooth',block:'center'});
                let chosen=0;
                panel.querySelectorAll('[data-dash-star]').forEach(st => st.addEventListener('click', () => { chosen=Number(st.dataset.dashStar); panel.querySelectorAll('[data-dash-star]').forEach(x=>x.classList.toggle('on', Number(x.dataset.dashStar)<=chosen)); }));
                panel.querySelector('#dashRateSubmit').addEventListener('click', async () => {
                    if(!chosen) return notify('Choose a star rating first.', {type:'warning', title:'Rating'});
                    const review=panel.querySelector('#dashReview').value.trim();
                    trip.rating=chosen; trip.review=review; saveTrips(trips);
                    try { if(window.RapidoAPI&&window.RapidoAPI.getToken()) await window.RapidoAPI.request('/rides/'+encodeURIComponent(String(id))+'/rating',{method:'POST',body:JSON.stringify({rating:chosen,review})}); } catch(e) {}
                    notify('Captain rated ' + chosen + ' out of 5.', {type:'success', title:'Rating submitted'});
                    render();
                });
            }));
            const ratingPanel = $('#customerRatingPanel');
            if (ratingPanel && !rides.some(r => r.status === 'completed' && !r.rating)) ratingPanel.innerHTML = '<p class="empty">All completed rides are rated. New rating options appear after your next completed ride.</p>';
            $('#customerEmpty').hidden = rides.length > 0;
            $('#customerTable').hidden = rides.length === 0;
        }
        render();
        window.addEventListener('storage', render);
    }

    
    const GENERATED_RIDERS = ['Aditi', 'Rohan', 'Kavya', 'Nikhil', 'Sana'];
    let generatedRideTimer = null;
    const ACCEPTANCE_WINDOW = 30 * 1000;

    function expireLocalRequests() {
        const list = trips();
        const now = Date.now();
        let changed = false;
        list.forEach((t) => {
            const created = Number(t.at || 0);
            if (t.status === 'requested' && !t.captain && created && now - created >= ACCEPTANCE_WINDOW) {
                t.status = 'cancelled';
                t.cancelReason = 'captain-timeout';
                t.timeoutAt = now;
                changed = true;
            }
        });
        if (changed) saveTrips(list);
        return changed;
    }

    function initCaptain() {
        const user = me();
        if (!gate('captain')) return;
        $('#capHello').textContent = 'Hi, ' + user.name;
        const capRec = store.get('users', {})[user.phone] || {};
        const dashHead = $('#content .dash-head');
        if (dashHead && !$('#capIdCard')) {
            const idCard = document.createElement('section');
            idCard.id = 'capIdCard';
            idCard.className = 'captain-console-card';
            idCard.innerHTML = '<div><span class="cc-label">Captain ID</span><strong class="cc-id">' + esc(capRec.captainId || 'Not assigned') + '</strong></div>' +
                '<div><span class="cc-label">Rating</span><strong id="capRating">–</strong></div>' +
                '<div><span class="cc-label">City</span><strong>' + esc(capRec.city || 'Your city') + '</strong></div>' +
                '<button class="btn btn2" type="button" id="capCopy"' + (capRec.captainId ? '' : ' disabled') + '><i class="fa-solid fa-copy"></i> Copy ID</button>';
            dashHead.insertAdjacentElement('afterend', idCard);
            const copy = idCard.querySelector('#capCopy');
            if (copy) copy.addEventListener('click', () => { const done = () => notify('Captain ID copied.', { type: 'success', title: 'Copied' }); if (navigator.clipboard) navigator.clipboard.writeText(capRec.captainId).then(done, done); else done(); });
        }
        const online = $('#onlineToggle');
        online.checked = !!store.get('captainOnline', false);

        function captainTrips() { return trips().filter((t) => t.captain === user.name); }

        function makeGeneratedRequest() {
            const a = LOCALITIES[Math.floor(Math.random() * LOCALITIES.length)];
            const b = LOCALITIES.filter((l) => l.city === a.city && l !== a)[0];
            if (!b) return;
            const km = Math.max(1, Math.round(distanceKm(a, b) * 10) / 10);
            const type = ['bike', 'auto', 'cab'][Math.floor(Math.random() * 3)];
            const list = trips();
            list.unshift({
                id: uid(), pickup: a.name, drop: b.name, pickupPt: { lat: a.lat, lng: a.lng }, dropPt: { lat: b.lat, lng: b.lng },
                km, type, base: fareFor(km, type), fare: fareFor(km, type), promo: '', status: 'requested', captain: null,
                customer: 'generated', customerName: GENERATED_RIDERS[Math.floor(Math.random() * GENERATED_RIDERS.length)] + ' (automated request)', rating: 0, at: Date.now()
            });
            saveTrips(list);
            return a;
        }

        /* While online, keep sending automated requests (up to 8 waiting at once), every 3 to 6 seconds. */
        function scheduleGeneratedRide() {
            clearTimeout(generatedRideTimer);
            if (!online.checked) return;
            const tick = () => {
                if (!online.checked) return;
                const pending = trips().filter((t) => t.status === 'requested' && !t.captain).length;
                if (pending < 8) {
                    const a = makeGeneratedRequest();
                    if (a) notify('New ride request from ' + a.name + '.', { type: 'ride', title: 'New request' });
                    render();
                }
                generatedRideTimer = setTimeout(tick, 3000 + Math.random() * 3000);
            };
            generatedRideTimer = setTimeout(tick, 1200);
        }

        online.addEventListener('change', () => {
            store.set('captainOnline', online.checked);
            notify(online.checked ? 'You are online and can receive ride requests.' : 'You are offline. No new requests will be shown.', { type: online.checked ? 'success' : 'info', title: online.checked ? 'Online' : 'Offline' });
            render();
            scheduleGeneratedRide();
        });

        function act(id, status, extra) {
            const list = trips();
            const t = list.find((x) => x.id === id);
            if (!t) return;
            t.status = status;
            if (extra) Object.assign(t, extra);
            saveTrips(list);
            render();
        }

        function captainPayBox(t) {
            const box = document.createElement('div');
            box.className = 'cap-pay';
            const amount = rupees(t.fare);
            const mk = (label) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn1'; b.textContent = label; return b; };
            if (t.paymentMethod === 'Cash') {
                if (t.paymentStatus === 'cash collected') {
                    box.innerHTML = '<p class="pay-ok"><i class="fa-solid fa-circle-check"></i> Cash of ' + amount + ' collected.</p>';
                } else {
                    box.innerHTML = '<p class="muted">Collect ' + amount + ' in cash at drop-off.</p>';
                    const b = mk('Cash collected');
                    b.addEventListener('click', () => { act(t.id, t.status, { paymentStatus: 'cash collected' }); notify('Cash of ' + amount + ' collected.', { type: 'success', title: 'Cash collected' }); });
                    box.appendChild(b);
                }
                return box;
            }
            if (t.paymentStatus === 'confirmed') {
                box.innerHTML = '<p class="pay-ok"><i class="fa-solid fa-circle-check"></i> UPI payment of ' + amount + ' confirmed.</p>';
                return box;
            }
            const qr = document.createElement('div');
            qr.className = 'cap-qr';
            const qrImage = document.createElement('img');
            qrImage.src = 'assets/payments/upi-payment-qr.jpeg';
            qrImage.alt = 'UPI payment QR code';
            qrImage.loading = 'lazy';
            qrImage.style.cssText = 'display:block;width:min(100%,280px);height:auto;margin:0 auto;border-radius:12px;background:#fff';
            qr.appendChild(qrImage);
            const qrHint = document.createElement('p');
            qrHint.className = 'muted';
            qrHint.textContent = 'Scan with a supported UPI app. Verify the recipient and enter the ride fare before paying.';
            box.appendChild(qr);
            box.appendChild(qrHint);
            const note = document.createElement('p');
            note.className = 'muted';
            note.textContent = t.paymentStatus === 'paid'
                ? 'The rider reported payment. UTR ' + (t.utr || '–') + '. Check your UPI app, then confirm.'
                : 'Ask the rider to scan this QR code to pay ' + amount + '.';
            box.appendChild(note);
            if (t.paymentStatus === 'paid') {
                const b = mk('Confirm payment received');
                b.addEventListener('click', () => { act(t.id, t.status, { paymentStatus: 'confirmed' }); notify('Payment of ' + amount + ' confirmed.', { type: 'success', title: 'Payment confirmed' }); });
                box.appendChild(b);
            }
            return box;
        }

        const seenSos = new Set();
        function render() {
            expireLocalRequests();
            const nowTs = Date.now();
            const pendingSchedule = trips();
            let promoted = false;
            pendingSchedule.forEach((t) => {
                if (t.status === 'scheduled' && t.scheduledFor && t.scheduledFor - nowTs <= 15 * 60000) { t.status = 'requested'; promoted = true; }
            });
            if (promoted) saveTrips(pendingSchedule);
            const requests = trips().filter((t) => t.status === 'requested' && !t.captain);
            const box = $('#requests');
            /* Ring while requests are waiting and the captain is online; stop when none are left. */
            if (window.RapidoSounds) window.RapidoSounds.setRinging(online.checked && requests.length > 0);
            box.innerHTML = '';
            if (!online.checked) {
                box.innerHTML = '<p class="empty">Go online to receive ride requests.</p>';
            } else if (!requests.length) {
                box.innerHTML = '<p class="empty">No requests right now. New requests appear here.</p>';
            } else {
                requests.slice(0, 6).forEach((r) => {
                    const card = document.createElement('div');
                    card.className = 'request-card';
                    card.innerHTML =
                        '<strong>' + esc(r.pickup) + ' → ' + esc(r.drop) + '</strong>' +
                        '<div class="muted">' + esc(r.customerName || 'Rider') + ' · ' + esc(pricing()[r.type].label) + ' · ' + r.km + ' km · ' + rupees(r.fare) + '</div>';
                    const actions = document.createElement('div');
                    actions.className = 'actions';
                    const accept = document.createElement('button');
                    accept.type = 'button'; accept.className = 'btn btn1'; accept.textContent = 'Accept';
                    accept.addEventListener('click', () => {
                        act(r.id, 'in-progress', { captain: user.name, acceptedAt: Date.now(), startedAt: Date.now() });
                        notify('You accepted the ride from ' + r.pickup + '. The ride has started.', { type: 'ride', title: 'Ride started' });
                    });
                    const decline = document.createElement('button');
                    decline.type = 'button'; decline.className = 'btn btn3'; decline.textContent = 'Decline';
                    decline.addEventListener('click', () => {
                        act(r.id, 'cancelled');
                        notify('Request declined.', { type: 'info', title: 'Declined' });
                    });
                    actions.append(accept, decline);
                    card.appendChild(actions);
                    box.appendChild(card);
                });
            }

            const mine = captainTrips();
            const active = mine.filter((t) => t.status === 'accepted' || t.status === 'in-progress');
            const activeBox = $('#activeTrips');
            activeBox.innerHTML = '';
            active.filter((t) => t.sos && !t.sosAck).forEach((t) => {
                const alarm = document.createElement('div');
                alarm.className = 'sos-alert';
                alarm.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><div><strong>SOS from your rider</strong><p>' + esc(t.customerName || 'Rider') + ' on ' + esc(t.pickup) + ' → ' + esc(t.drop) + '. Call the rider or 112 now.</p></div>';
                const ack = document.createElement('button');
                ack.type = 'button';
                ack.className = 'btn btn1';
                ack.textContent = 'I have acknowledged';
                ack.addEventListener('click', () => act(t.id, t.status, { sosAck: true }));
                alarm.appendChild(ack);
                activeBox.appendChild(alarm);
                const stamp = t.sos.at;
                if (!seenSos.has(stamp)) { seenSos.add(stamp); if (window.RapidoSounds) window.RapidoSounds.play('sos'); }
            });
            active.forEach((t) => {
                const card = document.createElement('div');
                card.className = 'trip-card';
                card.innerHTML = '<div><strong>' + esc(t.pickup) + ' → ' + esc(t.drop) + '</strong><small>' + esc(t.customerName || 'Rider') + ' · ' + rupees(t.fare) + '</small></div>';
                const badge = document.createElement('span');
                badge.className = 'badge-status ' + (STATUS_CLASS[t.status] || '');
                badge.textContent = STATUS_LABEL[t.status];
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn1';
                if (t.status === 'accepted') {
                    btn.textContent = 'Start ride';
                    btn.addEventListener('click', () => { act(t.id, 'in-progress'); notify('Ride started.', { type: 'ride', title: 'Ride started' }); });
                } else {
                    btn.textContent = 'Complete ride';
                    btn.addEventListener('click', () => {
                        act(t.id, 'completed');
                        notify('Ride completed. You earned ' + rupees(Math.round(t.fare * 0.8)) + ' (80% share, based on the current fare settings).', { type: 'success', title: 'Ride completed' });
                    });
                }
                card.append(badge, btn);
                if (!t.arrivedAt) {
                    const reached = document.createElement('button');
                    reached.type = 'button';
                    reached.className = 'btn btn2 reached-btn';
                    reached.textContent = 'Reached pickup';
                    reached.addEventListener('click', () => {
                        act(t.id, t.status, { arrivedAt: Date.now() });
                        notify('You reached the pickup point. The rider has been alerted.', { type: 'info', title: 'Captain arrived' });
                    });
                    card.appendChild(reached);
                }
                card.appendChild(captainPayBox(t));
                activeBox.appendChild(card);
            });
            $('#activeEmpty').hidden = active.length > 0;

            const done = mine.filter((t) => t.status === 'completed');
            const today = new Date().toDateString();
            const todayEarn = done.filter((t) => new Date(t.at).toDateString() === today).reduce((s, t) => s + Math.round(t.fare * 0.8) + (t.tip || 0), 0);
            const totalEarn = done.reduce((s, t) => s + Math.round(t.fare * 0.8) + (t.tip || 0), 0);
            setText('#capToday', rupees(todayEarn));
            setText('#capTotal', rupees(totalEarn));
            setText('#capRides', done.length);
            const acceptedRides = mine.filter((t) => t.captain === user.name && (t.acceptedAt || ['accepted', 'in-progress', 'completed'].includes(t.status)));
            const completedAccepted = acceptedRides.filter((t) => t.status === 'completed').length;
            const completionRate = acceptedRides.length ? (completedAccepted / acceptedRides.length) * 100 : 0;
            const completionScore = acceptedRides.length ? (completionRate / 20) : 0;
            const rated = mine.filter((t) => t.rating > 0);
            const avgRating = rated.length ? (rated.reduce((sum, t) => sum + Number(t.rating), 0) / rated.length) : 0;
            setText('#capRating', acceptedRides.length ? completionScore.toFixed(1) + ' ★ (' + completionRate.toFixed(0) + '% completion)' : 'No ride score yet');
            setText('#capScoreText', acceptedRides.length
                ? completionScore.toFixed(1) + ' / 5.0 completion score · ' + completedAccepted + '/' + acceptedRides.length + ' accepted rides completed'
                : 'Complete accepted rides to build your score');
            const scoreBar = $('#capScoreBar');
            if (scoreBar) scoreBar.style.width = completionRate + '%';
            const customerRating = $('#capCustomerRating');
            if (customerRating) customerRating.textContent = rated.length ? avgRating.toFixed(1) + ' ★ from ' + rated.length + ' customer rating(s)' : 'Customer ratings: none yet';
            setText('#capStatus', online.checked ? 'Online' : 'Offline');
            const hist = $('#capHistory');
            hist.innerHTML = '';
            done.slice(0, 20).forEach((t) => {
                const li = document.createElement('li');
                li.className = 'list-row';
                li.innerHTML = '<span>' + esc(t.pickup) + ' → ' + esc(t.drop) + '<small class="muted"> · ' + esc(fmtDate(t.at)) + (t.rating ? ' · <span class="history-rating">' + '★'.repeat(Math.max(0, Math.min(5, Number(t.rating)))) + '</span>' : '') + '</small></span><strong>' + rupees(Math.round(t.fare * 0.8)) + '</strong>';
                hist.appendChild(li);
            });
            $('#capHistoryEmpty').hidden = done.length > 0;
        }

        render();
        scheduleGeneratedRide();
        window.addEventListener('storage', () => { render(); });
        setInterval(() => { if (online.checked) render(); }, 4000);
    }

    
    function initAdmin() {
        if (!gate('admin')) return;
        let sortKey = 'at';
        let sortDir = -1;

        function allTrips() {
            const booked = trips().map((t) => ({ ...t, source: 'booking' }));
            const legacy = legacyRides().map((r) => ({
                id: r.id, pickup: r.pickup, drop: r.drop, km: r.km, type: r.type === 'bike-plus' ? 'bike' : r.type,
                fare: r.fare, status: r.status === 'active' ? 'in-progress' : r.status, rating: r.rating || 0,
                at: r.at, customerName: 'Quick booking', source: 'quick-booking'
            }));
            return booked.concat(legacy);
        }

        function stats() {
            const all = allTrips();
            const done = all.filter((t) => t.status === 'completed');
            const revenue = done.reduce((s, t) => s + (t.fare || 0), 0);
            setText('#aTotal', all.length);
            setText('#aCompleted', done.length);
            setText('#aRevenue', rupees(revenue));
            setText('#aAvg', done.length ? rupees(revenue / done.length) : '–');
            setText('#aUsers', Object.keys(users()).length);
        }

        function rows() {
            const q = $('#aSearch').value.trim().toLowerCase();
            const st = $('#aStatus').value;
            return allTrips()
                .filter((t) => (!st || t.status === st) && (!q || (t.pickup + ' ' + t.drop + ' ' + (t.customerName || '')).toLowerCase().includes(q)))
                .sort((a, b) => {
                    const x = a[sortKey], y = b[sortKey];
                    return (x > y ? 1 : x < y ? -1 : 0) * sortDir;
                });
        }

        function render() {
            stats();
            const list = rows();
            const body = $('#aRows');
            body.innerHTML = '';
            list.slice(0, 200).forEach((t, i) => {
                const tr = document.createElement('tr');
                tr.style.animationDelay = (i * 25) + 'ms';
                tr.innerHTML =
                    '<td>' + esc(fmtDate(t.at)) + '</td>' +
                    '<td>' + esc(t.customerName || '–') + '</td>' +
                    '<td>' + esc(t.pickup) + ' → ' + esc(t.drop) + '</td>' +
                    '<td>' + esc((pricing()[t.type] || DEFAULT_PRICING.bike).label) + '</td>' +
                    '<td>' + rupees(t.fare || 0) + '</td>' +
                    '<td><span class="badge-status ' + (STATUS_CLASS[t.status] || '') + '">' + esc(STATUS_LABEL[t.status] || t.status) + '</span></td>';
                body.appendChild(tr);
            });
            $('#aEmpty').hidden = list.length > 0;
            $$('th[data-sort]').forEach((th) => {
                th.textContent = th.dataset.label + (th.dataset.sort === sortKey ? (sortDir > 0 ? ' ↑' : ' ↓') : '');
            });
        }

        $$('th[data-sort]').forEach((th) => th.addEventListener('click', () => {
            const key = th.dataset.sort;
            sortDir = sortKey === key ? -sortDir : -1;
            sortKey = key;
            render();
        }));
        $('#aSearch').addEventListener('input', render);
        $('#aStatus').addEventListener('change', render);

        $('#csvBtn').addEventListener('click', () => {
            const list = rows();
            const head = ['date', 'customer', 'pickup', 'drop', 'type', 'fare', 'status'];
            const lines = [head.join(',')].concat(list.map((t) => [
                new Date(t.at).toISOString(), t.customerName || '', t.pickup, t.drop,
                (pricing()[t.type] || DEFAULT_PRICING.bike).label, t.fare || 0, t.status
            ].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')));
            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'rides-' + new Date().toISOString().slice(0, 10) + '.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            notify(list.length + ' rides exported to CSV.', { type: 'success', title: 'Export ready' });
        });
        const pf = $('#pricingForm');
        const pr = pricing();
        Object.keys(DEFAULT_PRICING).forEach((k) => {
            pf.querySelector('[name="' + k + '_base"]').value = pr[k].base;
            pf.querySelector('[name="' + k + '_perKm"]').value = pr[k].perKm;
        });
        pf.addEventListener('submit', (e) => {
            e.preventDefault();
            const next = {};
            for (const k of Object.keys(DEFAULT_PRICING)) {
                const base = Number(pf.querySelector('[name="' + k + '_base"]').value);
                const perKm = Number(pf.querySelector('[name="' + k + '_perKm"]').value);
                if (!(base >= 0 && base <= 500) || !(perKm >= 0 && perKm <= 100)) {
                    return toast('Base must be 0–500 and per-km 0–100.', { type: 'warning', title: 'Check fares' });
                }
                next[k] = { base, perKm };
            }
            store.set('pricing', next);
            notify('Fares updated. Booking page prices change immediately.', { type: 'success', title: 'Fares saved' });
            render();
        });
        function renderPromos() {
            const list = $('#promoList');
            const items = promos();
            list.innerHTML = '';
            items.forEach((p, i) => {
                const li = document.createElement('li');
                li.className = 'list-row';
                li.innerHTML = '<span><strong>' + esc(p.code) + '</strong> · ' + p.percent + '% off <small class="muted">' + (p.active ? 'active' : 'paused') + '</small></span>';
                const actions = document.createElement('span');
                const toggle = document.createElement('button');
                toggle.type = 'button'; toggle.className = 'btn-link'; toggle.textContent = p.active ? 'Pause' : 'Activate';
                toggle.addEventListener('click', () => {
                    const all = promos();
                    all[i].active = !all[i].active;
                    store.set('promos', all);
                    renderPromos();
                });
                const del = document.createElement('button');
                del.type = 'button'; del.className = 'btn-link'; del.textContent = 'Delete';
                del.addEventListener('click', () => {
                    const all = promos();
                    all.splice(i, 1);
                    store.set('promos', all);
                    notify('Promo ' + p.code + ' deleted.', { type: 'info', title: 'Promo removed' });
                    renderPromos();
                });
                actions.append(toggle, document.createTextNode(' '), del);
                li.appendChild(actions);
                list.appendChild(li);
            });
            $('#promoEmpty').hidden = items.length > 0;
        }
        $('#promoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            const code = f.code.value.trim().toUpperCase();
            const percent = Number(f.percent.value);
            if (!/^[A-Z0-9]{3,12}$/.test(code)) return toast('Use 3–12 letters or numbers for the code.', { type: 'warning', title: 'Promo code' });
            if (!(percent >= 1 && percent <= 90)) return toast('Percent must be between 1 and 90.', { type: 'warning', title: 'Promo code' });
            const all = promos();
            if (all.some((p) => p.code === code)) return toast('That code already exists.', { type: 'warning', title: 'Promo code' });
            all.unshift({ code, percent, active: true });
            store.set('promos', all);
            f.reset();
            notify('Promo ' + code + ' created at ' + percent + '% off.', { type: 'success', title: 'Promo created' });
            renderPromos();
        });
        renderPromos();
        const ul = $('#userList');
        const all = users();
        ul.innerHTML = '';
        Object.keys(all).forEach((phone) => {
            const li = document.createElement('li');
            li.className = 'list-row';
            li.innerHTML = '<span>' + esc(all[phone].name) + ' <small class="muted">· ' + esc(all[phone].city || '') + '</small></span><span class="badge-status">' + esc(all[phone].role) + ' · ' + esc(maskPhone(phone)) + '</span>';
            ul.appendChild(li);
        });
        $('#userEmpty').hidden = Object.keys(all).length > 0;

        render();
        window.addEventListener('storage', render);
    }

    
    function initDashboardRouter() {
        // The Dashboard page is now the role-selection hub.
        // dashboard-hub.js owns the sign-in flow, so do not auto-redirect
        // before the user can choose Rider / Captain / Admin.
        const box = $('#routeText');
        if (box) box.textContent = 'Choose Rider, Captain or Admin to continue.';
    }

    function setText(sel, text) {
        const el = $(sel);
        if (!el) return;
        const next = String(text);
        if (el.textContent !== next) {
            el.textContent = next;
            if (!reduceMotion) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
        }
    }

    
    const routes = {
        booking: initBooking,
        register: initRegister,
        customer: initCustomer,
        captain: initCaptain,
        admin: initAdmin,
        dashboard: initDashboardRouter
    };
    if (routes[page]) routes[page]();
})();
