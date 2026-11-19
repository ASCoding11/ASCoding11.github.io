/*
 * Boostball kit: decals, boost trails, goal explosions, and the extras (antenna toppers, roof hats, wheels, engine
 * sounds). HIDDEN.
 *
 * index.html fetches this file only when something needs it: hidden things are switched on in this browser (the garage
 * switch: a captain's account, GARAGE_PUBLIC or the test address, see garageOn in index.html; or the cosmetics switch in
 * ../cosmetics.js), or another player's car arrives wearing
 * a kit. Players with everything off never load it. The page calls window.BoostballKit(G) once, where G is the short
 * list of things it lends (KITAPI in index.html: three.js, the scene, the team colours, its shape helpers), and gets back
 * the hooks it calls: dress() and wheel() while a car model is built, trail() for a boosting car, goal() when someone
 * scores, update() every frame, and the garage's pickers and previews.
 *
 * A car's kit is six item numbers [decal, trail, goal explosion, topper, hat, wheels]; the numbers are the `no` of
 * Boostball's items in ../cosmetics.js (GAME_ITEMS), which also holds their names, rarity and price. What a number
 * LOOKS like is decided here: DECALS, TRAILS, GOALS, TOPPERS, HATS, WHEELS and ENGINES below are in number order. A number this file does not know
 * draws nothing (the plain car, the plain flame, the plain fireball), so an older copy of this file copes with newer
 * items. Never reorder a list: add new ones at the end, and add the item with the same number to cosmetics.js.
 *
 * Everything is looks only. Nothing here reads or writes the physics, the ball, the score or the room.
 */
window.BoostballKit=function(G){
'use strict';
const THREE=G.THREE,V3=THREE.Vector3,TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const sm=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)};
const css=h=>'#'+(h>>>0).toString(16).padStart(6,'0');
const mixHex=(a,b,t)=>{let o=0;for(let i=16;i>=0;i-=8)o=o<<8|Math.round(lerp(a>>i&255,b>>i&255,t));return o};
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
const SLOTS=['decal','trail','goal','topper','hat','wheels','engine']; // the first six are the car's kit; the engine sound is its driver's alone

// =====================================================================
//  Decals
// =====================================================================
// A decal is one small picture per car, painted in code and wrapped over the paint. The picture has four panels:
// the side of the car (both sides show the same panel, so a design reads nose-first on either side), the top (bonnet,
// roof and boot, seen from above), the front and the rear. Each triangle of the paint takes the panel it faces, and
// its place in the panel comes straight from where it is on the car, so the same decal fits every body, lofted or
// built from boxes. A painter draws in car units (1 unit is about the car's half length less a fifth): on the side
// panel x runs tail to nose (-1.5 to 1.5) and y is height (-0.42 to 0.9); on the top panel x runs tail to nose and y
// is across the car (-1 to 1); on the front and rear panels x is across and y is height.
// The base is always the team colour: a painter adds pattern on top, and P gives it the team's own shades (P.dk
// darker, P.lt lighter), the car's accent colour (P.ac) and a random source that gives the same marks every time (P.r).
// Cost: no extra draw call (the paint mesh keeps its place; only its material and texture coordinates change), one
// 512 x 512 texture (256 on Fast and on phones) shared by every car with the same decal, team colour and accent.
const SIDE_H=.38,TOP_H=.38,END_H=.24,ZR=1.5,Y0=-.42,YH=1.32,XR=1;
function panels(S){ // each: [name, x0, y0, w, h] in pixels and how car units map into it
  return{
    side:{x:0,y:0,w:S,h:S*SIDE_H,u0:-ZR,u1:ZR,v0:Y0,v1:Y0+YH},
    top:{x:0,y:S*SIDE_H,w:S,h:S*TOP_H,u0:-ZR,u1:ZR,v0:-XR,v1:XR},
    front:{x:0,y:S*(SIDE_H+TOP_H),w:S/2,h:S*END_H,u0:-XR,u1:XR,v0:Y0,v1:Y0+YH},
    rear:{x:S/2,y:S*(SIDE_H+TOP_H),w:S/2,h:S*END_H,u0:-XR,u1:XR,v0:Y0,v1:Y0+YH}
  };
}
// ---- drawing helpers for painters (all in car units) ----
function blob(g,x,y,r,k,rnd,n){ // a lumpy closed shape
  n=n||9;const pts=[];for(let i=0;i<n;i++){const a=i/n*TAU,rr=r*(1-k+2*k*rnd());pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr*.8])}
  g.beginPath();for(let i=0;i<n;i++){const p=pts[i],q=pts[(i+1)%n];if(!i)g.moveTo((p[0]+pts[n-1][0])/2,(p[1]+pts[n-1][1])/2);g.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2)}
  g.closePath();
}
function poly(g,pts){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath()}
function starPath(g,x,y,r,n,inner,rot){g.beginPath();for(let i=0;i<n*2;i++){const a=(rot||0)+i*Math.PI/n,rr=i%2?r*inner:r;g[i?'lineTo':'moveTo'](x+Math.cos(a)*rr,y+Math.sin(a)*rr)}g.closePath()}
function line(g,pts,w,col){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.lineWidth=w;g.strokeStyle=col;g.lineCap='round';g.lineJoin='round';g.stroke()}
function dot(g,x,y,r,col){g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=col;g.fill()}
function rect(g,x,y,w,h,col){g.fillStyle=col;g.fillRect(x,y,w,h)}
function over(g,P,col,a){g.globalAlpha=a;rect(g,P.u0,P.v0,P.u1-P.u0,P.v1-P.v0,col);g.globalAlpha=1}
// smooth noise in 2D, the same every time for a seed
function noise2(seed){
  const h=(x,y)=>{let n=(x*374761393+y*668265263+seed*2147483647)|0;n=(n^(n>>>13))*1274126177|0;return((n^(n>>>16))>>>0)/4294967296};
  return(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
    return lerp(lerp(h(xi,yi),h(xi+1,yi),u),lerp(h(xi,yi+1),h(xi+1,yi+1),u),v)};
}
// flame tongues along +x to -x from x0: used by Flames on the side and top panels
function flames(g,x0,len,yc,span,n,rnd,cols){
  for(let L=0;L<cols.length;L++){
    const k=1-L*.3;g.beginPath();g.moveTo(x0+.05,yc-span/2);
    for(let i=0;i<n;i++){
      const a=yc-span/2+span*i/n,b=yc-span/2+span*(i+1)/n,m=(a+b)/2,ll=len*k*(.55+.45*Math.sin(i*2.4+1)*.5+.45*((i*7)%5)/5)*(L?.9:1);
      g.bezierCurveTo(x0-ll*.35,a+span/n*.1,x0-ll*.7,m-span/n*.55,x0-ll,m+span/n*.25*(i%2?1:-1));
      g.bezierCurveTo(x0-ll*.62,m+span/n*.2,x0-ll*.3,b-span/n*.35,x0-len*.12*k,b);
    }
    g.lineTo(x0+.05,yc+span/2);g.closePath();g.fillStyle=cols[L];g.fill();
  }
}
function leaf(g,x,y,s,rot,col,vein){
  g.save();g.translate(x,y);g.rotate(rot);g.beginPath();g.moveTo(-s,0);g.bezierCurveTo(-s*.4,s*.62,s*.5,s*.5,s,0);g.bezierCurveTo(s*.5,-s*.5,-s*.4,-s*.62,-s,0);g.fillStyle=col;g.fill();
  line(g,[[-s*1.25,0],[s*.8,0]],s*.09,vein);for(const k of[-.4,0,.4])line(g,[[k*s,0],[k*s+s*.28,s*.26]],s*.05,vein),line(g,[[k*s,0],[k*s+s*.28,-s*.26]],s*.05,vein);
  g.restore();
}
const HOT=['#ff3b1c','#ff8a1f','#ffd23f'];
// ---- the painters, in item-number order (cosmetics.js: boostball decal 1, 2, 3, ...) ----
const DECALS=[null,
  // 1 Flames
  (g,P)=>{
    if(P.panel==='side'){flames(g,1.5,2.7,-.04,.5,3,P.r,HOT)}
    else if(P.panel==='top'){flames(g,1.5,1.5,0,1.5,5,P.r,HOT)}
    else if(P.panel==='front'){const gr=g.createLinearGradient(0,-.3,0,.5);gr.addColorStop(0,'#ffd23f');gr.addColorStop(.55,'#ff8a1f');gr.addColorStop(1,'#ff3b1c');g.fillStyle=gr;g.fillRect(-1,-.42,2,1.32)}
  },
  // 2 Racing Stripes
  (g,P)=>{
    const a=P.ac,e=P.acInk;
    if(P.panel==='top'){for(const y of[-.17,.17]){rect(g,-1.5,y-.1,3,.2,a);rect(g,-1.5,y-.125,3,.012,e);rect(g,-1.5,y+.113,3,.012,e)}}
    else if(P.panel==='side'){rect(g,-1.5,-.17,3,.07,a);rect(g,-1.5,-.075,3,.02,a);dot(g,-.05,.02,.16,a);g.beginPath();g.arc(-.05,.02,.16,0,TAU);g.lineWidth=.02;g.strokeStyle=e;g.stroke();dot(g,-.05,.02,.07,P.base)}
    else{for(const x of[-.17,.17]){rect(g,x-.1,-.42,.2,1.32,a);rect(g,x-.125,-.42,.012,1.32,e);rect(g,x+.113,-.42,.012,1.32,e)}}
  },
  // 3 Lightning Bolts
  (g,P)=>{
    const bolt=(pts,w)=>{line(g,pts,w*2.3,'rgba(255,255,255,.28)');poly(g,pts);g.fillStyle='#ffe45c';g.fill();g.lineWidth=w*.5;g.strokeStyle='#fff7c2';g.lineJoin='miter';g.stroke()};
    if(P.panel==='side'){
      bolt([[-1.3,.42],[-.35,.2],[-.6,.05],[.4,-.02],[.1,-.16],[1.4,-.3],[.45,-.06],[.75,.08],[-.2,.14],[.05,.29]],.03);
      bolt([[-1.35,-.02],[-.95,-.1],[-1.05,-.16],[-.55,-.26],[-.9,-.14],[-.8,-.08]],.02);
    }else if(P.panel==='top'){
      bolt([[-1.35,.2],[-.5,.06],[-.7,-.08],[.3,-.04],[.05,-.2],[1.4,-.02],[.4,.1],[.65,.22],[-.3,.14],[-.1,.3]],.03);
      for(const s of[-1,1])bolt([[-1.2,s*.62],[-.6,s*.56],[-.72,s*.5],[-.1,s*.5],[-.5,s*.58],[-.42,s*.64]],.02);
    }else if(P.panel==='rear')bolt([[-.5,.3],[.05,.12],[-.12,.02],[.5,-.2],[.02,-.02],[.2,.1]],.03);
  },
  // 4 Checkered Flag
  (g,P)=>{
    const sq=.14,wave=x=>Math.sin(x*2.4)*.07;
    const band=(x0,x1,y0,y1,fade)=>{
      for(let i=0;x0+i*sq<x1;i++)for(let j=0;y0+j*sq<y1;j++){
        const x=x0+i*sq,y=y0+j*sq,k=fade?clamp((x1-x)/(x1-x0),0,1):1,s=sq*(.35+.65*k);
        g.fillStyle=(i+j)%2?'#14161f':'#f4f6ff';g.fillRect(x+(sq-s)/2,y+wave(x)+(sq-s)/2,s+.004,s+.004);
      }
    };
    if(P.panel==='side'){band(-1.5,.5,-.42,.9,1);line(g,[[.5,-.2],[1.5,-.2]],.03,'#f4f6ff');line(g,[[.5,-.15],[1.5,-.15]],.012,'#14161f')}
    else if(P.panel==='top'){band(-1.5,-.1,-1,1,1);for(const y of[-.08,.08])line(g,[[-.1,y],[1.5,y]],.05,(y<0)?'#f4f6ff':'#14161f')}
    else if(P.panel==='rear')band(-1,1,-.42,.9,0);
  },
  // 5 Shark Mouth
  (g,P)=>{
    const eye=(x,y,r)=>{dot(g,x,y,r*1.18,'#14161f');dot(g,x,y,r,'#fff');dot(g,x+r*.3,y,r*.52,'#14161f');dot(g,x+r*.5,y+r*.2,r*.16,'#fff')};
    if(P.panel==='front'){
      rect(g,-1,-.42,2,.62,'#c81e2e');rect(g,-1,-.42,2,.2,'#7a0f1a');g.fillStyle='#fff';
      for(let i=0;i<10;i++){const x=-1+i*.2;poly(g,[[x,.2],[x+.2,.2],[x+.1,-.02]]);g.fill();poly(g,[[x+.1,-.42],[x+.3,-.42],[x+.2,-.2]]);g.fill()}
      line(g,[[-1,.2],[1,.2]],.035,'#14161f');
    }else if(P.panel==='top'){
      g.fillStyle='#c81e2e';g.beginPath();g.moveTo(1.5,-1);g.lineTo(1.16,-1);g.quadraticCurveTo(1.02,0,1.16,1);g.lineTo(1.5,1);g.closePath();g.fill();
      g.fillStyle='#fff';for(let i=0;i<9;i++){const y=-.9+i*.2;poly(g,[[1.13,y],[1.13,y+.2],[1.34,y+.1]]);g.fill()}
      for(const s of[-1,1]){eye(.8,s*.42,.11);for(let i=0;i<3;i++)line(g,[[.2-i*.16,s*.52],[.12-i*.16,s*.86]],.04,P.dk)}
      poly(g,[[-1.3,0],[-.3,.14],[.55,0],[-.3,-.14]]);g.fillStyle=P.dk;g.fill();
    }else if(P.panel==='side'){
      g.fillStyle='#f4f6ff';g.beginPath();g.moveTo(-1.5,-.42);g.lineTo(1.5,-.42);g.lineTo(1.5,-.08);for(let x=1.5;x>=-1.5;x-=.1)g.lineTo(x,-.12+Math.sin(x*4)*.025);g.closePath();g.fill();
      for(let i=0;i<3;i++)line(g,[[.3-i*.14,.14],[.2-i*.14,-.06]],.035,P.dk);
      g.fillStyle='#c81e2e';g.beginPath();g.moveTo(1.5,.1);g.quadraticCurveTo(1.1,.06,.95,.0);g.quadraticCurveTo(1.15,-.1,1.5,-.12);g.closePath();g.fill();
      g.fillStyle='#fff';for(let i=0;i<4;i++){const x=1.46-i*.12;poly(g,[[x,.09-i*.012],[x-.1,.08-i*.014],[x-.05,.01]]);g.fill()}
    }else{poly(g,[[0,.5],[-.3,-.1],[.3,-.1]]);g.fillStyle=P.dk;g.fill()}
  },
  // 6 Tiger Stripes
  (g,P)=>{
    const stripe=(x,y0,y1,w,lean)=>{g.beginPath();g.moveTo(x-w,y0);g.bezierCurveTo(x-w*.6+lean*.3,lerp(y0,y1,.4),x+lean*.8-w*.2,lerp(y0,y1,.75),x+lean,y1);g.bezierCurveTo(x+lean*.8+w*.3,lerp(y0,y1,.7),x+w*.7+lean*.3,lerp(y0,y1,.35),x+w,y0);g.closePath();g.fillStyle='#161219';g.fill()};
    if(P.panel==='side'){for(let i=0;i<9;i++){const x=-1.35+i*.33+(P.r()-.5)*.08;if(i%2)stripe(x,.92,-.08+P.r()*.1,.1+P.r()*.03,.14);else stripe(x,-.44,.12+P.r()*.1,.09+P.r()*.03,-.12)}}
    else if(P.panel==='top'){for(let i=0;i<9;i++){const x=-1.35+i*.33;for(const s of[-1,1])stripe(x+(s>0?.14:0),s*1.02,s*(.04+P.r()*.16),.1+P.r()*.03,.16*(i%2?1:-1))}}
    else{for(let i=0;i<5;i++)stripe(-.8+i*.4,i%2?.92:-.44,i%2?.2:.1,.07,.08)}
    over(g,P,'#ffb347',.12);
  },
  // 7 Dragon Scales
  (g,P)=>{
    const s=.2,dy=s*.52,rows=Math.ceil((P.v1-P.v0)/dy)+2;
    for(let j=-1;j<rows;j++)for(let i=-1;P.u0+i*s<P.u1+s;i++){
      const x=P.u0+(i+(j%2?.5:0))*s,y=P.v0+j*dy,k=P.r(),r=s*.56;
      const gr=g.createLinearGradient(0,y-r,0,y+r*.4);gr.addColorStop(0,k<.14?'#ffe9a0':P.lt);gr.addColorStop(.45,k<.14?'#e9b93a':P.base);gr.addColorStop(1,P.dk);
      g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=gr;g.fill();g.lineWidth=.016;g.strokeStyle=P.dkr;g.stroke();
      g.beginPath();g.arc(x,y,r*.72,Math.PI*1.15,Math.PI*1.85);g.lineWidth=.012;g.strokeStyle='rgba(255,255,255,.5)';g.stroke();
    }
  },
  // 8 Carbon Fiber
  (g,P)=>{
    const weave=(x0,y0,x1,y1)=>{
      g.save();g.beginPath();g.rect(x0,y0,x1-x0,y1-y0);g.clip();rect(g,x0,y0,x1-x0,y1-y0,'#181b22');
      const c=.05;for(let j=0;y0+j*c<y1;j++)for(let i=0;x0+i*c<x1;i++){const x=x0+i*c,y=y0+j*c,a=(i+j)%2;const gr=a?g.createLinearGradient(x,y,x+c,y):g.createLinearGradient(x,y,x,y+c);gr.addColorStop(0,'#2b303b');gr.addColorStop(.5,'#565d6d');gr.addColorStop(1,'#20242d');g.fillStyle=gr;g.fillRect(x+.004,y+.004,c-.008,c-.008)}
      g.restore();g.lineWidth=.018;g.strokeStyle=P.ac;g.strokeRect(x0,y0,x1-x0,y1-y0);
    };
    if(P.panel==='top')weave(-1.6,-.46,1.6,.46);
    else if(P.panel==='side')weave(-1.6,-.5,1.6,-.12);
    else weave(-.46,-.5,.46,1);
  },
  // 9 Pixel Camo
  (g,P)=>{
    const n=noise2(9),c=.085,cols=[P.dk,P.lt,P.dkr];
    for(let y=P.v0;y<P.v1;y+=c)for(let x=P.u0;x<P.u1;x+=c){
      const a=n(x*2.3+7,y*2.3+(P.panel==='top'?31:P.panel==='side'?3:57)),b=n(x*5.1+40,y*5.1+9);
      const k=a>.62?0:a<.36?2:b>.7?1:-1;if(k>=0){g.fillStyle=cols[k];g.fillRect(x,y,c+.003,c+.003)}
    }
  },
  // 10 Galaxy
  (g,P)=>{
    over(g,P,'#120a3a',.34);
    const cl=(x,y,r,c)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,c);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)};
    const w=P.u1-P.u0,h=P.v1-P.v0;
    for(let i=0;i<7;i++){const x=P.u0+P.r()*w,y=P.v0+P.r()*h;cl(x,y,.3+P.r()*.35,['rgba(255,70,220,.7)','rgba(110,70,255,.75)','rgba(60,210,255,.6)'][i%3])}
    g.save();g.translate((P.u0+P.u1)/2,(P.v0+P.v1)/2);g.rotate(-.35);g.scale(1,.28);cl(0,0,w*.42,'rgba(255,225,255,.55)');g.restore();
    for(let i=0;i<110*w*h/4;i++){const x=P.u0+P.r()*w,y=P.v0+P.r()*h,k=P.r();dot(g,x,y,.008+k*k*.018,k>.8?'#ffe9a8':'#fff')}
    for(let i=0;i<7;i++){const x=P.u0+P.r()*w,y=P.v0+P.r()*h;starPath(g,x,y,.09,4,.22,0);g.fillStyle='#fff';g.fill()}
  },
  // 11 Constellations
  (g,P)=>{
    over(g,P,'#0b1030',.3);
    const w=P.u1-P.u0,h=P.v1-P.v0,n=Math.max(1,Math.round(w*h/.8));
    for(let i=0;i<40*w*h/4;i++)dot(g,P.u0+P.r()*w,P.v0+P.r()*h,.006+P.r()*.006,'rgba(255,255,255,.7)');
    for(let c=0;c<n;c++){
      const cx=P.u0+(c+.5)/n*w,cy=P.v0+h*(.35+P.r()*.3),pts=[];let a=P.r()*TAU,x=cx-.25,y=cy;
      for(let i=0;i<5+Math.floor(P.r()*2);i++){pts.push([clamp(x,P.u0+.05,P.u1-.05),clamp(y,P.v0+.06,P.v1-.06)]);a+=(P.r()-.5)*2.2;x+=Math.cos(a)*.24+.07;y+=Math.sin(a)*.2}
      g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));if(P.r()>.5)g.lineTo(pts[1][0],pts[1][1]);g.lineWidth=.02;g.strokeStyle='rgba(205,232,255,.95)';g.stroke();
      pts.forEach((p,i)=>{if(i%3===0){starPath(g,p[0],p[1],.085,4,.3,0);g.fillStyle='#fff';g.fill()}else dot(g,p[0],p[1],.034,'#fff')});
    }
  },
  // 12 Circuit Board
  (g,P)=>{
    over(g,P,'#03241c',.3);
    const w=P.u1-P.u0,h=P.v1-P.v0,tr=P.lt,pad=P.ac;
    for(let i=0;i<16*w*h/4;i++){
      let x=P.u0+Math.round(P.r()*w/.1)*.1,y=P.v0+Math.round(P.r()*h/.1)*.1;const pts=[[x,y]];
      for(let s=0;s<3;s++){const d=(.2+Math.floor(P.r()*3)*.1)*(P.r()>.5?1:-1);if(s%2===0)x+=d;else{x+=.1*Math.sign(d);y+=.1*(P.r()>.5?1:-1)}pts.push([x,y]);if(s%2){x+=d;pts.push([x,y])}}
      line(g,pts,.026,tr);dot(g,pts[0][0],pts[0][1],.042,pad);dot(g,pts[0][0],pts[0][1],.017,'#03241c');
      const e=pts[pts.length-1];dot(g,e[0],e[1],.042,pad);dot(g,e[0],e[1],.017,'#03241c');
    }
    if(P.panel!=='rear'){const cx=P.panel==='top'?-.15:0,cy=P.panel==='side'?.1:P.panel==='top'?0:.2,cw=.42,chh=.26;
      for(let i=0;i<6;i++){const x=cx-cw/2+.04+i*(cw-.08)/5;line(g,[[x,cy-chh/2-.06],[x,cy+chh/2+.06]],.018,'#c8d2dc')}
      rect(g,cx-cw/2,cy-chh/2,cw,chh,'#12161f');g.lineWidth=.012;g.strokeStyle=pad;g.strokeRect(cx-cw/2+.03,cy-chh/2+.03,cw-.06,chh-.06);dot(g,cx-cw/2+.07,cy+chh/2-.07,.02,pad)}
  },
  // 13 Graffiti Drips
  (g,P)=>{
    const cols=['#ff3fa4','#38f2c8','#ffe45c','#8a5cff'];
    if(P.panel==='side'||P.panel==='front'||P.panel==='rear'){
      const top=P.panel==='side'?.9:.9,edge=P.panel==='side'?.16:.3;
      for(let L=0;L<3;L++){
        const c=cols[(L+(P.panel==='rear'?1:0))%4],base=edge+.12-L*.1;g.fillStyle=c;g.beginPath();g.moveTo(P.u0,top);g.lineTo(P.u0,base);
        for(let x=P.u0;x<P.u1;x+=.05)g.lineTo(x,base+Math.sin(x*5+L*2)*.03+Math.sin(x*13+L)*.012);
        g.lineTo(P.u1,top);g.closePath();g.fill();
        for(let x=P.u0+.08+L*.07;x<P.u1;x+=.16+P.r()*.25){const len=.06+P.r()*P.r()*.42,wd=.022+P.r()*.02,y0=base+Math.sin(x*5+L*2)*.03;
          g.beginPath();g.moveTo(x-wd*1.6,y0+.02);g.quadraticCurveTo(x-wd,y0-.02,x-wd,y0-len);g.arc(x,y0-len,wd,Math.PI,TAU);g.quadraticCurveTo(x+wd,y0-.02,x+wd*1.6,y0+.02);g.closePath();g.fill();dot(g,x-wd*.3,y0-len+wd*.2,wd*.3,'rgba(255,255,255,.55)')}
      }
    }else{
      for(let i=0;i<9;i++){const x=-1.3+P.r()*2.6,y=-.8+P.r()*1.6,r=.1+P.r()*.16,c=cols[i%4];g.fillStyle=c;blob(g,x,y,r,.3,P.r,11);g.fill();
        for(let k=0;k<7;k++){const a=P.r()*TAU,d=r*(1.2+P.r()*.9);dot(g,x+Math.cos(a)*d,y+Math.sin(a)*d,.012+P.r()*.024,c)}}
    }
  },
  // 14 Honeycomb
  (g,P)=>{
    const s=.12,hx=s*Math.sqrt(3);
    for(let j=-1;P.v0+j*s*1.5<P.v1+s;j++)for(let i=-1;P.u0+i*hx<P.u1+hx;i++){
      const x=P.u0+(i+(j%2?.5:0))*hx,y=P.v0+j*s*1.5,k=P.r();
      g.beginPath();for(let a=0;a<6;a++){const t=a*Math.PI/3+Math.PI/6;g[a?'lineTo':'moveTo'](x+Math.cos(t)*s,y+Math.sin(t)*s)}g.closePath();
      if(k<.16){const gr=g.createLinearGradient(0,y-s,0,y+s);gr.addColorStop(0,'#c77d10');gr.addColorStop(1,'#ffcf4a');g.fillStyle=gr;g.fill();dot(g,x-s*.3,y+s*.35,s*.13,'rgba(255,255,255,.6)')}
      else if(k<.3){g.fillStyle=P.dk;g.globalAlpha=.55;g.fill();g.globalAlpha=1}
      g.lineWidth=.022;g.strokeStyle='#5a3d08';g.stroke();g.lineWidth=.007;g.strokeStyle='#ffd86b';g.stroke();
    }
  },
  // 15 Lava Cracks
  (g,P)=>{
    over(g,P,'#190c0a',.58);
    const w=P.u1-P.u0,h=P.v1-P.v0,cr=[];
    const grow=(x,y,a,len,d)=>{const pts=[[x,y]];for(let i=0;i<len;i++){a+=(P.r()-.5)*1.1;x+=Math.cos(a)*.085;y+=Math.sin(a)*.085;pts.push([x,y]);if(d<2&&P.r()<.3)grow(x,y,a+(P.r()>.5?1:-1)*(.6+P.r()*.6),Math.round(len*.55),d+1)}cr.push([pts,d])};
    for(let i=0;i<Math.max(2,5*w*h/4);i++)grow(P.u0+P.r()*w,P.v0+P.r()*h,P.r()*TAU,7+Math.floor(P.r()*6),0);
    for(const [pts,d] of cr)line(g,pts,.13-d*.03,'rgba(255,60,0,.4)');
    for(const [pts,d] of cr)line(g,pts,.06-d*.014,'#ff6a10');
    for(const [pts,d] of cr)line(g,pts,.024-d*.006,'#fff0a0');
  },
  // 16 Frost
  (g,P)=>{
    const fern=(x,y,a,len,d)=>{const ex=x+Math.cos(a)*len,ey=y+Math.sin(a)*len;line(g,[[x,y],[ex,ey]],.006+len*.035,d?'rgba(236,248,255,.9)':'#ffffff');
      if(d<3&&len>.035)for(let i=1;i<=4;i++){const t=i/5,bx=lerp(x,ex,t),by=lerp(y,ey,t);for(const s of[-1,1])fern(bx,by,a+s*1.02,len*(.5-t*.26),d+1)}};
    const edge=(x0,y0,x1,y1,dir,n,reach)=>{
      const gr=g.createLinearGradient(x0,y0,x0+Math.cos(dir)*reach,y0+Math.sin(dir)*reach);gr.addColorStop(0,'rgba(225,244,255,.85)');gr.addColorStop(1,'rgba(225,244,255,0)');g.fillStyle=gr;g.fillRect(P.u0,P.v0,P.u1-P.u0,P.v1-P.v0);
      for(let i=0;i<n;i++){const t=(i+.5)/n+(P.r()-.5)*.5/n;fern(lerp(x0,x1,t),lerp(y0,y1,t),dir+(P.r()-.5)*.7,reach*(.5+P.r()*.6),0)}
    };
    if(P.panel==='side'){edge(-1.5,-.42,1.5,-.42,Math.PI/2,13,.42);edge(-1.5,-.42,-1.5,.9,0,4,.5)}
    else if(P.panel==='top'){edge(-1.5,-1,-1.5,1,0,8,.62);edge(1.5,-1,1.5,1,Math.PI,8,.5);for(const s of[-1,1])edge(-1.5,s,1.5,s,-s*Math.PI/2,10,.3)}
    else edge(-1,-.42,1,-.42,Math.PI/2,9,.6);
    for(let i=0;i<26;i++)dot(g,P.u0+P.r()*(P.u1-P.u0),P.v0+P.r()*(P.v1-P.v0),.008,'rgba(255,255,255,.8)');
  },
  // 17 Comic Book Dots
  (g,P)=>{
    const c=.085;
    for(let j=0;P.v0+j*c<P.v1;j++)for(let i=0;P.u0+i*c<P.u1;i++){
      const x=P.u0+(i+(j%2?.5:0))*c,y=P.v0+j*c,k=P.panel==='side'||P.panel==='top'?clamp((.9-x)/2.2,0,1):clamp((y-P.v0)/1.3,0,1);
      if(k>.04)dot(g,x,y,c*.5*Math.pow(k,.8)*.92,P.lt);
    }
    const burst=(x,y,r)=>{starPath(g,x+.02,y-.02,r,11,.62,.2);g.fillStyle='#14161f';g.fill();starPath(g,x,y,r,11,.62,.2);g.fillStyle='#ffd23f';g.fill();g.lineWidth=.022;g.strokeStyle='#14161f';g.lineJoin='miter';g.stroke();starPath(g,x,y,r*.5,11,.62,.2);g.fillStyle='#ff4d6d';g.fill();g.lineWidth=.014;g.stroke()};
    if(P.panel==='side'){burst(.3,.08,.3);for(let i=0;i<3;i++)line(g,[[-.5-i*.25,.26-i*.02],[-.95-i*.28,.26-i*.02]],.035-i*.006,'#14161f');line(g,[[-1.5,-.2],[1.5,-.2]],.035,'#14161f')}
    else if(P.panel==='top'){burst(.75,0,.36);for(const s of[-1,1])line(g,[[-1.5,s*.66],[1.5,s*.66]],.035,'#14161f')}
    else if(P.panel==='rear')burst(0,.2,.3);
  },
  // 18 Topographic Lines
  (g,P)=>{
    const n=noise2(18),w=P.u1-P.u0,h=P.v1-P.v0,st=.02,off=P.panel==='side'?0:P.panel==='top'?9:21;
    const f=(x,y)=>n(x*1.5+off,y*1.9+off)+.35*n(x*3.7+off*2,y*3.7+3);
    // marching squares over the noise: each level is one contour line
    for(let L=0;L<9;L++){
      const lv=.28+L*.105;g.beginPath();
      for(let y=P.v0;y<P.v1;y+=st)for(let x=P.u0;x<P.u1;x+=st){
        const a=f(x,y)-lv,b=f(x+st,y)-lv,c=f(x+st,y+st)-lv,d=f(x,y+st)-lv,pts=[];
        if(a*b<0)pts.push([x+st*a/(a-b),y]);if(b*c<0)pts.push([x+st,y+st*b/(b-c)]);if(c*d<0)pts.push([x+st*d/(d-c),y+st]);if(d*a<0)pts.push([x,y+st*a/(a-d)]);
        if(pts.length>=2){g.moveTo(pts[0][0],pts[0][1]);g.lineTo(pts[1][0],pts[1][1])}if(pts.length===4){g.moveTo(pts[2][0],pts[2][1]);g.lineTo(pts[3][0],pts[3][1])}
      }
      g.lineWidth=L%3===0?.02:.01;g.strokeStyle=L%3===0?'rgba(255,255,255,.9)':'rgba(255,255,255,.6)';g.lineCap='round';g.stroke();
    }
    void w;void h;
  },
  // 19 Stained Glass
  (g,P)=>{
    const c=.3,cols=['#e5383b','#2d7ff9','#ffc93c','#2fbf71','#9b5de5','#ff8a3d'],nx=Math.ceil((P.u1-P.u0)/c),ny=Math.ceil((P.v1-P.v0)/c),pt=[];
    for(let j=0;j<=ny;j++){pt.push([]);for(let i=0;i<=nx;i++)pt[j].push([P.u0+i*c+(i&&i<nx?(P.r()-.5)*c*.6:0),P.v0+j*c+(j&&j<ny?(P.r()-.5)*c*.6:0)])}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const q=[pt[j][i],pt[j][i+1],pt[j+1][i+1],pt[j+1][i]],tris=P.r()>.5?[[q[0],q[1],q[2]],[q[0],q[2],q[3]]]:[[q[0],q[1],q[3]],[q[1],q[2],q[3]]];
      for(const t of tris){const k=P.r();poly(g,t);if(k<.3){g.fillStyle=cols[Math.floor(P.r()*cols.length)];g.globalAlpha=.8;g.fill();g.globalAlpha=1}
        else if(k<.66){g.fillStyle=k<.48?P.lt:P.dk;g.globalAlpha=.55;g.fill();g.globalAlpha=1}
        g.lineWidth=.03;g.strokeStyle='#15131c';g.lineJoin='round';g.stroke()}
    }
  },
  // 20 Wireframe
  (g,P)=>{
    over(g,P,'#050a1a',.4);
    const c=.2,col=P.lt;g.beginPath();
    for(let x=Math.ceil(P.u0/c)*c;x<P.u1;x+=c){g.moveTo(x,P.v0);g.lineTo(x,P.v1)}
    for(let y=Math.ceil(P.v0/c)*c;y<P.v1;y+=c){g.moveTo(P.u0,y);g.lineTo(P.u1,y)}
    for(let x=Math.floor(P.u0/c)*c-2;x<P.u1;x+=c){g.moveTo(x,P.v0);g.lineTo(x+(P.v1-P.v0),P.v1)}
    g.lineWidth=.03;g.strokeStyle='rgba(255,255,255,.14)';g.stroke();g.lineWidth=.012;g.strokeStyle=col;g.stroke();
    for(let x=Math.ceil(P.u0/c)*c;x<P.u1;x+=c)for(let y=Math.ceil(P.v0/c)*c;y<P.v1;y+=c)dot(g,x,y,.017,'#fff');
  },
  // 21 Skeleton Ribs
  (g,P)=>{
    const bone='#f1efe6',ink='#14161f';
    const rib=(pts,w)=>{line(g,pts,w+.03,ink);line(g,pts,w,bone)};
    if(P.panel==='top'){
      for(let i=0;i<8;i++){const x=-1.05+i*.27,k=1-Math.abs(i-3.5)/7;for(const s of[-1,1]){const pts=[];for(let t=0;t<=1;t+=.1)pts.push([x+.1*Math.sin(t*2.2)-t*.05,s*(.08+t*(.55+k*.4))]);rib(pts,.05)}}
      for(let i=0;i<11;i++){const x=-1.25+i*.24;g.beginPath();g.ellipse(x,0,.085,.1,0,0,TAU);g.fillStyle=ink;g.fill();g.beginPath();g.ellipse(x,0,.062,.078,0,0,TAU);g.fillStyle=bone;g.fill()}
    }else if(P.panel==='side'){
      for(let i=0;i<8;i++){const x=-1.05+i*.27,pts=[];for(let t=0;t<=1;t+=.1)pts.push([x-t*.05+.12*Math.sin(t*2.6),.92-t*(.75+.2*Math.sin(i*.9))]);rib(pts,.05);dot(g,pts[pts.length-1][0],pts[pts.length-1][1],.045,ink);dot(g,pts[pts.length-1][0],pts[pts.length-1][1],.03,bone)}
    }else{
      const y=P.panel==='front'?.2:.24;g.beginPath();g.ellipse(0,y,.3,.26,0,0,TAU);g.fillStyle=ink;g.fill();g.beginPath();g.ellipse(0,y,.27,.23,0,0,TAU);g.fillStyle=bone;g.fill();
      rect(g,-.15,y-.36,.3,.2,ink);rect(g,-.125,y-.34,.25,.16,bone);for(let i=-1;i<=1;i++)line(g,[[i*.07,y-.34],[i*.07,y-.2]],.014,ink);
      for(const s of[-1,1]){g.beginPath();g.ellipse(s*.11,y+.03,.075,.085,s*.2,0,TAU);g.fillStyle=ink;g.fill()}poly(g,[[0,y-.06],[-.035,y-.14],[.035,y-.14]]);g.fillStyle=ink;g.fill();
    }
  },
  // 22 Duct Tape Patches
  (g,P)=>{
    const strip=(x,y,l,w,rot)=>{g.save();g.translate(x,y);g.rotate(rot);g.beginPath();g.moveTo(-l/2,-w/2);
      for(let t=-w/2;t<w/2;t+=w/5)g.lineTo(-l/2-(Math.round((t+w/2)/(w/5))%2?.012:0),t);g.lineTo(-l/2,w/2);g.lineTo(l/2,w/2);for(let t=w/2;t>-w/2;t-=w/5)g.lineTo(l/2+(Math.round((t+w/2)/(w/5))%2?.012:0),t);g.closePath();
      const gr=g.createLinearGradient(0,-w/2,0,w/2);gr.addColorStop(0,'#c9d0da');gr.addColorStop(.45,'#9aa3b0');gr.addColorStop(1,'#757e8c');g.fillStyle=gr;g.fill();g.lineWidth=.008;g.strokeStyle='rgba(0,0,0,.35)';g.stroke();
      for(let i=1;i<4;i++)line(g,[[-l/2+.02,-w/2+i*w/4],[l/2-.02,-w/2+i*w/4]],.004,'rgba(255,255,255,.35)');g.restore()};
    const w=P.u1-P.u0,h=P.v1-P.v0,n=Math.round(7*w*h/4);
    for(let i=0;i<n;i++){const x=P.u0+.2+P.r()*(w-.4),y=P.v0+.15+P.r()*(h-.3),r=(P.r()-.5)*1.6,l=.3+P.r()*.35;
      if(i%3===0){strip(x,y,l,.11,r);strip(x,y,l,.11,r+1.4)}else strip(x,y,l,.11+P.r()*.04,r)}
  },
  // 23 Rust Bucket
  (g,P)=>{
    const rust=(x,y,r)=>{g.fillStyle='#5a2a10';blob(g,x,y,r*1.12,.32,P.r,11);g.fill();g.fillStyle='#9a4a1c';blob(g,x,y,r*.9,.3,P.r,11);g.fill();g.fillStyle='#c46a2a';blob(g,x+r*.1,y+r*.1,r*.5,.35,P.r,9);g.fill();
      for(let i=0;i<8;i++){const a=P.r()*TAU,d=r*(1+P.r()*.7);dot(g,x+Math.cos(a)*d,y+Math.sin(a)*d,.008+P.r()*.016,'#7a3a16')}};
    const streak=(x,y,l)=>{const gr=g.createLinearGradient(0,y,0,y-l);gr.addColorStop(0,'rgba(122,58,22,.75)');gr.addColorStop(1,'rgba(122,58,22,0)');g.fillStyle=gr;g.fillRect(x-.018,y-l,.036,l)};
    if(P.panel==='side'){
      for(const x of[-.8,.8]){for(let a=0;a<=Math.PI;a+=.32)rust(x+Math.cos(a)*.44,-.12+Math.sin(a)*.3,.06+P.r()*.06)}
      for(let i=0;i<9;i++){const x=-1.4+P.r()*2.8,y=-.36+P.r()*.2;rust(x,y,.05+P.r()*.09)}
      for(let i=0;i<5;i++){const x=-1.3+P.r()*2.6,y=.15+P.r()*.3;rust(x,y,.04+P.r()*.05);streak(x,y-.03,.16+P.r()*.2)}
    }else if(P.panel==='top'){
      for(let i=0;i<14;i++){const e=P.r()>.5,x=e?(P.r()>.5?1:-1)*(1.15+P.r()*.25):-1.3+P.r()*2.6,y=e?-.7+P.r()*1.4:(P.r()>.5?1:-1)*(.62+P.r()*.2);rust(x,y,.06+P.r()*.1)}
      for(let i=0;i<3;i++)rust(-.9+P.r()*1.8,-.3+P.r()*.6,.04+P.r()*.05);
    }else{for(let i=0;i<7;i++){const x=-.85+P.r()*1.7,y=-.36+P.r()*.5;rust(x,y,.05+P.r()*.09)}for(let i=0;i<3;i++){const x=-.7+P.r()*1.4;rust(x,.35,.04);streak(x,.32,.25)}}
  },
  // 24 Wood Paneling
  (g,P)=>{
    const plank=(x0,y0,x1,y1,k)=>{const gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,k?'#a8743c':'#b98548');gr.addColorStop(1,k?'#8f5f2e':'#a06c34');g.fillStyle=gr;g.fillRect(x0,y0,x1-x0,y1-y0);
      for(let i=0;i<5;i++){const y=y0+(y1-y0)*(.15+.7*P.r()),pts=[];for(let x=x0;x<=x1;x+=.08)pts.push([x,y+Math.sin(x*6+i*3)*.008]);line(g,pts,.006,'rgba(70,40,14,.5)')}
      if(P.r()>.5){const x=x0+(x1-x0)*(.2+P.r()*.6),y=(y0+y1)/2;g.beginPath();g.ellipse(x,y,.05,.022,0,0,TAU);g.fillStyle='#6a431c';g.fill();g.beginPath();g.ellipse(x,y,.085,.04,0,0,TAU);g.lineWidth=.006;g.strokeStyle='rgba(70,40,14,.6)';g.stroke()}
      g.lineWidth=.012;g.strokeStyle='#5a3814';g.strokeRect(x0,y0,x1-x0,y1-y0)};
    const frame=(x0,y0,x1,y1)=>{g.lineWidth=.05;g.strokeStyle='#e0b878';g.strokeRect(x0,y0,x1-x0,y1-y0);g.lineWidth=.012;g.strokeStyle='#7a5226';g.strokeRect(x0-.025,y0-.025,x1-x0+.05,y1-y0+.05);g.strokeRect(x0+.025,y0+.025,x1-x0-.05,y1-y0-.05)};
    if(P.panel==='side'){const x0=-1.18,x1=1.12,y0=-.2,y1=.16,n=4;for(let i=0;i<n;i++)plank(x0,y0+(y1-y0)*i/n,x1,y0+(y1-y0)*(i+1)/n,i%2);frame(x0,y0,x1,y1);for(const x of[-.42,.3])line(g,[[x,y0],[x,y1]],.035,'#e0b878')}
    else if(P.panel==='rear'){const n=4;for(let i=0;i<n;i++)plank(-.62,-.12+.36*i/n,.62,-.12+.36*(i+1)/n,i%2);frame(-.62,-.12,.62,.24)}
    else if(P.panel==='top'){for(const s of[-1,1]){for(let i=0;i<2;i++)plank(-1.15,s*.86-(s>0?.2:0)+i*.1,1.1,s*.86-(s>0?.2:0)+(i+1)*.1,i);frame(-1.15,s>0?.66:-.86,1.1,s>0?.86:-.66)}}
  },
  // 25 Cow Print
  (g,P)=>{
    const w=P.u1-P.u0,h=P.v1-P.v0,n=Math.round(9*w*h/4);
    for(let i=0;i<n;i++){const x=P.u0+((i%5)+.5)/5*w+(P.r()-.5)*.3,y=P.v0+P.r()*h,r=.12+P.r()*.17;g.fillStyle=i%4===3?'#f6f3ea':'#17151b';g.save();g.translate(x,y);g.rotate(P.r()*3);g.scale(1.25,.85);blob(g,0,0,r,.42,P.r,10);g.fill();g.restore()}
    for(let i=0;i<n;i++)dot(g,P.u0+P.r()*w,P.v0+P.r()*h,.02+P.r()*.025,'#17151b');
  },
  // 26 Donut Sprinkles
  (g,P)=>{
    const ice='#ff8fc7',hi='#ffc2e2',sp=['#ffffff','#ffe45c','#5cc8ff','#7be07b','#ff5c5c','#b46cff'];
    const sprinkle=(x,y)=>{const a=P.r()*TAU,l=.035;line(g,[[x-Math.cos(a)*l,y-Math.sin(a)*l],[x+Math.cos(a)*l,y+Math.sin(a)*l]],.022,sp[Math.floor(P.r()*sp.length)])};
    if(P.panel==='top'){
      g.fillStyle=ice;g.beginPath();const pts=[];for(let a=0;a<TAU;a+=.16)pts.push([-.1+Math.cos(a)*(1.02+.07*Math.sin(a*9)),Math.sin(a)*(.74+.07*Math.sin(a*11+1))]);pts.forEach((p,i)=>g[i?'lineTo':'moveTo'](p[0],p[1]));g.closePath();g.fill();
      g.lineWidth=.03;g.strokeStyle=hi;g.stroke();
      for(let i=0;i<70;i++){const a=P.r()*TAU,d=Math.sqrt(P.r());sprinkle(-.1+Math.cos(a)*d*.92,Math.sin(a)*d*.64)}
    }else{
      const y0=P.panel==='side'?.3:.42,x0=P.panel==='side'?-1.15:-1,x1=P.panel==='side'?.95:1;
      g.fillStyle=ice;g.beginPath();g.moveTo(x0,.95);g.lineTo(x0,y0);
      for(let x=x0;x<x1;x+=.05)g.lineTo(x,y0+Math.sin(x*7)*.03);g.lineTo(x1,.95);g.closePath();g.fill();
      for(let x=x0+.1;x<x1-.05;x+=.2+P.r()*.2){const len=.08+P.r()*.26,wd=.045;g.beginPath();g.moveTo(x-wd*1.5,y0+.03);g.quadraticCurveTo(x-wd,y0,x-wd,y0-len);g.arc(x,y0-len,wd,Math.PI,TAU);g.quadraticCurveTo(x+wd,y0,x+wd*1.5,y0+.03);g.closePath();g.fill();dot(g,x-wd*.35,y0-len+.01,wd*.3,hi)}
      for(let i=0;i<26;i++)sprinkle(x0+P.r()*(x1-x0),y0+.04+P.r()*.5);
    }
  },
  // 27 Bubble Wrap
  (g,P)=>{
    const c=.15;
    for(let j=0;P.v0+j*c*.87<P.v1+c;j++)for(let i=0;P.u0+i*c<P.u1+c;i++){
      const x=P.u0+(i+(j%2?.5:0))*c,y=P.v0+j*c*.87,pop=P.r()<.13,r=c*.42;
      if(pop){g.beginPath();g.arc(x,y,r,0,TAU);g.lineWidth=.01;g.strokeStyle='rgba(255,255,255,.4)';g.stroke();line(g,[[x-r*.5,y-r*.2],[x+r*.4,y+r*.3]],.008,'rgba(255,255,255,.45)');line(g,[[x-r*.2,y+r*.5],[x+r*.1,y-r*.4]],.008,'rgba(255,255,255,.35)');continue}
      const gr=g.createRadialGradient(x-r*.3,y+r*.3,r*.05,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.7)');gr.addColorStop(.4,'rgba(255,255,255,.08)');gr.addColorStop(1,'rgba(255,255,255,.3)');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
      g.lineWidth=.008;g.strokeStyle='rgba(255,255,255,.7)';g.stroke();
    }
  },
  // 28 Taxi (own design: a checker band, a blank roof light and blank door discs; no words, no real firm's markings)
  (g,P)=>{
    const chk=(x0,x1,y,s)=>{for(let i=0;x0+i*s<x1;i++)for(let j=0;j<2;j++){g.fillStyle=(i+j)%2?'#14161f':'#ffd21f';g.fillRect(x0+i*s,y+j*s,s+.003,s+.003)}g.lineWidth=.012;g.strokeStyle='#14161f';g.strokeRect(x0,y,x1-x0,s*2)};
    if(P.panel==='side'){chk(-1.5,1.5,-.08,.085);dot(g,-.05,.26,.13,'#ffd21f');g.beginPath();g.arc(-.05,.26,.13,0,TAU);g.lineWidth=.02;g.strokeStyle='#14161f';g.stroke();for(let i=0;i<3;i++)rect(g,-.13+i*.065,.235,.04,.05,'#14161f');rect(g,-1.5,-.42,3,.1,'#14161f')}
    else if(P.panel==='top'){rect(g,-.38,-.3,.24,.6,'#14161f');rect(g,-.355,-.275,.19,.55,'#ffd21f');for(let i=0;i<4;i++)rect(g,-.33,-.2+i*.115,.14,.06,'#14161f');for(const s of[-1,1])chk(-1.5,1.5,s*.78-.085,.085)}
    else chk(-1,1,-.08,.085);
  },
  // 29 Police Cruiser (own design: light door panels, dark ends, a made-up star badge and a blank light bar; no words)
  (g,P)=>{
    const badge=(x,y,r)=>{starPath(g,x,y,r,7,.56,-Math.PI/2);g.fillStyle='#e9b93a';g.fill();g.lineWidth=.014;g.strokeStyle='#6b4d0c';g.lineJoin='round';g.stroke();dot(g,x,y,r*.4,'#fff5cf');dot(g,x,y,r*.2,'#e9b93a')};
    if(P.panel==='side'){
      poly(g,[[-.62,-.3],[.58,-.3],[.5,.2],[-.56,.2]]);g.fillStyle='#f4f6ff';g.fill();
      g.fillStyle=P.dkr;g.globalAlpha=.92;g.fillRect(-1.5,-.42,.8,1.32);g.fillRect(.72,-.42,.8,1.32);g.globalAlpha=1;
      rect(g,-1.5,-.09,3,.05,'#e9b93a');rect(g,-1.5,-.125,3,.014,'#14161f');rect(g,-1.5,-.03,3,.014,'#14161f');badge(-.02,.07,.11);
    }else if(P.panel==='top'){
      g.fillStyle=P.dkr;g.globalAlpha=.92;g.fillRect(.62,-1,.9,2);g.fillRect(-1.5,-1,.72,2);g.globalAlpha=1;
      rect(g,-.2,-.5,.17,1,'#1b1f2b');for(let i=0;i<4;i++)rect(g,-.18,-.47+i*.245,.13,.2,i%2?'#f4f6ff':P.ac);rect(g,-.18,-.035,.13,.07,'#1b1f2b');badge(1,0,.17);
    }else if(P.panel==='front'){over(g,P,P.dkr,.92);for(let i=-2;i<=2;i++)line(g,[[i*.2,-.3],[i*.2,.02]],.03,'#aeb6c2');line(g,[[-.5,-.3],[.5,-.3]],.03,'#aeb6c2');line(g,[[-.5,.02],[.5,.02]],.03,'#aeb6c2')}
    else{over(g,P,P.dkr,.92);rect(g,-1,-.02,2,.05,'#e9b93a');badge(0,.2,.1)}
  },
  // 30 Ice Cream Truck (own design: a striped awning, a serving hatch and a cone; no words)
  (g,P)=>{
    const cone=(x,y,s)=>{poly(g,[[x-s*.5,y],[x+s*.5,y],[x,y-s*1.5]]);g.fillStyle='#d99a4a';g.fill();g.save();g.clip();for(let i=-4;i<5;i++){line(g,[[x+i*s*.25-s,y],[x+i*s*.25+s*.5,y-s*1.5]],s*.035,'#a86a24');line(g,[[x+i*s*.25+s,y],[x+i*s*.25-s*.5,y-s*1.5]],s*.035,'#a86a24')}g.restore();
      dot(g,x-s*.26,y+s*.2,s*.36,'#ff9ac8');dot(g,x+s*.26,y+s*.2,s*.36,'#fff3d6');dot(g,x,y+s*.55,s*.38,'#8fd6a8');dot(g,x,y+s*.98,s*.12,'#e5383b');dot(g,x-s*.1,y+s*.66,s*.08,'rgba(255,255,255,.7)')};
    const awn=(x0,x1,y,h,s)=>{for(let i=0;x0+i*s<x1;i++){g.fillStyle=i%2?'#fff7ea':'#ff8fc0';g.fillRect(x0+i*s,y,s+.004,h);g.beginPath();g.arc(x0+i*s+s/2,y,s/2,Math.PI,TAU);g.fill()}line(g,[[x0,y+h],[x1,y+h]],.02,'#d6588f')};
    if(P.panel==='side'){
      rect(g,-1.5,.2,3,.72,'#fff3d6');awn(-1.2,1.0,.13,.13,.14);
      rect(g,-.75,-.14,.82,.24,'#1b2233');g.lineWidth=.03;g.strokeStyle='#fff7ea';g.strokeRect(-.75,-.14,.82,.24);rect(g,-.8,-.19,.92,.05,'#ff8fc0');
      cone(.55,.0,.15);for(let i=0;i<14;i++)dot(g,-1.4+P.r()*2.8,-.38+P.r()*.2,.016,['#ff8fc0','#fff7ea','#8fd6a8'][i%3]);
    }else if(P.panel==='top'){rect(g,-.95,-1,1.5,2,'#fff3d6');for(const s of[-1,1])awn(-.95,.55,s>0?.6:-.76,.16,.14);cone(-.2,-.2,.26)}
    else{rect(g,-1,.2,2,.72,'#fff3d6');awn(-1,1,.13,.13,.14);if(P.panel==='rear')cone(0,.02,.14)}
  },
  // 31 Autumn Leaves
  (g,P)=>{
    const cols=['#e07a2e','#c2401c','#ffc23c','#8a4a1e','#f2a03c'],w=P.u1-P.u0,h=P.v1-P.v0,n=Math.round(26*w*h/4);
    for(let i=0;i<n;i++){
      const t=(i+.5)/n,x=P.u0+t*w+(P.r()-.5)*.2,y=P.panel==='side'?-.22+.3*t+Math.sin(t*9)*.1+(P.r()-.5)*.3:P.v0+P.r()*h,s=.1+P.r()*.09,c=cols[Math.floor(P.r()*cols.length)];
      leaf(g,x,y,s,P.r()*TAU,c,'rgba(70,30,8,.7)');
    }
    for(let i=0;i<n;i++)dot(g,P.u0+P.r()*w,P.v0+P.r()*h,.012,cols[i%5]);
  },
  // ---- second wave (Nov 2026): sports, suits, robots and pirates ----
  // 32 Team Hoops: wide bands round the car in your accent colour, edged in white
  (g,P)=>{
    const hoop=(x,y0,h)=>{rect(g,x-.03,y0,.36,h,'#f4f6ff');rect(g,x,y0,.3,h,P.ac)};
    if(P.panel==='side')for(const x of[-1.15,-.5,.15,.8])hoop(x,-.42,1.32);
    else if(P.panel==='top')for(const x of[-1.15,-.5,.15,.8])hoop(x,-1,2);
    else{rect(g,-1,.02,2,.26,'#f4f6ff');rect(g,-1,.05,2,.2,P.ac)}
  },
  // 33 Varsity: a chunky edged stripe and a big star, like a letter jacket
  (g,P)=>{
    const st=(x,y,r)=>{starPath(g,x,y,r,5,.45,-Math.PI/2);g.fillStyle='#f4f6ff';g.fill();starPath(g,x,y,r*.7,5,.45,-Math.PI/2);g.fillStyle=P.ac;g.fill()};
    if(P.panel==='side'){rect(g,-1.5,-.24,3,.2,'#f4f6ff');rect(g,-1.5,-.21,3,.14,P.ac);st(.25,.32,.3)}
    else if(P.panel==='top'){for(const y of[-.55,.55]){rect(g,-1.5,y-.14,3,.28,'#f4f6ff');rect(g,-1.5,y-.1,3,.2,P.ac)}st(.2,0,.36)}
    else st(0,.25,.28);
  },
  // 34 Pinstripe Suit: chalk pinstripes along the paint and a pocket square in your accent colour
  (g,P)=>{
    g.globalAlpha=.75;
    if(P.panel==='side'){for(let y=-.38;y<.9;y+=.075)rect(g,-1.5,y,3,.012,P.lt);g.globalAlpha=1;poly(g,[[.1,.42],[.36,.42],[.23,.24]]);g.fillStyle=P.ac;g.fill()}
    else if(P.panel==='top'){for(let y=-.95;y<1;y+=.12)rect(g,-1.5,y,3,.018,P.lt);g.globalAlpha=1}
    else{for(let x=-.95;x<1;x+=.1)rect(g,x,-.42,.012,1.32,P.lt);g.globalAlpha=1}
  },
  // 35 Tuxedo: black lapels, a white shirt front and a bow tie in your accent colour
  (g,P)=>{
    const K='#15161c',W='#f6f6f6';
    if(P.panel==='top'){poly(g,[[-.2,0],[1.5,-.85],[1.5,.85]]);g.fillStyle=K;g.fill();poly(g,[[.2,0],[1.5,-.45],[1.5,.45]]);g.fillStyle=W;g.fill();
      for(const s of[-1,1]){poly(g,[[.45,0],[.75,s*.22],[.75,0]]);g.fillStyle=P.ac;g.fill()}dot(g,.47,0,.06,P.ac);for(const x of[.95,1.2])dot(g,x,0,.035,K)}
    else if(P.panel==='front'){rect(g,-1,-.42,2,1.32,K);poly(g,[[-.4,.9],[.4,.9],[0,-.3]]);g.fillStyle=W;g.fill();for(const s of[-1,1]){poly(g,[[0,.55],[s*.28,.68],[s*.28,.42]]);g.fillStyle=P.ac;g.fill()}}
    else if(P.panel==='side'){rect(g,-1.5,-.42,3,.3,K);rect(g,-1.5,-.13,3,.02,W)}
    else rect(g,-1,-.42,2,.5,K);
  },
  // 36 Gold Circuit: gold traces, pads and little chips
  (g,P)=>{
    const au='#e0b54a',w=P.panel==='side'||P.panel==='top'?3:2,x0=w===3?-1.5:-1,y0=P.panel==='top'?-1:-.42,h=P.panel==='top'?2:1.32;
    for(let i=0;i<16;i++){let x=x0+P.r()*w,y=y0+P.r()*h;const pts=[[x,y]];for(let k=0;k<3;k++){if(k%2)y=clamp(y+(P.r()-.5)*.8,y0,y0+h);else x=clamp(x+(P.r()-.5)*1.2,x0,x0+w);pts.push([x,y])}line(g,pts,.025,au);dot(g,pts[0][0],pts[0][1],.04,au);dot(g,x,y,.04,au)}
    for(let i=0;i<3;i++){const x=x0+.2+P.r()*(w-.6),y=y0+.15+P.r()*(h-.5);rect(g,x,y,.32,.2,'#15171b');for(let q=.03;q<.32;q+=.07){rect(g,x+q,y-.04,.03,.04,'#c9ced8');rect(g,x+q,y+.2,.03,.04,'#c9ced8')}}
  },
  // 37 Robot Plating: panel seams, rivets and a glowing visor line
  (g,P)=>{
    const sx=P.panel==='side'||P.panel==='top',x0=sx?-1.5:-1,w=sx?3:2,y0=P.panel==='top'?-1:-.42,h=P.panel==='top'?2:1.32;
    for(let x=x0+.5;x<x0+w;x+=.6){rect(g,x,y0,.018,h,P.dkr);for(let y=y0+.08;y<y0+h;y+=.18)dot(g,x+.06,y,.022,P.lt)}
    if(P.panel==='side'){rect(g,-1.5,.1,3,.09,'#15171b');rect(g,-1.5,.125,3,.04,'#3fd2ff')}else if(P.panel==='top'){rect(g,-1.5,-.08,3,.16,'#15171b');rect(g,-1.5,-.035,3,.07,'#3fd2ff')}else{rect(g,-.7,.25,1.4,.14,'#15171b');rect(g,-.65,.29,1.3,.06,'#3fd2ff')}
  },
  // 38 Jolly Oars: two crossed oars and gold rope trim, a pirate flag with no skull
  (g,P)=>{
    const oar=(x,y,s,a)=>{g.save();g.translate(x,y);g.rotate(a);rect(g,-s,-.025,s*1.5,.05,'#e9dcc0');g.beginPath();g.ellipse(s*.7,0,s*.32,s*.13,0,0,TAU);g.fillStyle='#e9dcc0';g.fill();g.restore()};
    const pair=(x,y,s)=>{oar(x,y,s,.7);oar(x,y,s,Math.PI-.7)};
    if(P.panel==='side'){rect(g,-1.5,.78,3,.05,'#c89a3c');rect(g,-1.5,-.36,3,.05,'#c89a3c');dot(g,.15,.25,.42,'#1d1f27');pair(.15,.25,.42)}
    else if(P.panel==='top'){for(const y of[-.94,.89])rect(g,-1.5,y,3,.05,'#c89a3c');dot(g,-.3,0,.6,'#1d1f27');pair(-.3,0,.6)}
    else{dot(g,0,.24,.36,'#1d1f27');pair(0,.24,.34)}
  },
  // ---- third wave (Nov 2026): more sports, pirates, suits, robots and shapes ----
  // 39 Number Eight: a big jersey number (an 8 reads the same from either side of the car) and sleeve stripes
  (g,P)=>{
    const eight=(x,y,h,w)=>{for(const [c,lw] of [[P.ac,w*1.8],['#f4f6ff',w]]){g.lineWidth=lw;g.strokeStyle=c;g.beginPath();g.ellipse(x,y+h*.24,h*.18,h*.22,0,0,TAU);g.stroke();g.beginPath();g.ellipse(x,y-h*.24,h*.22,h*.26,0,0,TAU);g.stroke()}};
    const sleeve=(x0,x1,y)=>{rect(g,x0,y,x1-x0,.05,'#f4f6ff');rect(g,x0,y+.05,x1-x0,.05,P.ac);rect(g,x0,y+.1,x1-x0,.05,'#f4f6ff')};
    if(P.panel==='side'){eight(-.05,.22,.66,.075);sleeve(-1.5,1.5,-.36)}
    else if(P.panel==='top'){g.save();g.transform(0,-1,1,0,-.15,0);eight(0,0,.95,.1);g.restore();for(const s of[-1,1])sleeve(-1.5,1.5,s*.86-.075)}
    else if(P.panel==='rear')eight(0,.28,.5,.06);
    else sleeve(-1,1,-.36);
  },
  // 40 Speed Slashes: three slanted bars near the nose, white, accent, white
  (g,P)=>{
    const slash=(x,y0,y1,w,lean,c)=>{poly(g,[[x,y0],[x+w,y0],[x+w+lean,y1],[x+lean,y1]]);g.fillStyle=c;g.fill()};
    const set=(x,y0,y1,k)=>{slash(x,y0,y1,.16*k,-.32*k,'#f4f6ff');slash(x+.24*k,y0,y1,.12*k,-.32*k,P.ac);slash(x+.42*k,y0,y1,.08*k,-.32*k,'#f4f6ff')};
    if(P.panel==='side'){set(.55,-.3,.55,1);set(-1.35,-.3,-.05,.6)}
    else if(P.panel==='top'){for(const s of[-1,1]){g.save();g.scale(1,s);set(.6,.15,.95,1);g.restore()}}
    else if(P.panel==='rear'){for(const x of[-.7,.45])set(x,-.3,.45,.7)}
  },
  // 41 Baseball Stitches: the two curved seams of a baseball, red stitches on a white thread
  (g,P)=>{
    const seam=(f,x0,x1)=>{const pts=[];for(let x=x0;x<=x1+1e-6;x+=.02)pts.push([x,f(x)]);line(g,pts,.05,'rgba(255,255,255,.92)');
      for(let i=2;i<pts.length-2;i+=4){const [x,y]=pts[i],[xa,ya]=pts[i-2],[xb,yb]=pts[i+2],tx=xb-xa,ty=yb-ya,l=Math.hypot(tx,ty)||1,nx=-ty/l,ny=tx/l,ux=tx/l*.035,uy=ty/l*.035;
        for(const s of[-1,1])line(g,[[x-ux+nx*s*.075,y-uy+ny*s*.075],[x+ux+nx*s*.015,y+uy+ny*s*.015]],.022,'#d8262f')}};
    if(P.panel==='side')seam(x=>.22+.3*Math.sin(x*1.5+.4),-1.5,1.5);
    else if(P.panel==='top'){seam(y=>.5*Math.sin(y*1.6)+.12,-1.5,1.5);seam(y=>.5*Math.sin(y*1.6+Math.PI)-.12,-1.5,1.5)}
    else seam(x=>.25+.25*Math.cos(x*2),-1,1);
  },
  // 42 Pitch Lines: mown stripes in your own shades and white pitch markings
  (g,P)=>{
    g.globalAlpha=.4;for(let x=P.u0;x<P.u1;x+=.5)rect(g,x,P.v0,.25,P.v1-P.v0,P.dkr);g.globalAlpha=1;
    const W='rgba(255,255,255,.95)',lw=.06,box=(x0,x1,y)=>{g.lineWidth=lw;g.strokeStyle=W;g.strokeRect(Math.min(x0,x1),-y,Math.abs(x1-x0),y*2)};
    if(P.panel==='top'){line(g,[[0,-1],[0,1]],lw,W);g.beginPath();g.arc(0,0,.42,0,TAU);g.lineWidth=lw;g.strokeStyle=W;g.stroke();dot(g,0,0,.045,W);
      for(const s of[-1,1]){box(s*1.5,s*.95,.62);box(s*1.5,s*1.28,.3);g.beginPath();g.arc(s*.95,0,.2,s>0?Math.PI*.5:-Math.PI*.5,s>0?Math.PI*1.5:Math.PI*.5);g.stroke()}}
    else if(P.panel==='side'){line(g,[[-1.5,-.22],[1.5,-.22]],lw,W);g.beginPath();g.arc(1.5,-.22,.16,Math.PI*.5,Math.PI);g.lineWidth=lw;g.strokeStyle=W;g.stroke();g.beginPath();g.arc(-1.5,-.22,.16,0,Math.PI*.5);g.stroke();line(g,[[0,-.22],[0,.9]],lw,W)}
    else{g.lineWidth=lw;g.strokeStyle=W;g.strokeRect(-.6,-.3,1.2,.62);g.globalAlpha=.4;for(let x=-.55;x<.6;x+=.1)line(g,[[x,-.28],[x,.3]],.008,W);for(let y=-.25;y<.3;y+=.1)line(g,[[-.58,y],[.58,y]],.008,W);g.globalAlpha=1}
  },
  // 43 Vintage Racer: a white number disc with a double zero and a thin pinstripe, like an old race car
  (g,P)=>{
    const disc=(x,y,r)=>{dot(g,x,y,r,'#f4f1e6');g.beginPath();g.arc(x,y,r,0,TAU);g.lineWidth=r*.09;g.strokeStyle='#14161f';g.stroke();
      for(const s of[-1,1]){g.beginPath();g.ellipse(x+s*r*.3,y,r*.2,r*.46,0,0,TAU);g.lineWidth=r*.15;g.stroke()}};
    if(P.panel==='side'){rect(g,-1.5,-.11,3,.05,'#f4f1e6');rect(g,-1.5,-.095,3,.02,P.ac);disc(-.05,.18,.27)}
    else if(P.panel==='top'){for(const y of[-.12,.12])rect(g,-1.5,y-.02,3,.04,'#f4f1e6');disc(.95,0,.3)}
    else if(P.panel==='front'){g.beginPath();g.ellipse(0,.0,.5,.3,0,0,TAU);g.fillStyle='#f4f1e6';g.fill();g.lineWidth=.03;g.strokeStyle='#14161f';g.stroke()}
    else disc(0,.25,.2);
  },
  // 44 Pinstriping: thin hand-painted curls over the bonnet and along the sides
  (g,P)=>{
    const curl=(pts,c,w)=>{g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i+2<pts.length;i+=3)g.bezierCurveTo(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],pts[i+2][0],pts[i+2][1]);g.lineWidth=w;g.strokeStyle=c;g.lineCap='round';g.stroke()};
    const both=pts=>{curl(pts,P.dkr,.13);curl(pts,'#f4f6ff',.07);curl(pts,P.ac===P.lt?P.dk:P.ac,.025)};
    if(P.panel==='top'){for(const s of[-1,1]){both([[1.42,0],[1.1,s*.05],[.85,s*.45],[.55,s*.38],[.3,s*.3],[.35,s*.12],[.5,s*.16],[.6,s*.2],[.55,s*.3],[.45,s*.28]]);both([[-1.4,s*.72],[-.6,s*.74],[.2,s*.72],[.7,s*.6]])}}
    else if(P.panel==='side'){both([[-1.35,.3],[-.5,.34],[.4,.34],[.9,.22],[1.1,.14],[1.25,.24],[1.18,.32],[1.1,.36],[1.02,.3],[1.06,.26]]);both([[-1.3,-.18],[-.3,-.2],[.5,-.2],[1.2,-.16]])}
    else if(P.panel==='rear'){for(const s of[-1,1])both([[0,.15],[s*.2,.35],[s*.55,.3],[s*.45,.1],[s*.35,-.05],[s*.2,.05],[s*.28,.15]])}
  },
  // 45 Low Poly: the paint broken into big flat facets in lighter and darker shades of your team colour
  (g,P)=>{
    const c=.5,nx=Math.ceil((P.u1-P.u0)/c),ny=Math.ceil((P.v1-P.v0)/c),pt=[];
    for(let j=0;j<=ny;j++){pt.push([]);for(let i=0;i<=nx;i++)pt[j].push([P.u0+i*c+(i&&i<nx?(P.r()-.5)*c*.7:0),P.v0+j*c+(j&&j<ny?(P.r()-.5)*c*.7:0)])}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const q=[pt[j][i],pt[j][i+1],pt[j+1][i+1],pt[j+1][i]];
      for(const t of(P.r()>.5?[[q[0],q[1],q[2]],[q[0],q[2],q[3]]]:[[q[0],q[1],q[3]],[q[1],q[2],q[3]]])){const k=P.r();poly(g,t);g.fillStyle=k<.4?P.lt:k<.8?P.dk:P.dkr;g.globalAlpha=.4+P.r()*.45;g.fill();g.globalAlpha=1}}
  },
  // 46 Chevrons: big arrowheads pointing at the nose
  (g,P)=>{
    const chev=(x,yc,h,d,w,c)=>{poly(g,[[x,yc-h],[x+d,yc],[x,yc+h],[x+w,yc+h],[x+w+d,yc],[x+w,yc-h]]);g.fillStyle=c;g.fill()};
    if(P.panel==='side'){chev(-.75,.12,.34,.3,.17,'#f4f6ff');chev(-.25,.12,.34,.3,.17,P.ac);chev(.25,.12,.34,.3,.17,'#f4f6ff')}
    else if(P.panel==='top'){chev(-.6,0,.55,.45,.2,'#f4f6ff');chev(-.05,0,.55,.45,.2,P.ac);chev(.5,0,.55,.45,.2,'#f4f6ff')}
    else if(P.panel==='rear'){g.save();g.transform(0,1,1,0,0,0);chev(-.1,0,.45,.3,.15,'#f4f6ff');chev(.25,0,.45,.3,.15,P.ac);g.restore()}
  },
  // 47 Leopard Spots: broken dark rings round darker middles
  (g,P)=>{
    const w=P.u1-P.u0,h=P.v1-P.v0,n=Math.round(22*w*h/4),ink='#1b140e';
    for(let i=0;i<n;i++){const x=P.u0+((i%6)+.5)/6*w+(P.r()-.5)*.35,y=P.v0+P.r()*h,r=.07+P.r()*.05;
      g.fillStyle=P.dk;g.globalAlpha=.85;blob(g,x,y,r*.8,.3,P.r,8);g.fill();g.globalAlpha=1;
      const k=3+Math.floor(P.r()*3);for(let j=0;j<k;j++){const a0=j/k*TAU+P.r()*.4,a1=a0+TAU/k*.62;g.beginPath();g.arc(x,y,r*1.15,a0,a1);g.lineWidth=r*.42;g.strokeStyle=ink;g.lineCap='round';g.stroke()}}
    for(let i=0;i<n*.8;i++)dot(g,P.u0+P.r()*w,P.v0+P.r()*h,.018+P.r()*.02,ink);
  },
  // 48 Paw Prints: a trail of white paw prints walking over the car
  (g,P)=>{
    const paw=(x,y,s,a)=>{g.save();g.translate(x,y);g.rotate(a);for(const [c,k] of[[P.dkr,1.22],['#f4f6ff',1]]){g.fillStyle=c;g.beginPath();g.ellipse(-s*.25,0,s*.42*k,s*.48*k,0,0,TAU);g.fill();
      for(const [tx,ty] of[[.42,-.5],[.66,-.17],[.66,.17],[.42,.5]]){g.beginPath();g.ellipse(tx*s,ty*s,s*.17*k,s*.14*k,0,0,TAU);g.fill()}}g.restore()};
    if(P.panel==='side')for(let i=0;i<4;i++)paw(-1.1+i*.72,.14+(i%2?.12:-.04),.27,.15);
    else if(P.panel==='top')for(let i=0;i<4;i++)paw(-1.1+i*.72,(i%2?.3:-.3),.32,(i%2?-.1:.1));
    else if(P.panel==='rear'){paw(-.3,.1,.14,Math.PI/2);paw(.3,.3,.14,Math.PI/2)}
  },
  // 49 Big Waves: rolling waves along the bottom of the car, in pale shades of your team colour with white curls of foam
  (g,P)=>{
    const band=(x0,x1,base,amp,flip)=>{
      const f=x=>base+amp*Math.sin(x*4.4)+amp*.3*Math.sin(x*9.1+1),S=flip?-1:1;
      g.fillStyle=P.lt;g.globalAlpha=1;g.beginPath();g.moveTo(x0,S*-1.2);for(let x=x0;x<=x1;x+=.03)g.lineTo(x,S*f(x));g.lineTo(x1,S*-1.2);g.closePath();g.fill();g.globalAlpha=1;
      g.fillStyle=P.dkr;g.globalAlpha=.85;g.beginPath();g.moveTo(x0,S*-1.2);for(let x=x0;x<=x1;x+=.03)g.lineTo(x,S*(f(x+.4)-amp*2.6));g.lineTo(x1,S*-1.2);g.closePath();g.fill();g.globalAlpha=1;
      const pts=[];for(let x=x0;x<=x1;x+=.03)pts.push([x,S*f(x)]);line(g,pts,.08,'#f4f6ff');
      for(let k=Math.ceil((x0*4.4/Math.PI-.5)/2);;k++){const xc=(Math.PI*(2*k+.5))/4.4;if(xc>x1)break;if(xc<x0)continue;const yc=S*f(xc);
        g.beginPath();g.arc(xc-.09,yc-S*.08,.1,S>0?-.3:.3,S>0?Math.PI*1.4:-Math.PI*1.4,S<0);g.lineWidth=.055;g.strokeStyle='#f4f6ff';g.stroke();dot(g,xc+.06,yc+S*.03,.02,'#f4f6ff')}
    };
    if(P.panel==='side')band(-1.5,1.5,.3,.13,0);
    else if(P.panel==='top'){band(-1.5,1.5,-.55,.09,0);band(-1.5,1.5,-.55,.09,1)}
    else band(-1,1,-.18,.06,0);
  },
  // 50 Sunburst: pale rays fanning out from the nose
  (g,P)=>{
    const fan=(x,y,n,r,a0,a1)=>{for(let i=0;i<n;i++){const a=lerp(a0,a1,i/n),b=lerp(a0,a1,(i+.5)/n);poly(g,[[x,y],[x+Math.cos(a)*r,y+Math.sin(a)*r],[x+Math.cos(b)*r,y+Math.sin(b)*r]]);g.fillStyle=i%2?P.lt:'#fff3b0';g.globalAlpha=.85;g.fill();g.globalAlpha=1}dot(g,x,y,.26,'#ffd23f');g.beginPath();g.arc(x,y,.26,0,TAU);g.lineWidth=.05;g.strokeStyle='#f4f6ff';g.stroke()};
    if(P.panel==='side')fan(1.5,.15,7,3.6,Math.PI*.55,Math.PI*1.45);
    else if(P.panel==='top')fan(1.55,0,9,3.6,Math.PI*.5,Math.PI*1.5);
    else if(P.panel==='front')fan(0,.2,16,2,0,TAU);
  },
  // 51 Treasure Map: a scrap of old map on each door with a dotted route to an X, and a compass rose on the roof
  (g,P)=>{
    const map=(x0,y0,x1,y1)=>{
      const pts=[],n=26;for(let i=0;i<n;i++){const t=i/n*4,side=Math.floor(t),f=t-side,j=(P.r()-.5)*.035;
        pts.push(side===0?[lerp(x0,x1,f),y0+j]:side===1?[x1+j,lerp(y0,y1,f)]:side===2?[lerp(x1,x0,f),y1+j]:[x0+j,lerp(y1,y0,f)])}
      poly(g,pts);g.fillStyle='#ecdcaa';g.fill();g.lineWidth=.025;g.strokeStyle='#9a6f32';g.stroke();
      g.save();poly(g,pts);g.clip();const cx=(x0+x1)/2,cy=(y0+y1)/2,gr=g.createRadialGradient(cx,cy,.05,cx,cy,Math.max(x1-x0,y1-y0)*.7);gr.addColorStop(.55,'rgba(150,100,40,0)');gr.addColorStop(1,'rgba(150,100,40,.55)');g.fillStyle=gr;g.fillRect(x0,y0,x1-x0,y1-y0);
      g.fillStyle='#8fbf7a';blob(g,lerp(x0,x1,.68),lerp(y0,y1,.6),(y1-y0)*.24,.25,P.r,10);g.fill();g.lineWidth=.012;g.strokeStyle='#5a7a40';g.stroke();
      g.setLineDash([.045,.035]);line(g,[[lerp(x0,x1,.12),lerp(y0,y1,.2)],[lerp(x0,x1,.3),lerp(y0,y1,.55)],[lerp(x0,x1,.5),lerp(y0,y1,.3)],[lerp(x0,x1,.66),lerp(y0,y1,.58)]],.02,'#b0302a');g.setLineDash([]);
      const xx=lerp(x0,x1,.68),xy=lerp(y0,y1,.6),s=(y1-y0)*.09;line(g,[[xx-s,xy-s],[xx+s,xy+s]],.03,'#b0302a');line(g,[[xx-s,xy+s],[xx+s,xy-s]],.03,'#b0302a');g.restore()};
    const rose=(x,y,r)=>{for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.55:r;poly(g,[[x,y],[x+Math.cos(a-.2)*rr*.32,y+Math.sin(a-.2)*rr*.32],[x+Math.cos(a)*rr,y+Math.sin(a)*rr],[x+Math.cos(a+.2)*rr*.32,y+Math.sin(a+.2)*rr*.32]]);g.fillStyle=i%2?'#ecdcaa':'#e0b54a';g.fill();g.lineWidth=.012;g.strokeStyle='#6b4d1c';g.stroke()}
      g.beginPath();g.arc(x,y,r*.75,0,TAU);g.lineWidth=.018;g.strokeStyle='#ecdcaa';g.stroke();dot(g,x,y,r*.08,'#6b4d1c')};
    if(P.panel==='side')map(-.7,-.2,.55,.55);
    else if(P.panel==='top')rose(-.1,0,.5);
    else if(P.panel==='rear'){line(g,[[-.12,.12],[.12,.36]],.05,'#ecdcaa');line(g,[[-.12,.36],[.12,.12]],.05,'#ecdcaa')}
  },
  // 52 Eye Patch: a black patch over one headlight, its strap running back over the bonnet and down the sides
  (g,P)=>{
    const K='#121318';
    if(P.panel==='front'){line(g,[[.18,.9],[.42,.42]],.09,K);line(g,[[.82,.4],[1.05,.2]],.09,K);g.beginPath();g.ellipse(.6,.26,.3,.22,-.15,0,TAU);g.fillStyle=K;g.fill();g.lineWidth=.02;g.strokeStyle='#4a4d58';g.setLineDash([.03,.03]);g.beginPath();g.ellipse(.6,.26,.25,.17,-.15,0,TAU);g.stroke();g.setLineDash([]);g.beginPath();g.ellipse(.52,.33,.08,.04,-.4,0,TAU);g.fillStyle='rgba(255,255,255,.22)';g.fill()}
    else if(P.panel==='top')line(g,[[1.6,-.18],[.9,-.3],[.1,-1.1]],.2,K);
    else if(P.panel==='side')line(g,[[.12,.95],[-.08,.3],[-.12,-.5]],.18,K);
  },
  // 53 Tracksuit and Chain: two white stripes down each side, piping on the roof and a gold chain over the nose
  (g,P)=>{
    const chain=(pts)=>{for(let i=0;i<pts.length-1;i++){const [x,y]=pts[i],[x2,y2]=pts[i+1],a=Math.atan2(y2-y,x2-x);g.save();g.translate((x+x2)/2,(y+y2)/2);g.rotate(a);g.beginPath();g.ellipse(0,0,.055,i%2?.02:.032,0,0,TAU);g.lineWidth=.03;g.strokeStyle='#6b4d0c';g.stroke();g.lineWidth=.017;g.strokeStyle=i%2?'#ffe08a':'#e9b93a';g.stroke();g.restore()}};
    if(P.panel==='side'){rect(g,-1.5,-.42,3,.4,P.dkr);for(const y of[-.1,.06])rect(g,-1.5,y,3,.1,'#f4f6ff')}
    else if(P.panel==='top'){for(const s of[-1,1]){rect(g,-1.5,s*.78-.06,3,.12,'#f4f6ff');rect(g,-1.5,s*.93-.07,3,.14,P.dkr)}}
    else if(P.panel==='front'){const pts=[];for(let i=0;i<=16;i++){const t=i/16,a=Math.PI*(1-t);pts.push([Math.cos(a)*.72,.62-Math.sin(a)*.55])}chain(pts);
      dot(g,0,.0,.12,'#6b4d0c');dot(g,0,.0,.105,'#e9b93a');starPath(g,0,0,.07,5,.45,-Math.PI/2);g.fillStyle='#fff2b0';g.fill()}
    else{for(const x of[-.5,.42])rect(g,x,-.42,.08,1.32,'#f4f6ff')}
  },
  // 54 Suit and Tie: lapels in a dark shade of your colour, a white shirt and a long tie in your accent colour
  (g,P)=>{
    const tie=(x,yTop,len,w,dir)=>{poly(g,[[x-w*.55,yTop],[x+w*.55,yTop],[x+w*.4,yTop-dir*w*.8],[x-w*.4,yTop-dir*w*.8]]);g.fillStyle=P.ac;g.fill();
      poly(g,[[x-w*.35,yTop-dir*w*.8],[x+w*.35,yTop-dir*w*.8],[x+w*.6,yTop-dir*len*.9],[x,yTop-dir*len],[x-w*.6,yTop-dir*len*.9]]);g.fill();
      g.save();g.clip();for(let k=0;k<8;k++){const yy=yTop-dir*(w+k*len*.12);line(g,[[x-w,yy],[x+w,yy-dir*w*.8]],.02,P.acInk==='#14161f'?'rgba(0,0,0,.25)':'rgba(255,255,255,.3)')}g.restore()};
    if(P.panel==='front'){poly(g,[[-1,.9],[-.45,.9],[0,-.3],[-.35,-.42],[-1,-.42]]);g.fillStyle=P.dkr;g.fill();poly(g,[[1,.9],[.45,.9],[0,-.3],[.35,-.42],[1,-.42]]);g.fill();
      poly(g,[[-.45,.9],[.45,.9],[0,-.3]]);g.fillStyle='#f6f6f6';g.fill();tie(0,.88,1.1,.16,1)}
    else if(P.panel==='top'){poly(g,[[.3,-.6],[.3,.6],[1.5,0]]);g.fillStyle='#f6f6f6';g.fill();for(const s of[-1,1]){poly(g,[[.3,s*.6],[.3,s*1],[1.5,s*1],[1.5,s*.05]]);g.fillStyle=P.dkr;g.fill()}
      g.save();g.transform(0,-1,1,0,0,0);tie(0,.35,1.15,.18,-1);g.restore()}
    else if(P.panel==='side'){rect(g,-1.5,-.42,3,.16,P.dkr);rect(g,-1.5,-.26,3,.018,'#f6f6f6');for(const x of[.15,.35])dot(g,x,-.34,.03,'#c8ccd6')}
    else{rect(g,-1,-.42,2,.16,P.dkr);rect(g,-.012,-.42,.024,.4,P.dkr)}
  },
  // 55 Hazard Stripes: yellow and black bands round the doors, the nose and the tail
  (g,P)=>{
    const band=(x,y,w,h)=>{g.save();g.beginPath();g.rect(x,y,w,h);g.clip();rect(g,x,y,w,h,'#ffd21f');for(let k=x-h-1;k<x+w+1;k+=.18){poly(g,[[k,y],[k+.09,y],[k+.09+h,y+h],[k+h,y+h]]);g.fillStyle='#14161f';g.fill()}g.restore();rect(g,x,y+h-.012,w,.012,'#14161f')};
    if(P.panel==='side')band(-1.5,-.14,3,.32);
    else if(P.panel==='top'){band(1.18,-1,.32,2);band(-1.5,-1,.32,2)}
    else band(-1,0,2,.24);
  },
  // 56 Barcode: a white label with black bars on each rear wing and on the roof
  (g,P)=>{
    const code=(x,y,w,h)=>{rect(g,x-.03,y-.05,w+.06,h+.1,'#f4f6ff');let k=x;while(k<x+w){const b=.008+P.r()*.022;if(P.r()>.35)rect(g,k,y+.04,b,h-.04,'#14161f');k+=b+.008}for(let i=0;i<5;i++)rect(g,x+i*w/5+.01,y-.03,w/5-.03,.022,'#14161f')};
    if(P.panel==='side')code(-1.35,-.16,.9,.42);
    else if(P.panel==='top'){g.save();g.transform(0,-1,1,0,-1,0);code(-.3,-.15,.6,.3);g.restore()}
    else if(P.panel==='rear')code(-.25,.1,.5,.2);
  },
  // 57 Synthwave Sunset: a striped sun going down behind a glowing pink grid
  (g,P)=>{
    const sun=(x,y,r)=>{g.save();g.beginPath();g.arc(x,y,r,Math.PI,TAU);g.closePath();g.clip();const gr=g.createLinearGradient(0,y,0,y+r);gr.addColorStop(0,'#ff3fa4');gr.addColorStop(1,'#ffe45c');g.fillStyle=gr;g.fillRect(x-r,y,r*2,r);
      for(let k=0;k<5;k++){const yy=y+r*(.06+k*.13),hh=r*(.075-k*.012);rect(g,x-r,yy,r*2,hh,P.base)}g.restore()};
    const grid=(x0,x1,y0,y1,vx)=>{g.save();g.beginPath();g.rect(x0,y0,x1-x0,y1-y0);g.clip();g.lineWidth=.016;g.strokeStyle='#ff5ce0';
      for(let k=0;k<7;k++){const y=y1-(y1-y0)*Math.pow(k/7,1.6);g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke()}
      for(let k=-10;k<=10;k++){g.beginPath();g.moveTo(vx,y1);g.lineTo(vx+k*.35,y0);g.stroke()}g.restore();line(g,[[x0,y1],[x1,y1]],.03,'#ffb0f0')};
    if(P.panel==='side'){sun(0,.02,.46);grid(-1.5,1.5,-.42,.02,0)}
    else if(P.panel==='top'){g.save();g.globalAlpha=.75;grid(-1.5,1.5,-1,1,1.6);g.restore()}
    else grid(-1,1,-.42,.05,0);
  },
  // 58 Polka Dots: white dots, evenly spaced
  (g,P)=>{
    const s=.22;for(let j=0;P.v0+j*s*.87<P.v1+s;j++)for(let i=-1;P.u0+i*s<P.u1+s;i++)dot(g,P.u0+(i+(j%2?.5:0))*s,P.v0+j*s*.87,.055,'rgba(255,255,255,.95)');
  },
  // 59 Music Staff: five lines and a run of notes along each side
  (g,P)=>{
    const W='rgba(255,255,255,.95)';
    const staff=(x0,x1,y,gap,n,flip)=>{for(let k=0;k<5;k++)rect(g,x0,y+k*gap-.011,x1-x0,.022,W);
      const S=flip?-1:1;let last=null;for(let i=0;i<n;i++){const x=x0+.25+i*(x1-x0-.4)/n,step=[2,4,3,5,6,4,7,5,3,6][i%10],yy=y+step*gap/2;
        g.save();g.translate(x,yy);g.rotate(-.35);g.beginPath();g.ellipse(0,0,gap*.62,gap*.44,0,0,TAU);g.fillStyle=W;g.fill();g.restore();
        const sx=x+gap*.55,top=yy+S*gap*3.2;rect(g,sx-.007,Math.min(yy,top),.014,Math.abs(top-yy),W);
        if(i%2===1&&last){poly(g,[[last[0],last[1]],[sx+.007,top],[sx+.007,top-S*gap*.5],[last[0],last[1]-S*gap*.5]]);g.fillStyle=W;g.fill()}else if(i%2===0)last=[sx-.007,top];}
      g.beginPath();g.arc(x0+.1,y+gap*1.5,gap*1.1,0,TAU*.9);g.lineWidth=.02;g.strokeStyle=W;g.stroke();rect(g,x0+.09,y-gap,.014,gap*6,W)};
    if(P.panel==='side'){rect(g,-1.5,-.16,3,.5,P.dkr);staff(-1.4,1.4,-.06,.075,7)}
    else if(P.panel==='top'){rect(g,-1.5,.52,3,.4,P.dkr);rect(g,-1.5,-.92,3,.4,P.dkr);staff(-1.4,1.3,.58,.06,7);staff(-1.4,1.3,-.86,.06,7)}
    else if(P.panel==='rear')staff(-.8,.8,.1,.05,3);
  },
  // 60 Paisley: curled teardrops in pale shades with white outlines and dots, like a bandana
  (g,P)=>{
    const drop=(x,y,s,a)=>{g.save();g.translate(x,y);g.rotate(a);g.scale(s,s);
      const path=k=>{g.beginPath();g.moveTo(0,-.5*k);g.bezierCurveTo(.6*k,-.5*k,.65*k,.35*k,.1*k,.42*k);g.bezierCurveTo(-.25*k,.5*k,-.55*k,.85*k,-.2*k,1.25*k);g.bezierCurveTo(-.75*k,1.05*k,-.75*k,.4*k,-.5*k,0);g.bezierCurveTo(-.4*k,-.3*k,-.25*k,-.5*k,0,-.5*k);g.closePath()};
      path(1);g.lineWidth=.22;g.strokeStyle=P.dkr;g.stroke();g.fillStyle=P.lt;g.fill();g.lineWidth=.09;g.strokeStyle='#f4f6ff';g.stroke();path(.55);g.fillStyle=P.dkr;g.fill();
      dot(g,0,0,.12,'#f4f6ff');for(let i=0;i<9;i++){const t=i/9*TAU;dot(g,Math.cos(t)*.78,Math.sin(t)*.72+.1,.045,'#f4f6ff')}g.restore()};
    const w=P.u1-P.u0,h=P.v1-P.v0,n=Math.max(2,Math.round(7*w*h/4));
    for(let i=0;i<n;i++)drop(P.u0+((i%4)+.5)/4*w+(P.r()-.5)*.2,P.v0+(Math.floor(i/4)%3+.5)/3*h+(P.r()-.5)*.15,.3+P.r()*.05,P.r()*TAU);
  },
  // 61 Golf Argyle: diamonds in two shades of your colour with thin white lines crossing them
  (g,P)=>{
    const dw=.5,dh=.62;
    for(let j=-1;P.v0+j*dh/2<P.v1+dh;j++)for(let i=-1;P.u0+i*dw<P.u1+dw;i++){if((i+j)%2)continue;const x=P.u0+i*dw+(j%2?dw/2:0),y=P.v0+j*dh/2;
      poly(g,[[x,y-dh/2],[x+dw/2,y],[x,y+dh/2],[x-dw/2,y]]);g.fillStyle=(Math.floor(i/1)+Math.floor(j/2))%2?P.dkr:P.lt;g.globalAlpha=.75;g.fill();g.globalAlpha=1}
    g.setLineDash([.06,.035]);g.lineWidth=.028;g.strokeStyle='rgba(255,255,255,.9)';
    for(let k=-6;k<8;k++){g.beginPath();g.moveTo(P.u0+k*dw,P.v0);g.lineTo(P.u0+k*dw+(P.v1-P.v0)*dw/dh,P.v1);g.stroke();g.beginPath();g.moveTo(P.u0+k*dw,P.v1);g.lineTo(P.u0+k*dw+(P.v1-P.v0)*dw/dh,P.v0);g.stroke()}
    g.setLineDash([]);
  },
  // 62 Title Belt: a black strap round the car with a big gold plate and gems on each door
  (g,P)=>{
    const strap=(x0,y0,x1,y1)=>{rect(g,x0,y0,x1-x0,y1-y0,'#17151b');g.setLineDash([.03,.025]);g.lineWidth=.01;g.strokeStyle='#c8ccd6';const vert=y1-y0>x1-x0;
      if(vert){for(const x of[x0+.03,x1-.03]){g.beginPath();g.moveTo(x,y0);g.lineTo(x,y1);g.stroke()}}else{for(const y of[y0+.03,y1-.03]){g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke()}}g.setLineDash([])};
    const plate=(x,y,w,h,gem)=>{g.beginPath();g.ellipse(x,y,w,h,0,0,TAU);const gr=g.createRadialGradient(x-w*.3,y+h*.3,.01,x,y,Math.max(w,h));gr.addColorStop(0,'#fff6c2');gr.addColorStop(.5,'#e9b93a');gr.addColorStop(1,'#9a6a14');g.fillStyle=gr;g.fill();g.lineWidth=.02;g.strokeStyle='#6b4a0c';g.stroke();
      g.beginPath();g.ellipse(x,y,w*.8,h*.78,0,0,TAU);g.lineWidth=.012;g.strokeStyle='#fff2b0';g.stroke();
      for(let i=0;i<8;i++){const a=i/8*TAU;starPath(g,x+Math.cos(a)*w*.6,y+Math.sin(a)*h*.58,Math.min(w,h)*.09,5,.45,-Math.PI/2);g.fillStyle='#fff6c2';g.fill()}
      dot(g,x,y,Math.min(w,h)*.3,'#6b4a0c');dot(g,x,y,Math.min(w,h)*.26,gem);dot(g,x-Math.min(w,h)*.08,y+Math.min(w,h)*.09,Math.min(w,h)*.08,'rgba(255,255,255,.75)')};
    if(P.panel==='side'){strap(-1.5,-.12,1.5,.18);plate(-.05,.06,.42,.3,'#d8262f');for(const x of[-.85,.75])plate(x,.03,.15,.13,'#2e7bff')}
    else if(P.panel==='top'){strap(-.2,-1,.16,1);plate(-.02,0,.3,.34,'#d8262f')}
    else strap(-1,-.12,1,.18);
  }
];
// paints one decal picture: every panel filled with the team colour, then the painter on top of each
function paintDecal(no,S,teamCol,accent){
  const cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d'),pn=panels(S);
  const base=css(teamCol),dk=css(mixHex(teamCol,0,.42)),dkr=css(mixHex(teamCol,0,.66)),lt=css(mixHex(teamCol,0xffffff,.42)),ac=css(accent);
  const lum=((accent>>16&255)*.3+(accent>>8&255)*.6+(accent&255)*.1)/255;
  g.fillStyle=base;g.fillRect(0,0,S,S);
  for(const name in pn){
    const p=pn[name],sx=p.w/(p.u1-p.u0),sy=p.h/(p.v1-p.v0);
    g.save();g.beginPath();g.rect(p.x,p.y,p.w,p.h);g.clip();
    g.setTransform(sx,0,0,-sy,p.x-p.u0*sx,p.y+p.h+p.v0*sy);
    DECALS[no](g,{panel:name,u0:p.u0,u1:p.u1,v0:p.v0,v1:p.v1,base,dk,dkr,lt,ac,acInk:lum>.5?'#14161f':'#f4f6ff',r:rng(no*7919+name.length*131)});
    g.restore();
  }
  return cv;
}
// a small picture of the side panel for the garage's picker
function decalSwatch(no,w,h,teamCol,accent){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');
  const base=css(teamCol),u0=-1.5,u1=1.5,v0=-.36,v1=.62;
  g.fillStyle=base;g.fillRect(0,0,w,h);
  if(DECALS[no]){
    g.setTransform(w/(u1-u0),0,0,-h/(v1-v0),-u0*w/(u1-u0),h+v0*h/(v1-v0));
    const lum=((accent>>16&255)*.3+(accent>>8&255)*.6+(accent&255)*.1)/255;
    DECALS[no](g,{panel:'side',u0:-1.5,u1:1.5,v0:-.42,v1:.9,base,dk:css(mixHex(teamCol,0,.42)),dkr:css(mixHex(teamCol,0,.66)),lt:css(mixHex(teamCol,0xffffff,.42)),ac:css(accent),acInk:lum>.5?'#14161f':'#f4f6ff',r:rng(no*7919+4*131)});
  }
  return cv;
}
// gives the paint's triangles their place in the picture (see the note above). The shape itself is unchanged.
function decalGeometry(geo){
  const g=geo.index?geo.toNonIndexed():geo.clone(),P=g.attributes.position,n=P.count,uv=new Float32Array(n*2),pn=panels(1),e=.004;
  const a=new V3(),b=new V3(),c=new V3(),ab=new V3(),ac=new V3();
  for(let i=0;i<n;i+=3){
    a.fromBufferAttribute(P,i);b.fromBufferAttribute(P,i+1);c.fromBufferAttribute(P,i+2);
    ab.subVectors(b,a);ac.subVectors(c,a);ab.cross(ac).normalize();
    const p=Math.abs(ab.z)>.72?(ab.z>0?pn.front:pn.rear):ab.y>.55&&ab.y>Math.abs(ab.x)?pn.top:pn.side;
    for(let k=0;k<3;k++){
      const x=P.getX(i+k),y=P.getY(i+k),z=P.getZ(i+k);
      const u=p===pn.front||p===pn.rear?x:z,v=p===pn.top?x:p===pn.side||p===pn.front||p===pn.rear?y:0;
      const px=p.x+clamp((u-p.u0)/(p.u1-p.u0),e,1-e)*p.w,py=p.y+p.h-clamp((v-p.v0)/(p.v1-p.v0),e,1-e)*p.h;
      uv[(i+k)*2]=px;uv[(i+k)*2+1]=1-py;
    }
  }
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  return g;
}
// decal materials, shared by cars that look the same and thrown away when the last of them goes (release)
const skins=new Map();
function decalSkin(no,team,aHex,gl){
  const col=G.TEAM[team].col,low=G.low(),key=no+':'+col+':'+aHex+(gl?':g':'')+(low?':l':'');
  let s=skins.get(key);
  if(!s){
    const tex=new THREE.CanvasTexture(paintDecal(no,low?256:512,col,aHex));tex.anisotropy=Math.min(4,G.renderer.capabilities.getMaxAnisotropy());
    const mat=gl?new THREE.MeshPhysicalMaterial({color:0xffffff,map:tex,roughness:.5,metalness:.45,clearcoat:1,clearcoatRoughness:.08,envMap:G.stadiumEnv(),envMapIntensity:1}):new THREE.MeshLambertMaterial({color:0xffffff,map:tex});
    skins.set(key,s={key,mat,tex,n:0});
  }
  s.n++;return s;
}
function release(s){if(--s.n>0)return;skins.delete(s.key);s.tex.dispose();s.mat.dispose()}

function has(slot,no){const L=LISTS[slot];return !!no&&!!L&&!!L[no]}
// while a car model is built: the decal goes on the paint mesh (the one whose material is the team paint), and the
// topper and hat are added as one more mesh
function dress(inner,K,o){
  let skin=null;
  if(has(0,K[0])){
    const m=inner.children.find(x=>x.isMesh&&x.material===o.mB);
    if(m){const old=m.geometry;m.geometry=decalGeometry(old);old.dispose();skin=decalSkin(K[0],o.team,o.aHex,o.gl)}
    if(m)m.material=skin.mat;
  }
  extras(inner,K,o);
  return skin;
}

// =====================================================================
//  Extras: antenna toppers, roof hats, wheels, engine sounds
// =====================================================================
// A topper sits on a thin aerial at the back of the car and a hat sits on the roof. Where those are is worked out
// from the body itself (the highest point near the middle; the top of the body near the back right corner), so they
// fit all fifteen bodies without a table. Both are welded into ONE vertex-coloured mesh: one more draw call for a car
// that wears either or both (and one more in the shadow pass on Pretty). Wheels swap the shared spoke and hub shapes
// and cost nothing extra. Engine sounds only change the numbers the driver's own engine tone is made from.
// In item-number order (cosmetics.js: boostball topper / hat / wheels / engine 1, 2, 3, ...).
const anchors={};
function anchor(inner,body){
  if(anchors[body])return anchors[body];
  const v=new V3();let top=-9,tz=0,tn=0;
  const each=f=>{for(const m of inner.children){if(!m.isMesh)continue;const P=m.geometry.attributes.position;for(let i=0;i<P.count;i++)f(v.fromBufferAttribute(P,i))}};
  each(p=>{if(Math.abs(p.x)<.28&&p.z>-.75&&p.z<.45&&p.y>top)top=p.y});
  each(p=>{if(Math.abs(p.x)<.28&&p.z>-.75&&p.z<.45&&p.y>top-.04){tz+=p.z;tn++}});
  const col=(x,z,r)=>{let y=-9;each(p=>{if(Math.hypot(p.x-x,p.z-z)<r&&p.y>y)y=p.y});return y};
  let ax=.42,az=-.8,ay=col(ax,az,.16);
  if(ay<-1){ax=.18;az=-.9;ay=col(ax,az,.22)}
  if(ay<-1){ax=.22;az=tn?tz/tn:0;ay=top}
  return anchors[body]={top,tz:tn?tz/tn:0,ax,ay,az};
}
let _xl=null,_xs=null;
const extraMat=gl=>gl?(_xs||(_xs=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.15,envMap:G.stadiumEnv(),envMapIntensity:1}))):(_xl||(_xl=new THREE.MeshLambertMaterial({vertexColors:true})));
// the Tricorn topper's brim: three upturned walls, one point to the front, whose top edges arch up between the points
// (so from the front the hat shows its proper arched outline). R: how far the points are from the middle; h: wall height.
function tricornPt(R,h,k,t,top){
  const a0=Math.PI/2+k*TAU/3,a1=a0+TAU/3,ax=Math.cos(a0)*R,az=Math.sin(a0)*R,bx=Math.cos(a1)*R,bz=Math.sin(a1)*R;
  const mx=(ax+bx)/2,mz=(az+bz)/2,ml=Math.hypot(mx,mz),bow=Math.sin(Math.PI*t)*R*.14;
  const x=lerp(ax,bx,t)+mx/ml*bow,z=lerp(az,bz,t)+mz/ml*bow;
  if(!top)return[x*.9,0,z*.9];
  const s=Math.sin(Math.PI*t),out=1+.08*s;return[x*out,h*(.3+.7*Math.pow(s,.7)),z*out];
}
function tricornGeo(R,h){
  const N=12,pos=[],idx=[];
  for(const inner of[0,1])for(let k=0;k<3;k++){
    const base=pos.length/3,sh=inner?.985:1;
    for(let i=0;i<=N;i++){const t=i/N,b=tricornPt(R,h,k,t,0),u=tricornPt(R,h,k,t,1);pos.push(b[0]*sh,b[1],b[2]*sh,u[0]*sh,u[1],u[2]*sh)}
    for(let i=0;i<N;i++){const a=base+i*2,q=[a,a+1,a+2,a+1,a+3,a+2];if(inner)q.reverse();idx.push(...q)}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function tricornRim(R,h){const pts=[];for(let k=0;k<3;k++)for(let i=0;i<10;i++){const p=tricornPt(R,h,k,i/10,1);pts.push(new V3(p[0],p[1],p[2]))}return new THREE.CatmullRomCurve3(pts,true,'centripetal')}
const TOPPERS=[null,
  /* 1 Tennis Ball */ (b,x,y,z)=>{b.sph(.12,0xd8ff3f,x,y,z);b.tor(.118,.012,0xffffff,x,y,z,.5,0,.4)},
  /* 2 Gold Star */ (b,x,y,z)=>{b.sph(.07,0xffd23f,x,y,z,1,1,.6);for(let i=0;i<5;i++){const a=i/5*TAU;b.add(new THREE.ConeGeometry(.055,.13,4),0xffd23f,x+Math.sin(a)*.1,y+Math.cos(a)*.1,z,0,0,-a,1,1,.6)}},
  /* 3 Bath Duck */ (b,x,y,z)=>{b.sph(.11,0xffd23f,x,y,z,1,.8,1.25);b.sph(.075,0xffd23f,x,y+.1,z+.09);b.add(new THREE.ConeGeometry(.035,.08,6),0xff8a1f,x,y+.09,z+.18,Math.PI/2,0,0);b.add(new THREE.ConeGeometry(.05,.1,4),0xffd23f,x,y+.04,z-.15,-1,0,0);for(const s of[-1,1])b.sph(.014,0x14161f,x+s*.045,y+.125,z+.14)},
  /* 4 Mini Pumpkin */ (b,x,y,z)=>{for(let i=0;i<6;i++){const a=i/6*TAU;b.sph(.07,i%2?0xff8a1f:0xf07a12,x+Math.cos(a)*.06,y,z+Math.sin(a)*.06,1,1.25,1)}b.cyl(.012,.02,.07,0x5f7a2a,x,y+.11,z,0,0,.3,5)},
  /* 5 Pennant */ (b,x,y,z,ac)=>{b.add(new THREE.ConeGeometry(.11,.34,3),ac,x,y-.02,z-.18,-Math.PI/2,0,0,.12,1,1);b.sph(.03,0xffd23f,x,y+.1,z)},
  /* 6 Eyeball */ (b,x,y,z)=>{b.sph(.12,0xffffff,x,y,z);b.sph(.06,0x2e7bff,x,y+.02,z+.085,1,1,.6);b.sph(.03,0x14161f,x,y+.025,z+.118,1,1,.5)},
  // ---- second wave (Nov 2026)
  /* 7 Soccer Ball */ (b,x,y,z)=>{b.sph(.12,0xf6f6f6,x,y,z);for(const [dx,dy,dz] of[[0,1,0],[.9,.3,.3],[-.9,.3,.3],[0,.3,-.95],[.5,-.5,.7],[-.5,-.5,.7],[0,.1,1]]){const l=Math.hypot(dx,dy,dz);b.sph(.04,0x14161f,x+dx/l*.11,y+dy/l*.11,z+dz/l*.11)}},
  /* 8 Basketball */ (b,x,y,z)=>{b.sph(.12,0xe8742a,x,y,z);b.tor(.121,.007,0x2a1810,x,y,z);b.tor(.121,.007,0x2a1810,x,y,z,0,Math.PI/2,0);b.tor(.121,.007,0x2a1810,x,y,z,Math.PI/2,0,0)},
  /* 9 Baseball */ (b,x,y,z)=>{b.sph(.12,0xf6f4ea,x,y,z);for(const s of[-1,1])b.tor(.085,.009,0xd8262f,x+s*.06,y,z,0,Math.PI/2,s*.3)},
  /* 10 Anchor */ (b,x,y,z)=>{const c=0x5a6170;b.cyl(.014,.014,.24,c,x,y,z,0,0,0,6);b.box(.14,.022,.022,c,x,y+.07,z);b.tor(.08,.014,c,x,y-.04,z,0,0,0);b.tor(.03,.01,c,x,y+.14,z)},
  /* 11 Robot Head */ (b,x,y,z)=>{b.box(.2,.16,.16,0xb8bccf,x,y,z);for(const s of[-1,1]){b.sph(.026,0x3fd2ff,x+s*.05,y+.015,z+.08,1,1,.4);b.cyl(.025,.025,.03,0x6b7280,x+s*.11,y,z,0,0,Math.PI/2,8)}b.box(.1,.02,.01,0x15171b,x,y-.04,z+.081);b.cyl(.006,.006,.08,0x6b7280,x,y+.12,z,0,0,0,5);b.sph(.02,0xff3b3b,x,y+.17,z)},
  /* 12 Parrot */ (b,x,y,z)=>{b.sph(.075,0x2ecc5a,x,y,z,1,1.4,1);b.sph(.06,0x2ecc5a,x,y+.12,z+.02);b.add(new THREE.ConeGeometry(.025,.07,6),0xffd23f,x,y+.11,z+.09,Math.PI/2+.4,0,0);for(const s of[-1,1]){b.sph(.035,0xd8262f,x+s*.065,y,z,.5,1.4,1);b.sph(.012,0x14161f,x+s*.035,y+.14,z+.05)}b.add(new THREE.ConeGeometry(.035,.16,4),0x2e7bff,x,y-.13,z-.05,Math.PI-.4,0,0)},
  // ---- third wave (Nov 2026). Each stays within about a quarter of a unit of the aerial's tip: small enough not to cover the ball.
  /* 13 Foam Finger */ (b,x,y,z,ac)=>{b.box(.17,.13,.08,ac,x,y,z);b.cyl(.038,.042,.16,ac,x+.04,y+.13,z,0,0,0,8);b.sph(.038,ac,x+.04,y+.21,z,1,1,1,8);b.sph(.045,ac,x-.1,y+.03,z,1.1,.75,.9,8);
    for(const dx of[-.04,0])b.sph(.034,ac,x+dx,y+.065,z+.035,1,.9,1,8);b.box(.19,.05,.1,0xffffff,x,y-.09,z)},
  /* 14 Trophy */ (b,x,y,z)=>{const G=0xffc83a,D=0xc98a12;b.box(.14,.05,.14,0x3a2a1a,x,y-.1,z);b.cyl(.04,.06,.03,G,x,y-.06,z,0,0,0,10);b.cyl(.016,.02,.08,D,x,y-.01,z,0,0,0,8);
    b.cyl(.1,.045,.13,G,x,y+.09,z,0,0,0,14);b.tor(.1,.012,D,x,y+.155,z,Math.PI/2,0,0);for(const s of[-1,1])b.tor(.042,.011,G,x+s*.105,y+.1,z,0,0,0);b.sph(.02,0xffffff,x,y+.09,z+.085,1,1,.4,6)},
  /* 15 Whistle */ (b,x,y,z)=>{const S=0xc8d2dc;b.cyl(.06,.06,.1,S,x,y,z,0,0,Math.PI/2,14);b.box(.11,.045,.05,S,x+.1,y+.035,z);b.box(.035,.012,.03,0x2a2f3a,x+.01,y+.058,z);b.tor(.025,.008,0xd8262f,x-.075,y+.03,z,Math.PI/2,0,0);b.sph(.02,0xffffff,x-.02,y+.03,z+.05,1,1,.4,6)},
  /* 16 Tricorn */ (b,x,y,z)=>{const N=0x2a2440,Au=0xe0b040;b.add(tricornGeo(.2,.15),N,x,y-.04,z);b.sph(.13,N,x,y-.02,z,1,.85,1);
    b.add(new THREE.TubeGeometry(tricornRim(.2,.15),48,.011,5,true),Au,x,y-.04,z);b.sph(.03,0xd8262f,x+.1,y+.08,z+.04,1,1,.5,8);b.sph(.016,Au,x+.1,y+.08,z+.055,1,1,.5,6)},
  /* 17 Eye Patch Flag */ (b,x,y,z)=>{b.cyl(.008,.008,.24,0xc8d2dc,x,y+.1,z,0,0,0,5);b.sph(.018,0xe0b040,x,y+.23,z,1,1,1,6);b.box(.012,.17,.27,0x15161c,x,y+.12,z-.14);
    for(const s of[-1,1]){b.sph(.05,0xf2ead0,x+s*.007,y+.11,z-.15,.2,1,1.25,10);b.sph(.04,0x15161c,x+s*.011,y+.11,z-.15,.2,1,1.25,10);b.box(.016,.012,.29,0xf2ead0,x+s*.006,y+.12,z-.14,.55,0,0)}},
  /* 18 Halo */ (b,x,y,z)=>{b.sph(.02,0xfff2b0,x,y,z,1,1,1,6);b.tor(.12,.022,0xffe680,x,y+.1,z,Math.PI/2,0,0);b.tor(.12,.008,0xffffff,x,y+.122,z,Math.PI/2,0,0)},
  /* 19 Pizza Slice */ (b,x,y,z)=>{b.add(new THREE.CylinderGeometry(.2,.2,.03,8,1,false,Math.PI-.38,.76),0xffd25a,x,y-.04,z,Math.PI/2,0,0);b.add(new THREE.TorusGeometry(.19,.022,5,8,.8),0xd99a4a,x,y-.04,z,0,0,Math.PI/2-.4);
    for(const [dx,dy] of[[-.02,.1],[.015,.065],[-.03,.155],[.035,.145]])for(const s of[-1,1])b.cyl(.022,.022,.008,0xc0392b,x+dx,y-.04+dy,z+s*.017,Math.PI/2,0,0,8)},
  /* 20 Flying Saucer */ (b,x,y,z)=>{b.sph(.17,0xb8c0cc,x,y,z,1,.24,1,18);b.sph(.07,0x8fe6ff,x,y+.035,z,1,.8,1,12);b.sph(.025,0x7be07b,x,y+.05,z,1,1,1,6);for(let i=0;i<8;i++){const a=i/8*TAU;b.sph(.016,i%2?0xffe23f:0xff5c9a,x+Math.cos(a)*.15,y,z+Math.sin(a)*.15,1,1,1,6)}},
  /* 21 Cactus */ (b,x,y,z)=>{b.cyl(.075,.055,.08,0xc0643a,x,y-.06,z,0,0,0,10);b.cyl(.078,.078,.02,0xd9774a,x,y-.02,z,0,0,0,10);b.cyl(.042,.045,.2,0x3e9a4a,x,y+.08,z,0,0,0,10);b.sph(.042,0x3e9a4a,x,y+.18,z,1,1,1,10);
    for(const s of[-1,1]){b.cyl(.02,.02,.06,0x3e9a4a,x+s*.06,y+.06+(s>0?.02:0),z,0,0,Math.PI/2,6);b.cyl(.022,.022,.07,0x3e9a4a,x+s*.09,y+.1+(s>0?.02:0),z,0,0,0,8);b.sph(.022,0x3e9a4a,x+s*.09,y+.135+(s>0?.02:0),z,1,1,1,6)}b.sph(.024,0xff6fae,x,y+.225,z,1,.7,1,8)},
  /* 22 Wizard Hat */ (b,x,y,z)=>{const N=0x2a2a7a;b.cyl(.19,.19,.018,N,x,y-.02,z,0,0,0,16);b.cyl(.075,.12,.15,N,x,y+.06,z,0,0,0,12);b.cyl(.122,.122,.025,0xe0b040,x,y,z,0,0,0,12);
    b.add(new THREE.ConeGeometry(.076,.17,12),N,x-.03,y+.2,z,0,0,.35);for(const [dx,dy,dz] of[[.08,.06,.07],[-.07,.1,.06],[.02,.14,-.07],[-.03,.03,-.11]])b.sph(.016,0xffe23f,x+dx,y+dy,z+dz,1,1,1,6);b.sph(.018,0xffe23f,x-.09,y+.28,z,1,1,1,6)},
  /* 23 Smiley Ball */ (b,x,y,z)=>{b.sph(.12,0xffe23f,x,y,z);for(const s of[-1,1])b.sph(.016,0x14161f,x+s*.038,y+.03,z+.108,1,1.7,.6,6);b.add(new THREE.TorusGeometry(.05,.009,5,10,Math.PI),0x14161f,x,y-.005,z+.103,-.35,0,Math.PI)},
  /* 24 Racing Helmet */ (b,x,y,z,ac)=>{b.sph(.12,ac,x,y,z,1,.92,1.05);b.sph(.1,0x15171b,x,y+.01,z+.07,1,.5,.62,12);b.tor(.121,.012,0xffffff,x,y,z,0,Math.PI/2,0);b.box(.14,.03,.08,0x2a2f3a,x,y-.1,z+.03)},
  /* 25 Baseball Cap */ (b,x,y,z,ac)=>{b.add(new THREE.SphereGeometry(.11,14,7,0,TAU,0,Math.PI/2),ac,x,y-.03,z,0,0,0,1,.75,1);b.cyl(.112,.112,.02,ac,x,y-.035,z,0,0,0,14);
    b.add(new THREE.CylinderGeometry(.1,.1,.014,12,1,false,-Math.PI/2,Math.PI),mixHex(ac,0,.3),x,y-.03,z+.07,-.12,0,0,1,1,1.2);b.sph(.016,0xffffff,x,y+.055,z,1,.6,1,6)},
  /* 26 Boxing Glove */ (b,x,y,z)=>{const R=0xd8262f;b.sph(.1,R,x,y+.03,z,1,1.15,1.1,12);b.sph(.045,R,x+.085,y+.0,z+.05,1,1.3,1,8);b.cyl(.07,.075,.08,0xffffff,x,y-.1,z,0,0,0,12);b.box(.012,.06,.012,0xffffff,x,y+.04,z+.11)},
  /* 27 Golf Ball */ (b,x,y,z)=>{b.add(new THREE.ConeGeometry(.025,.1,8),0xe8c9a0,x,y-.04,z,Math.PI,0,0);b.cyl(.03,.02,.012,0xe8c9a0,x,y+.01,z,0,0,0,8);b.sph(.085,0xffffff,x,y+.09,z,1,1,1,14);
    for(let i=0;i<10;i++){const a=i*2.4,h=(i/10)*1.6-.8,r=Math.sqrt(1-h*h);b.sph(.012,0xdfe3ea,x+Math.cos(a)*r*.083,y+.09+h*.083,z+Math.sin(a)*r*.083,1,1,1,4)}},
  /* 28 Mini Fedora */ (b,x,y,z)=>{b.cyl(.17,.17,.015,0x5f6372,x,y-.03,z,0,0,0,16);b.cyl(.085,.1,.11,0x6b6f7c,x,y+.03,z,0,0,0,12);b.cyl(.102,.102,.028,0x15161c,x,y-.01,z,0,0,0,12);b.box(.025,.02,.14,0x5f6372,x,y+.085,z)},
  /* 29 Mini Top Hat */ (b,x,y,z,ac)=>{b.cyl(.15,.15,.016,0x22232b,x,y-.03,z,0,0,0,16);b.cyl(.09,.085,.18,0x22232b,x,y+.06,z,0,0,0,14);b.cyl(.087,.087,.035,ac,x,y,z,0,0,0,14)},
  /* 30 Mini Cone */ (b,x,y,z)=>{b.box(.16,.02,.16,0xff7a1f,x,y-.04,z);b.cyl(.02,.07,.18,0xff7a1f,x,y+.06,z,0,0,0,12);b.cyl(.044,.054,.04,0xffffff,x,y+.07,z,0,0,0,12)},
  /* 31 Propeller Cap */ (b,x,y,z)=>{[0xd93636,0xffd23f,0x2e7bff,0x46c34a].forEach((c,i)=>b.add(new THREE.SphereGeometry(.11,5,6,i*Math.PI/2,Math.PI/2,0,Math.PI/2),c,x,y-.03,z,0,0,0,1,.8,1));
    b.add(new THREE.CylinderGeometry(.1,.1,.012,12,1,false,-Math.PI/2,Math.PI),0x2e7bff,x,y-.035,z+.07,0,0,0,1,1,1.1);b.cyl(.008,.008,.06,0xc8d2dc,x,y+.08,z,0,0,0,5);b.box(.24,.008,.04,0xffd23f,x,y+.11,z,0,.6,0);b.sph(.016,0xd93636,x,y+.115,z,1,1,1,6)},
  /* 32 Little Chef Hat */ (b,x,y,z)=>{b.cyl(.085,.085,.1,0xffffff,x,y,z,0,0,0,12);for(let i=0;i<6;i++){const a=i/6*TAU;b.sph(.055,0xffffff,x+Math.cos(a)*.06,y+.08,z+Math.sin(a)*.06,1,1,1,8)}b.sph(.07,0xffffff,x,y+.1,z,1,1,1,10);b.cyl(.087,.087,.02,0xe6e8ee,x,y-.04,z,0,0,0,12)},
  /* 33 Royal Crown */ (b,x,y,z)=>{const G=0xffc83a;b.sph(.085,0x8a1030,x,y+.02,z,1,.7,1,12);b.cyl(.105,.095,.07,G,x,y-.01,z,0,0,0,12,true);b.tor(.1,.012,0xc98a12,x,y-.045,z,Math.PI/2,0,0);
    for(let i=0;i<6;i++){const a=i/6*TAU;b.add(new THREE.ConeGeometry(.028,.08,4),G,x+Math.cos(a)*.1,y+.06,z+Math.sin(a)*.1);b.sph(.013,0xffffff,x+Math.cos(a)*.1,y+.105,z+Math.sin(a)*.1,1,1,1,6);b.sph(.017,[0xd8262f,0x2e7bff,0x2ecc5a][i%3],x+Math.cos(a)*.105,y-.01,z+Math.sin(a)*.105,1,1,.6,6)}
    b.sph(.02,G,x,y+.08,z,1,1,1,6);b.add(new THREE.ConeGeometry(.012,.05,4),G,x,y+.11,z)},
  /* 34 American Football */ (b,x,y,z)=>{b.sph(.065,0x8a4a22,x,y,z,1,1,1.7,14);for(const s of[-1,1])b.tor(.048,.007,0xffffff,x,y,z+s*.075,0,0,0);b.box(.012,.008,.08,0xffffff,x,y+.065,z);for(let i=-2;i<=2;i++)b.box(.03,.008,.008,0xffffff,x,y+.065,z+i*.016)},
  /* 35 Bowling Pin */ (b,x,y,z)=>{b.sph(.06,0xffffff,x,y,z,1,1.35,1,12);b.cyl(.03,.045,.08,0xffffff,x,y+.09,z,0,0,0,10);b.sph(.042,0xffffff,x,y+.16,z,1,1.1,1,10);for(const h of[.1,.115])b.tor(.031,.006,0xd8262f,x,y+h,z,Math.PI/2,0,0)},
  /* 36 Satellite Dish */ (b,x,y,z)=>{b.box(.03,.08,.03,0x8a93a8,x,y,z);b.add(new THREE.SphereGeometry(.13,16,8),0xe6e9ef,x,y+.1,z-.02,-.75,0,0,1,.26,1);b.tor(.128,.008,0x9aa3b0,x,y+.1,z-.02,Math.PI/2-.75,0,0);
    b.cyl(.006,.006,.12,0x8a93a8,x,y+.12,z+.03,-.75,0,0,5);b.sph(.018,0xd8262f,x,y+.16,z+.07,1,1,1,6)}
];
const HATS=[null,
  /* 1 Traffic Cone */ (b,y,z)=>{b.box(.56,.04,.56,0xff7a1f,0,y+.02,z);b.cyl(.05,.24,.58,0xff7a1f,0,y+.33,z,0,0,0,14);b.cyl(.125,.165,.12,0xffffff,0,y+.33,z,0,0,0,14)},
  /* 2 Top Hat */ (b,y,z,ac)=>{b.cyl(.36,.36,.035,0x22232b,0,y+.02,z,0,0,0,18);b.cyl(.23,.21,.42,0x22232b,0,y+.24,z,0,0,0,18);b.cyl(.218,.218,.09,ac,0,y+.09,z,0,0,0,18)},
  /* 3 Crown */ (b,y,z)=>{b.cyl(.27,.24,.16,0xffd23f,0,y+.08,z,0,0,0,10,true);b.cyl(.25,.25,.02,0xc98a12,0,y+.01,z,0,0,0,10);for(let i=0;i<5;i++){const a=i/5*TAU;b.add(new THREE.ConeGeometry(.07,.2,4),0xffd23f,Math.cos(a)*.24,y+.25,z+Math.sin(a)*.24);b.sph(.035,0xd93636,Math.cos(a)*.255,y+.09,z+Math.sin(a)*.255);b.sph(.03,0xffffff,Math.cos(a)*.24,y+.36,z+Math.sin(a)*.24)}},
  /* 4 Propeller Beanie */ (b,y,z)=>{b.sph(.27,0xd93636,0,y,z,1,.75,1);b.cyl(.275,.275,.05,0x2e7bff,0,y+.025,z,0,0,0,16);b.cyl(.015,.015,.12,0xffd23f,0,y+.25,z);b.box(.46,.015,.07,0xffd23f,0,y+.3,z,0,.5,0);b.sph(.03,0xffd23f,0,y+.31,z)},
  /* 5 Cowboy Hat */ (b,y,z)=>{b.cyl(.47,.47,.03,0x8a5a36,0,y+.02,z,0,0,0,18);for(const s of[-1,1])b.box(.1,.03,.66,0x8a5a36,s*.44,y+.07,z,0,0,s*.6);b.cyl(.17,.22,.3,0x8a5a36,0,y+.18,z,0,0,0,14);b.cyl(.225,.225,.05,0xe8c9a0,0,y+.07,z,0,0,0,14);b.box(.3,.04,.12,0x6b4428,0,y+.33,z)},
  /* 6 Chef Hat */ (b,y,z)=>{b.cyl(.2,.2,.26,0xffffff,0,y+.13,z,0,0,0,14);for(let i=0;i<6;i++){const a=i/6*TAU;b.sph(.14,0xffffff,Math.cos(a)*.15,y+.33,z+Math.sin(a)*.15)}b.sph(.17,0xffffff,0,y+.38,z)},
  // ---- second wave (Nov 2026)
  /* 7 Pirate Tricorn */ (b,y,z)=>{b.cyl(.37,.37,.02,0x2a2440,0,y+.01,z,0,0,0,3);b.sph(.2,0x2a2440,0,y+.06,z,1,.8,1);
    for(let i=0;i<3;i++){const a1=i/3*TAU,a2=(i+1)/3*TAU,R=.36,x1=Math.sin(a1)*R,z1=Math.cos(a1)*R,x2=Math.sin(a2)*R,z2=Math.cos(a2)*R,L=Math.hypot(x2-x1,z2-z1),ry=Math.atan2(-(z2-z1),x2-x1);
      for(const [h,c,dz] of[[.25,0xe0b040,-.012],[.23,0x2a2440,0]]){const sh=new THREE.Shape();sh.moveTo(-L/2,0);sh.lineTo(L/2,0);sh.lineTo(L/2,h*.25);sh.quadraticCurveTo(0,h*1.75,-L/2,h*.25);sh.closePath();   // a brim turned up: tall in the middle, low at the corners
        const g=new THREE.ExtrudeGeometry(sh,{depth:.025,bevelEnabled:false,curveSegments:8});g.translate(0,0,dz-.0125);b.add(g,c,(x1+x2)/2*.96,y+.01,z+(z1+z2)/2*.96,0,ry,0)}}
    b.sph(.035,0xd8262f,.12,y+.24,z-.1,1,3.2,1)},
  /* 8 Fedora */ (b,y,z)=>{b.cyl(.38,.38,.03,0x2e2a40,0,y+.02,z,0,0,0,18);b.cyl(.2,.23,.24,0x3a3550,0,y+.15,z,0,0,0,14);b.cyl(.235,.235,.06,0x15161c,0,y+.06,z,0,0,0,14);b.box(.05,.03,.3,0x2e2a40,0,y+.27,z)},
  /* 9 Football Helmet */ (b,y,z,ac)=>{b.sph(.3,ac,0,y+.06,z,1,.82,1.1);b.tor(.25,.025,0xffffff,0,y+.06,z,0,Math.PI/2,0);for(const h of[.0,.08])b.box(.42,.022,.022,0xc8d2dc,0,y+h,z+.34);b.box(.022,.12,.022,0xc8d2dc,0,y+.04,z+.35)},
  /* 10 Captain's Cap */ (b,y,z)=>{b.cyl(.26,.25,.12,0xffffff,0,y+.06,z,0,0,0,16);b.cyl(.32,.3,.05,0xffffff,0,y+.14,z,0,0,0,16);b.cyl(.262,.262,.04,0x15161c,0,y+.04,z,0,0,0,16);b.box(.34,.02,.16,0x15161c,0,y+.03,z+.3);b.sph(.035,0xe0b040,0,y+.08,z+.26,1,1,.5)},
  /* 11 Robot Dome */ (b,y,z)=>{b.sph(.24,0xb8bccf,0,y,z,1,.75,1);b.cyl(.25,.25,.05,0x6b7280,0,y+.02,z,0,0,0,16);b.box(.3,.06,.05,0x3fd2ff,0,y+.1,z+.2);for(const s of[-1,1]){b.cyl(.008,.008,.16,0x6b7280,s*.1,y+.26,z-.04,0,0,0,5);b.sph(.025,0xff3b3b,s*.1,y+.34,z-.04)}},
  /* 12 Ref Cap */ (b,y,z)=>{b.sph(.24,0x14161f,0,y,z,1,.6,1);for(const x of[-.12,0,.12])b.box(.03,.12,.42,0xf6f6f6,x,y+.08,z,0,0,0);b.box(.3,.02,.2,0x14161f,0,y+.02,z+.3);b.sph(.03,0x14161f,0,y+.15,z)}
];
function extras(inner,K,o){
  const tp=TOPPERS[K[3]],ht=HATS[K[4]];if(!tp&&!ht)return;
  const A=anchor(inner,o.body),b=Build();
  if(ht)ht(b,A.top-.02,A.tz,o.aHex);
  if(tp){b.cyl(.012,.02,.72,0xc8d2dc,A.ax,A.ay+.34,A.az,0,0,0,5);tp(b,A.ax,A.ay+.76,A.az,o.aHex)}
  const m=b.mesh(extraMat(o.gl));m.castShadow=true;inner.add(m);
}
// wheels: [tyre, hub, spokes] shapes and their materials. The shapes are shared by every car (never disposed).
let wg=null;
function wheelGeo(){
  if(wg)return wg;
  const sp=(n,w,l,t)=>G.joinGeoms(Array.from({length:n},(_,k)=>{const g=new THREE.BoxGeometry(w,l,t);g.translate(0,l/2,0);return[g,new THREE.Matrix4().makeRotationX(k*TAU/n)]}));
  const disc=new THREE.CylinderGeometry(.3,.3,.29,22);disc.rotateZ(Math.PI/2);
  wg={five:sp(5,.31,.33,.075),cross:sp(4,.31,.34,.15),disc};
  for(const k in wg)G.SHARED_G.add(wg[k]);
  return wg;
}
const _wm={};
const WHEELS=[null,
  /* 1 Five Spoke */ o=>({g:[G.wheelG,G.hubCapG,wheelGeo().five],m:[o.mT,o.mR,o.mD]}),
  /* 2 Discs */ o=>({g:[G.wheelG,wheelGeo().disc,G.spokesG],m:[o.mT,o.mR,o.mR]}),
  /* 3 Cross */ o=>({g:[G.wheelG,G.hubCapG,wheelGeo().cross],m:[o.mT,o.mR,o.mD]}),
  /* 4 Gold Rims */ o=>{const k=o.gl?'g':'l',gold=_wm[k]||(_wm[k]=o.gl?new THREE.MeshStandardMaterial({color:0xffc83a,roughness:.25,metalness:.9,envMap:G.stadiumEnv(),envMapIntensity:1}):new THREE.MeshLambertMaterial({color:0xffc83a}));return{g:[G.wheelG,G.hubCapG,wheelGeo().five],m:[o.mT,gold,gold]}},
  // ---- second wave (Nov 2026)
  /* 5 Black Chrome */ o=>{const k=o.gl?'bg':'bl',dk=_wm[k]||(_wm[k]=o.gl?new THREE.MeshStandardMaterial({color:0x3a3c46,roughness:.18,metalness:.95,envMap:G.stadiumEnv(),envMapIntensity:1}):new THREE.MeshLambertMaterial({color:0x5a5f6e}));return{g:[G.wheelG,G.hubCapG,wheelGeo().five],m:[o.mT,dk,dk]}}
];
function wheel(no,o){return WHEELS[no]?WHEELS[no](o):null}
// engine sounds: the numbers index.html's audioTick builds the driver's engine tone from (type of wave, pitch at rest
// and per unit of speed for the main and the lower tone, the filter's cut-off, and loudness). Yours only.
const ENGINES=[null,
  /* 1 Purr */ {type:'triangle',f0:30,fk:2,s0:15,sk:1,c0:420,ck:30,g:1.6},
  /* 2 Buzz */ {type:'sawtooth',f0:72,fk:5.2,s0:36,sk:2.6,c0:620,ck:42,g:.7},
  /* 3 Rumble */ {type:'square',f0:26,fk:1.5,s0:13,sk:.75,c0:170,ck:13,g:1.1},
  /* 4 Whirr */ {type:'sine',f0:110,fk:9,s0:55,sk:4.5,c0:1500,ck:60,g:1.7}
];
function engine(){return ENGINES[cur[6]]||null}

// =====================================================================
//  Sprites: the little pictures that trails and goal explosions are made of
// =====================================================================
// One Points object holds a fixed pool of sprites; each is a square that always faces the camera and shows one cell of
// a single 512 x 512 sheet of shapes drawn below (a glow, a ring, a heart, a duck, ...), tinted, turned and faded per
// sprite. It is one draw call however many are alive, and none while nothing is (the object is hidden). Positions,
// speeds and ages live in typed arrays made once, so emitting allocates nothing.
// The first TRAIL_SLOTS x TRAIL_MAX sprites belong to boost trails, a fixed share per car; the rest to goal explosions.
const CELL={glow:0,disc:1,ring:2,bubble:3,spark:4,star:5,heart:6,note:7,square:8,flake:9,leaf:10,feather:11,duck:12,popcorn:13,toast:14,bill:15,batA:16,batB:17,zero:18,one:19,drop:20,zap:21,flame:22,birdA:23,birdB:24,candy:25,strip:26,shard:27,puff:28,coin:29,notes:30,seed:31,rainbow:32,splat:33,ice:34,rock:35,
  soccer:36,basket:37,tennis:38,puck:39,gem:40,paw:41,plane:42,gear:43,nut:44,pizza:45,blossom:46,ghost:47,balloon:48};
let sheetTex=null;
function sheet(){
  if(sheetTex)return sheetTex;
  const cv=document.createElement('canvas');cv.width=cv.height=512;const g=cv.getContext('2d'),W='#fff',K='#14161f';
  const cell=(i,fn)=>{g.save();g.translate((i%8)*64+32,Math.floor(i/8)*64+32);g.beginPath();g.rect(-31,-31,62,62);g.clip();g.scale(27,27);g.lineJoin='round';g.lineCap='round';fn();g.restore()};
  const fill=c=>{g.fillStyle=c;g.fill()},stroke=(c,w)=>{g.strokeStyle=c;g.lineWidth=w;g.stroke()},circ=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,TAU)};
  cell(0,()=>{const gr=g.createRadialGradient(0,0,0,0,0,1);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(-1,-1,2,2)});
  cell(1,()=>{circ(0,0,.86);fill(W)});
  cell(2,()=>{circ(0,0,.74);stroke(W,.2)});
  cell(3,()=>{circ(0,0,.82);fill('rgba(255,255,255,.16)');stroke(W,.09);g.beginPath();g.arc(0,0,.58,Math.PI*1.1,Math.PI*1.55);stroke(W,.13);circ(.3,.34,.08);fill(W)});
  cell(4,()=>{starPath(g,0,0,.95,4,.2,0);fill(W)});
  cell(5,()=>{starPath(g,0,0,.92,5,.42,-Math.PI/2);fill(W)});
  cell(6,()=>{g.beginPath();g.moveTo(0,.82);g.bezierCurveTo(-1.25,-.05,-.72,-.98,0,-.38);g.bezierCurveTo(.72,-.98,1.25,-.05,0,.82);fill(W)});
  cell(7,()=>{g.beginPath();g.ellipse(-.3,.55,.36,.27,-.4,0,TAU);fill(W);g.beginPath();g.moveTo(.02,.5);g.lineTo(.02,-.8);g.lineTo(.6,-.5);g.lineTo(.6,-.15);g.lineTo(.02,-.42);stroke(W,.16);g.fill()});
  cell(8,()=>{g.fillStyle=W;g.fillRect(-.7,-.7,1.4,1.4)});
  cell(9,()=>{for(let i=0;i<6;i++){g.save();g.rotate(i*Math.PI/3);g.beginPath();g.moveTo(0,0);g.lineTo(0,-.9);g.moveTo(0,-.5);g.lineTo(-.24,-.74);g.moveTo(0,-.5);g.lineTo(.24,-.74);stroke(W,.12);g.restore()}});
  cell(10,()=>{g.beginPath();g.moveTo(-.9,0);g.bezierCurveTo(-.35,.62,.45,.5,.9,0);g.bezierCurveTo(.45,-.5,-.35,-.62,-.9,0);fill(W);g.beginPath();g.moveTo(-.95,0);g.lineTo(.7,0);stroke('rgba(0,0,0,.35)',.07)});
  cell(11,()=>{g.beginPath();g.moveTo(-.9,.1);g.bezierCurveTo(-.4,-.55,.5,-.5,.92,-.05);g.bezierCurveTo(.4,.5,-.3,.5,-.9,.1);fill(W);g.beginPath();g.moveTo(-.95,.12);g.quadraticCurveTo(0,-.1,.9,-.05);stroke('rgba(120,130,150,.8)',.06);for(let i=0;i<5;i++){g.beginPath();g.moveTo(-.5+i*.28,0);g.lineTo(-.38+i*.28,.3);stroke('rgba(120,130,150,.5)',.04)}});
  cell(12,()=>{g.beginPath();g.ellipse(-.1,.3,.72,.48,0,0,TAU);fill('#ffd23f');circ(.38,-.28,.38);fill('#ffd23f');g.beginPath();g.moveTo(.68,-.3);g.lineTo(1,-.2);g.lineTo(.68,-.08);g.closePath();fill('#ff8a1f');circ(.46,-.36,.07);fill(K);g.beginPath();g.moveTo(-.8,.1);g.lineTo(-.98,-.2);g.lineTo(-.55,0);fill('#ffd23f');g.beginPath();g.ellipse(-.15,.34,.34,.2,-.2,0,TAU);fill('#f2b21f')});
  cell(13,()=>{for(const [x,y,r] of[[-.3,-.2,.42],[.3,-.25,.4],[0,.25,.46],[-.42,.3,.3],[.45,.25,.3]]){circ(x,y,r);fill('#fff6da')}circ(0,0,.2);fill('#ffd23f');circ(-.3,-.25,.1);fill('#fff');circ(.3,.2,.1);fill('#f2dfa0')});
  cell(14,()=>{g.beginPath();g.moveTo(-.62,.75);g.lineTo(-.62,-.2);g.bezierCurveTo(-1,-.6,-.4,-.95,0,-.72);g.bezierCurveTo(.4,-.95,1,-.6,.62,-.2);g.lineTo(.62,.75);g.closePath();fill('#8a5a2a');g.save();g.scale(.82,.82);g.beginPath();g.moveTo(-.62,.75);g.lineTo(-.62,-.2);g.bezierCurveTo(-1,-.6,-.4,-.95,0,-.72);g.bezierCurveTo(.4,-.95,1,-.6,.62,-.2);g.lineTo(.62,.75);g.closePath();fill('#e8b96a');g.restore();g.fillStyle='#ffe08a';g.fillRect(-.26,-.12,.52,.46)});
  cell(15,()=>{g.fillStyle='#2f9a5e';g.fillRect(-.92,-.5,1.84,1);g.fillStyle='#7be0a0';g.fillRect(-.82,-.4,1.64,.8);circ(0,0,.28);fill('#2f9a5e');starPath(g,0,0,.2,5,.45,-Math.PI/2);fill('#d8ffe6');for(const x of[-.62,.62]){circ(x,0,.1);fill('#2f9a5e')}});
  const bat=(up)=>{g.beginPath();g.ellipse(0,0,.2,.3,0,0,TAU);fill(W);g.beginPath();g.moveTo(-.12,-.25);g.lineTo(-.2,-.5);g.lineTo(-.02,-.3);g.moveTo(.12,-.25);g.lineTo(.2,-.5);g.lineTo(.02,-.3);fill(W);for(const s of[-1,1]){g.beginPath();g.moveTo(s*.15,-.1);g.quadraticCurveTo(s*.6,up?-.75:-.1,s*.96,up?-.4:.35);g.quadraticCurveTo(s*.78,up?-.2:.3,s*.66,up?.1:.55);g.quadraticCurveTo(s*.5,up?-.05:.25,s*.38,up?.22:.45);g.quadraticCurveTo(s*.3,.05,s*.15,.15);g.closePath();fill(W)}};
  cell(16,()=>bat(1));cell(17,()=>bat(0));
  cell(18,()=>{g.beginPath();g.ellipse(0,0,.42,.7,0,0,TAU);stroke(W,.24)});
  cell(19,()=>{g.beginPath();g.moveTo(-.3,-.4);g.lineTo(.05,-.72);g.lineTo(.05,.72);g.moveTo(-.35,.72);g.lineTo(.45,.72);stroke(W,.24)});
  cell(20,()=>{g.beginPath();g.moveTo(0,-.92);g.bezierCurveTo(.15,-.3,.62,0,.62,.38);g.arc(0,.38,.62,0,Math.PI);g.bezierCurveTo(-.62,0,-.15,-.3,0,-.92);fill(W);g.beginPath();g.arc(-.05,.4,.36,Math.PI*.6,Math.PI*1.05);stroke('rgba(255,255,255,.0)',.1)});
  cell(21,()=>{g.beginPath();g.moveTo(.2,-.95);g.lineTo(-.45,.05);g.lineTo(.02,.05);g.lineTo(-.25,.95);g.lineTo(.5,-.18);g.lineTo(.02,-.18);g.closePath();fill(W)});
  cell(22,()=>{g.beginPath();g.moveTo(0,-.95);g.bezierCurveTo(.2,-.4,.7,-.1,.55,.4);g.bezierCurveTo(.45,.85,-.45,.85,-.55,.4);g.bezierCurveTo(-.65,.05,-.3,-.1,-.25,-.45);g.bezierCurveTo(-.1,-.3,-.05,-.6,0,-.95);fill(W)});
  const bird=(up)=>{g.beginPath();g.ellipse(0,.05,.4,.2,0,0,TAU);fill(W);circ(.4,-.05,.17);fill(W);g.beginPath();g.moveTo(.55,-.07);g.lineTo(.82,0);g.lineTo(.55,.06);fill('#ffb347');g.beginPath();g.moveTo(-.35,.05);g.lineTo(-.8,-.1);g.lineTo(-.75,.2);fill(W);g.beginPath();g.moveTo(-.2,0);g.quadraticCurveTo(-.1,up?-.95:.3,.3,up?-.8:.75);g.quadraticCurveTo(.2,up?-.3:.3,.2,0);fill(W);circ(.45,-.09,.04);fill(K)};
  cell(23,()=>bird(1));cell(24,()=>bird(0));
  cell(25,()=>{g.beginPath();g.ellipse(0,0,.42,.36,0,0,TAU);fill(W);for(const s of[-1,1]){g.beginPath();g.moveTo(s*.4,0);g.lineTo(s*.9,-.36);g.lineTo(s*.9,.36);g.closePath();fill(W)}g.save();circ(0,0,.42);g.clip();for(let i=-2;i<3;i++){g.beginPath();g.moveTo(i*.3-.2,-.5);g.lineTo(i*.3+.2,.5);stroke('rgba(0,0,0,.28)',.1)}g.restore()});
  cell(26,()=>{g.fillStyle=W;g.fillRect(-.85,-.32,1.7,.64)});
  cell(27,()=>{g.beginPath();g.moveTo(-.1,-.9);g.lineTo(.75,.5);g.lineTo(-.7,.7);g.closePath();fill(W)});
  cell(28,()=>{for(const [x,y,r] of[[0,0,.6],[-.42,.12,.42],[.42,.1,.44],[.1,-.36,.44],[-.2,.36,.4]]){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.85)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}});
  cell(29,()=>{circ(0,0,.82);fill('#c98a12');circ(0,0,.68);fill('#ffd23f');starPath(g,0,0,.4,5,.45,-Math.PI/2);fill('#c98a12');g.beginPath();g.arc(0,0,.56,Math.PI*1.1,Math.PI*1.5);stroke('#fff2a8',.09)});
  cell(30,()=>{for(const x of[-.45,.4]){g.beginPath();g.ellipse(x-.18,.55,.3,.22,-.4,0,TAU);fill(W)}g.beginPath();g.moveTo(-.36,.5);g.lineTo(-.36,-.7);g.lineTo(.5,-.82);g.lineTo(.5,.48);stroke(W,.14);g.beginPath();g.moveTo(-.36,-.5);g.lineTo(.5,-.62);stroke(W,.22)});
  cell(31,()=>{g.beginPath();g.moveTo(0,-.85);g.bezierCurveTo(.55,-.2,.5,.5,0,.85);g.bezierCurveTo(-.5,.5,-.55,-.2,0,-.85);fill(W)});
  cell(32,()=>{['#ff3b3b','#ff9a2e','#ffe23f','#3fd96b','#3f9bff','#a45cff'].forEach((c,i)=>{g.fillStyle=c;g.fillRect(-.9,-.9+i*.3,1.8,.31)})});
  cell(33,()=>{const r=rng(33);blob(g,0,0,.62,.2,r,12);fill(W);for(let i=0;i<7;i++){const a=i/7*TAU+.3;circ(Math.cos(a)*.78,Math.sin(a)*.74,.1+r()*.08);fill(W)}});
  cell(34,()=>{g.beginPath();g.moveTo(-.15,-.92);g.lineTo(.6,-.1);g.lineTo(.2,.9);g.lineTo(-.6,.3);g.closePath();const gr=g.createLinearGradient(-.6,-.9,.6,.9);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#8fd0ff');fill(gr);g.beginPath();g.moveTo(-.15,-.92);g.lineTo(.2,.9);stroke('rgba(255,255,255,.8)',.06)});
  cell(35,()=>{g.beginPath();g.moveTo(-.7,-.2);g.lineTo(-.2,-.75);g.lineTo(.55,-.5);g.lineTo(.8,.2);g.lineTo(.2,.75);g.lineTo(-.55,.5);g.closePath();fill('#6b5a52');g.beginPath();g.moveTo(-.2,-.75);g.lineTo(.1,0);g.lineTo(.8,.2);g.moveTo(.1,0);g.lineTo(-.55,.5);stroke('#3a302c',.08)});
  // ---- third wave (Nov 2026): sports balls, a puck, a gem, a paw, a paper plane, spare parts, pizza, a blossom, a ghost and a balloon
  cell(36,()=>{circ(0,0,.86);fill('#fafafa');g.save();circ(0,0,.86);g.clip();const pent=(x,y,r,a)=>{g.beginPath();for(let i=0;i<5;i++){const t=a+i*TAU/5;g[i?'lineTo':'moveTo'](x+Math.cos(t)*r,y+Math.sin(t)*r)}g.closePath();fill(K)};
    pent(0,0,.3,-Math.PI/2);for(let i=0;i<5;i++){const t=-Math.PI/2+Math.PI/5+i*TAU/5;pent(Math.cos(t)*.86,Math.sin(t)*.86,.3,t+Math.PI);g.beginPath();g.moveTo(Math.cos(t)*.3,Math.sin(t)*.3);g.lineTo(Math.cos(t)*.6,Math.sin(t)*.6);stroke(K,.06)}g.restore();circ(0,0,.86);stroke('#9aa3b0',.06)});
  cell(37,()=>{circ(0,0,.86);fill('#e8742a');g.save();circ(0,0,.86);g.clip();g.beginPath();g.moveTo(0,-.9);g.lineTo(0,.9);g.moveTo(-.9,0);g.lineTo(.9,0);stroke('#2a1810',.08);for(const s of[-1,1]){g.beginPath();g.arc(s*1.25,0,.85,0,TAU);stroke('#2a1810',.08)}g.restore();g.beginPath();g.arc(-.25,-.3,.45,Math.PI*1.1,Math.PI*1.5);stroke('rgba(255,255,255,.35)',.1)});
  cell(38,()=>{circ(0,0,.8);fill('#d8ff3f');g.save();circ(0,0,.8);g.clip();for(const s of[-1,1]){g.beginPath();g.arc(s*1.15,0,.72,0,TAU);stroke('#ffffff',.11)}g.restore()});
  cell(39,()=>{g.beginPath();g.ellipse(0,.2,.85,.36,0,0,TAU);fill('#14161b');g.fillStyle='#1d2027';g.fillRect(-.85,-.12,1.7,.32);g.beginPath();g.ellipse(0,-.12,.85,.36,0,0,TAU);fill('#2b2f38');g.beginPath();g.ellipse(0,-.12,.85,.36,0,0,TAU);stroke('#5a6070',.05)});
  cell(40,()=>{const P=[[-.8,-.3],[-.48,-.66],[.48,-.66],[.8,-.3],[0,.86]];g.beginPath();P.forEach((p,i)=>g[i?'lineTo':'moveTo'](p[0],p[1]));g.closePath();fill('#e8e8e8');
    g.beginPath();g.moveTo(-.8,-.3);g.lineTo(.8,-.3);g.lineTo(0,.86);g.closePath();fill('#c4c4c4');g.beginPath();g.moveTo(-.28,-.3);g.lineTo(.28,-.3);g.lineTo(0,.86);g.closePath();fill('#f6f6f6');
    g.beginPath();g.moveTo(-.48,-.66);g.lineTo(-.28,-.3);g.lineTo(.28,-.3);g.lineTo(.48,-.66);g.closePath();fill('#ffffff');g.beginPath();P.forEach((p,i)=>g[i?'lineTo':'moveTo'](p[0],p[1]));g.closePath();stroke('#8a8a8a',.05);starPath(g,-.4,-.48,.25,4,.2,0);fill(W)});
  cell(41,()=>{g.beginPath();g.ellipse(0,.3,.42,.36,0,0,TAU);fill(W);for(const [x,y] of[[-.58,-.12],[-.22,-.5],[.22,-.5],[.58,-.12]]){g.beginPath();g.ellipse(x,y,.17,.22,x*.5,0,TAU);fill(W)}});
  cell(42,()=>{g.beginPath();g.moveTo(-.9,.15);g.lineTo(.92,-.2);g.lineTo(-.45,.55);g.closePath();fill(W);g.beginPath();g.moveTo(-.9,.15);g.lineTo(.92,-.2);g.lineTo(-.25,.18);g.closePath();fill('#c8d0dc');g.beginPath();g.moveTo(-.9,.15);g.lineTo(.92,-.2);g.lineTo(-.6,-.12);g.closePath();fill('#e6ebf2')});
  cell(43,()=>{g.fillStyle=W;for(let i=0;i<8;i++){g.save();g.rotate(i*Math.PI/4);g.fillRect(-.14,-.85,.28,.3);g.restore()}circ(0,0,.62);fill(W);circ(0,0,.42);fill('#c8ced8');g.globalCompositeOperation='destination-out';circ(0,0,.2);fill('#000');g.globalCompositeOperation='source-over'});
  cell(44,()=>{g.beginPath();for(let i=0;i<6;i++){const t=i*Math.PI/3;g[i?'lineTo':'moveTo'](Math.cos(t)*.72,Math.sin(t)*.72)}g.closePath();fill('#d6dae2');stroke(W,.08);g.globalCompositeOperation='destination-out';circ(0,0,.3);fill('#000');g.globalCompositeOperation='source-over';circ(0,0,.3);stroke('#9aa3b0',.08)});
  cell(45,()=>{g.beginPath();g.moveTo(0,.9);g.lineTo(-.6,-.55);g.quadraticCurveTo(0,-.78,.6,-.55);g.closePath();fill('#ffd25a');g.beginPath();g.moveTo(-.66,-.5);g.quadraticCurveTo(0,-.95,.66,-.5);stroke('#d99a4a',.22);
    for(const [x,y] of[[-.18,-.25],[.2,-.2],[0,.25],[-.05,-.6]]){circ(x,y,.14);fill('#c0392b')}for(const [x,y] of[[.15,.05],[-.25,.0]]){circ(x,y,.05);fill('#3e8a2e')}});
  cell(46,()=>{for(let i=0;i<5;i++){g.save();g.rotate(i*TAU/5);g.beginPath();g.ellipse(0,-.48,.3,.44,0,0,TAU);fill(W);g.beginPath();g.moveTo(-.06,-.9);g.lineTo(0,-.78);g.lineTo(.06,-.9);stroke('rgba(0,0,0,.25)',.05);g.restore()}circ(0,0,.2);fill('#fff3a0')});
  cell(47,()=>{g.beginPath();g.moveTo(-.6,.75);g.lineTo(-.6,-.1);g.arc(0,-.1,.6,Math.PI,TAU);g.lineTo(.6,.75);for(let i=0;i<4;i++){const x=.6-(i+.5)*.3;g.quadraticCurveTo(x+.08,.55,x,.75);g.quadraticCurveTo(x-.08,.95,x-.15,.75)}g.closePath();fill(W);
    for(const s of[-1,1]){g.beginPath();g.ellipse(s*.2,-.15,.09,.14,0,0,TAU);fill(K)}g.beginPath();g.ellipse(0,.2,.1,.13,0,0,TAU);fill(K)});
  cell(48,()=>{g.beginPath();g.ellipse(0,-.2,.56,.68,0,0,TAU);fill('#e2e2e2');g.beginPath();g.ellipse(-.2,-.45,.14,.22,-.4,0,TAU);fill(W);g.beginPath();g.moveTo(-.08,.5);g.lineTo(.08,.5);g.lineTo(0,.42);fill('#e2e2e2');g.beginPath();g.moveTo(0,.5);g.quadraticCurveTo(.2,.7,0,.95);stroke(W,.05)});
  sheetTex=new THREE.CanvasTexture(cv);sheetTex.flipY=false;sheetTex.generateMipmaps=false;sheetTex.minFilter=THREE.LinearFilter;
  return sheetTex;
}
// What a sprite does after it is emitted. add: 1 glows (adds light), 0 is solid. grav pulls it down (negative floats
// up), drag slows it, spin turns it, grow changes its size over its life (1 doubles it, -1 shrinks it to nothing),
// bounce is how much speed it keeps off the floor (0 stops there), wob makes it sway, flap swaps between two cells,
// fade: 0 fades out steadily, 1 holds then fades at the end, 2 twinkles. rot: a fixed angle (else any).
const O=(o)=>Object.assign({add:0,grav:0,drag:0,spin:0,grow:0,bounce:-1,wob:0,flap:0,fade:1,a:1,rot:null},o);
function Sprites(n,parent,renderer,camera){
  const pos=new Float32Array(n*3),col=new Float32Array(n*4),misc=new Float32Array(n*4),vel=new Float32Array(n*3),
    life=new Float32Array(n),max=new Float32Array(n),size=new Float32Array(n),rgb=new Float32Array(n*3),seed=new Float32Array(n),spin=new Float32Array(n),cell0=new Float32Array(n),beh=new Array(n).fill(null);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aCol',new THREE.BufferAttribute(col,4));geo.setAttribute('aMisc',new THREE.BufferAttribute(misc,4));
  const mat=new THREE.ShaderMaterial({
    uniforms:{uMap:{value:sheet()},uScale:{value:400},uMax:{value:120}},
    vertexShader:'attribute vec4 aCol,aMisc;uniform float uScale,uMax;varying vec4 vCol;varying vec3 vM;void main(){vCol=aCol;vM=aMisc.yzw;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=aCol.a<=0.?0.:min(aMisc.x*1.3*uScale/max(.1,-mv.z),uMax);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform sampler2D uMap;varying vec4 vCol;varying vec3 vM;void main(){vec2 p=gl_PointCoord-.5;float c=cos(vM.y),s=sin(vM.y);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)*1.3;if(abs(p.x)>.49||abs(p.y)>.49)discard;'+
      'float k=floor(vM.x+.5);vec4 t=texture2D(uMap,(vec2(mod(k,8.),floor(k/8.))+p+.5)/8.);float a=t.a*vCol.a;if(a<.012)discard;gl_FragColor=vec4(t.rgb*vCol.rgb*a,a*(1.-vM.z));}',
    transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor
  });
  const pts=new THREE.Points(geo,mat);pts.frustumCulled=false;pts.visible=false;pts.renderOrder=5;parent.add(pts);
  let alive=0,clock=0;const _c=new THREE.Color();
  const S={n,pts,floor:.14,
    // R is the share of the pool to use: {lo, hi, i}
    emit(R,x,y,z,vx,vy,vz,lf,sz,cell,hex,o){
      const i=R.i;R.i=i+1>=R.hi?R.lo:i+1;const j=i*3;
      pos[j]=x;pos[j+1]=y;pos[j+2]=z;vel[j]=vx;vel[j+1]=vy;vel[j+2]=vz;life[i]=max[i]=lf;size[i]=sz;cell0[i]=cell;beh[i]=o;
      _c.setHex(hex);rgb[j]=_c.r;rgb[j+1]=_c.g;rgb[j+2]=_c.b;seed[i]=Math.random()*TAU;spin[i]=o.spin*(Math.random()<.5?-1:1)*(.5+Math.random()*.5);
      misc[i*4+2]=o.rot==null?Math.random()*TAU:o.rot;misc[i*4+3]=o.add;alive++;pts.visible=true;
    },
    update(dt,cam){
      if(!pts.visible)return;
      clock+=dt;let live=0;const fl=S.floor;
      for(let i=0;i<n;i++){
        if(life[i]<=0)continue;
        const o=beh[i],j=i*3,k=i*4;
        if((life[i]-=dt)<=0){col[k+3]=0;continue}
        live++;
        const age=1-life[i]/max[i];
        if(o.drag){const d=Math.exp(-o.drag*dt);vel[j]*=d;vel[j+1]*=d;vel[j+2]*=d}
        vel[j+1]-=o.grav*dt;
        if(o.wob){const w=Math.cos(seed[i]+clock*4.2)*o.wob*dt;pos[j]+=w*Math.cos(seed[i]*3);pos[j+2]+=w*Math.sin(seed[i]*3);pos[j+1]+=Math.sin(seed[i]*2+clock*5)*o.wob*.4*dt}
        pos[j]+=vel[j]*dt;pos[j+1]+=vel[j+1]*dt;pos[j+2]+=vel[j+2]*dt;
        if(o.bounce>=0&&pos[j+1]<fl){pos[j+1]=fl;if(vel[j+1]<0){vel[j+1]*=-o.bounce;vel[j]*=.7;vel[j+2]*=.7;spin[i]*=.6;if(o.bounce===0){vel[j]=vel[j+2]=0;spin[i]=0}}}
        misc[k+2]+=spin[i]*dt;
        misc[k]=size[i]*Math.max(0,1+o.grow*age);misc[k+1]=o.flap?cell0[i]+(Math.floor(clock*o.flap+seed[i])&1):cell0[i];
        col[k]=rgb[j];col[k+1]=rgb[j+1];col[k+2]=rgb[j+2];
        col[k+3]=o.a*(o.fade===0?1-age:o.fade===2?Math.sin(age*Math.PI)*(.55+.45*Math.sin(seed[i]*9+clock*26)):Math.min(1,age*14,(1-age)*4));
      }
      alive=live;
      geo.attributes.position.needsUpdate=geo.attributes.aCol.needsUpdate=geo.attributes.aMisc.needsUpdate=true;
      cam=cam||camera;mat.uniforms.uScale.value=renderer.domElement.height/(2*Math.tan(cam.fov*Math.PI/360))*(cam.zoom||1);
      if(!live)pts.visible=false;
    },
    clear(lo,hi){for(let i=lo;i<hi;i++){life[i]=0;col[i*4+3]=0}geo.attributes.aCol.needsUpdate=true},
    get alive(){return alive},cap(v){mat.uniforms.uMax.value=v}
  };
  return S;
}

// =====================================================================
//  Boost trails
// =====================================================================
// A trail replaces the boost flame with sprites from the pool above. Each car has its own fixed share of the pool,
// TRAIL_MAX sprites, used round and round, so one car can never use up another's and the cost has a ceiling; on Fast
// and on phones a trail emits six tenths as often with slightly larger sprites. Trails are short (about a second at most),
// narrower than the ball and mostly see-through or small, so they cannot hide it (README has the measurement).
// In item-number order (cosmetics.js: boostball trail 1, 2, 3, ...). rate: sprites a second; life: seconds each lasts;
// size: [smallest, largest] in car units; back: how fast they leave the nozzle; inh: how much of the car's speed they
// keep; spread: sideways scatter; up: upward push; w: how wide the nozzle is; o: what they do (see O above).
const TRAIL_SLOTS=8,TRAIL_MAX=48;
const RAINBOW=[0xff3b3b,0xff9a2e,0xffe23f,0x3fd96b,0x3f9bff,0xa45cff];
const TRAILS=[null,
  /* 1 Classic Flame */ {rate:80,life:.32,cells:[CELL.flame,CELL.flame,CELL.glow],cols:[0xffd23f,0xff8a1f,0xff4a1c],size:[.7,1.2],back:9,inh:0.8,spread:1.1,up:.3,w:.22,o:O({add:1,grow:-.6,fade:0,rot:0})},
  /* 2 Blue Plasma */ {rate:90,life:.4,cells:[CELL.glow],cols:[0x8fd6ff,0x2e7bff,0xffffff],size:[.6,1.2],back:7,inh:0.8,spread:.9,up:0,w:.2,o:O({add:1,grow:-.5,fade:0,wob:3})},
  /* 3 Rainbow */ {rate:44,life:.9,cells:[CELL.rainbow],cols:[0xffffff],size:[.95,.95],back:5,inh:0.85,spread:0,up:0,w:0,off:.75,o:O({rot:Math.PI/2,grow:-.25,fade:1,a:.95})},
  /* 4 Lightning */ {rate:70,life:.24,cells:[CELL.zap,CELL.zap,CELL.glow],cols:[0xffe45c,0xffffff,0xbfe4ff],size:[.7,1.4],back:5,inh:0.8,spread:2.6,up:.5,w:.3,o:O({add:1,fade:2})},
  /* 5 Bubbles */ {rate:46,life:1,cells:[CELL.bubble],cols:[0xbdf0ff,0xffffff,0xd9c8ff],size:[.35,.8],back:3,inh:0.7,spread:1.4,up:.6,w:.3,o:O({grav:-1.6,wob:2.5,grow:.3,drag:1})},
  /* 6 Confetti */ {rate:60,life:.75,cells:[CELL.strip,CELL.square],cols:RAINBOW,size:[.3,.5],back:5,inh:0.7,spread:3,up:1.5,w:.3,o:O({grav:7,spin:9,drag:1.2,bounce:0})},
  /* 7 Snowflakes */ {rate:45,life:.95,cells:[CELL.flake],cols:[0xffffff,0xdff3ff],size:[.4,.75],back:3,inh:0.7,spread:1.6,up:.8,w:.3,o:O({grav:1.6,spin:1.5,wob:2,drag:1})},
  /* 8 Autumn Leaves */ {rate:40,life:1,cells:[CELL.leaf],cols:[0xe07a2e,0xc2401c,0xffc23c,0x8a4a1e],size:[.5,.85],back:4,inh:0.7,spread:2,up:1.2,w:.3,o:O({grav:2.6,spin:4,wob:3,drag:1})},
  /* 9 Sparkles */ {rate:60,life:.6,cells:[CELL.spark],cols:[0xffe45c,0xffffff,0xfff2c2],size:[.35,.85],back:2,inh:0.75,spread:1.6,up:.3,w:.35,o:O({add:1,fade:2,rot:0})},
  /* 10 Hearts */ {rate:40,life:.9,cells:[CELL.heart],cols:[0xff5c9a,0xff3b6b,0xffc2dd],size:[.5,.85],back:3,inh:0.75,spread:1.3,up:.8,w:.3,o:O({grav:-1.3,wob:2,grow:.35,rot:0,drag:1})},
  /* 11 Music Notes */ {rate:38,life:1,cells:[CELL.note,CELL.notes],cols:[0xb46cff,0x3ee6ff,0xffd23f,0xff5c9a,0xffffff],size:[.6,.9],back:3.5,inh:0.75,spread:1.2,up:.8,w:.3,o:O({grav:-1,wob:5,rot:0,drag:1})},
  /* 12 Pixel Blocks */ {rate:60,life:.6,cells:[CELL.square],cols:[0x46e39a,0x3ee6ff,0xffffff,0x2fa8ff],size:[.3,.55],back:4,inh:0.78,spread:1.7,up:.4,w:.3,o:O({rot:0,grow:-.5})},
  /* 13 Smoke Rings */ {rate:16,life:1.1,cells:[CELL.ring],cols:[0xdadfea,0xaeb6c2],size:[.7,.8],back:4,inh:0.7,spread:0,up:.2,w:0,o:O({grow:2,a:.8,drag:1.5,fade:0})},
  /* 14 Slime */ {rate:55,life:.75,cells:[CELL.drop,CELL.disc],cols:[0x6edb5a,0x9cf070,0x2e8a2e],size:[.3,.6],back:4,inh:0.75,spread:1.5,up:1,w:.25,o:O({grav:13,rot:0,bounce:0})},
  /* 15 Lava */ {rate:60,life:.7,cells:[CELL.drop,CELL.glow],cols:[0xff7a2e,0xffd23f,0xff3b1c],size:[.35,.75],back:5,inh:0.75,spread:1.5,up:1.2,w:.25,o:O({add:1,grav:11,rot:0,bounce:.2})},
  /* 16 Stardust */ {rate:50,life:.95,cells:[CELL.star,CELL.glow,CELL.spark],cols:[0xb8a6ff,0xffffff,0x8fd6ff,0xff9af0],size:[.4,.95],back:1.5,inh:0.7,spread:1.3,up:.2,w:.35,o:O({add:1,fade:2,spin:1})},
  /* 17 Popcorn */ {rate:36,life:.9,cells:[CELL.popcorn],cols:[0xffffff],size:[.5,.75],back:4,inh:0.7,spread:3,up:4,w:.25,o:O({grav:13,spin:9,bounce:.4})},
  /* 18 Rubber Ducks */ {rate:18,life:1.3,cells:[CELL.duck],cols:[0xffffff],size:[.9,1.1],back:3,inh:0.75,spread:1.6,up:3.5,w:.2,o:O({grav:10,bounce:.55,rot:0,spin:.8})},
  /* 19 Feathers */ {rate:30,life:1.2,cells:[CELL.feather],cols:[0xffffff,0xeef2ff],size:[.6,.9],back:3,inh:0.7,spread:1.5,up:1,w:.3,o:O({grav:1.3,wob:4,spin:2,drag:1.2})},
  /* 20 Soap Suds */ {rate:70,life:.65,cells:[CELL.disc,CELL.bubble,CELL.disc],cols:[0xffffff,0xeaf6ff],size:[.2,.5],back:3,inh:0.75,spread:1.2,up:.3,w:.35,o:O({grav:-.6,a:.85,drag:2})},
  /* 21 Ink */ {rate:50,life:.8,cells:[CELL.splat,CELL.disc,CELL.splat],cols:[0x1b1030,0x3b2a6e,0x1b1030,0x8a6cff],size:[.4,.9],back:3,inh:0.75,spread:1.2,up:.5,w:.25,o:O({grav:5,grow:.6,bounce:0,spin:.5})},
  /* 22 Ones and Zeros */ {rate:50,life:.7,cells:[CELL.zero,CELL.one],cols:[0x46e39a,0xc8ffe0],size:[.45,.6],back:4,inh:0.78,spread:1.6,up:.6,w:.35,o:O({add:1,rot:0,grav:2})},
  /* 23 Bats */ {rate:22,life:1.2,cells:[CELL.batA],cols:[0x9a6ce0,0x6a4a9a],size:[.9,1.2],back:2,inh:0.72,spread:3,up:1.5,w:.3,o:O({grav:-3,wob:6,flap:11,rot:0,drag:.8})},
  /* 24 Toast Slices */ {rate:16,life:1.2,cells:[CELL.toast],cols:[0xffffff],size:[.9,1.1],back:3,inh:0.75,spread:1.5,up:6,w:.2,o:O({grav:12,spin:7,bounce:.3})},
  /* 25 Dollar Bills */ {rate:28,life:1.2,cells:[CELL.bill],cols:[0xffffff],size:[.8,1],back:3,inh:0.7,spread:2.5,up:1.5,w:.3,o:O({grav:2.2,wob:5,spin:3,drag:1.2,bounce:0})},
  /* 26 Water Jet */ {rate:90,life:.45,cells:[CELL.drop,CELL.disc,CELL.glow],cols:[0x5cc8ff,0xffffff,0x9fe0ff],size:[.25,.5],back:14,inh:0.8,spread:.8,up:.6,w:.15,o:O({grav:10,rot:Math.PI,a:.9,bounce:0})},
  /* 27 Laser Beam */ {rate:92,life:.5,cells:[CELL.glow,CELL.glow,CELL.disc],cols:[0xff3048,0xff3048,0xffffff],size:[.55,.6],back:6,inh:0.88,spread:0,up:0,w:0,o:O({add:1,fade:0,grow:-.3}),core:.22},
  // ---- second wave (Nov 2026)
  /* 28 Gold Coins */ {rate:34,life:1,cells:[CELL.coin],cols:[0xffffff],size:[.45,.6],back:3,inh:0.72,spread:2,up:3,w:.25,o:O({grav:12,spin:6,bounce:.5})},
  /* 29 Sea Spray */ {rate:80,life:.55,cells:[CELL.drop,CELL.disc,CELL.bubble],cols:[0x5cc8ff,0xffffff,0xbfe9ff],size:[.25,.55],back:5,inh:0.78,spread:2.2,up:2.5,w:.4,o:O({grav:9,a:.85,bounce:0})},
  /* 30 Circuit Sparks */ {rate:60,life:.55,cells:[CELL.square,CELL.spark],cols:[0x46e39a,0xffd23f,0xc8ffe0],size:[.25,.45],back:4,inh:0.78,spread:1.2,up:.3,w:.3,o:O({add:1,rot:0,fade:2})},
  /* 31 Ticker Tape */ {rate:45,life:1,cells:[CELL.strip],cols:[0xffffff,0xffffff,0xffe9a8],size:[.35,.5],back:3,inh:0.7,spread:2.5,up:1.5,w:.3,o:O({grav:3,spin:6,wob:3,drag:1.2,bounce:0})},
  /* 32 Camera Flashes */ {rate:30,life:.3,cells:[CELL.star,CELL.glow],cols:[0xffffff,0xfff6c8],size:[.5,1.1],back:1.5,inh:0.75,spread:2.5,up:.6,w:.6,o:O({add:1,fade:2,rot:0})},
  // ---- third wave (Nov 2026). Same limits as the others: about a second at most, small or see-through.
  /* 33 Green Flame */ {rate:64,life:.55,cells:[CELL.flame,CELL.flame,CELL.spark,CELL.seed],cols:[0xd8ff8a,0x2fd47a,0xffffff,0x9cff5a],size:[.45,.95],back:4,inh:0.8,spread:.7,up:2.2,w:.3,o:O({add:1,grav:-5,wob:3.5,fade:2,rot:0,grow:-.3})},   // tall flickering tongues that lick upward, with sparks and green embers
  /* 34 Violet Flame */ {rate:70,life:.4,cells:[CELL.flame,CELL.flame,CELL.spark],cols:[0xffb0f8,0xb46cff,0xffffff],size:[.6,1.15],back:7,inh:0.8,spread:.9,up:.9,w:.2,o:O({add:1,grow:-.5,fade:2,rot:0,wob:2.5})},
  /* 35 Afterburner */ {rate:96,life:.26,cells:[CELL.glow,CELL.glow,CELL.disc,CELL.ring],cols:[0x8fd6ff,0xffffff,0xffffff,0xbfe8ff],size:[.45,.8],back:11,inh:0.9,spread:.25,up:0,w:.06,o:O({add:1,grow:-.55,fade:0,rot:0}),core:.3},
  /* 36 Sports Balls */ {rate:14,life:1.2,cells:[CELL.soccer,CELL.basket,CELL.tennis,CELL.soccer],cols:[0xffffff],size:[.45,.55],back:3,inh:0.72,spread:1.6,up:3,w:.2,o:O({grav:12,bounce:.55,spin:5})},
  /* 37 Cannon Smoke */ {rate:34,life:.75,cells:[CELL.puff,CELL.puff,CELL.glow],cols:[0xd0d4dc,0xb4bac6,0xffa040],size:[.5,.85],back:4,inh:0.7,spread:.9,up:.6,w:.25,o:O({a:.75,grow:1.1,drag:2,fade:0})},
  /* 38 Gems */ {rate:28,life:.95,cells:[CELL.gem,CELL.gem,CELL.gem,CELL.spark],cols:[0xff5c9a,0x5cc8ff,0x46e39a,0xffd23f,0xb46cff],size:[.35,.55],back:3,inh:0.72,spread:1.8,up:3,w:.25,o:O({grav:10,spin:4,bounce:.4})},
  /* 39 Paw Prints */ {rate:12,life:.9,cells:[CELL.paw],cols:[0xffffff,0xfff1e0],size:[.45,.55],back:1,inh:0.25,spread:0,up:.2,w:.35,o:O({rot:0,drag:3,a:.9})},
  /* 40 Paper Planes */ {rate:11,life:1.3,cells:[CELL.plane],cols:[0xffffff,0xeaf2ff,0xffe9a8],size:[.6,.8],back:3,inh:0.72,spread:1.2,up:1.5,w:.25,o:O({grav:-.4,wob:3,rot:0,drag:1})},
  /* 41 Spare Parts */ {rate:30,life:1,cells:[CELL.gear,CELL.nut,CELL.gear],cols:[0xc8d2dc,0x9aa3b0,0xffd23f],size:[.3,.5],back:3,inh:0.72,spread:1.8,up:3,w:.25,o:O({grav:13,spin:8,bounce:.45})},
  /* 42 Pizza Slices */ {rate:13,life:1.2,cells:[CELL.pizza],cols:[0xffffff],size:[.45,.55],back:3,inh:0.75,spread:1.5,up:3,w:.2,o:O({grav:11,spin:6,bounce:.3})},
  /* 43 Comet Tail */ {rate:96,life:.5,cells:[CELL.glow,CELL.glow,CELL.star,CELL.spark],cols:[0xfff2c2,0x8fd6ff,0xffffff,0xb8a6ff],size:[.45,.95],back:4,inh:0.92,spread:.35,up:0,w:.08,o:O({add:1,fade:0,grow:-.75})},
  /* 44 Cherry Blossoms */ {rate:34,life:1.1,cells:[CELL.blossom,CELL.blossom,CELL.seed],cols:[0xffc2dd,0xffffff,0xff9ac8],size:[.35,.6],back:3,inh:0.7,spread:1.8,up:1.2,w:.3,o:O({grav:1.6,spin:3,wob:3.5,drag:1})},
  /* 45 Ghosts */ {rate:9,life:1.3,cells:[CELL.ghost],cols:[0xffffff,0xe6f0ff],size:[.55,.7],back:2,inh:0.7,spread:1.2,up:.8,w:.3,o:O({grav:-2,wob:5,rot:0,drag:1,a:.82})},
  /* 46 Pixel Fire */ {rate:70,life:.45,cells:[CELL.square],cols:[0xffd23f,0xff8a1f,0xff3b1c,0xfff2a8],size:[.25,.45],back:6,inh:0.8,spread:1,up:1.5,w:.2,o:O({grav:-4,grow:-.6,rot:0})},
  /* 47 Ice Shards */ {rate:46,life:.6,cells:[CELL.ice,CELL.ice,CELL.flake],cols:[0xffffff,0xbfe4ff,0xe6f6ff],size:[.3,.55],back:4,inh:0.75,spread:1.4,up:1.5,w:.25,o:O({grav:8,spin:6,bounce:.2})},
  /* 48 Hockey Pucks */ {rate:14,life:1.1,cells:[CELL.puck],cols:[0xffffff],size:[.45,.55],back:5,inh:0.6,spread:1.4,up:2.5,w:.2,o:O({grav:14,bounce:.15,rot:0,drag:.4})},
  /* 49 Fire and Ice */ {rate:96,life:.42,cells:[CELL.flame,CELL.ice],cols:[0xff7a1a,0x7fc8ff],size:[.45,.75],back:7,inh:0.85,spread:.2,up:0,w:0,o:O({grow:-.5,fade:0,rot:0}),helix:.45}
];
const _f=new V3(),_r=new V3(),_u=new V3();
// emits what a trail owes for dt seconds from a nozzle at the back of a car at p, facing q, moving at v
function trailEmit(spr,R,st,no,p,q,v,dt,low,wind){
  const d=TRAILS[no];if(!d)return false;
  _f.set(0,0,1).applyQuaternion(q);_r.set(1,0,0).applyQuaternion(q);_u.set(0,1,0).applyQuaternion(q);
  st.acc+=d.rate*(low?.6:1)*dt;let n=Math.floor(st.acc);st.acc-=n;if(n>8)n=8;
  const big=low?1.3:1,off=1.5+(d.off||0);
  for(let i=0;i<n;i++){
    const back=(i+Math.random())/n*dt,s=d.spread;let k=Math.floor(Math.random()*d.cells.length),side=rand(-d.w,d.w),lift=rand(-.05,.15);
    if(d.helix){const h=i&1,a=performance.now()*.014+h*Math.PI-back*14;k=h;side=Math.cos(a)*d.helix;lift=.12+Math.sin(a)*d.helix}   // two strands twisting round each other
    const cell=d.cells[k],hex=d.cols[d.cols.length===d.cells.length?k:Math.floor(Math.random()*d.cols.length)];
    const x=p.x-_f.x*off+_r.x*side+_u.x*lift-v.x*back,y=p.y-_f.y*off+_r.y*side+_u.y*lift-v.y*back,z=p.z-_f.z*off+_r.z*side+_u.z*lift-v.z*back;
    spr.emit(R,x,Math.max(.12,y),z,-_f.x*d.back+v.x*d.inh+rand(-s,s)+_u.x*d.up+wind*-_f.x,-_f.y*d.back+v.y*d.inh+rand(-s,s)*.6+_u.y*d.up,-_f.z*d.back+v.z*d.inh+rand(-s,s)+_u.z*d.up+wind*-_f.z,
      d.life*rand(.75,1),(d.core&&cell===CELL.disc?d.core:rand(d.size[0],d.size[1]))*big,cell,hex,d.o);
  }
  return true;
}
let mainSpr=null;
const slots=[];for(let i=0;i<TRAIL_SLOTS;i++)slots.push({car:null,R:{lo:i*TRAIL_MAX,hi:(i+1)*TRAIL_MAX,i:i*TRAIL_MAX},acc:0,t:0});
const GOAL_MAX=720;
function sprites(){return mainSpr||(mainSpr=Sprites(TRAIL_SLOTS*TRAIL_MAX+GOAL_MAX,G.scene,G.renderer,G.camera))}
let frameNo=0;
function trail(c,dt){
  const no=c.kit&&c.kit[1];if(!TRAILS[no])return false;
  let s=c.kitSlot;
  if(!s||s.car!==c){s=slots.find(x=>!x.car||!x.car.mesh||x.car.kitSlot!==x)||slots.reduce((a,b)=>a.t<b.t?a:b);s.car=c;s.acc=0;c.kitSlot=s}
  s.t=frameNo;
  return trailEmit(sprites(),s.R,s,no,c.pos,c.q,c.vel,dt,G.low(),0);
}
// =====================================================================
//  Goal explosions
// =====================================================================
// A goal explosion is a short set piece (GOALS below, 2 to 3 seconds) played in the goal mouth when its owner scores,
// in place of the plain fireball. Each is built from the sprite pool above plus a few simple models (boxes, balls,
// cones, lofts) welded into one vertex-coloured mesh each, made the first time they are needed and kept, so a goal
// allocates nothing. A Stage is where one plays: a group standing on the goal line and facing the pitch (so +z is
// toward the field and x runs along the goal line), its share of the sprites, a spare ball to act the real one's part
// (the real ball is hidden from the moment it goes in), and a few rings. The main stage is in the arena; the garage
// has a second one for the preview button.
// Fairness and timing: a set piece only plays while the ball is out of play, stays within about 30 units of the
// goal it was scored in (the pitch is 205 long), never lasts beyond 3 seconds (the pause after a goal is 3.5 s before
// the countdown), and is cleared the moment the kickoff is set up, so nothing is left to cover the ball in play.
const GW=G.GW,GH=G.GH,BR=G.BR,BIG=2.4;
const bounceOut=x=>{const n=7.5625,d=2.75;return x<1/d?n*x*x:x<2/d?n*(x-=1.5/d)*x+.75:x<2.5/d?n*(x-=2.25/d)*x+.9375:n*(x-=2.625/d)*x+.984375};
const backOut=x=>{x=clamp(x,0,1);const c=1.70158;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const seg=(t,a,b)=>clamp((t-a)/(b-a),0,1);
let _vc=null;const vcMat=()=>_vc||(_vc=new THREE.MeshLambertMaterial({vertexColors:true}));
const glowMat=(hex,op,side)=>new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,side:side||THREE.DoubleSide});
// collects simple shapes, each with a colour, and welds them into one mesh
function Build(){
  const L=[],e=new THREE.Euler(),qq=new THREE.Quaternion(),pp=new V3(),ss=new V3();
  const add=(geo,col,x,y,z,rx,ry,rz,sx,sy,sz)=>{qq.setFromEuler(e.set(rx||0,ry||0,rz||0));L.push([geo,new THREE.Matrix4().compose(pp.set(x||0,y||0,z||0),qq,ss.set(sx||1,sy||sx||1,sz||sx||1)),col])};
  return{add,
    box:(w,h,d,col,x,y,z,rx,ry,rz)=>add(new THREE.BoxGeometry(w,h,d),col,x,y,z,rx,ry,rz),
    sph:(r,col,x,y,z,sx,sy,sz,sg)=>add(new THREE.SphereGeometry(r,sg||14,sg?Math.ceil(sg*.7):10),col,x,y,z,0,0,0,sx,sy,sz),
    cyl:(rt,rb,h,col,x,y,z,rx,ry,rz,sg,open)=>add(new THREE.CylinderGeometry(rt,rb,h,sg||14,1,!!open),col,x,y,z,rx,ry,rz),
    tor:(R,r,col,x,y,z,rx,ry,rz)=>add(new THREE.TorusGeometry(R,r,6,22),col,x,y,z,rx,ry,rz),
    mesh:mat=>new THREE.Mesh(G.joinGeoms(L),mat||vcMat())};
}
function Stage(parent,spr,R,main,camera){
  const root=new THREE.Group();root.visible=false;parent.add(root);
  const ball=new THREE.Mesh(G.ballMesh.geometry,G.ballMesh.material);ball.visible=false;root.add(ball);
  const rings=[];for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(.82,1,48),glowMat(0xffffff,0));m.visible=false;m.renderOrder=4;root.add(m);rings.push({m,t:0,d:0,r0:0,r1:0,a:1})}
  const _p=new V3();
  const S={root,spr,R,main,ball,cam:camera,t:0,dt:0,prev:0,no:0,def:null,q:1,sg:1,ox:0,oz:0,B:new V3(),x0:0,team:0,T:null,col:0,models:{},d:{},
    // sizes in a set piece are written at car scale and drawn BIG times larger, so they read from across the pitch
    em(x,y,z,vx,vy,vz,life,size,cell,hex,o){spr.emit(R,S.ox+S.sg*x,y,S.oz+S.sg*z,S.sg*vx,vy,S.sg*vz,life,size*BIG,cell,hex,o)},
    // n sprites thrown out from a point at speeds sp0 to sp1; up tips them upward (0 is every way, 1 is a fountain)
    burst(x,y,z,n,sp0,sp1,life,s0,s1,cells,cols,o,up){
      n=Math.max(1,Math.round(n*S.q));
      for(let i=0;i<n;i++){
        let dx,dy,dz,l;do{dx=rand(-1,1);dy=rand(-1,1);dz=rand(-1,1);l=dx*dx+dy*dy+dz*dz}while(l>1||l<.01);
        l=Math.sqrt(l);dx/=l;dy/=l;dz/=l;if(up){dy=Math.abs(dy)*(1-up)+up;l=Math.hypot(dx,dy,dz);dx/=l;dy/=l;dz/=l}
        const sp=rand(sp0,sp1);S.em(x,y,z,dx*sp,dy*sp,dz*sp,life*rand(.6,1),rand(s0,s1),pick(cells),pick(cols),o);
      }
    },
    ring(x,y,z,hex,r0,r1,dur,flat,a){const r=rings.find(k=>!k.m.visible)||rings[0];r.m.material.color.setHex(hex);r.m.position.set(x,y,z);r.flat=flat;if(flat)r.m.rotation.set(-Math.PI/2,0,0);r.t=0;r.d=dur;r.r0=r0;r.r1=r1;r.a=a||.85;r.m.scale.setScalar(r0);r.m.visible=true},
    at(time){return S.prev<time&&S.t>=time},
    model(name,make){let m=S.models[name];if(!m){m=S.models[name]=make();root.add(m)}m.visible=true;return m},
    world(x,y,z){return _p.set(S.ox+S.sg*x,y,S.oz+S.sg*z)},
    shake(a){if(main){const d=G.camera.position.distanceTo(S.world(S.x0,3,3));G.shake(a*clamp(1.3-d/70,.25,1))}},
    flash(a){if(main){const d=G.camera.position.distanceTo(S.world(S.x0,3,3));G.flash(a*clamp(1.2-d/150,.25,1))}},
    snd(fn){const A=G.audio();if(A)try{fn(A,A.actx.currentTime,main?1:.6)}catch(e){}},
    play(no,p,team){
      const def=GOALS[no];if(!def||def.gift)return false;
      S.stop();
      S.no=no;S.def=def;S.t=0;S.prev=-1;S.team=team;S.T=G.TEAM[team];S.col=S.T.col;S.q=G.low()?.5:1;S.d={};
      if(main){S.sg=p.z>0?-1:1;S.ox=0;S.oz=p.z>0?G.AL:-G.AL;root.position.set(0,0,S.oz);root.rotation.y=S.sg>0?0:Math.PI;S.B.set(clamp(S.sg*p.x,-GW+3,GW-3),clamp(p.y,BR,GH-3),clamp(S.sg*(p.z-S.oz),-5,1.5))}
      else{S.sg=1;S.ox=S.oz=0;S.B.set(p.x,p.y,p.z)}
      S.x0=clamp(S.B.x,-GW+6,GW-6);
      ball.material=G.ballMesh.material;ball.visible=false;ball.scale.setScalar(1);ball.rotation.set(0,0,0);ball.position.copy(S.B);
      root.visible=true;spr.cap(G.low()?90:150);spr.pts.visible=true;
      def.go(S);return true;
    },
    step(dt){
      if(!S.def)return;
      S.prev=S.t;S.t+=dt;S.dt=dt;
      if(S.t<S.def.dur)S.def.step(S,S.t,dt);
      else if(S.t>=Math.min(S.def.dur+.9,3.3)||!spr.alive){S.stop();return}
      else{for(const k in S.models)S.models[k].visible=false;ball.visible=false} // the models go at the end; the last sprites finish falling
      for(const r of rings)if(r.m.visible){r.t+=dt;const k=r.t/r.d;if(k>=1){r.m.visible=false;continue}const e=Math.sqrt(k);r.m.scale.setScalar(lerp(r.r0,r.r1,e));r.m.material.opacity=r.a*(1-k);if(!r.flat)r.m.lookAt(camera.position)}
    },
    stop(){S.def=null;root.visible=false;ball.visible=false;for(const k in S.models)S.models[k].visible=false;for(const r of rings)r.m.visible=false;spr.clear(R.lo,R.hi)},
    get live(){return !!S.def}
  };
  return S;
}
// ---- sounds the set pieces share ----
const boomSnd=(A,t,v,k)=>{A.noise(t,.5*(k||1),140,.7,.5*v,'lowpass');A.tone(t,.35*(k||1),'sine',110,36,.4*v)};
const popSnd=(A,t,v,f)=>{A.noise(t,.07,f||1800,1.5,.22*v);A.tone(t,.06,'square',(f||1800)*.4,120,.05*v)};
const tingSnd=(A,t,v,f)=>{A.tone(t,.22,'sine',f||2200,(f||2200)*.99,.07*v);A.tone(t,.12,'sine',(f||2200)*1.5,(f||2200)*1.5,.03*v)};
const CONF=[0xff4fb4,0x3ee6ff,0xffd23f,0x46e39a,0xff5c5c,0xb46cff,0xffffff];
const oGlow=O({add:1,fade:0}),oSpark=O({add:1,fade:2,drag:1.6,grav:5}),oEmber=O({add:1,fade:0,drag:1,grav:9,bounce:.3}),oConf=O({grav:8,spin:9,drag:1.5,bounce:0,wob:2}),
  oChunk=O({grav:22,spin:8,bounce:.42}),oPuff=O({a:.5,grow:1.6,drag:1.8,fade:0,grav:-1.5}),oDust=O({a:.45,grow:2.2,drag:3,fade:0}),oDrop=O({grav:20,rot:Math.PI,bounce:0,a:.9}),
  oFeather=O({grav:1.4,wob:4,spin:2,drag:1.4}),oHold=O({rot:0}),oFloat=O({grav:-1.5,wob:3,rot:0,drag:1}),oLava=O({add:1,grav:20,rot:Math.PI,fade:0}),oBird=O({flap:9,rot:0,grav:-1.5}),oCoin=O({grav:24,bounce:.5,spin:6}),oBill=O({grav:5,wob:6,spin:3,drag:2,bounce:0}),oZap=O({add:1,fade:2}),oCloud=O({a:.8,fade:2,grow:.3});
// In item-number order (cosmetics.js: boostball goal 1, 2, 3, ...). go(S) sets a piece up; step(S,t,dt) plays it.
// ---- what the third-wave set pieces share (26 onward) ----
// They never flash the screen, shake the camera only when the browser has not asked for reduced motion (with it, the big
// sweeps become gentle fades), and everything they make is made once per stage and kept: a goal allocates nothing new.
const RM=()=>!!(G.reduced&&G.reduced());
const shk=(S,a)=>{if(!RM())S.shake(a)};
const fanfare=(A,t,v,notes,len,type,g)=>notes.forEach((f,i)=>{A.tone(t+i*len,len*1.7,type||'square',f,f,(g||.045)*v);A.tone(t+i*len,len*1.7,'sine',f*2,f*2,(g||.045)*.4*v)});
const fxShader=(vs,fs,u,o)=>new THREE.ShaderMaterial(Object.assign({uniforms:u,vertexShader:vs,fragmentShader:fs,transparent:true,depthWrite:false,side:THREE.DoubleSide},o||{}));
const _im=new THREE.Matrix4(),_iq=new THREE.Quaternion(),_ie=new THREE.Euler(),_is=new V3(),_ip=new V3();
const inst=(im,i,x,y,z,rx,ry,rz,sx,sy,sz)=>{_iq.setFromEuler(_ie.set(rx||0,ry||0,rz||0));im.setMatrixAt(i,_im.compose(_ip.set(x,y,z),_iq,_is.set(sx==null?1:sx,sy==null?(sx==null?1:sx):sy,sz==null?(sx==null?1:sx):sz)))};
// how big the arena is for a stage: the real one, or the garage preview's little pitch
const _dp=new V3(),_dq=new V3(),_ds=new V3(),_dw=new V3();
const area=S=>S.main?{w:G.AW,l:G.AL*2,c:23,k:1}:{w:30,l:60,c:6,k:.36};
// a soap-film or glass look: bright, rainbow-tinted edges and a clear middle (the Bubble and the Snow Globe)
const FILM_VS='varying vec3 vN,vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;vN=normalMatrix*normal;gl_Position=projectionMatrix*mv;}';
const FILM_FS='uniform float uA,uT,uI;uniform vec3 uTint;varying vec3 vN,vV;void main(){float f=1.-abs(dot(normalize(vN),normalize(vV)));float r=pow(f,2.4);'+
  'vec3 c=mix(uTint,.55+.45*cos(6.2831*(vec3(0.,.33,.67)+f*1.3+uT*.25)),uI);gl_FragColor=vec4(c*(r*1.1+.05)+vec3(1.)*pow(f,7.)*.5,1.)*uA;}';
const filmMat=(tint,iri)=>fxShader(FILM_VS,FILM_FS,{uA:{value:0},uT:{value:0},uI:{value:iri},uTint:{value:new THREE.Color(tint)}},{blending:THREE.AdditiveBlending});
const GOALS=[null,
  { // 1 Fireworks: five rockets climb from the goal line and burst into shells of stars
    dur:2.8,
    go(S){S.d.r=[];for(let i=0;i<5;i++)S.d.r.push({x:-GW*.7+i*GW*.35+rand(-2,2),y:.5,z:rand(2,7),t0:i*.26+rand(0,.08),top:rand(11,19),done:0,c:[pick(CONF),pick(CONF)]});S.flash(.12)},
    step(S,t,dt){
      for(const r of S.d.r){
        if(t<r.t0||r.done)continue;
        const k=(t-r.t0)/.55;
        if(k<1){r.y=.5+r.top*(1-(1-k)*(1-k));S.em(r.x+rand(-.1,.1),r.y,r.z,rand(-1,1),-6,rand(-1,1),.35,rand(.3,.6),CELL.glow,0xffd98a,oGlow);if(S.prev<=r.t0)S.snd((A,tt,v)=>A.noise(tt,.4,2400,3,.06*v,'highpass'))}
        else{r.done=1;S.burst(r.x,r.y,r.z,80,10,19,1.4,.5,1.1,[CELL.spark,CELL.star,CELL.glow],r.c,oSpark);S.burst(r.x,r.y,r.z,26,4,8,1.1,.4,.8,[CELL.spark],[0xffffff,0xffe9a8],oSpark);S.burst(r.x,r.y,r.z,12,2,5,.4,1.5,2.6,[CELL.glow],[0xffffff],oGlow);S.ring(r.x,r.y,r.z,r.c[0],.5,9,.5);S.snd((A,tt,v)=>{popSnd(A,tt,v,900);A.noise(tt+.05,.5,3000,1,.08*v,'highpass')});S.shake(.25)}
      }
    }
  },
  { // 2 Confetti Cannon: a cannon by each post fires across the goal mouth, twice
    dur:2.7,
    go(S){
      const mk=()=>{const b=Build();b.cyl(.95,1.15,3.4,S.col,0,1.7,0,0,0,0,16);b.cyl(1.2,1.2,.35,0xffd23f,0,3.4,0,0,0,0,16);b.cyl(1.25,1.25,.3,0xffd23f,0,.4,0,0,0,0,16);b.sph(1.15,S.col,0,0,0);
        for(const s of[-1,1])b.cyl(1,1,.4,0x2a3140,s*1.35,0,0,0,0,Math.PI/2,14);b.box(2.4,.3,.3,0x6b7785,0,0,0);return b.mesh()};
      S.d.c=[S.model('cannonL'+S.col,mk),S.model('cannonR'+S.col,mk)];
      S.d.c.forEach((m,i)=>{const s=i?1:-1;m.position.set(s*(GW-4),1,4.5);m.rotation.set(0,0,s*.75);m.scale.setScalar(.01)});
    },
    step(S,t,dt){
      const fire=(big)=>{S.d.c.forEach((m,i)=>{const s=i?1:-1,x=s*(GW-4)-s*2.4,y=3.6;
        const n=Math.round((big?110:60)*S.q);for(let k=0;k<n;k++){const sp=rand(14,34);S.em(x,y,4.5,-s*sp*rand(.45,.9),sp*rand(.35,.85),rand(-5,7),rand(1.5,2.3),rand(.4,.75),Math.random()<.6?CELL.strip:CELL.square,pick(CONF),oConf)}
        S.burst(x,y,4.5,8,2,6,.7,2,3.5,[CELL.puff],[0xffffff],oPuff)});S.d.kick=1;S.shake(big?.5:.3);S.snd((A,tt,v)=>{popSnd(A,tt,v*1.6,700);boomSnd(A,tt,v*.5,.5)})};
      if(S.at(.38))fire(1);if(S.at(1.15))fire(0);
      S.d.kick=Math.max(0,(S.d.kick||0)-dt*4);
      S.d.c.forEach((m,i)=>{const s=i?1:-1,k=backOut(seg(t,0,.3))*(1-seg(t,2.4,2.7));m.scale.setScalar(Math.max(.01,k));m.position.x=s*(GW-4)+s*S.d.kick*1.2;m.position.y=1-S.d.kick*.5});
    }
  },
  { // 3 Black Hole: the ball spirals into a dark ball with a bright ring, which then snaps shut
    dur:2.8,
    go(S){
      S.d.h=S.model('hole',()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0x05030a})));
        const a=new THREE.Mesh(new THREE.RingGeometry(1.25,2.5,48),glowMat(0xb46cff,.75));a.rotation.x=-1.25;g.add(a);const b=new THREE.Mesh(new THREE.RingGeometry(1.08,1.22,48),glowMat(0xffd9a0,.95));g.add(b);g.userData={a,b};return g});
      S.d.c=new V3(S.x0,5.5,3.5);S.d.h.position.copy(S.d.c);S.d.h.scale.setScalar(.01);S.ball.visible=true;S.d.b0=S.ball.position.clone();
      S.snd((A,t,v)=>A.tone(t,2,'sawtooth',90,28,.1*v));
    },
    step(S,t,dt){
      const h=S.d.h,c=S.d.c,k=t<1.95?backOut(seg(t,0,.5))*3.4:3.4*(1-seg(t,1.95,2.12));
      h.scale.setScalar(Math.max(.01,k));h.userData.a.rotation.z+=dt*5;h.userData.b.lookAt(S.cam.position);
      if(t<1.9){
        const u=seg(t,.15,1.75),r=(1-u)*(1-u)*Math.max(4,S.d.b0.distanceTo(c)),a=u*u*16;
        S.ball.position.set(c.x+Math.cos(a)*r,lerp(S.d.b0.y,c.y,u)+Math.sin(a*.5)*r*.25,c.z+Math.sin(a)*r*.6);S.ball.scale.setScalar(Math.max(.02,1-u*u));S.ball.rotation.x+=dt*9;
        for(let i=0;i<(S.q<1?2:4);i++){const a2=rand(0,TAU),rr=rand(6,11),x=c.x+Math.cos(a2)*rr,y=c.y+Math.sin(a2)*rr*.55,z=c.z+rand(-2,2);S.em(x,Math.max(.3,y),z,(c.x-x)*2.1-Math.sin(a2)*9,(c.y-y)*2.1+Math.cos(a2)*5,(c.z-z)*2,.42,rand(.3,.7),pick([CELL.glow,CELL.spark]),pick([0xb46cff,0xffd9a0,0x6f8cff]),oGlow)}
      }else S.ball.visible=false;
      if(S.at(2.02)){S.flash(.3);S.shake(.8);S.ring(c.x,c.y,c.z,0xb46cff,1,26,.7);S.ring(c.x,c.y,c.z,0xffffff,.5,14,.45);S.burst(c.x,c.y,c.z,90,10,30,.9,.3,.8,[CELL.star,CELL.glow],[0xb46cff,0xffffff,0x6f8cff],oSpark);S.snd((A,tt,v)=>{boomSnd(A,tt,v);A.tone(tt,.3,'sine',60,900,.12*v)})}
    }
  },
  { // 4 Supernova: a star swells, goes white and throws off a shell
    dur:2.6,
    go(S){S.d.c=new V3(S.x0,Math.max(4,S.B.y),3);S.ball.visible=true;S.snd((A,t,v)=>A.tone(t,.55,'sine',200,1400,.08*v))},
    step(S,t,dt){
      const c=S.d.c;
      if(t<.55){const k=t/.55;S.ball.scale.setScalar(1+k*.5+Math.sin(t*90)*.04);S.em(c.x+rand(-.3,.3),c.y+rand(-.3,.3),c.z+1,0,0,0,.12,2+k*9,CELL.glow,k>.7?0xffffff:0xbfe4ff,oGlow)}
      if(S.at(.55)){S.ball.visible=false;S.flash(.42);S.shake(1);
        const n=Math.round(190*S.q);for(let i=0;i<n;i++){const a=rand(0,TAU),b=Math.acos(rand(-1,1)),sp=rand(20,27);S.em(c.x,c.y,c.z,Math.sin(b)*Math.cos(a)*sp,Math.abs(Math.cos(b))*sp*.8,Math.sin(b)*Math.sin(a)*sp,rand(.9,1.5),rand(.35,.9),pick([CELL.glow,CELL.spark,CELL.star]),pick([0xffffff,0x8fd6ff,0xff9af0,0xffe9a8]),oSpark)}
        S.ring(c.x,c.y,c.z,0xffffff,1,30,.8);S.ring(c.x,.2,c.z,0x8fd6ff,1,24,.9,1);S.snd((A,tt,v)=>{boomSnd(A,tt,v*1.3,1.4);A.noise(tt,1.2,3000,.5,.1*v,'highpass')})}
      if(t>.55&&t<2){for(let i=0;i<(S.q<1?1:2);i++)S.em(c.x+rand(-5,5),c.y+rand(-3,4),c.z+rand(-2,3),rand(-3,3),rand(-1,2),rand(-2,2),.9,rand(3,6),CELL.puff,pick([0x6f4cff,0x2e7bff,0xff5cc8]),O({add:1,fade:2,grow:.6,a:.5}))}
    }
  },
  { // 5 Lightning Strike: three bolts come straight down on the spot
    dur:2.2,
    go(S){
      S.d.b=S.model('bolt',()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(16*2*3),3));const ix=[];for(let i=0;i<15;i++){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}g.setIndex(ix);const m=new THREE.Mesh(g,glowMat(0xfff7c2,1));m.frustumCulled=false;m.renderOrder=4;return m});
      S.d.b.visible=false;S.d.x=[S.x0,S.x0-7,S.x0+6];S.d.n=0;S.ball.visible=true;
    },
    step(S,t,dt){
      const hit=(x,z)=>{
        const P=S.d.b.geometry.attributes.position;let px=x+rand(-5,5),w=.5;
        for(let i=0;i<16;i++){const y=17-i*1.12,nx=i===15?x:px+rand(-2.4,2.4);px=nx;w=i===15?.2:rand(.4,.9);P.setXYZ(i*2,nx-w,Math.max(.2,y),z);P.setXYZ(i*2+1,nx+w,Math.max(.2,y),z)}
        P.needsUpdate=true;S.d.b.visible=true;S.d.bt=.24;S.d.lx=x;S.d.lz=z;S.flash(.34);S.shake(.8);
        S.burst(x,.4,z,60,8,26,.8,.6,1.5,[CELL.zap,CELL.glow,CELL.spark],[0xffe45c,0xffffff,0xbfe4ff],oSpark,.5);S.ring(x,.2,z,0xffe45c,.5,11,.5,1);S.burst(x,.5,z,8,1,3,.9,2,3.2,[CELL.puff],[0x8a93a8],oPuff);
        S.snd((A,tt,v)=>{A.noise(tt,.12,5000,.6,.4*v,'highpass');A.noise(tt+.03,1.1,160,.6,.6*v,'lowpass')});
      };
      [.12,.6,1.05].forEach((tt,i)=>{if(S.at(tt)){hit(S.d.x[i],i?rand(2,6):Math.max(1,S.B.z+2));if(!i)S.ball.visible=false}});
      if(t<1.7&&Math.random()<(S.q<1?.4:.8))S.em(S.x0+rand(-13,13),rand(15,18),rand(1,7),rand(-2,2),0,0,.9,rand(3.5,5.5),CELL.puff,pick([0x3a4256,0x525b72,0x2a3142]),oCloud);
      if(S.d.bt>0){S.d.bt-=dt;S.d.b.material.opacity=Math.random()<.3?.35:1;if(S.d.bt<=0)S.d.b.visible=false}
      if(S.d.lx!==undefined&&t<1.9&&Math.random()<.7)S.em(S.d.lx+rand(-4,4),rand(.4,3),S.d.lz+rand(-2,2),0,rand(0,3),0,.18,rand(.5,1.1),CELL.zap,pick([0xffe45c,0xffffff]),oZap);
      if(t<.12)S.ball.position.x=S.B.x+rand(-.06,.06);
    }
  },
  { // 6 Tornado: a twister wanders across the goal mouth carrying the ball and one surprised cow
    dur:3,
    go(S){
      S.d.f=S.model('funnel',()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(6.2,.8,15,20,6,true),new THREE.MeshBasicMaterial({color:0xaeb6c2,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide}));m.geometry.translate(0,7.5,0);return m});
      S.d.cow=S.model('cow',()=>{const b=Build(),w=0xf6f3ea,k=0x1b1920;b.box(2.6,1.5,1.4,w,0,0,0);b.box(.9,.8,1.42,k,-.5,.2,0);b.box(.7,.6,1.42,k,.7,-.3,0);b.box(1,1,1.1,w,1.7,.5,0);b.box(.6,.5,.9,0xffb3c7,2.3,.3,0);
        for(const s of[-1,1]){b.box(.14,.5,.14,0xe8dcc0,1.5,1.2,s*.4,0,0,s*.3);b.sph(.1,k,2.05,.75,s*.36);for(const x of[-.9,.9])b.box(.35,1,.35,w,x,-1.2,s*.45)}
        b.box(.5,.3,.7,0xffb3c7,-.2,-.9,0);b.cyl(.06,.06,1.1,w,-1.5,.2,0,0,0,.9);return b.mesh()});
      S.ball.visible=true;S.snd((A,t,v)=>A.noise(t,3,260,.5,.3*v,'lowpass'));
    },
    step(S,t,dt){
      const k=backOut(seg(t,0,.5))*(1-seg(t,2.55,3)),cx=S.x0+Math.sin(t*1.5)*6,cz=4+Math.sin(t*2.3)*1.5,f=S.d.f;
      f.position.set(cx,0,cz);f.scale.set(k,k,k);f.rotation.y-=dt*9;f.rotation.z=Math.sin(t*3)*.08;
      const n=S.q<1?4:8;for(let i=0;i<n;i++){const h=rand(0,14)*k,a=rand(0,TAU),r=(.9+h*.38)*k;S.em(cx+Math.cos(a)*r,h+.3,cz+Math.sin(a)*r,-Math.sin(a)*13,rand(1,4),Math.cos(a)*13,.3,rand(1.6,3)*k+.2,CELL.puff,pick([0xaeb6c2,0x8a93a8,0xdadfea]),O({a:.55,fade:0,grow:.5}))}
      if(Math.random()<.5)S.em(cx+rand(-1,1),.3,cz+rand(-1,1),rand(-9,9),rand(4,9),rand(-9,9),.8,rand(.3,.6),pick([CELL.leaf,CELL.square]),pick([0x7a5230,0x46e39a,0xdadfea]),oChunk);
      const orb=(o,ph,sp,lift)=>{const u=seg(t,.3,2.5),h=1+u*lift,a=ph+t*sp,r=(1+h*.38)*k+.6;o.position.set(cx+Math.cos(a)*r,h,cz+Math.sin(a)*r);o.rotation.set(t*5+ph,t*3,t*4)};
      if(t<2.5){orb(S.ball,0,7,12);orb(S.d.cow,2.4,5.5,9)}
      else{const u=(t-2.5)/.5;S.ball.position.x+=dt*30;S.ball.position.y+=dt*(14-u*30);S.d.cow.position.x-=dt*22;S.d.cow.position.y+=dt*(10-u*34);S.d.cow.rotation.z+=dt*9}
      if(S.at(1.2))S.snd((A,tt,v)=>{A.tone(tt,.5,'sawtooth',150,210,.1*v);A.tone(tt+.45,.6,'sawtooth',210,120,.1*v)});
    }
  },
  { // 7 Volcano: a small volcano grows out of the pitch, shoots the ball out of the top and keeps erupting
    dur:3,
    go(S){
      S.d.v=S.model('volcano',()=>{const b=Build();b.cyl(1.9,6.5,7,0x5c463c,0,3.5,0,0,0,0,9);for(let i=0;i<9;i++){const a=i/9*TAU;b.cyl(.5,1.5,6.6,0x4a362e,Math.cos(a)*3.6,3.2,Math.sin(a)*3.6,Math.sin(a)*.55,0,-Math.cos(a)*.55,5)}
        b.cyl(1.7,1.7,.3,0xff5a1f,0,7,0,0,0,0,9);for(let i=0;i<4;i++){const a=i*1.7+.4;b.box(.5,3.4,.3,0xff7a2e,Math.cos(a)*2.9,5,Math.sin(a)*2.9,Math.sin(a)*.6,-a,-Math.cos(a)*.6)}return b.mesh()});
      S.d.v.position.set(S.x0,0,4.5);S.d.v.scale.set(1,.01,1);S.ball.visible=false;S.snd((A,t,v)=>A.noise(t,2.6,90,.6,.5*v,'lowpass'));
    },
    step(S,t,dt){
      const v=S.d.v,x=S.x0,z=4.5,up=backOut(seg(t,0,.6))*(1-seg(t,2.6,3));
      v.scale.set(1+.03*Math.sin(t*60)*(t>.6&&t<2.5?1:0),Math.max(.01,up),1);if(t<.6)S.shake(.15);
      if(S.at(.7)){S.ball.visible=true;S.ball.position.set(x,7,z);S.d.bv=new V3(rand(-4,4),34,9);S.flash(.25);S.shake(.9);S.ring(x,7.2,z,0xff7a2e,1,14,.6);S.burst(x,7.4,z,60,10,26,1.3,.5,1.1,[CELL.drop,CELL.glow],[0xff7a2e,0xffd23f,0xff3b1c],oLava,.8);S.snd((A,tt,v2)=>boomSnd(A,tt,v2*1.2,1.3))}
      if(t>.7&&t<2.5){
        for(let i=0;i<(S.q<1?2:5);i++)S.em(x+rand(-.8,.8),7.2,z+rand(-.8,.8),rand(-7,7),rand(14,27),rand(-5,8),rand(1.1,1.7),rand(.45,1),Math.random()<.7?CELL.drop:CELL.glow,pick([0xff7a2e,0xffd23f,0xff3b1c]),oLava);
        if(Math.random()<.5)S.em(x+rand(-1,1),8,z,rand(-1.5,1.5),rand(4,7),rand(-1,1),1.5,rand(2.5,4),CELL.puff,pick([0x4a4046,0x6b5a5a]),oPuff);
        if(Math.random()<.2)S.em(x,7.3,z,rand(-9,9),rand(12,20),rand(-4,9),1.7,rand(.5,.9),CELL.rock,0xffffff,oChunk);
      }
      if(S.d.bv&&S.ball.visible){S.d.bv.y-=30*dt;S.ball.position.addScaledVector(S.d.bv,dt);S.ball.rotation.x+=dt*8;if(S.ball.position.y<-2)S.ball.visible=false}
    }
  },
  { // 8 Meteor: a burning rock comes down at a slant and lands on the spot
    dur:2.5,
    go(S){
      S.d.m=S.model('meteor',()=>{const b=Build(),r=rng(8);for(let i=0;i<9;i++)b.add(new THREE.IcosahedronGeometry(1.3+r()*.7,0),i%3?0x4a3c3a:0x6b5248,(r()-.5)*1.6,(r()-.5)*1.6,(r()-.5)*1.6,r()*3,r()*3,0);for(let i=0;i<5;i++)b.add(new THREE.IcosahedronGeometry(.5,0),0xff6a1a,(r()-.5)*3,(r()-.5)*3,(r()-.5)*3);return b.mesh()});
      S.d.cr=S.model('crater',()=>{const m=new THREE.Mesh(new THREE.CircleGeometry(1,28),new THREE.MeshBasicMaterial({color:0x1a1210,transparent:true,opacity:.8,depthWrite:false}));m.rotation.x=-Math.PI/2;m.renderOrder=1;return m});
      S.d.cr.visible=false;S.d.e=new V3(S.x0,1.6,3.5);S.d.s=new V3(S.x0+24,46,22);S.ball.visible=true;S.snd((A,t,v)=>A.tone(t,.85,'sawtooth',900,90,.07*v));
    },
    step(S,t,dt){
      const m=S.d.m,e=S.d.e;
      if(t<.85){const k=t/.85;m.position.lerpVectors(S.d.s,e,k*k);m.rotation.x+=dt*5;m.rotation.z+=dt*3;
        for(let i=0;i<(S.q<1?3:6);i++)S.em(m.position.x+rand(-1.5,1.5),m.position.y+rand(-1.5,1.5),m.position.z+rand(-1.5,1.5),rand(4,9),rand(6,12),rand(3,7),.45,rand(1.2,2.8),Math.random()<.7?CELL.flame:CELL.glow,pick([0xffd23f,0xff8a1f,0xff4a1c]),O({add:1,fade:0,grow:-.5,rot:0}))}
      if(S.at(.85)){m.position.copy(e);S.ball.visible=false;S.flash(.4);S.shake(1.2);S.d.cr.visible=true;S.d.cr.position.set(e.x,.09,e.z);S.d.cr.scale.setScalar(1);
        S.ring(e.x,.2,e.z,0xff8a1f,1,24,.7,1);S.ring(e.x,2,e.z,0xffffff,1,18,.5);S.burst(e.x,1,e.z,90,8,28,1.2,.3,.9,[CELL.glow,CELL.spark],[0xffd23f,0xff8a1f,0xffffff],oEmber,.5);
        S.burst(e.x,1,e.z,26,8,20,1.8,.6,1.3,[CELL.rock],[0xffffff],oChunk,.6);S.burst(e.x,1,e.z,14,2,6,1.3,3,5,[CELL.puff],[0x4a4046,0x6b5a5a],oPuff,.6);S.snd((A,tt,v)=>boomSnd(A,tt,v*1.5,1.6))}
      if(t>.85){const k=seg(t,.85,1.1);S.d.cr.scale.setScalar(1+k*5.5);S.d.cr.material.opacity=.8*(1-seg(t,2,2.5));m.position.y=e.y-seg(t,.85,1)*1;m.scale.setScalar(1-seg(t,2.1,2.5)*.99);
        if(Math.random()<.5)S.em(e.x+rand(-1.5,1.5),2,e.z+rand(-1,1),rand(-1,1),rand(3,6),rand(-1,1),1.2,rand(2,3.5),CELL.puff,0x5a4a4a,oPuff)}
    }
  },
  { // 9 Freeze and Shatter: the ball ices over, sprouts spikes, shivers, and breaks
    dur:2.4,
    go(S){
      S.d.ice=S.model('ice',()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshLambertMaterial({color:0xbfe8ff,transparent:true,opacity:.72,flatShading:true,emissive:0x1f5f9f})));
        const b=Build(),r=rng(9);for(let i=0;i<11;i++){const a=r()*TAU,e=r()*2-1,s=Math.sqrt(1-e*e),d=new V3(s*Math.cos(a),Math.abs(e),s*Math.sin(a)),q=new THREE.Quaternion().setFromUnitVectors(new V3(0,1,0),d),eu=new THREE.Euler().setFromQuaternion(q);b.add(new THREE.ConeGeometry(.22+r()*.14,1.3+r()*.9,5),i%2?0xe8f6ff:0x9fd3ff,d.x*1.1,d.y*1.1,d.z*1.1,eu.x,eu.y,eu.z)}
        const sp=b.mesh(new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,emissive:0x16466e}));g.add(sp);g.userData.sp=sp;return g});
      S.d.c=new V3(S.B.x,Math.max(S.B.y,2.6),Math.max(S.B.z,1)+1.5);S.ball.visible=true;S.ball.position.copy(S.d.c);S.d.ice.position.copy(S.d.c);S.d.ice.scale.setScalar(.01);
    },
    step(S,t,dt){
      const c=S.d.c,ice=S.d.ice;
      if(t<1.3){const k=seg(t,0,.55);ice.scale.setScalar(Math.max(.01,BR*1.28*backOut(k)));ice.userData.sp.scale.setScalar(.2+.8*backOut(seg(t,.35,.95)));
        const sh=seg(t,.6,1.3)*.09;ice.position.set(c.x+rand(-sh,sh),c.y,c.z+rand(-sh,sh));S.ball.position.copy(ice.position);
        if(Math.random()<.6)S.em(c.x+rand(-3,3),c.y+rand(-2,3),c.z+rand(-2,2),0,-.6,0,.7,rand(.3,.6),CELL.flake,0xffffff,O({fade:2,spin:2}));
        if(S.at(.1)||S.at(.45)||S.at(.8)||S.at(1.1))S.snd((A,tt,v)=>{A.noise(tt,.05,6000,2,.12*v,'highpass');tingSnd(A,tt,v,2600+Math.random()*900)})}
      if(S.at(1.3)){ice.visible=false;S.ball.visible=false;S.flash(.22);S.shake(.6);S.ring(c.x,c.y,c.z,0xbfe8ff,1,16,.5);
        S.burst(c.x,c.y,c.z,70,7,22,1.6,.4,1.1,[CELL.ice,CELL.shard],[0xffffff,0xbfe8ff],oChunk,.35);S.burst(c.x,c.y,c.z,40,2,9,1.1,.3,.6,[CELL.flake,CELL.spark],[0xffffff,0xdff3ff],O({grav:2,drag:1.5,spin:2,fade:1}));
        S.snd((A,tt,v)=>{A.noise(tt,.3,5200,.8,.4*v,'highpass');for(let i=0;i<6;i++)tingSnd(A,tt+i*.05,v,1800+Math.random()*2600)})}
    }
  },
  { // 10 Pixel Shatter: the ball turns into a ball of square blocks, glitches, and falls apart along the grid
    dur:2.4,
    go(S){
      const c=S.d.c=new V3(S.B.x,Math.max(S.B.y,2.4),Math.max(S.B.z,1)+1.5),L=S.d.L=[],st=.82;
      for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){const d=Math.hypot(x,y,z);if(d<=2.45&&d>1.3&&(S.q===1||(x+y+z)%2===0))L.push([x*st,y*st,z*st])}
      S.ball.visible=false;S.d.cols=[0xffffff,0xdadfea,S.col,0x8fa3b8];
      for(const p of L)S.em(c.x+p[0],c.y+p[1],c.z+p[2],0,0,0,.5,.95,CELL.square,pick(S.d.cols),O({rot:0,fade:1}));
      S.snd((A,t,v)=>{for(let i=0;i<5;i++)A.tone(t+i*.08,.07,'square',880-i*110,880-i*110,.05*v)});
    },
    step(S,t,dt){
      const c=S.d.c;
      if(S.at(.22))for(let i=0;i<8;i++){const p=pick(S.d.L);S.em(c.x+p[0]+pick([-1.6,1.6]),c.y+p[1],c.z+p[2],0,0,0,.12,.95,CELL.square,pick([0x3ee6ff,0xff4fb4,0x46e39a]),O({rot:0,fade:1}))}
      if(S.at(.46)){S.shake(.5);S.flash(.15);
        for(const p of S.d.L){const ax=Math.abs(p[0])>Math.abs(p[1])?(Math.abs(p[0])>Math.abs(p[2])?0:2):(Math.abs(p[1])>Math.abs(p[2])?1:2),sp=rand(9,22),v=[0,rand(2,7),0];v[ax]+=Math.sign(p[ax]||1)*sp;
          S.em(c.x+p[0],c.y+p[1],c.z+p[2],v[0],v[1],v[2],rand(1.2,1.9),.95,CELL.square,pick(S.d.cols),O({rot:0,grav:24,bounce:.5,grow:-.5}))}
        S.burst(c.x,c.y,c.z,30,4,14,.8,.3,.5,[CELL.square],[0x3ee6ff,0xff4fb4,0x46e39a],O({rot:0,add:1,fade:0,drag:2}));
        S.snd((A,tt,v)=>{for(let i=0;i<9;i++)A.tone(tt+i*.045,.05,'square',1200-i*120,300,.05*v);A.noise(tt,.2,900,1,.2*v)})}
    }
  },
  { // 11 Disco Ball Drop: a mirror ball drops on a cable, spins, and throws coloured beams about
    dur:3,
    go(S){
      S.d.m=S.model('disco',()=>{const g=new THREE.Group(),cv=document.createElement('canvas');cv.width=128;cv.height=64;const c=cv.getContext('2d'),r=rng(11);
        for(let y=0;y<8;y++)for(let x=0;x<16;x++){const k=r();c.fillStyle=k>.86?'#ffffff':k>.5?'#c9d2e0':k>.2?'#8f9bb0':'#5f6b82';c.fillRect(x*8,y*8,7.4,7.4)}
        const ball=new THREE.Mesh(new THREE.SphereGeometry(2.6,16,10),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)}));g.add(ball);
        const cab=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,40,5),new THREE.MeshBasicMaterial({color:0x2a3140}));cab.position.y=22.4;g.add(cab);
        const beams=[];for(let i=0;i<6;i++){const b=new THREE.Mesh(new THREE.ConeGeometry(2.6,26,10,1,true),glowMat(RAINBOW[i],.2));b.geometry.translate(0,-13,0);g.add(b);beams.push(b)}
        g.userData={ball,beams};return g});
      S.d.m.position.set(S.x0,40,4.5);S.ball.visible=false;
    },
    step(S,t,dt){
      const m=S.d.m,u=m.userData,y=t<2.5?lerp(40,8.5,bounceOut(seg(t,0,.7))):lerp(8.5,44,(t-2.5)/.5*(t-2.5)/.5*4);
      m.position.y=y;u.ball.rotation.y+=dt*2.6;
      u.beams.forEach((b,i)=>{const a=t*1.4+i*TAU/6;b.rotation.set(Math.sin(a)*.9,0,Math.cos(a*1.3+i)*.9);b.material.opacity=t>.6&&t<2.5?.2+.1*Math.sin(t*8+i*2):0});
      if(t>.6&&t<2.5){
        for(let i=0;i<(S.q<1?1:3);i++){const a=rand(0,TAU),r=rand(3,13);S.em(S.x0+Math.cos(a)*r,.2,4.5+Math.sin(a)*r*.6,0,0,0,.4,rand(1.6,3),CELL.glow,pick(RAINBOW),O({add:1,fade:2,a:.8}))}
        if(Math.random()<.25)S.em(S.x0+rand(-9,9),rand(1,4),rand(2,7),rand(-1,1),rand(2,4),0,1.3,rand(.9,1.4),pick([CELL.note,CELL.notes]),pick(CONF),oFloat);
        if(Math.random()<.5)S.em(S.x0+rand(-3,3),y+rand(-3,3),4.5+rand(-1,3),0,0,0,.35,rand(.6,1.4),CELL.spark,0xffffff,O({add:1,fade:2,rot:0}));
        const beat=Math.floor((t-.6)/.42);if(beat!==S.d.beat){S.d.beat=beat;S.shake(.18);S.snd((A,tt,v)=>{A.tone(tt,.16,'sine',130,45,.4*v);A.noise(tt+.21,.04,7000,2,.1*v,'highpass');A.tone(tt,.2,'square',[262,330,392,330][beat%4],[262,330,392,330][beat%4],.035*v)})}
      }
    }
  },
  { // 12 Giant Foot Stomp: a huge foot in a stripy sock comes down on the ball, wiggles, and leaves it flat
    dur:2.7,
    go(S){
      S.d.f=S.model('foot',()=>{const b=Build(),sk=0xf2b58a;
        b.sph(1,sk,0,1.5,1.2,3.1,1.5,5.2);b.sph(1,sk,0,2.2,-2.6,2.6,2.2,2.6);                  // the foot and the heel
        [[-2.3,1.25],[-1.05,1.0],[.05,.9],[1.05,.85],[2,.75]].forEach(([x,r],i)=>{b.sph(r,sk,x,1.25,6-i*.28);b.box(r*1.1,.12,r*.8,0xfff0e0,x,1.25+r*.82,6.3-i*.28,-.5)}); // toes and toenails
        for(let i=0;i<9;i++)b.cyl(2.3,2.3,1.5,i%2?0xf4f6ff:0xd93636,0,4.2+i*1.5,-2.3,0,0,0,14);                           // the sock, in stripes
        b.cyl(2.6,2.6,.9,0xf4f6ff,0,3.6,-2.3,0,0,0,14);return b.mesh()});
      S.d.c=new V3(S.B.x,0,Math.max(S.B.z,1)+2);S.ball.visible=true;S.ball.position.set(S.d.c.x,BR,S.d.c.z+1);S.d.f.position.set(S.d.c.x,60,S.d.c.z);S.d.f.rotation.set(0,0,0);
      S.snd((A,t,v)=>A.tone(t+.1,.4,'sine',700,180,.06*v));
    },
    step(S,t,dt){
      const f=S.d.f,c=S.d.c,b=S.ball;
      if(t<.52){const k=seg(t,.12,.52);f.position.y=lerp(60,0,k*k);b.scale.set(1,1,1)}
      if(S.at(.52)){f.position.y=0;S.shake(1.3);S.flash(.18);b.scale.set(1.75,.07,1.75);b.position.y=.16;
        S.ring(c.x,.2,c.z+1,0xffffff,2,20,.6,1);for(let i=0;i<Math.round(22*S.q);i++){const a=i/22*TAU;S.em(c.x+Math.cos(a)*4,.5,c.z+1+Math.sin(a)*5,Math.cos(a)*9,rand(1,3),Math.sin(a)*9,.9,rand(2.5,4),CELL.puff,0xdadfea,oDust)}
        S.snd((A,tt,v)=>{boomSnd(A,tt,v*1.5,1.2);A.noise(tt,.18,500,1,.4*v)})}
      if(t>.52&&t<1.7){const w=seg(t,.75,1.6);f.rotation.x=-Math.sin(w*Math.PI)*.22-Math.sin(w*TAU*3)*.035*Math.sin(w*Math.PI);f.rotation.z=Math.sin(w*TAU*2.5)*.05*Math.sin(w*Math.PI)}
      if(t>=1.7){const k=seg(t,1.7,2.3);f.position.y=k*k*70;f.rotation.x=0}
      if(S.at(2.15)){S.snd((A,tt,v)=>A.tone(tt,.25,'sine',160,620,.14*v));S.burst(c.x,1,c.z+1,10,2,6,.5,.4,.8,[CELL.spark],[0xffffff],oSpark,.6)}
      if(t>2.15){const k=backOut(seg(t,2.15,2.5));b.scale.set(lerp(1.75,1,k),lerp(.07,1,k),lerp(1.75,1,k));b.position.y=lerp(.16,BR,k)+Math.sin(seg(t,2.15,2.6)*Math.PI)*2.2}
    }
  },
  { // 13 Pinata Burst: a paper donkey swings on a rope, takes two knocks, and bursts into sweets
    dur:2.8,
    go(S){
      S.d.p=S.model('pinata',()=>{const g=new THREE.Group(),b=Build(),st=[0xff4fb4,0xffd23f,0x3ee6ff,0x46e39a,0xb46cff,0xff8a3d];
        for(let i=0;i<6;i++)b.box(4.4,.42,1.8,st[i],0,-1.05+i*.42,0);                                   // body, in paper stripes
        for(let i=0;i<5;i++)b.box(1.3,.42,1.3,st[(i+2)%6],2.2,.9+i*.42,0);                              // neck
        for(let i=0;i<4;i++)b.box(2.1-i*.12,.36,1.4,st[(i+4)%6],3,2.9+i*.36-.5,0);                      // head
        for(const s of[-1,1]){b.box(.3,1.1,.3,0xff4fb4,2.4,4.3,s*.4,0,0,-.2);b.sph(.14,0x14161f,3.7,3.2,s*.72);for(const x of[-1.6,1.6])for(let i=0;i<4;i++)b.box(.7,.4,.6,st[(i+(x>0?1:3))%6],x,-1.5-i*.4,s*.55)}
        for(let i=0;i<5;i++)b.box(.16,.9,.16,st[i],-2.3-i*.12,-.2-i*.1,(i-2)*.14,0,0,.7);               // tail
        const m=b.mesh();m.scale.setScalar(1.6);m.position.y=-6.4;g.add(m);const rope=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,30,5),new THREE.MeshBasicMaterial({color:0xc9b48a}));rope.position.y=12;g.add(rope);g.userData.m=m;return g});
      S.d.p.position.set(S.x0,60,4.5);S.d.p.rotation.set(0,-.5,0);S.d.w=0;S.ball.visible=false;
    },
    step(S,t,dt){
      const p=S.d.p,x=S.x0;
      p.position.y=lerp(44,13,backOut(seg(t,0,.45)));S.d.w=Math.max(0,S.d.w-dt*1.2);
      p.rotation.z=Math.sin(t*5)*.14+Math.sin(t*17)*S.d.w*.5;
      const whack=()=>{S.d.w=1;S.shake(.35);S.burst(x,8.5,4.5,10,4,10,1.2,.5,.8,[CELL.candy,CELL.strip],CONF,oChunk,.3);S.snd((A,tt,v)=>{A.noise(tt,.08,400,1,.35*v);A.tone(tt,.08,'square',180,90,.08*v)})};
      if(S.at(.6))whack();if(S.at(1))whack();
      if(S.at(1.4)){p.userData.m.visible=false;S.flash(.2);S.shake(.7);S.ring(x,8.5,4.5,0xff4fb4,1,16,.5);
        S.burst(x,8.5,4.5,150,6,24,2,.5,.95,[CELL.candy,CELL.candy,CELL.disc],CONF,oChunk,.45);S.burst(x,8.5,4.5,90,6,20,2,.35,.6,[CELL.strip,CELL.square],CONF,oConf,.4);
        S.snd((A,tt,v)=>{popSnd(A,tt,v*1.8,600);for(let i=0;i<8;i++)tingSnd(A,tt+.15+i*.07,v*.6,1400+Math.random()*1800)})}
      if(t>1.4)p.position.y=13+seg(t,1.5,2.2)*40;else p.userData.m.visible=true;
    }
  },
  { // 14 Popcorn Pop: a striped tub pops up and will not stop popping
    dur:2.8,
    go(S){
      S.d.tub=S.model('tub',()=>{const b=Build(),n=14;for(let i=0;i<n;i++){const a=i/n*TAU,a2=(i+.5)/n*TAU;b.box(1.25,5,.25,i%2?0xf4f6ff:0xd93636,Math.cos(a2)*2.45,2.5,Math.sin(a2)*2.45,0,-a2+Math.PI/2,0);void a}
        b.cyl(2.3,2.05,.3,0xb82a2a,0,.15,0,0,0,0,14);b.cyl(2.9,2.9,.25,0xfff6da,0,4.9,0,0,0,0,14);for(let i=0;i<9;i++)b.sph(.75,0xfff6da,Math.cos(i*2.4)*1.6*(i%3?1:.3),5.3+(i%3)*.25,Math.sin(i*2.4)*1.6*(i%3?1:.3));return b.mesh()});
      S.d.tub.position.set(S.x0,0,4.5);S.d.tub.scale.setScalar(.01);S.ball.visible=false;
    },
    step(S,t,dt){
      const tub=S.d.tub,x=S.x0,k=backOut(seg(t,0,.3))*(1-seg(t,2.5,2.8));
      const hot=t>.3&&t<2.3;tub.scale.set(k*(1+(hot?Math.sin(t*50)*.04:0)),Math.max(.01,k*(1-(hot?Math.sin(t*50)*.04:0))),k);tub.rotation.z=hot?Math.sin(t*31)*.03:0;
      if(hot){for(let i=0;i<(S.q<1?2:4);i++)S.em(x+rand(-1.5,1.5),5.5,4.5+rand(-1.5,1.5),rand(-9,9),rand(10,24),rand(-6,10),rand(1.3,2),rand(.7,1.15),CELL.popcorn,0xffffff,oChunk);
        if(Math.random()<.35)S.snd((A,tt,v)=>popSnd(A,tt,v*.8,1200+Math.random()*1600))}
      if(S.at(2.3)){S.shake(.6);S.burst(x,5.5,4.5,110,8,26,1.6,.7,1.2,[CELL.popcorn],[0xffffff],oChunk,.55);S.ring(x,5.5,4.5,0xfff6da,1,14,.45);S.snd((A,tt,v)=>{popSnd(A,tt,v*2,500);boomSnd(A,tt,v*.6,.6)})}
    }
  },
  { // 15 UFO Abduction: a saucer slides in, beams the ball up, does a little wiggle and shoots off
    dur:3,
    go(S){
      S.d.u=S.model('ufo',()=>{const g=new THREE.Group(),b=Build();
        b.sph(1,0x9aa8b6,0,0,0,5.4,1.05,5.4,20);b.cyl(5.5,5.5,.28,0x6b7785,0,0,0,0,0,0,24);b.cyl(1.6,2.6,.7,0x56636f,0,-1,0,0,0,0,16);
        for(let i=0;i<10;i++){const a=i/10*TAU;b.sph(.34,i%2?0xffd23f:0x3ee6ff,Math.cos(a)*4.6,-.35,Math.sin(a)*4.6)}
        b.sph(.85,0x6edb5a,0,1.55,0,1,1.15,1);for(const s of[-1,1]){b.sph(.3,0x14161f,s*.36,1.75,.66,1,1.4,.6);b.cyl(.04,.04,.7,0x6edb5a,s*.4,2.6,0,0,0,s*-.3);b.sph(.13,0xff4fb4,s*.5,2.95,0)}
        b.box(.5,.08,.1,0x14161f,0,1.2,.78);g.add(b.mesh());
        const dome=new THREE.Mesh(new THREE.SphereGeometry(2.3,18,10,0,TAU,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0xaef2ff,transparent:true,opacity:.3,depthWrite:false}));dome.position.y=.7;g.add(dome);
        const beam=new THREE.Mesh(new THREE.CylinderGeometry(1.6,4.6,1,20,1,true),glowMat(0x8dff9a,.28));beam.geometry.translate(0,-.5,0);beam.position.y=-1.2;g.add(beam);g.userData.beam=beam;return g});
      S.d.c=new V3(S.B.x,13.5,Math.max(S.B.z,1)+2);S.ball.visible=true;S.d.b0=S.ball.position.clone();S.d.u.userData.beam.visible=false;
      S.snd((A,t,v)=>{A.tone(t,.7,'sine',300,620,.07*v);A.tone(t,2.6,'triangle',95,105,.08*v)});
    },
    step(S,t,dt){
      const u=S.d.u,c=S.d.c,beam=u.userData.beam;
      if(t<.7){const k=backOut(seg(t,0,.7));u.position.set(lerp(c.x-46,c.x,k),lerp(34,c.y,k),lerp(16,c.z,k));u.rotation.z=(1-k)*-.5}
      else if(t<2.25){u.position.set(c.x+Math.sin(t*3)*.4,c.y+Math.sin(t*5)*.25,c.z);u.rotation.z=Math.sin(t*4)*.05+(t>1.95?Math.sin((t-1.95)*42)*.16:0)}
      else{const k=(t-2.25)/.75;u.position.set(c.x+k*k*70,c.y+k*k*46,c.z-k*10);u.rotation.z=-.6;if(Math.random()<.8)S.em(u.position.x,u.position.y,u.position.z,-6,-3,0,.5,rand(1,2),CELL.glow,0x8dff9a,oGlow)}
      u.rotation.y+=dt*2.2;
      const on=t>.7&&t<2;beam.visible=on;
      if(on){beam.scale.set(1,u.position.y-1.2,1);beam.material.opacity=.22+.08*Math.sin(t*30);
        const k=seg(t,.9,1.9),e=k*k*(3-2*k);S.ball.position.set(lerp(S.d.b0.x,c.x,Math.min(1,k*3))+Math.sin(t*14)*.35*(1-k),lerp(S.d.b0.y,c.y-1.2,e),lerp(S.d.b0.z,c.z,Math.min(1,k*3)));S.ball.rotation.y+=dt*6;S.ball.rotation.x+=dt*2;S.ball.scale.setScalar(1-seg(t,1.6,1.9)*.85);
        if(Math.random()<.7){const a=rand(0,TAU),r=rand(.5,3.5);S.em(c.x+Math.cos(a)*r,rand(.3,3),c.z+Math.sin(a)*r,0,rand(6,11),0,.9,rand(.3,.7),CELL.spark,pick([0x8dff9a,0xffffff]),O({add:1,fade:2,rot:0}))}}
      if(S.at(1.9)){S.ball.visible=false;S.snd((A,tt,v)=>tingSnd(A,tt,v*1.5,1600));S.ring(c.x,c.y-1,c.z,0x8dff9a,1,8,.4)}
      if(S.at(2.25))S.snd((A,tt,v)=>A.tone(tt,.6,'sine',500,2600,.09*v));
    }
  },
  { // 16 Shark Attack: a fin circles a pool in the floor, then the shark leaps, swallows the ball and dives back in
    dur:2.9,
    go(S){
      S.d.s=S.model('shark',()=>{const g=new THREE.Group(),b=Build(),tmp=new THREE.Group(),gr=0x6f8196,wh=0xf4f6ff;
        const body=G.loft(tmp,[[-5.2,.15,-.1,.4],[-4,.75,-.7,.9],[-2,1.5,-1.3,1.5],[.5,1.9,-1.6,1.75],[2.6,1.75,-1.4,1.5],[4.2,1.2,-.7,1.05],[5.2,.4,-.1,.5]],null,{n:2.4,s:22,m:16}).geometry;b.add(body,gr);
        const belly=G.loft(tmp,[[-4,.6,-.85,-.2],[-2,1.3,-1.45,-.3],[.5,1.7,-1.75,-.4],[2.6,1.55,-1.55,-.3],[4.3,1,-.85,0]],null,{n:2.4,s:16,m:14}).geometry;b.add(belly,wh);
        b.add(new THREE.ConeGeometry(1,2.8,4),gr,0,2.6,.3,-.5,0,0,.25,1,1);                                   // dorsal fin
        for(const s of[-1,1]){b.add(new THREE.ConeGeometry(.8,2.6,4),gr,s*2.2,-.9,.8,0,0,s*-1.9,1,1,.25);   // side fins
          b.sph(.34,wh,s*1.25,.55,3.9);b.sph(.2,0x14161f,s*1.38,.58,4.1);                                    // eyes
          for(let i=0;i<3;i++)b.box(.06,.9,.5,0x4f6076,s*1.82,.1,1.6-i*.5,0,0,s*.15)}                        // gills
        b.add(new THREE.ConeGeometry(.9,2.6,4),gr,0,1.1,-6,-.9,0,0,.25,1,1);b.add(new THREE.ConeGeometry(.8,2,4),gr,0,-.8,-5.8,-2.2,0,0,.25,1,1); // tail
        b.box(1.9,.5,1.5,0xc81e2e,0,-.75,4.5);for(let i=0;i<7;i++){b.add(new THREE.ConeGeometry(.16,.5,4),wh,-.84+i*.28,-.45,5.15,Math.PI,0,0);b.add(new THREE.ConeGeometry(.16,.5,4),wh,-.84+i*.28,-1.05,5.05)}
        const m=b.mesh();m.scale.setScalar(1.35);g.add(m);g.rotation.order='YXZ';return g});
      S.d.w=S.model('water',()=>{const m=new THREE.Mesh(new THREE.CircleGeometry(1,36),new THREE.MeshBasicMaterial({color:0x1f6fd0,transparent:true,opacity:.82,depthWrite:false}));m.rotation.x=-Math.PI/2;m.renderOrder=1;return m});
      S.d.c=new V3(S.x0,0,5);S.d.w.position.set(S.d.c.x,.1,S.d.c.z);S.d.w.scale.setScalar(.01);S.ball.visible=true;S.d.b0=S.ball.position.clone();
      S.snd((A,t,v)=>{for(let i=0;i<4;i++){A.tone(t+i*.22,.18,'sawtooth',55,55,.16*v);A.tone(t+i*.22+.11,.1,'sawtooth',58,58,.16*v)}});
    },
    step(S,t,dt){
      const s=S.d.s,c=S.d.c,w=S.d.w,R0=8.5;
      w.scale.setScalar(Math.max(.01,R0*backOut(seg(t,0,.3))*(1-seg(t,2.5,2.9))));
      if(t<.95){const k=seg(t,.1,.8);S.ball.position.set(lerp(S.d.b0.x,c.x,k),lerp(S.d.b0.y,BR*.7,k)+Math.sin(t*7)*.25,lerp(S.d.b0.z,c.z,k));S.ball.rotation.z=Math.sin(t*5)*.3}
      else if(t<1.36){const k=seg(t,.95,1.36);S.ball.position.set(c.x,lerp(BR*.7,12,1-(1-k)*(1-k)),c.z);S.ball.rotation.x+=dt*9}else S.ball.visible=false;
      if(t<.95){const a=t*6.5;s.position.set(c.x+Math.cos(a)*5.2,-3.9,c.z+Math.sin(a)*5.2);s.rotation.set(0,-a,0);if(Math.random()<.6)S.em(s.position.x,.3,s.position.z,rand(-1,1),rand(2,4),rand(-1,1),.4,rand(.3,.5),CELL.drop,0xcfeaff,oDrop)}
      else if(t<2.15){const a=seg(t,.95,2.15)*Math.PI;s.position.set(c.x-Math.cos(a)*6.5,Math.sin(a)*13-3,c.z);s.rotation.set(-Math.atan2(13*Math.cos(a),6.5*Math.sin(a)),Math.PI/2,0)}
      else s.position.y=-30;
      const splash=(x,n)=>{S.burst(x,.4,c.z,n,8,22,1.1,.4,.9,[CELL.drop,CELL.disc],[0xcfeaff,0x5cc8ff,0xffffff],oDrop,.8);S.ring(x,.2,c.z,0xcfeaff,1,13,.6,1);S.shake(.6);S.snd((A,tt,v)=>{A.noise(tt,.5,900,.6,.4*v);A.noise(tt,.3,300,.7,.3*v,'lowpass')})};
      if(S.at(.97))splash(c.x-6,70);if(S.at(1.36))S.snd((A,tt,v)=>{A.noise(tt,.09,700,1,.4*v);A.tone(tt,.1,'square',140,70,.1*v)});if(S.at(2.05))splash(c.x+6,90);
    }
  },
  { // 17 Giant Airhorn: an air horn pops out of the pitch and honks three times
    dur:2.7,
    go(S){
      S.d.h=S.model('horn',()=>{const g=new THREE.Group(),b=Build();b.cyl(1.5,1.5,4.6,0xf4f6ff,0,2.3,0,0,0,0,16);b.cyl(1.53,1.53,1.5,0xd93636,0,2.4,0,0,0,0,16);b.cyl(1.2,1.5,.5,0xaeb6c2,0,4.85,0,0,0,0,16);b.cyl(.5,.5,.9,0x6b7785,0,5.5,0,0,0,0,10);b.box(1.5,.5,.7,0xd93636,0,5.9,.5);
        b.cyl(3.6,.55,5.2,0xd93636,0,7.4,3,1.15,0,0,18,true);b.cyl(3.75,3.6,.3,0xffd23f,0,8.46,5.36,1.15,0,0,18,true);const m=b.mesh(new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));g.add(m);return g});
      S.d.h.position.set(S.x0,-12,3);S.d.k=0;S.ball.visible=false;
    },
    step(S,t,dt){
      const h=S.d.h,x=S.x0;
      h.position.y=lerp(-12,0,backOut(seg(t,0,.3)))-seg(t,2.35,2.7)*14;S.d.k=Math.max(0,S.d.k-dt*3.2);
      const k=S.d.k;h.scale.set(1+k*.22,1-k*.16,1+k*.22);h.rotation.x=-k*.12+Math.sin(t*70)*k*.02;
      [.42,1.02,1.62].forEach((tt,i)=>{
        if(S.at(tt)){S.d.k=1;S.shake(.75);
          S.snd((A,t0,v)=>{const d=i===2?.75:.42;for(const f of[311,370,466]){A.tone(t0,d,'sawtooth',f,f*.98,.13*v);A.tone(t0,d,'square',f*.5,f*.5,.05*v)}});
          S.burst(x,8.5,6,24,10,22,.5,.3,.6,[CELL.strip],[0xffffff,0xffd23f],O({add:1,fade:0,drag:2,rot:0}),0)}
      });
      for(const tt of[.42,1.02,1.62])for(let j=0;j<3;j++)if(S.at(tt+j*.1))S.ring(x,9.2,7.5+j*1.5,0xffffff,2.5,7+j*2.5,.4,0,.9); // sound waves leaving the bell
    }
  },
  { // 18 Money Rain: a giant gold coin flips up from the spot while play money and coins pour from the roof
    dur:2.8,
    go(S){
      S.d.c=S.model('bigcoin',()=>{const b=Build();b.cyl(3.2,3.2,.5,0xffd23f,0,0,0,Math.PI/2,0,0,28);b.tor(3.2,.3,0xc98a12,0,0,0);for(const s of[-1,1]){b.cyl(2.3,2.3,.1,0xe9b93a,0,0,s*.26,Math.PI/2,0,0,24);const st=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?.75:1.75;st[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r)}b.add(new THREE.ShapeGeometry(st),0xfff2a8,0,0,s*.33,0,s<0?Math.PI:0,0)}return b.mesh()});
      S.d.c.position.set(S.x0,-4,4.5);S.ball.visible=false;
    },
    step(S,t,dt){
      const c=S.d.c,x=S.x0,k=seg(t,.1,1.5);
      c.position.y=t<1.5?3.4+Math.sin(k*Math.PI)*11-4*(1-seg(t,.1,.3)):3.4-seg(t,2.4,2.8)*9;
      c.rotation.x=t<1.5?k*TAU*3:0;c.rotation.y=t>1.5?Math.sin((t-1.5)*13)*Math.exp(-(t-1.5)*3)*.7:0;c.rotation.z=t>1.5?Math.sin((t-1.5)*13+1)*Math.exp(-(t-1.5)*3)*.2:0;
      if(S.at(1.5)){S.shake(.6);S.ring(x,.2,4.5,0xffd23f,1,12,.5,1);S.snd((A,tt,v)=>{tingSnd(A,tt,v*2,1250);tingSnd(A,tt+.08,v*2,1870);boomSnd(A,tt,v*.5,.5)})}
      if(t<2.2){
        for(let i=0;i<(S.q<1?2:4);i++){const bill=Math.random()<.6;S.em(rand(-GW+2,GW-2),rand(17,22),rand(1,9),rand(-2,2),bill?rand(-9,-5):rand(-14,-8),rand(-1,2),bill?2.4:2,bill?rand(1,1.4):rand(.6,.9),bill?CELL.bill:CELL.coin,0xffffff,bill?oBill:oCoin)}
        if(Math.random()<.3)S.em(rand(-GW,GW),rand(2,14),rand(1,8),0,0,0,.4,rand(.5,1.1),CELL.spark,0xffe9a8,O({add:1,fade:2,rot:0}));
        if(t>.6&&Math.random()<.25)S.snd((A,tt,v)=>tingSnd(A,tt,v*.7,2000+Math.random()*1800));
      }
    }
  },
  { // 19 Pumpkin Splat: a giant pumpkin falls on the spot and bursts into goo, chunks and seeds
    dur:2.5,
    go(S){
      S.d.p=S.model('pumpkin',()=>{const b=Build();for(let i=0;i<9;i++){const a=i/9*TAU;b.sph(1,i%2?0xff8a1f:0xf07a12,Math.cos(a)*2.1,0,Math.sin(a)*2.1,1.9,3,1.9)}b.sph(1,0xe06a0c,0,0,0,2.6,2.9,2.6);
        b.cyl(.35,.6,1.6,0x5f7a2a,.15,3.4,0,0,0,-.25,7);for(const s of[-1,1])b.add(new THREE.ConeGeometry(.6,.9,3),0x2a1408,s*1.1,.8,3.75,Math.PI/2,0,s*.3);b.box(2.6,.5,.2,0x2a1408,0,-.7,3.85);for(let i=0;i<3;i++)b.box(.4,.4,.25,0xff8a1f,-.8+i*.8,-.55,3.9);return b.mesh()});
      S.d.g=S.model('goo',()=>{const m=new THREE.Mesh(new THREE.CircleGeometry(1,30),new THREE.MeshBasicMaterial({color:0xf07a12,transparent:true,opacity:.92,depthWrite:false}));m.rotation.x=-Math.PI/2;m.renderOrder=1;return m});
      S.d.g.visible=false;S.d.c=new V3(S.B.x,0,Math.max(S.B.z,1)+2.5);S.d.p.position.set(S.d.c.x,55,S.d.c.z);S.d.p.scale.setScalar(1);S.ball.visible=true;
      S.snd((A,t,v)=>A.tone(t,.5,'sine',600,150,.06*v));
    },
    step(S,t,dt){
      const p=S.d.p,c=S.d.c,g=S.d.g;
      if(t<.5){const k=seg(t,.08,.5);p.position.y=lerp(55,3,k*k);p.rotation.z=Math.sin(t*9)*.15}
      else if(t<.62){const k=(t-.5)/.12;p.position.y=3-k*2.6;p.scale.set(1+k*.9,1-k*.85,1+k*.9);S.ball.visible=false}
      if(S.at(.5)){S.shake(1);S.flash(.16);S.snd((A,tt,v)=>{A.noise(tt,.3,380,.8,.6*v,'lowpass');A.tone(tt,.25,'sine',120,45,.4*v);A.noise(tt+.02,.12,1400,1,.2*v)})}
      if(S.at(.62)){p.visible=false;g.visible=true;g.position.set(c.x,.1,c.z);
        S.burst(c.x,1,c.z,80,7,24,1.5,.6,1.5,[CELL.splat,CELL.seed,CELL.disc],[0xff8a1f,0xf07a12,0xffb347],oChunk,.5);S.burst(c.x,1,c.z,40,8,20,1.7,.3,.5,[CELL.seed],[0xfff0c8],oChunk,.6);
        S.burst(c.x,1,c.z,5,9,13,1.6,1,1.3,[CELL.drop],[0x5f7a2a],oChunk,.95);S.ring(c.x,.2,c.z,0xff8a1f,1,16,.5,1)}
      if(t>.62){g.scale.setScalar(1+backOut(seg(t,.62,.9))*7);g.material.opacity=.92*(1-seg(t,2,2.5))}
    }
  },
  { // 20 Goal Letters: G, O, A and L drop from the ceiling one by one; the L lands badly
    dur:3,
    go(S){
      const mk=(parts)=>()=>{const b=Build();for(const [w,h,x,y,r] of parts){b.box(w,h,1.6,0xffffff,x,y,0,0,0,r||0);b.box(w+.02,h+.02,.5,S.col,x,y,.7,0,0,r||0)}const m=b.mesh();m.userData.col=S.col;return m};
      const L={G:[[1.1,6,-1.7,3],[4.5,1.1,0,5.45],[4.5,1.1,0,.55],[1.1,2.6,1.7,1.85],[2.2,1,1.1,3.1]],O:[[1.1,6,-1.7,3],[1.1,6,1.7,3],[4.5,1.1,0,5.45],[4.5,1.1,0,.55]],
        A:[[1.1,6.4,-1.25,3,-.36],[1.1,6.4,1.25,3,.36],[2.6,1,0,2.2],[1.4,1,0,5.6]],L:[[1.1,6,-1.5,3],[4,1.1,0,.55]]};
      S.d.l=['G','O','A','L'].map((ch,i)=>{const key='let'+ch+S.col;const m=S.model(key,mk(L[ch]));m.position.set(-9.3+i*6.2,70,5.5);m.rotation.set(0,0,0);m.scale.setScalar(1);return m});
      S.ball.visible=false;
    },
    step(S,t,dt){
      S.d.l.forEach((m,i)=>{
        const t0=.08+i*.3,k=seg(t,t0,t0+.62);
        m.position.y=lerp(46,0,bounceOut(k));
        if(S.at(t0+.62/2.75)){S.shake(.6);S.snd((A,tt,v)=>{boomSnd(A,tt,v*.9,.6);A.tone(tt,.3,'triangle',[196,247,294,392][i],[196,247,294,392][i],.1*v)});for(let j=0;j<Math.round(10*S.q);j++)S.em(m.position.x+rand(-2.5,2.5),.5,5.5+rand(-1,1),rand(-6,6),rand(1,3),rand(-2,5),.8,rand(2,3.2),CELL.puff,0xdadfea,oDust)}
        if(i===3){const f=seg(t,1.75,2.25);m.rotation.z=k<1?0:-Math.sin(seg(t,1.3,1.75)*Math.PI)*.12;m.rotation.x=f*f*Math.PI/2;if(S.at(2.25)){S.shake(.5);S.snd((A,tt,v)=>boomSnd(A,tt,v*.8,.5));for(let j=0;j<8;j++)S.em(m.position.x+rand(-2,2),.5,9+rand(-1,3),rand(-5,5),rand(1,2),rand(1,5),.7,rand(2,3),CELL.puff,0xdadfea,oDust)}}
        else if(t>2.35){const h=seg(t,2.35+i*.07,2.75+i*.07);m.position.y=Math.sin(h*Math.PI)*2.4;m.rotation.z=Math.sin(h*TAU)*.08}
      });
      if(S.at(2.35))S.burst(S.x0*0,9,6,60,6,18,1.4,.4,.7,[CELL.strip,CELL.star],CONF,oConf,.5);
    }
  },
  { // 21 Flock of Birds: the ball wobbles, pops into feathers and flies off as a flock
    dur:2.6,
    go(S){S.d.c=new V3(S.B.x,Math.max(S.B.y,2.6),Math.max(S.B.z,1)+1.5);S.ball.visible=true;S.ball.position.copy(S.d.c)},
    step(S,t,dt){
      const c=S.d.c;
      if(t<.45){const k=t/.45;S.ball.scale.set(1+Math.sin(t*40)*.1*k,1-Math.sin(t*40)*.1*k,1+Math.sin(t*40)*.1*k);S.ball.position.y=c.y+Math.abs(Math.sin(t*14))*k}
      if(S.at(.45)){S.ball.visible=false;S.flash(.14);S.ring(c.x,c.y,c.z,0xffffff,1,10,.4);S.burst(c.x,c.y,c.z,50,3,11,1.7,.8,1.4,[CELL.feather],[0xffffff,0xeef2ff],oFeather);S.burst(c.x,c.y,c.z,8,1,4,.5,2,3.4,[CELL.puff],[0xffffff],oPuff);
        const n=Math.round(16*(S.q<1?.6:1));for(let i=0;i<n;i++){const s=i%2?1:-1,r=Math.floor(i/2);S.em(c.x+s*r*.5,c.y+rand(-.5,.5),c.z,s*(2+r*1.1)+rand(-1,1),rand(7,10),rand(4,9),2,rand(1.8,2.5),CELL.birdA,pick([0xffffff,0xdadfea,0xbfe4ff]),oBird)}
        S.snd((A,tt,v)=>{popSnd(A,tt,v,900);for(let i=0;i<9;i++){const f=2200+Math.random()*1500;A.tone(tt+.1+i*.11,.07,'sine',f,f*1.25,.05*v)}})}
      if(S.at(1.5))S.em(c.x+rand(-1,1),c.y+3,c.z,0,-.4,0,1.9,1.3,CELL.feather,0xffffff,O({grav:.8,wob:5,spin:1.5,drag:1}));
    }
  },
  // 22 Carbon Star: an exclusive gift (../captains.js GIFTS). It is drawn by carbon-star.js, never by a Stage here, and
  // only for a goal by a player who has it (index.html checks the scorer's account); this entry only lets the Kit list
  // it for those players. An older page has no 22 here and plays the fireball.
  {gift:'bb-goal-carbon-star',dur:0},
  // ---- second wave (Nov 2026)
  { // 23 Ticker Tape Parade: white and gold paper streams down over the goal mouth while the crowd roars
    dur:2.6,
    go(S){S.ball.visible=false;S.flash(.12);S.snd((A,t,v)=>{A.noise(t,2.4,1100,.4,.22*v,'bandpass');A.noise(t+.1,2.2,2600,.6,.08*v,'bandpass')})},
    step(S,t,dt){
      if(t<2.1)for(let i=0;i<(S.q<1?3:6);i++)S.em(rand(-GW+2,GW-2),rand(15,20),rand(1,9),rand(-2,2),rand(-5,-2),rand(-1,1),2.2,rand(.55,.85),CELL.strip,pick([0xffffff,0xffffff,0xffe9a8,S.col]),oConf);
      if(S.at(.05)){S.ring(S.x0,.2,4,0xffffff,1,14,.5,1);S.burst(S.x0,1,3.5,60,8,20,1.3,.5,.8,[CELL.strip,CELL.square],[0xffffff,0xffe9a8,S.col],oConf,.7)}
      if(S.at(1.2))S.burst(S.x0,1,3.5,40,8,18,1.2,.5,.8,[CELL.strip],[0xffffff,0xffe9a8],oConf,.8);
    }
  },
  { // 24 Treasure Chest: a chest rises from the pitch, its rounded lid (half a cylinder) flies open and gold coins and gems pour out
    dur:2.7,
    go(S){
      S.d.b=S.model('chestB',()=>{const b=Build(),W=0x8a5a2b,D=0x5e3a1a,Gd=0xffd23f;b.box(6,3.2,3.6,W,0,1.6,0);for(const x of[-2.2,0,2.2])b.box(.4,3.3,3.7,Gd,x,1.6,0);b.box(6.1,.3,3.7,D,0,.15,0);b.box(.8,.9,.2,Gd,0,2.6,1.85);return b.mesh()});
      S.d.l=S.model('chestL',()=>{const b=Build(),W=0x8a5a2b,Gd=0xffd23f;b.add(new THREE.CylinderGeometry(1.8,1.8,6,12,1,false,0,Math.PI),W,0,0,1.8,0,0,Math.PI/2);for(const x of[-2.2,0,2.2])b.add(new THREE.CylinderGeometry(1.85,1.85,.42,12,1,false,0,Math.PI),Gd,x,0,1.8,0,0,Math.PI/2);b.box(6,.2,3.6,W,0,0,1.8);return b.mesh()});
      S.d.b.position.set(S.x0,-4,5);S.d.l.position.set(S.x0,-.8,5-1.8);S.d.l.rotation.set(0,0,0);S.ball.visible=false;
    },
    step(S,t,dt){
      const up=backOut(seg(t,0,.45))*(1-seg(t,2.3,2.7)),y=-3.4+3.4*up,b=S.d.b,l=S.d.l;
      b.position.y=y;b.scale.setScalar(Math.max(.01,.4+.6*up));l.scale.copy(b.scale);l.position.set(S.x0,y+3.2*b.scale.y,5-1.8*b.scale.z);
      l.rotation.x=-backOut(seg(t,.55,.85))*1.9;
      if(S.at(.6)){S.flash(.2);S.shake(.5);S.ring(S.x0,4,5,0xffd23f,1,14,.5);S.burst(S.x0,3.6,5,70,10,22,1.6,.5,.8,[CELL.coin],[0xffffff],oCoin,.75);S.burst(S.x0,3.6,5,30,4,12,1,.4,.8,[CELL.spark,CELL.ice],[0xffffff,0x8fd6ff,0xff5c9a,0x46e39a],oSpark,.6);
        S.snd((A,tt,v)=>{boomSnd(A,tt,v*.6,.6);for(let i=0;i<8;i++)tingSnd(A,tt+.05+i*.07,v,1600+Math.random()*1600)})}
      if(t>.65&&t<2)for(let i=0;i<(S.q<1?1:3);i++)S.em(S.x0+rand(-1.5,1.5),3.6,5+rand(-.6,.6),rand(-6,6),rand(10,18),rand(-2,7),1.6,rand(.5,.8),Math.random()<.8?CELL.coin:CELL.ice,Math.random()<.8?0xffffff:pick([0x8fd6ff,0xff5c9a,0x46e39a]),oCoin);
    }
  },
  { // 25 Floodlights: the stadium lights flash on one bank after another, then the goal mouth bursts with stars in your team colour
    dur:2.4,
    go(S){S.ball.visible=false},
    step(S,t,dt){
      const bank=(x,i)=>{S.em(x,12,1,0,0,0,.7,14,CELL.glow,0xfff6c8,oGlow);S.em(x,12,1,0,0,0,.5,6,CELL.star,0xffffff,oGlow);S.burst(x,12,1,24,4,12,.7,.6,1.1,[CELL.spark,CELL.star],[0xffffff,0xfff6c8],oSpark);S.snd((A,tt,v)=>A.noise(tt,.18,4000,.6,.25*v,'highpass'));if(i===3)S.flash(.2)};
      [[.05,-GW+2],[.35,GW-2],[.65,-GW*.4],[.95,GW*.4]].forEach(([tt,x],i)=>{if(S.at(tt))bank(x,i)});
      if(S.at(1.25)){S.shake(.7);S.flash(.3);S.ring(S.x0,4,3.5,S.col,1,20,.6);S.ring(S.x0,.2,3.5,0xffffff,1,16,.6,1);S.burst(S.x0,4,3.5,170,8,28,1.5,.6,1.3,[CELL.star,CELL.glow,CELL.spark],[S.col,0xffffff,S.col],oSpark);S.burst(S.x0,4,3.5,10,1,4,.6,3,5,[CELL.glow],[0xffffff],oGlow);S.snd((A,tt,v)=>{boomSnd(A,tt,v,1);A.noise(tt,1.4,1100,.4,.2*v,'bandpass')})}
      if(t>1.3&&t<2.1&&Math.random()<.6)S.em(rand(-GW,GW),rand(6,14),rand(1,7),0,0,0,.3,rand(.6,1.2),CELL.star,0xffffff,O({add:1,fade:2,rot:0}));
    }
  },
  // ---- third wave (Nov 2026). 27, 29, 31 and 32 are the big ones: each takes over a large part of the arena for about a second.
  { // 26 Giant Trophy: a gold cup taller than a car stack rises out of the pitch, turns, and fires streamers in your team colour
    dur:2.6,
    go(S){
      S.d.m=S.model('trophy',()=>{const b=Build(),Au=0xffc83a,D=0xc98a12,L=0xfff0a8;
        b.box(7,1.2,5,0x3a2a1a,0,.6,0);b.box(6.2,.3,4.4,Au,0,1.35,0);b.cyl(1.6,2.4,1.1,Au,0,2,0,0,0,0,20);b.cyl(.5,.75,2.6,D,0,3.8,0,0,0,0,16);b.sph(1,Au,0,5.2,0,1,.6,1);
        b.cyl(3.6,1.2,4.4,Au,0,7.6,0,0,0,0,24);b.cyl(3.62,3.62,.3,L,0,9.7,0,0,0,0,24);b.tor(3.6,.3,D,0,9.85,0,Math.PI/2,0,0);b.tor(2.1,.18,L,0,6.4,0,Math.PI/2,0,0);
        for(const s of[-1,1])b.tor(1.45,.34,Au,s*3.35,7.5,0,0,0,0);b.cyl(.9,.9,.25,L,0,7.7,2.45,Math.PI/2-.2,0,0,5);return b.mesh()});
      S.d.m.position.set(S.x0,-11,6);S.d.m.rotation.set(0,0,0);S.ball.visible=false;
      S.snd((A,t,v)=>{A.noise(t,.7,240,.6,.18*v,'lowpass');fanfare(A,t+.5,v,[523,659,784,1047,1047],.12)});
    },
    step(S,t,dt){
      const m=S.d.m,up=RM()?sm(0,.6,t):backOut(seg(t,0,.6)),dn=seg(t,2.15,2.6);m.position.y=-11+11*up-12*dn*dn;m.rotation.y=Math.sin(t*1.7)*.55;
      if(t<.55&&!RM())for(let i=0;i<(S.q<1?1:3);i++)S.em(S.x0+rand(-4,4),.4,6+rand(-3,3),rand(-4,4),rand(3,7),rand(-2,3),.8,rand(.9,1.5),CELL.puff,0xd8c49a,oDust);
      for(const tt of[.68,1.32])if(S.at(tt)){const y=m.position.y+10;S.burst(S.x0,y,6,80,8,18,1.7,.45,.8,[CELL.strip,CELL.square],[S.col,S.col,0xffd23f,0xffffff],oConf,.85);S.burst(S.x0,y,6,20,3,9,.8,.4,.8,[CELL.star,CELL.spark],[0xfff0a8,0xffffff],oSpark,.5);S.ring(S.x0,y,6,0xffd23f,1,9,.5,1);shk(S,.3);S.snd((A,t2,v)=>popSnd(A,t2,v,800))}
      if(t>.6&&t<2.1&&Math.random()<.6)S.em(S.x0+rand(-3.6,3.6),m.position.y+rand(3,10),6+rand(-1,3.5),0,0,0,.45,rand(.4,.8),CELL.spark,0xffffff,oZap);
    }
  },
  { // 27 Stadium Wave: the crowd's cards flip to your team colour in a bright wave that rolls twice round the whole bowl,
    // floodlights sweep the pitch and a pulse in your colour runs down the pitch lines from your goal
    dur:2.6,
    go(S){
      S.d.w=S.model('wave2',()=>{
        const g=new THREE.Group(),M=S.main;
        // the bowl (index.html: a rounded rectangle X0 by Z0 with corners of radius CR, the lower tier rising from (0,5) to
        // (42,30) outward and the upper from (42,39) to (88,72)); in stage units the scoring goal line is z=0, the far end z=2*AL
        const X0=M?G.AW+16:34,Z0=M?G.AL+17.6+16:46,CR=M?48:14,zc=M?G.AL:30,sp=M?5:2.2,ck=M?1:.45;
        const rows=M?[[3,7],[9,11.5],[15,16],[21,20.5],[27,25],[34,29],[45,41.5],[52,46.5],[60,52.5],[68,58.5],[77,65]]:[[1,2.5],[4,4.5],[7,6.5],[10,8.5]];
        const P=[],cs=[[X0-CR,Z0-CR,0],[-(X0-CR),Z0-CR,Math.PI/2],[-(X0-CR),-(Z0-CR),Math.PI],[X0-CR,-(Z0-CR),Math.PI*1.5]];
        for(const [cx,cz,a0] of cs)for(let k=0;k<=12;k++){const an=a0+k/12*Math.PI/2;P.push([cx+Math.cos(an)*CR,cz+Math.sin(an)*CR,Math.cos(an),Math.sin(an)])}
        P.push(P[0]);const cards=[];
        for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]);
          for(let s=0;s<l;s+=sp){const f=s/l,x=lerp(a[0],b[0],f),z=lerp(a[1],b[1],f),nx=lerp(a[2],b[2],f),nz=lerp(a[3],b[3],f),nl=Math.hypot(nx,nz);
            rows.forEach(([o,u],r)=>{const wx=x+nx/nl*o,wz=z+nz/nl*o,ph=(Math.atan2(wx,-wz)/TAU+1)%1;cards.push([wx,u,wz+zc,-nz/nl,nx/nl,ph,r/(rows.length-1),(r+Math.round(s/sp))%2])})}}
        const n=cards.length,C=new Float32Array(n*12),Q=new Float32Array(n*8),T=new Float32Array(n*8),A=new Float32Array(n*12),ix=new Uint32Array(n*6);
        cards.forEach((c,i)=>{for(let k=0;k<4;k++){const j=i*4+k;C.set([c[0],c[1],c[2]],j*3);Q.set([k&1?1:-1,k>>1],j*2);T.set([c[3],c[4]],j*2);A.set([c[5],c[6],c[7]],j*3)}ix.set([i*4,i*4+1,i*4+2,i*4+1,i*4+3,i*4+2],i*6)});
        const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(C,3));geo.setAttribute('aQ',new THREE.BufferAttribute(Q,2));geo.setAttribute('aT',new THREE.BufferAttribute(T,2));geo.setAttribute('aP',new THREE.BufferAttribute(A,3));geo.setIndex(new THREE.BufferAttribute(ix,1));
        const cardM=new THREE.Mesh(geo,fxShader(
          'attribute vec2 aQ,aT;attribute vec3 aP;uniform float uT,uAll,uK;varying vec3 vC;varying float vA;uniform vec3 uCol;'+
          'void main(){float e=fract(aP.x-uT+.5)-.5,h=max(exp(-pow(e/.08,2.)),uAll),done=max(step(aP.x,uT),step(1.,uT));'+
          'vec3 p=position+vec3(aT.x,0.,aT.y)*aQ.x*2.3*uK+vec3(0.,(aQ.y*(2.+3.4*h)+h*3.2-1.)*uK,0.);'+
          'vec3 c=mix(vec3(1.),uCol,.55+.45*aP.z);vC=mix(uCol*1.05,c*(.8+.6*h)+vec3(1.)*h*aQ.y*.3,h);vA=max(h,done*.8);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
          'varying vec3 vC;varying float vA;uniform float uA;void main(){float a=vA*uA;if(a<.01)discard;gl_FragColor=vec4(vC,a);}',
          {uT:{value:-1},uAll:{value:0},uA:{value:1},uK:{value:ck},uCol:{value:new THREE.Color()}}));cardM.frustumCulled=false;cardM.renderOrder=3;g.add(cardM);
        // a pulse in your colour running down the pitch along its length, lighting stripes like painted lines
        const pg=new THREE.PlaneGeometry(M?G.AW*2-4:56,M?G.AL*2:60);pg.rotateX(-Math.PI/2);pg.translate(0,0,M?G.AL:30);
        const pitch=new THREE.Mesh(pg,fxShader('varying vec2 vP;void main(){vP=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          'varying vec2 vP;uniform float uZ,uA,uS;uniform vec3 uCol;void main(){float b=exp(-pow((vP.y-uZ)/(9.*uS),2.))+.25*exp(-pow((vP.y-uZ+14.*uS)/(14.*uS),2.));'+
          'float ln=1.-smoothstep(.0,.5*uS+.2,abs(fract(vP.x/(10.*uS))-.5)*10.*uS);float ed=1.-smoothstep(0.,1.2,min(abs(vP.x)-(' +(M?(G.AW-3).toFixed(1):'27.')+ '),0.)*-1.);'+
          'gl_FragColor=vec4(uCol*b*(.25+.75*max(ln,ed))*uA*.8,1.);}',
          {uZ:{value:-50},uA:{value:0},uS:{value:M?1:.4},uCol:{value:new THREE.Color()}},{blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
        pitch.position.y=.06;pitch.frustumCulled=false;pitch.renderOrder=2;g.add(pitch);
        // four floodlight beams from the corners of the roof
        const cg=new THREE.ConeGeometry(M?6:2.4,1,24,1,true);cg.translate(0,-.5,0);cg.rotateX(-Math.PI/2);
        const beams=[[1,1],[-1,1],[1,-1],[-1,-1]].map(([sx,sz])=>{const m=new THREE.Mesh(cg,glowMat(0xffffff,0));m.position.set(sx*(X0-CR*.6),M?90:24,sz*(Z0-CR*.6)+zc);m.frustumCulled=false;m.renderOrder=4;g.add(m);return m});
        g.userData={cardM,pitch,beams};return g});
      const U=S.d.w.userData;U.cardM.material.uniforms.uCol.value.setHex(S.col);U.pitch.material.uniforms.uCol.value.setHex(S.col);U.cardM.material.uniforms.uT.value=-1;
      S.ball.visible=false;S.burst(S.x0,3,3,50,6,16,1.3,.45,.8,[CELL.strip,CELL.square],[S.col,0xffffff],oConf,.8);
      S.snd((A2,t,v)=>{A2.noise(t,2.5,700,.5,.2*v,'bandpass');A2.noise(t+.25,2.1,1500,.8,.08*v,'bandpass');for(let i=0;i<6;i++)A2.tone(t+.25+i*.36,.28,'triangle',440+i*50,560+i*50,.035*v)});
    },
    step(S,t){
      const U=S.d.w.userData,cu=U.cardM.material.uniforms,pu=U.pitch.material.uniforms,rm=RM(),M=S.main,L=M?G.AL*2:60,env=sm(0,.15,t)*(1-sm(2.1,2.55,t));
      if(rm){cu.uT.value=2;cu.uAll.value=.6*env;pu.uA.value=0}
      else{cu.uT.value=-.05+2.1*sm(.1,2.15,t)*1;cu.uAll.value=0;pu.uZ.value=((t-.1)%1.05)/1.05*(L+30)-15;pu.uA.value=env}
      cu.uA.value=env;
      U.beams.forEach((m,i)=>{const a=t*(rm?.3:1.6)+i*1.7,r=(M?35:10)*(.5+.5*Math.sin(t*1.3+i));_ip.set(Math.cos(a)*r,0,(M?40:14)+Math.sin(a)*r*.8);const d=m.position.distanceTo(_ip);m.scale.set(1,1,d);S.root.updateMatrixWorld();m.lookAt(S.d.w.localToWorld(_ip));m.material.opacity=.09*env;m.material.color.setHex(i%2?0xffffff:S.col)});
    }
  },
  { // 28 Robot Salute: steel parts fly in and bolt themselves together into a robot, which salutes and then jets off
    dur:2.7,
    go(S){
      S.d.r=S.model('robot'+S.col,()=>{const st=0xb8bccf,dk=0x4a5060,root=new THREE.Group(),mk=f=>{const b=Build();f(b);const m=b.mesh();root.add(m);return m};
        const legs=mk(b=>{for(const s of[-1,1]){b.box(1.4,3.6,1.6,st,s*1.2,2.2,0);b.box(1.9,.7,2.6,dk,s*1.2,.35,.4);b.sph(.6,dk,s*1.2,2.4,.4)}});
        const body=mk(b=>{b.box(4.8,4,2.8,st,0,6.3,0);b.box(2.8,1.7,.12,S.col,0,6.6,1.42);b.sph(.4,0xffd23f,0,7.75,1.38,1,1,.5);b.box(5,.5,3,dk,0,4.45,0);
          for(const s of[-1,1])b.sph(.85,dk,s*2.75,7.8,0);b.box(1,3.2,1.1,st,-3,5.9,0);b.sph(.62,dk,-3,4.05,0);for(let i=0;i<3;i++)b.box(.35,.12,.05,0x3fd2ff,-1.4+i*.5+.0,5.5,1.42)});
        const head=mk(b=>{b.box(2.8,2.1,2.3,st,0,9.45,0);b.box(2.2,.55,.12,0x3fd2ff,0,9.6,1.17);for(const s of[-1,1])b.cyl(.35,.35,.4,dk,s*1.55,9.45,0,0,0,Math.PI/2,10);b.cyl(.08,.08,1,dk,0,11,0,0,0,0,6);b.sph(.25,0xff3b3b,0,11.55,0)});
        const arm=new THREE.Group();arm.position.set(3,7.8,0);root.add(arm);const ab=Build();ab.box(1,3.2,1.1,st,0,-1.75,0);ab.sph(.62,dk,0,-3.6,0);const am=ab.mesh();arm.add(am);
        root.userData={legs,body,head,arm};return root});
      const r=S.d.r,U=r.userData;r.position.set(S.x0,0,5);r.rotation.set(0,0,0);r.scale.setScalar(1);for(const k of['legs','body','head'])U[k].position.set(0,-40,0);U.arm.rotation.set(0,0,0);U.arm.position.set(3,-40,0);
      S.ball.visible=false;S.burst(S.x0,3,3,30,5,12,.8,.3,.6,[CELL.spark],[0x3fd2ff,0xffffff],oSpark);
    },
    step(S,t,dt){
      const r=S.d.r,U=r.userData,fly=(a,b)=>bounceOut(seg(t,a,b)),rm=RM();
      const lk=fly(0,.3),bk=fly(.25,.55),ak=fly(.45,.72),hk=fly(.62,.88);
      U.legs.position.set(0,-9*(1-lk),0);U.body.position.set(0,14*(1-bk),0);U.head.position.set(0,16*(1-hk),0);U.arm.position.set(3+12*(1-ak),7.8,0);
      for(const [tt,y] of[[.3,1],[.55,4.5],[.72,7.8],[.88,9]])if(S.at(tt)){S.burst(S.x0,y,5.5,18,3,8,.5,.3,.6,[CELL.spark,CELL.square],[0xffd23f,0xffffff,0xb8bccf],oSpark);shk(S,.15);S.snd((A,t2,v)=>{A.tone(t2,.08,'square',220+y*30,90,.08*v);A.noise(t2,.06,3000,1,.12*v,'highpass')})}
      if(S.at(.95)){S.burst(S.x0,9.6,6.2,16,1,4,.5,.4,.8,[CELL.glow,CELL.star],[0x3fd2ff,0xffffff],oGlow);S.snd((A,t2,v)=>{A.tone(t2,.12,'sine',660,880,.06*v);A.tone(t2+.14,.25,'sine',990,990,.06*v)})}
      const sal=backOut(seg(t,1.05,1.35))*(1-seg(t,1.95,2.1));U.arm.rotation.z=sal*2.45+(t>1.35&&t<1.95?Math.sin((t-1.35)*16)*.12:0);U.arm.rotation.x=-sal*.35;
      if(S.at(1.3))S.snd((A,t2,v)=>fanfare(A,t2,v,[392,523,659],.1,'square',.035));
      if(t>2.0){const k=t-2.0;if(rm)r.scale.setScalar(Math.max(.01,1-seg(t,2.05,2.5)));else{r.position.y=k*k*60;for(let i=0;i<(S.q<1?2:4);i++)for(const s of[-1,1])S.em(S.x0+s*1.2+rand(-.3,.3),r.position.y-.2,5.3,rand(-1,1),-rand(8,14),rand(-1,1),.35,rand(.5,.9),pick([CELL.flame,CELL.glow]),pick([0xffd23f,0xff8a1f,0xffffff]),O({add:1,grow:-.5,fade:0,rot:0}))}
        if(S.at(2.02))S.snd((A,t2,v)=>{A.noise(t2,.6,500,.6,.2*v,'lowpass');A.tone(t2,.6,'sawtooth',120,600,.04*v)})}
    }
  },
  { // 29 Tidal Wave: a wall of water rises in the goal mouth, rolls out across half the pitch and crashes down in spray
    dur:2.5,
    go(S){
      const A=area(S);
      S.d.w=S.model('tide',()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1,56,18),fxShader(
        'uniform float uZ,uH,uL,uW,uT;varying float vS,vF;varying vec2 vU;void main(){float s=uv.y,u=uv.x-.5,x=u*uW;'+
        'float tp=smoothstep(.5,.36,abs(u)),hx=uH*(.84+.16*sin(x*.09+uT*2.)+.08*sin(x*.23-uT*3.))*(.15+.85*tp);'+
        'float y=hx*pow(s,.85)-pow(max(s-.86,0.)/.14,2.)*hx*.28;float z=uZ-(1.-s)*(1.-s)*uL*.8+pow(max(s-.55,0.)/.45,2.)*uL;'+
        'vS=s;vU=vec2(u,s);vF=tp;gl_Position=projectionMatrix*modelViewMatrix*vec4(x,y,z,1.);}',
        'uniform float uA,uT;varying float vS,vF;varying vec2 vU;void main(){float s=vS;vec3 c=mix(vec3(.03,.27,.6),vec3(.32,.8,1.),smoothstep(.1,.85,s));'+
        'c+=(sin(vU.x*95.+s*14.-uT*5.)*.5+.5)*.07;float fm=smoothstep(.8,.97,s)+(1.-smoothstep(0.,.1,s))*.6;fm*=.7+.3*sin(vU.x*150.+uT*9.);c=mix(c,vec3(.95,.98,1.),clamp(fm,0.,1.));'+
        'gl_FragColor=vec4(c,uA*.74*clamp(vF*1.7,0.,1.));}',
        {uZ:{value:0},uH:{value:0},uL:{value:4},uW:{value:A.w*1.7},uT:{value:0},uA:{value:0}}));m.frustumCulled=false;m.renderOrder=3;return m});
      S.d.w.position.set(0,0,0);S.ball.visible=false;S.d.crash=0;
      S.burst(S.x0,2,2,50,6,16,1,.3,.6,[CELL.drop,CELL.disc],[0x5cc8ff,0xffffff],oDrop,.8);
      S.snd((A2,t,v)=>{A2.noise(t,1.9,320,.5,.26*v,'lowpass');A2.noise(t+.2,1.6,900,.4,.1*v,'bandpass');A2.noise(t+1.5,1,500,.5,.3*v,'lowpass');A2.noise(t+1.5,.8,2500,.6,.1*v,'highpass')});
    },
    step(S,t){
      const u=S.d.w.material.uniforms,A=area(S),k=A.k,rm=RM();u.uT.value=t;
      let Z,H,L;
      if(rm){Z=8*k;H=7*k*sm(0,.8,t)*(1-sm(1.6,2.3,t));L=3*k;u.uA.value=1-sm(1.9,2.4,t)}
      else{const go=sm(.3,1.55,t),fall=seg(t,1.5,1.85);Z=(2+60*go)*k;H=(15*sm(0,.35,t)+4*go)*k*(1-fall*fall);L=(4+5*go+10*fall)*k;u.uA.value=1-sm(1.75,2.15,t)}
      u.uZ.value=Z;u.uH.value=H;u.uL.value=L;
      const n=rm?1:(S.q<1?3:6);
      if(H>1)for(let i=0;i<n;i++){const x=rand(-.42,.42)*u.uW.value;S.em(x,H*.95,Z+L*.95,rand(-1,1),rand(2,6),rand(2,6),.6,rand(.3,.6)+k*.2,pick([CELL.drop,CELL.disc,CELL.puff]),pick([0xffffff,0xbfe9ff]),oDrop)}
      if(!rm&&S.at(1.6)){shk(S,.8);const m=Math.round(70*S.q);for(let i=0;i<m;i++){const x=rand(-.45,.45)*u.uW.value;S.em(x,rand(1,4)*k,Z+L,rand(-3,3),rand(8,18)*k+3,rand(2,10),rand(.9,1.4),rand(.5,1.1)*(k+.3),pick([CELL.drop,CELL.disc]),pick([0xffffff,0xbfe9ff,0x5cc8ff]),oDrop)}
        for(let i=0;i<Math.round(16*S.q);i++)S.em(rand(-.45,.45)*u.uW.value,1,Z+L*.6,rand(-2,2),rand(1,3),rand(0,4),1.1,rand(2,3.5)*k+.5,CELL.puff,0xeaf6ff,oPuff);
        for(const x of[-.25,0,.25])S.ring(x*u.uW.value,.25,Z+L,0xbfe9ff,1,14*k+2,.7,1)}
    }
  },
  { // 30 Aurora: the ball floats up and melts into curtains of green and violet light that ripple over the goal
    dur:2.7,
    go(S){
      S.d.c=S.model('aurora',()=>{const g=new THREE.Group(),mat=fxShader(
        'uniform float uT,uW;varying vec2 vU;varying float vX;void main(){vU=uv;vec3 p=position;float x=p.x*uW;p.z+=sin(x*.08+uT*.9)*2.5+sin(x*.21-uT*1.4)*1.;p.x=x;vX=x;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
        'uniform float uT,uA;varying vec2 vU;varying float vX;void main(){float v=vU.y;float r=.55+.45*sin(vX*.9+uT*1.3)*sin(vX*2.3-uT*.7+1.)+.25*sin(vX*5.1+uT*2.);'+
        'float a=smoothstep(0.,.12,v)*pow(1.-v,1.3)*smoothstep(.0,.12,vU.x)*smoothstep(1.,.88,vU.x);vec3 c=mix(vec3(.15,1.,.5),vec3(.65,.3,1.),smoothstep(.2,.9,v))+vec3(.6,1.,.8)*(1.-smoothstep(0.,.18,v))*.6;'+
        'gl_FragColor=vec4(c*a*max(r,0.)*uA*.8,1.);}',
        {uT:{value:0},uA:{value:0},uW:{value:1}},{blending:THREE.AdditiveBlending});
        for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1,48,1),mat);m.frustumCulled=false;m.renderOrder=3;g.add(m)}g.userData={mat};return g});
      const A=area(S),k=S.main?1:.5;S.d.c.children.forEach((m,i)=>{m.scale.set(1,16*k,1);m.position.set(S.x0*.5+(i-1)*6*k,(16+i*3)*k,(6+i*6)*k)});S.d.c.userData.mat.uniforms.uW.value=50*k;void A;
      S.ball.visible=true;S.d.b0=S.ball.position.clone();
      S.snd((A2,t,v)=>{for(const [f,d] of[[220,0],[277,.3],[330,.6],[440,.9]])A2.tone(t+d,2.2-d,'sine',f,f*1.01,.05*v);A2.noise(t,2.5,1800,.3,.03*v,'bandpass')});
    },
    step(S,t){
      const u=S.d.c.userData.mat.uniforms,k=S.main?1:.5;u.uT.value=t;u.uA.value=sm(.5,1.3,t)*(1-sm(2,2.6,t));
      if(t<1.1){const e=sm(0,1.1,t);S.ball.position.set(lerp(S.d.b0.x,S.x0*.5,e),lerp(S.d.b0.y,15*k,e),lerp(S.d.b0.z,8*k,e));S.ball.scale.setScalar(Math.max(.02,1-e*e));S.ball.rotation.y+=.05;
        if(Math.random()<.7)S.em(S.ball.position.x+rand(-1,1),S.ball.position.y+rand(-1,1),S.ball.position.z,rand(-1,1),rand(0,2),rand(-1,1),.6,rand(.3,.6),CELL.glow,pick([0x46e39a,0xb46cff]),oGlow)}
      else S.ball.visible=false;
      if(S.at(1.1))S.burst(S.x0*.5,15*k,8*k,60,3,11,1.3,.3,.7,[CELL.star,CELL.spark,CELL.glow],[0x46e39a,0xb46cff,0xffffff],O({add:1,fade:2,drag:1.2,grav:-.6}));
      if(t>1&&t<2.3&&Math.random()<.5)S.em(rand(-30,30)*k,rand(18,32)*k,rand(4,20)*k,0,0,0,.6,rand(.3,.6),CELL.star,0xffffff,O({add:1,fade:2,rot:0}));
    }
  },
  { // 31 Light Dragon: a dragon made of light bursts out of the net with its jaws open, beats its wings through one loop
    // over the goal end and dives back into the goal. Body, head, wings and tail fan are meshes made once and kept; the
    // body's rings are moved along the flight path every frame (no new objects).
    dur:2.7,
    go(S){
      const NS=40,NR=10;
      S.d.dr=S.model('dragon',()=>{const g=new THREE.Group();
        const pos=new Float32Array((NS+1)*NR*3),uv=new Float32Array((NS+1)*NR*2),ix=[];
        for(let i=0;i<=NS;i++)for(let j=0;j<NR;j++){uv.set([i/NS,j/NR],(i*NR+j)*2);if(i<NS){const a=i*NR+j,b=i*NR+(j+1)%NR,c=a+NR,d=b+NR;ix.push(a,c,b,b,c,d)}}
        const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));bg.setAttribute('uv',new THREE.BufferAttribute(uv,2));bg.setIndex(ix);
        const body=new THREE.Mesh(bg,fxShader('varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          'varying vec2 vU;uniform float uA,uT;void main(){float u=vU.x,top=.5+.5*cos(vU.y*6.2832);vec3 c=mix(vec3(1.,.93,.6),vec3(1.,.42,.12),smoothstep(.0,.6,u));c=mix(c,vec3(.95,.2,.35),smoothstep(.55,1.,u));'+
          'float sc=smoothstep(.55,.95,fract(u*34.-uT*2.))*.35*(1.-top);c=c*(.75+.45*top)+vec3(1.,.95,.8)*(sc+pow(top,6.)*.35);gl_FragColor=vec4(c,uA);}',{uA:{value:0},uT:{value:0}},{depthWrite:true,side:THREE.DoubleSide}));
        body.frustumCulled=false;body.renderOrder=5;g.add(body);
        const hb=Build(),Au=0xffd86a,Or=0xff8a2e,W=0xffffff,R=0xff4a3a;
        hb.sph(1.15,Au,0,0,0,1,.85,1.2);hb.box(1.3,.62,1.9,Au,0,.08,1.5);hb.box(1.15,.26,1.7,Or,0,-.55,1.25,.42,0,0);   // skull, snout and the open jaw
        for(const s of[-1,1]){hb.add(new THREE.ConeGeometry(.24,1.6,6),W,s*.55,.95,-.55,-1.15,0,s*.25);hb.add(new THREE.ConeGeometry(.16,.9,6),Au,s*.95,.45,-.4,-1.3,0,s*.9);   // horns and cheek spikes
          hb.sph(.24,W,s*.5,.42,.75,1,.7,1,8);hb.sph(.11,0x3a0a00,s*.53,.44,.94,1,1,.5,6);for(let k=0;k<3;k++)hb.add(new THREE.ConeGeometry(.07,.26,4),W,s*(.42-k*.2),-.25,2.25,Math.PI,0,0);
          hb.add(new THREE.ConeGeometry(.08,.6,5),Or,s*.35,.3,2.45,1.3,0,0)}   // eyes, teeth, whiskers
        for(let k=0;k<4;k++)hb.add(new THREE.ConeGeometry(.2,.7,5),R,0,.95-k*.05,-.2-k*.45,-.5,0,0);   // the mane
        const head=hb.mesh(new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x6a3a10}));head.renderOrder=5;g.add(head);
        const wingG=new THREE.BufferGeometry(),wp=[0,0,0, 1,2.6,-.6, 3.8,3.2,-1.6, 0,0,0, 3.8,3.2,-1.6, 5.4,1.4,-2.4, 0,0,0, 5.4,1.4,-2.4, 4.4,-.4,-2.6, 0,0,0, 4.4,-.4,-2.6, 2,-.6,-2.2];
        wingG.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));
        const wm=new THREE.MeshBasicMaterial({color:0xffb04a,transparent:true,opacity:.75,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});
        const wings=[1,-1].map(s=>{const p=new THREE.Group(),m=new THREE.Mesh(wingG,wm);m.scale.x=s;p.add(m);g.add(p);return p});
        const tb=Build();for(const a of[-.7,0,.7])tb.add(new THREE.ConeGeometry(.5,2.6,4),0xff6a4a,Math.sin(a)*1.1,0,-1.3*Math.cos(a),-Math.PI/2,a,0,1,1,.25);
        const tail=tb.mesh(new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x6a2010}));g.add(tail);
        g.userData={body,head,wings,tail,wm};return g});
      const A=area(S),k=A.k,x0=S.x0;
      S.d.path=new THREE.CatmullRomCurve3([[x0,2,-6],[x0,4,1],[x0*.6,9*k,10*k],[24*k,16*k,20*k],[10*k,22*k,27*k],[-16*k,21*k,22*k],[-27*k,14*k,11*k],[-12*k,9*k,4*k],[x0,4,0],[x0,2,-7]].map(p=>new V3(p[0],p[1],p[2])),false,'centripetal');
      S.d.len=S.d.path.getLength();S.ball.visible=false;S.d.dr.visible=true;
      S.burst(x0,4,2,60,6,16,.9,.4,.9,[CELL.glow,CELL.spark],[0xfff2c2,0xffb347,0xff4a6a],oSpark);shk(S,.3);
      S.snd((A2,t,v)=>{A2.tone(t,.9,'sawtooth',230,70,.07*v);A2.noise(t,.8,400,.6,.22*v,'lowpass');for(let i=0;i<4;i++)A2.noise(t+.4+i*.45,.18,260,.9,.08*v,'lowpass');A2.tone(t+2.25,.8,'sawtooth',170,50,.08*v);A2.noise(t+2.25,.6,300,.7,.28*v,'lowpass')});
    },
    step(S,t){
      S.root.updateMatrixWorld();const U=S.d.dr.userData,path=S.d.path,A=area(S),sc=(S.main?2.7:.75)*(RM()?.8:1),NS=40,NR=10,BL=Math.min(.4,(S.main?44:15)/S.d.len);
      const uh=RM()?lerp(.05,1,sm(0,2.4,t)):sm(0,2.3,t),show=uh<.995;
      const bu=U.body.material.uniforms;bu.uA.value=show?1:0;bu.uT.value=t;U.head.visible=U.tail.visible=show;U.wings.forEach(w=>w.visible=show);U.body.visible=show;
      if(show){
        const P=U.body.geometry.attributes.position,up=_ds;
        for(let i=0;i<=NS;i++){const f=i/NS,u=clamp(uh-f*BL,0,1);path.getPointAt(u,_dp);path.getTangentAt(u,_dq);
          up.set(0,1,0);const sd=_ip.crossVectors(_dq,up);if(sd.lengthSq()<1e-4)sd.set(1,0,0);sd.normalize();up.crossVectors(sd,_dq).normalize();
          const r=sc*(f<.08?lerp(.9,1.25,f/.08):lerp(1.25,.18,(f-.08)/.92))*(1+.12*Math.sin(f*20-t*12)),wv=Math.sin(f*9-t*9)*.5*sc*f;
          for(let j=0;j<NR;j++){const a=j/NR*TAU,ca=Math.cos(a)*r,sa=Math.sin(a)*r*.85,o=(i*NR+j)*3;P.array[o]=_dp.x+up.x*ca+sd.x*(sa+wv);P.array[o+1]=_dp.y+up.y*ca+sd.y*(sa+wv);P.array[o+2]=_dp.z+up.z*ca+sd.z*(sa+wv)}
          if(i===0){U.head.position.copy(_dp);_ip.copy(_dp).add(_dq);U.head.up.copy(up);U.head.lookAt(S.d.dr.localToWorld(_dw.copy(_ip)));U.head.scale.setScalar(sc)}
          if(i===6)for(const [w,s] of [[U.wings[0],1],[U.wings[1],-1]]){w.position.copy(_dp).addScaledVector(up,r*.6);_ip.copy(_dp).add(_dq);w.up.copy(up);w.lookAt(S.d.dr.localToWorld(_dw.copy(_ip)));w.rotateZ(s*(.35+Math.sin(t*9)*.6));w.scale.setScalar(sc)}
          if(i===NS){U.tail.position.copy(_dp);_ip.copy(_dp).add(_dq);U.tail.lookAt(S.d.dr.localToWorld(_dw.copy(_ip)));U.tail.scale.setScalar(sc*(1+.15*Math.sin(t*10)))}
          if(i%4===2&&Math.random()<.5)S.em(_dp.x+up.x*r,_dp.y+up.y*r,_dp.z+up.z*r,rand(-1,1),rand(-2,0),rand(-1,1),.5,rand(.25,.45),CELL.spark,i<20?0xffe08a:0xff6a5a,oSpark);
        }
        P.needsUpdate=true;
      }
      if(S.at(2.3)){path.getPointAt(.97,_dp);S.burst(_dp.x,Math.max(2,_dp.y),_dp.z+2,100,8,22,1.1,.45,.95,[CELL.glow,CELL.star,CELL.spark],[0xfff2c2,0xffb347,0xff5c6a],oSpark);S.ring(_dp.x,5,2,0xffb347,1,22,.6);S.ring(_dp.x,.25,4,0xff5c6a,1,18,.6,1);shk(S,.7)}
    }
  },
  { // 32 Disco Floor: the pitch lights up in coloured tiles from your goal outward and pulses to a beat, with two spotlights sweeping
    dur:2.5,
    go(S){
      const A=area(S);
      S.d.f=S.model('disco',()=>{const g=new THREE.Group(),W=A.w*2-6,L=A.l*.62,geo=new THREE.PlaneGeometry(W,L);geo.rotateX(-Math.PI/2);geo.translate(0,0,L/2);
        const fl=new THREE.Mesh(geo,fxShader('varying vec2 vP;void main(){vP=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          'varying vec2 vP;uniform float uR,uA,uB,uTile;uniform vec3 uC[4];float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}'+
          'vec3 pk(float k){return k<.25?uC[0]:k<.5?uC[1]:k<.75?uC[2]:uC[3];}'+
          'void main(){vec2 q=vP/uTile,id=floor(q),f=fract(q);float d=length(vP);float on=1.-smoothstep(uR-uTile*1.5,uR,d);float b0=floor(uB),bf=smoothstep(.7,1.,fract(uB));'+
          'vec3 c=mix(pk(h(id+b0)),pk(h(id+b0+1.)),bf);float lit=mix(step(.4,h(id*1.7+b0*.37)),step(.4,h(id*1.7+(b0+1.)*.37)),bf)*.75+.25;'+
          'float e=smoothstep(0.,.07,f.x)*smoothstep(1.,.93,f.x)*smoothstep(0.,.07,f.y)*smoothstep(1.,.93,f.y);float ring=exp(-pow((d-uR)/(uTile*.8),2.))*.6;'+
          'gl_FragColor=vec4(c*(e*lit*on+ring*on)*uA*.62,1.);}',
          {uR:{value:0},uA:{value:0},uB:{value:0},uTile:{value:5*A.k+.6},uC:{value:[new THREE.Color(0xff3fa4),new THREE.Color(0x38e6ff),new THREE.Color(0xffd23f),new THREE.Color(0x9a5cff)]}},
          {blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
        fl.position.y=.06;fl.frustumCulled=false;fl.renderOrder=2;g.add(fl);
        const cm=glowMat(0xffffff,.2);const cone=new THREE.ConeGeometry(4*A.k+.5,40*A.k+6,24,1,true);cone.translate(0,-(20*A.k+3),0);
        const spots=[0,1].map(i=>{const m=new THREE.Mesh(cone,i?cm:cm.clone());m.frustumCulled=false;m.renderOrder=4;g.add(m);return m});g.userData={fl,spots};return g});
      const U=S.d.f.userData,u=U.fl.material.uniforms;S.d.f.position.set(S.x0,0,0);u.uR.value=0;u.uA.value=0;
      U.spots.forEach((m,i)=>{const s=i?1:-1;m.position.set(s*(S.main?G.GW:8)-S.x0,(S.main?G.GH:6)+1,1);m.material.opacity=0});
      S.ball.visible=false;S.burst(S.x0,3,2,60,4,14,1,.25,.5,[CELL.star,CELL.square],[0xff3fa4,0x38e6ff,0xffd23f,0xffffff],oSpark,.5);
      S.snd((A2,t,v)=>{for(let i=0;i<5;i++){const tt=t+i*.5;A2.tone(tt,.25,'sine',90,40,.3*v);A2.noise(tt+.25,.05,7000,1,.06*v,'highpass')}for(const [f,d] of[[392,0],[494,0],[587,0],[440,1],[554,1],[659,1]])A2.tone(t+.02+d,.35,'square',f,f,.022*v)});
    },
    step(S,t){
      const U=S.d.f.userData,u=U.fl.material.uniforms,A=area(S),rm=RM();
      u.uR.value=rm?A.l*2:(A.l*1.1)*sm(0,.95,t);u.uA.value=(rm?sm(0,.6,t):1)*(1-sm(1.95,2.45,t));u.uB.value=rm?0:t*2;
      U.spots.forEach((m,i)=>{const s=i?1:-1;m.rotation.set(-.9+.25*Math.sin(t*2.4+i),0,s*(.5+.35*Math.sin(t*1.8+i*2)));m.material.opacity=.16*u.uA.value;m.material.color.setHSL(((rm?0:t*.4)+i*.5)%1,.9,.6)});
      if(!rm&&t>.2&&t<2.1&&Math.random()<.8)S.em(rand(-A.w*.8,A.w*.8),rand(.5,6)*A.k+.3,rand(2,A.l*.55),0,0,0,.35,rand(.3,.7)*(A.k+.3),CELL.star,pick([0xff3fa4,0x38e6ff,0xffd23f,0xffffff]),O({add:1,fade:2,rot:0}));
    }
  },
  { // 33 Piano Keys: a giant keyboard rises across the goal mouth and the ball hops along it playing a tune
    dur:2.5,
    go(S){
      S.d.k=S.model('piano',()=>{const g=new THREE.Group(),bw=new THREE.BoxGeometry(2.2,.9,6.2),bb=new THREE.BoxGeometry(1.3,1,3.8);
        const W=new THREE.InstancedMesh(bw,new THREE.MeshLambertMaterial({color:0xf4f4f0}),14),B=new THREE.InstancedMesh(bb,new THREE.MeshLambertMaterial({color:0x17181d}),10);
        const base=Build();base.box(14*2.4+1,.8,7.4,0x2a1c14,0,.1,4.6);base.box(14*2.4+1,.25,.6,0xc98a12,0,.55,1.2);const bm=base.mesh();
        for(const m of[W,B])m.frustumCulled=false;g.add(bm,W,B);g.userData={W,B,bm,press:new Float32Array(24)};return g});
      const U=S.d.k.userData;U.press.fill(0);S.d.k.position.set(0,0,0);S.d.hop=-1;
      S.ball.visible=true;S.ball.scale.setScalar(.8);S.d.b0=S.ball.position.clone();
    },
    step(S,t,dt){
      const U=S.d.k.userData,rise=backOut(seg(t,0,.35))*(1-seg(t,2.15,2.5)),y0=-1.6+1.6*rise,BLK=[0,1,3,4,5,7,8,10,11,12],NOTE=[262,294,330,349,392,440,494,523,587,659,698,784,880,988];
      for(let i=0;i<24;i++)U.press[i]=Math.max(0,U.press[i]-dt*4);
      const play=(i,v0)=>{U.press[i]=1;const f=NOTE[i]*2;S.snd((A,t2,v)=>{A.tone(t2,.5,'triangle',f,f,.1*v*(v0||1));A.tone(t2,.3,'sine',f*2,f*2,.03*v)})};
      const hops=[1,3,5,7,9,11,13];
      if(t>=.35&&t<1.75){const h=Math.min(6,Math.floor((t-.35)/.2)),f=((t-.35)/.2)-h,a=h?hops[h-1]:-1,b=hops[h],xa=a<0?S.d.b0.x:(a-6.5)*2.4,xb=(b-6.5)*2.4;
        S.ball.position.set(lerp(xa,xb,f),y0+.9+1.46+Math.sin(f*Math.PI)*(a<0?2:3.4)+(a<0?(1-f)*(S.d.b0.y-2):0),lerp(a<0?S.d.b0.z:5,5,a<0?f:1));S.ball.rotation.z-=dt*8;
        if(h!==S.d.hop){if(S.d.hop>=0){play(hops[S.d.hop]);S.burst(S.ball.position.x,2,5,6,2,5,.8,.4,.6,[CELL.note,CELL.notes],[0xffffff,S.col],oFloat,.7)}S.d.hop=h}}
      if(S.at(1.75)){play(13);S.burst(S.ball.position.x,2,5,6,2,5,.8,.4,.6,[CELL.note,CELL.notes],[0xffffff,S.col],oFloat,.7)}
      for(let i=0;i<14;i++)if(S.at(1.85+i*.025))play(i,.7);
      if(t>1.75&&t<2.05){const f=seg(t,1.75,2.05);S.ball.position.set((13-6.5)*2.4-f*4,y0+2.4+Math.sin(f*Math.PI)*6,5)}
      if(S.at(2.05)){S.ball.visible=false;S.burst(S.ball.position.x,S.ball.position.y,5,40,4,11,1.3,.4,.8,[CELL.note,CELL.notes,CELL.star],[0xffffff,S.col,0xffd23f],oFloat,.6);shk(S,.2)}
      let bi=0;for(let i=0;i<14;i++){const p=U.press[i];inst(U.W,i,(i-6.5)*2.4,y0+.45-p*.35,4.9,p*.06,0,0)}
      for(const i of BLK){const p=Math.max(U.press[i],U.press[i+1])*.6;inst(U.B,bi++,(i-6.5)*2.4+1.2,y0+.95-p*.3,3.6,p*.05,0,0)}
      U.W.instanceMatrix.needsUpdate=U.B.instanceMatrix.needsUpdate=true;U.bm.position.y=y0-.4;
    }
  },
  { // 34 Bubble Pop: a giant soap bubble swallows the ball, wobbles up into the air and pops
    dur:2.2,
    go(S){S.d.m=S.model('bubble',()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),filmMat(0xffffff,1));m.renderOrder=6;return m});
      S.d.m.material.uniforms.uA.value=0;S.d.c=S.B.clone();S.d.c.x=S.x0;S.d.c.y=Math.max(S.B.y,8);S.d.c.z=Math.max(S.d.c.z,6);S.ball.visible=true;S.d.v=0;
      S.snd((A,t,v)=>{A.tone(t,.5,'sine',300,700,.05*v);A.tone(t+1.7,.12,'sine',1400,300,.12*v);A.noise(t+1.7,.15,2500,1,.15*v,'highpass')})},
    step(S,t,dt){
      const m=S.d.m,c=S.d.c,u=m.material.uniforms,y=c.y+sm(.2,1.7,t)*11;u.uT.value=t;
      if(t<1.7){const r=9*backOut(seg(t,0,.35)),w=Math.sin(t*8)*.08;m.position.set(c.x,y,c.z);m.scale.set(r*(1+w),r*(1-w),r*(1+w*.5));u.uA.value=sm(0,.2,t);S.ball.position.set(c.x,y,c.z);S.ball.rotation.y+=dt*2}
      if(S.at(1.7)){m.visible=false;S.burst(c.x,y,c.z,110,6,22,1.1,.4,1,[CELL.bubble,CELL.bubble,CELL.disc],[0xffffff,0xbfe9ff,0xffd9f5],O({grav:2,drag:1.5,wob:2}));S.ring(c.x,y,c.z,0xffffff,8,18,.4,0,.5);S.d.v=0}
      if(t>1.7&&S.ball.visible){S.d.v-=30*dt;S.ball.position.y+=S.d.v*dt;if(S.ball.position.y<BR){S.ball.visible=false;S.burst(c.x,1,c.z,14,2,5,.6,.5,.9,[CELL.puff],[0xffffff],oPuff)}}
    }
  },
  { // 35 Balloon Release: the ball pops and a bunch of balloons in your team colour floats up out of the goal
    dur:2.6,
    go(S){S.ball.visible=false;S.burst(S.B.x,S.B.y,S.B.z,14,3,8,.4,.4,.7,[CELL.spark],[0xffffff],oSpark);
      S.snd((A,t,v)=>{popSnd(A,t,v,1200);for(let i=0;i<6;i++)A.tone(t+.1+i*.13,.12,'triangle',500+Math.random()*400,900+Math.random()*500,.04*v)})},
    step(S,t){
      const rel=(n,yb)=>{const m=Math.round(n*S.q);for(let i=0;i<m;i++)S.em(S.x0*.5+rand(-11,11),yb+rand(0,5),4+rand(-3,4),rand(-2,2),rand(4,8),rand(-.5,3),3,rand(2,2.8),CELL.balloon,Math.random()<.6?S.col:pick([0xffffff,0xffd23f]),O({grav:-2.2,wob:2.5,rot:0,drag:.4}))};
      if(S.at(.05))rel(50,1);if(S.at(.7))rel(26,1);
      if(S.at(.1))S.burst(S.x0,3,3,60,5,14,1.8,.45,.8,[CELL.strip],[S.col,0xffffff],oConf,.8);
    }
  },
  { // 36 Paint Splash: the ball bursts like a paint balloon and splats your team colour over the back of the net and the floor
    dur:2.3,
    go(S){
      S.d.p=S.model('paint',()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d'),r=rng(36);g.translate(64,64);g.scale(40,40);g.fillStyle='#fff';
        blob(g,0,0,.8,.28,r,14);g.fill();for(let i=0;i<14;i++){const a=r()*TAU,d=.95+r()*.5;g.beginPath();g.arc(Math.cos(a)*d,Math.sin(a)*d,.05+r()*.1,0,TAU);g.fill()}for(let i=0;i<6;i++){const a=r()*TAU;g.beginPath();g.moveTo(Math.cos(a)*.6,Math.sin(a)*.6);g.lineTo(Math.cos(a+.08)*1.25,Math.sin(a+.08)*1.25);g.lineWidth=.12;g.strokeStyle='#fff';g.lineCap='round';g.stroke()}
        const tex=new THREE.CanvasTexture(cv),mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,color:0xffffff,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide}),gr=new THREE.Group(),pg=new THREE.PlaneGeometry(1,1);
        const back=new THREE.Mesh(pg,mat),floor=new THREE.Mesh(pg,mat);floor.rotation.x=-Math.PI/2;gr.add(back,floor);gr.userData={back,floor,mat};return gr});
      const U=S.d.p.userData;U.mat.color.setHex(S.col);U.mat.opacity=1;U.back.position.set(S.x0*.6,S.main?9:3.5,S.main?-15:-8);U.floor.position.set(S.x0*.6,.07,S.main?10:4);U.back.scale.setScalar(.01);U.floor.scale.setScalar(.01);U.back.rotation.z=rand(0,TAU);
      S.ball.visible=false;S.burst(S.B.x,S.B.y,S.B.z,130,10,28,1.4,.5,1.1,[CELL.drop,CELL.disc,CELL.splat],[S.col,S.col,0xffffff],oDrop,.45);shk(S,.35);
      S.snd((A,t,v)=>{A.noise(t,.35,500,.7,.35*v,'lowpass');A.noise(t,.12,2000,1,.12*v);A.noise(t+.15,.25,700,.8,.12*v,'lowpass')});
    },
    step(S,t){
      const U=S.d.p.userData,k=backOut(seg(t,0,.22)),s=S.main?26:8;U.back.scale.setScalar(Math.max(.01,k*s));U.floor.scale.setScalar(Math.max(.01,backOut(seg(t,.12,.36))*s*1.1));U.mat.opacity=1-sm(1.8,2.25,t);
      if(t>.25&&t<1.9)for(let i=0;i<2;i++)if(Math.random()<.6)S.em(S.x0+rand(-.3,.3)*s,U.back.position.y-rand(.05,.3)*s,U.back.position.z+.3,0,-rand(.5,2),0,1.3,rand(.5,.8),CELL.drop,S.col,O({grav:3,rot:Math.PI,drag:.5}));
    }
  },
  { // 37 Thunderclap: the ball shudders, then a clap of air throws rings along the floor and a cone of pressure out of the goal
    dur:2.1,
    go(S){S.d.cn=S.model('clap',()=>{const g=new THREE.CylinderGeometry(1,.15,1,32,1,true);g.rotateX(Math.PI/2);g.translate(0,0,.5);const m=new THREE.Mesh(g,glowMat(0xdff3ff,.3));m.renderOrder=4;return m});
      S.d.cn.visible=false;S.ball.visible=true;S.d.b0=S.ball.position.clone();S.snd((A,t,v)=>{A.tone(t,.45,'sawtooth',60,180,.05*v);boomSnd(A,t+.45,v*1.3,1.2);A.noise(t+.45,.08,4000,1,.3*v,'highpass')})},
    step(S,t){
      const b0=S.d.b0,cn=S.d.cn;
      if(t<.45){const k=t/.45*.35;S.ball.position.set(b0.x+rand(-k,k),b0.y+rand(-k,k),b0.z+rand(-k,k));S.ball.scale.setScalar(1+t*.3)}
      if(S.at(.45)){S.ball.visible=false;shk(S,.9);const c=S.ball.position;
        for(const [d,r] of[[.8,62],[1,44],[1.2,28]])S.ring(c.x,.25,c.z+1,0x8fc4ff,1,r,d,1,.2);S.ring(c.x,c.y,c.z,0xffffff,1,24,.5,0,.5);
        const n=Math.round(64*S.q);for(let i=0;i<n;i++){const a=i/n*Math.PI,sp=rand(20,32);S.em(c.x,.8,c.z+1,Math.cos(a)*sp,rand(1,4),Math.abs(Math.sin(a))*sp,1.5,rand(2,3.5),CELL.puff,0xd8d2c4,oDust)}
        S.burst(c.x,1,c.z,40,8,20,1.3,.35,.7,[CELL.rock],[0xffffff],oChunk,.6);cn.visible=true;cn.position.copy(c);}
      if(t>=.45&&cn.visible){const k=seg(t,.45,1.4);cn.scale.set(1+k*18,1+k*18,1+k*55);cn.material.opacity=.22*(1-k);if(k>=1)cn.visible=false}
    }
  },
  { // 38 Kraken: a dark pool opens in the goal mouth, tentacles rise, wave, grab the ball and drag it under
    dur:2.7,
    go(S){
      S.d.k=S.model('kraken',()=>{const g=new THREE.Group(),im=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshLambertMaterial({color:0xffffff}),108),c=new THREE.Color();
        for(let i=0;i<108;i++)im.setColorAt(i,c.setHex(i%18>14?0xd06aa0:(i%2?0x8a2f6a:0x9e3a7a)));im.frustumCulled=false;
        const pool=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x08262e,transparent:true,opacity:.9,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));pool.rotation.x=-Math.PI/2;g.add(im,pool);g.userData={im,pool};return g});
      const U=S.d.k.userData;S.d.k.position.set(S.x0,0,7);U.pool.position.y=.07;U.pool.scale.setScalar(.01);S.ball.visible=true;S.d.b0=S.ball.position.clone();
      S.snd((A,t,v)=>{A.tone(t,1.4,'sine',55,40,.25*v);A.noise(t,1.2,250,.8,.15*v,'lowpass');A.noise(t+1.75,.6,600,.6,.25*v,'lowpass');for(let i=0;i<5;i++)A.tone(t+1.8+i*.07,.1,'sine',200-i*25,120,.06*v)});
    },
    step(S,t){
      const U=S.d.k.userData,rm=RM(),R=backOut(seg(t,.15,.6))*(1-seg(t,2.0,2.5)),grab=sm(.95,1.25,t)*(1-sm(1.75,2,t)),pull=seg(t,1.7,2);
      U.pool.scale.setScalar(Math.max(.01,7.5*backOut(seg(t,0,.25))*(1-seg(t,2.3,2.6))));
      for(let k=0;k<6;k++){const a=k/6*TAU+.3,ca=Math.cos(a),sa=Math.sin(a);
        for(let j=0;j<18;j++){const s=j/17,h=s*11*R*(1-pull*.6),bend=4.6*grab*s*s,wv=rm?0:Math.sin(t*4+k*1.3-s*3)*s*1.6*(1-grab*.7),r=lerp(1.1,.28,s)*Math.max(.01,R);
          inst(U.im,k*18+j,ca*(4.8-bend)-sa*wv,h-pull*6*s,sa*(4.8-bend)+ca*wv,0,0,0,r,Math.max(r,.75*R),r)}}
      U.im.instanceMatrix.needsUpdate=true;
      if(t<1.1){const e=sm(.2,1.1,t);S.ball.position.lerpVectors(S.d.b0,_ip.set(S.x0,2,7),e)}
      else if(t<1.7)S.ball.position.set(S.x0,lerp(2,10*R,sm(1.1,1.4,t)),7);
      else if(t<2){S.ball.position.y=lerp(10*R,-3,sm(1.7,2,t))}
      if(S.at(2)){S.ball.visible=false;S.burst(S.x0,1,7,60,6,16,1,.3,.7,[CELL.drop,CELL.disc,CELL.splat],[0x2a7a8a,0xffffff,0x5a2a6a],oDrop,.8);S.ring(S.x0,.25,7,0x9fe0ff,1,14,.6,1);shk(S,.5)}
      if(t>.2&&t<2.2&&Math.random()<.4)S.em(S.x0+rand(-5,5),.3,7+rand(-5,5),0,rand(1,3),0,.6,rand(.3,.5),CELL.bubble,0x9fe0ff,oFloat);
    }
  },
  { // 39 Rocket Launch: a rocket rises on its pad, counts down, and lifts off on a column of smoke, bursting into stars high above
    dur:2.7,
    go(S){
      S.d.pad=S.model('rpad',()=>{const b=Build();b.box(7,.7,7,0x6b7280,0,.35,0);for(const s of[-1,1])b.box(.5,9,.5,0xd8262f,s*3,4.5,-2.5);b.box(6.5,.4,.4,0xd8262f,0,8.5,-2.5);for(let i=-3;i<=3;i+=2)b.box(.8,.72,6.9,0xffd23f,i,.36,0);return b.mesh()});
      S.d.r=S.model('rocket',()=>{const b=Build(),Wt=0xf4f6ff,R=0xd8262f;b.cyl(1.2,1.2,7,Wt,0,4.6,0,0,0,0,20);b.add(new THREE.ConeGeometry(1.2,2.6,20),R,0,9.4,0);b.cyl(.75,1.05,.8,0x2a2f3a,0,.7,0,0,0,0,14);b.sph(.45,0x5cc8ff,0,6.8,1.1,1,1,.5);b.tor(.48,.08,0xc8d2dc,0,6.8,1.12);b.cyl(1.22,1.22,.4,R,0,3.2,0,0,0,0,20);
        for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;b.box(.2,2.2,1.4,R,Math.sin(a)*1.6,1.9,Math.cos(a)*1.6,0,a,0)}return b.mesh()});
      S.d.pad.position.set(S.x0,-10,6);S.d.r.position.set(S.x0,-9.3,6);S.ball.visible=false;
      S.snd((A,t,v)=>{for(const d of[.5,.8,1.1])A.tone(t+d,.09,'square',d<1?880:1320,d<1?880:1320,.05*v);A.noise(t+1.15,1.4,180,.6,.35*v,'lowpass');A.tone(t+1.2,1.3,'sawtooth',50,90,.05*v)});
    },
    step(S,t,dt){
      const up=backOut(seg(t,0,.4)),r=S.d.r,rm=RM();S.d.pad.position.y=-10+10*up-10*seg(t,2.2,2.7);
      const lift=t<1.3?0:rm?(t-1.3)*(t-1.3)*18:(t-1.3)*(t-1.3)*40;r.position.y=-9.3+10*up+lift;
      if(t>1.12&&t<2.3){const y=r.position.y+.3;for(let i=0;i<(S.q<1?2:4);i++)S.em(S.x0+rand(-.4,.4),y,6+rand(-.4,.4),rand(-1,1),-rand(10,18),rand(-1,1),.3,rand(.7,1.1),pick([CELL.flame,CELL.glow]),pick([0xffd23f,0xff8a1f,0xffffff]),O({add:1,grow:-.5,fade:0,rot:0}));
        if(Math.random()<.6)S.em(S.x0+rand(-.6,.6),y-1,6+rand(-.6,.6),rand(-1,1),rand(-1,0),rand(-1,1),1.1,rand(1,1.6),CELL.puff,0xe6e8ee,oPuff)}
      if(S.at(1.15)){shk(S,.5);const n=Math.round(30*S.q);for(let i=0;i<n;i++){const a=rand(0,TAU),sp=rand(6,12);S.em(S.x0,.8,6,Math.cos(a)*sp,rand(0,1),Math.sin(a)*sp,1.3,rand(1.2,2),CELL.puff,0xe6e8ee,oDust)}}
      if(S.at(2.3)){const y=r.position.y+9;S.burst(S.x0,y,6,90,8,20,1.2,.5,1,[CELL.star,CELL.spark,CELL.glow],[S.col,0xffffff,0xffd23f],oSpark);S.ring(S.x0,y,6,S.col,1,16,.5);S.snd((A,t2,v)=>popSnd(A,t2,v,700))}
      if(t>2.3)r.visible=false;
    }
  },
  { // 40 Red Carpet: a red carpet unrolls from the goal, gold posts and ropes pop up beside it, and the ball rolls out to camera flashes
    dur:2.5,
    go(S){
      S.d.c=S.model('carpet',()=>{const g=new THREE.Group(),b=Build();b.box(7,.08,1,0xb3122a,0,.04,.5);for(const s of[-1,1])b.box(.35,.09,1,0xe0b040,s*3.4,.045,.5);const cp=b.mesh();
        const roll=new THREE.Mesh(new THREE.CylinderGeometry(1,1,7.4,18),new THREE.MeshLambertMaterial({color:0x9a0f22}));roll.rotation.z=Math.PI/2;
        const pb=Build();pb.cyl(.18,.25,2.6,0xe0b040,0,1.3,0,0,0,0,10);pb.cyl(.55,.6,.2,0xc98a12,0,.1,0,0,0,0,12);pb.sph(.32,0xffd23f,0,2.7,0);
        const posts=new THREE.InstancedMesh(pb.mesh().geometry,vcMat(),16),ropes=new THREE.InstancedMesh(new THREE.CylinderGeometry(.11,.11,1,8),new THREE.MeshLambertMaterial({color:0x8a1030}),14);
        posts.frustumCulled=ropes.frustumCulled=false;g.add(cp,roll,posts,ropes);g.userData={cp,roll,posts,ropes};return g});
      const U=S.d.c.userData;S.d.c.position.set(S.x0,0,1);S.ball.visible=true;S.d.b0=S.ball.position.clone();
      S.snd((A,t,v)=>{A.noise(t+.2,1.8,650,.7,.12*v,'bandpass');for(let i=0;i<14;i++)A.noise(t+.4+i*.12+Math.random()*.06,.03,5000,1,.08*v,'highpass');fanfare(A,t+.05,v,[392,523,392,659],.15,'square',.03)});void U;
    },
    step(S,t,dt){
      const U=S.d.c.userData,A=area(S),L=36*A.k+6,f=sm(.1,1.1,t),len=Math.max(.01,L*f);
      U.cp.scale.set(1,1,len);U.roll.position.set(0,lerp(1,.3,f),len+.2);U.roll.scale.set(lerp(1,.3,f),1,lerp(1,.3,f));U.roll.rotation.x+=dt*10;U.roll.visible=f<.99;
      for(let i=0;i<8;i++){const z=(i+1)*L/8.5,k=backOut(seg(len,z-1,z+3)/1),h=Math.max(.01,k);for(const s of[0,1])inst(U.posts,i*2+s,(s?1:-1)*4.8,0,z,0,0,0,1,h,1)}
      let ri=0;for(let i=0;i<7;i++){const z0=(i+1)*L/8.5,z1=(i+2)*L/8.5,k=seg(len,z1+1,z1+4);for(const s of[-1,1])inst(U.ropes,ri++,s*4.8,2.3,(z0+z1)/2,Math.PI/2,0,0,Math.max(.01,k),(z1-z0)*k||.01,Math.max(.01,k))}
      U.posts.instanceMatrix.needsUpdate=U.ropes.instanceMatrix.needsUpdate=true;
      if(t<.5){S.ball.position.lerpVectors(S.d.b0,_ip.set(S.x0,BR,2),sm(0,.5,t))}else if(t<2.05){S.ball.position.set(S.x0,BR,1+Math.min(len-2,lerp(2,L*.8,sm(.5,2,t))));S.ball.rotation.x+=dt*4}
      if(S.at(2.05)){S.ball.visible=false;S.burst(S.x0,2,S.ball.position.z,60,5,14,1.3,.3,.6,[CELL.strip,CELL.star],[0xffd23f,0xffffff,0xe0b040],oConf,.85)}
      if(t>.3&&t<2.3)for(let i=0;i<(S.q<1?1:2);i++)if(Math.random()<.6){const s=Math.random()<.5?-1:1;S.em(S.x0+s*rand(7,10),rand(2,6),1+rand(2,L),0,0,0,.14,rand(.6,1.1),CELL.star,0xffffff,O({add:1,fade:0,rot:0}))}
    }
  },
  { // 41 Snow Globe: a glass globe drops over the goal mouth with the ball and a little snowman inside, gets a shake, and snow swirls
    dur:2.6,
    go(S){
      S.d.g=S.model('globe',()=>{const g=new THREE.Group(),b=Build();b.cyl(7.6,8.6,2.2,0x6b3e1e,0,1.1,0,0,0,0,32);b.tor(7.7,.25,0xe0b040,0,2.1,0,Math.PI/2,0,0);b.cyl(7.3,7.3,.2,0xf4f8ff,0,2.2,0,0,0,0,32);
        b.sph(1.6,0xffffff,-3.4,3.6,-1);b.sph(1.15,0xffffff,-3.4,5.6,-1);b.sph(.8,0xffffff,-3.4,7.1,-1);b.add(new THREE.ConeGeometry(.18,.9,8),0xff8a1f,-3.4,7.1,-.1,Math.PI/2,0,0);for(const s of[-1,1])b.sph(.11,0x14161f,-3.4+s*.28,7.35,-.33);b.cyl(.85,.85,.12,0xd8262f,-3.4,6.5,-1,0,0,0,14);
        const base=b.mesh(),glass=new THREE.Mesh(new THREE.SphereGeometry(8.6,40,24,0,TAU,0,Math.PI*.86),filmMat(0xcfe8ff,.25));glass.position.y=9.6;glass.renderOrder=6;g.add(base,glass);g.userData={glass};return g});
      const k=S.main?1:.75;S.d.g.position.set(S.x0,30,8*k);S.d.g.scale.setScalar(k);S.d.g.rotation.set(0,0,0);S.ball.visible=true;S.d.b0=S.ball.position.clone();
      S.snd((A,t,v)=>{A.tone(t+.45,.5,'sine',2093,2093,.06*v);[784,988,1175,988,784,1175,1568].forEach((f,i)=>A.tone(t+.7+i*.2,.4,'sine',f,f,.045*v))});
    },
    step(S,t,dt){
      const gl=S.d.g,k=S.main?1:.75,u=gl.userData.glass.material.uniforms,drop=bounceOut(seg(t,0,.5));u.uA.value=sm(0,.2,t);u.uT.value=t;
      gl.position.y=30*(1-drop)+seg(t,2.1,2.6)*seg(t,2.1,2.6)*40;gl.rotation.z=(t>.6&&t<1.05&&!RM()?Math.sin((t-.6)*30)*.07*(1-seg(t,.6,1.05)):0);
      if(t<2.1){const e=sm(0,.4,t);S.ball.position.lerpVectors(S.d.b0,_ip.set(S.x0+2*k,gl.position.y+(2.3+BR*.8)*k,8*k),e);S.ball.scale.setScalar(lerp(1,.8*k,e))}
      if(S.at(2.1)){S.ball.visible=false;S.burst(S.x0,10*k,8*k,40,3,9,1,.3,.6,[CELL.flake,CELL.spark],[0xffffff,0xdff3ff],oFeather)}
      if(t>.6&&t<2.15){const n=S.q<1?3:6,cy=gl.position.y+9.6*k;for(let i=0;i<n;i++){const a=rand(0,TAU),r=rand(1,7)*k,yy=rand(-4,6)*k;S.em(S.x0+Math.cos(a)*r,cy+yy,8*k+Math.sin(a)*r,-Math.sin(a)*4*k,rand(-1,.5),Math.cos(a)*4*k,.8,rand(.12,.22),CELL.flake,0xffffff,O({grav:1,spin:2,wob:1.5,drag:.6}))}}
    }
  },
  { // 42 Slam Dunk: a hoop swings out above the goal, the ball arcs up and drops through it with a swish, and the buzzer goes
    dur:2.4,
    go(S){
      S.d.h=S.model('hoop',()=>{const g=new THREE.Group(),b=Build();b.box(8,5.4,.3,0xf6f6f6,0,2.2,-2.1);for(const [w,h,x,y] of[[2.8,.18,0,1.5],[2.8,.18,0,3.3],[.18,1.9,-1.31,2.4],[.18,1.9,1.31,2.4]])b.box(w,h,.1,0xff5a1f,x,y,-1.9);
        b.tor(1.9,.14,0xff5a1f,0,0,0,Math.PI/2,0,0);b.box(.3,.3,2.1,0xc8d2dc,0,-.1,-1.05);const hoop=b.mesh();
        const n=Build();for(let i=0;i<10;i++){const a=i/10*TAU;n.add(new THREE.CylinderGeometry(.04,.04,2.4,4),0xffffff,Math.cos(a)*1.55,-1.2,Math.sin(a)*1.55,Math.sin(a)*.18,0,-Math.cos(a)*.18)}n.tor(1.25,.04,0xffffff,0,-2.3,0,Math.PI/2,0,0);n.tor(1.6,.04,0xffffff,0,-1.1,0,Math.PI/2,0,0);
        const net=n.mesh();g.add(hoop,net);g.userData={net};return g});
      const k=S.main?1.7:.8;S.d.h.position.set(S.x0*.5,(S.main?G.GH:7)+3*k,3.2*k);S.d.h.scale.setScalar(.01);S.ball.visible=true;S.d.b0=S.ball.position.clone();S.ball.scale.setScalar(.75);
      S.snd((A,t,v)=>{A.noise(t+.95,.35,3200,.5,.12*v,'bandpass');A.tone(t+1.2,.6,'square',196,196,.06*v);A.tone(t+1.2,.6,'square',247,247,.04*v)});
    },
    step(S,t,dt){
      const h=S.d.h,net=h.userData.net,k=S.main?1.7:.8,rim=h.position.clone();h.scale.setScalar(Math.max(.01,backOut(seg(t,0,.35))*k*(1-seg(t,2.05,2.4))));
      const st=_ip.set(S.x0+5*k,BR,9*k);
      if(t<.95){const f=seg(t,.15,.95);if(t<.15)S.ball.position.lerpVectors(S.d.b0,st,t/.15);else S.ball.position.set(lerp(st.x,rim.x,f),lerp(st.y,rim.y,f)+Math.sin(f*Math.PI)*10*k+ (f>.8?0:0),lerp(st.z,rim.z,f));S.ball.rotation.x-=dt*8}
      else if(t<1.15){const f=seg(t,.95,1.15);S.ball.position.set(rim.x,rim.y-f*4*k,rim.z)}
      else if(t<2){const f=seg(t,1.15,2);S.ball.position.set(rim.x,BR*.75+(rim.y-4*k-BR)*(1-bounceOut(f)),rim.z+f*6)}
      if(S.at(2)){S.ball.visible=false;S.burst(S.ball.position.x,1.5,S.ball.position.z,20,3,8,.8,.4,.8,[CELL.star],[0xffd23f,0xffffff],oSpark,.7)}
      net.scale.y=1+(t>.95&&t<1.4?Math.sin((t-.95)*28)*.3*(1-seg(t,.95,1.4)):0);
      if(S.at(1)){S.burst(rim.x,rim.y,rim.z,60,6,15,1.3,.4,.8,[CELL.strip,CELL.star],[S.col,0xffffff,0xff5a1f],oConf,.8);S.ring(rim.x,rim.y,rim.z,0xffffff,1,8,.4,1);shk(S,.3)}
    }
  },
  { // 43 High Striker: a fairground strength tester rises, the ball lands on its pad, and the puck shoots up and rings the bell
    dur:2.5,
    go(S){
      S.d.tw=S.model('striker',()=>{const g=new THREE.Group(),b=Build(),C=[0xd8262f,0xff8a1f,0xffd23f,0x46c34a,0x2e7bff,0x9a5cff];b.cyl(2.4,2.6,.6,0xd8262f,0,.3,1.6,0,0,0,20);b.cyl(1.6,1.6,.25,0xf6f6f6,0,.7,1.6,0,0,0,20);
        for(let i=0;i<12;i++)b.box(1.4,1.3,.7,C[Math.floor(i/2)],0,1+i*1.3+.65,0);for(let i=0;i<12;i++)b.box(1.6,.08,.75,0xffffff,0,1+i*1.3,0);
        b.sph(1.3,0xffc83a,0,17.6,0,1,.9,1);b.tor(1.25,.18,0xc98a12,0,17,0,Math.PI/2,0,0);b.cyl(.15,.15,.6,0x6b7280,0,16.7,0,0,0,0,8);const tw=b.mesh();
        const pb=Build();pb.box(1.9,.7,1.1,0xc8d2dc,0,0,0);pb.sph(.3,0xff3b3b,0,0,.55,1,1,.5);const pk=pb.mesh();g.add(tw,pk);g.userData={pk};return g});
      const k=S.main?1:.65;S.d.tw.position.set(S.x0,-20,3);S.d.tw.scale.setScalar(k);S.ball.visible=true;S.d.b0=S.ball.position.clone();
      S.snd((A,t,v)=>{A.noise(t+.45,.2,200,.8,.35*v,'lowpass');A.tone(t+.5,.4,'sawtooth',200,900,.04*v);for(const [f,g] of[[1319,.1],[2637,.05],[3951,.025]])A.tone(t+.9,1.3,'sine',f,f,g*v)});
    },
    step(S,t,dt){
      const tw=S.d.tw,k=S.main?1:.65,pk=tw.userData.pk,up=backOut(seg(t,0,.35));tw.position.y=-20+20*up-20*seg(t,2.1,2.5);
      const ring=t>.9&&t<1.6,py=t<.5?1.6:t<.9?1.6+15*sm(.5,.9,t):t<1.4?16.6:16.6-15*sm(1.4,1.9,t);pk.position.set(0,py,.75);
      tw.rotation.z=ring&&!RM()?Math.sin((t-.9)*40)*.012*(1-seg(t,.9,1.6)):0;
      const pad=_ip.set(S.x0,tw.position.y+(1+BR*.7)*k,3+1.6*k);
      if(t<.45){S.ball.position.lerpVectors(S.d.b0,pad,sm(0,.45,t));S.ball.position.y+=Math.sin(seg(t,0,.45)*Math.PI)*6}
      else if(t<1.2){const f=seg(t,.45,1.2);S.ball.position.set(pad.x+f*7,pad.y+Math.sin(f*Math.PI)*5,pad.z+f*5);S.ball.rotation.z-=dt*6}
      if(S.at(1.2)){S.ball.visible=false;S.burst(S.ball.position.x,S.ball.position.y,S.ball.position.z,12,2,5,.6,.5,.9,[CELL.puff],[0xffffff],oPuff)}
      if(S.at(.45))shk(S,.3);
      if(t>.5&&t<.9){const wy=tw.position.y+py*k;S.em(S.x0,wy,3+.8*k,rand(-1,1),-2,rand(-.5,.5),.3,.9*k,CELL.glow,0xffd23f,oGlow)}
      if(S.at(.9)){const by=tw.position.y+17.6*k;S.ring(S.x0,by,3,0xffd23f,1,12,.6);S.burst(S.x0,by,3,70,6,16,1.2,.4,.9,[CELL.star,CELL.spark],[0xffd23f,0xffffff,S.col],oSpark);shk(S,.4)}
    }
  }
];
let mainStage=null;
function goal(no,p,team){
  if(!GOALS[no]||GOALS[no].gift)return false;
  const spr=sprites();
  if(!mainStage)mainStage=Stage(G.scene,spr,{lo:TRAIL_SLOTS*TRAIL_MAX,hi:spr.n,i:TRAIL_SLOTS*TRAIL_MAX},true,G.camera);
  return mainStage.play(no,p,team);
}
function update(dt){frameNo++;if(mainStage)mainStage.step(dt);if(mainSpr){mainSpr.cap(G.low()?90:150);mainSpr.update(dt)}}
function clearGoal(){if(mainStage)mainStage.stop()}
// =====================================================================
//  The garage: what you wear, the pickers and the previews
// =====================================================================
// Names, rarity and who owns what come from ../cosmetics.js (its Boostball items); this file only knows numbers.
// With the cosmetics switch on, you wear what your locker there owns and the choice is saved in that locker.
// With only the garage switch on (as it is for a captain), every item is free and the choice is saved here as
// boostball-kit ({slot: item id}).
const CAT=()=>window.BackRoomCosmetics&&window.BackRoomCosmetics.gameItems?window.BackRoomCosmetics:null;
const LISTS=[DECALS,TRAILS,GOALS,TOPPERS,HATS,WHEELS,ENGINES],TABS=['Decal','Boost trail','Goal explosion','Topper','Hat','Wheels','Engine'];
// an exclusive gift (GOALS[22]) is listed only for a player who has it (G.giftOk: its owner, a captain, or the test switch)
const giftOf=(slot,no)=>{const d=LISTS[slot]&&LISTS[slot][no];return d&&d.gift||''};
const shown=(slot,no)=>{const g=giftOf(slot,no);return !g||!!(G.giftOk&&G.giftOk(g))};
function items(slot){
  const C=CAT(),L=C?C.gameItems('boostball',SLOTS[slot]).filter(it=>has(slot,it.no)&&shown(slot,it.no)):[];
  if(L.length||!LISTS[slot])return L;
  return LISTS[slot].map((d,i)=>i&&shown(slot,i)?{no:i,id:'bb-'+SLOTS[slot]+'-'+i,name:TABS[slot]+' '+i,desc:'',rarity:'common'}:null).filter(Boolean); // no catalogue: numbers only
}
const owns=it=>!G.cosOn()||!!giftOf(SLOTS.indexOf(it.slot),it.no)||CAT().owned().items.indexOf(it.id)>=0;
let cur=[0,0,0,0,0,0,0];
function saved(){let o=null;try{o=JSON.parse(G.store.get('kit','')||'null')}catch(e){}return o&&typeof o==='object'?o:{}}
function mine(){
  const k=[0,0,0,0,0,0,0];
  if(G.cosOn()){const e=CAT().gameEquipped('boostball');SLOTS.forEach((s,i)=>{if(e[s]&&has(i,e[s].no)&&shown(i,e[s].no))k[i]=e[s].no})}
  else if(G.garageOn){const o=saved();SLOTS.forEach((s,i)=>{const it=items(i).find(x=>x.id===o[s]);if(it)k[i]=it.no})}
  cur=k;return G.kitOf(k);
}
function wear(slot,it){
  if(G.cosOn()){if(it)CAT().equip(it.id);else CAT().unequip('boostball:'+SLOTS[slot])}
  else{const o=saved();if(it)o[SLOTS[slot]]=it.id;else delete o[SLOTS[slot]];G.store.set('kit',JSON.stringify(o))}
  G.setKit(mine());paintMenu();
}
function botKit(){const r=(L,p)=>{if(Math.random()>=p)return 0;let i;do{i=1+Math.floor(Math.random()*(L.length-1))}while(L[i]&&L[i].gift);return i};   /* never a gift */return G.kitOf([r(DECALS,.7),r(TRAILS,.7),r(GOALS,.8),r(TOPPERS,.3),r(HATS,.3),r(WHEELS,.4)])}
let tab=0,note='',swKey='';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function menu(){
  if(document.getElementById('kit'))return;
  const sw=document.getElementById('swatches');if(!sw)return;
  const st=document.createElement('style');
  st.textContent='#kit .kit-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}#kit .kit-tabs button{flex:1 0 22%;min-height:36px;padding:6px 4px;font-size:13.5px;font-weight:700;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.25);color:var(--ink-2)}'+
    '#kit .kit-tabs button[aria-selected="true"]{color:#fff;border-color:var(--blue-2);background:rgba(47,140,255,.2)}'+
    '#kit .kit-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;max-height:218px;overflow-y:auto;padding:2px;overscroll-behavior:contain}'+
    '#kit .kit-grid button{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:50px;min-width:0;padding:5px 3px;font-size:12px;line-height:1.15;font-weight:700;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.25);overflow:hidden;overflow-wrap:anywhere}'+
    '#kit .kit-grid button[aria-pressed="true"]{border-color:var(--blue-2);background:rgba(47,140,255,.22)}#kit .kit-grid button.locked{opacity:.5}'+
    '#kit .kit-grid canvas{display:block;width:100%;aspect-ratio:3/1;border-radius:4px}#kit .kit-grid svg{width:26px;height:26px;flex:none}'+
    '#kit .kit-grid i{position:absolute;top:2px;right:2px;width:7px;height:7px;border-radius:50%}'+
    '#kit .kit-foot{display:flex;align-items:center;gap:10px;margin:8px 0 0;min-height:36px}#kit .kit-foot p{margin:0;flex:1;font-size:14px}#kit .kit-foot button{flex:none;min-height:36px;padding:6px 12px;font-weight:700;font-size:14px;border:1px solid var(--blue-2);border-radius:8px;background:rgba(47,140,255,.2)}'+
    '@media (min-height:600px){#garage{position:sticky;top:0;z-index:3;background:rgba(10,16,38,.97);border-radius:10px}}'+ // the preview stays in view while you scroll the pickers (not on a phone held sideways: too little room)
    '@media (max-width:420px){#kit .kit-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}';
  document.head.appendChild(st);
  const box=document.createElement('div');box.id='kit';
  box.innerHTML='<div class="label">Kit <span style="text-transform:none;letter-spacing:0">· not public yet</span></div><div class="kit-tabs" role="tablist" aria-label="Kit">'+TABS.map((t,i)=>'<button type="button" role="tab" data-tab="'+i+'">'+t+'</button>').join('')+
    '</div><div class="kit-grid" id="kitGrid" role="group"></div><div class="kit-foot"><p class="note" id="kitNote"></p><button type="button" id="kitPreview" hidden>Preview</button></div>';
  sw.after(box);
  box.addEventListener('click',e=>{
    const t=e.target.closest('[data-tab]');if(t){tab=+t.dataset.tab;note='';paintMenu();G.sfx('click');return}
    if(e.target.closest('#kitPreview')){preview(cur[2]);return}
    const b=e.target.closest('[data-no]');if(!b)return;
    const no=+b.dataset.no,it=no?items(tab).find(x=>x.no===no):null;
    if(it&&!owns(it)){note='<b>'+esc(it.name)+'</b> is not in your locker yet. <a href="/e63334287a3deaa3/shop/'+(/[?&]cosmetics=1/.test(location.search)?'?cosmetics=1':'')+'" style="color:var(--blue-2)">Shop</a>';paintMenu();return}
    note='';wear(tab,it);G.sfx('click');if(tab===2&&it)preview(it.no);
  });
  document.addEventListener('backroom:cosmetics',()=>{G.setKit(mine());paintMenu()});
  paintMenu();
}
function paintMenu(){
  const box=document.getElementById('kit');if(!box)return;
  box.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(+b.dataset.tab===tab)));
  const C=CAT(),L=items(tab),RC=C?C.RARITY_BY_ID:{},grid=document.getElementById('kitGrid');
  grid.setAttribute('aria-label',TABS[tab]);
  grid.innerHTML='<button type="button" data-no="0" aria-pressed="'+(!cur[tab])+'">None</button>'+L.map(it=>{
    const lock=!owns(it),r=RC[it.rarity];
    return '<button type="button" data-no="'+it.no+'" aria-pressed="'+(cur[tab]===it.no)+'"'+(lock?' class="locked" aria-disabled="true"':'')+' title="'+esc(it.desc||it.name)+(r?' ('+r.name+')':'')+'">'+
      (tab===0?'<canvas width="96" height="32" aria-hidden="true"></canvas>':C&&C.itemSvg?C.itemSvg(it.id,26):'')+esc(it.name)+(giftOf(tab,it.no)?'<small style="font-weight:600;opacity:.8">made for Carbon</small>':'')+(r?'<i style="background:'+r.color+'" aria-hidden="true"></i>':'')+'</button>'}).join('');
  swKey='';
  const it=L.find(x=>x.no===cur[tab]);
  document.getElementById('kitNote').innerHTML=note||(it?'<b>'+esc(it.name)+'.</b> '+esc(it.desc||''):['No decal: plain team paint.','No trail: the usual boost flame.','No goal explosion: the usual fireball.','No topper.','No hat.','The usual wheels.','The usual engine sound.'][tab]);
  document.getElementById('kitPreview').hidden=!(tab===2&&cur[2]);
}
// the decal pictures on the buttons: the side panel, in blue and your accent colour (drawn again when the accent changes)
function paintSwatches(){
  const key=G.myAccent+':'+G.TEAM[0].col+':'+tab;if(key===swKey)return;swKey=key;
  if(tab!==0)return;
  const ac=new THREE.Color(G.ACCENTS[G.myAccent]||G.ACCENTS[0]).getHex();
  document.querySelectorAll('#kitGrid button[data-no] canvas').forEach(cv=>{const no=+cv.parentNode.dataset.no;cv.getContext('2d').drawImage(decalSwatch(no,96,32,G.TEAM[0].col,ac),0,0)});
}
// ---- previews, drawn in the garage's own little picture ----
let pv=null;
function pvInit(Gr){
  const spr=Sprites(TRAIL_MAX+GOAL_MAX,Gr.sc,Gr.r,Gr.cam);spr.floor=-.2;
  const cam=new THREE.PerspectiveCamera(30,2.6,.5,400);cam.position.set(0,8.5,43);cam.lookAt(0,7.6,3);
  const stage=Stage(Gr.sc,spr,{lo:TRAIL_MAX,hi:spr.n,i:TRAIL_MAX},false,cam);
  const set=new THREE.Group();set.visible=false;Gr.sc.add(set);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshLambertMaterial({color:0x1d5a34}));fl.rotation.x=-Math.PI/2;set.add(fl);
  const b=Build();for(const s of[-1,1])b.cyl(.35,.35,GH,0xf4f6ff,s*GW,GH/2,0);b.cyl(.35,.35,GW*2,0xf4f6ff,0,GH,0,0,0,Math.PI/2);b.box(GW*2,GH,.2,0x16202c,0,GH/2,-9);set.add(b.mesh());
  pv={spr,cam,stage,set,R:{lo:0,hi:TRAIL_MAX,i:0},st:{acc:0}};
}
function preview(no){const Gr=G.garage;if(!Gr||!GOALS[no])return;if(GOALS[no].gift){if(pv)pv.stage.stop();if(G.giftPreview)G.giftPreview();return}if(!pv)pvInit(Gr);pv.stage.play(no,new V3(2.5,3,-1.5),0)}
const _z=new V3();
function garageFrame(Gr,dt){
  paintSwatches();
  if(!Gr.model)return false;
  if(G.giftFrame&&G.giftFrame(Gr,dt))return true;   // Carbon Star's preview (carbon-star.js) is playing in the garage picture
  if(!pv){if(!(tab===1&&cur[1]))return false;pvInit(Gr)}
  const car=Gr.model.g;
  if(pv.stage.live){
    // a goal explosion: the car and its stand step aside for a goal mouth
    const hid=[];for(const o of Gr.sc.children)if((o.isMesh||o===car)&&o.visible){o.visible=false;hid.push(o)}
    pv.set.visible=true;pv.spr.floor=.14;pv.stage.step(dt);pv.spr.update(dt,pv.cam);
    pv.cam.aspect=Gr.cam.aspect;pv.cam.updateProjectionMatrix();Gr.r.render(Gr.sc,pv.cam);
    pv.set.visible=false;for(const o of hid)o.visible=true;
    if(!pv.stage.live){pv.spr.clear(0,pv.spr.n);pv.spr.floor=-.2}
    return true;
  }
  // a boost trail: the car stops turning, tail to the right, and boosts on the spot
  const on=tab===1&&TRAILS[cur[1]];
  car.position.x=on?-1.7:0;
  if(on){car.rotation.y=-1.92;car.updateMatrixWorld();trailEmit(pv.spr,pv.R,pv.st,cur[1],car.position,car.quaternion,_z,dt,G.low(),7)}
  pv.spr.update(dt);
  return false;
}

return{has,dress,wheel,release,trail,goal,update,clearGoal,garageFrame,mine,menu,botKit,preview,engine,TOPPERS,HATS,WHEELS,ENGINES,
  DECALS,TRAILS,GOALS,CELL,paintDecal,decalSwatch,sheet,get stage(){return mainStage},get sprites(){return mainSpr},get pv(){return pv},get cur(){return cur},setTab(i){tab=i;paintMenu()},
  counts:()=>LISTS.map(L=>L.length-1)};
};
