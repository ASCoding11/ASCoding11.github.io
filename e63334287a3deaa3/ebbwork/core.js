/* Ebbwork: everything that is not drawing. Three parts, in order: EWSim (the water), EW.World (a job site and what
   each tool does to it) and EWMaps (the jobs). No DOM and no three.js, so `node` can load this file and play a job
   by calling the same functions the page does (see the README section). index.html loads it with one script tag. */
// The water. A grid of square cells. Each has a ground height g (+ bar, a barrier laid on top), a water depth d, and a
// flow through its right and bottom edge (fx, fy, m3/s, signed). Each step: every edge's flow speeds up by the
// difference in surface height across it (and slows by friction), no cell may give more than it holds, then
// depths change by what flowed. Nothing is added or removed here except through add() and take(), so volume is
// conserved. Blocks of 8 x 8 cells go to sleep when nothing in or next to them is changing.
var EWSim=(function(){
  var BS=8,FILM=0.003,GRAV=9.0,AWAKE=45;
  function Sim(W,H,cs){
    this.W=W;this.H=H;this.cs=cs;var n=W*H;this.n=n;
    this.g=new Float32Array(n);this.bar=new Float32Array(n);this.solid=new Uint8Array(n);
    this.d=new Float64Array(n);this.fx=new Float32Array(n);this.fy=new Float32Array(n);
    this.k=new Float32Array(n);
    this.BW=Math.ceil(W/BS);this.BH=Math.ceil(H/BS);var nb=this.BW*this.BH;
    this.act=new Uint8Array(nb);this.proc=new Uint8Array(nb);this.was=new Uint8Array(nb);
    this.nProc=0;this.fric=0.015;this.damp=0.4;
  }
  var P=Sim.prototype;
  P.idx=function(x,z){return z*this.W+x};
  P.wake=function(i){var x=i%this.W,z=(i-x)/this.W;this.act[((z/BS)|0)*this.BW+((x/BS)|0)]=AWAKE};
  P.wakeAll=function(){this.act.fill(AWAKE)};
  P.add=function(i,vol){if(this.solid[i])return 0;this.d[i]+=vol/(this.cs*this.cs);this.wake(i);return vol};
  P.take=function(i,vol){var a=this.cs*this.cs,have=this.d[i]*a,t=vol<have?vol:have;if(t<=0)return 0;this.d[i]-=t/a;if(this.d[i]<0)this.d[i]=0;this.wake(i);return t};
  P.volume=function(mask){var s=0,d=this.d,n=this.n,i;if(mask){for(i=0;i<n;i++)if(mask[i])s+=d[i]}else for(i=0;i<n;i++)s+=d[i];return s*this.cs*this.cs};
  P.surf=function(i){return this.g[i]+this.bar[i]+this.d[i]};
  P.step=function(dt){
    var W=this.W,H=this.H,BW=this.BW,BH=this.BH,g=this.g,bar=this.bar,solid=this.solid,d=this.d,fx=this.fx,fy=this.fy,k=this.k;
    var act=this.act,proc=this.proc,was=this.was,bx,bz,b,x,z,i,x0,x1,z0,z1,np=0;
    var cs=this.cs,area=cs*cs,cdt=dt*GRAV,fr=this.fric*dt,lim=area/dt,dm=1+this.damp*dt;
    // which blocks to work on: awake ones and their neighbours
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      b=bz*BW+bx;
      var on=act[b]||(bx>0&&act[b-1])||(bx<BW-1&&act[b+1])||(bz>0&&act[b-BW])||(bz<BH-1&&act[b+BW])?1:0;
      if(!on&&was[b]){ // just fell asleep: stop its flows
        x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
        for(z=z0;z<z1;z++)for(x=x0;x<x1;x++){i=z*W+x;fx[i]=0;fy[i]=0}
      }
      proc[b]=on;if(on)np++;
    }
    this.nProc=np;
    // 1. flows
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      b=bz*BW+bx;if(!proc[b])continue;
      x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
      // an edge into a block that is not being worked on carries nothing this step, but wakes this block so the
      // neighbour is worked on from the next step (otherwise water would vanish across that edge)
      var xe=(bx<BW-1&&!proc[b+1])?x1-1:-1,ze=(bz<BH-1&&!proc[b+BW])?z1-1:-1;
      for(z=z0;z<z1;z++){
        for(x=x0;x<x1;x++){
          i=z*W+x;
          if(solid[i]){fx[i]=0;fy[i]=0;continue}
          var zi=g[i]+bar[i],di=d[i],hi=zi+di,j,zj,hj,up,f,sill;
          if(x<W-1&&!solid[j=i+1]){
            zj=g[j]+bar[j];hj=zj+d[j];sill=zi>zj?zi:zj;up=(hi>hj?hi:hj)-sill-FILM;
            if(up>0){if(x===xe){fx[i]=0;act[b]=AWAKE}else{f=(fx[i]+cdt*up*(hi-hj))/(dm+fr/(up+0.01));fx[i]=f}}else fx[i]=0;
          }else fx[i]=0;
          if(z<H-1&&!solid[j=i+W]){
            zj=g[j]+bar[j];hj=zj+d[j];sill=zi>zj?zi:zj;up=(hi>hj?hi:hj)-sill-FILM;
            if(up>0){if(z===ze){fy[i]=0;act[b]=AWAKE}else{f=(fy[i]+cdt*up*(hi-hj))/(dm+fr/(up+0.01));fy[i]=f}}else fy[i]=0;
          }else fy[i]=0;
        }
      }
    }
    // 2. no cell gives more than it holds
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      if(!proc[bz*BW+bx])continue;
      x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
      for(z=z0;z<z1;z++)for(x=x0;x<x1;x++){
        i=z*W+x;var out=0,v;
        v=fx[i];if(v>0)out+=v;v=fy[i];if(v>0)out+=v;
        if(x>0){v=fx[i-1];if(v<0)out-=v}
        if(z>0){v=fy[i-W];if(v<0)out-=v}
        var can=d[i]*lim;k[i]=out>can?(out>0?can/out:0):1;
      }
    }
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      if(!proc[bz*BW+bx])continue;
      x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
      for(z=z0;z<z1;z++)for(x=x0;x<x1;x++){
        i=z*W+x;var a=fx[i];
        if(a>0)fx[i]=a*k[i];else if(a<0)fx[i]=a*(proc[(((z/BS)|0))*BW+(((x+1)/BS)|0)]?k[i+1]:0);
        a=fy[i];
        if(a>0)fy[i]=a*k[i];else if(a<0)fy[i]=a*(proc[(((z+1)/BS)|0)*BW+((x/BS)|0)]?k[i+W]:0);
      }
    }
    // 3. depths
    var q=dt/area;
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      b=bz*BW+bx;if(!proc[b])continue;
      x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
      var mx=0;
      for(z=z0;z<z1;z++)for(x=x0;x<x1;x++){
        i=z*W+x;var net=-fx[i]-fy[i];
        if(x>0)net+=fx[i-1];if(z>0)net+=fy[i-W];
        net*=q;var nd=d[i]+net;if(nd<0)nd=0;d[i]=nd;
        if(net<0)net=-net;if(net>mx)mx=net;
      }
      if(mx>4e-5)act[b]=AWAKE;else if(act[b]>0)act[b]--;
      was[b]=1;
    }
    for(b=0;b<BW*BH;b++)if(!proc[b])was[b]=0;
  };
  // speed of the water in a cell (m/s), written into out[0], out[1]
  P.vel=function(i,out){
    var W=this.W,x=i%W,dd=this.d[i];if(dd<0.004){out[0]=0;out[1]=0;return}
    var a=this.fx[i]+(x>0?this.fx[i-1]:0),b=this.fy[i]+(i>=W?this.fy[i-W]:0),s=0.5/(this.cs*(dd+0.02));
    out[0]=a*s;out[1]=b*s;
  };
  Sim.FILM=FILM;Sim.BS=BS;
  return Sim;
})();
// The job site: ground, walls, drains, leaks, valves, debris, pumps, barriers, and what each tool does to them.
// Still no DOM or three.js: index.html draws what is here and calls these functions when the player acts.
var EW=(function(){
  var CS=0.5,AREA=CS*CS,FILM=EWSim.FILM;
  var T={GRASS:0,PAVE:1,SOIL:2,TILE:3,ROAD:4,GRAVEL:5,CONC:6};
  function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function hash2(x,z,s){var h=Math.imul(x*374761393+z*668265263^s*1274126177,1103515245);h^=h>>>13;h=Math.imul(h,1274126177);return((h^h>>>16)>>>0)/4294967296}
  function vnoise(x,z,s){var x0=Math.floor(x),z0=Math.floor(z),fx=x-x0,fz=z-z0;fx=fx*fx*(3-2*fx);fz=fz*fz*(3-2*fz);
    var a=hash2(x0,z0,s),b=hash2(x0+1,z0,s),c=hash2(x0,z0+1,s),d=hash2(x0+1,z0+1,s);return a+(b-a)*fx+(c-a)*fz+(a-b-c+d)*fx*fz}

  function World(def,opt){
    opt=opt||{};
    var w=this;w.def=def;w.W=Math.round(def.w/CS);w.H=Math.round(def.h/CS);w.cs=CS;
    var S=w.S=new EWSim(w.W,w.H,CS),n=S.n;
    w.sh=new Float32Array(n);      // top of a solid cell (m)
    w.type=new Uint8Array(n);      // surface type (T)
    w.soft=new Uint8Array(n);      // 1 = can be dug
    w.mask=new Uint8Array(n).fill(1); // 1 = counts as part of the job
    w.sink=new Uint8Array(n);      // 1 = water here leaves the map (ditch, river outfall)
    w.hold=new Float32Array(n).fill(-1e9); // >-1e8: a river cell held at this surface level
    w.g0=null;w.boxes=[];w.drains=[];w.leaks=[];w.valves=[];w.debris=[];w.pumps=[];w.barriers=[];w.sockets=[];w.gens=[];
    w.signs=[];w.sinkList=[];w.holdList=[];w.dirty=[];w.spoil=0;w.t=0;w.tick=0;w.removed=0;w.added=0;w.holdIn=0;w._hin=0;
    w.spawn={x:def.w/2,z:def.h/2,yaw:0};w.rand=mulberry(def.seed||7);
    w.hoseLen=opt.hoseLen||9;w.cableLen=opt.cableLen||8;w.pumpRate=opt.pumpRate||0.085;
    def.build(w);
    w.g0=new Float32Array(S.g);
    for(var i=0;i<n;i++){if(w.sink[i]){w.sinkList.push(i);w.mask[i]=0}if(w.hold[i]>-1e8){w.holdList.push(i);w.mask[i]=0}if(S.solid[i])w.mask[i]=0}
    S.wakeAll();
    w.left=0;w.wet=0;w.peak=0;w.stats();w.start=w.peak=w.left;
  }
  var P=World.prototype;
  // ---- helpers ----
  P.cell=function(x,z){var cx=Math.floor(x/CS),cz=Math.floor(z/CS);if(cx<0||cz<0||cx>=this.W||cz>=this.H)return -1;return cz*this.W+cx};
  P.cx=function(i){return(i%this.W+0.5)*CS};
  P.cz=function(i){return(((i/this.W)|0)+0.5)*CS};
  P.zb=function(i){return this.S.g[i]+this.S.bar[i]};
  P.each=function(x0,z0,x1,z1,fn){var W=this.W,H=this.H,a=Math.max(0,Math.round(x0/CS)),b=Math.min(W,Math.round(x1/CS)),c=Math.max(0,Math.round(z0/CS)),d=Math.min(H,Math.round(z1/CS));
    for(var z=c;z<d;z++)for(var x=a;x<b;x++)fn(z*W+x,(x+0.5)*CS,(z+0.5)*CS)};
  // ground height between cell centres (the terrain mesh is drawn the same way)
  P.groundAt=function(x,z){var W=this.W,H=this.H,g=this.S.g,u=x/CS-0.5,v=z/CS-0.5,x0=Math.floor(u),z0=Math.floor(v),fx=u-x0,fz=v-z0;
    var xa=x0<0?0:x0>W-1?W-1:x0,xb=x0+1<0?0:x0+1>W-1?W-1:x0+1,za=z0<0?0:z0>H-1?H-1:z0,zb=z0+1<0?0:z0+1>H-1?H-1:z0+1;
    var a=g[za*W+xa],b=g[za*W+xb],c=g[zb*W+xa],d=g[zb*W+xb];return a+(b-a)*fx+(c-a)*fz+(a-b-c+d)*fx*fz};
  P.depthAt=function(x,z){var i=this.cell(x,z);return i<0?0:this.S.d[i]};
  // ---- building a map (called from a map's build()) ----
  P.ground=function(fn){var w=this;w.each(0,0,w.def.w,w.def.h,function(i,x,z){w.S.g[i]=fn(x,z)})};
  P.noise=function(amp,scale,x0,z0,x1,z1){var w=this,s=w.def.seed||7;w.each(x0||0,z0||0,x1||w.def.w,z1||w.def.h,function(i,x,z){w.S.g[i]+=(vnoise(x/scale,z/scale,s)-0.5)*2*amp})};
  P.surf=function(x0,z0,x1,z1,type,soft){var w=this;w.each(x0,z0,x1,z1,function(i){w.type[i]=type;w.soft[i]=soft?1:0})};
  P.shape=function(x0,z0,x1,z1,fn){var w=this;w.each(x0,z0,x1,z1,function(i,x,z){w.S.g[i]=fn(x,z,w.S.g[i])})};
  // a solid block: h is its height above the ground under it. kind is only for drawing.
  P.wall=function(x0,z0,x1,z1,h,col,kind){var w=this,lo=1e9;w.each(x0,z0,x1,z1,function(i){if(w.S.g[i]<lo)lo=w.S.g[i]});if(lo>1e8)lo=0;
    w.each(x0,z0,x1,z1,function(i){w.S.solid[i]=1;w.sh[i]=lo+h});
    var b={x0:x0,z0:z0,x1:x1,z1:z1,y0:lo-0.6,y1:lo+h,col:col,kind:kind||'wall'};w.boxes.push(b);return b};
  // drawn only, no collision (y0,y1 are above the ground at its centre)
  P.box=function(x0,z0,x1,z1,y0,y1,col,kind){var gy=this.groundAt((x0+x1)/2,(z0+z1)/2);var b={x0:x0,z0:z0,x1:x1,z1:z1,y0:gy+y0,y1:gy+y1,col:col,kind:kind||'deco'};this.boxes.push(b);return b};
  P.drain=function(x,z,o){o=o||{};var d={x:x,z:z,i:this.cell(x,z),rate:o.rate||0.12,cap:o.cap||10,clear:1,flow:0,n:0,kind:o.kind||'grate'};this.drains.push(d);return d};
  P.sinkArea=function(x0,z0,x1,z1){var w=this;w.each(x0,z0,x1,z1,function(i){w.sink[i]=1})};
  P.noJob=function(x0,z0,x1,z1){var w=this;w.each(x0,z0,x1,z1,function(i){w.mask[i]=0})};
  P.river=function(x0,z0,x1,z1,level){var w=this;w.each(x0,z0,x1,z1,function(i){w.hold[i]=level})};
  // a leak: water comes out at (x,z). valve: id of the valve that feeds it (shut it to stop it). wrench:true = can be
  // tightened by hand with the wrench. (nx,nz) is which way the pipe faces, y its height above the ground.
  P.leak=function(x,z,o){o=o||{};var l={x:x,z:z,i:this.cell(x,z),rate:o.rate||0.02,valve:o.valve||null,wrench:!!o.wrench,fixed:false,on:true,y:o.y==null?0.7:o.y,nx:o.nx||0,nz:o.nz||0,px:o.px==null?x:o.px,pz:o.pz==null?z:o.pz,label:o.label||''};this.leaks.push(l);return l};
  P.valve=function(x,z,id,o){o=o||{};var v={x:x,z:z,id:id,closed:false,y:o.y==null?0.9:o.y,nx:o.nx||0,nz:o.nz||0,turn:0};this.valves.push(v);return v};
  P.socket=function(x,z,o){o=o||{};var s={x:x,z:z,y:o.y==null?1.0:o.y,nx:o.nx||0,nz:o.nz||0};this.sockets.push(s);return s};
  P.sign=function(x,z,text,o){o=o||{};this.signs.push({x:x,z:z,text:text,y:o.y==null?1.4:o.y,nx:o.nx||0,nz:o.nz||0})};
  P.litter=function(x,z,r,n,kind){var w=this;for(var k=0;k<n;k++){var a=w.rand()*6.283,q=Math.sqrt(w.rand())*r,px=x+Math.cos(a)*q,pz=z+Math.sin(a)*q,i=w.cell(px,pz);
      if(i<0||w.S.solid[i])continue;var kd=kind==null?(w.rand()<0.62?0:w.rand()<0.6?1:2):kind;
      w.debris.push({x:px,z:pz,y:0,vx:0,vz:0,k:kd,a:w.rand()*6.283,s:(w.rand()-0.5)*2,kick:0,fl:0,sz:0.8+w.rand()*0.5})}};
  P.flood=function(x0,z0,x1,z1,level){var w=this;w.each(x0,z0,x1,z1,function(i){if(w.S.solid[i])return;var d=level-w.S.g[i]-w.S.bar[i];if(d>w.S.d[i])w.S.d[i]=d})};
  P.spawnAt=function(x,z,yaw){this.spawn={x:x,z:z,yaw:yaw||0}};

  // ---- every step ----
  var vv=[0,0];
  P.step=function(dt){
    var w=this,S=w.S,d=S.d,k,i,v;
    w.t+=dt;w.tick++;
    for(k=0;k<w.valves.length;k++){v=w.valves[k];var tg=v.closed?1:0;if(v.turn!==tg){v.turn+=(tg>v.turn?1:-1)*dt*1.4;if(Math.abs(v.turn-tg)<0.03)v.turn=tg}}
    for(k=0;k<w.leaks.length;k++){var l=w.leaks[k];l.on=!l.fixed&&!(l.valve&&w.valveShut(l.valve));if(l.on)w.added+=S.add(l.i,l.rate*dt)}
    for(k=0;k<w.holdList.length;k++){i=w.holdList[k];var want=w.hold[i]-S.g[i]-S.bar[i];if(want<0)want=0;var df=want-d[i];if(df>1e-5||df<-1e-5){if(df>0)w._hin+=df*AREA;d[i]=want;S.wake(i)}}
    for(k=0;k<w.pumps.length;k++)w.pumpStep(w.pumps[k],dt);
    if(w.tick%6===0)w.clog();
    for(k=0;k<w.drains.length;k++){var dr=w.drains[k],dd=d[dr.i],eff=0.03+0.97*Math.pow(dr.clear,1.6),q=dr.rate*eff*dt*(dd<0.05?dd/0.05:1),got=S.take(dr.i,q);
      if(got<q*0.999){var nb=[dr.i-1,dr.i+1,dr.i-w.W,dr.i+w.W];for(var m=0;m<4&&got<q;m++){i=nb[m];if(i>=0&&i<S.n&&!S.solid[i]&&S.g[i]+S.bar[i]+d[i]>S.g[dr.i]+0.004)got+=S.take(i,Math.min((q-got),d[i]*AREA*0.5))}}
      dr.flow+=((got/dt)-dr.flow)*0.2;w.removed+=got}
    for(k=0;k<w.sinkList.length;k++){i=w.sinkList[k];if(d[i]>0){w.removed+=d[i]*AREA;d[i]=0}}
    S.step(dt);
    w.debrisStep(dt);
    if(w.tick%8===0)w.stats();
    if(w.tick%30===0){w.holdIn=w._hin;w._hin=0}
  };
  P.valveShut=function(id){for(var k=0;k<this.valves.length;k++)if(this.valves[k].id===id)return this.valves[k].closed;return false};
  P.stats=function(){var w=this,d=w.S.d,m=w.mask,n=w.S.n,s=0,c=0,i,e;for(i=0;i<n;i++)if(m[i]){e=d[i]-FILM;if(e>0.002){s+=e;if(e>0.008)c++}}
    w.left=s*AREA;w.wet=c;if(w.left>w.peak)w.peak=w.left};
  // is any water still coming in?
  P.incoming=function(){for(var k=0;k<this.leaks.length;k++)if(this.leaks[k].on)return true;return this.holdIn>0.004};
  P.fraction=function(){return this.peak>0?this.left/this.peak:0};
  P.isDone=function(){return this.fraction()<=World.DONE&&!this.incoming()};
  // how blocked each drain is: debris lying on or floating over the grate
  P.clog=function(){var w=this,k,j,p;for(k=0;k<w.drains.length;k++){var dr=w.drains[k],n=0;
      for(j=0;j<w.debris.length;j++){p=w.debris[j];var dx=p.x-dr.x,dz=p.z-dr.z;if(dx*dx+dz*dz<0.72)n+=p.k===2?1.5:1}
      dr.n=n;dr.clear=Math.max(0,1-n/dr.cap)}};
  P.debrisStep=function(dt){
    var w=this,S=w.S,d=S.d,W=w.W,j,k;
    for(j=0;j<w.debris.length;j++){var p=w.debris[j],i=w.cell(p.x,p.z);if(i<0)continue;
      var dd=d[i],fl=dd>0.05;p.fl=fl?1:0;
      if(fl){S.vel(i,vv);var tx=vv[0]*0.8,tz=vv[1]*0.8;
        for(k=0;k<w.drains.length;k++){var dr=w.drains[k];if(dr.flow<0.003)continue;var dx=dr.x-p.x,dz=dr.z-p.z,q=dx*dx+dz*dz;if(q<6&&q>0.01){var ds=Math.sqrt(q),pl=Math.min(0.3,dr.flow*2.5)/(0.6+ds);tx+=dx/ds*pl;tz+=dz/ds*pl}
          else if(q<=0.01){tx*=0.2;tz*=0.2}}
        var kk=Math.min(1,(p.kick>0?1.2:3.5)*dt);p.vx+=(tx-p.vx)*kk;p.vz+=(tz-p.vz)*kk;
      }else{var f=Math.max(0,1-(p.kick>0?2.2:9)*dt);p.vx*=f;p.vz*=f}
      if(p.kick>0)p.kick-=dt;
      var sp=p.vx*p.vx+p.vz*p.vz;if(sp<1e-5)continue;
      var here=S.g[i]+S.bar[i]+dd,nx=p.x+p.vx*dt,ni=w.cell(nx,p.z);
      if(ni<0||S.solid[ni]||(ni!==i&&S.g[ni]+S.bar[ni]>here+(fl?0.02:0.3))){p.vx*=-0.2}else p.x=nx;
      var nz=p.z+p.vz*dt;ni=w.cell(p.x,nz);
      if(ni<0||S.solid[ni]||(ni!==i&&S.g[ni]+S.bar[ni]>here+(fl?0.02:0.3))){p.vz*=-0.2}else p.z=nz;
      p.a+=p.s*dt*Math.min(2,Math.sqrt(sp)*3);
    }
  };
  // ---- what the tools do ----
  // rake: push (or pull) debris lying in front of the player
  P.rake=function(px,pz,dx,dz,pull){var w=this,n=0;for(var j=0;j<w.debris.length;j++){var p=w.debris[j],ex=p.x-px,ez=p.z-pz,q=Math.sqrt(ex*ex+ez*ez);
      if(q>2.7)continue;var along=(ex*dx+ez*dz);if(q>0.5&&along/q<0.72)continue;if(along<-0.2)continue;
      var s=pull?-1:1,side=(ex*-dz+ez*dx);p.vx=s*dx*5.2+(-dz)*side*0.8+(w.rand()-0.5)*0.6;p.vz=s*dz*5.2+dx*side*0.8+(w.rand()-0.5)*0.6;p.kick=0.6;n++}
    return n};
  P.setValve=function(v,closed){v.closed=closed};
  P.fixLeak=function(l){if(l.wrench){l.fixed=true;l.on=false;return true}return false};
  P.scoop=function(x,z,cap){var w=this,S=w.S,cells=[],tot=0;w.each(x-0.75,z-0.75,x+0.75,z+0.75,function(i){if(!S.solid[i]&&S.d[i]>0.001){cells.push(i);tot+=S.d[i]*AREA}});
    if(tot<=0)return 0;var take=Math.min(cap,tot*0.95),got=0;for(var k=0;k<cells.length;k++)got+=S.take(cells[k],take*S.d[cells[k]]*AREA/tot);return got};
  P.pour=function(x,z,vol){var i=this.cell(x,z);if(i<0||this.S.solid[i])return 0;if(this.sink[i]){this.removed+=vol;return vol}return this.S.add(i,vol)};
  P.canDig=function(x,z){var i=this.cell(x,z);return i>=0&&this.soft[i]&&!this.S.solid[i]&&!this.S.bar[i]&&this.S.g[i]>this.g0[i]-World.DIGMAX+0.01};
  P.dig=function(x,z){var w=this,S=w.S,i=w.cell(x,z);if(!w.canDig(x,z))return false;
    S.g[i]=Math.max(w.g0[i]-World.DIGMAX,S.g[i]-0.16);w.type[i]=T.SOIL;w.spoil++;w.dirty.push(i);S.wake(i);
    var nb=[i-1,i+1,i-w.W,i+w.W];for(var m=0;m<4;m++){var j=nb[m];if(j>=0&&j<S.n&&w.soft[j]&&!S.solid[j]&&S.g[j]>S.g[i]+0.1){S.g[j]-=0.035;w.dirty.push(j);S.wake(j)}}
    return true};
  P.canPile=function(x,z){var i=this.cell(x,z);return i>=0&&this.spoil>0&&this.soft[i]&&!this.S.solid[i]&&!this.S.bar[i]&&this.S.g[i]<this.g0[i]+0.32};
  P.pile=function(x,z){var w=this,i=w.cell(x,z);if(!w.canPile(x,z))return false;w.S.g[i]+=0.16;w.type[i]=T.SOIL;w.spoil--;w.dirty.push(i);w.S.wake(i);return true};
  // squeegee: shove thin water one cell along, far cells first
  P.squeegee=function(px,pz,dx,dz){var w=this,S=w.S,d=S.d,moved=0;
    for(var s=2.1;s>=0.55;s-=0.5)for(var lat=-0.5;lat<=0.5;lat+=0.5){var cx=px+dx*s-dz*lat,cz=pz+dz*s+dx*lat,c=w.cell(cx,cz),t=w.cell(cx+dx*0.62,cz+dz*0.62);
      if(c<0||t<0||c===t||S.solid[c]||S.solid[t])continue;var dc=d[c];if(dc<=0.0005||dc>0.07)continue;
      if(S.g[t]+S.bar[t]>S.g[c]+S.bar[c]+dc+0.05)continue;var mv=dc*0.92;d[c]-=mv;d[t]+=mv;moved+=mv*AREA;S.wake(c);S.wake(t)}
    return moved};
  // barrier: three cells in a row; rot 0..3 = along x, diagonal, along z, other diagonal
  var BD=[[1,0],[1,1],[0,1],[-1,1]];
  P.barrierCells=function(x,z,rot){var w=this,cx=Math.floor(x/CS),cz=Math.floor(z/CS),o=BD[rot&3],out=[];
    for(var k=-1;k<=1;k++){var ax=cx+o[0]*k,az=cz+o[1]*k;if(ax<0||az<0||ax>=w.W||az>=w.H)return null;var i=az*w.W+ax;if(w.S.solid[i]||w.S.bar[i]>0||w.sink[i])return null;
      for(var q=0;q<w.drains.length;q++)if(w.drains[q].i===i)return null;out.push(i)}
    return out};
  P.placeBarrier=function(x,z,rot){var w=this,S=w.S,cells=w.barrierCells(x,z,rot);if(!cells)return null;var k,i;
    for(k=0;k<3;k++)S.bar[cells[k]]=World.BARH;
    for(k=0;k<3;k++){i=cells[k];var vol=S.d[i];if(vol>0){var nb=[i-1,i+1,i-w.W,i+w.W],best=-1,bh=1e9;for(var m=0;m<4;m++){var j=nb[m];if(j<0||j>=S.n||S.solid[j]||S.bar[j]>0)continue;var h=S.g[j]+S.d[j];if(h<bh){bh=h;best=j}}
        if(best>=0){S.d[best]+=vol;S.d[i]=0;S.wake(best)}}S.wake(i)}
    var b={cells:cells,x:x,z:z,rot:rot&3};w.barriers.push(b);return b};
  P.removeBarrier=function(b){var k=this.barriers.indexOf(b);if(k<0)return;this.barriers.splice(k,1);for(k=0;k<3;k++){this.S.bar[b.cells[k]]=0;this.S.wake(b.cells[k])}};
  // pump: needs power (a socket or generator within cable reach) and a hose end somewhere else
  P.placePump=function(x,z){var i=this.cell(x,z);if(i<0||this.S.solid[i])return null;var p={x:this.cx(i),z:this.cz(i),i:i,on:true,src:null,hose:null,flow:0,run:false,why:''};this.pumps.push(p);this.autoPower(p);return p};
  P.removePump=function(p){var k=this.pumps.indexOf(p);if(k>=0)this.pumps.splice(k,1)};
  P.powerList=function(){return this.sockets.concat(this.gens)};
  P.autoPower=function(p){var w=this,best=null,bd=w.cableLen;w.powerList().forEach(function(s){var q=Math.hypot(s.x-p.x,s.z-p.z);if(q<=bd){bd=q;best=s}});p.src=best;return best};
  P.setHose=function(p,x,z){var i=this.cell(x,z);if(i<0||this.S.solid[i])return false;if(Math.hypot(x-p.x,z-p.z)>this.hoseLen)return false;p.hose={x:x,z:z,i:i};return true};
  P.placeGen=function(x,z){var i=this.cell(x,z);if(i<0||this.S.solid[i])return null;var g={x:this.cx(i),z:this.cz(i),i:i,gen:true,dead:false};this.gens.push(g);for(var k=0;k<this.pumps.length;k++)if(!this.pumps[k].src)this.autoPower(this.pumps[k]);return g};
  P.removeGen=function(g){var k=this.gens.indexOf(g);if(k>=0)this.gens.splice(k,1);for(k=0;k<this.pumps.length;k++)if(this.pumps[k].src===g)this.pumps[k].src=null};
  P.pumpStep=function(p,dt){var w=this,S=w.S;p.run=false;
    if(p.src&&p.src.gen){p.src.dead=S.d[p.src.i]>0.14}
    if(!p.on)p.why='off';else if(!p.src)p.why='power';else if(p.src.gen&&p.src.dead)p.why='wetgen';else if(!p.hose)p.why='hose';else{
      var q=w.pumpRate*dt,got=S.take(p.i,q),nb=[p.i-1,p.i+1,p.i-w.W,p.i+w.W];
      for(var m=0;m<4&&got<q*0.999;m++){var i=nb[m];if(i>=0&&i<S.n&&!S.solid[i]&&S.g[i]+S.bar[i]+S.d[i]>S.g[p.i]+0.004)got+=S.take(i,Math.min(q-got,S.d[i]*AREA*0.5))}
      if(got>0){if(w.sink[p.hose.i])w.removed+=got;else S.add(p.hose.i,got)}
      p.flow+=(got/dt-p.flow)*0.2;p.run=true;p.why=got>q*0.05?'':'dry';return}
    p.flow*=0.8};
  World.DONE=0.03;World.DIGMAX=0.64;World.BARH=0.36;World.T=T;World.CS=CS;World.vnoise=vnoise;
  return {World:World,T:T,CS:CS};
})();
// The jobs. Sizes are in metres; x runs east, z runs south. Each build() lays out one place.
var EWMaps=(function(){
  var T=EW.T;
  function dist(x,z,a,b){return Math.sqrt((x-a)*(x-a)+(z-b)*(z-b))}
  var MAPS=[];
  // 1. Marlow Row: a back yard. The patio drain is buried in leaves and the garden tap's pipe has split.
  MAPS.push({id:'yard',name:'Marlow Row',sub:'Back yard',w:22,h:18,seed:11,pay:60,par:210,sky:'day',
    brief:'The back yard has been under water since the storm, and it is not going down.',
    build:function(b){
      b.ground(function(x,z){return 0.016*dist(x,z,8,6.5)+Math.max(0,z-9)*0.04});
      b.surf(0,0,22,9,T.PAVE);b.surf(0,9,22,18,T.GRASS,1);b.surf(17,0,22,3,T.GRAVEL);
      b.noise(0.006,1.7,0,0,22,9);b.noise(0.02,2.3,0,9,22,18);
      b.wall(0,0,17,3,5.2,0xb9aa94,'house');
      b.wall(17,0,22,0.5,1.9,0x6b5a45,'fence');b.wall(21.5,0,22,18,1.9,0x6b5a45,'fence');b.wall(0,17.5,22,18,1.9,0x6b5a45,'fence');b.wall(0,3,0.5,18,1.9,0x6b5a45,'fence');
      b.wall(16.5,12.5,20.5,16,2.3,0x5d7a6a,'shed');
      b.wall(1,10,3.5,11,0.5,0x7a5a3c,'planter');b.wall(12.5,3,14,3.5,0.55,0x4c5b66,'bin');b.wall(14.5,3,15.5,3.5,0.9,0x3f6b4c,'bin');
      b.wall(5,13.5,6.5,14.5,0.72,0x8a8f93,'table');
      b.drain(8,6.5,{rate:0.13,cap:12});
      b.valve(17.02,1.75,'tap',{nx:1,y:0.8});
      b.leak(4.25,3.25,{rate:0.028,valve:'tap',y:0.75,nz:1,pz:3.02,label:'Garden tap pipe'});
      b.sign(17.02,2.4,'STOP TAP',{nx:1,y:1.35});
      b.litter(8,6.5,0.75,15);b.litter(8,6.5,5,8);b.litter(13,12,5,10);b.litter(4,6,3,4);
      b.flood(0,0,22,18,0.235);
      b.spawnAt(19.3,1.6,Math.PI);
    }});
  return MAPS;
})();
if(typeof module!=='undefined')module.exports={EWSim:EWSim,EW:EW,EWMaps:EWMaps};
