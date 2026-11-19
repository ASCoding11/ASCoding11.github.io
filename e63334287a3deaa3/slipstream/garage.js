/*
 * Slipstream's cosmetics: sponsors, stickers, liveries, helmets, boost effects and the Garage screen.
 *
 * NOT PUBLIC YET. index.html fetches this file only when something needs it:
 *   - this player may see the Garage (X.on): the cosmetics are switched on in ../cosmetics.js (ENABLED there, or
 *     ?cosmetics=1 on localhost / in an automated browser), or the account signed in is one of the site's captains
 *     (../captains.js). X.on can change while the page is open (a captain's account becomes known a moment after the
 *     page loads, and goes away on sign-out): index.html then calls access().
 *   - or another driver in the room wears something. Then this file only dresses their car: no Garage button, nothing
 *     of this player's own is read, worn or sent, and the bots stay plain.
 * For everyone else this file is never loaded, nothing here runs, and the game is exactly as it was.
 *
 * While the shop is not open (cosmetics.js is off: FREE below), nothing is owned, bought or earned: a player who may
 * see the Garage finds every item free to wear, and what they wear is saved by the game itself as ss:kit
 * ({slot: item id}), not in the shop's locker. The sponsor challenges are not counted then either. Once the shop is
 * open, what is worn is what the locker owns, as before.
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
const {THREE,C,renderer,TEAMS,SEATS,CAR_GEO,MAT,store,strHash,mulberry,esc,$,toast}=X;
const GAME='slipstream',NF=window.NameFilter;
const T=window.BackRoomLang?BackRoomLang.t:(s,v)=>s.replace(/\{(\w+)\}/g,(m,n)=>v&&v[n]!=null?v[n]:m);   // Spanish (../lang.js, es.js)
// The catalogue (../cosmetics.js, GAME_ITEMS) knows each item by its slot and number. In here each has a short key
// ('lv-flames', 'hm-shark', 'sp-zoomi'): the names below are in the catalogue's number order, slot by slot.
const SP=['zoomi','burnout','apex','taco','grandma','pitstop','slick','latebrake','draftpunk','gravel','blueflag','honk','chicane','podium','lapnap'];
const NAMES={sponsor:['sp',SP],livery:['lv',['twotone','retro','neon','chrome','carbon','pastel','flames','checkered',...SP]],
  helmet:['hm',['red','blue','yellow','green','orange','pink','black','white','flames','checkered','lightning','chromevisor','shark','skull','tiger','galaxy','disco','watermelon','eightball','eyeball','pumpkin','catears','pizza']],
  effect:['fx',['streaks','flames','sparks','arcs','rainbow','vapor','confetti','plasma']],smoke:['sm',['pink','blue','green','purple','gold']],podium:['pd',['confetti','fireworks']]};
const ITEM={},KEY={},BY_NO={},BY_ID=C.GAME_ITEMS_BY_ID;   // key -> item, item id -> key, 'slot:number' -> key
for(const slot in NAMES)for(const it of C.gameItems(GAME,slot)){const n=NAMES[slot][1][it.no-1];if(n){const k=NAMES[slot][0]+'-'+n;ITEM[k]=it;KEY[it.id]=k;BY_NO[slot+':'+it.no]=k}}
const item=k=>ITEM[k]||null;
const FREE=()=>!C.on();              // the shop is not open: every item is free to wear, saved here as ss:kit
function kit(){const o=store.get('kit',null),k={};if(o&&typeof o==='object')for(const s in NAMES){const it=BY_ID[o[s]];if(it&&it.slot===s&&KEY[it.id])k[s]=it.id}return k}
const worn=()=>{if(!X.on)return {};if(FREE())return kit();const e=C.gameEquipped(GAME),o={};for(const s in e)o[s]=e[s].id;return o};   // slot -> item id
const owns=it=>FREE()||it.give==='free'||C.owned().items.indexOf(it.id)>=0;
const packOf=it=>C.PACKS.find(p=>p.kind==='items'&&p.contents.items.indexOf(it.id)>=0)||null;
function wear(it){
  if(FREE()){const k=kit();k[it.slot]=it.id;store.set('kit',k);return true}
  if(it.give==='free')C.grant(it.id);return C.equip(it.id);   // free items go into the locker the first time they are worn
}
function takeOff(id){ // an item's id, or 'slipstream:<slot>'
  if(!FREE())return C.unequip(id);
  const k=kit(),it=BY_ID[id];delete k[it?it.slot:String(id).split(':')[1]];store.set('kit',k);return true;
}
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
  if(!X.on)return EMPTY;               // this player may not wear anything (yet): whatever is saved is left alone
  if(mine)return mine;
  const e=worn(),k=s=>e[s]&&KEY[e[s]]||'';
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
  const it=(i,slot)=>BY_NO[slot+':'+(+m[i])]||'';
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
// Bots: with the cosmetics on, most teams carry a made-up sponsor's sticker (both cars of a team the same one), picked
// from the track and the round so every browser in a room agrees. Bots never wear a livery: team colours stay as they are.
function botLook(c,r){
  if(!X.on)return null;
  if(!r.cosSp){
    const R=mulberry(strHash('sp'+r.track+':'+(r.id||0))),keys=Object.keys(SPONSORS);
    for(let i=keys.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]]}
    r.cosSp=TEAMS.map((t,i)=>R()<.8?Object.assign({},EMPTY,{sp:'sp-'+keys[i]}):null);
  }
  return r.cosSp[c.team];
}

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
const sponsorOf=L=>L.lv&&SPONSORS[L.lv.slice(3)]?L.lv.slice(3):L.sp?L.sp.slice(3):'';   // a sponsor's livery brings its stickers with it
function sponsorCell(L,pv){const k=sponsorOf(L);return k&&SPONSORS[k]?cell(0,'s'+k,pv?2:0,g=>paintSponsor(g,k)):null}
function liveryCell(c,L,pv){
  if(!L.lv)return null;
  const k=L.lv.slice(3),t=TEAMS[c.team];
  return cell(1,SPONSORS[k]?k:k+c.team,pv?1:0,g=>paintLivery(g,SPONSORS[k]?k:L.lv,t.c,t.c2));
}
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
const chromeMat=mat({shininess:230,specular:0xffffff}),matteMat=mat({shininess:8,specular:0x161616});
function bodyMat(L){return L.lv==='lv-chrome'?chromeMat:L.lv==='lv-neon'||L.lv==='lv-carbon'?matteMat:paintTex}
function dressRest(c,m,p,L,pv){
  const def=c.bot?TEAMS[c.team].c2:'#ffffff',hs=L.st&&L.st.m&16?L.st:null,sp=!hs&&L.hm?'':sponsorOf(L);   // a helmet design keeps its own face unless the custom sticker asks for the helmet
  if(L.hm||hs||sp){const h=helmet(L.hm?L.hm.slice(3):'',def,hs,hs?'':sp);m.hel.material=h.mat;if(L.hm==='hm-catears')m.hel.geometry=earsGeo()}
  if(L.fx){c.cosFx=L.fx;const f=flameMats(L.fx);if(f){p.fo.material=f[0];p.fi.material=f[1]}}
  if(L.sm&&SMOKE[L.sm])c.smokeCol=SMOKE[L.sm];
}
function clear(list){ // the race's cars are being rebuilt: free what they held and start the atlas again
  for(const m of list)if(m.cos){for(const g of m.cos.own)g.dispose();m.cos.own.length=0}
  stCells.clear();lvCells.clear();
  if(helmets.size>40){for(const h of helmets.values()){h.mat.map.dispose();h.mat.dispose()}helmets.clear()}
}
function redressAll(){const r=X.race;if(r)for(const c of r.cars)if(c.mesh)applyTo(c,c.mesh)}
function setSticker(o){ // save my sticker (null removes it); false when it didn't pass the checks
  if(o!==null){o=sticker(o);if(!o)return false}
  store.set('sticker',o);mine=null;return true;
}
function frame(dt){
  track(dt);
  const open=G&&G.open&&garageFrame(dt);
  if(dirty){atex.needsUpdate=true;dirty=false}
  return open;
}
// fonts arrive after the first cars are painted: paint the stickers again once the game's typeface is in
try{Promise.all([document.fonts.load('900 40px "Titillium Web"'),document.fonts.load('italic 900 40px "Titillium Web"')]).then(()=>{stCells.clear();lvCells.clear();redressAll();if(G&&G.open){render();refreshPv()}},()=>{})}catch(e){}

// =====================================================================
//  Sponsors. All fifteen are made up; every logo is a little mark drawn here plus the name in one of the page's fonts.
//  a, b: its colour pair (plate and ink); k: a third colour for the mark; w: the wordmark [line 1, line 2, font];
//  pat: the pattern of its full livery; ch: its challenges [stat, how many].
// =====================================================================
const U=(g,cx,cy,s,f)=>{g.save();g.translate(cx,cy);g.scale(s,s);f();g.restore()};   // draw in a box from -1 to 1
const disc=(g,x,y,r,c)=>{g.beginPath();g.arc(x,y,r,0,7);g.fillStyle=c;g.fill()};
const poly=(g,pts,c)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle=c;g.fill()};
const line=(g,pts,c,w)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.strokeStyle=c;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';g.stroke()};
const drop=(g,c)=>{g.beginPath();g.moveTo(0,-.98);g.bezierCurveTo(.25,-.5,.8,-.15,.8,.25);g.arc(0,.25,.8,0,Math.PI);g.bezierCurveTo(-.8,-.15,-.25,-.5,0,-.98);g.fillStyle=c;g.fill()};
const MARKS={
  zoomi(g,A,B,K){ // a tilted can with a zigzag, and speed lines
    g.save();g.rotate(-.35);rr(g,-.42,-.8,.84,1.6,.2);g.fillStyle=B;g.fill();g.fillStyle=K;g.fillRect(-.42,-.52,.84,.15);g.fillRect(-.42,.37,.84,.15);
    line(g,[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]],K,.13);g.restore();
    line(g,[[-1,-.35],[-.66,-.35]],B,.09);line(g,[[-1,0],[-.74,0]],B,.09);line(g,[[-.96,.35],[-.64,.35]],B,.09)},
  burnout(g,A,B,K){ // a paper cup with a tyre-tread sleeve, steaming
    poly(g,[[-.5,-.25],[.5,-.25],[.36,.88],[-.36,.88]],K);poly(g,[[-.47,.05],[.47,.05],[.4,.56],[-.4,.56]],B);
    for(let x=-.3;x<.4;x+=.2)line(g,[[x-.05,.15],[x+.05,.46]],A,.06);rr(g,-.6,-.42,1.2,.18,.06);g.fillStyle=K;g.fill();
    for(const x of [-.22,.22]){g.beginPath();g.moveTo(x,-.56);g.bezierCurveTo(x-.25,-.7,x+.25,-.82,x,-.98);g.strokeStyle=B;g.lineWidth=.09;g.lineCap='round';g.stroke()}},
  apex(g,A,B,K){ // a tyre with a pointed A in it
    disc(g,0,0,.95,K);disc(g,0,0,.8,'#0b0c0f');for(let i=0;i<12;i++){const a=i*Math.PI/6;line(g,[[Math.cos(a)*.8,Math.sin(a)*.8],[Math.cos(a)*.95,Math.sin(a)*.95]],'#0b0c0f',.07)}
    poly(g,[[0,-.6],[.55,.4],[-.55,.4]],B);poly(g,[[0,-.12],[.2,.24],[-.2,.24]],'#0b0c0f')},
  taco(g,A,B,K){ // a taco in a hurry
    g.save();g.rotate(-.18);for(let x=-.6;x<=.61;x+=.3)disc(g,x,-.1,.24,'#a6e884');for(const [x,y] of [[-.38,-.2],[.08,-.27],[.45,-.17]])disc(g,x,y,.11,K);
    g.beginPath();g.arc(0,-.08,.86,0,Math.PI);g.closePath();g.fillStyle=B;g.fill();for(const [x,y] of [[-.4,.2],[0,.45],[.35,.22],[.1,.12]])disc(g,x,y,.05,'#e0a020');g.restore();
    line(g,[[-1,.56],[-.72,.63]],B,.08);line(g,[[-.98,.84],[-.56,.92]],B,.08)},
  grandma(g,A,B,K){ // a drop of oil with grandma's bun and glasses
    drop(g,B);disc(g,0,-.34,.19,K);disc(g,0,.22,.5,K);disc(g,0,.34,.42,'#f3c9a0');g.lineWidth=.07;g.strokeStyle=A;
    for(const x of [-.18,.18]){g.beginPath();g.arc(x,.3,.13,0,7);g.stroke()}line(g,[[-.05,.3],[.05,.3]],A,.06);g.beginPath();g.arc(0,.48,.16,.25,Math.PI-.25);g.stroke()},
  pitstop(g,A,B,K){ // a pizza with a tyre's edge and one slice gone
    disc(g,0,0,.95,'#d99a4e');for(let i=0;i<10;i++){const a=i*Math.PI/5+.3;line(g,[[Math.cos(a)*.84,Math.sin(a)*.84],[Math.cos(a)*.95,Math.sin(a)*.95]],'#8a5a22',.07)}
    disc(g,0,0,.78,K);for(const [x,y] of [[-.4,-.3],[.05,-.5],[-.45,.25],[0,.42],[-.1,-.05],[.4,.45]])disc(g,x,y,.13,'#c23a2b');poly(g,[[0,0],[1.02,-.44],[1.02,.2]],A);disc(g,0,0,.11,B)},
  slick(g,A,B,K){ // a tall wave of hair over a comb
    g.beginPath();g.moveTo(-.85,.32);g.bezierCurveTo(-.95,-.6,-.15,-1.05,.5,-.78);g.bezierCurveTo(.98,-.58,.92,-.08,.55,-.15);g.bezierCurveTo(.72,-.42,.38,-.52,.18,-.3);g.bezierCurveTo(-.05,-.05,.3,.32,.62,.32);g.closePath();g.fillStyle=B;g.fill();
    g.beginPath();g.moveTo(-.6,-.1);g.bezierCurveTo(-.5,-.55,-.1,-.75,.3,-.68);g.strokeStyle=K;g.lineWidth=.07;g.lineCap='round';g.stroke();
    g.fillStyle=K;g.fillRect(-.8,.5,1.6,.13);for(let x=-.75;x<.8;x+=.155)g.fillRect(x,.6,.07,.3)},
  latebrake(g,A,B,K){ // a shield, a hot brake disc, two skid marks
    g.beginPath();g.moveTo(-.78,-.85);g.lineTo(.78,-.85);g.lineTo(.78,0);g.quadraticCurveTo(.7,.68,0,.98);g.quadraticCurveTo(-.7,.68,-.78,0);g.closePath();g.fillStyle=B;g.fill();
    disc(g,0,-.2,.45,K);disc(g,0,-.2,.15,B);for(let i=0;i<6;i++)disc(g,Math.cos(i*1.047)*.3,-.2+Math.sin(i*1.047)*.3,.05,B);
    line(g,[[-.22,.4],[-.1,.72]],A,.1);line(g,[[.22,.4],[.1,.72]],A,.1)},
  draftpunk(g,A,B,K){ // a record with a mohawk
    const cy=.14;for(let i=-2;i<=2;i++){const a=-Math.PI/2+i*.34,b=.15;poly(g,[[Math.cos(a-b)*.78,cy+Math.sin(a-b)*.78],[Math.cos(a)*1.14,cy+Math.sin(a)*1.14],[Math.cos(a+b)*.78,cy+Math.sin(a+b)*.78]],B)}
    disc(g,0,cy,.8,'#2e2a38');g.strokeStyle='#4a4459';g.lineWidth=.04;for(const r of [.64,.5]){g.beginPath();g.arc(0,cy,r,0,7);g.stroke()}disc(g,0,cy,.3,B);disc(g,0,cy,.07,K)},
  gravel(g,A,B,K){ // a bowl heaped with pebbles
    const cs=['#a8916a','#7d6b4e','#c9b48a','#93805f'];[[-.5,-.02,.2],[-.18,-.1,.22],[.18,-.06,.2],[.52,0,.19],[-.34,-.34,.19],[.02,-.4,.2],[.34,-.3,.17],[-.02,-.66,.15]].forEach(([x,y,r],i)=>disc(g,x,y,r,cs[i%4]));
    g.beginPath();g.arc(0,.08,.86,0,Math.PI);g.closePath();g.fillStyle=B;g.fill();g.fillRect(-.3,.9,.6,.08);
    g.save();g.translate(.62,-.62);g.rotate(-.7);g.beginPath();g.ellipse(0,0,.26,.11,0,0,7);g.fillStyle=K;g.fill();g.restore()},
  blueflag(g,A,B,K){ // a drop of water with a little flag in it
    drop(g,B);line(g,[[-.3,-.12],[-.3,.75]],A,.08);g.beginPath();g.moveTo(-.3,-.1);g.quadraticCurveTo(-.08,-.3,.12,-.1);g.quadraticCurveTo(.3,.05,.5,-.1);g.lineTo(.5,.3);g.quadraticCurveTo(.3,.45,.12,.3);g.quadraticCurveTo(-.08,.1,-.3,.3);g.closePath();g.fillStyle=A;g.fill()},
  honk(g,A,B,K){ // a bulb horn, honking
    disc(g,-.58,.18,.36,B);poly(g,[[-.35,.02],[.05,-.1],[.05,.36],[-.35,.34]],B);poly(g,[[.05,-.12],[.5,-.58],[.5,.82],[.05,.38]],B);
    g.strokeStyle=K;g.lineWidth=.09;g.lineCap='round';for(const r of [.2,.4]){g.beginPath();g.arc(.55,.12,r,-.75,.75);g.stroke()}},
  chicane(g,A,B,K){ // a chicken, looking ahead
    for(const [x,y] of [[-.22,-.48],[.04,-.62],[.3,-.48]])disc(g,x,y,.18,K);disc(g,0,.12,.62,B);poly(g,[[.5,0],[.98,.14],[.5,.3]],'#ffc93c');disc(g,.2,-.02,.085,'#17191e');disc(g,.4,.52,.13,K)},
  podium(g,A,B,K){ // a pickle on the top step
    g.fillStyle=B;g.fillRect(-.9,.45,.6,.5);g.fillRect(-.3,.2,.6,.75);g.fillRect(.3,.6,.6,.35);rr(g,-.19,-.92,.38,1.12,.19);g.fillStyle=K;g.fill();
    for(const [x,y] of [[-.07,-.72],[.08,-.2],[-.06,0],[.07,-.34]])disc(g,x,y,.035,'#4f8f2a');disc(g,-.07,-.52,.04,'#17191e');disc(g,.08,-.52,.04,'#17191e');g.fillStyle=A;g.fillRect(-.04,.42,.08,.4)},
  lapnap(g,A,B,K){ // a mattress under a moon
    rr(g,-.92,.22,1.84,.52,.14);g.fillStyle=K;g.fill();for(let x=-.6;x<.7;x+=.4)disc(g,x,.48,.05,'#aab0e6');g.fillStyle=K;g.fillRect(-.8,.74,.14,.16);g.fillRect(.66,.74,.14,.16);
    disc(g,-.42,-.4,.4,B);disc(g,-.26,-.5,.34,A);line(g,[[.15,-.72],[.5,-.72],[.15,-.36],[.5,-.36]],B,.09);line(g,[[.62,-.2],[.82,-.2],[.62,.02],[.82,.02]],B,.07)}
};
const SPONSORS={
  zoomi:{a:'#12b5a6',b:'#fff3d6',k:'#ff5a8a',w:['ZOOMI','cola',1],pat:'bubbles',ch:[['win',3],['boost',90]]},
  burnout:{a:'#3b2416',b:'#ffb347',k:'#f6e7d0',w:['BURNOUT','coffee',0],pat:'band',ch:[['fin',5],['pb',3],['lap',30]]},
  apex:{a:'#1d2026',b:'#ff6a1f',k:'#f2f2f2',w:['APEX','tires',1],pat:'chevron',ch:[['clean',5],['km',60]]},
  taco:{a:'#1f8a4c',b:'#ffd23f',k:'#ff5a36',w:['TURBO','TACO',1],pat:'band',ch:[['boost',120],['pass',20]]},
  grandma:{a:'#7a1f3d',b:'#ffe9c9',k:'#c9c9d6',w:["Grandma's",'Motor Oil',2],pat:'scallop',ch:[['fin',8],['tidy',3]]},
  pitstop:{a:'#e8543a',b:'#fff1cf',k:'#ffc94a',w:['PIT STOP','PIZZA',0],pat:'checks',ch:[['pod',3],['lap',25]]},
  slick:{a:'#0d2440',b:'#39d5ff',k:'#ffffff',w:["Slick's",'hair gel',1],pat:'wave',ch:[['draft',60],['drs',10]]},
  latebrake:{a:'#2a55d9',b:'#f2f5fa',k:'#ff3b3b',w:['LATE BRAKE','insurance',0],pat:'chevron',ch:[['brake',40],['clean',10],['win',1]]},
  draftpunk:{a:'#15131c',b:'#ff3fa8',k:'#f4f4f4',w:['DRAFT PUNK','records',3],pat:'band',ch:[['draft',180],['pass',30]]},
  gravel:{a:'#e9d3a3',b:'#5a3d22',k:'#7f9a4a',w:['Gravel Trap','granola',2],pat:'bubbles',ch:[['km',100],['tidy',5]]},
  blueflag:{a:'#1f8fe0',b:'#ffffff',k:'#bfe9ff',w:['BLUE FLAG','bottled water',0],pat:'wave',ch:[['pass',40],['fl',2]]},
  honk:{a:'#ffe01f',b:'#17191e',k:'#ff3b3b',w:['HONK','energy',1],pat:'chevron',ch:[['win',5],['gain',30]]},
  chicane:{a:'#ff8a1f',b:'#fff7e0',k:'#e0352b',w:['CHICANE','chicken',0],pat:'checks',ch:[['clean',15],['pb',5]]},
  podium:{a:'#2f7d32',b:'#f3ffd2',k:'#9bd45a',w:['PODIUM','pickles',2],pat:'scallop',ch:[['pod',5],['win',2]]},
  lapnap:{a:'#34388f',b:'#ffe9a8',k:'#ffffff',w:['Lap Nap','mattresses',2],pat:'bubbles',ch:[['lap',50],['fin',10]]}
};
const STATS={win:n=>'Win '+n+(n>1?' races':' race'),fin:n=>'Finish '+n+' races',pod:n=>'Finish in the top three '+n+' times',lap:n=>'Complete '+n+' laps',
  clean:n=>'Finish '+n+' clean laps (no cuts)',pb:n=>'Set '+n+' personal best laps',draft:n=>'Draft for '+n+' seconds',boost:n=>'Boost for '+n+' seconds',
  pass:n=>'Overtake '+n+' cars',km:n=>'Drive '+n+' km',tidy:n=>'Finish '+n+' races with no penalty',drs:n=>'Open DRS '+n+' times',
  brake:n=>'Brake hard from high speed '+n+' times',fl:n=>'Set the fastest lap of a race '+n+' times',gain:n=>'Gain '+n+' places from your grid slot'};
function paintSponsor(g,k){ // the sponsor's sticker, on 256 x 64: a plate in its colour, the mark, the name
  const s=SPONSORS[k],[l1,l2,f]=s.w,F=FONTS[f];
  rr(g,2,4,252,56,10);g.fillStyle=s.a;g.fill();rr(g,4.5,6.5,247,51,8);g.strokeStyle=s.b;g.lineWidth=1.2;g.globalAlpha=.5;g.stroke();g.globalAlpha=1;
  U(g,34,32,23,()=>MARKS[k](g,s.a,s.b,s.k));
  g.fillStyle=s.b;g.textAlign='left';g.textBaseline='middle';
  fitText(g,l1,F[1],F[2],27,182);g.fillText(l1,64,23);
  fitText(g,l2,l2===l2.toUpperCase()?F[1]:'600 ',l2===l2.toUpperCase()?F[2]:FONTS[0][2],l2===l2.toUpperCase()?22:18,182);g.fillText(l2,65,46.5);
}

// =====================================================================
//  Liveries. Painted in metres: x from the tail (0) to the nose (6.1); the side view runs y 0 (top) to .9, the view
//  from above y 0 (the car's right edge) to 2. c1, c2 are the team's colours: a livery is a pattern and accents on them.
// =====================================================================
const mix=(a,b,t)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const pathOf=(g,pts)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]))};
function livery(g,k,c1,c2,top){
  const H=top?2:.9,L=6.1,fill=c=>{g.fillStyle=c;g.fillRect(0,0,L,H)},bar=(y0,y1,c)=>{g.fillStyle=c;g.fillRect(0,y0,L,y1-y0)};
  const sp=SPONSORS[k];
  if(sp){ // a sponsor's livery: its two colours, its pattern, its mark
    const R=mulberry(strHash(k));fill(sp.a);
    if(sp.pat==='bubbles')for(let i=0;i<26;i++){const x=R()*3.6,y=R()*H,r=.05+R()*.11*(top?1.6:1);g.globalAlpha=.55+R()*.45;disc(g,x,y,r,i%4?sp.b:sp.k)}
    else if(sp.pat==='band'){poly(g,[[2.5,0],[3.3,0],[2.3,H],[1.5,H]],sp.b);poly(g,[[3.42,0],[3.56,0],[2.56,H],[2.42,H]],sp.k)}
    else if(sp.pat==='chevron')for(const x of [1.1,1.9]){poly(g,[[x,0],[x+.4,0],[x+.4+H*.5,H/2],[x+.4,H],[x,H],[x+H*.5,H/2]],x>1.5?sp.b:sp.k)}
    else if(sp.pat==='scallop'){for(const y of top?[0,H]:[H])for(let x=.15;x<L;x+=.42)disc(g,x,y,top?.3:.2,sp.b);if(!top)bar(.02,.07,sp.k)}
    else if(sp.pat==='checks'){const q=.14;for(let i=0;i<44;i++)for(const [j,y] of top?[[0,0],[1,q],[0,H-q],[1,H-2*q]]:[[0,H-q],[1,H-2*q]])if((i+j)%2){g.fillStyle=sp.b;g.fillRect(i*q,y,q,q)}}
    else if(sp.pat==='wave'){for(const [o,c,w] of [[0,sp.b,.16],[.2,sp.k,.05]]){g.beginPath();for(let x=0;x<=L;x+=.1)g.lineTo(x,H*(top?.5:.6)+o*(top?2:1)+Math.sin(x*2.2)*.09*(top?2:1));g.strokeStyle=c;g.lineWidth=w*(top?2:1);g.stroke()}}
    g.globalAlpha=1;poly(g,[[5.25,0],[L,0],[L,H],[5.05,H]],sp.b);                                    // the nose tip in its second colour
    if(top)U(g,1.75,1,.3,()=>MARKS[k](g,sp.a,sp.b,sp.k));else{g.save();g.translate(4.05,.5);disc(g,0,0,.2,sp.a);g.scale(.16,.16);MARKS[k](g,sp.a,sp.b,sp.k);g.restore()}
    return;
  }
  const dark=h=>lum(h)<.22,glow=dark(c1)?(dark(c2)?'#39ff88':c2):c1;
  switch(k){
    case 'lv-twotone':fill(c1);if(top){bar(0,.5,c2);bar(1.5,2,c2);bar(.5,.54,'#ffffff');bar(1.46,1.5,'#ffffff')}else{bar(.5,H,c2);bar(.47,.5,'#ffffff')}break;
    case 'lv-retro':{fill(c1);const m=top?1:.4,w=top?.09:.045;bar(m-3.4*w,m-1.6*w,c2);bar(m-w,m+w,'#ffffff');bar(m+1.6*w,m+3.4*w,c2);break}
    case 'lv-neon':{fill('#0b0c10');const ls=top?[[[0,.62],[2,.62],[3,.4],[4.6,.4],[L,.86]],[[0,1.38],[2,1.38],[3,1.6],[4.6,1.6],[L,1.14]]]:[[[0,.5],[1.7,.5],[2.4,.28],[4.3,.28],[5.3,.64],[L,.64]],[[0,.74],[3.2,.74],[3.7,.6]]];
      for(const p of ls)for(const [w,a,c] of [[.16,.22,glow],[.08,.5,glow],[.03,1,mix(glow,'#ffffff',.55)]]){g.globalAlpha=a;pathOf(g,p);g.strokeStyle=c;g.lineWidth=w*(top?1.7:1);g.lineJoin='round';g.stroke()}g.globalAlpha=1;break}
    case 'lv-chrome':{const gr=g.createLinearGradient(0,0,0,H);(top?[[0,'#c9d5e3'],[.3,'#f6faff'],[.5,'#ffffff'],[.7,'#e6eef7'],[1,'#b9c7d8']]:[[0,'#f7fbff'],[.34,'#b4c2d2'],[.5,'#465163'],[.57,'#8793a3'],[1,'#eef3f8']]).forEach(([t,c])=>gr.addColorStop(t,c));
      g.fillStyle=gr;g.fillRect(0,0,L,H);if(top)bar(.97,1.03,c1);else bar(.76,.8,c1);break}
    case 'lv-carbon':{fill('#131518');const qx=.07,qy=top?.07:.035;for(let i=0;i<88;i++)for(let j=0;j<30;j++){g.fillStyle=(i+j)%2?'#22262c':'#0c0d10';g.fillRect(i*qx,j*qy,qx*.92,qy*.92)}
      if(top){bar(.48,.53,glow);bar(1.47,1.52,glow)}else bar(.6,.635,glow);break}
    case 'lv-pastel':{const p1=mix(c1,'#ffffff',.55),p2=mix(c2,'#ffffff',.45);fill(p1);
      g.beginPath();g.moveTo(L,H*.62);g.bezierCurveTo(4,H*1.05,2,H*.3,0,H*.2);g.lineTo(0,H*.46);g.bezierCurveTo(2,H*.56,4,H*1.3,L,H*.9);g.closePath();g.fillStyle=p2;g.fill();
      g.beginPath();g.moveTo(L,H*.58);g.bezierCurveTo(4,H*1.0,2,H*.26,0,H*.16);g.strokeStyle='#ffffff';g.lineWidth=.025*(top?2:1);g.stroke();break}
    case 'lv-flames':{fill(c1);const n=top?5:3,tongue=(base,reach,c)=>{g.beginPath();g.moveTo(L,0);g.lineTo(base,0);
        for(let i=0;i<n;i++){const y0=H*i/n,y1=H*(i+1)/n,ym=(y0+y1)/2,tip=base-reach*(.62+((i*5+2)%4)*.13);g.quadraticCurveTo(base-reach*.5,y0+(y1-y0)*.02,tip,ym+(y1-y0)*.1);g.quadraticCurveTo(base-reach*.45,y1-(y1-y0)*.12,base,y1)}
        g.lineTo(L,H);g.closePath();g.fillStyle=c;g.fill()};
      tongue(4.75,2.5,'#3a1206');tongue(4.8,2.35,'#e8361a');tongue(5,1.75,'#ff8a1a');tongue(5.25,1.15,'#ffd84a');break}
    case 'lv-checkered':{fill(c1);const qx=.2,qy=top?.25:.15;for(let i=0;i<14;i++)for(let j=0;j*qy<H;j++){const b=(i+j)%2;if(i>=10&&!b)continue;if(i>=12&&j%2)continue;g.fillStyle=b?'#15171b':'#f4f4f4';g.fillRect(i*qx,j*qy,qx,qy)}break}
    default:fill(c1);
  }
}
function paintLivery(g,k,c1,c2){ // a 256 x 128 cell: the side view over the view from above
  for(const top of [0,1]){g.save();g.beginPath();g.rect(0,top*64,256,64);g.clip();g.translate(0,top*64);g.scale(256/6.1,64/(top?2:.9));livery(g,k,c1,c2,top);g.restore()}
}

// =====================================================================
//  Helmets. Painted on 128 x 64 (drawn at twice that): the middle is the front of the helmet, the top edge its crown.
// =====================================================================
const SOLID={red:'#e02a2a',blue:'#2a6bff',yellow:'#ffd21f',green:'#2fb85a',orange:'#ff7a1a',pink:'#ff5fa8',black:'#1a1c21',white:'#f4f6f8'};
function visor(g,c){rr(g,41,23,46,13,6);g.fillStyle=c||'#10131a';g.fill();g.fillStyle='rgba(255,255,255,.4)';rr(g,45,25,17,3,1.5);g.fill()}
function paintHelmet(g,k,base){
  const R=mulberry(strHash('h'+k)),fill=c=>{g.fillStyle=c;g.fillRect(0,0,128,64)};
  if(SOLID[k]){fill(SOLID[k]);g.fillStyle=lum(SOLID[k])>.6?'#17191e':'#ffffff';g.fillRect(60,0,8,23);g.fillRect(0,0,3,64);g.fillRect(125,0,3,64);visor(g);return}
  switch(k){
    case 'flames':{fill('#15161a');const gr=g.createLinearGradient(0,64,0,10);gr.addColorStop(0,'#ffe45c');gr.addColorStop(.5,'#ff7a1a');gr.addColorStop(1,'#d8221a');g.fillStyle=gr;
      for(let x=-8;x<128;x+=16){g.beginPath();g.moveTo(x,64);g.quadraticCurveTo(x+2,40,x+10,14+R()*14);g.quadraticCurveTo(x+12,44,x+18,64);g.fill()}visor(g);break}
    case 'checkered':for(let i=0;i<16;i++)for(let j=0;j<8;j++){g.fillStyle=(i+j)%2?'#15171b':'#f4f4f4';g.fillRect(i*8,j*8,8,8)}visor(g,'#b3141f');break;
    case 'lightning':fill('#2450d0');for(const cx of [30,98]){poly(g,[[cx+5,4],[cx-9,30],[cx-1,30],[cx-7,54],[cx+10,23],[cx+2,23],[cx+9,4]],'#ffd21f')}g.fillStyle='#ffd21f';g.fillRect(0,58,128,6);visor(g);break;
    case 'chromevisor':{fill('#f4f6f8');g.fillStyle='#17191e';g.fillRect(0,44,128,4);g.fillStyle='#ff2a36';g.fillRect(0,50,128,3);const gr=g.createLinearGradient(41,23,87,36);
      [[0,'#ffe27a'],[.3,'#ff86c0'],[.6,'#7ad0ff'],[1,'#b6ffd6']].forEach(([t,c])=>gr.addColorStop(t,c));rr(g,40,22,48,15,7);g.fillStyle=gr;g.fill();g.fillStyle='rgba(255,255,255,.7)';rr(g,45,24.5,20,3,1.5);g.fill();break}
    case 'shark':{fill('#7d93a8');g.fillStyle='#eef3f7';g.fillRect(0,38,128,26);rr(g,38,29,52,12,5);g.fillStyle='#7a1420';g.fill();g.fillStyle='#ffffff';
      for(let x=40;x<88;x+=6){poly(g,[[x,29],[x+6,29],[x+3,34]],'#ffffff');poly(g,[[x+3,41],[x+9,41],[x+6,36.5]],'#ffffff')}
      for(const x of [40,88]){disc(g,x,17,5,'#ffffff');disc(g,x+(x<64?1.5:-1.5),17,2.6,'#101216')}for(const x of [14,20,26,102,108,114])line(g,[[x,20],[x-2,34]],'#566a7d',1.6);break}
    case 'skull':{fill('#efe9da');for(const x of [51,77]){g.beginPath();g.ellipse(x,23,8.5,9.5,0,0,7);g.fillStyle='#15161a';g.fill()}poly(g,[[64,29],[60,37],[68,37]],'#15161a');
      rr(g,46,40,36,9,2);g.fillStyle='#15161a';g.fill();g.fillStyle='#efe9da';for(let x=48;x<80;x+=5.6)g.fillRect(x,41,4.2,7);line(g,[[20,4],[26,14],[22,22]],'#b9b09a',1.2);line(g,[[104,6],[99,15]],'#b9b09a',1.2);break}
    case 'tiger':{fill('#ff8a1f');for(let i=0;i<11;i++){const x=6+i*11.6+R()*3;poly(g,[[x-3.5,0],[x+3.5,0],[x+1+R()*3,22+R()*12]],'#1b1612');if(i%2)poly(g,[[x+3,64],[x+9,64],[x+6,46-R()*6]],'#1b1612')}
      g.beginPath();g.ellipse(64,47,19,11,0,0,7);g.fillStyle='#fff3e0';g.fill();visor(g);break}
    case 'galaxy':{const gr=g.createLinearGradient(0,0,128,64);gr.addColorStop(0,'#1a0f3d');gr.addColorStop(.5,'#3a1a6e');gr.addColorStop(1,'#0d1440');g.fillStyle=gr;g.fillRect(0,0,128,64);
      for(const [x,y,r,c] of [[38,18,26,'255,90,190'],[96,36,24,'80,200,255'],[70,54,20,'150,110,255']]){const q=g.createRadialGradient(x,y,1,x,y,r);q.addColorStop(0,'rgba('+c+',.55)');q.addColorStop(1,'rgba('+c+',0)');g.fillStyle=q;g.fillRect(0,0,128,64)}
      for(let i=0;i<70;i++)disc(g,R()*128,R()*64,.3+R()*.8,'rgba(255,255,255,'+(.5+R()*.5)+')');visor(g,'#1a1030');break}
    case 'disco':for(let i=0;i<16;i++)for(let j=0;j<8;j++){const v=R(),l=v>.9?96:42+v*40;g.fillStyle='hsl('+(200+R()*60)+','+(v>.9?10:18)+'%,'+l+'%)';g.fillRect(i*8+.5,j*8+.5,7,7)}
      g.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<7;i++){const x=R()*120+4,y=R()*56+4;g.fillRect(x-.5,y-3,1,6);g.fillRect(x-3,y-.5,6,1)}break;
    case 'watermelon':fill('#2f9e44');g.fillStyle='#1b6e2c';for(let x=4;x<128;x+=16){g.beginPath();g.moveTo(x,0);for(let y=0;y<=64;y+=8)g.lineTo(x+(y/8%2?4:-1),y);for(let y=64;y>=0;y-=8)g.lineTo(x+6+(y/8%2?4:-1),y);g.fill()}
      visor(g,'#ff5a6e');for(const [x,y] of [[50,28],[58,32],[66,27],[74,32],[81,28]])disc(g,x,y,1.3,'#1b1612');break;
    case 'eightball':fill('#101114');for(const x of [30,98]){disc(g,x,25,13,'#f4f4f4');g.fillStyle='#101114';g.font='900 19px "Titillium Web",system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('8',x,26.5)}
      {const q=g.createRadialGradient(64,6,1,64,6,22);q.addColorStop(0,'rgba(255,255,255,.5)');q.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=q;g.fillRect(0,0,128,64)}visor(g,'#2a2d36');break;
    case 'eyeball':{fill('#f6f3ee');for(const [x0,d] of [[0,1],[128,-1]])for(let i=0;i<5;i++){const y=8+i*11;line(g,[[x0,y],[x0+d*10,y+3],[x0+d*18,y-2],[x0+d*(24+R()*8),y+2]],'#d8414a',.9)}
      const q=g.createRadialGradient(64,27,3,64,27,17);q.addColorStop(0,'#8fdcff');q.addColorStop(.75,'#1f6ad9');q.addColorStop(1,'#123a80');disc(g,64,27,17,q);disc(g,64,27,7.5,'#0b0c0f');disc(g,58.5,21.5,3,'#ffffff');break}
    case 'pumpkin':{fill('#f08a1c');g.fillStyle='#cf6c10';for(let x=0;x<128;x+=16)g.fillRect(x+6,0,3.5,64);g.fillStyle='#4f7d2a';g.fillRect(0,0,128,4);
      for(const x of [51,77]){poly(g,[[x,17],[x-7,29],[x+7,29]],'#2a1206');poly(g,[[x,21],[x-3.5,27.5],[x+3.5,27.5]],'#ffd84a')}
      poly(g,[[44,35],[49,39],[54,35],[59,39],[64,35],[69,39],[74,35],[79,39],[84,35],[80,45],[72,41],[64,46],[56,41],[48,45]],'#2a1206');break}
    case 'catears':{fill('#8e99a6');for(let i=0;i<9;i++){const x=10+i*13.5;poly(g,[[x-2.5,0],[x+2.5,0],[x,10+R()*8]],'#5d6772')}g.beginPath();g.ellipse(64,46,17,10,0,0,7);g.fillStyle='#f3f1ee';g.fill();
      poly(g,[[61,40],[67,40],[64,44]],'#ff8fb0');for(const s of [-1,1])for(const dy of [-2,2])line(g,[[64+s*8,45],[64+s*22,45+dy]],'#3d444c',.7);visor(g);break}
    case 'pizza':{fill('#ffcf5a');g.fillStyle='#d99a4e';g.fillRect(0,48,128,16);for(let i=0;i<9;i++){g.globalAlpha=.5;disc(g,R()*128,R()*44,5+R()*5,'#f08a3c')}g.globalAlpha=1;
      for(let i=0;i<13;i++){const x=6+R()*116,y=4+R()*38;if(x>36&&x<92&&y>18&&y<40)continue;disc(g,x,y,5,'#c23a2b');disc(g,x-1.5,y-1,1,'#8f2318');disc(g,x+1.8,y+1.5,.9,'#8f2318')}
      for(let i=0;i<12;i++){g.fillStyle='#3f9a3a';g.fillRect(R()*124,R()*44,3.5,1.6)}visor(g);break}
    default:fill(base);
  }
}
const helmets=new Map();   // design | usual colour | sticker -> { mat }
function helmet(k,base,st,sp){
  const key=k+'|'+base+'|'+(st?[st.f,st.b,st.a,st.c,st.t].join('.'):'')+'|'+sp;let h=helmets.get(key);if(h)return h;
  const cv=document.createElement('canvas');cv.width=256;cv.height=128;const g=cv.getContext('2d');g.scale(2,2);
  paintHelmet(g,k,base);
  if(st||sp){g.save();g.translate(37,6.5);g.scale(54/256,13.5/64);if(st)paintSticker(g,st);else paintSponsor(g,sp);g.restore()}   // the helmet's sticker: a strip over the visor
  const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const shiny=k==='disco'||k==='chromevisor'||k==='eightball';
  h={mat:new THREE.MeshPhongMaterial({map:tex,shininess:shiny?170:90,specular:shiny?0xaaaaaa:0x555555}),cv};h.mat.shared=true;helmets.set(key,h);return h;
}
let ears=null;
function earsGeo(){ // the helmet with two ears, still one mesh
  if(ears)return ears;
  const parts=[CAR_GEO.helmet.toNonIndexed()];
  for(const s of [-1,1]){const c=new THREE.ConeGeometry(.055,.12,4).toNonIndexed();c.rotateX(s*.5);c.translate(-.01,.165,s*.085);const uv=c.attributes.uv.array;for(let i=0;i<uv.length;i+=2){uv[i]=s>0?.25:.75;uv[i+1]=.97}parts.push(c)}
  const n=parts.reduce((a,p)=>a+p.attributes.position.count,0),pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);let o=0;
  for(const p of parts){const k=p.attributes.position.count;pos.set(p.attributes.position.array,o*3);nor.set(p.attributes.normal.array,o*3);uv.set(p.attributes.uv.array,o*2);o+=k;p.dispose()}
  ears=new THREE.BufferGeometry();ears.setAttribute('position',new THREE.BufferAttribute(pos,3));ears.setAttribute('normal',new THREE.BufferAttribute(nor,3));ears.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  return ears;
}

// =====================================================================
//  Boost and slipstream effects, tyre smoke. All of it goes into the game's one pool of points (one draw call for
//  everything), with the game's own effect random numbers, only for cars near the camera. A car's effect shows while
//  it boosts or sits in a slipstream.
// =====================================================================
const HSV=h=>{const f=n=>{const k=(n+h*6)%6;return 1-Math.max(0,Math.min(k,4-k,1))};return [f(5),f(3),f(1)]};
const SMOKE={'sm-pink':[1,.42,.72],'sm-blue':[.32,.58,1],'sm-green':[.38,.92,.48],'sm-purple':[.68,.4,1],'sm-gold':[1,.8,.28]};
const FLAME={'fx-flames':[0xff5a14,0xffd24a],'fx-plasma':[0x7a2bff,0xff8aff],'fx-arcs':[0x2a8bff,0xd8f6ff],'fx-sparks':[0xffa020,0xfff0b0],'fx-rainbow':[0xff3fa8,0xfff06a],'fx-confetti':[0xff4fa3,0xffffff],'fx-streaks':[0xdfe9f5,0xffffff],'fx-vapor':[0xdfe9f5,0xffffff]};
const flameCache={};
function flameMats(k){if(!FLAME[k])return null;if(!flameCache[k]){const a=MAT.flameOut.clone(),b=MAT.flameIn.clone();a.color.setHex(FLAME[k][0]);b.color.setHex(FLAME[k][1]);a.shared=b.shared=true;flameCache[k]=[a,b]}return flameCache[k]}
function runFx(k,c,dt,v,ch,sn,emit,R){
  const boost=!!c.boost,on=boost||(c.slip>.25&&v>20);
  const acc=rate=>{c.fxC=(c.fxC||0)+rate*dt;let n=0;while(c.fxC>=1){c.fxC-=1;n++}return n};
  // one point from a place on the car; keep = how much of the car's speed it keeps (0 stays where it was made)
  const P=(lx,ly,lz,keep,sp,up,life,size,grow,grav,r,g,b,a)=>emit(c.x+lx*ch-lz*sn,ly,c.z+lx*sn+lz*ch,ch*v*keep+(R()-.5)*sp,up,sn*v*keep+(R()-.5)*sp,life,size,grow,grav,r,g,b,a);
  switch(k){
    case 'fx-streaks':if(on)for(let n=acc(70);n--;){const s=R()<.5?-1:1;P(2.6-R()*5.4,.25+R()*.95,s*(.78+R()*.35),.3,.3,0,.14+R()*.1,-.06,0,0,1,1,1,.9)}break;
    case 'fx-flames':if(boost)for(let n=acc(60);n--;){const y=R();P(-3.1,.5,(R()-.5)*.2,.55+R()*.25,1.2,.4+R(),.2+R()*.18,-(.22+R()*.2),0,-1,1,.35+y*.5,.08+y*.2,.9)}break;
    case 'fx-sparks':if(boost)for(let n=acc(110);n--;)P(-1.4-R()*1.5,.1,(R()-.5)*1.2,.4+R()*.4,4,1+R()*4,.25+R()*.35,-.13-R()*.08,0,9,1,.75+R()*.25,.3+R()*.4,1);break;
    case 'fx-arcs':if(on)for(let n=acc(9);n--;){let lx=-2.7+R()*1.3,ly=.3+R()*.9,lz=(R()-.5)*1.6;const b=.6+R()*.4;for(let i=0;i<6;i++){P(lx,ly,lz,1,0,0,.05+R()*.05,-.085,0,0,.55*b,.8*b,1,1);lx+=(R()-.5)*.28;ly+=(R()-.5)*.24;lz+=(R()-.5)*.28}}break;
    case 'fx-rainbow':if(on)for(let n=acc(Math.min(34,6+v*.35));n--;)for(let i=0;i<4;i++){const q=HSV([0,.14,.38,.72][i]);P(-3,.3+i*.2,0,.04,.05,0,.42,.3,.2,0,q[0],q[1],q[2],.8)}break;
    case 'fx-vapor':if(on||v>50)for(let n=acc(Math.min(60,v*.7));n--;){const s=R()<.5?-1:1;P(-2.95,1.16,s*.6,.03,.15,.05,.45+R()*.2,.1,.5,0,1,1,1,.4)}break;
    case 'fx-confetti':if(boost)for(let n=acc(45);n--;){const q=HSV(R());P(-3,.6,(R()-.5)*.6,.3+R()*.3,5,1.5+R()*3,.7+R()*.5,.11,0,5,q[0],q[1],q[2],1)}break;
    case 'fx-plasma':if(on)for(let n=acc(boost?55:18);n--;){const w=R();P(-3.05+R()*.3,.5+(R()-.5)*.3,(R()-.5)*.5,.5+R()*.3,1,(R()-.5)*1.5,.22+R()*.2,-(.2+R()*.25),0,0,.55+w*.4,.15+w*.3,1,.85)}break;
  }
}

// =====================================================================
//  Sponsor challenges. Counted in this browser (localStorage ss:spons), only in races you drive (practice or online,
//  never the menu's demo race), and only for the sponsor you are signed with at the time.
// =====================================================================
let prog=store.get('spons',null);if(!prog||typeof prog!=='object'||!prog.p||typeof prog.p!=='object')prog={p:{}};
let progDirty=false;
const signed=()=>{const s=myLook().sp;return s&&SPONSORS[s.slice(3)]?s.slice(3):''};
const got=(k,stat)=>{const p=prog.p[k],v=p&&+p[stat];return v>0&&isFinite(v)?v:0};
const doneAll=k=>SPONSORS[k].ch.every(([s,n])=>got(k,s)>=n);
function saveProg(){store.set('spons',prog);progDirty=false}
function bump(stat,n){
  const k=FREE()?'':signed();if(!k)return;
  const ch=SPONSORS[k].ch.find(c=>c[0]===stat);if(!ch)return;
  const have=got(k,stat);if(have>=ch[1])return;
  (prog.p[k]||(prog.p[k]={}))[stat]=Math.min(ch[1],have+n);progDirty=true;
  if(have+n>=ch[1]){
    toast(item('sp-'+k).name+' · '+T(STATS[stat](ch[1]))+' · '+T('done'));
    if(doneAll(k)&&C.grant(item('lv-'+k).id))toast(item('sp-'+k).name+' livery unlocked. It\'s in the Garage.','fl');
    saveProg();
  }
}
const tr={race:null,side:new Int8Array(SEATS),brk:false,drs:false,t:0};
function track(dt){
  const r=X.race,me=r&&r.me;
  if(!me||r.attract||X.state!=='race'||X.paused||me.fin||X.raceT()<=0||!signed())return;
  if(tr.race!==r){tr.race=r;tr.side.fill(0);tr.brk=tr.drs=false}
  const v=Math.abs(me.v);
  if(me.slip>.25&&v>20)bump('draft',dt);
  if(me.boost)bump('boost',dt);
  bump('km',v*dt/1000);
  const b=me.brk>.8&&v>42;if(b&&!tr.brk)bump('brake',1);tr.brk=b;
  if(me.drsOpen&&!tr.drs)bump('drs',1);tr.drs=!!me.drsOpen;
  for(const o of r.cars){ // an overtake: a car that was just ahead on the road is now behind
    if(o===me)continue;const d=o.P-me.P,s=d>.6?1:d<-.6?-1:0;if(!s)continue;
    if(tr.side[o.seat]===1&&s===-1&&d>-25&&!o.fin)bump('pass',1);tr.side[o.seat]=s;
  }
  if(progDirty&&(tr.t+=dt)>5){tr.t=0;saveProg()}
}
function lap(c,lt,pb,clean){
  const r=X.race;if(!r||r.attract||c.ctrl!=='me')return;
  bump('lap',1);if(pb&&c.k>1)bump('pb',1);if(clean===true)bump('clean',1);
  if(progDirty)saveProg();
}
function finish(c,p){
  const r=X.race;if(!r||r.attract||c.k<r.laps)return;
  bump('fin',1);if(p===1)bump('win',1);if(p<=3)bump('pod',1);if(!c.pen)bump('tidy',1);
  if(c.gridPos>p)bump('gain',c.gridPos-p);if(r.fastSeat===c.seat)bump('fl',1);
  if(progDirty)saveProg();
}

// =====================================================================
//  Podium celebration: over the results screen when you finish in the top three. Only you see it.
// =====================================================================
function celebrate(kind,secs){
  const old=$('gpod');if(old)old.remove();
  const cv=document.createElement('canvas');cv.id='gpod';cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:40';$('app').appendChild(cv);
  const W=X.W,H=X.H,g=cv.getContext('2d');cv.width=W;cv.height=H;
  const cols=['#ff2a36','#ffd21f','#2fd36b','#3fd2ff','#b06bff','#ff4fa3','#ffffff'],ps=[],N=X.touch?70:130,end=performance.now()+(secs||6)*1000;
  let last=performance.now(),next=0;
  const burst=()=>{const x=W*(.15+Math.random()*.7),y=H*(.12+Math.random()*.35),c=cols[Math.floor(Math.random()*cols.length)];for(let i=0;i<(X.touch?26:44);i++){const a=Math.random()*7,s=60+Math.random()*190;ps.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,c,l:1+Math.random()*.5,fw:1})}};
  if(kind==='confetti')for(let i=0;i<N;i++)ps.push({x:Math.random()*W,y:-Math.random()*H,vx:(Math.random()-.5)*60,vy:90+Math.random()*150,c:cols[i%cols.length],r:Math.random()*7,w:5+Math.random()*6,l:99});
  (function step(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;g.clearRect(0,0,W,H);
    if(!cv.isConnected)return;
    if(now>end&&(kind==='confetti'||!ps.length)){cv.remove();return}
    if(kind==='fireworks'&&now<end&&(next-=dt)<=0){next=.45+Math.random()*.4;burst()}
    for(let i=ps.length-1;i>=0;i--){const p=ps[i];p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.fw){p.vy+=140*dt;p.vx*=.985;p.l-=dt;if(p.l<=0){ps.splice(i,1);continue}g.globalAlpha=Math.min(1,p.l);g.fillStyle=p.c;g.fillRect(p.x-1.5,p.y-1.5,3,3)}
      else{p.r+=dt*4;if(p.y>H+10){if(now<end){p.y=-10;p.x=Math.random()*W}else continue}g.globalAlpha=now>end-600?Math.max(0,(end-now)/600):1;g.fillStyle=p.c;g.fillRect(p.x,p.y,p.w*Math.abs(Math.cos(p.r))+1,p.w*.6)}}
    g.globalAlpha=1;requestAnimationFrame(step);
  })(last);
}
function results(me,pos){const L=myLook();if(me&&pos>=1&&pos<=3&&L.pd)celebrate(L.pd.slice(3))}

// =====================================================================
//  The Garage: a screen off the menu with a turning car and six tabs. Built the first time it is opened.
// =====================================================================
const TABS=[['sponsor','Sponsor'],['sticker','Sticker'],['livery','Livery'],['helmet','Helmet'],['effect','Effects'],['extras','Extras']];
const CSS=`
#garage{position:absolute;inset:0;display:flex;align-items:stretch;padding:16px clamp(12px,3vw,40px);background:linear-gradient(90deg,rgba(5,7,11,.9) 0,rgba(5,7,11,.45) 44%,rgba(5,7,11,0) 66%)}
#gdrag{position:absolute;inset:0;touch-action:none;cursor:grab}
#garage .gcard{position:relative;width:min(480px,100%);max-height:100%;display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:14px 14px 12px;box-shadow:0 30px 80px rgba(0,0,0,.45);align-self:center}
#garage .ghead{display:flex;align-items:center;gap:10px}
#garage h2{margin:0;font-size:30px;font-weight:900;font-style:italic;line-height:1;flex:1;letter-spacing:-.01em}
#gbal{font-weight:700;font-size:13px;color:var(--green);white-space:nowrap}
#gdone{padding:8px 16px}
#gtabs{margin:10px 0 8px;overflow-x:auto;flex:none}
#gtabs button{font-size:13px;padding:7px 4px;white-space:nowrap}
#gbody{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding-right:4px;overscroll-behavior:contain}
#gbody p.gn{margin:0 0 8px;font-size:13px;line-height:1.35;color:var(--ink-2);font-weight:600}
#gact{flex:none;display:flex;gap:10px;align-items:center;border-top:1px solid var(--line);margin-top:8px;padding-top:8px;min-height:50px}
#gact:empty{display:none}
#gact div{flex:1;min-width:0;font-size:13px;line-height:1.3;color:var(--ink-2);font-weight:600}
#gact div b{display:block;color:var(--ink);font-size:15px}
#gact button{flex:none}
#gteam{position:absolute;right:clamp(12px,3vw,40px);bottom:16px;display:flex;gap:6px;align-items:center;font-size:12px;font-weight:700;color:var(--ink-2);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:4px 6px 4px 12px}
#gteam i{width:14px;height:14px;border-radius:4px;display:inline-block}
#gteam button{border:0;background:rgba(255,255,255,.1);border-radius:999px;width:28px;height:28px;cursor:pointer;font-weight:900}
.ggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}
.gi{display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.04);padding:8px 6px 7px;cursor:pointer;text-align:center;min-width:0}
.gi:hover{background:rgba(255,255,255,.09)}
.gi canvas{display:block;max-width:100%;border-radius:6px}
.gi b{font-size:13px;line-height:1.15;font-weight:700;margin-top:3px}
.gi small{font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
.gi em{font-style:normal;font-size:11px;font-weight:700;color:var(--ink-3)}
.gi.sel{border-color:var(--ink);background:rgba(255,255,255,.12)}
.gi.on{border-color:var(--yellow)} .gi.on em{color:var(--yellow)}
.gsp{display:grid;grid-template-columns:128px 1fr;gap:4px 10px;align-items:start;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.04);padding:9px;margin-bottom:8px}
.gsp.on{border-color:var(--yellow);background:rgba(255,210,31,.07)}
.gsp canvas{width:128px;height:32px;display:block}
.gsp h3{margin:0;font-size:15px;font-weight:900;line-height:1.1}
.gsp h3+span{font-size:12px;color:var(--ink-2);font-weight:600}
.gsp .gbtn{display:flex;flex-direction:column;gap:5px;margin-top:6px}
.gsp .gbtn button{padding:6px 8px;font-size:13px}
.gsp>div:first-child{grid-row:1/3}
.gsp ul{list-style:none;margin:0;padding:0;grid-column:2}
.gsp li{font-size:12px;font-weight:600;color:var(--ink-2);margin-top:4px}
.gsp li span{display:flex;justify-content:space-between;gap:8px}
.gsp li i{display:block;height:5px;border-radius:3px;background:rgba(255,255,255,.1);margin-top:2px;overflow:hidden}
.gsp li u{display:block;height:100%;background:var(--green);border-radius:3px}
.gsp li.ok{color:var(--green)}
.gsw{display:flex;flex-wrap:wrap;gap:5px}
.gsw button{width:26px;height:26px;border-radius:7px;border:2px solid rgba(255,255,255,.18);cursor:pointer;padding:0}
.gsw button[aria-checked="true"]{border-color:var(--ink);box-shadow:0 0 0 2px var(--red)}
.gchips{display:flex;flex-wrap:wrap;gap:5px}
.gchips button{border:1px solid var(--line);background:rgba(255,255,255,.05);border-radius:999px;padding:6px 11px;font-weight:700;font-size:13px;cursor:pointer;color:var(--ink-2)}
.gchips button[aria-checked="true"]{background:rgba(255,255,255,.18);color:var(--ink);border-color:rgba(255,255,255,.5)}
#gsMsg{min-height:18px;margin:6px 0 0;font-size:13px}
#gsMsg.ok{color:var(--green)}
#garage label.f{margin:9px 0 4px}
@media (max-width:760px) and (orientation:portrait){
  #garage{flex-direction:column;justify-content:flex-end;padding:8px;background:linear-gradient(0deg,rgba(5,7,11,.9) 0,rgba(5,7,11,.5) 62%,rgba(5,7,11,0) 80%)}
  #garage .gcard{width:100%;height:60%;max-height:60%;align-self:auto;padding:10px 10px 8px}
  #garage h2{font-size:24px}
  #gteam{right:8px;bottom:auto;top:8px}
}
@media (max-height:560px){
  #garage{padding:6px 8px}
  #garage .gcard{width:min(440px,54%);height:100%;padding:8px 10px 6px;border-radius:14px}
  #garage h2{font-size:20px}
  #gtabs{margin:6px 0}
  #gtabs button{padding:5px 3px;font-size:12px}
  #gact{min-height:40px;margin-top:5px;padding-top:5px}
  #gteam{right:8px;bottom:6px}
}`;
let G=null;
const wallet=()=>window.BackRoomWallet&&BackRoomWallet.balance?BackRoomWallet:null;
const rarity=it=>C.RARITY_BY_ID[it.rarity]||{name:'',color:'#8FA3B8'};
// The Garage button sits in the corner of the menu card, beside the logo, so nothing else in the menu moves when it
// appears (for a captain that is a moment after the page loads).
function addGarageButton(){
  const card=$('menu')&&$('menu').querySelector('.card');if(!card||$('garageBtn'))return;
  const st=document.createElement('style');st.textContent='#menu .card{position:relative}#garageBtn{position:absolute;top:26px;right:22px;padding:8px 14px}@media (max-width:560px){#garageBtn{top:18px;right:16px;padding:8px 12px}}';document.head.appendChild(st);
  const b=document.createElement('button');b.className='ghost';b.id='garageBtn';b.type='button';b.textContent='Garage';b.onclick=openGarage;card.appendChild(b);
}
// Whether this player may see the Garage changed (index.html calls this): show or hide the button, shut the Garage
// if it is open and they no longer may, and dress the cars again (their own look comes or goes; so do the bots' stickers).
function access(){
  mine=null;
  const b=$('garageBtn');
  if(X.on){if(b)b.hidden=false;else addGarageButton()}
  else{if(G&&G.open)closeGarage();if(b)b.hidden=true}
  redressAll();
}
function buildGarage(){
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const el=document.createElement('section');el.id='garage';el.hidden=true;
  el.innerHTML='<div id="gdrag"></div><div class="gcard"><div class="ghead"><h2>GARAGE</h2><span id="gbal"></span><button class="cta" id="gdone" type="button">Done</button></div>'+
    '<div class="seg" id="gtabs" role="tablist">'+TABS.map(t=>'<button type="button" role="tab" data-v="'+t[0]+'">'+t[1]+'</button>').join('')+'</div><div id="gbody"></div><div id="gact"></div></div>'+
    '<div id="gteam"><i></i><span></span><button type="button" data-d="-1" aria-label="Previous team">‹</button><button type="button" data-d="1" aria-label="Next team">›</button></div>';
  $('app').appendChild(el);
  const sc=new THREE.Scene();sc.background=new THREE.Color(0x0a0d13);
  sc.add(new THREE.HemisphereLight(0xffffff,0x39424f,.85));const sun=new THREE.DirectionalLight(0xffffff,1.05);sun.position.set(4,9,6);sc.add(sun);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(5.4,48).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:X.lin('#1b202a')}));sc.add(floor);
  const ring=new THREE.Mesh(new THREE.RingGeometry(5.25,5.4,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:X.lin('#ff2a36')}));ring.position.y=.01;sc.add(ring);
  const turn=new THREE.Group();sc.add(turn);
  // the preview's own little pool of points, drawn with the game's effect material
  const N=180,pp={n:0,pos:new Float32Array(N*3),col:new Float32Array(N*4),size:new Float32Array(N),vel:new Float32Array(N*3),life:new Float32Array(N),max:new Float32Array(N),a0:new Float32Array(N),grow:new Float32Array(N),grav:new Float32Array(N),N};
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pp.pos,3));pg.setAttribute('aCol',new THREE.BufferAttribute(pp.col,4));pg.setAttribute('aSize',new THREE.BufferAttribute(pp.size,1));pg.setDrawRange(0,0);
  const pts=new THREE.Points(pg,X.fxMat);pts.frustumCulled=false;pts.renderOrder=2;sc.add(pts);
  G={el,card:el.querySelector('.gcard'),body:el.querySelector('#gbody'),act:el.querySelector('#gact'),sc,cam:new THREE.PerspectiveCamera(30,1,.5,200),turn,pp,pg,pts,
    open:false,spin:.9,drag:null,idle:0,tab:'sponsor',team:0,car:null,mesh:null,tryOn:{},sel:'',draft:null,t:0,rect:null};
  el.querySelector('#gdone').onclick=closeGarage;
  el.querySelector('#gtabs').onclick=e=>{const b=e.target.closest('button[data-v]');if(b)showTab(b.dataset.v)};
  el.querySelector('#gteam').onclick=e=>{const b=e.target.closest('button[data-d]');if(b)setTeam((G.team+ +b.dataset.d+TEAMS.length)%TEAMS.length)};
  const d=el.querySelector('#gdrag');
  d.addEventListener('pointerdown',e=>{G.drag={x:e.clientX};try{d.setPointerCapture(e.pointerId)}catch(_){}});
  d.addEventListener('pointermove',e=>{if(!G.drag)return;G.spin+=(e.clientX-G.drag.x)*.012;G.drag.x=e.clientX});
  for(const ev of ['pointerup','pointercancel'])d.addEventListener(ev,()=>{G.drag=null;G.idle=1.5});
  G.body.addEventListener('click',onBodyClick);G.body.addEventListener('input',onBodyInput);G.act.addEventListener('click',onActClick);
  addEventListener('resize',()=>{if(G.open)setTimeout(layout,0)});
  addEventListener('keydown',e=>{if(G.open&&e.key==='Escape'){e.stopPropagation();closeGarage()}},true);
  document.addEventListener('backroom:wallet',showBalance);
}
function setTeam(t){
  G.team=t;
  if(G.mesh){G.turn.remove(G.mesh.g);for(const g of G.mesh.cos.own)g.dispose()}
  G.car={seat:t*2,team:t,bot:false,ctrl:'pv',preview:true,boost:false,slip:1,x:0,z:0,h:0,v:0};
  G.mesh=X.makeCarMesh(G.car);G.turn.add(G.mesh.g);
  const tm=G.el.querySelector('#gteam');tm.querySelector('i').style.background=TEAMS[t].c;tm.querySelector('span').textContent=TEAMS[t].n;
}
function openGarage(){
  if(X.state!=='menu'||!X.on)return;
  if(!G)buildGarage();
  $('menu').hidden=true;G.el.hidden=false;G.open=true;G.tryOn={};G.sel='';
  setTeam(X.seat>=0&&X.seat<SEATS?X.seat>>1:G.team);
  showBalance();showTab(G.tab);layout();
}
function closeGarage(){
  if(!G||!G.open)return;
  G.open=false;G.el.hidden=true;pvLook=null;mine=null;
  G.turn.remove(G.mesh.g);for(const g of G.mesh.cos.own)g.dispose();G.mesh.cos.own.length=0;G.mesh=null;
  if(X.state==='menu')$('menu').hidden=false;
  const old=$('gpod');if(old)old.remove();
}
function showBalance(){if(!G)return;const w=wallet();$('gbal').textContent=FREE()?'Not public yet · all free':w?w.format(w.balance(),true)+' emeralds':''}
function layout(){
  if(!G||!G.open)return;
  const W=X.W,H=X.H,a=$('app').getBoundingClientRect(),r=G.card.getBoundingClientRect(),up=r.width>W*.8;
  const R=G.rect=up?{x:0,y:0,w:W,h:Math.max(80,r.top-a.top)}:{x:r.right-a.left,y:0,w:Math.max(80,W-(r.right-a.left)),h:H};
  const hm=G.tab==='helmet',t=Math.tan(15*Math.PI/180),d=Math.max(7.4*H/(2*t*R.w),(up?2.7:3.4)*H/(2*t*R.h))*(hm?.32:1),cam=G.cam,ty=hm?.84:.55;
  cam.aspect=W/H;cam.position.set(0,ty+d*.3,d*.954);cam.lookAt(0,ty,0);
  cam.setViewOffset(W,H,W/2-(R.x+R.w/2),H/2-(R.y+R.h/2),W,H);
}
function refreshPv(){
  const L=Object.assign({},myLook(),G.tryOn);
  if(G.tab==='sticker'&&G.draft){const s=sticker(G.draft);if(s)L.st=s;else if(!G.draft.t)L.st=null}
  pvLook=L;if(G.mesh)applyTo(G.car,G.mesh);
}
// ---- the preview's own frame: turn the car, show its effect, draw it instead of the race
function pvEmit(x,y,z,vx,vy,vz,life,size,grow,grav,r,g,b,a){
  const p=G.pp;if(p.n>=p.N)return;const i=p.n++;
  p.pos[i*3]=x;p.pos[i*3+1]=y;p.pos[i*3+2]=z;p.vel[i*3]=vx;p.vel[i*3+1]=vy;p.vel[i*3+2]=vz;p.life[i]=p.max[i]=life;p.size[i]=size;p.grow[i]=grow;p.grav[i]=grav;p.a0[i]=a;p.col[i*4]=r;p.col[i*4+1]=g;p.col[i*4+2]=b;p.col[i*4+3]=a;
}
function pvStep(dt){
  const p=G.pp;let i=0;
  while(i<p.n){
    p.life[i]-=dt;
    if(p.life[i]<=0){const j=--p.n;if(j!==i){for(const [a,k] of [[p.pos,3],[p.vel,3],[p.col,4]])for(let q=0;q<k;q++)a[i*k+q]=a[j*k+q];for(const a of [p.size,p.life,p.max,p.a0,p.grow,p.grav])a[i]=a[j]}continue}
    const o=i*3;p.vel[o+1]-=p.grav[i]*dt;p.pos[o]+=p.vel[o]*dt;p.pos[o+1]+=p.vel[o+1]*dt;p.pos[o+2]+=p.vel[o+2]*dt;
    if(p.pos[o+1]<.04){p.pos[o+1]=.04;p.vel[o+1]*=-.35}
    if(p.size[i]>0)p.size[i]+=p.grow[i]*dt;
    p.col[i*4+3]=p.a0[i]*Math.min(1,p.life[i]/p.max[i]*1.6);i++;
  }
  G.pg.setDrawRange(0,p.n);G.pts.visible=p.n>0;
  if(p.n){G.pg.attributes.position.needsUpdate=G.pg.attributes.aCol.needsUpdate=G.pg.attributes.aSize.needsUpdate=true}
}
function garageFrame(dt){
  if(!G.rect)layout();
  G.idle=Math.max(0,G.idle-dt);if(!G.drag&&!G.idle)G.spin+=dt*.45;
  G.turn.rotation.y=G.spin;G.t+=dt;
  const c=G.car,m=G.mesh,h=-G.spin,ch=Math.cos(h),sn=Math.sin(h),V=24,R=Math.random;
  c.h=h;c.boost=!!(c.cosFx&&G.t%3.2<2.2);
  m.flame.visible=c.boost;if(c.boost){const f=.9+R()*.3;m.flame.scale.set(f*1.3,.7+f*.5,.7+f*.5)}
  // the air goes by at V: whatever the effect leaves behind is carried off the back of the stand
  if(c.cosFx)runFx(c.cosFx,c,dt,V,ch,sn,(x,y,z,vx,vy,vz,...r)=>pvEmit(x,y,z,vx-ch*V,vy,vz-sn*V,...r),R);
  if(c.smokeCol&&(c.fxA=(c.fxA||0)+26*dt)>=1){c.fxA-=1;const s=R()<.5?-1:1,k=c.smokeCol;pvEmit(-1.72*ch-s*.87*sn,.15,-1.72*sn+s*.87*ch,-ch*(2+R()*2)+(R()-.5),.5+R()*.9,-sn*(2+R()*2)+(R()-.5),.8+R()*.5,.8,2.6,-.4,k[0],k[1],k[2],.34)}
  pvStep(dt);
  X.fxMat.uniforms.uScale.value=renderer.domElement.height/(2*Math.tan(G.cam.fov*Math.PI/360));
  if(dirty){atex.needsUpdate=true;dirty=false}
  renderer.render(G.sc,G.cam);
  return true;
}
// ---- tabs
function showTab(t){
  G.tab=t;G.tryOn={};G.sel='';G.pp.n=0;
  G.el.querySelectorAll('#gtabs button').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.v===t)));
  if(t==='sticker'){const s=myLook().st;G.draft=s?Object.assign({},s):{t:'',f:1,b:1,a:0,c:1,m:14}}
  render();G.body.scrollTop=0;refreshPv();layout();
}
function render(){
  const t=G.tab;
  G.body.innerHTML=t==='sponsor'?sponsorHtml():t==='sticker'?stickerHtml():itemsHtml(t);
  G.body.querySelectorAll('canvas[data-th]').forEach(thumb);
  renderAct();
}
function sponsorHtml(){
  const cur=signed(),e=worn(),free=FREE();
  let h='<p class="gn">'+(free?'Sign with one sponsor and its sticker goes on your car. Every sponsor\'s livery is open to wear for now; the challenges that earn them start when the shop opens.':'Sign with one sponsor. Its sticker goes on your car, and its challenges count while you are signed with it. Finish them all and its full livery is yours to keep.')+'</p>';
  for(const k of Object.keys(SPONSORS)){
    const it=item('sp-'+k),s=SPONSORS[k],done=doneAll(k),lvIt=item('lv-'+k),lv=owns(lvIt),on=e.livery===lvIt.id;
    h+='<div class="gsp'+(cur===k?' on':'')+'"><div><canvas data-th="sp-'+k+'" width="256" height="64"></canvas><div class="gbtn">'+
      '<button type="button" class="'+(cur===k?'ghost':'cta')+'" data-sign="'+k+'">'+(cur===k?'Signed · leave':'Sign')+'</button>'+
      (lv?'<button type="button" class="ghost" data-wear="'+lvIt.id+'">'+(on?'Livery on · take off':'Wear the livery')+'</button>':'')+'</div></div>'+
      '<div><h3>'+esc(it.name)+'</h3><span>'+esc(it.desc)+'</span></div>'+(free?'</div>':'<ul>'+
      s.ch.map(([st,n])=>{const v=Math.min(n,got(k,st));return '<li class="'+(v>=n?'ok':'')+'"><span>'+esc(STATS[st](n))+'<b>'+(v>=n?'Done':Math.floor(v)+' / '+n)+'</b></span><i><u style="width:'+(v/n*100).toFixed(1)+'%"></u></i></li>'}).join('')+
      (done?'<li class="ok">Livery unlocked</li>':'')+'</ul></div>');
  }
  return h;
}
function stickerHtml(){
  const d=G.draft,seg=(id,list,v)=>'<div class="gchips" id="'+id+'" role="radiogroup">'+list.map((n,i)=>'<button type="button" role="radio" data-i="'+i+'" aria-checked="'+(i===v)+'">'+esc(n)+'</button>').join('')+'</div>';
  const sw=(id,v)=>'<div class="gsw" id="'+id+'" role="radiogroup">'+PAL.map((c,i)=>'<button type="button" role="radio" data-i="'+i+'" aria-checked="'+(i===v)+'" aria-label="'+PAL_NAMES[i]+'" title="'+PAL_NAMES[i]+'" style="background:'+c+'"></button>').join('')+'</div>';
  return '<p class="gn">Your own sponsor sticker, on your own car. Other drivers see it too.</p>'+
    '<label class="f" for="gsText">Sticker text</label><input class="t" id="gsText" maxlength="'+ST_MAX+'" placeholder="e.g. Nico\'s Pizza" autocomplete="off" autocapitalize="words" spellcheck="false" value="'+esc(d.t).replace(/'/g,'&#39;')+'">'+
    '<p class="msg" id="gsMsg"></p>'+
    '<label class="f">Lettering</label>'+seg('gsFont',FONTS.map(f=>f[0]),d.f)+
    '<label class="f">Shape</label>'+seg('gsBadge',BADGES,d.b)+
    '<label class="f">Shape colour</label>'+sw('gsA',d.a)+'<label class="f">Letter colour</label>'+sw('gsC',d.c)+
    '<label class="f">Goes on</label><div class="gchips" id="gsSlots">'+SLOTS.map(s=>'<button type="button" role="checkbox" data-bit="'+s[2]+'" aria-checked="'+!!(d.m&s[2])+'">'+s[1]+'</button>').join('')+'</div>';
}
const PROBLEM={empty:'Type up to 16 characters, then Save.',long:'Keep it to 16 characters.',chars:'Letters, numbers, spaces and \' & ! . - only, please.',
  rude:'Sorry, that one can\'t go on a car. Try something else.',nofilter:'That text couldn\'t be checked just now, so nothing was changed.'};
function itemsHtml(tab){
  const e=worn(),slots=tab==='extras'?['smoke','podium']:[tab];
  let h=tab==='livery'?'<p class="gn">A livery repaints the nose, tub, sidepods and engine cover. The wings, airbox and fin always stay in your team\'s colours, so everyone can still tell the teams apart.</p>':
    tab==='effect'?'<p class="gn">Shown when you boost or sit in a slipstream.</p>':tab==='extras'?'<p class="gn">Tyre smoke colour, and a celebration over the results when you finish in the top three (only you see that one).</p>':'';
  h+='<div class="ggrid">';
  for(const slot of slots){
    if(tab!=='extras')h+='<button type="button" class="gi'+(!e[slot]?' on':'')+(G.sel==='none:'+slot?' sel':'')+'" data-none="'+slot+'"><canvas data-th="none:'+slot+'" width="192" height="96" style="width:96px;height:48px"></canvas><b>'+(slot==='livery'?'Team colours':slot==='helmet'?'Plain helmet':'None')+'</b><small>&nbsp;</small><em>'+(!e[slot]?'Wearing':'Free')+'</em></button>';
    for(const it of C.gameItems(GAME,slot).sort((a,b)=>(a.give==='earned')-(b.give==='earned'))){
      if(!KEY[it.id])continue;
      const has=owns(it),on=e[slot]===it.id,r=rarity(it),pk=packOf(it);
      h+='<button type="button" class="gi'+(on?' on':'')+(G.sel===it.id?' sel':'')+'" data-id="'+it.id+'"><canvas data-th="'+KEY[it.id]+'" width="192" height="96" style="width:96px;height:48px"></canvas><b>'+esc(it.name.replace(/ (helmet|livery|tyre smoke)$/,''))+'</b>'+
        '<small style="color:'+r.color+'">'+r.name+'</small><em>'+(on?'Wearing':has?(it.give||FREE()?'Free':'Owned'):it.give?'Locked':pk?esc(pk.name)+' pack':'')+'</em></button>';
    }
  }
  return h+'</div>';
}
function renderAct(){
  const a=G.act,id=G.sel,it=BY_ID[id];
  if(G.tab==='sticker'){const s=myLook().st;a.innerHTML='<div></div><button type="button" class="ghost" data-act="st-remove"'+(s?'':' disabled')+'>Remove</button><button type="button" class="cta" data-act="st-save">Save sticker</button>';return}
  if(!it){a.innerHTML=G.tab==='sponsor'?'':'<div>Pick one to try it on the car.</div>';return}
  const on=worn()[it.slot]===id,has=owns(it),w=wallet(),bal=w?w.balance():0,pk=packOf(it),fm=m=>w?w.format(m,true):String(m);   // whole mangos, like pack prices
  let btn='',txt=it.desc;
  if(on)btn='<button type="button" class="ghost" data-act="off">Take off</button>';
  else if(has)btn='<button type="button" class="cta" data-act="wear">Wear</button>';
  else if(it.give)txt='Finish '+it.name.replace(/ livery$/,'')+'\'s challenges (Sponsor tab) to unlock it.';
  else if(pk){ // sold the way the shop sells everything: in a pack
    txt='In the '+pk.name+' pack ('+pk.contents.items.length+' items). '+(bal<pk.price?'You have '+fm(bal)+' emeralds.':'');
    btn='<button type="button" class="cta" data-act="buy"'+(bal<pk.price?' disabled':'')+'>Buy pack · '+fm(pk.price)+' emeralds</button>'}
  a.innerHTML='<div><b>'+esc(it.name)+'</b>'+esc(txt)+'</div>'+btn;
}
function onBodyClick(e){
  const t=e.target,q=s=>t.closest(s);let b;
  if((b=q('[data-sign]'))){const k=b.dataset.sign,it=item('sp-'+k);if(signed()===k)takeOff(it.id);else wear(it);mine=null;keepScroll(render);refreshPv();return}
  if((b=q('[data-wear]'))){const id=b.dataset.wear;if(worn().livery===id)takeOff(id);else wear(BY_ID[id]);mine=null;keepScroll(render);refreshPv();return}
  if((b=q('.gi[data-id]'))){const it=BY_ID[b.dataset.id];G.sel=it.id;G.tryOn={};G.tryOn[NAMES[it.slot][0]]=KEY[it.id];
    if(it.slot==='podium')celebrate(KEY[it.id].slice(3),2.5);mark();renderAct();refreshPv();return}
  if((b=q('.gi[data-none]'))){const slot=b.dataset.none;takeOff(GAME+':'+slot);mine=null;G.sel='';G.tryOn={};keepScroll(render);refreshPv();return}
  if(G.tab==='sticker'){
    const d=G.draft;
    if((b=q('#gsFont button')))d.f=+b.dataset.i;else if((b=q('#gsBadge button')))d.b=+b.dataset.i;else if((b=q('#gsA button')))d.a=+b.dataset.i;else if((b=q('#gsC button')))d.c=+b.dataset.i;
    else if((b=q('#gsSlots button')))d.m^=+b.dataset.bit;else return;
    for(const [id,v] of [['gsFont',d.f],['gsBadge',d.b],['gsA',d.a],['gsC',d.c]])G.body.querySelectorAll('#'+id+' button').forEach(x=>x.setAttribute('aria-checked',String(+x.dataset.i===v)));
    G.body.querySelectorAll('#gsSlots button').forEach(x=>x.setAttribute('aria-checked',String(!!(d.m&+x.dataset.bit))));
    refreshPv();
  }
}
function mark(){G.body.querySelectorAll('.gi').forEach(x=>x.classList.toggle('sel',x.dataset.id===G.sel))}
function keepScroll(f){const y=G.body.scrollTop;f();G.body.scrollTop=y}
function onBodyInput(e){
  if(e.target.id!=='gsText')return;
  const t=cleanText(e.target.value),p=textProblem(t),m=$('gsMsg');G.draft.t=t;
  m.className='msg'+(p&&p!=='empty'?' err':'');m.textContent=p&&p!=='empty'?PROBLEM[p]:'';
  refreshPv();
}
function onActClick(e){
  const b=e.target.closest('button[data-act]');if(!b)return;const act=b.dataset.act,m=$('gsMsg');
  if(act==='st-save'){
    const d=G.draft;d.t=cleanText($('gsText').value);$('gsText').value=d.t;
    const p=textProblem(d.t);
    if(p){m.className='msg err';m.textContent=PROBLEM[p]+(myLook().st&&p!=='empty'?' Your old sticker is still on the car.':'');refreshPv();return}
    if(!d.m){m.className='msg err';m.textContent='Pick at least one place for it to go.';return}
    if(setSticker(d)){m.className='msg ok';m.textContent='Saved. "'+d.t+'" is on your car.'}
    renderAct();refreshPv();return;
  }
  if(act==='st-remove'){setSticker(null);G.draft.t='';$('gsText').value='';m.className='msg';m.textContent='Sticker removed.';renderAct();refreshPv();return}
  const it=BY_ID[G.sel];if(!it)return;
  if(act==='buy'){const pk=packOf(it),r=pk?C.buy(pk.id):{ok:false};if(!r.ok){renderAct();return}wear(it)}
  else if(act==='wear')wear(it);
  else if(act==='off')takeOff(it.id);
  mine=null;G.tryOn={};showBalance();keepScroll(render);refreshPv();
}
// ---- little pictures for the tiles
function thumb(cv){
  const k=cv.dataset.th,g=cv.getContext('2d'),W=cv.width,H=cv.height,t=TEAMS[G.team];
  if(k.startsWith('sp-')){paintSponsor(g,k.slice(3));return}
  const car=lv=>{ // the car from the side, in metres, wearing a livery
    const q=W/6.4,qy=q*1.9;g.save();g.translate(4,H/2-.42*qy);g.scale(q,qy);
    g.save();pathOf(g,[[.55,.56],[1,.32],[2.5,.08],[3.05,.3],[3.6,.3],[6.1,.72],[6.1,.82],[.55,.82]]);g.closePath();g.clip();if(lv)livery(g,lv,t.c,t.c2,0);else{g.fillStyle=t.c;g.fillRect(0,0,6.1,.9)}g.restore();
    g.fillStyle=t.c2;g.fillRect(.05,-.05,.8,.1);g.fillRect(5.75,.76,.6,.08);g.fillStyle=t.c;g.fillRect(.1,-.05,.12,.6);
    g.restore();for(const x of [1.28,4.85]){disc(g,4+x*q,H/2+.2*qy,.4*q*1.25,'#1b1d22');disc(g,4+x*q,H/2+.2*qy,.2*q*1.25,'#9aa2ac')}};
  if(k==='none:livery'){car('');return}
  if(k.startsWith('lv-')){car(SPONSORS[k.slice(3)]?k.slice(3):k);return}
  if(k==='none:helmet'||k.startsWith('hm-')){
    const h=helmet(k.startsWith('hm-')?k.slice(3):'','#ffffff',null,'');g.save();g.beginPath();g.arc(W/2,H/2+4,H/2-4,0,7);g.clip();g.drawImage(h.cv,56,0,144,96,W/2-66,2,132,88);g.restore();
    g.beginPath();g.arc(W/2,H/2+4,H/2-4,0,7);g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=2;g.stroke();return}
  g.fillStyle='#0d1017';g.fillRect(0,0,W,H);
  if(k.startsWith('fx-')){const c={x:0,z:0,boost:true,slip:1},R=mulberry(7);for(let i=0;i<14;i++)runFx(k,c,.03,26,1,0,(x,y,z,vx,vy,vz,life,size,gr,gv,r,gg,b,a)=>{const s=i*.03;
      g.globalAlpha=Math.min(1,a*.9);disc(g,W*.82+(x+(vx-26)*s*.5)*22,H*.86-(y+vy*s*.4)*52,Math.max(2,Math.abs(size)*30),'rgb('+[r,gg,b].map(v=>Math.round(clamp(v,0,1)*255))+')')},R);g.globalAlpha=1;return}
  if(k.startsWith('sm-')){const c=SMOKE[k].map(v=>Math.round(v*255));for(const [x,y,r,a] of [[60,60,26,.5],[96,52,32,.6],[136,58,24,.45]]){g.globalAlpha=a;disc(g,x,y,r,'rgb('+c+')')}g.globalAlpha=1;return}
  if(k.startsWith('pd-')){const R=mulberry(k==='pd-confetti'?3:9),cols=['#ff2a36','#ffd21f','#2fd36b','#3fd2ff','#b06bff','#ff4fa3'];
    if(k==='pd-confetti')for(let i=0;i<40;i++){g.fillStyle=cols[i%6];g.fillRect(R()*W,R()*H,7,4)}
    else for(const [x,y,c] of [[60,44,0],[130,36,3],[100,66,1]])for(let i=0;i<14;i++){const a=i*.449,r=10+R()*18;line(g,[[x+Math.cos(a)*6,y+Math.sin(a)*6],[x+Math.cos(a)*r,y+Math.sin(a)*r]],cols[c],2)}
    return}
}
const api={access,dress,redress:c=>applyTo(c,c.mesh),clear,wire,heard,frame,fx:(c,dt,v,ch,sn)=>runFx(c.cosFx,c,dt,v,ch,sn,X.fxEmit,X.fxr),lap,finish,results};
if(window.__ss)window.__ss.cos={api,FREE,kit,wear,takeOff,worn,ITEM,readWire,wireOf,myLook,setSticker,textProblem,sticker,remote,atlas:acv,PANELS,redressAll,SPONSORS,STATS,bump,doneAll,openGarage,closeGarage,celebrate,
  get mine(){return myLook()},get prog(){return prog},get G(){return G},cells:{st:stCells,lv:lvCells},helmets};
if(X.on)addGarageButton();
return api;
};
