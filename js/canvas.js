"use strict";
// ============================================================ CANVAS & VIEWPORT
const cv  = document.getElementById('game');
const ctx = cv.getContext('2d');
let W = 0, H = 0;
const DPR = Math.min(2, window.devicePixelRatio || 1);

const RS_MIN = 0.55, RS_MAX = 1;
let RSCALE = (window.innerWidth * window.innerHeight > 2600000) ? 0.75 : 1;
let UISCALE = 1, STICK_R = 58;
let VIEW = 1, VW = 0, VH = 0;

// offscreen layers
const groundCv = document.createElement('canvas'), gctx = groundCv.getContext('2d');
const lightCv  = document.createElement('canvas'), lctx = lightCv.getContext('2d');

let groundSeed = 1;
let vignetteGrad = null;

function applyScale() {
  const S = RSCALE;
  cv.width  = Math.max(1, Math.round(W*S));
  cv.height = Math.max(1, Math.round(H*S));
  cv.style.width  = W + 'px';
  cv.style.height = H + 'px';
  ctx.setTransform(S, 0, 0, S, 0, 0);
  lightCv.width  = cv.width;
  lightCv.height = cv.height;
  lctx.setTransform(S, 0, 0, S, 0, 0);
}

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  applyScale();
  const minDim = Math.min(W, H);
  UISCALE  = clamp(minDim/460, 0.55, 1);
  VIEW     = clamp(minDim/620, 0.55, 1);
  VW = Math.ceil(W/VIEW); VH = Math.ceil(H/VIEW);
  STICK_R  = Math.round(clamp(minDim*0.13, 38, 62));
  document.documentElement.style.setProperty('--ui',      UISCALE.toFixed(3));
  document.documentElement.style.setProperty('--stick-r', STICK_R + 'px');
  vignetteGrad = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35, W/2,H/2,Math.max(W,H)*0.7);
  vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
  prerenderGround();
}

window.addEventListener('resize', resize);

// ============================================================ GROUND RENDERING
function gblob(c, x, y, r, col, a) {
  const g = c.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save(); c.globalAlpha=a; c.fillStyle=g;
  c.beginPath(); c.arc(x,y,r,0,TAU); c.fill(); c.restore();
}

function patch(c, x, y, r, col, a) {
  const n = 6 + (Math.random()*5|0);
  for (let i=0; i<n; i++) {
    const ang = Math.random()*TAU, d = Math.random()*r*0.7;
    gblob(c, x+Math.cos(ang)*d, y+Math.sin(ang)*d, r*rand(.4,.8), col, a*rand(.5,1));
  }
}

function prerenderGround() {
  const gW = VW, gH = VH;
  const _realRandom = Math.random;
  Math.random = mulberry32(groundSeed || 1);
  groundCv.width = gW; groundCv.height = gH;

  const bg = gctx.createRadialGradient(gW/2,gH/2,80, gW/2,gH/2,Math.max(gW,gH)*0.78);
  bg.addColorStop(0,'#222619'); bg.addColorStop(0.6,'#171b11'); bg.addColorStop(1,'#0b0e08');
  gctx.fillStyle = bg; gctx.fillRect(0,0,gW,gH);

  for (let i=0; i<Math.floor(gW*gH/45000); i++) { const x=rand(0,gW),y=rand(0,gH); patch(gctx,x,y,rand(120,260),Math.random()<.5?'#2a3320':'#161a10',rand(.10,.2)); }
  for (let i=0; i<Math.floor(gW*gH/60000); i++) { const x=rand(0,gW),y=rand(0,gH); patch(gctx,x,y,rand(50,140),Math.random()<.5?'#3a2f1c':'#2c2414',rand(.12,.26)); }
  for (let i=0; i<Math.floor(gW*gH/90000); i++) { const x=rand(0,gW),y=rand(0,gH); patch(gctx,x,y,rand(40,110),'#3c5226',rand(.10,.22)); }

  for (let i=0; i<Math.floor(gW*gH/600); i++) {
    const x=Math.random()*gW, y=Math.random()*gH, s=Math.random();
    gctx.fillStyle = s<.5 ? 'rgba(255,250,230,0.022)' : 'rgba(0,0,0,0.07)';
    gctx.fillRect(x, y, Math.random()<.8?1:2, Math.random()<.8?1:2);
  }

  gctx.strokeStyle='rgba(0,0,0,0.32)'; gctx.lineCap='round';
  for (let i=0; i<20; i++) {
    let x=rand(0,gW), y=rand(0,gH), ang=rand(0,TAU);
    for (let j=0; j<rand(6,14); j++) {
      gctx.lineWidth=rand(.5,1.8); gctx.beginPath(); gctx.moveTo(x,y);
      ang+=rand(-.7,.7); const nx=x+Math.cos(ang)*rand(8,26), ny=y+Math.sin(ang)*rand(8,26);
      gctx.lineTo(nx,ny); gctx.stroke(); x=nx; y=ny;
    }
  }

  for (let i=0; i<Math.floor(gW*gH/16000); i++) {
    const x=rand(0,gW), y=rand(0,gH), shade=rand(.3,.6);
    gctx.strokeStyle='rgba(110,140,60,'+shade+')'; gctx.lineWidth=1.2;
    for (let b=0; b<rand(3,6); b++) { gctx.beginPath(); gctx.moveTo(x+rand(-3,3),y); gctx.lineTo(x+rand(-7,7),y-rand(5,12)); gctx.stroke(); }
  }

  for (let i=0; i<6; i++) {
    const x=rand(80,gW-80), y=rand(80,gH-80), r=rand(30,70);
    gctx.save(); gctx.beginPath(); gctx.ellipse(x,y,r,r*0.6,rand(-.4,.4),0,TAU); gctx.clip();
    let p=gctx.createLinearGradient(x,y-r*0.6,x,y+r*0.6);
    p.addColorStop(0,'rgba(40,60,75,0.5)'); p.addColorStop(0.5,'rgba(15,22,28,0.6)'); p.addColorStop(1,'rgba(30,45,55,0.4)');
    gctx.fillStyle=p; gctx.fillRect(x-r,y-r,r*2,r*2);
    gctx.strokeStyle='rgba(120,160,180,0.25)'; gctx.lineWidth=1; gctx.stroke(); gctx.restore();
  }

  for (let i=0; i<7; i++) { const x=rand(40,gW-40), y=rand(40,gH-40); gblob(gctx,x,y,rand(30,60),'#000',rand(.18,.32)); }
  Math.random = _realRandom;
}
