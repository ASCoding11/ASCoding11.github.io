/*
 * Lanternhold: the Wardrobe. HIDDEN (captains only for now: LH_PUBLIC and wardOn() in index.html).
 *
 * index.html fetches this file only when something needs it: this player may open the Wardrobe (a captain's account,
 * LH_PUBLIC, or the test address ?wardrobe=1 on localhost or in an automated browser), or a teammate wears something (a
 * `cz` field in their node). Everyone else never loads it, and the game looks exactly as it did.
 * The page calls window.LanternWardrobe(A) once with the short list of things it lends (wdApi in index.html) and gets
 * back the hooks it calls: bannerParts() while building a tower's mesh, build() for a tower's build burst, lantern()
 * after the world is built, flame() each frame, and sync() when wardOn() may have changed.
 *
 * Four slots; a kit is four item numbers [banner, lantern, flame, burst], 0 for none: the `no` of Lanternhold's items in
 * ../cosmetics.js (which also holds their rarity and a line of text). What a number LOOKS like is decided here: the lists
 * below are in number order and their names match cosmetics.js. A number this file doesn't know draws the usual look.
 * Never reorder a list: add new ones at the end.
 *   Banners   a small flag on a pole at the back corner of every tower YOU build, seen by everyone. It is baked into the
 *             tower's base mesh (vertex colours), so a tower is still one draw call; the tower's shape, its head, the
 *             owner's colour band and the level gems are untouched, so every tower reads exactly as before.
 *   Lanterns  the lantern's stand and cage on YOUR screen only (the lantern is shared, so nobody else's changes). The
 *             flame, its halo and its light stay where they are and the same size; it's still one mesh.
 *   Flames    the flame's and halo's colour on YOUR screen only. The halo's size, the flicker when lives run low and the
 *             red flash when the Gloom gets through are the same; the light it casts on the board is NOT recoloured, so
 *             the board, the towers and the Gloom look exactly as bright as before.
 *   Bursts    the puff when YOU build or upgrade a tower, seen by everyone; the same particles as the usual puff.
 * Saved in this browser as lanternhold:wardrobe ('banner.lantern.flame.burst'); sent in the player's own node as cz,
 * 'banner.burst' (what others see), only while one of those is worn. Looks only: no rule, range, hit or wave changes.
 */
window.LanternWardrobe=function(A){
'use strict';
const THREE=A.THREE,$=A.$,{P,merge,Cyl,Sph,Box,Cone,C}=A,PI=Math.PI;
const Tor=(r,t,rs,ts)=>new THREE.TorusGeometry(r,t,rs||6,ts||16);
const Oct=r=>new THREE.OctahedronGeometry(r);

// =====================================================================
//  Banners: a 56 × 36 flag (centre origin, y up); shapes in drawing order:
//  ['r', x, y, w, h, colour, turn]  a rectangle   ['c', x, y, r, colour, sides]  a disc   ['e', x, y, rx, ry, colour]
// =====================================================================
const checks=(()=>{const a=[];for(let r=0;r<4;r++)for(let c=0;c<7;c++)if((r+c)%2)a.push(['r',-24+c*8,13.5-r*9,8,9,'#15151A']);return a})();
const BANNERS=[
  ['Soccer Pennant','common','#FFFFFF',[['r',0,-14,56,8,'#2E9A4A'],['c',0,3,10,'#15151A',6],['c',0,3,4,'#FFFFFF',6]]],
  ['Basketball Pennant','common','#F0822A',[['r',0,0,56,2.6,'#2A1408'],['r',0,0,2.6,36,'#2A1408'],['r',-15,0,2.4,38,'#2A1408',.35],['r',15,0,2.4,38,'#2A1408',-.35]]],
  ['Gridiron Pennant','uncommon','#2F8A3E',[['r',-27,0,10,36,'#1F4FB8'],['r',-18,0,1.6,36,'#FFFFFF'],['r',-6,0,1.6,36,'#FFFFFF'],['r',6,0,1.6,36,'#FFFFFF'],['r',18,0,1.6,36,'#FFFFFF'],['e',2,0,9,5.5,'#8A4A22'],['r',2,0,8,1.2,'#FFFFFF']]],
  ['Baseball Pennant','common','#22315F',[['c',0,0,12,'#F4F1E8',14],['r',-6,4,1.4,3,'#D7262F',.5],['r',-7,0,1.4,3,'#D7262F'],['r',-6,-4,1.4,3,'#D7262F',-.5],['r',6,4,1.4,3,'#D7262F',-.5],['r',7,0,1.4,3,'#D7262F'],['r',6,-4,1.4,3,'#D7262F',.5]]],
  ['Hockey Pennant','common','#F7F7F2',[['r',0,13,56,5,'#C42D3A'],['r',0,-13,56,5,'#C42D3A'],['r',0,0,2.6,26,'#1F4FB8'],['c',0,0,6,'#1F4FB8',12],['c',0,0,3.6,'#F7F7F2',12]]],
  ['Checkered Flag','uncommon','#FFFFFF',checks],
  ['Golf Pin','rare','#D7262F',[['r',0,-15,56,6,'#2E9A4A'],['c',-8,2,8,'#FFFFFF',12],['c',-10,4,1.2,'#D5DAE2',6],['c',-6,4,1.2,'#D5DAE2',6],['c',-8,0,1.2,'#D5DAE2',6],['r',12,2,2,16,'#FFFFFF'],['r',16,7,8,6,'#FFD23F']]],
  ['Gear Banner','uncommon','#5E6874',(()=>{const a=[];for(let k=0;k<8;k++){const t=k*PI/4;a.push(['r',Math.cos(t)*11,Math.sin(t)*11,5,5,'#FFD23F',t])}a.push(['c',0,0,10,'#FFD23F',16],['c',0,0,4,'#5E6874',10]);return a})()],
  ['Jolly Roger','epic','#15151A',[['r',0,-6,30,3.4,'#F4F4F0',.6],['r',0,-6,30,3.4,'#F4F4F0',-.6],['c',0,4,8,'#F4F4F0',14],['r',0,-2.6,8,4.4,'#F4F4F0'],['r',0,7.5,20,1.3,'#15151A',-.3],['c',-3.2,5,2.8,'#15151A',10],['c',3.2,5,1.8,'#15151A',8]]],
  ["Ship's Wheel",'rare','#1F3F8A',[['c',0,0,12,'#E6B84A',18],['c',0,0,9,'#1F3F8A',18],['r',0,0,32,2.6,'#E6B84A'],['r',0,0,32,2.6,'#E6B84A',PI/2],['r',0,0,32,2.6,'#E6B84A',PI/4],['r',0,0,32,2.6,'#E6B84A',-PI/4],['c',0,0,3.6,'#E6B84A',10]]],
  ["The Boss's Banner",'rare','#2C2F38',[['r',-21,0,.9,36,'#8A8FA0'],['r',-14,0,.9,36,'#8A8FA0'],['r',-7,0,.9,36,'#8A8FA0'],['r',7,0,.9,36,'#8A8FA0'],['r',14,0,.9,36,'#8A8FA0'],['r',21,0,.9,36,'#8A8FA0'],['r',0,0,13,13,'#D9B25C',PI/4],['r',0,0,7,7,'#2C2F38',PI/4],['r',0,0,3,3,'#D9B25C',PI/4]]],
  ['Royal Crown','legendary','#5A2FA8',[['r',0,-7,24,6,'#FFC93C'],['r',-9,-1,7.5,7.5,'#FFC93C',PI/4],['r',0,1,8.5,8.5,'#FFC93C',PI/4],['r',9,-1,7.5,7.5,'#FFC93C',PI/4],['c',-9,5,1.8,'#FFF2B8',8],['c',0,8,2,'#FFF2B8',8],['c',9,5,1.8,'#FFF2B8',8],['c',0,-7,2.2,'#D7262F',8],['c',-7,-7,1.6,'#3FA9F5',8],['c',7,-7,1.6,'#3FA9F5',8]]]
];
// the pole stands at the back-left of the plinth and the flag flies outwards, beside the tower (never in front of it)
const POLE={x:-.66,z:-.5,top:2.4},FL={x:-.66-.4,y:2.1,z:-.5,s:.0136};
function bannerParts(n,B){
  const b=BANNERS[n-1];if(!b)return;
  B.push(P(Cyl(.035,.04,POLE.top-.36,6),'#5a4632',POLE.x,(POLE.top+.36)/2,POLE.z),P(Sph(.065,6,5),'#f2c14e',POLE.x,POLE.top+.03,POLE.z));
  B.push(P(Box(56*FL.s,36*FL.s,.03),b[2],FL.x,FL.y,FL.z));
  const s=FL.s;let dz=.017;
  for(const sh of b[3]){dz+=.0035;const z=FL.z+dz,x=FL.x+sh[1]*s,y=FL.y+sh[2]*s;
    if(sh[0]==='r')B.push(P(Box(sh[3]*s,sh[4]*s,.004),sh[5],x,y,z,1,1,1,0,0,sh[6]||0));
    else if(sh[0]==='c')B.push(P(Cyl(sh[3]*s,sh[3]*s,.004,sh[5]||12),sh[4],x,y,z,1,1,1,PI/2,0,0));
    else B.push(P(Cyl(sh[3]*s,sh[3]*s,.004,14),sh[5],x,y,z,1,1,sh[4]/sh[3],PI/2,0,0));
  }
}
// the same flag as a little picture (used in the Wardrobe), clipped to the flag
function bannerSvg(n){
  const b=BANNERS[n-1];let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-34 -24 68 48"><defs><clipPath id="f"><rect x="-28" y="-18" width="56" height="36"/></clipPath></defs><rect x="-31.4" y="-22" width="2.4" height="46" fill="#5a4632"/><circle cx="-30.2" cy="-22" r="2.2" fill="#f2c14e"/><g clip-path="url(#f)"><rect x="-28" y="-18" width="56" height="36" fill="'+b[2]+'"/>';
  for(const sh of b[3]){
    if(sh[0]==='r')s+='<rect x="'+(sh[1]-sh[3]/2)+'" y="'+(-sh[2]-sh[4]/2)+'" width="'+sh[3]+'" height="'+sh[4]+'" fill="'+sh[5]+'" transform="rotate('+(-(sh[6]||0)*180/PI)+' '+sh[1]+' '+(-sh[2])+')"/>';
    else if(sh[0]==='c'){const k=sh[5]||12;let pts=[];for(let i=0;i<k;i++){const a=i/k*2*PI+PI/2;pts.push((sh[1]+Math.cos(a)*sh[3]).toFixed(2)+','+(-sh[2]-Math.sin(a)*sh[3]).toFixed(2))}s+='<polygon points="'+pts.join(' ')+'" fill="'+sh[4]+'"/>'}
    else s+='<ellipse cx="'+sh[1]+'" cy="'+(-sh[2])+'" rx="'+sh[3]+'" ry="'+sh[4]+'" fill="'+sh[5]+'"/>';
  }
  return s+'</g><rect x="-28" y="-18" width="56" height="36" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/></svg>';
}

// =====================================================================
//  Lanterns: the stand and the cage, as parts merged into the one lantern mesh. The flame stays at y 2.55.
// =====================================================================
const ring=(r,y,n,h,col,w)=>{const a=[];for(let i=0;i<n;i++){const t=i/n*PI*2;a.push(P(Cyl(w||.04,w||.04,h,4),col,Math.cos(t)*r,y,Math.sin(t)*r))}return a};
const LANTERNS=[
  ['Soccer Ball Cage','common',()=>[P(Cyl(.95,1.05,.3,10),'#3FA24A',0,.15,0),P(Tor(.62,.035,4,24),'#ffffff',0,.31,0,1,1,1,PI/2),P(Cyl(.7,.8,.3,10),'#2E8A3A',0,.45,0),
    P(Cyl(.12,.16,1.55,8),'#f2f2f2',0,1.3,0),P(Cyl(.3,.12,.16,8),'#1a1a1f',0,2.0,0),
    P(Tor(.6,.045,5,22),'#ffffff',0,2.55,0),P(Tor(.6,.045,5,22),'#ffffff',0,2.55,0,1,1,1,PI/2),P(Tor(.6,.045,5,22),'#ffffff',0,2.55,0,1,1,1,PI/2,PI/2),
    ...[[0,1,0],[0,-1,0],[1,0,1],[-1,0,-1],[1,0,-1],[-1,0,1]].map(([x,y,z])=>{const l=Math.hypot(x,y,z);return P(Sph(.1,6,5),'#1a1a1f',x/l*.6,2.55+y/l*.6,z/l*.6)})]],
  ['City Street Lamp','common',()=>[P(Cyl(.5,.72,.4,8),'#22242a',0,.2,0),P(Cyl(.3,.4,.3,8),'#2e3038',0,.55,0),P(Cyl(.09,.13,1.45,8),'#22242a',0,1.4,0),P(Cyl(.32,.18,.14,8),'#22242a',0,2.12,0),
    P(Box(.86,.06,.86),'#c9a23a',0,2.2,0),P(Box(.9,.06,.9),'#c9a23a',0,2.95,0),
    ...[[1,1],[1,-1],[-1,1],[-1,-1]].map(([x,z])=>P(Box(.06,.78,.06),'#22242a',x*.42,2.57,z*.42)),
    P(Cone(.66,.42,4),'#22242a',0,3.19,0,1,1,1,0,PI/4),P(Sph(.09,6,5),'#c9a23a',0,3.45,0)]],
  ['Stadium Floodlight','uncommon',()=>[P(Cyl(.9,1.0,.3,8),'#9a9da3',0,.15,0),P(Cyl(.14,.2,1.8,6),'#c9ced6',0,1.2,0),
    P(Box(1.15,.08,.95),'#5e6874',0,2.12,0),P(Box(1.2,.1,1.0),'#5e6874',0,2.98,0),
    ...[[1,1],[1,-1],[-1,1],[-1,-1]].map(([x,z])=>P(Box(.07,.82,.07),'#5e6874',x*.55,2.55,z*.45)),
    ...[-.36,0,.36].map(x=>P(Box(.24,.14,.24),'#f4f4f0',x,3.1,0)),P(Box(1.0,.04,.04),'#c9ced6',0,2.78,.46),P(Box(1.0,.04,.04),'#c9ced6',0,2.3,.46)]],
  ['Robot Lantern','uncommon',()=>[P(Box(1.6,.32,1.6),'#7e8894',0,.16,0),P(Box(.75,1.45,.75),'#aeb8c4',0,1.05,0),P(Sph(.09,6,5),'#38e8ff',-.18,1.45,.38),P(Sph(.09,6,5),'#38e8ff',.18,1.45,.38),P(Box(.4,.06,.04),'#5e6874',0,1.2,.39),
    ...[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,z])=>P(Sph(.05,5,4),'#5e6874',x*.66,.34,z*.66)),
    P(Box(.95,.1,.95),'#7e8894',0,2.12,0),...[[1,1],[1,-1],[-1,1],[-1,-1]].map(([x,z])=>P(Box(.08,.8,.08),'#7e8894',x*.42,2.56,z*.42)),
    P(Box(1.0,.16,1.0),'#aeb8c4',0,3.02,0),P(Cyl(.03,.03,.55,4),'#5e6874',0,3.35,0),P(Sph(.1,6,5),'#ff4a3a',0,3.66,0)]],
  ['Trophy Cup','rare',()=>{const g='#e8b33a';const cup=new THREE.CylinderGeometry(.68,.32,.62,16,1,true);return[P(Cyl(.95,1.05,.32,8),'#6a3a1a',0,.16,0),P(Cyl(.55,.7,.3,10),g,0,.47,0),P(Cyl(.12,.2,1.0,8),g,0,1.1,0),P(Sph(.2,8,6),g,0,1.62,0),
    P(Cyl(.32,.14,.2,12),g,0,1.82,0),P(cup,g,0,2.2,0),P(Tor(.68,.05,5,22),'#ffe08a',0,2.51,0,1,1,1,PI/2),P(Tor(.22,.05,5,12),g,-.78,2.18,0),P(Tor(.22,.05,5,12),g,.78,2.18,0)]}],
  ["Ship's Lantern",'rare',()=>{const br='#c98a3a';return[P(Cyl(.7,.62,1.15,12),'#8a5a2e',0,.58,0),P(Tor(.68,.04,4,18),'#3a2a1a',0,.25,0,1,1,1,PI/2),P(Tor(.68,.04,4,18),'#3a2a1a',0,.9,0,1,1,1,PI/2),P(Tor(.45,.07,5,14),'#d9c08a',0,1.2,0,1,1,1,PI/2),
    P(Cyl(.08,.08,.95,6),'#5a4632',0,1.6,0),P(Cyl(.55,.6,.16,10),br,0,2.12,0),...ring(.5,2.56,6,.75,br,.035),P(Cyl(.4,.6,.2,10),br,0,3.0,0),P(Cone(.32,.3,10),br,0,3.25,0),P(Tor(.16,.03,4,10),br,0,3.5,0)]}],
  ['Lighthouse','epic',()=>{const a=[P(Cyl(1.0,1.1,.3,10),'#8d8f94',0,.15,0)];const segs=[['#ffffff',.3,.75],['#d7262f',.75,1.2],['#ffffff',1.2,1.65],['#d7262f',1.65,2.05]];
    for(const [c,y0,y1] of segs){const r0=.82-(y0-.3)*.13,r1=.82-(y1-.3)*.13;a.push(P(Cyl(r1,r0,y1-y0,12),c,0,(y0+y1)/2,0))}
    a.push(P(Cyl(.78,.78,.1,12),'#22242a',0,2.1,0),P(Tor(.74,.03,4,22),'#22242a',0,2.32,0,1,1,1,PI/2),...ring(.45,2.55,8,.75,'#22242a',.03),P(new THREE.SphereGeometry(.52,12,6,0,PI*2,0,PI/2),'#d7262f',0,2.94,0),P(Sph(.08,6,5),'#22242a',0,3.5,0));return a}],
  ["Wizard's Crystal",'epic',()=>[P(Cyl(.95,1.05,.3,8),'#6d6680',0,.15,0),P(Cyl(.7,.8,.3,8),'#5c5570',0,.45,0),P(Cyl(.12,.18,1.5,6),'#3b2a6a',0,1.3,0),P(Cyl(.45,.2,.14,6),'#3b2a6a',0,2.05,0),
    ...[0,1,2,3,4].map(i=>{const t=i/5*PI*2;return P(Oct(.18),i%2?'#b48bff':'#8ee6ff',Math.cos(t)*.58,2.5,Math.sin(t)*.58,.8,2.2,.8,Math.sin(t)*.25,0,-Math.cos(t)*.25)}),P(Oct(.22),'#d6b8ff',0,3.25,0,.8,2,.8)]],
  ['Golden Crown','legendary',()=>{const g='#ffc93c';return[P(Cyl(.95,1.05,.3,10),'#5a2fa8',0,.15,0),P(Tor(.95,.05,4,24),g,0,.3,0,1,1,1,PI/2),P(Cyl(.65,.75,.3,10),'#4a2690',0,.45,0),P(Cyl(.12,.16,1.55,8),g,0,1.35,0),
    P(Tor(.58,.08,6,24),g,0,2.18,0,1,1,1,PI/2),...[0,1,2,3,4,5,6,7].map(i=>{const t=i/8*PI*2;return P(Cone(.12,.55,4),g,Math.cos(t)*.58,2.5,Math.sin(t)*.58)}),
    ...[0,1,2,3,4,5,6,7].map(i=>{const t=i/8*PI*2;return P(Sph(.06,6,5),'#fff2b8',Math.cos(t)*.58,2.8,Math.sin(t)*.58)}),
    ...[0,1,2,3].map(i=>{const t=(i+.5)/4*PI*2;return P(Sph(.08,6,5),i%2?'#3fa9f5':'#d7262f',Math.cos(t)*.64,2.18,Math.sin(t)*.64)})]}]
];
// =====================================================================
//  Flame colours: [name, rarity, flame, halo] (Rainbow turns through the colours)
// =====================================================================
const FLAMES=[['Ice Blue','common','#bff1ff','#4fb8ff'],['Emerald','uncommon','#c4ffc8','#3fdb7a'],['Rose','uncommon','#ffd0e6','#ff5fa8'],['Violet','rare','#ead6ff','#9a5cff'],['Rainbow','epic','','']];
const BURSTS=[['Confetti','common',['#ff4f8b','#3fa9f5','#ffd23f','#5fd068']],['Gold Coins','uncommon',['#ffc93c','#fff2b8']],['Circuit Sparks','rare',['#38e8ff','#ff9a3a']],['Fireworks','epic',['#ff4f8b','#3fd2ff','#ffd23f']]];
const LISTS=[BANNERS,LANTERNS,FLAMES,BURSTS],SLOTS=['banner','lantern','flame','burst'];

// =====================================================================
//  What is worn
// =====================================================================
const norm=k=>LISTS.map((L,i)=>{const n=+k[i]|0;return n>0&&n<=L.length?n:0});
let kit=norm(String(A.store.get('wardrobe','')||'').split('.'));
function save(){A.store.set('wardrobe',kit.join('.'))}
function mine(){return A.wardOn()?kit:null}
function wire(){const k=mine();return k&&(k[0]||k[3])?k[0]+'.'+k[3]:''}
function parse(raw){if(typeof raw!=='string'||!/^\d{1,3}\.\d{1,3}$/.test(raw))return null;const p=raw.split('.').map(Number);const w=[p[0]<=BANNERS.length?p[0]:0,0,0,p[1]<=BURSTS.length?p[1]:0];return w[0]||w[3]?w:null}

// the lantern on this screen: swaps the lantern mesh's geometry (the usual one is kept to put back)
function lantern(core){
  if(!core||!core.body)return;const k=mine(),n=k?k[1]:0;
  if(core.wdN===n)return;
  if(core.body.geometry!==core.geo0)core.body.geometry.dispose();
  core.body.geometry=n?merge(LANTERNS[n-1][2]()):core.geo0;core.wdN=n;
}
const _f=new THREE.Color(),_h=new THREE.Color();
// the flame's and halo's colours for this frame, or null for the usual ones
function flame(t){
  const k=mine(),n=k?k[2]:0;if(!n)return null;
  if(n===5){_f.setHSL((t*.12)%1,.9,.82).convertSRGBToLinear();_h.setHSL((t*.12+.04)%1,.95,.6).convertSRGBToLinear();return{f:_f,h:_h}}
  _f.copy(C(FLAMES[n-1][2]));_h.copy(C(FLAMES[n-1][3]));return{f:_f,h:_h};
}
// a build or upgrade puff in this tower owner's burst (the ring stays the usual one)
function build(n,x,z,up){
  const b=BURSTS[n-1];if(!b)return false;const c=b[2];
  if(n===4){c.forEach((col,i)=>{A.burst(x+(i-1)*.5,2.6+i*.3,z,col,9,3.2,.35,.6,1)});A.burst(x,.6,z,'#fff2b8',8,2.5,.3,.4,6);return true}
  const per=Math.ceil((up?18:14)/c.length);c.forEach(col=>A.burst(x,.6,z,col,per,n===2?3.6:n===3?4.2:3.2,n===3?.28:.38,n===3?.38:.55,n===2?8:6));return true;
}

// =====================================================================
//  The Wardrobe screen. Pictures of banners and lanterns are rendered once with the game's renderer.
// =====================================================================
const CSS=`
#wdOpen{margin-top:10px;height:40px;padding:0 16px;border-radius:12px;font-weight:900;font-size:15px;background:var(--paper-2);color:var(--ink)}
#wd .card{max-width:860px;display:flex;flex-direction:column;max-height:calc(100dvh - 40px)}
.wd-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.wd-head h2{margin:0!important}
.wd-sub{margin:2px 0 10px;font-weight:800;font-size:13px;color:var(--ink-2)}
.wd-note{margin:8px 0;font-weight:700;font-size:13px;color:var(--ink-2);line-height:1.35}
.wd-tabs{flex-wrap:wrap;align-self:flex-start}
.wd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;overflow:auto;min-height:0;padding:2px 2px 8px;align-content:start;flex:1 1 auto}
.wd-grid button{display:flex;flex-direction:column;align-items:center;gap:4px;border:2px solid var(--line);border-radius:14px;background:#fff;padding:6px 4px 7px;font-weight:900;font-size:12px;line-height:1.15;color:var(--ink);min-width:0}
.wd-grid button.on{border-color:var(--amber);background:#fff4dc}
.wd-grid img{width:84px;height:84px;object-fit:contain}
.wd-grid .fl{width:84px;height:84px;border-radius:50%}
.wd-grid em{font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-style:normal}
.r-common{color:#6b7684}.r-uncommon{color:#1d9c63}.r-rare{color:#2a74d0}.r-epic{color:#8a4ad8}.r-legendary{color:#b97a00}
@media (max-width:640px){.wd-grid{grid-template-columns:repeat(auto-fill,minmax(88px,1fr))}.wd-grid img,.wd-grid .fl{width:68px;height:68px}}
@media (max-height:520px){.wd-sub{display:none}.wd-grid{grid-template-columns:repeat(auto-fill,minmax(86px,1fr))}.wd-grid img,.wd-grid .fl{width:58px;height:58px}.wd-note{margin:4px 0}}
`;
const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
const TABS=[['Banners','A flag on every tower you build, for the whole team. The tower itself looks the same.'],
  ['Lanterns','The lantern on your own screen. The flame and its glow stay just the same size.'],
  ['Flames','The flame\'s colour on your own screen. It still flickers when lives run low and flashes red when the Gloom gets through.'],
  ['Bursts','The puff when you build or upgrade a tower, seen by the whole team.']];
const NONE=['No banner','Usual lantern','Usual flame','Usual puff'];
let PS=null;const pics={};
function stage(){
  if(PS)return PS;const scene=new THREE.Scene();scene.background=new THREE.Color('#e9e2d2');
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a7d6a,.9));const d=new THREE.DirectionalLight(0xffffff,1.1);d.position.set(3,6,5);scene.add(d);
  const cam=new THREE.PerspectiveCamera(30,1,.1,60),rt=new THREE.WebGLRenderTarget(168,168);rt.texture.encoding=THREE.sRGBEncoding;return(PS={scene,cam,rt});
}
function shot(obj,look,dist){
  const S=stage(),R=A.renderer;S.scene.add(obj);S.cam.position.set(0,look+dist*.45,dist);S.cam.lookAt(0,look,0);
  const prev=R.getRenderTarget(),sh=R.shadowMap.autoUpdate;R.shadowMap.autoUpdate=false;let url='';
  try{R.setRenderTarget(S.rt);R.render(S.scene,S.cam);const w=168,h=168,px=new Uint8Array(w*h*4);R.readRenderTargetPixels(S.rt,0,0,w,h,px);
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),id=x.createImageData(w,h);for(let y=0;y<h;y++)id.data.set(px.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);x.putImageData(id,0,0);url=c.toDataURL()}
  catch(e){console.error(e)}finally{R.setRenderTarget(prev);R.shadowMap.autoUpdate=sh;S.scene.remove(obj);obj.traverse(o=>{if(o.isMesh)o.geometry.dispose()})}
  return url;
}
function pic(s,n){
  const k=s+':'+n;if(pics[k])return pics[k];let url='';
  if(s===0){if(!n){const m=A.towerMesh('bolt',1,A.myColor(),false,0);url=shot(m.g,1.15,6.2)}else{const m=A.towerMesh('bolt',1,A.myColor(),false,n);m.g.position.x=.45;url=shot(m.g,1.25,6.4)}}
  else if(s===1){const g=new THREE.Group();g.add(new THREE.Mesh(n?merge(LANTERNS[n-1][2]()):A.lanternGeo(),A.matLit));const f=new THREE.Mesh(Sph(.32,10,8),new THREE.MeshBasicMaterial({color:C('#ffd27a'),toneMapped:false}));f.position.y=2.55;g.add(f);url=shot(g,1.85,8.2)}
  return(pics[k]=url);
}
function tile(s,n){
  if(s===2){const d=document.createElement('span');d.className='fl';const f=n?FLAMES[n-1]:['','','#ffd27a','#ffb14a'];
    d.style.background=n===5?'radial-gradient(circle,#fff 0 14%,transparent 15%),conic-gradient(#ff5f6a,#ffd23f,#5fd068,#3fa9f5,#b46cff,#ff5f6a)':'radial-gradient(circle,'+f[2]+' 0 22%,'+f[3]+' 46%,rgba(255,255,255,0) 72%),#2a2152';return d}
  const i=document.createElement('img');i.alt='';
  if(s===3){const c=n?BURSTS[n-1][2]:['#e9dcc3'];let v='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84"><rect width="84" height="84" rx="12" fill="#2a2152"/><ellipse cx="42" cy="60" rx="24" ry="7" fill="none" stroke="#fff" stroke-width="2"/>';
    for(let k=0;k<16;k++){const a=-PI*(.1+.8*(k/15)),r=14+(k*7)%18;v+='<circle cx="'+(42+Math.cos(a)*r*1.3).toFixed(1)+'" cy="'+(56+Math.sin(a)*r*1.4).toFixed(1)+'" r="'+(n===3?2:3)+'" fill="'+c[k%c.length]+'"/>'}
    i.src='data:image/svg+xml,'+encodeURIComponent(v+'</svg>');return i}
  i.src=pic(s,n);return i;
}
let tab=0,built=false,isOpen=false;
function build_(){
  if(built)return;built=true;
  const sec=document.createElement('div');sec.id='wd';sec.className='ov dim';sec.hidden=true;
  sec.innerHTML='<div class="card" role="dialog" aria-modal="true" aria-labelledby="wdTitle"><div class="wd-head"><h2 id="wdTitle">Wardrobe</h2><button class="big" id="wdDone" type="button" style="height:42px">Done</button></div>'+
    '<p class="wd-sub">Captains only for now. Everything is free to wear, and only changes how things look.</p>'+
    '<div class="seg wd-tabs" id="wdTabs" role="group" aria-label="Wardrobe sections">'+TABS.map((t,i)=>'<button type="button" data-t="'+i+'">'+t[0]+'</button>').join('')+'</div>'+
    '<p class="wd-note" id="wdNote"></p><div class="wd-grid" id="wdGrid"></div></div>';
  document.body.appendChild(sec);
  $('wdDone').onclick=close;sec.addEventListener('pointerdown',e=>{if(e.target===sec)close()});
  sec.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
  for(const b of $('wdTabs').children)b.onclick=()=>{tab=+b.dataset.t;fill()};
}
function fill(){
  for(const b of $('wdTabs').children)b.classList.toggle('on',+b.dataset.t===tab);
  $('wdNote').textContent=TABS[tab][1];
  const L=LISTS[tab],g=$('wdGrid');g.innerHTML='';
  for(let n=0;n<=L.length;n++){const b=document.createElement('button');b.type='button';b.dataset.n=n;if(kit[tab]===n)b.className='on';b.setAttribute('aria-pressed',String(kit[tab]===n));b.appendChild(tile(tab,n));
    const sp=document.createElement('span');sp.textContent=n?L[n-1][0]:NONE[tab];b.appendChild(sp);
    if(n){const em=document.createElement('em');em.className='r-'+L[n-1][1];em.textContent=L[n-1][1][0].toUpperCase()+L[n-1][1].slice(1);b.appendChild(em)}
    b.onclick=()=>{kit[tab]=n;save();fill();A.changed()};g.appendChild(b)}
}
function open(){if(!A.wardOn())return;build_();isOpen=true;$('wd').hidden=false;fill();setTimeout(()=>{const b=$('wdGrid').querySelector('.on')||$('wdDone');try{b.focus({preventScroll:true})}catch(e){}},0)}
function close(){if(!isOpen)return;isOpen=false;$('wd').hidden=true;const b=$('wdOpen');if(b)try{b.focus()}catch(e){}}
function sync(){
  let b=$('wdOpen');
  if(A.wardOn()){if(!b){b=document.createElement('button');b.id='wdOpen';b.type='button';b.textContent='Wardrobe';b.onclick=open;$('swatches').closest('.row').after(b)}b.hidden=false}
  else{if(b)b.hidden=true;close()}
}
sync();
return{mine,wire,parse,bannerParts,bannerSvg,lantern,flame,build,sync,open,close,LISTS,SLOTS,get kit(){return kit.slice()},
  lanternParts:n=>LANTERNS[n-1][2](),
  wear(slot,n){const i=SLOTS.indexOf(slot);if(i<0)return;kit[i]=n>0&&n<=LISTS[i].length?n:0;save();if(built&&isOpen)fill();A.changed()}};
};
