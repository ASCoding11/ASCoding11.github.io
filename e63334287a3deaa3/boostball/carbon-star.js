/*
 * Boostball: Carbon Star, a goal explosion made for one player (an exclusive gift, see ../captains.js GIFTS and the
 * README). Carbon has it, and the captains may wear it too; nobody else is offered it.
 *
 * index.html fetches this file only when it can be needed: the player signed in here has the gift, or a car in the room
 * arrives wearing it. Then it calls window.BoostballCarbonStar(G) once with what it lends (CSAPI in index.html) and gets
 * back play(), update(), stop() and the little preview used by the Locker and the captains' Kit. index.html decides
 * WHO it plays for (the scorer's account must have the gift, whatever the scorer's data claims); this file only draws.
 *
 * What it looks like (our own design, in our own palette: near-black and indigo space, ember red and amber for the
 * star, a little cool teal in the lattice):
 *   1. A dying star: a hot core flares in the goal mouth with long thin rays, then collapses to a point (0 to 0.6 s).
 *   2. A ripple races out from the goal and crosses the whole map in about 0.7 s. Behind it the arena is space: the floor
 *      is a faint honeycomb lattice (carbon's own pattern) floating over the void, every wall, goal, stand, light tower
 *      and pad is a thin glowing outline, and the sky is a slowly turning nebula full of stars with a red-amber carbon
 *      star hanging over the scoring goal.
 *   3. The cars and the ball are white glowing outlines with a little star dust trailing behind them.
 *   4. It holds through the celebration and cross-fades back to the normal arena before the kickoff (index.html says
 *      how long is left: holdLeft()), and everything is put back exactly as it was.
 * No full-screen flash and no strobing for anyone. With the browser's reduced-motion setting there is no flare and no
 * ripple: the arena cross-fades into space and back. On Fast graphics and on phones the sky has fewer layers of cloud
 * and stars and the star dust is thinner (G.low()).
 *
 * HOW IT IS DRAWN. The arena's own objects are never changed. Each solid part of the map gets a stand-in mesh sharing
 * its geometry, painted with the sky seen through it ("space"), so it hides what is behind it, and every hard edge of the
 * map is one merged line set; together they read as an outline drawing of the arena floating in space. Thin parts (the
 * glass walls, nets, glows, lines) are hidden as the ripple passes them. Once the ripple has covered everything, the
 * arena itself is hidden, so the frame costs about what a normal one does. The cars' and ball's meshes have their
 * material swapped for one outline material while it lasts and put back afterwards. Everything here is made once and
 * kept (a pool): after a goal the stand-ins leave the scene and nothing new is left behind.
 *
 * Looks only: nothing here reads or writes the physics, the ball, the score or the room.
 */
window.BoostballCarbonStar=function(G){
'use strict';
const THREE=G.THREE,V3=THREE.Vector3;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,sm=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)},rand=(a,b)=>a+Math.random()*(b-a);

// ---------------------------------------------------------------------------------------------------------------------
//  Shaders. One "space" function paints the sky; the stand-ins, the floor and the insides of the outlined cars all use
//  it with the direction from the camera, so they line up seamlessly with the sky behind them.
// ---------------------------------------------------------------------------------------------------------------------
const SPACE=`
uniform float uTime,uTurn,uStarK;uniform vec3 uStar;
float h31(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1.,0.,0.)),f.x),mix(h31(i+vec3(0.,1.,0.)),h31(i+vec3(1.,1.,0.)),f.x),f.y),
             mix(mix(h31(i+vec3(0.,0.,1.)),h31(i+vec3(1.,0.,1.)),f.x),mix(h31(i+vec3(0.,1.,1.)),h31(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<OCT;i++){v+=a*vn(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return v;}
float stars(vec3 d,float K,float th){vec3 p=d*K,i=floor(p),f=fract(p)-.5;float h=h31(i);if(h<th)return 0.;
  vec3 o=vec3(h31(i+11.),h31(i+23.),h31(i+37.))-.5;float r=length(f-o*.6);
  return (1.-smoothstep(0.,.17,r))*(h-th)/(1.-th)*(.7+.3*sin(uTime*(1.3+h*2.)+h*50.));}
vec3 space(vec3 d){
  float c=cos(uTurn),s=sin(uTurn);vec3 r=vec3(c*d.x-s*d.z,d.y,s*d.x+c*d.z);   // the sky turns slowly; the star stays put
  float n=fbm(r*1.7+vec3(0.,uTime*.01,0.));
#if LOW
  float n2=n;
#else
  float n2=fbm(r*3.6+n*1.9);
#endif
  float band=exp(-pow(dot(r,vec3(.32,.92,.22))*2.4,2.));                       // a galaxy's band across the sky
  vec3 col=vec3(.005,.005,.016)+vec3(.045,.03,.15)*band;
  col+=vec3(.13,.075,.36)*smoothstep(.4,.85,n)*(.5+band);                       // indigo clouds
  col+=vec3(.03,.10,.14)*smoothstep(.6,.95,n2)*(1.-smoothstep(.5,.8,n))*.8;     // a few cold teal wisps between them
  col+=vec3(.30,.06,.15)*smoothstep(.56,.92,n2)*smoothstep(.45,.75,n)*.5;       // wine-red dust along their edges
  col*=.6+.75*smoothstep(.2,.8,n2);
  col+=vec3(.86,.9,1.)*stars(r,85.,.84)*1.4+vec3(1.,.8,.62)*stars(r*1.37,60.,.95)*1.6;
#if !LOW
  col+=vec3(.72,.82,1.)*stars(r,190.,.9)*.85;
#endif
  if(uStarK>0.){                                                              // the carbon star: a cool red giant in a sooty shell
    vec3 sd=normalize(uStar-cameraPosition);
    float k=sqrt(max(0.,2.*(1.-dot(d,sd))))/(.07*uStarK+.0001);
    vec3 t1=normalize(cross(sd,vec3(0.,1.,0.))),t2=cross(t1,sd);float an=atan(dot(d,t2),dot(d,t1));
    if(k<1.){float l=sqrt(1.-k*k);vec3 disc=mix(vec3(.55,.08,.03),vec3(1.,.55,.22),l*l*(3.-2.*l))*(.9+.18*vn(d*110.+uTime*.12))+vec3(.25,.12,.05)*pow(l,6.);col=mix(col,disc,uStarK);}
    else{
      col*=mix(1.,.45+.55*smoothstep(1.,1.7,k),uStarK);                        // the soot around it hides the stars behind
      float ray=pow(abs(cos(an*2.+uTime*.04)),28.)+pow(abs(cos(an*3.+1.3-uTime*.03)),46.)*.6;
      col+=(vec3(1.,.32,.1)*exp(-(k-1.)*2.)*.6+vec3(.6,.13,.05)*exp(-k*.4)*.4+vec3(1.,.5,.22)*ray*exp(-k*.3)*.3)*uStarK;
    }
  }
  return col;
}`;
// how the ripple reveals things: inside radius uR of the goal (uP) it is space; uSky takes the rest (far ground, sky)
const MASK=`uniform vec3 uP;uniform float uR,uW,uSky,uMix;
float inside(float d){return max(1.-smoothstep(uR-2.,uR+1.,d),uSky);}
float front(float d){return exp(-pow((d-uR+uW*.5)/uW,2.))*(1.-uSky)*step(.01,uR);}`;
const VS_W=`varying vec3 vW,vN;uniform float uPull;
void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);vec4 mv=viewMatrix*w;mv.xyz*=uPull;gl_Position=projectionMatrix*mv;}`;
// the stand-ins: space seen through them; up-facing parts of the pitch get the lattice
const FS_VOID=SPACE+MASK+`
varying vec3 vW,vN;uniform vec2 uPitch;uniform float uFloorY,uCell,uCircle;uniform vec4 uGoal;
float lattice(vec2 p,out float node){
  vec2 q=p/uCell;const vec2 s=vec2(1.,1.7320508);
  vec4 hc=floor(vec4(q,q-vec2(.5,1.))/s.xyxy)+.5;vec4 h=vec4(q-hc.xy*s,q-(hc.zw+.5)*s);
  vec2 g=dot(h.xy,h.xy)<dot(h.zw,h.zw)?h.xy:h.zw;vec2 a=abs(g);
  float de=.5-max(dot(a,s*.5),a.x),fw=fwidth(de)+1e-4,far=1.-smoothstep(.05,.16,fw);
  node=smoothstep(.535,.577,length(g))*far;
  return (1.-smoothstep(fw*.6,fw*1.7,de))*far;}
void main(){
  float d=distance(vW,uP),m=inside(d),f=front(d);
  vec3 dir=normalize(vW-cameraPosition),col=space(dir);
  float up=smoothstep(.6,.9,vN.y)*step(vW.y,uFloorY)*step(abs(vW.x),uPitch.x)*step(abs(vW.z),uPitch.y);
  if(up>0.){
    float node,ln=lattice(vW.xz,node);
    float edge=smoothstep(0.,6.,uPitch.x-abs(vW.x))*smoothstep(0.,6.,uPitch.y-abs(vW.z));
    float pulse=smoothstep(.86,1.,fract((uTime*26.-d)/64.))*smoothstep(0.,40.,d);   // slow ember swells keep moving outward
    float mark=(1.-smoothstep(.12,.32,abs(vW.z)))+(1.-smoothstep(.12,.32,abs(length(vW.xz)-uCircle)));
    col=col*.72+(vec3(.1,.55,.55)*ln*.42+vec3(.55,1.,.92)*node*.55+vec3(.25,.85,.8)*mark*.16+vec3(1.,.5,.2)*pulse*(ln*.6+node))*edge
       +vec3(.04,.11,.13)*pow(1.-abs(dir.y),5.);
  }
#if GHOST
  float fr=pow(1.-abs(dot(normalize(vN),dir)),1.8);
  float gg=step(uGoal.y-.5,vW.z*uGoal.x)*step(abs(vW.x),uGoal.z)*step(vW.y,uGoal.w);
  col=col*.6+mix(vec3(.8,.92,1.),vec3(1.,.62,.3),gg)*(pow(fr,1.6)*(.55+.6*gg)+.025);
#endif
  col+=mix(vec3(1.,.5,.18)*f*f*.9,mix(vec3(1.,.45,.16),vec3(.3,.95,.9),.3)*f*1.2,up);   // the ripple's edge: a thin ember line on walls and stands
  gl_FragColor=vec4(col,m*uMix);
}`;
// the map's edges: thin lines, cool white, warmer on the scoring goal
const VS_LINE=`attribute float aK;varying vec3 vW;varying float vK;
void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vK=aK;vec4 mv=viewMatrix*w;mv.xyz*=.994;gl_Position=projectionMatrix*mv;}`;
const FS_LINE=MASK+`varying vec3 vW;varying float vK;uniform vec4 uGoal;
void main(){float d=distance(vW,uP);
  float g=step(uGoal.y-.5,vW.z*uGoal.x)*step(abs(vW.x),uGoal.z)*step(vW.y,uGoal.w);
  vec3 c=mix(vec3(.62,.86,1.),vec3(1.,.62,.3),g)*vK;
  gl_FragColor=vec4(c*(inside(d)*.95+front(d)*1.6),uMix);}`;
// the cars and the ball: a white rim, and space inside, as if they were made of glass
const VS_RIM=`varying vec3 vW,vNv,vV;
void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mv=viewMatrix*w;vV=mv.xyz;vNv=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}`;
const FS_RIM=SPACE+`varying vec3 vW,vNv,vV;
void main(){vec3 n=normalize(vNv);float fr=1.-abs(dot(n,normalize(-vV)));float rim=pow(fr,3.)*1.9+pow(fr,9.)*1.2;
  gl_FragColor=vec4(space(normalize(vW-cameraPosition))*.75+vec3(.93,.96,1.)*(rim+.03),1.);}`;
// star dust behind the cars: points that move on their own in the vertex shader (written once, when emitted)
const VS_DUST=`attribute vec3 aV;attribute vec2 aT,aS;uniform float uTime,uScale;varying float vA,vS;
void main(){float t=uTime-aT.x,age=t/aT.y;if(age<0.||age>1.){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;vA=0.;return;}
  vec3 p=position+aV*t*(1.-.4*age)+vec3(0.,.35*t,0.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
  gl_PointSize=aS.x*(1.-age*.5)*uScale/max(1.,-mv.z);vA=(1.-age)*min(1.,age*10.);vS=aS.y;}`;
const FS_DUST=`varying float vA,vS;
void main(){vec2 c=gl_PointCoord-.5;float r=length(c),core=1.-smoothstep(0.,.5,r);
  float gl=max(0.,1.-abs(c.x)*12.)*max(0.,1.-abs(c.y)*2.2)+max(0.,1.-abs(c.y)*12.)*max(0.,1.-abs(c.x)*2.2);
  vec3 col=mix(vec3(1.),vS<.5?vec3(.45,1.,.92):vec3(1.,.6,.28),fract(vS*2.)*.7);
  gl_FragColor=vec4(col,(core*core+gl*.45)*vA);}`;
// the dying star at the goal mouth: a core, long thin rays and a soft halo (never the whole screen)
const VS_UV=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FS_FLARE=`varying vec2 vUv;uniform float uI,uRay,uRot,uCore;
void main(){vec2 q=(vUv-.5)*2.;float r=length(q),a=atan(q.y,q.x);
  float core=exp(-r*r/(uCore*uCore+1e-4)),halo=exp(-r*8.)*.38+exp(-r*3.2)*.05;
  float ray=pow(abs(cos(3.*(a-uRot))),90.)*exp(-r/(.2*uRay+1e-3))+pow(abs(cos(2.*(a+uRot*.6)+.4)),150.)*exp(-r/(.3*uRay+1e-3))*.7;
  float streak=exp(-abs(q.y)*85.)*exp(-abs(q.x)/(.62*uRay+1e-3))*.75;
  vec3 col=vec3(1.,.88,.7)*core+vec3(1.,.48,.2)*(halo+ray*.9+streak);
  gl_FragColor=vec4(col*uI*(1.-smoothstep(.8,1.,r)),1.);}`;

// ---------------------------------------------------------------------------------------------------------------------
//  One effect over one scene (the arena, or the preview's little pitch)
// ---------------------------------------------------------------------------------------------------------------------
// o: {scene, renderer, camera(), map() (the map's top objects), cars() (car models {g, flame, shadow}), balls(),
//     junk() (things to hide while it lasts: shadows, skid marks, the normal particles), low(), reduced(), holdLeft()
//     (seconds until it must be gone, or null), audio(), shake(a), pitch {x, z, floorY, circle, cell, w (ripple front width),
//     goalW, goalH, AL}, star(p) (where the carbon star hangs for a goal at p), main}
function Effect(o){
  const U={uTime:{value:0},uTurn:{value:0},uStarK:{value:0},uStar:{value:new V3()},uP:{value:new V3()},uR:{value:0},uW:{value:o.pitch.w},
    uSky:{value:0},uMix:{value:0},uPull:{value:.998},uPitch:{value:new THREE.Vector2(o.pitch.x,o.pitch.z)},uFloorY:{value:o.pitch.floorY},
    uCell:{value:o.pitch.cell},uCircle:{value:o.pitch.circle},uGoal:{value:new THREE.Vector4(1,o.pitch.AL,o.pitch.goalW+1.5,o.pitch.goalH+1.5)},
    uScale:{value:400},uI:{value:0},uRay:{value:0},uRot:{value:0},uCore:{value:.1}};
  let low=!!o.low();
  const defs=()=>({OCT:low?3:4,LOW:low?1:0,GHOST:0});
  const sh=(vs,fs,extra)=>new THREE.ShaderMaterial(Object.assign({vertexShader:vs,fragmentShader:fs,uniforms:U,defines:defs(),extensions:{derivatives:true}},extra));
  const voidMat=sh(VS_W,FS_VOID,{transparent:true,side:THREE.DoubleSide});
  const ghostMat=sh(VS_W,FS_VOID,{transparent:true,side:THREE.DoubleSide});ghostMat.defines.GHOST=1;   // small solid parts: a glowing rim
  const lineMat=sh(VS_LINE,FS_LINE,{transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const rimMat=sh(VS_RIM,FS_RIM,{side:THREE.DoubleSide});
  const dustMat=sh(VS_DUST,FS_DUST,{transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const flareMat=sh(VS_UV,FS_FLARE,{transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending});
  const MATS=[voidMat,ghostMat,lineMat,rimMat,dustMat,flareMat];
  const FAR=o.pitch.far||900;   // anything bigger than this is the sky or the far ground: it turns with uSky
  const group=new THREE.Group();group.name='carbon-star';
  let built=null;

  // the stand-ins and the outline: made the first time (or ahead of time by warm()), then kept
  function build(){
    if(built)return built;
    const occ=[],thin=[],tops=o.map(),pos=[],ks=[],_a=new V3(),_s=new THREE.Sphere();
    for(const t of tops)t.updateMatrixWorld(true);
    const edges=(x,k)=>{
      const g=x.geometry;if(!g||!g.attributes||!g.attributes.position)return;
      if(!g.boundingSphere)g.computeBoundingSphere();if(g.boundingSphere.radius>FAR)return;   // the sky and the far ground have no edges
      if((g.index?g.index.count:g.attributes.position.count)/3>40000)return;
      const e=new THREE.EdgesGeometry(g,26),p=e.attributes.position;
      for(let i=0;i<p.count;i++){_a.fromBufferAttribute(p,i).applyMatrix4(x.matrixWorld);pos.push(_a.x,_a.y,_a.z);ks.push(k)}
      e.dispose();
    };
    for(const t of tops)t.traverse(x=>{
      if(x.isMesh){
        const m=x.material,solid=!Array.isArray(m)&&!m.transparent&&m.blending!==THREE.AdditiveBlending;
        const g=x.geometry;if(!g.boundingSphere)g.computeBoundingSphere();
        _s.copy(g.boundingSphere).applyMatrix4(x.matrixWorld);
        if(solid){
          const s=new THREE.Mesh(g,_s.radius<8?ghostMat:voidMat);s.matrixAutoUpdate=false;s.matrix.copy(x.matrixWorld);s.frustumCulled=x.frustumCulled;
          if(_s.radius>FAR)s.renderOrder=1;s.userData.far=_s.radius>FAR;   // the sky and the far ground last, so nearer things hide them for free
          group.add(s);occ.push(s);
        }else thin.push({x,c:_s.center.clone(),r:_s.radius});
        edges(x,solid?1:.8);
      }else if(x.isLine||x.isPoints||x.isSprite){const g=x.geometry;let r=0;if(g&&g.attributes&&g.attributes.position){if(!g.boundingSphere)g.computeBoundingSphere();r=g.boundingSphere.radius}
        thin.push({x,c:new V3().setFromMatrixPosition(x.matrixWorld),r})}
    });
    const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));lg.setAttribute('aK',new THREE.Float32BufferAttribute(ks,1));
    const lines=new THREE.LineSegments(lg,lineMat);lines.frustumCulled=false;lines.renderOrder=5;group.add(lines);
    // star dust: a pool of points, used round and round
    const N=low?160:384,dg=new THREE.BufferGeometry();
    const A=(n,k)=>{const a=new THREE.BufferAttribute(new Float32Array(n*k),k);a.setUsage(THREE.DynamicDrawUsage);return a};
    dg.setAttribute('position',A(N,3));dg.setAttribute('aV',A(N,3));dg.setAttribute('aT',A(N,2));dg.setAttribute('aS',A(N,2));
    for(let i=0;i<N;i++)dg.attributes.aT.array[i*2]=-1e9,dg.attributes.aT.array[i*2+1]=1;
    const dust=new THREE.Points(dg,dustMat);dust.frustumCulled=false;dust.renderOrder=6;group.add(dust);
    const flare=new THREE.Mesh(new THREE.PlaneGeometry(1,1),flareMat);flare.frustumCulled=false;flare.renderOrder=9;group.add(flare);
    return built={occ,thin,tops,lines,dust,dg,N,next:0,flare,nLines:pos.length/6};
  }
  // compile the shaders ahead of time, so the first goal does not stall a frame
  function warm(){
    const b=build();
    try{o.scene.add(group);const tmp=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),rimMat);group.add(tmp);
      o.renderer.compile(o.scene,o.camera());group.remove(tmp);tmp.geometry.dispose()}catch(e){}
    o.scene.remove(group);
  }

  // what this effect changed and must put back
  const vis=new Map(),mats=new Map(),kids=new WeakMap(),last=new WeakMap();
  const hide=x=>{if(!vis.has(x))vis.set(x,x.visible);x.visible=false};
  const show=x=>{if(vis.has(x)){x.visible=vis.get(x);vis.delete(x)}};
  const parts=g=>{let k=kids.get(g);if(!k){k=[];g.traverse(x=>{if(x!==g)k.push(x)});kids.set(g,k)}return k};
  function outline(m,on){
    for(const x of parts(m.g)){
      if(x.isSprite||x===m.flame){if(on)hide(x);else show(x);continue}
      if(!x.isMesh)continue;
      if(on){if(x.material!==rimMat){mats.set(x,x.material);x.material=rimMat}}
      else if(x.material===rimMat&&mats.has(x)){x.material=mats.get(x);mats.delete(x)}
    }
    if(m.shadow){if(on)hide(m.shadow);else show(m.shadow)}
  }
  function ballOutline(b,on){
    const L=[b,...b.children];
    for(const x of L){if(!x.isMesh)continue;if(on){if(x.material!==rimMat){mats.set(x,x.material);x.material=rimMat}}else if(x.material===rimMat&&mats.has(x)){x.material=mats.get(x);mats.delete(x)}}
  }

  // ---- the sound: a soft boom, a deep swell and a shimmer, all quiet ----
  let voices=[];
  function sound(){
    const A=o.audio();if(!A)return;
    try{
      const c=A.actx,t=c.currentTime,v=o.main?1:.6,out=A.master;
      A.tone(t,1.2,'sine',70,30,.24*v);A.noise(t,.9,170,.7,.12*v,'lowpass');
      const voice=(f,g,at,peak,end,type,f1)=>{const os=c.createOscillator(),gn=c.createGain();os.type=type||'sine';os.frequency.setValueAtTime(f,t+at);if(f1)os.frequency.linearRampToValueAtTime(f1,t+peak);
        gn.gain.setValueAtTime(.0001,t+at);gn.gain.exponentialRampToValueAtTime(g*v,t+peak);gn.gain.exponentialRampToValueAtTime(.0001,t+end);os.connect(gn);gn.connect(out);os.start(t+at);os.stop(t+end+.05);
        voices.push({os,gn});os.onended=()=>{try{gn.disconnect()}catch(e){}voices=voices.filter(x=>x.os!==os)}};
      voice(46,.075,.15,1.4,3.8,'sine',49);voice(69,.045,.2,1.5,3.6,'sine',73.5);voice(98,.018,.3,1.6,3.2,'triangle',98);   // the swell
      [1567.98,2093,2349.32,3135.96,3520].forEach((f,i)=>voice(f,.011,.35+i*.13,.65+i*.13,2.9+i*.12));                       // the shimmer
    }catch(e){}
  }
  function hush(){const A=o.audio();if(!A)return;const t=A.actx.currentTime;for(const x of voices){try{x.gn.gain.cancelScheduledValues(t);x.gn.gain.setTargetAtTime(.0001,t,.06);x.os.stop(t+.3)}catch(e){}}voices=[]}

  // ---- playing ----
  const S={live:false,t:0,p:new V3(),sg:1,rmax:300,covered:false,fading:false,fadeT:0,fadeLen:.8,red:false,shadowAuto:null};
  const DEF_HOLD=o.hold||3.4,FADE=.8,RIP0=.22,RIP=.75;
  function play(p){
    const hl=o.holdLeft();if(hl!==null&&hl<1.2)return false;   // too close to the kickoff to be worth it: the plain fireball
    if(S.live)stop();
    const lw=!!o.low();if(lw!==low){low=lw;for(const m of MATS){m.defines=defs();m.needsUpdate=true}}
    const b=build();
    S.live=true;S.t=0;S.p.copy(p);S.sg=p.z>0?1:-1;S.covered=false;S.fading=false;S.red=!!o.reduced();
    U.uP.value.copy(p);U.uR.value=S.red?1e5:0;U.uSky.value=S.red?1:0;U.uMix.value=S.red?0:1;U.uStarK.value=0;U.uI.value=0;
    U.uStar.value.copy(o.star(p));U.uGoal.value.x=S.sg;
    S.rmax=0;for(const s of b.occ){if(s.userData.far)continue;const g=s.geometry,c=g.boundingSphere.center.clone().applyMatrix4(s.matrix);S.rmax=Math.max(S.rmax,c.distanceTo(p)+g.boundingSphere.radius*.8)}
    S.rmax=Math.max(S.rmax,60);
    voidMat.transparent=true;
    o.scene.add(group);
    b.flare.visible=true;
    sound();
    if(!S.red&&o.shake)o.shake(.35);
    return true;
  }
  const _q=new V3(),_f=new V3(),_v=new V3();
  function update(dt){
    if(!S.live)return;
    const b=built;S.t+=dt;const t=S.t;
    U.uTime.value+=dt;U.uTurn.value+=dt*.035;
    const cam=o.camera();
    U.uScale.value=o.renderer.domElement.height/(2*Math.tan(cam.fov*Math.PI/360));
    // when to fade back: index.html knows how long the celebration has left
    const hl=o.holdLeft(),left=hl===null?DEF_HOLD-t:hl;
    if(!S.fading&&left<=FADE&&t>.3){
      S.fading=true;S.fadeT=t;S.fadeLen=clamp(left,.15,FADE);S.mix0=U.uMix.value;
      if(S.covered){for(const x of b.tops)show(x);voidMat.transparent=true;if(o.main&&S.shadowAuto!==null){o.renderer.shadowMap.autoUpdate=S.shadowAuto;S.shadowAuto=null}}
    }
    // the ripple, or (reduced motion) a plain cross-fade
    if(S.red){U.uMix.value=S.fading?S.mix0*(1-sm(0,1,(t-S.fadeT)/S.fadeLen)):sm(0,1,t/1.1)}
    else{
      const k=clamp((t-RIP0)/RIP,0,1);U.uR.value=t<RIP0?0:S.rmax*(1-Math.pow(1-k,1.5));
      U.uSky.value=sm(RIP0+RIP*.45,RIP0+RIP*1.02,t);
      U.uMix.value=S.fading?1-sm(0,1,(t-S.fadeT)/S.fadeLen):1;
    }
    U.uStarK.value=S.red?U.uMix.value:sm(.55,1.7,t)*U.uMix.value;
    const R=U.uR.value,sky=U.uSky.value,mix=U.uMix.value;
    // the arena: thin parts go as the ripple passes; once all is space the arena itself is hidden (it costs nothing then)
    if(!S.fading){
      for(const h of b.thin)if(h.x.visible&&(S.red?mix>.5:(h.r>FAR?sky>.5:h.c.distanceTo(S.p)<R-2)))hide(h.x);
      if(!S.covered&&(S.red?mix>=1:t>=RIP0+RIP*1.05)){
        S.covered=true;for(const x of b.tops)hide(x);voidMat.transparent=false;
        if(o.main&&o.renderer.shadowMap.enabled){S.shadowAuto=o.renderer.shadowMap.autoUpdate;o.renderer.shadowMap.autoUpdate=false}   // nothing shows the shadows now
      }
    }else if(mix<.5)for(const h of b.thin)show(h.x);
    // junk (shadows, skid marks, the normal particles) goes with the first half of the ripple, and back with the fade
    const junkOff=S.red?mix>.5:(S.fading?mix>.5:R>S.rmax*.45||sky>0);
    for(const j of o.junk())if(j){if(junkOff)hide(j);else show(j)}
    // the cars and the ball: outlines once the ripple has reached them
    const on=x=>mix>.5&&(S.red||sky>.5||x.distanceTo(S.p)<R-1);
    for(const m of o.cars())if(m&&m.g){
      const near=on(m.g.position);outline(m,near);
      if(near&&!S.fading)dust(m,dt);
    }
    for(const bl of o.balls())if(bl)ballOutline(bl,on(bl.position)&&bl.visible);
    // the dying star
    const fl=b.flare;
    if(t<.75){
      _f.copy(S.p);_f.z-=S.sg*2.5;_f.y=Math.max(_f.y,2);fl.position.copy(_f);fl.quaternion.copy(cam.quaternion);
      const dc=cam.position.distanceTo(_f),near=clamp(dc/32,.4,1);
      if(S.red){U.uI.value=sm(0,.25,t)*(1-sm(.35,.75,t))*.45*near;U.uRay.value=0;U.uCore.value=.12}
      else{
        U.uI.value=(sm(0,.1,t)*(1-sm(.45,.62,t))+Math.max(0,1-Math.abs(t-.5)/.05)*.5)*near;   // up, hold, a last glint as it goes
        U.uRay.value=sm(0,.14,t)*(1.15-sm(.28,.52,t)*1.15);U.uCore.value=.17-sm(.25,.5,t)*.15;U.uRot.value=t*.35;
      }
      fl.scale.setScalar(o.pitch.flare);
    }else fl.visible=false;
    // done
    if(S.fading&&mix<=0)stop();
  }
  function dust(m,dt){
    const b=built,g=m.g;let lp=last.get(g);if(!lp){lp=g.position.clone();last.set(g,lp)}
    _v.copy(g.position).sub(lp).multiplyScalar(1/Math.max(dt,1e-3));lp.copy(g.position);
    const sp=Math.min(_v.length(),60),rate=(6+sp*1.5)*(low?.5:1);
    m.dAcc=(m.dAcc||0)+rate*dt;let n=Math.floor(m.dAcc);m.dAcc-=n;if(n>6)n=6;
    if(!n)return;
    _f.set(0,0,1).applyQuaternion(g.quaternion);
    const P=b.dg.attributes.position.array,Vv=b.dg.attributes.aV.array,T=b.dg.attributes.aT.array,Sz=b.dg.attributes.aS.array;
    for(let k=0;k<n;k++){
      const i=b.next;b.next=(b.next+1)%b.N;
      _q.set(rand(-.6,.6),0,0).applyQuaternion(g.quaternion);
      P[i*3]=g.position.x-_f.x*1.3+_q.x;P[i*3+1]=g.position.y+rand(.1,.8);P[i*3+2]=g.position.z-_f.z*1.3+_q.z;
      Vv[i*3]=-_f.x*1.6+_v.x*.25+rand(-.7,.7);Vv[i*3+1]=rand(-.2,.6);Vv[i*3+2]=-_f.z*1.6+_v.z*.25+rand(-.7,.7);
      T[i*2]=U.uTime.value;T[i*2+1]=rand(.55,1.05);Sz[i*2]=rand(.18,.42)*(low?1.25:1);Sz[i*2+1]=Math.random();
    }
    for(const k of ['position','aV','aT','aS'])b.dg.attributes[k].needsUpdate=true;
  }
  // puts everything back: the arena, the cars' materials, the shadows; the stand-ins leave the scene (they are kept)
  function stop(){
    if(!S.live&&!vis.size&&!mats.size)return;
    S.live=false;
    o.scene.remove(group);
    for(const [x,m] of mats)if(x.material===rimMat)x.material=m;mats.clear();
    for(const [x,v] of vis)x.visible=v;vis.clear();
    if(S.shadowAuto!==null){o.renderer.shadowMap.autoUpdate=S.shadowAuto;S.shadowAuto=null}
    if(built){const T=built.dg.attributes.aT.array;for(let i=0;i<built.N;i++)T[i*2]=-1e9;built.dg.attributes.aT.needsUpdate=true}
    U.uI.value=0;U.uMix.value=0;
    hush();
  }
  // everything this effect made, for a preview that is closed for good (the arena's effect is kept for the visit)
  function dispose(){
    stop();
    if(built){built.lines.geometry.dispose();built.dg.dispose();built.flare.geometry.dispose()}
    for(const m of MATS)m.dispose();built=null;
  }
  return{play,update,stop,dispose,warm,build,get live(){return S.live},get covered(){return S.covered},get stats(){return built?{standIns:built.occ.length,thin:built.thin.length,lines:built.nLines,dust:built.N}:null},U};
}

// ---------------------------------------------------------------------------------------------------------------------
//  The arena's own effect
// ---------------------------------------------------------------------------------------------------------------------
const main=Effect({scene:G.scene,renderer:G.renderer,camera:()=>G.camera,map:()=>G.MAP,cars:G.carModels,balls:()=>[G.ballMesh],junk:G.junk,
  low:G.low,reduced:G.reduced,holdLeft:G.holdLeft,audio:G.audio,shake:G.shake,main:true,
  pitch:{x:G.AW+.5,z:G.AL+G.GD+.5,floorY:.6,circle:G.CIRCLE||15,cell:3.2,w:8,goalW:G.GW,goalH:G.GH,AL:G.AL,flare:72},
  star:p=>{const s=p.z>0?1:-1;return new V3(-s*95,190,s*(G.AL+330))}});   // high over the scoring goal, a little to one side of it

// ---------------------------------------------------------------------------------------------------------------------
//  The preview: a little pitch with one goal, the player's car and a ball, drawn by whichever renderer shows it
//  (the Locker's own picture, or the garage picture for a captain's Kit). It plays the same effect.
// ---------------------------------------------------------------------------------------------------------------------
function Preview(renderer){
  const sc=new THREE.Scene(),made=[];
  const keep=x=>{made.push(x);return x};
  sc.add(new THREE.HemisphereLight(0xcfe0ff,0x1a2a22,.95));const dl=new THREE.DirectionalLight(0xffffff,.6);dl.position.set(10,20,12);sc.add(dl);
  const cam=new THREE.PerspectiveCamera(46,16/9,.3,900);cam.position.set(10,7.5,24);cam.lookAt(0,3,-6);
  const GWp=8,GHp=6,Z=-12,GDp=5;
  const cv=document.createElement('canvas');cv.width=64;cv.height=64;const g=cv.getContext('2d');
  for(let i=0;i<8;i++){g.fillStyle=i%2?'#2f7a45':'#2a7040';g.fillRect(0,i*8,64,8)}
  const ft=keep(new THREE.CanvasTexture(cv));ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(4,5);
  const floor=new THREE.Mesh(keep(new THREE.PlaneGeometry(64,60)),keep(new THREE.MeshLambertMaterial({map:ft})));floor.rotation.x=-Math.PI/2;floor.position.z=10;sc.add(floor);
  const goal=new THREE.Group();sc.add(goal);
  const white=keep(new THREE.MeshLambertMaterial({color:0xf2f5ff})),post=keep(new THREE.CylinderGeometry(.3,.3,GHp,14));
  for(const s of[-1,1]){const m=new THREE.Mesh(post,white);m.position.set(s*GWp,GHp/2,Z);goal.add(m)}
  const bar=new THREE.Mesh(keep(new THREE.BoxGeometry(GWp*2+.6,.6,.6)),white);bar.position.set(0,GHp,Z);goal.add(bar);
  const netM=keep(new THREE.MeshBasicMaterial({color:0xbfd4ff,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
  const back=new THREE.Mesh(keep(new THREE.PlaneGeometry(GWp*2,GHp)),netM);back.position.set(0,GHp/2,Z-GDp);goal.add(back);
  for(const s of[-1,1]){const m=new THREE.Mesh(keep(new THREE.PlaneGeometry(GDp,GHp)),netM);m.rotation.y=Math.PI/2;m.position.set(s*GWp,GHp/2,Z-GDp/2);goal.add(m)}
  const gf=new THREE.Mesh(keep(new THREE.PlaneGeometry(GWp*2,GDp)),keep(new THREE.MeshLambertMaterial({color:0x1f4fa8})));gf.rotation.x=-Math.PI/2;gf.position.set(0,.01,Z-GDp/2);goal.add(gf);
  const stands=new THREE.Mesh(keep(new THREE.CylinderGeometry(40,52,16,48,1,true)),keep(new THREE.MeshLambertMaterial({color:0x18213f,side:THREE.DoubleSide})));stands.position.set(0,6,8);sc.add(stands);
  const led=new THREE.Mesh(keep(new THREE.CylinderGeometry(40.2,40.2,1.2,48,1,true)),keep(new THREE.MeshBasicMaterial({color:0x2f8cff,side:THREE.DoubleSide})));led.position.set(0,1.2,8);sc.add(led);
  const skyG=keep(new THREE.SphereGeometry(400,24,16)),cols=[],pp=skyG.attributes.position;
  for(let i=0;i<pp.count;i++){const y=pp.getY(i)/400,c=new THREE.Color(0x0a1434).lerp(new THREE.Color(0x3a2c66),Math.max(0,1-Math.abs(y-.05)*5)*.7);cols.push(c.r,c.g,c.b)}
  skyG.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  const sky=new THREE.Mesh(skyG,keep(new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));sc.add(sky);
  const ball=new THREE.Mesh(keep(new THREE.SphereGeometry(1.5,32,20)),G.ballMesh.material);sc.add(ball);
  let car=null;
  function dressCar(){
    if(car){sc.remove(car.g);G.dropModel(car)}
    car=G.buildCarModel(0,G.myBody,G.myAccent,null);car.g.position.set(6,.3,8);car.g.rotation.y=Math.PI*.82;sc.add(car.g);
  }
  dressCar();
  const fx=Effect({scene:sc,renderer,camera:()=>cam,map:()=>[floor,goal,stands,led,sky],cars:()=>car?[car]:[],balls:()=>[ball],junk:()=>[],
    low:G.low,reduced:G.reduced,audio:G.audio,shake:null,main:false,holdLeft:()=>null,hold:4,
    pitch:{x:32,z:40,floorY:.6,circle:6,cell:1.5,w:3,goalW:GWp,goalH:GHp,AL:-Z,flare:22,far:300},
    star:()=>new V3(-14,34,-200)});
  let t=-1,live=false;
  const B0=new V3(5,1.5,4),B1=new V3(-1,2.8,Z-1.5),_b=new V3();
  return{
    play(){fx.stop();dressCar();t=0;live=true;ball.visible=true},
    get live(){return live},get fx(){return fx},
    frame(dt,aspect,noDraw){
      if(aspect&&Math.abs(cam.aspect-aspect)>1e-3){cam.aspect=aspect;cam.updateProjectionMatrix()}
      if(live){
        t+=dt;
        // the ball rolls in, then the goal
        if(t<.8){const k=t/.8;_b.lerpVectors(B0,B1,k*k*(3-2*k));_b.y=B0.y+(B1.y-B0.y)*k+Math.sin(k*Math.PI)*1.2;ball.position.copy(_b);ball.rotation.x-=dt*6}
        else if(ball.visible){ball.visible=false;fx.play(B1)}
        car.g.position.x=6-Math.min(t,.9)*2.5;car.g.position.z=8-Math.min(t,.9)*6;
        fx.update(dt);
        if(t>.9&&!fx.live&&t>2)live=false;
      }else{ball.visible=true;ball.position.copy(B0)}
      if(!noDraw)renderer.render(sc,cam);
      return live;
    },
    stop(){fx.stop();live=false},
    dispose(){fx.dispose();if(car){sc.remove(car.g);G.dropModel(car);car=null}for(const x of made)x.dispose()}
  };
}

return{play:p=>main.play(p),update:dt=>main.update(dt),stop:()=>main.stop(),warm:()=>main.warm(),get live(){return main.live},get stats(){return main.stats},Preview,main};
};
