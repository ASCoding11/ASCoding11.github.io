/*
 * Shell Crackers' Locker: 19 egg types, 7 hats, 12 gun skins and 5 crack effects, all drawn here in code.
 *
 * NOT PUBLIC YET. index.html fetches this file only when something needs it:
 *   - this player may see the Locker (X.on: SC_PUBLIC in index.html, or the account signed in is one of the site's
 *     captains (../captains.js), or ?locker=1 on localhost / in an automated browser). X.on can change while the page is
 *     open (a captain's account becomes known a moment after the page loads, and goes away on sign-out): index.html
 *     then calls access();
 *   - or another egg in the room arrives wearing something. Then this file only draws that egg: no Locker button,
 *     nothing of this player's own is read, worn or sent, and the bots stay plain.
 * For everyone else this file is never loaded, nothing here runs, and the game is exactly as it was.
 *
 * While the shop is not open (../cosmetics.js is off: FREE below), nothing is owned or bought: a player who may see the
 * Locker finds every item free to wear, and what they wear is saved by the game as shellcr-kit (the wire string below).
 * Once the shop is open, what is worn is what the shop's locker has equipped for 'shell-crackers'.
 *
 * LOOKS ONLY. Nothing here is read by movement, shooting, hits or bots. Every egg type is the same egg (same geometry,
 * same size, same hit box: hits are worked out from the egg's position, never from what is drawn); an ostrich or emu egg
 * reads as big only through its pattern and colour. No egg type is darker than the darkest plain shell (Charcoal), none
 * pulses or glows like the spawn shield, and in capture the flag every egg keeps its team's plain colour (hats, gun
 * skins and crack effects still show). A hat sits on top of the egg and never covers its eyes; the rotten egg's stink
 * lines and flies are only a picture. A gun skin is the same gun recoloured with a few small parts added below or
 * beside it, never in front of the sights, and its muzzle is where it always was.
 *
 * Cost. An egg type is a different picture on the egg's own material (shiny ones use a Phong material in its place), a
 * hat is merged into the egg's face mesh, and a gun skin is a recoloured copy of that gun's one geometry: none of them
 * adds a draw call. The rotten egg's flies are one small extra mesh (one draw call, only on a rotten egg). Crack effects
 * use two instanced pools and two small meshes that are only drawn while an effect is playing.
 *
 * Online. What an egg wears travels in its own room node as `ck`, four base-36 characters: egg type, hat, gun skin and
 * crack effect, each the item's number in ../cosmetics.js (0 = none), e.g. "7300". The field is only sent when
 * something is worn. Pages from before this file ignore it; here every character is checked against the catalogue's
 * counts and anything unknown is drawn as the plain default.
 *
 * A crack effect plays where an egg is cracked, for everyone who sees it, when the egg that cracked it wears one
 * (practice and the training range included). It lasts under two seconds, stays low and small, and never covers a
 * dropped flag for long.
 */
window.ShellKit=function(X){
'use strict';
const {THREE,store,$}=X;
const GAME='shell-crackers';
const SLOTS=['egg','hat','gun','crack'];
const N={egg:19,hat:7,gun:12,crack:5};
const V3=THREE.Vector3;
const rnd=(a,b)=>a+Math.random()*(b-a);
const now=()=>performance.now()/1000;

// ---------------- the wire string (the node's ck) ----------------
function parse(ck){
  const k={egg:0,hat:0,gun:0,crack:0};
  if(typeof ck!=='string'||!/^[0-9a-z]{4}$/.test(ck))return k;
  SLOTS.forEach((s,i)=>{const n=parseInt(ck[i],36);k[s]=n>=1&&n<=N[s]?n:0});
  return k;
}
function wireOf(k){if(!k)return '';const w=SLOTS.map(s=>((k[s]|0)>=1&&(k[s]|0)<=N[s]?k[s]|0:0).toString(36)).join('');return w==='0000'?'':w}

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
function refreshMine(){const k=mine(),w=wireOf(k);const gun=myKit.gun!==k.gun;myKit=k;myWire=w;if(gun)X.vmRefresh()}
function wear(slot,no){
  if(!X.on||!N[slot])return false;no=no|0;if(no<0||no>N[slot])return false;
  if(FREE()){const k=parse(String(store.get('kit','')));k[slot]=no;store.set('kit',wireOf(k)||'')}
  else{const C=cat(),it=no?C.gameItems(GAME,slot).find(i=>i.no===no):null;
    if(it){if(C.owned().items.indexOf(it.id)<0)return false;C.equip(it.id)}else C.unequip(GAME+':'+slot)}
  refreshMine();return true;
}

// =====================================================================
//  Egg types: a picture on the egg (512 x 256; x = 256 is the face, 0 and 512 the back; y = 0 the top)
// =====================================================================
const TW=512,TH=256;
let PR=Math.random;const pr=(a,b)=>a+PR()*(b-a);   // painters' random numbers: seeded per egg type, so every crack stage has the same picture under it
function grad(g,top,bot){const gr=g.createLinearGradient(0,0,0,TH);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,0,TW,TH)}
function dots(g,r,n,cols,rmin,rmax,a0,a1,sy){for(let i=0;i<n;i++){g.fillStyle=cols[Math.floor(r()*cols.length)];g.globalAlpha=a0+(a1-a0)*r();g.beginPath();
  const rr=rmin+(rmax-rmin)*r();g.ellipse(r()*TW,r()*TH,rr,rr*(sy||1),r()*3,0,7);g.fill()}g.globalAlpha=1}
function blob(g,r,x,y,rad,col,pts){g.fillStyle=col;g.beginPath();const n=pts||9;for(let k=0;k<=n;k++){const a=k/n*Math.PI*2,q=rad*(.65+.5*r());g.lineTo(x+Math.cos(a)*q*1.3,y+Math.sin(a)*q)}g.closePath();g.fill()}
// a blot drawn three times across the seam so it wraps round the back without a cut
function wrap(x,f){f(x);if(x<60)f(x+TW);if(x>TW-60)f(x-TW)}
const EGGS=[null,
  // 1 White Egg
  {shard:'#fbf8f0',paint(g,r){grad(g,'#fffdf7','#efe9dc');dots(g,r,160,['#d9d1c0','#ffffff'],.8,2,.15,.45)}},
  // 2 Brown Egg
  {shard:'#c07e4e',paint(g,r){grad(g,'#cd8d5c','#b0703f');dots(g,r,90,['#8a5232','#7a4628','#9a6038'],1.2,3.2,.35,.8);dots(g,r,60,['#e0a878'],1,2.4,.3,.6)}},
  // 3 Speckled Quail
  {shard:'#e6d6b8',paint(g,r){grad(g,'#efe3c8','#ddcba8');
    for(let i=0;i<70;i++){const x=r()*TW,y=r()*TH,s=4+r()*16;wrap(x,xx=>blob(g,r,xx,y,s,r()<.6?'#3a2a1e':'#5a4632',8))}
    dots(g,r,220,['#2e2018','#4a3a2c'],1,3,.6,.95)}},
  // 4 Robin Blue
  {shard:'#8ed2d6',paint(g,r){grad(g,'#a8e2e4','#7cc6cc');dots(g,r,70,['#5fb5bc','#6cc0c4'],1,2.6,.3,.6);dots(g,r,40,['#d6f4f4'],1.5,4,.2,.4)}},
  // 5 Ostrich Egg: big bird, fine dense pores and soft mottling, so the shell looks like part of something huge
  {shard:'#f1e4c4',paint(g,r){grad(g,'#f8eed6','#e6d5ae');
    for(let i=0;i<18;i++){g.globalAlpha=.18;wrap(r()*TW,xx=>blob(g,r,xx,r()*TH,30+r()*40,'#d8c494',11))}g.globalAlpha=1;
    for(let i=0;i<1400;i++){const x=r()*TW,y=r()*TH;g.fillStyle=r()<.7?'rgba(150,120,70,.55)':'rgba(255,250,235,.8)';g.beginPath();g.ellipse(x,y,.9+r()*1.2,.6+r()*.7,r()*3,0,7);g.fill()}
    g.strokeStyle='rgba(255,252,240,.6)';g.lineWidth=10;g.beginPath();g.moveTo(150,40);g.quadraticCurveTo(230,20,330,44);g.stroke()}},
  // 6 Emu Egg: deep green, pebbly; never darker than the Charcoal shell
  {shard:'#3e8a6e',paint(g,r){grad(g,'#4fa080','#327a5e');
    for(let i=0;i<1100;i++){const x=r()*TW,y=r()*TH,s=1.2+r()*2.6;g.fillStyle=r()<.55?'rgba(120,200,160,.55)':'rgba(30,90,66,.55)';g.beginPath();g.ellipse(x,y,s,s*.8,r()*3,0,7);g.fill()}
    g.strokeStyle='rgba(190,240,215,.35)';g.lineWidth=12;g.beginPath();g.moveTo(170,46);g.quadraticCurveTo(240,26,320,48);g.stroke()}},
  // 7 Rotten Egg (with stink lines and flies on top, below)
  {shard:'#a3b85e',paint(g,r){grad(g,'#b2c66c','#93a650');
    for(let i=0;i<26;i++)wrap(r()*TW,xx=>{g.globalAlpha=.55;blob(g,r,xx,r()*TH,8+r()*20,r()<.5?'#7d8d3a':'#9a9a5a',9)});g.globalAlpha=1;
    dots(g,r,160,['#5a6b2a','#4e5a24'],1,2.6,.5,.9);
    g.fillStyle='rgba(110,125,50,.7)';for(let i=0;i<5;i++){const x=40+r()*430;g.fillRect(x,120+r()*40,5,40+r()*50);g.beginPath();g.arc(x+2.5,200+r()*20,5,0,7);g.fill()}}},
  // 8 Golden Egg
  {shard:'#ffd04a',mat:'shiny',spec:0x8a7030,shin:60,paint(g,r){grad(g,'#ffe68a','#e3a823');
    g.fillStyle='rgba(255,250,215,.75)';g.fillRect(0,46,TW,14);g.fillStyle='rgba(255,250,215,.35)';g.fillRect(0,64,TW,8);
    g.fillStyle='rgba(176,120,10,.25)';g.fillRect(0,180,TW,30);
    for(let i=0;i<26;i++){const x=r()*TW,y=r()*TH,s=2+r()*4;g.fillStyle='#fffbe8';g.beginPath();for(let k=0;k<8;k++){const a=k/8*Math.PI*2,q=k%2?s*.3:s;g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.closePath();g.fill()}}},
  // 9 Painted Easter Egg: bands of zigzags, dots and waves
  {shard:'#ff8ac0',paint(g){
    const bands=[['#ffadd2',0,40],['#ffffff',40,58],['#6fd3ff',58,104],['#ffe27a',104,126],['#a6e88a',126,170],['#ffffff',170,186],['#c29bff',186,256]];
    for(const b of bands){g.fillStyle=b[0];g.fillRect(0,b[1],TW,b[2]-b[1])}
    g.fillStyle='#ff5c8a';g.beginPath();g.moveTo(0,58);for(let x=0;x<=TW;x+=16)g.lineTo(x,x%32?44:58);g.lineTo(TW,58);g.fill();
    g.fillStyle='#ffffff';for(let x=8;x<TW;x+=26){g.beginPath();g.arc(x,81,6,0,7);g.fill()}
    g.strokeStyle='#ff8a3d';g.lineWidth=5;g.beginPath();for(let x=0;x<=TW;x+=4)g.lineTo(x,148+Math.sin(x/16)*9);g.stroke();
    g.fillStyle='#36b37e';for(let x=0;x<TW;x+=32){g.beginPath();g.moveTo(x,170);g.lineTo(x+16,186);g.lineTo(x+32,170);g.fill()}
    g.fillStyle='#ffe27a';for(let x=14;x<TW;x+=30){g.beginPath();g.arc(x,214,5,0,7);g.fill()}}},
  // 10 Chocolate Egg: chocolate on top, crinkled gold foil peeled half way down
  {shard:'#8e5a36',mat:'shiny',spec:0x4a3a20,shin:30,paint(g,r){grad(g,'#9c6640','#7e4c2c');
    g.fillStyle='rgba(255,220,180,.25)';g.fillRect(0,40,TW,10);
    const edge=x=>132+Math.sin(x/23)*10+Math.sin(x/7)*5;
    g.fillStyle='#f2cf5b';g.beginPath();g.moveTo(0,TH);for(let x=0;x<=TW;x+=6)g.lineTo(x,edge(x));g.lineTo(TW,TH);g.fill();
    for(let i=0;i<70;i++){const x=r()*TW,y=edge(x)+8+r()*110;g.strokeStyle=r()<.5?'rgba(170,120,20,.55)':'rgba(255,248,200,.8)';g.lineWidth=1.5+r()*1.5;g.beginPath();g.moveTo(x,y);g.lineTo(x+pr(-14,14),y+pr(4,18));g.stroke()}
    g.fillStyle='#e2503f';g.fillRect(0,196,TW,14);g.fillStyle='#ffe68a';for(let x=0;x<TW;x+=20)g.fillRect(x,200,8,6);
    g.strokeStyle='#5a3418';g.lineWidth=3;g.beginPath();for(let x=0;x<=TW;x+=6)g.lineTo(x,edge(x));g.stroke();
    g.fillStyle='#f2cf5b';for(let k=0;k<3;k++){const x=60+k*170;g.beginPath();g.moveTo(x,edge(x));g.lineTo(x+18,edge(x)-26);g.lineTo(x+34,edge(x+34));g.fill()}}},
  // 11 Hard-Boiled: peeled glossy white, a few pieces of shell still stuck on round the bottom
  {shard:'#efe2c8',mat:'shiny',spec:0x3c3c3c,shin:40,paint(g,r){grad(g,'#ffffff','#f1f2f4');
    g.fillStyle='rgba(200,215,235,.35)';g.fillRect(0,170,TW,86);
    for(let i=0;i<9;i++){const x=r()*TW,y=170+r()*80,s=18+r()*22;wrap(x,xx=>{blob(g,r,xx,y,s,'#efe2c8',7);g.strokeStyle='#cdb894';g.lineWidth=2.5;g.stroke()})}
    dots(g,r,40,['#d9c7a2'],1,2.5,.6,.9)}},
  // 12 Century Egg: clay and rice husk outside, a patch fallen away to show amber with frosty pine patterns
  {shard:'#b89a6e',paint(g,r){grad(g,'#c9ab7e','#a88a5e');
    for(let i=0;i<500;i++){const x=r()*TW,y=r()*TH,a=r()*3,l=4+r()*7;g.strokeStyle=r()<.5?'rgba(235,205,140,.85)':'rgba(110,80,40,.7)';g.lineWidth=1.6;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
    const win=(cx,cy)=>{g.save();g.beginPath();for(let k=0;k<14;k++){const a=k/14*Math.PI*2,q=46+r()*14;g.lineTo(cx+Math.cos(a)*q*1.4,cy+Math.sin(a)*q)}g.closePath();
      g.fillStyle='#a8692c';g.fill();g.clip();const rg=g.createRadialGradient(cx-12,cy-10,4,cx,cy,70);rg.addColorStop(0,'#e0a050');rg.addColorStop(1,'#8a5524');g.fillStyle=rg;g.fillRect(cx-90,cy-70,180,140);
      g.strokeStyle='rgba(255,240,200,.75)';g.lineWidth=1.5;for(let f=0;f<6;f++){const fx=cx+pr(-50,50),fy=cy+pr(-30,30);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;g.beginPath();g.moveTo(fx,fy);g.lineTo(fx+Math.cos(a)*8,fy+Math.sin(a)*8);g.stroke()}}
      g.restore();g.strokeStyle='#6b4a22';g.lineWidth=3;g.stroke()};
    win(120,120);win(400,96)}},
  // 13 Dinosaur Egg: sandy with big dark blotches and little pits
  {shard:'#d9c49a',paint(g,r){grad(g,'#e3cfa4','#c9b184');
    for(let i=0;i<30;i++){const x=r()*TW,y=r()*TH,s=10+r()*24;wrap(x,xx=>{g.globalAlpha=.85;blob(g,r,xx,y,s,r()<.5?'#8a6a40':'#6e5232',10)})}g.globalAlpha=1;
    dots(g,r,300,['#b89e70','#f0e2c0'],1,2.4,.5,.9)}},
  // 14 Dragon Egg: rows of overlapping scales with a bright edge
  {shard:'#d8433a',mat:'shiny',spec:0x402018,shin:25,paint(g){grad(g,'#e0503c','#b83a2e');
    const sw=32,sh=22;for(let row=-1;row<TH/sh+1;row++){const off=row%2?sw/2:0,y=row*sh;
      for(let x=-sw;x<TW+sw;x+=sw){const cx=x+off;g.fillStyle=row%3===0?'#d84434':'#c83c30';g.beginPath();g.moveTo(cx,y);g.quadraticCurveTo(cx,y+sh*1.5,cx+sw/2,y+sh*1.6);g.quadraticCurveTo(cx+sw,y+sh*1.5,cx+sw,y);g.closePath();g.fill();
        g.strokeStyle='#ffb02e';g.lineWidth=2.5;g.beginPath();g.moveTo(cx+2,y+sh*.9);g.quadraticCurveTo(cx+sw/2,y+sh*1.75,cx+sw-2,y+sh*.9);g.stroke()}}}},
  // 15 Alien Egg: pale green with bright veins (a faint glow all over, steady: never a pulse like the spawn shield)
  {shard:'#8be08b',emi:0x10260f,paint(g,r){grad(g,'#a6e8a0','#7ccf8e');
    dots(g,r,26,['#c79bff','#b46cff'],5,11,.55,.85);
    const vein=(x,y,a,w,d)=>{if(d>5||w<.8)return;let px=x,py=y;const L=18+r()*24;
      for(let k=0;k<6;k++){a+=pr(-.5,.5);const nx=px+Math.cos(a)*L/6,ny=py+Math.sin(a)*L/6;g.lineWidth=w;g.beginPath();g.moveTo(px,py);g.lineTo(nx,ny);g.stroke();px=nx;py=ny}
      vein(px,py,a+pr(.3,.8),w*.72,d+1);vein(px,py,a-pr(.3,.8),w*.72,d+1)};
    g.lineCap='round';g.shadowColor='#e8ff6a';g.shadowBlur=8;
    for(const col of ['#5fe07a','#efff7a']){g.strokeStyle=col;for(let i=0;i<7;i++)vein(i*74+20,col==='#5fe07a'?250:248,-Math.PI/2+pr(-.3,.3),col==='#5fe07a'?7:3.5,0)}
    g.shadowBlur=0}},
  // 16 Jeweled Egg: blue enamel, gold bands and lattice, gems where they cross
  {shard:'#3a6fe0',mat:'shiny',spec:0x606a80,shin:70,paint(g,r){grad(g,'#4a80ee','#3462cc');
    g.strokeStyle='#ffd04a';g.lineWidth=5;for(let x=-TH;x<TW+TH;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x+TH*.75,TH);g.stroke();g.beginPath();g.moveTo(x+TH*.75,0);g.lineTo(x,TH);g.stroke()}
    for(const y of [30,128,226]){g.fillStyle='#ffd04a';g.fillRect(0,y-8,TW,16);g.fillStyle='#e0a820';g.fillRect(0,y+4,TW,4)}
    const gems=['#e2503f','#36b37e','#ffffff','#b46cff'];let i=0;
    for(const y of [30,128,226])for(let x=16;x<TW;x+=64){g.fillStyle=gems[i++%4];g.beginPath();g.arc(x,y,9,0,7);g.fill();g.strokeStyle='#a87810';g.lineWidth=2.5;g.stroke();g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(x-3,y-3,3,0,7);g.fill()}}},
  // 17 Disco Ball: a grid of little mirrors in greys and pale blues
  {shard:'#d8dee8',mat:'shiny',spec:0xa0a8b4,shin:90,paint(g,r){g.fillStyle='#8a929c';g.fillRect(0,0,TW,TH);
    const s=16;for(let y=0;y<TH;y+=s)for(let x=0;x<TW;x+=s){const v=r(),c=v<.08?'#ffffff':v<.3?'#eef4fb':v<.55?'#cfd8e2':v<.8?'#b8c4d2':'#c8e4ff';g.fillStyle=c;g.fillRect(x+1.5,y+1.5,s-3,s-3);
      if(v<.08){g.fillStyle='rgba(255,255,255,.9)';g.fillRect(x-3,y+s/2-1,s+6,2);g.fillRect(x+s/2-1,y-3,2,s+6)}}}},
  // 18 Pixel Egg: big square pixels (drawn crisp)
  {shard:'#ffd04a',pixel:true,paint(g,r){const P=16;const pal=['#ffe27a','#ffd04a','#f4b832'];
    for(let y=0;y<TH;y+=P)for(let x=0;x<TW;x+=P){g.fillStyle=pal[Math.floor(r()*3)];g.fillRect(x,y,P,P)}
    for(let x=0;x<TW;x+=P){const k=(x/P)%8,yy=96+(k<4?k:8-k)*P;g.fillStyle='#36b37e';g.fillRect(x,yy,P,P);g.fillStyle='#2a8c62';g.fillRect(x,yy+P,P,P)}
    g.fillStyle='#ffffff';g.fillRect(208,32,P,P);g.fillRect(224,32,P,P);g.fillRect(208,48,P,P);
    g.fillStyle='#ef5338';for(let x=0;x<TW;x+=4*P)g.fillRect(x+P,192,P,P),g.fillRect(x+3*P,208,P,P)}},
  // 19 Bandaged Egg: a mended crack with two crossed plasters, on the side so the face stays clear
  {shard:'#fbf6ea',paint(g,r){grad(g,'#fffaf0','#efe6d4');dots(g,r,100,['#d9cdb4'],.8,2,.3,.6);
    g.strokeStyle='#5a4632';g.lineWidth=3;g.lineJoin='round';g.beginPath();let x=96,y=40;g.moveTo(x,y);for(let k=0;k<7;k++){x+=pr(4,12);y+=k%2?12:-4;g.lineTo(x,y+k*6)}g.stroke();
    const plaster=(cx,cy,a)=>{g.save();g.translate(cx,cy);g.rotate(a);g.fillStyle='#f2c49a';g.fillRect(-46,-12,92,24);g.fillStyle='#e8b080';g.fillRect(-14,-12,28,24);
      g.fillStyle='rgba(150,100,60,.55)';for(const px of [-36,-26,26,36])for(const py of [-5,5]){g.beginPath();g.arc(px,py,1.8,0,7);g.fill()}g.strokeStyle='#c99064';g.lineWidth=2;g.strokeRect(-46,-12,92,24);g.restore()};
    plaster(122,74,.6);plaster(122,74,-.6)}}
];
// The same cracks as a plain egg's (index.html's eggTex), drawn over the type's picture as it is hurt.
function crackOver(g,r,stage){
  const crack=(x,y,len)=>{g.beginPath();g.moveTo(x,y);let a=r()*Math.PI*2;for(let k=0;k<len;k++){a+=r()*1.4-.7;x+=Math.cos(a)*18;y+=Math.sin(a)*12;g.lineTo(x,y)}g.stroke()};
  const n=stage===1?4:stage===2?10:0;
  for(let i=0;i<n;i++){const x=r()*TW,y=20+r()*140,len=4+Math.floor(r()*6);g.lineJoin='round';g.strokeStyle='rgba(43,26,16,.85)';g.lineWidth=6;crack(x,y,len)}
  if(stage===2)for(let i=0;i<3;i++){const x=40+r()*(TW-80),y=36+r()*100;g.fillStyle='#ffc93c';g.strokeStyle='#2b1a10';g.lineWidth=6;g.beginPath();
    for(let k=0;k<7;k++){const a=k/7*Math.PI*2,q=14+r()*14;g.lineTo(x+Math.cos(a)*q*1.4,y+Math.sin(a)*q)}g.closePath();g.fill();g.stroke()}
}
const texCache=new Map();
function eggTexture(n,stage){
  const key=n+':'+stage;if(texCache.has(key))return texCache.get(key);
  const E=EGGS[n];
  const t=X.canvasTex(TW,TH,(g)=>{PR=X.mulberry(4242+n*17);E.paint(g,X.mulberry(9001+n*31));PR=Math.random;crackOver(g,X.mulberry(n*7+stage*131),stage)},true);
  t.wrapT=THREE.ClampToEdgeWrapping;if(E.pixel){t.magFilter=THREE.NearestFilter}
  texCache.set(key,t);return t;
}

// =====================================================================
//  Small shapes, merged into one geometry with colours as vertex colours (index.html's mergeParts)
// =====================================================================
const G={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(1,1,1,16),sph:new THREE.SphereGeometry(1,12,8),cone:new THREE.ConeGeometry(1,1,12),
  tor:new THREE.TorusGeometry(1,.1,8,28),taper:new THREE.CylinderGeometry(.72,1,1,16),band:new THREE.CylinderGeometry(1,1,1,28,1,true),ico:new THREE.IcosahedronGeometry(1,0)};
function P(L,geo,c,x,y,z,sx,sy,sz,rx,ry,rz){L.push({g:G[geo]||geo,c,m:X.partM(x,y,z,sx,sy,sz,rx,ry,rz)})}

// =====================================================================
//  Hats: in the face's own space (its origin is the middle of the egg, y up, the face looking down -z; the top of the
//  egg is at y 0.72, where it is about 0.22 wide). They are merged into the face's dark mesh, so a hat costs no draw call.
//  None of them comes down over the eyes (y 0.2) or the brows (y 0.33).
// =====================================================================
const HATS=[null,
  // 1 Eggcup Crown: a gold cup round the top of the head, with points, little balls and jewels
  L=>{const Gd=0xffd04a,Gk=0xe0a820;P(L,'band',Gd,0,.6,0,.262,.13,.262);P(L,'tor',Gk,0,.535,0,.262,.262,.262,Math.PI/2);P(L,'tor',Gk,0,.665,0,.26,.26,.2,Math.PI/2);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2+Math.PI/6,x=Math.sin(a)*.25,z=-Math.cos(a)*.25;P(L,'cone',Gd,x,.73,z,.05,.13,.05);P(L,'sph',0xfff3b0,x,.805,z,.022,.022,.022)}
    const gems=[0xe2503f,0x58b4ff,0x36b37e];for(let i=0;i<6;i++){const a=i/6*Math.PI*2,x=Math.sin(a)*.268,z=-Math.cos(a)*.268;P(L,'sph',gems[i%3],x,.6,z,.03,.03,.016,0,-a,0)}},
  // 2 Frying Pan: tipped over the head, a fried egg still in it
  L=>{const T=[0,.78,.02],rz=.22,rx=-.12;const M=new THREE.Matrix4().compose(new V3(...T),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,rz)),new V3(1,1,1));
    const Q=[];P(Q,'cyl',0x3a3836,0,0,0,.3,.035,.3);P(Q,'tor',0x2a2826,0,.03,0,.3,.3,.3,Math.PI/2);P(Q,'cyl',0x55514c,0,.019,0,.26,.004,.26);
    P(Q,'box',0x2a2826,.47,.03,0,.36,.035,.06);P(Q,'box',0x8a5a36,.6,.03,0,.16,.045,.07);
    P(Q,'cyl',0xfffdf8,-.02,.03,.02,.17,.012,.15);P(Q,'sph',0xffc93c,-.04,.04,.03,.06,.035,.06);
    for(const q of Q){q.m.premultiply(M);L.push(q)}},
  // 3 Nest: twigs and straw round a little bowl, three tiny eggs
  L=>{const r=X.mulberry(77),cols=[0x9a6a3a,0x7a4f28,0xb8894f,0xe0c070,0x8a6a3a];P(L,'cyl',0x7a5530,0,.68,0,.21,.06,.21);
    for(let i=0;i<34;i++){const a=i/34*Math.PI*2+r()*.2,rad=.2+r()*.05,y=.67+r()*.09;P(L,'box',cols[i%5],Math.sin(a)*rad,y,-Math.cos(a)*rad,.022,.022,.17+r()*.06,(r()-.5)*.6,-a+Math.PI/2+(r()-.5)*.5,0)}
    for(const [x,z,c] of [[-.06,-.03,0x8fd3d0],[.07,-.01,0xf3ead8],[0,.07,0x8fd3d0]])P(L,'sph',c,x,.765,z,.05,.064,.05,.3,0,.2)},
  // 4 Chef Hat
  L=>{const W=0xffffff,C=0xf1eee6;P(L,'band',C,0,.66,0,.235,.16,.235);P(L,'cyl',W,0,.74,0,.225,.02,.225);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;P(L,'sph',i%2?W:C,Math.sin(a)*.13,.86,-Math.cos(a)*.13,.14,.13,.14)}P(L,'sph',W,0,.92,0,.16,.14,.16)},
  // 5 Bacon Headband: a wavy strip round the middle of the head (above the brows), tied at the back
  L=>{const n=28,R=.322,cols=[0xc8443a,0xf6d2b8,0xe07a6a];
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2,x=Math.sin(a)*R,z=-Math.cos(a)*R,w=Math.sin(a*5)*.018,seg=2*Math.PI*R/n*1.15;
      for(let k=0;k<3;k++)P(L,'box',cols[k],x,.425+w+(k-1)*.026,z,seg,.027,.02,0,-a,0)}
    for(const s of [-1,1])for(let k=0;k<3;k++)P(L,'box',cols[k],s*.05,.36+(k-1)*.024,.33,.026,.13,.018,.2,0,s*.5)}
  ,
  // 6 Baby Chick: sitting on top
  L=>{const Y=0xffd84a,O=0xf4a41c,K=0x2b1a10;P(L,'sph',Y,0,.8,.02,.14,.12,.15);P(L,'sph',Y,0,.94,-.05,.095,.095,.095);
    P(L,'cone',O,0,.93,-.15,.03,.06,.025,-Math.PI/2);for(const s of [-1,1]){P(L,'sph',K,s*.04,.965,-.13,.015,.018,.012);P(L,'sph',0xffc22a,s*.135,.8,.03,.03,.07,.09,0,0,s*.4)}
    for(const a of [-.4,0,.4])P(L,'cone',Y,Math.sin(a)*.03,1.05,-.04,.018,.06,.018,0,0,-a)},
  // 7 Sunny-Side-Up Beret: a floppy white beret with the yolk on top
  L=>{const W=0xfffdf8,Wd=0xf3efe6;const M=new THREE.Matrix4().compose(new V3(.02,.72,.01),new THREE.Quaternion().setFromEuler(new THREE.Euler(-.1,0,.22)),new V3(1,1,1));
    const Q=[];P(Q,'sph',W,0,0,0,.31,.075,.3);for(let i=0;i<9;i++){const a=i/9*Math.PI*2;P(Q,'sph',i%2?W:Wd,Math.sin(a)*.27,-.005,Math.cos(a)*.27,.09,.05,.09)}
    P(Q,'sph',0xffc93c,.05,.06,.02,.1,.06,.1);P(Q,'sph',0xffe27a,.03,.09,0,.035,.02,.035);P(Q,'cyl',Wd,.05,.11,.02,.012,.04,.012);
    for(const q of Q){q.m.premultiply(M);L.push(q)}}
];
// The rotten egg's stink lines (merged like a hat) and its flies (one small mesh that circles: the egg's only extra draw call)
function stinkParts(L){const c=[0x8fa05a,0x9db06a,0x7d8d48];
  for(let i=0;i<3;i++){const x=(i-1)*.16,z=.08+(i===1?.04:0);for(let k=0;k<9;k++){const y=.72+k*.04,dx=Math.sin(k*.9+i)*.035;P(L,'box',c[i],x+dx,y,z,.022,.045,.018,0,0,Math.cos(k*.9+i)*.6)}}}
let fliesGeo=null;
function flies(){if(fliesGeo)return fliesGeo;const L=[];
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2,x=Math.sin(a)*.42,z=Math.cos(a)*.42,y=1.05+i*.1;P(L,'sph',0x262624,x,y,z,.03,.024,.04,0,a,0);
    for(const s of [-1,1])P(L,'sph',0xe8f0f6,x+s*.026,y+.022,z,.03,.008,.018,0,a,s*.5)}
  return fliesGeo=X.mergeParts(L)}
const faceCache=new Map();
function faceGeo(hat,rot){const key=hat+':'+rot;if(faceCache.has(key))return faceCache.get(key);
  const L=[{g:X.faceGeos.ink,c:0x2b1a10,m:new THREE.Matrix4()}];if(hat)HATS[hat](L);if(rot)stinkParts(L);
  const geo=X.mergeParts(L);faceCache.set(key,geo);return geo}

// =====================================================================
//  Dressing an egg (index.html's makeEgg model: g, body, shell, mat, face, gp, gun, fest)
// =====================================================================
function dress(m,k,anyMode){
  k=k&&wireOf(k)?k:null;m.kit=k;const ctf=!anyMode&&!!X.ctf;m._ctf=!!X.ctf;
  const egg=k&&!ctf?k.egg:0,E=EGGS[egg],kind=E&&E.mat==='shiny'?'shiny':'lam';
  if((m.matKind||'lam')!==kind){const old=m.mat;
    const nm=kind==='shiny'?new THREE.MeshPhongMaterial({map:old.map,specular:E.spec,shininess:E.shin}):new THREE.MeshLambertMaterial({map:old.map});
    m.shell.material=nm;m.mat=nm;old.dispose();m.matKind=kind}
  else if(kind==='shiny'){m.mat.specular.setHex(E.spec);m.mat.shininess=E.shin}
  m.emi=E&&E.emi?new THREE.Color(E.emi):null;if(!m.emi)m.mat.emissive.setRGB(0,0,0);
  m.stage=-1;   // index.html's updateModel puts the right picture on at the next frame
  const hat=k?k.hat:0,rot=egg===7,ink=m.face.children[1];
  if(hat||rot){ink.geometry=faceGeo(hat,rot?1:0);ink.material=X.gunMat}else{ink.geometry=X.faceGeos.ink;ink.material=X.inkMat}
  if(m.fest)m.fest.geometry=X.turkeyKit(!!hat);   // Turkey Week: a Locker hat in place of the pilgrim hat
  if(rot&&!m.flies){m.flies=new THREE.Mesh(flies(),X.gunMat);m.body.add(m.flies)}else if(!rot&&m.flies){m.body.remove(m.flies);m.flies=null}
  const skin=k?k.gun:0;if((m.gunSkin|0)!==skin){m.gunSkin=skin;m.gunKey=null}   // updateModel builds the gun again
}
// Another egg's node said what it wears (ck). Anything that isn't four known characters is the plain egg.
function heard(e,ck){
  const w=typeof ck==='string'&&/^[0-9a-z]{4}$/.test(ck)?wireOf(parse(ck)):'';
  if((e.ck||'')===w)return;e.ck=w;e.kit=w?parse(w):null;if(e.model)dress(e.model,e.kit);
}
function shellTex(m,st){return m.kit&&m.kit.egg&&!X.ctf?eggTexture(m.kit.egg,st):null}
function shardColor(t){const m=t.model;return m&&m.kit&&m.kit.egg&&!X.ctf?EGGS[m.kit.egg].shard:t.color}

// =====================================================================
//  Gun skins: the gun's own geometry with its colours swapped (by the colour each part had in index.html's gunParts)
//  and a few small parts added. Never above the sights, and the muzzle stays where it was.
// =====================================================================
// Where things are on each gun (from gunParts): secs = body pieces [z0,z1, middle y, half width, half height];
// bar = barrel [z0,z1,y,r]; end = back of the gun [z,y, half width, half height]; st = where the stock starts (z);
// head = a spot under the front [z,y]; feet = a spot under the middle [z,y]; s = size of small add-ons.
const GUNA={
  beater:{secs:[[-.21,.21,.012,.038,.041],[-.39,-.17,.008,.046,.048]],bar:[-.59,-.39,.015,.016],end:[.43,-.012,.035,.062],st:.25,head:[-.36,-.08],feet:[-.24,-.04],s:1},
  skillet:{secs:[[-.17,.17,0,.048,.057],[-.43,-.25,-.035,.052,.04]],bar:[-.68,-.43,.03,.028],end:[.44,-.03,.038,.06],st:.16,head:[-.46,-.1],feet:[-.05,-.057],s:1},
  sunny:{secs:[[-.22,.22,0,.038,.049]],bar:[-.82,-.38,.01,.016],end:[.49,-.022,.035,.06],st:.21,head:[-.2,-.09],feet:[-.15,-.049],s:1},
  whisk:{secs:[[-.14,.14,0,.04,.054]],bar:[-.27,-.14,.015,.027],end:[.34,.005,.035,.04],st:.13,head:[-.12,-.095],feet:[-.1,-.054],s:.9},
  poacher:{secs:[[-.25,.25,0,.045,.064],[-.37,-.23,-.02,.031,.033]],bar:[-.48,-.37,.01,.016],end:[.27,0,.045,.066],st:.17,head:[-.34,-.09],feet:[.03,-.064],s:1},
  cracker:{secs:[[-.13,.09,.045,.025,.03]],bar:[-.175,-.13,.045,.014],end:[.1,.045,.025,.03],st:null,head:[-.09,-.035],feet:[-.05,-.01],s:.6}
};
// a ring round a body piece at z (four flat strips), optionally tilted about the gun's x axis
function ring(L,sec,z,c,depth,tilt){const [,,yc,hw,hh]=sec,t=.006,Q=[];
  P(Q,'box',c,0,hh+t/2,0,2*hw+2*t,t,depth);P(Q,'box',c,0,-hh-t/2,0,2*hw+2*t,t,depth);
  for(const s of [-1,1])P(Q,'box',c,s*(hw+t/2),0,0,t,2*hh,depth);
  const M=new THREE.Matrix4().makeRotationX(tilt||0).setPosition(0,yc,z);for(const q of Q){q.m.premultiply(M);L.push(q)}}
const W_=k=>X.WEAPONS[k];
const SKINS=[null,
  // 1 Cast Iron
  {pal:{A:0x4a4642,AL:0x5e5a55,AD:0x34312e,D:0x3a3735,K:0x242220,M:0x4c4845,L:0x6e6862,WD:0x4a3a2c,WK:0x3a2c20,CR:0x8a8580,YK:0xb0a090},
   extra(L,a){for(const sec of a.secs)for(const z of [sec[0]+.03,sec[1]-.03])for(const s of [-1,1])P(L,'cyl',0x77716a,s*(sec[3]+.003),sec[2],z,.009*a.s,.008,.009*a.s,0,0,Math.PI/2)}},
  // 2 Gold Plated
  {mat:'gold',pal:{A:0xffd04a,AL:0xffe68a,AD:0xd9a520,D:0xe0ae2c,K:0xa87810,M:0xf0c040,L:0xfff0a0,WD:0x7a2e1c,WK:0x5a2014,CR:0xfff8e0,YK:0xffffff,RED:0xe2503f}},
  // 3 Egg Carton: moulded cardboard with a row of cups down each side and a stamp
  {pal:{A:0xc4b294,AL:0xd8c8ac,AD:0xa89878,D:0xcdbfa6,K:0x9a8c74,M:0xd6cab4,L:0xe4dac6,WD:0xc4b294,WK:0xa89878,CR:0xfff3d6,YK:0xffc93c},
   extra(L,a){const s=a.secs[0],n=a.s<1?2:3;for(let i=0;i<n;i++){const z=s[0]+(s[1]-s[0])*(i+.5)/n;for(const q of [-1,1])P(L,'sph',0xdccfb8,q*(s[3]-.002),s[2],z,.016*a.s,.026*a.s,.032*a.s)}
     P(L,'box',0x5a7ab0,s[3]+.002,s[2]+s[4]*.45,s[1]-.04*a.s,.003,.016*a.s,.03*a.s)}},
  // 4 Yolk Drip: shell white with yolk running off it
  {pal:{D:0xfdf6e3,AD:0xf4a41c,M:0xf1e6c8,L:0xfffbf0,K:0xd9c9a6,A:0xffc93c,AL:0xffe27a,WD:0xf3e7cc,WK:0xe0d0b0,CR:0xffffff,YK:0xffc93c},
   extra(L,a){const Y=0xffc93c;for(const sec of a.secs){const [z0,z1,yc,hw,hh]=sec;
     for(let i=0;i<3;i++){const z=z0+(z1-z0)*(.2+.3*i),len=(.025+.02*((i*7)%3))*a.s;for(const s of [-1,1]){const x=s*(hw-.004);
       P(L,'cyl',Y,x,yc-hh-len/2+.004,z+s*.01,.008*a.s,len,.008*a.s);P(L,'sph',Y,x,yc-hh-len,z+s*.01,.012*a.s,.015*a.s,.012*a.s)}}
     P(L,'box',Y,0,yc+hh+.002,z0+(z1-z0)*.35,2*hw*.7,.004,(z1-z0)*.2)}}},
  // 5 Bacon Wrap: strips round the body
  {pal:{},extra(L,a){for(const sec of a.secs){const n=a.s<1?1:2;for(let i=0;i<n;i++){const z=sec[0]+(sec[1]-sec[0])*(i+.6)/(n+.2),t=(i%2?.18:-.18);
     ring(L,sec,z-.016*a.s,0xc8443a,.016*a.s,t);ring(L,sec,z,0xf6d2b8,.016*a.s,t);ring(L,sec,z+.016*a.s,0xe07a6a,.016*a.s,t)}}}},
  // 6 Ketchup and Mustard: red with a yellow squiggle down each side
  {pal:{D:0xd62c2c,AD:0xa81e1e,M:0xe85a4a,K:0x7a1414,A:0xffd23f,AL:0xffe680,L:0xfff1b0,WD:0xffd23f,WK:0xe0b020,CR:0xffffff,YK:0xd62c2c,RED:0xffd23f},
   extra(L,a){for(const sec of a.secs){const [z0,z1,yc,hw,hh]=sec,st=.03*a.s,amp=Math.min(.014,hh*.4);let s=1;
     for(let z=z0+.015;z+st<=z1-.01;z+=st,s=-s){const dy=-2*amp*s,len=Math.hypot(st,dy),ang=Math.atan2(dy,st);
       for(const q of [-1,1])P(L,'box',0xffd23f,q*(hw+.003),yc+amp*s+dy/2,z+st/2,.006,.009,len+.006,-ang,0,0)}}}},
  // 7 Hot Sauce: deep red with flames licking back from the front
  {pal:{D:0xc2261c,AD:0x8a160e,M:0xe0482c,K:0x5a0e0a,A:0xff9a2e,AL:0xffc46a,L:0xffd27a,WD:0x8a160e,WK:0x5a0e0a,CR:0xffe27a,YK:0xff9a2e},
   extra(L,a){const sec=a.secs[0],[z0,z1,yc,hw,hh]=sec,len=Math.min(.16,(z1-z0)*.6)*a.s/(a.s<1?.8:1);
     for(const q of [-1,1])for(let i=0;i<4;i++){const y=yc+hh*(-.6+i*.4),l=len*(.6+.4*((i*5)%3)/2);
       P(L,'cone',0xff7a1a,q*(hw+.003),y,z0+.01+l/2,.003,l,.018*a.s,Math.PI/2);P(L,'cone',0xffd23f,q*(hw+.005),y,z0+.01+l*.4,.003,l*.6,.009*a.s,Math.PI/2)}}},
  // 8 Toaster Chrome: polished, with two bread slots and a lever on the side
  {mat:'chrome',pal:{D:0xc9d2dc,AD:0x9aa4ae,M:0xe6ecf2,L:0xf6f9fc,K:0x2a2e34,A:0xdfe6ee,AL:0xffffff,WD:0x2a2e34,WK:0x1e2226,CR:0xffffff,YK:0xff7a3a,RED:0xff7a3a},
   extra(L,a){const [z0,z1,yc,hw,hh]=a.secs[0],l=(z1-z0)*.35;for(const q of [-1,1])for(const dz of [-.55,.05])P(L,'box',0x1a1c20,q*(hw+.001),yc+hh*.35,z0+(z1-z0)*.5+dz*l,.004,.008*a.s,l*.8);
     P(L,'box',0x2a2e34,hw+.006,yc-hh*.2,z1-.05*a.s,.008,.012*a.s,.03*a.s);P(L,'sph',0x1a1c20,hw+.014,yc-hh*.2,z1-.05*a.s,.012*a.s,.012*a.s,.012*a.s)}},
  // 9 Candy Stripe: white with red stripes all the way round
  {pal:{D:0xfdfdfd,AD:0xf0f0f0,M:0xf6f6f6,L:0xffffff,K:0xe2343f,A:0xe2343f,AL:0xff6a74,WD:0xfdfdfd,WK:0xe2343f,CR:0xffffff,YK:0xe2343f},
   extra(L,a){const R=0xe2343f,st=.05*a.s;for(const sec of a.secs)for(let z=sec[0]+st*.6;z<sec[1]-st*.3;z+=st)ring(L,sec,z,R,.014*a.s,.45);
     const [b0,b1,by,br]=a.bar;for(let z=b0+.02;z<b1;z+=.04*a.s){const M=new THREE.Matrix4().makeRotationX(.4).setPosition(0,by,z),Q=[];P(Q,'tor',R,0,0,0,br+.002,br+.002,br+.002);Q[0].m.premultiply(M);L.push(Q[0])}}},
  // 10 Whisk Barrel: wire loops round the barrel, gathered in a ring behind them
  {pal:{D:0x9aa4ae,AD:0x7a848e,M:0xc9d1d9,L:0xe6ebf0,K:0xb98a56,A:0xc9d1d9,AL:0xe6ebf0,WD:0xb98a56,WK:0x9a6a3a,CR:0xffffff,YK:0xffc93c},
   extra(L,a){const [b0,b1,by,br]=a.bar,tip=b0-.005,len=Math.min(.17,b1-b0+.04)*(a.s<1?.8:1),R=Math.max(br+.012,.034*a.s),n=10,W=0xdfe5ea;
     for(let k=0;k<5;k++){const ph=k/5*Math.PI;for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n,r0=R*Math.sin(Math.PI*t0),r1=R*Math.sin(Math.PI*t1),zz0=tip+len*t0,zz1=tip+len*t1;
       for(const sg of [-1,1]){const x0=Math.cos(ph)*r0*sg,y0=Math.sin(ph)*r0*sg,x1=Math.cos(ph)*r1*sg,y1=Math.sin(ph)*r1*sg,dx=x1-x0,dy=y1-y0,dz=zz1-zz0,l=Math.hypot(dx,dy,dz);
         const q=new THREE.Quaternion().setFromUnitVectors(new V3(0,0,1),new V3(dx/l,dy/l,dz/l));
         L.push({g:G.box,c:W,m:new THREE.Matrix4().compose(new V3((x0+x1)/2,by+(y0+y1)/2,(zz0+zz1)/2),q,new V3(.004,.004,l+.002))})}}}
     P(L,'tor',0x9aa4ae,0,by,tip+len,br+.006,br+.006,br+.006);P(L,'sph',W,0,by,tip,.007,.007,.007)}},
  // 11 Wooden Spoon Stock: the back of the gun in pale wood, ending in a spoon
  {pal:{},at(key,role,x,y,z,a){const back=a.st==null?y<-.02:z>=a.st;if(!back||role==null||role==='LENS')return null;return /^(D|K|M|AD|WK)$/.test(role)?0xc4955c:0xe3bf8a},
   extra(L,a){const [z,y,hw,hh]=a.end;if(a.st==null){P(L,'sph',0xe3bf8a,0,-.14,.1,.032,.014,.045);P(L,'sph',0xc4955c,0,-.132,.1,.024,.008,.035);return}
     P(L,'box',0xe3bf8a,0,y,z+.02,.02,.02,.05);P(L,'sph',0xe3bf8a,0,y,z+.07,.042,Math.max(.06,hh*1.05),.022);P(L,'sph',0xc4955c,0,y,z+.078,.032,Math.max(.046,hh*.82),.012)}},
  // 12 Rubber Chicken: squeaky yellow, a head under the front, dangling feet and a tail at the back
  {pal:{D:0xffd23f,AD:0xf0b820,M:0xffde6a,L:0xfff0a0,K:0xf4b030,A:0xffe27a,AL:0xfff2b0,WD:0xffd23f,WK:0xf0b820,CR:0xffffff,YK:0xff8a2a,RED:0xe2343f},
   extra(L,a){const s=a.s,[hz,hy]=a.head,[fz,fy]=a.feet,[ez,ey,ew,eh]=a.end,Y=0xffd84a,O=0xff8a2a,R=0xe2343f;
     P(L,'cyl',Y,0,hy+.03*s,hz+.01,.012*s,.04*s,.012*s,.3);P(L,'sph',Y,0,hy,hz,.03*s,.032*s,.034*s);
     for(const i of [-1,0,1])P(L,'sph',R,0,hy+.03*s-Math.abs(i)*.004,hz+i*.014*s,.007*s,.012*s,.009*s);
     P(L,'cone',O,0,hy-.004,hz-.04*s,.012*s,.03*s,.008*s,-Math.PI/2);P(L,'sph',R,0,hy-.022*s,hz-.026*s,.007*s,.013*s,.006*s);
     for(const q of [-1,1])P(L,'sph',0x2b1a10,q*.022*s,hy+.008*s,hz-.016*s,.006*s,.007*s,.006*s);
     for(const q of [-1,1]){const x=q*.014*s;P(L,'cyl',O,x,fy-.03*s,fz,.004*s,.06*s,.004*s);for(const r of [-.5,0,.5])P(L,'box',O,x+Math.sin(r)*.01*s,fy-.06*s,fz-Math.cos(r)*.01*s,.004*s,.004*s,.022*s,0,r,0)}
     for(const r of [-.5,0,.5])P(L,'sph',0xfff2b0,Math.sin(r)*.02*s,ey+eh*.6+.02*s,ez-.01,.012*s,.04*s,.01*s,-.5,0,r)}}
];
let goldMat=null,chromeMat=null;
function skinMat(kind){
  if(kind==='gold')return goldMat||(goldMat=new THREE.MeshPhongMaterial({vertexColors:true,specular:0x8a7438,shininess:70}));
  if(kind==='chrome')return chromeMat||(chromeMat=new THREE.MeshPhongMaterial({vertexColors:true,specular:0xc8d0da,shininess:110}));
  return null;
}
// two merged geometries (position, normal, colour, index) into one
function join(a,b){const n=a.attributes.position.count,m=b.attributes.position.count,out=new THREE.BufferGeometry();
  for(const k of ['position','normal','color']){const A=a.attributes[k].array,B=b.attributes[k].array,C=new Float32Array(A.length+B.length);C.set(A);C.set(B,A.length);out.setAttribute(k,new THREE.BufferAttribute(C,3))}
  const ia=a.index.array,ib=b.index.array,I=(n+m)>65535?new Uint32Array(ia.length+ib.length):new Uint16Array(ia.length+ib.length);I.set(ia);for(let i=0;i<ib.length;i++)I[ia.length+i]=ib[i]+n;
  out.setIndex(new THREE.BufferAttribute(I,1));out.computeBoundingSphere();return out}
const skinCache=new Map();
function gunGeo(key,n){
  n=n|0;if(!(n>=1&&n<=N.gun)||!X.gunGeos[key])return null;const id=key+':'+n;if(skinCache.has(id))return skinCache.get(id);
  const S=SKINS[n],a=GUNA[key]||GUNA.beater,A=X.WEAPONS[key].color,roles={},add=(r,h)=>{if(!(h in roles))roles[h]=r};
  add('A',A);add('AL',X.hue(A,1.3));add('AD',X.hue(A,.7));add('D',0x2f2b33);add('K',0x211e25);add('M',0x56525e);add('L',0x938f9e);add('WD',0x9a6a3a);add('WK',0x7a4f28);
  add('CR',0xfff3d6);add('YK',0xffc93c);add('RED',0xef5338);add('LENS',0xcfeeff);
  const g=X.gunGeos[key].geo.clone(),col=g.attributes.color,pos=g.attributes.position,c=new THREE.Color();
  for(let i=0;i<col.count;i++){c.setRGB(col.getX(i),col.getY(i),col.getZ(i));const r=roles[c.getHex()];let o=r?S.pal[r]:null;
    if(S.at){const v=S.at(key,r,pos.getX(i),pos.getY(i),pos.getZ(i),a);if(v!=null)o=v}
    if(o!=null){c.setHex(o);col.setXYZ(i,c.r,c.g,c.b)}}
  let geo=g;if(S.extra){const L=[];S.extra(L,a,key);if(L.length){geo=join(g,X.mergeParts(L));g.dispose()}}
  const out={geo,mat:skinMat(S.mat)};skinCache.set(id,out);return out;
}

// =====================================================================
//  Crack effects. A world is {scene, floor(x,y,z), solid(x,y,z)}: the game's map, or the Locker's preview. Two instanced
//  pools (round bits and flat flakes) and two small meshes each for the fried egg and the chick; each is only drawn
//  while it is in use. Every effect is over in under two seconds and stays low and small.
// =====================================================================
let friedGeo=null,chickGeo=null;
function fried(){if(friedGeo)return friedGeo;const L=[];P(L,'cyl',0xfffdf8,0,0,0,.4,.03,.36);
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2+.3,r=.34+(i%3)*.03;P(L,'cyl',i%2?0xfffdf8:0xfbf6ea,Math.cos(a)*r,0,Math.sin(a)*r*.92,.11,.028,.1)}
  P(L,'sph',0xffc93c,.03,.035,.02,.13,.075,.13);P(L,'sph',0xffe7a0,-.01,.08,-.02,.04,.02,.035);return friedGeo=X.mergeParts(L)}
function chick(){if(chickGeo)return chickGeo;const L=[],Y=0xffd84a,O=0xf4a41c,K=0x2b1a10;
  P(L,'sph',Y,0,.17,0,.15,.14,.17);P(L,'sph',Y,0,.33,-.08,.1,.1,.1);P(L,'cone',O,0,.32,-.2,.032,.07,.026,-Math.PI/2);
  for(const s of [-1,1]){P(L,'sph',K,s*.045,.36,-.165,.016,.02,.012);P(L,'sph',0xffc22a,s*.14,.18,.02,.03,.08,.1,0,0,s*.35);
    P(L,'cyl',O,s*.05,.03,0,.012,.07,.012);P(L,'box',O,s*.05,.005,-.03,.03,.01,.07)}
  for(const a of [-.4,0,.4])P(L,'cone',Y,Math.sin(a)*.03,.45,-.08,.018,.06,.018,0,0,-a);
  P(L,'sph',0xfff8e8,0,.1,.05,.17,.09,.17);   // a bit of shell still stuck round its bottom
  return chickGeo=X.mergeParts(L)}
const flakeGeo=(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,.06,0,-.05,-.04,0,.055,-.035,0],3));g.computeVertexNormals();return g})();
const ZM=new THREE.Matrix4().makeScale(0,0,0),_o=new THREE.Object3D(),_c=new THREE.Color();
function makeFx(W){
  function pool(geo,n,side){const mat=new THREE.MeshLambertMaterial({color:0xffffff,side:side||THREE.FrontSide});const m=new THREE.InstancedMesh(geo,mat,n);
    m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);for(let i=0;i<n;i++){m.setMatrixAt(i,ZM);m.setColorAt(i,_c.setHex(0xffffff))}m.visible=false;W.scene.add(m);
    const ps=[];for(let i=0;i<n;i++)ps.push({on:false,P:new V3(),v:new V3(),r:new V3(),sp:new V3(),t:0,life:1,s:.05,s1:.05,g:0,k:0,cx:0,cz:0,a:0,rad:0,w:0,y0:0,jt:0});return {m,ps,i:0,n}}
  const blobs=pool(G.ico,140),flakes=pool(flakeGeo,90,THREE.DoubleSide);
  const meshes=[];   // fried eggs and chicks in play
  const spare={fried:[],chick:[]};
  function getMesh(kind){let o=spare[kind].pop();if(!o){o=new THREE.Mesh(kind==='fried'?fried():chick(),X.gunMat);W.scene.add(o)}o.visible=true;return o}
  // k: 0 falls, 1 floats up and swells, 2 whirls round (then falls), 3 buzzes about
  function add(Pl,col,pos,o){const p=Pl.ps[Pl.i=(Pl.i+1)%Pl.n];Object.assign(p,{on:true,t:0,life:o.life,s:o.s,s1:o.s1==null?o.s:o.s1,g:o.g||0,k:o.k||0,jt:0});
    p.P.copy(pos);p.v.copy(o.v||new V3());p.r.set(Math.random()*6,Math.random()*6,Math.random()*6);p.sp.set(rnd(-9,9),rnd(-9,9),rnd(-9,9));
    if(o.k===2){p.cx=pos.x;p.cz=pos.z;p.a=o.a;p.rad=o.rad;p.w=o.w;p.y0=pos.y}
    Pl.m.setColorAt(Pl.i,_c.set(col));Pl.m.instanceColor.needsUpdate=true;Pl.m.visible=true;return p}
  const at=(p,dx,dy,dz)=>new V3(p.x+dx,p.y+dy,p.z+dz);
  function play(kind,p,col,dir){
    if(kind===1){const o=getMesh('fried');o.position.set(p.x,p.y+.7,p.z);o.rotation.set(0,Math.random()*6,0);o.scale.setScalar(.6);
      meshes.push({o,kind:'fried',t:0,vy:3.4,y:p.y+.7,fl:W.floor(p.x,p.y+.7,p.z)+.03,landed:false})}
    else if(kind===2){const cols=['#ffd84a','#ffe27a','#fff3c4','#f4c430','#ffcf3a'];
      for(let i=0;i<26;i++)add(blobs,cols[i%5],at(p,0,.45+Math.random()*.35,0),{k:2,a:i/26*Math.PI*2,rad:.1+Math.random()*.12,w:rnd(8,11),life:rnd(1.1,1.35),s:rnd(.045,.075),g:14})}
    else if(kind===3){const o=getMesh('chick');let d=dir?Math.atan2(dir.x,dir.z):Math.random()*6;o.position.set(p.x,p.y+.2,p.z);o.rotation.set(0,d+Math.PI,0);o.scale.setScalar(.2);
      meshes.push({o,kind:'chick',t:0,d,vy:3.2,y:p.y+.2,fl:W.floor(p.x,p.y+.5,p.z),turned:0})}
    else if(kind===4){const cols=['#ff5c8a','#58b4ff','#ffd23f','#36b37e','#b46cff','#ff8a3d','#ffffff'];
      for(let i=0;i<46;i++){const a=Math.random()*Math.PI*2,sp=rnd(1,2.8);add(flakes,cols[i%7],at(p,rnd(-.2,.2),.6+Math.random()*.4,rnd(-.2,.2)),{v:new V3(Math.cos(a)*sp,rnd(3,5.5),Math.sin(a)*sp),life:rnd(1.1,1.6),s:rnd(.9,1.4),g:6})}}
    else if(kind===5){const cols=['#a3b85e','#8fa04a','#c3d27a','#b6c86e'];
      for(let i=0;i<9;i++)add(blobs,cols[i%4],at(p,rnd(-.25,.25),.35+Math.random()*.5,rnd(-.25,.25)),{k:1,v:new V3(rnd(-.3,.3),rnd(.6,1.1),rnd(-.3,.3)),life:rnd(.9,1.2),s:.08,s1:rnd(.22,.3)});
      for(let i=0;i<2;i++)add(blobs,'#262624',at(p,0,.9,0),{k:3,v:new V3(rnd(-2,2),rnd(.5,1.5),rnd(-2,2)),life:1.3,s:.035})}
  }
  function stepPool(Pl,dt){if(!Pl.m.visible)return;let any=false;
    for(let i=0;i<Pl.n;i++){const p=Pl.ps[i];if(!p.on)continue;p.t+=dt;if(p.t>=p.life){p.on=false;Pl.m.setMatrixAt(i,ZM);continue}any=true;
      const P_=p.P;
      if(p.k===2&&p.t<.55){p.a+=p.w*dt;p.rad+=dt*.55;P_.set(p.cx+Math.cos(p.a)*p.rad,p.y0+p.t*.9,p.cz+Math.sin(p.a)*p.rad);
        if(p.t+dt>=.55){p.k=0;p.v.set(-Math.sin(p.a)*p.w*p.rad*.5,1.6,Math.cos(p.a)*p.w*p.rad*.5)}}
      else if(p.k===1){P_.addScaledVector(p.v,dt);p.v.multiplyScalar(1-dt*.8)}
      else if(p.k===3){p.jt-=dt;if(p.jt<=0){p.jt=.12;p.v.x+=rnd(-2,2);p.v.z+=rnd(-2,2);p.v.y=rnd(-.4,1)}P_.addScaledVector(p.v,dt)}
      else{p.v.y-=p.g*dt;if(Pl===flakes){p.v.x*=1-dt*2.2;p.v.z*=1-dt*2.2;if(p.v.y<-1.4)p.v.y=-1.4}P_.addScaledVector(p.v,dt);
        const f=W.floor(P_.x,P_.y+.3,P_.z)+p.s*.5;if(P_.y<f){P_.y=f;p.v.set(p.v.x*.3,0,p.v.z*.3);p.sp.multiplyScalar(.6)}}
      p.r.x+=p.sp.x*dt;p.r.y+=p.sp.y*dt;p.r.z+=p.sp.z*dt;
      const u=p.t/p.life,s=(p.k===1?p.s+(p.s1-p.s)*Math.min(1,u*1.6):p.s)*(u>.75?(1-u)/.25:1);
      _o.position.copy(P_);_o.rotation.set(p.r.x,p.r.y,p.r.z);_o.scale.setScalar(s);_o.updateMatrix();Pl.m.setMatrixAt(i,_o.matrix)}
    Pl.m.instanceMatrix.needsUpdate=true;if(!any)Pl.m.visible=false}
  function step(dt){
    stepPool(blobs,dt);stepPool(flakes,dt);
    for(let i=meshes.length-1;i>=0;i--){const q=meshes[i],o=q.o;q.t+=dt;let done=false;
      if(q.kind==='fried'){
        if(!q.landed){q.vy-=14*dt;q.y+=q.vy*dt;o.rotation.x=Math.min(1,q.t/.6)*Math.PI*2;o.scale.setScalar(Math.min(1,.6+q.t));if(q.y<=q.fl&&q.vy<0){q.y=q.fl;q.landed=true;q.lt=q.t;o.rotation.x=0;o.scale.setScalar(1);
          for(let k=0;k<6;k++)add(blobs,'#ffffff',new V3(o.position.x+rnd(-.3,.3),q.y+.05,o.position.z+rnd(-.3,.3)),{k:1,v:new V3(0,rnd(.4,.8),0),life:rnd(.4,.6),s:.03,s1:.05})}}
        o.position.y=q.y;if(q.t>1.5)o.scale.setScalar(Math.max(0,1-(q.t-1.5)/.3));done=q.t>1.8}
      else{   // the chick: pops out, then runs off in hops, turning away from walls, and is gone in a puff
        if(q.t<.25){q.vy-=14*dt;q.y+=q.vy*dt;o.scale.setScalar(.2+q.t*3.2)}
        else{const sp=3.6*dt,nx=o.position.x+Math.sin(q.d)*sp,nz=o.position.z+Math.cos(q.d)*sp;
          if(W.solid(nx+Math.sin(q.d)*.25,q.fl+.25,nz+Math.cos(q.d)*.25)&&q.turned<4){q.d+=Math.PI/2;q.turned++;o.rotation.y=q.d+Math.PI}
          else{o.position.x=nx;o.position.z=nz;q.fl=W.floor(nx,q.fl+.6,nz)}q.y=q.fl+Math.abs(Math.sin(q.t*14))*.12;o.scale.setScalar(1)}
        o.position.y=q.y;
        if(q.t>1.35){done=true;for(let k=0;k<8;k++)add(blobs,k%2?'#ffd84a':'#fff3c4',new V3(o.position.x,o.position.y+.2,o.position.z),{v:new V3(rnd(-1.5,1.5),rnd(1,2.5),rnd(-1.5,1.5)),life:.45,s:.05,g:6})}}
      if(done){o.visible=false;spare[q.kind].push(o);meshes.splice(i,1)}}
  }
  return {play,step,busy:()=>meshes.length>0||blobs.m.visible||flakes.m.visible,clear(){for(const q of meshes){q.o.visible=false;spare[q.kind].push(q.o)}meshes.length=0;
    for(const Pl of [blobs,flakes]){for(let i=0;i<Pl.n;i++){Pl.ps[i].on=false;Pl.m.setMatrixAt(i,ZM)}Pl.m.instanceMatrix.needsUpdate=true;Pl.m.visible=false}}};
}
let mainFx=null;
const fxMain=()=>mainFx||(mainFx=makeFx({scene:X.scene,floor:(x,y,z)=>X.floorBelow(x,y,z),solid:(x,y,z)=>X.solidAt(x,y,z)}));
// An egg was cracked (index.html's deathFx, with p: where; or a 'died' event that came after its node said so, p null).
// k cracked it: if k wears a crack effect it plays once, where t was.
function cracked(t,k,p){
  const T=now();
  if(p){t._fxT=T;t._fxP=(t._fxP||new V3()).copy(p);t._fxDone=false}
  if(!k||k===t)return;
  const kit=k===X.player?myKit:k.kit;if(!kit||!kit.crack)return;
  if(!p){if(!t._fxP||T-t._fxT>1.2)return;p=t._fxP}
  if(t._fxDone)return;t._fxDone=true;
  const kp=k.pos||null,dir=kp?new V3(p.x-kp.x,0,p.z-kp.z):null;if(dir&&dir.lengthSq()>.01)dir.normalize();
  fxMain().play(kit.crack,p,shardColor(t),dir&&dir.lengthSq()>.5?dir:null);
}

// =====================================================================
//  The Locker's pictures: a small scene of its own, drawn by the game's renderer into an off-screen target and copied
//  into a canvas (only while the Locker is open, and only for a player who may see it)
// =====================================================================
let pv=null;
function eggModel(){
  const g=new THREE.Group(),mat=new THREE.MeshLambertMaterial({map:X.eggTex('#fbf6ea',0)}),body=new THREE.Group();g.add(body);
  const shell=new THREE.Mesh(X.eggGeo,mat);shell.position.y=.72;body.add(shell);
  const face=new THREE.Group();face.position.y=.72;body.add(face);face.add(new THREE.Mesh(X.faceGeos.eyes,X.eyeMat),new THREE.Mesh(X.faceGeos.ink,X.inkMat));
  const gp=new THREE.Group();gp.position.set(.36,.66,-.18);body.add(gp);
  return {g,body,shell,mat,face,gp,gun:null,gunKey:null,stage:0,flash:null,fest:null};
}
function pvInit(){
  if(pv)return pv;const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a7a60,.7),new THREE.AmbientLight(0xffffff,.18));
  const sun=new THREE.DirectionalLight(0xfff1d6,.8);sun.position.set(-2,4,-3);scene.add(sun);
  const cam=new THREE.PerspectiveCamera(30,1,.05,60);
  const egg=eggModel();scene.add(egg.g);
  const gun=new THREE.Group();scene.add(gun);
  const still=new THREE.Mesh(new THREE.BufferGeometry(),X.gunMat);scene.add(still);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(1.1,40),new THREE.MeshLambertMaterial({color:0xf3e3c0}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;scene.add(floor);
  const fx=makeFx({scene,floor:()=>0,solid:(x,y)=>y<0});
  return pv={scene,cam,egg,gun,still,floor,fx,rt:null,buf:null};
}
function pvSet(k,opt){
  const p=pvInit(),m=p.egg;opt=opt||{};
  dress(m,k,true);   // the Locker shows the egg type whatever mode the match behind it is in
  const E=EGGS[k.egg|0];
  m.mat.map=k.egg?eggTexture(k.egg,0):X.eggTex(opt.color||X.myColor,0);
  if(E&&E.emi)m.mat.emissive.setHex(E.emi);else m.mat.emissive.setRGB(0,0,0);
  if(opt.gun){m.gunSkin=k.gun|0;m.gunKey=null;X.setEggGun(m,opt.gun)}else if(m.gun){m.gp.remove(m.gun);m.gun=null;m.gunKey=null}
  m.g.visible=!opt.hideEgg;
}
function pvRender(w,h,cv){
  const p=pvInit(),R=X.renderer;
  if(!p.rt||p.rt.width!==w||p.rt.height!==h){if(p.rt)p.rt.dispose();p.rt=new THREE.WebGLRenderTarget(w,h,{samples:0});p.buf=new Uint8Array(w*h*4)}
  p.cam.aspect=w/h;p.cam.updateProjectionMatrix();
  const cc=R.getClearColor(new THREE.Color()),ca=R.getClearAlpha(),sh=R.shadowMap.enabled;
  R.shadowMap.enabled=false;R.setRenderTarget(p.rt);R.setClearColor(0x000000,0);R.clear();R.render(p.scene,p.cam);R.readRenderTargetPixels(p.rt,0,0,w,h,p.buf);
  R.setRenderTarget(null);R.setClearColor(cc,ca);R.shadowMap.enabled=sh;
  cv=cv||document.createElement('canvas');if(cv.width!==w)cv.width=w;if(cv.height!==h)cv.height=h;
  const g=cv.getContext('2d'),img=g.createImageData(w,h),row=w*4;for(let y=0;y<h;y++)img.data.set(p.buf.subarray((h-1-y)*row,(h-y)*row),y*row);
  g.putImageData(img,0,0);return cv;
}
// the camera for each kind of picture; yaw turns the egg (0: its face, PI: its back)
function pvShot(kind,yaw){
  const p=pvInit(),c=p.cam,m=p.egg;m.g.rotation.y=yaw||0;p.still.visible=kind==='crack';p.floor.visible=kind==='crack'||kind==='big';p.gun.visible=kind==='gun';
  if(kind==='gun'){m.g.visible=false;const b=new THREE.Box3().setFromObject(p.gun),ctr=b.getCenter(new V3()),sz=b.getSize(new V3());const d=Math.max(sz.z,sz.y*1.6)*2.1;
    c.position.set(ctr.x+d,ctr.y+d*.32,ctr.z-d*.18);c.lookAt(ctr)}
  else if(kind==='hat'){c.position.set(-.85,1.75,-2.45);c.lookAt(0,1.0,0)}
  else if(kind==='crack'){c.position.set(-1.6,1.9,-3.2);c.lookAt(0,.35,0)}
  else if(kind==='big'){c.position.set(-1.15,1.35,-3.3);c.lookAt(0,.86,0)}
  else{c.position.set(-.8,1.05,-2.75);c.lookAt(0,.72,0)}
}
// A still picture of each crack effect for its tile
function crackStill(n){const L=[];
  if(n===1){L.push({g:fried(),c:null,m:new THREE.Matrix4()});}
  else if(n===2){const cols=[0xffd84a,0xffe27a,0xfff3c4,0xf4c430];for(let i=0;i<26;i++){const a=i*.9,r=.12+i*.012;P(L,'ico',cols[i%4],Math.cos(a)*r,.25+i*.025,Math.sin(a)*r,.06,.06,.06,i,i*2,0)}}
  else if(n===3){L.push({g:chick(),c:null,m:new THREE.Matrix4().makeRotationY(-2.4)});for(const s of [-1,1])P(L,'sph',0xfffdf8,.4*s,.06,.25,.13,.07,.13,s*.6,0,0)}
  else if(n===4){const cols=[0xff5c8a,0x58b4ff,0xffd23f,0x36b37e,0xb46cff,0xff8a3d];for(let i=0;i<40;i++){const a=i*2.4,r=.1+(i%7)*.08;L.push({g:flakeGeo,c:cols[i%6],m:X.partM(Math.cos(a)*r,.2+(i*37%40)/40*1.1,Math.sin(a)*r,1.6,1.6,1.6,i,i*1.7,i*.3)})}}
  else if(n===5){const cols=[0xa3b85e,0x8fa04a,0xc3d27a];for(let i=0;i<8;i++){const a=i*.8;P(L,'ico',cols[i%3],Math.cos(a)*.2,.35+i*.11,Math.sin(a)*.2,.15+i*.02,.15+i*.02,.15+i*.02,i,i,0)}
    for(const [x,y] of [[.35,1.05],[-.3,.85]]){P(L,'sph',0x262624,x,y,0,.035,.03,.045);for(const s of [-1,1])P(L,'sph',0xe8f0f6,x+s*.03,y+.025,0,.035,.01,.02,0,0,s*.5)}}
  if(!L.length)return new THREE.BufferGeometry();
  // fried() and chick() already carry colours: join them with the rest
  const own=L.filter(q=>q.c==null),rest=L.filter(q=>q.c!=null);let g=rest.length?X.mergeParts(rest):null;
  for(const q of own){const c=q.g.clone();c.applyMatrix4(q.m);g=g?join(g,c):c}return g;
}
const thumbs=new Map();
function thumb(slot,no){
  const key=slot+':'+no+':'+(slot==='gun'?X.loadout:'')+(slot==='egg'&&!no?X.myColor:'');if(thumbs.has(key))return thumbs.get(key);
  const p=pvInit(),k=parse('');
  if(slot==='egg'){k.egg=no;pvSet(k);pvShot('egg',.5)}
  else if(slot==='hat'){k.hat=no;pvSet(k);pvShot('hat',.6)}
  else if(slot==='gun'){pvSet(k);p.gun.clear();const gm=X.buildGun(X.loadout,false,no);p.gun.add(gm);pvShot('gun')}
  else{pvSet(k,{hideEgg:true});p.still.geometry.dispose();p.still.geometry=crackStill(no);if(!no){p.egg.g.visible=true}pvShot('crack')}
  const url=pvRender(160,160).toDataURL();thumbs.set(key,url);if(slot==='gun')p.gun.clear();return url;
}

// =====================================================================
//  The Locker screen (made here, only for a player who may see it: nobody else's menu changes)
// =====================================================================
const TABS=[['egg','Eggs'],['hat','Hats'],['gun','Gun skins'],['crack','Cracks']];
const RAR={common:'#7d8ea3',rare:'#2f7fe8',epic:'#9b4fe8',legendary:'#d98a0b'};
let ui=null,tab='egg',spin=0,pvT=0,playT=-1;
function items(slot){const C=cat();if(C)return C.gameItems(GAME,slot);const out=[];for(let i=1;i<=N[slot];i++)out.push({no:i,name:slot+' '+i,rarity:'common',desc:''});return out}
function css(){
  const st=document.createElement('style');st.id='kitCss';st.textContent=`
#kitRow{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}
#kitRow .btn{font-size:18px;padding:8px 16px}
#kitRow small{font-weight:700;color:var(--ink-2);font-size:13px;line-height:1.3;flex:1;min-width:140px}
#kitLocker{z-index:5}
#kitLocker .kit-card{width:min(900px,100%);max-height:calc(100vh - 44px);max-height:calc(100dvh - 44px);display:flex;flex-direction:column;gap:10px;padding:16px 18px}
.kit-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.kit-head h2{font-family:var(--f-d);font-weight:400;font-size:34px;line-height:1;margin:0;color:var(--yolk);-webkit-text-stroke:2px var(--ink);paint-order:stroke fill;text-shadow:0 3px 0 var(--ink)}
.kit-head .seg{flex:1;min-width:0}
.kit-head .kit-x{margin-left:auto;font-size:18px;padding:7px 14px}
.kit-body{display:grid;grid-template-columns:minmax(0,270px) minmax(0,1fr);gap:14px;min-height:0;flex:1 1 auto}
.kit-pv{display:flex;flex-direction:column;gap:8px;min-height:0}
.kit-stage{position:relative;border:3px solid var(--ink);border-radius:16px;background:radial-gradient(circle at 50% 38%,#fffdf6,#ffe9b0 70%,#ffd27a);overflow:hidden;aspect-ratio:1;width:100%}
.kit-stage canvas{position:absolute;inset:0;width:100%;height:100%}
.kit-info{font-weight:700;font-size:14px;line-height:1.35;color:var(--ink-2);margin:0;min-height:2.7em}
.kit-info b{color:var(--ink);font-weight:900}
.kit-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px;overflow:auto;align-content:start;padding:4px 6px 10px 2px;min-height:0}
.kit-tile{display:flex;flex-direction:column;align-items:center;gap:1px;border:3px solid var(--ink);border-radius:12px;background:#fff;padding:3px 3px 6px;box-shadow:0 3px 0 var(--ink);font-weight:800;font-size:12.5px;line-height:1.15;text-align:center;color:var(--ink)}
.kit-tile img{width:100%;aspect-ratio:1;display:block;border-radius:8px;background:radial-gradient(circle at 50% 40%,#fffdf6,#fbeccb)}
.kit-tile i{font-style:normal;font-size:10px;font-weight:900;color:var(--rc);text-transform:uppercase;letter-spacing:.06em}
.kit-tile[aria-pressed="true"]{background:#fff3c4;outline:3px solid var(--yolk-2);outline-offset:1px}
.kit-tile:hover{background:#fffaf0}
.kit-note{margin:0;font-size:12.5px;font-weight:700;color:var(--ink-2)}
@media (max-width:640px){
  #kitLocker{padding:10px 8px}
  #kitLocker .kit-card{padding:12px;max-height:calc(100dvh - 20px)}
  .kit-head h2{font-size:28px}
  .kit-head .seg{order:3;flex-basis:100%}
  .kit-head .seg button{padding:7px 4px;font-size:14px}
  .kit-body{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}
  .kit-pv{flex-direction:row;align-items:center;gap:10px}
  .kit-stage{width:150px;flex:0 0 150px}
  .kit-info{min-height:0;font-size:13px}
  .kit-grid{grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:6px}
}
@media (max-height:520px) and (min-width:641px){
  #kitLocker{padding:8px}
  #kitLocker .kit-card{padding:10px 12px;gap:6px;max-height:calc(100dvh - 16px)}
  .kit-head h2{font-size:24px}
  .kit-head .seg button{padding:6px 8px;font-size:14px}
  .kit-head .kit-x{padding:5px 12px;font-size:16px}
  .kit-body{grid-template-columns:minmax(0,190px) minmax(0,1fr);gap:10px}
  .kit-info{font-size:12px;min-height:0}
  .kit-note{display:none}
  .kit-grid{grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px}
}`;document.head.appendChild(st);
}
function build(){
  if(ui)return ui;css();
  const row=document.createElement('div');row.id='kitRow';
  row.innerHTML='<button class="btn alt" id="kitOpen" type="button">Locker</button><small>Egg types, hats, gun skins and crack effects. Captains only for now.</small>';
  const sw=$('swatches');sw.insertAdjacentElement('afterend',row);
  const sec=document.createElement('section');sec.id='kitLocker';sec.className='overlay center';sec.hidden=true;sec.setAttribute('role','dialog');sec.setAttribute('aria-label','Locker');
  sec.innerHTML='<div class="card kit-card"><div class="kit-head"><h2>Locker</h2><div class="seg" id="kitTabs" role="group" aria-label="Locker section">'+
    TABS.map(t=>'<button type="button" data-t="'+t[0]+'">'+t[1]+'</button>').join('')+'</div><button class="btn alt kit-x" id="kitClose" type="button">Done</button></div>'+
    '<div class="kit-body"><div class="kit-pv"><div class="kit-stage"><canvas id="kitCv" width="300" height="300" aria-hidden="true"></canvas></div><p class="kit-info" id="kitInfo"></p></div>'+
    '<div class="kit-grid" id="kitGrid" role="group" aria-label="Items"></div></div>'+
    '<p class="kit-note">Everything is free to wear while the Locker is captains only. Looks only: every egg is the same size with the same hit box, and in capture the flag eggs keep their team colour.</p></div>';
  $('menu').insertAdjacentElement('afterend',sec);
  $('kitOpen').addEventListener('click',open);$('kitClose').addEventListener('click',close);
  sec.addEventListener('click',e=>{if(e.target===sec)close()});
  sec.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
  $('kitTabs').addEventListener('click',e=>{const t=e.target.dataset&&e.target.dataset.t;if(t){tab=t;draw()}});
  return ui={row,sec};
}
function info(slot,no){const it=no?items(slot).find(i=>i.no===no):null;const el=$('kitInfo');el.textContent='';
  const b=document.createElement('b');b.textContent=it?it.name:'Plain';el.append(b,document.createTextNode(' '+(it?it.desc:slot==='egg'?'Your own shell colour.':slot==='crack'?'Just the usual crack.':slot==='gun'?'The gun as it comes.':'No hat.')))}
function draw(){
  if(!ui)return;for(const b of $('kitTabs').children)b.setAttribute('aria-pressed',String(b.dataset.t===tab));
  const grid=$('kitGrid');grid.textContent='';const worn=myKit[tab]|0;
  const list=[{no:0,name:'Plain',rarity:''}].concat(items(tab));
  for(const it of list){const b=document.createElement('button');b.type='button';b.className='kit-tile';b.setAttribute('aria-pressed',String(it.no===worn));b.title=it.desc||'';
    const img=document.createElement('img');img.alt='';img.src=thumb(tab,it.no);const n=document.createElement('span');n.textContent=it.name;b.append(img,n);
    if(it.rarity){const r=document.createElement('i');r.style.setProperty('--rc',RAR[it.rarity]||'#7d8ea3');r.textContent=it.rarity;b.append(r)}
    b.addEventListener('click',()=>{wear(tab,it.no);draw();if(tab==='crack'&&it.no)playT=0});grid.appendChild(b)}
  info(tab,worn);bigPv(true);
}
function bigPv(force){
  if(!ui||ui.sec.hidden)return;const cv=$('kitCv'),r=Math.min(2,devicePixelRatio||1),w=Math.max(160,Math.round(cv.clientWidth*r))||300;
  const p=pvInit();if(force){pvSet(myKit,{gun:X.loadout});p.still.visible=false}
  const playing=playT>=0;pvShot('big',playing?.4:.5+spin);p.still.visible=false;p.floor.visible=true;p.gun.visible=false;
  p.egg.g.visible=!playing;pvRender(w,w,cv);
}
function open(){if(!X.on)return;build();ui.sec.hidden=false;spin=0;playT=-1;draw();const f=$('kitGrid').querySelector('[aria-pressed="true"]');if(f)f.focus({preventScroll:false})}
function close(){if(!ui)return;ui.sec.hidden=true;playT=-1;if(pv)pv.fx.clear();X.vmRefresh();const b=$('kitOpen');if(b)b.focus()}
// Called by index.html when who may see the Locker may have changed, and once when this file arrives.
function access(){
  refreshMine();
  if(X.on){build();ui.row.hidden=false}
  else if(ui){ui.row.hidden=true;if(!ui.sec.hidden)close()}
}
let fxT=0;
function update(dt){
  const T=now();
  for(const e of X.ents){const m=e.model;if(!m||!m.kit)continue;if(m._ctf!==!!X.ctf)dress(m,m.kit);if(m.flies&&m.g.visible){m.flies.rotation.y=T*2.4;m.flies.position.y=Math.sin(T*5)*.03}}
  if(mainFx)mainFx.step(dt);
  if(ui&&!ui.sec.hidden&&X.state==='menu'){
    spin+=dt*.5;pvT+=dt;
    if(playT>=0){if(playT===0){pvInit().fx.play(myKit.crack,new V3(0,0,0),'#fbf6ea',new V3(.6,0,-.8).normalize())}playT+=dt;pv.fx.step(dt);if(playT>1.9){playT=-1;pv.fx.clear()}bigPv();pvT=0}
    else if(pvT>1/24){pvT=0;bigPv()}
  }
  if(ui&&!ui.sec.hidden&&X.state!=='menu')close();
}

// =====================================================================
//  Test hook (automated browsers only): contact sheets of every item drawn by the real code
// =====================================================================
if(navigator.webdriver)window.__kit={parse,wireOf,wear,get mine(){return Object.assign({},myKit)},get wire(){return myWire},N,EGGS,HATS,SKINS,open,close,thumbs,fxMain,cracked,gunGeo,
  // one picture of every item in a slot: eggs and hats front and back, gun skins on the given gun from both sides,
  // crack effects at three moments of the real effect
  sheet(slot,opt){opt=opt||{};const n=N[slot],cell=opt.cell||220,cols=slot==='crack'?3:opt.cols||(slot==='gun'?4:8),p=pvInit();
    const shots=[];for(let i=0;i<=n;i++){
      if(slot==='egg'||slot==='hat'){for(const yaw of [.5,Math.PI+.4]){const k=parse('');k[slot]=i;pvSet(k);pvShot(slot,yaw);shots.push([pvRender(cell,cell),(i?items(slot)[i-1].name:'Plain')+(yaw>1?' (back)':'')])}}
      else if(slot==='gun'){const key=opt.key||'beater';for(const side of [1,-1]){const k=parse('');pvSet(k);p.gun.clear();p.gun.add(X.buildGun(key,false,i));pvShot('gun');if(side<0){const c=p.cam,b=new THREE.Box3().setFromObject(p.gun).getCenter(new V3());c.position.x=2*b.x-c.position.x;c.position.z=b.z-(c.position.z-b.z);c.lookAt(b)}
        shots.push([pvRender(cell*1.4|0,cell),(i?items('gun')[i-1].name:'Plain')+(side<0?' (left)':'')]);p.gun.clear()}}
      else if(i){for(const t of [.2,.55,1.0]){const k=parse('');pvSet(k,{hideEgg:true});p.fx.clear();p.fx.play(i,new V3(0,0,0),'#fbf6ea',new V3(1,0,0));let s=0;while(s<t){p.fx.step(1/60);s+=1/60}
        pvShot('crack');p.still.visible=false;p.egg.g.visible=false;shots.push([pvRender(cell,cell),items('crack')[i-1].name+' '+t+'s'])}p.fx.clear()}}
    const w=shots[0][0].width,h=shots[0][0].height+22,rows=Math.ceil(shots.length/cols),out=document.createElement('canvas');out.width=cols*w;out.height=rows*h;
    const g=out.getContext('2d');g.fillStyle='#fff6df';g.fillRect(0,0,out.width,out.height);g.font='700 14px sans-serif';g.fillStyle='#2b1a10';g.textAlign='center';
    shots.forEach(([cv,label],j)=>{const x=(j%cols)*w,y=Math.floor(j/cols)*h;g.drawImage(cv,x,y);g.fillText(label,x+w/2,y+h-6)});
    return out.toDataURL('image/png')}};

return {wire:()=>myWire,mySkin:()=>myKit.gun|0,heard,gunGeo,shellTex,shardColor,cracked,update,access,open,close};
};
