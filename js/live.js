/* v20: rider progress alerts on every page. Watches the rider's trips and announces each change once:
   ride started (captain accepted), captain arrived, ride completed, cancelled, payment confirmed.
   Each alert plays its own tune through js/sounds.js. */
(function () {
    'use strict';
    const root = document.getElementById('toasts');
    if (!root) return;
    const set = (k, v) => { try { localStorage.setItem('rc.' + k, JSON.stringify(v)); } catch (e) {} };
    const get = (k, fb) => { try { const v = localStorage.getItem('rc.' + k); return v === null ? fb : JSON.parse(v); } catch (e) { return fb; } };
    let snap = null;

    function pushNotification(title, message, type) {
        const items = get('notifications', []);
        items.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), title, message, type, at: Date.now(), read: false });
        set('notifications', items.slice(0, 50));
    }

    function announce(title, message, type) {
        if (window.RC && window.RC.notify) { window.RC.notify(message, { title, type }); return; }
        pushNotification(title, message, type);
        const el = document.createElement('div');
        el.className = 'toast type-' + type;
        el.setAttribute('role', 'status');
        el.innerHTML = '<div class="toast-body"><strong></strong><p></p></div>';
        el.querySelector('strong').textContent = title;
        el.querySelector('p').textContent = message;
        root.appendChild(el);
        requestAnimationFrame(() => el.classList.add('in'));
        setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 4800);
    }

    function riderTrips() {
        const s = get('session', null);
        if (!s || !s.phone) return null;
        const map = {};
        get('trips', []).forEach((t) => {
            if (t.customer === s.phone) map[t.id] = { status: t.status, captain: t.captain || '', arrived: !!t.arrivedAt, pay: t.paymentStatus || '', cancelReason: t.cancelReason || '' };
        });
        return map;
    }

    function check() {
        const cur = riderTrips();
        if (!cur) { snap = null; return; }
        if (snap === null) { snap = cur; return; } // first look: no alerts for old trips
        Object.keys(cur).forEach((id) => {
            const now = cur[id], prev = snap[id];
            if (!prev) return; // new bookings are announced on the booking page
            const who = now.captain || 'Your captain';
            if (prev.status !== now.status) {
                if (now.status === 'in-progress' && prev.status === 'requested') announce('Ride started', who + ' accepted your ride and the ride has started.', 'ride');
                else if (now.status === 'completed') announce('Ride completed', 'You have reached your destination. Please rate your ride.', 'success');
                else if (now.status === 'cancelled') {
                    if (now.cancelReason === 'captain-timeout') announce('Captain did not accept', 'No captain accepted your ride within 30 seconds. The request was removed. You can book another ride from the booking page.', 'warning');
                    else announce('Ride cancelled', 'This ride was cancelled.', 'warning');
                }
            }
            if (now.arrived && !prev.arrived) announce('Captain arrived', who + ' has reached the pickup point. Please board.', 'warning');
            if (now.pay === 'confirmed' && prev.pay !== 'confirmed') announce('Payment confirmed', 'Your captain confirmed your payment. Thank you.', 'success');
            if (now.pay === 'cash collected' && prev.pay !== 'cash collected') announce('Payment confirmed', 'Your captain collected the cash payment. Thank you.', 'success');
        });
        snap = cur;
    }

    window.addEventListener('storage', (e) => { if (e.key === 'rc.trips' || e.key === 'rc.session') check(); });
    setInterval(check, 1500);
    check();
})();
