/*
 * Blockstorm's Locker: 16 outfits, 7 hats and 7 gun skins, all drawn here in code (pixel art on the blocky fighters).
 *
 * NOT PUBLIC YET. index.html fetches this file only when something needs it:
 *   - this player may see the Locker (X.on: BS_PUBLIC in index.html, or the account signed in is one of the site's
 *     captains (../captains.js), or ?locker=1 on localhost / in an automated browser); index.html calls access() when
 *     that may have changed;
 *   - or another player in the room arrives wearing something (its node's ck). Then this file only dresses that player:
 *     no Locker button, nothing of this player's own is read, worn or sent, and the bots stay as they are.
 * For everyone else this file is never loaded and the game is exactly as it was.
 *
 * While the shop is shut (../cosmetics.js is off, or not on the page: FREE below), nothing is owned or bought: a player
 * who may see the Locker wears anything free, saved as blockstorm_kit (the wire string below). Once the shop is open,
 * what is worn is what the shop's locker has equipped for 'blockstorm'.
 *
 * LOOKS ONLY. Nothing here is read by movement, shooting, hits, shoves or bots (hits come from a fighter's position,
 * never from what is drawn). An outfit recolours the same boxes and puts new pixel pictures on the chest, the back and
 * sometimes the face: no mesh is added. Every outfit's shirt is at least as light and as bright as the plain fighters'
 * shirts (the city is dark: no black suits). A hat is one small mesh on the head in place of the fighter's own cap,
 * band or headphones (the plain looks have those too), about as big as the biggest of them. A gun skin recolours the
 * gun's body, grip and trim; its rarity colour (the stripe and the glowing parts) stays as it was, so a gun's rarity
 * still reads at a glance, and the muzzle and sights are where they were.
 *
 * Online. What a fighter wears travels in its own node as `ck`, three base-36 characters: outfit, hat and gun skin,
 * each the item's number in ../cosmetics.js (0 = none), e.g. "a30". It is only sent when something is worn. Pages from
 * before this file ignore it; here every character is checked against the counts in N, and anything unknown is the
 * fighter's own look.
 */
window.BlockKit=function(X){
'use strict';
const {THREE,store,$}=X;
const TX=X.TX||((s)=>s);
const GAME='blockstorm';
const SLOTS=['outfit','hat','gun'];
const N={outfit:16,hat:7,gun:7};

// ---------------- the catalogue (the same numbers, names and rarities as ../cosmetics.js) ----------------
const NAMES={
  outfit:[['Soccer Kit','common','A red jersey with a white 10 on the back, white shorts and red boots.'],
    ['Basketball Jersey','common','A sunny yellow vest with purple trim and a 15.'],
    ['Football Pads','uncommon','A teal jersey over shoulder pads, white stripes and a 42.'],
    ['Baseball Uniform','common','A white pinstriped shirt with a red 9 and red socks.'],
    ['Hockey Sweater','uncommon','A red sweater with white bands and a 31.'],
    ['Track Star','common','A bright green vest with a race number pinned on.'],
    ['Firefighter','rare','A yellow coat with silver bands and red boots.'],
    ['Astronaut','epic','A white space suit with a flag patch and a chest panel.'],
    ['Chrome Robot','epic','Polished plates, a glowing chest light and bolts.'],
    ['Tin Toy Robot','rare','Red tin with yellow trim, a dial and a wind-up look.'],
    ['Pirate Captain','legendary','A red captain\'s coat with gold buttons, and an eye patch.'],
    ['Deckhand','uncommon','A striped sailor shirt, rolled trousers and an eye patch.'],
    ['Pinstripe Suit','rare','A purple pinstripe suit with a white shirt and a gold tie.'],
    ['Tracksuit','uncommon','A bright green tracksuit with white stripes and a gold chain.'],
    ['White Tuxedo','epic','A white dinner jacket, a black bow tie and a red flower.'],
    ['Detective','uncommon','A tan trench coat with a belt and big buttons.']],
  hat:[['Team Cap','common','A red cap with a white peak.'],
    ['Sweatband','common','A white band with a red stripe.'],
    ['Pirate Tricorn','epic','A black three-cornered hat with gold trim.'],
    ['Fedora','rare','A grey felt hat with a black band.'],
    ['Sailor Bandana','uncommon','A red bandana with white spots, tied at the back.'],
    ['Robot Antenna','rare','A metal cap with an antenna and a blinking red bulb.'],
    ['Party Crown','legendary','A gold crown with red and blue jewels.']],
  gun:[['Racing Stripe','common','Red with a white stripe from stock to muzzle.'],
    ['Chequered','uncommon','Black and white checks, like the finish line.'],
    ['Gold Plated','legendary','Shiny gold all over.'],
    ['Chrome','epic','Polished chrome with dark grips.'],
    ['Pirate Brass','rare','Dark wood with brass fittings, like an old ship\'s gun.'],
    ['Candy Cane','uncommon','Red and white stripes all the way round.'],
    ['Tiger Stripe','rare','Orange with black stripes.']]
};

// ---------------- the wire string (the node's ck) ----------------
function parse(ck){
  const k={outfit:0,hat:0,gun:0};
  if(typeof ck!=='string'||!/^[0-9a-z]{3}$/.test(ck))return k;
  SLOTS.forEach((s,i)=>{const n=parseInt(ck[i],36);k[s]=n>=1&&n<=N[s]?n:0});
  return k;
}
function wireOf(k){if(!k)return '';const w=SLOTS.map(s=>((k[s]|0)>=1&&(k[s]|0)<=N[s]?k[s]|0:0).toString(36)).join('');return w==='000'?'':w}

// ---------------- what this player wears ----------------
const cat=()=>{const C=window.BackRoomCosmetics;return C&&C.gameItems?C:null};
const FREE=()=>{const C=cat();return !(C&&C.on&&C.on())};
function mine(){
  if(!X.on)return parse('');
  if(FREE())return parse(String(store.get('kit','')));
  const e=cat().gameEquipped(GAME)||{},k=parse('');
  for(const s of SLOTS)if(e[s]&&e[s].no>=1&&e[s].no<=N[s])k[s]=e[s].no;
  return k;
}
let myKit=parse(''),myWire='';
function refreshMine(){const k=mine(),w=wireOf(k),ch=w!==myWire;myKit=k;myWire=w;if(ch){const p=X.player;if(p){dress(p);X.vmRefresh()}}}
function wear(slot,no){
  if(!X.on||!N[slot])return false;no=no|0;if(no<0||no>N[slot])return false;
  if(FREE()){const k=parse(String(store.get('kit','')));k[slot]=no;store.set('kit',wireOf(k)||'')}
  else{const C=cat(),it=no?C.gameItems(GAME,slot).find(i=>i.no===no):null;
    if(it){if(C.owned().items.indexOf(it.id)<0)return false;C.equip(it.id)}else C.unequip(GAME+':'+slot)}
  refreshMine();return true;
}
// other players' kits, by their uid (a puppet's id); bots wear nothing
const theirs=new Map();
function kitOf(c){if(!c)return null;if(c.isPlayer)return X.on?myKit:null;return theirs.get(c.id)||null}
function heard(uid,ck){
  const w=typeof ck==='string'&&/^[0-9a-z]{3}$/.test(ck)?wireOf(parse(ck)):'';
  const old=theirs.get(uid);if((old?wireOf(old):'')===w)return;
  if(w)theirs.set(uid,parse(w));else theirs.delete(uid);
  for(const c of X.chars())if(c.id===uid)dress(c);
}

// =====================================================================
//  Outfits: colours for the shirt, sleeves, trousers and shoes, and 16 x 16 pictures for the chest and the back
//  (the fighter's own chest picture is 8 x 8). [shirt, trousers, shoes, chest painter, back painter, face painter]
// =====================================================================
const px=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
// big pixel digits (3 x 5 cells) for numbers on backs
const DIG=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
function num(g,n,x,y,s,c){const t=String(n);let cx=x-(t.length*4-1)*s/2;for(const d of t){const b=DIG[+d];for(let i=0;i<15;i++)if(b[i]==='1')px(g,cx+(i%3)*s,y+Math.floor(i/3)*s,s,s,c);cx+=4*s}}
const shade=(g)=>{px(g,0,15,16,1,'rgba(0,0,0,.25)')};
const OUT=[null,
  // 1 Soccer Kit
  {shirt:'#e8352e',pants:'#ffffff',shoes:'#e8352e',
   front(g){px(g,0,0,16,16,'#e8352e');px(g,5,0,6,2,'#ffffff');px(g,6,2,4,1,'#ffffff');px(g,11,4,3,3,'#ffffff');px(g,12,5,1,1,'#e8352e');shade(g)},
   back(g){px(g,0,0,16,16,'#e8352e');px(g,4,0,8,1,'#ffffff');num(g,10,8,4,2,'#ffffff');shade(g)}},
  // 2 Basketball Jersey
  {shirt:'#ffcf2a',pants:'#ffcf2a',shoes:'#ffffff',
   front(g){px(g,0,0,16,16,'#ffcf2a');px(g,0,0,3,16,'#8a3fd1');px(g,13,0,3,16,'#8a3fd1');px(g,5,0,6,3,'#8a3fd1');px(g,6,0,4,2,'#ffcf2a');num(g,15,8,6,1,'#8a3fd1');shade(g)},
   back(g){px(g,0,0,16,16,'#ffcf2a');px(g,0,0,3,16,'#8a3fd1');px(g,13,0,3,16,'#8a3fd1');num(g,15,8,3,2,'#8a3fd1');shade(g)}},
  // 3 Football Pads
  {shirt:'#20b8b0',pants:'#f2f2f2',shoes:'#ffffff',
   front(g){px(g,0,0,16,16,'#20b8b0');px(g,0,0,16,3,'#2ad0c6');px(g,0,3,16,1,'#ffffff');px(g,0,5,16,1,'#ffffff');num(g,42,8,7,1,'#ffffff');shade(g)},
   back(g){px(g,0,0,16,16,'#20b8b0');px(g,0,0,16,3,'#2ad0c6');num(g,42,8,4,2,'#ffffff');shade(g)}},
  // 4 Baseball Uniform
  {shirt:'#f4f2ea',pants:'#f4f2ea',shoes:'#d8262e',
   front(g){px(g,0,0,16,16,'#f4f2ea');for(let x=1;x<16;x+=3)px(g,x,0,1,16,'#9aa4c4');px(g,7,0,2,16,'#d8262e');px(g,3,4,4,1,'#d8262e');num(g,9,12,6,1,'#d8262e');shade(g)},
   back(g){px(g,0,0,16,16,'#f4f2ea');for(let x=1;x<16;x+=3)px(g,x,0,1,16,'#9aa4c4');num(g,9,8,3,2,'#d8262e');shade(g)}},
  // 5 Hockey Sweater
  {shirt:'#d83a34',pants:'#f2f2f2',shoes:'#ffffff',
   front(g){px(g,0,0,16,16,'#d83a34');px(g,0,0,16,3,'#ffffff');px(g,0,10,16,2,'#ffffff');px(g,0,13,16,1,'#ffffff');px(g,6,0,4,2,'#d83a34');shade(g)},
   back(g){px(g,0,0,16,16,'#d83a34');px(g,0,0,16,2,'#ffffff');num(g,31,8,3,1.6,'#ffffff');px(g,0,12,16,2,'#ffffff');shade(g)}},
  // 6 Track Star
  {shirt:'#4ce06a',pants:'#2f8bff',shoes:'#ffffff',
   front(g){px(g,0,0,16,16,'#4ce06a');px(g,0,0,3,16,'#f2c9a0');px(g,13,0,3,16,'#f2c9a0');px(g,4,5,8,7,'#ffffff');num(g,7,8,6,1,'#1a1a1a');px(g,4,5,1,1,'#c8c8c8');px(g,11,5,1,1,'#c8c8c8');shade(g)},
   back(g){px(g,0,0,16,16,'#4ce06a');px(g,4,5,8,7,'#ffffff');num(g,7,8,6,1,'#1a1a1a');shade(g)}},
  // 7 Firefighter
  {shirt:'#f2c21f',pants:'#f2c21f',shoes:'#d8262e',
   front(g){px(g,0,0,16,16,'#f2c21f');px(g,0,9,16,2,'#d9e2ea');px(g,0,12,16,1,'#d9e2ea');px(g,7,0,2,16,'#c9a010');for(const y of [3,6])px(g,6,y,4,1,'#3a3a3a');shade(g)},
   back(g){px(g,0,0,16,16,'#f2c21f');px(g,0,9,16,2,'#d9e2ea');px(g,0,12,16,1,'#d9e2ea');px(g,2,3,12,4,'#d9e2ea');px(g,3,4,10,2,'#d8262e');shade(g)}},
  // 8 Astronaut
  {shirt:'#f4f6f8',pants:'#e8ecf0',shoes:'#a8b0b8',
   front(g){px(g,0,0,16,16,'#f4f6f8');px(g,4,5,8,6,'#b8c2cc');px(g,5,6,2,1,'#e8352e');px(g,8,6,2,1,'#3ddc5a');px(g,5,8,5,1,'#2f8bff');px(g,11,1,4,3,'#2f8bff');px(g,11,1,2,1,'#ffffff');shade(g)},
   back(g){px(g,0,0,16,16,'#f4f6f8');px(g,2,1,12,12,'#d4dae0');px(g,3,2,10,4,'#b8c2cc');px(g,4,8,2,4,'#ff8a2a');px(g,10,8,2,4,'#ff8a2a');shade(g)}},
  // 9 Chrome Robot
  {shirt:'#c4ccd6',pants:'#aab4c0',shoes:'#8a949e',
   front(g){px(g,0,0,16,16,'#c4ccd6');px(g,0,0,16,1,'#eef2f6');for(const [x,y] of [[1,1],[14,1],[1,14],[14,14]])px(g,x,y,1,1,'#6a7480');px(g,4,4,8,7,'#8a949e');px(g,6,6,4,3,'#4ad8ff');px(g,7,6,1,1,'#ffffff');px(g,4,12,8,1,'#6a7480');shade(g)},
   back(g){px(g,0,0,16,16,'#c4ccd6');for(let y=3;y<13;y+=3)px(g,3,y,10,1,'#8a949e');for(const [x,y] of [[1,1],[14,1],[1,14],[14,14]])px(g,x,y,1,1,'#6a7480');shade(g)}},
  // 10 Tin Toy Robot
  {shirt:'#e2402f',pants:'#ffd23a',shoes:'#e2402f',
   front(g){px(g,0,0,16,16,'#e2402f');px(g,0,0,16,2,'#ffd23a');px(g,0,13,16,2,'#ffd23a');px(g,5,4,6,6,'#ffffff');px(g,6,5,4,4,'#1a1a1a');px(g,7,5,1,2,'#e2402f');for(let x=1;x<16;x+=3)px(g,x,11,1,1,'#ffd23a');shade(g)},
   back(g){px(g,0,0,16,16,'#e2402f');px(g,0,0,16,2,'#ffd23a');px(g,7,4,2,7,'#ffd23a');px(g,4,5,8,1,'#ffd23a');px(g,4,9,8,1,'#ffd23a');shade(g)}},
  // 11 Pirate Captain (with an eye patch)
  {shirt:'#c8302f',pants:'#f2e6cc',shoes:'#5a3a22',patch:true,
   front(g){px(g,0,0,16,16,'#c8302f');px(g,6,0,4,6,'#f4f2ea');px(g,7,0,2,2,'#c8302f');px(g,5,0,1,16,'#e0b040');px(g,10,0,1,16,'#e0b040');for(let y=3;y<15;y+=3){px(g,3,y,2,1,'#ffd04a');px(g,11,y,2,1,'#ffd04a')}px(g,0,11,16,2,'#5a3a22');px(g,7,11,2,2,'#ffd04a');shade(g)},
   back(g){px(g,0,0,16,16,'#c8302f');px(g,0,0,16,2,'#e0b040');px(g,7,2,2,14,'#a8241f');px(g,0,11,16,2,'#5a3a22');shade(g)}},
  // 12 Deckhand (with an eye patch)
  {shirt:'#ffffff',pants:'#4a8ad8',shoes:'#5a3a22',patch:true,
   front(g){px(g,0,0,16,16,'#ffffff');for(let y=1;y<16;y+=3)px(g,0,y,16,1,'#2f6ad0');px(g,5,0,6,3,'#2f6ad0');px(g,6,0,4,2,'#ffffff');shade(g)},
   back(g){px(g,0,0,16,16,'#ffffff');for(let y=1;y<16;y+=3)px(g,0,y,16,1,'#2f6ad0');px(g,3,0,10,4,'#2f6ad0');px(g,3,4,10,1,'#ffffff');shade(g)}},
  // 13 Pinstripe Suit
  {shirt:'#8a4fd0',pants:'#8a4fd0',shoes:'#f4f2ea',
   front(g){px(g,0,0,16,16,'#8a4fd0');for(let x=1;x<16;x+=3)px(g,x,0,1,16,'#c8a8f0');px(g,5,0,6,10,'#ffffff');px(g,4,0,1,9,'#6a34ac');px(g,11,0,1,9,'#6a34ac');px(g,7,1,2,8,'#ffd04a');px(g,7,9,2,1,'#e0a820');px(g,2,4,2,1,'#ffffff');shade(g)},
   back(g){px(g,0,0,16,16,'#8a4fd0');for(let x=1;x<16;x+=3)px(g,x,0,1,16,'#c8a8f0');px(g,7,10,2,6,'#6a34ac');shade(g)}},
  // 14 Tracksuit
  {shirt:'#2ed36a',pants:'#2ed36a',shoes:'#ffffff',
   front(g){px(g,0,0,16,16,'#2ed36a');px(g,1,0,1,16,'#ffffff');px(g,3,0,1,16,'#ffffff');px(g,12,0,1,16,'#ffffff');px(g,14,0,1,16,'#ffffff');px(g,7,0,2,16,'#c8c8c8');
     for(let i=0;i<7;i++)px(g,4+i,2+Math.round(Math.sin(i/6*Math.PI)*5),2,1,'#ffd04a');px(g,7,7,2,2,'#ffd04a');shade(g)},
   back(g){px(g,0,0,16,16,'#2ed36a');px(g,1,0,1,16,'#ffffff');px(g,3,0,1,16,'#ffffff');px(g,12,0,1,16,'#ffffff');px(g,14,0,1,16,'#ffffff');shade(g)}},
  // 15 White Tuxedo
  {shirt:'#f6f4ee',pants:'#2a2c34',shoes:'#2a2c34',
   front(g){px(g,0,0,16,16,'#f6f4ee');px(g,6,0,4,12,'#ffffff');px(g,5,0,1,10,'#d8d4c8');px(g,10,0,1,10,'#d8d4c8');px(g,6,1,4,2,'#1d1d1f');px(g,7,1,2,2,'#3a3a3e');for(const y of [5,8])px(g,7,y,2,1,'#1d1d1f');px(g,2,3,2,2,'#e2262e');px(g,2,5,1,1,'#3ddc5a');shade(g)},
   back(g){px(g,0,0,16,16,'#f6f4ee');px(g,7,9,2,7,'#d8d4c8');shade(g)}},
  // 16 Detective
  {shirt:'#c9a46a',pants:'#8a6a44',shoes:'#5a3a22',
   front(g){px(g,0,0,16,16,'#c9a46a');px(g,7,0,2,16,'#b08c54');px(g,4,0,3,4,'#d8b67e');px(g,9,0,3,4,'#d8b67e');px(g,0,9,16,2,'#8a6a44');px(g,7,9,2,2,'#e0c890');for(const y of [4,7,13]){px(g,5,y,1,1,'#5a3a22');px(g,10,y,1,1,'#5a3a22')}shade(g)},
   back(g){px(g,0,0,16,16,'#c9a46a');px(g,3,0,10,4,'#d8b67e');px(g,0,9,16,2,'#8a6a44');px(g,7,11,2,5,'#b08c54');shade(g)}}
];
const texCache=new Map();
function tex16(key,paint){if(texCache.has(key))return texCache.get(key);const c=document.createElement('canvas');c.width=c.height=16;paint(c.getContext('2d'));const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;texCache.set(key,t);return t}
const backMats=new Map();
function backMat(o){if(backMats.has(o))return backMats.get(o);const m=new THREE.MeshLambertMaterial({map:tex16('b'+o,OUT[o].back),emissive:new THREE.Color(OUT[o].shirt).multiplyScalar(.12)});backMats.set(o,m);return m}
// the fighter's own face with an eye patch over its right eye and the strap round the head
function patchedFace(L){const c=X.faceCanvas(L),g=c.getContext('2d');g.fillStyle='#141414';g.fillRect(5,3,2,2);g.fillRect(0,2,8,1);return c}

// =====================================================================
//  Hats: one small mesh each (boxes joined into one geometry, coloured per vertex), in the head's own space: the head
//  is 0.62 across, its top at y 0.62, the face toward -z.
// =====================================================================
const hatMat=new THREE.MeshLambertMaterial({vertexColors:true});
function boxes(list){const P=[],Nn=[],C=[],c=new THREE.Color();
  for(const [w,h,d,x,y,z,col,ry] of list){const g=new THREE.BoxGeometry(w,h,d).toNonIndexed();if(ry)g.rotateY(ry);g.translate(x,y,z);c.set(col);
    const a=g.attributes.position.array,n=g.attributes.normal.array;for(let i=0;i<a.length;i++){P.push(a[i]);Nn.push(n[i])}for(let i=0;i<a.length/3;i++)C.push(c.r,c.g,c.b);g.dispose()}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  g.computeBoundingSphere();return g}
const HATS=[null,
  // 1 Team Cap
  ()=>boxes([[.66,.16,.66,0,.68,0,'#e8352e'],[.6,.05,.3,0,.62,-.44,'#ffffff'],[.12,.06,.12,0,.78,0,'#ffffff']]),
  // 2 Sweatband
  ()=>boxes([[.68,.1,.68,0,.5,0,'#ffffff'],[.69,.03,.69,0,.5,0,'#e8352e']]),
  // 3 Pirate Tricorn
  ()=>boxes([[.6,.2,.6,0,.72,0,'#2a2622'],[.9,.08,.36,0,.64,-.12,'#2a2622'],[.36,.08,.8,.24,.64,.12,'#2a2622',-.6],[.36,.08,.8,-.24,.64,.12,'#2a2622',.6],
    [.92,.03,.03,0,.69,-.3,'#e0b040'],[.12,.12,.04,0,.72,-.31,'#ffd04a']]),
  // 4 Fedora
  ()=>boxes([[.86,.05,.86,0,.63,0,'#8a8f9a'],[.6,.24,.6,0,.77,0,'#9aa0aa'],[.61,.07,.61,0,.68,0,'#1d1d1f'],[.2,.04,.6,0,.9,0,'#7a808a']]),
  // 5 Sailor Bandana
  ()=>{const L=[[.66,.14,.66,0,.62,0,'#e2343f'],[.66,.06,.4,0,.7,.05,'#e2343f'],[.12,.2,.08,0,.5,.36,'#e2343f'],[.08,.14,.06,.08,.42,.38,'#c82830']];
    for(const [x,z] of [[-.2,-.34],[.12,-.34],[.34,-.1],[-.34,.12],[.2,.34],[0,0]])L.push([.06,.02,.06,x,.7,z,'#ffffff']);return boxes(L)},
  // 6 Robot Antenna
  ()=>boxes([[.66,.1,.66,0,.66,0,'#b8c2cc'],[.05,.34,.05,0,.88,0,'#8a949e'],[.12,.12,.12,0,1.08,0,'#ff3b30'],[.3,.06,.06,0,.73,-.31,'#4ad8ff']]),
  // 7 Party Crown
  ()=>{const G='#ffcf3a',L=[[.66,.16,.66,0,.7,0,G]];for(let i=0;i<8;i++){const a=i/8*Math.PI*2;L.push([.1,.16,.1,Math.sin(a)*.28,.86,-Math.cos(a)*.28,G])}
    L.push([.1,.08,.04,0,.7,-.34,'#e2343f'],[.04,.08,.1,.34,.7,0,'#2f8bff'],[.04,.08,.1,-.34,.7,0,'#2f8bff'],[.1,.08,.04,0,.7,.34,'#e2343f']);return boxes(L)}
];
const hatGeos=[];const hatGeo=n=>hatGeos[n]||(hatGeos[n]=HATS[n]());

// =====================================================================
//  Gun skins: the body, grip and trim of the same gun in other colours (index.html's makeGunModel asks gunPal); the
//  rarity stripe and the glowing parts stay the gun's own.
// =====================================================================
function stripeTex(key,a,b,vert){return tex16('g'+key,g=>{px(g,0,0,16,16,a);for(let i=0;i<16;i+=4)vert?px(g,i,0,2,16,b):px(g,0,i,16,2,b)})}
const GUNS=[null,
  ()=>({body:['#e2343f',stripeTex('rs','#e2343f','#ffffff',true)],dark:['#2a2c34'],trim:['#ffffff']}),
  ()=>({body:['#ffffff',tex16('ck',g=>{for(let y=0;y<16;y+=4)for(let x=0;x<16;x+=4)px(g,x,y,4,4,((x+y)/4)%2?'#1d1d1f':'#ffffff')})],dark:['#1d1d1f'],trim:['#ffffff']}),
  ()=>({body:['#ffd84a',null,{metalness:.25,roughness:.3,emissive:'#4a3400'}],dark:['#e0a828',null,{metalness:.25,roughness:.35}],trim:['#fff2a8',null,{metalness:.25,roughness:.25}]}),
  ()=>({body:['#e8eef4',null,{metalness:.45,roughness:.15,emissive:'#1a1e24'}],dark:['#4a4e56'],trim:['#ffffff',null,{metalness:.45,roughness:.1}]}),
  ()=>({body:['#8a5a32',tex16('wd',g=>{px(g,0,0,16,16,'#8a5a32');for(let y=1;y<16;y+=3)px(g,0,y,16,1,'#6e4424')})],dark:['#5a3a22'],trim:['#e8b840',null,{metalness:.5,roughness:.3}]}),
  ()=>({body:['#ffffff',stripeTex('cc','#ffffff','#e2343f',false)],dark:['#e2343f'],trim:['#ffffff']}),
  ()=>({body:['#f08a24',tex16('tg',g=>{px(g,0,0,16,16,'#f08a24');for(let i=0;i<16;i+=5){px(g,i,0,2,6,'#1c1410');px(g,i+1,6,2,5,'#1c1410');px(g,i,11,2,5,'#1c1410')}})],dark:['#1c1410'],trim:['#f08a24']})
];
const palCache=new Map();
// {body, dark, trim} materials for gun skin n (or null for the gun's own colours)
function gunPal(n){n=n|0;if(!(n>=1&&n<=N.gun))return null;if(palCache.has(n))return palCache.get(n);const d=GUNS[n](),out={};
  for(const k of ['body','dark','trim']){const [col,map,opt]=d[k];out[k]=new THREE.MeshStandardMaterial(Object.assign({color:map?'#ffffff':col,map:map||X.noise,roughness:.45,metalness:.35},opt||{}))}
  palCache.set(n,out);return out}
const gunOf=c=>{const k=kitOf(c);return k?k.gun|0:0};

// =====================================================================
//  Dressing a fighter (index.html's Char: model = {root, head, torso, mats: [skin, shirt, pants, shoe, hair, face, chest]})
// =====================================================================
function dress(c){
  const m=c.model;if(!m)return;const k=kitOf(c);
  if(!c._kb){const body=m.torso.children[0];c._kb={look:Object.assign({},c.look),bodyMats:body.material.slice(),chestMap:m.mats[6].map,faceMap:m.mats[5].map,body}}
  const B=c._kb,[,shirtM,pantsM,shoeM,,faceM,chestM]=m.mats,o=k?k.outfit|0:0,O=o?OUT[o]:null;
  const L=c.look=Object.assign({},B.look);
  if(O){L.shirt=O.shirt;L.shirt2=O.shirt;L.pants=O.pants;L.shoes=O.shoes}
  const col=(mt,h)=>{mt.color.set(h);mt.emissive.set(h).multiplyScalar(.12)};
  col(shirtM,L.shirt);col(pantsM,L.pants);col(shoeM,L.shoes);
  chestM.map=O?tex16('f'+o,O.front):B.chestMap;chestM.emissive.set(L.shirt).multiplyScalar(.12);chestM.needsUpdate=true;
  const mats=B.bodyMats.slice();if(O)mats[5]=backMat(o);B.body.material=mats;
  if(O&&O.patch){if(!c._kb.patchMap)c._kb.patchMap=new THREE.CanvasTexture(patchedFace(B.look));const t=c._kb.patchMap;t.magFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;faceM.map=t}else faceM.map=B.faceMap;faceM.needsUpdate=true;
  // a hat in place of the fighter's own headgear
  const h=k?k.hat|0:0;
  if(c._hat){m.head.remove(c._hat);c._hat=null}
  m.head.children.forEach((ch,i)=>{if(i>0)ch.visible=!h});
  if(h){c._hat=new THREE.Mesh(hatGeo(h),hatMat);c._hat.userData.char=true;m.head.add(c._hat)}
  // gun skin
  const g=k?k.gun|0:0;if((c._gs|0)!==g){c._gs=g;if(c.weapons&&c.tpGuns){c.tpGuns=c.weapons.map(w=>{if(!w)return null;const gm=X.makeGunModel(w.def,g);gm.scale.setScalar(.85);return gm});c.setGunModel()}}
}

// =====================================================================
//  The Locker screen (made here, only for a player who may see it), with its own small renderer for the pictures
// =====================================================================
let R=null,pv=null;
function pvInit(){
  if(pv)return pv;const cv=document.createElement('canvas');cv.width=cv.height=256;
  R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true,preserveDrawingBuffer:true});R.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xdde8ff,0x445066,2.2));const dl=new THREE.DirectionalLight(0xffffff,2.2);dl.position.set(-2,4,-3);scene.add(dl);
  const cam=new THREE.PerspectiveCamera(30,1,.1,50);
  return pv={cv,scene,cam,ch:null,gun:null};
}
// a stand-in fighter wearing kit k, built with the game's own makeCharacter
function pvFighter(k){
  const p=pvInit();if(p.ch){p.scene.remove(p.ch.model.root)}
  const look=X.makeLook(X.lookSeed()),model=X.makeCharacter(look),fake={id:'pv',isPlayer:false,look,model};
  theirs.set('pv',k);dress(fake);theirs.delete('pv');p.ch=fake;p.scene.add(model.root);return fake}
function pvRender(w,h,yaw,kind){
  const p=pvInit();if(p.cv.width!==w||p.cv.height!==h){p.cv.width=w;p.cv.height=h;R.setSize(w,h,false)}
  const c=p.cam;c.aspect=w/h;c.updateProjectionMatrix();
  if(kind==='gun'){p.gun.rotation.y=yaw;const b=new THREE.Box3().setFromObject(p.gun),ctr=b.getCenter(new THREE.Vector3()),sz=b.getSize(new THREE.Vector3()),d=Math.max(sz.x,sz.z,sz.y*1.8)*2.1+.3;
    c.position.set(ctr.x+d,ctr.y+d*.3,ctr.z+d*.25);c.lookAt(ctr)}
  else{p.ch.model.root.rotation.y=yaw;if(kind==='hat'){c.position.set(0,2.75,-2.9);c.lookAt(0,2.2,0)}else{c.position.set(0,1.7,-5.2);c.lookAt(0,1.2,0)}}
  R.setClearColor(0,0);R.render(p.scene,c);return p.cv}
function sampleDef(){const g=X.tierGuns(0);for(const x of g)if(x&&x.def&&x.def.type!=='pistol')return x.def;return g[0].def}
function pvGun(n,def){const p=pvInit();if(p.gun)p.scene.remove(p.gun);if(p.ch)p.ch.model.root.visible=false;p.gun=X.makeGunModel(def||sampleDef(),n);p.scene.add(p.gun);return p.gun}
const thumbs=new Map();
function thumb(slot,no){
  const key=slot+':'+no+':'+X.lookSeed();if(thumbs.has(key))return thumbs.get(key);const p=pvInit();let url;
  if(slot==='gun'){pvGun(no);url=pvRender(160,160,.0,'gun').toDataURL();p.gun.visible=false}
  else{const k=parse('');k[slot]=no;pvFighter(k);if(p.gun)p.gun.visible=false;url=pvRender(160,160,slot==='hat'?.5:.35,slot).toDataURL()}
  thumbs.set(key,url);return url;
}
const TABS=[['outfit','Outfits'],['hat','Hats'],['gun','Gun skins']];
const RAR={common:'#b4bfcc',uncommon:'#3ddc5a',rare:'#33a6ff',epic:'#b455ff',legendary:'#ffb31a'};
const DEF={outfit:'Your own look.',hat:'Your own headgear.',gun:'The gun as it comes.'};
let ui=null,tab='outfit',spin=0,pvT=0;
function items(slot){const C=cat(),L=C?C.gameItems(GAME,slot):[];if(L.length===N[slot])return L;return NAMES[slot].map((a,i)=>({no:i+1,name:a[0],rarity:a[1],desc:a[2]}))}
function css(){
  const st=document.createElement('style');st.id='kitCss';st.textContent=`
#kitLocker{position:fixed;inset:0;z-index:60;background:rgba(5,8,22,.78);display:grid;place-items:center;padding:16px;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
#kitLocker[hidden]{display:none}
.kit-card{width:min(940px,100%);max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;gap:10px;background:var(--panel);border:3px solid var(--line);border-radius:10px;padding:14px 16px;box-shadow:0 10px 0 #0006;color:var(--ink)}
.kit-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.kit-head h2{font-family:var(--f-display);font-size:20px;margin:0;color:var(--sun);text-shadow:0 3px 0 #0008}
.kit-tabs{display:flex;gap:6px;flex-wrap:wrap}
.kit-tabs button{border:3px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:6px;padding:7px 12px;font-size:15px;font-weight:700}
.kit-tabs button[aria-pressed="true"]{background:var(--sun);color:#1a1a1a;border-color:var(--sun)}
.kit-head .kit-x{margin-left:auto}
.kit-body{display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:14px;min-height:0;flex:1 1 auto}
.kit-pv{display:flex;flex-direction:column;gap:8px;min-height:0}
.kit-stage{border:3px solid var(--line);border-radius:8px;background:radial-gradient(circle at 50% 35%,#2e3a7a,#141a3a 75%);aspect-ratio:1;width:100%;display:grid;place-items:center;overflow:hidden}
.kit-stage canvas{width:100%;height:100%;display:block}
.kit-info{font-size:15px;line-height:1.35;color:var(--mute);margin:0;min-height:2.7em}
.kit-info b{color:var(--ink)}
.kit-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;overflow:auto;align-content:start;padding:2px 4px 10px 2px;min-height:0}
.kit-tile{display:flex;flex-direction:column;align-items:center;gap:2px;border:3px solid var(--line);border-radius:8px;background:var(--panel2);color:var(--ink);padding:4px 4px 6px;font-size:14px;line-height:1.1;text-align:center}
.kit-tile img{width:100%;aspect-ratio:1;display:block;border-radius:5px;background:radial-gradient(circle at 50% 35%,#2e3a7a,#141a3a 80%)}
.kit-tile i{font-style:normal;font-size:11px;font-weight:700;color:var(--rc);text-transform:uppercase;letter-spacing:.05em}
.kit-tile[aria-pressed="true"]{border-color:var(--sun);background:#2b2f5a}
.kit-note{margin:0;font-size:13px;color:var(--mute)}
@media (max-width:640px){
  #kitLocker{padding:8px}
  .kit-card{padding:10px}
  .kit-head h2{font-size:16px}
  .kit-tabs{order:3;flex-basis:100%}.kit-tabs button{flex:1;padding:6px 4px;font-size:14px}
  .kit-body{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}
  .kit-pv{flex-direction:row;align-items:center}
  .kit-stage{width:120px;flex:0 0 120px}
  .kit-info{min-height:0;font-size:14px}
  .kit-grid{grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px}
  .kit-note{display:none}
}
@media (max-height:520px) and (min-width:641px){
  #kitLocker{padding:6px}
  .kit-card{padding:8px 12px;gap:6px}
  .kit-body{grid-template-columns:minmax(0,160px) minmax(0,1fr);gap:10px}
  .kit-info{font-size:13px;min-height:0}
  .kit-note{display:none}
  .kit-grid{grid-template-columns:repeat(auto-fill,minmax(86px,1fr));gap:6px}
}`;document.head.appendChild(st);
}
function build(){
  if(ui)return ui;css();
  const sec=document.createElement('section');sec.id='kitLocker';sec.hidden=true;sec.setAttribute('role','dialog');sec.setAttribute('aria-label','Locker');
  sec.innerHTML='<div class="kit-card"><div class="kit-head"><h2>LOCKER</h2><div class="kit-tabs" id="kitTabs" role="group" aria-label="Locker section">'+
    TABS.map(t=>'<button type="button" data-t="'+t[0]+'">'+t[1]+'</button>').join('')+'</div><button class="btn gray small kit-x" id="kitClose" type="button">Done</button></div>'+
    '<div class="kit-body"><div class="kit-pv"><div class="kit-stage"><canvas id="kitCv" width="256" height="256" aria-hidden="true"></canvas></div><p class="kit-info" id="kitInfo"></p></div>'+
    '<div class="kit-grid" id="kitGrid" role="group" aria-label="Items"></div></div>'+
    '<p class="kit-note">Everything is free to wear while the Locker is captains only. Looks only: every fighter has the same hit box, and gun skins keep the rarity colour.</p></div>';
  document.body.appendChild(sec);
  $('#kitClose').addEventListener('click',close);
  sec.addEventListener('click',e=>{if(e.target===sec)close()});
  sec.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
  $('#kitTabs').addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('button');if(t&&t.dataset.t){tab=t.dataset.t;draw()}});
  return ui={sec};
}
// the Locker button, next to New look on the main menu (the menu is rebuilt often, so it is put back each time)
function button(){
  const b0=$('#btnLook');if(!b0||$('#kitOpen'))return;
  const b=document.createElement('button');b.className='btn yellow small';b.id='kitOpen';b.type='button';b.textContent='Locker';b.title='Outfits, hats and gun skins. Captains only for now.';
  b.addEventListener('click',open);b0.insertAdjacentElement('afterend',b);
}
function info(slot,no){const it=no?items(slot).find(i=>i.no===no):null;const el=$('#kitInfo');el.textContent='';
  const b=document.createElement('b');b.textContent=it?TX(it.name):TX('Plain');el.append(b,document.createTextNode(' '+TX(it?it.desc:DEF[slot])))}
function draw(){
  if(!ui)return;for(const b of $('#kitTabs').children)b.setAttribute('aria-pressed',String(b.dataset.t===tab));
  const grid=$('#kitGrid');grid.textContent='';const worn=myKit[tab]|0;
  for(const it of [{no:0,name:'Plain',rarity:''}].concat(items(tab))){const b=document.createElement('button');b.type='button';b.className='kit-tile';b.setAttribute('aria-pressed',String(it.no===worn));b.title=it.desc?TX(it.desc):'';
    const img=document.createElement('img');img.alt='';img.src=thumb(tab,it.no);const n=document.createElement('span');n.textContent=TX(it.name);b.append(img,n);
    if(it.rarity){const r=document.createElement('i');r.style.setProperty('--rc',RAR[it.rarity]);r.textContent=TX(it.rarity);b.append(r)}
    b.addEventListener('click',()=>{wear(tab,it.no);X.sUI();draw()});grid.appendChild(b)}
  info(tab,worn);bigPv(true);
}
function bigPv(force){
  if(!ui||ui.sec.hidden)return;const cv=$('#kitCv'),r=Math.min(2,devicePixelRatio||1),w=Math.min(400,Math.max(160,Math.round(cv.clientWidth*r)))||256;
  const p=pvInit();
  if(force){if(tab==='gun'){pvGun(myKit.gun)}else{pvFighter(myKit);if(p.gun)p.gun.visible=false}}
  const src=pvRender(w,w,tab==='gun'?Math.sin(spin)*.5:spin+.35,tab==='gun'?'gun':tab==='hat'?'hat':'outfit');
  if(cv.width!==w)cv.width=w;if(cv.height!==w)cv.height=w;const g=cv.getContext('2d');g.clearRect(0,0,w,w);g.drawImage(src,0,0);
}
function open(){if(!X.on)return;build();refreshMine();ui.sec.hidden=false;spin=0;draw();const f=$('#kitGrid').querySelector('[aria-pressed="true"]');if(f)f.focus({preventScroll:true})}
function close(){if(!ui)return;ui.sec.hidden=true;const b=$('#kitOpen');if(b)b.focus()}
// Called by index.html when who may see the Locker may have changed, when the main menu was drawn again, and once when
// this file arrives.
function access(){
  refreshMine();
  if(X.on)button();
  else{const b=$('#kitOpen');if(b)b.remove();if(ui&&!ui.sec.hidden)close()}
}
function update(dt){if(ui&&!ui.sec.hidden){if(X.state!=='menu'){close();return}spin+=dt*.6;pvT+=dt;if(pvT>1/15){pvT=0;bigPv(false)}}}
document.addEventListener('backroom:lang',()=>{if(ui&&!ui.sec.hidden)draw()});

// =====================================================================
//  Test hook (automated browsers only): contact sheets drawn by the real code
// =====================================================================
if(navigator.webdriver)window.__bsk={theirs,parse,wireOf,wear,heard,kitOf,dress,N,OUT,HATS,GUNS,gunPal,open,close,thumbs,get mine(){return Object.assign({},myKit)},get wire(){return myWire},
  sheet(slot,opt){opt=opt||{};const n=N[slot],cell=opt.cell||200,cols=opt.cols||8,shots=[];
    for(let i=0;i<=n;i++){
      if(slot==='gun'){for(const y of [0,Math.PI]){pvGun(i,opt.def);const c=document.createElement('canvas');c.width=c.height=cell;c.getContext('2d').drawImage(pvRender(cell,cell,y,'gun'),0,0);shots.push([c,(i?NAMES.gun[i-1][0]:'Plain')])}}
      else{const k=parse('');k[slot]=i;pvFighter(k);if(pvInit().gun)pvInit().gun.visible=false;for(const y of [.35,Math.PI+.35]){const c=document.createElement('canvas');c.width=c.height=cell;c.getContext('2d').drawImage(pvRender(cell,cell,y,opt.view||slot),0,0);shots.push([c,(i?NAMES[slot][i-1][0]:'Plain')+(y>2?' (back)':'')])}}}
    const w=cell,h=cell+20,rows=Math.ceil(shots.length/cols),out=document.createElement('canvas');out.width=cols*w;out.height=rows*h;
    const g=out.getContext('2d');g.fillStyle=opt.bg||'#141a3a';g.fillRect(0,0,out.width,out.height);g.font='700 13px sans-serif';g.fillStyle='#f4f7ff';g.textAlign='center';
    shots.forEach(([cv,label],j)=>{const x=(j%cols)*w,y=Math.floor(j/cols)*h;g.drawImage(cv,x,y);g.fillText(label,x+w/2,y+h-5)});
    return out.toDataURL('image/png')}};

return {wire:()=>myWire,heard,dress,gunPal,gunOf,mySkin:()=>X.on?myKit.gun|0:0,update,access,open,close};
};
