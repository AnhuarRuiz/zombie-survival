"use strict";
// ============================================================ GAME STATE
let G;
let paused = false;

function newGame() {
  G = {
    player: { x:VW/2,y:VH/2,r:16,speed:3.4,hp:100,maxhp:100,inv:0,dodgeCD:0,dodge:0,dx:0,dy:0,vx:0,vy:0,ang:0,legPhase:0,moving:false,recoil:0,meleeCD:0,swing:0 },
    bullets:[],zombies:[],parts:[],coins:[],drops:[],pops:[],blood:[],pools:[],casings:[],smoke:[],
    nades:[],fields:[],fx:[],eprojs:[],
    keys:{},mouse:{x:VW/2,y:VH/2,down:false},
    weapon:'pistol',melee:'knife',activeSlot:'firearm',ammo:{},reloading:0,lastShot:0,muzzle:0,
    grenades:{},grenade:'frag',nadeCD:0,
    wave:0,kills:0,coinsTotal:0,coinCount:0,
    spawnQueue:0,spawnTimer:0,alive:0,waveActive:false,resting:false,rest:0,lastRestSec:0,
    waveTotal:0,waveKilled:0,
    mult:{dmg:1,speed:1,fireRate:1,coin:1},
    up:{maxhp:0,dmg:0,fire:0,speed:0,coin:0},
    shake:0,time:0,over:false,
    zone:{cx:GW>>1,cy:GH>>1},
  };
  for(const k in WEAPONS) G.ammo[k] = WEAPONS[k].mag===Infinity ? Infinity : WEAPONS[k].mag;
  for(const k in WEAPONS) if(k!=='pistol') WEAPONS[k].unlocked=false;
  for(const k in MELEE)   if(k!=='knife')  MELEE[k].unlocked=false;
  for(const k in GRENADES) G.grenades[k]=0;
  G.grenades.frag=2; G.grenade='frag';
  groundSeed=zoneSeed(G.zone.cx,G.zone.cy); prerenderGround();
}

// ============================================================ COMBAT: SLOTS & MELEE
function setSlot(slot) {
  if(!G||G.over||!G.waveActive||G.activeSlot===slot) return;
  G.activeSlot=slot; G.reloading=0; G.fired=false; SFX.swap(slot==='melee');
  updateHUD();
}
function equipFirearm(w) { if(!WEAPONS[w].unlocked) return; G.weapon=w; G.reloading=0; }
function equipMelee(m)   { if(!MELEE[m].unlocked)   return; G.melee=m; }

function reload() {
  const wp=WEAPONS[G.weapon];
  if(wp.mag===Infinity||G.reloading>0||G.ammo[G.weapon]>=wp.mag) return;
  G.reloading=wp.reload; SFX.reload(); updateHUD();
}

function doDodge() {
  if(G.player.dodgeCD>0) return;
  let mx=(G.keys.right?1:0)-(G.keys.left?1:0), my=(G.keys.down?1:0)-(G.keys.up?1:0);
  if(Tctrl.moveActive){ mx=Tctrl.moveX; my=Tctrl.moveY; }
  if(Math.abs(mx)<0.05&&Math.abs(my)<0.05){ mx=Math.cos(G.player.ang); my=Math.sin(G.player.ang); }
  const l=Math.hypot(mx,my)||1; G.player.dx=mx/l*14; G.player.dy=my/l*14;
  G.player.dodge=10; G.player.dodgeCD=900; G.player.inv=Math.max(G.player.inv,260); SFX.dodge();
}

function meleeAttack() {
  if(!G||G.over||!G.waveActive) return;
  const p=G.player; if(p.meleeCD>0) return;
  const mw=MELEE[G.melee];
  p.meleeCD=mw.cd; p.swing=1; SFX.melee();
  const reach=mw.range, half=mw.arc/2; let hit=false;
  for(const z of G.zombies){
    const dx=z.x-p.x, dy=z.y-p.y, d2=dx*dx+dy*dy, rr2=reach+z.r;
    if(d2>rr2*rr2) continue;
    let da=Math.atan2(dy,dx)-p.ang; da=Math.atan2(Math.sin(da),Math.cos(da));
    if(Math.abs(da)>half) continue;
    z.hp-=mw.dmg*G.mult.dmg; z.hitFlash=6; hit=true;
    const d=Math.sqrt(d2)||1; z.x+=dx/d*mw.knock; z.y+=dy/d*mw.knock;
    spawnBlood((p.x+z.x)/2,(p.y+z.y)/2,dx,dy,5);
  }
  if(hit){ SFX.hit(); G.shake=Math.min(G.shake+5,14); }
}

// ============================================================ COMBAT: SHOOTING
function fireActive(semiGate) {
  if(G.activeSlot==='melee'){ meleeAttack(); return; }
  const wp=WEAPONS[G.weapon];
  if(!semiGate || wp.auto || !G.fired){ shoot(); G.fired=true; }
}

function shoot() {
  const wp=WEAPONS[G.weapon], now=performance.now();
  if(G.reloading>0) return;
  if(now-G.lastShot < wp.rate*G.mult.fireRate) return;
  if(wp.mag!==Infinity && G.ammo[G.weapon]<=0){ reload(); return; }
  G.lastShot=now;
  for(let i=0;i<wp.pellets;i++){
    const a=G.player.ang+rand(-wp.spread,wp.spread);
    G.bullets.push({ x:G.player.x+Math.cos(a)*20, y:G.player.y+Math.sin(a)*20, vx:Math.cos(a)*wp.speed, vy:Math.sin(a)*wp.speed, dmg:wp.dmg*G.mult.dmg, life:60, color:wp.color, pierce:wp.pierce||0, hit:wp.pierce?new Set():null });
  }
  if(wp.mag!==Infinity) G.ammo[G.weapon]--;
  G.shake=Math.min(G.shake+(wp.pellets>3?7:3),14);
  G.muzzle=wp.pellets>3?7:5; G.player.recoil=wp.pellets>3?7:4;
  const a=G.player.ang, mx=G.player.x+Math.cos(a)*26, my=G.player.y+Math.sin(a)*26;
  const sa=a+Math.PI/2*(Math.random()<.5?1:-1);
  G.casings.push({x:mx,y:my,vx:Math.cos(sa)*rand(1.5,3.5)-Math.cos(a),vy:Math.sin(sa)*rand(1.5,3.5)-Math.sin(a),life:70,rot:rand(0,TAU),vr:rand(-.4,.4)});
  for(let i=0;i<2;i++) G.smoke.push({x:mx,y:my,vx:Math.cos(a)*rand(.3,1)+rand(-.3,.3),vy:Math.sin(a)*rand(.3,1)+rand(-.3,.3),life:rand(18,34),r:rand(3,7)});
  wp.sfx();
  if(wp.mag!==Infinity && G.ammo[G.weapon]<=0) reload();
  updateHUD();
}

// ============================================================ GRENADES
function selectGrenade(t) { if(!G||!GRENADES[t]) return; G.grenade=t; updateHUD(); }

function cycleGrenade() {
  if(!G) return;
  const owned=GORDER.filter(t=>G.grenades[t]>0);
  const list=owned.length?owned:GORDER;
  const i=list.indexOf(G.grenade);
  G.grenade=list[(i+1)%list.length]; SFX.click(); updateHUD();
}

function throwGrenade() {
  if(!G||G.over||!G.waveActive||paused) return;
  if(G.nadeCD>0) return;
  const t=G.grenade, def=GRENADES[t];
  if(!def || G.grenades[t]<=0){ SFX.error(); return; }
  G.grenades[t]--; G.nadeCD=520;
  const p=G.player, a=p.ang, spd=9.5;
  G.nades.push({x:p.x+Math.cos(a)*22,y:p.y+Math.sin(a)*22,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,fuse:48,type:t,rot:rand(0,TAU),vr:rand(-.4,.4)});
  SFX.nadeThrow(); updateHUD();
}

function detonateNade(n) {
  const def=GRENADES[n.type]; (SFX[def.sfx]||SFX.boom)();
  if(def.mode==='burst'){
    G.shake=Math.min(G.shake+16,18);
    G.fx.push({x:n.x,y:n.y,life:20,max:20,r:def.radius,type:n.type});
    for(const z of G.zombies){
      const dx=z.x-n.x, dy=z.y-n.y, d=Math.hypot(dx,dy);
      if(d<def.radius+z.r){ const f=1-clamp((d-z.r)/def.radius,0,1);
        z.hp-=def.dmg*G.mult.dmg*f; z.hitFlash=6;
        const dd=d||1; z.x+=dx/dd*def.knock*f; z.y+=dy/dd*def.knock*f;
        spawnBlood(z.x,z.y,dx,dy,5); }
    }
    for(let i=0;i<28;i++){ const a=rand(0,TAU),s=rand(3,10); G.parts.push({x:n.x,y:n.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(16,34),r:rand(2,5),c:i%3?'#ffb347':'#ffe27a'}); }
    for(let i=0;i<10;i++) G.smoke.push({x:n.x+rand(-10,10),y:n.y+rand(-10,10),vx:rand(-1,1),vy:rand(-1,1),life:rand(34,64),r:rand(7,14)});
  } else {
    G.shake=Math.min(G.shake+8,18);
    G.fx.push({x:n.x,y:n.y,life:14,max:14,r:def.radius*0.7,type:n.type});
    G.fields.push({x:n.x,y:n.y,r:def.radius,type:n.type,life:def.duration,tick:0});
  }
}

// ============================================================ ZOMBIES
function zombieType(wave) {
  const r=Math.random();
  if(wave>=5 && r<Math.min(0.05+(wave-5)*0.012,0.16)) return 'tank';
  if(wave>=7 && r<0.22) return 'spitter';
  if(wave>=3 && Math.random()<Math.min(0.18+(wave-3)*0.03,0.42)) return 'dog';
  if(wave>=3 && r<Math.min(0.14+(wave-3)*0.035,0.45)) return 'runner';
  return 'walker';
}

function placeAtEdge(o) {
  const m=40, edge=(Math.random()*4)|0;
  if(edge===0){o.x=rand(-m,VW+m);o.y=-m;}
  else if(edge===1){o.x=VW+m;o.y=rand(-m,VH+m);}
  else if(edge===2){o.x=rand(-m,VW+m);o.y=VH+m;}
  else{o.x=-m;o.y=rand(-m,VH+m);}
}

function spawnZombie(wave) {
  const t=zombieType(wave), base=ZT[t];
  const hpScale=1+(wave-1)*0.12, spScale=1+Math.min((wave-1)*0.025,0.5);
  const pos={}; placeAtEdge(pos);
  G.zombies.push({
    x:pos.x,y:pos.y,type:t,hp:base.hp*hpScale,maxhp:base.hp*hpScale,
    speed:base.speed*spScale*rand(.85,1.1),r:base.r,dmg:base.dmg,color:base.color,
    coin:base.coin,points:base.points,ranged:base.ranged,
    ang:0,wob:rand(0,TAU),hitFlash:0,atk:0,slow:0,
    legPhase:rand(0,TAU),limp:rand(.6,1),tilt:rand(-.12,.12),seed:rand(0,100),
  });
}

function killZombie(z) {
  if(z.boss){ killBoss(z); return; }
  G.kills++; G.waveKilled++; G.alive--; SFX.zdeath(); G.shake=Math.min(G.shake+4,14);
  spawnBlood(z.x,z.y,0,0,18+z.r);
  G.pools.push({x:z.x,y:z.y,r:z.r*rand(1.3,1.8),c:'#5e0d0d',a:.5});
  for(let i=0;i<4;i++){ const a=rand(0,TAU),s=rand(2,5); G.parts.push({x:z.x,y:z.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(16,30),r:rand(2,4),c:i%2?z.color:'#7a1212'}); }
  for(let i=0;i<z.coin;i++) G.coins.push({x:z.x+rand(-12,12),y:z.y+rand(-12,12),val:Math.ceil((Math.random()<.2?2:1)*G.mult.coin),life:600});
  const r=Math.random(), tankBonus=z.type==='tank'?0.18:0;
  if(r<0.08+tankBonus)      G.drops.push({x:z.x+rand(-8,8),y:z.y+rand(-8,8),type:'health',life:720});
  else if(r<0.22+tankBonus) G.drops.push({x:z.x+rand(-8,8),y:z.y+rand(-8,8),type:'ammo',life:720});
  pop(z.x,z.y,'+'+z.points*10,'#bfff'); updateHUD();
}

function collectDrop(d) {
  const p=G.player;
  if(d.type==='health'){
    const heal=Math.min(25,p.maxhp-p.hp); p.hp=Math.min(p.maxhp,p.hp+25);
    SFX.heal(); pop(d.x,d.y,'+'+Math.max(1,Math.round(heal))+' HP','#5cff6a');
  } else {
    for(const k in WEAPONS) if(WEAPONS[k].mag!==Infinity) G.ammo[k]=WEAPONS[k].mag;
    G.reloading=0; SFX.ammo(); pop(d.x,d.y,'MUNICIÓN','#9fd6ff');
  }
  updateHUD();
}

function spawnBlood(x, y, vx, vy, n) {
  for(let i=0;i<n;i++){ const a=Math.atan2(vy,vx)+rand(-1,1), s=rand(1,5);
    G.blood.push({x,y,vx:Math.cos(a)*s+rand(-1,1),vy:Math.sin(a)*s+rand(-1,1),life:rand(20,45),r:rand(2,5),c:Math.random()<.5?'#8a1414':'#b81d1d'}); }
}

function pop(x, y, txt, c) { G.pops.push({x,y,txt,c,life:50}); }

// ============================================================ BOSSES
function bossForWave(wave) { return BOSSES[(Math.floor(wave/5)-1)%BOSSES.length]; }

function spawnBoss(wave) {
  const b=bossForWave(wave), hpScale=1+Math.max(0,(wave-5))*0.18;
  const pos={}; placeAtEdge(pos);
  G.zombies.push({
    x:pos.x,y:pos.y, boss:true, bossType:b.key, bossDef:b, name:b.name,
    hp:b.hp*hpScale, maxhp:b.hp*hpScale, r:b.r, speed:b.speed, dmg:b.dmg,
    color:b.color, accent:b.accent, coin:b.coin, points:b.points,
    ang:0, wob:rand(0,TAU), hitFlash:0, slow:0, atk:0,
    legPhase:rand(0,TAU), seed:rand(0,100),
    phase:'idle', phaseT:0, atkCD:2600, alt:false,
  });
  return b;
}

function summonMinion(x, y) {
  const t=Math.random()<.5?'runner':'walker', base=ZT[t];
  const hpScale=1+(G.wave-1)*0.12, spScale=1+Math.min((G.wave-1)*0.025,0.5);
  G.zombies.push({
    x,y,type:t,hp:base.hp*hpScale,maxhp:base.hp*hpScale,
    speed:base.speed*spScale*rand(.85,1.1),r:base.r,dmg:base.dmg,color:base.color,
    coin:base.coin,points:base.points,ranged:base.ranged,
    ang:0,wob:rand(0,TAU),hitFlash:0,atk:0,slow:0,
    legPhase:rand(0,TAU),limp:rand(.6,1),tilt:rand(-.12,.12),seed:rand(0,100),
  });
  G.waveTotal++;
}

function updateBoss(z, dt) {
  const p=G.player, ms=dt*16.67;
  const a=Math.atan2(p.y-z.y,p.x-z.x); z.ang=a;
  z.wob+=dt*0.15; z.legPhase+=dt*z.speed*0.5;
  if(z.atk>0) z.atk-=ms;
  if(dist2(z.x,z.y,p.x,p.y)<(z.r+p.r)**2 && p.inv<=0){
    p.hp-=z.dmg; p.inv=800; G.shake=14; SFX.hurt();
    spawnBlood(p.x,p.y,Math.cos(a),Math.sin(a),10);
    if(p.hp<=0){ gameOver(); return; }
    updateHUD();
  }
  if(z.bossType==='brute')       bossBrute(z,a,dt,ms);
  else if(z.bossType==='plague') bossPlague(z,a,dt,ms);
  else                           bossNecro(z,a,dt,ms);
  z.x=clamp(z.x,z.r,VW-z.r); z.y=clamp(z.y,z.r,VH-z.r);
}

function bossBrute(z, a, dt, ms) {
  const p=G.player;
  switch(z.phase){
    case 'windup':
      z.phaseT-=ms;
      if(z.phaseT<=0){ z.cdir=Math.atan2(p.y-z.y,p.x-z.x); z.cspd=z.speed*7; z.phase='charge'; z.phaseT=560; SFX.bossRoar(); }
      break;
    case 'charge':
      z.x+=Math.cos(z.cdir)*z.cspd*dt; z.y+=Math.sin(z.cdir)*z.cspd*dt;
      if(Math.random()<.6) G.smoke.push({x:z.x+rand(-10,10),y:z.y+rand(-10,10),vx:0,vy:0,life:rand(10,20),r:rand(4,8)});
      z.phaseT-=ms;
      if(z.phaseT<=0){ bruteSlam(z); z.phase='rest'; z.phaseT=1100; }
      break;
    case 'rest':
      z.phaseT-=ms;
      if(z.phaseT<=0){ z.phase='idle'; z.atkCD=3400; }
      break;
    default:{
      const wob=Math.sin(z.wob)*0.22;
      z.x+=Math.cos(a+wob)*z.speed*dt; z.y+=Math.sin(a+wob)*z.speed*dt;
      z.atkCD-=ms;
      if(z.atkCD<=0){ z.phase='windup'; z.phaseT=620; }
    }
  }
}

function bruteSlam(z) {
  const R=170; G.shake=Math.min(G.shake+20,24);
  G.fx.push({x:z.x,y:z.y,life:24,max:24,r:R,type:'slam'});
  SFX.bossSlam();
  const p=G.player, d=Math.hypot(p.x-z.x,p.y-z.y);
  if(d<R+p.r && p.inv<=0){
    const f=1-clamp(d/R,0,1);
    p.hp-=z.dmg*(0.5+0.6*f); p.inv=800;
    const a=Math.atan2(p.y-z.y,p.x-z.x); p.x+=Math.cos(a)*46*f; p.y+=Math.sin(a)*46*f;
    spawnBlood(p.x,p.y,Math.cos(a),Math.sin(a),10);
    if(p.hp<=0){ gameOver(); return; }
    updateHUD();
  }
  for(let i=0;i<22;i++){ const a=rand(0,TAU),s=rand(3,9); G.parts.push({x:z.x,y:z.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(16,32),r:rand(2,5),c:i%2?'#caa066':'#6a5a3a'}); }
}

function bossPlague(z, a, dt, ms) {
  const p=G.player, d=Math.hypot(p.x-z.x,p.y-z.y);
  const want=d>330?1:d<210?-0.55:0, wob=Math.sin(z.wob)*0.3;
  z.x+=Math.cos(a+wob)*z.speed*want*dt; z.y+=Math.sin(a+wob)*z.speed*want*dt;
  z.atkCD-=ms;
  if(z.atkCD<=0){ z.atkCD=2100; SFX.bossSpit();
    const n=4;
    for(let i=0;i<n;i++){ const ang=a+(i-(n-1)/2)*0.2,sp=5.6; G.eprojs.push({x:z.x+Math.cos(a)*z.r,y:z.y+Math.sin(a)*z.r,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:90,r:9,dmg:z.dmg,type:'toxic'}); }
  }
}

function bossNecro(z, a, dt, ms) {
  const p=G.player, d=Math.hypot(p.x-z.x,p.y-z.y);
  const want=d>380?1:d<250?-0.6:0, wob=Math.sin(z.wob)*0.3;
  z.x+=Math.cos(a+wob)*z.speed*want*dt; z.y+=Math.sin(a+wob)*z.speed*want*dt;
  z.atkCD-=ms;
  if(z.atkCD<=0){
    z.alt=!z.alt;
    if(z.alt){ z.atkCD=4400; SFX.bossSummon();
      const count=2+Math.min(3,Math.floor(G.wave/10));
      for(let i=0;i<count;i++){ const ang=rand(0,TAU),dd=z.r+34; summonMinion(z.x+Math.cos(ang)*dd,z.y+Math.sin(ang)*dd); }
      G.fx.push({x:z.x,y:z.y,life:20,max:20,r:100,type:'necro'});
    } else { z.atkCD=2900; SFX.bossSpit();
      const n=10;
      for(let i=0;i<n;i++){ const ang=i/n*TAU+rand(-.05,.05),sp=4.4; G.eprojs.push({x:z.x+Math.cos(ang)*z.r,y:z.y+Math.sin(ang)*z.r,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:100,r:8,dmg:z.dmg*0.8,type:'dark'}); }
    }
  }
}

function killBoss(z) {
  G.kills++; SFX.bossSlam(); G.shake=24;
  for(let k=0;k<3;k++) G.fx.push({x:z.x+rand(-30,30),y:z.y+rand(-30,30),life:26,max:26,r:96, type:z.bossType==='plague'?'toxic':z.bossType==='necro'?'necro':'slam'});
  G.pools.push({x:z.x,y:z.y,r:z.r*1.4,c:'#5e0d0d',a:.55});
  for(let i=0;i<44;i++){ const a=rand(0,TAU),s=rand(3,10); G.parts.push({x:z.x,y:z.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(20,48),r:rand(2,6),c:i%2?z.color:'#7a1212'}); }
  spawnBlood(z.x,z.y,0,0,40);
  for(let i=0;i<z.coin;i++) G.coins.push({x:z.x+rand(-40,40),y:z.y+rand(-40,40),val:Math.ceil((Math.random()<.3?2:1)*G.mult.coin),life:900});
  G.drops.push({x:z.x+rand(-16,16),y:z.y+rand(-16,16),type:'health',life:1200});
  G.drops.push({x:z.x+rand(-16,16),y:z.y+rand(-16,16),type:'ammo',life:1200});
  pop(z.x,z.y,'¡JEFE ABATIDO!','#ffcf33');
  showMsg('☠ '+z.name+' ABATIDO');
  updateHUD();
}

// ============================================================ ZONE TRANSITIONS
function changeZone(dx, dy) {
  const p=G.player;
  G.zone.cx+=dx; G.zone.cy+=dy;
  groundSeed=zoneSeed(G.zone.cx,G.zone.cy); prerenderGround();
  if(dx>0)p.x=p.r+8; else if(dx<0)p.x=VW-p.r-8;
  if(dy>0)p.y=p.r+8; else if(dy<0)p.y=VH-p.r-8;
  for(const z of G.zombies) placeAtEdge(z);
  G.bullets.length=0; G.casings.length=0; G.smoke.length=0; G.blood.length=0; G.parts.length=0; G.pools.length=0;
  G.nades.length=0; G.fields.length=0; G.fx.length=0; G.eprojs.length=0;
  for(const c of G.coins){ c.x=p.x+rand(-50,50); c.y=p.y+rand(-50,50); c.life=Math.max(c.life,300); }
  for(const d of G.drops){ d.x=p.x+rand(-60,60); d.y=p.y+rand(-60,60); d.life=Math.max(d.life,360); }
  G.shake=Math.max(G.shake,5);
  showMsg('ZONA '+(G.zone.cx+1)+'·'+(G.zone.cy+1));
}

function handleEdges() {
  const p=G.player; let moved=false;
  if(p.x<p.r){ if(G.zone.cx>0){changeZone(-1,0);moved=true;} else p.x=p.r; }
  else if(p.x>VW-p.r){ if(G.zone.cx<GW-1){changeZone(1,0);moved=true;} else p.x=VW-p.r; }
  if(!moved){
    if(p.y<p.r){ if(G.zone.cy>0)changeZone(0,-1); else p.y=p.r; }
    else if(p.y>VH-p.r){ if(G.zone.cy<GH-1)changeZone(0,1); else p.y=VH-p.r; }
  }
}

// ============================================================ WAVES
function startWave() {
  G.wave++;
  G.spawnQueue=Math.floor(4+G.wave*2.2+Math.pow(G.wave,1.5)*0.3);
  G.spawnTimer=0; G.waveActive=true; G.alive=G.spawnQueue;
  G.waveTotal=G.spawnQueue; G.waveKilled=0;
  if(G.wave%5===0){ const b=spawnBoss(G.wave); showMsg('⚠ OLEADA '+G.wave+' · '+b.name); SFX.bossRoar(); }
  else { showMsg('OLEADA '+G.wave); SFX.wave(); }
  updateHUD();
}

function endWave() {
  G.waveActive=false; SFX.wave(); openShop();
}

// ============================================================ PAUSE
function pauseGame() {
  if(!G||G.over||!G.waveActive||paused) return;
  paused=true; G.keys={}; G.mouse.down=false;
  resetTctrl(); showTouch(false); show('pause'); SFX.open();
}
function resumeGame() {
  if(!paused) return;
  paused=false; show(null); showTouch(true); resetTctrl(); last=performance.now(); SFX.back();
}
function togglePause() {
  if(!G||G.over) return;
  const onPause=!document.getElementById('pause').classList.contains('hidden');
  const onSub=paused && (!document.getElementById('shopScreen').classList.contains('hidden')
                       || !document.getElementById('settings').classList.contains('hidden'));
  if(onPause) resumeGame();
  else if(onSub) show('pause');
  else pauseGame();
}

// ============================================================ MAIN LOOP
let last = performance.now();
let _fpsAcc=0, _fpsN=0, _lastAdjust=0;

function adaptRes(now) {
  _lastAdjust=now; const avg=_fpsAcc/_fpsN; _fpsAcc=0; _fpsN=0;
  let ns=RSCALE;
  if(avg>20 && RSCALE>RS_MIN)      ns=Math.max(RS_MIN,Math.round((RSCALE-0.1)*100)/100);
  else if(avg<13 && RSCALE<RS_MAX) ns=Math.min(RS_MAX,Math.round((RSCALE+0.1)*100)/100);
  if(ns!==RSCALE){ RSCALE=ns; applyScale(); }
}

function loop(now) {
  const frameMs=now-last; const dt=Math.min(2,frameMs/16.67); last=now;
  if(G && !G.over && G.waveActive && !paused){
    _fpsAcc+=Math.min(frameMs,100); _fpsN++;
    if(now-_lastAdjust>900 && _fpsN>=15) adaptRes(now);
  } else { _fpsAcc=0; _fpsN=0; _lastAdjust=now; }
  if(G && !G.over && G.waveActive && !paused) update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  const p=G.player; G.time+=dt;
  // aim
  if(Tctrl.aimActive) p.ang=Math.atan2(Tctrl.aimY,Tctrl.aimX);
  else if(!isTouch)   p.ang=Math.atan2(G.mouse.y-p.y,G.mouse.x-p.x);
  // movement
  p.moving=false;
  if(p.dodge>0){ p.x+=p.dx*dt; p.y+=p.dy*dt; p.vx=p.dx; p.vy=p.dy; p.dodge-=dt; p.moving=true; p.legPhase+=dt*0.9; }
  else {
    let mx, my;
    if(Tctrl.moveActive){ mx=Tctrl.moveX; my=Tctrl.moveY; }
    else { mx=(G.keys.right?1:0)-(G.keys.left?1:0); my=(G.keys.down?1:0)-(G.keys.up?1:0); }
    let l=Math.hypot(mx,my); if(l>1){mx/=l;my/=l;l=1;}
    let tvx=0,tvy=0;
    if(l>DEAD){ const m=(l-DEAD)/(1-DEAD); tvx=(mx/l)*p.speed*m; tvy=(my/l)*p.speed*m; }
    const k=clamp(0.35*dt,0,1);
    p.vx+=(tvx-p.vx)*k; p.vy+=(tvy-p.vy)*k;
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(Math.hypot(p.vx,p.vy)>0.12){ p.moving=true; p.legPhase+=dt*0.45; }
  }
  handleEdges();
  if(p.recoil>0)p.recoil-=dt; if(G.muzzle>0)G.muzzle-=dt;
  if(p.inv>0)p.inv-=dt*16.67; if(p.dodgeCD>0)p.dodgeCD-=dt*16.67;
  if(p.meleeCD>0)p.meleeCD-=dt*16.67; if(p.swing>0){p.swing-=dt*0.12;if(p.swing<0)p.swing=0;}
  if(G.nadeCD>0)G.nadeCD-=dt*16.67;
  // attack
  if(Tctrl.aimActive && Tctrl.aimFire) fireActive(false);
  else if(G.mouse.down)                fireActive(true);
  else G.fired=false;
  // reload
  if(G.reloading>0){ G.reloading-=dt*16.67; if(G.reloading<=0){ G.reloading=0; G.ammo[G.weapon]=WEAPONS[G.weapon].mag; SFX.reload(); updateHUD(); } }
  tickReloadHUD();
  // spawn
  if(G.spawnQueue>0){ G.spawnTimer-=dt*16.67; if(G.spawnTimer<=0){ spawnZombie(G.wave); G.spawnQueue--; G.spawnTimer=Math.max(240,900-G.wave*26); } }
  // bullets
  for(let i=G.bullets.length-1;i>=0;i--){
    const b=G.bullets[i]; b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    if(b.life<=0||b.x<-30||b.x>VW+30||b.y<-30||b.y>VH+30){ G.bullets.splice(i,1); continue; }
    for(const z of G.zombies){
      if(b.hit&&b.hit.has(z)) continue;
      if(dist2(b.x,b.y,z.x,z.y)<(z.r+4)**2){
        z.hp-=b.dmg; z.hitFlash=6; if(b.hit)b.hit.add(z); SFX.hit();
        spawnBlood(b.x,b.y,b.vx,b.vy,4);
        if(b.pierce>0){b.pierce--;} else{G.bullets.splice(i,1);}
        break;
      }
    }
  }
  // grenades in flight
  for(let i=G.nades.length-1;i>=0;i--){
    const n=G.nades[i]; n.x+=n.vx*dt; n.y+=n.vy*dt; n.vx*=0.93; n.vy*=0.93; n.rot+=n.vr*dt; n.fuse-=dt;
    if(Math.random()<0.4) G.smoke.push({x:n.x,y:n.y,vx:0,vy:0,life:rand(8,18),r:rand(2,4)});
    if(n.fuse<=0){ detonateNade(n); G.nades.splice(i,1); }
  }
  // persistent fields
  for(let i=G.fields.length-1;i>=0;i--){
    const f=G.fields[i], def=GRENADES[f.type];
    f.life-=dt*16.67; f.tick-=dt*16.67;
    if(f.tick<=0){ f.tick=def.tickEvery;
      if(f.hostile){
        if(dist2(p.x,p.y,f.x,f.y)<(f.r+p.r)**2){ p.hp-=(f.tickDmg!=null?f.tickDmg:def.tickDmg); G.shake=Math.max(G.shake,4); if(p.hp<=0){gameOver();return;} updateHUD(); }
      } else {
        for(const z of G.zombies){ if(dist2(z.x,z.y,f.x,f.y)<(f.r+z.r)**2){ z.hp-=def.tickDmg*G.mult.dmg; z.hitFlash=4; if(def.slow)z.slow=Math.max(z.slow,def.slow); } }
      }
    }
    if(f.life<=0) G.fields.splice(i,1);
  }
  // enemy projectiles
  for(let i=G.eprojs.length-1;i>=0;i--){
    const e=G.eprojs[i]; e.x+=e.vx*dt; e.y+=e.vy*dt; e.life-=dt; let gone=false;
    if(dist2(e.x,e.y,p.x,p.y)<(e.r+p.r)**2){
      if(p.inv<=0){ p.hp-=e.dmg; p.inv=600; G.shake=10; SFX.hurt(); spawnBlood(p.x,p.y,e.vx,e.vy,6); if(p.hp<=0){gameOver();return;} updateHUD(); }
      gone=true;
    }
    if(e.life<=0||e.x<-30||e.x>VW+30||e.y<-30||e.y>VH+30) gone=true;
    if(gone){
      if(e.type==='toxic'){ G.fields.push({x:e.x,y:e.y,r:48,type:'toxic',life:1700,tick:0,hostile:true,tickDmg:7}); G.fx.push({x:e.x,y:e.y,life:12,max:12,r:48,type:'toxic'}); }
      else { G.fx.push({x:e.x,y:e.y,life:10,max:10,r:26,type:'necro'}); }
      G.eprojs.splice(i,1);
    }
  }
  // explosion flashes
  for(let i=G.fx.length-1;i>=0;i--){ const e=G.fx[i]; e.life-=dt; if(e.life<=0)G.fx.splice(i,1); }
  // zombies
  for(let i=G.zombies.length-1;i>=0;i--){
    const z=G.zombies[i];
    if(z.hitFlash>0)z.hitFlash-=dt; if(z.slow>0)z.slow-=dt*16.67;
    if(z.hp<=0){ killZombie(z); G.zombies.splice(i,1); continue; }
    if(z.boss){ updateBoss(z,dt); if(G.over)return; continue; }
    const a=Math.atan2(p.y-z.y,p.x-z.x); z.ang=a; z.wob+=dt*0.2;
    const sp=z.speed*(z.slow>0?0.42:1);
    z.x+=Math.cos(a+Math.sin(z.wob)*0.35)*sp*dt; z.y+=Math.sin(a+Math.sin(z.wob)*0.35)*sp*dt;
    z.legPhase+=dt*z.speed*0.5;
    for(const o of G.zombies){ if(o===z)continue; const d2=dist2(z.x,z.y,o.x,o.y),mr=z.r+o.r; if(d2<mr*mr&&d2>0){const d=Math.sqrt(d2),push=(mr-d)/d*0.5;z.x+=(z.x-o.x)*push*0.1;z.y+=(z.y-o.y)*push*0.1;} }
    if(z.atk>0)z.atk-=dt*16.67;
    if(dist2(z.x,z.y,p.x,p.y)<(z.r+p.r)**2 && p.inv<=0){
      p.hp-=z.dmg; p.inv=700; G.shake=12; SFX.hurt();
      spawnBlood(p.x,p.y,Math.cos(a),Math.sin(a),8);
      if(p.hp<=0){ gameOver(); return; }
      updateHUD();
    }
  }
  // coins
  for(let i=G.coins.length-1;i>=0;i--){
    const c=G.coins[i]; c.life-=dt;
    const d2=dist2(c.x,c.y,p.x,p.y);
    if(d2<140*140){ const d=Math.sqrt(d2)||1; c.x+=(p.x-c.x)/d*5*dt; c.y+=(p.y-c.y)/d*5*dt; }
    if(d2<(p.r+8)**2){ G.coinCount+=c.val; G.coinsTotal+=c.val; G.coins.splice(i,1); SFX.coin(); pop(c.x,c.y,'+'+c.val,'#ffcf33'); updateHUD(); continue; }
    if(c.life<=0)G.coins.splice(i,1);
  }
  // drops
  for(let i=G.drops.length-1;i>=0;i--){
    const d=G.drops[i]; d.life-=dt;
    const dd2=dist2(d.x,d.y,p.x,p.y);
    if(dd2<130*130){ const dd=Math.sqrt(dd2)||1; d.x+=(p.x-d.x)/dd*4.2*dt; d.y+=(p.y-d.y)/dd*4.2*dt; }
    if(dd2<(p.r+10)**2){ collectDrop(d); G.drops.splice(i,1); continue; }
    if(d.life<=0)G.drops.splice(i,1);
  }
  // particles
  for(let i=G.parts.length-1;i>=0;i--){ const q=G.parts[i]; q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=0.92;q.vy*=0.92;q.life-=dt; if(q.life<=0)G.parts.splice(i,1); }
  for(let i=G.blood.length-1;i>=0;i--){ const q=G.blood[i]; q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=0.86;q.vy*=0.86;q.life-=dt;
    if(q.life<=0){ if(G.pools.length<260) G.pools.push({x:q.x,y:q.y,r:q.r*rand(.8,1.4),c:q.c,a:rand(.25,.5)}); G.blood.splice(i,1); } }
  for(let i=G.casings.length-1;i>=0;i--){ const q=G.casings[i]; q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=0.9;q.vy*=0.9;q.rot+=q.vr*dt;q.life-=dt; if(q.life<=0)G.casings.splice(i,1); }
  for(let i=G.smoke.length-1;i>=0;i--){ const q=G.smoke[i]; q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=0.94;q.vy*=0.94;q.r+=dt*0.5;q.life-=dt; if(q.life<=0)G.smoke.splice(i,1); }
  for(let i=G.pops.length-1;i>=0;i--){ const q=G.pops[i]; q.y-=0.6*dt;q.life-=dt; if(q.life<=0)G.pops.splice(i,1); }
  if(G.pools.length>260) G.pools.splice(0,G.pools.length-260);
  if(G.shake>0) G.shake-=dt*0.8;
  // wave end
  if(G.spawnQueue<=0 && G.zombies.length===0) endWave();
}

// ============================================================ FLOW
function startGame() {
  actx(); newGame(); paused=false; resetTctrl();
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('weaponHUD').classList.remove('hidden');
  show(null); showTouch(true); startWave(); updateHUD();
}

function gameOver() {
  G.over=true; paused=false; SFX.over(); resetTctrl(); showTouch(false);
  const best=Math.max(+(localStorage.getItem('zsurv_best')||0),G.wave);
  localStorage.setItem('zsurv_best',best);
  document.getElementById('overStats').textContent=`Oleada ${G.wave} · ${G.kills} zombis · ${G.coinsTotal} oro`;
  document.getElementById('overBest').textContent='🏆 Mejor oleada: '+best;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('weaponHUD').classList.add('hidden');
  show('over');
}

// ============================================================ BUTTON HANDLERS & INIT
document.getElementById('playBtn').onclick    = () => { SFX.start(); startGame(); };
document.getElementById('retryBtn').onclick   = () => { SFX.start(); startGame(); };
document.getElementById('shopBtn').onclick    = () => { SFX.open(); openShopFromMenu(); };
document.getElementById('settingsBtn').onclick= () => openSettings('start');
document.getElementById('pauseShop').onclick  = () => { SFX.open(); openShopFromPause(); };
document.getElementById('pauseSettings').onclick = () => openSettings('pause');
document.getElementById('pauseResume').onclick   = () => resumeGame();

wireSFX();          // connect SFX functions into WEAPONS
buildSprites();     // pre-render player & zombie sprites
buildGlows();       // pre-render glow/coin/HUD textures
resize();           // initial canvas size + ground render
setupSettings();    // bind settings toggle buttons
requestAnimationFrame(loop);
