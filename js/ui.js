"use strict";
// ============================================================ OVERLAYS
function show(id) {
  ['start','shopScreen','over','settings','pause'].forEach(s => document.getElementById(s).classList.add('hidden'));
  if (id) document.getElementById(id).classList.remove('hidden');
}

function showMsg(t) {
  const m = document.getElementById('msg');
  m.textContent = t; m.classList.add('show');
  clearTimeout(showMsg._t);
  showMsg._t = setTimeout(() => m.classList.remove('show'), 1300);
}

function showTouch(on) {
  if (isTouch) {
    document.getElementById('touchControls').classList.toggle('hidden', !on);
    document.getElementById('pauseBtn').classList.toggle('hidden', !on);
  }
}

// ============================================================ HUD
function updateHUD() {
  const p = G.player;
  document.getElementById('hpbar').style.width = clamp(p.hp/p.maxhp*100,0,100) + '%';
  document.getElementById('hpnum').textContent  = Math.ceil(Math.max(0, p.hp));
  document.getElementById('coins').textContent  = G.coinCount;
  updateWeaponHUD();
  updateWeaponBtns();
  updateNadeHUD();
}

function updateNadeHUD() {
  const wrap = document.getElementById('nadeChips');
  if (!wrap || !G) return;
  const types = GORDER.filter(t => G.grenades[t]>0 || t===G.grenade);
  wrap.innerHTML = '';
  for (const t of types) {
    const def=GRENADES[t], b=document.createElement('button');
    b.className = 'nchip' + (t===G.grenade?' active':'') + (G.grenades[t]<=0?' empty':'');
    b.innerHTML = `<span class="ni">${def.icon}</span><b>${G.grenades[t]}</b>`;
    b.title = def.name;
    b.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); actx(); selectGrenade(t); SFX.click(); });
    wrap.appendChild(b);
  }
}

// weapon icon in the corner HUD
function drawWeaponIcon(w) { const ic=document.getElementById('wIcon'); if(ic) paintWeapon(ic,w); }

let _whW = null;
function updateWeaponHUD() {
  const melee=G.activeSlot==='melee', wp=melee?MELEE[G.melee]:WEAPONS[G.weapon];
  document.getElementById('weaponHUD').style.setProperty('--wcol', wp.color);
  document.getElementById('whName').textContent = wp.name;
  const sig = G.activeSlot + ':' + (melee ? G.melee : G.weapon);
  if (_whW !== sig) {
    if (melee) paintMelee(document.getElementById('wIcon'), G.melee);
    else drawWeaponIcon(G.weapon);
    _whW = sig;
  }
  const cur=document.getElementById('ammoCur'), magEl=document.getElementById('ammoMag');
  if (melee) { cur.textContent='∞'; cur.style.color='#fff'; magEl.textContent=''; updateSwapBtn(); return; }
  const inf = wp.mag === Infinity;
  cur.textContent  = inf ? '∞' : (G.reloading>0 ? '…' : G.ammo[G.weapon]);
  cur.style.color  = (!inf && G.reloading<=0 && G.ammo[G.weapon]<=Math.ceil(wp.mag*0.25)) ? '#ff6b6b' : '#fff';
  magEl.textContent = inf ? '' : ('/ ' + wp.mag);
  updateSwapBtn();
}

function updateSwapBtn() {
  const b = document.getElementById('swapBtn');
  if (b) b.textContent = G.activeSlot==='firearm' ? '🔪' : '🔫';
}

function updateWeaponBtns() {} // no weapon-switch buttons on HUD currently

function tickReloadHUD() {
  const el = document.getElementById('whReload');
  if (G.reloading > 0) {
    el.classList.remove('hidden');
    document.getElementById('rlbar').style.width = ((1 - G.reloading/WEAPONS[G.weapon].reload)*100) + '%';
  } else {
    el.classList.add('hidden');
  }
}

// ============================================================ WEAPON / MELEE / GRENADE ICONS
function paintWeapon(ic, w) {
  const x=ic.getContext('2d'); x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,ic.width,ic.height);
  const S=ic.width/96; x.scale(S,S); x.translate(4,18); x.lineJoin='round';
  const col=WEAPONS[w].color, metal='#3b424b', dk='#191d22', wood='#4a3320', steel='#5b636d';
  const part=(px,py,pw,ph,r,c)=>{ x.fillStyle=c; rr(x,px,py,pw,ph,r); x.fill(); };
  if(w==='pistol'){
    part(8,-7,32,9,2,metal); part(10,-4,28,4,1,dk); part(12,1,10,15,2,dk); part(20,2,7,5,1,metal); part(36,-4,12,4,1,col);
  } else if(w==='smg'){
    part(2,-5,12,7,2,dk); part(10,-8,52,11,3,metal); part(22,2,9,17,2,dk); part(34,2,8,5,1,metal); part(58,-3,22,4,1,col);
  } else if(w==='shotgun'){
    part(2,-7,14,15,3,wood); part(12,-6,60,5,2,metal); part(12,1,40,5,2,dk); part(26,4,11,4,1,steel); part(66,-2,26,4,1,col);
  } else if(w==='rifle'){
    part(2,-6,13,13,3,dk); part(12,-6,58,8,2,metal); part(26,-15,18,8,2,dk); part(30,-13,4,4,1,col);
    part(30,2,10,16,2,dk); part(42,2,8,5,1,metal); part(66,-2,28,4,1,col);
  } else if(w==='assault'){
    part(2,-5,12,8,2,dk); part(10,-7,54,10,3,metal); part(24,2,10,18,3,dk); part(36,2,8,5,1,metal); part(60,-3,24,4,1,col);
  } else if(w==='magnum'){
    part(10,-6,24,8,2,steel); part(20,-7,9,11,3,metal); part(12,2,9,16,2,wood); part(30,-3,10,4,1,col);
    x.fillStyle=dk; x.beginPath(); x.arc(24.5,-1.5,2.2,0,TAU); x.fill();
  } else if(w==='lmg'){
    part(2,-7,16,12,3,dk); part(14,-8,62,13,3,metal); part(30,3,12,22,3,dk); part(46,3,9,6,1,metal); part(72,-3,22,5,2,col);
    part(60,9,3,9,1,steel); part(70,9,3,9,1,steel);
  } else if(w==='sniper'){
    part(2,-5,15,11,3,dk); part(14,-5,72,7,2,metal); part(34,-14,26,7,2,dk); part(40,-12,5,3,1,col);
    part(30,2,9,15,2,dk); part(78,-1,16,3,1,col);
  } else {
    part(8,-7,32,9,2,metal); part(10,-4,28,4,1,dk); part(12,1,10,15,2,dk); part(20,2,7,5,1,metal); part(36,-4,12,4,1,col);
  }
}

function paintMelee(ic, m) {
  const x=ic.getContext('2d'); x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,ic.width,ic.height);
  const S=ic.width/96; x.scale(S,S); x.translate(4,18); x.lineJoin='round';
  const mw=MELEE[m], col=mw.color, grip='#3a2a1c';
  const part=(px,py,pw,ph,r,c)=>{ x.fillStyle=c; rr(x,px,py,pw,ph,r); x.fill(); };
  if(mw.shape==='knife'){
    part(8,-2,12,4,1.5,grip);
    x.fillStyle=col; x.beginPath(); x.moveTo(20,-3); x.lineTo(50,-0.5); x.lineTo(20,3); x.closePath(); x.fill();
    x.fillStyle='rgba(255,255,255,.45)'; x.fillRect(22,-1.6,24,1);
  } else if(mw.shape==='machete'){
    part(4,-2.5,16,5,2,grip);
    x.fillStyle=col; x.beginPath(); x.moveTo(20,-4); x.lineTo(64,-2.5); x.quadraticCurveTo(66,2.5,54,4.5); x.lineTo(20,4.5); x.closePath(); x.fill();
    x.fillStyle='rgba(255,255,255,.45)'; x.fillRect(23,-2.4,36,1);
  } else if(mw.shape==='spear'){
    part(4,-1.5,52,3,1.5,grip);
    x.fillStyle=col; x.beginPath(); x.moveTo(54,-5); x.lineTo(72,0); x.lineTo(54,5); x.lineTo(58,0); x.closePath(); x.fill();
    x.fillStyle='rgba(255,255,255,.45)'; x.beginPath(); x.moveTo(56,-2.4); x.lineTo(68,0); x.lineTo(56,0); x.closePath(); x.fill();
  } else if(mw.shape==='katana'){
    part(4,-2.5,15,5,2,grip); x.fillStyle='#caa33a'; x.fillRect(18,-3.5,3,7);
    x.fillStyle=col; x.beginPath(); x.moveTo(21,-3.5); x.lineTo(70,-4.5); x.quadraticCurveTo(74,-2,72,2); x.lineTo(21,2.5); x.closePath(); x.fill();
    x.fillStyle='rgba(255,255,255,.5)'; x.fillRect(24,-2.8,44,1);
  } else if(mw.shape==='sledge'){
    part(4,-2,46,4,1.5,grip);
    x.fillStyle=col; rr(x,44,-11,16,22,3); x.fill();
    x.fillStyle='#6b747d'; rr(x,44,-11,5,22,2); x.fill();
    x.fillStyle='rgba(255,255,255,.3)'; rr(x,52,-9,5,18,2); x.fill();
  } else { // axe
    part(4,-2,12,4,1.5,grip); x.fillStyle=grip; x.fillRect(14,-2,30,4);
    x.fillStyle=col; x.beginPath(); x.moveTo(40,-13); x.lineTo(60,-7); x.quadraticCurveTo(67,0,60,7); x.lineTo(40,13); x.quadraticCurveTo(47,0,40,-13); x.closePath(); x.fill();
    x.fillStyle='rgba(255,255,255,.4)'; x.beginPath(); x.moveTo(58,-6); x.quadraticCurveTo(63,0,58,6); x.lineTo(55,5); x.quadraticCurveTo(59,0,55,-5); x.closePath(); x.fill();
  }
}

function paintGrenade(ic, t) {
  const x=ic.getContext('2d'); x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,ic.width,ic.height);
  const S=ic.width/96; x.scale(S,S); x.translate(34,18); x.lineJoin='round';
  const def=GRENADES[t], body='#3b4a2e', dk='#222a1a';
  if (t === 'frag') {
    x.fillStyle=body; x.beginPath(); x.ellipse(0,2,11,13,0,0,TAU); x.fill();
    x.strokeStyle='rgba(0,0,0,.35)'; x.lineWidth=1;
    for(let i=-1;i<=1;i++){ x.beginPath(); x.moveTo(-10,i*6+2); x.lineTo(10,i*6+2); x.stroke(); }
    for(let i=-1;i<=1;i++){ x.beginPath(); x.moveTo(i*6,-9); x.lineTo(i*6,13); x.stroke(); }
    x.fillStyle='#5b636d'; rr(x,-4,-13,8,4,1); x.fill(); x.fillStyle='#caa33a'; rr(x,3,-13,7,3,1); x.fill();
  } else {
    x.fillStyle=dk; rr(x,-8,-11,16,24,4); x.fill();
    x.fillStyle=body; rr(x,-8,-11,16,7,4); x.fill();
    x.fillStyle=def.color; x.fillRect(-8,-1,16,5);
    x.fillStyle='#5b636d'; rr(x,-5,-15,10,5,2); x.fill();
    x.fillStyle=def.color; x.beginPath(); x.arc(0,4,3,0,TAU); x.fill();
  }
}

// ============================================================ SHOP
let shopState  = 'armas';
let shopOrigin = 'wave';

function openShop() {
  shopOrigin='wave'; shopState='armas';
  resetTctrl(); showTouch(false); show('shopScreen'); renderShop();
}
function openShopFromMenu() {
  if (!G) newGame();
  shopOrigin='menu'; shopState='armas';
  resetTctrl(); show('shopScreen'); renderShop();
}
function openShopFromPause() {
  shopOrigin='pause'; shopState='armas';
  resetTctrl(); show('shopScreen'); renderShop();
}
function backToMenu() { SFX.back(); show('start'); }

function shopBtn(txt, cls, fn) {
  const b=document.createElement('button'); b.className='btn '+cls; b.textContent=txt; b.onclick=fn; return b;
}
function shopTab(id, ic, label) {
  const t=document.createElement('button');
  t.className = 'tab' + (shopState===id?' active':'');
  t.innerHTML = `<span class="ic">${ic}</span>${label}`;
  t.onclick = () => { if(shopState!==id){ SFX.click(); shopState=id; renderShop(); } };
  return t;
}

function renderShop() {
  const v=document.getElementById('shopView'); v.innerHTML='';
  const title = shopOrigin==='menu' ? 'ARSENAL' : shopOrigin==='pause' ? 'TIENDA' : 'OLEADA '+G.wave+' · TIENDA';
  const head=document.createElement('div'); head.className='shopHead';
  head.innerHTML=`<h2>${title}</h2><div class="shopCoins">💰 <b>${G.coinCount}</b></div>`;
  v.appendChild(head);

  const tabs=document.createElement('div'); tabs.className='tabs';
  tabs.appendChild(shopTab('armas','🔫','Armas'));
  tabs.appendChild(shopTab('mele','🔪','Cuerpo a cuerpo'));
  tabs.appendChild(shopTab('granadas','💣','Granadas'));
  tabs.appendChild(shopTab('mejoras','⬆️','Mejoras'));
  v.appendChild(tabs);

  const grid=document.createElement('div'); grid.className='shopGrid'; v.appendChild(grid);
  if(shopState==='armas')    fillArmas(grid);
  else if(shopState==='mele')    fillMele(grid);
  else if(shopState==='granadas') fillGranadas(grid);
  else fillMejoras(grid);

  const foot=document.createElement('div'); foot.className='shopFoot';
  const mini=document.createElement('div'); mini.className='loadMini';
  mini.innerHTML=`🔫 <b>${WEAPONS[G.weapon].name}</b> · 🔪 <b>${MELEE[G.melee].name}</b>`;
  foot.appendChild(mini);
  if (shopOrigin==='menu') {
    const wrap=document.createElement('div'); wrap.style.display='flex'; wrap.style.gap='10px';
    wrap.appendChild(shopBtn('← Menú','alt small',backToMenu));
    wrap.appendChild(shopBtn('Iniciar ▶','small',()=>{ SFX.start(); startGame(); }));
    foot.appendChild(wrap);
  } else if (shopOrigin==='pause') {
    foot.appendChild(shopBtn('← Volver','alt small',()=>{ SFX.back(); show('pause'); }));
  } else {
    foot.appendChild(shopBtn('Siguiente oleada ▶','',closeShopNext));
  }
  v.appendChild(foot);
}

function weaponStats(wp) {
  let s=`<span>💥 Daño: <b>${wp.dmg}</b></span>`;
  s+=`<span>🔥 Cadencia: <b>${(1000/wp.rate).toFixed(1)}/s</b></span>`;
  s+=`<span>📦 Cargador: <b>${wp.mag===Infinity?'∞':wp.mag}</b></span>`;
  if(wp.pellets>1) s+=`<span>🔫 Perdigones: <b>${wp.pellets}</b></span>`;
  if(wp.pierce)    s+=`<span>➶ Perfora: <b>${wp.pierce}</b></span>`;
  return s;
}
function fillArmas(grid) {
  WORDER.forEach(w => {
    const wp=WEAPONS[w], owned=wp.unlocked, equipped=(G.weapon===w), locked=!owned&&G.wave<wp.minWave;
    const card=document.createElement('div'); card.className='card wcard';
    const c=document.createElement('canvas'); c.width=192; c.height=72; card.appendChild(c);
    const head=document.createElement('div'); head.className='t'; head.textContent=wp.name; card.appendChild(head);
    const st=document.createElement('div'); st.className='stats'; st.innerHTML=weaponStats(wp); card.appendChild(st);
    const note=document.createElement('div'); note.className='note'; note.textContent=wp.desc; card.appendChild(note);
    const foot=document.createElement('div'); foot.className='c';
    if(equipped){ foot.innerHTML='<span class="badge-eq">✓ EQUIPADA</span>'; }
    else if(owned){ foot.textContent='EQUIPAR'; }
    else if(locked){ foot.textContent='🔒 Oleada '+wp.minWave; card.classList.add('dis'); }
    else { foot.textContent='💰 '+wp.cost; if(G.coinCount<wp.cost) card.classList.add('dis'); }
    card.appendChild(foot); card.onclick=()=>weaponClick(w); grid.appendChild(card); paintWeapon(c,w);
  });
}
function weaponClick(w) {
  const wp=WEAPONS[w];
  if(G.weapon===w) return;
  if(wp.unlocked){ equipFirearm(w); SFX.buy(); renderShop(); updateHUD(); return; }
  if(G.wave<wp.minWave || G.coinCount<wp.cost){ SFX.error(); return; }
  G.coinCount-=wp.cost; wp.unlocked=true; G.ammo[w]=wp.mag; equipFirearm(w); SFX.buy(); renderShop(); updateHUD();
}

function meleeStats(mw) {
  let s=`<span>💥 Daño: <b>${mw.dmg}</b></span>`;
  s+=`<span>⚔️ Velocidad: <b>${(1000/mw.cd).toFixed(1)}/s</b></span>`;
  s+=`<span>↔️ Alcance: <b>${mw.range}</b></span>`;
  s+=`<span>💪 Empuje: <b>${mw.knock}</b></span>`;
  return s;
}
function fillMele(grid) {
  MORDER.forEach(m => {
    const mw=MELEE[m], owned=mw.unlocked, equipped=(G.melee===m), locked=!owned&&G.wave<mw.minWave;
    const card=document.createElement('div'); card.className='card wcard';
    const c=document.createElement('canvas'); c.width=192; c.height=72; card.appendChild(c);
    const head=document.createElement('div'); head.className='t'; head.textContent=mw.name; card.appendChild(head);
    const st=document.createElement('div'); st.className='stats'; st.innerHTML=meleeStats(mw); card.appendChild(st);
    const note=document.createElement('div'); note.className='note'; note.textContent=mw.desc; card.appendChild(note);
    const foot=document.createElement('div'); foot.className='c';
    if(equipped){ foot.innerHTML='<span class="badge-eq">✓ EQUIPADA</span>'; }
    else if(owned){ foot.textContent='EQUIPAR'; }
    else if(locked){ foot.textContent='🔒 Oleada '+mw.minWave; card.classList.add('dis'); }
    else { foot.textContent='💰 '+mw.cost; if(G.coinCount<mw.cost) card.classList.add('dis'); }
    card.appendChild(foot); card.onclick=()=>meleeClick(m); grid.appendChild(card); paintMelee(c,m);
  });
}
function meleeClick(m) {
  const mw=MELEE[m];
  if(G.melee===m) return;
  if(mw.unlocked){ equipMelee(m); SFX.buy(); renderShop(); updateHUD(); return; }
  if(G.wave<mw.minWave || G.coinCount<mw.cost){ SFX.error(); return; }
  G.coinCount-=mw.cost; mw.unlocked=true; equipMelee(m); SFX.buy(); renderShop(); updateHUD();
}

function grenadeStats(def) {
  let s='';
  if(def.mode==='burst'){ s+=`<span>💥 Daño: <b>${def.dmg}</b></span>`; s+=`<span>💪 Empuje: <b>${def.knock}</b></span>`; }
  else { s+=`<span>🔥 Daño/tick: <b>${def.tickDmg}</b></span>`; s+=`<span>⏱️ Dura: <b>${(def.duration/1000).toFixed(1)}s</b></span>`; }
  s+=`<span>⭕ Radio: <b>${def.radius}</b></span>`;
  if(def.slow) s+=`<span>❄️ Ralentiza</span>`;
  return s;
}
function fillGranadas(grid) {
  GORDER.forEach(t => {
    const def=GRENADES[t], have=G.grenades[t], locked=G.wave<def.minWave;
    const card=document.createElement('div'); card.className='card wcard';
    const c=document.createElement('canvas'); c.width=192; c.height=72; card.appendChild(c);
    const head=document.createElement('div'); head.className='t'; head.textContent=def.name; card.appendChild(head);
    const st=document.createElement('div'); st.className='stats'; st.innerHTML=grenadeStats(def); card.appendChild(st);
    const note=document.createElement('div'); note.className='note'; note.textContent=def.desc+' · Tienes: '+have; card.appendChild(note);
    const foot=document.createElement('div'); foot.className='c';
    if(locked){ foot.textContent='🔒 Oleada '+def.minWave; card.classList.add('dis'); }
    else { foot.innerHTML='💰 '+def.cost+' · +'+def.qty; if(G.coinCount<def.cost) card.classList.add('dis'); }
    card.appendChild(foot); card.onclick=()=>grenadeClick(t); grid.appendChild(card); paintGrenade(c,t);
  });
}
function grenadeClick(t) {
  const def=GRENADES[t];
  if(G.wave<def.minWave || G.coinCount<def.cost){ SFX.error(); return; }
  G.coinCount-=def.cost; G.grenades[t]+=def.qty; G.grenade=t; SFX.buy(); renderShop(); updateHUD();
}

function fillMejoras(grid) {
  SHOP_ITEMS.forEach(it => {
    if(it.can && !it.can()) return;
    const cost=it.cost();
    const card=document.createElement('div'); card.className='card'+(G.coinCount<cost?' dis':'');
    card.innerHTML=`<div class="t">${it.t}</div><div class="d">${it.d}</div><div class="c">💰 ${cost}</div>`;
    card.onclick=()=>{
      const c=it.cost();
      if(G.coinCount>=c){ G.coinCount-=c; it.apply(); SFX.buy(); renderShop(); updateHUD(); }
      else SFX.error();
    };
    grid.appendChild(card);
  });
}

function closeShopNext() {
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('weaponHUD').classList.remove('hidden');
  show(null); showTouch(true); resetTctrl(); startWave(); updateHUD();
}

// ============================================================ SETTINGS
let settingsFrom = 'start';
function openSettings(from) { settingsFrom=from; SFX.open(); show('settings'); }

function setupSettings() {
  const bind = (id, key, extra) => {
    const el=document.getElementById(id);
    const refl=()=>el.classList.toggle('on', !!SETTINGS[key]);
    refl();
    el.onclick=()=>{ SETTINGS[key]=!SETTINGS[key]; saveSettings(); refl(); if(extra)extra(); SFX.click(); };
  };
  bind('setSound','sound', applySound);
  bind('setShake','shake');
  document.getElementById('setBack').onclick=()=>{ SFX.back(); show(settingsFrom==='pause'?'pause':'start'); };
}
