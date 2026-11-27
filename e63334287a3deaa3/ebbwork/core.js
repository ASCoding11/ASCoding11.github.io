/* Flood Crew (first built as Ebbwork; the folder and the save key keep that name): everything that is not drawing. Three parts, in order: EWSim (the water), EW.World (a job site and what
   each tool does to it) and EWMaps (the jobs). No DOM and no three.js, so `node` can load this file and play a job
   by calling the same functions the page does (see the README section). index.html loads it with one script tag. */
// The water: the shallow-water equations on a grid of square cells (0.5 m). Each cell has a ground height g (+ bar, a
// barrier laid on top) and a water depth d. Each edge between two cells has a water speed (u across a cell's east
// edge, v across its south edge, m/s), so the water carries momentum: a current keeps going round a corner, piles up
// against a wall and swirls behind it. Each step:
//   1. the speeds are carried along by the flow itself (semi-Lagrangian advection: look back along the current to
//      where this water came from, and take the speed it had there),
//   2. they speed up downhill on the water surface (gravity),
//   3. friction slows them: Manning's law for the ground, plus a strong drag on thin films so a wet floor creeps
//      rather than racing,
//   4. each edge passes speed x upwind depth x width of water (fx, fy, m3/s); no cell may give more than it holds,
//   5. depths change by what flowed in and out.
// Nothing is added or removed here except through add() and take(), so volume is conserved exactly. Blocks of 8 x 8
// cells go to sleep when nothing in or next to them is changing.
var EWSim=(function(){
  var BS=8,FILM=0.003,GRAV=9.81,AWAKE=45;
  function Sim(W,H,cs){
    this.W=W;this.H=H;this.cs=cs;var n=W*H;this.n=n;
    this.g=new Float32Array(n);this.bar=new Float32Array(n);this.solid=new Uint8Array(n);
    this.d=new Float64Array(n);this.fx=new Float32Array(n);this.fy=new Float32Array(n);
    this.u=new Float32Array(n);this.v=new Float32Array(n);this.u2=new Float32Array(n);this.v2=new Float32Array(n);
    this.k=new Float32Array(n);
    this.BW=Math.ceil(W/BS);this.BH=Math.ceil(H/BS);var nb=this.BW*this.BH;
    this.act=new Uint8Array(nb);this.proc=new Uint8Array(nb);this.was=new Uint8Array(nb);
    this.nProc=0;
    this.mann=0.018;   // Manning's n: about right for paving and short grass
    this.film=0.00006;  // drag on thin water (m^2/s): a 1 cm film barely moves, 10 cm flows freely
    this.drag=0.2;     // a little drag on everything (1/s): rubbish, grass and rough ground in the water. Waves die down in seconds, not minutes
  }
  var P=Sim.prototype;
  P.idx=function(x,z){return z*this.W+x};
  P.wake=function(i){var x=i%this.W,z=(i-x)/this.W;this.act[((z/BS)|0)*this.BW+((x/BS)|0)]=AWAKE};
  P.wakeAll=function(){this.act.fill(AWAKE)};
  P.add=function(i,vol){if(this.solid[i])return 0;this.d[i]+=vol/(this.cs*this.cs);this.wake(i);return vol};
  P.take=function(i,vol){var a=this.cs*this.cs,have=this.d[i]*a,t=vol<have?vol:have;if(t<=0)return 0;this.d[i]-=t/a;if(this.d[i]<0)this.d[i]=0;this.wake(i);return t};
  P.volume=function(mask){var s=0,d=this.d,n=this.n,i;if(mask){for(i=0;i<n;i++)if(mask[i])s+=d[i]}else for(i=0;i<n;i++)s+=d[i];return s*this.cs*this.cs};
  P.surf=function(i){return this.g[i]+this.bar[i]+this.d[i]};
  // bilinear sample of an edge-speed field. F is u (x-edges, sitting at (x+1, z+0.5)) or v (y-edges, at (x+0.5, z+1)),
  // all in cell units.
  function samp(F,W,H,px,pz){var x0=Math.floor(px),z0=Math.floor(pz),fx=px-x0,fz=pz-z0;
    if(x0<0){x0=0;fx=0}else if(x0>W-2){x0=W-2;fx=1}if(z0<0){z0=0;fz=0}else if(z0>H-2){z0=H-2;fz=1}
    var i=z0*W+x0;return (F[i]*(1-fx)+F[i+1]*fx)*(1-fz)+(F[i+W]*(1-fx)+F[i+W+1]*fx)*fz}
  P.step=function(dt){
    var W=this.W,H=this.H,BW=this.BW,BH=this.BH,g=this.g,bar=this.bar,solid=this.solid,d=this.d,fx=this.fx,fy=this.fy,k=this.k;
    var u=this.u,v=this.v,u2=this.u2,v2=this.v2;
    var act=this.act,proc=this.proc,was=this.was,bx,bz,b,x,z,i,j,x0,x1,z0,z1,np=0;
    var cs=this.cs,area=cs*cs,lim=area/dt,gdc=GRAV*dt/cs,s=dt/cs,vmax=0.45*cs/dt,mf=GRAV*this.mann*this.mann*dt,ff=this.film*dt,dr=1+this.drag*dt;
    // which blocks to work on: awake ones and their neighbours
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      b=bz*BW+bx;
      var on=act[b]||(bx>0&&act[b-1])||(bx<BW-1&&act[b+1])||(bz>0&&act[b-BW])||(bz<BH-1&&act[b+BW])?1:0;
      if(!on&&was[b]){ // just fell asleep: stop its flows
        x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
        for(z=z0;z<z1;z++)for(x=x0;x<x1;x++){i=z*W+x;fx[i]=0;fy[i]=0;u[i]=0;v[i]=0}
      }
      proc[b]=on;if(on)np++;
    }
    this.nProc=np;
    // 1. carry the speeds along with the water
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      b=bz*BW+bx;if(!proc[b])continue;
      x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
      for(z=z0;z<z1;z++)for(x=x0;x<x1;x++){
        i=z*W+x;var a=u[i],c=v[i],vb,ub;
        if(a!==0){vb=0.25*(c+(x<W-1?v[i+1]:0)+(z>0?v[i-W]+(x<W-1?v[i-W+1]:0):0));u2[i]=samp(u,W,H,x-a*s,z-vb*s)}else u2[i]=0;
        if(c!==0){ub=0.25*(a+(z<H-1?u[i+W]:0)+(x>0?u[i-1]+(z<H-1?u[i+W-1]:0):0));v2[i]=samp(v,W,H,x-ub*s,z-c*s)}else v2[i]=0;
      }
    }
    // 2-4. gravity, friction, and how much each edge carries
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      b=bz*BW+bx;if(!proc[b])continue;
      x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
      // an edge into a block that is not being worked on carries nothing this step, but wakes this block so the
      // neighbour is worked on from the next step (otherwise water would vanish across that edge)
      var xe=(bx<BW-1&&!proc[b+1])?x1-1:-1,ze=(bz<BH-1&&!proc[b+BW])?z1-1:-1;
      for(z=z0;z<z1;z++)for(x=x0;x<x1;x++){
        i=z*W+x;
        if(solid[i]){fx[i]=0;fy[i]=0;u[i]=0;v[i]=0;continue}
        var zi=g[i]+bar[i],hi=zi+d[i],zj,hj,sill,dw,sp;
        // east edge
        if(x<W-1&&!solid[j=i+1]){zj=g[j]+bar[j];hj=zj+d[j];sill=zi>zj?zi:zj;
          if((hi>hj?hi:hj)-sill>FILM){if(x===xe){u[i]=0;fx[i]=0;act[b]=AWAKE}else{
            sp=u2[i]-gdc*(hj-hi);dw=sp>0?hi-sill:hj-sill;
            if(dw<=FILM){sp=0;fx[i]=0}else{var h43=Math.pow(dw,1.3333);sp=sp/(dr+mf*(sp<0?-sp:sp)/h43+ff/(dw*dw));if(sp>vmax)sp=vmax;else if(sp<-vmax)sp=-vmax;fx[i]=sp*dw*cs}
            u[i]=sp}}else{u[i]=0;fx[i]=0}
        }else{u[i]=0;fx[i]=0}
        // south edge
        if(z<H-1&&!solid[j=i+W]){zj=g[j]+bar[j];hj=zj+d[j];sill=zi>zj?zi:zj;
          if((hi>hj?hi:hj)-sill>FILM){if(z===ze){v[i]=0;fy[i]=0;act[b]=AWAKE}else{
            sp=v2[i]-gdc*(hj-hi);dw=sp>0?hi-sill:hj-sill;
            if(dw<=FILM){sp=0;fy[i]=0}else{var h43b=Math.pow(dw,1.3333);sp=sp/(dr+mf*(sp<0?-sp:sp)/h43b+ff/(dw*dw));if(sp>vmax)sp=vmax;else if(sp<-vmax)sp=-vmax;fy[i]=sp*dw*cs}
            v[i]=sp}}else{v[i]=0;fy[i]=0}
        }else{v[i]=0;fy[i]=0}
      }
    }
    // no cell gives more than it holds (outflows are scaled down together, and so are their speeds)
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      if(!proc[bz*BW+bx])continue;
      x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
      for(z=z0;z<z1;z++)for(x=x0;x<x1;x++){
        i=z*W+x;var out=0,q;
        q=fx[i];if(q>0)out+=q;q=fy[i];if(q>0)out+=q;
        if(x>0){q=fx[i-1];if(q<0)out-=q}
        if(z>0){q=fy[i-W];if(q<0)out-=q}
        var can=d[i]*lim;k[i]=out>can?(out>0?can/out:0):1;
      }
    }
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      if(!proc[bz*BW+bx])continue;
      x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
      for(z=z0;z<z1;z++)for(x=x0;x<x1;x++){
        i=z*W+x;var a2=fx[i],kk;
        if(a2>0){kk=k[i];fx[i]=a2*kk;u[i]*=kk}else if(a2<0){kk=proc[(((z/BS)|0))*BW+(((x+1)/BS)|0)]?k[i+1]:0;fx[i]=a2*kk;u[i]*=kk}
        a2=fy[i];
        if(a2>0){kk=k[i];fy[i]=a2*kk;v[i]*=kk}else if(a2<0){kk=proc[(((z+1)/BS)|0)*BW+((x/BS)|0)]?k[i+W]:0;fy[i]=a2*kk;v[i]*=kk}
      }
    }
    // 5. depths
    var q2=dt/area;
    for(bz=0;bz<BH;bz++)for(bx=0;bx<BW;bx++){
      b=bz*BW+bx;if(!proc[b])continue;
      x0=bx*BS;x1=Math.min(W,x0+BS);z0=bz*BS;z1=Math.min(H,z0+BS);
      var mx=0;
      for(z=z0;z<z1;z++)for(x=x0;x<x1;x++){
        i=z*W+x;var net=-fx[i]-fy[i];
        if(x>0)net+=fx[i-1];if(z>0)net+=fy[i-W];
        net*=q2;var nd=d[i]+net;if(nd<0)nd=0;d[i]=nd;
        if(net<0)net=-net;if(net>mx)mx=net;
      }
      if(mx>4e-5)act[b]=AWAKE;else if(act[b]>0)act[b]--;
      was[b]=1;
    }
    for(b=0;b<BW*BH;b++)if(!proc[b])was[b]=0;
  };
  // speed of the water in a cell (m/s), written into out[0], out[1]
  P.vel=function(i,out){
    var W=this.W,x=i%W;if(this.d[i]<0.004){out[0]=0;out[1]=0;return}
    out[0]=0.5*(this.u[i]+(x>0?this.u[i-1]:0));out[1]=0.5*(this.v[i]+(i>=W?this.v[i-W]:0));
  };
  // Something moving through the water (a person wading) shoves it: the water in front is pushed along and out to
  // the sides, which makes a bow wave and a wake. Only speeds change, so no water is made or lost.
  // (x, z) in cells, (vx, vz) in m/s, r in cells, f = how much of the mover's speed the water takes on per second.
  P.push=function(x,z,vx,vz,r,f,dt){
    var W=this.W,H=this.H,u=this.u,v=this.v,d=this.d,solid=this.solid,sp=Math.sqrt(vx*vx+vz*vz);if(sp<0.05)return;
    var nx=vx/sp,nz=vz/sp,ax=Math.max(0,Math.floor(x-r)),bx=Math.min(W-2,Math.ceil(x+r)),az=Math.max(0,Math.floor(z-r)),bz=Math.min(H-2,Math.ceil(z+r)),cx,cz,i,q,w,ex,ez,ahead,k=f*dt;
    for(cz=az;cz<=bz;cz++)for(cx=ax;cx<=bx;cx++){i=cz*W+cx;if(solid[i]||d[i]<0.02)continue;
      ex=cx+0.5-x;ez=cz+0.5-z;q=Math.sqrt(ex*ex+ez*ez);if(q>r)continue;w=1-q/r;w*=w;
      ahead=(ex*nx+ez*nz)/(q+0.3);                                   // in front of the mover: pushed along; beside: pushed out
      var px=vx*Math.max(0,ahead)+ex/(q+0.3)*sp*0.6,pz=vz*Math.max(0,ahead)+ez/(q+0.3)*sp*0.6;
      u[i]+=(px-u[i])*k*w;v[i]+=(pz-v[i])*k*w;this.wake(i)}
  };
  Sim.FILM=FILM;Sim.BS=BS;Sim.GRAV=GRAV;
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
    w.signs=[];w.stations=[];w.spots=[];w.decos=[];w.pipes=[];w.sinkList=[];w.holdList=[];w.dirty=[];w.spoil=0;w.t=0;w.tick=0;w.removed=0;w.added=0;w.holdIn=0;w._hin=0;
    w.spawn={x:def.w/2,z:def.h/2,yaw:0};w.rand=mulberry(def.seed||7);
    w.hoseLen=opt.hoseLen||9;w.cableLen=opt.cableLen||8;w.pumpRate=opt.pumpRate||0.16;
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
  P.boxAbs=function(x0,z0,x1,z1,y0,y1,col,kind){var b={x0:x0,z0:z0,x1:x1,z1:z1,y0:y0,y1:y1,col:col,kind:kind||'deco'};this.boxes.push(b);return b};
  P.catchment=function(dr){var w=this,S=w.S,out=[],x0=dr.i%w.W,z0=(dr.i-x0)/w.W,r=Math.max(2,Math.round(1.0/S.cs)),a,b,i;
    for(b=-r;b<=r;b++)for(a=-r;a<=r;a++){if(!a&&!b)continue;if(a*a+b*b>r*r+1)continue;var x=x0+a,z=z0+b;if(x<0||z<0||x>=w.W||z>=w.H)continue;i=z*w.W+x;if(!S.solid[i])out.push(i)}return out};
  P.drain=function(x,z,o){o=o||{};var d={x:x,z:z,i:this.cell(x,z),rate:o.rate||0.12,cap:o.cap||10,clear:1,flow:0,n:0,kind:o.kind||'grate',pipe:o.pipe||null};this.drains.push(d);return d};
  P.sinkArea=function(x0,z0,x1,z1){var w=this;w.each(x0,z0,x1,z1,function(i){w.sink[i]=1})};
  P.noJob=function(x0,z0,x1,z1){var w=this;w.each(x0,z0,x1,z1,function(i){w.mask[i]=0})};
  P.river=function(x0,z0,x1,z1,level){var w=this;w.each(x0,z0,x1,z1,function(i){w.hold[i]=level})};
  // a leak: water comes out at (x,z). valve: id of the valve that feeds it (shut it to stop it). wrench:true = can be
  // tightened by hand with the wrench. (nx,nz) is which way the pipe faces, y its height above the ground.
  P.leak=function(x,z,o){o=o||{};var l={x:x,z:z,i:this.cell(x,z),rate:o.rate||0.02,valve:o.valve||null,wrench:!!o.wrench,fixed:false,on:true,y:o.y==null?0.7:o.y,nx:o.nx||0,nz:o.nz||0,px:o.px==null?x:o.px,pz:o.pz==null?z:o.pz,label:o.label||''};this.leaks.push(l);return l};
  P.valve=function(x,z,id,o){o=o||{};var v={x:x,z:z,id:id,closed:false,y:o.y==null?0.9:o.y,nx:o.nx||0,nz:o.nz||0,turn:0};this.valves.push(v);return v};
  P.socket=function(x,z,o){o=o||{};var s={x:x,z:z,y:o.y==null?1.0:o.y,nx:o.nx||0,nz:o.nz||0};this.sockets.push(s);return s};
  P.station=function(x,z,kind,o){o=o||{};this.stations.push({x:x,z:z,kind:kind,y:o.y==null?1.2:o.y,nx:o.nx||0,nz:o.nz||0})};
  // something the player notices when they get near (r metres): shown once and kept in the journal
  P.spot=function(x,z,r,text){this.spots.push({x:x,z:z,r:r,text:text,seen:false})};
  // drawn only: a garden thing with no collision (kind: 'bush', 'pot'), and a pipe run along a wall
  P.deco=function(x,z,kind,o){o=o||{};this.decos.push({x:x,z:z,kind:kind,s:o.s||1,r:o.r||0,x1:o.x1})};
  P.pipe=function(pts,y){this.pipes.push({pts:pts,y:y==null?0.75:y})};
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
    for(k=0;k<w.drains.length;k++){var dr=w.drains[k],dd=d[dr.i],eff=0.03+0.97*Math.pow(dr.clear,1.25),q=dr.rate*World.DRAINX*eff*dt*(dd<0.05?dd/0.05:1),got=S.take(dr.i,q);
      // a grate collects from the ground round it (about a metre across), not just its own cell, so a cleared drain
      // pulls the level down within seconds instead of waiting for the water to crawl into one cell
      if(got<q*0.999){var cat=dr.cat||(dr.cat=w.catchment(dr)),tot=0,m;for(m=0;m<cat.length;m++){i=cat[m];if(S.g[i]+S.bar[i]+d[i]>S.g[dr.i]+0.004)tot+=d[i]}
        if(tot>0){var want=q-got;for(m=0;m<cat.length&&got<q;m++){i=cat[m];if(S.g[i]+S.bar[i]+d[i]>S.g[dr.i]+0.004)got+=S.take(i,Math.min(want*d[i]/tot,d[i]*AREA*0.5))}}}
      dr.flow+=((got/dt)-dr.flow)*0.2;w.removed+=got}
    for(k=0;k<w.sinkList.length;k++){i=w.sinkList[k];if(d[i]>0){w.removed+=d[i]*AREA;d[i]=0}}
    S.step(dt);
    w.debrisStep(dt);
    if(w.tick%8===0)w.stats();
    if(w.tick%30===0){w.holdIn=w._hin;w._hin=0}
  };
  P.valveShut=function(id){for(var k=0;k<this.valves.length;k++)if(this.valves[k].id===id)return this.valves[k].closed;return false};
  P.stats=function(){var w=this,d=w.S.d,m=w.mask,n=w.S.n,s=0,c=0,i,e;for(i=0;i<n;i++)if(m[i]){e=d[i]-World.SKIN;if(e>0){s+=e;c++}} // a skin of water under 8 mm is wet ground, not flood: it is not counted
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
      if(p.heavy>0)p.heavy-=dt;var dd=d[i],fl=dd>0.05&&!(p.heavy>0&&!(p.kick>0));p.fl=fl?1:0; // debris you have just raked lies in a sodden heap for a while before it can float off again
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
      var s=pull?-1:1,side=(ex*-dz+ez*dx);p.vx=s*dx*5.2+(-dz)*side*0.8+(w.rand()-0.5)*0.6;p.vz=s*dz*5.2+dx*side*0.8+(w.rand()-0.5)*0.6;p.kick=0.6;p.heavy=45;n++}
    return n};
  P.takeDebris=function(x,z,r,max){var w=this,out=[];for(var j=w.debris.length-1;j>=0&&out.length<max;j--){var p=w.debris[j],dx=p.x-x,dz=p.z-z;if(dx*dx+dz*dz<r*r){out.push(p);w.debris.splice(j,1)}}return out};
  P.setValve=function(v,closed){v.closed=closed};
  P.fixLeak=function(l){if(l.wrench){l.fixed=true;l.on=false;return true}return false};
  P.scoop=function(x,z,cap){var w=this,S=w.S,cells=[],tot=0;w.each(x-0.75,z-0.75,x+0.75,z+0.75,function(i){if(!S.solid[i]&&S.d[i]>0.001){cells.push(i);tot+=S.d[i]*AREA}});
    if(tot<=0)return 0;var take=Math.min(cap,tot*0.95),got=0;for(var k=0;k<cells.length;k++)got+=S.take(cells[k],take*S.d[cells[k]]*AREA/tot);return got};
  P.pour=function(x,z,vol){var i=this.cell(x,z);if(i<0||this.S.solid[i])return 0;if(this.sink[i]||this.hold[i]>-1e8){this.removed+=vol;return vol}return this.S.add(i,vol)};
  // how low a cell can be dug: DIGMAX below where it started, or a map's `digFloor` (a level in metres) if that is lower,
  // so a high bank can be cut as deep as the ground beside it and a trench through it never has to be a pond
  P.digLow=function(i){var a=this.g0[i]-World.DIGMAX,f=this.def.digFloor;return f!=null&&f<a?f:a};
  P.canDig=function(x,z){var i=this.cell(x,z);return i>=0&&this.soft[i]&&!this.S.solid[i]&&!this.S.bar[i]&&this.S.g[i]>this.digLow(i)+0.01};
  P.dig=function(x,z){var w=this,S=w.S,i=w.cell(x,z);if(!w.canDig(x,z))return false;
    S.g[i]=Math.max(w.digLow(i),S.g[i]-0.24);w.type[i]=T.SOIL;w.spoil++;w.dirty.push(i);S.wake(i);
    var nb=[i-1,i+1,i-w.W,i+w.W];for(var m=0;m<4;m++){var j=nb[m];if(j>=0&&j<S.n&&w.soft[j]&&!S.solid[j]&&!S.bar[j]&&S.g[j]>S.g[i]+0.04){S.g[j]=Math.max(w.digLow(j),Math.max(S.g[i]+0.04,S.g[j]-0.16));w.type[j]=T.SOIL;w.dirty.push(j);S.wake(j)}}
    return true};
  P.canPile=function(x,z){var i=this.cell(x,z);return i>=0&&this.spoil>0&&this.soft[i]&&!this.S.solid[i]&&!this.S.bar[i]&&this.S.g[i]<this.g0[i]+0.36};
  P.pile=function(x,z){var w=this,i=w.cell(x,z);if(!w.canPile(x,z))return false;w.S.g[i]+=0.24;w.type[i]=T.SOIL;w.spoil--;w.dirty.push(i);w.S.wake(i);return true};
  // squeegee: shove thin water one cell along, far cells first
  P.squeegee=function(px,pz,dx,dz){var w=this,S=w.S,d=S.d,moved=0;
    for(var s=2.1;s>=0.55;s-=0.5)for(var lat=-0.5;lat<=0.5;lat+=0.5){var cx=px+dx*s-dz*lat,cz=pz+dz*s+dx*lat,c=w.cell(cx,cz),t=w.cell(cx+dx*0.62,cz+dz*0.62);
      if(c<0||t<0||c===t||S.solid[c]||S.solid[t])continue;var dc=d[c];if(dc<=0.0005||dc>0.07)continue;
      if(S.g[t]+S.bar[t]>S.g[c]+S.bar[c]+dc+0.05)continue;var mv=dc*0.92;d[c]-=mv;d[t]+=mv;moved+=mv*AREA;S.wake(c);S.wake(t)}
    return moved};
  // barrier: three cells in a row; rot 0..3 = along x, diagonal, along z, other diagonal
  var BD=[[1,0],[1,1],[0,1],[-1,1]];
  P.barrierCells=function(x,z,rot){var w=this,cx=Math.floor(x/CS),cz=Math.floor(z/CS),o=BD[rot&3],out=[];
    for(var k=-1;k<=1;k++){var ax=cx+o[0]*k,az=cz+o[1]*k;if(ax<0||az<0||ax>=w.W||az>=w.H)return null;var i=az*w.W+ax;if(w.S.solid[i]||w.S.bar[i]>0||w.sink[i]||w.hold[i]>-1e8)return null;
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
    if(!p.src&&w.tick%15===0)w.autoPower(p);
    if(p.src&&p.src.gen){p.src.dead=S.d[p.src.i]>0.14}
    if(!p.on)p.why='off';else if(!p.src)p.why='power';else if(p.src.gen&&p.src.dead)p.why='wetgen';else if(!p.hose)p.why='hose';else{
      var q=w.pumpRate*World.PUMPX*dt,got=S.take(p.i,q),nb=[p.i-1,p.i+1,p.i-w.W,p.i+w.W];
      for(var m=0;m<4&&got<q*0.999;m++){var i=nb[m];if(i>=0&&i<S.n&&!S.solid[i]&&S.g[i]+S.bar[i]+S.d[i]>S.g[p.i]+0.004)got+=S.take(i,Math.min(q-got,S.d[i]*AREA*0.5))}
      if(got>0){if(w.sink[p.hose.i]||w.hold[p.hose.i]>-1e8){w.removed+=got;p.away=true}else{S.add(p.hose.i,got);p.away=false}}
      p.flow+=(got/dt-p.flow)*0.2;p.run=true;p.why=got>q*0.05?'':'dry';return}
    p.flow*=0.8};
  World.DONE=0.03;World.DRAINX=2.1;World.PUMPX=1.8; // DRAINX, PUMPX: every drain and pump runs this many times its listed rate (raised 26 Nov 2026: draining felt slow)
  World.SKIN=0.008;World.DIGMAX=0.64;World.BARH=0.36;World.T=T;World.CS=CS;World.vnoise=vnoise;
  return {World:World,T:T,CS:CS};
})();
// The jobs. Sizes are in metres; x runs east, z runs south. Each build() lays out one place.
var EWMaps=(function(){
  var T=EW.T;
  function dist(x,z,a,b){return Math.sqrt((x-a)*(x-a)+(z-b)*(z-b))}
  var MAPS=[];
  // 1. Marlow Row: a back yard. The patio drain is buried in leaves and the garden tap's pipe has split.
  MAPS.push({id:'yard',name:'Marlow Row',sub:'Back yard',w:22,h:18,seed:11,pay:60,par:150,sky:'day',
    brief:'The back yard has been under water since the storm, and it is not going down.',
    build:function(b){
      b.ground(function(x,z){var h=dist(x,z,7,14.2);return 0.02*dist(x,z,8,6.5)+Math.max(0,z-9)*0.04-0.11*Math.max(0,1-h*h/0.81)+0.05*bump((h-1.15)/0.35)});   // and a hollow on the lawn with a lip round it: a puddle that cannot drain
      b.surf(0,0,22,9,T.PAVE);b.surf(0,9,22,18,T.GRASS,1);b.surf(17,0,22,3,T.GRAVEL);
      b.noise(0.006,1.7,0,0,22,9);b.noise(0.02,2.3,0,9,22,18);
      b.wall(0,0,17,3,5.2,0xb9aa94,'house');
      b.wall(17,0,22,0.5,1.9,0x8f6f58,'fence');b.wall(21.5,0,22,18,1.9,0x8f6f58,'fence');b.wall(0,17.5,22,18,1.9,0x8f6f58,'fence');b.wall(0,3,0.5,18,1.9,0x8f6f58,'fence');
      b.wall(13.5,13,16.5,16,2.2,0x5d7a6a,'shed');
      b.wall(1,10,3.5,11,0.5,0x7a5a3c,'planter');b.wall(12.5,3,14,3.5,0.55,0x4c5b66,'bin');b.wall(14.5,3,15.5,3.5,0.9,0x3f6b4c,'bin');
      b.wall(5,13.5,6.5,14.5,0.72,0x8a8f93,'table');
      b.drain(8,6.5,{rate:0.62,cap:12});
      b.drain(19.25,5.25,{rate:0.15,cap:6});   // a second, smaller drain by the side path, also blocked
      b.valve(17.02,1.75,'tap',{nx:1,y:0.95});
      b.leak(4.25,3.25,{rate:0.05,valve:'tap',y:0.95,nz:1,pz:3.02,label:'Garden tap pipe'});
      b.leak(11.25,3.25,{rate:0.006,wrench:true,y:0.95,nz:1,pz:3.04,label:'Dripping joint'});   // a joint on the same pipe, for the wrench
      b.pipe([[5.2,3.04],[16.96,3.04]],0.95);b.pipe([[17.04,3.0],[17.04,1.75]],0.95);
      b.wall(18.5,15.2,19,15.7,3.2,0x5b4630,'tree');b.deco(2.2,15.6,'bush',{s:1.2});b.deco(3.6,16.4,'bush',{s:0.9});b.deco(10.5,16.6,'bush',{s:1.1});b.deco(14.2,16.5,'bush',{s:0.8});b.deco(1.4,8.2,'pot');b.deco(16.2,3.5,'pot');b.deco(20.6,6,'bush',{s:0.8});
      b.sign(17.02,2.45,'STOP TAP',{nx:1,y:1.5});
      b.litter(8,6.5,0.8,18);b.litter(8,6.5,5,4);b.litter(19.25,5.25,0.6,9);b.litter(13,12,5,10);b.litter(4,6,3,2);
      b.flood(0,0,22,18,0.50);   // shin to knee deep over the whole patio and half the lawn: it has to look like a flood
      b.spawnAt(12.6,11.0,0.80);
    }});
  function bump(u){return u<-1||u>1?0:1-u*u}
  // 2. Pell Street: shops, a forecourt, and a road whose gullies have vanished under the storm's leftovers.
  MAPS.push({id:'street',name:'Pell Street',sub:'Shop fronts',w:24,h:20,seed:23,pay:110,par:240,sky:'day',needs:['rake','wrench'],
    brief:'The road outside the shops is a pond and the loading bay has filled to the brim.',
    build:function(b){
      b.ground(function(x,z){
        if(z>=13)return 0.03+0.02*Math.abs(z-13.4)+0.004*Math.min(Math.abs(x-5),Math.abs(x-19));
        var f=0.34-0.012*(z-3);if(z>12.5)return f-(z-12.5)*2*(f-0.04);
        if(x>14.5&&x<19.5&&z>4.5&&z<11){if(z<8.5)return -0.12;return -0.12+(z-8.5)/2.5*(f+0.12)}
        return f});
      b.surf(0,0,24,13,T.PAVE);b.surf(0,13,24,20,T.ROAD);b.surf(14.5,4.5,19.5,11,T.CONC);
      b.shape(6,6.5,10,9.5,function(x,z,g){return g-0.05*bump(dist(x,z,8,8)/1.6)});
      b.noise(0.005,1.9);
      b.wall(0,0,12,3,5.4,0xa89a86,'house');b.wall(12,0,24,3,6.0,0x8f8f97,'house');
      b.wall(0,3,0.5,20,2.2,0x3d5a73,'fence');b.wall(23.5,3,24,20,2.2,0x3d5a73,'fence');b.wall(0,19.5,24,20,5.0,0x9b8f80,'houseN');
      b.wall(2,3,3.5,3.5,0.9,0x3f6b4c,'bin');b.wall(9,3,10,4,0.75,0x7a5a3c,'planter');b.wall(15,5,16,6,0.7,0x8a6a3a,'crate');b.wall(18.5,4.5,19.5,5.5,1.0,0x7b6a55,'crate');
      b.wall(14,4,14.5,8.5,1.0,0x6d7478,'rail');b.wall(19.5,4,20,8.5,1.0,0x6d7478,'rail');b.wall(14,4,20,4.5,1.0,0x6d7478,'rail');
      b.drain(5,13.4,{rate:0.15,cap:12});b.drain(19,13.4,{rate:0.15,cap:12});b.drain(17,6.5,{rate:0.035,cap:8});
      b.leak(16.75,4.75,{rate:0.012,wrench:true,y:1.1,nz:1,pz:4.52,label:'Dripping joint'});
      b.litter(5,13.4,0.75,15);b.litter(19,13.4,0.75,14);b.litter(17,6.5,0.7,10);b.litter(12,15,7,26);b.litter(17,7,2,8);b.litter(6,16,3,8);b.litter(18,17,3,8);   // plenty more floating about to wash back onto the gullies
      b.flood(0,0,24,20,0.31);b.flood(6,6.5,10,9.5,0.31);
      b.spot(17,9.5,3,'The loading bay is lower than everything around it. It has a small drain of its own somewhere under that water.');b.spot(8,8,2.2,'A dip in the paving. It will hold a puddle whatever the drains do.');b.spot(12,13.4,4,'A road like this has gullies along the kerb. None are showing.');
      b.spawnAt(2,9,-Math.PI/2);
    }});
  // 3. Tanners Field: allotments in a hollow. No drain at all: the only way out is over, or through, the bank.
  MAPS.push({id:'field',name:'Tanners Field',sub:'Allotments',w:34,h:24,seed:31,pay:160,par:380,digFloor:-0.5,sky:'day',needs:['shovel','rake'],
    brief:'The allotments sit in a hollow. The water came in and has nowhere to go.',
    build:function(b){
      b.ground(function(x,z){var dt=-0.5-0.025*z;if(x>=30.5)return dt-0.12*bump((x-32)/1.5);var g=0.30+0.015*dist(x,z,22,12)+0.30*bump((x-28.75)/1.25);if(x>30)g=g+(x-30)*2*(dt-g);return g});
      b.surf(0,0,34,24,T.GRASS,1);
      for(var k=0;k<4;k++)for(var j=0;j<3;j++)b.surf(3+k*6,5+j*6,7.5+k*6,9.5+j*6,T.SOIL,1);
      b.surf(30.5,0,34,24,T.GRAVEL,0);
      b.noise(0.002,2.2,0,0,30,24);
      b.wall(0,0,34,0.5,1.6,0x4b6a3e,'hedge');b.wall(0,23.5,34,24,1.6,0x4b6a3e,'hedge');b.wall(0,0.5,0.5,23.5,1.6,0x4b6a3e,'hedge');b.wall(33.5,0.5,34,23.5,1.6,0x4b6a3e,'hedge');
      b.wall(2,1,6,3,2.2,0x6f5b47,'shed');b.wall(8,1,9,2,1.1,0x3e6f8a,'butt');b.wall(12,1,14,2.5,0.9,0x6a563f,'crate');b.wall(1,18,2.5,21,1.0,0x6a563f,'crate');
      b.noJob(30.5,0.5,33.5,23.5);   // water in the ditch is on its way out: it does not count
      b.sinkArea(30.5,22.5,33.5,23.5);   // the ditch runs south along the hedge and leaves under it at the far end, so water can be seen running along it
      b.drain(26.25,18.25,{rate:0.05,cap:9,kind:'culvert',pipe:[27.0,30.9]});   // pipe: drawn from the grate through the bank (x from, x to)
      b.valve(6.02,2,'sp',{nx:1,y:0.8});b.leak(6.75,2.25,{rate:0.03,valve:'sp',y:0.7,nx:1,px:6.02,pz:2.5,label:'Standpipe'});
      b.sign(6.02,1.4,'STANDPIPE',{nx:1,y:1.4});
      b.litter(26.25,18.25,0.75,12);b.litter(22,12,8,14);
      b.flood(0,0,30,24,0.48);
      b.spot(22,12,4,'The lowest point of the field, and there is no drain anywhere on it.');b.spot(28,12,3,'A bank. On the far side the ground drops into a ditch that is nearly empty.');b.spot(26.25,18.25,3,'A small pipe runs under the bank here. It is choked, and it sits too high to empty the middle of the field.');
      b.spawnAt(4,5,Math.PI*0.75+Math.PI);
    }});
  // 4. Fenny Underpass: the road dips under a bridge. The sump pump is dead, so nothing leaves by itself.
  MAPS.push({id:'under',name:'Fenny Underpass',sub:'Road under the bridge',w:12,h:30,seed:41,pay:220,par:290,sky:'day',needs:['pump','rake'],
    brief:'The road under the bridge is shut. The council says its pump has given up.',
    build:function(b){
      b.ground(function(x,z){var u=(z-15)/8;if(u>-1&&u<1)return -0.9*(1-u*u);if(z<=7)return -0.03*(7-z);return 0.02*(z-23)});
      b.surf(0,0,12,30,T.ROAD);b.surf(1.5,0,2.5,30,T.CONC);b.surf(9.5,0,10.5,30,T.CONC);
      b.noise(0.004,1.8);
      b.wall(0,0,1.5,30,3.6,0x8a8478,'wall');b.wall(10.5,0,12,30,3.6,0x8a8478,'wall');b.wall(1.5,0,10.5,0.5,1.1,0xd9b53a,'barrier');b.wall(1.5,29.5,10.5,30,1.1,0xd9b53a,'barrier');
      b.boxAbs(0,11.5,12,18.5,3.3,4.3,0x6f7478,'deck');b.boxAbs(0,11.5,12,11.8,2.7,3.3,0x5d6266,'deck');b.boxAbs(0,18.2,12,18.5,2.7,3.3,0x5d6266,'deck');
      b.sinkArea(1.5,0.5,10.5,1.5);
      b.drain(9.25,15.25,{rate:0.03,cap:8});
      b.socket(1.52,9.5,{nx:1,y:1.1});
      b.valve(10.48,26,'main',{nx:-1,y:0.9});b.leak(9.75,19.25,{rate:0.03,valve:'main',y:1.0,nx:-1,px:10.48,pz:19.25,label:'Water main'});
      b.sign(10.48,26.7,'WATER MAIN',{nx:-1,y:1.4});b.sign(9.9,15.25,'PUMP OUT OF ORDER',{nx:-1,y:1.5});b.sign(1.52,10.2,'POWER',{nx:1,y:1.45});
      b.litter(9.25,15.25,0.7,10);b.litter(6,15,4,12);
      b.flood(1.5,7,10.5,23,-0.42);
      b.spot(6,10,2.5,'The road dips under the bridge and climbs out again. Whatever leaves this water has to be lifted out.');b.spot(6,5,2.5,'A storm channel crosses the road up here. Water that reaches it is gone for good.');b.spot(6,24,3,'This end slopes back down towards the bridge.');
      b.spawnAt(6,3.5,Math.PI);
    }});
  // 5. Wharf Cellar: below the river's level. Water seeps in through the light well as fast as you take it out.
  MAPS.push({id:'cellar',name:'Wharf Cellar',sub:'Warehouse cellar',w:16,h:14,seed:53,pay:280,par:310,sky:'cellar',needs:['pump','sandbags','wrench'],
    brief:'The cellar under the old wharf keeps filling. The owner has bailed it twice already.',
    build:function(b){
      b.ground(function(x,z){if(x>=9.5&&x<11.5&&z<5){return z<1.5?1.5:0.07+(5-z)/3.5*1.43}if(x>=12)return 0;return 0.02*dist(x,z,7,8.5)});
      b.surf(0,0,16,14,T.CONC);b.surf(0.5,5,11.5,13.5,T.TILE);b.surf(12,5,15.5,13.5,T.GRAVEL);
      b.noise(0.004,1.6,0.5,0.5,11.5,13.5);
      b.wall(0,0,16,0.5,2.7,0x7d7468,'wall');b.wall(0,13.5,16,14,2.7,0x7d7468,'wall');b.wall(0,0.5,0.5,13.5,2.7,0x7d7468,'wall');b.wall(15.5,0.5,16,13.5,2.7,0x7d7468,'wall');
      b.wall(9,0.5,9.5,5,2.7,0x857b6e,'wall');b.wall(11.5,0.5,16,5,2.7,0x857b6e,'wall');
      b.wall(0.5,4.5,3,5,2.7,0x857b6e,'wall');b.wall(4,4.5,9,5,2.7,0x857b6e,'wall');
      b.wall(11.5,5,12,8,2.7,0x857b6e,'wall');b.wall(11.5,9.5,12,13.5,2.7,0x857b6e,'wall');
      b.wall(1,10.5,2.5,12.5,1.0,0x7b6a55,'crate');b.wall(3,12,4,13,0.7,0x8a6a3a,'crate');b.wall(5.5,1,7.5,2,1.5,0x6d7478,'boiler');b.wall(1,5.5,1.5,7.5,1.6,0x5b4a3a,'crate');
      b.boxAbs(0,0,16,14,2.7,2.9,0x4c4740,'ceil');
      b.river(12.5,5,15.5,13.5,0.30);b.noJob(12,5,15.5,13.5);
      b.sinkArea(9.5,0.5,11.5,1);
      b.socket(8.5,5.02,{nz:1,y:1.2});b.sign(8.5,5.02,'POWER',{nz:1,y:1.55});b.sign(6.2,13.48,'SUMP PUMP: BROKEN',{nz:-1,y:1.4});
      b.leak(1.25,2.75,{rate:0.01,wrench:true,y:1.2,nx:1,px:0.52,pz:2.75,label:'Dripping joint'});
      b.litter(7,8.5,4,10);
      b.flood(0.5,0.5,12,13.5,0.30);
      b.spot(11,8.75,2.2,'A doorway into the light well. The river seeps into the well, and from there into here.');b.spot(7,8.5,2.2,'The floor falls to this point. The pump that used to sit here is broken.');b.spot(10.5,2.2,2,'A street gully at the top of the steps. Good place for a hose end.');
      b.spawnAt(10.5,1.6,Math.PI);
    }});
  // 6. Mill Lane: the stream has broken its bank and is still coming.
  MAPS.push({id:'mill',name:'Mill Lane',sub:'Lane by the stream',w:30,h:24,seed:67,pay:400,par:480,sky:'day',needs:['sandbags','rake','pump','generator','shovel'],
    brief:'The mill stream is through its bank and the whole lane is under. Start with whatever is still feeding it.',
    build:function(b){
      b.ground(function(x,z){
        if(z<3.5)return 0;
        if(z<6){var gap=x>17&&x<20;return gap?0.18:0.30+0.75*bump((z-4.75)/1.25)}
        var g=0.30-0.0065*x+0.004*Math.abs(z-14);
        if(x>2.5&&x<8&&z>15&&z<21)return 0.0;
        var hd=dist(x,z,21,20);if(hd<3.5)g-=0.12*bump(hd/3.5);var cd=dist(x,z,28.25,15.25);if(cd<1.6)g-=0.2*bump(cd/1.6);
        return g});
      b.surf(0,0,30,24,T.GRASS,1);b.surf(0,0,30,3.5,T.GRAVEL,0);b.surf(0,9,30,13,T.ROAD,0);b.surf(1,14,8,22,T.PAVE,0);b.surf(18,16.5,26,23.5,T.SOIL,1);
      b.noise(0.004,2.1,0,6,30,24);
      b.wall(0,0,0.5,24,2.0,0x6e6a62,'wall');b.wall(29.5,0,30,24,2.0,0x6e6a62,'wall');b.wall(0.5,23.5,29.5,24,1.8,0x4b6a3e,'hedge');b.wall(0.5,0,29.5,0.5,1.4,0x4b6a3e,'hedge');
      b.wall(0.5,13.5,8.5,14,1.7,0x9a7b63,'fence');b.wall(0.5,22,8.5,22.5,1.7,0x9a7b63,'fence');b.wall(8,14,8.5,17,1.7,0x9a7b63,'fence');b.wall(8,18.5,8.5,22,1.7,0x9a7b63,'fence');
      b.wall(10.5,15,16,20,4.6,0xb3a48e,'house');b.wall(22,6.5,26,8.5,2.3,0x5d7a6a,'shed');
      b.river(0.5,0.5,29.5,3.5,0.44);
      b.drain(28.25,15.25,{rate:0.7,cap:16,kind:'culvert'});b.drain(14,11,{rate:0.2,cap:10});
      b.litter(28.25,15.25,0.8,20);b.litter(14,11,0.7,12);b.litter(15,11,10,18);b.litter(21,20,3,6);
      b.sign(29.48,15.25,'CULVERT',{nx:-1,y:1.3});
      b.flood(0.5,3.5,29.5,23.5,0.40);
      b.spot(18.5,7.5,3.5,'The stream is pouring through a gap in its bank. Nothing will dry out while it does.');b.spot(4.5,18,3.5,'A sunken garden with a wall round it. There is no drain in it and no power anywhere near.');b.spot(21,20,3,'A hollow in the vegetable patch. The ground between here and the culvert is soft.');b.spot(26.5,15.25,3,'The culvert under the lane. Everything on this side of the bank should be leaving through it.');
      b.spawnAt(3,9.5,-Math.PI/2);
    }});
  // The depot: not a job. A yard to pick a job, buy gear and load the van, with a puddle to try tools on.
  MAPS.depot={id:'depot',name:'The Depot',sub:'Your yard',w:16,h:12,seed:5,depot:true,sky:'day',brief:'',
    build:function(b){
      b.ground(function(x,z){return 0.05+0.012*dist(x,z,4.5,8.5)-0.05*bump(dist(x,z,4.5,8.5)/2.5)});
      b.surf(0,0,16,12,T.CONC);b.surf(0.5,6,8,11.5,T.PAVE);b.surf(11,5,15.5,11.5,T.GRAVEL);b.noise(0.004,1.7);
      b.wall(0,0,16,2.5,3.6,0x5f7d8c,'house');b.wall(0,2.5,0.5,12,2.0,0x8f6f58,'fence');b.wall(15.5,2.5,16,12,2.0,0x8f6f58,'fence');b.wall(0,11.5,16,12,2.0,0x8f6f58,'fence');
      b.wall(8,2.5,10.5,3.5,0.9,0x7a5a3c,'bench');b.wall(12,6,14.5,10.5,2.1,0xe9e4d6,'van');b.wall(1,2.5,2,3.5,1.0,0x7b6a55,'crate');
      b.station(4.5,2.52,'board',{nz:1,y:1.5});b.station(9.25,3.5,'shop',{nz:1,y:1.1});b.station(12,8.25,'van',{nx:-1,y:1.2});
      b.drain(4.5,8.5,{rate:0.08,cap:6});b.litter(4.5,8.5,0.7,7);b.litter(6,8,2.5,5);
      b.flood(0.5,5,9,11.5,0.075);
      b.spawnAt(7,7,0);
    }};
  return MAPS;
})();
if(typeof module!=='undefined')module.exports={EWSim:EWSim,EW:EW,EWMaps:EWMaps};
