/*
 * Sky Duel's Paint Shop: 19 paints, 5 noses (spinner and propeller colours), 6 trails and 5 shoot-down effects, all
 * drawn here in code.
 *
 * NOT PUBLIC YET. index.html fetches this file only when something needs it:
 *   - this player may see the Paint Shop (X.on: SD_PUBLIC in index.html, or the account signed in is one of the site's
 *     captains (../captains.js), or ?paints=1 on localhost / in an automated browser); index.html calls access() when
 *     that may have changed;
 *   - or another plane in the room arrives wearing something (its node's ck). Then this file only draws that plane: no
 *     Paint Shop button, nothing of this player's own is read, worn or sent, and the bots stay plain.
 * For everyone else this file is never loaded and the game is exactly as it was.
 *
 * While the shop is shut (../cosmetics.js is off, or not on the page: FREE below), nothing is owned or bought: a player
 * who may see the Paint Shop wears anything free, saved as skyduel-kit (the wire string below). Once the shop is open,
 * what is worn is what the shop's locker has equipped for 'sky-duel'.
 *
 * LOOKS ONLY. Nothing here is read by flight, shooting, hits or bots. A paint is a picture on the same plane (same
 * airframe, same size, same hit sphere): it is worked out in the body's shader from where on the plane a pixel is, so
 * every plane is still drawn by the same instanced meshes (no draw call is added; each body mesh carries two more
 * numbers per plane). No paint is sky blue, sea blue or dark camouflage; tools/ checks (see README) compare every paint
 * against sky, sea, grass, rock and cloud with the plain colours. In 2v2 every plane keeps its plain team colour (noses,
 * trails and shoot-downs still show); in a duel a paint's "your colour" parts take the team colour, as the plain plane does.
 * The radar, the HUD boxes and the kill feed keep the pilot's own colour. A trail is the same contrail (same size, same
 * see-through amount) in another colour; a shoot-down effect plays where a plane you shot down blew up, on top of the
 * usual explosion, and is gone in under two seconds. Both use the game's one pool of sprites (no draw call is added).
 *
 * Online. What a plane wears travels in its own node as `ck`, four base-36 characters: paint, nose, trail and
 * shoot-down, each the item's number in ../cosmetics.js (0 = none), e.g. "a305". It is only sent when something is
 * worn. Pages from before this file ignore it; here every character is checked against the counts in N and anything
 * unknown is drawn as the plain default.
 */
window.SkyKit=function(X){
'use strict';
const {THREE,store,$}=X;
const TX=X.TX||((s)=>s);
const GAME='sky-duel';
const SLOTS=['paint','nose','trail','boom'];
const N={paint:19,nose:5,trail:6,boom:5};
const S=X.PLANE_SIZE;

// ---------------- the catalogue (the same numbers, names and rarities as ../cosmetics.js) ----------------
const NAMES={
  paint:[['Home Kit','common','Your colour with a racing stripe, wing tips and a big 7 on the tail in red or navy, whichever stands out.'],
    ['Away Kit','common','Bright orange with a white stripe, white wing tips and the number 12.'],
    ['Rugby Hoops','common','Hoops of red or yellow round your colour from nose to tail.'],
    ['Chequered Flag','rare','Race red with chequered wing tips and tail and a number 1.'],
    ['Basketball','uncommon','Orange with the black seams of a ball.'],
    ['Soccer Ball','uncommon','White with black patches all over.'],
    ['Referee','uncommon','Black and white stripes. Fair play only.'],
    ['Baseball Glove','common','Tan leather with dark laces and pale stitching.'],
    ['Ice Hockey','uncommon','A red jersey with a white yoke, white bands and a 27.'],
    ['Pirate Captain','epic','Gold wings with crossed oars, a black hull with gold bands.'],
    ['Pinstripe Suit','rare','A loud red suit with fine pinstripes, a white collar and a black tie.'],
    ['Chrome Robot','epic','Polished metal plates, rivets and a red sensor band.'],
    ['Tin Toy Robot','rare','A wind-up toy in red tin with yellow trim and rivets.'],
    ['Tracksuit','common','Your colour with two stripes down the sides and a gold chain round the nose.'],
    ['Tiger Mascot','rare','Orange with black stripes and a cream belly.'],
    ['Golden Trophy','legendary','Polished gold with a white star on each wing.'],
    ['Dragon Scales','legendary','Red scales edged in gold, with a golden belly.'],
    ['Strawberry Sundae','uncommon','Strawberry pink with chocolate drips and sprinkles.'],
    ['Tuxedo','epic','A red velvet jacket, a white shirt and a black bow tie.']],
  nose:[['Candy Spiral','common','A red and white swirl that spins with the propeller.'],
    ['Chequered Spinner','uncommon','Black and white checks, like the finish line.'],
    ['Gold Spinner','rare','A polished gold nose and a golden blur.'],
    ['Bullseye','common','Red and white rings round the nose.'],
    ['Robot Eye','epic','Silver with a glowing red ring.']],
  trail:[['Red and White','common','Red from one wing, white from the other, like a team display.'],
    ['Rainbow','epic','Contrails that run through every colour.'],
    ['Gold Sparkle','rare','Golden contrails with a twinkle.'],
    ['Your Colour','common','Contrails tinted with your plane\'s colour.'],
    ['Confetti','uncommon','Little bright puffs in every colour.'],
    ['Skywriter','uncommon','Thick white puffs, dot, dot, dot.']],
  boom:[['Confetti Burst','common','A shower of bright confetti where they went down.'],
    ['Fireworks','rare','A ring of golden sparks that bursts and falls.'],
    ['Doubloons','epic','A pirate\'s fortune of gold coins scattering.'],
    ['Star Burst','uncommon','A big white star that flashes and fades.'],
    ['Smoke Ring','legendary','A perfect ring of smoke that grows and drifts.']]
};

// ---------------- the wire string (the node's ck) ----------------
function parse(ck){
  const k={paint:0,nose:0,trail:0,boom:0};
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
function refreshMine(){myKit=mine();myWire=wireOf(myKit)}
function wear(slot,no){
  if(!X.on||!N[slot])return false;no=no|0;if(no<0||no>N[slot])return false;
  if(FREE()){const k=parse(String(store.get('kit','')));k[slot]=no;store.set('kit',wireOf(k)||'')}
  else{const C=cat(),it=no?C.gameItems(GAME,slot).find(i=>i.no===no):null;
    if(it){if(C.owned().items.indexOf(it.id)<0)return false;C.equip(it.id)}else C.unequip(GAME+':'+slot)}
  refreshMine();return true;
}
// what a plane wears: mine for this player's own plane, else what its node said (bots wear nothing)
function kitOf(e){return e===X.me?(X.on?myKit:null):e.kit||null}
// Another plane's node said what it wears (ck). Anything that isn't four known characters is the plain plane.
function heard(e,ck){
  const w=typeof ck==='string'&&/^[0-9a-z]{4}$/.test(ck)?wireOf(parse(ck)):'';
  if((e.ck||'')===w)return;e.ck=w;e.kit=w?parse(w):null;
}

// =====================================================================
//  Paints and noses: drawn in the planes' own shaders. Each plane's body instance carries two numbers per plane
//  (aSk1: colour 2 and the paint's number; aSk2: colour 3 and its tail number); its trim instance carries the nose's
//  two colours and number (aSn1, aSn2). Every vertex also knows a little about its airframe (aSkF, aSkG: where the
//  wing tips, the fins and the nose are), so one shader fits all four planes.
// =====================================================================
// [main colour ('own' = the plane's own colour), colour 2, colour 3, tail number (-1 none)]
const PAINT=[null,
  ['own','auto','#ffffff',7],       // 1 Home Kit ('auto': see c2Of)
  ['#ff6a2e','#ffffff','#ffffff',12],// 2 Away Kit
  ['own','hoop','#ffffff',-1],      // 3 Rugby Hoops ('hoop': like 'auto', with sunshine yellow in place of navy)
  ['#e23b2e','#ffffff','#1d1d1f',1], // 4 Chequered Flag
  ['#f07a22','#2a1810','#ffffff',-1],// 5 Basketball
  ['#f5f5f1','#222226','#ffffff',-1],// 6 Soccer Ball
  ['#f4f4f2','#202024','#ffffff',-1],// 7 Referee
  ['#c98a4a','#4a2614','#f4e2c4',-1],// 8 Baseball Glove
  ['#d63a35','#ffffff','#ffffff',27],// 9 Ice Hockey
  ['#efbb36','#1f1b18','#fff1b8',-1],// 10 Pirate Captain
  ['#d33b3b','#ffe6c0','#1d1d1f',-1],// 11 Pinstripe Suit
  ['#c9d0d8','#ff3b30','#5d6672',-1],// 12 Chrome Robot
  ['#e2402f','#ffd23a','#ffffff',-1],// 13 Tin Toy Robot
  ['own','auto','#f2c230',-1],      // 14 Tracksuit
  ['#f08a24','#1c1410','#fff2dc',-1],// 15 Tiger Mascot
  ['#e8b030','#ffffff','#fff3b0',-1],// 16 Golden Trophy
  ['#d8432f','#ffb02e','#ffcf6a',-1],// 17 Dragon Scales
  ['#ff6f9f','#6b3a1e','#7a4a2a',-1],// 18 Strawberry Sundae
  ['#f7f7f4','#b8283c','#1d1d1f',-1] // 19 Tuxedo
];
// [colour 1, colour 2, propeller tint]
const NOSE=[null,['#e2343f','#ffffff','#ffd0d4'],['#1d1d1f','#ffffff','#ffffff'],['#e8b030','#fff3b0','#ffe08a'],['#e2343f','#ffffff','#ffc2c8'],['#c9d0d8','#ff3b30','#ff9a94']];

const GLSL_PAINT=`
uniform float skS;
varying vec3 vSkP;varying vec3 vSkN;varying vec4 vSk1;varying vec4 vSk2;varying vec4 vSkF;varying vec4 vSkG;
float skBit(float m,float k){return mod(floor(m/pow(2.,k)),2.);}
float skDig(vec2 u,float d){
  if(u.x<0.||u.x>1.||u.y<0.||u.y>1.)return 0.;
  float m=d<.5?63.:d<1.5?6.:d<2.5?91.:d<3.5?79.:d<4.5?102.:d<5.5?109.:d<6.5?125.:d<7.5?7.:d<8.5?127.:111.;
  float t=.22,r=0.;
  r+=skBit(m,0.)*step(1.-t,u.y);r+=skBit(m,1.)*step(1.-t,u.x)*step(.5,u.y);r+=skBit(m,2.)*step(1.-t,u.x)*step(u.y,.5);
  r+=skBit(m,3.)*step(u.y,t);r+=skBit(m,4.)*step(u.x,t)*step(u.y,.5);r+=skBit(m,5.)*step(u.x,t)*step(.5,u.y);r+=skBit(m,6.)*step(abs(u.y-.5),t*.5);
  return min(r,1.);
}
float skNum(vec2 ab,vec2 c,float h,float num){
  if(num<0.)return 0.;float tens=floor(num/10.+.001),ones=num-tens*10.,w=h*.55,gg=.12;
  vec2 u=(ab-c)/vec2(w,h)+vec2(0.,.5);
  if(tens>0.)return min(skDig(vec2(u.x+1.+gg,u.y),tens)+skDig(vec2(u.x-gg,u.y),ones),1.);
  return skDig(vec2(u.x+.5,u.y),ones);
}
float skStar(vec2 p,float r){float k=6.2832/5.,a=atan(p.x,p.y);a=mod(a+k*.5,k)-k*.5;float d=length(p);
  vec2 q=d*vec2(cos(a),abs(sin(a)));vec2 A=vec2(r,0.),B=vec2(r*.4*cos(k*.5),r*.4*sin(k*.5));vec2 E=B-A,W=q-A;return step(0.,E.x*W.y-E.y*W.x)*step(d,r);}
float skOar(vec2 p){float sh=step(abs(p.y),.08)*step(abs(p.x),1.25);vec2 b=(p-vec2(1.25,0.))/vec2(.55,.27);return max(sh,step(dot(b,b),1.));}
vec3 skPaint(vec3 base){
  float id=floor(vSk1.w+.5);if(id<.5)return base;
  vec3 c2=vSk1.rgb,c3=vSk2.rgb;float num=vSk2.w;
  vec3 q=vSkP/skS,n=normalize(vSkN);float ax=abs(q.x);
  float fin=step(abs(ax-vSkF.y),.17)*step(vSkF.w+.12,q.y)*step(q.z,vSkF.z+1.3);
  float wing=step(1.2,ax)*(1.-fin),fuse=step(ax,1.2)*(1.-fin);
  float aft=step(q.z,vSkF.z+1.1);
  float tip=smoothstep(vSkF.x*.7,vSkF.x*.7+.04,ax)*(1.-aft);
  float top=step(.25,n.y),belly=step(n.y,-.35);
  float ang=atan(q.y,q.x);
  float numM=fin*step(.55,abs(n.x))*skNum(vec2(-q.z*sign(n.x),q.y),vec2(-(vSkF.z-.35)*sign(n.x),vSkF.w+.9),.78,num);
  float stripe=fuse*top*step(ax,.34);
  vec2 wp=vec2(ax,q.z-vSkG.x);   // on a wing: out from the middle, and forward of the wing's middle
  vec3 c=base;
  if(id<1.5){c=mix(c,c2,max(stripe,tip));c=mix(c,base,tip*step(abs(ax-vSkF.x*.76),.07));c=mix(c,c2,numM);}
  else if(id<2.5){c=mix(c,c2,max(stripe,tip));c=mix(c,base,tip*step(abs(ax-vSkF.x*.76),.07));c=mix(c,c2,numM);}
  else if(id<3.5){c=mix(base,c2,step(.64,fract(q.z*.42+.2)));}
  else if(id<4.5){float ck=mod(floor(q.x*1.5+50.)+floor(q.z*1.5+50.),2.);float zone=max(tip,wing*aft);c=mix(base,mix(c3,c2,ck),zone);c=mix(c,c2,max(stripe,numM));}
  else if(id<5.5){float s=fuse*(step(ax,.06)*step(0.,q.y)+step(abs(q.z-.2),.06))+wing*(step(abs(ax-vSkF.x*.45-(q.z-vSkG.x)*(q.z-vSkG.x)*.18),.07)+step(abs(q.z-vSkG.x),.06));
    c=mix(base,c2,min(s,1.));c*=1.-.06*step(.5,fract(sin(dot(floor(q.xz*9.),vec2(12.9,78.2)))*43758.));}
  else if(id<6.5){vec2 g=wing>.5?vec2(q.x,q.z)*.62:vec2(ang*1.1,q.z*.62);g.x+=mod(floor(g.y),2.)*.5;float d=length(fract(g)-.5);c=mix(base,c2,step(d,.29));}
  else if(id<7.5){float s=fuse>.5?step(.5,fract(ang*1.2)):step(.5,fract(ax*.48));c=mix(base,c2,s);}
  else if(id<8.5){float sx=vSkF.x*.5+sin(wp.y*1.4)*.7,sd=abs(ax-sx),lace=wing*step(sd,.09)+wing*step(sd,.24)*step(.6,fract(q.z*3.))*step(.1,sd);
    float rz=min(abs(q.z-2.),abs(q.z+1.6)),lf=fuse*(step(rz,.09)+step(rz,.22)*step(.6,fract(ang*2.5))*step(.1,rz));c=mix(base,c2,min(lace+lf,1.));
    float stch=step(abs(abs(ax-vSkF.x*.5)-vSkF.x*.3),.03)*wing*step(.5,fract(q.z*5.));c=mix(c,c3,stch);c*=1.-.07*step(.5,fract(sin(dot(floor(q.xz*7.),vec2(12.9,78.2)))*43758.));}
  else if(id<9.5){float yoke=step(ax,vSkF.x*.32)*top*(1.-fin);float bands=wing*(1.-aft)*(step(abs(ax-vSkF.x*.74),.09)+step(abs(ax-vSkF.x*.87),.09));c=mix(base,c2,min(yoke+bands+numM,1.));}
  else if(id<10.5){c=mix(base,c2,fuse*(1.-step(abs(q.z-1.),.28))*(1.-step(abs(q.z+1.8),.24))*(1.-step(abs(q.z-3.4),.24)));c=mix(c,c2,wing*(1.-aft)*step(abs(ax-vSkF.x*.86),.06));
    vec2 e=vec2(ax-vSkF.x*.45,wp.y);vec2 r1=mat2(.707,-.707,.707,.707)*e,r2=mat2(.707,.707,-.707,.707)*e;float o=wing*(1.-aft)*max(skOar(r1),skOar(vec2(-r2.x,r2.y)));c=mix(c,c2,o);
    c=mix(c,c3,fuse*(step(abs(abs(q.z-1.)-.28),.05)+step(abs(abs(q.z+1.8)-.24),.05)));}
  else if(id<11.5){float pin=fuse>.5?step(abs(fract(ang*2.2)-.5),.05):step(abs(fract(ax*1.6)-.5),.05);c=mix(base,c2,pin*(1.-fin));
    c=mix(c,vec3(1.),fuse*step(3.2,q.z));float tie=fuse*top*step(ax,.14+(3.2-q.z)*.05)*step(q.z,3.2)*step(.4,q.z);c=mix(c,c3,tie);}
  else if(id<12.5){float g=smoothstep(-.3,.9,n.y),st=.5+.5*sin(q.x*.55+q.z*.8+n.x*2.);c=mix(vec3(.42,.47,.54),vec3(.95,.97,1.),g*.5+st*.5);c*=1.-.25*exp(-n.y*n.y*24.);
    vec2 pg=fuse>.5?vec2(ang*1.6,q.z*.8):vec2(q.x*.8,q.z*.8);vec2 f=fract(pg);float ln=step(min(f.x,f.y),.04);c=mix(c,c3,ln*.8);
    float rv=step(length(f-vec2(.12)),.05);c=mix(c,c3,rv);c=mix(c,c2,fuse*step(abs(q.z-3.4),.18)*step(-.2,n.y)*step(.3,abs(n.x)));}
  else if(id<13.5){c=mix(base,c2,fuse*(step(abs(q.z-2.5),.2)+step(abs(q.z+2.),.2)));c=mix(c,c2,wing*(1.-aft)*step(abs(wp.y-.5),.12));
    vec2 f=vec2(fract(ax*2.),wp.y);float rv=wing*(1.-aft)*step(length(vec2(f.x-.5,(f.y+.15)*2.)),.16);c=mix(c,c2,rv);
    float dial=fuse*step(.6,abs(n.x))*step(length(vec2(q.z-.6,q.y)),.38);c=mix(c,c3,dial);c=mix(c,c2,fuse*step(.6,abs(n.x))*step(abs(length(vec2(q.z-.6,q.y))-.38),.06));}
  else if(id<14.5){float side=fuse*step(.5,abs(n.x))*(step(abs(q.y-.12),.07)+step(abs(q.y+.12),.07));float ws=wing*(1.-aft)*(step(abs(wp.y-.18),.08)+step(abs(wp.y+.18),.08));
    c=mix(base,c2,min(side+ws,1.));c=mix(c,c3,fuse*step(abs(q.z-3.7),.25));}
  else if(id<15.5){float v=fuse>.5?q.z*.55+sin(ang*3.)*.18:ax*.5+sin(q.z*2.)*.15;float s=step(.8,fract(v))*(1.-fin)+fin*step(.8,fract(q.y*.9+q.z*.3));c=mix(base,c2,s);c=mix(c,c3,belly*(1.-wing));}
  else if(id<16.5){float g=smoothstep(-.35,.9,n.y),st=.5+.5*sin(q.x*.5+q.z*.7+n.x*2.);c=mix(vec3(.62,.4,.06),vec3(.98,.78,.25),g*.5+st*.5);c+=vec3(.3,.25,.1)*pow(st,8.);
    float sm=wing*(1.-aft)*skStar(vec2(ax-vSkF.x*.5,wp.y),1.);c=mix(c,c2,sm);}
  else if(id<17.5){vec2 g=fuse>.5?vec2(ang*1.4,q.z*1.5):vec2(q.x*1.5,q.z*1.5);g.x+=mod(floor(g.y),2.)*.5;vec2 f=fract(g)-vec2(.5,0.);float d=length(vec2(f.x,f.y*.9));
    c=mix(base,c2,step(abs(d-.5),.07));c=mix(c,c3,belly*(1.-wing));}
  else if(id<18.5){float bw=.15-.65*pow(max(0.,sin(ax*2.6)),6.),bf=1.2-.8*pow(max(0.,sin(ang*5.)),6.);
    float cream=min(wing*(1.-aft)*step(bw,wp.y)+fuse*step(0.,q.y)*step(bf,q.z)*step(q.z,3.8),1.);c=mix(base,c2,cream);
    vec2 sp=fract(q.xz*2.3)-.5;float spr=step(length(sp),.07)*step(.5,fract(sin(dot(floor(q.xz*2.3),vec2(7.1,3.7)))*91.));vec3 sc=fract(dot(floor(q.xz*2.3),vec2(.37,.71)))<.5?vec3(.25,.7,1.):vec3(1.,.82,.2);c=mix(c,sc,spr*cream);}
  else if(id<19.5){float jacket=max(wing,fin)+fuse*aft;c=mix(base,c2,jacket);
    float btn=fuse*top*step(length(vec2(q.x,fract(q.z*.9)-.5)),.1)*step(q.z,2.8)*step(-.4,q.z);c=mix(c,c2,btn);
    vec2 bt=vec2(q.x,q.z-3.5);float bow=fuse*step(-.1,n.y)*step(abs(bt.y),.12+abs(bt.x)*.55)*step(abs(bt.x),.5);c=mix(c,c3,bow);}
  return c;
}`;
const GLSL_NOSE=`
uniform float skS;
varying vec3 vSkP;varying vec4 vSn1;varying vec4 vSn2;varying vec4 vSkT;
vec3 skNose(vec3 c){
  float id=floor(vSn1.w+.5);if(id<.5)return c;vec3 q=vSkP/skS;if(q.z<vSkT.x)return c;
  vec3 a=vSn1.rgb,b=vSn2.rgb;float ang=atan(q.y,q.x),t=(q.z-vSkT.x)/max(vSkT.y-vSkT.x,.1);
  if(id<1.5)return mix(a,b,step(.5,fract(ang/6.2832*2.+t*1.3)));
  if(id<2.5)return mix(a,b,mod(floor(ang/6.2832*8.+8.)+floor(t*4.),2.));
  if(id<3.5){float g=.5+.5*sin(ang*2.+1.);return mix(a*.75,b,g*.7+t*.3);}
  if(id<4.5)return mix(a,b,step(.5,fract(t*3.)));
  return mix(a,b,step(abs(t-.25),.12));
}`;
// Where things are on each airframe, in the units the planes are built in (index.html's buildPlanes):
// [half the wingspan, the fins' distance from the middle, the fins' z, the tail's radius], [the main wing's z],
// and the nose cone: [z where it starts, z of its tip]
const FRAME_INFO=[[6.8,0,-3.9,.45,1.45],[7.25,0,-4.5,.4,.3],[8.5,2.9,-4.6,.5,.9],[6.25,0,-4.2,.7,-1.1]];
const NOSE_INFO=[[4.45,5.95],[5.5,8.1],[5.2,7.0],[5.5,8.7]];
const PAINT_ON=X.BODY_MAT,NOSE_ON=X.TRIM_MAT;
const skS={value:S};
function patch(){
  if(PAINT_ON.userData.sk)return;PAINT_ON.userData.sk=1;
  PAINT_ON.onBeforeCompile=sh=>{
    sh.uniforms.skS=skS;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aSk1;attribute vec4 aSk2;attribute vec4 aSkF;attribute vec4 aSkG;varying vec3 vSkP;varying vec3 vSkN;varying vec4 vSk1;varying vec4 vSk2;varying vec4 vSkF;varying vec4 vSkG;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvSkP=position;vSk1=aSk1;vSk2=aSk2;vSkF=aSkF;vSkG=aSkG;')
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvSkN=objectNormal;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+GLSL_PAINT)
      .replace('#include <color_fragment>','#if defined(USE_COLOR)||defined(USE_INSTANCING_COLOR)\ndiffuseColor.rgb*=skPaint(vColor);\n#endif');
  };
  PAINT_ON.customProgramCacheKey=()=>'skyPaint';PAINT_ON.needsUpdate=true;
  NOSE_ON.onBeforeCompile=sh=>{
    sh.uniforms.skS=skS;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aSn1;attribute vec4 aSn2;attribute vec4 aSkT;varying vec3 vSkP;varying vec4 vSn1;varying vec4 vSn2;varying vec4 vSkT;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvSkP=position;vSn1=aSn1;vSn2=aSn2;vSkT=aSkT;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+GLSL_NOSE)
      .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=skNose(diffuseColor.rgb);');
  };
  NOSE_ON.customProgramCacheKey=()=>'skyNose';NOSE_ON.needsUpdate=true;
}
// the per-vertex airframe numbers (fixed) and the per-plane numbers (written every frame by inst) on a body and a trim
function dressGeo(body,trim,f,n){
  const fi=FRAME_INFO[f],ni=NOSE_INFO[f];
  const per=(g,name,v)=>{const c=g.attributes.position.count,a=new Float32Array(c*4);for(let i=0;i<c;i++)a.set(v,i*4);g.setAttribute(name,new THREE.BufferAttribute(a,4))};
  per(body,'aSkF',[fi[0],fi[1],fi[2],fi[3]]);per(body,'aSkG',[fi[4],0,0,0]);per(trim,'aSkT',[ni[0],ni[1],0,0]);
  const ia=(g,name)=>{const a=new THREE.InstancedBufferAttribute(new Float32Array(n*4),4);a.setUsage(THREE.DynamicDrawUsage);g.setAttribute(name,a);return a};
  return {a1:ia(body,'aSk1'),a2:ia(body,'aSk2'),n1:ia(trim,'aSn1'),n2:ia(trim,'aSn2')};
}
patch();
const ATT=X.PLANE_INST.map((q,f)=>dressGeo(q.body.geometry,q.trim.geometry,f,X.PLANE_MAX));
// the propellers: one colour per plane (white for everyone, a tint for a nose that has one)
// (setColorAt makes the colour buffer the size of count, so count is put up to the most for that moment)
const PROP=X.PROP_INST;{const w=new THREE.Color(1,1,1),c0=PROP.count;PROP.count=X.PLANE_MAX;for(let i=0;i<X.PLANE_MAX;i++)PROP.setColorAt(i,w);PROP.count=c0;PROP.instanceColor.setUsage(THREE.DynamicDrawUsage);X.PROP_MAT.needsUpdate=true}
const C1=new THREE.Color(),C2=new THREE.Color(),C3=new THREE.Color();
const hexC=(c,h)=>c.set(h);
// colour 2 of a paint on plane colour `own` ('auto': navy on a red, orange or pink plane, race red on any other, so
// the stripes always stand out and never make the plane harder to see: see the visibility check in README)
const HSL={h:0,s:0,l:0};
function c2Of(P,own){if(P[1]!=='auto'&&P[1]!=='hoop')return hexC(C2,P[1]);C2.set(own).getHSL(HSL);return HSL.h<.12||HSL.h>.82?C2.set(P[1]==='hoop'?'#ffd23f':'#1f2a44'):C2.set('#e23b2e')}
let propDirty=false;
function teamGame(){return !!(X.rs&&X.rs.md===2)}
// index.html's drawEnts: plane e has just been put in its airframe's instance k (body and trim)
function inst(e,k){
  const A=ATT[e.frame];if(!A)return;const kit=kitOf(e);
  const p=kit&&!teamGame()?kit.paint|0:0,nz=kit?kit.nose|0:0;
  if(p){const P=PAINT[p],body=X.PLANE_INST[e.frame].body;
    if(P[0]!=='own'){hexC(C1,P[0]);body.setColorAt(k,C1)}
    c2Of(P,X.entColor(e));hexC(C3,P[2]);A.a1.setXYZW(k,C2.r,C2.g,C2.b,p);A.a2.setXYZW(k,C3.r,C3.g,C3.b,P[3])}
  else A.a1.setW(k,0);
  if(nz){const M=NOSE[nz];hexC(C1,M[0]);hexC(C2,M[1]);A.n1.setXYZW(k,C1.r,C1.g,C1.b,nz);A.n2.setXYZW(k,C2.r,C2.g,C2.b,0)}else A.n1.setW(k,0);
  A.dirty=true;
}
function prop(e,i){const kit=kitOf(e),nz=kit?kit.nose|0:0;if(nz)PROP.setColorAt(i,hexC(C1,NOSE[nz][2]));else PROP.setColorAt(i,hexC(C1,'#ffffff'));propDirty=true}
function end(){for(const A of ATT)if(A.dirty){A.dirty=false;A.a1.needsUpdate=A.a2.needsUpdate=A.n1.needsUpdate=A.n2.needsUpdate=true}if(propDirty){propDirty=false;PROP.instanceColor.needsUpdate=true}}

// =====================================================================
//  Trails: the same contrail puff from each wing tip (index.html's drawEnts), coloured. s is -1 or 1 (which wing).
// =====================================================================
const RGB=[0,0,0,0];
function hsl(h,s,l){C1.setHSL(h,s,l);return C1}
// fills RGB (r, g, b, additive) for one contrail puff, or returns false for the plain white one
function trailCol(e,s){
  const kit=kitOf(e),t=kit?kit.trail|0:0;if(!t)return false;const T=performance.now()/1000;let c;
  if(t===1)c=s<0?hexC(C1,'#ff4a4a'):hexC(C1,'#ffffff');
  else if(t===2)c=hsl((T*.35+(s<0?0:.08))%1,.9,.62);
  else if(t===3){c=hexC(C1,Math.random()<.3?'#fff6c8':'#ffc93c');RGB[3]=Math.random()<.25?1:0}
  else if(t===4){c=C1.set(X.entColor(e));c.lerp(C2.setRGB(1,1,1),.35)}
  else if(t===5)c=hsl(Math.random(),.95,.6);
  else c=hexC(C1,'#ffffff');
  RGB[0]=c.r;RGB[1]=c.g;RGB[2]=c.b;if(t!==3)RGB[3]=0;return RGB;
}
// how a trail changes the puffs: size and gaps (Skywriter: bigger puffs, every other one)
function trailShape(e){const kit=kitOf(e),t=kit?kit.trail|0:0;if(t===6){e._skyT=(e._skyT|0)+1;return e._skyT%3===0?0:1.5}if(t===5)return .8;return 1}

// =====================================================================
//  Shoot-downs: a burst of the game's soft sprites where the plane went down, on top of the usual explosion.
//  Played for everyone who sees it when the plane that got the kill wears one. Under two seconds; never a flash that
//  hides the sky for long.
// =====================================================================
const rnd=(a,b)=>a+Math.random()*(b-a);
function burst(n,p){
  const F=X.FX,x=p.x,y=p.y,z=p.z;
  if(n===1){const cols=['#ff5a8a','#4dd2ff','#ffd23f','#4ddc7a','#b46cff','#ff8a3d','#ffffff'];
    for(let i=0;i<46;i++){const a=rnd(0,6.283),u=rnd(-.6,1),q=Math.sqrt(1-u*u),sp=rnd(18,48);hexC(C1,cols[i%7]);F.puff(x,y,z,Math.cos(a)*q*sp,u*sp+10,Math.sin(a)*q*sp,rnd(1,1.7),4,3,C1.r,C1.g,C1.b,1,1,14)}}
  else if(n===2){for(let i=0;i<40;i++){const a=i/40*6.283,sp=62;F.puff(x,y,z,Math.cos(a)*sp,Math.sin(a)*sp*.35+8,Math.sin(a)*sp,rnd(1.1,1.5),5,2,1,.82,.3,1,1,22)}
    for(let i=0;i<14;i++){const a=rnd(0,6.283),sp=rnd(10,30);F.puff(x,y,z,Math.cos(a)*sp,rnd(10,30),Math.sin(a)*sp,rnd(.7,1.1),4,1.5,1,.95,.7,1,1,26)}}
  else if(n===3){for(let i=0;i<34;i++){const a=rnd(0,6.283),sp=rnd(10,34);const g=Math.random()<.3;F.puff(x,y,z,Math.cos(a)*sp,rnd(14,36),Math.sin(a)*sp,rnd(1.3,1.9),5,4,1,g?.95:.78,g?.55:.2,1,1,30)}
    for(let i=0;i<10;i++)F.puff(x+rnd(-8,8),y+rnd(-4,4),z+rnd(-8,8),0,rnd(-4,4),0,rnd(.4,.9),3,9,1,1,.85,1,1,0)}
  else if(n===4){const cam=X.camera,R=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0),U=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,1);
    for(let i=0;i<50;i++){const k=i/50*10,j=Math.floor(k),f=k-j,a0=j*Math.PI/5-Math.PI/2,a1=(j+1)*Math.PI/5-Math.PI/2,r0=j%2?11:28,r1=j%2?28:11;
      const ca=Math.cos(a0)*r0*(1-f)+Math.cos(a1)*r1*f,sa=Math.sin(a0)*r0*(1-f)+Math.sin(a1)*r1*f,vx=R.x*ca-U.x*sa,vy=R.y*ca-U.y*sa,vz=R.z*ca-U.z*sa;
      F.puff(x,y,z,vx*1.6,vy*1.6,vz*1.6,1.2,6,4,1,1,.9,1,1,0)}}
  else if(n===5){for(let i=0;i<36;i++){const a=i/36*6.283;F.puff(x+Math.cos(a)*6,y,z+Math.sin(a)*6,Math.cos(a)*22,rnd(4,7),Math.sin(a)*22,rnd(1.6,1.9),10,30,.92,.92,.95,.75,0,-1)}}
}
function downed(v,by){
  if(!v||!by||by===v)return;const kit=kitOf(by),n=kit?kit.boom|0:0;if(!n)return;burst(n,v.pos);
}

// =====================================================================
//  The Paint Shop's pictures: one plane of each airframe in a little scene of its own, drawn by the game's renderer
//  into an off-screen target (only while the Paint Shop is open, and only for a player who may see it)
// =====================================================================
let pv=null;
function pvInit(){
  if(pv)return pv;const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdcefff,0x7a8a6a,.62));const sun=new THREE.DirectionalLight(0xfff3d6,.95);sun.position.set(.45,.62,.35);scene.add(sun);
  const cam=new THREE.PerspectiveCamera(30,1,1,400);
  const planes=X.PLANE_GEO.map((pg,f)=>{const b=pg.body.clone(),t=pg.trim.clone();for(const k of ['aSk1','aSk2'])b.deleteAttribute(k);for(const k of ['aSn1','aSn2'])t.deleteAttribute(k);
    const A=dressGeo(b,t,f,1);const body=new THREE.InstancedMesh(b,X.BODY_MAT,1),trim=new THREE.InstancedMesh(t,X.TRIM_MAT,1);body.setColorAt(0,C1.set('#ffffff'));
    const I=new THREE.Matrix4();body.setMatrixAt(0,I);trim.setMatrixAt(0,I);body.frustumCulled=trim.frustumCulled=false;
    const g=new THREE.Group();g.add(body,trim);g.rotation.order='YXZ';
    let pr=null;if(pg.prop){pr=new THREE.Mesh(X.PROP_GEO,new THREE.MeshBasicMaterial({color:0xdfe8f2,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}));pr.scale.setScalar(pg.propR);pr.position.z=pg.prop;g.add(pr)}
    g.visible=false;scene.add(g);return {g,body,trim,A,pr}});
  return pv={scene,cam,planes,rt:null,buf:null};
}
function pvSet(k,frame,color){
  const p=pvInit();p.planes.forEach((q,i)=>q.g.visible=i===frame);const q=p.planes[frame];
  hexC(C1,color);q.body.setColorAt(0,C1);q.body.instanceColor.needsUpdate=true;
  const P=k.paint?PAINT[k.paint]:null;if(P){if(P[0]!=='own'){q.body.setColorAt(0,hexC(C1,P[0]))}c2Of(P,color);hexC(C3,P[2]);q.A.a1.setXYZW(0,C2.r,C2.g,C2.b,k.paint);q.A.a2.setXYZW(0,C3.r,C3.g,C3.b,P[3])}else q.A.a1.setW(0,0);
  const M=k.nose?NOSE[k.nose]:null;if(M){hexC(C1,M[0]);hexC(C2,M[1]);q.A.n1.setXYZW(0,C1.r,C1.g,C1.b,k.nose);q.A.n2.setXYZW(0,C2.r,C2.g,C2.b,0)}else q.A.n1.setW(0,0);
  if(q.pr)q.pr.material.color.set(M?M[2]:'#dfe8f2');
  for(const a of [q.A.a1,q.A.a2,q.A.n1,q.A.n2])a.needsUpdate=true;q.body.instanceColor.needsUpdate=true;
  return q;
}
// yaw turns the plane (0: nose toward the camera), elev raises the camera, dist is how far away it is, and tz is the
// point along the plane the camera looks at (0: the middle; about 6 to 8: the nose)
function pvShot(q,yaw,elev,dist,tz){const c=pvInit().cam;q.g.rotation.set(0,yaw,0);const d=dist||40,el=elev==null?.42:elev,z=(tz||0)*S/1.288;
  const tx=Math.sin(yaw)*z,tzz=Math.cos(yaw)*z;c.position.set(tx,Math.sin(el)*d,tzz+Math.cos(el)*d);c.lookAt(tx,0,tzz)}
function pvRender(w,h,cv,bg){
  const p=pvInit(),R=X.renderer;
  if(!p.rt||p.rt.width!==w||p.rt.height!==h){if(p.rt)p.rt.dispose();p.rt=new THREE.WebGLRenderTarget(w,h);p.buf=new Uint8Array(w*h*4)}
  p.cam.aspect=w/h;p.cam.updateProjectionMatrix();
  const cc=R.getClearColor(new THREE.Color()),ca=R.getClearAlpha();
  p.scene.background=bg?C3.set(bg):null;
  R.setRenderTarget(p.rt);R.setClearColor(0x000000,0);R.clear();R.render(p.scene,p.cam);R.readRenderTargetPixels(p.rt,0,0,w,h,p.buf);
  R.setRenderTarget(null);R.setClearColor(cc,ca);p.scene.background=null;
  cv=cv||document.createElement('canvas');if(cv.width!==w)cv.width=w;if(cv.height!==h)cv.height=h;
  const g=cv.getContext('2d'),img=g.createImageData(w,h),row=w*4;for(let y=0;y<h;y++)img.data.set(p.buf.subarray((h-1-y)*row,(h-y)*row),y*row);
  g.putImageData(img,0,0);return cv;
}
// 2D pictures for trails and shoot-downs (they are sprites in the game, so a drawing says as much)
function dot(g,x,y,r,col,a){g.globalAlpha=a==null?1:a;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.globalAlpha=1}
function flat(slot,no,size){
  const cv=document.createElement('canvas');cv.width=cv.height=size;const g=cv.getContext('2d'),s=size/160;
  const sky=g.createLinearGradient(0,0,0,size);sky.addColorStop(0,'#5a9be6');sky.addColorStop(1,'#cfe8ff');g.fillStyle=sky;g.fillRect(0,0,size,size);
  if(slot==='trail'){
    for(let i=0;i<14;i++){const t=i/13,x=(14+t*96)*s;for(const w of [-1,1]){let col='#ffffff',a=.55,r=(5+t*7)*s;
      if(no===1)col=w<0?'#ff4a4a':'#ffffff';else if(no===2)col='hsl('+((i*25+(w<0?0:30))%360)+',90%,62%)';else if(no===3)col=i%3?'#ffc93c':'#fff6c8';
      else if(no===4)col=X.myColor;else if(no===5)col='hsl('+((i*137+w*60)%360)+',95%,60%)';else if(no===6){if(i%3===0)continue;r*=1.5}
      dot(g,x,(80+w*22-t*14)*s,r,col,a)}}
    g.fillStyle='#ffffff';g.strokeStyle='#0d1b2e';g.lineWidth=2*s;g.beginPath();g.moveTo(150*s,66*s);g.lineTo(118*s,58*s);g.lineTo(112*s,36*s);g.lineTo(104*s,58*s);g.lineTo(100*s,66*s);g.lineTo(104*s,74*s);g.lineTo(112*s,96*s);g.lineTo(118*s,74*s);g.closePath();g.fill();g.stroke();
  }else{
    const cx=80*s,cy=82*s;dot(g,cx,cy,34*s,'#ffb04a',.9);dot(g,cx,cy,18*s,'#fff2c0',1);
    if(no===1){const cols=['#ff5a8a','#4dd2ff','#ffd23f','#4ddc7a','#b46cff','#ff8a3d'];for(let i=0;i<40;i++){const a=i*2.4,r=(30+(i*7)%40)*s;g.fillStyle=cols[i%6];g.save();g.translate(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.8);g.rotate(i);g.fillRect(-4*s,-2*s,8*s,4*s);g.restore()}}
    else if(no===2){for(let i=0;i<24;i++){const a=i/24*6.283;g.strokeStyle='#ffd04a';g.lineWidth=3*s;g.beginPath();g.moveTo(cx+Math.cos(a)*30*s,cy+Math.sin(a)*30*s);g.lineTo(cx+Math.cos(a)*62*s,cy+Math.sin(a)*62*s);g.stroke();dot(g,cx+Math.cos(a)*64*s,cy+Math.sin(a)*64*s,5*s,'#fff3b0')}}
    else if(no===3){for(let i=0;i<16;i++){const a=i*2.1,r=(34+(i*11)%30)*s,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.7;g.fillStyle='#e8b030';g.strokeStyle='#8a5a10';g.lineWidth=2*s;g.beginPath();g.ellipse(x,y,7*s,6*s,0,0,7);g.fill();g.stroke();g.fillStyle='#fff3b0';g.fillRect(x-2*s,y-3*s,2*s,5*s)}}
    else if(no===4){g.fillStyle='#ffffff';g.strokeStyle='#ffe9a0';g.lineWidth=3*s;g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=(i%2?20:56)*s;g.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}g.closePath();g.fill();g.stroke()}
    else if(no===5){for(let i=0;i<30;i++){const a=i/30*6.283;dot(g,cx+Math.cos(a)*54*s,cy+Math.sin(a)*22*s,14*s,'#f0f2f6',.85)}}
  }
  return cv;
}

// =====================================================================
//  The Paint Shop screen (made here, only for a player who may see it: nobody else's menu changes)
// =====================================================================
const TABS=[['paint','Paints'],['nose','Noses'],['trail','Trails'],['boom','Shoot-downs']];
const RAR={common:'#7d8ea3',uncommon:'#3fae55',rare:'#2f7fe8',epic:'#9b4fe8',legendary:'#d98a0b'};
const DEF={paint:'The plain plane in your colour.',nose:'The usual dark nose.',trail:'Plain white contrails.',boom:'Just the usual explosion.'};
let ui=null,tab='paint',spin=0,pvT=0;
function items(slot){const C=cat(),L=C?C.gameItems(GAME,slot):[];if(L.length===N[slot])return L;return NAMES[slot].map((a,i)=>({no:i+1,name:a[0],rarity:a[1],desc:a[2]}))}
function css(){
  const st=document.createElement('style');st.id='kitCss';st.textContent=`
#kitRow{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}
#kitRow small{font-weight:700;color:var(--ink-2);font-size:13px;line-height:1.3;flex:1;min-width:140px}
#kitShop{z-index:30}
#kitShop .kit-card{width:min(920px,100%);max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);display:flex;flex-direction:column;gap:10px;padding:16px 18px}
.kit-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.kit-head h2{font-family:var(--f-d);font-weight:400;font-size:28px;line-height:1;margin:0}
.kit-head .seg{flex:0 1 auto;min-width:0}
.kit-head .kit-x{margin-left:auto}
.kit-body{display:grid;grid-template-columns:minmax(0,280px) minmax(0,1fr);gap:14px;min-height:0;flex:1 1 auto}
.kit-pv{display:flex;flex-direction:column;gap:8px;min-height:0}
.kit-stage{position:relative;border:2px solid var(--ink);border-radius:14px;background:linear-gradient(#5a9be6,#cfe8ff);overflow:hidden;aspect-ratio:1;width:100%}
.kit-stage canvas{position:absolute;inset:0;width:100%;height:100%}
.kit-info{font-weight:600;font-size:14px;line-height:1.35;color:var(--ink-2);margin:0;min-height:2.7em}
.kit-info b{color:var(--ink);font-weight:800}
.kit-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;overflow:auto;align-content:start;padding:4px 6px 10px 2px;min-height:0}
.kit-tile{display:flex;flex-direction:column;align-items:center;gap:1px;border:2px solid var(--line);border-radius:12px;background:#fff;padding:3px 3px 6px;font-weight:800;font-size:12.5px;line-height:1.15;text-align:center;color:var(--ink);font-family:var(--f-b)}
.kit-tile img{width:100%;aspect-ratio:1;display:block;border-radius:9px}
.kit-tile i{font-style:normal;font-size:10px;font-weight:800;color:var(--rc);text-transform:uppercase;letter-spacing:.06em}
.kit-tile[aria-pressed="true"]{border-color:var(--ink);background:#fff6dd;box-shadow:0 3px 0 var(--ink)}
.kit-note{margin:0;font-size:12.5px;font-weight:600;color:var(--ink-2)}
@media (max-width:640px){
  #kitShop .kit-card{padding:12px;max-height:calc(100dvh - 20px)}
  .kit-head h2{font-size:24px}
  .kit-head .seg{order:3;flex-basis:100%;display:flex}.kit-head .seg button{flex:1;padding:6px 4px;font-size:13px}
  .kit-body{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}
  .kit-pv{flex-direction:row;align-items:center;gap:10px}
  .kit-stage{width:130px;flex:0 0 130px}
  .kit-info{min-height:0;font-size:13px}
  .kit-grid{grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px}
  .kit-note{display:none}
}
@media (max-height:520px) and (min-width:641px){
  #kitShop .kit-card{padding:10px 12px;gap:6px;max-height:calc(100dvh - 16px)}
  .kit-head h2{font-size:22px}
  .kit-body{grid-template-columns:minmax(0,170px) minmax(0,1fr);gap:10px}
  .kit-info{font-size:12px;min-height:0}
  .kit-note{display:none}
  .kit-grid{grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px}
}`;document.head.appendChild(st);
}
function build(){
  if(ui)return ui;css();
  const row=document.createElement('div');row.id='kitRow';
  row.innerHTML='<button class="btn alt sm" id="kitOpen" type="button">Paint Shop</button><small>Paints, noses, trails and shoot-down effects. Captains only for now.</small>';
  $('swatches').insertAdjacentElement('afterend',row);
  const sec=document.createElement('section');sec.id='kitShop';sec.className='overlay center';sec.hidden=true;sec.setAttribute('role','dialog');sec.setAttribute('aria-label','Paint Shop');
  sec.innerHTML='<div class="card kit-card"><div class="kit-head"><h2>Paint Shop</h2><div class="seg" id="kitTabs" role="group" aria-label="Paint Shop section">'+
    TABS.map(t=>'<button type="button" data-t="'+t[0]+'">'+t[1]+'</button>').join('')+'</div><button class="btn alt sm kit-x" id="kitClose" type="button">Done</button></div>'+
    '<div class="kit-body"><div class="kit-pv"><div class="kit-stage"><canvas id="kitCv" width="300" height="300" aria-hidden="true"></canvas></div><p class="kit-info" id="kitInfo"></p></div>'+
    '<div class="kit-grid" id="kitGrid" role="group" aria-label="Items"></div></div>'+
    '<p class="kit-note">Everything is free to wear while the Paint Shop is captains only. Looks only: every plane is the same size with the same hit sphere, and in 2v2 planes keep their team colour.</p></div>';
  $('menu').insertAdjacentElement('afterend',sec);
  $('kitOpen').addEventListener('click',open);$('kitClose').addEventListener('click',close);
  sec.addEventListener('click',e=>{if(e.target===sec)close()});
  sec.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
  $('kitTabs').addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('button');if(t&&t.dataset.t){tab=t.dataset.t;draw()}});
  return ui={row,sec};
}
const thumbs=new Map();
function thumb(slot,no){
  const key=slot+':'+no+':'+X.myFrame+':'+X.myColor;if(thumbs.has(key))return thumbs.get(key);let url;
  if(slot==='paint'||slot==='nose'){const k=parse('');k[slot]=no;const q=pvSet(k,X.myFrame,X.myColor);
    if(slot==='paint')pvShot(q,-.55,.62,44);else pvShot(q,-.9,.25,16,NOSE_INFO[X.myFrame][0]*1.288)
    url=pvRender(160,160).toDataURL()}
  else url=flat(slot,no,160).toDataURL();
  thumbs.set(key,url);return url;
}
function info(slot,no){const it=no?items(slot).find(i=>i.no===no):null;const el=$('kitInfo');el.textContent='';
  const b=document.createElement('b');b.textContent=it?TX(it.name):TX('Plain');el.append(b,document.createTextNode(' '+TX(it?it.desc:DEF[slot])))}
function draw(){
  if(!ui)return;for(const b of $('kitTabs').children)b.classList.toggle('on',b.dataset.t===tab);
  const grid=$('kitGrid');grid.textContent='';const worn=myKit[tab]|0;
  const list=[{no:0,name:'Plain',rarity:''}].concat(items(tab));
  for(const it of list){const b=document.createElement('button');b.type='button';b.className='kit-tile';b.setAttribute('aria-pressed',String(it.no===worn));b.title=it.desc?TX(it.desc):'';
    const img=document.createElement('img');img.alt='';img.src=thumb(tab,it.no);const n=document.createElement('span');n.textContent=TX(it.name);b.append(img,n);
    if(it.rarity){const r=document.createElement('i');r.style.setProperty('--rc',RAR[it.rarity]||'#7d8ea3');r.textContent=TX(it.rarity);b.append(r)}
    b.addEventListener('click',()=>{wear(tab,it.no);X.sfx('click');draw()});grid.appendChild(b)}
  info(tab,worn);bigPv();
}
function bigPv(){
  if(!ui||ui.sec.hidden)return;const cv=$('kitCv'),r=Math.min(2,devicePixelRatio||1),w=Math.min(400,Math.max(160,Math.round(cv.clientWidth*r)))||300;
  if(tab==='trail'||tab==='boom'){const f=flat(tab,myKit[tab]|0,w);cv.width=cv.height=w;cv.getContext('2d').drawImage(f,0,0);return}
  const q=pvSet(myKit,X.myFrame,X.myColor);if(tab==='nose')pvShot(q,-.9+Math.sin(spin)*.35,.25,18,NOSE_INFO[X.myFrame][0]*1.288);else pvShot(q,spin,.55,46);pvRender(w,w,cv);
}
function open(){if(!X.on)return;build();refreshMine();ui.sec.hidden=false;spin=-.6;draw();const f=$('kitGrid').querySelector('[aria-pressed="true"]');if(f)f.focus({preventScroll:false})}
function close(){if(!ui)return;ui.sec.hidden=true;const b=$('kitOpen');if(b)b.focus()}
// Called by index.html when who may see the Paint Shop may have changed, and once when this file arrives.
function access(){
  refreshMine();
  if(X.on){build();ui.row.hidden=false}
  else if(ui){ui.row.hidden=true;if(!ui.sec.hidden)close()}
}
function update(dt){
  if(ui&&!ui.sec.hidden){if($('menu').hidden){close();return}spin+=dt*.5;pvT+=dt;if(pvT>1/15&&tab!=='trail'&&tab!=='boom'){pvT=0;bigPv()}}
}
document.addEventListener('backroom:lang',()=>{if(ui&&!ui.sec.hidden)draw()});

// =====================================================================
//  Test hook (automated browsers only): contact sheets drawn by the real code
// =====================================================================
if(navigator.webdriver)window.__sdk={parse,wireOf,wear,kitOf,heard,N,PAINT,NOSE,burst,trailCol,open,close,thumbs,pvSet,pvShot,pvRender,flat,
  get mine(){return Object.assign({},myKit)},get wire(){return myWire},
  // every paint (or nose) on the given airframe, from above-front and from below-behind; bg: a flat background colour
  sheet(slot,opt){opt=opt||{};const n=N[slot],cell=opt.cell||200,frame=opt.frame|0,cols=opt.cols||(slot==='paint'?8:6),shots=[];
    for(let i=0;i<=n;i++){const k=parse('');k[slot]=i;const q=pvSet(k,frame,opt.color||X.myColor);
      const views=opt.views||(slot==='nose'?[[-.9,.25,16,NOSE_INFO[frame][0]*1.288]]:[[-.55,.62,44,0],[2.6,-.35,44,0]]);
      for(const v of views){pvShot(q,v[0],v[1],v[2],v[3]);shots.push([pvRender(cell,cell,null,opt.bg),(i?NAMES[slot][i-1][0]:'Plain')])}}
    const w=cell,h=cell+(opt.bg?0:20),rows=Math.ceil(shots.length/cols),out=document.createElement('canvas');out.width=cols*w;out.height=rows*h;
    const g=out.getContext('2d');g.fillStyle=opt.bg||'#9cc6f0';g.fillRect(0,0,out.width,out.height);g.font='700 13px sans-serif';g.fillStyle='#0d1b2e';g.textAlign='center';
    shots.forEach(([cv,label],j)=>{const x=(j%cols)*w,y=Math.floor(j/cols)*h;g.drawImage(cv,x,y);if(!opt.bg)g.fillText(label,x+w/2,y+h-5)});
    return out.toDataURL('image/png')}};

return {wire:()=>myWire,heard,inst,prop,end,trailCol,trailShape,downed,update,access,open,close,kitOf};
};
