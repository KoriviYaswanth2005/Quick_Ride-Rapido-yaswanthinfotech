
(function () {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const page = document.body.dataset.page || '';
    const isHome = page === 'home' || !!document.getElementById('bookForm');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE_RE = /^[6-9][0-9]{9}$/;

    const store = {
        get(key, fallback) {
            try {
                const raw = window.localStorage.getItem('rc.' + key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (err) { return fallback; }
        },
        set(key, value) {
            try { window.localStorage.setItem('rc.' + key, JSON.stringify(value)); } catch (err) {  }
        }
    };

    
    function openDialog(d) {
        if (!d) return;
        if (typeof d.showModal === 'function') d.showModal();
        else d.setAttribute('open', '');
    }
    function closeDialog(d) {
        if (!d) return;
        if (typeof d.close === 'function') d.close();
        else d.removeAttribute('open');
    }
    $$('dialog.modal').forEach((d) => {
        d.addEventListener('click', (e) => { if (e.target === d) closeDialog(d); });
    });

    
    const downloadDialog = $('#downloadDialog');
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-open-download]');
        if (trigger && downloadDialog) {
            e.preventDefault();
            openDialog(downloadDialog);
        }
        const dlBook = e.target.closest('#dlBook');
        if (dlBook) {
            closeDialog(downloadDialog);
            window.location.href = 'booking.html';
        }
    });

    
    function renderSession() {
        const link = $('a[data-key="login"]');
        const dashboardLink = $('a[data-key="dashboard"]');
        const session = store.get('session', null);
        if (link) {
            if (session) {
                link.textContent = 'Sign out';
                link.href = '#';
                link.dataset.signout = '1';
                link.title = 'Sign out from this device';
            } else {
                link.textContent = 'Sign in';
                link.href = 'login.html';
                delete link.dataset.signout;
                link.title = 'Sign in to your account';
            }
        }
        if (dashboardLink) {
            // The top navigation Dashboard is the secure entry point.
            // It always opens the standalone Admin Login screen first.
            dashboardLink.href = 'admin-login.html';
            dashboardLink.title = 'Open Admin Login';
        }
    }
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-signout]');
        if (!link) return;
        e.preventDefault();
        store.set('session', null);
        renderSession();
        Notify.notify('You have signed out on this device.', { type: 'info', title: 'Signed out' });
    });
    renderSession();

    
    document.addEventListener('click', (e) => {
        const settings = e.target.closest('#settingsBtn');
        if (!settings) return;
        const session = store.get('session', null);
        if (session) {
            window.location.href = 'customer-dashboard.html#settings';
        } else {
            window.location.href = 'login.html';
        }
    });

    function applyTheme(t) {
        document.documentElement.dataset.theme = t;
        const btn = $('#themeToggle');
        if (btn) {
            btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
            btn.title = t === 'dark' ? 'Light theme' : 'Dark theme';
        }
    }
    applyTheme(store.get('theme', 'dark'));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#themeToggle')) return;
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        store.set('theme', next);
        applyTheme(next);
    });
    if (isHome) return;

    
    const Notify = window.__rcNotify || (function () {
        const toastRoot = $('#toasts');
        const bell = $('#bellBtn');
        const badge = $('#bellCount');
        const panel = $('#notifPanel');
        const list = $('#notifList');
        const empty = $('#notifEmpty');
        const ICON = { success: 'fa-circle-check', info: 'fa-circle-info', warning: 'fa-triangle-exclamation', error: 'fa-circle-exclamation', ride: 'fa-motorcycle' };
        let items = store.get('notifications', []);

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
        function renderList() {
            list.innerHTML = '';
            items.forEach((item) => {
                const li = document.createElement('li');
                li.className = 'notif-item type-' + item.type + (item.read ? '' : ' unread');
                const icon = document.createElement('i');
                icon.className = 'fa-solid ' + (ICON[item.type] || ICON.info);
                const body = document.createElement('div');
                body.className = 'notif-body';
                const t = document.createElement('strong');
                t.textContent = item.title;
                const p = document.createElement('p');
                p.textContent = item.message;
                const time = document.createElement('time');
                time.textContent = timeAgo(item.at);
                body.append(t, p, time);
                li.append(icon, body);
                list.appendChild(li);
            });
            empty.hidden = items.length > 0;
            const n = items.filter((i) => !i.read).length;
            badge.hidden = n === 0;
            badge.textContent = n > 9 ? '9+' : String(n);
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
            while (live.length > 4) dismiss(live.shift());

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
            const title = opts.title || 'Update';
            items.unshift({ id: uid(), title, message, type, read: false, at: Date.now() });
            save();
            renderList();
            if (!reduceMotion) {
                bell.classList.remove('shake');
                void bell.offsetWidth;
                bell.classList.add('shake');
            }
            toast(message, { ...opts, type, title });
        }
        function setOpen(open) {
            panel.hidden = !open;
            bell.setAttribute('aria-expanded', String(open));
            if (open) renderList();
        }
        bell.addEventListener('click', (e) => { e.stopPropagation(); setOpen(panel.hidden); });
        document.addEventListener('click', (e) => {
            if (!panel.hidden && !panel.contains(e.target) && e.target !== bell) setOpen(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !panel.hidden) { setOpen(false); bell.focus(); }
        });
        $('#markAllRead').addEventListener('click', () => { items.forEach((i) => { i.read = true; }); save(); renderList(); });
        $('#clearAll').addEventListener('click', () => { items = []; save(); renderList(); });
        renderList();
        return { notify, toast };
    })();
    window.RC = {
        notify: Notify.notify,
        toast: Notify.toast,
        store,
        session: () => store.get('session', null),
        users: () => store.get('users', {})
    };

    
    if (!window.__rcNotify) {
    const header = $('#header');
    const menu = $('#menu');
    const menuToggle = $('#menuToggle');
    const progress = $('#scrollProgress');
    const toTop = $('#toTop');
    menuToggle.addEventListener('click', () => {
        const open = !menu.classList.contains('open');
        menu.classList.toggle('open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.classList.toggle('is-open', open);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { menu.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); }
    });
    function onScroll() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
        header.classList.toggle('scrolled', window.scrollY > 20);
        toTop.classList.toggle('show', window.scrollY > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
    }

    
    const revealObs = new IntersectionObserver((entries, obs) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $$('.reveal').forEach((el) => revealObs.observe(el));

    function countUp(el) {
        const target = Number(el.dataset.count);
        if (reduceMotion) { el.textContent = target; return; }
        const start = performance.now();
        (function frame(now) {
            const t = Math.min(1, (now - start) / 1400);
            el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
            if (t < 1) requestAnimationFrame(frame);
        })(start);
    }
    const countObs = new IntersectionObserver((entries, obs) => {
        entries.forEach((en) => { if (en.isIntersecting) { countUp(en.target); obs.unobserve(en.target); } });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => countObs.observe(el));

    document.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.btn, .round-btn, .chip, .tab');
        if (!btn || reduceMotion) return;
        const r = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = (e.clientX - r.left) + 'px';
        ripple.style.top = (e.clientY - r.top) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    });
    if (canHover && !reduceMotion) {
        $$('.magnetic').forEach((btn) => {
            btn.addEventListener('pointermove', (e) => {
                const r = btn.getBoundingClientRect();
                btn.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * 0.16 + 'px,' + (e.clientY - r.top - r.height / 2) * 0.22 + 'px)';
            });
            btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
        });
    }

    
    function setupTabs(list) {
        const tabs = $$('[role="tab"]', list);
        const panels = $$('[data-panel]');
        function activate(tab, focus) {
            tabs.forEach((t) => {
                const on = t === tab;
                t.setAttribute('aria-selected', String(on));
                t.classList.toggle('active', on);
                t.tabIndex = on ? 0 : -1;
            });
            panels.forEach((p) => {
                const show = p.dataset.panel === tab.dataset.tab;
                if (show && p.hidden) {
                    p.hidden = false;
                    p.classList.remove('panel-in');
                    void p.offsetWidth;
                    p.classList.add('panel-in');
                } else if (!show) p.hidden = true;
            });
            if (focus) tab.focus();
        }
        tabs.forEach((tab, i) => {
            tab.tabIndex = i === 0 ? 0 : -1;
            tab.addEventListener('click', () => activate(tab, false));
            tab.addEventListener('keydown', (e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                activate(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
            });
        });
    }

    function setupAccordion(root) {
        $$('.acc-head', root).forEach((head) => {
            head.addEventListener('click', () => {
                const body = document.getElementById(head.getAttribute('aria-controls'));
                const open = head.getAttribute('aria-expanded') !== 'true';
                head.setAttribute('aria-expanded', String(open));
                body.hidden = !open;
                body.classList.toggle('show', open);
                head.classList.toggle('open', open);
            });
        });
    }

    function validEmail(v) { return EMAIL_RE.test(v.trim()); }
    function setErr(el, msg) { el.textContent = msg || ''; }

    
    function initSafety() {
        setupTabs($('.tabs'));

        $('#heroSos').addEventListener('click', () => {
            const n = store.get('contacts', []).length;
            Notify.notify('Emergency noted. If you are in danger, call 112 now.' +
                (n ? ' Your ' + n + ' saved contact' + (n > 1 ? 's' : '') + ' would be notified when emergency-contact integration is configured.' : ' Add emergency contacts below.'),
                { type: 'error', title: 'Emergency', duration: 8000 });
        });

        const list = $('#contactsList');
        const empty = $('#contactsEmpty');
        function renderContacts() {
            const contacts = store.get('contacts', []);
            list.innerHTML = '';
            contacts.forEach((c, i) => {
                const li = document.createElement('li');
                li.className = 'list-row';
                const name = document.createElement('span');
                name.textContent = c.name + ' · ' + c.phone;
                const rm = document.createElement('button');
                rm.type = 'button';
                rm.className = 'btn-link';
                rm.textContent = 'Remove';
                rm.addEventListener('click', () => {
                    const all = store.get('contacts', []);
                    all.splice(i, 1);
                    store.set('contacts', all);
                    renderContacts();
                    Notify.notify(c.name + ' was removed from your emergency contacts.', { type: 'info', title: 'Contact removed' });
                });
                li.append(name, rm);
                list.appendChild(li);
            });
            empty.hidden = contacts.length > 0;
        }
        $('#contactsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            const err = $('#contactsError');
            setErr(err);
            const name = f.name.value.trim();
            const phone = f.phone.value.replace(/\s+/g, '');
            const contacts = store.get('contacts', []);
            if (!name) return setErr(err, 'Please enter a name.');
            if (!PHONE_RE.test(phone)) return setErr(err, 'Enter a valid 10-digit mobile number.');
            if (contacts.length >= 5) return setErr(err, 'You can save up to 5 contacts.');
            contacts.push({ name, phone });
            store.set('contacts', contacts);
            f.reset();
            renderContacts();
            Notify.notify(name + ' was added as an emergency contact.', { type: 'success', title: 'Contact saved' });
        });
        renderContacts();

        const boxes = $$('#checklist input[type="checkbox"]');
        const saved = store.get('checklist', {});
        boxes.forEach((b) => { b.checked = !!saved[b.dataset.check]; });
        function renderChecklist(notifyDone) {
            const done = boxes.filter((b) => b.checked).length;
            $('#checkBar').style.width = (done / boxes.length * 100) + '%';
            $('#checkText').textContent = done + ' of ' + boxes.length + ' done';
            if (notifyDone && done === boxes.length) {
                Notify.notify('Your pre-ride checklist is complete. Have a safe trip!', { type: 'success', title: 'Checklist complete' });
            }
        }
        boxes.forEach((b) => b.addEventListener('change', () => {
            const state = store.get('checklist', {});
            state[b.dataset.check] = b.checked;
            store.set('checklist', state);
            renderChecklist(b.checked);
        }));
        renderChecklist(false);
    }

    
    function initAbout() {
        setupAccordion($('#timeline'));
    }

    
    const JOBS = [
        { title: 'Backend Engineer', dept: 'Engineering', location: 'Bengaluru', type: 'Full time' },
        { title: 'Mobile Engineer (Android)', dept: 'Engineering', location: 'Bengaluru', type: 'Full time' },
        { title: 'Product Designer', dept: 'Design', location: 'Remote (India)', type: 'Full time' },
        { title: 'Operations Associate', dept: 'Operations', location: 'Chennai', type: 'Full time' },
        { title: 'Data Analyst', dept: 'Data', location: 'Hyderabad', type: 'Full time' },
        { title: 'Customer Support Lead', dept: 'Support', location: 'Pune', type: 'Full time' }
    ];

    function initCareers() {
        const list = $('#jobList');
        const search = $('#jobSearch');
        const dept = $('#jobDept');
        const empty = $('#jobEmpty');
        const dialog = $('#applyDialog');
        let current = null;

        function render() {
            const q = search.value.trim().toLowerCase();
            const d = dept.value;
            list.innerHTML = '';
            const matches = JOBS.map((j, i) => ({ j, i })).filter(({ j }) =>
                (!d || j.dept === d) &&
                (!q || (j.title + ' ' + j.location + ' ' + j.dept).toLowerCase().includes(q)));
            matches.forEach(({ j, i }, n) => {
                const li = document.createElement('li');
                li.className = 'job reveal in';
                li.style.setProperty('--i', n);
                const info = document.createElement('div');
                const h = document.createElement('strong');
                h.textContent = j.title;
                const meta = document.createElement('small');
                meta.textContent = j.dept + ' · ' + j.location + ' · ' + j.type;
                info.append(h, meta);
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn1';
                btn.textContent = 'Apply';
                btn.addEventListener('click', () => openApply(i));
                li.append(info, btn);
                list.appendChild(li);
            });
            empty.hidden = matches.length > 0;
        }
        function openApply(i) {
            current = JOBS[i];
            $('#applyRole').textContent = 'Role: ' + current.title + ' (' + current.location + ')';
            setErr($('#applyError'));
            openDialog(dialog);
        }
        search.addEventListener('input', render);
        dept.addEventListener('change', render);
        $('#applyCancel').addEventListener('click', () => closeDialog(dialog));

        $('#applyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            const err = $('#applyError');
            setErr(err);
            const name = f.name.value.trim();
            const email = f.email.value.trim();
            const file = f.resume.files[0];
            if (!name) return setErr(err, 'Please enter your name.');
            if (!validEmail(email)) return setErr(err, 'Enter a valid email address.');
            if (file && (file.type !== 'application/pdf' || file.size > 2 * 1024 * 1024)) {
                return setErr(err, 'Resume must be a PDF up to 2 MB.');
            }
            const ref = 'APP-' + Date.now().toString(36).toUpperCase().slice(-6);
            const app = { ref, role: current.title, location: current.location, name, email, at: Date.now(), status: 'Received', resume: file ? file.name : null };
            const apps = store.get('applications', []);
            apps.unshift(app);
            store.set('applications', apps.slice(0, 30));
            f.reset();
            closeDialog(dialog);
            renderMyApps();
            showSuccess(app);
            Notify.notify('We received your application for ' + app.role + ' (' + ref + '). A confirmation goes to ' + email + '.', { type: 'success', title: 'Application submitted' });
            setTimeout(reviewDue, REVIEW_AFTER + 300);
        });
        $('#successDone').addEventListener('click', () => closeDialog($('#successDialog')));
        renderMyApps();
        reviewDue();
        render();

        function showSuccess(app) {
            $('#successRef').textContent = app.ref;
            $('#successRole').textContent = app.role + ' (' + app.location + ')';
            $('#successEmail').textContent = app.email;
            openDialog($('#successDialog'));
        }

        function renderMyApps() {
            const wrap = $('#myAppsList');
            if (!wrap) return;
            const apps = store.get('applications', []);
            wrap.innerHTML = '';
            if (!apps.length) {
                const p = document.createElement('p');
                p.className = 'muted';
                p.textContent = 'No applications yet. Apply for a role above and it will show up here.';
                wrap.appendChild(p);
                return;
            }
            apps.forEach((a, i) => {
                const li = document.createElement('li');
                li.className = 'job app-row';
                li.style.setProperty('--i', i);
                const info = document.createElement('div');
                const h = document.createElement('strong');
                h.textContent = a.role + ' · ' + a.ref;
                const meta = document.createElement('small');
                meta.textContent = 'Applied ' + new Date(a.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + a.name + (a.resume ? ' · Resume: ' + a.resume : '');
                info.append(h, meta);
                const chip = document.createElement('span');
                chip.className = 'status-chip status-' + a.status.toLowerCase().replace(/\s+/g, '-');
                chip.textContent = a.status;
                li.append(info, chip);
                wrap.appendChild(li);
            });
        }
        const REVIEW_AFTER = 12000;
        function reviewDue() {
            const apps = store.get('applications', []);
            let changed = false;
            apps.forEach((a) => {
                if (a.status === 'Received' && Date.now() - a.at >= REVIEW_AFTER) {
                    a.status = 'Under review';
                    changed = true;
                    Notify.notify('Your application for ' + a.role + ' (' + a.ref + ') is now under review. We will be in touch.', { type: 'info', title: 'Application update' });
                }
            });
            if (changed) { store.set('applications', apps); renderMyApps(); }
        }
    }

    
    const ARTICLES = [
        { id: 'a1', cat: 'safety', title: 'Five checks before you board a bike taxi', date: '2026-09-02', read: 3, excerpt: 'A quick routine that takes less than a minute.', body: ['Check the vehicle number against the app.', 'Confirm the captain’s name before you get on.', 'Wear a helmet and hold the handle firmly.', 'Share your trip with someone you trust.'] },
        { id: 'a2', cat: 'tips', title: 'How to get the best fare on short trips', date: '2026-08-21', read: 4, excerpt: 'Timing, routes and ride type all change the price.', body: ['Short trips are often cheapest on bike rides.', 'Compare the estimate before you book.', 'Peak hours can raise fares, so plan ahead when you can.'] },
        { id: 'a3', cat: 'product', title: 'Live trip tracking, explained', date: '2026-08-05', read: 2, excerpt: 'See where your captain is and when they will arrive.', body: ['The tracker shows each step: booked, captain assigned, on the way and completed.', 'Notifications tell you when the captain is close.'] },
        { id: 'a4', cat: 'safety', title: 'Emergency contacts: why they matter', date: '2026-07-18', read: 3, excerpt: 'Set up a trusted contact so help is one tap away.', body: ['Add two or three people you trust.', 'Keep their numbers up to date.', 'Use the emergency button and call 112 in danger.'] },
        { id: 'a5', cat: 'tips', title: 'Riding in the rain: a short guide', date: '2026-07-02', read: 5, excerpt: 'Slow down, keep distance and stay visible.', body: ['Wet roads need more stopping distance.', 'Avoid sudden braking on painted lines.', 'Choose a route with better lighting when it is dark.'] },
        { id: 'a6', cat: 'product', title: 'Rating your ride helps everyone', date: '2026-06-20', read: 2, excerpt: 'Your feedback helps captains and improves the service.', body: ['Ratings are shared with captains privately.', 'Written feedback helps us fix problems faster.'] },
        { id: 'a7', cat: 'safety', title: 'What to do if you feel unsafe mid-ride', date: '2026-06-08', read: 4, excerpt: 'Stay calm, use the emergency button and share your location.', body: ['Use the emergency button in the ride screen.', 'Share your trip with a trusted contact.', 'Call 112 if you are in immediate danger.'] },
        { id: 'a8', cat: 'tips', title: 'Packing light for a quick bike ride', date: '2026-05-27', read: 2, excerpt: 'Carry only what fits securely in a small bag.', body: ['Use a bag that fits on your back or lap.', 'Keep valuables inside a zip pocket.'] },
        { id: 'a9', cat: 'product', title: 'Booking in three steps', date: '2026-05-10', read: 2, excerpt: 'Pick-up, drop and ride type. That is all it takes.', body: ['Enter your pick-up and drop locations.', 'Choose a ride type and check the fare.', 'Book and follow the captain on the tracker.'] }
    ];
    const CAT_LABEL = { safety: 'Safety', product: 'Product', tips: 'Tips' };

    function initBlog() {
        const grid = $('#articles');
        const search = $('#blogSearch');
        const empty = $('#blogEmpty');
        const more = $('#loadMore');
        const dialog = $('#articleDialog');
        const PAGE = 3;
        let cat = 'all';
        let shown = PAGE;
        let openId = null;

        function bookmarks() { return store.get('bookmarks', []); }
        function toggleBookmark(id) {
            const list = bookmarks();
            const idx = list.indexOf(id);
            const saved = idx < 0;
            if (saved) list.push(id); else list.splice(idx, 1);
            store.set('bookmarks', list);
            $('#bookmarkCount').textContent = 'Saved articles: ' + list.length;
            return saved;
        }

        function filtered() {
            const q = search.value.trim().toLowerCase();
            return ARTICLES.filter((a) => (cat === 'all' || a.cat === cat) && (!q || (a.title + ' ' + a.excerpt).toLowerCase().includes(q)));
        }

        function render(reset) {
            if (reset) shown = PAGE;
            const items = filtered();
            grid.innerHTML = '';
            items.slice(0, shown).forEach((a, n) => {
                const card = document.createElement('article');
                card.className = 'card article reveal in';
                card.style.setProperty('--i', n);
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.textContent = CAT_LABEL[a.cat];
                const h = document.createElement('h3');
                h.textContent = a.title;
                const p = document.createElement('p');
                p.textContent = a.excerpt;
                const meta = document.createElement('small');
                meta.className = 'muted';
                meta.textContent = new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + a.read + ' min read';
                const row = document.createElement('div');
                row.className = 'card-actions';
                const read = document.createElement('button');
                read.type = 'button';
                read.className = 'btn btn2';
                read.textContent = 'Read';
                read.addEventListener('click', () => openArticle(a.id));
                const save = document.createElement('button');
                save.type = 'button';
                save.className = 'btn-link';
                const isSaved = bookmarks().includes(a.id);
                save.textContent = isSaved ? 'Saved' : 'Save';
                save.setAttribute('aria-pressed', String(isSaved));
                save.addEventListener('click', () => {
                    const nowSaved = toggleBookmark(a.id);
                    save.textContent = nowSaved ? 'Saved' : 'Save';
                    save.setAttribute('aria-pressed', String(nowSaved));
                    Notify.notify(nowSaved ? 'Saved “' + a.title + '” to your reading list.' : 'Removed from your reading list.', { type: nowSaved ? 'success' : 'info', title: 'Reading list' });
                });
                row.append(read, save);
                card.append(tag, h, p, meta, row);
                grid.appendChild(card);
            });
            empty.hidden = items.length > 0;
            more.hidden = items.length <= shown;
            $('#bookmarkCount').textContent = 'Saved articles: ' + bookmarks().length;
        }

        function openArticle(id) {
            const a = ARTICLES.find((x) => x.id === id);
            if (!a) return;
            openId = id;
            $('#artCat').textContent = CAT_LABEL[a.cat];
            $('#artTitle').textContent = a.title;
            $('#artMeta').textContent = a.read + ' min read';
            const body = $('#artBody');
            body.innerHTML = '';
            a.body.forEach((t) => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); });
            $('#artBookmark').textContent = bookmarks().includes(id) ? 'Remove from saved' : 'Save';
            openDialog(dialog);
        }
        $('#artBookmark').addEventListener('click', () => {
            if (!openId) return;
            const nowSaved = toggleBookmark(openId);
            $('#artBookmark').textContent = nowSaved ? 'Remove from saved' : 'Save';
            render(false);
        });

        $$('#chips .chip').forEach((chip) => chip.addEventListener('click', () => {
            cat = chip.dataset.cat;
            $$('#chips .chip').forEach((c) => c.classList.toggle('active', c === chip));
            render(true);
        }));
        search.addEventListener('input', () => render(true));
        more.addEventListener('click', () => { shown += PAGE; render(false); });
        render(true);
    }

    
    const RELEASES = [
        { date: '2026-10-28', title: 'Dashboard role routing refreshed', body: 'The project now uses a clearer role-based entry flow so riders, captains and administrators land on the correct dashboard after sign-in.' },
        { date: '2026-10-24', title: 'Ride request timeout experience', body: 'Ride requests now have a 30-second captain acceptance window. If nobody accepts in time, the request is removed and the rider receives a notification.' },
        { date: '2026-10-18', title: 'Captain rating visibility', body: 'Completed ride ratings are now reflected in the captain dashboard, helping captains track customer experience over time.' },
        { date: '2026-10-10', title: 'Booking flow moved to a dedicated page', body: 'The home experience now focuses on discovery. Ride booking opens in the dedicated booking page for a cleaner, more focused flow.' },
        { date: '2026-10-02', title: 'Press newsroom refresh', body: 'The project newsroom gained animated sections, release search and sorting, media resources, highlights, a timeline and a dedicated enquiry area.' },
        { date: '2026-09-22', title: 'Map fallback experience improved', body: 'The booking map now includes a resilient preview fallback so route planning remains understandable when online map tiles are unavailable.' }
    ];

    function initPress() {
        const list = $('#pressList');
        const search = $('#pressSearch');
        const sort = $('#pressSort');
        const empty = $('#pressEmpty');

        function render() {
            const q = search.value.trim().toLowerCase();
            let items = RELEASES.filter((r) => !q || (r.title + ' ' + r.body).toLowerCase().includes(q));
            items = items.slice().sort((a, b) => (sort.value === 'old' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
            list.innerHTML = '';
            items.forEach((r, n) => {
                const li = document.createElement('li');
                li.className = 'job reveal in';
                li.style.setProperty('--i', n);
                const wrap = document.createElement('div');
                wrap.className = 'grow';
                const h = document.createElement('strong');
                h.textContent = r.title;
                const meta = document.createElement('small');
                meta.textContent = new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                const body = document.createElement('p');
                body.className = 'release-body';
                body.textContent = r.body;
                body.hidden = true;
                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'btn-link';
                toggle.textContent = 'Read more';
                toggle.setAttribute('aria-expanded', 'false');
                toggle.addEventListener('click', () => {
                    const open = body.hidden;
                    body.hidden = !open;
                    body.classList.toggle('show', open);
                    toggle.textContent = open ? 'Show less' : 'Read more';
                    toggle.setAttribute('aria-expanded', String(open));
                });
                wrap.append(h, meta, body, toggle);
                li.appendChild(wrap);
                list.appendChild(li);
            });
            empty.hidden = items.length > 0;
        }
        search.addEventListener('input', render);
        sort.addEventListener('change', render);
        function pressKitMessage(){
            Notify.notify('Press resources include project context, release notes, product highlights and media-enquiry guidance. Use the enquiry form below for a focused request.', { type: 'info', title: 'Press resources' });
        }
        const pressKit = $('#pressKit'); if (pressKit) pressKit.addEventListener('click', pressKitMessage);
        const pressKitSecondary = $('#pressKitSecondary'); if (pressKitSecondary) pressKitSecondary.addEventListener('click', pressKitMessage);
        $('#pressForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            const err = $('#pressError');
            setErr(err);
            const name = f.name.value.trim();
            const outlet = f.outlet.value.trim();
            const email = f.email.value.trim();
            const message = f.message.value.trim();
            if (!name || !outlet) return setErr(err, 'Please enter your name and outlet.');
            if (!validEmail(email)) return setErr(err, 'Enter a valid email address.');
            if (message.length < 10) return setErr(err, 'Please write at least 10 characters.');
            const list2 = store.get('pressRequests', []);
            list2.unshift({ name, outlet, email, message, at: Date.now() });
            store.set('pressRequests', list2.slice(0, 20));
            f.reset();
            Notify.notify('Thanks ' + name + '. Our press team will reply to ' + email + '.', { type: 'success', title: 'Enquiry sent' });
        });
        render();
    }

    
    const OFFICES = {
        bengaluru: 'Bengaluru, Karnataka. Visits by appointment.',
        chennai: 'Chennai, Tamil Nadu. Visits by appointment.',
        hyderabad: 'Hyderabad, Telangana. Visits by appointment.',
        pune: 'Pune, Maharashtra. Visits by appointment.'
    };
    const CITY_NAME = { bengaluru: 'Bengaluru', chennai: 'Chennai', hyderabad: 'Hyderabad', pune: 'Pune' };

    function initContact() {
        const sel = $('#citySelect');
        const box = $('#officeBox');
        function showOffice() {
            box.classList.remove('swap');
            void box.offsetWidth;
            box.classList.add('swap');
            $('#officeCity').textContent = CITY_NAME[sel.value];
            $('#officeText').textContent = OFFICES[sel.value];
        }
        sel.addEventListener('change', showOffice);
        showOffice();

        $('#contactPageForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            const err = $('#contactPageError');
            setErr(err);
            const name = f.name.value.trim();
            const email = f.email.value.trim();
            const topic = f.topic.value;
            const message = f.message.value.trim();
            if (!name) return setErr(err, 'Please enter your name.');
            if (!validEmail(email)) return setErr(err, 'Enter a valid email address.');
            if (!topic) return setErr(err, 'Please choose a topic.');
            if (message.length < 10) return setErr(err, 'Your message should be at least 10 characters.');
            const msgs = store.get('messages', []);
            msgs.unshift({ name, email, topic, message, at: Date.now() });
            store.set('messages', msgs.slice(0, 20));
            f.reset();
            Notify.notify('Thanks ' + name + '. We received your message about “' + topic + '”.', { type: 'success', title: 'Message sent' });
        });

        setupAccordion($('#faq'));
        const search = $('#faqSearch');
        const items = $$('.faq-item');
        search.addEventListener('input', () => {
            const q = search.value.trim().toLowerCase();
            let visible = 0;
            items.forEach((it) => {
                const match = !q || it.textContent.toLowerCase().includes(q);
                it.hidden = !match;
                if (match) visible++;
            });
            $('#faqEmpty').hidden = visible > 0;
        });
    }

    
    function initLogin() {
        if (!$('#phoneForm')) return;
        const stepPhone = $('#stepPhone');
        const stepOtp = $('#stepOtp');
        const stepDone = $('#stepDone');
        const otps = $$('.otp');
        const LOCAL_OTP_CODE = '123456';
        let phone = '';
        let wrong = 0;
        let lockedUntil = 0;
        let timer = null;

        function show(step) {
            [stepPhone, stepOtp, stepDone].forEach((s) => { s.hidden = s !== step; });
            if (step) { step.classList.remove('panel-in'); void step.offsetWidth; step.classList.add('panel-in'); }
        }

        function renderSignedIn() {
            const s = store.get('session', null);
            if (s) {
                $('#welcomeText').textContent = 'Signed in with ' + s.phone.slice(0, 2) + 'XXXXXX' + s.phone.slice(-2) + '.';
                show(stepDone);
            } else {
                show(stepPhone);
            }
        }

        function startResendTimer() {
            clearInterval(timer);
            let left = 30;
            const text = $('#resendText');
            const tick = () => {
                if (left > 0) {
                    text.textContent = 'Resend code in ' + left + 's';
                    left--;
                } else {
                    clearInterval(timer);
                    text.innerHTML = '';
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'btn-link';
                    b.textContent = 'Resend code';
                    b.addEventListener('click', () => {
                        Notify.toast('A new local verification code is 123456.', { type: 'info', title: 'Code resent' });
                        startResendTimer();
                    });
                    text.appendChild(b);
                }
            };
            tick();
            timer = setInterval(tick, 1000);
        }

        $('#phoneForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const err = $('#phoneError');
            setErr(err);
            const value = e.currentTarget.phone.value.replace(/\s+/g, '');
            if (!PHONE_RE.test(value)) return setErr(err, 'Enter a valid 10-digit mobile number starting with 6-9.');
            const found = store.get('users', {})[value];
            if (found && found.role === 'captain') return setErr(err, 'This number belongs to a captain. Sign in with your Captain ID instead.');
            phone = value;
            $('#sentTo').textContent = '+91 ' + value.slice(0, 5) + ' ' + value.slice(5);
            wrong = 0;
            otps.forEach((o) => { o.value = ''; });
            show(stepOtp);
            otps[0].focus();
            startResendTimer();
            Notify.toast('Local verification code: 123456. No SMS is sent.', { type: 'info', title: 'OTP sent', duration: 6000 });
        });

        $('#changeNum').addEventListener('click', () => { clearInterval(timer); show(stepPhone); });

        otps.forEach((box, i) => {
            box.addEventListener('input', () => {
                box.value = box.value.replace(/\D/g, '').slice(-1);
                if (box.value && i < otps.length - 1) otps[i + 1].focus();
            });
            box.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !box.value && i > 0) otps[i - 1].focus();
                if (e.key === 'Enter') $('#verifyBtn').click();
            });
            box.addEventListener('paste', (e) => {
                const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, otps.length);
                if (!digits) return;
                e.preventDefault();
                digits.split('').forEach((d, k) => { otps[k].value = d; });
                otps[Math.min(digits.length, otps.length - 1)].focus();
            });
        });

        $('#verifyBtn').addEventListener('click', () => {
            const err = $('#otpError');
            setErr(err);
            if (Date.now() < lockedUntil) {
                const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
                return setErr(err, 'Too many attempts. Try again in ' + secs + 's.');
            }
            const code = otps.map((o) => o.value).join('');
            if (code.length < otps.length) return setErr(err, 'Enter all 6 digits.');
            if (code !== LOCAL_OTP_CODE) {
                wrong++;
                const otpRow = $('#otpRow');
                otpRow.classList.remove('shake');
                void otpRow.offsetWidth;
                otpRow.classList.add('shake');
                if (wrong >= 3) {
                    lockedUntil = Date.now() + 30000;
                    wrong = 0;
                    setErr(err, 'Too many attempts. Try again in 30s.');
                    Notify.notify('Sign-in locked for 30 seconds after several wrong codes.', { type: 'warning', title: 'Too many attempts' });
                } else {
                    setErr(err, 'That code is not correct. Please try again.');
                }
                otps.forEach((o) => { o.value = ''; });
                otps[0].focus();
                return;
            }
            clearInterval(timer);
            const user = store.get('users', {})[phone];
            store.set('session', { phone, at: Date.now(), role: user ? user.role : 'customer', name: user ? user.name : '' });
            renderSignedIn();
            renderSession();
            Notify.notify('Signed in with +91 ' + phone + '.', { type: 'success', title: 'Welcome back' });
        });

        $('#logoutBtn').addEventListener('click', () => {
            store.set('session', null);
            renderSession();
            show(stepPhone);
            Notify.notify('You have signed out on this device.', { type: 'info', title: 'Signed out' });
        });


        /* Rider or captain sign-in. Captains use their Captain ID only. */
        const captainForm = $('#captainForm');
        if (captainForm) {
            $$('input[name="loginMode"]').forEach((r) => r.addEventListener('change', () => {
                const cap = r.value === 'captain' && r.checked;
                $('#phoneForm').hidden = cap;
                captainForm.hidden = !cap;
                $$('.login-mode label').forEach((l) => l.classList.toggle('selected', l.querySelector('input').checked));
            }));
            captainForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const err = $('#captainError');
                setErr(err);
                const id = e.currentTarget.captainId.value.trim().toUpperCase().replace(/\s+/g, '');
                if (!/^CAP-[A-Z0-9]{6,8}$/.test(id)) return setErr(err, 'Enter your Captain ID in the form CAP-XXXXXX.');
                const entry = Object.entries(store.get('users', {})).find(([, u]) => u && u.captainId === id);
                if (!entry) return setErr(err, 'No captain found with that ID. Check the ID you received at registration.');
                const [capPhone, cap] = entry;
                store.set('session', { phone: capPhone, at: Date.now(), role: 'captain', name: cap.name || '' });
                renderSession();
                Notify.notify('Signed in as captain ' + (cap.name || id) + '.', { type: 'success', title: 'Welcome back' });
                setTimeout(() => { window.location.href = 'captain-dashboard.html'; }, 700);
            });
        }

        renderSignedIn();
    }

    
    $('#newsletter').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('#nlEmail');
        const err = $('#nlError');
        setErr(err);
        const email = input.value.trim();
        if (!validEmail(email)) return setErr(err, 'Enter a valid email address.');
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
        el.addEventListener('click', (e) => {
            e.preventDefault();
            Notify.notify('The mobile app is not available here yet. Use this website to book a ride.', { type: 'info', title: 'App coming soon' });
        });
    });
    $$('[data-social]').forEach((a) => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            Notify.toast(a.dataset.social + ' link is not configured yet.', { type: 'info', title: 'Follow us' });
        });
    });

    
    ({ safety: initSafety, about: initAbout, careers: initCareers, blog: initBlog, press: initPress, contact: initContact, login: initLogin }[page] || (() => {}))();
    $$('.reveal').forEach((el) => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in'); });
})();
