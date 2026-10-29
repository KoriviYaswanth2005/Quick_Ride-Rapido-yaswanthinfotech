/* v20: payments helpers. UPI links, QR codes for the fare, and a camera QR scanner for paying a captain.
   Libraries load from cdnjs only when first needed. Pasting a UPI link is the fallback when the camera is unavailable. */
(function () {
    'use strict';
    const UPI_ID = 'koriviyaswanth4@oksbi';
    const PAYEE = 'Korivi Yaswanth';
    const libs = {
        qr: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
        jsqr: 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
    };
    const loaded = {};
    function loadScript(key) {
        if (loaded[key]) return loaded[key];
        loaded[key] = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = libs[key];
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Could not load ' + key));
            document.head.appendChild(s);
        });
        return loaded[key];
    }
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function upiLink(amount, note, payee) {
        const pa = (payee && payee.pa) || UPI_ID;
        const pn = (payee && payee.pn) || PAYEE;
        return 'upi://pay?pa=' + encodeURIComponent(pa) + '&pn=' + encodeURIComponent(pn) + '&am=' + Number(amount).toFixed(2) + '&cu=INR&tn=' + encodeURIComponent(note || 'Ride payment');
    }
    function parseUpi(url) {
        try {
            const u = new URL(url);
            if (u.protocol !== 'upi:') return null;
            const q = u.searchParams;
            return { pa: q.get('pa') || '', pn: q.get('pn') || '', am: q.get('am') ? Number(q.get('am')) : null, tn: q.get('tn') || '', raw: url };
        } catch (e) { return null; }
    }

    /* Draw a QR code for text inside el. Falls back to showing the UPI ID as text. */
    function makeQR(el, text) {
        if (!el) return;
        el.innerHTML = '';
        const box = document.createElement('div');
        box.className = 'qr-box';
        el.appendChild(box);
        loadScript('qr').then(() => {
            if (window.QRCode) new window.QRCode(box, { text, width: 150, height: 150, correctLevel: window.QRCode.CorrectLevel.M });
        }).catch(() => { box.innerHTML = '<div style="padding:12px;text-align:center"><p class="muted">QR image could not load. Use this UPI ID in your payment app:</p><strong>' + esc(UPI_ID) + '</strong><p class="muted">Try the payment link if your UPI app supports it.</p></div>';  });
    }

    /* Camera scanner. onPayload(upiUrl) runs once a UPI QR code is read or a link is pasted. */
    function scan(onPayload) {
        const dlg = document.createElement('dialog');
        dlg.className = 'modal scan-modal';
        dlg.setAttribute('aria-label', 'Scan QR to pay');
        dlg.innerHTML =
            '<form method="dialog" class="modal-close-wrap"><button class="modal-x" aria-label="Close">&times;</button></form>' +
            '<h3>Scan QR to pay</h3>' +
            '<p class="muted">Point the camera at the QR code shown by your captain.</p>' +
            '<div class="scan-frame"><video playsinline muted></video><span class="scan-line" aria-hidden="true"></span></div>' +
            '<p class="scan-status" role="status">Starting camera…</p>' +
            '<label class="scan-manual">Or paste the UPI link' +
            '<input type="text" id="scanManual" placeholder="upi://pay?pa=…" autocomplete="off"></label>' +
            '<div class="modal-actions"><button class="btn btn1" type="button" id="scanUse">Use pasted link</button></div>';
        document.body.appendChild(dlg);
        const video = dlg.querySelector('video');
        const status = dlg.querySelector('.scan-status');
        let stream = null, timer = null, done = false;

        function finish(payload) {
            if (done) return;
            done = true;
            cleanup();
            dlg.close();
            onPayload(payload);
        }
        function cleanup() {
            clearInterval(timer);
            if (stream) stream.getTracks().forEach((t) => t.stop());
            stream = null;
        }
        dlg.addEventListener('close', () => { cleanup(); setTimeout(() => dlg.remove(), 300); });
        dlg.querySelector('#scanUse').addEventListener('click', () => {
            const v = dlg.querySelector('#scanManual').value.trim();
            if (!parseUpi(v)) { status.textContent = 'That is not a UPI link. It should start with upi://pay'; return; }
            finish(v);
        });

        dlg.showModal();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            status.textContent = 'Camera is not available here. Paste the UPI link below.';
            return;
        }
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then((s) => {
            stream = s;
            video.srcObject = s;
            return video.play();
        }).then(() => {
            status.textContent = 'Looking for a QR code…';
            if ('BarcodeDetector' in window) {
                const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                timer = setInterval(() => {
                    if (video.readyState < 2) return;
                    detector.detect(video).then((codes) => {
                        const hit = codes.find((c) => parseUpi(c.rawValue));
                        if (hit) finish(hit.rawValue);
                    }).catch(() => {});
                }, 300);
            } else {
                loadScript('jsqr').then(() => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    timer = setInterval(() => {
                        if (video.readyState < 2) return;
                        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = window.jsQR && window.jsQR(img.data, img.width, img.height);
                        if (code && parseUpi(code.data)) finish(code.data);
                    }, 300);
                }).catch(() => { status.textContent = 'The scanner could not load. Paste the UPI link below.'; });
            }
        }).catch(() => {
            status.textContent = 'Camera permission was not granted. Paste the UPI link below.';
        });
    }

    window.RapidoPay = { UPI_ID, upiLink, parseUpi, makeQR, scan };
})();
