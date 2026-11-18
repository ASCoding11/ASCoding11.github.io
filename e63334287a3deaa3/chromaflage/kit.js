/*
 * Chromaflage: the Seeker kit. HIDDEN (captains only for now: KIT_PUBLIC and kitOn() in index.html).
 *
 * index.html fetches this file only when something needs it: this player may open the Seeker kit (a captain's
 * account, KIT_PUBLIC or the test address ?seekerkit=1), or a player in the room wears a kit (a `kt` field in their
 * node). Players with everything off never load it, and the game is exactly as it was. The page calls
 * window.ChromaKit(X) once, where X is the short list of things it lends (kitApi() in index.html), and gets back the
 * hooks it calls: dress() / undress() when a body's seeker gear is built or freed, found() when someone is caught,
 * frame() every frame, cam() for the kit screen's own camera, and access() when kitOn() may have changed.
 *
 * SEEKERS ONLY. Hiders' paint is the whole game, so nothing in here ever touches how a hider looks while hiding:
 *   - hats and tools are added inside the body's seeker gear (Avatar.gear and Avatar.gun in index.html), which the
 *     page shows only while the body is a seeker, exactly like the visor and the blaster;
 *   - the catch splash and the caught animation start only when the host has marked a hider found (onFound), are
 *     drawn under fxRoot (which the practice seeker's eyes never see), last at most 1.2 s and leave no marks behind,
 *     so a hider still hiding nearby is no easier and no harder to see once they are gone.
 * Looks only: shooting is a ray from the camera (index.html's shoot()) and never reads any of this, so a tool does not
 * change reach or tagging (the pellet still starts at the hand, the same spot as before). Hats sit low and no wider
 * than the head's shoulders, and your own hat and tool are hidden whenever the camera is pulled in close to them
 * (a wall behind you), so they never cover your view.
 *
 * A kit is four item numbers [hat, tool, catch splash, caught animation], 0 for none: the `no` of Chromaflage's items
 * in ../cosmetics.js, which also holds their rarity and a line of text. What a number LOOKS like is decided here: the
 * lists below are in number order and their names and two colours match cosmetics.js. A number this file does not know
 * draws nothing (the plain gear), so an older copy copes with newer items. Never reorder a list: add new ones at the
 * end, and add the item with the same number to cosmetics.js. Saved as chroma-kit ('3.1.1.0'); sent in the player's
 * own node as kt, the same string, only when something is worn.
 *
 * What it costs: every hat and every tool is ONE mesh (its pieces merged, with vertex colours; one geometry per item
 * shared by every body wearing it, one material for all). A seeker who wears anything gets the blaster drawn as one
 * merged mesh too (the chosen tool, or the plain blaster's look) in place of its three pieces, and a hat takes the
 * place of the Turkey Week pilgrim hat, so a dressed seeker is never more draw calls than a plain one (a hat and a tool:
 * 3 instead of 4, or 5 in Turkey Week). The effects are a handful of short-lived pieces, like the page's own confetti.
 */
window.ChromaKit=function(X){
'use strict';
const THREE=X.THREE,V3=THREE.Vector3,TAU=Math.PI*2,$=X.$;
const {clamp,lerp,rand,pick}=X;
const SLOTS=['hat','tool','splash','caught'];
const TABS=[['hat','Hats'],['tool','Tools'],['splash','Catch splash'],['caught','Caught']];

// =====================================================================
//  The items, in cosmetics.js's number order: [name, colour 1, colour 2, line of text]
// =====================================================================
const ITEMS={
  hat:[
    ['Detective Deerstalker','#9A6B3F','#5C3B22','A checked cap with a peak at both ends, for following clues in two directions.'],
    ['Safari Hat','#D8C08A','#8A6A3A','A khaki helmet for tracking rare painted creatures through the living room.'],
    ["Painter's Beret",'#2E2A4A','#FF4F8B','A floppy beret already splattered with everyone else\'s paint.'],
    ['Museum Guard Cap','#1E2B4A','#E2B33C','A peaked cap with a gold badge. Please do not touch the exhibits.'],
    ['Hard Hat','#FFC21A','#FFFFFF','Safety first, even when the danger is a sofa that blinks.'],
    ['Exterminator Cap','#3E7D3A','#E23B3B','A green cap with a no-bugs badge. Hiders are not bugs, but still.'],
    ['Goggles','#3A3A46','#5FD0E6','Big round lenses pushed up on the forehead, ready for a closer look.'],
  ],
  tool:[
    ['Magnifying Glass','#C9962E','#BFEFFF','A brass-rimmed lens on a wooden handle. Very detective.'],
    ['Paint Scraper','#14B8A6','#C9D1DA','A wide blade for scraping the camouflage off a suspicious wall.'],
    ['Spray Bottle','#7FE3D6','#FF4F8B','A trigger spray for misting anything that looks too much like the wallpaper.'],
    ['Feather Duster','#A0673C','#FF4F8B','Fluffy rainbow feathers for dusting off whoever is hiding on the shelf.'],
  ],
  splash:[
    ['Paint Splash','#FF4F8B','#FFC83D','A burst of every paint colour, and a big SPLAT!, when you catch someone.'],
  ],
  caught:[
    ['Surprise Spin','#FF4F8B','#3F7CFF','The hider you catch jumps in surprise, spins round and pops in a puff of paint.'],
  ],
};
const PAINT=['#ff4f8b','#ffc83d','#14b8a6','#3f7cff','#8b5cf6','#ff8a3d'];
const valid=(slot,n)=>Number.isInteger(n)&&n>0&&n<=ITEMS[slot].length;

// my own kit (only while this player may open the Seeker kit)
let myKit=(()=>{const k=X.kitOf(X.store.get('kit',''));return k?k.map((n,i)=>valid(SLOTS[i],n)?n:0):[0,0,0,0]})();
const wire=k=>k&&k.some(n=>n)?k.join('.'):'';
const mine=()=>X.kitOn()?myKit:null;
// what a body wears: mine for me and the kit screen's model, what their node says for other players, nothing for bots
function kitOfEnt(e){
  if(!e)return null;
  if(e.isMe||e.kitPreview)return mine();
  if(e.remote){const k=X.kitOf(e.kt);return k?k.map((n,i)=>valid(SLOTS[i],n)?n:0):null}
  return null;
}

// =====================================================================
//  Geometry: pieces merged into one BufferGeometry with vertex colours.
//  col is a colour, or fn(centroid, face index) giving one per triangle (checks, paint dots).
// =====================================================================
const KMAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:0});
const _o=new THREE.Object3D(),_v=new V3(),_c=new V3(),_n3=new THREE.Matrix3(),_col=new THREE.Color();
function Bake(){this.pos=[];this.nrm=[];this.col=[]}
Bake.prototype.add=function(geo,col,p,s,r){
  const g=geo.index?geo.toNonIndexed():geo,P=g.attributes.position,N=g.attributes.normal;
  _o.position.set(p[0],p[1],p[2]);_o.scale.set(s[0],s[1],s[2]);_o.rotation.set(r?r[0]:0,r?r[1]:0,r?r[2]:0,'YXZ');_o.updateMatrix();_n3.getNormalMatrix(_o.matrix);
  const fn=typeof col==='function';if(!fn)_col.set(col);
  for(let i=0;i<P.count;i+=3){
    const a=this.pos.length;
    for(let j=0;j<3;j++){_v.fromBufferAttribute(P,i+j).applyMatrix4(_o.matrix);this.pos.push(_v.x,_v.y,_v.z);_v.fromBufferAttribute(N,i+j).applyMatrix3(_n3).normalize();this.nrm.push(_v.x,_v.y,_v.z)}
    if(fn){_c.set((this.pos[a]+this.pos[a+3]+this.pos[a+6])/3,(this.pos[a+1]+this.pos[a+4]+this.pos[a+7])/3,(this.pos[a+2]+this.pos[a+5]+this.pos[a+8])/3);_col.set(col(_c,i/3))}
    for(let j=0;j<3;j++)this.col.push(_col.r,_col.g,_col.b);
  }
  if(g!==geo)g.dispose();geo.dispose();return this;
};
Bake.prototype.done=function(){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(this.pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.nrm,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.col,3));
  g.computeBoundingSphere();return g;
};
const Sph=(ws,hs,t0,tl)=>new THREE.SphereGeometry(1,ws||16,hs||10,0,TAU,t0||0,tl==null?Math.PI:tl);
const Cyl=(rt,rb,seg,open,ts,tl)=>new THREE.CylinderGeometry(rt,rb,1,seg||16,1,!!open,ts||0,tl==null?TAU:tl);
const Box=()=>new THREE.BoxGeometry(1,1,1);
const Tor=(R,r,rs,ts,arc)=>new THREE.TorusGeometry(R,r,rs||6,ts||20,arc||TAU);
// a dome over the head from the top down to height y0 (head units: the head is a ball of radius 1 at the origin)
const domeTo=(r,y0,ws,hs)=>Sph(ws||18,hs||8,0,Math.acos(clamp(y0/r,-1,1))).scale(r,r,r);
// a little hash for per-face patterns that look the same on every computer
const hash=i=>{let h=Math.imul(i^0x9e3779b9,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);return((h^h>>>16)>>>0)/4294967296};

// ---------- hats (head units: the head is a ball of radius 1 at the origin, +z is the face, +y up; the seeker's
// visor band covers y -0.1 to 0.35, so every hat keeps above it) ----------
const HAT_BUILD=[
  // 1 Detective Deerstalker: a checked crown, a peak front and back, ear flaps tied up on top with a bow
  ()=>{const b=new Bake(),A='#C8955A',B='#6B4527',D='#3E2614';
    const check=c=>{const lon=Math.atan2(c.x,c.z),k=Math.floor((lon+Math.PI)/(TAU/14))+Math.floor((c.y+2)*3.4);return k%2?A:B};
    b.add(domeTo(1.12,.34,28,10),check,[0,0,0],[1,1,1]);
    b.add(Cyl(1.13,1.13,28,true),D,[0,.4,0],[1,.08,1]);
    for(const s of [1,-1]){b.add(Cyl(1,1,14,false,-.85,1.7),check,[0,.38,s*.06],[1.28,.06,1.34*s],[s*.2,s<0?Math.PI:0,0])}
    for(const s of [1,-1]){b.add(Box(),check,[s*.62,.98,0],[.12,.62,.62],[0,0,-s*.55])}
    b.add(Sph(10,8),D,[0,1.24,0],[.1,.1,.1]);
    for(const s of [1,-1])b.add(Sph(10,8),D,[s*.16,1.26,0],[.16,.08,.1],[0,0,s*.4]);
    b.add(Sph(8,6),B,[0,1.12,0],[.09,.06,.09]);
    return b.done()},
  // 2 Safari Hat: a khaki pith helmet with a sloping brim, a darker band and a vent on top
  ()=>{const b=new Bake(),K='#D8C08A',K2='#C6AC74',BD='#8A6A3A';
    b.add(domeTo(1.15,.3,24,10),K,[0,0,0],[1,1,1.08]);
    b.add(Cyl(1.08,1.55,28),K2,[0,.24,0],[1,.16,1.08]);
    b.add(Cyl(1.17,1.17,28,true),BD,[0,.47,0],[1,.2,1.08]);
    b.add(Sph(10,6,0,Math.PI/2),BD,[0,1.12,0],[.16,.1,.16]);
    b.add(Cyl(1,1,10),K,[0,1.15,0],[.08,.12,.08]);
    return b.done()},
  // 3 Painter's Beret: a floppy, tilted beret with a stalk, splattered with paint
  ()=>{const b=new Bake(),N='#2E2A4A';
    const dots=(c,i)=>{const h=hash(i*7+3);return h<.16?PAINT[Math.floor(hash(i*13+1)*PAINT.length)]:N};
    b.add(Sph(24,12),dots,[.12,.74,-.04],[1.34,.4,1.28],[-.06,0,-.24]);
    b.add(Tor(1.02,.08,6,28),'#221E38',[.04,.5,0],[1,1,1],[Math.PI/2+.06,0,-.22]);
    b.add(Cyl(.3,1,8),N,[-.04,1.14,-.05],[.07,.22,.07],[0,0,-.3]);
    return b.done()},
  // 4 Museum Guard Cap: a navy peaked cap that flares at the top, a shiny black peak, a gold cord and badge
  ()=>{const b=new Bake(),NV='#1E2B4A',NV2='#26365C',GD='#E2B33C';
    b.add(Cyl(1.06,1.04,28),NV,[0,.56,0],[1,.38,1]);
    b.add(Cyl(1.34,1.07,28),NV2,[0,.86,-.04],[1,.24,1]);
    b.add(Sph(28,6,0,.45),NV2,[0,.68,-.04],[1.34,.7,1.34]);
    b.add(Cyl(1,1,16,false,-.9,1.8),'#0E0F14',[0,.4,0],[1.3,.06,1.36],[.28,0,0]);
    b.add(Cyl(1.075,1.075,28,true,-1.1,2.2),GD,[0,.5,0],[1,.06,1]);
    b.add(Box(),GD,[0,.8,1.08],[.3,.3,.06],[-.12,0,0]);
    b.add(Box(),NV,[0,.8,1.11],[.14,.14,.04],[-.12,0,Math.PI/4]);
    return b.done()},
  // 5 Hard Hat: a yellow dome with a ridge down the middle, a brim with a longer peak and a white stripe
  ()=>{const b=new Bake(),Y='#FFC21A',Y2='#F2B300';
    b.add(domeTo(1.13,.36,24,10),Y,[0,0,0],[1,1,1]);
    b.add(Tor(1.12,.1,6,18,Math.PI-.8),Y2,[0,0,0],[1,1,1],[0,Math.PI/2,.4]);
    b.add(Cyl(1.32,1.32,28),Y2,[0,.38,0],[1,.06,1]);
    b.add(Cyl(1,1,16,false,-.95,1.9),Y2,[0,.38,.02],[1.62,.06,1.62],[.06,0,0]);
    b.add(Cyl(1.14,1.14,28,true),'#FFFFFF',[0,.6,0],[1,.1,1]);
    return b.done()},
  // 6 Exterminator Cap: a green baseball cap with a long bill and a no-bugs badge on the front
  ()=>{const b=new Bake(),G='#3E7D3A',G2='#2F6A2C',R='#E23B3B';
    b.add(domeTo(1.1,.38,24,10),G,[0,0,0],[1,1,1]);
    b.add(Sph(8,6),G2,[0,1.1,0],[.1,.07,.1]);
    b.add(Cyl(1,1,16,false,-Math.PI/2,Math.PI),G2,[0,.42,.55],[.98,.05,1.06],[.1,0,0]);
    // the badge: a white disc, a black beetle, and a red ring with a slash across it
    const bz=1.02,by=.74,tilt=-.35;
    b.add(Cyl(1,1,20),'#FFFFFF',[0,by,bz],[.32,.04,.32],[Math.PI/2+tilt,0,0]);
    b.add(Sph(8,6),'#1F1B33',[0,by-.02,bz+.05],[.1,.14,.05],[tilt,0,0]);
    b.add(Sph(8,6),'#1F1B33',[0,by+.13,bz+.03],[.06,.06,.04],[tilt,0,0]);
    for(const s of [1,-1])for(const k of [-1,0,1])b.add(Box(),'#1F1B33',[s*.12,by-.02+k*.07,bz+.05],[.1,.018,.02],[tilt,0,s*k*.35]);
    b.add(Tor(.27,.04,6,24),R,[0,by,bz+.07],[1,1,1],[tilt,0,0]);
    b.add(Box(),R,[0,by,bz+.08],[.52,.06,.03],[tilt,0,-Math.PI/4]);
    return b.done()},
  // 7 Goggles: a strap round the head and two big round lenses pushed up on the forehead
  ()=>{const b=new Bake(),S='#3A3A46',RIM='#B98A3E',L='#5FD0E6';
    b.add(Tor(1.04,.08,6,30),S,[0,.56,0],[1,1,1],[Math.PI/2+.12,0,0]);
    for(const s of [1,-1]){
      const x=s*.36,y=.66,z=.92,rx=-.38,ry=s*.36;
      b.add(Cyl(1,1,18),'#2B2B33',[x,y,z],[.3,.22,.3],[Math.PI/2+rx,ry,0]);
      b.add(Tor(.3,.06,6,20),RIM,[x+Math.sin(ry)*.1,y+.04,z+.1],[1,1,1],[rx,ry,0]);
      b.add(Cyl(1,1,18),c=>(c.x-x)*s<-.08&&c.y>y+.05?'#FFFFFF':L,[x+Math.sin(ry)*.11,y+.045,z+.11],[.27,.03,.27],[Math.PI/2+rx,ry,0]);
    }
    b.add(Box(),RIM,[0,.7,1.04],[.2,.07,.08],[-.38,0,0]);
    return b.done()},
];
// ---------- tools, drawn held upright in the hand (the hand at the origin, +y up, +z forward); toolGeo turns them to
// the way the hand holds the blaster: the Doll aims with its arm out and the blaster standing up on its fist, the
// Block holds it level at its side ----------
const blasterBuild=kind=>()=>{const b=new Bake();   // the plain blaster's look, as one mesh
  if(kind===0){b.add(Box(),'#ffc83d',[0,0,.09],[.09,.11,.28]);b.add(Cyl(1,1,10),'#1f1b33',[0,0,.28],[.032,.15,.032],[Math.PI/2,0,0]);b.add(Sph(10,8),'#ff6a9e',[0,.085,.04],[.065,.065,.065])}
  else{b.add(Box(),'#ffc83d',[0,0,0],[.1,.12,.32]);b.add(Cyl(1,1,10),'#1f1b33',[0,0,.22],[.035,.16,.035],[Math.PI/2,0,0])}
  return b.done()};
const TOOL_BUILD=[
  // 1 Magnifying Glass: a wooden handle held upright, a brass ring and a pale lens facing forward
  ()=>{const b=new Bake();
    b.add(Cyl(1,1,10),'#6B3F24',[0,-.01,.02],[.022,.16,.022]);
    b.add(Cyl(1,1,10),'#C9962E',[0,.075,.02],[.026,.025,.026]);
    b.add(Tor(.078,.014,6,22),'#C9962E',[0,.168,.03],[1,1,1]);
    b.add(Cyl(1,1,22),c=>c.x<-.02&&c.y>.19?'#FFFFFF':'#BFEFFF',[0,.168,.03],[.078,.008,.078],[Math.PI/2,0,0]);
    return b.done()},
  // 2 Paint Scraper: a teal handle, a silver collar and a wide blade with a stripe of pink paint on its edge
  ()=>{const b=new Bake();
    b.add(Cyl(.9,1,10),'#14B8A6',[0,.005,0],[.026,.15,.026]);
    b.add(Cyl(1,1,10),'#C9D1DA',[0,.09,0],[.028,.03,.028]);
    b.add(Cyl(.3,1,4),'#C9D1DA',[0,.115,0],[.07,.03,.01],[0,Math.PI/4,0]);
    b.add(Box(),c=>c.y>.175?'#FF4F8B':'#C9D1DA',[0,.155,.004],[.14,.1,.008],[-.08,0,0]);
    return b.done()},
  // 3 Spray Bottle: a white trigger head with a pink nozzle over a see-through teal bottle with a label
  ()=>{const b=new Bake();
    b.add(Cyl(1,1,16),'#7FE3D6',[0,-.1,-.01],[.045,.15,.045]);
    b.add(Cyl(1,1,16,true),c=>Math.abs(Math.atan2(c.x,c.z))<.8?'#FF4F8B':'#FFFFFF',[0,-.1,-.01],[.047,.06,.047]);
    b.add(Cyl(1,1,10),'#F4F4F8',[0,-.012,-.01],[.022,.03,.022]);
    b.add(Box(),'#F4F4F8',[0,.02,.025],[.05,.05,.11]);
    b.add(Cyl(1,1,10),'#FF4F8B',[0,.025,.09],[.013,.03,.013],[Math.PI/2,0,0]);
    b.add(Box(),'#F4F4F8',[0,-.025,.06],[.018,.06,.02],[.35,0,0]);
    return b.done()},
  // 4 Feather Duster: a wooden handle and a fluffy fan of rainbow feathers (no taller than the blaster)
  ()=>{const b=new Bake(),F=['#FF4F8B','#FFC83D','#14B8A6','#8B5CF6','#FFFFFF','#3F7CFF'];
    b.add(Cyl(1,1,10),'#A0673C',[0,.03,0],[.018,.2,.018]);
    b.add(Cyl(1,1,10),'#FF4F8B',[0,-.065,0],[.022,.03,.022]);
    b.add(Sph(10,8),'#FFC83D',[0,.145,0],[.045,.05,.045]);
    for(let i=0;i<10;i++){const a=i/10*TAU,ring=i%2?.75:.42;b.add(Sph(8,6),F[i%F.length],[Math.cos(a)*.035,.205,Math.sin(a)*.035],[.032,.1,.032],[Math.sin(a)*ring,0,-Math.cos(a)*ring])}
    b.add(Sph(8,6),'#FFFFFF',[0,.245,0],[.035,.085,.035]);
    return b.done()},
];
const geoCache={};
function geoOf(key,build){return geoCache[key]||(geoCache[key]=build())}
const hatGeo=n=>geoOf('h'+n,HAT_BUILD[n-1]);
const toolNat=n=>geoOf('n'+n,()=>TOOL_BUILD[n-1]().scale(1.2,1.2,1.2));   // a fifth bigger than drawn, to read at a distance
const toolGeo=(n,kind)=>!n?geoOf('b'+kind,blasterBuild(kind)):kind?toolNat(n):geoOf('t'+n,()=>toolNat(n).clone().rotateX(Math.PI/2));
// where the head is in the gear's own space, per body shape: [x,y,z], scale [x,y,z] (head units to metres)
const HEAD=[{p:[0,.97,0],s:[.205,.205,.205]},{p:[0,.9,.005],s:[.3,.22,.24]}];   // the Block's just wide enough to cover its top corners

// =====================================================================
//  Dressing a body (only its seeker gear: the page shows the gear only while it is a seeker)
// =====================================================================
function undress(av){
  const ck=av.ck;if(!ck)return;av.ck=null;
  if(ck.hat&&ck.hat.parent)ck.hat.parent.remove(ck.hat);
  if(ck.tool&&ck.tool.parent)ck.tool.parent.remove(ck.tool);
  for(const o of ck.hid)o.visible=true;
}
function dress(av){
  undress(av);
  const k=kitOfEnt(av.e);if(!k||!av.gear)return;
  const ck={k:k.slice(),hat:null,tool:null,hid:[]};av.ck=ck;
  if(!k[0]&&!k[1])return;   // only effects: the gear stays as it is
  const H=HEAD[av.kind?1:0];
  if(k[0]){
    const m=new THREE.Mesh(hatGeo(k[0]),KMAT);m.position.set(...H.p);m.scale.set(...H.s);m.castShadow=true;m.userData.kit=1;av.gear.add(m);ck.hat=m;
    for(const o of av.gear.children)if(o!==m&&X.tkHats.has(o)&&o.visible){o.visible=false;ck.hid.push(o)}   // the hat replaces the pilgrim hat
  }
  if(av.gun){
    for(const o of av.gun.children)if(o.visible){o.visible=false;ck.hid.push(o)}
    const m=new THREE.Mesh(toolGeo(k[1],av.kind?1:0),KMAT);m.castShadow=true;m.userData.kit=1;av.gun.add(m);ck.tool=m;
  }
}
function redressAll(){for(const e of X.ents.values())dress(e.av)}

// =====================================================================
//  Effects when a seeker in a kit catches someone (drawn under fxRoot, gone in ~1.2 s)
// =====================================================================
let splashTex=null,wordTex=null,bangTex=null;
function texOf(draw,w,h){const c=X.cnv(w,h||w);draw(c.getContext('2d'),w,h||w);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
function splatPath(x,cx,cy,r,seed,lobes){
  x.beginPath();const n=48;
  for(let i=0;i<=n;i++){const a=i/n*TAU;let rr=r*(1+.08*Math.sin(3*a+seed)+.05*Math.sin(7*a+seed*2));
    for(let l=0;l<lobes;l++){const la=l/lobes*TAU+seed;let d=Math.abs(a-la)%TAU;if(d>Math.PI)d=TAU-d;rr+=r*.45*Math.exp(-d*d/.02)}
    const px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr;i?x.lineTo(px,py):x.moveTo(px,py)}
  x.closePath();
}
function splashPic(x,w){
  const c=w/2;[['#8b5cf6',.42,7],['#3f7cff',.36,6],['#14b8a6',.3,7],['#ffc83d',.23,5],['#ff4f8b',.16,6]].forEach(([col,r,l],i)=>{x.fillStyle=col;splatPath(x,c,c,w*r*.62,i*1.7+.4,l);x.fill()});
  for(let i=0;i<14;i++){const a=i/14*TAU+.2,d=w*(.4+hash(i)*.08);x.fillStyle=PAINT[i%PAINT.length];x.beginPath();x.arc(c+Math.cos(a)*d,c+Math.sin(a)*d,w*(.018+hash(i+40)*.02),0,TAU);x.fill()}
}
function splash(p,n){
  if(!splashTex){splashTex=texOf(splashPic,128);wordTex=texOf((x,w,h)=>{x.font='700 '+Math.round(h*.62)+'px Fredoka,"Arial Rounded MT Bold",sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=h*.13;x.strokeStyle='#1f1b33';x.strokeText('SPLAT!',w/2,h*.54);const g=x.createLinearGradient(0,0,w,0);PAINT.slice(0,5).forEach((c,i)=>g.addColorStop(i/4,c));x.fillStyle=g;x.fillText('SPLAT!',w/2,h*.54)},256,96)}
  const hi=X.fxHigh(),m0=hi?16:9;
  for(let i=0;i<m0;i++){const m=X.fxMesh(X.fxSphere,PAINT[i%PAINT.length]);m.position.copy(p);const s=rand(.045,.085);m.scale.setScalar(s);
    const a=i/m0*TAU+rand(-.2,.2),out=rand(1.8,3.8);X.fx.push({m,t:0,life:rand(.5,.8),v:new V3(Math.cos(a)*out,rand(1.6,4.2),Math.sin(a)*out),grav:1,shrink:s})}
  X.burstSprite(splashTex,'#ffffff',p,.5,.5,4.2);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:wordTex,transparent:true,depthWrite:false}));s.position.copy(p).add(new V3(0,.75,0));s.scale.set(1.15,.43,1);X.fxRoot.add(s);
  X.fx.push({m:s,t:0,life:1,v:new V3(0,.7,0),grow:.25,fade:1});
  X.sfx('splat',p);
}
// the caught animation: a copy of the hider's body (made the moment it is caught, so the page can hide or turn the
// real one as it always has) hops, spins and pops. The copy shares the body's shapes; its material is its own.
const anims=[];
function caught(e,n){
  const av=e.av;if(!av.root.visible||!av.parts.length)return;
  av.root.updateMatrixWorld(true);
  const g=new THREE.Group(),inv=new THREE.Matrix4().copy(av.root.matrixWorld).invert(),mats=new Map();
  g.position.copy(av.root.position);g.quaternion.copy(av.root.quaternion);g.scale.copy(av.root.scale);
  for(const m of av.parts){
    if(!m.visible)continue;let mt=mats.get(m.material);if(!mt){mt=m.material.clone();mats.set(m.material,mt)}
    const k=new THREE.Mesh(m.geometry,mt);k.matrixAutoUpdate=false;k.matrix.multiplyMatrices(inv,m.matrixWorld);g.add(k);
  }
  X.fxRoot.add(g);
  if(!bangTex)bangTex=texOf((x,w)=>{x.font='700 '+Math.round(w*.8)+'px Fredoka,"Arial Rounded MT Bold",sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=w*.12;x.lineJoin='round';x.strokeStyle='#1f1b33';x.strokeText('!',w/2,w*.55);x.fillStyle='#ffc83d';x.fillText('!',w/2,w*.55)},64);
  const h=X.heightOf(e),bang=new THREE.Sprite(new THREE.SpriteMaterial({map:bangTex,transparent:true,depthWrite:false}));bang.position.copy(e.pos).add(new V3(0,h+.3,0));bang.scale.setScalar(.45);X.fxRoot.add(bang);
  X.fx.push({m:bang,t:0,life:.55,v:new V3(0,.6,0),fade:1});
  anims.push({g,mats:[...mats.values()],t:0,life:1.1,y0:g.position.y,ry:g.rotation.y,s0:g.scale.clone(),h,popped:false,pos:e.pos.clone()});
  X.sfx('squeak',e.pos);
}
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function tickAnims(dt){
  for(let i=anims.length-1;i>=0;i--){const a=anims[i];a.t+=dt;const t=a.t,g=a.g;
    // squash, hop with a stretch, spin twice, then shrink away while turning paint-pink
    let sy=1,sxz=1;
    if(t<.12){const k=t/.12;sy=1-.28*Math.sin(k*Math.PI/2);sxz=1+.16*Math.sin(k*Math.PI/2)}
    else if(t<.45){const k=(t-.12)/.33;sy=lerp(.72,1.16,Math.min(1,k*2))-.16*Math.max(0,k*2-1);sxz=lerp(1.16,.9,Math.min(1,k*2))+.1*Math.max(0,k*2-1)}
    const shrink=t<.62?1:Math.max(0,1-ease(Math.min(1,(t-.62)/.38)));
    const up=t<.12?0:Math.sin(Math.min(1,(t-.12)/.6)*Math.PI/2)*.75+Math.max(0,t-.72)*.5;
    g.position.y=a.y0+up;g.rotation.y=a.ry+ease(Math.min(1,t/1))*TAU*2;
    g.scale.set(a.s0.x*sxz*shrink,a.s0.y*sy*shrink,a.s0.z*sxz*shrink);
    const pk=clamp((t-.3)/.5,0,1);for(const m of a.mats)if(m.emissive)m.emissive.setRGB(pk,pk*.31,pk*.55);
    if(!a.popped&&t>.9){a.popped=true;const p=a.pos.clone();p.y=a.y0+up+a.h*.45;
      for(let j=0,nd=X.fxHigh()?12:7;j<nd;j++){const m=X.fxMesh(X.fxDrop,PAINT[j%PAINT.length]);m.position.copy(p);const s=rand(.03,.055);m.scale.setScalar(s);const an=j/nd*TAU;
        X.fx.push({m,t:0,life:rand(.3,.5),v:new V3(Math.cos(an)*rand(1.4,2.6),rand(.6,2.2),Math.sin(an)*rand(1.4,2.6)),grav:1,shrink:s})}
      X.sfx('puff',p)}
    if(t>=a.life){X.fxRoot.remove(g);for(const m of a.mats)m.dispose();anims.splice(i,1)}
  }
}
// someone was caught (before the page hides them or turns them into a seeker): the catcher's effects, if any
function found(e,by){
  const c=X.ents.get(by),k=c?kitOfEnt(c):null;if(!k||!e)return;
  const p=e.pos.clone();p.y+=X.heightOf(e)*.55;
  if(valid('caught',k[3]))caught(e,k[3]);
  if(valid('splash',k[2]))splash(p,k[2]);
}

// =====================================================================
//  The Seeker kit screen (menu only): a model of you as a seeker, the items in tabs, a tap to wear one
// =====================================================================
const css=document.createElement('style');
css.textContent=`
#kitBtnRow{margin-top:12px}
#kitBtnRow .btn{width:100%;flex-direction:column;gap:0;line-height:1.1;font-size:18px;padding:9px 12px}
#kitBtnRow .btn small{font-family:var(--f-b);font-weight:800;font-size:12px;color:var(--ink-2);margin-top:3px}
#kit{position:absolute;inset:0;padding:0;overflow:hidden;touch-action:none}
#kit .kcard{position:absolute;right:14px;top:calc(14px + env(safe-area-inset-top,0px));bottom:14px;width:min(380px,calc(100% - 28px));display:flex;flex-direction:column;padding:0;overflow:hidden;touch-action:auto}
#kit .khead{display:flex;align-items:center;gap:8px;padding:14px 16px 0}
#kit h2{font-family:var(--f-d);font-weight:700;font-size:23px;margin:0}
#kit .kbadge{font-family:var(--f-b);font-weight:900;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;background:var(--sun);border:2px solid var(--ink);border-radius:8px;padding:1px 6px}
#kit .khead .btn{margin-left:auto}
#kit .ksub{margin:6px 16px 0;font-size:13px}
#kit .ktabs{display:flex;margin:10px 16px 0;align-self:flex-start;max-width:calc(100% - 32px)}
#kit .ktabs button{padding:7px 9px;font-size:12.5px;white-space:nowrap}
#kit .kbody{flex:1;min-height:0;overflow:auto;padding:12px 16px 14px}
#kit .kgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:9px}
#kit .ktile{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px 7px;border:2.5px solid var(--ink);border-radius:14px;background:#fff;box-shadow:0 3px 0 var(--ink);font-weight:900;font-size:12px;line-height:1.15;text-align:center;min-width:0}
#kit .ktile img,#kit .ktile canvas,#kit .ktile .knone{width:72px;height:72px;border-radius:10px;background:var(--paper-2);display:block}
#kit .ktile .knone{display:flex;align-items:center;justify-content:center;font-family:var(--f-d);font-size:28px;color:var(--ink-3)}
#kit .ktile[aria-pressed="true"]{background:#ffe1ea;box-shadow:0 3px 0 var(--pink);border-color:var(--pink)}
#kit .ktile:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}
#kit .kdesc{margin:12px 0 0;min-height:2.9em}
#kit .kdesc b{display:block;font-family:var(--f-d);font-weight:600;font-size:16px;color:var(--ink)}
#kit .kplay{margin-top:4px}
#kit .khint{position:absolute;left:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));font-weight:900;font-size:13px;color:#fff;text-shadow:0 2px 0 rgba(31,27,51,.85);pointer-events:none}
@media (max-width:760px),(max-height:500px) and (max-width:1000px){
  #kit .kcard{width:min(340px,48%)}
  #kit .khint{display:none}
}
@media (max-width:760px) and (min-height:501px){
  #kit .kcard{left:0;right:0;top:auto;bottom:0;width:auto;max-height:54%;border-radius:20px 20px 0 0;border-bottom:0;box-shadow:0 -3px 0 var(--ink)}
}
@media (max-height:500px){
  #kit .kcard{top:calc(10px + env(safe-area-inset-top,0px));bottom:calc(10px + env(safe-area-inset-bottom,0px));right:calc(10px + env(safe-area-inset-right,0px))}
  #kit .khead{padding-top:10px}#kit h2{font-size:20px}#kit .ksub{display:none}
  #kit .kgrid{grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:7px}
  #kit .ktile img,#kit .ktile canvas,#kit .ktile .knone{width:58px;height:58px}
}
`;

const UI={open:false,tab:'hat',yaw:0,drag:null,auto:true,ent:null,thumbs:{},built:false,demoT:0};
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function buildUI(){
  if(UI.built)return;UI.built=true;document.head.appendChild(css);
  // the button in the menu, under the body choices
  const row=el('div','',`<button class="btn alt" type="button" id="kitOpen">Seeker kit<small>Hats, tools and catch effects</small></button>`);row.id='kitBtnRow';row.hidden=true;
  const note=$('sizeSeg')&&$('sizeSeg').closest('.card').querySelector('p.note');
  if(note)note.after(row);else{const c=document.querySelectorAll('#menu .card')[1];if(c)c.appendChild(row)}
  $('kitOpen').onclick=()=>{X.sfx('ui');openKit()};
  const sec=el('section','overlay',`<div class="khint">Drag to turn</div><div class="card kcard" role="dialog" aria-labelledby="kitTitle">
    <div class="khead"><h2 id="kitTitle">Seeker kit</h2><span class="kbadge">Captains</span><button class="btn sm" type="button" id="kitDone">Done</button></div>
    <p class="note ksub">Worn only while you seek. Hiders never wear any of it, so it can't give anyone away.</p>
    <div class="seg ktabs" role="tablist">${TABS.map(([k,n])=>`<button type="button" role="tab" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="kbody"><div class="kgrid" id="kitGrid"></div><p class="note kdesc" id="kitDesc"></p><button class="btn sm teal kplay" type="button" id="kitPlay" hidden>Play it</button></div>
  </div>`);
  sec.id='kit';sec.hidden=true;$('app').appendChild(sec);
  $('kitDone').onclick=()=>{X.sfx('ui');closeKit()};
  sec.querySelector('.ktabs').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;UI.tab=b.dataset.k;X.sfx('ui');renderTab()};
  $('kitPlay').onclick=()=>{X.sfx('ui');demo(UI.tab)};
  // drag the empty part of the screen to turn the model
  sec.addEventListener('pointerdown',ev=>{if(ev.target.closest('.kcard'))return;UI.drag={x:ev.clientX,yaw:UI.yaw,id:ev.pointerId};UI.auto=false;try{sec.setPointerCapture(ev.pointerId)}catch(e){}});
  sec.addEventListener('pointermove',ev=>{const d=UI.drag;if(!d||d.id!==ev.pointerId)return;UI.yaw=d.yaw-(ev.clientX-d.x)*.012});
  const up=ev=>{if(UI.drag&&UI.drag.id===ev.pointerId)UI.drag=null};sec.addEventListener('pointerup',up);sec.addEventListener('pointercancel',up);
  addEventListener('keydown',ev=>{if(UI.open&&ev.key==='Escape'){ev.preventDefault();closeKit()}});
}
function tileThumb(slot,n){
  const key=slot+n;if(UI.thumbs[key])return UI.thumbs[key];
  let url='';
  if(slot==='hat'||slot==='tool')url=renderThumb(slot==='hat'?hatGeo(n):toolNat(n),slot);
  else{const c=X.cnv(144,144),x=c.getContext('2d');x.fillStyle='#f3ecdf';x.fillRect(0,0,144,144);
    if(slot==='splash'){x.save();x.translate(8,8);splashPic(x,128);x.restore();x.font='700 30px Fredoka,sans-serif';x.textAlign='center';x.lineWidth=6;x.lineJoin='round';x.strokeStyle='#1f1b33';x.strokeText('SPLAT!',72,80);x.fillStyle='#fff';x.fillText('SPLAT!',72,80)}
    else caughtPic(x);
    url=c.toDataURL('image/png')}
  return(UI.thumbs[key]=url);
}
function caughtPic(x){   // a little doll mid-spin, with motion arcs, a "!" and paint drops
  x.save();x.translate(72,80);x.strokeStyle='#1f1b33';x.lineWidth=4;x.lineCap='round';
  x.strokeStyle='#8c88a3';for(const r of [40,48]){x.beginPath();x.ellipse(0,18,r,r*.3,0,.2,Math.PI-.2);x.stroke()}
  x.strokeStyle='#1f1b33';x.fillStyle='#ffe1ea';x.beginPath();x.ellipse(0,6,18,24,0,0,TAU);x.fill();x.stroke();
  x.beginPath();x.arc(0,-28,16,0,TAU);x.fill();x.stroke();
  x.fillStyle='#1f1b33';x.beginPath();x.arc(-5,-29,2.6,0,TAU);x.arc(5,-29,2.6,0,TAU);x.fill();x.beginPath();x.arc(0,-21,3.5,0,TAU);x.fill();
  x.font='700 34px Fredoka,sans-serif';x.textAlign='center';x.lineWidth=6;x.lineJoin='round';x.strokeText('!',30,-34);x.fillStyle='#ffc83d';x.fillText('!',30,-34);
  for(let i=0;i<7;i++){const a=-2.6+i*.55;x.fillStyle=PAINT[i%PAINT.length];x.beginPath();x.arc(Math.cos(a)*44,-8+Math.sin(a)*30,4+(i%3),0,TAU);x.fill()}
  x.restore();
}
// a small picture of a hat or tool, drawn once with the game's renderer into a little target of its own
let TH=null;
function renderThumb(geo,slot){
  const S=144,R=X.renderer;
  if(!TH){TH={rt:new THREE.WebGLRenderTarget(S,S),scene:new THREE.Scene(),cam:new THREE.PerspectiveCamera(30,1,.01,20),buf:new Uint8Array(S*S*4),mesh:new THREE.Mesh(geo,KMAT)};
    TH.rt.texture.encoding=THREE.sRGBEncoding;TH.scene.background=new THREE.Color('#f3ecdf');
    TH.scene.add(new THREE.HemisphereLight(0xffffff,0x80705f,.55),TH.mesh);const d=new THREE.DirectionalLight(0xffffff,.6);d.position.set(2,3,4);TH.scene.add(d);TH.scene.add(new THREE.AmbientLight(0xffffff,.12))}
  TH.mesh.geometry=geo;geo.computeBoundingBox();const bb=geo.boundingBox,c=bb.getCenter(new V3()),r=bb.getSize(new V3()).length()*.5;
  const ang=slot==='hat'?[.55,.42]:[.75,.3],d=r/Math.sin(15*Math.PI/180)*1.02;
  TH.cam.position.set(c.x+Math.sin(ang[0])*Math.cos(ang[1])*d,c.y+Math.sin(ang[1])*d,c.z+Math.cos(ang[0])*Math.cos(ang[1])*d);TH.cam.lookAt(c);TH.cam.updateMatrixWorld();
  const prev=R.getRenderTarget(),sh=R.shadowMap.autoUpdate;R.shadowMap.autoUpdate=false;
  R.setRenderTarget(TH.rt);R.render(TH.scene,TH.cam);R.setRenderTarget(prev);R.shadowMap.autoUpdate=sh;
  R.readRenderTargetPixels(TH.rt,0,0,S,S,TH.buf);
  const cv=X.cnv(S,S),x=cv.getContext('2d'),im=x.createImageData(S,S);
  for(let y=0;y<S;y++)im.data.set(TH.buf.subarray((S-1-y)*S*4,(S-y)*S*4),y*S*4);
  x.putImageData(im,0,0);return cv.toDataURL('image/png');
}
function renderTab(){
  const sec=$('kit');for(const b of sec.querySelectorAll('.ktabs button'))b.setAttribute('aria-pressed',String(b.dataset.k===UI.tab));
  const slot=UI.tab,si=SLOTS.indexOf(slot),grid=$('kitGrid');grid.textContent='';
  const tile=(n,name)=>{const b=el('button','ktile');b.type='button';b.setAttribute('aria-pressed',String(myKit[si]===n));
    if(n){const im=new Image();im.alt='';im.src=tileThumb(slot,n);b.appendChild(im)}else b.appendChild(el('span','knone','–'));
    b.appendChild(el('span','',X.esc(name)));b.onclick=()=>{wear(slot,n);X.sfx('pick')};grid.appendChild(b)};
  tile(0,slot==='hat'||slot==='tool'?'None':'Off');
  ITEMS[slot].forEach((it,i)=>tile(i+1,it[0]));
  const cur=myKit[si],it=cur?ITEMS[slot][cur-1]:null;
  $('kitDesc').innerHTML=it?'<b>'+X.esc(it[0])+'</b>'+X.esc(it[3]):'<b>'+(slot==='hat'?'No hat':slot==='tool'?'The plain blaster':'Nothing extra')+'</b>'+(slot==='hat'?'Just the visor, as usual.':slot==='tool'?'Tagging works the same with every tool: it is only the look.':'Catching someone looks the same as always.');
  $('kitPlay').hidden=!(slot==='splash'||slot==='caught')||!cur;
}
function wear(slot,n){
  const si=SLOTS.indexOf(slot);if(si<0||(n&&!valid(slot,n)))return;
  myKit=myKit.slice();myKit[si]=n;X.store.set('kit',wire(myKit));
  if(UI.ent)dress(UI.ent.av);if(X.me)dress(X.me.av);publish();renderTab();
  if(n&&(slot==='splash'||slot==='caught'))demo(slot);
}
// show an effect on the model: the splash at its feet, or the caught animation on a hider-coloured copy of it
function demo(slot){
  const e=UI.ent;if(!e)return;const k=myKit,p=e.pos.clone();p.y+=X.heightOf(e)*.55;
  if(slot==='splash'&&k[2])splash(p,k[2]);
  if(slot==='caught'&&k[3]&&UI.demoT<=0){e.av.setSeeker(false);caught(e,k[3]);e.av.setSeeker(true);e.av.root.visible=false;UI.demoT=1.15}
}
function openKit(){
  if(UI.open||X.G.mode!=='menu'||!X.MAP||!X.kitOn())return;
  buildUI();UI.open=true;UI.auto=true;UI.yaw=0;
  const at=X.MAP.attract||[X.MAP.spawns[0][0],X.MAP.spawns[0][1],0];
  const aw=X.ents.get('aw');if(aw)aw.av.root.visible=false;
  const e=X.makeEnt({id:'kitp',name:'',shape:X.myShape,size:X.mySize});e.kitPreview=true;e.pos.set(at[0],0,at[1]);e.yaw=at[2]||0;e.aimPitch=.1;e.av.setSeeker(true);dress(e.av);UI.ent=e;
  $('menu').hidden=true;$('kit').hidden=false;renderTab();
  setTimeout(()=>{const b=$('kit').querySelector('.ktabs button[aria-pressed="true"]');if(b&&!X.isTouch)b.focus()},0);
}
function closeKit(){
  if(!UI.open)return;UI.open=false;UI.drag=null;UI.demoT=0;
  if(UI.ent){X.removeEnt(UI.ent);UI.ent=null}
  const aw=X.ents.get('aw');if(aw)aw.av.root.visible=true;
  $('kit').hidden=true;if(X.G.mode==='menu')$('menu').hidden=false;
  const b=$('kitOpen');if(b&&!X.isTouch)b.focus();
}
// the kit screen's camera: round the model, which sits in the part of the screen the card leaves free
function cam(camera){
  if(!UI.open||!UI.ent)return false;
  const e=UI.ent,c=X.canvas,w=c.clientWidth,h=c.clientHeight,r=$('kit').querySelector('.kcard').getBoundingClientRect();
  if(r.width>=w-2)camera.setViewOffset(w,h,0,Math.max(0,(h-r.top)/2),w,h);else camera.setViewOffset(w,h,Math.max(0,(r.width+14)/2),0,w,h);
  const hh=X.heightOf(e),port=r.width>=w-2,f=UI.look;
  if(f){X.placeCam(new V3(e.pos.x,e.pos.y+hh*f[0],e.pos.z),e.yaw+Math.PI+UI.yaw,f[1],f[2],0);return true}   // tests: a closer look
  X.placeCam(new V3(e.pos.x,e.pos.y+hh*.6,e.pos.z),e.yaw+Math.PI+UI.yaw,-.12,(port?2.5:1.85)*Math.max(.8,hh/1.08),0);
  return true;
}

// =====================================================================
//  Every frame, and when kitOn() may have changed
// =====================================================================
const _w=new V3(),_sph=new THREE.Sphere();
function frame(dt){
  if(anims.length)tickAnims(dt);
  if(UI.open){
    if(X.G.mode!=='menu'||!X.kitOn())closeKit();
    else{if(UI.auto)UI.yaw+=dt*.4;if(UI.demoT>0){UI.demoT-=dt;if(UI.demoT<=0&&UI.ent)UI.ent.av.root.visible=true}}
  }
  // your own hat and tool never cover your view: each is hidden while the camera is pulled in close to it, or while
  // it would come within 2.5% of the screen's width of the crosshair (its bounding ball, so a little before it would)
  const me=X.me,ck=me&&me.av.ck;
  if(ck&&(ck.hat||ck.tool)){
    const cam=X.camera,cp=cam.position,W=X.canvas.clientWidth||1,H=X.canvas.clientHeight||1,tf=Math.tan(cam.fov*Math.PI/360);
    for(const m of [ck.hat,ck.tool]){if(!m)continue;
      _sph.copy(m.geometry.boundingSphere).applyMatrix4(m.matrixWorld);const d=_sph.center.distanceTo(cp);let hide=d-_sph.radius<.6;
      if(!hide){_w.copy(_sph.center).project(cam);if(_w.z<1){const rpx=_sph.radius/(d*tf)*H/2;hide=Math.hypot(_w.x*W/2,_w.y*H/2)-rpx<.025*W}}
      if(m.visible===hide)m.visible=!hide}
  }
}
// what this player's node says it wears is Net.ktSent (index.html sets it when joining a room); send a change only
function publish(){
  if(!X.Net.refs)return;const s=wire(mine());
  if(s!==(X.Net.ktSent||'')){X.Net.ktSent=s;X.Net.upd({kt:s||null})}
}
function access(){
  const on=X.kitOn();if(on)buildUI();   // a page that only dresses other players never builds the screen
  if(UI.built)$('kitBtnRow').hidden=!on;
  if(!on&&UI.open)closeKit();
  if(X.me)dress(X.me.av);
  publish();
}
redressAll();

return{dress,undress,found,frame,cam,access,wire:()=>wire(mine()),
  // for tests (index.html's __cf hook, automated browsers only)
  test:{ITEMS,SLOTS,get kit(){return myKit.slice()},wear,openKit,closeKit,demo,splash,caught,hatGeo,toolGeo,HEAD,KMAT,UI,anims,renderThumb}};
};
