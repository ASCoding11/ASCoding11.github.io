// World 4: Full Power. Factories, power stations and labs, where the machines are the puzzle. See README.md in this
// folder for how a world file works. New in this world (helpers in the page's CORE, "World 4 core additions"): belts
// and fans that a lever turns round (B.belt, B.rev), pressure plates you stand on yourself (B.hold), presses and
// piston walls that crush (B.press, B.crusher) and coloured keycards with their doors (B.cardDoor).
(function(E){
'use strict';
const {DW,DH,WH,cur,flagOn,makeCode,shuffle,exitHall}=E;
const RED='#e0453a',GREEN='#2fa35a',YELLOW='#e8b923',BLUE='#3b82f6';
E.world({n:4,needs:3,levels:[
// 1. A toy factory. Two belts cross a lava trench, always running opposite ways: one goes to the island with the red
// keycard, the other to the red door. A lever (one at the start, one on each far side) turns both round. Then the
// stamping line: a slow belt under three presses, and a keypad whose code is split between the two rooms.
{id:'beltway',name:'Assembly Line',sub:'The toy factory',par:100,sky:['#8ec5ff','#fff1d6'],pal:{floor:'#d8d2c4',wall:'#f2b134',prop:'#3d7ab8',trim:'#26303d'},
msgs:{door_cardR:'The red door slides open','belts:on':'Clunk! The belts turn round','belts:off':'Clunk! The belts turn round','beltA:on':'The blue belts turn round','beltA:off':'The blue belts turn round','beltB:on':'The green belt turns round','beltB:off':'The green belt turns round',line:'Code accepted. The way out is open'},unlock:['line'],
build(B,r){
  const W=B.W;
  W.codes.line=makeCode(r);W.pads.line={set:'line'};
  const lever=(name,x,z,stand)=>B.btn(name,x,z,{toggle:'belts'},{top:1.2,icon:'lever',col:'#ffd23f',stand});
  // the loading bay: a lava trench, two belts across it, a wall splitting the far side in two
  B.floor(-12,6.5,12,-30);B.wallZ(-12,7,-30);B.wallZ(12,7,-30);B.wallX(7,-12.5,12.5);
  B.wallX(-30,-12.5,12.5,[{c:-8,w:DW,h:DH}]);
  B.cp(0,0,3.4);
  B.lava(-12,-5,12,-21);
  B.belt(-10,-4,-6,-22,[0,12.5],{rev:'belts',name:'beltW'});
  B.belt(6,-4,10,-22,[0,-12.5],{rev:'belts',name:'beltE'});
  B.wallZ(0,-16,-30);
  lever('lever1',-3,1.4,[-3,2.6]);lever('lever2',3,-27,[3,-25.8]);lever('lever3',-3,-27,[-3,-25.8]);
  // the island: the red keycard on a shelf, the first half of the code on a crate
  B.blk(10.4,-28.4,2.2,2.2,1,{col:'#5b6b7d',mat:'metal',name:'shelf'});B.item('cardR','cardR',10.4,1.6,-26.7);
  B.blk(3.4,-23.6,2,2,2,{col:'#c08a52',mat:'wood',name:'crate1'});B.sign(3.4,1,-22.55,0,1.8,1.8,{code:'line',half:0,label:'Box 1 of 2'});
  B.cardDoor('x',-30,-8,'cardR');
  B.plat(2.5,1.2,-12,3,3,{col:'#9aa7b8',mat:'metal',name:'gemIsle'});B.item('gem','gem',2.5,2.1,-12);
  B.sign(0,7.6,6.45,Math.PI,8,1.6,{title:'Assembly Line',sub:'Every belt goes one way at a time'});
  // toys on the shelves along the walls
  for(const [x,z] of [[-11,-1],[11,-1],[-11,-12],[11,-12]]){B.blk(x,z,1.6,5,2.4,{col:'#7a8899',mat:'metal'});for(let k=0;k<3;k++)B.deco(x,2.85,z-1.6+k*1.6,.9,.9,.9,{col:['#ef476f','#06d6a0','#118ab2'][k],mat:'plastic'})}
  // the stamping line: a slow belt under three presses, lava either side
  B.floor(-12,-30,12,-62,{col:'#cfc8b8'});B.wallZ(-12,-30,-62);B.wallZ(12,-30,-62);
  B.wallX(-62,-12.5,12.5,[{c:6,w:DW,h:DH}]);
  B.cp(1,-8,-32.2);
  B.lava(-12,-34,12,-54);
  B.belt(-10,-33.5,-6,-54.5,[0,-2],{name:'line'});
  [[-38,0],[-44.6,.3],[-51.2,.6]].forEach(([z,ph],i)=>{B.press('press'+i,-8,z,4.2,3,{up:4.6,h:4,drop:4.45,per:2.6,ph,base:.25});
    B.deco(-8,9.6,z,4.6,.8,3.4,{col:'#4b5563',mat:'metal'})});
  B.blk(10.5,-46,3,14,3,{col:'#7a8899',mat:'metal'});
  B.sign(8.95,4.4,-44,-Math.PI/2,3,2.4,{code:'line',half:1,label:'Box 2 of 2'});
  B.cp(2,-8,-56.4);
  for(const z of [-40,-50])B.win(-11.5,z,Math.PI/2,{y:6.8,glass:'#ffe6a8',frame:'#26303d'});
  // the paint shop: three belts between two islands; the blue lever turns the first and last belts, the green one
  // the middle belt. A wall stops anyone flying off the first belt straight to the far side.
  B.floor(-12,-62,12,-92,{col:'#d8d2c4'});B.wallZ(-12,-62,-92);B.wallZ(12,-62,-92);
  B.wallX(-92,-12.5,12.5,[{c:8,w:DW,h:DH}]);
  B.lava(-12,-65,12,-87);
  B.cp(3,6,-63.5,{d:2.6});
  const ISLE={col:'#7a8899',mat:'metal'};
  B.blk(-8,-76,6,6,.25,Object.assign({name:'isleA'},ISLE));B.blk(8,-76,6,6,.25,Object.assign({name:'isleB'},ISLE));
  B.belt(-9.6,-64.5,-6.4,-73.5,[0,-12.5],{rev:'beltA',name:'belt1'});
  B.belt(-5.5,-74.4,5.5,-77.6,[-12.5,0],{rev:'beltB',name:'belt2'});
  B.belt(6.4,-78.5,9.6,-87.5,[0,12.5],{rev:'beltA',name:'belt3'});
  B.wallX(-83,-12.5,4);
  const rail=(x0,z0,x1,z1,col)=>B.deco((x0+x1)/2,.3,(z0+z1)/2,Math.abs(x1-x0)||.25,.25,Math.abs(z1-z0)||.25,{col,mat:'plastic'});
  for(const x of [-9.75,-6.25])rail(x,-65,x,-73,BLUE);for(const x of [6.25,9.75])rail(x,-79,x,-87,BLUE);for(const z of [-74.25,-77.75])rail(-5,z,5,z,GREEN);
  const lv=(name,flag,col,x,z,stand,top)=>B.btn(name,x,z,{toggle:flag},{top:(top||0)+1.2,icon:'lever',col,stand});
  lv('leverA1','beltA',BLUE,-2,-63,[-2,-64.2]);lv('leverB1','beltB',GREEN,-10,-78,[-8.8,-78],.25);
  lv('leverA2','beltA',BLUE,10.2,-78,[9,-77.6],.25);lv('leverB2','beltB',GREEN,10.2,-74,[9,-74],.25);
  B.panel('pad',2,1.6,-91.35,0,{pad:'line'},{icon:'pad'});
  B.door('x',-92,8,'line',{col:'#26303d'});
  exitHall(B,8,-92);
  // route: the east belt to the island, flip, ride back, the west belt to the red door, the presses, the paint shop
  B.w(8,.25,-2.5);B.w(8,.25,-23.4);B.w(10.4,0,-25.8);
  B.use('lever2',3,0,-25.8);
  B.w(8,0,-23.8);B.w(8,.25,-3);B.w(-8,.25,-2.6);B.w(-8,.25,-23.6);B.w(-8,0,-28.4);B.w(-8,0,-32.2);
  B.w(-8,.25,-34.6);B.w(-8,.25,-55);B.w(-8,0,-56.6);B.w(6,0,-58);B.w(6,0,-63.5);
  B.w(-8,0,-63.8);B.w(-8,.25,-75);B.use('leverB1',-8.8,.25,-78);B.w(-5,.25,-76);B.w(7,.25,-76);
  B.use('leverA2',9,.25,-77.6);B.w(8,.25,-80);B.w(8,0,-88.6);
  B.use('pad',2,0,-90.2);B.code('line');B.w(8,0,-93.6);B.w(8,0,-95.4);
  W.spawn={x:0,y:0,z:3.4,yaw:0};
}},
// 2. A recycling plant. A shutter only stays up while something holds its pressure plate down, and the plate is too
// far from the shutter to run: push the bale onto it (the plate by the other door only opens a cupboard). Then a
// corridor of piston walls, a window out onto a sorting belt that carries you toward a press (the green keycard is on
// the ledge beside it), and the baler: its door needs both of its plates held down at once.
{id:'sorter',name:'Sorting Day',sub:'The recycling plant',par:120,sky:['#a8d8b9','#f4f9e8'],pal:{floor:'#c9d6c3',wall:'#6aa57a',prop:'#8d6e4f',trim:'#24382b'},
msgs:{shutA:'The shutter rolls up',hatch:'The cupboard hatch lifts',door_cardG:'The green door slides open',baler:'Both plates down! The baler door opens'},unlock:['baler'],
build(B,r){
  const W=B.W,BALE={push:true,mat:'crate',col:'#b5894f'},BIN={col:'#4f7cac',mat:'metal'};
  // the tipping floor: two plates, a bale, the shutter (east) and the cupboard hatch (west)
  B.floor(-12,6.5,12,-28);B.wallZ(-12,7,-34);B.wallZ(12,7,-60);B.wallX(7,-12.5,12.5);
  B.wallX(-28,-12.5,12.5,[{c:-8,w:DW,h:DH},{c:8,w:DW,h:DH}]);
  B.cp(0,0,3.4);
  B.hold('plate1',-9,-6,'shutA',{linger:2.5});B.hold('plate2',-5,-24,'hatch',{linger:3});
  B.add(Object.assign({x:4,y:.9,z:-14,w:1.8,h:1.8,d:1.8,name:'bale',lim:[-10.6,-26.6,10.6,4.6]},BALE));
  B.door('x',-28,8,'shutA',{col:'#5b6b7d',part:{mat:'gate'}});B.door('x',-28,-8,'hatch',{col:'#8d6e4f'});
  for(const [x,z] of [[-3,-9],[0,-22],[10,-6],[9,2]])B.blk(x,z,2.4,2.4,2.2,BIN);
  B.blk(-3.5,-1.5,7,1.4,1.2,{col:'#8d6e4f',mat:'wood'});
  B.sign(0,7.4,6.45,Math.PI,8,1.6,{title:'Sorting Day',sub:'Plates only work while something is on them'});
  // the cupboard behind the hatch (the gem)
  B.floor(-12,-28,-4,-34);B.wallX(-34,-12.5,-3.5);B.wallZ(-4,-28,-34);
  B.item('gem','gem',-8,1,-31.4);
  // the sorting hall: the piston corridor (east), a window onto the sorting belt (west) and its press
  B.floor(6,-28,12,-60,{col:'#b9c7b2'});B.wallZ(5.5,-34,-60,[{c:-43,w:2.6,h:3.2}]);B.wallX(-60,-12.5,12.5,[{c:8.5,w:DW,h:DH}]);
  B.wallX(-34,-4.5,5.5);B.floor(-12,-34,5.5,-60,{col:'#9fb09a'});B.lava(-12,-34,5,-60);
  B.cp(1,8.6,-30.8);
  [[-37,0],[-48.5,.36],[-54.5,.7]].forEach(([z,ph],i)=>{B.crusher('piston'+i,14.1,2.1,z,4.6,4.2,2.4,{type:'line',ax:-6,per:3.2,ph});B.deco(12.6,4.6,z,1.2,.4,2.8,{col:'#24382b',mat:'metal'})});
  B.belt(-11,-41.4,5.2,-44.6,[-3,0],{name:'sortBelt'});
  B.press('press',-9,-43,3.4,3.6,{up:4.4,h:5,drop:4.2,per:2.4,base:.25});
  B.plat(-4.4,.9,-38.8,2.6,2.4,{col:'#7a8899',mat:'metal',name:'ledge'});B.item('cardG','cardG',-4.4,1.8,-38.8);
  B.cardDoor('x',-60,8.5,'cardG');
  // the baler: push the second bale onto the far plate, then stand on the near one
  B.floor(-12,-60,12,-84);B.wallZ(-12,-60,-84);B.wallZ(12,-60,-84);
  B.wallX(-84,-12.5,12.5,[{c:8,w:DW,h:DH}]);
  B.cp(2,8.5,-62.6);
  B.lava(-6,-67.6,-2,-72.4);B.lava(4,-71,12,-75);
  B.hold('plate3',-8,-78,'pc1',{linger:1});B.hold('plate4',8,-80,'pc2',{linger:1,col:'#f97316'});
  B.add(Object.assign({x:0,y:.9,z:-70,w:1.8,h:1.8,d:1.8,name:'bale2',lim:[-10.6,-82.6,10.6,-61.6]},BALE));
  B.all(['pc1','pc2'],'baler');B.door('x',-84,8,'baler',{col:'#24382b',part:{mat:'vaultdoor'}});
  B.blk(-9,-65,3,3,2.4,BIN);B.blk(10,-64,2.4,2.4,1.6,BIN);
  exitHall(B,8,-84);
  for(const z of [-40,-52])B.win(11.5,z,-Math.PI/2,{y:7.4,glass:'#e8ffd6',frame:'#24382b'});
  // route
  B.w(6.4,0,-14);B.push('bale','x',-9);B.w(-6.6,0,-15.4);B.w(-6.6,0,-16.6);B.w(-9,0,-16.6);B.push('bale','z',-6);
  B.w(5,0,-20);B.w(8,0,-26);B.w(8.6,0,-30.8);
  B.w(6.6,0,-40);B.w(6.6,0,-43);B.w(4.2,.25,-43);B.w(-3.4,.25,-42);B.j(-4.4,.9,-38.8,{wait:true});B.w(-4.4,.9,-38.8);
  B.j(-1,.25,-42.6,{wait:true});B.w(4.2,.25,-43);B.w(6.6,0,-43);B.w(6.6,0,-46);B.w(6.6,0,-58);B.w(8.5,0,-58.4);B.w(8.5,0,-62.6);
  B.w(0,0,-67.6);B.push('bale2','z',-78);B.w(1.8,0,-76);B.w(1.8,0,-78);B.push('bale2','x',-8);
  B.w(8,0,-80);B.u((t,W)=>flagOn(W,'baler',t));B.w(8,0,-85.6);B.w(8,0,-87.4);
  W.spawn={x:0,y:0,z:3.4,yaw:0};
}},
// 3. A power station. Turbines turn over the lava in a fan's wind; the fuse is on an island you can only jump to with
// the wind behind you, and a lever on each side turns the fan round. The fuse powers the door to the piston corridor;
// the control room's way out is up on a balcony, reached by steps that only come out while their plate is held (and a
// few seconds after). The exit code is four digits on four slips around the level; the big board is the locker's code.
{id:'turbine',name:'Spin Cycle',sub:'The power station',par:130,sky:['#7aa6d6','#e9f1fa'],pal:{floor:'#cdd3db',wall:'#5d7fa3',prop:'#e07a3f',trim:'#1e2a38'},
msgs:{power:'The fuse is in. The door hums open','fan:on':'The fan turns round: the wind blows east','fan:off':'The fan turns round: the wind blows west',steps:'Steps slide out of the wall',locker:'The locker opens',ctrl:'Code accepted. The way out is open'},unlock:['power','ctrl'],
build(B,r){
  const W=B.W,STEEL={col:'#8f9bab',mat:'metal'},TURB={col:'#d7dde5',mat:'gear'};
  W.codes.ctrl=makeCode(r);W.pads.ctrl={set:'ctrl'};
  do{W.codes.locker=makeCode(r)}while(W.codes.locker===W.codes.ctrl);W.pads.locker={set:'locker'};
  const slip=(k,x,y,z,yaw,o)=>B.sign(x,y,z,yaw,1.8,1.8,Object.assign({w4:'slip',key:'ctrl',k,label:'Exit code'},o||{}));
  const fanLever=(name,x,z,top,stand)=>B.btn(name,x,z,{toggle:'fan'},{top:top+1.2,icon:'lever',col:'#7dd3fc',stand});
  // the turbine hall: three turbines in the fan's wind; the fuse island to the east
  B.floor(-12,6.5,12,-34);B.wallZ(-12,7,-34);B.wallZ(12,7,-34);B.wallX(7,-12.5,12.5);
  B.wallX(-34,-12.5,12.5,[{c:0,w:DW,h:DH}]);
  B.cp(0,0,3.4);
  B.lava(-12,-3,12,-30);
  const turb=(name,x,z,top,w)=>{B.cyl(x,top,z,2.4,Object.assign({move:{type:'spin',w},name},TURB));B.dcyl(x,top+.06,z,.6,.14,{col:'#1e2a38',mat:'metal'})};
  turb('T1',-4,-7.4,1,.7);turb('T2',-6,-14.6,1.4,-.8);turb('T3',-3,-21.8,1,.75);
  B.plat(-3,.8,-27.2,2.4,2.4,Object.assign({name:'pad'},STEEL));
  B.plat(0,1.6,-14.6,2.4,2.4,Object.assign({name:'post',t:2.6},STEEL));
  B.blk(7.6,-14.6,4,5,1,Object.assign({name:'isle'},STEEL));
  B.item('fuse','fuse',8.6,1.9,-16);slip(0,6.6,1.03,-16,0,{flat:true});
  fanLever('fanL1',3,1,0,[3,2.2]);fanLever('fanL2',8.8,-12.8,1,[7.4,-12.8]);
  const fan=B.wind(-12,-2.4,12,-30,-2,10,[-4.5,0],{name:'fanwind'});B.rev(fan,'fan');
  for(const s of [-1,1]){B.dcyl(s*11.4,4.2,-15,2.6,.5,{col:'#1e2a38',mat:'metal'});B.deco(s*11.6,4.2,-15,.3,5.6,.6,{col:'#e07a3f',mat:'plastic'});B.deco(s*11.6,4.2,-15,.3,.6,5.6,{col:'#e07a3f',mat:'plastic'})}
  B.cp(1,1,-31.8,{d:2.6});
  B.panel('fusebox',4,1.6,-33.35,0,{need:'fuse',then:'power'},{icon:'fuse',col:'#ffd23f',stand:[4,-32.2]});
  B.door('x',-34,0,'power',{col:'#1e2a38'});
  slip(3,-8,5.4,-33.45,0);
  B.sign(0,7.6,6.45,Math.PI,8,1.6,{title:'Spin Cycle',sub:'Mind the wind'});
  // the piston corridor
  B.floor(-3,-34,3,-58,{col:'#bfc6cf'});B.wallZ(-3,-34,-58);B.wallZ(3,-34,-58);
  [[-39,-1,0],[-45,1,.33],[-51,-1,.66]].forEach(([z,s,ph],i)=>B.crusher('piston'+i,s*5.6,2.2,z,5,4.4,2.2,{type:'line',ax:-s*5,per:2.8,ph}));
  slip(1,-2.45,3.4,-48,Math.PI/2);
  // the control room: the steps' plate, the balcony and the way out at the top, the locker
  B.floor(-12,-58,12,-82);B.wallZ(-12,-58,-82);B.wallZ(12,-58,-82);B.wallX(-58,-12.5,-3);B.wallX(-58,3,12.5);
  B.wallX(-82,-12.5,12.5,[{c:-8,w:DW,h:4.8+DH}]);
  B.cp(2,0,-60.4);
  B.hold('stepPlate',9,-62,'steps',{linger:5});
  B.plat(1.6,1.6,-70.6,2.4,2.4,Object.assign({name:'s1',onIf:'steps'},STEEL));B.plat(-.6,3.2,-73.4,2.4,2.4,Object.assign({name:'s2',onIf:'steps'},STEEL));
  B.blk(-8,-79,8,6,4.8,{col:'#5d7fa3',mat:'metal',name:'balcony'});
  slip(2,11.45,4.4,-66,-Math.PI/2);
  B.panel('pad',-5.4,6.4,-81.35,0,{pad:'ctrl'},{icon:'pad',stand:[-5.4,-80.2]});
  B.door('x',-82,-8,'ctrl',{col:'#1e2a38',part:{y:4.8+DH/2}});
  B.blk(-8,-85.2,6,6.4,4.8,{col:'#e8fff1',mat:'floor'});B.wallZ(-11,-82,-88.4);B.wallZ(-5,-82,-88.4);B.wallX(-88.4,-11.5,-4.5);
  B.finish(-8,-85.4,{top:4.8});B.sign(-8,4.8+DH+.75,-81.47,0,2.6,.8,{exit:true});
  // the locker (its code is the big board) with the gem
  B.wallX(-76,5.5,12.5,[{c:9,w:DW,h:DH}]);B.wallZ(6,-76,-82);B.door('x',-76,9,'locker',{col:'#e07a3f'});
  B.panel('lockpad',6.8,1.6,-75.35,0,{pad:'locker'},{icon:'pad',stand:[6.8,-74.2]});
  B.sign(11.45,4.6,-71,-Math.PI/2,4.4,2.4,{code:'locker',label:'Shift locker'});B.item('gem','gem',9,1,-79.4);
  for(const [x,z] of [[-9,-62],[-9,-67]])B.blk(x,z,3,2.4,1.2,{col:'#3b4a5c',mat:'metal'});
  // route
  B.use('fanL1',3,0,2.2);
  B.w(-3,0,-2.2);B.jon('T1',0,{wait:true});B.jon('T2',0,{wait:true});B.j(0,1.6,-14.6,{wait:true});B.j(7,1,-14.6,{wait:true});B.w(8.4,1,-15.6);
  B.use('fanL2',7.4,1,-12.8);B.j(0,1.6,-14.6,{wait:true});B.jon('T2',0,{wait:true});B.jon('T3',0,{wait:true});B.j(-3,.8,-27.2,{wait:true});B.j(-3,0,-30.8,{wait:true});
  B.use('fusebox',4,0,-32.2);B.w(0,0,-35);B.w(0,0,-57);B.w(0,0,-60.4);
  B.w(9,0,-62);B.w(2.4,0,-68.4);B.j(1.6,1.6,-70.6,{wait:true});B.j(-.6,3.2,-73.4,{wait:true});B.j(-5,4.8,-77,{wait:true});
  B.use('pad',-5.4,4.8,-80.2);B.code('ctrl');B.w(-8,4.8,-80);B.w(-8,4.8,-85.4);
  W.spawn={x:0,y:0,z:3.4,yaw:0};
}}
]});
})(Escapade);
