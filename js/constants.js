"use strict";
// ============================================================ SETTINGS
const SETTINGS = Object.assign(
  { sound: true, shake: true },
  (() => { try { return JSON.parse(localStorage.getItem('zsurv_settings') || '{}'); } catch(e) { return {}; } })()
);
function saveSettings() { try { localStorage.setItem('zsurv_settings', JSON.stringify(SETTINGS)); } catch(e) {} }

// ============================================================ MAP
const GW = 5, GH = 5;
const mulberry32 = a => () => {
  a|=0; a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;
};
const zoneSeed = (cx, cy) => (((cx+1)*73856093)^((cy+1)*19349663)^0x9e3779b9)>>>0;

// ============================================================ WEAPONS
const WEAPONS = {
  pistol:  { name:'Pistola',          dmg:26,  rate:230,  spread:.03,  speed:11, mag:Infinity, reload:0,    pellets:1, sfx:null, color:'#ffe27a', unlocked:true,  auto:false, desc:'Fiable, munición infinita.',              cost:0,   minWave:0 },
  smg:     { name:'Subfusil',          dmg:16,  rate:75,   spread:.10,  speed:12, mag:35,       reload:1100, pellets:1, sfx:null, color:'#9fd6ff', auto:true,       desc:'Cadencia altísima, ideal para hordas.',   cost:90,  minWave:2 },
  shotgun: { name:'Escopeta',          dmg:15,  rate:620,  spread:.26,  speed:10, mag:6,        reload:1500, pellets:8, sfx:null, color:'#ffb347', auto:false,      desc:'Demoledora a corta distancia.',           cost:170, minWave:3 },
  assault: { name:'Fusil de Asalto',   dmg:30,  rate:95,   spread:.06,  speed:15, mag:30,       reload:1400, pellets:1, sfx:null, color:'#c0ff8a', auto:true,       desc:'Automático versátil, buen equilibrio.',   cost:240, minWave:4 },
  magnum:  { name:'Magnum',            dmg:118, rate:660,  spread:.02,  speed:17, mag:6,        reload:1300, pellets:1, sfx:null, color:'#ffd27a', pierce:1, auto:false, desc:'Revólver devastador de un solo tiro.', cost:300, minWave:4 },
  rifle:   { name:'Rifle',             dmg:78,  rate:520,  spread:.012, speed:18, mag:8,        reload:1700, pellets:1, sfx:null, color:'#ff6ec7', pierce:2, auto:false, desc:'Perfora zombis a larga distancia.',    cost:320, minWave:5 },
  lmg:     { name:'Ametralladora',     dmg:22,  rate:55,   spread:.14,  speed:13, mag:120,      reload:2600, pellets:1, sfx:null, color:'#ff9a5c', auto:true,       desc:'Cargador enorme, riega la horda.',        cost:480, minWave:7 },
  sniper:  { name:'Francotirador',     dmg:240, rate:1150, spread:.004, speed:28, mag:5,        reload:2000, pellets:1, sfx:null, color:'#7af0ff', pierce:5, auto:false, desc:'Atraviesa toda una fila de un disparo.', cost:560, minWave:8 },
};
const WORDER = ['pistol','smg','shotgun','assault','magnum','rifle','lmg','sniper'];

// ============================================================ MELEE
const MELEE = {
  knife:   { name:'Cuchillo', dmg:46,  range:50, arc:1.7,  cd:430, knock:16, color:'#cfd6dd', shape:'knife',   desc:'Rápido y fiable, de serie.',         cost:0,   minWave:0, unlocked:true  },
  machete: { name:'Machete',  dmg:88,  range:60, arc:1.9,  cd:470, knock:22, color:'#b9c2cc', shape:'machete', desc:'Más daño y alcance.',                cost:130, minWave:2, unlocked:false },
  spear:   { name:'Lanza',    dmg:96,  range:96, arc:0.85, cd:560, knock:30, color:'#d8c089', shape:'spear',   desc:'Largo alcance, arco estrecho.',      cost:200, minWave:3, unlocked:false },
  katana:  { name:'Katana',   dmg:112, range:74, arc:1.7,  cd:380, knock:24, color:'#e2e8ef', shape:'katana',  desc:'Cortes rápidos y amplios.',          cost:240, minWave:4, unlocked:false },
  axe:     { name:'Hacha',    dmg:155, range:56, arc:1.55, cd:720, knock:38, color:'#c98b5a', shape:'axe',     desc:'Demoledora pero lenta.',             cost:280, minWave:4, unlocked:false },
  sledge:  { name:'Mazo',     dmg:205, range:60, arc:2.0,  cd:880, knock:62, color:'#9aa4ad', shape:'sledge',  desc:'Empuje brutal, muy lento.',          cost:430, minWave:6, unlocked:false },
};
const MORDER = ['knife','machete','spear','katana','axe','sledge'];

// ============================================================ GRENADES
const GRENADES = {
  frag:    { name:'Fragmentación', icon:'💣', mode:'burst', dmg:130, radius:120, knock:46, color:'#ffcf6a', sfx:'boom',
             desc:'Explosión instantánea que daña y empuja a todo alrededor.', cost:55,  qty:3, minWave:0 },
  molotov: { name:'Incendiaria',   icon:'🔥', mode:'field', tickDmg:24, radius:96,  duration:3200, tickEvery:300, slow:0,   color:'#ff7a2a', sfx:'fire',
             desc:'Crea un charco de fuego que quema a quien lo pisa.',        cost:75,  qty:3, minWave:2 },
  cryo:    { name:'Criogénica',    icon:'❄️', mode:'field', tickDmg:7,  radius:112, duration:3000, tickEvery:260, slow:900, color:'#7af0ff', sfx:'freeze',
             desc:'Nube helada: ralentiza a los zombis y los va dañando.',     cost:90,  qty:3, minWave:3 },
  toxic:   { name:'Tóxica',        icon:'☣️', mode:'field', tickDmg:34, radius:100, duration:3600, tickEvery:300, slow:0,   color:'#9be36b', sfx:'gas',
             desc:'Nube de gas venenoso con el daño por segundo más alto.',    cost:105, qty:3, minWave:4 },
};
const GORDER = ['frag','molotov','cryo','toxic'];

// ============================================================ ZOMBIE TYPES
const ZT = {
  walker:  { hp:46,  speed:.95, r:15, dmg:9,  color:'#6a8f3c', cloth:'#3c4a5a', coin:3,  points:1 },
  runner:  { hp:30,  speed:2.0, r:12, dmg:7,  color:'#9fbf4c', cloth:'#6a4030', coin:2,  points:1 },
  tank:    { hp:240, speed:.6,  r:26, dmg:22, color:'#3e5a24', cloth:'#2a2d2a', coin:12, points:3 },
  spitter: { hp:60,  speed:.85, r:15, dmg:8,  color:'#b06ad0', cloth:'#3a2a52', coin:5,  points:2, ranged:true },
  dog:     { hp:28,  speed:2.7, r:12, dmg:8,  color:'#7a5a34', cloth:'#4a3420', coin:3,  points:1 },
};

// ============================================================ BOSSES
const BOSSES = [
  { key:'brute',  name:'EL COLOSO',     color:'#5c7a2e', accent:'#b6f24a', r:48, hp:1250, speed:.72, dmg:30, coin:140, points:40 },
  { key:'plague', name:'LA PLAGA',      color:'#7a3ca0', accent:'#cf6aff', r:42, hp:1050, speed:.95, dmg:18, coin:150, points:42 },
  { key:'necro',  name:'EL NIGROMANTE', color:'#7a142c', accent:'#ff4060', r:42, hp:950,  speed:.85, dmg:20, coin:170, points:45 },
];

// ============================================================ SHOP UPGRADES
const SHOP_ITEMS = [
  { id:'heal',  t:'Botiquín',      d:'Restaura vida al máximo.',            cost:()=>30,                   can:()=>G.player.hp<G.player.maxhp, apply:()=>{ G.player.hp=G.player.maxhp; } },
  { id:'maxhp', t:'Vida Máx +25',  d:'Aumenta la vida máxima y cura.',     cost:()=>40+G.up.maxhp*25,                                          apply:()=>{ G.player.maxhp+=25; G.player.hp=G.player.maxhp; G.up.maxhp++; } },
  { id:'dmg',   t:'Daño +20%',     d:'Todas las armas pegan más fuerte.',  cost:()=>45+G.up.dmg*30,                                             apply:()=>{ G.mult.dmg+=0.2; G.up.dmg++; } },
  { id:'fire',  t:'Cadencia +12%', d:'Disparas más rápido.',               cost:()=>45+G.up.fire*30,                                            apply:()=>{ G.mult.fireRate*=0.88; G.up.fire++; } },
  { id:'speed', t:'Velocidad +12%',d:'Te mueves más rápido.',              cost:()=>35+G.up.speed*25,                                           apply:()=>{ G.player.speed*=1.12; G.up.speed++; } },
  { id:'coin',  t:'Monedas +25%',  d:'Los zombis sueltan más oro.',        cost:()=>40+G.up.coin*30,                                            apply:()=>{ G.mult.coin+=0.25; G.up.coin++; } },
];
