/*
 * Odd One Out Wardrobe: hunter outfits and tools, prop taunts and catch poofs. HIDDEN (captains only for now).
 *
 * index.html fetches this file only when something needs it: the Wardrobe is switched on in this browser (wardOn() there:
 * a captain's account, ODD_PUBLIC, or ?wardrobe=1 on localhost or in an automated browser), or another player arrives
 * wearing something (their node's cz). Everyone else never loads it. The page calls window.OddWardrobe(A) once, where A is
 * the short list of things it lends (WDAPI in index.html), and gets back the hooks it calls.
 *
 * What a player wears is four item numbers: outfit, tool, taunt and poof, the `no` of Odd One Out's items in
 * ../cosmetics.js (GAME_ITEMS), which also holds their names and rarity. What a number LOOKS or SOUNDS like is decided here:
 * OUTFITS, TOOLS, TAUNTS and POOFS below are in number order. A number this file doesn't know draws the usual hunter, the
 * usual rifle, no taunt and the usual burst, so an older copy of this file copes with newer items. Never reorder a list:
 * add new ones at the end, and add the item with the same number to cosmetics.js.
 *
 * Rules kept here (they are the point of the game):
 *   - Outfits and tools are for HUNTERS only. A prop is drawn by index.html's propModel exactly as before, whatever its
 *     player wears, so nothing here can make a hidden prop look different from a real object.
 *   - A hunter's outfit and tool change nothing but the picture: the hit box, height used for collisions, speed, camera,
 *     aim, reach and shots are all index.html's and untouched. Hats stay within 0.28 m of the head's centre line (the
 *     camera looks past the head at least 0.38 m to the side) and tools stay within the rifle's own space, below the line
 *     of sight, so neither can cover the crosshair. The flashlight has no real light (that would light up props).
 *     Every outfit keeps an orange hunter band on both arms, and none is darker overall than the usual hunter.
 *   - Taunts are a prop's own choice: nothing plays unless the prop presses T (or taps Taunt). A taunt plays from where
 *     the prop is for everyone in range, like a ping, so it gives the prop away on purpose; hunters still in the waiting
 *     room don't hear it (like every prop sound), and in Hide practice the hunter bots go after it as after a ping.
 *     One every TAUNT_CD seconds; other pages ignore a player's taunts closer together than TAUNT_GAP.
 *   - A poof plays only when a prop is caught (index.html's onElim, in place of the usual burst), chosen by the hunter
 *     who caught it.
 *
 * Saved in this browser as localStorage oddone-wear (JSON [outfit, tool, taunt, poof]), read only while wardOn().
 * Cost: an outfit hunter is 7 meshes (legs, body, arms, tool, tool accent, contact shadow) against the usual 16; each
 * outfit's body, legs and arms are single geometries coloured per vertex, sharing one material.
 */
window.OddWardrobe=function(A){
'use strict';
const THREE=A.THREE,V3=THREE.Vector3,TAU=Math.PI*2,PI=Math.PI;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const TAUNT_CD=10,TAUNT_GAP=8;   // seconds between your own taunts; the least gap other pages accept between a player's
const HUNTER_ORANGE='#ff7a1a';

// =====================================================================
//  Shapes, coloured per vertex
// =====================================================================
const _lc=new THREE.Color();
function paint(g,hex){
  _lc.set(hex).convertSRGBToLinear();const n=g.attributes.position.count,a=new Float32Array(n*3);
  for(let i=0;i<n;i++){a[i*3]=_lc.r;a[i*3+1]=_lc.g;a[i*3+2]=_lc.b}
  g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;
}
// several coloured shapes as one geometry (positions, normals, colours), like index.html's joinGeos
function join(list){
  let nv=0,ni=0;for(const g of list){nv+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count}
  const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),col=new Float32Array(nv*3),idx=nv>65535?new Uint32Array(ni):new Uint16Array(ni);let vo=0,io=0;
  for(const g of list){
    const n=g.attributes.position.count;pos.set(g.attributes.position.array,vo*3);nor.set(g.attributes.normal.array,vo*3);col.set(g.attributes.color.array,vo*3);
    if(g.index){const a=g.index.array;for(let i=0;i<a.length;i++)idx[io++]=a[i]+vo}else for(let i=0;i<n;i++)idx[io++]=i+vo;
    vo+=n;g.dispose();
  }
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.BufferAttribute(pos,3));o.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  o.setAttribute('color',new THREE.BufferAttribute(col,3));o.setIndex(new THREE.BufferAttribute(idx,1));o.computeBoundingSphere();return o;
}
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler();
// move, turn (x, y, z in radians, in that order of YXZ like the hunter's parts) and scale a shape
function tf(g,x,y,z,rx,ry,rz,sx,sy,sz){
  _e.set(rx||0,ry||0,rz||0,'YXZ');_q.setFromEuler(_e);
  return g.applyMatrix4(_m4.compose(new V3(x||0,y||0,z||0),_q,new V3(sx==null?1:sx,sy==null?(sx==null?1:sx):sy,sz==null?(sx==null?1:sx):sz)));
}
const rb=(w,h,d,r,x,y,z)=>A.rbox(w,h,d,r,x,y,z);
const box=(w,h,d,x,y,z)=>new THREE.BoxGeometry(w,h,d).translate(x||0,y||0,z||0);
const cyl=(rt,rbm,h,n,x,y,z)=>new THREE.CylinderGeometry(rt,rbm,h,n||12).translate(x||0,y||0,z||0);
// a cylinder lying along z (front +z): rf is the radius at the front end
const cz=(rf,rr,len,n,x,y,z)=>new THREE.CylinderGeometry(rf,rr,len,n||12).rotateX(PI/2).translate(x||0,y||0,z||0);
const sph=(r,x,y,z,sx,sy,sz,ws,hs)=>new THREE.SphereGeometry(r,ws||14,hs||9).scale(sx||1,sy||sx||1,sz||sx||1).translate(x||0,y||0,z||0);
const dome=(r,x,y,z,sy,ws)=>new THREE.SphereGeometry(r,ws||16,6,0,TAU,0,PI/2).scale(1,sy||1,1).translate(x||0,y||0,z||0);
const torus=(R,t,x,y,z,rx,ry,arc)=>tf(new THREE.TorusGeometry(R,t,6,20,arc||TAU),x,y,z,rx,ry);
// an n-pointed star lying flat in x-y, facing +z: a 2n-sided cylinder with every other corner pulled in
function star(n,ro,ri,th){
  const g=new THREE.CylinderGeometry(ro,ro,th,n*2,1).rotateX(PI/2),P=g.attributes.position;
  for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),r=Math.hypot(x,y);if(r<1e-6)continue;const a=Math.atan2(y,x),k=Math.round((a-PI/2)/(PI/n));if(k%2){P.setX(i,x/r*ri);P.setY(i,y/r*ri)}}
  g.computeVertexNormals();return g;
}
// a shape list being put together: P(shape, colour)
function kit(){const L=[];const P=(g,hex)=>{L.push(paint(g,hex));return g};P.done=()=>join(L.splice(0));return P}

// =====================================================================
//  Outfits (hunters only). Numbers are permanent: cosmetics.js odd-one-out outfit 1, 2, 3, ...
// =====================================================================
// Model space as index.html's hunter: y up from the floor, front +z, the hip 0.92 m up, the shoulders 1.42 m, the head's
// centre 1.645 m (radius 0.175). Each outfit gives a body (torso, head and hat), one leg (used for both) and the arms.
const SKIN='#e8b48f';
// the face and the parts every outfit has: torso, neck, head, ears, nose, eyes (eyes:false when something covers them)
function person(P,c,o){
  o=o||{};
  P(rb(.46,.58,.28,.07,0,1.2,0),c.shirt);
  P(cyl(.07,.08,.08,12,0,1.5,0),c.neck||SKIN);
  P(sph(.175,0,1.645,0,1,1,1,18,12),SKIN);
  P(sph(.035,-.172,1.645,0,.6,1,1,8,6),SKIN);P(sph(.035,.172,1.645,0,.6,1,1,8,6),SKIN);
  P(sph(.03,0,1.63,.17,1,1,1,8,6),'#dda07c');
  if(o.eyes!==false){P(sph(.022,-.062,1.668,.155,1,1.25,.7,8,6),'#20212b');if(o.eyes!=='one')P(sph(.022,.062,1.668,.155,1,1.25,.7,8,6),'#20212b')}
  if(c.belt){P(rb(.48,.06,.3,.02,0,.95,0),c.belt);if(c.buckle)P(rb(.07,.05,.02,.008,0,.95,.152),c.buckle)}
}
// one leg, hanging from the hip (y 0 is the hip): trouser leg and boot
function legOf(c,o){
  const P=kit();o=o||{};
  P(rb(.2,.82,.22,.06,0,-.39,0),c.pants);
  if(o.tall)P(rb(.235,.38,.3,.06,0,-.73,.03),c.boot);else P(rb(.225,.16,.34,.055,0,-.84,.05),c.boot);
  if(o.cuff)P(rb(.21,.05,.23,.02,0,-.74,0),o.cuff);
  if(o.knee)P(box(.16,.12,.04,0,-.4,.12),o.knee);
  return P.done();
}
// both arms, already bent round the rifle as in index.html (they turn as one about the shoulders to aim): sleeves,
// hands, and the orange hunter band near each shoulder (o.patch: a badge on the left sleeve)
function armsOf(c,o){
  const P=kit();o=o||{};
  const put=(g,s)=>s?tf(g,-.26,0,0,-1.25,.8,0,1,1.3,1):tf(g,.27,0,0,-.75,0,0,1,1,1);
  for(const s of [1,0]){
    P(put(rb(.125,.48,.135,.045,0,-.2,0),s),c.sleeve||c.shirt);
    P(put(rb(.11,.11,.12,.04,0,-.45,0),s),c.hand||SKIN);
    if(c.cuffs)P(put(rb(.13,.05,.14,.02,0,-.37,0),s),c.cuffs);
    P(put(rb(.135,.055,.145,.02,0,-.07,0),s),c.band||HUNTER_ORANGE);
    if(o.patch&&s)P(put(box(.02,.07,.06,-.065,-.16,0),s),o.patch);
  }
  return P.done();
}
// the usual hunter's suit, vest, pack and boots, without the helmet and goggles (for the two hat-only outfits)
function hunterBody(P){
  person(P,{shirt:'#2d3348',neck:'#2d3348'});
  P(rb(.51,.38,.33,.06,0,1.27,0),'#ff7a1a');
  P(rb(.52,.035,.34,.012,0,1.2,0),'#f3efd9');P(rb(.52,.035,.34,.012,0,1.33,0),'#f3efd9');
  P(box(.48,.07,.3,0,.95,0),'#1b1d24');P(box(.1,.1,.06,.17,.93,.15),'#1b1d24');
  P(rb(.32,.36,.15,.05,0,1.27,-.235),'#4d5878');P(box(.2,.14,.05,0,1.2,-.325),'#4d5878');
}
const HUNTER_C={pants:'#2d3348',boot:'#1b1d24',shirt:'#2d3348',hand:'#1b1d24'};

// Hats: a brim and a crown. All of them stay inside a 0.28 m radius round the head's centre line.
function brim(P,r,y,hex,sz){P(tf(cyl(r,r,.018,26),0,y,0,0,0,0,1,1,sz||1),hex)}
function cowboyHat(P,y,hat,band,up){
  // brim with its sides turned up
  const g=new THREE.CylinderGeometry(.27,.27,.018,28,1).scale(1,1,.86),Q=g.attributes.position;
  for(let i=0;i<Q.count;i++){const x=Q.getX(i),z=Q.getZ(i);Q.setY(i,Q.getY(i)+Math.max(0,Math.abs(x)-.12)*up-Math.max(0,z-.12)*.12)}
  g.computeVertexNormals();P(g.translate(0,y,0),hat);
  P(rb(.24,.15,.27,.07,0,y+.085,-.005),hat);
  P(box(.05,.03,.2,0,y+.155,-.01),hat);   // the crease along the top
  P(rb(.25,.04,.28,.02,0,y+.03,-.005),band);
}

const OUTFITS=[null,
  { // 1 Police Officer: light blue shirt, navy trousers and peaked cap, gold badge, radio
    name:'Police Officer',body(P){
      const c={shirt:'#7fa6dc',belt:'#17181d',buckle:'#ffcf3f'};person(P,c);
      P(box(.055,.2,.02,0,1.35,.145),'#26325e');P(box(.07,.04,.025,0,1.46,.145),'#26325e');   // tie
      P(rb(.12,.035,.11,.012,-.19,1.485,0),'#26325e');P(rb(.12,.035,.11,.012,.19,1.485,0),'#26325e');   // shoulder boards
      P(tf(new THREE.CylinderGeometry(.04,.04,.018,6),-.12,1.33,.15,PI/2,0,0,1,1,1.15),'#ffcf3f');   // badge
      P(box(.075,.018,.012,.12,1.34,.146),'#ffcf3f');   // name bar
      P(box(.1,.025,.014,-.12,1.4,.146),'#5f86c0');P(box(.1,.025,.014,.12,1.4,.146),'#5f86c0');   // pocket flaps
      P(rb(.055,.09,.045,.015,-.17,1.39,.14),'#1c1d22');P(cyl(.007,.007,.08,5,-.185,1.47,.14),'#1c1d22');   // radio
      // peaked cap
      P(cyl(.18,.17,.09,20,0,1.815,0),'#26325e');P(tf(cyl(.205,.185,.035,22,0,0,0),0,1.87,.01,-.08),'#26325e');
      P(cyl(.172,.172,.04,20,0,1.79,0),'#16171c');P(tf(rb(.2,.016,.13,.007,0,0,0),0,1.776,.175,.22),'#16171c');
      P(box(.045,.05,.012,0,1.835,.186),'#ffcf3f');
    },leg:{pants:'#26325e',boot:'#17181d'},arms:{shirt:'#7fa6dc',hand:SKIN,cuffs:'#6b92c9'},armsO:{patch:'#26325e'}},
  { // 2 Sheriff: tan shirt, brown trousers, a big gold star, a moustache and a cream hat
    name:'Sheriff',body(P){
      const c={shirt:'#d7b06e',belt:'#4a2f1c',buckle:'#d9d9d9'};person(P,c);
      P(tf(star(6,.06,.03,.016),-.12,1.33,.152),'#ffcf3f');
      P(box(.1,.03,.014,-.12,1.4,.146),'#b88d4e');P(box(.1,.03,.014,.12,1.4,.146),'#b88d4e');
      P(rb(.12,.035,.11,.012,-.19,1.485,0),'#7a5232');P(rb(.12,.035,.11,.012,.19,1.485,0),'#7a5232');
      P(sph(.045,-.035,1.6,.162,1,.42,.5,10,6),'#4a3020');P(sph(.045,.035,1.6,.162,1,.42,.5,10,6),'#4a3020');   // moustache
      P(cyl(.008,.008,.2,5,0,1.37,.148),'#3a2414');P(sph(.02,0,1.46,.15,1,1,.5,8,6),'#d9d9d9');   // string tie
      cowboyHat(P,1.775,'#e5d2a0','#7a5232',.45);
      P(tf(star(6,.026,.013,.01),0,1.81,.142),'#ffcf3f');
    },leg:{pants:'#5d4330',boot:'#6a3f22'},arms:{shirt:'#d7b06e',hand:SKIN},armsO:{patch:'#7a5232'}},
  { // 3 Mall Cop: white shirt, navy trousers, silver badge, baseball cap, sunglasses and a whistle
    name:'Mall Cop',body(P){
      const c={shirt:'#f3f1ea',belt:'#16171c',buckle:'#cfd6de'};person(P,c,{eyes:false});
      P(rb(.12,.035,.11,.012,-.19,1.485,0),'#2c3550');P(rb(.12,.035,.11,.012,.19,1.485,0),'#2c3550');
      P(tf(new THREE.CylinderGeometry(.038,.038,.016,6),-.12,1.34,.15,PI/2,0,0,1,1,1.15),'#cfd6de');
      P(rb(.27,.055,.035,.015,0,1.667,.158),'#1d1f26');P(box(.3,.012,.012,0,1.685,.15),'#1d1f26');   // sunglasses
      P(cyl(.006,.006,.2,4,-.05,1.4,.146),'#ffd23f');P(cyl(.006,.006,.2,4,.05,1.4,.146),'#ffd23f');   // lanyard
      P(cz(.016,.016,.06,8,0,1.29,.165),'#cfd6de');
      P(rb(.07,.1,.05,.015,.2,.93,.12),'#1c1d22');   // walkie-talkie on the belt
      // baseball cap
      P(dome(.188,0,1.72,0,.75),'#2c3550');P(tf(rb(.2,.016,.15,.008,0,0,0),0,1.73,.18,.06),'#2c3550');P(box(.06,.035,.012,0,1.79,.178),'#cfd6de');
    },leg:{pants:'#2c3550',boot:'#16171c'},arms:{shirt:'#f3f1ea',hand:SKIN}},
  { // 4 Security Guard: hi-vis yellow vest over a grey shirt, black cap with a silver band, earpiece
    name:'Security Guard',body(P){
      const c={shirt:'#a9b4c2',belt:'#16171c',buckle:'#cfd6de'};person(P,c);
      P(rb(.51,.38,.33,.06,0,1.27,0),'#e8f13a');
      P(rb(.52,.035,.34,.012,0,1.2,0),'#e8eef2');P(rb(.52,.035,.34,.012,0,1.33,0),'#e8eef2');
      P(box(.06,.36,.015,0,1.27,.168),'#9aa61e');   // the vest's zip
      P(rb(.05,.085,.04,.012,.16,1.38,.165),'#1c1d22');P(cyl(.006,.006,.07,4,.17,1.46,.165),'#1c1d22');
      P(cyl(.006,.006,.16,5,.17,1.55,-.03),'#eaeaea');P(sph(.018,.18,1.64,.02,1,1,1,8,6),'#eaeaea');   // earpiece
      P(cyl(.18,.17,.085,20,0,1.815,0),'#1f2128');P(tf(cyl(.2,.185,.03,22),0,1.865,.01,-.08),'#1f2128');
      P(cyl(.172,.172,.04,20,0,1.79,0),'#cfd6de');P(tf(rb(.2,.016,.13,.007,0,0,0),0,1.776,.175,.22),'#16171c');
    },leg:{pants:'#2a2d36',boot:'#16171c'},arms:{shirt:'#a9b4c2',hand:SKIN}},
  { // 5 Detective: tan trench coat to the knees with the collar up, red tie, brown hat
    name:'Detective',body(P){
      person(P,{shirt:'#c49a5c'});
      P(rb(.5,.6,.32,.08,0,1.2,0),'#c49a5c');
      P(tf(new THREE.CylinderGeometry(.24,.3,.42,18,1,true),0,.74,0),'#c49a5c');   // the coat's skirt
      P(tf(new THREE.ConeGeometry(.07,.2,3),0,1.4,.158,PI,0,0,1,1,.2),'#f4efe2');P(box(.04,.15,.012,0,1.4,.165),'#a8323a');   // shirt and tie
      P(tf(box(.06,.22,.02),-.07,1.38,.165,0,0,-.35),'#a6824a');P(tf(box(.06,.22,.02),.07,1.38,.165,0,0,.35),'#a6824a');   // lapels
      P(rb(.38,.1,.2,.03,0,1.5,-.06),'#c49a5c');   // collar up
      P(rb(.52,.06,.34,.02,0,1.0,0),'#9c7642');P(rb(.07,.06,.02,.01,0,1.0,.172),'#3a2a1a');   // belt
      for(const y of [1.12,1.24])for(const x of [-.08,.08])P(sph(.014,x,y,.163,1,1,.5,6,4),'#3a2a1a');
      // fedora
      brim(P,.25,1.785,'#5b4a3c',.92);P(tf(rb(.24,.13,.25,.06,0,0,0),0,1.86,0),'#5b4a3c');P(box(.04,.025,.18,0,1.925,0),'#4b3c30');
      P(cyl(.128,.13,.035,18,0,1.815,0).scale(1,1,1.04),'#1d1c22');
    },leg:{pants:'#3b3d47',boot:'#4b3423'},arms:{shirt:'#c49a5c',hand:SKIN,cuffs:'#a6824a'}},
  { // 6 Store Manager: blue polo with a name tag, khaki trousers, a headset with a microphone
    name:'Store Manager',body(P){
      const c={shirt:'#3a7bd5',belt:'#5a3b26',buckle:'#d9c27a'};person(P,c);
      P(tf(box(.09,.04,.1),-.06,1.48,.1,0,0,-.4),'#5b95e6');P(tf(box(.09,.04,.1),.06,1.48,.1,0,0,.4),'#5b95e6');   // collar
      P(box(.03,.12,.012,0,1.42,.145),'#2e66b3');for(const y of [1.38,1.43])P(sph(.009,0,y,.152,1,1,.5,6,4),'#f4f4f4');
      P(box(.1,.045,.012,-.12,1.36,.147),'#ffffff');P(box(.1,.013,.013,-.12,1.38,.148),'#e0453a');   // name tag
      P(dome(.183,0,1.66,-.005,.82),'#4a3022');P(box(.06,.06,.06,-.15,1.63,-.03),'#4a3022');P(box(.06,.06,.06,.15,1.63,-.03),'#4a3022');   // hair
      P(torus(.19,.012,0,1.65,0,0,0,PI),'#1d1f26');   // headset band over the head
      P(tf(cyl(.045,.045,.03,14),-.19,1.645,0,0,0,PI/2),'#1d1f26');P(tf(cyl(.045,.045,.03,14),.19,1.645,0,0,0,PI/2),'#1d1f26');
      P(tf(cyl(.006,.006,.17,5),.15,1.6,.09,1.1,-.6),'#1d1f26');P(sph(.016,.09,1.59,.165,1,1,1,8,6),'#1d1f26');
    },leg:{pants:'#cdb88f',boot:'#5a3b26'},arms:{shirt:'#3a7bd5',hand:SKIN}},
  { // 7 Janitor: blue-grey coveralls, a work cap, yellow rubber gloves and a ring of keys
    name:'Janitor',body(P){
      const c={shirt:'#5c7d9c',belt:'#1c1d22',buckle:'#cfd6de'};person(P,c);
      P(box(.012,.5,.012,0,1.2,.146),'#c9d3dc');   // zip
      P(box(.1,.08,.012,-.12,1.36,.146),'#4a6886');P(rb(.08,.035,.012,.01,.12,1.37,.147),'#f4f4f4');   // pocket and name patch
      P(tf(box(.09,.04,.1),-.06,1.48,.1,0,0,-.4),'#4a6886');P(tf(box(.09,.04,.1),.06,1.48,.1,0,0,.4),'#4a6886');
      P(torus(.035,.006,.2,.9,.11,0,0),'#d0d6dc');P(box(.012,.05,.008,.19,.86,.11),'#e2c060');P(box(.012,.045,.008,.215,.865,.11),'#d0d6dc');   // keys
      P(dome(.186,0,1.72,0,.72),'#6b7480');P(tf(rb(.2,.016,.15,.008,0,0,0),0,1.73,.18,.05),'#6b7480');
    },leg:{pants:'#5c7d9c',boot:'#1c1d22',cuff:'#4a6886'},arms:{shirt:'#5c7d9c',hand:'#f2cf2e',cuffs:'#f2cf2e'}},
  { // 8 Park Ranger: khaki shirt, olive trousers, green tie, a flat-brimmed hat with a pinched crown
    name:'Park Ranger',body(P){
      const c={shirt:'#c9b27c',belt:'#3e2a1a',buckle:'#d9b04a'};person(P,c);
      P(box(.05,.19,.02,0,1.35,.145),'#3c5a32');P(box(.065,.04,.025,0,1.46,.145),'#3c5a32');
      P(tf(new THREE.CylinderGeometry(.036,.036,.016,10),-.12,1.33,.15,PI/2),'#ffcf3f');
      P(box(.1,.03,.014,-.12,1.4,.146),'#ab955f');P(box(.1,.03,.014,.12,1.4,.146),'#ab955f');
      brim(P,.26,1.785,'#a07a45');P(tf(new THREE.ConeGeometry(.15,.19,4),0,1.885,0,0,PI/4),'#a07a45');P(cyl(.12,.125,.035,16,0,1.815,0),'#5a3b22');
    },leg:{pants:'#5d6b3b',boot:'#5a3b22'},arms:{shirt:'#c9b27c',hand:SKIN},armsO:{patch:'#3c5a32'}},
  { // 9 Exterminator: off-white coveralls, goggles, a breathing mask with red filters, a spray tank on the back
    name:'Exterminator',body(P){
      const c={shirt:'#e9e6da',belt:'#2a2d33',buckle:'#cfd6de'};person(P,c,{eyes:false});
      P(box(.012,.5,.012,0,1.2,.146),'#b7b3a5');
      P(tf(new THREE.CylinderGeometry(.05,.05,.014,16),-.12,1.36,.149,PI/2),'#3c8a4a');P(tf(box(.012,.09,.016),-.12,1.36,.152,0,0,.8),'#e0453a');
      P(rb(.28,.075,.06,.025,0,1.68,.15),'#2a3138');P(box(.3,.02,.02,0,1.68,.12),'#2a3138');   // goggles
      P(rb(.15,.095,.08,.035,0,1.595,.155),'#3a3d44');
      P(tf(cyl(.034,.034,.045,12),-.09,1.58,.17,PI/2,-.9),'#9aa63a');P(tf(cyl(.034,.034,.045,12),.09,1.58,.17,PI/2,.9),'#9aa63a');
      P(cyl(.1,.1,.4,16,0,1.21,-.25),'#c84a3a');P(dome(.1,0,1.41,-.25,.5),'#c84a3a');P(cyl(.03,.03,.05,10,0,1.47,-.25),'#cfd6de');   // tank
      P(rb(.3,.04,.04,.015,0,1.42,-.16),'#2a2d33');P(tf(cyl(.012,.012,.5,6),.15,1.0,-.18,.3,0,.25),'#2a2d33');
      P(dome(.188,0,1.72,0,.72),'#3c8a4a');P(tf(rb(.2,.016,.15,.008,0,0,0),0,1.73,.18,.05),'#3c8a4a');   // cap
    },leg:{pants:'#e9e6da',boot:'#222428'},arms:{shirt:'#e9e6da',hand:'#3c8a4a',cuffs:'#3c8a4a'}},
  { // 10 Construction Worker: yellow hard hat, lime hi-vis vest, jeans, a tool belt and work boots
    name:'Construction Worker',body(P){
      const c={shirt:'#f0ede6',belt:'#6b4423',buckle:'#d9c27a'};person(P,c);
      P(rb(.51,.38,.33,.06,0,1.27,0),'#c6ec2f');
      P(rb(.52,.035,.34,.012,0,1.2,0),'#e8eef2');P(rb(.52,.035,.34,.012,0,1.33,0),'#e8eef2');
      P(tf(box(.035,.38,.012),-.1,1.27,.168,0,0,0),'#e8eef2');P(tf(box(.035,.38,.012),.1,1.27,.168,0,0,0),'#e8eef2');
      P(rb(.1,.12,.07,.02,-.2,.9,.06),'#6b4423');P(rb(.1,.12,.07,.02,.2,.9,.06),'#6b4423');   // pouches
      P(cyl(.008,.008,.12,6,.2,.99,.08),'#9aa3ad');
      P(dome(.195,0,1.72,0,.85),'#ffcc1a');P(cyl(.215,.215,.02,24,0,1.725,0).scale(1,1,1.05),'#ffcc1a');P(rb(.04,.03,.34,.01,0,1.885,0),'#f0b800');
    },leg:{pants:'#3f5f93',boot:'#b07a3c'},arms:{shirt:'#f0ede6',hand:'#c79a5e'}},
  { // 11 Cowboy: red shirt, brown waistcoat, yellow bandana, jeans, big buckle, brown hat
    name:'Cowboy',body(P){
      const c={shirt:'#8a5a33',belt:'#5a3418',buckle:'#ffcf3f'};person(P,c);
      P(rb(.47,.56,.29,.065,0,1.21,0),'#8a5a33');P(box(.13,.5,.02,0,1.22,.146),'#c9443a');   // waistcoat open over the shirt
      for(const y of [1.1,1.2,1.3])P(sph(.011,-.075,y,.152,1,1,.5,6,4),'#e2c060');
      P(tf(new THREE.ConeGeometry(.11,.13,3),0,1.43,.13,PI+.25,0,0,1,1,.35),'#f2c23a');   // bandana
      P(rb(.11,.07,.025,.012,0,.95,.155),'#ffcf3f');
      cowboyHat(P,1.78,'#7b4d2a','#3a2414',.75);
    },leg:{pants:'#3d5f9a',boot:'#7a4a26'},arms:{shirt:'#c9443a',hand:SKIN}},
  { // 12 Pirate: red long coat with gold trim, white shirt, black sash, tricorn hat, eye patch, tall boots
    name:'Pirate',body(P){
      person(P,{shirt:'#b8323a'},{eyes:'one'});
      P(rb(.5,.6,.32,.08,0,1.2,0),'#b8323a');P(box(.13,.46,.02,0,1.24,.162),'#f4efe2');
      P(tf(new THREE.CylinderGeometry(.24,.3,.4,18,1,true),0,.74,0),'#b8323a');P(torus(.3,.012,0,.54,0,PI/2),'#f0c445');
      for(const y of [1.08,1.2,1.32])for(const x of [-.1,.1])P(sph(.014,x,y,.163,1,1,.5,6,4),'#f0c445');
      P(rb(.52,.08,.34,.02,0,.99,0),'#1d1c22');P(rb(.08,.07,.02,.01,0,.99,.175),'#f0c445');
      P(tf(new THREE.CylinderGeometry(.04,.04,.012,14),.062,1.668,.162,PI/2),'#15151a');P(tf(new THREE.TorusGeometry(.178,.007,6,24),0,1.69,0,PI/2,0,.25),'#15151a');   // eye patch
      P(torus(.02,.004,-.175,1.6,0,0,PI/2),'#f0c445');   // earring
      // tricorn: a turned-up three-cornered brim round a low crown, gold along the edge, a little white skull
      P(cyl(.14,.15,.13,18,0,1.85,0),'#1d1c22');
      P(new THREE.CylinderGeometry(.25,.2,.1,3).translate(0,1.83,0),'#1d1c22');P(new THREE.CylinderGeometry(.256,.256,.016,3).translate(0,1.88,0),'#f0c445');
      P(sph(.03,0,1.84,.135,1,1,.6,10,6),'#f4f1e6');P(tf(box(.07,.012,.01),0,1.8,.13,0,0,.6),'#f4f1e6');P(tf(box(.07,.012,.01),0,1.8,.13,0,0,-.6),'#f4f1e6');
    },leg:{pants:'#e8dcc0',boot:'#1f1a18'},legO:{tall:true},arms:{shirt:'#b8323a',hand:SKIN,cuffs:'#f0c445'}},
  { // 13 Top Hat: the usual hunter, with a tall black top hat (orange band) in place of the helmet, and a monocle
    name:'Top Hat',body(P){
      hunterBody(P);
      P(torus(.034,.006,.062,1.668,.158,0,0),'#ffcf3f');P(cyl(.003,.003,.12,4,.09,1.6,.15),'#ffcf3f');
      brim(P,.22,1.79,'#1f1d24',.9);P(cyl(.13,.122,.29,22,0,1.94,0),'#1f1d24');P(cyl(.126,.126,.055,22,0,1.83,0),HUNTER_ORANGE);
    },leg:HUNTER_C,legO:{knee:'#1b1d24'},arms:{shirt:'#2d3348',hand:'#1b1d24'},},
  { // 14 Traffic Cone: the usual hunter, with an orange traffic cone (two white bands) for a hat
    name:'Traffic Cone',body(P){
      hunterBody(P);
      P(rb(.3,.04,.3,.012,0,1.79,0),'#ff6a1a');
      const H=.42,R=.15,y0=1.81,rAt=h=>R*(1-h/H)+.003;
      P(new THREE.CylinderGeometry(.02,R,H,22).translate(0,y0+H/2,0),'#ff6a1a');
      for(const [a,b] of [[.1,.16],[.24,.29]])P(new THREE.CylinderGeometry(rAt(b),rAt(a),b-a,22).translate(0,y0+(a+b)/2,0),'#f6f6f2');
    },leg:HUNTER_C,legO:{knee:'#1b1d24'},arms:{shirt:'#2d3348',hand:'#1b1d24'},},
];

// =====================================================================
//  Tools (hunters only), in place of the rifle. Numbers: cosmetics.js odd-one-out tool 1, 2, 3, ...
// =====================================================================
// In the rifle's own space (index.html: the gun group, front +z, the muzzle at z 0.78): every tool stays within
// x ±0.12, y -0.26 to 0.2, z -0.33 to 0.84, below the line of sight. body: coloured per vertex; acc: one accent part with
// its own material (mat). The muzzle (where tracers start) is the rifle's, so shots look and work the same.
const TOOLS=[null,
  { // 1 Flashlight (no real light: a lit lens only)
    name:'Flashlight',body(P){
      P(cz(.034,.034,.5,14,0,0,.13),'#ffd23f');P(cz(.06,.036,.14,18,0,0,.45),'#23252c');P(cz(.038,.038,.04,14,0,0,-.14),'#23252c');
      for(const z of [-.02,.06,.14])P(cz(.037,.037,.025,14,0,0,z),'#23252c');
      P(rb(.022,.02,.04,.006,0,.036,.25),'#e0453a');P(torus(.055,.006,0,0,.52),'#c9d0d8');
    },acc:()=>cz(.05,.05,.012,18,0,0,.523),mat:{color:'#fff6c8',emissive:'#ffe9a0',emissiveIntensity:.9}},
  { // 2 Price Scanner: a handheld barcode scanner with a red window
    name:'Price Scanner',body(P){
      P(tf(rb(.07,.085,.28,.025,0,0,0),0,.0,.1,.12),'#e4e7ec');P(tf(rb(.105,.13,.07,.02,0,0,0),0,.03,.26,.12),'#3a3f4a');
      P(tf(rb(.055,.18,.07,.02,0,0,0),0,-.12,.02,.35),'#3a3f4a');P(tf(box(.02,.05,.03),0,-.06,.1,.3),'#ffd23f');
      P(box(.045,.012,.08,0,.046,.09),'#3fd27a');P(tf(cyl(.01,.01,.18,6),0,-.2,-.06,1.1),'#2a2d33');
    },acc:()=>tf(box(.08,.028,.012),0,.04,.297,.12),mat:{color:'#ff4a3a',emissive:'#ff2a1a',emissiveIntensity:.8}},
  { // 3 Flyswatter: a long green handle and a red swatter with a grid
    name:'Flyswatter',body(P){
      P(cz(.012,.012,.62,8,0,0,.11),'#3fbf6a');P(torus(.025,.006,0,0,-.225,0,PI/2),'#3fbf6a');P(cz(.018,.018,.12,8,0,0,-.13),'#2f9a52');
      for(let i=-2;i<=2;i++){P(box(.018,.18,.008,0,0,.6+i*.04),'#b7322a');P(box(.018,.008,.2,0,i*.034,.6),'#b7322a')}
    },acc:()=>box(.012,.18,.2,0,0,.6),mat:{color:'#ff5a4a',roughness:.5}},
  { // 4 Butterfly Net: a wooden handle, a white hoop and a see-through net
    name:'Butterfly Net',body(P){
      P(cz(.014,.016,.66,8,0,0,.12),'#c9955a');P(cz(.018,.018,.1,8,0,0,-.17),'#8a6034');
      P(torus(.1,.008,0,0,.56,PI/2,0),'#f2f2ee');P(cz(.012,.012,.06,6,0,0,.46),'#f2f2ee');
    },acc:()=>new THREE.ConeGeometry(.1,.2,16,1,true).rotateX(PI).translate(0,-.1,.56),mat:{color:'#f4f4f0',transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}},
  { // 5 Broom: a long wooden handle, a red binding and a fan of straw
    name:'Broom',body(P){
      P(cz(.017,.017,.8,8,0,0,.08),'#b5834a');P(cz(.035,.03,.05,12,0,0,.5),'#d23c3c');
      for(const z of [.6,.7]){const r=.035+(z-.53)/.3*.085+.004;P(tf(new THREE.CylinderGeometry(r,r,.014,4).rotateX(PI/2),0,0,z,0,0,0,.3,1,1),'#b8862e')}
    },acc:()=>tf(new THREE.CylinderGeometry(.12,.035,.3,4,1).rotateX(PI/2),0,0,.68,0,0,0,.28,1,1),mat:{color:'#e8c766',roughness:.9}},
  { // 6 Rubber Chicken: yellow, floppy, with a red comb
    name:'Rubber Chicken',body(P){
      P(sph(1,0,0,.3,.075,.08,.17,14,9),'#ffd23f');P(tf(cyl(.024,.034,.16,10),0,.04,.47,1.2),'#ffd23f');P(sph(.05,0,.08,.56,1,1,1.1,12,8),'#ffd23f');
      P(tf(new THREE.ConeGeometry(.022,.06,8),0,.075,.63,PI/2),'#ff8a1a');
      P(sph(.009,-.032,.1,.6,1,1,1,6,4),'#15151a');P(sph(.009,.032,.1,.6,1,1,1,6,4),'#15151a');
      P(sph(1,-.07,.01,.3,.02,.05,.1,8,6),'#f2c021');P(sph(1,.07,.01,.3,.02,.05,.1,8,6),'#f2c021');
      for(const x of [-.03,.03]){P(tf(cyl(.008,.008,.14,5),x,-.1,.17,.5),'#ff8a1a');P(box(.04,.008,.04,x,-.16,.13),'#ff8a1a')}
    },acc:()=>join([paint(sph(.022,0,.135,.55,1,1,1,8,6),'#fff'),paint(sph(.02,0,.13,.585,1,1,1,8,6),'#fff'),paint(sph(.02,0,.125,.52,1,1,1,8,6),'#fff'),paint(sph(.018,0,.03,.615,1,1.3,1,8,6),'#fff')]),
    mat:{color:'#e23b3b',roughness:.5}},
];

// =====================================================================
//  Taunts (props only, and only when the prop presses T). Numbers: cosmetics.js odd-one-out taunt 1, 2, 3, ...
// =====================================================================
// Each plays into o (index.html's out3d: from where the prop is) at time t, using its tone() and noise().
const TAUNTS=[null,
  {name:'Bike Horn',play(S,o,t){for(const d of [0,.24]){S.tone(o,330,.16,.3,t+d,'square',300);S.tone(o,415,.16,.18,t+d,'sawtooth',390);S.noise(o,.14,700,1,.12,t+d,'lowpass')}}},
  {name:'Squeaky Duck',play(S,o,t){for(const d of [0,.2]){S.tone(o,900,.07,.24,t+d,'sine',1600);S.tone(o,1600,.1,.2,t+d+.07,'sine',1150)}}},
  {name:'Slide Whistle',play(S,o,t){S.tone(o,520,.5,.24,t,'sine',1900);S.tone(o,1900,.4,.22,t+.5,'sine',700)}},
  {name:'Boing',play(S,o,t){S.tone(o,110,.5,.32,t,'triangle',520);S.tone(o,160,.45,.14,t+.04,'sine',700);S.tone(o,520,.35,.1,t+.45,'triangle',380)}},
  {name:'Cuckoo',play(S,o,t){for(const d of [0,.55]){S.tone(o,784,.22,.24,t+d,'sine');S.tone(o,622,.3,.24,t+d+.22,'sine')}}},
  {name:'Kazoo',play(S,o,t){[[392,.14],[392,.14],[440,.14],[523,.34]].reduce((d,[f,l])=>{S.tone(o,f,l,.16,t+d,'sawtooth',f*1.01);S.tone(o,f*2,l,.05,t+d,'square');return d+l+.03},0)}},
  {name:'Doorbell',play(S,o,t){S.tone(o,659,.9,.24,t,'triangle');S.tone(o,1318,.5,.06,t,'sine');S.tone(o,523,1.1,.24,t+.45,'triangle');S.tone(o,1046,.6,.06,t+.45,'sine')}},
  {name:'Party Blower',play(S,o,t){S.tone(o,300,.5,.2,t,'square',620);S.tone(o,302,.5,.12,t,'sawtooth',640);S.noise(o,.5,900,.8,.1,t,'bandpass');S.tone(o,620,.12,.14,t+.5,'square',580)}},
];

// =====================================================================
//  Catch poofs (a hunter's: plays where the prop they caught was). Numbers: cosmetics.js odd-one-out poof 1, 2, 3, ...
// =====================================================================
// They use index.html's effect pieces (fxMesh: one small mesh and material each, as its own burst does) and move them
// here. Each piece: {m, t, life, v, drag, grav, spin, grow, fade, sway}.
const parts=[];
function part(geo,color,opa,add,pos,o){const m=A.fxMesh(geo,color,opa,add);m.position.copy(pos);const p=Object.assign({m,t:0,life:1,v:new V3(),drag:0,grav:0,grow:0,fade:1,sway:0,ph:Math.random()*TAU},o||{});parts.push(p);return p}
const STAR_G=star(5,1,.45,.18),TAG_G=(()=>{const g=new THREE.BoxGeometry(1,.62,.08);return g})(),FEATHER_G=new THREE.SphereGeometry(1,8,4).scale(1,.12,.32);
const POOFS=[null,
  {name:'Cloud Poof',go(c,s){
    for(let i=0;i<16;i++){const a=i/16*TAU,r=rand(.1,.35)*s;part(A.fxSphere,pick(['#ffffff','#f1f0ec','#e6e4de']),.85,false,c.clone().add(new V3(Math.cos(a)*r,rand(-.2,.3)*s,Math.sin(a)*r)),{life:rand(.9,1.4),v:new V3(Math.cos(a)*1.4*s,rand(.4,1.1),Math.sin(a)*1.4*s),drag:2.2,grow:.5,sc:rand(.16,.3)*s})}
    const r=part(A.ringGeo,'#ffffff',.8,true,c,{life:.35,grow:3,sc:.25*s});r.m.rotation.x=-PI/2;r.m.material.side=THREE.DoubleSide;
  }},
  {name:'Feather Poof',go(c,s){
    for(let i=0;i<26;i++){const a=Math.random()*TAU;part(FEATHER_G,pick(['#ffffff','#fff4e2','#ffe1ec','#e9f3ff']),null,false,c.clone(),{life:rand(1.8,2.6),v:new V3(Math.cos(a)*rand(.8,2.4),rand(1.5,3.5),Math.sin(a)*rand(.8,2.4)),drag:2.6,grav:-.55,sway:rand(.6,1.2),spin:new V3(rand(-3,3),rand(-5,5),rand(-3,3)),sc:rand(.07,.11),fade:0})}
    A.puff(c,clamp(s,.6,1.6),'#ffffff');
  }},
  {name:'Bubble Poof',go(c,s){
    for(let i=0;i<22;i++){const a=Math.random()*TAU,r=rand(0,.3)*s;part(A.fxSphere,pick(['#bfe9ff','#d8c8ff','#c8ffe9','#ffffff']),.4,true,c.clone().add(new V3(Math.cos(a)*r,rand(-.2,.2),Math.sin(a)*r)),{life:rand(1,2.2),v:new V3(Math.cos(a)*rand(.2,.9),rand(.6,1.6),Math.sin(a)*rand(.2,.9)),drag:.8,sway:rand(.4,.9),sc:rand(.05,.14),pop:1})}
  }},
  {name:'Star Poof',go(c,s){
    for(let i=0;i<18;i++){const a=i/18*TAU+rand(-.1,.1);part(STAR_G,pick(['#ffd23f','#ffe98a','#ffb21f','#ffffff']),.95,true,c.clone(),{life:rand(.8,1.2),v:new V3(Math.cos(a)*rand(2,3.6)*s,rand(1,3),Math.sin(a)*rand(2,3.6)*s),drag:2.4,grav:3,spin:new V3(0,0,rand(-8,8)),face:1,sc:rand(.06,.1)*Math.max(1,s*.8)})}
    part(A.fxSphere,'#fff3b0',.7,true,c,{life:.25,grow:3,sc:.18*s});
  }},
  {name:'Price Tag Poof',go(c,s){
    for(let i=0;i<16;i++){const a=Math.random()*TAU;part(TAG_G,pick(['#ffffff','#fff3c4','#ffe24a','#ff5a4a','#ffffff']),null,false,c.clone(),{life:rand(1.4,2),v:new V3(Math.cos(a)*rand(1,2.6),rand(2.5,4.5),Math.sin(a)*rand(1,2.6)),drag:1.2,grav:5,sway:rand(.3,.7),spin:new V3(rand(-6,6),rand(-6,6),rand(-6,6)),sc:rand(.07,.1),fade:0})}
    A.puff(c,clamp(s,.6,1.6),'#fff6e0');
  }},
];
function updateParts(dt){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.t+=dt;const k=p.t/p.life;
    if(p.drag)p.v.multiplyScalar(Math.exp(-p.drag*dt));if(p.grav)p.v.y-=p.grav*dt;
    p.m.position.addScaledVector(p.v,dt);if(p.sway)p.m.position.x+=Math.sin(p.t*5+p.ph)*p.sway*dt;
    if(p.spin){p.m.rotation.x+=p.spin.x*dt;p.m.rotation.y+=p.spin.y*dt;p.m.rotation.z+=p.spin.z*dt}
    let sc=p.sc||.1;if(p.grow)sc*=1+p.grow*p.t*3;if(p.pop&&k>.85)sc*=1+(k-.85)*6;p.m.scale.setScalar(sc);
    if(p.face&&camQ)p.m.quaternion.copy(camQ).multiply(_zq.setFromAxisAngle(_z,p.m.rotation.z));
    if(p.fade)p.m.material.opacity=Math.max(0,(p.m.material.userData.o0==null?(p.m.material.userData.o0=p.m.material.opacity):p.m.material.userData.o0)*(1-k));
    else if(k>.8){p.m.material.transparent=true;p.m.material.opacity=Math.max(0,(1-k)*5)}
    if(k>=1){p.m.parent&&p.m.parent.remove(p.m);p.m.material.dispose();parts.splice(i,1)}
  }
}
let camQ=null;const _zq=new THREE.Quaternion(),_z=new V3(0,0,1);

// =====================================================================
//  Building a hunter
// =====================================================================
const MAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.68});
const geoCache={};
function outfitGeo(n){
  if(geoCache['o'+n])return geoCache['o'+n];const O=OUTFITS[n];
  const P=kit();O.body(P);const body=P.done();
  let top=0;const pa=body.attributes.position;for(let i=0;i<pa.count;i++)top=Math.max(top,pa.getY(i));
  return(geoCache['o'+n]={body,leg:legOf(O.leg,O.legO),arms:armsOf(O.arms,O.armsO),top});
}
const toolMats={};
function toolGeo(n){
  if(geoCache['t'+n])return geoCache['t'+n];const T=TOOLS[n];
  const P=kit();T.body(P);const m=Object.assign({},T.mat);for(const k of ['color','emissive'])if(m[k])m[k]=new THREE.Color(m[k]).convertSRGBToLinear();
  return(geoCache['t'+n]={body:P.done(),acc:T.acc(),mat:new THREE.MeshStandardMaterial(Object.assign({roughness:.6},m))});
}
// w: {o, t, s, f, k}. A model with the same parts (userData) as index.html's, or null for the plain hunter.
function hunter(w){
  const o=OUTFITS[w.o]?w.o:0,t=TOOLS[w.t]?w.t:0;if(!o&&!t)return null;
  let g,U;
  if(o){
    const G=outfitGeo(o),mk=(geo,mat,par)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=true;(par||g).add(m);return m};
    g=new THREE.Group();
    const legL=mk(G.leg,MAT),legR=mk(G.leg,MAT);legL.position.set(-.12,.92,0);legR.position.set(.12,.92,0);
    const body=mk(G.body,MAT);
    const arms=new THREE.Group();arms.position.set(0,1.42,0);g.add(arms);mk(G.arms,MAT,arms);
    const gun=new THREE.Group();gun.position.set(.26,-.06,.14);arms.add(gun);
    if(!t){mk(A.HG.gun,A.HUNTER_MATS.gun,gun);mk(A.HG.gunTip,A.HUNTER_MATS.vest,gun)}
    const muzzle=new THREE.Object3D();muzzle.position.set(0,.01,.78);gun.add(muzzle);
    const blob=new THREE.Mesh(A.blobGeo,A.blobMatOf());blob.position.y=.004;blob.scale.set(.8,1,.62);blob.renderOrder=1;blob.visible=A.gfx!=='fast';g.add(blob);
    g.userData={legL,legR,arms,gun,muzzle,head:body,blob,lift:Math.max(0,G.top-1.92)};
  }else g=A.hunterModel(null,null);
  U=g.userData;
  if(t){
    const T=toolGeo(t),gun=U.gun;
    for(const c of gun.children.slice())if(c.isMesh)gun.remove(c);
    const a=new THREE.Mesh(T.body,MAT),b=new THREE.Mesh(T.acc,T.mat);a.castShadow=b.castShadow=true;gun.add(a,b);
  }
  return g;
}

// =====================================================================
//  What this player wears, and what other players wear
// =====================================================================
const NS=[OUTFITS.length-1,TOOLS.length-1,TAUNTS.length-1,POOFS.length-1];
function saved(){let a=null;try{a=A.store.get('wear',null)}catch(e){}a=Array.isArray(a)?a:[];return[0,1,2,3].map(i=>{const n=a[i]|0;return n>0&&n<=NS[i]?n:0})}
let pick4=saved(),tauntN=0,tauntT=-99;
function mine(){if(!A.wardOn())return null;return{o:pick4[0],t:pick4[1],s:pick4[2],f:pick4[3],k:tauntN}}
function wire(){const w=mine();if(!w||!(w.o||w.t||w.s||w.f))return'';return[w.o,w.t,w.s,w.f,w.k%1000].join('.')}
// another player's cz: four item numbers and a count, all checked; a number this file doesn't know is the default
function parse(raw){
  if(typeof raw!=='string'||!/^\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,3}$/.test(raw))return null;
  const a=raw.split('.').map(Number),w={o:a[0],t:a[1],s:a[2],f:a[3],k:a[4]};
  if(!OUTFITS[w.o])w.o=0;if(!TOOLS[w.t])w.t=0;if(!TAUNTS[w.s])w.s=0;if(!POOFS[w.f])w.f=0;
  return w;
}
const key=w=>w?w.o+'.'+w.t:'';
// a count that went up is a taunt (not the first time this page sees the player, and not too soon after the last)
function heard(e,w){
  const k=w?w.k:null,prev=e.wdK;e.wdK=k;
  if(k==null||prev==null||k===prev||!w.s)return;
  if(!e.alive||e.look!=='prop')return;
  const now=performance.now();if(e.wdT&&now-e.wdT<TAUNT_GAP*1000)return;e.wdT=now;
  const c=e.pos.clone();c.y+=e.form?e.form.h*.6:.4;play(w.s,c,1);
}
function play(n,pos,vol){
  const T=TAUNTS[n],S=A.audio();if(!T||!S)return;
  if(pos&&(A.hidden()||!A.near(pos)))return;
  try{const o=S.out3d(pos,vol==null?1:vol,true,4);T.play(S,o,S.actx.currentTime+.02)}catch(e){}
}

// ---------------- taunting (T, or the Taunt button on a touch screen) ----------------
function canTaunt(){
  const m=A.me,w=mine();if(!m||!w||!w.s||A.paused||!m.alive||m.look!=='prop')return false;
  const ph=A.ph;if(A.mode==='menu'||ph==='end'||ph==='over'||!(A.role==='prop'||A.role==='free'))return false;
  return true;
}
function cdLeft(){return Math.max(0,TAUNT_CD-(A.clock-tauntT))}
function taunt(){
  if(!canTaunt())return false;
  if(cdLeft()>0){A.popup('TAUNT IN '+Math.ceil(cdLeft())+'s','bad');return false}
  A.initAudio();tauntT=A.clock;tauntN=(tauntN+1)%1000;
  const m=A.me;m.wear=mine();play(pick4[2],null,.8);A.popup('TAUNT!','good');
  const c=m.pos.clone();c.y+=m.form?m.form.h*.6:.4;if(A.mode==='practice')A.heard(c);
  A.push();A.hudDirty();return true;
}
function hint(){
  const w=mine();if(!w||!w.s||!canTaunt()||A.KB.actionsFor('KeyT').length)return'';   // T taunts only while it's bound to nothing else
  const s=Math.ceil(cdLeft());return'<span><kbd>T</kbd> taunt'+(s>0?' (in '+s+'s)':'')+'</span>';
}

// =====================================================================
//  Buttons and the Wardrobe screen
// =====================================================================
const $=A.$;
const CSS=`
#wd{z-index:6}
#wd .card{width:min(860px,100%);max-height:calc(100% - 8px);display:flex;flex-direction:column;padding:16px 18px;margin:auto}
.wd-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex:0 0 auto}
.wd-head h2{font-family:var(--f-d);font-weight:400;font-size:28px;margin:0;line-height:1}
.wd-sub{margin:4px 0 10px;font-weight:800;font-size:13px;color:var(--ink-2);flex:0 0 auto}
.wd-body{display:grid;grid-template-columns:230px minmax(0,1fr);gap:16px;min-height:0;flex:1 1 auto}
.wd-prev{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
.wd-pics{display:flex;gap:6px;width:100%;justify-content:center}
.wd-pics img{width:50%;max-width:150px;aspect-ratio:3/4;border:2.5px solid var(--ink);border-radius:12px;background:#dfe6ee;object-fit:cover}
.wd-prev small{font-weight:800;font-size:12px;color:var(--ink-2);text-align:center}
.wd-pick{display:flex;flex-direction:column;min-height:0;min-width:0}
.wd-tabs{align-self:flex-start;max-width:100%;overflow-x:auto;flex:0 0 auto}
.wd-note{margin:8px 0 8px;font-size:13px;font-weight:700;color:var(--ink-2);line-height:1.35;flex:0 0 auto}
.wd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;overflow:auto;min-height:0;padding:2px 2px 6px;flex:1 1 auto;align-content:start}
.wd-grid button{display:flex;flex-direction:column;align-items:center;gap:4px;border:2.5px solid var(--ink);border-radius:12px;background:#fff;padding:6px 4px 7px;font-weight:900;font-size:12px;line-height:1.1;text-align:center;box-shadow:0 3px 0 var(--ink);min-width:0}
.wd-grid button[aria-pressed="true"]{background:var(--sun)}
.wd-grid img,.wd-grid canvas{width:100%;max-width:96px;aspect-ratio:1;border-radius:8px;background:#e8edf2;object-fit:cover}
.wd-grid .tall{aspect-ratio:3/4}
#wdOpen,#wdPause{margin-top:10px}
#tTaunt{background:var(--prop)!important;color:#fff}
#tTaunt.cd{opacity:.55}
@media (max-width:640px){.wd-body{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}.wd-pics img{max-width:84px}.wd-prev small{display:none}.wd-grid{grid-template-columns:repeat(auto-fill,minmax(86px,1fr))}}
@media (max-height:500px){#wd .card{padding:10px 14px}.wd-head h2{font-size:22px}.wd-sub{margin:2px 0 6px}.wd-body{grid-template-columns:150px minmax(0,1fr)}.wd-pics img{max-width:72px}.wd-prev small{display:none}.wd-grid{grid-template-columns:repeat(auto-fill,minmax(84px,1fr))}}
`;
let built=false,tab='outfit',names=null;
const TABS=[['outfit','Outfits','Hunters wear these. Looks only: the same size, speed and view.'],['tool','Tools','Held in place of the rifle when you hunt. It still shoots the same; just looks different.'],
  ['taunt','Taunts','As a prop, press T (or tap Taunt) to play it. Everyone near you hears it, so it gives you away. One every '+TAUNT_CD+' s.'],['poof','Poofs','Plays where a prop was when you catch it.']];
const LISTS={outfit:OUTFITS,tool:TOOLS,taunt:TAUNTS,poof:POOFS},SLOT_I={outfit:0,tool:1,taunt:2,poof:3};
function nameOf(slot,n){
  if(!n)return slot==='outfit'?'Usual hunter':slot==='tool'?'Usual rifle':slot==='taunt'?'No taunt':'Usual burst';
  const C=window.BackRoomCosmetics,it=C&&C.gameItems?C.gameItems('odd-one-out',slot).find(i=>i.no===n):null;
  return it?it.name:LISTS[slot][n].name;
}
function build(){
  if(built)return;built=true;
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const sec=document.createElement('section');sec.id='wd';sec.className='overlay center';sec.hidden=true;
  sec.innerHTML='<div class="card" role="dialog" aria-modal="true" aria-labelledby="wdTitle"><div class="wd-head"><h2 id="wdTitle">Wardrobe</h2><button class="btn sm" id="wdDone" type="button">Done</button></div>'+
    '<p class="wd-sub">Captains only for now. Everything is free to wear, and changes how you look and sound, nothing else.</p>'+
    '<div class="wd-body"><div class="wd-prev"><div class="wd-pics"><img id="wdF" alt="Your hunter from the front"><img id="wdB" alt="Your hunter from behind"></div><small>Your hunter, as other players see it</small></div>'+
    '<div class="wd-pick"><div class="seg wd-tabs" id="wdTabs" role="group" aria-label="Wardrobe sections">'+TABS.map(t=>'<button type="button" data-t="'+t[0]+'">'+t[1]+'</button>').join('')+'</div>'+
    '<p class="wd-note" id="wdNote"></p><div class="wd-grid" id="wdGrid"></div></div></div></div>';
  $('app').appendChild(sec);
  $('wdDone').onclick=close;sec.addEventListener('pointerdown',e=>{if(e.target===sec)close()});
  sec.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
  for(const b of $('wdTabs').children)b.onclick=()=>{tab=b.dataset.t;fill()};
  // touch: the Taunt button beside Menu and Scores
  const tb=document.createElement('button');tb.type='button';tb.id='tTaunt';tb.textContent='Taunt';tb.hidden=true;
  tb.addEventListener('pointerdown',e=>{e.preventDefault();taunt()});tb.addEventListener('contextmenu',e=>e.preventDefault());
  $('tTop').appendChild(tb);
}
let open_=false;
function open(){
  build();open_=true;$('wd').hidden=false;lbChip(true);
  if(!window.BackRoomCosmetics&&!document.querySelector('script[src$="/cosmetics.js"]')){const s=document.createElement('script');s.src='/e63334287a3deaa3/cosmetics.js';s.onload=()=>{if(open_)fill()};document.head.appendChild(s)}
  fill();preview();setTimeout(()=>{const b=$('wdGrid').querySelector('[aria-pressed="true"]')||$('wdDone');try{b.focus({preventScroll:true})}catch(e){}},0);
}
// stats.js's floating Leaderboard button would sit over the Wardrobe's bottom edge on a phone: out of sight while it's open
function lbChip(hide){const b=document.getElementById('brlb-open');if(b)b.style.visibility=hide?'hidden':''}
function close(){if(!open_)return;open_=false;$('wd').hidden=true;lbChip(false);const b=$('wdOpen');if(b&&!$('menu').hidden)try{b.focus()}catch(e){}}
function choose(slot,n){
  pick4[SLOT_I[slot]]=n;A.store.set('wear',pick4.slice());
  const m=A.me;if(m&&!m.remote){m.wear=mine()}
  if(slot==='taunt'&&n){A.initAudio();play(n,null,.8)}
  if(slot==='poof'&&n)demoPoof(n);
  A.sync();fill();if(slot==='outfit'||slot==='tool')preview();
}
function fill(){
  if(!built)return;
  for(const b of $('wdTabs').children)b.setAttribute('aria-pressed',String(b.dataset.t===tab));
  $('wdNote').textContent=TABS.find(t=>t[0]===tab)[2];
  const L=LISTS[tab],cur=pick4[SLOT_I[tab]],g=$('wdGrid');g.innerHTML='';
  for(let n=0;n<L.length;n++){
    const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(n===cur));
    const pic=thumb(tab,n);b.appendChild(pic);const sp=document.createElement('span');sp.textContent=nameOf(tab,n);b.appendChild(sp);
    b.onclick=()=>choose(tab,n);g.appendChild(b);
  }
}

// ---------------- pictures: rendered once with the game's own renderer into a small target ----------------
let PS=null;
function stage(){
  if(PS)return PS;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#dfe6ee');
  scene.add(new THREE.HemisphereLight(0xffffff,0x8c7d6a,.85));const d=new THREE.DirectionalLight(0xffffff,1.05);d.position.set(2,4,3);scene.add(d);
  const d2=new THREE.DirectionalLight(0xcfe0ff,.35);d2.position.set(-3,2,-2);scene.add(d2);
  const cam=new THREE.PerspectiveCamera(26,.75,.05,30),rt=new THREE.WebGLRenderTarget(240,320);rt.texture.encoding=THREE.sRGBEncoding;
  return(PS={scene,cam,rt,cache:{}});
}
function shot(obj,w,h,setCam){
  const S=stage(),R=A.renderer;if(S.rt.width!==w||S.rt.height!==h)S.rt.setSize(w,h);
  S.cam.aspect=w/h;setCam(S.cam);S.cam.updateProjectionMatrix();S.scene.add(obj);
  const prevT=R.getRenderTarget(),sh=R.shadowMap.autoUpdate;R.shadowMap.autoUpdate=false;
  let url='';
  try{
    R.setRenderTarget(S.rt);R.render(S.scene,S.cam);
    const px=new Uint8Array(w*h*4);R.readRenderTargetPixels(S.rt,0,0,w,h,px);
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),id=x.createImageData(w,h);
    for(let y=0;y<h;y++)id.data.set(px.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);x.putImageData(id,0,0);url=c.toDataURL('image/png');
  }catch(e){console.error(e)}
  finally{R.setRenderTarget(prevT);R.shadowMap.autoUpdate=sh;S.scene.remove(obj)}
  return url;
}
function figure(w){const g=hunter(w)||A.hunterModel(null,null);const u=g.userData;if(u.blob)u.blob.visible=false;u.arms.rotation.x=.12;return g}
function figShot(w,back,W,H){
  const g=figure(w);g.rotation.y=back?PI*.82:.42;
  return shot(g,W||240,H||320,c=>{c.fov=26;c.position.set(0,1.18,5.1);c.lookAt(0,1.08,0)});
}
function toolShot(n){
  const g=new THREE.Group();
  if(n){const T=toolGeo(n);g.add(new THREE.Mesh(T.body,MAT),new THREE.Mesh(T.acc,T.mat))}else{g.add(new THREE.Mesh(A.HG.gun,A.HUNTER_MATS.gun),new THREE.Mesh(A.HG.gunTip,A.HUNTER_MATS.vest))}
  // seen from its right side, front to the right, framed to its size
  const h=new THREE.Group();h.add(g);g.rotation.set(0,PI/2-.35,0);h.rotation.x=.3;h.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(h),c0=bb.getCenter(new V3()),sz=bb.getSize(new V3());h.position.sub(c0);
  const d=Math.max(sz.x,sz.y*1.2,.3)*.62/Math.tan(15*PI/180);
  return shot(h,160,160,c=>{c.fov=30;c.position.set(0,0,d);c.lookAt(0,0,0)});
}
function img(url,tall){const i=document.createElement('img');i.alt='';i.src=url;if(tall)i.className='tall';return i}
function thumb(slot,n){
  const S=stage(),k=slot+n;
  if(slot==='outfit'){if(!S.cache[k])S.cache[k]=figShot({o:n,t:0},false,180,240);return img(S.cache[k],true)}
  if(slot==='tool'){if(!S.cache[k])S.cache[k]=toolShot(n);return img(S.cache[k])}
  const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');(slot==='taunt'?drawTaunt:drawPoof)(x,n);return c;
}
function preview(){const w={o:pick4[0],t:pick4[1]};$('wdF').src=figShot(w,false);$('wdB').src=figShot(w,true)}
// small pictures for taunts (a speaker and a sign of the sound) and poofs, drawn on a canvas
function drawTaunt(x,n){
  x.fillStyle='#e8edf2';x.fillRect(0,0,96,96);
  if(!n){x.strokeStyle='#8a8fab';x.lineWidth=6;x.beginPath();x.arc(48,48,24,0,TAU);x.moveTo(31,31);x.lineTo(65,65);x.stroke();return}
  const hue=(n*47)%360;x.fillStyle='hsl('+hue+' 70% 55%)';x.beginPath();x.arc(48,48,38,0,TAU);x.fill();
  x.fillStyle='#171a2e';x.beginPath();x.moveTo(24,40);x.lineTo(34,40);x.lineTo(48,28);x.lineTo(48,68);x.lineTo(34,56);x.lineTo(24,56);x.closePath();x.fill();
  x.strokeStyle='#171a2e';x.lineWidth=4;x.lineCap='round';
  for(let i=0;i<3;i++){x.beginPath();x.arc(50,48,10+i*9,-.7,.7);x.stroke()}
  x.fillStyle='#fff';x.font='900 15px Nunito,sans-serif';x.textAlign='center';x.fillText(['','HONK','SQUEAK','WHEEE','BOING','CUCKOO','BZZZ','DING','PARP'][n]||'',48,88);
}
function drawPoof(x,n){
  x.fillStyle='#e8edf2';x.fillRect(0,0,96,96);
  const R=rng(n*977+3),blob=(cx,cy,r,col)=>{x.fillStyle=col;x.beginPath();x.arc(cx,cy,r,0,TAU);x.fill()};
  if(!n){for(let i=0;i<22;i++){x.fillStyle=['#ffd23f','#ff7a1a','#14b89a','#3f7cff','#ec4899'][i%5];x.save();x.translate(20+R()*56,20+R()*56);x.rotate(R()*TAU);x.fillRect(-4,-2,8,4);x.restore()}blob(48,52,14,'rgba(255,255,255,.8)');return}
  if(n===1){for(let i=0;i<9;i++)blob(48+Math.cos(i/9*TAU)*20,50+Math.sin(i/9*TAU)*16,13+R()*6,i%2?'#fff':'#f1f0ec');blob(48,50,18,'#fff')}
  if(n===2)for(let i=0;i<9;i++){x.save();x.translate(18+R()*60,16+R()*64);x.rotate(R()*TAU);x.fillStyle=['#fff','#ffe1ec','#e9f3ff'][i%3];x.beginPath();x.ellipse(0,0,13,4,0,0,TAU);x.fill();x.strokeStyle='#c8c2b8';x.lineWidth=1.2;x.beginPath();x.moveTo(-13,0);x.lineTo(13,0);x.stroke();x.restore()}
  if(n===3)for(let i=0;i<11;i++){const cx=14+R()*68,cy=14+R()*68,r=5+R()*10;x.fillStyle='rgba(190,230,255,.55)';x.beginPath();x.arc(cx,cy,r,0,TAU);x.fill();x.strokeStyle='#7fb6e6';x.lineWidth=1.5;x.stroke();blob(cx-r*.35,cy-r*.35,r*.22,'#fff')}
  if(n===4)for(let i=0;i<7;i++){const cx=16+R()*64,cy=16+R()*64,r=7+R()*8;x.fillStyle=['#ffd23f','#ffb21f','#ffe98a'][i%3];x.beginPath();for(let k=0;k<10;k++){const a=k/10*TAU-PI/2,rr=k%2?r*.45:r;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}x.closePath();x.fill()}
  if(n===5)for(let i=0;i<7;i++){x.save();x.translate(18+R()*60,18+R()*60);x.rotate(R()*1.4-.7);x.fillStyle=['#fff','#ffe24a','#ff5a4a'][i%3];x.fillRect(-12,-7,24,14);x.fillStyle='#171a2e';x.beginPath();x.arc(-7,0,2,0,TAU);x.fill();x.restore()}
}
function rng(s){s=s>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
// in the Wardrobe, a poof plays in the game behind it (on the menu, a little way in front of the camera)
function demoPoof(n){const c=A.camera.position.clone().add(new V3(0,0,-3.2).applyQuaternion(A.camera.quaternion));POOFS[n].go(c,1)}

// ---------------- the buttons that open it (menu and pause screen), and the touch Taunt button ----------------
function addBtn(id,after,cls){
  if($(id))return;const b=document.createElement('button');b.type='button';b.id=id;b.className=cls;b.textContent='Wardrobe';b.onclick=()=>open();
  after.insertAdjacentElement('afterend',b);
}
function sync(){
  const on=A.wardOn();
  if(on){
    build();
    const nf=$('name')&&$('name').closest('.field');if(nf)addBtn('wdOpen',nf,'btn alt sm');
    const kp=$('keysPause');if(kp)addBtn('wdPause',kp,'btn alt');
  }else{for(const id of ['wdOpen','wdPause']){const b=$(id);if(b)b.remove()}close()}
}
let tickT=0;
function update(dt){
  updateParts(dt);
  if(parts.length&&A.camera)camQ=A.camera.quaternion;
  if((tickT-=dt)>0)return;tickT=.2;
  const tb=built&&$('tTaunt');if(tb){const w=mine(),show=!!(A.touchUI&&w&&w.s&&canTaunt());tb.hidden=!show;if(show){const s=Math.ceil(cdLeft());tb.textContent=s>0?'Taunt '+s:'Taunt';tb.classList.toggle('cd',s>0)}}
  if(A.mode!=='menu'&&mine()&&mine().s)A.hudDirty();
}
// a poof where a prop was caught; false when this player's poof is the usual burst
function poof(c,w,form){const P=POOFS[w&&w.f];if(!P)return false;const s=form?clamp(Math.max(form.w,form.h,form.d),.6,2):1;P.go(c,s);return true}

const api={hunter,key,parse,wire,mine,heard,taunt,hint,update,poof,sync,open,close,
  OUTFITS,TOOLS,TAUNTS,POOFS,TAUNT_CD,TAUNT_GAP,play,figShot,toolShot,outfitGeo,toolGeo,get picks(){return pick4.slice()},parts,
  get isOpen(){return open_}};
return api;
};
