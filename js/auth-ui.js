/* Shared role-session UI: logout on authenticated dashboards. */
(function () {
  'use strict';
  function readSession() {
    try { return JSON.parse(localStorage.getItem('rc.session') || 'null'); } catch (_) { return null; }
  }
  function roleLabel(role) {
    return role === 'admin' ? 'Admin' : role === 'captain' ? 'Captain' : 'Rider';
  }
  function clearAuth() {
    ['rc.token','rc.apiUser','rc.captainId'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('rc.session', 'null');
  }
  function install() {
    const page = document.body?.dataset?.page || '';
    const session = readSession();
    const protectedPage = ['customer','captain','admin'].includes(page);
    if (!protectedPage || !session || !['customer','captain','admin','rider'].includes(String(session.role || '').toLowerCase())) return;

    const nav = document.querySelector('#menu');
    if (!nav || document.getElementById('globalLogoutBtn')) return;

    const role = String(session.role || 'customer').toLowerCase() === 'rider' ? 'customer' : String(session.role || 'customer').toLowerCase();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'globalLogoutBtn';
    btn.className = 'btn btn2 auth-logout-btn';
    btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Logout';
    btn.setAttribute('aria-label', 'Logout from ' + roleLabel(role) + ' account');
    btn.title = 'Logout from ' + roleLabel(role) + ' account';
    btn.addEventListener('click', function () {
      if (!window.confirm('Are you sure you want to logout?')) return;
      clearAuth();
      window.location.href = 'dashboard.html';
    });
    nav.insertBefore(btn, nav.querySelector('.nav-cta') || null);

    const signIn = nav.querySelector('a[data-key="login"]');
    if (signIn) {
      signIn.textContent = 'Account';
      signIn.setAttribute('href', page === 'customer' ? 'customer-dashboard.html' : page === 'captain' ? 'captain-dashboard.html' : 'admin-dashboard.html');
    }
  }
  document.addEventListener('DOMContentLoaded', install);
})();
