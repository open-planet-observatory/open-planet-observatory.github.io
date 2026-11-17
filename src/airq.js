// ---------- Air quality on the 3D globe: fine particles (PM2.5) as drifting haze ----------
// The maintainer, 17 Nov 2026: track air quality, with the look of Climate TRACE's plume map (glowing orange haze moving over
// a clean globe), and switch the Space layers off while it is on. Data: data/air.json (collector/airquality.mjs), PM2.5 from
// the Copernicus CAMS global forecast via Open-Meteo, on a 4° grid, refreshed twice a day. A model's forecast, not
// measurements; the legend says so. What is drawn: glowing dots, more and brighter where the model has more PM2.5; they
// drift with the site's wind forecast (src/wind.js) when it has loaded. The dots are an illustration of the amount of haze in
// each area, not individual plumes or sources. Nothing is scored; the legend gives the model's values in µg/m³.
(function(){
const O=window.__obs;if(!O||!O.addLayer)return;const html=document.documentElement;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let DATA=null,DP=null;
const load=()=>DP||(DP=fetch('data/air.json?h='+Math.floor(Date.now()/36e5),{cache:'no-store'}).then(r=>r.ok?r.json():{failed:true,error:r.status===404?'not collected yet':'HTTP '+r.status})
 .catch(()=>({failed:true,error:'could not be loaded'})).then(j=>(DATA=j)));
// bilinear sample of the grid; NaN where the model gave no value
function sample(lon,lat){const g=DATA&&DATA.grid,V=DATA&&DATA.pm25;if(!g||!V)return NaN;const x=(((lon-g.lon0)%360)+360)%360/g.dlon,y=(g.lat0-lat)/-g.dlat;
 const x0=Math.floor(x)%g.nx,x1=(x0+1)%g.nx,y0=Math.max(0,Math.min(g.ny-1,Math.floor(y))),y1=Math.min(g.ny-1,y0+1),fx=x-Math.floor(x),fy=Math.max(0,Math.min(1,y-y0));
 const a=V[y0*g.nx+x0],b=V[y0*g.nx+x1],c=V[y1*g.nx+x0],d=V[y1*g.nx+x1];let s=0,w=0;[[a,(1-fx)*(1-fy)],[b,fx*(1-fy)],[c,(1-fx)*fy],[d,fx*fy]].forEach(([v,k])=>{if(v!=null){s+=v*k;w+=k}});return w>.2?s/w:NaN}
O.addLayer({id:'airq',name:'Air quality: fine particles (model)',color:'--c-airq',shape:'square',count:'3D only',on:false,group:'Weather & ocean'});
html.style.setProperty('--c-airq','#ff9a3c');
const chip=()=>document.getElementById('chip-airq');{const b=chip();if(b)b.title='Fine particles (PM2.5) near the ground from the Copernicus CAMS computer-model forecast, drawn as drifting haze: more and brighter dots mean more particles. Not measurements. Switches the Space layers off while it is on.'}
const isOn=()=>{const c=chip();return !!c&&c.getAttribute('aria-pressed')==='true'};
// the Space layers are switched off while the haze is on (the maintainer, 17 Nov 2026) and put back when it is switched off
let parked=[];
const spaceChips=()=>[...document.querySelectorAll('#chip-sat,#chip-gs,#chip-fb,.chip[data-group="Space"]')];
function parkSpace(on){if(on){parked=spaceChips().filter(c=>c.getAttribute('aria-pressed')==='true').map(c=>c.id);parked.forEach(id=>{const c=document.getElementById(id);if(c)c.click()})}
 else{parked.forEach(id=>{const c=document.getElementById(id);if(c&&c.getAttribute('aria-pressed')!=='true')c.click()});parked=[]}}
// colour by amount (µg/m³), the same in the legend
const STOPS=[[5,[255,214,130]],[15,[255,170,70]],[35,[255,120,40]],[75,[240,70,40]],[150,[190,40,90]]];
function col(v){if(v<=STOPS[0][0])return STOPS[0][1];for(let i=1;i<STOPS.length;i++)if(v<=STOPS[i][0]){const[a,ca]=STOPS[i-1],[b,cb]=STOPS[i],f=(v-a)/(b-a);return ca.map((x,j)=>Math.round(x+(cb[j]-x)*f))}return STOPS[STOPS.length-1][1]}
const fmtT=t=>{const d=new Date(t);return isNaN(d)?'':d.toLocaleString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' UTC'};
function legend(){if(!DATA)return'<span>Loading the air-quality forecast…</span>';
 if(DATA.failed)return`<span>The air-quality forecast could not be collected (${esc(DATA.error||'no data')}). Nothing is drawn rather than an older forecast.</span>`;
 const part=DATA.have<DATA.pm25.length?` ${Math.round(100*DATA.have/DATA.pm25.length)}% of the globe collected so far; the rest fills in over the next runs.`:'';
 return`<span>Each glowing dot stands for fine particles (PM2.5) in the air near the ground: more and brighter dots, more particles. They drift with the wind forecast.${part}</span>
 <div class="fc-bar" style="background:linear-gradient(90deg,${STOPS.map(([v,c],i)=>`rgb(${c}) ${i/(STOPS.length-1)*100}%`).join(',')})"></div><div class="fc-ticks"><span>5</span><span>15</span><span>35</span><span>75</span><span>150+ µg/m³</span></div>
 <span>For scale: the World Health Organization's guideline for a 24-hour average is 15 µg/m³ (<a href="https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health" target="_blank" rel="noopener">WHO</a>).</span>`+
 (window.owlSrc&&window.OWL_SRC&&window.OWL_SRC.cams?window.owlSrc('cams',{t:DATA.built}):`<span>Source: <a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noopener">Copernicus CAMS</a> global forecast via <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0) · collected ${esc(fmtT(DATA.built))}. A model's forecast on a 4° grid, not measurements.</span>`)}
// ----- the haze: dots on a 2D canvas over the Cesium globe (same projection method as the wind streaks) -----
let H=null;
function haze(viewer,C){const scene=viewer.scene,host=viewer.container,cv=document.createElement('canvas');cv.className='aq-haze';cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';host.appendChild(cv);
 const ctx=cv.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,RAD=Math.PI/180,A=6378137,E2=0.00669437999014,SPEED=.005;
 let on=false,P=[],dpr=1,wind=null;const VP=new C.Matrix4();let m=VP,cx=0,cy=0,cz=0;const q=[0,0,0],o=[0,0];
 const count=()=>innerWidth<700?1600:5200;
 const ecef=(lon,lat)=>{const la=lat*RAD,lo=lon*RAD,sl=Math.sin(la),cl=Math.cos(la),n=A/Math.sqrt(1-E2*sl*sl);q[0]=n*cl*Math.cos(lo);q[1]=n*cl*Math.sin(lo);q[2]=n*(1-E2)*sl};
 function proj(lon,lat){ecef(lon,lat);const x=q[0],y=q[1],z=q[2];if((cx-x)*x+(cy-y)*y+(cz-z)*z/(1-E2)<=0)return false;const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return false;
  const nx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,ny=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;if(nx<-1.1||nx>1.1||ny<-1.1||ny>1.1)return false;o[0]=(nx+1)/2*cv.width;o[1]=(1-ny)/2*cv.height;return true}
 // a new dot lands where the model has particles: a random place in view is kept with a chance that rises with PM2.5
 function spawn(p){p.dead=true;for(let t=0;t<3;t++){let lon,lat;const r=Math.random()<.85?scene.camera.pickEllipsoid(new C.Cartesian2(Math.random()*cv.clientWidth,Math.random()*cv.clientHeight)):null;
   if(r){const g=C.Cartographic.fromCartesian(r);lon=C.Math.toDegrees(g.longitude);lat=C.Math.toDegrees(g.latitude)}else{lon=Math.random()*360-180;lat=Math.asin(2*Math.random()-1)/RAD}
   const v=sample(lon,lat);if(!isFinite(v)||Math.random()>Math.min(1,Math.max(0,(v-4)/40)))continue;
   p.lon=lon;p.lat=lat;p.v=v;p.age=0;p.life=reduce?1e9:160+Math.random()*220;p.c=col(v);p.s=(1.3+Math.min(2.2,v/45))*(.7+Math.random()*.6);p.dead=false;return}}
 function size(){const d=Math.min(2,devicePixelRatio||1),w=Math.round(cv.clientWidth*d),h=Math.round(cv.clientHeight*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}dpr=d}
 function draw(){if(!on||!DATA||DATA.failed||document.hidden||html.classList.contains('map2d')||html.classList.contains('game-on')){if(cv.width)ctx.clearRect(0,0,cv.width,cv.height);return}size();
  const c=scene.camera;C.Matrix4.multiply(c.frustum.projectionMatrix,c.viewMatrix,VP);m=VP;cx=c.positionWC.x;cy=c.positionWC.y;cz=c.positionWC.z;
  const hgt=Math.max(1e5,c.positionCartographic.height),f=SPEED*Math.min(1.4,Math.max(.01,hgt/1.6e7));
  while(P.length<count())P.push({dead:true});if(P.length>count())P.length=count();
  ctx.clearRect(0,0,cv.width,cv.height);ctx.globalCompositeOperation='lighter';let tries=0;
  for(const p of P){if(p.dead||p.age++>=p.life){if(tries++<260)spawn(p);if(p.dead)continue}
   if(!reduce&&wind){const s=wind(p.lon,p.lat);if(isFinite(s[0])){const k=Math.max(.15,Math.cos(p.lat*RAD));p.lon+=s[0]*f/k;p.lat+=s[1]*f;if(p.lat>89||p.lat<-89){p.dead=true;continue}}}
   if(!proj(p.lon,p.lat))continue;const a=reduce?1:Math.min(1,p.age/30,(p.life-p.age)/40),s=p.s*dpr;
   ctx.fillStyle=`rgba(${p.c[0]},${p.c[1]},${p.c[2]},${(.16*a).toFixed(3)})`;ctx.beginPath();ctx.arc(o[0],o[1],s*2.6,0,6.3);ctx.fill();
   ctx.fillStyle=`rgba(${p.c[0]},${p.c[1]},${p.c[2]},${(.85*a).toFixed(3)})`;ctx.fillRect(o[0]-s/2,o[1]-s/2,s,s)}
  ctx.globalCompositeOperation='source-over'}
 scene.postRender.addEventListener(()=>{try{draw()}catch(e){/* never stop the globe's render loop */}});
 return{set(v){on=v;cv.hidden=!v;if(!v){P.length=0;ctx.clearRect(0,0,cv.width,cv.height)}},wind(f){wind=f},reset(){P.length=0},stats:()=>({n:P.filter(p=>!p.dead).length,on})}}
async function sync(){const g=window.__obs3d,C=window.Cesium;const on=isOn();
 let lg=document.getElementById('lg-airq');const c=chip();if(on&&!lg&&c){lg=document.createElement('div');lg.id='lg-airq';lg.className='wx-legend fc-legend';c.after(lg)}
 if(lg){lg.hidden=!on;if(on)lg.innerHTML=legend()}
 if(on!==sync.was){sync.was=on;parkSpace(on)}
 if(!g||!C){if(on)setTimeout(sync,800);return}
 if(!on){if(H)H.set(false);return}
 await load();if(lg&&isOn())lg.innerHTML=legend();if(!isOn())return;if(DATA.failed){if(H)H.set(false);return}
 if(!H)H=haze(g.viewer,C);H.set(true);
 try{const W=window.OwlWind;if(W&&W.ready){await W.ready();const fl=await W.field();if(fl&&fl.sample)H.wind(fl.sample)}}catch(e){}}
new MutationObserver(ms=>{if(ms.some(x=>x.target.id==='chip-airq'))sync()}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
if(window.OwlWind&&window.OwlWind.onChange)window.OwlWind.onChange(()=>{if(isOn())sync()});
window.OwlAir={sample,load,stats:()=>H&&H.stats(),data:()=>DATA};
if(isOn())sync();
})();
