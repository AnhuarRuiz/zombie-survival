"use strict";
// ============================================================ DRAW HELPERS
function capsule(x1, y1, x2, y2, w, col) {
  ctx.strokeStyle=col; ctx.lineWidth=w; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
}
function limb(sx, sy, ex, ey, hx, hy, w, col) {
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=col; ctx.lineWidth=w;
  ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.lineTo(hx,hy); ctx.stroke();
}
function zArm(sx, sy, ex, ey, hx, hy, w, col, claw) {
  limb(sx,sy,ex,ey,hx,hy,w,col);
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(hx,hy,w*0.6,0,TAU); ctx.fill();
  ctx.lineWidth=1.5; ctx.strokeStyle=claw; ctx.lineCap='round';
  const base=Math.atan2(hy-ey,hx-ex);
  for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(hx+Math.cos(base+i*0.55)*5.5,hy+Math.sin(base+i*0.55)*5.5); ctx.stroke(); }
}

// ============================================================ MAIN RENDER
function render() {
  ctx.clearRect(0,0,W,H);
  ctx.save();
  const sh = (SETTINGS.shake && G && G.shake>0) ? G.shake : 0;
  if (sh) { ctx.translate(rand(-sh,sh),rand(-sh,sh)); }
  ctx.scale(VIEW, VIEW);
  ctx.drawImage(groundCv,0,0,VW,VH);

  if (G) {
    // blood pools
    for(const q of G.pools){ ctx.globalAlpha=q.a; ctx.fillStyle=q.c; ctx.beginPath(); ctx.ellipse(q.x,q.y,q.r,q.r*0.72,q.x*0.3,0,TAU); ctx.fill(); }
    ctx.globalAlpha=1;
    // fresh blood
    for(const q of G.blood){ ctx.globalAlpha=clamp(q.life/45,0,1); ctx.fillStyle=q.c; ctx.beginPath(); ctx.arc(q.x,q.y,q.r,0,TAU); ctx.fill(); }
    ctx.globalAlpha=1;
    // grenade fields
    for(const f of G.fields){ const def=GRENADES[f.type], fade=clamp(f.life/500,0,1); ctx.globalAlpha=0.16*fade; ctx.fillStyle=def.color; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,TAU); ctx.fill(); }
    ctx.globalAlpha=1;
    // shadows
    ctx.fillStyle='rgba(0,0,0,0.30)';
    for(const z of G.zombies){ ctx.beginPath(); ctx.ellipse(z.x,z.y+z.r*0.55,z.r*1.05,z.r*0.5,0,0,TAU); ctx.fill(); }
    { const p=G.player; ctx.beginPath(); ctx.ellipse(p.x,p.y+p.r*0.55,p.r*1.05,p.r*0.5,0,0,TAU); ctx.fill(); }
    // casings
    for(const q of G.casings){ ctx.save(); ctx.globalAlpha=clamp(q.life/40,0,1); ctx.translate(q.x,q.y); ctx.rotate(q.rot); ctx.fillStyle='#d9b94a'; ctx.fillRect(-2.5,-1,5,2); ctx.restore(); }
    ctx.globalAlpha=1;
    // coins & drops
    for(const c of G.coins) drawCoin(c);
    for(const d of G.drops) drawDrop(d);
    // entities
    for(const z of G.zombies){ if(z.boss) drawBoss(z); else if(z.type==='dog') drawDog(z); else drawZombie(z); }
    // enemy projectiles
    for(const e of G.eprojs){
      const col=e.type==='toxic'?'#9be36b':'#c050ff';
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,TAU); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(e.x-e.r*0.3,e.y-e.r*0.3,e.r*0.4,0,TAU); ctx.fill();
    }
    // shockwave rings (brute slam)
    for(const e of G.fx){ if(e.type==='slam'){ const k=1-e.life/e.max; ctx.strokeStyle='rgba(255,180,90,'+(e.life/e.max*0.85)+')'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(e.x,e.y,e.r*k,0,TAU); ctx.stroke(); } }
    // bullet tracers
    ctx.lineCap='round'; ctx.lineWidth=3.2;
    for(const b of G.bullets){ ctx.strokeStyle=b.color; ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x-b.vx*1.1,b.y-b.vy*1.1); ctx.stroke(); }
    ctx.fillStyle='#fff';
    for(const b of G.bullets){ ctx.beginPath(); ctx.arc(b.x,b.y,1.8,0,TAU); ctx.fill(); }
    // thrown grenades
    for(const n of G.nades){
      ctx.save(); ctx.translate(n.x,n.y); ctx.rotate(n.rot);
      ctx.fillStyle='#2b2f26'; ctx.beginPath(); ctx.arc(0,0,5,0,TAU); ctx.fill();
      ctx.fillStyle='#161a14'; ctx.fillRect(-2,-7,4,3);
      ctx.fillStyle=GRENADES[n.type].color; ctx.fillRect(-3.5,-0.8,7,1.6);
      if(Math.floor(G.time*0.6)%2===0){ ctx.fillStyle='#ff5a5a'; ctx.beginPath(); ctx.arc(0,-6.5,1.5,0,TAU); ctx.fill(); }
      ctx.restore();
    }
    drawPlayer();
    // particles
    for(const q of G.parts){ ctx.globalAlpha=clamp(q.life/30,0,1); ctx.fillStyle=q.c; ctx.beginPath(); ctx.arc(q.x,q.y,q.r,0,TAU); ctx.fill(); }
    // smoke
    for(const q of G.smoke){ ctx.globalAlpha=clamp(q.life/34,0,1)*0.4; ctx.fillStyle='#cfcfcf'; ctx.beginPath(); ctx.arc(q.x,q.y,q.r,0,TAU); ctx.fill(); }
    ctx.globalAlpha=1;
  }
  ctx.restore();

  // ---- DYNAMIC LIGHTING ----
  if (G) {
    const p=G.player;
    lctx.setTransform(RSCALE*VIEW,0,0,RSCALE*VIEW,0,0);
    lctx.globalCompositeOperation='source-over';
    lctx.clearRect(0,0,VW,VH);
    lctx.fillStyle='rgba(6,8,13,0.84)'; lctx.fillRect(0,0,VW,VH);
    lctx.globalCompositeOperation='destination-out';
    glowAt(lctx,lightTex,p.x,p.y,160,0.85);
    const len=540, half=0.46;
    lctx.save(); lctx.beginPath(); lctx.moveTo(p.x,p.y); lctx.arc(p.x,p.y,len,p.ang-half,p.ang+half); lctx.closePath(); lctx.clip();
    glowAt(lctx,lightTex,p.x,p.y,len,0.95); lctx.restore();
    if(G.muzzle>0){ const mx=p.x+Math.cos(p.ang)*26, my=p.y+Math.sin(p.ang)*26; glowAt(lctx,lightTex,mx,my,120,1); }
    for(const b of G.bullets) glowAt(lctx,lightTex,b.x,b.y,34,0.8);
    for(const d of G.drops)   glowAt(lctx,lightTex,d.x,d.y,26,0.7);
    for(const f of G.fields)  glowAt(lctx,lightTex,f.x,f.y,f.r*0.85,0.55*clamp(f.life/500,0,1));
    for(const e of G.fx)      glowAt(lctx,lightTex,e.x,e.y,e.r*(0.6+0.5*(e.life/e.max)),0.95);
    for(const n of G.nades)   glowAt(lctx,lightTex,n.x,n.y,40,0.5);
    for(const e of G.eprojs)  glowAt(lctx,lightTex,e.x,e.y,32,0.7);
    lctx.globalAlpha=1; lctx.globalCompositeOperation='source-over';
    ctx.drawImage(lightCv,0,0,W,H);

    // additive glows
    ctx.save(); ctx.scale(VIEW,VIEW); ctx.globalCompositeOperation='lighter';
    if(G.muzzle>0){ const mx=p.x+Math.cos(p.ang)*26, my=p.y+Math.sin(p.ang)*26, k=G.muzzle/6; glowAt(ctx,muzzleGlow,mx,my,70*k,1); }
    for(const b of G.bullets) glowAt(ctx,bulletGlow[b.color]||lightTex,b.x,b.y,16,0.5);
    for(const c of G.coins)   glowAt(ctx,coinGlowTex,c.x,c.y,14,1);
    for(const d of G.drops)   glowAt(ctx,d.type==='health'?healthGlow:ammoGlow,d.x,d.y,16,1);
    for(const e of G.eprojs)  glowAt(ctx,e.type==='toxic'?fieldGlow.toxic:fieldGlow.necro,e.x,e.y,e.r*2.4,0.7);
    for(const f of G.fields){ const fade=clamp(f.life/500,0,1), tex=fieldGlow[f.type]||muzzleGlow, n=5;
      for(let k=0;k<n;k++){ const ang=G.time*0.12+k*TAU/n, rrr=f.r*0.5*(0.55+0.45*Math.sin(G.time*0.22+k*1.7)); glowAt(ctx,tex,f.x+Math.cos(ang)*rrr,f.y+Math.sin(ang)*rrr,f.r*0.5,0.35*fade); } }
    for(const e of G.fx){ const k=e.life/e.max; glowAt(ctx,fieldGlow[e.type]||muzzleGlow,e.x,e.y,e.r*(1.15-0.35*k),k); }
    ctx.globalAlpha=1; ctx.restore();
  }

  // popups
  if (G) {
    ctx.save(); if(sh) ctx.translate(rand(-sh,sh),rand(-sh,sh)); ctx.scale(VIEW,VIEW);
    ctx.textAlign='center'; ctx.font='bold 15px Segoe UI'; ctx.shadowColor='#000'; ctx.shadowBlur=4;
    for(const q of G.pops){ ctx.globalAlpha=clamp(q.life/50,0,1); ctx.fillStyle=q.c; ctx.fillText(q.txt,q.x,q.y); }
    ctx.shadowBlur=0;
    // zombie hp bars
    for(const z of G.zombies){ if(z.boss) continue; if(z.hp<z.maxhp){ const w=z.r*2; ctx.fillStyle='rgba(40,0,0,.8)'; ctx.fillRect(z.x-w/2,z.y-z.r-12,w,4); ctx.fillStyle=z.hp/z.maxhp>.4?'#3cdc3c':'#ff5050'; ctx.fillRect(z.x-w/2,z.y-z.r-12,w*clamp(z.hp/z.maxhp,0,1),4); } }
    ctx.restore(); ctx.globalAlpha=1;
  }

  // vignette + low-hp pulse
  ctx.fillStyle=vignetteGrad; ctx.fillRect(0,0,W,H);
  if(G && G.player.hp/G.player.maxhp<0.35){ ctx.fillStyle='rgba(180,0,0,'+(0.16+Math.sin(G.time*0.2)*0.06)+')'; ctx.fillRect(0,0,W,H); }

  // wave counter (top center)
  if (G && !G.over) {
    const cx=W/2, y0=Math.round(12*UISCALE);
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.shadowColor='rgba(0,0,0,0.75)'; ctx.shadowBlur=6;
    ctx.fillStyle='#7CFC00';
    ctx.font='800 '+Math.round(22*UISCALE)+'px "Segoe UI",system-ui,sans-serif';
    ctx.fillText('OLEADA '+G.wave, cx, y0);
    const done=G.waveKilled>=G.waveTotal;
    ctx.fillStyle=done?'#ffcf33':'#e8ffe8';
    ctx.font='800 '+Math.round(15*UISCALE)+'px "Segoe UI",system-ui,sans-serif';
    ctx.fillText('💀 '+G.waveKilled+' / '+G.waveTotal, cx, y0+Math.round(26*UISCALE));
    ctx.restore(); ctx.globalAlpha=1;
    // boss health bar
    const boss=G.zombies.find(z=>z.boss);
    if (boss) {
      const bw=Math.min(W*0.62,Math.round(440*UISCALE)), bh=Math.round(17*UISCALE);
      const bx=Math.round((W-bw)/2), by=y0+Math.round(58*UISCALE);
      const frac=clamp(boss.hp/boss.maxhp,0,1);
      ctx.save(); ctx.textAlign='center'; ctx.textBaseline='alphabetic';
      ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=6;
      ctx.fillStyle='#ff5a4f'; ctx.font='900 '+Math.round(15*UISCALE)+'px "Segoe UI",system-ui,sans-serif';
      ctx.fillText('☠ '+boss.name+' ☠', W/2, by-Math.round(6*UISCALE)); ctx.shadowBlur=0;
      ctx.fillStyle='rgba(10,2,2,0.9)'; ctx.fillRect(bx-2,by-2,bw+4,bh+4);
      ctx.fillStyle='#2a0808'; ctx.fillRect(bx,by,bw,bh);
      const gg=ctx.createLinearGradient(bx,0,bx+bw,0);
      gg.addColorStop(0,'#7a0e0e'); gg.addColorStop(0.5,'#e22020'); gg.addColorStop(1,'#ff7a3a');
      ctx.fillStyle=gg; ctx.fillRect(bx,by,bw*frac,bh);
      ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(bx,by,bw*frac,Math.max(1,bh*0.4));
      ctx.strokeStyle='#ff7a6a'; ctx.lineWidth=2; ctx.strokeRect(bx-2,by-2,bw+4,bh+4);
      ctx.fillStyle='#fff'; ctx.textBaseline='middle'; ctx.font='800 '+Math.round(11*UISCALE)+'px "Segoe UI",system-ui,sans-serif';
      ctx.fillText(Math.ceil(frac*100)+'%', W/2, by+bh/2+1);
      ctx.restore(); ctx.globalAlpha=1;
    }
  }
}

// ============================================================ ENTITY DRAW FUNCTIONS
function drawCoin(c) {
  const pulse=1+Math.sin((G.time+c.x)*0.2)*0.12, r=5*pulse;
  ctx.drawImage(coinTex.c, c.x-r, c.y-r, r*2, r*2);
}
function drawDrop(d) {
  const bob=Math.sin((G.time+d.x)*0.12)*2, pulse=1+Math.sin((G.time+d.x)*0.18)*0.08, sz=15*pulse;
  ctx.drawImage(d.type==='health'?healthTex:ammoTex, d.x-sz/2, d.y-sz/2+bob, sz, sz);
}

function drawPlayer() {
  const p=G.player, melee=G.activeSlot==='melee', wp=WEAPONS[G.weapon], mw=MELEE[G.melee];
  if(p.dodge>0){ ctx.globalAlpha=0.18; ctx.fillStyle='#5ec8ff'; ctx.beginPath(); ctx.arc(p.x-p.dx*1.5,p.y-p.dy*1.5,p.r,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
  ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.ang);
  const flick=p.inv>0 && Math.floor(G.time*0.4)%2===0;
  ctx.globalAlpha=flick?0.4:1;
  const rec=p.recoil||0, breath=1+Math.sin(G.time*0.08)*0.025;
  const sw=p.moving?Math.sin(p.legPhase*TAU)*6:0;
  capsule(-2+sw,-7,8+sw,-9,7,'#15181d');
  capsule(-2-sw, 7,8-sw, 9,7,'#15181d');
  ctx.fillStyle='#0a0c0f'; ctx.beginPath(); ctx.arc(8+sw,-9,3,0,TAU); ctx.arc(8-sw,9,3,0,TAU); ctx.fill();
  if(Psprite){ ctx.save(); ctx.scale(breath,breath); ctx.drawImage(Psprite.c,-Psprite.half,-Psprite.half,Psprite.size,Psprite.size); ctx.restore(); }
  const rx=-rec;
  const fhx=21+rx, fhy=-4.5;
  limb(-3,-8,5,-10,fhx,fhy,6,'#20252b');
  ctx.save(); ctx.translate(fhx,fhy); ctx.rotate(-0.10);
  ctx.fillStyle='#23262b'; rr(ctx,-7,-2.6,16,5.2,2); ctx.fill();
  ctx.fillStyle='#3a3f46'; rr(ctx,-7,-2.6,5,5.2,2); ctx.fill();
  ctx.fillStyle='#c9d2dc'; rr(ctx,8,-3.2,4.5,6.4,1.5); ctx.fill();
  ctx.fillStyle='#fff6cf'; ctx.beginPath(); ctx.ellipse(11.5,0,1.6,2.7,0,0,TAU); ctx.fill(); ctx.restore();
  const ghx=9+rx, ghy=3.5;
  limb(-3,8,4,9,ghx,ghy,6,'#20252b');
  if (!melee) {
    ctx.fillStyle='#0f1216'; rr(ctx,7+rx,-2.6,23,5.2,1.5); ctx.fill();
    ctx.fillStyle='#262b32'; ctx.fillRect(12+rx,-1.6,16,3.2);
    ctx.fillStyle='#181c21'; rr(ctx,9+rx,2,5,5.5,1); ctx.fill();
    ctx.fillStyle='#15181d'; rr(ctx,4+rx,-1,6,5.5,1.5); ctx.fill();
    ctx.fillStyle='rgba(120,140,160,0.5)'; ctx.fillRect(13+rx,-2.4,11,1);
    ctx.fillStyle=wp.color; ctx.fillRect(29+rx,-2,6,4);
  } else {
    ctx.fillStyle='#2a2018'; rr(ctx,5,1.5,7,4,1.5); ctx.fill();
    ctx.fillStyle=mw.color;
    if(mw.shape==='axe'){ ctx.fillStyle='#2a2018'; ctx.fillRect(11,2.4,13,2.2); ctx.fillStyle=mw.color; ctx.beginPath(); ctx.moveTo(22,-3); ctx.lineTo(30,0); ctx.quadraticCurveTo(33,3.5,30,7); ctx.lineTo(22,7.5); ctx.quadraticCurveTo(25,2,22,-3); ctx.closePath(); ctx.fill(); }
    else if(mw.shape==='sledge'){ ctx.fillStyle='#2a2018'; ctx.fillRect(11,2.6,17,1.8); ctx.fillStyle=mw.color; rr(ctx,26,-1.5,6,11,1.5); ctx.fill(); }
    else if(mw.shape==='spear'){ ctx.fillStyle='#2a2018'; ctx.fillRect(11,3,28,1.6); ctx.fillStyle=mw.color; ctx.beginPath(); ctx.moveTo(37,1.4); ctx.lineTo(45,3.8); ctx.lineTo(37,6.2); ctx.closePath(); ctx.fill(); }
    else if(mw.shape==='katana'){ ctx.fillStyle='#caa33a'; ctx.fillRect(11,1.2,1.8,5); ctx.fillStyle=mw.color; ctx.beginPath(); ctx.moveTo(13,2); ctx.lineTo(41,2.8); ctx.quadraticCurveTo(43,4,41,5); ctx.lineTo(13,5.2); ctx.closePath(); ctx.fill(); }
    else { const len=mw.shape==='machete'?26:20; ctx.beginPath(); ctx.moveTo(11,1.6); ctx.lineTo(11+len,2.4); ctx.lineTo(11,5.4); ctx.closePath(); ctx.fill(); }
  }
  ctx.fillStyle='#0d0f12';
  ctx.beginPath(); ctx.arc(ghx,ghy,3.4,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(fhx,fhy,3.4,0,TAU); ctx.fill();
  // head
  let g=ctx.createRadialGradient(0,-3,1,2,2,9); g.addColorStop(0,'#444b54'); g.addColorStop(1,'#13161a');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(2,0,8,0,TAU); ctx.fill();
  ctx.strokeStyle='#0a0c0e'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(2,-8); ctx.lineTo(2,8); ctx.stroke();
  ctx.fillStyle='#0c0e11'; ctx.beginPath(); ctx.ellipse(7,0,2.6,3.8,0,0,TAU); ctx.fill();
  ctx.fillStyle='rgba(110,200,255,0.7)'; ctx.beginPath(); ctx.ellipse(7.6,-1,1,1.6,0,0,TAU); ctx.fill();
  ctx.strokeStyle='#08090b'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(2,0,8,0,TAU); ctx.stroke();
  ctx.fillStyle='rgba(175,190,205,0.28)'; ctx.beginPath(); ctx.arc(-0.5,-3,2.4,0,TAU); ctx.fill();
  // melee swing arc
  if(p.swing>0){ const s=clamp(p.swing,0,1), rad=mw.range*0.82, sweep=mw.arc, c2=(0.5-s)*sweep*0.9;
    ctx.save(); ctx.lineCap='round';
    ctx.globalAlpha=s*0.55; ctx.strokeStyle=mw.color; ctx.lineWidth=4.5;
    ctx.beginPath(); ctx.arc(6,0,rad,c2-sweep*0.5,c2+sweep*0.5); ctx.stroke();
    ctx.globalAlpha=s; ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.arc(6,0,rad,c2+sweep*0.30,c2+sweep*0.5); ctx.stroke();
    ctx.restore(); ctx.globalAlpha=flick?0.4:1; }
  // muzzle flash
  if(G.muzzle>0){ const k=G.muzzle/6; ctx.save(); ctx.translate(33-rec,0);
    ctx.fillStyle='rgba(255,240,170,'+(0.9*k)+')';
    ctx.beginPath(); for(let i=0;i<8;i++){ const a=i/8*TAU, rrr=(i%2?3:11)*k; ctx.lineTo(Math.cos(a)*rrr,Math.sin(a)*rrr); } ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,180,60,'+(0.7*k)+')'; ctx.beginPath(); ctx.arc(0,0,5*k,0,TAU); ctx.fill(); ctx.restore(); }
  ctx.restore(); ctx.globalAlpha=1;
  // dodge cooldown ring
  if(p.dodgeCD>0){ ctx.strokeStyle='rgba(120,220,255,.5)'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(p.x,p.y,p.r+7,-Math.PI/2,-Math.PI/2+TAU*(1-p.dodgeCD/900)); ctx.stroke(); }
}

function drawZombie(z) {
  ctx.save(); ctx.translate(z.x,z.y); ctx.rotate(z.ang);
  const flash=z.hitFlash>0, r=z.r;
  const skin=flash?'#fff':z.color, breath=1+Math.sin(G.time*0.09+z.seed)*0.04;
  const cloth=flash?'#eee':darken(ZT[z.type].cloth||z.color,4);
  const sw=Math.sin(z.legPhase*TAU)*5*z.limp;
  const legcol=flash?'#eee':'#1b2212';
  limb(-r*0.25,-r*0.4,1+sw,-r*0.52,6+sw,-r*0.46,6,legcol);
  limb(-r*0.25, r*0.4,1-sw*z.limp,r*0.52,5-sw,r*0.46,6,legcol);
  const spr=Zsprite[z.type];
  if(spr){ ctx.save(); ctx.scale(breath,breath); ctx.drawImage(spr.c,-spr.half,-spr.half,spr.size,spr.size);
    if(flash){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.85; ctx.drawImage(spr.c,-spr.half,-spr.half,spr.size,spr.size); ctx.drawImage(spr.c,-spr.half,-spr.half,spr.size,spr.size); }
    ctx.restore(); }
  const ar=Math.sin(z.legPhase*TAU+1)*3, claw=flash?'#ccc':'#c8a079';
  zArm(r*0.25,-r*0.5,r*0.72,-r*0.64,r+6,-r*0.26+ar,5.5,skin,claw);
  zArm(r*0.25, r*0.5,r*0.72, r*0.64,r+7, r*0.26-ar,5.5,skin,claw);
  ctx.strokeStyle=cloth; ctx.lineWidth=7.5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(r*0.12,-r*0.46); ctx.lineTo(r*0.56,-r*0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r*0.12, r*0.46); ctx.lineTo(r*0.56, r*0.6); ctx.stroke();
  ctx.fillStyle=flash?'#fff':zHeadGrad(z); ctx.beginPath(); ctx.arc(r*0.5,0,r*0.44,0,TAU); ctx.fill();
  ctx.strokeStyle=flash?'#ccc':'rgba(0,0,0,.4)'; ctx.lineWidth=1.4; ctx.stroke();
  ctx.fillStyle=flash?'#ddd':'rgba(18,26,12,0.8)'; ctx.beginPath(); ctx.arc(r*0.4,0,r*0.44,Math.PI*0.55,Math.PI*1.45); ctx.fill();
  if(!flash){
    ctx.fillStyle='#160606'; ctx.beginPath(); ctx.ellipse(r*0.78,0,r*0.13,r*0.2,0,0,TAU); ctx.fill();
    ctx.fillStyle='#c8b690';
    for(let t=-1;t<=1;t++) ctx.fillRect(r*0.74,t*r*0.13-0.8,r*0.12,1.6);
    ctx.fillStyle='rgba(120,20,20,0.6)'; ctx.beginPath(); ctx.arc(r*0.9,r*0.08,1.4,0,TAU); ctx.fill();
  }
  const ey=r*0.2;
  if(!flash){ const eg=z.type==='spitter'?eyeGlow.purple:eyeGlow.red; ctx.save(); ctx.globalCompositeOperation='lighter'; glowAt(ctx,eg,r*0.62,-ey,6,1); glowAt(ctx,eg,r*0.62,ey,6,1); ctx.globalAlpha=1; ctx.restore(); }
  ctx.fillStyle=flash?'#000':(z.type==='spitter'?'#e0a0ff':z.type==='tank'?'#ff5050':'#ff3030');
  ctx.beginPath(); ctx.arc(r*0.62,-ey,2,0,TAU); ctx.arc(r*0.62,ey,2,0,TAU); ctx.fill();
  ctx.restore();
}

function drawDog(z) {
  ctx.save(); ctx.translate(z.x,z.y); ctx.rotate(z.ang);
  const flash=z.hitFlash>0, r=z.r;
  const skin=flash?'#fff':z.color, dark=flash?'#eee':darken(z.color,18), legc=flash?'#eee':'#241808';
  const gait=Math.sin(z.legPhase*TAU)*r*0.5, gait2=Math.sin(z.legPhase*TAU+Math.PI)*r*0.5;
  ctx.strokeStyle=dark; ctx.lineWidth=4; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-r*1.0,0); ctx.lineTo(-r*1.5,Math.sin(z.wob*2)*r*0.5); ctx.stroke();
  ctx.lineWidth=4.5; ctx.strokeStyle=legc;
  ctx.beginPath(); ctx.moveTo(-r*0.6,-r*0.5); ctx.lineTo(-r*0.6+gait2,-r*0.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r*0.6, r*0.5); ctx.lineTo(-r*0.6-gait2, r*0.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r*0.5,-r*0.5); ctx.lineTo(r*0.5+gait,-r*0.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r*0.5, r*0.5); ctx.lineTo(r*0.5-gait, r*0.85); ctx.stroke();
  const breath=1+Math.sin(G.time*0.12+z.seed)*0.05;
  let g=ctx.createLinearGradient(0,-r*0.5,0,r*0.5);
  g.addColorStop(0,flash?'#fff':lighten(z.color,22)); g.addColorStop(1,dark);
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r*1.0,r*0.5*breath,0,0,TAU); ctx.fill();
  ctx.strokeStyle=flash?'#ccc':'rgba(0,0,0,.4)'; ctx.lineWidth=1.3; ctx.stroke();
  if(!flash){ ctx.strokeStyle='rgba(20,12,4,.45)'; ctx.lineWidth=1;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(i*r*0.3,-r*0.34); ctx.lineTo(i*r*0.3,r*0.34); ctx.stroke(); }
    ctx.fillStyle='#5a1010'; ctx.beginPath(); ctx.ellipse(-r*0.1,r*0.18,r*0.22,r*0.13,0,0,TAU); ctx.fill(); }
  ctx.fillStyle=skin; ctx.beginPath(); ctx.ellipse(r*0.85,0,r*0.5,r*0.4,0,0,TAU); ctx.fill();
  ctx.strokeStyle=flash?'#ccc':'rgba(0,0,0,.4)'; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle=dark;
  ctx.beginPath(); ctx.moveTo(r*0.7,-r*0.32); ctx.lineTo(r*0.5,-r*0.7); ctx.lineTo(r*0.9,-r*0.4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(r*0.7, r*0.32); ctx.lineTo(r*0.5, r*0.7); ctx.lineTo(r*0.9, r*0.4); ctx.fill();
  ctx.fillStyle=dark; ctx.beginPath(); ctx.ellipse(r*1.28,0,r*0.28,r*0.22,0,0,TAU); ctx.fill();
  if(!flash){
    ctx.fillStyle='#160606'; ctx.beginPath(); ctx.ellipse(r*1.35,0,r*0.14,r*0.16,0,0,TAU); ctx.fill();
    ctx.fillStyle='#d8c79a';
    ctx.beginPath(); ctx.moveTo(r*1.3,-r*0.12); ctx.lineTo(r*1.42,-r*0.04); ctx.lineTo(r*1.3,r*0.02); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r*1.3, r*0.12); ctx.lineTo(r*1.42, r*0.04); ctx.lineTo(r*1.3,-r*0.02); ctx.fill();
    const ey=r*0.2;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    glowAt(ctx,eyeGlow.red,r*0.95,-ey,5,1); glowAt(ctx,eyeGlow.red,r*0.95,ey,5,1); ctx.restore();
    ctx.fillStyle='#ff3030'; ctx.beginPath(); ctx.arc(r*0.95,-ey,1.8,0,TAU); ctx.arc(r*0.95,ey,1.8,0,TAU); ctx.fill();
  }
  ctx.restore();
}

function drawBoss(z) {
  ctx.save(); ctx.translate(z.x,z.y); ctx.rotate(z.ang);
  if(z.bossType==='brute')       drawBruteBody(z,z.r,G.time);
  else if(z.bossType==='plague') drawPlagueBody(z,z.r,G.time);
  else                           drawNecroBody(z,z.r,G.time);
  ctx.restore();
}

function drawBruteBody(z, r, t) {
  const tele=(z.phase==='windup'||z.phase==='charge'), flash=z.hitFlash>0;
  const breath=1+Math.sin(t*0.08+z.seed)*0.05;
  const base=flash?'#ffffff':(tele?'#7a2a1a':z.color);
  const sw=Math.sin(z.legPhase*TAU)*8;
  ctx.lineCap='round'; ctx.strokeStyle=darken(z.color,30); ctx.lineWidth=r*0.4;
  ctx.beginPath(); ctx.moveTo(-r*0.35,-r*0.5); ctx.lineTo(r*0.05+sw,-r*0.78); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r*0.35, r*0.5); ctx.lineTo(r*0.05-sw, r*0.78); ctx.stroke();
  const fr=r*0.34; ctx.fillStyle=darken(z.color,8);
  ctx.beginPath(); ctx.arc(r*0.92,-r*0.5,fr,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(r*0.92, r*0.5,fr,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(r*0.92,-r*0.5,fr,0,TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(r*0.92, r*0.5,fr,0,TAU); ctx.stroke();
  ctx.save(); ctx.scale(breath,breath);
  let g=ctx.createRadialGradient(-r*0.3,-r*0.35,4,0,0,r*1.15);
  g.addColorStop(0,flash?'#fff':lighten(base,26)); g.addColorStop(1,flash?'#eee':darken(base,18));
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r,r*0.92,0,0,TAU); ctx.fill();
  ctx.fillStyle=flash?'#eee':darken(z.color,24);
  ctx.beginPath(); ctx.ellipse(r*0.15,-r*0.8,r*0.42,r*0.3,0.2,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r*0.15, r*0.8,r*0.42,r*0.3,-0.2,0,TAU); ctx.fill();
  ctx.fillStyle=flash?'#ddd':darken(z.color,32);
  for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(-r*0.5,i*r*0.4); ctx.lineTo(-r*1.05,i*r*0.4); ctx.lineTo(-r*0.6,i*r*0.4+r*0.2); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  if(!flash){ ctx.save(); ctx.globalCompositeOperation='lighter';
    const pulse=0.5+0.5*Math.sin(t*0.18+z.seed);
    ctx.strokeStyle=tele?'#ff5a3c':z.accent; ctx.lineWidth=2.6; ctx.lineCap='round';
    const cr=[[-r*0.3,-r*0.2,r*0.1,-r*0.45,r*0.4,-r*0.2],[-r*0.2,r*0.25,r*0.15,r*0.1,r*0.5,r*0.3],[-r*0.5,0,-r*0.1,r*0.05,r*0.3,-r*0.02]];
    ctx.globalAlpha=0.4+0.5*pulse;
    for(const c of cr){ ctx.beginPath(); ctx.moveTo(c[0],c[1]); ctx.quadraticCurveTo(c[2],c[3],c[4],c[5]); ctx.stroke(); }
    if(tele) glowAt(ctx,fieldGlow.slam,0,0,r*1.5,0.4+0.3*pulse);
    ctx.restore(); ctx.globalAlpha=1; }
  ctx.fillStyle=flash?'#fff':darken(z.color,6); ctx.beginPath(); ctx.arc(r*0.62,0,r*0.3,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.45)'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(r*0.62,0,r*0.3,0,TAU); ctx.stroke();
  const ey=r*0.13;
  if(!flash){ ctx.save(); ctx.globalCompositeOperation='lighter'; glowAt(ctx,eyeGlow.red,r*0.72,-ey,8,1); glowAt(ctx,eyeGlow.red,r*0.72,ey,8,1); ctx.restore(); ctx.globalAlpha=1; }
  ctx.fillStyle=flash?'#000':'#ffd23a'; ctx.beginPath(); ctx.arc(r*0.74,-ey,r*0.07,0,TAU); ctx.arc(r*0.74,ey,r*0.07,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.ellipse(0,0,r,r*0.92,0,0,TAU); ctx.stroke();
}

function drawPlagueBody(z, r, t) {
  const flash=z.hitFlash>0, breath=1+Math.sin(t*0.12+z.seed)*0.07;
  const sw=Math.sin(z.legPhase*TAU)*5;
  ctx.lineCap='round'; ctx.strokeStyle=darken(z.color,28); ctx.lineWidth=r*0.3;
  ctx.beginPath(); ctx.moveTo(-r*0.3,-r*0.45); ctx.lineTo(r*0.05+sw,-r*0.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r*0.3, r*0.45); ctx.lineTo(r*0.05-sw, r*0.7); ctx.stroke();
  ctx.save(); ctx.scale(breath,breath);
  let g=ctx.createRadialGradient(-r*0.3,-r*0.3,4,0,0,r*1.1);
  g.addColorStop(0,flash?'#fff':lighten(z.color,30)); g.addColorStop(1,flash?'#eee':darken(z.color,16));
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r,r*0.95,0,0,TAU); ctx.fill();
  if(!flash){ for(let i=0;i<7;i++){ const ang=i/7*TAU+z.seed, pp=0.7+0.3*Math.sin(t*0.2+i*1.3), sr=r*0.22*pp, sx=Math.cos(ang)*r*0.72, sy=Math.sin(ang)*r*0.68;
    let sg=ctx.createRadialGradient(sx,sy,1,sx,sy,sr); sg.addColorStop(0,'#cfff8a'); sg.addColorStop(1,z.color);
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sx,sy,sr,0,TAU); ctx.fill(); } }
  ctx.restore();
  if(!flash){ ctx.save(); ctx.globalCompositeOperation='lighter'; glowAt(ctx,fieldGlow.toxic,0,0,r*1.5,0.25+0.1*Math.sin(t*0.2)); ctx.restore(); ctx.globalAlpha=1; }
  ctx.fillStyle=flash?'#000':'#2a0a2a'; ctx.beginPath(); ctx.ellipse(r*0.6,0,r*0.12,r*0.22,0,0,TAU); ctx.fill();
  const eyes=[[r*0.7,0],[r*0.5,-r*0.3],[r*0.5,r*0.3],[r*0.76,-r*0.16],[r*0.76,r*0.16]];
  if(!flash){ ctx.save(); ctx.globalCompositeOperation='lighter'; for(const e of eyes) glowAt(ctx,eyeGlow.purple,e[0],e[1],6,1); ctx.restore(); ctx.globalAlpha=1;
    ctx.fillStyle='#f0c0ff'; for(const e of eyes){ ctx.beginPath(); ctx.arc(e[0],e[1],r*0.05,0,TAU); ctx.fill(); } }
  ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(0,0,r,r*0.95,0,0,TAU); ctx.stroke();
}

function drawNecroBody(z, r, t) {
  const flash=z.hitFlash>0, float=Math.sin(t*0.1+z.seed)*3;
  ctx.save(); ctx.translate(0,float);
  const robeShape=()=>{
    ctx.beginPath(); const pts=14;
    for(let i=0;i<pts;i++){ const a=i/pts*TAU; let rrr=r*(0.9+0.12*Math.sin(a*3)); if(Math.cos(a)<-0.2) rrr*=1.12;
      const px=Math.cos(a)*rrr, py=Math.sin(a)*rrr*0.95; i?ctx.lineTo(px,py):ctx.moveTo(px,py); }
    ctx.closePath();
  };
  let g=ctx.createRadialGradient(-r*0.2,-r*0.3,3,0,0,r*1.1);
  g.addColorStop(0,flash?'#fff':'#3a1020'); g.addColorStop(1,flash?'#ddd':'#120209');
  ctx.fillStyle=g; robeShape(); ctx.fill();
  ctx.fillStyle=flash?'#eee':'#24060f'; ctx.beginPath(); ctx.ellipse(r*0.1,0,r*0.7,r*0.8,0,0,TAU); ctx.fill();
  ctx.strokeStyle=flash?'#fff':'#c9bfae'; ctx.lineWidth=3.4; ctx.lineCap='round';
  const ar=Math.sin(z.legPhase*TAU)*4;
  for(const s of [-1,1]){ const hx=r*1.0, hy=s*r*0.45+ar*s;
    ctx.beginPath(); ctx.moveTo(r*0.2,s*r*0.5); ctx.lineTo(r*0.7,s*r*0.6+ar*s); ctx.lineTo(hx,hy); ctx.stroke();
    for(let k=-1;k<=1;k++){ ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(hx+r*0.2,hy+k*r*0.12); ctx.stroke(); } }
  ctx.fillStyle=flash?'#fff':'#d8cfc0'; ctx.beginPath(); ctx.arc(r*0.55,0,r*0.32,0,TAU); ctx.fill();
  ctx.fillStyle=flash?'#ddd':'#1a0410'; ctx.beginPath(); ctx.arc(r*0.5,0,r*0.42,Math.PI*0.55,Math.PI*1.45); ctx.fill();
  if(!flash){ ctx.save(); ctx.globalCompositeOperation='lighter';
    glowAt(ctx,eyeGlow.red,r*0.62,-r*0.12,7,1); glowAt(ctx,eyeGlow.red,r*0.62,r*0.12,7,1);
    glowAt(ctx,fieldGlow.necro,0,0,r*1.6,0.2+0.12*Math.sin(t*0.18)); ctx.restore(); ctx.globalAlpha=1; }
  ctx.fillStyle=flash?'#000':'#ff3030'; ctx.beginPath(); ctx.arc(r*0.62,-r*0.12,r*0.07,0,TAU); ctx.arc(r*0.62,r*0.12,r*0.07,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=2; robeShape(); ctx.stroke();
  ctx.restore();
}
