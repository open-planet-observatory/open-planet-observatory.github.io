// ---------- Gravity, water and ice: the geoid (EGM96) and GRACE-FO mass change ----------
// Geoid: NGA's EGM96 model (public domain), pre-rendered to assets/geoid-egm96.png by build/make-geoid.mjs.
// GRACE-FO: NASA JPL Tellus mascons via PO.DAAC (data/grace.json + data/grace.png, collector/grace.mjs).
// The ice-mass numbers and JPL's trend line are JPL's own; the explainer and diagram are this site's teaching copy.
(function(){
const O=window.__obs;if(!O)return;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtN=n=>Number(n).toLocaleString('en-US');
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
let G=null; // data/grace.json once loaded
// ----- layer switches (3D globe) -----
O.addLayer({id:'geoid',name:'Gravity: geoid height',color:'--c-geoid',shape:'square',count:'3D only',on:false,group:'Earth'});
O.addLayer({id:'grace',name:'Water & ice change (GRACE-FO)',color:'--c-grace',shape:'square',count:'3D only',on:false,group:'Earth'});
document.documentElement.style.setProperty('--c-geoid','#d6604d');document.documentElement.style.setProperty('--c-grace','#35978f');
const LEG={geoid:{grad:'linear-gradient(90deg,#214ca0,#4393c3,#92c5de,#f7f7f7,#f4a582,#d6604d,#961428)',lo:'−100 m',mid:'0',hi:'+100 m',note:'How far the geoid (sea level under gravity alone) sits above or below the smooth ellipsoid. NGA EGM96 model.'},
 grace:{grad:'linear-gradient(90deg,#8c2d04,#cc7016,#f1ba68,#f5f5f0,#80cdc1,#35978f,#014663)',lo:'−40 cm',mid:'0',hi:'+40 cm',note:'Water and ice on land compared with JPL’s 2004–2009 average, as a depth of water. NASA JPL GRACE-FO.'}};
const tip={geoid:'Where the sea would sit under gravity alone: up to about 85 m higher or 107 m lower than a smooth Earth.',grace:'Latest GRACE-FO month: water and ice gained (blue-green) or lost (brown) on land.'};
Object.entries(tip).forEach(([k,v])=>{const b=document.getElementById('chip-'+k);if(b)b.title=v});
const chipOn=id=>{const c=document.getElementById('chip-'+id);return !!c&&c.getAttribute('aria-pressed')==='true'};
const turnOn=id=>{const c=document.getElementById('chip-'+id);if(c&&c.getAttribute('aria-pressed')!=='true')c.click()};
const layers={};
async function syncLayers(){const g=window.__obs3d,C=window.Cesium;
 for(const id of ['geoid','grace']){const on=chipOn(id);
  let lg=document.getElementById('lg-'+id);const chip=document.getElementById('chip-'+id);
  if(on&&!lg&&chip){const L=LEG[id];lg=document.createElement('div');lg.id='lg-'+id;lg.className='wx-legend';lg.innerHTML=`<div class="grav-ramp" style="background:${L.grad}"></div><div class="grav-ticks"><span>${L.lo}</span><span>${L.mid}</span><span>${L.hi}</span></div><span>${esc(L.note)}${id==='grace'&&G&&G.grid?' Month shown: '+esc(monthName(G.grid.month))+'.':''}${id==='grace'&&!(G&&G.grid)?' Not collected yet.':''}</span>`;chip.after(lg)}
  if(lg)lg.hidden=!on;
  if(!g||!C)continue;
  if(on&&!layers[id]){const url=id==='geoid'?'assets/geoid-egm96.png':(G&&G.grid?'data/grace.png?m='+encodeURIComponent(G.grid.month):null);if(!url)continue;
   layers[id]='loading';try{const p=await C.SingleTileImageryProvider.fromUrl(url,{rectangle:C.Rectangle.fromDegrees(-180,-90,180,90)});const L=new C.ImageryLayer(p,{alpha:id==='geoid'?.78:.9});g.viewer.imageryLayers.add(L);layers[id]=L}catch(e){layers[id]=null;console.warn(id,e)}}
  if(layers[id]&&layers[id]!=='loading')layers[id].show=on}}
new MutationObserver(ms=>{if(ms.some(m=>/^chip-(geoid|grace)$/.test(m.target.id||'')))syncLayers()}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
const monthName=m=>{const [y,mo]=String(m).split('-');return MON[+mo-1]+' '+y};

// ----- ice-mass chart: Greenland and Antarctica, change since April 2002 (JPL), one axis, 1-sigma bands -----
function iceChart(){const S=[['greenland','Greenland','gs-1'],['antarctica','Antarctica','gs-2']].filter(([k])=>G&&G[k]);if(!S.length)return '';
 const W=420,H=230,m={l:50,r:78,t:10,b:24};const all=S.flatMap(([k])=>G[k].rows);
 const x0=Math.floor(Math.min(...all.map(r=>r[0]))),x1=Math.ceil(Math.max(...all.map(r=>r[0])));
 const lo=Math.min(0,...all.map(r=>r[1]-(r[2]||0))),hi=Math.max(0,...all.map(r=>r[1]+(r[2]||0)));const step=hi-lo>6000?2000:1000;
 const y0=Math.floor(lo/step)*step,y1=Math.ceil(hi/step)*step;
 const X=v=>m.l+(v-x0)/(x1-x0)*(W-m.l-m.r),Y=v=>m.t+(y1-v)/(y1-y0)*(H-m.t-m.b);
 let s=`<svg class="grav-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ice mass change since April 2002 for ${S.map(x=>x[1]).join(' and ')}, in gigatonnes">`;
 for(let v=y0;v<=y1;v+=step)s+=`<line x1="${m.l}" x2="${W-m.r}" y1="${Y(v)}" y2="${Y(v)}" class="${v===0?'gz':'gg'}"/><text x="${m.l-8}" y="${Y(v)+4}" text-anchor="end" class="gt">${v===0?'0':(v>0?'+':'−')+fmtN(Math.abs(v))}</text>`;
 for(let yr=Math.ceil(x0/5)*5;yr<=x1;yr+=5)s+=`<text x="${X(yr)}" y="${H-8}" text-anchor="middle" class="gt">${yr}</text>`;
 S.forEach(([k,name,cls])=>{const r=G[k].rows;
  const band=r.map(p=>`${X(p[0]).toFixed(1)},${Y(p[1]+(p[2]||0)).toFixed(1)}`).concat(r.slice().reverse().map(p=>`${X(p[0]).toFixed(1)},${Y(p[1]-(p[2]||0)).toFixed(1)}`)).join(' ');
  s+=`<polygon points="${band}" class="gb ${cls}"/><polyline points="${r.map(p=>`${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}" class="gl ${cls}"/>`;
  const last=r[r.length-1];s+=`<circle cx="${X(last[0])}" cy="${Y(last[1])}" r="4" class="gd ${cls}"/><text x="${X(last[0])+8}" y="${Y(last[1])+4}" class="glab">${name}</text>`});
 s+=`<line class="gx" x1="0" x2="0" y1="${m.t}" y2="${H-m.b}" visibility="hidden"/><rect class="ghit" x="${m.l}" y="${m.t}" width="${W-m.l-m.r}" height="${H-m.t-m.b}" fill="transparent"/></svg>`;
 return `<div class="grav-chart-wrap" data-x0="${x0}" data-x1="${x1}" data-ml="${m.l}" data-mr="${m.r}" data-w="${W}">${s}<div class="grav-tip" hidden></div></div>`}
function bindChart(h){const w=h.querySelector('.grav-chart-wrap');if(!w)return;const svg=w.querySelector('svg'),tipEl=w.querySelector('.grav-tip'),line=w.querySelector('.gx');
 const x0=+w.dataset.x0,x1=+w.dataset.x1,ml=+w.dataset.ml,mr=+w.dataset.mr,W=+w.dataset.w;
 const near=(rows,yr)=>rows.reduce((a,b)=>Math.abs(b[0]-yr)<Math.abs(a[0]-yr)?b:a);
 const dec=v=>{const y=Math.floor(v),mo=Math.min(11,Math.floor((v-y)*12));return MON[mo].slice(0,3)+' '+y};
 svg.addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect();const px=(e.clientX-r.left)/r.width*W;if(px<ml||px>W-mr){tipEl.hidden=true;line.setAttribute('visibility','hidden');return}
  const yr=x0+(px-ml)/(W-ml-mr)*(x1-x0);const rows=[['greenland','Greenland'],['antarctica','Antarctica']].filter(([k])=>G[k]).map(([k,n])=>[n,near(G[k].rows,yr)]);
  line.setAttribute('x1',px);line.setAttribute('x2',px);line.setAttribute('visibility','visible');
  tipEl.innerHTML=`<b>${dec(rows[0][1][0])}</b>${rows.map(([n,p])=>`<div>${n}: ${p[1]>0?'+':'−'}${fmtN(Math.abs(Math.round(p[1])))} Gt${p[2]?` <span class="muted">± ${fmtN(Math.round(p[2]))}</span>`:''}</div>`).join('')}`;
  tipEl.hidden=false;const left=(e.clientX-r.left);tipEl.style.left=Math.min(left+12,r.width-170)+'px';tipEl.style.top='8px'});
 svg.addEventListener('pointerleave',()=>{tipEl.hidden=true;line.setAttribute('visibility','hidden')})}

// ----- Climate panel section -----
function render(){const host=document.getElementById('ensoLearn');if(!host)return;let h=document.getElementById('gravHost');if(!h){h=document.createElement('div');h.id='gravHost';host.after(h)}
 const gr=G&&G.greenland,an=G&&G.antarctica,last=k=>G[k].rows[G[k].rows.length-1];
 const ice=gr||an?`<article class="dis"><h3>Ice sheets, weighed from space</h3>
  <p class="small">Two satellites, GRACE-FO, weigh the ice sheets every month from the tiny changes in gravity they feel. Each line is the change in ice mass since April 2002, in gigatonnes (a billion tonnes); the shaded band is NASA JPL’s stated uncertainty. About 360 Gt of melted ice raises the world’s seas by 1 mm.</p>
  <div class="enso-nums">${gr?`<div><b>${last('greenland')[1]>0?'+':'−'}${fmtN(Math.abs(Math.round(last('greenland')[1])))} Gt</b><span>Greenland, April 2002 to ${esc(monthName(decToMonth(last('greenland')[0])))}</span></div>`:''}${an?`<div><b>${last('antarctica')[1]>0?'+':'−'}${fmtN(Math.abs(Math.round(last('antarctica')[1])))} Gt</b><span>Antarctica, same period</span></div>`:''}</div>
  <p class="small muted" style="margin:8px 0 0">Change in ice mass since April 2002, gigatonnes</p>${iceChart()}
  ${[gr,an].filter(Boolean).map(s=>s.trend?`<p class="small muted" style="margin:4px 0">JPL: “${esc(s.trend)}”</p>`:'').join('')}
  <div class="sg-foot"><span><a href="https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/" target="_blank" rel="noopener">NASA JPL GRACE/GRACE-FO mascons</a> via <a href="https://podaac.jpl.nasa.gov/GRACE-FO" target="_blank" rel="noopener">PO.DAAC</a>, NASA open data · ${esc((gr||an).solution||'')}</span></div></article>`
  :`<article class="dis"><h3>Ice sheets, weighed from space</h3><p class="small muted">GRACE-FO ice and water data has not been collected yet. It will appear here once the monthly NASA files are fetched.</p></article>`;
 const grid=G&&G.grid?`<article class="dis"><h3>Water on land: ${esc(monthName(G.grid.month))}</h3>
  <p class="small">The same satellites see water gained or lost on land: groundwater pumped for farms, droughts and floods, shrinking glaciers. The map compares each place with its 2004–2009 average, as a depth of water (centimetres). GRACE-FO sees areas about 300 km across, so it shows regions, not single towns or wells, and each month arrives a few months late.</p>
  <div class="sg-foot"><span><button class="more" id="graceShow">Show on the globe</button> · NASA JPL GRACE-FO, month ${esc(G.grid.month)} (${G.grid.months} months since 2002)</span></div></article>`:'';
 const ex=`<article class="dis"><h3>Gravity isn’t the same everywhere</h3>
  <p class="small">Earth’s gravity pulls slightly harder where there is more mass below: mountains, dense rock deep in the mantle, a heavy ice sheet. If the oceans settled under gravity alone, with no tides or currents, their surface (the <i>geoid</i>) would not be smooth: it would sit about 85 m higher near New Guinea and 107 m lower south of India than a perfect ellipsoid. You would not notice walking across it, but satellites, GPS heights and sea-level maps all have to account for it.</p>
  ${diagram()}
  <p class="small">GRACE-FO is two satellites flying 220 km apart. When the front one passes over extra mass, that mass tugs it ahead a little; then it tugs the second one. A microwave link and a laser measure the gap between them to about a micrometre or better, and from those stretches and squeezes NASA works out where mass moved that month: ice melting, aquifers draining, oceans filling.</p>
  <div class="sg-foot"><span><button class="more" id="geoidShow">Show the geoid on the globe</button> · Geoid: <a href="https://earth-info.nga.mil/" target="_blank" rel="noopener">NGA EGM96</a>, public domain</span></div></article>`;
 h.innerHTML=`<h3 style="font-size:1rem;margin:18px 0 8px">Gravity, water and ice</h3><div class="sg-grid grav-grid">${ice}${grid}${ex}</div>`;
 bindChart(h);
 const gs=h.querySelector('#graceShow');if(gs)gs.onclick=()=>{turnOn('grace');O.flyTo(-40,60)};
 h.querySelector('#geoidShow').onclick=()=>{turnOn('geoid');O.flyTo(80,5)}}
const decToMonth=v=>{const y=Math.floor(v),mo=Math.min(11,Math.floor((v-y)*12));return y+'-'+String(mo+1).padStart(2,'0')};
function diagram(){return `<svg class="grav-diag" viewBox="0 0 460 150" role="img" aria-label="Diagram: two GRACE-FO satellites in the same orbit; extra mass on the ground pulls the leading satellite ahead and stretches the gap between them">
 <path d="M20 128 L 290 128 Q 355 80 420 128 L 440 128" class="gd-ground"/><text x="440" y="146" text-anchor="end" class="gt">extra mass ahead (an ice sheet, a mountain, full aquifers)</text>
 <path d="M30 40 Q 230 18 430 40" class="gd-orbit"/>
 <circle cx="150" cy="30" r="7" class="gd-sat"/><circle cx="300" cy="30" r="7" class="gd-sat"/>
 <line x1="157" y1="30" x2="293" y2="30" class="gd-link"/><text x="225" y="22" text-anchor="middle" class="gt">gap measured to ~1 µm</text>
 <line x1="306" y1="37" x2="346" y2="96" class="gd-pull"/><polygon points="350,102 338,94 349,89" class="gd-arrow"/>
 <text x="356" y="62" class="gt">pulled ahead</text><text x="60" y="64" class="gt">direction of flight →</text></svg>`}

async function load(){try{const r=await fetch('data/grace.json?t='+Math.floor(Date.now()/36e5));if(r.ok)G=await r.json()}catch(e){}
 try{render()}catch(e){console.warn(e)}const c=document.getElementById('chip-grace');if(c&&G&&G.grid){const ct=c.querySelector('.ct');if(ct)ct.textContent=G.grid.month}syncLayers()}
try{render()}catch(e){console.warn(e)}load();
let tries=0;const t=setInterval(()=>{if(window.__obs3d||++tries>40){clearInterval(t);syncLayers()}},500);
})();
