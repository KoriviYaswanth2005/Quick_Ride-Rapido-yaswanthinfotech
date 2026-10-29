/* API bridge for the full-stack local development server. */
(function () {
  'use strict';
  const API = (window.RAPIDO_API_URL || '').replace(/\/$/, '') || '';
  const tokenKey = 'rc.apiToken';
  const userKey = 'rc.apiUser';
  const $ = (s) => document.querySelector(s);
  const token = () => localStorage.getItem(tokenKey) || '';
  const headers = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) });
  async function api(path, options={}) {
    const response = await fetch(API + '/api' + path, { ...options, headers: { ...headers(), ...(options.headers||{}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }
  function saveAuth(data) {
    localStorage.setItem(tokenKey, data.token);
    localStorage.setItem(userKey, JSON.stringify(data.user));
    localStorage.setItem('rc.session', JSON.stringify({ phone:data.user.phone, role:data.user.role, name:data.user.name, at:Date.now() }));
    localStorage.setItem('rc.users', JSON.stringify({ ...(JSON.parse(localStorage.getItem('rc.users')||'{}')), [data.user.phone]: { name:data.user.name, role:data.user.role, city:data.user.city, captainId:data.user.captainId||null } }));
  }
  function setError(id, message) { const el = document.getElementById(id); if (el) el.textContent = message || ''; }
  function notify(message, type='info') {
    const root = document.querySelector('#toasts');
    if (!root) { console[type==='error'?'error':'log'](message); return; }
    const el = document.createElement('div'); el.className='toast toast-'+type; el.setAttribute('role','status'); el.textContent=message; root.appendChild(el); setTimeout(()=>el.remove(),4500);
  }
  function goByRole(role) { location.href = role==='captain' ? 'captain-dashboard.html' : role==='admin' ? 'admin-dashboard.html' : 'customer-dashboard.html'; }
  document.addEventListener('submit', async function(e) {
    const form=e.target;
    if (form && form.id==='registerForm') {
      e.preventDefault(); e.stopImmediatePropagation();
      const f=new FormData(form); const button=form.querySelector('[type="submit"]');
      const payload={name:f.get('name'),phone:f.get('phone'),city:f.get('city'),password:f.get('password'),role:f.get('role')||'customer'};
      setError('regError',''); if(button){button.disabled=true;button.textContent='Creating account…';}
      try { const data=await api('/auth/register',{method:'POST',body:JSON.stringify(payload)}); saveAuth(data); if(data.user.role==='captain' && data.user.captainId){ const box=document.getElementById('captainIdResult'); const out=document.getElementById('generatedCaptainId'); if(box&&out){out.textContent=data.user.captainId; box.hidden=false; box.scrollIntoView({behavior:'smooth',block:'center'});} notify('Captain account created. Your Captain ID is '+data.user.captainId+'.','success'); setTimeout(()=>goByRole(data.user.role),1800); } else { notify('Account created securely.','success'); setTimeout(()=>goByRole(data.user.role),450); } }
      catch(err){setError('regError',err.message);}
      finally{if(button){button.disabled=false;button.textContent='Create account';}}
    }
    if (form && form.id==='adminLoginForm') {
      /* v17: administrator sign-in runs in the browser (static site, no server). */
      e.preventDefault(); e.stopImmediatePropagation();
      const f=new FormData(form); const button=form.querySelector('[type="submit"]'); setError('adminLoginError','');
      const user=String(f.get('username')||'').trim(); const pass=String(f.get('password')||'');
      if(button){button.disabled=true;button.textContent='Verifying…';}
      setTimeout(()=>{
        if (user === 'yaswanthinfotech' && pass === 'rapido-clone') {
          localStorage.setItem('rc.session', JSON.stringify({ phone:'admin', role:'admin', name:'Administrator', at:Date.now() }));
          notify('Administrator signed in.','success');
          setTimeout(()=>location.href='admin-dashboard.html',350);
        } else {
          setError('adminLoginError','Wrong username or password.');
          if(button){button.disabled=false;button.textContent='Sign in as administrator';}
        }
      }, 450);
    }
    if (form && form.id==='phoneForm') {
      e.preventDefault(); e.stopImmediatePropagation();
      const f=new FormData(form); const phone=String(f.get('phone')||'').replace(/\D/g,''); const password=String(f.get('password')||'');
      setError('phoneError',''); const button=form.querySelector('[type="submit"]');
      if(!/^[6-9]\d{9}$/.test(phone)){setError('phoneError','Enter a valid 10-digit mobile number.');return;}
      if(password.length<8){setError('phoneError','Enter your password (at least 8 characters).');return;}
      if(button){button.disabled=true;button.textContent='Signing in…';}
      try { const data=await api('/auth/login',{method:'POST',body:JSON.stringify({phone,password})}); saveAuth(data); notify('Welcome back, '+data.user.name+'.','success'); setTimeout(()=>goByRole(data.user.role),350); }
      catch(err){setError('phoneError',err.message);}
      finally{if(button){button.disabled=false;button.textContent='Sign in securely';}}
    }
  }, true);
  // Keep the API in sync with locally created rides. The browser UI remains usable offline;
  // the server becomes the shared source of truth when the app is served through Node.
  let lastTrips=''; let syncing=false;
  async function hydrateRemoteRides() {
    if(!token())return;
    try {
      const data=await api('/rides');
      const local=JSON.parse(localStorage.getItem('rc.trips')||'[]');
      const byId=new Map(local.map(t=>[String(t.id),t]));
      for(const r of (data.rides||[])) {
        const id=String(r.clientRideId||r.id); const old=byId.get(id)||{};
        byId.set(id,{...old,id,pickup:r.pickup,drop:r.drop,type:r.type,km:r.km,base:old.base||r.fare,fare:r.fare,paymentMethod:r.paymentMethod,paymentStatus:r.paymentStatus,status:r.status,captain:r.captainName||old.captain||null,customer:r.customerPhone||old.customer,customerName:r.customerName||old.customerName,rating:r.rating||0,review:r.review||old.review||'',cancelReason:r.cancelReason||old.cancelReason||'',acceptedAt:r.acceptedAt||old.acceptedAt||null,at:old.at||new Date(r.createdAt).getTime(),serverRideId:r.id,clientRideId:r.clientRideId});
      }
      const merged=Array.from(byId.values()).sort((a,b)=>(b.at||0)-(a.at||0));
      localStorage.setItem('rc.trips',JSON.stringify(merged));
    } catch(e) { /* API is unavailable; keep the browser's saved rides. */ }
    if((JSON.parse(localStorage.getItem('rc.session')||'null')||{}).role==='admin') {
      try { const data=await api('/admin/users'); const users={}; for(const u of data.users||[])users[u.phone]={name:u.name,role:u.role,city:u.city,captainId:u.captainId||null}; localStorage.setItem('rc.users',JSON.stringify(users)); } catch(e) {}
    }
  }
  async function syncTrips() {
    if(syncing||!token())return;
    const raw=localStorage.getItem('rc.trips')||'[]'; if(raw===lastTrips)return;
    let trips;try{trips=JSON.parse(raw);}catch{return;}
    syncing=true;
    try {
      const server=await api('/rides'); const known=new Set((server.rides||[]).map(r=>r.clientRideId).filter(Boolean));
      const serverByClient=new Map((server.rides||[]).filter(r=>r.clientRideId).map(r=>[String(r.clientRideId),r]));
      for(const trip of trips.slice().reverse()) {
        const serverRide=serverByClient.get(String(trip.id));
        if(!serverRide && ['requested','scheduled'].includes(trip.status)) {
          if(trip.status==='requested') await api('/rides',{method:'POST',body:JSON.stringify({...trip,clientRideId:String(trip.id)})}).catch(()=>{});
        } else if(serverRide) {
          if(serverRide.status!==trip.status && ['accepted','in-progress','completed','cancelled'].includes(trip.status)) {
            await api('/rides/'+encodeURIComponent(String(trip.id))+'/status',{method:'PATCH',body:JSON.stringify({status:trip.status})}).catch(()=>{});
          }
          const localRating=Number(trip.rating||0), serverRating=Number(serverRide.rating||0);
          if(localRating>0 && localRating!==serverRating) {
            await api('/rides/'+encodeURIComponent(String(trip.id))+'/rating',{method:'POST',body:JSON.stringify({rating:localRating,review:trip.review||''})}).catch(()=>{});
          }
        }
      }
      lastTrips=raw;
      window.dispatchEvent(new CustomEvent('rapido:sync-complete'));
    } catch (e) { /* API may be offline; local demo data is preserved. */ }
    finally {syncing=false;}
  }
  const originalSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){originalSetItem.call(this,key,value);if(key==='rc.trips')setTimeout(syncTrips,250);if(key==='rc.session'&&value==='null'){originalSetItem.call(this,tokenKey,'');originalSetItem.call(this,userKey,'');}};
  window.RapidoAPI={request:api, getToken:token, getUser:()=>{try{return JSON.parse(localStorage.getItem(userKey)||'null')}catch{return null}}, signOut:()=>{localStorage.removeItem(tokenKey);localStorage.removeItem(userKey);localStorage.setItem('rc.session','null');location.href='login.html';}};
  document.addEventListener('DOMContentLoaded',()=>{
    const user=window.RapidoAPI.getUser();
    if(user){document.querySelectorAll('[data-link="login"],a[href="login.html"]').forEach(a=>{if(a.textContent.trim().toLowerCase().includes('sign in'))a.textContent='Account';});}
    hydrateRemoteRides().then(syncTrips);
    setInterval(()=>{ hydrateRemoteRides().then(syncTrips).catch(()=>{}); }, 3000);
    const logout=document.querySelector('#logoutBtn'); if(logout)logout.addEventListener('click',()=>{localStorage.removeItem(tokenKey);localStorage.removeItem(userKey);});
    const supportForm=document.querySelector('#contactForm');
    if(supportForm) supportForm.addEventListener('submit',async function(e){const message=supportForm.querySelector('[name="message"]');if(!message)return;const f=new FormData(supportForm);try{const data=await api('/support',{method:'POST',body:JSON.stringify(Object.fromEntries(f.entries()))});notify('Support request received. Reference: '+data.ticket.id,'success');}catch(err){/* the page's local demo handler remains available */}},true);
    const newsletter=document.querySelector('#newsletter');if(newsletter)newsletter.addEventListener('submit',async function(e){const input=newsletter.querySelector('input[type="email"]');if(!input)return;api('/newsletter',{method:'POST',body:JSON.stringify({email:input.value})}).then(()=>notify('Newsletter subscription saved.','success')).catch(()=>{});},true);
  });
})();
