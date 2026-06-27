"use strict";
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (ax, ay, bx, by) => { const dx = ax-bx, dy = ay-by; return dx*dx+dy*dy; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function lighten(hex, amt) {
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  let r = parseInt(m.slice(0,2),16), g = parseInt(m.slice(2,4),16), b = parseInt(m.slice(4,6),16);
  r = clamp(r+amt,0,255); g = clamp(g+amt,0,255); b = clamp(b+amt,0,255);
  return 'rgb('+r+','+g+','+b+')';
}
function darken(hex, amt) { return lighten(hex, -amt); }
function noise2(i, off) { const s = Math.sin(i*12.9898+off*78.233)*43758.5453; return s - Math.floor(s); }

// rounded-rect path helper (takes a canvas 2d context)
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x+r, y);
  c.arcTo(x+w, y, x+w, y+h, r);
  c.arcTo(x+w, y+h, x, y+h, r);
  c.arcTo(x, y+h, x, y, r);
  c.arcTo(x, y, x+w, y, r);
  c.closePath();
}
