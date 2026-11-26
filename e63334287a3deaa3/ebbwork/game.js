/* Ebbwork: drawing, controls, HUD and menus. The rules of the water and of every tool are in core.js. */
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
function T(s,v){if(window.BackRoomLang)return BackRoomLang.t(s,v);return v?s.replace(/\{(\w+)\}/g,function(m,k){return v[k]}):s}
var CS=EW.CS,FILM=EWSim.FILM,TT=EW.T;
var clamp=function(v,a,b){return v<a?a:v>b?b:v};

// ---------------------------------------------------------------- saved progress
var SAVE_KEY='ebbwork:v1';
var save={v:1,coins:0,gear:{rake:1,bucket:1,wrench:1},jobs:{},set:{sens:1,vol:0.8,q:'auto',inv:0},seen:{}};
(function(){try{var o=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(o&&o.v===1){for(var k in o)if(k==='set'||k==='gear'||k==='seen'||k==='jobs'){for(var j in o[k])save[k][j]=o[k][j]}else save[k]=o[k]}}catch(e){}})();
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}}

// ---------------------------------------------------------------- renderer
var touchUI=matchMedia('(pointer: coarse)').matches&&!matchMedia('(any-pointer: fine)').matches;
function setTouch(on){touchUI=on;document.body.classList.toggle('touch',on)}
setTouch(touchUI);
var canvas=$('view');
var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:!touchUI,powerPreference:'high-performance'});
var scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(74,1,0.06,260);
camera.rotation.order='YXZ';scene.add(camera);
var SKY={zen:new THREE.Color(0x7f97a6),hor:new THREE.Color(0xc5d0d0),fog:new THREE.Color(0xbcc8c9),sun:new THREE.Vector3(-0.45,0.72,0.52).normalize(),sunC:new THREE.Color(0xfff0d8),gnd:new THREE.Color(0x56605a)};
scene.background=SKY.fog;scene.fog=new THREE.Fog(SKY.fog.getHex(),26,150);
var hemi=new THREE.HemisphereLight(0xd3dde2,0x525c50,0.82);scene.add(hemi);
var sun=new THREE.DirectionalLight(0xfff0d8,0.62);sun.position.copy(SKY.sun).multiplyScalar(50);scene.add(sun);
function quality(){var q=save.set.q;return q==='auto'?(touchUI?'low':'high'):q}
function resize(){var w=innerWidth,h=innerHeight,pr=Math.min(devicePixelRatio||1,quality()==='high'?2:touchUI?1.25:1);
  renderer.setPixelRatio(pr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?86:74;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

// a small tiling noise picture, used for grain on the ground and ripples on the water
var noiseTex=(function(){var N=128,c=document.createElement('canvas');c.width=c.height=N;var x=c.getContext('2d'),im=x.createImageData(N,N),d=im.data;
  function lay(ch,seed,oct){var waves=[];var r=(function(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})(seed);
    for(var k=0;k<oct;k++){var f=1+Math.floor(r()*r()*14);waves.push([Math.round((r()-0.5)*2*f),Math.round((r()-0.5)*2*f),r()*6.283,1/(0.6+f*0.35)])}
    var mn=1e9,mx=-1e9,buf=new Float32Array(N*N);for(var py=0;py<N;py++)for(var px=0;px<N;px++){var s=0;for(k=0;k<oct;k++){var w=waves[k];s+=Math.sin((px*w[0]+py*w[1])/N*6.283+w[2])*w[3]}buf[py*N+px]=s;if(s<mn)mn=s;if(s>mx)mx=s}
    for(var i=0;i<N*N;i++)d[i*4+ch]=Math.round((buf[i]-mn)/(mx-mn)*255)}
  lay(0,11,26);lay(1,23,26);lay(2,37,40);for(var i=0;i<N*N;i++)d[i*4+3]=255;x.putImageData(im,0,0);
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t})();

var U={uT:{value:0},uCam:{value:new THREE.Vector3()},uSun:{value:SKY.sun},uSunC:{value:SKY.sunC},uSky:{value:SKY.zen},uHor:{value:SKY.hor},uGnd:{value:SKY.gnd},
  uFog:{value:SKY.fog},uFogN:{value:26},uFogF:{value:150},tN:{value:noiseTex},uScan:{value:0}};
var FOGF='float fd=length(uCam-vW);gl_FragColor.rgb=mix(gl_FragColor.rgb,uFog,smoothstep(uFogN,uFogF,fd));';

var terrainMat=new THREE.ShaderMaterial({uniforms:U,
  vertexShader:'attribute vec3 aCol;attribute float aPat;attribute float aWet;varying vec3 vC;varying float vP;varying float vWet;varying vec3 vW;varying vec3 vN;'+
    'void main(){vC=aCol;vP=aPat;vWet=aWet;vW=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'precision highp float;uniform sampler2D tN;uniform vec3 uCam,uSun,uSunC,uSky,uGnd,uFog;uniform float uFogN,uFogF;varying vec3 vC;varying float vP;varying float vWet;varying vec3 vW;varying vec3 vN;'+
    'void main(){vec3 n=normalize(vN);vec3 g=texture2D(tN,vW.xz*0.43).rgb;float big=texture2D(tN,vW.xz*0.071+0.3).b;'+
    'vec3 c=vC*(0.80+0.34*g.b)*(0.88+0.24*big);'+
    'if(vP>0.02){vec2 q=vW.xz/vP;vec2 f=abs(fract(q)-0.5);float j=smoothstep(0.455,0.492,max(f.x,f.y));vec2 id=floor(q);float h=fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453);c*=(0.93+0.12*h)*(1.0-0.38*j);}'+
    'float wet=clamp(vWet,0.0,1.0);c*=mix(1.0,0.60,wet);'+
    'float dl=max(dot(n,uSun),0.0);vec3 col=c*(mix(uGnd,uSky,n.y*0.5+0.5)*1.05+uSunC*dl*0.62);'+
    'vec3 V=normalize(uCam-vW);float fr=pow(1.0-max(dot(n,V),0.0),4.0);col+=uSky*fr*wet*0.30;'+
    'gl_FragColor=vec4(col,1.0);'+FOGF+'}'});

var waterMat=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-3,
  vertexShader:'attribute float aDepth;attribute vec2 aFlow;varying float vD;varying vec2 vF;varying vec3 vW;'+
    'void main(){vD=aDepth;vF=aFlow;vW=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'precision highp float;uniform sampler2D tN;uniform float uT,uScan,uFogN,uFogF;uniform vec3 uCam,uSun,uSunC,uSky,uHor,uFog;varying float vD;varying vec2 vF;varying vec3 vW;'+
    'void main(){if(vD<0.004)discard;'+
    'vec2 uv=vW.xz*0.33;vec2 fl=clamp(vF,-1.6,1.6)*0.55;float sp=length(vF);'+
    'float p0=fract(uT*0.35),p1=fract(uT*0.35+0.5);'+
    'vec3 a=texture2D(tN,uv-fl*p0+vec2(uT*0.013,uT*0.009)).rgb;vec3 b=texture2D(tN,uv*1.07+0.37-fl*p1-vec2(uT*0.011,-uT*0.012)).rgb;'+
    'vec3 m=mix(a,b,abs(1.0-2.0*p0));vec2 nn=m.xy*2.0-1.0;'+
    'float calm=smoothstep(0.0,0.05,vD);float amp=(0.10+min(sp,1.2)*0.42)*calm;'+
    'vec3 N=normalize(vec3(nn.x*amp,1.0,nn.y*amp));vec3 V=normalize(uCam-vW);'+
    'float fres=0.03+0.97*pow(1.0-max(dot(N,V),0.0),5.0);'+
    'float murk=1.0-exp(-max(vD,0.0)*6.5);'+
    'vec3 body=mix(vec3(0.42,0.50,0.46),vec3(0.19,0.22,0.17),murk);float al=mix(0.16,0.95,murk);'+
    'vec3 R=reflect(-V,N);vec3 skyc=mix(uHor,uSky,clamp(R.y*1.6,0.0,1.0));'+
    'vec3 col=mix(body,skyc,fres*0.82);al=mix(al,1.0,fres*0.75);'+
    'col+=uSunC*pow(max(dot(R,uSun),0.0),160.0)*0.9;'+
    'float foam=smoothstep(0.22,0.9,sp)*smoothstep(0.52,0.78,m.b)*calm;col=mix(col,vec3(0.93,0.95,0.92),foam*0.7);al=max(al,foam*0.7);'+
    'al*=smoothstep(0.004,0.022,vD);'+
    'float sc=uScan*step(0.0045,vD)*(0.6+0.4*sin(uT*9.0-length(vW.xz-uCam.xz)*1.6));col=mix(col,vec3(0.25,1.0,0.92),sc*0.8);al=max(al,sc*0.85);'+
    'gl_FragColor=vec4(col,al);'+FOGF+'}'});

// ---------------------------------------------------------------- a job site, drawn
var world=null,def=null,lv=null; // lv: this job's meshes and buffers
function Batch(){this.p=[];this.n=[];this.c=[]}
Batch.prototype.quad=function(a,b,c,d,nx,ny,nz,col,sh){var p=this.p,n=this.n,cc=this.c,r=((col>>16)&255)/255*sh,g=((col>>8)&255)/255*sh,bl=(col&255)/255*sh,v=[a,b,c,a,c,d];
  for(var k=0;k<6;k++){p.push(v[k][0],v[k][1],v[k][2]);n.push(nx,ny,nz);cc.push(r,g,bl)}};
Batch.prototype.box=function(x0,y0,z0,x1,y1,z1,col){
  this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],0,1,0,col,1.08);
  this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],0,0,1,col,1);
  this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],0,0,-1,col,0.9);
  this.quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],1,0,0,col,0.96);
  this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],-1,0,0,col,0.86)};
Batch.prototype.mesh=function(){var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
  return new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true}))};
var TYPECOL=[[0.36,0.47,0.25],[0.60,0.59,0.55],[0.33,0.25,0.18],[0.70,0.71,0.68],[0.27,0.28,0.30],[0.52,0.49,0.44],[0.56,0.56,0.54]],TYPEPAT=[0,0.75,0,0.4,0,0,2.5];
function shade(col,f){var r=Math.min(255,((col>>16)&255)*f)|0,g=Math.min(255,((col>>8)&255)*f)|0,b=Math.min(255,(col&255)*f)|0;return r<<16|g<<8|b}

function drawBox(B,b){var x0=b.x0,x1=b.x1,z0=b.z0,z1=b.z1,y0=b.y0,y1=b.y1,c=b.col,k,i;
  if(b.kind==='house'){B.box(x0,y0,z0,x1,y1,z1,c);B.box(x0-0.25,y1,z0-0.25,x1+0.25,y1+0.22,z1+0.25,0x4a4f55);B.box(x0+0.6,y1+0.22,z0+0.5,x1-0.6,y1+1.3,z1-0.4,0x3f444a);
    var gy=y0+0.6;B.box(x0,gy,z1,x1,gy+0.32,z1+0.04,shade(c,0.72));
    for(k=x0+2.2;k<x1-2;k+=3.4){B.box(k,gy+1.05,z1,k+1.5,gy+2.25,z1+0.05,0x2a3a48);B.box(k-0.08,gy+0.97,z1,k+1.58,gy+1.05,z1+0.09,0xe9e6dc);B.box(k,gy+3.3,z1,k+1.5,gy+4.4,z1+0.05,0x2a3a48);B.box(k-0.08,gy+3.22,z1,k+1.58,gy+3.3,z1+0.09,0xe9e6dc)}
    B.box(x1-2.6,gy,z1,x1-1.6,gy+2.05,z1+0.06,0x7d3b2c);
  }else if(b.kind==='fence'){B.box(x0,y0,z0,x1,y1-0.1,z1,c);B.box(x0-0.04,y1-0.1,z0-0.04,x1+0.04,y1,z1+0.04,0x8d8a82);
    var lx=x1-x0>z1-z0,len=lx?x1-x0:z1-z0;for(k=1.5;k<len-0.5;k+=3){if(lx)B.box(x0+k,y0,z0-0.05,x0+k+0.5,y1+0.06,z1+0.05,shade(c,0.9));else B.box(x0-0.05,y0,z0+k,x1+0.05,y1+0.06,z0+k+0.5,shade(c,0.9))}
  }else if(b.kind==='shed'){B.box(x0,y0,z0,x1,y1,z1,c);B.box(x0-0.2,y1,z0-0.2,x1+0.2,y1+0.14,z1+0.2,0x3b4146);B.box(x0-0.03,y0+0.6,z0+1,x0,y0+2.5,z0+1.9,shade(c,0.7))
  }else if(b.kind==='planter'){B.box(x0,y0,z0,x1,y1,z1,c);B.box(x0+0.08,y1,z0+0.08,x1-0.08,y1+0.03,z1-0.08,0x3a2c20);for(i=0;i<5;i++){var px=x0+0.3+i*(x1-x0-0.6)/4,pz=(z0+z1)/2+(i%2?0.12:-0.12);B.box(px-0.14,y1,pz-0.14,px+0.14,y1+0.3+0.1*(i%3),pz+0.14,0x47703d)}
  }else if(b.kind==='table'){B.box(x0,y1-0.06,z0,x1,y1,z1,c);[[x0+0.06,z0+0.06],[x1-0.12,z0+0.06],[x0+0.06,z1-0.12],[x1-0.12,z1-0.12]].forEach(function(q){B.box(q[0],y0,q[1],q[0]+0.06,y1-0.06,q[1]+0.06,shade(c,0.75))})
  }else if(b.kind==='bin'){B.box(x0+0.04,y0,z0+0.04,x1-0.04,y1,z1-0.04,c);B.box(x0,y1,z0,x1,y1+0.06,z1,shade(c,0.7))
  }else B.box(x0,y0,z0,x1,y1,z1,c)}

function signTex(text){var c=document.createElement('canvas');c.width=256;c.height=64;var x=c.getContext('2d');x.fillStyle='#f1ead2';x.fillRect(0,0,256,64);x.strokeStyle='#1d2a33';x.lineWidth=5;x.strokeRect(3,3,250,58);
  x.fillStyle='#1d2a33';x.font='700 34px "Barlow Condensed",Arial Narrow,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,34,236);return new THREE.CanvasTexture(c)}

function buildLevel(w){
  var S=w.S,W=w.W,H=w.H,n=S.n,grp=new THREE.Group(),i,x,z,k;
  var L={grp:grp,W:W,H:H};
  // ground: one vertex at each cell centre
  var pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3),pat=new Float32Array(n),wet=new Float32Array(n),idx=new Uint32Array((W-1)*(H-1)*6),q=0;
  for(z=0;z<H;z++)for(x=0;x<W;x++){i=z*W+x;pos[i*3]=(x+0.5)*CS;pos[i*3+2]=(z+0.5)*CS}
  for(z=0;z<H-1;z++)for(x=0;x<W-1;x++){i=z*W+x;idx[q++]=i;idx[q++]=i+W;idx[q++]=i+1;idx[q++]=i+1;idx[q++]=i+W;idx[q++]=i+W+1}
  var tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.BufferAttribute(pos,3));tg.setAttribute('normal',new THREE.BufferAttribute(nor,3));tg.setAttribute('aCol',new THREE.BufferAttribute(col,3));
  tg.setAttribute('aPat',new THREE.BufferAttribute(pat,1));tg.setAttribute('aWet',new THREE.BufferAttribute(wet,1));tg.setIndex(new THREE.BufferAttribute(idx,1));
  L.tg=tg;L.wet=wet;
  L.vert=function(i){var x=i%W,z=(i/W)|0,g=S.g,gl=g[x>0?i-1:i],gr=g[x<W-1?i+1:i],gu=g[z>0?i-W:i],gd=g[z<H-1?i+W:i],nx=(gl-gr),nz=(gu-gd),ny=2*CS,l=Math.sqrt(nx*nx+ny*ny+nz*nz);
    pos[i*3+1]=g[i];nor[i*3]=nx/l;nor[i*3+1]=ny/l;nor[i*3+2]=nz/l;var t=w.type[i],c=TYPECOL[t],dug=w.g0?clamp((w.g0[i]-g[i])*1.6,0,0.45):0;
    col[i*3]=c[0]*(1-dug);col[i*3+1]=c[1]*(1-dug);col[i*3+2]=c[2]*(1-dug);pat[i]=TYPEPAT[t]};
  for(i=0;i<n;i++)L.vert(i);
  tg.computeBoundingSphere();var tm=new THREE.Mesh(tg,terrainMat);tm.frustumCulled=false;grp.add(tm);
  // the land around the map
  var out=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshLambertMaterial({color:0x4f5d47}));out.rotation.x=-Math.PI/2;out.position.set(w.def.w/2,-0.35,w.def.h/2);grp.add(out);
  // walls and things
  var B=new Batch();w.boxes.forEach(function(b){drawBox(B,b)});
  var r=w.rand,cx=w.def.w/2,cz=w.def.h/2,R=Math.max(w.def.w,w.def.h)*0.5+16;
  for(k=0;k<16;k++){var a=k/16*6.283+0.2,d=R+(k%3)*9,hx=cx+Math.cos(a)*d,hz=cz+Math.sin(a)*d,hw=5+(k*7%5),hh=5+(k*5%4)*1.4;B.box(hx-hw,-0.4,hz-hw*0.7,hx+hw,hh,hz+hw*0.7,[0x9a9488,0x8b7f72,0xa39a8c,0x7d8388][k%4]);B.box(hx-hw-0.3,hh,hz-hw*0.7-0.3,hx+hw+0.3,hh+0.9,hz+hw*0.7+0.3,0x4b4f55)}
  var bm=B.mesh();grp.add(bm);
  // drains
  L.drains=w.drains.map(function(d){var g=new THREE.Group(),gy=S.g[d.i];g.position.set(d.x,gy,d.z);
    var fr=new THREE.Mesh(new THREE.BoxGeometry(0.74,0.03,0.74),new THREE.MeshLambertMaterial({color:0x2b3034}));fr.position.y=0.012;g.add(fr);
    var hole=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.02,0.6),new THREE.MeshBasicMaterial({color:0x07090a}));hole.position.y=0.026;g.add(hole);
    for(var k=0;k<5;k++){var bar=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.03,0.6),new THREE.MeshLambertMaterial({color:0x4a5258}));bar.position.set(-0.24+k*0.12,0.034,0);g.add(bar)}
    var sw=new THREE.Mesh(new THREE.RingGeometry(0.1,0.85,28,1),new THREE.MeshBasicMaterial({map:swirlTex,transparent:true,opacity:0,depthWrite:false}));sw.rotation.x=-Math.PI/2;g.add(sw);
    grp.add(g);return{d:d,sw:sw}});
  // valves
  L.valves=w.valves.map(function(v){var g=new THREE.Group(),gy=w.groundAt(v.x,v.z);g.position.set(v.x,gy+v.y,v.z);g.rotation.y=Math.atan2(v.nx,v.nz);
    var red=new THREE.MeshLambertMaterial({color:0xc8362b}),met=new THREE.MeshLambertMaterial({color:0x8b9499});
    var pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,1.5,10),met);pipe.position.set(0,-0.1,0.06);g.add(pipe);
    var body=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.2,0.14),met);body.position.z=0.07;g.add(body);
    var wh=new THREE.Group();wh.position.z=0.2;var tor=new THREE.Mesh(new THREE.TorusGeometry(0.15,0.026,8,18),red);wh.add(tor);
    for(var k=0;k<3;k++){var sp=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.03,0.025),red);sp.rotation.z=k*Math.PI/3;wh.add(sp)}g.add(wh);
    var st=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.14,8),met);st.rotation.x=Math.PI/2;st.position.z=0.14;g.add(st);
    grp.add(g);return{v:v,wh:wh}});
  // leaks: a pipe stub and a spray of drops
  L.leaks=w.leaks.map(function(l){var g=new THREE.Group(),gy=w.groundAt(l.x,l.z);g.position.set(l.px,gy+l.y,l.pz);g.rotation.y=Math.atan2(l.nx,l.nz);
    var met=new THREE.MeshLambertMaterial({color:0xa9763f});var p=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.9,10),met);p.rotation.z=Math.PI/2;p.position.z=0.07;g.add(p);
    var tap=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.14,0.2),new THREE.MeshLambertMaterial({color:0xcaa64a}));tap.position.set(0.5,0.02,0.14);g.add(tap);
    var N=46,pp=new Float32Array(N*3),pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
    var pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0xe6f3f4,size:0.07,transparent:true,opacity:0.85,depthWrite:false}));pts.frustumCulled=false;g.add(pts);
    var seeds=[];for(var k=0;k<N;k++)seeds.push([Math.random(),(Math.random()-0.5)*1.3,Math.random()*0.8+0.6,(Math.random()-0.5)*0.5]);
    grp.add(g);return{l:l,pts:pts,pp:pp,seeds:seeds,h:l.y}});
  // signs
  w.signs.forEach(function(s){var m=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.155),new THREE.MeshBasicMaterial({map:signTex(s.text)}));m.position.set(s.x+s.nx*0.02,w.groundAt(s.x,s.z)+s.y,s.z+s.nz*0.02);m.rotation.y=Math.atan2(s.nx,s.nz);grp.add(m)});
  // debris: three shapes, drawn as instances
  var leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute([-0.13,0,0, 0,0,0.07, 0.13,0.012,0, 0,0,-0.07],3));leaf.setIndex([0,1,2,0,2,3]);leaf.computeVertexNormals();
  var geos=[leaf,new THREE.BoxGeometry(0.42,0.035,0.035),new THREE.BoxGeometry(0.2,0.09,0.14)];
  var cols=[[0xa9772c,0x8a5a22,0xb98f33,0x6f7a2e,0x94461f],[0x4a3524,0x5b4330,0x3c2c1f],[0xd9d4c4,0xc94f3d,0x3f79b5,0xe0c44a]];
  L.deb=geos.map(function(g,kd){var cnt=0;w.debris.forEach(function(p){if(p.k===kd)cnt++});var m=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({side:THREE.DoubleSide}),Math.max(1,cnt));m.frustumCulled=false;m.count=cnt;
    var c=new THREE.Color(),j=0;w.debris.forEach(function(p,pi){if(p.k!==kd)return;c.setHex(cols[kd][pi%cols[kd].length]);m.setColorAt(j,c);p._m=m;p._j=j++;p.dy=S.g[w.cell(p.x,p.z)]});
    if(m.instanceColor)m.instanceColor.needsUpdate=true;grp.add(m);return m});
  // water
  var wp=new Float32Array(n*3),wd=new Float32Array(n),wf=new Float32Array(n*2);for(i=0;i<n;i++){wp[i*3]=pos[i*3];wp[i*3+2]=pos[i*3+2]}
  var wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.BufferAttribute(wp,3));wg.setAttribute('aDepth',new THREE.BufferAttribute(wd,1));wg.setAttribute('aFlow',new THREE.BufferAttribute(wf,2));wg.setIndex(new THREE.BufferAttribute(idx,1));
  var wm=new THREE.Mesh(wg,waterMat);wm.frustumCulled=false;wm.renderOrder=5;grp.add(wm);
  L.wg=wg;L.wp=wp;L.wd=wd;L.wf=wf;
  scene.add(grp);return L;
}
var swirlTex=(function(){var c=document.createElement('canvas');c.width=c.height=128;var x=c.getContext('2d');x.translate(64,64);x.strokeStyle='rgba(255,255,255,.8)';x.lineWidth=2.4;x.lineCap='round';
  for(var a=0;a<5;a++){x.rotate(6.283/5);x.beginPath();for(var t=0;t<1;t+=0.04){var r=8+t*54,an=t*3.2;x.globalAlpha=1-t;x.lineTo(Math.cos(an)*r,Math.sin(an)*r)}x.stroke()}return new THREE.CanvasTexture(c)})();

var vv=[0,0],dummy=new THREE.Object3D();
function updateWaterMesh(){
  var S=world.S,W=lv.W,H=lv.H,g=S.g,bar=S.bar,d=S.d,solid=S.solid,wp=lv.wp,wd=lv.wd,wf=lv.wf,wet=lv.wet,x,z,i,j;
  for(z=0;z<H;z++)for(x=0;x<W;x++){i=z*W+x;var dd=d[i],zb=g[i]+bar[i];
    if(!solid[i]&&dd>0.0015){wp[i*3+1]=zb+dd;wd[i]=dd;S.vel(i,vv);wf[i*2]=vv[0];wf[i*2+1]=vv[1];if(wet[i]<1)wet[i]=Math.min(1,wet[i]+0.2)}
    else{var s=0,sd=0,c=0;for(var oz=-1;oz<=1;oz++){var zz=z+oz;if(zz<0||zz>=H)continue;for(var ox=-1;ox<=1;ox++){var xx=x+ox;if(xx<0||xx>=W)continue;j=zz*W+xx;if(!solid[j]&&d[j]>0.004){s+=g[j]+bar[j]+d[j];sd+=d[j];c++}}}
      if(c){var y=s/c;wp[i*3+1]=y;wd[i]=solid[i]?sd/c:Math.min(y-zb,0.012)}else{wp[i*3+1]=zb-0.03;wd[i]=-0.03}
      wf[i*2]=0;wf[i*2+1]=0;if(wet[i]>0)wet[i]=Math.max(0,wet[i]-0.0006)}
  }
  lv.wg.attributes.position.needsUpdate=true;lv.wg.attributes.aDepth.needsUpdate=true;lv.wg.attributes.aFlow.needsUpdate=true;lv.tg.attributes.aWet.needsUpdate=true;
  if(world.dirty.length){var seen={};world.dirty.forEach(function(i){[i,i-1,i+1,i-W,i+W].forEach(function(k){if(k>=0&&k<S.n&&!seen[k]){seen[k]=1;lv.vert(k)}})});world.dirty.length=0;
    lv.tg.attributes.position.needsUpdate=true;lv.tg.attributes.normal.needsUpdate=true;lv.tg.attributes.aCol.needsUpdate=true}
}
function updateThings(dt,time){
  var S=world.S,k;
  for(k=0;k<lv.drains.length;k++){var o=lv.drains[k],d=o.d,dep=S.d[d.i];o.sw.position.y=Math.max(0.05,dep+0.006);o.sw.rotation.z-=dt*(2+d.flow*40);o.sw.material.opacity=clamp(d.flow*9,0,0.75)*(dep>0.02?1:0)}
  for(k=0;k<lv.valves.length;k++){lv.valves[k].wh.rotation.z=lv.valves[k].v.turn*Math.PI*3}
  for(k=0;k<lv.leaks.length;k++){var L=lv.leaks[k];L.pts.visible=L.l.on;if(!L.l.on)continue;var pp=L.pp,sd=L.seeds;
    for(var j=0;j<sd.length;j++){var s=sd[j],t=(time*1.25*s[2]+s[0])%1,fall=t*t*L.h*1.02;pp[j*3]=0.5+s[1]*t*0.5;pp[j*3+1]=-fall+0.04*Math.sin(t*9+s[0]*6);pp[j*3+2]=0.2+t*(0.55+s[3])}
    L.pts.geometry.attributes.position.needsUpdate=true}
  var deb=world.debris;for(k=0;k<deb.length;k++){var p=deb[k],i=world.cell(p.x,p.z);if(i<0)continue;var ty=S.g[i]+S.bar[i]+(p.fl?S.d[i]:0)+(p.k===2?0.05:0.012);p.dy+=(ty-p.dy)*Math.min(1,dt*10);
    dummy.position.set(p.x,p.dy,p.z);dummy.rotation.set(p.fl?Math.sin(time*1.7+k)*0.12:0,p.a,p.fl?Math.cos(time*1.3+k)*0.12:0);dummy.scale.setScalar(p.sz);dummy.updateMatrix();p._m.setMatrixAt(p._j,dummy.matrix)}
  for(k=0;k<lv.deb.length;k++)lv.deb[k].instanceMatrix.needsUpdate=true;
}

// ---------------------------------------------------------------- the player
var pl={x:0,y:0,z:0,vy:0,yaw:0,pitch:0,ground:true,crouch:0,bob:0,step:0};
var inp={mx:0,mz:0,jump:false,sprint:false,crouch:false,use:false,alt:false,act:false};
var keys={};
var EYE=1.62,RAD=0.3;
function blocked(x,z,feet){var w=world,S=w.S;for(var a=-1;a<=1;a+=2)for(var b=-1;b<=1;b+=2){var i=w.cell(x+a*RAD,z+b*RAD);if(i<0)return true;if(S.solid[i]&&w.sh[i]>feet+0.45)return true}return false}
function floorAt(x,z,feet){var w=world,S=w.S,gy=w.groundAt(x,z),ci=w.cell(x,z);if(ci>=0&&S.bar[ci]>0)gy+=S.bar[ci];
  for(var a=-1;a<=1;a+=2)for(var b=-1;b<=1;b+=2){var i=w.cell(x+a*RAD,z+b*RAD);if(i<0)continue;var t=S.solid[i]?w.sh[i]:S.bar[i]>0?S.g[i]+S.bar[i]:-99;if(t<=feet+0.45&&t>gy)gy=t}return gy}
function movePlayer(dt){
  var f=inp.mz,s=inp.mx,l=Math.hypot(f,s);if(l>1){f/=l;s/=l}
  var dep=Math.max(0,world.depthAt(pl.x,pl.z)-Math.max(0,pl.y-floorAt(pl.x,pl.z,pl.y)));
  var slow=1-Math.min(0.62,dep*(save.gear.waders?0.5:1.25));
  var crouching=inp.crouch;pl.crouch+=((crouching?1:0)-pl.crouch)*Math.min(1,dt*12);
  var sp=(crouching?1.9:inp.sprint&&f>0.2?5.7:3.7)*slow;
  var sy=Math.sin(pl.yaw),cy=Math.cos(pl.yaw),vx=(-sy*f+cy*s)*sp,vz=(-cy*f-sy*s)*sp;
  var nx=pl.x+vx*dt;if(!blocked(nx,pl.z,pl.y))pl.x=nx;
  var nz=pl.z+vz*dt;if(!blocked(pl.x,nz,pl.y))pl.z=nz;
  var gy=floorAt(pl.x,pl.z,pl.y);
  if(pl.ground){if(inp.jump&&!crouching){pl.vy=4.7*(dep>0.35?0.75:1);pl.ground=false;if(dep>0.05)sfx('splash',0.5)}else if(pl.y-gy>0.32){pl.ground=false}else pl.y+=(gy-pl.y)*Math.min(1,dt*18)}
  if(!pl.ground){pl.vy-=15*dt;pl.y+=pl.vy*dt;if(pl.y<=gy){pl.y=gy;pl.ground=true;if(pl.vy<-3)sfx(dep>0.04?'splash':'thud',Math.min(1,-pl.vy/8));pl.vy=0}}
  inp.jump=false;
  var moving=l>0.1&&pl.ground;pl.speed=moving?sp*l:0;
  if(moving){pl.bob+=dt*sp*1.9;pl.step+=dt*sp;if(pl.step>1.9){pl.step=0;sfx(dep>0.04?'wade':'step',0.5)}}
  pl.dep=dep;
  camera.position.set(pl.x,pl.y+EYE-pl.crouch*0.55+(moving?Math.sin(pl.bob)*0.035:0),pl.z);camera.rotation.set(pl.pitch,pl.yaw,0);
}
// where the player is pointing on the ground or the water, within reach
var aim={x:0,y:0,z:0,i:-1,ok:false,dx:0,dz:0};
function updateAim(reach){
  var cp=Math.cos(pl.pitch),dx=-Math.sin(pl.yaw)*cp,dy=Math.sin(pl.pitch),dz=-Math.cos(pl.yaw)*cp,ox=camera.position.x,oy=camera.position.y,oz=camera.position.z,S=world.S;
  aim.dx=-Math.sin(pl.yaw);aim.dz=-Math.cos(pl.yaw);aim.ok=false;
  for(var t=0.3;t<=reach;t+=0.12){var x=ox+dx*t,y=oy+dy*t,z=oz+dz*t,i=world.cell(x,z);if(i<0)break;
    if(S.solid[i]&&y<world.sh[i])break;var top=world.groundAt(x,z)+S.bar[i]+S.d[i];if(y<=top){aim.x=x;aim.y=top;aim.z=z;aim.i=i;aim.ok=true;return}}
  // nothing hit: use the ground at the end of reach if we are looking roughly level or down
  if(dy<0.25){var hx=ox+aim.dx*Math.min(reach,1.8),hz=oz+aim.dz*Math.min(reach,1.8),hi=world.cell(hx,hz);if(hi>=0&&!S.solid[hi]){aim.x=hx;aim.z=hz;aim.y=world.groundAt(hx,hz);aim.i=hi;aim.ok=true}}
}
// the nearest fitting the player is looking at
var focus=null,hold=0;
function findFocus(){
  var best=null,bs=0.9,cp=Math.cos(pl.pitch),dx=-Math.sin(pl.yaw)*cp,dy=Math.sin(pl.pitch),dz=-Math.cos(pl.yaw)*cp,c=camera.position;
  function tryIt(kind,o,x,y,z,reach){var ex=x-c.x,ey=y-c.y,ez=z-c.z,q=Math.sqrt(ex*ex+ey*ey+ez*ez);if(q>reach)return;var dot=(ex*dx+ey*dy+ez*dz)/q;if(dot>bs){bs=dot;best={kind:kind,o:o}}}
  world.valves.forEach(function(v){tryIt('valve',v,v.x+v.nx*0.15,world.groundAt(v.x,v.z)+v.y,v.z+v.nz*0.15,2.4)});
  world.leaks.forEach(function(l){if(l.wrench&&!l.fixed)tryIt('leak',l,l.px,world.groundAt(l.x,l.z)+l.y,l.pz,2.4)});
  return best;
}

// ---------------------------------------------------------------- tools
var TOOLS={
  rake:{name:'Rake',tip:'Click: push debris away · Right click: pull it to you',ttip:'Use: push · Alt: pull',icon:'<path d="M12 3v12M5 15h14M6 15v5M10 15v5M14 15v5M18 15v5"/>'},
  bucket:{name:'Bucket',tip:'Click: fill from water, or tip out · Right click: tip out',ttip:'Use: fill or tip out',icon:'<path d="M5 8h14l-2 12H7zM5 8c0-6 14-6 14 0"/>'},
  wrench:{name:'Wrench',tip:'Hold click on a dripping joint to tighten it',ttip:'Hold Use on a dripping joint',icon:'<path d="M14 4a5 5 0 0 0-4 7l-6 6 3 3 6-6a5 5 0 0 0 7-4l-3 2-3-3z"/>'}
};
var bar=[],cur=0,bucketVol=0,BUCKET=0.03,swing=0,swingKind=0,useHeld=false,altHeld=false,cool=0;
function tool(){return bar[cur]}
function buildBar(){var h=$('hot');h.innerHTML='';bar.forEach(function(id,k){var t=TOOLS[id],b=document.createElement('button');b.setAttribute('data-no-ad-refresh','');b.setAttribute('aria-label',T(t.name));
    b.innerHTML='<em>'+(k+1)+'</em><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+t.icon+'</svg><span>'+T(t.name)+'</span><u></u>';
    b.addEventListener('click',function(e){e.preventDefault();selectTool(k);canvas.focus()});h.appendChild(b)});selectTool(Math.min(cur,bar.length-1))}
function selectTool(k){if(k<0||k>=bar.length)return;cur=k;var bs=$('hot').children;for(var i=0;i<bs.length;i++)bs[i].setAttribute('aria-pressed',i===k?'true':'false');
  $('tip').textContent=T(TOOLS[bar[k]].tip);showView(bar[k]);sfx('tick',0.4)}
// first-person models, built from simple shapes
var vm=new THREE.Group();camera.add(vm);var vmods={};
(function(){var wood=new THREE.MeshLambertMaterial({color:0x9a7446}),steel=new THREE.MeshLambertMaterial({color:0x8f989c}),or=new THREE.MeshLambertMaterial({color:0xe07a1c}),glove=new THREE.MeshLambertMaterial({color:0xd9a441}),dark=new THREE.MeshLambertMaterial({color:0x2f3639});
  function hand(x,y,z){var g=new THREE.Group();var m=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.065,0.1),glove);g.add(m);var th=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.03,0.07),glove);th.position.set(-0.045,0.02,-0.01);g.add(th);
    var cu=new THREE.Mesh(new THREE.BoxGeometry(0.082,0.074,0.34),or);cu.position.set(0.02,-0.07,0.2);cu.rotation.x=0.42;g.add(cu);g.position.set(x,y,z);return g}
  var r=new THREE.Group();var sh=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,1.5,8),wood);sh.rotation.x=Math.PI/2;sh.position.z=-0.55;r.add(sh);
  var hd=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.025,0.03),steel);hd.position.z=-1.3;r.add(hd);for(var k=0;k<9;k++){var tn=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.1,0.012),steel);tn.position.set(-0.21+k*0.0525,-0.055,-1.3);r.add(tn)}
  r.add(hand(0,0,0.02));r.position.set(0.27,-0.27,-0.58);r.rotation.set(-0.36,0.14,0);vmods.rake=r;
  var b=new THREE.Group();var bk=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.115,0.26,14,1,true),new THREE.MeshLambertMaterial({color:0x3f7fa8,side:THREE.DoubleSide}));b.add(bk);
  var bt=new THREE.Mesh(new THREE.CircleGeometry(0.115,14),new THREE.MeshLambertMaterial({color:0x33678a}));bt.rotation.x=-Math.PI/2;bt.position.y=-0.13;b.add(bt);
  var wt=new THREE.Mesh(new THREE.CircleGeometry(0.142,14),new THREE.MeshLambertMaterial({color:0x5a6b5c}));wt.rotation.x=-Math.PI/2;wt.position.y=0.08;b.add(wt);b.userData.water=wt;
  var hn=new THREE.Mesh(new THREE.TorusGeometry(0.15,0.008,6,14,Math.PI),steel);hn.position.y=0.13;b.add(hn);b.add(hand(0.0,0.17,0.02));b.position.set(0.3,-0.42,-0.55);vmods.bucket=b;
  var wr=new THREE.Group();var ws=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.02,0.34),steel);ws.position.z=-0.2;wr.add(ws);var j1=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.022,0.05),steel);j1.position.z=-0.39;wr.add(j1);
  var j2=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.022,0.07),steel);j2.position.set(-0.035,0,-0.44);wr.add(j2);var j3=j2.clone();j3.position.x=0.035;wr.add(j3);wr.add(hand(0,0,-0.02));wr.position.set(0.24,-0.24,-0.34);wr.rotation.set(0.25,0.2,-0.3);vmods.wrench=wr;
  for(var id in vmods){vmods[id].visible=false;vmods[id].userData.base={p:vmods[id].position.clone(),r:vmods[id].rotation.clone()};vm.add(vmods[id])}
  void dark;
})();
function showView(id){for(var k in vmods)vmods[k].visible=k===id}
function useTool(alt){
  var id=tool();if(cool>0||!id)return;updateAim(2.6);
  if(id==='rake'){swing=0.42;swingKind=alt?2:1;cool=0.42;var px=pl.x,pz=pl.z,dx=aim.dx,dz=aim.dz;setTimeout(function(){if(!world)return;var n=world.rake(px,pz,dx,dz,alt);sfx(n?'rake':'swish',n?0.8:0.4);if(n)noteSeen('rake')},130)}
  else if(id==='bucket'){cool=0.5;swing=0.4;swingKind=1;
    if(bucketVol>0.001&&(alt||bucketVol>=BUCKET*0.5||!aim.ok||world.S.d[aim.i]<0.012)){if(!aim.ok){cool=0;return}var v=world.pour(aim.x,aim.z,bucketVol);if(v>0){bucketVol=0;sfx('pour',0.9)}}
    else if(!alt&&aim.ok){var got=world.scoop(aim.x,aim.z,BUCKET-bucketVol);if(got>0.0005){bucketVol+=got;sfx('scoop',0.8)}else toast(T('No water to scoop here.'),1.4)}
  }
}
function animView(dt){
  var id=tool(),m=vmods[id];if(!m)return;var b=m.userData.base,t=swing>0?1-swing/0.42:0,s=swing>0?Math.sin(t*Math.PI):0;
  var sway=Math.sin(pl.bob)*0.012*(pl.speed>0?1:0);
  m.position.set(b.p.x+sway,b.p.y+Math.abs(Math.cos(pl.bob))*0.012*(pl.speed>0?1:0)-0.0,b.p.z);m.rotation.set(b.r.x,b.r.y,b.r.z);
  if(id==='rake'){m.rotation.x=b.r.x-s*0.5;m.position.z=b.p.z+(swingKind===2?s*0.22:-s*0.3);m.position.y=b.p.y-s*0.05}
  else if(id==='bucket'){m.rotation.x=-s*0.9;m.position.y=b.p.y+s*0.1;m.userData.water.visible=bucketVol>0.002;m.userData.water.position.y=-0.12+0.2*clamp(bucketVol/BUCKET,0,1)}
  else if(id==='wrench'){m.rotation.z=b.r.z+(hold>0&&focus&&focus.kind==='leak'?Math.sin(performance.now()*0.012)*0.5:0)}
  if(swing>0)swing=Math.max(0,swing-dt);if(cool>0)cool-=dt;
}

// ---------------------------------------------------------------- sound (filled in later; calls are already in place)
function sfx(){}
function audioTick(){}

// ---------------------------------------------------------------- HUD
var toastT=0;
function toast(msg,secs){var t=$('toast');t.textContent=msg;t.classList.remove('off');toastT=secs||3}
function fmtTime(s){s=Math.floor(s);return Math.floor(s/60)+':'+(s%60<10?'0':'')+s%60}
var seen={};function noteSeen(k){seen[k]=1}
var scanT=0,scanCool=0;
function scan(){if(state!=='play'||scanCool>0)return;scanT=4.5;scanCool=9;$('scanfx').classList.add('on');sfx('scan',0.7);
  toast(world.wet>0?T('{v} litres left on site.',{v:Math.round(world.left*1000)}):T('No standing water found.'),3)}
function tasks(){
  var out=[],w=world;
  w.drains.forEach(function(d,k){var found=seen['d'+k];if(!found)out.push({t:T('Find where this water should be draining to'),s:T('Low points are a good place to look.'),done:false});
    else out.push({t:T('Keep the drain clear'),s:d.clear>=0.9?T('Running freely.'):T('{p}% blocked. Rake the debris well away, or it will wash back.',{p:Math.round((1-d.clear)*100)}),done:d.clear>=0.9})});
  w.leaks.forEach(function(l,k){var found=seen['l'+k];if(!found&&l.on)out.push({t:T('Find out if water is still getting in'),s:T('Listen and look along the walls.'),done:false});
    else out.push({t:T('Stop the leak'),s:l.on?(l.valve?T('The pipe is under pressure. Follow it back to a stop tap.'):T('Tighten it with the wrench.')):T('Stopped.'),done:!l.on})});
  var pc=Math.round(w.fraction()*100);out.push({t:T('Get the water under the green mark'),s:T('{p}% left. Small puddles are fine.',{p:pc}),done:w.fraction()<=EW.World.DONE});
  return out;
}
function openJournal(){$('jTitle').textContent=def.name+' · '+T(def.sub);$('jBrief').textContent=T(def.brief);
  $('jTasks').innerHTML=tasks().map(function(t){return'<li class="'+(t.done?'done':'')+'"><div>'+t.t+'<small>'+t.s+'</small></div></li>'}).join('');show('journal')}
function updateHud(dt){
  var fr=world.fraction();$('gaugeFill').style.width=clamp(fr*100,0,100).toFixed(1)+'%';$('pct').textContent=Math.round(fr*100)+'%';$('clock').textContent=fmtTime(world.t);
  $('inflow').hidden=!world.incoming();
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.add('off')}
  if(scanT>0){scanT-=dt;if(scanT<=0)$('scanfx').classList.remove('on')}if(scanCool>0)scanCool-=dt;
  U.uScan.value+=((scanT>0?1:0)-U.uScan.value)*Math.min(1,dt*5);
  var u=$('hot').children;for(var k=0;k<bar.length;k++)if(bar[k]==='bucket')u[k].lastChild.textContent=bucketVol>0.001?Math.round(bucketVol*1000)+'L':'';
  // discoveries, for the journal and the hints
  world.drains.forEach(function(d,k){if(!seen['d'+k]&&Math.hypot(d.x-pl.x,d.z-pl.z)<3.2){seen['d'+k]=1;toast(d.clear<0.5?T('A drain, buried in debris. That is one reason the water is staying.'):T('A drain.'),4)}});
  world.leaks.forEach(function(l,k){if(!seen['l'+k]&&l.on&&Math.hypot(l.x-pl.x,l.z-pl.z)<4.5){seen['l'+k]=1;toast(T('Water is pouring out of a split pipe here. It will not drain while this runs.'),4.5)}});
  // prompt
  focus=findFocus();var p=$('prompt'),act=touchUI?T('Hold Do'):T('Hold E');
  if(focus){var txt='';if(focus.kind==='valve')txt=act+': '+(focus.o.closed?T('open the stop tap'):T('shut the stop tap'));else if(focus.kind==='leak')txt=tool()==='wrench'?(touchUI?T('Hold Use'):T('Hold click'))+': '+T('tighten the joint'):T('Needs the wrench');
    $('promptTx').textContent=txt;p.hidden=false;$('promptBar').hidden=hold<=0;$('promptBar').firstChild.style.width=clamp(hold,0,1)*100+'%'}else{p.hidden=true;hold=0}
  $('cross').classList.toggle('act',!!focus);$('tAct').hidden=!(focus&&focus.kind==='valve');
  // holding E on a fitting
  var working=focus&&((focus.kind==='valve'&&inp.act)||(focus.kind==='leak'&&tool()==='wrench'&&useHeld));
  if(working){hold+=dt/(focus.kind==='valve'?1.0:1.8);if(hold>=1){hold=0;inp.act=false;if(focus.kind==='valve'){world.setValve(focus.o,!focus.o.closed);sfx('valve',0.9);toast(focus.o.closed?T('Stop tap shut.'):T('Stop tap open.'),2.2)}else{world.fixLeak(focus.o);sfx('valve',0.8);toast(T('Joint tightened.'),2.2)}}}
  else if(hold>0)hold=Math.max(0,hold-dt*2);
}

// ---------------------------------------------------------------- screens
var state='menu',selJob=EWMaps[0].id,endT=0;
var PANELS=['menu','pause','settings','how','journal','result'],backTo=null;
function show(id){PANELS.forEach(function(p){$(p).hidden=p!==id});if(id&&document.pointerLockElement)document.exitPointerLock()}
function starsHtml(n){return'★'.repeat(n)+'<s>'+'★'.repeat(3-n)+'</s>'}
function buildMenu(){var h=$('jobList');h.innerHTML='';EWMaps.forEach(function(m){var b=document.createElement('button');b.className='job';b.setAttribute('aria-pressed',m.id===selJob?'true':'false');var r=save.jobs[m.id];
    b.innerHTML='<div><b data-noi18n>'+m.name+'</b><small>'+T(m.sub)+'</small></div><span class="st" data-noi18n>'+starsHtml(r?r.stars:0)+'</span>';b.addEventListener('click',function(){selJob=m.id;buildMenu()});h.appendChild(b)})}
function startJob(id){
  if(lv){scene.remove(lv.grp);lv.grp.traverse(function(o){if(o.geometry)o.geometry.dispose()});lv=null}
  def=EWMaps.filter(function(m){return m.id===id})[0];world=new EW.World(def,{});lv=buildLevel(world);
  pl.x=world.spawn.x;pl.z=world.spawn.z;pl.y=world.groundAt(pl.x,pl.z);pl.yaw=world.spawn.yaw;pl.pitch=0;pl.vy=0;pl.ground=true;
  bar=['rake','bucket','wrench'].filter(function(t){return save.gear[t]});cur=0;bucketVol=0;seen={};endT=0;scanT=0;scanCool=0;hold=0;acc=0;
  buildBar();$('plName').textContent=def.name;$('hud').hidden=false;updateWaterMesh();
  state='play';show(null);lockPointer();toast(T(def.brief),5);
}
function finishJob(){
  state='result';var t=world.t,fr=world.fraction(),stars=1+(t<=def.par*1.6?1:0)+(t<=def.par&&fr<=0.015?1:0),pay=Math.round(def.pay*(0.6+0.2*stars));
  var r=save.jobs[def.id]||{stars:0,best:0,n:0};var first=!r.n;r.n++;r.stars=Math.max(r.stars,stars);r.best=r.best?Math.min(r.best,Math.round(t)):Math.round(t);save.jobs[def.id]=r;save.coins+=pay;persist();
  $('rStars').innerHTML=starsHtml(stars);
  $('rSum').innerHTML='<span>'+T('Time')+'</span><b>'+fmtTime(t)+'</b><span>'+T('Water left')+'</span><b>'+(fr*100).toFixed(1)+'%</b><span>'+T('Pay')+'</span><b>'+pay+' ◈</b><span>'+T('Your coins')+'</span><b>'+save.coins+' ◈</b>';
  void first;show('result');sfx('done',1);
}
function pause(){if(state!=='play')return;state='pause';show('pause')}
function resume(){if(state!=='pause')return;state='play';show(null);lockPointer()}
function quit(){state='menu';$('hud').hidden=true;buildMenu();show('menu')}
function lockPointer(){if(!touchUI&&canvas.requestPointerLock){try{var p=canvas.requestPointerLock();if(p&&p.catch)p.catch(function(){})}catch(e){}}canvas.focus()}
document.addEventListener('pointerlockchange',function(){if(!document.pointerLockElement&&state==='play'&&!touchUI&&$('journal').hidden)pause()});
$('bStart').onclick=function(){startJob(selJob)};
$('bResume').onclick=resume;$('bQuit').onclick=quit;$('bRestart').onclick=function(){startJob(def.id)};
$('bAgain').onclick=function(){startJob(def.id)};$('bBack').onclick=quit;
function openSub(id){backTo=state==='menu'?'menu':'pause';if(state==='play')state='pause';if(id==='journal')openJournal();else show(id)}
$('bSet1').onclick=$('bSet2').onclick=function(){openSub('settings')};$('bHow').onclick=$('bHow2').onclick=function(){openSub('how')};
$('bJournal').onclick=$('bJournal2').onclick=function(){openSub('journal')};
$('bSetDone').onclick=$('bHowDone').onclick=function(){show(backTo)};
$('bJDone').onclick=function(){if(backTo==='pause'&&$('pause').dataset.from!=='menu'){state='pause';resume()}else show(backTo)};
$('bPause').onclick=pause;$('bScan').onclick=function(){scan();canvas.focus()};
$('bFull').onclick=function(){var d=document;if(d.fullscreenElement)d.exitFullscreen();else if(d.documentElement.requestFullscreen)d.documentElement.requestFullscreen().catch(function(){})};
// settings
function seg(id,key,after){var el=$(id);function paint(){[].forEach.call(el.children,function(b){b.setAttribute('aria-pressed',String(save.set[key])===b.dataset.v?'true':'false')})}
  [].forEach.call(el.children,function(b){b.onclick=function(){save.set[key]=isNaN(+b.dataset.v)?b.dataset.v:+b.dataset.v;persist();paint();if(after)after()}});paint()}
$('sSens').value=save.set.sens;$('sVol').value=save.set.vol;
$('sSens').oninput=function(){save.set.sens=+this.value;persist()};$('sVol').oninput=function(){save.set.vol=+this.value;persist();audioTick(0)};
seg('sQ','q',resize);seg('sInv','inv');

// ---------------------------------------------------------------- keyboard and mouse
addEventListener('keydown',function(e){
  if(e.target&&e.target.tagName==='INPUT')return;keys[e.code]=true;
  if(state==='play'){
    if(e.code==='Space'){inp.jump=true;e.preventDefault()}
    else if(e.code==='Tab'||e.code==='KeyJ'){e.preventDefault();openSub('journal')}
    else if(e.code==='KeyF')scan();
    else if(e.code==='KeyE')inp.act=true;
    else if(e.code==='KeyP')pause();
    else if(/^Digit[1-9]$/.test(e.code))selectTool(+e.code.slice(5)-1);
  }else if(e.code==='Escape'||e.code==='Tab'||e.code==='KeyJ'){
    if(!$('journal').hidden){e.preventDefault();$('bJDone').onclick()}else if(state==='pause'&&!$('pause').hidden&&e.code==='Escape')resume();
  }
});
addEventListener('keyup',function(e){keys[e.code]=false;if(e.code==='KeyE')inp.act=false});
addEventListener('blur',function(){keys={};useHeld=altHeld=false;inp.act=false});
document.addEventListener('mousemove',function(e){if(document.pointerLockElement!==canvas||state!=='play')return;var s=0.0022*save.set.sens;pl.yaw-=e.movementX*s;pl.pitch=clamp(pl.pitch-e.movementY*s*(save.set.inv?-1:1),-1.5,1.5)});
canvas.addEventListener('mousedown',function(e){if(touchUI||state!=='play')return;if(document.pointerLockElement!==canvas){lockPointer();return}
  if(e.button===0){useHeld=true;useTool(false)}else if(e.button===2){altHeld=true;useTool(true)}});
addEventListener('mouseup',function(e){if(e.button===0)useHeld=false;else if(e.button===2)altHeld=false});
canvas.addEventListener('contextmenu',function(e){e.preventDefault()});
canvas.addEventListener('wheel',function(e){if(state!=='play')return;e.preventDefault();selectTool((cur+(e.deltaY>0?1:-1)+bar.length)%bar.length)},{passive:false});
function readKeys(){if(touchUI)return;inp.mz=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);inp.mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  inp.sprint=!!(keys.ShiftLeft||keys.ShiftRight);inp.crouch=!!(keys.KeyC||keys.ControlLeft)}

// ---------------------------------------------------------------- touch
(function(){
  var stick=$('stick'),nub=stick.firstElementChild,sid=null,sx=0,sy=0,lid=null,lx=0,ly=0;
  addEventListener('touchstart',function(){if(!touchUI){setTouch(true);resize();if(state==='play')buildBar()}},{passive:true,once:true});
  function setStick(dx,dy){var m=Math.hypot(dx,dy),mx=46;if(m>mx){dx*=mx/m;dy*=mx/m}nub.style.transform='translate('+dx+'px,'+dy+'px)';inp.mx=dx/mx;inp.mz=-dy/mx;inp.sprint=m>mx*1.25}
  canvas.addEventListener('touchstart',function(e){if(state!=='play')return;e.preventDefault();for(var k=0;k<e.changedTouches.length;k++){var t=e.changedTouches[k];
      if(sid===null&&t.clientX<innerWidth*0.42&&t.clientY>innerHeight*0.38){sid=t.identifier;sx=t.clientX;sy=t.clientY;stick.style.left=(sx-59)+'px';stick.style.top=(sy-59)+'px';stick.style.bottom='auto';setStick(0,0)}
      else if(lid===null){lid=t.identifier;lx=t.clientX;ly=t.clientY}}},{passive:false});
  canvas.addEventListener('touchmove',function(e){e.preventDefault();for(var k=0;k<e.changedTouches.length;k++){var t=e.changedTouches[k];
      if(t.identifier===sid)setStick(t.clientX-sx,t.clientY-sy);
      else if(t.identifier===lid){var s=0.0052*save.set.sens;pl.yaw-=(t.clientX-lx)*s;pl.pitch=clamp(pl.pitch-(t.clientY-ly)*s*(save.set.inv?-1:1),-1.5,1.5);lx=t.clientX;ly=t.clientY}}},{passive:false});
  function end(e){for(var k=0;k<e.changedTouches.length;k++){var t=e.changedTouches[k];if(t.identifier===sid){sid=null;setStick(0,0);stick.style.left='';stick.style.top='';stick.style.bottom=''}else if(t.identifier===lid)lid=null}}
  canvas.addEventListener('touchend',end);canvas.addEventListener('touchcancel',end);
  function btn(id,down,up){var b=$(id);b.addEventListener('touchstart',function(e){e.preventDefault();b.classList.add('on');down()},{passive:false});
    function u(e){e.preventDefault();b.classList.remove('on');if(up)up()}b.addEventListener('touchend',u,{passive:false});b.addEventListener('touchcancel',u,{passive:false})}
  btn('tUse',function(){useHeld=true;useTool(false)},function(){useHeld=false});
  btn('tAlt',function(){altHeld=true;useTool(true)},function(){altHeld=false});
  btn('tJump',function(){inp.jump=true});
  btn('tAct',function(){inp.act=true},function(){inp.act=false});
  var cr=$('tCrouch');cr.addEventListener('touchstart',function(e){e.preventDefault();inp.crouch=!inp.crouch;cr.classList.toggle('on',inp.crouch)},{passive:false});
})();

// ---------------------------------------------------------------- the loop
var last=performance.now(),acc=0,STEP=1/30,simMs=0;
function frame(now){
  requestAnimationFrame(frame);
  var dt=Math.min(0.05,(now-last)/1000);last=now;
  if(document.hidden)return;
  if(state==='play'){
    readKeys();movePlayer(dt);
    acc+=dt;var n=0,t0=performance.now();while(acc>=STEP&&n<3){world.step(STEP);acc-=STEP;n++}if(n){updateWaterMesh();simMs+=(performance.now()-t0-simMs)*0.1}if(acc>STEP)acc=0;
    if(useHeld&&tool()==='rake')useTool(false);if(altHeld&&tool()==='rake')useTool(true);
    updateThings(dt,now/1000);animView(dt);updateHud(dt);audioTick(dt);
    if(world.isDone()){endT+=dt;if(endT>2.5)finishJob()}else endT=0;
  }
  if(state==='menu'&&!lv)return;
  if(state==='menu')return;
  U.uT.value=now/1000;U.uCam.value.copy(camera.position);
  renderer.render(scene,camera);
}
buildMenu();show('menu');requestAnimationFrame(frame);
// for tests and tuning from the console
window.__ew={ff:function(sec){for(var k=0;k<sec*30;k++)world.step(STEP);updateWaterMesh()},get world(){return world},get lv(){return lv},pl:pl,inp:inp,save:save,start:startJob,get state(){return state},get simMs(){return simMs},renderer:renderer,scan:scan,use:useTool,select:selectTool};
})();
