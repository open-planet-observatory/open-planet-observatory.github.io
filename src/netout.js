// ---------- Measured internet outages by country, on the 3D globe and for the status page ----------
// The maintainer, 18-19 Nov 2026: alongside the companies' own status reports, show measured outages. Data:
// disruptions.ioda (collector/ioda.mjs): IODA's country-level outage events of the last 24 hours (Georgia Tech). Each is an
// automated detection by one of IODA's signals, not a confirmed outage; IODA's own scores are not kept or shown and the site
// makes none. A ring is drawn at the middle of each country with an event: pulsing if it was still running when collected,
// plain if it ended in the last 24 hours. Countries too small for the site's country shapes are listed on the page only.
(function(){
const O=window.__obs;if(!O||!O.addLayer)return;const html=document.documentElement;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* ISO 3166 two-letter code -> the name used in the site's country shapes (built by matching the standard English names; checked 19 Nov 2026) */
const A2={"FJ":"Fiji","TZ":"Tanzania","EH":"W. Sahara","CA":"Canada","US":"United States of America","KZ":"Kazakhstan","UZ":"Uzbekistan","PG":"Papua New Guinea","ID":"Indonesia","AR":"Argentina","CL":"Chile","CD":"Dem. Rep. Congo","SO":"Somalia","KE":"Kenya","SD":"Sudan","TD":"Chad","HT":"Haiti","DO":"Dominican Rep.","RU":"Russia","BS":"Bahamas","FK":"Falkland Is.","NO":"Norway","GL":"Greenland","TF":"Fr. S. Antarctic Lands","TL":"Timor-Leste","ZA":"South Africa","LS":"Lesotho","MX":"Mexico","UY":"Uruguay","BR":"Brazil","BO":"Bolivia","PE":"Peru","CO":"Colombia","PA":"Panama","CR":"Costa Rica","NI":"Nicaragua","HN":"Honduras","SV":"El Salvador","GT":"Guatemala","BZ":"Belize","VE":"Venezuela","GY":"Guyana","SR":"Suriname","FR":"France","EC":"Ecuador","PR":"Puerto Rico","JM":"Jamaica","CU":"Cuba","ZW":"Zimbabwe","BW":"Botswana","NA":"Namibia","SN":"Senegal","ML":"Mali","MR":"Mauritania","BJ":"Benin","NE":"Niger","NG":"Nigeria","CM":"Cameroon","TG":"Togo","GH":"Ghana","CI":"Côte d'Ivoire","GN":"Guinea","GW":"Guinea-Bissau","LR":"Liberia","SL":"Sierra Leone","BF":"Burkina Faso","CF":"Central African Rep.","CG":"Congo","GA":"Gabon","GQ":"Eq. Guinea","ZM":"Zambia","MW":"Malawi","MZ":"Mozambique","SZ":"eSwatini","AO":"Angola","BI":"Burundi","IL":"Israel","LB":"Lebanon","MG":"Madagascar","PS":"Palestine","GM":"Gambia","TN":"Tunisia","DZ":"Algeria","JO":"Jordan","AE":"United Arab Emirates","QA":"Qatar","KW":"Kuwait","IQ":"Iraq","OM":"Oman","VU":"Vanuatu","KH":"Cambodia","TH":"Thailand","LA":"Laos","MM":"Myanmar","VN":"Vietnam","KP":"North Korea","KR":"South Korea","MN":"Mongolia","IN":"India","BD":"Bangladesh","BT":"Bhutan","NP":"Nepal","PK":"Pakistan","AF":"Afghanistan","TJ":"Tajikistan","KG":"Kyrgyzstan","TM":"Turkmenistan","IR":"Iran","SY":"Syria","AM":"Armenia","SE":"Sweden","BY":"Belarus","UA":"Ukraine","PL":"Poland","AT":"Austria","HU":"Hungary","MD":"Moldova","RO":"Romania","LT":"Lithuania","LV":"Latvia","EE":"Estonia","DE":"Germany","BG":"Bulgaria","GR":"Greece","TR":"Turkey","AL":"Albania","HR":"Croatia","CH":"Switzerland","LU":"Luxembourg","BE":"Belgium","NL":"Netherlands","PT":"Portugal","ES":"Spain","IE":"Ireland","NC":"New Caledonia","SB":"Solomon Is.","NZ":"New Zealand","AU":"Australia","LK":"Sri Lanka","CN":"China","TW":"Taiwan","IT":"Italy","DK":"Denmark","GB":"United Kingdom","IS":"Iceland","AZ":"Azerbaijan","GE":"Georgia","PH":"Philippines","MY":"Malaysia","BN":"Brunei","SI":"Slovenia","FI":"Finland","SK":"Slovakia","CZ":"Czechia","ER":"Eritrea","JP":"Japan","PY":"Paraguay","YE":"Yemen","SA":"Saudi Arabia","AQ":"Antarctica","CY":"Cyprus","MA":"Morocco","EG":"Egypt","LY":"Libya","ET":"Ethiopia","DJ":"Djibouti","UG":"Uganda","RW":"Rwanda","BA":"Bosnia and Herz.","MK":"Macedonia","RS":"Serbia","ME":"Montenegro","XK":"Kosovo","TT":"Trinidad and Tobago","SS":"S. Sudan"};
const SIG=s=>/^bgp/.test(s)?'routing (BGP): fewer of its networks could be reached':/^ping/.test(s)?'active probing: fewer addresses answered':/nt$|telescope|merit|ucsd/.test(s)?'network telescope: less background traffic arrived':/^gtr/.test(s)?'Google traffic: fewer visits to Google services':s||'signal not stated';
const STALE_H=3;
const data=()=>{const I=(window.DIS||{}).ioda;return I&&Array.isArray(I.events)?I:null};
const fresh=()=>{const I=data();return !!I&&(Date.now()-Date.parse(I.asOf))/36e5<=STALE_H};
const fmtT=t=>{const d=new Date(t);return isNaN(d)?'':d.toLocaleString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' UTC'};
const len=m=>m<90?m+' min':m<2880?Math.round(m/60)+' h':Math.round(m/1440)+' days';
let CEN=null;
function centres(){if(CEN)return CEN;CEN={};const d3=window.d3,F=O.countries||[];if(!d3||!F.length)return CEN;const byName=new Map(F.map(f=>[f.properties&&f.properties.name,f]));
 for(const c in A2){const f=byName.get(A2[c]);if(!f||!f.geometry)continue;let g=f.geometry;
  /* a country in several pieces: use its largest piece, so the ring sits on the mainland */
  if(g.type==='MultiPolygon'){let best=null,ba=-1;for(const co of g.coordinates){const p={type:'Polygon',coordinates:co},a=d3.geoArea(p);if(a>ba){ba=a;best=p}}g=best}
  const k=d3.geoCentroid(g);if(isFinite(k[0])&&isFinite(k[1]))CEN[c]=k}return CEN}
function marks(){const I=data();if(!I||!fresh())return[];const C=centres(),by=new Map();
 for(const e of I.events){const k=C[e[0]];if(!k)continue;const m=by.get(e[0])||{code:e[0],name:e[1],lon:k[0],lat:k[1],on:0,ev:[]};m.on=m.on||e[5];m.ev.push(e);by.set(e[0],m)}return[...by.values()]}
O.addLayer({id:'netout',name:'Internet outages by country (measured)',color:'--c-netout',shape:'circle',count:'3D only',on:false,group:'People & systems'});
html.style.setProperty('--c-netout','#ffb347');
const chip=()=>document.getElementById('chip-netout');{const b=chip();if(b)b.title='Countries where IODA (Georgia Tech) detected an internet outage in the last 24 hours. Automated detections, not confirmed outages. A pulsing ring was still running when collected.'}
const isOn=()=>{const c=chip();return !!c&&c.getAttribute('aria-pressed')==='true'};
function legend(){const I=data();if(!I)return'<span>No measured outage list has been collected yet. Nothing is drawn in its place.</span>';
 if(!fresh())return`<span>The last list is from ${esc(fmtT(I.asOf))}, more than ${STALE_H} hours ago, so it is not drawn.</span>`;
 const M=marks(),on=M.filter(m=>m.on).length,listed=new Set(I.events.map(e=>e[0])).size;
 return`<span><b>${listed}</b> countries with a detected outage in the last 24 hours; <b>${on}</b> drawn as still running when collected (pulsing ring), ${M.length-on} as ended (plain ring).${listed>M.length?' '+(listed-M.length)+' small countries or territories are on the list but too small for this map.':''}</span>
 <span><b>Automated detections, not confirmed outages.</b> IODA watches routing, probing and traffic signals; a ring means one of them dropped for that country. Small places trigger more often.</span>
 <span><button type="button" class="btn" onclick="dispatchEvent(new Event('obs:netstatus'))">See the list with times</button></span>`+
 (window.owlSrc?window.owlSrc('ioda',{t:I.asOf,b:'Automated detections; not every one is a real outage, and local or mobile-only outages can be missed.'}):'')}
let L=null;
function layer(viewer,C){const scene=viewer.scene,host=viewer.container,cv=document.createElement('canvas');cv.className='no-rings';cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';host.appendChild(cv);
 const tip=document.createElement('div');tip.hidden=true;tip.style.cssText='position:absolute;z-index:3;pointer-events:none;padding:5px 8px;border-radius:8px;font-size:.74rem;line-height:1.35;background:rgb(10 14 22 / .92);color:#fff3e0;border:1px solid rgb(255 179 71 / .45);max-width:260px';host.appendChild(tip);
 const ctx=cv.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,RAD=Math.PI/180,A=6378137,E2=0.00669437999014;
 let on=false,dpr=1,M=[],MT=0,S=[],mx=-1,my=-1;const VP=new C.Matrix4();let m=VP,cx=0,cy=0,cz=0;const q=[0,0,0],o=[0,0];
 const ecef=(lon,lat)=>{const la=lat*RAD,lo=lon*RAD,sl=Math.sin(la),cl=Math.cos(la),n=A/Math.sqrt(1-E2*sl*sl);q[0]=n*cl*Math.cos(lo);q[1]=n*cl*Math.sin(lo);q[2]=n*(1-E2)*sl};
 function proj(lon,lat){ecef(lon,lat);const x=q[0],y=q[1],z=q[2];if((cx-x)*x+(cy-y)*y+(cz-z)*z/(1-E2)<=0)return false;const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return false;
  const nx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,ny=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;if(nx<-1.05||nx>1.05||ny<-1.05||ny>1.05)return false;o[0]=(nx+1)/2*cv.width;o[1]=(1-ny)/2*cv.height;return true}
 function size(){const d=Math.min(2,devicePixelRatio||1),w=Math.round(cv.clientWidth*d),h=Math.round(cv.clientHeight*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}dpr=d}
 function draw(){const hc=html.classList;if(!on||document.hidden||hc.contains('map2d')||hc.contains('game-on')||hc.contains('moon-on')||(window.OwlLightning&&window.OwlLightning.on)){if(cv.width)ctx.clearRect(0,0,cv.width,cv.height);S.length=0;tip.hidden=true;return}size();
  if(Date.now()-MT>30000){M=marks();MT=Date.now()}
  const c=scene.camera;C.Matrix4.multiply(c.frustum.projectionMatrix,c.viewMatrix,VP);m=VP;cx=c.positionWC.x;cy=c.positionWC.y;cz=c.positionWC.z;
  ctx.clearRect(0,0,cv.width,cv.height);S.length=0;const ph=reduce?.5:(performance.now()/1600)%1,col='255,179,71';
  for(const k of M){if(!proj(k.lon,k.lat))continue;const x=o[0],y=o[1],r=7*dpr;
   if(k.on){ctx.strokeStyle=`rgba(${col},${(.75*(1-ph)).toFixed(3)})`;ctx.lineWidth=2*dpr;ctx.beginPath();ctx.arc(x,y,r*(.8+1.9*ph),0,6.3);ctx.stroke();ctx.fillStyle=`rgba(${col},.95)`;ctx.beginPath();ctx.arc(x,y,r*.55,0,6.3);ctx.fill()}
   else{ctx.strokeStyle=`rgba(${col},.6)`;ctx.lineWidth=1.5*dpr;ctx.beginPath();ctx.arc(x,y,r*.7,0,6.3);ctx.stroke()}
   S.push([x/dpr,y/dpr,k])}
  if(mx>=0){let best=null,bd=324;for(const s of S){const d=(s[0]-mx)**2+(s[1]-my)**2;if(d<bd){bd=d;best=s}}
   if(best){const k=best[2];tip.innerHTML=`<b>${esc(k.name)}</b><br>${k.ev.slice(0,3).map(e=>`${e[5]?'Still running when collected':'Ended'}: ${esc(SIG(e[4]))}. From ${esc(fmtT(e[2]))}, ${esc(len(e[3]))}${e[5]?' so far':''}.`).join('<br>')}<br><span style="opacity:.75">Automated detection by IODA, not a confirmed outage.</span>`;
    tip.style.left=Math.max(4,Math.min(cv.clientWidth-270,best[0]+14))+'px';tip.style.top=Math.max(4,best[1]-10)+'px';tip.hidden=false}else tip.hidden=true}else tip.hidden=true}
 scene.postRender.addEventListener(()=>{try{draw()}catch(e){/* never stop the globe's render loop */}});
 host.addEventListener('pointermove',e=>{if(!on)return;const r=host.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});host.addEventListener('pointerleave',()=>{mx=my=-1});
 return{set(v){on=v;cv.hidden=!v;MT=0;if(!v){ctx.clearRect(0,0,cv.width,cv.height);tip.hidden=true}},stats:()=>({on,drawn:S.length,marks:M.length})}}
function sync(){const g=window.__obs3d,C=window.Cesium;const on=isOn();
 let lg=document.getElementById('lg-netout');const c=chip();if(on&&!lg&&c){lg=document.createElement('div');lg.id='lg-netout';lg.className='wx-legend fc-legend';c.after(lg)}
 if(lg){lg.hidden=!on;if(on)lg.innerHTML=legend()}
 const ct=c&&c.querySelector('.ct');if(ct&&on)ct.textContent=fresh()?marks().length+' shown':'none now';
 if(!g||!C){if(on)setTimeout(sync,800);return}
 if(!on){if(L)L.set(false);return}
 if(!L)L=layer(g.viewer,C);L.set(true)}
new MutationObserver(ms=>{if(ms.some(x=>x.target.id==='chip-netout'))sync()}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
setInterval(()=>{if(isOn())sync()},12e4);
window.OwlNetOut={data,fresh,marks,sig:SIG,len,fmtT,stats:()=>L&&L.stats(),staleHours:STALE_H};
if(isOn())sync();
})();
