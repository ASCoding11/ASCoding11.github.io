/*
 * Rampline's hidden garage: 42 more cars, paints, wheels, tyre smoke and horns, and the Captain's garage screen.
 *
 * NOT PUBLIC YET. index.html fetches this file only when something needs it:
 *   - this player may see the garage (X.on: RAMPLINE_PUBLIC in index.html, a captain's account (../captains.js), or
 *     ?garage=1 on localhost or in an automated browser). X.on can change while the page is open (a captain's account
 *     becomes known a moment after the page loads and goes away on sign-out): index.html then calls access().
 *   - or a board row has a look (`lk`) to draw. Then this file only draws other people's ghosts: no garage button,
 *     nothing of this player's own is read, worn or sent.
 * For everyone else this file is never loaded and the game is exactly as it was.
 *
 * Everything is free to wear while the shop is shut (../cosmetics.js is off): nothing is owned, bought or earned. What a
 * captain wears is saved as rampline:cos ({v: 1, car, paint, wheels, smoke, horn}: item numbers, 0 for none). The
 * numbers are the ones the items have in ../cosmetics.js (game 'rampline'): never renumber or reuse one.
 *
 * Looks only: nothing in here is read by the physics, the checks, the bot or the timing. The car is a point with two
 * spheres whatever is drawn round it, so a bus and a go-kart drive, crash and finish exactly alike.
 *
 * Drawing. A car is still ONE mesh with vertex colours plus its wheels as ONE InstancedMesh, the same two draw calls as
 * the three garage cars (a ghost too), whatever it is. Every car fits the same box as the garage cars give or take a
 * little (about 2 m wide, 4.6 m long, under 2.1 m from the road), so none hides more of the road than a Hopper would.
 * A car that would sit in front of the Hood camera (`hood`) is hidden in that camera only; the wheels stay.
 *
 * Online. The look of your car travels on your board entries (rooms/rl-b2-<key>/players/<uid>) as one short string
 * `lk` = "1.<car>.<paint>.<wheels>" beside the car and paint older pages already read (k, p). Pages from before this
 * file ignore it and draw k and p as before. On reading, index.html checks the whole string against one pattern
 * (lkOf) and parse() below checks every number against this catalogue: anything unknown is drawn as the plain car.
 * Tyre smoke and horns are your own only (ghosts make no smoke and no sound), so they are not sent.
 */
window.RamplineGarage=function(X){
const _t=window.BackRoomLang?BackRoomLang.t:(s,v)=>s.replace(/\{(\w+)\}/g,(m,n)=>v&&v[n]!=null?v[n]:m);   // Spanish (../lang.js, es.js)
'use strict';
const {THREE,PAINT,WHEEL,store}=X;
const V3=THREE.Vector3;
// colours shared by many cars
const DK=0x1d2333,GL=0x9fd8ff,HL=0xfff6c8,TL=0xff3344,CH=0xd5dce6,TY=0x24262e,WH=0xf6f7f9,MET=0x8a93a6,AMB=0xffa31a;

// ======================= building blocks: one list of triangles, one colour each =======================
// Every solid turns its faces away from its own middle, so the order corners are given in never matters.
function Geo(){
  const P=[],C=[];let M=null;const tv=new V3();
  const tp=p=>{if(!M)return p;tv.set(p[0],p[1],p[2]).applyMatrix4(M);return [tv.x,tv.y,tv.z]};
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  function tri(a,b,c,col){const n=crs(sub(b,a),sub(c,a));if(dot(n,n)<1e-12)return;a=tp(a);b=tp(b);c=tp(c);P.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);C.push(col)}
  // a flat face (3+ corners in order round it), turned to face away from point o
  function face(pts,col,o){
    let n=[0,0,0],cen=[0,0,0];
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];n[0]+=(a[1]-b[1])*(a[2]+b[2]);n[1]+=(a[2]-b[2])*(a[0]+b[0]);n[2]+=(a[0]-b[0])*(a[1]+b[1]);cen[0]+=a[0];cen[1]+=a[1];cen[2]+=a[2]}
    cen=cen.map(v=>v/pts.length);
    if(o&&dot(sub(cen,o),n)<0)pts=pts.slice().reverse();
    for(let i=1;i+1<pts.length;i++)tri(pts[0],pts[i],pts[i+1],col);
  }
  const mid=ps=>{const c=[0,0,0];ps.forEach(p=>{c[0]+=p[0];c[1]+=p[1];c[2]+=p[2]});return c.map(v=>v/ps.length)};
  // eight corners: bottom (x0 z0, x1 z0, x1 z1, x0 z1) then top in the same order; fc: colours by face
  function hex(c,col,fc){fc=fc||{};const o=mid(c);
    const F=[[0,1,2,3,'bottom'],[4,5,6,7,'top'],[0,1,5,4,'back'],[1,2,6,5,'right'],[2,3,7,6,'front'],[3,0,4,7,'left']];
    for(const f of F){const k=fc[f[4]]!=null?fc[f[4]]:(fc.side!=null&&(f[4]==='left'||f[4]==='right')?fc.side:col);if(k===false)continue;face([c[f[0]],c[f[1]],c[f[2]],c[f[3]]],k,o)}}
  // a box: centre x and z, BOTTOM y, sizes
  function box(x,y,z,sx,sy,sz,col,fc){const x0=x-sx/2,x1=x+sx/2,z0=z-sz/2,z1=z+sz/2,y1=y+sy;
    hex([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],col,fc)}
  // a cabin or tapered block: bottom x0..x1 by zb0..zb1 at y0, top narrower by ti each side, zt0..zt1 at y1
  function hull(x0,x1,y0,y1,zb0,zb1,zt0,zt1,ti,col,fc){
    hex([[x0,y0,zb0],[x1,y0,zb0],[x1,y0,zb1],[x0,y0,zb1],[x0+ti,y1,zt0],[x1-ti,y1,zt0],[x1-ti,y1,zt1],[x0+ti,y1,zt1]],col,fc)}
  // a cabin with glass all round and a roof in col
  const cabin=(x0,x1,y0,y1,zb0,zb1,zt0,zt1,ti,col,glass)=>hull(x0,x1,y0,y1,zb0,zb1,zt0,zt1,ti,glass==null?GL:glass,{top:col,bottom:false});
  // a round bar along an axis ('x', 'y' or 'z'), centred at (cx, cy, cz): radius r at the low end, r2 at the high end (a cone
  // when r2 is 0), len long, seg sides; caps in cap (false: none)
  function cyl(ax,cx,cy,cz,r,len,col,seg,cap,r2,rot){
    seg=seg||10;r2=r2==null?r:r2;cap=cap==null?col:cap;rot=rot||0;
    const at=(t,a,rr)=>{const c=Math.cos(a)*rr,s=Math.sin(a)*rr;return ax==='x'?[cx+t,cy+c,cz+s]:ax==='y'?[cx+c,cy+t,cz+s]:[cx+c,cy+s,cz+t]};
    const h=len/2,o=at(0,0,0);
    for(let i=0;i<seg;i++){const a0=rot+i/seg*Math.PI*2,a1=rot+(i+1)/seg*Math.PI*2;face([at(-h,a0,r),at(-h,a1,r),at(h,a1,r2),at(h,a0,r2)],col,o)}
    if(cap!==false){const lo=[],hi=[];for(let i=0;i<seg;i++){const a=rot+i/seg*Math.PI*2;lo.push(at(-h,a,r));hi.push(at(h,a,r2))}if(r>0)face(lo,cap,o);if(r2>0)face(hi,cap,o)}
  }
  // a round lump: centre, radii, sides round and rings top to bottom; colFn(ring, side) may pick colours
  function ball(cx,cy,cz,rx,ry,rz,col,seg,rings,colFn){
    seg=seg||8;rings=rings||5;const o=[cx,cy,cz];
    const pt=(j,i)=>{const v=j/rings*Math.PI,u=i/seg*Math.PI*2;return [cx+Math.sin(v)*Math.cos(u)*rx,cy+Math.cos(v)*ry,cz+Math.sin(v)*Math.sin(u)*rz]};
    for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){const k=colFn?colFn(j,i):col;face([pt(j,i),pt(j,i+1),pt(j+1,i+1),pt(j+1,i)],k,o)}
  }
  // rings joined into a tube along an axis. axis 'z': each ring [z, rx, ry, cx, cy, col]; axis 'y': [y, rx, rz, cx, cz, col].
  // ex rounds the rings off square (2 an ellipse, 4 a rounded box); caps close the two ends (cap0, cap1: a colour or false)
  function loft(ax,rings,seg,col,o2){
    o2=o2||{};const ex=o2.ex||2,rot=o2.rot||0;
    const pt=(r,i)=>{const t=rot+i/seg*Math.PI*2,c=Math.cos(t),s=Math.sin(t),e=2/ex,x=r[1]*Math.sign(c)*Math.pow(Math.abs(c),e),y=r[2]*Math.sign(s)*Math.pow(Math.abs(s),e);
      return ax==='z'?[(r[3]||0)+x,(r[4]||0)+y,r[0]]:[(r[3]||0)+x,r[0],(r[4]||0)+y]};
    const cen=r=>ax==='z'?[r[3]||0,r[4]||0,r[0]]:[r[3]||0,r[0],r[4]||0];
    for(let j=0;j+1<rings.length;j++){const a=rings[j],b=rings[j+1],o=mid([cen(a),cen(b)]);
      for(let i=0;i<seg;i++){const k=o2.colFn?o2.colFn(j,i):(a[5]!=null?a[5]:col);face([pt(a,i),pt(a,i+1),pt(b,i+1),pt(b,i)],k,o)}}
    const capAt=(r,other,k)=>{if(k===false||!(r[1]>0&&r[2]>0))return;const ps=[];for(let i=0;i<seg;i++)ps.push(pt(r,i));face(ps,k,cen(other))};
    capAt(rings[0],rings[1],o2.cap0!=null?o2.cap0:col);capAt(rings[rings.length-1],rings[rings.length-2],o2.cap1!=null?o2.cap1:col);
  }
  // a square bar from a to b, t thick (no ends: they are too small to see)
  function rod(a,b,t,col){
    const d=sub(b,a),L=Math.hypot(d[0],d[1],d[2]);if(L<1e-6)return;const dn=d.map(v=>v/L);
    let u=crs(dn,Math.abs(dn[1])<.9?[0,1,0]:[1,0,0]);const ul=Math.hypot(u[0],u[1],u[2]);u=u.map(v=>v/ul*t/2);const w=crs(dn,u);
    const c=[[1,1],[-1,1],[-1,-1],[1,-1]].map(([p,q])=>[u[0]*p+w[0]*q,u[1]*p+w[1]*q,u[2]*p+w[2]*q]),o=mid([a,b]);
    for(let i=0;i<4;i++){const p=c[i],q=c[(i+1)%4];face([[a[0]+p[0],a[1]+p[1],a[2]+p[2]],[a[0]+q[0],a[1]+q[1],a[2]+q[2]],[b[0]+q[0],b[1]+q[1],b[2]+q[2]],[b[0]+p[0],b[1]+p[1],b[2]+p[2]]],col,o)}
  }
  // a flat panel on the outside of a side: side '+x' '-x' '+z' '-z' '+y'; at = that coordinate; (u, v) its middle in the
  // other two coordinates (for x sides: z then y; for z sides: x then y; for +y: x then z); w, h its size
  function plate(side,at,u,v,w,h,col){
    const s=side[0]==='-'?-1:1,a=side[1],q=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([du,dv])=>a==='x'?[at,v+dv,u+du]:a==='z'?[u+du,v+dv,at]:[u+du,at,v+dv]);
    const o=a==='x'?[at-s,v,u]:a==='z'?[u,v,at-s]:[u,at-s,v];face(q,col,o)}
  // a polygon panel on a side (points as [u, v] like plate); a star and a disc are made with it
  function poly(side,at,pts,col){const s=side[0]==='-'?-1:1,a=side[1],q=pts.map(([u,v])=>a==='x'?[at,v,u]:a==='z'?[u,v,at]:[u,at,v]);
    const c=mid(q),o=a==='x'?[c[0]-s,c[1],c[2]]:a==='z'?[c[0],c[1],c[2]-s]:[c[0],c[1]-s,c[2]];face(q,col,o)}
  const disc=(side,at,u,v,r,col,seg)=>{const p=[];seg=seg||10;for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2;p.push([u+Math.cos(a)*r,v+Math.sin(a)*r])}poly(side,at,p,col)};
  function star(side,at,u,v,r,col){const o=a=>[u+Math.sin(a)*r,v+Math.cos(a)*r],n=a=>[u+Math.sin(a)*r*.42,v+Math.cos(a)*r*.42];
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2;poly(side,at,[o(a),n(a+Math.PI/5),[u,v],n(a-Math.PI/5)],col)}}
  // draw fn with its points moved to (px, py, pz) and turned by (rx, ry, rz) radians
  function at(px,py,pz,rx,ry,rz,fn){const old=M,m=new THREE.Matrix4().compose(new V3(px,py,pz),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)),new V3(1,1,1));
    M=old?old.clone().multiply(m):m;try{fn()}finally{M=old}}
  // both sides: fn(+1) and fn(-1)
  const both=fn=>{fn(1);fn(-1)};
  function geometry(){
    const g=new THREE.BufferGeometry(),n=P.length/3,col=new Float32Array(n*3),c=new THREE.Color();
    for(let t=0;t<C.length;t++){c.setHex(C[t]);for(let k=0;k<3;k++){const o=(t*3+k)*3;col[o]=c.r;col[o+1]=c.g;col[o+2]=c.b}}
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();
    return g;
  }
  return {tri,face,hex,box,hull,cabin,cyl,ball,loft,rod,plate,poly,disc,star,at,both,geometry,get tris(){return C.length},P};
}
// colour helpers
const mix=(a,b,t)=>{const c=new THREE.Color(a).lerp(new THREE.Color(b),t);return c.getHex()};
const dark=(a,t)=>mix(a,0x0b1020,t==null?.35:t),lite=(a,t)=>mix(a,0xffffff,t==null?.35:t);

// ======================= wheels =======================
// One wheel, radius 1 and 1 wide across x (the InstancedMesh scales it to each car's size). Each design dresses the
// outside of both faces; the tyre is the same 12-sided drum for all of them.
function wheelDesign(key){
  const g=Geo(),F=(s,i)=>s*(.5+.004+i*.008);   // the i-th layer stuck on face s (+1 or -1)
  const tyre=(c,r)=>g.cyl('x',0,0,0,r||1,1,c==null?TY:c,12);
  const disc=(s,i,r,c,seg)=>g.disc(s>0?'+x':'-x',F(s,i),0,0,r,c,seg||12);
  const ring=(s,i,r0,r1,c,n)=>{n=n||16;for(let k=0;k<n;k++){const a0=k/n*Math.PI*2,a1=(k+1)/n*Math.PI*2;g.poly(s>0?'+x':'-x',F(s,i),[[Math.cos(a0)*r0,Math.sin(a0)*r0],[Math.cos(a1)*r0,Math.sin(a1)*r0],[Math.cos(a1)*r1,Math.sin(a1)*r1],[Math.cos(a0)*r1,Math.sin(a0)*r1]],c)}};
  const spokes=(s,i,n,r0,r1,w,c,twist)=>{for(let k=0;k<n;k++){const a=k/n*Math.PI*2,b=a+(twist||0),x=F(s,i);g.rod([x,Math.cos(a)*r0,Math.sin(a)*r0],[x,Math.cos(b)*r1,Math.sin(b)*r1],w,c)}};
  const wedge=(s,i,a0,a1,r,c)=>g.poly(s>0?'+x':'-x',F(s,i),[[0,0],[Math.cos(a0)*r,Math.sin(a0)*r],[Math.cos((a0+a1)/2)*r,Math.sin((a0+a1)/2)*r],[Math.cos(a1)*r,Math.sin(a1)*r]],c);
  const both=fn=>{fn(1);fn(-1)};
  const knobs=(c,n)=>{tyre(c,.88);for(let k=0;k<n;k++){const a=k/n*Math.PI*2;g.at(0,0,0,a,0,0,()=>g.box(k%2?.22:-.22,.86,0,.5,.14,.3,c))}};
  switch(key){
    case 'whitewall':tyre();both(s=>{disc(s,0,.8,0xf4f4f0);disc(s,1,.56,CH);disc(s,2,.22,0xaab4c2)});break;
    case 'spokes':tyre();both(s=>{ring(s,0,.6,.74,CH);disc(s,0,.6,0x33384a);spokes(s,1,12,.12,.66,.05,CH,.5);disc(s,2,.16,CH,8)});break;
    case 'star':tyre();both(s=>{disc(s,0,.72,0x3a3f50);for(let k=0;k<5;k++){const a=k/5*Math.PI*2+Math.PI/2;wedge(s,1,a-.22,a+.22,.7,0xffc61a)}disc(s,2,.2,0xffe08a,8)});break;
    case 'knobbly':knobs(TY,10);both(s=>{disc(s,0,.56,0x2e3240);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;g.disc(s>0?'+x':'-x',F(s,1),Math.cos(a)*.34,Math.sin(a)*.34,.07,0xbfc6d2,6)}disc(s,1,.14,0xbfc6d2,8)});break;
    case 'neon':tyre(0x1b1d24);both(s=>{disc(s,0,.72,0x15172a);ring(s,1,.52,.66,0x3dffb0);ring(s,2,.16,.26,0x3dffb0,10);spokes(s,1,4,.26,.52,.06,0x2bd6ff)});break;
    case 'wood':tyre(0xc8945a,1);both(s=>{ring(s,0,.82,.9,0xa8743a);disc(s,0,.3,0xa8743a);g.cyl('x',s*.62,0,0,.16,.24,0x8b5a2b,8)});break;
    case 'steelie':tyre();both(s=>{disc(s,0,.72,0xd8202f);for(let k=0;k<5;k++){const a=k/5*Math.PI*2;g.disc(s>0?'+x':'-x',F(s,1),Math.cos(a)*.44,Math.sin(a)*.44,.1,0x5a0d14,6)}disc(s,1,.22,CH,8)});break;
    case 'turbine':tyre();both(s=>{disc(s,0,.72,0x2a2f3c);ring(s,1,.62,.72,CH);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;wedge(s,1,a,a+.42,.62,k%2?CH:0xaab4c2)}disc(s,2,.14,0x2a2f3c,8)});break;
    case 'candy':tyre();both(s=>{for(let k=0;k<8;k++)wedge(s,0,k/8*Math.PI*2,(k+1)/8*Math.PI*2,.74,k%2?0xffffff:0xff5fa8);disc(s,1,.18,0xff5fa8,8)});break;
    case 'flower':tyre();both(s=>{disc(s,0,.74,0xffffff);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;g.disc(s>0?'+x':'-x',F(s,1),Math.cos(a)*.36,Math.sin(a)*.36,.2,k%2?0xff7ab8:0xb46cff,8)}disc(s,2,.2,0xffd21f,8)});break;
    case 'slicks':tyre();both(s=>{ring(s,0,.78,.92,0xffd21f,20);disc(s,0,.66,0x30343f);spokes(s,1,6,.1,.6,.11,0xffc61a);disc(s,2,.13,0xffc61a,6)});break;
    case 'rainbow':tyre();both(s=>{[0xff4d4d,0xff9f1a,0xffe14a,0x3ddc97,0x3b82f6,0xa855f7].forEach((c,i)=>disc(s,i,.8-i*.12,c,14))});break;
    // the cars' own wheels (not in the catalogue)
    case 'tractor':knobs(TY,12);both(s=>{disc(s,0,.6,0xffc21a);disc(s,1,.2,0x7a5a10,8)});break;
    case 'mesh':tyre(0xb9c0cc);both(s=>{ring(s,0,.82,1,0x8a93a6);disc(s,0,.82,0x4a5160);spokes(s,1,8,.1,.8,.06,0xd5dce6,.4);disc(s,2,.2,0xe0b23a,8)});
      for(let k=0;k<12;k++){const a=k/12*Math.PI*2;g.at(0,0,0,a,0,0,()=>g.box(0,.98,0,1.02,.05,.12,0xe0b23a))}break;
    case 'tin':tyre(0x2b2b33);both(s=>{disc(s,0,.7,0xe0453c);disc(s,1,.5,0xf6f7f9);disc(s,2,.18,0xe0453c,8)});break;
    case 'rc':knobs(0x2b2d36,12);both(s=>{disc(s,0,.62,0xf6f7f9);ring(s,1,.3,.42,0xd5dce6);disc(s,1,.14,0x2b2d36,6)});break;
    case 'pram':tyre(0xf2f2ee,1);both(s=>{ring(s,0,.84,1.0,0xe8e8e2);spokes(s,0,10,.08,.84,.035,0x9aa3b0);disc(s,1,.12,0x9aa3b0,8)});break;
    case 'plate':tyre(0xf8f6ee);both(s=>{ring(s,0,.7,1.0,0xece6d6,14);for(let k=0;k<14;k++){const a=k/14*Math.PI*2;g.disc(s>0?'+x':'-x',F(s,1),Math.cos(a)*.85,Math.sin(a)*.85,.05,0xd8d0bc,4)}disc(s,0,.7,0xfffdf6,14);disc(s,1,.08,0x8a6a45,6)});break;
    case 'caster':tyre(0x30333d);both(s=>{disc(s,0,.62,0x9aa3b0);disc(s,1,.2,0x3a3f4c,8)});break;
    case 'brass':tyre(0xc99a2e);both(s=>{disc(s,0,.7,0xe8bf4a);disc(s,1,.3,0xb3822a,8)});break;
    default:tyre();both(s=>disc(s,0,.6,CH));
  }
  const geo=g.geometry();geo.userData.tris=g.tris;return geo;
}
const wheelGeos={};
const wheelGeo=key=>wheelGeos[key]||(wheelGeos[key]=wheelDesign(key));

// ======================= the catalogue (numbers as in ../cosmetics.js) =======================
// Paints: a new colour for the car's own paintwork (the parts the garage swatches paint).
const PAINTS=[null,
  {name:'Candy Apple',c:0xd8202f},{name:'Tangerine',c:0xff8a1f},{name:'Lemon Drop',c:0xfff04a},{name:'Lime Fizz',c:0x9be22d},
  {name:'Mint',c:0x7fe8c4},{name:'Teal',c:0x14a3a3},{name:'Sky',c:0x7cc8ff},{name:'Midnight',c:0x23408f},
  {name:'Lavender',c:0xb9a3ff},{name:'Grape',c:0x7339d9},{name:'Bubblegum',c:0xff9ed1},{name:'Magenta',c:0xe0279a},
  {name:'Copper',c:0xc8743c},{name:'Sand',c:0xe8cf9a},{name:'Gold',c:0xe8b93a},{name:'Silver',c:0xc5ccd6},
  {name:'Jersey Blue',c:0x1f5fd6},{name:'Turf Green',c:0x2f9e44},{name:'Ice White',c:0xeef4f8},{name:'Varsity Maroon',c:0x7a1f3d},
  {name:'Gunmetal',c:0x5a6170},{name:'Tuxedo Black',c:0x1b1d26},{name:'Parrot Green',c:0x22c35a},{name:'Plank Brown',c:0x8a5a2b},{name:'Circuit Green',c:0x0f7a4a}];
const WHEELS=[null,
  {name:'Whitewalls',k:'whitewall'},{name:'Wire Spokes',k:'spokes'},{name:'Gold Star',k:'star'},{name:'Off-Road',k:'knobbly'},
  {name:'Neon Rings',k:'neon'},{name:'Wooden',k:'wood'},{name:'Red Steelies',k:'steelie'},{name:'Turbine',k:'turbine'},
  {name:'Candy Swirl',k:'candy'},{name:'Flower Caps',k:'flower'},{name:'Race Slicks',k:'slicks'},{name:'Rainbow Rings',k:'rainbow'}];
// Tyre smoke: what comes off the back wheels in a slide (one colour, or a colour per puff)
const SMOKES=[null,
  {name:'Pink',c:0xff7ab8},{name:'Sky Blue',c:0x6cc4ff},{name:'Lime',c:0xa3f05a},{name:'Purple',c:0xb07aff},{name:'Gold',c:0xffcf4a},
  {name:'Orange',c:0xff9442},{name:'Red',c:0xff5a5a},{name:'Mint',c:0x7fe8c4},{name:'Rainbow',c:-1},{name:'Confetti',c:-2}];
// Horns: H on a keyboard, the horn button on a touch screen (both only once one is chosen)
const HORNS=[null,
  {name:'Beep Beep'},{name:'Clown Honk'},{name:'Air Horn'},{name:'Little Tune'},{name:'Duck Quack'},{name:'Bike Bell'},
  {name:'Squeaky Toy'},{name:'Space Zap'},{name:'Foghorn'},{name:'Ice Cream Jingle'},{name:'Train Whistle'},{name:"Ship's Bell"},{name:'Ref Whistle'}];

// ======================= the cars =======================
// Each car: its name, its group, its own colour (own: used for its paintwork until a paint is chosen; null: the garage
// swatch), its own wheels (a design above, or null for the garage's rims), its wheels W ([x, z, radius, width, steers]),
// and draw(g, m): its body in the car's frame (x across, y up, z forwards; the road is 0.55 below y = 0, as RL.PH.ride),
// with m its paintwork colour.
const R=.55;   // the road is at y = -R
const W4=(x,zf,zr,rf,rr,wf,wr,xr)=>[[x,zf,rf,wf,1],[-x,zf,rf,wf,1],[xr||x,zr,rr,wr||wf,0],[-(xr||x),zr,rr,wr||wf,0]];
const lights=(g,z,y,x,w,h,c)=>g.both(s=>g.plate(z>0?'+z':'-z',z,s*x,y,w,h,c==null?(z>0?HL:TL):c));
const sideDisc=(g,x,z,y,r,c,seg)=>g.both(s=>g.disc(s>0?'+x':'-x',s*x,z,y,r,c,seg));
const sidePlate=(g,x,z,y,w,h,c)=>g.both(s=>g.plate(s>0?'+x':'-x',s*x,z,y,w,h,c));
const CARS=[null,
// ---------------- Normal cars ----------------
{name:'Muscle Car',grp:'normal',own:null,wheel:null,W:[[.86,1.35,.37,.32,1],[-.86,1.35,.37,.32,1],[.86,-1.3,.42,.44,0],[-.86,-1.3,.42,.44,0]],draw(g,m){
  g.box(0,-.26,0,1.9,.48,4.3,m,{bottom:false});g.box(0,-.27,0,1.94,.1,4.34,DK,{top:false,bottom:false});
  g.hull(-.5,.5,.22,.3,.6,1.95,.75,1.75,.08,m,{bottom:false});g.box(0,.27,1.05,.46,.15,.6,DK,{bottom:false});   // bonnet bulge and its scoop
  g.cabin(-.84,.84,.22,.7,-1.65,.5,-1.05,-.08,.12,m);
  g.box(0,.22,-2.02,1.76,.07,.3,m);g.both(s=>g.box(s*.8,.22,-1.95,.08,.04,.12,DK));            // ducktail lip
  g.box(0,-.25,2.16,1.9,.13,.08,CH);g.box(0,-.25,-2.16,1.9,.13,.08,CH);g.plate('+z',2.152,0,-.03,1.3,.2,DK);
  lights(g,2.153,-.03,.72,.22,.17);lights(g,-2.152,.03,.55,.6,.12);g.plate('-z',-2.152,0,.03,.3,.12,DK);
  sidePlate(g,.952,.1,.0,3.7,.05,DK);sidePlate(g,.952,.1,-.12,3.7,.025,DK);                    // side stripes
  g.both(s=>g.cyl('z',s*.5,-.3,-2.2,.07,.2,CH,8,DK));
}},
{name:'Rally Hatch',grp:'normal',own:null,wheel:null,W:W4(.87,1.18,-1.18,.36,.36,.34),draw(g,m){
  g.box(0,-.26,0,1.84,.52,3.7,m,{bottom:false});g.box(0,-.32,0,1.88,.12,3.74,DK,{top:false,bottom:false});
  g.cabin(-.86,.86,.26,.9,-1.8,.75,-1.68,.12,.1,m);g.box(0,.9,-.25,.55,.07,.7,DK);
  g.both(s=>g.box(s*.62,.92,-1.6,.08,.18,.1,DK));g.box(0,1.08,-1.65,1.5,.06,.36,m);              // roof wing
  g.both(s=>{g.box(s*.9,-.2,1.18,.16,.2,.95,DK);g.box(s*.9,-.2,-1.18,.16,.2,.95,DK);g.box(s*.86,-.5,-1.62,.26,.3,.03,DK)});  // flares, mud flaps
  g.box(0,-.3,1.87,1.84,.2,.07,DK);[-.6,-.2,.2,.6].forEach(x=>{g.disc('+z',1.912,x,.06,.12,DK,10);g.disc('+z',1.918,x,.06,.09,HL,10)}); // light pod
  lights(g,1.852,.1,.62,.3,.12);lights(g,-1.852,.12,.66,.3,.16);
  sideDisc(g,.925,.05,-.02,.26,WH,12);sidePlate(g,.93,.05,-.02,.07,.28,DK);sidePlate(g,.93,.11,.09,.1,.06,DK);  // door roundel with a 1
  g.box(0,-.3,-1.86,.4,.1,.06,DK);g.cyl('z',.45,-.28,-1.9,.07,.15,CH,8,DK);
}},
{name:'Hot Rod',grp:'normal',own:null,wheel:null,W:[[.76,1.45,.3,.22,1],[-.76,1.45,.3,.22,1],[.84,-.95,.48,.5,0],[-.84,-.95,.48,.5,0]],draw(g,m){
  g.both(s=>g.box(s*.4,-.36,.3,.12,.12,3.3,DK));g.box(0,-.33,1.45,1.42,.08,.1,DK);
  g.box(0,-.3,-.9,1.5,.62,1.55,m,{bottom:false});                                              // body tub
  g.cabin(-.72,.72,.32,.66,-1.55,-.3,-1.45,-.55,.04,m);
  g.both(s=>g.hull(s*.62,s*1.08,-.02,.2,-1.55,-.35,-1.4,-.5,0,m,{bottom:false}));               // rear fenders
  g.box(0,-.25,.75,.72,.42,1.1,MET);g.box(0,.17,.75,.5,.2,.62,CH);g.box(0,.37,.78,.36,.13,.32,CH,{top:DK});  // engine and blower
  g.both(s=>{for(let i=0;i<3;i++)g.cyl('x',s*.48,-.05,.45+i*.25,.05,.22,CH,6);g.cyl('z',s*.62,-.32,-.15,.075,1.4,CH,8)});  // headers and side pipes
  g.box(0,-.3,1.62,.62,.66,.12,CH);g.plate('+z',1.682,0,.04,.48,.5,DK);
  g.both(s=>{g.cyl('z',s*.5,.26,1.66,.13,.14,CH,10);g.disc('+z',1.735,s*.5,.26,.1,HL,10)});
  lights(g,-1.678,-.05,.5,.18,.12);g.box(0,-.32,-1.68,1.4,.08,.06,CH);
}},
{name:'Pickup',grp:'normal',own:null,wheel:null,W:W4(.88,1.35,-1.35,.42,.42,.38),draw(g,m){
  g.box(0,-.24,0,1.9,.52,4.2,m,{bottom:false});g.box(0,-.3,0,1.94,.12,4.24,DK,{top:false,bottom:false});
  g.cabin(-.88,.88,.28,.98,-.3,1.25,-.25,.72,.08,m);
  g.box(0,.282,-1.2,1.72,.01,1.85,DK);g.both(s=>g.box(s*.9,.28,-1.18,.1,.34,1.88,m));g.box(0,.28,-2.06,1.9,.34,.08,m); // bed
  g.both(s=>g.box(s*.76,.28,-.4,.08,.62,.08,DK));g.box(0,.86,-.4,1.6,.08,.08,DK);[-.35,.35].forEach(x=>{g.cyl('z',x,.98,-.36,.1,.1,DK,8);g.disc('+z',-.305,x,.98,.08,HL,8)});
  g.box(0,-.28,2.12,1.9,.18,.08,CH);g.box(0,-.28,-2.12,1.9,.18,.08,CH);g.plate('+z',2.102,0,.06,1.2,.26,CH);g.plate('+z',2.106,0,.06,1.1,.18,DK);
  lights(g,2.104,.07,.75,.22,.2);lights(g,-2.104,.1,.82,.12,.26);
  g.both(s=>{g.box(s*.97,-.32,0,.08,.06,1.5,DK)});
}},
{name:'Dune Buggy',grp:'normal',own:null,wheel:null,W:[[.86,1.25,.34,.3,1],[-.86,1.25,.34,.3,1],[.86,-1.15,.43,.52,0],[-.86,-1.15,.43,.52,0]],draw(g,m){
  g.hull(-.82,.82,-.34,.16,-1.3,1.2,-1.2,1.0,.08,m,{top:DK});                                   // tub, open on top
  g.hex([[-.72,-.34,1.2],[.72,-.34,1.2],[.68,-.3,1.8],[-.68,-.3,1.8],[-.74,.16,1.0],[.74,.16,1.0],[.66,-.02,1.75],[-.66,-.02,1.75]],m);  // nose
  g.both(s=>g.hull(s*.62,s*1.08,.02,.14,.75,1.7,.85,1.6,0,m));                                  // front fenders
  g.both(s=>g.hull(s*.62,s*1.1,.08,.2,-1.65,-.65,-1.55,-.75,0,m));                              // rear fenders
  g.box(0,-.3,-1.58,.86,.44,.5,MET);g.both(s=>g.cyl('y',s*.22,.2,-1.55,.12,.16,CH,8));
  g.both(s=>{g.box(s*.32,-.2,-.45,.48,.12,.5,0x30384d);g.box(s*.32,-.1,-.75,.48,.55,.12,0x30384d)});
  g.both(s=>g.box(s*.72,.16,-.9,.08,.86,.08,CH));g.box(0,.98,-.9,1.52,.08,.08,CH);
  g.box(0,.16,.62,1.3,.38,.04,GL);g.both(s=>g.cyl('z',s*.45,-.08,1.79,.12,.08,CH,10,HL));
}},
{name:'Monster Truck',grp:'normal',own:null,wheel:'knobbly',W:W4(.98,1.32,-1.32,.62,.62,.56),draw(g,m){
  g.box(0,-.1,0,.5,.2,3.4,DK);g.both(s=>{g.box(0,-.02,s*1.32,1.6,.12,.12,DK);g.rod([s*.4,.05,1.32],[s*.4,.5,1.0],.08,CH);g.rod([s*.4,.05,-1.32],[s*.4,.5,-1.0],.08,CH)});
  g.box(0,.45,0,1.84,.46,3.6,m,{bottom:DK});
  g.cabin(-.84,.84,.91,1.42,-.4,.9,-.3,.5,.08,m);
  g.box(0,.912,-1.2,1.64,.01,1.3,DK);g.both(s=>g.box(s*.88,.91,-1.18,.08,.2,1.3,m));g.box(0,.91,-1.84,1.84,.2,.07,m);
  g.box(0,1.42,.15,1.3,.08,.14,DK);[-.45,-.15,.15,.45].forEach(x=>g.plate('+z',.225,x,1.46,.2,.06,HL));
  g.both(s=>{g.box(s*.98,.9,1.32,.36,.06,1.25,DK);g.box(s*.98,.9,-1.32,.36,.06,1.25,DK)});      // fender flares
  g.box(0,.42,1.82,1.8,.2,.1,CH);g.plate('+z',1.802,0,.72,1.2,.26,DK);lights(g,1.802,.72,.78,.2,.16);lights(g,-1.802,.75,.78,.14,.2);
  sidePlate(g,.922,0,.62,3.2,.08,0xffd21f);
}},
{name:'Retro Wedge',grp:'normal',own:null,wheel:null,W:W4(.87,1.38,-1.35,.34,.36,.32),draw(g,m){
  const yt=z=>.3+(z+2)/4.05*-.38;   // the top of the wedge
  g.hex([[-.96,-.3,-2.05],[.96,-.3,-2.05],[.96,-.3,2.05],[-.96,-.3,2.05],[-.94,.3,-2.0],[.94,.3,-2.0],[.9,-.08,2.05],[-.9,-.08,2.05]],m,{bottom:false,back:dark(m,.25)});
  g.box(0,-.33,0,1.97,.12,4.14,DK,{top:false,bottom:false});
  g.hex([[-.8,yt(-1.3)-.02,-1.3],[.8,yt(-1.3)-.02,-1.3],[.8,yt(.8)-.02,.8],[-.8,yt(.8)-.02,.8],[-.62,.6,-1.1],[.62,.6,-1.1],[.62,.6,-.32],[-.62,.6,-.32]],GL,{top:m,back:DK,bottom:false});
  for(let i=0;i<4;i++)g.box(0,.33+i*.065,-1.24+i*.05,1.3-i*.12,.02,.05,DK);                    // louvres
  g.both(s=>{g.box(s*.58,yt(1.55)-.04,1.55,.44,.17,.3,m);g.plate('+z',1.702,s*.58,yt(1.55)+.04,.36,.1,HL)});  // pop-up lights, up
  sidePlate(g,.962,-.85,.02,.75,.16,DK);g.box(0,.3,-1.97,1.86,.05,.2,m);
  g.plate('-z',-2.052,0,.1,1.7,.1,TL);g.plate('+z',2.052,0,-.2,1.5,.06,DK);
}},
{name:'Go-Kart',grp:'normal',own:null,wheel:'slicks',W:[[.72,.95,.24,.22,1],[-.72,.95,.24,.22,1],[.74,-.92,.27,.34,0],[-.74,-.92,.27,.34,0]],draw(g,m){
  g.box(0,-.44,.05,.92,.05,2.4,DK);g.both(s=>{g.box(s*.46,-.42,0,.06,.06,2.3,CH)});g.box(0,-.4,.95,1.3,.05,.06,CH);g.box(0,-.4,-.92,1.36,.05,.06,CH);
  g.hex([[-.55,-.42,.95],[.55,-.42,.95],[.5,-.42,1.42],[-.5,-.42,1.42],[-.42,-.12,.7],[.42,-.12,.7],[.4,-.3,1.38],[-.4,-.3,1.38]],m);  // nose
  g.plate('+z',1.425,0,-.36,.5,.1,WH);
  g.both(s=>g.hex([[s*.5,-.42,-.55],[s*.8,-.42,-.55],[s*.8,-.42,.35],[s*.5,-.42,.35],[s*.5,-.2,-.5],[s*.76,-.24,-.5],[s*.76,-.24,.3],[s*.5,-.2,.3]],m));  // side pods
  g.box(0,-.42,-.42,.56,.32,.46,DK);g.box(0,-.12,-.66,.56,.46,.1,DK);
  g.box(0,-.12,-.42,.44,.42,.32,lite(m,.15));g.both(s=>g.rod([s*.18,.18,-.38],[s*.2,-.02,.15],.11,lite(m,.15)));   // driver
  g.ball(0,.5,-.4,.23,.23,.25,WH,8,5);g.plate('+z',-.155,0,.52,.32,.12,DK);g.box(0,.28,-.4,.22,.1,.22,dark(m,.2));
  g.rod([0,-.3,.55],[0,.05,.2],.05,DK);g.cyl('z',0,.08,.18,.15,.04,DK,10);
  g.box(.45,-.4,-.82,.3,.3,.32,MET);g.cyl('z',.45,-.2,-1.02,.06,.16,CH,6,DK);g.box(0,-.38,-1.22,1.2,.08,.08,CH);
}},
{name:'Limo',grp:'normal',own:null,wheel:null,W:W4(.86,1.68,-1.68,.36,.36,.32),draw(g,m){
  g.box(0,-.24,0,1.9,.5,4.62,m,{bottom:false});g.box(0,-.28,0,1.92,.1,4.64,DK,{top:false,bottom:false});
  g.cabin(-.84,.84,.26,.76,-1.85,1.02,-1.6,.72,.1,m,0x6f8faa);
  for(const z of [-1.15,-.45,.25])g.both(s=>g.hex([[s*.83,.26,z-.06],[s*.86,.26,z-.06],[s*.86,.26,z+.06],[s*.83,.26,z+.06],[s*.73,.765,z-.06],[s*.76,.765,z-.06],[s*.76,.765,z+.06],[s*.73,.765,z+.06]],m));  // pillars
  sidePlate(g,.952,0,.0,4.4,.04,CH);g.box(0,-.26,2.3,1.9,.12,.08,CH);g.box(0,-.26,-2.3,1.9,.12,.08,CH);
  g.plate('+z',2.312,0,.0,.9,.22,CH);g.plate('+z',2.316,0,.0,.8,.16,DK);g.cyl('y',0,.3,2.1,.05,.12,CH,6);
  lights(g,2.314,.02,.68,.3,.12);lights(g,-2.312,.06,.66,.4,.12);
}},
// ---------------- Work vehicles ----------------
{name:'School Bus',grp:'work',own:0xf7b500,wheel:null,W:W4(.88,1.75,-1.45,.4,.4,.36),draw(g,m){
  g.box(0,-.28,-.45,1.98,1.68,3.7,m,{top:0xf1efe6,bottom:false});g.box(0,-.25,1.85,1.66,.58,.82,m,{bottom:false});
  g.box(0,-.32,0,2.0,.16,4.56,DK,{top:false,bottom:false});
  g.plate('+z',1.402,0,.72,1.7,.52,GL);g.plate('+z',1.405,0,.72,.04,.52,DK);
  for(let i=0;i<6;i++)g.both(s=>g.plate(s>0?'+x':'-x',s*.992,-1.95+i*.53,.72,.42,.42,GL));
  sidePlate(g,.993,-.45,.42,3.66,.06,DK);sidePlate(g,.993,-.45,.08,3.66,.06,DK);sidePlate(g,.993,.4,-.15,3.66,.05,DK);
  g.plate('-z',-2.302,0,.7,.7,.5,GL);g.plate('-z',-2.302,0,.32,.06,.9,DK);
  g.plate('+z',2.262,0,.05,1.1,.3,DK);lights(g,2.262,.05,.66,.22,.18);lights(g,-2.302,.3,.75,.22,.22);
  g.both(s=>{g.plate('+z',1.406,s*.75,1.24,.2,.12,s>0?0xff3a3a:AMB);g.plate('-z',-2.304,s*.75,1.24,.2,.12,s>0?0xff3a3a:AMB)});
  g.cyl('x',-1.03,.55,1.05,.21,.04,0xd92b2b,8,null,null,Math.PI/8);g.plate('-x',-1.052,1.05,.55,.24,.07,WH);   // stop arm
  g.box(0,-.26,2.27,1.9,.16,.08,DK);g.box(0,-.3,-2.32,1.98,.18,.08,DK);
}},
{name:'Taxi',grp:'work',own:0xffc21a,wheel:null,W:W4(.86,1.3,-1.3,.36,.36,.32),draw(g,m){
  g.box(0,-.22,0,1.9,.5,4.2,m,{bottom:false});g.box(0,-.28,0,1.92,.12,4.22,DK,{top:false,bottom:false});
  g.cabin(-.84,.84,.28,.84,-1.3,.85,-1.0,.35,.1,m);
  for(let i=0;i<14;i++)for(let r=0;r<2;r++)g.both(s=>g.plate(s>0?'+x':'-x',s*.952,-1.47+i*.226,.02+r*.1,.226,.1,(i+r)%2?DK:WH));   // checker band
  g.box(0,.84,-.32,.7,.22,.3,WH);g.plate('+z',-.168,0,.95,.54,.12,DK);g.plate('-z',-.472,0,.95,.54,.12,DK);
  [-.18,-.06,.06,.18].forEach((x,i)=>{g.plate('+z',-.165,x,.95,.06,.08,m);g.plate('-z',-.475,x,.95,.06,.08,m)});
  g.box(0,-.25,2.12,1.9,.14,.08,DK);g.box(0,-.25,-2.12,1.9,.14,.08,DK);g.plate('+z',2.102,0,.0,1.0,.18,DK);
  lights(g,2.102,.02,.7,.28,.14);lights(g,-2.102,.06,.68,.32,.14);
}},
{name:'Police Cruiser',grp:'work',own:0x232a3d,wheel:null,W:W4(.86,1.3,-1.3,.36,.36,.32),draw(g,m){
  g.box(0,-.22,0,1.9,.5,4.2,m,{bottom:false});g.box(0,-.28,0,1.92,.12,4.22,DK,{top:false,bottom:false});
  g.cabin(-.84,.84,.28,.84,-1.3,.85,-1.0,.35,.1,WH);
  sidePlate(g,.952,-.15,.02,2.3,.46,WH);g.both(s=>g.star(s>0?'+x':'-x',s*.956,.05,.04,.17,0xffc61a));
  g.box(0,.84,-.32,1.25,.1,.3,DK);g.box(-.33,.94,-.32,.56,.12,.28,0xff2b3a);g.box(.33,.94,-.32,.56,.12,.28,0x2b6bff);
  g.box(0,-.3,2.17,1.0,.42,.08,DK);g.both(s=>g.box(s*.4,-.3,2.2,.08,.5,.08,DK));
  g.box(0,-.25,-2.12,1.9,.14,.08,DK);g.plate('+z',2.102,0,.02,1.0,.16,DK);
  lights(g,2.102,.03,.72,.26,.13);lights(g,-2.102,.06,.68,.32,.14);g.cyl('z',-.86,.36,.62,.07,.16,CH,8);
}},
{name:'Fire Truck',grp:'work',own:0xd7262b,wheel:null,W:[[.88,1.55,.42,.38,1],[-.88,1.55,.42,.38,1],[.88,-.95,.42,.38,0],[-.88,-.95,.42,.38,0],[.88,-1.75,.42,.38,0],[-.88,-1.75,.42,.38,0]],draw(g,m){
  g.box(0,-.25,1.55,1.94,1.28,1.38,m,{bottom:false});g.box(0,-.22,-.75,1.96,1.02,3.1,m,{bottom:false,top:CH});
  g.plate('+z',2.242,0,.68,1.7,.48,GL);g.both(s=>g.plate(s>0?'+x':'-x',s*.972,1.6,.68,.8,.42,GL));
  for(let i=0;i<3;i++)g.both(s=>g.plate(s>0?'+x':'-x',s*.982,-1.85+i*.75,.36,.62,.6,CH));
  sidePlate(g,.983,-.1,.02,4.4,.1,WH);g.plate('+z',2.242,0,.2,1.7,.1,WH);
  g.both(s=>g.box(s*.36,.8,-.6,.07,.08,3.4,CH));for(let i=0;i<10;i++)g.box(0,.82,-2.15+i*.34,.72,.04,.05,CH);
  g.cyl('y',0,.86,-1.95,.34,.12,CH,10);g.box(0,1.03,1.4,1.3,.1,.24,DK);g.both(s=>g.box(s*.36,1.06,1.4,.42,.1,.26,0xff2b3a));
  g.cyl('x',1.02,.34,.05,.24,.1,0xf5c518,10);g.box(0,-.28,2.27,1.94,.2,.1,CH);
  lights(g,2.244,-.02,.72,.24,.18);lights(g,-2.302,.2,.78,.16,.26);g.plate('+z',2.244,0,-.02,.9,.24,CH);
}},
{name:'Ice Cream Truck',grp:'work',own:0xfff0dc,wheel:null,W:W4(.88,1.42,-1.35,.38,.38,.34),draw(g,m){
  const pk=0xff7fb8;
  g.box(0,-.25,-.5,1.92,1.2,3.1,m,{bottom:false});
  g.hex([[-.96,-.25,1.05],[.96,-.25,1.05],[.96,-.25,2.1],[-.96,-.25,2.1],[-.92,.95,1.05],[.92,.95,1.05],[.92,.95,1.32],[-.92,.95,1.32]],m,{bottom:false});
  g.box(0,-.25,1.62,1.94,.45,.96,m,{bottom:false});
  g.hex([[-.9,.2,1.32],[.9,.2,1.32],[.9,.2,1.72],[-.9,.2,1.72],[-.86,.92,1.32],[.86,.92,1.32],[.86,.92,1.38],[-.86,.92,1.38]],GL,{top:false,back:false,bottom:false});
  sidePlate(g,.962,-.2,-.12,4.1,.22,pk);sidePlate(g,.963,-.2,.05,4.1,.04,WH);
  g.plate('+x',.962,-.75,.48,1.5,.52,GL);g.box(1.0,.2,-.75,.12,.06,1.5,pk);                         // serving window and counter
  for(let i=0;i<6;i++)g.hex([[.96,.85,-1.5+i*.25],[1.24,.74,-1.5+i*.25],[1.24,.74,-1.25+i*.25],[.96,.85,-1.25+i*.25],[.96,.88,-1.5+i*.25],[1.24,.77,-1.5+i*.25],[1.24,.77,-1.25+i*.25],[.96,.88,-1.25+i*.25]],i%2?WH:pk);  // awning
  g.plate('-x',-.962,-.75,.45,1.2,.5,pk);g.disc('-x',-.966,-.75,.45,.2,WH,10);
  g.cyl('y',0,1.22,-.65,.02,.36,0xe0a85a,8,null,.2);g.ball(0,1.47,-.65,.22,.2,.22,pk,8,4);g.ball(0,1.6,-.65,.05,.05,.05,0xd8202f,6,3);  // the cone on the roof
  g.box(0,-.28,2.12,1.94,.16,.08,DK);g.box(0,-.28,-2.07,1.94,.16,.08,DK);lights(g,2.102,.06,.7,.22,.16);lights(g,-2.052,.1,.76,.16,.22);
}},
{name:'Garbage Truck',grp:'work',own:0x2f8f4e,wheel:null,W:[[.88,1.62,.42,.38,1],[-.88,1.62,.42,.38,1],[.88,-.85,.42,.38,0],[-.88,-.85,.42,.38,0],[.88,-1.62,.42,.38,0],[-.88,-1.62,.42,.38,0]],draw(g,m){
  g.box(0,-.25,1.62,1.92,1.2,1.2,WH,{bottom:false});g.plate('+z',2.222,0,.6,1.7,.45,GL);g.both(s=>g.plate(s>0?'+x':'-x',s*.962,1.7,.62,.7,.4,GL));
  g.box(0,-.22,-.6,1.98,1.38,2.84,m,{bottom:false});
  for(let i=0;i<5;i++)g.both(s=>g.plate(s>0?'+x':'-x',s*.992,-1.8+i*.6,.45,.08,1.3,dark(m,.25)));
  g.hex([[-.95,-.25,-2.02],[.95,-.25,-2.02],[.95,-.25,-2.3],[-.95,-.25,-2.3],[-.95,1.16,-2.02],[.95,1.16,-2.02],[.95,.6,-2.3],[-.95,.6,-2.3]],dark(m,.2),{bottom:false});
  g.plate('-z',-2.302,0,.05,1.5,.42,DK);
  g.box(1.06,-.12,.62,.32,.58,.4,0x3a7d44);g.box(1.06,.46,.62,.36,.06,.44,dark(0x3a7d44,.2));g.rod([.99,.2,.62],[.99,.85,.3],.08,CH);  // a bin on the lifter
  g.box(0,.95,1.62,.3,.12,.24,AMB);g.box(0,-.28,2.24,1.92,.16,.08,DK);lights(g,2.222,.02,.72,.24,.16);lights(g,-2.302,.6,.82,.12,.24);
}},
{name:'Tractor',grp:'work',own:0x2e8b3a,wheel:'tractor',W:[[.62,1.45,.32,.26,1],[-.62,1.45,.32,.26,1],[.84,-.72,.62,.44,0],[-.84,-.72,.62,.44,0]],draw(g,m){
  g.box(0,-.25,.95,.9,.66,1.75,m,{bottom:false});g.plate('+z',1.832,0,.12,.7,.42,DK);for(let i=0;i<4;i++)g.plate('+z',1.836,0,-.02+i*.1,.66,.03,MET);
  sidePlate(g,.452,.95,.3,1.7,.07,0xffc21a);lights(g,1.833,.42,.36,.12,.1);
  g.cyl('y',.3,.75,1.4,.07,.75,DK,8);g.cyl('y',.3,1.15,1.4,.09,.06,DK,8);
  g.box(0,-.25,-.7,1.1,.6,1.3,m,{bottom:false});g.box(0,.35,-.8,.6,.12,.5,DK);g.box(0,.4,-1.05,.6,.42,.1,DK);
  g.rod([0,.3,.15],[0,.65,-.35],.05,DK);g.cyl('y',0,.66,-.38,.17,.04,DK,10);
  g.both(s=>{g.box(s*.6,.35,-.15,.06,1.0,.06,DK);g.box(s*.6,.35,-1.32,.06,1.0,.06,DK);g.hull(s*.62,s*1.06,.6,.74,-1.35,-.1,-1.25,-.2,0,m)});
  g.box(0,1.35,-.72,1.4,.07,1.36,WH);g.box(0,-.35,-1.5,.3,.12,.3,DK);
}},
{name:'Golf Cart',grp:'work',own:0x2f8f4e,wheel:'caster',W:W4(.64,.95,-.88,.27,.27,.22),draw(g,m){
  g.box(0,-.38,0,1.36,.42,2.6,WH,{bottom:false});g.hex([[-.68,-.38,1.3],[.68,-.38,1.3],[.6,-.38,1.62],[-.6,-.38,1.62],[-.68,.04,1.3],[.68,.04,1.3],[.58,-.12,1.58],[-.58,-.12,1.58]],WH,{bottom:false});
  lights(g,1.605,-.2,.38,.2,.1);g.box(0,.04,-.3,1.2,.16,.65,0x355c9e);g.box(0,.2,-.62,1.2,.48,.12,0x355c9e);
  g.both(s=>{g.box(s*.62,.04,.75,.05,1.3,.05,DK);g.box(s*.62,.04,-.7,.05,1.3,.05,DK)});
  g.box(0,1.34,0,1.46,.07,1.95,m);g.plate('+z',.762,0,.72,1.16,.56,GL);
  g.rod([0,.04,.55],[0,.45,.3],.05,DK);g.cyl('y',0,.46,.28,.16,.04,DK,10);
  g.at(0,0,-1.12,-.25,0,0,()=>{g.cyl('y',0,.12,0,.2,.82,0x8b5a2b,8);[[-.07,.06],[.07,0],[0,-.08]].forEach(([x,z])=>{g.cyl('y',x,.62,z,.02,.4,CH,4);g.box(x,.8,z+.03,.06,.06,.12,CH)})});
}},
{name:'Lunar Rover',grp:'work',own:0xd9dde4,wheel:'mesh',W:W4(.86,1.18,-1.18,.38,.38,.28),draw(g,m){
  const au=0xe0b23a;
  g.box(0,-.25,0,1.4,.12,3.0,m);g.both(s=>{g.box(s*.6,-.22,0,.08,.08,3.1,MET)});
  g.both(s=>{g.hull(s*.62,s*1.08,.16,.24,.7,1.66,.8,1.56,0,0x8a93a6);g.hull(s*.62,s*1.08,.16,.24,-1.66,-.7,-1.56,-.8,0,0x8a93a6)});
  g.both(s=>{g.box(s*.34,-.12,-.25,.46,.06,.5,0x4a5160);g.box(s*.34,-.12,-.52,.46,.48,.05,0x4a5160)});
  g.box(0,-.12,.6,.5,.4,.3,au);g.plate('+z',.752,0,.12,.36,.2,DK);
  g.box(0,-.13,-1.2,1.1,.4,.5,au);g.cyl('y',-.35,.55,.95,.025,1.2,MET,4);
  g.cyl('y',-.35,1.25,.95,.04,.18,0xf2f4f8,10,null,.45);g.cyl('y',.42,.4,.95,.025,.5,MET,4);g.box(.42,.65,.95,.18,.12,.14,DK);
}},
// ---------------- Toy cars ----------------
{name:'Wooden Toy',grp:'toy',own:0xe0453c,wheel:'wood',W:W4(.8,1.1,-1.1,.38,.38,.3),draw(g,m){
  const wd=0xd9a86c;
  g.hex([[-.8,-.32,-1.7],[.8,-.32,-1.7],[.8,-.32,1.7],[-.8,-.32,1.7],[-.8,.2,-1.7],[.8,.2,-1.7],[.8,.05,1.7],[-.8,.05,1.7]],wd);
  for(let i=0;i<3;i++)sidePlate(g,.802,0,-.2+i*.13,3.3,.012,dark(wd,.18));
  g.hull(-.62,.62,.2,.72,-1.35,-.05,-1.2,-.25,.06,m);g.both(s=>g.plate(s>0?'+x':'-x',s*.6,-.7,.46,.6,.3,dark(m,.45)));
  g.cyl('y',0,.35,.55,.17,.42,0x3d7be0,10);g.ball(0,.76,.55,.19,.19,.19,0xe9c38a,10,6);
  g.both(s=>{g.disc('+z',1.702,s*.5,-.08,.12,0xffe08a,10);g.disc('-z',-1.702,s*.5,-.02,.1,0xe0453c,10)});
  g.cyl('x',0,-.17,1.1,.06,1.92,0xb07a45,8);g.cyl('x',0,-.17,-1.1,.06,1.92,0xb07a45,8);
}},
{name:'Wind-Up Car',grp:'toy',own:0x4aa3df,wheel:'tin',W:W4(.78,1.12,-1.12,.32,.32,.28),draw(g,m){
  g.loft('z',[[-1.85,.6,.25,0,-.05],[-1.6,.82,.42,0,0],[-.8,.88,.48,0,.02],[.6,.88,.46,0,0],[1.5,.82,.36,0,-.05],[1.85,.55,.22,0,-.1]],12,m,{ex:3});
  g.both(s=>{g.ball(s*.68,.0,1.12,.3,.3,.55,m,8,4);g.ball(s*.68,.0,-1.12,.3,.3,.55,m,8,4)});
  g.ball(0,.35,-.25,.62,.48,.85,GL,10,5,(j)=>j<1?m:GL);
  g.loft('z',[[-1.7,.835,.05,0,.05],[1.7,.835,.05,0,.05]],12,0xe0453c,{ex:6,cap0:false,cap1:false});
  for(let i=0;i<5;i++)g.both(s=>g.disc(s>0?'+x':'-x',s*.902,-.9+i*.45,-.22,.05,0xffd21f,6));
  g.both(s=>g.cyl('z',s*.45,.0,1.82,.11,.08,CH,10,HL));
  g.cyl('z',0,.05,-2.0,.05,.42,0xc9a227,6);g.both(s=>g.cyl('z',s*.19,.05,-2.24,.17,.06,0xe8bf4a,10));g.box(0,-.02,-2.24,.2,.14,.06,0xe8bf4a);   // the key
}},
{name:'RC Car',grp:'toy',own:0xff5a1f,wheel:'rc',W:W4(.82,1.15,-1.15,.42,.42,.46),draw(g,m){
  g.box(0,-.4,0,1.3,.06,3.2,DK);
  g.hex([[-.72,-.36,-1.1],[.72,-.36,-1.1],[.72,-.36,1.4],[-.72,-.36,1.4],[-.55,.18,-.85],[.55,.18,-.85],[.4,-.05,1.1],[-.4,-.05,1.1]],m,{bottom:false});
  g.plate('+y',.181,0,-.45,.6,.45,DK);g.both(s=>g.plate(s>0?'+x':'-x',s*.63,-.1,-.05,.9,.2,0x2b2d36));
  sidePlate(g,.7,.5,-.25,.7,.06,WH);
  g.box(0,.42,-1.45,1.6,.05,.48,m);g.both(s=>g.box(s*.5,.0,-1.35,.05,.44,.18,DK));
  g.both(s=>{g.cyl('y',s*.62,-.15,1.1,.07,.5,0xffd21f,6);g.cyl('y',s*.62,-.15,-1.1,.07,.5,0xffd21f,6)});
  g.box(0,-.36,1.62,1.1,.2,.22,0x2b2d36);
  g.cyl('y',.45,.55,-.95,.025,1.6,DK,4);g.ball(.45,1.38,-.95,.08,.08,.08,0xff3344,6,4);
}},
{name:'Soapbox Crate',grp:'toy',own:0xe0453c,wheel:'pram',W:W4(.82,1.05,-1.05,.36,.4,.12),draw(g,m){
  const wd=0xc8945a;
  g.box(0,-.32,-.25,1.2,.55,2.1,wd,{top:dark(wd,.4)});
  for(let i=0;i<3;i++){sidePlate(g,.602,-.25,-.18+i*.18,2.06,.015,dark(wd,.3));g.plate('-z',-1.302,0,-.18+i*.18,1.16,.015,dark(wd,.3))}
  g.hex([[-.6,-.32,.8],[.6,-.32,.8],[.55,-.3,1.45],[-.55,-.3,1.45],[-.6,.23,.8],[.6,.23,.8],[.5,-.08,1.4],[-.5,-.08,1.4]],m);
  g.both(s=>{g.disc(s>0?'+x':'-x',s*.602,-.45,-.05,.2,WH,12);g.plate(s>0?'+x':'-x',s*.606,-.45+s*.0,.02,.16,.04,DK);g.rod([s*.606,.02,-.45+s*.06],[s*.606,-.15,-.45-s*.02],.04,DK)});  // a 7
  g.box(0,-.33,1.05,1.7,.1,.12,0x8b5a2b);g.box(0,-.33,-1.05,1.7,.1,.12,0x8b5a2b);
  g.both(s=>g.cyl('z',s*.3,.08,.45,.02,.8,0xe8d9b0,4));
  g.box(0,-.05,-.45,.46,.5,.34,0x3d7be0);g.ball(0,.62,-.45,.22,.22,.24,m,8,5);g.plate('+z',-.21,0,.6,.3,.1,DK);
}},
{name:'Cardboard Box',grp:'toy',own:0xe0453c,wheel:'plate',W:W4(.8,.9,-.9,.36,.36,.1),draw(g,m){
  const cb=0xc89b68,in1=0x8a6a45;
  g.box(0,-.35,0,1.5,.85,2.5,cb,{top:in1});
  g.at(0,.5,1.25,.7,0,0,()=>g.box(0,0,.0,1.5,.02,.6,cb,{}));g.at(0,.5,-1.25,-.7,0,0,()=>g.box(0,0,0,1.5,.02,.6,cb));    // flaps
  g.both(s=>g.at(s*.75,.5,0,0,0,-s*.75,()=>g.box(s*.25,0,0,.5,.02,2.4,cb)));
  sidePlate(g,.752,0,.12,2.5,.1,0xe2c79a);
  g.both(s=>{g.disc('+z',1.252,s*.45,.12,.15,0xffe14a,10);g.disc('-z',-1.252,s*.45,.16,.12,0xff5a5a,10)});
  g.both(s=>{const S=s>0?'+x':'-x',x=s*.754;g.plate(S,x,-.55,.05,.05,.6,m);g.plate(S,x,.55,.05,.05,.6,m);g.plate(S,x,0,.33,1.1,.05,m);g.plate(S,x,0,-.23,1.1,.05,m);g.disc(S,x,.35,.0,.05,m,6)});  // a door drawn in marker
  g.plate('+z',1.252,0,-.2,.5,.04,m);g.disc('+z',1.253,0,.36,.07,m,6);
}},
// ---------------- Silly cars ----------------
{name:'Shopping Cart',grp:'silly',own:0xe0453c,wheel:'caster',W:[[.6,1.2,.18,.12,1],[-.6,1.2,.18,.12,1],[.62,-1.25,.18,.12,0],[-.62,-1.25,.18,.12,0]],draw(g,m){
  const c=CH,t=.045,yb=-.02,yt=.92;
  const B=[[-.66,yb,-1.25],[.66,yb,-1.25],[.6,yb,1.05],[-.6,yb,1.05]],T=[[-.85,yt,-1.4],[.85,yt,-1.4],[.8,yt,1.45],[-.8,yt,1.45]];
  const L=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
  for(let i=0;i<4;i++){const j=(i+1)%4;g.rod(B[i],B[j],t,c);g.rod(T[i],T[j],t,c);g.rod(B[i],T[i],t,c);
    const n=i%2?8:5;for(let k=1;k<n;k++)g.rod(L(B[i],B[j],k/n),L(T[i],T[j],k/n),t*.7,c);
    for(const h of [.35,.68])g.rod(L(B[i],T[i],h),L(B[j],T[j],h),t*.7,c)}
  for(let k=1;k<5;k++)g.rod(L(B[0],B[3],k/5),L(B[1],B[2],k/5),t*.7,c);
  g.both(s=>{g.rod([s*.6,-.37,1.2],[s*.6,yb,1.05],.06,c);g.rod([s*.62,-.37,-1.25],[s*.66,yb,-1.25],.06,c);g.rod([s*.6,-.4,1.2],[s*.62,-.4,-1.25],.05,c)});
  g.rod([-.6,-.32,1.0],[.6,-.32,1.0],.04,c);g.rod([-.62,-.32,-1.0],[.62,-.32,-1.0],.04,c);
  g.both(s=>g.rod([s*.75,yt,-1.4],[s*.72,1.06,-1.62],.05,c));g.cyl('x',0,1.08,-1.64,.07,1.7,m,8);
  g.hex([[-.82,.6,-1.38],[.82,.6,-1.38],[.82,.6,-1.34],[-.82,.6,-1.34],[-.84,.9,-1.4],[.84,.9,-1.4],[.84,.9,-1.36],[-.84,.9,-1.36]],m);
}},
{name:'Bathtub',grp:'silly',own:0xf4f2ec,wheel:'brass',W:W4(.66,1.25,-1.25,.22,.22,.16),draw(g,m){
  const rings=[[-.3,.72,1.55],[-.1,.86,1.82],[.25,.92,1.95],[.42,.95,2.0]];
  g.loft('y',rings.map(r=>[r[0],r[1],r[2]]),16,m,{ex:3,cap1:lite(m,.5)});
  const wp=[];for(let i=0;i<16;i++){const t=i/16*Math.PI*2,c=Math.cos(t),sn=Math.sin(t);wp.push([.83*Math.sign(c)*Math.pow(Math.abs(c),2/3),1.86*Math.sign(sn)*Math.pow(Math.abs(sn),2/3)])}
  g.poly('+y',.424,wp,0x7cc8ff);   // the water, nearly to the brim
  g.both(s=>{g.ball(s*.66,-.36,1.25,.14,.18,.14,0xe8bf4a,6,4);g.ball(s*.66,-.36,-1.25,.14,.18,.14,0xe8bf4a,6,4)});
  g.cyl('y',0,.55,1.7,.05,.3,CH,6);g.rod([0,.7,1.7],[0,.66,1.45],.07,CH);g.both(s=>{g.cyl('y',s*.22,.54,1.75,.06,.12,CH,6);g.box(s*.22,.6,1.75,.18,.04,.04,0xd8202f)});
  [[.3,.0,.2],[-.4,.5,.16],[.2,-.7,.18],[-.25,-.3,.14],[.45,.8,.12],[-.1,1.0,.15]].forEach(([x,z,r])=>g.ball(x,.44,z,r,r*.6,r,0xffffff,6,3));
  g.ball(-.3,.5,-1.0,.13,.12,.15,0xffd21f,6,4);g.ball(-.3,.66,-.9,.09,.09,.09,0xffd21f,6,3);g.box(-.3,.63,-.79,.07,.04,.07,0xff8a1f);
}},
{name:'Couch',grp:'silly',own:0x5b7fc7,wheel:'caster',W:W4(.8,1.15,-1.15,.26,.26,.2),draw(g,m){
  const lg=0x8b5a2b;
  g.box(0,-.38,.1,1.6,.08,3.0,DK);
  g.box(0,-.3,-.2,1.96,.4,1.4,m,{top:dark(m,.08)});[-.62,0,.62].forEach(x=>g.box(x,.1,-.08,.6,.16,1.1,lite(m,.1)));
  g.box(0,-.3,-.82,1.96,1.1,.36,m);[-.62,0,.62].forEach(x=>g.hull(x-.3,x+.3,.2,.75,-.66,-.4,-.68,-.52,.02,lite(m,.1)));
  g.both(s=>g.box(s*.88,-.3,-.2,.24,.75,1.4,m,{top:lite(m,.15)}));
  g.both(s=>{g.box(s*.86,-.4,.42,.08,.1,.08,lg);g.box(s*.86,-.4,-.95,.08,.1,.08,lg)});
  g.box(0,-.3,1.05,1.0,.4,.6,dark(m,.12),{top:m});g.box(.2,.12,-.1,.12,.03,.3,DK);                 // footstool, remote
  g.box(-.75,-.3,1.25,.4,.42,.4,lg);g.cyl('y',-.75,.45,1.25,.03,.7,MET,4);g.cyl('y',-.75,.86,1.25,.26,.3,0xfff0c2,8,null,.14);  // lamp
}},
{name:'Hot Dog',grp:'silly',own:0xe0a85a,wheel:null,W:W4(.78,1.3,-1.3,.3,.3,.24),draw(g,m){
  const bun=z=>{const k=Math.abs(z)/2.05;return Math.sqrt(Math.max(0,1-k*k*k*k))};
  const zs=[-2.05,-1.9,-1.6,-1,0,1,1.6,1.9,2.05];
  g.both(s=>g.loft('z',zs.map(z=>[z,.48*bun(z)+.02,.42*bun(z)+.02,s*.42,-.05]),10,m,{}));
  g.box(0,-.38,0,.9,.22,3.6,dark(m,.15),{bottom:false});
  const sg=z=>{const k=Math.abs(z)/2.35;return Math.sqrt(Math.max(0,1-Math.pow(k,6)))};
  g.loft('z',[-2.35,-2.25,-2.0,-1,0,1,2.0,2.25,2.35].map(z=>[z,.3*sg(z)+.01,.3*sg(z)+.01,0,.32]),10,0xb5462f,{});
  for(let i=0;i<9;i++){const z0=-1.6+i*.36;g.rod([(i%2?.16:-.16),.62,z0],[(i%2?-.16:.16),.62,z0+.36],.07,0xffd21f)}
  g.both(s=>g.disc('+z',2.0,s*.42,.0,.1,HL,8));
}},
{name:'Banana',grp:'silly',own:0xffd84a,wheel:null,W:W4(.72,1.25,-1.25,.3,.3,.24),draw(g,m){
  const N=10,rs=[];for(let i=0;i<=N;i++){const z=-2.15+i*4.3/N,k=z/2.15,r=.5*Math.sqrt(Math.max(0,1-Math.pow(Math.abs(k),3.2)))+.04;rs.push([z,r,r*.85,0,.05+.75*k*k,Math.abs(k)>.86?0x6b4a22:null])}
  g.loft('z',rs,6,m,{rot:Math.PI/6,cap0:0x4a3218,cap1:0x4a3218});
  g.cyl('z',0,.85,2.25,.06,.25,0x4a3218,6);
  g.plate('+y',.52,0,-.15,.6,.7,0x6b4a22);g.box(0,.5,-.4,.5,.4,.08,DK);g.rod([0,.45,.4],[0,.7,.2],.05,DK);g.cyl('y',0,.72,.18,.15,.04,DK,10);
  g.box(0,-.38,0,.5,.12,2.8,DK,{bottom:false});
}},
{name:'Rubber Duck',grp:'silly',own:0xffd21f,wheel:null,W:W4(.7,1.0,-1.0,.26,.26,.2),draw(g,m){
  const bk=0xff8a1f;
  g.ball(0,.0,-.2,.92,.58,1.45,m,12,6);g.ball(0,.38,-1.35,.42,.38,.42,m,8,4);
  g.both(s=>g.ball(s*.82,.12,-.25,.18,.3,.65,dark(m,.08),8,4));
  g.ball(0,.82,.72,.56,.52,.54,m,12,6);
  g.ball(0,.7,1.28,.36,.1,.28,bk,8,4);g.ball(0,.62,1.22,.3,.07,.22,dark(bk,.15),8,3);
  g.both(s=>{g.ball(s*.3,.98,1.13,.1,.13,.07,DK,8,4);g.ball(s*.33,1.03,1.19,.03,.03,.02,0xffffff,4,2)});
  g.box(0,-.45,0,1.1,.14,2.4,DK,{bottom:false});
}},
{name:'Giant Shoe',grp:'silly',own:0xe0453c,wheel:null,W:W4(.68,1.25,-1.25,.24,.24,.18),draw(g,m){
  g.loft('y',[[-.48,.74,2.05,0,0],[-.2,.78,2.1,0,0]],16,WH,{ex:2.6});
  g.loft('y',[[-.2,.74,2.02,0,0],[.12,.7,1.88,0,-.1],[.42,.62,1.25,0,-.55],[.72,.52,.82,0,-.9]],16,m,{ex:2.6,cap1:0x2a2f3d});
  g.ball(0,-.18,1.42,.72,.4,.62,WH,10,5);
  const ys=z=>.47+(.7-z)*.385;   // on the slope of the upper
  g.hex([[-.26,ys(.75)-.1,.75],[.26,ys(.75)-.1,.75],[.26,ys(-.1)-.1,-.1],[-.26,ys(-.1)-.1,-.1],[-.24,ys(.75),.75],[.24,ys(.75),.75],[.24,ys(-.1)+.08,-.1],[-.24,ys(-.1)+.08,-.1]],lite(m,.25));   // tongue
  for(let i=0;i<5;i++){const z=.66-i*.17;g.rod([-.3,ys(z)+.02,z],[.3,ys(z-.12)+.02,z-.12],.055,WH);g.rod([.3,ys(z)+.02,z],[-.3,ys(z-.12)+.02,z-.12],.055,WH)}
  g.both(s=>{g.rod([s*.64,.0,.6],[s*.7,-.05,-.9],.12,WH);g.rod([s*.62,.1,.2],[s*.68,.04,-1.2],.08,WH)});
  g.box(0,.55,-1.75,.25,.32,.1,WH);g.ball(0,.12,-1.85,.62,.36,.36,lite(m,.2),10,4);
}},
{name:'Rocket Car',grp:'silly',own:0xe0453c,wheel:null,W:W4(.72,1.1,-1.2,.3,.32,.24),draw(g,m){
  const body=0xf2f4f8;
  g.loft('z',[[-2.0,.42,.42,0,.02],[-1.7,.55,.55,0,.05],[.8,.55,.55,0,.05],[1.5,.42,.42,0,.03],[2.0,.22,.22,0,0],[2.3,.02,.02,0,-.02]],12,body,{cap1:false,colFn:j=>j>=3?m:body});
  g.cyl('z',0,.02,-2.15,.32,.3,0x3a3f50,12,DK,.42);g.disc('-z',-2.302,0,.02,.26,0xffa31a,12);
  g.both(s=>g.hex([[s*.4,-.1,-1.8],[s*.45,-.1,-1.0],[s*.45,-.02,-1.0],[s*.4,-.02,-1.8],[s*1.0,-.32,-2.05],[s*.98,-.32,-1.75],[s*.98,-.25,-1.75],[s*1.0,-.25,-2.05]],m));
  g.hex([[-.04,.5,-1.8],[.04,.5,-1.8],[.04,.5,-1.0],[-.04,.5,-1.0],[-.03,1.05,-2.05],[.03,1.05,-2.05],[.03,1.05,-1.75],[-.03,1.05,-1.75]],m);
  g.ball(0,.48,.2,.38,.32,.62,GL,10,5);sidePlate(g,.553,-.4,.05,1.8,.06,m);
  g.both(s=>{g.cyl('z',s*.62,-.2,-.6,.14,1.0,body,8,dark(body,.2));g.cyl('z',s*.62,-.2,.05,.14,.3,m,8,false,0)});
}},
// ---------------- Sports cars (second wave, Nov 2026) ----------------
{name:'Team Bus',grp:'sport',own:0x1f5fd6,wheel:null,W:W4(.88,1.6,-1.5,.4,.4,.36),draw(g,m){
  const TG=0x26324a;
  g.box(0,-.3,0,1.98,1.75,4.5,m,{top:0xf1efe6,bottom:false});g.box(0,-.34,0,2.0,.16,4.52,DK,{top:false,bottom:false});
  sidePlate(g,.992,-.15,.85,3.7,.5,TG);for(let i=0;i<6;i++)sidePlate(g,.995,-1.85+i*.62,.85,.05,.5,m);   // tinted windows
  sidePlate(g,.993,0,.28,4.4,.16,WH);sidePlate(g,.993,0,.13,4.4,.06,0xffc21a);                          // team stripe
  g.both(s=>g.star(s>0?'+x':'-x',s*.996,1.55,.55,.26,WH));
  g.plate('+z',2.252,0,.78,1.7,.6,TG);g.plate('+z',2.255,0,.78,.04,.6,DK);g.plate('+z',2.253,0,1.27,1.1,.16,0x15171e);
  [-.36,-.18,0,.18,.36].forEach(x=>g.plate('+z',2.256,x,1.27,.1,.08,AMB));                              // the sign over the windscreen
  lights(g,2.253,-.05,.7,.25,.15);lights(g,-2.252,.1,.75,.2,.3);g.plate('-z',-2.252,0,.85,1.5,.45,TG);
  g.box(0,-.32,2.27,1.9,.16,.08,DK);g.box(0,-.32,-2.27,1.9,.16,.08,DK);g.box(0,1.45,-.7,1.0,.1,1.2,CH);
}},
{name:'Ice Resurfacer',grp:'sport',own:0xf4f6f8,wheel:null,W:W4(.86,1.35,-1.35,.38,.38,.32),draw(g,m){
  g.box(0,-.3,0,1.9,.6,4.3,m,{bottom:false});g.box(0,-.34,0,1.92,.12,4.32,DK,{top:false,bottom:false});
  g.box(0,.3,-.9,1.86,.85,2.0,m,{bottom:false});g.box(0,1.15,-.9,1.7,.05,1.8,0x9fd8ff);                   // the snow tank
  sidePlate(g,.952,0,.02,4.2,.12,0x2350c8);sidePlate(g,.952,0,-.14,4.2,.06,0xd8262f);sidePlate(g,.932,-.9,.75,1.9,.1,0x2350c8);
  g.box(.35,.3,.75,.6,.12,.6,DK);g.box(.35,.42,.45,.6,.55,.1,DK);g.rod([.35,.3,1.3],[.35,.75,1.05],.05,DK);g.cyl('y',.35,.76,1.04,.17,.04,DK,10);
  g.box(-.45,.3,1.2,.7,.4,.9,m);g.plate('+z',2.152,0,.0,1.2,.22,DK);lights(g,2.153,.05,.7,.22,.14);lights(g,-2.152,.15,.75,.2,.14);
  g.box(0,-.48,-2.2,1.9,.3,.24,MET);g.plate('-z',-2.322,0,-.42,1.8,.08,0x9fd8ff);
  g.cyl('y',-.6,1.24,-.1,.08,.14,AMB,8);g.both(s=>g.rod([s*.9,.3,.05],[s*.9,1.0,.05],.04,CH));
}},
{name:'Golf Cart Racer',grp:'sport',own:0xd8202f,wheel:'slicks',W:W4(.68,1.0,-.95,.28,.3,.24),draw(g,m){
  g.box(0,-.38,0,1.4,.4,2.7,m,{bottom:false});g.hex([[-.7,-.38,1.35],[.7,-.38,1.35],[.6,-.38,1.68],[-.6,-.38,1.68],[-.7,.02,1.35],[.7,.02,1.35],[.58,-.16,1.64],[-.58,-.16,1.64]],m,{bottom:false});
  for(const x of [-.18,.18])g.plate('+y',.022,x,.2,.14,2.3,WH);                                          // racing stripes
  lights(g,1.66,-.22,.38,.2,.1);g.box(0,.02,-.3,1.16,.14,.6,DK);g.box(0,.16,-.62,1.16,.46,.12,DK);
  g.both(s=>{g.rod([s*.6,.02,-.72],[s*.6,.98,-.72],.06,CH);g.rod([s*.6,.02,-1.25],[s*.6,.96,-1.25],.04,CH)});g.rod([-.6,.98,-.72],[.6,.98,-.72],.06,CH);
  g.box(0,.96,-1.25,1.4,.06,.4,m);g.plate('-z',-1.452,0,.99,1.3,.04,WH);                                // spoiler
  sideDisc(g,.702,.15,-.18,.18,WH,12);g.both(s=>g.star(s>0?'+x':'-x',s*.704,.15,-.18,.13,DK));
  g.rod([0,.02,.55],[0,.42,.32],.05,DK);g.cyl('y',0,.43,.3,.15,.04,DK,10);
  g.both(s=>g.cyl('z',s*.4,-.22,-1.42,.06,.22,CH,8,DK));
}},
{name:'Football Helmet',grp:'sport',own:0x1f5fd6,wheel:null,W:W4(.8,1.2,-1.2,.34,.34,.3),draw(g,m){
  g.box(0,-.34,0,1.7,.24,3.9,DK,{bottom:false});
  const rings=[];for(let k=0;k<=6;k++){const a=k/6*Math.PI/2;rings.push([-.22+1.3*Math.sin(a),.98*Math.cos(a)+.001,2.0*Math.cos(a)+.001,0,-.1])}
  g.loft('y',rings,16,m,{rot:-Math.PI/16,cap0:DK,colFn:(j,i)=>i===4||i===12?WH:m});                     // the shell, with a stripe over the top
  for(const y of [-.1,.2])g.rod([-.62,y,1.62],[.62,y,1.62],.07,CH);g.both(s=>g.rod([s*.62,-.1,1.62],[s*.78,.3,.9],.07,CH));
  g.rod([0,-.12,1.66],[0,.42,1.5],.07,CH);g.both(s=>g.ball(s*.9,.1,-.1,.03,.12,.12,DK,6,3));
  lights(g,1.95,-.3,.5,.22,.1);lights(g,-1.95,-.25,.5,.25,.1);
}},
{name:'Soccer Ball',grp:'sport',own:0xf6f7f9,wheel:null,W:W4(.92,1.0,-1.0,.32,.32,.26),draw(g,m){
  g.box(0,-.36,0,1.5,.2,2.6,DK,{bottom:false});
  g.ball(0,.3,0,.82,.82,.82,m,12,8,(j,i)=>j===0||j===7||(j===2&&i%4===0)||(j===4&&i%4===2)||(j===6&&i%4===0)?DK:m);   // patches
  g.ball(0,.62,.5,.36,.26,.3,GL,8,4);lights(g,1.32,-.3,.45,.2,.1);lights(g,-1.32,-.3,.45,.2,.1);
}},
// ---------------- Pirates, suits and robots (second wave) ----------------
{name:'Pirate Ship',grp:'crew',own:0x8a5a2b,wheel:'wood',W:W4(.84,1.25,-1.25,.38,.38,.3),draw(g,m){
  const DW=0x6b4423,SA=0x23252e;
  g.loft('z',[[-2.1,.86,.48,0,.02],[-1.4,.95,.52,0,0],[.6,.95,.52,0,0],[1.5,.72,.46,0,.06],[2.25,.06,.3,0,.2]],12,m,{ex:3,cap1:false,cap0:DW});
  sidePlate(g,.952,-.4,.28,2.4,.07,0xd9a441);
  g.box(0,.4,-.2,1.75,.06,3.1,0xc08a4a);g.both(s=>g.rod([s*.88,.62,-1.9],[s*.88,.62,.9],.06,DW));
  for(const z of [-1.0,-.2,.6])sideDisc(g,.955,z,.02,.1,0xd9a441,10);
  g.cyl('y',0,.98,.3,.06,1.12,DW,8);g.box(0,.6,.3,1.6,.86,.04,SA);                                       // mast and black sail
  for(const z of [.33,.27])for(const s of [1,-1]){g.rod([-.5*s,.72,z],[.5*s,1.34,z],.07,WH);g.box(.54*s,1.28,z,.14,.2,.02,WH)}   // crossed oars
  g.box(0,1.45,.32,.04,.08,.4,m);g.box(0,1.47,.5,.03,.12,.3,0xd8262f);
  g.rod([0,.4,2.15],[0,.7,2.55],.07,DW);g.cyl('z',0,.75,-1.7,.26,.05,DW,8);g.both(s=>g.rod([s*.38,.75,-1.7],[-s*.38,.75,-1.7],.03,DW));
  lights(g,-2.1,.1,.55,.2,.12);
}},
{name:'Black Sedan',grp:'crew',own:0x1d2130,wheel:'whitewall',W:W4(.86,1.45,-1.45,.38,.38,.3),draw(g,m){
  g.box(0,-.3,-.05,1.6,.6,4.3,m,{bottom:false});g.box(0,.3,1.25,1.3,.24,1.75,m,{bottom:false});
  g.box(0,-.22,2.12,.9,.76,.12,CH);for(const x of [-.3,-.15,0,.15,.3])g.plate('+z',2.182,x,.16,.05,.6,DK);   // tall grille
  g.both(s=>{for(const z of [1.45,-1.45])g.ball(s*.85,-.05,z,.3,.32,.56,m,10,5);g.box(s*.95,-.36,0,.24,.05,1.9,DK);
    g.cyl('z',s*.66,.45,2.0,.15,.14,CH,10);g.disc('+z',2.072,s*.66,.45,.12,HL,10)});
  g.cabin(-.8,.8,.3,1.15,-1.7,.4,-1.5,.25,.06,m,0x3a4a60);sidePlate(g,.802,-.05,.22,4.1,.025,0xd9a441);
  g.box(0,-.36,2.26,1.7,.12,.1,CH);g.box(0,-.36,-2.26,1.7,.12,.1,CH);lights(g,-2.202,.05,.6,.16,.12);
  g.cyl('z',0,.2,-2.3,.34,.14,TY,12,CH);g.cyl('y',0,.56,2.05,.04,.12,0xd9a441,6);
}},
{name:'VIP Limo',grp:'crew',own:0x15161c,wheel:null,W:W4(.86,1.68,-1.68,.36,.36,.32),draw(g,m){
  const GD=0xd9a441;
  g.box(0,-.24,0,1.9,.5,4.62,m,{bottom:false});g.box(0,-.28,0,1.92,.1,4.64,DK,{top:false,bottom:false});
  g.cabin(-.84,.84,.26,.76,-1.85,1.02,-1.6,.72,.1,m,0x1c2130);                                          // very dark tinted glass
  for(const z of [-1.15,-.45,.25])g.both(s=>g.hex([[s*.83,.26,z-.06],[s*.86,.26,z-.06],[s*.86,.26,z+.06],[s*.83,.26,z+.06],[s*.73,.765,z-.06],[s*.76,.765,z-.06],[s*.76,.765,z+.06],[s*.73,.765,z+.06]],m));
  sidePlate(g,.952,0,.0,4.4,.04,GD);g.box(0,-.26,2.3,1.9,.12,.08,CH);g.box(0,-.26,-2.3,1.9,.12,.08,CH);
  g.plate('+z',2.312,0,.0,.9,.22,GD);g.plate('+z',2.316,0,.0,.8,.16,DK);g.cyl('y',0,.3,2.1,.05,.12,GD,6);
  g.both(s=>{g.rod([s*.72,.26,2.0],[s*.72,.66,2.0],.03,CH);g.plate(s>0?'+x':'-x',s*.735,2.15,.58,.28,.16,s>0?0x2350c8:0xd8262f)});   // little flags
  lights(g,2.314,.02,.68,.3,.12);lights(g,-2.312,.06,.66,.4,.12);
}},
{name:'Armoured Van',grp:'crew',own:0x6b7468,wheel:null,W:W4(.9,1.45,-1.45,.42,.42,.36),draw(g,m){
  g.box(0,-.3,-.4,1.96,1.75,3.5,m,{bottom:false});g.box(0,-.3,1.7,1.9,1.15,.85,m,{bottom:false});
  g.box(0,-.36,0,2.0,.16,4.4,DK,{top:false,bottom:false});
  g.plate('+z',2.127,0,.55,1.4,.22,0x2a3445);sidePlate(g,.952,1.75,.55,.5,.2,0x2a3445);
  sidePlate(g,.982,-.4,.3,3.3,.14,0xd9a441);g.both(s=>g.star(s>0?'+x':'-x',s*.984,-.4,.8,.28,0xd9a441));
  for(let i=0;i<7;i++)for(const y of [-.15,1.3])g.both(s=>g.box(s*.985,y,-2.0+i*.53,.04,.05,.05,dark(m,.3)));   // rivets
  g.both(s=>g.plate('-z',-2.152,s*.46,.55,.86,1.5,dark(m,.15)));g.both(s=>g.plate('-z',-2.156,s*.12,.55,.06,.24,CH));
  g.box(0,-.34,2.17,2.0,.24,.12,DK);g.box(0,-.34,-2.2,2.0,.24,.12,DK);lights(g,2.128,.05,.7,.22,.14);lights(g,-2.157,1.25,.8,.16,.12);
  g.box(0,1.45,-.6,.7,.08,.7,dark(m,.2));g.cyl('y',.6,1.5,.9,.06,.1,AMB,8);
}},
{name:'Robo Walker',grp:'crew',own:0xb8bccf,wheel:null,W:W4(.82,1.2,-1.2,.34,.34,.3),draw(g,m){
  const JT=0x5a6170,EY=0x3fd2ff;
  g.box(0,-.25,-.15,1.5,.75,2.6,m,{bottom:false});g.box(0,-.32,0,1.6,.12,3.4,DK,{top:false,bottom:false});
  g.ball(0,.62,.3,.55,.4,.6,GL,10,5);g.box(0,.5,-.8,1.2,.3,.8,JT);
  g.both(s=>g.disc('+z',1.152,s*.35,.18,.15,EY,12));for(const x of [-.24,-.08,.08,.24])g.plate('+z',1.152,x,-.05,.08,.12,DK);
  g.both(s=>{g.ball(s*.82,.32,-.15,.18,.18,.18,JT,8,4);g.rod([s*.88,.32,-.15],[s*.98,-.05,.45],.14,m);g.ball(s*.98,-.05,.45,.12,.12,.12,JT,8,4);
    g.rod([s*.98,-.05,.45],[s*.96,-.42,-.1],.12,m);g.box(s*.96,-.55,-.1,.3,.1,.5,JT)});                    // folded legs
  g.both(s=>{g.cyl('y',s*.45,.95,-.8,.025,.6,JT,6);g.ball(s*.45,1.27,-.8,.06,.06,.06,0xff3b3b,6,3)});
  lights(g,-1.452,.1,.5,.2,.12);
}},
{name:'Lowrider',grp:'crew',own:0x7339d9,wheel:'spokes',W:W4(.86,1.4,-1.4,.32,.32,.26),draw(g,m){
  g.box(0,-.38,0,1.9,.44,4.5,m,{bottom:false});g.box(0,-.4,0,1.92,.08,4.52,DK,{top:false,bottom:false});
  g.cabin(-.82,.82,.06,.55,-1.45,.6,-1.15,.2,.1,m,0x3a4a60);
  sidePlate(g,.952,0,-.12,4.3,.03,0xd9a441);sidePlate(g,.952,0,-.2,4.3,.015,0xd9a441);
  for(let i=0;i<6;i++){const z=.8+i*.22;g.both(s=>g.plate(s>0?'+x':'-x',s*.954,z,-.05+((i%2)?.04:-.04),.2,.03,0xd9a441))}   // a gold chain pinstripe
  g.box(0,-.36,2.27,1.94,.12,.08,CH);g.box(0,-.36,-2.27,1.94,.12,.08,CH);g.cyl('y',0,.1,2.05,.04,.1,CH,6);
  lights(g,2.272,-.15,.7,.28,.1);lights(g,-2.272,-.12,.7,.3,.1);g.both(s=>g.cyl('z',s*.98,-.36,0,.06,2.0,CH,8));
}}
];
const GROUPS=[['normal','Normal cars'],['work','Work vehicles'],['toy','Toy cars'],['silly','Silly cars'],['sport','Sports cars'],['crew','Pirates, suits and robots']];

// ======================= what you wear (rampline:cos) and what goes online =======================
const MAX={car:CARS.length-1,paint:PAINTS.length-1,wheels:WHEELS.length-1,smoke:SMOKES.length-1,horn:HORNS.length-1};
const SLOTS=Object.keys(MAX);
function load(){const o=store.get('cos',null),w={v:1,car:0,paint:0,wheels:0,smoke:0,horn:0};
  if(o&&typeof o==='object')for(const k of SLOTS){const n=o[k];if(n===(n|0)&&n>=0&&n<=MAX[k])w[k]=n}return w}
let cs=load();
const saveCs=()=>store.set('cos',cs);
// the look you send: '' when you wear nothing from here that shows on a ghost (car, paint, wheels)
const wire=()=>cs.car||cs.paint||cs.wheels?'1.'+cs.car+'.'+cs.paint+'.'+cs.wheels:'';
// a look from anywhere (the boards, your own): every number checked against the catalogue, unknown ones drawn plain
function parse(x){
  const m=typeof x==='string'&&/^1\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(x);if(!m)return null;
  const n=(v,k)=>{v=+v;return v>=1&&v<=MAX[k]?v:0};
  return {car:n(m[1],'car'),paint:n(m[2],'paint'),wheels:n(m[3],'wheels')};
}
// whether a car would sit in front of the Hood camera (index.html hides its body in that camera only)
const hoods={};
function hoodOf(n,geo){if(n in hoods)return hoods[n];const p=geo.attributes.position.array;let h=false;
  for(let i=0;i<p.length&&!h;i+=3)if(p[i+2]>.62&&p[i+1]>.8&&Math.abs(p[i])<.75)h=true;return hoods[n]=h}
// for makeCarObj: the body, its wheels and where they go. look.x is a look string; look.tint keeps paint as given (your
// own best as a ghost is drawn in the ghost blue). null when the look changes nothing (index.html draws as before).
function build(kind,paint,look){
  const x=parse(look.x);if(!x||!(x.car||x.paint||x.wheels))return null;
  const def=x.car?CARS[x.car]:null,main=look.tint?paint:x.paint?PAINTS[x.paint].c:def&&def.own!=null?def.own:paint;
  let geo;if(def){const g=Geo();def.draw(g,main);geo=g.geometry()}else geo=X.carGeo(kind,main,look.pat|0,look.acc!=null?PAINT[look.acc]:null);
  const wk=x.wheels?WHEELS[x.wheels].k:def&&def.wheel;
  return {geo,wgeo:wk?wheelGeo(wk):null,W:def?def.W:null,hood:def?hoodOf(x.car,geo):false};
}

// ======================= tyre smoke and horns (yours only) =======================
const api={};
function smokeSet(){const s=X.on&&cs.smoke?SMOKES[cs.smoke]:null;
  api.smoke=!s?null:s.c===-1?c=>c.setHSL((performance.now()/1800)%1,.9,.7):s.c===-2?c=>c.setHSL(Math.random(),.95,.64):c=>c.setHex(s.c)}
function hornPlay(n){
  const T=X.tone,N=X.noise;
  switch(n){
    case 1:for(const d of [0,.17]){T(440,440,.12,'square',.13,d);T(554,554,.12,'square',.07,d)}break;
    case 2:T(300,170,.28,'sawtooth',.17);T(312,180,.28,'square',.07);break;
    case 3:[233,294,349].forEach(f=>T(f,f*.98,.62,'sawtooth',.09));break;
    case 4:[659,784,880,784,1046].forEach((f,i)=>T(f,f,.12,'triangle',.16,i*.12));break;
    case 5:for(const d of [0,.19]){T(880,480,.13,'sawtooth',.12,d);T(1320,700,.1,'square',.04,d)}N(.08,1400,.06);break;
    case 6:for(const d of [0,.22]){T(2100,2080,.45,'sine',.12,d);T(2640,2620,.35,'sine',.05,d)}break;
    case 7:T(1200,1900,.12,'sine',.15);T(1900,1100,.13,'sine',.15,.13);break;
    case 8:T(1600,180,.38,'square',.07);T(1200,150,.38,'sawtooth',.05,.05);break;
    case 9:T(110,104,.95,'sawtooth',.17);T(165,158,.95,'square',.06);break;
    case 10:[784,659,784,880,784,659,523].forEach((f,i)=>T(f,f,.11,'sine',.15,i*.11));break;
    case 11:[587,740,880].forEach((f,i)=>T(f,f*1.02,.6,'sine',.09-i*.015));break;
    case 12:for(const d of [0,.34])for(const [f,v,l] of [[600,.14,1.2],[300,.05,1.3],[1430,.05,.7],[1985,.03,.45]])T(f,f,l,'sine',v,d);break;
    case 13:T(2650,2700,.45,'sine',.12);N(.45,3000,.03);T(2700,2700,.15,'sine',.12,.55);break;
  }
}
let lastHonk=0;
// your horn (H, or the horn button): false when you have none
function honk(n){n=n||(X.on?cs.horn:0);if(!n||!HORNS[n])return false;const t=performance.now();if(t-lastHonk<280)return true;lastHonk=t;
  X.initAudio();if(X.ac)hornPlay(n);return true}

// ======================= pictures of the cars, from their real models =======================
const SN={};
function snapGroup(cv,grp,yaw,pitch,dist,ty){
  if(!SN.scene){const s=new THREE.Scene();s.add(new THREE.HemisphereLight(0xffffff,0x8090a8,.78));const d=new THREE.DirectionalLight(0xffffff,.62);d.position.set(3,7,4);s.add(d);
    SN.scene=s;SN.cam=new THREE.PerspectiveCamera(24,1.6,.1,80);SN.tmp=document.createElement('canvas')}
  const w=cv.width*2,h=cv.height*2,r=X.renderer;
  if(!SN.rt||SN.rt.width!==w||SN.rt.height!==h){if(SN.rt)SN.rt.dispose();SN.rt=new THREE.WebGLRenderTarget(w,h);SN.buf=new Uint8Array(w*h*4);SN.img=new ImageData(w,h)}
  const cam=SN.cam;cam.aspect=w/h;cam.updateProjectionMatrix();
  cam.position.set(Math.sin(yaw)*Math.cos(pitch)*dist,ty+Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist);cam.lookAt(0,ty,0);
  SN.scene.add(grp);grp.updateMatrixWorld(true);
  const old=r.getRenderTarget(),cc=r.getClearColor(new THREE.Color()),ca=r.getClearAlpha();
  try{r.setRenderTarget(SN.rt);r.setClearColor(0x000000,0);r.clear();r.render(SN.scene,cam);r.readRenderTargetPixels(SN.rt,0,0,w,h,SN.buf)}
  finally{r.setRenderTarget(old);r.setClearColor(cc,ca);SN.scene.remove(grp)}
  const d=SN.img.data,row=w*4;for(let y=0;y<h;y++)d.set(SN.buf.subarray((h-1-y)*row,(h-y)*row),y*row);
  SN.tmp.width=w;SN.tmp.height=h;SN.tmp.getContext('2d').putImageData(SN.img,0,0);
  const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);g.imageSmoothingQuality='high';g.drawImage(SN.tmp,0,0,cv.width,cv.height);
}
// a car wearing look string x (with your garage car, paint and rims under it), from the front (side 0) or the back (1)
function snapCar(cv,x,side){
  const obj=X.makeCarObj(X.gar.car,PAINT[X.gar.col],false,x?Object.assign({},X.gar,{x}):X.gar);
  X.poseCar(obj,[0,0,0],[0,0,1],[0,1,0],0,0,0,false);
  try{snapGroup(cv,obj.grp,side?Math.PI+.72:.72,.32,9.6,.2)}finally{obj.dispose()}
}
const wheelMat=new THREE.MeshLambertMaterial({vertexColors:true});
function snapWheel(cv,k){const m=k?new THREE.Mesh(wheelGeo(k),wheelMat):new THREE.Mesh(X.wheelGeoFor(X.gar.rim|0),wheelMat);m.rotation.y=1.05;snapGroup(cv,m,0,.15,6.4,0);}

// ======================= the Captain's garage screen =======================
const css=document.createElement('style');
css.textContent=`
#garage .cg-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-top:12px}
#garage .cg-pv{background:linear-gradient(#d8ecff,#f7fbff);border:3px solid var(--ink);border-radius:14px;position:relative;overflow:hidden}
#garage .cg-pv canvas{width:100%;height:auto;aspect-ratio:8/5;display:block}
#garage .cg-pv span{position:absolute;left:9px;top:6px;font:900 11px var(--f-b);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
#garage .cg-now{margin:8px 0 0;font-weight:800;font-size:14px;line-height:1.4}
#garage .cg-tabs{margin-top:12px;overflow-x:auto;max-width:100%}
#garage h3{font-family:var(--f-d);font-weight:400;font-size:18px;margin:14px 0 8px}
#garage .cg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px;margin-top:10px}
#garage .cg-it{border:3px solid var(--ink);border-radius:12px;background:#fff;padding:5px 5px 4px;display:flex;flex-direction:column;align-items:center;gap:3px;font-weight:900;font-size:13px;line-height:1.15;text-align:center;box-shadow:0 3px 0 var(--ink)}
#garage .cg-it[aria-pressed="true"]{background:var(--sun)}
#garage .cg-it canvas,#garage .cg-it i{width:100%;height:auto;aspect-ratio:8/5;display:block;border-radius:8px}
#garage .cg-it i.sw{border:2.5px solid var(--ink)}
#garage .cg-it i.horn{aspect-ratio:8/3;display:flex;align-items:center;justify-content:center;background:#eef4ff}
#garage .cg-it i.horn svg{width:38%;height:auto}
@media (max-height:500px){#garage .cg-top{max-width:440px}}
@media (max-width:480px){#garage .cg-tabs button{padding:6px 7px;font-size:12.5px}}
#tHorn{left:calc(14px + env(safe-area-inset-left,0px));bottom:calc(112px + env(safe-area-inset-bottom,0px));width:56px;height:56px;border-radius:50%;background:rgba(255,207,51,.94)}
#tHorn svg{width:30px;height:30px}`;
document.head.appendChild(css);
const HORN_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4h3l7 5V5L6 10z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const ov=document.createElement('section');ov.id='garage';ov.className='overlay';ov.hidden=true;
ov.innerHTML='<div class="wrap card" style="max-width:860px"><div class="pick-head"><h2>Captain’s garage</h2><button class="btn sm alt" type="button" data-back>Back</button></div>'+
  '<p class="sub">Not public yet: only the site’s captains can see this, and everything here is free to wear. Your car, paint and wheels show on the online boards and as your ghost; smoke and horn are just for you.</p>'+
  '<div class="cg-top"><div class="cg-pv"><canvas width="320" height="200"></canvas><span>Front</span></div><div class="cg-pv"><canvas width="320" height="200"></canvas><span>Back</span></div></div>'+
  '<p class="cg-now" aria-live="polite"></p><div class="seg cg-tabs" role="tablist"></div><div class="cg-list"></div></div>';
(X.$('app')||document.body).appendChild(ov);
if(X.OVERLAYS.indexOf('garage')<0)X.OVERLAYS.push('garage');
ov.querySelector('[data-back]').addEventListener('click',()=>{X.sfx.click();X.showOverlay('menu')});
const pv=ov.querySelectorAll('.cg-pv canvas'),nowP=ov.querySelector('.cg-now'),tabs=ov.querySelector('.cg-tabs'),list=ov.querySelector('.cg-list');
const TABS=[['car','Cars'],['paint','Paint'],['wheels','Wheels'],['smoke','Tyre smoke'],['horn','Horn']];
let tab='car',jobs=[],jobT=0;
function queue(cv,fn,first){jobs=jobs.filter(j=>j[0]!==cv);if(first)jobs.unshift([cv,fn]);else jobs.push([cv,fn]);if(!jobT)jobT=requestAnimationFrame(runJobs)}
function runJobs(){jobT=0;const t0=performance.now();while(jobs.length&&performance.now()-t0<24){const [cv,fn]=jobs.shift();if(cv.isConnected)try{fn()}catch(e){console.warn(e)}}if(jobs.length)jobT=requestAnimationFrame(runJobs)}
const lk=(car,paint,wheels)=>car||paint||wheels?'1.'+car+'.'+paint+'.'+wheels:'';
const hex=c=>'#'+c.toString(16).padStart(6,'0');
function nowText(){const b=[cs.car?_t(CARS[cs.car].name):_t('{c} (garage car)',{c:X.CARS[X.gar.car].name})];
  if(cs.paint)b.push(_t('{p} paint',{p:_t(PAINTS[cs.paint].name)}));if(cs.wheels)b.push(_t(WHEELS[cs.wheels].name));if(cs.smoke)b.push(_t('{s} smoke',{s:_t(SMOKES[cs.smoke].name)}));
  if(cs.horn)b.push(/horn/i.test(HORNS[cs.horn].name)?_t('{h} ({k})',{h:_t(HORNS[cs.horn].name),k:X.touch?_t('the horn button'):'H'}):_t('{h} horn ({k})',{h:_t(HORNS[cs.horn].name),k:X.touch?_t('the horn button'):'H'}));return _t('Wearing: {w}',{w:b.join(' · ')})}
document.addEventListener('backroom:lang',()=>{if(nowP)nowP.textContent=nowText()});
function preview(){nowP.textContent=nowText();const x=wire();queue(pv[1],()=>snapCar(pv[1],x,1),1);queue(pv[0],()=>snapCar(pv[0],x,0),1)}
function item(slot,n,label,pic){const b=document.createElement('button');b.type='button';b.className='cg-it';b.setAttribute('aria-pressed',String(cs[slot]===n));
  b.append(pic,document.createTextNode(label));b.addEventListener('click',()=>pick(slot,n));return b}
function canvas(){const c=document.createElement('canvas');c.width=160;c.height=100;return c}
function renderList(){
  tabs.textContent='';TABS.forEach(([k,n])=>{const b=document.createElement('button');b.type='button';b.textContent=n;b.setAttribute('role','tab');b.setAttribute('aria-pressed',String(k===tab));b.addEventListener('click',()=>{X.sfx.click();tab=k;renderList()});tabs.appendChild(b)});
  list.textContent='';jobs=jobs.filter(j=>j[0].isConnected);
  const grid=()=>{const d=document.createElement('div');d.className='cg-grid';list.appendChild(d);return d};
  if(tab==='car'){
    let d=grid();const c0=canvas();d.appendChild(item('car',0,'Garage car',c0));queue(c0,()=>snapCar(c0,lk(0,cs.paint,cs.wheels),0));
    for(const [gk,gn] of GROUPS){const h=document.createElement('h3');h.textContent=gn;list.appendChild(h);d=grid();
      CARS.forEach((c,n)=>{if(!c||c.grp!==gk)return;const cv=canvas();d.appendChild(item('car',n,c.name,cv));queue(cv,()=>snapCar(cv,lk(n,cs.paint,cs.wheels),0))})}
  }else if(tab==='paint'){const d=grid(),own=cs.car&&CARS[cs.car].own!=null?CARS[cs.car].own:PAINT[X.gar.col];
    const sw=c=>{const i=document.createElement('i');i.className='sw';i.style.background=hex(c);return i};
    d.appendChild(item('paint',0,cs.car&&CARS[cs.car].own!=null?'The car’s own':'Garage colour',sw(own)));
    PAINTS.forEach((p,n)=>{if(p)d.appendChild(item('paint',n,p.name,sw(p.c)))});
  }else if(tab==='wheels'){const d=grid(),w0=canvas(),own=cs.car&&CARS[cs.car].wheel;
    d.appendChild(item('wheels',0,own?'The car’s own':'Garage rims',w0));queue(w0,()=>snapWheel(w0,own||null));
    WHEELS.forEach((w,n)=>{if(!w)return;const cv=canvas();d.appendChild(item('wheels',n,w.name,cv));queue(cv,()=>snapWheel(cv,w.k))});
  }else if(tab==='smoke'){const d=grid();
    const puffPic=s=>{const i=document.createElement('i');i.className='sw';const c=!s?'#ecebe8':s.c===-1?null:s.c===-2?null:hex(s.c);
      i.style.background=c?'radial-gradient(circle at 35% 55%,'+c+' 0 22%,transparent 23%),radial-gradient(circle at 62% 45%,'+c+' 0 28%,transparent 29%),radial-gradient(circle at 50% 62%,'+c+' 0 30%,#3b4560 31%)':
        s.c===-1?'radial-gradient(circle at 50% 55%,transparent 0 30%,#3b4560 31%),conic-gradient(#ff5a5a,#ffd21f,#3ddc97,#3b82f6,#a855f7,#ff5a5a)':
        'radial-gradient(circle at 30% 40%,#ff5fa8 0 9%,transparent 10%),radial-gradient(circle at 62% 35%,#3ddc97 0 9%,transparent 10%),radial-gradient(circle at 48% 66%,#ffd21f 0 9%,transparent 10%),radial-gradient(circle at 74% 64%,#6cc4ff 0 9%,transparent 10%),#3b4560';return i};
    d.appendChild(item('smoke',0,'Plain',puffPic(null)));SMOKES.forEach((s,n)=>{if(s)d.appendChild(item('smoke',n,s.name,puffPic(s)))});
  }else{const d=grid();const pic=()=>{const i=document.createElement('i');i.className='sw horn';i.innerHTML=HORN_SVG;return i};
    d.appendChild(item('horn',0,'No horn',pic()));HORNS.forEach((h,n)=>{if(h)d.appendChild(item('horn',n,h.name,pic()))});
    const p=document.createElement('p');p.className='note';p.textContent='Pick one to hear it. While driving, press H (or the horn button on a touch screen).';list.appendChild(p);
  }
}
function pick(slot,n){
  if(!X.on)return;const was=cs[slot];cs[slot]=n;saveCs();X.sfx.click();
  if(slot==='horn')honk(n);
  if(slot==='car'||slot==='paint'||slot==='wheels'){X.rebuildCars();preview()}else nowP.textContent=nowText();
  smokeSet();hornButton();
  if(was!==n&&(slot==='paint'||slot==='wheels'||(slot==='car'&&tab!=='car'))){renderList();return}
  [...list.querySelectorAll('.cg-it')].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===n)));
}
function open(){if(!X.on)return;cs=load();X.showOverlay('garage');ov.scrollTop=0;renderList();preview()}
// the touch screen's horn button, beside the steering (only while a horn is worn)
function hornButton(){
  let b=document.getElementById('tHorn');const want=X.on&&cs.horn>0,box=X.$('touch');
  if(want&&!b&&box){b=document.createElement('button');b.className='tb';b.id='tHorn';b.type='button';b.setAttribute('aria-label','Horn');b.innerHTML=HORN_SVG;
    b.addEventListener('pointerdown',e=>{e.preventDefault();honk();b.classList.add('on');setTimeout(()=>b.classList.remove('on'),160)});box.appendChild(b)}
  else if(!want&&b)b.remove();
}
// X.on may have changed (a captain signed in or out): show or hide what is yours
function access(){if(!X.on&&X.G.overlay==='garage')X.showOverlay('menu');smokeSet();hornButton()}

Object.assign(api,{build,parse,wire,honk,access,open,
  // the way in, at the end of the Garage card (index.html asks only while X.on)
  button(box){const r=document.createElement('div');r.className='row';r.style.marginTop='12px';
    const b=X.mkBtn('Captain’s garage','sm coral',open);b.title='Hidden for now: only the site’s captains see this';r.appendChild(b);
    if(cs.car||cs.paint||cs.wheels||cs.smoke||cs.horn){const s=document.createElement('span');s.className='note';s.textContent=cs.car?CARS[cs.car].name:'Extras on';r.appendChild(s)}
    box.appendChild(r)},
  CARS,PAINTS,WHEELS,SMOKES,HORNS,GROUPS});
Object.defineProperty(api,'worn',{get(){return Object.assign({},cs)}});
// for tests (automated browsers only): pictures of every car and wheel, triangle counts, the hood check
if(navigator.webdriver)Object.assign(api,{snapCar,snapWheel,hoodOf,Geo,
  tris(n){const g=Geo();CARS[n].draw(g,0xff5a4e);return g.tris},
  wheelTris(k){return wheelGeo(k).userData.tris},
  sheet(o){o=o||{};const w=o.w||240,h=o.h||150,cols=o.cols||4,ids=o.ids||CARS.map((c,i)=>i).filter(i=>i),paint=o.paint|0,wheels=o.wheels|0;
    const out=document.createElement('canvas');out.width=cols*w*2;out.height=Math.ceil(ids.length/cols)*(h+22);const g=out.getContext('2d');g.fillStyle='#e8f2fc';g.fillRect(0,0,out.width,out.height);
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;g.font='bold 15px sans-serif';g.fillStyle='#16213a';
    ids.forEach((n,i)=>{const x=(i%cols)*w*2,y=Math.floor(i/cols)*(h+22);for(const s of [0,1]){snapCar(cv,lk(n,paint,wheels),s);g.drawImage(cv,x+s*w,y+20)}g.fillText(n+' '+(CARS[n]?CARS[n].name:'garage car')+'  ('+(n?api.tris(n):0)+' tris)',x+6,y+15)});
    return out.toDataURL('image/png')},
  wheelSheet(){const w=200,h=125,keys=WHEELS.filter(Boolean).map(x=>x.k).concat(['tractor','mesh','tin','rc','pram','plate','caster','brass']);
    const out=document.createElement('canvas');out.width=5*w;out.height=Math.ceil(keys.length/5)*(h+20);const g=out.getContext('2d');g.fillStyle='#e8f2fc';g.fillRect(0,0,out.width,out.height);
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;g.font='bold 14px sans-serif';g.fillStyle='#16213a';
    keys.forEach((k,i)=>{const x=(i%5)*w,y=Math.floor(i/5)*(h+20);snapWheel(cv,k);g.drawImage(cv,x,y+18);g.fillText(k+' ('+wheelGeo(k).userData.tris+')',x+6,y+14)});return out.toDataURL('image/png')}});
smokeSet();hornButton();
return api;
};
