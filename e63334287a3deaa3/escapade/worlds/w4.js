// World 4: Full Power. Factories, power stations and labs, where the machines are the puzzle. See README.md in this
// folder for how a world file works. New in this world (helpers in the page's CORE, "World 4 core additions"): belts
// and fans that a lever turns round (B.belt, B.rev), pressure plates you stand on yourself (B.hold), presses and
// piston walls that crush (B.press, B.crusher) and coloured keycards with their doors (B.cardDoor).
(function(E){
'use strict';
const {DW,DH,WH,cur,flagOn,makeCode,shuffle,exitHall,COMPASS}=E;
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
  B.panel('pad',-5.4,5.4,-81.35,0,{pad:'ctrl'},{icon:'pad',stand:[-5.4,-80.2]});
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
}},
// 4. A greenhouse. The hatch to the potting room only stays open a moment after its plate is let go: too short to run,
// but the belt beside it gets you there in time once its lever turns it round. In the potting room the thermostat on
// the orchid house door must be set to the orchid's temperature (the cactus and fern cards are true, but they aren't
// for this door). In the orchid house: a cart over the pond, sprinklers, and two vines; only the west one's walkway
// has the yellow keycard for the way out.
{id:'hothouse',name:'Growing Pains',sub:'The greenhouse',par:120,sky:['#9fe0c8','#fbfbe6'],pal:{floor:'#d6cfb8',wall:'#9ccfb0',prop:'#7c5a3a',trim:'#2d4a35'},
msgs:{hatch:'The hatch lifts','flow:on':'The belt turns round: it runs east','flow:off':'The belt turns round: it runs west',heat:'Just right! The orchid house door opens',door_cardY:'The yellow door slides open'},unlock:['heat','door_cardY'],
build(B,r){
  const W=B.W,POT={col:'#a0603a',mat:'wood'},LEAF={col:'#3f9d4a',mat:'plastic'},STEEL={col:'#8f9bab',mat:'metal'},GLASS={col:'#d9fbe8',mat:'glass'};
  const tg=Math.floor(r()*8),others=shuffle([0,1,2,3,4,5,6,7].filter(k=>k!==tg),r);
  W.dials.heat={set:'heat',keys:['heat'],target:{heat:tg}};W.st.dial.heat=(tg+2+Math.floor(r()*5))%8;
  const T=[14,16,18,20,22,24,26,28];
  W.w4care={orchid:{name:'Orchid',col:'#16a34a',temp:T[tg]},cactus:{name:'Cactus',col:'#65a30d',temp:T[others[0]]},fern:{name:'Fern',col:'#15803d',temp:T[others[1]]}};
  const planter=(x0,x1,z)=>{B.blk((x0+x1)/2,z,x1-x0,1.6,2.4,POT);for(let x=x0+1;x<x1-.5;x+=2.2)B.deco(x,2.9,z,1.1,1,1.1,LEAF)};
  const care=(plant,x,y,z,yaw,o)=>B.sign(x,y,z,yaw,2.6,1.8,Object.assign({w4:'care',plant},o||{}));
  // the palm house: the belt corridor between two planters, its plate at the west end, the hatch at the east end
  B.floor(-12,6.5,12,-32);B.wallZ(-12,7,-32);B.wallZ(12,7,-32,[{c:-24,w:DW,h:DH}]);B.wallX(7,-12.5,12.5);B.wallX(-32,-12.5,12.5);
  B.cp(0,0,3.4);
  planter(-8.5,12,-20.5);planter(-12,12,-27.5);
  B.lava(-8.5,-21.3,12,-22.6);B.lava(-8.5,-25.4,12,-26.7);
  B.belt(-8.5,-22.5,12.3,-25.5,[-12.5,0],{rev:'flow',name:'belt'});
  B.hold('plate',-10.2,-24,'hatch',{linger:2,w:2.2,d:2.4});
  B.door('z',12,-24,'hatch',{col:'#7c5a3a',part:{mat:'gate'}});
  B.btn('flowLever',-4,1.4,{toggle:'flow'},{top:1.2,icon:'lever',col:'#ffd23f',stand:[-4,2.6]});
  care('fern',-11.45,3.4,-6,Math.PI/2);
  B.blk(-10.5,-30.4,3,2.4,4.8,STEEL);B.item('gem','gem',-10.5,5.7,-30.4);
  for(const [x,z] of [[-7,-8],[6,-10],[0,-13]]){B.cyl(x,1.2,z,1.1,POT);B.dcyl(x,2.6,z,.9,1.6,LEAF);B.dcyl(x,3.9,z,.5,1,LEAF)}
  B.sign(0,7.6,6.45,Math.PI,8,1.6,{title:'Growing Pains',sub:'The hatch never stays open for long'});
  // the potting room: the thermostat on the orchid house door, cards on the walls
  B.floor(12,-16,24,-32);B.wallX(-16,11.5,24.5);B.wallZ(24,-16,-32);B.wallX(-32,11.5,24.5,[{c:18,w:DW,h:DH}]);
  B.cp(1,15,-24);
  B.btn('thermo',21,-29.6,{dial:'heat',key:'heat',n:8},{top:1.3,icon:'thermo',col:'#fecaca',stand:[21,-28.2]});
  B.sign(14.6,4.2,-31.45,0,2.6,2.6,{w4:'gauge'});B.sign(14.6,4.2,-31.38,0,2.6,2.6,{hand:'heat',dial:'heat',n:8});
  B.sign(18,6.4,-31.45,0,5,1.2,{title:'Orchid house'});
  care('cactus',23.45,3.6,-27,-Math.PI/2);
  B.blk(18,-17.4,8,1.6,1,{col:'#7c5a3a',mat:'wood',name:'bench'});care('orchid',18,1.03,-17.4,0,{flat:true});
  B.door('x',-32,18,'heat',{col:'#2d4a35'});
  // the orchid house: a cart over the pond, sprinklers, two vines
  B.floor(-12,-32,24,-66);B.wallZ(-12,-32,-66);B.wallZ(24,-32,-66);
  B.wallX(-66,-12.5,24.5,[{c:-6,w:DW,h:DH}]);
  B.lava(-12,-36,24,-58);
  B.cp(2,18,-33.9,{d:2.6});
  B.plat(18,.8,-40,3,3,{move:{type:'line',ax:-12,per:6},mat:'wood',col:'#c9a26b',name:'cart'});B.deco(12,1.6,-40,13,.2,.2,{col:'#2d4a35',mat:'metal'});
  B.plat(4,.8,-44.6,2.4,2.4,Object.assign({name:'p1'},STEEL));B.plat(2.2,.8,-48.8,2.4,2.4,Object.assign({name:'p2'},STEEL));B.plat(-2.6,.8,-48.8,2.4,2.4,Object.assign({name:'p3'},STEEL));
  B.plat(10,.8,-48.8,2.4,2.4,Object.assign({name:'p4'},STEEL));
  B.laser(3,2.3,-46.7,6,4,.3,{timed:{per:2.6,on:.45,ph:0},name:'spray1'});B.laser(-.2,2.3,-48.8,.3,4,3,{timed:{per:2.6,on:.45,ph:.5},name:'spray2'});
  for(const [x,z] of [[3,-46.7]])B.deco(x,4.6,z,6.4,.3,.5,STEEL);B.deco(-.2,4.6,-48.8,.5,.3,3.4,STEEL);
  B.blk(-3,-52,2.6,2.6,5,Object.assign({name:'pillarW'},GLASS,{mat:'stone',col:'#8aa58f'}));B.box(-3,2.75,-50.25,1.4,4.5,.9,{truss:true,mat:'vine',col:'#4f9a3a',name:'vineW'});
  B.plat(-8,5,-52,8,1.6,Object.assign({name:'walkW'},STEEL));B.item('cardY','cardY',-10.4,5.9,-52);
  B.blk(10,-52,2.6,2.6,5,{mat:'stone',col:'#8aa58f',name:'pillarE'});B.box(10,2.75,-50.25,1.4,4.5,.9,{truss:true,mat:'vine',col:'#4f9a3a',name:'vineE'});
  B.plat(16,5,-52,10,1.6,Object.assign({name:'walkE'},STEEL));
  B.cp(3,-6,-59.8);
  B.cardDoor('x',-66,-6,'cardY');
  exitHall(B,-6,-66);
  for(const x of [-6,6,18])B.deco(x,9.6,-49,.4,.4,34,{col:'#2d4a35',mat:'metal'});
  // route
  B.use('flowLever',-4,0,2.6);
  B.w(-10,0,-17.6);B.w(-10.2,0,-24);B.w(13.6,0,-24);B.w(15,0,-24);
  B.dial('thermo','heat','heat',21,0,-28.2);B.w(18,0,-31);B.w(18,0,-33.9);
  B.jon('cart',0,{wait:true});B.ladder('cart',(t,W,pl)=>cur(W.byName.get('cart'),t).x<6.6?'done':'wait');B.j(4,.8,-44.6,{wait:true});
  B.j(2.2,.8,-48.8,{wait:true});B.j(-2.6,.8,-48.8,{wait:true});
  B.ladder('vineW',(t,W,pl)=>pl.gr&&pl.y>4.9?'done':'climb');B.w(-3.4,5,-52);B.w(-10.4,5,-52);
  B.j(-6,.12,-59.8,{wait:true});B.w(-6,0,-63.4);B.w(-6,0,-69.4);
  W.spawn={x:0,y:0,z:3.4,yaw:0};
}},
// 5. A data centre. The yellow keycard you see first sits in a glass cage you can't get into from the server hall:
// its only way in is from the cold aisle at the far end. Red, then green, then yellow: the red card is behind two rows
// of racks that slide shut; the green one is on a battery stack, up a lift that only runs while its plate is held down
// (push a spare battery onto it); the cold aisle freezes you away from the heaters, under presses and over the lava.
{id:'servers',name:'Hot Swap',sub:'The data centre',par:150,snow:true,sky:['#5b7db8','#dfe9f7'],pal:{floor:'#d5dbe4',wall:'#7f8ea6',prop:'#3b4556',trim:'#151b26'},
msgs:{door_cardR:'The red door slides open',door_cardG:'The green door slides open',door_cardY:'The yellow door slides open',lift:'The lift starts up'},unlock:['door_cardY'],
build(B,r){
  const W=B.W,RACK={col:'#2b3445',mat:'metal'},GLASS={col:'#cfe8ff',mat:'glass'},BATT={col:'#4ade80',mat:'metal'},STEEL={col:'#8f9bab',mat:'metal'};
  const rack=(x0,x1,z)=>{B.blk((x0+x1)/2,z,x1-x0,1.4,4.6,RACK);for(let x=x0+.8;x<x1-.4;x+=1.6)B.deco(x,2.6,z+.71,.5,3,.04,{col:x%3.2<1.6?'#22d3ee':'#4ade80',mat:'glass'})};
  const heater=(x,z,rad)=>{B.cyl(x,.7,z,.7,{t:.7,col:'#5b6475',mat:'stone',name:'brazier'});B.dcyl(x,.75,z,.55,.12,{col:'#ffb347',mat:'glass'});B.zone('warm',x-rad,z-rad,x+rad,z+rad,-1,4,{fire:[x,.9,z]})};
  // the server hall: two rows of racks, a sliding rack in each gap; the red card behind them; the glass cage
  B.floor(-12,6.5,12,-30);B.wallX(7,-36.5,12.5);B.wallZ(12,7,-30);
  B.wallZ(-12,7,-30,[{c:-25,w:DW,h:DH}]);
  B.cp(0,0,3.4);
  rack(-12,-1.5,-9);rack(1.5,12,-9);B.crusher('rackA',4.5,2.3,-9,3,4.6,1.4,{type:'line',ax:-4.5,per:3.2});
  rack(-12,-9,-19);rack(-6,12,-19);B.crusher('rackB',-4.5,2.3,-19,3,4.6,1.4,{type:'line',ax:-3,per:3.2,ph:.5});
  B.item('cardR','cardR',-2,1.2,-27.2);
  B.cardDoor('z',-12,-25,'cardR');
  for(const [x0,z0,x1,z1] of [[5.5,-26.5,10.5,-26.5],[5.5,-26.5,5.5,-30],[10.5,-26.5,10.5,-30]])B.add(Object.assign({x:(x0+x1)/2,y:WH/2-1,z:(z0+z1)/2,w:Math.abs(x1-x0)+.3,h:WH,d:Math.abs(z1-z0)+.3},GLASS));
  B.item('cardY','cardY',8,1.2,-28.4);
  B.sign(0,7.4,6.45,Math.PI,8,1.6,{title:'Hot Swap',sub:'Red, then green, then yellow'});
  // the battery room: push the spare battery onto the plate and the lift runs up to the green card
  B.floor(-36,6.5,-12,-30,{col:'#cbd2dc'});B.wallZ(-36,7,-30);
  B.cp(1,-15,-25);
  B.hold('liftPlate',-24,-16,'lift',{linger:1});
  B.add({x:-17,y:.9,z:-6,w:1.8,h:1.8,d:1.8,push:true,mat:'crate',col:'#4ade80',name:'cell',lim:[-34.6,-28.6,-13.4,5.6]});
  B.plat(-30,.5,-22,2.6,2.6,{onIf:'lift',move:{type:'line',ay:4.4,per:5},col:'#facc15',mat:'metal',name:'lift'});
  B.blk(-33.5,-22,4,6,4.8,Object.assign({name:'stack1'},BATT));B.item('cardG','cardG',-33.5,5.7,-22.6);
  B.blk(-33.5,-15.5,4,4,6.2,Object.assign({name:'stack2'},BATT));B.item('gem','gem',-33.5,7.1,-15.5);
  for(const [x,z] of [[-30,-4],[-30,-10],[-17,-24]])B.blk(x,z,2.6,2.6,1.2,STEEL);
  // the cold aisle: heaters, presses over the walkway, the cage's open back, stepping stones to the yellow door
  B.floor(-36,-30,12,-56,{col:'#e6edf5'});B.wallZ(-36,-30,-56);B.wallZ(12,-30,-56);
  B.wallX(-30,-36.5,-11.5,[{c:-24,w:DW,h:DH}]);B.wallX(-30,-12.5,12.5,[{c:8,w:2.6,h:DH}]);
  B.wallX(-56,-36.5,12.5,[{c:0,w:DW,h:DH}]);
  B.cardDoor('x',-30,-24,'cardG');
  B.zone('cold',-36,-30,12,-56,-2,12,{name:'cold'});
  B.cp(2,-24,-32.6,{d:2.6});
  heater(-28,-34,2.6);heater(-9,-34,2.6);heater(10.6,-34,2.6);heater(-7,-54.4,2.6);
  [[-17,0],[-3,.5]].forEach(([x,ph],i)=>B.press('press'+i,x,-32.7,3,5.4,{up:4.6,h:4.2,drop:4.45,per:2.6,ph}));
  B.lava(-36,-35.4,12,-52);
  B.plat(2,.8,-38.6,2.4,2.4,Object.assign({name:'q1'},STEEL));B.plat(-1.4,.8,-43,2.4,2.4,Object.assign({name:'q2'},STEEL));B.plat(1.6,.8,-47.4,2.4,2.4,Object.assign({name:'q3'},STEEL));
  B.wind(-12,-35.4,12,-52,-2,8,[4,0],{timed:{per:4,on:.4},name:'fans'});
  B.cp(3,4,-32.6,{d:2.6});
  B.cardDoor('x',-56,0,'cardY');
  exitHall(B,0,-56);
  for(const x of [-30,-18,-6,6])B.deco(x,9.6,-43,.6,.6,26,{col:'#151b26',mat:'metal'});
  // route
  B.w(0,0,-6.4);B.w(0,0,-11.8);B.w(-7.5,0,-16.4);B.w(-7.5,0,-21.6);B.w(-2,0,-26.2);B.w(-10.6,0,-25);B.w(-15,0,-25);
  B.w(-15.4,0,-6);B.push('cell','x',-24);B.w(-22,0,-3.6);B.w(-24,0,-3.6);B.push('cell','z',-16);
  B.w(-28,0,-20);B.jon('lift',0,{wait:true});B.ladder('lift',(t,W,pl)=>pl.y>4.5?'done':'wait');B.j(-33.2,4.8,-22.4,{wait:true});
  B.j(-26,0,-27.4,{wait:true});B.w(-24,0,-28.6);B.w(-24,0,-32.6);
  B.w(-21,0,-32.6);B.w(-9,0,-32.4);B.u((t,W,pl)=>pl.cold<.1);B.w(8,0,-32.6);B.w(8,0,-28.4);B.w(8,0,-31);B.w(10.6,0,-32.3);B.u((t,W,pl)=>pl.cold<.1);
  B.w(4,0,-32.6);B.w(2,0,-34.6);B.j(2,.8,-38.6,{wait:true});B.j(-1.4,.8,-43,{wait:true});B.j(1.6,.8,-47.4,{wait:true});B.j(0,0,-53,{wait:true});
  B.w(0,0,-55);B.w(0,0,-59.4);B.w(0,0,-61.4);
  W.spawn={x:0,y:0,z:3.4,yaw:0};
}},
// 6. An observatory at night. The telescope stands on a turning floor; point it where the night log says the comet is
// tonight (the first entry is from an earlier night) and the dome opens. In the laser lab, turn three mirrors so the
// beam reaches the sensor: its light makes the bridge to the far side. Then the planetarium: ride the planets round the
// sun to the way out, keeping clear of the comet.
{id:'stargaze',name:'Night Shift',sub:'The observatory',par:120,night:true,sky:['#0d1333','#3b3f7a'],pal:{floor:'#8b93a8',wall:'#4b4f7a',prop:'#c9a24a',trim:'#151833'},
msgs:{scope:'Comet in sight! The dome door opens',laser:'The sensor lights up. A bridge of light appears'},unlock:['scope','laser'],
build(B,r){
  const W=B.W,STEEL={col:'#9aa3b5',mat:'metal'},BRASS={col:'#c9a24a',mat:'metal'},ISLE={col:'#6b7189',mat:'stone'};
  const tg=Math.floor(r()*8);let d1;do{d1=Math.floor(r()*8)}while(d1===tg);
  W.dials.scope={set:'scope',keys:['scope'],target:{scope:tg}};W.st.dial.scope=(tg+2+Math.floor(r()*5))%8;
  const C=COMPASS;
  // the dome: a turning floor over the pit, the telescope on its column in the middle
  B.floor(-14,6.5,14,-30);B.wallZ(-14,7,-30);B.wallZ(14,7,-30);B.wallX(7,-14.5,14.5);B.wallX(-30,-14.5,14.5,[{c:0,w:DW,h:DH}]);
  B.cp(0,0,3.4);
  B.lava(-14,-2,14,-26);
  B.cyl(0,.8,-15,9,{move:{type:'spin',w:.22},col:'#7c86a2',mat:'metal',name:'disc'});
  B.cyl(0,2.2,-15,1.6,{t:3,col:'#3b4060',mat:'metal',name:'column'});
  B.deco(0,3.6,-15.6,.8,.8,3.6,Object.assign({yaw:0},BRASS));B.dcyl(0,2.6,-15,.5,.8,BRASS);
  B.btn('scopeBtn',.9,-15.9,{dial:'scope',key:'scope',n:8},{top:2.42,noBase:true,icon:'compass',col:'#ffd23f',stand:[0,-14.2]});
  B.sign(0,7.2,-29.45,0,3.8,3.8,{rose:true});B.sign(0,7.2,-29.38,0,3.8,3.8,{hand:'scope',dial:'scope',n:8});
  B.sign(-13.45,3.8,-6,Math.PI/2,4.6,3.4,{w4:'notes',title:'Night log',lines:['Monday: the comet, low in the '+C[d1],'Tuesday: cloudy, saw nothing','Tonight: it has moved to the '+C[tg]]});
  B.plat(12,3.6,-15,3.6,6,Object.assign({name:'catwalk'},STEEL));B.item('gem','gem',12.4,4.5,-16.6);
  B.cp(1,4,-28,{d:2.6});
  B.door('x',-30,0,'scope',{col:'#151833',part:{mat:'vaultdoor'}});
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2;B.dcyl(Math.sin(a)*12.6,9.4,-15+Math.cos(a)*12.6,.25,.25,{col:'#fff7c2',mat:'glass'})}
  B.sign(0,7.6,6.45,Math.PI,8,1.6,{title:'Night Shift',sub:'Read the night log'});
  // the laser lab: mirrors on islands, blinking and crumbling stones, the sensor, the bridge of light
  B.floor(-14,-30,14,-60,{col:'#7d8499'});B.wallZ(-14,-30,-60);B.wallZ(14,-30,-60);B.wallX(-60,-14.5,14.5,[{c:-8,w:DW,h:DH}]);
  B.lava(-14,-33,14,-54);
  B.cp(2,-5,-31.6,{d:2.6});
  B.plat(2,.4,-34.6,3,4.4,Object.assign({name:'I1'},ISLE));B.plat(2.4,.4,-47.4,4,4,Object.assign({name:'I2'},ISLE));B.plat(-8,.4,-47,3,3,Object.assign({name:'I3'},ISLE));
  B.plat(4.6,.4,-39.6,2.2,2.2,{timed:{per:3,on:.6,ph:0},mat:'blink',col:'#a5b4fc',name:'s1'});B.plat(1.4,.4,-42.8,2.2,2.2,{timed:{per:3,on:.6,ph:.45},mat:'blink',col:'#a5b4fc',name:'s2'});
  B.plat(-3,.4,-47,2.2,2.2,{crumble:true,mat:'crumble',col:'#c7cbe0',name:'c1'});
  const MIR=[['m1',2,-35],['m2',2,-47],['m3',-8,-47]];
  W.beams.laser={x:13.4,z:-35,dir:[-1,0],y:1.8,set:'laser',mirrors:MIR.map(m=>m[0]),target:{x:-8,z:-57,name:'sensor'},stops:[[-15,-61,-13.5,-29],[13.5,-61,15,-29],[-15,-30.5,15,-29],[-15,-61,15,-59.5]]};
  for(const [n,x,z] of MIR){B.cyl(x,1.1,z,.45,{col:'#3b3355',mat:'metal'});B.add({x,y:1.85,z,w:1.7,h:1.5,d:.16,solid:false,btn:{mirror:'laser'},name:n,mat:'mirror',col:'#dfe7ff',icon:'mirror',cam:false,stand:[x,z+1.1]})}
  do{for(const [n] of MIR)W.st.mir[n]=r()<.5?1:0}while(MIR.every(([n])=>!W.st.mir[n]));
  B.deco(13.45,1.8,-35,.12,1.2,1.2,{col:'#ff6b6b',mat:'glass'});B.deco(13.6,1.8,-35,.3,1.8,1.8,{col:'#3b3355',mat:'metal'});
  B.blk(-8,-57,1.2,1.2,1.2,ISLE);B.add({x:-8,y:1.9,z:-57,w:.7,h:1.2,d:.7,deco:true,mat:'crystal',col:'#bfe9ff',name:'sensor'});
  B.plat(-8,.4,-51.4,2.4,6.4,{onIf:'laser',mat:'glass',col:'#fff3b0',name:'lightBridge'});
  B.cp(3,-3,-56.4,{d:2.6});
  // the planetarium: two planets ride round the sun, a comet goes the other way between them
  B.floor(-14,-60,14,-92,{col:'#2a2f52'});B.wallZ(-14,-60,-92);B.wallZ(14,-60,-92);B.wallX(-92,-14.5,14.5,[{c:0,w:DW,h:DH}]);
  B.lava(-14,-63.4,14,-86);
  B.add({shape:'cyl',x:0,y:1.4,z:-75,r:2.4,h:4,kill:true,mat:'neon',col:'#ff7a2a',name:'sun'});
  for(let i=0;i<2;i++)B.plat(0,.8,-75,3,3,{t:.6,move:{type:'orbit',cx:0,cz:-75,rad:7,w:.4,a0:i*Math.PI},col:i?'#60a5fa':'#f59e0b',mat:'stone',name:'planet'+i});
  B.add({shape:'cyl',x:5.2,y:1.9,z:-75,r:.45,h:1.4,kill:true,mat:'neon',col:'#ff2a4a',move:{type:'orbit',cx:0,cz:-75,rad:5.2,w:-.7,a0:0},name:'comet'});
  B.cp(4,4,-61.6,{d:2.4});
  exitHall(B,0,-92);
  for(let k=0;k<14;k++){const a=k*2.4;B.dcyl(Math.cos(a)*(6+k%4*2),8.6+k%3*.5,-75+Math.sin(a)*(5+k%5),.18,.18,{col:'#fff7c2',mat:'glass'})}
  // route
  B.w(0,0,-1);B.j(0,.8,-8.4,{wait:true});B.j(0,2.2,-14,{wait:true});B.dial('scopeBtn','scope','scope',0,2.2,-14.2);
  B.j(0,.8,-21.4,{wait:true});B.j(-2,0,-28,{wait:true});B.w(4,0,-28);B.w(0,0,-28.6);B.w(0,0,-31.6);B.w(-5,0,-31.6);
  B.w(2,0,-31.4);B.w(2,.4,-33.9);if(W.st.mir.m1)B.use('m1',2,.4,-33.9);
  B.j(4.6,.4,-39.6,{wait:true});B.j(1.4,.4,-42.8,{wait:true});B.j(2,.4,-45.9,{wait:true});if(W.st.mir.m2)B.use('m2',2,.4,-45.9);
  B.j(-3,.4,-47,{wait:true});B.j(-8,.4,-45.9,{wait:true});if(W.st.mir.m3)B.use('m3',-8,.4,-45.9);
  B.u((t,W)=>flagOn(W,'laser',t));B.w(-8,.4,-52.6);B.w(-8,0,-55);B.w(-3,0,-56.4);B.w(-8,0,-58.4);B.w(-8,0,-61.4);B.w(4,0,-61.6);
  B.w(0,0,-62.4);B.jon(['planet0','planet1'],0,{wait:true});B.ladder('planet0',(t,W,pl)=>{const g=pl.gp;return g&&cur(g,t).z<-81.4?'done':'wait'});B.j(0,0,-87.4,{wait:true});
  B.w(0,0,-95.2);
  W.spawn={x:0,y:0,z:3.4,yaw:0};
}}
]});
})(Escapade);
