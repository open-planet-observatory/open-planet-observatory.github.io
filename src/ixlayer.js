// ---------- Internet exchange points on the 3D globe ----------
// Where networks meet to hand traffic to each other. Data: data/ix.json (collector/peeringdb.mjs), synced once a day
// from PeeringDB WITH PERMISSION (20 Nov 2026, ticket PEERINGDB-202611YY60P1). PeeringDB's conditions, kept here: its
// Acceptable Use Policy travels with the data (the legend says so and links to it); free, no advertising, marketing or
// demographic mapping; PeeringDB credited wherever the layer shows. Only name, city, country and one rounded position
// per exchange. The list is not covered by this site's own licence. A list older than 8 days, or a failed one, is not drawn.
(function(){
const O=window.__obs;if(!O||!O.addLayer)return;const html=document.documentElement;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const STALE_D=8;let DATA=null,DP=null,DT=0;
const load=()=>{if(DP&&Date.now()-DT<36e5)return DP;DT=Date.now();return DP=fetch('data/ix.json?t='+Math.floor(Date.now()/36e5),{cache:'no-store'}).then(r=>r.ok?r.json():{failed:true,reason:r.status===404?'not collected yet':'HTTP '+r.status}).catch(()=>({failed:true,reason:'could not be loaded'})).then(j=>(DATA=j))};
const ageD=()=>DATA&&DATA.asOf?(Date.now()-Date.parse(DATA.asOf))/864e5:Infinity;
const usable=()=>!!(DATA&&!DATA.failed&&Array.isArray(DATA.ix)&&DATA.ix.length&&ageD()<=STALE_D);
O.addLayer({id:'ix',name:'Internet exchanges (PeeringDB)',color:'--c-ix',shape:'diamond',count:'3D only',on:false,group:'People & systems'});
html.style.setProperty('--c-ix','#5eead4');
const chip=()=>document.getElementById('chip-ix');{const b=chip();if(b)b.title='Internet exchange points: buildings where many networks connect to pass traffic to each other. From PeeringDB, used with permission and under its Acceptable Use Policy. Name, city and country only.'}
const isOn=()=>{const c=chip();return !!c&&c.getAttribute('aria-pressed')==='true'};
const fmtD=t=>{const d=new Date(t);return isNaN(d)?'':d.toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'})};
const AUP='https://www.peeringdb.com/aup';
function legend(){if(!DATA)return'<span>Loading the list of exchanges…</span>';
 const credit=`<span>Source: <a href="https://www.peeringdb.com/" target="_blank" rel="noopener">PeeringDB</a>, used with PeeringDB's permission and subject to its <a href="${AUP}" target="_blank" rel="noopener">Acceptable Use Policy</a>. This list is not covered by this site's own licence and may not be reused from here: get it from PeeringDB.${DATA.asOf&&!DATA.failed?' Synced '+esc(fmtD(DATA.asOf))+', once a day.':''}</span>`;
 if(DATA.failed)return`<span>The list of exchanges could not be read (${esc(DATA.error||DATA.reason||'PeeringDB did not answer')}). Nothing is drawn in its place.</span>`+credit;
 if(ageD()>STALE_D)return`<span>The last list is from ${esc(fmtD(DATA.asOf))}, more than ${STALE_D} days ago, so it is not drawn.</span>`+credit;
 return`<span><b>${DATA.ix.length.toLocaleString('en-US')}</b> internet exchange points${DATA.listed&&DATA.listed>DATA.ix.length?' of '+DATA.listed.toLocaleString('en-US')+' listed (the rest give no location)':''}. An exchange is a place where many networks plug into shared equipment to hand traffic to each other directly.</span>
 <span>Each mark is the middle of the buildings an exchange is in, rounded to about 1 km. Networks register themselves with PeeringDB, so the list is what operators chose to publish: private exchanges, and some regions, are under-represented.</span>`+credit}
let L=null;
function layer(viewer,C){const scene=viewer.scene,host=viewer.container,cv=document.createElement('canvas');cv.className='ix-marks';cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';host.appendChild(cv);
 const tip=document.createElement('div');tip.hidden=true;tip.style.cssText='position:absolute;z-index:3;pointer-events:none;padding:5px 8px;border-radius:8px;font-size:.74rem;line-height:1.35;background:rgb(10 14 22 / .92);color:#e6fffb;border:1px solid rgb(94 234 212 / .45);max-width:250px';host.appendChild(tip);
 const ctx=cv.getContext('2d'),RAD=Math.PI/180,A=6378137,E2=0.00669437999014;
 let on=false,dpr=1,S=[],mx=-1,my=-1;const VP=new C.Matrix4();let m=VP,cx=0,cy=0,cz=0;const q=[0,0,0],o=[0,0];
 const ecef=(lon,lat)=>{const la=lat*RAD,lo=lon*RAD,sl=Math.sin(la),cl=Math.cos(la),n=A/Math.sqrt(1-E2*sl*sl);q[0]=n*cl*Math.cos(lo);q[1]=n*cl*Math.sin(lo);q[2]=n*(1-E2)*sl};
 function proj(lon,lat){ecef(lon,lat);const x=q[0],y=q[1],z=q[2];if((cx-x)*x+(cy-y)*y+(cz-z)*z/(1-E2)<=0)return false;const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return false;
  const nx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,ny=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;if(nx<-1.02||nx>1.02||ny<-1.02||ny>1.02)return false;o[0]=(nx+1)/2*cv.width;o[1]=(1-ny)/2*cv.height;return true}
 function size(){const d=Math.min(2,devicePixelRatio||1),w=Math.round(cv.clientWidth*d),h=Math.round(cv.clientHeight*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}dpr=d}
 function draw(){const hc=html.classList;if(!on||!usable()||document.hidden||hc.contains('map2d')||hc.contains('game-on')||hc.contains('moon-on')||(window.OwlLightning&&window.OwlLightning.on)){if(cv.width)ctx.clearRect(0,0,cv.width,cv.height);S.length=0;tip.hidden=true;return}size();
  const c=scene.camera;C.Matrix4.multiply(c.frustum.projectionMatrix,c.viewMatrix,VP);m=VP;cx=c.positionWC.x;cy=c.positionWC.y;cz=c.positionWC.z;
  const hgt=C.Cartographic.fromCartesian(c.positionWC).height,r=(hgt>1.4e7?2.6:hgt>6e6?3.3:hgt<2e6?5:4)*dpr;
  ctx.clearRect(0,0,cv.width,cv.height);S.length=0;ctx.fillStyle='rgba(94,234,212,.9)';ctx.strokeStyle='rgba(6,14,20,.8)';ctx.lineWidth=dpr;
  for(const k of DATA.ix){if(!proj(k[4],k[3]))continue;const x=o[0],y=o[1];ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();ctx.fill();ctx.stroke();S.push([x/dpr,y/dpr,k])}
  if(mx>=0){let best=null,bd=196,near=0;for(const s of S){const d=(s[0]-mx)**2+(s[1]-my)**2;if(d<196)near++;if(d<bd){bd=d;best=s}}
   if(best){const k=best[2];tip.innerHTML=`<b>${esc(k[0])}</b><br>${esc([k[1],k[2]].filter(Boolean).join(', '))}${k[5]>1?' · in '+k[5]+' buildings':''}${near>1?`<br><span style="opacity:.75">${near-1} more close by: zoom in to tell them apart.</span>`:''}<br><span style="opacity:.75">PeeringDB, used with permission.</span>`;
    tip.style.left=Math.max(4,Math.min(cv.clientWidth-260,best[0]+14))+'px';tip.style.top=Math.max(4,best[1]-10)+'px';tip.hidden=false}else tip.hidden=true}else tip.hidden=true}
 scene.postRender.addEventListener(()=>{try{draw()}catch(e){/* never stop the globe's render loop */}});
 host.addEventListener('pointermove',e=>{if(!on)return;const r=host.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});host.addEventListener('pointerleave',()=>{mx=my=-1});
 return{set(v){on=v;cv.hidden=!v;if(!v){ctx.clearRect(0,0,cv.width,cv.height);tip.hidden=true}},stats:()=>({on,drawn:S.length,listed:DATA&&DATA.ix?DATA.ix.length:0})}}
async function sync(){const g=window.__obs3d,C=window.Cesium;const on=isOn();
 let lg=document.getElementById('lg-ix');const c=chip();if(on&&!lg&&c){lg=document.createElement('div');lg.id='lg-ix';lg.className='wx-legend fc-legend';c.after(lg)}
 if(lg){lg.hidden=!on;if(on)lg.innerHTML=legend()}
 if(!g||!C){if(on)setTimeout(sync,800);return}
 if(!on){if(L)L.set(false);return}
 await load();if(lg&&isOn())lg.innerHTML=legend();if(!isOn())return;
 const ct=c&&c.querySelector('.ct');if(ct)ct.textContent=usable()?DATA.ix.length.toLocaleString('en-US')+' shown':'none now';
 if(!usable()){if(L)L.set(false);return}
 if(!L)L=layer(g.viewer,C);L.set(true)}
new MutationObserver(ms=>{if(ms.some(x=>x.target.id==='chip-ix'))sync()}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
window.OwlIX={load,stats:()=>L&&L.stats(),data:()=>DATA,usable};
if(isOn())sync();
})();
