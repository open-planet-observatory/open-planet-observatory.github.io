// ---------- Collection status: what the collector did on its last run, group by group ----------
// Reads data/meta.json (written by collector/collect.mjs on every run: lastRun = this run's result per group,
// snap/nature/steps/solar/orbits = the time of each group's last successful fetch). Nothing new is collected for this card.
// Shown as a card in Sources, under "Automatic data checks". Only on the public site.
// SWITCH: LIVE is true (switched on 15 Nov 2026), so every visitor sees the card. Set LIVE to false to hide it again (it then
// appears only with ?status=1). Remove this file's line in build/build.mjs to undo completely.
(function(){
if(!window.OBS_HOSTED)return;
const LIVE=true;
if(!LIVE&&!/[?&]status=1\b/.test(location.search))return;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// The site's own names for the collector's groups (the collector's keys are short code names).
const SNAP={quakes:'Earthquakes · USGS',fires:'Fire detections · NASA FIRMS',alerts:'Weather alerts · U.S. National Weather Service',eonet:'Natural events · NASA EONET',
 tle:'Space station orbits · CelesTrak',satGroups:'Satellite constellations · CelesTrak',aiModels:'AI model releases · Epoch AI',space:'Space weather · NOAA SWPC',
 enso:'El Niño and La Niña · NOAA Climate Prediction Center',radiation:'Space radiation · NOAA SWPC',storms:'Tropical cyclones · GDACS',groundRad:'Ground radiation · Safecast',
 relief:'Emergency appeals · IFRC GO',air:'Air traffic density · OpenSky Network',lora:'LoRa gateways · TTN Mapper',news:'News volume by hazard · GDELT'};
const NAT={sightings:'Wildlife sightings · iNaturalist',threatened:'Threatened species sightings · iNaturalist',migration2:'Seasonal movement of species',trends:'Long-run species trends · GBIF, IUCN',ebird:'Rare bird sightings · eBird'};
// Steps are keyed "<number>:<first 40 letters of the step's name>"; matched on the name so a renumbering can't mislabel a row.
const STEPS=[[/^situations/,'Situations · GDACS, WHO, Wikipedia, Wikidata','Situations, signals and disruptions'],[/^signals, open/,'Signals · open-access group','Situations, signals and disruptions'],
 [/JPL fireballs/,'Fireballs and close approaches · NASA JPL','Situations, signals and disruptions'],[/NSIDC/,'Sea ice · NSIDC','Situations, signals and disruptions'],
 [/SatNOGS/,'Satellite ground stations · SatNOGS','Situations, signals and disruptions'],[/Smithsonian weekly/,'Weekly volcano report · Smithsonian','Situations, signals and disruptions'],
 [/volcano coordinates/,'Volcano positions · Smithsonian','Situations, signals and disruptions'],[/GPSJAM/,'Navigation interference · GPSJAM','Situations, signals and disruptions'],
 [/^disruptions/,'Disruptions · status pages, transit, NVD, NWS','Situations, signals and disruptions'],[/FAA airport/,'Airport status · FAA','Situations, signals and disruptions'],
 [/CISA known/,'Exploited vulnerabilities · CISA','Situations, signals and disruptions'],[/GDELT disruption/,'Disruption headlines · GDELT','Situations, signals and disruptions'],
 [/^radar$/,'Internet traffic · Cloudflare Radar','Situations, signals and disruptions'],
 [/^watch, open/,'Watch · open-access group','Tech & Industry (section hidden for now)'],[/CISA advisories/,'Advisories · CISA','Tech & Industry (section hidden for now)'],
 [/NIH news/,'News releases · NIH','Tech & Industry (section hidden for now)'],[/arXiv/,'Newest preprints · arXiv','Tech & Industry (section hidden for now)'],
 [/EurekAlert/,'Press releases · EurekAlert!','Tech & Industry (section hidden for now)'],[/FDA novel/,'Drug approvals · FDA','Tech & Industry (section hidden for now)'],
 [/^economy, open/,'Economy · open-access group','Tech & Industry (section hidden for now)'],[/SEC EDGAR/,'Company filings · SEC EDGAR','Tech & Industry (section hidden for now)'],
 [/Alpha Vantage/,'Market quotes · Alpha Vantage','Tech & Industry (section hidden for now)'],
 [/^unexplained, open/,'Unexplained · USGS, CelesTrak, Minor Planet Center','Unexplained'],[/GraceDB/,'Gravitational-wave candidates · GraceDB','Unexplained'],
 [/static figures/,'Fixed figures · AARO report, CHIME catalogue','Unexplained']];
// [key in lastRun, name, area, where its last-fetch time is kept in meta.json (or null)]
const OTHER=[['forecast','Wind and temperature forecast · NOAA GFS via PacIOOS','Map layers',null],['orbits','Satellite catalogue · CelesTrak','Space',m=>m.orbits?.catalog],['solar','Spacecraft, comets and close approaches · NASA JPL','Space',m=>m.solar?.all],
 ['exoplanets','Exoplanets · NASA Exoplanet Archive','Space',m=>m.solar?.exo2],['sun','Today’s Sun image · NASA SDO','Space',null],['moonFeatures','Moon place names · IAU gazetteer','Space',null],
 ['grace','Ice and water mass · NASA GRACE-FO','Space',null],
 ['history','This date in history · Wikipedia, USGS','Sections built from sources',null],['records','Records · Wikidata and agencies','Sections built from sources',null],
 ['recordWatch','Record watch · NOAA, Copernicus, NSIDC, NASA, USGS','Sections built from sources',null],['predictions','Predictions · Polymarket','Sections built from sources',null],
 ['game','Where on Earth? daily puzzle','Sections built from sources',null],['forecastDesk','The Forecast Desk questions','Sections built from sources',null],['weeklyHunt','The weekly hunt','Sections built from sources',null]];
const AREAS=['Map layers','Nature','Situations, signals and disruptions','Unexplained','Space','Sections built from sources','Tech & Industry (section hidden for now)','Other'];
// Collector messages are written for the maintainer; plain() turns the known ones into words for visitors and removes
// internal names (environment variables, the maintainer, Claude's refresh task). Anything else is shown as the collector wrote it.
function plain(d){d=String(d||'');
 if(/needs the .*connector|refresh task only/i.test(d))return'Collected only by the daily refresh, not by the public site';
 if(/\b[A-Z][A-Z0-9_]*_(KEY|TOKEN|SECRET|ID)\b.*not set/.test(d))return'Needs a free access key that has not been set up yet';
 if(/HTTP 429/.test(d))return'The source asked for fewer requests (HTTP 429); trying again on the next run';
 d=d.replace(/;?\s*waiting for the maintainer/i,'').replace(/\b[A-Z][A-Z0-9_]*_(KEY|TOKEN|SECRET|ID)\b/g,'an access key');
 return d.replace(/^paused:\s*/i,'')}
// One result string from the collector -> [css class, word shown, detail shown]. The detail is the collector's message in plain words (plain()).
// A web address inside a message keeps its host and path but loses its query string (a query string can carry a key).
// loose = the result is a free-form note from a section builder, not a plain ok/kept/error.
function state(s,loose){s=String(s??'');
 if(/^error/.test(s)){const d=s.replace(/^error:\s*/,'').replace(/(https?:\/\/[^\s?]+)\?\S*/g,'$1?…');
  if(/^(paused|skipped)|not set|no new data/i.test(d))return['warn',/no new data/i.test(d)?'No new data':/not set/i.test(d)?'Needs a key':'Paused',plain(d)];
  return['fail','Failed',plain(d)]}
 if(/^kept/.test(s))return['skip','Not due',''];
 if(s==='not run'||!s)return['skip','Not run',''];
 if(/^ok/.test(s))return['pass','Fetched',/^ok \(/.test(s)?s.replace(/^ok \(|\)$/g,''):''];
 if(loose&&s.split(' · ').every(p=>/(^|\s)kept$/.test(p.trim())))return['skip','Not due',''];
 return['pass',loose?'Ran':'Fetched',''];}
const when=t=>{const d=new Date(t);if(!t||isNaN(d))return'';const min=Math.round((Date.now()-d)/6e4);
 const ago=min<1?'just now':min<60?min+' min ago':min<2880?Math.round(min/60)+' h ago':Math.round(min/1440)+' days ago';
 return`<span title="${esc(d.toISOString().slice(0,16).replace('T',' '))} UTC">${ago}</span>`};
function rows(m){const lr=m.lastRun||{},out=[];
 for(const [k,v] of Object.entries(lr.snap||{}))out.push({area:'Map layers',name:SNAP[k]||k,s:v,t:m.snap?.[k]});
 for(const [k,v] of Object.entries(lr.nature||{}))out.push({area:'Nature',name:NAT[k]||k,s:v,t:m.nature?.[k]});
 for(const [k,v] of Object.entries(lr.steps||{})){const nm=k.replace(/^\d+:/,'');const hit=STEPS.find(x=>x[0].test(nm));out.push({area:hit?hit[2]:'Other',name:hit?hit[1]:nm,s:v,t:m.steps?.[k]})}
 for(const [k,name,area,at] of OTHER)if(k in lr&&typeof lr[k]==='string')out.push({area,name,s:lr[k],t:at?at(m):null,loose:true});
 // the Tech & Industry section is hidden from visitors, so its sources are left out of the card too
 return out.filter(r=>!/section hidden/.test(r.area))}
async function load(){let m;try{m=await (await fetch('data/meta.json?t='+Date.now(),{cache:'no-store'})).json()}catch(e){return}
 try{const lib=document.getElementById('library');if(!lib||!m||!m.lastRun)return;
  let card=document.getElementById('statusCard');
  if(!card){card=document.createElement('article');card.id='statusCard';card.className='dis checks-card';const after=document.getElementById('checksCard')||lib.querySelector('.sec-head');if(!after)return;after.after(card)}
  const R=rows(m).map(r=>({...r,st:state(r.s,r.loose)}));const n=c=>R.filter(r=>r.st[0]===c).length;
  const late=(Date.now()-new Date(m.updated))/6e4>45;const attn=R.filter(r=>r.st[0]==='warn'||r.st[0]==='fail');const open=!!card.querySelector('#statusAll[open]');
  const ROW=r=>`<div class="sg-row chk ${r.st[0]}"><span class="t"><span class="ic" title="${esc(r.st[1])}">${{pass:'✓',fail:'✕',warn:'!',skip:'–'}[r.st[0]]}</span> ${esc(r.name)}${r.st[2]&&r.st[2].toLowerCase()!==r.st[1].toLowerCase()?`<span class="sub">${esc(r.st[2])}</span>`:''}</span><span class="v">${esc(r.st[1])}${r.t?' · '+when(r.t):''}</span></div>`;
  card.innerHTML=`<h3>Collection status</h3><p class="small muted">What the collector did on its last run, group by group. <b>Fetched</b>: the source answered on this run. <b>Not due</b>: the source is on a slower schedule, so the last copy is in use. <b>Paused</b>, <b>Needs a key</b>, <b>No new data</b> and <b>Failed</b> say why, in plain words. The time on the right is that group’s last successful fetch. Last run ${when(m.updated)}.</p>`+
   (late?`<p class="small"><b>The collector has not finished a run in the last 45 minutes.</b> What the site shows is from the last run above.</p>`:'')+
   `<p class="small" id="statusSum"><b>${n('pass')}</b> fetched · <b>${n('skip')}</b> not due · <b>${n('warn')}</b> paused or waiting · <b>${n('fail')}</b> failed · ${R.length} groups</p>`+
   (attn.length?`<p class="small" style="margin:10px 0 4px"><b>Not collecting right now</b></p><div class="sg-list" id="statusAttn">${attn.map(ROW).join('')}</div>`:'')+
   `<details id="statusAll"${open?' open':''}><summary class="small" style="cursor:pointer;margin:10px 0 4px">All ${R.length} groups</summary>`+
   AREAS.filter(a=>R.some(r=>r.area===a)).map(a=>`<p class="small" style="margin:10px 0 4px"><b>${esc(a)}</b></p><div class="sg-list">${R.filter(r=>r.area===a).map(ROW).join('')}</div>`).join('')+`</details>`+
   `<div class="sg-foot"><span>Read from <a href="data/meta.json" target="_blank" rel="noopener">data/meta.json</a>, the collector’s own record of each run. Each source’s licence and cadence is in the table below.</span></div>`;
 }catch(e){const c=document.getElementById('statusCard');if(c)c.remove()}}
load();setInterval(load,5*60e3);
window.__owlStatus={state,rows};
})();
