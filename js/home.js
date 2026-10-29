
(function () {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function goToBooking(focusKind, rideType, from, to) {
        const params = new URLSearchParams();
        if (focusKind) params.set('focus', focusKind);
        if (rideType) params.set('ride', rideType);
        if (from) params.set('pickup', from);
        if (to) params.set('drop', to);
        window.location.href = 'booking.html' + (params.toString() ? '?' + params.toString() : '');
    }
    $$('[data-ride]').forEach((btn) => {
        btn.addEventListener('click', () => {
            goToBooking('pickup', btn.dataset.ride);
        });
    });
    $$('[data-focus], [data-step="route"]').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            goToBooking('pickup');
        });
    });
    const track = $('[data-step="track"]');
    if (track) track.addEventListener('click', () => goToBooking('pickup'));
    $$('.diff-tile').forEach((tile) => {
        tile.addEventListener('click', () => {
            const open = !tile.classList.contains('open');
            $$('.diff-tile').forEach((t) => { t.classList.remove('open'); t.setAttribute('aria-expanded', 'false'); });
            tile.classList.toggle('open', open);
            tile.setAttribute('aria-expanded', String(open));
        });
    });
    const phoneForm = $('#phoneForm');
    const phoneFare = $('#phoneFare');
    const phoneNote = $('#phoneNote');
    const phonePickup = $('#phonePickup');
    const phoneDrop = $('#phoneDrop');

    function setNote(msg) { if (phoneNote) phoneNote.textContent = msg; }

    function showQuote() {
        const q = window.RideBooking && window.RideBooking.quote();
        if (!phoneFare) return;
        phoneFare.textContent = q ? q.label + ' · ₹' + Math.round(q.fare).toLocaleString('en-IN') + ' · ' + q.km + ' km' : 'Estimate on booking';
    }

    if (phoneForm) {
        phoneForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const from = phonePickup.value.trim();
            const to = phoneDrop.value.trim();
            if (!from || !to) {
                setNote('Add a pickup and a destination first.');
                (from ? phoneDrop : phonePickup).focus();
                return;
            }
            setNote('Measuring the road distance…');
            const km = window.RideBooking ? await window.RideBooking.setPlaces(from, to) : null;
            if (km == null) {
                setNote('Pick both places from the suggestions in the booking form below.');
            } else {
                setNote('Your estimate is ready in the booking form.');
                showQuote();
            }
            goToBooking('pickup', null, from, to);
        });
    }

    document.addEventListener('routechange', showQuote);
})();
