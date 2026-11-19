/*
 * Backrooms 1v1–4v4: the Locker. Outfits, gun skins, build skins, elimination effects and round-win celebrations, all
 * drawn here in code.
 *
 * NOT PUBLIC YET. index.html fetches this file only when something needs it:
 *   - this player may see the Locker (X.on: BR_PUBLIC in index.html, or the account signed in is one of the site's
 *     captains (../captains.js), or ?locker=1 on localhost / in an automated browser). X.on can change while the page is
 *     open: index.html then calls access();
 *   - or another player in the room arrives wearing something (their node's lk). Then this file only draws them: no
 *     Locker button, nothing of this player's own is read, worn or sent, and the Entity stays plain.
 * For everyone else this file is never loaded, nothing here runs, and the game is exactly as it was.
 *
 * While the shop is not open (../cosmetics.js is off), nothing is owned or bought: a player who may see the Locker finds
 * every item free to wear, saved by the game as br1v1-kit (the wire string below). Once the shop is open, what is worn
 * is what the shop's locker has equipped for 'backrooms-1v1'.
 *
 * Online. What a player wears travels in their own room node as `lk`: a letter per slot and the item's number,
 * e.g. "o12g3c2" (o outfit, g gun skin, b build skin, e elimination effect, c celebration; the numbers are the `no` of the
 * items in ../cosmetics.js). It is only sent while something is worn. Pages from before the Locker ignore it; here every
 * part is checked against the lists below, and an unknown number draws the plain default for that slot, so an older copy
 * of this file copes with newer items. Never reorder a list: add new ones at the end, with the same number in cosmetics.js.
 *
 * LOOKS ONLY, and fair in a ranked game. Nothing here is read by movement, shots, hits, damage or the bots:
 *   outfits: every outfit is the plain suit's own boxes (legs, body, head, arms; same size) with things added on the
 *     surface, and every one keeps a pack on its back the size of the plain suit's air tank, so no outfit is ever drawn
 *     smaller than the plain suit; hats only add height. The body's main colour is always the team colour (red or blue
 *     online), and the measured brightness and contrast against the yellow walls and carpet are never below the plain
 *     suit's (see the test hook's fair()). Nothing is see-through. The visor still glows.
 *   gun skins: the same three guns, each box recoloured (and split into stripes or patches); the length, shape, muzzle
 *     and the sniper's lens are unchanged;
 *   build skins: only the picture on a piece changes: as opaque, the same frame and brace round the edge, and measured to
 *     be at least as far from the walls, the carpet and both team colours as plywood. Damage still darkens it the same way;
 *   elimination effects: small pieces round the body that is falling over, gone in 1.5 s (the body takes 2.2 s); none with
 *     the browser's reduced-motion setting on (the game's own sparks are left out then too), and celebrations hold still;
 *   celebrations: only while the round is over (every enemy is out), and they stop as soon as the player moves.
 *
 * Cost. An outfit is fewer draw calls than the plain suit (one mesh per moving part: two legs, body, head, arms, plus
 * one for glowing parts, against twelve), with shared materials and geometry cached per outfit and team colour. A gun
 * skin is a recoloured copy of that gun's one geometry. A build skin is a different picture on the piece's own material.
 * Effects use two instanced meshes and a few small pooled meshes that are only drawn while something plays.
 */
window.BackroomsLocker=function(X){
'use strict';
const {THREE,TX}=X;const V3=THREE.Vector3;
const GAME='backrooms-1v1';
const now=()=>performance.now()/1000;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const rnd=(a,b)=>a+Math.random()*(b-a);
const TAU=Math.PI*2;

// =====================================================================
//  The catalogue's names (../cosmetics.js has the same items, by number, with rarities and descriptions)
// =====================================================================
const OUTFIT_NAMES=['Striker','Hoops','Gridiron','Slugger','Puck','Ace','Champ','Sprinter','Lap Swimmer','Fairway','Skater','Downhill','Pit Racer',
  'Referee','Coach','Bear Mascot','Martial Artist','Cheer Captain','Tin Bot','Sleek Android','Mech Pilot','Junkyard Bot',
  'Pirate Captain','Deckhand','First Mate','Ghost Pirate','Pinstripe Suit','The Boss','Tracksuit and Chain','Bodyguard','Tuxedo','Detective',
  'Astronaut','Wizard','Firefighter','Knight'];
const WRAP_NAMES=['Gold','Chrome','Wood Grain','Forest Camo','Desert Camo','Arctic Camo','Pixel Camo','Candy Cane','Hazard Stripes','Lava',
  'Toy Blaster','Galaxy','Checkered Flag','Pirate Brass','Football Leather'];
const BUILD_NAMES=['Concrete','Ice Block','Candy Stripes','Scrap Metal','Bubble Wrap','Marble'];
const ELIM_NAMES=['Confetti Pop','Noclip Glitch','Ghost Away','Red Card','Treasure Coins','Nuts and Bolts','Balloon Pop','Rubber Ducks'];
const CELEB_NAMES=['Fist Pump','Victory Hop','Spin Move','Robot Dance','Pirate Jig','Take a Bow','Trophy Lift','Fireworks'];
const SLOTS=['o','g','b','e','c'];
const LISTS={o:OUTFIT_NAMES,g:WRAP_NAMES,b:BUILD_NAMES,e:ELIM_NAMES,c:CELEB_NAMES};
const CAT_SLOT={o:'outfit',g:'wrap',b:'build',e:'elim',c:'celebrate'};   // the slot names in ../cosmetics.js
const N={};for(const s of SLOTS)N[s]=LISTS[s].length;

// ---------------- the wire string (the node's lk) ----------------
function parse(w){
  const k={o:0,g:0,b:0,e:0,c:0};
  if(typeof w!=='string'||w.length>24||!/^([ogbec][0-9]{1,3})*$/.test(w))return k;
  for(const m of w.matchAll(/([ogbec])([0-9]{1,3})/g)){const n=+m[2];if(n>=1&&n<=N[m[1]])k[m[1]]=n}
  return k;
}
function wireOf(k){if(!k)return '';let s='';for(const sl of SLOTS){const n=k[sl]|0;if(n>=1&&n<=N[sl])s+=sl+n}return s}
const worn=k=>!!k&&SLOTS.some(s=>k[s]);

// =====================================================================
//  Outfits
// =====================================================================
// Every outfit is made of the plain suit's own boxes, in the same places and sizes (legs .28 x .86 x .3, body .74 x .72 x
// .44, head .54, sleeves, gloves, the boot and the pack on the back, the size of the air tank), coloured its own way,
// plus things added on top of them (patches, bands, hats, collars...). A part is [w,h,d, x,y,z, colour, rx,ry,rz, shape]
// in the frame of the moving part it belongs to (legs: the hip at 0, the floor at -.86; head: its middle; arms: the
// shoulders, the sleeves pointing along -z). Colour is a hex number, or a letter for the player's own colours:
//   T the team colour (red or blue online; the outfit's own `home` colours in practice), K a darker shade of it,
//   L a lighter one, D the team's trim, W white, V the visor's glow; G(hex) is a fixed glowing colour.
// shape: undefined a box, 'c' a cylinder (w and d its width, h its height), 'o' a ball.
const G=h=>0x1000000+h;
const W='W',T='T',K='K',L='L',D='D',V='V';
const GOLD=0xe8b22e,SILVER=0xe2e8ec,STEEL=0xc2cad2,INK=0x2c3448,SHOE='D',CREAM=0xf1ece0;
// on the body (x -.37..37, y .86..1.58, z -.22 front .. .22 back). Lt: layer, for patches on patches.
const off=Lt=>.004+.012*(Lt||0);
const F=(x,y,w,h,c,Lt,rz)=>[w,h,.02,x,y,-.22-off(Lt),c,0,0,rz||0];          // a patch on the front
const Bk=(x,y,w,h,c,Lt,rz)=>[w,h,.02,x,y,.22+off(Lt),c,0,0,rz||0];          // on the back
const Sd=(s,y,d,h,c,Lt,z)=>[.02,h,d,s*(.37+off(Lt)),y,z||0,c];               // on a side (s -1 left, 1 right)
const band=(y,h,c,Lt)=>{const o=.02+2*off(Lt);return [.74+o,h,.44+o,0,y,0,c]};// right round the body
// on the head (a cube of .54 round its middle)
const HF=(x,y,w,h,c,Lt)=>[w,h,.02,x,y,-.27-off(Lt),c];
const HB=(x,y,w,h,c,Lt)=>[w,h,.02,x,y,.27+off(Lt),c];
const HS=(s,y,z,d,h,c,Lt)=>[.02,h,d,s*(.27+off(Lt)),y,z,c];
const HT=(x,z,w,d,c,Lt)=>[w,.02,d,x,.27+off(Lt),z,c];
const hBand=(y,h,c,Lt)=>{const o=.02+2*off(Lt);return [.54+o,h,.54+o,0,y,0,c]};
// on a leg (x -.14..14 with the outside at s*.14, z -.15 front .. .15 back)
const LB=(y,h,c,Lt)=>{const o=.02+2*off(Lt);return [.28+o,h,.3+o,0,y,0,c]};
const LF=(x,y,w,h,c,Lt)=>[w,h,.02,x,y,-.15-off(Lt),c];
const LBk=(x,y,w,h,c,Lt)=>[w,h,.02,x,y,.15+off(Lt),c];
const LS=(s,y,d,h,c,Lt,z)=>[.02,h,d,s*(.14+off(Lt)),y,z||0,c];
// on an arm: i 0 the left sleeve, 1 the right; u along the sleeve (.31 the shoulder end, -.31 the wrist), dx/dy across it
const SLV=[{c:[-.26,-.05,-.26],ry:-.35},{c:[.3,-.05,-.22],ry:0}];
function onArm(i,dx,dy,u,w,h,d,c,rx,rz,shape){const S=SLV[i],cs=Math.cos(S.ry),sn=Math.sin(S.ry);
  return [w,h,d,S.c[0]+dx*cs+u*sn,S.c[1]+dy,S.c[2]-dx*sn+u*cs,c,rx||0,S.ry,rz||0,shape]}
const aBand=(i,u,len,c,Lt)=>{const o=.02+2*off(Lt);return onArm(i,0,0,u,.17+o,.17+o,len,c)};
const aTop=(i,u,len,w,c,Lt,dx)=>onArm(i,dx||0,.085+off(Lt),u,w,.02,len,c);   // a stripe along the top of a sleeve
const arms2=f=>[f(0),f(1)];
// a digit in a 3 x 5 grid of blocks on the back (z>0) or front of the body; s: size of one block
const DIG=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
function num(str,x,y,s,c,back,Lt){const out=[],n=String(str).length,w=s*3+s*.6;let x0=x-(n*w-s*.6)/2;
  for(const ch of String(str)){const g=DIG[+ch];for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(g[j*3+i]==='1'){const px=x0+i*s+s/2,py=y+(2-j)*s;out.push(back?Bk(px,py,s*1.02,s*1.02,c,Lt):F(px,py,s*1.02,s*1.02,c,Lt))}x0+=w}
  return out}
// the pack on the back (the same box as the plain suit's air tank), so no outfit is drawn smaller than the plain suit
const PACK=[.42,.52,.2,0,1.26,.31];
const pack=(c,extra)=>[[...PACK,c],...(extra||[])];
// an eye patch over the left half of the visor, with its strap round the head
const PATCH=[[.19,.2,.03,-.105,.03,-.305,INK],[.6,.035,.02,0,.13,-.28,INK,0,0,-.42],[.025,.035,.56,-.28,.2,0,INK],[.025,.035,.56,.28,.06,0,INK],[.56,.035,.02,0,.13,.285,INK]];
// the list itself: home is the [main, trim] colours used in practice; base sets the colours of the plain boxes (leg,
// boot, torso, hood, sleeve, glove; visor: false for an outfit that draws its own eyes); hat: hides Turkey Week's
// pilgrim hat (it would sit inside this one)
const OUTFITS=[null,
// ---------------- sports ----------------
{id:'striker',home:[0x1f9e5a,0x0d4a2a],base:{leg:T,boot:0xf4f4f4,sleeve:T,glove:T},
  leg:s=>[[.3,.34,.32,0,-.17,0,W],LB(-.5,.05,W),LB(-.12,.03,T,1),LS(s,-.2,.12,.26,T,1),[.315,.06,.385,0,-.73,-.03,T],[.06,.03,.06,-.08,-.865,-.12,SHOE],[.06,.03,.06,.08,-.865,-.12,SHOE],[.06,.03,.06,0,-.865,.1,SHOE]],
  torso:[band(1.555,.05,W),F(0,1.5,.16,.1,W),F(0,1.47,.08,.06,T,1),Sd(-1,1.22,.1,.62,W),Sd(1,1.22,.1,.62,W),band(.9,.1,W),F(-.18,1.38,.12,.12,W),...num(9,0,1.24,.06,W,true,16),...pack(T,[Bk(0,1.32,.3,.05,W,16),Bk(0,1.2,.3,.05,W,16)])],
  head:[hBand(.16,.07,W)],
  arms:[...arms2(i=>aBand(i,-.14,.06,W))]},
{id:'hoops',home:[0xff7a1a,0x7a2e00],base:{leg:L,boot:0xf6f6f6,sleeve:L,glove:L},
  leg:s=>[[.32,.48,.34,0,-.25,0,T],LS(s,-.25,.1,.46,W,2),LB(-.48,.04,W,2),LB(-.6,.16,W),LB(-.56,.03,T,1),[.33,.12,.4,0,-.8,-.02,W],LS(s,-.79,.16,.04,T,2,-.02)],
  torso:[band(1.555,.05,W),F(0,1.52,.2,.08,L,1),...num(31,0,1.25,.055,W,false),...num(31,0,1.25,.052,W,true,16),band(.92,.12,T,1),[.16,.02,.12,-.29,1.585,0,W],[.16,.02,.12,.29,1.585,0,W],...pack(T,[Bk(0,1.26,.06,.5,W,16)])],
  head:[hBand(.18,.08,W),hBand(.18,.025,T,1)],
  arms:[...arms2(i=>aBand(i,-.15,.07,W)),...arms2(i=>aBand(i,.24,.06,T))]},
{id:'gridiron',home:[0x6a2bc8,0x2a0f55],hat:1,base:{leg:0xe8e6dc,boot:SHOE,sleeve:T,glove:W},
  leg:s=>[LS(s,-.25,.08,.5,T,0),LB(-.5,.04,T),[.3,.2,.32,0,-.62,0,T],LB(-.58,.03,W,1)],
  torso:[[.92,.16,.52,0,1.5,0,T],[.94,.03,.54,0,1.585,0,W],F(0,1.47,.24,.06,W,6),...num(4,0,1.2,.06,W,false),...num(4,0,1.22,.075,W,true,16),band(.9,.1,T),...pack(K,[Bk(0,1.4,.36,.05,W,16)])],
  head:[[.6,.56,.6,0,.02,0,T],[.08,.02,.6,0,.31,0,W],[.03,.4,.04,-.2,-.03,-.33,STEEL],[.03,.4,.04,.2,-.03,-.33,STEEL],[.43,.03,.04,0,-.09,-.335,STEEL],[.43,.03,.04,0,-.17,-.335,STEEL],[.03,.12,.04,0,-.13,-.335,STEEL],[.1,.1,.02,-.31,-.05,0,W],[.1,.1,.02,.31,-.05,0,W]],
  arms:[...arms2(i=>aBand(i,.05,.05,W)),...arms2(i=>aBand(i,-.05,.05,W))]},
{id:'slugger',home:[0x2153b8,0x0c2457],hat:1,base:{leg:0xeceae2,boot:SHOE,sleeve:T,glove:W},
  leg:s=>[LS(s,-.25,.04,.52,T),LB(-.5,.04,0xeceae2,1),[.29,.22,.31,0,-.62,0,T],LF(0,-.66,.08,.14,W,1)],
  torso:[F(0,1.22,.04,.7,W),...[1.45,1.3,1.15,1.0].map(y=>F(0,y,.03,.03,0xdedede,1)),band(.9,.08,INK),F(0,.9,.08,.06,SILVER,1),band(1.56,.04,W),...num(27,0,1.25,.06,W,true,16),F(.18,1.4,.14,.04,W),...pack(T,[Bk(0,1.4,.42,.05,W,16)])],
  head:[[.58,.3,.58,0,.14,0,T],[.5,.04,.2,0,.04,-.36,T],[.12,.2,.2,.29,-.04,0,T],[.07,.02,.07,0,.3,0,W]],
  arms:[...arms2(i=>aBand(i,-.12,.05,W))]},
{id:'puck',home:[0xc41f3a,0x55101b],hat:1,base:{leg:T,boot:SHOE,sleeve:T,glove:D},
  leg:s=>[[.32,.32,.34,0,-.16,0,K],LB(-.12,.03,W,1),LB(-.45,.05,W),LB(-.53,.05,W),[.31,.14,.36,0,-.74,-.02,SHOE],[.03,.05,.4,0,-.835,-.02,SILVER]],
  torso:[[.8,.74,.5,0,1.2,0,T],[.82,.06,.52,0,1.0,0,W],[.82,.04,.52,0,.92,0,W],[.82,.05,.52,0,1.5,0,W],...num(17,0,1.26,.055,W,true,16),...pack(K,[Bk(0,1.1,.42,.06,W,16)])],
  head:[[.58,.3,.58,0,.13,0,T],[.03,.32,.04,-.18,-.05,-.31,SILVER],[.03,.32,.04,.18,-.05,-.31,SILVER],[.03,.32,.04,0,-.05,-.31,SILVER],[.39,.03,.04,0,-.06,-.315,SILVER],[.39,.03,.04,0,-.16,-.315,SILVER],[.39,.03,.04,0,.1,-.315,SILVER]],
  arms:[...arms2(i=>onArm(i,0,0,0,.2,.2,.5,T)),...arms2(i=>aBand(i,-.02,.05,W,2)),...arms2(i=>aBand(i,-.1,.04,W,2))]},
{id:'ace',home:[0x18b4a6,0x0a5a52],base:{leg:L,boot:W,sleeve:T,glove:L},
  leg:s=>[[.31,.3,.35,0,-.15,0,W],LB(-.66,.12,W),[.32,.06,.39,0,-.84,-.03,T]],
  torso:[F(0,1.5,.12,.16,W),[.3,.05,.46,-.1,1.58,0,W,0,0,.25],[.3,.05,.46,.1,1.58,0,W,0,0,-.25],F(0,1.47,.03,.03,T,1),F(0,1.42,.03,.03,T,1),band(.9,.08,W),Bk(0,1.5,.3,.06,W),...pack(W,[Bk(0,1.26,.3,.04,T,16)])],
  head:[hBand(.19,.07,W),[.48,.03,.2,0,.17,-.34,W]],
  arms:[...arms2(i=>aBand(i,-.16,.08,W)),...arms2(i=>aBand(i,.23,.05,W))]},
{id:'champ',home:[0xd62828,0x5a0d0d],hat:1,base:{leg:L,boot:T,sleeve:L,glove:T},
  leg:s=>[[.32,.36,.34,0,-.18,0,W],LS(s,-.18,.12,.34,T,2),[.29,.26,.31,0,-.68,0,T],LF(0,-.64,.04,.2,W,1)],
  torso:[band(.98,.14,T,2),band(1.22,.72,T),F(0,1.42,.5,.03,W,1),Bk(0,1.42,.5,.03,W,1),...pack(T,[Bk(0,1.5,.34,.05,W,16)])],
  head:[hBand(.16,.14,T),[.58,.1,.58,0,.25,0,T],HS(-1,-.06,-.1,.22,.24,T,1),HS(1,-.06,-.1,.22,.24,T,1),[.36,.06,.04,0,-.13,-.3,T],[.24,.06,.06,0,.22,-.3,W]],
  arms:[...arms2(i=>onArm(i,0,0,-.245,.25,.25,.22,T)),...arms2(i=>onArm(i,0,0,-.11,.21,.21,.08,W))]},
{id:'sprinter',home:[0xff3d7f,0x6a0f30],base:{leg:K,boot:0x3ee6d0,sleeve:L,glove:L},
  leg:s=>[[.3,.24,.32,0,-.12,0,D],LS(s,-.12,.08,.22,W,1),[.31,.05,.39,0,-.84,-.03,0x1f7a70]],
  torso:[[.86,.09,.02,0,1.22,-.234,W,0,0,.7],[.86,.09,.02,0,1.22,.234,W,0,0,-.7],F(.05,1.12,.3,.2,W,2),...num(42,.05,1.12,.025,INK,false,3),band(.9,.06,D),...pack(T,[Bk(0,1.26,.42,.05,W,16)])],
  head:[hBand(.16,.06,T,1)],
  arms:[...arms2(i=>aBand(i,.2,.12,T))]},
{id:'swim',home:[0x1689e0,0x0a3a66],hat:1,visor:false,base:{leg:T,boot:0x39c1e8,sleeve:T,glove:T},
  leg:s=>[LS(s,-.4,.06,.8,W,0),LB(-.62,.03,K,0)],
  torso:[Sd(-1,1.22,.06,.7,W),Sd(1,1.22,.06,.7,W),[.8,.2,.5,0,1.5,0,W],[.2,.4,.06,-.2,1.33,-.24,W],...pack(W,[Bk(0,1.3,.3,.06,T,16),Bk(0,1.2,.3,.06,T,16)])],
  head:[[.58,.34,.58,0,.12,0,T],[.6,.04,.6,0,.0,0,K],[.16,.14,.04,-.11,.03,-.29,G(0x9ff2ff)],[.16,.14,.04,.11,.03,-.29,G(0x9ff2ff)],[.06,.04,.03,0,.03,-.285,INK],[.6,.04,.6,0,.03,0,INK],[.1,.04,.04,-.03,-.13,-.285,0x234a6a]],
  arms:[]},
{id:'fairway',home:[0x2e8c5a,0x13432a],hat:1,base:{leg:L,boot:W,sleeve:W,glove:W},
  leg:s=>[LF(0,-.4,.02,.8,T,1),LS(s,-.4,.02,.8,T,1),LB(-.2,.02,T,1),LB(-.5,.02,T,1),[.315,.07,.385,0,-.72,-.03,D]],
  torso:[band(1.2,.7,T),...[-.22,0,.22].flatMap(x=>[F(x,1.06,.12,.12,K,1,.785),F(x,1.32,.12,.12,K,1,.785),Bk(x,1.06,.12,.12,K,1,.785),Bk(x,1.32,.12,.12,K,1,.785)]),
    [.8,.025,.02,0,1.19,-.245,W,0,0,.6],[.8,.025,.02,0,1.19,-.245,W,0,0,-.6],[.8,.025,.02,0,1.19,.245,W,0,0,.6],[.8,.025,.02,0,1.19,.245,W,0,0,-.6],F(0,1.52,.2,.1,W,2),...pack(T,[Bk(0,1.4,.42,.04,W,16)])],
  head:[[.58,.16,.58,0,.21,0,K],[.56,.05,.24,0,.18,-.36,K],[.06,.04,.06,0,.3,0,K]],
  arms:[...arms2(i=>aBand(i,.18,.12,T,1))]},
{id:'skater',home:[0xe0402a,0x5a160c],hat:1,base:{leg:D,boot:W,sleeve:T,glove:L},
  leg:s=>[[.31,.5,.33,0,-.24,0,D],LS(s,-.3,.12,.12,T,1),LB(-.6,.16,W),LB(-.56,.025,T,1),LB(-.62,.025,T,1),[.32,.04,.39,0,-.85,-.03,D]],
  torso:[[.8,.82,.48,0,1.17,0,T],[.07,.2,.02,0,1.24,-.256,W,0,0,.5],[.07,.2,.02,.03,1.12,-.256,W,0,0,-.5],[.06,.03,.02,0,1.18,-.256,W],
    ...pack(T,[[.24,.86,.03,0,1.26,.43,0x3a4a7a],[.26,.02,.04,0,1.7,.43,W],[.26,.02,.04,0,.82,.43,W],...[[-.09,1.6],[.09,1.6],[-.09,.92],[.09,.92]].map(([x,y])=>[.06,.06,.06,x,y,.47,W,0,0,0,'c'])])],
  head:[[.58,.3,.58,0,.14,0,T],hBand(.02,.08,K,1),[.12,.08,.12,0,.32,0,K]],
  arms:[...arms2(i=>onArm(i,0,0,.08,.21,.21,.34,T))]},
{id:'downhill',home:[0x2f6fd8,0x10284f],hat:1,visor:false,base:{leg:K,boot:W,sleeve:T,glove:T},
  leg:s=>[LB(-.3,.02,D,0),LB(-.1,.02,D,0),[.33,.24,.4,0,-.74,-.02,W],[.33,.03,.4,0,-.68,-.02,T,0,0,0],LS(s,-.72,.1,.04,T,3)],
  torso:[[.8,.74,.5,0,1.2,0,T],...[1.02,1.18,1.34].map(y=>[.82,.025,.52,0,y,0,K]),[.4,.12,.5,0,1.58,0,T],[.03,.66,.02,0,1.2,-.258,W],...pack(K,[Bk(0,1.3,.42,.04,W,16)])],
  head:[[.58,.36,.58,0,.1,0,T],[.5,.2,.07,0,.02,-.3,G(0xffb04a)],[.44,.06,.08,0,.06,-.302,G(0xffe39a)],[.6,.05,.6,0,.02,0,INK]],
  arms:[...arms2(i=>onArm(i,0,0,-.245,.22,.22,.18,T))]},
{id:'racer',home:[0xe8202a,0x5a0a0e],hat:1,visor:false,base:{leg:T,boot:SHOE,sleeve:T,glove:W},
  leg:s=>[LS(s,-.4,.05,.8,W,0),LS(s,-.4,.02,.8,INK,1)],
  torso:[Sd(-1,1.22,.05,.7,W),Sd(1,1.22,.05,.7,W),band(1.555,.05,W),F(-.18,1.4,.14,.07,0x3ee6d0),F(.18,1.4,.14,.07,GOLD),F(-.18,1.28,.14,.07,W),F(.18,1.28,.14,.07,0x3a7be8),F(0,1.08,.3,.08,W),band(.9,.08,K),...pack(K,[Bk(0,1.4,.42,.05,W,16)])],
  head:[[.6,.6,.6,0,.0,0,W],[.62,.18,.62,0,.18,0,T],[.62,.04,.62,0,.0,0,T],[.46,.12,.04,0,.02,-.31,G(0x7fe4ff)],[.44,.03,.05,0,.06,-.31,G(0xdffaff)]],
  arms:[...arms2(i=>aTop(i,0,.62,.04,W))]},
{id:'referee',home:[0x3f8fe0,0x183a66],hat:1,base:{leg:T,boot:SHOE,sleeve:T,glove:L},
  leg:s=>[LB(-.6,.16,W),LB(-.53,.025,T,1)],
  torso:[...[-.29,-.145,0,.145,.29].map(x=>F(x,1.22,.06,.7,W)),...[-.29,-.145,0,.145,.29].map(x=>Bk(x,1.22,.06,.7,W)),Sd(-1,1.22,.06,.7,W),Sd(1,1.22,.06,.7,W),band(1.555,.05,INK),band(.9,.08,INK),
    [.02,.3,.02,-.06,1.42,-.252,INK,0,0,.3],[.02,.3,.02,.06,1.42,-.252,INK,0,0,-.3],[.05,.04,.08,0,1.28,-.27,SILVER],...pack(T,[Bk(0,1.26,.42,.05,W,16)])],
  head:[[.58,.16,.58,0,.21,0,INK],[.5,.04,.22,0,.15,-.36,INK]],
  arms:[...arms2(i=>aBand(i,-.14,.04,INK))]},
{id:'coach',home:[0x8a2be2,0x351056],hat:1,base:{leg:K,boot:W,sleeve:T,glove:L},
  leg:s=>[LS(s,-.43,.05,.86,W,0)],
  torso:[F(0,1.22,.025,.72,SILVER),band(1.56,.06,K),[.4,.14,.5,0,1.6,0,T],Sd(-1,1.22,.06,.7,W),Sd(1,1.22,.06,.7,W),[.02,.32,.02,-.08,1.43,-.252,W,0,0,.25],[.02,.32,.02,.08,1.43,-.252,W,0,0,-.25],[.05,.05,.09,0,1.28,-.27,SILVER],Bk(0,1.45,.42,.06,W),...pack(T,[Bk(0,1.3,.42,.05,W,16)])],
  head:[[.58,.16,.58,0,.21,0,T],[.5,.04,.22,0,.15,-.36,T],[.06,.04,.06,0,.3,0,W],[.5,.03,.03,0,.16,-.47,W]],
  arms:[...arms2(i=>aTop(i,0,.62,.035,W))]},
{id:'mascot',home:[0xc8641e,0x5a2a0a],hat:1,visor:false,base:{leg:T,boot:L,sleeve:T,glove:L},
  leg:s=>[[.34,.2,.42,0,-.76,-.04,L],[.05,.03,.06,-.08,-.66,-.24,D],[.05,.03,.06,.08,-.66,-.24,D]],
  torso:[[.8,.76,.5,0,1.2,0,T],[.44,.5,.02,0,1.16,-.26,L],[.2,.2,.2,0,1.05,.27,L],...pack(T,[])],
  head:[[.62,.56,.6,0,.02,0,T],[.24,.16,.12,0,-.1,-.34,L],[.1,.06,.04,0,-.06,-.405,INK],[.14,.14,.08,-.24,.29,0,T],[.14,.14,.08,.24,.29,0,T],[.08,.08,.02,-.24,.29,-.045,L],[.08,.08,.02,.24,.29,-.045,L],
    [.12,.12,.03,-.13,.08,-.31,G(0xffffff)],[.12,.12,.03,.13,.08,-.31,G(0xffffff)],[.05,.07,.03,-.12,.07,-.325,G(0x1a1a22)],[.05,.07,.03,.14,.07,-.325,G(0x1a1a22)]],
  arms:[...arms2(i=>onArm(i,0,0,-.245,.22,.22,.18,L))]},
{id:'judo',home:[0x2a5fd0,0x0f2558],base:{leg:T,boot:W,sleeve:T,glove:L},
  leg:s=>[[.31,.8,.33,0,-.42,0,T],LB(-.79,.04,K,1)],
  torso:[[.78,.74,.48,0,1.2,0,T],[.12,.6,.02,-.06,1.26,-.25,K,0,0,-.35],[.12,.6,.02,.06,1.26,-.25,K,0,0,.35],[.82,.08,.52,0,.98,0,INK],[.08,.08,.04,0,.98,-.27,INK],[.04,.22,.02,-.04,.86,-.275,INK,0,0,.2],[.04,.22,.02,.05,.86,-.275,INK,0,0,-.2],...pack(T,[Bk(0,1.26,.42,.04,K,16)])],
  head:[hBand(.12,.07,W),[.04,.18,.03,-.05,.04,.31,W,0,0,.3],[.04,.18,.03,.05,.04,.31,W,0,0,-.3]],
  arms:[...arms2(i=>onArm(i,0,0,-.08,.21,.21,.46,T))]},
{id:'cheer',home:[0xe8327a,0x5e0f30],hat:1,base:{leg:W,boot:W,sleeve:W,glove:W},
  leg:s=>[[.32,.04,.39,0,-.84,-.03,T],LF(0,-.75,.05,.08,T,1)],
  torso:[[.1,.36,.02,-.12,1.3,-.235,W,0,0,.6],[.1,.36,.02,.12,1.3,-.235,W,0,0,-.6],[.1,.36,.02,-.12,1.3,.235,W,0,0,-.6],[.1,.36,.02,.12,1.3,.235,W,0,0,.6],
    ...[[0,-1],[0,1]].flatMap(([a,b])=>[]),[.82,.28,.52,0,.8,0,T],[.83,.04,.53,0,.68,0,W],...[-.3,-.15,0,.15,.3].map(x=>[.02,.27,.02,x,.8,-.265,K]),...pack(T,[Bk(0,1.26,.3,.06,W,16)])],
  head:[[.2,.12,.08,0,.24,.3,T],[.12,.14,.06,-.13,.24,.3,T,0,0,.4],[.12,.14,.06,.13,.24,.3,T,0,0,-.4]],
  arms:[...arms2(i=>onArm(i,0,0,.1,.19,.19,.3,T))]},
// ---------------- robots ----------------
{id:'tinbot',home:[0xd04a3a,0x5a1a12],hat:1,visor:false,base:{leg:T,boot:SILVER,sleeve:SILVER,glove:SILVER},
  leg:s=>[LB(-.2,.04,SILVER),LB(-.4,.04,SILVER),LB(-.6,.04,SILVER),[.34,.14,.42,0,-.79,-.04,SILVER]],
  torso:[[.78,.74,.48,0,1.22,0,T],F(0,1.25,.4,.3,SILVER,2),F(-.1,1.3,.1,.1,G(0xff5c5c),3),F(.08,1.3,.08,.08,G(0x7dff8a),3),F(.08,1.18,.22,.04,INK,3),...[[-.33,1.53],[.33,1.53],[-.33,.92],[.33,.92]].flatMap(([x,y])=>[F(x,y,.04,.04,SILVER,2),Bk(x,y,.04,.04,SILVER,2)]),...pack(SILVER,[Bk(0,1.26,.3,.06,T,16),Bk(-.08,1.4,.06,.06,G(0xffd23f),17)])],
  head:[[.04,.18,.04,0,.36,0,SILVER],[.09,.09,.09,0,.48,0,G(0xff5c5c),0,0,0,'o'],[.14,.12,.04,-.12,.06,-.29,G(0x8ff6ff)],[.14,.12,.04,.12,.06,-.29,G(0x8ff6ff)],[.3,.025,.03,0,-.1,-.285,SILVER],[.3,.025,.03,0,-.15,-.285,SILVER],[.08,.12,.12,-.31,0,0,SILVER,0,0,Math.PI/2,'c'],[.08,.12,.12,.31,0,0,SILVER,0,0,Math.PI/2,'c'],HT(0,0,.4,.4,K)],
  arms:[...arms2(i=>[0.22,.1,-.02,-.14].map(u=>aBand(i,u,.05,T))).flat()]},
{id:'android',home:[0x8a96a8,0x2c3440],hat:1,visor:false,base:{leg:T,boot:W,sleeve:T,glove:W},
  leg:s=>[LF(0,-.43,.18,.8,L,0),LF(0,-.43,.02,.7,G(0x6ff4ff),1),LB(-.43,.06,0xb9c2cc,0),[.31,.17,.38,0,-.78,-.03,W]],
  torso:[F(0,1.24,.5,.58,L),F(0,1.24,.02,.5,G(0x6ff4ff),1),F(0,1.36,.3,.02,G(0x6ff4ff),1),Bk(0,1.24,.5,.58,L),Sd(-1,1.22,.2,.6,L),Sd(1,1.22,.2,.6,L),...pack(L,[Bk(0,1.26,.3,.02,G(0x6ff4ff),16),Bk(0,1.36,.3,.02,G(0x6ff4ff),16)])],
  head:[[.56,.56,.56,0,0,0,L],HT(0,0,.3,.56,T),[.46,.06,.03,0,.03,-.29,G(0x6ff4ff)],HS(-1,0,0,.2,.2,T,1),HS(1,0,0,.2,.2,T,1)],
  arms:[...arms2(i=>aTop(i,0,.5,.02,G(0x6ff4ff),1)),...arms2(i=>aBand(i,.05,.04,0xb9c2cc))]},
{id:'mech',home:[0xe0a020,0x3a2a08],hat:1,visor:false,base:{leg:T,boot:D,sleeve:T,glove:INK},
  leg:s=>[LF(0,-.4,.26,.16,SILVER,0),[.3,.08,.34,0,-.08,0,D],LS(s,-.55,.18,.16,SILVER)],
  torso:[F(0,1.32,.6,.34,SILVER),[.06,.72,.02,-.2,1.22,-.25,W],[.06,.72,.02,.2,1.22,-.25,W],[.06,.72,.02,-.2,1.22,.25,W],[.06,.72,.02,.2,1.22,.25,W],[.22,.16,.5,-.35,1.5,0,SILVER],[.22,.16,.5,.35,1.5,0,SILVER],...num(7,-.35,1.5,.03,T,false,6),band(.9,.1,INK),
    ...pack(SILVER,[[.14,.4,.14,-.12,1.2,.47,INK,0,0,0,'c'],[.14,.4,.14,.12,1.2,.47,INK,0,0,0,'c'],[.1,.06,.1,-.12,.98,.47,G(0xff8a3d),0,0,0,'c'],[.1,.06,.1,.12,.98,.47,G(0xff8a3d),0,0,0,'c']])],
  head:[[.6,.58,.6,0,.02,0,T],[.5,.24,.05,0,.02,-.31,G(0x8fe0ff)],[.62,.06,.62,0,.17,0,W],[.04,.04,.24,.26,-.12,-.24,INK],[.06,.06,.06,.26,-.12,-.37,G(0xff5c5c)],HT(0,0,.08,.6,W,1)],
  arms:[...arms2(i=>onArm(i,0,.04,.18,.22,.12,.26,SILVER))]},
{id:'junkbot',home:[0x3a9a7a,0x14382c],hat:1,visor:false,base:{leg:T,boot:STEEL,sleeve:T,glove:STEEL},
  leg:s=>[LF(.03*s,-.3,.16,.2,STEEL,0),LB(-.6,.05,0xb5522a)],
  torso:[F(-.18,1.4,.26,.24,STEEL),F(.2,1.1,.24,.22,0xb5522a),Bk(.15,1.38,.26,.3,STEEL),...[[-.28,1.5],[-.08,1.5],[-.28,1.3],[.1,1.18],[.3,1.0]].map(([x,y])=>F(x,y,.035,.035,SILVER,1)),band(.9,.08,STEEL),
    ...pack(K,[[.08,.5,.08,.13,1.55,.42,STEEL,0,0,0,'c'],[.1,.06,.1,.13,1.82,.42,INK,0,0,0,'c']])],
  head:[[.56,.5,.56,0,-.01,0,T],[.3,.18,.56,0,.17,0,STEEL],[.2,.2,.04,-.1,.04,-.29,G(0xffd23f),0,0,0],[.1,.1,.04,.14,.08,-.29,G(0x8ff6ff)],[.24,.03,.03,.05,-.14,-.285,INK],HT(-.1,-.1,.2,.2,0xb5522a),HT(.12,.1,.16,.2,T)],
  arms:[...arms2(i=>onArm(i,.02,.02,.1,.2,.14,.22,0xb5522a))]},
// ---------------- pirates (every one with an eye patch) ----------------
{id:'pcaptain',home:[0xb3263a,0x4a0e18],hat:1,base:{leg:CREAM,boot:K,sleeve:T,glove:CREAM},
  leg:s=>[[.31,.4,.33,0,-.66,0,K],[.34,.08,.36,0,-.43,0,K]],
  torso:[band(1.22,.72,T),[.74,.3,.05,0,.74,.245,T],[.3,.3,.05,-.22,.74,-.245,T],[.3,.3,.05,.22,.74,-.245,T],F(0,1.42,.14,.24,CREAM,1),...[1.42,1.28,1.14,1.0].flatMap(y=>[F(-.15,y,.04,.04,GOLD,1),F(.15,y,.04,.04,GOLD,1)]),band(.94,.08,INK,1),F(0,.94,.1,.1,GOLD,2),
    [.5,.03,.02,0,1.2,-.254,GOLD,0,0,.85],...pack(K,[Bk(0,1.26,.42,.04,GOLD,16),Bk(0,1.06,.42,.04,GOLD,16)]),
    [.1,.12,.16,-.3,1.66,-.02,0x3fae55],[.08,.08,.1,-.3,1.76,-.08,0x3fae55],[.03,.04,.05,-.3,1.74,-.15,0xffd23f],[.12,.04,.06,-.3,1.72,-.06,0xe8453c],[.04,.1,.14,-.36,1.64,0,0x2f7fe8],[.04,.14,.06,-.3,1.56,.08,0xe8453c,.4]],
  head:[[.6,.05,.6,0,.27,0,D,0,.785],[.58,.05,.58,0,.27,0,D],[.44,.14,.44,0,.35,0,D],[.62,.025,.62,0,.3,0,GOLD,0,.785],[.04,.14,.08,.18,.4,.1,W,.4],...PATCH],
  arms:[...arms2(i=>aBand(i,-.14,.1,K,1)),...arms2(i=>onArm(i,0,.11,-.14,.04,.03,.04,GOLD))]},
{id:'deckhand',home:[0x2a6fd0,0x0f2a52],hat:1,base:{leg:K,boot:INK,sleeve:W,glove:CREAM},
  leg:s=>[LB(-.6,.06,L,1)],
  torso:[...[1.52,1.38,1.24,1.1,.96].map(y=>band(y,.07,T)),band(.88,.05,INK,1),...pack(L,[Bk(0,1.26,.42,.03,K,16)])],
  head:[[.58,.24,.58,0,.16,0,T],[.1,.1,.1,0,.18,.31,T],[.06,.16,.04,-.04,.08,.33,T,0,0,.3],[.06,.16,.04,.04,.08,.33,T,0,0,-.3],...[[-.15,-.1],[.1,.12],[-.05,.15],[.18,-.12]].map(([x,z])=>HT(x,z,.05,.05,W,1)),...PATCH],
  arms:[...arms2(i=>[.2,.06,-.08].map(u=>aBand(i,u,.06,T))).flat()]},
{id:'firstmate',home:[0x2b8a6e,0x0e3a2c],hat:1,base:{leg:T,boot:D,sleeve:L,glove:L},
  leg:s=>[[.33,.12,.36,0,-.55,0,D],LB(-.12,.02,D,1)],
  torso:[F(0,1.22,.18,.72,L),[.27,.74,.03,-.24,1.21,-.235,T],[.27,.74,.03,.24,1.21,-.235,T],Bk(0,1.22,.74,.72,T),Sd(-1,1.22,.44,.72,T),Sd(1,1.22,.44,.72,T),band(.95,.12,K,2),[.1,.24,.04,.25,.8,-.24,K],F(-.14,1.48,.04,.04,GOLD,4),
    ...pack(K,[Bk(0,1.34,.42,.05,INK,16)])],
  head:[[.58,.2,.58,0,.18,0,K],...[[-.12,-.12],[.12,.08],[-.04,.16],[.16,-.14]].map(([x,z])=>HT(x,z,.05,.05,W,1)),[.1,.08,.1,.22,.1,.3,K],...PATCH],
  arms:[onArm(0,0,0,-.21,.12,.12,.06,SILVER),onArm(0,0,-.01,-.29,.04,.04,.12,SILVER),onArm(0,0,.05,-.355,.04,.12,.04,SILVER),onArm(0,0,.1,-.31,.04,.04,.1,SILVER),onArm(1,0,0,-.15,.2,.2,.06,L)],
  noGlove:[1,0]},
{id:'ghostpirate',home:[0x3a8a8a,0x123838],hat:1,visor:false,base:{leg:L,boot:L,sleeve:T,glove:L},
  leg:s=>[LB(-.3,.03,W,1),LB(-.55,.03,W,1)],
  torso:[band(1.22,.72,T),...[-.3,-.1,.1,.3].map((x,i)=>[.16,.12+(i%2)*.08,.46,x,.83-(i%2)*.04,0,T]),F(0,1.42,.14,.24,0xd6f2ee,1),...[1.42,1.24,1.06].map(y=>F(-.15,y,.05,.05,0xa8dcd4,1)),
    ...pack(K,[Bk(0,1.26,.42,.04,L,16)])],
  head:[[.56,.56,.56,0,0,0,L],[.66,.05,.66,0,.27,0,K,0,.785],[.46,.16,.46,0,.36,0,K],[.12,.1,.03,-.12,.04,-.29,G(0x7dffc8)],[.12,.1,.03,.12,.04,-.29,G(0x7dffc8)],[.26,.04,.03,0,-.14,-.285,0x5f8f8a],...PATCH.slice(1)],
  arms:[...arms2(i=>aBand(i,-.16,.08,T,1))]},
// ---------------- mobsters and suits (costume party) ----------------
{id:'pinstripe',home:[0x4a5a7a,0x1a2232],hat:1,base:{leg:T,boot:INK,sleeve:T,glove:CREAM},
  leg:s=>[...[-.08,0,.08].map(x=>LF(x,-.4,.012,.8,0xe8e8e8)),...[-.08,0,.08].map(x=>LBk(x,-.4,.012,.8,0xe8e8e8)),[.315,.08,.385,0,-.75,-.03,W]],
  torso:[...[-.3,-.22,-.14,.14,.22,.3].map(x=>F(x,1.22,.012,.7,0xe8e8e8)),...[-.3,-.2,-.1,0,.1,.2,.3].map(x=>Bk(x,1.22,.012,.7,0xe8e8e8)),F(0,1.42,.16,.32,W,1),F(0,1.36,.06,.28,0xc83a3a,2),[.08,.36,.02,-.1,1.42,-.25,K,0,0,-.35],[.08,.36,.02,.1,1.42,-.25,K,0,0,.35],F(-.2,1.36,.08,.04,W,1),...pack(T,[Bk(0,1.26,.42,.03,0xe8e8e8,16)])],
  head:[[.7,.03,.66,0,.26,0,D],[.5,.2,.46,0,.37,0,D],[.52,.06,.48,0,.3,0,W],[.12,.02,.4,0,.47,0,K]],
  arms:[...arms2(i=>aBand(i,-.16,.04,W))]},
{id:'boss',home:[0x5a3a8a,0x22143a],hat:1,base:{leg:T,boot:INK,sleeve:T,glove:INK},
  leg:s=>[],
  torso:[[.82,.76,.5,0,1.2,0,T],[.8,.3,.05,0,.72,.245,T],[.36,.3,.05,-.22,.72,-.245,T],[.36,.3,.05,.22,.72,-.245,T],[.88,.14,.56,0,1.56,0,CREAM],...[-.3,-.1,.1,.3].map(x=>[.12,.06,.04,x,1.5,-.29,0xe2dccf]),
    [.84,.06,.52,0,.98,0,K],F(-.12,1.3,.04,.04,GOLD,4),F(-.12,1.15,.04,.04,GOLD,4),F(.12,1.3,.04,.04,GOLD,4),F(.12,1.15,.04,.04,GOLD,4),...pack(T,[Bk(0,1.4,.42,.05,CREAM,16)])],
  head:[[.58,.24,.58,0,.34,0,CREAM],...[[-.2,-.3],[0,-.3],[.2,-.3]].map(([x,z])=>[.14,.1,.03,x,.4,z,0xe2dccf]),[.62,.06,.62,0,.22,0,0xe2dccf],[.42,.07,.05,0,.04,-.3,G(0x2a3a52)],[.08,.03,.05,-.12,.08,-.305,G(0x9fd6ff)]],
  arms:[...arms2(i=>aBand(i,-.13,.08,CREAM,1)),onArm(0,0,.1,-.27,.03,.03,.03,GOLD),onArm(1,0,.1,-.27,.03,.03,.03,GOLD)]},
{id:'tracksuit',home:[0x2a3a8a,0x10163a],hat:1,base:{leg:T,boot:W,sleeve:T,glove:L},
  leg:s=>[LS(s,-.42,.03,.84,W,0,-.035),LS(s,-.42,.03,.84,W,0,.035),[.31,.05,.38,0,-.835,-.03,T]],
  torso:[F(0,1.22,.025,.72,SILVER),Sd(-1,1.22,.03,.7,W,0,-.035),Sd(-1,1.22,.03,.7,W,0,.035),Sd(1,1.22,.03,.7,W,0,-.035),Sd(1,1.22,.03,.7,W,0,.035),[.42,.12,.5,0,1.6,0,T],
    ...[[-.18,1.5],[-.15,1.42],[-.1,1.35],[-.04,1.31],[.04,1.31],[.1,1.35],[.15,1.42],[.18,1.5]].map(([x,y])=>[.05,.05,.03,x,y,-.25,GOLD]),[.1,.1,.03,0,1.25,-.26,GOLD,0,0,0,'c'],[.07,.07,.02,0,1.25,-.27,0xfff0a8,0,0,0,'c'],Bk(0,1.45,.5,.08,W),
    ...pack(T,[Bk(-.03,1.26,.03,.5,W,16),Bk(.03,1.26,.03,.5,W,16)])],
  head:[[.58,.14,.58,0,.22,0,K],[.5,.04,.2,0,.17,-.36,K]],
  arms:[...arms2(i=>aTop(i,0,.62,.025,W,0,-.03)),...arms2(i=>aTop(i,0,.62,.025,W,0,.03))]},
{id:'bodyguard',home:[0x3a4a5a,0x141c24],hat:1,visor:false,filter:D,base:{leg:T,boot:D,sleeve:T,glove:CREAM},
  leg:s=>[[.3,.56,.34,0,-.5,0,T],[.32,.06,.4,0,-.83,-.03,D]],
  torso:[band(.92,.08,D),F(0,1.4,.18,.36,W,1),F(0,1.34,.06,.32,INK,2),[.08,.4,.02,-.11,1.4,-.25,K,0,0,-.35],[.08,.4,.02,.11,1.4,-.25,K,0,0,.35],F(.2,1.4,.06,.03,0xe0e0e0,1),...pack(T,[Bk(0,1.4,.42,.03,K,16)])],
  head:[[.44,.1,.05,0,.04,-.3,G(0x34465c)],[.12,.04,.06,-.12,.07,-.31,G(0xaad8ff)],[.6,.025,.6,0,.07,0,INK],[.03,.06,.03,.29,-.04,0,0xe8e8e8],[.02,.24,.02,.28,-.2,.06,0xe8e8e8,.3]],
  arms:[...arms2(i=>aBand(i,-.15,.05,W))]},
{id:'tuxedo',home:[0x2e3a6a,0x0e1430],hat:1,base:{leg:T,boot:INK,sleeve:T,glove:W},
  leg:s=>[LS(s,-.42,.03,.84,K,0)],
  torso:[F(0,1.32,.22,.5,W,1),[.12,.44,.02,-.12,1.36,-.255,K,0,0,-.3],[.12,.44,.02,.12,1.36,-.255,K,0,0,.3],F(0,1.5,.14,.06,INK,2),F(0,1.5,.04,.05,INK,3),...[1.4,1.3,1.2].map(y=>F(0,y,.025,.025,INK,2)),band(1.0,.1,K,1),F(-.22,1.42,.08,.04,W,1),...pack(T,[Bk(0,1.26,.42,.03,K,16)])],
  head:[[.62,.03,.62,0,.27,0,INK],[.42,.36,.42,0,.45,0,INK],[.44,.06,.44,0,.32,0,T],[.13,.13,.02,.11,.03,-.302,GOLD],[.09,.09,.03,.11,.03,-.302,G(0xdffaff)],[.015,.24,.015,.18,-.1,-.29,GOLD]],
  arms:[...arms2(i=>aBand(i,-.16,.04,W))]},
{id:'detective',home:[0x6a5a8a,0x2a2238],hat:1,base:{leg:T,boot:INK,sleeve:T,glove:CREAM},
  leg:s=>[],
  torso:[[.8,.76,.5,0,1.2,0,T],[.78,.28,.05,0,.73,.245,T],[.35,.28,.05,-.215,.73,-.245,T],[.35,.28,.05,.215,.73,-.245,T],[.86,.08,.56,0,1.0,0,K],F(0,1.0,.08,.08,SILVER,3),[.2,.06,.54,-.3,1.57,0,K],[.2,.06,.54,.3,1.57,0,K],[.5,.14,.54,0,1.56,0,K],
    ...[1.32,1.16].flatMap(y=>[F(-.14,y,.04,.04,INK,2),F(.14,y,.04,.04,INK,2)]),F(-.24,1.06,.1,.1,K,2),...pack(T,[Bk(0,1.3,.42,.05,K,16)])],
  head:[[.7,.03,.66,0,.26,0,K],[.5,.2,.46,0,.37,0,K],[.52,.06,.48,0,.3,0,INK],[.1,.06,.02,.2,.31,-.25,0xe8453c]],
  arms:[...arms2(i=>aBand(i,-.15,.08,K,1))]},
// ---------------- variety ----------------
{id:'astro',home:[0x3a7ae0,0x14305a],hat:1,visor:false,base:{leg:L,boot:0xb9c2cc,sleeve:L,glove:0xb9c2cc},
  leg:s=>[[.3,.6,.32,0,-.36,0,T],LB(-.42,.07,W,1),LB(-.2,.03,W,1),[.33,.18,.4,0,-.77,-.03,0xb9c2cc]],
  torso:[[.78,.74,.48,0,1.22,0,T],F(0,1.3,.34,.2,W,1),F(-.1,1.3,.06,.06,G(0xff5c5c),2),F(0,1.3,.06,.06,G(0x7dff8a),2),F(.1,1.3,.06,.06,G(0x8ff6ff),2),F(.22,1.48,.14,.14,W,1,0),F(.22,1.48,.08,.08,T,2),band(.9,.1,0xb9c2cc),
    [.54,.64,.28,0,1.24,.35,L],[.5,.04,.29,0,1.48,.35,T],[.06,.3,.06,-.3,1.3,.18,0xb9c2cc,0,0,0,'c'],[.06,.3,.06,.3,1.3,.18,0xb9c2cc,0,0,0,'c']],
  head:[[.64,.62,.64,0,.02,0,L],[.48,.36,.04,0,.02,-.32,G(0x5fd6ff)],[.4,.1,.045,-.03,.12,-.322,G(0xc9f4ff)],[.66,.08,.66,0,-.27,0,0xb9c2cc],[.06,.06,.06,.32,.16,0,0xb9c2cc,0,0,Math.PI/2,'c']],
  arms:[...arms2(i=>aBand(i,.0,.07,T,1)),...arms2(i=>aBand(i,-.16,.05,T,1))],packless:1},
{id:'wizard',home:[0x5a3ad0,0x22145a],hat:1,base:{leg:T,boot:K,sleeve:T,glove:CREAM},
  leg:s=>[],
  torso:[[.8,.76,.5,0,1.2,0,T],[.8,.24,.5,0,.75,0,T],[.82,.04,.52,0,.64,0,GOLD],[.84,.06,.54,0,.98,0,GOLD],...[[-.2,1.3],[.18,1.1],[-.1,.66],[.05,1.42]].flatMap(([x,y])=>[F(x,y,.05,.05,0xffe27a,2,.785),Bk(-x,y,.05,.05,0xffe27a,2,.785)]),
    [.3,.34,.03,0,1.36,-.255,0xeeeeee],[.2,.12,.03,0,1.14,-.255,0xeeeeee],...pack(K,[Bk(0,1.4,.42,.04,GOLD,16)])],
  head:[[.74,.04,.74,0,.27,0,T],[.5,.2,.5,0,.38,0,T],[.3,.12,.3,.02,.52,.02,T],[.52,.05,.52,0,.31,0,GOLD],[.06,.06,.02,-.1,.4,-.26,0xffe27a,0,0,.785],[.05,.05,.02,.08,.52,-.155,0xffe27a,0,0,.785],
    [.34,.26,.04,0,-.2,-.29,0xeeeeee],[.2,.1,.04,0,-.36,-.29,0xeeeeee]],
  arms:[...arms2(i=>onArm(i,0,-.02,-.17,.25,.24,.12,T)),...arms2(i=>aBand(i,-.2,.04,GOLD,4))]},
{id:'firefighter',home:[0xd83a1a,0x5a1408],hat:1,base:{leg:T,boot:D,sleeve:T,glove:0x5a4a3a},
  leg:s=>[LB(-.5,.06,SILVER),LB(-.56,.025,0xffd23f,1),[.33,.3,.38,0,-.72,-.02,D]],
  torso:[[.8,.76,.5,0,1.2,0,T],[.82,.06,.52,0,1.0,0,SILVER],[.82,.025,.52,0,1.0,0,0xffd23f],[.82,.06,.52,0,1.3,0,SILVER],F(0,1.2,.03,.66,INK,2),...[1.42,1.2,1.0].map(y=>F(.06,y,.06,.03,SILVER,3)),Bk(0,1.48,.5,.12,SILVER,1),
    ...pack(0xd8dde2,[Bk(0,1.26,.42,.06,T,16),[.08,.12,.08,0,1.56,.31,INK,0,0,0,'c']])],
  head:[[.6,.18,.6,0,.2,0,T],[.64,.04,.76,0,.12,.05,T],[.14,.1,.6,0,.3,0,T],[.22,.2,.04,0,.2,-.33,0xf2f0ea],[.12,.08,.02,0,.2,-.355,0xffd23f],[.46,.06,.04,0,-.12,-.29,0xffd23f]],
  arms:[...arms2(i=>aBand(i,-.05,.06,SILVER)),...arms2(i=>aBand(i,-.05,.025,0xffd23f,1))]},
{id:'knight',home:[0x2a5ac8,0x10244f],hat:1,visor:false,base:{leg:T,boot:STEEL,sleeve:T,glove:STEEL},
  leg:s=>[[.3,.14,.32,0,-.42,0,STEEL],LF(0,-.62,.22,.3,SILVER,0),LS(s,-.18,.04,.34,W,1)],
  torso:[[.78,.74,.48,0,1.2,0,T],[.6,.6,.02,0,1.18,-.255,W,0,0,0],[.44,.44,.02,0,1.18,-.27,T,0,0,.785],[.84,.06,.54,0,.98,0,D],[.24,.14,.5,-.33,1.56,0,T],[.24,.14,.5,.33,1.56,0,T],F(0,.98,.08,.08,GOLD,3),
    ...pack(T,[Bk(0,1.26,.3,.36,W,16),Bk(0,1.26,.2,.2,T,17,.785)])],
  head:[[.58,.58,.58,0,0,0,SILVER],[.46,.04,.04,0,.05,-.3,G(0x9fd6ff)],[.04,.2,.04,0,-.08,-.3,STEEL],...[-.16,-.08,0,.08,.16].map(x=>[.02,.02,.04,x,-.15,-.3,INK]),[.06,.2,.24,0,.38,.05,T],[.06,.1,.12,0,.5,.12,T],[.6,.04,.6,0,.16,0,STEEL]],
  arms:[...arms2(i=>onArm(i,0,.02,.2,.21,.14,.2,T)),...arms2(i=>aBand(i,-.05,.05,SILVER))]}
];
// ---------------- building an outfit ----------------
const PRIM={box:new THREE.BoxGeometry(1,1,1).toNonIndexed(),c:new THREE.CylinderGeometry(.5,.5,1,17).toNonIndexed(),o:new THREE.IcosahedronGeometry(.5,1).toNonIndexed()};
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_p=new V3(),_s=new V3(),_v=new V3(),_n=new V3(),_nm=new THREE.Matrix3(),_c=new THREE.Color(),_c2=new THREE.Color();
const mix=(a,b,t)=>_c.setHex(a).lerp(_c2.setHex(b),t).getHex();
// the colours for a suit key (r, b, me...) and an outfit: [main, dark shade, light shade, trim, visor]
function palette(o,key){const S=X.SUITS[key]||X.SUITS.me;const m=key==='r'||key==='b'?S[0]:o.home[0],t=key==='r'||key==='b'?S[1]:o.home[1],v=key==='r'||key==='b'?S[2]:0x7fd3ff;
  return {T:m,K:mix(m,0x000000,.14),L:mix(m,0xffffff,.68),D:t,V:v,W:0xf2f0ea}}
function resolve(c,P){if(typeof c==='string')return c==='V'?{glow:P.V}:{lit:P[c]};if(c>0xffffff)return {glow:c-0x1000000};return {lit:c}}
function bakeParts(list,P){const lit={p:[],n:[],c:[]},glow={p:[],n:[],c:[]};
  for(const q of list){if(!q)continue;const [w,h,d,x,y,z,col,rx,ry,rz,shape]=q;const r=resolve(col,P),B=r.glow!=null?glow:lit,hex=r.glow!=null?r.glow:r.lit;
    const geo=PRIM[shape||'box'];_e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);_m.compose(_p.set(x,y,z),_q,_s.set(w,h,d));_nm.getNormalMatrix(_m);_c.setHex(hex);
    const pos=geo.attributes.position,nor=geo.attributes.normal;
    for(let i=0;i<pos.count;i++){_v.fromBufferAttribute(pos,i).applyMatrix4(_m);_n.fromBufferAttribute(nor,i).applyMatrix3(_nm).normalize();B.p.push(_v.x,_v.y,_v.z);B.n.push(_n.x,_n.y,_n.z);B.c.push(_c.r,_c.g,_c.b)}}
  const geo=B=>{if(!B.p.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(B.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(B.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(B.c,3));g.computeBoundingSphere();SHARED.add(g);return g};
  return {lit:geo(lit),glow:geo(glow)}}
const SHARED=new Set();
const bodyMat=new THREE.MeshLambertMaterial({vertexColors:true}),glowMat=new THREE.MeshBasicMaterial({vertexColors:true});SHARED.add(bodyMat);SHARED.add(glowMat);
// the plain boxes every outfit is built on (the plain suit's own sizes and places)
function baseParts(o){const b=o.base||{},bc=k=>b[k]!=null?b[k]:{leg:D,boot:SHOE,torso:T,hood:T,sleeve:T,glove:D}[k];
  const leg=[[.28,.86,.3,0,-.43,0,bc('leg')],b.boot===null?null:[.31,.16,.38,0,-.78,-.03,bc('boot')]];
  const torso=[[.74,.72,.44,0,1.22,0,bc('torso')]];if(!o.packless&&!(o.torso||[]).some(p=>p&&p[3]===PACK[3]&&p[4]===PACK[4]&&p[5]===PACK[5]&&p[0]===PACK[0]))torso.push([...PACK,bc('torso')]);
  const head=[[.54,.54,.54,0,0,0,bc('hood')]];if(o.visor!==false)head.push([.42,.22,.04,0,.03,-.275,V]);if(o.visor!==false||o.filter)head.push([.17,.14,.12,0,-.17,-.3,o.filter||D]);
  const ng=o.noGlove||[0,0];const arms=[0,1].flatMap(i=>[onArm(i,0,0,0,.17,.17,.62,bc('sleeve')),ng[i]?null:onArm(i,0,0,-.245,.18,.18,.14,bc('glove'))]);
  return {leg,torso,head,arms}}
const bakeCache=new Map();
function bake(no,key){const id=no+':'+key;if(bakeCache.has(id))return bakeCache.get(id);
  const o=OUTFITS[no],P=palette(o,key),B=baseParts(o),out={};
  for(const s of [-1,1])out[s<0?'legL':'legR']=bakeParts(B.leg.concat(o.leg?o.leg(s):[]),P);
  out.torso=bakeParts(B.torso.concat(o.torso||[]),P);out.head=bakeParts(B.head.concat(o.head||[]),P);out.arms=bakeParts(B.arms.concat(o.arms||[]),P);
  bakeCache.set(id,out);return out}

// ---------------- putting an outfit on a model (index.html's makeSuit) ----------------
// u.lk is what the model wears ({o,g,b,e,c}); u.key its suit (r, b, me, entity). The plain suit's meshes (u.base) are
// hidden, not removed, so taking an outfit off is just showing them again.
function dress(m){
  const u=m.userData,o=u.lk&&u.lk.o|0,key=u.key||'me',want=o&&key!=='entity'?o+':'+key:'';
  if(u._lkO===want)return;u._lkO=want;
  if(u._lkM){for(const x of u._lkM)if(x.parent)x.parent.remove(x);u._lkM=null}
  if(!want){for(const b of u.base)b.visible=true;if(u.tk)u.tk.visible=true;return}
  const B=bake(o,key),M=[];
  const put=(parent,g)=>{if(g.lit){const x=new THREE.Mesh(g.lit,bodyMat);parent.add(x);M.push(x)}if(g.glow){const x=new THREE.Mesh(g.glow,glowMat);parent.add(x);M.push(x)}};
  put(u.legs[0],B.legL);put(u.legs[1],B.legR);put(m,B.torso);put(u.head,B.head);put(u.arms,B.arms);
  for(const b of u.base)b.visible=false;if(u.tk)u.tk.visible=!OUTFITS[o].hat;
  u._lkM=M;
}
// a gun's skin changed: setGun picks the new geometry (index.html's setGun skips a gun that is already set, so forget it)
function regun(m){const u=m.userData;if(u._lkG===(u.lk&&u.lk.g|0))return;u._lkG=u.lk&&u.lk.g|0;const wi=u.gunId;u.gunId=-1;X.setGun(m,wi<0?0:wi)}
function wearOn(m,k){const u=m.userData;u.lk=worn(k)?Object.assign({},k):null;u.lkw=wireOf(k);dress(m);regun(m)}

// ---------------- what this player wears ----------------
const cat=()=>{const C=window.BackRoomCosmetics;return C&&C.gameItems?C:null};
const FREE=()=>{const C=cat();return !(C&&C.on&&C.on())};
function mine(){
  if(!X.on)return parse('');
  if(FREE())return parse(String(X.store.get('kit','')));
  const e=cat().gameEquipped(GAME)||{},k=parse('');
  for(const s of SLOTS){const it=e[CAT_SLOT[s]];if(it&&it.no>=1&&it.no<=N[s])k[s]=it.no}
  return k;
}
let myKit=parse(''),myWire='';
function refreshMine(){myKit=mine();myWire=wireOf(myKit);wearOn(X.player.model,myKit);X.publish()}
function wear(slot,no){
  if(!X.on||!N[slot])return false;no=no|0;if(no<0||no>N[slot])return false;
  if(FREE()){const k=parse(String(X.store.get('kit','')));k[slot]=no;X.store.set('kit',wireOf(k))}
  else{const C=cat(),it=no?C.gameItems(GAME,CAT_SLOT[slot]).find(i=>i.no===no):null;
    if(it){if(C.owned().items.indexOf(it.id)<0)return false;C.equip(it.id)}else C.unequip(GAME+':'+CAT_SLOT[slot])}
  refreshMine();return true;
}
// another player's lk (from their node)
function heard(e,w){const u=e.model.userData;w=typeof w==='string'?w:'';if(u.lkw===w&&(u.lk||!w))return;wearOn(e.model,parse(w));u.lkw=w}
// setSuit changed a model's colours: an outfit is rebuilt in the new ones
function suit(m){if(m.userData.lk)dress(m)}

// =====================================================================
//  Gun skins: each box of the gun recoloured, long ones cut into stripes or patches. The parts come from index.html's
//  GUN_SRC and go through the same gunFit, so every skinned gun is exactly as long, and shaped, as the plain one.
// =====================================================================
const hash=(a,b,c)=>{let h=Math.imul((a*73856093)^(b*19349663)^(c*83492791),0x9E3779B1);h^=h>>>15;return (h>>>0)/4294967296};
// pal: a colour per part role (steel body, dark barrel and grip, grey parts, wood, tan, amber marker, red shells; the
// sniper's lens is never changed). seg: cut long parts into pieces this long; col(role,x,y,z,i,j): a piece's own colour.
const WRAPS=[null,
  {pal:{steel:0xf2c230,grey:0xffe07a,dark:0xc08a1a,wood:0x5a3418,tan:0x5a3418,amber:0xfff2b0,red:0xf2c230}},
  {pal:{steel:0xc4ccd4,grey:0xeef2f6,dark:0x6c747e,wood:0x2c2c32,tan:0x2c2c32,amber:0xffffff,red:0xc4ccd4}},
  {pal:{steel:0x8a5428,grey:0xa86a36,dark:0x5a3418,wood:0x8a5428,tan:0x8a5428,amber:0xd9a520,red:0x6a3c1c},seg:.05,col:(r,x,y,z,i)=>r==='dark'?null:(i%3===1?0x74441e:null)},
  {pal:{steel:0x4f6b3a,grey:0x6b8a4a,dark:0x2e3a24,wood:0x5a4a2e,tan:0x5a4a2e,amber:0x8aa060,red:0x4f6b3a},seg:.06,rows:1,col:(r,x,y,z,i,j,pi)=>{const h=hash(pi,i,j);return h<.3?0x2e3a24:h<.55?0x6b5a3a:h<.75?0x8aa060:null}},
  {pal:{steel:0xc8ad7a,grey:0xd8c294,dark:0x7a6440,wood:0xa88a5a,tan:0xa88a5a,amber:0xe8d6aa,red:0xc8ad7a},seg:.06,rows:1,col:(r,x,y,z,i,j,pi)=>{const h=hash(pi,i,j+7);return h<.3?0x8a6e48:h<.55?0xe0cfa4:null}},
  {pal:{steel:0xe8eef2,grey:0xffffff,dark:0x8a949c,wood:0xc8d2d8,tan:0xc8d2d8,amber:0xffffff,red:0xe8eef2},seg:.06,rows:1,col:(r,x,y,z,i,j,pi)=>{const h=hash(pi,i,j+3);return h<.25?0x9aa6ae:h<.45?0xc4ced6:null}},
  {pal:{steel:0x5a6a7a,grey:0x7a8a9a,dark:0x2e3640,wood:0x4a5a6a,tan:0x4a5a6a,amber:0x9fb0c0,red:0x5a6a7a},seg:.035,rows:1,col:(r,x,y,z,i,j,pi)=>{const h=hash(pi,i,j+11);return h<.25?0x2e3640:h<.5?0x8ea0b0:h<.62?0x3e6a8a:null}},
  {pal:{steel:0xf4f0ea,grey:0xf4f0ea,dark:0xd8282e,wood:0xf4f0ea,tan:0xf4f0ea,amber:0x3aa860,red:0xd8282e},seg:.04,col:(r,x,y,z,i)=>i%2?0xd8282e:null},
  {pal:{steel:0xf2c41a,grey:0xf2c41a,dark:0x24242a,wood:0x24242a,tan:0x24242a,amber:0xf2c41a,red:0xf2c41a},seg:.05,col:(r,x,y,z,i)=>r==='dark'?null:(i%2?0x24242a:null)},
  {pal:{steel:0x2e2624,grey:0x3e3430,dark:0x1e1a18,wood:0x2e2624,tan:0x2e2624,amber:0xff8a1a,red:0xff6a1a},seg:.05,rows:1,col:(r,x,y,z,i,j,pi)=>{const h=hash(pi,i,j+5);return h<.18?0xff7a1a:h<.28?0xffc23a:null}},
  {pal:{steel:0x2f7fe8,grey:0xffd23f,dark:0xff5a2a,wood:0x3fbf5f,tan:0x3fbf5f,amber:0xffffff,red:0xffd23f}},
  {pal:{steel:0x3a2a7a,grey:0x5a3aa8,dark:0x1e1840,wood:0x2a1e5a,tan:0x2a1e5a,amber:0xff7ae0,red:0x5a3aa8},seg:.03,rows:1,col:(r,x,y,z,i,j,pi)=>{const h=hash(pi,i,j+13);return h<.08?0xffffff:h<.2?0x8a5ad8:h<.3?0xd85ab8:null}},
  {pal:{steel:0xf2f2f2,grey:0xf2f2f2,dark:0x24242a,wood:0xf2f2f2,tan:0xf2f2f2,amber:0xe8453c,red:0xf2f2f2},seg:.04,rows:1,col:(r,x,y,z,i,j)=>(i+j)%2?0x24242a:0xf2f2f2},
  {pal:{steel:0xb88a3a,grey:0xd6aa52,dark:0x6a4a24,wood:0x5a3418,tan:0x5a3418,amber:0xffe27a,red:0xb88a3a},seg:.07,col:(r,x,y,z,i)=>(r==='wood'||r==='tan')&&i%2?0x6e4220:null},
  {pal:{steel:0x8a4a22,grey:0xa65a2a,dark:0x5a2e14,wood:0x8a4a22,tan:0x8a4a22,amber:0xf4f0ea,red:0x8a4a22},seg:.04,col:(r,x,y,z,i)=>r==='steel'&&i%2&&y>=0?0xf4f0ea:null}
];
const rgb=h=>[((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255];
const roleOf=c=>{for(const k in X.GC)if(X.GC[k]===c)return k;return null};
const gunCache=new Map();
function gunGeo(wi,n){
  n=n|0;if(!(n>=1&&n<=N.g)||!X.GUN_SRC[wi])return null;const id=wi+':'+n;if(gunCache.has(id))return gunCache.get(id);
  const S=WRAPS[n],[list,z0,z1]=X.GUN_SRC[wi],out=[];
  list.forEach((p,pi)=>{const [w,h,d,x,y,z,ry,c]=p,role=roleOf(c);
    if(role==='lens'||!role){out.push(p);return}
    const base=S.pal[role]!=null?S.pal[role]:null,nz=S.seg&&d>S.seg*1.5?Math.round(d/S.seg):1,ny=S.rows&&h>.09?2:1;
    for(let i=0;i<nz;i++)for(let j=0;j<ny;j++){const dd=d/nz,hh=h/ny,cz=z-d/2+dd*(i+.5),cy=y-h/2+hh*(j+.5);
      let col=S.col?S.col(role,x,cy,cz,i,j,pi):null;if(col==null)col=base;out.push([w,hh,dd,x,cy,cz,ry,col==null?c:rgb(col)])}});
  const g=X.gunFit(out,z0,z1);SHARED.add(g);gunCache.set(id,g);return g;
}

// =====================================================================
//  Build skins: a picture in place of the plywood, with the same dark frame round the edge and the same diagonal brace,
//  so a piece reads as a build from far away. Opaque like plywood; damage darkens it the same way (the material colour).
// =====================================================================
const BUILD_DRAW=[null,
  (g,w,h)=>{g.fillStyle='#c9c7c0';g.fillRect(0,0,w,h);X.noise(g,w,h,22);g.fillStyle='rgba(120,118,112,.5)';for(let i=0;i<14;i++){g.beginPath();g.arc(Math.random()*w,Math.random()*h,1+Math.random()*2,0,7);g.fill()}
    g.strokeStyle='rgba(140,138,130,.6)';g.lineWidth=1.5;g.beginPath();g.moveTo(0,64);g.lineTo(w,64);g.moveTo(64,0);g.lineTo(64,h);g.stroke();return ['#6e6c66','rgba(110,108,102,.7)']},
  (g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#e4f4fb');gr.addColorStop(1,'#b8dcec');g.fillStyle=gr;g.fillRect(0,0,w,h);X.noise(g,w,h,8);
    g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=1.5;for(let k=0;k<5;k++){let x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);for(let i=0;i<4;i++){x+=(Math.random()-.5)*40;y+=(Math.random()-.5)*40;g.lineTo(x,y)}g.stroke()}
    g.fillStyle='rgba(255,255,255,.6)';for(let i=0;i<10;i++){g.beginPath();g.arc(Math.random()*w,Math.random()*h,1.5+Math.random()*2,0,7);g.fill()}return ['#6e9cb4','rgba(120,170,196,.75)']},
  (g,w,h)=>{g.fillStyle='#fbe8ef';g.fillRect(0,0,w,h);g.fillStyle='#f27aa8';for(let k=-h;k<w+h;k+=32){g.beginPath();g.moveTo(k,0);g.lineTo(k+16,0);g.lineTo(k+16-h,h);g.lineTo(k-h,h);g.closePath();g.fill()}
    const sp=['#6fd3ff','#ffe27a','#9ff09a','#ffffff'];for(let i=0;i<40;i++){g.fillStyle=sp[i%4];g.save();g.translate(Math.random()*w,Math.random()*h);g.rotate(Math.random()*3);g.fillRect(-3,-1,6,2);g.restore()}X.noise(g,w,h,6);return ['#b8467a','rgba(184,70,122,.65)']},
  (g,w,h)=>{g.fillStyle='#a4abb2';g.fillRect(0,0,w,h);const pl=[[6,6,70,56,'#b4bbc2'],[70,10,52,60,'#98a0a8'],[10,62,56,58,'#9ea6ae'],[60,66,62,54,'#b0b7be']];
    for(const [x,y,ww,hh,c] of pl){g.fillStyle=c;g.fillRect(x,y,ww,hh);g.strokeStyle='rgba(60,64,70,.5)';g.lineWidth=2;g.strokeRect(x,y,ww,hh);g.fillStyle='#6a7078';for(const [a,b] of [[x+5,y+5],[x+ww-5,y+5],[x+5,y+hh-5],[x+ww-5,y+hh-5]]){g.beginPath();g.arc(a,b,2.2,0,7);g.fill()}}
    g.fillStyle='rgba(176,96,52,.45)';for(let i=0;i<5;i++){g.beginPath();g.arc(Math.random()*w,Math.random()*h,4+Math.random()*7,0,7);g.fill()}X.noise(g,w,h,12);return ['#5a6068','rgba(90,96,104,.7)']},
  (g,w,h)=>{g.fillStyle='#dfe9ef';g.fillRect(0,0,w,h);for(let y=0;y<9;y++)for(let x=0;x<9;x++){const cx=x*14+(y%2?7:0)+2,cy=y*14+8;g.fillStyle='#f6fbfe';g.beginPath();g.arc(cx,cy,5.6,0,7);g.fill();
    g.strokeStyle='rgba(150,180,200,.7)';g.lineWidth=1;g.stroke();g.fillStyle='#ffffff';g.beginPath();g.arc(cx-1.8,cy-1.8,1.6,0,7);g.fill()}X.noise(g,w,h,5);return ['#7f9cb0','rgba(127,156,176,.7)']},
  (g,w,h)=>{g.fillStyle='#eeece8';g.fillRect(0,0,w,h);g.strokeStyle='rgba(150,150,160,.55)';g.lineWidth=1.4;for(let k=0;k<6;k++){let x=Math.random()*w,y=0;g.beginPath();g.moveTo(x,y);while(y<h){x+=(Math.random()-.5)*18;y+=6+Math.random()*10;g.lineTo(x,y)}g.stroke()}
    g.strokeStyle='rgba(200,170,110,.5)';g.lineWidth=1;g.beginPath();g.moveTo(0,90);g.bezierCurveTo(40,70,80,110,128,80);g.stroke();X.noise(g,w,h,6);return ['#8a8a94','rgba(138,138,148,.6)']}
];
const buildTex=[];
function bTex(n){if(buildTex[n])return buildTex[n];
  const t=X.canvasTex(128,128,(g,w,h)=>{const [frame,brace]=BUILD_DRAW[n](g,w,h);g.strokeStyle=frame;g.lineWidth=8;g.strokeRect(4,4,120,120);g.strokeStyle=brace;g.lineWidth=5;g.beginPath();g.moveTo(8,120);g.lineTo(120,8);g.stroke()},1,1);
  return buildTex[n]=t}
// a new piece takes its builder's build skin (by: the entity that built it, if known)
function piece(pc,by){const k=by&&by.model&&by.model.userData.lk,n=k&&k.b|0;if(!(n>=1&&n<=N.b))return;pc.mat.map=bTex(n);pc.mat.needsUpdate=true;pc.lkb=n}

// =====================================================================
//  Elimination effects: they play where the eliminated player falls, for everyone who sees it, when the player who got
//  them wears one. Every one is over in 1.5 s (the falling body itself takes 2.2 s), keeps within about a metre of the
//  body and does not light up the room. Two instanced meshes (lit bits and glowing bits) and a few small pooled meshes,
//  drawn only while something is playing.
// =====================================================================
const FX_MAX=1.5;
function mergeColoured(list){return bakeParts(list,{T:0,K:0,L:0,D:0,V:0,W:0xf2f0ea}).lit}
let ghostGeo=null,cardGeo=null,balloonGeo=null,duckGeo=null,trophyGeo=null;
const GEOS={
  ghost:()=>ghostGeo||(ghostGeo=mergeColoured([[.42,.46,.36,0,.25,0,0xf4f6ff],[.46,.12,.4,0,.04,0,0xf4f6ff],...[-.15,0,.15].map(x=>[.1,.1,.36,x,-.05,0,0xf4f6ff]),[.08,.1,.02,-.09,.32,-.185,0x2a2a38],[.08,.1,.02,.09,.32,-.185,0x2a2a38],[.08,.06,.02,0,.18,-.185,0x6a6a80]])),
  card:()=>cardGeo||(cardGeo=mergeColoured([[.3,.42,.02,0,0,0,0xe8262e],[.26,.38,.022,0,0,0,0xf0383e]])),
  balloon:()=>balloonGeo||(balloonGeo=mergeColoured([[.26,.32,.26,0,0,0,0xffffff,0,0,0,'o'],[.05,.05,.05,0,-.17,0,0xffffff],[.008,.3,.008,0,-.34,0,0xeeeeee]])),
  duck:()=>duckGeo||(duckGeo=mergeColoured([[.2,.14,.26,0,.07,0,0xffd23f],[.13,.13,.13,0,.18,-.08,0xffd23f],[.06,.03,.08,0,.17,-.17,0xff8a1a],[.025,.03,.02,-.05,.21,-.14,0x24242a],[.025,.03,.02,.05,.21,-.14,0x24242a],[.08,.06,.06,0,.12,.14,0xffd23f,.4]])),
  trophy:()=>trophyGeo||(trophyGeo=mergeColoured([[.22,.05,.16,0,0,0,0x6a4a2c],[.16,.06,.12,0,.05,0,0xd9a520],[.05,.12,.05,0,.14,0,0xe8b22e,0,0,0,'c'],[.22,.2,.22,0,.3,0,0xf2c41a,0,0,0,'c'],[.18,.03,.18,0,.41,0,0xffe27a,0,0,0,'c'],[.04,.12,.04,-.14,.31,0,0xe8b22e],[.04,.12,.04,.14,.31,0,0xe8b22e]]))
};
const ZM=new THREE.Matrix4().makeScale(0,0,0),_o=new THREE.Object3D(),_col=new THREE.Color();
function makeFx(Wd){
  function pool(n,mat){const m=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat,n);m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for(let i=0;i<n;i++){m.setMatrixAt(i,ZM);m.setColorAt(i,_col.setHex(0xffffff))}m.visible=false;Wd.scene.add(m);SHARED.add(m.geometry);SHARED.add(mat);
    const ps=[];for(let i=0;i<n;i++)ps.push({on:false,P:new V3(),v:new V3(),r:new V3(),sp:new V3(),sc:new V3(),t:0,life:1,g:0,drag:0,k:0,bounce:0,fl:0});return {m,ps,i:0,n}}
  const lit=pool(160,new THREE.MeshLambertMaterial({color:0xffffff})),glo=pool(120,new THREE.MeshBasicMaterial({color:0xffffff}));
  const objs=[],spare={};
  function obj(kind){const a=spare[kind]||(spare[kind]=[]);let o=a.pop();if(!o){o=new THREE.Mesh(GEOS[kind](),kind==='ghost'?glowMat:bodyMat);Wd.scene.add(o)}o.visible=true;o.scale.setScalar(1);o.rotation.set(0,0,0);return o}
  function add(Pl,col,p,o){const q=Pl.ps[Pl.i=(Pl.i+1)%Pl.n];Object.assign(q,{on:true,t:0,life:Math.min(FX_MAX,o.life||1),g:o.g||0,drag:o.drag||0,k:o.k||0,bounce:o.bounce||0});
    q.P.copy(p);q.v.copy(o.v||new V3());q.r.set(Math.random()*6,Math.random()*6,Math.random()*6);q.sp.set(rnd(-8,8),rnd(-8,8),rnd(-8,8)).multiplyScalar(o.spin==null?1:o.spin);
    if(o.sc)q.sc.copy(o.sc);else q.sc.setScalar(o.s||.06);q.fl=Wd.floor(p.x,p.z,p.y+.5);
    Pl.m.setColorAt(Pl.i,_col.setHex(col));Pl.m.instanceColor.needsUpdate=true;Pl.m.visible=true;return q}
  const at=(p,dx,dy,dz)=>new V3(p.x+dx,p.y+dy,p.z+dz);
  // p: where the body stands (its feet); tc: the eliminated player's team colour
  function play(n,p,tc){
    if(n===1){const cols=[0xff5c8a,0x58b4ff,0xffd23f,0x36b37e,0xb46cff,0xff8a3d,0xffffff];
      for(let i=0;i<46;i++){const a=Math.random()*TAU,sp=rnd(.6,1.8);add(lit,cols[i%7],at(p,rnd(-.2,.2),1.2+Math.random()*.5,rnd(-.2,.2)),{v:new V3(Math.cos(a)*sp,rnd(1.5,3.2),Math.sin(a)*sp),life:rnd(1.1,1.45),sc:new V3(.08,.08,.008),g:5,drag:2.4,k:1})}}
    else if(n===2){for(let i=0;i<40;i++){const c=[tc,0x6ff4ff,0xff4fd8,0xffffff][i%4];add(glo,c,at(p,rnd(-.35,.35),rnd(.1,1.9),rnd(-.3,.3)),{v:new V3(rnd(-.3,.3),rnd(-.2,.6),rnd(-.3,.3)),life:rnd(.5,1.1),s:rnd(.05,.12),k:2,spin:0})}}
    else if(n===3){const o=obj('ghost');o.position.copy(at(p,0,.9,0));objs.push({o,kind:'ghost',t:0,life:1.5,y:p.y+.9,x:p.x,z:p.z})}
    else if(n===4){const o=obj('card');o.position.copy(at(p,0,1.6,0));o.scale.setScalar(.2);objs.push({o,kind:'card',t:0,life:1.3,y:p.y+1.6})}
    else if(n===5){for(let i=0;i<16;i++){const a=Math.random()*TAU,sp=rnd(.6,1.6);add(lit,i%3?0xf2c41a:0xffe27a,at(p,0,1.1,0),{v:new V3(Math.cos(a)*sp,rnd(2.4,3.6),Math.sin(a)*sp),life:rnd(1.2,1.45),sc:new V3(.1,.02,.1),g:11,bounce:.45,spin:.8})}}
    else if(n===6){for(let i=0;i<18;i++){const a=Math.random()*TAU,sp=rnd(.7,1.8),hx=i%3===0;add(lit,hx?0x9aa3ab:i%3===1?0xc9d0d6:0x6a7078,at(p,0,1.1,0),{v:new V3(Math.cos(a)*sp,rnd(2,3.4),Math.sin(a)*sp),life:rnd(1.1,1.45),sc:hx?new V3(.09,.04,.09):new V3(.03,.11,.03),g:11,bounce:.35})}}
    else if(n===7){const cols=[0xff5c5c,0xffd23f,0x58b4ff];for(let i=0;i<3;i++){const o=obj('balloon');o.material=bodyMat;const a=i/3*TAU;o.position.copy(at(p,Math.cos(a)*.3,1.3,Math.sin(a)*.3));
      objs.push({o,kind:'balloon',t:0,life:1.4,y:p.y+1.3,col:cols[i],vy:rnd(1,1.25),ph:a})}}
    else if(n===8){for(let i=0;i<5;i++){const o=obj('duck');const a=i/5*TAU+Math.random();o.position.copy(at(p,0,.8,0));o.rotation.y=a;
      objs.push({o,kind:'duck',t:0,life:1.45,x:p.x,y:p.y+.8,z:p.z,vx:Math.sin(a)*rnd(.8,1.3),vz:Math.cos(a)*rnd(.8,1.3),vy:rnd(2,3),fl:Wd.floor(p.x,p.z,p.y+.5)})}}
  }
  function stepPool(Pl,dt){if(!Pl.m.visible)return;let any=false;
    for(let i=0;i<Pl.n;i++){const q=Pl.ps[i];if(!q.on)continue;q.t+=dt;if(q.t>=q.life){q.on=false;Pl.m.setMatrixAt(i,ZM);continue}any=true;
      q.v.y-=q.g*dt;if(q.drag){const k=Math.max(0,1-q.drag*dt);q.v.x*=k;q.v.z*=k;if(q.k===1&&q.v.y<-1.1)q.v.y=-1.1}
      q.P.addScaledVector(q.v,dt);if(q.P.y<q.fl+q.sc.y/2){q.P.y=q.fl+q.sc.y/2;if(q.bounce&&q.v.y<-1)q.v.y*=-q.bounce;else q.v.y=0;q.v.x*=.6;q.v.z*=.6;q.sp.multiplyScalar(.5)}
      q.r.addScaledVector(q.sp,dt);const u=q.t/q.life;let s=u>.7?(1-u)/.3:1;if(q.k===2)s=(u<.15?u/.15:1)*(1-u)*(Math.random()<.15?0:1);
      _o.position.copy(q.P);_o.rotation.set(q.r.x,q.r.y,q.r.z);_o.scale.copy(q.sc).multiplyScalar(Math.max(.001,s));_o.updateMatrix();Pl.m.setMatrixAt(i,_o.matrix)}
    Pl.m.instanceMatrix.needsUpdate=true;if(!any)Pl.m.visible=false}
  function step(dt){
    stepPool(lit,dt);stepPool(glo,dt);
    for(let i=objs.length-1;i>=0;i--){const q=objs[i],o=q.o;q.t+=dt;const u=q.t/q.life;
      if(q.kind==='ghost'){o.position.set(q.x+Math.sin(q.t*5)*.12,q.y+q.t*.9,q.z);o.rotation.y=Math.sin(q.t*3)*.4;o.scale.setScalar(u<.15?u/.15:u>.7?(1-u)/.3:1)}
      else if(q.kind==='card'){o.position.y=q.y+Math.min(.6,q.t*2.5);o.rotation.y=q.t*7;o.scale.setScalar(u<.15?.2+u/.15*.8:u>.75?(1-u)/.25:1)}
      else if(q.kind==='balloon'){if(!q.done){q.done=1;o.geometry=balloonFor(q.col)}o.position.y=q.y+q.t*q.vy;o.position.x+=Math.sin(q.t*4+q.ph)*.004;if(q.t>q.life-.12){o.scale.setScalar(1.25);}
        if(q.t>=q.life-.05&&!q.popped){q.popped=1;for(let k=0;k<8;k++)add(glo,q.col,o.position.clone(),{v:new V3(rnd(-1.5,1.5),rnd(-1,1.5),rnd(-1.5,1.5)),life:.25,s:.05,k:0})}}
      else if(q.kind==='duck'){q.vy-=10*dt;q.x+=q.vx*dt;q.z+=q.vz*dt;q.y+=q.vy*dt;if(q.y<q.fl){q.y=q.fl;q.vy=Math.abs(q.vy)*.5;q.vx*=.7;q.vz*=.7}o.position.set(q.x,q.y,q.z);o.rotation.x=Math.sin(q.t*12)*.2;o.scale.setScalar(u>.8?(1-u)/.2:1)}
      if(q.t>=q.life){o.visible=false;(spare[q.kind]||(spare[q.kind]=[])).push(o);objs.splice(i,1)}}
  }
  function clear(){for(const q of objs){q.o.visible=false;spare[q.kind].push(q.o)}objs.length=0;for(const Pl of [lit,glo]){for(let i=0;i<Pl.n;i++){Pl.ps[i].on=false;Pl.m.setMatrixAt(i,ZM)}Pl.m.instanceMatrix.needsUpdate=true;Pl.m.visible=false}}
  return {play,step,clear,busy:()=>objs.length>0||lit.m.visible||glo.m.visible,add,lit,glo,objs,obj};
}
// balloons come in three colours: one geometry each (the string stays white)
const balloonGeos={};
function balloonFor(col){if(balloonGeos[col])return balloonGeos[col];return balloonGeos[col]=mergeColoured([[.26,.32,.26,0,0,0,col,0,0,0,'o'],[.05,.05,.05,0,-.17,0,col],[.008,.3,.008,0,-.34,0,0xeeeeee]])}
let mainFx=null;
const fxMain=()=>mainFx||(mainFx=makeFx({scene:X.scene,floor:(x,z,y)=>X.floorAt(x,z,y)}));
const teamHex=e=>{const k=e.model&&e.model.userData.key;const S=X.SUITS[k]||X.SUITS.me;return S[0]};
// victim was eliminated by killer: the killer's effect plays once where the victim fell
function elim(victim,killer){
  if(!victim||!killer||killer===victim||X.RM)return;const k=killer.model&&killer.model.userData.lk,n=k&&k.e|0;if(!(n>=1&&n<=N.e))return;
  const T=now();if(victim._lkFx&&T-victim._lkFx<2)return;victim._lkFx=T;
  fxMain().play(n,victim.pos.clone(),teamHex(victim));
}

// =====================================================================
//  Round-win celebrations: while the round is over and this player's team won it (every enemy is out), a player who
//  wears one plays it, from where they stand (it only moves the picture: the body's position is never changed), and
//  stops as soon as they move or shoot.
// =====================================================================
function winning(e){
  if(!e.alive||!e.present)return false;
  if(X.online){const R=X.RD;return !!R&&R.ph==='over'&&!!R.rw&&X.teamOf(e)===R.rw}
  return X.state==='playing'&&X.phase==='over'&&e===X.player;
}
const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);
// pose(u,t,m,w): u the model's parts, t seconds into it, m the model, w how far in (0..1, it eases in and out)
const POSES=[null,
  (u,t,m,w)=>{const a=Math.abs(Math.sin(t*6));u.arms.rotation.x+=w*(.8+.45*a-u.arms.rotation.x);u.arms.position.y+=w*(.12*a);m.position.y+=w*.04*a},
  (u,t,m,w)=>{const h=Math.abs(Math.sin(t*5.5));m.position.y+=w*h*.3;u.legs[0].rotation.x=u.legs[0].rotation.x*(1-w)+w*-.4*h;u.legs[1].rotation.x=u.legs[1].rotation.x*(1-w)+w*-.4*h;u.arms.rotation.x+=w*(1.1-u.arms.rotation.x)},
  (u,t,m,w)=>{m.rotation.y+=w*ease(t/1.1)*TAU+(t>1.1?w*(t-1.1)*0:0);u.arms.rotation.x+=w*(.6-u.arms.rotation.x);u.legs[0].rotation.x*=1-w;u.legs[1].rotation.x*=1-w},
  (u,t,m,w)=>{const b=Math.floor(t*4)%4;u.head.rotation.y=w*[.5,0,-.5,0][b];u.arms.rotation.x+=w*([.8,.2,.8,-.2][b]-u.arms.rotation.x);m.rotation.y+=w*[.25,0,-.25,0][b];u.legs[0].rotation.x=w*(b===1?-.3:0);u.legs[1].rotation.x=w*(b===3?-.3:0)},
  (u,t,m,w)=>{const s=Math.sin(t*9);m.position.y+=w*Math.abs(s)*.14;m.rotation.z=w*s*.12;u.legs[0].rotation.x=w*(s>0?-.7*s:0);u.legs[1].rotation.x=w*(s<0?.7*s:0);u.arms.rotation.x+=w*(.9+.3*s-u.arms.rotation.x)},
  (u,t,m,w)=>{const b=ease(t/.6)*(t<2?1:ease((2.6-t)/.6));m.rotation.x=w*b*.42;u.head.rotation.x+=w*b*.3;u.arms.rotation.x+=w*(-.5*b-u.arms.rotation.x*b)},
  (u,t,m,w)=>{u.arms.rotation.x+=w*(1.35-u.arms.rotation.x);u.arms.position.y+=w*.1;m.position.y+=w*Math.abs(Math.sin(t*4))*.05},
  (u,t,m,w)=>{u.arms.rotation.x+=w*(1.25-u.arms.rotation.x);u.head.rotation.x+=w*.4}
];
const CEL_FIRE=8,CEL_TROPHY=7;
function anim(e,dt){
  const m=e.model,u=m.userData,n=u.lk&&u.lk.c|0;
  if(!(n>=1&&n<=N.c)){if(u._celP)u._celP.visible=false;return}
  const on=winning(e)&&!(Math.hypot(e.vel.x,e.vel.z)>.8)&&!(e.cd>0&&e.cd<.05);
  if(on){u._celT=(u._celT||0)+dt;u._celW=Math.min(1,(u._celW||0)+dt*5)}
  else{u._celW=Math.max(0,(u._celW||0)-dt*6);if(!u._celW)u._celT=0}
  const w=ease(u._celW||0);
  if(n===CEL_TROPHY){if(!u._celP&&w>0){u._celP=new THREE.Mesh(GEOS.trophy(),bodyMat);u._celP.position.set(.05,2.42,-.2);m.add(u._celP)}if(u._celP){u._celP.visible=w>.05;u._celP.scale.setScalar(Math.max(.001,w))}}
  if(!w){if(u._celH){u.head.rotation.y=0;u._celH=0}return}
  u._celH=1;
  POSES[n](u,X.RM?.35:u._celT,m,w);   // reduced motion: the pose, held still
  if(n===CEL_FIRE&&on&&!X.RM){u._celF=(u._celF||0)-dt;if(u._celF<=0){u._celF=.7;const p=e.pos.clone().add(new V3(rnd(-.6,.6),3.2+Math.random()*.6,rnd(-.6,.6)));const cols=[0xff5c8a,0x58b4ff,0xffd23f,0x7dff8a,0xffffff],c=cols[Math.floor(Math.random()*5)];
    const F=fxMain();for(let i=0;i<22;i++){const a=Math.random()*TAU,b=Math.acos(rnd(-1,1)),sp=rnd(1.4,2.2);F.add(F.glo,c,p,{v:new V3(Math.sin(b)*Math.cos(a)*sp,Math.cos(b)*sp,Math.sin(b)*Math.sin(a)*sp),life:rnd(.6,.9),s:.06,g:2,drag:1.5,k:0})}}}
}

// =====================================================================
//  The Locker's pictures: a small scene of its own, drawn by the game's renderer into an off-screen target and copied
//  into a canvas (only while the Locker is open, and only for a player who may see it)
// =====================================================================
let pv=null;
function pvInit(){
  if(pv)return pv;const scene=new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xfff0c4,.42));const sun=new THREE.DirectionalLight(0xfff0c8,.42);sun.position.set(-.7,.6,-.35);scene.add(sun);
  const fill=new THREE.DirectionalLight(0xc4d2c4,.18);fill.position.set(.3,.25,.9);scene.add(fill);
  const cam=new THREE.PerspectiveCamera(30,1,.05,60);
  const model=X.makeSuit(...X.SUITS.me);scene.add(model);model.userData.key='me';
  const floor=new THREE.Mesh(new THREE.CircleGeometry(1.1,40),new THREE.MeshLambertMaterial({color:0x8a7a4c}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;scene.add(floor);
  const wallMat=X.plyTex?new THREE.MeshLambertMaterial({map:X.plyTex}):new THREE.MeshLambertMaterial({color:0xcaa979});
  const wall=new THREE.Mesh(new THREE.BoxGeometry(4,4,.25),wallMat);wall.visible=false;scene.add(wall);
  const fx=makeFx({scene,floor:()=>0});
  const gun=new THREE.Mesh(new THREE.BufferGeometry(),X.gunVMat);gun.visible=false;scene.add(gun);
  return pv={scene,cam,model,floor,wall,wallMat,fx,gun,rt:null,buf:null};
}
// dress the preview figure in kit k with suit colours key
function pvDress(k,key){const p=pvInit(),m=p.model,u=m.userData;
  if(u.key!==key){const S=X.SUITS[key]||X.SUITS.me;u.ms.color.setHex(S[0]);u.mt.color.setHex(S[1]);u.mv.color.setHex(S[2]);u.key=key;u._lkO=null}
  wearOn(m,k);X.setGun(m,u.gunId<0?0:u.gunId);
  m.position.set(0,0,0);m.rotation.set(0,0,0);m.visible=true;
  u.legs[0].rotation.x=u.legs[1].rotation.x=0;u.arms.rotation.x=0;u.arms.position.y=1.44;u.head.rotation.set(0,0,0);u.gun.position.z=-.62;
  if(u._celP)u._celP.visible=false;
}
function pvRender(w,h,cv){
  const p=pvInit(),R=X.renderer;
  if(!p.rt||p.rt.width!==w||p.rt.height!==h){if(p.rt)p.rt.dispose();p.rt=new THREE.WebGLRenderTarget(w,h);p.buf=new Uint8Array(w*h*4)}
  p.cam.aspect=w/h;p.cam.updateProjectionMatrix();
  const cc=R.getClearColor(new THREE.Color()),ca=R.getClearAlpha();
  R.setRenderTarget(p.rt);R.setClearColor(0x000000,0);R.clear();R.render(p.scene,p.cam);R.readRenderTargetPixels(p.rt,0,0,w,h,p.buf);
  R.setRenderTarget(null);R.setClearColor(cc,ca);
  cv=cv||document.createElement('canvas');if(cv.width!==w)cv.width=w;if(cv.height!==h)cv.height=h;
  const g=cv.getContext('2d'),img=g.createImageData(w,h),row=w*4;for(let y=0;y<h;y++)img.data.set(p.buf.subarray((h-1-y)*row,(h-y)*row),y*row);
  g.putImageData(img,0,0);return cv;
}
// the camera for each kind of picture; yaw turns the figure (0 its front, PI its back)
function pvShot(kind,yaw){
  const p=pvInit(),c=p.cam,m=p.model;m.rotation.y=(yaw||0)+Math.PI;p.wall.visible=kind==='build';p.gun.visible=false;m.visible=kind!=='build';p.floor.visible=kind!=='build'&&kind!=='gun';
  if(kind==='gun'){m.rotation.y=0;c.position.set(2.1,1.75,-.55);c.lookAt(.16,1.4,-.95)}
  else if(kind==='build'){p.wall.rotation.set(0,-.55,0);p.wall.position.set(0,2,0);c.position.set(0,2.2,9.2);c.lookAt(0,2,0)}
  else if(kind==='fx'){c.position.set(0,2.2,6.4);c.lookAt(0,1.1,0)}
  else if(kind==='far'){c.position.set(0,1.3,16);c.lookAt(0,1.05,0)}
  else{c.position.set(0,1.5,5.6);c.lookAt(0,1.1,0)}
}
const thumbs=new Map();
function thumb(slot,no,key){
  const id=slot+':'+no+':'+key;if(thumbs.has(id))return thumbs.get(id);
  const p=pvInit(),k=parse('');k[slot]=no;pvDress(k,key);
  if(slot==='o'){pvShot('fig',.5)}
  else if(slot==='g'){pvShot('gun')}
  else if(slot==='b'){p.wallMat.map=no?bTex(no):X.plyTex;p.wallMat.needsUpdate=true;pvShot('build')}
  else if(slot==='e'){pvShot('fx');p.fx.clear();m_die(p.model,.5);if(no){p.fx.play(no,new V3(0,0,0),(X.SUITS[key]||X.SUITS.me)[0]);let t=0;while(t<.45){p.fx.step(1/30);t+=1/30}}}
  else{pvShot('fig',.5);if(no){const u=p.model.userData;u._celP=u._celP||null;POSES[no](u,.35,p.model,1);if(no===CEL_TROPHY){if(!u._celP){u._celP=new THREE.Mesh(GEOS.trophy(),bodyMat);u._celP.position.set(.05,2.42,-.2);p.model.add(u._celP)}u._celP.visible=true;u._celP.scale.setScalar(1)}}}
  const url=pvRender(128,128).toDataURL();p.fx.clear();thumbs.set(id,url);return url;
}
// the falling-over of an eliminated player (as index.html's animModel draws it), t seconds in
function m_die(m,t){m.rotation.set(0,m.rotation.y,Math.min(1.5,t*5));m.position.y=Math.min(.25,t);m.visible=t<=2.2}

// =====================================================================
//  The Locker screen (made here, only for a player who may see it: nobody else's menu changes)
// =====================================================================
const TABS=[['o','Outfits'],['g','Gun skins'],['b','Builds'],['e','Eliminations'],['c','Celebrations']];
const RAR={common:'#b7ad8f',uncommon:'#7bd36a',rare:'#62b0ff',epic:'#c48bff',legendary:'#ffb23f'};
const PLAIN={o:'The plain suit, in your team colour.',g:'The guns as they come.',b:'Plain plywood.',e:'Just the usual fall.',c:'Nothing extra when you win a round.'};
let ui=null,tab='o',spin=0,pvT=0,pvKey='me',playT=0;
function items(slot){const C=cat(),out=[];const list=C&&C.gameItems?C.gameItems(GAME,CAT_SLOT[slot]):[];
  for(let i=1;i<=N[slot];i++){const it=list.find(x=>x.no===i);out.push({no:i,name:LISTS[slot][i-1],rarity:it?it.rarity:'',desc:it?it.desc:''})}return out}
function css(){
  const st=document.createElement('style');st.id='lkCss';st.textContent=`
#lkLocker{z-index:6;padding:12px}
#lkLocker .lk-card{width:min(960px,100%);max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);display:flex;flex-direction:column;gap:10px;padding:16px 18px;background:#1c1809;border:1px solid rgba(244,234,208,.24);box-shadow:6px 6px 0 rgba(0,0,0,.45)}
.lk-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.lk-head h2{margin:0;font-family:var(--f-osd);font-weight:400;font-size:44px;line-height:.9;color:#f6e7a6;text-shadow:2px 0 rgba(255,50,50,.5),-2px 0 rgba(40,200,255,.4)}
.lk-head .seg{flex:0 1 auto;flex-wrap:wrap}
.lk-head .seg button{padding:7px 12px;font-size:15px}
.lk-head .cta{margin-left:auto;padding:8px 18px;font-size:17px}
.lk-body{display:grid;grid-template-columns:minmax(0,290px) minmax(0,1fr);gap:16px;min-height:0;flex:1 1 auto}
.lk-pv{display:flex;flex-direction:column;gap:8px;min-height:0}
.lk-stage{position:relative;border:1px solid var(--line);background:radial-gradient(ellipse at 50% 35%,#e8d68a,#b8a052 60%,#6e5e2c);aspect-ratio:1;width:100%;overflow:hidden}
.lk-stage canvas{position:absolute;inset:0;width:100%;height:100%}
.lk-team{width:100%}.lk-team button{padding:5px 10px;font-size:13px;flex:1 1 auto}
.lk-info{margin:0;font-size:15px;line-height:1.35;color:var(--ink-dim);min-height:2.7em}
.lk-info b{color:var(--ink);font-weight:800}
.lk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;overflow:auto;align-content:start;padding:2px 6px 10px 2px;min-height:0}
.lk-tile{display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid var(--line);background:rgba(0,0,0,.35);padding:4px 4px 6px;cursor:pointer;font-weight:700;font-size:13px;line-height:1.1;text-align:center;color:var(--ink)}
.lk-tile img{width:100%;aspect-ratio:1;display:block;background:radial-gradient(ellipse at 50% 35%,#d9c46e,#9c8a44 70%,#5e5026)}
.lk-tile i{font-style:normal;font-size:10px;font-weight:800;color:var(--rc);text-transform:uppercase;letter-spacing:.1em}
.lk-tile[aria-pressed="true"]{border-color:var(--mustard);box-shadow:inset 0 0 0 2px var(--mustard);background:rgba(60,48,14,.82)}
.lk-tile:hover{border-color:var(--mustard)}
.lk-note{margin:0;font-size:13px;color:var(--ink-dim)}
#lkRow small{color:var(--ink-dim);font-size:15px}
@media (max-width:640px){
  #lkLocker{padding:8px}
  #lkLocker .lk-card{padding:10px;gap:8px;max-height:calc(100dvh - 16px)}
  .lk-head{gap:8px}
  .lk-head h2{font-size:34px}
  .lk-head .seg{order:3;flex-basis:100%;width:100%}
  .lk-head .seg button{padding:6px 7px;font-size:12.5px;flex:1 1 auto}
  .lk-body{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);gap:8px}
  .lk-pv{display:grid;grid-template-columns:140px minmax(0,1fr);gap:4px 10px;align-items:start}
  .lk-stage{grid-row:span 2}
  .lk-info{font-size:13px;min-height:0}
  .lk-grid{grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px}
  .lk-tile{font-size:12px}
  .lk-note{display:none}
}
@media (max-height:520px) and (min-width:641px){
  #lkLocker{padding:6px}
  #lkLocker .lk-card{padding:8px 12px;gap:6px;max-height:calc(100dvh - 12px)}
  .lk-head h2{font-size:30px}
  .lk-head .seg button{padding:5px 8px;font-size:13px}
  .lk-head .cta{padding:6px 14px;font-size:15px}
  .lk-body{grid-template-columns:minmax(0,180px) minmax(0,1fr);gap:10px}
  .lk-team button{padding:4px 6px;font-size:12px;letter-spacing:.02em}
  .lk-info{font-size:12.5px;min-height:0}
  .lk-note{display:none}
  .lk-grid{grid-template-columns:repeat(auto-fill,minmax(86px,1fr));gap:6px}
}`;document.head.appendChild(st);
}
const $=X.$;
function build(){
  if(ui)return ui;css();
  if(!window.BackRoomCosmetics&&!document.querySelector('script[src$="/cosmetics.js"]')){const s=document.createElement('script');s.src='/e63334287a3deaa3/cosmetics.js';s.onload=()=>{thumbs.clear();if(ui&&!ui.sec.hidden)draw()};document.head.appendChild(s)}
  const row=document.createElement('div');row.className='group';row.id='lkRow';
  row.innerHTML='<span class="label">'+X.esc(TX('Locker · captains only'))+'</span><div class="row"><button class="ghost-btn" id="lkOpen" type="button">'+X.esc(TX('Locker'))+'</button><small>'+X.esc(TX('Outfits, gun skins, build skins, eliminations and celebrations. Looks only.'))+'</small></div>';
  const pg=$('play').closest('.group');pg.insertAdjacentElement('afterend',row);
  const sec=document.createElement('section');sec.id='lkLocker';sec.className='overlay center';sec.hidden=true;sec.setAttribute('role','dialog');sec.setAttribute('aria-label',TX('Locker'));
  sec.innerHTML='<div class="lk-card"><div class="lk-head"><h2 data-noi18n>LOCKER</h2><div class="seg" id="lkTabs" role="radiogroup" aria-label="'+X.esc(TX('Locker section'))+'">'+
    TABS.map(t=>'<button type="button" role="radio" data-t="'+t[0]+'">'+X.esc(TX(t[1]))+'</button>').join('')+'</div><button class="cta" id="lkClose" type="button">'+X.esc(TX('Done'))+'</button></div>'+
    '<div class="lk-body"><div class="lk-pv"><div class="lk-stage"><canvas id="lkCv" width="300" height="300" aria-hidden="true"></canvas></div>'+
    '<div class="seg lk-team" id="lkTeam" role="radiogroup" aria-label="'+X.esc(TX('Colours'))+'"><button type="button" role="radio" data-k="me">'+X.esc(TX('Practice'))+'</button><button type="button" role="radio" data-k="r">'+X.esc(TX('Red'))+'</button><button type="button" role="radio" data-k="b">'+X.esc(TX('Blue'))+'</button></div>'+
    '<p class="lk-info" id="lkInfo" data-noi18n></p></div><div class="lk-grid" id="lkGrid" role="group" aria-label="'+X.esc(TX('Items'))+'" data-noi18n></div></div>'+
    '<p class="lk-note">'+X.esc(TX('Free to wear while the Locker is captains only. Looks only: every outfit is the same size as the plain suit and online it is always in your team colour.'))+'</p></div>';
  $('menu').insertAdjacentElement('afterend',sec);
  $('lkOpen').addEventListener('click',open);$('lkClose').addEventListener('click',close);
  sec.addEventListener('click',e=>{if(e.target===sec)close()});
  sec.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close()});
  $('lkTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b){tab=b.dataset.t;playT=0;draw()}});
  $('lkTeam').addEventListener('click',e=>{const b=e.target.closest('button');if(b){pvKey=b.dataset.k;draw()}});
  return ui={row,sec};
}
function info(slot,no){const it=no?items(slot)[no-1]:null,el=$('lkInfo');el.textContent='';
  const b=document.createElement('b');b.textContent=it?TX(it.name):TX('Plain');el.append(b,document.createTextNode(' '+(it?(it.desc?TX(it.desc):''):TX(PLAIN[slot]))))}
function draw(){
  if(!ui)return;for(const b of $('lkTabs').children)b.setAttribute('aria-checked',String(b.dataset.t===tab));
  for(const b of $('lkTeam').children)b.setAttribute('aria-checked',String(b.dataset.k===pvKey));
  $('lkTeam').style.visibility=tab==='g'||tab==='b'?'hidden':'';
  const grid=$('lkGrid');grid.textContent='';const cur=myKit[tab]|0;
  for(const it of [{no:0,name:'Plain',rarity:''}].concat(items(tab))){const b=document.createElement('button');b.type='button';b.className='lk-tile';b.setAttribute('aria-pressed',String(it.no===cur));if(it.desc)b.title=TX(it.desc);
    const img=document.createElement('img');img.alt='';img.src=thumb(tab,it.no,tab==='g'||tab==='b'?'me':pvKey);const n=document.createElement('span');n.textContent=TX(it.name);b.append(img,n);
    if(it.rarity){const r=document.createElement('i');r.style.setProperty('--rc',RAR[it.rarity]||'#b7ad8f');r.textContent=TX(it.rarity);b.append(r)}
    b.addEventListener('click',()=>{wear(tab,it.no);playT=0;draw()});grid.appendChild(b)}
  info(tab,cur);bigPv();
}
function bigPv(){
  if(!ui||ui.sec.hidden)return;const p=pvInit(),cv=$('lkCv'),r=Math.min(2,devicePixelRatio||1),w=Math.min(420,Math.max(140,Math.round(cv.clientWidth*r)))||300;
  const key=tab==='g'||tab==='b'?'me':pvKey;pvDress(myKit,key);const m=p.model,u=m.userData;
  if(tab==='o')pvShot('fig',spin);
  else if(tab==='g')pvShot('gun');
  else if(tab==='b'){p.wallMat.map=myKit.b?bTex(myKit.b):X.plyTex;p.wallMat.needsUpdate=true;pvShot('build');p.wall.rotation.y=-.55+Math.sin(spin*.7)*.35}
  else if(tab==='e'){pvShot('fx',.6);const t=playT%2.6;m_die(m,t)}
  else{pvShot('fig',.6+Math.sin(spin*.5)*.3);const n=myKit.c|0,t=playT%3;if(n){POSES[n](u,t,m,ease(Math.min(t*5,(3-t)*5,1)));if(n===CEL_TROPHY){if(!u._celP){u._celP=new THREE.Mesh(GEOS.trophy(),bodyMat);u._celP.position.set(.05,2.42,-.2);m.add(u._celP)}u._celP.visible=true;u._celP.scale.setScalar(1)}}}
  pvRender(w,w,cv);
}
function open(){if(!X.on||X.state!=='menu')return;build();ui.sec.hidden=false;spin=0;playT=0;draw();const f=$('lkGrid').querySelector('[aria-pressed="true"]');if(f)f.focus({preventScroll:false})}
function close(){if(!ui)return;ui.sec.hidden=true;if(pv)pv.fx.clear();const b=$('lkOpen');if(b)b.focus()}
// Called by index.html when who may see the Locker may have changed, and once when this file arrives.
function access(){
  refreshMine();
  if(X.on){build();ui.row.hidden=false}
  else if(ui){ui.row.hidden=true;if(!ui.sec.hidden)close()}
}
let fireT=0;
function update(dt){
  if(mainFx)mainFx.step(dt);
  if(ui&&!ui.sec.hidden){
    if(X.state!=='menu'){close();return}
    spin+=dt*.6;pvT+=dt;const was=playT;playT+=dt;
    if(tab==='e'&&myKit.e&&(was===0||Math.floor(was/2.6)!==Math.floor(playT/2.6))){pv.fx.clear();pv.fx.play(myKit.e,new V3(0,0,0),(X.SUITS[pvKey]||X.SUITS.me)[0])}
    if(tab==='c'&&myKit.c===CEL_FIRE&&!X.RM){fireT-=dt;if(fireT<=0){fireT=.7;const c=[0xff5c8a,0x58b4ff,0xffd23f,0x7dff8a][Math.floor(Math.random()*4)],q=new V3(rnd(-.5,.5),3,rnd(-.3,.3));for(let i=0;i<22;i++){const a=Math.random()*TAU,b=Math.acos(rnd(-1,1)),sp=rnd(1.4,2.2);pv.fx.add(pv.fx.glo,c,q,{v:new V3(Math.sin(b)*Math.cos(a)*sp,Math.cos(b)*sp,Math.sin(b)*Math.sin(a)*sp),life:rnd(.6,.9),s:.06,g:2,drag:1.5})}}}
    if(pv)pv.fx.step(dt);
    if(pvT>1/20){pvT=0;bigPv()}
  }
}
const shared=o=>SHARED.has(o.geometry)||SHARED.has(o.material)||(o.isMesh&&o.geometry===ghostGeo);

// =====================================================================
//  Test hook (automated browsers only): contact sheets drawn by the real code, and the fairness numbers
// =====================================================================
if(navigator.webdriver)window.__lk={parse,wireOf,wear,heard,get mine(){return Object.assign({},myKit)},get wire(){return myWire},N,LISTS,OUTFITS,WRAPS,open,close,thumbs,fxMain,elim,gunGeo,bTex,bake,dress,pvInit,pvDress,pvShot,pvRender,POSES,makeFx,winning,
  get tab(){return tab},set tab(v){tab=v},get pvKey(){return pvKey},set pvKey(v){pvKey=v},draw,m_die,
  // one picture per item (outfits front and back, in the given suit colours; gun skins; build skins; effects and
  // celebrations at three moments)
  sheet(slot,opt){opt=opt||{};const key=opt.key||'r',cell=opt.cell||180,shots=[],p=pvInit(),lo=opt.from||0,hi=opt.to==null?N[slot]:opt.to;
    for(let i=lo;i<=hi;i++){const k=parse('');k[slot]=i;const name=i?LISTS[slot][i-1]:'Plain';
      if(slot==='o'){for(const yaw of [.35,Math.PI+.35]){pvDress(k,key);pvShot(opt.far?'far':'fig',yaw);shots.push([pvRender(cell,Math.round(cell*1.3)),name+(yaw>1?' (back)':'')])}}
      else if(slot==='g'){for(const wi of [0,1,2]){pvDress(k,'me');p.model.userData.gunId=-1;X.setGun(p.model,wi);pvShot('gun');shots.push([pvRender(cell,cell),name+' '+['rifle','shotgun','sniper'][wi]])}p.model.userData.gunId=-1;X.setGun(p.model,0)}
      else if(slot==='b'){p.wallMat.map=i?bTex(i):X.plyTex;p.wallMat.needsUpdate=true;pvShot('build');shots.push([pvRender(cell,cell),name])}
      else if(slot==='e'){for(const t of [.15,.5,1.0]){pvDress(parse(''),key);pvShot('fx');p.fx.clear();if(i)p.fx.play(i,new V3(0,0,0),X.SUITS[key][0]);let s=0;while(s<t){p.fx.step(1/60);m_die(p.model,s);s+=1/60}shots.push([pvRender(cell,cell),name+' '+t+'s'])}p.fx.clear()}
      else{for(const t of [.3,.8,1.4]){pvDress(k,key);pvShot('fig',.5);const u=p.model.userData;if(i){POSES[i](u,t,p.model,1);if(i===CEL_TROPHY){if(!u._celP){u._celP=new THREE.Mesh(GEOS.trophy(),bodyMat);u._celP.position.set(.05,2.42,-.2);p.model.add(u._celP)}u._celP.visible=true;u._celP.scale.setScalar(1)}}shots.push([pvRender(cell,Math.round(cell*1.3)),name+' '+t+'s'])}}}
    const cols=opt.cols||(slot==='o'?8:slot==='b'?7:6),w=shots[0][0].width,h=shots[0][0].height+20,rows=Math.ceil(shots.length/cols),out=document.createElement('canvas');out.width=cols*w;out.height=rows*h;
    const g=out.getContext('2d');g.fillStyle='#3a3218';g.fillRect(0,0,out.width,out.height);g.font='600 13px sans-serif';g.textAlign='center';
    shots.forEach(([cv,label],j)=>{const x=(j%cols)*w,y=Math.floor(j/cols)*h;g.fillStyle='#cfb95f';g.fillRect(x+1,y+1,w-2,h-22);g.drawImage(cv,x,y);g.fillStyle='#f4ead0';g.fillText(label,x+w/2,y+h-5)});
    return out.toDataURL('image/png')},
  // fairness: each outfit drawn flat (its true colours, no lighting) from the front, back and both sides, against the
  // plain suit in the same team colours: outline area, height and width, brightness, distance from the wall and carpet
  // colours, how much of it is close to them, and how much is in the team colour
  fair(keys,opt){keys=keys||['r','b'];const p=pvInit(),m=p.model,R=X.renderer,S=160,Hm=2.8;
    const cam=new THREE.OrthographicCamera(-Hm/2,Hm/2,Hm,0,.1,20);const rt=new THREE.WebGLRenderTarget(S,S*2),buf=new Uint8Array(S*S*2*4);
    const WALL=[.812,.725,.373],CARPET=[.459,.404,.247],CARPET_LIT=[.62,.56,.4],lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
    function views(){const swap=[];m.traverse(o=>{if(o.isMesh&&o.visible&&o!==p.floor){swap.push([o,o.material]);o.material=new THREE.MeshBasicMaterial({color:o.material.color,vertexColors:!!o.material.vertexColors})}});
      p.floor.visible=false;p.wall.visible=false;const res=[];
      for(const [vx,vz] of [[0,-6],[0,6],[-6,0],[6,0]]){cam.position.set(vx,0,vz);cam.lookAt(0,0,0);cam.position.y=0;cam.updateProjectionMatrix();
        R.setRenderTarget(rt);R.setClearColor(0x000000,0);R.clear();R.render(p.scene,cam);R.readRenderTargetPixels(rt,0,0,S,S*2,buf);
        let n=0,L=0,Dm=0,camo=0,x0=S,x1=-1,y1=-1;const px=[];
        for(let y=0;y<S*2;y++)for(let x=0;x<S;x++){const i=(y*S+x)*4;if(buf[i+3]<128)continue;const c=[buf[i]/255,buf[i+1]/255,buf[i+2]/255];n++;L+=lum(c);const d=Math.min(dist(c,WALL),dist(c,CARPET),dist(c,CARPET_LIT));Dm+=d;if(d<.15)camo++;px.push(c);if(x<x0)x0=x;if(x>x1)x1=x;if(y>y1)y1=y}
        res.push({area:n,lum:L/n,dist:Dm/n,camo:camo/n,w:(x1-x0+1)/S*Hm,top:(y1+1)/(S*2)*Hm,px})}
      R.setRenderTarget(null);for(const [o,mt] of swap){o.material.dispose();o.material=mt}return res}
    const rows=[];
    for(const key of keys){const PP=palette(OUTFITS[1],key),team=[PP.T,PP.K,PP.L,PP.D].map(rgb);
      const noTk=()=>{if(m.userData.tk)m.userData.tk.visible=false};
      const base=(()=>{pvDress(parse(''),key);noTk();m.rotation.set(0,0,0);return views()})();
      for(let i=0;i<=N.o;i++){const k=parse('');k.o=i;pvDress(k,key);noTk();m.rotation.set(0,0,0);const v=i?views():base;
        const share=V=>V.px.filter(c=>team.some(t=>dist(c,t)<.1)).length/V.px.length;
        const sum=V=>({area:V.reduce((t,a)=>t+a.area,0)/V.reduce((t,a)=>t,0)});
        const row={key,i,name:i?LISTS.o[i-1]:'Plain',front:v[0].area/base[0].area,back:v[1].area/base[1].area,side:(v[2].area+v[3].area)/(base[2].area+base[3].area),
          width:Math.max(v[0].w,v[1].w)-Math.max(base[0].w,base[1].w),depth:Math.max(v[2].w,v[3].w)-Math.max(base[2].w,base[3].w),top:Math.max(...v.map(a=>a.top))-Math.max(...base.map(a=>a.top)),
          lum:v.reduce((t,a)=>t+a.lum*a.area,0)/v.reduce((t,a)=>t+a.area,0),blum:base.reduce((t,a)=>t+a.lum*a.area,0)/base.reduce((t,a)=>t+a.area,0),
          dist:v.reduce((t,a)=>t+a.dist*a.area,0)/v.reduce((t,a)=>t+a.area,0),bdist:base.reduce((t,a)=>t+a.dist*a.area,0)/base.reduce((t,a)=>t+a.area,0),
          camo:Math.max(...v.map(a=>a.camo)),bcamo:Math.max(...base.map(a=>a.camo)),team:v.reduce((t,a)=>t+share(a)*a.area,0)/v.reduce((t,a)=>t+a.area,0),bteam:base.reduce((t,a)=>t+share(a)*a.area,0)/base.reduce((t,a)=>t+a.area,0)};
        if(opt&&opt.detail===i){const h=new Map();for(const a of v)for(const c of a.px){const q=c.map(x=>Math.round(x*20)/20).join(',');h.set(q,(h.get(q)||0)+1)}
          const tot=v.reduce((t,a)=>t+a.px.length,0);row.detail=[...h].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([q,n])=>{const c=q.split(',').map(Number);return q+' '+(n/tot*100).toFixed(1)+'% d'+Math.min(dist(c,WALL),dist(c,CARPET),dist(c,CARPET_LIT)).toFixed(2)})}
        if(i)for(const a of v)delete a.px;if(!opt||opt.detail==null||opt.detail===i)rows.push(row)}}
    rt.dispose();pvDress(myKit,'me');return rows},
  // build skins: mean colour of each picture against plywood (distance from the walls, carpet and both team colours)
  buildFair(){const out=[],read=t=>{const c=t.image,g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let r=0,gg=0,b=0,n=d.length/4;for(let i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2]}return [r/n/255,gg/n/255,b/n/255]};
    const WALL=[.812,.725,.373],CARPET=[.459,.404,.247],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),TEAMS=[X.SUITS.r[0],X.SUITS.b[0],X.SUITS.r[1],X.SUITS.b[1]].map(rgb);
    for(let i=0;i<=N.b;i++){const c=read(i?bTex(i):X.plyTex);out.push({i,name:i?LISTS.b[i-1]:'Plywood',col:c.map(v=>+v.toFixed(3)),lum:+(.2126*c[0]+.7152*c[1]+.0722*c[2]).toFixed(3),wall:+dist(c,WALL).toFixed(3),carpet:+dist(c,CARPET).toFixed(3),team:+Math.min(...TEAMS.map(t=>dist(c,t))).toFixed(3),opaque:true})}return out}
};

return {wire:()=>X.on?myWire:'',heard,suit,gunGeo,piece,elim,anim,update,access,open,close,shared};
};
