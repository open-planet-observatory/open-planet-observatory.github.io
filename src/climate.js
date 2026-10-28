// ---------- Climate: what's unusual right now, El Niño / La Niña live and explained, space radiation ----------
// Every "unusual" item is a departure the source itself reports against its own baseline or scale. The explainer
// is this site's own teaching copy; the numbers in it come from NOAA's files collected for this page.
(function(){
const O=window.__obs;if(!O)return;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtN=n=>Number(n).toLocaleString('en-US');
const sgn=v=>(v>0?'+':v<0?'−':'')+Math.abs(+v.toFixed(2));
const strength=v=>{const a=Math.abs(v);return a>=2?'very strong':a>=1.5?'strong':a>=1?'moderate':a>=.5?'weak':'neutral'};
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const ord=n=>n+(['th','st','nd','rd'][(n%100-20)%10]||['th','st','nd','rd'][n%100]||'th');
function nextCpc(){const d=new Date();for(let k=0;k<3;k++){const y=d.getUTCFullYear(),m=d.getUTCMonth()+k;const first=new Date(Date.UTC(y,m,1));const th=1+((4-first.getUTCDay()+7)%7)+7;const t=new Date(Date.UTC(y,m,th,13));if(t>d)return t}return null}
// NOAA S-scale from ≥10 MeV proton flux (pfu)
const sLevel=f=>f>=1e5?5:f>=1e4?4:f>=1e3?3:f>=100?2:f>=10?1:0;

// ----- what's unusual right now -----
function unusual(){const S=window.SNAP||{},G=window.SIG||{},T=window.SIT||{};const items=[];
 const E=S.enso;if(E&&/El Niño|La Niña/.test(E.status||'')){const w=E.weekly[E.weekly.length-1],o=E.oni[E.oni.length-1];
  const higher=(E.strongest||[]).filter(e=>Math.sign(e[4])===Math.sign(o[2])&&Math.abs(e[4])>Math.abs(o[2]));
  items.push({tag:'Ocean',title:`${esc(E.status)}: a ${strength(o[2])} ${o[2]>0?'El Niño':'La Niña'}`,
   body:`The Niño 3.4 region of the Pacific was ${sgn(w[3])} °C from normal in the week of ${w[0]}; the three-month index (ONI) for ${o[0]} ${o[1]} is ${sgn(o[2])} °C. ${higher.length?`Since 1950 only ${higher.map(e=>`${e[1]}–${String(e[2]).slice(2)} (${sgn(e[4])})`).join(' and ')} peaked higher.`:'No event since 1950 peaked higher.'}`,
   src:'NOAA Climate Prediction Center',url:'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml',act:['Show on the globe',()=>O.showNino34&&O.showNino34(true)]})}
 const t=G.temp;if(t&&t.rank&&t.rank<=5){const m=(t.title.match(/Global Land and Ocean (\w+) Average/)||[])[1]||'';
  items.push({tag:'Heat',title:`${t.latest[0]}: the ${t.rank===1?'warmest':ord(t.rank)+'-warmest'} ${esc(m)} in ${t.n} years of records`,body:`${sgn(t.latest[1])} °C compared with the ${esc(t.base)} average for the whole planet, land and ocean.`,src:'NOAA National Centers for Environmental Information',url:'https://www.ncei.noaa.gov/access/monitoring/global-temperature-anomalies/'})}
 for(const pole of ['north','south']){const si=G.seaice&&G.seaice[pole];if(!si||!si.sameDay)continue;const d=si.extent-si.sameDay.avg1979to2025;if(Math.abs(d)<0.5)continue;
  items.push({tag:'Ice',title:`${pole==='north'?'Arctic':'Antarctic'} sea ice is ${Math.abs(d).toFixed(2)} million km² ${d<0?'below':'above'} average`,body:`${si.extent.toFixed(2)} million km² on ${si.date}, against a 1979–2025 average of ${si.sameDay.avg1979to2025.toFixed(2)} for that date. The lowest on record for the date was ${si.sameDay.min.toFixed(2)} (${si.sameDay.minYear}).`,src:'NSIDC Sea Ice Index',url:'https://nsidc.org/arcticseaicenews/'})}
 const sc=S.scales||{};const NAMES={G:'geomagnetic storm',S:'solar radiation storm',R:'radio blackout'};
 Object.entries(sc).filter(([k,v])=>v>=1).forEach(([k,v])=>items.push({tag:'Space',title:`NOAA ${k}${v} ${NAMES[k]} in progress`,body:`Level ${v} of 5 on NOAA's space weather scales.`,src:'NOAA Space Weather Prediction Center',url:'https://www.swpc.noaa.gov/noaa-scales-explanation'}));
 const R=S.radiation;if(R&&sLevel(R.flux10)>=1&&!(sc.S>=1))items.push({tag:'Space',title:`Solar radiation storm level S${sLevel(R.flux10)}`,body:`High-energy protons at ${fmtN(R.flux10)} pfu (S1 starts at 10).`,src:'NOAA SWPC, GOES',url:'https://www.swpc.noaa.gov/products/goes-proton-flux'});
 const big=String(S.quakes||'').split(';').filter(Boolean).map(x=>{const [a,pl]=x.split('|');const v=a.split(',').map(Number);return {lon:v[0],lat:v[1],mag:v[2],hrs:v[4],place:pl}}).filter(q=>q.mag>=7);
 big.forEach(q=>items.push({tag:'Earth',title:`Major earthquake: M${q.mag.toFixed(1)}${q.place?' near '+esc(q.place):''}`,body:`${q.hrs<24?q.hrs+' hours':Math.round(q.hrs/24)+' days'} ago. USGS calls M7 and above "major".`,src:'USGS',url:'https://earthquake.usgs.gov/earthquakes/map/',act:['Show',()=>O.flyTo(q.lon,q.lat)]}));
 (T.gdacs||[]).filter(x=>x[2]==='Red').forEach(x=>items.push({tag:'Disaster',title:`Red alert: ${esc(x[1])}`,body:esc(String(x[5]||'').slice(0,180)),src:'GDACS (UN / European Commission)',url:'https://www.gdacs.org/',act:['Show',()=>O.flyTo(x[8],x[9])]}));
 return items}
function renderUnusual(){const h=document.getElementById('unusualHost');if(!h)return;const it=unusual();
 h.innerHTML=`<h3 style="font-size:1rem;margin:4px 0 8px">Unusual right now <span class="small muted" style="font-weight:400">· ${it.length} item${it.length===1?'':'s'}</span></h3>`+(it.length?`<div class="unusual">${it.map((x,i)=>`<article class="dis un"><span class="un-tag">${x.tag}</span><h3>${x.title}</h3><p class="small">${x.body}</p><div class="sg-foot"><span><a href="${x.url}" target="_blank" rel="noopener">${esc(x.src)}</a></span>${x.act?`<button class="linkbtn" data-un="${i}">${x.act[0]}</button>`:''}</div></article>`).join('')}</div>`:'<p class="small muted">Nothing the sources flag as out of the ordinary right now.</p>');
 h.querySelectorAll('[data-un]').forEach(b=>b.onclick=()=>it[+b.dataset.un].act[1]())}

// ----- El Niño / La Niña now -----
function spark(vals,w=260,h=64,{zero=true,fmt=v=>v}={}){if(!vals.length)return '';const mx=Math.max(...vals.map(Math.abs),.5);const bw=w/vals.length;
 return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img">${zero?`<line x1="0" x2="${w}" y1="${h/2}" y2="${h/2}" stroke="currentColor" stroke-opacity=".25"/>`:''}${vals.map((v,i)=>{const bh=Math.abs(v)/mx*(h/2-2);return `<rect x="${i*bw+1}" width="${Math.max(1,bw-2)}" y="${v>=0?h/2-bh:h/2}" height="${bh}" fill="${v>=.5?'#e5484d':v<=-.5?'#2a78d6':'#9aa4b2'}"><title>${fmt(v,i)}</title></rect>`}).join('')}</svg>`}
function renderEnso(){const h=document.getElementById('ensoHost');const E=(window.SNAP||{}).enso;if(!h)return;if(!E){h.innerHTML='';return}
 const w=E.weekly,o=E.oni,lw=w[w.length-1],lo=o[o.length-1],nx=nextCpc();
 h.innerHTML=`<article class="dis enso-card"><div class="enso-top"><span class="enso-badge ${lo[2]>=.5?'warm':lo[2]<=-.5?'cool':''}">${esc(E.status||'ENSO status')}</span><span class="small muted">NOAA, issued ${esc(E.issued)}</span></div>
 ${E.synopsis?`<blockquote class="enso-q">“${esc(E.synopsis)}”<cite>NOAA Climate Prediction Center</cite></blockquote>`:''}
 <div class="enso-nums"><div><b>${sgn(lw[3])} °C</b><span>Niño 3.4 this week (${lw[0]})</span></div><div><b>${sgn(lo[2])} °C</b><span>ONI, ${lo[0]} ${lo[1]}: <i>${strength(lo[2])}</i></span></div><div><b>${sgn(lw[1])} °C</b><span>Off Peru and Ecuador (Niño 1+2)</span></div></div>
 <p class="small" style="margin:10px 0 2px"><b>Niño 3.4, week by week</b> <span class="muted">(past 6 months; red = El Niño range, +0.5 °C or more)</span></p>${spark(w.map(x=>x[3]),260,64,{fmt:(v,i)=>w[i][0]+': '+sgn(v)+' °C'})}
 <p class="small" style="margin:10px 0 2px"><b>Oceanic Niño Index</b> <span class="muted">(3-month averages, past 3 years)</span></p>${spark(o.map(x=>x[2]),260,64,{fmt:(v,i)=>o[i][0]+' '+o[i][1]+': '+sgn(v)+' °C'})}
 <p class="small" style="margin:12px 0 4px"><b>The strongest events since 1950</b> <span class="muted">(peak ONI, from NOAA's file)</span></p>
 <table class="tbl"><tbody>${(E.strongest||[]).map(e=>`<tr><td>${e[0]}</td><td>${e[1]}–${String(e[2]).slice(2)}</td><td class="n">${sgn(e[4])} °C</td><td class="small muted">${esc(e[3])}</td></tr>`).join('')}<tr class="enso-now"><td>${lo[2]>0?'El Niño':'La Niña'}</td><td>${E.ongoing?esc(E.ongoing[0].split(' ')[1]):''}–now</td><td class="n">${sgn(lo[2])} °C</td><td class="small muted">so far, still building</td></tr></tbody></table>
 <div class="sg-foot"><span>Next NOAA update ${nx?nx.toLocaleDateString(undefined,{month:'long',day:'numeric'}):'next month'} (the second Thursday of each month). Data: <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml" target="_blank" rel="noopener">NOAA CPC</a>, public domain.</span><button class="linkbtn" id="ensoGo">Show on the globe</button></div></article>`;
 document.getElementById('ensoGo').onclick=()=>O.showNino34&&O.showNino34(true)}

// ----- the explainer (this site's own teaching copy) -----
function pacific(kind){const warmX={normal:40,elnino:205,lanina:22}[kind],warmW={normal:120,elnino:150,lanina:95}[kind];const th={normal:'M20 120 C 150 118, 230 92, 330 78',elnino:'M20 112 C 150 108, 230 104, 330 100',lanina:'M20 128 C 150 124, 230 82, 330 66'}[kind];
 const wind={normal:'←  trade winds  ←',elnino:'trade winds weaken or reverse',lanina:'←←  stronger trade winds  ←←'}[kind];const cloudX={normal:60,elnino:230,lanina:45}[kind];
 return `<svg viewBox="0 0 350 160" width="100%" role="img" aria-label="${kind} conditions across the tropical Pacific"><rect x="20" y="58" width="310" height="92" fill="#16324f"/>
 <rect x="${warmX}" y="58" width="${warmW}" height="${kind==='elnino'?30:kind==='lanina'?42:36}" rx="6" fill="#e5484d" fill-opacity=".85"/>
 <path d="${th}" stroke="#9fd3ff" stroke-width="2" fill="none" stroke-dasharray="5 4"/><text x="250" y="${kind==='lanina'?60:kind==='elnino'?118:94}" font-size="9" fill="#9fd3ff" dy="${kind==='lanina'?-2:0}">thermocline</text>
 <rect x="0" y="40" width="20" height="110" fill="#5c7a3a"/><rect x="330" y="40" width="20" height="110" fill="#5c7a3a"/><text x="3" y="36" font-size="9" fill="currentColor">Asia/Australia</text><text x="290" y="36" font-size="9" fill="currentColor">S. America</text>
 <ellipse cx="${cloudX+30}" cy="18" rx="30" ry="10" fill="#c9d3de"/><text x="${cloudX+5}" y="52" font-size="9" fill="currentColor">rain</text>
 <text x="175" y="50" font-size="10" text-anchor="middle" fill="currentColor">${wind}</text></svg>`}
function renderLearn(){const h=document.getElementById('ensoLearn');if(!h||h.dataset.done)return;h.dataset.done=1;
 h.innerHTML=`<article class="dis learn"><h3>Understanding El Niño and La Niña</h3>
 <p class="small">El Niño and La Niña are the two moods of the tropical Pacific, the largest ocean on Earth. Together they are called ENSO (El Niño–Southern Oscillation). Every 2–7 years the ocean and the winds above it swing between them, and because the Pacific is so big, the swing changes rain, drought, storms and temperatures around the world.</p>
 <div class="learn-tabs" role="tablist">${[['normal','Normal'],['elnino','El Niño'],['lanina','La Niña']].map(([k,l],i)=>`<button role="tab" data-k="${k}" aria-pressed="${i===0}">${l}</button>`).join('')}</div>
 <div class="learn-fig" id="learnFig"></div><p class="small" id="learnTxt"></p>
 <h4>How NOAA measures it</h4>
 <p class="small">NOAA watches the sea surface in the <b>Niño 3.4 region</b> (5°N–5°S, 170°W–120°W; the dashed box on the globe). The <b>Oceanic Niño Index (ONI)</b> is the three-month average difference from normal there. El Niño is declared when the ONI stays at +0.5 °C or warmer for five overlapping three-month seasons; La Niña at −0.5 °C or cooler. Rough strength labels: 0.5–0.9 weak, 1.0–1.4 moderate, 1.5–1.9 strong, 2.0 and above very strong. NOAA's discussion also uses a relative index (RONI) that compares this region with the rest of the tropical ocean, so that the whole ocean warming is not mistaken for El Niño.</p>
 <h4>What El Niño tends to do</h4>
 <p class="small">These are tendencies, mostly in the Northern Hemisphere winter, not guarantees for any one place: wetter and stormier across the southern United States and Peru and Ecuador; milder winters across the northern US and Canada; drier conditions and more fire risk in Indonesia, Australia and southern Africa; a weaker Indian monsoon in many El Niño years; fewer Atlantic hurricanes and more in the central and eastern Pacific; and a boost to global temperature that usually shows up the following year. Warm water off Peru also starves the anchovy fishery of nutrients. La Niña tends toward the opposite.</p>
 <h4>Why it matters this year</h4>
 <p class="small" id="learnNow"></p>
 <div class="sg-foot"><span>Go deeper: <a href="https://www.climate.gov/enso" target="_blank" rel="noopener">NOAA Climate.gov ENSO blog</a> · <a href="https://www.cpc.ncep.noaa.gov/products/precip/CWlink/MJO/enso.shtml" target="_blank" rel="noopener">NOAA CPC ENSO page</a> · <a href="https://www.bom.gov.au/climate/enso/" target="_blank" rel="noopener">Australian Bureau of Meteorology</a></span></div></article>`;
 const TXT={normal:'Normally the trade winds blow from east to west along the equator, piling warm surface water up in the western Pacific near Indonesia. Cold, nutrient-rich water rises off South America to replace it. The warm pool feeds towering rain clouds in the west.',
  elnino:'In El Niño the trade winds weaken or even reverse. The warm water sloshes back east across the Pacific, the cold upwelling off South America shuts down, and the rain clouds follow the warm water toward the central and eastern Pacific, shifting weather patterns worldwide.',
  lanina:'In La Niña the trade winds blow harder than usual. Even more warm water piles up in the west, the cold tongue along the equator grows, and the rain shifts further west over Indonesia and Australia.'};
 const show=k=>{document.getElementById('learnFig').innerHTML=pacific(k);document.getElementById('learnTxt').textContent=TXT[k];h.querySelectorAll('.learn-tabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===k))};
 h.querySelectorAll('.learn-tabs button').forEach(b=>b.onclick=()=>show(b.dataset.k));show('normal');
 const E=(window.SNAP||{}).enso;const now=document.getElementById('learnNow');if(E&&now){const lo=E.oni[E.oni.length-1];const higher=(E.strongest||[]).filter(e=>e[4]>lo[2]);
  now.textContent=`The current event's three-month index has reached ${sgn(lo[2])} °C (${lo[0]} ${lo[1]}). In NOAA's records since 1950, ${higher.length?`only ${higher.map(e=>e[1]+'–'+String(e[2]).slice(2)).join(' and ')} peaked higher`:'no El Niño peaked higher'}. Big El Niños usually peak around December, so it may still grow. Switch on "Sea temperature vs normal" under Weather & ocean to see the warm tongue across the Pacific.`}}

// ----- space radiation (Signals) -----
function renderRad(){const R=(window.SNAP||{}).radiation;const grid=document.getElementById('sigGrid');if(!R||!grid)return;let host=document.getElementById('radHost');
 if(!host){host=document.createElement('div');host.id='radHost';host.className='sg-grid';host.style.marginBottom='12px';const moon=document.getElementById('moonHost');if(moon)moon.after(host);else grid.before(host)}
 const lv=sLevel(R.flux10),lvMax=sLevel(R.max24);
 host.innerHTML=`<article class="dis"><h3>Space radiation right now</h3><div class="enso-nums"><div><b>${lv?'S'+lv:'None'}</b><span>NOAA solar radiation storm level</span></div><div><b>${R.flux10<1?R.flux10.toFixed(2):fmtN(R.flux10)} pfu</b><span>high-energy protons (≥10 MeV), ${esc(R.satellite)}</span></div><div><b>${R.max24<1?R.max24.toFixed(2):fmtN(R.max24)} pfu</b><span>24-hour high${lvMax?' (S'+lvMax+')':''}</span></div></div>
 <p class="small">Protons from the Sun, measured by the GOES weather satellites. At 10 pfu NOAA declares an S1 storm; at S2 and above astronauts may shelter, polar flights can be rerouted for radio and dose, and satellites can glitch. On the ground the atmosphere shields us; this is not the radiation level where you live.</p>
 <div class="sg-foot"><span><a href="https://www.swpc.noaa.gov/products/goes-proton-flux" target="_blank" rel="noopener">NOAA Space Weather Prediction Center</a>, public domain · measured ${esc(R.time.replace('T',' '))} UTC</span></div></article>`}

function renderAll(){try{renderUnusual()}catch(e){console.warn(e)}try{renderEnso()}catch(e){console.warn(e)}try{renderLearn()}catch(e){console.warn(e)}try{renderRad()}catch(e){console.warn(e)}}
renderAll();
const prev=O.setSnap;if(prev)O.setSnap=function(){const r=prev.apply(this,arguments);renderAll();return r};
})();
