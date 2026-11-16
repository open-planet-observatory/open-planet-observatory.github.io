// ---------- Data block: the same facts at the foot of every main panel (recommendation #2, 15 Nov 2026) ----------
// Line 1: source (linked) · licence · when the site last collected it, with the source's own cadence.
// Line 2: "Blind spot:" what the data cannot see. Blind spots are the site's own explanatory copy (allowed by the
// project rules); they are written from each source's documentation and listed in the pull request for review.
// Licence and cadence wording is copied from the Library table so the two never disagree.
// Used by Signals, Disruptions and Situations (main panels); the map layers already show these facts in
// "Layers & readings". Other panels follow in a later change.
(function(){
const R={
 // Signals: planet vital signs
 co2:{n:'NOAA Global Monitoring Laboratory',u:'https://gml.noaa.gov/ccgg/trends/',lic:'Public domain',cad:'Daily',
  b:'One station high on a Hawaiian volcano; single days are noisy and get revised, so the long trend matters more than any one value.'},
 temp:{n:'NOAA NCEI Climate at a Glance',u:'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series',lic:'Public domain',cad:'Monthly',
  b:'Published about two weeks after each month ends; few weather stations in polar regions and parts of Africa, so those areas carry more uncertainty.'},
 seaice:{n:'NSIDC Sea Ice Index',u:'https://nsidc.org/data/seaice_index',lic:'Free with citation',cad:'Daily',
  b:'A satellite estimate on a 25 km grid; meltwater on summer ice can make the extent read low, and the latest days are provisional.'},
 rivers:{n:'USGS Water Services',u:'https://waterservices.usgs.gov/',lic:'Public domain',cad:'Every 15 min',
  b:'A few large U.S. rivers only; gauge readings are provisional and can be wrong when ice or debris affects a gauge.'},
 volc:{n:'Smithsonian / USGS Weekly Volcanic Activity Report',u:'https://volcano.si.edu/reports_weekly.cfm',lic:'Free with citation',cad:'Weekly',
  b:'A weekly summary of reported activity, not a complete list or a hazard forecast; eruptions in remote places can go unreported.'},
 // Signals: how people are living
 wiki:{n:'Wikimedia Pageviews',u:'https://wikimedia.org/api/rest_v1/',lic:'CC0',cad:'Daily',
  b:'English Wikipedia only; Wikimedia filters known bots, but some automated traffic still inflates single pages.'},
 eia:{n:'U.S. EIA Grid Monitor',u:'https://www.eia.gov/electricity/gridmonitor/',lic:'Public domain',cad:'Hourly',
  b:'The lower 48 states only; hourly figures are reported by the grid operators themselves and are revised later.'},
 drugs:{n:'openFDA drug shortages',u:'https://www.fda.gov/drugs/drug-safety-and-availability/drug-shortages',lic:'Public domain',cad:'As updated',
  b:'U.S. only; lists shortages reported to the FDA, and an entry stays until the FDA marks it resolved.'},
 recalls:{n:'CPSC and openFDA recalls',u:'https://www.cpsc.gov/Recalls',lic:'Public domain',cad:'Weekly',
  b:'U.S. only; cars, boats and pesticides are recalled by other agencies and are not included.'},
 gps:{n:'GPSJAM',u:'https://gpsjam.org/',lic:'Independent project; ask before reuse',cad:'Daily',
  b:'Inferred from aircraft that report poor GPS accuracy, so it only covers airspace where planes fly and cannot tell jamming from other faults.'},
 // Signals: science you can watch
 launch:{n:'Launch Library 2 (The Space Devs)',u:'https://thespacedevs.com/llapi',lic:'Free tier',cad:'Live',
  b:'A volunteer-maintained schedule; dates slip often, and some military launches are announced late or not at all.'},
 neo:{n:'NASA JPL CNEOS close approaches',u:'https://cneos.jpl.nasa.gov/ca/',lic:'NASA/JPL public service; credit requested',cad:'Daily',
  b:'Only asteroids already found; small ones are often discovered just days before or after they pass.'},
 fireball:{n:'NASA JPL CNEOS fireballs',u:'https://cneos.jpl.nasa.gov/fireballs/',lic:'NASA/JPL public service; credit requested',cad:'As detected',
  b:'Only bright fireballs seen by U.S. government sensors, often reported days or weeks later; many entries lack speed or direction.'},
 // Signals: civic & economic
 fedreg:{n:'U.S. Federal Register',u:'https://www.federalregister.gov/',lic:'Public domain',cad:'Daily',
  b:'Documents appear once published, often days after signing; the listing says what was signed, not what it will change.'},
 sanctions:{n:'OpenSanctions',u:'https://www.opensanctions.org/',lic:'Free non-commercial',cad:'Daily',
  b:'Combines official lists without judging them; who is listed is each listing authority’s decision.'},
 // Signals: radio & signals
 wspr:{n:'WSPR Live',u:'https://wspr.live/',lic:'Open database',cad:'Live',
  b:'Volunteer stations, mostly in North America and Europe; gaps show where nobody is listening, not a quiet sky.'},
 satnogs:{n:'SatNOGS Network',u:'https://network.satnogs.org/',lic:'CC BY-SA',cad:'Live',
  b:'Volunteer stations, unevenly spread around the world; a station going offline says nothing about the satellite.'},
 // Disruptions
 status:{n:'Company status pages',u:'https://www.githubstatus.com/api',lic:'Public; each company’s own terms',cad:'Live',
  b:'Each company’s own report; outages often appear late and are sometimes described as minor.'},
 faa:{n:'FAA National Airspace System status',u:'https://nasstatus.faa.gov/',lic:'Public domain',cad:'Live'},
 transit:{n:'MBTA, MTA and BART alerts',u:'https://www.mbta.com/developers',lic:'Open data',cad:'Live'},
 gdelt:{n:'GDELT Project',u:'https://www.gdeltproject.org/',lic:'Free with citation',cad:'15 min'},
 ioda:{n:'IODA (Georgia Tech)',u:'https://ioda.inetintel.cc.gatech.edu/',lic:'Free for research',cad:'Live'},
 radar:{n:'Cloudflare Radar',u:'https://radar.cloudflare.com/outage-center',lic:'CC BY-NC 4.0',cad:'Live'},
 nws:{n:'National Weather Service API',u:'https://api.weather.gov/',lic:'Public domain',cad:'Live',
  b:'U.S. only; alerts follow forecasters’ judgement and do not measure damage.'},
 kev:{n:'CISA Known Exploited Vulnerabilities',u:'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',lic:'Public domain',cad:'Daily'},
 nvd:{n:'NVD (NIST)',u:'https://nvd.nist.gov/',lic:'Public domain',cad:'Live'},
 // Situations
 wars:{n:'Wikipedia: ongoing armed conflicts',u:'https://en.wikipedia.org/wiki/List_of_ongoing_armed_conflicts',lic:'CC BY-SA, attribution',cad:'Edited daily',
  b:'Death figures are Wikipedia editors’ cited estimates, often disputed and months behind events; smaller conflicts get less coverage.'},
 gdacs:{n:'GDACS',u:'https://www.gdacs.org/',lic:'Free with attribution',cad:'Live',
  b:'Automatic alerts from computer models within minutes of an event; impact estimates are rough and revised as reports come in.'},
 who:{n:'WHO Disease Outbreak News',u:'https://www.who.int/emergencies/disease-outbreak-news',lic:'Free with attribution',cad:'As issued',
  b:'Published after countries report to WHO, often days or weeks after an outbreak starts, and only for outbreaks WHO chooses to report.'},
 elections:{n:'Wikipedia: national electoral calendar',u:'https://en.wikipedia.org/wiki/2026_national_electoral_calendar',lic:'CC BY-SA, attribution',cad:'Edited daily',
  b:'National votes only, as listed by Wikipedia editors; dates can still move.'},
 deaths:{n:'Wikidata and Wikipedia',u:'https://www.wikidata.org/',lic:'Wikidata CC0; Wikipedia text CC BY-SA 4.0',cad:'Daily',
  b:'Only people with articles in 40+ Wikipedia languages, listed 48 hours after death; it follows Wikipedia’s coverage, which leaves out much of the world.'}
};
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ago=t=>{const d=new Date(t);if(!t||isNaN(d))return'';const m=Math.round((Date.now()-d)/6e4);return m<1?'just now':m<60?m+' min ago':m<2880?Math.round(m/60)+' h ago':Math.round(m/1440)+' days ago'};
const utc=t=>{const d=new Date(t);return isNaN(d)?'':d.toISOString().slice(0,16).replace('T',' ')+' UTC'};
// owlSrc(ids, {t, b, cad}) -> HTML. ids: one registry key or several. t: when the site collected the data (ISO).
// b: a blind spot for the panel as a whole (used when a panel combines sources); otherwise each source's own.
function owlSrc(ids,o){o=o||{};const S=[].concat(ids).map(k=>R[k]).filter(Boolean);if(!S.length)return'';
 const many=S.length>1;
 const src=S.map(s=>`<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.n)} ↗</a>`+(many?` <span class="db-lic">(${esc(s.lic)})</span>`:'')).join(', ');
 const lic=many?'':` · <span class="db-lic">${esc(S[0].lic)}</span>`;
 const cad=String(o.cad||S[0].cad).toLowerCase();
 const when=o.t&&ago(o.t)?` · <span class="db-t" data-t="${esc(o.t)}" title="Collected ${esc(utc(o.t))}">collected ${ago(o.t)}</span>`:'';
 const blind=o.b||S.map(s=>s.b).filter(Boolean).join(' ');
 return `<div class="db"><div class="db-line">${src}${lic}${when} <span class="db-cad">(source updates: ${esc(cad)})</span></div>${blind?`<div class="db-blind"><b>Blind spot:</b> ${esc(blind)}</div>`:''}</div>`}
window.OWL_SRC=R;window.owlSrc=owlSrc;
window.owlSrcByUrl=u=>Object.keys(R).find(k=>R[k].u===u)||null;
// keep "collected … ago" current while the page stays open
setInterval(()=>document.querySelectorAll('.db-t[data-t]').forEach(e=>{const a=ago(e.dataset.t);if(a)e.textContent='collected '+a}),60000);
})();
