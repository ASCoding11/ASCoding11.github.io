/*
 * Tumble Trials: the Closet. HIDDEN (captains only for now: CLOSET_PUBLIC and closetOn() in index.html).
 *
 * index.html fetches this file only when something needs it: this player may open the Closet (a captain's account,
 * CLOSET_PUBLIC or the test address ?closet=1), or a player in the room wears a kit. Players with everything off never
 * load it. The page calls window.TumbleCloset(G) once, where G is the short list of things it lends (closetApi() in
 * index.html: three.js, the scene, the bean's size and skin painters, the effects and the sound helpers), and gets back
 * the hooks it calls: dress() when a bean is made or a kit changes, repaint() when a bean's look changes, tick() every
 * frame for a bean that wears a kit, splash() when one is knocked out, frame() and cam() for the Closet's own preview,
 * and menu() to show or hide the Closet button.
 *
 * A kit is ten item numbers [colour, premium colour, pattern, underpants, hat, face, costume, victory dance, fall scream,
 * knockout splash], 0 for none; the numbers are the `no` of Tumble Trials' items in ../cosmetics.js, which also holds
 * their rarity and a line of text. What a number LOOKS like is decided here: the lists below are in number order and
 * their names and two colours match cosmetics.js. A number this file does not know draws nothing (the bean's own look),
 * so an older copy copes with newer items. Never reorder a list: add new ones at the end, and add the item with the same
 * number to cosmetics.js.
 *
 * How it is drawn, and what it costs: colours, premium colours, patterns, underpants, faces and the costumes' paint go
 * on the bean's own skin canvas (the one the face is already painted on), so they cost nothing to draw. A hat, the
 * undies on the head or a costume's shape is ONE extra mesh per bean (merged pieces with vertex colours, one geometry
 * per item shared by every bean wearing it, one material for all of them); the propeller beanie adds its spinning
 * propeller and the fishbowl and the astronaut's bubble a see-through part (one more each). A hat or a costume hides the
 * Turkey Week pilgrim hat, so during that week it costs nothing extra. The premium colours give the bean its own
 * material (still one draw call); the rainbow repaints its skin five times a second. Dances, screams and splashes use
 * the page's own pose, sound and particle code. Nothing here touches the physics, the collider, the show or the room:
 * a costume is drawn around the same body, which keeps its size and hitbox, and the face always shows.
 */
window.TumbleCloset=function(G){
'use strict';
const THREE=G.THREE,V3=THREE.Vector3,TAU=Math.PI*2;
const {RAD,BODY_H,SKIN_W:W,SKIN_H:H,PXU,PXV,clamp,lerp,rand,pick,shade}=G;
const $=id=>document.getElementById(id);
const SLOTS=['colour','premium','pattern','pants','hat','face','costume','dance','scream','splash'];
const TABS=['Colours','Premium','Patterns','Undies','Hats','Faces','Costumes','Dances','Screams','Splashes'];

// =====================================================================
//  Painting on the skin canvas. ux is the distance round the body from the front (0 is the middle of the face,
//  ±RAD·π the back), y the height up the body (0 the bottom, BODY_H the top), as in index.html's drawSkin.
// =====================================================================
const U=ux=>W/2+ux*PXU,V=y=>H*(1-y/BODY_H),AR=PXV/PXU,SIDE=RAD*Math.PI/2;
const ell=(x,cx,cy,rx,ry,rot)=>{x.beginPath();x.ellipse(cx,cy,Math.max(.1,rx),Math.max(.1,ry),rot||0,0,TAU)};
const dot=(x,cx,cy,r)=>{ell(x,cx,cy,r,r*AR);x.fill()};
// draw something near the back seam twice, so it continues round the body
const wrap=(cx,f,m)=>{m=m||70;f(cx);if(cx<m)f(cx+W);if(cx>W-m)f(cx-W)};
function blob(x,cx,cy,r,R,sq){
  const n=9,p=[];for(let i=0;i<n;i++){const a=i/n*TAU,k=.62+R()*.6;p.push([cx+Math.cos(a)*r*k,cy+Math.sin(a)*r*k*(sq||AR)])}
  x.beginPath();x.moveTo((p[0][0]+p[n-1][0])/2,(p[0][1]+p[n-1][1])/2);
  for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n];x.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2)}x.fill();
}
function heart(x,cx,cy,s){x.beginPath();x.moveTo(cx,cy+s*.9);x.bezierCurveTo(cx-s*1.5,cy-s*.1,cx-s*.7,cy-s*1.2,cx,cy-s*.45);x.bezierCurveTo(cx+s*.7,cy-s*1.2,cx+s*1.5,cy-s*.1,cx,cy+s*.9);x.fill()}
function starAt(x,cx,cy,r){x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*AR)}x.closePath();x.fill()}
const lum=h=>{const n=parseInt(h.slice(1),16);return((n>>16&255)*.3+(n>>8&255)*.59+(n&255)*.11)/255};
// the second colour of a pattern: the look's pattern colour, unless it is (nearly) the body colour
const second=(c,pc)=>Math.abs(lum(c)-lum(pc))<.12?(lum(c)>.5?shade(c,-.45):shade(c,.6)):pc;
// a soft round shine, so plain colours still look like a bean and not a flat sticker
function sheen(x,a){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(255,255,255,'+a+')');g.addColorStop(.45,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(36,22,63,'+a*.8+')');x.fillStyle=g;x.fillRect(0,0,W,H)}

// ---------- colours (1-10): [name, colour, shop picture colour 2] ----------
const COLOURS=[
  ['Red','#ff3b3b','#ffd0d0'],['Orange','#ff8a1f','#ffe0bf'],['Yellow','#ffd93d','#fff6c9'],['Lime','#9be84a','#e5ffc9'],
  ['Teal','#19b3a6','#c4f3ee'],['Sky Blue','#6cc8ff','#dff3ff'],['Purple','#9b5cff','#e6d8ff'],['Pink','#ff7ac3','#ffe0f1'],
  ['White','#f7f7fb','#c9c6d8'],['Black','#34323c','#8a8798']   // black is a soft charcoal, so the face and name tag still stand out
];

// ---------- premium colours (1-6): [name, c1, c2, paint(x, base, t), limb colour, material kind] ----------
const PREMIUM=[
  ['Gold','#f5c43a','#fff0a0',x=>{
    const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#fff3b0');g.addColorStop(.35,'#f7cf4a');g.addColorStop(.7,'#d9a21c');g.addColorStop(1,'#9c6f08');x.fillStyle=g;x.fillRect(0,0,W,H);
    x.fillStyle='rgba(255,255,230,.45)';for(let i=0;i<8;i++){x.beginPath();const x0=i*W/8;x.moveTo(x0,0);x.lineTo(x0+14,0);x.lineTo(x0+14-60,H);x.lineTo(x0-60,H);x.fill()}
  },'#f0bd2e','gold'],
  ['Chrome','#c9d1da','#ffffff',x=>{
    const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#eef6ff');g.addColorStop(.3,'#c4d4e6');g.addColorStop(.46,'#ffffff');g.addColorStop(.5,'#5b6470');g.addColorStop(.72,'#9aa6b4');g.addColorStop(1,'#cdd5de');x.fillStyle=g;x.fillRect(0,0,W,H);
    x.fillStyle='rgba(255,255,255,.55)';for(const u of [.12,.62])wrap(u*W,X=>{x.fillRect(X,0,10,H)});
  },'#c3ccd6','chrome'],
  ['Glow in the Dark','#b8ffc4','#3cff7a',x=>{x.fillStyle='#c9ffd2';x.fillRect(0,0,W,H);x.fillStyle='rgba(120,255,160,.5)';const R=G.rng(21);for(let i=0;i<26;i++)wrap(R()*W,X=>dot(x,X,R()*H,4+R()*7))},'#b8ffc4','glow'],
  ['See-through Jelly','#ff9ad5','#ffffff',(x,c)=>{
    x.fillStyle=shade(c,.3);x.fillRect(0,0,W,H);x.fillStyle='rgba(255,255,255,.55)';const R=G.rng(33);
    for(let i=0;i<18;i++)wrap(R()*W,X=>{const y=H*.25+R()*H*.7,r=3+R()*6;x.beginPath();x.ellipse(X,y,r,r*AR,0,0,TAU);x.fill()});
    x.fillStyle='rgba(255,255,255,.35)';for(const u of [.3,.8])wrap(u*W,X=>{x.fillRect(X,H*.15,16,H*.6)});
  },null,'jelly'],
  ['Rainbow Shift','#ff5c5c','#5cc8ff',(x,c,t)=>{
    const h=(t*24)%360,g=x.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'hsl('+((h+40)%360)+',90%,68%)');g.addColorStop(.5,'hsl('+h+',88%,62%)');g.addColorStop(1,'hsl('+((h+320)%360)+',85%,55%)');x.fillStyle=g;x.fillRect(0,0,W,H);
  },null,'rainbow'],
  ['Bubblegum Sprinkles','#ff9ccc','#ffe14d',x=>{
    x.fillStyle='#ff9ccc';x.fillRect(0,0,W,H);const R=G.rng(77),S=['#ffffff','#ffe14d','#4fc3ff','#7ee06a','#b07cff','#ff8a3d','#ff4f9a'];
    for(let i=0;i<170;i++){const cx=R()*W,cy=R()*H,a=R()*Math.PI;x.fillStyle=S[i%S.length];wrap(cx,X=>{x.save();x.translate(X,cy);x.rotate(a);x.beginPath();x.roundRect?x.roundRect(-6,-2,12,4,2):x.rect(-6,-2,12,4);x.fill();x.restore()},20)}
  },'#ff9ccc','gum']
];

// ---------- patterns (1-9): [name, c1, c2, paint(x, base colour, pattern colour)] ----------
const PATTERNS=[
  ['Polka Dots','#ff4f9a','#ffffff',(x,c,pc)=>{x.fillStyle=second(c,pc);for(let r=0;r<10;r++)for(let i=0;i<12;i++)wrap((i+(r%2)*.5)*W/12,X=>dot(x,X,r*H/8.6+6,12))}],
  ['Stripes','#2ec5ff','#ffffff',(x,c,pc)=>{x.fillStyle=second(c,pc);const p=W/12;for(let i=-6;i<18;i++){x.beginPath();x.moveTo(i*p,0);x.lineTo(i*p+p*.45,0);x.lineTo(i*p+p*.45-H*.55,H);x.lineTo(i*p-H*.55,H);x.fill()}}],
  ['Cow Print','#fbfaf5','#1c1a20',x=>{x.fillStyle='#fbfaf5';x.fillRect(0,0,W,H);const R=G.rng(5);x.fillStyle='#1c1a20';
    for(let i=0;i<22;i++){const cx=(i+R()*.6)*W/22,cy=R()*H,r=14+R()*20;wrap(cx,X=>blob(x,X,cy,r,G.rng(i*7+1)),70)}
    x.fillStyle='#ffb3c7';x.fillRect(0,V(.12),W,H-V(.12))},'#fbfaf5'],
  ['Tie-Dye','#ff5cc8','#4fd8ff',x=>{
    for(const [cx,cy,ph] of [[0,H*.55,0],[W,H*.55,0],[W/2,H*.7,1.7]]){
      for(let k=14;k>=1;k--){const r=k*22,hue=(k*41+ph*90)%360;x.fillStyle='hsl('+hue+',92%,'+(60+(k%2)*8)+'%)';x.beginPath();
        for(let i=0;i<=48;i++){const a=i/48*TAU,rr=r*(1+.13*Math.sin(5*a+k*.9+ph));x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*AR)}x.fill()}
    }},'#ff5cc8'],
  ['Checkerboard','#ffffff','#24163f',(x,c,pc)=>{x.fillStyle=second(c,pc);const s=W/16,sh=s*AR;for(let r=0;r*sh<H;r++)for(let i=0;i<16;i++)if((i+r)%2)x.fillRect(i*s,r*sh,s,sh)}],
  ['Leopard','#e9b35c','#3b2416',x=>leopard(x,'#e9b35c',1),'#e9b35c'],
  ['Camo','#6f7f45','#2f3a1f',x=>{x.fillStyle='#6f7f45';x.fillRect(0,0,W,H);const R=G.rng(9),C=['#4b5a2c','#a39463','#2f3a1f','#8a9a58'];
    for(let i=0;i<34;i++){const cx=R()*W,cy=R()*H,r=16+R()*22;x.fillStyle=C[i%4];wrap(cx,X=>blob(x,X,cy,r,G.rng(i*13+3),AR*.8),60)}},'#6f7f45'],
  ['Plaid','#d9312b','#1f3b73',(x,c,pc)=>{const p=second(c,pc),s=W/8;x.globalAlpha=.5;x.fillStyle=p;
    for(let i=0;i<8;i++)x.fillRect(i*s+s*.3,0,s*.4,H);for(let y=0;y<H;y+=s*AR)x.fillRect(0,y+s*AR*.3,W,s*AR*.4);
    x.globalAlpha=.35;x.fillStyle='#ffffff';for(let i=0;i<8;i++)x.fillRect(i*s+s*.85,0,3,H);for(let y=0;y<H;y+=s*AR)x.fillRect(0,y+s*AR*.85,W,3);x.globalAlpha=1}],
  ['Watermelon','#ff5d6c','#3f9a3a',x=>{
    x.fillStyle='#ff5d6c';x.fillRect(0,0,W,H);
    x.fillStyle='#f4ffe6';x.fillRect(0,V(.5),W,H-V(.5));
    x.fillStyle='#3f9a3a';x.fillRect(0,V(.4),W,H-V(.4));
    x.strokeStyle='#1f6a28';x.lineWidth=9;for(let i=0;i<12;i++){x.beginPath();for(let k=0;k<=8;k++){const y=V(.4)+(H-V(.4))*k/8;x.lineTo(i*W/12+Math.sin(k*1.4+i)*6,y)}x.stroke()}
    x.fillStyle='#1c1a20';const R=G.rng(4);for(let i=0;i<30;i++){const cx=R()*W,cy=V(.6+R()*.95);wrap(cx,X=>{ell(x,X,cy,4,8,R()*.6-.3);x.fill()},10)}
  },'#3f9a3a']
];
function leopard(x,base,k){
  x.fillStyle=base;x.fillRect(0,0,W,H);const R=G.rng(17);
  for(let i=0;i<70;i++){const cx=R()*W,cy=R()*H,r=(9+R()*5)*k;wrap(cx,X=>{
    x.fillStyle='#c98a3a';ell(x,X,cy,r*.7,r*.7*AR);x.fill();
    x.strokeStyle='#3b2416';x.lineWidth=4.5*k;x.lineCap='round';
    for(let j=0;j<4;j++){const a=j*TAU/4+R()*.6;x.beginPath();x.ellipse(X,cy,r,r*AR,0,a,a+.95);x.stroke()}
  },30)}
}

// ---------- underpants (1-9): [name, c1, c2, cut, base, band, print] ----------
// Painted on the lower body, like the patterns, so they fit every pose and cost nothing to draw. Cuts: briefs (high
// leg holes at the hips), boxers (low, short legs), long johns (everything below the face, arms too), the diaper.
// The ninth pair is worn on the head instead (a mesh, see HEAD_UNDIES).
const PANTS=[
  ['Heart Boxers','#fff4f7','#ff3b5c','boxers','#fff4f7','#ff8fb3',o=>{o.fillStyle='#ff3b5c';const R=G.rng(3);for(let i=0;i<26;i++){const cx=R()*W,cy=V(.04+R()*.5);wrap(cx,X=>heart(o,X,cy,7),12)}}],
  ['Tighty Whities','#fbfbf8','#6b8bd6','briefs','#fbfbf8','#e8e8ef',o=>{o.strokeStyle='rgba(120,120,140,.45)';o.lineWidth=2.5;o.beginPath();o.moveTo(U(-.12),V(.4));o.quadraticCurveTo(U(0),V(.16),U(.12),V(.4));o.stroke()},'#6b8bd6'],
  ['Polka Dot Briefs','#7cc8ff','#ffffff','briefs','#7cc8ff','#ffffff',o=>{o.fillStyle='#ffffff';for(let r=0;r<4;r++)for(let i=0;i<14;i++)wrap((i+(r%2)*.5)*W/14,X=>dot(o,X,V(.06+r*.12),6))}],
  ['Banana Boxers','#9fe8c4','#ffd84a','boxers','#9fe8c4','#ffd84a',o=>{const R=G.rng(8);for(let i=0;i<20;i++){const cx=R()*W,cy=V(.06+R()*.46),a=R()*TAU;wrap(cx,X=>{
    o.save();o.translate(X,cy);o.rotate(a);o.strokeStyle='#ffd84a';o.lineWidth=5;o.lineCap='round';o.beginPath();o.arc(0,-6,10,.5,Math.PI-.5);o.stroke();o.fillStyle='#6b4a1f';o.fillRect(-9,-1,3,3);o.restore()},16)}}],
  ['Leopard Print','#e9b35c','#3b2416','briefs','#e9b35c','#3b2416',o=>{const c=document.createElement('canvas');c.width=W;c.height=H;leopard(c.getContext('2d'),'#e9b35c',.7);o.drawImage(c,0,0)}],
  ['Long Johns','#d9312b','#f2e6c9','johns','#d9312b',null,o=>{
    o.fillStyle='#f2e6c9';for(const y of [.82,.66,.5])dot(o,U(0),V(y),6);
    // the flap at the back, with its two buttons
    o.fillStyle='#b8241f';o.strokeStyle='#7a1712';o.lineWidth=3;for(const X of [0,W]){o.beginPath();o.rect(X-.24*PXU,V(.46),.48*PXU,V(.12)-V(.46));o.fill();o.stroke()}
    o.fillStyle='#f2e6c9';for(const X of [0,W])for(const s of [-1,1])dot(o,X+s*.14*PXU,V(.4),5)},null,'#d9312b'],
  ['Diaper','#ffffff','#9fd8ff','diaper','#ffffff','#f1f4f8',o=>{
    o.fillStyle='rgba(159,216,255,.8)';const R=G.rng(12);for(let i=0;i<22;i++){const cx=R()*W,cy=V(.05+R()*.38);wrap(cx,X=>starAt(o,X,cy,5),8)}
    o.fillStyle='#9fd8ff';o.strokeStyle='#5aa9dc';o.lineWidth=2;for(const s of [-1,1]){o.beginPath();o.rect(U(s*SIDE)-14,V(.47),28,V(.36)-V(.47));o.fill();o.stroke()}}],
  ['Super Undies','#e8282b','#ffd23f','briefs','#e8282b','#ffd23f',o=>{o.fillStyle='#ffd23f';starAt(o,U(0),V(.33),17);for(const X of [0,W])starAt(o,X,V(.3),13)}],
  ['Undies on Head','#fbfbf8','#6b8bd6',null]
];
const HEAD_UNDIES=9;
const CUT={briefs:{top:.5,hole:[.42,.36]},boxers:{top:.56,hole:[.2,.1]},diaper:{top:.5,hole:[.3,.26]},johns:{top:.9,hole:null}};
let off=null;
function paintPants(x,p){
  const cut=CUT[p[3]];if(!cut)return;
  if(!off){off=document.createElement('canvas');off.width=W;off.height=H}
  const o=off.getContext('2d');o.clearRect(0,0,W,H);o.globalCompositeOperation='source-over';
  o.fillStyle=p[4];o.fillRect(0,V(cut.top),W,H-V(cut.top));
  if(cut.hole){o.globalCompositeOperation='destination-out';for(const s of [-1,1]){ell(o,U(s*SIDE),H,cut.hole[0]*PXU,cut.hole[1]/BODY_H*H);o.fill()}}
  o.globalCompositeOperation='source-atop';
  if(p[6])p[6](o);
  if(p[3]==='boxers'){o.strokeStyle='rgba(36,22,63,.3)';o.lineWidth=2.5;o.beginPath();o.moveTo(U(0),V(.5));o.lineTo(U(0),V(.14));o.stroke();o.fillStyle='rgba(36,22,63,.35)';dot(o,U(0),V(.42),3);dot(o,U(0),V(.32),3)}
  if(p[3]==='diaper'){const g=o.createLinearGradient(0,V(.5),0,H);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(150,170,200,.35)');o.fillStyle=g;o.fillRect(0,0,W,H)}
  // the waistband, with its elastic stitching (long johns have none)
  if(p[5]){const y0=V(cut.top),y1=V(cut.top-.07);o.fillStyle=p[5];o.fillRect(0,y0,W,y1-y0);o.fillStyle=p[7]||'rgba(36,22,63,.28)';o.fillRect(0,y0+3,W,2);o.fillRect(0,y1-5,W,2)}
  // a little shade at the edges so it sits on the body rather than in it
  const g=o.createLinearGradient(0,V(cut.top),0,H);g.addColorStop(0,'rgba(36,22,63,0)');g.addColorStop(1,'rgba(36,22,63,.22)');o.fillStyle=g;o.fillRect(0,0,W,H);
  o.globalCompositeOperation='source-over';
  x.save();x.shadowColor='rgba(36,22,63,.35)';x.shadowBlur=4;x.drawImage(off,0,0);x.restore();
}

// ---------- faces (1-6): drawn over the bean's own face. [name, c1, c2, paint] ----------
const EYE=[[U(-.1),V(1.15)],[U(.1),V(1.15)]],MOUTH=[U(0),V(1.02)];
const FACES=[
  ['Mustache','#5a3a22','#fff8ee',x=>{const cx=MOUTH[0],cy=V(1.07);x.fillStyle='#5a3a22';
    for(const s of [-1,1]){x.beginPath();x.moveTo(cx,cy-3);x.bezierCurveTo(cx+s*14,cy-13,cx+s*34,cy-7,cx+s*44,cy-15);x.bezierCurveTo(cx+s*52,cy-21,cx+s*50,cy-4,cx+s*40,cy-2);x.bezierCurveTo(cx+s*28,cy+7,cx+s*12,cy+6,cx,cy+3);x.fill()}
    x.strokeStyle='#5a3a22';x.lineWidth=3.5;x.lineCap='round';for(const s of [-1,1]){x.beginPath();x.arc(cx+s*44,cy-19,5,0,TAU);x.stroke()}}],
  ['Monocle','#e8b923','#cfe9ff',x=>{const [ex,ey]=EYE[1];
    x.fillStyle='rgba(200,232,255,.35)';ell(x,ex,ey,18,18*AR+2);x.fill();x.strokeStyle='#e8b923';x.lineWidth=4.5;x.stroke();
    x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=2.5;x.beginPath();x.ellipse(ex,ey,12,12*AR,0,3.6,4.6);x.stroke();
    x.strokeStyle='#e8b923';x.lineWidth=2;x.setLineDash([4,3]);x.beginPath();x.moveTo(ex+14,ey+12);x.quadraticCurveTo(ex+30,V(.95),U(.32),V(.82));x.stroke();x.setLineDash([])}],
  ['Googly Eyes','#ffffff','#1b1430',x=>{EYE.forEach(([ex,ey],i)=>{x.fillStyle='#ffffff';ell(x,ex,ey,21,21*AR+1);x.fill();x.strokeStyle='#1b1430';x.lineWidth=3;x.stroke();
    x.fillStyle='#1b1430';dot(x,ex+(i?-7:6),ey+(i?-6:7),9)})}],
  ['Unibrow','#2a1a12','#fff8ee',x=>{x.strokeStyle='#2a1a12';x.lineWidth=9;x.lineCap='round';x.beginPath();x.moveTo(U(-.19),V(1.235));x.quadraticCurveTo(U(-.1),V(1.29),U(0),V(1.25));x.quadraticCurveTo(U(.1),V(1.29),U(.19),V(1.235));x.stroke()}],
  ['Braces','#ffffff','#b8c2cc',x=>{const [mx,my]=MOUTH;
    x.fillStyle='rgb(255,250,240)';ell(x,mx,my,.11*PXU,.06*PXV);x.fill();
    x.fillStyle='#5a1f3a';x.beginPath();x.moveTo(mx-30,my-9);x.quadraticCurveTo(mx,my+26,mx+30,my-9);x.closePath();x.fill();
    x.fillStyle='#ffffff';x.beginPath();x.moveTo(mx-28,my-9);x.lineTo(mx+28,my-9);x.lineTo(mx+22,my+3);x.lineTo(mx-22,my+3);x.fill();
    x.strokeStyle='#7d8894';x.lineWidth=3;x.beginPath();x.moveTo(mx-26,my-3);x.quadraticCurveTo(mx,my+1,mx+26,my-3);x.stroke();
    x.fillStyle='#9aa6b4';for(let i=-3;i<=3;i++)x.fillRect(mx+i*7.5-3,my-5+Math.abs(i)*.3,6,6)}],
  ['Sunglasses','#ff4f9a','#2a1850',x=>{
    x.strokeStyle='#ff4f9a';x.lineWidth=4;x.beginPath();x.moveTo(EYE[0][0]+15,EYE[0][1]-4);x.quadraticCurveTo(MOUTH[0],EYE[0][1]-10,EYE[1][0]-15,EYE[1][1]-4);x.stroke();
    for(const [ex,ey] of EYE){const g=x.createLinearGradient(ex,ey-16,ex,ey+16);g.addColorStop(0,'#2a1850');g.addColorStop(1,'#6a3cc8');x.fillStyle=g;ell(x,ex,ey,17,17*AR+2);x.fill();x.stroke();
      x.strokeStyle='rgba(255,255,255,.8)';x.lineWidth=3;x.beginPath();x.moveTo(ex-8,ey-2);x.lineTo(ex-1,ey-9);x.stroke();x.strokeStyle='#ff4f9a';x.lineWidth=4}
    for(const s of [-1,1]){x.beginPath();x.moveTo(EYE[s<0?0:1][0]+s*17,EYE[0][1]-3);x.lineTo(U(s*.29),EYE[0][1]-6);x.stroke()}}]
];

// =====================================================================
//  Meshes: hats, the undies on the head and the costumes' shapes. Each is pieces of three.js shapes moved into place
//  and merged into one geometry with vertex colours (built once, shared by every bean wearing it). Coordinates are the
//  bean's "tilt" group: y = height up the body minus 0.8, so the top of the head is y = 0.8 and the face looks along +z.
// =====================================================================
const MAT=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
const GLASS=new THREE.MeshPhongMaterial({vertexColors:true,transparent:true,opacity:.3,shininess:90,specular:0xffffff,depthWrite:false});
const TOP=BODY_H-.8;   // the top of the head
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_c=new THREE.Color(),_up=new V3(0,1,0);
// the body's radius at a height y up the body (0..BODY_H), and a point on its skin (ux round from the front, as above)
const rAt=y=>y<RAD?Math.sqrt(Math.max(0,RAD*RAD-(RAD-y)**2))*1.04:y<BODY_H-RAD?RAD*(1.04-.04*(y-RAD)/(BODY_H-2*RAD)):Math.sqrt(Math.max(0,RAD*RAD-(y-(BODY_H-RAD))**2));
const skin=(ux,y,out)=>{const a=ux/RAD,r=rAt(y)+(out||0);return[Math.sin(a)*r,y-.8,Math.cos(a)*r]};
function Build(){
  const L=[[],[]];
  const b={
    // add(geometry, colour, position, rotation [x,y,z,order], scale, glass)
    add(g,col,p,r,s,glass){g=g.index?g.toNonIndexed():g;_e.set(r?r[0]:0,r?r[1]:0,r?r[2]:0,r&&r[3]||'XYZ');_q.setFromEuler(_e);
      _m.compose(new V3(...(p||[0,0,0])),_q,s==null?new V3(1,1,1):typeof s==='number'?new V3(s,s,s):new V3(...s));g.applyMatrix4(_m);L[glass?1:0].push([g,col]);return b},
    // a shape whose +y axis points along dir, its base at p
    along(g,col,p,dir,s){const d=new V3(...dir).normalize();_q.setFromUnitVectors(_up,d);g=g.index?g.toNonIndexed():g;g.computeBoundingBox();g.translate(0,-g.boundingBox.min.y,0);_m.compose(new V3(...p),_q,s==null?new V3(1,1,1):new V3(...s));g.applyMatrix4(_m);L[0].push([g,col]);return b},
    done(){
      const all=L[0].concat(L[1]);let n=0,n0=0;for(const [g] of all)n+=g.attributes.position.count;for(const [g] of L[0])n0+=g.attributes.position.count;
      const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let o=0;
      for(const [g,col] of all){const c=g.attributes.position.count;P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);_c.set(col);for(let i=0;i<c;i++){C[(o+i)*3]=_c.r;C[(o+i)*3+1]=_c.g;C[(o+i)*3+2]=_c.b}o+=c;g.dispose()}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));geo.setAttribute('color',new THREE.BufferAttribute(C,3));
      if(n>n0){geo.addGroup(0,n0,0);geo.addGroup(n0,n-n0,1);geo.glass=true}
      geo.computeBoundingSphere();return geo;
    }
  };
  return b;
}
const Sph=(r,w,h,ts,tl)=>new THREE.SphereGeometry(r,w||14,h||10,0,TAU,ts||0,tl||Math.PI);
const Cyl=(t,b,h,s,open)=>new THREE.CylinderGeometry(t,b,h,s||16,1,!!open);
const Cone=(r,h,s)=>new THREE.ConeGeometry(r,h,s||12);
const Box=(x,y,z)=>new THREE.BoxGeometry(x,y,z);
const Tor=(r,t,rs,ts,arc)=>new THREE.TorusGeometry(r,t,rs||8,ts||20,arc||TAU);
const Lathe=(pts,s)=>new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),s||20);

// ---------- hats (1-14): [name, c1, c2, build(b)] ----------
const HATS=[
  ['Traffic Cone','#ff7a1a','#ffffff',b=>{const y=TOP-.06;
    b.add(Box(.7,.07,.7),'#e85f0c',[0,y,0]).add(Cone(.28,.8,20),'#ff7a1a',[0,y+.43,0]);
    b.add(Cyl(.19,.22,.12,20),'#ffffff',[0,y+.27,0]).add(Cyl(.095,.125,.1,20),'#ffffff',[0,y+.56,0])}],
  ['Propeller Beanie','#ff3b3b','#ffd23f',b=>{const y=TOP-.2,C=['#ff3b3b','#ffd23f','#2e8bff','#46d37a'];
    for(let i=0;i<4;i++)b.add(new THREE.SphereGeometry(.335,8,8,i*TAU/4,TAU/4,0,Math.PI/2),C[i],[0,y,0],null,[1,.8,1]);
    b.add(Tor(.33,.035,6,24),'#2a1d52',[0,y,0],[Math.PI/2,0,0]).add(Cyl(.022,.022,.12,8),'#2a1d52',[0,y+.31,0]).add(Sph(.04,8,6),'#ffd23f',[0,y+.37,0])}],
  ['Chef Hat','#ffffff','#e6e6ee',b=>{const y=TOP-.1;
    b.add(Cyl(.27,.29,.2,22),'#f4f4f8',[0,y,0]);
    for(const [x,yy,z,r] of [[0,.27,0,.22],[.15,.22,.08,.16],[-.15,.22,.08,.16],[.12,.22,-.13,.16],[-.12,.22,-.13,.16],[0,.2,.17,.15],[0,.2,-.19,.15]])b.add(Sph(r,12,9),'#ffffff',[x,y+yy,z])}],
  ['Crown','#c9d1da','#7a3cff',b=>{const y=TOP-.06;
    b.add(Sph(.29,16,8,0,Math.PI/2),'#7a3cff',[0,y+.02,0],null,[1,1.05,1]).add(Cyl(.3,.31,.22,22,true),'#c9d1da',[0,y+.04,0]).add(Tor(.31,.03,6,26),'#eef2f6',[0,y-.07,0],[Math.PI/2,0,0]).add(Sph(.06,10,8),'#e9eef3',[0,y+.34,0]);
    for(let i=0;i<6;i++){const a=i/6*TAU;b.add(Cone(.08,.22,6),'#dfe5ec',[Math.sin(a)*.3,y+.25,Math.cos(a)*.3]).add(Sph(.035,6,5),'#eef2f6',[Math.sin(a)*.3,y+.37,Math.cos(a)*.3]).add(Sph(.045,8,6),i%2?'#2e8bff':'#ff3b5c',[Math.sin(a)*.315,y+.04,Math.cos(a)*.315])}}],
  ['Pirate Hat','#1e1b24','#e8b923',b=>{const y=TOP-.04;
    b.add(Sph(.3,16,8,0,Math.PI/2),'#1e1b24',[0,y,0],null,[1,.9,1]);
    b.add(Sph(.52,20,10,0,Math.PI/2),'#26222e',[0,y,0],[-.12,0,0],[1,.62,.62]).add(Tor(.52,.022,6,28,Math.PI),'#e8b923',[0,y,0],[-.12,0,0],[1,.62,.62]);
    b.add(new THREE.CircleGeometry(.075,18),'#e8b923',[0,y+.16,.31],[-.4,0,0]).add(Box(.11,.026,.012),'#fff8ee',[0,y+.16,.318],[-.4,0,.7]).add(Box(.11,.026,.012),'#fff8ee',[0,y+.16,.318],[-.4,0,-.7])}],
  ['Viking Helmet','#9aa4b0','#f2e6c9',b=>{const y=TOP-.18;
    b.add(Sph(.34,16,10,0,Math.PI/2),'#9aa4b0',[0,y,0]).add(Tor(.34,.04,6,24),'#8a5a2b',[0,y,0],[Math.PI/2,0,0]).add(Tor(.34,.03,6,20,Math.PI),'#8a5a2b',[0,y,0],[0,Math.PI/2,0]);
    for(const s of [-1,1])for(let k=0;k<5;k++){const t=k/5;b.add(Cyl(.1*(1-t-.2)+.012,.1*(1-t)+.012,.15,10),'#f2e6c9',[s*(.32+t*.2),y+.08+t*.42,0],[0,0,-s*(1.25-t*1.2)])}}],
  ['Cowboy Hat','#a8652e','#5a3416',b=>{const y=TOP-.1;
    b.add(Lathe([[0,.3],[.17,.3],[.22,.26],[.26,.12],[.28,.02],[.52,.04],[.6,.12],[.62,.15],[.59,.11],[.52,0],[.28,-.02],[0,-.02]],24),'#a8652e',[0,y,0]);
    b.add(Cyl(.268,.282,.07,24,true),'#5a3416',[0,y+.07,0])}],
  ['Plunger','#d9312b','#c9925a',b=>{const y=TOP-.16;
    b.add(Lathe([[.0,.24],[.12,.23],[.24,.16],[.32,.04],[.34,0],[.3,0],[.22,.12],[.0,.18]],20),'#d9312b',[0,y,0]).add(Cyl(.035,.035,.7,10),'#c9925a',[0,y+.55,0]).add(Sph(.045,8,6),'#a8743f',[0,y+.9,0])}],
  ['Fishbowl','#bfe6ff','#ff8a1f',b=>{const y=TOP+.26;
    b.add(Cyl(.17,.2,.04,20),'#8fd0ff',[0,TOP-.04,0]).add(Tor(.16,.025,6,24),'#bfe6ff',[0,y+.253,0],[Math.PI/2,0,0]);
    b.add(Cyl(.14,.17,.04,16),'#e8d7a6',[0,y-.22,0]).add(Cone(.03,.12,6),'#46d37a',[.06,y-.15,.03]).add(Cone(.025,.1,6),'#2fb85a',[-.07,y-.16,-.02]);
    b.add(Sph(.075,12,8),'#ff8a1f',[0,y-.02,0],null,[1.5,1,.7]).add(Cone(.06,.1,4),'#ff6a00',[-.14,y-.02,0],[0,0,Math.PI/2],[1,1,.3]).add(Sph(.014,6,4),'#1b1430',[.08,y,.04]);
    b.add(Sph(.3,20,14,Math.PI*.18,Math.PI*.82),'#e6f6ff',[0,y,0],null,null,true).add(new THREE.CircleGeometry(.27,24),'#6cc8ff',[0,y+.07,0],[-Math.PI/2,0,0],null,true).add(Sph(.28,18,10,Math.PI*.42,Math.PI*.58),'#6cc8ff',[0,y,0],null,null,true)}],
  ['Cooking Pot','#a9b3bf','#2a2a33',b=>{const y=TOP-.04;
    b.add(Cyl(.3,.3,.3,22),'#a9b3bf',[0,y+.1,0]).add(Tor(.3,.025,6,24),'#c9d1da',[0,y-.05,0],[Math.PI/2,0,0]).add(Sph(.04,8,6),'#2a2a33',[0,y+.27,0]);
    for(const s of [-1,1])b.add(Tor(.07,.022,6,12,Math.PI),'#2a2a33',[s*.31,y+.13,0],[Math.PI/2,0,s>0?-Math.PI/2:Math.PI/2])}],
  ['Birthday Cone','#ff4f9a','#ffd23f',b=>{const y=TOP-.08,C=['#ff4f9a','#ffd23f','#2ec5ff','#6fdc4a'];
    for(let k=0;k<4;k++){const h=.13,r0=.2*(1-k/4),r1=.2*(1-(k+1)/4);b.add(Cyl(r1,r0,h,18),C[k],[0,y+h*(k+.5),0])}
    b.add(Sph(.07,10,8),'#ffffff',[0,y+.56,0]);for(let k=0;k<6;k++)b.add(Sph(.022,6,4),'#ffd23f',[Math.sin(k)*.16*(1-(k%3)/3.5),y+.06+(k%3)*.13,Math.cos(k)*.16*(1-(k%3)/3.5)])}],
  ['Rubber Duck','#ffd93d','#ff8a1f',b=>{const y=TOP+.08;
    b.add(Sph(.22,16,12),'#ffd93d',[0,y,-.03],null,[1,.75,1.2]).add(Sph(.14,14,10),'#ffd93d',[0,y+.2,.12]).add(Sph(.12,10,8),'#ffd93d',[0,y+.08,-.25],null,[.7,.8,.6]);
    b.add(Sph(.07,10,8),'#ff8a1f',[0,y+.17,.26],null,[1,.45,1.2]);for(const s of [-1,1])b.add(Sph(.025,8,6),'#1b1430',[s*.07,y+.25,.22])}],
  ['Toilet Paper Roll','#fbfbf8','#c9a46a',b=>{const y=TOP+.08;
    b.add(Cyl(.2,.2,.3,22,true),'#fbfbf8',[0,y,0]).add(Cyl(.075,.075,.3,14,true),'#c9a46a',[0,y,0]);
    b.add(new THREE.RingGeometry(.075,.2,22),'#f1f1ea',[0,y+.15,0],[-Math.PI/2,0,0]).add(new THREE.RingGeometry(.075,.2,22),'#f1f1ea',[0,y-.15,0],[Math.PI/2,0,0]);
    b.add(Box(.16,.34,.012),'#fbfbf8',[0,y-.05,-.21],[.15,0,0]).add(Box(.16,.3,.012),'#fbfbf8',[0,y-.33,-.26],[.35,0,0])}],
  ['Tiny Top Hat','#1e1b24','#d9312b',b=>{const y=TOP-.02,r=[0,0,-.22];
    b.add(Cyl(.2,.2,.025,20),'#1e1b24',[.08,y,0],r).add(Cyl(.12,.12,.22,18),'#1e1b24',[.105,y+.11,0],r).add(Cyl(.125,.125,.05,18),'#d9312b',[.09,y+.04,0],r)}]
];
function buildHeadUndies(b){const y=TOP-.2;
  b.add(Sph(.355,18,10,0,Math.PI/2),'#fbfbf8',[0,y,0],null,[1,.9,1]).add(Tor(.35,.04,6,26),'#e8e8ef',[0,y,0],[Math.PI/2,0,0]).add(Tor(.352,.012,4,26),'#6b8bd6',[0,y+.02,0],[Math.PI/2,0,0]);
  for(const s of [-1,1])b.add(Tor(.13,.04,6,16),'#f1f1ea',[s*.19,y+.29,0],[0,Math.PI/2,s*.5]);
}

// ---------- costumes (1-12): [name, c1, c2, paint(x), build(b), arm colour, foot colour] ----------
// A costume is painted on the skin and drawn as one shape around the same body; it is worn over everything else
// (colour, pattern, underpants and hat wait underneath). The face is always left showing.
function bumps(b,col,n,r,seed,y0,y1){const R=G.rng(seed);for(let i=0;i<n;i++){const y=y0+R()*(y1-y0),ux=(R()*2-1)*Math.PI*RAD;if(Math.abs(ux)<.34&&y>.86&&y<1.38){i--;continue}b.add(Sph(r,7,5),col,skin(ux,y,-r*.3))}}
const COSTUMES=[
  ['Hot Dog','#c4553a','#e7a85a',x=>{x.fillStyle='#c4553a';x.fillRect(0,0,W,H);sheen(x,.25);
      x.strokeStyle='#ffd23f';x.lineWidth=8;x.lineJoin='round';for(const X of [U(0),0,W]){x.beginPath();for(let k=0;k<=9;k++)x.lineTo(X+(k%2?14:-14),V(.12+k*.085));x.stroke()}},
    b=>{for(const s of [-1,1]){b.add(Sph(.5,18,14),'#e7a85a',[s*.47,-.02,-.08],null,[.3,1.32,.8]).add(Sph(.5,14,10,0,Math.PI*.5),'#f2c486',[s*.47,.02,-.08],null,[.31,1.2,.81])}},'#c4553a','#8a3a26'],
  ['Banana','#ffd84a','#6b4a1f',x=>{x.fillStyle='#ffd84a';x.fillRect(0,0,W,H);x.fillStyle='#fff4c2';x.fillRect(0,V(.75),W,H-V(.75));
      x.strokeStyle='rgba(180,140,20,.45)';x.lineWidth=3;for(let i=0;i<6;i++){x.beginPath();x.moveTo(i*W/6,0);x.lineTo(i*W/6,V(.75));x.stroke()}
      x.fillStyle='rgba(107,74,31,.55)';const R=G.rng(2);for(let i=0;i<20;i++)dot(x,R()*W,V(.8+R()*.75),2+R()*3)},
    b=>{b.add(Cyl(.045,.07,.16,10),'#6b4a1f',[0,TOP+.04,-.02],[-.25,0,0]).add(Sph(.05,8,6),'#3b2a12',[0,TOP+.12,-.04]);
      for(const a of [Math.PI/2,Math.PI*.78,Math.PI,Math.PI*1.22,Math.PI*1.5]){const p=skin(a*RAD,.62,.02);b.add(Sph(.26,12,10),'#ffd84a',[p[0]*1.08,-.4,p[2]*1.08],[-.55,a,0,'YXZ'],[.72,1.2,.14]);b.add(Sph(.26,12,10),'#fff4c2',[p[0]*1.03,-.4,p[2]*1.03],[-.55,a,0,'YXZ'],[.7,1.16,.12])}},'#ffd84a','#6b4a1f'],
  ['Pickle','#5f9e2f','#7dbb45',x=>{x.fillStyle='#5f9e2f';x.fillRect(0,0,W,H);x.strokeStyle='rgba(40,90,20,.45)';x.lineWidth=6;for(let i=0;i<10;i++){x.beginPath();x.moveTo(i*W/10+8,0);x.quadraticCurveTo(i*W/10-6,H/2,i*W/10+8,H);x.stroke()}
      x.fillStyle='rgba(190,230,120,.6)';const R=G.rng(6);for(let i=0;i<40;i++)dot(x,R()*W,R()*H,3+R()*3);sheen(x,.2)},
    b=>bumps(b,'#7dbb45',30,.05,11,.15,1.5),'#5f9e2f','#3f6e1d'],
  ['Chicken','#fbf8f0','#e8282b',x=>{x.fillStyle='#fbf8f0';x.fillRect(0,0,W,H);x.strokeStyle='rgba(150,140,130,.35)';x.lineWidth=2.5;
      for(let r=0;r<9;r++)for(let i=0;i<14;i++){const cx=(i+(r%2)*.5)*W/14,cy=V(.1+r*.1);if(cy<V(.88)){x.beginPath();x.arc(cx,cy,12,.2,Math.PI-.2);x.stroke()}}},
    b=>{for(let i=0;i<3;i++)b.add(Sph(.1-i*.012,10,8),'#e8282b',[0,TOP+.05-i*.035,.1-i*.11]);
      b.add(Cone(.06,.16,10),'#ffa23a',[0,.24,rAt(1.02)+.06],[Math.PI/2,0,0]).add(Sph(.04,8,6),'#e8282b',[0,.17,rAt(.97)+.02],null,[1,1.5,.8]);
      for(const s of [-1,1])b.add(Sph(.26,12,10),'#efeae0',[s*.42,-.12,-.05],[0,0,s*.35],[.25,.75,.8]);
      for(let i=0;i<3;i++)b.add(Sph(.16,10,8),i===1?'#efeae0':'#e2dccf',[(i-1)*.12,-.05+(i===1?.08:0),-.45],[-.6,0,(i-1)*.4],[.4,1.2,.25])},'#fbf8f0','#ffa23a'],
  ['Dinosaur Onesie','#58c46a','#ffb03a',x=>{x.fillStyle='#58c46a';x.fillRect(0,0,W,H);x.fillStyle='#c8f08a';ell(x,U(0),V(.4),.42*PXU,V(0)-V(.86));x.fill();
      x.fillStyle='rgba(30,110,50,.45)';const R=G.rng(14);for(let i=0;i<14;i++){const ux=(R()<.5?-1:1)*(.6+R()*.7);dot(x,U(ux),V(.2+R()*1.2),5+R()*6)}sheen(x,.2)},
    b=>{for(let i=0;i<7;i++){const y=1.58-i*.2,p=skin(Math.PI*RAD,y,-.02),n=skin(Math.PI*RAD,y,.5);b.along(Cone(.07-i*.003,.18,4),'#ffb03a',p,[n[0]-p[0],(n[1]-p[1])+.25,n[2]-p[2]],[1,1,.45])}
      b.along(Cone(.17,.62,12),'#58c46a',[0,-.55,-.32],[0,-.32,-1]);
      for(const s of [-1,1])b.add(Sph(.075,10,8),'#ffffff',[s*.13,TOP-.03,.17]).add(Sph(.035,8,6),'#1b1430',[s*.13,TOP-.0,.22])},'#58c46a','#3f9a4a'],
  ['Shark','#7d93a8','#f2f4f6',x=>{x.fillStyle='#7d93a8';x.fillRect(0,0,W,H);x.fillStyle='#f2f4f6';ell(x,U(0),V(.35),.5*PXU,V(0)-V(.82));x.fill();
      x.fillStyle='#c2385a';ell(x,U(0),V(1.12),.36*PXU,.29*PXV);x.fill();
      x.strokeStyle='rgba(40,55,70,.6)';x.lineWidth=3;for(const s of [-1,1])for(let i=0;i<3;i++){x.beginPath();x.arc(U(s*(.5+i*.08)),V(.95),14,Math.PI*.6,Math.PI*1.4);x.stroke()}},
    b=>{b.add(Cone(.24,.5,4),'#7d93a8',[0,TOP+.08,-.18],[-.45,0,0],[.25,1,1.2]);
      b.add(Cone(.18,.42,4),'#7d93a8',[0,-.52,-.55],[-1.9,0,0],[.25,1,1]).add(Cone(.15,.36,4),'#7d93a8',[0,-.3,-.58],[-.9,0,0],[.25,1,1]);
      for(const s of [-1,1])b.add(Cone(.12,.36,4),'#6c8298',[s*.47,-.15,.05],[-.5,0,s*2.1],[1,1,.3]);
      for(let i=0;i<18;i++){const a=i/18*TAU,ux=Math.cos(a)*.36,y=1.12+Math.sin(a)*.29,p=skin(ux,y,.0),c=skin(0,1.12,.0);b.along(Cone(.035,.09,4),'#ffffff',p,[(c[0]-p[0])*.6+p[0]*.5,(c[1]-p[1])*.6,(c[2]-p[2])*.6+p[2]*.5])}},'#7d93a8','#5d7186'],
  ['Cactus','#3f9a4a','#ff7ac3',x=>{x.fillStyle='#3f9a4a';x.fillRect(0,0,W,H);x.strokeStyle='rgba(20,80,30,.55)';x.lineWidth=4;for(let i=0;i<12;i++){x.beginPath();x.moveTo(i*W/12,0);x.lineTo(i*W/12,H);x.stroke()}
      x.strokeStyle='#f6f2d8';x.lineWidth=1.5;const R=G.rng(19);for(let i=0;i<70;i++){const cx=Math.round(R()*12)*W/12+W/24,cy=R()*H;x.beginPath();x.moveTo(cx-3,cy-3);x.lineTo(cx+3,cy+3);x.moveTo(cx+3,cy-3);x.lineTo(cx-3,cy+3);x.stroke()}sheen(x,.2)},
    b=>{for(const s of [-1,1]){const a=s*Math.PI*.68,c=Math.sin(a),d=Math.cos(a);
        b.add(Cyl(.09,.09,.32,12),'#3f9a4a',[c*.52,-.08,d*.52],[Math.PI/2,a,0,'YXZ']).add(Sph(.09,10,8),'#3f9a4a',[c*.68,-.08,d*.68]).add(Cyl(.09,.09,.36,12),'#3f9a4a',[c*.68,.1,d*.68]).add(Sph(.09,10,8),'#3f9a4a',[c*.68,.28,d*.68])}
      for(let i=0;i<5;i++){const a=i/5*TAU;b.add(Sph(.06,8,6),'#ff7ac3',[Math.sin(a)*.07,TOP+.03,Math.cos(a)*.07])}b.add(Sph(.045,8,6),'#ffd23f',[0,TOP+.06,0])},'#3f9a4a','#2c6f35'],
  ['Sushi Roll','#fbfaf2','#1f2e22',x=>{x.fillStyle='#fbfaf2';x.fillRect(0,0,W,H);x.fillStyle='rgba(200,195,175,.7)';const R=G.rng(23);for(let i=0;i<220;i++){const cx=R()*W,cy=R()*V(.86);x.save();x.translate(cx,cy);x.rotate(R()*3);ell(x,0,0,4,2);x.fill();x.restore()}
      x.fillStyle='#1f2e22';x.fillRect(0,V(.86),W,H-V(.86));x.strokeStyle='rgba(90,120,90,.35)';x.lineWidth=2;for(let i=0;i<20;i++){x.beginPath();x.moveTo(i*W/20,V(.86));x.lineTo(i*W/20+8,H);x.stroke()}},
    b=>{const y=TOP-.03;b.add(Cyl(.3,.34,.1,22),'#fbfaf2',[0,y,0]).add(Cyl(.19,.19,.03,18),'#ff8a5c',[0,y+.06,0]);
      for(let i=0;i<4;i++)b.add(Box(.05,.03,.12),'#ffffff',[0,y+.075,0],[0,i*.8,0],[.3,1,1.3]);
      for(let i=0;i<5;i++){const a=i/5*TAU+.3;b.add(Box(.07,.035,.07),'#6fbf3a',[Math.sin(a)*.24,y+.065,Math.cos(a)*.24],[0,a,0])}},'#fbfaf2','#1f2e22'],
  ['Astronaut','#f2f4f7','#2e8bff',x=>{x.fillStyle='#f2f4f7';x.fillRect(0,0,W,H);x.strokeStyle='rgba(120,130,145,.5)';x.lineWidth=3;for(const y of [.3,.62]){x.beginPath();x.moveTo(0,V(y));x.lineTo(W,V(y));x.stroke()}
      x.fillStyle='#9aa6b4';x.beginPath();x.roundRect?x.roundRect(U(-.17),V(.86),.34*PXU,V(.6)-V(.86),6):x.rect(U(-.17),V(.86),.34*PXU,V(.6)-V(.86));x.fill();
      [['#ff3b3b',-.09],['#ffd23f',0],['#46d37a',.09]].forEach(([c,u])=>{x.fillStyle=c;dot(x,U(u),V(.73),6)});
      x.fillStyle='#2e8bff';dot(x,U(-.48),V(.75),14);x.fillStyle='#ffffff';starAt(x,U(-.48),V(.75),8)},
    b=>{b.add(Tor(.42,.06,8,26),'#c9d1da',[0,.1,0],[Math.PI/2,0,0]).add(Box(.46,.56,.2),'#e6e9ee',[0,-.12,-.47]).add(Cyl(.05,.05,.5,10),'#c9d1da',[0,-.12,-.6]).add(Sph(.04,8,6),'#2e8bff',[.14,.08,-.58]);
      b.add(Sph(.53,22,16),'#e6f6ff',[0,.36,.02],null,null,true)},'#f2f4f7','#9aa6b4'],
  ['Knight','#c3cad3','#2e5ad9',x=>{x.fillStyle='#c3cad3';x.fillRect(0,0,W,H);x.strokeStyle='rgba(70,80,95,.55)';x.lineWidth=3;for(const y of [.25,.45,.65,.85]){x.beginPath();x.moveTo(0,V(y));x.lineTo(W,V(y));x.stroke()}
      x.fillStyle='rgba(70,80,95,.6)';for(let i=0;i<24;i++)for(const y of [.25,.45,.65])dot(x,i*W/24+6,V(y)-6,2.5);
      x.fillStyle='#2e5ad9';x.fillRect(U(-.2),V(.86),.4*PXU,V(.08)-V(.86));x.fillStyle='#ffd23f';starAt(x,U(0),V(.5),16);sheen(x,.3)},
    b=>{b.add(new THREE.SphereGeometry(.47,22,12,Math.PI/2+.95,TAU-1.9,0,Math.PI*.62),'#aab3bd',[0,.38,0]);
      b.add(Sph(.47,20,6,0,Math.PI*.1),'#aab3bd',[0,.38,0]).add(new THREE.SphereGeometry(.5,12,4,Math.PI/2-.95,1.9,Math.PI*.1,Math.PI*.14),'#9aa4b0',[0,.38,0]);
      for(let i=0;i<6;i++)b.add(Sph(.11-i*.011,10,8),i%2?'#ff4d4d':'#e8282b',[0,.86+i*.04-i*i*.012,-.02-i*.09]);
      for(const s of [-1,1])b.add(Sph(.17,12,8,0,Math.PI/2),'#aab3bd',[s*.4,.1,0],[0,0,-s*.5])},'#c3cad3','#7d8794'],
  ['Toilet Paper Mummy','#f7f5ee','#d9d3c3',x=>{x.fillStyle='#f7f5ee';x.fillRect(0,0,W,H);x.strokeStyle='rgba(170,160,140,.5)';x.lineWidth=2.5;
      for(let i=-6;i<30;i++){x.beginPath();x.moveTo(0,i*14);x.lineTo(W,i*14-90);x.stroke()}x.strokeStyle='rgba(200,190,170,.45)';x.setLineDash([3,4]);for(let i=-6;i<30;i++){x.beginPath();x.moveTo(0,i*14+7);x.lineTo(W,i*14-83);x.stroke()}x.setLineDash([])},
    b=>{for(const [ux,y,a,l] of [[.75,.9,.3,.26],[-.62,.55,-.2,.24],[1.2,1.2,.15,.3],[-1.05,.35,-.3,.22],[.4,.4,.25,.2]]){const p=skin(ux,y,.01);b.add(Box(.12,l,.012),'#f7f5ee',[p[0],p[1]-l/2,p[2]],[0,ux/RAD,a,'YXZ'])}},'#f7f5ee','#d9d3c3'],
  ['Turkey','#8a5a34','#ff8a1f',x=>{x.fillStyle='#8a5a34';x.fillRect(0,0,W,H);x.fillStyle='#e9d3a8';ell(x,U(0),V(.4),.4*PXU,V(0)-V(.82));x.fill();
      x.strokeStyle='rgba(60,35,15,.45)';x.lineWidth=2.5;for(let r=0;r<10;r++)for(let i=0;i<14;i++){const cx=(i+(r%2)*.5)*W/14,cy=V(.1+r*.13);if(Math.abs(cx-W/2)>.45*PXU||cy<V(.86)){x.beginPath();x.arc(cx,cy,11,.2,Math.PI-.2);x.stroke()}}},
    b=>{const C=['#d9312b','#ff8a1f','#ffd23f','#8a5a34','#ffd23f','#ff8a1f','#d9312b'];
      for(let i=0;i<7;i++){const a=(i-3)*.36;b.add(Sph(.34,12,10),C[i],[Math.sin(a)*.45,.0+Math.cos(a)*.45,-.5],[0,0,-a],[.32,1,.1]).add(Sph(.12,8,6),'#fff1d6',[Math.sin(a)*.72,Math.cos(a)*.72-.03,-.52],[0,0,-a],[.4,.6,.1])}
      b.add(Cone(.05,.14,8),'#ffb03a',[0,.22,rAt(1.02)+.05],[Math.PI/2,0,0]).add(Sph(.045,8,6),'#d9312b',[.05,.13,rAt(.95)+.02],null,[.8,1.7,.8])},'#8a5a34','#ffb03a']
];

// ---------- victory dances (1-6): played instead of the cheer when you qualify or win. [name, c1, c2, pose(B, t)] ----------
const arms=(B,a0,s0,a1,s1)=>{B.arms[0].rotation.set(a0,0,-s0);B.arms[1].rotation.set(a1,0,s1)};
const DANCES=[
  ['Wiggle Wobble','#ff4f9a','#ffd23f',(B,t)=>{const s=Math.sin(t*9);B.tilt.rotation.set(0,0,s*.3);B.tilt.position.y=.8+Math.abs(s)*.06;arms(B,s*.7,1.2+s*.6,-s*.7,1.2-s*.6);B.legs[0].rotation.x=s*.4;B.legs[1].rotation.x=-s*.4}],
  ['Robot','#9aa4b0','#2ec5ff',(B,t)=>{const k=Math.floor(t*4)%4,P=[[1.5,.2,0,.2],[0,1.5,1.5,.2],[-.6,.2,-.6,1.5],[1.5,1.5,1.5,1.5]][k];B.tilt.rotation.set(0,(k%2?.3:-.3),0);B.tilt.position.y=.8;arms(B,P[0],P[1],P[2],P[3])}],
  ['Spin Cycle','#2ec5ff','#ffffff',(B,t)=>{B.root.rotation.y+=t*9;B.tilt.rotation.set(0,0,Math.sin(t*3)*.12);B.tilt.position.y=.8+Math.abs(Math.sin(t*6))*.1;arms(B,0,1.5,0,1.5)}],
  ['Chicken Flap','#ffa23a','#fbf8f0',(B,t)=>{const s=Math.sin(t*16);B.tilt.rotation.set(Math.max(0,Math.sin(t*4))*.45,0,0);B.tilt.position.y=.8+Math.abs(Math.sin(t*8))*.05;arms(B,0,.9+s*.7,0,.9+s*.7);B.legs[0].rotation.x=Math.sin(t*8)*.5;B.legs[1].rotation.x=-Math.sin(t*8)*.5}],
  ['Jelly Jump','#6fdc4a','#ff9ad5',(B,t)=>{const p=(t*1.8)%1,h=Math.sin(p*Math.PI),sq=p<.12||p>.88?.78:1+h*.18;B.tilt.position.y=.8+h*.55;B.tilt.scale.set(1/Math.sqrt(sq),sq,1/Math.sqrt(sq));B.tilt.rotation.set(0,0,0);arms(B,0,2.6*h+.3,0,2.6*h+.3)}],
  ['Disco Point','#8a5cff','#ffd23f',(B,t)=>{const k=Math.floor(t*2)%2,s=Math.sin(t*Math.PI*2);B.tilt.rotation.set(0,0,(k?.18:-.18)+s*.05);B.tilt.position.y=.8+Math.abs(s)*.04;arms(B,k?-.4:.3,k?2.7:.5,k?.3:-.4,k?.5:2.7)}]
];

// ---------- fall screams (1-6): made in code with Web Audio. [name, c1, c2, play(au, v)] ----------
function voice(au,t,dur,f0,f1,type,forms,vib,v){
  const a=au.actx,o=a.createOscillator(),g=a.createGain(),l=a.createOscillator(),lg=a.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  l.frequency.value=vib[0];lg.gain.value=vib[1];l.connect(lg);lg.connect(o.frequency);
  for(const [f,q,gn] of forms){const bp=a.createBiquadFilter(),fg=a.createGain();bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q;fg.gain.value=gn;o.connect(bp);bp.connect(fg);fg.connect(g)}
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.04);g.gain.setValueAtTime(v,t+dur*.75);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  g.connect(au.sfxBus);o.start(t);l.start(t);o.stop(t+dur+.05);l.stop(t+dur+.05);
}
const EE=[[320,4,3],[2300,6,2]],AH=[[760,4,3],[1150,5,2]],OO=[[350,4,3.4],[800,5,1.4]];
const SCREAMS=[
  ['Wheee!','#ffd23f','#ff4f9a',(au,v,t)=>voice(au,t,.95,480,1250,'sawtooth',EE,[7,22],.28*v)],
  ['Aaaah!','#ff6b3d','#ffffff',(au,v,t)=>voice(au,t,1.2,520,170,'sawtooth',AH,[6,20],.3*v)],
  ['Yodel Drop','#46d37a','#fff8ee',(au,v,t)=>{for(let i=0;i<8;i++){const hi=i%2===0,f=(hi?760:520)*(1-i*.06);voice(au,t+i*.13,.15,f,f*(hi?.92:1.06),'sawtooth',hi?EE:OO,[5,8],.26*v)}}],
  ['Slide Whistle','#2ec5ff','#ffffff',(au,v,t)=>{au.tone(1700,1.1,'sine',.18*v,260,t);au.tone(3400,.5,'sine',.03*v,1500,t)}],
  ['Kazoo Wail','#8a5cff','#ffd23f',(au,v,t)=>{voice(au,t,1.1,360,240,'square',[[1100,2,2.2],[2600,3,1]],[9,30],.22*v);au.noise(1,.04*v,'bandpass',1800,900,t,3)}],
  ['Squeaky Toy','#ff9ad5','#ffffff',(au,v,t)=>{for(let i=0;i<3;i++)au.tone(1150+i*90,.09,'sine',.22*v,1650+i*90,t+i*.14);au.noise(.6,.1*v,'lowpass',1400,200,t+.46);au.tone(700,.55,'triangle',.09*v,180,t+.46)}]
];

// ---------- knockout splashes (1-5): played as well as the slime splash. [name, c1, c2, burst(pos)] ----------
const CONF=G.CONF,FX=G.FX,_s=new V3(),_v=new V3();
const SPLASHES=[
  ['Confetti Pop','#ff4f9a','#ffd23f',p=>{for(let i=0;i<60;i++){const a=rand(0,TAU),s=rand(2,5);FX.spawn(_s.set(p.x,p.y+.4,p.z),_v.set(Math.cos(a)*s,rand(6,12),Math.sin(a)*s),pick(CONF),rand(2,3),1)}}],
  ['Bubble Burst','#bfe6ff','#ffffff',p=>{const C=['#bfe6ff','#ffffff','#ffd6f0','#d6fff4'];for(let i=0;i<40;i++)FX.spawn(_s.set(p.x+rand(-.5,.5),p.y+.3,p.z+rand(-.5,.5)),_v.set(rand(-2,2),rand(2,5),rand(-2,2)),pick(C),rand(1.6,2.6),1.25);G.PUFF.ring(p,10,3,1.3)}],
  ['Rainbow Splat','#ff5c5c','#5cc8ff',p=>{for(let i=0;i<48;i++){const a=i/48*TAU;FX.spawn(_s.set(p.x,p.y+.3,p.z),_v.set(Math.cos(a)*7,rand(3,5),Math.sin(a)*7),'hsl('+Math.round(i/48*360)+',90%,60%)',rand(.9,1.2),2)}}],
  ['Star Shower','#ffd23f','#ffffff',p=>{for(let i=0;i<44;i++)FX.spawn(_s.set(p.x,p.y+.4,p.z),_v.set(rand(-2.5,2.5),rand(10,15),rand(-2.5,2.5)),i%3?'#ffd23f':'#ffffff',rand(1.5,2.2),1.35)}],
  ['Glitter Geyser','#ffcf3d','#ff7ac3',p=>{const C=['#ffcf3d','#ff7ac3','#ffffff','#b8a4ff'];for(let i=0;i<70;i++)FX.spawn(_s.set(p.x+rand(-.2,.2),p.y+.3,p.z+rand(-.2,.2)),_v.set(rand(-1.2,1.2),rand(12,18),rand(-1.2,1.2)),pick(C),rand(2,3),.8)}]
];
// =====================================================================
//  Wave 2 (Nov 2026): sports kits, pirates (with eye patches), suits, robots and more. Always added at the END of each
//  list, so every older number keeps its look. A costume here may have no shape (null): it is paint only, costs
//  nothing, and leaves room for a hat. Its arm and foot colours may be null (the bean's own colour shows, as on bare
//  arms), and an eighth part, if any, is painted over the face (an eye patch, shades). Costume painters get the head
//  colour (the bean's colour, or the Closet colour) so a kit shows the bean's own colour above the neck.
// =====================================================================
const fillC=(x,c)=>{x.fillStyle=c;x.fillRect(0,0,W,H)};
const bandY=(x,c,y0,y1)=>{x.fillStyle=c;x.fillRect(0,V(y1),W,V(y0)-V(y1))};
const NECK=.9;
const poly=(x,P)=>{x.beginPath();for(const [u,y] of P)x.lineTo(U(u),V(y));x.closePath();x.fill()};
// the head (bean colour) above a shirt, with a round or V neckline under the face and a trim line along it
function neck(x,head,trim,dip,w){dip=dip==null?.08:dip;w=w||.3;
  const path=()=>{x.beginPath();x.moveTo(0,V(NECK));x.lineTo(U(-w),V(NECK));x.quadraticCurveTo(U(-w*.35),V(NECK-dip),U(0),V(NECK-dip));x.quadraticCurveTo(U(w*.35),V(NECK-dip),U(w),V(NECK));x.lineTo(W,V(NECK))};
  path();x.lineTo(W,-4);x.lineTo(0,-4);x.closePath();x.fillStyle=head;x.fill();
  if(trim){path();x.strokeStyle=trim;x.lineWidth=7;x.lineJoin='round';x.stroke()}}
// a number on the back (and, smaller, on the chest), drawn upright on the round body
function num(x,n,fill,stroke,size,cx,y){size=size||64;cx=cx==null?W:cx;y=y==null?.6:y;x.save();x.font='900 '+size+'px Arial,Helvetica,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';
  wrap(cx,X=>{x.save();x.translate(X,V(y));x.scale(1,AR*1.15);if(stroke){x.strokeStyle=stroke;x.lineWidth=size*.18;x.strokeText(n,0,0)}x.fillStyle=fill;x.fillText(n,0,0);x.restore()},size*1.3);x.restore()}
const sideStripe=(x,c,w,y0,y1)=>{x.fillStyle=c;for(const s of [-1,1])x.fillRect(U(s*SIDE)-w/2,V(y1),w,V(y0)-V(y1))};
const vStripes=(x,c,n,y0,y1,f)=>{x.fillStyle=c;for(let i=0;i<n;i++)x.fillRect(i*W/n,V(y1),W/n*(f||.5),V(y0)-V(y1))};
const hem=(x,c,y,h)=>bandY(x,c,y,y+(h||.04));
// a jacket, shirt, lapels and tie (or bow), for the suits
function suit(x,head,o){
  fillC(x,o.jacket);
  if(o.pin){x.fillStyle=o.pin;for(let i=0;i<44;i++)x.fillRect(i*W/44,0,1.8,H)}
  bandY(x,head,NECK,BODY_H+.1);
  x.fillStyle=o.shirt;poly(x,[[-.24,NECK+.03],[0,o.vb||.5],[.24,NECK+.03]]);
  if(o.tie){x.fillStyle=o.tie;poly(x,[[-.045,NECK+.01],[.045,NECK+.01],[.028,.84],[.065,.6],[0,.53],[-.065,.6],[-.028,.84]]);
    if(o.tieS){x.strokeStyle=o.tieS;x.lineWidth=3;for(let i=0;i<5;i++){x.beginPath();x.moveTo(U(-.06),V(.62+i*.055));x.lineTo(U(.06),V(.66+i*.055));x.stroke()}}}
  x.fillStyle=o.lap;for(const s of [-1,1])poly(x,[[s*.22,NECK+.03],[s*.4,NECK],[s*.3,.8],[s*.36,.76],[s*.07,(o.vb||.5)-.02],[0,(o.vb||.5)-.02]]);
  x.fillStyle='rgba(20,16,30,.18)';x.fillRect(U(-.005),V(o.vb||.5),3,V(.02)-V(o.vb||.5));
  x.fillStyle=o.btn||'rgba(20,16,30,.55)';for(const y of [.44,.32])dot(x,U(.025),V(y),4.5);
  if(o.sq){x.fillStyle=o.sq;poly(x,[[.36,.7],[.5,.7],[.44,.78],[.4,.74]])}
  if(o.trousers){bandY(x,o.trousers,0,.22)}
}
function fur(x,c,seed,n,len){const R=G.rng(seed);x.strokeStyle=c;x.lineWidth=3;x.lineCap='round';for(let i=0;i<n;i++){const cx=R()*W,cy=R()*H,a=Math.PI/2+(R()-.5)*1.2;wrap(cx,X=>{x.beginPath();x.moveTo(X,cy);x.lineTo(X+Math.cos(a)*len,cy+Math.sin(a)*len);x.stroke()},20)}}
function rivets(x,c,ys,n){x.fillStyle=c;for(const y of ys)for(let i=0;i<n;i++)dot(x,(i+.5)*W/n,V(y),3.2)}

// ---- over the face: the eye patch (its strap goes round the head), dark shades, sports eye black ----
function eyePatch(x){
  x.strokeStyle='#1e1b24';x.lineWidth=6;x.lineCap='round';x.beginPath();for(let i=0;i<=64;i++){const X=i/64*W,a=(X-W/2)/PXU/RAD;x.lineTo(X,V(1.2+.16*Math.sin(a-.56)))}x.stroke();
  const [ex,ey]=EYE[1];x.fillStyle='#1e1b24';ell(x,ex,ey+1,18,18*AR+3);x.fill();x.fillStyle='rgba(255,255,255,.22)';ell(x,ex-6,ey-6,5,3.5);x.fill();
}
function shades(x){
  x.fillStyle='#1b1a22';x.strokeStyle='#1b1a22';x.lineWidth=4;
  for(const [ex,ey] of EYE){x.beginPath();x.roundRect?x.roundRect(ex-16,ey-12,32,22,6):x.rect(ex-16,ey-12,32,22);x.fill()}
  x.beginPath();x.moveTo(EYE[0][0]+14,EYE[0][1]-7);x.lineTo(EYE[1][0]-14,EYE[1][1]-7);x.stroke();
  for(const s of [-1,1]){x.beginPath();x.moveTo(EYE[s<0?0:1][0]+s*16,EYE[0][1]-7);x.lineTo(U(s*.3),EYE[0][1]-9);x.stroke()}
  x.fillStyle='rgba(255,255,255,.4)';for(const [ex,ey] of EYE){x.beginPath();x.moveTo(ex-11,ey+6);x.lineTo(ex-3,ey-9);x.lineTo(ex+2,ey-9);x.lineTo(ex-6,ey+6);x.fill()}
}
function eyeBlack(x){x.fillStyle='rgba(30,27,36,.92)';EYE.forEach(([ex,ey],i)=>{const X=ex+(i?8:-8);x.beginPath();x.roundRect?x.roundRect(X-13,ey+10,26,6,3):x.rect(X-13,ey+10,26,6);x.fill()})}

// ---- shapes shared by hats and costumes (coordinates as above: the top of the head is y = 0.8, the face looks along +z) ----
const capB=(c,c2)=>b=>{const y=.56;b.add(Sph(.385,18,9,0,Math.PI/2),c,[0,y,0],null,[1,.82,1]).add(Cyl(.25,.25,.03,18),c,[0,y+.0,.4],[.32,0,0],[1,1,.9]).add(Sph(.04,8,6),c2||c,[0,y+.32,0])};
const headbandB=(c,y,r)=>b=>{b.add(Tor(r||.365,.042,6,26),c,[0,y||.6,0],[Math.PI/2,0,0])};
function helmetB(b,c,r){const y=.38;r=r||.47;
  b.add(Sph(r,22,8,0,Math.PI*.36),c,[0,y,0]).add(new THREE.SphereGeometry(r,22,6,Math.PI/2+1,TAU-2,Math.PI*.36,Math.PI*.27),c,[0,y,0]);}
// a stripe over the top of a helmet, front to back
const topStripe=(b,c,r,w)=>b.add(Tor(r,w||.03,4,24,Math.PI*.78),c,[0,.38,0],[0,Math.PI/2,Math.PI*.04]);
// a horizontal bar curving round the front at height y
const frontBar=(b,c,r,y,arc,t)=>b.add(Tor(r,t||.018,4,16,arc),c,[0,y,0],[Math.PI/2,0,Math.PI/2-arc/2]);
const fedoraB=(c,band,tilt)=>b=>{const y=.68;b.add(Lathe([[0,.27],[.14,.28],[.22,.25],[.28,.14],[.3,.03],[.46,.03],[.52,.08],[.49,.03],[.43,-.01],[.3,-.02],[0,-.02]],24),c,[0,y,0],[tilt||0,0,-.06]);
  b.add(Cyl(.293,.3,.07,24,true),band,[0,y+.065,0],[tilt||0,0,-.06]);b.add(Box(.02,.06,.16),shade(c,-.3),[0,y+.27,.04],[tilt||0,0,-.06])};
const topHatB=(c,band)=>b=>{b.add(Cyl(.42,.42,.03,26),c,[0,.66,0]).add(Cyl(.28,.29,.44,22),c,[0,.89,0]).add(Cyl(.295,.295,.08,22,true),band,[0,.72,0])};
const bowlerB=c=>b=>{b.add(Sph(.31,18,8,0,Math.PI/2),c,[0,.66,0],null,[1,1.1,1]).add(Cyl(.41,.41,.026,24),c,[0,.66,0]).add(Tor(.41,.02,5,26),c,[0,.67,0],[Math.PI/2,0,0]).add(Cyl(.315,.315,.06,22,true),shade(c,.35),[0,.69,0])};
function tricornB(b,c,trim,tatter){const y=.62;
  b.add(Sph(.31,16,8,0,Math.PI/2),c,[0,y-.02,0],null,[1,.95,1]);
  for(let i=0;i<3;i++){const a=Math.PI/3+i*TAU/3,cx=Math.sin(a)*.25,cz=Math.cos(a)*.25;
    b.add(Box(.8,.27,.035),c,[cx,y+.1,cz],[.32,a,0,'YXZ']);
    const up=[Math.sin(.32)*Math.sin(a),Math.cos(.32),Math.sin(.32)*Math.cos(a)];
    if(trim)b.add(Box(.8,.035,.05),trim,[cx+up[0]*.135,y+.1+up[1]*.135,cz+up[2]*.135],[.32,a,0,'YXZ']);
    if(tatter)for(let k=-1;k<=1;k+=2)b.add(Box(.09,.08,.04),'#e8fff9',[cx+up[0]*.135+Math.cos(a)*k*.24,y+.1+up[1]*.135,cz+up[2]*.135-Math.sin(a)*k*.24],[.32,a,.6*k,'YXZ'])}}
const bandanaB=(c,c2)=>b=>{const y=.5;b.add(Sph(.395,18,9,0,Math.PI/2),c,[0,y,0],null,[1,.8,1.02]).add(Sph(.065,8,6),c2||c,[0,y+.02,-.4]);
  for(const s of [-1,1])b.add(Box(.09,.24,.025),c2||c,[s*.07,y-.12,-.42],[.2,0,s*.38]);
  for(let i=0;i<10;i++){const a=i/10*TAU+.3,r=.395*Math.sin(Math.PI*.3);b.add(Sph(.022,6,4),'#ffffff',[Math.sin(a)*r*1.02,y+.395*.8*Math.cos(Math.PI*.3),Math.cos(a)*r*1.04])}};
const furHatB=c=>b=>{const y=.76;b.add(Cyl(.37,.35,.34,22),c,[0,y,0]).add(Sph(.37,22,6,0,Math.PI/2),c,[0,y+.16,0],null,[1,.3,1]);const R=G.rng(41);
  for(let i=0;i<54;i++){const a=i/54*TAU*3+R()*.3,h=-.15+(i%3)*.13+R()*.04;b.add(Sph(.075,7,5),i%2?shade(c,.14):shade(c,-.06),[Math.sin(a)*.355,y+h,Math.cos(a)*.355])}
  for(let i=0;i<10;i++){const a=i/10*TAU;b.add(Sph(.08,7,5),shade(c,.14),[Math.sin(a)*.2,y+.24,Math.cos(a)*.2])}};
// a gold chain hanging round the neck, with a round medallion at the front
function chainB(b,c,medal){b.add(Tor(.455,.022,5,34),c,[0,.04,0],[Math.PI/2+.38,0,0]);if(medal)b.add(Cyl(.075,.075,.025,16),c,[0,-.2,.43],[Math.PI/2-.25,0,0]).add(Sph(.03,8,6),medal,[0,-.2,.45])}
function bowTieB(b,c){b.add(Sph(.035,8,6),c,[0,.07,.445]);for(const s of [-1,1])b.add(Cone(.065,.13,4),c,[s*.08,.07,.43],[0,0,s*Math.PI/2],[1,1,.45])}
const visorBand=(b,c,r,t0,t1,half)=>b.add(new THREE.SphereGeometry(r,20,3,Math.PI/2-half,half*2,Math.PI*t0,Math.PI*(t1-t0)),c,[0,.38,0]);

FACES.push(
  ['Eye Patch','#1e1b24','#fff8ee',eyePatch],
  ['Black Shades','#1b1a22','#9aa6b4',shades],
  ['Eye Black','#1e1b24','#f2f4f7',eyeBlack]
);
HATS.push(
  ['Baseball Cap','#e8282b','#ffffff',capB('#e8282b','#ffffff')],
  ['Fedora','#6b7280','#1e1b24',fedoraB('#6b7280','#1e1b24')],
  ['Pirate Bandana','#d9312b','#ffffff',bandanaB('#d9312b')],
  ['Fur Hat','#8a7460','#b8a48e',furHatB('#8a7460')],
  ['Bowler Hat','#2f2c38','#6a6578',bowlerB('#2f2c38')]
);
COSTUMES.push(
  // ---------------- SPORTS ----------------
  ['Soccer Kit','#2e8bff','#ffffff',(x,c)=>{fillC(x,'#2e8bff');sideStripe(x,'#ffffff',22,.36,NECK);bandY(x,'#ffffff',0,.36);hem(x,'#2e8bff',.3,.03);
      neck(x,c,'#ffffff',.06,.26);x.fillStyle='#ffffff';poly(x,[[-.24,.78],[-.13,.78],[-.13,.68],[-.185,.62],[-.24,.68]]);x.fillStyle='#2e8bff';starAt(x,U(-.185),V(.715),8);
      num(x,'9','#ffffff','#1f4fa8',70);num(x,'9','#ffffff',null,26,U(.2),.72);sheen(x,.18)},
    null,'#2e8bff','#26222e'],
  ['Basketball Kit','#7a3cff','#ffd23f',(x,c)=>{fillC(x,'#7a3cff');bandY(x,c,NECK-.02,BODY_H+.1);
      x.fillStyle=c;for(const s of [-1,1]){ell(x,U(s*SIDE),V(.8),.17*PXU,.14*PXV);x.fill()}
      x.strokeStyle='#ffd23f';x.lineWidth=6;for(const s of [-1,1]){ell(x,U(s*SIDE),V(.8),.17*PXU,.14*PXV);x.stroke()}
      neck(x,c,'#ffd23f',.14,.2);sideStripe(x,'#ffd23f',14,0,.4);hem(x,'#ffd23f',.4,.025);
      num(x,'7','#ffd23f','#3d1a8c',74);num(x,'7','#ffd23f','#3d1a8c',46,U(0),.6);sheen(x,.18)},
    headbandB('#ffd23f'),null,'#ffffff'],
  ['Gridiron Gear','#d9312b','#ffffff',(x,c)=>{fillC(x,'#d9312b');bandY(x,'#f2e6c9',0,.4);x.fillStyle='#d9312b';x.fillRect(0,V(.4),W,4);
      sideStripe(x,'#d9312b',10,0,.4);neck(x,c,'#ffffff',.05,.24);for(const s of [-1,1]){x.fillStyle='#ffffff';x.fillRect(U(s*SIDE)-30,V(.88),60,8);x.fillRect(U(s*SIDE)-30,V(.84),60,5)}
      num(x,'42','#ffffff','#7a1712',62);num(x,'42','#ffffff','#7a1712',50,U(0),.62);sheen(x,.2)},
    b=>{helmetB(b,'#d9312b');topStripe(b,'#ffffff',.475,.035);
      frontBar(b,'#9aa4b0',.5,.17,1.7);frontBar(b,'#9aa4b0',.5,.29,1.5);for(const s of [-1,1])b.add(Cyl(.018,.018,.24,6),'#9aa4b0',[s*Math.sin(.82)*.5,.24,Math.cos(.82)*.5]);
      for(const s of [-1,1])b.add(Sph(.24,12,8),'#d9312b',[s*.28,.04,0],null,[1.1,.55,1.2])},'#d9312b','#1e1b24'],
  ['Baseball Uniform','#fbfaf5','#1f3b73',(x,c)=>{fillC(x,'#fbfaf5');x.fillStyle='rgba(31,59,115,.5)';for(let i=0;i<34;i++)x.fillRect(i*W/34,0,2,H);
      bandY(x,'#1f3b73',.36,.39);neck(x,c,'#1f3b73',.1,.2);x.fillStyle='#1f3b73';x.fillRect(U(0)-2,V(.8),4,V(.39)-V(.8));
      x.fillStyle='#1f3b73';for(const y of [.72,.6,.48])dot(x,U(.035),V(y),4);bandY(x,'#1f3b73',0,.07);
      num(x,'12','#1f3b73','#ffffff',62);sheen(x,.15)},
    capB('#1f3b73','#1f3b73'),'#fbfaf5','#1f3b73'],
  ['Hockey Kit','#19b3a6','#ffffff',(x,c)=>{fillC(x,'#19b3a6');bandY(x,'#ffffff',.44,.52);bandY(x,'#1e1b24',.47,.49);bandY(x,'#2a2a33',0,.36);hem(x,'#19b3a6',.3,.03);
      neck(x,c,'#ffffff',.12,.22);x.strokeStyle='#ffffff';x.lineWidth=3;for(let i=0;i<4;i++){x.beginPath();x.moveTo(U(-.05),V(.88-i*.025));x.lineTo(U(.05),V(.88-i*.025));x.stroke()}
      num(x,'88','#ffffff','#0d6b63',62);sheen(x,.18)},
    b=>{helmetB(b,'#ffffff',.465);for(const s of [-1,1])b.add(Cyl(.09,.09,.05,14),'#e6e9ee',[s*.44,.3,.05],[0,0,Math.PI/2]);b.add(Box(.5,.03,.08),'#19b3a6',[0,.62,.32],[-.5,0,0])},'#19b3a6','#9aa6b4'],
  ['Tennis Whites','#ffffff','#46d37a',(x,c)=>{fillC(x,'#ffffff');bandY(x,'#f6f6f9',0,.36);hem(x,'#46d37a',.355,.02);neck(x,c,null,.02,.26);
      x.fillStyle='#ffffff';for(const s of [-1,1])poly(x,[[s*.04,NECK-.02],[s*.28,NECK+.02],[s*.24,.82],[s*.06,.84]]);x.strokeStyle='#46d37a';x.lineWidth=3;
      for(const s of [-1,1]){x.beginPath();x.moveTo(U(s*.06),V(.84));x.lineTo(U(s*.24),V(.82));x.stroke()}x.fillStyle='#d8dbe2';for(const y of [.8,.74])dot(x,U(0),V(y),3.5);
      x.fillStyle='#46d37a';ell(x,U(.24),V(.7),9,9*AR);x.fill();sheen(x,.12)},
    headbandB('#46d37a'),'#ffffff','#ffffff'],
  ['Boxing Champ','#e8282b','#ffcf3d',(x,c)=>{fillC(x,c);bandY(x,'#e8282b',.04,.56);bandY(x,'#ffffff',.5,.6);bandY(x,'#e8282b',.53,.56);
      sideStripe(x,'#ffffff',10,.04,.5);x.strokeStyle='rgba(36,22,63,.25)';x.lineWidth=3;x.beginPath();x.moveTo(U(0),V(.5));x.lineTo(U(0),V(.2));x.stroke();sheen(x,.2)},
    b=>{helmetB(b,'#e8282b',.46);for(const s of [-1,1])b.add(Sph(.12,10,8),'#e8282b',[s*.35,.22,.24],null,[.6,1,1]);
      b.add(Tor(.43,.055,6,30),'#ffcf3d',[0,-.39,0],[Math.PI/2,0,0]).add(Cyl(.13,.13,.04,18),'#ffcf3d',[0,-.39,.44],[Math.PI/2,0,0]).add(Sph(.05,10,8),'#e8282b',[0,-.39,.47]);
      for(const s of [-1,1])b.add(Box(.09,.1,.03),'#ffe58a',[s*.2,-.39,.4],[0,s*.45,0])},'#e8282b','#ffffff'],
  ['Track Star','#ff3b5c','#ffffff',(x,c)=>{fillC(x,'#ff3b5c');bandY(x,c,NECK-.02,BODY_H+.1);x.fillStyle=c;for(const s of [-1,1]){ell(x,U(s*SIDE),V(.82),.15*PXU,.13*PXV);x.fill()}
      neck(x,c,null,.12,.2);sideStripe(x,'#ffffff',8,.3,.86);bandY(x,'#1f3b73',0,.3);
      x.fillStyle='#ffffff';x.fillRect(U(-.17),V(.8),.34*PXU,V(.5)-V(.8));x.strokeStyle='#b9bfca';x.lineWidth=2;x.strokeRect(U(-.17),V(.8),.34*PXU,V(.5)-V(.8));
      x.fillStyle='#c9d1da';for(const [u,y] of [[-.15,.78],[.15,.78],[-.15,.52],[.15,.52]])dot(x,U(u),V(y),3);
      num(x,'205','#1e1b24',null,36,U(0),.645);x.fillStyle='#ff3b5c';x.fillRect(U(-.15),V(.765),.3*PXU,5);sheen(x,.15)},
    null,null,'#9be84a'],
  ['Swim Team','#1f3b73','#ffd23f',(x,c)=>{fillC(x,c);bandY(x,'#1f3b73',.04,.46);sideStripe(x,'#ffd23f',12,.04,.46);hem(x,'#ffd23f',.42,.02);sheen(x,.22)},
    b=>{const y=.48;b.add(Sph(.405,18,9,0,Math.PI*.5),'#ffd23f',[0,y,0],null,[1,.86,1.02]).add(Tor(.405,.018,4,28),'#e0b520',[0,y+.005,0],[Math.PI/2,0,0]);
      b.add(Tor(.38,.018,4,28),'#1e1b24',[0,.58,0],[Math.PI/2,-.0,0]);for(const s of [-1,1])b.add(Sph(.075,12,8),'#2ec5ff',[s*.11,.6,.33],[-.3,s*.25,0],[1,.75,.45]).add(Tor(.075,.016,4,14),'#1e1b24',[s*.11,.6,.345],[-.3,s*.25,0],[1,.75,1])},
    null,null],
  ['Ski Racer','#ff3b3b','#2e5ad9',(x,c)=>{fillC(x,'#ff3b3b');x.fillStyle='#ffffff';for(let i=0;i<5;i++){const x0=i*W/5;x.beginPath();x.moveTo(x0,V(.2));x.lineTo(x0+W/10,V(.55));x.lineTo(x0+W/5,V(.2));x.lineTo(x0+W/5,V(.32));x.lineTo(x0+W/10,V(.67));x.lineTo(x0,V(.32));x.fill()}
      x.fillStyle='#2e5ad9';for(let i=0;i<5;i++){const x0=i*W/5;x.beginPath();x.moveTo(x0,V(.32));x.lineTo(x0+W/10,V(.67));x.lineTo(x0+W/5,V(.32));x.lineTo(x0+W/5,V(.4));x.lineTo(x0+W/10,V(.75));x.lineTo(x0,V(.4));x.fill()}
      neck(x,c,'#2e5ad9',.04,.24);x.fillStyle='#ffffff';x.fillRect(U(-.15),V(.86),.3*PXU,V(.78)-V(.86));num(x,'3','#ff3b3b',null,30,U(0),.82);sheen(x,.3)},
    b=>{helmetB(b,'#ff3b3b',.47);topStripe(b,'#ffffff',.475,.03);visorBand(b,'#ff9f1a',.49,.29,.38,.62);b.add(Tor(.42,.025,4,28),'#1e1b24',[0,.55,-.0],[Math.PI/2,0,0]);
      for(const s of [-1,1])b.add(Box(.05,.11,.05),'#1e1b24',[s*Math.sin(.62)*.47,.58,Math.cos(.62)*.47],[0,s*.62,0])},'#ff3b3b','#ffffff'],
  ['Racing Driver','#ff6b1a','#1e1b24',(x,c)=>{fillC(x,'#ff6b1a');
      for(const y0 of [.34,.74]){for(let i=0;i<32;i++)for(let r=0;r<2;r++){x.fillStyle=(i+r)%2?'#ffffff':'#1e1b24';x.fillRect(i*W/32,V(y0+.045*(r+1)),W/32+.5,V(y0)-V(y0+.045)+.5)}}
      sideStripe(x,'#1e1b24',14,0,.34);neck(x,c,'#1e1b24',.04,.24);
      x.fillStyle='#ffffff';for(const [u,y] of [[-.22,.58],[.22,.58]]){x.beginPath();x.roundRect?x.roundRect(U(u)-18,V(y)-12,36,24,5):x.rect(U(u)-18,V(y)-12,36,24);x.fill()}
      x.fillStyle='#ff6b1a';starAt(x,U(-.22),V(.58),9);x.fillStyle='#1f3b73';x.fillRect(U(.22)-12,V(.58)-6,24,4);x.fillRect(U(.22)-12,V(.58)+2,24,4);
      num(x,'1','#ffffff','#1e1b24',70,W,.56);sheen(x,.22)},
    b=>{helmetB(b,'#ffffff',.48);topStripe(b,'#ff6b1a',.485,.05);visorBand(b,'#3b4a6b',.5,.18,.3,.75);for(const s of [-1,1])b.add(Cyl(.035,.035,.03,10),'#9aa4b0',[s*Math.sin(.75)*.48,.6,Math.cos(.75)*.48],[0,0,Math.PI/2]);
      b.add(Tor(.44,.04,5,28),'#1e1b24',[0,.08,0],[Math.PI/2,0,0])},'#ff6b1a','#1e1b24'],
  ['Referee','#ffffff','#1e1b24',(x,c)=>{fillC(x,'#ffffff');vStripes(x,'#1e1b24',22,.36,NECK);bandY(x,'#2a2830',0,.36);neck(x,c,'#1e1b24',.06,.24);
      x.fillStyle='#ffd23f';x.fillRect(U(.18)-10,V(.76),20,14);sheen(x,.15)},
    b=>{b.add(Tor(.45,.01,4,34),'#1e1b24',[0,.03,0],[Math.PI/2+.42,0,0]).add(Cyl(.036,.036,.12,10),'#c9d1da',[0,-.18,.455],[0,0,Math.PI/2]).add(Sph(.045,10,8),'#c9d1da',[.06,-.18,.455]).add(Box(.04,.03,.03),'#c9d1da',[-.03,-.15,.455])},
    '#ffffff','#1e1b24'],
  ['Team Mascot','#ffb21f','#2e5ad9',(x,c)=>{fillC(x,'#ffb21f');fur(x,'#ffd36a',61,420,9);fur(x,'#e0901a',62,260,7);
      x.fillStyle='#fff1c9';ell(x,U(0),V(.3),.42*PXU,.36*PXV);x.fill();
      bandY(x,'#2e5ad9',.42,.66);hem(x,'#ffffff',.62,.025);hem(x,'#ffffff',.42,.025);num(x,'00','#ffffff','#14306e',48,W,.54);sheen(x,.12)},
    b=>{b.add(Cone(.12,.26,10),'#ff7a1a',[0,.58,.44],[Math.PI/2,0,0],[1.1,1,.7]).add(Cone(.08,.16,10),'#e85f0c',[0,.5,.4],[Math.PI/2+.25,0,0],[1.1,1,.6]);
      for(const s of [-1,1])b.add(Sph(.12,14,10),'#ffffff',[s*.13,.68,.27],null,[1,1.15,.6]).add(Sph(.055,10,8),'#1b1430',[s*.12,.68,.34]).add(Box(.17,.035,.03),'#c96a10',[s*.13,.83,.24],[-.3,0,-s*.3]);
      for(let i=-1;i<=1;i++)b.add(Sph(.1,10,8),i?'#e8282b':'#ff4d4d',[i*.07,.88,-.05+Math.abs(i)*-.05],[-.3,0,-i*.4],[.45,1.6,.45]);
      for(let i=-2;i<=2;i++)b.add(Sph(.14,10,8),i%2?'#ff8a1f':'#e8282b',[i*.09,-.42,-.47],[-.9,0,i*.35],[.4,1.4,.25]);
      for(let i=0;i<8;i++)b.add(Tor(.45,.065,6,6,TAU/8+.02),i%2?'#ffffff':'#2e5ad9',[0,.1,0],[Math.PI/2,0,i*TAU/8]);
      b.add(Box(.13,.28,.05),'#2e5ad9',[.22,-.08,.44],[-.15,0,.12]).add(Box(.13,.07,.052),'#ffffff',[.235,-.15,.44],[-.15,0,.12])},'#ffb21f','#ff7a1a'],
  ['Karate Gi','#ffffff','#1e1b24',(x,c)=>{fillC(x,'#fbfbf8');neck(x,c,null,.36,.12);
      x.fillStyle='#fbfbf8';poly(x,[[-.14,NECK+.01],[-.02,NECK+.01],[.26,.46],[.12,.46]]);x.strokeStyle='rgba(120,120,140,.5)';x.lineWidth=3;
      x.beginPath();x.moveTo(U(-.13),V(NECK));x.lineTo(U(.14),V(.46));x.stroke();x.beginPath();x.moveTo(U(.14),V(NECK));x.lineTo(U(.04),V(.72));x.stroke();
      bandY(x,'#1e1b24',.38,.46);x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=2;x.beginPath();x.moveTo(0,V(.42));x.lineTo(W,V(.42));x.stroke();sheen(x,.12)},
    b=>{b.add(Sph(.065,10,8),'#1e1b24',[0,-.38,.43],null,[1.3,1,.7]);for(const s of [-1,1])b.add(Box(.07,.26,.025),'#1e1b24',[s*.06,-.52,.43],[-.1,0,s*.25]);
      headbandB('#e8282b',.6,.362)(b);for(const s of [-1,1])b.add(Box(.07,.26,.02),'#e8282b',[s*.06,.47,-.38],[.25,0,s*.35])},'#fbfbf8',null],
  ['Golf Pro','#2e5ad9','#46d37a',(x,c)=>{fillC(x,'#ffffff');bandY(x,'#e3d3a8',0,.36);
      x.save();x.beginPath();x.rect(0,V(.86),W,V(.36)-V(.86));x.clip();fillC(x,'#2e5ad9');const s=W/14,h=(V(.36)-V(.86))/3;
      for(let r=0;r<4;r++)for(let i=0;i<15;i++){x.fillStyle=(i+r)%2?'#46d37a':'#2a4fbf';const cx=i*s+(r%2)*s/2,cy=V(.86)+r*h;x.beginPath();x.moveTo(cx,cy-h/2);x.lineTo(cx+s/2,cy);x.lineTo(cx,cy+h/2);x.lineTo(cx-s/2,cy);x.fill()}
      x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=1.5;for(let i=-14;i<28;i++){x.beginPath();x.moveTo(i*s,V(.86));x.lineTo(i*s+h*3*.5,V(.36));x.stroke();x.beginPath();x.moveTo(i*s,V(.86));x.lineTo(i*s-h*3*.5,V(.36));x.stroke()}x.restore();
      neck(x,c,'#ffffff',.2,.18);x.fillStyle='#ffffff';for(const s2 of [-1,1])poly(x,[[s2*.02,NECK-.02],[s2*.24,NECK+.02],[s2*.2,.84],[s2*.04,.86]]);sheen(x,.12)},
    b=>{const y=.55;b.add(Sph(.4,18,8,0,Math.PI/2),'#8a7258',[0,y,-.02],null,[1.02,.72,1.12]).add(Cyl(.2,.2,.03,16),'#7a6248',[0,y+.02,.33],[.2,0,0],[1,1,.55]).add(Sph(.035,8,6),'#7a6248',[0,y+.21,.03])},
    '#ffffff','#ffffff'],
  ['Cheer Squad','#ff4f9a','#ffffff',(x,c)=>{fillC(x,'#ff4f9a');bandY(x,c,NECK-.02,BODY_H+.1);x.fillStyle=c;for(const s of [-1,1]){ell(x,U(s*SIDE),V(.8),.15*PXU,.13*PXV);x.fill()}
      neck(x,c,'#ffffff',.14,.2);x.fillStyle='#ffffff';poly(x,[[-.34,.72],[0,.56],[.34,.72],[.34,.66],[0,.5],[-.34,.66]]);
      bandY(x,'#ffffff',.42,.46);bandY(x,'#ff4f9a',.16,.42);x.strokeStyle='rgba(120,10,60,.35)';x.lineWidth=3;for(let i=0;i<26;i++){x.beginPath();x.moveTo(i*W/26,V(.42));x.lineTo(i*W/26+3,V(.16));x.stroke()}hem(x,'#ffffff',.16,.025);sheen(x,.16)},
    b=>{for(const s of [-1,1])b.add(Sph(.17,12,8),'#ffffff',[s*.19,.8,-.12],[-.5,0,s*.4],[1.4,.9,.45]);b.add(Sph(.075,8,6),'#ffffff',[0,.8,-.13]);for(const s of [-1,1])b.add(Box(.07,.2,.025),'#ffffff',[s*.07,.66,-.28],[.5,0,s*.3])},
    null,'#ffffff'],
  // ---------------- PIRATES ----------------
  ['Pirate Captain','#b3202a','#e8b923',(x,c)=>{fillC(x,'#b3202a');bandY(x,'#1e1b24',0,.14);
      bandY(x,c,NECK,BODY_H+.1);x.fillStyle='#fbf3e0';poly(x,[[-.22,NECK+.02],[0,.62],[.22,NECK+.02]]);x.strokeStyle='#e6d6b4';x.lineWidth=3;for(let i=0;i<4;i++){x.beginPath();x.moveTo(U(-.16+i*.02),V(.86-i*.06));x.quadraticCurveTo(U(0),V(.8-i*.06),U(.16-i*.02),V(.86-i*.06));x.stroke()}
      x.fillStyle='#e8b923';for(const s of [-1,1]){x.fillRect(U(s*.2)-3,V(NECK),6,V(.14)-V(NECK));for(const y of [.76,.64,.52,.4,.28])dot(x,U(s*.28),V(y),5)}
      bandY(x,'#3b2416',.4,.47);x.fillStyle='#e8b923';x.fillRect(U(0)-14,V(.475),28,V(.395)-V(.475));x.fillStyle='#3b2416';x.fillRect(U(0)-7,V(.455),14,V(.415)-V(.455));
      hem(x,'#e8b923',.14,.025);sheen(x,.2)},
    b=>{tricornB(b,'#1e1b24','#e8b923');b.add(Sph(.09,10,8),'#ffffff',[.3,.82,-.05],[0,0,-.9],[.5,1.9,.5])},'#b3202a','#1e1b24',eyePatch],
  ['Deckhand','#ffffff','#1f3b73',(x,c)=>{fillC(x,'#ffffff');for(let i=0;i<8;i++)bandY(x,'#1f3b73',.36+i*.07,.36+i*.07+.035);bandY(x,'#c9a46a',0,.36);
      x.strokeStyle='#8a6a3a';x.lineWidth=5;x.setLineDash([7,4]);x.beginPath();x.moveTo(0,V(.37));x.lineTo(W,V(.37));x.stroke();x.setLineDash([]);
      x.fillStyle='#b8925a';for(let i=0;i<10;i++){x.beginPath();x.moveTo(i*W/10,V(.0));x.lineTo(i*W/10+W/20,V(.06));x.lineTo(i*W/10+W/10,V(0));x.fill()}
      neck(x,c,null,.1,.24);x.fillStyle='rgba(120,90,50,.35)';dot(x,U(.3),V(.2),8);dot(x,U(-.5),V(.1),6);sheen(x,.15)},
    bandanaB('#d9312b'),'#ffffff',null,eyePatch],
  ['Parrot Pal','#3f6e1d','#e8282b',(x,c)=>{fillC(x,'#fbf3e0');bandY(x,'#2a2830',0,.34);bandY(x,'#e8282b',.34,.44);
      x.fillStyle='#6b4a1f';for(const s of [-1,1])poly(x,[[s*.08,NECK],[s*.7,NECK],[s*.7,.44],[s*.16,.44]]);x.fillStyle='#6b4a1f';x.fillRect(0,V(NECK),W*.18,V(.44)-V(NECK));x.fillRect(W*.82,V(NECK),W*.18,V(.44)-V(NECK));
      x.fillStyle='#e8b923';for(const s of [-1,1])for(const y of [.74,.6])dot(x,U(s*.2),V(y),4);neck(x,c,null,.08,.2);sheen(x,.16)},
    b=>{bandanaB('#2e5ad9')(b);const P=[.43,.25,.02];
      b.add(Sph(.1,12,10),'#2fb85a',P,[.25,0,-.15],[.8,1.25,.85]).add(Sph(.075,12,10),'#e8282b',[P[0]+.01,P[1]+.14,P[2]+.03]).add(Cone(.03,.08,8),'#ffd23f',[P[0]+.015,P[1]+.13,P[2]+.12],[Math.PI/2+.4,0,0]);
      b.add(Sph(.07,10,8),'#1e8a45',[P[0]+.06,P[1]-.01,P[2]-.02],[.2,0,-.2],[.5,1.2,.9]).add(Box(.05,.22,.02),'#2e5ad9',[P[0]-.01,P[1]-.17,P[2]-.07],[.5,0,0]).add(Box(.04,.18,.02),'#ffd23f',[P[0]+.03,P[1]-.15,P[2]-.07],[.5,0,-.15]);
      for(const s of [-1,1])b.add(Sph(.018,6,4),'#1b1430',[P[0]+s*.045,P[1]+.16,P[2]+.08])},'#fbf3e0','#2a2830',eyePatch],
  ['Ghost Pirate','#bff5e6','#5fc9b4',(x,c)=>{fillC(x,'#c8f7ea');const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
      x.fillStyle='#7fd6c4';x.beginPath();x.moveTo(0,V(NECK));for(let i=0;i<=16;i++){x.lineTo(i*W/16,V(i%2?.08:.24))}x.lineTo(W,V(NECK));x.fill();
      x.fillStyle='#c8f7ea';x.beginPath();x.moveTo(U(-.24),V(NECK));x.lineTo(U(0),V(.5));x.lineTo(U(.24),V(NECK));x.fill();
      x.fillStyle='#e8fff9';for(const s of [-1,1])for(const y of [.74,.6,.46])dot(x,U(s*.28),V(y),5);
      x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=3;const R=G.rng(71);for(let i=0;i<14;i++){const cx=R()*W,cy=V(.1+R()*.7);x.beginPath();x.moveTo(cx,cy);x.bezierCurveTo(cx+10,cy-12,cx-10,cy-24,cx,cy-36);x.stroke()}
      sheen(x,.1)},
    b=>{tricornB(b,'#8fd9c8',null,true);b.add(Sph(.05,8,6),'#e8fff9',[0,.86,.18])},'#bff5e6','#8fd9c8',x=>{eyePatch(x)}],
  // ---------------- MOBSTERS AND SUITS ----------------
  ['Pinstripe Suit','#2b3550','#e8282b',(x,c)=>{suit(x,c,{jacket:'#2b3550',pin:'rgba(220,226,240,.55)',shirt:'#ffffff',tie:'#e8282b',tieS:'#a3141c',lap:'#232b42',sq:'#ffffff'});
      x.fillStyle='#e8282b';heart(x,U(-.34),V(.76),5);sheen(x,.18)},
    fedoraB('#4a5163','#1e1b24'),'#2b3550','#f7f5ee'],
  ['The Boss','#b98a52','#7a6250',(x,c)=>{suit(x,c,{jacket:'#b98a52',shirt:'#ffffff',tie:'#3a2f4a',lap:'#a3763f',vb:.56,btn:'#5a3a1a'});
      x.fillStyle='#2a2830';x.fillRect(U(-.06),V(.56),.12*PXU,V(.0)-V(.56));
      bandY(x,'#a3763f',.42,.47);x.fillStyle='#e8b923';x.fillRect(U(.3)-8,V(.475),16,V(.415)-V(.475));
      x.strokeStyle='rgba(90,58,26,.35)';x.lineWidth=3;for(const s of [-1,1]){x.beginPath();x.moveTo(U(s*.06),V(.56));x.lineTo(U(s*.06),V(0));x.stroke()}
      x.fillStyle='#fbfbf8';poly(x,[[-.42,.92],[-.3,.92],[-.2,.62],[-.3,.58]]);sheen(x,.18)},
    b=>{b.add(Tor(.44,.085,8,28),'#7a6250',[0,.09,-.02],[Math.PI/2+.12,0,0]);const R=G.rng(43);for(let i=0;i<18;i++){const a=R()*TAU;b.add(Sph(.05,6,5),'#8f7663',[Math.sin(a)*.47,.09-Math.cos(a)*.05,Math.cos(a)*.47-.02])}
      furHatB('#7a6250')(b)},'#b98a52','#2a2830'],
  ['Tracksuit Tough Guy','#2e5ad9','#ffcf3d',(x,c)=>{fillC(x,'#2e5ad9');for(const off of [-10,6])for(const s of [-1,1]){x.fillStyle='#ffffff';x.fillRect(U(s*SIDE)+off,0,5,V(0)-V(NECK)+H)}
      neck(x,c,'#ffffff',.02,.24);x.fillStyle='#ffffff';x.fillRect(U(0)-2,V(NECK),4,V(.38)-V(NECK));x.fillStyle='#c9d1da';x.fillRect(U(0)-4,V(.86),8,10);
      bandY(x,'#2448b8',.36,.4);x.strokeStyle='rgba(255,255,255,.18)';x.lineWidth=2;for(let i=0;i<14;i++){x.beginPath();x.moveTo(i*W/14,V(.6));x.quadraticCurveTo(i*W/14+12,V(.5),i*W/14,V(.42));x.stroke()}sheen(x,.25)},
    b=>chainB(b,'#ffcf3d','#ffe58a'),'#2e5ad9','#ffffff'],
  ['Bodyguard','#34323c','#1e1b24',(x,c)=>{suit(x,c,{jacket:'#3a3844',shirt:'#ffffff',tie:'#1e1b24',lap:'#2e2c37',btn:'#16141c'});sheen(x,.25)},
    b=>{b.add(Sph(.045,8,6),'#e8e0d0',[.43,.3,.04]);for(let i=0;i<5;i++)b.add(Tor(.022,.007,4,10),'#e8e0d0',[.44,.24-i*.04,-.03],[Math.PI/2,0,0])},'#3a3844','#1e1b24',shades],
  ['Tuxedo','#2a2830','#ffffff',(x,c)=>{suit(x,c,{jacket:'#2f2d36',shirt:'#ffffff',lap:'#4a4756',vb:.44,btn:'#4a4756'});
      x.fillStyle='#1e1b24';for(const y of [.8,.7,.6])dot(x,U(0),V(y),3.5);x.fillStyle='#d9312b';heart(x,U(-.34),V(.78),6);x.fillStyle='#2e8b3a';dot(x,U(-.32),V(.72),3);sheen(x,.25)},
    b=>{bowTieB(b,'#1e1b24');topHatB('#2f2d36','#4a4756')(b)},'#2f2d36','#1e1b24'],
  ['Business Suit','#6b7280','#2e5ad9',(x,c)=>{suit(x,c,{jacket:'#6b7280',shirt:'#e9f1ff',tie:'#2e5ad9',tieS:'#9fc3ff',lap:'#5d6472',sq:'#e9f1ff'});sheen(x,.2)},
    null,'#6b7280','#5a3a22'],
  // ---------------- ROBOTS ----------------
  ['Tin Robot','#aab3bd','#e8282b',(x,c)=>{const g=x.createLinearGradient(0,0,W,0);for(let i=0;i<=8;i++)g.addColorStop(i/8,i%2?'#bcc5cf':'#9ea8b4');x.fillStyle=g;x.fillRect(0,0,W,H);
      x.strokeStyle='rgba(60,70,85,.55)';x.lineWidth=3;for(const y of [.2,.86,1.45]){x.beginPath();x.moveTo(0,V(y));x.lineTo(W,V(y));x.stroke()}rivets(x,'rgba(60,70,85,.6)',[.24,.82,1.41],24);
      x.fillStyle='#7d8794';x.beginPath();x.roundRect?x.roundRect(U(-.24),V(.78),.48*PXU,V(.3)-V(.78),8):x.rect(U(-.24),V(.78),.48*PXU,V(.3)-V(.78));x.fill();
      [['#e8282b',-.14],['#ffd23f',-.04],['#46d37a',.06]].forEach(([cc,u])=>{x.fillStyle=cc;dot(x,U(u),V(.7),6)});x.fillStyle='#ffffff';ell(x,U(.15),V(.5),20,20*AR);x.fill();
      x.strokeStyle='#1e1b24';x.lineWidth=3;x.beginPath();x.moveTo(U(.15),V(.5));x.lineTo(U(.15)+12,V(.5)-8);x.stroke();x.fillStyle='#2ec5ff';for(let i=0;i<4;i++)x.fillRect(U(-.2)+i*10,V(.44),6,V(.34)-V(.44));sheen(x,.25)},
    b=>{b.add(Cyl(.025,.025,.26,8),'#7d8794',[0,.92,0]).add(Sph(.065,10,8),'#e8282b',[0,1.07,0]).add(Cyl(.08,.08,.03,12),'#7d8794',[0,.8,0]);
      for(const s of [-1,1])b.add(Cyl(.085,.085,.08,12),'#8a949f',[s*.43,.32,0],[0,0,Math.PI/2]).add(Cyl(.04,.04,.07,8),'#e8282b',[s*.49,.32,0],[0,0,Math.PI/2]);
      b.add(Cyl(.03,.03,.18,8),'#c9a46a',[0,-.15,-.5],[Math.PI/2,0,0]);for(const s of [-1,1])b.add(Sph(.075,10,8),'#e8b923',[s*.07,-.15,-.6],null,[1,1.2,.3])},'#8a949f','#6b7480'],
  ['Sleek Android','#f4f7fb','#2ec5ff',(x,c)=>{fillC(x,'#f4f7fb');const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(160,180,205,.35)');x.fillStyle=g;x.fillRect(0,0,W,H);
      x.strokeStyle='#2ec5ff';x.lineWidth=3.5;x.lineJoin='round';const R=G.rng(81);for(let i=0;i<16;i++){let X=R()*W,Y=V(.05+R()*.75);x.beginPath();x.moveTo(X,Y);for(let k=0;k<3;k++){if(k%2)X+=(R()-.5)*60;else Y-=10+R()*24;x.lineTo(X,Y)}x.stroke();x.fillStyle='#2ec5ff';dot(x,X,Y,4)}
      x.strokeStyle='rgba(150,165,185,.6)';x.lineWidth=2;for(const y of [.86,.36]){x.beginPath();x.moveTo(0,V(y));x.lineTo(W,V(y));x.stroke()}x.fillStyle='#2ec5ff';ell(x,U(0),V(.66),14,14*AR);x.fill();x.fillStyle='#e6fbff';ell(x,U(0),V(.66),6,6*AR);x.fill();sheen(x,.2)},
    b=>{for(const s of [-1,1])b.add(Cyl(.12,.12,.05,20),'#e6ecf3',[s*.43,.32,0],[0,0,Math.PI/2]).add(Cyl(.075,.075,.06,18),'#2ec5ff',[s*.445,.32,0],[0,0,Math.PI/2]);b.add(Tor(.38,.018,4,30,Math.PI),'#2ec5ff',[0,.38,0],[0,Math.PI/2,0])},'#e6ecf3','#9fb0c4'],
  ['Junkyard Bot','#b0683a','#7d8794',(x,c)=>{fillC(x,'#b0683a');const R=G.rng(91),P=['#7d8794','#5f9e8f','#c9a14a','#8a5a3a','#9aa4b0'];
      for(let i=0;i<16;i++){const cx=R()*W,cy=R()*H,w=30+R()*50,h=20+R()*36;x.fillStyle=P[i%5];wrap(cx,X=>{x.fillRect(X-w/2,cy-h/2,w,h);x.fillStyle='rgba(40,30,25,.55)';for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]])dot(x,X+dx*(w/2-5),cy+dy*(h/2-5),2.5);x.fillStyle=P[i%5]},60)}
      x.fillStyle='rgba(120,60,25,.45)';for(let i=0;i<24;i++){const cx=R()*W,cy=R()*H;x.fillRect(cx,cy,3,10+R()*16)}num(x,'B-7','#f2e6c9',null,30,U(.3),.55);sheen(x,.2)},
    b=>{b.add(Cyl(.02,.02,.22,6),'#7d8794',[.1,.9,0],[0,0,-.35]).add(Cyl(.02,.02,.16,6),'#7d8794',[.2,1.05,0],[0,0,.6]).add(Sph(.045,8,6),'#ffd23f',[.14,1.12,0]);
      for(let i=0;i<5;i++)b.add(Tor(.05,.012,4,12),'#c9d1da',[-.16,.8+i*.035,0],[Math.PI/2,0,0]);b.add(Sph(.04,8,6),'#e8282b',[-.16,.99,0]);
      b.add(Cyl(.09,.11,.08,6),'#7d8794',[-.43,.32,0],[0,0,Math.PI/2]).add(Cyl(.1,.1,.05,16),'#5f9e8f',[.43,.3,0],[0,0,Math.PI/2]).add(Tor(.06,.012,4,12),'#2a2a33',[.46,.3,0],[0,Math.PI/2,0])},'#7d8794','#5a6370'],
  // ---------------- AND MORE ----------------
  ['Wizard','#6a3cc8','#ffd23f',(x,c)=>{fillC(x,'#6a3cc8');x.fillStyle='#ffd23f';const R=G.rng(97);for(let i=0;i<22;i++){const cx=R()*W,cy=V(.05+R()*.8);wrap(cx,X=>starAt(x,X,cy,6+R()*5),14)}
      for(let i=0;i<5;i++){const cx=R()*W,cy=V(.15+R()*.6);x.fillStyle='#fff3b0';wrap(cx,X=>{ell(x,X,cy,10,10*AR);x.fill();x.fillStyle='#6a3cc8';ell(x,X+5,cy-2,9,9*AR);x.fill();x.fillStyle='#fff3b0'},14)}
      hem(x,'#ffd23f',.02,.05);bandY(x,'#ffd23f',.44,.48);neck(x,c,'#ffd23f',.08,.26);sheen(x,.18)},
    b=>{b.add(Cyl(.52,.52,.025,26),'#5a30b0',[0,.64,0]).add(Cyl(.27,.33,.24,20),'#6a3cc8',[0,.77,0]).add(Cyl(.275,.31,.06,20,true),'#ffd23f',[0,.68,0]);
      b.add(Cyl(.18,.27,.24,18),'#6a3cc8',[0,1,-.04],[-.2,0,0]).add(Cyl(.09,.18,.22,16),'#6a3cc8',[0,1.2,-.14],[-.5,0,0]).add(Cone(.09,.24,14),'#6a3cc8',[0,1.33,-.3],[-1.05,0,0]);
      b.add(Sph(.04,8,6),'#ffd23f',[0,1.41,-.42]);starPts(b,'#ffd23f',[.2,.8,.2],.06);
      for(const [bx,by,r] of [[0,-.06,.17],[-.13,-.02,.12],[.13,-.02,.12],[-.08,-.2,.13],[.08,-.2,.13],[0,-.32,.12],[0,-.44,.08]])b.add(Sph(r,12,9),'#f7f5ee',[bx,by,.4+(by<-.3?.01:0)],null,[1,1.1,.5])},'#6a3cc8','#3b2a7a'],
  ['Firefighter','#c9a24a','#ffd23f',(x,c)=>{fillC(x,'#c9a24a');for(const y of [.22,.56]){bandY(x,'#ffd23f',y,y+.07);bandY(x,'#e6ecf3',y+.022,y+.048)}
      neck(x,c,'#1e1b24',.02,.24);x.fillStyle='#1e1b24';x.fillRect(U(0)-3,V(NECK),6,V(.04)-V(NECK));for(const y of [.8,.68,.44,.32])x.fillRect(U(0)-10,V(y)-3,20,6);sheen(x,.2)},
    b=>{b.add(Sph(.45,22,9,0,Math.PI*.45),'#e8282b',[0,.4,0]).add(Cyl(.56,.56,.03,26),'#d9312b',[0,.44,-.1],[-.12,0,0],[.88,1,1.12]);
      b.add(Box(.06,.08,.62),'#d9312b',[0,.84,-.02]).add(Box(.2,.24,.03),'#ffcf3d',[0,.66,.42],[-.35,0,0]).add(Sph(.05,10,8),'#e8282b',[0,.66,.44],null,[1,1,.4])},'#c9a24a','#1e1b24']
);
// a little five-point star of spheres (the wizard hat's badge)
function starPts(b,c,p,r){for(let i=0;i<5;i++){const a=i/5*TAU;b.add(Sph(r*.45,6,4),c,[p[0]+Math.sin(a)*r*.6,p[1]+Math.cos(a)*r*.6,p[2]])}b.add(Sph(r*.5,6,4),c,p)}
DANCES.push(
  ['Touchdown Spike','#d9312b','#ffffff',(B,t)=>{const p=(t*.8)%1;B.tilt.rotation.set(0,0,0);B.tilt.position.y=.8;
    if(p<.4){const u=p/.4;B.tilt.rotation.x=-.18*u;arms(B,0,.5,0,.4+2.5*u)}
    else if(p<.55){const u=(p-.4)/.15;B.tilt.rotation.x=-.18+.5*u;arms(B,0,.5,-1.4*u,2.9-2.5*u)}
    else{const u=(p-.55)/.45,h=Math.abs(Math.sin(u*Math.PI*3));B.tilt.position.y=.8+h*.3;B.tilt.rotation.z=Math.sin(u*Math.PI*6)*.12;arms(B,0,2.5+h*.3,0,2.5+h*.3)}}],
  ['Boxer Shuffle','#e8282b','#ffcf3d',(B,t)=>{const s=Math.sin(t*14),j=Math.floor(t*3)%2,ph=(t*3)%1,jab=ph<.35?Math.sin(ph/.35*Math.PI):0;
    B.tilt.position.y=.8+Math.abs(s)*.05;B.tilt.rotation.set(.12,Math.sin(t*3)*.25,0);arms(B,-1.25-(j?0:jab*.7),.3,-1.25-(j?jab*.7:0),.3);B.legs[0].rotation.x=s*.35;B.legs[1].rotation.x=-s*.35}],
  ['Hornpipe Jig','#1f3b73','#ffffff',(B,t)=>{const s=Math.sin(t*4*Math.PI);B.tilt.position.y=.8+Math.abs(s)*.18;B.tilt.rotation.set(0,0,s*.12);arms(B,-1,-.2,-1,-.2);
    B.legs[0].rotation.x=-Math.max(0,s)*1.1;B.legs[1].rotation.x=-Math.max(0,-s)*1.1}],
  ['Big Boss Shrug','#b98a52','#e8b923',(B,t)=>{const p=(t/2.4)%1,u=Math.sin(Math.min(1,p*2.5)*Math.PI/2),k=p<.7?u:u*(1-(p-.7)/.3);
    B.tilt.rotation.set(-.14*k,Math.sin(t*.8)*.15,0);B.tilt.position.y=.8+k*.05+Math.sin(t*5)*.01*k;arms(B,-.55*k,.3+.95*k,-.55*k,.3+.95*k)}]
);
const LISTS=[COLOURS,PREMIUM,PATTERNS,PANTS,HATS,FACES,COSTUMES,DANCES,SCREAMS,SPLASHES];
const item=(k,i)=>k&&k[i]?LISTS[i][k[i]-1]||null:null;

// =====================================================================
//  Dressing a bean
// =====================================================================
const GEO={};
function geoOf(key,build){if(!GEO[key]){const b=Build();build(b);GEO[key]=b.done()}return GEO[key]}
let PROP=null;
function propGeo(){if(!PROP){const b=Build();b.add(Box(.42,.012,.07),'#ff4f9a',[0,0,0],[.25,0,0]).add(Box(.07,.012,.42),'#2ec5ff',[0,0,0],[0,0,.25]);PROP=b.done()}return PROP}
function undress(B){
  if(B.kit&&!B.cl){B.kit=null;return}
  const c=B.cl;if(!c)return;
  for(const m of c.parts)B.tilt.remove(m);
  if(c.mat){B.body.material=B.mat=c.mat0;c.mat.dispose()}
  const L=B.limbMat;L.transparent=false;L.opacity=1;L.emissive.setScalar(0);L.needsUpdate=true;
  if(B.hat&&!B.crown)B.hat.visible=true;
  B.cl=null;
}
function dress(B,k){
  undress(B);B.kit=k||null;
  if(!k){const x=B.cv.getContext('2d');G.drawSkin(x,B.look);B.tex.needsUpdate=true;B.limbMat.color.set(B.look.c);B.footMat.color.set(shade(B.look.c,-.3));return}
  const c=B.cl={parts:[],mat:null,mat0:B.mat,prop:null,t:Math.random()*10,rb:0,glow:false,dance:0,screamed:false},cos=item(k,6),prem=cos?null:item(k,1);
  const add=g=>{const m=new THREE.Mesh(g,g.glass?[MAT,GLASS]:MAT);m.castShadow=false;B.tilt.add(m);c.parts.push(m);return m};
  // a premium colour gets the bean its own material (still one draw call)
  if(prem){
    const kind=prem[5];let m;
    if(kind==='gold')m=new THREE.MeshPhongMaterial({map:B.tex,specular:0xffe9a0,shininess:60,emissive:0x2a1c00});
    else if(kind==='chrome')m=new THREE.MeshPhongMaterial({map:B.tex,specular:0xffffff,shininess:110});
    else if(kind==='gum')m=new THREE.MeshPhongMaterial({map:B.tex,specular:0x553344,shininess:30});
    else if(kind==='glow'){m=new THREE.MeshLambertMaterial({map:B.tex,emissive:0x4dff7a,emissiveMap:B.tex,emissiveIntensity:.55});c.glow=true}
    else if(kind==='jelly'){m=new THREE.MeshLambertMaterial({map:B.tex,transparent:true,opacity:.72});B.limbMat.transparent=true;B.limbMat.opacity=.78;B.limbMat.needsUpdate=true}
    if(m){c.mat=m;B.body.material=B.mat=m}
    if(kind==='rainbow')c.rb=.001;
  }
  // what goes on the head: a costume's shape, else the undies on the head, else a hat
  let head=false;
  if(cos&&cos[4]){add(geoOf('cos'+k[6],cos[4]));head=true}
  else if(k[3]===HEAD_UNDIES){add(geoOf('undies',buildHeadUndies));head=true}
  else{const h=item(k,4);if(h){add(geoOf('hat'+k[4],h[3]));head=true;if(k[4]===2){c.prop=add(propGeo());c.prop.position.y=TOP-.2+.4}}}
  if(B.hat)B.hat.visible=!head&&!B.crown;
  repaint(B);
}
// paint the skin: body (costume, or colour / premium colour, then the pattern and the underpants), the face, the face extra
function repaint(B){
  const k=B.kit;if(!k){G.drawSkin(B.cv.getContext('2d'),B.look);B.tex.needsUpdate=true;return}
  const x=B.cv.getContext('2d'),look=B.look,cos=item(k,6),col=item(k,0),prem=cos?null:item(k,1),pat=item(k,2),pants=item(k,3),base=col?col[1]:look.c;
  let limb=base,foot=shade(base,-.3);
  x.save();
  if(cos){cos[3](x,base);limb=cos[5]||base;foot=cos[6]||shade(base,-.3)}
  else{
    if(prem){const t=B.cl?B.cl.t:0,kind=prem[5];prem[3](x,base,t);limb=kind==='jelly'?shade(base,.3):kind==='rainbow'?'#'+_c.setHSL((t*24%360)/360,.88,.62).getHexString():prem[4];foot=shade(limb,-.3)}
    else{x.fillStyle=base;x.fillRect(0,0,W,H)}
    if(pat){pat[3](x,base,look.pc);if(pat[4]){limb=pat[4];foot=shade(limb,-.3)}}else G.drawBody(x,Object.assign({},look,{c:'rgba(0,0,0,0)'}));   // the look's own pattern, over the new colour
    if(pants&&pants[3]){paintPants(x,pants);if(pants[8])limb=pants[8]}
  }
  x.restore();
  G.drawFace(x,look);
  if(cos&&cos[7]){x.save();cos[7](x);x.restore()}   // over the face: a pirate's eye patch, a bodyguard's shades
  const f=item(k,5);if(f){x.save();f[3](x);x.restore()}
  B.tex.needsUpdate=true;
  B.limbMat.color.set(limb);B.footMat.color.set(foot);
}
// every frame, for a bean wearing a kit: the propeller, the rainbow, the glow after a hit flash, the dance, the scream
function tick(e,dt,cheer){
  const B=e.bean,c=B.cl,k=B.kit;if(!c)return;
  c.t+=dt;
  if(c.prop)c.prop.rotation.y+=dt*(e.b.onGround?6:22);
  if(c.rb&&(c.rb-=dt)<=0){c.rb=.2;repaint(B)}
  if(c.glow&&!B.flashOn){B.mat.emissive.setHex(0x4dff7a);B.limbMat.emissive.setHex(0x1a6630)}
  if(B.crown)for(const m of c.parts)if(m.geometry!==GEO['cos'+k[6]])m.visible=false;
  const d=item(k,7);
  if(d&&cheer){c.dance+=dt;d[3](B,c.dance)}else c.dance=0;
  // a fall scream: falling fast and close to the slime (or off the bottom of the level)
  const b=e.b,L=G.G.L;
  if(b.onGround)c.screamed=false;
  else if(!c.screamed&&L&&b.vel.y<-6&&b.pos.y<L.kill+6&&!e.hidden){c.screamed=true;scream(k,b.pos,e.isMe)}
}
function scream(k,pos,mine){
  const s=item(k,8);const au=s&&G.audio();if(!au)return;
  let v=1;if(!mine&&pos){const d=G.camera.position.distanceTo(pos);v=clamp(1.25-d/30,0,1)*.8;if(v<.05)return}
  s[3](au,v,au.actx.currentTime);
}
function splash(e){const s=item(e.bean.kit,9);if(!s)return;const L=G.G.L;_s.copy(e.b.pos);s[3](new V3(e.b.pos.x,Math.max(e.b.pos.y,L?L.kill:e.b.pos.y),e.b.pos.z))}

// =====================================================================
//  This player's kit (saved as tumble-kit: '3.0.5.0.12.0.0.2.1.0')
// =====================================================================
let saved=G.kitOf(G.store.get('kit',''));
const mine=()=>saved;
function setMine(i,no){const k=(saved||Array(G.KIT_LEN).fill(0)).slice();k[i]=no;saved=G.kitOf(k);G.store.set('kit',G.kitStr(saved));G.kitChanged();if(man)dress(man,saved)}

// =====================================================================
//  The Closet: a panel beside (or, upright, below) the bean, which stands in the yard and turns
// =====================================================================
const CSS=`
#closetRow{display:flex;align-items:center;gap:10px;margin-top:12px}
#closetRow .note{margin:0}
#closet{pointer-events:none;display:flex;justify-content:flex-end;align-items:stretch;padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) 14px;overflow:hidden}
#closet .card{pointer-events:auto;width:min(460px,48vw);display:flex;flex-direction:column;min-height:0;padding:16px 16px 12px}
.cl-head{display:flex;align-items:center;gap:10px}
.cl-head h2{font-family:var(--f-d);font-weight:700;font-size:28px;margin:0;flex:1;line-height:1}
.cl-cap{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;background:var(--ink);color:var(--sun);border-radius:999px;padding:3px 9px;white-space:nowrap}
.cl-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0 6px}
.cl-tabs button{border:2px solid var(--ink);border-radius:999px;background:#fff;padding:4px 10px;font-weight:900;font-size:12.5px}
.cl-tabs button[aria-selected="true"]{background:var(--ink);color:var(--paper)}
#clNote{margin:2px 0 8px;font-size:12.5px}
.cl-grid{flex:1;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));gap:7px;align-content:start;padding:3px 3px 6px;overscroll-behavior:contain}
.cl-it{display:flex;align-items:center;gap:7px;border:2px solid var(--ink);border-radius:12px;background:#fff;padding:6px 8px;font-weight:800;font-size:13px;text-align:left;line-height:1.15;min-height:40px}
.cl-it i{flex:0 0 22px;height:22px;border-radius:50%;border:2px solid var(--ink)}
.cl-it[aria-pressed="true"]{background:var(--sun);box-shadow:0 3px 0 var(--ink)}
.cl-foot{display:flex;align-items:center;gap:8px;margin-top:10px}
.cl-foot .note{flex:1;margin:0;font-size:12px}
@media (orientation:portrait),(max-aspect-ratio:1/1){
  #closet{align-items:flex-end;justify-content:stretch;padding-left:max(10px,env(safe-area-inset-left));padding-right:max(10px,env(safe-area-inset-right))}
  #closet .card{width:100%;height:55%;padding:12px 12px 10px}
  .cl-head h2{font-size:23px}
  .cl-grid{grid-template-columns:repeat(auto-fill,minmax(108px,1fr))}
}
@media (orientation:landscape) and (max-height:520px){
  #closet{padding-top:max(8px,env(safe-area-inset-top));padding-bottom:max(8px,env(safe-area-inset-bottom))}
  #closet .card{width:min(440px,54vw);padding:10px 12px 8px}
  .cl-head h2{font-size:21px}.cl-tabs{margin:7px 0 4px}.cl-tabs button{padding:3px 8px;font-size:11.5px}#clNote{display:none}
  .cl-it{min-height:34px;padding:4px 7px;font-size:12px}
}`;
const NOTES=['Body colours. A premium colour or a costume goes over these.','Shiny, glowing, see-through and sparkly. Worn over your colour.','Patterns use your pattern colour from the menu where they can.',
  'Worn on the outside, as a joke. The last pair goes on your head instead of a hat.','One hat at a time. A costume or undies on the head takes its place.','Extras over your face.',
  'A whole costume around the same bean: same size, same hitbox, your face still shows.','Danced when you qualify from a race or win the crown.','Heard as you fall towards the slime.','Goes off as well as the slime when you are knocked out.'];
let built=false,open=false,tab=0,man=null,manB=null,manYaw=0,drag=null,show={dance:0,splash:0},gy=0,spot=null;
function build(){
  if(built)return;built=true;
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const sec=document.createElement('section');sec.id='closet';sec.className='overlay';sec.hidden=true;sec.setAttribute('aria-label','Closet');
  sec.innerHTML='<div class="card"><div class="cl-head"><h2>Closet</h2><span class="cl-cap">Captains only</span><button class="btn sm" id="clDone" type="button">Done</button></div>'+
    '<div class="cl-tabs" role="tablist" id="clTabs">'+TABS.map((t,i)=>'<button type="button" role="tab" data-t="'+i+'">'+t+'</button>').join('')+'</div>'+
    '<p class="note" id="clNote"></p><div class="cl-grid" id="clGrid" role="group"></div>'+
    '<div class="cl-foot"><p class="note">Drag the bean to turn it. Everything here is free for captains; it changes looks only.</p><button class="btn sm alt" id="clOff" type="button">Take it all off</button></div></div>';
  ($('app')||document.body).appendChild(sec);
  $('clTabs').onclick=ev=>{const b=ev.target.closest('button');if(b){tab=+b.dataset.t;render();G.sfx('ui')}};
  $('clGrid').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const no=+b.dataset.no;choose(tab,no);G.sfx('ui')};
  $('clDone').onclick=close;
  $('clOff').onclick=()=>{saved=null;G.store.set('kit','');G.kitChanged();if(man)dress(man,null);render()};
  addEventListener('keydown',ev=>{if(open&&ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();close()}},true);
  const cv=G.renderer.domElement;
  cv.addEventListener('pointerdown',ev=>{if(open){drag={id:ev.pointerId,x:ev.clientX}}});
  addEventListener('pointermove',ev=>{if(open&&drag&&drag.id===ev.pointerId){manYaw+=(ev.clientX-drag.x)*.012;drag.x=ev.clientX}});
  addEventListener('pointerup',ev=>{if(drag&&drag.id===ev.pointerId)drag=null});
  addEventListener('pointercancel',()=>{drag=null});
}
function swatch(it,i){
  if(i===0)return it[1];
  return 'linear-gradient(135deg,'+it[1]+' 50%,'+it[2]+' 50%)';
}
function render(){
  if(!built)return;
  for(const b of $('clTabs').children)b.setAttribute('aria-selected',String(+b.dataset.t===tab));
  $('clNote').textContent=NOTES[tab];
  const cur=saved?saved[tab]:0,list=LISTS[tab];
  $('clGrid').innerHTML='<button type="button" class="cl-it" data-no="0" aria-pressed="'+(cur===0)+'"><i style="background:#fff"></i><span>None</span></button>'+
    list.map((it,i)=>'<button type="button" class="cl-it" data-no="'+(i+1)+'" aria-pressed="'+(cur===i+1)+'"><i style="background:'+swatch(it,tab)+'"></i><span>'+G.esc(it[0])+'</span></button>').join('');
}
function choose(i,no){
  setMine(i,no);render();
  manYaw=Math.round(manYaw/TAU)*TAU;   // turn the bean to face you, to show what changed
  if(!no)return;
  if(i===7){show.dance=4.5}
  if(i===8){G.initAudio();const au=G.audio();const s=SCREAMS[no-1];if(au&&s)s[3](au,1,au.actx.currentTime+.02)}
  if(i===9&&man){SPLASHES[no-1][3](man.root.position)}
}
function findSpot(){
  for(const [x,z] of [[0,10],[0,-10],[10,0],[-10,0],[0,0],[6,6]]){const y=G.groundBelow(x,30,z,60);if(y>-1e9&&isFinite(y))return[x,y,z]}
  return[0,0,0];
}
function openCloset(){
  if(!G.closetOn)return;build();open=true;G.initAudio();
  const m=$('menu');if(m)m.hidden=true;$('closet').hidden=false;render();
  spot=findSpot();
  if(!man){man=new G.Bean(G.myLook,'',false);manB=G.newBody()}
  else man.setLook(G.myLook);
  dress(man,saved);man.visible=true;manB.pos.set(spot[0],spot[1],spot[2]);manB.onGround=true;manB.st='move';manYaw=0;
}
function close(){
  if(!open)return;open=false;drag=null;$('closet').hidden=true;
  const m=$('menu');if(m&&G.G.mode==='menu')m.hidden=false;
  if(man){man.dispose();man=null;manB=null}
}
// the Closet button on the menu card, for captains only
function menu(on){
  let row=$('closetRow');
  if(!on){if(row)row.remove();close();return}
  if(row)return;
  const after=document.querySelector('#menu .custrow');if(!after)return;
  row=document.createElement('div');row.id='closetRow';
  row.innerHTML='<button class="btn sm pink" id="closetBtn" type="button">Closet</button><span class="note">Hats, costumes, dances and more. Captains only for now.</span>';
  after.insertAdjacentElement('afterend',row);$('closetBtn').onclick=openCloset;
}
// every frame: the bean in the Closet
function frame(dt){
  if(!open||!man)return;
  if(G.G.mode!=='menu'){close();return}
  if(!drag)manYaw+=dt*.45;
  manB.yaw=manYaw;manB.vel.set(0,0,0);manB.onGround=true;manB.st='move';
  const dancing=show.dance>0;if(dancing)show.dance-=dt;
  man.update(manB,dt,{cheer:dancing});
  tick({bean:man,b:manB,isMe:true,hidden:false},dt,dancing);
  man.place(spot[1],true);
}
// the menu camera while the Closet is open: in front of the bean, which sits in the part of the screen the panel leaves free
const _t=new V3();
function cam(camera){
  if(!open||!man)return false;
  const card=$('closet').firstElementChild,r=card.getBoundingClientRect(),w=innerWidth,h=innerHeight,port=h>=w;
  const fy=Math.tan(camera.fov*Math.PI/360),free=port?clamp((r.top-8)/h,.3,1):clamp((r.left-8)/w,.3,1);
  const d=port?3.3/(2*fy*free):3.5/(2*fy);
  _t.set(spot[0],spot[1]+.9,spot[2]);
  camera.position.set(_t.x,_t.y+.35,_t.z+d);
  if(port)_t.y-=(1-free)*d*fy;else _t.x+=(1-free)*d*fy*camera.aspect;
  camera.lookAt(_t);G.moveSun(spot[0],spot[1],spot[2]);
  return true;
}

return{dress,undress:B=>{undress(B);B.kit=null},repaint,tick,splash,frame,cam,menu,mine,LISTS,SLOTS,TABS,open:openCloset,close,get isOpen(){return open},api:G,GEO};
};
