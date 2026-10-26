// ---------- The Moon: phase, distance, where it is overhead, next quarters and eclipses ----------
// Computed in the visitor's browser with Astronomy Engine (MIT licence, accurate to about an arcminute).
// Nothing here is fetched; it is the same sky everyone shares.
(function(){
const O=window.__obs,A=window.Astronomy;if(!O||!A)return;
const AU=149597870.7,DAY=864e5;
const fmtN=n=>Number(n).toLocaleString('en-US');
const NAMES=[[11.25,'New Moon'],[78.75,'Waxing crescent'],[101.25,'First quarter'],[168.75,'Waxing gibbous'],[191.25,'Full Moon'],[258.75,'Waning gibbous'],[281.25,'Last quarter'],[348.75,'Waning crescent'],[360,'New Moon']];
const QN=['New Moon','First quarter','Full Moon','Last quarter'];
function now(){const d=new Date();
 const phase=A.MoonPhase(d),frac=A.Illumination(A.Body.Moon,d).phase_fraction;
 const v=A.GeoMoon(d),dist=Math.hypot(v.x,v.y,v.z)*AU;
 const eq=A.EquatorFromVector(A.RotateVector(A.Rotation_EQJ_EQD(d),v));
 let lon=(eq.ra-A.SiderealTime(d))*15;lon=((lon%360)+540)%360-180;
 const prevNew=A.SearchMoonPhase(0,new Date(d-31*DAY),31);
 const q=[];let mq=A.SearchMoonQuarter(d);for(let i=0;i<4;i++){q.push(mq);mq=A.NextMoonQuarter(mq)}
 return {d,phase,frac,dist,lat:eq.dec,lon,age:prevNew?(d-prevNew.date)/DAY:null,name:NAMES.find(n=>phase<n[0])[1],quarters:q.map(x=>[QN[x.quarter],x.time.date])}}
let eclCache=null;
function eclipses(){if(eclCache&&Date.now()-eclCache.t<6*36e5)return eclCache;const d=new Date();
 const l=A.SearchLunarEclipse(d),s=A.SearchGlobalSolarEclipse(d);
 eclCache={t:Date.now(),lunar:{kind:l.kind,peak:l.peak.date,totalMin:l.sd_total,partialMin:l.sd_partial},solar:{kind:s.kind,peak:s.peak.date,lat:s.latitude,lon:s.longitude}};return eclCache}
O.moonNow=now;O.moonEclipses=eclipses;

// phase drawing, as seen from the Northern Hemisphere (lit side on the right while waxing)
function moonSvg(frac,phase,size=88){const r=size/2-3,c=size/2,waxing=phase<180,rx=Math.abs(1-2*frac)*r;
 const outer=waxing?1:0,term=waxing?(frac<.5?0:1):(frac<.5?1:0);
 return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Moon ${Math.round(frac*100)}% lit"><circle cx="${c}" cy="${c}" r="${r}" fill="#2b2f36" stroke="rgb(255 255 255 / .18)"/>`+
  (frac>.004?`<path d="M${c},${c-r} A${r},${r} 0 0 ${outer} ${c},${c+r} A${rx},${r} 0 0 ${term} ${c},${c-r}Z" fill="#f2efe4"/>`:'')+`</svg>`}
const when=d=>d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const day=d=>d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const ECL={penumbral:'Penumbral (a faint shading)',partial:'Partial',total:'Total',annular:'Annular (ring of fire)',hybrid:'Hybrid'};
function card(){const m=now(),e=eclipses();
 return `<article class="dis moon-card" id="moonCard"><h3>The Moon right now</h3>
 <div class="moon-top">${moonSvg(m.frac,m.phase)}<div><div class="moon-name">${m.name}</div>
 <div class="small muted">${Math.round(m.frac*100)}% lit · ${m.age!=null?m.age.toFixed(1)+' days since New Moon':''}</div>
 <div class="small muted">${fmtN(Math.round(m.dist))} km away (it ranges from about 356,500 to 406,700)</div>
 <div class="small muted">Overhead now: ${Math.abs(m.lat).toFixed(1)}°${m.lat>=0?'N':'S'}, ${Math.abs(m.lon).toFixed(1)}°${m.lon>=0?'E':'W'} <button class="linkbtn" id="moonGo">show on map</button></div></div></div>
 <div class="sg-list">${m.quarters.map(([n,d])=>`<div class="sg-row"><span class="t">${n}</span><span class="v">${when(d)}</span></div>`).join('')}</div>
 <p class="small muted" style="margin:8px 0 4px"><b>Next eclipses</b></p>
 <div class="sg-list"><div class="sg-row"><span class="t">Lunar · ${ECL[e.lunar.kind]||e.lunar.kind}<span class="sub">Visible wherever the Moon is up at the time${e.lunar.totalMin?', total for '+Math.round(e.lunar.totalMin*2)+' min':''}</span></span><span class="v">${day(e.lunar.peak)}</span></div>
 <div class="sg-row"><span class="t">Solar · ${ECL[e.solar.kind]||e.solar.kind}<span class="sub">${e.solar.lat!=null?`Greatest at ${Math.abs(e.solar.lat).toFixed(1)}°${e.solar.lat>=0?'N':'S'}, ${Math.abs(e.solar.lon).toFixed(1)}°${e.solar.lon>=0?'E':'W'} <button class="linkbtn" id="eclGo">show</button>`:'Partial only, seen near the poles'}</span></span><span class="v">${day(e.solar.peak)}</span></div></div>
 <div class="sg-foot"><span>Computed in your browser with <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener">Astronomy Engine</a> (MIT), accurate to about an arcminute. Times in your time zone. Phase drawn as seen from the Northern Hemisphere.</span></div></article>`}
function mount(){const grid=document.getElementById('sigGrid');if(!grid)return;let host=document.getElementById('moonHost');
 if(!host){host=document.createElement('div');host.id='moonHost';host.className='sg-grid';host.style.marginBottom='12px';grid.parentNode.insertBefore(host,grid)}
 host.innerHTML=card();const m=now(),e=eclipses();
 const go=document.getElementById('moonGo');if(go)go.onclick=()=>{O.flyTo(m.lon,m.lat);const c=document.getElementById('chip-moon');if(c&&c.getAttribute('aria-pressed')!=='true')c.click()};
 const eg=document.getElementById('eclGo');if(eg)eg.onclick=()=>O.flyTo(e.solar.lon,e.solar.lat)}

// map layer: the point where the Moon is straight overhead (2D; the 3D globe adds its own marker)
const G=O.addLayer({id:'moon',name:'Moon overhead',color:'--moon',shape:'circle',count:'',on:true,group:'Space'});
let sel=null;
function draw(){const m=now();const g=G.selectAll('g').data([m]).join(en=>{const g=en.append('g').attr('class','moon-mk');g.append('circle').attr('r',7).attr('fill','#f2efe4').attr('stroke','#2b2f36').attr('stroke-width',1.5);g.append('text').attr('dx',10).attr('dy',4).attr('class','nml');return g});
 g.select('text').text('Moon overhead');sel=g;O.bindTip(g,d=>`<b>The Moon is straight overhead here</b>${d.name}, ${Math.round(d.frac*100)}% lit, ${fmtN(Math.round(d.dist))} km up<br><span style="opacity:.75">Astronomy Engine, computed in your browser</span>`);
 const ct=document.querySelector('#chip-moon .ct');if(ct)ct.textContent=Math.round(m.frac*100)+'% lit';O.render()}
O.onRender(()=>{if(sel)O.place(sel,d=>[d.lon,d.lat])});
draw();mount();setInterval(()=>{draw();mount()},60e3);
})();
