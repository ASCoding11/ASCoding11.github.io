// World 5: Sky High. Everything is high above the clouds: balloons, a circus, a storm, a tower, an airship, a cloud
// castle, a satellite and the eye of a storm. New here (all in the page's CORE, see README.md section 11): updrafts
// (B.lift), cannons you fire yourself from (B.cannon), lightning on a timer with rods that catch it (B.bolt) and rooms
// that turn round when you press a button (B.turning, B.turnBtn, B.align). Falling into the clouds is a fall.
(function(E){
'use strict';
const {DW,DH,TAU,cur,flagOn,phaseOn,makeCode,shuffle}=E;
// the bot's stick toward (x, z) (for B.drive plans)
const go=(pl,x,z,jp)=>{const dx=x-pl.x,dz=z-pl.z,d=Math.hypot(dx,dz);if(d<.05)return{x:0,z:0,jp:!!jp};const k=Math.min(1,d/.45)/d;return{x:dx*k,z:dz*k,jp:!!jp}};
const on=(pl,name)=>pl.gr&&pl.gp&&pl.gp.name===name;
// a hot-air balloon: a wicker basket (a platform) under a striped envelope, moving together
const balloon=(B,name,x,top,z,col,move,o)=>{o=o||{};
  const p=B.plat(x,top,z,o.w||2.8,o.d||2.8,Object.assign({mat:'wood',col:'#c8955c',name,move},o.part));
  const e=Object.assign({move,col},o.env);B.dcyl(x,top+(o.lift||5.4),z,o.r||2.3,o.h||4.4,e);
  return p};
E.world({n:5,needs:3,levels:[
// 1. A balloon festival on islands in the sky: hop the bobbing baskets in the gusts, turn the burner's valve and ride
// its hot air up to a crow's nest for the fuse (and half the tower's code), drop back down, power the cable car and
// read the other half from its pylon, then ride the mooring tower's updrafts (the top one comes and goes) to the
// big balloon's basket.
{id:'balloonfest',name:'Hot Air',sub:'The balloon festival',par:125,clouds:true,sky:['#7cc4ff','#fff1d6'],pal:{floor:'#9fd38a',wall:'#e9e2d0',prop:'#e07a5f',trim:'#3d405b'},
msgs:{burn:'The burner roars for',power:'The fuse is in. The cable car runs',towerdoor:'Code accepted. The tower door opens'},unlock:['power','towerdoor'],
build(B,r){
  B.sky();const W=B.W,GRASS={mat:'floor',col:'#9fd38a',t:3},ROCK={col:'#a89f91',mat:'stone'},WICK={mat:'wood',col:'#c8955c'};
  W.killY=-10;W.codes.sky=makeCode(r);W.pads.sky={set:'towerdoor'};
  // the festival field (start)
  B.plat(0,0,-1,18,14,Object.assign({name:'isleA'},GRASS));
  B.cp(0,0,3.5);
  for(const [x,z,c] of [[-6,2,'#e07a5f'],[6,1.5,'#3d7fd1']]){B.blk(x,z,3,3,1.8,{col:'#f1ece0',mat:'plastic'});B.dcyl(x,2.4,z,2.1,1.2,{col:c})}
  B.sign(-4.5,2.4,-7.6,0,5,1.4,{title:'Hot Air',sub:'The balloon festival'});for(const x of [-6.8,-2.2])B.deco(x,.9,-7.65,.2,1.8,.2,{col:'#6b4f2a'});
  // the balloons over the gap, in gusts from the east
  balloon(B,'b1',-2,1,-11.5,'#ef476f',{type:'line',ay:2,per:4.4});
  balloon(B,'b2',3,2,-16.2,'#ffd166',{type:'line',ax:-5,per:6});
  balloon(B,'b3',-1,2.5,-21,'#06d6a0',{type:'line',ay:1.8,per:5,ph:.5});
  B.wind(-14,-8.2,14,-26,-3,14,[-4.5,0],{timed:{per:4.2,on:.36,ph:.2},name:'gust1'});
  // the launch field: the burner (its valve gives nine seconds of hot air), the fuse box, the cable car station
  B.plat(0,2,-35,20,18,Object.assign({name:'isleB'},GRASS));
  B.cp(1,0,-28.5,{top:2});
  B.cyl(-6,2.3,-34,1.5,{t:.6,mat:'metal',col:'#5b6475',name:'burner'});B.dcyl(-6,2.36,-34,1.1,.1,{col:'#ff7a3d',mat:'glass'});
  B.lift(-7.4,-35.4,-4.6,-32.6,2,17.5,{onIf:'burn',name:'hot1'});
  B.btn('valve',-2.5,-31,{w5:'timer',flag:'burn',dur:9},{top:3.1,icon:'valve',col:'#ef7f45',stand:[-2.5,-29.8]});
  // the crow's nest: the fuse and the first half of the code; a kite with the gem
  B.plat(-6,14,-39,3,3.4,Object.assign({name:'nest'},WICK));B.dcyl(-6,22.4,-39,3.2,6,{col:'#7c5cff'});B.dcyl(-6,26,-39,2.2,1.4,{col:'#7c5cff'});
  for(const s of [-1,1])B.deco(-6+s*1.45,14.4,-39,.12,.8,3.4,WICK);
  B.item('fuse','fuse',-6,14.9,-39.4);
  B.sign(-6,15.3,-40.6,0,2.6,1.3,{code:'sky',half:0,label:'Tower code, 1st half'});
  B.plat(-11.4,15.2,-39,2,2,{name:'kite',col:'#f15bb5'});B.item('gem','gem',-11.4,16,-39);
  // the fuse box and the cable car (it runs once the fuse is in) with the pylon carrying the code's second half
  B.btn('fusebox',6,-41,{need:'fuse',then:'power'},{top:3.2,icon:'fuse',col:'#ffd23f',stand:[6,-39.6]});
  const CAR={type:'line',az:-19,per:13};
  B.plat(7,2.4,-46.6,3.2,3.2,{onIf:'power',move:CAR,mat:'metal',col:'#e0453a',name:'car'});
  B.deco(7,5.8,-46.6,3.4,.25,3.4,{onIf:'power',move:CAR,col:'#f1ece0'});
  B.deco(7,6.5,-56,.12,.12,24,{col:'#3d405b',mat:'metal'});
  B.deco(10.6,-4,-56,.6,20,.6,{col:'#6b7280',mat:'metal'});B.deco(9,6.3,-56,3.6,.4,.4,{col:'#6b7280',mat:'metal'});
  B.sign(10.25,4.4,-56,-Math.PI/2,2.6,1.5,{code:'sky',half:1,label:'Tower code, 2nd half'});
  B.wind(2,-44.5,16,-67,0,14,[4,0],{timed:{per:5,on:.3,ph:.1},name:'gust2'});
  // the mooring island and its tower: a door with a keypad, a steady updraft to a ledge, a gusty one to the top
  B.plat(0,3,-76,18,17,Object.assign({name:'isleD'},GRASS));
  B.cp(2,5.6,-70.4,{top:3});
  const T={col:'#d9cbb0',mat:'stone'};
  B.blk(-2.3,-71.5,1.4,1,16,T);B.blk(2.3,-71.5,1.4,1,16,T);B.box(0,11.8,-71.5,3.2,8.4,1,T);
  B.blk(-3.5,-76,1,10,16,T);B.blk(3.5,-76,1,10,16,T);B.blk(0,-80.5,6,1,16,T);
  B.door('x',-71.5,0,'towerdoor',{col:'#8a5a34',part:{y:5.3}});
  B.panel('pad',2.6,4.8,-70.85,0,{pad:'sky'},{icon:'pad',stand:[2.4,-69.6]});
  B.lift(-3,-72,3,-75.3,3,14.5,{name:'up1'});
  B.plat(0,12,-77.6,6,4.4,Object.assign({name:'ledge'},WICK));
  B.lift(-3,-77.4,3,-80,12,25.5,{timed:{per:4,on:.62,ph:0},name:'up2'});
  // the Skylark: its basket is the way out
  B.plat(0,21,-84.2,4.6,4.6,Object.assign({name:'basket',t:1.2},WICK));
  for(const [x,z,w,d] of [[0,-86.4,4.6,.2],[-2.2,-84.2,.2,4.6],[2.2,-84.2,.2,4.6]])B.deco(x,21.5,z,w,1,d,WICK);
  B.dcyl(0,30.5,-84.2,4.6,8,{col:'#ef476f'});B.dcyl(0,35,-84.2,3,1.4,{col:'#ef476f'});
  for(const [x,z] of [[-1.9,-82.3],[1.9,-82.3],[-1.9,-86.1],[1.9,-86.1]])B.deco(x,24.2,z,.08,6,.08,{col:'#6b4f2a'});
  B.finish(0,-84.2,{top:21,w:3.6,d:3.6});B.sign(0,24.9,-86.4,0,2.6,.8,{exit:true});
  // more balloons drifting round the festival
  for(const [x,y,z,c,s] of [[22,8,-20,'#ffd166',1],[-24,14,-48,'#06d6a0',1.3],[20,18,-70,'#118ab2',1.1],[-18,4,-6,'#ef476f',.9],[-20,24,-88,'#ffd166',1.2]]){
    B.dcyl(x,y,z,2.6*s,4.6*s,{col:c});B.dcyl(x,y+2.9*s,z,1.7*s,1.2*s,{col:c});B.deco(x,y-4*s,z,1.4*s,1*s,1.4*s,WICK)}
  // route
  const car=W.byName.get('car'),up2=W.byName.get('up2');
  B.w(-2,0,-6.6);B.jon('b1',0,{wait:true});B.jon('b2',0,{wait:true});B.jon('b3',0,{wait:true});B.j(-3,2,-29,{wait:true});
  B.w(0,2,-28.6);B.w(-2.5,2,-29.8);B.use('valve',-2.5,2,-29.8);
  B.drive((t,W,pl)=>on(pl,'nest')?'done':pl.y>16.2?go(pl,-6,-39.2):go(pl,-6,-34));
  B.w(-6,14,-39.4);B.j(-1,2,-38.5,{wait:true});
  B.w(6,2,-39.6);B.use('fusebox',6,2,-39.6);
  B.w(7,2,-43.2);B.jon('car',0,{wait:true});B.ladder('car',(t)=>cur(car,t).z<-65.1?'done':'wait');B.j(6.6,3,-68.4,{wait:true});
  B.w(5.6,3,-70.4);B.w(2.4,3,-69.6);B.use('pad',2.4,3,-69.6);B.code('sky');
  // up the tower: the steady updraft to the ledge, then the gusty one when it has just come on (back down: again)
  B.w(0,3,-70.8);
  B.drive((t,W,pl)=>{if(pl.y>23.2)return go(pl,0,-84.2);if(on(pl,'ledge'))return phaseOn(up2.timed,t)&&E.phaseLeft(up2.timed,t)>2.2?go(pl,0,-78.7):go(pl,0,-76.4);
    if(pl.y>13.3||pl.z<-77.2)return go(pl,0,pl.z<-77.2?-78.7:-76.4);const g=go(pl,0,-73.6);if(pl.gr){g.x*=.35;g.z*=.35}return g});
  W.spawn={x:0,y:0,z:3.5,yaw:0};
}},
// 2. A flying circus. A cannon fires you up to the high wire; over the swinging trapezes to the ring. Another cannon
// throws you up to the powder store, where the poster shows tonight's order of bells. Load the big cannon in the
// middle of the ring, turn it to face each coloured net in that order, fire, ring the net's bell and bounce back on
// its trampoline. When the act is done the cage at the back opens: its cannon fires you to the way out.
{id:'bigtop',name:'Big Top',sub:'The flying circus',par:190,clouds:true,sky:['#5aa9e6','#ffe3c2'],pal:{floor:'#e9c46a',wall:'#c0392b',prop:'#f4a261',trim:'#264653'},
msgs:{powder:'The big cannon is loaded',show:'What an act! The cage at the back opens'},unlock:['show'],
build(B,r){
  B.sky();const W=B.W,RED={col:'#c0392b',mat:'plastic'},CREAM={col:'#f6ecd8',mat:'plastic'},WOOD={col:'#8a5a36',mat:'wood'};
  W.killY=-10;
  const COLS={red:'#e63946',yellow:'#ffd166',green:'#2a9d8f',blue:'#457b9d'},names=Object.keys(COLS);
  const order=shuffle(names.slice(),r),ks=shuffle([1,2,6,7],r);
  W.seqs.show={order,set:'show'};
  const RC=-64,D=24,dir=k=>[-Math.sin(k*Math.PI/4),-Math.cos(k*Math.PI/4)];
  // the ticket island and the first cannon, up to the high wire
  B.plat(0,0,0,14,12,{t:3,mat:'floor',col:'#e9c46a',name:'isleA'});
  B.cp(0,0,3.4);
  B.cannon('c1',0,1.2,-3,{to:[0,8,-26.6],vy:30});
  B.sign(-4.6,2.6,-5.9,0,4.6,1.4,{title:'Big Top',sub:'The flying circus'});for(const x of [-6.6,-2.6])B.deco(x,1,-5.95,.2,2,.2,WOOD);
  for(const x of [-5.5,5.5]){B.blk(x,3,2.4,2.4,2.2,RED);B.dcyl(x,2.8,3,1.5,1.2,CREAM)}
  // the high wire: a platform, a rope with a swinging club over it, two trapezes
  B.plat(0,8,-27,5,4.4,Object.assign({name:'H'},WOOD));B.cp(1,0,-26.4,{top:8,w:2.6,d:2.6});
  B.plat(0,7.8,-33.6,.9,8.8,{name:'rope',col:'#f6ecd8',mat:'plastic'});
  B.kill(0,9.1,-34.2,2,.8,.5,{move:{type:'swing',dx:1,len:6,amp:.5,per:3},name:'club'});B.deco(0,15.2,-34.2,8,.3,.3,WOOD);
  B.plat(0,7,-41.6,2.4,2.4,{move:{type:'swing',dx:1,len:8,amp:.42,per:4.2},mat:'metal',col:'#e9c46a',name:'trap1'});
  B.plat(0,6,-45.8,2.4,2.4,{move:{type:'swing',dx:1,len:8,amp:.42,per:4.2,ph:.5},mat:'metal',col:'#e9c46a',name:'trap2'});
  B.deco(0,15.2,-43.7,18,.3,.3,WOOD);
  // the ring: the big cannon on its turntable, its turn button, the powder store's cannon
  B.cyl(0,0,RC,15,{t:3,mat:'floor',col:'#e9c46a',name:'ring'});B.dcyl(0,-.12,RC,15.1,.3,{col:'#c0392b'});
  B.cp(2,0,-51.4);
  const T=(20+20)/46,SP=D/T;
  B.turning('aim',0,RC,8,()=>{B.cannon('aim',0,1.6,RC,{sp:SP,vy:20,yaw:0,r:.95,pow:'powder',col:'#7c2d12'})});
  B.turnBtn('aimBtn',0,RC+3,'aim',{top:1.3,stand:[0,RC+4.2]});
  B.cannon('c2',-7,1.6,-58,{to:[8,9,-58],vy:28,col:'#264653'});
  // the powder store, high over the ring: the powder and tonight's order of bells
  B.plat(8,9,-58,4.4,4.4,Object.assign({name:'P'},WOOD));
  B.btn('powder',9.4,-59.4,{set:'powder'},{top:10.1,icon:'w5-powder',col:'#f4a261',stand:[8.4,-58.2]});
  B.sign(8,10.7,-60.15,0,4.2,2,{w5:'flags',cols:order.map(c=>COLS[c]),title:'Tonight: ring the bells in this order'});B.deco(8,10,-60.25,.2,2,.2,WOOD);
  B.plat(12.7,10.2,-57,1.6,1.6,{name:'perch',col:'#f15bb5'});B.item('gem','gem',12.7,11,-57);
  // the four nets, each with its bell and a trampoline back to the ring
  ks.forEach((k,i)=>{const c=names[i],[ux,uz]=dir(k),x=ux*D,z=RC+uz*D,col=COLS[c];
    B.plat(x,1.6,z,6.8,5,{name:'net_'+c,col,mat:'plastic',yaw:k*Math.PI/4});
    B.btn('bell_'+c,x+ux*1.5,z+uz*1.5,{seq:'show',sym:c},{top:2.7,icon:'bell',col,stand:[x,z]});
    B.plat(x-ux*1.75-uz*2.6,1.75,z-uz*1.75+ux*2.6,1.4,1.4,{bounce:27,mat:'bounce',col:'#c084fc',name:'tramp_'+c,yaw:k*Math.PI/4});
    B.deco(x+ux*2.2-uz*2.2,4,z+uz*2.2+ux*2.2,.2,5,.2,WOOD);B.deco(x+ux*2.2-uz*2.2+uz*.1,5.8,z+uz*2.2+ux*2.2-ux*.1,1.6,1,.1,{col,yaw:k*Math.PI/4+Math.PI/2})});
  // the cage at the back (opens with the act) and its cannon to the way out
  const CG={col:'#7c2d12',mat:'wood'};
  B.blk(-2.25,-70.5,1.3,.6,7,CG);B.blk(2.25,-70.5,1.3,.6,7,CG);B.box(0,5.8,-70.5,3.2,2.4,.6,CG);
  B.blk(-2.6,-76.4,.6,11.8,7,CG);B.blk(2.6,-76.4,.6,11.8,7,CG);B.box(0,7.3,-72.6,5.8,.6,4.8,CG);
  B.door('x',-70.5,0,'show',{col:'#c0392b',part:{mat:'gate'}});
  B.cannon('c3',0,1.6,-76.6,{to:[0,6,-98],vy:26,col:'#264653'});
  B.plat(0,6,-98,6.4,6.4,{t:2,name:'X',mat:'floor',col:'#e8fff1'});B.finish(0,-98,{top:6});
  B.sign(0,9.6,-101.1,0,2.6,.8,{exit:true});B.deco(0,8,-101.2,.3,4,.3,WOOD);
  // bunting and striped poles round the ring
  for(let i=0;i<10;i++){const a=i/10*TAU+.3,x=Math.cos(a)*14.4,z=RC+Math.sin(a)*14.4;if(z<-70&&Math.abs(x)<4)continue;B.dcyl(x,2.5,z,.18,5,i%2?RED:CREAM)}
  // route: the high wire, the powder store, the four bells in order, the cage
  const club=W.byName.get('club');
  B.w(0,0,-.8);B.j(0,1.2,-3,{wait:true});B.fire('c1',['H','cp1']);B.w(0,8,-26.4);
  B.w(0,8,-28.8);B.u((t)=>cur(club,t).x>1.6);B.w(0,7.8,-37.4);
  B.jon('trap1',0,{wait:true});B.jon('trap2',0,{wait:true});B.j(-2,0,-52.2,{wait:true});B.w(0,0,-51.4);
  B.w(-7,0,-55.6);B.j(-7,1.6,-58,{wait:true});B.fire('c2',['P']);B.w(8.4,9,-58.2);B.use('powder',8.4,9,-58.2);B.j(4,0,-60,{wait:true});
  for(const c of order){const k=ks[names.indexOf(c)],[ux,uz]=dir(k),x=ux*D,z=RC+uz*D;
    B.w(0,0,RC+4.2);B.turnTo('aimBtn','aim',k);B.w(2.6,0,RC+2.4);B.w(2.6,0,RC+.4);B.j(0,1.6,RC,{wait:true});B.fire('aim',['net_'+c]);
    const tx=x-ux*1.75-uz*2.6,tz=z-uz*1.75+ux*2.6;
    B.w(x,1.6,z);B.use('bell_'+c,x,1.6,z);B.w(x-ux*.6-uz*1.6,1.6,z-uz*.6+ux*1.6);
    B.drive((t,W,pl)=>on(pl,'ring')?'done':pl.gr&&pl.y>1.5?go(pl,tx-ux*.5,tz-uz*.5):go(pl,ux*11,RC+uz*11))}
  B.u((t,W)=>flagOn(W,'show',t));B.w(0,0,-69);B.w(0,0,-74);B.j(0,1.6,-76.6,{wait:true});B.fire('c3',['X']);B.w(0,6,-98);
  W.spawn={x:0,y:0,z:3.4,yaw:0};
}},
// 3. The roofs of a skyscraper in a thunderstorm. Lightning strikes on a timer (watch the ring on the ground). Dodge it
// along the girder, ride the crane's hook to the next tower, ride the window cleaner's cradle down its wall for the
// keycard, open the rod's cage and raise the lightning rod: every strike on it lights the bridge for seven seconds.
// Over it, through more lightning, to the helipad tower; its code is half on the billboard, half on the crane.
{id:'thunderclap',name:'Thunderclap',sub:'The skyscraper in a storm',par:140,clouds:'#59617a',night:true,sky:['#1d2333','#5d6680'],pal:{floor:'#8b93a7',wall:'#c9ced8',prop:'#5b6475',trim:'#1b1f2b'},
msgs:{'rod:on':'The lightning rod goes up','rod:off':'The lightning rod goes down',bridge:'Lightning hits the rod! The bridge lights up',cagedoor:'The keycard opens the cage',helidoor:'Code accepted. The vent door opens'},unlock:['helidoor'],
build(B,r){
  B.sky();const W=B.W,ROOF={col:'#8b93a7',mat:'floor'},STEEL={col:'#5b6475',mat:'metal'},GIRD={col:'#e0a33a',mat:'metal'},CON={col:'#9aa1b3',mat:'stone'};
  W.killY=-10;W.codes.heli=makeCode(r);W.pads.heli={set:'helidoor'};
  const tower=(x,z,w,d,top,name)=>{B.blk(x,z,w,d,top,Object.assign({name},ROOF));B.deco(x,top-14,z,w-.4,26,d-.4,{col:'#4b5263',mat:'wall'})};
  // the first roof and the girder, with lightning striking along it
  tower(0,-2,16,18,0,'roofA');
  B.cp(0,0,4);
  for(const [x,z] of [[-7.6,-2],[7.6,-2]])B.deco(x,.5,z,.4,1,18,CON);
  B.blk(-4.5,4.5,3.6,3.6,2.6,CON);
  B.sign(3.6,2.6,-10.6,0,5,1.4,{title:'Thunderclap',sub:'Mind the lightning'});for(const x of [1.6,5.6])B.deco(x,1,-10.65,.2,2,.2,STEEL);
  B.plat(0,0,-20,3,18,Object.assign({name:'girder',t:.8},GIRD));
  [[-15,0],[-20.6,.34],[-26.2,.68]].forEach(([z,ph],i)=>B.bolt('bolt'+i,0,z,1.3,{per:3.2,on:.14,ph}));
  B.bolt('bolt3',4.6,-5,1.3,{per:4.4,on:.12,ph:.5});
  B.sign(-3.4,4.2,-19,Math.PI/2,4.2,2.4,{code:'heli',half:0,label:'Helipad code, 1st half'});B.deco(-3.5,1.6,-19,.25,3.2,.25,STEEL);
  // the crane: its hook goes round over the gap to the next tower; half the code on its mast
  tower(-1,-32,6,6,0,'D');B.cp(1,-1,-31.6);
  const HOOK={type:'orbit',cx:8,cz:-40,rad:6.6,w:.5,a0:2.4};
  B.plat(8+6.6,2.5,-40,2.4,2.4,Object.assign({move:HOOK,name:'hook'},GIRD));
  B.deco(8+6.6,6.1,-40,.12,6.6,.12,{move:HOOK,col:'#1b1f2b'});
  B.deco(8,-6,-40,1.2,30,1.2,GIRD);B.deco(8,9.6,-40,16,.8,1.2,Object.assign({move:{type:'spin',w:-.5}},GIRD));
  B.sign(7.4,6.4,-39.4,-.85,3.2,1.8,{code:'heli',half:1,label:'Helipad code, 2nd half'});
  B.plat(0,4,-46,1.8,1.8,Object.assign({name:'perch'},GIRD));B.item('gem','gem',0,4.8,-46);
  // tower B: the window cleaner's cradle down its west wall (the keycard is half-way down), the rod's cage
  tower(16,-54,10,10,4,'roofB');B.cp(2,14,-51,{top:4});
  const CR={type:'line',ay:-8,per:7};
  B.plat(9.5,4,-53,2.6,2.6,Object.assign({move:CR,name:'cradle'},STEEL));B.deco(9.5,4.6,-54.25,2.6,1.1,.1,{move:CR,col:'#e0a33a'});
  B.item('card','card',9.5,-1.4,-53);
  B.wind(4,-48,11,-58,-6,10,[-3.6,0],{timed:{per:4.6,on:.34,ph:.15},name:'gust1'});
  const CG={col:'#4b5263',mat:'metal'};
  B.blk(16.45,-54,.9,.6,11,CG);B.blk(20.55,-54,.9,.6,11,CG);B.box(18.5,9.8,-54,3.2,2.4,.6,CG);
  B.blk(16.3,-56.5,.6,5,11,CG);B.blk(20.7,-56.5,.6,5,11,CG);B.blk(18.5,-58.7,4.8,.6,11,CG);
  B.door('x',-54,18.5,'cagedoor',{col:'#3b82f6',w:3.2,part:{y:6.3,lock:'card'}});
  B.btn('lever',19.2,-57.2,{toggle:'rod'},{top:5.1,icon:'lever',stand:[18.4,-55.9]});
  B.deco(17.4,8,-57.8,.25,8,.25,STEEL);B.deco(17.4,14.5,-57.8,.18,5,.18,{onIf:'rod',col:'#fde047',mat:'metal'});
  B.bolt('rodbolt',17.4,-57.8,.7,{per:4.6,on:.12,ph:.3},{y0:17,charge:{flag:'bridge',dur:7,need:'rod'}});
  // the bridge (lit for seven seconds by each strike on the rod), lightning between its tiles, the gusts
  B.plat(15,4,-61.4,2.6,2.6,{onIf:'bridge',mat:'glass',col:'#fde68a',name:'tile1'});
  B.plat(17,4,-65.2,2.6,2.6,{onIf:'bridge',mat:'glass',col:'#fde68a',name:'tile2'});
  B.bolt('bolt4',16,-63.3,.6,{per:2.6,on:.15,ph:.1});
  B.wind(8,-59,24,-67,0,12,[-3.6,0],{timed:{per:3.8,on:.3,ph:.6},name:'gust2'});
  // the helipad tower: the vent house (keypad door, an updraft inside) up to the helipad
  tower(16,-73,12,11.6,4,'roofC');B.cp(3,18,-69.4,{top:4});
  B.blk(10.6,-76.4,.6,4.8,11,CG);B.blk(15.1,-76.4,.6,4.8,11,CG);B.blk(12.85,-78.5,5.1,.6,11,CG);
  B.blk(11.1,-74,1.6,.6,11,CG);B.box(12.85,9.8,-74,1.9,2.4,.6,CG);B.blk(14.55,-74,.5,.6,11,CG);
  B.door('x',-74,12.85,'helidoor',{w:1.9,col:'#5b6475',part:{y:6.3}});
  B.panel('pad',14.2,5.6,-73.6,0,{pad:'heli'},{icon:'pad',stand:[14.2,-72.3]});
  B.lift(11,-74.4,14.7,-78.1,4,13.6,{name:'vent'});
  B.blk(16,-84.2,12,10.4,10,Object.assign({name:'helipad'},ROOF));B.dcyl(16,10.03,-84.2,3.4,.06,{col:'#fde047'});
  B.deco(16,11.3,-86,5,2.2,2.4,{col:'#c0392b'});B.deco(16,12.6,-86,9,.15,.4,{col:'#1b1f2b',move:{type:'spin',w:9}});
  B.finish(16,-83,{top:10,w:4,d:4});B.sign(16,13,-89.3,0,2.6,.8,{exit:true});B.deco(16,11.5,-89.4,.3,3,.3,STEEL);
  // route
  const hook=W.byName.get('hook'),cr=W.byName.get('cradle');
  const clear=n=>(t,W)=>{const b=W.byName.get(n);return!phaseOn(b.timed,t)&&E.phaseLeft(b.timed,t)>2}; // just struck
  B.w(0,0,-10);B.w(0,0,-12.4);B.u(clear('bolt0'));B.w(0,0,-17.8);B.u(clear('bolt1'));B.w(0,0,-23.4);B.u(clear('bolt2'));B.w(0,0,-28.4);B.w(-1,0,-31.6);B.w(1.2,0,-34);
  B.jon('hook',0,{wait:true});B.ladder('hook',(t)=>{const h=cur(hook,t);return h.z<-45.6?'done':'wait'});B.j(12.8,4,-50.4,{wait:true});B.w(14,4,-51);
  B.w(11.6,4,-53);B.u((t)=>cur(cr,t).y>3.3);B.jon('cradle',0,{wait:true});
  B.ladder('cradle',(t,W,pl)=>W.st.got.card&&cur(cr,t).y>3.4?'done':'wait');B.j(12.4,4,-53,{wait:true});
  B.w(18.5,4,-52.6);B.w(18.5,4,-55);B.w(18.4,4,-55.9);B.use('lever',18.4,4,-55.9);B.w(18.5,4,-53);B.w(14.6,4,-53);B.w(14.6,4,-58.2);
  B.u((t,W)=>{const v=W.st.f.bridge;return typeof v==='number'&&v-t>6.2});
  B.j(15,4,-61.4,{wait:true});B.j(17,4,-65.2,{wait:true});B.j(15,4,-68.6,{wait:true});B.w(18,4,-69.4);
  B.w(14.2,4,-72.3);B.use('pad',14.2,4,-72.3);B.code('heli');
  B.w(12.85,4,-73.2);B.drive((t,W,pl)=>pl.y>12||pl.z<-79?go(pl,16,-83):go(pl,12.85,-76.2));
  W.spawn={x:0,y:0,z:4,yaw:0};
}},
// 4. A revolving restaurant at the top of a tower. Two rings of wall turn round its kitchen in the middle, each with
// one door, and each turns an eighth at a press of its button in the kitchen. Turn the outer door to face a terrace
// to go out to it: the east and west terraces hold one card each, saying which way each ring's door must face; the
// north one holds the fuse for the kitchen's lift. Line both doors up as the cards say, put the fuse in, and the lift
// takes you to the roof.
{id:'skydeck',name:'Sky Deck',sub:'The revolving restaurant',par:250,clouds:true,sky:['#6fa8dc','#fde2c8'],pal:{floor:'#d8d2c4',wall:'#e8e2d4',prop:'#b08968',trim:'#3a3f58'},
msgs:{power:'The fuse is in. The kitchen lift has power',view:'Both doors line up: the lift unlocks',up:'The lift is running: up to the roof!'},unlock:['up'],
build(B,r){
  B.sky();const W=B.W,CX=0,CZ=-40,FL={col:'#d8d2c4',mat:'floor'},GL={col:'#bfe6ff',mat:'glass'},WOOD={col:'#b08968',mat:'wood'},STEEL={col:'#5b6475',mat:'metal'};
  W.killY=-10;
  const P=(k,R)=>[CX-Math.sin(k*Math.PI/4)*R,CZ-Math.cos(k*Math.PI/4)*R];
  const k1=Math.floor(r()*8),k2=Math.floor(r()*8),kin=(k1+2+Math.floor(r()*5))%8;
  // the restaurant floor and its two turning rings (each built with its door to the north, then turned to its start)
  B.cyl(CX,0,CZ,11.3,Object.assign({t:3,name:'deck'},FL));
  const ring=(R,door,col)=>{const L=2*R*Math.tan(Math.PI/8)+.6;
    for(let k=0;k<8;k++){const [x,z]=P(k,R),yaw=k*Math.PI/4,tx=Math.cos(yaw),tz=-Math.sin(yaw);
      if(k)B.box(x,4.5,z,L,11,.6,{yaw,col,mat:'wall'});
      else if(door<L-1)for(const s of [-1,1]){const c=(door/2+L/2)/2;B.box(x+tx*c*s,4.5,z+tz*c*s,L/2-door/2,11,.6,{yaw,col,mat:'wall'})}}};
  B.turning('inner',CX,CZ,8,()=>ring(5,99,'#c9b79c'),{start:kin});
  B.turning('outer',CX,CZ,8,()=>{ring(11,3.6,'#e8e2d4');const [x,z]=P(0,11.25);B.deco(x,6.4,z,3.8,.5,.4,{col:'#3a3f58'})},{start:4});
  // the kitchen: the two turn buttons and the fuse box round the middle, a compass on the floor, the lift up to the roof
  const [ix,iz]=P(3,2.2),[ox,oz]=P(5,2.2),[fx,fz]=P(7,2.2),[cx1,cz1]=P(1,3.1);
  B.turnBtn('innerBtn',ix,iz,'inner',{top:1.2,col:'#7dd3fc',stand:P(3,3.4)});
  B.turnBtn('outerBtn',ox,oz,'outer',{top:1.2,col:'#f9a8d4',stand:P(5,3.4)});
  B.btn('fusebox',fx,fz,{need:'fuse',then:'power'},{top:1.2,icon:'fuse',stand:P(7,3.4)});
  {const [x,z]=P(3,1.2);B.sign(x,.03,z,0,1.5,.55,{title:'Inner'},{flat:true});const [x2,z2]=P(5,1.2);B.sign(x2,.03,z2,0,1.5,.55,{title:'Outer'},{flat:true})}
  B.sign(CX,.03,CZ,0,2.2,2.2,{rose:true},{flat:true});
  B.align({inner:k1,outer:k2},'view');B.all(['view','power'],'up');
  B.cp(1,cx1,cz1,{w:2,d:2});
  B.lift(CX-1.6,CZ-1.6,CX+1.6,CZ+1.6,0,15,{onIf:'up',name:'up'});
  B.plat(CX,12,CZ-3.4,6,3.6,{name:'roof',col:'#3a3f58',mat:'metal'});B.deco(CX+2.4,16,CZ-4.6,.3,8,.3,STEEL);B.dcyl(CX+2.4,20.2,CZ-4.6,.4,.4,{col:'#ef4444',mat:'glass'});
  B.finish(CX-.6,CZ-3.4,{top:12,w:3.4,d:3});B.sign(CX,13.4,CZ-5.15,0,2.4,.75,{exit:true});
  // the south terrace (the start) and its bridge
  B.plat(0,0,-16,12,12,Object.assign({name:'S'},WOOD));B.cp(0,0,-13);
  B.plat(0,0,-25.35,3.2,6.7,Object.assign({name:'bridgeS'},WOOD));
  B.sign(-3.6,2.6,-21.6,0,5,1.4,{title:'Sky Deck',sub:'The revolving restaurant'});for(const x of [-5.6,-1.6])B.deco(x,1,-21.65,.2,2,.2,STEEL);
  for(const [x,z] of [[-4,-13],[4,-13]]){B.blk(x,z,1.6,1.6,.9,WOOD);B.dcyl(x,1.6,z,.9,.15,{col:'#f4f1ea'})}
  // east: crumbling tiles with a swinging blade between them; the inner ring's card
  B.plat(13.6,.3,-40,2.2,2.2,{crumble:true,mat:'crumble',col:'#e8d3a8',name:'e1'});
  B.plat(17.4,.3,-40,2.2,2.2,{crumble:true,mat:'crumble',col:'#e8d3a8',name:'e2'});
  B.kill(15.5,1.4,-40,.5,1,2.6,{move:{type:'swing',dz:1,len:7,amp:.55,per:3},name:'blade'});B.deco(15.5,8.6,-40,.3,.3,10,STEEL);
  B.plat(24,0,-40,8,8,Object.assign({name:'E'},WOOD));
  B.sign(27.9,2.6,-40,-Math.PI/2,3,3,{w5:'vane',to:k1,n:8,title:'Inner door faces'});B.deco(28,1,-40,.2,2,.2,STEEL);
  B.wind(11.5,-34,21,-46,-3,10,[0,-3.5],{timed:{per:4.4,on:.3,ph:.2},name:'gustE'});
  // west: a shuttle in the gusts; the outer ring's card; crates up to the gem
  B.plat(-13.3,0,-40,2.6,2.6,{move:{type:'line',ax:-5,per:5},mat:'metal',col:'#e9b949',name:'shuttle'});
  B.plat(-24,0,-40,8,8,Object.assign({name:'Wt'},WOOD));
  B.sign(-27.9,2.6,-40,Math.PI/2,3,3,{w5:'vane',to:k2,n:8,title:'Outer door faces'});B.deco(-28,1,-40,.2,2,.2,STEEL);
  B.wind(-21,-33,-11.5,-47,-3,10,[0,4],{timed:{per:3.6,on:.36,ph:.6},name:'gustW'});
  B.blk(-22,-37,1.6,1.6,1.4,WOOD);B.blk(-24.4,-37,1.6,1.6,2.8,WOOD);B.blk(-26.4,-38.6,1.4,1.4,4.2,WOOD);B.item('gem','gem',-26.4,5,-38.6);
  // north: blinking glass tiles, the fuse behind a turning bar
  B.plat(0,.3,-53.4,2.4,2.4,{timed:{per:3,on:.6,ph:0},mat:'blink',col:'#bfe6ff',name:'n1'});
  B.plat(0,.3,-56.4,2.4,2.4,{timed:{per:3,on:.6,ph:.45},mat:'blink',col:'#bfe6ff',name:'n2'});
  B.plat(0,0,-62.5,8,8,Object.assign({name:'Nt'},WOOD));
  B.kill(0,1.1,-62.5,6.4,.5,.4,{move:{type:'spin',w:1.2},name:'bar'});B.cyl(0,1.6,-62.5,.45,{t:1.6,col:'#3a3f58',name:'barhub'});
  B.item('fuse','fuse',-2.4,1,-65.2);
  B.wind(-8,-51.3,8,-58.5,-3,10,[3.6,0],{timed:{per:4,on:.3,ph:.4},name:'gustN'});
  // decor: tables and chairs in the corridor (no collision), lamps
  for(let k=0;k<8;k+=2){const [x,z]=P(k+1,8);B.dcyl(x,.8,z,.7,.1,{col:'#f4f1ea'});B.dcyl(x,.4,z,.12,.8,STEEL)}
  // route: in to the kitchen, out east, west and north, then line the doors up, the fuse, the lift
  const arc=(a,b,R)=>{let d=((b-a)%8+8)%8;if(d>4)d-=8;const st=Math.sign(d);for(let i=1;i<=Math.abs(d)*2;i++){const [x,z]=P(a+st*i/2,R);B.w(x,0,z)}};
  let at=kin; // where in the kitchen we are (on the circle of radius 3.6)
  const to=k=>{arc(at,k,3.6);at=k};
  const inK=()=>{const [x,z]=P(kin,8),[x2,z2]=P(kin,3.6);B.w(x,0,z);B.w(x2,0,z2);at=kin};
  const outK=()=>{to(kin);const [x,z]=P(kin,8);B.w(x,0,z)};
  const stand=k=>{to(k);const [x,z]=P(k,3.4);B.w(x,0,z)};
  const turn=(btn,key,k)=>{stand(btn==='innerBtn'?3:5);B.turnTo(btn,key,k)};
  B.w(0,0,-27.6);{const [x,z]=P(4,8);B.w(x,0,z)}arc(4,kin,8);inK();to(1);B.w(cx1,0,cz1);B.w(...[P(1,3.6)[0],0,P(1,3.6)[1]]);
  // east
  turn('outerBtn','outer',6);outK();arc(kin,6,8);B.w(10.4,0,-40);B.j(13.6,.3,-40,{wait:true});B.j(17.4,.3,-40,{wait:true});B.j(21,0,-40,{wait:true});B.w(26.6,0,-40);
  B.w(20.6,0,-40);B.j(17.4,.3,-40,{wait:true});B.j(13.6,.3,-40,{wait:true});B.j(10,0,-40,{wait:true});arc(6,kin,8);inK();
  // west
  turn('outerBtn','outer',2);outK();arc(kin,2,8);B.w(-10.4,0,-40);B.jon('shuttle',0,{wait:true});B.ladder('shuttle',(t,W)=>cur(W.byName.get('shuttle'),t).x<-17.9?'done':'wait');
  B.j(-21.2,0,-40,{wait:true});B.w(-26.6,0,-40);B.w(-20.4,0,-40);B.jon('shuttle',0,{wait:true});B.ladder('shuttle',(t,W)=>cur(W.byName.get('shuttle'),t).x>-13.7?'done':'wait');
  B.j(-10,0,-40,{wait:true});arc(2,kin,8);inK();
  // north
  turn('outerBtn','outer',0);outK();arc(kin,0,8);B.w(0,0,-51);B.j(0,.3,-53.4,{wait:true});B.j(0,.3,-56.4,{wait:true});B.j(0,0,-59.4,{wait:true});
  B.u((t,W)=>{const a=cur(W.byName.get('bar'),t).yaw%Math.PI;return Math.abs(a-Math.PI/2)<.5});B.w(-2.4,0,-64.6);B.w(0,0,-59.2);
  B.j(0,.3,-56.4,{wait:true});B.j(0,.3,-53.4,{wait:true});B.j(0,0,-50.6,{wait:true});arc(0,kin,8);inK();
  stand(7);B.use('fusebox',...P(7,3.4).slice(0,1),0,P(7,3.4)[1]);
  turn('outerBtn','outer',k2);turn('innerBtn','inner',k1);B.u((t,W)=>flagOn(W,'up',t));
  to(4);{const [x,z]=P(4,2.6);B.w(x,0,z)}B.drive((t,W,pl)=>{if(pl.y>13.2)return go(pl,CX-.6,CZ-3.4);const g=go(pl,CX,CZ);if(pl.gr){g.x*=.35;g.z*=.35}return g});
  W.spawn={x:0,y:0,z:-13,yaw:0};
}}
]});
})(Escapade);
