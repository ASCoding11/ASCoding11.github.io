// World 2: Lost and Found. Old places that keep their secrets. See README.md in this folder for how a world file works.
// Levels 1-5 here (Overdue, Clockwork, Cold Feet, Lost Temple, Mirror Manor) were levels 9-13 before worlds came; their
// ids and layouts are unchanged, so saved stars and best times carry over.
(function(E){
'use strict';
const {DW,DH,WH,cur,flagOn,makeCode,shuffle,exitHall,BOOKS,GLYPHS,ROSES,COMPASS}=E;
E.world({n:2,needs:2,levels:[
// 9. A library: a ladder on rails up to the balcony, a long ride on a rolling ladder over the lava past hot lamps (hang
// low, then climb), and sliding drawers in the archive. Four coloured books around the level each show one digit of
// the door code; the card says which colour comes first.
{id:'library',name:'Overdue',sub:'The library',par:75,sky:['#9db4e6','#fbf3e4'],pal:{floor:'#c8955c',wall:'#86ad92',prop:'#a8703f',trim:'#3d2b1f'},
msgs:{libdoor:'Code accepted. The archive door opens'},unlock:['libdoor'],
build(B,r){
  const W=B.W,P=B.pal,WD={mat:'wood',col:'#b27a45'},CASE={mat:'books',col:'#7a4e2c'};
  W.codes.lib=makeCode(r);W.pads.lib={set:'libdoor'};W.books={lib:shuffle(Object.keys(BOOKS),r)};
  // a giant book standing on a shelf, its spine facing yaw, with its digit on the spine
  const book=(c,x,y,z,yaw)=>{const sx=Math.sin(yaw),sz=Math.cos(yaw);B.deco(x,y,z,1.1,2.3,1.5,{yaw,col:BOOKS[c],mat:'plastic'});
    B.sign(x+sx*.78,y,z+sz*.78,yaw,1.0,2.2,{book:'lib',col:c})};
  // reading room
  B.floor(-12,6.5,12,-24,{mat:'wood',col:'#c8955c'});B.wallZ(-12,7,-24);B.wallZ(12,7,-24);B.wallX(7,-12.5,12.5);
  B.wallX(-24,-12.5,12.5,[{c:-4,w:DW,h:5+DH}]);
  B.cp(0,0,-2.5);
  for(const [x,z] of [[-6,-6],[6,-6],[-6,-11.5],[6,-11.5]]){B.blk(x,z,4.6,2.2,1.2,WD);for(const s of [-1,1])B.blk(x+s*1.3,z+1.6,.9,.9,.6,{col:'#7a4e2c',mat:'wood'})}
  B.blk(0,-9,1.4,1.4,1.4,{col:'#7a4e2c',mat:'wood',name:'lectern'});book('red',0,2.55,-9,0);
  for(const s of [-1,1])B.blk(s*11,-3,2,13,3.5,CASE);
  // the balcony and its rolling ladder
  B.blk(-5,-21,14,6,5,{col:'#a8703f',mat:'wood',name:'balcony'});
  B.box(-9,2.5,-17.55,1.2,5,.9,{truss:true,mat:'truss',col:'#e9cfa0',move:{type:'line',ax:9,per:7},name:'ladA'});
  B.deco(-5,4.85,-17.9,14,.3,.2,{col:'#3d2b1f',mat:'metal'});
  book('gold',-8.4,6.15,-19.4,0);
  B.blk(5,-21.3,2,4.4,6,CASE);B.item('gem','gem',5,6.8,-21.3);
  B.sign(7.3,5.2,-23.45,0,6.8,3,{riddle:'lib'});
  B.sign(-5,7.6,-23.45,0,5,1.3,{title:'Quiet please',sub:'Find the four coloured books'});
  // the stacks: lava below, a ladder on rails along the west shelves, hot lamps sticking out of them
  B.floor(-8,-24,8,-62,{mat:'wood',col:'#b9874f'});B.wallZ(-8,-24,-62);B.wallZ(8,-24,-62);
  B.lava(-8,-28,8,-58.5);
  B.blk(-4,-26,3.2,4,5,{col:'#a8703f',mat:'wood',name:'L0'});
  B.blk(-4,-30.2,3.2,4.4,1.5,{col:'#a8703f',mat:'wood',name:'L1'});
  B.cp(1,-4,-30.4,{top:1.5,w:2.6,d:2.6});
  B.blk(-7,-42,1,24,WH,CASE);B.blk(-7,-27.1,1,2.2,5,CASE);
  B.box(-6.05,3.25,-30.5,.9,5.5,1.2,{truss:true,mat:'truss',col:'#e9cfa0',move:{type:'line',az:-24,per:11},name:'ladB'});
  B.deco(-6.05,.35,-42.5,.5,.2,26,{col:'#3d2b1f',mat:'metal'});B.deco(-6.05,6.15,-42.5,.5,.2,26,{col:'#3d2b1f',mat:'metal'});
  B.kill(-5.05,5.5,-37.5,1.1,2.2,.45,{name:'lamp1'});B.deco(-6.3,5.5,-37.5,.4,.3,.3,{col:'#c9a24a',mat:'metal'});
  B.kill(-5.05,2.3,-47,1.1,3.4,.45,{name:'lamp2'});B.deco(-6.3,2.3,-47,.4,.3,.3,{col:'#c9a24a',mat:'metal'});
  B.blk(-5.2,-56.9,3.6,3.2,6,{col:'#a8703f',mat:'wood',name:'L2'});
  B.blk(7,-42,1,24,WH,CASE);book('green',6.05,3.6,-43,-Math.PI/2);
  B.sign(2,7.4,-24.55,Math.PI,6,1.5,{title:'Ride the ladder',sub:'Hang low past the first lamp, then climb'});
  B.cp(2,2,-60.2);
  B.wallX(-62,-8.5,8.5,[{c:4,w:DW,h:DH}]);
  // the archive: drawers slide out of the card catalogue over the lava, then piles of old books
  B.floor(-12,-62,12,-86,{mat:'wood',col:'#c8955c'});B.wallZ(-12,-62,-86);B.wallZ(12,-62,-86);
  B.wallX(-86,-12.5,12.5,[{c:-6,w:DW,h:DH}]);
  B.lava(-12,-65.4,12,-80.6);
  B.blk(10.5,-73,3,16,6,{col:'#8a5a34',mat:'wood',name:'catalogue'});
  [[-67.4,0],[-71.2,.33],[-75,.66]].forEach(([z,ph],i)=>B.plat(7.4,1.6,z,2.6,2.4,{move:{type:'line',ax:-4.4,per:3.6,ph},mat:'wood',col:'#d9a066',name:'drawer'+i}));
  B.plat(1.4,1.6,-77.6,2.2,2.2,{crumble:true,mat:'crumble',col:'#e8d3a8',name:'pile0'});
  B.plat(-1.8,2.2,-79.2,2.2,2.2,{crumble:true,mat:'crumble',col:'#e8d3a8',name:'pile1'});
  B.blk(-11,-74,2,12,6,CASE);book('blue',-9.95,3.6,-73,Math.PI/2);
  B.panel('pad',-2.2,1.6,-85.35,0,{pad:'lib'},{icon:'pad'});
  B.door('x',-86,-6,'libdoor',{col:'#8a5a34'});
  B.sign(5,5.6,-85.45,0,6.6,2.8,{riddle:'lib'});
  B.cp(3,-2,-83.4);
  exitHall(B,-6,-86);
  // decor: windows and chandeliers
  for(const z of [2,-6,-14]){B.win(-11.5,z,Math.PI/2,{y:6.4,glass:'#ffe9b8',frame:'#3d2b1f'});B.win(11.5,z,-Math.PI/2,{y:6.4,glass:'#ffe9b8',frame:'#3d2b1f'})}
  for(const z of [-68,-78])B.win(-11.5,z,Math.PI/2,{y:7.6,glass:'#ffe9b8',frame:'#3d2b1f'});
  for(const [x,z] of [[0,-4],[0,-13]]){B.dcyl(x,8.6,z,1.4,.25,{col:'#c9a24a',mat:'metal'});B.dcyl(x,9.4,z,.08,1.6,{col:'#3d2b1f'});B.dcyl(x,8.9,z,.9,.3,{col:'#fff3c4',mat:'glass'})}
  // route
  const ladA=W.byName.get('ladA'),ladB=W.byName.get('ladB');
  B.w(-4.5,0,-14.2);B.w(-4.5,0,-16.5);
  B.ladder('ladA',(t,W,pl)=>pl.gr&&pl.y>4.5?'done':pl.climb?'climb':Math.abs(cur(ladA,t).x-pl.x)<.25?'grab':'wait');
  B.w(-4,5,-21.6);B.w(-4,5,-26.5);B.w(-4.4,1.5,-30.4);B.w(-5.05,1.5,-30.5);
  B.ladder('ladB',(t,W,pl)=>{const z=cur(ladB,t).z;
    if(!pl.climb)return pl.gr&&pl.y<2&&pl.z>-34?(z>-30.6&&Math.abs(pl.z-z)<.3?'grab':'wait'):pl.gr&&pl.y>5.5?'done':'wait';
    if(pl.z>-38.4)return pl.y<1.8?'climb':'hang';
    if(z>-53.6)return pl.y<4.4?'climb':'hang';
    return'climb'});
  B.w(-5.2,6,-56.8);B.w(-2,0,-59.4);B.w(4,0,-63.6);
  B.jon('drawer0',0,{wait:true});B.jon('drawer1',0,{wait:true});B.jon('drawer2',0,{wait:true});
  B.j(1.4,1.6,-77.6,{wait:true});B.j(-1.8,2.2,-79.2);B.j(-2,0,-83);
  B.use('pad',-2.2,0,-84.2);B.code('lib');B.w(-6,0,-87.6);B.w(-6,0,-89.4);
  W.spawn={x:0,y:0,z:-2.5,yaw:0};
}},

// 10. A clock tower: hop the turning gears and ride a swinging pendulum over the lava, run the hall of pendulum blades,
// then set the big clock to the time on the pocket watch: one button turns the hour hand, the other the minutes.
{id:'clock',name:'Clockwork',sub:'The clock tower',par:70,sky:['#4f5fa8','#ffd2a0'],pal:{floor:'#dcc8a4',wall:'#c39a6e',prop:'#c9a24a',trim:'#4a3423'},
msgs:{clockdoor:'The clock strikes! The door swings open'},unlock:['clockdoor'],
build(B,r){
  const W=B.W,BR={col:'#c9a24a',mat:'metal'},GEAR={col:'#b8893a',mat:'gear'};
  const th=1+Math.floor(r()*11),tm=Math.floor(r()*4);
  W.dials.clock={set:'clockdoor',keys:['h','m'],target:{h:th,m:tm}};
  W.st.dial.h=(th+3+Math.floor(r()*6))%12;W.st.dial.m=(tm+1+Math.floor(r()*3))%4;
  const gear=(name,x,z,rad,top,w)=>{B.cyl(x,top,z,rad,Object.assign({move:{type:'spin',w},name},GEAR));B.dcyl(x,top+.06,z,.55,.14,{col:'#4a3423',mat:'metal'})};
  // the gear room
  B.floor(-12,6.5,12,-30);B.wallZ(-12,7,-30);B.wallZ(12,7,-30);B.wallX(7,-12.5,12.5);
  B.wallX(-30,-12.5,12.5,[{c:0,w:DW,h:DH}]);
  B.cp(0,0,-1.5);
  B.lava(-12,-4,12,-27);
  gear('g1',-4,-7.5,2.6,1,.9);gear('g2',3,-10.6,2.4,1.8,-1.1);gear('g3',-1.5,-14.5,2.4,1,.8);
  gear('g4',7.6,-15,2,2.8,-1.2);B.item('gem','gem',7.6,3.9,-15);
  B.plat(-1.5,1,-22,2.6,2.4,{move:{type:'swing',dz:1,len:9.5,amp:.36,per:4.4},mat:'metal',col:'#d7b56a',name:'swingP'});
  B.deco(0,10.4,-22,24,.5,.5,BR);
  B.sign(0,7.2,-29.45,0,7,1.6,{title:'Clockwork',sub:'Ride the pendulum to the door'});
  // the hall of pendulum blades
  B.floor(-5,-30,5,-58);B.wallZ(-5,-30,-58);B.wallZ(5,-30,-58);
  B.cp(1,0,-32.2);
  [[-34.5,0],[-41.2,.33],[-48,.66]].forEach(([z,ph],i)=>{B.kill(0,1.2,z,2.4,1,.5,{move:{type:'swing',dx:1,len:8.4,amp:.39,per:2.8,ph},name:'blade'+i});B.deco(0,9.75,z,10,.4,.4,BR)});
  B.lava(-5,-37.4,5,-38.8);B.lava(-5,-44,5,-45.4);
  B.cp(2,0,-54.6);
  B.wallX(-58,-12.5,12.5,[{c:0,w:DW,h:DH}]);
  B.sign(0,7.3,-57.45,0,3.6,3.6,{watch:'clock'});
  B.sign(0,6.15,-30.55,Math.PI,6,1.3,{title:'Mind the blades',sub:'Run when they swing away'});
  // the clock room: the hour button on the west tower, the minutes on the east, a pendulum between them
  B.floor(-12,-58,12,-84);B.wallZ(-12,-58,-84);B.wallZ(12,-58,-84);
  B.wallX(-84,-12.5,12.5,[{c:0,w:DW,h:DH}]);
  B.lava(-12,-61.5,12,-78.5);
  gear('gW',-5.5,-64.8,2,1.4,1);gear('gE',6,-75.4,2,1.6,-1);
  for(const s of [-1,1]){B.blk(s*8,-70,3,3,3,{col:'#c39a6e',name:'tower'+(s<0?'W':'E')})}
  B.cp(3,-8,-69.2,{top:3,w:2.4,d:1.4});B.cp(4,8,-69.2,{top:3,w:2.4,d:1.4});
  B.btn('hourBtn',-8,-70.7,{dial:'clock',key:'h',n:12},{top:4.1,icon:'hour',col:'#ffd23f',stand:[-8,-69.2]});
  B.btn('minBtn',8,-70.7,{dial:'clock',key:'m',n:4},{top:4.1,icon:'minute',col:'#7dd3fc',stand:[8,-69.2]});
  B.plat(0,2.4,-70,2.6,2.6,{move:{type:'swing',dx:1,len:8,amp:.52,per:4.8},mat:'metal',col:'#d7b56a',name:'swing2'});
  B.deco(0,10.4,-70,24,.5,.5,BR);
  B.sign(0,7.4,-83.45,0,4.8,4.8,{clockface:'clock'});
  B.sign(0,7.4,-83.36,0,4.8,4.8,{hand:'h',dial:'clock'},{deco:true});B.sign(0,7.4,-83.3,0,4.8,4.8,{hand:'m',dial:'clock'});
  B.sign(-7.5,7,-83.45,0,6,1.6,{title:'Set the clock',sub:'To the time on the pocket watch'});
  B.door('x',-84,0,'clockdoor',{col:'#8a6a4a',part:{mat:'vaultdoor'}});
  exitHall(B,0,-84);
  // decor: brass pipes, round windows
  for(const x of [-11.25,11.25])B.deco(x,7.6,-12,.6,.6,36,BR);
  for(const z of [-8,-20]){B.win(-11.5,z,Math.PI/2,{y:6.6,w:2.6,h:2.6,glass:'#ffe2b0',frame:'#4a3423'});B.win(11.5,z,-Math.PI/2,{y:6.6,w:2.6,h:2.6,glass:'#ffe2b0',frame:'#4a3423'})}
  for(const z of [-64,-76])B.win(-11.5,z,Math.PI/2,{y:7.4,w:2.6,h:2.6,glass:'#ffe2b0',frame:'#4a3423'});
  // route
  B.w(-2.4,0,-3.4);B.jon('g1',0,{wait:true});B.jon('g2',0,{wait:true});B.jon('g3',0,{wait:true});B.jon('swingP',0,{wait:true});B.j(-1.5,0,-28.4,{wait:true});
  B.w(0,0,-32.2);B.w(0,0,-36.6);B.j(0,0,-40.1,{wait:true});B.w(0,0,-42.8);B.j(0,0,-46.6,{wait:true});B.w(0,0,-52);B.w(0,0,-56.5);
  B.w(-5.5,0,-60.6);B.jon('gW',0,{wait:true});B.j(-8,3.12,-69.2,{wait:true});B.dial('hourBtn','clock','h',-8,3.12,-69.2);
  B.w(-7,3,-70);B.jon('swing2',0,{wait:true});B.j(8,3.12,-69.2,{wait:true});B.dial('minBtn','clock','m',8,3.12,-69.2);
  B.w(7,3.12,-69.4);B.jon('gE',0,{wait:true});B.j(4,0,-80.2,{wait:true});B.w(0,0,-82.4);B.w(0,0,-87.4);
  W.spawn={x:0,y:0,z:-1.5,yaw:0};
}},

// 11. An ice cave over hot springs: slippery ice floes on the lava (land, then brake), a tunnel of steam vents and a
// crumbling ice bridge, all in a cold that freezes you if you stay away from a fire too long, then a cave where an
// ice block slides until it hits something: get it onto the star.
{id:'ice',name:'Cold Feet',sub:'The ice cave',par:85,snow:true,sky:['#7fb2d9','#eef6fb'],pal:{floor:'#dfe9f2',wall:'#9cc3df',prop:'#bfe3fa',trim:'#2c5f8a'},
msgs:{iceblock:'The block slid onto the star. The door is open'},unlock:['iceblock'],
build(B,r){
  const W=B.W,ICE={ice:true,mat:'ice',col:'#cfeeff'},ROCK={col:'#8ea3b5',mat:'stone'};
  // a fire in a stone bowl, warming the box rad around (zx, zz) (default: round the fire)
  const fire=(x,z,top,rad,zx,zz)=>{B.cyl(x,top+.7,z,.7,{t:.7,col:'#5b6475',mat:'stone',name:'brazier'});B.dcyl(x,top+.75,z,.55,.12,{col:'#ffb347',mat:'glass'});
    zx=zx==null?x:zx;zz=zz==null?z:zz;B.zone('warm',zx-rad,zz-rad,zx+rad,zz+rad,top-1,top+4,{fire:[x,top+.9,z]})};
  // the frozen lake: floes of ice on the lava, a rock island with a fire in the middle
  B.floor(-12,6.5,12,-30,ROCK);B.wallZ(-12,7,-30);B.wallZ(12,7,-30);B.wallX(7,-12.5,12.5);
  B.wallX(-30,-12.5,12.5,[{c:0,w:DW,h:DH}]);
  B.cp(0,0,3.6);
  fire(-6,4,0,3.4);
  B.zone('cold',-12,1.4,12,-62,-2,12,{name:'cold'});
  B.lava(-12,1,12,-26);
  B.plat(-3,.6,-4,3.6,3.6,Object.assign({name:'f1'},ICE));
  B.plat(2.5,.6,-8.6,3.6,3.6,Object.assign({name:'f2'},ICE));
  B.plat(-8,.6,-9.5,3.2,3.2,Object.assign({name:'f5'},ICE));B.item('gem','gem',-8,1.5,-9.5);
  B.plat(7.5,.8,-13.5,4,4,Object.assign({name:'isle'},ROCK));fire(8.6,-14.6,.8,2.9,7.5,-13.5);
  B.plat(3,.6,-18.4,3.6,3.6,Object.assign({name:'f3',move:{type:'line',ax:-3,per:5}},ICE));
  B.plat(-3.5,.6,-22.4,3.6,3.6,Object.assign({name:'f4'},ICE));
  fire(8,-28,0,3);
  B.sign(0,6.6,-29.45,0,7,1.6,{title:'Keep warm!',sub:'The cold gets you away from a fire'});
  // the tunnel: steam vents, a fire, a crumbling ice bridge
  B.floor(-4,-30,4,-62,ROCK);B.wallZ(-4,-30,-62);B.wallZ(4,-30,-62);
  B.cp(1,0,-31.6);
  [[-36,0],[-40.4,.5]].forEach(([z,ph],i)=>{B.laser(0,2.5,z,7.6,5,.3,{timed:{per:2.6,on:.5,ph},name:'vent'+i});B.deco(0,.1,z,7.6,.2,1.4,{col:'#4b5563',mat:'metal'})});
  fire(2.6,-45.2,0,2.4);
  B.lava(-4,-48.6,4,-57.2);
  [[0,-50.2],[-1.6,-53],[.8,-55.8]].forEach(([x,z],i)=>B.plat(x,.5,z,2.4,2.4,{ice:true,crumble:true,mat:'crumble',col:'#d6f1ff',name:'bridge'+i}));
  fire(-2.6,-59.6,0,2.4);B.cp(2,1.2,-59.4);
  B.wallX(-62,-12.5,12.5,[{c:0,w:DW,h:DH}]);
  // the block cave (warm: the springs heat it): slide the ice block onto the star
  B.floor(-12,-62,12,-86,Object.assign({},ICE,{mat:'ice',col:'#e3f4ff'}));B.wallZ(-12,-62,-86);B.wallZ(12,-62,-86);
  B.wallX(-86,-12.5,12.5,[{c:6,w:DW,h:DH}]);
  B.blk(8,-74,2,2,2,Object.assign({name:'rock2'},ROCK));B.blk(-6,-72.1,2,2,2,Object.assign({name:'rock1'},ROCK));
  B.blk(-9.5,-66,2.4,2.4,1.4,ROCK);B.blk(1,-80,2.2,2.2,1.2,ROCK);
  B.add({x:-4,y:.03,z:-82,w:2.4,h:.06,d:2.4,solid:false,plate:'iceblock',mat:'plate',col:'#ffd23f',name:'star',cam:false});
  B.add({x:8,y:.9,z:-65,w:1.8,h:1.8,d:1.8,push:true,slide:true,mat:'iceblock',col:'#9fdcff',name:'block'});
  B.door('x',-86,6,'iceblock',{col:'#7aa7c7'});
  B.sign(-3,6.2,-85.45,0,7,1.6,{title:'Block on the star',sub:'It slides until it hits something'});
  B.sign(-8,5.8,-62.55,Math.PI,6.4,1.4,{title:'Stuck?',sub:'Back to the checkpoint resets the block'});
  exitHall(B,6,-86);
  // decor: icicles on the walls, crystals
  for(const [x,z] of [[-11,-4],[11,-10],[-11,-18],[11,-24]])for(let k=0;k<3;k++)B.deco(x,8.6-k*.2,z+k*1.2,.5,1.4+k*.5,.5,{col:'#e0f2fe',mat:'glass'});
  for(const [x,z,h] of [[-10.5,-80,2.4],[10.6,-82,3],[-10.8,-70,1.8]])B.deco(x,h/2,z,.9,h,.9,{col:'#a5f3fc',mat:'glass',yaw:.6});
  // route
  const block=W.byName.get('block');
  B.w(-3,0,1.6);B.j(-3,.6,-4,{wait:true});B.j(2.5,.6,-8.6,{wait:true});B.j(7.2,.8,-13,{wait:true});B.u((t,W,pl)=>pl.cold<.1);
  B.jon('f3',0,{wait:true});B.j(-3.5,.6,-22.4,{wait:true});B.j(-2,0,-27.6,{wait:true});B.w(6.6,0,-27.8);B.u((t,W,pl)=>pl.cold<.1);
  B.w(0,0,-31.6);B.w(0,0,-34.6);B.w(0,0,-42);B.w(2.2,0,-44.6);B.u((t,W,pl)=>pl.cold<.1);B.w(0,0,-47.6);
  B.j(0,.5,-50.2,{wait:true});B.j(-1.6,.5,-53,{wait:true});B.j(.8,.5,-55.8,{wait:true});B.j(0,0,-58.6,{wait:true});B.w(0,0,-63.6);
  B.w(8,0,-63.2);B.kick('block',[0,-1]);B.u(()=>!block.sv);
  B.w(10.2,0,-66);B.w(9.9,0,-72);B.kick('block',[-1,0]);B.u(()=>!block.sv);
  B.w(3,0,-70);B.w(-4,0,-70.2);B.kick('block',[0,-1]);B.u((t,W)=>flagOn(W,'iceblock',t));
  B.w(4,0,-78);B.w(6,0,-84);B.w(6,0,-89.4);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}},

// 12. A jungle temple: a corridor where a boulder rolls at you (wait in the side niches), a ring of stepping stones
// round a turning stone over the lava, to land on in the order the mural shows, then a swinging log and a vine up
// to the door at the top.
{id:'temple',name:'Lost Temple',sub:'The jungle temple',par:80,sky:['#7ec8a0','#f4f7df'],pal:{floor:'#d2c08e',wall:'#93a872',prop:'#b8875a',trim:'#3f5a2a'},
msgs:{mural:'The stones glow. The temple door slides open'},unlock:['mural'],
build(B,r){
  const W=B.W,ST={col:'#c2ad7a',mat:'stone'},MOSS={col:'#93a872',mat:'wall'};
  W.seqs.glyph={order:shuffle(GLYPHS.slice(),r).slice(0,4),set:'mural'};
  // the boulder corridor: niches in its sides, a trench at the near end where the boulder drops away
  B.floor(-7,6.5,7,-46,ST);B.wallX(7,-7.5,7.5);B.wallZ(-7,7,-46,[{c:-36.5,w:3,h:DH}]);B.wallZ(7,7,-46);B.wallX(-46,-7.5,7.5);
  B.cp(0,0,3.4);
  for(const [z0,z1] of [[-1.4,-7.5],[-10.5,-14.5],[-17.5,-46]])B.blk(5.5,(z0+z1)/2,3,Math.abs(z1-z0),WH,MOSS);
  for(const [z0,z1] of [[-1.4,-21.5],[-24.5,-28.5],[-31.5,-35],[-38,-46]])B.blk(-5.5,(z0+z1)/2,3,Math.abs(z1-z0),WH,MOSS);
  B.wallX(-39.5,-4.5,4.5,[{c:0,w:7,h:6.4}],{col:'#7f9663'});
  B.lava(-4,-1.6,4,-4.6);
  const BOULDER_PER=4.4;
  B.add({shape:'cyl',x:0,y:2.9,z:-43,r:2.9,h:5.8,kill:true,solid:false,mat:'boulder',col:'#a08d68',move:{type:'roll',az:38.4,per:BOULDER_PER},name:'boulder',cam:false});
  B.sign(0,7.4,-39.95,0,6,1.5,{title:'Run!',sub:'Hide in the niches'});
  // the stone ring: land on the stones in the mural's order, by way of the turning stone in the middle
  B.floor(-27,-24,-7,-50,ST);B.wallZ(-27,-24,-70);B.wallX(-24,-27.5,-6.5);B.wallZ(-7,-46,-70);
  B.wallX(-50,-27.5,-6.5,[{c:-17,w:DW,h:DH}]);
  B.lava(-27,-24,-9.6,-46.6);
  const CX=-17,CZ=-37;
  B.cyl(CX,.8,CZ,2.4,{col:'#c2ad7a',mat:'stone',name:'hub',move:{type:'spin',w:.6}});B.dcyl(CX,.86,CZ,1.2,.12,{col:'#3f5a2a',mat:'stone'});
  B.blk(-12,CZ,4.8,1.6,.3,{col:'#b8875a',mat:'wood',name:'walk'});
  GLYPHS.forEach((g,i)=>{const a=(30+i*60)*Math.PI/180,x=CX+Math.cos(a)*5.4,z=CZ+Math.sin(a)*5.4;
    B.blk(x,z,2.2,2.2,1.4,{col:'#d9c79a',mat:'stone',step:{seq:'glyph',sym:g},name:'stone_'+g});B.sign(x,1.42,z,0,1.7,1.7,{icon:g,flat:true,glyph:true})});
  B.sign(-26.45,6,CZ,Math.PI/2,8.6,2.8,{mural:'glyph'});
  B.cp(1,-8.4,-36.5,{w:1.8,d:2.6});
  B.blk(-17,-48.3,20,3.4,.3,{col:'#b8875a',mat:'stone',name:'northLedge'});
  B.door('x',-50,-17,'mural',{col:'#7f9663',part:{mat:'gate'}});
  // the vine room: crumbling stones, a swinging log to ride, a vine up the pillar to the door at the top
  B.floor(-27,-50,-7,-70,ST);
  B.lava(-27,-53.2,-7,-70);
  B.cp(2,-17,-51.6);
  B.plat(-17,.8,-55.4,2.2,2.2,{crumble:true,mat:'crumble',col:'#d9c79a',name:'c1'});
  B.plat(-14.4,1.2,-58,2.2,2.2,{crumble:true,mat:'crumble',col:'#d9c79a',name:'c2'});
  B.plat(-17,1.2,-61.6,3,2.4,{move:{type:'swing',dx:1,len:8,amp:.58,per:5},mat:'wood',col:'#8b6a3e',name:'swingLog'});
  B.deco(-17,9.4,-61.6,19.6,.5,.5,{col:'#6b4f2a',mat:'wood'});
  B.plat(-9.2,3.2,-60.4,2.4,2.4,ST);B.item('gem','gem',-9.2,4,-60.4);
  B.blk(-23,-65.6,2.6,2.6,5,{col:'#93a872',mat:'stone',name:'pillar'});
  B.box(-23,2.9,-63.85,1.4,4.2,.9,{truss:true,mat:'vine',col:'#4f9a3a',name:'vine'});
  B.wallX(-70,-27.5,-6.5,[{c:-23,w:DW,h:5+DH}]);
  B.blk(-23,-71.45,6,9.1,5,{col:'#e8fff1',mat:'floor',name:'exitfloor'});B.wallZ(-26,-70,-76);B.wallZ(-20,-70,-76);B.wallX(-76,-26.5,-19.5);
  B.finish(-23,-73.4,{top:5});B.sign(-23,5+DH+.75,-69.47,0,2.6,.8,{exit:true});
  B.sign(-13,6.4,-69.45,0,7,1.6,{title:'Climb the vine',sub:'The way out is at the top'});
  // decor: vines and statues
  for(const [x,z] of [[-26.5,-28],[-26.5,-46],[-7.5,-58]])B.deco(x,6,z,.15,6,1.4,{col:'#4f9a3a',mat:'plastic'});
  for(const s of [-1,1])B.blk(s*4.6,4.4,1.6,1.6,3,{col:'#b8875a',mat:'stone'});
  // route: wait in each niche until the boulder has passed (or is far away)
  const bd=W.byName.get('boulder');
  const go=(need)=>(t,W,pl)=>{const z=cur(bd,t).z;return z-2.9>pl.z+.6||pl.z-(z+2.9)>need};
  B.w(0,0,.4);B.u(go(30));B.j(0,0,-6.6,{wait:true});B.w(3.4,0,-8.4);B.w(5.3,0,-9);
  B.u(go(25));B.w(3.4,0,-10.2);B.w(3.4,0,-15);B.w(5.3,0,-16);
  B.u(go(27));B.w(3,0,-17.4);B.w(-3.2,0,-22);B.w(-5.3,0,-23);
  B.u(go(25));B.w(-3.4,0,-24.2);B.w(-3.4,0,-29);B.w(-5.3,0,-30);
  B.u(go(23));B.w(-3.4,0,-31.2);B.w(-3.6,0,-36.5);B.w(-8.4,0,-36.5);
  B.steps('glyph','hub');B.jon('hub',0,{stay:true});B.jon('stone_eye',0,{stay:true});B.j(-17,.3,-48.4,{wait:true});B.w(-17,0,-51.6);
  B.j(-17,.8,-55.4);B.j(-14.4,1.2,-58);B.jon('swingLog',0,{wait:true});
  B.ladder('vine',(t,W,pl)=>pl.gr&&pl.y>4.9?'done':pl.climb||cur(W.byName.get('swingLog'),t).x<-20.6?'climb':'wait');
  B.w(-23,5,-66.6);B.w(-23,5,-73.4);
  W.spawn={x:0,y:0,z:3.4,yaw:0};
}},

// 13. A haunted manor: fading steps up to three mirrors, and only the one framed in the colour of the rose in the
// portrait takes you on (the others send you back to the door); then turn the mirrors so the moonbeam reaches the
// crystal, past red ghosts; then ride the chandeliers to the last mirror.
{id:'manor',name:'Mirror Manor',sub:'The haunted house',par:80,night:true,sky:['#141a3a','#5b4f8a'],pal:{floor:'#8a6a52',wall:'#7d6e96',prop:'#a38c6a',trim:'#2b1f3a'},
msgs:{moondoor:'The crystal lights up. The door creaks open'},unlock:['moondoor'],
build(B,r){
  const W=B.W,DARK={col:'#5a4636',mat:'wood'},STONE={col:'#8f8aa3',mat:'stone'};
  const rose=Object.keys(ROSES)[Math.floor(r()*3)];W.rose=rose;
  const ghost=(name,cx,cz,rad,w,a0,y)=>B.add({shape:'cyl',x:cx+rad,y:y||1.6,z:cz,r:.55,h:1.4,kill:true,solid:false,mat:'ghost',col:'#ff3355',cam:false,name,move:{type:'orbit',cx,cz,rad,w,a0}});
  // the foyer: fading steps up to the balcony and its three mirrors
  B.floor(-12,6.5,12,-20,DARK);B.wallZ(-12,7,-50);B.wallZ(12,7,-50);B.wallX(7,-12.5,12.5);B.wallX(-20,-12.5,12.5);
  B.cp(0,0,3.2);
  B.lava(-12,-1.6,12,-14);
  B.plat(0,.8,-4.2,2.6,2.6,{timed:{per:3,on:.62,ph:0},mat:'blink',col:'#c4b5fd',name:'fade0'});
  B.plat(-3.4,1.6,-7.2,2.6,2.6,{col:'#a38c6a',mat:'wood',name:'step1'});
  B.plat(0,2.4,-10.2,2.6,2.6,{timed:{per:3,on:.62,ph:.5},mat:'blink',col:'#c4b5fd',name:'fade2'});
  B.blk(0,-17,24,6,3.2,{col:'#6b5444',mat:'wood',name:'balcony'});
  B.cp(1,-8.6,-15.6,{top:3.2,w:2.4,d:2.4});
  Object.keys(ROSES).forEach((c,i)=>{const x=-6+i*6,to=c===rose?[0,.4,-22.8,0]:[0,.4,3.2,0];
    B.portal('mirror_'+c,x,-19.25,0,to,{top:3.2,col:ROSES[c]});B.deco(x,5,-19.45,3,4.2,.12,{col:ROSES[c],mat:'plastic'})});
  B.sign(0,8.4,-19.45,0,2.8,2.8,{portrait:'rose'});
  B.sign(-7.5,8.6,-19.45,0,4.6,1.2,{title:'Which mirror?',sub:'Ask the lady in the portrait'});
  B.blk(10.8,-11.6,1.6,1.6,4.6,{col:'#5a4636',mat:'wood',name:'clock'});B.item('gem','gem',10.8,5.4,-11.6);
  // the gallery (no way in but the mirror): turn the mirrors so the moonbeam reaches the crystal
  B.floor(-12,-20,12,-50,DARK);B.wallX(-50,-12.5,12.5,[{c:6,w:DW,h:DH}]);
  B.lava(-12,-24.6,12,-46);
  B.cp(2,0,-22.6);
  const isle=(name,x,z,w)=>B.plat(x,.6,z,w,w,Object.assign({name},STONE));
  isle('i1',3,-27.5,3.4);isle('i2',3,-39,3.4);isle('i3',-6,-39,3.4);
  B.plat(3,.6,-31.7,2.2,2.2,{timed:{per:2.8,on:.6,ph:0},mat:'blink',col:'#c4b5fd',name:'t1'});
  B.plat(3,.6,-34.7,2.2,2.2,{timed:{per:2.8,on:.6,ph:.45},mat:'blink',col:'#c4b5fd',name:'t2'});
  isle('s1',-1.5,-39,1.8);ghost('ghost1',-1.5,-39,2.6,1.3,0);
  isle('s2',-3.2,-43.4,1.8);
  B.blk(-6,-47.6,1.2,1.2,1.2,STONE);B.add({x:-6,y:1.9,z:-47.6,w:.7,h:1.2,d:.7,deco:true,mat:'crystal',col:'#bfe9ff',name:'crystal'});
  const MIR=[['m1',3,-27.5],['m2',3,-39],['m3',-6,-39]];
  W.beams.moon={x:11.4,z:-27.5,dir:[-1,0],y:1.8,set:'moondoor',mirrors:MIR.map(m=>m[0]),target:{x:-6,z:-47.6,name:'crystal'},stops:[[-13,-51,-11.5,-19],[11.5,-51,13,-19],[-13,-20.5,13,-19],[-13,-51,13,-49.5]]};
  for(const [n,x,z] of MIR){B.cyl(x,1.1,z,.45,{col:'#3b3355',mat:'metal'});B.add({x,y:1.85,z,w:1.7,h:1.5,d:.16,solid:false,btn:{mirror:'moon'},name:n,mat:'mirror',col:'#dfe7ff',icon:'mirror',cam:false,stand:[x,z+1.1]})}
  // a starting setting that isn't the answer (the answer is every mirror at 0)
  do{for(const [n] of MIR)W.st.mir[n]=r()<.5?1:0}while(MIR.every(([n])=>!W.st.mir[n]));
  B.deco(11.45,1.8,-27.5,.12,1.6,1.6,{col:'#fff7c2',mat:'glass'});
  B.door('x',-50,6,'moondoor',{col:'#5a4636'});
  B.sign(-3,6.4,-49.45,0,7,1.6,{title:'Catch the moonlight',sub:'Turn the mirrors to light the crystal'});
  B.blk(6,-48,6,4,.3,{col:'#6b5444',mat:'wood',name:'northStrip'});
  // the ballroom: chandeliers circle over the lava to the last mirror, which takes you out
  B.floor(-12,-50,12,-72,DARK);B.wallZ(-12,-50,-72);B.wallZ(12,-50,-72);B.wallX(-72,-12.5,12.5);
  B.lava(-12,-53.4,12,-72);
  B.cp(3,6,-51.6);
  for(let i=0;i<2;i++)B.plat(0,1.6,-61,3,3,{t:.5,move:{type:'orbit',cx:0,cz:-61,rad:4.6,w:.6,a0:i*Math.PI},name:'chand'+i,mat:'metal',col:'#d9b45a'});
  B.cyl(0,2.6,-61,1.6,{t:3.6,col:'#3b3355',mat:'metal',name:'column'});ghost('ghost2',0,-61,7.4,-.7,1,2.4);
  B.blk(-8.4,-67.6,4,4,1.2,{col:'#6b5444',mat:'wood',name:'dais'});
  B.portal('mirror_out',-8.4,-69.35,0,[0,.4,-75.2,0],{top:1.2,col:'#7ef0b4'});B.deco(-8.4,3,-69.5,3,4.2,.12,{col:'#7ef0b4',mat:'plastic'});
  B.sign(-8.4,6.6,-71.45,0,3.4,1,{exit:true});
  B.floor(-3,-72,3,-80,{col:'#e8fff1'});B.wallZ(-3,-72,-80);B.wallZ(3,-72,-80);B.wallX(-80,-3.5,3.5);B.finish(0,-76.6);
  // decor: candles, portraits, moonlit windows
  for(const z of [0,-8])for(const s of [-1,1])B.win(s*11.5,z,-s*Math.PI/2,{y:6,glass:'#9fb3ff',frame:'#2b1f3a'});
  for(const z of [-30,-42])B.win(-11.5,z,Math.PI/2,{y:6.4,glass:'#9fb3ff',frame:'#2b1f3a'});
  for(const [x,z] of [[-11.5,-58],[11.5,-64]])B.poster(x,z,x<0?Math.PI/2:-Math.PI/2,'#5a4636',{y:6,w:2.2,h:2.8});
  // route
  const right=-6+Object.keys(ROSES).indexOf(rose)*6;
  B.w(0,0,-.8);B.j(0,.8,-4.2,{wait:true});B.j(-3.4,1.6,-7.2,{wait:true});B.j(0,2.4,-10.2,{wait:true});B.j(0,3.2,-15,{wait:true});
  B.w(right,3.2,-17);B.tp(right,3.2,-19.25);B.w(0,0,-22.6);
  B.j(3.8,.6,-26.5);if(W.st.mir.m1)B.use('m1',3,.6,-26.4);
  B.j(3,.6,-31.7,{wait:true});B.j(3,.6,-34.7,{wait:true});B.j(3.6,.6,-37.8,{wait:true});if(W.st.mir.m2)B.use('m2',3,.6,-37.9);
  B.j(-1.5,.6,-39,{wait:true,stay:true});B.j(-4.9,.6,-39.9,{wait:true,stay:true});if(W.st.mir.m3)B.use('m3',-6,.6,-37.9);
  B.j(-3.2,.6,-43.4,{wait:true,stay:true});B.j(-1.6,0,-47.6,{wait:true});B.u((t,W)=>flagOn(W,'moondoor',t));B.w(5,.3,-48.4);B.w(6,0,-51.6);
  B.jon(['chand0','chand1'],0,{wait:true});B.j(-8.4,1.2,-66.4,{wait:true});B.tp(-8.4,1.2,-69.35);B.w(0,0,-76.6);
  W.spawn={x:0,y:0,z:3.2,yaw:0};
}},
// 6. An old theatre: two sets of scenery on the stage over the orchestra pit, swapped by levers (the red set is up
// when the blue one is down): find out where to swap them on the way across, then a spotlight sweeping the wings, the
// fly loft (sandbags that go up and down, a catwalk, crumbling planks and a swinging sandbag) and the backstage
// trapdoors to the stage door, whose code is split between the playbill and a backdrop in the loft.
{id:'theatre',name:'Stage Fright',sub:'The old theatre',par:85,sky:['#3b2a5c','#f4b183'],pal:{floor:'#b07a4a',wall:'#9c3b4a',prop:'#d9a441',trim:'#2b1420'},
msgs:{stagedoor:'Code accepted. The stage door opens','scene:on':'The scenery swaps: the blue set is up','scene:off':'The scenery swaps: the red set is up'},unlock:['stagedoor'],
build(B,r){
  const W=B.W,WD={mat:'wood',col:'#c08a52'},RED={col:'#e0453a',mat:'plastic'},BLUE={col:'#3a6fe0',mat:'plastic'},GOLD={col:'#d9a441',mat:'metal'};
  W.codes.stage=makeCode(r);W.pads.stage={set:'stagedoor'};
  W.st.f.scene=true; // the blue set starts up
  const red=(name,x,top,z,w,d)=>B.plat(x,top,z,w,d,Object.assign({name,offIf:'scene'},RED));
  const blue=(name,x,top,z,w,d)=>B.plat(x,top,z,w,d,Object.assign({name,onIf:'scene'},BLUE));
  const lever=(name,x,z,top,stand)=>B.btn(name,x,z,{toggle:'scene'},{top,icon:'lever',col:'#ffd23f',stand});
  // the stage: the pit is open (lava); levers at the front and on the riser in the middle
  B.floor(-12,6.5,12,-34,WD);B.wallZ(-12,7,-34);B.wallZ(12,7,-34);B.wallX(7,-12.5,12.5);
  B.wallX(-34,-12.5,12.5,[{c:8,w:DW,h:DH}]);
  B.cp(0,0,3.6);
  B.lava(-12,-1,12,-29);
  lever('lever1',-4,1.6,1.1,[-4,2.8]);
  blue('b1',5,1.2,-4.4,2.6,2.6);blue('b2',9,2.4,-8.6,2.4,2.4);B.item('gem','gem',9,3.3,-8.6);
  red('a1',-5,1.2,-4.6,2.6,2.6);red('a2',-7.5,2,-9.2,2.6,2.6);red('a3',-4,2.4,-13.4,2.6,2.6);
  B.plat(1,1.6,-17,5,4,{col:'#7a4e2c',mat:'wood',name:'riser'});lever('lever2',2.6,-17.9,2.7,[1,-16.4]);
  blue('b3',6,2.2,-21.4,2.6,2.6);blue('b4',9,2.8,-25.6,2.6,2.6);
  // the wings: a spotlight sweeps across in front of the door
  B.laser(-6,2.5,-31.4,.5,5,2.6,{move:{type:'line',ax:16,per:4.2},name:'spot'});
  B.deco(0,9.4,-31.4,24,.3,.3,{col:'#3d2b1f',mat:'metal'});
  B.sign(-11.45,4.4,-10,Math.PI/2,4.4,2.6,{code:'stage',half:0,label:'Playbill: stage door code, 1st half'});
  B.sign(0,8.2,-33.45,0,8,1.6,{title:'Stage Fright',sub:'Pull a lever to swap the scenery'});
  // the curtain, the footlights and the boxes at the sides
  for(const s of [-1,1]){B.deco(s*10.6,5,-0.6,2,10,.4,{col:'#8b1e2e',mat:'plastic'});B.blk(s*10.4,4.6,3,3.4,2.6,{col:'#7a4e2c',mat:'wood'})}
  B.deco(0,9.3,-0.6,24,1.4,.4,{col:'#8b1e2e',mat:'plastic'});
  for(let x=-10;x<=10;x+=4)B.deco(x,.25,-.7,.6,.3,.4,{col:'#fff3c4',mat:'glass'});
  // the fly loft: sandbags that go up and down, a catwalk, crumbling planks, a sandbag on a rope
  B.floor(-10,-34,10,-66,WD);B.wallZ(-10,-34,-66);B.wallZ(10,-34,-66);B.wallX(-66,-10.5,10.5,[{c:-6,w:DW,h:DH}]);
  B.cp(1,8,-36.2);
  B.lava(-10,-38,10,-62);
  B.plat(5,1,-41,2.4,2.4,{move:{type:'line',ay:4.2,per:4.6},mat:'barrel',col:'#c6b38e',name:'bag1'});
  B.plat(-1,5,-43.5,8,1.6,{col:'#5b4636',mat:'metal',name:'catwalk'});
  B.plat(-4,5,-47,2,2,{crumble:true,mat:'crumble',col:'#d9b98a',name:'plank1'});
  B.plat(-6.4,5,-50.4,2,2,{crumble:true,mat:'crumble',col:'#d9b98a',name:'plank2'});
  B.plat(-6,4.2,-55,2.2,2.2,{move:{type:'swing',dz:1,len:6,amp:.5,per:4},mat:'barrel',col:'#c6b38e',name:'bag2'});
  B.deco(0,10.4,-55,20,.4,.4,{col:'#3d2b1f',mat:'metal'});
  B.plat(-6,3.4,-60.6,3,2.4,{col:'#5b4636',mat:'metal',name:'ledge'});
  B.deco(0,8.7,-46.2,16,2.2,.15,{col:'#2f4a7a',mat:'plastic'});
  B.sign(0,8.7,-46.3,Math.PI,5.6,2,{code:'stage',half:1,label:'Stage door code, 2nd half'});
  B.sign(2,7.6,-34.55,Math.PI,6,1.4,{title:'The fly loft',sub:'Look back from the catwalk'});
  B.cp(2,-6,-63.8);
  // backstage: a revolving stage under a spinning bar, trapdoors that open and shut, the stage door
  B.floor(-12,-66,12,-92,WD);B.wallZ(-12,-66,-92);B.wallZ(12,-66,-92);
  B.wallX(-92,-12.5,12.5,[{c:8,w:DW,h:DH}]);
  B.lava(-12,-69.6,12,-86.4);
  B.cyl(-5,1.2,-74.5,3.4,{col:'#7a4e2c',mat:'wood',name:'revolve',move:{type:'spin',w:.8}});
  B.kill(-5,2.1,-74.5,6.4,.5,.4,{move:{type:'spin',w:-1.5},name:'boom'});
  B.cyl(-5,2.6,-74.5,.45,{t:1.2,col:'#3d2b1f',name:'boomhub'});
  B.plat(1,1.2,-78,2.4,2.4,{timed:{per:3,on:.62,ph:0},mat:'blink',col:'#e8c07a',name:'trap1'});
  B.plat(4.6,1.6,-81.2,2.4,2.4,{timed:{per:3,on:.62,ph:.45},mat:'blink',col:'#e8c07a',name:'trap2'});
  B.blk(8,-84.4,5,4.2,1.6,{col:'#7a4e2c',mat:'wood',name:'dais'});
  B.panel('pad',4.2,1.6,-91.35,0,{pad:'stage'},{icon:'pad'});
  B.door('x',-92,8,'stagedoor',{col:'#5b4636'});
  B.sign(-3,6.4,-91.45,0,7,1.6,{title:'Stage door',sub:'Two halves of the code'});
  B.cp(3,6,-88.4);
  exitHall(B,8,-92);
  // decor: footlights backstage, ropes in the loft
  for(const x of [-8,-3,2,7])B.deco(x,5.5,-64.5,.12,11,.12,{col:'#a07a4a'});
  for(const z of [-72,-82])B.win(11.5,z,-Math.PI/2,{y:6.6,glass:'#ffd9a0',frame:'#2b1420'});
  // route: swap to the red set, cross to the riser, swap back to the blue set, on through the loft and backstage
  B.use('lever1',-4,0,2.8);
  B.j(-5,1.2,-4.6,{wait:true});B.j(-7.5,2,-9.2,{wait:true});B.j(-4,2.4,-13.4,{wait:true});B.j(0,1.6,-16.2,{wait:true});
  B.use('lever2',1,1.6,-16.4);
  B.j(6,2.2,-21.4,{wait:true});B.j(9,2.8,-25.6,{wait:true});B.j(8.4,0,-30,{wait:true});B.w(8,0,-36.2);
  B.w(5,0,-37.4);B.jon('bag1',0,{wait:true});B.ladder('bag1',(t,W,pl)=>pl.y>4.6?'done':'wait');B.j(2,5,-43.5,{wait:true});B.w(-3.6,5,-43.5);
  B.j(-4,5,-47,{wait:true});B.j(-6.4,5,-50.4);B.jon('bag2',0,{wait:true});B.j(-6,3.4,-60.6,{wait:true});B.w(-6,0,-63.8);
  B.w(-6,0,-68.4);B.jon('revolve',2.4,{wait:true,sym:true});B.j(1,1.2,-78,{wait:true});B.j(4.6,1.6,-81.2,{wait:true});B.j(7,1.6,-84.4,{wait:true});
  B.w(5,0,-88.8);B.use('pad',4.2,0,-90.2);B.code('stage');B.w(8,0,-93.6);B.w(8,0,-95.2);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}},
// 7. A lighthouse on a volcanic island in a storm: gusts of wind (you can see them coming) blow you sideways over the
// stepping stones (the fuse rides on a bobbing buoy), then the climb round the outside of the tower in a steady wind
// with gusts on top, where the lamp needs the fuse and its lens turned to the bearing in the keeper's log. Only then
// does the beam light the floating lanterns down to the cliff.
{id:'gale',name:'Gale Point',sub:'The lighthouse',par:90,sea:true,sky:['#55607e','#d8d2c4'],pal:{floor:'#8d8778',wall:'#e9e2d0',prop:'#c9583e',trim:'#2d3142'},
msgs:{lamp:'The fuse is in. The lamp hums','lens':'The lens points at the ship',beacon:'The lighthouse shines! Lanterns light the way down'},unlock:['beacon'],
build(B,r){
  const W=B.W,ROCK={col:'#6f6a5e',mat:'stone'},WHITE={col:'#f1ece0',mat:'plastic'},RED={col:'#c9583e',mat:'plastic'};
  const tg=Math.floor(r()*8);W.dials.lens={set:'lens',keys:['lens'],target:{lens:tg}};W.st.dial.lens=(tg+2+Math.floor(r()*5))%8;
  B.all(['lamp','lens'],'beacon');
  // the sea is molten: everything stands on rocks
  B.lava(-34,9,34,-88);
  // the causeway: rocks in the gusts, the fuse on a buoy
  B.blk(0,3,8,6,.6,Object.assign({name:'jetty'},ROCK));B.cp(0,0,3.4,{top:.6});
  const rock=(name,x,top,z,w)=>B.plat(x,top,z,w,w,Object.assign({name,t:top+1.2},ROCK));
  rock('r1',-1.5,1,-3.4,3);rock('r2',2,1.4,-8.2,2.8);rock('r3',-1,1.8,-12.8,2.6);
  B.plat(5.5,1.2,-15.6,2.4,2.4,{move:{type:'line',ax:3.6,per:4.4},mat:'barrel',col:'#e0453a',name:'buoy'});
  B.item('fuse','fuse',5.5,2.1,-15.6,{move:{type:'line',ax:3.6,per:4.4}});
  rock('r4',2,1.4,-17.6,2.6);rock('r5',-2,1.8,-22,2.6);rock('r6',1,1.2,-26.4,3);rock('r7',0,1,-30.6,2.6);
  B.wind(-16,7,16,-33,-2,10,[5.5,0],{timed:{per:3.6,on:.42,ph:0},name:'gust1'});
  B.sign(0,3.4,5.6,Math.PI,6,1.5,{title:'Gale Point',sub:'Watch for the gusts'},{deco:true});B.deco(0,1.9,5.7,.3,2.6,.3,{col:'#5b4636'});
  // the island: the keeper's hut (the log on its wall), the tower and the spiral of ledges round it
  B.blk(0,-46,20,24,1,Object.assign({name:'island'},ROCK));B.cp(1,0,-37.4,{top:1});
  B.blk(-7,-37.2,4,4,4,Object.assign({name:'hut'},WHITE));B.blk(-7,-37.2,4.4,4.4,4.5,Object.assign({},RED,{t:.5}));
  B.sign(-7,2.6,-35.15,0,3.4,2.8,{log:'lens'});
  B.cyl(0,16,-46,4,Object.assign({name:'tower',t:17},WHITE));
  for(const y of [4.5,9.5])B.dcyl(0,y,-46,4.05,1.4,RED);
  const R=7;for(let k=0;k<8;k++){const a=k*Math.PI/4;B.plat(Math.sin(a)*R,2.4+k*1.5,-46+Math.cos(a)*R,2.6,2.6,{yaw:a,col:'#9a948a',mat:'metal',name:'ledge'+k})}
  B.cyl(0,16,-46,5,{t:.6,col:'#4a4f60',mat:'metal',name:'gallery'});
  {const a=7*Math.PI/4;B.box(Math.sin(a)*5.55,14.95,-46+Math.cos(a)*5.55,1.2,4.1,.5,{yaw:a,truss:true,mat:'truss',col:'#e2e8f0',name:'galLadder'})}
  B.blk(-12,-46,2.2,2.2,9.6,Object.assign({name:'stack'},ROCK));B.item('gem','gem',-12,10.5,-46);
  B.wind(-16,-33,16,-53,2.6,24,[2,0],{name:'breeze'});
  B.wind(-16,-33,16,-53,2.6,24,[3.5,0],{timed:{per:4.4,on:.35,ph:.5},name:'gust2'});
  // the lamp room: the fuse box, the lens, the compass that shows where the lens points
  B.cyl(0,20,-46,2.4,{t:4,col:'#cfeeff',mat:'glass',name:'lantern'});B.dcyl(0,20.6,-46,2.8,1.2,RED);
  B.add({shape:'cyl',x:0,y:18,z:-46,r:1.4,h:2.6,deco:true,mat:'glass',col:'#fff3b0',onIf:'beacon',name:'lamp'});
  B.panel('fusebox',0,17.4,-43.5,0,{need:'fuse',then:'lamp'},{icon:'fuse',col:'#ffd23f',stand:[0,-42.4]});
  B.box(3.2,16.5,-49,.9,1,.9,{col:'#5b6475',mat:'metal'});
  B.btn('lensBtn',3.2,-49,{dial:'lens',key:'lens',n:8},{top:17.1,noBase:true,icon:'compass',col:'#ffd23f',stand:[2.4,-48.2]});
  B.sign(0,18,-48.43,Math.PI,2.6,2.6,{rose:true});B.sign(0,18,-48.5,Math.PI,2.6,2.6,{hand:'lens',dial:'lens',n:8});
  B.box(0,19,-71,1.2,1.2,46,{deco:true,mat:'glass',col:'#fff3b0',onIf:'beacon',name:'beam'});
  // the lanterns down to the cliff (lit by the beam) and the way out
  [[0,15,-55.4],[2.6,14,-59.6],[-.6,12.6,-63.8],[2,11.2,-68]].forEach(([x,top,z],i)=>B.plat(x,top,z,2.2,2.2,{onIf:'beacon',mat:'glass',col:'#ffe9a0',name:'lantern'+i}));
  B.wind(-12,-53,12,-70,9,20,[2,0],{name:'breeze2'});
  B.wind(-12,-53,12,-70,9,20,[3,0],{timed:{per:3.8,on:.4,ph:.2},name:'gust3'});
  B.blk(0,-76,12,12,10,Object.assign({name:'cliff'},ROCK));B.cp(2,0,-71.4,{top:10});
  B.finish(0,-79,{top:10});B.deco(0,12.6,-81.7,3.2,2.2,.3,{col:'#5b4636'});B.sign(0,13.2,-81.5,0,2.6,.8,{exit:true});
  // route
  const fuse=W.byName.get('fuse');
  B.w(0,.6,1.2);B.j(-1.5,1,-3.4,{wait:true});B.j(2,1.4,-8.2,{wait:true});B.j(-1,1.8,-12.8,{wait:true});
  B.jon('buoy',0,{wait:true});B.ladder('buoy',(t,W)=>W.st.got.fuse?'done':'wait'); // ride in the middle till the fuse is picked up
  B.j(2,1.4,-17.6,{wait:true});
  B.j(-2,1.8,-22,{wait:true});B.j(1,1.2,-26.4,{wait:true});B.j(0,1,-30.6,{wait:true});B.j(0,1,-34.6,{wait:true});B.w(0,1,-37.4);
  for(let k=0;k<8;k++)B.jon('ledge'+k,0,{wait:true});
  B.ladder('galLadder',(t,W,pl)=>pl.gr&&pl.y>15.5?'done':'climb');B.w(0,16,-42.4);B.use('fusebox',0,16,-42.4);
  B.w(3.4,16,-45);B.w(2.4,16,-48.2);B.dial('lensBtn','lens','lens',2.4,16,-48.2);
  B.jon('lantern0',0,{wait:true});B.jon('lantern1',0,{wait:true});B.jon('lantern2',0,{wait:true});B.jon('lantern3',0,{wait:true});
  B.j(0,10,-74.6,{wait:true});B.w(0,10,-79);
  W.spawn={x:0,y:.6,z:3.4,yaw:0};
}},
// 8. The finale: a museum after closing time, where every exhibit from this world wakes up. The vault door in the
// Grand Hall needs all three of: the great clock set to the time on the pocket watch (the watch is in the Ice Age
// wing), the ice block slid onto its star in the Ice Age wing, and the moonbeam steered onto the crystal in the Hall of
// Mirrors. The two halves of the vault's code are on the wings' walls. Past the door: a beam under swinging blades,
// ice floes and the keypad.
{id:'museum',name:'After Hours',sub:'The museum at night',par:150,sky:['#2f3a6b','#f2b880'],pal:{floor:'#e6dfd0',wall:'#8fa3b8',prop:'#c9a24a',trim:'#2d3142'},
msgs:{clock:'The great clock chimes. One of three',iceblk:'The block slid onto the star. One of three',moon:'The crystal lights up. One of three',
  vault:'All three exhibits are awake. The vault door opens!',final:'Code accepted. The way out is open'},unlock:['vault','final'],
build(B,r){
  const W=B.W,MARBLE={col:'#efe9dc',mat:'floor'},STONE={col:'#9aa3b5',mat:'stone'},ICE={ice:true,mat:'ice',col:'#cfeeff'},BRASS={col:'#c9a24a',mat:'metal'},BONE={col:'#efe3c8',mat:'plastic'};
  W.codes.vault=makeCode(r);W.pads.vault={set:'final'};
  const th=1+Math.floor(r()*11),tm=Math.floor(r()*4);
  W.dials.clock={set:'clock',keys:['h','m'],target:{h:th,m:tm}};W.st.dial.h=(th+3+Math.floor(r()*6))%12;W.st.dial.m=(tm+1+Math.floor(r()*3))%4;
  B.all(['clock','iceblk','moon'],'vault');
  // the Grand Hall: a moat of lava, bones to cross it, the clock's two buttons on the side islands, three doors
  B.floor(-14,6.5,14,-30,MARBLE);B.wallX(7,-14.5,14.5);
  B.wallZ(-14,7,-30,[{c:-24,w:DW,h:DH}]);B.wallZ(14,7,-30,[{c:-24,w:DW,h:DH}]);
  B.wallX(-30,-14.5,14.5,[{c:0,w:DW,h:DH}]);
  B.cp(0,0,3.6);
  B.lava(-14,-6,14,-19);
  B.plat(0,1,-8.4,2.4,2,Object.assign({name:'bone1'},BONE));
  B.plat(0,1.6,-12.5,4,4,Object.assign({name:'rex'},STONE));
  B.kill(0,2.05,-12.5,4.4,.4,.4,{move:{type:'spin',w:1.3},name:'tail'});B.cyl(0,2.5,-12.5,.4,{t:.9,col:'#efe3c8',name:'tailhub'});
  B.plat(0,1,-16.6,2.4,2,{crumble:true,mat:'crumble',col:'#efe3c8',name:'bone2'});
  for(const s of [-1,1]){B.plat(s*8,.8,-12.5,5,5,Object.assign({name:s<0?'isleW':'isleE'},STONE))}
  B.btn('hourBtn',-8,-13.4,{dial:'clock',key:'h',n:12},{top:1.9,icon:'hour',col:'#ffd23f',stand:[-8,-11.4]});
  B.btn('minBtn',8,-13.4,{dial:'clock',key:'m',n:4},{top:1.9,icon:'minute',col:'#7dd3fc',stand:[8,-11.4]});
  B.sign(0,7.6,-29.45,0,4.4,4.4,{clockface:'clock'});
  B.sign(0,7.6,-29.36,0,4.4,4.4,{hand:'h',dial:'clock'},{deco:true});B.sign(0,7.6,-29.3,0,4.4,4.4,{hand:'m',dial:'clock'});
  B.door('x',-30,0,'vault',{col:'#8a6a4a',part:{mat:'vaultdoor'}});
  B.sign(-8.6,6.6,-29.45,0,6.4,1.5,{title:'The vault',sub:'Wake all three exhibits'});
  B.sign(0,6.8,6.45,Math.PI,8,1.6,{title:'After Hours',sub:'Ice Age west · Mirrors east'});
  B.cp(1,0,-24.4);
  B.blk(8.8,-28.4,2,2,1.8,{col:'#8a6a4a',mat:'wood'});B.blk(12,-28.4,2.2,2.2,3.8,{col:'#8a6a4a',mat:'wood',name:'case'});B.item('gem','gem',12,4.7,-28.4);
  // a skeleton on the middle island, columns round the hall
  B.deco(0,4.6,-12.5,1.2,.8,3.4,BONE);B.deco(0,5.4,-14.6,1,1.2,1.4,BONE);for(const z of [-11.4,-12.4,-13.4])B.deco(0,3.9,z,1.8,.25,.25,BONE);
  for(const x of [-12.6,12.6])for(const z of [2,-4])B.blk(x,z,1.4,1.4,WH-1,{col:'#e2dccb',mat:'stone'});
  // the Ice Age wing (west): a floe on the lava, then an ice floor where the block slides until it hits something
  B.floor(-46,-14,-14,-34,{col:'#9aa3b5',mat:'stone'});B.wallX(-14,-46.5,-13.5);B.wallX(-34,-46.5,-13.5);B.wallZ(-46,-14,-34);B.wallZ(-14,-30,-34);
  B.lava(-24,-14,-18,-34);
  B.plat(-21,.6,-22,2.6,2.6,Object.assign({name:'floe',move:{type:'line',az:-4,per:4.4}},ICE));
  B.floor(-46,-14,-24,-34,{col:'#e3f4ff',mat:'ice',ice:true});
  B.blk(-44,-24,2,2,2,Object.assign({name:'rockW'},STONE));B.blk(-42.1,-18.2,2,2,2,Object.assign({name:'rockS'},STONE));
  B.blk(-34,-31.6,2.2,2.2,1.2,STONE);B.blk(-30,-16.4,2,2,1.4,STONE);
  B.add({x:-42.1,y:.03,z:-20.1,w:2.4,h:.06,d:2.4,solid:false,plate:'iceblk',mat:'plate',col:'#ffd23f',name:'star',cam:false});
  B.add({x:-30,y:.9,z:-24,w:1.8,h:1.8,d:1.8,push:true,slide:true,mat:'iceblock',col:'#9fdcff',name:'block',lim:[-45.1,-33.1,-25,-14.9]});
  B.sign(-45.45,5.6,-27,Math.PI/2,3.6,3.6,{watch:'clock'});B.sign(-45.45,8.4,-27,Math.PI/2,5,1,{title:'The great clock',sub:'stopped at this time'});
  B.sign(-31,4.8,-33.45,0,4.6,2.6,{code:'vault',half:0});
  B.sign(-35,7.4,-14.55,Math.PI,7,1.6,{title:'Ice Age',sub:'Slide the block onto the star'});
  // the Hall of Mirrors (east): islands on the lava, a case on rails, a ghost, three mirrors and the crystal
  B.floor(14,-14,46,-34,MARBLE);B.wallX(-14,13.5,46.5);B.wallX(-34,13.5,46.5);B.wallZ(46,-14,-34);B.wallZ(14,-30,-34);
  B.lava(18,-14,46,-34);
  B.plat(20.5,.6,-24,2.6,2.6,{move:{type:'line',ax:9,per:5},mat:'glass',col:'#dfe7ff',name:'cart'});
  const isle=(name,x,z,w)=>B.plat(x,.6,z,w,w,Object.assign({name,t:1.6},STONE));
  isle('i1',34,-20,3.4);isle('i2',34,-30,3.4);isle('i3',24,-30,3.4);isle('mid',34,-25,2);isle('i4',24,-20,2.4);
  B.plat(29,.6,-30,2.2,2.2,{timed:{per:2.8,on:.6,ph:0},mat:'blink',col:'#c4b5fd',name:'blink'});
  B.add({shape:'cyl',x:34+2.4,y:1.6,z:-25,r:.55,h:1.4,kill:true,solid:false,mat:'ghost',col:'#ff3355',cam:false,name:'ghost',move:{type:'orbit',cx:34,cz:-25,rad:2.4,w:1.4,a0:0}});
  const MIR=[['m1',34,-20],['m2',34,-30],['m3',24,-30]],ANS={m1:0,m2:0,m3:1};
  W.beams.moon={x:45.4,z:-20,dir:[-1,0],y:1.8,set:'moon',mirrors:MIR.map(m=>m[0]),target:{x:24,z:-20,name:'crystal'},stops:[[45.5,-35,47,-13],[12,-35,13.5,-13],[12,-15,47,-13],[12,-35,47,-33.5]]};
  for(const [n,x,z] of MIR){B.cyl(x,1.1,z,.45,{col:'#3b3355',mat:'metal'});B.add({x,y:1.85,z,w:1.7,h:1.5,d:.16,solid:false,btn:{mirror:'moon'},name:n,mat:'mirror',col:'#dfe7ff',icon:'mirror',cam:false,stand:[x,z+1.1]})}
  do{for(const [n] of MIR)W.st.mir[n]=r()<.5?1:0}while(MIR.every(([n])=>W.st.mir[n]===ANS[n]));
  B.blk(24,-20,1.2,1.2,1.2,STONE);B.add({x:24,y:1.9,z:-20,w:.7,h:1.2,d:.7,deco:true,mat:'crystal',col:'#bfe9ff',name:'crystal'});
  B.deco(45.45,1.8,-20,.12,1.6,1.6,{col:'#fff7c2',mat:'glass'});
  B.sign(30,4.8,-33.45,0,4.6,2.6,{code:'vault',half:1});
  B.sign(30,7.4,-14.55,Math.PI,7,1.6,{title:'Hall of Mirrors',sub:'Light the crystal'});
  // the vault: a beam under swinging blades, ice floes, the keypad
  B.floor(-10,-30,10,-82,MARBLE);B.wallZ(-10,-30,-82);B.wallZ(10,-30,-82);B.wallX(-82,-10.5,10.5,[{c:4,w:DW,h:DH}]);
  B.cp(2,0,-31.8);
  B.lava(-10,-33.6,10,-76);
  B.plat(0,.8,-41,1.4,14,{col:'#c9a24a',mat:'metal',name:'beam',t:.4});
  [[-37.4,0],[-43.8,.45]].forEach(([z,ph],i)=>{B.kill(0,2.2,z,2.4,1,.5,{move:{type:'swing',dx:1,len:7.6,amp:.42,per:2.6,ph},name:'blade'+i});B.deco(0,9.85,z,20,.4,.4,BRASS)});
  B.plat(0,.6,-51.4,3,3,Object.assign({name:'f1'},ICE));
  B.plat(-4,.6,-56,2.6,2.6,Object.assign({name:'f2',move:{type:'line',ax:8,per:5}},ICE));
  B.plat(3,.6,-61,3,3,Object.assign({name:'f3'},ICE));
  B.plat(-1,.9,-66,2.4,2.4,Object.assign({name:'f4'},STONE));
  B.blk(0,-73,14,6,1.2,{col:'#8a6a4a',mat:'wood',name:'dais'});
  B.cp(3,4,-74,{top:1.2});
  B.panel('pad',-4,1.6,-81.35,0,{pad:'vault'},{icon:'pad'});
  B.door('x',-82,4,'final',{col:'#5a4636',part:{mat:'vaultdoor'}});
  B.sign(-3,6.4,-81.45,0,7,1.6,{title:'The way out',sub:'Two halves of the code'});
  exitHall(B,4,-82);
  for(const z of [-40,-60])for(const s of [-1,1])B.win(s*9.5,z,-s*Math.PI/2,{y:6.6,glass:'#ffd9a0',frame:'#2d3142'});
  // route: the Ice Age wing, the Hall of Mirrors, the clock, then the vault
  const block=W.byName.get('block');
  B.w(0,0,-4.8);B.j(0,1,-8.4,{wait:true});B.j(1.2,1.6,-11.3,{wait:true});B.j(0,1,-16.6,{wait:true});B.j(0,0,-21,{wait:true});B.w(0,0,-24.4);
  B.w(-12,0,-24);B.w(-16.6,0,-24);B.jon('floe',0,{wait:true});B.j(-26,0,-24,{wait:true});
  B.w(-27,0,-24);B.kick('block',[-1,0]);B.u(()=>!block.sv);
  B.w(-30,0,-27.4);B.w(-42.1,0,-27.4);B.kick('block',[0,1]);B.u((t,W)=>flagOn(W,'iceblk',t));
  B.w(-34,0,-27.4);B.w(-26,0,-24);B.jon('floe',0,{wait:true});B.j(-16.4,0,-24,{wait:true});B.w(-12,0,-24);
  B.w(12,0,-24);B.w(16.4,0,-24);B.jon('cart',0,{wait:true});B.jon('mid',0,{wait:true});B.j(34,.6,-18.9,{wait:true});
  if(W.st.mir.m1!==ANS.m1)B.use('m1',34,.6,-18.9);
  B.jon('mid',0,{wait:true});B.j(34,.6,-28.9,{wait:true});if(W.st.mir.m2!==ANS.m2)B.use('m2',34,.6,-28.9);
  B.jon('blink',0,{wait:true});B.j(24,.6,-28.9,{wait:true});if(W.st.mir.m3!==ANS.m3)B.use('m3',24,.6,-28.9);
  B.u((t,W)=>flagOn(W,'moon',t));B.jon('cart',0,{wait:true});B.j(16.2,0,-24,{wait:true});B.w(12,0,-24);
  B.w(5,0,-21);B.j(8,.8,-11.4,{wait:true});B.dial('minBtn','clock','m',8,.8,-11.4);
  B.j(1.2,1.6,-13.7,{wait:true});B.j(-8,.8,-11.4,{wait:true});B.dial('hourBtn','clock','h',-8,.8,-11.4);
  B.j(-6,0,-21,{wait:true});B.u((t,W)=>flagOn(W,'vault',t));B.w(0,0,-28);B.w(0,0,-31.8);
  B.j(0,.8,-35,{wait:true});B.w(0,.8,-47.4);B.j(0,.6,-51.4,{wait:true});B.jon('f2',0,{wait:true});B.j(3,.6,-61,{wait:true,stay:true});B.j(-1,.9,-66,{wait:true});B.j(-2,1.2,-71.6,{wait:true});
  B.w(-4,1.2,-75.4);B.w(-4,0,-80.2);B.use('pad',-4,0,-80.2);B.code('vault');B.w(4,0,-83.6);B.w(4,0,-85.2);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}}
]});
})(Escapade);
