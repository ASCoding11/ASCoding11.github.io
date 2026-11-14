/*
 * Seasonal looks for the home page, the Back Room, the phone page and the Daily Puzzles page (not the games).
 *
 * Fall (Sep 22 to Nov 26) warms the whole page (background, cards and lines, so the cards sit in the scene instead of
 * looking grey on top of it), lets leaves and the odd acorn drift down, and draws a small harvest scene behind the
 * page: a low sun glow, a field along the bottom edge, a pumpkin patch with wheat in the bottom left corner, a
 * Thanksgiving turkey in a pilgrim hat in the bottom right (it sways, blinks and pecks) and a branch in the top left.
 * Winter (Nov 27 to the end of February) tints the page cool blue, makes the accent blue, drops snow, slowly builds a
 * thin line of snow along the bottom edge and puts snowy ground and a snowman behind the page. During the holidays,
 * the first part of winter (Nov 27, the day after Thanksgiving, to Jan 6), it also draws lights and hanging
 * gingerbread across the top of the margins, a Christmas tree with presents and a diya with a little rangoli in the
 * bottom left, and a menorah next to the snowman in the bottom right; and on the pages that list the games it loads
 * holiday.js, which adds the cabin you arrive in and the retro TV look (see that file).
 * The date (the viewer's own) decides; outside those dates nothing happens. Each page loads this with one
 * <script defer>.
 *
 * The tint only overrides the page's own colour variables (site.css's --ground/--panel-2/--line/--panel, and in fall
 * its green --accent, which becomes harvest gold so buttons and labels belong to the season too; the phone
 * page's --bg/--panel, the Daily page's --night/--panel-2), mixed a little towards a warm or cool colour, so text keeps
 * its colours. The leaves and snow are drawn on one fixed canvas placed first in <body> at z-index -1 (body gets
 * isolation:isolate so the canvas sits above the page background but under everything else); in fall a second fixed
 * canvas under it (#season-bg) holds the parts of the scene that never move and is only redrawn when the window
 * changes size, so the moving canvas still only draws a few dozen small sprites a frame. The scene keeps to the empty
 * margins either side of the page's column where there are any, and shrinks into the corners where there aren't
 * (phones). Everything is drawn in code: no image files. It takes no space,
 * ignores the pointer, pauses when the tab is hidden or a game covers the page, runs at 30 fps on phones, and with
 * prefers-reduced-motion shows the tint and a few still shapes only.
 *
 * A small 🍂 / ❄ button in the footer turns it all off (or back on) for this browser: localStorage "season:off" = "1".
 * Testing: add ?season=fall, ?season=holiday (winter with the holidays), ?season=winter (winter without them) or
 * ?season=none to the address, or call BackRoomSeasons.set('winter')
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
  // The holidays: the first part of winter, from the day after FALL_TO (the day after Thanksgiving) to January 6. Only
  // then does winter get its decorations (tree, menorah, diya, gingerbread, lights) and, on the pages that list the
  // games, the cabin and the retro TV look (holiday.js, which this file loads when it is needed).
  var HOLIDAY_TO=[1,6];
  function holidayFor(d){
    var md=(d.getMonth()+1)*100+d.getDate();
    return md>FALL_TO[0]*100+FALL_TO[1]||md<=HOLIDAY_TO[0]*100+HOLIDAY_TO[1];
  }

  var forced=null;
  try{var q=new URLSearchParams(location.search).get('season');if(q==='fall'||q==='winter'||q==='holiday'||q==='none')forced=q}catch(e){}
  var meSrc=document.currentScript&&document.currentScript.src,BASE=(meSrc?new URL(meSrc,location.href).pathname:'/e63334287a3deaa3/seasons.js').replace(/[^/]*$/,'');
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
  // Fall gives each variable its own colour to move towards, so cards end up a warm cream (light) or a deep chestnut
  // (dark) that belongs with the background, where one shared tint left dark cards a grey-green on brown.
  // [colour, how far] per variable; a variable not listed here uses TINT and VARS above.
  var FALL={
    light:{'--panel':[[255,244,226],.8],'--panel-2':[[251,226,190],.7],'--line':[[214,160,104],.6]},
    dark:{'--ground':[[104,48,10],.66],'--bg':[[104,48,10],.66],'--night':[[104,48,10],.6],'--panel':[[50,26,11],.86],'--panel-2':[[72,39,16],.82],'--line':[[136,84,42],.62]}
  };
  // The site's green accent (Play buttons in Cars, the Send button, small labels, links, the What's new glow) looks
  // out of place in a fall scene, so in fall it becomes harvest gold: [--accent, --accent-ink] for light and dark
  // pages. Only a green accent is replaced: the phone page's is already yellow and stays as it is.
  var ACCENT={fall:{light:['#9C6300','#FFFFFF'],dark:['#F3B94A','#2A1703']},winter:{light:['#2459C8','#FFFFFF'],dark:['#8DB4FF','#0A1A3A']}};

  var styleEl=null;
  function tint(season){
    if(styleEl){styleEl.remove();styleEl=null}
    if(season==='none')return;
    var cs=getComputedStyle(document.documentElement),out=[],base=null;
    ['--ground','--bg','--night'].forEach(function(v){if(!base)base=parse(cs.getPropertyValue(v))});
    var light=base?lum(base)>.5:!mqDark.matches;
    var t=TINT[season][light?'light':'dark'];
    var own=season==='fall'?FALL[light?'light':'dark']:{};
    for(var v in VARS){var c=parse(cs.getPropertyValue(v));if(c)out.push(v+':'+(own[v]?mix(c,own[v][0],own[v][1]):mix(c,t,VARS[v])))}
    var ac=parse(cs.getPropertyValue('--accent')),A=ACCENT[season]&&ACCENT[season][light?'light':'dark'];
    // fall only replaces a green accent (the phone page's yellow already fits); winter makes every accent blue
    if(ac&&A&&(season==='winter'||(ac[1]>ac[0]&&ac[1]>ac[2]))){out.push('--accent:'+A[0]);if(cs.getPropertyValue('--accent-ink').trim())out.push('--accent-ink:'+A[1])}
    styleEl=document.createElement('style');styleEl.id='season-style';
    styleEl.textContent='html:root{'+out.join(';')+'}body{isolation:isolate}'+
      '#season-fx,#season-bg{position:fixed;left:0;right:0;bottom:0;width:100%;height:100vh;height:100lvh;z-index:-1;pointer-events:none;display:block}'+
      'html.tv-on #season-fx,html.tv-on #season-bg,html.tv-on .season-foot{image-rendering:pixelated;image-rendering:crisp-edges}';
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

  /* ---------- the fall scene: pumpkins, wheat, a branch, acorns and the turkey ---------- */
  function ell(g,x,y,rx,ry,rot){g.beginPath();g.ellipse(x,y,rx,ry,rot||0,0,6.2832)}
  var PUMPKINS=[
    {a:'#F59A2E',b:'#C65A12',l:'rgba(120,44,6,.55)'},   // orange
    {a:'#F7E7BE',b:'#D8B878',l:'rgba(120,84,30,.5)'},   // pale
    {a:'#E8702A',b:'#A63E10',l:'rgba(96,30,6,.6)'}      // deep orange
  ];
  // x, y: where it sits (bottom centre); k: size (1 is about 95 px wide)
  function drawPumpkin(g,x,y,k,pal){
    g.save();g.translate(x,y);g.scale(k,k);g.lineJoin='round';g.lineCap='round';
    g.fillStyle='rgba(30,10,0,.28)';ell(g,0,-2,48,7);g.fill();
    [[-30,16,26],[30,16,26],[-16,20,31],[16,20,31],[0,22,33]].forEach(function(r){
      var gr=g.createLinearGradient(r[0]-r[1],-2*r[2],r[0]+r[1],0);gr.addColorStop(0,pal.a);gr.addColorStop(1,pal.b);
      ell(g,r[0],-r[2]-1,r[1],r[2]);g.fillStyle=gr;g.fill();g.strokeStyle=pal.l;g.lineWidth=1.6;g.stroke();
    });
    g.fillStyle='rgba(255,255,255,.22)';ell(g,-12,-46,5,12,.25);g.fill();
    g.beginPath();g.moveTo(-6,-63);g.bezierCurveTo(-7,-74,-2,-81,7,-83);g.lineTo(11,-76);g.bezierCurveTo(6,-74,5,-70,6,-62);g.closePath();
    g.fillStyle='#6E7A2E';g.fill();g.strokeStyle='rgba(40,48,10,.7)';g.lineWidth=1.4;g.stroke();
    g.beginPath();g.moveTo(5,-66);g.bezierCurveTo(20,-78,27,-62,17,-60);g.bezierCurveTo(10,-58,13,-69,22,-71);
    g.strokeStyle='#7E8C34';g.lineWidth=2;g.stroke();
    g.restore();
  }
  // a stalk from x, y up h pixels, its top leaning sideways by lean
  function drawWheat(g,x,y,h,lean,k){
    var x1=x+lean*.3,y1=y-h*.6,x2=x+lean,y2=y-h;
    g.strokeStyle='#C99A3A';g.lineWidth=2.2*k;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x1,y1,x2,y2);g.stroke();
    g.fillStyle='#E9BE55';g.strokeStyle='rgba(120,80,16,.6)';g.lineWidth=.8*k;
    var a=0;
    for(var i=0;i<7;i++){
      var t=1-i*.055,u=1-t,px=u*u*x+2*u*t*x1+t*t*x2,py=u*u*y+2*u*t*y1+t*t*y2;
      a=Math.atan2(2*u*(y1-y)+2*t*(y2-y1),2*u*(x1-x)+2*t*(x2-x1));
      for(var sd=-1;sd<=1;sd+=2){var b=a+sd*.55;ell(g,px+Math.cos(b)*5*k,py+Math.sin(b)*5*k,6.5*k,2.6*k,b);g.fill();g.stroke()}
    }
    a=Math.atan2(y2-y1,x2-x1);ell(g,x2+Math.cos(a)*5*k,y2+Math.sin(a)*5*k,6.5*k,2.6*k,a);g.fill();g.stroke();
  }
  function acornSprite(){
    if(spriteCache.acorn)return spriteCache.acorn;
    var n=Math.ceil(40*dpr),cv=document.createElement('canvas');cv.width=cv.height=n;
    var g=cv.getContext('2d'),k=n/40;g.setTransform(k,0,0,k,n/2,n/2);g.lineJoin='round';g.lineCap='round';
    var gr=g.createLinearGradient(-8,-6,8,16);gr.addColorStop(0,'#DDA24C');gr.addColorStop(1,'#A8672A');
    ell(g,0,5,9,12);g.fillStyle=gr;g.fill();g.strokeStyle='rgba(70,36,8,.65)';g.lineWidth=1.2;g.stroke();
    ell(g,0,17,1.6,2);g.fillStyle='#6B4423';g.fill();
    g.beginPath();g.moveTo(-11,-2);g.bezierCurveTo(-11,-15,11,-15,11,-2);g.bezierCurveTo(6,1.5,-6,1.5,-11,-2);g.closePath();
    g.fillStyle='#7A4B26';g.fill();g.stroke();
    g.strokeStyle='rgba(40,18,4,.35)';g.lineWidth=.9;
    for(var i=-2;i<=2;i++){g.beginPath();g.moveTo(i*4-2,-11);g.lineTo(i*4+2,-1);g.stroke()}
    g.strokeStyle='#5A3518';g.lineWidth=2.4;g.beginPath();g.moveTo(0,-11);g.lineTo(2,-17);g.stroke();
    return spriteCache.acorn=cv;
  }
  // The turkey is three sprites (tail fan, body and legs, neck and head with a pilgrim hat) so each can move a little.
  // Drawn facing right; the scene flips it to face the page. k: device pixels per unit (it is about 170 units wide).
  var TAILC=['#B8402A','#E07B2A','#F0B040','#9A5A2E'];
  function turkeySprites(k){
    var key='turkey:'+k.toFixed(3)+(light?'L':'D');if(spriteCache[key])return spriteCache[key];
    function mk(w,h,ox,oy,fn){
      var c=document.createElement('canvas');c.width=Math.ceil(w*k);c.height=Math.ceil(h*k);
      var g=c.getContext('2d');g.setTransform(k,0,0,k,ox*k,oy*k);g.lineJoin='round';g.lineCap='round';fn(g);
      return {cv:c,ox:ox*k,oy:oy*k};
    }
    // on a dark page a thin pale rim keeps the brown bird and the black hat from sinking into the background
    var edge=light?'rgba(60,24,6,.6)':'rgba(24,8,2,.85)',rim=light?null:'rgba(255,222,170,.42)';
    var tail=mk(176,96,88,90,function(g){
      for(var i=0;i<9;i++){
        g.save();g.rotate(-1.22+i*(2.44/8));
        ell(g,0,-44,11.5,37);g.fillStyle=TAILC[i%4];g.fill();
        g.save();g.clip();g.fillStyle='rgba(74,32,12,.6)';ell(g,0,-64,13,8);g.fill();g.fillStyle='#F6E3B0';ell(g,0,-79,10,7);g.fill();g.restore();
        ell(g,0,-44,11.5,37);g.strokeStyle=edge;g.lineWidth=1.2;g.stroke();
        g.beginPath();g.moveTo(0,-10);g.lineTo(0,-70);g.strokeStyle='rgba(60,24,6,.35)';g.lineWidth=1;g.stroke();
        g.restore();
      }
    });
    var body=mk(96,84,48,80,function(g){
      g.strokeStyle='#E8922E';g.lineWidth=3.2;
      [-9,9].forEach(function(x){g.beginPath();g.moveTo(x,-18);g.lineTo(x,-2);g.lineTo(x-7,1);g.moveTo(x,-2);g.lineTo(x+7,1);g.moveTo(x,-2);g.lineTo(x,2);g.stroke()});
      var gr=g.createLinearGradient(-30,-70,30,-14);gr.addColorStop(0,'#99592C');gr.addColorStop(1,'#5E3216');
      ell(g,0,-44,33,29);g.fillStyle=gr;g.fill();g.strokeStyle=edge;g.lineWidth=1.4;g.stroke();
      if(rim){ell(g,0,-44,34.3,30.3);g.strokeStyle=rim;g.lineWidth=1;g.stroke()}
      g.strokeStyle='rgba(50,22,8,.45)';g.lineWidth=1.2;
      for(var r=0;r<3;r++)for(var c=0;c<3;c++){g.beginPath();g.arc(9+c*8-r*3,-38+r*8,4.5,.2,2.9);g.stroke()}
      ell(g,-9,-43,19,14,-.2);g.fillStyle='#B06C34';g.fill();g.strokeStyle=edge;g.lineWidth=1.2;g.stroke();
      g.strokeStyle='rgba(60,26,8,.5)';for(var j=0;j<3;j++){g.beginPath();g.arc(-11,-45,6+j*4.2,.5,2.3);g.stroke()}
    });
    function head(blink){return mk(64,88,16,80,function(g){
      g.beginPath();g.moveTo(0,0);g.bezierCurveTo(4,-16,6,-26,12,-36);g.strokeStyle=edge;g.lineWidth=15.4;g.stroke();
      g.strokeStyle='#7A4322';g.lineWidth=13;g.stroke();
      ell(g,13,-41,11.5,11.5);g.fillStyle='#8E5128';g.fill();g.strokeStyle=edge;g.lineWidth=1.3;g.stroke();
      if(rim){ell(g,13,-41,12.7,12.7);g.strokeStyle=rim;g.lineWidth=1;g.stroke()}
      g.beginPath();g.moveTo(22,-45);g.lineTo(35,-40);g.lineTo(22,-36);g.closePath();g.fillStyle='#F2B33D';g.fill();g.strokeStyle='rgba(110,64,8,.7)';g.lineWidth=1;g.stroke();
      g.beginPath();g.moveTo(22,-38);g.bezierCurveTo(30,-36,30,-24,25,-22);g.bezierCurveTo(20,-24,20,-32,22,-38);g.fillStyle='#D23B2E';g.fill();g.strokeStyle='rgba(110,16,10,.6)';g.stroke();
      if(blink){g.beginPath();g.moveTo(13.5,-44);g.lineTo(20,-44);g.strokeStyle='#2A1408';g.lineWidth=1.6;g.stroke()}
      else{ell(g,16.5,-44,3.6,3.6);g.fillStyle='#fff';g.fill();ell(g,17.6,-44,1.8,1.8);g.fillStyle='#1B0F08';g.fill()}
      g.save();g.translate(12,-51);g.rotate(-.14);   // the pilgrim hat
      g.fillStyle='#1E1B1A';g.beginPath();g.moveTo(-8,0);g.lineTo(8,0);g.lineTo(6.5,-17);g.lineTo(-6.5,-17);g.closePath();g.fill();
      g.fillRect(-14,-1.5,28,3.6);
      g.fillStyle='#6B4423';g.fillRect(-7.8,-6.5,15.6,4.5);
      g.strokeStyle='#F2C34B';g.lineWidth=1.5;g.strokeRect(-3,-7.2,6,5.6);
      if(rim){g.strokeStyle=rim;g.lineWidth=1;g.beginPath();g.moveTo(-14,-1.5);g.lineTo(-8,-1.5);g.lineTo(-6.5,-17);g.lineTo(6.5,-17);g.lineTo(8,-1.5);g.lineTo(14,-1.5);g.stroke()}
      g.restore();
    })}
    return spriteCache[key]={tail:tail,body:body,head:head(false),blink:head(true)};
  }

  /* ---------- the winter scene: a tree, a snowman, a menorah, a diya, gingerbread and lights ---------- */
  // Each is drawn standing at x, y (bottom centre) at size k, like the pumpkins.
  function drawTree(g,x,y,k){
    g.save();g.translate(x,y);g.scale(k,k);g.lineJoin='round';g.lineCap='round';
    g.fillStyle='rgba(20,40,70,.18)';ell(g,0,-1,62,8);g.fill();
    g.fillStyle='#6B4423';g.fillRect(-7,-18,14,18);
    [[58,-14,-72],[46,-48,-106],[34,-82,-136],[22,-114,-160]].forEach(function(t,i){
      var gr=g.createLinearGradient(-t[0],t[1],t[0],t[2]);gr.addColorStop(0,'#1B6A3B');gr.addColorStop(1,'#2E8B50');
      g.beginPath();g.moveTo(0,t[2]);g.lineTo(t[0],t[1]);g.quadraticCurveTo(0,t[1]+9,-t[0],t[1]);g.closePath();
      g.fillStyle=gr;g.fill();g.strokeStyle='rgba(10,52,28,.7)';g.lineWidth=1.4;g.stroke();
      // snow resting on the tips of each tier, and a string of lights across it
      g.fillStyle='#FFFFFF';ell(g,-t[0]+7,t[1]-1,8,3.2,.25);g.fill();ell(g,t[0]-7,t[1]-1,8,3.2,-.25);g.fill();
      g.beginPath();g.moveTo(-t[0]*.82,t[1]-9);g.quadraticCurveTo(0,t[1]+2,t[0]*.82,t[1]-11);g.strokeStyle='#F2C34B';g.lineWidth=1.3;g.stroke();
      var cols=['#E5483F','#FFD34D','#4FA3F7','#F37FB7'];
      for(var j=0;j<4+(3-i);j++){var u=(j+.5)/(4+(3-i)),lx=-t[0]*.82+u*t[0]*1.64,ly=t[1]-9+(-2*u*u+2*u)*10-u*2;ell(g,lx,ly+2.5,2.6,2.6);g.fillStyle=cols[(j+i)%4];g.fill()}
    });
    [[-24,-38,'#E5483F'],[20,-34,'#4FA3F7'],[-4,-58,'#FFD34D'],[14,-70,'#E5483F'],[-16,-92,'#F37FB7'],[8,-100,'#FFD34D'],[-4,-126,'#4FA3F7']].forEach(function(o){
      ell(g,o[0],o[1],4.6,4.6);g.fillStyle=o[2];g.fill();g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=.8;g.stroke();g.fillStyle='rgba(255,255,255,.6)';ell(g,o[0]-1.4,o[1]-1.5,1.3,1.3);g.fill()});
    g.beginPath();for(var i=0;i<10;i++){var a=-1.5708+i*.6283,r=i%2?5:11;g.lineTo(Math.cos(a)*r,-166+Math.sin(a)*r)}g.closePath();
    g.fillStyle='#FFD34D';g.fill();g.strokeStyle='rgba(150,100,10,.7)';g.lineWidth=1;g.stroke();
    // presents
    [[-66,-2,26,20,'#D8433B','#FFE08A'],[-38,-2,18,14,'#2F7FD6','#FFFFFF'],[38,-2,24,18,'#3BA55D','#E5483F']].forEach(function(b){
      g.fillStyle=b[4];g.fillRect(b[0],b[1]-b[3],b[2],b[3]);g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;g.strokeRect(b[0],b[1]-b[3],b[2],b[3]);
      g.fillStyle=b[5];g.fillRect(b[0]+b[2]/2-2,b[1]-b[3],4,b[3]);g.fillRect(b[0],b[1]-b[3]/2-2,b[2],4);
      g.beginPath();g.ellipse(b[0]+b[2]/2-4,b[1]-b[3]-2.5,4.5,2.6,-.5,0,6.2832);g.ellipse(b[0]+b[2]/2+4,b[1]-b[3]-2.5,4.5,2.6,.5,0,6.2832);g.fill();
    });
    g.restore();
  }
  function drawSnowman(g,x,y,k){
    g.save();g.translate(x,y);g.scale(k,k);g.lineJoin='round';g.lineCap='round';
    g.fillStyle='rgba(20,40,70,.18)';ell(g,0,-1,40,7);g.fill();
    g.strokeStyle='#6B4423';g.lineWidth=3;   // stick arms
    g.beginPath();g.moveTo(-20,-76);g.lineTo(-48,-94);g.moveTo(-40,-89);g.lineTo(-47,-80);g.moveTo(-42,-90);g.lineTo(-44,-101);
    g.moveTo(20,-76);g.lineTo(46,-100);g.moveTo(39,-94);g.lineTo(49,-91);g.moveTo(41,-96);g.lineTo(40,-107);g.stroke();
    [[0,-30,31],[0,-74,23],[0,-106,17]].forEach(function(b){
      var gr=g.createRadialGradient(b[0]-b[2]*.35,b[1]-b[2]*.4,2,b[0],b[1],b[2]);gr.addColorStop(0,'#FFFFFF');gr.addColorStop(1,'#D6E4F4');
      ell(g,b[0],b[1],b[2],b[2]);g.fillStyle=gr;g.fill();g.strokeStyle='rgba(96,130,176,.75)';g.lineWidth=1.4;g.stroke()});
    g.fillStyle='#22262C';[[0,-84],[0,-72],[0,-60]].forEach(function(b){ell(g,b[0],b[1],2.6,2.6);g.fill()});
    ell(g,-6,-110,2.2,2.2);g.fill();ell(g,6,-110,2.2,2.2);g.fill();
    [-7,-3.5,0,3.5,7].forEach(function(dx,i){ell(g,dx,-99+(i===2?1.6:Math.abs(dx)<4?1:0)-1,1.1,1.1);g.fill()});
    g.beginPath();g.moveTo(0,-106);g.lineTo(17,-103);g.lineTo(0,-101.5);g.closePath();g.fillStyle='#F28A2E';g.fill();g.strokeStyle='rgba(150,70,10,.7)';g.lineWidth=.9;g.stroke();
    // scarf and hat
    g.fillStyle='#D8433B';g.beginPath();g.moveTo(-17,-95);g.quadraticCurveTo(0,-87,17,-95);g.lineTo(17,-89);g.quadraticCurveTo(0,-81,-17,-89);g.closePath();g.fill();
    g.fillRect(8,-90,8,22);g.fillStyle='#FFFFFF';g.fillRect(8,-76,8,3);g.fillRect(8,-71,8,3);
    g.fillStyle='#22262C';g.fillRect(-18,-122,36,4);g.fillRect(-12,-144,24,23);g.fillStyle='#D8433B';g.fillRect(-12,-128,24,5);
    g.restore();
  }
  function flame(g,x,y,h){
    var gr=g.createLinearGradient(0,y-h,0,y);gr.addColorStop(0,'#FFF3B0');gr.addColorStop(.55,'#FFC23D');gr.addColorStop(1,'#F2742E');
    g.beginPath();g.moveTo(x,y-h);g.bezierCurveTo(x+h*.42,y-h*.45,x+h*.34,y,x,y);g.bezierCurveTo(x-h*.34,y,x-h*.42,y-h*.45,x,y-h);
    g.fillStyle=gr;g.fill();
  }
  function drawMenorah(g,x,y,k){
    g.save();g.translate(x,y);g.scale(k,k);g.lineJoin='round';g.lineCap='round';
    g.fillStyle='rgba(20,40,70,.18)';ell(g,0,-1,34,5);g.fill();
    g.strokeStyle='#D9A936';g.fillStyle='#E9BE4B';
    g.beginPath();g.moveTo(-20,0);g.lineTo(20,0);g.lineTo(11,-7);g.lineTo(-11,-7);g.closePath();g.fill();
    g.lineWidth=4.5;g.beginPath();g.moveTo(0,-6);g.lineTo(0,-60);g.stroke();
    g.lineWidth=3.4;
    for(var i=1;i<=4;i++){var r=i*10.5;g.beginPath();g.arc(0,-52,r,0,Math.PI);g.stroke()}
    for(i=-4;i<=4;i++){
      var cx=i*10.5,top=i?-52:-60;
      g.fillStyle='#E9BE4B';g.fillRect(cx-4,top-3,8,4);
      g.fillStyle=i%2?'#FFFFFF':'#4F8FEA';g.fillRect(cx-2.4,top-17,4.8,14);
      g.strokeStyle='rgba(40,60,110,.45)';g.lineWidth=.7;g.strokeRect(cx-2.4,top-17,4.8,14);g.strokeStyle='#D9A936';
      flame(g,cx,top-17,9);
    }
    g.restore();
  }
  function drawDiya(g,x,y,k){
    g.save();g.translate(x,y);g.scale(k,k);g.lineJoin='round';g.lineCap='round';
    // a little rangoli of dots in front, then the clay lamp and its flame
    var cols=['#F37FB7','#FFD34D','#4FD1A5','#F2742E','#8E7BEF'];
    for(var i=0;i<9;i++){var a=Math.PI*(i/8),r=27;ell(g,Math.cos(a)*r,-2+Math.sin(a)*5,2.1,1.5);g.fillStyle=cols[i%5];g.fill()}
    var gl=g.createRadialGradient(15,-24,1,15,-24,26);gl.addColorStop(0,'rgba(255,214,110,.55)');gl.addColorStop(1,'rgba(255,214,110,0)');
    g.fillStyle=gl;g.fillRect(-14,-52,58,54);
    g.beginPath();g.moveTo(-19,-13);g.quadraticCurveTo(-17,0,0,0);g.quadraticCurveTo(15,0,19,-10);g.lineTo(26,-15);g.lineTo(18,-14);g.closePath();
    var gr=g.createLinearGradient(0,-15,0,0);gr.addColorStop(0,'#D97B45');gr.addColorStop(1,'#A9522A');
    g.fillStyle=gr;g.fill();g.strokeStyle='rgba(90,36,12,.7)';g.lineWidth=1.2;g.stroke();
    g.fillStyle='#E99A5C';ell(g,0,-13,18.5,3.4);g.fill();g.stroke();
    g.fillStyle='#FFD34D';for(i=-2;i<=2;i++){ell(g,i*6.4,-6.5+Math.abs(i)*-.6,1.5,1.5);g.fill()}
    flame(g,19,-14,13);
    g.restore();
  }
  // a gingerbread man; hangs from a thread when hang is given (the thread goes up that far)
  function drawGingerbread(g,x,y,k,hang){
    g.save();g.translate(x,y);g.scale(k,k);g.lineJoin='round';g.lineCap='round';
    if(hang){g.strokeStyle=light?'rgba(120,80,40,.7)':'rgba(240,220,190,.6)';g.lineWidth=1;g.beginPath();g.moveTo(0,-52);g.lineTo(0,-52-hang);g.stroke()}
    g.strokeStyle='#B5733A';g.lineWidth=11;g.beginPath();
    g.moveTo(-15,-28);g.lineTo(15,-28);g.moveTo(0,-36);g.lineTo(0,-18);g.moveTo(-1,-18);g.lineTo(-9,-4);g.moveTo(1,-18);g.lineTo(9,-4);g.stroke();
    g.fillStyle='#B5733A';ell(g,0,-42,10,10);g.fill();
    g.strokeStyle='rgba(90,50,16,.45)';g.lineWidth=1;ell(g,0,-42,10,10);g.stroke();
    g.fillStyle='#FFFFFF';ell(g,-3.6,-44,1.5,1.5);g.fill();ell(g,3.6,-44,1.5,1.5);g.fill();
    g.strokeStyle='#FFFFFF';g.lineWidth=1.4;g.beginPath();g.arc(0,-41.5,4.6,.35,2.8);g.stroke();
    g.beginPath();g.moveTo(-18,-31);g.lineTo(-15,-25);g.moveTo(18,-31);g.lineTo(15,-25);g.moveTo(-13,-7);g.lineTo(-7,-3);g.moveTo(13,-7);g.lineTo(7,-3);g.stroke();
    g.fillStyle='#E5483F';ell(g,0,-29,2,2);g.fill();g.fillStyle='#3BA55D';ell(g,0,-22,2,2);g.fill();
    g.restore();
  }
  // a string of coloured bulbs sagging from (x0, y0) to (x1, y1)
  function drawLights(g,x0,y0,x1,y1,sag){
    var n=Math.max(3,Math.round(Math.abs(x1-x0)/30)),cols=['#E5483F','#FFD34D','#3BA55D','#4FA3F7'];
    g.strokeStyle=light?'rgba(40,70,60,.8)':'rgba(20,30,40,.9)';g.lineWidth=1.6;g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo((x0+x1)/2,(y0+y1)/2+sag*2,x1,y1);g.stroke();
    for(var i=0;i<n;i++){var t=(i+.5)/n,u=1-t,mx=(x0+x1)/2,my=(y0+y1)/2+sag*2,bx=u*u*x0+2*u*t*mx+t*t*x1,by=u*u*y0+2*u*t*my+t*t*y1;
      g.fillStyle='rgba(30,40,50,.9)';g.fillRect(bx-2,by,4,3.5);
      var gl=g.createRadialGradient(bx,by+8,0,bx,by+8,11);gl.addColorStop(0,cols[i%4]);gl.addColorStop(1,'rgba(255,255,255,0)');
      g.globalAlpha=.35;g.fillStyle=gl;g.fillRect(bx-11,by-3,22,22);g.globalAlpha=1;
      g.fillStyle=cols[i%4];ell(g,bx,by+8,3.4,5);g.fill();g.fillStyle='rgba(255,255,255,.55)';ell(g,bx-1,by+6.5,1,1.6);g.fill()}
  }
  function drawWinterScene(){
    var g=bgx,k=scene.k,x;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
    // cold light from the top left, and a deeper foot of the page
    var gl=g.createRadialGradient(W*.14,-H*.08,0,W*.14,-H*.08,Math.max(W,H)*.95);
    gl.addColorStop(0,light?'rgba(255,255,255,.8)':'rgba(140,186,255,.2)');gl.addColorStop(.55,light?'rgba(236,246,255,.2)':'rgba(110,160,240,.06)');gl.addColorStop(1,'rgba(200,225,255,0)');
    g.fillStyle=gl;g.fillRect(0,0,W,H);
    var sh=g.createLinearGradient(0,H*.5,0,H);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,light?'rgba(70,120,190,.2)':'rgba(2,10,30,.5)');
    g.fillStyle=sh;g.fillRect(0,H*.5,W,H*.5);
    // snowy ground along the bottom edge
    var m=scene.mh;g.beginPath();g.moveTo(0,H);
    for(x=0;x<=W+12;x+=12)g.lineTo(x,H-m*(.6+.24*Math.sin(x*.006+seedA)+.16*Math.sin(x*.019+seedB)));
    g.lineTo(W+12,H);g.closePath();
    var fg=g.createLinearGradient(0,H-m,0,H);fg.addColorStop(0,light?'#FFFFFF':'rgba(224,236,250,.96)');fg.addColorStop(1,light?'#DCE9F8':'rgba(170,196,228,.96)');
    g.fillStyle=fg;g.fill();g.strokeStyle=light?'rgba(104,140,184,.6)':'rgba(120,150,200,.5)';g.lineWidth=1;g.stroke();
    if(!scene.roomy)return;   // no margins to stand in: the decorations go at the foot of the page instead (footScene)
    var px=scene.px,tx=scene.tx,by=scene.base+4,gut=scene.gut;
    if(holiday){
      // lights strung across the top of each margin, with gingerbread hanging from them
      drawLights(g,-6,8,gut-14,18,13);drawLights(g,W-gut+14,18,W+6,8,13);
      drawGingerbread(g,gut*.34,104,k*.8,34);drawGingerbread(g,W-gut*.36,112,k*.8,40);
      drawTree(g,px-4*k,by,k*.82);
      drawDiya(g,px+50*k,by+6,k*.7);
      drawMenorah(g,tx+34*k,by+2,k*.62);
      drawSnowman(g,tx-22*k,by+4,k*.78);
    }else drawSnowman(g,tx,by+4,k*.9);
  }

  /* ---------- the effect ---------- */
  var cv=null,ctx=null,W=0,H=0,parts=[],rest=[],season='none',light=true,raf=0,last=0,t0=0,clock=0,still=false,ground=null,btn=null,covered=false;
  var bg=null,bgx=null,scene=null,seedA=0,seedB=0;   // the still canvas, where things stand, and the shape of the field or the snow
  var holiday=false,pixelMode=false;
  function rnd(a,b){return a+Math.random()*(b-a)}

  function size(){
    if(!cv)return false;
    var w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return false;
    var nd=pixelMode?.34:Math.min(window.devicePixelRatio||1,phone?1.5:2);   // retro TV look: one canvas pixel is about three screen pixels
    if(w===W&&h===H&&nd===dpr)return false;
    if(nd!==dpr){dpr=nd;spriteCache={}}
    var ow=W||w,oh=H||h;W=w;H=h;
    cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
    if(bg){bg.width=cv.width;bg.height=cv.height}
    parts.forEach(function(p){p.x=p.x/ow*w;p.bx=p.bx/ow*w;p.y=p.y/oh*h});
    makeGround();
    if(bg){layoutScene();drawScene()}
    return true;
  }

  function counts(){
    var a=W*H/1024000;
    if(season==='fall')return {n:Math.round(Math.max(8,Math.min(phone?11:28,a*27)))*(still?.25:1)|0,r:phone?5:10,ac:still?0:phone?1:3};
    return {n:Math.round(Math.max(18,Math.min(phone?28:56,a*50)))*(still?.3:1)|0,f:(phone?7:14)-(still?(phone?4:8):0)};
  }

  function spawnLeaf(p,top){
    p.kind='leaf';p.s=PICK[Math.random()*PICK.length|0];p.ci=Math.random()*COLORS.length|0;
    p.size=rnd(30,50)*(phone?.8:1);p.bx=rnd(0,W);p.x=p.bx;p.y=top?rnd(-90,-40):rnd(-40,H);
    p.vy=rnd(14,28);p.amp=rnd(20,50);p.fr=rnd(.15,.35);p.ph=rnd(0,6.3);
    p.rot=rnd(0,6.3);p.vr=rnd(-.5,.5);p.tf=rnd(.25,.7);p.tp=rnd(0,6.3);p.a=rnd(.85,.97);
    return p;
  }
  // an acorn now and then: straight down, quicker than a leaf, starting well above the screen so they come one at a time
  function spawnAcorn(p){
    p.kind='acorn';p.size=rnd(15,21)*(phone?.85:1);p.bx=rnd(20,W-20);p.x=p.bx;p.y=-rnd(60,H*2.2);
    p.vy=rnd(80,120);p.amp=rnd(0,5);p.fr=rnd(.1,.2);p.ph=rnd(0,6.3);p.rot=rnd(0,6.3);p.vr=rnd(-2.2,2.2);p.a=1;
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
      for(i=0;i<c.ac;i++)parts.push(spawnAcorn({}));
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

  // Where the scene stands. gut is the empty margin either side of the page's column: with room there, the pumpkins
  // and the turkey stand in the margins; without (phones, narrow windows) they shrink into the bottom corners.
  function layoutScene(){
    var wrap=document.querySelector('.wrap'),ww=wrap?wrap.getBoundingClientRect().width:Math.min(W,1040);
    var gut=Math.max(0,(W-ww)/2),roomy=gut>=120&&!phone,k=phone?.56:Math.max(.62,Math.min(1,.5+gut/330)),mh=phone?26:44;
    scene={gut:gut,roomy:roomy,k:k,tk:k*.9,mh:mh,base:H-mh*.42,
      px:Math.max(gut*.5,66*k+6),tx:W-Math.max(gut*.5,78*k+4)};
    footScene();
  }
  function drawBranch(g){
    var L=Math.min(scene.gut+26,230);
    g.strokeStyle=light?'#6E4526':'#241106';g.lineCap='round';
    g.lineWidth=11;g.beginPath();g.moveTo(-8,74);g.bezierCurveTo(L*.25,62,L*.5,70,L*.72,48);g.stroke();
    g.lineWidth=6;g.beginPath();g.moveTo(L*.72,48);g.quadraticCurveTo(L*.88,38,L,40);g.stroke();
    g.lineWidth=4.5;g.beginPath();g.moveTo(L*.34,65);g.quadraticCurveTo(L*.42,96,L*.6,104);g.stroke();
    g.lineWidth=3.5;g.beginPath();g.moveTo(L*.52,66);g.quadraticCurveTo(L*.56,36,L*.7,22);g.stroke();
    g.lineWidth=3;g.beginPath();g.moveTo(L*.16,66);g.quadraticCurveTo(L*.2,44,L*.3,34);g.stroke();
    // the leaves still hanging on: [x, y, turn, shape, colour], stem at the twig
    [[L,40,2.2,1,1],[L*.6,104,2.9,2,3],[L*.7,22,.5,1,0],[L*.3,34,.2,2,2],[L*.86,39,3.5,3,4],[L*.47,86,3.7,0,5],[L*.08,71,2.6,1,6],[L*.4,62,-.5,2,1]].forEach(function(a){
      var sp=leafSprite(a[3],a[4]),w=40;
      g.save();g.translate(a[0],a[1]);g.rotate(a[2]);g.drawImage(sp,-w/2,-w*.973,w,w);g.restore();
    });
  }
  // The parts of the scene that never move, drawn once on the still canvas.
  function drawScene(){
    if(!bg||!scene)return;
    if(season==='winter'){drawWinterScene();return}
    var g=bgx,k=scene.k,i;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
    // a low sun in the top right, and the foot of the page a little deeper
    var gl=g.createRadialGradient(W*.84,-H*.08,0,W*.84,-H*.08,Math.max(W,H)*.95);
    gl.addColorStop(0,light?'rgba(255,247,220,.75)':'rgba(255,176,84,.22)');
    gl.addColorStop(.55,light?'rgba(255,238,200,.2)':'rgba(255,150,60,.07)');
    gl.addColorStop(1,'rgba(255,200,120,0)');
    g.fillStyle=gl;g.fillRect(0,0,W,H);
    var sh=g.createLinearGradient(0,H*.45,0,H);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,light?'rgba(196,104,36,.22)':'rgba(16,5,0,.45)');
    g.fillStyle=sh;g.fillRect(0,H*.45,W,H*.55);
    if(scene.roomy)drawBranch(g);
    // the field along the bottom edge
    var m=scene.mh;g.beginPath();g.moveTo(0,H);
    for(var x=0;x<=W+12;x+=12)g.lineTo(x,H-m*(.6+.24*Math.sin(x*.006+seedA)+.16*Math.sin(x*.019+seedB)));
    g.lineTo(W+12,H);g.closePath();
    var fg=g.createLinearGradient(0,H-m,0,H);
    fg.addColorStop(0,light?'rgba(201,124,54,.55)':'rgba(34,14,3,.8)');fg.addColorStop(1,light?'rgba(160,88,30,.75)':'rgba(18,7,1,.95)');
    g.fillStyle=fg;g.fill();
    if(!scene.roomy)return;   // no margins to stand in: the pumpkins and the turkey go at the foot of the page instead (footScene)
    // wheat behind the pumpkin patch, then the pumpkins: a pale one at the back, the big one, a small one in front
    var px=scene.px,by=scene.base;
    for(i=0;i<6;i++)drawWheat(g,px+(-36+i*14)*k,by+4,(92+(i*37%52))*k,(-16+i*6.5)*k,k);
    drawPumpkin(g,px-36*k,by-3,k*.6,PUMPKINS[1]);
    drawPumpkin(g,px+8*k,by+5,k*.95,PUMPKINS[0]);
    drawPumpkin(g,px+58*k,by+8,k*.42,PUMPKINS[2]);
    // by the turkey: two stalks behind it and a little pumpkin at its feet
    var tx=scene.tx;
    for(i=0;i<3;i++)drawWheat(g,tx+(34+i*11)*k,by+4,(84+i*18)*k,(10+i*5)*k,k);
    drawPumpkin(g,tx-52*k,by+7,k*.38,PUMPKINS[0]);
  }
  // The turkey: its tail sways, it bobs, blinks, and every few seconds pecks at the ground twice. x, y: its feet, in
  // the canvas's own pixels; k: canvas pixels per unit; t: the clock, or null to draw it standing still.
  function drawTurkey(g,x,y,k,t){
    var sp=turkeySprites(k),mv=t!==null;if(!mv)t=0;
    var bob=Math.sin(t*1.8)*.8*k,sway=.035*Math.sin(t*.9),cyc=t%9;
    var ha=mv&&cyc<1.1?.8*Math.abs(Math.sin(cyc/1.1*6.2832)):.05*Math.sin(t*1.3);
    var hd=mv&&t%4.3<.13?sp.blink:sp.head;
    g.globalAlpha=1;
    g.setTransform(1,0,0,1,x,y);g.fillStyle='rgba(30,10,0,.28)';g.beginPath();g.ellipse(0,k,40*k,6*k,0,0,6.2832);g.fill();
    // facing left, towards the page: flip, then place each part
    function part(q,dx,dy,rot){g.setTransform(-1,0,0,1,x,y);g.translate(dx,dy);if(rot)g.rotate(rot);g.drawImage(q.cv,-q.ox,-q.oy)}
    part(sp.tail,-4*k,-46*k+bob,sway);
    part(sp.body,0,bob,0);
    part(hd,17*k,-60*k+bob,ha);
  }
  // Where the page has no margins for the scene (phones, narrow windows), a small still copy of it goes at the top of
  // the page's footer instead: wheat, two pumpkins and the turkey on a little mound.
  var foot=null;
  function footScene(){
    var f=document.querySelector('footer, .foot'),win=season==='winter';
    if((season!=='fall'&&!win)||!scene||scene.roomy||!f){if(foot){foot.remove();foot=null}return}
    var fw=win&&holiday?300:230;
    if(!foot){
      foot=document.createElement('canvas');foot.className='season-foot';foot.setAttribute('aria-hidden','true');
      f.insertBefore(foot,f.firstChild);
    }
    foot.style.cssText='display:block;width:'+fw+'px;max-width:100%;height:auto;aspect-ratio:'+fw+'/108;margin:0 auto 12px;pointer-events:none';
    var d=dpr,g=foot.getContext('2d'),i;foot.width=Math.round(fw*d);foot.height=Math.round(108*d);
    g.setTransform(d,0,0,d,0,0);
    if(win){
      g.beginPath();g.ellipse(fw/2,108,fw/2-2,17,0,Math.PI,0);g.fillStyle=light?'#FFFFFF':'rgba(226,238,252,.95)';g.fill();
      if(holiday){drawTree(g,44,100,.5);drawDiya(g,96,101,.62);drawMenorah(g,150,100,.6);drawGingerbread(g,206,98,.8);drawSnowman(g,256,100,.6)}
      else drawSnowman(g,fw/2,100,.68);
    }else{
      g.beginPath();g.ellipse(115,108,113,17,0,Math.PI,0);g.fillStyle=light?'rgba(190,112,46,.6)':'rgba(24,9,1,.9)';g.fill();
      for(i=0;i<5;i++)drawWheat(g,22+i*13,98,(52+(i*37%30)),-9+i*4.5,.62);
      drawPumpkin(g,40,97,.42,PUMPKINS[1]);drawPumpkin(g,78,100,.62,PUMPKINS[0]);drawPumpkin(g,118,101,.3,PUMPKINS[2]);
      drawTurkey(g,172*d,99*d,.6*d,null);
    }
    g.setTransform(1,0,0,1,0,0);
  }

  function step(dt){
    clock+=dt;var wind=season==='fall'?10*Math.sin(clock*.07):5*Math.sin(clock*.11);
    for(var i=0;i<parts.length;i++){
      var p=parts[i];
      p.y+=p.vy*dt;p.bx+=wind*dt;p.rot+=p.vr*dt;
      p.x=p.bx+p.amp*Math.sin(p.ph+clock*p.fr*6.283);
      if(p.bx<-60)p.bx+=W+120;else if(p.bx>W+60)p.bx-=W+120;
      if(p.y>H+p.size+4){if(p.kind==='leaf')spawnLeaf(p,true);else if(p.kind==='acorn')spawnAcorn(p);else spawnSnow(p,true,p.kind==='flake')}
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
      }else if(p.kind==='acorn'){spr=acornSprite();k=k/(40*dpr);g.globalAlpha=1;g.setTransform(c*k,s*k,-s*k,c*k,p.x*dpr,p.y*dpr)}
      else if(p.kind==='flake'){spr=fl;k=k/(64*dpr);g.globalAlpha=p.a;g.setTransform(c*k,s*k,-s*k,c*k,p.x*dpr,p.y*dpr)}
      else{spr=dot;k=k/(16*dpr);g.globalAlpha=p.a;g.setTransform(k,0,0,k,p.x*dpr,p.y*dpr)}
      half=spr.width/2;g.drawImage(spr,-half,-half);
    }
    g.globalAlpha=1;
    for(i=0;i<rest.length;i++){
      var r=rest[i],rc=Math.cos(r.rot),rs=Math.sin(r.rot),rk=r.size*dpr/(SPR*.82*dpr);
      g.setTransform(rc*r.flip*rk,rs*r.flip*rk,-rs*rk,rc*rk,r.xr*W*dpr,(H-r.size*(.5-r.sink))*dpr);
      spr=leafSprite(r.s,r.ci);g.drawImage(spr,-spr.width/2,-spr.width/2);
    }
    if(season==='fall'&&scene&&scene.roomy)drawTurkey(g,scene.tx*dpr,(scene.base+3)*dpr,scene.tk*dpr,still?null:clock);
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
    if(window.BackRoomHoliday)window.BackRoomHoliday.stop();
    if(bg){bg.remove();bg=null;bgx=null}
    if(foot){foot.remove();foot=null}
    parts=[];rest=[];W=H=0;ground=null;scene=null;tint('none');
  }
  function start(s){
    stop();season=s;holiday=s==='winter'&&holidayNow();updateButton();
    if(s==='none'||isOff())return;
    light=tint(s);still=mqStill.matches;clock=0;
    cv=document.createElement('canvas');cv.id='season-fx';cv.setAttribute('aria-hidden','true');
    document.body.insertBefore(cv,document.body.firstChild);
    ctx=cv.getContext('2d');
    if(s==='fall'||s==='winter'){   // the still part of the scene goes on its own canvas, under the moving one
      bg=document.createElement('canvas');bg.id='season-bg';bg.setAttribute('aria-hidden','true');
      document.body.insertBefore(bg,cv);bgx=bg.getContext('2d');seedA=rnd(0,6.3);seedB=rnd(0,6.3);
    }
    size();populate();
    if(still){step(0);draw()}else play();
    if(holiday)loadHoliday();
  }
  // The cabin and the retro TV look live in holiday.js, loaded only during the holidays and only on the pages that
  // list the games (the Back Room page, its copy on the home page, and the phone page).
  var holidayAsked=false;
  function loadHoliday(){
    if(!document.querySelector('.br-games, #lists'))return;
    if(window.BackRoomHoliday){window.BackRoomHoliday.start();return}
    if(holidayAsked)return;holidayAsked=true;
    var sc=document.createElement('script');sc.src=BASE+'holiday.js';
    sc.onload=function(){if(holiday&&cv&&window.BackRoomHoliday)window.BackRoomHoliday.start()};
    sc.onerror=function(){holidayAsked=false};
    document.head.appendChild(sc);
  }
  // forced: 'winter' is winter without the holidays, 'holiday' is winter with them
  function current(){return forced==='holiday'?'winter':forced||seasonFor(new Date())}
  function holidayNow(){return forced==='holiday'||(!forced&&seasonFor(new Date())==='winter'&&holidayFor(new Date()))}

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
    var off=isOff(),what=s==='fall'?'fall scene':'snow';
    btn.textContent=s==='fall'?'🍂':'❄';
    btn.style.opacity=off?'.45':'.85';
    btn.title=(off?'Turn on the ':'Turn off the ')+what+' (just for this browser)';
    btn.setAttribute('aria-label',btn.title);btn.setAttribute('aria-pressed',off?'false':'true');
  }

  /* ---------- wiring ---------- */
  document.addEventListener('visibilitychange',function(){if(document.hidden)pause();else play()});
  window.addEventListener('resize',function(){if(cv&&size()){if(still){step(0);draw()}}else if(bg){layoutScene();drawScene()}});
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
    set:function(s){forced=s==='fall'||s==='winter'||s==='holiday'||s==='none'?s:null;start(current());return season},
    holidayFor:holidayFor,
    get holiday(){return holiday},
    get off(){return isOff()},
    // the retro TV look (holiday.js) asks for the scene and the snow to be drawn in big pixels
    pixel:function(on){on=!!on;if(on===pixelMode)return;pixelMode=on;if(cv){size();if(still){step(0);draw()}}},
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
