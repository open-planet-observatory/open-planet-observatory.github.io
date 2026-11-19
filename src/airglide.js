// ---------- Scheduled airliners on the 3D globe, gliding ----------
// The maintainer, 19 Nov 2026: let visitors feel air traffic moving, without showing anything more than the site already
// publishes. Data: data/airliners.json (collector/airliners.mjs), the same snapshot the Observation Deck's Airliner scope uses:
// scheduled airline flights near six busy hubs, from adsb.lol (ODbL 1.0), at least 15 minutes old, positions rounded to about
// 10 km, airline code and aircraft type only. No registrations, flight numbers or transponder addresses exist in the file.
// What is drawn: one mark per aircraft at its recorded position. Each mark then glides along its recorded heading at its
// recorded speed for ten minutes, fades and starts again from the recorded position. The glide is a drawing by this site, not
// a live position; the legend says so and gives the snapshot's own time. A snapshot older than four hours, or a failed one,
// is not drawn at all (an old snapshot is never passed off as current).
(function(){
const O=window.__obs;if(!O||!O.addLayer)return;const html=document.documentElement;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const STALE_MIN=240,LOOP=600,KT=0.514444; /* minutes; seconds of glide; knots to m/s */
let DATA=null,DP=null,DT=0;
const load=()=>{if(DP&&Date.now()-DT<3e5)return DP;DT=Date.now();return DP=fetch('data/airliners.json?t='+Math.floor(Date.now()/3e5),{cache:'no-store'}).then(r=>r.ok?r.json():{failed:true,reason:r.status===404?'not collected yet':'HTTP '+r.status})
 .catch(()=>({failed:true,reason:'could not be loaded'})).then(j=>(DATA=j))};
const ageMin=()=>DATA&&DATA.asOf?(Date.now()-Date.parse(DATA.asOf))/6e4:Infinity;
const usable=()=>!!(DATA&&!DATA.failed&&Array.isArray(DATA.planes)&&DATA.planes.length&&ageMin()<=STALE_MIN);
O.addLayer({id:'airl',name:'Scheduled airliners near six hubs (delayed)',color:'--c-airl',shape:'triangle',count:'3D only',on:false,group:'People & systems'});
html.style.setProperty('--c-airl','#8fd3ff');
const chip=()=>document.getElementById('chip-airl');{const b=chip();if(b)b.title='Scheduled airline flights near London, Frankfurt, New York, Chicago, Atlanta and Los Angeles, as recorded at least 15 minutes ago and rounded to about 10 km. Airline code and aircraft type only. The gliding is drawn by this site and is not a live position.'}
const isOn=()=>{const c=chip();return !!c&&c.getAttribute('aria-pressed')==='true'};
const fmtT=t=>{const d=new Date(t);return isNaN(d)?'':d.toLocaleString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' UTC'};
function legend(){if(!DATA)return'<span>Loading the airliner snapshot…</span>';
 if(DATA.failed)return`<span>No airliner snapshot to show (${esc(DATA.error||DATA.reason||'adsb.lol did not answer')}). Nothing is drawn in its place.</span>`;
 const a=ageMin();if(a>STALE_MIN)return`<span>The last airliner snapshot is from ${esc(fmtT(DATA.asOf))}, more than ${STALE_MIN/60} hours ago, so it is not drawn.</span>`;
 const regs=(DATA.regions||[]).filter(r=>r.ok).map(r=>r.name);
 return`<span><b>${DATA.planes.length}</b> scheduled airliners near ${esc(regs.join(', ')||'the hubs')}, as recorded at <b>${esc(fmtT(DATA.asOf))}</b> (${Math.round(a)} minutes ago; never less than 15). Positions are rounded to about 10 km.</span>
 <span><b>The movement is drawn by this site.</b> Each mark glides along its recorded heading at its recorded speed for ten minutes, then starts again. It is not a live position.</span>
 <span>Only scheduled airline flights: airline code and aircraft type. No private, business, government or military aircraft, no registrations or flight numbers.</span>`+
 (window.owlSrc&&window.OWL_SRC&&window.OWL_SRC.adsblol?window.owlSrc('adsblol',{t:DATA.asOf}):`<span>Source: <a href="https://www.adsb.lol/" target="_blank" rel="noopener">adsb.lol</a> (Open Database License, ODbL 1.0) · recorded ${esc(fmtT(DATA.asOf))}.</span>`)}
// ----- the marks: a 2D canvas over the Cesium globe (same projection method as the wind streaks and the haze) -----
let L=null;
function layer(viewer,C){const scene=viewer.scene,host=viewer.container,cv=document.createElement('canvas');cv.className='al-glide';cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';host.appendChild(cv);
 const tip=document.createElement('div');tip.className='al-tip';tip.hidden=true;tip.style.cssText='position:absolute;z-index:3;pointer-events:none;padding:5px 8px;border-radius:8px;font-size:.74rem;line-height:1.35;background:rgb(10 14 22 / .9);color:#eaf2ff;border:1px solid rgb(143 211 255 / .4);max-width:240px';host.appendChild(tip);
 const ctx=cv.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,RAD=Math.PI/180,A=6378137,E2=0.00669437999014;
 let on=false,dpr=1,t0=performance.now(),S=[],mx=-1,my=-1;const VP=new C.Matrix4();let m=VP,cx=0,cy=0,cz=0;const q=[0,0,0],o=[0,0];
 const ecef=(lon,lat)=>{const la=lat*RAD,lo=lon*RAD,sl=Math.sin(la),cl=Math.cos(la),n=A/Math.sqrt(1-E2*sl*sl);q[0]=n*cl*Math.cos(lo);q[1]=n*cl*Math.sin(lo);q[2]=n*(1-E2)*sl};
 function proj(lon,lat){ecef(lon,lat);const x=q[0],y=q[1],z=q[2];if((cx-x)*x+(cy-y)*y+(cz-z)*z/(1-E2)<=0)return false;const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return false;
  const nx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,ny=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;if(nx<-1.05||nx>1.05||ny<-1.05||ny>1.05)return false;o[0]=(nx+1)/2*cv.width;o[1]=(1-ny)/2*cv.height;return true}
 // where a mark is after gliding d metres along its heading (a short great-circle step is close enough over ten minutes)
 function ahead(lat,lon,trk,d){const a=d/A,la=lat*RAD,b=trk*RAD,la2=Math.asin(Math.sin(la)*Math.cos(a)+Math.cos(la)*Math.sin(a)*Math.cos(b));
  return[la2/RAD,lon+Math.atan2(Math.sin(b)*Math.sin(a)*Math.cos(la),Math.cos(a)-Math.sin(la)*Math.sin(la2))/RAD]}
 function size(){const d=Math.min(2,devicePixelRatio||1),w=Math.round(cv.clientWidth*d),h=Math.round(cv.clientHeight*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}dpr=d}
 function draw(){const hc=html.classList;if(!on||!usable()||document.hidden||hc.contains('map2d')||hc.contains('game-on')||hc.contains('moon-on')||(window.OwlLightning&&window.OwlLightning.on)){if(cv.width)ctx.clearRect(0,0,cv.width,cv.height);S.length=0;tip.hidden=true;return}size();
  const c=scene.camera;C.Matrix4.multiply(c.frustum.projectionMatrix,c.viewMatrix,VP);m=VP;cx=c.positionWC.x;cy=c.positionWC.y;cz=c.positionWC.z;
  const t=reduce?0:((performance.now()-t0)/1000)%LOOP,fade=reduce?1:Math.min(1,t/2,(LOOP-t)/2);
  ctx.clearRect(0,0,cv.width,cv.height);S.length=0;const col='143,211,255';
  for(const p of DATA.planes){const lat=p[0],lon=p[1],trk=p[3],gs=p[4];const moving=trk!=null&&gs!=null&&!reduce;
   const now=moving?ahead(lat,lon,trk,gs*KT*t):[lat,lon];if(!proj(now[1],now[0]))continue;const x=o[0],y=o[1];
   // the trail back to the recorded position, and the heading on screen from a point a little ahead
   let ang=null;if(trk!=null){const f=ahead(now[0],now[1],trk,20000);if(proj(f[1],f[0]))ang=Math.atan2(o[1]-y,o[0]-x)}
   if(moving&&t>1&&proj(lon,lat)){const g=ctx.createLinearGradient(o[0],o[1],x,y);g.addColorStop(0,`rgba(${col},0)`);g.addColorStop(1,`rgba(${col},${(.45*fade).toFixed(3)})`);ctx.strokeStyle=g;ctx.lineWidth=1.2*dpr;ctx.beginPath();ctx.moveTo(o[0],o[1]);ctx.lineTo(x,y);ctx.stroke()}
   const s=4.2*dpr;ctx.fillStyle=`rgba(${col},${(.95*fade).toFixed(3)})`;ctx.beginPath();
   if(ang==null)ctx.arc(x,y,s*.55,0,6.3);else{const ca=Math.cos(ang),sa=Math.sin(ang);ctx.moveTo(x+ca*s*1.5,y+sa*s*1.5);ctx.lineTo(x-ca*s-sa*s*.8,y-sa*s+ca*s*.8);ctx.lineTo(x-ca*s*.4,y-sa*s*.4);ctx.lineTo(x-ca*s+sa*s*.8,y-sa*s-ca*s*.8);ctx.closePath()}
   ctx.fill();S.push([x/dpr,y/dpr,p])}
  // hover card: the nearest mark within 12 px
  if(mx>=0){let best=null,bd=144;for(const k of S){const d=(k[0]-mx)**2+(k[1]-my)**2;if(d<bd){bd=d;best=k}}
   if(best){const p=best[2];tip.innerHTML=`<b>${esc(p[5]||'Airline')}${p[6]?' · '+esc(p[6]):''}</b><br>${p[2]!=null?Number(p[2]).toLocaleString('en-US')+' ft':''}${p[4]!=null?' · '+p[4]+' kt':''}${p[3]!=null?' · heading '+p[3]+'°':''}<br><span style="opacity:.75">Recorded ${esc(fmtT(DATA.asOf))}, rounded to about 10 km. The glide is drawn, not live.</span>`;
    tip.style.left=Math.min(cv.clientWidth-250,best[0]+12)+'px';tip.style.top=Math.max(4,best[1]-10)+'px';tip.hidden=false}else tip.hidden=true}else tip.hidden=true}
 scene.postRender.addEventListener(()=>{try{draw()}catch(e){/* never stop the globe's render loop */}});
 host.addEventListener('pointermove',e=>{if(!on)return;const r=host.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});host.addEventListener('pointerleave',()=>{mx=my=-1});
 return{set(v){on=v;cv.hidden=!v;if(v)t0=performance.now();else{ctx.clearRect(0,0,cv.width,cv.height);tip.hidden=true}},stats:()=>({on,drawn:S.length,planes:DATA&&DATA.planes?DATA.planes.length:0,t:((performance.now()-t0)/1000)%LOOP}),_ahead:ahead}}
async function sync(){const g=window.__obs3d,C=window.Cesium;const on=isOn();
 let lg=document.getElementById('lg-airl');const c=chip();if(on&&!lg&&c){lg=document.createElement('div');lg.id='lg-airl';lg.className='wx-legend fc-legend';c.after(lg)}
 if(lg){lg.hidden=!on;if(on)lg.innerHTML=legend()}
 if(!g||!C){if(on)setTimeout(sync,800);return}
 if(!on){if(L)L.set(false);return}
 await load();if(lg&&isOn())lg.innerHTML=legend();if(!isOn())return;
 const ct=c&&c.querySelector('.ct');if(ct)ct.textContent=usable()?DATA.planes.length+' shown':'none now';
 if(!usable()){if(L)L.set(false);return}
 if(!L)L=layer(g.viewer,C);L.set(true)}
new MutationObserver(ms=>{if(ms.some(x=>x.target.id==='chip-airl'))sync()}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
setInterval(()=>{if(isOn())sync()},3e5); /* pick up the next hourly snapshot, and stop drawing one that has grown too old */
window.OwlAirliners={load,stats:()=>L&&L.stats(),data:()=>DATA,usable};
if(isOn())sync();
})();
