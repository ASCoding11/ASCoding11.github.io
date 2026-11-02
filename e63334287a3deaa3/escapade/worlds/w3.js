// World 3: Deep Down. Under the ground and under the water: an old mine, flooded caves, a railway, a pump station, an
// aquarium, a crystal cavern, a sunken ship and the heart of a volcano. See README.md in this folder for how a world
// file works. New here (in the page's CORE, World 3 block): water you swim in (and hold your breath under), minecarts on
// rails, water and lava that rise, and dark rooms you need the lantern for.
(function(E){
'use strict';
const {DW,DH,WH,cur,flagOn,makeCode,shuffle,exitHall}=E;
const ROCK={col:'#7a6650',mat:'stone'},WOOD={mat:'wood',col:'#9a7048'};
// a mine's timber frame on a wall: two posts and a beam (decoration)
function props(B,x,z,yaw,h,w){const c=Math.cos(yaw),s=Math.sin(yaw);w=w||4;h=h||6;
  for(const o of [-w/2,w/2])B.deco(x+c*o,h/2,z-s*o,.5,h,.5,{col:'#6b4a2f',mat:'wood'});B.deco(x,h+.25,z,(Math.abs(c)>.5?w+.5:.5),.5,(Math.abs(c)>.5?.5:w+.5),{col:'#6b4a2f',mat:'wood'})}
// a lamp hung on a wall (decoration that glows)
function wallLamp(B,x,y,z){B.deco(x,y,z,.36,.46,.36,{col:'#ffd56b',mat:'glass'})}
// a pit in the floor, bottom at `bot`, lined (like walls, 1 thick, centred on its edges) under the floor (so nobody swims out under a wall); gaps in the
// lining: [{side: 'n'|'s'|'e'|'w', c, w, h}] (an opening from the bottom up to h)
function pit(B,x0,z0,x1,z1,bot,o,gaps){o=o||{};gaps=gaps||[];const cx=(x0+x1)/2,cz=(z0+z1)/2,w=Math.abs(x1-x0),d=Math.abs(z1-z0),h=-1-(bot-1),y=(bot-1-1)/2;
  B.box(cx,bot-.5,cz,w,1,d,Object.assign({},o,{name:o.name||''}));
  const side=(k,ax,at,a0,a1)=>{const gs=gaps.filter(g=>g.side===k).sort((p,q)=>p.c-q.c);let s=a0;
    const seg=(s0,s1,y0,y1)=>{if(s1-s0<.01||y1-y0<.01)return;const c=(s0+s1)/2,L=s1-s0;B.box(ax==='x'?c:at,(y0+y1)/2,ax==='x'?at:c,ax==='x'?L:1,y1-y0,ax==='x'?1:L,o)};
    for(const g of gs){seg(s,g.c-g.w/2,bot-1,-1);seg(g.c-g.w/2,g.c+g.w/2,bot+g.h,-1);s=g.c+g.w/2}seg(s,a1,bot-1,-1)};
  side('n','x',Math.min(z0,z1),Math.min(x0,x1)-.5,Math.max(x0,x1)+.5);side('s','x',Math.max(z0,z1),Math.min(x0,x1)-.5,Math.max(x0,x1)+.5);
  side('w','z',Math.min(x0,x1),Math.min(z0,z1),Math.max(z0,z1));side('e','z',Math.max(x0,x1),Math.min(z0,z1),Math.max(z0,z1))}
// is a spinning bar (a box turning about its centre) clear of (x, z) for the next `dur` seconds?
function barClear(bar,x,z,t,dur,m){for(let k=0;k<=dur;k+=.1){const b=cur(bar,t+k),c=Math.cos(b.yaw),s=Math.sin(b.yaw),dx=x-b.x,dz=z-b.z;
  if(Math.abs(dx*c-dz*s)<bar.hx+m&&Math.abs(dx*s+dz*c)<bar.hz+m)return false}return true}
E.world({n:3,needs:3,levels:[
// 1. An old mine. Ride the minecart over the lava chasm to the lamp store and take a lantern: the workings beyond are
// pitch dark, and the miners chalked the lift's code on the walls in there (numbered 1 to 4), which only shows by
// lantern light. A second cart and a bucket on a cable carry you across, then the code opens the lift.
{id:'ddmine',name:'Cave-In',sub:'The old mine',par:80,cave:true,night:true,sky:['#1d1712','#4a3a2a'],pal:{floor:'#8a7560',wall:'#6e5a46',prop:'#9a7a52',trim:'#2e241a'},
msgs:{cage:'Code accepted. The lift gate rattles open'},unlock:['cage'],
build(B,r){
  const W=B.W;
  W.codes.mine=makeCode(r);W.pads.mine={set:'cage'};
  // the pithead: a loading platform, the cart over the chasm, the lamp store on the far side
  B.floor(-12,7,12,-28,ROCK);B.wallX(7,-12.5,12.5);B.wallZ(-12,7,-28);B.wallZ(12,7,-28);B.wallX(-28,-12.5,12.5,[{c:6,w:DW,h:DH}]);
  B.cp(0,0,3.6);
  B.lava(-12,-5,12,-21.5);
  B.blk(-6,-3.4,3,2.6,1,Object.assign({name:'dock'},WOOD));
  B.rail('cart1',[[-6,1,-6.4],[-6,1,-20.1]],{v:3.6,dwell:2.6});
  B.blk(-6,-23,3,2.6,1,Object.assign({name:'dock2'},WOOD));
  B.cp(1,3,-24.6);
  B.cyl(-10.3,1,-25.4,.7,{col:'#8a5a34',mat:'barrel',name:'barrel'});B.item('lamp','lamp',-10.3,1.6,-25.4);
  B.sign(-8.6,4.4,-27.45,0,4.6,2.4,{board:['Lamp store','Dark in the workings?','Take a lantern']});
  B.sign(0,7.4,6.45,Math.PI,7,1.6,{title:'Cave-In',sub:'Ride the cart across the chasm'});
  B.sign(1,6.8,-27.45,0,5.6,1.4,{title:'The workings',sub:'No lights past here'});
  for(const x of [-10,-2,10])props(B,x,6.5,0,6,3.4);
  for(const z of [-3,-25])for(const s of [-1,1])wallLamp(B,s*11.4,4.6,z);
  B.blk(9.6,-25.4,2,2,1.4,{col:'#8a5a34',mat:'wood'});B.blk(9.6,-23,1.6,1.6,.9,{col:'#8a5a34',mat:'wood'});
  // the workings (dark): rocks and planks over the lava, a cart across to the west ledge, a bucket on a cable
  B.floor(-12,-28,12,-62,ROCK);B.wallZ(-12,-28,-62);B.wallZ(12,-28,-62);B.wallX(-62,-12.5,12.5,[{c:-6,w:DW,h:DH}]);
  B.dark(-12,-28,12,-62);
  B.lava(-12,-31.5,12,-58.5);
  B.plat(6,1,-34.2,2.8,2.8,Object.assign({name:'r1',t:2},ROCK));
  B.plat(2.8,1.4,-37.4,2.2,2.2,{crumble:true,mat:'crumble',col:'#b08a5a',name:'plank1'});
  B.plat(-.2,1.8,-40.6,3,3,Object.assign({name:'r3',t:2.8},ROCK));
  B.rail('cart2',[[-3.4,1.8,-40.6],[-9.4,1.8,-40.6]],{v:2.6,dwell:2.4,ph:.3});
  B.blk(-10.2,-45.6,3.6,5,2.4,Object.assign({name:'westLedge'},ROCK));
  B.cp(2,-10.2,-46.6,{top:2.4,w:2.4,d:2.4});
  B.plat(-6.6,2.4,-50.4,2.6,2.6,Object.assign({name:'r4',t:3.4},ROCK));
  B.plat(-2.6,2.2,-54,2.4,2.4,{move:{type:'line',ax:6,per:4.6},mat:'barrel',col:'#8a6a4a',name:'bucket'});
  B.deco(.4,7,-54,14,.12,.12,{col:'#3a3a3a',mat:'metal'});
  B.plat(6.4,2.6,-55.2,2.6,2.6,Object.assign({name:'r6',t:3.6},ROCK));
  B.blk(9.4,-51.4,2.2,2.2,3.6,Object.assign({name:'gemRock'},ROCK));B.item('gem','gem',9.4,4.4,-51.4);
  // the chalk marks (only by lantern light), one on each side of the workings
  const chalk=(n,x,y,z,yaw)=>B.sign(x,y,z,yaw,2.2,2.2,{w3:'chalk',code:'mine',n,lamp:true,label:'lift code'});
  chalk(1,11.45,4.6,-34.2,-Math.PI/2);chalk(2,-11.45,5,-41.6,Math.PI/2);chalk(3,2,4.8,-61.45,0);chalk(4,-6,4.8,-28.55,Math.PI);
  for(const z of [-36,-48,-56])props(B,-11.5,z,Math.PI/2,6,3);for(const z of [-40,-48,-56])props(B,11.5,z,Math.PI/2,6,3);
  // the lift room
  B.floor(-12,-62,12,-84,ROCK);B.wallZ(-12,-62,-84);B.wallZ(12,-62,-84);B.wallX(-84,-12.5,12.5,[{c:0,w:DW,h:DH}]);
  B.cp(3,-6,-65);
  B.panel('pad',-3.6,1.6,-83.35,0,{pad:'mine'},{icon:'pad'});
  B.door('x',-84,0,'cage',{col:'#5b5f66',part:{mat:'gate'}});
  B.sign(6,6.4,-83.45,0,7,1.6,{title:'The lift',sub:'Code: the chalk marks, 1 to 4'});
  exitHall(B,0,-84);
  for(const x of [-8,8])props(B,x,-83.5,0,6,3.6);
  for(const z of [-68,-78])for(const s of [-1,1])wallLamp(B,s*11.4,4.6,z);
  B.blk(9,-70,2.4,4,1.2,{col:'#6b5a48',mat:'metal',name:'oreCart'});
  // route
  const c1=W.byName.get('cart1'),c2=W.byName.get('cart2');
  B.w(-6,0,-1);B.j(-6,1,-3.6,{wait:true});B.jon('cart1',0,{wait:true});
  B.ladder('cart1',(t)=>cur(c1,t).z<-19.95?'done':'wait');B.j(-6,1,-23.4,{wait:true});
  B.w(-8.4,0,-24.6);B.w(-9.2,0,-25.6);B.w(3,0,-24.6);B.w(6,0,-26.6);B.w(6,0,-30.2);
  B.j(6,1,-34.2,{wait:true});B.j(2.8,1.4,-37.4);B.j(-.2,1.8,-40.6,{wait:true});
  B.jon('cart2',0,{wait:true});B.ladder('cart2',(t)=>cur(c2,t).x<-9.3?'done':'wait');B.j(-10.2,2.4,-43.9,{wait:true});B.w(-10.2,2.4,-46.6);
  B.j(-6.6,2.4,-50.4,{wait:true});B.jon('bucket',0,{wait:true});B.j(6.4,2.6,-55.2,{wait:true});B.j(5,0,-60,{wait:true});
  B.w(-6,0,-60.4);B.w(-6,0,-65);B.use('pad',-3.6,0,-82.2);B.code('mine');B.w(0,0,-86);B.w(0,0,-87.4);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}},
// 2. A flooded cave. Swim the grotto's lake and dive under the wall into the sump, where a valve opens the grate at the
// bottom for a few seconds: race it, through the drowned tunnel to the key grotto. A second valve lets you back out;
// carry the key all the way back to the door by the shore. Come up for air before the bar runs out.
{id:'ddflood',name:'Deep End',sub:'The flooded cave',par:95,cave:true,sky:['#0f2b33','#2f6f73'],pal:{floor:'#5f7f7a',wall:'#4f6b66',prop:'#7a9a8a',trim:'#1c3330'},
msgs:{keydoor:'The key turns. The way out is open'},unlock:['keydoor'],
build(B,r){
  const W=B.W,RK={col:'#6f8a82',mat:'stone'},T={top:13};
  const isle=(name,x,z,w,top)=>B.plat(x,top||3.8,z,w,w,Object.assign({name,t:(top||3.8)+1},RK));
  // the grotto: a shore with the locked door, a lake with stepping rocks, an opening under the north wall
  B.floor(-12,7,12,-72,RK);B.wallX(7,-19.5,12.5,[],T);B.wallZ(12,7,-72,[],T);
  B.wallZ(-12,7,-72,[{c:4,w:DW,h:4+DH}],T);
  B.blk(0,4,24,6,4,Object.assign({name:'shore'},RK));
  B.cp(0,0,4.2,{top:4});
  B.water(-12,1,12,-72,3.4);
  isle('i1',-4,-6,3);isle('i2',3,-12,3);isle('i3',-5,-18.4,3);
  B.wallX(-26,-12.5,12.5,[{c:-6,w:DW,h:2.6}],T);
  B.blk(10.2,-22.6,2.2,2.2,.4,Object.assign({name:'gemNiche'},RK));B.item('gem','gem',10.2,1.1,-22.6);
  B.door('z',-12,4,'keydoor',{part:{lock:'key',y:4+DH/2,col:'#c9a24a'}});
  B.blk(-15.5,4,7,5.2,4,Object.assign({name:'exitFloor'},RK));B.wallX(1.4,-19.5,-12,[],T);B.wallZ(-19,1.4,7,[],T);
  B.finish(-16.2,4,{top:4,w:3,d:3});B.sign(-11.45,4+DH+.75,4,Math.PI/2,2.6,.8,{exit:true});
  B.sign(0,8.6,-25.45,0,7,1.6,{title:'Deep End',sub:'Dive under the wall to the next cave'});
  B.sign(8,6.2,6.45,Math.PI,6.6,2.6,{board:['Swimming','Jump swims you up (hold it, or tap)','Under water, watch your Air']});
  // the sump: a valve on a rock opens the grate at the bottom of the far wall for a few seconds; an eel guards it
  B.wallX(-52,-12.5,12.5,[{c:-6,w:DW,h:2.6}],T);
  B.plat(6,3.8,-34,4.4,4.4,Object.assign({name:'valveRock',t:4.8},RK));B.cp(1,4.9,-32.9,{top:3.8,w:1.8,d:1.8});
  B.btn('valve1',7,-35.4,{timed:'grate',dur:8},{top:4.9,icon:'valve',col:'#ef7f45',stand:[7,-33.6]});
  isle('rest',-6,-31,3);B.cp(3,-6,-31,{top:3.8,w:2,d:2});
  B.door('x',-52,-6,'grate',{h:2.6,col:'#5b6b70',part:{mat:'gate'}});
  B.kill(-10,1.3,-48,2.6,.7,.7,{move:{type:'line',ax:10,per:4.4},name:'eel'});
  B.sign(6,8.4,-51.45,0,7,1.6,{title:'The grate',sub:'The valve opens it for a few seconds'});
  // the drowned tunnel, then the key grotto: the key on a ledge and a valve to get back out
  B.wallZ(-8,-52,-62,[],T);B.wallZ(-4,-52,-62,[],T);B.plat(-6,3.6,-57,3,10,Object.assign({name:'tunnelRoof',t:.6},RK));
  B.wallX(-72,-12.5,12.5,[],T);
  B.blk(6,-68.5,10,7,4,Object.assign({name:'keyLedge'},RK));B.cp(2,6,-66.4,{top:4,w:2.4,d:2});
  B.blk(9.4,-70.8,1,1,4.9,{col:'#5b6475',mat:'metal'});B.item('key','key',9.4,5.6,-70.8,{col:'#ffcf3d'});
  B.btn('valve2',3,-71,{timed:'grate',dur:9},{top:5.1,icon:'valve',col:'#ef7f45',stand:[3,-69.4]});
  B.sign(-3,8.4,-71.45,0,7,1.6,{title:'Key grotto',sub:'The key opens the door by the shore'});
  // decor: stalactites, glowing moss
  for(const [x,z,h] of [[-9,-4,3],[6,-20,4],[-2,-40,3.5],[9,-46,3],[-10,-66,4],[0,-8,2.5]])B.deco(x,13-h/2,z,.9,h,.9,{col:'#5d746e',mat:'stone',yaw:.7});
  for(const [x,y,z,yaw] of [[11.45,5,-8,-Math.PI/2],[-11.45,6,-40,Math.PI/2],[11.45,6,-60,-Math.PI/2],[-11.45,5,-16,Math.PI/2]])B.deco(x,y,z,.1,1.4,2.4,{yaw:0,col:'#7ef0b4',mat:'glass'});
  // route
  B.swim(-4,3.8,-6,{ground:true});B.swim(3,3.8,-12,{ground:true});B.swim(-5,3.8,-18.4,{ground:true});
  B.swim(-6,0,-24.4,{tol:.5});B.swim(-6,0,-28.6,{tol:.6});B.swim(4.9,3.8,-32.9,{ground:true});
  B.use('valve1',7,3.8,-33.6);B.swim(-6,2.6,-46.4);B.swim(-6,2.6,-50.6,{tol:.4});B.swim(-6,0,-50.6,{tol:.5});
  B.swim(-6,0,-55);B.swim(-6,0,-61);B.swim(-3,2.6,-64.4);B.swim(3,4,-66.4,{ground:true});
  B.w(8.4,4,-70.4);B.use('valve2',3,4,-69.4);
  B.swim(-6,2.6,-64.2);B.swim(-6,0,-61,{tol:.6});B.swim(-6,0,-50.4);B.swim(-6,2.6,-50.6,{tol:.4});B.swim(-6,2.6,-44);
  B.swim(-6,3.8,-31,{ground:true});B.swim(-6,0,-28.6,{tol:.6});B.swim(-6,0,-23.6,{tol:.6});B.swim(-3,2.6,-14);
  B.swim(-8,4,2.6,{ground:true});B.w(-10.6,4,4);B.w(-16.2,4,4);
  W.spawn={x:0,y:4,z:4.2,yaw:0};
}},
// 3. An old underground railway. A trolley takes you from the ticket hall to the junction, where the points lever sends
// the next cart either to the stores (the staff pass is there) or to the signal box (whose door needs the pass): ride
// one, come back and switch the points for the other. On the platforms, trains run through both tracks: the emergency
// exit opens for a few seconds, so cross when the trains have gone, waiting between the tracks if you need to.
{id:'ddrail',name:'Off the Rails',sub:'The underground railway',par:95,cave:true,sky:['#1c1a24','#4a4458'],pal:{floor:'#d8cdb8',wall:'#e8e2d0',prop:'#b84a3a',trim:'#1e3a8a'},
msgs:{sbox:'The pass opens the signal box','points:on':'Points switched: the cart now goes to the signal box','points:off':'Points switched: the cart now goes to the stores',exitdoor:'The emergency exit is open. Hurry!'},unlock:['sbox'],
build(B,r){
  const W=B.W,TILE={col:'#efe9d8',mat:'floor'},PLAT={col:'#c9bda4',mat:'stone'},RED={col:'#b84a3a',mat:'plastic'};
  // the ticket hall: barriers, the ticket office, the trolley dock in the north-west corner
  B.floor(-12,7,12,-16,TILE);B.wallX(7,-12.5,12.5);B.wallZ(-12,7,-48);B.wallZ(12,7,-48);B.wallX(-16,-12.5,12.5,[{c:-6,w:4,h:DH}]);
  B.cp(0,0,3.6);
  for(const x of [-9,-3.6,1.8,7.2])B.blk(x,-3,2.6,.7,1.2,{col:'#9aa3ad',mat:'metal'});
  B.blk(9.4,3.4,4.6,6,3,{col:'#b84a3a',mat:'wood',name:'office'});B.item('gem','gem',9.4,3.9,3.4);
  B.blk(-9.6,4.8,4,1.2,.9,{col:'#7a4e2c',mat:'wood'});
  B.blk(-6,-12.6,3.2,2.8,1,Object.assign({name:'dock'},PLAT));
  B.rail('cart1',[[-6,1,-15.4],[-6,1,-23.6]],{v:3,dwell:2.6});
  B.sign(0,7.2,6.45,Math.PI,7.4,1.6,{title:'Off the Rails',sub:'Trolley to the junction, north-west'});
  B.sign(4,6.6,-15.45,0,6.6,1.5,{title:'Platforms',sub:'Through the signal box. Staff only'});
  // the sidings: the junction island with the points lever, a cart to the stores, a cart to the signal box
  B.floor(-12,-16,12,-48,PLAT);B.lava(-12,-16,12,-48);
  B.blk(-6,-27.2,6,4.4,1,Object.assign({name:'island'},PLAT));B.cp(1,-8,-26,{top:1,w:1.6,d:1.6});
  B.btn('points',-3.8,-25.8,{toggle:'points'},{top:2.1,icon:'lever',col:'#ffd23f',stand:[-4.8,-26.6]});
  B.rail('cartS',[[-7.4,1,-30.6],[-7.4,1,-42]],{v:3,dwell:2.4,ph:.4,part:{offIf:'points'}});
  B.rail('cartB',[[-4.6,1,-30.6],[-4.6,1,-36.4],[6.8,1,-36.4]],{v:3.4,dwell:2.4,ph:.1,part:{onIf:'points'}});
  B.sign(-11.45,4.6,-27,Math.PI/2,6.4,3.6,{w3:'lines',title:'The junction',lines:[{col:'#16a34a',to:'Lever down: stores'},{col:'#2563eb',to:'Lever up: signal box'}],note:'The pass is kept in the stores'});
  B.blk(-7.5,-45.6,9,4.8,1,Object.assign({name:'stores'},PLAT));
  B.blk(-10.8,-47.4,1.6,1,2.2,{col:'#7a4e2c',mat:'wood'});B.item('card','card',-10.8,1.9,-45.4);
  B.blk(-4,-47.2,1.4,1.4,2,{col:'#8a5a34',mat:'wood'});
  B.sign(-7.5,5.4,-47.45,0,5,1.3,{title:'Stores',sub:'Staff passes'});
  B.blk(10,-39.5,4,17,1,Object.assign({name:'sbox'},PLAT));B.cp(2,10,-33.4,{top:1,w:2.4,d:2});
  B.blk(11.2,-42,1.6,3,4,{col:'#6b7280',mat:'metal',name:'signalbox'});
  B.wallX(-48,-12.5,12.5,[{c:10,w:DW,h:1+DH}]);
  B.door('x',-48,10,'sbox',{col:'#4b5563',part:{lock:'card',y:1+DH/2}});
  // the platforms: two tracks of lava with trains through them, a crossing with room between the tracks
  B.floor(-12,-48,12,-76,PLAT);B.wallZ(-12,-48,-76,[{c:-61,w:10,h:4.6}]);B.wallZ(12,-48,-76,[{c:-61,w:10,h:4.6}]);
  B.wallX(-76,-12.5,12.5,[{c:6,w:DW,h:DH}]);
  B.blk(10,-50.5,4,5,1,Object.assign({name:'landing'},PLAT));B.cp(3,2,-52);
  B.lava(-34.5,-56,34.5,-66);
  for(const s of [-1,1]){B.wallX(-56,s*12,s*34.5);B.wallX(-66,s*12,s*34.5);B.wallZ(s*34.5,-56,-66);B.plat(s*23.25,5.2,-61,22.5,11,{t:.6,col:'#6b6577',mat:'stone'})}
  B.plat(0,.3,-61,2.4,10.2,{col:'#8a6a4a',mat:'wood',name:'crossing'});
  B.kill(-26,1.6,-58.6,14,3.2,2.4,{move:{type:'roll',ax:52,per:6,ph:0},name:'train1'});
  B.kill(26,1.6,-63.4,14,3.2,2.4,{move:{type:'roll',ax:-52,per:6,ph:.25},name:'train2'});
  B.btn('exitBtn',-2.4,-53.4,{timed:'exitdoor',dur:9},{icon:'bolt',col:'#7ef0b4',stand:[-2.4,-54.6]});
  B.door('x',-76,6,'exitdoor',{col:'#16a34a'});
  B.blk(-10.4,-50,1.6,1.4,2.6,Object.assign({name:'vending'},RED));
  B.sign(0,7,-48.55,Math.PI,6,1.4,{title:'Mind the trains',sub:'Wait between the tracks'},{deco:true});
  B.sign(-4,6.6,-75.45,0,7,1.6,{title:'Emergency exit',sub:'The button opens it for 9 seconds'});
  exitHall(B,6,-76);
  for(const z of [-55.8,-66.2])B.deco(0,.03,z,24,.06,.5,{col:'#facc15',mat:'plastic'});
  for(const [x,z] of [[-6,-70],[0,-70]])B.blk(x,z,3,.8,.8,{col:'#7a4e2c',mat:'wood'});
  for(const z of [-8,-30,-40])for(const s of [-1,1])B.poster(s*11.45,z,s<0?Math.PI/2:-Math.PI/2,s<0?'#2563eb':'#b84a3a',{y:5});
  // route
  const c1=W.byName.get('cart1'),cS=W.byName.get('cartS'),cB=W.byName.get('cartB'),t1=W.byName.get('train1'),t2=W.byName.get('train2');
  B.w(-6,0,-9.6);B.j(-6,1,-12.6,{wait:true});B.jon('cart1',0,{wait:true});B.ladder('cart1',t=>cur(c1,t).z<-23.4?'done':'wait');B.j(-6,1,-26.2,{wait:true});
  B.w(-8,1,-26.2);B.w(-7.4,1,-28.4);B.jon('cartS',0,{wait:true});B.ladder('cartS',t=>cur(cS,t).z<-41.8?'done':'wait');B.j(-7.4,1,-44.4,{wait:true});B.w(-9.8,1,-45.4);
  B.w(-7.4,1,-44);B.jon('cartS',0,{wait:true});B.ladder('cartS',t=>cur(cS,t).z>-30.8?'done':'wait');B.j(-6.4,1,-27.8,{wait:true});
  B.use('points',-4.8,1,-26.6);B.w(-4.6,1,-28.6);B.jon('cartB',0,{wait:true});B.ladder('cartB',t=>cur(cB,t).x>6.6?'done':'wait');B.j(10,1,-36.8,{wait:true});
  B.w(10,1,-33.4);B.w(9.2,1,-38);B.w(9.2,1,-45.4);B.w(10,1,-46.6);B.w(10,1,-50);B.w(2,0,-52);B.w(-2.4,0,-54.6);
  B.u(t=>{const x=cur(t1,t).x;return x>8.6&&x<16});B.use('exitBtn',-2.4,0,-54.6);B.w(0,.3,-61);B.u(t=>{const x=cur(t2,t).x;return x<-8.6||x>18});B.w(0,0,-67.4);B.w(6,0,-74);B.w(6,0,-79.4);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}},
// 4. A pump station. The shaft beyond the engine hall can only be reached under water, through the sump: dive past the
// turning impeller for the fuse that fell in (the engineer's note on the wall says how to set the pump's two gauges),
// set the gauges in the engine hall, then swim through to the shaft and put the fuse in. The pump floods the shaft:
// ride the rising water up to the hatch at the top.
{id:'ddpump',name:'High Water',sub:'The pump station',par:110,cave:true,sky:['#18222a','#3e5560'],pal:{floor:'#a9b4b8',wall:'#7d8f95',prop:'#c98b3a',trim:'#22343c'},
msgs:{gauges:'Both gauges set','power':'The fuse is in. The pump has power',pump:'The pump roars. The shaft is flooding!'},unlock:['pump'],
build(B,r){
  const W=B.W,CONC={col:'#9aa6ab',mat:'stone'},IRON={col:'#5b6b73',mat:'metal'},T26={top:26};
  const a=Math.floor(r()*8),b=Math.floor(r()*8);
  W.dials.press={set:'gauges',keys:['pl','pr'],target:{pl:a,pr:b}};W.st.dial.pl=(a+2+Math.floor(r()*5))%8;W.st.dial.pr=(b+2+Math.floor(r()*5))%8;
  B.all(['gauges','power'],'pump');
  // the engine hall: the control desk with the two gauge valves, the pump
  B.floor(-12,7,12,-18,CONC);B.wallX(7,-12.5,12.5);B.wallZ(-12,7,-44);B.wallZ(12,7,-18);
  B.wallX(-18,-12.5,0,[{c:-6,w:DW,h:DH}]);B.wallX(-18,0,12.5,[],T26);
  B.cp(0,0,3.6);
  B.blk(0,-14,8,1.6,1.1,{col:'#4b5563',mat:'metal',name:'desk'});
  B.btn('dialL',-2,-14,{dial:'press',key:'pl',n:8},{top:1.3,noBase:true,icon:'valve',col:'#ef7f45',stand:[-2,-12.3]});
  B.btn('dialR',2,-14,{dial:'press',key:'pr',n:8},{top:1.3,noBase:true,icon:'valve',col:'#38bdf8',stand:[2,-12.3]});
  for(const [x,k,l] of [[-2.4,'pl','Left'],[2.4,'pr','Right']]){B.sign(x,4.4,-17.45,0,3.2,3.6,{w3:'gauge',label:l});B.sign(x,4.6,-17.4,0,2.4,2.4,{hand:k,dial:'press',n:8})}
  B.sign(0,7.4,-17.45,0,7,1.4,{title:'Pump control',sub:'Set both gauges as the engineer says'});
  B.cyl(7.6,4,-6,2.6,{t:5,col:'#c98b3a',mat:'metal',name:'pump'});B.dcyl(7.6,4.3,-6,1.2,.6,{col:'#5b6b73',mat:'metal'});
  B.deco(7.6,6.2,-12,.8,.8,12,{col:'#5b6b73',mat:'metal'});B.deco(7.6,2,-11,1,4,1,{col:'#5b6b73',mat:'metal'});
  B.sign(0,7,6.45,Math.PI,7,1.6,{title:'High Water',sub:'Get the pump going'});
  B.blk(-9.6,-2,2.4,3,2.4,{col:'#c98b3a',mat:'metal',name:'tank'});B.item('gem','gem',-9.6,3.2,-2);
  // the sump: a walkway, a deep pit of water with an impeller turning in it, the fuse at the bottom, the way to the
  // shaft low in the east wall
  B.floor(-12,-18,0,-22,CONC);B.wallX(-44,-12.5,0);B.wallZ(0,-18,-44,[],T26);
  pit(B,-12,-22,0,-44,-6,IRON,[{side:'e',c:-36,w:DW,h:3}]);
  B.water(-12,-22,0,-44,-.6,{y0:-6});
  B.cp(1,-6,-20.4,{w:2.4,d:2});
  B.kill(-6,-3.4,-33,11.6,.5,.5,{move:{type:'spin',w:.9},name:'impeller'});B.cyl(-6,-3.6,-33,.45,{t:2.4,col:'#4b5563',mat:'metal'});
  B.item('fuse','fuse',-10.4,-5.4,-42.4);
  B.sign(-11.45,4.4,-28,Math.PI/2,5.6,3.4,{w3:'gauges',dial:'press'});
  B.sign(-6,6.4,-43.45,0,7,1.6,{title:'The sump',sub:'The fuse fell in. Mind the impeller'});
  // the shaft: a ledge with the fuse box above the water, hot pipes on the walls, the hatch at the top
  B.floor(0,-18,12,-22,CONC);B.wallZ(12,-18,-44,[],T26);B.wallX(-44,0,12.5,[{c:6,w:DW,h:13.4+DH}],T26);
  pit(B,0,-22,12,-44,-6,IRON,[{side:'w',c:-36,w:DW,h:3}]);
  B.water(0,-18,12,-44,-.6,{y0:-6,move:{type:'rise',ay:13.6,dur:16,when:'pump'},name:'flood'});
  B.cp(2,3.6,-20.2,{w:2.4,d:2.2});
  B.panel('fusebox',9,1.6,-18.55,Math.PI,{need:'fuse',then:'power'},{icon:'fuse',col:'#ffd23f',stand:[9,-19.8]});
  B.sign(6,5.6,-18.55,Math.PI,6.4,1.5,{title:'The shaft',sub:'Fuse in: the pump floods it'});
  B.kill(11.2,6,-30,1.6,.6,8,{name:'pipe1'});B.kill(.8,9.6,-34,1.6,.6,8,{name:'pipe2'});B.kill(11.2,11.4,-38,1.6,.6,5,{name:'pipe3'});
  B.plat(10.9,8.2,-24.6,2.2,2,{t:.6,col:'#5b6b73',mat:'metal',name:'gemLedge'});
  B.blk(6,-42.5,6,3,13.4,Object.assign({name:'hatch'},IRON));
  B.blk(6,-47.5,6,7,13.4,Object.assign({name:'exitFloor'},CONC));B.wallZ(3,-44,-51,[],T26);B.wallZ(9,-44,-51,[],T26);B.wallX(-51,2.5,9.5,[],T26);
  B.finish(6,-48.4,{top:13.4,w:3,d:3});B.sign(6,13.4+DH+.75,-43.47,0,2.6,.8,{exit:true});
  // route
  const imp=W.byName.get('impeller');
  B.dial('dialL','press','pl',-2,0,-12.3);B.dial('dialR','press','pr',2,0,-12.3);
  B.w(-6,0,-16);B.w(-6,0,-20.4);B.swim(-9.6,-1.8,-38.4,{tol:.6});B.swim(-10.4,-5.8,-42.2,{tol:.5});B.swim(-10,-1.8,-41,{tol:.6});
  B.swim(-.9,-1.8,-36,{tol:.6,until:t=>barClear(imp,-.9,-36,t,2.6,1)});B.swim(-.9,-5.6,-36,{tol:.6});B.swim(3,-5.6,-36,{tol:.8});
  B.swim(5,0,-20.8,{ground:true});B.w(9,0,-19.8);B.use('fusebox',9,0,-19.8);
  B.swim(6,13.4,-42.2,{ground:true,r:.9});B.w(6,13.4,-48.4);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}}
]});
})(Escapade);
