var Sc="170",ji={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Ki={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},wd=0,lh=1,Td=2;var Tu=1,Ad=2,Jn=3,bi=0,Ht=1,sn=2,vi=0,Es=1,Cs=2,ch=3,hh=4,Rd=5,Hi=100,Cd=101,Pd=102,Id=103,Dd=104,Ld=200,Ud=201,Nd=202,Od=203,tl=204,nl=205,Fd=206,Bd=207,zd=208,kd=209,Hd=210,Vd=211,Gd=212,Wd=213,Xd=214,il=0,sl=1,rl=2,Ps=3,al=4,ol=5,ll=6,cl=7,Au=0,qd=1,Yd=2,Mi=0,$d=1,Zd=2,Jd=3,Ec=4,jd=5,Kd=6,Qd=7;var Ru=300,Is=301,Ds=302,hl=303,ul=304,$a=306,pr=1e3,Gi=1001,dl=1002,rn=1003,ef=1004;var Lr=1005;var Dn=1006,xo=1007;var Wi=1008;var Qn=1009,Cu=1010,Pu=1011,mr=1012,wc=1013,Xi=1014,Ln=1015,Ar=1016,Tc=1017,Ac=1018,Ls=1020,Iu=35902,Du=1021,Lu=1022,Sn=1023,Uu=1024,Nu=1025,ws=1026,Us=1027,Rc=1028,Cc=1029,Ou=1030,Pc=1031;var Ic=1033,fa=33776,pa=33777,ma=33778,ga=33779,fl=35840,pl=35841,ml=35842,gl=35843,_l=36196,yl=37492,xl=37496,vl=37808,Ml=37809,bl=37810,Sl=37811,El=37812,wl=37813,Tl=37814,Al=37815,Rl=37816,Cl=37817,Pl=37818,Il=37819,Dl=37820,Ll=37821,_a=36492,Ul=36494,Nl=36495,Fu=36283,Ol=36284,Fl=36285,Bl=36286;var ya=2300,zl=2301,vo=2302,uh=2400,dh=2401,fh=2402;var tf=3200,nf=3201;var Bu=0,sf=1,yi="",Ut="srgb",Xs="srgb-linear",Za="linear",lt="srgb";var as=7680;var ph=519,rf=512,af=513,of=514,zu=515,lf=516,cf=517,hf=518,uf=519,mh=35044;var gh="300 es",jn=2e3,xa=2001,ei=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let s=this._listeners[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let n=this._listeners[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,e);e.target=null}}},zt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],_h=1234567,Ts=Math.PI/180,gr=180/Math.PI;function Qi(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(zt[i&255]+zt[i>>8&255]+zt[i>>16&255]+zt[i>>24&255]+"-"+zt[e&255]+zt[e>>8&255]+"-"+zt[e>>16&15|64]+zt[e>>24&255]+"-"+zt[t&63|128]+zt[t>>8&255]+"-"+zt[t>>16&255]+zt[t>>24&255]+zt[n&255]+zt[n>>8&255]+zt[n>>16&255]+zt[n>>24&255]).toLowerCase()}function Tt(i,e,t){return Math.max(e,Math.min(t,i))}function Dc(i,e){return(i%e+e)%e}function df(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function ff(i,e,t){return i!==e?(t-i)/(e-i):0}function cr(i,e,t){return(1-t)*i+t*e}function pf(i,e,t,n){return cr(i,e,1-Math.exp(-t*n))}function mf(i,e=1){return e-Math.abs(Dc(i,e*2)-e)}function gf(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function _f(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function yf(i,e){return i+Math.floor(Math.random()*(e-i+1))}function xf(i,e){return i+Math.random()*(e-i)}function vf(i){return i*(.5-Math.random())}function Mf(i){i!==void 0&&(_h=i);let e=_h+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function bf(i){return i*Ts}function Sf(i){return i*gr}function Ef(i){return(i&i-1)===0&&i!==0}function wf(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Tf(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Af(i,e,t,n,s){let r=Math.cos,a=Math.sin,o=r(t/2),l=a(t/2),c=r((e+n)/2),h=a((e+n)/2),u=r((e-n)/2),d=a((e-n)/2),f=r((n-e)/2),g=a((n-e)/2);switch(s){case"XYX":i.set(o*h,l*u,l*d,o*c);break;case"YZY":i.set(l*d,o*h,l*u,o*c);break;case"ZXZ":i.set(l*u,l*d,o*h,o*c);break;case"XZX":i.set(o*h,l*g,l*f,o*c);break;case"YXY":i.set(l*f,o*h,l*g,o*c);break;case"ZYZ":i.set(l*g,l*f,o*h,o*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Ms(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Xt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}var Yt={DEG2RAD:Ts,RAD2DEG:gr,generateUUID:Qi,clamp:Tt,euclideanModulo:Dc,mapLinear:df,inverseLerp:ff,lerp:cr,damp:pf,pingpong:mf,smoothstep:gf,smootherstep:_f,randInt:yf,randFloat:xf,randFloatSpread:vf,seededRandom:Mf,degToRad:bf,radToDeg:Sf,isPowerOfTwo:Ef,ceilPowerOfTwo:wf,floorPowerOfTwo:Tf,setQuaternionFromProperEuler:Af,normalize:Xt,denormalize:Ms},ie=class i{constructor(e=0,t=0){i.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Tt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*n-a*s+e.x,this.y=r*s+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ge=class i{constructor(e,t,n,s,r,a,o,l,c){i.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,l,c)}set(e,t,n,s,r,a,o,l,c){let h=this.elements;return h[0]=e,h[1]=s,h[2]=o,h[3]=t,h[4]=r,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],g=n[8],_=s[0],m=s[3],p=s[6],S=s[1],v=s[4],x=s[7],I=s[2],T=s[5],R=s[8];return r[0]=a*_+o*S+l*I,r[3]=a*m+o*v+l*T,r[6]=a*p+o*x+l*R,r[1]=c*_+h*S+u*I,r[4]=c*m+h*v+u*T,r[7]=c*p+h*x+u*R,r[2]=d*_+f*S+g*I,r[5]=d*m+f*v+g*T,r[8]=d*p+f*x+g*R,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8];return t*a*h-t*o*c-n*r*h+n*o*l+s*r*c-s*a*l}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=h*a-o*c,d=o*l-h*r,f=c*r-a*l,g=t*u+n*d+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/g;return e[0]=u*_,e[1]=(s*c-h*n)*_,e[2]=(o*n-s*a)*_,e[3]=d*_,e[4]=(h*t-s*l)*_,e[5]=(s*r-o*t)*_,e[6]=f*_,e[7]=(n*l-c*t)*_,e[8]=(a*t-n*r)*_,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,a,o){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+e,-s*c,s*l,-s*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Mo.makeScale(e,t)),this}rotate(e){return this.premultiply(Mo.makeRotation(-e)),this}translate(e,t){return this.premultiply(Mo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Mo=new Ge;function ku(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function va(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Rf(){let i=va("canvas");return i.style.display="block",i}var yh={};function or(i){i in yh||(yh[i]=!0,console.warn(i))}function Cf(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}function Pf(i){let e=i.elements;e[2]=.5*e[2]+.5*e[3],e[6]=.5*e[6]+.5*e[7],e[10]=.5*e[10]+.5*e[11],e[14]=.5*e[14]+.5*e[15]}function If(i){let e=i.elements;e[11]===-1?(e[10]=-e[10]-1,e[14]=-e[14]):(e[10]=-e[10],e[14]=-e[14]+1)}var tt={enabled:!0,workingColorSpace:Xs,spaces:{},convert:function(i,e,t){return this.enabled===!1||e===t||!e||!t||(this.spaces[e].transfer===lt&&(i.r=Kn(i.r),i.g=Kn(i.g),i.b=Kn(i.b)),this.spaces[e].primaries!==this.spaces[t].primaries&&(i.applyMatrix3(this.spaces[e].toXYZ),i.applyMatrix3(this.spaces[t].fromXYZ)),this.spaces[t].transfer===lt&&(i.r=As(i.r),i.g=As(i.g),i.b=As(i.b))),i},fromWorkingColorSpace:function(i,e){return this.convert(i,this.workingColorSpace,e)},toWorkingColorSpace:function(i,e){return this.convert(i,e,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===yi?Za:this.spaces[i].transfer},getLuminanceCoefficients:function(i,e=this.workingColorSpace){return i.fromArray(this.spaces[e].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,e,t){return i.copy(this.spaces[e].toXYZ).multiply(this.spaces[t].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace}};function Kn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function As(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var xh=[.64,.33,.3,.6,.15,.06],vh=[.2126,.7152,.0722],Mh=[.3127,.329],bh=new Ge().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Sh=new Ge().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);tt.define({[Xs]:{primaries:xh,whitePoint:Mh,transfer:Za,toXYZ:bh,fromXYZ:Sh,luminanceCoefficients:vh,workingColorSpaceConfig:{unpackColorSpace:Ut},outputColorSpaceConfig:{drawingBufferColorSpace:Ut}},[Ut]:{primaries:xh,whitePoint:Mh,transfer:lt,toXYZ:bh,fromXYZ:Sh,luminanceCoefficients:vh,outputColorSpaceConfig:{drawingBufferColorSpace:Ut}}});var os,kl=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{os===void 0&&(os=va("canvas")),os.width=e.width,os.height=e.height;let n=os.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=os}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=va("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=Kn(r[a]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Kn(t[n]/255)*255):t[n]=Kn(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},Df=0,Ma=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Df++}),this.uuid=Qi(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(bo(s[a].image)):r.push(bo(s[a]))}else r=bo(s);n.url=r}return t||(e.images[this.uuid]=n),n}};function bo(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?kl.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var Lf=0,Jt=class i extends ei{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=Gi,s=Gi,r=Dn,a=Wi,o=Sn,l=Qn,c=i.DEFAULT_ANISOTROPY,h=yi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Lf++}),this.uuid=Qi(),this.name="",this.source=new Ma(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new ie(0,0),this.repeat=new ie(1,1),this.center=new ie(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ge,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Ru)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case pr:e.x=e.x-Math.floor(e.x);break;case Gi:e.x=e.x<0?0:1;break;case dl:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case pr:e.y=e.y-Math.floor(e.y);break;case Gi:e.y=e.y<0?0:1;break;case dl:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Jt.DEFAULT_IMAGE=null;Jt.DEFAULT_MAPPING=Ru;Jt.DEFAULT_ANISOTROPY=1;var ct=class i{constructor(e=0,t=0,n=0,s=1){i.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*t+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*t+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*t+a[7]*n+a[11]*s+a[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,l=e.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],g=l[9],_=l[2],m=l[6],p=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-_)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+_)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let v=(c+1)/2,x=(f+1)/2,I=(p+1)/2,T=(h+d)/4,R=(u+_)/4,L=(g+m)/4;return v>x&&v>I?v<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(v),s=T/n,r=R/n):x>I?x<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(x),n=T/s,r=L/s):I<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(I),n=R/r,s=L/r),this.set(n,s,r,t),this}let S=Math.sqrt((m-g)*(m-g)+(u-_)*(u-_)+(d-h)*(d-h));return Math.abs(S)<.001&&(S=1),this.x=(m-g)/S,this.y=(u-_)/S,this.z=(d-h)/S,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Hl=class extends ei{constructor(e=1,t=1,n={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new ct(0,0,e,t),this.scissorTest=!1,this.viewport=new ct(0,0,e,t);let s={width:e,height:t,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Dn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);let r=new Jt(s,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);r.flipY=!1,r.generateMipmaps=n.generateMipmaps,r.internalFormat=n.internalFormat,this.textures=[];let a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let n=0,s=e.textures.length;n<s;n++)this.textures[n]=e.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;let t=Object.assign({},e.texture.image);return this.texture.source=new Ma(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},ti=class extends Hl{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},ba=class extends Jt{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=rn,this.minFilter=rn,this.wrapR=Gi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Vl=class extends Jt{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=rn,this.minFilter=rn,this.wrapR=Gi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var En=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,a,o){let l=n[s+0],c=n[s+1],h=n[s+2],u=n[s+3],d=r[a+0],f=r[a+1],g=r[a+2],_=r[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u;return}if(o===1){e[t+0]=d,e[t+1]=f,e[t+2]=g,e[t+3]=_;return}if(u!==_||l!==d||c!==f||h!==g){let m=1-o,p=l*d+c*f+h*g+u*_,S=p>=0?1:-1,v=1-p*p;if(v>Number.EPSILON){let I=Math.sqrt(v),T=Math.atan2(I,p*S);m=Math.sin(m*T)/I,o=Math.sin(o*T)/I}let x=o*S;if(l=l*m+d*x,c=c*m+f*x,h=h*m+g*x,u=u*m+_*x,m===1-o){let I=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=I,c*=I,h*=I,u*=I}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,s,r,a){let o=n[s],l=n[s+1],c=n[s+2],h=n[s+3],u=r[a],d=r[a+1],f=r[a+2],g=r[a+3];return e[t]=o*g+h*u+l*f-c*d,e[t+1]=l*g+h*d+c*u-o*f,e[t+2]=c*g+h*f+o*d-l*u,e[t+3]=h*g-o*u-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(s/2),u=o(r/2),d=l(n/2),f=l(s/2),g=l(r/2);switch(a){case"XYZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"YXZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"ZXY":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"ZYX":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"YZX":this._x=d*h*u+c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u-d*f*g;break;case"XZY":this._x=d*h*u-c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u+d*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],a=t[1],o=t[5],l=t[9],c=t[2],h=t[6],u=t[10],d=n+o+u;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(a-s)*f}else if(n>o&&n>u){let f=2*Math.sqrt(1+n-o-u);this._w=(h-l)/f,this._x=.25*f,this._y=(s+a)/f,this._z=(r+c)/f}else if(o>u){let f=2*Math.sqrt(1+o-n-u);this._w=(r-c)/f,this._x=(s+a)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+u-n-o);this._w=(a-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Tt(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,a=e._w,o=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+a*o+s*c-r*l,this._y=s*h+a*l+r*o-n*c,this._z=r*h+a*c+n*l-s*o,this._w=a*h-n*o-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let n=this._x,s=this._y,r=this._z,a=this._w,o=a*e._w+n*e._x+s*e._y+r*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=s,this._z=r,this;let l=1-o*o;if(l<=Number.EPSILON){let f=1-t;return this._w=f*a+t*this._w,this._x=f*n+t*this._x,this._y=f*s+t*this._y,this._z=f*r+t*this._z,this.normalize(),this}let c=Math.sqrt(l),h=Math.atan2(c,o),u=Math.sin((1-t)*h)/c,d=Math.sin(t*h)/c;return this._w=a*u+this._w*d,this._x=n*u+this._x*d,this._y=s*u+this._y*d,this._z=r*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},C=class i{constructor(e=0,t=0,n=0){i.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Eh.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Eh.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,a=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*s-o*n),h=2*(o*t-r*s),u=2*(r*n-a*t);return this.x=t+l*c+a*u-o*h,this.y=n+l*h+o*c-r*u,this.z=s+l*u+r*h-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,a=t.x,o=t.y,l=t.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return So.copy(this).projectOnVector(e),this.sub(So)}reflect(e){return this.sub(So.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Tt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},So=new C,Eh=new En,Gt=class{constructor(e=new C(1/0,1/0,1/0),t=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(vn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(vn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=vn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,vn):vn.fromBufferAttribute(r,a),vn.applyMatrix4(e.matrixWorld),this.expandByPoint(vn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ur.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ur.copy(n.boundingBox)),Ur.applyMatrix4(e.matrixWorld),this.union(Ur)}let s=e.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,vn),vn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Qs),Nr.subVectors(this.max,Qs),ls.subVectors(e.a,Qs),cs.subVectors(e.b,Qs),hs.subVectors(e.c,Qs),di.subVectors(cs,ls),fi.subVectors(hs,cs),Ui.subVectors(ls,hs);let t=[0,-di.z,di.y,0,-fi.z,fi.y,0,-Ui.z,Ui.y,di.z,0,-di.x,fi.z,0,-fi.x,Ui.z,0,-Ui.x,-di.y,di.x,0,-fi.y,fi.x,0,-Ui.y,Ui.x,0];return!Eo(t,ls,cs,hs,Nr)||(t=[1,0,0,0,1,0,0,0,1],!Eo(t,ls,cs,hs,Nr))?!1:(Or.crossVectors(di,fi),t=[Or.x,Or.y,Or.z],Eo(t,ls,cs,hs,Nr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,vn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(vn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Xn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Xn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Xn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Xn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Xn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Xn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Xn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Xn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Xn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}},Xn=[new C,new C,new C,new C,new C,new C,new C,new C],vn=new C,Ur=new Gt,ls=new C,cs=new C,hs=new C,di=new C,fi=new C,Ui=new C,Qs=new C,Nr=new C,Or=new C,Ni=new C;function Eo(i,e,t,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){Ni.fromArray(i,r);let o=s.x*Math.abs(Ni.x)+s.y*Math.abs(Ni.y)+s.z*Math.abs(Ni.z),l=e.dot(Ni),c=t.dot(Ni),h=n.dot(Ni);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}var Uf=new Gt,er=new C,wo=new C,ni=class{constructor(e=new C,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):Uf.setFromPoints(e).getCenter(n);let s=0;for(let r=0,a=e.length;r<a;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;er.subVectors(e,this.center);let t=er.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(er,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(wo.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(er.copy(e.center).add(wo)),this.expandByPoint(er.copy(e.center).sub(wo))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},qn=new C,To=new C,Fr=new C,pi=new C,Ao=new C,Br=new C,Ro=new C,Si=class{constructor(e=new C,t=new C(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,qn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=qn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(qn.copy(this.origin).addScaledVector(this.direction,t),qn.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){To.copy(e).add(t).multiplyScalar(.5),Fr.copy(t).sub(e).normalize(),pi.copy(this.origin).sub(To);let r=e.distanceTo(t)*.5,a=-this.direction.dot(Fr),o=pi.dot(this.direction),l=-pi.dot(Fr),c=pi.lengthSq(),h=Math.abs(1-a*a),u,d,f,g;if(h>0)if(u=a*l-o,d=a*o-l,g=r*h,u>=0)if(d>=-g)if(d<=g){let _=1/h;u*=_,d*=_,f=u*(u+a*d+2*o)+d*(a*u+d+2*l)+c}else d=r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;else d<=-g?(u=Math.max(0,-(-a*r+o)),d=u>0?-r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c):d<=g?(u=0,d=Math.min(Math.max(-r,-l),r),f=d*(d+2*l)+c):(u=Math.max(0,-(a*r+o)),d=u>0?r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c);else d=a>0?-r:r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(To).addScaledVector(Fr,d),f}intersectSphere(e,t){qn.subVectors(e.center,this.origin);let n=qn.dot(this.direction),s=qn.dot(qn)-n*n,r=e.radius*e.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,a,o,l,c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,s=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,s=(e.min.x-d.x)*c),h>=0?(r=(e.min.y-d.y)*h,a=(e.max.y-d.y)*h):(r=(e.max.y-d.y)*h,a=(e.min.y-d.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),u>=0?(o=(e.min.z-d.z)*u,l=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,l=(e.min.z-d.z)*u),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,qn)!==null}intersectTriangle(e,t,n,s,r){Ao.subVectors(t,e),Br.subVectors(n,e),Ro.crossVectors(Ao,Br);let a=this.direction.dot(Ro),o;if(a>0){if(s)return null;o=1}else if(a<0)o=-1,a=-a;else return null;pi.subVectors(this.origin,e);let l=o*this.direction.dot(Br.crossVectors(pi,Br));if(l<0)return null;let c=o*this.direction.dot(Ao.cross(pi));if(c<0||l+c>a)return null;let h=-o*pi.dot(Ro);return h<0?null:this.at(h/a,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Ke=class i{constructor(e,t,n,s,r,a,o,l,c,h,u,d,f,g,_,m){i.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,l,c,h,u,d,f,g,_,m)}set(e,t,n,s,r,a,o,l,c,h,u,d,f,g,_,m){let p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=s,p[1]=r,p[5]=a,p[9]=o,p[13]=l,p[2]=c,p[6]=h,p[10]=u,p[14]=d,p[3]=f,p[7]=g,p[11]=_,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,n=e.elements,s=1/us.setFromMatrixColumn(e,0).length(),r=1/us.setFromMatrixColumn(e,1).length(),a=1/us.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){let d=a*h,f=a*u,g=o*h,_=o*u;t[0]=l*h,t[4]=-l*u,t[8]=c,t[1]=f+g*c,t[5]=d-_*c,t[9]=-o*l,t[2]=_-d*c,t[6]=g+f*c,t[10]=a*l}else if(e.order==="YXZ"){let d=l*h,f=l*u,g=c*h,_=c*u;t[0]=d+_*o,t[4]=g*o-f,t[8]=a*c,t[1]=a*u,t[5]=a*h,t[9]=-o,t[2]=f*o-g,t[6]=_+d*o,t[10]=a*l}else if(e.order==="ZXY"){let d=l*h,f=l*u,g=c*h,_=c*u;t[0]=d-_*o,t[4]=-a*u,t[8]=g+f*o,t[1]=f+g*o,t[5]=a*h,t[9]=_-d*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){let d=a*h,f=a*u,g=o*h,_=o*u;t[0]=l*h,t[4]=g*c-f,t[8]=d*c+_,t[1]=l*u,t[5]=_*c+d,t[9]=f*c-g,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){let d=a*l,f=a*c,g=o*l,_=o*c;t[0]=l*h,t[4]=_-d*u,t[8]=g*u+f,t[1]=u,t[5]=a*h,t[9]=-o*h,t[2]=-c*h,t[6]=f*u+g,t[10]=d-_*u}else if(e.order==="XZY"){let d=a*l,f=a*c,g=o*l,_=o*c;t[0]=l*h,t[4]=-u,t[8]=c*h,t[1]=d*u+_,t[5]=a*h,t[9]=f*u-g,t[2]=g*u-f,t[6]=o*h,t[10]=_*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Nf,e,Of)}lookAt(e,t,n){let s=this.elements;return en.subVectors(e,t),en.lengthSq()===0&&(en.z=1),en.normalize(),mi.crossVectors(n,en),mi.lengthSq()===0&&(Math.abs(n.z)===1?en.x+=1e-4:en.z+=1e-4,en.normalize(),mi.crossVectors(n,en)),mi.normalize(),zr.crossVectors(en,mi),s[0]=mi.x,s[4]=zr.x,s[8]=en.x,s[1]=mi.y,s[5]=zr.y,s[9]=en.y,s[2]=mi.z,s[6]=zr.z,s[10]=en.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],g=n[2],_=n[6],m=n[10],p=n[14],S=n[3],v=n[7],x=n[11],I=n[15],T=s[0],R=s[4],L=s[8],E=s[12],y=s[1],D=s[5],H=s[9],z=s[13],G=s[2],j=s[6],X=s[10],U=s[14],O=s[3],ee=s[7],$=s[11],he=s[15];return r[0]=a*T+o*y+l*G+c*O,r[4]=a*R+o*D+l*j+c*ee,r[8]=a*L+o*H+l*X+c*$,r[12]=a*E+o*z+l*U+c*he,r[1]=h*T+u*y+d*G+f*O,r[5]=h*R+u*D+d*j+f*ee,r[9]=h*L+u*H+d*X+f*$,r[13]=h*E+u*z+d*U+f*he,r[2]=g*T+_*y+m*G+p*O,r[6]=g*R+_*D+m*j+p*ee,r[10]=g*L+_*H+m*X+p*$,r[14]=g*E+_*z+m*U+p*he,r[3]=S*T+v*y+x*G+I*O,r[7]=S*R+v*D+x*j+I*ee,r[11]=S*L+v*H+x*X+I*$,r[15]=S*E+v*z+x*U+I*he,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],a=e[1],o=e[5],l=e[9],c=e[13],h=e[2],u=e[6],d=e[10],f=e[14],g=e[3],_=e[7],m=e[11],p=e[15];return g*(+r*l*u-s*c*u-r*o*d+n*c*d+s*o*f-n*l*f)+_*(+t*l*f-t*c*d+r*a*d-s*a*f+s*c*h-r*l*h)+m*(+t*c*u-t*o*f-r*a*u+n*a*f+r*o*h-n*c*h)+p*(-s*o*h-t*l*u+t*o*d+s*a*u-n*a*d+n*l*h)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=e[9],d=e[10],f=e[11],g=e[12],_=e[13],m=e[14],p=e[15],S=u*m*c-_*d*c+_*l*f-o*m*f-u*l*p+o*d*p,v=g*d*c-h*m*c-g*l*f+a*m*f+h*l*p-a*d*p,x=h*_*c-g*u*c+g*o*f-a*_*f-h*o*p+a*u*p,I=g*u*l-h*_*l-g*o*d+a*_*d+h*o*m-a*u*m,T=t*S+n*v+s*x+r*I;if(T===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let R=1/T;return e[0]=S*R,e[1]=(_*d*r-u*m*r-_*s*f+n*m*f+u*s*p-n*d*p)*R,e[2]=(o*m*r-_*l*r+_*s*c-n*m*c-o*s*p+n*l*p)*R,e[3]=(u*l*r-o*d*r-u*s*c+n*d*c+o*s*f-n*l*f)*R,e[4]=v*R,e[5]=(h*m*r-g*d*r+g*s*f-t*m*f-h*s*p+t*d*p)*R,e[6]=(g*l*r-a*m*r-g*s*c+t*m*c+a*s*p-t*l*p)*R,e[7]=(a*d*r-h*l*r+h*s*c-t*d*c-a*s*f+t*l*f)*R,e[8]=x*R,e[9]=(g*u*r-h*_*r-g*n*f+t*_*f+h*n*p-t*u*p)*R,e[10]=(a*_*r-g*o*r+g*n*c-t*_*c-a*n*p+t*o*p)*R,e[11]=(h*o*r-a*u*r-h*n*c+t*u*c+a*n*f-t*o*f)*R,e[12]=I*R,e[13]=(h*_*s-g*u*s+g*n*d-t*_*d-h*n*m+t*u*m)*R,e[14]=(g*o*s-a*_*s-g*n*l+t*_*l+a*n*m-t*o*m)*R,e[15]=(a*u*s-h*o*s+h*n*l-t*u*l-a*n*d+t*o*d)*R,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,a=e.x,o=e.y,l=e.z,c=r*a,h=r*o;return this.set(c*a+n,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+n,h*l-s*a,0,c*l-s*o,h*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,a){return this.set(1,n,r,0,e,1,a,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,a=t._y,o=t._z,l=t._w,c=r+r,h=a+a,u=o+o,d=r*c,f=r*h,g=r*u,_=a*h,m=a*u,p=o*u,S=l*c,v=l*h,x=l*u,I=n.x,T=n.y,R=n.z;return s[0]=(1-(_+p))*I,s[1]=(f+x)*I,s[2]=(g-v)*I,s[3]=0,s[4]=(f-x)*T,s[5]=(1-(d+p))*T,s[6]=(m+S)*T,s[7]=0,s[8]=(g+v)*R,s[9]=(m-S)*R,s[10]=(1-(d+_))*R,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements,r=us.set(s[0],s[1],s[2]).length(),a=us.set(s[4],s[5],s[6]).length(),o=us.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],Mn.copy(this);let c=1/r,h=1/a,u=1/o;return Mn.elements[0]*=c,Mn.elements[1]*=c,Mn.elements[2]*=c,Mn.elements[4]*=h,Mn.elements[5]*=h,Mn.elements[6]*=h,Mn.elements[8]*=u,Mn.elements[9]*=u,Mn.elements[10]*=u,t.setFromRotationMatrix(Mn),n.x=r,n.y=a,n.z=o,this}makePerspective(e,t,n,s,r,a,o=jn){let l=this.elements,c=2*r/(t-e),h=2*r/(n-s),u=(t+e)/(t-e),d=(n+s)/(n-s),f,g;if(o===jn)f=-(a+r)/(a-r),g=-2*a*r/(a-r);else if(o===xa)f=-a/(a-r),g=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=h,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=f,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,s,r,a,o=jn){let l=this.elements,c=1/(t-e),h=1/(n-s),u=1/(a-r),d=(t+e)*c,f=(n+s)*h,g,_;if(o===jn)g=(a+r)*u,_=-2*u;else if(o===xa)g=r*u,_=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-d,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-f,l[2]=0,l[6]=0,l[10]=_,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},us=new C,Mn=new Ke,Nf=new C(0,0,0),Of=new C(1,1,1),mi=new C,zr=new C,en=new C,wh=new Ke,Th=new En,Un=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(Tt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Tt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Tt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Tt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Tt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Tt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return wh.makeRotationFromQuaternion(e),this.setFromRotationMatrix(wh,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Th.setFromEuler(this),this.setFromQuaternion(Th,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Un.DEFAULT_ORDER="XYZ";var _r=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Ff=0,Ah=new C,ds=new En,Yn=new Ke,kr=new C,tr=new C,Bf=new C,zf=new En,Rh=new C(1,0,0),Ch=new C(0,1,0),Ph=new C(0,0,1),Ih={type:"added"},kf={type:"removed"},fs={type:"childadded",child:null},Co={type:"childremoved",child:null},Rt=class i extends ei{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Ff++}),this.uuid=Qi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new C,t=new Un,n=new En,s=new C(1,1,1);function r(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Ke},normalMatrix:{value:new Ge}}),this.matrix=new Ke,this.matrixWorld=new Ke,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new _r,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ds.setFromAxisAngle(e,t),this.quaternion.multiply(ds),this}rotateOnWorldAxis(e,t){return ds.setFromAxisAngle(e,t),this.quaternion.premultiply(ds),this}rotateX(e){return this.rotateOnAxis(Rh,e)}rotateY(e){return this.rotateOnAxis(Ch,e)}rotateZ(e){return this.rotateOnAxis(Ph,e)}translateOnAxis(e,t){return Ah.copy(e).applyQuaternion(this.quaternion),this.position.add(Ah.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Rh,e)}translateY(e){return this.translateOnAxis(Ch,e)}translateZ(e){return this.translateOnAxis(Ph,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Yn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?kr.copy(e):kr.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),tr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Yn.lookAt(tr,kr,this.up):Yn.lookAt(kr,tr,this.up),this.quaternion.setFromRotationMatrix(Yn),s&&(Yn.extractRotation(s.matrixWorld),ds.setFromRotationMatrix(Yn),this.quaternion.premultiply(ds.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Ih),fs.child=e,this.dispatchEvent(fs),fs.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(kf),Co.child=e,this.dispatchEvent(Co),Co.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Yn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Yn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Yn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Ih),fs.child=e,this.dispatchEvent(fs),fs.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(tr,e,Bf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(tr,zf,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let u=l[c];r(e.shapes,u)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(e.materials,this.material[l]));s.material=o}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];s.animations.push(r(e.animations,l))}}if(t){let o=a(e.geometries),l=a(e.materials),c=a(e.textures),h=a(e.images),u=a(e.shapes),d=a(e.skeletons),f=a(e.animations),g=a(e.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=s,n;function a(o){let l=[];for(let c in o){let h=o[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};Rt.DEFAULT_UP=new C(0,1,0);Rt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Rt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var bn=new C,$n=new C,Po=new C,Zn=new C,ps=new C,ms=new C,Dh=new C,Io=new C,Do=new C,Lo=new C,Uo=new ct,No=new ct,Oo=new ct,xi=class i{constructor(e=new C,t=new C,n=new C){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),bn.subVectors(e,t),s.cross(bn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){bn.subVectors(s,t),$n.subVectors(n,t),Po.subVectors(e,t);let a=bn.dot(bn),o=bn.dot($n),l=bn.dot(Po),c=$n.dot($n),h=$n.dot(Po),u=a*c-o*o;if(u===0)return r.set(0,0,0),null;let d=1/u,f=(c*l-o*h)*d,g=(a*h-o*l)*d;return r.set(1-f-g,g,f)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,Zn)===null?!1:Zn.x>=0&&Zn.y>=0&&Zn.x+Zn.y<=1}static getInterpolation(e,t,n,s,r,a,o,l){return this.getBarycoord(e,t,n,s,Zn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Zn.x),l.addScaledVector(a,Zn.y),l.addScaledVector(o,Zn.z),l)}static getInterpolatedAttribute(e,t,n,s,r,a){return Uo.setScalar(0),No.setScalar(0),Oo.setScalar(0),Uo.fromBufferAttribute(e,t),No.fromBufferAttribute(e,n),Oo.fromBufferAttribute(e,s),a.setScalar(0),a.addScaledVector(Uo,r.x),a.addScaledVector(No,r.y),a.addScaledVector(Oo,r.z),a}static isFrontFacing(e,t,n,s){return bn.subVectors(n,t),$n.subVectors(e,t),bn.cross($n).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return bn.subVectors(this.c,this.b),$n.subVectors(this.a,this.b),bn.cross($n).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,a,o;ps.subVectors(s,n),ms.subVectors(r,n),Io.subVectors(e,n);let l=ps.dot(Io),c=ms.dot(Io);if(l<=0&&c<=0)return t.copy(n);Do.subVectors(e,s);let h=ps.dot(Do),u=ms.dot(Do);if(h>=0&&u<=h)return t.copy(s);let d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return a=l/(l-h),t.copy(n).addScaledVector(ps,a);Lo.subVectors(e,r);let f=ps.dot(Lo),g=ms.dot(Lo);if(g>=0&&f<=g)return t.copy(r);let _=f*c-l*g;if(_<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(n).addScaledVector(ms,o);let m=h*g-f*u;if(m<=0&&u-h>=0&&f-g>=0)return Dh.subVectors(r,s),o=(u-h)/(u-h+(f-g)),t.copy(s).addScaledVector(Dh,o);let p=1/(m+_+d);return a=_*p,o=d*p,t.copy(n).addScaledVector(ps,a).addScaledVector(ms,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Hu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},gi={h:0,s:0,l:0},Hr={h:0,s:0,l:0};function Fo(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var qe=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ut){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,tt.toWorkingColorSpace(this,t),this}setRGB(e,t,n,s=tt.workingColorSpace){return this.r=e,this.g=t,this.b=n,tt.toWorkingColorSpace(this,s),this}setHSL(e,t,n,s=tt.workingColorSpace){if(e=Dc(e,1),t=Tt(t,0,1),n=Tt(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,a=2*n-r;this.r=Fo(a,r,e+1/3),this.g=Fo(a,r,e),this.b=Fo(a,r,e-1/3)}return tt.toWorkingColorSpace(this,s),this}setStyle(e,t=Ut){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ut){let n=Hu[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Kn(e.r),this.g=Kn(e.g),this.b=Kn(e.b),this}copyLinearToSRGB(e){return this.r=As(e.r),this.g=As(e.g),this.b=As(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ut){return tt.fromWorkingColorSpace(kt.copy(this),e),Math.round(Tt(kt.r*255,0,255))*65536+Math.round(Tt(kt.g*255,0,255))*256+Math.round(Tt(kt.b*255,0,255))}getHexString(e=Ut){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=tt.workingColorSpace){tt.fromWorkingColorSpace(kt.copy(this),t);let n=kt.r,s=kt.g,r=kt.b,a=Math.max(n,s,r),o=Math.min(n,s,r),l,c,h=(o+a)/2;if(o===a)l=0,c=0;else{let u=a-o;switch(c=h<=.5?u/(a+o):u/(2-a-o),a){case n:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-n)/u+2;break;case r:l=(n-s)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=tt.workingColorSpace){return tt.fromWorkingColorSpace(kt.copy(this),t),e.r=kt.r,e.g=kt.g,e.b=kt.b,e}getStyle(e=Ut){tt.fromWorkingColorSpace(kt.copy(this),e);let t=kt.r,n=kt.g,s=kt.b;return e!==Ut?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(gi),this.setHSL(gi.h+e,gi.s+t,gi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(gi),e.getHSL(Hr);let n=cr(gi.h,Hr.h,t),s=cr(gi.s,Hr.s,t),r=cr(gi.l,Hr.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},kt=new qe;qe.NAMES=Hu;var Hf=0,ii=class extends ei{static get type(){return"Material"}get type(){return this.constructor.type}set type(e){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Hf++}),this.uuid=Qi(),this.name="",this.blending=Es,this.side=bi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=tl,this.blendDst=nl,this.blendEquation=Hi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new qe(0,0,0),this.blendAlpha=0,this.depthFunc=Ps,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ph,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=as,this.stencilZFail=as,this.stencilZPass=as,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Es&&(n.blending=this.blending),this.side!==bi&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==tl&&(n.blendSrc=this.blendSrc),this.blendDst!==nl&&(n.blendDst=this.blendDst),this.blendEquation!==Hi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Ps&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ph&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==as&&(n.stencilFail=this.stencilFail),this.stencilZFail!==as&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==as&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let l=r[o];delete l.metadata,a.push(l)}return a}if(t){let r=s(e.textures),a=s(e.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}},Nn=class extends ii{static get type(){return"MeshBasicMaterial"}constructor(e){super(),this.isMeshBasicMaterial=!0,this.color=new qe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Un,this.combine=Au,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};var wt=new C,Vr=new ie,Vt=class{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=mh,this.updateRanges=[],this.gpuType=Ln,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Vr.fromBufferAttribute(this,t),Vr.applyMatrix3(e),this.setXY(t,Vr.x,Vr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)wt.fromBufferAttribute(this,t),wt.applyMatrix3(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)wt.fromBufferAttribute(this,t),wt.applyMatrix4(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)wt.fromBufferAttribute(this,t),wt.applyNormalMatrix(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)wt.fromBufferAttribute(this,t),wt.transformDirection(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ms(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Xt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ms(t,this.array)),t}setX(e,t){return this.normalized&&(t=Xt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ms(t,this.array)),t}setY(e,t){return this.normalized&&(t=Xt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ms(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Xt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ms(t,this.array)),t}setW(e,t){return this.normalized&&(t=Xt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Xt(t,this.array),n=Xt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=Xt(t,this.array),n=Xt(n,this.array),s=Xt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=Xt(t,this.array),n=Xt(n,this.array),s=Xt(s,this.array),r=Xt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==mh&&(e.usage=this.usage),e}};var Sa=class extends Vt{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var Ea=class extends Vt{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var Ze=class extends Vt{constructor(e,t,n){super(new Float32Array(e),t,n)}},Vf=0,mn=new Ke,Bo=new Rt,gs=new C,tn=new Gt,nr=new Gt,Lt=new C,at=class i extends ei{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Vf++}),this.uuid=Qi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(ku(e)?Ea:Sa)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Ge().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return mn.makeRotationFromQuaternion(e),this.applyMatrix4(mn),this}rotateX(e){return mn.makeRotationX(e),this.applyMatrix4(mn),this}rotateY(e){return mn.makeRotationY(e),this.applyMatrix4(mn),this}rotateZ(e){return mn.makeRotationZ(e),this.applyMatrix4(mn),this}translate(e,t,n){return mn.makeTranslation(e,t,n),this.applyMatrix4(mn),this}scale(e,t,n){return mn.makeScale(e,t,n),this.applyMatrix4(mn),this}lookAt(e){return Bo.lookAt(e),Bo.updateMatrix(),this.applyMatrix4(Bo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(gs).negate(),this.translate(gs.x,gs.y,gs.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let s=0,r=e.length;s<r;s++){let a=e[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Ze(n,3))}else{for(let n=0,s=t.count;n<s;n++){let r=e[n];t.setXYZ(n,r.x,r.y,r.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Gt);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];tn.setFromBufferAttribute(r),this.morphTargetsRelative?(Lt.addVectors(this.boundingBox.min,tn.min),this.boundingBox.expandByPoint(Lt),Lt.addVectors(this.boundingBox.max,tn.max),this.boundingBox.expandByPoint(Lt)):(this.boundingBox.expandByPoint(tn.min),this.boundingBox.expandByPoint(tn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ni);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new C,1/0);return}if(e){let n=this.boundingSphere.center;if(tn.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){let o=t[r];nr.setFromBufferAttribute(o),this.morphTargetsRelative?(Lt.addVectors(tn.min,nr.min),tn.expandByPoint(Lt),Lt.addVectors(tn.max,nr.max),tn.expandByPoint(Lt)):(tn.expandByPoint(nr.min),tn.expandByPoint(nr.max))}tn.getCenter(n);let s=0;for(let r=0,a=e.count;r<a;r++)Lt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Lt));if(t)for(let r=0,a=t.length;r<a;r++){let o=t[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Lt.fromBufferAttribute(o,c),l&&(gs.fromBufferAttribute(e,c),Lt.add(gs)),s=Math.max(s,n.distanceToSquared(Lt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Vt(new Float32Array(4*n.count),4));let a=this.getAttribute("tangent"),o=[],l=[];for(let L=0;L<n.count;L++)o[L]=new C,l[L]=new C;let c=new C,h=new C,u=new C,d=new ie,f=new ie,g=new ie,_=new C,m=new C;function p(L,E,y){c.fromBufferAttribute(n,L),h.fromBufferAttribute(n,E),u.fromBufferAttribute(n,y),d.fromBufferAttribute(r,L),f.fromBufferAttribute(r,E),g.fromBufferAttribute(r,y),h.sub(c),u.sub(c),f.sub(d),g.sub(d);let D=1/(f.x*g.y-g.x*f.y);isFinite(D)&&(_.copy(h).multiplyScalar(g.y).addScaledVector(u,-f.y).multiplyScalar(D),m.copy(u).multiplyScalar(f.x).addScaledVector(h,-g.x).multiplyScalar(D),o[L].add(_),o[E].add(_),o[y].add(_),l[L].add(m),l[E].add(m),l[y].add(m))}let S=this.groups;S.length===0&&(S=[{start:0,count:e.count}]);for(let L=0,E=S.length;L<E;++L){let y=S[L],D=y.start,H=y.count;for(let z=D,G=D+H;z<G;z+=3)p(e.getX(z+0),e.getX(z+1),e.getX(z+2))}let v=new C,x=new C,I=new C,T=new C;function R(L){I.fromBufferAttribute(s,L),T.copy(I);let E=o[L];v.copy(E),v.sub(I.multiplyScalar(I.dot(E))).normalize(),x.crossVectors(T,E);let D=x.dot(l[L])<0?-1:1;a.setXYZW(L,v.x,v.y,v.z,D)}for(let L=0,E=S.length;L<E;++L){let y=S[L],D=y.start,H=y.count;for(let z=D,G=D+H;z<G;z+=3)R(e.getX(z+0)),R(e.getX(z+1)),R(e.getX(z+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Vt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);let s=new C,r=new C,a=new C,o=new C,l=new C,c=new C,h=new C,u=new C;if(e)for(let d=0,f=e.count;d<f;d+=3){let g=e.getX(d+0),_=e.getX(d+1),m=e.getX(d+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,_),a.fromBufferAttribute(t,m),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,m),o.add(h),l.add(h),c.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,f=t.count;d<f;d+=3)s.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),a.fromBufferAttribute(t,d+2),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Lt.fromBufferAttribute(e,t),Lt.normalize(),e.setXYZ(t,Lt.x,Lt.y,Lt.z)}toNonIndexed(){function e(o,l){let c=o.array,h=o.itemSize,u=o.normalized,d=new c.constructor(l.length*h),f=0,g=0;for(let _=0,m=l.length;_<m;_++){o.isInterleavedBufferAttribute?f=l[_]*o.data.stride+o.offset:f=l[_]*h;for(let p=0;p<h;p++)d[g++]=c[f++]}return new Vt(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let o in s){let l=s[o],c=e(l,n);t.setAttribute(o,c)}let r=this.morphAttributes;for(let o in r){let l=[],c=r[o];for(let h=0,u=c.length;h<u;h++){let d=c[h],f=e(d,n);l.push(f)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){let f=c[u];h.push(f.toJSON(e.data))}h.length>0&&(s[l]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone(t));let s=e.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(t))}let r=e.morphAttributes;for(let c in r){let h=[],u=r[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let c=0,h=a.length;c<h;c++){let u=a[c];this.addGroup(u.start,u.count,u.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},Lh=new Ke,Oi=new Si,Gr=new ni,Uh=new C,Wr=new C,Xr=new C,qr=new C,zo=new C,Yr=new C,Nh=new C,$r=new C,je=class extends Rt{constructor(e=new at,t=new Nn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let o=this.morphTargetInfluences;if(r&&o){Yr.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=o[l],u=r[l];h!==0&&(zo.fromBufferAttribute(u,e),a?Yr.addScaledVector(zo,h):Yr.addScaledVector(zo.sub(t),h))}t.add(Yr)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Gr.copy(n.boundingSphere),Gr.applyMatrix4(r),Oi.copy(e.ray).recast(e.near),!(Gr.containsPoint(Oi.origin)===!1&&(Oi.intersectSphere(Gr,Uh)===null||Oi.origin.distanceToSquared(Uh)>(e.far-e.near)**2))&&(Lh.copy(r).invert(),Oi.copy(e.ray).applyMatrix4(Lh),!(n.boundingBox!==null&&Oi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Oi)))}_computeIntersections(e,t,n){let s,r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,_=d.length;g<_;g++){let m=d[g],p=a[m.materialIndex],S=Math.max(m.start,f.start),v=Math.min(o.count,Math.min(m.start+m.count,f.start+f.count));for(let x=S,I=v;x<I;x+=3){let T=o.getX(x),R=o.getX(x+1),L=o.getX(x+2);s=Zr(this,p,e,n,c,h,u,T,R,L),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let g=Math.max(0,f.start),_=Math.min(o.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){let S=o.getX(m),v=o.getX(m+1),x=o.getX(m+2);s=Zr(this,a,e,n,c,h,u,S,v,x),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,_=d.length;g<_;g++){let m=d[g],p=a[m.materialIndex],S=Math.max(m.start,f.start),v=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let x=S,I=v;x<I;x+=3){let T=x,R=x+1,L=x+2;s=Zr(this,p,e,n,c,h,u,T,R,L),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let g=Math.max(0,f.start),_=Math.min(l.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){let S=m,v=m+1,x=m+2;s=Zr(this,a,e,n,c,h,u,S,v,x),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}};function Gf(i,e,t,n,s,r,a,o){let l;if(e.side===Ht?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,e.side===bi,o),l===null)return null;$r.copy(o),$r.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo($r);return c<t.near||c>t.far?null:{distance:c,point:$r.clone(),object:i}}function Zr(i,e,t,n,s,r,a,o,l,c){i.getVertexPosition(o,Wr),i.getVertexPosition(l,Xr),i.getVertexPosition(c,qr);let h=Gf(i,e,t,n,Wr,Xr,qr,Nh);if(h){let u=new C;xi.getBarycoord(Nh,Wr,Xr,qr,u),s&&(h.uv=xi.getInterpolatedAttribute(s,o,l,c,u,new ie)),r&&(h.uv1=xi.getInterpolatedAttribute(r,o,l,c,u,new ie)),a&&(h.normal=xi.getInterpolatedAttribute(a,o,l,c,u,new C),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let d={a:o,b:l,c,normal:new C,materialIndex:0};xi.getNormal(Wr,Xr,qr,d.normal),h.face=d,h.barycoord=u}return h}var Ct=class i extends at{constructor(e=1,t=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let l=[],c=[],h=[],u=[],d=0,f=0;g("z","y","x",-1,-1,n,t,e,a,r,0),g("z","y","x",1,-1,n,t,-e,a,r,1),g("x","z","y",1,1,e,n,t,s,a,2),g("x","z","y",1,-1,e,n,-t,s,a,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new Ze(c,3)),this.setAttribute("normal",new Ze(h,3)),this.setAttribute("uv",new Ze(u,2));function g(_,m,p,S,v,x,I,T,R,L,E){let y=x/R,D=I/L,H=x/2,z=I/2,G=T/2,j=R+1,X=L+1,U=0,O=0,ee=new C;for(let $=0;$<X;$++){let he=$*D-z;for(let Ie=0;Ie<j;Ie++){let $e=Ie*y-H;ee[_]=$e*S,ee[m]=he*v,ee[p]=G,c.push(ee.x,ee.y,ee.z),ee[_]=0,ee[m]=0,ee[p]=T>0?1:-1,h.push(ee.x,ee.y,ee.z),u.push(Ie/R),u.push(1-$/L),U+=1}}for(let $=0;$<L;$++)for(let he=0;he<R;he++){let Ie=d+he+j*$,$e=d+he+j*($+1),Y=d+(he+1)+j*($+1),se=d+(he+1)+j*$;l.push(Ie,$e,se),l.push($e,Y,se),O+=6}o.addGroup(f,O,E),f+=O,d+=U}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function Ns(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone():Array.isArray(s)?e[t][n]=s.slice():e[t][n]=s}}return e}function qt(i){let e={};for(let t=0;t<i.length;t++){let n=Ns(i[t]);for(let s in n)e[s]=n[s]}return e}function Wf(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Vu(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:tt.workingColorSpace}var Xf={clone:Ns,merge:qt},qf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Yf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,On=class extends ii{static get type(){return"ShaderMaterial"}constructor(e){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=qf,this.fragmentShader=Yf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ns(e.uniforms),this.uniformsGroups=Wf(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?t.uniforms[s]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[s]={type:"m4",value:a.toArray()}:t.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},wa=class extends Rt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ke,this.projectionMatrix=new Ke,this.projectionMatrixInverse=new Ke,this.coordinateSystem=jn}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},_i=new C,Oh=new ie,Fh=new ie,Nt=class extends wa{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=gr*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Ts*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return gr*2*Math.atan(Math.tan(Ts*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){_i.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(_i.x,_i.y).multiplyScalar(-e/_i.z),_i.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(_i.x,_i.y).multiplyScalar(-e/_i.z)}getViewSize(e,t){return this.getViewBounds(e,Oh,Fh),t.subVectors(Fh,Oh)}setViewOffset(e,t,n,s,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Ts*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,t-=a.offsetY*n/c,s*=a.width/l,n*=a.height/c}let o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},_s=-90,ys=1,Gl=class extends Rt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Nt(_s,ys,e,t);s.layers=this.layers,this.add(s);let r=new Nt(_s,ys,e,t);r.layers=this.layers,this.add(r);let a=new Nt(_s,ys,e,t);a.layers=this.layers,this.add(a);let o=new Nt(_s,ys,e,t);o.layers=this.layers,this.add(o);let l=new Nt(_s,ys,e,t);l.layers=this.layers,this.add(l);let c=new Nt(_s,ys,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,a,o,l]=t;for(let c of t)this.remove(c);if(e===jn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===xa)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,l,c,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;let _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,s),e.render(t,r),e.setRenderTarget(n,1,s),e.render(t,a),e.setRenderTarget(n,2,s),e.render(t,o),e.setRenderTarget(n,3,s),e.render(t,l),e.setRenderTarget(n,4,s),e.render(t,c),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,s),e.render(t,h),e.setRenderTarget(u,d,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},Ta=class extends Jt{constructor(e,t,n,s,r,a,o,l,c,h){e=e!==void 0?e:[],t=t!==void 0?t:Is,super(e,t,n,s,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Wl=class extends ti{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new Ta(s,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Dn}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Ct(5,5,5),r=new On({name:"CubemapFromEquirect",uniforms:Ns(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ht,blending:vi});r.uniforms.tEquirect.value=t;let a=new je(s,r),o=t.minFilter;return t.minFilter===Wi&&(t.minFilter=Dn),new Gl(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,n,s){let r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,s);e.setRenderTarget(r)}},ko=new C,$f=new C,Zf=new Ge,nn=class{constructor(e=new C(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=ko.subVectors(n,t).cross($f.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let n=e.delta(ko),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Zf.getNormalMatrix(e),s=this.coplanarPoint(ko).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Fi=new ni,Jr=new C,yr=class{constructor(e=new nn,t=new nn,n=new nn,s=new nn,r=new nn,a=new nn){this.planes=[e,t,n,s,r,a]}set(e,t,n,s,r,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=jn){let n=this.planes,s=e.elements,r=s[0],a=s[1],o=s[2],l=s[3],c=s[4],h=s[5],u=s[6],d=s[7],f=s[8],g=s[9],_=s[10],m=s[11],p=s[12],S=s[13],v=s[14],x=s[15];if(n[0].setComponents(l-r,d-c,m-f,x-p).normalize(),n[1].setComponents(l+r,d+c,m+f,x+p).normalize(),n[2].setComponents(l+a,d+h,m+g,x+S).normalize(),n[3].setComponents(l-a,d-h,m-g,x-S).normalize(),n[4].setComponents(l-o,d-u,m-_,x-v).normalize(),t===jn)n[5].setComponents(l+o,d+u,m+_,x+v).normalize();else if(t===xa)n[5].setComponents(o,u,_,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Fi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Fi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Fi)}intersectsSprite(e){return Fi.center.set(0,0,0),Fi.radius=.7071067811865476,Fi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Fi)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(Jr.x=s.normal.x>0?e.max.x:e.min.x,Jr.y=s.normal.y>0?e.max.y:e.min.y,Jr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Jr)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};function Gu(){let i=null,e=!1,t=null,n=null;function s(r,a){t(r,a),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function Jf(i){let e=new WeakMap;function t(o,l){let c=o.array,h=o.usage,u=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,h),o.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:u}}function n(o,l,c){let h=l.array,u=l.updateRanges;if(i.bindBuffer(c,o),u.length===0)i.bufferSubData(c,0,h);else{u.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<u.length;f++){let g=u[d],_=u[f];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++d,u[d]=_)}u.length=d+1;for(let f=0,g=u.length;f<g;f++){let _=u[f];i.bufferSubData(c,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=e.get(o);l&&(i.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var si=class i extends at{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,a=t/2,o=Math.floor(n),l=Math.floor(s),c=o+1,h=l+1,u=e/o,d=t/l,f=[],g=[],_=[],m=[];for(let p=0;p<h;p++){let S=p*d-a;for(let v=0;v<c;v++){let x=v*u-r;g.push(x,-S,0),_.push(0,0,1),m.push(v/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let S=0;S<o;S++){let v=S+c*p,x=S+c*(p+1),I=S+1+c*(p+1),T=S+1+c*p;f.push(v,x,T),f.push(x,I,T)}this.setIndex(f),this.setAttribute("position",new Ze(g,3)),this.setAttribute("normal",new Ze(_,3)),this.setAttribute("uv",new Ze(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}},jf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Kf=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Qf=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,ep=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,tp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,np=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,ip=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,sp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,rp=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,ap=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,op=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,lp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,cp=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,hp=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,up=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,dp=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,fp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,pp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,mp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,gp=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,_p=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,yp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,xp=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,vp=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Mp=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,bp=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Sp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ep=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,wp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Tp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Ap="gl_FragColor = linearToOutputTexel( gl_FragColor );",Rp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Cp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Pp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Ip=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Dp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Lp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Up=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Np=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Op=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Fp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Bp=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,zp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,kp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Hp=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Vp=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Gp=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Wp=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Xp=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,qp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Yp=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,$p=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Zp=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Jp=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,jp=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Kp=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Qp=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,em=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,tm=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,nm=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,im=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,sm=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,rm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,am=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,om=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,lm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,cm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,hm=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,um=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,dm=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,fm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,pm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,mm=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,gm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,_m=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ym=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,xm=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,vm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Mm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,bm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Sm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Em=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,wm=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Tm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Am=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Rm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Cm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Pm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Im=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Dm=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Lm=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Um=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Nm=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Om=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Fm=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Bm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,zm=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,km=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Hm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Vm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Gm=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Wm=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Xm=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,qm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ym=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,$m=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Zm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Jm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,jm=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Km=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Qm=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,eg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,tg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ng=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,ig=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,sg=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,rg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,ag=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,og=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,cg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,hg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,ug=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,dg=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,fg=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,pg=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,mg=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,gg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,_g=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,yg=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,xg=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vg=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Mg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Sg=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Eg=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,wg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Tg=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ag=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Rg=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Cg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Xe={alphahash_fragment:jf,alphahash_pars_fragment:Kf,alphamap_fragment:Qf,alphamap_pars_fragment:ep,alphatest_fragment:tp,alphatest_pars_fragment:np,aomap_fragment:ip,aomap_pars_fragment:sp,batching_pars_vertex:rp,batching_vertex:ap,begin_vertex:op,beginnormal_vertex:lp,bsdfs:cp,iridescence_fragment:hp,bumpmap_pars_fragment:up,clipping_planes_fragment:dp,clipping_planes_pars_fragment:fp,clipping_planes_pars_vertex:pp,clipping_planes_vertex:mp,color_fragment:gp,color_pars_fragment:_p,color_pars_vertex:yp,color_vertex:xp,common:vp,cube_uv_reflection_fragment:Mp,defaultnormal_vertex:bp,displacementmap_pars_vertex:Sp,displacementmap_vertex:Ep,emissivemap_fragment:wp,emissivemap_pars_fragment:Tp,colorspace_fragment:Ap,colorspace_pars_fragment:Rp,envmap_fragment:Cp,envmap_common_pars_fragment:Pp,envmap_pars_fragment:Ip,envmap_pars_vertex:Dp,envmap_physical_pars_fragment:Gp,envmap_vertex:Lp,fog_vertex:Up,fog_pars_vertex:Np,fog_fragment:Op,fog_pars_fragment:Fp,gradientmap_pars_fragment:Bp,lightmap_pars_fragment:zp,lights_lambert_fragment:kp,lights_lambert_pars_fragment:Hp,lights_pars_begin:Vp,lights_toon_fragment:Wp,lights_toon_pars_fragment:Xp,lights_phong_fragment:qp,lights_phong_pars_fragment:Yp,lights_physical_fragment:$p,lights_physical_pars_fragment:Zp,lights_fragment_begin:Jp,lights_fragment_maps:jp,lights_fragment_end:Kp,logdepthbuf_fragment:Qp,logdepthbuf_pars_fragment:em,logdepthbuf_pars_vertex:tm,logdepthbuf_vertex:nm,map_fragment:im,map_pars_fragment:sm,map_particle_fragment:rm,map_particle_pars_fragment:am,metalnessmap_fragment:om,metalnessmap_pars_fragment:lm,morphinstance_vertex:cm,morphcolor_vertex:hm,morphnormal_vertex:um,morphtarget_pars_vertex:dm,morphtarget_vertex:fm,normal_fragment_begin:pm,normal_fragment_maps:mm,normal_pars_fragment:gm,normal_pars_vertex:_m,normal_vertex:ym,normalmap_pars_fragment:xm,clearcoat_normal_fragment_begin:vm,clearcoat_normal_fragment_maps:Mm,clearcoat_pars_fragment:bm,iridescence_pars_fragment:Sm,opaque_fragment:Em,packing:wm,premultiplied_alpha_fragment:Tm,project_vertex:Am,dithering_fragment:Rm,dithering_pars_fragment:Cm,roughnessmap_fragment:Pm,roughnessmap_pars_fragment:Im,shadowmap_pars_fragment:Dm,shadowmap_pars_vertex:Lm,shadowmap_vertex:Um,shadowmask_pars_fragment:Nm,skinbase_vertex:Om,skinning_pars_vertex:Fm,skinning_vertex:Bm,skinnormal_vertex:zm,specularmap_fragment:km,specularmap_pars_fragment:Hm,tonemapping_fragment:Vm,tonemapping_pars_fragment:Gm,transmission_fragment:Wm,transmission_pars_fragment:Xm,uv_pars_fragment:qm,uv_pars_vertex:Ym,uv_vertex:$m,worldpos_vertex:Zm,background_vert:Jm,background_frag:jm,backgroundCube_vert:Km,backgroundCube_frag:Qm,cube_vert:eg,cube_frag:tg,depth_vert:ng,depth_frag:ig,distanceRGBA_vert:sg,distanceRGBA_frag:rg,equirect_vert:ag,equirect_frag:og,linedashed_vert:lg,linedashed_frag:cg,meshbasic_vert:hg,meshbasic_frag:ug,meshlambert_vert:dg,meshlambert_frag:fg,meshmatcap_vert:pg,meshmatcap_frag:mg,meshnormal_vert:gg,meshnormal_frag:_g,meshphong_vert:yg,meshphong_frag:xg,meshphysical_vert:vg,meshphysical_frag:Mg,meshtoon_vert:bg,meshtoon_frag:Sg,points_vert:Eg,points_frag:wg,shadow_vert:Tg,shadow_frag:Ag,sprite_vert:Rg,sprite_frag:Cg},de={common:{diffuse:{value:new qe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ge}},envmap:{envMap:{value:null},envMapRotation:{value:new Ge},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ge}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ge}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ge},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ge},normalScale:{value:new ie(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ge},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ge}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ge}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ge}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new qe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new qe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0},uvTransform:{value:new Ge}},sprite:{diffuse:{value:new qe(16777215)},opacity:{value:1},center:{value:new ie(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}}},In={basic:{uniforms:qt([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.fog]),vertexShader:Xe.meshbasic_vert,fragmentShader:Xe.meshbasic_frag},lambert:{uniforms:qt([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.fog,de.lights,{emissive:{value:new qe(0)}}]),vertexShader:Xe.meshlambert_vert,fragmentShader:Xe.meshlambert_frag},phong:{uniforms:qt([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.fog,de.lights,{emissive:{value:new qe(0)},specular:{value:new qe(1118481)},shininess:{value:30}}]),vertexShader:Xe.meshphong_vert,fragmentShader:Xe.meshphong_frag},standard:{uniforms:qt([de.common,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.roughnessmap,de.metalnessmap,de.fog,de.lights,{emissive:{value:new qe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Xe.meshphysical_vert,fragmentShader:Xe.meshphysical_frag},toon:{uniforms:qt([de.common,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.gradientmap,de.fog,de.lights,{emissive:{value:new qe(0)}}]),vertexShader:Xe.meshtoon_vert,fragmentShader:Xe.meshtoon_frag},matcap:{uniforms:qt([de.common,de.bumpmap,de.normalmap,de.displacementmap,de.fog,{matcap:{value:null}}]),vertexShader:Xe.meshmatcap_vert,fragmentShader:Xe.meshmatcap_frag},points:{uniforms:qt([de.points,de.fog]),vertexShader:Xe.points_vert,fragmentShader:Xe.points_frag},dashed:{uniforms:qt([de.common,de.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Xe.linedashed_vert,fragmentShader:Xe.linedashed_frag},depth:{uniforms:qt([de.common,de.displacementmap]),vertexShader:Xe.depth_vert,fragmentShader:Xe.depth_frag},normal:{uniforms:qt([de.common,de.bumpmap,de.normalmap,de.displacementmap,{opacity:{value:1}}]),vertexShader:Xe.meshnormal_vert,fragmentShader:Xe.meshnormal_frag},sprite:{uniforms:qt([de.sprite,de.fog]),vertexShader:Xe.sprite_vert,fragmentShader:Xe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ge},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Xe.background_vert,fragmentShader:Xe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ge}},vertexShader:Xe.backgroundCube_vert,fragmentShader:Xe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Xe.cube_vert,fragmentShader:Xe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Xe.equirect_vert,fragmentShader:Xe.equirect_frag},distanceRGBA:{uniforms:qt([de.common,de.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Xe.distanceRGBA_vert,fragmentShader:Xe.distanceRGBA_frag},shadow:{uniforms:qt([de.lights,de.fog,{color:{value:new qe(0)},opacity:{value:1}}]),vertexShader:Xe.shadow_vert,fragmentShader:Xe.shadow_frag}};In.physical={uniforms:qt([In.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ge},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ge},clearcoatNormalScale:{value:new ie(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ge},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ge},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ge},sheen:{value:0},sheenColor:{value:new qe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ge},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ge},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ge},transmissionSamplerSize:{value:new ie},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ge},attenuationDistance:{value:0},attenuationColor:{value:new qe(0)},specularColor:{value:new qe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ge},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ge},anisotropyVector:{value:new ie},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ge}}]),vertexShader:Xe.meshphysical_vert,fragmentShader:Xe.meshphysical_frag};var jr={r:0,b:0,g:0},Bi=new Un,Pg=new Ke;function Ig(i,e,t,n,s,r,a){let o=new qe(0),l=r===!0?0:1,c,h,u=null,d=0,f=null;function g(S){let v=S.isScene===!0?S.background:null;return v&&v.isTexture&&(v=(S.backgroundBlurriness>0?t:e).get(v)),v}function _(S){let v=!1,x=g(S);x===null?p(o,l):x&&x.isColor&&(p(x,1),v=!0);let I=i.xr.getEnvironmentBlendMode();I==="additive"?n.buffers.color.setClear(0,0,0,1,a):I==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||v)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(S,v){let x=g(v);x&&(x.isCubeTexture||x.mapping===$a)?(h===void 0&&(h=new je(new Ct(1,1,1),new On({name:"BackgroundCubeMaterial",uniforms:Ns(In.backgroundCube.uniforms),vertexShader:In.backgroundCube.vertexShader,fragmentShader:In.backgroundCube.fragmentShader,side:Ht,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(I,T,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),Bi.copy(v.backgroundRotation),Bi.x*=-1,Bi.y*=-1,Bi.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(Bi.y*=-1,Bi.z*=-1),h.material.uniforms.envMap.value=x,h.material.uniforms.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Pg.makeRotationFromEuler(Bi)),h.material.toneMapped=tt.getTransfer(x.colorSpace)!==lt,(u!==x||d!==x.version||f!==i.toneMapping)&&(h.material.needsUpdate=!0,u=x,d=x.version,f=i.toneMapping),h.layers.enableAll(),S.unshift(h,h.geometry,h.material,0,0,null)):x&&x.isTexture&&(c===void 0&&(c=new je(new si(2,2),new On({name:"BackgroundMaterial",uniforms:Ns(In.background.uniforms),vertexShader:In.background.vertexShader,fragmentShader:In.background.fragmentShader,side:bi,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=x,c.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,c.material.toneMapped=tt.getTransfer(x.colorSpace)!==lt,x.matrixAutoUpdate===!0&&x.updateMatrix(),c.material.uniforms.uvTransform.value.copy(x.matrix),(u!==x||d!==x.version||f!==i.toneMapping)&&(c.material.needsUpdate=!0,u=x,d=x.version,f=i.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null))}function p(S,v){S.getRGB(jr,Vu(i)),n.buffers.color.setClear(jr.r,jr.g,jr.b,v,a)}return{getClearColor:function(){return o},setClearColor:function(S,v=1){o.set(S),l=v,p(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(S){l=S,p(o,l)},render:_,addToRenderList:m}}function Dg(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null),r=s,a=!1;function o(y,D,H,z,G){let j=!1,X=u(z,H,D);r!==X&&(r=X,c(r.object)),j=f(y,z,H,G),j&&g(y,z,H,G),G!==null&&e.update(G,i.ELEMENT_ARRAY_BUFFER),(j||a)&&(a=!1,x(y,D,H,z),G!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(G).buffer))}function l(){return i.createVertexArray()}function c(y){return i.bindVertexArray(y)}function h(y){return i.deleteVertexArray(y)}function u(y,D,H){let z=H.wireframe===!0,G=n[y.id];G===void 0&&(G={},n[y.id]=G);let j=G[D.id];j===void 0&&(j={},G[D.id]=j);let X=j[z];return X===void 0&&(X=d(l()),j[z]=X),X}function d(y){let D=[],H=[],z=[];for(let G=0;G<t;G++)D[G]=0,H[G]=0,z[G]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:H,attributeDivisors:z,object:y,attributes:{},index:null}}function f(y,D,H,z){let G=r.attributes,j=D.attributes,X=0,U=H.getAttributes();for(let O in U)if(U[O].location>=0){let $=G[O],he=j[O];if(he===void 0&&(O==="instanceMatrix"&&y.instanceMatrix&&(he=y.instanceMatrix),O==="instanceColor"&&y.instanceColor&&(he=y.instanceColor)),$===void 0||$.attribute!==he||he&&$.data!==he.data)return!0;X++}return r.attributesNum!==X||r.index!==z}function g(y,D,H,z){let G={},j=D.attributes,X=0,U=H.getAttributes();for(let O in U)if(U[O].location>=0){let $=j[O];$===void 0&&(O==="instanceMatrix"&&y.instanceMatrix&&($=y.instanceMatrix),O==="instanceColor"&&y.instanceColor&&($=y.instanceColor));let he={};he.attribute=$,$&&$.data&&(he.data=$.data),G[O]=he,X++}r.attributes=G,r.attributesNum=X,r.index=z}function _(){let y=r.newAttributes;for(let D=0,H=y.length;D<H;D++)y[D]=0}function m(y){p(y,0)}function p(y,D){let H=r.newAttributes,z=r.enabledAttributes,G=r.attributeDivisors;H[y]=1,z[y]===0&&(i.enableVertexAttribArray(y),z[y]=1),G[y]!==D&&(i.vertexAttribDivisor(y,D),G[y]=D)}function S(){let y=r.newAttributes,D=r.enabledAttributes;for(let H=0,z=D.length;H<z;H++)D[H]!==y[H]&&(i.disableVertexAttribArray(H),D[H]=0)}function v(y,D,H,z,G,j,X){X===!0?i.vertexAttribIPointer(y,D,H,G,j):i.vertexAttribPointer(y,D,H,z,G,j)}function x(y,D,H,z){_();let G=z.attributes,j=H.getAttributes(),X=D.defaultAttributeValues;for(let U in j){let O=j[U];if(O.location>=0){let ee=G[U];if(ee===void 0&&(U==="instanceMatrix"&&y.instanceMatrix&&(ee=y.instanceMatrix),U==="instanceColor"&&y.instanceColor&&(ee=y.instanceColor)),ee!==void 0){let $=ee.normalized,he=ee.itemSize,Ie=e.get(ee);if(Ie===void 0)continue;let $e=Ie.buffer,Y=Ie.type,se=Ie.bytesPerElement,me=Y===i.INT||Y===i.UNSIGNED_INT||ee.gpuType===wc;if(ee.isInterleavedBufferAttribute){let ce=ee.data,De=ce.stride,Be=ee.offset;if(ce.isInstancedInterleavedBuffer){for(let Oe=0;Oe<O.locationSize;Oe++)p(O.location+Oe,ce.meshPerAttribute);y.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=ce.meshPerAttribute*ce.count)}else for(let Oe=0;Oe<O.locationSize;Oe++)m(O.location+Oe);i.bindBuffer(i.ARRAY_BUFFER,$e);for(let Oe=0;Oe<O.locationSize;Oe++)v(O.location+Oe,he/O.locationSize,Y,$,De*se,(Be+he/O.locationSize*Oe)*se,me)}else{if(ee.isInstancedBufferAttribute){for(let ce=0;ce<O.locationSize;ce++)p(O.location+ce,ee.meshPerAttribute);y.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=ee.meshPerAttribute*ee.count)}else for(let ce=0;ce<O.locationSize;ce++)m(O.location+ce);i.bindBuffer(i.ARRAY_BUFFER,$e);for(let ce=0;ce<O.locationSize;ce++)v(O.location+ce,he/O.locationSize,Y,$,he*se,he/O.locationSize*ce*se,me)}}else if(X!==void 0){let $=X[U];if($!==void 0)switch($.length){case 2:i.vertexAttrib2fv(O.location,$);break;case 3:i.vertexAttrib3fv(O.location,$);break;case 4:i.vertexAttrib4fv(O.location,$);break;default:i.vertexAttrib1fv(O.location,$)}}}}S()}function I(){L();for(let y in n){let D=n[y];for(let H in D){let z=D[H];for(let G in z)h(z[G].object),delete z[G];delete D[H]}delete n[y]}}function T(y){if(n[y.id]===void 0)return;let D=n[y.id];for(let H in D){let z=D[H];for(let G in z)h(z[G].object),delete z[G];delete D[H]}delete n[y.id]}function R(y){for(let D in n){let H=n[D];if(H[y.id]===void 0)continue;let z=H[y.id];for(let G in z)h(z[G].object),delete z[G];delete H[y.id]}}function L(){E(),a=!0,r!==s&&(r=s,c(r.object))}function E(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:L,resetDefaultState:E,dispose:I,releaseStatesOfGeometry:T,releaseStatesOfProgram:R,initAttributes:_,enableAttribute:m,disableUnusedAttributes:S}}function Lg(i,e,t){let n;function s(c){n=c}function r(c,h){i.drawArrays(n,c,h),t.update(h,n,1)}function a(c,h,u){u!==0&&(i.drawArraysInstanced(n,c,h,u),t.update(h,n,u))}function o(c,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,u);let f=0;for(let g=0;g<u;g++)f+=h[g];t.update(f,n,1)}function l(c,h,u,d){if(u===0)return;let f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<c.length;g++)a(c[g],h[g],d[g]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,h,0,d,0,u);let g=0;for(let _=0;_<u;_++)g+=h[_]*d[_];t.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function Ug(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let R=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(R){return!(R!==Sn&&n.convert(R)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(R){let L=R===Ar&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(R!==Qn&&n.convert(R)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&R!==Ln&&!L)}function l(R){if(R==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",h=l(c);h!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let u=t.logarithmicDepthBuffer===!0,d=t.reverseDepthBuffer===!0&&e.has("EXT_clip_control"),f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),S=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),v=i.getParameter(i.MAX_VARYING_VECTORS),x=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),I=g>0,T=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:u,reverseDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:S,maxVaryings:v,maxFragmentUniforms:x,vertexTextures:I,maxSamples:T}}function Ng(i){let e=this,t=null,n=0,s=!1,r=!1,a=new nn,o=new Ge,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){let f=u.length!==0||d||n!==0||s;return s=d,n=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){t=h(u,d,0)},this.setState=function(u,d,f){let g=u.clippingPlanes,_=u.clipIntersection,m=u.clipShadows,p=i.get(u);if(!s||g===null||g.length===0||r&&!m)r?h(null):c();else{let S=r?0:n,v=S*4,x=p.clippingState||null;l.value=x,x=h(g,d,v,f);for(let I=0;I!==v;++I)x[I]=t[I];p.clippingState=x,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,d,f,g){let _=u!==null?u.length:0,m=null;if(_!==0){if(m=l.value,g!==!0||m===null){let p=f+_*4,S=d.matrixWorldInverse;o.getNormalMatrix(S),(m===null||m.length<p)&&(m=new Float32Array(p));for(let v=0,x=f;v!==_;++v,x+=4)a.copy(u[v]).applyMatrix4(S,o),a.normal.toArray(m,x),m[x+3]=a.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,m}}function Og(i){let e=new WeakMap;function t(a,o){return o===hl?a.mapping=Is:o===ul&&(a.mapping=Ds),a}function n(a){if(a&&a.isTexture){let o=a.mapping;if(o===hl||o===ul)if(e.has(a)){let l=e.get(a).texture;return t(l,a.mapping)}else{let l=a.image;if(l&&l.height>0){let c=new Wl(l.height);return c.fromEquirectangularTexture(i,a),e.set(a,c),a.addEventListener("dispose",s),t(c.texture,a.mapping)}else return null}}return a}function s(a){let o=a.target;o.removeEventListener("dispose",s);let l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}var Os=class extends wa{constructor(e=-1,t=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,a=n+e,o=s+t,l=s-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},bs=4,Bh=[.125,.215,.35,.446,.526,.582],Vi=20,Ho=new Os,zh=new qe,Vo=null,Go=0,Wo=0,Xo=!1,ki=(1+Math.sqrt(5))/2,xs=1/ki,kh=[new C(-ki,xs,0),new C(ki,xs,0),new C(-xs,0,ki),new C(xs,0,ki),new C(0,ki,-xs),new C(0,ki,xs),new C(-1,1,-1),new C(1,1,-1),new C(-1,1,1),new C(1,1,1)],Fs=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,s=100){Vo=this._renderer.getRenderTarget(),Go=this._renderer.getActiveCubeFace(),Wo=this._renderer.getActiveMipmapLevel(),Xo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);let r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(e,n,s,r),t>0&&this._blur(r,0,0,t),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Gh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Vh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Vo,Go,Wo),this._renderer.xr.enabled=Xo,e.scissorTest=!1,Kr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Is||e.mapping===Ds?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Vo=this._renderer.getRenderTarget(),Go=this._renderer.getActiveCubeFace(),Wo=this._renderer.getActiveMipmapLevel(),Xo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Dn,minFilter:Dn,generateMipmaps:!1,type:Ar,format:Sn,colorSpace:Xs,depthBuffer:!1},s=Hh(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Hh(e,t,n);let{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Fg(r)),this._blurMaterial=Bg(r,e,t)}return s}_compileMaterial(e){let t=new je(this._lodPlanes[0],e);this._renderer.compile(t,Ho)}_sceneToCubeUV(e,t,n,s){let o=new Nt(90,1,t,n),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,d=h.toneMapping;h.getClearColor(zh),h.toneMapping=Mi,h.autoClear=!1;let f=new Nn({name:"PMREM.Background",side:Ht,depthWrite:!1,depthTest:!1}),g=new je(new Ct,f),_=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,_=!0):(f.color.copy(zh),_=!0);for(let p=0;p<6;p++){let S=p%3;S===0?(o.up.set(0,l[p],0),o.lookAt(c[p],0,0)):S===1?(o.up.set(0,0,l[p]),o.lookAt(0,c[p],0)):(o.up.set(0,l[p],0),o.lookAt(0,0,c[p]));let v=this._cubeSize;Kr(s,S*v,p>2?v:0,v,v),h.setRenderTarget(s),_&&h.render(g,o),h.render(e,o)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=d,h.autoClear=u,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===Is||e.mapping===Ds;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Gh()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Vh());let r=s?this._cubemapMaterial:this._equirectMaterial,a=new je(this._lodPlanes[0],r),o=r.uniforms;o.envMap.value=e;let l=this._cubeSize;Kr(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(a,Ho)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodPlanes.length;for(let r=1;r<s;r++){let a=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),o=kh[(s-r-1)%kh.length];this._blur(e,r-1,r,a,o)}t.autoClear=n}_blur(e,t,n,s,r){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,s,"latitudinal",r),this._halfBlur(a,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,a,o){let l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,u=new je(this._lodPlanes[s],c),d=c.uniforms,f=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*Vi-1),_=r/g,m=isFinite(r)?1+Math.floor(h*_):Vi;m>Vi&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Vi}`);let p=[],S=0;for(let R=0;R<Vi;++R){let L=R/_,E=Math.exp(-L*L/2);p.push(E),R===0?S+=E:R<m&&(S+=2*E)}for(let R=0;R<p.length;R++)p[R]=p[R]/S;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=a==="latitudinal",o&&(d.poleAxis.value=o);let{_lodMax:v}=this;d.dTheta.value=g,d.mipInt.value=v-n;let x=this._sizeLods[s],I=3*x*(s>v-bs?s-v+bs:0),T=4*(this._cubeSize-x);Kr(t,I,T,3*x,2*x),l.setRenderTarget(t),l.render(u,Ho)}};function Fg(i){let e=[],t=[],n=[],s=i,r=i-bs+1+Bh.length;for(let a=0;a<r;a++){let o=Math.pow(2,s);t.push(o);let l=1/o;a>i-bs?l=Bh[a-i+bs-1]:a===0&&(l=0),n.push(l);let c=1/(o-2),h=-c,u=1+c,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,g=6,_=3,m=2,p=1,S=new Float32Array(_*g*f),v=new Float32Array(m*g*f),x=new Float32Array(p*g*f);for(let T=0;T<f;T++){let R=T%3*2/3-1,L=T>2?0:-1,E=[R,L,0,R+2/3,L,0,R+2/3,L+1,0,R,L,0,R+2/3,L+1,0,R,L+1,0];S.set(E,_*g*T),v.set(d,m*g*T);let y=[T,T,T,T,T,T];x.set(y,p*g*T)}let I=new at;I.setAttribute("position",new Vt(S,_)),I.setAttribute("uv",new Vt(v,m)),I.setAttribute("faceIndex",new Vt(x,p)),e.push(I),s>bs&&s--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function Hh(i,e,t){let n=new ti(i,e,t);return n.texture.mapping=$a,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Kr(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function Bg(i,e,t){let n=new Float32Array(Vi),s=new C(0,1,0);return new On({name:"SphericalGaussianBlur",defines:{n:Vi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Lc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:vi,depthTest:!1,depthWrite:!1})}function Vh(){return new On({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Lc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:vi,depthTest:!1,depthWrite:!1})}function Gh(){return new On({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Lc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:vi,depthTest:!1,depthWrite:!1})}function Lc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function zg(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){let l=o.mapping,c=l===hl||l===ul,h=l===Is||l===Ds;if(c||h){let u=e.get(o),d=u!==void 0?u.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==d)return t===null&&(t=new Fs(i)),u=c?t.fromEquirectangular(o,u):t.fromCubemap(o,u),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),u.texture;if(u!==void 0)return u.texture;{let f=o.image;return c&&f&&f.height>0||h&&f&&s(f)?(t===null&&(t=new Fs(i)),u=c?t.fromEquirectangular(o):t.fromCubemap(o),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),o.addEventListener("dispose",r),u.texture):null}}}return o}function s(o){let l=0,c=6;for(let h=0;h<c;h++)o[h]!==void 0&&l++;return l===c}function r(o){let l=o.target;l.removeEventListener("dispose",r);let c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function kg(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let s=t(n);return s===null&&or("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function Hg(i,e,t,n){let s={},r=new WeakMap;function a(u){let d=u.target;d.index!==null&&e.remove(d.index);for(let g in d.attributes)e.remove(d.attributes[g]);for(let g in d.morphAttributes){let _=d.morphAttributes[g];for(let m=0,p=_.length;m<p;m++)e.remove(_[m])}d.removeEventListener("dispose",a),delete s[d.id];let f=r.get(d);f&&(e.remove(f),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function o(u,d){return s[d.id]===!0||(d.addEventListener("dispose",a),s[d.id]=!0,t.memory.geometries++),d}function l(u){let d=u.attributes;for(let g in d)e.update(d[g],i.ARRAY_BUFFER);let f=u.morphAttributes;for(let g in f){let _=f[g];for(let m=0,p=_.length;m<p;m++)e.update(_[m],i.ARRAY_BUFFER)}}function c(u){let d=[],f=u.index,g=u.attributes.position,_=0;if(f!==null){let S=f.array;_=f.version;for(let v=0,x=S.length;v<x;v+=3){let I=S[v+0],T=S[v+1],R=S[v+2];d.push(I,T,T,R,R,I)}}else if(g!==void 0){let S=g.array;_=g.version;for(let v=0,x=S.length/3-1;v<x;v+=3){let I=v+0,T=v+1,R=v+2;d.push(I,T,T,R,R,I)}}else return;let m=new(ku(d)?Ea:Sa)(d,1);m.version=_;let p=r.get(u);p&&e.remove(p),r.set(u,m)}function h(u){let d=r.get(u);if(d){let f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return r.get(u)}return{get:o,update:l,getWireframeAttribute:h}}function Vg(i,e,t){let n;function s(d){n=d}let r,a;function o(d){r=d.type,a=d.bytesPerElement}function l(d,f){i.drawElements(n,f,r,d*a),t.update(f,n,1)}function c(d,f,g){g!==0&&(i.drawElementsInstanced(n,f,r,d*a,g),t.update(f,n,g))}function h(d,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,r,d,0,g);let m=0;for(let p=0;p<g;p++)m+=f[p];t.update(m,n,1)}function u(d,f,g,_){if(g===0)return;let m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)c(d[p]/a,f[p],_[p]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,r,d,0,_,0,g);let p=0;for(let S=0;S<g;S++)p+=f[S]*_[S];t.update(p,n,1)}}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Gg(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(r/3);break;case i.LINES:t.lines+=o*(r/2);break;case i.LINE_STRIP:t.lines+=o*(r-1);break;case i.LINE_LOOP:t.lines+=o*r;break;case i.POINTS:t.points+=o*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function Wg(i,e,t){let n=new WeakMap,s=new ct;function r(a,o,l){let c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=h!==void 0?h.length:0,d=n.get(o);if(d===void 0||d.count!==u){let E=function(){R.dispose(),n.delete(o),o.removeEventListener("dispose",E)};d!==void 0&&d.texture.dispose();let f=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,_=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],S=o.morphAttributes.color||[],v=0;f===!0&&(v=1),g===!0&&(v=2),_===!0&&(v=3);let x=o.attributes.position.count*v,I=1;x>e.maxTextureSize&&(I=Math.ceil(x/e.maxTextureSize),x=e.maxTextureSize);let T=new Float32Array(x*I*4*u),R=new ba(T,x,I,u);R.type=Ln,R.needsUpdate=!0;let L=v*4;for(let y=0;y<u;y++){let D=m[y],H=p[y],z=S[y],G=x*I*4*y;for(let j=0;j<D.count;j++){let X=j*L;f===!0&&(s.fromBufferAttribute(D,j),T[G+X+0]=s.x,T[G+X+1]=s.y,T[G+X+2]=s.z,T[G+X+3]=0),g===!0&&(s.fromBufferAttribute(H,j),T[G+X+4]=s.x,T[G+X+5]=s.y,T[G+X+6]=s.z,T[G+X+7]=0),_===!0&&(s.fromBufferAttribute(z,j),T[G+X+8]=s.x,T[G+X+9]=s.y,T[G+X+10]=s.z,T[G+X+11]=z.itemSize===4?s.w:1)}}d={count:u,texture:R,size:new ie(x,I)},n.set(o,d),o.addEventListener("dispose",E)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let f=0;for(let _=0;_<c.length;_++)f+=c[_];let g=o.morphTargetsRelative?1:1-f;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function Xg(i,e,t,n){let s=new WeakMap;function r(l){let c=n.render.frame,h=l.geometry,u=e.get(l,h);if(s.get(u)!==c&&(e.update(u),s.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),s.get(l)!==c&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){let d=l.skeleton;s.get(d)!==c&&(d.update(),s.set(d,c))}return u}function a(){s=new WeakMap}function o(l){let c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:r,dispose:a}}var Aa=class extends Jt{constructor(e,t,n,s,r,a,o,l,c,h=ws){if(h!==ws&&h!==Us)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===ws&&(n=Xi),n===void 0&&h===Us&&(n=Ls),super(null,s,r,a,o,l,h,n,c),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:rn,this.minFilter=l!==void 0?l:rn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Wu=new Jt,Wh=new Aa(1,1),Xu=new ba,qu=new Vl,Yu=new Ta,Xh=[],qh=[],Yh=new Float32Array(16),$h=new Float32Array(9),Zh=new Float32Array(4);function qs(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=Xh[s];if(r===void 0&&(r=new Float32Array(s),Xh[s]=r),e!==0){n.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(r,o)}return r}function Pt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function It(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Ja(i,e){let t=qh[e];t===void 0&&(t=new Int32Array(e),qh[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function qg(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function Yg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2fv(this.addr,e),It(t,e)}}function $g(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Pt(t,e))return;i.uniform3fv(this.addr,e),It(t,e)}}function Zg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4fv(this.addr,e),It(t,e)}}function Jg(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),It(t,e)}else{if(Pt(t,n))return;Zh.set(n),i.uniformMatrix2fv(this.addr,!1,Zh),It(t,n)}}function jg(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),It(t,e)}else{if(Pt(t,n))return;$h.set(n),i.uniformMatrix3fv(this.addr,!1,$h),It(t,n)}}function Kg(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),It(t,e)}else{if(Pt(t,n))return;Yh.set(n),i.uniformMatrix4fv(this.addr,!1,Yh),It(t,n)}}function Qg(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function e0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2iv(this.addr,e),It(t,e)}}function t0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;i.uniform3iv(this.addr,e),It(t,e)}}function n0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4iv(this.addr,e),It(t,e)}}function i0(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function s0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2uiv(this.addr,e),It(t,e)}}function r0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;i.uniform3uiv(this.addr,e),It(t,e)}}function a0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4uiv(this.addr,e),It(t,e)}}function o0(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Wh.compareFunction=zu,r=Wh):r=Wu,t.setTexture2D(e||r,s)}function l0(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||qu,s)}function c0(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||Yu,s)}function h0(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||Xu,s)}function u0(i){switch(i){case 5126:return qg;case 35664:return Yg;case 35665:return $g;case 35666:return Zg;case 35674:return Jg;case 35675:return jg;case 35676:return Kg;case 5124:case 35670:return Qg;case 35667:case 35671:return e0;case 35668:case 35672:return t0;case 35669:case 35673:return n0;case 5125:return i0;case 36294:return s0;case 36295:return r0;case 36296:return a0;case 35678:case 36198:case 36298:case 36306:case 35682:return o0;case 35679:case 36299:case 36307:return l0;case 35680:case 36300:case 36308:case 36293:return c0;case 36289:case 36303:case 36311:case 36292:return h0}}function d0(i,e){i.uniform1fv(this.addr,e)}function f0(i,e){let t=qs(e,this.size,2);i.uniform2fv(this.addr,t)}function p0(i,e){let t=qs(e,this.size,3);i.uniform3fv(this.addr,t)}function m0(i,e){let t=qs(e,this.size,4);i.uniform4fv(this.addr,t)}function g0(i,e){let t=qs(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function _0(i,e){let t=qs(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function y0(i,e){let t=qs(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function x0(i,e){i.uniform1iv(this.addr,e)}function v0(i,e){i.uniform2iv(this.addr,e)}function M0(i,e){i.uniform3iv(this.addr,e)}function b0(i,e){i.uniform4iv(this.addr,e)}function S0(i,e){i.uniform1uiv(this.addr,e)}function E0(i,e){i.uniform2uiv(this.addr,e)}function w0(i,e){i.uniform3uiv(this.addr,e)}function T0(i,e){i.uniform4uiv(this.addr,e)}function A0(i,e,t){let n=this.cache,s=e.length,r=Ja(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTexture2D(e[a]||Wu,r[a])}function R0(i,e,t){let n=this.cache,s=e.length,r=Ja(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTexture3D(e[a]||qu,r[a])}function C0(i,e,t){let n=this.cache,s=e.length,r=Ja(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTextureCube(e[a]||Yu,r[a])}function P0(i,e,t){let n=this.cache,s=e.length,r=Ja(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTexture2DArray(e[a]||Xu,r[a])}function I0(i){switch(i){case 5126:return d0;case 35664:return f0;case 35665:return p0;case 35666:return m0;case 35674:return g0;case 35675:return _0;case 35676:return y0;case 5124:case 35670:return x0;case 35667:case 35671:return v0;case 35668:case 35672:return M0;case 35669:case 35673:return b0;case 5125:return S0;case 36294:return E0;case 36295:return w0;case 36296:return T0;case 35678:case 36198:case 36298:case 36306:case 35682:return A0;case 35679:case 36299:case 36307:return R0;case 35680:case 36300:case 36308:case 36293:return C0;case 36289:case 36303:case 36311:case 36292:return P0}}var Xl=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=u0(t.type)}},ql=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=I0(t.type)}},Yl=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(e,t[o.id],n)}}},qo=/(\w+)(\])?(\[|\.)?/g;function Jh(i,e){i.seq.push(e),i.map[e.id]=e}function D0(i,e,t){let n=i.name,s=n.length;for(qo.lastIndex=0;;){let r=qo.exec(n),a=qo.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){Jh(t,c===void 0?new Xl(o,i,e):new ql(o,i,e));break}else{let u=t.map[o];u===void 0&&(u=new Yl(o),Jh(t,u)),t=u}}}var Rs=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){let r=e.getActiveUniform(t,s),a=e.getUniformLocation(t,r.name);D0(r,a,this)}}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,a=t.length;r!==a;++r){let o=t[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let a=e[s];a.id in t&&n.push(a)}return n}};function jh(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var L0=37297,U0=0;function N0(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}var Kh=new Ge;function O0(i){tt._getMatrix(Kh,tt.workingColorSpace,i);let e=`mat3( ${Kh.elements.map(t=>t.toFixed(4))} )`;switch(tt.getTransfer(i)){case Za:return[e,"LinearTransferOETF"];case lt:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Qh(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),s=i.getShaderInfoLog(e).trim();if(n&&s==="")return"";let r=/ERROR: 0:(\d+)/.exec(s);if(r){let a=parseInt(r[1]);return t.toUpperCase()+`

`+s+`

`+N0(i.getShaderSource(e),a)}else return s}function F0(i,e){let t=O0(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function B0(i,e){let t;switch(e){case $d:t="Linear";break;case Zd:t="Reinhard";break;case Jd:t="Cineon";break;case Ec:t="ACESFilmic";break;case Kd:t="AgX";break;case Qd:t="Neutral";break;case jd:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var Qr=new C;function z0(){tt.getLuminanceCoefficients(Qr);let i=Qr.x.toFixed(4),e=Qr.y.toFixed(4),t=Qr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function k0(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(lr).join(`
`)}function H0(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function V0(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function lr(i){return i!==""}function eu(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function tu(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var G0=/^[ \t]*#include +<([\w\d./]+)>/gm;function $l(i){return i.replace(G0,X0)}var W0=new Map;function X0(i,e){let t=Xe[e];if(t===void 0){let n=W0.get(e);if(n!==void 0)t=Xe[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return $l(t)}var q0=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function nu(i){return i.replace(q0,Y0)}function Y0(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function iu(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function $0(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Tu?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===Ad?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===Jn&&(e="SHADOWMAP_TYPE_VSM"),e}function Z0(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case Is:case Ds:e="ENVMAP_TYPE_CUBE";break;case $a:e="ENVMAP_TYPE_CUBE_UV";break}return e}function J0(i){let e="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case Ds:e="ENVMAP_MODE_REFRACTION";break}return e}function j0(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Au:e="ENVMAP_BLENDING_MULTIPLY";break;case qd:e="ENVMAP_BLENDING_MIX";break;case Yd:e="ENVMAP_BLENDING_ADD";break}return e}function K0(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function Q0(i,e,t,n){let s=i.getContext(),r=t.defines,a=t.vertexShader,o=t.fragmentShader,l=$0(t),c=Z0(t),h=J0(t),u=j0(t),d=K0(t),f=k0(t),g=H0(r),_=s.createProgram(),m,p,S=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(lr).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(lr).join(`
`),p.length>0&&(p+=`
`)):(m=[iu(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(lr).join(`
`),p=[iu(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Mi?"#define TONE_MAPPING":"",t.toneMapping!==Mi?Xe.tonemapping_pars_fragment:"",t.toneMapping!==Mi?B0("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Xe.colorspace_pars_fragment,F0("linearToOutputTexel",t.outputColorSpace),z0(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(lr).join(`
`)),a=$l(a),a=eu(a,t),a=tu(a,t),o=$l(o),o=eu(o,t),o=tu(o,t),a=nu(a),o=nu(o),t.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===gh?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===gh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let v=S+m+a,x=S+p+o,I=jh(s,s.VERTEX_SHADER,v),T=jh(s,s.FRAGMENT_SHADER,x);s.attachShader(_,I),s.attachShader(_,T),t.index0AttributeName!==void 0?s.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function R(D){if(i.debug.checkShaderErrors){let H=s.getProgramInfoLog(_).trim(),z=s.getShaderInfoLog(I).trim(),G=s.getShaderInfoLog(T).trim(),j=!0,X=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(j=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,_,I,T);else{let U=Qh(s,I,"vertex"),O=Qh(s,T,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+D.name+`
Material Type: `+D.type+`

Program Info Log: `+H+`
`+U+`
`+O)}else H!==""?console.warn("THREE.WebGLProgram: Program Info Log:",H):(z===""||G==="")&&(X=!1);X&&(D.diagnostics={runnable:j,programLog:H,vertexShader:{log:z,prefix:m},fragmentShader:{log:G,prefix:p}})}s.deleteShader(I),s.deleteShader(T),L=new Rs(s,_),E=V0(s,_)}let L;this.getUniforms=function(){return L===void 0&&R(this),L};let E;this.getAttributes=function(){return E===void 0&&R(this),E};let y=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return y===!1&&(y=s.getProgramParameter(_,L0)),y},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=U0++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=I,this.fragmentShader=T,this}var e_=0,Zl=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,n=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(s)===!1&&(a.add(s),s.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Jl(e),t.set(e,n)),n}},Jl=class{constructor(e){this.id=e_++,this.code=e,this.usedTimes=0}};function t_(i,e,t,n,s,r,a){let o=new _r,l=new Zl,c=new Set,h=[],u=s.logarithmicDepthBuffer,d=s.vertexTextures,f=s.precision,g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(E){return c.add(E),E===0?"uv":`uv${E}`}function m(E,y,D,H,z){let G=H.fog,j=z.geometry,X=E.isMeshStandardMaterial?H.environment:null,U=(E.isMeshStandardMaterial?t:e).get(E.envMap||X),O=U&&U.mapping===$a?U.image.height:null,ee=g[E.type];E.precision!==null&&(f=s.getMaxPrecision(E.precision),f!==E.precision&&console.warn("THREE.WebGLProgram.getParameters:",E.precision,"not supported, using",f,"instead."));let $=j.morphAttributes.position||j.morphAttributes.normal||j.morphAttributes.color,he=$!==void 0?$.length:0,Ie=0;j.morphAttributes.position!==void 0&&(Ie=1),j.morphAttributes.normal!==void 0&&(Ie=2),j.morphAttributes.color!==void 0&&(Ie=3);let $e,Y,se,me;if(ee){let ot=In[ee];$e=ot.vertexShader,Y=ot.fragmentShader}else $e=E.vertexShader,Y=E.fragmentShader,l.update(E),se=l.getVertexShaderID(E),me=l.getFragmentShaderID(E);let ce=i.getRenderTarget(),De=i.state.buffers.depth.getReversed(),Be=z.isInstancedMesh===!0,Oe=z.isBatchedMesh===!0,et=!!E.map,Q=!!E.matcap,oe=!!U,P=!!E.aoMap,Re=!!E.lightMap,re=!!E.bumpMap,Me=!!E.normalMap,ue=!!E.displacementMap,Ue=!!E.emissiveMap,xe=!!E.metalnessMap,w=!!E.roughnessMap,M=E.anisotropy>0,k=E.clearcoat>0,Z=E.dispersion>0,ne=E.iridescence>0,J=E.sheen>0,Ee=E.transmission>0,fe=M&&!!E.anisotropyMap,ve=k&&!!E.clearcoatMap,Je=k&&!!E.clearcoatNormalMap,ae=k&&!!E.clearcoatRoughnessMap,be=ne&&!!E.iridescenceMap,Ne=ne&&!!E.iridescenceThicknessMap,Fe=J&&!!E.sheenColorMap,Se=J&&!!E.sheenRoughnessMap,Qe=!!E.specularMap,We=!!E.specularColorMap,ut=!!E.specularIntensityMap,N=Ee&&!!E.transmissionMap,pe=Ee&&!!E.thicknessMap,q=!!E.gradientMap,K=!!E.alphaMap,ye=E.alphaTest>0,ge=!!E.alphaHash,He=!!E.extensions,vt=Mi;E.toneMapped&&(ce===null||ce.isXRRenderTarget===!0)&&(vt=i.toneMapping);let Bt={shaderID:ee,shaderType:E.type,shaderName:E.name,vertexShader:$e,fragmentShader:Y,defines:E.defines,customVertexShaderID:se,customFragmentShaderID:me,isRawShaderMaterial:E.isRawShaderMaterial===!0,glslVersion:E.glslVersion,precision:f,batching:Oe,batchingColor:Oe&&z._colorsTexture!==null,instancing:Be,instancingColor:Be&&z.instanceColor!==null,instancingMorph:Be&&z.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:ce===null?i.outputColorSpace:ce.isXRRenderTarget===!0?ce.texture.colorSpace:Xs,alphaToCoverage:!!E.alphaToCoverage,map:et,matcap:Q,envMap:oe,envMapMode:oe&&U.mapping,envMapCubeUVHeight:O,aoMap:P,lightMap:Re,bumpMap:re,normalMap:Me,displacementMap:d&&ue,emissiveMap:Ue,normalMapObjectSpace:Me&&E.normalMapType===sf,normalMapTangentSpace:Me&&E.normalMapType===Bu,metalnessMap:xe,roughnessMap:w,anisotropy:M,anisotropyMap:fe,clearcoat:k,clearcoatMap:ve,clearcoatNormalMap:Je,clearcoatRoughnessMap:ae,dispersion:Z,iridescence:ne,iridescenceMap:be,iridescenceThicknessMap:Ne,sheen:J,sheenColorMap:Fe,sheenRoughnessMap:Se,specularMap:Qe,specularColorMap:We,specularIntensityMap:ut,transmission:Ee,transmissionMap:N,thicknessMap:pe,gradientMap:q,opaque:E.transparent===!1&&E.blending===Es&&E.alphaToCoverage===!1,alphaMap:K,alphaTest:ye,alphaHash:ge,combine:E.combine,mapUv:et&&_(E.map.channel),aoMapUv:P&&_(E.aoMap.channel),lightMapUv:Re&&_(E.lightMap.channel),bumpMapUv:re&&_(E.bumpMap.channel),normalMapUv:Me&&_(E.normalMap.channel),displacementMapUv:ue&&_(E.displacementMap.channel),emissiveMapUv:Ue&&_(E.emissiveMap.channel),metalnessMapUv:xe&&_(E.metalnessMap.channel),roughnessMapUv:w&&_(E.roughnessMap.channel),anisotropyMapUv:fe&&_(E.anisotropyMap.channel),clearcoatMapUv:ve&&_(E.clearcoatMap.channel),clearcoatNormalMapUv:Je&&_(E.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ae&&_(E.clearcoatRoughnessMap.channel),iridescenceMapUv:be&&_(E.iridescenceMap.channel),iridescenceThicknessMapUv:Ne&&_(E.iridescenceThicknessMap.channel),sheenColorMapUv:Fe&&_(E.sheenColorMap.channel),sheenRoughnessMapUv:Se&&_(E.sheenRoughnessMap.channel),specularMapUv:Qe&&_(E.specularMap.channel),specularColorMapUv:We&&_(E.specularColorMap.channel),specularIntensityMapUv:ut&&_(E.specularIntensityMap.channel),transmissionMapUv:N&&_(E.transmissionMap.channel),thicknessMapUv:pe&&_(E.thicknessMap.channel),alphaMapUv:K&&_(E.alphaMap.channel),vertexTangents:!!j.attributes.tangent&&(Me||M),vertexColors:E.vertexColors,vertexAlphas:E.vertexColors===!0&&!!j.attributes.color&&j.attributes.color.itemSize===4,pointsUvs:z.isPoints===!0&&!!j.attributes.uv&&(et||K),fog:!!G,useFog:E.fog===!0,fogExp2:!!G&&G.isFogExp2,flatShading:E.flatShading===!0,sizeAttenuation:E.sizeAttenuation===!0,logarithmicDepthBuffer:u,reverseDepthBuffer:De,skinning:z.isSkinnedMesh===!0,morphTargets:j.morphAttributes.position!==void 0,morphNormals:j.morphAttributes.normal!==void 0,morphColors:j.morphAttributes.color!==void 0,morphTargetsCount:he,morphTextureStride:Ie,numDirLights:y.directional.length,numPointLights:y.point.length,numSpotLights:y.spot.length,numSpotLightMaps:y.spotLightMap.length,numRectAreaLights:y.rectArea.length,numHemiLights:y.hemi.length,numDirLightShadows:y.directionalShadowMap.length,numPointLightShadows:y.pointShadowMap.length,numSpotLightShadows:y.spotShadowMap.length,numSpotLightShadowsWithMaps:y.numSpotLightShadowsWithMaps,numLightProbes:y.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:E.dithering,shadowMapEnabled:i.shadowMap.enabled&&D.length>0,shadowMapType:i.shadowMap.type,toneMapping:vt,decodeVideoTexture:et&&E.map.isVideoTexture===!0&&tt.getTransfer(E.map.colorSpace)===lt,decodeVideoTextureEmissive:Ue&&E.emissiveMap.isVideoTexture===!0&&tt.getTransfer(E.emissiveMap.colorSpace)===lt,premultipliedAlpha:E.premultipliedAlpha,doubleSided:E.side===sn,flipSided:E.side===Ht,useDepthPacking:E.depthPacking>=0,depthPacking:E.depthPacking||0,index0AttributeName:E.index0AttributeName,extensionClipCullDistance:He&&E.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(He&&E.extensions.multiDraw===!0||Oe)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:E.customProgramCacheKey()};return Bt.vertexUv1s=c.has(1),Bt.vertexUv2s=c.has(2),Bt.vertexUv3s=c.has(3),c.clear(),Bt}function p(E){let y=[];if(E.shaderID?y.push(E.shaderID):(y.push(E.customVertexShaderID),y.push(E.customFragmentShaderID)),E.defines!==void 0)for(let D in E.defines)y.push(D),y.push(E.defines[D]);return E.isRawShaderMaterial===!1&&(S(y,E),v(y,E),y.push(i.outputColorSpace)),y.push(E.customProgramCacheKey),y.join()}function S(E,y){E.push(y.precision),E.push(y.outputColorSpace),E.push(y.envMapMode),E.push(y.envMapCubeUVHeight),E.push(y.mapUv),E.push(y.alphaMapUv),E.push(y.lightMapUv),E.push(y.aoMapUv),E.push(y.bumpMapUv),E.push(y.normalMapUv),E.push(y.displacementMapUv),E.push(y.emissiveMapUv),E.push(y.metalnessMapUv),E.push(y.roughnessMapUv),E.push(y.anisotropyMapUv),E.push(y.clearcoatMapUv),E.push(y.clearcoatNormalMapUv),E.push(y.clearcoatRoughnessMapUv),E.push(y.iridescenceMapUv),E.push(y.iridescenceThicknessMapUv),E.push(y.sheenColorMapUv),E.push(y.sheenRoughnessMapUv),E.push(y.specularMapUv),E.push(y.specularColorMapUv),E.push(y.specularIntensityMapUv),E.push(y.transmissionMapUv),E.push(y.thicknessMapUv),E.push(y.combine),E.push(y.fogExp2),E.push(y.sizeAttenuation),E.push(y.morphTargetsCount),E.push(y.morphAttributeCount),E.push(y.numDirLights),E.push(y.numPointLights),E.push(y.numSpotLights),E.push(y.numSpotLightMaps),E.push(y.numHemiLights),E.push(y.numRectAreaLights),E.push(y.numDirLightShadows),E.push(y.numPointLightShadows),E.push(y.numSpotLightShadows),E.push(y.numSpotLightShadowsWithMaps),E.push(y.numLightProbes),E.push(y.shadowMapType),E.push(y.toneMapping),E.push(y.numClippingPlanes),E.push(y.numClipIntersection),E.push(y.depthPacking)}function v(E,y){o.disableAll(),y.supportsVertexTextures&&o.enable(0),y.instancing&&o.enable(1),y.instancingColor&&o.enable(2),y.instancingMorph&&o.enable(3),y.matcap&&o.enable(4),y.envMap&&o.enable(5),y.normalMapObjectSpace&&o.enable(6),y.normalMapTangentSpace&&o.enable(7),y.clearcoat&&o.enable(8),y.iridescence&&o.enable(9),y.alphaTest&&o.enable(10),y.vertexColors&&o.enable(11),y.vertexAlphas&&o.enable(12),y.vertexUv1s&&o.enable(13),y.vertexUv2s&&o.enable(14),y.vertexUv3s&&o.enable(15),y.vertexTangents&&o.enable(16),y.anisotropy&&o.enable(17),y.alphaHash&&o.enable(18),y.batching&&o.enable(19),y.dispersion&&o.enable(20),y.batchingColor&&o.enable(21),E.push(o.mask),o.disableAll(),y.fog&&o.enable(0),y.useFog&&o.enable(1),y.flatShading&&o.enable(2),y.logarithmicDepthBuffer&&o.enable(3),y.reverseDepthBuffer&&o.enable(4),y.skinning&&o.enable(5),y.morphTargets&&o.enable(6),y.morphNormals&&o.enable(7),y.morphColors&&o.enable(8),y.premultipliedAlpha&&o.enable(9),y.shadowMapEnabled&&o.enable(10),y.doubleSided&&o.enable(11),y.flipSided&&o.enable(12),y.useDepthPacking&&o.enable(13),y.dithering&&o.enable(14),y.transmission&&o.enable(15),y.sheen&&o.enable(16),y.opaque&&o.enable(17),y.pointsUvs&&o.enable(18),y.decodeVideoTexture&&o.enable(19),y.decodeVideoTextureEmissive&&o.enable(20),y.alphaToCoverage&&o.enable(21),E.push(o.mask)}function x(E){let y=g[E.type],D;if(y){let H=In[y];D=Xf.clone(H.uniforms)}else D=E.uniforms;return D}function I(E,y){let D;for(let H=0,z=h.length;H<z;H++){let G=h[H];if(G.cacheKey===y){D=G,++D.usedTimes;break}}return D===void 0&&(D=new Q0(i,y,E,r),h.push(D)),D}function T(E){if(--E.usedTimes===0){let y=h.indexOf(E);h[y]=h[h.length-1],h.pop(),E.destroy()}}function R(E){l.remove(E)}function L(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:x,acquireProgram:I,releaseProgram:T,releaseShaderCache:R,programs:h,dispose:L}}function n_(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function i_(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function su(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function ru(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function a(u,d,f,g,_,m){let p=i[e];return p===void 0?(p={id:u.id,object:u,geometry:d,material:f,groupOrder:g,renderOrder:u.renderOrder,z:_,group:m},i[e]=p):(p.id=u.id,p.object=u,p.geometry=d,p.material=f,p.groupOrder=g,p.renderOrder=u.renderOrder,p.z=_,p.group=m),e++,p}function o(u,d,f,g,_,m){let p=a(u,d,f,g,_,m);f.transmission>0?n.push(p):f.transparent===!0?s.push(p):t.push(p)}function l(u,d,f,g,_,m){let p=a(u,d,f,g,_,m);f.transmission>0?n.unshift(p):f.transparent===!0?s.unshift(p):t.unshift(p)}function c(u,d){t.length>1&&t.sort(u||i_),n.length>1&&n.sort(d||su),s.length>1&&s.sort(d||su)}function h(){for(let u=e,d=i.length;u<d;u++){let f=i[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:o,unshift:l,finish:h,sort:c}}function s_(){let i=new WeakMap;function e(n,s){let r=i.get(n),a;return r===void 0?(a=new ru,i.set(n,[a])):s>=r.length?(a=new ru,r.push(a)):a=r[s],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function r_(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new C,color:new qe};break;case"SpotLight":t={position:new C,direction:new C,color:new qe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new C,color:new qe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new C,skyColor:new qe,groundColor:new qe};break;case"RectAreaLight":t={color:new qe,position:new C,halfWidth:new C,halfHeight:new C};break}return i[e.id]=t,t}}}function a_(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var o_=0;function l_(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function c_(i){let e=new r_,t=a_(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new C);let s=new C,r=new Ke,a=new Ke;function o(c){let h=0,u=0,d=0;for(let E=0;E<9;E++)n.probe[E].set(0,0,0);let f=0,g=0,_=0,m=0,p=0,S=0,v=0,x=0,I=0,T=0,R=0;c.sort(l_);for(let E=0,y=c.length;E<y;E++){let D=c[E],H=D.color,z=D.intensity,G=D.distance,j=D.shadow&&D.shadow.map?D.shadow.map.texture:null;if(D.isAmbientLight)h+=H.r*z,u+=H.g*z,d+=H.b*z;else if(D.isLightProbe){for(let X=0;X<9;X++)n.probe[X].addScaledVector(D.sh.coefficients[X],z);R++}else if(D.isDirectionalLight){let X=e.get(D);if(X.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){let U=D.shadow,O=t.get(D);O.shadowIntensity=U.intensity,O.shadowBias=U.bias,O.shadowNormalBias=U.normalBias,O.shadowRadius=U.radius,O.shadowMapSize=U.mapSize,n.directionalShadow[f]=O,n.directionalShadowMap[f]=j,n.directionalShadowMatrix[f]=D.shadow.matrix,S++}n.directional[f]=X,f++}else if(D.isSpotLight){let X=e.get(D);X.position.setFromMatrixPosition(D.matrixWorld),X.color.copy(H).multiplyScalar(z),X.distance=G,X.coneCos=Math.cos(D.angle),X.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),X.decay=D.decay,n.spot[_]=X;let U=D.shadow;if(D.map&&(n.spotLightMap[I]=D.map,I++,U.updateMatrices(D),D.castShadow&&T++),n.spotLightMatrix[_]=U.matrix,D.castShadow){let O=t.get(D);O.shadowIntensity=U.intensity,O.shadowBias=U.bias,O.shadowNormalBias=U.normalBias,O.shadowRadius=U.radius,O.shadowMapSize=U.mapSize,n.spotShadow[_]=O,n.spotShadowMap[_]=j,x++}_++}else if(D.isRectAreaLight){let X=e.get(D);X.color.copy(H).multiplyScalar(z),X.halfWidth.set(D.width*.5,0,0),X.halfHeight.set(0,D.height*.5,0),n.rectArea[m]=X,m++}else if(D.isPointLight){let X=e.get(D);if(X.color.copy(D.color).multiplyScalar(D.intensity),X.distance=D.distance,X.decay=D.decay,D.castShadow){let U=D.shadow,O=t.get(D);O.shadowIntensity=U.intensity,O.shadowBias=U.bias,O.shadowNormalBias=U.normalBias,O.shadowRadius=U.radius,O.shadowMapSize=U.mapSize,O.shadowCameraNear=U.camera.near,O.shadowCameraFar=U.camera.far,n.pointShadow[g]=O,n.pointShadowMap[g]=j,n.pointShadowMatrix[g]=D.shadow.matrix,v++}n.point[g]=X,g++}else if(D.isHemisphereLight){let X=e.get(D);X.skyColor.copy(D.color).multiplyScalar(z),X.groundColor.copy(D.groundColor).multiplyScalar(z),n.hemi[p]=X,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=de.LTC_FLOAT_1,n.rectAreaLTC2=de.LTC_FLOAT_2):(n.rectAreaLTC1=de.LTC_HALF_1,n.rectAreaLTC2=de.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;let L=n.hash;(L.directionalLength!==f||L.pointLength!==g||L.spotLength!==_||L.rectAreaLength!==m||L.hemiLength!==p||L.numDirectionalShadows!==S||L.numPointShadows!==v||L.numSpotShadows!==x||L.numSpotMaps!==I||L.numLightProbes!==R)&&(n.directional.length=f,n.spot.length=_,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.pointShadow.length=v,n.pointShadowMap.length=v,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=S,n.pointShadowMatrix.length=v,n.spotLightMatrix.length=x+I-T,n.spotLightMap.length=I,n.numSpotLightShadowsWithMaps=T,n.numLightProbes=R,L.directionalLength=f,L.pointLength=g,L.spotLength=_,L.rectAreaLength=m,L.hemiLength=p,L.numDirectionalShadows=S,L.numPointShadows=v,L.numSpotShadows=x,L.numSpotMaps=I,L.numLightProbes=R,n.version=o_++)}function l(c,h){let u=0,d=0,f=0,g=0,_=0,m=h.matrixWorldInverse;for(let p=0,S=c.length;p<S;p++){let v=c[p];if(v.isDirectionalLight){let x=n.directional[u];x.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(m),u++}else if(v.isSpotLight){let x=n.spot[f];x.position.setFromMatrixPosition(v.matrixWorld),x.position.applyMatrix4(m),x.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(m),f++}else if(v.isRectAreaLight){let x=n.rectArea[g];x.position.setFromMatrixPosition(v.matrixWorld),x.position.applyMatrix4(m),a.identity(),r.copy(v.matrixWorld),r.premultiply(m),a.extractRotation(r),x.halfWidth.set(v.width*.5,0,0),x.halfHeight.set(0,v.height*.5,0),x.halfWidth.applyMatrix4(a),x.halfHeight.applyMatrix4(a),g++}else if(v.isPointLight){let x=n.point[d];x.position.setFromMatrixPosition(v.matrixWorld),x.position.applyMatrix4(m),d++}else if(v.isHemisphereLight){let x=n.hemi[_];x.direction.setFromMatrixPosition(v.matrixWorld),x.direction.transformDirection(m),_++}}}return{setup:o,setupView:l,state:n}}function au(i){let e=new c_(i),t=[],n=[];function s(h){c.camera=h,t.length=0,n.length=0}function r(h){t.push(h)}function a(h){n.push(h)}function o(){e.setup(t)}function l(h){e.setupView(t,h)}let c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:o,setupLightsView:l,pushLight:r,pushShadow:a}}function h_(i){let e=new WeakMap;function t(s,r=0){let a=e.get(s),o;return a===void 0?(o=new au(i),e.set(s,[o])):r>=a.length?(o=new au(i),a.push(o)):o=a[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}var jl=class extends ii{static get type(){return"MeshDepthMaterial"}constructor(e){super(),this.isMeshDepthMaterial=!0,this.depthPacking=tf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Kl=class extends ii{static get type(){return"MeshDistanceMaterial"}constructor(e){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}},u_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,d_=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function f_(i,e,t){let n=new yr,s=new ie,r=new ie,a=new ct,o=new jl({depthPacking:nf}),l=new Kl,c={},h=t.maxTextureSize,u={[bi]:Ht,[Ht]:bi,[sn]:sn},d=new On({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ie},radius:{value:4}},vertexShader:u_,fragmentShader:d_}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let g=new at;g.setAttribute("position",new Vt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new je(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Tu;let p=this.type;this.render=function(T,R,L){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||T.length===0)return;let E=i.getRenderTarget(),y=i.getActiveCubeFace(),D=i.getActiveMipmapLevel(),H=i.state;H.setBlending(vi),H.buffers.color.setClear(1,1,1,1),H.buffers.depth.setTest(!0),H.setScissorTest(!1);let z=p!==Jn&&this.type===Jn,G=p===Jn&&this.type!==Jn;for(let j=0,X=T.length;j<X;j++){let U=T[j],O=U.shadow;if(O===void 0){console.warn("THREE.WebGLShadowMap:",U,"has no shadow.");continue}if(O.autoUpdate===!1&&O.needsUpdate===!1)continue;s.copy(O.mapSize);let ee=O.getFrameExtents();if(s.multiply(ee),r.copy(O.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/ee.x),s.x=r.x*ee.x,O.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/ee.y),s.y=r.y*ee.y,O.mapSize.y=r.y)),O.map===null||z===!0||G===!0){let he=this.type!==Jn?{minFilter:rn,magFilter:rn}:{};O.map!==null&&O.map.dispose(),O.map=new ti(s.x,s.y,he),O.map.texture.name=U.name+".shadowMap",O.camera.updateProjectionMatrix()}i.setRenderTarget(O.map),i.clear();let $=O.getViewportCount();for(let he=0;he<$;he++){let Ie=O.getViewport(he);a.set(r.x*Ie.x,r.y*Ie.y,r.x*Ie.z,r.y*Ie.w),H.viewport(a),O.updateMatrices(U,he),n=O.getFrustum(),x(R,L,O.camera,U,this.type)}O.isPointLightShadow!==!0&&this.type===Jn&&S(O,L),O.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(E,y,D)};function S(T,R){let L=e.update(_);d.defines.VSM_SAMPLES!==T.blurSamples&&(d.defines.VSM_SAMPLES=T.blurSamples,f.defines.VSM_SAMPLES=T.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new ti(s.x,s.y)),d.uniforms.shadow_pass.value=T.map.texture,d.uniforms.resolution.value=T.mapSize,d.uniforms.radius.value=T.radius,i.setRenderTarget(T.mapPass),i.clear(),i.renderBufferDirect(R,null,L,d,_,null),f.uniforms.shadow_pass.value=T.mapPass.texture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,i.setRenderTarget(T.map),i.clear(),i.renderBufferDirect(R,null,L,f,_,null)}function v(T,R,L,E){let y=null,D=L.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(D!==void 0)y=D;else if(y=L.isPointLight===!0?l:o,i.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0){let H=y.uuid,z=R.uuid,G=c[H];G===void 0&&(G={},c[H]=G);let j=G[z];j===void 0&&(j=y.clone(),G[z]=j,R.addEventListener("dispose",I)),y=j}if(y.visible=R.visible,y.wireframe=R.wireframe,E===Jn?y.side=R.shadowSide!==null?R.shadowSide:R.side:y.side=R.shadowSide!==null?R.shadowSide:u[R.side],y.alphaMap=R.alphaMap,y.alphaTest=R.alphaTest,y.map=R.map,y.clipShadows=R.clipShadows,y.clippingPlanes=R.clippingPlanes,y.clipIntersection=R.clipIntersection,y.displacementMap=R.displacementMap,y.displacementScale=R.displacementScale,y.displacementBias=R.displacementBias,y.wireframeLinewidth=R.wireframeLinewidth,y.linewidth=R.linewidth,L.isPointLight===!0&&y.isMeshDistanceMaterial===!0){let H=i.properties.get(y);H.light=L}return y}function x(T,R,L,E,y){if(T.visible===!1)return;if(T.layers.test(R.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&y===Jn)&&(!T.frustumCulled||n.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,T.matrixWorld);let z=e.update(T),G=T.material;if(Array.isArray(G)){let j=z.groups;for(let X=0,U=j.length;X<U;X++){let O=j[X],ee=G[O.materialIndex];if(ee&&ee.visible){let $=v(T,ee,E,y);T.onBeforeShadow(i,T,R,L,z,$,O),i.renderBufferDirect(L,null,z,$,T,O),T.onAfterShadow(i,T,R,L,z,$,O)}}}else if(G.visible){let j=v(T,G,E,y);T.onBeforeShadow(i,T,R,L,z,j,null),i.renderBufferDirect(L,null,z,j,T,null),T.onAfterShadow(i,T,R,L,z,j,null)}}let H=T.children;for(let z=0,G=H.length;z<G;z++)x(H[z],R,L,E,y)}function I(T){T.target.removeEventListener("dispose",I);for(let L in c){let E=c[L],y=T.target.uuid;y in E&&(E[y].dispose(),delete E[y])}}}var p_={[il]:sl,[rl]:ll,[al]:cl,[Ps]:ol,[sl]:il,[ll]:rl,[cl]:al,[ol]:Ps};function m_(i,e){function t(){let N=!1,pe=new ct,q=null,K=new ct(0,0,0,0);return{setMask:function(ye){q!==ye&&!N&&(i.colorMask(ye,ye,ye,ye),q=ye)},setLocked:function(ye){N=ye},setClear:function(ye,ge,He,vt,Bt){Bt===!0&&(ye*=vt,ge*=vt,He*=vt),pe.set(ye,ge,He,vt),K.equals(pe)===!1&&(i.clearColor(ye,ge,He,vt),K.copy(pe))},reset:function(){N=!1,q=null,K.set(-1,0,0,0)}}}function n(){let N=!1,pe=!1,q=null,K=null,ye=null;return{setReversed:function(ge){if(pe!==ge){let He=e.get("EXT_clip_control");pe?He.clipControlEXT(He.LOWER_LEFT_EXT,He.ZERO_TO_ONE_EXT):He.clipControlEXT(He.LOWER_LEFT_EXT,He.NEGATIVE_ONE_TO_ONE_EXT);let vt=ye;ye=null,this.setClear(vt)}pe=ge},getReversed:function(){return pe},setTest:function(ge){ge?ce(i.DEPTH_TEST):De(i.DEPTH_TEST)},setMask:function(ge){q!==ge&&!N&&(i.depthMask(ge),q=ge)},setFunc:function(ge){if(pe&&(ge=p_[ge]),K!==ge){switch(ge){case il:i.depthFunc(i.NEVER);break;case sl:i.depthFunc(i.ALWAYS);break;case rl:i.depthFunc(i.LESS);break;case Ps:i.depthFunc(i.LEQUAL);break;case al:i.depthFunc(i.EQUAL);break;case ol:i.depthFunc(i.GEQUAL);break;case ll:i.depthFunc(i.GREATER);break;case cl:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}K=ge}},setLocked:function(ge){N=ge},setClear:function(ge){ye!==ge&&(pe&&(ge=1-ge),i.clearDepth(ge),ye=ge)},reset:function(){N=!1,q=null,K=null,ye=null,pe=!1}}}function s(){let N=!1,pe=null,q=null,K=null,ye=null,ge=null,He=null,vt=null,Bt=null;return{setTest:function(ot){N||(ot?ce(i.STENCIL_TEST):De(i.STENCIL_TEST))},setMask:function(ot){pe!==ot&&!N&&(i.stencilMask(ot),pe=ot)},setFunc:function(ot,yn,Gn){(q!==ot||K!==yn||ye!==Gn)&&(i.stencilFunc(ot,yn,Gn),q=ot,K=yn,ye=Gn)},setOp:function(ot,yn,Gn){(ge!==ot||He!==yn||vt!==Gn)&&(i.stencilOp(ot,yn,Gn),ge=ot,He=yn,vt=Gn)},setLocked:function(ot){N=ot},setClear:function(ot){Bt!==ot&&(i.clearStencil(ot),Bt=ot)},reset:function(){N=!1,pe=null,q=null,K=null,ye=null,ge=null,He=null,vt=null,Bt=null}}}let r=new t,a=new n,o=new s,l=new WeakMap,c=new WeakMap,h={},u={},d=new WeakMap,f=[],g=null,_=!1,m=null,p=null,S=null,v=null,x=null,I=null,T=null,R=new qe(0,0,0),L=0,E=!1,y=null,D=null,H=null,z=null,G=null,j=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),X=!1,U=0,O=i.getParameter(i.VERSION);O.indexOf("WebGL")!==-1?(U=parseFloat(/^WebGL (\d)/.exec(O)[1]),X=U>=1):O.indexOf("OpenGL ES")!==-1&&(U=parseFloat(/^OpenGL ES (\d)/.exec(O)[1]),X=U>=2);let ee=null,$={},he=i.getParameter(i.SCISSOR_BOX),Ie=i.getParameter(i.VIEWPORT),$e=new ct().fromArray(he),Y=new ct().fromArray(Ie);function se(N,pe,q,K){let ye=new Uint8Array(4),ge=i.createTexture();i.bindTexture(N,ge),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let He=0;He<q;He++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(pe,0,i.RGBA,1,1,K,0,i.RGBA,i.UNSIGNED_BYTE,ye):i.texImage2D(pe+He,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ye);return ge}let me={};me[i.TEXTURE_2D]=se(i.TEXTURE_2D,i.TEXTURE_2D,1),me[i.TEXTURE_CUBE_MAP]=se(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),me[i.TEXTURE_2D_ARRAY]=se(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),me[i.TEXTURE_3D]=se(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),ce(i.DEPTH_TEST),a.setFunc(Ps),re(!1),Me(lh),ce(i.CULL_FACE),P(vi);function ce(N){h[N]!==!0&&(i.enable(N),h[N]=!0)}function De(N){h[N]!==!1&&(i.disable(N),h[N]=!1)}function Be(N,pe){return u[N]!==pe?(i.bindFramebuffer(N,pe),u[N]=pe,N===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=pe),N===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=pe),!0):!1}function Oe(N,pe){let q=f,K=!1;if(N){q=d.get(pe),q===void 0&&(q=[],d.set(pe,q));let ye=N.textures;if(q.length!==ye.length||q[0]!==i.COLOR_ATTACHMENT0){for(let ge=0,He=ye.length;ge<He;ge++)q[ge]=i.COLOR_ATTACHMENT0+ge;q.length=ye.length,K=!0}}else q[0]!==i.BACK&&(q[0]=i.BACK,K=!0);K&&i.drawBuffers(q)}function et(N){return g!==N?(i.useProgram(N),g=N,!0):!1}let Q={[Hi]:i.FUNC_ADD,[Cd]:i.FUNC_SUBTRACT,[Pd]:i.FUNC_REVERSE_SUBTRACT};Q[Id]=i.MIN,Q[Dd]=i.MAX;let oe={[Ld]:i.ZERO,[Ud]:i.ONE,[Nd]:i.SRC_COLOR,[tl]:i.SRC_ALPHA,[Hd]:i.SRC_ALPHA_SATURATE,[zd]:i.DST_COLOR,[Fd]:i.DST_ALPHA,[Od]:i.ONE_MINUS_SRC_COLOR,[nl]:i.ONE_MINUS_SRC_ALPHA,[kd]:i.ONE_MINUS_DST_COLOR,[Bd]:i.ONE_MINUS_DST_ALPHA,[Vd]:i.CONSTANT_COLOR,[Gd]:i.ONE_MINUS_CONSTANT_COLOR,[Wd]:i.CONSTANT_ALPHA,[Xd]:i.ONE_MINUS_CONSTANT_ALPHA};function P(N,pe,q,K,ye,ge,He,vt,Bt,ot){if(N===vi){_===!0&&(De(i.BLEND),_=!1);return}if(_===!1&&(ce(i.BLEND),_=!0),N!==Rd){if(N!==m||ot!==E){if((p!==Hi||x!==Hi)&&(i.blendEquation(i.FUNC_ADD),p=Hi,x=Hi),ot)switch(N){case Es:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Cs:i.blendFunc(i.ONE,i.ONE);break;case ch:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case hh:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}else switch(N){case Es:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Cs:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case ch:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case hh:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}S=null,v=null,I=null,T=null,R.set(0,0,0),L=0,m=N,E=ot}return}ye=ye||pe,ge=ge||q,He=He||K,(pe!==p||ye!==x)&&(i.blendEquationSeparate(Q[pe],Q[ye]),p=pe,x=ye),(q!==S||K!==v||ge!==I||He!==T)&&(i.blendFuncSeparate(oe[q],oe[K],oe[ge],oe[He]),S=q,v=K,I=ge,T=He),(vt.equals(R)===!1||Bt!==L)&&(i.blendColor(vt.r,vt.g,vt.b,Bt),R.copy(vt),L=Bt),m=N,E=!1}function Re(N,pe){N.side===sn?De(i.CULL_FACE):ce(i.CULL_FACE);let q=N.side===Ht;pe&&(q=!q),re(q),N.blending===Es&&N.transparent===!1?P(vi):P(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),a.setFunc(N.depthFunc),a.setTest(N.depthTest),a.setMask(N.depthWrite),r.setMask(N.colorWrite);let K=N.stencilWrite;o.setTest(K),K&&(o.setMask(N.stencilWriteMask),o.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),o.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),Ue(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?ce(i.SAMPLE_ALPHA_TO_COVERAGE):De(i.SAMPLE_ALPHA_TO_COVERAGE)}function re(N){y!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),y=N)}function Me(N){N!==wd?(ce(i.CULL_FACE),N!==D&&(N===lh?i.cullFace(i.BACK):N===Td?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):De(i.CULL_FACE),D=N}function ue(N){N!==H&&(X&&i.lineWidth(N),H=N)}function Ue(N,pe,q){N?(ce(i.POLYGON_OFFSET_FILL),(z!==pe||G!==q)&&(i.polygonOffset(pe,q),z=pe,G=q)):De(i.POLYGON_OFFSET_FILL)}function xe(N){N?ce(i.SCISSOR_TEST):De(i.SCISSOR_TEST)}function w(N){N===void 0&&(N=i.TEXTURE0+j-1),ee!==N&&(i.activeTexture(N),ee=N)}function M(N,pe,q){q===void 0&&(ee===null?q=i.TEXTURE0+j-1:q=ee);let K=$[q];K===void 0&&(K={type:void 0,texture:void 0},$[q]=K),(K.type!==N||K.texture!==pe)&&(ee!==q&&(i.activeTexture(q),ee=q),i.bindTexture(N,pe||me[N]),K.type=N,K.texture=pe)}function k(){let N=$[ee];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function Z(){try{i.compressedTexImage2D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ne(){try{i.compressedTexImage3D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function J(){try{i.texSubImage2D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Ee(){try{i.texSubImage3D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function fe(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ve(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Je(){try{i.texStorage2D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ae(){try{i.texStorage3D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function be(){try{i.texImage2D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Ne(){try{i.texImage3D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Fe(N){$e.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),$e.copy(N))}function Se(N){Y.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),Y.copy(N))}function Qe(N,pe){let q=c.get(pe);q===void 0&&(q=new WeakMap,c.set(pe,q));let K=q.get(N);K===void 0&&(K=i.getUniformBlockIndex(pe,N.name),q.set(N,K))}function We(N,pe){let K=c.get(pe).get(N);l.get(pe)!==K&&(i.uniformBlockBinding(pe,K,N.__bindingPointIndex),l.set(pe,K))}function ut(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),h={},ee=null,$={},u={},d=new WeakMap,f=[],g=null,_=!1,m=null,p=null,S=null,v=null,x=null,I=null,T=null,R=new qe(0,0,0),L=0,E=!1,y=null,D=null,H=null,z=null,G=null,$e.set(0,0,i.canvas.width,i.canvas.height),Y.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:ce,disable:De,bindFramebuffer:Be,drawBuffers:Oe,useProgram:et,setBlending:P,setMaterial:Re,setFlipSided:re,setCullFace:Me,setLineWidth:ue,setPolygonOffset:Ue,setScissorTest:xe,activeTexture:w,bindTexture:M,unbindTexture:k,compressedTexImage2D:Z,compressedTexImage3D:ne,texImage2D:be,texImage3D:Ne,updateUBOMapping:Qe,uniformBlockBinding:We,texStorage2D:Je,texStorage3D:ae,texSubImage2D:J,texSubImage3D:Ee,compressedTexSubImage2D:fe,compressedTexSubImage3D:ve,scissor:Fe,viewport:Se,reset:ut}}function ou(i,e,t,n){let s=g_(n);switch(t){case Du:return i*e;case Uu:return i*e;case Nu:return i*e*2;case Rc:return i*e/s.components*s.byteLength;case Cc:return i*e/s.components*s.byteLength;case Ou:return i*e*2/s.components*s.byteLength;case Pc:return i*e*2/s.components*s.byteLength;case Lu:return i*e*3/s.components*s.byteLength;case Sn:return i*e*4/s.components*s.byteLength;case Ic:return i*e*4/s.components*s.byteLength;case fa:case pa:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case ma:case ga:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case pl:case gl:return Math.max(i,16)*Math.max(e,8)/4;case fl:case ml:return Math.max(i,8)*Math.max(e,8)/2;case _l:case yl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case xl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case vl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ml:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case bl:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Sl:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case El:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case wl:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Tl:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Al:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Rl:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Cl:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Pl:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Il:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Dl:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Ll:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case _a:case Ul:case Nl:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Fu:case Ol:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Fl:case Bl:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function g_(i){switch(i){case Qn:case Cu:return{byteLength:1,components:1};case mr:case Pu:case Ar:return{byteLength:2,components:1};case Tc:case Ac:return{byteLength:2,components:4};case Xi:case wc:case Ln:return{byteLength:4,components:1};case Iu:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}function __(i,e,t,n,s,r,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ie,h=new WeakMap,u,d=new WeakMap,f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(w,M){return f?new OffscreenCanvas(w,M):va("canvas")}function _(w,M,k){let Z=1,ne=xe(w);if((ne.width>k||ne.height>k)&&(Z=k/Math.max(ne.width,ne.height)),Z<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){let J=Math.floor(Z*ne.width),Ee=Math.floor(Z*ne.height);u===void 0&&(u=g(J,Ee));let fe=M?g(J,Ee):u;return fe.width=J,fe.height=Ee,fe.getContext("2d").drawImage(w,0,0,J,Ee),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+ne.width+"x"+ne.height+") to ("+J+"x"+Ee+")."),fe}else return"data"in w&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+ne.width+"x"+ne.height+")."),w;return w}function m(w){return w.generateMipmaps}function p(w){i.generateMipmap(w)}function S(w){return w.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?i.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function v(w,M,k,Z,ne=!1){if(w!==null){if(i[w]!==void 0)return i[w];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let J=M;if(M===i.RED&&(k===i.FLOAT&&(J=i.R32F),k===i.HALF_FLOAT&&(J=i.R16F),k===i.UNSIGNED_BYTE&&(J=i.R8)),M===i.RED_INTEGER&&(k===i.UNSIGNED_BYTE&&(J=i.R8UI),k===i.UNSIGNED_SHORT&&(J=i.R16UI),k===i.UNSIGNED_INT&&(J=i.R32UI),k===i.BYTE&&(J=i.R8I),k===i.SHORT&&(J=i.R16I),k===i.INT&&(J=i.R32I)),M===i.RG&&(k===i.FLOAT&&(J=i.RG32F),k===i.HALF_FLOAT&&(J=i.RG16F),k===i.UNSIGNED_BYTE&&(J=i.RG8)),M===i.RG_INTEGER&&(k===i.UNSIGNED_BYTE&&(J=i.RG8UI),k===i.UNSIGNED_SHORT&&(J=i.RG16UI),k===i.UNSIGNED_INT&&(J=i.RG32UI),k===i.BYTE&&(J=i.RG8I),k===i.SHORT&&(J=i.RG16I),k===i.INT&&(J=i.RG32I)),M===i.RGB_INTEGER&&(k===i.UNSIGNED_BYTE&&(J=i.RGB8UI),k===i.UNSIGNED_SHORT&&(J=i.RGB16UI),k===i.UNSIGNED_INT&&(J=i.RGB32UI),k===i.BYTE&&(J=i.RGB8I),k===i.SHORT&&(J=i.RGB16I),k===i.INT&&(J=i.RGB32I)),M===i.RGBA_INTEGER&&(k===i.UNSIGNED_BYTE&&(J=i.RGBA8UI),k===i.UNSIGNED_SHORT&&(J=i.RGBA16UI),k===i.UNSIGNED_INT&&(J=i.RGBA32UI),k===i.BYTE&&(J=i.RGBA8I),k===i.SHORT&&(J=i.RGBA16I),k===i.INT&&(J=i.RGBA32I)),M===i.RGB&&k===i.UNSIGNED_INT_5_9_9_9_REV&&(J=i.RGB9_E5),M===i.RGBA){let Ee=ne?Za:tt.getTransfer(Z);k===i.FLOAT&&(J=i.RGBA32F),k===i.HALF_FLOAT&&(J=i.RGBA16F),k===i.UNSIGNED_BYTE&&(J=Ee===lt?i.SRGB8_ALPHA8:i.RGBA8),k===i.UNSIGNED_SHORT_4_4_4_4&&(J=i.RGBA4),k===i.UNSIGNED_SHORT_5_5_5_1&&(J=i.RGB5_A1)}return(J===i.R16F||J===i.R32F||J===i.RG16F||J===i.RG32F||J===i.RGBA16F||J===i.RGBA32F)&&e.get("EXT_color_buffer_float"),J}function x(w,M){let k;return w?M===null||M===Xi||M===Ls?k=i.DEPTH24_STENCIL8:M===Ln?k=i.DEPTH32F_STENCIL8:M===mr&&(k=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===Xi||M===Ls?k=i.DEPTH_COMPONENT24:M===Ln?k=i.DEPTH_COMPONENT32F:M===mr&&(k=i.DEPTH_COMPONENT16),k}function I(w,M){return m(w)===!0||w.isFramebufferTexture&&w.minFilter!==rn&&w.minFilter!==Dn?Math.log2(Math.max(M.width,M.height))+1:w.mipmaps!==void 0&&w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?M.mipmaps.length:1}function T(w){let M=w.target;M.removeEventListener("dispose",T),L(M),M.isVideoTexture&&h.delete(M)}function R(w){let M=w.target;M.removeEventListener("dispose",R),y(M)}function L(w){let M=n.get(w);if(M.__webglInit===void 0)return;let k=w.source,Z=d.get(k);if(Z){let ne=Z[M.__cacheKey];ne.usedTimes--,ne.usedTimes===0&&E(w),Object.keys(Z).length===0&&d.delete(k)}n.remove(w)}function E(w){let M=n.get(w);i.deleteTexture(M.__webglTexture);let k=w.source,Z=d.get(k);delete Z[M.__cacheKey],a.memory.textures--}function y(w){let M=n.get(w);if(w.depthTexture&&(w.depthTexture.dispose(),n.remove(w.depthTexture)),w.isWebGLCubeRenderTarget)for(let Z=0;Z<6;Z++){if(Array.isArray(M.__webglFramebuffer[Z]))for(let ne=0;ne<M.__webglFramebuffer[Z].length;ne++)i.deleteFramebuffer(M.__webglFramebuffer[Z][ne]);else i.deleteFramebuffer(M.__webglFramebuffer[Z]);M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer[Z])}else{if(Array.isArray(M.__webglFramebuffer))for(let Z=0;Z<M.__webglFramebuffer.length;Z++)i.deleteFramebuffer(M.__webglFramebuffer[Z]);else i.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&i.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let Z=0;Z<M.__webglColorRenderbuffer.length;Z++)M.__webglColorRenderbuffer[Z]&&i.deleteRenderbuffer(M.__webglColorRenderbuffer[Z]);M.__webglDepthRenderbuffer&&i.deleteRenderbuffer(M.__webglDepthRenderbuffer)}let k=w.textures;for(let Z=0,ne=k.length;Z<ne;Z++){let J=n.get(k[Z]);J.__webglTexture&&(i.deleteTexture(J.__webglTexture),a.memory.textures--),n.remove(k[Z])}n.remove(w)}let D=0;function H(){D=0}function z(){let w=D;return w>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+w+" texture units while this GPU supports only "+s.maxTextures),D+=1,w}function G(w){let M=[];return M.push(w.wrapS),M.push(w.wrapT),M.push(w.wrapR||0),M.push(w.magFilter),M.push(w.minFilter),M.push(w.anisotropy),M.push(w.internalFormat),M.push(w.format),M.push(w.type),M.push(w.generateMipmaps),M.push(w.premultiplyAlpha),M.push(w.flipY),M.push(w.unpackAlignment),M.push(w.colorSpace),M.join()}function j(w,M){let k=n.get(w);if(w.isVideoTexture&&ue(w),w.isRenderTargetTexture===!1&&w.version>0&&k.__version!==w.version){let Z=w.image;if(Z===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Z.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Y(k,w,M);return}}t.bindTexture(i.TEXTURE_2D,k.__webglTexture,i.TEXTURE0+M)}function X(w,M){let k=n.get(w);if(w.version>0&&k.__version!==w.version){Y(k,w,M);return}t.bindTexture(i.TEXTURE_2D_ARRAY,k.__webglTexture,i.TEXTURE0+M)}function U(w,M){let k=n.get(w);if(w.version>0&&k.__version!==w.version){Y(k,w,M);return}t.bindTexture(i.TEXTURE_3D,k.__webglTexture,i.TEXTURE0+M)}function O(w,M){let k=n.get(w);if(w.version>0&&k.__version!==w.version){se(k,w,M);return}t.bindTexture(i.TEXTURE_CUBE_MAP,k.__webglTexture,i.TEXTURE0+M)}let ee={[pr]:i.REPEAT,[Gi]:i.CLAMP_TO_EDGE,[dl]:i.MIRRORED_REPEAT},$={[rn]:i.NEAREST,[ef]:i.NEAREST_MIPMAP_NEAREST,[Lr]:i.NEAREST_MIPMAP_LINEAR,[Dn]:i.LINEAR,[xo]:i.LINEAR_MIPMAP_NEAREST,[Wi]:i.LINEAR_MIPMAP_LINEAR},he={[rf]:i.NEVER,[uf]:i.ALWAYS,[af]:i.LESS,[zu]:i.LEQUAL,[of]:i.EQUAL,[hf]:i.GEQUAL,[lf]:i.GREATER,[cf]:i.NOTEQUAL};function Ie(w,M){if(M.type===Ln&&e.has("OES_texture_float_linear")===!1&&(M.magFilter===Dn||M.magFilter===xo||M.magFilter===Lr||M.magFilter===Wi||M.minFilter===Dn||M.minFilter===xo||M.minFilter===Lr||M.minFilter===Wi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(w,i.TEXTURE_WRAP_S,ee[M.wrapS]),i.texParameteri(w,i.TEXTURE_WRAP_T,ee[M.wrapT]),(w===i.TEXTURE_3D||w===i.TEXTURE_2D_ARRAY)&&i.texParameteri(w,i.TEXTURE_WRAP_R,ee[M.wrapR]),i.texParameteri(w,i.TEXTURE_MAG_FILTER,$[M.magFilter]),i.texParameteri(w,i.TEXTURE_MIN_FILTER,$[M.minFilter]),M.compareFunction&&(i.texParameteri(w,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(w,i.TEXTURE_COMPARE_FUNC,he[M.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===rn||M.minFilter!==Lr&&M.minFilter!==Wi||M.type===Ln&&e.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||n.get(M).__currentAnisotropy){let k=e.get("EXT_texture_filter_anisotropic");i.texParameterf(w,k.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,s.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy}}}function $e(w,M){let k=!1;w.__webglInit===void 0&&(w.__webglInit=!0,M.addEventListener("dispose",T));let Z=M.source,ne=d.get(Z);ne===void 0&&(ne={},d.set(Z,ne));let J=G(M);if(J!==w.__cacheKey){ne[J]===void 0&&(ne[J]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,k=!0),ne[J].usedTimes++;let Ee=ne[w.__cacheKey];Ee!==void 0&&(ne[w.__cacheKey].usedTimes--,Ee.usedTimes===0&&E(M)),w.__cacheKey=J,w.__webglTexture=ne[J].texture}return k}function Y(w,M,k){let Z=i.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(Z=i.TEXTURE_2D_ARRAY),M.isData3DTexture&&(Z=i.TEXTURE_3D);let ne=$e(w,M),J=M.source;t.bindTexture(Z,w.__webglTexture,i.TEXTURE0+k);let Ee=n.get(J);if(J.version!==Ee.__version||ne===!0){t.activeTexture(i.TEXTURE0+k);let fe=tt.getPrimaries(tt.workingColorSpace),ve=M.colorSpace===yi?null:tt.getPrimaries(M.colorSpace),Je=M.colorSpace===yi||fe===ve?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Je);let ae=_(M.image,!1,s.maxTextureSize);ae=Ue(M,ae);let be=r.convert(M.format,M.colorSpace),Ne=r.convert(M.type),Fe=v(M.internalFormat,be,Ne,M.colorSpace,M.isVideoTexture);Ie(Z,M);let Se,Qe=M.mipmaps,We=M.isVideoTexture!==!0,ut=Ee.__version===void 0||ne===!0,N=J.dataReady,pe=I(M,ae);if(M.isDepthTexture)Fe=x(M.format===Us,M.type),ut&&(We?t.texStorage2D(i.TEXTURE_2D,1,Fe,ae.width,ae.height):t.texImage2D(i.TEXTURE_2D,0,Fe,ae.width,ae.height,0,be,Ne,null));else if(M.isDataTexture)if(Qe.length>0){We&&ut&&t.texStorage2D(i.TEXTURE_2D,pe,Fe,Qe[0].width,Qe[0].height);for(let q=0,K=Qe.length;q<K;q++)Se=Qe[q],We?N&&t.texSubImage2D(i.TEXTURE_2D,q,0,0,Se.width,Se.height,be,Ne,Se.data):t.texImage2D(i.TEXTURE_2D,q,Fe,Se.width,Se.height,0,be,Ne,Se.data);M.generateMipmaps=!1}else We?(ut&&t.texStorage2D(i.TEXTURE_2D,pe,Fe,ae.width,ae.height),N&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ae.width,ae.height,be,Ne,ae.data)):t.texImage2D(i.TEXTURE_2D,0,Fe,ae.width,ae.height,0,be,Ne,ae.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){We&&ut&&t.texStorage3D(i.TEXTURE_2D_ARRAY,pe,Fe,Qe[0].width,Qe[0].height,ae.depth);for(let q=0,K=Qe.length;q<K;q++)if(Se=Qe[q],M.format!==Sn)if(be!==null)if(We){if(N)if(M.layerUpdates.size>0){let ye=ou(Se.width,Se.height,M.format,M.type);for(let ge of M.layerUpdates){let He=Se.data.subarray(ge*ye/Se.data.BYTES_PER_ELEMENT,(ge+1)*ye/Se.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,q,0,0,ge,Se.width,Se.height,1,be,He)}M.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,q,0,0,0,Se.width,Se.height,ae.depth,be,Se.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,q,Fe,Se.width,Se.height,ae.depth,0,Se.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else We?N&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,q,0,0,0,Se.width,Se.height,ae.depth,be,Ne,Se.data):t.texImage3D(i.TEXTURE_2D_ARRAY,q,Fe,Se.width,Se.height,ae.depth,0,be,Ne,Se.data)}else{We&&ut&&t.texStorage2D(i.TEXTURE_2D,pe,Fe,Qe[0].width,Qe[0].height);for(let q=0,K=Qe.length;q<K;q++)Se=Qe[q],M.format!==Sn?be!==null?We?N&&t.compressedTexSubImage2D(i.TEXTURE_2D,q,0,0,Se.width,Se.height,be,Se.data):t.compressedTexImage2D(i.TEXTURE_2D,q,Fe,Se.width,Se.height,0,Se.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):We?N&&t.texSubImage2D(i.TEXTURE_2D,q,0,0,Se.width,Se.height,be,Ne,Se.data):t.texImage2D(i.TEXTURE_2D,q,Fe,Se.width,Se.height,0,be,Ne,Se.data)}else if(M.isDataArrayTexture)if(We){if(ut&&t.texStorage3D(i.TEXTURE_2D_ARRAY,pe,Fe,ae.width,ae.height,ae.depth),N)if(M.layerUpdates.size>0){let q=ou(ae.width,ae.height,M.format,M.type);for(let K of M.layerUpdates){let ye=ae.data.subarray(K*q/ae.data.BYTES_PER_ELEMENT,(K+1)*q/ae.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,K,ae.width,ae.height,1,be,Ne,ye)}M.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ae.width,ae.height,ae.depth,be,Ne,ae.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Fe,ae.width,ae.height,ae.depth,0,be,Ne,ae.data);else if(M.isData3DTexture)We?(ut&&t.texStorage3D(i.TEXTURE_3D,pe,Fe,ae.width,ae.height,ae.depth),N&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ae.width,ae.height,ae.depth,be,Ne,ae.data)):t.texImage3D(i.TEXTURE_3D,0,Fe,ae.width,ae.height,ae.depth,0,be,Ne,ae.data);else if(M.isFramebufferTexture){if(ut)if(We)t.texStorage2D(i.TEXTURE_2D,pe,Fe,ae.width,ae.height);else{let q=ae.width,K=ae.height;for(let ye=0;ye<pe;ye++)t.texImage2D(i.TEXTURE_2D,ye,Fe,q,K,0,be,Ne,null),q>>=1,K>>=1}}else if(Qe.length>0){if(We&&ut){let q=xe(Qe[0]);t.texStorage2D(i.TEXTURE_2D,pe,Fe,q.width,q.height)}for(let q=0,K=Qe.length;q<K;q++)Se=Qe[q],We?N&&t.texSubImage2D(i.TEXTURE_2D,q,0,0,be,Ne,Se):t.texImage2D(i.TEXTURE_2D,q,Fe,be,Ne,Se);M.generateMipmaps=!1}else if(We){if(ut){let q=xe(ae);t.texStorage2D(i.TEXTURE_2D,pe,Fe,q.width,q.height)}N&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,be,Ne,ae)}else t.texImage2D(i.TEXTURE_2D,0,Fe,be,Ne,ae);m(M)&&p(Z),Ee.__version=J.version,M.onUpdate&&M.onUpdate(M)}w.__version=M.version}function se(w,M,k){if(M.image.length!==6)return;let Z=$e(w,M),ne=M.source;t.bindTexture(i.TEXTURE_CUBE_MAP,w.__webglTexture,i.TEXTURE0+k);let J=n.get(ne);if(ne.version!==J.__version||Z===!0){t.activeTexture(i.TEXTURE0+k);let Ee=tt.getPrimaries(tt.workingColorSpace),fe=M.colorSpace===yi?null:tt.getPrimaries(M.colorSpace),ve=M.colorSpace===yi||Ee===fe?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ve);let Je=M.isCompressedTexture||M.image[0].isCompressedTexture,ae=M.image[0]&&M.image[0].isDataTexture,be=[];for(let K=0;K<6;K++)!Je&&!ae?be[K]=_(M.image[K],!0,s.maxCubemapSize):be[K]=ae?M.image[K].image:M.image[K],be[K]=Ue(M,be[K]);let Ne=be[0],Fe=r.convert(M.format,M.colorSpace),Se=r.convert(M.type),Qe=v(M.internalFormat,Fe,Se,M.colorSpace),We=M.isVideoTexture!==!0,ut=J.__version===void 0||Z===!0,N=ne.dataReady,pe=I(M,Ne);Ie(i.TEXTURE_CUBE_MAP,M);let q;if(Je){We&&ut&&t.texStorage2D(i.TEXTURE_CUBE_MAP,pe,Qe,Ne.width,Ne.height);for(let K=0;K<6;K++){q=be[K].mipmaps;for(let ye=0;ye<q.length;ye++){let ge=q[ye];M.format!==Sn?Fe!==null?We?N&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye,0,0,ge.width,ge.height,Fe,ge.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye,Qe,ge.width,ge.height,0,ge.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):We?N&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye,0,0,ge.width,ge.height,Fe,Se,ge.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye,Qe,ge.width,ge.height,0,Fe,Se,ge.data)}}}else{if(q=M.mipmaps,We&&ut){q.length>0&&pe++;let K=xe(be[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,pe,Qe,K.width,K.height)}for(let K=0;K<6;K++)if(ae){We?N&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,0,0,be[K].width,be[K].height,Fe,Se,be[K].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,Qe,be[K].width,be[K].height,0,Fe,Se,be[K].data);for(let ye=0;ye<q.length;ye++){let He=q[ye].image[K].image;We?N&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye+1,0,0,He.width,He.height,Fe,Se,He.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye+1,Qe,He.width,He.height,0,Fe,Se,He.data)}}else{We?N&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,0,0,Fe,Se,be[K]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,Qe,Fe,Se,be[K]);for(let ye=0;ye<q.length;ye++){let ge=q[ye];We?N&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye+1,0,0,Fe,Se,ge.image[K]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye+1,Qe,Fe,Se,ge.image[K])}}}m(M)&&p(i.TEXTURE_CUBE_MAP),J.__version=ne.version,M.onUpdate&&M.onUpdate(M)}w.__version=M.version}function me(w,M,k,Z,ne,J){let Ee=r.convert(k.format,k.colorSpace),fe=r.convert(k.type),ve=v(k.internalFormat,Ee,fe,k.colorSpace),Je=n.get(M),ae=n.get(k);if(ae.__renderTarget=M,!Je.__hasExternalTextures){let be=Math.max(1,M.width>>J),Ne=Math.max(1,M.height>>J);ne===i.TEXTURE_3D||ne===i.TEXTURE_2D_ARRAY?t.texImage3D(ne,J,ve,be,Ne,M.depth,0,Ee,fe,null):t.texImage2D(ne,J,ve,be,Ne,0,Ee,fe,null)}t.bindFramebuffer(i.FRAMEBUFFER,w),Me(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Z,ne,ae.__webglTexture,0,re(M)):(ne===i.TEXTURE_2D||ne>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ne<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Z,ne,ae.__webglTexture,J),t.bindFramebuffer(i.FRAMEBUFFER,null)}function ce(w,M,k){if(i.bindRenderbuffer(i.RENDERBUFFER,w),M.depthBuffer){let Z=M.depthTexture,ne=Z&&Z.isDepthTexture?Z.type:null,J=x(M.stencilBuffer,ne),Ee=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,fe=re(M);Me(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,fe,J,M.width,M.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,fe,J,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,J,M.width,M.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Ee,i.RENDERBUFFER,w)}else{let Z=M.textures;for(let ne=0;ne<Z.length;ne++){let J=Z[ne],Ee=r.convert(J.format,J.colorSpace),fe=r.convert(J.type),ve=v(J.internalFormat,Ee,fe,J.colorSpace),Je=re(M);k&&Me(M)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Je,ve,M.width,M.height):Me(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Je,ve,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,ve,M.width,M.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function De(w,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,w),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let Z=n.get(M.depthTexture);Z.__renderTarget=M,(!Z.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),j(M.depthTexture,0);let ne=Z.__webglTexture,J=re(M);if(M.depthTexture.format===ws)Me(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,ne,0,J):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,ne,0);else if(M.depthTexture.format===Us)Me(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,ne,0,J):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,ne,0);else throw new Error("Unknown depthTexture format")}function Be(w){let M=n.get(w),k=w.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==w.depthTexture){let Z=w.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),Z){let ne=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,Z.removeEventListener("dispose",ne)};Z.addEventListener("dispose",ne),M.__depthDisposeCallback=ne}M.__boundDepthTexture=Z}if(w.depthTexture&&!M.__autoAllocateDepthBuffer){if(k)throw new Error("target.depthTexture not supported in Cube render targets");De(M.__webglFramebuffer,w)}else if(k){M.__webglDepthbuffer=[];for(let Z=0;Z<6;Z++)if(t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[Z]),M.__webglDepthbuffer[Z]===void 0)M.__webglDepthbuffer[Z]=i.createRenderbuffer(),ce(M.__webglDepthbuffer[Z],w,!1);else{let ne=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,J=M.__webglDepthbuffer[Z];i.bindRenderbuffer(i.RENDERBUFFER,J),i.framebufferRenderbuffer(i.FRAMEBUFFER,ne,i.RENDERBUFFER,J)}}else if(t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=i.createRenderbuffer(),ce(M.__webglDepthbuffer,w,!1);else{let Z=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ne=M.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ne),i.framebufferRenderbuffer(i.FRAMEBUFFER,Z,i.RENDERBUFFER,ne)}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Oe(w,M,k){let Z=n.get(w);M!==void 0&&me(Z.__webglFramebuffer,w,w.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),k!==void 0&&Be(w)}function et(w){let M=w.texture,k=n.get(w),Z=n.get(M);w.addEventListener("dispose",R);let ne=w.textures,J=w.isWebGLCubeRenderTarget===!0,Ee=ne.length>1;if(Ee||(Z.__webglTexture===void 0&&(Z.__webglTexture=i.createTexture()),Z.__version=M.version,a.memory.textures++),J){k.__webglFramebuffer=[];for(let fe=0;fe<6;fe++)if(M.mipmaps&&M.mipmaps.length>0){k.__webglFramebuffer[fe]=[];for(let ve=0;ve<M.mipmaps.length;ve++)k.__webglFramebuffer[fe][ve]=i.createFramebuffer()}else k.__webglFramebuffer[fe]=i.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){k.__webglFramebuffer=[];for(let fe=0;fe<M.mipmaps.length;fe++)k.__webglFramebuffer[fe]=i.createFramebuffer()}else k.__webglFramebuffer=i.createFramebuffer();if(Ee)for(let fe=0,ve=ne.length;fe<ve;fe++){let Je=n.get(ne[fe]);Je.__webglTexture===void 0&&(Je.__webglTexture=i.createTexture(),a.memory.textures++)}if(w.samples>0&&Me(w)===!1){k.__webglMultisampledFramebuffer=i.createFramebuffer(),k.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let fe=0;fe<ne.length;fe++){let ve=ne[fe];k.__webglColorRenderbuffer[fe]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,k.__webglColorRenderbuffer[fe]);let Je=r.convert(ve.format,ve.colorSpace),ae=r.convert(ve.type),be=v(ve.internalFormat,Je,ae,ve.colorSpace,w.isXRRenderTarget===!0),Ne=re(w);i.renderbufferStorageMultisample(i.RENDERBUFFER,Ne,be,w.width,w.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+fe,i.RENDERBUFFER,k.__webglColorRenderbuffer[fe])}i.bindRenderbuffer(i.RENDERBUFFER,null),w.depthBuffer&&(k.__webglDepthRenderbuffer=i.createRenderbuffer(),ce(k.__webglDepthRenderbuffer,w,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(J){t.bindTexture(i.TEXTURE_CUBE_MAP,Z.__webglTexture),Ie(i.TEXTURE_CUBE_MAP,M);for(let fe=0;fe<6;fe++)if(M.mipmaps&&M.mipmaps.length>0)for(let ve=0;ve<M.mipmaps.length;ve++)me(k.__webglFramebuffer[fe][ve],w,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,ve);else me(k.__webglFramebuffer[fe],w,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0);m(M)&&p(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ee){for(let fe=0,ve=ne.length;fe<ve;fe++){let Je=ne[fe],ae=n.get(Je);t.bindTexture(i.TEXTURE_2D,ae.__webglTexture),Ie(i.TEXTURE_2D,Je),me(k.__webglFramebuffer,w,Je,i.COLOR_ATTACHMENT0+fe,i.TEXTURE_2D,0),m(Je)&&p(i.TEXTURE_2D)}t.unbindTexture()}else{let fe=i.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(fe=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(fe,Z.__webglTexture),Ie(fe,M),M.mipmaps&&M.mipmaps.length>0)for(let ve=0;ve<M.mipmaps.length;ve++)me(k.__webglFramebuffer[ve],w,M,i.COLOR_ATTACHMENT0,fe,ve);else me(k.__webglFramebuffer,w,M,i.COLOR_ATTACHMENT0,fe,0);m(M)&&p(fe),t.unbindTexture()}w.depthBuffer&&Be(w)}function Q(w){let M=w.textures;for(let k=0,Z=M.length;k<Z;k++){let ne=M[k];if(m(ne)){let J=S(w),Ee=n.get(ne).__webglTexture;t.bindTexture(J,Ee),p(J),t.unbindTexture()}}}let oe=[],P=[];function Re(w){if(w.samples>0){if(Me(w)===!1){let M=w.textures,k=w.width,Z=w.height,ne=i.COLOR_BUFFER_BIT,J=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ee=n.get(w),fe=M.length>1;if(fe)for(let ve=0;ve<M.length;ve++)t.bindFramebuffer(i.FRAMEBUFFER,Ee.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Ee.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Ee.__webglMultisampledFramebuffer),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ee.__webglFramebuffer);for(let ve=0;ve<M.length;ve++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(ne|=i.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(ne|=i.STENCIL_BUFFER_BIT)),fe){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Ee.__webglColorRenderbuffer[ve]);let Je=n.get(M[ve]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Je,0)}i.blitFramebuffer(0,0,k,Z,0,0,k,Z,ne,i.NEAREST),l===!0&&(oe.length=0,P.length=0,oe.push(i.COLOR_ATTACHMENT0+ve),w.depthBuffer&&w.resolveDepthBuffer===!1&&(oe.push(J),P.push(J),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,P)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,oe))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),fe)for(let ve=0;ve<M.length;ve++){t.bindFramebuffer(i.FRAMEBUFFER,Ee.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.RENDERBUFFER,Ee.__webglColorRenderbuffer[ve]);let Je=n.get(M[ve]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Ee.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.TEXTURE_2D,Je,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ee.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.resolveDepthBuffer===!1&&l){let M=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[M])}}}function re(w){return Math.min(s.maxSamples,w.samples)}function Me(w){let M=n.get(w);return w.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function ue(w){let M=a.render.frame;h.get(w)!==M&&(h.set(w,M),w.update())}function Ue(w,M){let k=w.colorSpace,Z=w.format,ne=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||k!==Xs&&k!==yi&&(tt.getTransfer(k)===lt?(Z!==Sn||ne!==Qn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",k)),M}function xe(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(c.width=w.naturalWidth||w.width,c.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(c.width=w.displayWidth,c.height=w.displayHeight):(c.width=w.width,c.height=w.height),c}this.allocateTextureUnit=z,this.resetTextureUnits=H,this.setTexture2D=j,this.setTexture2DArray=X,this.setTexture3D=U,this.setTextureCube=O,this.rebindTextures=Oe,this.setupRenderTarget=et,this.updateRenderTargetMipmap=Q,this.updateMultisampleRenderTarget=Re,this.setupDepthRenderbuffer=Be,this.setupFrameBufferTexture=me,this.useMultisampledRTT=Me}function y_(i,e){function t(n,s=yi){let r,a=tt.getTransfer(s);if(n===Qn)return i.UNSIGNED_BYTE;if(n===Tc)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Ac)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Iu)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Cu)return i.BYTE;if(n===Pu)return i.SHORT;if(n===mr)return i.UNSIGNED_SHORT;if(n===wc)return i.INT;if(n===Xi)return i.UNSIGNED_INT;if(n===Ln)return i.FLOAT;if(n===Ar)return i.HALF_FLOAT;if(n===Du)return i.ALPHA;if(n===Lu)return i.RGB;if(n===Sn)return i.RGBA;if(n===Uu)return i.LUMINANCE;if(n===Nu)return i.LUMINANCE_ALPHA;if(n===ws)return i.DEPTH_COMPONENT;if(n===Us)return i.DEPTH_STENCIL;if(n===Rc)return i.RED;if(n===Cc)return i.RED_INTEGER;if(n===Ou)return i.RG;if(n===Pc)return i.RG_INTEGER;if(n===Ic)return i.RGBA_INTEGER;if(n===fa||n===pa||n===ma||n===ga)if(a===lt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===fa)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===pa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ma)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ga)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===fa)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===pa)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ma)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ga)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===fl||n===pl||n===ml||n===gl)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===fl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===pl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===ml)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===gl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===_l||n===yl||n===xl)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===_l||n===yl)return a===lt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===xl)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===vl||n===Ml||n===bl||n===Sl||n===El||n===wl||n===Tl||n===Al||n===Rl||n===Cl||n===Pl||n===Il||n===Dl||n===Ll)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===vl)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Ml)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===bl)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Sl)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===El)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===wl)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Tl)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Al)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Rl)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Cl)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Pl)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Il)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Dl)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ll)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===_a||n===Ul||n===Nl)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===_a)return a===lt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Ul)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Nl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Fu||n===Ol||n===Fl||n===Bl)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===_a)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Ol)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Fl)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Bl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Ls?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}var Ql=class extends Nt{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}},mt=class extends Rt{constructor(){super(),this.isGroup=!0,this.type="Group"}},x_={type:"move"},hr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new mt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new mt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new mt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(let _ of e.hand.values()){let m=t.getJointPose(_,n),p=this._getHandJoint(c,_);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}let h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,g=.005;c.inputState.pinching&&d>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(x_)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new mt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},v_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,M_=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,ec=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,n){if(this.texture===null){let s=new Jt,r=e.properties.get(s);r.__webglTexture=t.texture,(t.depthNear!=n.depthNear||t.depthFar!=n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=s}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new On({vertexShader:v_,fragmentShader:M_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new je(new si(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},tc=class extends ei{constructor(e,t){super();let n=this,s=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,g=null,_=new ec,m=t.getContextAttributes(),p=null,S=null,v=[],x=[],I=new ie,T=null,R=new Nt;R.viewport=new ct;let L=new Nt;L.viewport=new ct;let E=[R,L],y=new Ql,D=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let se=v[Y];return se===void 0&&(se=new hr,v[Y]=se),se.getTargetRaySpace()},this.getControllerGrip=function(Y){let se=v[Y];return se===void 0&&(se=new hr,v[Y]=se),se.getGripSpace()},this.getHand=function(Y){let se=v[Y];return se===void 0&&(se=new hr,v[Y]=se),se.getHandSpace()};function z(Y){let se=x.indexOf(Y.inputSource);if(se===-1)return;let me=v[se];me!==void 0&&(me.update(Y.inputSource,Y.frame,c||a),me.dispatchEvent({type:Y.type,data:Y.inputSource}))}function G(){s.removeEventListener("select",z),s.removeEventListener("selectstart",z),s.removeEventListener("selectend",z),s.removeEventListener("squeeze",z),s.removeEventListener("squeezestart",z),s.removeEventListener("squeezeend",z),s.removeEventListener("end",G),s.removeEventListener("inputsourceschange",j);for(let Y=0;Y<v.length;Y++){let se=x[Y];se!==null&&(x[Y]=null,v[Y].disconnect(se))}D=null,H=null,_.reset(),e.setRenderTarget(p),f=null,d=null,u=null,s=null,S=null,$e.stop(),n.isPresenting=!1,e.setPixelRatio(T),e.setSize(I.width,I.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){r=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){o=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(Y){c=Y},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(Y){if(s=Y,s!==null){if(p=e.getRenderTarget(),s.addEventListener("select",z),s.addEventListener("selectstart",z),s.addEventListener("selectend",z),s.addEventListener("squeeze",z),s.addEventListener("squeezestart",z),s.addEventListener("squeezeend",z),s.addEventListener("end",G),s.addEventListener("inputsourceschange",j),m.xrCompatible!==!0&&await t.makeXRCompatible(),T=e.getPixelRatio(),e.getSize(I),s.renderState.layers===void 0){let se={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,se),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),S=new ti(f.framebufferWidth,f.framebufferHeight,{format:Sn,type:Qn,colorSpace:e.outputColorSpace,stencilBuffer:m.stencil})}else{let se=null,me=null,ce=null;m.depth&&(ce=m.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,se=m.stencil?Us:ws,me=m.stencil?Ls:Xi);let De={colorFormat:t.RGBA8,depthFormat:ce,scaleFactor:r};u=new XRWebGLBinding(s,t),d=u.createProjectionLayer(De),s.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),S=new ti(d.textureWidth,d.textureHeight,{format:Sn,type:Qn,depthTexture:new Aa(d.textureWidth,d.textureHeight,me,void 0,void 0,void 0,void 0,void 0,void 0,se),stencilBuffer:m.stencil,colorSpace:e.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),$e.setContext(s),$e.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function j(Y){for(let se=0;se<Y.removed.length;se++){let me=Y.removed[se],ce=x.indexOf(me);ce>=0&&(x[ce]=null,v[ce].disconnect(me))}for(let se=0;se<Y.added.length;se++){let me=Y.added[se],ce=x.indexOf(me);if(ce===-1){for(let Be=0;Be<v.length;Be++)if(Be>=x.length){x.push(me),ce=Be;break}else if(x[Be]===null){x[Be]=me,ce=Be;break}if(ce===-1)break}let De=v[ce];De&&De.connect(me)}}let X=new C,U=new C;function O(Y,se,me){X.setFromMatrixPosition(se.matrixWorld),U.setFromMatrixPosition(me.matrixWorld);let ce=X.distanceTo(U),De=se.projectionMatrix.elements,Be=me.projectionMatrix.elements,Oe=De[14]/(De[10]-1),et=De[14]/(De[10]+1),Q=(De[9]+1)/De[5],oe=(De[9]-1)/De[5],P=(De[8]-1)/De[0],Re=(Be[8]+1)/Be[0],re=Oe*P,Me=Oe*Re,ue=ce/(-P+Re),Ue=ue*-P;if(se.matrixWorld.decompose(Y.position,Y.quaternion,Y.scale),Y.translateX(Ue),Y.translateZ(ue),Y.matrixWorld.compose(Y.position,Y.quaternion,Y.scale),Y.matrixWorldInverse.copy(Y.matrixWorld).invert(),De[10]===-1)Y.projectionMatrix.copy(se.projectionMatrix),Y.projectionMatrixInverse.copy(se.projectionMatrixInverse);else{let xe=Oe+ue,w=et+ue,M=re-Ue,k=Me+(ce-Ue),Z=Q*et/w*xe,ne=oe*et/w*xe;Y.projectionMatrix.makePerspective(M,k,Z,ne,xe,w),Y.projectionMatrixInverse.copy(Y.projectionMatrix).invert()}}function ee(Y,se){se===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(se.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(s===null)return;let se=Y.near,me=Y.far;_.texture!==null&&(_.depthNear>0&&(se=_.depthNear),_.depthFar>0&&(me=_.depthFar)),y.near=L.near=R.near=se,y.far=L.far=R.far=me,(D!==y.near||H!==y.far)&&(s.updateRenderState({depthNear:y.near,depthFar:y.far}),D=y.near,H=y.far),R.layers.mask=Y.layers.mask|2,L.layers.mask=Y.layers.mask|4,y.layers.mask=R.layers.mask|L.layers.mask;let ce=Y.parent,De=y.cameras;ee(y,ce);for(let Be=0;Be<De.length;Be++)ee(De[Be],ce);De.length===2?O(y,R,L):y.projectionMatrix.copy(R.projectionMatrix),$(Y,y,ce)};function $(Y,se,me){me===null?Y.matrix.copy(se.matrixWorld):(Y.matrix.copy(me.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(se.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(se.projectionMatrix),Y.projectionMatrixInverse.copy(se.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=gr*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return y},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(Y){l=Y,d!==null&&(d.fixedFoveation=Y),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Y)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(y)};let he=null;function Ie(Y,se){if(h=se.getViewerPose(c||a),g=se,h!==null){let me=h.views;f!==null&&(e.setRenderTargetFramebuffer(S,f.framebuffer),e.setRenderTarget(S));let ce=!1;me.length!==y.cameras.length&&(y.cameras.length=0,ce=!0);for(let Be=0;Be<me.length;Be++){let Oe=me[Be],et=null;if(f!==null)et=f.getViewport(Oe);else{let oe=u.getViewSubImage(d,Oe);et=oe.viewport,Be===0&&(e.setRenderTargetTextures(S,oe.colorTexture,d.ignoreDepthValues?void 0:oe.depthStencilTexture),e.setRenderTarget(S))}let Q=E[Be];Q===void 0&&(Q=new Nt,Q.layers.enable(Be),Q.viewport=new ct,E[Be]=Q),Q.matrix.fromArray(Oe.transform.matrix),Q.matrix.decompose(Q.position,Q.quaternion,Q.scale),Q.projectionMatrix.fromArray(Oe.projectionMatrix),Q.projectionMatrixInverse.copy(Q.projectionMatrix).invert(),Q.viewport.set(et.x,et.y,et.width,et.height),Be===0&&(y.matrix.copy(Q.matrix),y.matrix.decompose(y.position,y.quaternion,y.scale)),ce===!0&&y.cameras.push(Q)}let De=s.enabledFeatures;if(De&&De.includes("depth-sensing")){let Be=u.getDepthInformation(me[0]);Be&&Be.isValid&&Be.texture&&_.init(e,Be,s.renderState)}}for(let me=0;me<v.length;me++){let ce=x[me],De=v[me];ce!==null&&De!==void 0&&De.update(ce,se,c||a)}he&&he(Y,se),se.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:se}),g=null}let $e=new Gu;$e.setAnimationLoop(Ie),this.setAnimationLoop=function(Y){he=Y},this.dispose=function(){}}},zi=new Un,b_=new Ke;function S_(i,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,Vu(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,S,v,x){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),u(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p)):p.isMeshStandardMaterial?(r(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,x)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),_(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,S,v):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Ht&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Ht&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let S=e.get(p),v=S.envMap,x=S.envMapRotation;v&&(m.envMap.value=v,zi.copy(x),zi.x*=-1,zi.y*=-1,zi.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(zi.y*=-1,zi.z*=-1),m.envMapRotation.value.setFromMatrix4(b_.makeRotationFromEuler(zi)),m.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,S,v){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*S,m.scale.value=v*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function u(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,S){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Ht&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=S.texture,m.transmissionSamplerSize.value.set(S.width,S.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function _(m,p){let S=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(S.matrixWorld),m.nearDistance.value=S.shadow.camera.near,m.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function E_(i,e,t,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,v){let x=v.program;n.uniformBlockBinding(S,x)}function c(S,v){let x=s[S.id];x===void 0&&(g(S),x=h(S),s[S.id]=x,S.addEventListener("dispose",m));let I=v.program;n.updateUBOMapping(S,I);let T=e.render.frame;r[S.id]!==T&&(d(S),r[S.id]=T)}function h(S){let v=u();S.__bindingPointIndex=v;let x=i.createBuffer(),I=S.__size,T=S.usage;return i.bindBuffer(i.UNIFORM_BUFFER,x),i.bufferData(i.UNIFORM_BUFFER,I,T),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,v,x),x}function u(){for(let S=0;S<o;S++)if(a.indexOf(S)===-1)return a.push(S),S;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(S){let v=s[S.id],x=S.uniforms,I=S.__cache;i.bindBuffer(i.UNIFORM_BUFFER,v);for(let T=0,R=x.length;T<R;T++){let L=Array.isArray(x[T])?x[T]:[x[T]];for(let E=0,y=L.length;E<y;E++){let D=L[E];if(f(D,T,E,I)===!0){let H=D.__offset,z=Array.isArray(D.value)?D.value:[D.value],G=0;for(let j=0;j<z.length;j++){let X=z[j],U=_(X);typeof X=="number"||typeof X=="boolean"?(D.__data[0]=X,i.bufferSubData(i.UNIFORM_BUFFER,H+G,D.__data)):X.isMatrix3?(D.__data[0]=X.elements[0],D.__data[1]=X.elements[1],D.__data[2]=X.elements[2],D.__data[3]=0,D.__data[4]=X.elements[3],D.__data[5]=X.elements[4],D.__data[6]=X.elements[5],D.__data[7]=0,D.__data[8]=X.elements[6],D.__data[9]=X.elements[7],D.__data[10]=X.elements[8],D.__data[11]=0):(X.toArray(D.__data,G),G+=U.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,H,D.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(S,v,x,I){let T=S.value,R=v+"_"+x;if(I[R]===void 0)return typeof T=="number"||typeof T=="boolean"?I[R]=T:I[R]=T.clone(),!0;{let L=I[R];if(typeof T=="number"||typeof T=="boolean"){if(L!==T)return I[R]=T,!0}else if(L.equals(T)===!1)return L.copy(T),!0}return!1}function g(S){let v=S.uniforms,x=0,I=16;for(let R=0,L=v.length;R<L;R++){let E=Array.isArray(v[R])?v[R]:[v[R]];for(let y=0,D=E.length;y<D;y++){let H=E[y],z=Array.isArray(H.value)?H.value:[H.value];for(let G=0,j=z.length;G<j;G++){let X=z[G],U=_(X),O=x%I,ee=O%U.boundary,$=O+ee;x+=ee,$!==0&&I-$<U.storage&&(x+=I-$),H.__data=new Float32Array(U.storage/Float32Array.BYTES_PER_ELEMENT),H.__offset=x,x+=U.storage}}}let T=x%I;return T>0&&(x+=I-T),S.__size=x,S.__cache={},this}function _(S){let v={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(v.boundary=4,v.storage=4):S.isVector2?(v.boundary=8,v.storage=8):S.isVector3||S.isColor?(v.boundary=16,v.storage=12):S.isVector4?(v.boundary=16,v.storage=16):S.isMatrix3?(v.boundary=48,v.storage=48):S.isMatrix4?(v.boundary=64,v.storage=64):S.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",S),v}function m(S){let v=S.target;v.removeEventListener("dispose",m);let x=a.indexOf(v.__bindingPointIndex);a.splice(x,1),i.deleteBuffer(s[v.id]),delete s[v.id],delete r[v.id]}function p(){for(let S in s)i.deleteBuffer(s[S]);a=[],s={},r={}}return{bind:l,update:c,dispose:p}}var Ra=class{constructor(e={}){let{canvas:t=Rf(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reverseDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=a;let g=new Uint32Array(4),_=new Int32Array(4),m=null,p=null,S=[],v=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Ut,this.toneMapping=Mi,this.toneMappingExposure=1;let x=this,I=!1,T=0,R=0,L=null,E=-1,y=null,D=new ct,H=new ct,z=null,G=new qe(0),j=0,X=t.width,U=t.height,O=1,ee=null,$=null,he=new ct(0,0,X,U),Ie=new ct(0,0,X,U),$e=!1,Y=new yr,se=!1,me=!1,ce=new Ke,De=new Ke,Be=new C,Oe=new ct,et={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Q=!1;function oe(){return L===null?O:1}let P=n;function Re(b,F){return t.getContext(b,F)}try{let b={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Sc}`),t.addEventListener("webglcontextlost",K,!1),t.addEventListener("webglcontextrestored",ye,!1),t.addEventListener("webglcontextcreationerror",ge,!1),P===null){let F="webgl2";if(P=Re(F,b),P===null)throw Re(F)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(b){throw console.error("THREE.WebGLRenderer: "+b.message),b}let re,Me,ue,Ue,xe,w,M,k,Z,ne,J,Ee,fe,ve,Je,ae,be,Ne,Fe,Se,Qe,We,ut,N;function pe(){re=new kg(P),re.init(),We=new y_(P,re),Me=new Ug(P,re,e,We),ue=new m_(P,re),Me.reverseDepthBuffer&&d&&ue.buffers.depth.setReversed(!0),Ue=new Gg(P),xe=new n_,w=new __(P,re,ue,xe,Me,We,Ue),M=new Og(x),k=new zg(x),Z=new Jf(P),ut=new Dg(P,Z),ne=new Hg(P,Z,Ue,ut),J=new Xg(P,ne,Z,Ue),Fe=new Wg(P,Me,w),ae=new Ng(xe),Ee=new t_(x,M,k,re,Me,ut,ae),fe=new S_(x,xe),ve=new s_,Je=new h_(re),Ne=new Ig(x,M,k,ue,J,f,l),be=new f_(x,J,Me),N=new E_(P,Ue,Me,ue),Se=new Lg(P,re,Ue),Qe=new Vg(P,re,Ue),Ue.programs=Ee.programs,x.capabilities=Me,x.extensions=re,x.properties=xe,x.renderLists=ve,x.shadowMap=be,x.state=ue,x.info=Ue}pe();let q=new tc(x,P);this.xr=q,this.getContext=function(){return P},this.getContextAttributes=function(){return P.getContextAttributes()},this.forceContextLoss=function(){let b=re.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){let b=re.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return O},this.setPixelRatio=function(b){b!==void 0&&(O=b,this.setSize(X,U,!1))},this.getSize=function(b){return b.set(X,U)},this.setSize=function(b,F,V=!0){if(q.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}X=b,U=F,t.width=Math.floor(b*O),t.height=Math.floor(F*O),V===!0&&(t.style.width=b+"px",t.style.height=F+"px"),this.setViewport(0,0,b,F)},this.getDrawingBufferSize=function(b){return b.set(X*O,U*O).floor()},this.setDrawingBufferSize=function(b,F,V){X=b,U=F,O=V,t.width=Math.floor(b*V),t.height=Math.floor(F*V),this.setViewport(0,0,b,F)},this.getCurrentViewport=function(b){return b.copy(D)},this.getViewport=function(b){return b.copy(he)},this.setViewport=function(b,F,V,W){b.isVector4?he.set(b.x,b.y,b.z,b.w):he.set(b,F,V,W),ue.viewport(D.copy(he).multiplyScalar(O).round())},this.getScissor=function(b){return b.copy(Ie)},this.setScissor=function(b,F,V,W){b.isVector4?Ie.set(b.x,b.y,b.z,b.w):Ie.set(b,F,V,W),ue.scissor(H.copy(Ie).multiplyScalar(O).round())},this.getScissorTest=function(){return $e},this.setScissorTest=function(b){ue.setScissorTest($e=b)},this.setOpaqueSort=function(b){ee=b},this.setTransparentSort=function(b){$=b},this.getClearColor=function(b){return b.copy(Ne.getClearColor())},this.setClearColor=function(){Ne.setClearColor.apply(Ne,arguments)},this.getClearAlpha=function(){return Ne.getClearAlpha()},this.setClearAlpha=function(){Ne.setClearAlpha.apply(Ne,arguments)},this.clear=function(b=!0,F=!0,V=!0){let W=0;if(b){let B=!1;if(L!==null){let le=L.texture.format;B=le===Ic||le===Pc||le===Cc}if(B){let le=L.texture.type,_e=le===Qn||le===Xi||le===mr||le===Ls||le===Tc||le===Ac,we=Ne.getClearColor(),Te=Ne.getClearAlpha(),ze=we.r,Ve=we.g,Ae=we.b;_e?(g[0]=ze,g[1]=Ve,g[2]=Ae,g[3]=Te,P.clearBufferuiv(P.COLOR,0,g)):(_[0]=ze,_[1]=Ve,_[2]=Ae,_[3]=Te,P.clearBufferiv(P.COLOR,0,_))}else W|=P.COLOR_BUFFER_BIT}F&&(W|=P.DEPTH_BUFFER_BIT),V&&(W|=P.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),P.clear(W)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",K,!1),t.removeEventListener("webglcontextrestored",ye,!1),t.removeEventListener("webglcontextcreationerror",ge,!1),ve.dispose(),Je.dispose(),xe.dispose(),M.dispose(),k.dispose(),J.dispose(),ut.dispose(),N.dispose(),Ee.dispose(),q.dispose(),q.removeEventListener("sessionstart",eh),q.removeEventListener("sessionend",th),Li.stop()};function K(b){b.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),I=!0}function ye(){console.log("THREE.WebGLRenderer: Context Restored."),I=!1;let b=Ue.autoReset,F=be.enabled,V=be.autoUpdate,W=be.needsUpdate,B=be.type;pe(),Ue.autoReset=b,be.enabled=F,be.autoUpdate=V,be.needsUpdate=W,be.type=B}function ge(b){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function He(b){let F=b.target;F.removeEventListener("dispose",He),vt(F)}function vt(b){Bt(b),xe.remove(b)}function Bt(b){let F=xe.get(b).programs;F!==void 0&&(F.forEach(function(V){Ee.releaseProgram(V)}),b.isShaderMaterial&&Ee.releaseShaderCache(b))}this.renderBufferDirect=function(b,F,V,W,B,le){F===null&&(F=et);let _e=B.isMesh&&B.matrixWorld.determinant()<0,we=bd(b,F,V,W,B);ue.setMaterial(W,_e);let Te=V.index,ze=1;if(W.wireframe===!0){if(Te=ne.getWireframeAttribute(V),Te===void 0)return;ze=2}let Ve=V.drawRange,Ae=V.attributes.position,nt=Ve.start*ze,dt=(Ve.start+Ve.count)*ze;le!==null&&(nt=Math.max(nt,le.start*ze),dt=Math.min(dt,(le.start+le.count)*ze)),Te!==null?(nt=Math.max(nt,0),dt=Math.min(dt,Te.count)):Ae!=null&&(nt=Math.max(nt,0),dt=Math.min(dt,Ae.count));let ft=dt-nt;if(ft<0||ft===1/0)return;ut.setup(B,W,we,V,Te);let Zt,st=Se;if(Te!==null&&(Zt=Z.get(Te),st=Qe,st.setIndex(Zt)),B.isMesh)W.wireframe===!0?(ue.setLineWidth(W.wireframeLinewidth*oe()),st.setMode(P.LINES)):st.setMode(P.TRIANGLES);else if(B.isLine){let Ce=W.linewidth;Ce===void 0&&(Ce=1),ue.setLineWidth(Ce*oe()),B.isLineSegments?st.setMode(P.LINES):B.isLineLoop?st.setMode(P.LINE_LOOP):st.setMode(P.LINE_STRIP)}else B.isPoints?st.setMode(P.POINTS):B.isSprite&&st.setMode(P.TRIANGLES);if(B.isBatchedMesh)if(B._multiDrawInstances!==null)st.renderMultiDrawInstances(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount,B._multiDrawInstances);else if(re.get("WEBGL_multi_draw"))st.renderMultiDraw(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount);else{let Ce=B._multiDrawStarts,Wn=B._multiDrawCounts,rt=B._multiDrawCount,xn=Te?Z.get(Te).bytesPerElement:1,rs=xe.get(W).currentProgram.getUniforms();for(let Qt=0;Qt<rt;Qt++)rs.setValue(P,"_gl_DrawID",Qt),st.render(Ce[Qt]/xn,Wn[Qt])}else if(B.isInstancedMesh)st.renderInstances(nt,ft,B.count);else if(V.isInstancedBufferGeometry){let Ce=V._maxInstanceCount!==void 0?V._maxInstanceCount:1/0,Wn=Math.min(V.instanceCount,Ce);st.renderInstances(nt,ft,Wn)}else st.render(nt,ft)};function ot(b,F,V){b.transparent===!0&&b.side===sn&&b.forceSinglePass===!1?(b.side=Ht,b.needsUpdate=!0,Dr(b,F,V),b.side=bi,b.needsUpdate=!0,Dr(b,F,V),b.side=sn):Dr(b,F,V)}this.compile=function(b,F,V=null){V===null&&(V=b),p=Je.get(V),p.init(F),v.push(p),V.traverseVisible(function(B){B.isLight&&B.layers.test(F.layers)&&(p.pushLight(B),B.castShadow&&p.pushShadow(B))}),b!==V&&b.traverseVisible(function(B){B.isLight&&B.layers.test(F.layers)&&(p.pushLight(B),B.castShadow&&p.pushShadow(B))}),p.setupLights();let W=new Set;return b.traverse(function(B){if(!(B.isMesh||B.isPoints||B.isLine||B.isSprite))return;let le=B.material;if(le)if(Array.isArray(le))for(let _e=0;_e<le.length;_e++){let we=le[_e];ot(we,V,B),W.add(we)}else ot(le,V,B),W.add(le)}),v.pop(),p=null,W},this.compileAsync=function(b,F,V=null){let W=this.compile(b,F,V);return new Promise(B=>{function le(){if(W.forEach(function(_e){xe.get(_e).currentProgram.isReady()&&W.delete(_e)}),W.size===0){B(b);return}setTimeout(le,10)}re.get("KHR_parallel_shader_compile")!==null?le():setTimeout(le,10)})};let yn=null;function Gn(b){yn&&yn(b)}function eh(){Li.stop()}function th(){Li.start()}let Li=new Gu;Li.setAnimationLoop(Gn),typeof self<"u"&&Li.setContext(self),this.setAnimationLoop=function(b){yn=b,q.setAnimationLoop(b),b===null?Li.stop():Li.start()},q.addEventListener("sessionstart",eh),q.addEventListener("sessionend",th),this.render=function(b,F){if(F!==void 0&&F.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),q.enabled===!0&&q.isPresenting===!0&&(q.cameraAutoUpdate===!0&&q.updateCamera(F),F=q.getCamera()),b.isScene===!0&&b.onBeforeRender(x,b,F,L),p=Je.get(b,v.length),p.init(F),v.push(p),De.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),Y.setFromProjectionMatrix(De),me=this.localClippingEnabled,se=ae.init(this.clippingPlanes,me),m=ve.get(b,S.length),m.init(),S.push(m),q.enabled===!0&&q.isPresenting===!0){let le=x.xr.getDepthSensingMesh();le!==null&&yo(le,F,-1/0,x.sortObjects)}yo(b,F,0,x.sortObjects),m.finish(),x.sortObjects===!0&&m.sort(ee,$),Q=q.enabled===!1||q.isPresenting===!1||q.hasDepthSensing()===!1,Q&&Ne.addToRenderList(m,b),this.info.render.frame++,se===!0&&ae.beginShadows();let V=p.state.shadowsArray;be.render(V,b,F),se===!0&&ae.endShadows(),this.info.autoReset===!0&&this.info.reset();let W=m.opaque,B=m.transmissive;if(p.setupLights(),F.isArrayCamera){let le=F.cameras;if(B.length>0)for(let _e=0,we=le.length;_e<we;_e++){let Te=le[_e];ih(W,B,b,Te)}Q&&Ne.render(b);for(let _e=0,we=le.length;_e<we;_e++){let Te=le[_e];nh(m,b,Te,Te.viewport)}}else B.length>0&&ih(W,B,b,F),Q&&Ne.render(b),nh(m,b,F);L!==null&&(w.updateMultisampleRenderTarget(L),w.updateRenderTargetMipmap(L)),b.isScene===!0&&b.onAfterRender(x,b,F),ut.resetDefaultState(),E=-1,y=null,v.pop(),v.length>0?(p=v[v.length-1],se===!0&&ae.setGlobalState(x.clippingPlanes,p.state.camera)):p=null,S.pop(),S.length>0?m=S[S.length-1]:m=null};function yo(b,F,V,W){if(b.visible===!1)return;if(b.layers.test(F.layers)){if(b.isGroup)V=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(F);else if(b.isLight)p.pushLight(b),b.castShadow&&p.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||Y.intersectsSprite(b)){W&&Oe.setFromMatrixPosition(b.matrixWorld).applyMatrix4(De);let _e=J.update(b),we=b.material;we.visible&&m.push(b,_e,we,V,Oe.z,null)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||Y.intersectsObject(b))){let _e=J.update(b),we=b.material;if(W&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),Oe.copy(b.boundingSphere.center)):(_e.boundingSphere===null&&_e.computeBoundingSphere(),Oe.copy(_e.boundingSphere.center)),Oe.applyMatrix4(b.matrixWorld).applyMatrix4(De)),Array.isArray(we)){let Te=_e.groups;for(let ze=0,Ve=Te.length;ze<Ve;ze++){let Ae=Te[ze],nt=we[Ae.materialIndex];nt&&nt.visible&&m.push(b,_e,nt,V,Oe.z,Ae)}}else we.visible&&m.push(b,_e,we,V,Oe.z,null)}}let le=b.children;for(let _e=0,we=le.length;_e<we;_e++)yo(le[_e],F,V,W)}function nh(b,F,V,W){let B=b.opaque,le=b.transmissive,_e=b.transparent;p.setupLightsView(V),se===!0&&ae.setGlobalState(x.clippingPlanes,V),W&&ue.viewport(D.copy(W)),B.length>0&&Ir(B,F,V),le.length>0&&Ir(le,F,V),_e.length>0&&Ir(_e,F,V),ue.buffers.depth.setTest(!0),ue.buffers.depth.setMask(!0),ue.buffers.color.setMask(!0),ue.setPolygonOffset(!1)}function ih(b,F,V,W){if((V.isScene===!0?V.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[W.id]===void 0&&(p.state.transmissionRenderTarget[W.id]=new ti(1,1,{generateMipmaps:!0,type:re.has("EXT_color_buffer_half_float")||re.has("EXT_color_buffer_float")?Ar:Qn,minFilter:Wi,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:tt.workingColorSpace}));let le=p.state.transmissionRenderTarget[W.id],_e=W.viewport||D;le.setSize(_e.z,_e.w);let we=x.getRenderTarget();x.setRenderTarget(le),x.getClearColor(G),j=x.getClearAlpha(),j<1&&x.setClearColor(16777215,.5),x.clear(),Q&&Ne.render(V);let Te=x.toneMapping;x.toneMapping=Mi;let ze=W.viewport;if(W.viewport!==void 0&&(W.viewport=void 0),p.setupLightsView(W),se===!0&&ae.setGlobalState(x.clippingPlanes,W),Ir(b,V,W),w.updateMultisampleRenderTarget(le),w.updateRenderTargetMipmap(le),re.has("WEBGL_multisampled_render_to_texture")===!1){let Ve=!1;for(let Ae=0,nt=F.length;Ae<nt;Ae++){let dt=F[Ae],ft=dt.object,Zt=dt.geometry,st=dt.material,Ce=dt.group;if(st.side===sn&&ft.layers.test(W.layers)){let Wn=st.side;st.side=Ht,st.needsUpdate=!0,sh(ft,V,W,Zt,st,Ce),st.side=Wn,st.needsUpdate=!0,Ve=!0}}Ve===!0&&(w.updateMultisampleRenderTarget(le),w.updateRenderTargetMipmap(le))}x.setRenderTarget(we),x.setClearColor(G,j),ze!==void 0&&(W.viewport=ze),x.toneMapping=Te}function Ir(b,F,V){let W=F.isScene===!0?F.overrideMaterial:null;for(let B=0,le=b.length;B<le;B++){let _e=b[B],we=_e.object,Te=_e.geometry,ze=W===null?_e.material:W,Ve=_e.group;we.layers.test(V.layers)&&sh(we,F,V,Te,ze,Ve)}}function sh(b,F,V,W,B,le){b.onBeforeRender(x,F,V,W,B,le),b.modelViewMatrix.multiplyMatrices(V.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),B.onBeforeRender(x,F,V,W,b,le),B.transparent===!0&&B.side===sn&&B.forceSinglePass===!1?(B.side=Ht,B.needsUpdate=!0,x.renderBufferDirect(V,F,W,B,b,le),B.side=bi,B.needsUpdate=!0,x.renderBufferDirect(V,F,W,B,b,le),B.side=sn):x.renderBufferDirect(V,F,W,B,b,le),b.onAfterRender(x,F,V,W,B,le)}function Dr(b,F,V){F.isScene!==!0&&(F=et);let W=xe.get(b),B=p.state.lights,le=p.state.shadowsArray,_e=B.state.version,we=Ee.getParameters(b,B.state,le,F,V),Te=Ee.getProgramCacheKey(we),ze=W.programs;W.environment=b.isMeshStandardMaterial?F.environment:null,W.fog=F.fog,W.envMap=(b.isMeshStandardMaterial?k:M).get(b.envMap||W.environment),W.envMapRotation=W.environment!==null&&b.envMap===null?F.environmentRotation:b.envMapRotation,ze===void 0&&(b.addEventListener("dispose",He),ze=new Map,W.programs=ze);let Ve=ze.get(Te);if(Ve!==void 0){if(W.currentProgram===Ve&&W.lightsStateVersion===_e)return ah(b,we),Ve}else we.uniforms=Ee.getUniforms(b),b.onBeforeCompile(we,x),Ve=Ee.acquireProgram(we,Te),ze.set(Te,Ve),W.uniforms=we.uniforms;let Ae=W.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(Ae.clippingPlanes=ae.uniform),ah(b,we),W.needsLights=Ed(b),W.lightsStateVersion=_e,W.needsLights&&(Ae.ambientLightColor.value=B.state.ambient,Ae.lightProbe.value=B.state.probe,Ae.directionalLights.value=B.state.directional,Ae.directionalLightShadows.value=B.state.directionalShadow,Ae.spotLights.value=B.state.spot,Ae.spotLightShadows.value=B.state.spotShadow,Ae.rectAreaLights.value=B.state.rectArea,Ae.ltc_1.value=B.state.rectAreaLTC1,Ae.ltc_2.value=B.state.rectAreaLTC2,Ae.pointLights.value=B.state.point,Ae.pointLightShadows.value=B.state.pointShadow,Ae.hemisphereLights.value=B.state.hemi,Ae.directionalShadowMap.value=B.state.directionalShadowMap,Ae.directionalShadowMatrix.value=B.state.directionalShadowMatrix,Ae.spotShadowMap.value=B.state.spotShadowMap,Ae.spotLightMatrix.value=B.state.spotLightMatrix,Ae.spotLightMap.value=B.state.spotLightMap,Ae.pointShadowMap.value=B.state.pointShadowMap,Ae.pointShadowMatrix.value=B.state.pointShadowMatrix),W.currentProgram=Ve,W.uniformsList=null,Ve}function rh(b){if(b.uniformsList===null){let F=b.currentProgram.getUniforms();b.uniformsList=Rs.seqWithValue(F.seq,b.uniforms)}return b.uniformsList}function ah(b,F){let V=xe.get(b);V.outputColorSpace=F.outputColorSpace,V.batching=F.batching,V.batchingColor=F.batchingColor,V.instancing=F.instancing,V.instancingColor=F.instancingColor,V.instancingMorph=F.instancingMorph,V.skinning=F.skinning,V.morphTargets=F.morphTargets,V.morphNormals=F.morphNormals,V.morphColors=F.morphColors,V.morphTargetsCount=F.morphTargetsCount,V.numClippingPlanes=F.numClippingPlanes,V.numIntersection=F.numClipIntersection,V.vertexAlphas=F.vertexAlphas,V.vertexTangents=F.vertexTangents,V.toneMapping=F.toneMapping}function bd(b,F,V,W,B){F.isScene!==!0&&(F=et),w.resetTextureUnits();let le=F.fog,_e=W.isMeshStandardMaterial?F.environment:null,we=L===null?x.outputColorSpace:L.isXRRenderTarget===!0?L.texture.colorSpace:Xs,Te=(W.isMeshStandardMaterial?k:M).get(W.envMap||_e),ze=W.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,Ve=!!V.attributes.tangent&&(!!W.normalMap||W.anisotropy>0),Ae=!!V.morphAttributes.position,nt=!!V.morphAttributes.normal,dt=!!V.morphAttributes.color,ft=Mi;W.toneMapped&&(L===null||L.isXRRenderTarget===!0)&&(ft=x.toneMapping);let Zt=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,st=Zt!==void 0?Zt.length:0,Ce=xe.get(W),Wn=p.state.lights;if(se===!0&&(me===!0||b!==y)){let pn=b===y&&W.id===E;ae.setState(W,b,pn)}let rt=!1;W.version===Ce.__version?(Ce.needsLights&&Ce.lightsStateVersion!==Wn.state.version||Ce.outputColorSpace!==we||B.isBatchedMesh&&Ce.batching===!1||!B.isBatchedMesh&&Ce.batching===!0||B.isBatchedMesh&&Ce.batchingColor===!0&&B.colorTexture===null||B.isBatchedMesh&&Ce.batchingColor===!1&&B.colorTexture!==null||B.isInstancedMesh&&Ce.instancing===!1||!B.isInstancedMesh&&Ce.instancing===!0||B.isSkinnedMesh&&Ce.skinning===!1||!B.isSkinnedMesh&&Ce.skinning===!0||B.isInstancedMesh&&Ce.instancingColor===!0&&B.instanceColor===null||B.isInstancedMesh&&Ce.instancingColor===!1&&B.instanceColor!==null||B.isInstancedMesh&&Ce.instancingMorph===!0&&B.morphTexture===null||B.isInstancedMesh&&Ce.instancingMorph===!1&&B.morphTexture!==null||Ce.envMap!==Te||W.fog===!0&&Ce.fog!==le||Ce.numClippingPlanes!==void 0&&(Ce.numClippingPlanes!==ae.numPlanes||Ce.numIntersection!==ae.numIntersection)||Ce.vertexAlphas!==ze||Ce.vertexTangents!==Ve||Ce.morphTargets!==Ae||Ce.morphNormals!==nt||Ce.morphColors!==dt||Ce.toneMapping!==ft||Ce.morphTargetsCount!==st)&&(rt=!0):(rt=!0,Ce.__version=W.version);let xn=Ce.currentProgram;rt===!0&&(xn=Dr(W,F,B));let rs=!1,Qt=!1,js=!1,pt=xn.getUniforms(),Pn=Ce.uniforms;if(ue.useProgram(xn.program)&&(rs=!0,Qt=!0,js=!0),W.id!==E&&(E=W.id,Qt=!0),rs||y!==b){ue.buffers.depth.getReversed()?(ce.copy(b.projectionMatrix),Pf(ce),If(ce),pt.setValue(P,"projectionMatrix",ce)):pt.setValue(P,"projectionMatrix",b.projectionMatrix),pt.setValue(P,"viewMatrix",b.matrixWorldInverse);let hi=pt.map.cameraPosition;hi!==void 0&&hi.setValue(P,Be.setFromMatrixPosition(b.matrixWorld)),Me.logarithmicDepthBuffer&&pt.setValue(P,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(W.isMeshPhongMaterial||W.isMeshToonMaterial||W.isMeshLambertMaterial||W.isMeshBasicMaterial||W.isMeshStandardMaterial||W.isShaderMaterial)&&pt.setValue(P,"isOrthographic",b.isOrthographicCamera===!0),y!==b&&(y=b,Qt=!0,js=!0)}if(B.isSkinnedMesh){pt.setOptional(P,B,"bindMatrix"),pt.setOptional(P,B,"bindMatrixInverse");let pn=B.skeleton;pn&&(pn.boneTexture===null&&pn.computeBoneTexture(),pt.setValue(P,"boneTexture",pn.boneTexture,w))}B.isBatchedMesh&&(pt.setOptional(P,B,"batchingTexture"),pt.setValue(P,"batchingTexture",B._matricesTexture,w),pt.setOptional(P,B,"batchingIdTexture"),pt.setValue(P,"batchingIdTexture",B._indirectTexture,w),pt.setOptional(P,B,"batchingColorTexture"),B._colorsTexture!==null&&pt.setValue(P,"batchingColorTexture",B._colorsTexture,w));let Ks=V.morphAttributes;if((Ks.position!==void 0||Ks.normal!==void 0||Ks.color!==void 0)&&Fe.update(B,V,xn),(Qt||Ce.receiveShadow!==B.receiveShadow)&&(Ce.receiveShadow=B.receiveShadow,pt.setValue(P,"receiveShadow",B.receiveShadow)),W.isMeshGouraudMaterial&&W.envMap!==null&&(Pn.envMap.value=Te,Pn.flipEnvMap.value=Te.isCubeTexture&&Te.isRenderTargetTexture===!1?-1:1),W.isMeshStandardMaterial&&W.envMap===null&&F.environment!==null&&(Pn.envMapIntensity.value=F.environmentIntensity),Qt&&(pt.setValue(P,"toneMappingExposure",x.toneMappingExposure),Ce.needsLights&&Sd(Pn,js),le&&W.fog===!0&&fe.refreshFogUniforms(Pn,le),fe.refreshMaterialUniforms(Pn,W,O,U,p.state.transmissionRenderTarget[b.id]),Rs.upload(P,rh(Ce),Pn,w)),W.isShaderMaterial&&W.uniformsNeedUpdate===!0&&(Rs.upload(P,rh(Ce),Pn,w),W.uniformsNeedUpdate=!1),W.isSpriteMaterial&&pt.setValue(P,"center",B.center),pt.setValue(P,"modelViewMatrix",B.modelViewMatrix),pt.setValue(P,"normalMatrix",B.normalMatrix),pt.setValue(P,"modelMatrix",B.matrixWorld),W.isShaderMaterial||W.isRawShaderMaterial){let pn=W.uniformsGroups;for(let hi=0,ui=pn.length;hi<ui;hi++){let oh=pn[hi];N.update(oh,xn),N.bind(oh,xn)}}return xn}function Sd(b,F){b.ambientLightColor.needsUpdate=F,b.lightProbe.needsUpdate=F,b.directionalLights.needsUpdate=F,b.directionalLightShadows.needsUpdate=F,b.pointLights.needsUpdate=F,b.pointLightShadows.needsUpdate=F,b.spotLights.needsUpdate=F,b.spotLightShadows.needsUpdate=F,b.rectAreaLights.needsUpdate=F,b.hemisphereLights.needsUpdate=F}function Ed(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return T},this.getActiveMipmapLevel=function(){return R},this.getRenderTarget=function(){return L},this.setRenderTargetTextures=function(b,F,V){xe.get(b.texture).__webglTexture=F,xe.get(b.depthTexture).__webglTexture=V;let W=xe.get(b);W.__hasExternalTextures=!0,W.__autoAllocateDepthBuffer=V===void 0,W.__autoAllocateDepthBuffer||re.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),W.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(b,F){let V=xe.get(b);V.__webglFramebuffer=F,V.__useDefaultFramebuffer=F===void 0},this.setRenderTarget=function(b,F=0,V=0){L=b,T=F,R=V;let W=!0,B=null,le=!1,_e=!1;if(b){let Te=xe.get(b);if(Te.__useDefaultFramebuffer!==void 0)ue.bindFramebuffer(P.FRAMEBUFFER,null),W=!1;else if(Te.__webglFramebuffer===void 0)w.setupRenderTarget(b);else if(Te.__hasExternalTextures)w.rebindTextures(b,xe.get(b.texture).__webglTexture,xe.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){let Ae=b.depthTexture;if(Te.__boundDepthTexture!==Ae){if(Ae!==null&&xe.has(Ae)&&(b.width!==Ae.image.width||b.height!==Ae.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");w.setupDepthRenderbuffer(b)}}let ze=b.texture;(ze.isData3DTexture||ze.isDataArrayTexture||ze.isCompressedArrayTexture)&&(_e=!0);let Ve=xe.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(Ve[F])?B=Ve[F][V]:B=Ve[F],le=!0):b.samples>0&&w.useMultisampledRTT(b)===!1?B=xe.get(b).__webglMultisampledFramebuffer:Array.isArray(Ve)?B=Ve[V]:B=Ve,D.copy(b.viewport),H.copy(b.scissor),z=b.scissorTest}else D.copy(he).multiplyScalar(O).floor(),H.copy(Ie).multiplyScalar(O).floor(),z=$e;if(ue.bindFramebuffer(P.FRAMEBUFFER,B)&&W&&ue.drawBuffers(b,B),ue.viewport(D),ue.scissor(H),ue.setScissorTest(z),le){let Te=xe.get(b.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_CUBE_MAP_POSITIVE_X+F,Te.__webglTexture,V)}else if(_e){let Te=xe.get(b.texture),ze=F||0;P.framebufferTextureLayer(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,Te.__webglTexture,V||0,ze)}E=-1},this.readRenderTargetPixels=function(b,F,V,W,B,le,_e){if(!(b&&b.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let we=xe.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&_e!==void 0&&(we=we[_e]),we){ue.bindFramebuffer(P.FRAMEBUFFER,we);try{let Te=b.texture,ze=Te.format,Ve=Te.type;if(!Me.textureFormatReadable(ze)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Me.textureTypeReadable(Ve)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=b.width-W&&V>=0&&V<=b.height-B&&P.readPixels(F,V,W,B,We.convert(ze),We.convert(Ve),le)}finally{let Te=L!==null?xe.get(L).__webglFramebuffer:null;ue.bindFramebuffer(P.FRAMEBUFFER,Te)}}},this.readRenderTargetPixelsAsync=async function(b,F,V,W,B,le,_e){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let we=xe.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&_e!==void 0&&(we=we[_e]),we){let Te=b.texture,ze=Te.format,Ve=Te.type;if(!Me.textureFormatReadable(ze))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Me.textureTypeReadable(Ve))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(F>=0&&F<=b.width-W&&V>=0&&V<=b.height-B){ue.bindFramebuffer(P.FRAMEBUFFER,we);let Ae=P.createBuffer();P.bindBuffer(P.PIXEL_PACK_BUFFER,Ae),P.bufferData(P.PIXEL_PACK_BUFFER,le.byteLength,P.STREAM_READ),P.readPixels(F,V,W,B,We.convert(ze),We.convert(Ve),0);let nt=L!==null?xe.get(L).__webglFramebuffer:null;ue.bindFramebuffer(P.FRAMEBUFFER,nt);let dt=P.fenceSync(P.SYNC_GPU_COMMANDS_COMPLETE,0);return P.flush(),await Cf(P,dt,4),P.bindBuffer(P.PIXEL_PACK_BUFFER,Ae),P.getBufferSubData(P.PIXEL_PACK_BUFFER,0,le),P.deleteBuffer(Ae),P.deleteSync(dt),le}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(b,F=null,V=0){b.isTexture!==!0&&(or("WebGLRenderer: copyFramebufferToTexture function signature has changed."),F=arguments[0]||null,b=arguments[1]);let W=Math.pow(2,-V),B=Math.floor(b.image.width*W),le=Math.floor(b.image.height*W),_e=F!==null?F.x:0,we=F!==null?F.y:0;w.setTexture2D(b,0),P.copyTexSubImage2D(P.TEXTURE_2D,V,0,0,_e,we,B,le),ue.unbindTexture()},this.copyTextureToTexture=function(b,F,V=null,W=null,B=0){b.isTexture!==!0&&(or("WebGLRenderer: copyTextureToTexture function signature has changed."),W=arguments[0]||null,b=arguments[1],F=arguments[2],B=arguments[3]||0,V=null);let le,_e,we,Te,ze,Ve,Ae,nt,dt,ft=b.isCompressedTexture?b.mipmaps[B]:b.image;V!==null?(le=V.max.x-V.min.x,_e=V.max.y-V.min.y,we=V.isBox3?V.max.z-V.min.z:1,Te=V.min.x,ze=V.min.y,Ve=V.isBox3?V.min.z:0):(le=ft.width,_e=ft.height,we=ft.depth||1,Te=0,ze=0,Ve=0),W!==null?(Ae=W.x,nt=W.y,dt=W.z):(Ae=0,nt=0,dt=0);let Zt=We.convert(F.format),st=We.convert(F.type),Ce;F.isData3DTexture?(w.setTexture3D(F,0),Ce=P.TEXTURE_3D):F.isDataArrayTexture||F.isCompressedArrayTexture?(w.setTexture2DArray(F,0),Ce=P.TEXTURE_2D_ARRAY):(w.setTexture2D(F,0),Ce=P.TEXTURE_2D),P.pixelStorei(P.UNPACK_FLIP_Y_WEBGL,F.flipY),P.pixelStorei(P.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),P.pixelStorei(P.UNPACK_ALIGNMENT,F.unpackAlignment);let Wn=P.getParameter(P.UNPACK_ROW_LENGTH),rt=P.getParameter(P.UNPACK_IMAGE_HEIGHT),xn=P.getParameter(P.UNPACK_SKIP_PIXELS),rs=P.getParameter(P.UNPACK_SKIP_ROWS),Qt=P.getParameter(P.UNPACK_SKIP_IMAGES);P.pixelStorei(P.UNPACK_ROW_LENGTH,ft.width),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,ft.height),P.pixelStorei(P.UNPACK_SKIP_PIXELS,Te),P.pixelStorei(P.UNPACK_SKIP_ROWS,ze),P.pixelStorei(P.UNPACK_SKIP_IMAGES,Ve);let js=b.isDataArrayTexture||b.isData3DTexture,pt=F.isDataArrayTexture||F.isData3DTexture;if(b.isRenderTargetTexture||b.isDepthTexture){let Pn=xe.get(b),Ks=xe.get(F),pn=xe.get(Pn.__renderTarget),hi=xe.get(Ks.__renderTarget);ue.bindFramebuffer(P.READ_FRAMEBUFFER,pn.__webglFramebuffer),ue.bindFramebuffer(P.DRAW_FRAMEBUFFER,hi.__webglFramebuffer);for(let ui=0;ui<we;ui++)js&&P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,xe.get(b).__webglTexture,B,Ve+ui),b.isDepthTexture?(pt&&P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,xe.get(F).__webglTexture,B,dt+ui),P.blitFramebuffer(Te,ze,le,_e,Ae,nt,le,_e,P.DEPTH_BUFFER_BIT,P.NEAREST)):pt?P.copyTexSubImage3D(Ce,B,Ae,nt,dt+ui,Te,ze,le,_e):P.copyTexSubImage2D(Ce,B,Ae,nt,dt+ui,Te,ze,le,_e);ue.bindFramebuffer(P.READ_FRAMEBUFFER,null),ue.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else pt?b.isDataTexture||b.isData3DTexture?P.texSubImage3D(Ce,B,Ae,nt,dt,le,_e,we,Zt,st,ft.data):F.isCompressedArrayTexture?P.compressedTexSubImage3D(Ce,B,Ae,nt,dt,le,_e,we,Zt,ft.data):P.texSubImage3D(Ce,B,Ae,nt,dt,le,_e,we,Zt,st,ft):b.isDataTexture?P.texSubImage2D(P.TEXTURE_2D,B,Ae,nt,le,_e,Zt,st,ft.data):b.isCompressedTexture?P.compressedTexSubImage2D(P.TEXTURE_2D,B,Ae,nt,ft.width,ft.height,Zt,ft.data):P.texSubImage2D(P.TEXTURE_2D,B,Ae,nt,le,_e,Zt,st,ft);P.pixelStorei(P.UNPACK_ROW_LENGTH,Wn),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,rt),P.pixelStorei(P.UNPACK_SKIP_PIXELS,xn),P.pixelStorei(P.UNPACK_SKIP_ROWS,rs),P.pixelStorei(P.UNPACK_SKIP_IMAGES,Qt),B===0&&F.generateMipmaps&&P.generateMipmap(Ce),ue.unbindTexture()},this.copyTextureToTexture3D=function(b,F,V=null,W=null,B=0){return b.isTexture!==!0&&(or("WebGLRenderer: copyTextureToTexture3D function signature has changed."),V=arguments[0]||null,W=arguments[1]||null,b=arguments[2],F=arguments[3],B=arguments[4]||0),or('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(b,F,V,W,B)},this.initRenderTarget=function(b){xe.get(b).__webglFramebuffer===void 0&&w.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?w.setTextureCube(b,0):b.isData3DTexture?w.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?w.setTexture2DArray(b,0):w.setTexture2D(b,0),ue.unbindTexture()},this.resetState=function(){T=0,R=0,L=null,ue.reset(),ut.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return jn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorspace=tt._getDrawingBufferColorSpace(e),t.unpackColorSpace=tt._getUnpackColorSpace()}};var Bs=class extends Rt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Un,this.environmentIntensity=1,this.environmentRotation=new Un,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}};var nc=class extends Jt{constructor(e=null,t=1,n=1,s,r,a,o,l,c=rn,h=rn,u,d){super(null,a,o,l,c,h,s,r,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Ca=class extends Vt{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},vs=new Ke,lu=new Ke,ea=[],cu=new Gt,w_=new Ke,ir=new je,sr=new ni,zs=class extends je{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Ca(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,w_)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Gt),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,vs),cu.copy(e.boundingBox).applyMatrix4(vs),this.boundingBox.union(cu)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new ni),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,vs),sr.copy(e.boundingSphere).applyMatrix4(vs),this.boundingSphere.union(sr)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=e*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(e,t){let n=this.matrixWorld,s=this.count;if(ir.geometry=this.geometry,ir.material=this.material,ir.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),sr.copy(this.boundingSphere),sr.applyMatrix4(n),e.ray.intersectsSphere(sr)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,vs),lu.multiplyMatrices(n,vs),ir.matrixWorld=lu,ir.raycast(e,ea);for(let a=0,o=ea.length;a<o;a++){let l=ea[a];l.instanceId=r,l.object=this,t.push(l)}ea.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Ca(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){let n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new nc(new Float32Array(s*this.count),s,this.count,Rc,Ln));let r=this.morphTexture.source.data.data,a=0;for(let c=0;c<n.length;c++)a+=n[c];let o=this.geometry.morphTargetsRelative?1:1-a,l=s*e;r[l]=o,r.set(n,l+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}};var an=class extends ii{static get type(){return"LineBasicMaterial"}constructor(e){super(),this.isLineBasicMaterial=!0,this.color=new qe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Pa=new C,Ia=new C,hu=new Ke,rr=new Si,ta=new ni,Yo=new C,uu=new C,ri=class extends Rt{constructor(e=new at,t=new an){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let s=1,r=t.count;s<r;s++)Pa.fromBufferAttribute(t,s-1),Ia.fromBufferAttribute(t,s),n[s]=n[s-1],n[s]+=Pa.distanceTo(Ia);e.setAttribute("lineDistance",new Ze(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ta.copy(n.boundingSphere),ta.applyMatrix4(s),ta.radius+=r,e.ray.intersectsSphere(ta)===!1)return;hu.copy(s).invert(),rr.copy(e.ray).applyMatrix4(hu);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){let f=Math.max(0,a.start),g=Math.min(h.count,a.start+a.count);for(let _=f,m=g-1;_<m;_+=c){let p=h.getX(_),S=h.getX(_+1),v=na(this,e,rr,l,p,S);v&&t.push(v)}if(this.isLineLoop){let _=h.getX(g-1),m=h.getX(f),p=na(this,e,rr,l,_,m);p&&t.push(p)}}else{let f=Math.max(0,a.start),g=Math.min(d.count,a.start+a.count);for(let _=f,m=g-1;_<m;_+=c){let p=na(this,e,rr,l,_,_+1);p&&t.push(p)}if(this.isLineLoop){let _=na(this,e,rr,l,g-1,f);_&&t.push(_)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function na(i,e,t,n,s,r){let a=i.geometry.attributes.position;if(Pa.fromBufferAttribute(a,s),Ia.fromBufferAttribute(a,r),t.distanceSqToSegment(Pa,Ia,Yo,uu)>n)return;Yo.applyMatrix4(i.matrixWorld);let l=e.ray.origin.distanceTo(Yo);if(!(l<e.near||l>e.far))return{distance:l,point:uu.clone().applyMatrix4(i.matrixWorld),index:s,face:null,faceIndex:null,barycoord:null,object:i}}var du=new C,fu=new C,Ei=class extends ri{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let s=0,r=t.count;s<r;s+=2)du.fromBufferAttribute(t,s),fu.fromBufferAttribute(t,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+du.distanceTo(fu);e.setAttribute("lineDistance",new Ze(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var ks=class extends ii{static get type(){return"PointsMaterial"}constructor(e){super(),this.isPointsMaterial=!0,this.color=new qe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},pu=new Ke,ic=new Si,ia=new ni,sa=new C,xr=class extends Rt{constructor(e=new at,t=new ks){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ia.copy(n.boundingSphere),ia.applyMatrix4(s),ia.radius+=r,e.ray.intersectsSphere(ia)===!1)return;pu.copy(s).invert(),ic.copy(e.ray).applyMatrix4(pu);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=n.index,u=n.attributes.position;if(c!==null){let d=Math.max(0,a.start),f=Math.min(c.count,a.start+a.count);for(let g=d,_=f;g<_;g++){let m=c.getX(g);sa.fromBufferAttribute(u,m),mu(sa,m,l,s,e,t,this)}}else{let d=Math.max(0,a.start),f=Math.min(u.count,a.start+a.count);for(let g=d,_=f;g<_;g++)sa.fromBufferAttribute(u,g),mu(sa,g,l,s,e,t,this)}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function mu(i,e,t,n,s,r,a){let o=ic.distanceSqToPoint(i);if(o<t){let l=new C;ic.closestPointToPoint(i,l),l.applyMatrix4(n);let c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}var wi=class extends Jt{constructor(e,t,n,s,r,a,o,l,c){super(e,t,n,s,r,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},gn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,s=this.getPoint(0),r=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){let n=this.getLengths(),s=0,r=n.length,a;t?a=t:a=e*n[r-1];let o=0,l=r-1,c;for(;o<=l;)if(s=Math.floor(o+(l-o)/2),c=n[s]-a,c<0)o=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===a)return s/(r-1);let h=n[s],d=n[s+1]-h,f=(a-h)/d;return(s+f)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),l=t||(a.isVector2?new ie:new C);return l.copy(o).sub(a).normalize(),l}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t){let n=new C,s=[],r=[],a=[],o=new C,l=new Ke;for(let f=0;f<=e;f++){let g=f/e;s[f]=this.getTangentAt(g,new C)}r[0]=new C,a[0]=new C;let c=Number.MAX_VALUE,h=Math.abs(s[0].x),u=Math.abs(s[0].y),d=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let f=1;f<=e;f++){if(r[f]=r[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(s[f-1],s[f]),o.length()>Number.EPSILON){o.normalize();let g=Math.acos(Tt(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(l.makeRotationAxis(o,g))}a[f].crossVectors(s[f],r[f])}if(t===!0){let f=Math.acos(Tt(r[0].dot(r[e]),-1,1));f/=e,s[0].dot(o.crossVectors(r[0],r[e]))>0&&(f=-f);for(let g=1;g<=e;g++)r[g].applyMatrix4(l.makeRotationAxis(s[g],f*g)),a[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},vr=class extends gn{constructor(e=0,t=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(e,t=new ie){let n=t,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+e*r,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=l-this.aX,f=c-this.aY;l=d*h-f*u+this.aX,c=d*u+f*h+this.aY}return n.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},sc=class extends vr{constructor(e,t,n,s,r,a){super(e,t,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function Uc(){let i=0,e=0,t=0,n=0;function s(r,a,o,l){i=r,e=o,t=-3*r+3*a-2*o-l,n=2*r-2*a+o+l}return{initCatmullRom:function(r,a,o,l,c){s(a,o,c*(o-r),c*(l-a))},initNonuniformCatmullRom:function(r,a,o,l,c,h,u){let d=(a-r)/c-(o-r)/(c+h)+(o-a)/h,f=(o-a)/h-(l-a)/(h+u)+(l-o)/u;d*=h,f*=h,s(a,o,d,f)},calc:function(r){let a=r*r,o=a*r;return i+e*r+t*a+n*o}}}var ra=new C,$o=new Uc,Zo=new Uc,Jo=new Uc,Fn=class extends gn{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new C){let n=t,s=this.points,r=s.length,a=(r-(this.closed?0:1))*e,o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:l===0&&o===r-1&&(o=r-2,l=1);let c,h;this.closed||o>0?c=s[(o-1)%r]:(ra.subVectors(s[0],s[1]).add(s[0]),c=ra);let u=s[o%r],d=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(ra.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=ra),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,g=Math.pow(c.distanceToSquared(u),f),_=Math.pow(u.distanceToSquared(d),f),m=Math.pow(d.distanceToSquared(h),f);_<1e-4&&(_=1),g<1e-4&&(g=_),m<1e-4&&(m=_),$o.initNonuniformCatmullRom(c.x,u.x,d.x,h.x,g,_,m),Zo.initNonuniformCatmullRom(c.y,u.y,d.y,h.y,g,_,m),Jo.initNonuniformCatmullRom(c.z,u.z,d.z,h.z,g,_,m)}else this.curveType==="catmullrom"&&($o.initCatmullRom(c.x,u.x,d.x,h.x,this.tension),Zo.initCatmullRom(c.y,u.y,d.y,h.y,this.tension),Jo.initCatmullRom(c.z,u.z,d.z,h.z,this.tension));return n.set($o.calc(l),Zo.calc(l),Jo.calc(l)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new C().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function gu(i,e,t,n,s){let r=(n-e)*.5,a=(s-t)*.5,o=i*i,l=i*o;return(2*t-2*n+r+a)*l+(-3*t+3*n-2*r-a)*o+r*i+t}function T_(i,e){let t=1-i;return t*t*e}function A_(i,e){return 2*(1-i)*i*e}function R_(i,e){return i*i*e}function ur(i,e,t,n){return T_(i,e)+A_(i,t)+R_(i,n)}function C_(i,e){let t=1-i;return t*t*t*e}function P_(i,e){let t=1-i;return 3*t*t*i*e}function I_(i,e){return 3*(1-i)*i*i*e}function D_(i,e){return i*i*i*e}function dr(i,e,t,n,s){return C_(i,e)+P_(i,t)+I_(i,n)+D_(i,s)}var Da=class extends gn{constructor(e=new ie,t=new ie,n=new ie,s=new ie){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new ie){let n=t,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(dr(e,s.x,r.x,a.x,o.x),dr(e,s.y,r.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},rc=class extends gn{constructor(e=new C,t=new C,n=new C,s=new C){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new C){let n=t,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(dr(e,s.x,r.x,a.x,o.x),dr(e,s.y,r.y,a.y,o.y),dr(e,s.z,r.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},La=class extends gn{constructor(e=new ie,t=new ie){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new ie){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new ie){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ac=class extends gn{constructor(e=new C,t=new C){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new C){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new C){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ua=class extends gn{constructor(e=new ie,t=new ie,n=new ie){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new ie){let n=t,s=this.v0,r=this.v1,a=this.v2;return n.set(ur(e,s.x,r.x,a.x),ur(e,s.y,r.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Na=class extends gn{constructor(e=new C,t=new C,n=new C){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new C){let n=t,s=this.v0,r=this.v1,a=this.v2;return n.set(ur(e,s.x,r.x,a.x),ur(e,s.y,r.y,a.y),ur(e,s.z,r.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Oa=class extends gn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new ie){let n=t,s=this.points,r=(s.length-1)*e,a=Math.floor(r),o=r-a,l=s[a===0?a:a-1],c=s[a],h=s[a>s.length-2?s.length-1:a+1],u=s[a>s.length-3?s.length-1:a+2];return n.set(gu(o,l.x,c.x,h.x,u.x),gu(o,l.y,c.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new ie().fromArray(s))}return this}},Fa=Object.freeze({__proto__:null,ArcCurve:sc,CatmullRomCurve3:Fn,CubicBezierCurve:Da,CubicBezierCurve3:rc,EllipseCurve:vr,LineCurve:La,LineCurve3:ac,QuadraticBezierCurve:Ua,QuadraticBezierCurve3:Na,SplineCurve:Oa}),oc=class extends gn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Fa[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let a=s[r]-n,o=this.curves[r],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,t)}r++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,s=this.curves.length;n<s;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,l=a.getPoints(o);for(let c=0;c<l.length;c++){let h=l[c];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(new Fa[s.type]().fromJSON(s))}return this}},qi=class extends oc{constructor(e){super(),this.type="Path",this.currentPoint=new ie,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new La(this.currentPoint.clone(),new ie(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,s){let r=new Ua(this.currentPoint.clone(),new ie(e,t),new ie(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(e,t,n,s,r,a){let o=new Da(this.currentPoint.clone(),new ie(e,t),new ie(n,s),new ie(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new Oa(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,s,r,a){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+o,t+l,n,s,r,a),this}absarc(e,t,n,s,r,a){return this.absellipse(e,t,n,n,s,r,a),this}ellipse(e,t,n,s,r,a,o,l){let c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+c,t+h,n,s,r,a,o,l),this}absellipse(e,t,n,s,r,a,o,l){let c=new vr(e,t,n,s,r,a,o,l);if(this.curves.length>0){let u=c.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(c);let h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Ba=class i extends at{constructor(e=[new ie(0,-.5),new ie(.5,0),new ie(0,.5)],t=12,n=0,s=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:s},t=Math.floor(t),s=Tt(s,0,Math.PI*2);let r=[],a=[],o=[],l=[],c=[],h=1/t,u=new C,d=new ie,f=new C,g=new C,_=new C,m=0,p=0;for(let S=0;S<=e.length-1;S++)switch(S){case 0:m=e[S+1].x-e[S].x,p=e[S+1].y-e[S].y,f.x=p*1,f.y=-m,f.z=p*0,_.copy(f),f.normalize(),l.push(f.x,f.y,f.z);break;case e.length-1:l.push(_.x,_.y,_.z);break;default:m=e[S+1].x-e[S].x,p=e[S+1].y-e[S].y,f.x=p*1,f.y=-m,f.z=p*0,g.copy(f),f.x+=_.x,f.y+=_.y,f.z+=_.z,f.normalize(),l.push(f.x,f.y,f.z),_.copy(g)}for(let S=0;S<=t;S++){let v=n+S*h*s,x=Math.sin(v),I=Math.cos(v);for(let T=0;T<=e.length-1;T++){u.x=e[T].x*x,u.y=e[T].y,u.z=e[T].x*I,a.push(u.x,u.y,u.z),d.x=S/t,d.y=T/(e.length-1),o.push(d.x,d.y);let R=l[3*T+0]*x,L=l[3*T+1],E=l[3*T+0]*I;c.push(R,L,E)}}for(let S=0;S<t;S++)for(let v=0;v<e.length-1;v++){let x=v+S*e.length,I=x,T=x+e.length,R=x+e.length+1,L=x+1;r.push(I,T,L),r.push(R,L,T)}this.setIndex(r),this.setAttribute("position",new Ze(a,3)),this.setAttribute("uv",new Ze(o,2)),this.setAttribute("normal",new Ze(c,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.points,e.segments,e.phiStart,e.phiLength)}};var Mt=class i extends at{constructor(e=1,t=1,n=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],d=[],f=[],g=0,_=[],m=n/2,p=0;S(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(h),this.setAttribute("position",new Ze(u,3)),this.setAttribute("normal",new Ze(d,3)),this.setAttribute("uv",new Ze(f,2));function S(){let x=new C,I=new C,T=0,R=(t-e)/n;for(let L=0;L<=r;L++){let E=[],y=L/r,D=y*(t-e)+e;for(let H=0;H<=s;H++){let z=H/s,G=z*l+o,j=Math.sin(G),X=Math.cos(G);I.x=D*j,I.y=-y*n+m,I.z=D*X,u.push(I.x,I.y,I.z),x.set(j,R,X).normalize(),d.push(x.x,x.y,x.z),f.push(z,1-y),E.push(g++)}_.push(E)}for(let L=0;L<s;L++)for(let E=0;E<r;E++){let y=_[E][L],D=_[E+1][L],H=_[E+1][L+1],z=_[E][L+1];(e>0||E!==0)&&(h.push(y,D,z),T+=3),(t>0||E!==r-1)&&(h.push(D,H,z),T+=3)}c.addGroup(p,T,0),p+=T}function v(x){let I=g,T=new ie,R=new C,L=0,E=x===!0?e:t,y=x===!0?1:-1;for(let H=1;H<=s;H++)u.push(0,m*y,0),d.push(0,y,0),f.push(.5,.5),g++;let D=g;for(let H=0;H<=s;H++){let G=H/s*l+o,j=Math.cos(G),X=Math.sin(G);R.x=E*X,R.y=m*y,R.z=E*j,u.push(R.x,R.y,R.z),d.push(0,y,0),T.x=j*.5+.5,T.y=X*.5*y+.5,f.push(T.x,T.y),g++}for(let H=0;H<s;H++){let z=I+H,G=D+H;x===!0?h.push(G,G+1,z):h.push(G+1,G,z),L+=3}c.addGroup(p,L,x===!0?1:2),p+=L}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var aa=new C,oa=new C,jo=new C,la=new xi,Yi=class extends at{constructor(e=null,t=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:e,thresholdAngle:t},e!==null){let s=Math.pow(10,4),r=Math.cos(Ts*t),a=e.getIndex(),o=e.getAttribute("position"),l=a?a.count:o.count,c=[0,0,0],h=["a","b","c"],u=new Array(3),d={},f=[];for(let g=0;g<l;g+=3){a?(c[0]=a.getX(g),c[1]=a.getX(g+1),c[2]=a.getX(g+2)):(c[0]=g,c[1]=g+1,c[2]=g+2);let{a:_,b:m,c:p}=la;if(_.fromBufferAttribute(o,c[0]),m.fromBufferAttribute(o,c[1]),p.fromBufferAttribute(o,c[2]),la.getNormal(jo),u[0]=`${Math.round(_.x*s)},${Math.round(_.y*s)},${Math.round(_.z*s)}`,u[1]=`${Math.round(m.x*s)},${Math.round(m.y*s)},${Math.round(m.z*s)}`,u[2]=`${Math.round(p.x*s)},${Math.round(p.y*s)},${Math.round(p.z*s)}`,!(u[0]===u[1]||u[1]===u[2]||u[2]===u[0]))for(let S=0;S<3;S++){let v=(S+1)%3,x=u[S],I=u[v],T=la[h[S]],R=la[h[v]],L=`${x}_${I}`,E=`${I}_${x}`;E in d&&d[E]?(jo.dot(d[E].normal)<=r&&(f.push(T.x,T.y,T.z),f.push(R.x,R.y,R.z)),d[E]=null):L in d||(d[L]={index0:c[S],index1:c[v],normal:jo.clone()})}}for(let g in d)if(d[g]){let{index0:_,index1:m}=d[g];aa.fromBufferAttribute(o,_),oa.fromBufferAttribute(o,m),f.push(aa.x,aa.y,aa.z),f.push(oa.x,oa.y,oa.z)}this.setAttribute("position",new Ze(f,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}},Ti=class extends qi{constructor(e){super(e),this.uuid=Qi(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,s=this.holes.length;n<s;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(new qi().fromJSON(s))}return this}},L_={triangulate:function(i,e,t=2){let n=e&&e.length,s=n?e[0]*t:i.length,r=$u(i,0,s,t,!0),a=[];if(!r||r.next===r.prev)return a;let o,l,c,h,u,d,f;if(n&&(r=B_(i,e,r,t)),i.length>80*t){o=c=i[0],l=h=i[1];for(let g=t;g<s;g+=t)u=i[g],d=i[g+1],u<o&&(o=u),d<l&&(l=d),u>c&&(c=u),d>h&&(h=d);f=Math.max(c-o,h-l),f=f!==0?32767/f:0}return Mr(r,a,t,o,l,f,0),a}};function $u(i,e,t,n,s){let r,a;if(s===Z_(i,e,t,n)>0)for(r=e;r<t;r+=n)a=_u(r,i[r],i[r+1],a);else for(r=t-n;r>=e;r-=n)a=_u(r,i[r],i[r+1],a);return a&&ja(a,a.next)&&(Sr(a),a=a.next),a}function $i(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(ja(t,t.next)||xt(t.prev,t,t.next)===0)){if(Sr(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function Mr(i,e,t,n,s,r,a){if(!i)return;!a&&r&&G_(i,n,s,r);let o=i,l,c;for(;i.prev!==i.next;){if(l=i.prev,c=i.next,r?N_(i,n,s,r):U_(i)){e.push(l.i/t|0),e.push(i.i/t|0),e.push(c.i/t|0),Sr(i),i=c.next,o=c.next;continue}if(i=c,i===o){a?a===1?(i=O_($i(i),e,t),Mr(i,e,t,n,s,r,2)):a===2&&F_(i,e,t,n,s,r):Mr($i(i),e,t,n,s,r,1);break}}}function U_(i){let e=i.prev,t=i,n=i.next;if(xt(e,t,n)>=0)return!1;let s=e.x,r=t.x,a=n.x,o=e.y,l=t.y,c=n.y,h=s<r?s<a?s:a:r<a?r:a,u=o<l?o<c?o:c:l<c?l:c,d=s>r?s>a?s:a:r>a?r:a,f=o>l?o>c?o:c:l>c?l:c,g=n.next;for(;g!==e;){if(g.x>=h&&g.x<=d&&g.y>=u&&g.y<=f&&Ss(s,o,r,l,a,c,g.x,g.y)&&xt(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function N_(i,e,t,n){let s=i.prev,r=i,a=i.next;if(xt(s,r,a)>=0)return!1;let o=s.x,l=r.x,c=a.x,h=s.y,u=r.y,d=a.y,f=o<l?o<c?o:c:l<c?l:c,g=h<u?h<d?h:d:u<d?u:d,_=o>l?o>c?o:c:l>c?l:c,m=h>u?h>d?h:d:u>d?u:d,p=lc(f,g,e,t,n),S=lc(_,m,e,t,n),v=i.prevZ,x=i.nextZ;for(;v&&v.z>=p&&x&&x.z<=S;){if(v.x>=f&&v.x<=_&&v.y>=g&&v.y<=m&&v!==s&&v!==a&&Ss(o,h,l,u,c,d,v.x,v.y)&&xt(v.prev,v,v.next)>=0||(v=v.prevZ,x.x>=f&&x.x<=_&&x.y>=g&&x.y<=m&&x!==s&&x!==a&&Ss(o,h,l,u,c,d,x.x,x.y)&&xt(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;v&&v.z>=p;){if(v.x>=f&&v.x<=_&&v.y>=g&&v.y<=m&&v!==s&&v!==a&&Ss(o,h,l,u,c,d,v.x,v.y)&&xt(v.prev,v,v.next)>=0)return!1;v=v.prevZ}for(;x&&x.z<=S;){if(x.x>=f&&x.x<=_&&x.y>=g&&x.y<=m&&x!==s&&x!==a&&Ss(o,h,l,u,c,d,x.x,x.y)&&xt(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function O_(i,e,t){let n=i;do{let s=n.prev,r=n.next.next;!ja(s,r)&&Zu(s,n,n.next,r)&&br(s,r)&&br(r,s)&&(e.push(s.i/t|0),e.push(n.i/t|0),e.push(r.i/t|0),Sr(n),Sr(n.next),n=i=r),n=n.next}while(n!==i);return $i(n)}function F_(i,e,t,n,s,r){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&q_(a,o)){let l=Ju(a,o);a=$i(a,a.next),l=$i(l,l.next),Mr(a,e,t,n,s,r,0),Mr(l,e,t,n,s,r,0);return}o=o.next}a=a.next}while(a!==i)}function B_(i,e,t,n){let s=[],r,a,o,l,c;for(r=0,a=e.length;r<a;r++)o=e[r]*n,l=r<a-1?e[r+1]*n:i.length,c=$u(i,o,l,n,!1),c===c.next&&(c.steiner=!0),s.push(X_(c));for(s.sort(z_),r=0;r<s.length;r++)t=k_(s[r],t);return t}function z_(i,e){return i.x-e.x}function k_(i,e){let t=H_(i,e);if(!t)return e;let n=Ju(t,i);return $i(n,n.next),$i(t,t.next)}function H_(i,e){let t=e,n=-1/0,s,r=i.x,a=i.y;do{if(a<=t.y&&a>=t.next.y&&t.next.y!==t.y){let d=t.x+(a-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=r&&d>n&&(n=d,s=t.x<t.next.x?t:t.next,d===r))return s}t=t.next}while(t!==e);if(!s)return null;let o=s,l=s.x,c=s.y,h=1/0,u;t=s;do r>=t.x&&t.x>=l&&r!==t.x&&Ss(a<c?r:n,a,l,c,a<c?n:r,a,t.x,t.y)&&(u=Math.abs(a-t.y)/(r-t.x),br(t,i)&&(u<h||u===h&&(t.x>s.x||t.x===s.x&&V_(s,t)))&&(s=t,h=u)),t=t.next;while(t!==o);return s}function V_(i,e){return xt(i.prev,i,e.prev)<0&&xt(e.next,i,i.next)<0}function G_(i,e,t,n){let s=i;do s.z===0&&(s.z=lc(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,W_(s)}function W_(i){let e,t,n,s,r,a,o,l,c=1;do{for(t=i,i=null,r=null,a=0;t;){for(a++,n=t,o=0,e=0;e<c&&(o++,n=n.nextZ,!!n);e++);for(l=c;o>0||l>0&&n;)o!==0&&(l===0||!n||t.z<=n.z)?(s=t,t=t.nextZ,o--):(s=n,n=n.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;t=n}r.nextZ=null,c*=2}while(a>1);return i}function lc(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function X_(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function Ss(i,e,t,n,s,r,a,o){return(s-a)*(e-o)>=(i-a)*(r-o)&&(i-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(r-o)>=(s-a)*(n-o)}function q_(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!Y_(i,e)&&(br(i,e)&&br(e,i)&&$_(i,e)&&(xt(i.prev,i,e.prev)||xt(i,e.prev,e))||ja(i,e)&&xt(i.prev,i,i.next)>0&&xt(e.prev,e,e.next)>0)}function xt(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function ja(i,e){return i.x===e.x&&i.y===e.y}function Zu(i,e,t,n){let s=ha(xt(i,e,t)),r=ha(xt(i,e,n)),a=ha(xt(t,n,i)),o=ha(xt(t,n,e));return!!(s!==r&&a!==o||s===0&&ca(i,t,e)||r===0&&ca(i,n,e)||a===0&&ca(t,i,n)||o===0&&ca(t,e,n))}function ca(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function ha(i){return i>0?1:i<0?-1:0}function Y_(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&Zu(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function br(i,e){return xt(i.prev,i,i.next)<0?xt(i,e,i.next)>=0&&xt(i,i.prev,e)>=0:xt(i,e,i.prev)<0||xt(i,i.next,e)<0}function $_(i,e){let t=i,n=!1,s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Ju(i,e){let t=new cc(i.i,i.x,i.y),n=new cc(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function _u(i,e,t,n){let s=new cc(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Sr(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function cc(i,e,t){this.i=i,this.x=e,this.y=t,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}function Z_(i,e,t,n){let s=0;for(let r=e,a=t-n;r<t;r+=n)s+=(i[a]-i[r])*(i[r+1]+i[a+1]),a=r;return s}var fr=class i{static area(e){let t=e.length,n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return i.area(e)<0}static triangulateShape(e,t){let n=[],s=[],r=[];yu(e),xu(n,e);let a=e.length;t.forEach(yu);for(let l=0;l<t.length;l++)s.push(a),a+=t[l].length,xu(n,t[l]);let o=L_.triangulate(n,s);for(let l=0;l<o.length;l+=3)r.push(o.slice(l,l+3));return r}};function yu(i){let e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function xu(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}var ai=class i extends at{constructor(e=new Ti([new ie(.5,.5),new ie(-.5,.5),new ie(-.5,-.5),new ie(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,s=[],r=[];for(let o=0,l=e.length;o<l;o++){let c=e[o];a(c)}this.setAttribute("position",new Ze(s,3)),this.setAttribute("uv",new Ze(r,2)),this.computeVertexNormals();function a(o){let l=[],c=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1,u=t.depth!==void 0?t.depth:1,d=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:.2,g=t.bevelSize!==void 0?t.bevelSize:f-.1,_=t.bevelOffset!==void 0?t.bevelOffset:0,m=t.bevelSegments!==void 0?t.bevelSegments:3,p=t.extrudePath,S=t.UVGenerator!==void 0?t.UVGenerator:J_,v,x=!1,I,T,R,L;p&&(v=p.getSpacedPoints(h),x=!0,d=!1,I=p.computeFrenetFrames(h,!1),T=new C,R=new C,L=new C),d||(m=0,f=0,g=0,_=0);let E=o.extractPoints(c),y=E.shape,D=E.holes;if(!fr.isClockWise(y)){y=y.reverse();for(let Q=0,oe=D.length;Q<oe;Q++){let P=D[Q];fr.isClockWise(P)&&(D[Q]=P.reverse())}}let z=fr.triangulateShape(y,D),G=y;for(let Q=0,oe=D.length;Q<oe;Q++){let P=D[Q];y=y.concat(P)}function j(Q,oe,P){return oe||console.error("THREE.ExtrudeGeometry: vec does not exist"),Q.clone().addScaledVector(oe,P)}let X=y.length,U=z.length;function O(Q,oe,P){let Re,re,Me,ue=Q.x-oe.x,Ue=Q.y-oe.y,xe=P.x-Q.x,w=P.y-Q.y,M=ue*ue+Ue*Ue,k=ue*w-Ue*xe;if(Math.abs(k)>Number.EPSILON){let Z=Math.sqrt(M),ne=Math.sqrt(xe*xe+w*w),J=oe.x-Ue/Z,Ee=oe.y+ue/Z,fe=P.x-w/ne,ve=P.y+xe/ne,Je=((fe-J)*w-(ve-Ee)*xe)/(ue*w-Ue*xe);Re=J+ue*Je-Q.x,re=Ee+Ue*Je-Q.y;let ae=Re*Re+re*re;if(ae<=2)return new ie(Re,re);Me=Math.sqrt(ae/2)}else{let Z=!1;ue>Number.EPSILON?xe>Number.EPSILON&&(Z=!0):ue<-Number.EPSILON?xe<-Number.EPSILON&&(Z=!0):Math.sign(Ue)===Math.sign(w)&&(Z=!0),Z?(Re=-Ue,re=ue,Me=Math.sqrt(M)):(Re=ue,re=Ue,Me=Math.sqrt(M/2))}return new ie(Re/Me,re/Me)}let ee=[];for(let Q=0,oe=G.length,P=oe-1,Re=Q+1;Q<oe;Q++,P++,Re++)P===oe&&(P=0),Re===oe&&(Re=0),ee[Q]=O(G[Q],G[P],G[Re]);let $=[],he,Ie=ee.concat();for(let Q=0,oe=D.length;Q<oe;Q++){let P=D[Q];he=[];for(let Re=0,re=P.length,Me=re-1,ue=Re+1;Re<re;Re++,Me++,ue++)Me===re&&(Me=0),ue===re&&(ue=0),he[Re]=O(P[Re],P[Me],P[ue]);$.push(he),Ie=Ie.concat(he)}for(let Q=0;Q<m;Q++){let oe=Q/m,P=f*Math.cos(oe*Math.PI/2),Re=g*Math.sin(oe*Math.PI/2)+_;for(let re=0,Me=G.length;re<Me;re++){let ue=j(G[re],ee[re],Re);ce(ue.x,ue.y,-P)}for(let re=0,Me=D.length;re<Me;re++){let ue=D[re];he=$[re];for(let Ue=0,xe=ue.length;Ue<xe;Ue++){let w=j(ue[Ue],he[Ue],Re);ce(w.x,w.y,-P)}}}let $e=g+_;for(let Q=0;Q<X;Q++){let oe=d?j(y[Q],Ie[Q],$e):y[Q];x?(R.copy(I.normals[0]).multiplyScalar(oe.x),T.copy(I.binormals[0]).multiplyScalar(oe.y),L.copy(v[0]).add(R).add(T),ce(L.x,L.y,L.z)):ce(oe.x,oe.y,0)}for(let Q=1;Q<=h;Q++)for(let oe=0;oe<X;oe++){let P=d?j(y[oe],Ie[oe],$e):y[oe];x?(R.copy(I.normals[Q]).multiplyScalar(P.x),T.copy(I.binormals[Q]).multiplyScalar(P.y),L.copy(v[Q]).add(R).add(T),ce(L.x,L.y,L.z)):ce(P.x,P.y,u/h*Q)}for(let Q=m-1;Q>=0;Q--){let oe=Q/m,P=f*Math.cos(oe*Math.PI/2),Re=g*Math.sin(oe*Math.PI/2)+_;for(let re=0,Me=G.length;re<Me;re++){let ue=j(G[re],ee[re],Re);ce(ue.x,ue.y,u+P)}for(let re=0,Me=D.length;re<Me;re++){let ue=D[re];he=$[re];for(let Ue=0,xe=ue.length;Ue<xe;Ue++){let w=j(ue[Ue],he[Ue],Re);x?ce(w.x,w.y+v[h-1].y,v[h-1].x+P):ce(w.x,w.y,u+P)}}}Y(),se();function Y(){let Q=s.length/3;if(d){let oe=0,P=X*oe;for(let Re=0;Re<U;Re++){let re=z[Re];De(re[2]+P,re[1]+P,re[0]+P)}oe=h+m*2,P=X*oe;for(let Re=0;Re<U;Re++){let re=z[Re];De(re[0]+P,re[1]+P,re[2]+P)}}else{for(let oe=0;oe<U;oe++){let P=z[oe];De(P[2],P[1],P[0])}for(let oe=0;oe<U;oe++){let P=z[oe];De(P[0]+X*h,P[1]+X*h,P[2]+X*h)}}n.addGroup(Q,s.length/3-Q,0)}function se(){let Q=s.length/3,oe=0;me(G,oe),oe+=G.length;for(let P=0,Re=D.length;P<Re;P++){let re=D[P];me(re,oe),oe+=re.length}n.addGroup(Q,s.length/3-Q,1)}function me(Q,oe){let P=Q.length;for(;--P>=0;){let Re=P,re=P-1;re<0&&(re=Q.length-1);for(let Me=0,ue=h+m*2;Me<ue;Me++){let Ue=X*Me,xe=X*(Me+1),w=oe+Re+Ue,M=oe+re+Ue,k=oe+re+xe,Z=oe+Re+xe;Be(w,M,k,Z)}}}function ce(Q,oe,P){l.push(Q),l.push(oe),l.push(P)}function De(Q,oe,P){Oe(Q),Oe(oe),Oe(P);let Re=s.length/3,re=S.generateTopUV(n,s,Re-3,Re-2,Re-1);et(re[0]),et(re[1]),et(re[2])}function Be(Q,oe,P,Re){Oe(Q),Oe(oe),Oe(Re),Oe(oe),Oe(P),Oe(Re);let re=s.length/3,Me=S.generateSideWallUV(n,s,re-6,re-3,re-2,re-1);et(Me[0]),et(Me[1]),et(Me[3]),et(Me[1]),et(Me[2]),et(Me[3])}function Oe(Q){s.push(l[Q*3+0]),s.push(l[Q*3+1]),s.push(l[Q*3+2])}function et(Q){r.push(Q.x),r.push(Q.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return j_(t,n,e)}static fromJSON(e,t){let n=[];for(let r=0,a=e.shapes.length;r<a;r++){let o=t[e.shapes[r]];n.push(o)}let s=e.options.extrudePath;return s!==void 0&&(e.options.extrudePath=new Fa[s.type]().fromJSON(s)),new i(n,e.options)}},J_={generateTopUV:function(i,e,t,n,s){let r=e[t*3],a=e[t*3+1],o=e[n*3],l=e[n*3+1],c=e[s*3],h=e[s*3+1];return[new ie(r,a),new ie(o,l),new ie(c,h)]},generateSideWallUV:function(i,e,t,n,s,r){let a=e[t*3],o=e[t*3+1],l=e[t*3+2],c=e[n*3],h=e[n*3+1],u=e[n*3+2],d=e[s*3],f=e[s*3+1],g=e[s*3+2],_=e[r*3],m=e[r*3+1],p=e[r*3+2];return Math.abs(o-h)<Math.abs(a-c)?[new ie(a,1-l),new ie(c,1-u),new ie(d,1-g),new ie(_,1-p)]:[new ie(o,1-l),new ie(h,1-u),new ie(f,1-g),new ie(m,1-p)]}};function j_(i,e,t){if(t.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){let r=i[n];t.shapes.push(r.uuid)}else t.shapes.push(i.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}var oi=class i extends at{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let l=Math.min(a+o,Math.PI),c=0,h=[],u=new C,d=new C,f=[],g=[],_=[],m=[];for(let p=0;p<=n;p++){let S=[],v=p/n,x=0;p===0&&a===0?x=.5/t:p===n&&l===Math.PI&&(x=-.5/t);for(let I=0;I<=t;I++){let T=I/t;u.x=-e*Math.cos(s+T*r)*Math.sin(a+v*o),u.y=e*Math.cos(a+v*o),u.z=e*Math.sin(s+T*r)*Math.sin(a+v*o),g.push(u.x,u.y,u.z),d.copy(u).normalize(),_.push(d.x,d.y,d.z),m.push(T+x,1-v),S.push(c++)}h.push(S)}for(let p=0;p<n;p++)for(let S=0;S<t;S++){let v=h[p][S+1],x=h[p][S],I=h[p+1][S],T=h[p+1][S+1];(p!==0||a>0)&&f.push(v,x,T),(p!==n-1||l<Math.PI)&&f.push(x,I,T)}this.setIndex(f),this.setAttribute("position",new Ze(g,3)),this.setAttribute("normal",new Ze(_,3)),this.setAttribute("uv",new Ze(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var on=class i extends at{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r},n=Math.floor(n),s=Math.floor(s);let a=[],o=[],l=[],c=[],h=new C,u=new C,d=new C;for(let f=0;f<=n;f++)for(let g=0;g<=s;g++){let _=g/s*r,m=f/n*Math.PI*2;u.x=(e+t*Math.cos(m))*Math.cos(_),u.y=(e+t*Math.cos(m))*Math.sin(_),u.z=t*Math.sin(m),o.push(u.x,u.y,u.z),h.x=e*Math.cos(_),h.y=e*Math.sin(_),d.subVectors(u,h).normalize(),l.push(d.x,d.y,d.z),c.push(g/s),c.push(f/n)}for(let f=1;f<=n;f++)for(let g=1;g<=s;g++){let _=(s+1)*f+g-1,m=(s+1)*(f-1)+g-1,p=(s+1)*(f-1)+g,S=(s+1)*f+g;a.push(_,m,S),a.push(m,p,S)}this.setIndex(a),this.setAttribute("position",new Ze(o,3)),this.setAttribute("normal",new Ze(l,3)),this.setAttribute("uv",new Ze(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}};var Hs=class i extends at{constructor(e=new Na(new C(-1,-1,0),new C(-1,1,0),new C(1,1,0)),t=64,n=1,s=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:s,closed:r};let a=e.computeFrenetFrames(t,r);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;let o=new C,l=new C,c=new ie,h=new C,u=[],d=[],f=[],g=[];_(),this.setIndex(g),this.setAttribute("position",new Ze(u,3)),this.setAttribute("normal",new Ze(d,3)),this.setAttribute("uv",new Ze(f,2));function _(){for(let v=0;v<t;v++)m(v);m(r===!1?t:0),S(),p()}function m(v){h=e.getPointAt(v/t,h);let x=a.normals[v],I=a.binormals[v];for(let T=0;T<=s;T++){let R=T/s*Math.PI*2,L=Math.sin(R),E=-Math.cos(R);l.x=E*x.x+L*I.x,l.y=E*x.y+L*I.y,l.z=E*x.z+L*I.z,l.normalize(),d.push(l.x,l.y,l.z),o.x=h.x+n*l.x,o.y=h.y+n*l.y,o.z=h.z+n*l.z,u.push(o.x,o.y,o.z)}}function p(){for(let v=1;v<=t;v++)for(let x=1;x<=s;x++){let I=(s+1)*(v-1)+(x-1),T=(s+1)*v+(x-1),R=(s+1)*v+x,L=(s+1)*(v-1)+x;g.push(I,T,L),g.push(T,R,L)}}function S(){for(let v=0;v<=t;v++)for(let x=0;x<=s;x++)c.x=v/t,c.y=x/s,f.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new i(new Fa[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}};var Vs=class extends ii{static get type(){return"MeshStandardMaterial"}constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new qe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new qe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Bu,this.normalScale=new ie(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Un,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},za=class extends Vs{static get type(){return"MeshPhysicalMaterial"}constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ie(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Tt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new qe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new qe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new qe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var Gs=class extends an{static get type(){return"LineDashedMaterial"}constructor(e){super(),this.isLineDashedMaterial=!0,this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(e)}copy(e){return super.copy(e),this.scale=e.scale,this.dashSize=e.dashSize,this.gapSize=e.gapSize,this}};function ua(i,e,t){return!i||!t&&i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function K_(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}var Ws=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];n:{e:{let a;t:{i:if(!(e<s)){for(let o=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=t[++n],e<s)break e}a=t.length;break t}if(!(e>=r)){let o=t[1];e<o&&(n=2,r=o);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=t[--n-1],e>=r)break e}a=n,n=0;break t}break n}for(;n<a;){let o=n+a>>>1;e<t[o]?a=o:n=o+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let a=0;a!==s;++a)t[a]=n[r+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},hc=class extends Ws{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:uh,endingEnd:uh}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,a=e+1,o=s[r],l=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case dh:r=e,o=2*t-n;break;case fh:r=s.length-2,o=t+s[r]-s[r+1];break;default:r=e,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case dh:a=e,l=2*n-t;break;case fh:a=1,l=n+s[1]-s[0];break;default:a=e-1,l=t}let c=(n-t)*.5,h=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,g=(n-t)/(s-t),_=g*g,m=_*g,p=-d*m+2*d*_-d*g,S=(1+d)*m+(-1.5-2*d)*_+(-.5+d)*g+1,v=(-1-f)*m+(1.5+f)*_+.5*g,x=f*m-f*_;for(let I=0;I!==o;++I)r[I]=p*a[h+I]+S*a[c+I]+v*a[l+I]+x*a[u+I];return r}},uc=class extends Ws{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=(n-t)/(s-t),u=1-h;for(let d=0;d!==o;++d)r[d]=a[c+d]*u+a[l+d]*h;return r}},dc=class extends Ws{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},wn=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=ua(t,this.TimeBufferType),this.values=ua(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ua(e.times,Array),values:ua(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new dc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new uc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new hc(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case ya:t=this.InterpolantFactoryMethodDiscrete;break;case zl:t=this.InterpolantFactoryMethodLinear;break;case vo:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return ya;case this.InterpolantFactoryMethodLinear:return zl;case this.InterpolantFactoryMethodSmooth:return vo}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<e;)++r;for(;a!==-1&&n[a]>t;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==r;o++){let l=n[o];if(typeof l=="number"&&isNaN(l)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(a!==null&&a>l){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,l,a),e=!1;break}a=l}if(s!==void 0&&K_(s))for(let o=0,l=s.length;o!==l;++o){let c=s[o];if(isNaN(c)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===vo,r=e.length-1,a=1;for(let o=1;o<r;++o){let l=!1,c=e[o],h=e[o+1];if(c!==h&&(o!==1||c!==e[0]))if(s)l=!0;else{let u=o*n,d=u-n,f=u+n;for(let g=0;g!==n;++g){let _=t[u+g];if(_!==t[d+g]||_!==t[f+g]){l=!0;break}}}if(l){if(o!==a){e[a]=e[o];let u=o*n,d=a*n;for(let f=0;f!==n;++f)t[d+f]=t[u+f]}++a}}if(r>0){e[a]=e[r];for(let o=r*n,l=a*n,c=0;c!==n;++c)t[l+c]=t[o+c];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};wn.prototype.TimeBufferType=Float32Array;wn.prototype.ValueBufferType=Float32Array;wn.prototype.DefaultInterpolation=zl;var Zi=class extends wn{constructor(e,t,n){super(e,t,n)}};Zi.prototype.ValueTypeName="bool";Zi.prototype.ValueBufferType=Array;Zi.prototype.DefaultInterpolation=ya;Zi.prototype.InterpolantFactoryMethodLinear=void 0;Zi.prototype.InterpolantFactoryMethodSmooth=void 0;var fc=class extends wn{};fc.prototype.ValueTypeName="color";var pc=class extends wn{};pc.prototype.ValueTypeName="number";var mc=class extends Ws{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-t)/(s-t),c=e*o;for(let h=c+o;c!==h;c+=4)En.slerpFlat(r,0,a,c-o,a,c,l);return r}},ka=class extends wn{InterpolantFactoryMethodLinear(e){return new mc(this.times,this.values,this.getValueSize(),e)}};ka.prototype.ValueTypeName="quaternion";ka.prototype.InterpolantFactoryMethodSmooth=void 0;var Ji=class extends wn{constructor(e,t,n){super(e,t,n)}};Ji.prototype.ValueTypeName="string";Ji.prototype.ValueBufferType=Array;Ji.prototype.DefaultInterpolation=ya;Ji.prototype.InterpolantFactoryMethodLinear=void 0;Ji.prototype.InterpolantFactoryMethodSmooth=void 0;var gc=class extends wn{};gc.prototype.ValueTypeName="vector";var _c=class{constructor(e,t,n){let s=this,r=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){let u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){let f=c[u],g=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null}}},Q_=new _c,yc=class{constructor(e){this.manager=e!==void 0?e:Q_,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}};yc.DEFAULT_MATERIAL_NAME="__DEFAULT";var Er=class extends Rt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new qe(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}};var Ko=new Ke,vu=new C,Mu=new C,Ha=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ie(512,512),this.map=null,this.mapPass=null,this.matrix=new Ke,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new yr,this._frameExtents=new ie(1,1),this._viewportCount=1,this._viewports=[new ct(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;vu.setFromMatrixPosition(e.matrixWorld),t.position.copy(vu),Mu.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Mu),t.updateMatrixWorld(),Ko.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ko),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Ko)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}};var bu=new Ke,ar=new C,Qo=new C,xc=class extends Ha{constructor(){super(new Nt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ie(4,2),this._viewportCount=6,this._viewports=[new ct(2,1,1,1),new ct(0,1,1,1),new ct(3,1,1,1),new ct(1,1,1,1),new ct(3,0,1,1),new ct(1,0,1,1)],this._cubeDirections=[new C(1,0,0),new C(-1,0,0),new C(0,0,1),new C(0,0,-1),new C(0,1,0),new C(0,-1,0)],this._cubeUps=[new C(0,1,0),new C(0,1,0),new C(0,1,0),new C(0,1,0),new C(0,0,1),new C(0,0,-1)]}updateMatrices(e,t=0){let n=this.camera,s=this.matrix,r=e.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),ar.setFromMatrixPosition(e.matrixWorld),n.position.copy(ar),Qo.copy(n.position),Qo.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Qo),n.updateMatrixWorld(),s.makeTranslation(-ar.x,-ar.y,-ar.z),bu.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(bu)}},Va=class extends Er{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new xc}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}},vc=class extends Ha{constructor(){super(new Os(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},wr=class extends Er{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Rt.DEFAULT_UP),this.updateMatrix(),this.target=new Rt,this.shadow=new vc}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},Ga=class extends Er{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}};var Nc="\\[\\]\\.:\\/",ey=new RegExp("["+Nc+"]","g"),Oc="[^"+Nc+"]",ty="[^"+Nc.replace("\\.","")+"]",ny=/((?:WC+[\/:])*)/.source.replace("WC",Oc),iy=/(WCOD+)?/.source.replace("WCOD",ty),sy=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Oc),ry=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Oc),ay=new RegExp("^"+ny+iy+sy+ry+"$"),oy=["material","materials","bones","map"],Mc=class{constructor(e,t,n){let s=n||_t.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},_t=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(ey,"")}static parseTrackName(e){let t=ay.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);oy.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===t||o.uuid===t)return o;let l=n(o.children);if(l)return l}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let a=e[s];if(a===void 0){let c=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?o=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};_t.Composite=Mc;_t.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};_t.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};_t.prototype.GetterByBindingType=[_t.prototype._getValue_direct,_t.prototype._getValue_array,_t.prototype._getValue_arrayElement,_t.prototype._getValue_toArray];_t.prototype.SetterByBindingTypeAndVersioning=[[_t.prototype._setValue_direct,_t.prototype._setValue_direct_setNeedsUpdate,_t.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[_t.prototype._setValue_array,_t.prototype._setValue_array_setNeedsUpdate,_t.prototype._setValue_array_setMatrixWorldNeedsUpdate],[_t.prototype._setValue_arrayElement,_t.prototype._setValue_arrayElement_setNeedsUpdate,_t.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[_t.prototype._setValue_fromArray,_t.prototype._setValue_fromArray_setNeedsUpdate,_t.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Xy=new Float32Array(1);var Su=new Ke,Wa=class{constructor(e,t,n=0,s=1/0){this.ray=new Si(e,t),this.near=n,this.far=s,this.camera=null,this.layers=new _r,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Su.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Su),this}intersectObject(e,t=!0,n=[]){return bc(e,this,n,t),n.sort(Eu),n}intersectObjects(e,t=!0,n=[]){for(let s=0,r=e.length;s<r;s++)bc(e[s],this,n,t);return n.sort(Eu),n}};function Eu(i,e){return i.distance-e.distance}function bc(i,e,t,n){let s=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let a=0,o=r.length;a<o;a++)bc(r[a],e,t,!0)}}var Tr=class{constructor(e=1,t=0,n=0){return this.radius=e,this.phi=t,this.theta=n,this}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(Tt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Xa=class extends Ei{constructor(e=10,t=10,n=4473924,s=8947848){n=new qe(n),s=new qe(s);let r=t/2,a=e/t,o=e/2,l=[],c=[];for(let d=0,f=0,g=-o;d<=t;d++,g+=a){l.push(-o,0,g,o,0,g),l.push(g,0,-o,g,0,o);let _=d===r?n:s;_.toArray(c,f),f+=3,_.toArray(c,f),f+=3,_.toArray(c,f),f+=3,_.toArray(c,f),f+=3}let h=new at;h.setAttribute("position",new Ze(l,3)),h.setAttribute("color",new Ze(c,3));let u=new an({vertexColors:!0,toneMapped:!1});super(h,u),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}};var wu=new C,da,el,qa=class extends Rt{constructor(e=new C(0,0,1),t=new C(0,0,0),n=1,s=16776960,r=n*.2,a=r*.2){super(),this.type="ArrowHelper",da===void 0&&(da=new at,da.setAttribute("position",new Ze([0,0,0,0,1,0],3)),el=new Mt(0,.5,1,5,1),el.translate(0,-.5,0)),this.position.copy(t),this.line=new ri(da,new an({color:s,toneMapped:!1})),this.line.matrixAutoUpdate=!1,this.add(this.line),this.cone=new je(el,new Nn({color:s,toneMapped:!1})),this.cone.matrixAutoUpdate=!1,this.add(this.cone),this.setDirection(e),this.setLength(n,r,a)}setDirection(e){if(e.y>.99999)this.quaternion.set(0,0,0,1);else if(e.y<-.99999)this.quaternion.set(1,0,0,0);else{wu.set(e.z,0,-e.x).normalize();let t=Math.acos(e.y);this.quaternion.setFromAxisAngle(wu,t)}}setLength(e,t=e*.2,n=t*.2){this.line.scale.set(1,Math.max(1e-4,e-t),1),this.line.updateMatrix(),this.cone.scale.set(n,t,n),this.cone.position.y=e,this.cone.updateMatrix()}setColor(e){this.line.material.color.set(e),this.cone.material.color.set(e)}copy(e){return super.copy(e,!1),this.line.copy(e.line),this.cone.copy(e.cone),this}dispose(){this.line.geometry.dispose(),this.line.material.dispose(),this.cone.geometry.dispose(),this.cone.material.dispose()}};var Ya=class extends ei{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(){}disconnect(){}dispose(){}update(){}};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Sc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Sc);var ju={type:"change"},Bc={type:"start"},Qu={type:"end"},Qa=new Si,Ku=new nn,ly=Math.cos(70*Yt.DEG2RAD),Dt=new C,jt=2*Math.PI,ht={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Fc=1e-6,Rr=class extends Ya{constructor(e,t=null){super(e,t),this.state=ht.NONE,this.enabled=!0,this.target=new C,this.cursor=new C,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:ji.ROTATE,MIDDLE:ji.DOLLY,RIGHT:ji.PAN},this.touches={ONE:Ki.ROTATE,TWO:Ki.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new C,this._lastQuaternion=new En,this._lastTargetPosition=new C,this._quat=new En().setFromUnitVectors(e.up,new C(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Tr,this._sphericalDelta=new Tr,this._scale=1,this._panOffset=new C,this._rotateStart=new ie,this._rotateEnd=new ie,this._rotateDelta=new ie,this._panStart=new ie,this._panEnd=new ie,this._panDelta=new ie,this._dollyStart=new ie,this._dollyEnd=new ie,this._dollyDelta=new ie,this._dollyDirection=new C,this._mouse=new ie,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=hy.bind(this),this._onPointerDown=cy.bind(this),this._onPointerUp=uy.bind(this),this._onContextMenu=yy.bind(this),this._onMouseWheel=py.bind(this),this._onKeyDown=my.bind(this),this._onTouchStart=gy.bind(this),this._onTouchMove=_y.bind(this),this._onMouseDown=dy.bind(this),this._onMouseMove=fy.bind(this),this._interceptControlDown=xy.bind(this),this._interceptControlUp=vy.bind(this),this.domElement!==null&&this.connect(),this.update()}connect(){this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(ju),this.update(),this.state=ht.NONE}update(e=null){let t=this.object.position;Dt.copy(t).sub(this.target),Dt.applyQuaternion(this._quat),this._spherical.setFromVector3(Dt),this.autoRotate&&this.state===ht.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=jt:n>Math.PI&&(n-=jt),s<-Math.PI?s+=jt:s>Math.PI&&(s-=jt),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(Dt.setFromSpherical(this._spherical),Dt.applyQuaternion(this._quatInverse),t.copy(this.target).add(Dt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){let o=Dt.length();a=this._clampDistance(o*this._scale);let l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let o=new C(this._mouse.x,this._mouse.y,0);o.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new C(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=Dt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(Qa.origin.copy(this.object.position),Qa.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Qa.direction))<ly?this.object.lookAt(this.target):(Ku.setFromNormalAndCoplanarPoint(this.object.up,this.target),Qa.intersectPlane(Ku,this.target))))}else if(this.object.isOrthographicCamera){let a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Fc||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Fc||this._lastTargetPosition.distanceToSquared(this.target)>Fc?(this.dispatchEvent(ju),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?jt/60*this.autoRotateSpeed*e:jt/60/60*this.autoRotateSpeed}_getZoomScale(e){let t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Dt.setFromMatrixColumn(t,0),Dt.multiplyScalar(-e),this._panOffset.add(Dt)}_panUp(e,t){this.screenSpacePanning===!0?Dt.setFromMatrixColumn(t,1):(Dt.setFromMatrixColumn(t,0),Dt.crossVectors(this.object.up,Dt)),Dt.multiplyScalar(e),this._panOffset.add(Dt)}_pan(e,t){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;Dt.copy(s).sub(this.target);let r=Dt.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/n.clientHeight,this.object.matrix),this._panUp(2*t*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=e-n.left,r=t-n.top,a=n.width,o=n.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(jt*this._rotateDelta.x/t.clientHeight),this._rotateUp(jt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateUp(jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateUp(-jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateLeft(jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateLeft(-jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panStart.set(n,s)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),s=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(jt*this._rotateDelta.x/t.clientHeight),this._rotateUp(jt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new ie,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function cy(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i)))}function hy(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function uy(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Qu),this.state=ht.NONE;break;case 1:let e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function dy(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case ji.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=ht.DOLLY;break;case ji.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=ht.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=ht.ROTATE}break;case ji.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=ht.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=ht.PAN}break;default:this.state=ht.NONE}this.state!==ht.NONE&&this.dispatchEvent(Bc)}function fy(i){switch(this.state){case ht.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case ht.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case ht.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function py(i){this.enabled===!1||this.enableZoom===!1||this.state!==ht.NONE||(i.preventDefault(),this.dispatchEvent(Bc),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Qu))}function my(i){this.enabled===!1||this.enablePan===!1||this._handleKeyDown(i)}function gy(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Ki.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=ht.TOUCH_ROTATE;break;case Ki.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=ht.TOUCH_PAN;break;default:this.state=ht.NONE}break;case 2:switch(this.touches.TWO){case Ki.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=ht.TOUCH_DOLLY_PAN;break;case Ki.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=ht.TOUCH_DOLLY_ROTATE;break;default:this.state=ht.NONE}break;default:this.state=ht.NONE}this.state!==ht.NONE&&this.dispatchEvent(Bc)}function _y(i){switch(this._trackPointer(i),this.state){case ht.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case ht.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case ht.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case ht.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=ht.NONE}}function yy(i){this.enabled!==!1&&i.preventDefault()}function xy(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function vy(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var eo=class extends Bs{constructor(){super();let e=new Ct;e.deleteAttribute("uv");let t=new Vs({side:Ht}),n=new Vs,s=new Va(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);let r=new je(e,t);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);let a=new je(e,n);a.position.set(-10.906,2.009,1.846),a.rotation.set(0,-.195,0),a.scale.set(2.328,7.905,4.651),this.add(a);let o=new je(e,n);o.position.set(-5.607,-.754,-.758),o.rotation.set(0,.994,0),o.scale.set(1.97,1.534,3.955),this.add(o);let l=new je(e,n);l.position.set(6.167,.857,7.803),l.rotation.set(0,.561,0),l.scale.set(3.927,6.285,3.687),this.add(l);let c=new je(e,n);c.position.set(-2.017,.018,6.124),c.rotation.set(0,.333,0),c.scale.set(2.002,4.566,2.064),this.add(c);let h=new je(e,n);h.position.set(2.291,-.756,-2.621),h.rotation.set(0,-.286,0),h.scale.set(1.546,1.552,1.496),this.add(h);let u=new je(e,n);u.position.set(-2.193,-.369,-5.547),u.rotation.set(0,.516,0),u.scale.set(3.875,3.487,2.986),this.add(u);let d=new je(e,Ys(50));d.position.set(-16.116,14.37,8.208),d.scale.set(.1,2.428,2.739),this.add(d);let f=new je(e,Ys(50));f.position.set(-16.109,18.021,-8.207),f.scale.set(.1,2.425,2.751),this.add(f);let g=new je(e,Ys(17));g.position.set(14.904,12.198,-1.832),g.scale.set(.15,4.265,6.331),this.add(g);let _=new je(e,Ys(43));_.position.set(-.462,8.89,14.52),_.scale.set(4.38,5.441,.088),this.add(_);let m=new je(e,Ys(20));m.position.set(3.235,11.486,-12.541),m.scale.set(2.5,2,.1),this.add(m);let p=new je(e,Ys(100));p.position.set(0,20,0),p.scale.set(1,.1,1),this.add(p)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function Ys(i){let e=new Nn;return e.color.setScalar(i),e}var My={105:"Lens: coated glass or optical polymer TBD / emitter carrier: metal / seals: elastomer candidate",106:"Fasteners: corrosion-compatible metal TBD / glazing seals: elastomer candidate / panel interfaces: unqualified",107:"Grille: coated metal or composite candidate / louver finish: satin protective coating",108:"Service housing: insulating polymer candidate / contacts: copper-alloy candidate / seal: elastomer TBD",120:"Console and yoke shells: composite appearance / grips: elastomer candidate / screen cover: coated transparent material TBD",121:"Seat shell: composite candidate / cushion: foam candidate / upholstery and restraint webbing: textiles TBD",122:"Liner: polymer or composite candidate / sill plate: metal candidate / contact surfaces: soft trim TBD",211:"Cell cans: metallic appearance / links and caps: copper appearance / board: laminated substrate candidate / isolation: unresolved",212:"Enclosure: insulated housing candidate / terminals: copper appearance / lead jacket: insulating polymer candidate",321:"Winding: copper appearance / lamination rings: electrical-steel candidate / winding insulation and impregnation: unresolved",322:"Races and rolling elements: bearing-steel candidate / cage, lubricant, coating and seals: unresolved",342:"Studs and fasteners: compatible metal TBD / sensor enclosure: polymer or metal candidate / cable jacket: insulating polymer",501:"Heat exchanger and manifold: aluminum-alloy candidate / hoses: coolant-compatible elastomer TBD / clamps: compatible metal"},zc=[{id:"105",name:"Lighting micro-assemblies",short:"Lighting elements",desc:"Individual projector lenses, light guides and segmented rear emitters are added within the accepted lighting envelopes.",details:["The exterior lamp outlines and body silhouette are unchanged.","Small lenses and rear segments are separately inspectable.","Optical beam patterns and lighting approval are not established."]},{id:"106",name:"Panel hardware & seals",short:"Seams / fasteners",desc:"Panel shut lines, glazing seals, recessed handles and small service fasteners enrich the existing exterior without changing its profile.",details:["Fastener positions and spacing are illustrative.","Seals and panel gaps are visual details, not toleranced interfaces.","No joining, bonding or crash load capability is claimed."]},{id:"107",name:"Vent inserts & louvers",short:"Grilles / louvers",desc:"Hexagonal intake inserts and closely spaced louver details sit inside the accepted vent and intake areas.",details:["The exterior intake outlines are preserved.","Visible openings do not establish an effective flow area.","Debris, pressure loss, cooling and acoustics need analysis."]},{id:"108",name:"Service / connector recess",short:"Service connector",desc:"A generic capped service connector and recessed access surround are an illustrative electrical-service detail.",details:["No charging standard, pinout, voltage or current rating is implied.","Connector separation and sealing remain unresolved.","The access cap is a visual packaging proposal."]},{id:"120",name:"Cockpit displays & controls",short:"Cockpit controls",desc:"A layered instrument panel, control yoke, switches, center console and pedals replace the simple interior placeholders.",details:["Displays explicitly say DESIGN STUDY and show no simulated flight telemetry.","Button and pedal layouts are illustrative, not a validated human-factors design.","Controls are visual; they do not arm or operate propulsion."]},{id:"121",name:"Seat shells & restraints",short:"Seats / restraints",desc:"Bolstered seat shells, cushion inserts, seam lines and visible restraint webbing give the occupant cell an inspectable interior.",details:["Two seat envelopes remain a packaging assumption, not a payload commitment.","Belt anchorage, crash loads and occupant protection are not established.","Upholstery and webbing textures are appearances, not approved materials."]},{id:"122",name:"Door liners & interior fittings",short:"Interior fittings",desc:"Inner trim panels, pockets, sill plates and small cabin fittings are added inside the existing body.",details:["No hinge trajectory, seal performance or egress capability is established.","Door trim is illustrative and does not define a manufactured door.","Keep exterior and structural validation separate from finish appearance."]},{id:"211",name:"Illustrative battery internals",short:"Battery internals",desc:"Individual cell envelopes, terminal caps, busbar links and monitoring-board details are visible in the open power-bay study.",details:["Cell format, chemistry, capacity and layout are not selected.","This is not a wiring diagram or a usable pack construction plan.","Protection, propagation, cooling, isolation and crash validation remain open."]},{id:"212",name:"Power junction & electronics detail",short:"Power junction",desc:"A contactor-like enclosure, terminal hardware, cable ends and small electronics details clarify the protected-power architecture.",details:["Component outlines are illustrative, not selected commercial parts.","No conductor rating, circuit design or protection coordination is defined.","Independent inhibit requirements from the disclosure are retained."]},{id:"321",name:"Motor winding / lamination study",short:"Motor internals",desc:"Separate winding loops, lamination rings and lead details make the electric motor readable when its casing is opened.",details:["The topology is a visual teaching model, not an electromagnetic design.","No phase count, torque constant, speed or efficiency is specified.","Animation remains separate from actual RPM or power."]},{id:"322",name:"Bearing races & rolling elements",short:"Bearing detail",desc:"Concentric races, rolling-element envelopes and hub details enrich the exploded fan module.",details:["Bearing type, preload, lubrication and fits remain unspecified.","The illustrated rolling elements do not establish a load rating.","Rotor stress, critical speed and bearing life require analysis."]},{id:"342",name:"Fan service hardware",short:"Fan fasteners",desc:"Mount-flange studs, duct-lip fasteners and small connector / sensor mounts make the fan module a more complete service visualization.",details:["Patterns and counts are visual assumptions, not a bolt specification.","Fragment containment, locking and fatigue capability remain unproven.","Disassembly offsets are for communication only."]},{id:"501",name:"Cooling plumbing & heat-exchanger detail",short:"Cooling detail",desc:"Reservoir, manifold, radiator-fin, clamp and hose details are added to the qualitative thermal system.",details:["No coolant, flow rate, pressure, heat-rejection capacity or pump is selected.","Illustrative routing is not a qualified plumbing design.","Thermal management and electrical isolation remain engineering hold points."]}].map(i=>({...i,materialStudy:My[i.id],risk:"Added visual detail only. Dimensions, interfaces, ratings, manufacturing and system safety require independent engineering.",source:"Revision 05 / added inspection detail"})),Ri=i=>new C(...i);function bt(i,e,t,n,s,r={}){return i.mesh(e,t,s,{...r,instances:n})}function Ai(i,e){return i.material.color.setHex(e),i.userData.studio.color.setHex(e),i}function by(i,e,t,n,s=.012){return bt(i,e,new Mt(s,s,s*.7,6),t.map(r=>({p:r,rot:[0,0,Math.PI/2]})),n,{role:"metal"})}function ed(i,e,t,n,s,r){let a=Ri(n).sub(Ri(t)),o=i.mesh(e,new Ct(s,a.length(),.007),r,{role:"ceramic"});return o.position.copy(Ri(t).add(Ri(n)).multiplyScalar(.5)),o.quaternion.setFromUnitVectors(new C(0,1,0),a.normalize()),Ai(o,1120288),o}function td(i,e,t,n,s,r,a,o=[0,-Math.PI/2,0]){let l=document.createElement("canvas");l.width=512,l.height=256;let c=l.getContext("2d");c.fillStyle="#07131c",c.fillRect(0,0,512,256),c.strokeStyle="#297282",c.lineWidth=3,c.strokeRect(10,10,492,236),c.fillStyle="#77e5f0",c.font="bold 27px monospace",c.fillText(r[0],28,49),c.font="20px monospace",c.fillStyle="#adc2ca",r.slice(1).forEach((d,f)=>c.fillText(d,28,95+f*39));let h=new wi(l);h.colorSpace=Ut;let u=i.mesh(e,new si(t,n),a,{role:"ceramic"});return u.position.set(...s),u.rotation.set(...o),u.material.map=h,u.material.emissiveMap=h,u.material.emissive.setHex(9550792),u.material.emissiveIntensity=.45,u.material.roughness=.24,u.userData.studio.copy(u.material),u}function Ot(i,e,t,n,s){let r=i.group(e,n,s);return r.userData.assemblyPart=t,r}function nd(i,e){let{skin:t,canopy:n,pack:s,cabin:r,seats:a,power:o}=e,{mesh:l,box:c,rod:h,tube:u,cyl:d,panel:f}=i,g=Ot(i,t,"105",[0,0,0],[.16,.02,0]),_=Ot(i,t,"106",[0,0,0],[0,.1,.16]),m=Ot(i,t,"108",[0,0,0],[0,0,.23]);for(let y of[-1,1]){let D=[];for(let $ of[.46,.58,.7]){let he=y*$,Ie=3.1-.18*($/.91)**3+.072;D.push({p:[Ie,.615,he],rot:[0,0,-Math.PI/2]})}bt(i,g,new Mt(.018,.018,.007,20),D,"105",{role:"metal"}),bt(i,g,new Mt(.012,.012,.008,20),D.map($=>({...$,p:[$.p[0]+.005,$.p[1],$.p[2]]})),"105",{role:"glass"}).userData.studio.color.setHex(8240078);let z=[];for(let $=0;$<38;$++)z.push({p:[-3.137,.82,y*(.17+$*.0205)],s:[1,1,1]});let G=bt(i,g,new Ct(.008,.02,.01),z,"105",{role:"ceramic"});Ai(G,14558778),G.material.emissive.setHex(7079697),G.userData.studio.copy(G.material),u(_,[[.55,.965,y*.96],[.35,.7,y*.95],[-.95,.5,y*1.1],[-1.21,.9,y*1.17]],.0035,"106",{role:"carbon"}),Ai(c(_,[.13,.018,.008],[.24,.87,y*.957],"106",{role:"metal"}),2370097),c(_,[.095,.006,.011],[.24,.872,y*.965],"106",{role:"metal"});let j=[];for(let $=0;$<10;$++){let he=$/9;j.push([1.16+he*1.5,1.005-he*.22,y*(.64+he*.07)])}for(let $=0;$<8;$++)j.push([-2.7+$*.1,1.084,y*.47]);if(bt(i,_,new Mt(.006,.006,.003,6),j.map($=>({p:$})),"106",{role:"metal"}),y>0){l(m,new on(.064,.009,8,32),"108",{role:"metal"}).position.set(-1.13,.72,1.18);let he=l(m,new Mt(.054,.054,.008,28),"108",{role:"ceramic"});he.rotation.x=Math.PI/2,he.position.set(-1.13,.72,1.18);let Ie=Array.from({length:7},($e,Y)=>({p:[-1.13+Math.cos(Y*Math.PI*2/7)*.032,.72+Math.sin(Y*Math.PI*2/7)*.032,1.189],rot:[Math.PI/2,0,0]}));bt(i,m,new Mt(.006,.006,.009,10),Ie,"108",{role:"copper"})}let X=Ot(i,t,"107",[0,0,0],[0,0,y*.15]),U=[],O=[[-.4,.77,y*.98],[-1.12,.93,y*1.14],[-1.28,.51,y*1.17],[-.55,.42,y*.99]];for(let $=0;$<10;$++)for(let he=0;he<12;he++){let Ie=.08+(he+$%2*.45)/13*.84,$e=.08+$/11*.84,Y=Ri(O[0]).lerp(Ri(O[1]),Ie),se=Ri(O[3]).lerp(Ri(O[2]),Ie),me=Y.lerp(se,$e);me.z+=y*.008,U.push({p:me.toArray(),rot:[0,0,Math.PI/6],s:[1,.85,1]})}let ee=bt(i,X,new on(.021,.003,5,6),U,"107",{role:"metal"});Ai(ee,3357507)}let p=Ot(i,n,"106",[0,0,0],[0,.08,0]);for(let y of[-1,1])u(p,[[1.17,1.015,y*.727],[.82,1.25,y*.687],[.18,1.57,y*.617],[-.35,1.64,y*.607],[-.86,1.59,y*.617],[-1.87,1.06,y*.757]],.005,"106",{role:"rubber"});let S=Ot(i,t,"107",[0,0,0],[0,.15,0]),v=[];for(let y=0;y<30;y++)for(let D of[-1,1])v.push({p:[-2.46+y*.023,1.096,D*.36],rot:[0,0,-.15]});bt(i,S,new Ct(.008,.018,.18),v,"107",{role:"metal"});let x=Ot(i,r,"120",[0,0,0],[.12,.27,0]);c(x,[.1,.3,.66],[.73,1.1,0],"120",{role:"carbon"}),td(i,x,.56,.235,[.674,1.12,0],["DESIGN STUDY","PROPULSION DISARMED","ROTOR SPEED: TBD","NOT FLIGHT TELEMETRY"],"120"),c(x,[.58,.18,.17],[.2,.77,0],"120",{role:"carbon"}),td(i,x,.13,.32,[.18,.873,0],["STUDY","RESERVE TBD","TEMP TBD","ISOLATE"],"120",[-Math.PI/2,0,-Math.PI/2]);for(let y=0;y<8;y++){let D=d(x,.011,.011,[.02+y*.045,.88,.062],"120",{role:"metal"});y===7&&Ai(D,11019561)}let I=[.36,1.03,.34];u(x,[[.36,1.11,.17],[.36,.96,.17],[.36,.93,.28],[.36,.93,.4],[.36,.96,.51],[.36,1.11,.51],[.36,1.12,.43],[.36,1.06,.41],[.36,1.06,.27],[.36,1.12,.25],[.36,1.11,.17]],.014,"120",{role:"carbon"});for(let y of[.185,.495]){h(x,[.36,.98,y],[.36,1.09,y],.02,"120",{role:"rubber"});for(let D=0;D<5;D++)h(x,[.344,.984+D*.021,y-.011],[.344,.984+D*.021,y+.011],.0025,"120",{role:"rubber"})}h(x,[.37,1.03,.34],[.69,.99,.34],.022,"120",{role:"metal"}),c(x,[.032,.08,.15],[.35,1.03,.34],"120",{role:"ceramic"});for(let y=0;y<6;y++){let D=d(x,.008,.007,[.329,1.01+y%3*.019,.3+Math.floor(y/3)*.08],"120",{role:"metal"});D.rotation.z=Math.PI/2}let R=Ot(i,r,"120",[0,0,0],[0,.1,0]);for(let y of[.23,.43]){let D=c(R,[.035,.11,.07],[.64,.43,y],"120",{role:"metal"});D.rotation.z=-.3;for(let H=0;H<6;H++)h(R,[.613,.39+H*.015,y-.025],[.613,.39+H*.015,y+.025],.003,"120",{role:"rubber"})}let L=Ot(i,a,"121",[0,0,0],[0,.42,0]);for(let y of[-.34,.34]){let D=c(L,[.62,.08,.39],[-.2,.79,y],"121",{role:"ceramic"});Ai(D,1449511);let H=c(L,[.1,.46,.38],[-.62,1.03,y],"121",{role:"carbon"});H.rotation.z=-.16;for(let z of[-1,1])u(L,[[-.48,.81,y+z*.19],[-.05,.8,y+z*.2],[.09,.77,y+z*.14]],.038,"121",{role:"ceramic"}),u(L,[[-.62,.85,y+z*.19],[-.67,1.08,y+z*.2],[-.7,1.24,y+z*.15]],.034,"121",{role:"ceramic"}),ed(i,L,[-.67,1.23,y+z*.12],[-.08,.83,y],.025,"121"),ed(i,L,[-.42,.8,y+z*.19],[-.08,.83,y],.028,"121");for(let z=0;z<9;z++)h(L,[-.49+z*.06,.836,y-.14],[-.49+z*.06,.836,y+.14],.0018,"121",{role:"ceramic"});c(L,[.045,.025,.05],[-.08,.84,y],"121",{role:"metal"}),Ai(c(L,[.032,.014,.03],[-.075,.857,y],"121",{role:"ceramic"}),9180713),c(L,[.1,.13,.23],[-.71,1.34,y],"121",{role:"ceramic"})}let E=Ot(i,r,"122",[0,0,0],[0,.05,.19]);for(let y of[-1,1]){c(E,[1.05,.28,.04],[-.21,.83,y*.76],"122",{role:"carbon"}),c(E,[.36,.045,.075],[.04,.89,y*.71],"122",{role:"ceramic"}),c(E,[.17,.025,.025],[.22,.96,y*.73],"122",{role:"metal"}),c(E,[.84,.025,.12],[-.21,.58,y*.72],"122",{role:"metal"});let D=[];for(let H=0;H<8;H++)for(let z=0;z<5;z++)D.push({p:[-.62+H*.025,.76+z*.024,y*.735],rot:[Math.PI/2,0,0]});bt(i,E,new Mt(.004,.004,.005,6),D,"122",{role:"metal"})}Sy(i,{pack:s,power:o}),Ey(i)}function Sy(i,{pack:e,power:t}){let n=Ot(i,e,"211",[0,0,0],[0,.3,0]),s=[],r=[],a=[],o=[];for(let h=0;h<6;h++)for(let u=0;u<2;u++){let d=-1.28+h*.51,f=-.33+u*.66;for(let _=0;_<4;_++)for(let m=0;m<8;m++){let p=d-.192+m*.055,S=f-.22+_*.145;s.push({p:[p,.01,S]}),r.push({p:[p,.069,S]}),m<7&&a.push({p:[p+.027,.081,S]})}let g=Ai(i.box(n,[.12,.012,.15],[d,.105,f],"211",{role:"ceramic"}),1390641);for(let _=0;_<8;_++)o.push({p:[d-.04+_%2*.08,.12,f-.06+Math.floor(_/2)*.04]})}bt(i,n,new Mt(.022,.022,.105,12),s,"211",{role:"metal"}),bt(i,n,new Mt(.015,.015,.007,12),r,"211",{role:"copper"}),bt(i,n,new Ct(.038,.004,.014),a,"211",{role:"copper"}),bt(i,n,new Ct(.025,.012,.017),o,"211",{role:"ceramic"});for(let h of[-.6,.6])i.tube(n,[[-1.5,.11,h],[-.8,.12,h],[.2,.12,h],[1.5,.11,h]],.009,"211",{role:"rubber"});let l=Ot(i,t,"212",[0,0,0],[.2,.28,0]);i.box(l,[.34,.075,.44],[0,.14,0],"212",{role:"ceramic"});let c=[];for(let h of[-.1,.1])for(let u of[-.15,.15])c.push({p:[h,.21,u]});bt(i,l,new Mt(.025,.025,.05,12),c,"212",{role:"copper"});for(let h of[-.18,.18])i.tube(l,[[.11,.22,h],[.22,.22,h],[.35,.13,h],[.48,.08,h]],.016,"212",{role:"rubber"});for(let h=0;h<16;h++)i.box(l,[.008,.033,.38],[-.14+h*.019,.22,0],"212",{role:"metal"});by(i,l,[[-.17,.14,-.21],[-.17,.14,.21],[.17,.14,-.21],[.17,.14,.21]],"212",.009)}function Ey(i){let e=Ot(i,i.vehicle,"501",[0,0,0],[0,.2,-.2]);for(let t of[-1,1]){let n=[];for(let r=0;r<42;r++)n.push({p:[-2.24+r*.012,.74,t*.82]});bt(i,e,new Ct(.004,.16,.13),n,"501",{role:"metal"});for(let r of[.67,.81])i.tube(e,[[-2.3,r,t*.82],[-2.12,r,t*.82],[-1.7,r,t*.66],[-1.43,.5,t*.59]],.01,"501",{role:"metal"});i.tube(e,[[-1.43,.5,t*.59],[-.6,.46,t*.62],[.5,.48,t*.65],[1.7,.6,t*.7]],.012,"501",{role:"rubber"});let s=[];for(let r=0;r<10;r++)s.push({p:[-.7+r*.24,.47,t*.64],rot:[0,0,Math.PI/2]});bt(i,e,new on(.016,.003,6,12),s,"501",{role:"metal"})}i.cyl(e,.065,.15,[-1.65,.72,-.35],"501",{role:"ceramic"}),i.cyl(e,.071,.018,[-1.65,.806,-.35],"501",{role:"metal"}),i.tube(e,[[-1.65,.68,-.35],[-1.5,.59,-.4],[-1.43,.5,-.59]],.012,"501",{role:"rubber"})}function id(){let i=new Ti;i.absarc(0,0,.22,0,Math.PI*2,!1);let e=new qi;e.absarc(0,0,.068,0,Math.PI*2,!0),i.holes.push(e);for(let n of[.125,.169,.193])for(let s=0;s<18;s++){let r=(s+(n===.169?.5:0))*Math.PI/9,a=new qi;a.absarc(Math.cos(r)*n,Math.sin(r)*n,.0065,0,Math.PI*2,!0),i.holes.push(a)}let t=new ai(i,{depth:.026,bevelEnabled:!1,curveSegments:24});return t.rotateX(-Math.PI/2),t.translate(0,-.013,0),t.userData.cadLocalTransform=new Ke().makeRotationX(-Math.PI/2).setPosition(0,-.013,0).toArray(),t}function sd(i,e,{radius:t,fanOffset:n,road:s,detailMode:r}){let a=Ot(i,e,"321",[0,n-.21,0],[-.48,-1.1,0]),o=[];for(let g=0;g<28;g++)o.push({p:[0,-.115+g*.0085,0],rot:[Math.PI/2,0,0]});bt(i,a,new on(.145,.0026,5,32),o,"321",{role:"metal"});let l=[];for(let g=0;g<30;g++){let _=g*Math.PI/15;l.push({p:[Math.cos(_)*.125,0,Math.sin(_)*.125],rot:[0,-_,0],s:[.7,1.8,.6]})}bt(i,a,new on(.022,.005,6,12),l,"321",{role:"copper"});for(let g of[-.035,0,.035])i.tube(a,[[.14,.1,g],[.22,.11,g],[.25,.03,g]],.006,"321",{role:"copper"});let c=Ot(i,e,"322",[0,n-.21,0],[.5,-1.55,0]),h=[];for(let g of[-.125,.11]){i.torus(c,.093,.008,[0,g,0],"322",{role:"metal"}),i.torus(c,.066,.007,[0,g,0],"322",{role:"metal"});for(let _=0;_<36;_++){let m=_*Math.PI/18;h.push({p:[Math.cos(m)*.08,g,Math.sin(m)*.08]})}}bt(i,c,new oi(.0068,8,6),h,"322",{role:"metal"});let u=Ot(i,e,"342",[0,n,0],[0,-.58,.06]),d=[];for(let g=0;g<48;g++){let _=g*Math.PI/24;d.push({p:[Math.cos(_)*(t+.018),.17,Math.sin(_)*(t+.018)]})}bt(i,u,new Mt(.008,.008,.015,6),d,"342",{role:"metal"});let f=[];for(let g=0;g<12;g++){let _=g*Math.PI/6;f.push({p:[Math.cos(_)*.174,-.37,Math.sin(_)*.174]})}if(bt(i,u,new Mt(.014,.014,.03,6),f,"342",{role:"metal"}),i.box(u,[.045,.04,.06],[t+.05,-.015,0],"342",{role:"ceramic"}),i.tube(u,[[t+.05,-.015,0],[t+.035,-.1,0],[.24,-.25,0]],.007,"342",{role:"rubber"}),s){let g=Ot(i,e,"300",[0,0,0],[0,.58,0]),_=[],m=(r?.83:.58)+.157;for(let p=0;p<96;p++)for(let S of[-1,1]){let v=p*Math.PI/48;_.push({p:[Math.cos(v)*m,S*.055,Math.sin(v)*m],rot:[0,-v,S*.16]})}bt(i,g,new Ct(.016,.042,.007),_,"300",{role:"rubber"})}r&&(i.anchor(a,[.15,0,0],"321","WINDINGS / LAMINATIONS"),i.anchor(c,[-.12,-.13,0],"322","BEARING RACES",!0))}var Ci={carmine:{name:"Carmine red",color:8065054,css:"#a82b3d",description:"Deep gloss color coat / clearcoat appearance"},silver:{name:"Liquid silver",color:9477545,css:"#9da9b4",description:"Cool metallic paint / clearcoat appearance"},pearl:{name:"Glacier pearl",color:14080468,css:"#e0e2da",description:"Warm pearl-white paint / clearcoat appearance"},graphite:{name:"Graphite blue",color:2244444,css:"#34546d",description:"Dark blue metallic paint / clearcoat appearance"}},ad={paint:{name:"Clear-coated body finish",finish:"Gloss / metallic appearance",stack:"Clearcoat \u2192 color coat \u2192 candidate composite panel",note:"CFRP is a candidate substrate, not a selected laminate. Layup, resin, paint compatibility, repair and lightning protection remain unresolved."},carbon:{name:"Exposed carbon-fiber appearance",finish:"Satin twill / protected edges",stack:"Protective finish \u2192 visible weave appearance \u2192 candidate composite",note:"Applied to splitter, sills, rear diffuser and fan blades as an appearance study. The visible weave is procedural; it does not define a structural laminate."},glass:{name:"Smoked glazing",finish:"Dark tint / polished exterior",stack:"Visual glazing layer \u2192 seals / frame concept",note:"Glass versus coated polymer remains undecided. Optical distortion, abrasion, impact, egress, heating and flight requirements need specialist assessment."},metal:{name:"Machined-metal appearance",finish:"Satin / machined edge highlights",stack:"Surface treatment \u2192 metal component concept",note:"Alloy, temper, corrosion isolation, fatigue life, bearing fits and electrical bonding are unspecified. Appearance is not material qualification."},rubber:{name:"Road tire elastomer",finish:"Matte black / tread grooves",stack:"Tread appearance \u2192 road-contact tire envelope",note:"Compound, reinforcement, speed rating, thermal limits and road / fan separation are unresolved. This model is not a tire design."},copper:{name:"Electrical copper appearance",finish:"Warm satin conductor finish",stack:"Visual busbar / electrical interface",note:"No conductor size, voltage rating, insulation, protection coordination or current capacity is established."},ceramic:{name:"Thermal / electronics enclosure",finish:"Satin insulated enclosure appearance",stack:"Enclosure / barrier concept",note:"Housing material, isolation strategy, coolant interfaces and thermal propagation protection remain engineering hold points."}};function wy(){let i=document.createElement("canvas");i.width=i.height=128;let e=i.getContext("2d");e.fillStyle="#171b20",e.fillRect(0,0,128,128);for(let n=0;n<16;n++)for(let s=0;s<16;s++){let r=(n+s)%4<2,a=e.createLinearGradient(s*8,n*8,s*8+(r?8:0),n*8+(r?0:8));a.addColorStop(0,"#11151b"),a.addColorStop(.45,"#353b42"),a.addColorStop(1,"#171c22"),e.fillStyle=a,e.fillRect(s*8,n*8,8,8),e.strokeStyle="#656b7224",e.lineWidth=.5;for(let o=1;o<4;o++)e.beginPath(),r?(e.moveTo(s*8+o*2,n*8),e.lineTo(s*8+o*2,n*8+8)):(e.moveTo(s*8,n*8+o*2),e.lineTo(s*8+8,n*8+o*2)),e.stroke()}let t=new wi(i);return t.colorSpace=Ut,t.wrapS=t.wrapT=pr,t.repeat.set(6,6),t.anisotropy=4,t}function od(i){let e={paint:{color:Ci.carmine.color,metalness:.48,roughness:.24,clearcoat:1,clearcoatRoughness:.12},carbon:{color:7501693,metalness:.05,roughness:.42,clearcoat:.38,clearcoatRoughness:.28},glass:{color:396050,metalness:.04,roughness:.12,clearcoat:.3,transparent:!0,opacity:.9,depthWrite:!1,envMapIntensity:.4},metal:{color:9015706,metalness:.88,roughness:.3,clearcoat:.2},rubber:{color:1053206,metalness:0,roughness:.88},copper:{color:11889986,metalness:.85,roughness:.3},ceramic:{color:3160643,metalness:.18,roughness:.64}}[i]||{};return new za({side:sn,envMapIntensity:1,...e})}function ld(){return wy()}function rd(i,e,t){for(let n=0;n<i.length-1;n++)if(e>=i[n][0]&&e<=i[n+1][0]){let s=(e-i[n][0])/(i[n+1][0]-i[n][0]),r=s*s*(3-2*s);return Yt.lerp(i[n][t],i[n+1][t],r)}return i[e<i[0][0]?0:i.length-1][t]}function $s(i,e,t,n,s,r,a={}){let o=[],l=[],c=[];for(let u=0;u<=n;u++)for(let d=0;d<=s;d++)o.push(...r(u/n,d/s)),l.push(u/n,d/s);for(let u=0;u<n;u++)for(let d=0;d<s;d++){let f=u*(s+1)+d,g=f+1,_=f+s+1,m=_+1;c.push(f,_,g,g,_,m)}let h=new at;return h.setAttribute("position",new Ze(o,3)),h.setAttribute("uv",new Ze(l,2)),h.setIndex(c),h.computeVertexNormals(),h.userData.cadGrid={nu:n,nv:s},i(e,h,t,a)}function cd(i){let{vehicle:e,state:t,group:n,mesh:s,box:r,rod:a,tube:o,cyl:l,panel:c,line:h,anchor:u}=i,d=[[-3.1,1.01,1],[-2.55,1.12,1.08],[-1.8,1.3,1.1],[-1,1.1,1.05],[0,.93,1],[.9,1.03,.98],[1.8,1.27,.91],[2.55,1.08,.78],[3.1,.91,.68]],f=U=>rd(d,U,1)*(t.model==="B"?.86:1),g=U=>rd(d,U,2),_=U=>.22*(Math.exp(-(((U-1.8)/.6)**2))+Math.exp(-(((U+1.8)/.65)**2))),m=(U,O)=>g(U)+_(U)*Math.exp(-(((Math.abs(O)-.95)/.27)**2))-.025*Math.abs(O)**7,p=U=>{let O=.2;if(t.model==="A")for(let ee of[-1.8,1.8]){let $=(U-ee)/.59;Math.abs($)<1&&(O=Math.max(O,.2+.89*Math.sqrt(1-$*$)))}return O},S=n(e,[0,0,0],[0,1.25,.12]);S.userData.assemblyPart="101";let v=n(S,[0,0,0],[0,-.28,0]);v.userData.assemblyPart="104";let x=(U,O)=>U-.18*Math.abs(O)**3*Yt.smoothstep(U,2.65,3.1)+.1*Math.abs(O)**3*(1-Yt.smoothstep(U,-3.1,-2.7)),I=U=>U.map(O=>[x(3.1,O[2]/.91)+.055,O[1],O[2]]);$s(s,S,"101",100,32,(U,O)=>{let ee=-3.1+U*6.2,$=-1+O*2;return[x(ee,$),m(ee,$),$*f(ee)]},{role:"paint",angle:32});for(let U of[-1,1]){$s(s,S,"101",130,8,(Ie,$e)=>{let Y=-3.1+Ie*6.2,se=m(Y,1),me=Math.min(se-.028,p(Y)),ce=Yt.lerp(se,me,$e);return[x(Y,1),ce,U*f(Y)*(1-.035*Math.sin($e*Math.PI))]},{role:"paint",angle:32}),o(S,[[1.1,1.005,U*.58],[2.1,.925,U*.64],[2.89,.73,U*.67]],.005,"101",{role:"darkTrim",opacity:.7}),o(S,[[.65,.98,U*.9],[.3,.72,U*.97],[-.8,.61,U*1.01],[-1.05,.84,U*1.12]],.007,"101",{role:"darkTrim"});let O=c(v,[[-.4,.77,U*.98],[-1.12,.93,U*1.14],[-1.28,.51,U*1.17],[-.55,.42,U*.99]],"104",{role:"carbon"});O.userData.materialLabel="Sculpted side intake / satin composite appearance";let ee=r(v,[2.15,.1,.14],[-.05,.24,U*1],"104",{role:"carbon"});if(ee.rotation.y=U*.025,t.model==="A")for(let Ie of[-1.8,1.8]){let $e=Array.from({length:41},(Y,se)=>{let me=Ie-.585+se*.02925;return[me,Math.min(m(me,1)-.012,p(me)+.012),U*(f(me)+.009)]});o(v,$e,.011,"104",{role:"carbon"})}let $=c(S,I([[3.105,.63,U*.81],[3.105,.64,U*.39],[3.105,.59,U*.42],[3.105,.59,U*.79]]),"105",{role:"light",color:14480895});$.userData.light=!0;let he=r(S,[.035,.028,.78],[-3.115,.82,U*.55],"105",{role:"light",color:16725826});he.userData.light=!0,c(v,I([[3.11,.49,U*.79],[3.11,.48,U*.3],[3.11,.27,U*.39],[3.11,.29,U*.82]]),"104",{role:"carbon"})}for(let U of[-3.1,3.1])$s(s,S,"101",24,6,(O,ee)=>{let $=-1+O*2;return[x(U,$),Yt.lerp(m(U,$),.21,ee),$*f(U)*(1-ee*.035)]},{role:"paint"});r(v,[4.95,.045,1.8],[0,.185,0],"104",{role:"carbon"}),r(v,[.38,.045,2.08],[2.97,.205,0],"104",{role:"carbon"}),r(v,[.48,.055,2.08],[-2.91,.22,0],"104",{role:"carbon"}).rotation.z=-.13;for(let U of[-.75,-.38,0,.38,.75]){let O=r(v,[.6,.13,.018],[-2.85,.2,U],"104",{role:"carbon"});O.rotation.z=-.17}r(v,[.08,.22,.56],[3.12,.39,0],"104",{role:"carbon"});for(let U=0;U<7;U++)r(v,[.12,.012,.5],[-2.42+U*.11,1.091,0],"104",{role:"carbon"});let T=r(S,[.12,.045,1.85],[-3.02,1.025,0],"101",{role:"paint"});T.rotation.z=-.12;let R=n(e,[0,0,0],[0,1.7,-.13]);R.userData.assemblyPart="102";let L=n(R,[0,0,0],[0,.25,0]);L.userData.assemblyPart="104";let E=[[1.18,1.015,.72],[.82,1.25,.68],[.18,1.57,.61],[-.35,1.64,.6],[-.86,1.59,.61],[-1.39,1.31,.67],[-1.87,1.06,.75]],y=new Fn(E.map(U=>new C(...U)),!1,"centripetal");$s(s,R,"102",58,24,(U,O)=>{let ee=y.getPoint(U),$=-1+2*O;return[ee.x,ee.y+.045*(1-$*$),ee.z*$]},{role:"glass",angle:34}).userData.glazing=!0;for(let U of[-1,1])$s(s,R,"102",58,8,(O,ee)=>{let $=y.getPoint(O),he=1.005+.035*Math.sin(O*Math.PI);return[$.x,Yt.lerp($.y,he,ee),U*Yt.lerp($.z,.76,ee)]},{role:"glass",angle:34}).userData.glazing=!0,o(R,E.map(O=>[O[0],O[1],U*O[2]]),.019,"102",{role:"paint"}),o(L,[[1.18,1.015,U*.73],[0,1,U*.77],[-1.87,1.06,U*.75]],.012,"104",{role:"carbon"}),a(L,[-.42,1.02,U*.76],[-.42,1.64,U*.6],.016,"104",{role:"carbon"});$s(s,L,"104",24,6,(U,O)=>{let ee=y.getPoint(.33+U*.29);return[ee.x,ee.y+.049,(O-.5)*.24]},{role:"carbon"});let D=n(e,[0,.25,0],[0,-.18,0]);for(let U of[-.69,.69])r(D,[4.65,.1,.1],[0,0,U],"110",{role:"metal"});for(let U=-2;U<2.01;U+=.5)r(D,[.07,.09,1.46],[U,0,0],"110",{role:"metal"});let H=n(e,[0,.43,0],[0,.46,0]);r(H,[3.3,.2,1.38],[0,0,0],"200",{role:"ceramic"});for(let U=0;U<6;U++)for(let O=0;O<2;O++)r(H,[.47,.15,.6],[-1.28+U*.51,.015,-.33+O*.66],"200",{role:"ceramic"}),r(H,[.045,.022,.28],[-1.28+U*.51,.113,-.33+O*.66],"210",{role:"copper"});let z=n(e,[0,0,0],[0,1.05,0]);for(let U of[-.74,.74]){o(z,[[1.1,1,U],[.18,1.53,U*.8],[-.86,1.55,U*.8],[-1.8,1.03,U]],.022,"100",{role:"metal"}),a(z,[-1.75,.65,U],[1.1,.65,U],.025,"100",{role:"metal"});for(let O of[-1.3,1])a(z,[O,.65,U],[O,.25,U*.93],.025,"100",{role:"metal"})}for(let U of[-.86,.18])a(z,[U,1.52,-.6],[U,1.52,.6],.02,"100",{role:"metal"});let G=n(e,[0,0,0],[0,.8,0]);G.userData.assemblyPart="121";let j=n(e,[-2,.78,0],[-.4,.75,0]);r(j,[.48,.17,.5],[0,0,0],"400",{role:"ceramic"});let X=n(e,[1.75,.62,0],[.4,.6,0]);r(X,[.45,.16,.6],[0,0,0],"210",{role:"metal"});for(let U=0;U<7;U++)r(X,[.035,.03,.54],[-.15+U*.05,.1,0],"210",{role:"metal"});for(let U of[-.8,.8]){let O=n(e,[-2,.74,U],[-.3,.4,U*.3]);r(O,[.54,.18,.1],[0,0,0],"500",{role:"metal"});for(let ee=0;ee<7;ee++)r(O,[.018,.17,.14],[-.23+ee*.075,0,0],"500",{role:"metal"})}u(S,[2.45,.82,.7],"101","SCULPTED BODY"),u(R,[-.12,1.68,.61],"102","SMOKED GLAZING"),u(H,[-1.3,0,.65],"200","ENERGY STORAGE",!0),u(D,[1.4,0,-.7],"110","LOW CHASSIS"),u(j,[-.2,.15,0],"400","CONTROL SYSTEM",!0),nd(i,{skin:S,canopy:R,pack:H,cabin:z,seats:G,power:X})}var to=class{parse(e,t={}){t=Object.assign({binary:!1},t);let n=t.binary,s=[],r=0;e.traverse(function(p){if(p.isMesh){let S=p.geometry,v=S.index,x=S.getAttribute("position");r+=v!==null?v.count/3:x.count/3,s.push({object3d:p,geometry:S})}});let a,o=80;if(n===!0){let p=r*2+r*3*4*4+80+4,S=new ArrayBuffer(p);a=new DataView(S),a.setUint32(o,r,!0),o+=4}else a="",a+=`solid exported
`;let l=new C,c=new C,h=new C,u=new C,d=new C,f=new C;for(let p=0,S=s.length;p<S;p++){let v=s[p].object3d,x=s[p].geometry,I=x.index,T=x.getAttribute("position");if(I!==null)for(let R=0;R<I.count;R+=3){let L=I.getX(R+0),E=I.getX(R+1),y=I.getX(R+2);g(L,E,y,T,v)}else for(let R=0;R<T.count;R+=3){let L=R+0,E=R+1,y=R+2;g(L,E,y,T,v)}}return n===!1&&(a+=`endsolid exported
`),a;function g(p,S,v,x,I){l.fromBufferAttribute(x,p),c.fromBufferAttribute(x,S),h.fromBufferAttribute(x,v),I.isSkinnedMesh===!0&&(I.applyBoneTransform(p,l),I.applyBoneTransform(S,c),I.applyBoneTransform(v,h)),l.applyMatrix4(I.matrixWorld),c.applyMatrix4(I.matrixWorld),h.applyMatrix4(I.matrixWorld),_(l,c,h),m(l),m(c),m(h),n===!0?(a.setUint16(o,0,!0),o+=2):(a+=`		endloop
`,a+=`	endfacet
`)}function _(p,S,v){u.subVectors(v,S),d.subVectors(p,S),u.cross(d).normalize(),f.copy(u).normalize(),n===!0?(a.setFloat32(o,f.x,!0),o+=4,a.setFloat32(o,f.y,!0),o+=4,a.setFloat32(o,f.z,!0),o+=4):(a+="	facet normal "+f.x+" "+f.y+" "+f.z+`
`,a+=`		outer loop
`)}function m(p){n===!0?(a.setFloat32(o,p.x,!0),o+=4,a.setFloat32(o,p.y,!0),o+=4,a.setFloat32(o,p.z,!0),o+=4):a+="			vertex "+p.x+" "+p.y+" "+p.z+`
`}}};var Le=i=>document.getElementById(i),Tn=i=>Number(i.toFixed(7)),Cr=i=>String(i).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),Ty={exterior:"Exterior / glazing / trim",chassis:"Chassis / mounts / suspension",cockpit:"Cockpit / seats / interior",power:"Battery / power electronics",engine:"Electric drive motors",fan:"Fans / ducts / road tires",cooling:"Cooling / plumbing",controls:"Controls / sensors"},no={exterior:["101","102","103","104","105","106","107","108"],chassis:["100","110","340","350","360"],cockpit:["120","121","122"],power:["200","210","211","212"],engine:["320","321","322"],fan:["300","310","330","331","342"],cooling:["500","501"],controls:["400"]},dd={BoxGeometry:"Prismatic feature",CylinderGeometry:"Cylinder / pin",SphereGeometry:"Sphere",TorusGeometry:"Ring / torus",ExtrudeGeometry:"Profile extrusion",TubeGeometry:"Swept tube",LatheGeometry:"Revolved profile",BufferGeometry:"Formed surface / faceted feature"},Ay={BoxGeometry:["width","height","depth"],CylinderGeometry:["radiusTop","radiusBottom","height"],SphereGeometry:["radius"],TorusGeometry:["radius","tube"],ExtrudeGeometry:["depth"],TubeGeometry:["radius"]};function hd(i){let e=i.userData.id,t=i.geometry.type,n=i.userData.role;if(e==="211"){if(t==="CylinderGeometry")return n==="copper"?"Cell terminal caps":"Individual cell housings";if(t==="BoxGeometry")return n==="copper"?"Interconnect links":"Board components"}return e==="321"?n==="copper"?"Copper winding loops / leads":"Lamination rings":e==="322"?t==="SphereGeometry"?"Individual rolling elements":"Bearing races":e==="330"&&t==="ExtrudeGeometry"?"Individual rotor blades":e==="331"&&t==="ExtrudeGeometry"?"Individual stationary vanes":e==="342"&&t==="CylinderGeometry"?"Individual flange fasteners":e==="106"&&t==="CylinderGeometry"?"Individual panel fasteners":e==="501"&&t==="BoxGeometry"?"Heat-exchanger fin / manifold features":e==="300"&&t==="BoxGeometry"?"Individual tire tread blocks":dd[t]||t.replace("Geometry","")}function ud(i){let e=i.parameters||{},t={type:i.type};for(let[n,s]of Object.entries(e))(typeof s=="number"||typeof s=="boolean")&&(t[n]=typeof s=="number"?Tn(s):s);if(["BufferGeometry","ExtrudeGeometry","LatheGeometry","TubeGeometry"].includes(i.type)){let n=i.attributes.position.array,s=0;for(let r=0;r<n.length;r+=Math.max(1,Math.floor(n.length/64)))s=Math.imul(s,31)+Math.round(n[r]*1e6)|0;t.hash=s,t.vertices=n.length}return JSON.stringify(t)}function io(i,e,t="application/octet-stream"){let n=URL.createObjectURL(new Blob([i],{type:t})),s=document.createElement("a");s.href=n,s.download=e,s.click(),setTimeout(()=>URL.revokeObjectURL(n),15e3)}function Ry(i){let e=i.parameters||{},t={type:i.type,parameters:{}};for(let[n,s]of Object.entries(e))["number","boolean"].includes(typeof s)&&(t.parameters[n]=s);if(i.type==="ExtrudeGeometry"){t.parameters={depth:e.options?.depth??e.depth??.018};let n=Array.isArray(e.shapes)?e.shapes:[e.shapes];t.profiles=n.filter(Boolean).map(s=>{let r=s.extractPoints(20);return{outline:r.shape.map(a=>[Tn(a.x),Tn(a.y)]),holes:r.holes.map(a=>a.map(o=>[Tn(o.x),Tn(o.y)]))}})}return i.type==="LatheGeometry"&&(t.profile=e.points.map(n=>[Tn(n.x),Tn(n.y)])),i.type==="TubeGeometry"&&(t.path=e.path.getPoints(Math.min(100,e.tubularSegments||32)).map(n=>n.toArray().map(Tn))),i.userData.cadGrid&&(t.grid=i.userData.cadGrid),i.userData.cadLocalTransform&&(t.localTransform=i.userData.cadLocalTransform),t.vertices=Array.from(i.attributes.position.array,Tn),t.triangles=i.index?Array.from(i.index.array):Array.from({length:i.attributes.position.count},(n,s)=>s),t}function Cy(i,e){let t=i.parameters;switch(i.type){case"BoxGeometry":return new Ct(e.width,e.height,e.depth);case"CylinderGeometry":return new Mt(e.radiusTop,e.radiusBottom,e.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength);case"SphereGeometry":return new oi(e.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength);case"TorusGeometry":return new on(e.radius,e.tube,t.radialSegments,t.tubularSegments,t.arc);case"ExtrudeGeometry":{let n=new ai(t.shapes,{...t.options,depth:e.depth});return i.userData.cadLocalTransform&&(n.applyMatrix4(new Ke().fromArray(i.userData.cadLocalTransform)),n.userData.cadLocalTransform=i.userData.cadLocalTransform),n}case"TubeGeometry":return new Hs(t.path,t.tubularSegments,e.radius,t.radialSegments,t.closed);default:return null}}function Py(i){let e=i.parameters||{};return i.type==="SphereGeometry"?new oi(e.radius,48,32):i.type==="CylinderGeometry"&&e.radialSegments>=12?new Mt(e.radiusTop,e.radiusBottom,e.height,64,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength):i.type==="TorusGeometry"&&e.tubularSegments>=12?new on(e.radius,e.tube,24,96,e.arc):null}var so=class{constructor(e){this.api=e,this.active=!1,this.root=new mt,this.root.name="CAD isolated part workspace",this.root.visible=!1,e.scene.add(this.root),this.sessions=new Map,this.nodes=new Map,this.leaves=[],this.page=0,this.query="",this.separate=!1,this.renderRecords=[],this.current="vehicle",Le("cad-toggle").onclick=()=>this.active?this.exit():this.enter(),Le("cad-close").onclick=()=>this.exit(),Le("cad-up").onclick=()=>this.navigate(this.nodes.get(this.current)?.parent||"vehicle"),Le("cad-root").onclick=()=>this.navigate("vehicle"),Le("cad-explode").onclick=()=>{this.separate=!this.separate,this.draw(),this.renderPanel()},Le("cad-child-list").onclick=t=>{let n=t.target.closest("[data-cad-node]");n&&this.navigate(n.dataset.cadNode)},Le("cad-crumbs").onclick=t=>{let n=t.target.closest("[data-cad-node]");n&&this.navigate(n.dataset.cadNode)},Le("cad-search").oninput=t=>{this.query=t.target.value.toLowerCase(),this.page=0,this.renderChildren()},Le("cad-prev").onclick=()=>{this.page=Math.max(0,this.page-1),this.renderChildren()},Le("cad-next").onclick=()=>{this.page++,this.renderChildren()},Le("cad-edit-form").onsubmit=t=>{t.preventDefault(),this.applyEdit()},Le("cad-reset-leaf").onclick=()=>{let t=this.nodes.get(this.current);t?.kind==="leaf"&&(this.edits.get(t.key)?.geometry?.dispose(),this.edits.delete(t.key),this.draw(),this.renderPanel())},Le("cad-export-json").onclick=()=>this.exportJSON(),Le("cad-export-native").onclick=()=>this.exportNative(),Le("cad-export-stl").onclick=()=>this.exportSTL(),Le("cad-export-bom").onclick=()=>this.exportBOM()}reindex(){this.active&&this.exit();let e=this.api,t=e.designKey();this.key=t,this.sessions.has(t)||this.sessions.set(t,new Map),this.edits=this.sessions.get(t),this.nodes=new Map,this.leaves=[];let n={key:"vehicle",kind:"root",name:`${t} / vehicle assembly`,parent:null,children:[],leaves:[]};this.nodes.set(n.key,n);let s={};for(let[o,l]of Object.entries(Ty)){let c={key:`zone:${o}`,kind:"zone",name:l,parent:"vehicle",children:[],leaves:[]};this.nodes.set(c.key,c),s[o]=c,n.children.push(c.key)}e.vehicle().updateMatrixWorld(!0);let r=0,a=new Map;for(let o of e.meshes()){let l=o,c=!1,h=!1,u="Vehicle body";for(;l;)l===e.vehicle()&&(c=!0),l.userData.cadAnnotation&&(h=!0),l.userData.cadLabel&&(u=l.userData.cadLabel),l=l.parent;if(!c||h)continue;let d=r++,f=o.userData.id,g=Object.keys(no).find(v=>no[v].includes(f))||"controls",_=`assembly:${f}`,m=this.nodes.get(_);m||(m={key:_,kind:"assembly",name:e.part(f)?.name||`Assembly ${f}`,part:f,parent:s[g].key,children:[],leaves:[]},this.nodes.set(_,m),s[g].children.push(_));let p=`${_}:${o.userData.role}:${ud(o.geometry)}`,S=a.get(p);S||(S={key:`feature:${a.size}`,kind:"feature",name:hd(o),part:f,parent:_,children:[],leaves:[],geometryType:o.geometry.type},a.set(p,S),this.nodes.set(S.key,S),m.children.push(S.key));for(let v=0;v<(o.isInstancedMesh?o.count:1);v++){let x=o.matrixWorld.clone();if(o.isInstancedMesh){let T=new Ke;o.getMatrixAt(v,T),x.multiply(T)}let I={key:`part:${d}:${v}`,kind:"leaf",part:f,parent:S.key,source:o,instance:o.isInstancedMesh?v:null,geometry:o.geometry,matrix:x,name:`${hd(o)} \xB7 ${String(S.children.length+1).padStart(3,"0")}`,location:u,children:[],leaves:[]};I.leaves=[I.key],S.children.push(I.key),this.nodes.set(I.key,I),this.leaves.push(I);for(let T of[S,m,s[g],n])T.leaves.push(I.key)}}n.children=n.children.filter(o=>this.nodes.get(o).leaves.length),this.current="vehicle",Le("cad-count").textContent=`${this.leaves.length.toLocaleString()} individual modeled items`}enter(){this.api.state.process&&this.api.closeProcess(),this.api.state.explode=0,this.api.openParts.clear(),this.api.resetSeparation(),this.api.updateGeometry(!0),this.reindex(),this.active=!0,this.root.visible=!0,Le("cad-panel").hidden=!1,Le("cad-toggle").setAttribute("aria-pressed","true"),document.body.classList.add("cad-active"),this.disabledControls=[...document.querySelectorAll('.action-toolbar button,.configuration-tray button,.configuration-tray input,.view-toolbar [data-view="module"]')].map(e=>[e,e.disabled]),this.disabledControls.forEach(([e])=>{e.disabled=!0}),this.api.setView("iso"),this.navigate("vehicle"),Le("geometry-status").textContent=`${this.leaves.length.toLocaleString()} CAD ITEMS / ${this.key}`}exit(){this.active=!1,this.root.visible=!1,Le("cad-panel").hidden=!0,Le("cad-toggle").setAttribute("aria-pressed","false"),document.body.classList.remove("cad-active"),this.disabledControls?.forEach(([e,t])=>{e.disabled=t}),this.api.updateGeometry(!0),this.api.setView("iso"),this.api.refresh(),Le("geometry-status").textContent=`${this.api.geometryCount().toLocaleString()} MODELED ELEMENTS / ${this.api.state.model} \xB7 ${this.api.state.variant}`}navigate(e){let t=this.nodes.get(e);t&&(this.current=e,this.page=0,this.query="",Le("cad-search").value="",this.separate=!1,t.part&&(this.api.state.selected=t.part,this.api.selection()),this.draw(),this.renderPanel())}effective(e){let t=this.edits.get(e.key);return{geometry:t?.geometry||e.geometry,matrix:e.matrix.clone().multiply(new Ke().makeScale(...t?.scale||[1,1,1]))}}clearDraw(){for(let e of[...this.root.children])this.root.remove(e),(e.userData.cadEdges||e.userData.generatedGeometry)&&e.geometry.dispose(),e.material&&e.material.dispose(),e.isInstancedMesh&&e.dispose()}draw(){this.clearDraw();let e=this.nodes.get(this.current);if(!e)return;let t=e.leaves.map(a=>this.nodes.get(a)),n=new Map,s=new Gt;if(this.separate&&e.children.length>1){let a=e.children.map(u=>this.nodes.get(u)),o=0,l=[];for(let u of a){let d=new Gt;for(let g of u.leaves){let _=this.nodes.get(g),m=this.effective(_);m.geometry.computeBoundingBox(),d.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix))}let f=d.getSize(new C);o=Math.max(o,f.length()),l.push(d.getCenter(new C))}let c=Math.ceil(Math.sqrt(a.length)),h=Math.max(o*1.15,.035);a.forEach((u,d)=>{let g=new C((d%c-(c-1)/2)*h,0,(Math.floor(d/c)-(Math.ceil(a.length/c)-1)/2)*h).sub(l[d]);for(let _ of u.leaves)n.set(_,g)})}let r=new Map;this.renderRecords=[];for(let a of t){let o=this.effective(a),l=o.matrix;n.has(a.key)&&l.setPosition(new C().setFromMatrixPosition(l).add(n.get(a.key)));let c=`${a.source.uuid}:${o.geometry.uuid}`;r.has(c)||r.set(c,{geometry:o.geometry,source:a.source,items:[]}),r.get(c).items.push({leaf:a,matrix:l}),this.renderRecords.push({leaf:a,matrix:l,geometry:o.geometry})}for(let a of r.values()){let o=e.kind==="leaf"?Py(a.geometry):null;o&&(a.geometry=o);let l=this.api.material(a.source),c=a.items.length>1?new zs(a.geometry,l,a.items.length):new je(a.geometry,l);if(o&&(c.userData.generatedGeometry=!0),c.isInstancedMesh?(a.items.forEach((h,u)=>c.setMatrixAt(u,h.matrix)),c.instanceMatrix.needsUpdate=!0,c.computeBoundingSphere()):(c.matrixAutoUpdate=!1,c.matrix.copy(a.items[0].matrix)),c.userData.cadKeys=a.items.map(h=>h.leaf.key),this.root.add(c),e.kind==="leaf"){let h=new Ei(new Yi(a.geometry,25),new an({color:7921897,transparent:!0,opacity:.6}));h.matrixAutoUpdate=!1,h.matrix.copy(a.items[0].matrix),h.userData.cadEdges=!0,this.root.add(h)}}this.api.updateGeometry(!0),this.frame(),this.api.wake()}frame(){if(!this.active)return;this.root.updateMatrixWorld(!0);let e=new Gt().setFromObject(this.root);e.isEmpty()||this.api.frameBounds(e)}pick(e){let t=e.intersectObjects(this.root.children,!1).find(n=>n.object.isMesh);if(t){let n=t.object.userData.cadKeys?.[t.instanceId??0];if(n)return this.navigate(n),!0}return!1}renderPanel(){let e=this.nodes.get(this.current);if(!e)return;let t=[],n=e;for(;n;)t.unshift(n),n=this.nodes.get(n.parent);let s=t.find(r=>r.kind==="zone")?.key.replace("zone:","")||"overview";if(document.querySelectorAll("[data-zone]").forEach(r=>{r.classList.toggle("active",r.dataset.zone===s),r.setAttribute("aria-pressed",String(r.dataset.zone===s))}),Le("detail-focus").value=s,Le("zone-description").textContent="PART CAD / Pick a zone or drill down through the hierarchy. Click any rendered item to isolate its basic geometry.",Le("cad-crumbs").innerHTML=t.map(r=>`<button data-cad-node="${r.key}" ${r===e?'aria-current="location"':""}>${Cr(r.kind==="root"?"Vehicle":r.name)}</button>`).join("<span>/</span>"),Le("cad-title").textContent=e.name,Le("cad-level").textContent=e.kind==="leaf"?"BASIC MODELED ITEM":`${e.kind.toUpperCase()} / ${e.leaves.length.toLocaleString()} ITEMS`,Le("cad-up").disabled=!e.parent,Le("cad-explode").disabled=e.children.length<2,Le("cad-explode").textContent=this.separate?"Reassemble children":"Separate children",Le("cad-explode").setAttribute("aria-pressed",String(this.separate)),Le("cad-edit-form").hidden=e.kind!=="leaf",Le("cad-terminal").hidden=e.kind!=="leaf",Le("cad-branch-note").hidden=e.kind==="leaf",e.kind==="leaf"){let{geometry:r,matrix:a}=this.effective(e),o=Ay[r.type],l=r.parameters||{},c=this.edits.get(e.key),h=c?.scale||[1,1,1],u=r.type==="ExtrudeGeometry"?{depth:l.options?.depth??.018}:l;Le("cad-primitive").textContent=`${dd[r.type]||r.type} / ${e.location}`,Le("cad-inputs").innerHTML=o?o.map(_=>`<label>${Cr(_)}<input name="${_}" type="number" step="any" min="0.000001" max="1000" required value="${Tn(u[_])}"></label>`).join(""):["X","Y","Z"].map((_,m)=>`<label>feature scale ${_}<input name="scale${_}" type="number" step="any" min="0.001" max="100" required value="${h[m]}"></label>`).join(""),r.computeBoundingBox();let d=r.boundingBox.clone().applyMatrix4(a),f=d.getSize(new C),g=!!o&&!["TubeGeometry","ExtrudeGeometry"].includes(r.type);Le("cad-geometry-info").innerHTML=`<dl><dt>Geometry basis</dt><dd>${g?"Analytic primitive":r.type==="ExtrudeGeometry"?"Editable profile extrusion":r.type==="TubeGeometry"?"Editable swept tube":"Faceted / formed surface feature"}</dd><dt>World bounds \xB7 model units</dt><dd>${f.toArray().map(_=>_.toFixed(5)).join(" \xD7 ")}</dd><dt>Mesh topology</dt><dd>${(r.index?r.index.count:r.attributes.position.count)/3} triangles / ${r.attributes.position.count} stored vertices</dd><dt>Material appearance</dt><dd>${Cr(e.source.userData.role)}</dd><dt>Feature ID</dt><dd>${e.key}</dd></dl>`}this.renderChildren(),this.api.status(`${e.kind==="leaf"?"BASIC ITEM":e.kind.toUpperCase()} / ${e.name}`)}renderChildren(){let e=this.nodes.get(this.current),t=e.children.map(r=>this.nodes.get(r));this.query&&(t=t.filter(r=>`${r.name} ${r.part||""} ${r.key} ${r.location||""}`.toLowerCase().includes(this.query)));let n=40,s=Math.max(1,Math.ceil(t.length/n));this.page=Math.min(this.page,s-1),Le("cad-child-list").innerHTML=t.slice(this.page*n,(this.page+1)*n).map(r=>`<button data-cad-node="${r.key}"><span>${Cr(r.name)}</span><small>${r.kind==="leaf"?Cr(r.location):`${r.leaves.length.toLocaleString()} items / ${r.children.length} children`}</small><b>${r.kind==="leaf"?"\u25CB":"\u203A"}</b></button>`).join("")||`<p class="cad-empty">${e.kind==="leaf"?"Lowest modeled component. Use the geometry editor below.":"No matching children."}</p>`,Le("cad-pages").textContent=`${t.length?this.page+1:0} / ${s}`,Le("cad-prev").disabled=this.page===0,Le("cad-next").disabled=this.page>=s-1,Le("cad-search").hidden=e.kind==="leaf",Le("cad-pagination").hidden=e.kind==="leaf"}applyEdit(){let e=this.nodes.get(this.current);if(e.kind!=="leaf")return;let t=new FormData(Le("cad-edit-form")),n=Object.fromEntries([...t].map(([a,o])=>[a,Number(o)]));if(Object.values(n).some(a=>!Number.isFinite(a)||a<=0||a>1e3)){this.api.status("Use positive finite feature dimensions, at most 1000 model units.");return}let s=this.edits.get(e.key),r=Cy(e.geometry,n);s?.geometry?.dispose(),this.edits.set(e.key,r?{geometry:r}:{scale:["X","Y","Z"].map(a=>n[`scale${a}`])}),this.draw(),this.renderPanel(),Le("cad-export-status").textContent="Session edit applied to this individual item only. CAD / JSON / STL exports include it; baseline STEP does not."}data(e=this.current){let t=this.nodes.get(e)||this.nodes.get("vehicle"),n={},s=[];for(let r of t.leaves){let a=this.nodes.get(r),{geometry:o,matrix:l}=this.effective(a),c=ud(o),h=Object.keys(n).find(u=>n[u]._sig===c);h||(h=`g${Object.keys(n).length}`,n[h]={...Ry(o),_sig:c}),s.push({id:r,name:a.name,assembly:a.part,assemblyName:this.api.part(a.part)?.name,zone:Object.keys(no).find(u=>no[u].includes(a.part))||"controls",location:a.location,material:a.source.userData.role,geometry:h,matrix:l.toArray().map(Tn)})}for(let r of Object.values(n))delete r._sig;return{format:"Joukowsky Dynamics Concept CAD 1",design:this.key,scope:t.name,units:"Normalized model units; mm scale below is an editable design assumption, not measured dimensions.",mmPerModelUnit:Number(Le("cad-unit-scale").value)||1e3,status:"Concept geometry only. No tolerances, fits, verified materials, loads or flight qualification. Curved freeform panels may be open / faceted CAD surfaces, not watertight production solids.",geometries:n,items:s}}exportJSON(){io(JSON.stringify(this.data(),null,2),`Joukowsky-Dynamics-${this.current.replaceAll(":","-")}.cad.json`,"application/json"),Le("cad-export-status").textContent="Exported current branch, with individual IDs, geometry parameters, placements and session edits."}exportBOM(){let e=this.data(),t=[["item_id","name","assembly","zone","location","geometry","material_appearance","status"],...e.items.map(n=>[n.id,n.name,n.assemblyName,n.zone,n.location,e.geometries[n.geometry].type,n.material,"CONCEPT / UNSPECIFIED"])];io(t.map(n=>n.map(s=>`"${String(s).replaceAll('"','""')}"`).join(",")).join(`\r
`),"Joukowsky-Dynamics-individual-parts.csv","text/csv")}exportSTL(){let e=new mt;for(let s of this.nodes.get(this.current).leaves){let r=this.nodes.get(s),a=this.effective(r),o=new je(a.geometry);o.matrixAutoUpdate=!1,o.matrix.copy(a.matrix),e.add(o)}e.updateMatrixWorld(!0);let t=Number(Le("cad-unit-scale").value)||1e3;e.scale.setScalar(t),e.updateMatrixWorld(!0);let n=new to().parse(e,{binary:!0});io(n,"Joukowsky-Dynamics-concept-selection.stl"),Le("cad-export-status").textContent="STL is a triangulated surface export. Open sheets remain open; not automatically printable or manufacturing-ready."}exportNative(){let e=this.data(),t=JSON.stringify(e),r=`# Joukowsky Dynamics concept CAD reconstruction macro for FreeCAD.
# Run with Macro > Macros. Exports include current branch and session edits.
# Model units are not verified dimensions. Default conversion is an explicit design assumption.
# Primitive features are native editable CAD objects. General surfaces retain faceted faces.
import FreeCAD as App, Part, json, math
from FreeCAD import Vector
D=json.loads(${JSON.stringify(t)})
doc=App.newDocument("Joukowsky_Dynamics_Concept")
root=doc.addObject("App::Part","ConceptAssembly")
root.Label=D["scope"]
root.addProperty("App::PropertyString","DesignStatus"); root.DesignStatus=D["status"]
root.addProperty("App::PropertyFloat","MmPerModelUnit"); root.MmPerModelUnit=D["mmPerModelUnit"]
S=D["mmPerModelUnit"]
def wire(points):
 p=[Vector(x*S,y*S,0) for x,y in points]
 if (p[0]-p[-1]).Length>1e-8:p.append(p[0])
 return Part.makePolygon(p)
def mesh_shape(g):
 vs=[Vector(*[q*S for q in g["vertices"][j:j+3]]) for j in range(0,len(g["vertices"]),3)]
 faces=[]; t=g["triangles"]
 for j in range(0,len(t),3):
  a,b,c=[vs[k] for k in t[j:j+3]]
  if (b-a).cross(c-a).Length>1e-10:
   try:faces.append(Part.Face(Part.makePolygon([a,b,c,a])))
   except Exception:pass
 if not faces:raise ValueError("No usable faces")
 try:
  sh=Part.makeShell(faces)
  if sh.isClosed():return Part.makeSolid(sh)
  return sh
 except Exception:return Part.makeCompound(faces)
def shape(g):
 p=g["parameters"]; t=g["type"]
 if t=="BoxGeometry":return Part.makeBox(p["width"]*S,p["height"]*S,p["depth"]*S,Vector(-p["width"]*S/2,-p["height"]*S/2,-p["depth"]*S/2))
 if t=="CylinderGeometry" and not p.get("openEnded",False):return Part.makeCone(p["radiusBottom"]*S,p["radiusTop"]*S,p["height"]*S,Vector(0,-p["height"]*S/2,0),Vector(0,1,0)) if abs(p["radiusTop"]-p["radiusBottom"])>1e-9 else Part.makeCylinder(p["radiusTop"]*S,p["height"]*S,Vector(0,-p["height"]*S/2,0),Vector(0,1,0))
 if t=="SphereGeometry":return Part.makeSphere(p["radius"]*S)
 if t=="TorusGeometry":return Part.makeTorus(p["radius"]*S,p["tube"]*S)
 if t=="ExtrudeGeometry":
  solids=[]
  for profile in g["profiles"]:
   face=Part.Face(wire(profile["outline"]))
   for hole in profile["holes"]:face=face.cut(Part.Face(wire(hole)))
   solids.append(face.extrude(Vector(0,0,p["depth"]*S)))
  return Part.makeCompound(solids) if len(solids)>1 else solids[0]
 return mesh_shape(g)
cache={}; groups={}
for i,item in enumerate(D["items"]):
 groupkey=item["zone"]+"_"+item["assembly"]
 if groupkey not in groups:
  group=doc.addObject("App::Part","Assembly_"+groupkey);group.Label=item["assemblyName"];root.addObject(group);groups[groupkey]=group
 g=D["geometries"][item["geometry"]];p=g["parameters"];t=g["type"];m=item["matrix"]
 M=App.Matrix();M.A11,M.A12,M.A13,M.A14=m[0],m[4],m[8],m[12]*S;M.A21,M.A22,M.A23,M.A24=m[1],m[5],m[9],m[13]*S;M.A31,M.A32,M.A33,M.A34=m[2],m[6],m[10],m[14]*S
 sx=Vector(m[0],m[1],m[2]).Length;sy=Vector(m[4],m[5],m[6]).Length;sz=Vector(m[8],m[9],m[10]).Length
 R=App.Matrix();R.A11,R.A21,R.A31=m[0]/sx,m[1]/sx,m[2]/sx;R.A12,R.A22,R.A32=m[4]/sy,m[5]/sy,m[6]/sy;R.A13,R.A23,R.A33=m[8]/sz,m[9]/sz,m[10]/sz
 rot=App.Rotation(R);pos=Vector(m[12]*S,m[13]*S,m[14]*S)
 uniform=abs(sx-sy)<1e-6 and abs(sx-sz)<1e-6
 if t=="BoxGeometry":
  obj=doc.addObject("Part::Box","BasicPart");obj.Length=p["width"]*S*sx;obj.Width=p["height"]*S*sy;obj.Height=p["depth"]*S*sz;obj.Placement=App.Placement(pos+rot.multVec(Vector(-obj.Length/2,-obj.Width/2,-obj.Height/2)),rot)
 elif t=="CylinderGeometry" and not p.get("openEnded",False) and abs(sx-sz)<1e-6 and abs(p["radiusTop"]-p["radiusBottom"])<1e-9:
  obj=doc.addObject("Part::Cylinder","BasicPart");obj.Radius=p["radiusTop"]*S*sx;obj.Height=p["height"]*S*sy;obj.Placement=App.Placement(pos+rot.multVec(Vector(0,-obj.Height/2,0)),rot.multiply(App.Rotation(Vector(1,0,0),-90)))
 elif t=="SphereGeometry" and uniform:
  obj=doc.addObject("Part::Sphere","BasicPart");obj.Radius=p["radius"]*S*sx;obj.Placement=App.Placement(pos,rot)
 elif t=="TorusGeometry" and uniform:
  obj=doc.addObject("Part::Torus","BasicPart");obj.Radius1=p["radius"]*S*sx;obj.Radius2=p["tube"]*S*sx;obj.Placement=App.Placement(pos,rot)
 else:
  if item["geometry"] not in cache:cache[item["geometry"]]=shape(g)
  obj=doc.addObject("Part::Feature","CADFeature");obj.Shape=cache[item["geometry"]].copy().transformGeometry(M)
 obj.Label=item["name"];groups[groupkey].addObject(obj)
 for key,value in [("ItemID",item["id"]),("MaterialStudy",item["material"]),("GeometryBasis",t),("LocationStudy",item["location"])]:
  obj.addProperty("App::PropertyString",key);setattr(obj,key,value)
 if i%200==0:App.Console.PrintMessage("Joukowsky Dynamics: "+str(i)+" / "+str(len(D["items"]))+" items\\\\n")
doc.recompute()
Gui.activeDocument().activeView().viewAxonometric();Gui.activeDocument().activeView().fitAll()
App.Console.PrintMessage("Concept CAD loaded. Save as FCStd. Use File > Export for STEP; inspect open surfaces first.\\\\n")
`.replaceAll('if t=="CylinderGeometry" and not p.get("openEnded",False):','if t=="CylinderGeometry" and not p.get("openEnded",False) and p.get("radialSegments",32)>=12:').replaceAll('if t=="TorusGeometry":','if t=="TorusGeometry" and p.get("tubularSegments",48)>=12:').replaceAll('and abs(p["radiusTop"]-p["radiusBottom"])<1e-9:','and abs(p["radiusTop"]-p["radiusBottom"])<1e-9 and p.get("radialSegments",32)>=12:').replaceAll('elif t=="TorusGeometry" and uniform:','elif t=="TorusGeometry" and uniform and p.get("tubularSegments",48)>=12:').replace("cache={}; groups={}",`def local_shape(g):
 sh=shape(g)
 if g["type"]=="ExtrudeGeometry" and g.get("localTransform"):
  v=g["localTransform"]; T=App.Matrix();T.A11,T.A12,T.A13,T.A14=v[0],v[4],v[8],v[12]*S;T.A21,T.A22,T.A23,T.A24=v[1],v[5],v[9],v[13]*S;T.A31,T.A32,T.A33,T.A34=v[2],v[6],v[10],v[14]*S
  sh=sh.transformGeometry(T)
 return sh
cache={}; groups={}`).replace('cache[item["geometry"]]=shape(g)','cache[item["geometry"]]=local_shape(g)');io(r,"Joukowsky-Dynamics-editable-concept.FCMacro","text/x-python"),Le("cad-export-status").textContent="FreeCAD macro downloaded. Run it in FreeCAD to create native editable primitive features and placed faceted surface features; save FCStd or export STEP. No production specifications are implied."}debug(){return{active:this.active,node:this.current,kind:this.nodes.get(this.current)?.kind,items:this.nodes.get(this.current)?.leaves.length,totalItems:this.leaves.length,children:this.nodes.get(this.current)?.children.length,separate:this.separate,editedItems:this.edits?.size||0}}};var te=i=>document.getElementById(i),gt={cyan:6937575,dim:2645872,white:12117741,amber:15908471,dark:1059897},A={model:"A",variant:"A1",mode:"road",view:"iso",explode:0,selected:"101",wire:!1,callouts:!1,airflow:!1,routes:!1,loads:!1,section:!1,rotate:!1,tab:"model",clickExplode:!0,process:!1,processStep:0,processPlay:!1,demoSpeed:.5,surface:!0,aero:!1,scan:!1,presentation:"studio",paint:"carmine"},Et=new Set,Iy={A:[["A1","A1 / Coaxial inner fan","Tire circumference and coaxial fan cavity. Whole-module lift pivot is an illustrative assumption."],["A2","A2 / Shared carrier","Independent road wheel and inboard fan share a carrier. Packaging and lift pivot remain illustrative."],["A3","A3 / Reconfigurable blades","Illustrative blade stow / deploy package. Actuation, locks and safe load paths are unresolved."]],B:[["B1","B1 / Fixed lift fans","Four body-integrated vertical-lift fans. Forward-flight strategy remains unresolved."],["B2","B2 / Tilting fan pods","Body-integrated lift / forward pods with illustrative pivots, locks and position sensing."],["B3","B3 / Lift + cruise baseline","Illustrative four lift fans and separate aft cruise fan. Not a strictly integrated-fan solution."]]},ho=[{id:"101",name:"Sculpted sports-car body",short:"Sculpted body",desc:"A low hood, smooth shoulder surfaces, integrated wheel pockets and a fastback cabin replace the raised, faceted body.",details:["Broad front fascia and truncated rear remain visibly automotive, not boat-shaped.","Sculpted fender crests and a narrow waist form a continuous sports-car exterior.","Clear-coated paint is visualized over a candidate composite substrate."],risk:"Styling and packaging hypotheses, not CFD results. Cooling, fan deployment and structural material selection remain unresolved.",source:"Revision 04 / sports-car styling study"},{id:"102",name:"Smoked fastback glazing",short:"Smoked glazing",desc:"A low, raked windshield blends into a curved fastback roof and rear glass, with separate dark side glazing.",details:["The chassis, seating and cabin are lowered together in this concept model.","Painted rails and a carbon-look roof spine define distinct finishes.","Glazing substrate, optical quality, impact performance and egress remain unresolved."],risk:"The tint and finish are visualization choices, not an approved glazing specification.",source:"Revision 04 / appearance study"},{id:"104",name:"Carbon-fiber exterior details",short:"Carbon aero trim",desc:"A satin-weave splitter, sills, intake surrounds and rear diffuser finish the sports-car exterior.",details:["Procedural twill texture communicates exposed carbon-fiber appearance.","No ply count, resin system, laminate thickness or aero load is specified.","Splitter / diffuser / rear lip shapes have no claimed downforce result."],risk:"Road strike, fragment containment, environmental aging, joining and repair requirements remain open.",source:"Revision 04 / candidate material appearance"},{id:"103",name:"Painted fan nacelles",short:"Fan nacelles",desc:"Rounded annular duct lips and compact mounting fairings are separate from the newly integrated body wheel pockets.",details:["The nacelle lip shares the selected body paint in the studio view.","Fan passages remain open; no surface treatment is claimed to prove containment.","Open the nacelle to inspect the duct and shared carrier."],risk:"Road / fan clearance, body interference and the illustrative outboard lift pose require engineering resolution.",source:"Revision 04 / appearance and packaging study"},{id:"100",name:"Passenger safety cell",short:"Safety cell",desc:"Central load-bearing occupant enclosure and protective separation from propulsion and energy storage.",details:["Frame hard points transfer occupant and module loads.","Restraint anchorage, access and emergency egress.","Crash-energy and fire / thermal barriers are required."],risk:"Occupancy, crash loads, structural sections and fire-barrier performance remain TBD.",source:"\xA7\xA73.3, 4.3"},{id:"110",name:"Primary structure & keel",short:"Chassis / keel",desc:"Load-bearing chassis or structural keel carrying fan thrust, road or landing loads, and the passenger cell.",details:["Longitudinal rails, transverse ribs and module hard points.","Common geometry underlies all orthographic views.","Section sizes, fasteners and joints are illustrative."],risk:"Complete fatigue, landing, maneuver and road-impact load cases before sizing.",source:"\xA7\xA73.3, 4.3, 6"},{id:"200",name:"Energy storage & BMS",short:"Energy storage",desc:"Protected energy-storage packaging beneath the occupant cell, with mode-aware reserve management.",details:["Illustrative modular cell / pack trays and busbars.","Energy reserve is distinct for road and flight modes.","Crash protection, isolation and thermal propagation barriers."],risk:"Capacity, chemistry, mass, discharge rate and range are intentionally unspecified.",source:"\xA7\xA73.3, 4.3, 5\u20136"},{id:"210",name:"Distribution & inverters",short:"Power electronics",desc:"Protected power distribution feeds individual inverter / motor branches for the propulsion modules.",details:["Distribution enclosure and per-module inverter packages.","Independent inhibit / contactor and service lockout strategy.","Routes are functional illustrations, not a wiring plan."],risk:"Voltages, conductor sizes, grounding, protection and fault isolation require electrical design.",source:"\xA7\xA73.5, 5"},{id:"300",name:"Road tire & shared carrier",short:"Wheel / carrier",desc:"Road-contact tire and bearing / carrier assembly associated with a distinct fan propulsion unit.",details:["A1: fan is coaxial within the tire envelope.","A2: independent rotating elements share a carrier.","Road braking and tire integrity must survive propulsion faults."],risk:"Tire / fan clearances, lift pivot, wheel loads and airflow obstruction are unresolved.",source:"\xA7\xA73.1\u20133.3"},{id:"310",name:"Duct & protective structure",short:"Duct / guards",desc:"A shroud defines the fan flow passage; inlet guards, stator supports and inspection interfaces are shown.",details:["Inlet lip, duct barrel and outlet lip.","Illustrative guard grid, stator struts and duct ribs.","Containment effectiveness is not established by the shroud."],risk:"Analyze interference, inlet distortion, ingestion, noise and rotor fragment trajectories.",source:"\xA7\xA73.3, 3.6, 4.3"},{id:"320",name:"Motor, bearings & hub",short:"Motor / bearings",desc:"Electric motor and hub assembly drive a rotor independently of the road-contact member in the A1 / A2 study.",details:["Motor envelope, shaft, hub and bearing seats.","Qualitative inverter and cooling interfaces.","Serviceable mount and telemetry pickup locations."],risk:"Torque / speed envelope, thermal limits, bearing life and fault isolation are TBD.",source:"\xA7\xA73.3, 4.3, 5"},{id:"330",name:"Rotor & flow conditioning",short:"Fan rotor",desc:"Illustrative multi-blade rotor, spinner and downstream stationary support / flow-conditioning elements.",details:["Blade count, profile, pitch and chord are visual assumptions.","Rotor remains separate from road tire.","Airflow arrows indicate direction only, not simulated flow."],risk:"Thrust, power, rotor stress, critical speed, clearance and acoustic analysis required.",source:"\xA7\xA73.3, 4.3, 6"},{id:"331",name:"Stationary outlet guide vanes",short:"Stator / guide vanes",desc:"Stationary supports and illustrative cambered outlet guide vanes downstream of the rotor.",details:["The stator does not spin with the rotor.","A shaped guide-vane arrangement is a candidate for reducing residual swirl.","Vane count, camber and spacing are illustrative, not optimized."],risk:"Turning, blockage, structural and acoustic tradeoffs require fan-stage analysis and testing.",source:"\xA7\xA73.3, 4.3 / Revision 02 detail"},{id:"340",name:"Pivot, actuator & locks",short:"Configuration joints",desc:"An illustrative trunnion, actuator and positive-lock / position-sensing package for geometry changes.",details:["A: whole-module reorientation is an added study assumption.","B2: fan-tilt mechanism is a disclosed candidate.","Independent lock confirmation precedes any propulsion arm command."],risk:"Rate bearings and locks; analyze jams, asymmetric orientation and position-sensor disagreement.",source:"\xA7\xA73.3\u20133.4, 4.2\u20134.3"},{id:"350",name:"Suspension & road brakes",short:"Suspension / brakes",desc:"Road-mode support arms, coil / damper envelopes and independent friction-brake interface.",details:["Illustrative double support arms and damper geometry.","Separate road braking does not depend on fan control.","Regeneration, if adopted, remains supplemental."],risk:"Wheel travel, steering, bump / braking loads and rotor / suspension clearances need validation.",source:"\xA7\xA73.3, 3.6"},{id:"360",name:"Skid landing interface",short:"Landing skids",desc:"A non-wheeled landing interface supports Embodiment B and protects the battery, occupants and fan flow passages.",details:["Two longitudinal skid rails and frame attachments shown.","Landing loads transfer into the primary keel.","No road wheels are installed in Embodiment B."],risk:"Ground clearance, energy absorption, landing load distribution and tip-over stability remain open.",source:"\xA7\xA74.1, 4.3"},{id:"400",name:"Sensors & flight controls",short:"Control / sensing",desc:"Supervisory vehicle control, flight-control functions and independently monitored state / configuration feedback.",details:["IMU, position / height sensors and motor telemetry.","Separate estimation, control, allocation and monitoring.","Hard-backed inhibit path; interface status alone is insufficient."],risk:"Validate control authority and degraded responses. Three-fan controllability is not assumed.",source:"\xA7\xA73.4\u20133.5, 4.4, 5"},{id:"500",name:"Cooling & thermal barriers",short:"Thermal system",desc:"Illustrative battery, inverter and motor coolant routes, heat exchangers and protected thermal interfaces.",details:["Shared heat-rejection packaging is a study assumption.","Cooling must account for all operating phases.","Energy and thermal limits constrain flight readiness."],risk:"Hover / climb hot-day loads, coolant architecture and thermal propagation require analysis.",source:"\xA7\xA73.3, 3.6, 4.3, 6"}];ho.push(...zc);A.focus="overview";A.zoneIsolate=!0;var Rn={overview:{name:"Full vehicle"},engine:{name:"Engine / electric motor",ids:["320","321","322"],selected:"320",detail:!0,copy:"Electric motor, shaft, windings and bearings. This concept uses electrically driven fans, not a combustion engine."},fan:{name:"Fan / propulsion module",ids:["103","300","310","320","321","322","330","331","340","342","350","400"],selected:"330",detail:!0,copy:"One enlarged fan module, including its rotor, duct, drive motor and service hardware."},cockpit:{name:"Cockpit",ids:["120","121","122"],selected:"120",copy:"Displays, controls, seats, restraints and interior fittings. Displays are non-operational design studies."},power:{name:"Battery / power",ids:["200","210","211","212"],selected:"211",copy:"Cell envelopes, monitoring boards, power junction and candidate interconnects. Not a construction or wiring specification."},cooling:{name:"Cooling system",ids:["500","501"],selected:"501",copy:"Heat exchangers, fins, hoses, manifolds, clamps and reservoir. Plumbing and ratings remain illustrative."},chassis:{name:"Chassis / suspension",ids:["100","110","340","350","360"],selected:"110",copy:"Primary frame, occupant-cell structure, module mounts and road suspension or landing interfaces."},exterior:{name:"Exterior / body",ids:["101","102","103","104","105","106","107","108"],selected:"101",copy:"The accepted sports-car body, glazing, trim, lighting and surface hardware, without the internal systems."}},Xc=Object.fromEntries(ho.map(i=>[i.id,i])),At=te("viewport"),Wt,Pe,yt,it,St,Hn,es,Pi,zn,ln,Ye,_n=[],oo=[],Ii=[],qc=[],uo=[],Yc=[],ro=0,fd=0,dn,hn,Dy=[],An,ci=0,_d=[],Hc,pd,lo=new nn(new C(0,0,-1),0),ts=matchMedia("(prefers-reduced-motion: reduce)").matches,Vn=0,md="",ke=(i,e,t)=>new C(i,e,t);function Ly(){Wt=new Bs,Pe=new Nt(36,1,.1,140),yt=new Ra({antialias:!0,alpha:!0,powerPreference:"high-performance"}),yt.setPixelRatio(Math.min(devicePixelRatio,1.5)),yt.setClearColor(463387,0),yt.localClippingEnabled=!0,yt.outputColorSpace=Ut,yt.toneMapping=Ec,yt.toneMappingExposure=.92;let i=new Fs(yt),e=new eo;pd=i.fromScene(e,.04),Wt.environment=pd.texture,e.dispose(),i.dispose(),Hc=ld(),At.appendChild(yt.domElement),it=new Rr(Pe,yt.domElement),it.enableDamping=!0,it.dampingFactor=.075,it.minDistance=2,it.maxDistance=25,it.enablePan=!0,it.autoRotateSpeed=.55,it.addEventListener("change",()=>{Vn=performance.now()+250}),Wt.add(new Ga(14477555,.4));let t=new wr(16774373,2.1);t.position.set(4,7,5),Wt.add(t);let n=new wr(14478079,1.6);n.position.set(-5,4,-6),Wt.add(n),es=new Xa(22,44,2580593,1588042),es.position.y=-.035,es.material.transparent=!0,es.material.opacity=.12,Wt.add(es);let s=document.createElement("canvas");s.width=s.height=128;let r=s.getContext("2d"),a=r.createRadialGradient(64,64,8,64,64,62);a.addColorStop(0,"#000000b0"),a.addColorStop(1,"#00000000"),r.fillStyle=a,r.fillRect(0,0,128,128);let o=new je(new si(7.2,3.5),new Nn({map:new wi(s),transparent:!0,depthWrite:!1}));o.rotation.x=-Math.PI/2,o.position.y=-.032,Wt.add(o);let l=new at().setFromPoints(Array.from({length:129},(h,u)=>ke(Math.cos(u*Math.PI/64)*4.5,-.165,Math.sin(u*Math.PI/64)*4.5))),c=new ri(l,new Gs({color:3765378,dashSize:.12,gapSize:.1,transparent:!0,opacity:.5}));c.computeLineDistances(),Wt.add(c),$c(),fn("iso"),co(),new ResizeObserver(co).observe(At),Ye=new so({scene:Wt,state:A,openParts:Et,vehicle:()=>St,meshes:()=>_n,part:h=>Xc[h],designKey:()=>`${A.model}-${A.variant}-${A.mode}`,updateGeometry:Di,setView:fn,selection:Cn,refresh:ns,closeProcess:Js,resetSeparation:()=>{te("explode").value=0,te("explode-value").textContent="0%",is()},material:h=>{let u=A.presentation==="engineering"?h.material.clone():h.userData.studio.clone();return A.presentation!=="engineering"&&h.userData.role==="paint"&&u.color.setHex(Ci[A.paint].color),u},geometryCount:Zc,frameBounds:ky,wake:()=>{Vn=performance.now()+1300},status:h=>{te("operation-status").textContent=h,te("view-label").textContent="PART CAD / HIERARCHICAL GEOMETRY"}}),Ye.reindex(),Ye.enter(),yt.domElement.addEventListener("pointerdown",h=>{yt.domElement.dataset.px=h.clientX,yt.domElement.dataset.py=h.clientY}),yt.domElement.addEventListener("pointerup",Hy),te("loading").hidden=!0,requestAnimationFrame(yd)}function Kt(i,e,t,n={}){let s=n.color??(t==="200"||t==="210"?gt.amber:gt.cyan),r=n.role||{101:"paint",102:"glass",103:"paint",104:"carbon",300:"rubber",330:"carbon",331:"metal",200:"ceramic",210:"copper",400:"ceramic",500:"metal"}[t]||"metal",a=od(r==="darkTrim"?"carbon":r==="light"?"ceramic":r);a.clippingPlanes=[],(r==="carbon"||r==="darkTrim")&&(a.map=Hc,a.bumpMap=Hc,a.bumpScale=.0018);let o=n.instances?new zs(e,a,n.instances.length):new je(e,a);if(n.instances){let h=new Rt;n.instances.forEach((u,d)=>{h.position.set(...u.p||[0,0,0]),h.rotation.set(...u.rot||[0,0,0]),h.scale.set(...u.s||[1,1,1]),h.updateMatrix(),o.setMatrixAt(d,h.matrix)}),o.instanceMatrix.needsUpdate=!0,o.computeBoundingSphere()}o.userData={id:t,baseOpacity:n.opacity??.17,color:s,role:r,studio:a.clone()},i.add(o);let l=n.instances?new at:new Yi(e,n.angle??22),c=new Ei(l,new an({color:s,transparent:!0,opacity:n.edgeOpacity??.65,clippingPlanes:[]}));return o.add(c),o.userData.edge=c,_n.push(o),Yc.push(o),o}function kn(i,e,t,n,s){let r=Kt(i,new Ct(...e),n,s);return r.position.set(...t),r}function Bn(i,e,t,n,s,r){let a=Kt(i,new Mt(e,e,t,32,1,r?.open??!1),s,r);return a.position.set(...n),a}function li(i,e,t,n,s,r){let a=Kt(i,new on(e,t,8,48),s,r);return a.rotation.x=Math.PI/2,a.position.set(...n),a}function un(i,e,t,n,s,r){let a=ke(...t).sub(ke(...e)),o=Kt(i,new Mt(n,n,a.length(),8),s,r);return o.position.copy(ke(...e).add(ke(...t)).multiplyScalar(.5)),o.quaternion.setFromUnitVectors(ke(0,1,0),a.normalize()),o}function Zs(i,e,t,n,s){return Kt(i,new Hs(new Fn(e.map(r=>ke(...r))),Math.max(16,e.length*8),t,6,!1),n,s)}function Ft(i,e=[0,0,0],t=[0,0,0]){let n=new mt;return n.position.set(...e),i.add(n),oo.push({obj:n,base:ke(...e),exp:ke(...t)}),n}function ao(i,e,t=gt.cyan,n=!1){let s=new at().setFromPoints(e.map(o=>ke(...o))),r=n?new Gs({color:t,dashSize:.12,gapSize:.08,transparent:!0,opacity:.7}):new an({color:t,transparent:!0,opacity:.7}),a=new ri(s,r);return n&&a.computeLineDistances(),i.add(a),a}function Pr(i,e,t,n,s=gt.cyan){let r=new qa(ke(...t).normalize(),ke(...e),n,s,.13,.065);return i.add(r),r}function cn(i,e,t,n,s=!1){uo.push({obj:i,pos:ke(...e),id:t,label:n,left:s})}function Uy(i,e,t,n={}){let r=[],a=[],o=new Fn(e.map(u=>ke(u[0],u[1],u[2])),!1,"centripetal"),l=new Fn(e.map(u=>ke(u[0],u[3],0)),!1,"centripetal"),c=(e.length-1)*5+1;for(let u=0;u<c;u++){let d=o.getPoint(u/(c-1)),f=l.getPoint(u/(c-1)).y;for(let g=0;g<32;g++){let _=g/32*Math.PI*2;r.push(d.x,d.y+Math.sin(_)*Math.max(.015,f),Math.cos(_)*Math.max(.015,d.z))}}for(let u=0;u<c-1;u++)for(let d=0;d<32;d++){let f=u*32+d,g=u*32+(d+1)%32,_=(u+1)*32+d,m=(u+1)*32+(d+1)%32;a.push(f,g,_,g,m,_)}let h=new at;return h.setAttribute("position",new Ze(r,3)),h.setIndex(a),h.computeVertexNormals(),Kt(i,h,t,n)}function Ny(i,e,t,n={}){let s=e.flat(),r=[];for(let o=1;o<e.length-1;o++)r.push(0,o,o+1);let a=new at;return a.setAttribute("position",new Ze(s,3)),a.setIndex(r),a.computeVertexNormals(),Kt(i,a,t,n)}function Oy(){cd({vehicle:St,state:A,group:Ft,mesh:Kt,box:kn,rod:un,tube:Zs,cyl:Bn,torus:li,panel:Ny,line:ao,anchor:cn})}function Vc(i,{road:e=!1,a2:t=!1,a3:n=!1,cruise:s=!1,detailMode:r=!1}={}){let a=r?.83:.58,o=new mt;i.add(o);let l;if(e){l=Ft(o,[0,0,0],[0,.58,0]),li(l,a+.055,.105,[0,0,0],"300",{opacity:.26,edgeOpacity:.5}),li(l,a-.035,.025,[0,.09,0],"300",{role:"metal",opacity:.4}),li(l,a-.035,.025,[0,-.09,0],"300",{role:"metal",opacity:.4});for(let I=0;I<36;I++){let T=I/36*Math.PI*2,R=kn(l,[.045,.18,.018],[(a+.153)*Math.cos(T),0,(a+.153)*Math.sin(T)],"300",{opacity:.22,edgeOpacity:.25});R.rotation.y=-T}}let c=t?-.3:0,h=Ft(o,[0,c,0],[0,-.45,0]),u=e?a-.1:a+.02;Bn(h,u,.27,[0,0,0],"310",{open:!0,opacity:.13,edgeOpacity:.6}),li(h,u,.027,[0,.14,0],"310",{opacity:.5}),li(h,u,.035,[0,-.14,0],"310",{opacity:.5});let d=Ft(o,[0,c,0],[0,.55,.1]),f=[ke(u+.008,.17,0),ke(u+.055,.185,0),ke(u+.09,.12,0),ke(u+.085,-.1,0),ke(u+.04,-.18,0),ke(u+.008,-.14,0)];Kt(d,new Ba(f,48),"103",{opacity:.24,edgeOpacity:.5,angle:35});for(let I=0;I<12;I++){let T=I/12*Math.PI*2,R=Math.cos(T)*u,L=Math.sin(T)*u;un(h,[R,-.13,L],[R,.13,L],.011,"310",{opacity:.3}),Bn(h,.015,.02,[R,.155,L],"310",{opacity:.65})}let g=Ft(o,[0,c,0],[0,.32,0]),_=new mt;g.add(_),qc.push(_);let m=u-.045;Bn(_,.12,.16,[0,0,0],"320",{opacity:.55});for(let I=0;I<10;I++){let T=new Ti;T.moveTo(.11,-.045),T.bezierCurveTo(.22,-.08,m*.8,-.15,m,-.09),T.lineTo(m,.025),T.bezierCurveTo(m*.6,.005,.23,.065,.11,.045),T.closePath();let R=Kt(_,new ai(T,{depth:.018,bevelEnabled:!1}),"330",{opacity:.28,edgeOpacity:.8});R.rotation.x=Math.PI/2,R.rotation.z=I*Math.PI/5,R.rotation.set(Math.PI/2,0,0);let L=new mt;_.remove(R),L.add(R),L.rotation.y=I*Math.PI/5,_.add(L),n&&(L.userData.blade=!0,L.userData.angle=I*Math.PI/5)}let p=Ft(o,[0,c-.21,0],[0,-.9,0]);Bn(p,.16,.3,[0,0,0],"320",{opacity:.3});for(let I=0;I<16;I++){let T=I/16*Math.PI*2;un(p,[Math.cos(T)*.163,-.12,Math.sin(T)*.163],[Math.cos(T)*.163,.12,Math.sin(T)*.163],.007,"320",{edgeOpacity:.4})}Bn(p,.055,.38,[0,.12,0],"320",{opacity:.5});for(let I of[-.13,.1])li(p,.09,.022,[0,I,0],"320",{opacity:.6});let S=Ft(o,[0,c-.11,0],[0,-.65,0]);for(let I=0;I<6;I++){let T=I*Math.PI/3;un(S,[Math.cos(T)*.14,0,Math.sin(T)*.14],[Math.cos(T)*(u-.02),0,Math.sin(T)*(u-.02)],.012,"331",{opacity:.4});let R=new Ti;R.moveTo(.15,-.025),R.quadraticCurveTo(u*.6,-.1,u-.035,-.05),R.lineTo(u-.035,.025),R.quadraticCurveTo(u*.55,.012,.15,.035),R.closePath();let L=Kt(S,new ai(R,{depth:.055,bevelEnabled:!1}),"331",{color:gt.white,opacity:.3});L.rotation.x=Math.PI/2;let E=new mt;S.remove(L),E.add(L),E.rotation.y=T,S.add(E)}let v=Ft(o,[0,c+.18,0],[0,.9,0]);li(v,u-.025,.016,[0,0,0],"310",{opacity:.4});for(let I=-3;I<=3;I++){let T=I*u/4,R=Math.sqrt((u-.03)**2-T*T);un(v,[T,0,-R],[T,0,R],.006,"310",{edgeOpacity:.4}),un(v,[-R,.002,T],[R,.002,T],.006,"310",{edgeOpacity:.4})}let x=Ft(o,[0,c-.38,0],[0,-1.35,0]);Bn(x,.2,.055,[0,0,0],"340",{opacity:.25});for(let I=0;I<4;I++){let T=I*Math.PI/2;Bn(x,.025,.08,[Math.cos(T)*.15,0,Math.sin(T)*.15],"340",{opacity:.8})}if(kn(o,[.12,.12,.2],[u+.04,c,0],"400",{opacity:.4}),e){let I=Ft(o,[0,.19,0],[0,.45,0]);Kt(I,id(),"350",{role:"metal",opacity:.3}),kn(I,[.13,.13,.15],[.19,0,0],"350",{opacity:.4})}return r&&(cn(v,[u,.02,0],"310","INLET GUARD"),cn(g,[-u,0,0],"330","ROTOR PACKAGE",!0),cn(p,[.15,0,0],"320","MOTOR / BEARINGS"),cn(S,[-u,-.03,0],"331","STATIONARY VANES",!0),cn(x,[-.18,0,0],"340","MOUNT / LOCK",!0),e&&cn(l,[a+.15,0,0],"300","ROAD TIRE")),sd({mesh:Kt,box:kn,cyl:Bn,rod:un,tube:Zs,torus:li,group:Ft,anchor:cn},o,{radius:u,fanOffset:c,road:e,detailMode:r}),o}function Fy(){let i=A.model==="A"?1.18:1.73;for(let t of[-1.8,1.8])for(let n of[-i,i]){let s=new mt;St.add(s),s.position.set(t,.68,n),s.userData.cadLabel=`${t>0?"Front":"Rear"} / ${n>0?"port":"starboard"} propulsion module`;let r=new mt;s.add(r);let a=Vc(r,{road:A.model==="A",a2:A.variant==="A2",a3:A.variant==="A3"});A.model==="A"&&a.scale.setScalar(.68),Ii.push({root:s,tilting:r,assembly:a,x:t,z:n});let o=Ft(St,[t,.56,n*.68],[0,-.2,n*.35]);un(o,[0,0,0],[0,0,n>0?.48:-.48],.065,"340",{opacity:.4});let l=Bn(o,.12,.3,[0,0,n>0?.3:-.3],"340",{opacity:.4});if(l.rotation.z=Math.PI/2,A.model==="A"||A.variant==="B2"){un(o,[-.24,-.1,0],[.24,.2,n>0?.4:-.4],.037,"340",{color:gt.amber,opacity:.4});for(let h of[-.16,.16])kn(o,[.08,.18,.08],[h,0,n>0?.24:-.24],"340",{opacity:.4});kn(o,[.08,.08,.08],[0,.13,n>0?.36:-.36],"400",{opacity:.6})}else kn(o,[.32,.16,.24],[0,0,n>0?.24:-.24],"340",{opacity:.3});let c=Ft(St,[t,.65,n*.72],[0,.65,n*.6]);kn(c,[.38,.15,.32],[0,0,0],"210",{role:"metal",opacity:.3});for(let h=0;h<5;h++)kn(c,[.04,.03,.31],[-.13+h*.065,.09,0],"210",{edgeOpacity:.4});if(A.model==="A"){let h=Ft(St,[t,.5,n*.71],[0,-.2,n*.35]),u=n>0?.35:-.35;for(let d of[-.13,.12])un(h,[-.24,d,-u*.4],[0,d,u],.025,"350"),un(h,[.24,d,-u*.4],[0,d,u],.025,"350");Zs(h,Array.from({length:101},(d,f)=>{let g=f/100;return[Math.cos(g*Math.PI*14)*.055,.05+g*.4,u*(1-g*.8)+Math.sin(g*Math.PI*14)*.055]}),.01,"350"),un(h,[0,.02,u],[0,.5,0],.02,"350",{opacity:.5})}if(A.model==="B"){let h=Ft(St,[0,0,Math.sign(n)*1.05],[0,.6,Math.sign(n)*.32]);Uy(h,[[t+.7,.77,.08,.05],[t+.35,.82,.3,.15],[t-.3,.8,.32,.13],[t-.7,.73,.08,.04]],"103",{role:"paint",opacity:.22,edgeOpacity:.4,angle:35})}}let e=Ii.find(t=>t.x>0&&t.z>0);if(cn(e.tilting,[.55,.2,.1],"310","FAN / DUCT MODULE"),cn(Ii[0].tilting,[-.5,0,0],"330","INDEPENDENT ROTOR",!0),A.model==="B"){let t=Ft(St,[0,0,0],[0,-.55,0]);for(let n of[-.79,.79]){Zs(t,[[-2.3,.03,n],[-1.95,-.04,n],[1.9,-.04,n],[2.35,.12,n]],.055,"360",{opacity:.35});for(let s of[-1.3,1.3])un(t,[s,.02,n],[s,.68,n*.75],.04,"360",{opacity:.4})}if(cn(t,[1.95,-.02,-.79],"360","SKID LANDING",!1),A.variant==="B3"){let n=Ft(St,[-2.72,1.27,0],[-.75,.4,0]),s=Vc(n);s.rotation.z=-Math.PI/2,s.scale.setScalar(.65),cn(n,[-.3,.2,0],"330","SEPARATE CRUISE FAN",!0)}}}function By(){Pi=new mt,St.add(Pi);for(let e of Ii){let t=new mt;e.tilting.add(t),t.userData.flow=!0;for(let n of[-.23,0,.23])ao(t,[[n,1.12,0],[n,.75,0],[n,.25,0]],gt.cyan,!0),Pr(t,[n,.2,0],[0,-1,0],1);Pi.userData.podFlows??=[],Pi.userData.podFlows.push(t)}zn=new mt,zn.userData.cadAnnotation=!0,St.add(zn);for(let e of Ii){let t=[[1.75,.72,0],[.7,.56,e.z*.38],[e.x,.59,e.z*.6],[e.x,.65,e.z*.85]];Zs(zn,t,.018,"210",{color:gt.amber,opacity:.9,edgeOpacity:.3}),Zs(zn,[[-2,.74,Math.sign(e.z)*.8],[-.8,.48,e.z*.5],[e.x,.54,e.z*.6],[e.x,.56,e.z*.85]],.012,"500",{color:gt.white,opacity:.7,edgeOpacity:.3}),Pr(zn,t[2],[0,0,Math.sign(e.z)],.28,gt.amber)}ln=new mt,ln.userData.cadAnnotation=!0,St.add(ln);for(let e of Ii)ao(ln,[[e.x,.51,e.z],[e.x,.56,Math.sign(e.z)*.8],[e.x,.25,Math.sign(e.z)*.69],[0,.25,0]],gt.amber,!0),Pr(ln,[e.x,.51,e.z],[0,1,0],.8,gt.amber);let i=Kt(ln,new oi(.48,16,10),"110",{color:gt.amber,opacity:.04,edgeOpacity:.35});i.position.set(0,.7,0),i.scale.set(1.2,.5,.6);for(let e of[[1,0,0],[0,1,0],[0,0,1]])ao(ln,[[-e[0]*.65,.7-e[1]*.5,-e[2]*.4],[e[0]*.65,.7+e[1]*.5,e[2]*.4]],gt.amber);cn(ln,[0,.98,0],"110","CG ENVELOPE / TBD",!0)}function gd(i){i&&(i.traverse(e=>{e.geometry&&e.geometry.dispose(),e.material&&(Array.isArray(e.material)?e.material.forEach(t=>t.dispose()):e.material.dispose())}),Wt.remove(i))}function $c(){let i=!!Ye?.active;Ye?.active&&Ye.exit(),gd(St),gd(Hn),_n=[],oo=[],Ii=[],qc=[],uo=[],Yc=[],Dy=[],_d=[],St=new mt,Wt.add(St),Oy(),Fy(),By(),Hn=new mt,Wt.add(Hn);let e=Vc(Hn,{road:A.model==="A",a2:A.variant==="A2",a3:A.variant==="A3",detailMode:!0});e.position.y=1,Vy(e);for(let t of oo){let n={};t.obj.traverse(s=>{s.isMesh&&s.userData.id&&(n[s.userData.id]=(n[s.userData.id]||0)+1)}),t.part=t.obj.userData.assemblyPart||Object.entries(n).sort((s,r)=>r[1]-s[1])[0]?.[0]}_n.forEach((t,n)=>{t.userData.rest=t.position.clone(),t.userData.spread=ke((n%3-1)*.07,n%5*.035,(n%4-1.5)*.045)}),Di(!0),ns(),zy(),Cn(),fo(),te("geometry-status").textContent=`${Zc().toLocaleString()} MODELED ELEMENTS / ${A.model} \xB7 ${A.variant}`,Ye?.reindex(),i&&Ye.enter()}function Zc(){return _n.reduce((i,e)=>i+(e.isInstancedMesh?e.count:1),0)}function Di(i=!1,e=.016){let t=A.explode;for(let a of oo){let o=Et.has(a.part)?1:0,l=a.base.clone().addScaledVector(a.exp,Math.max(t,o));i||ts?a.obj.position.copy(l):a.obj.position.lerp(l,1-Math.exp(-e*7))}for(let a of _n){if(!a.userData.rest)continue;let o=a.userData.rest.clone();Et.has(a.userData.id)&&["200","210","320","330","350","400","500"].includes(a.userData.id)&&o.add(a.userData.spread),i||ts?a.position.copy(o):a.position.lerp(o,1-Math.exp(-e*7))}let n=A.model==="A"&&A.mode==="road";for(let a of _d)a.visible=n;let s=A.mode==="cruise"&&A.variant==="B2";for(let a of Ii){let o=n?a.z>0?Math.PI/2:-Math.PI/2:0;a.tilting.rotation.x=Yt.damp(a.tilting.rotation.x,o,7,i?10:e),a.tilting.rotation.z=Yt.damp(a.tilting.rotation.z,s?-Math.PI/2:0,7,i?10:e),a.root.position.set(a.x+(a.x>0?1:-1)*t*.45,(n?.51:.86)+t*.15,a.z+Math.sign(a.z)*(t*.95+(A.model==="A"&&!n?.67:0)))}A.variant==="A3"&&(St.traverse(a=>{a.userData.blade&&a.scale.setScalar(n?.38:1)}),Hn.traverse(a=>{a.userData.blade&&a.scale.setScalar(n?.38:1)}));let r=A.view==="module"||!!(A.zoneIsolate&&Rn[A.focus]?.detail);St.visible=!r,Hn.visible=r,Ye?.active&&(St.visible=!1,Hn.visible=!1,Ye.root.visible=!0)}function ns(){for(let i of _n)i.userData.edge.visible=A.wire,i.material.clippingPlanes=A.section?[lo]:[],i.userData.edge.material.clippingPlanes=A.section?[lo]:[];zn.visible=A.routes,ln.visible=A.loads;for(let i of Pi.userData.podFlows||[])i.visible=A.airflow;An&&(An.visible=A.airflow||A.process),dn&&(dn.visible=A.aero&&A.view!=="module"),hn&&(hn.visible=A.scan&&A.view!=="module"),te("labels").hidden=!A.callouts,fo(),Cn()}function Cn(){for(let s of _n){let r=s.userData.id===A.selected;if(A.presentation==="studio"){s.userData.appliedPresentation!=="studio"&&(s.material.copy(s.userData.studio),s.material.needsUpdate=!0,s.userData.appliedPresentation="studio");let l=s.userData.role,c=["101","102","103","104"].includes(s.userData.id);l==="paint"?s.material.color.setHex(Ci[A.paint].color):s.material.color.copy(s.userData.studio.color),A.zoneIsolate&&A.focus==="cooling"&&l==="rubber"&&s.material.color.setHex(5334389),s.material.transparent=l==="glass"||!A.surface&&c,s.material.opacity=!A.surface&&c?.075:l==="glass"?.9:1,s.material.depthWrite=l!=="glass"&&(A.surface||!c),s.material.clippingPlanes=A.section?[lo]:[],s.userData.edge.material.clippingPlanes=A.section?[lo]:[],s.userData.edge.visible=r&&Et.has(A.selected),s.userData.edge.material.color.setHex(gt.amber),s.userData.edge.material.opacity=.45,s.renderOrder=l==="glass"?3:0,s.userData.light&&(s.material.color.setHex(s.userData.color),s.material.emissive.setHex(s.userData.color),s.material.emissiveIntensity=1.6),A.focus!=="overview"&&!A.zoneIsolate&&!Rn[A.focus]?.ids.includes(s.userData.id)&&(s.material.transparent=!0,s.material.opacity=.07,s.material.depthWrite=!1);continue}s.userData.appliedPresentation!=="engineering"&&(s.material.map=null,s.material.bumpMap=null,s.material.metalness=.35,s.material.roughness=.45,s.material.clearcoat=0,s.material.envMapIntensity=.15,s.material.transparent=!0,s.material.needsUpdate=!0,s.userData.appliedPresentation="engineering"),s.material.color.setHex(r?gt.amber:s.userData.color),s.material.emissive.setHex(r?3547917:0);let a=["101","102","103"].includes(s.userData.id),o=Et.has("101")||Et.has("102")||A.explode>.2;if(s.material.opacity=A.wire?a?A.surface?s.userData.id==="102"?.5:.86:.055:r?Math.max(s.userData.baseOpacity,.3):s.userData.baseOpacity*(A.surface&&!o?.35:1):r?.95:.78,a&&A.surface&&A.wire&&(s.material.color.setHex(r?10218225:2848905),s.material.emissive.setHex(533550)),s.userData.glazing&&A.surface&&(s.material.color.setHex(r?5018024:534072),s.material.emissive.setHex(201245),s.material.opacity=.7),s.userData.darkTrim&&A.surface&&(s.material.color.setHex(399651),s.material.emissive.setHex(67339),s.material.opacity=.96),s.userData.light&&(s.material.opacity=.95,s.material.emissive.setHex(s.userData.color)),s.material.depthWrite=!A.wire||a&&A.surface,s.renderOrder=a&&A.surface?2:0,s.userData.edge.material.opacity=a?.75:A.surface&&!o&&!r?.22:.65,s.userData.edge.material.color.setHex(r?gt.amber:s.userData.color),A.focus!=="overview"){let l=Rn[A.focus]?.ids.includes(s.userData.id);A.zoneIsolate?s.material.opacity=r?.9:.45:l||(s.material.opacity=.055,s.material.depthWrite=!1,s.userData.edge.material.opacity=.1)}}document.querySelectorAll(".tree-item").forEach(s=>s.classList.toggle("active",s.dataset.part===A.selected));let i=Xc[A.selected]||ho[0],e=A.model==="B"&&A.variant!=="B2";i.id==="340"&&e&&(i={...i,name:"Fixed fan mounts",desc:"Illustrative fixed structural mounting of vertical-lift fans into the body and keel.",details:["B1 / B3 lift fans remain vertically oriented.","No lift-fan tilt actuators are installed in this variant.","Mount sections, joints and fasteners are unresolved."],risk:"Validate mount load paths, stiffness, vibration, fatigue and service access.",source:"\xA7\xA74.2\u20134.3"}),te("inspect-ref").textContent=`REF ${i.id}`,te("inspect-name").textContent=i.name,te("inspect-description").textContent=i.desc,te("inspect-type").textContent=["101","102","103","104","331",...zc.map(s=>s.id)].includes(i.id)?"ADDED / STUDY GEOMETRY":i.id==="340"&&!e?"MECHANISM / STUDY ASSUMPTION":"DISCLOSED ASSEMBLY",te("inspect-details").innerHTML=i.details.map(s=>`<li>${s}</li>`).join(""),te("inspect-risk").textContent=i.risk,te("inspect-source").textContent=`BASIS / ${i.source}`;let t={101:"paint",102:"glass",103:"paint",104:"carbon",300:"rubber",330:"carbon",200:"ceramic",210:"copper",400:"ceramic"}[i.id]||"metal",n=i.materialStudy?{name:"Assembly material study",finish:"Mixed materials / visual candidates only",stack:i.materialStudy,note:"Candidate names and rendered finishes are not selections or specifications. Grades, compatibility, processing, durability and qualification remain unresolved."}:ad[t];te("material-inspect").innerHTML=`<span class="eyebrow">MATERIAL / FINISH INTENT</span><h3>${t==="paint"?Ci[A.paint].name:n.name}</h3><p>${n.finish}</p><div>${n.stack}</div><small>${n.note}</small>`}function zy(){te("labels").replaceChildren();let i=document.createElementNS("http://www.w3.org/2000/svg","svg");i.classList.add("leader-lines"),i.setAttribute("aria-hidden","true"),te("labels").append(i);for(let e of uo){let t=document.createElement("button");t.className=`callout${e.left?" left":""}${e.id==="200"?" amber":""}`,t.innerHTML=`<b>${e.id} / ${e.label}</b>`,t.setAttribute("aria-label",`Inspect and disassemble ${e.label}`),t.onclick=()=>Jc(e.id),e.el=t,te("labels").append(t);let n=document.createElementNS("http://www.w3.org/2000/svg","path");n.setAttribute("fill","none"),n.setAttribute("stroke",e.id==="200"?"#edbd7870":"#6be1ed60"),n.setAttribute("stroke-width",".8"),i.append(n),e.path=n}}function Gc(){if(Ye?.active){te("labels").hidden=!0;return}let i=At.getBoundingClientRect(),e=Hn.visible,t=i.width<500,n=0,s=[];for(let a of uo){let o=!1,l=a.obj;for(;l;)l===Hn&&(o=!0),l=l.parent;let c=a.obj===ln;if(!(o===e&&(!c||A.loads)&&(!(A.zoneIsolate&&A.focus!=="overview")||Rn[A.focus]?.ids.includes(a.id)))){a.el.style.display="none",a.path.style.display="none";continue}if(n++,t&&n>3){a.el.style.display="none",a.path.style.display="none";continue}let u=a.obj.localToWorld(a.pos.clone()).project(Pe),d=(u.x*.5+.5)*i.width,f=(-u.y*.5+.5)*i.height,g=a.left,_=Math.min(a.el.offsetWidth||190,t?150:240);d=g?Math.max(_+10,Math.min(i.width-12,d)):Math.max(12,Math.min(i.width-_-10,d)),f=Math.max(148,Math.min(i.height-94,f)),a.el.style.display=u.z>1?"none":"flex",a.path.style.display=u.z>1?"none":"block",s.push({a,x:d,y:f,anchorX:(u.x*.5+.5)*i.width,anchorY:(-u.y*.5+.5)*i.height})}for(let a of[!0,!1]){let o=s.filter(h=>h.a.left===a).sort((h,u)=>h.y-u.y),l=120;for(let h of o)h.y=Math.max(h.y,l+32),l=h.y;let c=Math.max(0,(o.at(-1)?.y??0)-(i.height-94));o.forEach(h=>{h.y-=c,h.a.el.style.left=`${h.x}px`,h.a.el.style.top=`${h.y}px`,h.a.path.setAttribute("d",`M ${h.anchorX} ${h.anchorY} L ${h.x} ${h.y}`)})}let r=Pe.quaternion.clone().invert();document.querySelector(".orientation svg").innerHTML=[["X",ke(1,0,0)],["Y",ke(0,1,0)],["Z",ke(0,0,1)]].map(([a,o])=>{o.applyQuaternion(r);let l=40+o.x*26,c=43-o.y*26;return`<path d="M40 43L${l} ${c}"/><text x="${l-4}" y="${c-5}">${a}</text>`}).join("")+'<circle cx="40" cy="43" r="2"/>'}function co(){if(Vn=performance.now()+500,!(!yt||At.clientWidth===0||At.clientHeight===0)){if(Pe.aspect=At.clientWidth/At.clientHeight,Pe.isPerspectiveCamera&&A.view!=="module"&&A.focus==="overview"){let i=At.clientWidth<550?1.1:.82;Pe.userData.fitFactor&&Pe.userData.fitFactor!==i&&Pe.position.sub(it.target).multiplyScalar(i/Pe.userData.fitFactor).add(it.target),Pe.userData.fitFactor=i}if(Pe.isOrthographicCamera){let i=A.view==="module"?2.8:4.6;Pe.left=-i*Pe.aspect,Pe.right=i*Pe.aspect,Pe.top=i,Pe.bottom=-i}Pe.updateProjectionMatrix(),yt.setSize(At.clientWidth,At.clientHeight),A.focus!=="overview"&&po(),Ye?.active&&Ye.frame()}}function fn(i,{preserveZone:e=!1}={}){e||(A.focus=i==="module"?"fan":"overview"),te("detail-focus")&&(te("detail-focus").value=A.focus),A.view=i;let t=i==="module"?ke(0,.9,0):ke(0,1,0),n=it,s;if(i==="iso"||i==="module"){Pe=new Nt(36,At.clientWidth/Math.max(1,At.clientHeight),.1,140);let r=At.clientWidth<550;s=i==="module"?ke(4,3.6,4.8):ke(7.7,4.5,8.8).multiplyScalar(r?1.1:.82),i!=="module"&&(Pe.userData.fitFactor=r?1.1:.82)}else{let a=At.clientWidth/Math.max(At.clientHeight,1);Pe=new Os(-4.6*a,4.6*a,4.6,-4.6,.1,140),s={top:ke(0,14,.001),bottom:ke(0,-12,.001),side:ke(0,1,14),front:ke(14,1,0)}[i],i==="top"&&Pe.up.set(1,0,0),i==="bottom"&&Pe.up.set(-1,0,0)}Pe.position.copy(s),n?.dispose(),it=new Rr(Pe,yt.domElement),it.target.copy(t),it.enableDamping=!0,it.dampingFactor=.075,it.minDistance=2,it.maxDistance=30,it.autoRotate=A.rotate,it.autoRotateSpeed=.55,it.addEventListener("change",()=>{Vn=performance.now()+250}),it.update(),document.querySelectorAll("[data-view]").forEach(r=>r.classList.toggle("active",r.dataset.view===i)),te("view-label").textContent={iso:"ASSEMBLED PERSPECTIVE",module:"MODULE DETAIL / FIG. 4\u20135",top:"TOP / ORTHOGRAPHIC",bottom:"BOTTOM / ORTHOGRAPHIC",side:"SIDE / ORTHOGRAPHIC",front:"FRONT / ORTHOGRAPHIC"}[i],St&&Di(!0),fo(),co(),e&&po(),Ye?.active&&(Ye.frame(),Ye.renderPanel())}function ky(i){let e=i.getCenter(new C),t=i.getSize(new C),n=At.clientWidth/Math.max(1,At.clientHeight);if(it.target.copy(e),it.minDistance=5e-4,it.maxDistance=500,Pe.isPerspectiveCamera){let s=Yt.degToRad(Pe.fov),r=2*Math.atan(Math.tan(s/2)*n),a=Ye?.current==="vehicle"?2.2:1.9,o=Math.max(t.y/(2*Math.tan(s/2)),t.x/(2*Math.tan(r/2)),t.z/(2*Math.tan(r/2)),t.length()*.5)*a;Pe.position.copy(e).add(ke(1,.72,1.2).normalize().multiplyScalar(Math.max(.008,o))),Pe.near=Math.max(1e-5,o/1e4),Pe.far=Math.max(200,o*30),delete Pe.userData.fitFactor}else{let s=Math.max(t.length()*.7,.005),r=Pe.getWorldDirection(new C).negate();Pe.left=-s*n,Pe.right=s*n,Pe.top=s,Pe.bottom=-s,Pe.position.copy(e).add(r.multiplyScalar(20))}Pe.updateProjectionMatrix(),it.update(),Vn=performance.now()+900}function fo(){let i=Rn[A.focus],e=A.focus!=="overview"&&A.zoneIsolate,t=new Set(i?.ids||[]);for(let s of _n)s.visible=!e||t.has(s.userData.id),e&&A.focus==="power"&&s.userData.id==="200"&&(s.visible=!1);let n=0;if(document.querySelectorAll(".tree-item").forEach(s=>{let r=!e||t.has(s.dataset.part);s.style.display=r?"":"none",r&&n++}),te("part-count")&&(te("part-count").textContent=String(n).padStart(2,"0")),e)for(let s of[Pi,zn,ln,dn,hn])s&&(s.visible=!1);else Pi&&(Pi.visible=!0),zn&&(zn.visible=A.routes),ln&&(ln.visible=A.loads),dn&&(dn.visible=A.aero&&A.view!=="module"),hn&&(hn.visible=A.scan&&A.view!=="module");document.querySelectorAll("[data-zone]").forEach(s=>{s.classList.toggle("active",s.dataset.zone===A.focus),s.setAttribute("aria-pressed",String(s.dataset.zone===A.focus))}),te("zone-context")&&(te("zone-context").disabled=A.focus==="overview",te("zone-context").textContent=A.zoneIsolate?"Show in vehicle":"Isolate zone",te("zone-context").setAttribute("aria-pressed",String(!A.zoneIsolate))),te("zone-description")&&(te("zone-description").textContent=A.focus==="overview"?"Choose a zone to inspect it on its own. Drag to orbit, scroll to zoom, or click a part to take it apart.":`${A.zoneIsolate?"ISOLATED":"IN CONTEXT"} / ${i?.copy||""}`)}function po(){if(A.focus==="overview")return;Di(!0),Wt.updateMatrixWorld(!0);let i=new Gt,e=new Set(Rn[A.focus]?.ids||[]),t=A.zoneIsolate&&Rn[A.focus]?.detail?Hn:St;for(let a of _n){let o=a,l=!1;for(;o;)o===t&&(l=!0),o=o.parent;l&&a.visible&&e.has(a.userData.id)&&i.union(new Gt().setFromObject(a))}if(i.isEmpty())return;let n=i.getCenter(new C),s=i.getSize(new C),r=At.clientWidth/Math.max(1,At.clientHeight);if(it.target.copy(n),it.minDistance=.25,Pe.isPerspectiveCamera){let a=Yt.degToRad(Pe.fov),o=2*Math.atan(Math.tan(a/2)*r),l=Math.max(s.y/(2*Math.tan(a/2)),s.x/(2*Math.tan(o/2)),s.z/(2*Math.tan(o/2)),s.length()*.45)*1.95,c=A.focus==="cockpit"?ke(-1,.85,1.25):ke(1,.75,1.2);Pe.position.copy(n).add(c.normalize().multiplyScalar(Math.max(.7,l))),delete Pe.userData.fitFactor}else{let a=Math.max(s.length()*.65,.3);Pe.left=-a*r,Pe.right=a*r,Pe.top=a,Pe.bottom=-a;let o=Pe.getWorldDirection(new C).negate();Pe.position.copy(n).add(o.multiplyScalar(14)),Pe.updateProjectionMatrix()}it.update(),Vn=performance.now()+800}function mo(i){if(Ye?.active){Ye.navigate(i==="overview"?"vehicle":`zone:${i}`);return}Rn[i]&&(fn(Rn[i].detail&&A.zoneIsolate?"module":"iso"),A.focus=i,te("detail-focus").value=i,i!=="overview"&&(A.selected=Rn[i].selected,te("view-label").textContent=`${Rn[i].name.toUpperCase()} / ${A.zoneIsolate?"ISOLATED ZONE":"VEHICLE CONTEXT"}`),fo(),Di(!0),po(),Cn())}function Hy(i){if(Math.hypot(i.clientX-Number(yt.domElement.dataset.px),i.clientY-Number(yt.domElement.dataset.py))>5)return;let e=At.getBoundingClientRect(),t=new ie((i.clientX-e.left)/e.width*2-1,-(i.clientY-e.top)/e.height*2+1),n=new Wa;if(n.setFromCamera(t,Pe),Ye?.active){Ye.pick(n);return}let s=n.intersectObjects(Yc,!1).filter(r=>{let a=r.object;for(;a;){if(!a.visible)return!1;a=a.parent}return!A.section||r.point.z<=0});s.length&&Jc(s[0].object.userData.id)}function yd(i){if(requestAnimationFrame(yd),A.tab!=="model"||i-ro<1e3/30)return;let e=JSON.stringify(A)+[...Et].join(",");if(e!==md&&(md=e,Vn=i+1300),i>Vn&&!A.rotate&&!A.airflow&&!A.process&&!A.aero&&!A.scan){Vn&&(Vn=0,Di(!0),yt.render(Wt,Pe),Gc());return}let t=Math.min((i-ro)/1e3,.05)||.016;ro=i,fd++,Di(!1,t),it.autoRotate=A.rotate&&!ts,it.update();let n=A.demoSpeed*2;if((A.airflow||A.process)&&!ts)for(let s of qc)s.rotation.y+=t*n*1.6;jc(t,i,n),A.processPlay&&(ci+=t,ci>5.5&&(ci=0,ss((A.processStep+1)%6))),yt.render(Wt,Pe),fd%2===0&&Gc()}function Jc(i){if(Ye?.active){Ye.navigate(`assembly:${i}`);return}Xc[i]&&(A.selected=i,A.clickExplode&&(Et.has(i)?Et.delete(i):Et.add(i),["300","310","320","321","322","330","331","340","342","350"].includes(i)&&A.view!=="module"&&A.focus==="overview"&&fn("module"),is()),Cn())}function go(i){A.presentation=i,A.wire=i==="engineering",te("wire").checked=A.wire,document.querySelectorAll("[data-presentation]").forEach(e=>{e.classList.toggle("active",e.dataset.presentation===i),e.setAttribute("aria-pressed",String(e.dataset.presentation===i))}),es&&(es.material.opacity=i==="studio"?.12:.4),yt&&(yt.toneMappingExposure=i==="studio"?.92:1),ns(),Ye?.active&&Ye.draw()}function xd(i){Ci[i]&&(A.paint=i,document.querySelectorAll("[data-paint]").forEach(e=>{e.classList.toggle("active",e.dataset.paint===i),e.setAttribute("aria-pressed",String(e.dataset.paint===i))}),te("finish-name").textContent=Ci[i].name,_n.length&&Cn(),Ye?.active&&Ye.draw())}te("finish-options").innerHTML=Object.entries(Ci).map(([i,e])=>`<button data-paint="${i}" title="${e.name}" aria-label="${e.name}" style="background-color:${e.css}"></button>`).join("");document.querySelectorAll("[data-paint]").forEach(i=>i.onclick=()=>xd(i.dataset.paint));document.querySelectorAll("[data-presentation]").forEach(i=>i.onclick=()=>go(i.dataset.presentation));xd(A.paint);var kc=0,$t=null;function Vy(i){dn=new mt,St.add(dn);let e=[];for(let o of[-1,1])for(let l=0;l<4;l++){let c=o*(.65+l*.25),h=new Fn([ke(4,1.25,c*.65),ke(2.3,1.47,c*.9),ke(.5,1.55+l*.08,c*1.1),ke(-1.5,1.43,c*1.12),ke(-4,1.1,c*.75)]);e.push(h);let u=new at().setFromPoints(h.getPoints(60));dn.add(new ri(u,new an({color:gt.white,transparent:!0,opacity:.28})))}let t=new at;t.setAttribute("position",new Vt(new Float32Array(e.length*8*3),3));let n=new xr(t,new ks({color:gt.white,size:.035,transparent:!0,opacity:.7,depthWrite:!1,blending:Cs}));dn.add(n),dn.userData={curves:e,points:n},An=new mt,i.add(An);for(let o of[.19,.38,.57])for(let l=0;l<3;l++){let c=l*Math.PI*2/3,h=Array.from({length:41},(u,d)=>{let f=1.3-d*.067,g=c+(f<0&&f>-.45?f*.7:0);return ke(Math.cos(g)*o,f,Math.sin(g)*o)});An.add(new ri(new at().setFromPoints(h),new Gs({color:gt.cyan,transparent:!0,opacity:.25,dashSize:.07,gapSize:.05})))}let s=new at;s.setAttribute("position",new Vt(new Float32Array(120*3),3));let r=new xr(s,new ks({color:gt.cyan,size:.046,transparent:!0,opacity:.9,depthWrite:!1,blending:Cs}));An.add(r),An.userData.points=r,Pr(An,[1,-.7,0],[0,1,0],1.55,gt.amber),Pr(An,[-1,.7,0],[0,-1,0],1.55,gt.cyan),hn=new je(new si(4.8,3.2),new Nn({color:gt.cyan,transparent:!0,opacity:.035,side:sn,depthWrite:!1,blending:Cs})),hn.rotation.y=Math.PI/2,hn.position.y=1.3,St.add(hn);let a=new Ei(new Yi(hn.geometry),new an({color:gt.cyan,transparent:!0,opacity:.055}));hn.add(a),jc(0,0,0)}function jc(i,e,t){if(ts||(kc+=i*t),dn?.userData.points){let n=dn.userData.points.geometry.attributes.position,s=0;dn.userData.curves.forEach((r,a)=>{for(let o=0;o<8;o++){let l=r.getPoint((kc*.12+o/8+a*.03)%1);n.setXYZ(s++,l.x,l.y,l.z)}}),n.needsUpdate=!0}if(An?.userData.points){let n=An.userData.points.geometry.attributes.position;for(let s=0;s<120;s++){let r=(s/120+kc*.24)%1,a=1.35-r*2.8,o=.18+s%5*.1,l=s%17*Math.PI*2/17+(a<0&&a>-.45?a*.7:0);n.setXYZ(s,Math.cos(l)*o,a,Math.sin(l)*o)}n.needsUpdate=!0}hn&&(hn.position.x=ts?0:Math.sin(e*36e-5)*3.6)}function is(){let i=[...Et],e=i.length?`ASSEMBLY OPEN / ${i.map(t=>`REF ${t}`).join(" \xB7 ")} / MAINTENANCE VIEW`:"SELECT A PART TO DISASSEMBLE";te("operation-status").textContent=e,te("operation-status").classList.toggle("active",i.length>0)}function Kc(){Et.clear(),A.explode=0,A.processPlay=!1,te("process-play").setAttribute("aria-pressed","false"),te("process-play").textContent="Auto walkthrough",te("explode").value=0,te("explode-value").textContent="0%",is(),Cn()}var vd=[{name:"Electrical power",id:"210",title:"Energy becomes controlled motor power",text:'In the disclosure, stored electrical energy passes through protected distribution and motor-drive electronics to the fan motor; reserve management, thermal status and an independent inhibit path remain part of the architecture.<br><br>For a brushless electric-fan example, NASA describes an electronic speed controller converting DC input into an AC drive signal for the motor (<a href="https://ntrs.nasa.gov/api/citations/20230017299/downloads/Weinstein_SciTech2024_Final.pdf" target="_blank" rel="noopener noreferrer">NASA SUSAN electric-fan study</a>).',note:"Amber routes are conceptual electrical interfaces, not a wiring design."},{name:"Intake & duct",id:"103",title:"Air enters an open flow passage",text:'A fan or propeller develops thrust by changing the momentum of air, so the inlet, surrounding structure and available flow passage are part of the propulsion problem (<a href="https://www.grc.nasa.gov/WWW/k-12/VirtualAero/BottleRocket/airplane/propth.html" target="_blank" rel="noopener noreferrer">NASA propeller thrust</a>).',note:"Rounded lips are candidate shapes. Guards, nearby bodywork and adjacent fans may obstruct flow; no loss or efficiency result is modeled."},{name:"Motor & rotor",id:"320",title:"The motor turns the rotor",text:'The proposed electric motor supplies shaft work to the fan rotor rather than extracting power from combustion gases; NASA electric-fan research likewise identifies an electric motor as the fan-drive source (<a href="https://ntrs.nasa.gov/api/citations/20230017299/downloads/Weinstein_SciTech2024_Final.pdf" target="_blank" rel="noopener noreferrer">NASA SUSAN electric-fan study</a>).<br><br>In an ideal propeller-disk model, pressure rises across the disk and the change in air momentum determines thrust (<a href="https://www.grc.nasa.gov/WWW/k-12/VirtualAero/BottleRocket/airplane/propth.html" target="_blank" rel="noopener noreferrer">NASA propeller model</a>).',note:"The animated rotor is separate from the road tire. Its blade geometry, direction, count and motion rate are illustrative, not a motor specification."},{name:"Stationary vanes",id:"331",title:"The stator stays still",text:'Outlet guide vanes can turn the rotor\u2019s swirling exit flow toward a more axial direction, and the referenced NASA electric-fan study specifically discusses guide-vane geometry for reducing rotor-generated swirl (<a href="https://ntrs.nasa.gov/api/citations/20230017299/downloads/Weinstein_SciTech2024_Final.pdf" target="_blank" rel="noopener noreferrer">NASA SUSAN fan-stage design</a>).',note:"Only the rotor spins. The six guide vanes are a new candidate detail, not a validated stator or a hot-gas turbine."},{name:"Wake & reaction",id:"330",title:"Air momentum produces reaction thrust",text:'The general thrust equation accounts for the change in momentum flow and an exit-pressure contribution; it does not require burning fuel to describe a fan\u2019s reaction force (<a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/thrust-force/" target="_blank" rel="noopener noreferrer">NASA thrust force</a>).',note:"Cyan particles travel through the fan. The amber arrow marks the opposite reaction direction; lengths and particle density have no physical calibration."},{name:"Lift & direction",id:"340",title:"Orientation changes the thrust direction",text:"In the source concept, lift-oriented fans direct their flow downward, while the tilting B2 candidate changes fan orientation toward forward propulsion; this workbench illustrates those configurations without solving aircraft trim or transition dynamics.",note:"Air goes one way; reaction thrust acts the other. B1 has no solved forward-flight strategy. No configuration here proves hover, stability or fan-out controllability."}];function ss(i){A.processStep=(i+6)%6;let e=vd[A.processStep];ci=0,Et.clear(),A.selected=e.id,A.airflow=!0,te("airflow").checked=!0,A.routes=A.processStep===0,te("routes").checked=A.routes,A.explode=A.processStep===0?.16:.27,te("explode").value=String(A.explode*100),te("explode-value").textContent=`${Math.round(A.explode*100)}%`,A.processStep===0?(Et.add("210"),fn("iso")):A.processStep===5?(A.mode="flight",_o(),fn("iso"),Et.add("340")):(fn("module"),[2,3].includes(A.processStep)&&Et.add(e.id)),A.processStep===4&&(A.selected="330"),te("process-copy").innerHTML=`<h3>${e.title}</h3><p>${e.text}</p><p class="process-visual-note">${e.note}</p>`,document.querySelectorAll("[data-process-step]").forEach(t=>{t.classList.toggle("active",Number(t.dataset.processStep)===A.processStep),t.setAttribute("aria-current",Number(t.dataset.processStep)===A.processStep?"step":"false")}),Cn(),ns(),is()}function Gy(){Ye?.active&&Ye.exit(),!A.process&&($t={focus:A.focus,view:A.view,mode:A.mode,selected:A.selected,explode:A.explode,airflow:A.airflow,routes:A.routes,open:[...Et],presentation:A.presentation,callouts:A.callouts},go("engineering"),A.callouts=!0,te("callouts").checked=!0,A.process=!0,te("process-panel").hidden=!1,document.querySelector(".right-rail").classList.add("process-on"),te("fan-process").setAttribute("aria-pressed","true"),ss(0),innerWidth<=1e3&&te("process-panel").scrollIntoView({behavior:ts?"instant":"smooth",block:"start"}))}function Js(){A.process=!1,A.processPlay=!1,te("process-panel").hidden=!0,document.querySelector(".right-rail").classList.remove("process-on"),te("fan-process").setAttribute("aria-pressed","false"),te("process-play").setAttribute("aria-pressed","false"),te("process-play").textContent="Auto walkthrough",$t&&(Object.assign(A,{view:$t.view,mode:$t.mode,selected:$t.selected,explode:$t.explode,airflow:$t.airflow,routes:$t.routes,callouts:$t.callouts}),Et.clear(),$t.open.forEach(i=>Et.add(i)),te("callouts").checked=A.callouts,te("explode").value=String(A.explode*100),te("explode-value").textContent=`${Math.round(A.explode*100)}%`,te("airflow").checked=A.airflow,te("routes").checked=A.routes,go($t.presentation),_o(),fn(A.view),ns(),is()),$t?.focus&&$t.focus!=="overview"&&(mo($t.focus),A.selected=$t.selected,Cn())}te("click-explode").onclick=()=>{A.clickExplode=!A.clickExplode,te("click-explode").setAttribute("aria-pressed",String(A.clickExplode)),te("click-explode").textContent=A.clickExplode?"Click: disassemble":"Click: inspect only"};te("open-selected").onclick=()=>{Et.add(A.selected),["300","310","320","321","322","330","331","340","342","350"].includes(A.selected)&&A.focus==="overview"&&fn("module"),is(),Cn()};te("detail-focus").onchange=i=>mo(i.target.value);document.querySelectorAll("[data-zone]").forEach(i=>i.onclick=()=>mo(i.dataset.zone));te("zone-context").onclick=()=>{A.zoneIsolate=!A.zoneIsolate,mo(A.focus)};te("zone-fit").onclick=()=>Ye?.active?Ye.frame():A.focus==="overview"?fn("iso"):po();te("reassemble").onclick=Kc;te("fan-process").onclick=()=>A.process?Js():Gy();te("close-process").onclick=Js;te("process-steps").innerHTML=vd.map((i,e)=>`<button data-process-step="${e}"><span>0${e+1}</span>${i.name}</button>`).join("");document.querySelectorAll("[data-process-step]").forEach(i=>i.onclick=()=>ss(Number(i.dataset.processStep)));te("process-prev").onclick=()=>ss(A.processStep-1);te("process-next").onclick=()=>ss(A.processStep+1);te("process-play").onclick=()=>{A.processPlay=!A.processPlay,ci=0,te("process-play").setAttribute("aria-pressed",String(A.processPlay)),te("process-play").textContent=A.processPlay?"Pause walkthrough":"Auto walkthrough"};te("demo-speed").oninput=i=>{A.demoSpeed=Number(i.target.value)/100,te("demo-speed-value").textContent=`${i.target.value}%`};document.addEventListener("keydown",i=>{if(i.key==="Escape"&&A.tab==="model")if(Ye?.active){let e=Ye.nodes.get(Ye.current);e?.parent?Ye.navigate(e.parent):Ye.exit()}else A.process?Js():Kc()});function Qc(){let i=Iy[A.model];te("variant").innerHTML=i.map(t=>`<option value="${t[0]}">${t[1]}</option>`).join(""),te("variant").value=A.variant,te("variant-description").textContent=i.find(t=>t[0]===A.variant)[2],te("scene-title").textContent=A.model==="A"?"Sports-car design study":"Integrated-fan aircraft",te("model-code").textContent=`${A.model} / ${A.variant}`;let e=ho.filter(t=>A.model==="A"?t.id!=="360":!["300","350"].includes(t.id));te("assembly-tree").innerHTML=e.map(t=>`<button class="tree-item${t.id===A.selected?" active":""}" data-part="${t.id}"><small>${t.id}</small><span>${t.id==="340"&&A.model==="B"&&A.variant!=="B2"?"Fixed fan mounts":t.short}</span><i class="tree-dot"></i></button>`).join(""),te("part-count").textContent=String(e.length).padStart(2,"0"),document.querySelectorAll("[data-part]").forEach(t=>t.onclick=()=>Jc(t.dataset.part)),document.querySelectorAll("[data-model]").forEach(t=>{t.classList.toggle("selected",t.dataset.model===A.model),t.setAttribute("aria-pressed",String(t.dataset.model===A.model))}),_o()}function _o(){for(let e of document.querySelectorAll("[data-mode]")){let t=e.dataset.mode;e.disabled=A.model==="B"&&t==="road"||A.model==="A"&&t==="cruise"||A.variant==="B1"&&t==="cruise",e.classList.toggle("active",t===A.mode),e.setAttribute("aria-pressed",String(t===A.mode))}let i=A.mode==="road"?"Road styling / flight thrust inhibited":A.mode==="flight"?A.model==="A"?"Illustrative outboard lift pose / deployment unresolved":"Vertical-lift orientation / unvalidated":A.variant==="B3"?"Fixed lift + aft cruise fan / qualitative baseline":"Tilt-to-forward orientation / unvalidated";te("mode-note").textContent=i}document.querySelectorAll("[data-model]").forEach(i=>i.onclick=()=>{A.process&&Js(),A.model=i.dataset.model,A.variant=A.model==="A"?"A1":"B2",A.mode=A.model==="A"?"road":"flight",A.selected="110",Et.clear(),Qc(),$c(),fn("iso"),is(),A.process&&ss(A.processStep)});te("variant").onchange=i=>{A.variant=i.target.value,A.variant==="B1"&&A.mode==="cruise"&&(A.mode="flight"),Qc(),$c()};document.querySelectorAll("[data-mode]").forEach(i=>i.onclick=()=>{A.mode=i.dataset.mode,_o()});document.querySelectorAll("[data-view]").forEach(i=>i.onclick=()=>fn(i.dataset.view,{preserveZone:A.focus!=="overview"&&i.dataset.view!=="module"}));te("explode").oninput=i=>{A.explode=Number(i.target.value)/100,te("explode-value").textContent=`${i.target.value}%`,Cn()};for(let i of["wire","callouts","airflow","routes","loads","section","surface","aero","scan"])te(i).onchange=e=>{A[i]=e.target.checked,i==="wire"?go(A.wire?"engineering":"studio"):ns()};te("rotate").onclick=()=>{A.rotate=!A.rotate,te("rotate").setAttribute("aria-pressed",String(A.rotate))};te("reset").onclick=()=>{Ye?.active&&Ye.exit(),A.process&&Js(),A.zoneIsolate=!0,A.explode=0,te("explode").value=0,te("explode-value").textContent="0%",A.rotate=!1,te("rotate").setAttribute("aria-pressed","false"),A.section=!1,te("section").checked=!1,ns(),fn("iso"),Kc()};document.querySelectorAll("[data-tab]").forEach(i=>i.onclick=()=>{A.tab=i.dataset.tab,document.querySelectorAll("[data-tab]").forEach(e=>{e.classList.toggle("active",e===i),e.setAttribute("aria-current",e===i?"page":"false")});for(let e of["model","systems","notes","materials"])te(`${e}-panel`).hidden=e!==A.tab,te(`${e}-panel`).classList.toggle("active",e===A.tab);A.tab==="model"&&setTimeout(co,30)});var Wc=[["ROAD","Road mode","Road propulsion and steering enabled within verified limits. Fan / transformation hardware stowed and mechanically secured. Flight thrust inhibited."],["PREPARE","Transition preparation","Stopped in a designated test area; parking brake applied; restraints, battery and thermal limits checked; fan zones clear; self-tests complete."],["CONFIGURE","Configuration change","Actuators move only within an approved envelope. Independent lock confirmation and redundant position feedback must agree."],["READY","Flight-ready","Confirm configuration, valid sensors, reserve energy, environmental limits and no critical faults. A deliberate operator command is required to arm propulsion."],["FLIGHT","Flight mode","Bounded thrust allocation with continuous RPM, temperatures, battery, vibration, attitude and lock / actuator monitoring."],["LAND","Landing and road return","Follow a validated landing procedure. Weight-on-ground and stabilization must be confirmed before stowage or road propulsion is enabled."],["FAULT","Defined fault response","Stop or reverse transition only if a validated safe path exists; otherwise inhibit hazardous movement, alert the operator and preserve controllability to the extent supported. No universal power-cut-in-flight strategy is assumed."]];te("state-flow").innerHTML=Wc.map((i,e)=>`${e?'<span aria-hidden="true">\u2192</span>':""}<button data-state="${e}" class="${e===0?"active":""}">${i[0]}</button>`).join("");function Md(i){te("state-description").innerHTML=`<strong>${Wc[i][1]}.</strong> ${Wc[i][2]}`,document.querySelectorAll("[data-state]").forEach(e=>{e.classList.toggle("active",Number(e.dataset.state)===i),e.setAttribute("aria-pressed",String(Number(e.dataset.state)===i))})}document.querySelectorAll("[data-state]").forEach(i=>i.onclick=()=>Md(Number(i.dataset.state)));Md(0);var Wy=[["1\u20132","A road & flight perspectives","A \u2192 Road / Lift \u2192 3D"],["3","A consistent orthographic views","A \u2192 Top / Side / Front / Bottom"],["4","Exploded fan-wheel module","A \u2192 Fan detail \u2192 Separation"],["5","Fan-wheel airflow & section","A \u2192 Fan detail \u2192 Airflow / Cutaway"],["6","Road / flight state transitions","System architecture \u2192 State diagram"],["7","A functional power & control","System architecture \u2192 Schematics 01\u201302"],["8","B perspective & orthographics","B \u2192 3D / Top / Side / Front"],["9","B subsystem cutaway","B \u2192 Half-section / Separation"],["10","Tilt / pivot study","B2 \u2192 Lift / Forward \u2192 Joint 340"],["11","B control & thrust allocation","System architecture \u2192 Schematic 02"],["12","Landing, CG & structural paths","B \u2192 CG / Structural layer \u2192 Skids 360"],["13","Alternative modular embodiments","A1 / A2 / A3 and B1 / B2 / B3"]];te("drawing-index").innerHTML=Wy.map(i=>`<div><strong>FIG. ${i[0]}</strong><p>${i[1]}</p><small>${i[2]}</small></div>`).join("");window.render_game_to_text=()=>JSON.stringify({...A,cad:Ye?.debug(),openParts:[...Et],visibleZoneParts:[...new Set(_n.filter(i=>{let e=i;for(;e;){if(!e.visible)return!1;e=e.parent}return!0}).map(i=>i.userData.id))],geometricParts:Zc(),axes:"+X forward, +Y up, +Z port; concept units only"});window.export_cad_data=()=>Ye.data("vehicle");window.advanceTime=i=>{if(A.processPlay)for(ci+=i/1e3;ci>=5.5;){let e=ci-5.5;ss((A.processStep+1)%6),ci=e}Di(!0),jc(i/1e3,ro,A.demoSpeed*2),it.update(),yt.render(Wt,Pe),Gc()};Qc();try{Ly()}catch(i){console.error(i),te("loading").textContent="3D renderer unavailable. Try a browser with WebGL enabled. System architecture and design register remain available."}
/*! Bundled license information:

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2024 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
