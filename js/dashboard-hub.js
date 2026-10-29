(function () {
  'use strict';

  const ROLE_CONFIG = {
    rider: {
      label: 'Rider', icon: 'fa-person-walking', tone: 'yellow',
      subtitle: 'Sign in with your mobile number and the demo OTP.',
      destination: 'customer-dashboard.html',
      identifier: '9876543210', otp: '123456', identifierLabel: 'Mobile number', identifierType: 'tel',
      hint: 'Demo OTP: 123456'
    },
    captain: {
      label: 'Captain', icon: 'fa-motorcycle', tone: 'blue',
      subtitle: 'Use the Captain ID generated when your captain account was created.',
      destination: 'captain-dashboard.html',
      identifier: '', otp: '', identifierLabel: 'Captain ID', identifierType: 'text',
      hint: 'Example format: CAP-LKQ3MT (use the ID generated for your account)'
    },
    admin: {
      label: 'Admin', icon: 'fa-shield-halved', tone: 'purple',
      subtitle: 'Manage riders, captains, rides, promos and platform health.',
      destination: 'admin-login.html',
      identifier: 'yaswanthinfotech', password: 'rapido-clone', identifierLabel: 'Username', identifierType: 'text',
      hint: 'Username: yaswanthinfotech · Password: rapido-clone'
    }
  };

  function $(s) { return document.querySelector(s); }
  function esc(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function session() { try { return JSON.parse(localStorage.getItem('rc.session') || 'null'); } catch { return null; } }
  function notify(message, type) {
    if (window.Notify && typeof window.Notify.notify === 'function') return window.Notify.notify(message, { type: type || 'info', title: type === 'error' ? 'Sign in failed' : 'Dashboard' });
    const root = $('#toasts');
    if (!root) return;
    const el = document.createElement('div'); el.className = 'toast toast-' + (type || 'info'); el.textContent = message; root.appendChild(el); setTimeout(() => el.remove(), 3500);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const dialog = $('#dashboardAuthDialog');
    if (!dialog) return;

    const roleButtons = [...dialog.querySelectorAll('[data-dashboard-role]')];
    const form = $('#dashboardAuthForm');
    const roleInput = $('#dashboardRole');
    const identifier = $('#dashboardIdentifier');
    const password = $('#dashboardPassword');
    const credentialLabel = $('#dashboardCredentialLabel');
    const roleTitle = $('#dashboardRoleTitle');
    const roleSubtitle = $('#dashboardRoleSubtitle');
    const identifierLabel = $('#dashboardIdentifierLabel');
    const hint = $('#dashboardCredentialHint');
    const error = $('#dashboardAuthError');
    const submit = $('#dashboardAuthSubmit');
    const signedBadge = $('#dashboardSignedBadge');

    let activeRole = 'rider';

    function setRole(role) {
      const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.rider;
      activeRole = role;
      roleInput.value = role;
      roleButtons.forEach(btn => {
        const on = btn.dataset.dashboardRole === role;
        btn.classList.toggle('selected', on);
        btn.setAttribute('aria-pressed', String(on));
      });
      roleTitle.textContent = 'Sign in as ' + cfg.label;
      roleSubtitle.textContent = cfg.subtitle;
      identifierLabel.textContent = cfg.identifierLabel;
      credentialLabel.textContent = activeRole === 'rider' ? 'Demo OTP' : activeRole === 'captain' ? 'Captain access' : 'Password';
      password.type = activeRole === 'captain' ? 'hidden' : 'text';
      password.value = '';
      password.placeholder = activeRole === 'rider' ? 'Enter demo OTP' : activeRole === 'admin' ? 'Enter admin password' : '';
      password.required = activeRole !== 'captain';
      identifier.type = cfg.identifierType;
      identifier.inputMode = cfg.identifierType === 'tel' ? 'numeric' : 'text';
      identifier.placeholder = cfg.identifierLabel === 'Username' ? 'Enter admin username' : activeRole === 'captain' ? 'Enter Captain ID' : 'Enter 10-digit mobile number';
      hint.innerHTML = '<i class="fa-solid fa-circle-info"></i> ' + esc(cfg.hint);
      error.textContent = '';
      signedBadge.textContent = cfg.label + ' access';
      signedBadge.className = 'dashboard-signed-badge ' + cfg.tone;
    }

    function openDialog() {
      const s = session();
      if (s && ['customer', 'rider', 'captain', 'admin'].includes(String(s.role).toLowerCase())) {
        const role = String(s.role).toLowerCase() === 'customer' ? 'rider' : String(s.role).toLowerCase();
        setRole(role);
      } else {
        setRole('rider');
      }
      form.reset();
      roleInput.value = activeRole;
      setRole(activeRole);
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      setTimeout(() => identifier.focus(), 80);
    }

    roleButtons.forEach(btn => btn.addEventListener('click', () => {
      if (btn.id === 'dashboardAdminLogin' || btn.dataset.dashboardRole === 'admin') {
        window.location.href = 'admin-login.html';
        return;
      }
      setRole(btn.dataset.dashboardRole);
    }));

    $('#dashboardAdminLogin')?.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.href = 'admin-login.html'; }
    });
    $('#dashboardUseDemo')?.addEventListener('click', function () {
      const cfg = ROLE_CONFIG[activeRole]; identifier.value = cfg.identifier || ''; password.value = activeRole === 'rider' ? cfg.otp : (cfg.password || ''); error.textContent = '';
    });

    $('#dashboardAuthClose')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const cfg = ROLE_CONFIG[activeRole];
      let id = String(identifier.value || '').trim();
      const credential = String(password.value || '').trim();
      if (activeRole === 'rider') id = id.replace(/\D/g, '');
      else id = id.toUpperCase();
      error.textContent = '';
      if (!id || (activeRole !== 'captain' && !credential)) { error.textContent = activeRole === 'captain' ? 'Enter your Captain ID.' : 'Enter your credentials to continue.'; return; }
      if (activeRole === 'rider' && !/^\d{10}$/.test(id)) { error.textContent = 'Enter a valid 10-digit mobile number.'; return; }
      if (activeRole === 'rider' && !/^\d{6}$/.test(credential)) { error.textContent = 'Enter the 6-digit demo OTP.'; return; }
      if (activeRole === 'captain' && !/^CAP-[A-Z0-9]{6,8}$/.test(id)) { error.textContent = 'Enter a valid Captain ID such as CAP-LKQ3MT.'; return; }

      submit.disabled = true;
      submit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying ' + cfg.label + '…';

      // Admin uses the same credentials as the existing V17/V19 admin login.
      if (activeRole === 'admin') {
        if (id === cfg.identifier && credential === cfg.password) {
          localStorage.setItem('rc.session', JSON.stringify({ phone: 'admin', role: 'admin', name: 'Administrator', at: Date.now() }));
          localStorage.setItem('rc.apiUser', JSON.stringify({ phone: 'admin', role: 'admin', name: 'Administrator' }));
          notify('Administrator signed in. Opening Admin Dashboard…', 'success');
          setTimeout(() => location.href = cfg.destination, 450);
        } else {
          error.textContent = 'Invalid admin username or password.';
          submit.disabled = false; submit.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign in & continue';
        }
        return;
      }

      try {
        if (window.RapidoAPI && typeof window.RapidoAPI.request === 'function') {
          const endpoint = activeRole === 'rider' ? '/auth/rider-login' : '/auth/captain-login';
          const body = activeRole === 'rider' ? { phone: id, otp: credential } : { captainId: id };
          const data = await window.RapidoAPI.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
          localStorage.setItem('rc.session', JSON.stringify({ phone: data.user.phone, role: data.user.role, name: data.user.name, captainId: data.user.captainId || null, at: Date.now() }));
          localStorage.setItem('rc.apiUser', JSON.stringify(data.user));
          if (data.user.captainId) localStorage.setItem('rc.captainId', data.user.captainId);
          notify('Signed in as ' + cfg.label + '. Opening your dashboard…', 'success');
          setTimeout(() => location.href = cfg.destination, 450);
          return;
        }
      } catch (apiError) {
        // If the project is being opened as a static site, use the local demo account store below.
        if (activeRole !== 'captain') {
          const demoOk = activeRole === 'rider' && id === cfg.identifier && credential === cfg.otp;
          if (!demoOk) {
            error.textContent = apiError.message || 'Unable to sign in with these credentials.';
            submit.disabled = false; submit.innerHTML = '<i class=\"fa-solid fa-arrow-right-to-bracket\"></i> Sign in & continue';
            return;
          }
        }
      }

      if (activeRole === 'captain') {
        // Registration creates Captain IDs in rc.users for the browser/static demo.
        // Match the generated ID exactly, then create the authenticated session locally.
        let users = {};
        try { users = JSON.parse(localStorage.getItem('rc.users') || '{}'); } catch (_) { users = {}; }
        const found = Object.entries(users).find(([, u]) => u && String(u.role).toLowerCase() === 'captain' && String(u.captainId || '').toUpperCase() === id);
        if (found) {
          const phone = found[0];
          const user = { phone, role: 'captain', name: found[1].name || 'Captain', city: found[1].city || '', captainId: id };
          localStorage.setItem('rc.session', JSON.stringify({ ...user, at: Date.now() }));
          localStorage.setItem('rc.apiUser', JSON.stringify(user));
          localStorage.setItem('rc.captainId', id);
          notify('Captain verified. Opening Captain Dashboard…', 'success');
          setTimeout(() => location.href = cfg.destination, 450);
          return;
        }
        error.textContent = 'Captain ID not found in this browser. Please use the ID from the Captain account you created on this device.';
        submit.disabled = false; submit.innerHTML = '<i class=\"fa-solid fa-arrow-right-to-bracket\"></i> Sign in & continue';
        return;
      }

      if (activeRole === 'rider' && id === cfg.identifier && credential === cfg.otp) {
        localStorage.setItem('rc.session', JSON.stringify({ phone: id, role: 'customer', name: 'Demo Rider', at: Date.now() }));
        localStorage.setItem('rc.users', JSON.stringify({ ...(JSON.parse(localStorage.getItem('rc.users') || '{}')), [id]: { name: 'Demo Rider', role: 'customer', city: 'Bengaluru' } }));
        notify('Signed in as Rider. Opening your dashboard…', 'success');
        setTimeout(() => location.href = cfg.destination, 450);
      } else {
        error.textContent = 'Invalid ' + cfg.label.toLowerCase() + ' credentials.';
        submit.disabled = false; submit.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign in & continue';
      }
    });

    $('#openDashboardChooser')?.addEventListener('click', openDialog);

    // Dashboard navigation always opens the role chooser by design.
    openDialog();
  });
})();
