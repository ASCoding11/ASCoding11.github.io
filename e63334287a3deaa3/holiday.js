/*
 * The holidays (Back Room): the cabin and the retro TV look.
 *
 * Loaded by seasons.js, and only during the holidays (the day after Thanksgiving to January 6, by the viewer's own
 * date: seasons.js's holidayFor) on the pages that list the games: the Back Room page, its copy on the home page and
 * the phone page. Nothing else loads it. seasons.js calls BackRoomHoliday.start(used) when the winter look starts
 * (used: the visitor has already clicked, typed or scrolled on the page) and stop() when it ends or is switched off
 * with the ❄ button in the footer.
 *
 * 1. The cabin. Once per browser tab (sessionStorage "holiday:seen"), the page opens on a log cabin at night: a
 *    fireplace, a tree, a window with snow falling outside, and in the middle an old TV showing the Back Room's
 *    title. Click the TV (or press Enter or Space, or use Skip) and the picture zooms into the screen and the page
 *    is there. It is one <canvas> drawn in code as chunky pixel art (no image files), covering the page.
 *    The cabin opens the page: it never drops onto a page that is already being used, is being typed in, or has a
 *    game open over it (then it waits for the next load of the tab). While it is up it has the keyboard: Tab stays
 *    between the TV and Skip, Esc skips, and keys do not reach the page behind.
 * 2. The retro TV look ("Retro TV" switch, top right of the page, on by default; localStorage "holiday:tv" = "0"
 *    when switched off). The page looks as if it is on that old TV: pixel fonts, square corners, the game pictures
 *    in big pixels, scan lines of alternating darker and lighter bands with a slow band rolling down, and the snow and decorations behind the page
 *    drawn in big pixels too (BackRoomSeasons.pixel). Everything stays readable and works as usual.
 *    Switched off, the page is the plain winter look from seasons.js: blue, snow, the tree, the snowman, the
 *    menorah, the diya, gingerbread and lights.
 *    Next to the switch, "Cabin" shows the cabin again.
 *
 * The page's own structure isn't touched: the look is a class on <html> (tv-on) with one <style>, one fixed overlay
 * for the scan lines (it ignores the pointer) and one small bar at the top of the page for the switch. Game pictures
 * are swapped for small copies of themselves (their own addresses are kept in data-hol-src and put back when the look
 * is switched off). With prefers-reduced-motion nothing moves: no rolling band, no zoom, a still cabin.
 * 3. The winter tip. The first time someone opens one of these pages in a holiday season, a small note (top right,
 *    once per browser per season: localStorage "holiday:tip" = the season's year) says the Retro TV look can be
 *    switched at the top of the page, with a snapshot of that switch (holiday-tip.jpg, next to this file) and a working
 *    copy of it. It waits until the cabin has gone and no game is open; Got it, x or Esc closes it. ?tip=1 shows it again.
 * Testing: ?season=holiday forces the holidays (seasons.js); add &nocabin=1 to skip the cabin or &cabin=1 to show it
 * even if it was already seen. BackRoomHoliday.cabin() shows it, BackRoomHoliday.tv(true|false) sets the look.
 */
(function(){
  if(window.BackRoomHoliday)return;
  var doc=document,root=doc.documentElement;
  var still=matchMedia('(prefers-reduced-motion: reduce)');
  var touch=matchMedia('(pointer: coarse)').matches&&!matchMedia('(any-pointer: fine)').matches;
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}}
  function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v)}catch(e){return null}}
  var q={};try{new URLSearchParams(location.search).forEach(function(v,k){q[k]=v})}catch(e){}

  var on=false,styleEl=null,fontEl=null,bar=null,sw=null,crt=null,cabin=null,tipEl=null,tipSw=null,tipT=0,tipKey=null;
  // where this file lives, for the tip's snapshot picture (the phone page loads it from the same folder)
  var HERE=((doc.currentScript&&doc.currentScript.src)||'').replace(/[^\/]*$/,'')||'/e63334287a3deaa3/';

  /* ---------- the retro TV look ---------- */
  var CSS=
    // fonts: a pixel font for reading, and a chunkier one for headings
    'html.tv-on:root{--display:"Pixelify Sans","Trebuchet MS",sans-serif;--body:"Pixelify Sans","Trebuchet MS",sans-serif;--mono:"Pixelify Sans",ui-monospace,monospace;--f-d:"Pixelify Sans",sans-serif;--f-b:"Pixelify Sans",sans-serif;--f-m:"Pixelify Sans",monospace}'+
    'html.tv-on body{font-family:"Pixelify Sans","Trebuchet MS",sans-serif;-webkit-font-smoothing:none;font-smooth:never}'+
    'html.tv-on h1,html.tv-on h2,html.tv-on h3{font-family:"Press Start 2P","Pixelify Sans",monospace!important;font-weight:400!important;letter-spacing:0!important;text-transform:uppercase}'+
    'html.tv-on h1{font-size:clamp(22px,4.6vw,50px)!important;line-height:1.25!important}'+
    'html.tv-on h2{font-size:clamp(13px,1.9vw,19px)!important;line-height:1.35!important}'+
    'html.tv-on h3{font-size:12px!important;line-height:1.4!important}'+
    'html.tv-on .br-games .gc-grid:not([data-ev]) > .gc.wide h3,html.tv-on .br-games .gc[data-ev-w] h3,html.tv-on .br-games .gc-daily h3{font-size:15px!important}'+
    'html.tv-on .br-games .pz h3{font-family:"Pixelify Sans",monospace!important;font-size:11px!important;text-transform:uppercase}'+
    'html.tv-on .gs-nb b{font-family:"Press Start 2P",monospace;font-size:11px;letter-spacing:0}'+
    '@media (max-width:719px){html.tv-on .gs-nb b{font-family:"Pixelify Sans",sans-serif;font-size:12px}html.tv-on #lists .tile strong{font-size:17px}}'+
    'html.tv-on .wordmark{font-family:"Press Start 2P",monospace;font-size:13px}'+
    // square corners and hard shadows, like big pixels
    'html.tv-on .wrap *,html.tv-on #home *,html.tv-on .wrap,html.tv-on #home{border-radius:0!important}'+
    'html.tv-on .br-games .gc,html.tv-on .pty,html.tv-on .br-games .pz a,html.tv-on #lists .tile,html.tv-on .gs-nb,html.tv-on .fbk textarea{box-shadow:4px 4px 0 rgba(4,14,40,.45)!important;border-width:2px!important}'+
    'html.tv-on .br-games .gc:hover{transform:translate(-2px,-2px)!important;box-shadow:6px 6px 0 rgba(4,14,40,.5)!important}'+
    'html.tv-on .btn,html.tv-on button{font-family:"Pixelify Sans",sans-serif}'+
    'html.tv-on img[data-hol-src]{image-rendering:pixelated;image-rendering:crisp-edges}'+
    // the glass: scan lines (alternating darker and lighter bands, like an old TV, never pure black or white), a slow rolling band and darker corners; it never takes a click
    '#hol-crt{position:fixed;inset:0;z-index:900;pointer-events:none;overflow:hidden;background:repeating-linear-gradient(to bottom,rgba(0,8,30,.24) 0,rgba(0,8,30,.24) 2px,rgba(190,215,255,.06) 2px,rgba(190,215,255,.06) 4px)}'+
    '#hol-crt::before{content:"";position:absolute;left:0;right:0;top:0;height:120px;background:linear-gradient(to bottom,transparent,rgba(255,255,255,.07) 45%,rgba(255,255,255,.11) 50%,rgba(255,255,255,.07) 55%,transparent);animation:hol-roll 7s linear infinite}'+
    '#hol-crt::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 58%,rgba(0,6,24,.34) 100%);box-shadow:inset 0 0 0 3px rgba(0,6,24,.5)}'+
    '@keyframes hol-roll{from{transform:translateY(-130px)}to{transform:translateY(105vh)}}'+
    '@media (prefers-reduced-motion: reduce){#hol-crt::before{animation:none;display:none}}'+
    // the bar with the switch, top right of the page
    '#hol-bar{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin:10px 0 -4px;font-family:var(--mono,ui-monospace,monospace);font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}'+
    '#home > #hol-bar{margin:0 0 10px}'+
    '#hol-bar button{font:inherit;letter-spacing:inherit;text-transform:inherit;color:var(--ink,#16201b);background:var(--panel,#fff);border:1px solid var(--line,#d3dad2);border-radius:999px;min-height:34px;padding:5px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}'+
    '#hol-bar button:focus-visible{outline:2px solid var(--accent,#2459c8);outline-offset:2px}'+
    '#hol-bar .hol-knob{position:relative;flex:none;width:34px;height:18px;border-radius:999px;background:var(--line,#b9c6d8);transition:background .15s}'+
    '#hol-bar .hol-knob::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.35);transition:transform .15s}'+
    '#hol-bar [aria-checked="true"] .hol-knob{background:var(--accent,#2459c8)}'+
    '#hol-bar [aria-checked="true"] .hol-knob::after{transform:translateX(16px)}'+
    // the winter tip (shown once a season)
    '#hol-tip{position:fixed;z-index:2500;top:calc(12px + env(safe-area-inset-top,0px));right:calc(12px + env(safe-area-inset-right,0px));width:min(340px,calc(100vw - 24px));box-sizing:border-box;background:var(--panel,#fff);color:var(--ink,#16201b);border:2px solid var(--accent,#2459c8);border-radius:14px;box-shadow:0 18px 40px -12px rgba(4,14,40,.55);padding:14px 16px;font-family:var(--body,system-ui,sans-serif);font-size:14px;line-height:1.45;animation:hol-in .25s ease-out}'+
    '#hol-tip b{display:block;font-size:16px;margin:0 28px 4px 0}'+
    '#hol-tip p{margin:0;color:var(--ink-2,#4a5751)}'+
    '#hol-tip img{display:block;width:100%;height:auto;margin:10px 0;border-radius:8px;border:1px solid var(--line,#d3dad2)}'+
    '#hol-tip .hol-row{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap}'+
    '#hol-tip button{font:600 13px var(--body,system-ui,sans-serif);color:var(--ink,#16201b);background:var(--panel-2,#f6f8f4);border:1px solid var(--line,#d3dad2);border-radius:999px;min-height:38px;padding:6px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}'+
    '#hol-tip button.hol-ok{background:var(--accent,#2459c8);border-color:var(--accent,#2459c8);color:var(--accent-ink,#fff)}'+
    '#hol-tip .hol-x{position:absolute;top:8px;right:8px;min-height:32px;width:32px;padding:0;justify-content:center;font-size:18px;line-height:1}'+
    '#hol-tip button:focus-visible{outline:2px solid var(--accent,#2459c8);outline-offset:2px}'+
    '#hol-tip .hol-knob{position:relative;flex:none;width:34px;height:18px;border-radius:999px;background:var(--line,#b9c6d8);transition:background .15s}'+
    '#hol-tip .hol-knob::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.35);transition:transform .15s}'+
    '#hol-tip [aria-checked="true"] .hol-knob{background:var(--accent,#2459c8)}'+
    '#hol-tip [aria-checked="true"] .hol-knob::after{transform:translateX(16px)}'+
    '@media (prefers-reduced-motion: reduce){#hol-tip{animation:none}}'+
    // the cabin
    '#hol-cabin{position:fixed;inset:0;z-index:3000;background:#160c07;overflow:hidden;touch-action:manipulation;outline:0;animation:hol-in .22s ease-out}'+
    '@keyframes hol-in{from{opacity:0}}'+
    '#hol-cabin canvas{position:absolute;left:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges;transition:transform .85s cubic-bezier(.6,0,.9,.4),filter .85s ease-in}'+
    '#hol-cabin .hol-tv{position:absolute;background:none;border:0;padding:0;cursor:pointer;border-radius:8px}'+
    '#hol-cabin .hol-tv:focus-visible{outline:3px solid #fff;outline-offset:4px}'+
    '#hol-cabin .hol-skip{position:absolute;right:calc(14px + env(safe-area-inset-right,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));font:600 13px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:#f6e7cf;background:rgba(20,10,4,.7);border:1px solid rgba(246,231,207,.45);border-radius:999px;padding:9px 14px;cursor:pointer}'+
    '#hol-cabin .hol-skip:focus-visible{outline:3px solid #fff;outline-offset:3px}'+
    '@media (pointer: coarse){#hol-cabin .hol-skip{min-height:44px;padding:9px 18px}}'+
    '#hol-cabin .hol-flash{position:absolute;inset:0;background:#dff1ff;opacity:0;pointer-events:none;transition:opacity .5s ease-in .4s}'+
    '#hol-cabin.go .hol-flash{opacity:1}'+
    // leaving: the page is already usable underneath while the white (through the TV) or the room (Skip) fades away
    '#hol-cabin.out{pointer-events:none;animation:none;transition:opacity .16s ease-out;opacity:0}'+
    '#hol-cabin.out.go{background:none;opacity:1;transition:none}'+
    '#hol-cabin.out.go > :not(.hol-flash){display:none}'+
    '#hol-cabin.out.go .hol-flash{opacity:0;transition:opacity .3s ease-out}'+
    '@media (prefers-reduced-motion: reduce){#hol-cabin{animation:none}}'+
    // nothing needs to move behind the cabin
    'html.hol-lock #hol-crt{display:none}'+
    'html.hol-lock,html.hol-lock body{overflow:hidden!important}';

  // the pixel fonts are only fetched once the TV look is on (the cabin and the plain winter page do not use them)
  function addFonts(){
    if(!fontEl){fontEl=doc.createElement('link');fontEl.rel='stylesheet';fontEl.href='https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Pixelify+Sans:wght@400;500;600;700&display=swap';doc.head.appendChild(fontEl)}
  }
  function addStyle(){
    if(!styleEl){styleEl=doc.createElement('style');styleEl.id='hol-style';styleEl.textContent=CSS;doc.head.appendChild(styleEl)}
  }

  // Game pictures in big pixels: each is redrawn about a third of the size it is shown at and stretched back up.
  var PICS='.br-games .shot img,.br-games .pz img,#lists .tile img,#cont img';
  // Shrinking a picture means the browser has to unpack the whole of it, which takes a slow laptop a moment; thirty at
  // once froze the page (and the cabin in front of it) for a second or two. So they queue up and are done one at a
  // time, each in its own turn with a pause before the next, and the page stays live in between.
  var picQ=[],picT=0,picC=null;
  function pixelate(img){
    if(!on||img.hasAttribute('data-hol-src')||!img.naturalWidth||picQ.indexOf(img)>=0)return;
    picQ.push(img);if(!picT)picT=setTimeout(picNext,0);
  }
  function picNext(){
    picT=0;var img=picQ.shift();if(!img)return;
    if(root.classList.contains('tv-on')&&img.isConnected&&!img.hasAttribute('data-hol-src')&&img.naturalWidth){
      var shown=img.getBoundingClientRect().width||img.width||160,w=Math.max(40,Math.min(160,Math.round(shown/3.2))),h=Math.max(1,Math.round(w*img.naturalHeight/img.naturalWidth));
      try{
        var c=picC||(picC=doc.createElement('canvas'));c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
        var u=c.toDataURL('image/png');img.setAttribute('data-hol-src',img.getAttribute('src'));img.src=u;
      }catch(e){}
    }
    if(picQ.length)picT=setTimeout(picNext,cabin?90:30);   // slower while the cabin is in front, so its fire and snow keep moving
  }
  function pixelateAll(){
    Array.prototype.forEach.call(doc.querySelectorAll(PICS),function(img){
      if(img.hasAttribute('data-hol-src'))return;
      if(img.complete&&img.naturalWidth)pixelate(img);
      else if(!img.hasAttribute('data-hol-wait')){img.setAttribute('data-hol-wait','');img.addEventListener('load',function(){img.removeAttribute('data-hol-wait');pixelate(img)},{once:true})}
    });
  }
  function unpixelate(){
    picQ.length=0;clearTimeout(picT);picT=0;picC=null;
    Array.prototype.forEach.call(doc.querySelectorAll('img[data-hol-src]'),function(img){img.src=img.getAttribute('data-hol-src');img.removeAttribute('data-hol-src')});
  }
  var picTimer=0;
  function tvWanted(){return ls('holiday:tv')!=='0'}
  function applyTv(){
    var tv=on&&tvWanted();
    root.classList.toggle('tv-on',tv);if(tv)addFonts();
    if(sw){sw.setAttribute('aria-checked',tv?'true':'false')}
    if(tipSw){tipSw.setAttribute('aria-checked',tv?'true':'false')}
    if(tv&&!crt){crt=doc.createElement('div');crt.id='hol-crt';crt.setAttribute('aria-hidden','true');doc.body.appendChild(crt)}
    if(!tv&&crt){crt.remove();crt=null}
    if(window.BackRoomSeasons&&BackRoomSeasons.pixel)BackRoomSeasons.pixel(tv);
    clearInterval(picTimer);picTimer=0;
    // cards arrive late on some pages (the phone page builds its tiles, panels load after sign-in): keep looking for a while
    if(tv){pixelateAll();var n=0;picTimer=setInterval(function(){pixelateAll();if(++n>20){clearInterval(picTimer);picTimer=0}},1500)}
    else unpixelate();
  }
  function setTv(v){ls('holiday:tv',v?null:'0');applyTv()}

  function addBar(){
    if(bar)return;
    var host=doc.getElementById('home')||doc.querySelector('.wrap');if(!host)return;
    bar=doc.createElement('div');bar.id='hol-bar';
    var cb=doc.createElement('button');cb.type='button';cb.className='hol-cab';cb.textContent='Cabin';cb.setAttribute('aria-label','Show the cabin again');
    cb.addEventListener('click',function(){showCabin()});
    sw=doc.createElement('button');sw.type='button';sw.className='hol-sw';sw.setAttribute('role','switch');sw.setAttribute('aria-checked','false');
    sw.title='Retro TV look on or off. Off: the plain winter page.';
    var t=doc.createElement('span');t.textContent='Retro TV';var k=doc.createElement('span');k.className='hol-knob';k.setAttribute('aria-hidden','true');
    sw.append(t,k);
    sw.addEventListener('click',function(){setTv(sw.getAttribute('aria-checked')!=='true')});
    bar.append(cb,sw);
    host.insertBefore(bar,host.firstChild);
  }

  /* ---------- the cabin: pixel art on one canvas ---------- */
  // a 5 x 5 pixel alphabet for the words on the TV
  var FONT={A:'0111010001111111000110001',B:'1111010001111101000111110',C:'0111110000100001000001111',D:'1111010001100011000111110',E:'1111110000111101000011111',
    F:'1111110000111101000010000',G:'0111110000100111000101111',H:'1000110001111111000110001',I:'0111000100001000010001110',K:'1000110010111001001010001',
    L:'1000010000100001000011111',M:'1000111011101011000110001',N:'1000111001101011001110001',O:'0111010001100011000101110',P:'1111010001111101000010000',
    R:'1111010001111101001010001',S:'0111110000011100000111110',T:'1111100100001000010000100',U:'1000110001100011000101110',V:'1000110001100010101000100',
    W:'1000110001101011101110001',Y:'1000101010001000010000100'};
  var cg=null,CW=0,CH=0,cs=1,ctime=0,craf=0,clast=0,ckey=null,cres=null,goT=0,cback=null;
  function R(x,y,w,h,c){cg.fillStyle=c;cg.fillRect(Math.round(x),Math.round(y),w,h)}
  function txt(s,x,y,sc,col,center){
    var w=s.length*6*sc-sc;if(center)x-=w/2;x=Math.round(x);y=Math.round(y);cg.fillStyle=col;
    for(var i=0;i<s.length;i++){var m=FONT[s[i]];if(!m)continue;for(var r=0;r<5;r++)for(var c=0;c<5;c++)if(m[r*5+c]==='1')cg.fillRect(x+(i*6+c)*sc,y+r*sc,sc,sc)}
  }
  // a cheap repeatable "random" for things that must not jump about between frames
  function hash(n){n=Math.sin(n*127.1)*43758.5453;return n-Math.floor(n)}
  var TV={x:0,y:0,w:148,h:106};
  function layoutCabin(){
    var vw=innerWidth,vh=innerHeight,dp=window.devicePixelRatio||1;
    // One art pixel is a whole number of the screen's own pixels (not of CSS pixels), as many as fit: every art pixel is
    // then the same size on any display, and on a phone held sideways or a laptop set to 125% the room is drawn up to
    // half as big again as whole CSS pixels would allow. Never under one CSS pixel.
    cs=Math.max(1,Math.floor(Math.min(vh/236,vw/170)*dp)/dp);
    CW=Math.ceil(vw/cs);CH=Math.ceil(vh/cs);
    var cv=cabin.querySelector('canvas');cv.width=CW;cv.height=CH;cv.style.width=CW*cs+'px';cv.style.height=CH*cs+'px';
    cg=cv.getContext('2d');cg.imageSmoothingEnabled=false;
    var cx=Math.floor(CW/2),fl=Math.round(CH*.66);
    TV.x=cx-74;TV.y=fl-30-TV.h;
    // the button over the TV, and where the zoom heads for (the middle of its screen)
    var ox=Math.round((vw-CW*cs)/2*dp)/dp,oy=Math.round((vh-CH*cs)/2*dp)/dp,b=cabin.querySelector('.hol-tv');
    cv.style.left=ox+'px';cv.style.top=oy+'px';
    b.style.left=ox+TV.x*cs+'px';b.style.top=oy+TV.y*cs+'px';b.style.width=TV.w*cs+'px';b.style.height=(TV.h+30)*cs+'px';
    cv.style.transformOrigin=((TV.x+12+52)/CW*100)+'% '+((TV.y+10+39)/CH*100)+'%';
  }
  function drawCabin(t){
    var W=CW,H=CH,cx=Math.floor(W/2),fl=Math.round(H*.66),i,j,x,y;
    // log wall
    for(y=fl-18,i=0;y>-18;y-=18,i++){
      R(0,y,W,18,i%2?'#6a4227':'#5f3a22');R(0,y,W,2,'#7c5030');R(0,y+16,W,2,'#43281a');
      for(x=(i*53)%90-20;x<W;x+=90+((i*17)%30)){R(x,y+6,7,1,'#4f301c');R(x+30,y+11,10,1,'#75492c')}
    }
    R(0,0,W,9,'#35200f');R(0,9,W,2,'#241408');
    // floor boards
    R(0,fl,W,H-fl,'#7a4c2a');R(0,fl,W,2,'#3a2212');
    for(y=fl+12,i=0;y<H;y+=12+i,i++){R(0,y,W,1,'#5b3720');for(x=(i*71)%120;x<W;x+=120)R(x,y-11-i+1,1,11+i,'#5b3720')}
    // the window (left), with snow falling outside
    var wx=cx-206,wy=fl-126;
    if(wx>-70){
      R(wx-5,wy-5,74,66,'#3d2413');R(wx,wy,64,56,'#0b1838');
      R(wx+44,wy+6,9,9,'#f4f1d8');R(wx+47,wy+6,6,3,'#0b1838');
      for(i=0;i<5;i++){var tx=wx+4+i*13,th=16+((i*7)%9);for(j=0;j<th;j+=3)R(tx+6-Math.floor(j/3)*1-1,wy+56-th+j,2+Math.floor(j/3)*2,3,'#0f2a2a')}
      R(wx,wy+48,64,8,'#dfeaf7');for(i=0;i<8;i++)R(wx+i*8+((i*5)%3),wy+46,5,2,'#dfeaf7');
      for(i=0;i<16;i++){var sx=wx+((hash(i)*64+Math.sin(t*.7+i)*3)%64+64)%64,sy=wy+((hash(i+40)*56+t*(8+hash(i+9)*10))%50);R(sx,sy,1,1,'#ffffff')}
      R(wx+31,wy,2,56,'#7a4b28');R(wx,wy+27,64,2,'#7a4b28');
      R(wx-7,wy+56,78,4,'#8a5a33');R(wx-7,wy+60,78,1,'#3d2413');
    }
    // the fireplace (right): stone, fire, stockings, and a menorah and a diya on the mantel
    var fx=cx+118,fw=92,fh=98,fy=fl-fh;
    if(fx<W+20){
      R(fx,fy,fw,fh,'#6f6a66');
      for(j=0;j<fh;j+=12)for(i=0;i<fw;i+=20){var o=(j/12%2)*10;R(fx+((i+o)%fw),fy+j,1,12,'#55504c');R(fx,fy+j,fw,1,'#55504c');if(hash(i+j)>.6)R(fx+((i+o+4)%(fw-10)),fy+j+3,9,5,'#7d7873')}
      R(fx+20,fl-52,52,52,'#1a100b');R(fx+20,fl-52,52,2,'#0d0705');
      R(fx+26,fl-9,40,5,'#4a2a16');R(fx+30,fl-13,30,5,'#5b3620');
      for(i=0;i<13;i++){var fh2=8+Math.floor((Math.sin(t*9+i*1.9)+Math.sin(t*5.3+i*.7))*5+12*hash(i+3));var bx=fx+27+i*3;
        R(bx,fl-12-fh2,3,fh2,'#e2531e');R(bx,fl-12-Math.floor(fh2*.68),3,Math.floor(fh2*.68),'#f6952a');if(i%2)R(bx,fl-12-Math.floor(fh2*.36),3,Math.floor(fh2*.36),'#ffe07a')}
      R(fx-6,fy-7,fw+12,7,'#8a5a33');R(fx-6,fy,fw+12,2,'#4a2c18');
      for(i=0;i<3;i++){var sx2=fx+10+i*30;R(sx2,fy+2,9,5,'#f4efe6');R(sx2+1,fy+7,7,11,i===1?'#2f8f4e':'#c8372f');R(sx2+1,fy+15,11,5,i===1?'#2f8f4e':'#c8372f')}
      // menorah
      var mx=fx+24,my=fy-7;R(mx-2,my-2,5,2,'#d9a936');R(mx,my-14,1,12,'#d9a936');
      for(i=-4;i<=4;i++){if(i){R(mx+i*3,my-11,1,2+Math.abs(i),'#d9a936')}R(mx+i*3,my-(i?14:17),1,3,i%2?'#ffffff':'#5a92ea');if(Math.sin(t*6+i)>-.6)R(mx+i*3,my-(i?16:19),1,2,'#ffd45c')}
      R(mx-12,my-8,25,1,'#d9a936');
      // diya
      var dx=fx+66,dy=fy-7;R(dx-5,dy-3,10,3,'#b85f33');R(dx-4,dy-4,8,1,'#d98a55');R(dx+4,dy-5,2,2,'#b85f33');R(dx+5,dy-8+(Math.sin(t*7)>0?0:1),1,3,'#ffd45c');R(dx+5,dy-6,1,1,'#f6952a');
    }
    // the tree (left of the TV) and its presents
    var tx2=cx-128,ty=fl+2;
    if(tx2>-40){
      R(tx2-3,ty-12,6,12,'#5b3620');
      var tiers=[[40,-10,-52],[32,-40,-80],[23,-68,-104],[14,-94,-122]];
      for(i=0;i<4;i++){var hw=tiers[i][0],y0=ty+tiers[i][1],y1=ty+tiers[i][2];
        for(y=y0;y>y1;y-=2){var w2=Math.round(hw*(y-y1)/(y0-y1));R(tx2-w2,y-2,w2*2,2,(y/2|0)%2?'#1f6e3e':'#237a45')}
        R(tx2-hw,y0-2,5,2,'#f2f7ff');R(tx2+hw-5,y0-2,5,2,'#f2f7ff')}
      var oc=['#e5483f','#ffd34d','#4fa3f7','#f37fb7'];
      for(i=0;i<14;i++){var oy=ty-16-i*7,ow=Math.max(3,36-i*2.4),ox2=tx2+Math.round((hash(i+70)*2-1)*ow*.7);
        var lit=Math.sin(t*3+i*2.1)>-.2;R(ox2,oy,2,2,lit?oc[i%4]:'#134a2a');if(lit&&i%3===0)R(ox2-1,oy-1,4,4,'rgba(255,240,180,.25)')}
      R(tx2-1,ty-128,3,3,'#ffd34d');R(tx2-3,ty-126,7,1,'#ffd34d');R(tx2,ty-130,1,7,'#ffd34d');
      [[-44,16,14,'#c8372f','#ffe08a'],[-25,11,10,'#2f7fd6','#ffffff'],[26,15,12,'#2f8f4e','#e5483f'],[42,10,9,'#8e5bd6','#ffd34d']].forEach(function(b){
        R(tx2+b[0],ty-b[2],b[1],b[2],b[3]);R(tx2+b[0]+Math.floor(b[1]/2)-1,ty-b[2],2,b[2],b[4]);R(tx2+b[0],ty-Math.floor(b[2]/2)-1,b[1],2,b[4])});
    }
    // lights strung under the beam; each bulb takes its turn to glow
    for(x=6,i=0;x<W;x+=14,i++){var ly=12+Math.round(Math.sin((x%84)/84*Math.PI)*5),c2=['#e5483f','#ffd34d','#3ba55d','#4fa3f7'][i%4],lit2=Math.sin(t*2.4+i*1.7)>-.35;
      R(x-7,ly-1,14,1,'#1d120a');R(x,ly,2,2,'#1d120a');R(x-1,ly+2,4,4,lit2?c2:'#3b2a20');if(lit2)R(x-2,ly+1,6,6,'rgba(255,236,170,.16)')}
    // a wreath on the wall above the TV when there is room for one
    if(TV.y>58){var wy2=Math.round((TV.y+16)/2)+4;for(i=0;i<16;i++){var a=i/16*6.2832;R(cx-2+Math.round(Math.cos(a)*11),wy2+Math.round(Math.sin(a)*11),5,5,i%2?'#1f6e3e':'#2a8a50')}
      R(cx-3,wy2+9,7,4,'#c8372f');R(cx-1,wy2+12,3,5,'#c8372f');for(i=0;i<5;i++){var a2=i/5*6.2832+.4;R(cx+Math.round(Math.cos(a2)*11),wy2+2+Math.round(Math.sin(a2)*11),2,2,'#ffd34d')}}
    // the rug
    R(cx-104,fl+22,208,30,'#8d2f2a');R(cx-100,fl+25,200,24,'#b0403a');for(x=cx-96;x<cx+96;x+=12)R(x,fl+28,6,2,'#f1d9a8');for(x=cx-90;x<cx+96;x+=12)R(x,fl+44,6,2,'#f1d9a8');
    R(cx-104,fl+22,2,30,'#f1d9a8');R(cx+102,fl+22,2,30,'#f1d9a8');
    // the TV's light on the wall and the floor
    var pulse=.5+.5*Math.sin(t*1.7);
    cg.fillStyle='rgba(120,180,255,'+(.035+.02*pulse)+')';cg.fillRect(TV.x-22,TV.y-12,TV.w+44,TV.h+30);
    cg.fillStyle='rgba(120,180,255,'+(.05+.03*pulse)+')';cg.fillRect(TV.x-9,TV.y-6,TV.w+18,TV.h+12);
    cg.fillStyle='rgba(120,180,255,'+(.08+.04*pulse)+')';cg.fillRect(TV.x+6,fl+4,TV.w-12,16);
    // the stand, with a plate of gingerbread and a mug of cocoa
    var sy2=fl-30;R(TV.x-8,sy2,TV.w+16,30,'#5a3620');R(TV.x-8,sy2,TV.w+16,3,'#7c5030');R(TV.x-8,sy2+27,TV.w+16,3,'#3a2212');
    R(TV.x-2,sy2+7,70,17,'#4a2c18');R(TV.x+80,sy2+7,70,17,'#4a2c18');R(TV.x+31,sy2+14,6,2,'#d9a936');R(TV.x+113,sy2+14,6,2,'#d9a936');
    R(TV.x-4,fl,5,5,'#3a2212');R(TV.x+TV.w-1,fl,5,5,'#3a2212');
    // the TV: wooden case, glass, a panel with dials, antennas
    R(TV.x+50,TV.y-22,1,22,'#9aa3ad');R(TV.x+44,TV.y-22,7,1,'#9aa3ad');R(TV.x+88,TV.y-26,1,26,'#9aa3ad');R(TV.x+88,TV.y-26,7,1,'#9aa3ad');
    R(TV.x,TV.y,TV.w,TV.h,'#3b2a20');R(TV.x,TV.y,TV.w,3,'#5c4130');R(TV.x,TV.y+TV.h-3,TV.w,3,'#241710');R(TV.x,TV.y,3,TV.h,'#4c3628');R(TV.x+TV.w-3,TV.y,3,TV.h,'#2c1e16');
    var sx3=TV.x+12,sy3=TV.y+10,sw2=104,sh2=78;
    R(sx3-3,sy3-3,sw2+6,sh2+6,'#15100d');
    // what is on: night sky, snow, hills, the title, and a blinking invitation
    R(sx3,sy3,sw2,sh2,'#0f1c52');R(sx3,sy3+sh2-30,sw2,30,'#152a6e');
    for(i=0;i<22;i++){var px=sx3+((hash(i+11)*sw2+Math.sin(t+i)*2)%sw2+sw2)%sw2,py=sy3+((hash(i+31)*sh2+t*(6+hash(i+5)*9))%sh2);R(px,py,i%5?1:2,i%5?1:2,'#e9f2ff')}
    for(x=0;x<sw2;x+=2){var hy=Math.round(6+4*Math.sin(x*.09)+3*Math.sin(x*.23+1));R(sx3+x,sy3+sh2-hy,2,hy,'#eaf3ff')}
    [[10,16],[22,12],[84,15],[95,11]].forEach(function(p){for(j=0;j<p[1];j+=3){var w3=1+Math.floor(j/3);R(sx3+p[0]-w3,sy3+sh2-8-p[1]+j,w3*2+1,3,'#1e7a48')}R(sx3+p[0],sy3+sh2-8,1,3,'#5b3620')});
    txt('THE BACK',sx3+sw2/2+1,sy3+13,2,'#3fd6ff',true);txt('THE BACK',sx3+sw2/2,sy3+12,2,'#ffffff',true);
    txt('ROOM',sx3+sw2/2+1,sy3+28,2,'#3fd6ff',true);txt('ROOM',sx3+sw2/2,sy3+27,2,'#ffffff',true);
    if(Math.floor(t*1.6)%2===0||still.matches)txt('PRESS START',sx3+sw2/2,sy3+45,1,'#ffe07a',true);
    for(y=sy3;y<sy3+sh2;y+=2)R(sx3,y,sw2,1,'rgba(0,0,20,.22)');
    var roll=(t*14)%(sh2+30)-15;cg.fillStyle='rgba(255,255,255,.07)';cg.fillRect(sx3,Math.max(sy3,sy3+roll),sw2,Math.max(0,Math.min(8,sy3+sh2-(sy3+roll))));
    R(sx3,sy3,sw2,1,'rgba(255,255,255,.18)');R(sx3,sy3,1,sh2,'rgba(255,255,255,.1)');
    // dials and speaker
    var kx=TV.x+124;R(kx,TV.y+12,14,14,'#241710');R(kx+3,TV.y+15,8,8,'#b9b2a7');R(kx+6,TV.y+15,2,4,'#3b2a20');
    R(kx,TV.y+32,14,14,'#241710');R(kx+3,TV.y+35,8,8,'#b9b2a7');R(kx+3,TV.y+38,4,2,'#3b2a20');
    for(j=0;j<9;j++)R(kx,TV.y+54+j*4,14,2,'#241710');
    R(kx+5,TV.y+94,4,4,Math.sin(t*3)>0?'#ff5a4a':'#a82d22');
    // on the stand
    R(TV.x-4,sy2-3,22,3,'#e9e2d6');for(i=0;i<3;i++){R(TV.x-1+i*6,sy2-8,4,5,'#b5733a');R(TV.x+i*6,sy2-10,2,2,'#b5733a')}
    R(TV.x+TV.w-12,sy2-10,10,10,'#d8433b');R(TV.x+TV.w-2,sy2-8,3,5,'#d8433b');R(TV.x+TV.w-11,sy2-10,8,2,'#5b3620');
    if(!still.matches){var st2=Math.floor(t*2)%2;R(TV.x+TV.w-9+st2,sy2-15,1,3,'rgba(255,255,255,.5)');R(TV.x+TV.w-6-st2,sy2-17,1,3,'rgba(255,255,255,.5)')}
    // the corners of the room are darker; the fire warms its side
    cg.fillStyle='rgba(10,4,0,.28)';cg.fillRect(0,0,W,11);
    for(i=0;i<5;i++){cg.fillStyle='rgba(10,4,0,'+(.07)+')';cg.fillRect(0,0,Math.round(W*.05*(5-i)),H);cg.fillRect(W-Math.round(W*.05*(5-i)),0,Math.round(W*.05*(5-i)),H)}
    // (its glow falls off in two steps, like the TV's light, and flickers on the flames' own two beats, not one even pulse)
    if(fx<W+20){var fk=.011*(Math.sin(t*9)+Math.sin(t*5.3));
      cg.fillStyle='rgba(255,150,60,'+(.032+fk)+')';cg.fillRect(fx-44,fl-84,fw+88,112);
      cg.fillStyle='rgba(255,150,60,'+(.042+fk)+')';cg.fillRect(fx-24,fl-62,fw+48,80)}
    // the words under the TV
    var say=touch?'TAP THE TV':'CLICK THE TV';
    if(Math.floor(t*1.6)%2===0||still.matches){txt(say,cx+1,fl+33,1,'#3a140f',true);txt(say,cx,fl+32,1,'#ffe9bf',true)}
  }
  function cabinFrame(now){
    craf=requestAnimationFrame(cabinFrame);
    if(now-clast<70)return;   // about 14 pictures a second is plenty for pixel art
    ctime+=Math.min(.2,(now-clast)/1000);clast=now;drawCabin(ctime);
  }
  function holdSnow(v){if(window.BackRoomSeasons&&BackRoomSeasons.hold)BackRoomSeasons.hold(v)}
  function showCabin(){
    if(cabin||!on)return;
    addStyle();
    cback=doc.activeElement;
    cabin=doc.createElement('div');cabin.id='hol-cabin';cabin.setAttribute('role','dialog');cabin.setAttribute('aria-modal','true');cabin.setAttribute('aria-label','A cabin at Christmas, with a TV showing the Back Room');
    cabin.tabIndex=-1;
    var cv=doc.createElement('canvas');cv.setAttribute('aria-hidden','true');
    var b=doc.createElement('button');b.type='button';b.className='hol-tv';b.setAttribute('aria-label','Turn to the TV and go to the games');
    var sk=doc.createElement('button');sk.type='button';sk.className='hol-skip';sk.textContent='Skip';sk.setAttribute('aria-label','Skip the cabin and go to the games');
    var fl=doc.createElement('div');fl.className='hol-flash';
    cabin.append(cv,b,sk,fl);doc.body.appendChild(cabin);root.classList.add('hol-lock');
    holdSnow(true);   // the room covers the page: the snow behind it waits
    layoutCabin();ctime=0;clast=performance.now();drawCabin(0);
    if(!still.matches)craf=requestAnimationFrame(cabinFrame);
    b.addEventListener('click',function(){leaveCabin(true)});
    sk.addEventListener('click',function(){leaveCabin(false)});
    // The keyboard belongs to the cabin while it is up: Esc skips, Enter or Space goes through the TV, Tab moves between
    // the TV and Skip and never to the page hidden behind. Keys stop here, so Esc does not also close a pop-up the page
    // opened underneath, and the page's own shortcuts stay quiet.
    ckey=function(e){
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      var a=doc.activeElement;
      if(e.key==='Escape'){e.preventDefault();leaveCabin(false)}
      else if(e.key==='Tab'){e.preventDefault();try{(e.shiftKey?(a===sk?b:sk):(a===b?sk:b)).focus()}catch(x){}}
      else if((e.key==='Enter'||e.key===' ')&&a!==sk){e.preventDefault();if(!e.repeat)leaveCabin(true)}
      e.stopImmediatePropagation();
    };
    doc.addEventListener('keydown',ckey,true);
    cres=function(){if(cabin&&!goT){layoutCabin();drawCabin(ctime)}};
    addEventListener('resize',cres);
    // focus goes to the room itself, so a screen reader says what this is and Tab starts at the TV
    try{cabin.focus({preventScroll:true})}catch(x){}
  }
  // fade: 0 goes at once; otherwise the layer stays that many milliseconds to fade away, already out of the page's way
  function closeCabin(fade){
    if(!cabin)return;
    cancelAnimationFrame(craf);craf=0;clearTimeout(goT);goT=0;
    doc.removeEventListener('keydown',ckey,true);removeEventListener('resize',cres);
    var el=cabin,back=cback,had=el.contains(doc.activeElement);
    cabin=null;cg=null;cback=null;ckey=cres=null;
    root.classList.remove('hol-lock');holdSnow(false);
    // focus goes back to where it was (the Cabin button, when that opened it), or off the room
    if(had){try{if(back&&back!==doc.body&&back.isConnected)back.focus({preventScroll:true});else doc.activeElement.blur()}catch(x){}}
    if(fade&&!still.matches){
      el.classList.add('out');el.setAttribute('aria-hidden','true');el.setAttribute('inert','');
      setTimeout(function(){el.remove()},fade);
    }else el.remove();
  }
  // through the TV: the picture zooms into the screen, whites out, and the page comes up out of the white
  function leaveCabin(zoom){
    if(!cabin||goT)return;
    ss('holiday:seen','1');
    if(still.matches){closeCabin(0);return}
    if(!zoom){closeCabin(180);return}
    var cv=cabin.querySelector('canvas');
    cabin.classList.add('go');
    cv.style.transform='scale('+Math.max(4,Math.ceil(CW/104*1.15))+')';cv.style.filter='brightness(1.6)';
    goT=setTimeout(function(){goT=0;closeCabin(320)},950);
  }

  /* ---------- the winter tip ---------- */
  // The season is named by the year it starts in (late November), so a January visit counts as last year's season.
  function season(){var d=new Date();return String(d.getMonth()>=9?d.getFullYear():d.getFullYear()-1)}
  // Wait for the cabin to go and for no game to be open over the page, then show it once.
  function maybeTip(){
    clearTimeout(tipT);tipT=0;
    if(!on||tipEl||(q.tip!=='1'&&ls('holiday:tip')===season()))return;
    tipT=setTimeout(function(){tipT=0;if(!on||tipEl)return;if(cabin||inUse()){maybeTip();return}showTip()},cabin?1500:900);
  }
  function showTip(){
    ls('holiday:tip',season());
    var es=!!(window.BackRoomLang&&BackRoomLang.get&&BackRoomLang.get()==='es');
    var T=es?{h:'Novedad de invierno: TV retro',p:'Durante las fiestas, la página parece una tele antigua. Actívalo o desactívalo cuando quieras con el interruptor «Retro TV» de arriba a la derecha:',alt:'El interruptor Retro TV arriba a la derecha de la página, junto a Cabin',ok:'Entendido',x:'Cerrar'}
                :{h:'New for winter: Retro TV',p:'For the holidays the page looks like an old TV. Turn it on or off any time with the Retro TV switch at the top right of the page:',alt:'The Retro TV switch at the top right of the page, next to Cabin',ok:'Got it',x:'Close'};
    tipEl=doc.createElement('div');tipEl.id='hol-tip';tipEl.setAttribute('role','dialog');tipEl.setAttribute('aria-label',T.h);
    var h=doc.createElement('b');h.textContent=T.h;
    var p=doc.createElement('p');p.textContent=T.p;
    var im=doc.createElement('img');im.src=HERE+'holiday-tip.jpg';im.alt=T.alt;im.width=300;im.height=60;
    tipSw=doc.createElement('button');tipSw.type='button';tipSw.setAttribute('role','switch');
    var t=doc.createElement('span');t.textContent='Retro TV';var k=doc.createElement('span');k.className='hol-knob';k.setAttribute('aria-hidden','true');
    tipSw.append(t,k);tipSw.setAttribute('aria-checked',root.classList.contains('tv-on')?'true':'false');
    tipSw.addEventListener('click',function(){setTv(tipSw.getAttribute('aria-checked')!=='true')});
    var ok=doc.createElement('button');ok.type='button';ok.className='hol-ok';ok.textContent=T.ok;ok.addEventListener('click',closeTip);
    var x=doc.createElement('button');x.type='button';x.className='hol-x';x.textContent='\u00d7';x.setAttribute('aria-label',T.x);x.addEventListener('click',closeTip);
    var row=doc.createElement('div');row.className='hol-row';row.append(tipSw,ok);
    tipEl.append(x,h,p,im,row);doc.body.appendChild(tipEl);
    doc.addEventListener('keydown',tipKey=function(e){if(e.key==='Escape'&&tipEl&&!cabin)closeTip()});
  }
  function closeTip(){
    clearTimeout(tipT);tipT=0;
    if(tipKey){doc.removeEventListener('keydown',tipKey);tipKey=null}
    if(tipEl){tipEl.remove();tipEl=null;tipSw=null}
  }

  // A game open over the page, or the visitor in the middle of typing: no time for the cabin to arrive.
  function inUse(){
    try{
      var a=doc.activeElement,e=doc.elementFromPoint(innerWidth/2,innerHeight/2);
      return !!(e&&e.tagName==='IFRAME')||!!(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable));
    }catch(x){return false}
  }
  // busy (from seasons.js): the visitor has already clicked, typed or scrolled on this page. The cabin opens the page;
  // it never drops onto one that is being used or has a game open over it (it is kept for the next time the page loads).
  function start(busy){
    if(on)return;on=true;
    addStyle();addBar();applyTv();
    if(q.nocabin!=='1'&&(q.cabin==='1'||(ss('holiday:seen')!=='1'&&!busy&&!inUse())))showCabin();
    maybeTip();
  }
  function stop(){
    if(!on)return;on=false;
    closeCabin(0);closeTip();applyTv();
    if(bar){bar.remove();bar=null;sw=null}
  }
  window.BackRoomHoliday={start:start,stop:stop,cabin:function(){showCabin()},tv:function(v){if(v===undefined)return on&&tvWanted();setTv(!!v)},get on(){return on},get inCabin(){return !!cabin}};
})();
