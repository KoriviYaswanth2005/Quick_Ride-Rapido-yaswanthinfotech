/* Ride booking enhancements: saved places and downloadable ride receipts. */
(function () {
  'use strict';
  const KEY = 'rc.savedPlaces';
  const $ = (selector, root = document) => root.querySelector(selector);
  const get = (key, fallback) => {
    try { const raw = localStorage.getItem('rc.' + key); return raw ? JSON.parse(raw) : fallback; }
    catch (_) { return fallback; }
  };
  const set = (key, value) => {
    try { localStorage.setItem('rc.' + key, JSON.stringify(value)); } catch (_) {}
  };
  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const places = () => get('savedPlaces', []);
  const savePlaces = (items) => set('savedPlaces', items.slice(0, 12));

  function addSavedPlaceControls() {
    [['bkPickup', 'Pickup'], ['bkDrop', 'Drop-off']].forEach(([inputId, label]) => {
      const input = document.getElementById(inputId);
      if (!input || document.getElementById(inputId + 'SavedControls')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'saved-place-controls';
      wrapper.id = inputId + 'SavedControls';
      wrapper.innerHTML = `
        <button type="button" class="saved-place-save" data-save="${inputId}" aria-label="Save ${label} as a favourite">
          <span aria-hidden="true">☆</span> Save ${label}
        </button>
        <div class="saved-place-list" data-list="${inputId}" aria-label="Favourite ${label} locations"></div>`;
      input.closest('.suggest').appendChild(wrapper);
      wrapper.querySelector('[data-save]').addEventListener('click', () => {
        const value = input.value.trim();
        if (!value) {
          input.focus();
          announce('Enter a location first, then save it as a favourite.', 'warning');
          return;
        }
        const items = places();
        const exists = items.some((item) => item.label.toLowerCase() === value.toLowerCase());
        if (!exists) {
          items.unshift({ id: Date.now().toString(36), label: value, kind: label, savedAt: Date.now() });
          savePlaces(items);
        }
        renderSavedPlaces();
        announce(exists ? 'This location is already saved.' : 'Favourite location saved.', 'success');
      });
    });
    renderSavedPlaces();
  }

  function renderSavedPlaces() {
    [['bkPickup', 'Pickup'], ['bkDrop', 'Drop-off']].forEach(([inputId, kind]) => {
      const list = document.querySelector('[data-list="' + inputId + '"]');
      if (!list) return;
      const items = places();
      list.innerHTML = '';
      const matching = items.filter((item) => item.kind === kind || !item.kind);
      if (!matching.length) {
        const hint = document.createElement('span');
        hint.className = 'saved-place-empty';
        hint.textContent = 'Your favourite places appear here.';
        list.appendChild(hint);
        return;
      }
      matching.slice(0, 5).forEach((item) => {
        const row = document.createElement('div');
        row.className = 'saved-place-item';
        const choose = document.createElement('button');
        choose.type = 'button';
        choose.className = 'saved-place-chip';
        choose.textContent = '☆ ' + item.label;
        choose.title = 'Use ' + item.label;
        choose.addEventListener('click', () => {
          const input = document.getElementById(inputId);
          input.value = item.label;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'saved-place-remove';
        remove.textContent = '×';
        remove.setAttribute('aria-label', 'Remove favourite ' + item.label);
        remove.addEventListener('click', () => {
          savePlaces(places().filter((place) => place.id !== item.id));
          renderSavedPlaces();
        });
        row.append(choose, remove);
        list.appendChild(row);
      });
    });
  }

  function announce(message, type) {
    if (window.RC && typeof window.RC.notify === 'function') {
      window.RC.notify(message, { type: type || 'info', title: 'QuickRide' });
      return;
    }
    const root = document.getElementById('toasts');
    if (!root) return;
    const toast = document.createElement('div');
    toast.className = 'toast type-' + (type || 'info');
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    root.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function downloadReceipt(trip) {
    const money = (value) => 'INR ' + Math.round(Number(value) || 0).toLocaleString('en-IN');
    const date = new Date(trip.completedAt || trip.updatedAt || trip.at || Date.now());
    const rows = [
      'QUICKRIDE - RIDE RECEIPT',
      '========================================',
      'Receipt ID: ' + (trip.id || 'N/A'),
      'Date: ' + date.toLocaleString('en-IN'),
      'Passenger: ' + (trip.customerName || 'Passenger'),
      'Pickup: ' + (trip.pickup || 'N/A'),
      'Drop-off: ' + (trip.drop || 'N/A'),
      'Ride type: ' + (trip.type || trip.rideType || 'Ride'),
      'Captain: ' + (trip.captain || 'Not available'),
      'Distance: ' + (trip.distance ? Number(trip.distance).toFixed(1) + ' km' : 'As recorded in booking'),
      'Fare: ' + money(trip.fare),
      'Payment mode: ' + String(trip.pay || trip.paymentMode || 'Not specified').toUpperCase(),
      'Payment status: ' + (trip.paymentStatus || 'Not recorded'),
      'Ride status: ' + String(trip.status || 'unknown').toUpperCase(),
      '========================================',
      'This receipt reflects the ride details saved in this browser.',
      'For payment disputes, verify the transaction with your payment provider.'
    ];
    const blob = new Blob([rows.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'QuickRide-receipt-' + String(trip.id || Date.now()).replace(/[^a-z0-9_-]/gi, '') + '.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function addReceiptButton() {
    const current = document.getElementById('currentTrip');
    if (!current) return;
    const observer = new MutationObserver(() => {
      const text = (current.textContent || '').toLowerCase();
      const isComplete = text.includes('completed') || text.includes('ride completed');
      let button = current.querySelector('[data-download-receipt]');
      if (!isComplete) {
        if (button) button.remove();
        return;
      }
      if (button) return;
      const tripId = (current.querySelector('[data-trip-id]') || {}).dataset?.tripId;
      const store = get('trips', []);
      const trip = store.find((item) => String(item.id) === String(tripId)) ||
        store.find((item) => item.status === 'completed');
      if (!trip) return;
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn1 wide receipt-download';
      button.dataset.downloadReceipt = 'true';
      button.textContent = 'Download ride receipt';
      button.addEventListener('click', () => downloadReceipt(trip));
      current.appendChild(button);
    });
    observer.observe(current, { childList: true, subtree: true, characterData: true });
    /* Trigger one initial scan in case a completed trip was rendered before this observer attached. */
    const kick = document.createComment('receipt initial scan');
    current.appendChild(kick);
    kick.remove();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'booking') {
      addSavedPlaceControls();
      addReceiptButton();
    }
  });
})();
