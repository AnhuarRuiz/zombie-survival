"use strict";
// ============================================================ AUDIO ENGINE
let AC = null, MASTER = null;

function actx() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    MASTER = AC.createGain();
    MASTER.gain.value = SETTINGS.sound ? 0.9 : 0;
    const comp = AC.createDynamicsCompressor();
    comp.threshold.value=-16; comp.knee.value=22; comp.ratio.value=3.2; comp.attack.value=.004; comp.release.value=.22;
    MASTER.connect(comp); comp.connect(AC.destination);
  }
  if (AC.state === 'suspended') { try { AC.resume(); } catch(e) {} }
  return AC;
}
function dst() { return MASTER || actx().destination; }
function applySound() { if (MASTER) MASTER.gain.value = SETTINGS.sound ? 0.9 : 0; }

function tone(freq, dur, o = {}) {
  try {
    const a=actx(), t=a.currentTime+(o.delay||0), osc=a.createOscillator(), g=a.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) { osc.frequency[o.lin?'linearRampToValueAtTime':'exponentialRampToValueAtTime'](Math.max(1,o.to), t+dur); }
    const vol=o.vol??.12, atk=o.atk??.004;
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol), t+atk);
    g.gain.exponentialRampToValueAtTime(.0001, t+dur);
    let last = osc;
    if (o.filter) { const f=a.createBiquadFilter(); f.type=o.filter; f.frequency.value=o.cutoff||1200; if(o.q)f.Q.value=o.q; osc.connect(f); last=f; }
    last.connect(g); g.connect(dst());
    osc.start(t); osc.stop(t+dur+.03);
    if (o.vib) { const l=a.createOscillator(), lg=a.createGain(); l.type='sine'; l.frequency.value=o.vib; lg.gain.value=o.vibDepth||6; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t+dur); }
  } catch(e) {}
}

function noise(dur, o = {}) {
  if (typeof o === 'number') o = { vol: o };
  try {
    const a=actx(), t=a.currentTime+(o.delay||0), n=a.createBufferSource();
    const b=a.createBuffer(1, Math.max(1,Math.ceil(a.sampleRate*dur)), a.sampleRate);
    const d=b.getChannelData(0), curve=o.curve||1;
    for (let i=0; i<d.length; i++) { const k=1-i/d.length; d[i]=(Math.random()*2-1)*Math.pow(k,curve); }
    n.buffer = b;
    const g=a.createGain(), vol=o.vol??.2;
    g.gain.setValueAtTime(Math.max(.0002,vol), t);
    g.gain.exponentialRampToValueAtTime(.0001, t+dur);
    const f=a.createBiquadFilter(); f.type=o.type||'lowpass';
    f.frequency.setValueAtTime(o.cutoff||1200, t);
    if (o.cutoffTo) f.frequency.exponentialRampToValueAtTime(Math.max(1,o.cutoffTo), t+dur);
    if (o.q) f.Q.value = o.q;
    n.connect(f); f.connect(g); g.connect(dst());
    n.start(t); n.stop(t+dur+.03);
  } catch(e) {}
}

function blip(freq, dur, type='square', vol=.12, slideTo=null) { tone(freq,dur,{type,vol,to:slideTo}); }
const jit = (p=1) => 1 + rand(-.045,.045)*p;

// ============================================================ SOUND EFFECTS
const SFX = {
  // --- weapons ---
  pistol:  () => { const j=jit(); noise(.008,{vol:.11,type:'highpass',cutoff:5200}); noise(.07,{vol:.20,cutoff:2400*j,cutoffTo:420,curve:1.8,q:.8}); tone(220*j,.08,{type:'square',vol:.10,to:90}); },
  smg:     () => { const j=jit(); noise(.006,{vol:.10,type:'highpass',cutoff:6400}); noise(.05,{vol:.16,cutoff:3400*j,cutoffTo:800,curve:2,q:1}); tone(240*j,.05,{type:'square',vol:.07,to:120}); },
  shotgun: () => { noise(.012,{vol:.16,type:'highpass',cutoff:4200}); noise(.26,{vol:.40,cutoff:2200,cutoffTo:140,curve:1.3,q:.7}); tone(110,.24,{type:'sawtooth',vol:.20,to:40}); tone(60,.30,{type:'sine',vol:.22,to:28}); noise(.30,{vol:.12,cutoff:900,cutoffTo:200,curve:1.2,delay:.05}); },
  assault: () => { const j=jit(); noise(.008,{vol:.13,type:'highpass',cutoff:6000}); noise(.075,{vol:.22,cutoff:3000*j,cutoffTo:520,curve:1.8,q:1}); tone(180*j,.08,{type:'square',vol:.10,to:64}); },
  magnum:  () => { const j=jit(); noise(.012,{vol:.18,type:'highpass',cutoff:5600}); noise(.18,{vol:.34,cutoff:2800*j,cutoffTo:220,curve:1.4,q:.9}); tone(170*j,.2,{type:'sawtooth',vol:.22,to:46}); tone(80,.26,{type:'sine',vol:.22,to:34}); noise(.22,{vol:.10,cutoff:800,cutoffTo:160,curve:1.2,delay:.04}); },
  rifle:   () => { const j=jit(); noise(.01,{vol:.20,type:'highpass',cutoff:7000}); noise(.13,{vol:.26,type:'bandpass',cutoff:3200*j,cutoffTo:600,q:1.2,curve:1.6}); tone(180*j,.14,{type:'sawtooth',vol:.14,to:54}); noise(.18,{vol:.10,cutoff:1100,cutoffTo:240,curve:1.2,delay:.04}); },
  lmg:     () => { const j=jit(); noise(.009,{vol:.13,type:'highpass',cutoff:5000}); noise(.085,{vol:.24,cutoff:2400*j,cutoffTo:420,curve:1.6,q:.9}); tone(140*j,.1,{type:'sawtooth',vol:.13,to:50}); tone(70,.12,{type:'sine',vol:.10,to:34}); },
  sniper:  () => { noise(.012,{vol:.24,type:'highpass',cutoff:8000}); noise(.22,{vol:.34,cutoff:3600,cutoffTo:180,curve:1.4,q:1.2}); tone(220,.2,{type:'sawtooth',vol:.18,to:52}); tone(70,.3,{type:'sine',vol:.22,to:28}); noise(.34,{vol:.14,cutoff:1000,cutoffTo:150,curve:1.1,delay:.06}); },
  // --- impacts ---
  hit:     () => { noise(.05,{vol:.11,cutoff:2200,cutoffTo:700,curve:2}); tone(200,.05,{type:'square',vol:.05,to:110}); },
  zdeath:  () => { noise(.18,{vol:.16,cutoff:1500,cutoffTo:200,curve:1.5}); tone(150,.2,{type:'sawtooth',vol:.12,to:40,filter:'lowpass',cutoff:900}); },
  hurt:    () => { tone(220,.22,{type:'sawtooth',vol:.2,to:58,filter:'lowpass',cutoff:1400,q:2}); noise(.12,{vol:.14,cutoff:1600,cutoffTo:300}); },
  melee:   () => { noise(.09,{vol:.16,cutoff:5200,cutoffTo:800,curve:2,q:1}); tone(320,.07,{type:'triangle',vol:.07,to:880}); },
  // --- pickups ---
  coin:    () => { tone(1180,.06,{type:'square',vol:.10,to:1760}); tone(1760,.10,{type:'sine',vol:.08,delay:.05}); },
  heal:    () => { tone(523,.10,{type:'sine',vol:.12}); tone(659,.10,{type:'sine',vol:.12,delay:.08}); tone(880,.16,{type:'sine',vol:.12,delay:.16}); },
  ammo:    () => { tone(300,.06,{type:'square',vol:.10}); tone(440,.08,{type:'square',vol:.10,delay:.06}); tone(660,.09,{type:'square',vol:.09,delay:.13}); },
  // --- actions ---
  reload:  () => { noise(.04,{vol:.11,cutoff:3000,curve:2}); tone(300,.05,{type:'square',vol:.08,delay:.02}); noise(.05,{vol:.13,cutoff:2200,curve:2,delay:.16}); tone(520,.07,{type:'square',vol:.09,delay:.18}); },
  dodge:   () => { tone(500,.18,{type:'sine',vol:.12,to:1300}); noise(.16,{vol:.07,cutoff:900,cutoffTo:3000,curve:1.5}); },
  wave:    () => { tone(392,.16,{type:'square',vol:.12}); tone(523,.16,{type:'square',vol:.12,delay:.13}); tone(784,.28,{type:'square',vol:.13,delay:.26}); },
  over:    () => { tone(300,.7,{type:'sawtooth',vol:.2,to:60,filter:'lowpass',cutoff:1200}); tone(220,.9,{type:'sine',vol:.16,to:40,delay:.08}); tone(150,1.0,{type:'sine',vol:.16,to:30,delay:.2}); },
  // --- menus ---
  hover:   () => tone(680,.04,{type:'sine',vol:.045,to:780}),
  click:   () => { tone(440,.05,{type:'square',vol:.09,to:660}); tone(880,.05,{type:'square',vol:.04,delay:.03}); },
  open:    () => { tone(330,.10,{type:'sine',vol:.10,to:660}); tone(660,.12,{type:'sine',vol:.08,to:990,delay:.06}); },
  back:    () => { tone(560,.09,{type:'sine',vol:.08,to:330}); },
  buy:     () => { tone(523,.07,{type:'square',vol:.10,to:784}); tone(784,.11,{type:'sine',vol:.09,to:1046,delay:.06}); noise(.05,{vol:.05,cutoff:3200,curve:2}); },
  error:   () => { tone(180,.12,{type:'square',vol:.11,to:120}); tone(140,.16,{type:'square',vol:.10,to:90,delay:.08}); },
  start:   () => { tone(392,.12,{type:'square',vol:.12}); tone(523,.12,{type:'square',vol:.12,delay:.1}); tone(659,.12,{type:'square',vol:.12,delay:.2}); tone(880,.3,{type:'square',vol:.13,delay:.3}); },
  swap:    (toMelee) => tone(toMelee?420:640,.06,{type:'square',vol:.08,to:toMelee?320:780}),
  // --- grenades ---
  nadeThrow:() => { noise(.14,{vol:.10,cutoff:1500,cutoffTo:480,curve:1.5}); tone(280,.12,{type:'sine',vol:.06,to:620}); },
  boom:    () => { noise(.42,{vol:.42,cutoff:1300,cutoffTo:55,curve:1.3,q:1}); tone(95,.4,{type:'sawtooth',vol:.24,to:30}); tone(48,.52,{type:'sine',vol:.22,to:22}); },
  fire:    () => { noise(.55,{vol:.18,cutoff:1900,cutoffTo:360,curve:1.2}); tone(140,.4,{type:'sawtooth',vol:.10,to:60}); },
  freeze:  () => { tone(1000,.34,{type:'sine',vol:.13,to:320}); tone(660,.3,{type:'sine',vol:.08,to:240,delay:.05}); noise(.22,{vol:.08,cutoff:5200,cutoffTo:1400}); },
  gas:     () => { noise(.6,{vol:.16,cutoff:1100,cutoffTo:260,curve:1.1,q:.6}); tone(180,.3,{type:'sine',vol:.06,to:90}); },
  // --- bosses ---
  bossRoar:  () => { tone(92,.55,{type:'sawtooth',vol:.30,to:46}); tone(58,.7,{type:'sine',vol:.26,to:28,delay:.05}); noise(.45,{vol:.18,cutoff:820,cutoffTo:120,curve:1.3}); },
  bossSlam:  () => { noise(.42,{vol:.4,cutoff:1100,cutoffTo:50,curve:1.3,q:1}); tone(80,.42,{type:'sawtooth',vol:.24,to:26}); tone(44,.52,{type:'sine',vol:.22,to:20}); },
  bossSpit:  () => { noise(.18,{vol:.16,cutoff:1800,cutoffTo:380,curve:1.5}); tone(340,.16,{type:'sawtooth',vol:.12,to:90}); },
  bossSummon:() => { tone(170,.32,{type:'sine',vol:.14,to:540}); tone(90,.42,{type:'sawtooth',vol:.12,to:240,delay:.05}); noise(.18,{vol:.07,cutoff:2600,curve:2}); },
};

// Wire up SFX references into WEAPONS (sfx was null at definition time in constants.js)
function wireSFX() {
  WEAPONS.pistol.sfx  = SFX.pistol;
  WEAPONS.smg.sfx     = SFX.smg;
  WEAPONS.shotgun.sfx = SFX.shotgun;
  WEAPONS.assault.sfx = SFX.assault;
  WEAPONS.magnum.sfx  = SFX.magnum;
  WEAPONS.rifle.sfx   = SFX.rifle;
  WEAPONS.lmg.sfx     = SFX.lmg;
  WEAPONS.sniper.sfx  = SFX.sniper;
}
