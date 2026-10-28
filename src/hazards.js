// ---------- Storms, ground radiation, relief appeals, and a forecast wherever you click ----------
// Storm tracks and cones: GDACS (automatic estimates, not official forecasts; the page says so and links the official
// agency for each ocean basin). Ground radiation: Safecast sensors, published only as 1° cell medians. Relief: IFRC GO
// appeals in IFRC's own words and numbers. Forecast: Open-Meteo, fetched by the visitor's browser for the clicked point only.
(function(){
const O=window.__obs;if(!O)return;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtN=n=>Number(n).toLocaleString('en-US');
const chf=n=>n>=1e9?(n/1e9).toFixed(2)+' bn':n>=1e6?(n/1e6).toFixed(1)+' M':n>=1e3?Math.round(n/1e3)+'k':String(n);
const ago=t=>{const h=(Date.now()-new Date(t).getTime())/36e5;return h<1?'under an hour ago':h<48?Math.round(h)+' h ago':Math.round(h/24)+' days ago'};
const S=()=>window.SNAP||{};
const CAT={TD:['Tropical depression','#7fd1ff'],TS:['Tropical storm','#ffd166'],HU:['Hurricane / typhoon','#ff5d5d']};
const catOf=l=>CAT[l]||[l||'Storm','#cfd8e3'];
const ALERT={Green:'#4caf50',Orange:'#ff9f43',Red:'#e63946'};
// Official forecasters for each basin (WMO Regional Specialized Meteorological Centres and national services)
function basin(lon,lat){if(lat>=0){if(lon<=-140||lon>=180)return ['Central Pacific Hurricane Center (NOAA)','https://www.nhc.noaa.gov/?cpac'];
  if(lon<0)return ['National Hurricane Center (NOAA)','https://www.nhc.noaa.gov/'];if(lon>=100)return ['Japan Meteorological Agency','https://www.jma.go.jp/bosai/map.html#contents=typhoon&lang=en'];
  return ['India Meteorological Department','https://mausam.imd.gov.in/']}
 if(lon>=30&&lon<90)return ['Météo-France La Réunion','https://meteofrance.re/fr/cyclone'];if(lon>=90&&lon<160)return ['Australian Bureau of Meteorology','http://www.bom.gov.au/cyclone/'];
 return ['Fiji Meteorological Service','https://www.met.gov.fj/']}
const lastObs=s=>{const t=s.adv.slice(0,16);let p=null;s.pts.forEach(x=>{if(x[3]<=t)p=x});return p||s.pts[0]};

// ----- layer switches -----
O.addLayer({id:'storm',name:'Tropical storms & cones',color:'--c-storm',shape:'circle',count:'',on:true,group:'Weather & ocean'});
O.addLayer({id:'wx-fc',name:'Forecast where I click',color:'--c-wxfc',shape:'square',count:'',on:true,group:'Weather & ocean'});
O.addLayer({id:'grad',name:'Ground radiation (Safecast)',color:'--c-grad',shape:'square',count:'',on:false,group:'Earth'});
O.addLayer({id:'relief',name:'Red Cross / Red Crescent appeals',color:'--c-relief',shape:'circle',count:'',on:false,group:'People & systems'});
const root=document.documentElement.style;root.setProperty('--c-storm','#ffd166');root.setProperty('--c-wxfc','#9ad1ff');root.setProperty('--c-grad','#80ed99');root.setProperty('--c-relief','#e63946');
const tips={'storm':'Track, forecast track and uncertainty cone for every current tropical cyclone (GDACS, automatic). Not an official forecast.','wx-fc':'Click the globe for a 7-day forecast at that spot (Open-Meteo). Only the clicked point is sent.','grad':'Background gamma radiation from volunteer Safecast sensors, as 1° cell medians over 24 h.','relief':'Active IFRC emergency appeals and DREF operations, at IFRC’s country position.'};
Object.entries(tips).forEach(([k,v])=>{const b=document.getElementById('chip-'+k);if(b)b.title=v});
const setCount=(id,t)=>{const c=document.querySelector('#chip-'+id+' .ct');if(c)c.textContent=t};
const chipOn=id=>{const c=document.getElementById('chip-'+id);return !c||c.getAttribute('aria-pressed')==='true'};
const turnOn=id=>{const c=document.getElementById('chip-'+id);if(c&&c.getAttribute('aria-pressed')!=='true')c.click()};

// ----- 3D drawing (CesiumJS globe) -----
let G3=null;
function ds(id){const C=window.Cesium,{viewer,DS}=G3;if(!DS[id]){const d=new C.CustomDataSource(id);viewer.dataSources.add(d);DS[id]=d}DS[id].show=chipOn(id);DS[id].entities.removeAll();return DS[id].entities}
function drawStorms(){if(!G3)return;const C=window.Cesium,E=ds('storm');const st=S().storms;const items=(st&&st.items)||[];
 const col=(h,a=1)=>C.Color.fromCssColorString(h).withAlpha(a);
 items.forEach(s=>{const short=s.name.replace(/^Tropical Cyclone\s+/,'');
  if(s.cone&&s.cone.length>3)E.add({polygon:{hierarchy:C.Cartesian3.fromDegreesArray(s.cone.flat()),material:col('#ffffff',.13),height:0},
   description:`<b>${esc(short)}: forecast uncertainty cone</b>Where GDACS expects the centre to be, with its uncertainty. Automatic estimate, not an official forecast.<br><span style="opacity:.75">GDACS</span>`});
  if(s.cone&&s.cone.length>3)E.add({polyline:{positions:C.Cartesian3.fromDegreesArray(s.cone.concat([s.cone[0]]).flat()),width:1.2,material:col('#ffffff',.55),arcType:C.ArcType.GEODESIC}});
  s.seg.forEach(g=>{const [nm,c]=catOf(g[4]);E.add({polyline:{positions:C.Cartesian3.fromDegreesArray([g[0],g[1],g[2],g[3]]),width:g[5]?2.5:3.5,arcType:C.ArcType.GEODESIC,
   material:g[5]?new C.PolylineDashMaterialProperty({color:col(c,.95),dashLength:10}):col(c,.95)},description:`<b>${esc(short)}</b>${esc(nm)} (${esc(g[4])})${g[5]?' · forecast':' · observed'}<br><span style="opacity:.75">GDACS</span>`})});
  const now=lastObs(s),t0=s.adv.slice(0,16);
  s.pts.forEach(p=>{const fc=p[3]>t0,isNow=p===now;E.add({position:C.Cartesian3.fromDegrees(p[0],p[1],0),
   point:{pixelSize:isNow?13:fc?5:4,color:isNow?col(ALERT[s.alert]||'#ffd166'):col('#ffffff',fc?.9:.6),outlineColor:col('#0b1220',.9),outlineWidth:isNow?2:1,disableDepthTestDistance:Number.POSITIVE_INFINITY},
   label:isNow?{text:short,font:'700 12px Public Sans, sans-serif',fillColor:C.Color.WHITE,outlineColor:col('#0b1220'),outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(10,0),horizontalOrigin:C.HorizontalOrigin.LEFT,disableDepthTestDistance:Number.POSITIVE_INFINITY}:undefined,
   description:`<b>${esc(short)} · ${esc(p[2])}</b>${fc?'Forecast position':'Observed position'}${isNow?' (latest)':''}<br>${esc(s.sev)}<br><span style="opacity:.75">GDACS ${esc(s.alert)} alert</span>`})})});
 setCount('storm',items.length?String(items.length):'none')}
const usvh=cpm=>cpm/((S().groundRad||{}).cpmPerUsvh||334);
const gradCol=v=>v<.1?'#80ed99':v<.2?'#c7f464':v<.5?'#ffd166':v<1?'#ff9f43':'#ff5d5d';
function gradCells(){return String((S().groundRad||{}).cells||'').split(';').filter(Boolean).map(x=>{const [lon,lat,cpm,n]=x.split(',').map(Number);return {lon,lat,cpm,n}})}
function drawGrad(){if(!G3)return;const C=window.Cesium,E=ds('grad');const cells=gradCells();
 cells.forEach(c=>{const v=usvh(c.cpm);E.add({position:C.Cartesian3.fromDegrees(c.lon,c.lat,0),point:{pixelSize:6+3*Math.sqrt(c.n),color:C.Color.fromCssColorString(gradCol(v)).withAlpha(.9),outlineColor:C.Color.fromCssColorString('#0b1220').withAlpha(.8),outlineWidth:1,disableDepthTestDistance:Number.POSITIVE_INFINITY},
  description:`<b>About ${v.toFixed(2)} µSv/h</b>Median of ${c.n} Safecast sensor${c.n>1?'s':''} in this 1° area, past 24 h (${fmtN(c.cpm)} counts per minute)<br><span style="opacity:.75">Safecast, CC0 · placed at the area centre, not the sensor</span>`})});
 setCount('grad',cells.length?cells.length+' areas':'')}
function reliefByCountry(){const by={};((S().relief||{}).appeals||[]).forEach(a=>{if(a[5]==null)return;const k=a[4]||a[3];(by[k]=by[k]||{name:a[3],lon:a[5],lat:a[6],req:0,fund:0,list:[]});by[k].req+=a[7];by[k].fund+=a[8];by[k].list.push(a)});return Object.values(by)}
function drawRelief(){if(!G3)return;const C=window.Cesium,E=ds('relief');const R=reliefByCountry();const mx=Math.max(1,...R.map(r=>r.req));
 R.forEach(r=>E.add({position:C.Cartesian3.fromDegrees(r.lon,r.lat,0),point:{pixelSize:7+16*Math.sqrt(r.req/mx),color:C.Color.fromCssColorString('#e63946').withAlpha(.85),outlineColor:C.Color.WHITE.withAlpha(.9),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},
  description:`<b>${esc(r.name)}: ${r.list.length} active IFRC operation${r.list.length>1?'s':''}</b>${r.list.slice(0,4).map(a=>'· '+esc(a[0])+' ('+esc(a[1])+')').join('<br>')}${r.list.length>4?'<br>· and '+(r.list.length-4)+' more':''}<br>CHF ${chf(r.fund)} funded of ${chf(r.req)} requested<br><span style="opacity:.75">IFRC GO · placed at IFRC's country position</span>`}));
 setCount('relief',R.length?String(((S().relief||{}).appeals||[]).length):'')}
function draw3d(){try{drawStorms()}catch(e){console.warn(e)}try{drawGrad()}catch(e){console.warn(e)}try{drawRelief()}catch(e){console.warn(e)}}

// ----- forecast where you click (Open-Meteo, browser-side) -----
const WMO={0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Depositing rime fog',51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',56:'Light freezing drizzle',57:'Dense freezing drizzle',61:'Slight rain',63:'Moderate rain',65:'Heavy rain',66:'Light freezing rain',67:'Heavy freezing rain',71:'Slight snowfall',73:'Moderate snowfall',75:'Heavy snowfall',77:'Snow grains',80:'Slight rain showers',81:'Moderate rain showers',82:'Violent rain showers',85:'Slight snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm with slight hail',99:'Thunderstorm with heavy hail'};
let units=(()=>{try{const u=localStorage.getItem('obs-units');if(u)return u}catch(e){}return /^en-(US|LR)|^my/.test(navigator.language||'')?'us':'metric'})();
let wxCard=null,wxCtl=null,wxLast=null;
function placeName(lon,lat){const f=(O.countries||[]).find(c=>{try{return d3.geoContains(c,[lon,lat])}catch(e){return false}});return f?f.properties.name:'Open ocean or no country'}
async function forecast(lon,lat){if(!wxCard)return;wxLast=[lon,lat];if(wxCtl)wxCtl.abort();wxCtl=new AbortController();
 const la=lat.toFixed(2),lo=lon.toFixed(2),us=units==='us';
 wxCard.hidden=false;wxCard.innerHTML=`<div class="sc-h"><b>Forecast · ${Math.abs(la)}°${lat>=0?'N':'S'}, ${Math.abs(lo)}°${lon>=0?'E':'W'}</b><button class="sc-x" aria-label="Close">×</button></div><p class="sc-note">Loading from Open-Meteo…</p>`;
 wxCard.querySelector('.sc-x').onclick=()=>{wxCard.hidden=true};
 const q=`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`+(us?'&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch':'');
 try{const r=await fetch(q,{signal:wxCtl.signal});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();const d=j.daily,c=j.current,U=j.daily_units||{},CU=j.current_units||{};
  const un=u=>String(u||'').replace('mp/h','mph').replace(/^inch$/,'in');const day=(s,i)=>i===0?'Today':new Date(s+'T12:00').toLocaleDateString('en-US',{weekday:'short'});
  wxCard.innerHTML=`<div class="sc-h"><b>${esc(placeName(lon,lat))}</b><button class="sc-x" aria-label="Close">×</button></div>
  <div class="sc-cat">${Math.abs(la)}°${lat>=0?'N':'S'}, ${Math.abs(lo)}°${lon>=0?'E':'W'} · local time zone ${esc(j.timezone_abbreviation||j.timezone||'')}</div>
  ${c?`<div class="wx-now"><b>${Math.round(c.temperature_2m)}${esc(un(CU.temperature_2m))}</b><span>${esc(WMO[c.weather_code]||'Code '+c.weather_code)} · wind ${Math.round(c.wind_speed_10m)} ${esc(un(CU.wind_speed_10m))}</span></div>`:''}
  <table class="wx-days"><tbody>${d.time.map((t,i)=>`<tr><th>${day(t,i)}</th><td>${esc(WMO[d.weather_code[i]]||'')}</td><td class="n"><b>${Math.round(d.temperature_2m_max[i])}°</b> / ${Math.round(d.temperature_2m_min[i])}°</td><td class="n">${d.precipitation_sum[i]?(+d.precipitation_sum[i]).toFixed(us?2:1)+' '+esc(un(U.precipitation_sum)):'–'}</td><td class="n">${Math.round(d.wind_speed_10m_max[i])} ${esc(un(U.wind_speed_10m_max))}</td></tr>`).join('')}</tbody></table>
  <p class="sc-note">Computer-model forecast, not an official warning: for warnings use your national weather service. Only this point, rounded to 0.01°, was sent to Open-Meteo. <a href="https://open-meteo.com/" target="_blank" rel="noopener">Weather data by Open-Meteo.com</a> (CC BY 4.0).</p>
  <div class="sc-act"><button class="chip" id="wxUnits">${us?'Show °C, km/h':'Show °F, mph'}</button></div>`;
  wxCard.querySelector('.sc-x').onclick=()=>{wxCard.hidden=true};
  wxCard.querySelector('#wxUnits').onclick=()=>{units=us?'metric':'us';try{localStorage.setItem('obs-units',units)}catch(e){}forecast(...wxLast)};
 }catch(e){if(e.name==='AbortError')return;wxCard.innerHTML=`<div class="sc-h"><b>Forecast unavailable</b><button class="sc-x" aria-label="Close">×</button></div><p class="sc-note">Open-Meteo did not answer (${esc(e.message)}). Nothing is shown rather than an old forecast.</p>`;wxCard.querySelector('.sc-x').onclick=()=>{wxCard.hidden=true}}}
O.forecastAt=forecast;
function hook3d(){const g=window.__obs3d;if(!g||!window.Cesium)return false;G3=g;const C=window.Cesium,viewer=g.viewer;
 const host=document.getElementById('satCard')?.parentElement||viewer.container;wxCard=document.createElement('div');wxCard.id='wxCard';wxCard.className='sat-card wx-card';wxCard.hidden=true;host.appendChild(wxCard);
 const h=new C.ScreenSpaceEventHandler(viewer.scene.canvas);
 h.setInputAction(m=>{if(!chipOn('wx-fc'))return;const picked=viewer.scene.drillPick(m.position,4);if(picked.some(p=>p.id&&p.id.sat!=null))return;
  const cart=viewer.camera.pickEllipsoid(m.position,viewer.scene.globe.ellipsoid);if(!cart)return;const cg=C.Cartographic.fromCartesian(cart);
  forecast(C.Math.toDegrees(cg.longitude),C.Math.toDegrees(cg.latitude))},C.ScreenSpaceEventType.LEFT_CLICK);
 new MutationObserver(ms=>{if(ms.some(m=>m.target.id==='chip-wx-fc')&&!chipOn('wx-fc')&&wxCard)wxCard.hidden=true}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
 draw3d();return true}
if(!hook3d()){let n=0;const t=setInterval(()=>{if(hook3d()||++n>40)clearInterval(t)},500)}

// ----- Climate panel: storms now -----
function renderStorms(){const un=document.getElementById('unusualHost');if(!un)return;let h=document.getElementById('stormHost');if(!h){h=document.createElement('div');h.id='stormHost';un.after(h)}
 const st=S().storms;if(!st){h.innerHTML='';return}const items=st.items||[];
 h.innerHTML=`<h3 style="font-size:1rem;margin:14px 0 6px">Tropical storms now <span class="small muted" style="font-weight:400">· ${items.length}</span></h3>
 <p class="small muted" style="margin:0 0 8px">Tracks and cones are GDACS's automatic estimates from forecast-agency data. They are not official forecasts: for decisions, use the official forecaster linked on each storm. Legend: <span class="st-key" style="--k:${CAT.TD[1]}">depression</span> <span class="st-key" style="--k:${CAT.TS[1]}">storm</span> <span class="st-key" style="--k:${CAT.HU[1]}">hurricane / typhoon</span>; solid observed, dashed forecast, white area the uncertainty cone.</p>
 ${items.length?`<div class="sg-grid storm-grid">${items.map((s,i)=>{const p=lastObs(s);const [an,au]=basin(p[0],p[1]);return `<article class="dis"><h3><span class="al-dot" style="background:${ALERT[s.alert]||'#999'}"></span>${esc(s.name)}</h3>
  <p class="small" style="margin:2px 0">${esc(s.sev)}</p><p class="small muted" style="margin:2px 0">${esc(s.desc)}</p>
  <p class="small muted" style="margin:4px 0">GDACS ${esc(s.alert)} alert · last GDACS update ${esc(s.adv.slice(0,16).replace('T',' '))} UTC (${ago(s.adv+'Z')})</p>
  <div class="sg-foot"><span><button class="more" data-storm="${i}">Show on globe</button> · <a href="${esc(s.url)}" target="_blank" rel="noopener">GDACS report</a> · Official: <a href="${au}" target="_blank" rel="noopener">${esc(an)}</a></span></div></article>`}).join('')}</div>`:'<p class="small muted">GDACS lists no current tropical cyclones.</p>'}
 <p class="note-line">Source: <a href="https://www.gdacs.org/" target="_blank" rel="noopener">GDACS</a> (UN OCHA and the European Commission JRC), free with attribution, checked every 30 minutes · collected ${esc(st.asOf)}.</p>`;
 h.querySelectorAll('[data-storm]').forEach(b=>b.onclick=()=>{const s=items[+b.dataset.storm];const p=lastObs(s);turnOn('storm');O.flyTo(p[0],p[1])})}

// ----- Signals panel: ground radiation -----
function renderGrad(){const G=S().groundRad;const anchor=document.getElementById('radHost')||document.getElementById('sigGrid');if(!G||!anchor)return;let h=document.getElementById('gradHost');
 if(!h){h=document.createElement('div');h.id='gradHost';h.className='sg-grid';h.style.marginBottom='12px';(document.getElementById('radHost')?anchor.after(h):anchor.before(h))}
 const cells=gradCells();const v=cells.map(c=>usvh(c.cpm)).sort((a,b)=>a-b);const mid=v[v.length>>1]||0;const hi=cells.slice().sort((a,b)=>b.cpm-a.cpm)[0];
 h.innerHTML=`<article class="dis"><h3>Radiation on the ground</h3><div class="enso-nums"><div><b>${G.sensors}</b><span>Safecast sensors reporting in 24 h, ${G.countries} countries</span></div><div><b>${mid.toFixed(2)} µSv/h</b><span>typical area (median of ${cells.length} areas)</span></div>${hi?`<div><b>${usvh(hi.cpm).toFixed(2)} µSv/h</b><span>highest area median</span></div>`:''}</div>
 <p class="small">Everyone is exposed to natural background radiation from rocks, soil and space. The UN scientific committee on radiation (UNSCEAR) puts the world's average outdoor gamma dose rate at about 59 nanograys an hour (roughly 0.06 µSv/h), with country averages from about 18 to 93, and some granite and mineral-sand regions several times higher. Geiger counters also count cosmic rays and their own background, so a normal place usually reads around 0.1 µSv/h on them. Readings well above that cluster around known sites such as the Chernobyl and Fukushima exclusion zones. Switch on "Ground radiation (Safecast)" under Earth to see each area.</p>
 <p class="small muted">Blind spots: volunteer sensors, mostly in Japan, Ukraine and the U.S., so most of the world has none. Each reading is a Geiger tube count converted with Safecast's factor for its tube (334 counts per minute = 1 µSv/h for caesium-137), so treat values as approximate. Shown only as 1° area medians: no sensor ids, owners or exact positions are kept.</p>
 <div class="sg-foot"><span><a href="https://safecast.org/" target="_blank" rel="noopener">Safecast</a> realtime sensors, CC0 · collected ${esc(G.asOf)}</span></div></article>`}

// ----- Relief panel: appeals and how to help -----
let rFilter='Emergency Appeal',rAll=false;
function renderRelief(){const h=document.getElementById('reliefHost');if(!h)return;const R=S().relief;if(!R){h.innerHTML='<p class="small muted">IFRC appeal data has not been collected yet.</p>';return}
 const A=R.appeals||[];const sum=(L,k)=>L.reduce((s,a)=>s+a[k],0);const rq=sum(A,7),fd=sum(A,8);
 const L=A.filter(a=>rFilter==='all'||a[1]===rFilter).slice().sort((a,b)=>(b[7]-b[8])-(a[7]-a[8]));const show=rAll?L:L.slice(0,20);
 const nEA=A.filter(a=>a[1]==='Emergency Appeal').length,nD=A.filter(a=>a[1]==='DREF').length;
 h.innerHTML=`<div class="enso-nums"><div><b>${A.length}</b><span>active IFRC operations (${nEA} emergency appeals, ${nD} DREF)</span></div><div><b>CHF ${chf(rq)}</b><span>requested</span></div><div><b>CHF ${chf(fd)}</b><span>funded so far, as IFRC reports it</span></div></div>
 <div class="seg" role="group" aria-label="Which operations" style="margin:8px 0">${[['Emergency Appeal','Emergency appeals'],['DREF','DREF'],['all','All']].map(([k,l])=>`<button data-rf="${k}" aria-pressed="${rFilter===k}">${l}</button>`).join('')}</div>
 <p class="small muted" style="margin:0 0 6px">Largest unfunded amount first. <button class="more" id="reliefMap">Show on globe</button></p>
 <div class="relief-list">${show.map(a=>{const pct=a[7]?Math.min(100,a[8]/a[7]*100):0;return `<div class="rl-row"><div class="rl-t"><a href="${esc(a[11])}" target="_blank" rel="noopener">${esc(a[0])}</a><span class="sub">${esc(a[2])} · ${esc(a[3])} · ${esc(a[1])} · since ${esc(a[9])}</span></div>
  <div class="rl-bar" role="img" aria-label="${Math.round(pct)}% funded"><i style="width:${pct.toFixed(1)}%"></i></div><div class="rl-n">CHF ${chf(a[8])} of ${chf(a[7])} funded${a[12]?` · <a href="${esc(a[13]||a[11])}" target="_blank" rel="noopener">${esc(a[12])}</a>`:''}</div></div>`}).join('')}</div>
 ${L.length>20?`<button class="more" id="reliefMore">${rAll?'Show fewer':'Show all '+L.length}</button>`:''}
 <p class="small muted">An Emergency Appeal asks donors to fund a large or long operation; DREF is IFRC's fast fund for smaller or early responses, often fully covered when it is released. Blind spots: this is the Red Cross and Red Crescent movement only; UN agencies and other groups run their own appeals (overall humanitarian funding is tracked by <a href="https://fts.unocha.org/" target="_blank" rel="noopener">OCHA's Financial Tracking Service</a>). Amounts are in Swiss francs as IFRC reports them and funding figures lag. Multi-country appeals are pinned to the one country IFRC lists; global ones are not mapped.</p>
 <p class="note-line">Source: <a href="https://go.ifrc.org/" target="_blank" rel="noopener">IFRC GO</a>, open to the public, refreshed every 6 hours · collected ${esc(R.asOf)}. Names are IFRC's own.</p>`;
 h.querySelectorAll('[data-rf]').forEach(b=>b.onclick=()=>{rFilter=b.dataset.rf;rAll=false;renderRelief()});
 const m=h.querySelector('#reliefMore');if(m)m.onclick=()=>{rAll=!rAll;renderRelief()};
 h.querySelector('#reliefMap').onclick=()=>{turnOn('relief');O.flyTo(30,15)}}
function renderHelp(){const h=document.getElementById('helpHost');if(!h||h.dataset.done)return;h.dataset.done=1;
 const link=(n,u,d)=>`<li><a href="${u}" target="_blank" rel="noopener">${n}</a> <span class="muted">${d}</span></li>`;
 h.innerHTML=`<div class="sg-grid help-grid">
 <article class="dis"><h3>Give money, not things</h3><p class="small">Relief groups ask for cash: it buys what is needed close to the disaster, supports local shops and arrives faster. Donated goods have to be sorted, shipped and stored, and often are not what is needed. If an appeal on this page matters to you, give through the group running it, or through the national society linked beside it.</p></article>
 <article class="dis"><h3>Red Cross and Red Crescent</h3><ul class="help-list">${link('IFRC','https://www.ifrc.org/','the international federation that runs the appeals above')}${link('ICRC','https://www.icrc.org/','the International Committee of the Red Cross, for armed conflicts')}</ul><p class="small muted">Each appeal above links to the national society in that country.</p></article>
 <article class="dis"><h3>UN emergency funds and agencies</h3><ul class="help-list">${link('CERF','https://cerf.un.org/','the UN’s Central Emergency Response Fund')}${link('WFP','https://www.wfp.org/','food assistance')}${link('UNICEF','https://www.unicef.org/','children')}${link('UNHCR','https://www.unhcr.org/','refugees')}</ul></article>
 <article class="dis"><h3>Medical and relief groups</h3><ul class="help-list">${link('Médecins Sans Frontières','https://www.msf.org/','emergency medical care')}${link('International Rescue Committee','https://www.rescue.org/','crisis response and resettlement')}${link('Direct Relief','https://www.directrelief.org/','medicines and supplies')}</ul></article>
 <article class="dis"><h3>Check a charity first</h3><ul class="help-list">${link('Charity Navigator','https://www.charitynavigator.org/','U.S. charity ratings')}${link('BBB Wise Giving Alliance','https://give.org/','U.S. charity standards')}${link('Charity Commission register','https://register-of-charities.charitycommission.gov.uk/','UK registered charities')}</ul><p class="small muted">After big disasters, look out for new look-alike appeals and crowdfunding pages you cannot verify.</p></article>
 <article class="dis"><h3>Volunteer the useful way</h3><p class="small">Don’t travel to a disaster on your own: unplanned volunteers add to the load. Sign up and train with your local Red Cross or Red Crescent, or in the U.S. with a member of <a href="https://www.nvoad.org/" target="_blank" rel="noopener">National VOAD</a>, so you are ready when they call.</p></article>
 </div><p class="note-line">This list is the site’s own guide, not an endorsement or a ranking. The site takes no money from or for any group listed.</p>`}

function renderAll(){try{renderStorms()}catch(e){console.warn(e)}try{renderGrad()}catch(e){console.warn(e)}try{renderRelief()}catch(e){console.warn(e)}try{renderHelp()}catch(e){console.warn(e)}draw3d()}
renderAll();
const prev=O.setSnap;if(prev)O.setSnap=function(){const r=prev.apply(this,arguments);renderAll();return r};
})();
