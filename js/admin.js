/* v17: administrator command centre. Adds charts, activity feed, captain approvals, user blocking,
   promo toggles, announcements, maintenance mode, support inbox, audit log and data tools.
   Runs entirely in the browser on top of the same localStorage data the rest of the site uses. */
(function () {
    'use strict';
    const RC = window.RC;
    const root = document.getElementById('adminPro');
    const content = document.getElementById('content');
    if (!RC || !root || !content) return;
    const { store, notify } = RC;
    const $ = (s, r) => (r || root).querySelector(s);
    const $$ = (s, r) => Array.from((r || root).querySelectorAll(s));
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rupees = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
    const ago = (ts) => {
        const m = Math.round((Date.now() - ts) / 60000);
        if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
        const h = Math.round(m / 60); if (h < 24) return h + ' h ago';
        return Math.round(h / 24) + ' d ago';
    };
    const maskPhone = (p) => (p ? String(p).slice(0, 2) + 'XXXXXX' + String(p).slice(-2) : '');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- data helpers ---------- */
    const allTrips = () => store.get('trips', []);
    const users = () => store.get('users', {});
    const blocked = () => store.get('blocked', {});
    const promos = () => store.get('promos', [{ code: 'WELCOME20', percent: 20, active: true }]);
    const messages = () => store.get('messages', []);
    const feedback = () => store.get('feedback', []);
    const log = () => store.get('adminLog', []);
    function audit(text, kind) {
        const list = log();
        list.unshift({ text, kind: kind || 'info', at: Date.now() });
        store.set('adminLog', list.slice(0, 80));
    }
    const SEED_CAPTAINS = [
        { id: 'c1', name: 'Ravi Kumar', vehicle: 'Honda Activa · KA 01 AB 1234', city: 'Bengaluru', status: 'pending' },
        { id: 'c2', name: 'Meena Iyer', vehicle: 'Bajaj Auto · TN 09 CD 5521', city: 'Chennai', status: 'pending' },
        { id: 'c3', name: 'Imran Shaik', vehicle: 'TVS Jupiter · TS 07 EF 8810', city: 'Hyderabad', status: 'pending' },
        { id: 'c4', name: 'Anil Patil', vehicle: 'Bajaj RE · MH 12 GH 4402', city: 'Pune', status: 'approved' }
    ];
    const captains = () => store.get('captainApps', SEED_CAPTAINS);

    /* ---------- build the layout ---------- */
    root.innerHTML =
        '<nav class="ap-jump" aria-label="Admin sections">' +
            '<a href="#apOverview">Overview</a><a href="#apActivity">Activity</a><a href="#apCaptains">Captains</a>' +
            '<a href="#apUsers">Users</a><a href="#apPromos">Promos</a><a href="#apSupport">Support</a><a href="#apAudit">Audit</a>' +
            '<span class="ap-spacer"></span>' +
            '<label class="ap-search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" id="apGlobal" placeholder="Search users, promos, rides ( / )" aria-label="Search everything"></label>' +
            '<span class="ap-pill" id="apMaint"></span>' +
        '</nav>' +
        '<div class="ap-banner" id="apBanner" hidden></div>' +

        '<section class="dash-section ap-anim" id="apOverview"><h2>Overview</h2>' +
            '<div class="ap-two">' +
                '<div class="ap-card"><h3>Rides in the last 7 days</h3><div class="ap-bars" id="apBars" aria-label="Rides per day"></div></div>' +
                '<div class="ap-card"><h3>Ride status</h3><div class="ap-donut-wrap"><div class="ap-donut" id="apDonut"></div><ul class="ap-legend" id="apLegend"></ul></div></div>' +
            '</div>' +
            '<div class="ap-kpis" id="apKpis"></div>' +
        '</section>' +

        '<section class="dash-section ap-anim" id="apActivity"><h2>Live activity</h2><ul class="ap-feed" id="apFeed"></ul><p class="empty" id="apFeedEmpty" hidden>No activity yet. Book a ride to see it here.</p></section>' +

        '<section class="dash-section ap-anim" id="apCaptains"><h2>Captain approvals <span class="ap-count" id="apPendingCount"></span></h2>' +
            '<div class="ap-grid" id="apCaptainGrid"></div></section>' +

        '<section class="dash-section ap-anim" id="apUsers"><h2>Users</h2>' +
            '<div class="toolbar"><input type="search" id="apUserSearch" placeholder="Filter users by name or city" aria-label="Filter users">' +
            '<button class="btn btn2" type="button" id="apUserCsv"><i class="fa-solid fa-file-csv"></i> Export users</button></div>' +
            '<div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Captain ID</th><th>Phone</th><th>Role</th><th>City</th><th>Access</th></tr></thead><tbody id="apUserRows"></tbody></table></div>' +
            '<p class="empty" id="apUserEmpty" hidden>No users match.</p></section>' +

        '<section class="dash-section ap-anim" id="apPromos"><h2>Promo manager</h2><ul class="ap-list" id="apPromoList"></ul></section>' +

        '<div class="two-col">' +
            '<section class="dash-section ap-anim"><h2>Announcement</h2>' +
                '<form class="card-form" id="apAnnounce" novalidate><fieldset class="form-fieldset"><legend>Show a banner on the site</legend>' +
                '<label>Message <textarea name="text" rows="3" maxlength="160" placeholder="e.g. Rain expected in Bengaluru after 6 pm"></textarea></label>' +
                '<div class="ap-actions"><button class="btn btn1" type="submit">Publish</button><button class="btn btn2" type="button" id="apAnnounceClear">Clear</button></div>' +
                '</fieldset></form></section>' +
            '<section class="dash-section ap-anim"><h2>Site controls</h2>' +
                '<div class="ap-card ap-controls">' +
                '<label class="ap-switch"><input type="checkbox" id="apMaintToggle"><span class="ap-slider" aria-hidden="true"></span><span><strong>Maintenance mode</strong><small>Shows a notice on booking pages.</small></span></label>' +
                '<div class="ap-actions"><button class="btn btn2" type="button" id="apReset"><i class="fa-solid fa-rotate-left"></i> Reset demo data</button>' +
                '<button class="btn btn2" type="button" id="apLogout"><i class="fa-solid fa-right-from-bracket"></i> Sign out</button></div>' +
                '</div></section>' +
        '</div>' +

        '<section class="dash-section ap-anim" id="apSupport"><h2>Support inbox <span class="ap-count" id="apMsgCount"></span></h2><ul class="ap-list" id="apMsgs"></ul><p class="empty" id="apMsgEmpty" hidden>No messages yet. Messages from the contact form appear here.</p></section>' +

        '<section class="dash-section ap-anim" id="apAudit"><h2>Audit log</h2>' +
            '<div class="toolbar"><select id="apAuditFilter" aria-label="Filter audit log"><option value="">All events</option><option value="fare">Fares</option><option value="promo">Promos</option><option value="captain">Captains</option><option value="user">Users</option><option value="site">Site</option></select>' +
            '<button class="btn btn2" type="button" id="apAuditJson"><i class="fa-solid fa-file-code"></i> Download JSON</button></div>' +
            '<ul class="ap-list" id="apAuditList"></ul></section>';

    /* ---------- render pieces ---------- */
    function renderKpis() {
        const all = allTrips();
        const done = all.filter((t) => t.status === 'completed');
        const revenue = done.reduce((s, t) => s + (t.fare || 0), 0);
        const pending = captains().filter((c) => c.status === 'pending').length;
        const items = [
            ['Rides', all.length, 'fa-route'], ['Completed', done.length, 'fa-circle-check'],
            ['Revenue', rupees(revenue), 'fa-indian-rupee-sign'], ['Avg fare', done.length ? rupees(revenue / done.length) : '–', 'fa-chart-line'],
            ['Users', Object.keys(users()).length, 'fa-users'], ['Blocked', Object.keys(blocked()).length, 'fa-user-lock'],
            ['Captains waiting', pending, 'fa-id-card'], ['Live now', all.filter((t) => ['requested', 'accepted', 'in-progress'].includes(t.status)).length, 'fa-tower-broadcast']
        ];
        $('#apKpis').innerHTML = items.map(([l, v, i], n) =>
            '<article class="ap-kpi" style="--d:' + n + '"><i class="fa-solid ' + i + '"></i><span class="label">' + l + '</span><span class="value">' + esc(v) + '</span></article>').join('');
    }

    function renderBars() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
            days.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), start: d.getTime(), end: d.getTime() + 864e5, n: 0 });
        }
        allTrips().forEach((t) => { const d = days.find((x) => t.at >= x.start && t.at < x.end); if (d) d.n++; });
        const max = Math.max(1, ...days.map((d) => d.n));
        $('#apBars').innerHTML = days.map((d, i) =>
            '<div class="ap-bar" title="' + d.n + ' rides"><span class="ap-bar-fill" style="--h:' + Math.max(4, (d.n / max) * 100) + '%;--d:' + i + '"></span><b>' + d.n + '</b><small>' + d.label + '</small></div>').join('');
    }

    function renderDonut() {
        const all = allTrips();
        const statuses = [['Completed', 'completed', '#2e9e4f'], ['In progress', 'in-progress', '#f9c935'], ['Accepted', 'accepted', '#4aa3ff'], ['Requested', 'requested', '#b58ef5'], ['Cancelled', 'cancelled', '#e5484d']];
        const counts = statuses.map(([l, k, c]) => ({ l, c, n: all.filter((t) => t.status === k).length }));
        const total = counts.reduce((s, x) => s + x.n, 0);
        let acc = 0;
        const stops = counts.map((x) => { const from = acc; acc += total ? (x.n / total) * 100 : 0; return x.c + ' ' + from + '% ' + acc + '%'; });
        $('#apDonut').style.background = total ? 'conic-gradient(' + stops.join(',') + ')' : 'conic-gradient(var(--np-line) 0 100%)';
        $('#apDonut').dataset.total = total;
        $('#apLegend').innerHTML = counts.map((x) => '<li><i style="background:' + x.c + '"></i>' + x.l + ' <b>' + x.n + '</b></li>').join('');
    }

    function renderFeed() {
        const items = allTrips().map((t) => ({ at: t.at, text: (t.customerName || 'A rider') + ' · ' + t.pickup + ' → ' + t.drop, tag: t.status, icon: 'fa-route' }))
            .concat(log().map((l) => ({ at: l.at, text: l.text, tag: l.kind, icon: 'fa-clipboard-list' })))
            .sort((a, b) => b.at - a.at).slice(0, 12);
        $('#apFeed').innerHTML = items.map((x) =>
            '<li class="ap-feed-item"><span class="ap-dot"></span><i class="fa-solid ' + x.icon + '"></i><span class="ap-feed-text">' + esc(x.text) + '</span><span class="ap-tag">' + esc(x.tag) + '</span><time>' + ago(x.at) + '</time></li>').join('');
        $('#apFeedEmpty').hidden = items.length > 0;
    }

    function renderCaptains() {
        const list = captains();
        const pending = list.filter((c) => c.status === 'pending').length;
        $('#apPendingCount').textContent = pending ? pending + ' waiting' : 'all clear';
        $('#apCaptainGrid').innerHTML = list.map((c) =>
            '<article class="ap-card ap-captain ap-' + c.status + '"><div class="ap-avatar">' + esc(c.name.split(' ').map((w) => w[0]).join('').slice(0, 2)) + '</div>' +
            '<div><strong>' + esc(c.name) + '</strong><small>' + esc(c.vehicle) + '</small><small>' + esc(c.city) + '</small></div>' +
            (c.status === 'pending'
                ? '<div class="ap-actions"><button class="btn btn1" type="button" data-cap="approve" data-id="' + c.id + '">Approve</button><button class="btn btn2" type="button" data-cap="reject" data-id="' + c.id + '">Reject</button></div>'
                : '<span class="ap-state">' + (c.status === 'approved' ? 'Approved' : 'Rejected') + '</span>') + '</article>').join('');
    }

    function renderUsers() {
        const q = $('#apUserSearch').value.trim().toLowerCase();
        const b = blocked();
        const rows = Object.keys(users()).map((phone) => ({ phone, ...users()[phone] }))
            .filter((u) => !q || ((u.name || '') + ' ' + (u.captainId || '') + ' ' + (u.phone || '') + ' ' + (u.role || '') + ' ' + (u.city || '')).toLowerCase().includes(q));
        $('#apUserRows').innerHTML = rows.map((u, i) =>
            '<tr style="animation-delay:' + (i * 30) + 'ms"><td>' + esc(u.name || '–') + '</td><td><span class="ap-captain-id">' + esc(u.role === 'captain' ? (u.captainId || 'ID pending') : '—') + '</span></td><td>' + esc(maskPhone(u.phone)) + '</td><td>' + esc(u.role || 'customer') + '</td><td>' + esc(u.city || '–') + '</td>' +
            '<td><button class="ap-toggle ' + (b[u.phone] ? 'is-off' : 'is-on') + '" type="button" data-user="' + esc(u.phone) + '">' + (b[u.phone] ? 'Blocked · Unblock' : 'Active · Block') + '</button></td></tr>').join('');
        $('#apUserEmpty').hidden = rows.length > 0;
    }

    function renderPromos() {
        const list = promos();
        $('#apPromoList').innerHTML = list.length ? list.map((p) =>
            '<li class="ap-row"><strong class="ap-code">' + esc(p.code) + '</strong><span>' + p.percent + '% off</span>' +
            '<button class="ap-toggle ' + (p.active ? 'is-on' : 'is-off') + '" type="button" data-promo="toggle" data-code="' + esc(p.code) + '">' + (p.active ? 'Active' : 'Paused') + '</button>' +
            '<button class="ap-icon" type="button" data-promo="delete" data-code="' + esc(p.code) + '" aria-label="Delete ' + esc(p.code) + '"><i class="fa-solid fa-trash"></i></button></li>').join('')
            : '<li class="empty">No promo codes. Create one in the Promo codes form above.</li>';
    }

    function renderMessages() {
        const list = messages();
        $('#apMsgCount').textContent = list.length ? list.length + ' total' : '';
        $('#apMsgs').innerHTML = list.slice(0, 20).map((m) =>
            '<li class="ap-row ap-msg"><div><strong>' + esc(m.name || 'Visitor') + '</strong> <small>' + esc(m.email || '') + '</small><p>' + esc(m.message || '') + '</p></div><span class="ap-tag">' + esc(m.topic || 'General') + '</span><time>' + ago(m.at || Date.now()) + '</time></li>').join('');
        $('#apMsgEmpty').hidden = list.length > 0;
    }

    function renderAudit() {
        const f = $('#apAuditFilter').value;
        const list = log().filter((l) => !f || l.kind === f);
        $('#apAuditList').innerHTML = list.length ? list.slice(0, 40).map((l) =>
            '<li class="ap-row"><span class="ap-tag">' + esc(l.kind) + '</span><span class="ap-feed-text">' + esc(l.text) + '</span><time>' + new Date(l.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</time></li>').join('')
            : '<li class="empty">Nothing logged yet. Actions you take here are recorded.</li>';
    }

    function renderBanner() {
        const a = store.get('announcement', null);
        const bn = $('#apBanner');
        bn.hidden = !(a && a.text);
        bn.innerHTML = a && a.text ? '<i class="fa-solid fa-bullhorn"></i> <span>' + esc(a.text) + '</span>' : '';
        const ta = $('#apAnnounce').elements.text;
        if (document.activeElement !== ta && ta.dataset.seeded !== String(a && a.at)) { ta.value = a && a.text ? a.text : ''; ta.dataset.seeded = String(a && a.at); }
        const m = !!store.get('maintenance', false);
        $('#apMaint').textContent = m ? 'Maintenance on' : 'Live';
        $('#apMaint').className = 'ap-pill ' + (m ? 'is-warn' : 'is-ok');
        $('#apMaintToggle').checked = m;
    }

    function renderAll() { renderKpis(); renderBars(); renderDonut(); renderFeed(); renderCaptains(); renderUsers(); renderPromos(); renderMessages(); renderAudit(); renderBanner(); }

    /* ---------- actions ---------- */
    $('#apCaptainGrid').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cap]'); if (!b) return;
        const list = captains().map((c) => c.id === b.dataset.id ? { ...c, status: b.dataset.cap === 'approve' ? 'approved' : 'rejected' } : c);
        store.set('captainApps', list);
        const c = list.find((x) => x.id === b.dataset.id);
        audit((b.dataset.cap === 'approve' ? 'Approved' : 'Rejected') + ' captain ' + c.name + '.', 'captain');
        notify(c.name + (b.dataset.cap === 'approve' ? ' approved.' : ' rejected.'), { type: b.dataset.cap === 'approve' ? 'success' : 'warning', title: 'Captain ' + (b.dataset.cap === 'approve' ? 'approved' : 'rejected') });
        renderAll();
    });

    $('#apUserRows').addEventListener('click', (e) => {
        const b = e.target.closest('[data-user]'); if (!b) return;
        const phone = b.dataset.user;
        const map = { ...blocked() };
        const name = (users()[phone] || {}).name || maskPhone(phone);
        if (map[phone]) { delete map[phone]; audit('Unblocked ' + name + '.', 'user'); }
        else { map[phone] = Date.now(); audit('Blocked ' + name + '.', 'user'); }
        store.set('blocked', map);
        notify(name + (map[phone] ? ' is blocked from booking.' : ' can book again.'), { type: map[phone] ? 'warning' : 'success', title: 'Access updated' });
        renderAll();
    });
    $('#apUserSearch').addEventListener('input', renderUsers);

    $('#apUserCsv').addEventListener('click', () => {
        const b = blocked();
        const lines = ['name,phone,role,city,access'].concat(Object.keys(users()).map((p) => {
            const u = users()[p];
            return [u.name || '', p, u.role || 'customer', u.city || '', b[p] ? 'blocked' : 'active'].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',');
        }));
        download('users-' + stamp() + '.csv', lines.join('\n'), 'text/csv;charset=utf-8');
        notify('User list exported.', { type: 'success', title: 'Export ready' });
    });

    $('#apPromoList').addEventListener('click', (e) => {
        const b = e.target.closest('[data-promo]'); if (!b) return;
        const code = b.dataset.code;
        let list = promos();
        if (b.dataset.promo === 'toggle') {
            list = list.map((p) => p.code === code ? { ...p, active: !p.active } : p);
            const p = list.find((x) => x.code === code);
            audit((p.active ? 'Activated' : 'Paused') + ' promo ' + code + '.', 'promo');
        } else {
            if (!window.confirm('Delete promo code ' + code + '?')) return;
            list = list.filter((p) => p.code !== code);
            audit('Deleted promo ' + code + '.', 'promo');
        }
        store.set('promos', list);
        renderAll();
    });

    $('#apAnnounce').addEventListener('submit', (e) => {
        e.preventDefault();
        const text = e.target.elements.text.value.trim();
        if (!text) return notify('Write a message before publishing.', { type: 'warning', title: 'Announcement' });
        store.set('announcement', { text, at: Date.now() });
        audit('Published announcement: ' + text.slice(0, 50) + (text.length > 50 ? '…' : ''), 'site');
        notify('The banner is live on the site.', { type: 'success', title: 'Announcement published' });
        renderAll();
    });
    $('#apAnnounceClear').addEventListener('click', () => {
        store.set('announcement', null);
        audit('Cleared the announcement banner.', 'site');
        notify('Banner cleared.', { type: 'info', title: 'Announcement' });
        renderAll();
    });
    $('#apMaintToggle').addEventListener('change', (e) => {
        store.set('maintenance', e.target.checked);
        audit('Maintenance mode ' + (e.target.checked ? 'turned on' : 'turned off') + '.', 'site');
        notify('Maintenance mode ' + (e.target.checked ? 'on' : 'off') + '.', { type: e.target.checked ? 'warning' : 'success', title: 'Site controls' });
        renderAll();
    });
    $('#apReset').addEventListener('click', () => {
        if (!window.confirm('Reset demo data? This clears trips, blocks, approvals, messages and the audit log. Users and promo codes stay.')) return;
        ['trips', 'rides', 'blocked', 'captainApps', 'messages', 'adminLog', 'announcement'].forEach((k) => store.set(k, k === 'announcement' ? null : []));
        store.set('blocked', {});
        notify('Demo data reset.', { type: 'success', title: 'Reset complete' });
        renderAll();
    });
    $('#apLogout').addEventListener('click', () => {
        try { localStorage.removeItem('rc.session'); } catch (err) { /* storage unavailable */ }
        location.href = 'admin-login.html';
    });
    $('#apAuditFilter').addEventListener('change', renderAudit);
    $('#apAuditJson').addEventListener('click', () => download('audit-' + stamp() + '.json', JSON.stringify(log(), null, 2), 'application/json'));

    /* Global search: filters users, promos and rides, then jumps to the matching section */
    $('#apGlobal').addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        $('#apUserSearch').value = q; renderUsers();
        if (q) document.getElementById('apUsers').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); $('#apGlobal').focus(); }
    });

    function stamp() { return new Date().toISOString().slice(0, 10); }
    function download(name, text, type) {
        const url = URL.createObjectURL(new Blob([text], { type }));
        const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /* Reveal sections as they scroll into view */
    if ('IntersectionObserver' in window && !reduce) {
        const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('ap-in'); io.unobserve(en.target); } }), { threshold: 0.08 });
        $$('.ap-anim').forEach((el) => io.observe(el));
    } else $$('.ap-anim').forEach((el) => el.classList.add('ap-in'));

    /* Re-render when the data changes elsewhere (other tabs, or trips booked on this site) */
    window.addEventListener('storage', renderAll);
    setInterval(renderAll, 6000);

    /* Seed a few audit entries on first visit so the log is not empty */
    if (!store.get('adminLog', []).length) audit('Admin console opened.', 'site');
    renderAll();
})();
