/* v17: site-wide language switcher. Works on every page: adds the picker to the nav bar,
   translates the navigation, the Download button and the home hero, and remembers the choice (rc.lang). */
(function () {
    'use strict';
    const get = (k, fb) => { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch (e) { return fb; } };
    const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

    const I18N = {
        en: { home: 'Home', about: 'About', book: 'Book a ride', safety: 'Safety', blog: 'Blog', dashboard: 'Dashboard', careers: 'Careers', landing: 'Welcome', contact: 'Contact', developer: 'Developer', login: 'Sign in', download: 'Download<br>App', sound: 'Sound', mute: 'Mute sounds', unmute: 'Unmute sounds', t1: 'Good rides.', t2: 'Good vibes.', lead: 'Skip the wait and move through your day with a ride that fits. Simple booking, clear estimates, and a smoother way to get there.', cta: 'Book your ride' },
        hi: { home: 'होम', about: 'हमारे बारे में', book: 'राइड बुक करें', safety: 'सुरक्षा', blog: 'ब्लॉग', dashboard: 'डैशबोर्ड', careers: 'करियर', landing: 'स्वागत', contact: 'संपर्क', developer: 'डेवलपर', login: 'साइन इन', download: 'ऐप<br>डाउनलोड', sound: 'ध्वनि', mute: 'ध्वनि बंद करें', unmute: 'ध्वनि चालू करें', t1: 'अच्छी सवारी।', t2: 'अच्छा मूड।', lead: 'इंतज़ार छोड़िए और अपने दिन के हिसाब से राइड लीजिए। आसान बुकिंग, साफ़ अनुमान।', cta: 'राइड बुक करें' },
        kn: { home: 'ಮುಖಪುಟ', about: 'ನಮ್ಮ ಬಗ್ಗೆ', book: 'ರೈಡ್ ಬುಕ್ ಮಾಡಿ', safety: 'ಸುರಕ್ಷತೆ', blog: 'ಬ್ಲಾಗ್', dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', careers: 'ವೃತ್ತಿ', landing: 'ಸ್ವಾಗತ', contact: 'ಸಂಪರ್ಕ', developer: 'ಡೆವಲಪರ್', login: 'ಸೈನ್ ಇನ್', download: 'ಆ್ಯಪ್<br>ಡೌನ್‌ಲೋಡ್', sound: 'ಧ್ವನಿ', mute: 'ಧ್ವನಿ ಆಫ್ ಮಾಡಿ', unmute: 'ಧ್ವನಿ ಆನ್ ಮಾಡಿ', t1: 'ಉತ್ತಮ ಸವಾರಿ.', t2: 'ಉತ್ತಮ ಭಾವ.', lead: 'ಕಾಯದೆ ಸವಾರಿ ಮಾಡಿ. ಸರಳ ಬುಕಿಂಗ್, ಸ್ಪಷ್ಟ ಅಂದಾಜು.', cta: 'ರೈಡ್ ಬುಕ್ ಮಾಡಿ' },
        ta: { home: 'முகப்பு', about: 'எங்களைப் பற்றி', book: 'பயணம் பதிவு', safety: 'பாதுகாப்பு', blog: 'வலைப்பதிவு', dashboard: 'டாஷ்போர்டு', careers: 'வேலைவாய்ப்பு', landing: 'வரவேற்பு', contact: 'தொடர்பு', developer: 'உருவாக்குநர்', login: 'உள்நுழை', download: 'செயலி<br>பதிவிறக்கம்', sound: 'ஒலி', mute: 'ஒலியை நிறுத்து', unmute: 'ஒலியை இயக்கு', t1: 'நல்ல பயணம்.', t2: 'நல்ல அதிர்வு.', lead: 'காத்திருக்காமல் பயணம் செய்யுங்கள். எளிய பதிவு, தெளிவான கட்டண மதிப்பீடு.', cta: 'பயணத்தை பதிவு செய்' }
    };
    const LANGS = [['en', 'English'], ['hi', 'हिंदी'], ['kn', 'ಕನ್ನಡ'], ['ta', 'தமிழ்']];

    function applyLang(code) {
        const t = I18N[code] || I18N.en;
        $$('.navigationmenu a[data-key]').forEach((a) => { if (t[a.dataset.key]) a.textContent = t[a.dataset.key]; });
        const cta = $('.navigationmenu .nav-cta'); if (cta) cta.innerHTML = t.download;
        const l1 = $('.hero-lite-title .line'); if (l1) l1.textContent = t.t1;
        const hl = $('.hero-lite-title .hl-under'); if (hl) hl.textContent = t.t2;
        const lead = $('.hero-lite-lead'); if (lead) lead.textContent = t.lead;
        const heroCta = $('.hero-lite-cta a.btn1'); if (heroCta && heroCta.firstChild && heroCta.firstChild.nodeType === 3) heroCta.firstChild.nodeValue = t.cta + ' ';
        const sb = $('#soundToggle'); if (sb) sb.setAttribute('aria-label', sb.dataset.muted === '1' ? t.unmute : t.mute);
        document.documentElement.lang = code;
    }

    function mountPicker() {
        const host = $('.download') || $('.navigationmenu');
        if (!host || $('.lang-pick')) return null;
        const sel = document.createElement('select');
        sel.className = 'lang-pick';
        sel.setAttribute('aria-label', 'Choose language');
        sel.title = 'Language';
        sel.innerHTML = LANGS.map(([c, n]) => '<option value="' + c + '">' + n + '</option>').join('');
        host.insertBefore(sel, host.firstChild);
        return sel;
    }

    function init() {
        const saved = get('rc.lang', 'en');
        const code = I18N[saved] ? saved : 'en';
        const sel = mountPicker();
        if (sel) {
            sel.value = code;
            sel.addEventListener('change', () => {
                const next = I18N[sel.value] ? sel.value : 'en';
                set('rc.lang', next);
                applyLang(next);
                window.dispatchEvent(new CustomEvent('rc:langchange', { detail: next }));
            });
        }
        applyLang(code);
    }
    window.RapidoLang = { apply: applyLang, current: () => get('rc.lang', 'en'), I18N };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
