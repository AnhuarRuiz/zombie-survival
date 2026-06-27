"use strict";
// ============================================================ KEYBOARD & MOUSE
const keymap = { KeyW:'up', ArrowUp:'up', KeyS:'down', ArrowDown:'down', KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right' };

window.addEventListener('keydown', e => {
  if (!G || G.over) return;
  if (e.code === 'Escape') { e.preventDefault(); togglePause(); return; }
  if (paused) return;
  if (keymap[e.code]) G.keys[keymap[e.code]] = true;
  if (e.code === 'KeyR')     reload();
  if (e.code === 'Space')    { e.preventDefault(); doDodge(); }
  if (e.code === 'Digit1')   setSlot('melee');
  if (e.code === 'Digit2')   setSlot('firearm');
  if (e.code === 'KeyG')     throwGrenade();
  if (e.code === 'KeyQ')     cycleGrenade();
});
window.addEventListener('keyup', e => { if (G && keymap[e.code]) G.keys[keymap[e.code]] = false; });

cv.addEventListener('mousemove', e => { if (G) { G.mouse.x=e.clientX/VIEW; G.mouse.y=e.clientY/VIEW; } });
cv.addEventListener('mousedown', e => { actx(); if (G) G.mouse.down=true; });
window.addEventListener('mouseup', () => { if (G) G.mouse.down=false; });

// ============================================================ TOUCH (twin-stick)
const isTouch = window.matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window);
const DEAD = 0.16;
const Tctrl = { moveX:0, moveY:0, moveActive:false, aimX:0, aimY:0, aimActive:false, aimFire:false };

const stickMove = document.getElementById('stickMove');
const stickAim  = document.getElementById('stickAim');
let moveId=null, aimId=null, moveOrigin=null, aimOrigin=null;

function placeKnob(el, dx, dy) { el.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`; }
function stickCenter(el) { const r=el.getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 }; }

function resetTctrl() {
  moveId=aimId=null; Tctrl.moveActive=Tctrl.aimActive=Tctrl.aimFire=false; Tctrl.moveX=Tctrl.moveY=0;
  placeKnob(stickMove,0,0); placeKnob(stickAim,0,0);
}

function driveMove(cx, cy) {
  let dx=cx-moveOrigin.x, dy=cy-moveOrigin.y, m=Math.hypot(dx,dy);
  if (m>STICK_R) { dx=dx/m*STICK_R; dy=dy/m*STICK_R; m=STICK_R; }
  placeKnob(stickMove,dx,dy);
  if (m>STICK_R*0.16) { Tctrl.moveX=dx/STICK_R; Tctrl.moveY=dy/STICK_R; Tctrl.moveActive=true; }
  else Tctrl.moveActive=false;
}

function driveAim(cx, cy) {
  let dx=cx-aimOrigin.x, dy=cy-aimOrigin.y, m=Math.hypot(dx,dy);
  if (m>STICK_R) { dx=dx/m*STICK_R; dy=dy/m*STICK_R; m=STICK_R; }
  if (Tctrl.aimFire) placeKnob(stickAim,dx,dy);
  if (m>8) { Tctrl.aimX=dx; Tctrl.aimY=dy; Tctrl.aimActive=true; }
  else Tctrl.aimActive=false;
}

if (isTouch) {
  const half = () => window.innerWidth / 2;
  cv.addEventListener('pointerdown', e => {
    if (!G || G.over) return; actx();
    if (e.clientX<half() && moveId===null) {
      moveId=e.pointerId; moveOrigin=stickCenter(stickMove); driveMove(e.clientX,e.clientY);
    } else if (e.clientX>=half() && aimId===null) {
      aimId=e.pointerId;
      const sc=stickCenter(stickAim);
      Tctrl.aimFire = Math.hypot(e.clientX-sc.x, e.clientY-sc.y) <= STICK_R*1.25;
      aimOrigin = Tctrl.aimFire ? sc : { x:e.clientX, y:e.clientY };
      driveAim(e.clientX,e.clientY);
    }
    e.preventDefault();
  }, { passive:false });

  cv.addEventListener('pointermove', e => {
    if (e.pointerId===moveId) { driveMove(e.clientX,e.clientY); e.preventDefault(); }
    else if (e.pointerId===aimId) { driveAim(e.clientX,e.clientY); e.preventDefault(); }
  }, { passive:false });

  const endP = e => {
    if (e.pointerId===moveId) { moveId=null; Tctrl.moveActive=false; placeKnob(stickMove,0,0); }
    if (e.pointerId===aimId)  { aimId=null; Tctrl.aimActive=Tctrl.aimFire=false; placeKnob(stickAim,0,0); }
  };
  cv.addEventListener('pointerup', endP);
  cv.addEventListener('pointercancel', endP);
}

// ============================================================ ACTION BUTTONS
function bindBtn(el, fn) {
  el.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); actx(); if(G&&!G.over) fn(); }, { passive:false });
}
bindBtn(document.getElementById('dodgeBtn'),  () => doDodge());
bindBtn(document.getElementById('reloadBtn'), () => reload());
bindBtn(document.getElementById('nadeBtn'),   () => throwGrenade());
bindBtn(document.getElementById('swapBtn'),   () => setSlot(G.activeSlot==='firearm'?'melee':'firearm'));
bindBtn(document.getElementById('pauseBtn'),  () => togglePause());

if (isTouch) document.body.classList.add('touch');

// desktop hover sound on buttons/cards
let _hovEl = null;
document.addEventListener('mouseover', e => {
  if (isTouch) return;
  const el = e.target.closest('.btn,.card,.slot,.wbtn');
  if (el !== _hovEl) { _hovEl=el; if(el && !el.classList.contains('dis')) SFX.hover(); }
});
