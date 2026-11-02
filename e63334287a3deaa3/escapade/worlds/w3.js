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
// is a moving part (by its centre, radius part.r or its half-width) at least m away from (x, z) for the next `dur` s?
function farFrom(p,x,z,t,dur,m){const R=(p.r||Math.max(p.hx,p.hz))+.42+m;for(let k=0;k<=dur;k+=.1){const b=cur(p,t+k);if(Math.hypot(b.x-x,b.z-z)<R)return false}return true}
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
}},
// 5. An aquarium after closing time. The feeding chart is up in the keeper's office: feed the crab, the turtle, the fish
// and the squid in its order. The crab's button is at the bottom of its tank among the jellyfish, the turtle's on a rock
// in hers, the fish's at the top of the stairs and the squid's at the bottom of the shark tank. Once everyone's fed, the
// grille at the bottom of the shark tank opens: dive past the shark and swim out through the pipe.
{id:'ddtank',name:'Fish Tank',sub:'The aquarium',par:150,deep:true,sky:['#0b3a5c','#2a8fb8'],pal:{floor:'#dfe9ee',wall:'#7fb3c8',prop:'#f2c14e',trim:'#123247'},
msgs:{fed:'Everyone is fed. The grille in the shark tank opens!'},unlock:['fed'],
build(B,r){
  const W=B.W,T12={top:14},GL={mat:'tank',col:'#d6f3ff'},ROCK={col:'#8a9aa6',mat:'stone'},WD={mat:'wood',col:'#9a7048'};
  W.seqs.feed={order:shuffle(['crab','turtle','fish','squid'],r),set:'fed'};
  // the hall, the keeper's office over the entrance (a ladder up), two small tanks
  B.floor(-14,7,14,-30);B.wallX(7,-14.5,14.5,[],T12);B.wallZ(-14,7,-30,[],T12);B.wallZ(14,7,-30,[],T12);B.wallX(-30,-14.5,14.5,[{c:0,w:DW,h:2.6}],T12);
  B.cp(0,1,3.6);
  B.blk(-8,4.5,12,5,5,Object.assign({name:'office'},WD));B.box(-4,2.5,1.55,1.2,5,.9,{truss:true,mat:'truss',col:'#e2e8f0',name:'ladder'});
  B.cp(1,-11.4,4.4,{top:5,w:2,d:2});
  B.sign(-7.2,5.06,4.4,0,4.6,2.8,{w3:'chart',seq:'feed',flat:true,title:'Feeding time'});
  B.sign(-9.6,2.6,1.95,Math.PI,5,1.3,{title:'Keeper\'s office',sub:'The feeding chart is up here'});
  B.sign(7,7.6,6.45,Math.PI,7.4,1.6,{title:'Fish Tank',sub:'Feed them all, in the right order'});
  // the crab's tank (west): its button at the bottom, two jellyfish
  B.box(-11,1.3,-1,6,4.6,1,GL);B.box(-8,1.3,-6,1,4.6,10,GL);B.box(-11,1.3,-11,6,4.6,1,GL);
  B.water(-13.5,-1.5,-8.5,-10.5,3.2);B.blk(-6.6,-6,1.6,1.6,1.8,WD);
  B.btn('feed_crab',-11.6,-7,{seq:'feed',sym:'crab'},{top:1.2,icon:'crab',col:'#ef6b4a',stand:[-11.6,-5.4]});
  const jelly=(name,x,z,ph)=>B.add({shape:'cyl',x,y:1.4,z,r:.5,h:1.2,kill:true,solid:false,mat:'jelly',col:'#ff3355',cam:false,name,move:{type:'line',ay:1.4,per:3.2,ph}});
  jelly('jelly1',-9.8,-8.6,0);jelly('jelly2',-12.8,-3.2,.5);
  // the turtle's tank (east): her button on a rock, the gem at the bottom
  B.box(11,1.3,-1,6,4.6,1,GL);B.box(8,1.3,-6,1,4.6,10,GL);B.box(11,1.3,-11,6,4.6,1,GL);
  B.water(8.5,-1.5,13.5,-10.5,3.2);B.blk(6.6,-6,1.6,1.6,1.8,WD);
  B.blk(11.8,-6,2.6,2.6,3.8,Object.assign({name:'turtleRock'},ROCK));
  B.btn('feed_turtle',12.6,-6.6,{seq:'feed',sym:'turtle'},{top:4.9,icon:'turtle',col:'#34d399',stand:[11.4,-5.6]});
  B.item('gem','gem',13,.7,-9.8);
  // the shark tank: stairs up the east side (the fish's button at the top), the squid's button at the bottom, the grille
  B.box(0,3.2,-14,20,8.4,1,GL);B.box(-10,3.2,-22,1,8.4,16,GL);B.box(10,3.2,-22,1,8.4,16,GL);
  B.water(-9.5,-14.5,9.5,-30,7);
  [[1.6,-16],[3.2,-19],[4.8,-22],[6.4,-25]].forEach(([top,z],i)=>B.blk(12.25,z,3.5,3,top,Object.assign({name:'stair'+i},ROCK)));
  B.blk(12.25,-28.25,3.5,3.5,7.6,Object.assign({name:'stairTop'},ROCK));B.cp(2,12.6,-27.3,{top:7.6,w:1.8,d:1.2});
  B.btn('feed_fish',13.3,-29.3,{seq:'feed',sym:'fish'},{top:8.7,icon:'fish',col:'#fbbf24',stand:[12.1,-29]});
  B.panel('feed_squid',-6,1.6,-29.45,0,{seq:'feed',sym:'squid'},{icon:'squid',col:'#c084fc',stand:[-6,-28.2]});
  B.add({shape:'cyl',x:6,y:3.2,z:-22,r:.9,h:1.4,kill:true,solid:false,mat:'shark',col:'#ff2a4a',cam:false,name:'shark',move:{type:'orbit',cx:0,cz:-22,rad:6,w:.8,a0:0}});
  for(const [n,rad,w,a0,y,c] of [['fishA',3,-1.1,1,5.4,'#fbbf24'],['fishB',4.4,.9,3,1.6,'#60a5fa']])B.add({x:rad,y,z:-22,w:.9,h:.5,d:.3,deco:true,mat:'fish3',col:c,cam:false,name:n,move:{type:'orbit',cx:0,cz:-22,rad,w,a0}});
  B.door('x',-30,0,'fed',{h:2.6,col:'#5b6b70',part:{mat:'gate'}});
  B.sign(0,9.6,-29.45,0,7.4,1.5,{title:'Shark tank',sub:'Feed everyone and the grille opens'});
  for(const [x,z,h,c] of [[-7,-17,2.4,'#fb7185'],[6,-26,3,'#f97316'],[-3,-27,1.8,'#c084fc'],[7.5,-16.5,2,'#facc15']])B.deco(x,h/2,z,.7,h,.7,{col:c,mat:'plastic',yaw:.6});
  for(const [x,z] of [[-12.6,-8],[-9.4,-2.4],[12.4,-9.6],[9.4,-2.6]])B.deco(x,1.4,z,.25,2.8,.25,{col:'#22c55e',mat:'plastic'});
  // out through the pipe to the keepers' pool
  B.floor(-6,-30,6,-42);B.wallZ(-6,-30,-42,[],T12);B.wallZ(6,-30,-42,[],T12);B.wallX(-42,-6.5,6.5,[],T12);
  B.plat(0,3.2,-32.5,12,5,{t:.6,col:'#7fb3c8',mat:'stone',name:'pipeRoof'});B.water(-6,-30,6,-42,3.4);
  B.blk(0,-40.5,12,3,4,Object.assign({name:'exitFloor'},ROCK));B.finish(0,-40.6,{top:4,w:6,d:2.4});B.sign(0,7,-41.45,0,2.6,.8,{exit:true});
  for(const z of [-6,-20])for(const s of [-1,1])B.poster(s*13.45,z,s<0?Math.PI/2:-Math.PI/2,s<0?'#38bdf8':'#f472b6',{y:6.4,w:2,h:2.6});
  // route: the office first (the chart), then the four in the chart's order, then out through the grille
  const sh=W.byName.get('shark');
  const up=()=>{B.w(12.25,0,-12.6);B.j(12.25,1.6,-16,{wait:true});B.j(12.25,3.2,-19,{wait:true});B.j(12.25,4.8,-22,{wait:true});B.j(12.25,6.4,-25,{wait:true});B.j(11.4,7.6,-28.6,{wait:true});B.w(12.6,7.6,-27.3)};
  const down=()=>{B.j(12.25,6.4,-25,{wait:true});B.j(12.25,4.8,-22,{wait:true});B.j(12.25,3.2,-19,{wait:true});B.j(12.25,1.6,-16,{wait:true});B.w(12.25,0,-12.6)};
  const go={
    crab(){B.w(-5.4,0,-6);B.j(-6.6,1.8,-6,{wait:true});B.j(-8,3.6,-6,{wait:true});B.swim(-11.6,0,-5.4,{ground:true});B.use('feed_crab',-11.6,0,-5.4);B.swim(-8,3.6,-6,{ground:true});B.j(-6.6,1.8,-6,{wait:true});B.w(-5,0,-6.4)},
    turtle(){B.w(5.4,0,-6);B.j(6.6,1.8,-6,{wait:true});B.j(8,3.6,-6,{wait:true});B.swim(11.4,3.8,-5.6,{ground:true});B.use('feed_turtle',11.4,3.8,-5.6);B.swim(8,3.6,-6.4,{ground:true});B.j(6.6,1.8,-6,{wait:true});B.w(5,0,-6.4)},
    fish(){up();B.use('feed_fish',12.1,7.6,-29);down()},
    squid(){up();B.w(10,7.4,-28);B.swim(-6,5.2,-27,{tol:.7});B.swim(-6,0,-28.2,{ground:true});B.use('feed_squid',-6,0,-28.2);B.swim(-6,5.2,-27,{tol:.7});B.swim(10,7.4,-28,{ground:true});B.w(12,7.6,-28);down()}};
  B.w(-4,0,.6);B.ladder('ladder',(t,W,pl)=>pl.gr&&pl.y>4.9?'done':'climb');B.w(-6,5,4.2);B.w(-11.4,5,4.4);B.w(-5,5,2.6);B.w(-5,0,0);
  for(const k of W.seqs.feed.order)go[k]();
  up();B.w(10,7.4,-27.6);B.swim(0,5.2,-27.4,{tol:.7,until:t=>farFrom(sh,0,-29.3,t,2.6,.4)});B.swim(0,0,-29.4,{tol:.7});B.swim(0,0,-33.6,{tol:.8});B.swim(0,0,-37,{tol:.8});
  B.swim(0,4,-39.6,{ground:true});B.w(0,4,-40.6);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}},
// 6. A crystal cavern. Climb the blinking crystals to the lantern, then cross the dark gallery: turn its three mirrors so
// the sunbeam from the crack in the east wall reaches the great crystal, which grows a crystal bridge to the far shore.
// Four coloured crystals in the dark show one digit each, by lantern light only; the card in the geode beyond says in
// which order. Ride the cart round the geode's lava lake to the door.
{id:'ddcrystal',name:'Crystal Clear',sub:'The crystal cavern',par:120,cave:true,night:true,sky:['#160f24','#3b2a55'],pal:{floor:'#6e6280',wall:'#4a3f5c',prop:'#8b7aa8',trim:'#1a1226'},
msgs:{lit:'The great crystal blazes. A bridge of crystal grows!',cavedoor:'Code accepted. The door grinds open'},unlock:['lit','cavedoor'],
build(B,r){
  const W=B.W,RK={col:'#6e6280',mat:'stone'},CR={mat:'glass',col:'#d8b4fe'},cols=['purple','blue','green','gold'];
  W.codes.cave=makeCode(r);W.pads.cave={set:'cavedoor'};W.books={cave:shuffle(cols.slice(),r)};
  const CC={purple:'#c084fc',blue:'#60a5fa',green:'#4ade80',gold:'#facc15'};
  // the cave mouth: blinking crystals over a lava pool up to the lantern's ledge
  B.floor(-12,7,12,-20,RK);B.wallX(7,-12.5,12.5);B.wallZ(-12,7,-56);B.wallZ(12,7,-56);B.wallX(-20,-12.5,12.5,[{c:0,w:DW,h:DH}]);
  B.cp(0,0,3.6);
  B.lava(-12,-3.6,12,-16);
  B.plat(-3.2,1.2,-6.2,2.6,2.6,{timed:{per:3,on:.6,ph:0},mat:'blink',col:'#c4b5fd',name:'blink1'});
  B.plat(-6.6,2.4,-9.4,2.6,2.6,{timed:{per:3,on:.6,ph:.45},mat:'blink',col:'#c4b5fd',name:'blink2'});
  B.blk(-9.5,-16,5,6,4,Object.assign({name:'lampLedge'},RK));B.cp(1,-8.4,-17.6,{top:4,w:2,d:2});
  B.item('lamp','lamp',-10.6,4.7,-14.4);
  B.sign(0,7.2,6.45,Math.PI,7,1.6,{title:'Crystal Clear',sub:'The gallery ahead is pitch dark'});
  B.sign(6,6.2,-19.45,0,6.4,1.5,{title:'The gallery',sub:'Bring a light'});
  for(const [x,z,h,c] of [[10,4,2.6,'#c084fc'],[9,-1,1.6,'#60a5fa'],[-10.6,3,2,'#4ade80'],[10.4,-18,3,'#facc15']])B.deco(x,h/2,z,1,h,1,{col:c,mat:'glass',yaw:.7});
  // the dark gallery: islands over the lava, three mirrors, the sunbeam, the great crystal, the bridge it grows
  B.floor(-12,-20,12,-56,RK);B.dark(-12,-20,12,-56);
  B.lava(-12,-22,12,-52);
  const isle=(name,x,z,w)=>B.plat(x,.6,z,w,w,Object.assign({name,t:1.6},RK));
  isle('i1',3,-26,3.4);isle('i2',3,-40,4);isle('i3',-6,-40,3.4);
  B.plat(5.4,.6,-31,2.4,2.4,{crumble:true,mat:'crumble',col:'#b9a6d6',name:'s1'});
  B.plat(5.4,.6,-35.6,2.4,2.4,{timed:{per:2.8,on:.62,ph:.2},mat:'blink',col:'#c4b5fd',name:'s2'});
  isle('s3',-1.5,-42.8,2.2);
  B.cp(2,4.2,-41.3,{top:.6,w:1.4,d:1.4});
  isle('gemIsle',-8,-28.6,2.4);B.plat(-8,.6,-24.6,2.2,2.2,{crumble:true,mat:'crumble',col:'#b9a6d6',name:'gemStep'});B.item('gem','gem',-8,1.5,-28.6);
  const MIR=[['m1',3,-26],['m2',3,-40],['m3',-6,-40]];
  W.beams.sun={x:11.4,z:-26,dir:[-1,0],y:1.8,set:'lit',mirrors:MIR.map(m=>m[0]),target:{x:-6,z:-50,name:'crystal'},stops:[[-13,-57,-11.5,-19],[11.5,-57,13,-19],[-13,-20.5,13,-19],[-13,-57,13,-55.5]]};
  for(const [n,x,z] of MIR){B.cyl(x,1.1,z,.45,{col:'#3b3355',mat:'metal'});B.add({x,y:1.85,z,w:1.7,h:1.5,d:.16,solid:false,btn:{mirror:'sun'},name:n,mat:'mirror',col:'#dfe7ff',icon:'mirror',cam:false,stand:[x,z+1.1]})}
  do{for(const [n] of MIR)W.st.mir[n]=r()<.5?1:0}while(MIR.every(([n])=>!W.st.mir[n]));
  B.deco(11.45,1.8,-26,.12,1.6,1.6,{col:'#fff7c2',mat:'glass'});B.deco(11.5,6,-26,.1,8,.6,{col:'#fff7c2',mat:'glass'});
  B.blk(-6,-50,1.4,1.4,1.2,RK);B.add({x:-6,y:2.1,z:-50,w:.9,h:1.6,d:.9,deco:true,mat:'crystal',col:'#e9d5ff',name:'crystal'});
  B.plat(3,.6,-44.6,2.6,2.6,{onIf:'lit',mat:'glass',col:'#e9d5ff',name:'bridge1'});B.plat(3,.6,-48.8,2.6,2.6,{onIf:'lit',mat:'glass',col:'#e9d5ff',name:'bridge2'});
  B.sign(-3,6.4,-55.45,0,7,1.6,{title:'The great crystal',sub:'Light it with the sunbeam'});
  // the four coloured crystals (by lantern light)
  const crys=(c,x,z,yaw)=>{const sx=Math.sin(yaw),sz=Math.cos(yaw);B.deco(x-sx*.3,2.4,z-sz*.3,1.6,4.8,.5,{yaw,col:CC[c],mat:'glass'});B.sign(x+sx*.02,4.6,z+sz*.02,yaw,1.8,2.2,{w3:'crystal',key:'cave',col:c,lamp:true})};
  crys(cols[0],-11.4,-34,Math.PI/2);crys(cols[1],11.4,-46,-Math.PI/2);crys(cols[2],-6,-20.6,Math.PI);crys(cols[3],6,-55.4,0);
  B.wallX(-56,-12.5,12.5,[{c:6,w:DW,h:DH}]);
  // the geode: a cart round the lava lake to the keypad
  B.floor(-12,-56,12,-80,RK);B.wallX(-80,-12.5,12.5,[{c:-4,w:DW,h:DH}]);B.wallZ(-12,-56,-80);B.wallZ(12,-56,-80);
  B.lava(-12,-59,12,-76);B.cp(3,2,-57.6);
  B.rail('cart',[[6,1,-60.4],[6,1,-68,3],[-4,1,-68],[-4,1,-74.6]],{v:3.2,dwell:2.4,col:'#6b5a7a'});
  B.blk(10,-68,3.6,4,1,Object.assign({name:'cardIsle'},RK));
  B.sign(11.45,4.2,-68,-Math.PI/2,5.4,3.6,{w3:'order',key:'cave'});
  B.panel('pad',-8,1.6,-79.35,0,{pad:'cave'},{icon:'pad'});
  B.door('x',-80,-4,'cavedoor',{col:'#5b4a6b',part:{mat:'vaultdoor'}});
  B.sign(4,6.4,-79.45,0,7,1.6,{title:'The geode',sub:'Code: the crystals, in the card\'s order'});
  exitHall(B,-4,-80);
  for(const [x,z,h,c] of [[-10,-60,3,'#c084fc'],[10.4,-77,2.4,'#60a5fa'],[-10.6,-77.6,2,'#4ade80'],[9.6,-58,2.6,'#facc15']])B.deco(x,h/2,z,1,h,1,{col:c,mat:'glass',yaw:.7});
  // route
  const cart=W.byName.get('cart');
  B.w(-2.4,0,-2.6);B.j(-3.2,1.2,-6.2,{wait:true});B.j(-6.6,2.4,-9.4,{wait:true});B.j(-8.6,4,-14.4,{wait:true});B.w(-9.6,4,-14.4);B.w(-8.4,4,-17.6);
  B.w(-6,0,-18.2);B.w(0,0,-18.6);B.w(2,0,-21);B.j(3,.6,-24.9,{wait:true});if(W.st.mir.m1)B.use('m1',3,.6,-24.9);
  B.j(5.4,.6,-31,{wait:true});B.j(5.4,.6,-35.6,{wait:true});B.j(3,.6,-38.9,{wait:true});if(W.st.mir.m2)B.use('m2',3,.6,-38.9);
  B.w(4.2,.6,-41.3);B.j(-1.5,.6,-42.8,{wait:true});B.j(-6,.6,-38.9,{wait:true});if(W.st.mir.m3)B.use('m3',-6,.6,-38.9);
  B.u((t,W)=>flagOn(W,'lit',t));B.j(-1.5,.6,-42.8,{wait:true});B.j(2.4,.6,-41.6,{wait:true});B.j(3,.6,-44.6,{wait:true});B.j(3,.6,-48.8,{wait:true});B.j(3,0,-53,{wait:true});
  B.w(6,0,-54.6);B.w(6,0,-57.6);B.w(2,0,-57.6);B.w(6,0,-58.4);B.jon('cart',0,{wait:true});B.ladder('cart',t=>{const c=cur(cart,t);return c.x<-3.9&&c.z<-74.4?'done':'wait'});
  B.j(-4,0,-77,{wait:true});B.use('pad',-8,0,-78.2);B.code('cave');B.w(-4,0,-82);B.w(-4,0,-83.4);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}},
// 7. A sunken ship. Push the cargo crate onto the plate on deck and the trapdoor to the hold opens. Down in the hold
// lie the captain's key and the ship's log with the escape hatch's code, but the floor creaks as you reach them and the
// sea pours in: get back up through the trapdoor before the hold fills. The key opens the captain's cabin at the stern,
// where the code opens the escape hatch.
{id:'ddwreck',name:'Hull Breach',sub:'The sunken ship',par:120,deep:true,sky:['#06223a','#1f5f86'],pal:{floor:'#a07a52',wall:'#7a5a3e',prop:'#c9a24a',trim:'#2b1a10'},
msgs:{hatch:'The crate is on the plate. The trapdoor opens','rise:flood':'The hull groans. The sea is pouring in!',cabin:'The captain\'s cabin unlocks',shipdoor:'Code accepted. The escape hatch opens'},unlock:['hatch','shipdoor'],
build(B,r){
  const W=B.W,DECK={mat:'wood',col:'#a07a52'},PLANK={mat:'wood',col:'#7a5a3e'},CRATE={mat:'wood',col:'#8a6a42'},IRON={col:'#4b5563',mat:'metal'};
  W.codes.ship=makeCode(r);W.pads.ship={set:'shipdoor'};
  // the main deck, over the hold (a trapdoor in the middle), the crate and its plate
  B.wallX(7,-10.5,10.5);B.wallZ(-10,7,-30);B.wallZ(10,7,-30);
  B.floor(-10,7,10,-10,DECK);B.floor(-10,-10,-1.6,-28,DECK);B.floor(1.6,-10,10,-28,DECK);B.floor(-1.6,-10,1.6,-14,DECK);B.floor(-1.6,-17.2,1.6,-28,DECK);B.floor(-10,-28,10,-30,DECK);
  B.cp(0,0,4);
  B.add({x:0,y:-.15,z:-15.6,w:3.2,h:.3,d:3.2,door:'hatch',mat:'door',col:'#6b4a2f',name:'trapdoor',cam:true});
  B.add({x:-6,y:.9,z:-4,w:1.8,h:1.8,d:1.8,push:true,mat:'crate',col:'#c98b3a',name:'crate',lim:[-8.8,-27,8.8,4]});
  B.add({x:6,y:.03,z:-24,w:2.4,h:.06,d:2.4,solid:false,plate:'hatch',mat:'plate',col:'#ffd23f',name:'plate',cam:false});
  B.cp(1,-5,-12.4,{w:2.4,d:2});
  B.sign(0,7,6.45,Math.PI,7,1.6,{title:'Hull Breach',sub:'Crate on the plate opens the hold'});
  // the hold: cargo to climb back up, the key and the log at the far end; the floor there creaks and the sea comes in
  pit(B,-10,-10,10,-28,-6,PLANK);
  B.water(-10,-10,10,-28,-5.4,{y0:-7,move:{type:'rise',ay:4.8,dur:6,trig:'creak'},name:'flood'});
  B.trig('creak',-10,-21,-3,-28,-7,-2);
  const low=(x,z,w,d,top,o)=>B.box(x,(top-6)/2,z,w,top+6,d,o); // standing on the hold's floor (-6)
  low(0,-15.6,2.4,2.4,-3.1,Object.assign({name:'hatchCrate'},CRATE));low(2.8,-15.6,2.4,2.4,-4.6,Object.assign({name:'stepCrate'},CRATE));
  for(const [x,z,w,top] of [[6,-12.4,3,-4.2],[7.6,-24,3,-3.6],[-7.4,-12.6,3.2,-4.4],[-4,-20,2,-5]])low(x,z,w,w,top,CRATE);
  B.item('key','key',-7.6,-5.2,-25.2,{col:'#ffcf3d'});
  B.sign(-9.45,-3.6,-23.4,Math.PI/2,3.6,2.2,{code:'ship',label:'Ship\'s log: escape hatch code'});
  low(-5,-27,1.6,1.6,-4.4,{col:'#c9a24a',mat:'barrel',name:'barrel1'});
  // the stern: the captain's cabin (the key opens it) with the escape hatch's keypad
  B.wallX(-30,-10.5,10.5,[{c:0,w:DW,h:DH}]);
  B.door('x',-30,0,'cabin',{col:'#5b3a22',part:{lock:'key'}});
  B.floor(-10,-30,10,-46,PLANK);B.wallZ(-10,-30,-46);B.wallZ(10,-30,-46);B.wallX(-46,-10.5,10.5,[{c:5,w:DW,h:DH}]);
  B.cp(2,-4,-33);
  B.blk(-5,-40,5,2.4,1.1,{col:'#5b3a22',mat:'wood',name:'desk'});B.blk(7.6,-34,2.4,4,1.2,{col:'#7a2e2e',mat:'plastic',name:'bunk'});
  B.blk(-8.4,-44,2.2,2.2,3.4,Object.assign({name:'chest'},CRATE));B.item('gem','gem',-8.4,4.2,-44);B.blk(-6,-44.4,1.6,1.4,1.8,CRATE);
  B.panel('pad',1.4,1.6,-45.35,0,{pad:'ship'},{icon:'pad'});
  B.door('x',-46,5,'shipdoor',{col:'#4b5563',part:{mat:'vaultdoor'}});
  B.sign(-3,6.4,-45.45,0,6,1.5,{title:'Captain\'s cabin',sub:'The escape hatch needs the code'});
  exitHall(B,5,-46);
  // decor: masts, rails, portholes, barrels, weed
  for(const z of [-6,-38])B.dcyl(0,7,z,.45,14,{col:'#6b4a2f',mat:'wood'});B.deco(0,9.6,-6,9,.3,.3,{col:'#6b4a2f',mat:'wood'});
  for(const z of [2,-8,-20,-36])for(const s of [-1,1])B.win(s*9.5,z,-s*Math.PI/2,{y:5,w:1.6,h:1.6,glass:'#6fb8e0',frame:'#c9a24a',noBar:true});
  for(const [x,z] of [[8,4],[-8.2,3.6],[8.4,-27.4]])B.blk(x,z,1.4,1.4,1.4,{col:'#8a5a34',mat:'barrel'});
  for(const [x,z] of [[-9.4,-2],[9.4,-16],[-9.4,-26]])B.deco(x,2,z,.2,4,1.2,{col:'#2f7a4a',mat:'plastic'});
  // route
  const crate=W.byName.get('crate');
  B.w(-8.2,0,-1.2);B.w(-8.2,0,-4);B.push('crate','x',6);B.w(4,0,-1.4);B.w(6,0,-1.4);B.push('crate','z',-24);B.u((t,W)=>flagOn(W,'hatch',t));
  B.w(4.4,0,-12.2);B.w(-5,0,-12.4);B.w(0,0,-12.4);B.w(0,-3.1,-15.6);B.w(2.8,-4.6,-15.6);B.w(2.8,-6,-19);B.w(-6.6,-6,-24.6);
  B.swim(2.8,-4.6,-15.6,{ground:true});B.swim(0,-3.1,-15.6,{ground:true});B.swim(0,0,-12.6,{ground:true});
  B.w(4.4,0,-12.6);B.w(4.4,0,-27);B.w(0,0,-27.4);B.w(0,0,-31);B.w(-4,0,-33);B.use('pad',1.4,0,-44.2);B.code('ship');B.w(5,0,-48);B.w(5,0,-49.4);
  W.spawn={x:0,y:0,z:4,yaw:0};
}},
// 8. The finale: the heart of a volcano. The vault door needs all three relics woken: the lever at the end of the lava
// tubes (west, pitch dark: take the lantern), the valve past the drowned passage in the hot springs (east, through a
// steam geyser), and the button on the island in the lava lake, where the ore cart stops halfway. Beyond the vault is
// the way up: the moment you step into the shaft the lava starts rising. Climb!
{id:'ddcore',name:'Hot Core',sub:'The heart of the volcano',par:200,cave:true,sky:['#1a0b08','#5a2414'],pal:{floor:'#4a3a36',wall:'#3a2c28',prop:'#7a5040',trim:'#140a08'},
msgs:{tubes:'The lava tubes\' lever is down. One relic of three',spring:'The spring valve turns. One relic of three',ore:'The ore button glows. One relic of three',
  vault:'All three relics awake! The vault opens','rise:magma':'The lava is rising! Climb!'},unlock:['vault'],
build(B,r){
  const W=B.W,BAS={col:'#4a3a36',mat:'stone'},HOT={col:'#7a3a2a',mat:'stone'},T30={top:30};
  B.all(['tubes','spring','ore'],'vault');
  const col=(name,x,top,z,w,o)=>B.plat(x,top,z,w||2.6,w||2.6,Object.assign({name,t:top+1},BAS,o));
  const crust=(name,x,top,z)=>B.plat(x,top,z,2.2,2.2,{crumble:true,mat:'crumble',col:'#8a5a40',name});
  // the hub: the lantern by the west door, the ore cart over the lava lake (it stops by the island), the vault door
  B.floor(-12,7,12,-26,BAS);B.wallX(7,-12.5,12.5);B.wallZ(-12,7,-26,[{c:0,w:DW,h:DH}]);B.wallZ(12,7,-26,[{c:0,w:DW,h:DH}]);
  B.wallX(-26,-12.5,12.5,[{c:0,w:DW,h:DH}]);
  B.cp(0,0,3.6);
  B.cyl(-9,1,3,.7,{col:'#5b4636',mat:'stone',name:'lampRock'});B.item('lamp','lamp',-9,1.6,3);
  B.lava(-12,-6,12,-22);
  B.rail('cart',[[6,1,-7.4],[6,1,-14,3.2],[6,1,-20.6]],{v:3,dwell:2.4,col:'#6b4a3a'});
  B.blk(10.2,-14,3.2,3.6,1,Object.assign({name:'oreIsle'},HOT));
  B.btn('oreBtn',10.6,-14.9,{set:'ore'},{top:2.1,icon:'bolt',col:'#f97316',stand:[9.6,-13.4]});
  B.door('x',-26,0,'vault',{col:'#5a3a2a',part:{mat:'vaultdoor'}});B.cp(1,-4,-24);
  B.sign(0,7.4,6.45,Math.PI,7.6,1.6,{title:'Hot Core',sub:'Wake three relics: west, east and the lake'});
  B.sign(-6,6.6,-25.45,0,6.6,1.5,{title:'The vault',sub:'Opens when all three are awake'});
  B.sign(-11.45,6.4,-1,Math.PI/2,5.4,1.4,{title:'Lava tubes',sub:'Pitch dark'});B.sign(11.45,6.4,-1,-Math.PI/2,5.4,1.4,{title:'Hot springs',sub:'Hold your breath'});
  // west: the lava tubes (dark): columns, crusts that crumble, a steam vent, the lever at the end
  B.floor(-44,6,-12,-6,BAS);B.wallX(6,-44.5,-12);B.wallX(-6,-44.5,-12);B.wallZ(-44,6,-6);B.dark(-44,6,-12,-6);
  B.lava(-40.4,6,-14,-6);
  col('c1',-16.2,1,1.6);crust('crust1',-19.6,1.2,-1);col('c2',-23,1.6,1.2);
  B.laser(-25.8,2.5,0,.8,5,12,{timed:{per:2.4,on:.45,ph:0},name:'vent'});B.deco(-25.8,.15,0,1.4,.3,12,{col:'#3a2c28',mat:'metal'});
  col('c3',-28.4,1.6,-1);crust('crust2',-31.8,1.2,1);col('c4',-35.2,1.6,-.6);col('c5',-38.4,1.2,1,2.4);
  col('gemCol',-30,3.2,-4.4,2.2);B.item('gem','gem',-30,4,-4.4);
  B.btn('tubeLever',-42.8,0,{set:'tubes'},{icon:'lever',col:'#ffd23f',stand:[-41.4,0]});
  // east: the hot springs: a deep pool, the way on only under the rock (past a geyser), the valve on the far island
  B.floor(12,6,14,-6,BAS);B.wallX(6,12,44.5);B.wallX(-6,12,44.5);B.wallZ(44,6,-6);
  pit(B,14,6,44,-6,-5,HOT);B.water(14,6,44,-6,-.6,{y0:-5});
  B.box(30,4.4,0,12,11.2,12,Object.assign({name:'rockShelf'},BAS));
  B.laser(30,-3,0,.8,4,11.4,{timed:{per:3,on:.4,ph:0},name:'geyser'});
  B.box(41,-2.5,0,4,5,6,Object.assign({name:'farIsle'},HOT));
  B.btn('springValve',42,.4,{set:'spring'},{top:1.1,icon:'valve',col:'#38bdf8',stand:[40.8,-.8]});
  // north: the shaft. Step in and the lava rises; climb the ledges, the ladder and the lift to the way out at the top
  B.floor(-8,-26,8,-46,BAS);B.wallZ(-8,-26,-46,[],T30);B.wallZ(8,-26,-46,[],T30);B.wallX(-46,-8.5,8.5,[{c:0,w:DW,h:16+DH}],T30);
  B.cp(2,3,-27.6,{w:2.4,d:1.8});
  B.lava(-8,-26,8,-46,{y:-3.35,move:{type:'rise',ay:18.3,dur:42,trig:'shaft'},name:'magma'});
  B.trig('shaft',-8,-26.5,8,-31,-1,4);
  [[5.6,1.8,-31],[5.6,3.6,-36],[5.6,5.4,-41.4],[0,7.2,-41.6]].forEach(([x,top,z],i)=>col('p'+i,x,top,z,3));
  B.plat(-5.6,9,-41.4,2.6,2.6,{crumble:true,mat:'crumble',col:'#8a5a40',name:'p4'});
  col('p5',-5.6,10.8,-36,3);col('p6',-5.6,12.6,-31,3);col('p7',0,14.4,-29,2.8);
  B.plat(0,15.8,-32.6,2.8,2.8,{move:{type:'line',az:-8.4,per:6},mat:'metal',col:'#9aa3ad',name:'shuttle'});
  B.blk(0,-44.8,6,2.4,16,Object.assign({name:'top'},BAS));
  B.blk(0,-48.5,6,5,16,Object.assign({name:'exitFloor'},BAS));B.wallZ(-3,-46,-51,[],T30);B.wallZ(3,-46,-51,[],T30);B.wallX(-51,-3.5,3.5,[],T30);
  B.finish(0,-48.6,{top:16,w:3,d:3});B.sign(0,16+DH+.75,-45.47,0,2.6,.8,{exit:true});
  B.sign(0,7,-26.55,Math.PI,6.4,1.5,{title:'The way up',sub:'Don\'t stop climbing'},{deco:true});
  // decor: glowing cracks, basalt pillars
  for(const [x,z,w,d] of [[-6,4,4,.25],[7,1,.25,4],[3,-24,5,.25],[-30,4.8,6,.25],[20,5,.25,1]])B.deco(x,.03,z,w,.06,d,{col:'#ff7a3d',mat:'glass'});
  for(const [x,z] of [[-10.6,-24],[10.6,-24],[10.6,5.6]])B.blk(x,z,1.4,1.4,4,{col:'#2f2420',mat:'stone'});
  // route: the tubes, the springs, the lake, then the shaft
  const cart=W.byName.get('cart'),sh=W.byName.get('shuttle');
  const geyOff=(t,d)=>{for(let k=0;k<=d;k+=.1)if(((t+k)/3)%1<.42)return false;return true}; // the geyser is on for .4 of every 3 s
  B.w(-8.6,0,1.8);B.w(-11,0,0);B.w(-13.4,0,0);
  B.j(-16.2,1,1.6,{wait:true});B.j(-19.6,1.2,-1,{wait:true});B.j(-23,1.6,1.2,{wait:true});B.j(-28.4,1.6,-1,{wait:true});B.j(-31.8,1.2,1,{wait:true});
  B.j(-35.2,1.6,-.6,{wait:true});B.j(-38.4,1.2,1,{wait:true});B.j(-41.6,0,0,{wait:true});B.use('tubeLever',-41.4,0,0);
  B.j(-38.4,1.2,1,{wait:true});B.j(-35.2,1.6,-.6,{wait:true});B.j(-31.8,1.2,1,{wait:true});B.j(-28.4,1.6,-1,{wait:true});B.j(-23,1.6,1.2,{wait:true});
  B.j(-19.6,1.2,-1,{wait:true});B.j(-16.2,1,1.6,{wait:true});B.j(-13,0,0,{wait:true});
  B.w(11,0,0);B.w(13.2,0,0);B.swim(22,-2.2,0,{tol:.7});B.swim(23.2,-4.4,0,{tol:.6});B.swim(28.2,-4.4,0,{tol:.7,until:t=>geyOff(t,1.4)});B.swim(36.4,-4.4,0,{tol:.8});
  B.swim(38.4,-2.2,0,{tol:.8});B.swim(40.6,0,-.8,{ground:true});B.use('springValve',40.8,0,-.8);
  B.swim(36.6,-4.4,0,{tol:.7});B.swim(31.8,-4.4,0,{tol:.7,until:t=>geyOff(t,1.4)});B.swim(23.4,-4.4,0,{tol:.8});B.swim(14.6,-2.2,0,{tol:.8});B.swim(13,0,0,{ground:true});
  B.w(8,0,-1);B.w(6,0,-4.6);B.jon('cart',0,{wait:true});B.ladder('cart',t=>Math.abs(cur(cart,t).z+14)<.05?'done':'wait');
  B.j(9.6,1,-13.4,{wait:true});B.use('oreBtn',9.6,1,-13.4);B.jon('cart',0,{wait:true});B.ladder('cart',t=>cur(cart,t).z<-20.4?'done':'wait');
  B.j(6,0,-23.4,{wait:true});B.w(-4,0,-24);B.u((t,W)=>flagOn(W,'vault',t));B.w(0,0,-26);B.w(3,0,-27.6);
  B.j(5.6,1.8,-31,{wait:true});B.j(5.6,3.6,-36,{wait:true});B.j(5.6,5.4,-41.4,{wait:true});B.j(0,7.2,-41.6,{wait:true});B.j(-5.6,9,-41.4,{wait:true});
  B.j(-5.6,10.8,-36,{wait:true});B.j(-5.6,12.6,-31,{wait:true});B.j(0,14.4,-29,{wait:true});B.jon('shuttle',0,{wait:true});B.ladder('shuttle',t=>cur(sh,t).z<-40.6?'done':'wait');
  B.j(0,16,-44.4,{wait:true});B.w(0,16,-48.6);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}}
]});
})(Escapade);
