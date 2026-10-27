// ---------- live hooks: lets live.js swap in new data without a reload ----------
function setQuakes(str){
 const list=String(str||'').split(';').filter(Boolean).map(s=>{const [a,place]=s.split('|');const [lon,lat,mag,depth,hrs]=a.split(',').map(Number);return {lon,lat,mag,depth,hrs,place}});
 if(!list.length)return;
 const q2=list.slice().sort((a,b)=>a.mag-b.mag);
 qSel=G.quake.selectAll('circle').data(q2).join('circle').attr('class',d=>'q'+(d.mag>=6?' big':'')).attr('r',d=>rQ(d.mag));
 bindTip(qSel,d=>`<b>M${d.mag.toFixed(1)}${d.place?' · '+d.place:''}</b>Depth ${d.depth} km · ${d.hrs<1?'under an hour ago':d.hrs+' h ago'}`);
 const big=list.reduce((m,q)=>q.mag>m.mag?q:m,list[0]);
 const c=document.querySelector('#chip-quake .ct');if(c)c.textContent=list.length+' this week';
 const rd=document.querySelector('#readings .rd');if(rd){rd.querySelector('.v').textContent=fmt(list.length);rd.querySelector('.s').textContent='past 7 days · largest M'+big.mag.toFixed(1)+(big.place?' near '+big.place:'')}
 render();
}
function setSnap(N){
 if(N.quakes)setQuakes(N.quakes);
 if(N.fires?.cells){const f=N.fires.cells.split(';').map(s=>{const [lon,lat,n]=s.split(',').map(Number);return {lon,lat,n,geo:cellPoly(lon,lat,2.4)}});
  const op=d3.scaleLog().domain([10,d3.max(f,d=>d.n)||10]).range([.12,.8]);
  fireSel=G.fire.selectAll('path').data(f).join('path').attr('class','f').attr('fill-opacity',d=>op(d.n));
  bindTip(fireSel,d=>`<b>${fmt(d.n)} fire detections</b>in this 5° cell in 24 h<br>VIIRS satellite heat signatures; most are farm and land-clearing burns`);
  const c=document.querySelector('#chip-fire .ct');if(c)c.textContent=fmt(N.fires.total)+' / 24 h'}
 if(N.air?.cells){const a=N.air.cells.split(';').map(s=>{const [lon,lat,n]=s.split(',').map(Number);return {lon,lat,n,geo:cellPoly(lon,lat,4.8)}});
  const op=d3.scaleSqrt().domain([1,d3.max(a,d=>d.n)||1]).range([.1,.85]);
  airSel=G.air.selectAll('path').data(a).join('path').attr('class','a').attr('fill-opacity',d=>op(d.n));
  bindTip(airSel,d=>`<b>${fmt(d.n)} aircraft airborne</b>in this 10° cell at the last update<br>Seen by OpenSky volunteer receivers`);
  const c=document.querySelector('#chip-air .ct');if(c)c.textContent=fmt(N.air.air)+' airborne'}
 if(Array.isArray(N.eonet)){const e=N.eonet.map(([cat,title,lon,lat])=>({cat,title,lon,lat}));
  evSel=G.event.selectAll('path').data(e).join('path').attr('class','ev').attr('d',d3.symbol().type(d3.symbolTriangle).size(70));
  bindTip(evSel,d=>`<b>${d.title}</b>${d.cat} · NASA EONET`);
  const c=document.querySelector('#chip-event .ct');if(c)c.textContent=e.length+' open'}
 if(N.alerts?.severeLand){const al=N.alerts.severeLand.map(([ev,area,lon,lat])=>({ev,area,lon,lat}));
  alSel=G.alert.selectAll('path').data(al).join('path').attr('class','al').attr('d',d3.symbol().type(d3.symbolDiamond).size(80));
  bindTip(alSel,d=>`<b>${d.ev}</b>${d.area}<br>National Weather Service · pin at approximate area center`);
  const c=document.querySelector('#chip-alert .ct');if(c)c.textContent=al.length+' on land'}
 render();
}
// Added layers (nature, etc.): a chip in the layer bar, a group on the map, a render hook.
function addLayer(l){
 LAYERS.push(l);G[l.id]=root.append('g').attr('id','g-'+l.id).attr('display',l.on?null:'none');
 const b=document.createElement('button');b.className='chip';b.id='chip-'+l.id;b.setAttribute('aria-pressed',l.on);b.dataset.group=l.group||'';
 b.innerHTML=swatch(l)+`<span>${l.name}</span><span class="ct">${l.count||''}</span>`;
 b.onclick=()=>{l.on=!l.on;b.setAttribute('aria-pressed',l.on);d3.select('#g-'+l.id).attr('display',l.on?null:'none')};
 bar.appendChild(b);return G[l.id];
}
function flyTo(lon,lat){rot=[-lon,-lat];setSpin(false);setMode(mode)}
// Invisible country shapes under the markers, so any country can be clicked for a brief.
const hitG=root.insert('g',()=>nightG.node()).attr('id','g-ctyhit');
function countryHit(cb){const s=hitG.selectAll('path').data(CT).join('path').attr('fill','transparent').attr('stroke','none').style('cursor','pointer').on('click',(e,d)=>cb(d));RENDER_HOOKS.push(()=>s.attr('d',path));s.attr('d',path);
 svg.node().addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('.cty');if(!t)return;const d=d3.select(t).datum();if(d&&d.f)cb(d.f)},true);return s}
window.__obs={renderSit,renderSig,renderDis,renderWatchLists:typeof renderWatch==='function'?renderWatch:null,buildIndex:typeof buildIndex==='function'?buildIndex:null,renderEcon:typeof renderEcon==='function'?renderEcon:null,buildEconLayer:typeof buildEconLayer==='function'?buildEconLayer:null,renderUnexp:typeof renderUnexp==='function'?renderUnexp:null,buildOddLayer:typeof buildOddLayer==='function'?buildOddLayer:null,buildSigLayers,buildSitLayers,render,setQuakes,setSnap,addLayer,flyTo,countryHit,countries:CT,quakes:()=>qs,events:()=>events,alerts:()=>alerts,fires:()=>fires,
 onRender:f=>RENDER_HOOKS.push(f),place,bindTip,cellPoly,path:()=>path,proj:()=>proj,visible,layers:LAYERS,setSpin,setMode,mode:()=>mode};
