/* Premium admin-only interactions. Does not modify rider/captain pages. */
(function(){
  'use strict';
  const q=s=>document.querySelector(s), qa=s=>Array.from(document.querySelectorAll(s));
  const page=document.body?.dataset?.page;
  if(page!=='admin' && page!=='login') return;
  function addLoginFeatures(){
    const form=q('#adminLoginForm'); if(!form) return;
    const pass=form.querySelector('input[name="password"]');
    if(pass && !pass.parentElement.querySelector('.admin-password-toggle')){
      const wrap=pass.parentElement; wrap.classList.add('admin-input-wrap');
      const b=document.createElement('button'); b.type='button'; b.className='admin-input-icon admin-password-toggle'; b.setAttribute('aria-label','Show password'); b.innerHTML='<i class="fa-solid fa-eye"></i>';
      b.addEventListener('click',()=>{pass.type=pass.type==='password'?'text':'password'; b.innerHTML=pass.type==='password'?'<i class="fa-solid fa-eye"></i>':'<i class="fa-solid fa-eye-slash"></i>';}); wrap.appendChild(b);
    }
    form.addEventListener('submit',()=>{ const b=form.querySelector('[type="submit"]'); if(b){b.classList.add('is-loading'); setTimeout(()=>b.classList.remove('is-loading'),700);} },true);
  }
  function addDashboardFeatures(){
    const content=q('#content'); if(!content) return;
    const dash=content.querySelector('.dash-head');
    if(dash && !q('#adminPremiumHero')){
      const hero=document.createElement('section'); hero.id='adminPremiumHero'; hero.className='admin-hero'; hero.innerHTML='<div><p class="eyebrow">RAPIDO ADMIN COMMAND CENTER</p><h1>Run the city from one screen.</h1><p>Monitor rides, manage captains, control promotions and keep the platform healthy.</p></div><div class="admin-live-clock"><strong id="adminClock">--:--:--</strong><small id="adminDate">Loading…</small></div>';
      dash.parentNode.insertBefore(hero,dash.nextSibling);
      const quick=document.createElement('div'); quick.className='admin-quickbar'; quick.innerHTML='<button data-jump="apOverview"><i class="fa-solid fa-chart-pie"></i>Analytics</button><button data-jump="apCaptains"><i class="fa-solid fa-id-card"></i>Captains</button><button data-jump="apUsers"><i class="fa-solid fa-users"></i>Users</button><button data-jump="apPromos"><i class="fa-solid fa-ticket"></i>Promos</button><button data-jump="apSupport"><i class="fa-solid fa-headset"></i>Support</button><button id="adminCommand"><i class="fa-solid fa-bolt"></i>Quick actions</button>';
      hero.after(quick);
      const health=document.createElement('div'); health.className='admin-health'; health.innerHTML='<article class="admin-health-card" style="--n:0"><i class="fa-solid fa-server"></i><div><strong>Platform</strong><span>All systems operational</span></div><b class="admin-status-dot"></b></article><article class="admin-health-card" style="--n:1"><i class="fa-solid fa-database"></i><div><strong>Data store</strong><span>Local + server sync</span></div><b class="admin-status-dot"></b></article><article class="admin-health-card" style="--n:2"><i class="fa-solid fa-map-location-dot"></i><div><strong>Maps</strong><span>Leaflet fallback ready</span></div><b class="admin-status-dot"></b></article><article class="admin-health-card" style="--n:3"><i class="fa-solid fa-shield-halved"></i><div><strong>Security</strong><span>Admin session protected</span></div><b class="admin-status-dot"></b></article>';
      quick.after(health);
      quick.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{const el=document.getElementById(b.dataset.jump); if(el) el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}));
      q('#adminCommand').addEventListener('click',openCommand);
    }
    if(!q('#adminCommandDrawer')){
      const d=document.createElement('div'); d.id='adminCommandDrawer'; d.className='admin-command-drawer'; d.innerHTML='<div class="admin-command-card" role="dialog" aria-modal="true" aria-labelledby="cmdTitle"><h3 id="cmdTitle">⚡ Quick actions</h3><p>Jump directly to the most-used administration controls.</p><div class="admin-command-actions"><button data-jump="apOverview">📊 Open analytics</button><button data-jump="apCaptains">🪪 Review captains</button><button data-jump="apUsers">👥 Manage users</button><button data-jump="apPromos">🎟️ Manage promos</button><button data-jump="apSupport">💬 Open support</button><button data-jump="apAudit">🧾 View audit log</button></div><button id="cmdClose" class="btn btn2" style="margin-top:14px;width:100%">Close</button></div>';
      document.body.appendChild(d); d.addEventListener('click',e=>{if(e.target===d||e.target.id==='cmdClose')d.classList.remove('open'); const b=e.target.closest('[data-jump]'); if(b){d.classList.remove('open'); const el=document.getElementById(b.dataset.jump); if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}});
    }
    function openCommand(){q('#adminCommandDrawer')?.classList.add('open');}
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand();} if(e.key==='Escape')q('#adminCommandDrawer')?.classList.remove('open');});
    function tick(){const now=new Date(); const c=q('#adminClock'),d=q('#adminDate'); if(c)c.textContent=now.toLocaleTimeString('en-IN',{hour12:false}); if(d)d.textContent=now.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'short',year:'numeric'});} tick(); setInterval(tick,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{addLoginFeatures();addDashboardFeatures();}); else {addLoginFeatures();addDashboardFeatures();}
})();
