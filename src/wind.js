// ---------- Moving wind and temperature forecast on the 3D globe (NOAA GFS model, via PacIOOS ERDDAP) ----------
// Data: data/fcst/index.json + f0..f8.bin, written by collector/forecast.mjs every 6 hours. 1° grid, nine times from the
// current 6-hour step to +48 h. Each file: three byte planes (u, v at 10 m in m/s; temperature at 2 m in °C), 0.5 steps.
// Wind: light streaks drift with the model's wind; their speed on screen follows the wind speed. Temperature: a colour
// image under the streaks. Both are the model's forecast for the time shown, never measurements; nothing is scored.
// If the last collection failed, nothing is drawn and the legend says so (an old forecast is never shown as current).
// Used by globe3d.js (WX entries 'wx-wind' and 'wx-temp') and by the Observation Deck wind panel (OwlWind.field()).
(function(){
const BASE='data/fcst/';const N=360*181;
let IDX=null,IDXP=null,k=0;const FR={};const subs=new Set();
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function index(){return IDXP||(IDXP=fetch(BASE+'index.json?h='+Math.floor(Date.now()/36e5)).then(r=>r.ok?r.json():{failed:true,error:'HTTP '+r.status,frames:[]})
 .catch(e=>({failed:true,error:'could not be loaded',frames:[]})).then(j=>{IDX=j;if(j.frames&&j.frames.length){const now=Date.now();
   // start at the forecast time nearest to now
   let best=0;j.frames.forEach((f,i)=>{if(Math.abs(new Date(f.t)-now)<Math.abs(new Date(j.frames[best].t)-now))best=i});k=best}return j}))}
async function frame(i){if(FR[i])return FR[i];const f=IDX.frames[i];const r=await fetch('data/'+f.f+'?v='+encodeURIComponent(IDX.from||''));if(!r.ok)throw new Error('HTTP '+r.status);
 const b=new Uint8Array(await r.arrayBuffer());if(b.length!==3*N)throw new Error('unexpected size');return FR[i]=b}
// bilinear sample: lon -180..180 or 0..360, lat -90..90 -> [u, v, t] (NaN where the model gave no value)
function sample(b,lon,lat){const x=((lon%360)+360)%360,y=90-lat;const x0=Math.floor(x),y0=Math.max(0,Math.min(179,Math.floor(y))),fx=x-x0,fy=Math.max(0,Math.min(1,y-y0));
 const x1=(x0+1)%360,i00=y0*360+x0,i10=y0*360+x1,i01=(y0+1)*360+x0,i11=(y0+1)*360+x1;
 const g=(p,off)=>{const a=b[p+i00],c=b[p+i10],d=b[p+i01],e=b[p+i11];if(a===255||c===255||d===255||e===255)return NaN;
  return ((a*(1-fx)+c*fx)*(1-fy)+(d*(1-fx)+e*fx)*fy)/2-off};
 return [g(0,64),g(N,64),g(2*N,70)]}
// temperature colours (°C), the same in the legend
const STOPS=[[-40,[110,64,170]],[-25,[63,81,181]],[-10,[66,165,245]],[0,[178,235,242]],[10,[156,204,101]],[20,[255,213,79]],[30,[245,124,0]],[40,[183,28,28]]];
function tcol(t){if(!isFinite(t))return null;if(t<=STOPS[0][0])return STOPS[0][1];for(let i=1;i<STOPS.length;i++)if(t<=STOPS[i][0]){const [a,ca]=STOPS[i-1],[b,cb]=STOPS[i],f=(t-a)/(b-a);return ca.map((v,j)=>Math.round(v+(cb[j]-v)*f))}return STOPS[STOPS.length-1][1]}
function tempCanvas(b,w=720,h=360){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),im=x.createImageData(w,h);
 for(let j=0;j<h;j++){const lat=90-(j+.5)*180/h;for(let i=0;i<w;i++){const lon=-180+(i+.5)*360/w;const q=tcol(sample(b,lon,lat)[2]),p=(j*w+i)*4;if(q){im.data[p]=q[0];im.data[p+1]=q[1];im.data[p+2]=q[2];im.data[p+3]=255}}}
 x.putImageData(im,0,0);return c}
const fmtT=t=>{const d=new Date(t);if(isNaN(d))return'';const u=d.toLocaleString('en-US',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'})+' UTC';
 let l='';try{l=d.toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'})}catch(e){}return{u,l}};
const label=()=>{const f=IDX&&IDX.frames&&IDX.frames[k];if(!f)return'';const t=fmtT(f.t);return`NOAA GFS model forecast for ${t.u}${t.l?` (${t.l} your time)`:''}`};
// one time control, shared by the globe and the deck
function setStep(i){if(!IDX||!IDX.frames||!IDX.frames.length)return;k=Math.max(0,Math.min(IDX.frames.length-1,i));
 frame(k).then(b=>subs.forEach(f=>{try{f(b,k)}catch(e){}})).catch(e=>subs.forEach(f=>{try{f(null,k,e)}catch(x){}}));
 document.querySelectorAll('.fc-time').forEach(el=>{el.textContent=label()});document.querySelectorAll('.fc-slider').forEach(s=>{if(+s.value!==k)s.value=k})}
// the legend + time slider block (HTML), used under the layer chips and in the deck
function legend(kind){if(!IDX)return'<span>Loading the forecast…</span>';
 if(IDX.failed||!IDX.frames||!IDX.frames.length)return`<span>The forecast could not be collected on the last run (${esc(IDX.error||'no data')}). Nothing is drawn rather than an older forecast.</span>`;
 const n=IDX.frames.length,h=IDX.stepHours||6;
 const bar=kind==='temp'?`<div class="fc-bar" style="background:linear-gradient(90deg,${STOPS.map(([t,c])=>`rgb(${c}) ${(t+40)/80*100}%`).join(',')})"></div><div class="fc-ticks"><span>−40 °C</span><span>−20</span><span>0</span><span>20</span><span>40 °C</span></div><div class="fc-ticks"><span>−40 °F</span><span>−4</span><span>32</span><span>68</span><span>104 °F</span></div>`
  :'<span>Streaks drift with the model’s wind at 10 m above the ground; faster streaks mean stronger wind.</span>';
 return`${bar}<label class="fc-step"><span class="fc-time">${esc(label())}</span><input type="range" class="fc-slider" min="0" max="${n-1}" step="1" value="${k}" aria-label="Forecast time, ${h}-hour steps"></label>`+
  (window.owlSrc?window.owlSrc('gfs',{t:IDX.built}):'')}
document.addEventListener('input',e=>{if(e.target.classList&&e.target.classList.contains('fc-slider'))setStep(+e.target.value)});

// ----- particles on a 2D canvas laid over the Cesium globe -----
// Each streak keeps its last positions in longitude/latitude and is redrawn every frame through the camera's own
// matrices, so streaks stay in place while the globe turns. Projection is done here (not through Cesium per point) so
// several thousand streaks cost a few milliseconds.
function particles(viewer,C){const scene=viewer.scene,host=viewer.container;const cv=document.createElement('canvas');cv.className='fc-wind';
 cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';host.appendChild(cv);const ctx=cv.getContext('2d');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const HL=12,EVERY=4,RAD=Math.PI/180,A=6378137,E2=0.00669437999014;
 let on=false,field=null,P=[],dpr=1,tick=0;const VP=new C.Matrix4();let m=VP,cx=0,cy=0,cz=0;
 const count=()=>innerWidth<700?1000:3500;
 const ecef=(lon,lat,o)=>{const la=lat*RAD,lo=lon*RAD,sl=Math.sin(la),cl=Math.cos(la),n=A/Math.sqrt(1-E2*sl*sl);o[0]=n*cl*Math.cos(lo);o[1]=n*cl*Math.sin(lo);o[2]=n*(1-E2)*sl;return o};
 const q=[0,0,0];
 // -> [x,y] in canvas pixels, or null when behind the globe or outside the view
 function proj(lon,lat,o){ecef(lon,lat,q);const x=q[0],y=q[1],z=q[2];if((cx-x)*x+(cy-y)*y+(cz-z)*z/(1-E2)<=0)return null;
  const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return null;const nx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,ny=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;
  if(nx<-1.2||nx>1.2||ny<-1.2||ny>1.2)return null;o[0]=(nx+1)/2*cv.width;o[1]=(1-ny)/2*cv.height;return o}
 function spawn(p){let lon,lat;const r=Math.random()<.85?scene.camera.pickEllipsoid(new C.Cartesian2(Math.random()*cv.clientWidth,Math.random()*cv.clientHeight)):null;
  if(r){const g=C.Cartographic.fromCartesian(r);lon=C.Math.toDegrees(g.longitude);lat=C.Math.toDegrees(g.latitude)}else{lon=Math.random()*360-180;lat=Math.asin(2*Math.random()-1)/RAD}
  p.h=[lon,lat];p.lon=lon;p.lat=lat;p.age=0;p.life=(reduce?1:120+Math.random()*120);p.spd=0;return p}
 function step(p,f){const s=sample(field,p.lon,p.lat);if(!isFinite(s[0])){p.age=p.life;return}const c=Math.max(.15,Math.cos(p.lat*RAD));
  p.lon+=s[0]*f/c;p.lat+=s[1]*f;p.spd=Math.hypot(s[0],s[1]);if(p.lat>89.5||p.lat<-89.5)p.age=p.life}
 const push=p=>{p.h.push(p.lon,p.lat);if(p.h.length>2*HL)p.h.splice(0,2)};
 function size(){const d=Math.min(2,devicePixelRatio||1),w=Math.round(cv.clientWidth*d),h=Math.round(cv.clientHeight*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}dpr=d}
 const BUCKETS=[.25,.45,.7,.95];const a=[0,0],b=[0,0];
 function draw(){if(!on||!field||document.hidden||document.documentElement.classList.contains('map2d')){if(on)ctx.clearRect(0,0,cv.width,cv.height);return}size();
  const c=scene.camera;C.Matrix4.multiply(c.frustum.projectionMatrix,c.viewMatrix,VP);m=VP;cx=c.positionWC.x;cy=c.positionWC.y;cz=c.positionWC.z;
  const hgt=Math.max(1e5,c.positionCartographic.height),f=.012*Math.min(1.4,Math.max(.01,hgt/1.6e7));tick++;
  while(P.length<count()){const p=spawn({});if(reduce){for(let i=0;i<HL;i++){step(p,f*EVERY);push(p)}}P.push(p)}if(P.length>count())P.length=count();
  ctx.clearRect(0,0,cv.width,cv.height);
  const head=BUCKETS.map(()=>new Path2D()),tail=BUCKETS.map(()=>new Path2D());
  for(const p of P){if(!reduce){if(p.age++>=p.life){spawn(p);continue}step(p,f);if(tick%EVERY===0)push(p)}
   const h=p.h,n=h.length/2,bi=Math.min(3,Math.floor(p.spd/5));let have=false;
   for(let i=0;i<=n;i++){const lon=i<n?h[2*i]:p.lon,lat=i<n?h[2*i+1]:p.lat;const r=proj(lon,lat,b);
    if(r&&have&&Math.abs(b[0]-a[0])<60*dpr&&Math.abs(b[1]-a[1])<60*dpr){const pa=i<n/2?tail[bi]:head[bi];pa.moveTo(a[0],a[1]);pa.lineTo(b[0],b[1])}
    if(r){a[0]=b[0];a[1]=b[1];have=true}else have=false}}
  ctx.lineCap='round';ctx.lineWidth=1.5*dpr;
  BUCKETS.forEach((al,i)=>{ctx.strokeStyle=`rgba(255,255,255,${al*.4})`;ctx.stroke(tail[i]);ctx.strokeStyle=`rgba(255,255,255,${al})`;ctx.stroke(head[i])})}
 scene.postRender.addEventListener(draw);
 return{set(v){on=v;cv.hidden=!v;if(!v)ctx.clearRect(0,0,cv.width,cv.height)},field(b){field=b;P.length=0},stats:()=>({n:P.length,on,field:!!field,w:cv.width,h:cv.height,cw:scene.canvas.width,ch:scene.canvas.height}),_proj:(lon,lat)=>proj(lon,lat,[0,0])}}

// ----- what globe3d.js calls -----
let viewer=null,C=null,pt=null,tLayer=null,tFor=-1,want={wind:false,temp:false};
async function sync(){if(!viewer)return;const need=want.wind||want.temp;if(!need){if(pt)pt.set(false);if(tLayer)tLayer.show=false;return}
 const j=await index();if(j.failed||!j.frames||!j.frames.length){if(pt)pt.set(false);if(tLayer)tLayer.show=false;return}
 let b;try{b=await frame(k)}catch(e){return}
 if(want.wind){if(!pt)pt=particles(viewer,C);pt.field(b);pt.set(true)}else if(pt)pt.set(false);
 if(want.temp){if(tFor!==k||!tLayer){const url=tempCanvas(b).toDataURL('image/png');const prov=await C.SingleTileImageryProvider.fromUrl(url,{rectangle:C.Rectangle.fromDegrees(-180,-90,180,90),credit:new C.Credit('NOAA GFS forecast via PacIOOS',false)});
   const L=new C.ImageryLayer(prov,{alpha:.7});if(tLayer)viewer.imageryLayers.remove(tLayer,true);viewer.imageryLayers.add(L);tLayer=L;tFor=k;
   // keep the night shade and labels above the temperature colours
   if(window.__obs3d&&window.__obs3d.raiseTop)window.__obs3d.raiseTop()}
  tLayer.show=true}else if(tLayer)tLayer.show=false}
subs.add(()=>sync());
window.OwlWind={
 attach(v,c){viewer=v;C=c},
 set(kind,v){want[kind]=!!v;return sync()},
 legend(kind){return legend(kind)},
 ready(){return index()},
 index:()=>IDX,
 // for the Observation Deck: the frame shown now and a sampler
 field(){return IDX&&!IDX.failed&&IDX.frames&&IDX.frames.length?frame(k).then(b=>({b,i:k,label:label(),sample:(lon,lat)=>sample(b,lon,lat)})):Promise.resolve(null)},
 onChange(f){subs.add(f);return()=>subs.delete(f)},
 tcol,label,setStep,_sample:sample,_pt:()=>pt};
})();
