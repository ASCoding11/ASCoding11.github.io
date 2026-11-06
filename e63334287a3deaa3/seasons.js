/*
 * Seasonal looks for the home page, the Back Room, the phone page and the Daily Puzzles page (not the games).
 *
 * Fall (Sep 22 to Nov 26) tints the page background warm and lets a few leaves drift down; winter (Nov 27 to the end
 * of February) tints it cool blue, drops snow and slowly builds a thin line of snow along the bottom edge. The date
 * (the viewer's own) decides; outside those dates nothing happens. Each page loads this with one <script defer>.
 *
 * The tint only overrides the page's own colour variables (site.css's --ground/--panel-2/--line/--panel, the phone
 * page's --bg/--panel, the Daily page's --night/--panel-2), mixed a little towards a warm or cool colour, so text keeps
 * its colours. The leaves and snow are drawn on one fixed canvas placed first in <body> at z-index -1 (body gets
 * isolation:isolate so the canvas sits above the page background but under everything else). It takes no space,
 * ignores the pointer, pauses when the tab is hidden or a game covers the page, runs at 30 fps on phones, and with
 * prefers-reduced-motion shows the tint and a few still shapes only.
 *
 * A small 🍂 / ❄ button in the footer turns it all off (or back on) for this browser: localStorage "season:off" = "1".
 * Testing: add ?season=fall, ?season=winter or ?season=none to the address, or call BackRoomSeasons.set('winter')
 * (set() with nothing goes back to the date). BackRoomSeasons.seasonFor(date) is the date rule, and
 * BackRoomSeasons.bench(n) draws n frames at once and returns the milliseconds per frame.
 */
(function(){
  if(window.BackRoomSeasons)return;
  var FALL_FROM=[9,22],FALL_TO=[11,26]; // month, day (inclusive); winter runs from the day after FALL_TO to the end of February

  function seasonFor(d){
    var m=d.getMonth()+1,day=d.getDate(),md=m*100+day;
    if(md>=FALL_FROM[0]*100+FALL_FROM[1]&&md<=FALL_TO[0]*100+FALL_TO[1])return 'fall';
    if(md>FALL_TO[0]*100+FALL_TO[1]||m<=2)return 'winter';
    return 'none';
  }

  var forced=null;
  try{var q=new URLSearchParams(location.search).get('season');if(q==='fall'||q==='winter'||q==='none')forced=q}catch(e){}
  function isOff(){try{return localStorage.getItem('season:off')==='1'}catch(e){return false}}
  function setOff(v){try{if(v)localStorage.setItem('season:off','1');else localStorage.removeItem('season:off')}catch(e){}}

  var mqDark=matchMedia('(prefers-color-scheme: dark)'),mqStill=matchMedia('(prefers-reduced-motion: reduce)');
  var phone=matchMedia('(pointer: coarse)').matches&&!matchMedia('(any-pointer: fine)').matches;

  /* ---------- colours ---------- */
  function parse(c){
    c=(c||'').trim();var m;
    if((m=/^#([0-9a-f]{3,8})$/i.exec(c))){
      var h=m[1];if(h.length<6)h=h.split('').map(function(x){return x+x}).join('');
      return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),h.length>=8?parseInt(h.slice(6,8),16)/255:1];
    }
    if((m=/^rgba?\(([^)]+)\)$/i.exec(c))){
      var p=m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      return [p[0],p[1],p[2],p.length>3?p[3]:1];
    }
    return null;
  }
  function lum(c){return (0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255}
  function mix(c,t,a){
    var r=[0,1,2].map(function(i){return Math.round(c[i]+(t[i]-c[i])*a)});
    return c[3]<1?'rgba('+r.join(',')+','+c[3]+')':'rgb('+r.join(',')+')';
  }
  // How far each variable moves towards the season's colour. Backgrounds the most, cards very little.
  var VARS={'--ground':.62,'--bg':.5,'--night':.5,'--panel-2':.45,'--line':.45,'--panel':.25};
  var TINT={fall:{light:[250,190,120],dark:[110,50,8]},winter:{light:[165,208,246],dark:[20,60,110]}};

  var styleEl=null;
  function tint(season){
    if(styleEl){styleEl.remove();styleEl=null}
    if(season==='none')return;
    var cs=getComputedStyle(document.documentElement),out=[],base=null;
    ['--ground','--bg','--night'].forEach(function(v){if(!base)base=parse(cs.getPropertyValue(v))});
    var light=base?lum(base)>.5:!mqDark.matches;
    var t=TINT[season][light?'light':'dark'];
    for(var v in VARS){var c=parse(cs.getPropertyValue(v));if(c)out.push(v+':'+mix(c,t,VARS[v]))}
    styleEl=document.createElement('style');styleEl.id='season-style';
    styleEl.textContent='html:root{'+out.join(';')+'}body{isolation:isolate}'+
      '#season-fx{position:fixed;left:0;right:0;bottom:0;width:100%;height:100vh;height:100lvh;z-index:-1;pointer-events:none;display:block}';
    document.head.appendChild(styleEl);
    return light;
  }

  /* ---------- shapes ---------- */
  // Leaves in a 100 x 100 box around 0,0, tip up. Drawn once into small sprites, then stamped with drawImage.
  var LEAVES=[
    'M0,-46C26,-30 28,20 0,40C-28,20 -26,-30 0,-46Z',
    'M0,-48L6,-34L14,-38L12,-22L24,-28L22,-18L38,-24L32,-10L44,-6L30,4L34,12L20,12L24,24L10,18L4,26L2,40L-2,40L-4,26L-10,18L-24,24L-20,12L-34,12L-30,4L-44,-6L-32,-10L-38,-24L-22,-18L-24,-28L-12,-22L-14,-38L-6,-34Z',
    'M0,-46C10,-46 14,-38 8,-32C20,-36 28,-26 18,-18C32,-20 36,-6 22,-2C34,2 34,16 20,14C26,24 18,32 6,28L2,40L-2,40L-6,28C-18,32 -26,24 -20,14C-34,16 -34,2 -22,-2C-36,-6 -32,-20 -18,-18C-28,-26 -20,-36 -8,-32C-14,-38 -10,-46 0,-46Z',
    'M0,-42C20,-40 36,-14 30,8C26,24 10,34 0,38C-10,34 -26,24 -30,8C-36,-14 -20,-40 0,-42Z'
  ];
  var VEINS=[
    'M0,-38L0,46M0,-14L16,-26M0,-14L-16,-26M0,6L18,-6M0,6L-18,-6',
    'M0,-40L0,46M0,22L34,-18M0,22L-34,-18M0,22L30,8M0,22L-30,8',
    'M0,-40L0,46M0,-20L18,-18M0,-20L-18,-18M0,0L22,-2M0,0L-22,-2M0,16L20,14M0,16L-20,14',
    'M0,-36L0,46M0,-12L18,-22M0,-12L-18,-22M0,8L22,0M0,8L-22,0'
  ];
  var PICK=[1,1,1,2,2,2,0,3]; // mostly maple and oak
  var COLORS=['#D9652B','#E8892E','#EFA73A','#C2412D','#A3301F','#8B5A2B','#A96B31'];
  var SPR=96,spriteCache={},dpr=1;
  function shade(hex,k){var c=parse(hex);return 'rgb('+[0,1,2].map(function(i){return Math.round(c[i]*k)}).join(',')+')'}
  function leafSprite(s,ci){
    var key=s+':'+ci;if(spriteCache[key])return spriteCache[key];
    var n=Math.ceil(SPR*dpr),cv=document.createElement('canvas');cv.width=cv.height=n;
    var g=cv.getContext('2d'),k=n/110;g.setTransform(k,0,0,k,n/2,n/2);
    var p=new Path2D(LEAVES[s]),gr=g.createLinearGradient(-30,-40,30,40);
    gr.addColorStop(0,shade(COLORS[ci],1.08));gr.addColorStop(1,shade(COLORS[ci],.8));
    g.fillStyle=gr;g.fill(p);
    g.strokeStyle='rgba(80,32,8,.5)';g.lineWidth=1.4;g.lineJoin='round';g.stroke(p);
    g.save();g.clip(p);g.strokeStyle='rgba(70,28,8,.4)';g.lineWidth=2;g.lineCap='round';g.stroke(new Path2D(VEINS[s]));g.restore();
    g.strokeStyle='rgba(70,28,8,.6)';g.lineWidth=2.6;g.lineCap='round';g.beginPath();g.moveTo(0,36);g.lineTo(0,52);g.stroke();
    return spriteCache[key]=cv;
  }
  function dotSprite(light){
    var key='dot'+light;if(spriteCache[key])return spriteCache[key];
    var n=Math.ceil(16*dpr),cv=document.createElement('canvas');cv.width=cv.height=n;
    var g=cv.getContext('2d'),gr=g.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);
    gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.95)');
    gr.addColorStop(.7,'rgba(255,255,255,.4)');gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr;g.fillRect(0,0,n,n);
    return spriteCache[key]=cv;
  }
  function flakeSprite(light){
    var key='flake'+light;if(spriteCache[key])return spriteCache[key];
    var n=Math.ceil(64*dpr),cv=document.createElement('canvas');cv.width=cv.height=n;
    var g=cv.getContext('2d'),k=n/40;g.setTransform(k,0,0,k,n/2,n/2);g.lineCap='round';
    var arms=new Path2D();
    for(var i=0;i<6;i++){
      var a=i*Math.PI/3,c=Math.cos(a),s=Math.sin(a);
      var pt=function(x,y){return [x*c-y*s,x*s+y*c]},p;
      p=pt(0,0);arms.moveTo(p[0],p[1]);p=pt(16,0);arms.lineTo(p[0],p[1]);
      [[8,5],[12,4]].forEach(function(b){var o=pt(b[0],0),u=pt(b[0]+b[1]*.8,b[1]),w=pt(b[0]+b[1]*.8,-b[1]);
        arms.moveTo(o[0],o[1]);arms.lineTo(u[0],u[1]);arms.moveTo(o[0],o[1]);arms.lineTo(w[0],w[1])});
    }
    if(light){g.strokeStyle='rgba(98,134,180,.85)';g.lineWidth=3.6;g.stroke(arms)}
    g.strokeStyle='#fff';g.lineWidth=1.8;g.stroke(arms);
    return spriteCache[key]=cv;
  }

  /* ---------- the effect ---------- */
  var cv=null,ctx=null,W=0,H=0,parts=[],rest=[],season='none',light=true,raf=0,last=0,t0=0,clock=0,still=false,ground=null,btn=null,covered=false;
  function rnd(a,b){return a+Math.random()*(b-a)}

  function size(){
    if(!cv)return false;
    var w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return false;
    var nd=Math.min(window.devicePixelRatio||1,phone?1.5:2);
    if(w===W&&h===H&&nd===dpr)return false;
    if(nd!==dpr){dpr=nd;spriteCache={}}
    var ow=W||w,oh=H||h;W=w;H=h;
    cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
    parts.forEach(function(p){p.x=p.x/ow*w;p.bx=p.bx/ow*w;p.y=p.y/oh*h});
    makeGround();
    return true;
  }

  function counts(){
    var a=W*H/1024000;
    if(season==='fall')return {n:Math.round(Math.max(10,Math.min(phone?14:36,a*35)))*(still?.25:1)|0,r:phone?5:10};
    return {n:Math.round(Math.max(18,Math.min(phone?28:56,a*50)))*(still?.3:1)|0,f:(phone?7:14)-(still?(phone?4:8):0)};
  }

  function spawnLeaf(p,top){
    p.kind='leaf';p.s=PICK[Math.random()*PICK.length|0];p.ci=Math.random()*COLORS.length|0;
    p.size=rnd(30,50)*(phone?.8:1);p.bx=rnd(0,W);p.x=p.bx;p.y=top?rnd(-90,-40):rnd(-40,H);
    p.vy=rnd(14,28);p.amp=rnd(20,50);p.fr=rnd(.15,.35);p.ph=rnd(0,6.3);
    p.rot=rnd(0,6.3);p.vr=rnd(-.5,.5);p.tf=rnd(.25,.7);p.tp=rnd(0,6.3);p.a=rnd(.85,.97);
    return p;
  }
  function spawnSnow(p,top,flake){
    p.kind=flake?'flake':'dot';
    p.size=flake?rnd(26,46)*(phone?.8:1):rnd(5,13);p.bx=rnd(0,W);p.x=p.bx;p.y=top?rnd(-50,-10):rnd(-10,H);
    p.vy=flake?rnd(12,20):8+p.size*1.8+rnd(0,6);p.amp=rnd(6,flake?22:14);p.fr=rnd(.12,.3);p.ph=rnd(0,6.3);
    p.rot=rnd(0,1.05);p.vr=rnd(-.25,.25);p.a=flake?rnd(.85,1):rnd(.65,1);
    return p;
  }
  function populate(){
    parts=[];var c=counts(),i;
    rest=[];
    if(season==='fall'){
      for(i=0;i<c.n;i++)parts.push(spawnLeaf({},false));
      // a few leaves lying along the bottom edge, partly off screen
      for(i=0;i<c.r;i++)rest.push({s:PICK[Math.random()*PICK.length|0],ci:Math.random()*COLORS.length|0,xr:(i+rnd(.1,.9))/c.r,
        size:rnd(28,44)*(phone?.8:1),sink:rnd(.08,.32),rot:(Math.random()<.5?-1:1)*rnd(1.1,2.0),flip:(Math.random()<.5?-1:1)*rnd(.55,1)});
    }
    else{for(i=0;i<c.n;i++)parts.push(spawnSnow({},false,false));for(i=0;i<c.f;i++)parts.push(spawnSnow({},false,true))}
  }

  // The snow line: a soft bumpy strip along the bottom edge that grows to full height over the first minute.
  function makeGround(){
    if(season!=='winter'){ground=null;return}
    var pts=[],n=Math.ceil(W/22)+2,a=rnd(0,6),b=rnd(0,6);
    for(var i=0;i<n;i++){var x=i*22;pts.push([x,.62+.22*Math.sin(x*.011+a)+.16*Math.sin(x*.037+b)])}
    ground={pts:pts,max:phone?8:12};
  }
  function drawGround(g){
    if(!ground)return;
    var k=Math.min(1,clock/60),h=ground.max*(1-(1-k)*(1-k));if(still)h=ground.max;
    if(h<.3)return;
    g.beginPath();g.moveTo(0,H);
    ground.pts.forEach(function(p,i){var y=H-h*p[1]-1;if(!i)g.lineTo(p[0],y);else{var q=ground.pts[i-1];g.quadraticCurveTo(q[0],H-h*q[1]-1,(q[0]+p[0])/2,(y+H-h*q[1]-1)/2)}});
    g.lineTo(W,H);g.closePath();
    g.globalAlpha=1;g.fillStyle=light?'#fbfdff':'rgba(232,242,252,.9)';g.fill();
    if(light){g.strokeStyle='rgba(104,140,184,.8)';g.lineWidth=1.2;g.stroke()}
  }

  function step(dt){
    clock+=dt;var wind=season==='fall'?10*Math.sin(clock*.07):5*Math.sin(clock*.11);
    for(var i=0;i<parts.length;i++){
      var p=parts[i];
      p.y+=p.vy*dt;p.bx+=wind*dt;p.rot+=p.vr*dt;
      p.x=p.bx+p.amp*Math.sin(p.ph+clock*p.fr*6.283);
      if(p.bx<-60)p.bx+=W+120;else if(p.bx>W+60)p.bx-=W+120;
      if(p.y>H+p.size+4){if(p.kind==='leaf')spawnLeaf(p,true);else spawnSnow(p,true,p.kind==='flake')}
    }
  }
  function draw(){
    var g=ctx;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);
    var dot=season==='winter'&&dotSprite(light),fl=season==='winter'&&flakeSprite(light);
    for(var i=0;i<parts.length;i++){
      var p=parts[i],c=Math.cos(p.rot),s=Math.sin(p.rot),k=p.size*dpr,spr,half;
      if(p.kind==='leaf'){
        var flip=Math.cos(p.tp+clock*p.tf*3.1416);flip=flip<0?Math.min(-.12,flip):Math.max(.12,flip);
        spr=leafSprite(p.s,p.ci);k=k/(SPR*.82*dpr);
        g.globalAlpha=p.a;g.setTransform(c*flip*k,s*flip*k,-s*k,c*k,p.x*dpr,p.y*dpr);
      }else if(p.kind==='flake'){spr=fl;k=k/(64*dpr);g.globalAlpha=p.a;g.setTransform(c*k,s*k,-s*k,c*k,p.x*dpr,p.y*dpr)}
      else{spr=dot;k=k/(16*dpr);g.globalAlpha=p.a;g.setTransform(k,0,0,k,p.x*dpr,p.y*dpr)}
      half=spr.width/2;g.drawImage(spr,-half,-half);
    }
    g.globalAlpha=1;
    for(i=0;i<rest.length;i++){
      var r=rest[i],rc=Math.cos(r.rot),rs=Math.sin(r.rot),rk=r.size*dpr/(SPR*.82*dpr);
      g.setTransform(rc*r.flip*rk,rs*r.flip*rk,-rs*rk,rc*rk,r.xr*W*dpr,(H-r.size*(.5-r.sink))*dpr);
      spr=leafSprite(r.s,r.ci);g.drawImage(spr,-spr.width/2,-spr.width/2);
    }
    g.setTransform(dpr,0,0,dpr,0,0);drawGround(g);g.globalAlpha=1;
  }

  function frame(now){
    raf=requestAnimationFrame(frame);
    if(phone&&now-last<31)return;
    var dt=Math.min(.05,(now-last)/1000);last=now;
    step(dt);draw();
  }
  function play(){
    if(raf||!cv||still||document.hidden||covered)return;
    last=performance.now();raf=requestAnimationFrame(frame);
  }
  function pause(){if(raf){cancelAnimationFrame(raf);raf=0}}

  function stop(){
    pause();if(cv){cv.remove();cv=null;ctx=null}
    parts=[];rest=[];W=H=0;ground=null;tint('none');
  }
  function start(s){
    stop();season=s;updateButton();
    if(s==='none'||isOff())return;
    light=tint(s);still=mqStill.matches;clock=0;
    cv=document.createElement('canvas');cv.id='season-fx';cv.setAttribute('aria-hidden','true');
    document.body.insertBefore(cv,document.body.firstChild);
    ctx=cv.getContext('2d');
    size();populate();
    if(still){step(0);draw()}else play();
  }
  function current(){return forced||seasonFor(new Date())}

  /* ---------- the on/off button ---------- */
  function updateButton(){
    var s=current();
    if(s==='none'){if(btn){btn.remove();btn=null}return}
    if(!btn){
      btn=document.createElement('button');btn.type='button';btn.className='season-toggle';
      btn.style.cssText='font:inherit;font-size:14px;line-height:1;color:inherit;background:none;border:1px solid currentColor;border-color:color-mix(in srgb,currentColor 35%,transparent);border-radius:999px;padding:6px 9px;margin:-10px 0 -10px 8px;cursor:pointer;vertical-align:middle';
      btn.addEventListener('click',function(){setOff(!isOff());start(current())});
      var f=document.querySelector('footer, .foot');
      if(f)f.appendChild(btn);
      else{btn.style.cssText+=';position:fixed;left:calc(10px + env(safe-area-inset-left,0px));bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:5;margin:0';document.body.appendChild(btn)}
    }
    var off=isOff(),what=s==='fall'?'falling leaves':'snow';
    btn.textContent=s==='fall'?'🍂':'❄';
    btn.style.opacity=off?'.45':'.85';
    btn.title=(off?'Turn on the ':'Turn off the ')+what+' (just for this browser)';
    btn.setAttribute('aria-label',btn.title);btn.setAttribute('aria-pressed',off?'false':'true');
  }

  /* ---------- wiring ---------- */
  document.addEventListener('visibilitychange',function(){if(document.hidden)pause();else play()});
  window.addEventListener('resize',function(){if(cv&&size()){if(still){step(0);draw()}}});
  mqDark.addEventListener&&mqDark.addEventListener('change',function(){if(cv){spriteCache={};start(season)}});
  mqStill.addEventListener&&mqStill.addEventListener('change',function(){if(season!=='none')start(season)});
  // A game opened over the page (the home page's and phone page's full-screen layers) hides the canvas: stop drawing.
  setInterval(function(){
    if(cv&&!still){
      var e=document.elementFromPoint(innerWidth/2,innerHeight/2),c=!!(e&&e.tagName==='IFRAME');
      if(c!==covered){covered=c;if(c)pause();else play()}
    }
    if(!forced&&seasonFor(new Date())!==season)start(current());
  },1000);

  window.BackRoomSeasons={
    seasonFor:seasonFor,
    get season(){return season},
    get running(){return !!raf},
    set:function(s){forced=s==='fall'||s==='winter'||s==='none'?s:null;start(current());return season},
    bench:function(n){
      if(!cv)return null;n=n||300;size();
      var a=performance.now();for(var i=0;i<n;i++){step(1/30);draw()}
      ctx.getImageData(0,0,1,1);
      return (performance.now()-a)/n;
    }
  };
  function init(){start(current())}
  if(document.body)init();else document.addEventListener('DOMContentLoaded',init);
})();
