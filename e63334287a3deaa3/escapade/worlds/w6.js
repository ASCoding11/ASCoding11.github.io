// World 6: The Last Door. The finale: a labyrinth, a tomb, a fortress, a dragon's keep, a vault of clocks, a dream, the
// long climb and the last door of all. See README.md in this folder for how a world file works. New here (in the page's
// CORE): one-way flaps (B.oneway), rings of fire (B.ring) and your shadow (B.shadow), plus a boss with three phases.
(function(E){
'use strict';
const {DW,DH,WH,cur,flagOn,makeCode,shuffle,exitHall,GLYPHS}=E;
const PI=Math.PI;

// A labyrinth on a grid of cells (n x n, size s, south-west corner at x0, z0; row 0 is the south row). open: edges
// with no wall, as 'c,r|c2,r2'; ow: one-way flaps [c, r, c2, r2] (from the first cell to the second). Every other
// edge is a hedge `top` tall. Fills W.w6maze for the plan sign.
function maze(B,o){
  const {n,s,x0,z0,top}=o,H=o.hedge,open=new Set(o.open.map(k=>k.split('|').sort().join('|'))),lines=[],posts=new Set();
  const ow=new Map(o.ow.map(([a,b,c,d])=>[[a+','+b,c+','+d].sort().join('|'),[a,b,c,d]]));
  const wall=(x,z,w,d)=>B.blk(x,z,w,d,top,H);
  for(let c=0;c<n;c++)for(let r=0;r<n;r++)for(const [dc,dr] of [[1,0],[0,1]]){
    const c2=c+dc,r2=r+dr;if(c2>=n||r2>=n)continue;
    const k=[c+','+r,c2+','+r2].sort().join('|');
    const vert=dc===1,ax=vert?x0+s*c2:x0+s*c+s/2,az=vert?z0-s*r-s/2:z0-s*r2,L=s-1;
    if(vert){posts.add(c2+','+r);posts.add(c2+','+(r+1))}else{posts.add(c+','+r2);posts.add((c+1)+','+r2)}
    if(open.has(k))continue;
    const f=ow.get(k);
    if(!f){vert?wall(ax,az,1,L):wall(ax,az,L,1);lines.push(vert?[c2,r,c2,r+1]:[c,r2,c+1,r2]);continue}
    const side=(L-DW)/2,dir=vert?Math.sign(f[2]-f[0]):-Math.sign(f[3]-f[1]);
    if(vert){wall(ax,az+DW/2+side/2,1,side);wall(ax,az-DW/2-side/2,1,side);B.box(ax,(DH+top)/2,az,1,top-DH,DW,H);B.oneway('z',ax,az,dir)}
    else{wall(ax-DW/2-side/2,az,side,1);wall(ax+DW/2+side/2,az,side,1);B.box(ax,(DH+top)/2,az,DW,top-DH,1,H);B.oneway('x',az,ax,dir)}
    lines.push(vert?[c2,r,c2,r+.32]:[c,r2,c+.32,r2],vert?[c2,r+.68,c2,r+1]:[c+.68,r2,c+1,r2],vert?[c2,r+.32,c2,r+.68,'ow']:[c+.32,r2,c+.68,r2,'ow']);
  }
  for(const p of posts){const [c,r]=p.split(',').map(Number);if(c<=0||c>=n||r<=0||r>=n)continue;B.blk(x0+s*c,z0-s*r,1,1,top+.2,H)}
  B.W.w6maze={cols:n,lines,dots:[],you:[0,0]};
  return{cx:c=>x0+s*c+s/2,cz:r=>z0-s*r-s/2};
}

E.world({n:6,needs:3,levels:[
// 1. A labyrinth at dusk. Cross the moat, then find the three bronze bells hidden in the hedges: the gate on the far
// side opens when all three have rung. The pink flaps only swing one way, so the maze is a loop: miss a bell and you
// go all the way round again. The plan on the courtyard wall shows the hedges and the bells, not which way the flaps go.
{id:'labyrinth',name:'One Way Home',sub:'The labyrinth',par:150,sky:['#3d2a5c','#f7b267'],pal:{floor:'#d8c49a',wall:'#9a8a68',prop:'#b98b4f',trim:'#3b2a1a'},
msgs:{bellA:'A bell rings in the hedges. One of three',bellB:'A bell rings in the hedges. One of three',bellC:'A bell rings in the hedges. One of three',
  mazedoor:'All three bells have rung. The gate opens!'},unlock:['mazedoor'],
build(B,r){
  const W=B.W,HEDGE={col:'#5f7f43',mat:'stone'},STONE={col:'#c2ad7a',mat:'stone'},BRONZE={col:'#c98b3a',mat:'metal'};
  B.all(['bellA','bellB','bellC'],'mazedoor');
  // the courtyard: a moat of lava, stones (some crumble), a turning bar on the middle stone
  B.floor(-20,7,20,-12,{col:'#cdb68a',mat:'floor'});B.wallX(7,-20.5,20.5);B.wallZ(-20,7,-52);B.wallZ(20,7,-52);
  B.wallX(-12,-20.5,20.5,[{c:0,w:DW,h:DH}]);
  B.cp(0,0,3.6);
  B.lava(-20,.6,20,-8);
  B.plat(-2.4,.8,-1.6,2.4,2.4,Object.assign({name:'m1'},STONE));
  B.plat(1.6,1.2,-4.4,3.4,3.4,Object.assign({name:'m2'},STONE));
  B.kill(1.6,2.05,-4.4,4.6,.4,.4,{move:{type:'spin',w:1.6},name:'bar'});B.cyl(1.6,2.4,-4.4,.4,{t:1.2,col:'#3b2a1a',name:'barhub'});
  B.plat(-2,1,-6.8,2.2,2.2,{crumble:true,mat:'crumble',col:'#e2cf9e',name:'m3'});
  B.plat(5.6,.8,-7,2,2,{crumble:true,mat:'crumble',col:'#e2cf9e',name:'m4'});
  B.cp(1,0,-10.2,{w:3,d:2.6});
  // the labyrinth: 5 x 5 cells of 8, hedges 5.2 tall
  B.floor(-20,-12,20,-52,{col:'#b8a77a',mat:'floor'});
  const M=maze(B,{n:5,s:8,x0:-20,z0:-12,top:5.2,hedge:HEDGE,
    open:['1,0|2,0','2,0|3,0','0,0|0,1','0,1|0,2','0,1|1,1','1,1|1,2','0,3|1,3','0,3|0,4','0,4|1,4','1,4|2,4','2,4|2,3',
      '3,4|4,4','4,4|4,3','4,3|3,3','3,3|3,2','3,2|2,2','2,2|2,1','3,2|4,2','4,2|4,1','4,1|4,0','4,1|3,1'],
    ow:[[1,0,0,0],[0,2,0,3],[2,4,3,4],[2,1,2,0]]});
  const {cx,cz}=M;
  W.w6maze.lines.push([0,0,0,5],[5,0,5,5],[0,0,2.3,0],[2.7,0,5,0],[0,5,2.3,5],[2.7,5,5,5],[2.3,5,2.7,5,'gate']);
  const bell=(name,c,rr,sx,sz)=>{B.btn(name,cx(c),cz(rr),{set:name},{top:1.1,icon:'bell',col:'#ffd23f',baseCol:'#7a5a2a',stand:[cx(c)+sx,cz(rr)+sz]});
    B.deco(cx(c),2.3,cz(rr),.12,1.6,.12,BRONZE);B.dcyl(cx(c),3.1,cz(rr),.5,.7,BRONZE);W.w6maze.dots.push([c,rr,'#ffd23f'])};
  bell('bellA',1,2,0,1.3);bell('bellC',2,3,0,-1.3);bell('bellB',4,0,0,-1.3);
  W.w6maze.you=[2,-.05];
  B.cp(2,cx(0),cz(3)-.6,{w:3,d:2.6});
  // hazards: a red ghost circling in the north-west, a laser curtain in the east
  B.add({shape:'cyl',x:cx(1)+2.3,y:1.6,z:cz(4),r:.55,h:1.4,kill:true,solid:false,mat:'ghost',col:'#ff3355',cam:false,name:'ghost',move:{type:'orbit',cx:cx(1),cz:cz(4),rad:2.3,w:1.5,a0:0}});
  B.laser(12,2.5,cz(3),.3,5,7,{timed:{per:2.6,on:.45,ph:0},name:'curtain'});
  B.deco(12,.1,cz(3),.8,.2,7.4,{col:'#4b5563',mat:'metal'});
  // the gem: on a plinth at the end of the east wing's blind alley
  B.blk(cx(3),cz(1)+1.4,1.6,1.6,.9,STONE);B.item('gem','gem',cx(3),1.8,cz(1)+1.4);
  // the gate and the way out
  B.wallX(-52,-20.5,20.5,[{c:0,w:DW,h:DH}]);
  B.door('x',-52,0,'mazedoor',{col:'#7a5a2a',part:{mat:'gate'}});
  exitHall(B,0,-52);
  B.sign(-10,5.6,-11.45,0,6.4,6.4,{w6:'maze'});
  B.sign(10,6.8,-11.45,0,7,1.6,{title:'One Way Home',sub:'Ring all three bells'});
  // decor: statues by the gate, braziers on the courtyard walls, lanterns over the hedges
  for(const s of [-1,1]){B.blk(s*4.2,-10.6,1.4,1.4,1.4,STONE);B.deco(s*4.2,2.6,-10.6,.9,2.4,.9,{col:'#b9a77c',mat:'stone'});B.dcyl(s*4.2,4.1,-10.6,.45,.6,{col:'#b9a77c',mat:'stone'})}
  for(const z of [2,-6])for(const s of [-1,1])B.win(s*19.5,z,-s*PI/2,{y:6.4,glass:'#ffcf8a',frame:'#3b2a1a'});
  // route: the west wing (bell A), the north (bell C), round the east (bell B), back through the start and round again
  const go=(c,rr)=>B.w(cx(c),0,cz(rr));
  B.w(-2,0,1.4);B.j(-2.4,.8,-1.6,{wait:true});B.j(1.6,1.2,-2.8,{wait:true});B.j(-2,1,-6.8,{wait:true});B.j(-2.6,0,-9.8,{wait:true});B.w(0,0,-10.2);
  B.w(0,0,-13.6);go(2,0);go(1,0);go(0,0);go(0,1);go(1,1);B.use('bellA',cx(1),0,cz(2)+1.3);
  go(1,1);go(0,1);go(0,2);go(0,3);go(0,4);go(1,4);go(2,4);B.use('bellC',cx(2),0,cz(3)-1.3);
  go(2,4);go(3,4);go(4,4);go(4,3);B.w(13.6,0,cz(3));go(3,3);go(3,2);go(4,2);go(4,1);B.use('bellB',cx(4),0,cz(0)-1.3);
  go(4,1);go(4,2);go(3,2);go(2,2);go(2,1);go(2,0);go(1,0);go(0,0);go(0,1);go(0,2);go(0,3);go(0,4);go(1,4);go(2,4);
  B.w(0,0,-54);B.w(0,0,-55.4);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}},

// 2. A pyramid. In the Sun Hall a golden disc sends out rings of fire: jump each one as it passes. Half of the tomb's
// code is on top of the disc. Then a corridor where a boulder rolls at you (hide in the alcoves; the other half of the
// code is in one of them), and the burial chamber: land on the glyph stones in the order of the wall painting while
// rings pulse from the coffin, so a bridge rises to the keypad.
{id:'sandtomb',name:'Sun and Sand',sub:'The pyramid',par:110,sky:['#f08a4b','#fde2b5'],pal:{floor:'#e3c58f',wall:'#c9a46a',prop:'#b07a3c',trim:'#5a3a1a'},
msgs:{mural:'The stones glow. A bridge rises from the lava',tombdoor:'Code accepted. The tomb opens'},unlock:['tombdoor'],
build(B,r){
  const W=B.W,SAND={col:'#d8b878',mat:'stone'},GOLD={col:'#e8b923',mat:'metal'},DARK={col:'#a07a48',mat:'wall'};
  W.codes.tomb=makeCode(r);W.pads.tomb={set:'tombdoor'};
  W.seqs.glyph={order:shuffle(GLYPHS.slice(),r).slice(0,4),set:'mural'};
  // the Sun Hall
  B.floor(-14,6.5,14,-20,{col:'#e3c58f',mat:'floor'});B.wallZ(-14,7,-20);B.wallZ(14,7,-20);B.wallX(7,-14.5,14.5);
  B.wallX(-20,-14.5,14.5,[{c:0,w:6,h:6}]);
  B.cp(0,0,3.6);
  B.lava(-14,-1,-5,-5);B.lava(5,-12,14,-16);
  B.cyl(0,1.4,-9,2.6,Object.assign({name:'sun'},GOLD));B.dcyl(0,1.46,-9,1.6,.12,{col:'#fff3b0',mat:'glass'});
  B.sign(0,1.47,-9,0,2.2,1.4,{code:'tomb',half:0,flat:true,label:'Tomb code, first half'});
  B.ring(0,-9,9.5,3.2,{on:.7,name:'sunring'});
  B.blk(10,-6,2,2,1.4,Object.assign({name:'ob1'},SAND));
  B.plat(10,2.8,-9.6,2,2,{crumble:true,mat:'crumble',col:'#efd9a8',name:'ob2'});
  B.blk(10,-13.6,2,2,4,Object.assign({name:'obelisk'},SAND));B.item('gem','gem',10,4.9,-13.6);
  B.cp(1,0,-19.4,{w:3,d:2.2});
  // the boulder corridor: alcoves in the sides, a trench at the near end where the boulder drops away
  B.floor(-6,-20,6,-58,{col:'#d2b47c',mat:'floor'});B.wallZ(-6,-20,-58);B.wallZ(6,-20,-58);
  for(const [z0,z1] of [[-20,-27],[-30.4,-41],[-44.4,-58]])B.blk(4.5,(z0+z1)/2,3,Math.abs(z1-z0),WH,DARK);
  for(const [z0,z1] of [[-20,-34],[-37.4,-48],[-51.4,-58]])B.blk(-4.5,(z0+z1)/2,3,Math.abs(z1-z0),WH,DARK);
  B.lava(-3,-21.6,3,-24.4);
  B.add({shape:'cyl',x:0,y:2.9,z:-55,r:2.9,h:5.8,kill:true,solid:false,mat:'boulder',col:'#b8935a',move:{type:'roll',az:31,per:4.2},name:'boulder',cam:false});
  B.sign(-5.45,2.6,-49.7,PI/2,2.6,1.8,{code:'tomb',half:1,label:'Tomb code, second half'});
  // the burial chamber: glyph stones round the coffin over the lava, the bridge, the dais and the keypad
  B.floor(-14,-58,14,-92,{col:'#c9a46a',mat:'floor'});B.wallZ(-14,-58,-92);B.wallZ(14,-58,-92);
  B.wallX(-58,-14.5,14.5,[{c:0,w:6,h:6}]);B.wallX(-92,-14.5,14.5,[{c:6,w:DW,h:DH}]);
  B.cp(2,0,-59.8,{w:3,d:2.4});
  B.lava(-14,-61.5,14,-84);
  const CX=0,CZ=-70.5;
  B.cyl(CX,1.6,CZ,2.2,{col:'#8a6a3a',mat:'stone',name:'hub'});B.deco(CX,1.75,CZ,1.4,.3,3,{col:'#e8b923',mat:'metal'});
  B.ring(CX,CZ,9.5,2.6,{on:.75,name:'tombring'});
  GLYPHS.forEach((g,i)=>{const a=(30+i*60)*PI/180,x=CX+Math.cos(a)*5.2,z=CZ+Math.sin(a)*5.2;
    B.blk(x,z,2,2,.4,{col:'#e2cf9e',mat:'stone',step:{seq:'glyph',sym:g},name:'stone_'+g});B.sign(x,.42,z,0,1.6,1.6,{icon:g,flat:true})});
  B.sign(-13.45,6,CZ,PI/2,8.6,2.8,{mural:'glyph'});
  B.plat(0,1.2,-80.35,2,7.3,{onIf:'mural',mat:'glass',col:'#ffd27a',name:'bridge'});
  B.blk(0,-86.5,28,5,1.2,{col:'#a07a48',mat:'stone',name:'dais'});
  B.cp(3,0,-86.5,{top:1.2,w:3,d:2.4});
  B.panel('pad',-3,1.6,-91.35,0,{pad:'tomb'},{icon:'pad'});
  B.door('x',-92,6,'tombdoor',{col:'#8a6a3a',part:{mat:'vaultdoor'}});
  exitHall(B,6,-92);
  B.sign(-7,6.4,-91.45,0,6,1.5,{title:'Sun and Sand',sub:'The tomb keeps its code in two halves'});
  // decor: painted pillars, a sunburst over the door, scarabs
  for(const s of [-1,1])for(const z of [2,-15]){B.blk(s*12.8,z,1.4,1.4,WH-1,{col:'#c79a5a',mat:'stone'});B.deco(s*12.8,7,z,1.5,.4,1.5,{col:'#2a6f97',mat:'plastic'})}
  for(const s of [-1,1])for(const z of [-66,-76])B.blk(s*12.8,z,1.4,1.4,WH-1,{col:'#c79a5a',mat:'stone'});
  B.dcyl(0,8.4,-19.45,1.6,.1,{col:'#e8b923',mat:'metal',yaw:0});
  // route: round the disc, the corridor alcove by alcove, the stones in the painting's order, the bridge, the keypad
  const bd=W.byName.get('boulder');
  const go=(need)=>(t,W,pl)=>{const z=cur(bd,t).z;return z-2.9>pl.z+.6||pl.z-(z+2.9)>need};
  B.w(0,0,0);B.w(-4,0,-7);B.w(-4,0,-12);B.w(0,0,-16);B.w(0,0,-19.4);
  B.u((t)=>cur(bd,t).z<-50);B.j(0,0,-26,{wait:true});B.w(1.6,0,-28.7);B.w(4.4,0,-28.7);
  B.u(go(40));B.w(1.4,0,-30.8);B.w(-1.4,0,-35.7);B.w(-4.4,0,-35.7);
  B.u(go(40));B.w(-1.4,0,-37.6);B.w(1.4,0,-42.7);B.w(4.4,0,-42.7);
  B.u(go(40));B.w(1.4,0,-44.6);B.w(-1.4,0,-49.7);B.w(-4.4,0,-49.7);
  B.u((t,W,pl)=>{const z=cur(bd,t).z;return z>pl.z+3.5&&z<pl.z+11});B.w(-1.4,0,-51.6);B.w(0,0,-59.8);
  B.jon('stone_'+GLYPHS[1],0,{wait:true});B.jon('hub',0,{wait:true,stay:true});B.steps('glyph','hub');
  B.jon('hub',0,{wait:true,stay:true});B.jon('stone_'+GLYPHS[4],0,{wait:true,stay:true});B.j(0,1.2,-80.6,{wait:true});B.w(0,1.2,-86.5);
  B.w(-3,1.2,-88.4);B.w(-3,0,-90.2);B.use('pad',-3,0,-90.2);B.code('tomb');B.w(6,0,-93.6);B.w(6,0,-95.2);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}},

// 3. A fortress at night. Press the winch and race over the moat before the portcullis drops again, then the gatehouse
// of swinging blades. In the courtyard a steward's note gives a code, but it's for the cellar, not the keep: the keep's
// code is half on the west tower and half down in the cellar. Climb the west tower, cross the battlement bridge in the
// gusts, and go on from the east tower over the moat to the keep door.
{id:'citadel',name:'Siege Works',sub:'The fortress',par:150,night:true,sky:['#1d2240','#7d86a8'],pal:{floor:'#8d8a83',wall:'#6b6e7a',prop:'#8a6a4a',trim:'#1f2233'},
msgs:{gate:'The portcullis grinds up. Run!',cellardoor:'Code accepted. The cellar door opens',keepdoor:'Code accepted. The keep door swings open'},unlock:['keepdoor'],
build(B,r){
  const W=B.W,STONE={col:'#8f8c86',mat:'stone'},WOOD={col:'#8a6a4a',mat:'wood'},IRON={col:'#4b5060',mat:'metal'};
  W.codes.keep=makeCode(r);W.pads.keep={set:'keepdoor'};
  do{W.codes.cellar=makeCode(r)}while(W.codes.cellar===W.codes.keep);W.pads.cellar={set:'cellardoor'};
  // the bailey: the winch opens the portcullis for a few seconds; the moat between
  B.floor(-16,6.5,16,-24,{col:'#7d7a74',mat:'floor'});B.wallX(7,-16.5,16.5);B.wallZ(-16,7,-24);B.wallZ(16,7,-24);
  B.wallX(-24,-16.5,16.5,[{c:0,w:DW,h:DH}]);
  B.cp(0,0,3.6);
  B.btn('winch',-10,3.4,{timed:'gate',dur:8},{top:1.1,icon:'clock',col:'#ffd23f',stand:[-10,2.2]});
  B.lava(-16,0,16,-20.5);
  B.plat(-9,.8,-2.6,2.4,2.4,Object.assign({name:'p1'},STONE));
  B.plat(-5.4,1.2,-6.2,2.2,2.2,{crumble:true,mat:'crumble',col:'#b9b3a6',name:'p2'});
  B.plat(-1.6,1.6,-9.8,2.6,2.6,Object.assign({name:'p3'},STONE));
  B.plat(2.4,1.2,-13.4,2.2,2.2,{crumble:true,mat:'crumble',col:'#b9b3a6',name:'p4'});
  B.plat(0,.8,-17.2,2.4,2.4,Object.assign({name:'p5'},STONE));
  B.door('x',-24,0,'gate',{col:'#3b3f4a',part:{mat:'gate'}});
  // the gatehouse: blades swinging across, two trenches; the steward's note on the wall
  B.floor(-5,-24,5,-48,{col:'#7d7a74',mat:'floor'});B.wallZ(-5,-24,-48);B.wallZ(5,-24,-48);
  B.cp(1,0,-26.2,{w:3,d:2.4});
  [[-28.5,0],[-35.2,.33],[-41.9,.66]].forEach(([z,ph],i)=>{B.kill(0,1.2,z,2.4,1,.5,{move:{type:'swing',dx:1,len:8.4,amp:.39,per:2.7,ph},name:'blade'+i});B.deco(0,9.75,z,10,.4,.4,IRON)});
  B.lava(-5,-31.4,5,-32.8);B.lava(-5,-38.1,5,-39.5);
  B.sign(4.45,4.6,-36.6,-PI/2,3.6,2.2,{code:'cellar',label:'Steward: so I don\'t forget it'});
  B.cp(2,0,-45.6,{w:3,d:2.4});
  // the courtyard: the cellar, the two towers and the battlement bridge, the moat, the keep
  B.floor(-20,-48,20,-84,{col:'#77736c',mat:'floor'});B.wallZ(20,-48,-84);B.wallZ(-20,-48,-84,[{c:-50.5,w:DW,h:DH}]);
  B.wallX(-48,-20.5,-4.5);B.wallX(-48,4.5,20.5);B.wallX(-84,-20.5,20.5,[{c:0,w:DW,h:DH}]);
  B.lava(-20,-53,20,-78);
  B.panel('cpad',-19.45,1.6,-52.4,PI/2,{pad:'cellar'},{icon:'pad',stand:[-18.4,-52.4]});
  B.door('z',-20,-50.5,'cellardoor',{col:'#5a4636'});
  B.floor(-27,-47,-20,-54,{col:'#6a6660',mat:'floor'});B.wallX(-47,-27.5,-20);B.wallX(-54,-27.5,-20);B.wallZ(-27,-47,-54);
  B.sign(-26.45,3.2,-50.5,PI/2,3.4,2.2,{code:'keep',half:1,label:'Keep door code, 2nd half'});
  B.blk(-25.4,-48.4,2,1.6,1.2,WOOD);B.blk(-25.4,-52.6,2,1.6,.9,WOOD);
  // west tower (ladder up its south face, the first half on top), east tower, the bridge between
  for(const s of [-1,1])B.blk(s*16,-57,8,8,5.6,Object.assign({name:s<0?'towerW':'towerE'},STONE));
  B.box(-16,2.8,-52.55,1.4,5.6,.9,{truss:true,mat:'truss',col:'#c9b48a',name:'ladderW'});
  B.sign(-16,5.62,-58.4,0,2.6,1.6,{code:'keep',half:0,flat:true,label:'Keep door code, 1st half'});
  B.plat(-8.5,5.6,-57,7,1.6,Object.assign({name:'brA'},WOOD));
  B.plat(-3,5.6,-57,2,1.6,{crumble:true,mat:'crumble',col:'#b08a5a',name:'brC1'});
  B.plat(.4,5.6,-57,2,1.6,{crumble:true,mat:'crumble',col:'#b08a5a',name:'brC2'});
  B.plat(7.5,5.6,-57,9,1.6,Object.assign({name:'brB'},WOOD));
  B.wind(-12,-53,12,-61,4,12,[0,1.6],{name:'breeze'});
  B.wind(-12,-53,12,-61,4,12,[0,3.8],{timed:{per:4,on:.35,ph:.2},name:'gust'});
  B.blk(0,-61.4,1.8,1.8,3,STONE);B.item('gem','gem',0,3.9,-61.4);
  B.cp(3,-16,-57.6,{top:5.6,w:2.6,d:2.6});B.cp(4,16,-57,{top:5.6,w:2.6,d:2.6});
  // from the east tower over the moat to the keep
  B.plat(16,4.4,-65,2.4,2.4,Object.assign({name:'k1'},STONE));
  B.plat(12,3.4,-69.6,2.6,2.6,{move:{type:'swing',dx:1,len:7,amp:.5,per:4.4},mat:'wood',col:'#a07a4a',name:'swingK'});
  B.deco(9,10.4,-69.6,22,.5,.5,IRON);
  B.plat(5.6,2.2,-73.8,2.4,2.4,Object.assign({name:'k3'},STONE));
  B.cp(5,0,-80.6,{w:3,d:2.4});
  B.panel('pad',-4,1.6,-83.35,0,{pad:'keep'},{icon:'pad'});
  B.door('x',-84,0,'keepdoor',{col:'#4a3a2a',part:{mat:'vaultdoor'}});
  exitHall(B,0,-84);
  B.sign(-9,6.6,-83.45,0,7,1.6,{title:'Siege Works',sub:'The keep wants its own code'});
  // decor: banners, torches, arrow slits
  for(const [x,z,yaw] of [[-15.5,-10,PI/2],[15.5,-10,-PI/2],[-19.5,-70,PI/2],[19.5,-70,-PI/2]])B.poster(x,z,yaw,'#9b2335',{y:6.2,w:2,h:3.4});
  for(const z of [-30,-40])for(const s of [-1,1])B.win(s*4.5,z,-s*PI/2,{y:6.6,w:.6,h:2.2,glass:'#ffcf8a',frame:'#2b2b35',noBar:true});
  // route: the winch and the race to the portcullis, the blades, the cellar, the towers and the bridge, the keep
  const swing=W.byName.get('swingK');
  B.use('winch',-10,0,2.2);
  B.j(-9,.8,-2.6);B.j(-5.4,1.2,-6.2);B.j(-1.6,1.6,-9.8);B.j(2.4,1.2,-13.4);B.j(0,.8,-17.2);B.j(0,0,-21.6);B.w(0,0,-26.2);
  B.w(0,0,-30.2);B.j(0,0,-33.9,{wait:true});B.w(0,0,-36.8);B.j(0,0,-40.6,{wait:true});B.w(0,0,-45.6);
  B.w(-14,0,-50.6);B.w(-18.4,0,-52.4);B.use('cpad',-18.4,0,-52.4);B.code('cellar');B.w(-21.6,0,-50.5);B.w(-24,0,-50.5);B.w(-16,0,-50.6);B.w(-16,0,-51.6);
  B.ladder('ladderW',(t,W,pl)=>pl.gr&&pl.y>5.5?'done':'climb');B.w(-16,5.6,-57.6);B.w(-12.6,5.6,-57);
  B.w(-5.6,5.6,-57);B.j(-3,5.6,-57,{wait:true});B.j(.4,5.6,-57);B.j(4,5.6,-57,{wait:true});B.w(16,5.6,-57);
  B.j(16,4.4,-65,{wait:true});B.jon('swingK',0,{wait:true});B.j(5.6,2.2,-73.8,{wait:true});B.j(3,0,-79.4,{wait:true});
  B.w(-4,0,-82.2);B.use('pad',-4,0,-82.2);B.code('keep');B.w(0,0,-87.6);B.w(0,0,-89.2);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}},

// 4. A dragon's keep. Over the ember bridge (dodge the breath) to the hoard, where the sleeping dragon snores rings of
// fire. The tapestry by the bridge shows the dragon's lullaby: strike the four gongs on the gold piles in that order
// and the cage round its key opens. Take the key and the dragon wakes: it follows your trail a few seconds behind, so
// don't stop until the key has opened the door at the end of the run.
{id:'dragonkeep',name:'Dragon\'s Wake',sub:'The dragon\'s keep',par:150,chaser:'dragon',chaserCol:'#7a1d1d',sea:true,sky:['#2b0f14','#ff9a62'],pal:{floor:'#6e5a4a',wall:'#7a4b3a',prop:'#c9a24a',trim:'#2a1410'},
msgs:{cage:'The lullaby plays. The cage opens'},unlock:['cage'],
build(B,r){
  const W=B.W,ROCK={col:'#5a4a40',mat:'stone'},GOLD={col:'#e8b923',mat:'metal'},RED={col:'#8e2a2a',mat:'plastic'};
  const SYMS=['sun','moon','star','eye'];W.seqs.gong={order:shuffle(SYMS.slice(),r),set:'cage'};
  // the ember bridge: slabs over the lava, the dragon's breath sweeping across the long one
  B.floor(-12,6.5,12,-24,{col:'#5e4c40',mat:'floor'});B.wallZ(-12,7,-24);B.wallZ(12,7,-24);B.wallX(7,-12.5,12.5);
  B.cp(0,0,3.6);
  B.lava(-12,1,12,-20);
  B.plat(0,.6,-2.6,3,2.4,Object.assign({name:'s1'},ROCK));
  B.plat(-3.6,1,-6.6,2.4,2.4,Object.assign({name:'s2'},ROCK));
  B.plat(0,1.4,-10.4,7,2.4,Object.assign({name:'s3'},ROCK));
  B.laser(0,2.9,-10.4,.5,3,2.6,{timed:{per:2.4,on:.45,ph:0},name:'breath'});B.deco(0,4.6,-10.4,1,.3,2.8,{col:'#3a1a10',mat:'metal'});
  B.plat(3.6,1,-14.4,2.4,2.4,{crumble:true,mat:'crumble',col:'#9a7a62',name:'s4'});
  B.plat(0,.6,-18,3,2.4,Object.assign({name:'s5'},ROCK));
  B.cp(1,0,-21.8,{w:3,d:2.4});
  B.wallX(-24,-16.5,16.5,[{c:0,w:DW,h:DH}]);
  B.sign(-7,5.4,-23.45,0,7,4.2,{w6:'order',g:'gong',title:'The dragon\'s lullaby',sub:'Strike the gongs in this order'});
  // the hoard: gold everywhere, four gongs on piles, rings of fire from the dragon's snores, the key in its cage
  B.floor(-16,-24,16,-58,{col:'#d9a63a',mat:'floor'});B.wallZ(-16,-24,-58);B.wallZ(16,-24,-58);
  B.wallX(-58,-16.5,16.5,[{c:0,w:DW,h:DH}]);
  const P={sun:[-11,-30,1.2],moon:[11,-31,3.8,[11,-27.6,1.9]],star:[-11,-43,3.8,[-11,-39.6,1.9]],eye:[11,-44,1.2]};
  for(const sym of SYMS){const [x,z,top,st]=P[sym],sx=x<0?1.05:-1.05;
    B.blk(x,z,3,3,top,Object.assign({name:'pile_'+sym},GOLD));if(st)B.blk(st[0],st[1],2.4,2.4,st[2],Object.assign({name:'step_'+sym},GOLD));
    B.btn('gong_'+sym,x,z,{seq:'gong',sym},{top:top+1.1,icon:sym,col:'#ffd23f',baseCol:'#6b4a1a',stand:[x+sx,z]});
    B.dcyl(x,top+2.4,z,.9,.18,{col:'#c98b3a',mat:'metal'})}
  B.blk(9,-50.6,2.4,2.4,3,Object.assign({name:'gemstep'},GOLD));B.blk(12.6,-54,2.6,2.6,5.2,Object.assign({name:'gempile'},GOLD));B.item('gem','gem',12.6,6.1,-54);
  // the dragon, asleep in the middle of its hoard, and its snores
  B.blk(0,-38,5,7,2.4,Object.assign({name:'dragon'},RED));B.deco(0,3.2,-34.2,2.6,1.6,2.6,RED);B.deco(0,2.9,-32.6,1.6,.9,1.4,{col:'#5a1414'});
  for(const s of [-1,1]){B.deco(s*3.2,3,-38.6,3.6,.3,4,{col:'#a83a2a',yaw:s*.25});B.deco(s*.7,4.3,-34.6,.3,.9,.3,{col:'#e8e0c8'})}
  B.deco(0,1.2,-43.2,1.4,1,4,RED);
  B.ring(0,-38,13.4,3.4,{on:.75,name:'snore'});
  B.blk(0,-51.6,3.6,3.6,.4,Object.assign({name:'keystone'},ROCK));
  B.item('key','key',0,1.5,-51.6);
  B.add({x:0,y:2,z:-51.6,w:2.6,h:3.2,d:2.6,door:'cage',mat:'door',col:'#c9a24a',name:'cage',cam:true,part:null});
  B.cp(2,0,-55.4,{w:3,d:2.4});
  // the run: crumbling coins, a blinking slab and the locked door, with the dragon on your heels
  B.floor(-8,-58,8,-92,{col:'#5e4c40',mat:'floor'});B.wallZ(-8,-58,-92);B.wallZ(8,-58,-92);
  B.wallX(-92,-8.5,8.5,[{c:0,w:DW,h:DH}]);
  B.lava(-8,-61,8,-84);
  B.plat(-2,.8,-63.4,2.4,2.4,{crumble:true,mat:'crumble',col:'#e8c35a',name:'t1'});
  B.plat(2,1.2,-66.8,2.4,2.4,{crumble:true,mat:'crumble',col:'#e8c35a',name:'t2'});
  B.plat(0,1.6,-70.6,3.4,2.6,Object.assign({name:'t3'},ROCK));
  B.plat(-3,1.2,-74.4,2.4,2.4,{timed:{per:2.2,on:.62,ph:0},mat:'blink',col:'#ffb36b',name:'t4'});
  B.plat(-2.6,.8,-77.8,2.4,2.4,{crumble:true,mat:'crumble',col:'#e8c35a',name:'t5'});
  B.plat(1.4,1.2,-81,2.6,2.4,Object.assign({name:'t6'},ROCK));
  B.cp(3,0,-70.6,{top:1.6,w:2.6,d:2});
  B.door('x',-92,0,'keydoor',{part:{lock:'key',col:'#ffcf3d'}});
  exitHall(B,0,-92);
  B.shadow(-16,-24,16,-92,{delay:2.6,item:'key'});
  B.sign(-3,6.6,-91.45,0,5,1.4,{title:'Dragon\'s Wake',sub:'Don\'t stop'},{deco:true});
  // decor: chains, torches, piles of coins
  for(const [x,z] of [[-14,-27],[14,-27],[-14,-36],[14,-38]])B.blk(x,z,1.6,1.6,.5,GOLD);
  for(const z of [-6,-16])for(const s of [-1,1])B.win(s*11.5,z,-s*PI/2,{y:6.4,glass:'#ff9a62',frame:'#2a1410'});
  // route: the bridge, the gongs in the lullaby's order, the key, the run
  B.w(0,0,2.2);B.j(0,.6,-2.6,{wait:true});B.j(-3.6,1,-6.6,{wait:true});B.j(-2,1.4,-10.4,{wait:true});B.w(2,1.4,-10.4);B.j(3.6,1,-14.4,{wait:true});B.j(0,.6,-18,{wait:true});B.j(-2.4,0,-21.4,{wait:true});
  B.w(0,0,-27);
  const snore=W.byName.get('snore'),clear=(x,z,sec)=>t=>{const d=Math.hypot(x,z+38);for(let k=0;k<=sec;k+=.05){const rr=cur(snore,t+k).rad;if(Math.abs(rr-d)<1.4)return false}return true};
  for(const sym of W.seqs.gong.order){const [x,z,top,st]=P[sym],sx=x<0?1.05:-1.05;
    B.w(x+sx*3.4,0,z);if(st)B.j(st[0],st[2],st[1],{wait:true});B.j(x+sx,top,z,{wait:true});B.use('gong_'+sym,x+sx,top,z);
    B.u(clear(x+sx*3.6,z,1.2));B.j(x+sx*3.6,0,z,{wait:true});B.w(x+sx*5,0,z)}
  B.w(-4,0,-47.6);B.u((t,W)=>flagOn(W,'cage',t));B.w(0,.4,-50.6);B.u((t,W)=>W.st.inv.key>0);B.w(0,0,-55.4);
  B.w(0,0,-59.6);B.j(-2,.8,-63.4);B.j(2,1.2,-66.8);B.j(0,1.6,-70.6);B.w(0,1.6,-70.6);B.j(-3,1.2,-74.4,{wait:true});B.j(-2.6,.8,-77.8);B.j(1.4,1.2,-81);B.j(0,0,-86,{wait:true});
  B.w(0,0,-95);B.w(0,0,-95.4);
  W.spawn={x:0,y:0,z:3.6,yaw:0};
}}
]});
})(Escapade);
