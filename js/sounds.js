/* v17: ring tones and sound effects, synthesised with the Web Audio API (no audio files).
   - Captain ride request: repeating phone ring
   - Booking confirmed / cash selected: rising chime
   - Captain accepted, nearby, arrived, ride started, ride completed, cancelled: one distinct tone each
   Sounds respect a mute toggle in the nav (remembered as rc.sound) and start after the first user interaction,
   because browsers block audio before that. */
(function () {
    'use strict';
    const get = (k, fb) => { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch (e) { return fb; } };
    const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
    const $ = (s, r) => (r || document).querySelector(s);
    const Ctx = window.AudioContext || window.webkitAudioContext;
    let ctx = null;
    let muted = !!get('rc.soundMuted', false);
    let ringTimer = null;
    let ringUntil = 0;

    function audio() {
        if (!Ctx) return null;
        if (!ctx) { try { ctx = new Ctx(); } catch (e) { return null; } }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return ctx;
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
        window.addEventListener(ev, () => { if (!muted) audio(); }, { once: true, passive: true }));

    /* One note: sine/triangle with a short attack and exponential release. */
    function note(freq, start, dur, opts = {}) {
        const c = audio(); if (!c || muted) return;
        const t0 = c.currentTime + start;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = opts.type || 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
        const vol = opts.vol == null ? 0.22 : opts.vol;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
    }

    /* Each event has its own tune. */
    const TONES = {
        /* Captain ride request: the phone ring (repeated while requests wait, see setRinging) */
        ring() {
            [0, 0.55].forEach((o) => {
                note(523, o, 0.4, { type: 'triangle', vol: 0.25 });
                note(659, o, 0.4, { type: 'triangle', vol: 0.2 });
                note(784, o + 0.12, 0.3, { type: 'triangle', vol: 0.12 });
            });
        },
        /* Rider booking confirmed: bright marimba-style rising arpeggio */
        booking() { [392, 523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.09, 0.5, { type: 'triangle', vol: 0.2 })); note(1568, 0.5, 0.6, { type: 'sine', vol: 0.08 }); },
        /* Captain accepted the ride: two quick notes up */
        accepted() { note(659, 0, 0.18, { vol: 0.2 }); note(880, 0.14, 0.3, { vol: 0.2 }); },
        /* Captain nearby: soft single ping */
        nearby() { note(880, 0, 0.35, { vol: 0.14 }); },
        /* Captain arrived at pickup: doorbell, ding-dong */
        arrived() { note(988, 0, 0.7, { type: 'sine', vol: 0.24 }); note(1976, 0, 0.3, { vol: 0.05 }); note(784, 0.45, 0.9, { type: 'sine', vol: 0.22 }); note(1568, 0.45, 0.4, { vol: 0.05 }); },
        /* Ride started: sweep up */
        started() { note(330, 0, 0.6, { type: 'sawtooth', slideTo: 990, vol: 0.1 }); },
        /* Ride in progress checkpoint (used when a ride is running): two soft taps */
        progress() { note(523, 0, 0.12, { type: 'triangle', vol: 0.15 }); note(523, 0.16, 0.12, { type: 'triangle', vol: 0.15 }); },
        /* Ride completed: short fanfare */
        completed() { [523, 659, 784].forEach((f, i) => note(f, i * 0.13, 0.3, { vol: 0.2 })); note(1047, 0.42, 0.7, { vol: 0.22 }); },
        /* Payment received or confirmed: coin, cha-ching */
        payment() { note(1319, 0, 0.12, { type: 'square', vol: 0.08 }); note(1760, 0.1, 0.5, { type: 'square', vol: 0.08 }); note(2349, 0.1, 0.35, { vol: 0.06 }); },
        /* Cancelled or declined: falling notes */
        cancelled() { note(587, 0, 0.25, { vol: 0.18 }); note(392, 0.22, 0.4, { vol: 0.18 }); },
        /* SOS alert from a rider: urgent three-beep alarm */
        sos() { [0, 0.3, 0.6].forEach((o) => note(1000, o, 0.2, { type: 'square', vol: 0.12 })); note(1400, 0.9, 0.5, { type: 'square', vol: 0.12 }); },
        /* Any other notification: a soft tick */
        notify() { note(1200, 0, 0.08, { type: 'triangle', vol: 0.09 }); }
    };

    /* Continuous ring for waiting ride requests. It keeps ringing until setRinging(false) is called,
       which the captain console does when no request is left (accepted, declined or cancelled). */
    let ringing = false;
    /* Captain ring tunes. "classic" is the default. Each one fits the 1.6 second repeat. */
    const RING_TUNES = {
        classic: { label: 'Classic ring (default)', play() { TONES.ring(); } },
        marimba: { label: 'Marimba', play() { [523, 659, 784, 659].forEach((f, i) => note(f, i * 0.2, 0.3, { type: 'triangle', vol: 0.22 })); } },
        digital: { label: 'Digital beeps', play() { [0, 0.2, 0.9, 1.1].forEach((o) => note(880, o, 0.14, { type: 'square', vol: 0.09 })); } },
        bells: { label: 'Bells', play() { note(1319, 0, 1.2, { type: 'sine', vol: 0.2 }); note(1760, 0, 1.0, { type: 'sine', vol: 0.1 }); note(1319, 0.7, 1.0, { type: 'sine', vol: 0.16 }); } },
        pulse: { label: 'Pulse', play() { [0, 0.4, 0.8].forEach((o) => note(220, o, 0.25, { type: 'triangle', vol: 0.3 })); } }
    };
    const ringTuneKey = 'rc.ringTunes';
    /* A captain's own ringtone from their device. Kept in IndexedDB on this device, up to 2 MB. */
    const CUSTOM_MAX = 2 * 1024 * 1024;
    let customUrl = null, customName = '', ringAudio = null, previewAudio = null;
    function dbOpen() {
        return new Promise((res, rej) => {
            const r = indexedDB.open('rapido-ringtones', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('tunes');
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
    }
    function dbRun(mode, fn) {
        return dbOpen().then((db) => new Promise((res, rej) => {
            const tx = db.transaction('tunes', mode);
            const req = fn(tx.objectStore('tunes'));
            tx.oncomplete = () => res(req ? req.result : undefined);
            tx.onerror = () => rej(tx.error);
        }));
    }
    function loadCustom() {
        if (!window.indexedDB) return Promise.resolve();
        return dbRun('readonly', (st) => st.get(currentPhone())).then((rec) => {
            if (customUrl) URL.revokeObjectURL(customUrl);
            customUrl = rec && rec.blob ? URL.createObjectURL(rec.blob) : null;
            customName = rec ? rec.name : '';
        }).catch(() => {});
    }
    function playFile(url, loop) {
        const a = new Audio(url);
        a.loop = loop;
        a.volume = 0.9;
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
        return a;
    }
    function currentPhone() { const s = get('rc.session', null); return s && s.phone ? s.phone : 'guest'; }
    function getRingTune() {
        const map = get(ringTuneKey, {});
        const id = map[currentPhone()];
        if (id === 'custom' && !customUrl) return 'classic';
        return RING_TUNES[id] ? id : 'classic';
    }
    function setRingTune(id) {
        if (!RING_TUNES[id]) return;
        const map = get(ringTuneKey, {});
        map[currentPhone()] = id;
        set(ringTuneKey, map);
    }
    RING_TUNES.custom = {
        label: 'My ringtone',
        play() {
            if (!customUrl) { TONES.ring(); return; }
            if (previewAudio) previewAudio.pause();
            previewAudio = playFile(customUrl, false);
        }
    };
    function playRingTune(id) { ((RING_TUNES[id] || RING_TUNES.classic).play)(); }

    function startRing() {
        if (ringing) return;
        ringing = true;
        if (getRingTune() === 'custom' && customUrl) {
            ringAudio = playFile(customUrl, true); /* loops until the ring is stopped */
            return;
        }
        playRingTune(getRingTune());
        ringTimer = setInterval(() => { if (!muted) playRingTune(getRingTune()); }, 1600);
    }
    function stopRing() {
        ringing = false;
        if (ringAudio) { ringAudio.pause(); ringAudio = null; }
        if (ringTimer) clearInterval(ringTimer);
        ringTimer = null;
    }
    function setRinging(on) {
        if (on && !muted) startRing(); else stopRing();
    }

    /* Map a toast title to its tune. Titles not listed here play the soft notify tick. */
    const MAP = {
        'Booking confirmed': () => TONES.booking(),
        'Ride requested': () => TONES.booking(),
        'Captain assigned': () => TONES.accepted(),
        'Ride accepted': () => TONES.accepted(),
        'Captain nearby': () => TONES.nearby(),
        'Captain arrived': () => TONES.arrived(),
        'Ride started': () => TONES.started(),
        'Ride in progress': () => TONES.progress(),
        'Ride completed': () => TONES.completed(),
        'Ride cancelled': () => TONES.cancelled(),
        'Cancelled': () => TONES.cancelled(),
        'Declined': () => TONES.cancelled(),
        'Payment received': () => TONES.payment(),
        'Payment reported': () => TONES.payment(),
        'Payment confirmed': () => TONES.payment(),
        'Cash collected': () => TONES.payment(),
        'QR scanned': () => TONES.nearby(),
        'SOS alert': () => TONES.sos(),
        'Ride scheduled': () => TONES.booking()
    };

    function onToast(el) {
        if (!el || !el.classList || !el.classList.contains('toast')) return;
        const title = (el.querySelector('strong') || {}).textContent || '';
        const fn = MAP[title.trim()];
        if (fn) fn(); else TONES.notify();
    }

    const toastRoot = document.getElementById('toasts');
    if (toastRoot) {
        new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(onToast)))
            .observe(toastRoot, { childList: true });
    }

    /* Mute toggle in the nav bar */
    function mountToggle() {
        const host = $('.download');
        if (!host || $('#soundToggle')) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.id = 'soundToggle';
        b.className = 'theme-btn sound-btn';
        b.dataset.muted = muted ? '1' : '0';
        b.title = 'Ride sounds';
        b.innerHTML = '<i class="fa-solid fa-volume-high on"></i><i class="fa-solid fa-volume-xmark off"></i>';
        const paint = () => {
            b.dataset.muted = muted ? '1' : '0';
            b.setAttribute('aria-pressed', String(!muted));
            b.setAttribute('aria-label', muted ? 'Unmute sounds' : 'Mute sounds');
            b.title = muted ? 'Sounds off' : 'Sounds on';
            b.classList.toggle('is-muted', muted);
        };
        b.addEventListener('click', () => {
            muted = !muted;
            set('rc.soundMuted', muted);
            if (muted) stopRing(); else { audio(); TONES.nearby(); }
            paint();
        });
        host.insertBefore(b, host.firstChild);
        paint();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountToggle); else mountToggle();

    /* Captain settings card: choose the request ring tune, preview it, or upload a ringtone from the device. */
    function tuneLabel(id) { return id === 'custom' ? (customName ? 'My ringtone: ' + customName : 'My ringtone (upload one)') : RING_TUNES[id].label; }
    function mountRingSettings() {
        if (document.body.dataset.page !== 'captain' || document.getElementById('ringSettings')) return;
        const content = document.getElementById('content');
        const anchor = content && content.querySelector('.dash-grid');
        if (!anchor) return;
        const card = document.createElement('section');
        card.id = 'ringSettings';
        card.className = 'ring-settings';
        card.innerHTML =
            '<div><span class="rs-label">Ride request ring</span><strong>Choose the tune you hear for new requests</strong></div>' +
            '<div class="rs-controls">' +
                '<select id="ringTuneSelect" aria-label="Ride request ring tune"></select>' +
                '<button class="btn btn2" type="button" id="ringPreview"><i class="fa-solid fa-play"></i> Preview</button>' +
                '<label class="btn btn2 rs-upload"><i class="fa-solid fa-folder-open"></i> Upload from device' +
                    '<input type="file" id="ringFile" accept="audio/*" hidden></label>' +
                '<button class="btn btn3" type="button" id="ringRemove" hidden>Remove my ringtone</button>' +
            '</div>' +
            '<p class="rs-note" id="ringNote">Pick any audio file on this device (MP3, WAV or OGG, up to 2 MB). It is stored on this device only.</p>';
        anchor.parentNode.insertBefore(card, anchor);
        const sel = card.querySelector('#ringTuneSelect');
        const note = card.querySelector('#ringNote');
        const removeBtn = card.querySelector('#ringRemove');
        const toast = (msg, title, type) => { if (window.RC && window.RC.toast) window.RC.toast(msg, { title, type }); };
        function build() {
            sel.innerHTML = Object.keys(RING_TUNES).filter((id) => id !== 'custom' || customUrl).concat(customUrl ? [] : ['custom'])
                .map((id) => '<option value="' + id + '">' + esc(tuneLabel(id)) + '</option>').join('');
            sel.value = getRingTune();
            removeBtn.hidden = !customUrl;
        }
        function esc(v) { return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
        loadCustom().then(build);
        sel.addEventListener('change', () => {
            if (sel.value === 'custom' && !customUrl) { note.textContent = 'Upload an audio file first.'; sel.value = getRingTune(); return; }
            setRingTune(sel.value);
            playRingTune(sel.value);
            toast('New requests will ring with ' + tuneLabel(sel.value) + '.', 'Ring tune saved', 'success');
        });
        card.querySelector('#ringPreview').addEventListener('click', () => { audio(); playRingTune(sel.value); });
        card.querySelector('#ringFile').addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            e.target.value = '';
            if (!file) return;
            if (!/^audio\//.test(file.type || '')) { note.textContent = 'That file is not an audio file. Choose an MP3, WAV or OGG file.'; return; }
            if (file.size > CUSTOM_MAX) { note.textContent = 'That file is larger than 2 MB. Choose a shorter or smaller file.'; return; }
            dbRun('readwrite', (st) => st.put({ name: file.name, blob: file, type: file.type }, currentPhone())).then(() => {
                setRingTune('custom');
                return loadCustom();
            }).then(() => {
                build();
                audio();
                playRingTune('custom');
                toast('Your ringtone "' + file.name + '" is saved on this device.', 'Ringtone uploaded', 'success');
            }).catch(() => { note.textContent = 'Could not save this file on this device. Try a different browser or check storage settings.'; });
        });
        removeBtn.addEventListener('click', () => {
            dbRun('readwrite', (st) => st.delete(currentPhone())).then(() => loadCustom()).then(() => {
                const map = get(ringTuneKey, {});
                if (map[currentPhone()] === 'custom') setRingTune('classic');
                build();
                toast('Your ringtone was removed. The classic ring is used now.', 'Ringtone removed', 'info');
            });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountRingSettings); else mountRingSettings();

    window.RapidoSounds = { play: (name) => TONES[name] && TONES[name](), tunes: Object.keys(TONES), ringTunes: () => Object.keys(RING_TUNES).map((id) => ({ id, label: RING_TUNES[id].label })), getRingTune, setRingTune, previewRing: playRingTune, setRinging, isRinging: () => ringing, stop: stopRing, isMuted: () => muted };
    window.addEventListener('pagehide', stopRing);
})();
