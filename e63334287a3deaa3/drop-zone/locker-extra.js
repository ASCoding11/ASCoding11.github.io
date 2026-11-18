/*
 * Driftfall: the Locker's extras. HIDDEN (captains only for now, like the Locker itself).
 *
 * index.html fetches this file only when something needs it: the Locker is on for this player (lockerOn: a captain's
 * account, LOCKER_PUBLIC or the test address), or another player arrives wearing an extra (`lx` in their node). Players
 * with the Locker off who never meet a dressed captain never load it. The page calls window.DriftfallExtra(G) once, where
 * G is the short list of things it lends (LXAPI in index.html), and gets back the hooks it calls (look for `LX` there):
 *   dress(e)            put on what an entity wears (its glider, its gun skin; its trail and build skin are read when used)
 *   tick(dt)            every frame: glider trails, moving gliders
 *   gunReset, gunIM, gunDone   held weapons with a gun skin, drawn by one more instanced mesh per kind of weapon
 *   bsOf(owner), bsk(mesh, i, bs), bsCol(bs)   build skins: whose skin a new piece takes, writing it, its splinters' colour
 *   menu(on), shown(), stage(dt, model, yaw)  the Locker's tabs and its stage
 *   botLx(i)            what a practice bot wears while the Locker is on (so every item can be seen in a match)
 *
 * What someone wears is one short string (index.html's lxOf): a letter per slot and the item's number, 'g12t3w5b2'.
 * The numbers are the `no` of Driftfall's items in ../cosmetics.js (GAME_ITEMS, game 'drop-zone'), which also holds their
 * names and descriptions; the lists below are in number order and say what each LOOKS like. A number this file does not
 * know draws the standard look, so an older copy copes with newer items. Never reorder a list: add new ones at the end,
 * and add the item with the same number to cosmetics.js.
 *
 * Everything is looks only. Nothing here reads or writes the physics, hit areas, speeds, damage, health or the room:
 *   gliders: the hit areas and the glide never look at the glider's model; each is built round the same two handles;
 *   gun skins: only the weapon's body changes colour; its orange toy tip (where the muzzle flash starts), its sights and
 *     lenses, its shape, the rarity band and the reticle are untouched;
 *   build skins: only the picture on a piece changes; every skin is as solid-looking (opaque) as plywood, glass is frosted,
 *     and a piece's health, size and the damage darkening are the same;
 *   trails: drawn behind the player only while falling or gliding, and they fade out close to any camera.
 */
window.DriftfallExtra=function(G){
'use strict';
const THREE=G.THREE,V3=THREE.Vector3;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const TAU=Math.PI*2;
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}

// =====================================================================
//  The catalogue (names here are for the Locker's cards; ../cosmetics.js holds the same items by number)
// =====================================================================
const GLIDER_NAMES=['Umbrella','Paper Airplane','Hang Glider','Kite','Bedsheet Parachute','Trash Bag Parachute','Cardboard Wings','Dragon Wings',
  'Bat Wings','Bunch of Balloons','Lawn Chair with Balloons','Magic Carpet','Picnic Blanket','Surfboard','Pizza Slice','Broomstick','Giant Leaf',
  'Spinning Maple Seed','Rubber Duck Float','Giant Pigeon','Pterodactyl','Flying Squirrel Suit','UFO Disc','Small Cloud'];
const TRAIL_NAMES=['Smoke','Sparkles','Rainbow','Feathers','Leaves','Bubbles'];
const WRAP_NAMES=['Gold','Chrome','Wood Grain','Forest Camo','Desert Camo','Arctic Camo','Pixel Camo','Neon Outline','Toy Blaster','Cardboard',
  'Candy Cane','Lava','Ice','Galaxy','Rust','Graffiti','Bubblegum Pink','Hazard Stripes','Plastic Brick'];
const BUILD_NAMES=['Cardboard','Frosted Glass','Ice','Candy','Stone','Scrap Metal'];
const PACK_NAMES=['Rucksack','Jetpack','Teddy Bear','Tortoise Shell','Treasure Chest','Lunchbox','Guitar Case','Fishbowl'];
const EMOTE_NAMES=['Wave','Dance','Clap','Jumping Jacks','Robot','Twirl'],VICTORY_NAMES=['Champion','Flex','Take a Bow','Jump for Joy'];
const SLOT={g:GLIDER_NAMES,t:TRAIL_NAMES,w:WRAP_NAMES,b:BUILD_NAMES,p:PACK_NAMES,e:EMOTE_NAMES,v:VICTORY_NAMES};
// a worn string ('g12t3') as {g:12,t:3}; numbers this file does not know are left out
function parse(s){const o={};if(typeof s!=='string')return o;for(const m of s.matchAll(/([a-z])([0-9]+)/g)){const L=SLOT[m[1]],n=+m[2];if(L&&n>=1&&n<=L.length)o[m[1]]=n}return o}
function str(o){let s='';for(const k of 'gtwbpve')if(o[k])s+=k+o[k];return s}

// =====================================================================
//  Gliders
// =====================================================================
// Each glider is one merged mesh with vertex colours, like the standard one, in the same frame: its origin is between
// the two handles, which are where the hands are (x ±0.48, at the origin), y up, -z forward; the head is just under the
// origin between the hands, so nothing but the handles and struts comes below y 0.62 within half a metre of the middle.
// The standard wing is about 3.9 wide and sits 1 above the handles; these stay within about 4.2 wide and 2.7 high.
// A part can move (gan, read by the material's vertex shader, on the clock gT): 1 spin about the upright through the
// handles (a, rad/s), 2 or 6 a wing flapping about a hinge a from the middle (amplitude b; 2 quick, 6 slow), 3 bobbing
// (a metres, b phase), 4 rippling like cloth (a metres). One draw call a glider, as before.
const UP=new V3(0,1,0);
const nonIdx=g=>g.index?g.toNonIndexed():g;
const PR={box:G.UNIT_BOX,rbox:G.ROUND_LO,sph:nonIdx(new THREE.SphereGeometry(.5,10,7)),slo:nonIdx(new THREE.SphereGeometry(.5,7,5)),
  cyl:nonIdx(new THREE.CylinderGeometry(.5,.5,1,6)),cyl8:nonIdx(new THREE.CylinderGeometry(.5,.5,1,10)),cone:nonIdx(new THREE.ConeGeometry(.5,1,8)),
  tor:nonIdx(new THREE.TorusGeometry(.95,.32,8,22).rotateX(Math.PI/2))};
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new V3(),_p=new V3(),_v=new V3(),_n=new V3(),_nm=new THREE.Matrix3(),_c=new THREE.Color(),_c2=new THREE.Color();
let AN=null,NSH=null;   // the motion for parts added now ([kind, a, b] or a function of the point), a shade by the normal
const anim=(t,a,b)=>{AN=t?[t,a||0,b||0]:null};
function Kit(){return{p:[],n:[],c:[],a:[]}}
function anAt(x,y,z){if(!AN)return [0,0,0];return typeof AN==='function'?AN(x,y,z):AN}
function vert(B,x,y,z,nx,ny,nz,hex){B.p.push(x,y,z);B.n.push(nx,ny,nz);_c.setHex(hex);if(NSH){const k=NSH(nx,ny,nz);_c.multiplyScalar(k)}B.c.push(_c.r,_c.g,_c.b);const a=anAt(x,y,z);B.a.push(a[0],a[1],a[2])}
function addG(B,geo,m,hex){const pos=geo.attributes.position,nor=geo.attributes.normal;_nm.getNormalMatrix(m);
  for(let i=0;i<pos.count;i++){_v.fromBufferAttribute(pos,i).applyMatrix4(m);_n.fromBufferAttribute(nor,i).applyMatrix3(_nm).normalize();vert(B,_v.x,_v.y,_v.z,_n.x,_n.y,_n.z,hex)}}
function put(B,geo,x,y,z,sx,sy,sz,hex,rx,ry,rz){_e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);_m.compose(_p.set(x,y,z),_q,_s.set(sx,sy,sz));addG(B,geo,_m,hex)}
// a round bar from a to b
function bar(B,ax,ay,az,bx,by,bz,r,hex,geo){const d=new V3(bx-ax,by-ay,bz-az),L=d.length();if(L<1e-5)return;_q.setFromUnitVectors(UP,d.divideScalar(L));
  _m.compose(_p.set((ax+bx)/2,(ay+by)/2,(az+bz)/2),_q,_s.set(r*2,L,r*2));addG(B,geo||PR.cyl,_m,hex)}
const rope=(B,ax,ay,az,bx,by,bz,hex)=>bar(B,ax,ay,az,bx,by,bz,.014,hex||0x6b5a46);
// one triangle, both sides (the back takes `back`, or the front colour a little darker)
function tri2(B,a,b,c,hex,back){const ab=new V3().subVectors(b,a),ac=new V3().subVectors(c,a),n=new V3().crossVectors(ab,ac).normalize();
  for(const v of [a,b,c])vert(B,v.x,v.y,v.z,n.x,n.y,n.z,hex);const bh=back!=null?back:dim(hex,.8);
  for(const v of [a,c,b])vert(B,v.x-n.x*.006,v.y-n.y*.006,v.z-n.z*.006,-n.x,-n.y,-n.z,bh)}
const dim=(hex,k)=>_c2.setHex(hex).multiplyScalar(k).getHex();
// A sheet over u, v in 0..1 (nu x nv quads): f(u,v) gives the point, col(u,v,i,j) the colour of each quad (taken at its
// middle, so patterns are crisp), back(u,v,i,j) the underside's colour. Normals come from f itself (smooth), facing `out`
// (a function of the point, or up), and the sheet is drawn on both sides, the back a few millimetres under the front.
function sheet(B,nu,nv,f,col,back,out){
  const P=[],N=[],e=1e-3,o=new V3(),du=new V3(),dv=new V3();
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const u=i/nu,v=j/nv,p=new V3(...f(u,v));
    du.set(...f(Math.min(1,u+e),v)).sub(new V3(...f(Math.max(0,u-e),v)));dv.set(...f(u,Math.min(1,v+e))).sub(new V3(...f(u,Math.max(0,v-e))));
    const n=new V3().crossVectors(du,dv);if(n.lengthSq()<1e-12)n.set(0,1,0);n.normalize();
    if(out)o.copy(out(p,u,v));else o.set(0,1,0);if(n.dot(o)<0)n.negate();P.push(p);N.push(n)}
  const at=(i,j)=>j*(nu+1)+i;
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const uc=(i+.5)/nu,vc=(j+.5)/nv,hx=col(uc,vc,i,j),bh=back?back(uc,vc,i,j):dim(hx,.78);
    const q=[at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1)];
    for(const t of [[q[0],q[1],q[2]],[q[0],q[2],q[3]]]){
      // wind each triangle so its front faces the way its normals do
      const a=P[t[0]],b=P[t[1]],c=P[t[2]],gn=new V3().subVectors(b,a).cross(new V3().subVectors(c,a));
      const nn=new V3().add(N[t[0]]).add(N[t[1]]).add(N[t[2]]);const k=gn.dot(nn)<0?[t[0],t[2],t[1]]:t;
      for(const x of k){const p=P[x],n=N[x];vert(B,p.x,p.y,p.z,n.x,n.y,n.z,hx)}
      for(const x of [k[0],k[2],k[1]]){const p=P[x],n=N[x];vert(B,p.x-n.x*.006,p.y-n.y*.006,p.z-n.z*.006,-n.x,-n.y,-n.z,bh)}
    }}
}
// turns everything added since `st` about the upright through the origin
function rotY(B,st,a){const c=Math.cos(a),s=Math.sin(a);for(let i=st;i<B.p.length;i+=3){for(const A of [B.p,B.n]){const x=A[i],z=A[i+2];A[i]=c*x+s*z;A[i+2]=-s*x+c*z}}}
const SURF=1.35;   // the surf stance: the body turned this far, the board turned back the other way so it still points ahead
function kitGeo(B){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(B.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(B.n,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(B.c,3));g.setAttribute('gan',new THREE.Float32BufferAttribute(B.a,3));g.computeBoundingSphere();g.computeBoundingBox();return g}

const DK=0x2a2d34,MT=0x5a606b,SIL=0xb8c0c8,WH=0xf6f4ee;
// the two handles every glider is held by (the standard one's), and a strut from each up to a point (x is mirrored)
function grips(B,hex){const a=AN;AN=null;for(const s of [-1,1])put(B,PR.rbox,s*.48,0,0,.067,.19,.067,hex||DK);AN=a}
function struts(B,x,y,z,hex,r){const a=AN;AN=null;for(const s of [-1,1])bar(B,s*.48,.09,0,s*x,y,z,r||.022,hex||MT);AN=a}
// a dome or cone made from a sheet: radius r(v) and height y(v) from the middle (v 0) to the rim (v 1)
const polar=(r,y,cx,cz)=>(u,v)=>[(cx||0)+Math.cos(u*TAU)*r(v),y(v,u),(cz||0)+Math.sin(u*TAU)*r(v)];
const outward=(cx,cy,cz)=>p=>new V3(p.x-cx,p.y-cy,p.z-cz);
// a wing of membrane: from a hinge, fingers out to tips, the skin between scalloped toward the hinge
function membrane(B,root,joint,tips,scallop,hex,bone,boneR){
  const pts=[root,...tips];
  for(let i=0;i<tips.length-1;i++){const a=tips[i],b=tips[i+1],mid=a.clone().add(b).multiplyScalar(.5).lerp(joint,scallop);
    tri2(B,joint,a,mid,hex);tri2(B,joint,mid,b,hex)}
  tri2(B,root,joint,tips[0],hex);tri2(B,root,tips[tips.length-1],joint,hex);
  if(bone!=null){bar(B,root.x,root.y,root.z,joint.x,joint.y,joint.z,boneR*1.4,bone);for(const t of tips)bar(B,joint.x,joint.y,joint.z,t.x,t.y,t.z,boneR,bone)}
  return pts;
}
const v3=(x,y,z)=>new V3(x,y,z);
function balloon(B,x,y,z,hex,i,tx,ty,tz){
  const amp=.07,ph=i*1.7;AN=(px,py)=>[3,amp*clamp((py-ty)/(y-ty),0,1),ph];
  put(B,PR.slo,x,y,z,.46,.56,.46,hex);put(B,PR.cone,x,y-.31,z,.08,.08,.08,dim(hex,.8),Math.PI);put(B,PR.slo,x-.1,y+.12,z-.12,.1,.14,.06,dim(hex,1.35));
  bar(B,x,y-.34,z,tx,ty,tz,.008,0xeeeeee);AN=null;
}
const BALLOON_COLS=[0xff4f5e,0xffc93c,0x3fa9f5,0x5fd068,0xb46cff,0xff8a3d,0xff6fb5,0x3ee6d0];
// Where the body is in a glider's frame (its origin is GLIDE_Y up the body, between the standard handles): the head round
// (0, 0.03, 0), the shoulders at (±0.36, -0.38, 0), the hips at y -0.9 and the soles at y -1.76; a hand reaches 0.56 from
// its shoulder. A glider the body stands or sits on is built under the feet or the hips.
const FEET=-1.7,HIP=-.92,SH=-.38;
// a flat board under the feet (a sheet with a rim): f(u,v) gives x, z; col the top's colours; thick, its depth
function board(B,nu,nv,f,col,under,thick,ripple){
  if(ripple)AN=(x,y,z)=>[4,ripple*Math.max(0,Math.abs(z)-.5),0];
  sheet(B,nu,nv,(u,v)=>{const p=f(u,v);return [p[0],FEET+(p[2]||0),p[1]]},col,under);
  sheet(B,nu,nv,(u,v)=>{const p=f(u,v);return [p[0],FEET+(p[2]||0)-thick,p[1]]},under||(()=>0x777777),col,()=>v3(0,-1,0));
  AN=null;
}
const GLIDERS=[null,
  // 1 Umbrella: held up in the right hand by its crook, red and white panels on dark ribs, a point on top
  B=>{const hx=.33,hy=.14,cx=.3,top=2.0;
    bar(B,hx,hy+.08,-.04,hx,hy-.1,-.04,.03,0x6b3a22,PR.cyl8);bar(B,hx,hy-.1,-.04,hx+.07,hy-.18,-.04,.028,0x6b3a22);bar(B,hx+.07,hy-.18,-.04,hx+.14,hy-.1,-.04,.026,0x6b3a22);   // the crook
    bar(B,hx,hy+.08,-.04,cx,top,0,.022,DK);put(B,PR.cone,cx,top+.12,0,.05,.22,.05,DK);
    sheet(B,32,7,polar(v=>1.6*v,(v,u)=>top-.66*v*v-.07*Math.pow(v,5)*Math.abs(Math.sin(u*Math.PI*8)),cx,0),(u)=>Math.floor(u*8)%2?0xe23d3d:WH,(u)=>Math.floor(u*8)%2?0xb52f2f:0xd8d6d0,outward(cx,1.0,0));
    for(let k=0;k<8;k++){const a=k/8*TAU,x=Math.cos(a)*1.6,z=Math.sin(a)*1.6;bar(B,cx+x*.5,top-.66*.25-.02,z*.5,cx+x,top-.66-.02,z,.011,DK);bar(B,cx,top-.6,0,cx+x*.5,top-.66*.25-.02,z*.5,.009,0x8a8f98);put(B,PR.slo,cx+x,top-.68,z,.06,.06,.06,DK)}},
  // 2 Paper Airplane: a folded dart of ruled notebook paper, nose forward, held up by a paper loop under the fold
  B=>{const N=v3(0,.98,-2.1),T=v3(0,1.0,1.3),K=v3(0,.5,1.2),Kn=v3(0,.9,-1.9);
    for(const s of [-1,1]){const W=v3(s*1.85,1.16,1.3);
      sheet(B,6,24,(u,v)=>{const a=N.clone().lerp(T,v),b=N.clone().lerp(W,v);const p=a.lerp(b,u);return [p.x,p.y,p.z]},(u,v,i,j)=>i===0?0xe8a0a0:(j%3===1?0x9cc3ea:0xfbfbf6),(u,v,i,j)=>j%3===1?0x8fb2d6:0xe9e7dd);
      sheet(B,2,12,(u,v)=>{const a=Kn.clone().lerp(T,v),b=Kn.clone().lerp(K,v);const p=a.lerp(b,u);p.x+=s*.012;return [p.x,p.y,p.z]},()=>0xefede4,()=>0xe2dfd2,()=>v3(s,0,0))}
    for(const s of [-1,1]){bar(B,s*.03,.6,-.1,s*.24,.2,-.06,.018,0xefede4);bar(B,s*.24,.2,-.06,s*.24,.12,-.06,.03,0xefede4)}},
  // 3 Hang Glider: a delta sail in bands of white, red, yellow and blue on a keel; you hang flat under it holding the A-frame
  B=>{const nose=v3(0,1.22,-1.4),tr=v3(0,1.12,.8);
    for(const s of [-1,1]){const tip=v3(s*2.05,1.02,.62);
      sheet(B,8,10,(u,v)=>{const p=nose.clone().lerp(tr.clone().lerp(tip,u),v);p.y-=.14*Math.sin(Math.PI*u)*v;return [p.x,p.y,p.z]},(u,v)=>v<.35?WH:v<.6?0xe8453c:v<.8?0xffcc33:0x2f6fd6);
      bar(B,nose.x,nose.y,nose.z,tip.x,tip.y,tip.z,.025,MT);
      bar(B,0,1.05,-.15,s*.44,-.05,-.12,.02,SIL);put(B,PR.rbox,s*.44,-.05,-.12,.067,.19,.067,0x3a3f48)}
    bar(B,nose.x,nose.y-.04,nose.z,tr.x,tr.y-.04,tr.z,.03,MT);bar(B,-1.05,1.08,-.2,1.05,1.08,-.2,.02,MT)},
  // 4 Kite: a diamond in four colours on crossed sticks, flown on two lines, with a tail of bows streaming behind
  B=>{const a=.6,K3=(u,v)=>v3(u,1.5-v*Math.sin(a),v*Math.cos(a)),C=K3(0,0),pts=[K3(0,-1.5),K3(1.2,-.22),K3(0,1.4),K3(-1.2,-.22)],cols=[0xe8453c,0xffcc33,0x2f8fd6,0x4cc05a];
    for(let i=0;i<4;i++)tri2(B,C,pts[i],pts[(i+1)%4],cols[i]);
    bar(B,pts[0].x,pts[0].y-.02,pts[0].z,pts[2].x,pts[2].y-.02,pts[2].z,.02,0x9a6a3c);bar(B,pts[1].x,pts[1].y-.02,pts[1].z,pts[3].x,pts[3].y-.02,pts[3].z,.02,0x9a6a3c);
    for(const s of [-1,1]){rope(B,s*.38,.12,-.06,C.x,C.y-.25,C.z-.6,0xf4f0e6);rope(B,s*.38,.12,-.06,0,C.y-.5,C.z+.5,0xf4f0e6);put(B,PR.cyl8,s*.38,.12,-.06,.06,.12,.06,0x9a6a3c,0,0,Math.PI/2)}
    const tl=pts[2];AN=(x,y,z)=>[4,.14*clamp((z-tl.z)/1.5,0,1),0];
    for(let k=0;k<7;k++){const z0=tl.z+k*.24,z1=z0+.24,y0=tl.y-k*.1,y1=y0-.1;bar(B,0,y0,z0,0,y1,z1,.008,0xeeeeee);if(k%2)for(const s of [-1,1])put(B,PR.box,s*.06,y1,z1,.12,.03,.07,cols[k%4],0,s*.5,0)}
    AN=null},
  // 5 Bedsheet Parachute: a pale blue sheet with little white flowers and a white hem, its corners knotted round your fists
  B=>{AN=(x,y,z)=>[4,.06*Math.pow(Math.max(Math.abs(x),Math.abs(z))/1.3,3),0];
    sheet(B,14,14,(u,v)=>{const x=(u-.5)*2.6,z=(v-.5)*2.6;return [x,1.72-.5*(x*x+z*z)/3.4,z]},(u,v,i,j)=>i===0||j===0||i===13||j===13?WH:((i*3+j*2)%7===0?0xffffff:0x9fd0f0),(u,v,i,j)=>i===0||j===0||i===13||j===13?0xe6e6e0:0x86b8d8,outward(0,0,0));
    AN=null;const cy=1.72-.5*3.38/3.4;
    for(const sx of [-1,1]){for(const sz of [-1,1])rope(B,sx*1.3,cy,sz*1.3,sx*.4,.16,0,0xdfe9f0);put(B,PR.slo,sx*.4,.16,0,.13,.11,.13,0xdfe9f0)}},
  // 6 Trash Bag Parachute: a crinkly black bag, its yellow drawstring tied at the top, its cords twisted round your fists
  B=>{const r=rng(66);const sh=[];for(let i=0;i<200;i++)sh.push(.8+r()*.45);
    AN=(x,y,z)=>[4,.05*clamp((1.6-y)/.6,0,1),0];
    sheet(B,18,6,polar(v=>.12+1.45*v,(v,u)=>1.85-.62*v*v+.03*Math.sin(u*40)*v),(u,v,i,j)=>dim(0x3a3e45,sh[(i*7+j*3)%200]),(u,v,i,j)=>0x22252a,outward(0,.9,0));
    AN=null;put(B,PR.slo,0,1.92,0,.22,.18,.22,0x2c3036);put(B,PR.box,0,2.02,0,.32,.04,.06,0xffd23f,0,.4,0);put(B,PR.box,0,2.02,0,.3,.04,.06,0xffd23f,0,-.5,0);
    for(let k=0;k<6;k++){const a=(k+.5)/6*TAU,x=Math.cos(a)*1.57,z=Math.sin(a)*1.57;rope(B,x,1.85-.62,z,x>0?.4:-.4,.16,0,0x8a8a8a)}
    for(const s of [-1,1])put(B,PR.slo,s*.4,.16,0,.12,.12,.12,0x2c3036)},
  // 7 Cardboard Wings: two cut-out wings of brown box card taped along your arms, spread wide, flapping a little
  B=>{const sh=[[.3,0],[1.15,.02],[1.95,-.12],[1.85,-.3],[1.65,-.36],[1.5,-.5],[1.25,-.52],[1.05,-.66],[.8,-.62],[.55,-.7],[.3,-.6]];
    NSH=(nx,ny,nz)=>Math.abs(nz)>.5?1:.7;
    for(const s of [-1,1]){anim(7,.36,.08);const shp=new THREE.Shape(sh.map(p=>new THREE.Vector2(s*p[0],p[1])));const g=new THREE.ExtrudeGeometry(shp,{depth:.035,bevelEnabled:false});g.translate(0,SH+.08,.06);addG(B,nonIdx(g),_m.identity(),0xc69a62);g.dispose();
      for(const x of [.5,.8])put(B,PR.box,s*x,SH,.04,.1,.16,.14,0xd8c79a);put(B,PR.box,s*1.35,SH-.12,.1,.5,.03,.012,0x8a6a42);put(B,PR.box,s*1.0,SH-.3,.1,.4,.03,.012,0x8a6a42);anim(0)}
    NSH=null},
  // 8 Dragon Wings: green membrane on ivory bones along your arms and out past your hands, a claw at each wrist
  B=>{for(const s of [-1,1]){anim(7,.36,.12);const j=v3(s*1.0,SH+.02,.1);
      membrane(B,v3(s*.3,SH-.02,.12),j,[v3(s*1.95,SH+.35,.12),v3(s*2.05,SH-.15,.12),v3(s*1.7,SH-.55,.12),v3(s*1.2,SH-.68,.12),v3(s*.55,HIP+.05,.12)],.3,0x2f9e6a,0xe8d8a8,.022);
      put(B,PR.cone,j.x+s*.02,j.y+.12,j.z,.06,.2,.06,0xe8d8a8);put(B,PR.box,s*.62,SH,.06,.2,.12,.14,0x23704b);anim(0)}
    for(let k=0;k<4;k++)put(B,PR.cone,0,SH+.12-k*.18,.24,.1,.16,.1,0xffc93c,-Math.PI/2+.4)},
  // 9 Bat Wings: dark purple skin on thin black fingers along your arms, deep scallops, quick little flaps
  B=>{for(const s of [-1,1]){anim(7,.36,.16);const j=v3(s*.95,SH+.02,.1);
      membrane(B,v3(s*.3,SH-.02,.12),j,[v3(s*1.75,SH+.25,.12),v3(s*1.85,SH-.1,.12),v3(s*1.6,SH-.42,.12),v3(s*1.2,SH-.55,.12),v3(s*.8,SH-.55,.12),v3(s*.5,HIP+.08,.12)],.42,0x5b3f86,0x241a33,.016);
      put(B,PR.box,s*.62,SH,.06,.2,.1,.13,0x3a2b52);anim(0)}},
  // 10 Bunch of Balloons: eleven bright balloons, their strings gathered in your raised hands
  B=>{const r=rng(10);for(const s of [-1,1])put(B,PR.slo,s*.27,.15,-.04,.07,.07,.07,0xeeeeee);
    for(let i=0;i<11;i++){const a=i/11*TAU+r(),d=.3+r()*.75,x=Math.cos(a)*d,z=Math.sin(a)*d*.8,y=1.25+r()*.85+(1.1-d)*.4;balloon(B,x,y,z,BALLOON_COLS[i%8],i,x<0?-.27:.27,.17,-.04)}},
  // 11 Lawn Chair with Balloons: a folding chair with green and white webbing that you sit in, hung under a bunch of balloons
  B=>{const r=rng(11),y=HIP-.06,z0=-.36,z1=.16,bt=SH+.15;
    for(const s of [-1,1]){const x=s*.42;bar(B,x,y,z0,x,y,z1,.022,SIL);bar(B,x,y,z0,x,y-.5,z0-.06,.022,SIL);bar(B,x,y,z1,x,y-.5,z1+.08,.022,SIL);bar(B,x,y,z1,x,bt,z1+.14,.022,SIL);bar(B,s*.45,y+.22,z0,s*.45,y+.22,z1,.03,SIL);bar(B,s*.45,y+.22,z0,x,y,z0,.02,SIL)}
    bar(B,-.42,y,z0,.42,y,z0,.02,SIL);bar(B,-.42,bt,z1+.14,.42,bt,z1+.14,.02,SIL);
    for(let k=0;k<5;k++){put(B,PR.box,0,y+.012,z0+.05+k*.1,.82,.012,.075,k%2?WH:0x3faa5c);const t=k/5+.1,yy=y+(bt-y)*t,zz=z1+.14*t;put(B,PR.box,0,yy,zz+.02,.82,.08,.012,k%2?WH:0x3faa5c,-.2)}
    for(let i=0;i<9;i++){const a=i/9*TAU+r(),d=.25+r()*.55,x=Math.cos(a)*d,z=.3+Math.sin(a)*d*.7,yy=1.25+r()*.6;balloon(B,x,yy,z,BALLOON_COLS[(i+3)%8],i,x*.3,bt,z1+.14)}},
  // 12 Magic Carpet: a red carpet with a gold border, a blue medallion and gold tassels; you crouch on it, rippling as it flies
  B=>{const W=1.0,L=1.45;
    board(B,10,14,(u,v)=>[(u-.5)*2*W,(v-.5)*2*L,.05*Math.cos((v-.5)*3)],(u,v,i,j)=>{const b=Math.min(i,j,9-i,13-j);if(b===0)return 0xf2c14e;if(b===1)return 0x8a1d2c;const d=Math.abs(u-.5)/.6+Math.abs(v-.5)/.8;return d<.28?0x26408b:d<.36?0xf2c14e:(i+j)%4===0?0xc23a4c:0xb3263a},()=>0x7a1a28,.03,.05);
    AN=(x,y,z)=>[4,.05*Math.max(0,Math.abs(z)-.5),0];for(let k=-4;k<=4;k++)for(const s of [-1,1])put(B,PR.cone,k*W/4.5,FEET-.02,s*(L+.08),.05,.14,.05,0xf2c14e,s*Math.PI/2);AN=null},
  // 13 Picnic Blanket: red and white gingham with the picnic basket; you crouch on it, its corners flapping
  B=>{board(B,16,16,(u,v)=>[(u-.5)*2.3,(v-.5)*2.3,.08*Math.pow(Math.max(Math.abs(u-.5),Math.abs(v-.5))*2,3)],(u,v,i,j)=>{const k=(i>>1&1)+(j>>1&1);return k===0?WH:k===1?0xf09090:0xd93b3b},(u,v,i,j)=>((i>>1&1)+(j>>1&1))===2?0xb83030:0xe0d8d0,.02,.06);
    put(B,PR.box,.62,FEET+.13,.55,.46,.24,.32,0xb07a3c);put(B,PR.box,.62,FEET+.26,.55,.5,.03,.36,0x8a5a2a);bar(B,.44,FEET+.26,.55,.62,FEET+.44,.55,.02,0x8a5a2a);bar(B,.8,FEET+.26,.55,.62,FEET+.44,.55,.02,0x8a5a2a);
    put(B,PR.slo,-.6,FEET+.06,.6,.16,.12,.16,0xe8453c);put(B,PR.cyl8,-.66,FEET+.06,-.6,.12,.12,.12,0xf2f2f2)},
  // 14 Surfboard: a real board (pointed nose with rocker, squared tail with a kick, rails, a teal stripe, an orange nose band,
  // three fins); you ride it in a surf stance, turned side on, feet along the board, knees bent, arms out
  B=>{const st=B.p.length,L=3.0,hw=v=>v<.5?.5*Math.pow(Math.sin(v/.5*Math.PI/2),.75):.5-.13*Math.pow((v-.5)/.5,2),
      rk=v=>(v<.3?.34*Math.pow(1-v/.3,2):0)+(v>.82?.07*Math.pow((v-.82)/.18,2):0),P=(u,v,dy)=>[(u-.5)*2*hw(v),FEET-.02+rk(v)+dy,(v-.53)*L];
    const top=(u,v,i,j)=>Math.abs(u-.5)<.07?0x1aa7a0:(j===2||j===3)?0xff8a3d:Math.abs(u-.5)<.12?0xd6f2ef:WH;
    sheet(B,8,24,(u,v)=>P(u,v,0),top,()=>0xdfe8e8);sheet(B,8,24,(u,v)=>P(u,v,-.075),()=>0xe8eeee,()=>WH,()=>v3(0,-1,0));
    for(const e of [0,1])sheet(B,1,24,(t,v)=>{const a=P(e,v,0),b=P(e,v,-.075);return [a[0],a[1]+(b[1]-a[1])*t,a[2]]},()=>0x1aa7a0,()=>0x1aa7a0,p=>v3(p.x,0,0));
    tri2(B,v3(0,FEET-.09,1.0),v3(0,FEET-.36,1.2),v3(0,FEET-.09,1.32),0x1aa7a0);for(const s of [-1,1])tri2(B,v3(s*.26,FEET-.09,1.02),v3(s*.3,FEET-.24,1.18),v3(s*.28,FEET-.09,1.24),0x1aa7a0);
    rotY(B,st,-SURF)},
  // 15 Pizza Slice: cheese, pepperoni and a crust; you crouch on it, the tip drooping forward
  B=>{const pep=[[-.35,.25],[.4,.4],[0,-.35],[-.15,.7],[.15,-.85],[.65,.82],[-.7,.8]];
    const P=(u,v)=>{const tip=v3(0,0,-1.5),L=v3(-1.2,0,1.0),R=v3(1.2,0,1.0);return tip.lerp(L.lerp(R,u),v)};
    board(B,10,14,(u,v)=>{const p=P(u,v);return [p.x,p.z,-.18*Math.pow(1-v,2)]},(u,v)=>{const p=P(u,v);for(const q of pep)if(Math.hypot(p.x-q[0],p.z-q[1])<.16)return 0xc0392b;return v>.9?0xd89a4a:0xffcf4d},()=>0xe8b363,.05);
    bar(B,-1.2,FEET+.02,1.05,1.2,FEET+.02,1.05,.11,0xc77a2e,PR.cyl8);for(const x of [-.55,.1,.7])put(B,PR.cone,x,FEET-.12,-.2+x*.2,.07,.14,.07,0xffcf4d,Math.PI)},
  // 16 Broomstick: a witch-style broom you sit astride, leaning forward with both hands on the stick: a grained stick with
  // knots and a knob, a red band and twine binding, and a full brush of straw fanning out behind
  B=>{const F=v3(0,-.76,-1.32),Rr=v3(0,-1.07,.6),N=12;
    for(let k=0;k<N;k++){const a=F.clone().lerp(Rr,k/N),b=F.clone().lerp(Rr,(k+1)/N);bar(B,a.x,a.y,a.z,b.x,b.y,b.z,.045,k%2?0x8a5a2e:0x7c4f28,PR.cyl8)}
    for(const t of [.2,.55,.8]){const p=F.clone().lerp(Rr,t);put(B,PR.slo,p.x+.04,p.y+.02,p.z,.05,.04,.06,0x5e3a1c)}
    put(B,PR.slo,F.x,F.y+.02,F.z-.02,.13,.12,.13,0x6e4424);
    const C=Rr.clone();bar(B,0,C.y,C.z-.04,0,C.y-.01,C.z+.16,.13,0xc0392b,PR.cyl8);for(const z of [-.06,.06,.18])bar(B,0,C.y-.005,C.z+z,0,C.y-.005,C.z+z+.02,.135,0x6b4a2a,PR.cyl8);
    const r=rng(16),cols=[0xd9b45a,0xe6c46a,0xc9a248,0xebd27c];
    for(let k=0;k<34;k++){const a=k/34*TAU+r()*.2,rr=k%2?.1:.05,ex=.2+r()*.16;bar(B,Math.cos(a)*rr,C.y+Math.sin(a)*rr*.8,C.z+.1,Math.cos(a)*ex,C.y-.06+Math.sin(a)*ex*.75,C.z+.85+r()*.2,.018,cols[k%4])}
    bar(B,0,C.y-.03,C.z+.1,0,C.y-.07,C.z+.95,.12,0xd9b45a,PR.cyl8)},
  // 17 Giant Leaf: a big green leaf held up by its stalk like a parasol, paler veins, edges curling up
  B=>{bar(B,-.12,.12,-.05,.12,.12,-.05,.035,0x6a8a2a);bar(B,0,.12,-.05,0,1.0,.2,.04,0x6a8a2a);AN=(x,y,z)=>[4,.04*Math.abs(x),0];
    const hw=v=>1.15*Math.pow(Math.sin(Math.PI*v),.8);
    sheet(B,10,18,(u,v)=>{const x=(u-.5)*2*hw(v);return [x,1.1+.28*x*x/1.3-.15*Math.pow(v-.5,2),(v-.6)*3.1]},(u,v)=>{const d=Math.abs(u-.5);if(d<.06)return 0xb5df7a;return (((v*8-d*1.6)%1)+1)%1<.14?0x7cc75a:0x46a64a},()=>0x5fb85d);AN=null},
  // 18 Spinning Maple Seed: a pair of maple keys joined at the seed, their papery wings whirling round over your head like
  // a propeller; you hold the stalk with both hands and turn slowly with it
  B=>{bar(B,-.16,.16,-.04,.16,.16,-.04,.03,0x7a4a2a);bar(B,0,.16,-.04,0,.86,0,.035,0x7a4a2a);
    anim(1,7);for(const s of [-1,1]){put(B,PR.slo,s*.15,.98,0,.34,.28,.4,0x9b4430);put(B,PR.slo,s*.17,1.03,-.06,.14,.1,.16,0xb85c40);
      sheet(B,16,5,(u,v)=>{const w=.22+.36*Math.sin(Math.PI*Math.min(1,u*1.08)),c=(v-.5)*2*w,len=.25+u*1.85;return [s*len,.98+.12*u+s*c*.32,c*.95-.1*u*s]},
        (u,v,i,j)=>j===0||j===4?0xa85a34:(i%3===1&&j>0&&j<4)?0xc88848:u<.18?0xc4643a:u<.45?0xd88a50:0xe6b468,()=>0xd09858)}
    put(B,PR.slo,0,1.0,0,.18,.18,.18,0x6e3a22);anim(0)},
  // 19 Rubber Duck Float: a yellow inflatable duck ring round your middle, head, beak and tail and all, your hands on its rim
  B=>{const y=HIP+.22;put(B,PR.tor,0,y,0,.6,.6,.6,0xffd23f);put(B,PR.sph,0,y+.32,-.72,.42,.42,.42,0xffd23f);put(B,PR.box,0,y+.26,-.96,.18,.06,.16,0xff8a1f);
    for(const s of [-1,1]){put(B,PR.slo,s*.11,y+.39,-.86,.08,.08,.05,WH);put(B,PR.slo,s*.11,y+.39,-.89,.04,.05,.03,0x15171b);put(B,PR.slo,s*.62,y+.08,.1,.12,.2,.4,0xffc21f)}
    put(B,PR.cone,0,y+.2,.7,.24,.34,.24,0xffd23f,-.6)},
  // 20 Giant Pigeon: a grey city pigeon with a shiny green and purple neck that carries you by the shoulders
  B=>{const GR=0x8d96a3,PK=0xd9706a,y=.9;
    for(const s of [-1,1]){bar(B,s*.2,y-.3,.05,s*.3,SH+.12,.02,.035,PK);for(const z of [-.08,.08])bar(B,s*.3,SH+.12,.02,s*.34,SH+.02,z,.018,PK)}
    put(B,PR.sph,0,y,.05,.78,.6,1.2,GR);put(B,PR.sph,0,y+.18,-.62,.5,.52,.5,0x5d8a6e);put(B,PR.sph,0,y+.2,-.55,.46,.46,.42,0x7a5b8f);
    put(B,PR.sph,0,y+.42,-.92,.38,.36,.4,0x9aa3b0);put(B,PR.cone,0,y+.38,-1.18,.08,.18,.08,0x2f3238,-Math.PI/2);put(B,PR.slo,0,y+.44,-1.08,.08,.05,.06,0xf2f2f2);
    for(const s of [-1,1]){put(B,PR.slo,s*.15,y+.47,-1.0,.09,.09,.06,0xff8a1f);put(B,PR.slo,s*.17,y+.47,-1.02,.045,.05,.03,0x15171b)}
    for(const s of [-1,1]){anim(2,.35,.34);sheet(B,8,4,(u,v)=>{const x=s*(.35+u*1.7),z=-.3+v*(.7+.4*u);return [x,y+.12+.08*u-.1*u*u,z]},(u,v)=>u>.78?(v>.3?0x4a505a:0x6a717c):u<.5&&((v>.42&&v<.52)||(v>.66&&v<.76))?0x3a3f47:GR,()=>0x9aa3b0);anim(0)}
    sheet(B,6,3,(u,v)=>{const a=(u-.5)*1.2;return [Math.sin(a)*(.2+v*.7),y-.08*v,.75+Math.cos(a)*(.2+v*.7)]},(u,v,i,j)=>j===2?0x3a3f47:GR,()=>0x9aa3b0)},
  // 21 Pterodactyl: leathery orange wings on long fingers, a long beak and a red crest; it carries you by the shoulders
  B=>{const BR=0xb8743a,y=.85;
    for(const s of [-1,1]){bar(B,s*.15,y-.2,.1,s*.3,SH+.12,.02,.03,0x8a5226);for(const z of [-.07,.07])bar(B,s*.3,SH+.12,.02,s*.34,SH+.03,z,.016,0x3a2a1a)}
    put(B,PR.sph,0,y,.05,.5,.42,1.15,BR);put(B,PR.sph,0,y+.26,-.68,.36,.36,.5,BR);put(B,PR.cone,0,y+.24,-1.22,.16,.8,.16,0xd9a066,-Math.PI/2);put(B,PR.cone,0,y+.4,-.32,.1,.62,.24,0xc0392b,Math.PI/2+.5);
    for(const s of [-1,1])put(B,PR.slo,s*.16,y+.34,-.8,.08,.08,.06,0x15171b);
    for(const s of [-1,1]){anim(6,.22,.24);const j=v3(s*1.15,y+.2,-.2);membrane(B,v3(s*.22,y-.02,.0),j,[v3(s*2.15,y+.1,.1),v3(s*1.3,y-.14,.6),v3(s*.25,y-.06,.55)],.25,0xd18b4d,0x8a5226,.024);anim(0)}
    put(B,PR.cone,0,y-.04,.85,.12,.6,.12,BR,Math.PI/2)},
  // 22 Flying Squirrel Suit: a brown gliding skin from your wrists to your ankles with a cream edge, squirrel ears on top of
  // your head and a big bushy tail curling up behind; you lie flat with your arms and legs spread
  B=>{const ank=-1.62,BR=0xc07a45,CR=0xf2dfc0;AN=(x,y,z)=>[7,.36,.05*Math.min(1,Math.abs(x))];
    for(const s of [-1,1]){sheet(B,6,10,(u,v)=>{const xo=.98-.56*v+.14*Math.sin(Math.PI*v),x=s*(.28+(xo-.28)*u),y=SH+.02+(ank-SH-.02)*v;return [x,y-.05*u*Math.sin(Math.PI*v),.1]},
        (u,v,i,j)=>i===5||j===9?CR:(i===4&&j>1&&j<8)?0xa8683a:BR,()=>CR,()=>v3(0,0,1));
      put(B,PR.slo,s*.95,SH,.06,.15,.13,.15,0xf0c8b0);put(B,PR.slo,s*.42,ank,.08,.15,.12,.15,0xf0c8b0)}AN=null;
    for(const s of [-1,1]){put(B,PR.cone,s*.15,.4,.02,.12,.22,.09,BR);put(B,PR.cone,s*.15,.39,-.005,.07,.15,.04,0xf0b0a0)}
    const T=[[0,HIP-.1,.3,.22],[0,-1.18,.42,.28],[0,-1.36,.6,.33],[0,-1.46,.84,.36],[0,-1.44,1.1,.34],[0,-1.32,1.3,.28]];
    T.forEach((t,k)=>put(B,PR.slo,t[0],t[1],t[2],t[3]*1.9,t[3]*1.5,t[3]*1.9,k===5?CR:k%2?0xb06a3a:0xa8603a))},
  // 23 UFO Disc: a proper flying saucer you ride standing on its top: a gently domed silver top with panel lines, a rim band
  // with a ring of coloured lights going round, a darker cone underneath with a glowing green ring, a glass bubble at its nose
  B=>{const y=FEET-.02,R=1.3;
    sheet(B,24,4,polar(v=>R*v,v=>y-.13*v*v),(u,v,i,j)=>i%4===0||j===2?0x9aa3ad:0xd2d9e0,null,outward(0,y-2,0));
    sheet(B,24,2,polar(v=>R+.05*Math.sin(Math.PI*v),v=>y-.13-.14*v),(u,v,i)=>i%2?0x8a929c:0xaab2bc,()=>0x6a727c,p=>v3(p.x,0,p.z));
    sheet(B,24,3,polar(v=>R-(R-.38)*v,v=>y-.27-.22*v),(u,v,i,j)=>j===2?0x9dff9d:0x7d8590,()=>0x6a727c,p=>v3(p.x*.3,-1,p.z*.3));
    put(B,PR.sph,0,y-.5,0,.62,.22,.62,0x9dff9d);put(B,PR.sph,0,y+.02,-.86,.62,.42,.56,0x8fe8ff);put(B,PR.cyl8,0,y-.01,-.86,.68,.05,.62,0xb8c0c8);
    anim(1,1.6);const LC=[0xff4f5e,0xffd23f,0x5fd068,0x3ee6ff];for(let k=0;k<16;k++){const a=k/16*TAU;put(B,PR.slo,Math.cos(a)*(R+.06),y-.2,Math.sin(a)*(R+.06),.11,.1,.11,LC[k%4])}anim(0)},
  // 24 Small Cloud: a puffy white cloud you stand in, a little grey underneath, bobbing gently
  B=>{AN=()=>[3,.04,0];NSH=(nx,ny)=>ny<-.3?.82:1;const C=[[0,-.1,0,.55],[-.55,-.05,.1,.42],[.58,-.06,-.05,.44],[-1.0,-.18,0,.32],[1.02,-.16,.08,.33],[-.25,.08,-.3,.36],[.3,.06,.32,.36],[0,-.18,.48,.36],[0,-.16,-.5,.38]];
    for(const c of C)put(B,PR.sph,c[0],FEET+c[1],c[2],c[3]*2,c[3]*1.5,c[3]*1.9,0xf6f9ff);NSH=null;AN=null}
];
const gliderGeo=[];
function gliderOf(n){if(!GLIDERS[n])return null;if(!gliderGeo[n]){const B=Kit();AN=null;NSH=null;GLIDERS[n](B);AN=null;NSH=null;gliderGeo[n]=kitGeo(B)}return gliderGeo[n]}

// How each glider is held (gstyle): the pose for the arms and chest (index.html's pose()), where each hand goes in the
// glider's frame (armIK puts it there at every steering angle; null leaves that arm in the pose), the body's pitch, the
// legs, how the glider opens (place), and any slow spin or sway of the whole body. Only the look changes: the body's
// hit areas, its size and the glide itself are the page's own.
const LEGS={
  trail:(u,t)=>[-.28+t*.06,-u.roll*.25,.35+t*.06,-.36-t*.06,-u.roll*.25,.45-t*.06],
  dangle:(u,t)=>[-u.pit*.85+.1+t*.07,-.05,.25+t*.05,-u.pit*.85-.05-t*.07,.05,.3-t*.05],
  stand:(u,t)=>[-u.pit+.42,-.1,.9+t*.03,-u.pit+.32,.1,.75-t*.03],
  sit:(u,t)=>[1.45+t*.04,-.08,1.5,1.4-t*.04,.08,1.45],
  astride:(u,t)=>[.95,-.3,1.25,.95,.3,1.25],
  spread:(u,t)=>[t*.04,-.22,.08,-t*.04,.22,.08],
  surf:(u,t)=>[-u.pit+.32,-.3,.85+t*.03,-u.pit+.32,.3,.85-t*.03],
  ring:(u,t)=>[.25+t*.1,-.06,.5+t*.1,.15-t*.1,.06,.4-t*.1]};
const ARMS_UP={L:[2.0,.3,-.25,.4],R:[2.0,0,.25,.4]},ARMS_OUT={L:[.15,1.5,-.1,.25],R:[.15,-1.5,.1,.25]},ARMS_WING={L:[0,1.57,0,0],R:[0,-1.57,0,0]},ARMS_HANG={L:[-1.42,.2,-.14,.25],R:[-1.42,-.2,.14,.25]};
const PLACE={
  unfold:(gl,ge,u)=>{gl.position.set(0,G.GLIDE_Y,0);gl.scale.set(.08+.92*ge,.4+.6*ge,.3+.7*ge);gl.rotation.set(-u.pit*.8,0,u.roll*.4)},
  // the umbrella pops open: the canopy shoots out past full width and settles
  pop:(gl,ge,u)=>{const o=ge<1?1+Math.sin(ge*Math.PI)*.22:1;gl.position.set(0,G.GLIDE_Y,0);gl.scale.set(.15+.85*ge*o,.55+.45*ge,.15+.85*ge*o);gl.rotation.set(-u.pit*.5,0,u.roll*.25)},
  // the balloons rise up into place out of your hands
  rise:(gl,ge,u)=>{gl.position.set(0,G.GLIDE_Y-(1-ge)*.9,0);gl.scale.setScalar(.25+.75*ge);gl.rotation.set(-u.pit*.6,0,u.roll*.3)},
  // a sheet or bag fills with air
  billow:(gl,ge,u)=>{gl.position.set(0,G.GLIDE_Y,0);gl.scale.set(.35+.65*ge,.15+.85*ge,.35+.65*ge);gl.rotation.set(-u.pit*.7,0,u.roll*.35)},
  // fixed to the body: boards under the feet, wings along the arms, a broom or a ring; it spreads out sideways
  body:(gl,ge)=>{gl.position.set(0,G.GLIDE_Y,0);gl.scale.set(ge,1,.3+.7*ge);gl.rotation.set(0,0,0)},
  board:(gl,ge)=>{gl.position.set(0,G.GLIDE_Y,0);gl.scale.set(ge,1,ge);gl.rotation.set(0,0,0)},
  // a big bird swoops in over the shoulders
  carry:(gl,ge,u)=>{gl.position.set(0,G.GLIDE_Y+(1-ge)*.6,0);gl.scale.setScalar(.3+.7*ge);gl.rotation.set(-u.pit*.3,0,u.roll*.2)}};
const HOLDS=[null,
  {pose:{L:[.5,1.3,-.5,.35],R:ARMS_UP.R,turn:.08},hands:[null,[.33,.14,-.04]],pit:-.05,legs:'dangle',place:'pop',sway:.07},
  {pose:ARMS_UP,hands:[[-.24,.11,-.06],[.24,.11,-.06]],pit:-.42,legs:'trail',place:'unfold'},
  {pose:{L:[1.25,.3,-.3,1],R:[1.25,0,.3,1]},hands:[[-.44,-.05,-.12],[.44,-.05,-.12]],pit:-.72,legs:'spread',place:'unfold'},
  {pose:ARMS_UP,hands:[[-.38,.09,-.06],[.38,.09,-.06]],pit:-.12,legs:'dangle',place:'unfold',sway:.04},
  {pose:ARMS_UP,hands:[[-.4,.12,0],[.4,.12,0]],pit:-.08,legs:'dangle',place:'billow',sway:.05},
  {pose:ARMS_UP,hands:[[-.4,.12,0],[.4,.12,0]],pit:-.08,legs:'dangle',place:'billow',sway:.05},
  {pose:ARMS_WING,hands:[[-.86,-.4,-.01],[.86,-.4,-.01]],pit:-1.1,legs:'spread',place:'body'},
  {pose:ARMS_WING,hands:[[-.86,-.4,-.01],[.86,-.4,-.01]],pit:-1.1,legs:'spread',place:'body'},
  {pose:ARMS_WING,hands:[[-.86,-.4,-.01],[.86,-.4,-.01]],pit:-1.1,legs:'spread',place:'body'},
  {pose:ARMS_UP,hands:[[-.27,.11,-.04],[.27,.11,-.04]],pit:-.04,legs:'dangle',place:'rise',sway:.05},
  {pose:{L:[-.9,.2,-.1,.8],R:[-.9,-.2,.1,.8]},hands:[[-.45,HIP+.18,-.2],[.45,HIP+.18,-.2]],pit:.06,legs:'sit',place:'rise',sway:.04},
  {pose:Object.assign({lean:-.15},ARMS_OUT),hands:[null,null],pit:-.04,legs:'stand',place:'board'},
  {pose:Object.assign({lean:-.15},ARMS_OUT),hands:[null,null],pit:-.04,legs:'stand',place:'board'},
  {pose:{lean:-.28,turn:.15,L:[.35,1.45,-.1,.35],R:[-.15,-1.45,.1,.35]},hands:[null,null],pit:-.04,legs:'surf',place:'board',face:SURF},
  {pose:Object.assign({lean:-.15},ARMS_OUT),hands:[null,null],pit:-.04,legs:'stand',place:'board'},
  {pose:{lean:-.55,L:[-.4,.3,-.1,.6],R:[-.4,-.3,.1,.6]},hands:[[-.1,-.8,-.47],[.1,-.83,-.32]],pit:-.22,legs:'astride',place:'body',sway:.03},
  {pose:ARMS_UP,hands:[[-.12,.1,-.05],[.12,.1,-.05]],pit:-.05,legs:'dangle',place:'pop',sway:.05},
  {pose:ARMS_UP,hands:[[-.16,.1,-.04],[.16,.1,-.04]],pit:-.04,legs:'dangle',place:'unfold',spin:.9},
  {pose:{L:[-.9,.2,-.1,.8],R:[-.9,-.2,.1,.8]},hands:[[-.32,HIP+.3,-.42],[.32,HIP+.3,-.42]],pit:-.1,legs:'ring',place:'body',sway:.05},
  {pose:ARMS_HANG,hands:[null,null],pit:-.08,legs:'dangle',place:'carry',sway:.04},
  {pose:ARMS_HANG,hands:[null,null],pit:-.08,legs:'dangle',place:'carry',sway:.04},
  {pose:ARMS_WING,hands:[[-.88,-.4,.02],[.88,-.4,.02]],pit:-1.15,legs:'spread',place:'body'},
  {pose:Object.assign({lean:-.1},ARMS_OUT),hands:[null,null],pit:-.04,legs:'stand',place:'board'},
  {pose:Object.assign({lean:-.1},ARMS_OUT),hands:[null,null],pit:-.04,legs:'stand',place:'board'}];
const gstyles=[];
function gstyle(n){if(!HOLDS[n])return null;if(gstyles[n])return gstyles[n];const H=HOLDS[n],L=LEGS[H.legs]||LEGS.trail,pl=PLACE[H.place]||PLACE.unfold;
  return gstyles[n]={pose:G.pose(H.pose),hands:H.hands,pit:H.pit,pole:null,
    body(m,u,dt,fl){if(H.face)m.rotation.y+=H.face*u.glk;if(H.spin){u.lxSp=(u.lxSp||0)+dt*H.spin*fl;m.rotation.y+=u.lxSp*u.glk}if(H.sway&&fl)m.rotation.z+=Math.sin(performance.now()*.0015+(u.hex&7))*H.sway*u.glk},
    place:pl,
    legs(L0,L1,u,now,fl){const t=Math.sin(now*.004)*fl,v=L(u,t),k=u.glk;   // blended in from the standard trail as it opens
      const d=LEGS.trail(u,t);L0.rotation.set(d[0]+(v[0]-d[0])*k,0,d[1]+(v[1]-d[1])*k,'XYZ');L0.k=d[2]+(v[2]-d[2])*k;L1.rotation.set(d[3]+(v[3]-d[3])*k,0,d[4]+(v[4]-d[4])*k,'XYZ');L1.k=d[5]+(v[5]-d[5])*k}}}
// The gliders' material: the page's own (its look, MAT's grain on Pretty), plus the moving parts on the clock gT.
css();
const gT={value:0};
const GLX=new THREE.MeshLambertMaterial({vertexColors:true});GLX.defines={};
GLX.onBeforeCompile=sh=>{G.MAT.onBeforeCompile(sh);sh.uniforms.gT=gT;
  const fn='uniform float gT;attribute vec3 gan;\n'
    +'float lxA(float sx){if(gan.x>.5&&gan.x<1.5)return gT*gan.y;if(gan.x>1.5&&gan.x<2.5)return sin(gT*5.)*gan.z*sx;if(gan.x>5.5&&gan.x<6.5)return sin(gT*2.2)*gan.z*sx;if(gan.x>6.5)return sin(gT*3.)*gan.z*sx;return 0.;}\n'
    +'vec3 lxR(vec3 v,float a,bool spin){float c=cos(a),s=sin(a);if(spin)return vec3(c*v.x-s*v.z,v.y,s*v.x+c*v.z);return vec3(c*v.x-s*v.y,s*v.x+c*v.y,v.z);}\n';
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+fn)
    .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n{float sx=position.x<0.?-1.:1.;float a=lxA(sx);if(a!=0.)objectNormal=lxR(objectNormal,a,gan.x<1.5||gan.x>6.5);}')
    .replace('#include <begin_vertex>','#include <begin_vertex>\n{float sx=position.x<0.?-1.:1.;float a=lxA(sx);'
      +'if(gan.x>.5&&gan.x<1.5)transformed=lxR(transformed,a,true);'
      +'else if((gan.x>1.5&&gan.x<2.5)||gan.x>5.5){vec3 q=transformed;q.x-=sx*gan.y;q=lxR(q,a,gan.x>6.5);q.x+=sx*gan.y;transformed=q;}'
      +'else if(gan.x>2.5&&gan.x<3.5){transformed.y+=sin(gT*1.8+gan.z)*gan.y;transformed.x+=sin(gT*1.3+gan.z*1.7)*gan.y*.5;}'
      +'else if(gan.x>3.5&&gan.x<4.5)transformed.y+=sin(gT*6.+transformed.z*3.+transformed.x*1.3)*gan.y;}');
};

// =====================================================================
//  Glider trails: one pool of soft sprites for everyone (one draw call while there are any)
// =====================================================================
const TCAP=G.low?700:1600;
const tp={x:new Float32Array(TCAP*3),c:new Float32Array(TCAP*3),s:new Float32Array(TCAP),d:new Float32Array(TCAP*4),
  v:new Float32Array(TCAP*3),age:new Float32Array(TCAP),life:new Float32Array(TCAP),s0:new Float32Array(TCAP),s1:new Float32Array(TCAP),a0:new Float32Array(TCAP),vr:new Float32Array(TCAP),k:new Uint8Array(TCAP),n:0};
const tGeo=new THREE.BufferGeometry();
tGeo.setAttribute('position',new THREE.BufferAttribute(tp.x,3).setUsage(THREE.DynamicDrawUsage));tGeo.setAttribute('pcol',new THREE.BufferAttribute(tp.c,3).setUsage(THREE.DynamicDrawUsage));
tGeo.setAttribute('size',new THREE.BufferAttribute(tp.s,1).setUsage(THREE.DynamicDrawUsage));tGeo.setAttribute('pdat',new THREE.BufferAttribute(tp.d,4).setUsage(THREE.DynamicDrawUsage));
tGeo.setDrawRange(0,0);
// the sprites, 4 x 2 on one small picture: puff, twinkle, soft dot, feather, leaf, bubble
const tTex=(()=>{const S=64,c=document.createElement('canvas');c.width=S*4;c.height=S*2;const g=c.getContext('2d');
  const at=(i,f)=>{g.save();g.translate((i%4)*S+S/2,Math.floor(i/4)*S+S/2);f();g.restore()};
  at(0,()=>{const r=g.createRadialGradient(0,0,2,0,0,30);r.addColorStop(0,'rgba(255,255,255,.95)');r.addColorStop(.6,'rgba(240,240,240,.55)');r.addColorStop(1,'rgba(230,230,230,0)');g.fillStyle=r;g.beginPath();g.arc(0,0,30,0,TAU);g.fill()});
  at(1,()=>{g.fillStyle='#fff';g.beginPath();for(let i=0;i<8;i++){const a=i/8*TAU,r=i%2?5:28;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill();const r=g.createRadialGradient(0,0,0,0,0,14);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.beginPath();g.arc(0,0,14,0,TAU);g.fill()});
  at(2,()=>{const r=g.createRadialGradient(0,0,0,0,0,28);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.55,'rgba(255,255,255,.9)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.beginPath();g.arc(0,0,28,0,TAU);g.fill()});
  at(3,()=>{g.rotate(-.6);g.fillStyle='#fff';g.beginPath();g.ellipse(0,0,10,27,0,0,TAU);g.fill();g.strokeStyle='rgba(150,150,150,.9)';g.lineWidth=2;g.beginPath();g.moveTo(0,-26);g.lineTo(0,28);g.stroke();
    g.strokeStyle='rgba(200,200,200,.8)';g.lineWidth=1;for(let y=-18;y<20;y+=6){g.beginPath();g.moveTo(0,y);g.lineTo(-9,y-5);g.moveTo(0,y);g.lineTo(9,y-5);g.stroke()}});
  at(4,()=>{g.rotate(.5);g.fillStyle='#fff';g.beginPath();g.moveTo(0,-27);g.quadraticCurveTo(22,-6,0,24);g.quadraticCurveTo(-22,-6,0,-27);g.fill();g.strokeStyle='rgba(120,120,120,.8)';g.lineWidth=2;g.beginPath();g.moveTo(0,-24);g.lineTo(0,29);g.stroke();
    g.lineWidth=1.2;for(let y=-14;y<16;y+=8){g.beginPath();g.moveTo(0,y);g.lineTo(-9,y-7);g.moveTo(0,y);g.lineTo(9,y-7);g.stroke()}});
  at(5,()=>{g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=3;g.beginPath();g.arc(0,0,25,0,TAU);g.stroke();const r=g.createRadialGradient(0,0,10,0,0,25);r.addColorStop(0,'rgba(255,255,255,.05)');r.addColorStop(1,'rgba(255,255,255,.35)');g.fillStyle=r;g.beginPath();g.arc(0,0,25,0,TAU);g.fill();
    g.fillStyle='rgba(255,255,255,.95)';g.beginPath();g.ellipse(-9,-10,6,3.5,-.7,0,TAU);g.fill()});
  const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearMipmapLinearFilter;return t})();
const tMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:true,
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{map:{value:null},uScale:{value:400}}]),
  vertexShader:'attribute float size;attribute vec4 pdat;attribute vec3 pcol;uniform float uScale;varying vec3 vC;varying vec4 vD;\n#include <fog_pars_vertex>\nvoid main(){vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;float d=-mvPosition.z;'
    +'gl_PointSize=clamp(size*uScale/max(d,.1),1.,180.);vC=pcol;vD=pdat;vD.z*=smoothstep(1.2,3.,d);\n#include <fog_vertex>\n}',
  fragmentShader:'uniform sampler2D map;varying vec3 vC;varying vec4 vD;\n#include <fog_pars_fragment>\nvoid main(){vec2 q=gl_PointCoord-.5;float c=cos(vD.y),s=sin(vD.y);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y)+.5;'
    +'if(q.x<0.||q.y<0.||q.x>1.||q.y>1.)discard;vec2 o=vec2(mod(vD.x,4.),1.-floor(vD.x/4.));vec4 t=texture2D(map,(o+vec2(q.x,1.-q.y))/vec2(4.,2.));gl_FragColor=vec4(vC*t.rgb,t.a*vD.z);if(gl_FragColor.a<.01)discard;\n#include <fog_fragment>\n}'});
tMat.uniforms.map.value=tTex;
const tPts=new THREE.Points(tGeo,tMat);tPts.frustumCulled=false;tPts.visible=false;tPts.renderOrder=5;G.scene.add(tPts);
// each trail: sprite, colours, size from and to, life, how many a second, and how they move
const RAINBOW=[0xff4f4f,0xff9a3c,0xffe14f,0x5fd068,0x3fa9f5,0x9b6cff];
const TRAILS=[null,
  {sp:0,cols:[0xf2f2f2,0xe2e4e8,0xd2d6dc],s0:.7,s1:2.4,life:1.7,rate:22,a:.5,spread:.25,vy:.4},
  {sp:1,cols:[0xffe45c,0xffffff,0xbff3ff,0xffc2f0],s0:.6,s1:.25,life:1.1,rate:30,a:1,spread:.55,vy:0,tw:1},
  {sp:2,cols:RAINBOW,s0:.5,s1:.62,life:1.3,rate:26,a:.85,spread:0,vy:0,band:1},
  {sp:3,cols:[0xffffff,0xf4efe2,0xe6e8ee],s0:.55,s1:.55,life:2.2,rate:12,a:1,spread:.5,vy:-1.2,spin:3},
  {sp:4,cols:[0xe8782e,0xd9442f,0xf2b632,0x8bb04a],s0:.5,s1:.5,life:2.2,rate:12,a:1,spread:.5,vy:-1.4,spin:4},
  {sp:5,cols:[0xcff6ff,0xffffff,0xd9ecff,0xf2d9ff],s0:.25,s1:.48,life:1.6,rate:20,a:.95,spread:.45,vy:1.2,pop:1}];
function emit(T,x,y,z,col,vx,vy,vz,cx,cy,cz){
  if(tp.n>=TCAP)return;const i=tp.n++;_c.setHex(col);
  tp.x[i*3]=x;tp.x[i*3+1]=y;tp.x[i*3+2]=z;tp.v[i*3]=vx+(cx||0);tp.v[i*3+1]=vy+(cy||0);tp.v[i*3+2]=vz+(cz||0);tp.c[i*3]=_c.r;tp.c[i*3+1]=_c.g;tp.c[i*3+2]=_c.b;
  tp.age[i]=0;tp.life[i]=T.life*(.8+Math.random()*.4);tp.s0[i]=T.s0;tp.s1[i]=T.s1;tp.a0[i]=T.a;tp.vr[i]=T.spin?(Math.random()-.5)*T.spin:0;tp.k[i]=TRAILS.indexOf(T);
  tp.d[i*4]=T.sp;tp.d[i*4+1]=Math.random()*TAU;tp.d[i*4+2]=0;tp.s[i]=T.s0;
}
function tStep(dt){
  let w=0;
  for(let i=0;i<tp.n;i++){const a=tp.age[i]+dt;if(a>=tp.life[i])continue;
    if(w!==i){for(const [A,n] of [[tp.x,3],[tp.v,3],[tp.c,3],[tp.d,4]])for(let k=0;k<n;k++)A[w*n+k]=A[i*n+k];tp.life[w]=tp.life[i];tp.s0[w]=tp.s0[i];tp.s1[w]=tp.s1[i];tp.a0[w]=tp.a0[i];tp.vr[w]=tp.vr[i];tp.k[w]=tp.k[i]}
    const T=TRAILS[tp.k[w]],f=a/tp.life[w];tp.age[w]=a;
    const dr=Math.exp(-dt*2.2);tp.v[w*3]*=dr;tp.v[w*3+1]*=dr;tp.v[w*3+2]*=dr;   // drag: they set off with most of the body's speed and fall behind
    tp.x[w*3]+=tp.v[w*3]*dt;tp.x[w*3+1]+=tp.v[w*3+1]*dt;tp.x[w*3+2]+=tp.v[w*3+2]*dt;
    if(T.spin){tp.x[w*3]+=Math.sin(a*3+w)*dt*.6;tp.d[w*4+1]+=tp.vr[w]*dt}
    tp.s[w]=tp.s0[w]+(tp.s1[w]-tp.s0[w])*f;
    let al=tp.a0[w]*Math.min(1,a*8)*(1-f*f);if(T.tw)al*=.55+.45*Math.sin(a*22+w);if(T.pop&&f>.88)al*=Math.max(0,1-(f-.88)*12);tp.d[w*4+2]=al;
    w++}
  tp.n=w;
}
const _tr=new V3(),_tq=new V3();
function trailFrom(e,T,dt,acc,wing){
  // a rate a second, from the middle of the body falling, or from both wing tips gliding (the rainbow comes as one band)
  e.lxAcc=(e.lxAcc||0)+dt*T.rate*(G.low?.6:1);
  const m=e.model,yaw=e.yaw||0,rx=Math.cos(yaw),rz=-Math.sin(yaw);
  while(e.lxAcc>=1){e.lxAcc-=1;
    const pts=wing?[-1.45,1.45]:[-.55,.55],k=.8,cx=e.vel.x*k,cy=e.vel.y*k,cz=e.vel.z*k;
    for(const o of pts){const bx=e.pos.x+rx*o*G.BS,by=e.pos.y+(wing?2.2:1.0),bz=e.pos.z+rz*o*G.BS;
      if(T.band){for(let j=0;j<6;j++){const off=(j-2.5)*.16;emit(T,bx+rx*off,by,bz+rz*off,T.cols[j],0,.1,0,cx,cy,cz)}continue}
      const sp=T.spread;emit(T,bx+(Math.random()-.5)*sp,by+(Math.random()-.5)*sp,bz+(Math.random()-.5)*sp,T.cols[Math.floor(Math.random()*T.cols.length)],(Math.random()-.5)*.8,T.vy+(Math.random()-.5)*.4,(Math.random()-.5)*.8,cx,cy,cz)}
  }
}

// =====================================================================
//  Gun skins: the weapon's body in a pattern, worked out in the shader from where each point is on the model
// =====================================================================
// Each weapon model is made of parts of a few kinds of colour. A skin repaints the body (the family colour, the dark
// frame and grip, the grey metal, the wood) and leaves alone the orange toy tip (where the muzzle flash comes out), the
// lenses, the red dot and the gold beads. gcl: 0 left alone, 1 body, 2 dark parts, 3 grey metal, 4 wood.
const KEEP=new Set([0xff8a3a,0xbfe8ff,0xe8483f,0xffc93c]),DARKS=new Set([0x1b1d22,0x2a2d34,0x1b1d24]),METAL=new Set([0x5a606b,0xa3acb6]),WOODS=new Set([0x9a6a3c,0x74492a]);
const uT={value:0};
const GSK=new THREE.MeshLambertMaterial({vertexColors:true});
const GLSL_NOISE='float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}\n'
  +'float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1.,0.,0.)),f.x),mix(h3(i+vec3(0.,1.,0.)),h3(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(h3(i+vec3(0.,0.,1.)),h3(i+vec3(1.,0.,1.)),f.x),mix(h3(i+vec3(0.,1.,1.)),h3(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}\n'
  +'float fb(vec3 p){return n3(p)*.55+n3(p*2.03)*.3+n3(p*4.1)*.15;}\n'
  +'vec3 hsv(float h,float s,float v){vec3 k=clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);return v*mix(vec3(1.),k,s);}\n';
// k: the skin's number, cl: the part's kind, p: the point on the model, n: its normal there, vn and vd: the normal and the
// way to the eye in view space (for shine), em: light it gives off (glows: lava, neon, galaxy stars)
const GLSL_SKIN='vec4 c4(float f,vec3 a,vec3 b,vec3 c,vec3 d){return vec4(f<.4?a:f<.52?b:f<.64?c:d,1.);}\n'
  +'vec3 lxSkin(float k,float cl,vec3 p,vec3 n,vec3 vn,vec3 vd,out vec3 em){em=vec3(0.);\n'
  +'float dk=step(1.5,cl)*step(cl,2.5),sh=dk>.5?.55:cl>2.5&&cl<3.5?.85:cl>3.5?.9:1.;vec3 r=reflect(-vd,vn);float up=r.y;vec3 c=vec3(1.);\n'
  +'if(k<1.5){c=vec3(1.,.74,.2)*(dk>.5?.62:1.);float b=smoothstep(0.,.75,up);c*=.7+.55*b;em=vec3(1.,.75,.25)*.16*b;}\n'
  +'else if(k<2.5){c=mix(vec3(.22,.24,.28),vec3(.82,.9,1.),smoothstep(-.35,.55,up));c+=vec3(.45)*smoothstep(.72,.95,up);c*=.6+.4*sh;em=c*.22;}\n'
  +'else if(k<3.5){float g=sin(p.y*85.+fb(p*vec3(3.,14.,14.))*7.+p.x*30.);c=mix(vec3(.68,.45,.23),vec3(.45,.27,.12),smoothstep(-.3,.9,g))*sh;}\n'
  +'else if(k<4.5){c=c4(fb(p*7.+3.),vec3(.17,.27,.13),vec3(.33,.41,.2),vec3(.42,.31,.18),vec3(.52,.56,.34)).rgb*(dk>.5?.75:1.);}\n'
  +'else if(k<5.5){c=c4(fb(p*7.+9.),vec3(.84,.72,.52),vec3(.7,.57,.37),vec3(.55,.41,.26),vec3(.92,.86,.7)).rgb*(dk>.5?.8:1.);}\n'
  +'else if(k<6.5){c=c4(fb(p*7.+15.),vec3(.96,.97,1.),vec3(.78,.82,.87),vec3(.6,.67,.75),vec3(.42,.47,.54)).rgb*(dk>.5?.85:1.);}\n'
  +'else if(k<7.5){c=c4(fb(floor(p*30.)/30.*7.+21.),vec3(.34,.4,.3),vec3(.47,.52,.4),vec3(.22,.26,.21),vec3(.62,.64,.53)).rgb*(dk>.5?.8:1.);}\n'
  +'else if(k<8.5){c=vec3(.05,.06,.11);float rim=pow(1.-abs(dot(vn,vd)),2.2);em=vec3(.15,1.,.92)*rim*1.4+vec3(1.,.25,.85)*step(.94,fract(p.z*7.+.5))*.55*step(.5,cl)*(1.-dk);}\n'
  +'else if(k<9.5){c=cl>3.5?vec3(.1,.3,.78):dk>.5?vec3(1.,.5,.08):cl>2.5?vec3(1.,.83,.15):vec3(.14,.44,.96);}\n'
  +'else if(k<10.5){c=vec3(.75,.57,.36)*(.93+.07*sin(p.y*240.));if(abs(p.z+.26)<.04)c=vec3(.88,.82,.67);c*=dk>.5?.75:1.;}\n'
  +'else if(k<11.5){float s=fract((p.z+p.y*.9)*6.);c=s<.5?vec3(.86,.1,.12):vec3(.97,.95,.92);if(abs(s-.75)<.05)c=vec3(.12,.6,.28);c*=dk>.5?.85:1.;}\n'
  +'else if(k<12.5){float cr=abs(n3(p*11.)-.5),g=1.-smoothstep(0.,.07,cr);c=mix(vec3(.09,.05,.05),vec3(.26,.13,.08),fb(p*9.));c=mix(c,vec3(1.,.5,.1),g*.6);em=vec3(1.,.38,.05)*g*1.5*(.75+.25*sin(uT*2.+p.z*6.));}\n'
  +'else if(k<13.5){float f=fb(p*8.);c=mix(vec3(.55,.8,.95),vec3(.93,.98,1.),f);c=mix(c,vec3(1.),step(.9,fract(p.z*3.+p.y*5.+f))*.6)*(dk>.5?.78:1.);em=vec3(.06,.11,.15);}\n'
  +'else if(k<14.5){c=mix(vec3(.08,.03,.22),vec3(.05,.12,.4),fb(p*5.));c=mix(c,vec3(.72,.25,.68),smoothstep(.55,.75,fb(p*3.+5.)));float s=h3(floor(p*70.)),tw=step(.965,s)*(.6+.4*sin(uT*3.+s*40.));em=c*.3+vec3(tw);c+=vec3(tw);}\n'
  +'else if(k<15.5){float f=fb(p*10.);c=mix(vec3(.53,.54,.56),vec3(.62,.32,.12),smoothstep(.4,.55,f));c=mix(c,vec3(.4,.18,.07),smoothstep(.62,.75,f))*(.9+.1*n3(p*60.))*sh;}\n'
  +'else if(k<16.5){float f=fb(p*4.5);c=mix(vec3(.9,.9,.88),hsv(fract(f*2.3+.1),.85,1.),smoothstep(.42,.46,f));c=mix(c,vec3(.06),1.-smoothstep(0.,.015,abs(f-.44)));c*=dk>.5?.7:1.;}\n'
  +'else if(k<17.5){c=mix(vec3(1.,.5,.72),vec3(1.,.75,.87),smoothstep(.4,.7,fb(p*6.)))*(dk>.5?.72:1.);float b=smoothstep(.3,.85,up);c+=vec3(.22)*b;em=vec3(.14,.05,.09)*b;}\n'
  +'else if(k<18.5){c=dk>.5?vec3(.07):fract((p.z-p.y)*5.)<.5?vec3(1.,.8,.08):vec3(.07,.07,.08);}\n'
  +'else{float bd=floor(p.z*5.),hb=h3(vec3(bd,3.,7.));c=hb<.25?vec3(.86,.12,.1):hb<.5?vec3(.1,.36,.86):hb<.75?vec3(1.,.8,.1):vec3(.15,.6,.2);c*=1.-step(.94,fract(p.z*5.))*.35;'
  +'if(n.y>.6){vec2 q=fract(vec2(p.x,p.z)*14.)-.5;float d=length(q);c*=1.+.22*(1.-smoothstep(.22,.27,d))-.2*smoothstep(.27,.31,d)*(1.-smoothstep(.31,.36,d));}c+=vec3(.12)*smoothstep(.5,.9,up);}\n'
  +'return c;}\n';
GSK.onBeforeCompile=sh=>{sh.uniforms.uT=uT;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float gsk;attribute float gcl;varying float vSk;varying float vCl;varying vec3 vP;varying vec3 vN;varying vec3 vVN;varying vec3 vVD;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvSk=gsk;vCl=gcl;vP=position;vN=normal;')
    .replace('#include <project_vertex>','#include <project_vertex>\nvVN=normalize(transformedNormal);vVD=normalize(-mvPosition.xyz);');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uT;varying float vSk;varying float vCl;varying vec3 vP;varying vec3 vN;varying vec3 vVN;varying vec3 vVD;\n'+GLSL_NOISE+GLSL_SKIN)
    .replace('#include <color_fragment>','#include <color_fragment>\nvec3 lxEm=vec3(0.);if(vSk>.5&&vCl>.5)diffuseColor.rgb=lxSkin(floor(vSk+.5),floor(vCl+.5),vP,normalize(vN),normalize(vVN),normalize(vVD),lxEm);')
    .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=lxEm;');
};
const gunGeo={},gunSk={};
function skinGunGeo(k){
  if(gunGeo[k])return gunGeo[k];
  const g=G.GUN_GEO[k].clone(),col=g.attributes.color,n=col.count,cl=new Float32Array(n);
  for(let i=0;i<n;i++){const hx=(Math.round(col.getX(i)*255)<<16)|(Math.round(col.getY(i)*255)<<8)|Math.round(col.getZ(i)*255);cl[i]=KEEP.has(hx)?0:DARKS.has(hx)?2:METAL.has(hx)?3:WOODS.has(hx)?4:1}
  g.setAttribute('gcl',new THREE.BufferAttribute(cl,1));return gunGeo[k]=g;
}
function gunMesh(k,n){const g=skinGunGeo(k).clone();g.setAttribute('gsk',new THREE.InstancedBufferAttribute(new Float32Array(n),1).setUsage(THREE.DynamicDrawUsage));
  const im=new THREE.InstancedMesh(g,GSK,n);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.frustumCulled=false;im.count=0;im.visible=false;im.castShadow=im.receiveShadow=true;return im}

// =====================================================================
//  Build skins: one picture of six tiles, picked per piece in the plywood's own shader (no extra draw calls)
// =====================================================================
const BS_DEBRIS=[0xc7955a,0xb88a55,0xcfe3ea,0xa9dcf0,0xff9fc7,0x8d8f94,0x8e9499];
const TILE=256;
function drawBuild(g,k){
  const S=TILE,r=rng(900+k);const R=(a,b)=>a+r()*(b-a);
  if(k===1){g.fillStyle='#b98b56';g.fillRect(0,0,S,S);for(let y=0;y<S;y+=5){g.fillStyle=y%10?'rgba(90,60,30,.06)':'rgba(255,240,210,.06)';g.fillRect(0,y,S,2)}
    for(let i=0;i<14;i++){g.fillStyle='rgba(120,80,40,'+R(.05,.12)+')';g.beginPath();g.ellipse(R(0,S),R(0,S),R(8,30),R(5,18),R(0,3),0,TAU);g.fill()}
    g.strokeStyle='rgba(100,66,32,.55)';g.lineWidth=3;g.beginPath();g.moveTo(0,S*.3);g.lineTo(S,S*.3);g.stroke();g.strokeStyle='rgba(255,235,200,.25)';g.lineWidth=2;g.beginPath();g.moveTo(0,S*.3+3);g.lineTo(S,S*.3+3);g.stroke();
    g.fillStyle='rgba(222,206,160,.9)';g.fillRect(S*.42,0,S*.17,S);g.fillStyle='rgba(255,255,255,.18)';for(let y=0;y<S;y+=18)g.fillRect(S*.42,y+R(0,8),S*.17,2);
    g.strokeStyle='rgba(40,30,20,.75)';g.lineWidth=4;g.strokeRect(S*.7,S*.58,S*.2,S*.24);g.beginPath();for(const x of [.76,.84]){g.moveTo(S*x,S*.78);g.lineTo(S*x,S*.63);g.moveTo(S*x-8,S*.69);g.lineTo(S*x,S*.62);g.lineTo(S*x+8,S*.69)}g.stroke();
    g.strokeStyle='rgba(60,40,20,.35)';g.lineWidth=6;g.strokeRect(3,3,S-6,S-6)}
  else if(k===2){g.fillStyle='#d4eaf3';g.fillRect(0,0,S,S);const im=g.getImageData(0,0,S,S);for(let i=0;i<im.data.length;i+=4){const v=R(-14,14);im.data[i]+=v;im.data[i+1]+=v;im.data[i+2]+=v}g.putImageData(im,0,0);
    const gr=g.createLinearGradient(0,0,S,S);gr.addColorStop(0,'rgba(255,255,255,.25)');gr.addColorStop(.5,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(170,200,215,.25)');g.fillStyle=gr;g.fillRect(0,0,S,S);
    g.fillStyle='rgba(255,255,255,.38)';for(const [o,w] of [[.25,26],[.4,9],[.7,18]]){g.beginPath();g.moveTo(S*o,0);g.lineTo(S*o+w,0);g.lineTo(S*o+w-S*.4,S);g.lineTo(S*o-S*.4,S);g.fill()}
    g.strokeStyle='#94adb8';g.lineWidth=16;g.strokeRect(8,8,S-16,S-16);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=2;g.strokeRect(17,17,S-34,S-34);g.strokeStyle='#94adb8';g.lineWidth=6;g.beginPath();g.moveTo(S/2,8);g.lineTo(S/2,S-8);g.moveTo(8,S/2);g.lineTo(S-8,S/2);g.stroke()}
  else if(k===3){g.fillStyle='#a6d9ee';g.fillRect(0,0,S,S);for(let i=0;i<16;i++){const x=R(0,S),y=R(0,S),rr=R(20,60),gr=g.createRadialGradient(x,y,0,x,y,rr);gr.addColorStop(0,i%2?'rgba(120,180,215,.35)':'rgba(235,250,255,.4)');gr.addColorStop(1,'rgba(160,210,235,0)');g.fillStyle=gr;g.fillRect(x-rr,y-rr,rr*2,rr*2)}
    g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=5;g.strokeRect(2,2,S-4,S-4);g.beginPath();g.moveTo(0,S*.55);g.lineTo(S,S*.5);g.moveTo(S*.45,0);g.lineTo(S*.5,S*.53);g.moveTo(S*.6,S*.5);g.lineTo(S*.55,S);g.stroke();
    g.lineWidth=1.5;for(let i=0;i<7;i++){let x=R(0,S),y=R(0,S);g.beginPath();g.moveTo(x,y);for(let j=0;j<5;j++){x+=R(-30,30);y+=R(-30,30);g.lineTo(x,y)}g.stroke()}
    g.fillStyle='rgba(255,255,255,.55)';for(let i=0;i<40;i++){g.beginPath();g.arc(R(0,S),R(0,S),R(1.5,4),0,TAU);g.fill()}}
  else if(k===4){const C=['#ff9fc7','#fff5f9','#9ff0d0','#fff5f9','#fff19a','#fff5f9'];for(let i=-8;i<16;i++){g.fillStyle=C[(i+24)%6];g.beginPath();g.moveTo(i*32,0);g.lineTo(i*32+32,0);g.lineTo(i*32+32-S,S);g.lineTo(i*32-S,S);g.fill()}
    const gr=g.createLinearGradient(0,0,0,S);gr.addColorStop(0,'rgba(255,255,255,.35)');gr.addColorStop(.25,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(200,120,160,.15)');g.fillStyle=gr;g.fillRect(0,0,S,S);
    const SP=['#e8453c','#3fa9f5','#5fd068','#ffd23f','#b46cff','#ffffff'];for(let i=0;i<70;i++){g.save();g.translate(R(0,S),R(0,S));g.rotate(R(0,3));g.fillStyle=SP[i%6];g.fillRect(-6,-2,12,4);g.restore()}
    g.strokeStyle='rgba(230,110,160,.7)';g.lineWidth=8;g.strokeRect(4,4,S-8,S-8)}
  else if(k===5){g.fillStyle='#6b6e73';g.fillRect(0,0,S,S);for(let row=0;row<4;row++)for(let c=-1;c<3;c++){const x=c*128+(row%2)*64+4,y=row*64+4,t=R(-16,16),b=Math.round(141+t);g.fillStyle='rgb('+b+','+(b+2)+','+(b+7)+')';g.fillRect(x,y,120,56);
      g.fillStyle='rgba(255,255,255,.14)';g.fillRect(x,y,120,5);g.fillStyle='rgba(0,0,0,.14)';g.fillRect(x,y+51,120,5);for(let i=0;i<40;i++){g.fillStyle=i%2?'rgba(0,0,0,.12)':'rgba(255,255,255,.1)';g.fillRect(x+R(2,116),y+R(2,52),R(1,4),R(1,3))}}}
  else if(k===6){const P=[[0,0,140,110,'#8e9499'],[140,0,116,80,'#a7adb2'],[0,110,90,146,'#737a80'],[90,110,90,80,'#9a5a32'],[180,80,76,110,'#4e8a86'],[90,190,166,66,'#a1a7ac'],[180,190,76,66,'#8e9499']];
    for(const [x,y,w,h,c] of P){g.fillStyle=c;g.fillRect(x,y,w,h);g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x,y,w,3);g.fillStyle='rgba(0,0,0,.22)';g.fillRect(x,y+h-3,w,3);g.fillRect(x+w-3,y,3,h);
      for(let i=0;i<6;i++){g.strokeStyle='rgba(255,255,255,'+R(.08,.2)+')';g.lineWidth=1;g.beginPath();const sx=x+R(0,w),sy=y+R(0,h);g.moveTo(sx,sy);g.lineTo(sx+R(-20,20),sy+R(-12,12));g.stroke()}
      g.fillStyle='rgba(60,60,60,.7)';for(let a=x+8;a<x+w-4;a+=18){g.beginPath();g.arc(a,y+8,2.6,0,TAU);g.arc(a,y+h-8,2.6,0,TAU);g.fill()}}
    g.fillStyle='rgba(140,70,30,.45)';for(let i=0;i<10;i++){g.beginPath();g.ellipse(R(0,S),R(0,S),R(4,16),R(3,10),R(0,3),0,TAU);g.fill()}
    for(let i=0;i<5;i++){g.fillStyle=i%2?'#151515':'#f2c219';g.beginPath();const x=12+i*14;g.moveTo(x,226);g.lineTo(x+14,226);g.lineTo(x+4,248);g.lineTo(x-10,248);g.fill()}}
}
let bTex=null;const bTile=[];
function buildTex(){if(bTex)return bTex;const c=document.createElement('canvas');c.width=TILE*4;c.height=TILE*2;const g=c.getContext('2d');
  for(let k=1;k<=6;k++){g.save();g.translate(((k-1)%4)*TILE,Math.floor((k-1)/4)*TILE);g.beginPath();g.rect(0,0,TILE,TILE);g.clip();drawBuild(g,k);g.restore()}
  bTex=new THREE.CanvasTexture(c);bTex.anisotropy=Math.min(8,G.renderer.capabilities.getMaxAnisotropy());bTex.flipY=G.plyMat.map.flipY;return bTex}
function tileCanvas(k){if(bTile[k])return bTile[k];const c=document.createElement('canvas');c.width=c.height=TILE;drawBuild(c.getContext('2d'),k);return bTile[k]=c}
// The plywood's materials learn the skins: a piece whose bsk is 0 is drawn exactly as before (the same texture read).
function patchBuildMat(mat){const prev=mat.onBeforeCompile;
  mat.onBeforeCompile=function(sh,r){if(prev)prev.call(this,sh,r);sh.uniforms.bskTex={value:buildTex()};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float bsk;varying float vBsk;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBsk=bsk;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D bskTex;varying float vBsk;')
      .replace('#include <map_fragment>','#ifdef USE_MAP\nvec4 texelColor;if(vBsk>.5){float t=floor(vBsk+.5)-1.;vec2 o=vec2(mod(t,4.),1.-floor(t/4.));texelColor=texture2D(bskTex,(o+mix(vec2(.012),vec2(.988),clamp(vUv,0.,1.)))/vec2(4.,2.));}else texelColor=texture2D(map,vUv);\ntexelColor=mapTexelToLinear(texelColor);diffuseColor*=texelColor;\n#endif')};
  mat.needsUpdate=true}
const bskMeshes=new Set();
function bskAttr(mesh){let a=mesh.geometry.attributes.bsk;if(!a){a=new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count),1).setUsage(THREE.DynamicDrawUsage);mesh.geometry.setAttribute('bsk',a);bskMeshes.add(mesh)}return a}
for(const k in G.pieceInst)bskAttr(G.pieceInst[k].mesh);bskAttr(G.partIM);bskAttr(G.skirtIM);
patchBuildMat(G.plyMat);patchBuildMat(G.partMat);

// =====================================================================
//  Backpacks: built into the body's own merged mesh (index.html's bodyGeo asks pack() for them), so they bend with the
//  chest and cost no draw call. Each is at least as big as the standard backpack and no deeper than about 0.3 behind it.
//  accent is the player's own colour, kept on every pack somewhere so players can still be told apart.
// =====================================================================
const lite=(h,k)=>_c2.setHex(h).lerp(_c.setHex(0xffffff),k).getHex();
function pack(B,n,a){const R=(...v)=>G.bagRBox(B,...v),L=(...v)=>G.bagRLo(B,...v),X=(...v)=>G.bagBox(B,...v),T=(...v)=>G.bagTurn(B,...v),dk=dim(a,.62),lt=lite(a,.3);
  switch(n){
    case 1:R(0,1.22,.34,.48,.58,.25,a);L(0,1.5,.36,.5,.12,.28,dk);L(0,1.06,.48,.34,.22,.1,lt);X(0,1.5,.5,.08,.12,.03,0xffc93c);for(const s of [-1,1])L(s*.3,1.08,.34,.1,.26,.18,0x3fa9f5);break;   // rucksack: flap, pocket, buckle, two side bottles
    case 2:for(const s of [-1,1]){R(s*.13,1.24,.36,.22,.6,.24,0xdfe4ea);L(s*.13,1.62,.36,.2,.14,.2,0xe8453c);L(s*.13,.88,.36,.16,.1,.16,0x5a606b);T(0,s*.27,1.0,.36,.14,.2,.03,0xe8453c,0,0,s*.5)}X(0,1.24,.36,.12,.5,.2,a);X(0,1.3,.48,.08,.08,.02,0xffd23f);break;   // jetpack: two tanks, nose cones, nozzles, fins
    case 3:R(0,1.2,.36,.42,.52,.26,0xc48a52);R(0,1.58,.38,.36,.32,.28,0xc48a52);for(const s of [-1,1]){L(s*.15,1.76,.38,.12,.12,.08,0xc48a52);T(1,s*.24,1.34,.2,.1,.32,.12,0xc48a52,0,0,s*.6)}L(0,1.54,.53,.16,.12,.06,0xf2dfc0);X(0,1.57,.565,.05,.04,.02,0x3a2a22);
      for(const s of [-1,1])X(s*.08,1.63,.53,.04,.05,.02,0x3a2a22);L(0,1.08,.5,.2,.2,.06,0xf2dfc0);X(0,1.34,.5,.24,.06,.02,a);break;   // teddy bear: body, head, ears, arms round your shoulders, muzzle, eyes, tummy, a bow
    case 4:R(0,1.2,.36,.58,.66,.28,0xc98a3a);for(const [x,y] of [[0,1.2],[-.17,1.38],[.17,1.38],[-.17,1.02],[.17,1.02],[0,1.46],[0,.94]])X(x,y,.505,.14,.14,.02,0x8a5a22);L(0,.86,.36,.6,.08,.3,a);break;   // tortoise shell with plates and a rim in your colour
    case 5:X(0,1.2,.36,.52,.42,.3,0xa0663a);R(0,1.44,.36,.54,.14,.32,0x8a5226);for(const x of [-.18,.18])X(x,1.26,.36,.06,.62,.32,0xffc93c);X(0,1.32,.52,.1,.12,.03,0xffc93c);X(0,1.3,.535,.03,.05,.02,0x3a2a22);X(0,1.02,.36,.54,.05,.32,a);break;   // treasure chest: box, lid, gold bands, lock
    case 6:X(0,1.2,.36,.5,.44,.26,a);X(0,1.44,.36,.52,.05,.28,dk);T(1,0,1.52,.36,.24,.04,.06,0x5a606b);X(0,1.2,.495,.3,.18,.02,lt);X(0,1.21,.5,.18,.06,.02,0xffd23f);L(.3,1.18,.36,.12,.36,.12,0xf2f2f2);L(.3,1.38,.36,.13,.06,.13,0xe8453c);break;   // lunchbox: box, lid, handle, a sticker, a flask
    case 7:T(2,0,1.25,.36,.42,1.0,.22,0xe8453c,0,0,.25);T(1,.14,1.72,.36,.18,.3,.18,0xe8453c,0,0,.25);for(const y of [1.0,1.25,1.5])T(0,(y-1.25)*.25,y,.48,.44,.04,.02,0xffc93c,0,0,.25);X(0,1.26,.49,.12,.12,.02,a);break;   // guitar case: body, neck end, catches, a sticker
    case 8:R(0,1.22,.38,.52,.52,.32,0x9fdcff);X(0,1.48,.38,.42,.04,.26,0xdff4ff);L(.06,1.18,.5,.16,.1,.06,0xff8a1f);L(-.06,1.18,.5,.06,.1,.03,0xff8a1f);X(.1,1.2,.535,.02,.02,.01,0x15171b);L(-.14,1.02,.42,.06,.06,.04,0xffffff);L(.16,1.3,.44,.05,.05,.04,0xffffff);L(0,.96,.38,.5,.08,.32,a);break;   // fishbowl: glass, rim, a goldfish, bubbles, a base in your colour
  }
}

// =====================================================================
//  Emotes and victory poses, on the page's own pose system (index.html's pose() and posePut): each gives, for a time t
//  in seconds, the arms and chest ({lean, turn, roll, L, R} as for pose()), the legs ([x, out, knee] for each), and how
//  far the body lifts and turns. An emote plays on the ground while you stand still (T on a keyboard, the EMOTE button
//  on a touch screen; moving, jumping or shooting stops it) and is sent as `e` in your lx while it plays, so others see
//  it from when they get it. A victory pose plays when you win, for as long as the match's end is shown. Looks only.
// =====================================================================
const HANG=[-1.42,.2,-.14,.25],HANGR=[-1.42,-.2,.14,.25];
const sn=Math.sin,cs=Math.cos;
const EMOTES=[null,
  {dur:3,f:t=>({L:HANG,R:[1.85,-.95+.35*sn(t*9),.14,.5+.35*sn(t*9)],turn:-.12,roll:.05})},
  {dur:6,f:t=>{const b=sn(t*6.3);return{L:[.4+.5*b,.9,-.2,1.2],R:[.4-.5*b,-.9,.2,1.2],roll:.14*b,turn:.25*sn(t*3.15),y:.05*Math.abs(cs(t*6.3)),legs:[.15+.2*Math.max(0,b),-.12,.3+.5*Math.max(0,b),.15+.2*Math.max(0,-b),.12,.3+.5*Math.max(0,-b)]}}},
  {dur:3,f:t=>{const c=.25*(1+sn(t*14))/2;return{L:[.3,-.15+c,0,1.0],R:[.3,.15-c,0,1.0],lean:-.05}}},
  {dur:4,f:t=>{const k=(1-cs(t*7))/2;return{L:[-1.42+3.4*k,.2+.9*k,-.14,.25],R:[-1.42+3.4*k,-.2-.9*k,.14,.25],y:.1*sn(t*7)*sn(t*7),legs:[0,-.08-.3*k,.1,0,.08+.3*k,.1]}}},
  {dur:5,f:t=>{const q=Math.floor(t*3)%4,a=[[1.0,-.8],[-.8,1.0],[1.0,1.0],[-.8,-.8]][q];return{L:[a[0],.6,0,1.57],R:[a[1],-.6,0,1.57],turn:[.4,-.4,0,0][q],y:q>1?.03:0,legs:[q===2?.4:0,-.06,q===2?.7:.05,q===3?.4:0,.06,q===3?.7:.05]}}},
  {dur:2.4,f:t=>({L:[.2,1.5,-.1,.2],R:[.2,-1.5,.1,.2],spin:t*Math.PI*2/1.2,y:.04,legs:[0,-.04,.05,.6,.05,1.4]})}];
const VICTORIES=[null,
  {f:t=>{const b=Math.abs(sn(t*4));return{L:[1.95,.75,-.14,.2+.5*b],R:[1.95,-.75,.14,.2+.5*b],lean:.12,y:.12*b}}},
  {f:t=>({L:[0,1.5,-.05,1.5+.15*sn(t*3)],R:[0,-1.5,.05,1.5+.15*sn(t*3)],lean:-.08,turn:.15*sn(t*1.5),legs:[0,-.12,.05,0,.12,.05]})},
  {f:t=>{const k=Math.min(1,(t%3.2)/.6)*(t%3.2<2.4?1:Math.max(0,1-((t%3.2)-2.4)/.8));return{L:[-.2,.4,-.2,1.6*k],R:[-.6,-.3,.2,1.2*k],lean:-.75*k,legs:[.25*k,-.05,.15*k,-.3*k,.05,.25*k]}}},
  {f:t=>{const p=(t%.8)/.8,h=sn(p*Math.PI);return{L:[1.4+.8*h,.9,-.3,.3],R:[1.4+.8*h,-.9,.3,.3],y:.35*h,legs:[.5*(1-h),-.1-.15*h,.9*(1-h),.5*(1-h),.1+.15*h,.9*(1-h)]}}}];
const _ep=new Map();
function poseOf(o){return G.pose({lean:o.lean,turn:o.turn,roll:o.roll,L:o.L,R:o.R})}
// which emote or victory pose an entity is in now, and since when (stage: e.lxForce from the Locker)
function emoteOf(e,now){
  if(e.lxForce)return e.lxForce;
  const o=e.lxo||{},MS=G.MS;
  if(o.v&&MS&&MS.ph==='end'&&e.alive&&String(MS.wn||'')===(e===G.player?String(G.myId()):e.id)){if(!e.lxVA||e.lxVM!==MS.id){e.lxVA=now;e.lxVM=MS.id}return{k:'v',n:o.v,t0:e.lxVA}}
  if(o.e&&e.alive&&e.onGround&&e.st==='ground'){if(e.lxEN!==o.e){e.lxEN=o.e;e.lxEA=now}const E=EMOTES[o.e];if(E&&now-e.lxEA<E.dur*1000)return{k:'e',n:o.e,t0:e.lxEA}}
  else e.lxEN=0;
  return null;
}
function emote(e,u,pf,m,now){
  const q=emoteOf(e,now);if(!q){u.lxEw=0;return}
  const D=(q.k==='v'?VICTORIES:EMOTES)[q.n];if(!D)return;const t=(now-q.t0)/1000,o=D.f(G.RM?0:t),P=poseOf(o);
  const w=Math.min(1,t/.2)*(q.k==='e'&&!e.lxForce?Math.min(1,(D.dur-t)/.25):1);u.lxEw=w;
  for(let i=0;i<pf.length;i++)pf[i]+=(P[i]-pf[i])*w;
  u.gun.visible=false;
  if(o.legs){const L0=u.legs[0],L1=u.legs[1],g=o.legs;L0.rotation.set(L0.rotation.x+(g[0]-L0.rotation.x)*w,0,L0.rotation.z+(g[1]-L0.rotation.z)*w,'XYZ');L0.k+=(g[2]-L0.k)*w;L1.rotation.set(L1.rotation.x+(g[3]-L1.rotation.x)*w,0,L1.rotation.z+(g[4]-L1.rotation.z)*w,'XYZ');L1.k+=(g[5]-L1.k)*w}
  if(o.y)m.position.y+=o.y*w*G.BS;if(o.spin)m.rotation.y+=o.spin*w;
}
// you: start your chosen emote, and stop it when you move, jump, shoot or it ends
let emoteBtn=null;
function canEmote(){const p=G.player;return G.lockerOn()&&G.canLook()&&p.alive&&p.onGround&&p.st==='ground'&&Math.hypot(p.vel.x,p.vel.z)<1}
function startEmote(){if(!canEmote())return;const n=myEmote(),o=worn();o.e=n;G.setLxNet(str(o));G.player.lxEA=performance.now();G.player.lxEN=n}
function stopEmote(){const o=worn();if(!o.e)return;delete o.e;G.setLxNet(str(o))}
const myEmote=()=>{const n=+G.store.get('em','1')|0;return n>=1&&n<=EMOTE_NAMES.length?n:1};
addEventListener('keydown',e=>{if(e.code!=='KeyT'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||G.kbUsed('KeyT')||!G.lockerOn())return;const a=document.activeElement;if(a&&/INPUT|TEXTAREA/.test(a.tagName))return;if(worn().e)stopEmote();else startEmote()});
function emoteTick(){
  const p=G.player,o=parse(G.myLx||'');
  if(o.e){const E=EMOTES[o.e],t=(performance.now()-(p.lxEA||0))/1000;if(!E||t>E.dur||!p.alive||!p.onGround||Math.hypot(p.vel.x,p.vel.z)>1||G.player.cd>0&&t>.3)stopEmote()}
  if(G.touchUI&&G.lockerOn()){if(!emoteBtn){emoteBtn=document.createElement('button');emoteBtn.className='tb';emoteBtn.id='tEmote';emoteBtn.type='button';emoteBtn.textContent=lxT('EMOTE');
      emoteBtn.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();if(worn().e)stopEmote();else startEmote()});const T=G.$('touch');if(T)T.appendChild(emoteBtn)}
    emoteBtn.hidden=!(canEmote()||o.e)}else if(emoteBtn)emoteBtn.hidden=true;
}

// =====================================================================
//  Dressing an entity, the frame's work
// =====================================================================
function dress(e){
  if(!e||!e.model)return;const o=parse(e.lx||''),u=e.model.userData;e.lxo=o;
  const g=o.g?gliderOf(o.g):null;
  if(g){u.glider.geometry=g;u.glider.material=GLX;u.glider.castShadow=true}else if(u.glider.material===GLX){u.glider.geometry=G.GLIDER_GEO;u.glider.material=G.BMAT}   // (a Locker glider is drawn unskinned: it opens its own way, PLACE)
  u.gs=o.w||0;
  const pk=o.p||0;if((u.lxPk|0)!==pk){u.lxPk=pk;G.setModelColor(e.model,u.hex,u.skinIx,u.fit,u.face)}
}
function setGlider(model,n){const u=model.userData,g=n?gliderOf(n):null;if(g){u.glider.geometry=g;u.glider.material=GLX}else{u.glider.geometry=G.GLIDER_GEO;u.glider.material=G.BMAT}}
function tick(dt){
  emoteTick();
  gT.value+=G.RM?0:dt;uT.value+=G.RM?0:dt;
  if(!!G.MAT.defines&&!!G.MAT.defines.FINE!==!!GLX.defines.FINE){if(G.MAT.defines.FINE)GLX.defines.FINE=1;else delete GLX.defines.FINE;GLX.needsUpdate=true}
  // trails
  const cam=G.camera.position;
  if(G.state!=='menu')for(const e of G.ents){const o=e.lxo;if(!o||!o.t||!e.alive||!e.present||(e.st!=='fall'&&e.st!=='glide'))continue;
    if(cam.distanceToSquared(e.pos)>200*200||!e.model.visible&&e!==G.player)continue;trailFrom(e,TRAILS[o.t],dt,0,e.st==='glide')}
  if(stageEnt&&stageTrail){const T=TRAILS[stageTrail];stageEnt.lxAcc=(stageEnt.lxAcc||0)+dt*T.rate;const p=stageEnt.pos;
    while(stageEnt.lxAcc>=1){stageEnt.lxAcc-=1;const bx=p.x,bz=p.z+.15,c=Math.cos(stageEnt.yaw),s2=Math.sin(stageEnt.yaw);   // from the body, streaming up past it as if falling
      if(T.band){for(let k=0;k<6;k++)emit(T,bx+(k-2.5)*.14*c,p.y+.4,bz-(k-2.5)*.14*s2,T.cols[k],0,3,0);continue}
      emit(T,bx+(Math.random()-.5)*T.spread,p.y+.4,bz+(Math.random()-.5)*T.spread,T.cols[Math.floor(Math.random()*T.cols.length)],(Math.random()-.5)*.6,3+T.vy*.3,(Math.random()-.5)*.6)}}
  if(tp.n)tStep(dt);
  tPts.visible=tp.n>0;
  if(tp.n){tGeo.setDrawRange(0,tp.n);for(const k of ['position','pcol','size','pdat'])tGeo.attributes[k].needsUpdate=true;
    tMat.uniforms.uScale.value=G.renderer.domElement.height/(2*Math.tan(G.camera.fov*Math.PI/360))}
}
const gIMs={};
function gunReset(){for(const k in gIMs)gIMs[k].count=0}
function gunIM(k,s){if(!G.WEAP[k]||!(s>=1&&s<=WRAP_NAMES.length))return G.gunIM[k];let im=gIMs[k];if(!im){im=gIMs[k]=gunMesh(k,G.LIMB_N);G.scene.add(im)}
  if(im.count<G.LIMB_N){const a=im.geometry.attributes.gsk;if(a.array[im.count]!==s){a.array[im.count]=s;a.needsUpdate=true}}return im}
function gunDone(){for(const k in gIMs){const im=gIMs[k];im.visible=im.count>0;if(im.count)im.instanceMatrix.needsUpdate=true}}
function bsOf(oid){if(oid==null)return 0;let e=null;if(oid===G.myId()||oid==='me')e=G.player;else for(const x of G.ents)if(x.id===oid){e=x;break}
  const o=e?parse(e.lx||''):null;return o&&o.b||0}
function bsk(mesh,i,bs){const a=mesh.geometry.attributes.bsk;if(!a||i<0||i>=a.count)return;const v=bs|0;if(a.array[i]!==v){a.array[i]=v;a.needsUpdate=true}}
const bsCol=bs=>BS_DEBRIS[bs]||BS_DEBRIS[0];
const bsMat=bs=>['wood','crate','stone','stone','crate','stone','metal'][bs]||'wood';   // what a skinned piece's crowbar chips and sound are
const botLx=i=>'g'+(1+(i*7)%24)+'t'+(1+i%6)+'w'+(1+(i*5)%19)+'b'+(1+i%6)+'p'+(1+(i*3)%8)+'v'+(1+i%4);

// =====================================================================
//  The Locker's tabs
// =====================================================================
const TABS=[['outfits','Outfits','OUT','FITS'],['p','Backpacks','BACK','PACKS'],['e','Emotes','EMO','TES'],['v','Victory','VIC','TORY'],['g','Gliders','GLI','DERS'],['t','Trails','TRA','ILS'],['w','Gun skins','GUN ','SKINS'],['b','Builds','BUI','LDS']];
// (the HUD the Emote button sits in is left alone by ../lang.js, so it's put in the player's language here; the Locker's own words
// are translated by lang.js, from the page's es.js)
const lxT=s=>window.BackRoomLang?window.BackRoomLang.t(s):s;
const LEDE={outfits:'Pick what you wear. Every outfit is the same size and just as easy to hit as the standard one.',g:'Pick how you glide down. Every glider is held its own way, but you are the same size and fall at the same speed.',t:'A trail follows you while you skydive and glide. It never hides anyone: it fades out close to the camera.',e:'Pick the emote to play in a match: T on a keyboard, the Emote button on a touch screen. Standing still only; moving stops it.',v:'Pick what you do when you win: everyone watching you sees it.',p:'A backpack goes on over any outfit. It keeps your colour on it, so you can still be told apart.',w:'Your weapons in a pattern. The orange tip, the muzzle flash, the rarity band and the crosshair stay the same.',b:'What your walls, floors and ramps look like to everyone. They are just as strong, and just as hard to see through.'};
let stageA=0,lede0=null,tab='outfits',built=false,drawnPics=false,stageEnt=null,stageTrail=0,posed=false,disp=null;
const cards={};
function worn(){return parse(G.myLx)}
function css(){const st=document.createElement('style');st.textContent=
  '.lk-tabs{display:flex;gap:6px;flex-wrap:wrap;flex:none}'
  +'.lk-tabs button{flex:none;padding:7px 12px;font-size:15px;letter-spacing:.04em;min-width:0}'
  +'.lk-tabs button[aria-pressed="true"]{border-color:var(--sun);background:rgba(255,201,60,.18);color:var(--ink)}'
  +'.lk-card .lk-none.lk-big{font-size:34px;color:var(--sun)}'
  +'.lk-card .lk-none{width:100%;aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--ink-dim)}'
  +'@media (orientation:portrait) and (max-width:700px){.lk-tabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.lk-tabs button{padding:6px 9px;font-size:14px}}'
  +'@media (orientation:landscape) and (max-height:480px){.lk-tabs button{padding:5px 9px;font-size:13px}}'
  // the Emote button: beside the move stick (above it on an upright phone), clear of the kill feed and the other buttons
  +'#tEmote{left:calc(166px + env(safe-area-inset-left,0px));bottom:calc(30px + env(safe-area-inset-bottom,0px));width:62px;height:32px;border-radius:16px;font-size:11px}'
  +'@media (orientation:portrait){#tEmote{left:calc(26px + env(safe-area-inset-left,0px));bottom:calc(168px + env(safe-area-inset-bottom,0px))}}';document.head.appendChild(st)}
function buildMenu(){
  built=true;const sec=G.Locker.sec,grid0=G.$('lkGrid');
  const bar=document.createElement('div');bar.className='lk-tabs';bar.setAttribute('role','group');bar.setAttribute('aria-label','Locker sections');
  for(const [id,label] of TABS){const b=document.createElement('button');b.type='button';b.className='ghost-btn';b.dataset.tab=id;b.textContent=label;b.addEventListener('click',()=>setTab(id));bar.appendChild(b)}
  grid0.before(bar);
  for(const [id] of TABS.slice(1)){const gr=document.createElement('div');gr.className='lk-grid';gr.id='lkGrid-'+id;gr.hidden=true;grid0.after(gr);const L=SLOT[id];cards[id]=[];
    for(let n=id==='e'?1:0;n<=L.length;n++){const b=document.createElement('button');b.type='button';b.className='lk-card';
      b.innerHTML=(id==='e'||id==='v')&&!n?'<span class="lk-none lk-big">&ndash;</span><span>None</span>':(n?'<img alt="" hidden>':'<span class="lk-none">'+(id==='g'?'Standard':'None')+'</span>')+'<span>'+G.esc(n?L[n-1]:id==='w'?'No skin':id==='t'?'No trail':id==='b'?'Plywood':id==='p'?'Outfit\'s own':'Standard')+'</span>';
      b.addEventListener('click',()=>pick(id,n));gr.appendChild(b);cards[id][n]=b}}
  setTab('outfits');
}
function pick(id,n){if(!G.lockerOn())return;if(id==='e'){G.store.set('em',String(n||1));stageA=performance.now();mark();return}const o=worn();delete o.e;if(n)o[id]=n;else delete o[id];if(id==='v')stageA=performance.now();G.setLx(str(o));mark()}
function nameOf(id){const o=worn();o.e=myEmote();const n=o[id];return n?SLOT[id][n-1]:id==='w'?'No skin':id==='t'?'No trail':id==='b'?'Plywood':id==='p'?'The outfit\'s own':id==='v'?'No victory pose':'Standard glider'}
function mark(){if(!built)return;const o=worn();o.e=myEmote();for(const id in cards)cards[id].forEach((b,n)=>b.setAttribute('aria-pressed',(o[id]||0)===n?'true':'false'));
  if(tab!=='outfits')G.$('lkName').textContent=nameOf(tab)}
function setTab(id){tab=id;const sec=G.Locker.sec;
  for(const b of sec.querySelectorAll('.lk-tabs button')){b.setAttribute('aria-pressed',b.dataset.tab===id?'true':'false');if(b.dataset.tab===id&&sec.offsetParent!==null){const bar=b.parentNode;if(b.offsetLeft<bar.scrollLeft||b.offsetLeft+b.offsetWidth>bar.scrollLeft+bar.clientWidth)bar.scrollLeft=b.offsetLeft-12}}
  G.$('lkGrid').hidden=id!=='outfits';for(const k in cards)G.$('lkGrid-'+k).hidden=k!==id;
  const t=TABS.find(x=>x[0]===id),h=sec.querySelector('.lk-title');if(h)h.innerHTML=t[2]+'<span>'+t[3]+'</span>';
  const le=sec.querySelector('.lk-lede');if(le)le.textContent=LEDE[id];   // (in English: lang.js shows it in Spanish)
  if(id==='outfits'){if(G.Locker.mark)G.Locker.mark()}else{pics();mark()}
  if(id==='w'&&G.Locker.turn){const C=G.STAGE.CAM;G.Locker.turn(Math.atan2(-C[1],C[0])-.45)}   // side on, so the rifle shows (drag still turns it)
}
function menu(on){if(on&&!built&&G.Locker.sec)buildMenu();if(built)mark()}
function shown(){if(!built)return;setTab(tab)}
// ---- the cards' pictures, drawn once the first time a tab is opened ----
function render(sc,cam,W,H){const R=G.renderer,rt=new THREE.WebGLRenderTarget(W,H),buf=new Uint8Array(W*H*4),cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d'),img=g.createImageData(W,H);
  const oc=new THREE.Color(),oa=R.getClearAlpha();R.getClearColor(oc);R.setClearColor(0x000000,0);
  try{R.setRenderTarget(rt);R.clear();R.render(sc,cam);R.readRenderTargetPixels(rt,0,0,W,H,buf);for(let y=0;y<H;y++)img.data.set(buf.subarray((H-1-y)*W*4,(H-y)*W*4),y*W*4);g.putImageData(img,0,0)}
  finally{R.setRenderTarget(null);R.setClearColor(oc,oa);rt.dispose()}return cv.toDataURL('image/png')}
function lights(sc){sc.add(new THREE.HemisphereLight(0xffffff,0x9aa0aa,.95));const dl=new THREE.DirectionalLight(0xffffff,.55);dl.position.set(3,6,-4);sc.add(dl)}
function gliderPic(n,W,H){const sc=new THREE.Scene();lights(sc);const g=gliderOf(n),m=new THREE.Mesh(g,GLX);sc.add(m);const bb=g.boundingBox,c=bb.getCenter(new V3()),r=bb.getSize(new V3()).length()/2;
  const cam=new THREE.PerspectiveCamera(30,W/H,.1,80),d=r/Math.sin(15*Math.PI/180)*.95;cam.position.copy(c).add(new V3(.42,.55,-.72).normalize().multiplyScalar(d));cam.lookAt(c);return render(sc,cam,W,H)}
function gunPic(n,W,H){const sc=new THREE.Scene();lights(sc);const im=gunMesh('ar',1);im.count=1;im.visible=true;im.geometry.attributes.gsk.array[0]=n;im.setMatrixAt(0,new THREE.Matrix4().makeRotationY(-Math.PI/2-.35));sc.add(im);
  const cam=new THREE.OrthographicCamera(-.75,.75,.75*H/W,-.75*H/W,.1,20);cam.position.set(0,1.2,5);cam.lookAt(0,.05,0);const u=render(sc,cam,W,H);im.geometry.dispose();return u}
function buildPic(n){const W=180,H=270,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),t=tileCanvas(n);
  g.save();g.setTransform(1,.18,0,1,18,40);g.drawImage(t,0,0,110,110);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(104,0,6,110);g.restore();
  g.save();g.setTransform(1,-.12,.55,.5,30,185);g.drawImage(t,0,0,130,110);g.restore();return c.toDataURL('image/png')}
function trailPic(n){const W=180,H=270,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),T=TRAILS[n],r=rng(40+n),S=64;
  for(let i=0;i<26;i++){const f=i/25,x=40+f*100+Math.sin(f*6)*14,y=245-f*215,s=(T.s0+(T.s1-T.s0)*(1-f))*44+6;
    const cols=T.band?[T.cols[i%6]]:T.cols;const col=new THREE.Color(cols[Math.floor(r()*cols.length)]);
    const tmp=document.createElement('canvas');tmp.width=tmp.height=S;const tg=tmp.getContext('2d');tg.drawImage(tTex.image,(T.sp%4)*S,Math.floor(T.sp/4)*S,S,S,0,0,S,S);tg.globalCompositeOperation='multiply';tg.fillStyle='#'+col.getHexString();tg.fillRect(0,0,S,S);tg.globalCompositeOperation='destination-in';tg.drawImage(tTex.image,(T.sp%4)*S,Math.floor(T.sp/4)*S,S,S,0,0,S,S);
    if(T.band){for(let k=0;k<6;k++){const t2=document.createElement('canvas');t2.width=t2.height=S;const g2=t2.getContext('2d');g2.drawImage(tTex.image,(T.sp%4)*S,0,S,S,0,0,S,S);g2.globalCompositeOperation='multiply';g2.fillStyle='#'+new THREE.Color(T.cols[k]).getHexString();g2.fillRect(0,0,S,S);g2.globalCompositeOperation='destination-in';g2.drawImage(tTex.image,(T.sp%4)*S,0,S,S,0,0,S,S);g.globalAlpha=.9*(1-f*.6);g.drawImage(t2,x-30+k*9-s/2,y-s/2,s,s)}continue}
    g.globalAlpha=(T.a)*(1-f*.7);g.drawImage(tmp,x-s/2+(r()-.5)*20,y-s/2,s,s)}
  return c.toDataURL('image/png')}
function pics(){if(drawnPics||tab==='outfits')return;drawnPics=true;
  try{for(const id of ['g','t','w','b'])cards[id].forEach((b,n)=>{if(!n)return;const im=b.firstChild;im.src=id==='g'?gliderPic(n,180,270):id==='w'?gunPic(n,180,270):id==='b'?buildPic(n):trailPic(n);im.hidden=false});
    const pp=packPics();cards.p.forEach((b,n)=>{if(!n||!pp[n-1])return;const im=b.firstChild;im.src=pp[n-1];im.hidden=false});
    for(const k of ['e','v']){const pp=posePics(k);cards[k].forEach((b,n)=>{if(!n||!pp[n-1])return;const im=b.firstChild;im.src=pp[n-1];im.hidden=false})}}catch(e){console.error(e)}}
// emotes and victory poses: your character caught in the middle of each (a model posed by the page's own animModel, its
// legs as plain meshes for the picture), from the front
function posePics(kind){
  const out=[],W=180,H=270,L=kind==='e'?EMOTES:VICTORIES,T=kind==='e'?[0,.32,.36,.5,.48,.1,.3]:[0,.4,.5,1.2,.25];
  const sc=new THREE.Scene();lights(sc);const cam=new THREE.OrthographicCamera(-.95,.95,1.42,-1.42,.1,40);cam.position.set(2.3,2.1,-6);cam.lookAt(0,1.27,0);
  const u0=G.player.model.userData,cp=G.camera.position;
  for(let n=1;n<L.length;n++){const m=G.makeModel(G.player.hex,u0.skinIx,u0.fit,'');
    try{const e=G.newEnt(m);Object.assign(e,{id:'pic',present:true,alive:true,local:false,st:'ground',onGround:true,glide:false,yaw:0});e.pos.set(cp.x,cp.y,cp.z-3);
      e.lxForce={k:kind,n,t0:performance.now()-T[n]*1000};for(let i=0;i<8;i++)G.animModel(e,1/30);
      m.position.set(0,m.position.y-e.pos.y,0);m.rotation.y=0;m.userData.glider.visible=false;for(const l of m.userData.legs)l.add(new THREE.Mesh(G.LEG_GEO,G.MAT));
      m.updateMatrixWorld(true);sc.add(m);out.push(render(sc,cam,W,H));sc.remove(m)}finally{G.disposeModel(m)}}
  return out}
// backpacks: the Noob from behind, wearing each (Locker.pics renders the body; the pack goes in through pk)
function packPics(){const out=[];for(let n=1;n<=PACK_NAMES.length;n++)out.push(G.Locker.pics([G.NOOB],180,270,true,null,n)[0]);return out}
// ---- the stage: the character holding the glider, gliding with the trail, holding a rifle, or beside three pieces ----
function stage(dt,model,yaw){
  const V=G.Locker.view,o=worn(),S=G.STAGE.SPOT;
  {const u=model.userData,pk=o.p||0;if((u.lxPk|0)!==pk){u.lxPk=pk;G.setModelColor(model,u.hex,u.skinIx,u.fit,u.face)}}
  if(tab==='outfits'||tab==='p'||!built){V.zoom=1;V.y=0;stageTrail=0;if(disp)disp.visible=false;if(posed){posed=false;stageEnt=null;G.Locker.fresh()}return}
  if(!stageEnt||stageEnt.model!==model){stageEnt=G.newEnt(model);Object.assign(stageEnt,{id:'stage',present:true,alive:true,local:false})}
  const e=stageEnt;posed=true;const air=tab==='g'||tab==='t';e.pos.set(S[0],S[1]+(air?.55:0),S[2]);e.vel.set(0,0,0);e.yaw=yaw;
  e.st=air?'glide':'ground';e.glide=air;e.onGround=!air;
  const em=tab==='e'?myEmote():tab==='v'?o.v||0:0;   // an emote (played again and again) or the victory pose
  if(em){const now=performance.now(),D=tab==='e'?EMOTES[em]:null;if(D&&now-stageA>D.dur*1000+700)stageA=now;e.lxForce={k:tab,n:em,t0:stageA}}else e.lxForce=null;
  e.lxo={g:air?o.g||0:0};setGlider(model,air?o.g||0:0);model.userData.gs=tab==='w'?o.w||0:0;
  G.setHeldModel(model,tab==='w'?'ar':'cb',tab==='w'?3:-1);
  G.animModel(e,dt);model.visible=true;
  stageTrail=tab==='t'?o.t||0:0;
  V.zoom=air?1.85:tab==='w'?.8:tab==='b'?2.7:1.15;V.y=air?1.0:tab==='w'?.38:tab==='b'?1.3:.15;
  if(tab==='b'){if(!disp)disp=makeDisp();disp.visible=true;const n=o.b||0;if(disp.userData.n!==n){disp.userData.n=n;for(const m of disp.children)m.material=n?dispMat(n):G.plyMat}
    const C=G.STAGE.CAM;disp.position.set(S[0],S[1],S[2]);disp.rotation.y=Math.atan2(-C[0],-C[1])}else if(disp)disp.visible=false;   // the pieces stay behind the character, facing the camera
}
const dmats=[];
function dispMat(n){if(!dmats[n]){const t=new THREE.CanvasTexture(tileCanvas(n));t.anisotropy=4;dmats[n]=new THREE.MeshLambertMaterial({map:t})}return dmats[n]}
function makeDisp(){const g=new THREE.Group();const w=new THREE.Mesh(G.geoPWall,G.plyMat);w.position.set(-1.2,2,1.6);const f=new THREE.Mesh(G.geoPFloor,G.plyMat);f.position.set(.4,.12,1.6);f.scale.set(.6,1,.6);
  const r=new THREE.Mesh(G.geoPRamp,G.plyMat);r.position.set(2.4,1.2,0);r.rotation.set(-Math.PI/4,Math.PI/2,0,'YXZ');r.scale.set(.6,1,.6);g.add(w,f,r);g.visible=false;G.scene.add(g);return g}

return{relang(){if(emoteBtn)emoteBtn.textContent=lxT('EMOTE')},canEmote,pick,emote,EMOTES,VICTORIES,startEmote,stopEmote,pack,dress,tick,gunReset,gunIM,gunDone,bsOf,bsk,bsCol,bsMat,botLx,menu,shown,stage,gstyle,HOLDS,
  // for tests and contact sheets
  parse,str,GLIDER_NAMES,TRAIL_NAMES,WRAP_NAMES,BUILD_NAMES,gliderOf,setGlider,gunMesh,GLX,GSK,tp,TRAILS,emit,buildTex,tileCanvas,setTab,get tab(){return tab},gT,uT,gliderPic,gunPic};
};
