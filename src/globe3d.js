// ---------- 3D globe (CesiumJS): a real planet behind the panels ----------
// Replaces the drawn SVG globe when WebGL is available. Every object gets a height: satellites fly their
// real orbits at altitude, fireballs appear where they burst, aircraft cells float at cruise height,
// earthquakes can be seen at depth with the see-through toggle. The SVG map stays as "Flat" and as
// the fallback when 3D can't start. Imagery: NASA GIBS (public domain), optional Bing via a Cesium ion token.
(function(){
const O=window.__obs;if(!O||!window.Cesium)return;
const C=window.Cesium;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtN=n=>n==null?'–':Number(n).toLocaleString('en-US');
const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const col=(v,a=1)=>{try{const c=C.Color.fromCssColorString(v.startsWith('--')?cssVar(v):v.startsWith('var(')?cssVar(v.slice(4,-1)):v);return a===1?c:c.withAlpha(a)}catch(e){return C.Color.WHITE.withAlpha(a)}};
const mapbox=document.getElementById('mapbox');const host=document.getElementById('ops-map')||mapbox?.parentElement;if(!host)return;
try{const t=document.createElement('canvas');if(!(t.getContext('webgl2')||t.getContext('webgl')))return}catch(e){return}

// ----- imagery -----
const yesterday=()=>new Date(Date.now()-864e5).toISOString().slice(0,10);
const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/';
const geo=new C.GeographicTilingScheme();
const gibs=(layer,set,levels,ext,time)=>new C.UrlTemplateImageryProvider({url:GIBS+layer+'/default/'+(time?time+'/':'')+set+'/{z}/{y}/{x}.'+ext,tilingScheme:geo,tileWidth:512,tileHeight:512,maximumLevel:levels,credit:new C.Credit('Imagery: NASA GIBS',false)});
const IMAGERY={
 bluemarble:{name:'Blue Marble (NASA)',make:()=>gibs('BlueMarble_ShadedRelief_Bathymetry','500m',8,'jpeg')},
 daily:{name:'Yesterday’s satellite view (NASA)',make:()=>gibs('VIIRS_SNPP_CorrectedReflectance_TrueColor','250m',8,'jpg',yesterday())},
 bing:{name:'Bing aerial (Cesium ion)',make:()=>C.IonImageryProvider.fromAssetId(2),needsToken:true},
 basic:{name:'Basic (offline)',make:()=>C.TileMapServiceImageryProvider.fromUrl(C.buildModuleUrl('Assets/Textures/NaturalEarthII'))},
};
let imageryChoice='bluemarble';try{imageryChoice=localStorage.getItem('obs-imagery')||imageryChoice}catch(e){}
if(window.OBS_ION_TOKEN)C.Ion.defaultAccessToken=window.OBS_ION_TOKEN;
if(IMAGERY[imageryChoice]?.needsToken&&!window.OBS_ION_TOKEN)imageryChoice='bluemarble';
if(window.OBS_OFFLINE_IMAGERY)imageryChoice='basic';

// ----- viewer -----
const el=document.createElement('div');el.id='cesium';host.insertBefore(el,host.firstChild);
const credits=document.createElement('div');credits.id='cesiumCredits';credits.className='small muted';
let viewer;
try{
 viewer=new C.Viewer(el,{baseLayer:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,animation:false,timeline:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,creditContainer:credits,requestRenderMode:false,skyAtmosphere:new C.SkyAtmosphere(),contextOptions:{webgl:{preserveDrawingBuffer:true}}});
}catch(e){el.remove();return}
const scene=viewer.scene,globe=scene.globe;
globe.enableLighting=true;globe.showGroundAtmosphere=true;globe.baseColor=C.Color.fromCssColorString('#0b1c2c');
scene.highDynamicRange=false;scene.fog.enabled=false;
viewer.clock.shouldAnimate=true;viewer.clock.multiplier=1;viewer.clock.currentTime=C.JulianDate.now();
scene.screenSpaceCameraController.minimumZoomDistance=12000;scene.screenSpaceCameraController.maximumZoomDistance=6e7;
viewer.camera.setView({destination:C.Cartesian3.fromDegrees(-75,25,2.3e7)});

let baseLayer=null;
async function setImagery(k){const def=IMAGERY[k]||IMAGERY.bluemarble;
 try{const p=await def.make();const layer=new C.ImageryLayer(p);
  p.errorEvent.addEventListener(()=>{if(k!=='basic'&&!layer.__failed){layer.__failed=true;note('Imagery from '+def.name+' did not load; showing the offline map instead.');setImagery('basic')}});
  if(baseLayer)viewer.imageryLayers.remove(baseLayer,true);baseLayer=layer;viewer.imageryLayers.add(layer,0);
  imageryChoice=k;try{localStorage.setItem('obs-imagery',k)}catch(e){}
  document.querySelectorAll('#imgSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===k));
 }catch(e){if(k!=='basic')setImagery('basic')}}
setImagery(imageryChoice);
function note(t){const n=document.getElementById('imgNote');if(n)n.textContent=t}

// ----- layers: one data source per chip id, synced with the chip's pressed state -----
const DS={};
function ds(id){if(!DS[id]){const d=new C.CustomDataSource(id);viewer.dataSources.add(d);const chip=document.getElementById('chip-'+id);d.show=!chip||chip.getAttribute('aria-pressed')==='true';DS[id]=d}return DS[id]}
new MutationObserver(ms=>ms.forEach(m=>{const id=m.target.id.replace(/^chip-/,'');if(DS[id])DS[id].show=m.target.getAttribute('aria-pressed')==='true'})).observe(document.getElementById('layerbar')||document.body,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
const clear=id=>{const d=ds(id);d.entities.removeAll();return d.entities};
const deg=(lon,lat,h=0)=>C.Cartesian3.fromDegrees(lon,lat,h);
const rect=(lon,lat,half)=>C.Rectangle.fromDegrees(lon-half,lat-half,lon+half,lat+half);
const parseCells=s=>String(s||'').split(';').filter(Boolean).map(x=>{const [lon,lat,n]=x.split(',').map(Number);return {lon,lat,n}});

// map layers (SNAP)
function buildSnap(){const S=window.SNAP||{};
 // earthquakes: on the surface normally; with see-through on, at real depth (exaggerated, labeled)
 const q=clear('quake');const quakes=O.quakes();const big=d=>d.mag>=6;
 quakes.forEach(d=>{const r=Math.max(3,Math.pow(1.6,d.mag-2.5)*2.4);q.add({position:deg(d.lon,d.lat,xray?-d.depth*1000*DEPTH_X:0),point:{pixelSize:r,color:col('--l-quake',big(d)?.9:.6),outlineColor:col('--panel',.8),outlineWidth:big(d)?1.5:0,disableDepthTestDistance:xray?0:Number.POSITIVE_INFINITY},
  description:`<b>M${d.mag.toFixed(1)}${d.place?' · '+esc(d.place):''}</b>Depth ${d.depth} km · ${d.hrs<1?'under an hour ago':d.hrs+' h ago'}<br><span style="opacity:.75">USGS</span>`})});
 // fires: 5° cells on the ground
 const f=clear('fire');const fires=O.fires();const fMax=Math.max(10,...fires.map(d=>d.n));const fOp=v=>.12+.7*Math.log(Math.max(10,v)/10)/Math.log(fMax/10||2);
 fires.forEach(d=>f.add({rectangle:{coordinates:rect(d.lon,d.lat,2.4),material:col('--l-fire',fOp(d.n)),classificationType:C.ClassificationType.TERRAIN},description:`<b>${fmtN(d.n)} fire detections</b>in this 5° cell in 24 h<br>VIIRS satellite heat signatures; most are farm and land-clearing burns`}));
 // aircraft density: 10° cells floating at cruise height
 const a=clear('air');const air=S.air?.cells?parseCells(S.air.cells):[];const aMax=Math.max(1,...air.map(d=>d.n));
 air.forEach(d=>a.add({rectangle:{coordinates:rect(d.lon,d.lat,4.8),height:10500,extrudedHeight:11000,material:col('--l-air',.1+.7*Math.sqrt(d.n/aMax)),outline:true,outlineColor:col('--l-air',.4)},description:`<b>${fmtN(d.n)} aircraft airborne</b>in this 10° cell at the last update, drawn at cruise height<br>Seen by OpenSky volunteer receivers`}));
 // storms & wildfires, severe alerts
 const e=clear('event');O.events().forEach(d=>e.add({position:deg(d.lon,d.lat,0),point:{pixelSize:9,color:col('--l-event'),outlineColor:col('--panel'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(d.title)}</b>${esc(d.cat)} · NASA EONET`}));
 const al=clear('alert');O.alerts().forEach(d=>al.add({position:deg(d.lon,d.lat,0),point:{pixelSize:8,color:col('--l-alert'),outlineColor:col('--panel'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(d.ev)}</b>${esc(d.area)}<br>National Weather Service · pin at approximate area center`}));
 buildSats();
}
// satellites: real orbits from the TLEs, animated by Cesium's clock
let satTimer=null;
function orbit(l1,l2,step,span){const rec=satellite.twoline2satrec(l1,l2);const pos=new C.SampledPositionProperty();let alt=0,period=0;
 for(let t=-span;t<=span;t+=step){const jd=C.JulianDate.addSeconds(C.JulianDate.now(),t,new C.JulianDate());const date=C.JulianDate.toDate(jd);const pv=satellite.propagate(rec,date);if(!pv||!pv.position)continue;const gmst=satellite.gstime(date);const ecf=satellite.eciToEcf(pv.position,gmst);pos.addSample(jd,new C.Cartesian3(ecf.x*1000,ecf.y*1000,ecf.z*1000));if(t===0){const gd=satellite.eciToGeodetic(pv.position,gmst);alt=Math.round(gd.height)}}
 period=Math.round(2*Math.PI/rec.no);return {pos,alt,period}}
const LABEL=(text)=>({text,font:'600 12px Public Sans, sans-serif',fillColor:col('--ink'),outlineColor:col('--ocean'),outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(10,0),horizontalOrigin:C.HorizontalOrigin.LEFT,disableDepthTestDistance:Number.POSITIVE_INFINITY});
function buildSats(){const S=window.SNAP||{};const s=clear('sat');if(!window.satellite||!S.tle)return;
 const now=C.JulianDate.now();const avail=span=>new C.TimeIntervalCollection([new C.TimeInterval({start:C.JulianDate.addSeconds(now,-span,new C.JulianDate()),stop:C.JulianDate.addSeconds(now,span,new C.JulianDate())})]);
 S.tle.forEach(([name,l1,l2])=>{const {pos,alt}=orbit(l1,l2,30,5400);
  s.add({name,position:pos,availability:avail(5400),point:{pixelSize:9,color:col('--l-sat'),outlineColor:col('--panel'),outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},label:LABEL(name),
   path:{resolution:30,leadTime:2700,trailTime:2700,width:1.5,material:new C.PolylineGlowMaterialProperty({glowPower:.2,color:col('--l-sat',.9)})},
   description:`<b>${esc(name)}</b>About ${fmtN(alt)} km up, moving on its real orbit (CelesTrak elements, propagated in your browser). The line is ±45 minutes of its path.`})});
 // constellations: many small points, short trails, labels only on hover. Geostationary ones sit still far out.
 const cs=clear('sats');const chip=document.getElementById('chip-sats');let n=0;
 (S.tleGroups||[]).forEach(g=>g.sats.forEach(([name,l1,l2])=>{const geo=/GOES|geostationary/i.test(g.name);const {pos,alt,period}=orbit(l1,l2,geo?600:60,geo?7200:5400);n++;
  cs.add({name,position:pos,availability:avail(geo?7200:5400),point:{pixelSize:5,color:col('--l-sat',.9),disableDepthTestDistance:Number.POSITIVE_INFINITY},
   path:geo?undefined:{resolution:60,leadTime:0,trailTime:600,width:1,material:col('--l-sat',.35)},
   description:`<b>${esc(name)}</b>${esc(g.name)} · about ${fmtN(alt)} km up · one orbit every ${period} min<br><span style="opacity:.75">CelesTrak elements, propagated in your browser</span>`})}));
 if(chip)chip.querySelector('.ct').textContent=n?n+' shown':'after first collection';
 clearTimeout(satTimer);satTimer=setTimeout(buildSats,10*60e3); // keep the sampled window around "now"
}
O.addLayer({id:'sats',name:'Satellite constellations',color:'--l-sat',shape:'circle',count:'3D only',on:true,group:'Space'});
// situations (SIT): conflict countries, disaster alerts
function buildSit(){const T=window.SIT||{};const w=clear('war');const by={};const ALIAS={'Democratic Republic of the Congo':'Dem. Rep. Congo','Central African Republic':'Central African Rep.','South Sudan':'S. Sudan','Bosnia and Herzegovina':'Bosnia and Herz.','Dominican Republic':'Dominican Rep.','Western Sahara':'W. Sahara','United States':'United States of America','Ivory Coast':"Côte d'Ivoire",'Myanmar':'Myanmar','Czech Republic':'Czechia'};
 (T.wars||[]).forEach(x=>x[3].forEach(n=>{const k=ALIAS[n]||n;(by[k]=by[k]||[]).push(x)}));
 O.countries.filter(f=>by[f.properties.name]).forEach(f=>{const wars=by[f.properties.name];const major=wars.some(x=>x[0]==='major');
  polys(f).forEach(h=>w.add({polygon:{hierarchy:h,material:col(major?'--sev-red':'--warn',.35),outline:false,classificationType:C.ClassificationType.TERRAIN},
   description:`<b>${esc(f.properties.name)}</b>${wars.map(x=>'· '+esc(x[1])+(x[4]?' ('+esc(x[4])+')':'')).join('<br>')}<br><span style="opacity:.75">Wikipedia, List of ongoing armed conflicts</span>`}))});
 const g=clear('gdacs');const GD={EQ:'Earthquake',TC:'Tropical cyclone',FL:'Flood',DR:'Drought',VO:'Volcano',WF:'Wildfire',TS:'Tsunami'};
 (T.gdacs||[]).forEach(x=>g.add({position:deg(x[8],x[9],0),point:{pixelSize:11,color:col(x[2]==='Red'?'--sev-red':'--warn'),outlineColor:col('--panel'),outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(GD[x[0]]||x[0])} · ${esc(x[2])} alert</b>${esc(x[1])}<br>${esc(x[5]).slice(0,160)}<br><span style="opacity:.75">GDACS</span>`}));
}
function polys(f){const g=f.geometry;const rings=g.type==='Polygon'?[g.coordinates]:g.coordinates;return rings.map(r=>new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(r[0].flat()),r.slice(1).map(h=>new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(h.flat())))))}
// signals (SIG): volcanoes, GPS cells, ground stations, fireballs at their real burst altitude
function buildSig(){const Z=window.SIG||{};const v=clear('volc');(Z.volcano?.items||[]).filter(x=>x[5]!=null).forEach(x=>v.add({position:deg(x[5],x[6],0),point:{pixelSize:10,color:col('--l-volc'),outlineColor:col('--ink'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(x[0])}, ${esc(x[1])}</b>${esc(x[3])} · ${esc(x[2])}<br>${esc(x[4]).slice(0,200)}…<br><span style="opacity:.75">Smithsonian / USGS Weekly Volcanic Activity Report</span>`}));
 const gp=clear('gps');(Z.gpsjam?.cells||[]).forEach(c=>{let lon,lat,pct,n;if(typeof c==='string'){if(!window.h3)return;const [hex,g,b]=c.split(':');n=+g+ +b;pct=Math.round(+b/n*100);[lat,lon]=window.h3.cellToLatLng(hex)}else{[lon,lat,pct,n]=c}
  gp.add({rectangle:{coordinates:rect(lon,lat,.55),material:col('--l-gps',Math.min(.9,.35+pct/100)),classificationType:C.ClassificationType.TERRAIN},description:`<b>${pct}% of aircraft reported bad GPS</b>${n} aircraft seen in this cell on ${esc(Z.gpsjam.date)}<br><span style="opacity:.75">GPSJAM</span>`})});
 const gs=clear('gs');(Z.satnogs?.stations||[]).forEach(p=>gs.add({position:deg(p[0],p[1],0),point:{pixelSize:4,color:col('--l-sat',.9),disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>SatNOGS ground station</b>A volunteer antenna receiving satellites<br><span style="opacity:.75">SatNOGS Network</span>`}));
 const fb=clear('fb');(Z.fireballs||[]).filter(x=>x[2]!=null).forEach(x=>{const h=(x[5]||30)*1000;fb.add({position:deg(x[3],x[2],h),point:{pixelSize:Math.max(6,Math.sqrt(x[1])*3),color:col('--l-volc'),outlineColor:col('--ink'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},polyline:{positions:[deg(x[3],x[2],0),deg(x[3],x[2],h)],width:1,material:col('--l-volc',.5)},description:`<b>Fireball · ${x[1]} kt of energy</b>${esc(x[0])} UTC${x[4]?' · '+x[4]+' km/s':''}${x[5]?' · burst at '+x[5]+' km altitude (drawn at that height)':' · altitude unknown, drawn at 30 km'}<br><span style="opacity:.75">NASA JPL Fireball database</span>`})});
}
// nature (NAT)
const NGROUPS=[['birds','--n-bird'],['butterflies','--n-bfly'],['whales','--n-whale'],['mammals','--n-mammal'],['amphibians','--n-amph'],['plants','--n-plant']];
function buildNat(){const N=window.NAT||{};
 NGROUPS.forEach(([id,color])=>{const g=(N.sightings?.groups||[]).find(x=>x.id===id);const e=clear('nat-'+id);if(!g)return;const cells=parseCells(g.cells);const mx=Math.max(1,...cells.map(d=>d.n));
  cells.forEach(d=>e.add({rectangle:{coordinates:rect(d.lon,d.lat,.95),material:col(color,.25+.65*Math.sqrt(d.n/mx)),classificationType:C.ClassificationType.TERRAIN},description:`<b>${fmtN(d.n)} ${esc(g.name.toLowerCase())} sightings</b>in this 2° cell, in a sample of ${fmtN(g.sampled)} of ${fmtN(g.total)} research-grade observations this week<br><span style="opacity:.75">iNaturalist · counts follow where people look</span>`}))});
 const th=clear('nat-threat');parseCells(N.threatened?.cells).forEach(d=>th.add({rectangle:{coordinates:rect(d.lon,d.lat,.95),material:col('--n-threat',Math.min(.8,.25+d.n/25)),classificationType:C.ClassificationType.TERRAIN},description:`<b>${fmtN(d.n)} sightings of threatened species</b>in this 2° cell this week · exact locations are blurred<br><span style="opacity:.75">iNaturalist</span>`}));
 const eb=clear('nat-ebird');parseCells(N.ebird?.cells).forEach(d=>eb.add({rectangle:{coordinates:rect(d.lon,d.lat,.95),material:col('--n-bird',Math.min(.8,.3+d.n/10)),classificationType:C.ClassificationType.TERRAIN},description:`<b>${fmtN(d.n)} notable bird reports</b>in this 2° cell, past 7 days<br><span style="opacity:.75">eBird (Cornell Lab)</span>`}));
 const mg=clear('nat-mig');(N.migration||[]).forEach(m=>{const pts=m.months.filter(x=>x[1]!=null);if(pts.length<2)return;const last=pts[pts.length-1];
  mg.add({polyline:{positions:C.Cartesian3.fromDegreesArrayHeights(pts.flatMap(p=>[p[1],p[2],20000])),width:2.5,material:new C.PolylineGlowMaterialProperty({glowPower:.25,color:col('--n-mig')}),arcType:C.ArcType.GEODESIC},description:`<b>${esc(m.name)}: where sightings centred, month by month</b>${pts[0][0]} → ${last[0]}<br><span style="opacity:.75">iNaturalist · a seasonal centre of attention, not a tracked animal</span>`});
  mg.add({position:deg(last[1],last[2],20000),point:{pixelSize:8,color:col('--n-mig'),outlineColor:col('--panel'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{text:m.name,font:'600 12px Public Sans, sans-serif',fillColor:col('--ink'),outlineColor:col('--ocean'),outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(10,0),horizontalOrigin:C.HorizontalOrigin.LEFT,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(m.name)}</b>Median position of ${fmtN(last[3])} sightings in ${last[0]}<br><span style="opacity:.75">iNaturalist</span>`})});
}
// economy choropleth: reuse the colors the 2D layer computed
function buildEcon(){const e=clear('econ');document.querySelectorAll('#g-econ path').forEach(p=>{const f=d3.select(p).datum();const fill=p.getAttribute('fill');if(!f||!fill||fill.startsWith('var('))return;polys(f).forEach(h=>e.add({polygon:{hierarchy:h,material:col(fill,.75),classificationType:C.ClassificationType.TERRAIN},description:`<b>${esc(f.properties.name)}</b>${esc(p.querySelector('title')?.textContent||'')}<br><span style="opacity:.75">World Bank</span>`}))})}
// invisible country shapes for clicking
const cty=new C.CustomDataSource('cty');viewer.dataSources.add(cty);
O.countries.forEach(f=>polys(f).forEach(h=>cty.entities.add({polygon:{hierarchy:h,material:C.Color.WHITE.withAlpha(0.004),classificationType:C.ClassificationType.TERRAIN},properties:{country:f.properties.name}})));

// ----- see-through Earth (earthquake depth) -----
let xray=false;const DEPTH_X=25;
function setXray(v){xray=v;globe.translucency.enabled=v;globe.translucency.frontFaceAlpha=v?.55:1;globe.translucency.backFaceAlpha=v?.1:1;buildSnap();document.getElementById('xrayBtn')?.setAttribute('aria-pressed',v)}

// ----- tooltips, clicks -----
const tip=document.getElementById('tip');const handler=new C.ScreenSpaceEventHandler(scene.canvas);
handler.setInputAction(m=>{const p=scene.pick(m.endPosition);const ent=p&&p.id;const d=ent&&ent.description&&(ent.description.getValue?ent.description.getValue(viewer.clock.currentTime):ent.description);
 if(d&&tip){tip.innerHTML=d;tip.hidden=false;const r=el.getBoundingClientRect();tip.style.left=Math.min(m.endPosition.x+14,r.width-270)+'px';tip.style.top=(m.endPosition.y+14)+'px';tip.style.position='absolute';if(tip.parentElement!==host)host.appendChild(tip)}
 else if(tip&&!tip.hidden&&tip.parentElement===host)tip.hidden=true;
 scene.canvas.style.cursor=p&&p.id&&p.id.properties?.country?'pointer':'default'},C.ScreenSpaceEventType.MOUSE_MOVE);
handler.setInputAction(m=>{const picked=scene.drillPick(m.position,6);const c=picked.find(p=>p.id&&p.id.properties&&p.id.properties.country);if(c){const name=c.id.properties.country.getValue();const f=O.countries.find(x=>x.properties.name===name);if(f&&O.openCountry)O.openCountry(f)}},C.ScreenSpaceEventType.LEFT_CLICK);

// ----- spin, fly-to, mode switch -----
let spin=!matchMedia('(prefers-reduced-motion: reduce)').matches,idle=true;
viewer.clock.onTick.addEventListener(()=>{if(spin&&idle&&active)viewer.scene.camera.rotate(C.Cartesian3.UNIT_Z,-0.0006)});
['pointerdown','wheel','touchstart'].forEach(ev=>el.addEventListener(ev,()=>{spin=false;O.setSpin&&O.setSpin(false)},{passive:true}));
const origFly=O.flyTo,origSpin=O.setSpin;
O.flyTo=(lon,lat)=>{if(active){spin=false;viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(lon,lat,1.6e7),duration:1.6})}else origFly(lon,lat)};
O.setSpin=v=>{spin=v;origSpin(v)};
// zoom buttons drive the 3D camera while it is active
const zc=document.getElementById('zoomctl')||document.querySelector('.zoomctl');if(zc){host.appendChild(zc);zc.style.zIndex=4;
 const Z={zin:()=>viewer.camera.zoomIn(viewer.camera.positionCartographic.height*.4),zout:()=>viewer.camera.zoomOut(viewer.camera.positionCartographic.height*.6),zreset:()=>{spin=true;viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(-75,25,2.3e7),duration:1.2})},zspin:()=>{spin=!spin;origSpin(spin)}};
 Object.entries(Z).forEach(([id,fn])=>{const b=document.getElementById(id);if(b)b.addEventListener('click',e=>{if(!active)return;e.stopImmediatePropagation();fn()},true)})}
let active=true;
function setActive(v){active=v;el.style.display=v?'block':'none';if(mapbox)mapbox.style.visibility=v?'hidden':'visible';if(!v&&origSpin)origSpin(spin);document.querySelectorAll('#viewseg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===(v?'3d':O.mode())));if(v)viewer.resize();const zs=document.getElementById('zspin');if(zs)zs.hidden=false}
const seg=document.getElementById('viewseg');
if(seg){const b=document.createElement('button');b.dataset.mode='3d';b.textContent='3D';b.setAttribute('aria-pressed','true');b.onclick=()=>setActive(true);seg.insertBefore(b,seg.firstChild);
 seg.querySelectorAll('button:not([data-mode="3d"])').forEach(x=>x.addEventListener('click',()=>setActive(false)))}
// imagery + see-through controls in the rail
const rail=document.getElementById('ops-rail');
if(rail){const d=document.createElement('div');d.className='rail-group';d.innerHTML=`<span class="gl">Imagery</span><div class="seg" id="imgSeg" role="group" aria-label="Imagery">${Object.entries(IMAGERY).filter(([k,v])=>!v.needsToken||window.OBS_ION_TOKEN).map(([k,v])=>`<button data-k="${k}" aria-pressed="${k===imageryChoice}" title="${esc(v.name)}">${k==='bluemarble'?'NASA':k==='daily'?'Yesterday':k==='bing'?'Bing':'Basic'}</button>`).join('')}</div><p class="theme-note" id="imgNote"></p><button class="chip" id="xrayBtn" aria-pressed="false" style="width:100%"><span>See-through Earth: quake depths ×${DEPTH_X}</span></button>`;
 const mapGroup=[...rail.querySelectorAll('.rail-group')].find(g=>g.querySelector('.gl')?.textContent==='Map');rail.insertBefore(d,mapGroup?mapGroup.nextSibling:rail.children[1]);
 d.querySelectorAll('#imgSeg button').forEach(b=>b.onclick=()=>setImagery(b.dataset.k));document.getElementById('xrayBtn').onclick=()=>setXray(!xray);
 const foot=rail.querySelector('.rail-foot');if(foot)foot.appendChild(credits)}

// ----- wire live rebuilds -----
const wrap=(fn,after)=>{const f=O[fn];if(!f)return;O[fn]=function(){const r=f.apply(this,arguments);try{after()}catch(e){}return r}};
wrap('setSnap',buildSnap);wrap('setQuakes',buildSnap);wrap('buildSitLayers',buildSit);wrap('buildSigLayers',buildSig);wrap('buildNatureLayers',buildNat);wrap('buildEconLayer',buildEcon);
buildSnap();buildSit();buildSig();buildNat();buildEcon();
setActive(true);
// If the globe surface never appears (a sandbox blocking tiles or workers), fall back to the 2D map and say so.
let gaveUp=false;
function giveUp(why){if(gaveUp)return;gaveUp=true;setActive(false);const b=seg&&seg.querySelector('button[data-mode="3d"]');if(b){b.disabled=true;b.title=why}note(why);console.warn('3D globe disabled: '+why)}
window.addEventListener('securitypolicyviolation',e=>{if(/cesium|gibs|jsdelivr/i.test(e.blockedURI||'')&&/worker|img|connect/.test(e.violatedDirective||''))giveUp('The 3D globe can\u2019t load here (this preview blocks map tiles and background workers). It works on the public site.')});
const probe=setInterval(()=>{try{const n=(globe._surface&&globe._surface._tilesToRender||[]).length;if(n>0){clearInterval(probe);return}}catch(e){}},1000);
setTimeout(()=>{try{const n=(globe._surface&&globe._surface._tilesToRender||[]).length;if(!n)giveUp('The 3D globe could not start here (no map tiles arrived). It works on the public site; showing the 2D globe instead.')}catch(e){}},12000);
new MutationObserver(()=>{buildSnap();buildSit();buildSig();buildNat();buildEcon()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
window.__obs3d={viewer,setImagery,setXray,DS};
})();
