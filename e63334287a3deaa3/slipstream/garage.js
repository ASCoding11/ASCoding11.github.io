/*
 * Slipstream's cosmetics: sponsors, stickers, liveries, helmets, boost effects and the Garage screen.
 *
 * SWITCHED OFF WITH THE COSMETICS SYSTEM. index.html only fetches this file when ../cosmetics.js says the cosmetics are
 * on (ENABLED there, or ?cosmetics=1 on localhost / in an automated browser). When they are off this file is never
 * loaded, nothing here runs, and the game is exactly as it was.
 *
 * Looks only: nothing in here is read by the driving, the bots, the collisions or the timing.
 *
 * How a car is dressed (dress / applyTo). index.html builds every car as before and then hands it over. Nothing is ever
 * added to a car: only the geometry and material of meshes it already has are swapped, so a car is the same number of
 * draw calls with or without cosmetics.
 *   - ONE shared picture (the atlas, 2048 x 1024; half that on touch screens) holds every sticker (256 x 64 cells) and
 *     every livery (256 x 128 cells: the side view over the top view) of the cars in the race, drawn in code. Cars that
 *     wear something use one shared material that reads it (paintTex; chrome and matte are two more with the same
 *     picture). A car wearing nothing keeps the game's own geometry and material.
 *   - Stickers are flat panels 12 mm proud of the paint, merged into the car's one body mesh (seven: nose, two
 *     sidepods, two engine-cover sides, two rear-wing endplates) and into the DRS flap (one, readable from behind).
 *     16 triangles a car at most. The helmet's sticker is painted on the helmet's own picture.
 *   - A livery repaints only the panels index.html marks with colour slot 4 (nose, tub, sidepods, engine cover). The
 *     airbox, fin, mirrors, both wings and the endplates always stay in the team's two colours, and the name tags, the
 *     timing tower and the map never change, so a team can still be told apart under any livery.
 *
 * Online. What a car wears travels in the player's own room node as one short string, `cs`
 * ("1~sponsor~livery~helmet~effect~smoke~font.badge.colour.colour.slots~text", item numbers from cosmetics.js). Pages
 * from before this file ignore the field. On reading (readWire) every part is checked again: the whole string against
 * one pattern, every number against the catalogue and its slot, and the sticker text for length, characters and the
 * site's name filter (/namefilter.js). Text that fails any check is never drawn.
 */
window.SlipstreamGarage=function(X){
'use strict';
const {THREE,C,renderer,TEAMS,CAR_GEO,MAT,store,$,toast}=X;
const GAME='slipstream',NF=window.NameFilter;
const ITEMS=C.items(GAME),BY_NO=new Map(ITEMS.map(i=>[i.no,i])),BY_ID=C.ITEMS_BY_ID;
const item=k=>BY_ID['ss-'+k]||null;                 // 'lv-flames' -> the catalogue item
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;

// =====================================================================
//  The custom sticker: short text, a font, a badge shape, two colours, and the slots it goes on
// =====================================================================
const ST_MAX=16,ST_RE=/^[A-Za-z0-9 '&!.\-]{1,16}$/;
const SLOTS=[['nose','Nose',1],['pods','Sidepods',2],['wing','Rear wing',4],['engine','Engine cover',8],['helmet','Helmet',16]];
const FONTS=[['Bold','900 ','"Titillium Web",system-ui,sans-serif',0],['Racing','italic 900 ','"Titillium Web",system-ui,sans-serif',1],
  ['Classic','bold ','Georgia,"Times New Roman",serif',0],['Stencil','bold ','"Courier New",ui-monospace,monospace',1]];   // name, style, family, capitals
const BADGES=['Plain','Pill','Plate','Oval','Banner'];
const PAL=['#ffffff','#17191e','#ff2a36','#ff7a1a','#ffd21f','#2fd36b','#11c9b6','#29b6ff','#2a6bff','#6c2bd9','#ff4fa3','#c4ccd4'];
const PAL_NAMES=['White','Black','Red','Orange','Yellow','Green','Teal','Sky','Blue','Purple','Pink','Silver'];
function cleanText(s){return String(s==null?'':s).replace(/[‘’`´]/g,"'").replace(/\s+/g,' ').trim()}
// why a text can't be used ('' when it can). The name filter is the site's own (/namefilter.js): the same one names go through.
function textProblem(t){
  if(typeof t!=='string'||!t)return 'empty';
  if(t.length>ST_MAX)return 'long';
  if(!ST_RE.test(t)||!/[A-Za-z0-9]/.test(t)||t!==cleanText(t))return 'chars';
  if(!NF||typeof NF.isBad!=='function')return 'nofilter';
  if(NF.isBad(t))return 'rude';
  return '';
}
const int=(v,n)=>Number.isInteger(v)&&v>=0&&v<n;
function sticker(o){ // a checked copy, or null
  if(!o||typeof o!=='object'||textProblem(o.t)||!int(o.f,FONTS.length)||!int(o.b,BADGES.length)||!int(o.a,PAL.length)||!int(o.c,PAL.length)||!int(o.m,32))return null;
  return {t:o.t,f:o.f,b:o.b,a:o.a,c:o.c,m:o.m};
}
const lum=h=>{const n=parseInt(h.slice(1),16);return (.299*(n>>16)+.587*(n>>8&255)+.114*(n&255))/255};
function rr(g,x,y,w,h,r){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h)}
function fitText(g,t,style,fam,size,maxW){do{g.font=style+size+'px '+fam}while(g.measureText(t).width>maxW&&--size>9);return size}
function paintSticker(g,s){ // on 256 x 64
  const A=PAL[s.a],B=s.a===s.c?(lum(A)>.5?'#17191e':'#ffffff'):PAL[s.c],F=FONTS[s.f],t=F[3]?s.t.toUpperCase():s.t;
  let maxW=240,size=42;g.lineJoin='round';
  if(s.b===1){rr(g,3,6,250,52,26);g.fillStyle=A;g.fill();rr(g,7.5,10.5,241,43,21.5);g.strokeStyle=B;g.lineWidth=1.5;g.globalAlpha=.55;g.stroke();g.globalAlpha=1;maxW=208;size=36}
  else if(s.b===2){rr(g,3,5,250,54,8);g.fillStyle=A;g.fill();rr(g,8,10,240,44,4);g.strokeStyle=B;g.lineWidth=2.5;g.stroke();maxW=216;size=34}
  else if(s.b===3){g.beginPath();g.ellipse(128,32,124,28,0,0,7);g.fillStyle=A;g.fill();g.beginPath();g.ellipse(128,32,117,22.5,0,0,7);g.strokeStyle=B;g.lineWidth=2;g.stroke();maxW=176;size=32}
  else if(s.b===4){g.beginPath();g.moveTo(18,6);g.lineTo(253,6);g.lineTo(238,58);g.lineTo(3,58);g.closePath();g.fillStyle=A;g.fill();
    g.fillStyle=B;for(const x of [0,11]){g.beginPath();g.moveTo(26+x,6);g.lineTo(31+x,6);g.lineTo(16+x,58);g.lineTo(11+x,58);g.fill()}maxW=186;size=36}
  size=fitText(g,t,F[1],F[2],size,maxW);
  const cx=s.b===4?136:128;g.textAlign='center';g.textBaseline='middle';
  if(s.b===0){g.lineWidth=Math.max(5,size*.2);g.strokeStyle=A;g.strokeText(t,cx,33)}
  g.fillStyle=B;g.fillText(t,cx,33+size*.03);
}

// =====================================================================
//  What a car wears: { sp, lv, hm, fx, sm, pd: item keys ('' = nothing), st: sticker or null }
// =====================================================================
const EMPTY={sp:'',lv:'',hm:'',fx:'',sm:'',pd:'',st:null};
let mine=null;                       // my own look, worked out again whenever something is equipped or the sticker changes
function myLook(){
  if(mine)return mine;
  const e=C.equipped().games[GAME]||{},k=s=>e[s]&&BY_ID[e[s]]?e[s].slice(3):'';
  return mine={sp:k('sponsor'),lv:k('livery'),hm:k('helmet'),fx:k('effect'),sm:k('smoke'),pd:k('podium'),st:sticker(store.get('sticker',null))};
}
document.addEventListener('backroom:cosmetics',()=>{mine=null});
const bare=L=>!L||!(L.sp||L.lv||L.hm||L.fx||L.sm||L.st);
// ---- the wire: one short string in the player's own room node
function wireOf(L){
  if(bare(L))return '';
  const n=k=>{const it=k&&item(k);return it?it.no:0},s=L.st;
  return ['1',n(L.sp),n(L.lv),n(L.hm),n(L.fx),n(L.sm),s?[s.f,s.b,s.a,s.c,s.m].join('.'):'',s?s.t:''].join('~');
}
const WIRE_RE=/^1~(\d{1,3})~(\d{1,3})~(\d{1,3})~(\d{1,3})~(\d{1,3})~(?:(\d)\.(\d)\.(\d{1,2})\.(\d{1,2})\.(\d{1,2}))?~([A-Za-z0-9 '&!.\-]{0,16})$/;
function readWire(s){ // a look, or null. Everything is checked again here: never trust what another browser sent.
  if(typeof s!=='string'||s.length>64)return null;
  const m=WIRE_RE.exec(s);if(!m)return null;
  const it=(i,slot)=>{const x=BY_NO.get(+m[i]);return x&&x.slot===slot?x.id.slice(3):''};
  const L={sp:it(1,'sponsor'),lv:it(2,'livery'),hm:it(3,'helmet'),fx:it(4,'effect'),sm:it(5,'smoke'),pd:'',st:null};
  if(m[6]!==undefined&&m[11])L.st=sticker({t:m[11],f:+m[6],b:+m[7],a:+m[8],c:+m[9],m:+m[10]});
  return bare(L)?null:L;
}
const remote=new Map();              // uid -> { raw, L }
let wireN=0;
function wire(){
  const s=wireOf(myLook());if(!s)return '';
  // While racing the node is rewritten 15 times a second, so the look only rides along about once every two seconds;
  // in the lobby and on the grid (where a new arrival first reads it) it is always there. Readers keep the last one.
  const r=X.race;if(r&&r.online&&!r.attract&&!r.ended&&X.raceT()>0&&++wireN%30)return '';
  return s;
}
function heard(uid,v){
  const s=v&&v.cs;if(typeof s!=='string')return;
  const old=remote.get(uid);if(old&&old.raw===s)return;
  if(remote.size>80)remote.clear();
  remote.set(uid,{raw:s,L:readWire(s)});
  const r=X.race;
  if(r&&r.online&&!r.attract&&r.uidSeat){const seat=r.uidSeat.get(uid);if(seat!=null){const c=r.cars[seat];if(c.mesh&&!c.bot&&c.owner===uid)applyTo(c,c.mesh)}}
}
let pvLook=null;                     // the look on the Garage's turning car
function lookOf(c){
  if(c.preview)return pvLook;
  const r=X.race;if(!r)return null;
  if(c.ctrl==='me')return myLook();
  if(c.bot)return botLook(c,r);
  const o=c.owner&&remote.get(c.owner);return o?o.L:null;
}
function botLook(c,r){return null}

// =====================================================================
//  The atlas: one picture for every sticker and livery in the race
// =====================================================================
const SC=X.touch?.5:1,AW=2048*SC,AH=1024*SC,CW=256,CH=64,LH=128,COLS=8,ST_N=48,LV_N=24,LV_Y=384;
const acv=document.createElement('canvas');acv.width=AW;acv.height=AH;
const ag=acv.getContext('2d');ag.fillStyle='#fff';ag.fillRect(0,768*SC,AW,256*SC);   // the white strip: paint with no picture reads here
const atex=new THREE.CanvasTexture(acv);atex.encoding=THREE.sRGBEncoding;atex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());atex.shared=true;
const WHITE_U=.5,WHITE_V=1-(896*SC)/AH;
let dirty=false;
const stCells=new Map(),lvCells=new Map();
// A cell for `key`, painted by paint(g) the first time it is asked for: { u0, u1, vb, vt }, or null when the atlas is full.
// pv (1, 2): one of the cells kept for the Garage's car, repainted every time.
function cell(lv,key,pv,paint){
  const map=lv?lvCells:stCells,max=lv?LV_N-1:ST_N-2,h=lv?LH:CH;
  let i=pv?max+pv-1:map.get(key),fresh=!!pv;
  if(i===undefined){if(map.size>=max)return null;i=map.size;map.set(key,i);fresh=true}
  const x=(i%COLS)*CW*SC,y=((lv?LV_Y:0)+Math.floor(i/COLS)*h)*SC,w=CW*SC,hh=h*SC;
  if(fresh){ag.save();ag.beginPath();ag.rect(x,y,w,hh);ag.clip();ag.clearRect(x,y,w,hh);ag.translate(x,y);ag.scale(SC,SC);try{paint(ag)}catch(e){console.error(e)}ag.restore();dirty=true}
  const e=1.5;return {u0:(x+e)/AW,u1:(x+w-e)/AW,vt:1-(y+e)/AH,vb:1-(y+hh-e)/AH};
}
const mat=o=>{const m=new THREE.MeshPhongMaterial(Object.assign({vertexColors:true,map:atex,alphaTest:.5},o));m.shared=true;return m};
const paintTex=mat({shininess:70,specular:0x4a4a4a});   // the game's own paint, reading the atlas

// =====================================================================
//  Sticker panels on the car (car space: +x forward, +y up, +z the driver's right)
//  Each is four corners as its reader sees them: bottom left, bottom right, top right, top left.
// =====================================================================
const OFF=.012;
const PANELS=(()=>{
  const out=[],add=(bit,P,n)=>out.push({bit,P:P.map(p=>[p[0]+n[0]*OFF,p[1]+n[1]*OFF,p[2]+n[2]*OFF]),n});
  // nose: along the top of the nose cone, over the stripe, read from the car's right
  {const y=x=>.352+(2.9-x)/1.45*.26,a=1.45,b=2.55,w=.135;add(1,[[a,y(a),w],[b,y(b),w],[b,y(b),-w],[a,y(a),-w]],[.176,.984,0])}
  for(const s of [1,-1]){
    // sidepod: the outer face, ahead of the rear wheel
    {const z=x=>s*(.95-(.55-x)*.152),y=x=>.44-(.55-x)*.048,a=-.64,b=.4,h=.13,A=s>0?a:b,B=s>0?b:a;
      add(2,[[A,y(A)-h,z(A)],[B,y(B)-h,z(B)],[B,y(B)+h,z(B)],[A,y(A)+h,z(A)]],[-.15,0,.989*s])}
    // engine cover: the band of its side that shows above the sidepod
    {const z=x=>s*(.4-(-.5-x)/1.9*.27),t=x=>.89-(-.5-x)/1.9*.42,a=-1.35,b=-.55,h=.2,A=s>0?a:b,B=s>0?b:a;
      add(8,[[A,t(A)-h,z(A)],[B,t(B)-h,z(B)],[B,t(B),z(B)],[A,t(A),z(A)]],[-.141,0,.99*s])}
    // rear wing endplate: the outer face
    {const a=-2.91,b=-2.19,A=s>0?a:b,B=s>0?b:a,z=s*.605;add(4,[[A,.86,z],[B,.86,z],[B,1.04,z],[A,1.04,z]],[0,0,s])}
  }
  return out;
})();
// the DRS flap (in the flap mesh's own space): across its top, read from behind the car
const FLAP_PANEL={bit:4,P:[[-.13,.025+OFF,-.5],[-.13,.025+OFF,.5],[.13,.025+OFF,.5],[.13,.025+OFF,-.5]],n:[0,1,0]};
const BODY=CAR_GEO.body,NB=BODY.slot.length;
// A copy of the car's ordinary geometry with uvs for the atlas, the livery panels mapped onto `liv`, and sticker panels added.
function dressGeo(g0,n0,slotOf,liv,quads){
  const n=n0+quads.length*6,P0=g0.attributes.position.array,N0=g0.attributes.normal.array,C0=g0.attributes.color.array;
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3),uv=new Float32Array(n*2);
  pos.set(P0.subarray(0,n0*3));nor.set(N0.subarray(0,n0*3));col.set(C0.subarray(0,n0*3));
  const d=liv?1.5/AH:0,vm=liv?(liv.vt+liv.vb)/2:0;
  for(let i=0;i<n0;i++){
    let u=WHITE_U,v=WHITE_V;
    if(liv&&slotOf&&slotOf[i]===4){
      const x=P0[i*3],y=P0[i*3+1],z=P0[i*3+2],ny=Math.abs(N0[i*3+1]);
      u=lerp(liv.u0,liv.u1,clamp((x+3)/6.1,0,1));
      v=ny>=.7?lerp(liv.vb,vm-d,clamp((z+1)/2,0,1)):lerp(vm+d,liv.vt,clamp((y-.1)/.9,0,1));   // seen from above, or from the side
      col[i*3]=col[i*3+1]=col[i*3+2]=1;
    }
    uv[i*2]=u;uv[i*2+1]=v;
  }
  let o=n0;
  for(const [pn,r] of quads){
    const UV=[[r.u0,r.vb],[r.u1,r.vb],[r.u1,r.vt],[r.u0,r.vt]];
    for(const k of [0,1,2,0,2,3]){pos.set(pn.P[k],o*3);nor.set(pn.n,o*3);col[o*3]=col[o*3+1]=col[o*3+2]=1;uv[o*2]=UV[k][0];uv[o*2+1]=UV[k][1];o++}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  return g;
}

// =====================================================================
//  Dressing a car
// =====================================================================
// the picture for one sticker slot of a look: the custom sticker where it was put, otherwise the sponsor's
function stickerCell(L,bit,pv){
  if(L.st&&L.st.m&bit){const s=L.st;return cell(0,'c'+[s.f,s.b,s.a,s.c,s.t].join('.'),pv?1:0,g=>paintSticker(g,s))}
  return sponsorCell(L,pv);
}
function sponsorCell(L,pv){return null}
function liveryCell(c,L,pv){return null}
function dress(c,m,parts){m.cos=Object.assign(parts,{g0:parts.body.geometry,f0:parts.fm.geometry,own:[]});applyTo(c,m)}
function applyTo(c,m){
  const p=m&&m.cos;if(!p)return;
  for(const g of p.own)g.dispose();p.own.length=0;
  // back to the game's own car first
  p.body.geometry=p.g0;p.body.material=MAT.paint;p.fm.geometry=p.f0;p.fm.material=MAT.paint;
  m.hel.geometry=CAR_GEO.helmet;m.hel.material=X.helmetMat(c.bot?TEAMS[c.team].c2:'#ffffff');
  p.fo.material=MAT.flameOut;p.fi.material=MAT.flameIn;c.cosFx='';c.smokeCol=null;
  const L=lookOf(c);if(bare(L))return;
  const pv=c.preview,liv=liveryCell(c,L,pv),quads=[];
  for(const pn of PANELS){const r=stickerCell(L,pn.bit,pv);if(r)quads.push([pn,r])}
  if(liv||quads.length){const g=dressGeo(p.g0,NB,BODY.slot,liv,quads);p.own.push(g);p.body.geometry=g;p.body.material=bodyMat(L)}
  const fr=stickerCell(L,4,pv);
  if(fr){const g=dressGeo(p.f0,p.f0.attributes.position.count,null,null,[[FLAP_PANEL,fr]]);p.own.push(g);p.fm.geometry=g;p.fm.material=paintTex}
  dressRest(c,m,p,L,pv);
}
function bodyMat(L){return paintTex}
function dressRest(c,m,p,L,pv){}
function clear(list){ // the race's cars are being rebuilt: free what they held and start the atlas again
  for(const m of list)if(m.cos){for(const g of m.cos.own)g.dispose();m.cos.own.length=0}
  stCells.clear();lvCells.clear();
}
function redressAll(){const r=X.race;if(r)for(const c of r.cars)if(c.mesh)applyTo(c,c.mesh)}
function setSticker(o){ // save my sticker (null removes it); false when it didn't pass the checks
  if(o!==null){o=sticker(o);if(!o)return false}
  store.set('sticker',o);mine=null;return true;
}
function frame(dt){
  if(dirty){atex.needsUpdate=true;dirty=false}
  return false;
}
// fonts arrive after the first cars are painted: paint the stickers again once the game's typeface is in
try{Promise.all([document.fonts.load('900 40px "Titillium Web"'),document.fonts.load('italic 900 40px "Titillium Web"')]).then(()=>{stCells.clear();lvCells.clear();redressAll()},()=>{})}catch(e){}

const api={dress,redress:c=>applyTo(c,c.mesh),clear,wire,heard,frame,fx(){},lap(){},finish(){},results(){}};
if(window.__ss)window.__ss.cos={api,readWire,wireOf,myLook,setSticker,textProblem,sticker,remote,atlas:acv,PANELS,redressAll,get mine(){return myLook()},cells:{st:stCells,lv:lvCells}};
return api;
};
