/* Flood Crew (first built as Ebbwork): everything that is modelled. Houses with roofs, windows and doors, fences, hedges,
   garden things, the van, drains, pipes, the things you put down, and the first-person hands and tools. All of it is
   built here from simple shapes and pictures drawn on a canvas: no model or image files. game.js calls
   EWLook.level(world, materials) for a job site, EWLook.dyn(...) for what the player has placed, and EWLook.hands(camera). */
var EWLook=(function(){
'use strict';
var CS=EW.CS;
function rnd(a){return function(){a=(a*16807)%2147483647;return a/2147483647}}
function shade(col,f){var r=Math.min(255,((col>>16)&255)*f)|0,g=Math.min(255,((col>>8)&255)*f)|0,b=Math.min(255,(col&255)*f)|0;return r<<16|g<<8|b}

// ---------------------------------------------------------------- pictures drawn once, tinted by each thing's own colour
function tex(N,draw){var c=document.createElement('canvas');c.width=c.height=N;var x=c.getContext('2d');draw(x,N);var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t}
function speckle(x,N,r,n,w){for(var k=0;k<n;k++){x.fillStyle=r()<0.5?'rgba(0,0,0,'+(0.03+r()*0.06)+')':'rgba(255,255,255,'+(0.03+r()*0.06)+')';x.fillRect(r()*N,r()*N,1+r()*w,1+r()*2)}}
var TEX={
  brick:tex(256,function(x,N){var r=rnd(77);x.fillStyle='#b9b2a8';x.fillRect(0,0,N,N);for(var row=0;row<16;row++)for(var cl=0;cl<5;cl++){var v=196+Math.floor(r()*58),bx=cl*64-(row%2?32:0);x.fillStyle='rgb('+v+','+Math.floor(v*0.97)+','+Math.floor(v*0.94)+')';x.fillRect(bx+2,row*16+2,60,12);if(bx<0)x.fillRect(bx+N+2,row*16+2,60,12)}speckle(x,N,r,2200,3)}),
  wood:tex(256,function(x,N){var r=rnd(31);x.fillStyle='#e6e0d6';x.fillRect(0,0,N,N);for(var k=0;k<8;k++){var v=200+Math.floor(r()*50);x.fillStyle='rgb('+v+','+v+','+v+')';x.fillRect(k*32+1,0,30,N);x.fillStyle='rgba(0,0,0,.22)';x.fillRect(k*32,0,1.5,N)}
    for(k=0;k<420;k++){x.fillStyle='rgba(0,0,0,'+(0.03+r()*0.05)+')';x.fillRect(r()*N,r()*N,1,6+r()*40)}}),
  roof:tex(256,function(x,N){var r=rnd(53);x.fillStyle='#c9c9c9';x.fillRect(0,0,N,N);for(var row=0;row<8;row++)for(var cl=0;cl<9;cl++){var v=186+Math.floor(r()*60),bx=cl*32-(row%2?16:0);x.fillStyle='rgb('+v+','+v+','+v+')';x.fillRect(bx+1,row*32+1,30,30);x.fillStyle='rgba(0,0,0,.28)';x.fillRect(bx,row*32+29,32,3)}speckle(x,N,r,1500,3)}),
  plain:tex(128,function(x,N){var r=rnd(191);x.fillStyle='#ececec';x.fillRect(0,0,N,N);speckle(x,N,r,900,5)})
};

// ---------------------------------------------------------------- one merged mesh per kind of surface
var UNIT=(function(){
  function ni(g){var n=g.toNonIndexed();n.computeVertexNormals();return n}
  var roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,.5, .5,0,.5, .5,1,0, -.5,0,.5, .5,1,0, -.5,1,0,  .5,0,-.5, -.5,0,-.5, -.5,1,0, .5,0,-.5, -.5,1,0, .5,1,0],3));roof.computeVertexNormals();
  var gab=new THREE.BufferGeometry();gab.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,-.5, -.5,0,.5, -.5,1,0,  .5,0,.5, .5,0,-.5, .5,1,0],3));gab.computeVertexNormals();
  return{box:ni(new THREE.BoxGeometry(1,1,1)),cyl:ni(new THREE.CylinderGeometry(1,1,1,10)),cyl6:ni(new THREE.CylinderGeometry(1,1,1,6)),cone:ni(new THREE.CylinderGeometry(0.72,1,1,10)),ico:ni(new THREE.IcosahedronGeometry(1,1)),roof:roof,gable:gab}})();
var M4=new THREE.Matrix4(),V=new THREE.Vector3(),Q=new THREE.Quaternion(),SC=new THREE.Vector3(),N3=new THREE.Matrix3(),E=new THREE.Euler(),UP=new THREE.Vector3(0,1,0);
function Batch(){this.p=[];this.n=[];this.c=[];this.u=[]}
Batch.prototype.geo=function(g,m,col,us){var P=g.attributes.position.array,Nn=g.attributes.normal.array,p=this.p,n=this.n,c=this.c,u=this.u,r=((col>>16)&255)/255,gg=((col>>8)&255)/255,b=(col&255)/255,e=m.elements;us=us||0.8;N3.getNormalMatrix(m);var ne=N3.elements;
  for(var k=0;k<P.length;k+=3){var x=P[k],y=P[k+1],z=P[k+2],wx=e[0]*x+e[4]*y+e[8]*z+e[12],wy=e[1]*x+e[5]*y+e[9]*z+e[13],wz=e[2]*x+e[6]*y+e[10]*z+e[14];
    var nx=Nn[k],ny=Nn[k+1],nz=Nn[k+2],ax=ne[0]*nx+ne[3]*ny+ne[6]*nz,ay=ne[1]*nx+ne[4]*ny+ne[7]*nz,az=ne[2]*nx+ne[5]*ny+ne[8]*nz,l=Math.sqrt(ax*ax+ay*ay+az*az)||1;ax/=l;ay/=l;az/=l;
    p.push(wx,wy,wz);n.push(ax,ay,az);c.push(r,gg,b);var X=Math.abs(ax),Y=Math.abs(ay),Z=Math.abs(az);if(Y>=X&&Y>=Z)u.push(wx*us,wz*us);else if(X>=Z)u.push(wz*us,wy*us);else u.push(wx*us,wy*us)}};
Batch.prototype.box=function(x0,y0,z0,x1,y1,z1,col){M4.makeScale(x1-x0,y1-y0,z1-z0).setPosition((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);this.geo(UNIT.box,M4,col)};
// a round or six-sided post standing up; rt = top radius as a share of r
Batch.prototype.cyl=function(x,y0,z,r,h,col,six){M4.makeScale(r,h,r).setPosition(x,y0+h/2,z);this.geo(six?UNIT.cyl6:UNIT.cyl,M4,col)};
Batch.prototype.cone=function(x,y0,z,r,h,col){M4.makeScale(r,h,r).setPosition(x,y0+h/2,z);this.geo(UNIT.cone,M4,col)};
// a rod between two points
Batch.prototype.rod=function(ax,ay,az,bx,by,bz,r,col){var dx=bx-ax,dy=by-ay,dz=bz-az,l=Math.sqrt(dx*dx+dy*dy+dz*dz)||0.001;Q.setFromUnitVectors(UP,V.set(dx/l,dy/l,dz/l));M4.compose(V.set((ax+bx)/2,(ay+by)/2,(az+bz)/2),Q,SC.set(r,l,r));this.geo(UNIT.cyl6,M4,col)};
Batch.prototype.blob=function(x,y,z,rx,ry,rz,col,ry2){E.set(0,ry2||0,0);Q.setFromEuler(E);M4.compose(V.set(x,y,z),Q,SC.set(rx,ry,rz));this.geo(UNIT.ico,M4,col)};
// a pitched roof over a rectangle: ridge along its longer side (or along 'x'/'z' if given)
Batch.prototype.pitch=function(x0,z0,x1,z1,y0,h,col,gableTo,gcol,axis){var alongX=axis?axis==='x':(x1-x0)>=(z1-z0);E.set(0,alongX?0:Math.PI/2,0);Q.setFromEuler(E);
  M4.compose(V.set((x0+x1)/2,y0,(z0+z1)/2),Q,alongX?SC.set(x1-x0,h,z1-z0):SC.set(z1-z0,h,x1-x0));this.geo(UNIT.roof,M4,col);
  if(gableTo){var o=0.3;M4.compose(V.set((x0+x1)/2,y0,(z0+z1)/2),Q,alongX?SC.set(x1-x0-2*o,h,z1-z0-2*o):SC.set(z1-z0-2*o,h,x1-x0-2*o));gableTo.geo(UNIT.gable,M4,gcol)}};
Batch.prototype.mesh=function(mat){if(!this.p.length)return null;var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));
  var m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;return m};
function mats(clip){var o=mats0();if(clip)for(var k in o)o[k].clippingPlanes=[clip];return o}
function mats0(){return{brick:new THREE.MeshLambertMaterial({vertexColors:true,map:TEX.brick}),wood:new THREE.MeshLambertMaterial({vertexColors:true,map:TEX.wood}),roof:new THREE.MeshLambertMaterial({vertexColors:true,map:TEX.roof}),
  plain:new THREE.MeshLambertMaterial({vertexColors:true,map:TEX.plain}),glass:new THREE.MeshPhongMaterial({vertexColors:true,shininess:90,specular:0x8fa6b5})}}

// ---------------------------------------------------------------- buildings and props, by the kind a map gave each block
var ROOFS=[0x5a606a,0x8a5140,0x6a5a52,0x4e5a63],DOORS=[0x2f6f6a,0x8c2f2a,0x2e4a78,0x3d5a3a,0xd9a441];
function house(B,b,north,seed){var x0=b.x0,x1=b.x1,z0=b.z0,z1=b.z1,y0=b.y0,y1=b.y1,c=b.col,gy=y0+0.6,zf=north?z0:z1,s=north?-1:1,k,r=rnd(seed*13+7);
  B.brick.box(x0,y0,z0,x1,y1,z1,c);
  var span=Math.min(x1-x0,z1-z0),rh=Math.min(2.4,span*0.42+0.4),o=0.3;B.roof.pitch(x0-o,z0-o,x1+o,z1+o,y1,rh,ROOFS[seed%4],B.brick,c);
  B.plain.box(x0-0.02,y1-0.12,z0-o,x1+0.02,y1-0.02,z0-o+0.1,0x2b2f33);B.plain.box(x0-0.02,y1-0.12,z1+o-0.1,x1+0.02,y1-0.02,z1+o,0x2b2f33);   // gutters
  var long=(x1-x0)>=(z1-z0),cx=long?x0+(x1-x0)*0.28:(x0+x1)/2,cz=long?(z0+z1)/2:z0+(z1-z0)*0.28;B.brick.box(cx-0.3,y1+rh*0.35,cz-0.3,cx+0.3,y1+rh+0.55,cz+0.3,shade(c,0.9));B.plain.box(cx-0.36,y1+rh+0.55,cz-0.36,cx+0.36,y1+rh+0.63,cz+0.36,0x8d8a82);B.plain.cyl(cx,y1+rh+0.63,cz,0.11,0.26,0x9a5a40);
  function f(xa,ya,xb,yb,d0,d1,bt,col){bt.box(xa,ya,Math.min(zf+s*d0,zf+s*d1),xb,yb,Math.max(zf+s*d0,zf+s*d1),col)}
  f(x0,gy-0.02,x1,gy+0.34,0,0.05,B.brick,shade(c,0.7));                                   // plinth
  function win(xa,ya,w,h){f(xa,ya,xa+w,ya+h,0.0,0.03,B.glass,0x24333f);var fr=0xf1eee6,t=0.07;if(b.far){f(xa-t,ya-t,xa+w+t,ya+h+t,0,0.015,B.plain,fr);return}f(xa-t,ya-t,xa+w+t,ya,0,0.08,B.plain,fr);f(xa-t,ya+h,xa+w+t,ya+h+t,0,0.08,B.plain,fr);f(xa-t,ya,xa,ya+h,0,0.08,B.plain,fr);f(xa+w,ya,xa+w+t,ya+h,0,0.08,B.plain,fr);
    f(xa+w/2-0.02,ya,xa+w/2+0.02,ya+h,0.03,0.06,B.plain,fr);f(xa,ya+h*0.55-0.02,xa+w,ya+h*0.55+0.02,0.03,0.06,B.plain,fr);f(xa-0.14,ya-t-0.06,xa+w+0.14,ya-t,0,0.16,B.plain,0xd8d2c6);f(xa-0.1,ya+h+t,xa+w+0.1,ya+h+t+0.2,0,0.03,B.brick,shade(c,0.78))}
  var doorAt=x1-2.6,two=y1-gy>4.4;
  if(!b.noWin)for(k=x0+1.3;k+1.3<x1-0.9;k+=2.9){var isDoor=Math.abs(k-doorAt)<1.45&&!b.noDoor;if(!isDoor)win(k,gy+1.0,1.3,1.25);if(two)win(k,gy+3.35,1.3,1.15)}
  if(!b.noDoor){var dc=DOORS[Math.floor(r()*DOORS.length)],dx=doorAt;f(dx,gy,dx+0.95,gy+2.05,0,0.05,B.plain,dc);f(dx-0.08,gy,dx,gy+2.13,0,0.09,B.plain,0xf1eee6);f(dx+0.95,gy,dx+1.03,gy+2.13,0,0.09,B.plain,0xf1eee6);f(dx-0.08,gy+2.05,dx+1.03,gy+2.13,0,0.09,B.plain,0xf1eee6);
    f(dx+0.12,gy+0.25,dx+0.83,gy+0.95,0.05,0.07,B.plain,shade(dc,0.85));f(dx+0.12,gy+1.1,dx+0.83,gy+1.85,0.05,0.07,B.plain,shade(dc,0.85));f(dx+0.78,gy+1.0,dx+0.84,gy+1.06,0.05,0.11,B.plain,0xd9c15a);f(dx-0.2,gy-0.02,dx+1.15,gy+0.1,0,0.5,B.plain,0xbdb8ad);
    f(dx-0.25,gy+2.3,dx+1.2,gy+2.38,0,0.55,B.plain,0x4a4f55)}
  if(!b.far){var px=x0+0.45;B.plain.rod(px,gy,zf+s*0.09,px,y1-0.1,zf+s*0.09,0.05,0x2b2f33)}                                              // downpipe
}
function fence(B,b){var x0=b.x0,x1=b.x1,z0=b.z0,z1=b.z1,y0=b.y0,y1=b.y1,c=b.col,lx=(x1-x0)>(z1-z0),k,len=lx?x1-x0:z1-z0,mid=lx?(z0+z1)/2:(x0+x1)/2,gy=y0+0.6;
  function seg(a,bb,ya,yb,t,bt,col){if(lx)bt.box(x0+a,ya,mid-t,x0+bb,yb,mid+t,col);else bt.box(mid-t,ya,z0+a,mid+t,yb,z0+bb,col)}
  seg(0,len,y0,gy+0.26,0.06,B.plain,0xa9a59b);seg(0,len,gy+0.26,y1-0.06,0.025,B.wood,c);seg(0,len,y1-0.06,y1,0.05,B.wood,shade(c,0.8));
  seg(0,len,gy+0.5,gy+0.58,0.045,B.wood,shade(c,0.8));seg(0,len,y1-0.45,y1-0.37,0.045,B.wood,shade(c,0.8));
  for(k=0;k<=len+0.01;k+=1.8){var a=Math.min(len-0.12,k);seg(a,a+0.12,y0,y1+0.1,0.07,B.wood,shade(c,0.72))}}
function hedge(B,b){var x0=b.x0,x1=b.x1,z0=b.z0,z1=b.z1,y0=b.y0,y1=b.y1,c=b.col,lx=(x1-x0)>(z1-z0),len=lx?x1-x0:z1-z0,r=rnd(Math.floor(x0*7+z0*13)+3),k,h=y1-y0-0.6;
  B.plain.box(x0+0.08,y0,z0+0.08,x1-0.08,y1-0.25,z1-0.08,shade(c,0.7));
  for(k=0.3;k<len;k+=0.62){var px=lx?x0+k:(x0+x1)/2+(r()-0.5)*0.1,pz=lx?(z0+z1)/2+(r()-0.5)*0.1:z0+k;B.plain.blob(px,y0+0.6+h*0.56,pz,0.42+r()*0.12,h*0.52+r()*0.08,0.42+r()*0.12,shade(c,0.92+r()*0.3),r()*3)}}
function shed(B,b,cx,cz){var x0=b.x0,x1=b.x1,z0=b.z0,z1=b.z1,y0=b.y0,y1=b.y1,c=b.col,gy=y0+0.6;B.wood.box(x0,y0,z0,x1,y1,z1,c);B.roof.pitch(x0-0.2,z0-0.2,x1+0.2,z1+0.2,y1,0.75,0x3f454a,B.wood,c);
  var mx=(x0+x1)/2,mz=(z0+z1)/2,dx=cx-mx,dz=cz-mz,d=0.04;                                                                     // the door goes on the side facing the middle of the map
  if(Math.abs(dx)>Math.abs(dz)){var xf=dx<0?x0:x1,s=dx<0?-1:1;B.wood.box(Math.min(xf,xf+s*d),gy,mz-0.45,Math.max(xf,xf+s*d),gy+1.85,mz+0.45,shade(c,0.72));B.plain.box(Math.min(xf,xf+s*0.07),gy+0.9,mz+0.3,Math.max(xf,xf+s*0.07),gy+0.98,mz+0.38,0x2b2f33);B.glass.box(Math.min(xf,xf+s*0.03),gy+1.1,z0+0.3,Math.max(xf,xf+s*0.03),gy+1.6,z0+0.9,0x2a3a48)}
  else{var zf=dz<0?z0:z1,t=dz<0?-1:1;B.wood.box(mx-0.45,gy,Math.min(zf,zf+t*d),mx+0.45,gy+1.85,Math.max(zf,zf+t*d),shade(c,0.72));B.plain.box(mx+0.3,gy+0.9,Math.min(zf,zf+t*0.07),mx+0.38,gy+0.98,Math.max(zf,zf+t*0.07),0x2b2f33);B.glass.box(x0+0.3,gy+1.1,Math.min(zf,zf+t*0.03),x0+0.9,gy+1.6,Math.max(zf,zf+t*0.03),0x2a3a48)}}
function thing(B,b,seed,cx,cz){var x0=b.x0,x1=b.x1,z0=b.z0,z1=b.z1,y0=b.y0,y1=b.y1,c=b.col,kd=b.kind,k,gy=y0+0.6,mx=(x0+x1)/2,mz=(z0+z1)/2,r=rnd(seed+11);
  if(kd==='house')house(B,b,false,seed);else if(kd==='houseN')house(B,b,true,seed);
  else if(kd==='fence')fence(B,b);else if(kd==='hedge')hedge(B,b);else if(kd==='shed')shed(B,b,cx,cz);
  else if(kd==='wall'){B.brick.box(x0,y0,z0,x1,y1,z1,c);if(y1-gy<3)B.plain.box(x0-0.04,y1,z0-0.04,x1+0.04,y1+0.07,z1+0.04,0xa9a59b)}
  else if(kd==='tree'){B.wood.cyl(mx,y0,mz,0.17,y1-y0-0.6,c);var cols=[0xb5772a,0xc98f2e,0x8a8f2f,0xa55a24];for(k=0;k<5;k++)B.plain.blob(mx+(r()-0.5)*1.5,y1-0.5+r()*1.3,mz+(r()-0.5)*1.5,0.95+r()*0.5,0.8+r()*0.4,0.95+r()*0.5,cols[k%4],r()*3)}
  else if(kd==='planter'){B.wood.box(x0,y0,z0,x1,y1,z1,c);B.plain.box(x0+0.07,y1-0.02,z0+0.07,x1-0.07,y1+0.02,z1-0.07,0x3a2c20);var fl=[0xd94f4f,0xf0c94a,0xf2efe6,0xb85fc4];
    for(k=0;k<6;k++){var px=x0+0.3+k*(x1-x0-0.6)/5,pz=mz+(k%2?0.13:-0.13);B.plain.blob(px,y1+0.17,pz,0.2,0.2,0.2,k%2?0x4f7f3d:0x426d35,k);B.plain.blob(px+0.05,y1+0.33,pz,0.07,0.06,0.07,fl[k%4])}}
  else if(kd==='table'){for(k=0;k<5;k++)B.wood.box(x0,y1-0.05,z0+k*(z1-z0)/5+0.01,x1,y1,z0+(k+1)*(z1-z0)/5-0.01,c);[[x0+0.08,z0+0.08],[x1-0.14,z0+0.08],[x0+0.08,z1-0.14],[x1-0.14,z1-0.14]].forEach(function(q){B.wood.box(q[0],y0,q[1],q[0]+0.06,y1-0.05,q[1]+0.06,shade(c,0.8))});
    B.wood.box(x0-0.5,gy+0.4,mz-0.2,x0-0.1,gy+0.45,mz+0.2,c);B.wood.box(x0-0.46,y0,mz-0.16,x0-0.4,gy+0.4,mz-0.1,c);B.wood.box(x0-0.2,y0,mz+0.1,x0-0.14,gy+0.4,mz+0.16,c);B.wood.box(x0-0.5,gy+0.45,mz-0.2,x0-0.45,gy+0.9,mz+0.2,c)}
  else if(kd==='bench'){B.wood.box(x0,y1-0.07,z0,x1,y1,z1,c);B.wood.box(x0+0.05,gy+0.2,z0+0.05,x1-0.05,gy+0.25,z1-0.05,shade(c,0.85));[[x0+0.05,z0+0.05],[x1-0.13,z0+0.05],[x0+0.05,z1-0.13],[x1-0.13,z1-0.13]].forEach(function(q){B.wood.box(q[0],y0,q[1],q[0]+0.08,y1-0.07,q[1]+0.08,shade(c,0.75))});
    B.plain.box(x0+0.3,y1,z0+0.25,x0+0.85,y1+0.24,z0+0.6,0xe07a1c);B.plain.box(x0+0.36,y1+0.24,z0+0.4,x0+0.79,y1+0.27,z0+0.45,0x2b2f33);B.plain.box(x1-1.1,y1,z0+0.25,x1-0.45,y1+0.16,z0+0.7,0x3f7fa8);B.plain.cyl(x1-0.25,y1,z0+0.35,0.09,0.2,0xc8362b)}
  else if(kd==='bin'){B.plain.box(x0+0.07,y0+0.1,z0+0.07,x1-0.07,y1,z1-0.07,c);B.plain.box(x0+0.02,y1,z0+0.02,x1-0.02,y1+0.07,z1-0.02,shade(c,0.75));B.plain.box(x0+0.1,y1+0.07,z0-0.02,x1-0.1,y1+0.1,z0+0.05,shade(c,0.6));
    M4.makeRotationZ(Math.PI/2).scale(V.set(0.11,0.06,0.11)).setPosition(x0+0.1,gy+0.11,z1-0.1);B.plain.geo(UNIT.cyl,M4,0x1b1d1f);M4.makeRotationZ(Math.PI/2).scale(V.set(0.11,0.06,0.11)).setPosition(x1-0.1,gy+0.11,z1-0.1);B.plain.geo(UNIT.cyl,M4,0x1b1d1f)}
  else if(kd==='butt'){B.plain.cone(mx,y0,mz,0.42,y1-y0,c);B.plain.cyl(mx,y1,mz,0.44,0.06,shade(c,0.7));B.plain.box(mx-0.04,gy+0.25,mz+0.4,mx+0.04,gy+0.33,mz+0.52,0xcaa64a)}
  else if(kd==='crate'){B.wood.box(x0+0.03,y0,z0+0.03,x1-0.03,y1-0.02,z1-0.03,c);var e=shade(c,0.75);[y0+0.62,y1-0.1].forEach(function(yy){B.wood.box(x0,yy,z0,x1,yy+0.09,z1,e)});[[x0,z0],[x1-0.08,z0],[x0,z1-0.08],[x1-0.08,z1-0.08]].forEach(function(q){B.wood.box(q[0],y0,q[1],q[0]+0.08,y1,q[1]+0.08,e)})}
  else if(kd==='rail'){var lr=x1-x0>z1-z0;if(lr){B.plain.box(x0,y1-0.06,mz-0.03,x1,y1,mz+0.03,c);B.plain.box(x0,gy+0.5,mz-0.02,x1,gy+0.54,mz+0.02,c);for(k=x0;k<=x1-0.05;k+=1.5)B.plain.box(k,y0,mz-0.03,k+0.06,y1,mz+0.03,c)}else{B.plain.box(mx-0.03,y1-0.06,z0,mx+0.03,y1,z1,c);B.plain.box(mx-0.02,gy+0.5,z0,mx+0.02,gy+0.54,z1,c);for(k=z0;k<=z1-0.05;k+=1.5)B.plain.box(mx-0.03,y0,k,mx+0.03,y1,k+0.06,c)}}
  else if(kd==='barrier'){for(k=x0;k<x1;k+=0.75)B.plain.box(k,gy+0.62,mz-0.04,Math.min(x1,k+0.75),gy+0.98,mz+0.04,(Math.round(k/0.75)%2)?0xd8362b:0xf1eee6);for(k=x0+0.3;k<x1;k+=2.25){B.plain.box(k,y0,mz-0.22,k+0.1,gy+1.0,mz-0.12,0x2b2f33);B.plain.box(k,y0,mz+0.12,k+0.1,gy+1.0,mz+0.22,0x2b2f33)}}
  else if(kd==='van'){var w0=x0+0.08,w1=x1-0.08;B.plain.box(w0,gy+0.42,z0+1.55,w1,gy+2.25,z1,c);B.plain.box(w0,gy+0.42,z0,w1,gy+1.15,z0+1.55,c);B.plain.box(w0+0.05,gy+1.15,z0+0.45,w1-0.05,gy+1.85,z0+1.55,c);
    B.glass.box(w0+0.12,gy+1.2,z0+0.42,w1-0.12,gy+1.78,z0+0.46,0x25313a);B.glass.box(w0+0.02,gy+1.22,z0+0.6,w0+0.06,gy+1.76,z0+1.45,0x25313a);B.glass.box(w1-0.06,gy+1.22,z0+0.6,w1-0.02,gy+1.76,z0+1.45,0x25313a);
    B.plain.box(w0-0.02,gy+0.95,z0+1.7,w0,gy+1.12,z1-0.2,0xe07a1c);B.plain.box(w1,gy+0.95,z0+1.7,w1+0.02,gy+1.12,z1-0.2,0xe07a1c);B.plain.box(w0-0.02,gy+0.5,z0+2.0,w0,gy+2.1,z0+3.1,shade(c,0.86));
    B.plain.box(w0,gy+0.3,z0-0.06,w1,gy+0.52,z0+0.04,0x2b2f33);B.plain.box(w0+0.1,gy+0.6,z0-0.03,w0+0.4,gy+0.8,z0,0xf7f1c8);B.plain.box(w1-0.4,gy+0.6,z0-0.03,w1-0.1,gy+0.8,z0,0xf7f1c8);
    [[w0-0.02,z0+0.85],[w1+0.02,z0+0.85],[w0-0.02,z1-0.95],[w1+0.02,z1-0.95]].forEach(function(q){M4.makeRotationZ(Math.PI/2).scale(V.set(0.36,0.24,0.36)).setPosition(q[0],gy+0.36,q[1]);B.plain.geo(UNIT.cyl,M4,0x17191b)});
    B.plain.box(w0+0.15,gy+2.25,z0+1.8,w0+0.2,gy+2.4,z1-0.2,0x2b2f33);B.plain.box(w1-0.2,gy+2.25,z0+1.8,w1-0.15,gy+2.4,z1-0.2,0x2b2f33);B.wood.box(w0+0.3,gy+2.4,z0+1.7,w0+0.42,gy+2.46,z1-0.1,0xb89a5a);B.wood.box(w0+0.7,gy+2.4,z0+1.7,w0+0.82,gy+2.46,z1-0.1,0xb89a5a)}
  else if(kd==='boiler'){B.plain.cyl(mx,y0,mz,Math.min(x1-x0,z1-z0)*0.48,y1-y0,c);B.plain.cyl(mx,y1,mz,0.07,0.9,0x8b9499);B.plain.box(mx-0.12,gy+0.9,z1-0.02,mx+0.12,gy+1.14,z1+0.03,0xe0b21c)}
  else B.plain.box(x0,y0,z0,x1,y1,z1,c)}
function deco(B,w,d){var gy=w.groundAt(d.x,d.z),s=d.s,r=rnd(Math.floor(d.x*31+d.z*17)+5),k;
  if(d.kind==='bush'){var cols=[0x4f7a3c,0x5b8a3f,0x44693a];for(k=0;k<3;k++)B.plain.blob(d.x+(r()-0.5)*0.6*s,gy+(0.35+r()*0.25)*s,d.z+(r()-0.5)*0.6*s,(0.45+r()*0.2)*s,(0.4+r()*0.2)*s,(0.45+r()*0.2)*s,cols[k],r()*3)}
  else if(d.kind==='pegs'){var px=null,py=0;for(var x=d.x;x<=d.x1+0.01;x+=1.4){var g=w.groundAt(x,d.z);B.wood.box(x-0.03,g-0.05,d.z-0.03,x+0.03,g+0.62,d.z+0.03,0xc9a36a);B.plain.box(x-0.035,g+0.5,d.z-0.035,x+0.035,g+0.64,d.z+0.035,0xff6a10);
      if(px!==null)B.plain.rod(px,py,d.z,x,g+0.58,d.z,0.008,0xff8a2a);px=x;py=g+0.58}}   // survey pegs with a string between them: where to dig
  else if(d.kind==='pot'){B.plain.cone(d.x,gy,d.z,0.2*s,0.34*s,0xa5553a);B.plain.blob(d.x,gy+0.48*s,d.z,0.24*s,0.22*s,0.24*s,0x4f7f3d);B.plain.blob(d.x+0.06,gy+0.66*s,d.z,0.07,0.06,0.07,0xd94f4f)}}

function signTex(text,bg,fg){var c=document.createElement('canvas');c.width=256;c.height=64;var x=c.getContext('2d');x.fillStyle=bg||'#f1ead2';x.fillRect(0,0,256,64);x.strokeStyle=fg||'#1d2a33';x.lineWidth=5;x.strokeRect(3,3,250,58);
  x.fillStyle=fg||'#1d2a33';x.font='700 34px "Barlow Condensed",Arial Narrow,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,34,236);return new THREE.CanvasTexture(c)}
var swirlTex=(function(){var c=document.createElement('canvas');c.width=c.height=128;var x=c.getContext('2d');x.translate(64,64);x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=3;x.lineCap='round';
  for(var a=0;a<6;a++){x.rotate(6.283/6);x.beginPath();for(var t=0;t<1;t+=0.04){var r=6+t*56,an=t*3.4;x.globalAlpha=1-t;x.lineTo(Math.cos(an)*r,Math.sin(an)*r)}x.stroke()}return new THREE.CanvasTexture(c)})();
var STATION={board:['JOB BOARD','#24323a','#ffd27a'],shop:['GEAR','#3a2a18','#ffb25a'],van:['LOAD THE VAN','#1d2a33','#e9efe9']};
var TYPECOL=[[0.34,0.50,0.22],[0.66,0.63,0.57],[0.36,0.27,0.19],[0.74,0.74,0.70],[0.25,0.26,0.28],[0.56,0.52,0.45],[0.60,0.59,0.56]],TYPEPAT=[0,0.75,0,0.4,0,0,2.5];

// A job site. opt: {terrainMat, waterMat, T (translate), shown: which stations exist yet}
function level(w,opt){
  var S=w.S,W=w.W,H=w.H,n=S.n,grp=new THREE.Group(),i,x,z,k,MT=mats(opt.clip),L={grp:grp,W:W,H:H,dyn:null,gush:[],mats:MT};
  // ground: a vertex at every cell centre
  var pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3),pat=new Float32Array(n),wet=new Float32Array(n),idx=new Uint32Array((W-1)*(H-1)*6),q=0;
  for(z=0;z<H;z++)for(x=0;x<W;x++){i=z*W+x;pos[i*3]=(x+0.5)*CS;pos[i*3+2]=(z+0.5)*CS}
  for(z=0;z<H-1;z++)for(x=0;x<W-1;x++){i=z*W+x;idx[q++]=i;idx[q++]=i+W;idx[q++]=i+1;idx[q++]=i+1;idx[q++]=i+W;idx[q++]=i+W+1}
  var tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.BufferAttribute(pos,3));tg.setAttribute('normal',new THREE.BufferAttribute(nor,3));tg.setAttribute('color',new THREE.BufferAttribute(col,3));
  tg.setAttribute('aPat',new THREE.BufferAttribute(pat,1));tg.setAttribute('aWet',new THREE.BufferAttribute(wet,1));tg.setIndex(new THREE.BufferAttribute(idx,1));L.tg=tg;L.wet=wet;
  L.vert=function(i){var x=i%W,z=(i/W)|0,g=S.g,gl=g[x>0?i-1:i],gr=g[x<W-1?i+1:i],gu=g[z>0?i-W:i],gd=g[z<H-1?i+W:i],nx=(gl-gr),nz=(gu-gd),ny=2*CS,l=Math.sqrt(nx*nx+ny*ny+nz*nz);
    pos[i*3+1]=g[i];nor[i*3]=nx/l;nor[i*3+1]=ny/l;nor[i*3+2]=nz/l;var t=w.type[i],c=TYPECOL[t],dug=w.g0?Math.max(0,Math.min(0.45,(w.g0[i]-g[i])*1.6)):0,sh=1-dug;col[i*3]=c[0]*sh;col[i*3+1]=c[1]*sh;col[i*3+2]=c[2]*sh;pat[i]=TYPEPAT[t]};
  for(i=0;i<n;i++)L.vert(i);
  tg.computeBoundingSphere();var tm=new THREE.Mesh(tg,opt.terrainMat);tm.frustumCulled=false;tm.receiveShadow=true;grp.add(tm);
  var cellar=w.def.sky==='cellar',B={brick:new Batch(),wood:new Batch(),roof:new Batch(),plain:new Batch(),glass:new Batch()},cx=w.def.w/2,cz=w.def.h/2;
  w.boxes.forEach(function(b,bi){if(b.kind==='house'&&w.def.depot)b.noDoor=b.noWin=true;thing(B,b,bi+(w.def.seed||1),cx,cz)});
  w.decos.forEach(function(d){deco(B,w,d)});
  if(!cellar){ // the land and the neighbours around the map
    var bg=0,bn=0;for(x=0;x<W;x++){bg+=S.g[x]+S.g[(H-1)*W+x];bn+=2}for(z=0;z<H;z++){bg+=S.g[z*W]+S.g[z*W+W-1];bn+=2}bg=bg/bn-0.04;var dw=w.def.w,dh=w.def.h,F=140,gc=0x58773a;
    B.plain.box(-F,bg-0.5,-F,dw+F,bg,0.3,gc);B.plain.box(-F,bg-0.5,dh-0.3,dw+F,bg,dh+F,gc);B.plain.box(-F,bg-0.5,0.3,0.3,bg,dh-0.3,gc);B.plain.box(dw-0.3,bg-0.5,0.3,dw+F,bg,dh-0.3,gc);
    var R=Math.max(dw,dh)*0.5+11,r=rnd((w.def.seed||3)*7),hc=[0xb39a82,0xa58b74,0xbfae96,0x9c9aa0,0xb07a5e];
    for(k=0;k<14;k++){var a=k/14*6.283+0.2,d=R+(k%3)*8,hx=cx+Math.cos(a)*d,hz=cz+Math.sin(a)*d,hw=4.5+(k*7%4),hh=5+(k*5%3)*0.9,hd=3.6;
      house(B,{x0:hx-hw,x1:hx+hw,z0:hz-hd,z1:hz+hd,y0:bg-0.6,y1:bg+hh,col:hc[k%5],noDoor:true,far:true},hz>cz,k+2);
      var tx=cx+Math.cos(a+0.22)*(d-6),tz=cz+Math.sin(a+0.22)*(d-6);B.wood.cyl(tx,bg,tz,0.2,2.6,0x5b4630);for(var j=0;j<4;j++)B.plain.blob(tx+(r()-0.5)*1.8,bg+3+r()*1.6,tz+(r()-0.5)*1.8,1.2+r()*0.6,1+r()*0.5,1.2+r()*0.6,[0xb5772a,0x6f8a3a,0xc98f2e,0x55793a][(k+j)%4],r()*3)}
  }
  w.sockets.forEach(function(s){var gy=w.groundAt(s.x,s.z)+s.y;B.plain.box(s.x-0.13,gy-0.13,s.z-0.13,s.x+0.13,gy+0.13,s.z+0.13,0xe0b21c);B.plain.box(s.x-0.05+s.nx*0.12,gy-0.05,s.z-0.05+s.nz*0.12,s.x+0.05+s.nx*0.12,gy+0.05,s.z+0.05+s.nz*0.12,0x1c1f22)});
  w.pipes.forEach(function(p){for(var k=0;k<p.pts.length-1;k++){var a=p.pts[k],b=p.pts[k+1],ya=w.groundAt(a[0],a[1])+p.y,yb=w.groundAt(b[0],b[1])+p.y;B.plain.rod(a[0],ya,a[1],b[0],yb,b[1],0.035,0xb87333);
      var len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(var t=1;t<len;t+=2){var u=t/len,px=a[0]+(b[0]-a[0])*u,pz=a[1]+(b[1]-a[1])*u;B.plain.box(px-0.05,ya-0.05,pz-0.05,px+0.05,ya+0.05,pz+0.05,0x6d7478)}}});
  // drains: an iron frame with bars over a dark pit
  // a culvert with `pipe`: a concrete pipe from the grate through the bank, its mouth showing on the far side
  w.drains.forEach(function(d){if(!d.pipe)return;var y0=S.g[d.i]+0.16,x1=d.pipe[1],y1=Math.max(w.groundAt(x1,d.z),-0.3)+0.2;B.plain.rod(d.x+0.45,y0,d.z,d.pipe[0],y0+0.02,d.z,0.26,0x8f918b);B.plain.rod(x1-0.7,y1+0.02,d.z,x1,y1,d.z,0.26,0x8f918b);
    B.plain.box(x1-0.02,y1-0.2,d.z-0.2,x1+0.01,y1+0.2,d.z+0.2,0x101214);B.plain.box(d.pipe[0]-0.1,y0-0.32,d.z-0.5,d.pipe[0]+0.12,y0+0.38,d.z+0.5,0x9a9b95);B.plain.box(d.pipe[0]-0.13,y0-0.22,d.z-0.22,d.pipe[0]-0.1,y0+0.22,d.z+0.22,0x101214)});
  L.drains=w.drains.map(function(d){var gy=S.g[d.i],sc=d.kind==='culvert'?1.35:1,h=0.38*sc;B.plain.box(d.x-h-0.05,gy-0.02,d.z-h-0.05,d.x+h+0.05,gy+0.016,d.z+h+0.05,0x3a4045);
    var hole=new THREE.Mesh(new THREE.PlaneGeometry(h*2,h*2),new THREE.MeshBasicMaterial({color:0x050607}));hole.rotation.x=-Math.PI/2;hole.position.set(d.x,gy+0.018,d.z);grp.add(hole);
    for(var k=0;k<6;k++){var bx=d.x-h+0.05+k*(h*2-0.1)/5;B.plain.box(bx-0.025,gy+0.012,d.z-h,bx+0.025,gy+0.034,d.z+h,0x596268)}
    var sw=new THREE.Mesh(new THREE.RingGeometry(0.08,1.05,28,1),new THREE.MeshBasicMaterial({map:swirlTex,transparent:true,opacity:0,depthWrite:false}));sw.rotation.x=-Math.PI/2;sw.position.set(d.x,gy,d.z);sw.renderOrder=6;grp.add(sw);return{d:d,sw:sw,gy:gy}});
  ['brick','wood','roof','plain','glass'].forEach(function(k){var m=B[k].mesh(MT[k]);if(m)grp.add(m)});
  // valves: a red wheel on a pipe
  L.valves=w.valves.map(function(v){var g=new THREE.Group(),gy=w.groundAt(v.x,v.z);g.position.set(v.x,gy+v.y,v.z);g.rotation.y=Math.atan2(v.nx,v.nz);
    var red=new THREE.MeshLambertMaterial({color:0xd4372b}),met=new THREE.MeshLambertMaterial({color:0x8b9499});function add(m,x,y,z){m.position.set(x||0,y||0,z||0);m.castShadow=true;g.add(m);return m}
    add(new THREE.Mesh(new THREE.BoxGeometry(0.34,0.44,0.03),new THREE.MeshLambertMaterial({color:0x3a4045})),0,0,0.016);add(new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.9,10),met),0,-0.25,0.07);add(new THREE.Mesh(new THREE.BoxGeometry(0.16,0.2,0.14),met),0,0,0.08);
    var st=add(new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.14,8),met),0,0,0.17);st.rotation.x=Math.PI/2;
    var wh=new THREE.Group();wh.position.z=0.24;var tor=new THREE.Mesh(new THREE.TorusGeometry(0.16,0.028,8,20),red);tor.castShadow=true;wh.add(tor);for(var k=0;k<3;k++){var sp=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.032,0.026),red);sp.rotation.z=k*Math.PI/3;wh.add(sp)}
    grp.add(g);bake(g);g.children[0].castShadow=true;g.add(wh);bake(wh);return{v:v,wh:wh}});
  // leaks: the broken end of a pipe; game.js draws the water coming out
  L.leaks=w.leaks.map(function(l){var g=new THREE.Group(),gy=w.groundAt(l.x,l.z);g.position.set(l.px,gy+l.y,l.pz);g.rotation.y=Math.atan2(l.nx,l.nz);
    var cop=new THREE.MeshLambertMaterial({color:0xb87333}),p=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,l.wrench?1.6:1.0,10),cop);p.rotation.z=Math.PI/2;p.position.set(l.wrench?0:0.45,0,0.05);g.add(p);
    var j=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.14,10),new THREE.MeshLambertMaterial({color:0xcaa64a}));j.rotation.z=Math.PI/2;j.position.set(-0.06,0,0.05);g.add(j);grp.add(g);
    return{l:l,x:l.px+l.nx*0.08,y:gy+l.y,z:l.pz+l.nz*0.08,land:gy,pow:1}});
  w.signs.forEach(function(s){var m=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.155),new THREE.MeshBasicMaterial({map:signTex(s.text)}));m.position.set(s.x+s.nx*0.02,w.groundAt(s.x,s.z)+s.y,s.z+s.nz*0.02);m.rotation.y=Math.atan2(s.nx,s.nz);grp.add(m)});
  L.stations=w.stations.map(function(s){var st=STATION[s.kind],ry=Math.atan2(s.nx,s.nz),g=new THREE.Group(),m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.375),new THREE.MeshBasicMaterial({map:signTex(opt.T(st[0]),st[1],st[2])}));m.position.set(s.x+s.nx*0.04,w.groundAt(s.x,s.z)+s.y+0.85,s.z+s.nz*0.04);m.rotation.y=ry;g.add(m);
    if(s.kind==='board'){var bd=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.1,0.04),new THREE.MeshLambertMaterial({color:0x9a7446}));bd.position.set(s.x+s.nx*0.03,w.groundAt(s.x,s.z)+s.y,s.z+s.nz*0.03);bd.rotation.y=ry;g.add(bd);
      for(var k=0;k<6;k++){var pp=new THREE.Mesh(new THREE.PlaneGeometry(0.36,0.42),new THREE.MeshLambertMaterial({color:[0xf3efe2,0xf7e9b0,0xe3eef2][k%3]}));pp.position.set(bd.position.x+(k%3-1)*0.5,bd.position.y+(k<3?0.25:-0.25),bd.position.z+0.03);pp.rotation.y=ry;pp.rotation.z=(k*37%7-3)*0.02;g.add(pp)}}
    grp.add(g);return{s:s,g:g}});
  // debris: leaves, twigs and litter, drawn as instances
  var leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute([-0.17,0,0, -0.05,0.012,0.085, 0.06,0.02,0.07, 0.17,0.004,0, 0.06,0.02,-0.07, -0.05,0.012,-0.085],3));leaf.setIndex([0,1,5, 1,2,4, 1,4,5, 2,3,4]);leaf.computeVertexNormals();
  var twig=new THREE.CylinderGeometry(0.016,0.022,0.5,5);twig.rotateZ(Math.PI/2);var can=new THREE.CylinderGeometry(0.03,0.03,0.105,8);can.rotateZ(Math.PI/2);
  var cols=[[0xc9852b,0xa9641f,0xd9a531,0x8a8f2f,0xb04a1f,0xd46a2a],[0x4a3524,0x5b4330,0x3c2c1f],[0xd8d2c0,0xc0463a,0x4f86b8,0xd9bd4a]];
  L.deb=[leaf,twig,can].map(function(g,kd){var cnt=0;w.debris.forEach(function(p){if(p.k===kd)cnt++});var m=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({side:THREE.DoubleSide}),Math.max(1,cnt));m.frustumCulled=false;m.count=cnt;m.castShadow=kd>0;
    var c=new THREE.Color(),j=0;w.debris.forEach(function(p,pi){if(p.k!==kd)return;c.setHex(cols[kd][pi%cols[kd].length]);m.setColorAt(j,c);p._m=m;p._j=j++;p.dy=S.g[w.cell(p.x,p.z)];p.hop=0});
    if(m.instanceColor)m.instanceColor.needsUpdate=true;grp.add(m);return m});
  // water: the same grid, its own material
  var wp=new Float32Array(n*3),wd=new Float32Array(n),wf=new Float32Array(n*2);for(i=0;i<n;i++){wp[i*3]=pos[i*3];wp[i*3+2]=pos[i*3+2]}
  var wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.BufferAttribute(wp,3));wg.setAttribute('aDepth',new THREE.BufferAttribute(wd,1));wg.setAttribute('aFlow',new THREE.BufferAttribute(wf,2));wg.setIndex(new THREE.BufferAttribute(idx,1));
  var wm=new THREE.Mesh(wg,opt.waterMat);wm.frustumCulled=false;wm.renderOrder=5;grp.add(wm);L.wg=wg;L.wp=wp;L.wd=wd;L.wf=wf;L.wm=wm;
  return L;
}
function dispose(o,keep){o.traverse(function(m){if(m.geometry)m.geometry.dispose();if(m.material&&keep.indexOf(m.material)<0){if(m.material.map&&m.material.map!==swirlTex&&m.material.map!==TEX.brick&&m.material.map!==TEX.wood&&m.material.map!==TEX.roof&&m.material.map!==TEX.plain)m.material.map.dispose();m.material.dispose()}})}

// what the player has put down: sandbags, pumps with hose and cable, generators
function tube(pts,r,col){var m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),Math.max(4,pts.length*3),r,6,false),new THREE.MeshLambertMaterial({color:col}));m.castShadow=true;return m}
function linePts(w,ax,az,bx,bz,ay,by,lift){var n=Math.max(2,Math.ceil(Math.hypot(bx-ax,bz-az)/0.6)),out=[];for(var k=0;k<=n;k++){var t=k/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t,i=w.cell(x,z),gy=w.groundAt(x,z)+(i>=0?w.S.bar[i]:0)+lift;if(k===0&&ay!=null)gy=ay;if(k===n&&by!=null)gy=by;out.push(new THREE.Vector3(x,gy,z))}return out}
function dyn(w,L){
  var g=new THREE.Group(),B=new Batch(),S=w.S,ends=[];
  w.barriers.forEach(function(b){b.cells.forEach(function(i,k){var x=w.cx(i),z=w.cz(i),y=S.g[i],a=b.rot*Math.PI/4;for(var lay=0;lay<3;lay++){var o=(lay%2?0.13:-0.13);B.blob(x+Math.cos(a)*o*(lay===2?0:1),y+0.065+lay*0.115,z+Math.sin(a)*o*(lay===2?0:1),0.3,0.085,0.21,[0xb9a274,0xa98f60,0xc4ad80][(k+lay)%3],-a+(lay===2?0.4:0))}})});
  w.gens.forEach(function(gn){var y=S.g[gn.i],x=gn.x,z=gn.z;B.box(x-0.28,y+0.12,z-0.18,x+0.28,y+0.42,z+0.18,0xe0b21c);B.box(x-0.2,y+0.42,z-0.14,x+0.05,y+0.54,z+0.14,0x2f3639);B.cyl(x+0.17,y+0.42,z,0.07,0.1,0xc8362b);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){B.rod(x+q[0]*0.33,y,z+q[1]*0.23,x+q[0]*0.33,y+0.6,z+q[1]*0.23,0.018,0x2f3639)});B.rod(x-0.33,y+0.6,z-0.23,x+0.33,y+0.6,z-0.23,0.018,0x2f3639);B.rod(x-0.33,y+0.6,z+0.23,x+0.33,y+0.6,z+0.23,0.018,0x2f3639)});
  w.pumps.forEach(function(p){var y=S.g[p.i];B.box(p.x-0.22,y+0.04,p.z-0.16,p.x+0.22,y+0.28,p.z+0.16,0xe0701c);B.cyl(p.x,y+0.28,p.z,0.11,0.13,0x2f3639);B.rod(p.x-0.24,y,p.z-0.18,p.x-0.24,y+0.46,p.z-0.18,0.015,0x2f3639);B.rod(p.x+0.24,y,p.z-0.18,p.x+0.24,y+0.46,p.z-0.18,0.015,0x2f3639);B.rod(p.x-0.24,y+0.46,p.z-0.18,p.x+0.24,y+0.46,p.z-0.18,0.015,0x2f3639);
    if(p.hose){var hy=w.groundAt(p.hose.x,p.hose.z)+0.1;g.add(tube(linePts(w,p.x,p.z,p.hose.x,p.hose.z,y+0.2,hy,0.06),0.05,0x2f79a0));var dx=p.hose.x-p.x,dz=p.hose.z-p.z,dl=Math.hypot(dx,dz)||1;ends.push({p:p,x:p.hose.x,y:hy,z:p.hose.z,dx:dx/dl,dz:dz/dl})}
    if(p.src){var sy=p.src.gen?S.g[p.src.i]+0.3:w.groundAt(p.src.x,p.src.z)+p.src.y;g.add(tube(linePts(w,p.x,p.z,p.src.x,p.src.z,y+0.3,sy,0.03),0.018,0x17191b))}});
  var m=B.mesh(L.mats.plain);if(m)g.add(m);return{grp:g,ends:ends};
}

// Bake a model made of many small meshes into one mesh with vertex colours, so it is one draw call. Children marked
// userData.keep (things that move on their own) are left as they are.
function bake(group,side){group.updateMatrixWorld(true);var inv=new THREE.Matrix4().copy(group.matrixWorld).invert(),p=[],n=[],c=[],kept=[],mm=new THREE.Matrix4(),nm=new THREE.Matrix3(),v=new THREE.Vector3();
  group.traverse(function(o){if(!o.isMesh)return;if(o.userData.keep){kept.push(o);return}var g=o.geometry.index?o.geometry.toNonIndexed():o.geometry,P=g.attributes.position.array,N=g.attributes.normal.array,col=o.material.color;mm.multiplyMatrices(inv,o.matrixWorld);nm.getNormalMatrix(mm);
    for(var k=0;k<P.length;k+=3){v.set(P[k],P[k+1],P[k+2]).applyMatrix4(mm);p.push(v.x,v.y,v.z);v.set(N[k],N[k+1],N[k+2]).applyMatrix3(nm).normalize();n.push(v.x,v.y,v.z);c.push(col.r,col.g,col.b)}});
  kept.forEach(function(o){var w=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);o.parent.remove(o);w.decompose(o.position,o.quaternion,o.scale)});
  while(group.children.length)group.remove(group.children[0]);
  var bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(p,3));bg.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));bg.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
  group.add(new THREE.Mesh(bg,new THREE.MeshLambertMaterial({vertexColors:true,side:side||THREE.FrontSide})));kept.forEach(function(o){group.add(o)});return group}

// ---------------------------------------------------------------- first-person hands and tools
// Each tool is held the way you would hold it: long tools in two gloved hands, the rest carried in one.
function hands(camera){
  var root=new THREE.Group();camera.add(root);var mods={};
  var L=function(c){return new THREE.MeshLambertMaterial({color:c})},wood=L(0xa8804e),steel=L(0x9aa3a8),dark=L(0x2f3639),glove=L(0x565c62),palm=L(0x3c4146),sleeve=L(0x2c4558),band=L(0xe58a22),knuck=L(0xe58a22),or=L(0xe0701c),hess=L(0xb9a274);
  function box(w,h,d,m,x,y,z){var b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x||0,y||0,z||0);return b}
  function rod(a,b,r0,r1,m){var d=new THREE.Vector3().subVectors(b,a),l=d.length(),c=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,l,10),m);c.position.copy(a).addScaledVector(d,0.5);c.quaternion.setFromUnitVectors(UP,d.normalize());return c}
  // a gloved fist round a handle whose direction is `dir`, with a forearm running back to `elbow`
  function ball(rx,ry,rz,mat,x,y,z){var b=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),mat);b.scale.set(rx,ry,rz);b.position.set(x||0,y||0,z||0);return b}
  function grip(at,dir,elbow,left){var g=new THREE.Group(),h=new THREE.Group(),k;g.add(h);
    // a closed fist: a rounded back of the hand, four curled fingers, a thumb across them, and a cuff
    h.add(ball(0.056,0.04,0.06,glove,0,0.022,0.012));h.add(ball(0.05,0.03,0.05,palm,0,-0.03,0.012));
    for(k=0;k<4;k++){var fx=-0.036+k*0.024;h.add(ball(0.0135,0.026,0.02,glove,fx,0.012,-0.05));h.add(ball(0.013,0.022,0.018,glove,fx,-0.028,-0.045));h.add(ball(0.0125,0.012,0.014,knuck,fx,0.05,-0.028))}
    var th=ball(0.016,0.016,0.04,glove,left?0.05:-0.05,0.0,-0.02);th.rotation.y=left?-0.5:0.5;h.add(th);
    var cuff=new THREE.Mesh(new THREE.CylinderGeometry(0.047,0.05,0.05,12),palm);cuff.rotation.x=Math.PI/2;cuff.position.set(0,0.002,0.075);h.add(cuff);
    h.position.copy(at);var zAxis=new THREE.Vector3().subVectors(elbow,at).normalize(),xAxis=dir.clone().normalize(),yAxis=new THREE.Vector3().crossVectors(zAxis,xAxis).normalize();zAxis.crossVectors(xAxis,yAxis).normalize();h.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis,yAxis,zAxis));
    var wrist=at.clone().addScaledVector(zAxis,0.09);g.add(rod(wrist,elbow,0.052,0.04,sleeve));g.add(rod(wrist,wrist.clone().lerp(elbow,0.12),0.044,0.042,band));return g}
  function pole(head,len,headZ){var g=new THREE.Group(),a=new THREE.Vector3(0.36,-0.36,-0.3),b=new THREE.Vector3(0.0,-0.6,-0.3-len),d=new THREE.Vector3().subVectors(b,a).normalize();
    g.add(rod(a.clone().addScaledVector(d,-0.12),b,0.017,0.017,wood));
    var hd=new THREE.Group();hd.position.copy(b);hd.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),d);head(hd);g.add(hd);
    var side=new THREE.Vector3().crossVectors(d,UP).normalize();
    g.add(grip(a.clone().addScaledVector(d,0.05),d,new THREE.Vector3(0.6,-0.85,0.12),false));g.add(grip(a.clone().addScaledVector(d,0.46),d,new THREE.Vector3(-0.38,-0.9,-0.12),true));void headZ;void side;return g}
  mods.rake=pole(function(h){h.add(box(0.1,0.02,0.05,steel,0,0,0.02));for(var k=0;k<11;k++){var a=(k-5)*0.11,t=box(0.012,0.012,0.36,steel,Math.sin(a)*0.2,0,-0.17);t.rotation.y=-a;h.add(t);var tip=box(0.012,0.06,0.012,steel,Math.sin(a)*0.37,-0.03,-0.34*Math.cos(a)-0.0);h.add(tip)}h.add(box(0.5,0.01,0.02,steel,0,0.006,-0.2))},1.35);
  mods.squeegee=pole(function(h){h.add(box(0.62,0.035,0.05,dark,0,0,0));h.add(box(0.62,0.09,0.014,L(0x15171a),0,-0.06,-0.01))},1.25);
  mods.shovel=pole(function(h){h.add(box(0.21,0.014,0.3,steel,0,-0.004,-0.14));h.add(box(0.05,0.03,0.08,steel,0,0.004,0.03))},1.1);
  function carry(build,x,y,z){var g=new THREE.Group(),o=new THREE.Group();o.position.set(x,y,z);build(o);g.add(o);g.add(grip(new THREE.Vector3(x,y+o.userData.hy,z+(o.userData.hz||0)),new THREE.Vector3(1,0,0),new THREE.Vector3(x+0.24,y-0.45+o.userData.hy,z+0.5),false));return g}
  mods.bucket=carry(function(o){o.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.115,0.26,16,1,true),new THREE.MeshLambertMaterial({color:0x3f86b0,side:THREE.DoubleSide})));var bt=new THREE.Mesh(new THREE.CircleGeometry(0.115,16),L(0x33678a));bt.rotation.x=-Math.PI/2;bt.position.y=-0.13;o.add(bt);
    var wt=new THREE.Mesh(new THREE.CircleGeometry(0.143,16),L(0x6b6046));wt.rotation.x=-Math.PI/2;wt.position.y=0.08;wt.userData.keep=true;o.add(wt);o.userData.water=wt;var hn=new THREE.Mesh(new THREE.TorusGeometry(0.15,0.008,6,16,Math.PI),steel);hn.position.y=0.13;o.add(hn);o.userData.hy=0.285},0.3,-0.5,-0.62);
  mods.wrench=carry(function(o){o.add(box(0.036,0.022,0.34,steel,0,0,-0.2));o.add(box(0.1,0.024,0.05,steel,0,0,-0.39));o.add(box(0.03,0.024,0.07,steel,-0.035,0,-0.44));o.add(box(0.03,0.024,0.07,steel,0.035,0,-0.44));o.userData.hy=0;o.userData.hz=0},0.26,-0.27,-0.42);
  mods.sack=carry(function(o){o.add(box(0.3,0.38,0.2,L(0x55663f)));o.add(box(0.22,0.05,0.14,L(0x44532f),0,0.21,0));o.userData.hy=0.27},0.3,-0.56,-0.64);
  mods.sandbags=carry(function(o){var b=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),hess);b.scale.set(0.24,0.075,0.16);o.add(b);o.userData.hy=0.1},0.26,-0.42,-0.7);
  mods.pump=carry(function(o){o.add(box(0.34,0.2,0.26,or));o.add(box(0.16,0.1,0.16,dark,0,0.15,0));o.add(box(0.36,0.022,0.022,dark,0,0.25,0));o.userData.hy=0.25},0.28,-0.56,-0.68);
  mods.generator=carry(function(o){o.add(box(0.4,0.26,0.28,L(0xe0b21c)));o.add(box(0.46,0.025,0.32,dark,0,0.16,0));o.userData.hy=0.18},0.28,-0.56,-0.7);
  var bw=mods.bucket.children[0].userData.water,by0=0;
  for(var id in mods){root.add(mods[id]);bake(mods[id],id==='bucket'?THREE.DoubleSide:THREE.FrontSide);mods[id].visible=false}
  by0=bw.position.y;
  return{root:root,mods:mods,show:function(id){for(var k in mods)mods[k].visible=k===id},bucketWater:function(f){bw.visible=f>0.02;bw.position.y=by0-0.2+0.2*Math.min(1,f)}};
}
return{level:level,dyn:dyn,hands:hands,dispose:dispose,TEX:TEX,swirlTex:swirlTex};
})();
