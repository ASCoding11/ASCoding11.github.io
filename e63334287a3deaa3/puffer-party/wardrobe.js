/*
 * Puffer Party: the Wardrobe. HIDDEN (captains only for now: PF_PUBLIC and wardOn() in index.html).
 *
 * index.html fetches this file only when something needs it: this player may open the Wardrobe (a captain's account,
 * PF_PUBLIC, or the test address ?wardrobe=1 on localhost or in an automated browser), or a player in the room wears
 * something (a `cz` field in their node). Everyone else never loads it, and the game looks exactly as it did.
 * The page calls window.PufferWardrobe(A) once with the short list of things it lends (wdApi in index.html) and gets back
 * the hooks it calls: hat() inside drawPuffer, trail() when an answer is accepted, pop() when the puffer pops,
 * victory() on the results screen, draw() once a frame on the effects canvas, and sync() when wardOn() may have changed.
 *
 * Four slots; a kit is four item numbers [hat, trail, pop, victory], 0 for none: the `no` of Puffer Party's items in
 * ../cosmetics.js, which also holds their rarity and a line of text. What a number LOOKS like is decided here: the lists
 * below are in number order and their names match cosmetics.js. A number this file doesn't know draws nothing (the usual
 * look), so an older copy copes with newer items. Never reorder a list: add new ones at the end of it.
 *   Hats      the pufferfish wears YOUR hat while it's your turn (it's the room's one puffer, so everyone sees it on you).
 *             Its size, swelling, colour and spikes (the timer everyone reads) are exactly the same: a hat rides on top
 *             of the head and grows with it. Nothing is drawn when it has popped.
 *   Trails    what flies from the puffer to the next player when YOUR answer is accepted, in place of the bubbles.
 *   Pops      extra pieces when the puffer pops on YOU, on top of the usual spikes, ring and confetti (about 1.5 s).
 *   Victory   plays across the screen for everyone when YOU win a match (about 2.5 s), kept to the edges so the
 *             results list stays readable.
 * Saved in this browser as pufferparty:wardrobe (JSON [hat, trail, pop, victory]); sent in the player's own node as cz,
 * 'hat.trail.pop.victory', only while something is worn. Looks only: no rule, timer or answer changes. The effects use
 * their own few dozen pieces on the page's effects canvas, drawn only while they play.
 */
window.PufferWardrobe=function(A){
'use strict';
const $=A.$,TAU=Math.PI*2,rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>v<a?a:v>b?b:v;
const OUT='#2a1408';

// =====================================================================
//  Hats: drawn in the puffer's own frame (it faces +x, radius R, eye at (.45R, -.22R), mouth at (.93R, .1R))
// =====================================================================
function line(g,R){g.lineWidth=Math.max(1,R*.04);g.strokeStyle=OUT;g.lineJoin='round';g.lineCap='round'}
function fs(g,c){g.fillStyle=c;g.fill();g.stroke()}
function ell(g,x,y,rx,ry,rot){g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot||0,0,TAU)}
// a hat that sits on the head: y=0 is its brim, negative is up; it rides on the spikes as they grow
function onTop(g,R,p,rot,f){const sl=R*(.06+.34*p);g.save();g.translate(R*.06,-R*.8-sl*.5);g.rotate(rot==null?.14:rot);line(g,R);f(R);g.restore()}
// the part of the body above a line from (x0,y0) to (x1,y1), for caps and bandanas that hug the head
function capPath(g,R,x0,y0,x1,y1){g.save();g.beginPath();g.arc(0,0,R*1.015,0,TAU);g.clip();g.beginPath();g.moveTo(-R*1.2,y0+(y1-y0)*(-R*1.2-x0)/(x1-x0));g.lineTo(R*1.2,y0+(y1-y0)*(R*1.2-x0)/(x1-x0));g.lineTo(R*1.2,-R*1.3);g.lineTo(-R*1.2,-R*1.3);g.closePath()}
function eye(R,p){return{ex:R*.45,ey:-R*.22,er:R*(.2+.08*p)}}
function patch(g,R,p){const {ex,ey,er}=eye(R,p);line(g,R);g.lineWidth=Math.max(1.2,R*.05);g.strokeStyle='#15110E';g.beginPath();g.moveTo(ex+er*.2,ey-er*.9);g.quadraticCurveTo(R*.1,-R*.9,-R*.35,-R*.88);g.moveTo(ex+er*.6,ey+er*.6);g.quadraticCurveTo(R*.9,R*.05,R*.98,-R*.12);g.stroke();
  line(g,R);ell(g,ex+er*.15,ey+er*.05,er*1.15,er*1.05);fs(g,'#15110E');g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=Math.max(.8,R*.025);g.beginPath();g.arc(ex,ey-er*.1,er*.6,-2.4,-1.4);g.stroke()}
function dots(g,R,pts,c){g.fillStyle=c;for(const [x,y,r] of pts){g.beginPath();g.arc(x*R,y*R,r*R,0,TAU);g.fill()}}
const HATS=[
  ['Baseball Cap','common',(g,R,p)=>onTop(g,R,p,null,u=>{
    g.beginPath();g.moveTo(-.5*u,0);g.bezierCurveTo(-.52*u,-.64*u,.52*u,-.64*u,.5*u,0);g.closePath();fs(g,'#E23B3B');
    g.beginPath();g.moveTo(-.02*u,-.47*u);g.quadraticCurveTo(.12*u,-.25*u,.1*u,0);g.stroke();
    g.beginPath();g.moveTo(.3*u,-.04*u);g.quadraticCurveTo(.86*u,-.14*u,1.02*u,.05*u);g.quadraticCurveTo(.7*u,.12*u,.28*u,.06*u);g.closePath();fs(g,'#B81F2A');
    ell(g,0,-.48*u,.06*u,.05*u);fs(g,'#fff')})],
  ['Sweatband','common',(g,R)=>{line(g,R);g.save();g.lineWidth=R*.2;g.strokeStyle=OUT;g.beginPath();g.arc(0,0,R*.85,-2.75,-.66);g.stroke();g.lineWidth=R*.15;g.strokeStyle='#fff';g.stroke();g.lineWidth=R*.05;g.strokeStyle='#E23B3B';g.stroke();g.restore()}],
  ['Football Helmet','uncommon',(g,R,p)=>{line(g,R);
    g.save();g.beginPath();g.arc(0,0,R*1.08,0,TAU);g.clip();g.beginPath();g.moveTo(-R*1.3,R*.18);g.lineTo(R*.82,-R*.66);g.lineTo(R*1.3,-R*.85);g.lineTo(R*1.3,-R*1.3);g.lineTo(-R*1.3,-R*1.3);g.closePath();
    g.fillStyle='#1F4FB8';g.fill();g.lineWidth=R*.12;g.strokeStyle='#fff';g.beginPath();g.arc(0,R*.2,R*1.12,-2.5,-.75);g.stroke();
    g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=R*.06;g.beginPath();g.arc(-R*.1,-R*.1,R*.75,-2.4,-1.9);g.stroke();g.restore();
    line(g,R);g.beginPath();g.arc(0,0,R*1.08,-2.75,-.68);g.stroke();g.beginPath();g.moveTo(-R*1.0,R*.1);g.lineTo(R*.8,-R*.66);g.stroke();
    ell(g,-R*.42,-R*.36,R*.1,R*.1);fs(g,'#0D2A6A');
    g.save();g.lineWidth=Math.max(1.6,R*.075);g.strokeStyle=OUT;const bars=()=>{g.beginPath();g.arc(0,0,R*1.13,-.32,.6);for(const a of [-.06,.32])g.moveTo(Math.cos(a)*R*.84,Math.sin(a)*R*.84),g.lineTo(Math.cos(a)*R*1.13,Math.sin(a)*R*1.13);g.stroke()};
    bars();g.lineWidth=Math.max(1,R*.045);g.strokeStyle='#D5DAE2';bars();g.restore()}],
  ['Swim Cap and Goggles','uncommon',(g,R,p)=>{const {ex,ey,er}=eye(R,p);line(g,R);
    capPath(g,R,-R,0,R*.8,-R*.68);g.fillStyle='#3FA9F5';g.fill();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=R*.05;g.beginPath();g.arc(-R*.2,-R*.1,R*.62,-2.6,-1.5);g.stroke();g.restore();
    line(g,R);g.beginPath();g.moveTo(-R*1.0,R*.0);g.lineTo(R*.8,-R*.68);g.stroke();
    g.save();g.lineWidth=R*.08;g.strokeStyle='#FF6A3A';g.beginPath();g.moveTo(ex-er*1.3,ey-er*.2);g.quadraticCurveTo(-R*.2,-R*.3,-R*.98,-R*.12);g.stroke();g.restore();
    line(g,R);ell(g,ex,ey,er*1.35,er*1.3);g.fillStyle='rgba(150,225,255,.28)';g.fill();g.lineWidth=R*.1;g.strokeStyle=OUT;g.stroke();g.lineWidth=R*.06;g.strokeStyle='#FF6A3A';g.stroke()}],
  ['Referee Cap','common',(g,R,p)=>{onTop(g,R,p,null,u=>{
    g.beginPath();g.moveTo(-.48*u,0);g.bezierCurveTo(-.5*u,-.58*u,.5*u,-.58*u,.48*u,0);g.closePath();fs(g,'#16161B');
    g.save();g.strokeStyle='#fff';g.lineWidth=u*.04;g.beginPath();g.moveTo(-.4*u,-.3*u);g.quadraticCurveTo(0,-.5*u,.4*u,-.3*u);g.stroke();g.restore();
    g.beginPath();g.moveTo(.3*u,-.04*u);g.quadraticCurveTo(.8*u,-.12*u,.95*u,.05*u);g.quadraticCurveTo(.66*u,.12*u,.28*u,.06*u);g.closePath();fs(g,'#16161B')});
    line(g,R);g.beginPath();g.moveTo(R*.88,R*.02);g.lineTo(R*1.22,R*.0);g.lineTo(R*1.24,R*.16);g.lineTo(R*.9,R*.2);g.closePath();fs(g,'#C9CED6');ell(g,R*1.12,R*.08,R*.04,R*.04);fs(g,'#5E6874');
    g.save();g.strokeStyle='#E23B3B';g.lineWidth=R*.04;g.beginPath();g.moveTo(R*.9,R*.14);g.quadraticCurveTo(R*.6,R*.6,R*.2,R*.75);g.stroke();g.restore()}],
  ['Ski Beanie','common',(g,R,p)=>onTop(g,R,p,null,u=>{
    g.beginPath();g.moveTo(-.5*u,-.08*u);g.bezierCurveTo(-.52*u,-.78*u,.52*u,-.78*u,.5*u,-.08*u);g.closePath();fs(g,'#2F7BD6');
    g.save();g.clip();g.fillStyle='#fff';g.fillRect(-.6*u,-.42*u,1.2*u,.1*u);g.fillStyle='#E23B3B';g.fillRect(-.6*u,-.3*u,1.2*u,.08*u);g.restore();
    g.beginPath();g.rect(-.54*u,-.16*u,1.08*u,.2*u);fs(g,'#1F5AA8');g.save();g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=u*.025;g.beginPath();for(let x=-.46;x<=.47;x+=.1){g.moveTo(x*u,-.13*u);g.lineTo(x*u,.01*u)}g.stroke();g.restore();
    line(g,u);ell(g,0,-.66*u,.17*u,.16*u);fs(g,'#fff');dots(g,u,[[-.05,-.7,.03],[.06,-.62,.03],[-.08,-.6,.025]],'#DDE6F0')})],
  ['Tennis Visor','common',(g,R)=>{line(g,R);g.save();g.lineWidth=R*.19;g.strokeStyle=OUT;g.beginPath();g.arc(0,0,R*.86,-2.7,-.7);g.stroke();g.lineWidth=R*.14;g.strokeStyle='#fff';g.stroke();g.lineWidth=R*.04;g.strokeStyle='#1E9E5A';g.stroke();g.restore();
    line(g,R);g.beginPath();g.moveTo(R*.4,-R*.84);g.quadraticCurveTo(R*1.0,-R*1.0,R*1.22,-R*.66);g.quadraticCurveTo(R*.9,-R*.58,R*.6,-R*.6);g.closePath();fs(g,'#26B868');
    g.save();g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=R*.03;g.beginPath();g.moveTo(R*.55,-R*.82);g.quadraticCurveTo(R*.95,-R*.92,R*1.12,-R*.7);g.stroke();g.restore()}],
  ['Laurel Wreath','rare',(g,R,p,t)=>{line(g,R);g.save();g.lineWidth=R*.04;g.strokeStyle='#5A7A2A';g.beginPath();g.arc(0,0,R*.98,-2.75,-.5);g.stroke();g.restore();
    for(let a=-2.7,k=0;a<=-.5;a+=.15,k++){const rr=R*(k%2?1.06:.9),x=Math.cos(a)*rr,y=Math.sin(a)*rr;line(g,R);g.lineWidth=Math.max(.8,R*.025);ell(g,x,y,R*.15,R*.065,a+(k%2?.7:-.7));fs(g,k%3?'#6CBF4A':'#4E9A38')}
    dots(g,R,[[Math.cos(-1.6)*.98,Math.sin(-1.6)*.98,.06],[Math.cos(-2.2)*.98,Math.sin(-2.2)*.98,.05],[Math.cos(-1.0)*.98,Math.sin(-1.0)*.98,.05]],'#FFD23F')}],
  ['Cheer Bow','common',(g,R,p)=>onTop(g,R,p,.05,u=>{
    g.beginPath();g.moveTo(-.04*u,-.12*u);g.quadraticCurveTo(-.2*u,.1*u,-.3*u,.22*u);g.lineTo(-.14*u,.2*u);g.closePath();fs(g,'#E0408A');g.beginPath();g.moveTo(.04*u,-.12*u);g.quadraticCurveTo(.2*u,.1*u,.32*u,.2*u);g.lineTo(.16*u,.22*u);g.closePath();fs(g,'#E0408A');
    ell(g,-.3*u,-.22*u,.32*u,.2*u,-.35);fs(g,'#FF5FA8');ell(g,.3*u,-.22*u,.32*u,.2*u,.35);fs(g,'#FF5FA8');
    dots(g,u,[[-.42,-.28,.04],[-.24,-.14,.035],[-.26,-.32,.03],[.42,-.28,.04],[.24,-.14,.035],[.28,-.33,.03]],'#fff');
    ell(g,0,-.16*u,.11*u,.11*u);fs(g,'#E0408A')})],
  ['Tin Robot Dome','uncommon',(g,R,p,t)=>onTop(g,R,p,.08,u=>{
    g.beginPath();g.moveTo(0,-.5*u);g.lineTo(0,-.86*u);g.stroke();
    g.beginPath();g.moveTo(-.5*u,0);g.bezierCurveTo(-.52*u,-.66*u,.52*u,-.66*u,.5*u,0);g.closePath();fs(g,'#B6C0CC');
    g.beginPath();g.rect(-.54*u,-.12*u,1.08*u,.16*u);fs(g,'#8E99A6');dots(g,u,[[-.42,-.04,.03],[-.21,-.04,.03],[0,-.04,.03],[.21,-.04,.03],[.42,-.04,.03]],'#5E6874');
    g.save();g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=u*.05;g.beginPath();g.arc(0,-.12*u,.32*u,-2.6,-2.0);g.stroke();g.restore();
    const on=Math.sin(t*5)>0;ell(g,0,-.9*u,.1*u,.1*u);fs(g,on?'#FF4A3A':'#A82A20');if(on){g.save();g.globalAlpha=.35;ell(g,0,-.9*u,.2*u,.2*u);g.fillStyle='#FF4A3A';g.fill();g.restore()}})],
  ['Android Visor','rare',(g,R,p,t)=>{onTop(g,R,p,.1,u=>{g.beginPath();g.moveTo(-.42*u,.02*u);g.quadraticCurveTo(-.1*u,-.5*u,.42*u,-.04*u);g.closePath();fs(g,'#E8EDF3');g.save();g.strokeStyle='#38E8FF';g.lineWidth=u*.04;g.beginPath();g.moveTo(-.2*u,-.1*u);g.quadraticCurveTo(0,-.32*u,.22*u,-.12*u);g.stroke();g.restore()});
    line(g,R);g.save();g.beginPath();g.arc(0,0,R*1.05,0,TAU);g.clip();
    g.beginPath();g.moveTo(R*.02,-R*.52);g.lineTo(R*1.1,-R*.56);g.lineTo(R*1.1,R*.0);g.lineTo(R*.06,R*.06);g.quadraticCurveTo(-R*.04,-R*.23,R*.02,-R*.52);g.closePath();
    g.fillStyle='rgba(56,232,255,.32)';g.fill();g.stroke();g.restore();
    const sh=(t*.6)%1;g.save();g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=R*.05;g.beginPath();g.moveTo(R*(.15+sh*.7),-R*.48);g.lineTo(R*(.05+sh*.7),R*.0);g.stroke();g.restore()}],
  ['Pirate Captain','epic',(g,R,p)=>{patch(g,R,p);onTop(g,R,p,.1,u=>{
    g.beginPath();g.moveTo(-.88*u,.02*u);g.quadraticCurveTo(-.55*u,-.2*u,-.4*u,-.58*u);g.quadraticCurveTo(0,-.74*u,.4*u,-.58*u);g.quadraticCurveTo(.55*u,-.2*u,.9*u,.02*u);g.quadraticCurveTo(0,-.2*u,-.88*u,.02*u);g.closePath();fs(g,'#1B1820');
    g.save();g.strokeStyle='#F2C230';g.lineWidth=u*.055;g.beginPath();g.moveTo(-.8*u,0);g.quadraticCurveTo(0,-.16*u,.82*u,0);g.stroke();g.restore();
    g.beginPath();g.moveTo(.18*u,-.5*u);g.quadraticCurveTo(.6*u,-1.0*u,.95*u,-.86*u);g.quadraticCurveTo(.6*u,-.72*u,.28*u,-.44*u);g.closePath();fs(g,'#F4F4F0');
    g.save();g.fillStyle='#fff';g.beginPath();g.arc(-.1*u,-.4*u,.09*u,0,TAU);g.fill();g.strokeStyle='#fff';g.lineWidth=u*.04;g.beginPath();g.moveTo(-.24*u,-.24*u);g.lineTo(.04*u,-.3*u);g.moveTo(-.24*u,-.3*u);g.lineTo(.04*u,-.24*u);g.stroke();g.restore()})}],
  ['Bandana and Patch','rare',(g,R,p)=>{line(g,R);
    g.beginPath();g.moveTo(-R*.82,-R*.42);g.quadraticCurveTo(-R*1.25,-R*.6,-R*1.36,-R*.32);g.quadraticCurveTo(-R*1.12,-R*.32,-R*.9,-R*.26);g.closePath();fs(g,'#B81F2A');
    g.beginPath();g.moveTo(-R*.84,-R*.36);g.quadraticCurveTo(-R*1.2,-R*.2,-R*1.24,R*.04);g.quadraticCurveTo(-R*1.02,-R*.06,-R*.86,-R*.22);g.closePath();fs(g,'#B81F2A');
    capPath(g,R,-R,-R*.1,R*.8,-R*.66);g.fillStyle='#D7262F';g.fill();dots(g,R,[[-.5,-.62,.06],[-.15,-.78,.06],[.2,-.82,.055],[-.72,-.32,.05],[.5,-.86,.05],[-.3,-.42,.05]],'#fff');g.restore();
    line(g,R);g.beginPath();g.moveTo(-R,-R*.1);g.lineTo(R*.8,-R*.66);g.stroke();ell(g,-R*.86,-R*.32,R*.11,R*.1);fs(g,'#B81F2A');patch(g,R,p)}],
  ['The Boss Fedora','epic',(g,R,p)=>onTop(g,R,p,.22,u=>{
    ell(g,0,0,.8*u,.14*u);fs(g,'#4C515E');
    g.beginPath();g.moveTo(-.45*u,-.02*u);g.quadraticCurveTo(-.5*u,-.4*u,-.36*u,-.56*u);g.quadraticCurveTo(-.1*u,-.4*u,0,-.44*u);g.quadraticCurveTo(.12*u,-.4*u,.38*u,-.58*u);g.quadraticCurveTo(.5*u,-.4*u,.45*u,-.02*u);g.closePath();fs(g,'#5E6474');
    g.save();g.beginPath();g.moveTo(-.46*u,-.06*u);g.lineTo(.46*u,-.06*u);g.lineTo(.47*u,-.2*u);g.lineTo(-.47*u,-.2*u);g.closePath();g.fillStyle='#141418';g.fill();g.restore();
    g.save();g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=u*.04;g.beginPath();g.moveTo(-.3*u,-.48*u);g.quadraticCurveTo(-.36*u,-.32*u,-.34*u,-.24*u);g.stroke();g.restore()})],
  ['Top Hat and Monocle','rare',(g,R,p)=>{const {ex,ey,er}=eye(R,p);onTop(g,R,p,.12,u=>{
    ell(g,0,0,.64*u,.11*u);fs(g,'#16161B');g.beginPath();g.rect(-.38*u,-.98*u,.76*u,.96*u);fs(g,'#16161B');g.fillStyle='#C21E2A';g.fillRect(-.38*u,-.28*u,.76*u,.16*u);
    ell(g,0,-.98*u,.38*u,.08*u);fs(g,'#26262E');g.save();g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=u*.05;g.beginPath();g.moveTo(-.26*u,-.88*u);g.lineTo(-.26*u,-.36*u);g.stroke();g.restore()});
    g.save();g.strokeStyle='#F2C230';g.lineWidth=Math.max(1,R*.03);g.beginPath();g.moveTo(ex,ey+er*1.25);g.quadraticCurveTo(R*.5,R*.5,R*.15,R*.62);g.stroke();
    g.lineWidth=Math.max(1.4,R*.07);g.strokeStyle=OUT;ell(g,ex,ey,er*1.28,er*1.28);g.stroke();g.lineWidth=Math.max(1,R*.045);g.strokeStyle='#F2C230';g.stroke();g.fillStyle='rgba(255,255,255,.12)';g.fill();g.restore()}],
  ['Bodyguard Shades','uncommon',(g,R,p)=>{const {ex,ey,er}=eye(R,p);line(g,R);
    g.lineWidth=Math.max(1.2,R*.05);g.beginPath();g.moveTo(ex-er*1.1,ey-er*.4);g.lineTo(-R*.3,-R*.42);g.stroke();
    line(g,R);g.beginPath();g.moveTo(ex-er*1.3,ey-er*.75);g.lineTo(ex+er*1.5,ey-er*.85);g.quadraticCurveTo(ex+er*1.55,ey+er*.6,ex+er*.4,ey+er*.75);g.quadraticCurveTo(ex-er*1.2,ey+er*.7,ex-er*1.3,ey-er*.75);g.closePath();fs(g,'#0E0F14');
    g.save();g.strokeStyle='rgba(150,180,230,.75)';g.lineWidth=Math.max(1,R*.035);g.beginPath();g.moveTo(ex-er*.7,ey-er*.4);g.lineTo(ex+er*.1,ey-er*.45);g.stroke();g.restore();
    g.save();g.strokeStyle='#DADDE4';g.lineWidth=Math.max(1,R*.03);g.beginPath();g.moveTo(-R*.32,-R*.3);for(let k=0;k<4;k++)g.quadraticCurveTo(-R*(.42+k*.0),-R*(.2-k*.12),-R*.3,-R*(.12-k*.12));g.stroke();ell(g,-R*.32,-R*.32,R*.05,R*.05);g.fillStyle='#DADDE4';g.fill();g.restore()}],
  ['Wizard Hat','epic',(g,R,p,t)=>onTop(g,R,p,.1,u=>{
    ell(g,0,0,.72*u,.13*u);fs(g,'#4A2690');
    g.beginPath();g.moveTo(-.42*u,-.04*u);g.lineTo(-.06*u,-1.12*u);g.quadraticCurveTo(.26*u,-1.36*u,.56*u,-1.0*u);g.quadraticCurveTo(.28*u,-1.04*u,.14*u,-.96*u);g.lineTo(.42*u,-.04*u);g.closePath();fs(g,'#5A2FA8');
    const tw=(Math.sin(t*4)+1)/2;g.save();g.fillStyle='#FFD23F';for(const [x,y,s] of [[-.12,-.42,.1],[.16,-.68,.07],[.02,-.16,.06]]){g.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,r=(k%2?.42:1)*s*u*(.85+.3*tw);g.lineTo(x*u+Math.cos(a)*r,y*u+Math.sin(a)*r)}g.closePath();g.fill()}g.restore()})],
  ['Crown','legendary',(g,R,p,t)=>onTop(g,R,p,.1,u=>{
    g.beginPath();g.moveTo(-.44*u,0);g.lineTo(-.48*u,-.58*u);g.lineTo(-.24*u,-.3*u);g.lineTo(0,-.7*u);g.lineTo(.24*u,-.3*u);g.lineTo(.48*u,-.58*u);g.lineTo(.44*u,0);g.closePath();fs(g,'#FFC93C');
    g.beginPath();g.rect(-.46*u,-.18*u,.92*u,.2*u);fs(g,'#E8A82A');
    dots(g,u,[[-.25,-.08,.06],[.25,-.08,.06]],'#2F7BD6');dots(g,u,[[0,-.08,.075]],'#D7262F');dots(g,u,[[-.48,-.6,.05],[0,-.72,.055],[.48,-.6,.05]],'#FFF2B8');
    const s=(t*1.3)%1.6;if(s<.5){const a=s/.5,x=.12*u,y=-.42*u,r=(Math.sin(a*Math.PI))*.16*u;g.save();g.fillStyle='#fff';g.beginPath();g.moveTo(x,y-r);g.lineTo(x+r*.25,y);g.lineTo(x,y+r);g.lineTo(x-r*.25,y);g.closePath();g.fill();g.beginPath();g.moveTo(x-r,y);g.lineTo(x,y+r*.25);g.lineTo(x+r,y);g.lineTo(x,y-r*.25);g.closePath();g.fill();g.restore()}})]
];

// =====================================================================
//  Little pictures for the effects (also the trail and pop pieces)
// =====================================================================
function star(g,x,y,r,rot,c){g.save();g.translate(x,y);g.rotate(rot||0);g.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,rr=k%2?r*.45:r;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.closePath();g.fillStyle=c||'#FFD23F';g.fill();g.lineWidth=Math.max(1,r*.15);g.strokeStyle='rgba(120,70,0,.6)';g.stroke();g.restore()}
function heart(g,x,y,r,rot,c){g.save();g.translate(x,y);g.rotate(rot||0);g.beginPath();g.moveTo(0,r*.9);g.bezierCurveTo(-r*1.3,0,-r*.8,-r*1.1,0,-r*.4);g.bezierCurveTo(r*.8,-r*1.1,r*1.3,0,0,r*.9);g.closePath();g.fillStyle=c||'#FF5FA8';g.fill();g.lineWidth=Math.max(1,r*.15);g.strokeStyle='rgba(120,0,40,.5)';g.stroke();g.restore()}
function soccer(g,x,y,r,rot){g.save();g.translate(x,y);g.rotate(rot||0);g.beginPath();g.arc(0,0,r,0,TAU);g.fillStyle='#fff';g.fill();g.lineWidth=Math.max(1,r*.14);g.strokeStyle='#1A1A1F';g.stroke();g.beginPath();for(let k=0;k<5;k++){const a=k*TAU/5-Math.PI/2;g.lineTo(Math.cos(a)*r*.42,Math.sin(a)*r*.42)}g.closePath();g.fillStyle='#1A1A1F';g.fill();
  for(let k=0;k<5;k++){const a=k*TAU/5-Math.PI/2;g.beginPath();g.moveTo(Math.cos(a)*r*.42,Math.sin(a)*r*.42);g.lineTo(Math.cos(a)*r,Math.sin(a)*r);g.stroke()}g.restore()}
function bball(g,x,y,r,rot){g.save();g.translate(x,y);g.rotate(rot||0);g.beginPath();g.arc(0,0,r,0,TAU);g.fillStyle='#F0822A';g.fill();g.lineWidth=Math.max(1,r*.12);g.strokeStyle='#2A1408';g.stroke();g.beginPath();g.moveTo(-r,0);g.lineTo(r,0);g.moveTo(0,-r);g.lineTo(0,r);g.moveTo(-r*.7,-r*.7);g.quadraticCurveTo(-r*.15,0,-r*.7,r*.7);g.moveTo(r*.7,-r*.7);g.quadraticCurveTo(r*.15,0,r*.7,r*.7);g.stroke();g.restore()}
function coin(g,x,y,r,rot){const s=Math.abs(Math.cos(rot||0));g.save();g.translate(x,y);g.beginPath();g.ellipse(0,0,Math.max(.5,r*s),r,0,0,TAU);const gr=g.createLinearGradient(-r,-r,r,r);gr.addColorStop(0,'#FFF2B8');gr.addColorStop(.5,'#FFC93C');gr.addColorStop(1,'#C98A12');g.fillStyle=gr;g.fill();g.lineWidth=Math.max(1,r*.14);g.strokeStyle='#8A5A10';g.stroke();if(s>.4){g.beginPath();g.ellipse(0,0,r*s*.55,r*.55,0,0,TAU);g.stroke()}g.restore()}
function gear(g,x,y,r,rot){g.save();g.translate(x,y);g.rotate(rot||0);g.beginPath();for(let k=0;k<16;k++){const a=k*TAU/16,rr=k%2?r*.78:r;g.lineTo(Math.cos(a-.1)*rr,Math.sin(a-.1)*rr);g.lineTo(Math.cos(a+.1)*rr,Math.sin(a+.1)*rr)}g.closePath();g.fillStyle='#AEB8C4';g.fill();g.lineWidth=Math.max(1,r*.12);g.strokeStyle='#3A424E';g.stroke();g.beginPath();g.arc(0,0,r*.32,0,TAU);g.fillStyle='#3A424E';g.fill();g.restore()}
function bolt(g,x,y,r,rot){g.save();g.translate(x,y);g.rotate(rot||0);g.fillStyle='#9AA6B4';g.strokeStyle='#3A424E';g.lineWidth=Math.max(1,r*.12);g.beginPath();g.rect(-r*.18,-r*.2,r*.36,r*1.1);g.fill();g.stroke();g.beginPath();for(let k=0;k<6;k++){const a=k*TAU/6;g.lineTo(Math.cos(a)*r*.45,-r*.35+Math.sin(a)*r*.45)}g.closePath();g.fill();g.stroke();g.restore()}
function feather(g,x,y,r,rot){g.save();g.translate(x,y);g.rotate(rot||0);g.beginPath();g.moveTo(0,-r);g.quadraticCurveTo(r*.55,-r*.2,0,r);g.quadraticCurveTo(-r*.55,-r*.2,0,-r);g.fillStyle='#F8F8F2';g.fill();g.lineWidth=Math.max(1,r*.1);g.strokeStyle='rgba(120,130,150,.7)';g.stroke();g.beginPath();g.moveTo(0,-r*.8);g.lineTo(0,r*1.15);g.stroke();g.restore()}
const GUM=['#FF5FA8','#3FA9F5','#FFD23F','#5FD068','#B46CFF','#FF8A1F'];
function gum(g,x,y,r,rot,c){g.save();g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=c||GUM[0];g.fill();g.lineWidth=Math.max(1,r*.12);g.strokeStyle='rgba(0,0,0,.35)';g.stroke();g.beginPath();g.arc(x-r*.35,y-r*.35,r*.25,0,TAU);g.fillStyle='rgba(255,255,255,.7)';g.fill();g.restore()}
function card(g,x,y,r,rot,c){g.save();g.translate(x,y);g.rotate(rot||0);g.beginPath();g.roundRect?g.roundRect(-r*.7,-r,r*1.4,r*2,r*.18):g.rect(-r*.7,-r,r*1.4,r*2);g.fillStyle='#FFFDF6';g.fill();g.lineWidth=Math.max(1,r*.1);g.strokeStyle='rgba(0,0,0,.45)';g.stroke();
  g.fillStyle=c==='r'?'#D7262F':'#1A1A1F';g.beginPath();if(c==='r'){g.moveTo(0,-r*.45);g.lineTo(r*.38,0);g.lineTo(0,r*.45);g.lineTo(-r*.38,0)}else{g.arc(0,-r*.12,r*.28,0,TAU);g.moveTo(0,0);g.lineTo(r*.2,r*.45);g.lineTo(-r*.2,r*.45)}g.closePath();g.fill();g.restore()}
function spark(g,x,y,r,rot,c){g.save();g.globalCompositeOperation='lighter';g.fillStyle=c||'#FFD23F';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.globalAlpha*=.35;g.beginPath();g.arc(x,y,r*2.4,0,TAU);g.fill();g.restore()}
function trophy(g,x,y,r){g.save();g.translate(x,y);g.lineWidth=Math.max(1.2,r*.07);g.strokeStyle='#8A5A10';g.beginPath();g.moveTo(-r*.5,-r*.8);g.lineTo(r*.5,-r*.8);g.lineTo(r*.45,-r*.3);g.quadraticCurveTo(r*.4,r*.15,0,r*.2);g.quadraticCurveTo(-r*.4,r*.15,-r*.45,-r*.3);g.closePath();g.fillStyle='#FFC93C';g.fill();g.stroke();
  g.beginPath();g.moveTo(-r*.48,-r*.65);g.quadraticCurveTo(-r*.95,-r*.65,-r*.8,-r*.3);g.quadraticCurveTo(-r*.7,-r*.1,-r*.42,-r*.15);g.moveTo(r*.48,-r*.65);g.quadraticCurveTo(r*.95,-r*.65,r*.8,-r*.3);g.quadraticCurveTo(r*.7,-r*.1,r*.42,-r*.15);g.stroke();
  g.fillStyle='#E2A82A';g.fillRect(-r*.12,r*.2,r*.24,r*.3);g.fillStyle='#6A3A1A';g.fillRect(-r*.42,r*.5,r*.84,r*.28);g.strokeRect(-r*.42,r*.5,r*.84,r*.28);
  g.strokeStyle='#FFF2B8';g.lineWidth=r*.08;g.beginPath();g.moveTo(-r*.28,-r*.65);g.quadraticCurveTo(-r*.28,-r*.1,-r*.05,r*.05);g.stroke();g.restore()}
const TRAILS=[['Stars','common',star],['Hearts','common',heart],['Soccer Balls','uncommon',soccer],['Basketballs','uncommon',bball],['Gold Doubloons','rare',coin],['Gears','uncommon',gear]];
const POPS=[['Feathers','common',feather],['Gumballs','uncommon',gum],['Nuts and Bolts','uncommon',bolt],['Playing Cards','rare',card],['Fireworks','epic',spark]];
const WINS=[['Ticker Tape','common',null],['Trophy Lift','rare',trophy],['Gold Rain','legendary',coin]];
const LISTS=[HATS,TRAILS,POPS,WINS],SLOTS=['hat','trail','pop','win'];

// =====================================================================
//  What is worn
// =====================================================================
const norm=k=>{k=Array.isArray(k)?k:[];return LISTS.map((L,i)=>{const n=k[i]|0;return n>0&&n<=L.length?n:0})};
let kit=norm(A.store.get('wardrobe',[]));
function mine(){return A.wardOn()?kit:null}
function wire(){const k=mine();return k&&(k[0]||k[1]||k[2]||k[3])?k.join('.'):''}
function parse(raw){
  if(typeof raw!=='string'||!/^\d{1,3}(\.\d{1,3}){3}$/.test(raw))return null;
  const w=raw.split('.').map((v,i)=>{v=+v;return v<=LISTS[i].length?v:0});return w.some(Boolean)?w:null;
}

// =====================================================================
//  The effects: a few dozen pieces of our own, on the page's effects canvas
// =====================================================================
const FX=[];
function add(p){p.a=0;FX.push(p);if(FX.length>220)FX.shift()}
function reduced(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
// an accepted answer: pieces fly from the puffer to the next player along a little arc
function trail(n,x0,y0,x1,y1){
  if(!(n>0&&n<=TRAILS.length))return false;
  const f=TRAILS[n-1][2];
  for(let i=0;i<9;i++)add({k:'arc',f,x:x0+rand(-6,6),y:y0+rand(-6,6),tx:x1+rand(-8,8),ty:y1+rand(-8,8),d:i*.045,life:.62+Math.random()*.2,r:rand(5,8),rot:rand(0,TAU),vr:rand(-6,6),c:n===2?['#FF5FA8','#FF7A9A','#FF4A6A'][i%3]:null});
  return true;
}
// the puffer popped on this player: extra pieces on top of the usual burst
function pop(n,x,y,R){
  if(!(n>0&&n<=POPS.length))return;
  if(n===5){const C=['#FF4F8B','#3FD2FF','#FFD23F','#7CFF6A'];for(let b=0;b<4;b++){const cx=x+rand(-R*2.2,R*2.2),cy=y+rand(-R*1.8,R*.4),c=C[b];for(let k=0;k<16;k++){const a=k*TAU/16;add({k:'fly',f:spark,x:cx,y:cy,vx:Math.cos(a)*rand(90,150),vy:Math.sin(a)*rand(90,150),g:60,drag:.9,d:b*.18,life:.9,r:2.6,c})}}return}
  const f=POPS[n-1][2],slow=n===1;
  for(let k=0;k<(n===4?16:22);k++){const a=rand(0,TAU),sp=slow?rand(80,200):rand(180,420);add({k:'fly',f,x:x+Math.cos(a)*R*.5,y:y+Math.sin(a)*R*.5,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-(slow?40:80),g:slow?60:520,drag:slow?.9:.97,d:0,life:slow?1.8:1.3,r:n===4?rand(9,12):rand(5,9),rot:rand(0,TAU),vr:rand(-8,8),sway:slow?rand(1.5,3):0,c:n===2?GUM[k%GUM.length]:n===4?(k%2?'r':'b'):null})}
}
// a match won by this player: kept to the edges of the screen
function victory(n){
  if(!(n>0&&n<=WINS.length))return;
  const S=A.size(),W=S.W,H=S.H;
  if(n===1){const C=['#FF4F8B','#3FA9F5','#FFD23F','#5FD068','#B46CFF','#FFFFFF'];for(let k=0;k<46;k++){const left=k%2===0,x=left?rand(0,W*.2):rand(W*.8,W);add({k:'tape',x,y:rand(-H*.4,-10),vy:rand(90,160),w:rand(4,6),h:rand(18,30),ph:rand(0,TAU),d:rand(0,.8),life:3.2,c:C[k%C.length]})}}
  if(n===2){for(const fx of [.11,.89]){const x=W*fx;add({k:'rise',f:trophy,x,y:H*.9,ty:H*.62,d:0,life:2.6,r:Math.min(46,W*.06)});for(let k=0;k<14;k++){const a=rand(0,TAU),r=rand(30,70);add({k:'fly',f:spark,x:x+Math.cos(a)*r*.2,y:H*.6+Math.sin(a)*r*.2,vx:Math.cos(a)*r*1.4,vy:Math.sin(a)*r*1.4,g:0,drag:.95,d:rand(.6,1.4),life:.8,r:2.4,c:'#FFF2B8'})}}}
  if(n===3){for(let k=0;k<54;k++){const left=k%2===0,x=left?rand(0,W*.22):rand(W*.78,W);add({k:'fly',f:coin,x,y:rand(-H*.5,-12),vx:0,vy:rand(160,260),g:240,drag:1,d:rand(0,1),life:2.6,r:rand(7,11),rot:rand(0,TAU),vr:rand(4,9)})}}
}
function draw(g,dt){
  if(!FX.length)return;
  const red=reduced();
  for(let i=FX.length-1;i>=0;i--){const p=FX[i];p.a+=dt;if(p.a<p.d)continue;const t=p.a-p.d;if(t>p.life){FX.splice(i,1);continue}if(red){continue}
    const k=t/p.life;g.save();
    if(p.k==='arc'){const e=1-Math.pow(1-k,2),x=p.x+(p.tx-p.x)*e,y=p.y+(p.ty-p.y)*e-Math.sin(e*Math.PI)*34;g.globalAlpha=k>.8?(1-k)/.2:1;p.f(g,x,y,p.r*(1-.25*k),p.rot+p.vr*t,p.c)}
    else if(p.k==='fly'){if(!p.v){p.v=1;p.px=p.x;p.py=p.y}const dd=Math.pow(p.drag,dt*60);p.vx*=dd;p.vy=p.vy*dd+p.g*dt;p.px+=p.vx*dt;p.py+=p.vy*dt;const sx=p.sway?Math.sin(t*p.sway*2)*12:0;g.globalAlpha=k>.7?(1-k)/.3:1;p.f(g,p.px+sx,p.py,p.r,(p.rot||0)+(p.vr||0)*t,p.c)}
    else if(p.k==='tape'){const y=p.y+p.vy*t,x=p.x+Math.sin(t*3+p.ph)*10;g.globalAlpha=k>.75?(1-k)/.25:1;g.translate(x,y);g.rotate(Math.sin(t*4+p.ph)*.8);g.fillStyle=p.c;g.fillRect(-p.w/2,-p.h/2,p.w,p.h)}
    else if(p.k==='rise'){const e=Math.min(1,t/.6),o=1-Math.pow(1-e,3);g.globalAlpha=k>.8?(1-k)/.2:Math.min(1,t/.2);p.f(g,p.x,p.y+(p.ty-p.y)*o+Math.sin(t*3)*3,p.r)}
    g.restore()}
}

// =====================================================================
//  The Wardrobe screen
// =====================================================================
const CSS=`
#wdOpen{margin-top:10px}
#wd{background:rgba(4,17,31,.8);z-index:5}
#wd .card{width:min(860px,100%);display:flex;flex-direction:column;overflow:hidden}
.wd-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.wd-head h2{font:700 30px/1 var(--f-d);margin:0;color:var(--sun)}
.wd-sub{margin:6px 0 10px;font:700 13px/1.35 var(--f-u);color:var(--ink-2)}
.wd-body{display:grid;grid-template-columns:230px minmax(0,1fr);gap:16px;min-height:0;flex:1 1 auto}
.wd-prev{display:flex;flex-direction:column;align-items:center;gap:8px}
.wd-prev canvas{width:100%;max-width:230px;aspect-ratio:1;border-radius:18px;background:radial-gradient(circle at 50% 35%,#0f4a80,#062040);border:1px solid var(--line)}
.wd-prev small{font:700 12px var(--f-u);color:var(--ink-3);text-align:center}
.wd-pick{display:flex;flex-direction:column;min-height:0;min-width:0}
.wd-tabs{flex-wrap:wrap;align-self:flex-start}
.wd-note{margin:8px 0;font:700 13px/1.35 var(--f-u);color:var(--ink-2)}
.wd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;overflow:auto;min-height:0;padding:2px 2px 8px;align-content:start;flex:1 1 auto}
.wd-grid button{display:flex;flex-direction:column;align-items:center;gap:4px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.05);padding:6px 4px 7px;font:800 12px/1.15 var(--f-u);color:var(--ink);cursor:pointer;min-width:0}
.wd-grid button:hover{background:rgba(255,255,255,.1)}
.wd-grid button[aria-pressed="true"]{border-color:var(--sun);background:rgba(255,209,102,.16);box-shadow:0 0 0 1px var(--sun)}
.wd-grid canvas{width:72px;height:72px}
.wd-grid em{font:800 10px var(--f-u);letter-spacing:.08em;text-transform:uppercase;font-style:normal}
.r-common{color:#B9C2CC}.r-uncommon{color:#6FD08A}.r-rare{color:#5FB4FF}.r-epic{color:#C78AFF}.r-legendary{color:#FFC93C}
@media (max-width:640px){.wd-body{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}.wd-prev canvas{max-width:130px}.wd-prev small{display:none}.wd-grid{grid-template-columns:repeat(auto-fill,minmax(84px,1fr))}.wd-grid canvas{width:60px;height:60px}}
@media (max-height:520px){.wd-sub{display:none}.wd-head h2{font-size:24px}.wd-body{grid-template-columns:150px minmax(0,1fr)}.wd-prev small{display:none}.wd-grid{grid-template-columns:repeat(auto-fill,minmax(84px,1fr))}.wd-grid canvas{width:56px;height:56px}.wd-note{margin:4px 0}}
`;
const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
const TABS=[['Hats','The pufferfish wears your hat while it\'s your turn. It swells, changes colour and pops exactly the same.'],
  ['Trails','Fly to the next player when your answer counts, in place of the bubbles.'],
  ['Pops','Extra pieces when the puffer pops on you.'],
  ['Victory','Plays at the sides of the screen for everyone when you win a match.']];
const NONE=['No hat','Bubbles','Usual pop','Usual win'];
let tab=0,built=false,isOpen=false,raf=0;
function hatAt(g,x,y,R,p,n,t){A.drawPuffer(g,x,y,R,p,1,-.08,t,false,n)}
function tile(s,n){
  const c=document.createElement('canvas');c.width=c.height=144;const g=c.getContext('2d');g.scale(2,2);
  if(s===0){hatAt(g,33,47,23,.15,n,1)}
  else if(!n){g.strokeStyle='rgba(220,245,255,.8)';g.lineWidth=1.5;for(const [x,y,r] of s===1?[[22,48,6],[36,34,5],[50,22,4]]:[[36,36,10]]){g.beginPath();g.arc(x,y,r,0,TAU);g.stroke()}if(s>1){g.fillStyle='#f0a030';for(let k=0;k<8;k++){const a=k*TAU/8;g.beginPath();g.moveTo(36+Math.cos(a)*24,36+Math.sin(a)*24);g.lineTo(36+Math.cos(a+.2)*16,36+Math.sin(a+.2)*16);g.lineTo(36+Math.cos(a-.2)*16,36+Math.sin(a-.2)*16);g.fill()}}}
  else if(s===1){const f=TRAILS[n-1][2];f(g,20,50,8,.3,n===2?'#FF5FA8':null);f(g,36,34,7,-.4,n===2?'#FF7A9A':null);f(g,52,20,6,.8,n===2?'#FF4A6A':null)}
  else if(s===2){const f=POPS[n-1][2];if(n===5){const C=['#FF4F8B','#3FD2FF','#FFD23F'];C.forEach((c,b)=>{const cx=[24,48,34][b],cy=[26,30,50][b];for(let k=0;k<10;k++){const a=k*TAU/10;spark(g,cx+Math.cos(a)*11,cy+Math.sin(a)*11,1.8,0,c)}})}
    else for(const [x,y,r,i] of [[20,24,8,0],[50,22,7,1],[36,48,9,2],[56,50,6,3]])f(g,x,y,r,i*1.3,n===2?GUM[i]:n===4?(i%2?'r':'b'):null)}
  else{if(n===1){const C=['#FF4F8B','#3FA9F5','#FFD23F','#5FD068'];for(let k=0;k<12;k++){g.save();g.translate(10+(k*37)%54,8+(k*23)%56);g.rotate(k);g.fillStyle=C[k%4];g.fillRect(-2.5,-8,5,16);g.restore()}}
    else if(n===2)trophy(g,36,38,28);else for(const [x,y,r] of [[18,18,8],[44,14,7],[30,40,9],[54,46,8],[16,54,7]])coin(g,x,y,r,x)}
  return c;
}
function build(){
  if(built)return;built=true;
  const sec=document.createElement('section');sec.id='wd';sec.className='screen';sec.hidden=true;
  sec.innerHTML='<div class="card" role="dialog" aria-modal="true" aria-labelledby="wdTitle"><div class="wd-head"><h2 id="wdTitle">Wardrobe</h2><button class="ghost" id="wdDone" type="button">Done</button></div>'+
    '<p class="wd-sub">Captains only for now. Everything is free to wear, and only changes how things look.</p>'+
    '<div class="wd-body"><div class="wd-prev"><canvas id="wdPrev" width="460" height="460" aria-hidden="true"></canvas><small>The puffer on your turn</small><button class="ghost" id="wdTry" type="button" hidden>Try it</button></div>'+
    '<div class="wd-pick"><div class="seg wd-tabs" id="wdTabs" role="group" aria-label="Wardrobe sections">'+TABS.map((t,i)=>'<button type="button" data-t="'+i+'">'+t[0]+'</button>').join('')+'</div>'+
    '<p class="wd-note" id="wdNote"></p><div class="wd-grid" id="wdGrid"></div></div></div></div>';
  $('app').appendChild(sec);
  $('wdDone').onclick=close;sec.addEventListener('pointerdown',e=>{if(e.target===sec)close()});
  sec.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
  for(const b of $('wdTabs').children)b.onclick=()=>{tab=+b.dataset.t;fill()};
  $('wdTry').onclick=demo;
}
// the effect of the open tab, played over the preview
function demo(){
  const r=$('wdPrev').getBoundingClientRect(),a=$('app').getBoundingClientRect(),x=r.left-a.left+r.width/2,y=r.top-a.top+r.height*.48,R=r.width*.2;
  if(tab===1)trail(kit[1],x,y,x+r.width*.42,y+r.height*.44);else if(tab===2)pop(kit[2],x,y,R);else if(tab===3)victory(kit[3]);
}
function fill(){
  for(const b of $('wdTabs').children)b.setAttribute('aria-pressed',String(+b.dataset.t===tab));
  $('wdNote').textContent=TABS[tab][1];
  const L=LISTS[tab],g=$('wdGrid');g.innerHTML='';
  for(let n=0;n<=L.length;n++){const b=document.createElement('button');b.type='button';b.dataset.n=n;b.setAttribute('aria-pressed',String(kit[tab]===n));b.appendChild(tile(tab,n));
    const sp=document.createElement('span');sp.textContent=n?L[n-1][0]:NONE[tab];b.appendChild(sp);
    if(n){const em=document.createElement('em');em.className='r-'+L[n-1][1];em.textContent=L[n-1][1][0].toUpperCase()+L[n-1][1].slice(1);b.appendChild(em)}
    b.onclick=()=>choose(n);g.appendChild(b)}
  $('wdTry').hidden=!(tab>0&&kit[tab]);
}
function choose(n){kit[tab]=n;A.store.set('wardrobe',kit.slice());fill();if(tab>0&&n)demo();A.changed()}
function loop(t){if(!isOpen)return;raf=requestAnimationFrame(loop);const c=$('wdPrev'),g=c.getContext('2d'),s=t/1000;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,460,460);
  const p=(Math.sin(s*.9)+1)/2*.9;hatAt(g,215,250,72*(1+.6*Math.pow(p,1.25)),p,kit[0],s)}
function open(){if(!A.wardOn())return;build();isOpen=true;$('wd').hidden=false;fill();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  setTimeout(()=>{const b=$('wdGrid').querySelector('[aria-pressed="true"]')||$('wdDone');try{b.focus({preventScroll:true})}catch(e){}},0)}
function close(){if(!isOpen)return;isOpen=false;cancelAnimationFrame(raf);$('wd').hidden=true;const b=$('wdOpen');if(b)try{b.focus()}catch(e){}}
function sync(){
  let b=$('wdOpen');
  if(A.wardOn()){if(!b){b=document.createElement('button');b.id='wdOpen';b.type='button';b.className='ghost';b.textContent='Wardrobe';b.onclick=open;$('name').closest('.field').appendChild(b)}b.hidden=false}
  else{if(b)b.hidden=true;close()}
}
sync();
// the hat for the puffer's frame (called from drawPuffer, inside its transform)
function hat(g,R,p,n,t){if(n>0&&n<=HATS.length){g.save();try{HATS[n-1][2](g,R,clamp(p,0,1.05),t||0)}finally{g.restore()}}}
return{mine,wire,parse,hat,trail,pop,victory,draw,sync,open,close,LISTS,SLOTS,get kit(){return kit.slice()},get busy(){return FX.length},
  wear(slot,n){const i=SLOTS.indexOf(slot);if(i<0)return;kit[i]=n>0&&n<=LISTS[i].length?n:0;A.store.set('wardrobe',kit.slice());if(built&&isOpen)fill();A.changed()}};
};
