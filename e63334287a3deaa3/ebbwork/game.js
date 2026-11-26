/* Flood Crew (first built as Ebbwork): drawing, controls, sound, HUD and menus.
   The rules of the water and of every tool are in core.js; everything modelled is in models.js. */
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
function T(s,v){if(window.BackRoomLang)return BackRoomLang.t(s,v);return v?s.replace(/\{(\w+)\}/g,function(m,k){return v[k]}):s}
var CS=EW.CS;
var clamp=function(v,a,b){return v<a?a:v>b?b:v};

// ---------------------------------------------------------------- gear and saved progress
// slot:1 = a tool you carry (takes a place on the van). The rest are upgrades that are always with you.
var GEAR=[
  {id:'rake',name:'Rake',slot:1,price:0,desc:'Pushes and pulls leaves and litter off a drain.'},
  {id:'bucket',name:'Bucket',slot:1,price:0,desc:'Carries 30 litres at a time, for the puddles nothing else can reach.'},
  {id:'wrench',name:'Wrench',slot:1,price:0,desc:'Tightens dripping joints.'},
  {id:'squeegee',name:'Squeegee',slot:1,price:50,desc:'Shoves thin water across a hard floor, towards a drain or a doorway.'},
  {id:'shovel',name:'Shovel',slot:1,price:80,desc:'Cuts a trench in soft ground so water can run downhill. It can pile the spoil back up, too.'},
  {id:'sack',name:'Debris sack',slot:1,price:90,desc:'Bags up to 40 bits of debris for good, so they cannot wash back.'},
  {id:'sandbags',name:'Sandbags',slot:1,price:90,desc:'Four rows of bags. Lay them across a gap to hold water back.'},
  {id:'pump',name:'Pump',slot:1,price:170,desc:'Lifts water out of places with no way down. It needs power within 8 m, and a hose end somewhere the water can get away.'},
  {id:'generator',name:'Generator',slot:1,price:240,desc:'Power for the pump where there is no socket. Keep it out of the water.'},
  {id:'bags2',name:'More sandbags',price:110,need:'sandbags',desc:'Four more rows on the van.'},
  {id:'hose2',name:'Long hose',price:130,need:'pump',desc:'16 m of hose in place of 9.'},
  {id:'reel',name:'Cable reel',price:80,need:'pump',desc:'18 m of cable in place of 8.'},
  {id:'pump2',name:'Second pump',price:260,need:'pump',desc:'Two pumps on the van.'},
  {id:'waders',name:'Waders',price:110,desc:'Deep water slows you far less.'},
  {id:'rack',name:'Van racking',price:150,desc:'Room for seven kinds of tool in place of five.'}
];
var GEARBY={};GEAR.forEach(function(g){GEARBY[g.id]=g});
var SAVE_KEY='ebbwork:v1';
var save={v:1,coins:0,gear:{rake:1,bucket:1,wrench:1},load:['rake','bucket','wrench'],jobs:{},set:{sens:1,vol:0.8,q:'auto',inv:0},tut:0,seen:{}};
(function(){try{var o=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(o&&o.v===1){for(var k in o)if(k==='set'||k==='gear'||k==='jobs'||k==='seen'){for(var j in o[k])save[k][j]=o[k][j]}else save[k]=o[k]}}catch(e){}
  // a save from before the rebuilt start (no `seen` in it) already knows the depot: keep its gear bench open
  try{var raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(raw&&!raw.seen&&raw.jobs&&raw.jobs.yard&&raw.jobs.yard.stars)save.seen.shop=save.seen.shopSaid=1}catch(e){}
  if(!Array.isArray(save.load))save.load=['rake','bucket','wrench'];save.load=save.load.filter(function(t){return GEARBY[t]&&GEARBY[t].slot&&save.gear[t]})})();
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}}
function slots(){return save.gear.rack?7:5}
function owned(){return GEAR.filter(function(g){return g.slot&&save.gear[g.id]}).map(function(g){return g.id})}
function unlocked(k){return k===0||!!(save.jobs[EWMaps[k-1].id]&&save.jobs[EWMaps[k-1].id].stars)}
// What a new player has not met yet stays out of sight. Each of these turns on when it starts to matter.
function firstJob(){return !(save.jobs.yard&&save.jobs.yard.stars)}
function shopOpen(){if(save.seen.shop)return true;if(save.jobs.street&&save.jobs.street.stars){save.seen.shop=1;persist();return true}return false} // the gear bench arrives after the second job
function vanNeeded(){return owned().length>slots()}

// ---------------------------------------------------------------- renderer, light and sky
var touchUI=matchMedia('(pointer: coarse)').matches&&!matchMedia('(any-pointer: fine)').matches;
function setTouch(on){touchUI=on;document.body.classList.toggle('touch',on)}
setTouch(touchUI);
var canvas=$('view');
var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:!touchUI,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.localClippingEnabled=true; // the site is still, so its shadows are drawn once and again only when something is put down
var scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(74,1,0.06,320);
camera.rotation.order='YXZ';scene.add(camera);
// late afternoon after the storm: a low warm sun, cool sky fill, long soft shadows
var SKY={zen:new THREE.Color(0x4f86c0),hor:new THREE.Color(0xf3dfbd),fog:new THREE.Color(0xe9dcc4),sun:new THREE.Vector3(-0.62,0.50,0.60).normalize(),sunC:new THREE.Color(0xffd7a0),gnd:new THREE.Color(0x6b6048)};
scene.background=SKY.fog;scene.fog=new THREE.Fog(0xe9dcc4,45,210);
var hemi=new THREE.HemisphereLight(0xc4d6ea,0x7a6a4c,0.6);scene.add(hemi);
var sun=new THREE.DirectionalLight(0xffd7a0,0.95);sun.castShadow=true;sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.035;scene.add(sun);scene.add(sun.target);
var torch=new THREE.PointLight(0xffe9c4,0,18,1);camera.add(torch);
// Auto starts High on computers and Low on touch screens and Chromebooks, and steps down for the rest of the visit
// (never back up) if frames stay slow even after ../autores.js has lowered the resolution.
var autoLow=/CrOS/.test(navigator.userAgent),mirrorOff=false,slowN=0,fpsT=0,fpsN=0; // mirrorOff: the next step down after Low, for slow phones: the water stops mirroring the site and shows the sky
function quality(){var q=save.set.q;return q==='auto'?(touchUI||autoLow?'low':'high'):q}
function resize(){var w=innerWidth,h=innerHeight,pr=Math.min(devicePixelRatio||1,quality()==='high'||touchUI?2:1); // phones ask for up to 2 so that ../autores.js, which can halve it, never takes them under 1
  renderer.setPixelRatio(pr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?86:74;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
function fitShadow(){if(!world)return;var dw=world.def.w,dh=world.def.h,r=Math.hypot(dw,dh)*0.5+3,c=sun.shadow.camera,s=quality()==='high'?2048:1024;
  sun.target.position.set(dw/2,0,dh/2);sun.position.copy(sun.target.position).addScaledVector(SKY.sun,60);c.left=-r;c.right=r;c.top=r;c.bottom=-r;c.near=5;c.far=130;c.updateProjectionMatrix();
  if(sun.shadow.mapSize.x!==s){sun.shadow.mapSize.set(s,s);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}renderer.shadowMap.needsUpdate=true}

// a small tiling noise picture, used for grain on the ground and ripples on the water
var noiseTex=(function(){var N=128,c=document.createElement('canvas');c.width=c.height=N;var x=c.getContext('2d'),im=x.createImageData(N,N),d=im.data;
  function lay(ch,seed,oct){var waves=[];var r=(function(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})(seed);
    for(var k=0;k<oct;k++){var f=1+Math.floor(r()*r()*14);waves.push([Math.round((r()-0.5)*2*f),Math.round((r()-0.5)*2*f),r()*6.283,1/(0.6+f*0.35)])}
    var mn=1e9,mx=-1e9,buf=new Float32Array(N*N);for(var py=0;py<N;py++)for(var px=0;px<N;px++){var s=0;for(k=0;k<oct;k++){var w=waves[k];s+=Math.sin((px*w[0]+py*w[1])/N*6.283+w[2])*w[3]}buf[py*N+px]=s;if(s<mn)mn=s;if(s>mx)mx=s}
    for(var i=0;i<N*N;i++)d[i*4+ch]=Math.round((buf[i]-mn)/(mx-mn)*255)}
  lay(0,11,26);lay(1,23,26);lay(2,37,40);for(var i=0;i<N*N;i++)d[i*4+3]=255;x.putImageData(im,0,0);
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t})();

var U={uT:{value:0},uCam:{value:new THREE.Vector3()},uSun:{value:SKY.sun},uSunC:{value:SKY.sunC},uSky:{value:SKY.zen},uHor:{value:SKY.hor},
  uFog:{value:SKY.fog},uFogN:{value:45},uFogF:{value:210},tN:{value:noiseTex},uScan:{value:0},uTorch:{value:0},uDay:{value:1},tR:{value:null},uRefl:{value:0},uReflVP:{value:new THREE.Matrix4()},
  tRip:{value:null},uRipOn:{value:0},uMap:{value:new THREE.Vector2(1,1)},uRipPx:{value:new THREE.Vector2(0.1,0.1)},uLerp:{value:1},
  uNoSun:{value:0},uRipDbg:{value:0},uHi:{value:1},uDr:{value:[new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4()]}};
var skyDome=new THREE.Mesh(new THREE.SphereGeometry(260,24,12),new THREE.ShaderMaterial({uniforms:U,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'precision highp float;uniform sampler2D tN;uniform float uT,uNoSun;uniform vec3 uSun,uSunC,uSky,uHor;varying vec3 vDir;'+
    'void main(){vec3 d=normalize(vDir);float h=max(d.y,0.0);float sd=max(dot(d,uSun),0.0);vec3 c=mix(uHor,uSky,pow(h,0.55));c=mix(c,vec3(1.0,0.86,0.62),pow(sd,5.0)*0.55*(1.0-h*0.6));'+
    'vec2 uv=d.xz/(d.y+0.3);float n=texture2D(tN,uv*0.10+vec2(uT*0.0016,0.0)).b*0.62+texture2D(tN,uv*0.29-vec2(0.0,uT*0.0022)).r*0.38;'+
    'float cl=smoothstep(0.50,0.72,n)*smoothstep(0.0,0.2,h);vec3 cc=mix(vec3(1.0,0.95,0.86),vec3(0.62,0.66,0.74),smoothstep(0.58,0.9,n));cc=mix(cc,vec3(1.0,0.82,0.6),pow(sd,3.0)*0.5);c=mix(c,cc,cl*0.85);'+
    'c+=(uSunC*pow(sd,260.0)*1.4+uSunC*pow(sd,22.0)*0.22)*(1.0-uNoSun);gl_FragColor=vec4(c,1.0);}'}));
skyDome.renderOrder=-10;skyDome.frustumCulled=false;scene.add(skyDome);
var FOGF='float fd=length(uCam-vW);gl_FragColor.rgb=mix(gl_FragColor.rgb,uFog,smoothstep(uFogN,uFogF,fd));';

// The ground is three's own lit material (so it takes the sun's shadows and the torch), with our patterns added:
// grain, paving joints, and wet ground that is darker and shines until it dries.
var terrainMat=new THREE.MeshLambertMaterial({vertexColors:true});
terrainMat.onBeforeCompile=function(sh){sh.uniforms.tN=U.tN;sh.uniforms.uHorC=U.uHor;sh.uniforms.uT=U.uT;sh.uniforms.uSunC=U.uSunC;sh.uniforms.uDay=U.uDay;sh.uniforms.uHi=U.uHi;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','attribute float aPat;attribute float aWet;attribute float aWd;varying float vPat;varying float vWet;varying float vWd;varying vec3 vWp;\n#include <common>').replace('#include <begin_vertex>','#include <begin_vertex>\nvPat=aPat;vWet=aWet;vWd=aWd;vWp=position;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','uniform sampler2D tN;uniform vec3 uHorC,uSunC;uniform float uT,uDay,uHi;varying float vPat;varying float vWet;varying float vWd;varying vec3 vWp;\n#include <common>')
    .replace('#include <color_fragment>','#include <color_fragment>\nvec3 g_=texture2D(tN,vWp.xz*0.43).rgb;float big_=texture2D(tN,vWp.xz*0.071+0.3).b;diffuseColor.rgb*=(0.80+0.34*g_.b)*(0.84+0.32*big_);'+
      'if(vPat>0.02){vec2 q_=vWp.xz/vPat;vec2 f_=abs(fract(q_)-0.5);float j_=smoothstep(0.455,0.492,max(f_.x,f_.y));vec2 id_=floor(q_);float h_=fract(sin(dot(id_,vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=(0.90+0.18*h_)*(1.0-0.45*j_);}'+
      'else{diffuseColor.rgb*=0.86+0.34*texture2D(tN,vWp.xz*1.9).r;}'+
      'float wet_=clamp(vWet,0.0,1.0);diffuseColor.rgb*=mix(1.0,0.52,wet_);'+
      // under water the ground takes on the colour of the silt in it
      'float uw_=smoothstep(0.0,0.18,vWd);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.32,0.25,0.15),uw_*0.55);')
    .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n'+
      // wet paving shines a little at a low angle; grass does not
      'float fr_=pow(1.0-abs(dot(normalize(vNormal),normalize(vViewPosition))),4.0);totalEmissiveRadiance+=uHorC*fr_*wet_*0.14*step(0.02,vPat)*(1.0-uw_);'+
      // caustics: sunlight focused by the ripples into a moving net of bright lines on the bottom of shallow water
      'if(uHi>0.5&&vWd>0.004&&vWd<0.3){vec2 cp_=vWp.xz*1.25;float c1_=texture2D(tN,cp_*0.61+vec2(uT*0.031,uT*0.019)).b;float c2_=texture2D(tN,cp_*0.73-vec2(uT*0.023,-uT*0.029)+0.5).b;'+
      'float ca_=pow(max(0.0,1.0-abs(c1_-c2_)*3.2),6.0);totalEmissiveRadiance+=uSunC*uDay*ca_*0.55*smoothstep(0.004,0.03,vWd)*exp(-vWd*11.0);}')};

// The water. Its vertices sit at the cell centres; they glide between two simulation steps (uLerp) so the surface
// never jumps. Brown and opaque where deep, clearer where thin; a crisp foam line at the shore; patches of silt that
// drift with the current; ripples from a second, finer simulation on the graphics card (tRip: footsteps, drips,
// rake strokes, pours); a whirlpool over every running drain (uDr); and the sky, or a mirror picture of the site, on top.
var waterMat=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-3,
  vertexShader:'attribute float aDepth;attribute vec2 aFlow;attribute vec2 aPrev;attribute vec2 aSlope;uniform mat4 uReflVP;uniform float uLerp,uT;uniform vec4 uDr[4];varying float vD;varying vec2 vF;varying vec2 vS;varying vec3 vW;varying vec4 vR;'+
    'void main(){vec3 p=position;p.y=mix(aPrev.x,p.y,uLerp);vD=mix(aPrev.y,aDepth,uLerp);vF=aFlow;vS=aSlope;'+
    'for(int i=0;i<4;i++){vec4 d=uDr[i];if(d.z<=0.0)continue;vec2 e=p.xz-d.xy;p.y-=d.z*0.11*exp(-dot(e,e)/0.30)*smoothstep(0.02,0.12,vD);}'+
    'vW=p;vR=uReflVP*vec4(p,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
  fragmentShader:'precision highp float;uniform sampler2D tN,tR,tRip;uniform float uT,uScan,uFogN,uFogF,uTorch,uDay,uRefl,uRipOn,uRipDbg,uHi;uniform vec2 uMap,uRipPx;uniform vec4 uDr[4];uniform vec3 uCam,uSun,uSunC,uSky,uHor,uFog;varying float vD;varying vec2 vF;varying vec2 vS;varying vec3 vW;varying vec4 vR;'+
    'void main(){if(vD<0.003)discard;'+
    'vec2 xz=vW.xz;float swirl=0.0,eye=0.0,spiral=0.0;'+
    // whirlpools: twist the surface pattern round each running drain, darken its eye, and draw spiral streaks
    'for(int i=0;i<4;i++){vec4 d=uDr[i];if(d.z<=0.0)continue;vec2 e=vW.xz-d.xy;float r=length(e);if(r>1.2)continue;float st=d.z*smoothstep(1.2,0.15,r);'+
    'float an=st*2.2/(r+0.22)+uT*d.z*3.0;float cs=cos(an),sn=sin(an);xz=d.xy+vec2(cs*e.x-sn*e.y,sn*e.x+cs*e.y);swirl=max(swirl,st);eye=max(eye,d.z*exp(-r*r/0.06));'+
    'float ang=atan(e.y,e.x);spiral=max(spiral,st*st*smoothstep(0.82,0.99,sin(ang*3.0+log(r+0.04)*7.0+uT*d.z*9.0))*smoothstep(0.04,0.2,r)*smoothstep(0.9,0.3,r));}'+
    'vec2 uv=xz*0.30;vec2 fl=clamp(vF,-1.6,1.6)*0.6;float sp=length(vF);'+
    'float p0=fract(uT*0.35),p1=fract(uT*0.35+0.5);'+
    'vec3 a=texture2D(tN,uv-fl*p0+vec2(uT*0.021,uT*0.013)).rgb;vec3 b=texture2D(tN,uv*1.07+0.37-fl*p1-vec2(uT*0.017,-uT*0.019)).rgb;'+
    'vec3 m=mix(a,b,abs(1.0-2.0*p0));vec3 fine=vec3(0.5,0.5,0.75),chop=vec3(0.5);if(uHi>0.5){fine=texture2D(tN,xz*1.3+vec2(-uT*0.05,uT*0.04)).rgb;chop=texture2D(tN,xz*3.7+vec2(uT*0.09,-uT*0.07)).rgb;}'+
    'float near=1.0-smoothstep(4.0,18.0,length(uCam.xz-vW.xz));vec2 nn=(m.xy*2.0-1.0)+(fine.xy*2.0-1.0)*0.45+(chop.xy*2.0-1.0)*0.3*near;'+
    'float calm=smoothstep(0.0,0.04,vD);float amp=(0.2+min(sp,1.2)*0.55+swirl*0.5)*calm;'+
    'vec3 N=normalize(vec3(nn.x*amp-vS.x*3.0*calm,1.0,nn.y*amp-vS.y*3.0*calm));float crest=0.0;vec2 rg=vec2(0.0);'+
    // ripples: slope of the ripple height field, sampled one texel either side
    'if(uRipOn>0.5){vec2 ru=vW.xz/uMap;vec2 o=uRipPx/uMap;float hr=texture2D(tRip,ru+vec2(o.x,0.0)).r,hu=texture2D(tRip,ru+vec2(0.0,o.y)).r,hl,hd;'+
    'if(uHi>0.5){hl=texture2D(tRip,ru-vec2(o.x,0.0)).r;hd=texture2D(tRip,ru-vec2(0.0,o.y)).r;}else{hl=texture2D(tRip,ru).r;hd=hl;hr+=hr-hl;hu+=hu-hd;}'+
    'vec2 gr=vec2(hr-hl,hu-hd)/(2.0*uRipPx);rg=gr;N=normalize(N+vec3(-gr.x,0.0,-gr.y)*5.0);crest=smoothstep(0.12,0.3,length(gr));}'+
    'vec3 V=normalize(uCam-vW);'+
    'float fres=0.06+0.94*pow(1.0-max(dot(N,V),0.0),4.0);'+
    'float murk=1.0-exp(-max(vD,0.0)*8.0);vec3 tv=uCam-vW;float tl=uTorch*1.5/(1.0+dot(tv,tv)*0.10);float lit=uDay+tl;'+
    // silt: lighter and darker clouds in the water that drift with the flow
    'float silt=m.r;if(uHi>0.5)silt=texture2D(tN,uv*0.45-fl*p0*0.5+0.11).b*0.6+m.r*0.4;'+
    'vec3 body=mix(vec3(0.50,0.45,0.31),vec3(0.27,0.22,0.13),murk)*(0.86+0.28*silt)*lit;body*=1.0-eye*0.55;vec2 sl=-rg-vS*1.5;body*=1.0+clamp(dot(sl,normalize(uSun.xz+vec2(1e-4)))*4.0,-0.4,0.4)*calm;float al=mix(0.18,0.97,murk);'+
    'vec3 R=reflect(-V,N);vec3 skyc=mix(uHor,uSky,clamp(R.y*1.25,0.0,1.0));skyc=mix(vec3(0.20,0.21,0.17)*lit,skyc,smoothstep(0.04,0.30,R.y+nn.x*0.05))+vec3(0.05,0.07,0.08)*uTorch;'+
    'if(uRefl>0.5){vec2 ruv=vR.xy/vR.w*0.5+0.5+N.xz*0.12*calm;skyc=mix(skyc,texture2D(tR,clamp(ruv,0.003,0.997)).rgb,0.88);}'+
    'vec3 col=mix(body,skyc,fres*calm);al=mix(al,1.0,fres*0.8*calm);'+
    'float sd=max(dot(R,uSun),0.0);col+=uSunC*(pow(sd,900.0)*(1.0+2.0*uHi)+pow(sd,60.0)*0.18+pow(sd,40.0)*0.22*smoothstep(0.8,0.92,chop.b)*near)*calm;col+=vec3(1.0,0.93,0.8)*tl*pow(max(dot(R,V),0.0),10.0)*0.5;'+
    // foam: streaks where the current is quick, on ripple crests, and in the whirlpool's arms
    'float foam=smoothstep(0.12,0.6,sp)*smoothstep(0.52,0.76,m.b)*calm;foam=max(foam,crest*0.35*calm);foam=max(foam,spiral*0.5);'+
    // the shore: a foam line a few centimetres wide whatever the slope, broken up and lapping
    'vec2 gD=vec2(dFdx(vD),dFdy(vD));vec2 gx=vec2(length(dFdx(vW.xz)),length(dFdy(vW.xz)));float dslope=length(gD)/max(length(gx),1e-4);'+
    'float shoreDist=vD/max(dslope,0.015);float lap=0.5+0.5*sin(uT*1.6+m.r*8.0);float edge=(1.0-smoothstep(0.03+0.05*lap,0.16+0.06*lap,shoreDist))*smoothstep(0.35,0.62,fine.b+0.25)*(1.0-smoothstep(0.03,0.09,vD));'+
    'foam=max(foam,edge*0.9);col=mix(col,vec3(0.96,0.94,0.87)*lit,foam);al=max(al,foam*0.92);'+
    'al*=smoothstep(0.003,0.008,vD);'+
    'float sc=uScan*step(0.009,vD)*(0.6+0.4*sin(uT*9.0-length(vW.xz-uCam.xz)*1.6));col=mix(col,vec3(0.25,1.0,0.92),sc*0.8);al=max(al,sc*0.85);'+
    'gl_FragColor=vec4(col,al);'+FOGF+'if(uRipDbg>0.5){float h=texture2D(tRip,vW.xz/uMap).r;gl_FragColor=vec4(0.5+h*60.0,0.5,0.5-h*60.0,1.0);}}'});

// ---------------------------------------------------------------- ripples: a wave simulation on the graphics card
// A height field a few centimetres a texel over the whole site (R = height now, G = height a step ago). Each 1/60 s:
// the wave equation, damped, held at zero where there is no water (the flood simulation's depths come in through
// tSim) so ripples bounce off walls and die on the shore. Each bump has a dip round it, so it makes rings rather than
// a swell. (Carrying the ripples along with the current was tried: the resampling blurred them away within a second.) Anything that touches the water
// adds a bump (rip()). Needs half-float render targets; without them the flat rings in fx do the job instead.
var RIP={ok:false,a:null,b:null,sim:null,simData:null,scene:null,cam:null,mat:null,acc:0,imp:[],n:0,W:0,H:0,px:0.1,dt:1/60};
(function(){var gl=renderer.getContext();RIP.ok=!!(renderer.capabilities.isWebGL2&&(renderer.extensions.has('EXT_color_buffer_float')||renderer.extensions.has('EXT_color_buffer_half_float')));
  if(!RIP.ok)return;void gl;
  var imp=[];for(var k=0;k<16;k++)imp.push(new THREE.Vector4());RIP.imp=imp;
  RIP.mat=new THREE.ShaderMaterial({uniforms:{tPrev:{value:null},tSim:{value:null},uTex:{value:new THREE.Vector2()},uMap:U.uMap,uK:{value:0.04},uDamp:{value:0.992},uDt:{value:1/60},uImp:{value:imp},uImpN:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader:'precision highp float;uniform sampler2D tPrev,tSim;uniform vec2 uTex,uMap;uniform float uK,uDamp,uDt;uniform vec4 uImp[16];uniform int uImpN;varying vec2 vUv;'+
      'void main(){vec4 s=texture2D(tSim,vUv);vec2 a=vUv;vec4 c=texture2D(tPrev,a);'+
      'float sum=texture2D(tPrev,a+vec2(uTex.x,0.0)).r+texture2D(tPrev,a-vec2(uTex.x,0.0)).r+texture2D(tPrev,a+vec2(0.0,uTex.y)).r+texture2D(tPrev,a-vec2(0.0,uTex.y)).r;'+
      'float h=(2.0*c.r-c.g+uK*(sum-4.0*c.r))*uDamp;vec2 w=vUv*uMap;'+
      'for(int i=0;i<16;i++){if(i>=uImpN)break;vec4 p=uImp[i];vec2 e=w-p.xy;float q=dot(e,e)/(p.z*p.z);h+=p.w*(exp(-q)-0.25*exp(-q*0.25));}'+
      'h*=smoothstep(0.008,0.03,s.r);h=clamp(h,-0.08,0.08);gl_FragColor=vec4(h,c.r,0.0,1.0);}',depthTest:false,depthWrite:false});
  RIP.scene=new THREE.Scene();RIP.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);RIP.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),RIP.mat));
})();
function ripSetup(){
  if(!RIP.ok){U.uRipOn.value=0;return}
  var hi=quality()==='high',px=hi?0.07:0.12,W=Math.min(400,Math.ceil(world.def.w/px)),H=Math.min(400,Math.ceil(world.def.h/px));px=Math.max(world.def.w/W,world.def.h/H);
  if(RIP.a){RIP.a.dispose();RIP.b.dispose()}if(RIP.sim)RIP.sim.dispose();
  var o={type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false,wrapS:THREE.ClampToEdgeWrapping,wrapT:THREE.ClampToEdgeWrapping};
  RIP.a=new THREE.WebGLRenderTarget(W,H,o);RIP.b=new THREE.WebGLRenderTarget(W,H,o);RIP.W=W;RIP.H=H;RIP.px=px;
  var cl=new THREE.Color(0,0,0);renderer.setClearColor(cl,0);[RIP.a,RIP.b].forEach(function(t){renderer.setRenderTarget(t);renderer.clear()});renderer.setRenderTarget(null);renderer.setClearColor(SKY.fog,1);
  RIP.simData=new Uint16Array(world.W*world.H*4);RIP.sim=new THREE.DataTexture(RIP.simData,world.W,world.H,THREE.RGBAFormat,THREE.HalfFloatType);RIP.sim.minFilter=RIP.sim.magFilter=THREE.LinearFilter;RIP.sim.needsUpdate=true;
  U.uMap.value.set(world.def.w,world.def.h);U.uRipPx.value.set(px,px);RIP.mat.uniforms.uTex.value.set(1/W,1/H);RIP.mat.uniforms.tSim.value=RIP.sim;
  var c=2.1,dt=hi?1/60:1/30;RIP.dt=dt;RIP.mat.uniforms.uDamp.value=hi?0.99:0.98;RIP.mat.uniforms.uK.value=Math.min(0.45,(c*dt/px)*(c*dt/px));RIP.n=0;RIP.acc=0;U.uRipOn.value=1;U.tRip.value=RIP.a.texture;
}
// a bump on the water at (x, z) metres, r metres across, a metres high (negative: a dip)
function rip(x,z,r,a){if(!RIP.ok||RIP.n>=16)return;RIP.imp[RIP.n++].set(x,z,Math.max(r,RIP.px*0.8),a)}
function ripSim(){ // copy the flood's depths into tSim (ripples only live where there is water)
  if(!RIP.ok)return;var S=world.S,n=S.n,D=RIP.simData,h=THREE.DataUtils.toHalfFloat,i;
  for(i=0;i<n;i++)D[i*4]=h(S.solid[i]?0:S.d[i]);
  RIP.sim.needsUpdate=true}
function ripStep(dt){
  if(!RIP.ok||!world)return;var st=RIP.dt;RIP.acc=Math.min(RIP.acc+dt,st*(st<0.02?4:2));var did=0;
  while(RIP.acc>=st){RIP.acc-=st;RIP.mat.uniforms.tPrev.value=RIP.a.texture;RIP.mat.uniforms.uImpN.value=did?0:RIP.n;
    renderer.setRenderTarget(RIP.b);renderer.render(RIP.scene,RIP.cam);var t=RIP.a;RIP.a=RIP.b;RIP.b=t;did=1}
  renderer.setRenderTarget(null);if(did)RIP.n=0;U.tRip.value=RIP.a.texture;
}
function setEnv(kind){var c=kind==='cellar';
  SKY.fog.setHex(c?0x0d1113:0xe9dcc4);SKY.zen.setHex(c?0x1a2023:0x4f86c0);SKY.hor.setHex(c?0x20272a:0xf3dfbd);SKY.sunC.setHex(c?0x000000:0xffd7a0);
  scene.fog.color.copy(SKY.fog);scene.fog.near=U.uFogN.value=c?5:45;scene.fog.far=U.uFogF.value=c?30:210;hemi.intensity=c?0.2:0.6;sun.intensity=c?0:0.95;sun.castShadow=!c;torch.intensity=c?1.3:0;U.uTorch.value=c?1:0;U.uDay.value=c?0.1:1;skyDome.visible=!c}

// ---------------------------------------------------------------- a job site, drawn
var world=null,def=null,lv=null,dynDirty=false,dynEnds=[];
function rebuildDyn(){dynDirty=false;if(lv.dyn){lv.grp.remove(lv.dyn);EWLook.dispose(lv.dyn,[lv.mats.plain])}var d=EWLook.dyn(world,lv);lv.dyn=d.grp;dynEnds=d.ends;lv.grp.add(d.grp);renderer.shadowMap.needsUpdate=true}
// A mirror picture of the site for the water to reflect: the scene drawn once more from under the water level. It is what
// makes the water read as water, so every tier gets it: half the screen's resolution with smoothed edges every frame on
// High, a third of it every other frame on Low.
var reflN=0,reflSize=0,reflRT=null,reflCam=new THREE.PerspectiveCamera(),reflPlane=new THREE.Plane(new THREE.Vector3(0,1,0),1e4),waterH=0,waterHT=0; // the plane sits on the walls' materials all the time; it only bites during the mirror pass
function renderReflection(){
  if(!lv||(mirrorOff&&save.set.q==='auto')){U.uRefl.value=0;return}var hi=quality()==='high',db=renderer.getDrawingBufferSize(new THREE.Vector2()),f=hi?0.5:0.34,rw=Math.max(256,Math.round(db.x*f)),rh=Math.max(160,Math.round(db.y*f)),sz=rw*10000+rh;
  if(!hi&&(reflN++&1)&&reflRT)return;
  if(!reflRT||reflSize!==sz){if(reflRT)reflRT.dispose();reflRT=new THREE.WebGLRenderTarget(rw,rh);reflSize=sz;U.tR.value=reflRT.texture}
  reflCam.fov=camera.fov;reflCam.aspect=camera.aspect;reflCam.near=0.1;reflCam.far=320;reflCam.updateProjectionMatrix();
  reflCam.position.set(camera.position.x,2*waterH-camera.position.y,camera.position.z);reflCam.rotation.order='YXZ';reflCam.rotation.set(-camera.rotation.x,camera.rotation.y,0);reflCam.updateMatrixWorld(true);
  reflCam.matrixWorldInverse.copy(reflCam.matrixWorld).invert();U.uReflVP.value.multiplyMatrices(reflCam.projectionMatrix,reflCam.matrixWorldInverse);
  reflPlane.constant=-(waterH+0.02);lv.wm.visible=false;var hv=hands.root.visible;hands.root.visible=false;ghost.visible=false;fx.visible=false;U.uRefl.value=0;
  U.uNoSun.value=1;renderer.setRenderTarget(reflRT);renderer.render(scene,reflCam);renderer.setRenderTarget(null);U.uNoSun.value=0;
  reflPlane.constant=1e4;lv.wm.visible=true;hands.root.visible=hv;ghost.visible=true;fx.visible=true;U.uRefl.value=1;
}
var vv=[0,0],dummy=new THREE.Object3D();
function updateWaterMesh(){
  var S=world.S,W=lv.W,H=lv.H,g=S.g,bar=S.bar,d=S.d,solid=S.solid,wp=lv.wp,wd=lv.wd,wf=lv.wf,wet=lv.wet,x,z,i,j,hs=0,hw=0,k;
  var pv=lv.prev;for(i=0;i<S.n;i++){pv[i*2]=wp[i*3+1];pv[i*2+1]=wd[i]}
  for(z=0;z<H;z++)for(x=0;x<W;x++){i=z*W+x;var dd=d[i],zb=g[i]+bar[i];
    if(!solid[i]&&dd>0.03&&world.mask[i]){var wq=dd/(1+((x*CS-pl.x)*(x*CS-pl.x)+(z*CS-pl.z)*(z*CS-pl.z))*0.02);hs+=(zb+dd)*wq;hw+=wq}
    if(!solid[i]&&dd>0.0015){wp[i*3+1]=zb+dd;wd[i]=dd;S.vel(i,vv);wf[i*2]=vv[0];wf[i*2+1]=vv[1];wet[i]=1}
    else{var s=0,sd=0,c=0;for(var oz=-1;oz<=1;oz++){var zz=z+oz;if(zz<0||zz>=H)continue;for(var ox=-1;ox<=1;ox++){var xx=x+ox;if(xx<0||xx>=W)continue;j=zz*W+xx;if(!solid[j]&&d[j]>0.004){s+=g[j]+bar[j]+d[j];sd+=d[j];c++}}}
      if(c){var y=s/c;wp[i*3+1]=y;wd[i]=solid[i]?sd/c:Math.min(y-zb,0.012)}else{wp[i*3+1]=zb-0.03;wd[i]=-0.03}
      wf[i*2]=0;wf[i*2+1]=0;if(wet[i]>0)wet[i]=Math.max(0,wet[i]-0.0011)}   // ground the water has left stays dark for about half a minute
  }
  // running drains: where the whirlpools go (the four strongest)
  var dl=world.drains.slice().sort(function(p,q){return q.flow-p.flow});for(k=0;k<4;k++){var dr=dl[k],ud=U.uDr.value[k];if(dr&&dr.flow>0.006&&S.d[dr.i]>0.02)ud.set(dr.x,dr.z,clamp(dr.flow*5,0.15,1),0);else ud.set(0,0,0,0)}
  ripSim();
  // surface slope at each vertex, from the neighbours either side (water only)
  var sl=lv.slope;for(z=0;z<H;z++)for(x=0;x<W;x++){i=z*W+x;if(wd[i]<=0.003){sl[i*2]=0;sl[i*2+1]=0;continue}
    var l=x>0&&wd[i-1]>0.003?i-1:i,r=x<W-1&&wd[i+1]>0.003?i+1:i,u=z>0&&wd[i-W]>0.003?i-W:i,dn=z<H-1&&wd[i+W]>0.003?i+W:i;
    sl[i*2]=r!==l?(wp[r*3+1]-wp[l*3+1])/((r-l)*CS):0;sl[i*2+1]=dn!==u?(wp[dn*3+1]-wp[u*3+1])/(((dn-u)/W)*CS):0}
  if(hw>0)waterHT=hs/hw;waterH+=(waterHT-waterH)*0.15;
  lv.wg.attributes.position.needsUpdate=true;lv.wg.attributes.aDepth.needsUpdate=true;lv.wg.attributes.aFlow.needsUpdate=true;lv.wg.attributes.aPrev.needsUpdate=true;lv.wg.attributes.aSlope.needsUpdate=true;lv.tg.attributes.aWet.needsUpdate=true;
  if(world.dirty.length){var seenV={};world.dirty.forEach(function(i){[i,i-1,i+1,i-W,i+W].forEach(function(k){if(k>=0&&k<S.n&&!seenV[k]){seenV[k]=1;lv.vert(k)}})});world.dirty.length=0;
    lv.tg.attributes.position.needsUpdate=true;lv.tg.attributes.normal.needsUpdate=true;lv.tg.attributes.color.needsUpdate=true}
}

// ---------------------------------------------------------------- splashes, rings, drops and drifting flecks
var fx=new THREE.Group();scene.add(fx);
var ringTex=(function(){var c=document.createElement('canvas');c.width=c.height=128;var x=c.getContext('2d'),g=x.createRadialGradient(64,64,30,64,64,62);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.72,'rgba(255,255,255,.1)');g.addColorStop(0.88,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)})();
var rings=[];(function(){var g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);for(var k=0;k<18;k++){var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:ringTex,transparent:true,opacity:0,depthWrite:false,color:0xf4efe2}));m.visible=false;m.renderOrder=7;fx.add(m);rings.push({m:m,t:1,s:1,d:1})}})();
function ring(x,y,z,size,dur){if(RIP.ok){rip(x,z,Math.max(0.05,size*0.06),Math.min(0.008,0.0015+size*0.0022));return}var best=rings[0];for(var k=0;k<rings.length;k++)if(rings[k].t>=1){best=rings[k];break}else if(rings[k].t>best.t)best=rings[k];best.t=0;best.s=size||1;best.d=dur||0.9;best.m.position.set(x,y+0.012,z);best.m.visible=true}
var ND=160,dropP=new Float32Array(ND*3),dropV=new Float32Array(ND*3),dropL=new Float32Array(ND),dropC=new Float32Array(ND*3),dropK=0,dropGeo=new THREE.BufferGeometry();
dropGeo.setAttribute('position',new THREE.BufferAttribute(dropP,3));dropGeo.setAttribute('color',new THREE.BufferAttribute(dropC,3));
var dotTex=(function(){var c=document.createElement('canvas');c.width=c.height=32;var x=c.getContext('2d'),g=x.createRadialGradient(16,16,0,16,16,15);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.55,'rgba(255,255,255,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,32,32);return new THREE.CanvasTexture(c)})();
var drops=new THREE.Points(dropGeo,new THREE.PointsMaterial({size:0.07,map:dotTex,vertexColors:true,transparent:true,opacity:0.95,depthWrite:false}));drops.frustumCulled=false;fx.add(drops);
for(var dk=0;dk<ND;dk++)dropP[dk*3+1]=-99;
function drop(x,y,z,vx,vy,vz,life,dirt){var k=dropK;dropK=(dropK+1)%ND;dropP[k*3]=x;dropP[k*3+1]=y;dropP[k*3+2]=z;dropV[k*3]=vx;dropV[k*3+1]=vy;dropV[k*3+2]=vz;dropL[k]=life;
  if(dirt){dropC[k*3]=0.34;dropC[k*3+1]=0.25;dropC[k*3+2]=0.16}else{dropC[k*3]=0.95;dropC[k*3+1]=0.96;dropC[k*3+2]=0.93}}
function splash(x,y,z,n,power,dirt){for(var k=0;k<n;k++){var a=Math.random()*6.283,r=(0.4+Math.random())*power;drop(x+Math.cos(a)*0.08,y+0.03,z+Math.sin(a)*0.08,Math.cos(a)*r,1.4*power+Math.random()*1.6*power,Math.sin(a)*r,0.5+Math.random()*0.35,dirt)}}
// pale flecks that ride the surface, so you can see which way the water is going
var NF=70,fleckP=new Float32Array(NF*3),fleckA=new Float32Array(NF),fleckGeo=new THREE.BufferGeometry();fleckGeo.setAttribute('position',new THREE.BufferAttribute(fleckP,3));
var flecks=new THREE.Points(fleckGeo,new THREE.PointsMaterial({size:0.035,map:dotTex,color:0xf1ecdd,transparent:true,opacity:0.55,depthWrite:false}));flecks.frustumCulled=false;flecks.renderOrder=6;fx.add(flecks);
function fleckSpawn(k){var S=world.S,tries=8,x,z,i;while(tries--){if(world.drains.length&&Math.random()<0.6){var d=world.drains[(Math.random()*world.drains.length)|0],a=Math.random()*6.283,r=0.6+Math.random()*4.5;x=d.x+Math.cos(a)*r;z=d.z+Math.sin(a)*r}else{x=pl.x+(Math.random()-0.5)*14;z=pl.z+(Math.random()-0.5)*14}
    i=world.cell(x,z);if(i>=0&&!S.solid[i]&&S.d[i]>0.03){S.vel(i,vv);var near=false;for(var q=0;q<world.drains.length;q++){var dr=world.drains[q];if(dr.flow>0.01&&Math.hypot(dr.x-x,dr.z-z)<3.5)near=true}if(!near&&vv[0]*vv[0]+vv[1]*vv[1]<0.0036)continue;fleckP[k*3]=x;fleckP[k*3+2]=z;fleckA[k]=1.5+Math.random()*3;return}}fleckP[k*3+1]=-99;fleckA[k]=0.4+Math.random()}
function updateFx(dt,time){
  var k,S=world.S;
  for(k=0;k<rings.length;k++){var r=rings[k];if(r.t>=1)continue;r.t+=dt/r.d;if(r.t>=1){r.m.visible=false;continue}var s=r.s*(0.25+r.t*1.25);r.m.scale.set(s,1,s);r.m.material.opacity=(1-r.t)*0.85}
  for(k=0;k<ND;k++){if(dropL[k]<=0)continue;dropL[k]-=dt;if(dropL[k]<=0){dropP[k*3+1]=-99;continue}dropV[k*3+1]-=9.5*dt;dropP[k*3]+=dropV[k*3]*dt;dropP[k*3+1]+=dropV[k*3+1]*dt;dropP[k*3+2]+=dropV[k*3+2]*dt}
  dropGeo.attributes.position.needsUpdate=true;dropGeo.attributes.color.needsUpdate=true;
  for(k=0;k<NF;k++){fleckA[k]-=dt;var i=fleckP[k*3+1]>-50?world.cell(fleckP[k*3],fleckP[k*3+2]):-1;
    if(fleckA[k]<=0||i<0||S.solid[i]||S.d[i]<0.02){if(fleckA[k]<=0||i>=0)fleckSpawn(k);continue}
    S.vel(i,vv);var px=fleckP[k*3],pz=fleckP[k*3+2];
    for(var q=0;q<world.drains.length;q++){var dr=world.drains[q];if(dr.flow<0.004)continue;var ex=dr.x-px,ez=dr.z-pz,e2=ex*ex+ez*ez;if(e2<0.05){fleckA[k]=0;break}if(e2<9){var el=Math.sqrt(e2),pull=Math.min(1.1,dr.flow*7)/(0.35+el);vv[0]+=ex/el*pull-ez/el*pull*0.6;vv[1]+=ez/el*pull+ex/el*pull*0.6}}
    fleckP[k*3]=px+vv[0]*dt;fleckP[k*3+2]=pz+vv[1]*dt;fleckP[k*3+1]=S.g[i]+S.bar[i]+S.d[i]+0.008}
  fleckGeo.attributes.position.needsUpdate=true;
  // water coming out of pipes and hose ends
  for(k=0;k<lv.leaks.length;k++){var L=lv.leaks[k],l=L.l;L.pow+=((l.on?1:0)-L.pow)*Math.min(1,dt*(l.on?4:1.3));if(L.pow<0.03)continue;var n=(l.wrench?1:3)*L.pow,cnt=Math.floor(n)+(Math.random()<n%1?1:0);
    for(var j=0;j<cnt;j++){var sx=(Math.random()-0.5)*0.5,f=(l.wrench?0.5:1.5)*L.pow*(0.7+Math.random()*0.6);drop(L.x-l.nz*sx*0.2+l.nx*0.02,L.y+(Math.random()-0.5)*0.04,L.z+l.nx*sx*0.2+l.nz*0.02,l.nx*f-l.nz*sx,0.4*Math.random()*L.pow,l.nz*f+l.nx*sx,0.55)}
    L.tick=(L.tick||0)-dt;if(L.tick<=0){L.tick=0.16/Math.max(0.2,L.pow);var lx=l.x+(Math.random()-0.5)*0.4,lz=l.z+(Math.random()-0.5)*0.4,li=world.cell(lx,lz);if(li>=0)ring(lx,S.g[li]+S.bar[li]+S.d[li],lz,(l.wrench?0.35:0.7)*L.pow,0.6)}}
  for(k=0;k<dynEnds.length;k++){var G=dynEnds[k];if(!(G.p.run&&G.p.flow>0.004))continue;for(j=0;j<3;j++)drop(G.x,G.y,G.z,G.dx*(1.1+Math.random()*0.5)+(Math.random()-0.5)*0.4,0.7+Math.random()*0.5,G.dz*(1.1+Math.random()*0.5)+(Math.random()-0.5)*0.4,0.5);
    G.tick=(G.tick||0)-dt;if(G.tick<=0){G.tick=0.14;var hi=world.cell(G.x+G.dx*0.5,G.z+G.dz*0.5);if(hi>=0)ring(G.x+G.dx*0.5,S.g[hi]+S.bar[hi]+S.d[hi],G.z+G.dz*0.5,0.8,0.6)}}
}
function updateThings(dt,time){
  var S=world.S,k;
  for(k=0;k<lv.drains.length;k++){var o=lv.drains[k],d=o.d,dep=S.d[d.i];o.sw.position.y=o.gy+Math.max(0.03,dep*0.45+0.004);o.sw.rotation.z-=dt*(2.5+d.flow*45);o.sw.material.opacity=clamp(d.flow*11,0,0.9)*(dep>0.015?1:0);var ss=0.6+Math.min(1,d.flow*5)*0.6;o.sw.scale.set(ss,ss,1)}
  for(k=0;k<lv.valves.length;k++){lv.valves[k].wh.rotation.z=lv.valves[k].v.turn*Math.PI*3}
  var deb=world.debris;for(k=0;k<deb.length;k++){var p=deb[k],i=world.cell(p.x,p.z);if(i<0)continue;var ty=S.g[i]+S.bar[i]+(p.fl?S.d[i]:0)+(p.k===2?0.035:0.014);p.dy+=(ty-p.dy)*Math.min(1,dt*10);if(p.hop>0)p.hop=Math.max(0,p.hop-dt*2.4);
    var hp=p.hop>0?Math.sin(p.hop*Math.PI)*0.35:0;dummy.position.set(p.x,p.dy+hp,p.z);dummy.rotation.set((p.fl?Math.sin(time*1.7+k)*0.14:0)+hp*4,p.a,(p.fl?Math.cos(time*1.3+k)*0.14:0)+hp*3);dummy.scale.setScalar(p.sz*(p.k===0?1.25:1));dummy.updateMatrix();p._m.setMatrixAt(p._j,dummy.matrix)}
  for(k=0;k<lv.deb.length;k++)lv.deb[k].instanceMatrix.needsUpdate=true;
  if(dynDirty)rebuildDyn();
}

// ---------------------------------------------------------------- the player
var pl={x:0,y:0,z:0,vy:0,yaw:0,pitch:0,ground:true,crouch:0,bob:0,step:0,speed:0,dep:0,kick:0,walked:0};
var inp={mx:0,mz:0,jump:false,sprint:false,crouch:false,act:false,tap:false}; // tap: E or Do was pressed since the last frame, however briefly
var keys={};
var EYE=1.62,RAD=0.3;
function blocked(x,z,feet){var w=world,S=w.S;for(var a=-1;a<=1;a+=2)for(var b=-1;b<=1;b+=2){var i=w.cell(x+a*RAD,z+b*RAD);if(i<0)return true;if(S.solid[i]&&w.sh[i]>feet+0.45)return true}return false}
function floorAt(x,z,feet){var w=world,S=w.S,gy=w.groundAt(x,z),ci=w.cell(x,z);if(ci>=0&&S.bar[ci]>0)gy+=S.bar[ci];
  for(var a=-1;a<=1;a+=2)for(var b=-1;b<=1;b+=2){var i=w.cell(x+a*RAD,z+b*RAD);if(i<0)continue;var t=S.solid[i]?w.sh[i]:S.bar[i]>0?S.g[i]+S.bar[i]:-99;if(t<=feet+0.45&&t>gy)gy=t}return gy}
function movePlayer(dt){
  var f=inp.mz,s=inp.mx,l=Math.hypot(f,s);if(l>1){f/=l;s/=l;l=1}
  var dep=Math.max(0,world.depthAt(pl.x,pl.z)-Math.max(0,pl.y-floorAt(pl.x,pl.z,pl.y)));
  var slow=1-Math.min(0.55,dep*(save.gear.waders?0.4:0.85));
  var crouching=inp.crouch;pl.crouch+=((crouching?1:0)-pl.crouch)*Math.min(1,dt*12);
  var sp=(crouching?1.9:inp.sprint&&f>0.2?5.7:3.7)*slow;
  var sy=Math.sin(pl.yaw),cy=Math.cos(pl.yaw),vx=(-sy*f+cy*s)*sp,vz=(-cy*f-sy*s)*sp,ox=pl.x,oz=pl.z;
  var nx=pl.x+vx*dt;if(!blocked(nx,pl.z,pl.y))pl.x=nx;
  var nz=pl.z+vz*dt;if(!blocked(pl.x,nz,pl.y))pl.z=nz;
  pl.walked+=Math.hypot(pl.x-ox,pl.z-oz);
  var gy=floorAt(pl.x,pl.z,pl.y);
  if(pl.ground){if(inp.jump&&!crouching){pl.vy=4.7*(dep>0.35?0.75:1);pl.ground=false;if(dep>0.05){sfx('splash',0.5);splash(pl.x,pl.y+dep,pl.z,8,0.9)}}else if(pl.y-gy>0.32){pl.ground=false}else pl.y+=(gy-pl.y)*Math.min(1,dt*18)}
  if(!pl.ground){pl.vy-=15*dt;pl.y+=pl.vy*dt;if(pl.y<=gy){pl.y=gy;pl.ground=true;if(pl.vy<-3){var wet=dep>0.04;sfx(wet?'splash':'thud',Math.min(1,-pl.vy/8));if(wet){splash(pl.x,pl.y+dep,pl.z,14,1.2);ring(pl.x,pl.y+dep,pl.z,1.6,1)}}pl.vy=0}}
  inp.jump=false;
  var moving=l>0.1&&pl.ground;pl.speed=moving?sp*l:0;
  if(moving){pl.bob+=dt*sp*l*1.9;pl.step+=dt*sp*l;if(pl.step>1.5){pl.step=0;var w2=dep>0.03;sfx(w2?'wade':'step',w2?0.35+Math.min(0.5,dep):0.35);if(w2){ring(pl.x-sy*0.3,pl.y+dep,pl.z-cy*0.3,0.9+dep*2,0.9);splash(pl.x-sy*0.3,pl.y+dep,pl.z-cy*0.3,3+Math.round(dep*14),0.55+dep)}}}
  pl.dep=dep;if(pl.kick>0)pl.kick=Math.max(0,pl.kick-dt*5);
}
// Wading: the legs shove the flood (a bow wave and a wake in the simulation itself), and stir ripples round the shins.
var wadeT=0;
function wade(dt,vx,vz){if(!world||pl.dep<0.04||!pl.ground)return;var sp=Math.hypot(vx,vz),S=world.S;
  if(sp>0.2){S.push(pl.x/CS,pl.z/CS,vx,vz,1.7,4.5,dt);wadeT-=dt;if(wadeT<=0){wadeT=0.04;var nx=vx/sp,nz=vz/sp,a=Math.min(0.012,0.006+pl.dep*0.012)*Math.min(1,sp/2.2);
    rip(pl.x+nx*0.12-nz*0.14,pl.z+nz*0.12+nx*0.14,0.06,a);rip(pl.x+nx*0.12+nz*0.14,pl.z+nz*0.12-nx*0.14,0.06,a)}}}
function placeCamera(){camera.position.set(pl.x,pl.y+EYE-pl.crouch*0.55+(pl.speed>0?Math.sin(pl.bob)*0.035:0),pl.z);camera.rotation.set(pl.pitch+pl.kick*0.02,pl.yaw,0)}
// where the player is pointing on the ground or the water, within reach
var aim={x:0,y:0,z:0,i:-1,ok:false,dx:0,dz:0};
function updateAim(reach){
  var cp=Math.cos(pl.pitch),dx=-Math.sin(pl.yaw)*cp,dy=Math.sin(pl.pitch),dz=-Math.cos(pl.yaw)*cp,ox=pl.x,oy=pl.y+EYE-pl.crouch*0.55,oz=pl.z,S=world.S;
  aim.dx=-Math.sin(pl.yaw);aim.dz=-Math.cos(pl.yaw);aim.ok=false;
  for(var t=0.3;t<=reach;t+=0.1){var x=ox+dx*t,y=oy+dy*t,z=oz+dz*t,i=world.cell(x,z);if(i<0)break;
    if(S.solid[i]&&y<world.sh[i])break;var top=world.groundAt(x,z)+S.bar[i]+S.d[i];if(y<=top){aim.x=x;aim.y=top;aim.z=z;aim.i=i;aim.ok=true;return}}
  if(dy<0.25){var r=Math.min(reach,1.8),hx=ox+aim.dx*r,hz=oz+aim.dz*r,hi=world.cell(hx,hz);if(hi>=0&&!S.solid[hi]){aim.x=hx;aim.z=hz;aim.y=world.groundAt(hx,hz)+S.d[hi];aim.i=hi;aim.ok=true}}
}
// the nearest fitting the player is looking at
var focus=null,hold=0;
function stationOn(kind){return kind==='board'||(kind==='shop'&&shopOpen())||(kind==='van'&&vanNeeded())}
function findFocus(){
  var best=null,bs=0.88,cp=Math.cos(pl.pitch),dx=-Math.sin(pl.yaw)*cp,dy=Math.sin(pl.pitch),dz=-Math.cos(pl.yaw)*cp,c=camera.position;
  function tryIt(kind,o,x,y,z,reach,wide){var ex=x-c.x,ey=y-c.y,ez=z-c.z,q=Math.sqrt(ex*ex+ey*ey+ez*ez);if(q>reach)return;var dot=(ex*dx+ey*dy+ez*dz)/q+(wide||0)+(q<1.4?0.4:0);if(dot>bs){bs=dot;best={kind:kind,o:o}}} // right up close, roughly facing it is enough
  world.valves.forEach(function(v){tryIt('valve',v,v.x+v.nx*0.15,world.groundAt(v.x,v.z)+v.y,v.z+v.nz*0.15,2.6,0.03)});
  world.leaks.forEach(function(l){if(l.wrench&&!l.fixed)tryIt('leak',l,l.px,world.groundAt(l.x,l.z)+l.y,l.pz,2.4)});
  world.pumps.forEach(function(p){tryIt('pump',p,p.x,world.S.g[p.i]+0.3,p.z,2.6,0.03)});
  world.stations.forEach(function(s){if(stationOn(s.kind))tryIt('station',s,s.x,world.groundAt(s.x,s.z)+s.y,s.z,4.2,0.1)});
  return best;
}

// ---------------------------------------------------------------- tools
var TOOLS={
  rake:{alt:0,tip:'Click to rake',ttip:'Use: rake',icon:'<path d="M12 3v11M12 14l-6 6M12 14l-3 6M12 14v6M12 14l3 6M12 14l6 6"/>'},
  bucket:{alt:0,tip:'Click: fill it, or tip it out',ttip:'Use: fill, or tip out',icon:'<path d="M5 8h14l-2 12H7zM5 8c0-6 14-6 14 0"/>'},
  wrench:{alt:0,tip:'Hold click on a dripping joint',ttip:'Hold Use on a dripping joint',icon:'<path d="M14 4a5 5 0 0 0-4 7l-6 6 3 3 6-6a5 5 0 0 0 7-4l-3 2-3-3z"/>'},
  squeegee:{alt:0,tip:'Click: push thin water forward',ttip:'Use: push thin water forward',icon:'<path d="M12 3v11M5 14h14v4H5z"/>'},
  shovel:{alt:1,tip:'Click: dig · Right click: put soil back',ttip:'Use: dig · Alt: put soil back',icon:'<path d="M12 3v10M8 13h8v3a4 4 0 0 1-8 0zM9 3h6"/>'},
  sack:{alt:0,tip:'Click: bag the debris in front of you',ttip:'Use: bag debris',icon:'<path d="M8 6h8l-1 3c4 3 4 11-3 11s-7-8-3-11z"/>'},
  sandbags:{alt:1,tip:'Click: lay a row · R: turn · Right click: pick up',ttip:'Use: lay a row · Alt: pick up',icon:'<path d="M3 17h8v4H3zM13 17h8v4h-8zM8 12h8v4H8z"/>'},
  pump:{alt:1,tip:'Click: put it down, then click where the hose empties · Right click: pick up',ttip:'Use: place, then point the hose · Alt: pick up',icon:'<path d="M4 14h10v6H4zM14 16h3c3 0 3-9 0-9h-2M8 14v-3h3"/>'},
  generator:{alt:1,tip:'Click: put it down somewhere dry · Right click: pick up',ttip:'Use: put down · Alt: pick up',icon:'<path d="M4 9h16v10H4zM7 9V6h10v3M13 11l-3 4h4l-3 4"/>'}
};
var bar=[],cur=0,bucketVol=0,BUCKET=0.03,swing=0,swingKind=0,useHeld=false,altHeld=false,cool=0,rot=0,inv={},hosePump=null;
function tool(){return bar[cur]}
function buildBar(){var h=$('hot');h.innerHTML='';h.classList.toggle('one',bar.length<2);bar.forEach(function(id,k){var t=TOOLS[id],b=document.createElement('button');b.setAttribute('data-no-ad-refresh','');b.setAttribute('aria-label',T(GEARBY[id].name));
    b.innerHTML='<em>'+(k+1)+'</em><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+t.icon+'</svg><span>'+T(GEARBY[id].name)+'</span><u></u>';
    b.addEventListener('click',function(e){e.preventDefault();selectTool(k,true);canvas.focus()});h.appendChild(b)});if(bar.length)selectTool(Math.min(cur,bar.length-1))}
function selectTool(k,say){if(k<0||k>=bar.length)return;cur=k;hosePump=null;var bs=$('hot').children;for(var i=0;i<bs.length;i++)bs[i].setAttribute('aria-pressed',i===k?'true':'false');
  hands.show(bar[k]);$('tRot').hidden=bar[k]!=='sandbags';$('tAlt').hidden=!TOOLS[bar[k]].alt;sfx('tick',0.4);if(say&&tutK<0)toast(T(GEARBY[bar[k]].name)+': '+T(touchUI?TOOLS[bar[k]].ttip:TOOLS[bar[k]].tip),2.8)}
var hands=EWLook.hands(camera);
// the outline that shows where something will go
var ghost=new THREE.Group();scene.add(ghost);var ghostM=new THREE.MeshBasicMaterial({color:0x8fd66a,transparent:true,opacity:0.5,depthWrite:false}),ghostC=[];
(function(){for(var k=0;k<3;k++){var m=new THREE.Mesh(new THREE.BoxGeometry(0.48,0.04,0.48),ghostM);m.visible=false;ghost.add(m);ghostC.push(m)}})();
var ghostGeo=new THREE.BufferGeometry();ghostGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0,0],3));
var ghostLine=new THREE.Line(ghostGeo,new THREE.LineBasicMaterial({color:0x8fd66a}));ghostLine.frustumCulled=false;ghostLine.visible=false;ghost.add(ghostLine);
function near(list,r){var best=null,bd=r;list.forEach(function(o){var q=Math.hypot(o.x-aim.x,o.z-aim.z);if(q<bd){bd=q;best=o}});return best}
function updateGhost(){
  var id=tool(),k,S=world.S;for(k=0;k<3;k++)ghostC[k].visible=false;ghostLine.visible=false;
  if(state!=='play'||!id)return;
  var place=id==='shovel'||id==='sandbags'||id==='pump'||id==='generator';if(!place)return;updateAim(3.4);if(!aim.ok)return;
  var ok=true,cells=[aim.i];
  if(id==='shovel'){ok=world.canDig(aim.x,aim.z)||world.canPile(aim.x,aim.z);if(Math.hypot(aim.x-pl.x,aim.z-pl.z)>2.7)return}
  else if(id==='sandbags'){cells=world.barrierCells(aim.x,aim.z,rot);ok=!!cells&&inv.sandbags>0;if(!cells)cells=[aim.i]}
  else if(id==='pump'){if(hosePump){var p=hosePump,far=Math.hypot(aim.x-p.x,aim.z-p.z)>world.hoseLen;ok=!far&&!S.solid[aim.i];var a=ghostGeo.attributes.position.array;a[0]=p.x;a[1]=S.g[p.i]+0.3;a[2]=p.z;a[3]=aim.x;a[4]=aim.y+0.1;a[5]=aim.z;ghostGeo.attributes.position.needsUpdate=true;ghostLine.visible=true;ghostLine.material.color.setHex(ok?0x8fd66a:0xff6257)}else ok=inv.pump>0||!!near(world.pumps,1.0)}
  else if(id==='generator')ok=inv.generator>0||!!near(world.gens,1.0);
  ghostM.color.setHex(ok?0x8fd66a:0xff6257);
  for(k=0;k<cells.length;k++){var i=cells[k];ghostC[k].visible=true;ghostC[k].position.set(world.cx(i),S.g[i]+S.bar[i]+S.d[i]+0.03,world.cz(i))}
}
function pumpWhy(p){return p.why==='off'?T('Switched off.'):p.why==='power'?T('No power. It needs a socket or a generator within {n} m.',{n:world.cableLen}):p.why==='wetgen'?T('Its generator is under water.'):p.why==='hose'?T('No hose laid yet.'):p.why==='dry'?T('Running, but there is nothing here to pump.'):p.away?T('Pumping {n} litres a second away.',{n:Math.round(p.flow*1000)}):T('Pumping, but the water is running straight back.')}
// every stroke lands somewhere: this is what you see and hear where it does
function hitFx(x,z,power,dirt){var i=world.cell(x,z);if(i<0)return;var S=world.S,dd=S.d[i],y=S.g[i]+S.bar[i]+dd;if(dd>0.02){splash(x,y,z,Math.round(6*power),0.9*power);ring(x,y,z,1.1*power,0.8);sfx('splash',0.35*power)}else if(dirt)splash(x,y,z,Math.round(7*power),0.8*power,true)}
function useTool(alt){
  var id=tool();if(cool>0||!id||state!=='play')return;updateAim(id==='pump'||id==='generator'||id==='sandbags'?3.4:2.6);
  if(alt&&!TOOLS[id].alt)alt=false;
  if(id==='rake'){swing=0.42;swingKind=1;cool=0.42;var px=pl.x,pz=pl.z,dx=aim.dx,dz=aim.dz;setTimeout(function(){if(!world||state!=='play')return;var before=world.debris.map(function(p){return p.kick});var n=world.rake(px,pz,dx,dz,false);
      world.debris.forEach(function(p,k){if(p.kick>before[k]+0.1)p.hop=1});sfx(n?'rake':'swish',n?0.9:0.4);pl.kick=n?1:0.5;hitFx(px+dx*1.5,pz+dz*1.5,n?1.1:0.7)},130)}
  else if(id==='bucket'){cool=0.5;swing=0.42;swingKind=1;
    if(bucketVol>0.001&&(alt||bucketVol>=BUCKET*0.5||!aim.ok||world.S.d[aim.i]<0.012)){if(!aim.ok){cool=0;return}var v=world.pour(aim.x,aim.z,bucketVol);if(v>0){bucketVol=0;sfx('pour',0.9);splash(aim.x,aim.y+0.5,aim.z,16,0.8);ring(aim.x,aim.y,aim.z,1.4,0.9)}}
    else if(aim.ok){var got=world.scoop(aim.x,aim.z,BUCKET-bucketVol);if(got>0.0005){bucketVol+=got;sfx('scoop',0.8);ring(aim.x,aim.y,aim.z,1.2,0.8);splash(aim.x,aim.y,aim.z,6,0.7)}else toast(T('No water to scoop here.'),1.4)}}
  else if(id==='squeegee'){cool=0.4;swing=0.42;swingKind=1;var mv=world.squeegee(pl.x,pl.z,aim.dx,aim.dz);sfx(mv>0.0004?'squee':'swish',0.6);if(mv>0.0004){splash(pl.x+aim.dx*1.6,world.groundAt(pl.x+aim.dx*1.6,pl.z+aim.dz*1.6)+0.02,pl.z+aim.dz*1.6,7,0.6);pl.kick=0.5}}
  else if(id==='shovel'){if(!aim.ok||Math.hypot(aim.x-pl.x,aim.z-pl.z)>2.7)return;cool=0.34;swing=0.42;swingKind=1;
    if(alt){if(world.pile(aim.x,aim.z)){sfx('dig',0.7);hitFx(aim.x,aim.z,0.8,true)}else toast(world.spoil>0?T('You cannot pile soil there.'):T('No soil to put back yet. Dig first.'),1.6)}
    else if(world.dig(aim.x,aim.z)){sfx('dig',0.9);hitFx(aim.x,aim.z,1,true);pl.kick=1}else{var ci=aim.i;toast(!world.soft[ci]?T('Too hard to dig. Try soil or grass.'):T('That is as deep as this trench will go.'),1.6);sfx('thud',0.4)}}
  else if(id==='sack'){cool=0.45;swing=0.42;swingKind=2;if(!aim.ok)return;if(inv.sack<=0){toast(T('The sack is full.'),1.6);return}var got2=world.takeDebris(aim.x,aim.z,1.1,Math.min(6,inv.sack));got2.forEach(function(p){dummy.position.set(0,-50,0);dummy.scale.setScalar(0.001);dummy.updateMatrix();p._m.setMatrixAt(p._j,dummy.matrix)});inv.sack-=got2.length;sfx(got2.length?'rake':'swish',0.6);if(got2.length)hitFx(aim.x,aim.z,0.7)}
  else if(id==='sandbags'){cool=0.3;if(!aim.ok)return;
    if(alt){var bb=null,bd=1.3;world.barriers.forEach(function(b){var q=Math.hypot(b.x-aim.x,b.z-aim.z);if(q<bd){bd=q;bb=b}});if(bb){world.removeBarrier(bb);inv.sandbags++;dynDirty=true;sfx('thud',0.6)}}
    else if(inv.sandbags<=0)toast(T('No sandbags left. Pick a row up to move it.'),2);
    else if(world.placeBarrier(aim.x,aim.z,rot)){inv.sandbags--;dynDirty=true;sfx('thud',0.9);swing=0.3;swingKind=1;hitFx(aim.x,aim.z,1.2);pl.kick=1}else toast(T('The bags will not sit there.'),1.5)}
  else if(id==='pump'){cool=0.3;if(!aim.ok)return;
    if(alt){if(hosePump){hosePump=null;return}var pp=near(world.pumps,1.3);if(pp){world.removePump(pp);inv.pump++;dynDirty=true;sfx('thud',0.6)}}
    else if(hosePump){if(world.setHose(hosePump,aim.x,aim.z)){hosePump=null;dynDirty=true;sfx('thud',0.5);toast(T('Hose laid.'),1.6)}else toast(T('The hose will not reach that far ({n} m).',{n:world.hoseLen}),2)}
    else{var ex=near(world.pumps,1.0);if(ex){hosePump=ex;toast(T('Point where the hose should empty, and use the pump again.'),3)}
      else if(inv.pump<=0)toast(T('The pump is already out. Pick it up to move it.'),2.2);
      else{var np=world.placePump(aim.x,aim.z);if(np){inv.pump--;hosePump=np;dynDirty=true;sfx('thud',0.9);hitFx(aim.x,aim.z,1.2);toast(np.src?T('Pump down and plugged in. Now point where the hose should empty, and use the pump again.'):T('Pump down, but there is no power within {n} m. Now point where the hose should empty, and use the pump again.',{n:world.cableLen}),4.5)}}}}
  else if(id==='generator'){cool=0.3;if(!aim.ok)return;
    if(alt){var gg=near(world.gens,1.3);if(gg){world.removeGen(gg);inv.generator++;dynDirty=true;sfx('thud',0.6)}}
    else if(inv.generator<=0)toast(T('The generator is already out. Pick it up to move it.'),2.2);
    else if(world.S.d[aim.i]>0.1)toast(T('Too wet. It would drown here.'),1.8);
    else if(world.placeGen(aim.x,aim.z)){inv.generator--;dynDirty=true;sfx('thud',0.9)}}
}
var sway={x:0,y:0,lx:0,ly:0};
function animView(dt){
  var id=tool(),m=hands.mods[id];if(!m)return;var t=swing>0?1-swing/0.42:0,s=swing>0?Math.sin(t*Math.PI):0,mv=pl.speed>0?1:0;
  // the hands lag a little behind where you look, and bob as you walk
  var dyaw=pl.yaw-sway.lx,dpit=pl.pitch-sway.ly;sway.lx=pl.yaw;sway.ly=pl.pitch;sway.x+=(clamp(dyaw*1.2,-0.06,0.06)-sway.x)*Math.min(1,dt*9);sway.y+=(clamp(dpit*1.2,-0.05,0.05)-sway.y)*Math.min(1,dt*9);
  m.position.set(sway.x+Math.sin(pl.bob)*0.012*mv,-sway.y+Math.abs(Math.cos(pl.bob))*0.014*mv-0.01,0);m.rotation.set(0,0,0);
  if(id==='rake'||id==='squeegee'){m.rotation.x=-s*0.20;m.position.z=-s*0.26+(swingKind===2?s*0.4:0);m.position.y+=-s*0.06;m.rotation.y=s*0.10}
  else if(id==='shovel'){m.rotation.x=-s*0.28;m.position.y+=-s*0.16;m.position.z=-s*0.14}
  else if(id==='bucket'){m.rotation.x=-s*0.5;m.position.y+=s*0.12;hands.bucketWater(bucketVol/BUCKET)}
  else if(id==='wrench'){m.rotation.z=(hold>0&&focus&&focus.kind==='leak'?Math.sin(performance.now()*0.012)*0.35:0)}
  else m.position.y+=-s*0.1;
  if(swing>0)swing=Math.max(0,swing-dt);if(cool>0)cool-=dt;
}

// ---------------------------------------------------------------- sound, all made here in code
var AC=null,master=null,noiseBuf=null,amb={},lastGulp=0;
function audioInit(){if(AC)return;var C=window.AudioContext||window.webkitAudioContext;if(!C)return;try{AC=new C()}catch(e){return}
  master=AC.createGain();master.gain.value=save.set.vol;master.connect(AC.destination);
  noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);var d=noiseBuf.getChannelData(0),b=0;for(var i=0;i<d.length;i++){var w=Math.random()*2-1;b=(b+0.02*w)/1.02;d[i]=w*0.5+b*3}
  function loop(type,f,q){var s=AC.createBufferSource();s.buffer=noiseBuf;s.loop=true;var fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;var g=AC.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(master);s.start();return{g:g,f:fl}}
  amb.air=loop('lowpass',420,0.3);amb.lap=loop('bandpass',620,0.8);amb.flow=loop('bandpass',1500,0.9);amb.leak=loop('highpass',2600,0.5);
  var o=AC.createOscillator();o.type='sawtooth';o.frequency.value=58;var of=AC.createBiquadFilter();of.type='lowpass';of.frequency.value=260;var og=AC.createGain();og.gain.value=0;o.connect(of);of.connect(og);og.connect(master);o.start();
  var lfo=AC.createOscillator();lfo.frequency.value=23;var lg=AC.createGain();lg.gain.value=9;lfo.connect(lg);lg.connect(o.frequency);lfo.start();amb.pump={g:og}}
function nz(dur,type,f0,f1,vol,q){var s=AC.createBufferSource();s.buffer=noiseBuf;var fl=AC.createBiquadFilter();fl.type=type;fl.Q.value=q||1;var t=AC.currentTime;fl.frequency.setValueAtTime(f0,t);fl.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);
  var g=AC.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(master);s.start(t,Math.random()*1.2);s.stop(t+dur+0.05)}
function tone(dur,type,f0,f1,vol,delay){var o=AC.createOscillator();o.type=type;var t=AC.currentTime+(delay||0);o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  var g=AC.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+0.015);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.05)}
function sfx(n,v){if(!AC||AC.state!=='running')return;v=v==null?1:v;
  if(n==='splash'){nz(0.5,'lowpass',2600,300,0.5*v);nz(0.22,'bandpass',900,2400,0.25*v,2)}
  else if(n==='wade'){nz(0.3,'lowpass',1500+Math.random()*600,350,0.26*v)}
  else if(n==='step'){nz(0.09,'lowpass',500,120,0.2*v)}
  else if(n==='thud'){tone(0.14,'sine',120,45,0.5*v);nz(0.08,'lowpass',700,150,0.2*v)}
  else if(n==='rake'){nz(0.3,'bandpass',2800,1500,0.3*v,3);nz(0.2,'highpass',5200,3800,0.08*v);nz(0.16,'lowpass',900,300,0.12*v)}
  else if(n==='swish'){nz(0.2,'bandpass',900,2200,0.12*v,1.5)}
  else if(n==='dig'){tone(0.1,'sine',95,50,0.45*v);nz(0.26,'bandpass',1200,500,0.34*v,1.2)}
  else if(n==='squee'){nz(0.34,'lowpass',1800,600,0.3*v);tone(0.2,'sine',880,1150,0.03*v)}
  else if(n==='scoop'){nz(0.36,'lowpass',700,2600,0.36*v)}
  else if(n==='pour'){nz(0.75,'lowpass',2600,500,0.42*v);nz(0.4,'bandpass',1400,700,0.16*v,2)}
  else if(n==='gulp'){tone(0.22,'sine',170+Math.random()*60,58,0.4*v);tone(0.16,'sine',240,90,0.2*v,0.11);nz(0.2,'bandpass',420,160,0.18*v,3)}
  else if(n==='unblock'){tone(0.5,'sine',150,42,0.6*v);tone(0.3,'sine',260,70,0.3*v,0.12);tone(0.26,'sine',210,60,0.28*v,0.34);nz(0.9,'bandpass',520,150,0.34*v,2.5);nz(1.2,'lowpass',1800,400,0.2*v)}
  else if(n==='valve'){tone(0.3,'triangle',520,760,0.07*v);tone(0.24,'triangle',660,480,0.06*v,0.22);nz(0.3,'bandpass',2100,1500,0.07*v,6)}
  else if(n==='shut'){tone(0.12,'sine',140,60,0.5*v);nz(0.5,'highpass',3000,5000,0.1*v);tone(0.08,'square',300,180,0.05*v,0.1)}
  else if(n==='tick'){tone(0.05,'square',880,660,0.035*v)}
  else if(n==='scan'){tone(0.5,'sine',740,1480,0.11*v);tone(0.6,'sine',1110,2220,0.05*v,0.1)}
  else if(n==='buy'){tone(0.12,'triangle',660,660,0.14*v);tone(0.2,'triangle',990,990,0.14*v,0.1)}
  else if(n==='good'){tone(0.18,'triangle',660,660,0.1*v);tone(0.3,'triangle',880,880,0.1*v,0.12)}
  else if(n==='done'){[523,659,784,1047].forEach(function(f,k){tone(0.5,'triangle',f,f,0.16*v,k*0.13)})}
}
function audioTick(){if(!AC)return;var on=state==='play'&&world,now=AC.currentTime,tc=0.25;
  function set(n,val){amb[n].g.gain.setTargetAtTime(val,now,tc)}
  if(!on){set('air',0);set('lap',0);set('flow',0);set('leak',0);set('pump',0);return}
  var fr=clamp(world.left/Math.max(1,world.start||1),0,1.2),cellar=def.sky==='cellar';
  set('air',cellar?0.02:0.05);set('lap',0.012+0.075*Math.sqrt(fr)+Math.min(0.08,pl.speed*pl.dep*0.12));
  var fl=0,k,q;for(k=0;k<world.drains.length;k++){var d=world.drains[k];q=Math.hypot(d.x-pl.x,d.z-pl.z);fl+=Math.min(1,d.flow*8)/(1+q*q*0.05);
    if(d.flow>0.01&&q<14&&world.t-lastGulp>(world.S.d[d.i]<0.07?0.8:2.2)+Math.random()*1.6){lastGulp=world.t;sfx('gulp',(world.S.d[d.i]<0.07?0.9:0.5)/(1+q*0.12))}}
  for(k=0;k<world.pumps.length;k++){var p=world.pumps[k];if(p.run&&p.hose){q=Math.hypot(p.hose.x-pl.x,p.hose.z-pl.z);fl+=Math.min(1,p.flow*6)/(1+q*q*0.05)}}
  set('flow',Math.min(0.22,fl*0.18));
  var lk=0;for(k=0;k<lv.leaks.length;k++){var L=lv.leaks[k],l=L.l;if(L.pow>0.03){q=Math.hypot(l.x-pl.x,l.z-pl.z);lk+=(l.wrench?0.35:1)*L.pow/(1+q*q*0.05)}}set('leak',Math.min(0.13,lk*0.12));
  var pm=0;for(k=0;k<world.pumps.length;k++){var pu=world.pumps[k];if(pu.run){q=Math.hypot(pu.x-pl.x,pu.z-pl.z);pm+=1/(1+q*q*0.04)}}
  for(k=0;k<world.gens.length;k++){var gn=world.gens[k];if(!gn.dead){q=Math.hypot(gn.x-pl.x,gn.z-pl.z);pm+=0.8/(1+q*q*0.04)}}set('pump',Math.min(0.1,pm*0.08));
}
['pointerdown','keydown','touchstart'].forEach(function(ev){addEventListener(ev,function(){audioInit();if(AC&&AC.state==='suspended')AC.resume()},{passive:true})});

// ---------------------------------------------------------------- HUD: one line of words at a time
var toastT=0,toastTx='';
function toast(msg,secs){toastTx=msg;toastT=secs||3}
function fmtTime(s){s=Math.floor(s);return Math.floor(s/60)+':'+(s%60<10?'0':'')+s%60}
var seen={},notes=[];
var scanT=0,scanCool=0;
function scan(){if(state!=='play'||scanCool>0||def.depot||firstJob())return;scanT=4.5;scanCool=9;$('scanfx').classList.add('on');sfx('scan',0.7);
  toast(world.left>0.004?T('{v} litres still lying here.',{v:Math.round(world.left*1000)}):T('No standing water found.'),3.5)}
function tasks(){
  var out=[],w=world;
  w.drains.forEach(function(d,k){var found=seen['d'+k];if(!found)out.push({t:T('Find where this water should be draining to'),s:T('Low points are a good place to look.'),done:false});
    else out.push({t:d.kind==='culvert'?T('Keep the culvert clear'):T('Keep the drain clear'),s:d.clear>=0.9?T('Running freely.'):T('{p}% blocked. Rake the debris well away, or it will wash back.',{p:Math.round((1-d.clear)*100)}),done:d.clear>=0.9})});
  w.leaks.forEach(function(l,k){var found=seen['l'+k];if(!found&&l.on)out.push({t:T('Find out if water is still getting in'),s:T('Listen, and look along the walls.'),done:false});
    else out.push({t:T('Stop the leak'),s:l.on?(l.valve?T('Follow its pipe back to a tap.'):T('A dripping joint. Tighten it with the wrench.')):T('Stopped.'),done:!l.on})});
  if(w.holdList.length){var blk=w.holdIn<=0.004&&w.barriers.length>0;out.push({t:T('Stop the water getting in from outside'),s:blk?T('Held back.'):T('Something has to stand in its way.'),done:blk})}
  w.pumps.forEach(function(p){out.push({t:T('Pump'),s:pumpWhy(p),done:p.run&&p.away&&p.why===''})});
  var pc=Math.round(w.fraction()*100);out.push({t:T('Get the water down to the green mark'),s:T('{p}% left. Small puddles are fine.',{p:pc}),done:w.fraction()<=EW.World.DONE});
  return out;
}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function openJournal(){$('jTitle').textContent=def.name;$('jBrief').textContent=T(def.brief);
  var h=tasks().map(function(t){return'<li class="'+(t.done?'done':'')+'"><div>'+esc(t.t)+'<small>'+esc(t.s)+'</small></div></li>'}).join('');
  if(notes.length)h+='<li class="note"><div>'+esc(T('What you have noticed'))+notes.map(function(n){return'<small>• '+esc(n)+'</small>'}).join('')+'</div></li>';
  $('jTasks').innerHTML=h;show('journal')}
// The first job teaches by doing: one short line at a time, gone as soon as it is done.
var TUT=[
  {t:'Move with W A S D. Look with the mouse.',tt:'Left thumb walks. Drag to look.',ok:function(){return pl.walked>2.5}},
  {t:'Find the drain under the leaves',ok:function(){return seen.d0}},
  {t:'Click to rake the leaves off the drain',tt:'Tap Use to rake the leaves off the drain',ok:function(){return world.drains[0].clear>0.85}},
  {t:function(){var v=world.valves[0],nearTap=Math.hypot(v.x-pl.x,v.z-pl.z)<3.4;return nearTap?(touchUI?'Hold Do to shut the tap':'Hold E to shut the tap'):'Water is still pouring in. Follow the copper pipe to its tap'},ok:function(){return !world.incoming()}},
  {t:'Keep the drain clear until the yard is dry',ok:function(){return world.isDone()}}
],tutK=-1,depotSay='';
var wasClear=[];
function updateHud(dt){
  var fr=world.fraction(),k;
  if(!def.depot){$('gaugeFill').style.width=clamp(fr*100,0,100).toFixed(1)+'%';$('pct').textContent=Math.round(fr*100)+'%';$('inflow').hidden=!(world.incoming()&&(tutK<0||tutK>=3))}
  if(scanT>0){scanT-=dt;if(scanT<=0)$('scanfx').classList.remove('on')}if(scanCool>0)scanCool-=dt;
  U.uScan.value+=((scanT>0?1:0)-U.uScan.value)*Math.min(1,dt*5);
  var u=$('hot').children;for(k=0;k<bar.length;k++){var id=bar[k],tx='';if(id==='bucket')tx=bucketVol>0.001?Math.round(bucketVol*1000)+'L':'';else if(inv[id]!=null)tx=String(inv[id]);if(u[k].lastChild.textContent!==tx)u[k].lastChild.textContent=tx}
  // things noticed
  world.drains.forEach(function(d,k){if(!seen['d'+k]&&Math.hypot(d.x-pl.x,d.z-pl.z)<3.4){seen['d'+k]=1;if(!def.depot&&tutK<0)toast(d.clear<0.5?T('A drain, buried in debris.'):T('A drain.'),3)}
    // the moment a blocked drain lets go
    if(wasClear[k]===false&&d.clear>=0.55&&world.S.d[d.i]>0.04){wasClear[k]=true;sfx('unblock',1/(1+Math.hypot(d.x-pl.x,d.z-pl.z)*0.08));var y=world.S.g[d.i]+world.S.d[d.i];ring(d.x,y,d.z,2.6,1.3);ring(d.x,y,d.z,1.4,0.9);splash(d.x,y,d.z,18,1.1)}else if(d.clear<0.3)wasClear[k]=false});
  world.leaks.forEach(function(l,k){if(!seen['l'+k]&&l.on&&Math.hypot(l.x-pl.x,l.z-pl.z)<4.2){seen['l'+k]=1;if(tutK<0)toast(l.wrench?T('A joint is dripping steadily here.'):T('Water is pouring out of a split pipe here.'),3.5)}});
  if(tutK<0)world.spots.forEach(function(s){if(!s.seen&&Math.hypot(s.x-pl.x,s.z-pl.z)<s.r){s.seen=true;notes.push(T(s.text));toast(T(s.text),5)}});
  // the one line of words
  if(tutK>=0&&TUT[tutK].ok()){tutK++;sfx('good',0.8);if(tutK>=TUT.length){tutK=-1;save.tut=1;persist()}}
  if(toastT>0)toastT-=dt;
  var tl=tutK>=0?TUT[tutK]:null,line=tl?T(typeof tl.t==='function'?tl.t():touchUI&&tl.tt?tl.tt:tl.t):toastT>0?toastTx:def.depot?depotSay:'',sy=$('say');
  if(sy.textContent!==line){if(line){sy.textContent=line;sy.classList.remove('off');sy.classList.toggle('do',tutK>=0)}else sy.classList.add('off')}
  // prompt
  focus=findFocus();var p=$('prompt'),tap=touchUI?T('Do'):'E',act=touchUI?T('Hold Do'):T('Hold E'),txt='';
  if(focus){var o=focus.o;
    if(focus.kind==='valve')txt=tutK>=0?'':act+': '+(o.closed?T('open the tap'):T('shut the tap'));
    else if(focus.kind==='leak')txt=tool()==='wrench'?(touchUI?T('Hold Use'):T('Hold click'))+': '+T('tighten the joint'):T('A dripping joint. It needs the wrench.');
    else if(focus.kind==='pump')txt=pumpWhy(o)+'  '+tap+': '+(o.on?T('switch off'):T('switch on'));
    else if(focus.kind==='station')txt=tap+': '+(o.kind==='board'?T('pick a job'):o.kind==='shop'?T('buy gear'):T('load the van'));
    $('promptTx').textContent=txt;p.hidden=!txt&&hold<=0;$('promptBar').hidden=hold<=0;$('promptBar').firstChild.style.width=clamp(hold,0,1)*100+'%'}else{p.hidden=true;hold=0}
  $('cross').classList.toggle('act',!!focus);$('tAct').hidden=!(focus&&focus.kind!=='leak');
  if(focus&&(inp.act||inp.tap)&&(focus.kind==='pump'||focus.kind==='station')){inp.act=false;if(focus.kind==='pump'){focus.o.on=!focus.o.on;sfx('tick',1)}else openStation(focus.o.kind)}
  var working=focus&&((focus.kind==='valve'&&inp.act)||(focus.kind==='leak'&&tool()==='wrench'&&useHeld));
  if(working){hold+=dt/(focus.kind==='valve'?0.9:1.6);if(Math.random()<dt*9)sfx('valve',0.35);if(hold>=1){hold=0;inp.act=false;if(focus.kind==='valve'){world.setValve(focus.o,!focus.o.closed);sfx('shut',1);if(tutK<0)toast(focus.o.closed?T('Tap shut.'):T('Tap open.'),2)}else{world.fixLeak(focus.o);sfx('shut',0.8);toast(T('Joint tightened.'),2)}}}
  else if(hold>0)hold=Math.max(0,hold-dt*2);
  inp.tap=false;
}

// ---------------------------------------------------------------- screens
var state='menu',selJob=null,endT=0;
var PANELS=['menu','pause','settings','how','journal','result','board','shop','van'],backTo=null;
function show(id){PANELS.forEach(function(p){$(p).hidden=p!==id});if(id&&document.pointerLockElement)document.exitPointerLock()}
function starsHtml(n){return'★'.repeat(n)+'<s>'+'★'.repeat(3-n)+'</s>'}
function coinsTx(){$('coins').textContent=save.coins+' ◈'}
function jobBy(id){return EWMaps.filter(function(m){return m.id===id})[0]}
function enter(d){
  if(lv){scene.remove(lv.grp);EWLook.dispose(lv.grp,[terrainMat,waterMat]);lv=null}
  def=d;setEnv(def.sky);
  world=new EW.World(def,{hoseLen:save.gear.hose2?16:9,cableLen:save.gear.reel?18:8});lv=EWLook.level(world,{terrainMat:terrainMat,waterMat:waterMat,T:T,clip:reflPlane});scene.add(lv.grp);
  lv.stations.forEach(function(s){s.g.visible=stationOn(s.s.kind)});
  lv.prev=new Float32Array(world.S.n*2);lv.wg.setAttribute('aPrev',new THREE.BufferAttribute(lv.prev,2));lv.slope=new Float32Array(world.S.n*2);lv.wg.setAttribute('aSlope',new THREE.BufferAttribute(lv.slope,2));lv.tg.setAttribute('aWd',lv.wg.attributes.aDepth);ripSetup();
  pl.x=world.spawn.x;pl.z=world.spawn.z;pl.y=world.groundAt(pl.x,pl.z);pl.yaw=world.spawn.yaw;pl.pitch=def.depot?0:-0.16;pl.vy=0;pl.ground=true;pl.walked=0;sway.lx=pl.yaw;sway.ly=pl.pitch;
  var first=firstJob(),own=owned();
  bar=def.depot?[]:first?['rake']:vanNeeded()?save.load.filter(function(t){return save.gear[t]}):own;
  inv={};if(bar.indexOf('sandbags')>=0)inv.sandbags=save.gear.bags2?8:4;if(bar.indexOf('pump')>=0)inv.pump=save.gear.pump2?2:1;if(bar.indexOf('generator')>=0)inv.generator=1;if(bar.indexOf('sack')>=0)inv.sack=40;
  cur=0;bucketVol=0;seen={};notes=[];endT=0;scanT=0;scanCool=0;hold=0;acc=0;rot=0;hosePump=null;dynDirty=true;inp.crouch=false;toastT=0;wasClear=world.drains.map(function(dr){return dr.clear>=0.55});
  tutK=(!def.depot&&def.id==='yard'&&first)?0:-1;
  buildBar();hands.root.visible=bar.length>0;$('hud').hidden=false;coinsTx();
  $('bar').hidden=!!def.depot;$('place').hidden=!def.depot;$('coins').hidden=!(def.depot&&shopOpen());$('bScan').hidden=$('bJournal').hidden=!!def.depot||first;$('inflow').hidden=true;$('hot').hidden=!bar.length;
  $('bQuit').hidden=$('bRestart').hidden=!!def.depot||first;$('bTitle').hidden=!def.depot;$('bJournal2').hidden=!!def.depot||first;
  if(!def.depot){var r=save.jobs[def.id]||(save.jobs[def.id]={stars:0,best:0,n:0});r.seen=1;persist()}
  depotSay=def.depot?(shopOpen()&&!save.seen.shopSaid?T('You have pay to spend. The gear bench is on the right'):T('Pick your next job from the board')):'';
  if(def.depot&&shopOpen()&&!save.seen.shopSaid){save.seen.shopSaid=1;persist()}
  fitShadow();updateWaterMesh();updateWaterMesh();for(var k=0;k<NF;k++)fleckSpawn(k);placeCamera();state='play';show(null);lockPointer();
  if(!def.depot&&tutK<0)toast(T(def.brief),4.5);
}
function finishJob(){
  state='result';var t=world.t,fr=world.fraction(),stars=1+(t<=def.par*1.6?1:0)+(t<=def.par&&fr<=0.015?1:0),r=save.jobs[def.id]||{stars:0,best:0,n:0},again=r.n>0,pay=Math.round(def.pay*(0.6+0.2*stars)*(again?0.5:1));
  r.n=(r.n||0)+1;r.stars=Math.max(r.stars,stars);r.best=r.best?Math.min(r.best,Math.round(t)):Math.round(t);save.jobs[def.id]=r;save.coins+=pay;persist();
  $('rTitle').textContent=T('{p} is dry',{p:def.name});$('rStars').innerHTML=starsHtml(stars);
  $('rSum').innerHTML='<span>'+esc(T('Time'))+'</span><b>'+fmtTime(t)+'</b><span>'+esc(again?T('Pay (half for a repeat)'):T('Pay'))+'</span><b>'+pay+' ◈</b>';
  show('result');sfx('done',1);
}
function pause(){if(state!=='play')return;state='pause';show('pause')}
function resume(){if(state!=='pause')return;state='play';show(null);lockPointer()}
function toTitle(){state='menu';$('hud').hidden=true;show('menu')}
function toDepot(){enter(EWMaps.depot)}
function play(){if(firstJob()){selJob='yard';enter(jobBy('yard'))}else toDepot()}
function lockPointer(){if(!touchUI&&canvas.requestPointerLock){try{var p=canvas.requestPointerLock();if(p&&p.catch)p.catch(function(){})}catch(e){}}canvas.focus()}
document.addEventListener('pointerlockchange',function(){if(!document.pointerLockElement&&state==='play'&&!touchUI)pause()});
$('bStart').onclick=play;
$('bResume').onclick=resume;$('bQuit').onclick=toDepot;$('bTitle').onclick=toTitle;$('bRestart').onclick=function(){enter(def)};
$('bAgain').onclick=function(){enter(def)};$('bBack').onclick=toDepot;
function openSub(id){if(state==='menu')backTo='menu';else if(state==='play'){state='pause';backTo='play'}else backTo='pause';if(id==='journal')openJournal();else show(id)}
function closeSub(){if(backTo==='play'){state='pause';resume()}else show(backTo)}
$('bSet1').onclick=$('bSet2').onclick=function(){openSub('settings')};$('bHow').onclick=$('bHow2').onclick=function(){openSub('how')};
$('bJournal').onclick=$('bJournal2').onclick=function(){openSub('journal')};
$('bSetDone').onclick=$('bHowDone').onclick=$('bJDone').onclick=$('bBoardX').onclick=$('bShopX').onclick=$('bVanX').onclick=closeSub;
$('bPause').onclick=pause;$('bScan').onclick=function(){scan();canvas.focus()};
$('bFull').onclick=function(){var d=document;if(d.fullscreenElement)d.exitFullscreen();else if(d.documentElement.requestFullscreen){var p=d.documentElement.requestFullscreen();if(p&&p.catch)p.catch(function(){})}};
// depot: the job board; later the gear bench; later still, the van
var pick=null;
function openStation(kind){backTo='play';state='pause';if(kind==='board'){var nxt=EWMaps.filter(function(m,k){return unlocked(k)&&!(save.jobs[m.id]&&save.jobs[m.id].stars)})[0];pick=selJob&&jobBy(selJob)?selJob:(nxt||EWMaps[0]).id;if(nxt)pick=nxt.id;drawBoard();show('board')}else if(kind==='shop'){drawShop();show('shop')}else{drawVan();show('van')}}
function drawBoard(){var h=$('jobList');h.innerHTML='';EWMaps.forEach(function(m,k){var open=unlocked(k),b=document.createElement('button');b.className='job';b.disabled=!open;b.setAttribute('aria-pressed',m.id===pick?'true':'false');var r=save.jobs[m.id];
    b.innerHTML='<div><b data-noi18n>'+(open?m.name:'? ? ?')+'</b><small>'+(open?esc(T(m.sub)):esc(T('Locked')))+'</small></div><span class="st" data-noi18n>'+(open?starsHtml(r?r.stars:0):'')+'</span>';b.addEventListener('click',function(){pick=m.id;drawBoard()});h.appendChild(b)});
  var m=jobBy(pick),r=save.jobs[m.id]||{},need=(m.needs||[]).map(function(g){return T(GEARBY[g].name)+(save.gear[g]?'':' ('+T('not owned')+')')}).join(', ');
  $('jobInfo').innerHTML='<h3 data-noi18n>'+m.name+'</h3><div>'+esc(T(m.brief))+'</div>'+(r.seen&&need?'<div class="bring"><b>'+esc(T('Worth bringing:'))+'</b> '+esc(need)+'</div>':'')+'<div class="bring">'+esc(r.n?T('Done before: a repeat pays half.'):T('Pays up to {n}',{n:Math.round(m.pay*1.2)+' ◈'}))+'</div>';
  $('bTake').disabled=!unlocked(EWMaps.indexOf(m));$('bTake').textContent=vanNeeded()?T('Take this job'):T('Go')}
$('bTake').onclick=function(){selJob=pick;if(vanNeeded()){closeSub();toast(T('Job taken. Load the van to set off.'),4)}else enter(jobBy(selJob))};
function drawShop(){$('shopCoins').textContent=save.coins+' ◈';var h=$('gearList');h.innerHTML='';GEAR.forEach(function(g){if(!g.price)return;var d=document.createElement('div');d.className='gi';var own=save.gear[g.id],locked=g.need&&!save.gear[g.need];
    d.innerHTML='<b>'+esc(T(g.name))+'</b><small>'+esc(T(g.desc))+(locked?' '+esc(T('Needs: {g}.',{g:T(GEARBY[g.need].name)})):'')+'</small>';
    if(own){var s=document.createElement('span');s.className='own';s.textContent=T('Owned');d.appendChild(s)}else{var b=document.createElement('button');b.className='btn';b.setAttribute('data-noi18n','');b.textContent=g.price+' ◈';b.disabled=locked||save.coins<g.price;
      b.onclick=function(){if(save.coins<g.price)return;save.coins-=g.price;save.gear[g.id]=1;if(g.slot&&save.load.length<slots())save.load.push(g.id);persist();sfx('buy',1);coinsTx();drawShop();lv.stations.forEach(function(s){s.g.visible=stationOn(s.s.kind)})};d.appendChild(b)}
    h.appendChild(d)})}
function drawVan(){var m=selJob?jobBy(selJob):null;$('vanJob').textContent=m?T('Going to: {j}. Room for {n} kinds of tool.',{j:m.name,n:slots()}):T('No job taken yet. Pick one from the job board first.');
  var h=$('loadList');h.innerHTML='';GEAR.forEach(function(g){if(!g.slot||!save.gear[g.id])return;var on=save.load.indexOf(g.id)>=0,b=document.createElement('button');b.className='gi'+(on?' sel':'');b.setAttribute('aria-pressed',on?'true':'false');
    b.innerHTML='<b>'+esc(T(g.name))+'</b><small>'+esc(T(g.desc))+'</small><span class="own">'+(on?esc(T('On the van')):'')+'</span>';
    b.onclick=function(){var k=save.load.indexOf(g.id);if(k>=0)save.load.splice(k,1);else if(save.load.length<slots())save.load.push(g.id);else{$('vanJob').textContent=T('The van is full. Take something off first.');return}persist();drawVan()};h.appendChild(b)});
  $('bGo').disabled=!m||!save.load.length}
$('bGo').onclick=function(){if(selJob)enter(jobBy(selJob))};
// settings
function seg(id,key,after){var el=$(id);function paint(){[].forEach.call(el.children,function(b){b.setAttribute('aria-pressed',String(save.set[key])===b.dataset.v?'true':'false')})}
  [].forEach.call(el.children,function(b){b.onclick=function(){save.set[key]=isNaN(+b.dataset.v)?b.dataset.v:+b.dataset.v;persist();paint();if(after)after()}});paint()}
$('sSens').value=save.set.sens;$('sVol').value=save.set.vol;
$('sSens').oninput=function(){save.set.sens=+this.value;persist()};$('sVol').oninput=function(){save.set.vol=+this.value;persist();if(master)master.gain.value=save.set.vol};
seg('sQ','q',function(){resize();fitShadow()});seg('sInv','inv');

// ---------------------------------------------------------------- keyboard and mouse
addEventListener('keydown',function(e){
  if(e.target&&e.target.tagName==='INPUT')return;keys[e.code]=true;
  if(state==='play'){
    if(e.code==='Space'){inp.jump=true;e.preventDefault()}
    else if(e.code==='Tab'||e.code==='KeyJ'){e.preventDefault();if(!def.depot&&!firstJob())openSub('journal')}
    else if(e.code==='KeyF')scan();
    else if(e.code==='KeyE'){if(!e.repeat){inp.act=true;inp.tap=true}}
    else if(e.code==='KeyR'){rot=(rot+1)%4;sfx('tick',0.5)}
    else if(e.code==='KeyP')pause();
    else if(/^Digit[1-9]$/.test(e.code))selectTool(+e.code.slice(5)-1,true);
  }else if(e.code==='Escape'||e.code==='Tab'||e.code==='KeyJ'){
    e.preventDefault();if(!$('pause').hidden){if(e.code==='Escape')resume()}else if($('menu').hidden&&$('result').hidden)closeSub();
  }
});
addEventListener('keyup',function(e){keys[e.code]=false;if(e.code==='KeyE')inp.act=false});
addEventListener('blur',function(){keys={};useHeld=altHeld=false;inp.act=false});
document.addEventListener('mousemove',function(e){if(document.pointerLockElement!==canvas||state!=='play')return;var s=0.0022*save.set.sens;pl.yaw-=e.movementX*s;pl.pitch=clamp(pl.pitch-e.movementY*s*(save.set.inv?-1:1),-1.5,1.5)});
canvas.addEventListener('mousedown',function(e){if(touchUI||state!=='play')return;if(document.pointerLockElement!==canvas){lockPointer();return}
  if(e.button===0){useHeld=true;useTool(false)}else if(e.button===2){altHeld=true;useTool(true)}});
addEventListener('mouseup',function(e){if(e.button===0)useHeld=false;else if(e.button===2)altHeld=false});
canvas.addEventListener('contextmenu',function(e){e.preventDefault()});
canvas.addEventListener('wheel',function(e){if(state!=='play'||bar.length<2)return;e.preventDefault();selectTool((cur+(e.deltaY>0?1:-1)+bar.length)%bar.length,true)},{passive:false});
function readKeys(){if(touchUI)return;inp.mz=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);inp.mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  inp.sprint=!!(keys.ShiftLeft||keys.ShiftRight);inp.crouch=!!(keys.KeyC||keys.ControlLeft)}

// ---------------------------------------------------------------- touch
(function(){
  var stick=$('stick'),nub=stick.firstElementChild,sid=null,sx=0,sy=0,lid=null,lx=0,ly=0;
  addEventListener('touchstart',function(){if(!touchUI){setTouch(true);resize();if(state==='play')buildBar()}},{passive:true,once:true});
  function setStick(dx,dy){var m=Math.hypot(dx,dy),mx=46;inp.sprint=m>mx*1.3;if(m>mx){dx*=mx/m;dy*=mx/m}nub.style.transform='translate('+dx+'px,'+dy+'px)';inp.mx=dx/mx;inp.mz=-dy/mx}
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
  btn('tAct',function(){inp.act=true;inp.tap=true},function(){inp.act=false});
  btn('tRot',function(){rot=(rot+1)%4;sfx('tick',0.5)});
})();

// ---------------------------------------------------------------- the loop
var last=performance.now(),acc=0,STEP=1/30,simMs=0;
function frame(now){
  requestAnimationFrame(frame);
  var dt=Math.min(0.25,(now-last)/1000);last=now; // a slow frame is caught up (to a quarter of a second) rather than played in slow motion
  if(document.hidden||!world)return;
  if(state==='play'){
    readKeys();var ox=pl.x,oz=pl.z,mn=Math.ceil(dt/0.04),mk;for(mk=0;mk<mn;mk++)movePlayer(dt/mn); // walk in short steps so a slow frame cannot carry you through a wall
    wade(dt,(pl.x-ox)/Math.max(dt,1e-3),(pl.z-oz)/Math.max(dt,1e-3));
    placeCamera();
    acc+=dt;var n=0,t0=performance.now();while(acc>=STEP&&n<8){world.step(STEP);acc-=STEP;n++}if(n){updateWaterMesh();simMs+=(performance.now()-t0-simMs)*0.1}if(acc>STEP)acc=0;U.uLerp.value=clamp(acc/STEP,0,1);U.uHi.value=quality()==='high'?1:0;
    var hid=tool();if(useHeld&&(hid==='rake'||hid==='shovel'||hid==='squeegee'))useTool(false);
    updateThings(dt,now/1000);updateFx(dt,now/1000);updateGhost();animView(dt);updateHud(dt);
    if(!def.depot&&state==='play'&&world.isDone()){endT+=dt;if(endT>2.2)finishJob()}else endT=0;
  }
  audioTick();
  if(state==='menu')return;
  // On Auto, when frames stay poor for nine seconds: first High drops to Low, then Low drops the mirror pass. It never steps back up.
  if(state==='play'&&save.set.q==='auto'&&!mirrorOff){fpsT+=dt;fpsN++;if(fpsT>=3){var fps=fpsN/fpsT;fpsT=0;fpsN=0;slowN=fps<(quality()==='high'?34:27)?slowN+1:0;if(slowN>=3){slowN=0;if(quality()==='high'){autoLow=true;resize();fitShadow()}else mirrorOff=true}}}
  U.uT.value=now/1000;U.uCam.value.copy(camera.position);skyDome.position.copy(camera.position);if(state==='play')ripStep(dt);renderReflection();
  renderer.render(scene,camera);
}
show('menu');requestAnimationFrame(frame);
// for tests and tuning from the console
window.__ew={ff:function(sec){for(var k=0;k<sec*30;k++)world.step(STEP);updateWaterMesh()},get world(){return world},get lv(){return lv},pl:pl,inp:inp,save:save,persist:persist,
  start:function(id){if(id!=='depot')selJob=id;enter(id==='depot'?EWMaps.depot:jobBy(id))},get state(){return state},get simMs(){return simMs},renderer:renderer,scan:scan,use:useTool,select:selectTool,
  get bar(){return bar},get inv(){return inv},get aim(){return aim},setRot:function(r){rot=r},rest:function(){cool=0},open:openStation,get tut(){return tutK},quality:quality,RIP:RIP,rip:rip,U:U,get mirrorOff(){return mirrorOff}};
})();
