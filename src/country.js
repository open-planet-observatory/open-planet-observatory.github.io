// ---------- Country briefs and watchlist ----------
// A brief is computed in the browser from the layers already on the page: counts of what sits inside
// the country's outline, each linked to its source. On the public site it adds a Wikipedia summary.
// No scores, no rankings, no AI text.
(function(){
const O=window.__obs;if(!O)return;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtN=n=>n==null?'–':Number(n).toLocaleString('en-US');
const FULL={'Dem. Rep. Congo':'Democratic Republic of the Congo','Central African Rep.':'Central African Republic','W. Sahara':'Western Sahara','S. Sudan':'South Sudan','Bosnia and Herz.':'Bosnia and Herzegovina','Dominican Rep.':'Dominican Republic','Eq. Guinea':'Equatorial Guinea','Solomon Is.':'Solomon Islands','Falkland Is.':'Falkland Islands','Fr. S. Antarctic Lands':'French Southern and Antarctic Lands','N. Cyprus':'Northern Cyprus','United States of America':'United States','eSwatini':'Eswatini',"Côte d'Ivoire":'Ivory Coast','Macedonia':'North Macedonia','Timor-Leste':'East Timor','Czechia':'Czech Republic'};
const inside=(f,lon,lat)=>{try{return d3.geoContains(f,[lon,lat])}catch(e){return false}};
const cells=s=>String(s||'').split(';').filter(Boolean).map(x=>{const [lon,lat,n]=x.split(',').map(Number);return {lon,lat,n}});
let current=null;

function facts(f){const name=f.properties.name,full=FULL[name]||name;const S=window.SNAP||{},T=window.SIT||{},Z=window.SIG||{},N=window.NAT||{};
 const rows=[];const add=(label,value,sub,layer,url,src)=>rows.push({label,value,sub,layer,url,src});
 const q=O.quakes().filter(d=>inside(f,d.lon,d.lat));if(q.length){const big=q.reduce((m,x)=>x.mag>m.mag?x:m,q[0]);add('Earthquakes, past 7 days',q.length,`largest M${big.mag.toFixed(1)}${big.place?' near '+big.place:''}`,'quake','https://earthquake.usgs.gov/earthquakes/map/','USGS')}else add('Earthquakes, past 7 days',0,'none M2.5+ recorded','quake','https://earthquake.usgs.gov/earthquakes/map/','USGS');
 const ev=O.events().filter(d=>inside(f,d.lon,d.lat));if(ev.length)add('Storms & wildfires',ev.length,ev.slice(0,3).map(e=>e.title).join(' · '),'event','https://eonet.gsfc.nasa.gov/','NASA EONET');
 const fc=O.fires().filter(d=>inside(f,d.lon,d.lat));const fn=d3.sum(fc,d=>d.n);if(fn)add('Fire detections, 24 h',fmtN(fn),'satellite heat signatures in cells centred here; most are farm burns','fire','https://firms.modaps.eosdis.nasa.gov/map/','NASA FIRMS');
 const al=O.alerts().filter(d=>inside(f,d.lon,d.lat));if(al.length)add('Severe weather alerts',al.length,al.slice(0,3).map(a=>a.ev).join(' · '),'alert','https://www.weather.gov/alerts','NWS');
 const gd=(T.gdacs||[]).filter(g=>inside(f,g[8],g[9]));gd.forEach(g=>add(g[2]+' disaster alert',g[1],g[5].slice(0,120),'gdacs',g[7]||'https://www.gdacs.org','GDACS'));
 const wars=(T.wars||[]).filter(w=>w[3].some(n=>n===full||n===name||FULL[n]===full));wars.forEach(w=>add(w[0]==='major'?'Major armed conflict':'Armed conflict',w[1],w[6],'war',w[8],'Wikipedia'));
 const el=(T.elections||[]).filter(e=>new RegExp('\\b'+full.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(e[1]));el.forEach(e=>add('Election '+e[0],e[1],'','', e[2],'Wikipedia'));
 const who=(T.who||[]).filter(w=>new RegExp('\\b'+full.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(w[0]));who.forEach(w=>add('Outbreak notice',w[0],w[1],'',w[3],'WHO'));
 const vo=(Z.volcano?.items||[]).filter(v=>v[5]!=null&&inside(f,v[5],v[6]));if(vo.length)add('Volcanoes in the weekly report',vo.length,vo.map(v=>v[0]).join(' · '),'volc','https://volcano.si.edu/reports_weekly.cfm','Smithsonian / USGS');
 const gpsCells=(Z.gpsjam?.cells||[]).map(c=>{if(typeof c==='string'){if(!window.h3)return null;const [lat,lon]=window.h3.cellToLatLng(c.split(':')[0]);return {lon,lat}}return {lon:c[0],lat:c[1]}}).filter(Boolean).filter(d=>inside(f,d.lon,d.lat));if(gpsCells.length)add('GPS interference cells',gpsCells.length,'aircraft reporting bad GPS ('+(Z.gpsjam?.date||'')+')','gps','https://gpsjam.org','GPSJAM');
 const fb=(Z.fireballs||[]).filter(x=>x[2]!=null&&inside(f,x[3],x[2]));if(fb.length)add('Fireballs',fb.length,'recent, detected by US government sensors','fb','https://cneos.jpl.nasa.gov/fireballs/','NASA JPL');
 (N.sightings?.groups||[]).forEach(g=>{const c=cells(g.cells).filter(d=>inside(f,d.lon,d.lat));const n=d3.sum(c,d=>d.n);if(n)add(g.name+' sightings (sample)',fmtN(n),'of a worldwide sample of '+fmtN(g.sampled)+' this week','nat-'+g.id,'https://www.inaturalist.org/observations?place_id=any&q='+encodeURIComponent(full),'iNaturalist')});
 const th=cells(N.threatened?.cells).filter(d=>inside(f,d.lon,d.lat));const tn=d3.sum(th,d=>d.n);if(tn)add('Threatened-species sightings (sample)',fmtN(tn),'locations blurred to 2° cells','nat-threat','https://www.inaturalist.org','iNaturalist');
 return {name,full,rows}}

function renderCountry(){const el=document.getElementById('ctyBody');if(!el)return;
 if(!current){el.innerHTML='<p class="small muted">Click or tap any country on the map. The brief lists what the map\u2019s layers show inside it, each with a link to the source.</p>';return}
 const {name,full,rows}=facts(current);const watched=getWatch().includes(name);
 el.innerHTML=`<div class="sg-h"><h3 style="font-size:1.3rem">${esc(full)}</h3><button class="more" id="watchBtn">${watched?'★ Watching':'☆ Watch'}</button></div><div id="ctyWiki" class="small muted"></div>
 <div class="sg-list" style="margin-top:8px">${rows.map(r=>{const long=typeof r.value==='string'&&r.value.length>14;return `<div class="sg-row"><span class="t" style="white-space:normal"><b>${esc(r.label)}</b>${long?`<span class="sub" style="color:var(--ink);font-weight:600">${esc(r.value)}</span>`:''}${r.sub?`<span class="sub">${esc(r.sub)}</span>`:''}<span class="sub"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.src)}</a>${r.layer?` · <button class="more" data-layer="${r.layer}">show layer</button>`:''}</span></span><span class="v" style="font-variant-numeric:tabular-nums;font-weight:700;color:var(--ink)">${long?'':esc(r.value)}</span></div>`}).join('')}</div>
 <p class="note-line" style="margin-top:10px">Counts are whatever the page\u2019s layers currently hold inside this outline; they are not a measure of risk or stability. Borders are Natural Earth\u2019s simplified shapes.</p>
 <div class="sg-list" style="margin-top:6px"><div class="sg-row"><span class="t">Read more: <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(full.replace(/ /g,'_'))}" target="_blank" rel="noopener">Wikipedia</a> · <a href="https://reliefweb.int/countries" target="_blank" rel="noopener">ReliefWeb</a> · <a href="https://www.gdacs.org/" target="_blank" rel="noopener">GDACS</a> · <a href="https://data.worldbank.org/country" target="_blank" rel="noopener">World Bank data</a></span></div></div>`;
 document.getElementById('watchBtn').onclick=()=>{toggleWatch(name);renderCountry();renderWatch()};
 el.querySelectorAll('button[data-layer]').forEach(b=>b.onclick=()=>{const chip=document.getElementById('chip-'+b.dataset.layer);if(chip&&chip.getAttribute('aria-pressed')!=='true')chip.click()});
 if(window.OBS_HOSTED){fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(full.replace(/ /g,'_'))).then(r=>r.json()).then(j=>{if(j.extract&&current&&current.properties.name===name)document.getElementById('ctyWiki').innerHTML=esc(j.extract.split('. ').slice(0,2).join('. ')+'.')+' <span class="src">Wikipedia (CC BY-SA)</span>'}).catch(()=>{})}
}
function open(f){current=f;renderCountry();if(O.openPanel)O.openPanel('country');else document.getElementById('country')?.scrollIntoView({behavior:'smooth'})}
O.countryHit(open);

// watchlist: names only, in this browser; a count snapshot so "new since last visit" can be shown
const getWatch=()=>{try{return JSON.parse(localStorage.getItem('obs-watch')||'[]')}catch(e){return []}};
const setWatch=w=>{try{localStorage.setItem('obs-watch',JSON.stringify(w))}catch(e){}};
const getSeen=()=>{try{return JSON.parse(localStorage.getItem('obs-watch-seen')||'{}')}catch(e){return {}}};
function toggleWatch(n){const w=getWatch();const i=w.indexOf(n);if(i>=0)w.splice(i,1);else w.push(n);setWatch(w)}
function summary(f){const r=facts(f).rows;return {quakes:+(r.find(x=>x.label.startsWith('Earthquakes'))?.value||0),alerts:r.filter(x=>/disaster alert|conflict|Outbreak|Storms|Severe/.test(x.label)).length,rows:r.length}}
function renderWatch(){const el=document.getElementById('watchBody');if(!el)return;const w=getWatch();const seen=getSeen();
 if(!w.length){el.innerHTML='<p class="small muted">No countries yet. Open a country brief and press \u201cWatch\u201d.</p>';return}
 const now={};el.innerHTML=`<div class="sg-list">${w.map(n=>{const f=O.countries.find(c=>c.properties.name===n);if(!f)return '';const s=summary(f);now[n]=s;const o=seen[n];const d=o?(s.quakes-o.quakes):0;const dn=o?(s.alerts-o.alerts):0;
  return `<div class="sg-row"><span class="t"><a href="#country" data-cty="${esc(n)}">${esc(FULL[n]||n)}</a><span class="sub">${s.quakes} quakes this week${d>0?` <span class="badge-y">+${d} since your last visit</span>`:''} · ${s.alerts} situations${dn>0?` <span class="badge-r">+${dn} new</span>`:''}</span></span><span class="v"><button class="more" data-unwatch="${esc(n)}">remove</button></span></div>`}).join('')}</div>
 <p class="note-line" style="margin-top:10px">\u201cSince your last visit\u201d compares with the counts saved when you last opened this list.</p>`;
 try{localStorage.setItem('obs-watch-seen',JSON.stringify(now))}catch(e){}
 el.querySelectorAll('a[data-cty]').forEach(a=>a.onclick=e=>{e.preventDefault();const f=O.countries.find(c=>c.properties.name===a.dataset.cty);if(f)open(f)});
 el.querySelectorAll('button[data-unwatch]').forEach(b=>b.onclick=()=>{toggleWatch(b.dataset.unwatch);renderWatch()});
}
renderCountry();renderWatch();
O.renderWatch=renderWatch;O.renderCountry=renderCountry;O.openCountry=open;
})();
