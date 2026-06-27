"use strict";
// ============================================================ PRE-RENDERED SPRITES
const SS = 2; // supersample factor
let Zsprite = {}, Psprite = null, noiseTile = null;

function makeSprite(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(size * SS);
  const x = c.getContext('2d');
  x.scale(SS, SS); x.translate(size/2, size/2);
  draw(x);
  return { c, half: size/2, size };
}

function blob(x, cx, cy, r, col, a) {
  const g = x.createRadialGradient(cx,cy,0,cx,cy,r);
  g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)');
  x.save(); x.globalAlpha=a; x.fillStyle=g;
  x.beginPath(); x.arc(cx,cy,r,0,TAU); x.fill(); x.restore();
}

function bodyPath(x, r, off) {
  x.beginPath();
  const pts = 16;
  for (let i=0; i<pts; i++) {
    const a=i/pts*TAU, rr=r*(0.80+noise2(i,off)*0.26);
    const px=Math.cos(a)*rr, py=Math.sin(a)*rr*0.95;
    i ? x.lineTo(px,py) : x.moveTo(px,py);
  }
  x.closePath();
}

function makeZombieSprite(type, b) {
  const r=b.r, size=Math.ceil(r*2.6), off=type.length*7+r;
  return makeSprite(size, x => {
    let g=x.createRadialGradient(-r*0.3,-r*0.35,2,0,0,r+2);
    g.addColorStop(0,lighten(b.color,30)); g.addColorStop(1,darken(b.color,14));
    x.fillStyle=g; bodyPath(x,r,off); x.fill();

    x.save(); bodyPath(x,r,off); x.clip();
    for (let i=0; i<26; i++) {
      const ang=rand(0,TAU), d=rand(0,r), cx=Math.cos(ang)*d, cy=Math.sin(ang)*d*0.95, pk=Math.random();
      const col=pk<.4?darken(b.color,34):pk<.7?lighten(b.color,34):'rgba(80,35,25,1)';
      blob(x,cx,cy,rand(r*0.16,r*0.4),col,rand(.12,.32));
    }
    blob(x,-r*0.1,r*0.25,r*0.42,'#5a1010',.65); blob(x,-r*0.1,r*0.25,r*0.2,'#280707',.7);
    x.strokeStyle='rgba(60,20,20,0.4)'; x.lineWidth=1;
    for (let i=0; i<5; i++) { x.beginPath(); let vx=rand(-r*.5,r*.5),vy=rand(-r*.5,r*.5); x.moveTo(vx,vy); for(let j=0;j<3;j++){vx+=rand(-6,6);vy+=rand(-6,6);x.lineTo(vx,vy);} x.stroke(); }
    x.restore();

    if (b.cloth) {
      x.save(); bodyPath(x,r,off); x.clip();
      let cg=x.createRadialGradient(-r*0.25,-r*0.25,2,-r*0.1,0,r*1.1);
      cg.addColorStop(0,lighten(b.cloth,18)); cg.addColorStop(1,darken(b.cloth,16));
      x.fillStyle=cg; x.beginPath();
      const cp=11;
      for (let i=0; i<cp; i++) { const a=i/cp*TAU, rr2=r*(0.46+noise2(i,off+3)*0.6); const px=Math.cos(a)*rr2-r*0.12, py=Math.sin(a)*rr2*0.92; i?x.lineTo(px,py):x.moveTo(px,py); }
      x.closePath(); x.fill();
      x.strokeStyle='rgba(0,0,0,0.4)'; x.lineWidth=1; x.stroke();
      x.lineWidth=0.8;
      for (let i=0; i<3; i++) { x.beginPath(); let fx=rand(-r*0.5,r*0.2),fy=rand(-r*0.6,r*0.6); x.moveTo(fx,fy); for(let j=0;j<2;j++){fx+=rand(-7,4);fy+=rand(-6,6);x.lineTo(fx,fy);} x.stroke(); }
      for (let i=0; i<5; i++) blob(x,rand(-r*0.6,r*0.35),rand(-r*0.6,r*0.6),rand(r*0.14,r*0.34),Math.random()<.5?'#0a0a0a':'#3a0c0c',rand(.16,.36));
      x.restore();
    }
    x.globalCompositeOperation='lighter'; blob(x,-r*0.45,-r*0.5,r*0.75,'rgba(160,190,90,1)',.18); x.globalCompositeOperation='source-over';
    x.strokeStyle='rgba(0,0,0,0.42)'; x.lineWidth=1.6; bodyPath(x,r,off); x.stroke();
  });
}

function makePlayerSprite() {
  const r=16, size=Math.ceil(r*2.6);
  return makeSprite(size, x => {
    let g=x.createRadialGradient(-3,-4,2,0,0,r+3);
    g.addColorStop(0,'#3c434c'); g.addColorStop(.65,'#23272d'); g.addColorStop(1,'#121419');
    x.fillStyle=g; x.beginPath(); x.ellipse(0,0,r,r*0.94,0,0,TAU); x.fill();
    x.save(); x.beginPath(); x.ellipse(0,0,r,r*0.94,0,0,TAU); x.clip();
    for (let i=0; i<14; i++) blob(x,rand(-r,r),rand(-r,r),rand(r*0.2,r*0.5),Math.random()<.5?'#10131a':'#454c56',rand(.08,.18));
    x.fillStyle='#1a1d23'; x.beginPath(); x.ellipse(-r*0.52,0,r*0.4,r*0.62,0,0,TAU); x.fill();
    x.fillStyle='#0e1014'; x.fillRect(-r*0.86,-r*0.16,r*0.18,r*0.32);
    x.fillStyle='#1d2128'; rr(x,r*0.04,-r*0.52,r*0.66,r*1.04,3); x.fill();
    x.strokeStyle='rgba(0,0,0,0.55)'; x.lineWidth=1.3; x.stroke();
    x.strokeStyle='rgba(150,165,185,0.16)'; x.lineWidth=1; x.beginPath(); x.moveTo(r*0.12,-r*0.42); x.lineTo(r*0.12,r*0.42); x.stroke();
    x.strokeStyle='rgba(0,0,0,0.45)'; x.lineWidth=1.4;
    for (let i=-2; i<=2; i++) { const yy=i*r*0.27; x.beginPath(); x.moveTo(-r*0.16,yy); x.lineTo(r*0.58,yy); x.stroke(); }
    x.fillStyle='#2d343d';
    x.beginPath(); x.ellipse(r*0.12,-r*0.82,r*0.42,r*0.34,0,0,TAU); x.fill();
    x.beginPath(); x.ellipse(r*0.12, r*0.82,r*0.42,r*0.34,0,0,TAU); x.fill();
    x.fillStyle='#181b20';
    rr(x,-r*0.1,-r*0.92,r*0.34,r*0.3,2); x.fill();
    rr(x,-r*0.1, r*0.62,r*0.34,r*0.3,2); x.fill();
    x.restore();
    x.globalCompositeOperation='lighter'; blob(x,-r*0.3,-r*0.5,r*0.72,'rgba(150,170,200,1)',.14); x.globalCompositeOperation='source-over';
    x.strokeStyle='#0b0d11'; x.lineWidth=2; x.beginPath(); x.ellipse(0,0,r,r*0.94,0,0,TAU); x.stroke();
  });
}

function buildSprites() {
  Psprite = makePlayerSprite();
  for (const t in ZT) Zsprite[t] = makeZombieSprite(t, ZT[t]);
}

// ============================================================ PRE-RENDERED GLOWS
function makeRadial(col0, col1, size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x=c.getContext('2d'), r=size/2, g=x.createRadialGradient(r,r,0,r,r,r);
  g.addColorStop(0,col0); g.addColorStop(1,col1);
  x.fillStyle=g; x.fillRect(0,0,size,size);
  return c;
}

let lightTex=null, coinGlowTex=null, coinTex=null, muzzleGlow=null, bulletGlow={}, eyeGlow={};
let healthTex=null, ammoTex=null, healthGlow=null, ammoGlow=null;
let fieldGlow={};

function buildGlows() {
  lightTex    = makeRadial('rgba(255,255,255,1)',    'rgba(255,255,255,0)', 128);
  muzzleGlow  = makeRadial('rgba(255,230,140,0.9)',  'rgba(255,160,40,0)',  128);
  coinGlowTex = makeRadial('rgba(255,200,60,0.5)',   'rgba(255,200,60,0)',  64);
  healthGlow  = makeRadial('rgba(90,255,110,0.5)',   'rgba(90,255,110,0)',  64);
  ammoGlow    = makeRadial('rgba(120,200,255,0.5)',  'rgba(120,200,255,0)', 64);

  healthTex = (() => {
    const s=28, c=document.createElement('canvas'); c.width=c.height=s; const x=c.getContext('2d');
    rr(x,3,3,s-6,s-6,5); x.fillStyle='#d83232'; x.fill(); x.strokeStyle='#7a1414'; x.lineWidth=2; x.stroke();
    x.fillStyle='#fff'; x.fillRect(s/2-2.6,7,5.2,s-14); x.fillRect(7,s/2-2.6,s-14,5.2);
    return c;
  })();

  ammoTex = (() => {
    const s=28, c=document.createElement('canvas'); c.width=c.height=s; const x=c.getContext('2d');
    rr(x,3,7,s-6,s-12,3); x.fillStyle='#caa33a'; x.fill(); x.strokeStyle='#6e5410'; x.lineWidth=2; x.stroke();
    x.fillStyle='#3a2e0c'; x.fillRect(5,11,s-10,2.4);
    for (let i=0; i<4; i++) { const bx=6+i*5; x.fillStyle='#ffe27a'; x.fillRect(bx,3,3,9); x.fillStyle='#b8860b'; x.beginPath(); x.moveTo(bx,3); x.lineTo(bx+1.5,0.5); x.lineTo(bx+3,3); x.closePath(); x.fill(); }
    return c;
  })();

  coinTex = (() => {
    const s=24, c=document.createElement('canvas'); c.width=c.height=s; const x=c.getContext('2d'), m=s/2, r=s/2-2;
    const g=x.createRadialGradient(m-2,m-2,0.5,m,m,r);
    g.addColorStop(0,'#fff6c0'); g.addColorStop(.5,'#ffcf33'); g.addColorStop(1,'#b8860b');
    x.fillStyle=g; x.beginPath(); x.arc(m,m,r,0,TAU); x.fill();
    x.strokeStyle='#7a5a00'; x.lineWidth=1; x.stroke();
    return { c, m, r };
  })();

  for (const k in WEAPONS) {
    const col = WEAPONS[k].color;
    if (!bulletGlow[col]) bulletGlow[col] = makeRadial(col, 'rgba(0,0,0,0)', 64);
  }

  eyeGlow.red    = makeRadial('rgba(255,42,42,0.9)',   'rgba(255,42,42,0)',   24);
  eyeGlow.purple = makeRadial('rgba(208,112,255,0.9)', 'rgba(208,112,255,0)', 24);

  fieldGlow.frag    = makeRadial('rgba(255,210,120,0.9)', 'rgba(255,120,30,0)',  128);
  fieldGlow.molotov = makeRadial('rgba(255,150,50,0.8)',  'rgba(255,70,20,0)',   96);
  fieldGlow.cryo    = makeRadial('rgba(150,240,255,0.7)', 'rgba(80,180,255,0)',  96);
  fieldGlow.toxic   = makeRadial('rgba(160,240,110,0.7)', 'rgba(70,180,40,0)',   96);
  fieldGlow.slam    = makeRadial('rgba(255,200,120,0.85)','rgba(200,90,30,0)',   128);
  fieldGlow.necro   = makeRadial('rgba(220,90,255,0.8)',  'rgba(120,20,90,0)',   128);
}

function glowAt(c, tex, x, y, radius, alpha) {
  c.globalAlpha = alpha;
  c.drawImage(tex, x-radius, y-radius, radius*2, radius*2);
}

// per-type zombie head gradient (cached, reused every frame)
const headGrad = {};
function zHeadGrad(z) {
  let g = headGrad[z.type];
  if (!g) {
    const r=z.r; g=ctx.createRadialGradient(r*0.45-2,-2,1,r*0.5,0,r*0.5);
    g.addColorStop(0,lighten(z.color,34)); g.addColorStop(1,z.color);
    headGrad[z.type]=g;
  }
  return g;
}
