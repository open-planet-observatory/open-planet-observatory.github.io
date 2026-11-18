// ---------- Observation Deck: a full-screen, rearrangeable board of panels over the site's live data (work in progress) ----------
// Reads only what the page already has (window.SNAP, SIT, SIG and the country shapes): nothing new is collected.
// Every headline and description is the source's own text; numbers are shown as the source gives them.
// Three looks to choose from while it is a mock-up: Control (the site's colours), Phosphor (green on black) and Mix.
// The layout, look and scope centre are kept in this browser only (localStorage), never sent anywhere.
// SWITCH: LIVE is true (switched on 15 Nov 2026), so every visitor sees the "Observation Deck" button. Set LIVE to false
// to hide it again (it then appears only with ?deck=1). Undo completely: remove this file from build/build.mjs.
(function(){
if(!window.OBS_HOSTED)return;
const LIVE=true;
if(!LIVE&&!/[?&]deck=1\b/.test(location.search))return;
const KEY='owl-deck-v1',esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}},save=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}};
const ago=h=>h<1?'<1 h ago':h<48?Math.round(h)+' h ago':Math.round(h/24)+' d ago';
const R=Math.PI/180,dist=(a,b,c,d)=>{const x=Math.sin((c-a)*R/2)**2+Math.cos(a*R)*Math.cos(c*R)*Math.sin((d-b)*R/2)**2;return 12742*Math.asin(Math.sqrt(x))};
const bear=(a,b,c,d)=>{const y=Math.sin((d-b)*R)*Math.cos(c*R),x=Math.cos(a*R)*Math.sin(c*R)-Math.sin(a*R)*Math.cos(c*R)*Math.cos((d-b)*R);return(Math.atan2(y,x)/R+360)%360};
const dir=b=>['N','NE','E','SE','S','SW','W','NW'][Math.round(b/45)%8];
// Scope centres: a short list of cities (rounded to 0.1°). The visitor's own location is never asked for.
const PLACES=[['Tokyo',35.7,139.7],['Jakarta',-6.2,106.8],['Manila',14.6,121.0],['Los Angeles',34.1,-118.2],['Mexico City',19.4,-99.1],['Santiago',-33.4,-70.7],
 ['Lima',-12.0,-77.0],['Istanbul',41.0,29.0],['Tehran',35.7,51.4],['Kathmandu',27.7,85.3],['Wellington',-41.3,174.8],['Anchorage',61.2,-149.9],['Reykjavík',64.1,-21.9],
 ['New York',40.7,-74.0],['Chicago',41.9,-87.6],['London',51.5,-0.1],['Nairobi',-1.3,36.8],['Sydney',-33.9,151.2]];
const quakes=()=>{const s=(window.SNAP||{}).quakes||'';return s?s.split(';').map(r=>{const[a,place]=r.split('|');const[lon,lat,mag,dep,hrs]=a.split(',').map(Number);return{lon,lat,mag,dep,hrs,place:place||''}}).filter(q=>isFinite(q.lat)&&isFinite(q.lon)):[]};
const cells=s=>(s||'').split(';').filter(Boolean).map(r=>r.split(',').map(Number));
const SRC={usgs:'USGS Earthquake Hazards · public domain',firms:'NASA FIRMS · VIIRS NOAA-20',eonet:'NASA EONET',gdacs:'GDACS (UN / European Commission)',swpc:'NOAA SWPC · public domain',
 opensky:'The OpenSky Network · 10° cells, no single aircraft',adsblol:'adsb.lol · Open Database License (ODbL 1.0)',noaa:'NOAA GML, NOAA NCEI, NSIDC',ll:'Launch Library 2 (The Space Devs)',
 nws:'U.S. National Weather Service · public domain',who:'WHO Disease Outbreak News',ifrc:'IFRC GO · open to the public',status:'Each service\u2019s own status page',gdacsTc:'GDACS tropical cyclones',
 celes:'Orbits: CelesTrak elements, positions computed in your browser',astro:'Computed in your browser with Astronomy Engine',jpl:'NASA JPL Horizons',gfs:'NOAA GFS model forecast via PacIOOS ERDDAP · public domain'};
// Scheduled airliners (data/airliners.json, collector/airliners.mjs): hourly, positions rounded to 0.1°, operator and type only.
const AIR={data:null,err:'',t:0,busy:false};
function loadAir(){if(AIR.busy||Date.now()-AIR.t<3e5)return;AIR.busy=true;fetch('data/airliners.json?t='+Math.floor(Date.now()/3e5),{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error(r.status===404?'not collected yet':'HTTP '+r.status)))
 .then(j=>{AIR.data=j;AIR.err=''},e=>{AIR.data=null;AIR.err=e.message}).finally(()=>{AIR.busy=false;AIR.t=Date.now();if(opened)render()})}
// ---------- the panels (widgets) ----------
const W={
 map:{title:'World map',w:8,h:8,src:()=>SRC.usgs+' · '+SRC.firms+' · '+SRC.eonet,asof:()=>(window.SNAP||{}).asOf,draw:drawMap},
 qscope:{title:'Quake scope',w:4,h:8,src:()=>SRC.usgs,asof:()=>(window.SNAP||{}).asOf,draw:(el,st)=>scope(el,st,'q')},
 ascope:{title:'Air traffic scope',w:4,h:8,src:()=>SRC.opensky,asof:()=>{const t=((window.SNAP||{}).air||{}).time;return t?new Date(t*1e3).toISOString().slice(0,16)+'Z':''},draw:(el,st)=>scope(el,st,'a')},
 lscope:{title:'Airliner scope',w:4,h:8,src:()=>SRC.adsblol,asof:()=>AIR.data&&!AIR.data.failed?AIR.data.asOf:'',draw:(el,st)=>scope(el,st,'l')},
 quakes:{title:'Earthquakes, past 7 days',w:4,h:6,src:()=>SRC.usgs,asof:()=>(window.SNAP||{}).asOf,draw:drawQuakes},
 disasters:{title:'Disaster alerts',w:4,h:6,src:()=>SRC.gdacs,asof:()=>(window.SIT||{}).asOf,draw:drawGdacs},
 space:{title:'Space weather',w:4,h:4,src:()=>SRC.swpc,asof:()=>(window.SNAP||{}).asOf,draw:drawSpace},
 planet:{title:'Planet signals',w:4,h:4,src:()=>SRC.noaa,asof:()=>(window.SIG||{}).asOf,draw:drawSignals},
 launches:{title:'Launches',w:4,h:5,src:()=>SRC.ll,asof:()=>(window.SIG||{}).asOf,draw:drawLaunches},
 wind:{title:'Wind forecast',w:8,h:7,src:()=>SRC.gfs,asof:()=>{const j=window.OwlWind&&window.OwlWind.index&&window.OwlWind.index();return j&&!j.failed?j.built:''},draw:drawWind},
 clocks:{title:'Clocks',w:4,h:3,src:()=>'Your device clock',asof:()=>'',draw:drawClocks},
 /* more panels (15 Nov 2026, the maintainer chose hazards, people & services, and sky & space): all from data the page already has */
 fires:{title:'Active fires',w:4,h:5,src:()=>SRC.firms,asof:()=>(window.SNAP||{}).asOf,draw:drawFires},
 events:{title:'Natural events',w:4,h:6,src:()=>SRC.eonet,asof:()=>(window.SNAP||{}).asOf,draw:drawEvents},
 storms:{title:'Tropical storms',w:4,h:5,src:()=>SRC.gdacsTc,asof:()=>((window.SNAP||{}).storms||{}).asOf,draw:drawStorms},
 warnings:{title:'U.S. weather warnings',w:4,h:5,src:()=>SRC.nws,asof:()=>(window.DIS||{}).asOf,draw:drawWarnings},
 outbreaks:{title:'Disease outbreak news',w:4,h:6,src:()=>SRC.who,asof:()=>(window.SIT||{}).asOf,draw:drawWho},
 relief:{title:'Red Cross appeals',w:4,h:6,src:()=>SRC.ifrc,asof:()=>((window.SNAP||{}).relief||{}).asOf,draw:drawRelief},
 status:{title:'Internet & cloud status',w:4,h:6,src:()=>SRC.status,asof:()=>(window.DIS||{}).asOf,draw:drawStatus},
 stations:{title:'Space stations now',w:4,h:4,src:()=>SRC.celes,asof:()=>'',draw:drawStations},
 skynow:{title:'Sun and Moon now',w:4,h:4,src:()=>SRC.astro,asof:()=>'',draw:drawSkyNow},
 voyager:{title:'Voyager 1',w:4,h:3,src:()=>SRC.jpl,asof:()=>'',draw:drawVoyager},
 /* four new feeds (16 Nov 2026): collector/snap.mjs nhc, tsunami, aurora, volcanoes; U.S. government, public domain */
 hurricanes:{title:'Hurricane Center',w:4,h:4,src:()=>'NOAA National Hurricane Center · public domain',asof:()=>((window.SNAP||{}).nhc||{}).asOf,draw:drawNhc},
 tsunami:{title:'Tsunami messages',w:4,h:5,src:()=>'NOAA Tsunami Warning Centers · public domain',asof:()=>((window.SNAP||{}).tsunami||{}).asOf,draw:drawTsunami},
 aurora:{title:'Aurora forecast',w:4,h:5,src:()=>'NOAA SWPC OVATION · public domain',asof:()=>((window.SNAP||{}).aurora||{}).asOf,draw:drawAurora},
 volcanoes:{title:'U.S. volcano alerts',w:4,h:6,src:()=>'USGS Volcano Hazards Program · public domain',asof:()=>((window.SNAP||{}).volcanoes||{}).asOf,draw:drawVolcanoes}};
const DEFAULT={look:'mix',place:0,panels:['map','qscope','wind','quakes','disasters','space','status','ascope','planet','launches','clocks'].map(t=>({t,s:'m'}))};
let st=Object.assign({},DEFAULT,load()||{}),root,grid,timer,anim,prevLoop=null,opened=false;
if(!Array.isArray(st.panels))st.panels=DEFAULT.panels.slice();st.panels=st.panels.filter(p=>W[p.t]);
const size=p=>{const w=W[p.t];const k=p.s==='s'?.75:p.s==='l'?1.5:1;return{w:Math.min(12,Math.max(3,Math.round(w.w*k))),h:Math.max(3,Math.round(w.h*k))}};
function frame(){root.innerHTML=`<div class="dk-bar"><b class="dk-title">OBSERVATION DECK</b><span class="dk-wip">work in progress</span><span class="dk-utc" id="dkUtc"></span>
 <label>Look <select id="dkLook"><option value="mix">Mix</option><option value="control">Control</option><option value="phosphor">Phosphor</option></select></label>
 <div class="dk-add"><button type="button" id="dkAddBtn" aria-haspopup="true" aria-expanded="false">＋ Add panel</button><div class="dk-menu" id="dkMenu" hidden></div></div>
 <button type="button" id="dkReset">Reset layout</button><button type="button" id="dkClose" aria-label="Close the Observation Deck">✕</button></div><div class="dk-grid" id="dkGrid"></div>
 <p class="dk-foot">Panels show the site’s own data, as each source publishes it. Every scope centre is a city, never your own location. Your layout stays in this browser.</p>`;
 grid=root.querySelector('#dkGrid');const look=root.querySelector('#dkLook');look.value=st.look;look.onchange=()=>{st.look=look.value;root.dataset.look=st.look;save(st);render()};
 const ab=root.querySelector('#dkAddBtn'),menu=root.querySelector('#dkMenu');
 ab.onclick=()=>{const avail=Object.keys(W).filter(t=>!st.panels.some(p=>p.t===t));menu.innerHTML=avail.length?avail.map(t=>`<button type="button" data-t="${t}">${esc(W[t].title)}</button>`).join(''):'<p>Every panel is on the deck.</p>';
  menu.hidden=!menu.hidden;ab.setAttribute('aria-expanded',String(!menu.hidden));menu.querySelectorAll('button').forEach(b=>b.onclick=()=>{st.panels.push({t:b.dataset.t,s:'m'});save(st);menu.hidden=true;render()})};
 root.querySelector('#dkReset').onclick=()=>{st=JSON.parse(JSON.stringify(DEFAULT));save(st);look.value=st.look;root.dataset.look=st.look;render()};
 root.querySelector('#dkClose').onclick=close}
function expand(p){const w=W[p.t];if(!w||!root)return;const old=root.querySelector('.dk-ov');if(old)old.remove();const a=w.asof();const ov=document.createElement('section');ov.className='dk-ov dk-p';ov.dataset.t=p.t;ov.setAttribute('role','dialog');ov.setAttribute('aria-label',w.title+', expanded');
 ov.innerHTML=`<header><b>${esc(w.title.toUpperCase())}</b><span class="dk-ctl"><button type="button" class="dk-ovx" aria-label="Close the expanded panel">✕ Close</button></span></header><div class="dk-body"></div><footer>${esc(w.src())}${a?' · as of '+esc(String(a).replace('T',' ')):''}</footer>`;
 root.appendChild(ov);const shut=()=>{ov.querySelectorAll('canvas').forEach(c=>cancelAnimationFrame(c._raf));ov.remove();removeEventListener('keydown',kd,true)};const kd=e=>{if(e.key==='Escape'){e.stopPropagation();shut()}};addEventListener('keydown',kd,true);ov.querySelector('.dk-ovx').onclick=shut;
 try{w.draw(ov.querySelector('.dk-body'),p)}catch(e){ov.querySelector('.dk-body').innerHTML='<p class="dk-dim">This panel could not be drawn.</p>'}ov.querySelector('.dk-ovx').focus()}
// stop every running panel animation before the panels are rebuilt (render runs again every minute and on each change)
function render(){if(!grid)return;cancelAnimationFrame(anim);grid.querySelectorAll('canvas').forEach(c=>cancelAnimationFrame(c._raf));grid.innerHTML='';
 st.panels.forEach((p,i)=>{const w=W[p.t],z=size(p);const el=document.createElement('section');el.className='dk-p';el.dataset.t=p.t;el.style.gridColumn='span '+z.w;el.style.gridRow='span '+z.h;
  const a=w.asof();el.innerHTML=`<header><b>${esc(w.title.toUpperCase())}</b><span class="dk-ctl"><button type="button" data-a="left" title="Move earlier" aria-label="Move ${esc(w.title)} earlier">◀</button><button type="button" data-a="right" title="Move later" aria-label="Move ${esc(w.title)} later">▶</button><button type="button" data-a="size" title="Panel size: ${p.s==='s'?'small':p.s==='l'?'large':'medium'}" aria-label="Change size of ${esc(w.title)}">${p.s==='s'?'S':p.s==='l'?'L':'M'}</button><button type="button" data-a="big" title="Expand: full size, with every row" aria-label="Expand ${esc(w.title)}">⤢</button><button type="button" data-a="x" title="Remove panel" aria-label="Remove ${esc(w.title)}">✕</button></span></header>
  <div class="dk-body"></div><footer>${esc(w.src())}${a?' · as of '+esc(String(a).replace('T',' ')):''}</footer>`;
  el.querySelectorAll('.dk-ctl button').forEach(b=>b.onclick=()=>{const k=b.dataset.a;
   if(k==='big'){expand(p);return}
   if(k==='x')st.panels.splice(i,1);else if(k==='size')p.s=p.s==='m'?'l':p.s==='l'?'s':'m';
   else{const j=k==='left'?i-1:i+1;if(j>=0&&j<st.panels.length)[st.panels[i],st.panels[j]]=[st.panels[j],st.panels[i]]}save(st);render()});
  grid.appendChild(el);try{w.draw(el.querySelector('.dk-body'),p)}catch(e){el.querySelector('.dk-body').innerHTML='<p class="dk-dim">This panel could not be drawn.</p>'}});
 if(!st.panels.length)grid.innerHTML='<p class="dk-dim" style="grid-column:span 12">No panels. Use ＋ Add panel.</p>';
 tick()}
const css=v=>root?getComputedStyle(root).getPropertyValue(v).trim():'';
/* Expanded panels (16 Nov 2026, the maintainer: "make the windows expandable and with more relevant data if applicable"): ⤢ opens a panel over the deck at full size; lists show every row instead of the first few, and some panels add the source's own longer text. */
const BIG=el=>!!(el&&el.closest&&el.closest('.dk-ov')),N=(el,n)=>BIG(el)?1e9:n;
function canvasIn(el){const c=document.createElement('canvas');el.appendChild(c);const r=el.getBoundingClientRect(),d=devicePixelRatio||1;c.width=Math.max(10,r.width*d);c.height=Math.max(10,r.height*d);c.style.width=r.width+'px';c.style.height=r.height+'px';const g=c.getContext('2d');g.scale(d,d);return{c,g,W:r.width,H:r.height}}
function drawMap(el){const d3=window.d3,O=window.__obs;if(!d3||!O||!O.countries){el.innerHTML='<p class="dk-dim">The map needs the page’s country shapes, which have not loaded.</p>';return}
 const{g,W:w,H:h}=canvasIn(el);const pr=d3.geoEqualEarth().fitExtent([[6,6],[w-6,h-6]],{type:'Sphere'}),path=d3.geoPath(pr,g);
 g.strokeStyle=css('--dk-line');g.lineWidth=1;g.beginPath();path({type:'Sphere'});g.stroke();g.beginPath();path(d3.geoGraticule10());g.globalAlpha=.35;g.stroke();g.globalAlpha=1;
 g.fillStyle=css('--dk-land');g.strokeStyle=css('--dk-coast');g.lineWidth=.5;O.countries.forEach(f=>{g.beginPath();path(f);g.fill();g.stroke()});
 const S=window.SNAP||{};g.fillStyle=css('--dk-fire');cells((S.fires||{}).cells).forEach(([lo,la,n])=>{const p=pr([lo,la]);if(p){const s=Math.min(6,1+Math.log10(n+1)*1.6);g.globalAlpha=.55;g.fillRect(p[0]-s/2,p[1]-s/2,s,s)}});g.globalAlpha=1;
 (S.eonet||[]).forEach(e=>{const p=pr([e[2],e[3]]);if(!p)return;g.strokeStyle=css('--dk-accent');g.beginPath();g.moveTo(p[0]-4,p[1]);g.lineTo(p[0]+4,p[1]);g.moveTo(p[0],p[1]-4);g.lineTo(p[0],p[1]+4);g.stroke()});
 quakes().forEach(q=>{const p=pr([q.lon,q.lat]);if(!p)return;g.fillStyle=css('--dk-quake');g.globalAlpha=Math.max(.25,1-q.hrs/170);g.beginPath();g.arc(p[0],p[1],Math.max(1.2,(q.mag-2)*1.6),0,7);g.fill()});g.globalAlpha=1;
 g.fillStyle=css('--dk-dim');g.font='11px "Owl Plex Mono",monospace';g.fillText('● quakes (fade with age)   ■ fire detections   + natural events',10,h-10)}
function scope(el,p,kind){const pl=PLACES[st.place]||PLACES[0];const max=kind==='q'?2000:kind==='l'?600:3000;if(kind==='l')loadAir();
 el.innerHTML=`<div class="dk-scope-top"><select aria-label="Scope centre">${PLACES.map((x,i)=>`<option value="${i}"${i===st.place?' selected':''}>${esc(x[0])}</option>`).join('')}</select><span>${max.toLocaleString()} km range</span></div><div class="dk-scope-row"><div class="dk-scope"></div><div class="dk-list"></div></div>`;
 // a wide panel puts the list beside the scope, so the scope can use the full height
 if(el.clientWidth>=400)el.querySelector('.dk-scope-row').classList.add('wide');
 el.querySelector('select').onchange=e=>{st.place=+e.target.value;save(st);render()};
 const planes=kind==='l'&&AIR.data&&!AIR.data.failed?AIR.data.planes||[]:[];
 const pts=kind==='l'?planes.map(([la,lo,alt,trk,gs,op,ty])=>({lat:la,lon:lo,alt,trk,gs,op,ty,d:dist(pl[1],pl[2],la,lo)})).filter(q=>q.d<=max):kind==='q'?quakes().map(q=>({...q,d:dist(pl[1],pl[2],q.lat,q.lon)})).filter(q=>q.d<=max):cells(((window.SNAP||{}).air||{}).cells).map(([lo,la,n])=>({lon:lo,lat:la,n,d:dist(pl[1],pl[2],la,lo)})).filter(q=>q.d<=max);
 pts.forEach(q=>q.b=bear(pl[1],pl[2],q.lat,q.lon));
 const list=el.querySelector('.dk-list');
 if(kind==='q'){const near=pts.slice().sort((a,b)=>b.mag-a.mag).slice(0,3);list.innerHTML=near.length?near.map(q=>`<div><span>M${q.mag.toFixed(1)}</span><span>${Math.round(q.d).toLocaleString()} km ${dir(q.b)}</span><span>${ago(q.hrs)}</span></div>`).join(''):'<p class="dk-dim">No M2.5+ quakes within range this week.</p>'}
 else if(kind==='l'){const D=AIR.data,regs=D&&D.regions?D.regions.filter(r=>r.ok).map(r=>r.name):[];
  if(!D)list.innerHTML=`<p class="dk-dim">${AIR.t?'No airliner snapshot: '+esc(AIR.err)+'.':'Loading the airliner snapshot…'}</p>`;
  // the file carries its own reason (held back by quality checks, no recent snapshot, or adsb.lol not answering)
  else if(D.failed)list.innerHTML=`<p class="dk-dim">No airliner snapshot to show (${esc(D.asOf)}): ${esc(D.error||'adsb.lol did not answer')}. Nothing older is shown.</p>`;
  else{const ops={};pts.forEach(q=>ops[q.op]=(ops[q.op]||0)+1);const top=Object.entries(ops).sort((a,b)=>b[1]-a[1]).slice(0,4);
   list.innerHTML=`<div><span>${pts.length.toLocaleString()} airliners</span><span>within ${max} km</span><span>snapshot ${esc(D.asOf)}</span></div>${top.length?`<div class="dk-dim">${top.map(([o,n])=>esc(o)+' '+n).join(' · ')}</div>`:''}<p class="dk-dim">${pts.length?'':'None in range: snapshots are taken near '+esc(regs.join(', '))+' only. '}Airline flights only, one snapshot an hour, shown no sooner than 15 minutes after it was taken, positions rounded to about 10 km; operator code and type, no flight numbers or registrations. Private, business, government and military aircraft are left out. Data: <a href="https://www.adsb.lol/" target="_blank" rel="noopener">adsb.lol</a> volunteers, ODbL 1.0.</p>`}}
 else{const tot=pts.reduce((s,q)=>s+q.n,0);list.innerHTML=`<div><span>${tot.toLocaleString()} aircraft</span><span>in ${pts.length} cells (10°)</span><span>in range</span></div><p class="dk-dim">Counts per 10° cell from OpenSky; no single aircraft is shown or kept.</p>`}
 const box=el.querySelector('.dk-scope'),{c,g,W:w,H:h}=canvasIn(box),cx=w/2,cy=h/2,rad=Math.max(30,Math.min(w/2-14,h/2-14,(w/2-58)/0.7071))/* room for the range labels on the diagonal */;
 const sc=css('--dk-scope'),t0=performance.now();
 // a scope that is no longer on the page (deck closed or panels rebuilt) stops drawing
 function frameDraw(t){if(!root||!c.isConnected)return;g.clearRect(0,0,w,h);g.strokeStyle=sc;g.globalAlpha=.35;g.lineWidth=1;
  for(let k=1;k<=4;k++){g.beginPath();g.arc(cx,cy,rad*k/4,0,7);g.stroke()}g.beginPath();g.moveTo(cx-rad,cy);g.lineTo(cx+rad,cy);g.moveTo(cx,cy-rad);g.lineTo(cx,cy+rad);g.stroke();
  g.globalAlpha=.8;g.fillStyle=sc;g.font='10px "Owl Plex Mono",monospace';g.fillText('N',cx-3,cy-rad-3);[2,4].forEach(k=>{const r=rad*k/4*.7071;g.fillText(Math.round(max*k/4).toLocaleString()+' km',cx+r+3,cy-r-3)});
  const sw=((t-t0)/4000*2*Math.PI)%(2*Math.PI);if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const gr=g.createConicGradient?g.createConicGradient(sw-Math.PI/2-.6,cx,cy):null;if(gr){gr.addColorStop(0,'transparent');gr.addColorStop(.095,sc);gr.addColorStop(.1,'transparent');g.globalAlpha=.18;g.fillStyle=gr;g.beginPath();g.arc(cx,cy,rad,0,7);g.fill()}}
  pts.forEach(q=>{const r=rad*q.d/max,a=(q.b-90)*R,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);g.fillStyle=sc;
   if(kind==='q'){g.globalAlpha=Math.max(.3,1-q.hrs/170);g.beginPath();g.arc(x,y,Math.max(1.5,(q.mag-2)*2),0,7);g.fill()}else if(kind==='l'){g.globalAlpha=.85;const h=((q.trk??0)-90)*R;g.beginPath();g.moveTo(x+5*Math.cos(h),y+5*Math.sin(h));g.lineTo(x+2.5*Math.cos(h+2.4),y+2.5*Math.sin(h+2.4));g.lineTo(x+2.5*Math.cos(h-2.4),y+2.5*Math.sin(h-2.4));g.closePath();g.fill()}else{g.globalAlpha=.25+Math.min(.75,Math.log10(q.n+1)/3);g.fillRect(x-3,y-3,6,6)}});
  g.globalAlpha=1;g.fillStyle=css('--dk-accent');g.beginPath();g.arc(cx,cy,3,0,7);g.fill();g.fillText(pl[0],cx+6,cy+12);c._raf=requestAnimationFrame(frameDraw)}
 c._raf=requestAnimationFrame(frameDraw)}
// Wind forecast (src/wind.js, NOAA GFS via PacIOOS): streaks drift with the model's wind on a flat map; the time slider
// is shared with the globe. The line on top gives the model's wind and temperature at the scope centre city.
function drawWind(el){const OW=window.OwlWind,d3=window.d3,O=window.__obs;
 if(!OW||!d3||!O||!O.countries){el.innerHTML='<p class="dk-dim">The wind panel needs the 3D globe’s forecast data and the page’s country shapes, which have not loaded.</p>';return}
 el.innerHTML='<p class="dk-dim">Loading the forecast…</p>';
 const pl=PLACES[st.place]||PLACES[0];
 // the city line, written before the map is measured: if it wraps to a second line later, the map box would shrink and redraw
 const wpt=f=>{if(!f)return'&nbsp;';const s=f.sample(pl[2],pl[1]),sp=Math.hypot(s[0],s[1]),from=(Math.atan2(-s[0],-s[1])/R+360)%360;
  return isFinite(sp)?`<b>${esc(pl[0])}</b> <span>${Math.round(sp*3.6)} km/h (${Math.round(sp*2.237)} mph) from the ${dir(from)}</span> <span>${isFinite(s[2])?Math.round(s[2])+' °C ('+Math.round(s[2]*9/5+32)+' °F)':''}</span> <span class="dk-dim">model forecast; scope centre city</span>`:'&nbsp;'};
 Promise.all([OW.ready(),OW.field()]).then(([j,f0])=>{if(!el.isConnected)return;
  if(j.failed||!j.frames||!j.frames.length){el.innerHTML=`<p class="dk-dim">The wind forecast could not be collected on the last run (${esc(j.error||'no data')}). Nothing older is shown.</p>`;return}
  el.innerHTML=`<div class="dk-wpt">${wpt(f0)}</div><div class="dk-wmap"></div><label class="fc-step dk-wstep"><span class="fc-time">${esc(OW.label())}</span><input type="range" class="fc-slider" min="0" max="${j.frames.length-1}" step="1" aria-label="Forecast time, 6-hour steps"></label>`;
  const mapEl=el.querySelector('.dk-wmap'),mr=mapEl.getBoundingClientRect(),dp=devicePixelRatio||1;
  // both canvases sit on top of each other, sized once from the map box (so they cannot push the slider down)
  const mk=()=>{const c=document.createElement('canvas');c.width=Math.max(10,mr.width*dp);c.height=Math.max(10,mr.height*dp);c.style.cssText=`position:absolute;left:0;top:0;width:${mr.width}px;height:${mr.height}px`;mapEl.appendChild(c);const g=c.getContext('2d');g.scale(dp,dp);return{c,g,W:mr.width,H:mr.height}};
  const base=mk(),top=mk();
  const w=base.W,h=base.H,pr=d3.geoEqualEarth().fitExtent([[6,6],[w-6,h-6]],{type:'Sphere'}),path=d3.geoPath(pr,base.g),g=base.g;
  g.strokeStyle=css('--dk-line');g.lineWidth=1;g.beginPath();path({type:'Sphere'});g.stroke();g.fillStyle=css('--dk-land');g.strokeStyle=css('--dk-coast');g.lineWidth=.5;O.countries.forEach(f=>{g.beginPath();path(f);g.fill();g.stroke()});
  const pp=pr([pl[2],pl[1]]);if(pp){g.fillStyle=css('--dk-accent');g.beginPath();g.arc(pp[0],pp[1],3,0,7);g.fill()}
  const sc=css('--dk-scope'),t=top.g,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,N=Math.round(Math.min(2500,w*h/120));let F=null,P=[];
  const spawn=q=>{q.lon=Math.random()*360-180;q.lat=Math.asin(2*Math.random()-1)/R;q.age=0;q.life=reduce?12:140+Math.random()*180;return q};
  const sideLine=()=>{el.querySelector('.dk-wpt').innerHTML=wpt(F)};
  const set=()=>OW.field().then(f=>{if(!f||!el.isConnected)return;F=f;P=[];for(let i=0;i<N;i++)P.push(spawn({}));t.clearRect(0,0,w,h);sideLine();
   el.querySelector('.fc-time').textContent=f.label;el.querySelector('.fc-slider').value=f.i;if(reduce)still()});
  const mv=(q,k)=>{const s=F.sample(q.lon,q.lat);if(!isFinite(s[0])){q.age=q.life;return 0}q.lon+=s[0]*k/Math.max(.2,Math.cos(q.lat*R));q.lat+=s[1]*k;if(q.lon>180)q.lon-=360;if(q.lon<-180)q.lon+=360;if(Math.abs(q.lat)>89)q.age=q.life;return Math.hypot(s[0],s[1])};
  function still(){t.clearRect(0,0,w,h);t.strokeStyle=sc;t.lineWidth=1;P.forEach(q=>{let a=pr([q.lon,q.lat]);t.globalAlpha=.6;t.beginPath();for(let i=0;i<10;i++){mv(q,.06);const b=pr([q.lon,q.lat]);if(a&&b&&Math.abs(b[0]-a[0])<20){t.moveTo(a[0],a[1]);t.lineTo(b[0],b[1])}a=b}t.stroke()});t.globalAlpha=1}
  function loop(){if(!top.c.isConnected){off();return}top.c._raf=requestAnimationFrame(loop);if(!F||reduce)return;
   t.globalCompositeOperation='destination-in';t.fillStyle='rgba(0,0,0,.965)';t.fillRect(0,0,w,h);t.globalCompositeOperation='source-over';t.strokeStyle=sc;t.lineWidth=1;
   const B=[new Path2D(),new Path2D(),new Path2D()];
   P.forEach(q=>{if(q.age++>q.life){spawn(q);return}const a=pr([q.lon,q.lat]),sp=mv(q,.005),b=pr([q.lon,q.lat]);if(a&&b&&Math.abs(b[0]-a[0])<20){const k=Math.min(2,Math.floor(sp/6));B[k].moveTo(a[0],a[1]);B[k].lineTo(b[0],b[1])}});
   [.35,.6,.95].forEach((al,i)=>{t.globalAlpha=al;t.stroke(B[i])});t.globalAlpha=1}
  const off=OW.onChange(()=>{if(el.isConnected)set();else off()});set();loop();
  // the panel can still change size after fonts load or the deck settles: redraw at the new size
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{const r=mapEl.getBoundingClientRect();if(!el.isConnected){ro.disconnect();return}
   if((Math.abs(r.height-mr.height)>2||Math.abs(r.width-mr.width)>2)&&(el._wr=(el._wr||0)+1)<=2){ro.disconnect();off();cancelAnimationFrame(top.c._raf);drawWind(el)}});ro.observe(mapEl)}})}
function drawQuakes(el){const mm=BIG(el)?2.5:4.5,q=quakes().filter(x=>x.mag>=mm).sort((a,b)=>a.hrs-b.hrs);el.innerHTML=q.length?`<div class="dk-tab">${q.slice(0,N(el,60)).map(x=>`<div><span class="dk-k">M${x.mag.toFixed(1)}</span><span>${esc(x.place||(x.lat.toFixed(1)+', '+x.lon.toFixed(1)))}</span><span class="dk-dim">${x.dep} km deep · ${ago(x.hrs)}</span></div>`).join('')}</div><p class="dk-dim">${q.length} quakes of M4.5 or more; places are USGS’s own words (named for M5+).</p>`:'<p class="dk-dim">No data from USGS yet.</p>'}
function drawGdacs(el){const a=(window.SIT||{}).gdacs||[];el.innerHTML=a.length?`<div class="dk-tab">${a.map(x=>`<div><span class="dk-k lv-${esc(String(x[2]).toLowerCase())}">${esc(x[2])}</span><span>${x[7]?`<a href="${esc(x[7])}" target="_blank" rel="noopener">${esc(x[1])}</a>`:esc(x[1])}</span><span class="dk-dim">${esc(x[6]||'')} · ${esc(x[3])} to ${esc(x[4])}${BIG(el)&&x[5]?'<br>'+esc(x[5]):''}</span></div>`).join('')}</div>`:'<p class="dk-dim">No GDACS alerts loaded.</p>'}
function drawSpace(el){const S=window.SNAP||{},kp=S.kp||[],sc=S.scales||{};const{g,W:w,H:h}=(()=>{el.innerHTML='<div class="dk-row"></div><div class="dk-spark"></div>';el.querySelector('.dk-row').innerHTML=['R','S','G'].map(k=>`<span><b>${k}${sc[k]??'–'}</b> ${({R:'radio blackouts',S:'solar radiation storms',G:'geomagnetic storms'})[k]}</span>`).join('');return canvasIn(el.querySelector('.dk-spark'))})();
 if(!kp.length)return;const bw=w/kp.length;kp.forEach((v,i)=>{g.fillStyle=v>=5?css('--dk-quake'):css('--dk-scope');g.globalAlpha=.8;const bh=(h-14)*v/9;g.fillRect(i*bw+.5,h-bh,Math.max(1,bw-1),bh)});g.globalAlpha=1;g.fillStyle=css('--dk-dim');g.font='10px "Owl Plex Mono",monospace';g.fillText('Planetary K-index, every 3 h, past 7 days (0–9; 5+ is a storm)',2,10)}
function drawSignals(el){const G=window.SIG||{},co2=G.co2||{},t=G.temp||{},si=(G.seaice||{}).north||{};
 el.innerHTML=`<div class="dk-tab">${co2.ppm?`<div><span class="dk-k">${co2.ppm} ppm</span><span>CO₂ at Mauna Loa, ${esc(co2.date)}</span><span class="dk-dim">a year earlier ${co2.ppmYearAgo} ppm</span></div>`:''}${t.latest?`<div><span class="dk-k">+${t.latest[1]} °C</span><span>${esc(t.title)}</span><span class="dk-dim">vs ${esc(t.base)} average</span></div>`:''}${si.extent?`<div><span class="dk-k">${si.extent} M km²</span><span>Arctic sea ice extent, ${esc(si.date)}</span><span class="dk-dim">NSIDC</span></div>`:''}</div>`}
function drawLaunches(el){const a=(window.SIG||{}).launches||[];el.innerHTML=a.length?`<div class="dk-tab">${a.slice(0,N(el,12)).map(x=>`<div><span class="dk-k">${esc(String(x[1]).slice(0,16).replace('T',' '))}</span><span>${x[6]?`<a href="${esc(x[6])}" target="_blank" rel="noopener">${esc(x[0])}</a>`:esc(x[0])}</span><span class="dk-dim">${esc(x[2])} · ${esc(x[4]||'')}</span></div>`).join('')}</div>`:'<p class="dk-dim">No launches loaded.</p>'}
const ll=(la,lo)=>`${Math.abs(la).toFixed(1)}°${la<0?'S':'N'} ${Math.abs(lo).toFixed(1)}°${lo<0?'W':'E'}`,fmt=n=>Number(n).toLocaleString('en-US');
const row=(k,t,d,u)=>`<div><span class="dk-k">${esc(k)}</span><span>${u?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`:esc(t)}</span><span class="dk-dim">${esc(d||'')}</span></div>`;
const none=t=>`<p class="dk-dim">${esc(t)}</p>`;
function drawFires(el){const F=(window.SNAP||{}).fires;if(!F||!F.cells){el.innerHTML=none('No fire detections loaded.');return}const c=cells(F.cells).sort((a,b)=>b[2]-a[2]);
 el.innerHTML=`<div class="dk-row"><span><b>${fmt(F.total)}</b> detections, past 24 h</span></div><div class="dk-tab">${c.slice(0,N(el,12)).map(x=>row(fmt(x[2]),ll(x[1],x[0]),`${F.cell}° area`)).join('')}</div><p class="dk-dim">Busiest ${F.cell}° areas. A detection is a hot spot seen from orbit, not a separate fire; farm burning and gas flares count too.</p>`}
function drawEvents(el){const S=window.SNAP||{},E=S.eonet||[];el.innerHTML=E.length?`<div class="dk-tab">${E.slice(0,N(el,40)).map(x=>row(x[0],x[1],ll(x[3],x[2]))).join('')}</div><p class="dk-dim">${E.length} open events${S.eonetPrescribed?`, plus ${S.eonetPrescribed} prescribed burns not listed`:''}.</p>`:none('No EONET events loaded.')}
function drawStorms(el){const I=(((window.SNAP||{}).storms)||{}).items||[];el.innerHTML=I.length?`<div class="dk-tab">${I.map(x=>{const p=x.pts[x.pts.length-1];return`<div><span class="dk-k lv-${esc(String(x.alert).toLowerCase())}">${esc(x.alert)}</span><span><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a></span><span class="dk-dim">${esc(x.sev||'')}${p?' · '+ll(p[1],p[0]):''} · update ${esc(String(x.adv||'').slice(0,16).replace('T',' '))} UTC</span></div>`}).join('')}</div>`:none('No tropical storms active, or the storm list did not load.')}
function drawWarnings(el){const w=(window.DIS||{}).weather;if(!w||!w.byEvent){el.innerHTML=none('No National Weather Service alerts loaded.');return}
 el.innerHTML=`<div class="dk-row"><span><b>${fmt(w.total)}</b> active alerts</span><span><b>${w.severe}</b> severe</span><span><b>${w.extreme}</b> extreme</span></div><div class="dk-tab">${w.byEvent.slice(0,N(el,12)).map(x=>row(fmt(x[1]),x[0],'')).join('')}</div><p class="dk-dim">United States only; event names as the NWS issues them.</p>`}
function drawWho(el){const a=(window.SIT||{}).who||[];el.innerHTML=a.length?`<div class="dk-tab">${a.slice(0,N(el,12)).map(x=>row(String(x[1]).slice(5),x[0],BIG(el)&&x[2]?String(x[2]):'',x[3]&&/^https?:/.test(x[3])?x[3]:'https://www.who.int/emergencies/disease-outbreak-news')).join('')}</div>`:none('No WHO outbreak news loaded.')}
function drawRelief(el){const R=((window.SNAP||{}).relief)||{},A=(R.appeals||[]).slice().sort((a,b)=>String(b[9]).localeCompare(String(a[9])));
 el.innerHTML=A.length?`<div class="dk-row"><span><b>${A.length}</b> active appeals and DREF operations</span></div><div class="dk-tab">${A.slice(0,N(el,25)).map(x=>row(x[1]||'',x[0],`${x[3]||''}${x[7]?` · requested ${fmt(x[7])} ${R.currency||'CHF'}`:''}${BIG(el)&&x[7]?` · funded ${fmt(x[8]||0)} (${Math.round(100*(x[8]||0)/x[7])}%)`:''} · from ${x[9]}${BIG(el)&&x[10]?' to '+x[10]:''}${BIG(el)&&x[12]?' · '+x[12]:''}`,x[11])).join('')}</div>`:none('No IFRC appeals loaded.')}
function drawStatus(el){const D=window.DIS||{},S=D.services||[],bad=S.filter(x=>(x[1]&&x[1]!=='none')||(x[3]&&x[3].length)||(x[4]&&x[4].length)),err=(D.errors||[]).filter(e=>!/^(NVD|NWS|MBTA|MTA|BART|WMATA|CTA|Transit|FAA|GDELT)\b/.test(String(e)));
 el.innerHTML=S.length?`<div class="dk-row"><span><b>${bad.length}</b> reporting a problem</span><span><b>${S.length-bad.length}</b> all clear</span>${err.length?`<span><b>${err.length}</b> not read</span>`:''}</div><div class="dk-tab">${(BIG(el)?S:bad).map(x=>row(x[1]==='none'&&!(x[3]&&x[3].length)?'ok':x[1]==='none'?'issue':x[1],x[0],(x[3]&&x[3][0]&&x[3][0][0])||x[2],x[5])).join('')||'<p class="dk-dim">Every status page read says all systems are working.</p>'}</div>${err.length?`<p class="dk-dim">Not read this time: ${esc(err.map(e=>String(e).replace(/ Failed to fetch$/,'')).join(', '))}.</p>`:''}`:none('No status pages loaded.')}
function drawStations(el){const T=(window.SNAP||{}).tle||[];if(!T.length||!window.satellite){el.innerHTML=none('Orbital elements not loaded.');return}el.innerHTML='<div class="dk-tab dk-st"></div><p class="dk-dim">The point on the ground under each station, worked out from its orbit; updates every second.</p>';el._st=T.filter(x=>/ISS|Tiangong/i.test(x[0]));stationsTick(el)}
function stationsTick(el){const S=window.satellite,box=el.querySelector('.dk-st');if(!box||!S||!el._st)return;const now=new Date(),g=S.gstime(now);
 box.innerHTML=el._st.map(([n,a,b])=>{try{const r=S.twoline2satrec(a,b),pv=S.propagate(r,now),d=S.eciToGeodetic(pv.position,g),la=S.degreesLat(d.latitude),lo=S.degreesLong(d.longitude),v=pv.velocity,sp=Math.hypot(v.x,v.y,v.z)*3600;
  return row(n,ll(la,lo),`${Math.round(d.height)} km up · ${fmt(Math.round(sp))} km/h`)}catch(e){return row(n,'position unavailable','')}}).join('')}
function drawSkyNow(el){if(!window.Astronomy){el.innerHTML=none('Astronomy Engine not loaded.');return}el.innerHTML='<div class="dk-tab dk-sky"></div><p class="dk-dim">Where the Sun and Moon are straight overhead right now, and the Moon’s phase.</p>';skyTick(el)}
function skyTick(el){const A=window.Astronomy,box=el.querySelector('.dk-sky');if(!box||!A)return;const d=new Date();
 const sub=b=>{const eq=A.Equator(b,d,new A.Observer(0,0,0),true,true),gst=A.SiderealTime(d);const lo=((eq.ra-gst)*15+540)%360-180;return[eq.dec,lo]};
 const s=sub('Sun'),m=sub('Moon'),ill=A.Illumination('Moon',d),ph=A.MoonPhase(d);
 box.innerHTML=row('Sun',ll(s[0],s[1]),'overhead now')+row('Moon',ll(m[0],m[1]),`${Math.round(ill.phase_fraction*100)}% lit, ${ph<180?'waxing':'waning'}`)}
function drawVoyager(el){const v=window.VOYAGER_TICK;el.innerHTML=v?`<div class="dk-big">${esc(v[1])}</div><p class="dk-dim">${esc(v[0])}, counted from its distance as NASA JPL Horizons gives it. <a href="${esc(v[2])}" target="_blank" rel="noopener">Mission page</a></p>`:none('Voyager distance not loaded.')}
function drawNhc(el){const N=(window.SNAP||{}).nhc;if(!N){el.innerHTML=none('Hurricane Center data not collected yet.');return}const I=N.items||[];
 el.innerHTML=I.length?`<div class="dk-tab">${I.map(x=>row(x.cls,x.name,`${x.kt!=null?x.kt+' kt':''}${x.mb?' · '+x.mb+' mb':''}${x.lat!=null?' · '+ll(x.lat,x.lon):''}${x.move?' · moving '+x.move:''}`,x.url)).join('')}</div>`:none('No active storms in the Atlantic, East or Central Pacific, as the National Hurricane Center reports it.')}
function drawTsunami(el){const T=(window.SNAP||{}).tsunami;if(!T){el.innerHTML=none('Tsunami bulletins not collected yet.');return}
 el.innerHTML=`<div class="dk-tab">${(T.items||[]).map(x=>`<div><span class="dk-k">${esc(x.cat||'')}</span><span><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a></span><span class="dk-dim">${esc(x.center)} · ${esc(x.place)}${x.mag?' · '+esc(x.mag):''} · ${esc(String(x.updated).slice(0,16).replace('T',' '))} UTC${x.note?'<br>'+esc(x.note):''}</span></div>`).join('')}</div><p class="dk-dim">The latest message from each center, which may be days old. In an emergency, follow local officials.</p>`}
function drawAurora(el){const A=(window.SNAP||{}).aurora;if(!A||!(A.last||[]).length){el.innerHTML=none('Aurora forecast not collected yet.');return}const L=A.last,n=L[L.length-1];
 el.innerHTML=`<div class="dk-row"><span><b>${n[2]} GW</b> north</span><span><b>${n[3]} GW</b> south</span>${A.lowN10!=null?`<span>10%+ chance overhead as far south as <b>${A.lowN10}°N</b></span>`:''}</div><div class="dk-spark"></div><p class="dk-dim">Hemispheric power from NOAA's OVATION model, past 2 hours; forecast for ${esc(String(A.fc).slice(11,16))} UTC.</p>`;
 const {g,W:w,H:h}=canvasIn(el.querySelector('.dk-spark')),mx=Math.max(20,...L.map(r=>Math.max(r[2],r[3])));
 [[2,css('--dk-scope')],[3,css('--dk-dim')]].forEach(([k,c])=>{g.strokeStyle=c;g.lineWidth=1.5;g.beginPath();L.forEach((r,i)=>{const x=i*(w-4)/Math.max(1,L.length-1)+2,y=h-4-(h-14)*r[k]/mx;i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()})}
function drawVolcanoes(el){const V=(window.SNAP||{}).volcanoes;if(!V){el.innerHTML=none('Volcano alerts not collected yet.');return}const I=V.items||[];
 el.innerHTML=I.length?`<div class="dk-tab">${I.map(x=>`<div><span class="dk-k vc-${esc(String(x.color).toLowerCase())}">${esc(x.color)}</span><span><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a> <span class="dk-dim">${esc(x.level)}${x.prevLevel&&x.prevLevel!==x.level?' (was '+esc(x.prevLevel)+')':''}</span></span><span class="dk-dim">${esc(x.syn)}</span></div>`).join('')}</div><p class="dk-dim">U.S. volcanoes only; the rest are normal (green).</p>`:none('No U.S. volcano is at an elevated alert level, as USGS reports it.')}
function drawClocks(el){el.innerHTML='<div class="dk-clocks"></div>';el._clock=true}
function tick(){if(root){root.querySelectorAll('.dk-p[data-t="stations"] .dk-body').forEach(stationsTick);root.querySelectorAll('.dk-p[data-t="skynow"] .dk-body').forEach(skyTick);root.querySelectorAll('.dk-p[data-t="voyager"] .dk-body').forEach(drawVoyager)}const now=new Date(),u=root&&root.querySelector('#dkUtc');if(u)u.textContent=now.toISOString().slice(0,19).replace('T',' ')+' UTC';
 root&&root.querySelectorAll('.dk-clocks').forEach(c=>{c.innerHTML=[['UTC','UTC'],['Your time',undefined],['Tokyo','Asia/Tokyo'],['London','Europe/London'],['New York','America/New_York'],['Los Angeles','America/Los_Angeles']].map(([n,z])=>{let s='';try{s=now.toLocaleTimeString('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch(e){}return`<div><span class="dk-dim">${n}</span><b>${s}</b></div>`}).join('')})}
function topPx(){const t=document.getElementById('ops-top');const r=t&&t.getBoundingClientRect();return r&&r.height?Math.round(r.bottom+6):0}
function open(){if(opened)return;opened=true;const O=window.__obs;try{if(O&&O.setSlim)O.setSlim(true)}catch(e){}
 root=document.createElement('div');root.id='owlDeck';root.dataset.look=st.look;root.setAttribute('role','region');root.setAttribute('aria-label','Observation Deck');document.body.appendChild(root);
 document.documentElement.classList.add('deck-on');frame();try{if(window.OwlMusic&&window.OwlMusic.setMode)window.OwlMusic.setMode('deck')}catch(e){}
 const place=()=>{root.style.top=topPx()+'px'};place();setTimeout(()=>{place();render()},350);root._place=place;addEventListener('resize',place);
 const g=window.__obs3d;if(g&&g.viewer){prevLoop=g.viewer.useDefaultRenderLoop;g.viewer.useDefaultRenderLoop=false}
 timer=setInterval(()=>{tick()},1000);root._data=setInterval(render,60000);const b=document.getElementById('gnDeck');if(b)b.setAttribute('aria-pressed','true')}
function close(){if(!opened)return;opened=false;clearInterval(timer);if(root){clearInterval(root._data);removeEventListener('resize',root._place);root.querySelectorAll('canvas').forEach(c=>cancelAnimationFrame(c._raf));root.remove()}root=grid=null;
 document.documentElement.classList.remove('deck-on');try{if(window.OwlMusic&&window.OwlMusic.setMode)window.OwlMusic.setMode('')}catch(e){}const g=window.__obs3d;if(g&&g.viewer&&prevLoop!==null){g.viewer.useDefaultRenderLoop=prevLoop;prevLoop=null}
 const b=document.getElementById('gnDeck');if(b)b.setAttribute('aria-pressed','false')}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){const m=root.querySelector('#dkMenu');if(m&&!m.hidden){m.hidden=true;return}close()}});
let resizeT;addEventListener('resize',()=>{if(!opened)return;clearTimeout(resizeT);resizeT=setTimeout(render,250)});
// Header button, beside the site tour.
addEventListener('obs:deck',()=>open()); /* What's new "Try it" */
addEventListener('obs:home',()=>close());
/* Picking anything in a header menu, or a header button that opens something else, closes the deck first: the page it opens used to load behind the deck (the maintainer, 18 Nov 2026). The menus themselves drop down in front of the deck (CSS below). */
document.addEventListener('click',e=>{if(!opened||!e.target.closest)return;if(e.target.closest('.gn-m button,.gn-m a,#gnPlay,#gnSiteTour,#gnTour,#gnVoyager,#gnSearch,#featRow button,#featRow a'))close()},true);
let tries=0;const wait=setInterval(()=>{const t=document.getElementById('gnSiteTour');if(t){clearInterval(wait);const b=document.createElement('button');b.type='button';b.id='gnDeck';b.className=t.className;b.setAttribute('aria-pressed','false');
 b.title='Observation Deck: a full-screen board of live panels you can arrange (work in progress)';b.innerHTML='▦<span class="gn-tw"> Observation Deck</span>';b.setAttribute('aria-label','Observation Deck');b.onclick=()=>opened?close():open();t.before(b)}else if(++tries>120)clearInterval(wait)},500);
if(/[?&]deck=open\b/.test(location.search)||/#deck$/.test(location.hash))setTimeout(open,1500);
window.__owlDeck={open,close,state:()=>JSON.parse(JSON.stringify(st)),opened:()=>opened};
const s=document.createElement('style');s.textContent=`
@font-face{font-family:"Owl Plex Mono";font-weight:300;font-display:swap;src:url(assets/fonts/ibm-plex-mono-latin-300-normal.woff2) format("woff2")}
@font-face{font-family:"Owl Plex Mono";font-weight:400;font-display:swap;src:url(assets/fonts/ibm-plex-mono-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Owl Plex Mono";font-weight:600;font-display:swap;src:url(assets/fonts/ibm-plex-mono-latin-600-normal.woff2) format("woff2")}
#owlDeck{--dk-bg:#0b0906;--dk-panel:#14100b;--dk-line:rgb(239 228 204 / .14);--dk-ink:#EFE4CC;--dk-dim:#a99d82;--dk-accent:#D9A441;--dk-scope:#D9A441;--dk-land:#1d1710;--dk-coast:rgb(239 228 204 / .22);--dk-quake:#e5604d;--dk-fire:#f08a3c;
 position:fixed;left:0;right:0;bottom:0;z-index:2500;overflow:auto;padding:8px 10px 12px;background:var(--dk-bg);color:var(--dk-ink);font:300 12px/1.45 "Owl Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
#owlDeck[data-look=phosphor]{--dk-bg:#030703;--dk-panel:#07100a;--dk-line:rgb(70 255 120 / .18);--dk-ink:#b9f7c6;--dk-dim:#6aa978;--dk-accent:#3dff72;--dk-scope:#3dff72;--dk-land:#0a1a0f;--dk-coast:rgb(61 255 114 / .28);--dk-quake:#ff5d4f;--dk-fire:#ffb340}
#owlDeck[data-look=mix]{--dk-scope:#3dff72;--dk-coast:rgb(61 255 114 / .25)}
html.deck-on #ops-map,html.deck-on #ops-bottom{visibility:hidden}
html.deck-on .gn-m{z-index:2600}
#owlDeck button,#owlDeck select{font:inherit;color:inherit;background:transparent;border:1px solid var(--dk-line);border-radius:4px;padding:3px 8px;cursor:pointer}
#owlDeck a{color:inherit;text-decoration:underline;text-decoration-color:var(--dk-line)}
#owlDeck .dk-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:4px 2px 8px;border-bottom:1px solid var(--dk-line);margin-bottom:8px}
#owlDeck .dk-title{font-weight:600;letter-spacing:.14em;color:var(--dk-accent)}#owlDeck .dk-wip{color:var(--dk-dim);font-size:11px}#owlDeck .dk-utc{margin-left:auto;color:var(--dk-dim)}
#owlDeck .dk-add{position:relative}#owlDeck .dk-menu{position:absolute;top:100%;right:0;z-index:5;margin-top:4px;min-width:220px;display:flex;flex-direction:column;gap:2px;padding:6px;background:var(--dk-panel);border:1px solid var(--dk-line);border-radius:6px}
#owlDeck .dk-menu button{text-align:left;border:0}
#owlDeck .dk-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-rows:44px;gap:8px;grid-auto-flow:dense}
#owlDeck .dk-p{display:flex;flex-direction:column;min-height:0;background:var(--dk-panel);border:1px solid var(--dk-line);border-radius:6px;overflow:hidden}
#owlDeck .dk-p>header{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 8px;border-bottom:1px solid var(--dk-line);letter-spacing:.1em;font-size:11px}
#owlDeck .dk-ctl{display:flex;gap:3px}#owlDeck .dk-ctl button{padding:0 5px;font-size:10px;line-height:18px;opacity:.7}#owlDeck .dk-ctl button:hover{opacity:1}
#owlDeck .dk-body{flex:1;min-height:0;position:relative;overflow:auto;padding:6px 8px;display:flex;flex-direction:column}
#owlDeck .dk-p>footer{padding:4px 8px;border-top:1px solid var(--dk-line);font-size:10px;color:var(--dk-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#owlDeck .dk-p[data-t=map] .dk-body{padding:0}#owlDeck .dk-dim{color:var(--dk-dim)}
#owlDeck .dk-tab>div{display:grid;grid-template-columns:auto 1fr;column-gap:10px;padding:3px 0;border-bottom:1px dotted var(--dk-line)}#owlDeck .dk-tab>div>span:nth-child(3){grid-column:2;font-size:10.5px}
#owlDeck .dk-k{color:var(--dk-accent);font-weight:400;white-space:nowrap}#owlDeck .dk-k.lv-red{color:#ff6b5b}#owlDeck .dk-k.lv-orange{color:#ffa23a}#owlDeck .dk-k.lv-green{color:#5fd38a}
#owlDeck .dk-scope-top{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;color:var(--dk-dim)}
#owlDeck .dk-scope{flex:1;min-height:160px;position:relative}.dk-scope-row{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px}.dk-scope-row.wide{flex-direction:row;align-items:stretch}
#owlDeck .dk-wmap{flex:1;min-height:140px;position:relative;overflow:hidden}#owlDeck .dk-wpt{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:.78rem;margin-bottom:4px}#owlDeck .dk-wstep{margin-top:6px;font-size:.72rem}#owlDeck .dk-wstep input{accent-color:var(--dk-accent)}.dk-scope-row.wide .dk-scope{min-width:0}.dk-scope-row.wide .dk-list{width:42%;flex:none;overflow:auto;align-self:center;max-height:100%}#owlDeck [hidden]{display:none!important}#owlDeck .dk-scope canvas,#owlDeck .dk-spark canvas,#owlDeck .dk-p[data-t=map] canvas{position:absolute;inset:0}
#owlDeck .dk-p[data-t=map] .dk-body{position:relative}
#owlDeck .dk-list>div{display:flex;justify-content:space-between;gap:8px;padding:2px 0;border-top:1px dotted var(--dk-line)}
#owlDeck .vc-red{color:#e5534b}#owlDeck .vc-orange{color:#e8913a}#owlDeck .vc-yellow{color:#d9c441}#owlDeck .dk-ov{position:absolute;inset:44px 12px 12px;z-index:5;display:flex;flex-direction:column;box-shadow:0 10px 50px rgb(0 0 0 / .6)}#owlDeck .dk-ov .dk-body{flex:1;overflow:auto;min-height:0}#owlDeck .dk-ov .dk-ovx{font-size:11px;opacity:1}#owlDeck .dk-big{font-size:1.15rem;color:var(--dk-accent);margin:6px 0 8px;line-height:1.35}#owlDeck .dk-row{display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:4px}#owlDeck .dk-row b{color:var(--dk-accent)}#owlDeck .dk-spark{flex:1;position:relative;min-height:50px}
#owlDeck .dk-clocks{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}#owlDeck .dk-clocks div{display:flex;flex-direction:column}#owlDeck .dk-clocks b{font-weight:400;font-size:15px;color:var(--dk-accent)}
#owlDeck .dk-foot{margin:10px 2px 0;color:var(--dk-dim);font-size:10.5px}
@media (max-width:900px){#owlDeck .dk-grid{grid-template-columns:repeat(4,minmax(0,1fr))}#owlDeck .dk-p{grid-column:span 4!important}}`;
document.head.appendChild(s);
})();
