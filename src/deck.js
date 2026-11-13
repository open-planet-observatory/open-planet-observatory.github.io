// ---------- Observation Deck: a full-screen, rearrangeable board of panels over the site's live data (work in progress) ----------
// Reads only what the page already has (window.SNAP, SIT, SIG and the country shapes): nothing new is collected.
// Every headline and description is the source's own text; numbers are shown as the source gives them.
// Three looks to choose from while it is a mock-up: Control (the site's colours), Phosphor (green on black) and Mix.
// The layout, look and scope centre are kept in this browser only (localStorage), never sent anywhere.
// SWITCH: while LIVE is false the "Observation Deck" button appears only when the address carries ?deck=1, so merging this
// file changes nothing a visitor sees. Set LIVE to true to show it to everyone. Undo: remove this file from build/build.mjs.
(function(){
if(!window.OBS_HOSTED)return;
const LIVE=false;
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
 opensky:'The OpenSky Network · 10° cells, no single aircraft',noaa:'NOAA GML, NOAA NCEI, NSIDC',ll:'Launch Library 2 (The Space Devs)'};
// ---------- the panels (widgets) ----------
const W={
 map:{title:'World map',w:8,h:8,src:()=>SRC.usgs+' · '+SRC.firms+' · '+SRC.eonet,asof:()=>(window.SNAP||{}).asOf,draw:drawMap},
 qscope:{title:'Quake scope',w:4,h:8,src:()=>SRC.usgs,asof:()=>(window.SNAP||{}).asOf,draw:(el,st)=>scope(el,st,'q')},
 ascope:{title:'Air traffic scope',w:4,h:8,src:()=>SRC.opensky,asof:()=>{const t=((window.SNAP||{}).air||{}).time;return t?new Date(t*1e3).toISOString().slice(0,16)+'Z':''},draw:(el,st)=>scope(el,st,'a')},
 quakes:{title:'Earthquakes, past 7 days',w:4,h:6,src:()=>SRC.usgs,asof:()=>(window.SNAP||{}).asOf,draw:drawQuakes},
 disasters:{title:'Disaster alerts',w:4,h:6,src:()=>SRC.gdacs,asof:()=>(window.SIT||{}).asOf,draw:drawGdacs},
 space:{title:'Space weather',w:4,h:4,src:()=>SRC.swpc,asof:()=>(window.SNAP||{}).asOf,draw:drawSpace},
 planet:{title:'Planet signals',w:4,h:4,src:()=>SRC.noaa,asof:()=>(window.SIG||{}).asOf,draw:drawSignals},
 launches:{title:'Launches',w:4,h:5,src:()=>SRC.ll,asof:()=>(window.SIG||{}).asOf,draw:drawLaunches},
 clocks:{title:'Clocks',w:4,h:3,src:()=>'Your device clock',asof:()=>'',draw:drawClocks}};
const DEFAULT={look:'control',place:0,panels:['map','qscope','quakes','disasters','space','ascope','planet','launches','clocks'].map(t=>({t,s:'m'}))};
let st=Object.assign({},DEFAULT,load()||{}),root,grid,timer,anim,prevLoop=null,opened=false;
if(!Array.isArray(st.panels))st.panels=DEFAULT.panels.slice();st.panels=st.panels.filter(p=>W[p.t]);
const size=p=>{const w=W[p.t];const k=p.s==='s'?.75:p.s==='l'?1.5:1;return{w:Math.min(12,Math.max(3,Math.round(w.w*k))),h:Math.max(3,Math.round(w.h*k))}};
function frame(){root.innerHTML=`<div class="dk-bar"><b class="dk-title">OBSERVATION DECK</b><span class="dk-wip">work in progress</span><span class="dk-utc" id="dkUtc"></span>
 <label>Look <select id="dkLook"><option value="control">Control</option><option value="phosphor">Phosphor</option><option value="mix">Mix</option></select></label>
 <div class="dk-add"><button type="button" id="dkAddBtn" aria-haspopup="true" aria-expanded="false">＋ Add panel</button><div class="dk-menu" id="dkMenu" hidden></div></div>
 <button type="button" id="dkReset">Reset layout</button><button type="button" id="dkClose" aria-label="Close the Observation Deck">✕</button></div><div class="dk-grid" id="dkGrid"></div>
 <p class="dk-foot">Panels show the site’s own data, as each source publishes it. Every scope centre is a city, never your own location. Your layout stays in this browser.</p>`;
 grid=root.querySelector('#dkGrid');const look=root.querySelector('#dkLook');look.value=st.look;look.onchange=()=>{st.look=look.value;root.dataset.look=st.look;save(st);render()};
 const ab=root.querySelector('#dkAddBtn'),menu=root.querySelector('#dkMenu');
 ab.onclick=()=>{const avail=Object.keys(W).filter(t=>!st.panels.some(p=>p.t===t));menu.innerHTML=avail.length?avail.map(t=>`<button type="button" data-t="${t}">${esc(W[t].title)}</button>`).join(''):'<p>Every panel is on the deck.</p>';
  menu.hidden=!menu.hidden;ab.setAttribute('aria-expanded',String(!menu.hidden));menu.querySelectorAll('button').forEach(b=>b.onclick=()=>{st.panels.push({t:b.dataset.t,s:'m'});save(st);menu.hidden=true;render()})};
 root.querySelector('#dkReset').onclick=()=>{st=JSON.parse(JSON.stringify(DEFAULT));save(st);look.value=st.look;root.dataset.look=st.look;render()};
 root.querySelector('#dkClose').onclick=close}
function render(){if(!grid)return;cancelAnimationFrame(anim);grid.innerHTML='';
 st.panels.forEach((p,i)=>{const w=W[p.t],z=size(p);const el=document.createElement('section');el.className='dk-p';el.dataset.t=p.t;el.style.gridColumn='span '+z.w;el.style.gridRow='span '+z.h;
  const a=w.asof();el.innerHTML=`<header><b>${esc(w.title.toUpperCase())}</b><span class="dk-ctl"><button type="button" data-a="left" title="Move earlier" aria-label="Move ${esc(w.title)} earlier">◀</button><button type="button" data-a="right" title="Move later" aria-label="Move ${esc(w.title)} later">▶</button><button type="button" data-a="size" title="Panel size: ${p.s==='s'?'small':p.s==='l'?'large':'medium'}" aria-label="Change size of ${esc(w.title)}">${p.s==='s'?'S':p.s==='l'?'L':'M'}</button><button type="button" data-a="x" title="Remove panel" aria-label="Remove ${esc(w.title)}">✕</button></span></header>
  <div class="dk-body"></div><footer>${esc(w.src())}${a?' · as of '+esc(String(a).replace('T',' ')):''}</footer>`;
  el.querySelectorAll('.dk-ctl button').forEach(b=>b.onclick=()=>{const k=b.dataset.a;
   if(k==='x')st.panels.splice(i,1);else if(k==='size')p.s=p.s==='m'?'l':p.s==='l'?'s':'m';
   else{const j=k==='left'?i-1:i+1;if(j>=0&&j<st.panels.length)[st.panels[i],st.panels[j]]=[st.panels[j],st.panels[i]]}save(st);render()});
  grid.appendChild(el);try{w.draw(el.querySelector('.dk-body'),p)}catch(e){el.querySelector('.dk-body').innerHTML='<p class="dk-dim">This panel could not be drawn.</p>'}});
 if(!st.panels.length)grid.innerHTML='<p class="dk-dim" style="grid-column:span 12">No panels. Use ＋ Add panel.</p>';
 tick()}
const css=v=>getComputedStyle(root).getPropertyValue(v).trim();
function canvasIn(el){const c=document.createElement('canvas');el.appendChild(c);const r=el.getBoundingClientRect(),d=devicePixelRatio||1;c.width=Math.max(10,r.width*d);c.height=Math.max(10,r.height*d);c.style.width=r.width+'px';c.style.height=r.height+'px';const g=c.getContext('2d');g.scale(d,d);return{c,g,W:r.width,H:r.height}}
function drawMap(el){const d3=window.d3,O=window.__obs;if(!d3||!O||!O.countries){el.innerHTML='<p class="dk-dim">The map needs the page’s country shapes, which have not loaded.</p>';return}
 const{g,W:w,H:h}=canvasIn(el);const pr=d3.geoEqualEarth().fitExtent([[6,6],[w-6,h-6]],{type:'Sphere'}),path=d3.geoPath(pr,g);
 g.strokeStyle=css('--dk-line');g.lineWidth=1;g.beginPath();path({type:'Sphere'});g.stroke();g.beginPath();path(d3.geoGraticule10());g.globalAlpha=.35;g.stroke();g.globalAlpha=1;
 g.fillStyle=css('--dk-land');g.strokeStyle=css('--dk-coast');g.lineWidth=.5;O.countries.forEach(f=>{g.beginPath();path(f);g.fill();g.stroke()});
 const S=window.SNAP||{};g.fillStyle=css('--dk-fire');cells((S.fires||{}).cells).forEach(([lo,la,n])=>{const p=pr([lo,la]);if(p){const s=Math.min(6,1+Math.log10(n+1)*1.6);g.globalAlpha=.55;g.fillRect(p[0]-s/2,p[1]-s/2,s,s)}});g.globalAlpha=1;
 (S.eonet||[]).forEach(e=>{const p=pr([e[2],e[3]]);if(!p)return;g.strokeStyle=css('--dk-accent');g.beginPath();g.moveTo(p[0]-4,p[1]);g.lineTo(p[0]+4,p[1]);g.moveTo(p[0],p[1]-4);g.lineTo(p[0],p[1]+4);g.stroke()});
 quakes().forEach(q=>{const p=pr([q.lon,q.lat]);if(!p)return;g.fillStyle=css('--dk-quake');g.globalAlpha=Math.max(.25,1-q.hrs/170);g.beginPath();g.arc(p[0],p[1],Math.max(1.2,(q.mag-2)*1.6),0,7);g.fill()});g.globalAlpha=1;
 g.fillStyle=css('--dk-dim');g.font='11px "Owl Plex Mono",monospace';g.fillText('● quakes (fade with age)   ■ fire detections   + natural events',10,h-10)}
function scope(el,p,kind){const pl=PLACES[st.place]||PLACES[0];const max=kind==='q'?2000:3000;
 el.innerHTML=`<div class="dk-scope-top"><select aria-label="Scope centre">${PLACES.map((x,i)=>`<option value="${i}"${i===st.place?' selected':''}>${esc(x[0])}</option>`).join('')}</select><span>${max.toLocaleString()} km range</span></div><div class="dk-scope"></div><div class="dk-list"></div>`;
 el.querySelector('select').onchange=e=>{st.place=+e.target.value;save(st);render()};
 const pts=kind==='q'?quakes().map(q=>({...q,d:dist(pl[1],pl[2],q.lat,q.lon)})).filter(q=>q.d<=max):cells(((window.SNAP||{}).air||{}).cells).map(([lo,la,n])=>({lon:lo,lat:la,n,d:dist(pl[1],pl[2],la,lo)})).filter(q=>q.d<=max);
 pts.forEach(q=>q.b=bear(pl[1],pl[2],q.lat,q.lon));
 const list=el.querySelector('.dk-list');
 if(kind==='q'){const near=pts.slice().sort((a,b)=>b.mag-a.mag).slice(0,3);list.innerHTML=near.length?near.map(q=>`<div><span>M${q.mag.toFixed(1)}</span><span>${Math.round(q.d).toLocaleString()} km ${dir(q.b)}</span><span>${ago(q.hrs)}</span></div>`).join(''):'<p class="dk-dim">No M2.5+ quakes within range this week.</p>'}
 else{const tot=pts.reduce((s,q)=>s+q.n,0);list.innerHTML=`<div><span>${tot.toLocaleString()} aircraft</span><span>in ${pts.length} cells (10°)</span><span>in range</span></div><p class="dk-dim">Counts per 10° cell from OpenSky; no single aircraft is shown or kept.</p>`}
 const box=el.querySelector('.dk-scope'),{c,g,W:w,H:h}=canvasIn(box),cx=w/2,cy=h/2,rad=Math.min(w,h)/2-14;
 const sc=css('--dk-scope'),t0=performance.now();
 function frameDraw(t){g.clearRect(0,0,w,h);g.strokeStyle=sc;g.globalAlpha=.35;g.lineWidth=1;
  for(let k=1;k<=4;k++){g.beginPath();g.arc(cx,cy,rad*k/4,0,7);g.stroke()}g.beginPath();g.moveTo(cx-rad,cy);g.lineTo(cx+rad,cy);g.moveTo(cx,cy-rad);g.lineTo(cx,cy+rad);g.stroke();
  g.globalAlpha=.8;g.fillStyle=sc;g.font='10px "Owl Plex Mono",monospace';g.fillText('N',cx-3,cy-rad-3);[2,4].forEach(k=>{const r=rad*k/4*.7071;g.fillText(Math.round(max*k/4).toLocaleString()+' km',cx+r+3,cy-r-3)});
  const sw=((t-t0)/4000*2*Math.PI)%(2*Math.PI);if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const gr=g.createConicGradient?g.createConicGradient(sw-Math.PI/2-.6,cx,cy):null;if(gr){gr.addColorStop(0,'transparent');gr.addColorStop(.095,sc);gr.addColorStop(.1,'transparent');g.globalAlpha=.18;g.fillStyle=gr;g.beginPath();g.arc(cx,cy,rad,0,7);g.fill()}}
  pts.forEach(q=>{const r=rad*q.d/max,a=(q.b-90)*R,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);g.fillStyle=sc;
   if(kind==='q'){g.globalAlpha=Math.max(.3,1-q.hrs/170);g.beginPath();g.arc(x,y,Math.max(1.5,(q.mag-2)*2),0,7);g.fill()}else{g.globalAlpha=.25+Math.min(.75,Math.log10(q.n+1)/3);g.fillRect(x-3,y-3,6,6)}});
  g.globalAlpha=1;g.fillStyle=css('--dk-accent');g.beginPath();g.arc(cx,cy,3,0,7);g.fill();g.fillText(pl[0],cx+6,cy+12);c._raf=requestAnimationFrame(frameDraw)}
 c._raf=requestAnimationFrame(frameDraw)}
function drawQuakes(el){const q=quakes().filter(x=>x.mag>=4.5).sort((a,b)=>a.hrs-b.hrs);el.innerHTML=q.length?`<div class="dk-tab">${q.slice(0,60).map(x=>`<div><span class="dk-k">M${x.mag.toFixed(1)}</span><span>${esc(x.place||(x.lat.toFixed(1)+', '+x.lon.toFixed(1)))}</span><span class="dk-dim">${x.dep} km deep · ${ago(x.hrs)}</span></div>`).join('')}</div><p class="dk-dim">${q.length} quakes of M4.5 or more; places are USGS’s own words (named for M5+).</p>`:'<p class="dk-dim">No data from USGS yet.</p>'}
function drawGdacs(el){const a=(window.SIT||{}).gdacs||[];el.innerHTML=a.length?`<div class="dk-tab">${a.map(x=>`<div><span class="dk-k lv-${esc(String(x[2]).toLowerCase())}">${esc(x[2])}</span><span>${x[7]?`<a href="${esc(x[7])}" target="_blank" rel="noopener">${esc(x[1])}</a>`:esc(x[1])}</span><span class="dk-dim">${esc(x[6]||'')} · ${esc(x[3])} to ${esc(x[4])}</span></div>`).join('')}</div>`:'<p class="dk-dim">No GDACS alerts loaded.</p>'}
function drawSpace(el){const S=window.SNAP||{},kp=S.kp||[],sc=S.scales||{};const{g,W:w,H:h}=(()=>{el.innerHTML='<div class="dk-row"></div><div class="dk-spark"></div>';el.querySelector('.dk-row').innerHTML=['R','S','G'].map(k=>`<span><b>${k}${sc[k]??'–'}</b> ${({R:'radio blackouts',S:'solar radiation storms',G:'geomagnetic storms'})[k]}</span>`).join('');return canvasIn(el.querySelector('.dk-spark'))})();
 if(!kp.length)return;const bw=w/kp.length;kp.forEach((v,i)=>{g.fillStyle=v>=5?css('--dk-quake'):css('--dk-scope');g.globalAlpha=.8;const bh=(h-14)*v/9;g.fillRect(i*bw+.5,h-bh,Math.max(1,bw-1),bh)});g.globalAlpha=1;g.fillStyle=css('--dk-dim');g.font='10px "Owl Plex Mono",monospace';g.fillText('Planetary K-index, every 3 h, past 7 days (0–9; 5+ is a storm)',2,10)}
function drawSignals(el){const G=window.SIG||{},co2=G.co2||{},t=G.temp||{},si=(G.seaice||{}).north||{};
 el.innerHTML=`<div class="dk-tab">${co2.ppm?`<div><span class="dk-k">${co2.ppm} ppm</span><span>CO₂ at Mauna Loa, ${esc(co2.date)}</span><span class="dk-dim">a year earlier ${co2.ppmYearAgo} ppm</span></div>`:''}${t.latest?`<div><span class="dk-k">+${t.latest[1]} °C</span><span>${esc(t.title)}</span><span class="dk-dim">vs ${esc(t.base)} average</span></div>`:''}${si.extent?`<div><span class="dk-k">${si.extent} M km²</span><span>Arctic sea ice extent, ${esc(si.date)}</span><span class="dk-dim">NSIDC</span></div>`:''}</div>`}
function drawLaunches(el){const a=(window.SIG||{}).launches||[];el.innerHTML=a.length?`<div class="dk-tab">${a.slice(0,12).map(x=>`<div><span class="dk-k">${esc(String(x[1]).slice(0,16).replace('T',' '))}</span><span>${x[6]?`<a href="${esc(x[6])}" target="_blank" rel="noopener">${esc(x[0])}</a>`:esc(x[0])}</span><span class="dk-dim">${esc(x[2])} · ${esc(x[4]||'')}</span></div>`).join('')}</div>`:'<p class="dk-dim">No launches loaded.</p>'}
function drawClocks(el){el.innerHTML='<div class="dk-clocks"></div>';el._clock=true}
function tick(){const now=new Date(),u=root&&root.querySelector('#dkUtc');if(u)u.textContent=now.toISOString().slice(0,19).replace('T',' ')+' UTC';
 root&&root.querySelectorAll('.dk-clocks').forEach(c=>{c.innerHTML=[['UTC','UTC'],['Your time',undefined],['Tokyo','Asia/Tokyo'],['London','Europe/London'],['New York','America/New_York'],['Los Angeles','America/Los_Angeles']].map(([n,z])=>{let s='';try{s=now.toLocaleTimeString('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch(e){}return`<div><span class="dk-dim">${n}</span><b>${s}</b></div>`}).join('')})}
function topPx(){const t=document.getElementById('ops-top');const r=t&&t.getBoundingClientRect();return r&&r.height?Math.round(r.bottom+6):0}
function open(){if(opened)return;opened=true;const O=window.__obs;try{if(O&&O.setSlim)O.setSlim(true)}catch(e){}
 root=document.createElement('div');root.id='owlDeck';root.dataset.look=st.look;root.setAttribute('role','region');root.setAttribute('aria-label','Observation Deck');document.body.appendChild(root);
 document.documentElement.classList.add('deck-on');frame();
 const place=()=>{root.style.top=topPx()+'px'};place();setTimeout(()=>{place();render()},350);root._place=place;addEventListener('resize',place);
 const g=window.__obs3d;if(g&&g.viewer){prevLoop=g.viewer.useDefaultRenderLoop;g.viewer.useDefaultRenderLoop=false}
 timer=setInterval(()=>{tick()},1000);root._data=setInterval(render,60000);const b=document.getElementById('gnDeck');if(b)b.setAttribute('aria-pressed','true')}
function close(){if(!opened)return;opened=false;clearInterval(timer);if(root){clearInterval(root._data);removeEventListener('resize',root._place);root.querySelectorAll('canvas').forEach(c=>cancelAnimationFrame(c._raf));root.remove()}root=grid=null;
 document.documentElement.classList.remove('deck-on');const g=window.__obs3d;if(g&&g.viewer&&prevLoop!==null){g.viewer.useDefaultRenderLoop=prevLoop;prevLoop=null}
 const b=document.getElementById('gnDeck');if(b)b.setAttribute('aria-pressed','false')}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){const m=root.querySelector('#dkMenu');if(m&&!m.hidden){m.hidden=true;return}close()}});
let resizeT;addEventListener('resize',()=>{if(!opened)return;clearTimeout(resizeT);resizeT=setTimeout(render,250)});
// Header button, beside the site tour.
let tries=0;const wait=setInterval(()=>{const t=document.getElementById('gnSiteTour');if(t){clearInterval(wait);const b=document.createElement('button');b.type='button';b.id='gnDeck';b.className=t.className;b.setAttribute('aria-pressed','false');
 b.title='Observation Deck: a full-screen board of live panels you can arrange (work in progress)';b.textContent='▦ Observation Deck';b.onclick=()=>opened?close():open();t.before(b)}else if(++tries>120)clearInterval(wait)},500);
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
#owlDeck .dk-scope{flex:1;min-height:160px;position:relative}#owlDeck .dk-scope canvas,#owlDeck .dk-spark canvas,#owlDeck .dk-p[data-t=map] canvas{position:absolute;inset:0}
#owlDeck .dk-p[data-t=map] .dk-body{position:relative}
#owlDeck .dk-list>div{display:flex;justify-content:space-between;gap:8px;padding:2px 0;border-top:1px dotted var(--dk-line)}
#owlDeck .dk-row{display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:4px}#owlDeck .dk-row b{color:var(--dk-accent)}#owlDeck .dk-spark{flex:1;position:relative;min-height:50px}
#owlDeck .dk-clocks{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}#owlDeck .dk-clocks div{display:flex;flex-direction:column}#owlDeck .dk-clocks b{font-weight:400;font-size:15px;color:var(--dk-accent)}
#owlDeck .dk-foot{margin:10px 2px 0;color:var(--dk-dim);font-size:10.5px}
@media (max-width:900px){#owlDeck .dk-grid{grid-template-columns:repeat(4,minmax(0,1fr))}#owlDeck .dk-p{grid-column:span 4!important}}`;
document.head.appendChild(s);
})();
