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
// NASA GIBS in the standard web-map grid (EPSG:3857, 256 px tiles, levels double cleanly). The degree-based EPSG:4326
// grid does not double per level, which produced missing and misplaced tiles.
const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
const merc=new C.WebMercatorTilingScheme();
const gibs=(layer,level,ext,time)=>new C.UrlTemplateImageryProvider({url:GIBS+layer+'/default/'+(time?time+'/':'')+'GoogleMapsCompatible_Level'+level+'/{z}/{y}/{x}.'+ext,tilingScheme:merc,maximumLevel:level,credit:new C.Credit('Imagery: NASA GIBS',false)});
// Cloud-free 10 m detail for close zoom: EOX Sentinel-2 cloudless 2016 (CC BY 4.0, free with this attribution).
const EOX_CREDIT='<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless</a> by <a href="https://eox.at" target="_blank" rel="noopener">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016 &amp; 2017), CC BY 4.0';
const eox=()=>new C.UrlTemplateImageryProvider({url:'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',tilingScheme:new C.WebMercatorTilingScheme(),maximumLevel:14,credit:new C.Credit(EOX_CREDIT,false)});
const IMAGERY={
 bluemarble:{name:'Clear sky: NASA Blue Marble, sharpening to Sentinel-2 (10 m) as you zoom in',label:'Clear',make:()=>gibs('BlueMarble_ShadedRelief_Bathymetry',8,'jpeg'),detail:true},
 daily:{name:'Yesterday’s satellite view (NASA VIIRS, 250 m, with that day’s clouds)',label:'Yesterday',make:()=>gibs('VIIRS_SNPP_CorrectedReflectance_TrueColor',9,'jpg',yesterday())},
 bing:{name:'Bing aerial (Cesium ion)',make:()=>C.IonImageryProvider.fromAssetId(2),needsToken:true},
 basic:{name:'Basic (offline)',make:()=>C.TileMapServiceImageryProvider.fromUrl(C.buildModuleUrl('Assets/Textures/NaturalEarthII'))},
};
let imageryChoice='bluemarble';try{imageryChoice=localStorage.getItem('obs-imagery2')||imageryChoice}catch(e){}
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
const sscc=scene.screenSpaceCameraController;
sscc.minimumZoomDistance=2500;sscc.maximumZoomDistance=6e7;
// Trackpads: Chrome/Firefox send pinch as ctrl+wheel, Safari as gesture events. Both zoom the globe, never the page.
sscc.zoomEventTypes=[C.CameraEventType.WHEEL,C.CameraEventType.PINCH,C.CameraEventType.RIGHT_DRAG,{eventType:C.CameraEventType.WHEEL,modifier:C.KeyboardEventModifier.CTRL}];
el.addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault()},{passive:false});
let gScale=1;
el.addEventListener('gesturestart',e=>{e.preventDefault();gScale=1},{passive:false});
el.addEventListener('gesturechange',e=>{e.preventDefault();const f=e.scale/gScale;gScale=e.scale;if(!isFinite(f)||f<=0)return;const h=viewer.camera.positionCartographic.height;
 if(f>1)viewer.camera.zoomIn(Math.min(h*(1-1/f)*1.5,h*.6));else viewer.camera.zoomOut(Math.min(h*(1/f-1)*1.5,h))},{passive:false});
el.addEventListener('gestureend',e=>e.preventDefault(),{passive:false});
viewer.camera.setView({destination:C.Cartesian3.fromDegrees(-75,25,2.3e7)});

let baseLayer=null,nightLayer=null,detailLayer=null;
// Detail layer fades in below ~4,000 km and is fully on below ~1,200 km; above that it is not requested at all.
function syncDetail(){if(!detailLayer)return;const h=viewer.camera.positionCartographic.height;detailLayer.show=h<4.2e6;detailLayer.alpha=Math.max(0,Math.min(1,(4.2e6-h)/3e6))}
viewer.camera.percentageChanged=0.02;viewer.camera.changed.addEventListener(()=>{syncDetail();syncBands()});
function setDetail(on){if(on&&!detailLayer&&!window.OBS_OFFLINE_IMAGERY){try{detailLayer=new C.ImageryLayer(eox(),{show:false});viewer.imageryLayers.add(detailLayer,1)}catch(e){}}
 if(!on&&detailLayer){viewer.imageryLayers.remove(detailLayer,true);detailLayer=null}syncDetail()}
// The night side keeps a dim base plus NASA's "Earth at Night" city lights, like a real view from orbit.
async function addNightLights(){if(nightLayer||window.OBS_OFFLINE_IMAGERY)return;try{const p=gibs('VIIRS_CityLights_2012',8,'jpeg');nightLayer=new C.ImageryLayer(p,{dayAlpha:0,nightAlpha:1});nightLayer.show=globe.enableLighting;viewer.imageryLayers.add(nightLayer)}catch(e){}}
async function setImagery(k,auto){const def=IMAGERY[k]||IMAGERY.bluemarble;
 try{const p=await def.make();const layer=new C.ImageryLayer(p,{nightAlpha:k==='basic'?1:.55});
  // Fall back to the offline map only if the source is really down (many errors, nothing loaded), and don't remember that.
  let bad=0,good=0;p.errorEvent.addEventListener(()=>{bad++;if(k!=='basic'&&!layer.__failed&&bad>=25&&good===0){layer.__failed=true;note(def.label+' imagery did not load; showing the offline map for now. Choose it again to retry.');setImagery('basic',true)}});
  const origReq=p.requestImage.bind(p);p.requestImage=function(){const r=origReq.apply(p,arguments);if(r&&r.then)r.then(x=>{if(x)good++},()=>{});return r};
  if(baseLayer)viewer.imageryLayers.remove(baseLayer,true);baseLayer=layer;viewer.imageryLayers.add(layer,0);setDetail(!!def.detail);addNightLights();if(nightLayer)viewer.imageryLayers.raiseToTop(nightLayer);
  imageryChoice=k;if(!auto){note('');try{localStorage.setItem('obs-imagery2',k)}catch(e){}}
  document.querySelectorAll('#imgSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===k));
 }catch(e){if(k!=='basic')setImagery('basic',true)}}
setImagery(imageryChoice);
function note(t){const n=document.getElementById('imgNote');if(n)n.textContent=t}

// ----- layers: one data source per chip id, synced with the chip's pressed state -----
const DS={};
function ds(id){if(!DS[id]){const d=new C.CustomDataSource(id);viewer.dataSources.add(d);const chip=document.getElementById('chip-'+id);d.show=!chip||chip.getAttribute('aria-pressed')==='true';DS[id]=d}return DS[id]}
// Switches live in the rail (moved there by ops.js), so listen page-wide, not just in the old layer bar.
new MutationObserver(ms=>ms.forEach(m=>{if(!/^chip-/.test(m.target.id||''))return;const id=m.target.id.replace(/^chip-/,'');if(DS[id])DS[id].show=m.target.getAttribute('aria-pressed')==='true';if(/^(sat|sat-.+|deb-.+)$/.test(id)&&typeof syncSatVis==='function')syncSatVis()})).observe(document.body,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
const BANDS={};let nearNow=null;const NEAR=2.5e6;
const clear=id=>{const d=ds(id);d.entities.removeAll();BANDS[id]=[];return d.entities};
// Area layers: shaded cells when zoomed out; below ~2,500 km they turn into sized markers so the ground stays visible.
function cell(id,lon,lat,half,color,alpha,frac,description){const e=ds(id).entities;const isNear=viewer.camera.positionCartographic.height<NEAR;
 const far=e.add({rectangle:{coordinates:rect(lon,lat,half),material:col(color,alpha),classificationType:C.ClassificationType.TERRAIN},description,show:!isNear});
 const near=e.add({position:deg(lon,lat,0),point:{pixelSize:5+9*Math.sqrt(Math.max(0,Math.min(1,frac))),color:col(color,.85),outlineColor:col('--panel',.9),outlineWidth:1,disableDepthTestDistance:Number.POSITIVE_INFINITY},description,show:isNear});
 (BANDS[id]=BANDS[id]||[]).push([far,near])}
function syncBands(){const isNear=viewer.camera.positionCartographic.height<NEAR;if(isNear===nearNow)return;nearNow=isNear;Object.values(BANDS).forEach(a=>a.forEach(([f,n])=>{f.show=!isNear;n.show=isNear}))}
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
 fires.forEach(d=>cell('fire',d.lon,d.lat,2.4,'--l-fire',fOp(d.n)*.8,d.n/fMax,`<b>${fmtN(d.n)} fire detections</b>in this 5° cell in 24 h<br>VIIRS satellite heat signatures; most are farm and land-clearing burns`));
 // aircraft density: 10° cells floating at cruise height
 const a=clear('air');const air=S.air?.cells?parseCells(S.air.cells):[];const aMax=Math.max(1,...air.map(d=>d.n));
 air.forEach(d=>a.add({rectangle:{coordinates:rect(d.lon,d.lat,4.8),height:10500,extrudedHeight:11000,material:col('--l-air',.1+.7*Math.sqrt(d.n/aMax)),outline:true,outlineColor:col('--l-air',.4)},description:`<b>${fmtN(d.n)} aircraft airborne</b>in this 10° cell at the last update, drawn at cruise height<br>Seen by OpenSky volunteer receivers`}));
 // storms & wildfires, severe alerts
 const e=clear('event');O.events().forEach(d=>e.add({position:deg(d.lon,d.lat,0),point:{pixelSize:9,color:col('--l-event'),outlineColor:col('--panel'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(d.title)}</b>${esc(d.cat)} · NASA EONET`}));
 const al=clear('alert');O.alerts().forEach(d=>al.add({position:deg(d.lon,d.lat,0),point:{pixelSize:8,color:col('--l-alert'),outlineColor:col('--panel'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(d.ev)}</b>${esc(d.area)}<br>National Weather Service · pin at approximate area center`}));
 
}
// ----- satellites: the public catalog (every active satellite + major debris clouds), propagated off the main thread -----
// Elements: CelesTrak (data/orbits.json, refreshed every 6 h). Positions: SGP4 (satellite.js) in a Web Worker every 2 s,
// interpolated every frame. TLE positions are good to roughly a few km, drifting a few km per day after the element epoch.
const SAT_CATS={
 station:{name:'Crewed space station',color:'#ffd166',size:9,chip:'sat'},
 science:{name:'Space telescope / science',color:'#f4f1de',size:6,chip:'sat'},
 nav:{name:'Navigation (GPS, Galileo, GLONASS, BeiDou…)',color:'#f6bd60',size:5,chip:'sat-nav',chipName:'Navigation (GPS…)',on:true},
 broadband:{name:'Broadband constellation (Starlink, OneWeb, Kuiper…)',color:'#4cc9f0',size:2.5,chip:'sat-broadband',chipName:'Starlink & broadband',on:true},
 earth:{name:'Weather / Earth observation',color:'#80ed99',size:4,chip:'sat-earth',chipName:'Weather & Earth obs.',on:true},
 geo:{name:'Geostationary',color:'#c77dff',size:4,chip:'sat-geo',chipName:'Geostationary',on:true},
 other:{name:'Other active satellite',color:'#cfd8e3',size:3,chip:'sat-other',chipName:'Other satellites',on:true},
 'deb-fy':{name:'Debris from China’s 2007 anti-satellite test (Fengyun-1C)',color:'#ff6b6b',size:2,chip:'deb-fy',chipName:'Debris: 2007 China test',on:false},
 'deb-coll':{name:'Debris from the 2009 Iridium 33 – Cosmos 2251 collision',color:'#ff9f43',size:2,chip:'deb-coll',chipName:'Debris: 2009 collision',on:false},
 'deb-asat':{name:'Debris from Russia’s 2021 anti-satellite test (Cosmos 1408)',color:'#f15bb5',size:2,chip:'deb-asat',chipName:'Debris: 2021 Russia test',on:false},
 debris:{name:'Debris (from a major break-up)',color:'#e5e5e5',size:2,chip:'deb-other',chipName:'Debris: other',on:false},
};
function satCat(name,l2,kind){const n=name.toUpperCase();if(kind==='d')return /FENGYUN 1C/.test(n)?'deb-fy':/IRIDIUM 33|COSMOS 2251/.test(n)?'deb-coll':/COSMOS 1408/.test(n)?'deb-asat':'debris';
 if(/^ISS \(|^CSS \(|TIANHE|TIANGONG|^ISS$/.test(n))return 'station';
 if(/^HST$|HUBBLE|CHANDRA|SWIFT|FERMI|TESS|NUSTAR|XMM|INTEGRAL|IXPE|NEOWISE/.test(n))return 'science';
 if(/STARLINK|ONEWEB|KUIPER|QIANFAN|GUOWANG|SPACESAIL/.test(n))return 'broadband';
 if(/NAVSTAR|GPS |GLONASS|GALILEO|BEIDOU|QZS|IRNSS|NVS-/.test(n))return 'nav';
 if(/NOAA|GOES|METEOSAT|METOP|HIMAWARI|FENGYUN|FY-|SENTINEL|LANDSAT|TERRA|AQUA|SUOMI|JPSS|DMSP|ELEKTRO|GOSAT|WORLDVIEW|FLOCK|SKYSAT|GCOM|CBERS|RESURS|SMAP|ICESAT|GRACE|CRYOSAT|SWOT|JASON/.test(n))return 'earth';
 const mm=parseFloat(String(l2).slice(52,63));return mm>0.95&&mm<1.05?'geo':'other'}
// one switch per kind of satellite and per debris cloud (the 'sat' chip for stations & telescopes comes from the page)
Object.values(SAT_CATS).forEach(c=>document.documentElement.style.setProperty('--c-'+c.chip,c.color));
Object.values(SAT_CATS).filter(c=>c.chip!=='sat').forEach(c=>{O.addLayer({id:c.chip,name:c.chipName,color:'--c-'+c.chip,shape:'circle',count:'3D only',on:c.on,group:'Space'});
 const b=document.getElementById('chip-'+c.chip);if(b){b.title=c.name;if(c.chip==='deb-other')b.hidden=true}});
const SAT={list:[],pts:[],labels:[],snaps:[],busy:false,worker:null,step:2000,sel:-1,ready:false,asOf:null};
const satPts=scene.primitives.add(new C.PointPrimitiveCollection());
const satLbl=scene.primitives.add(new C.LabelCollection());
const satPath=new C.CustomDataSource('satpath');viewer.dataSources.add(satPath);
const chipOn=id=>{const c=document.getElementById('chip-'+id);return !c||c.getAttribute('aria-pressed')==='true'};
function syncSatVis(){const v={};Object.values(SAT_CATS).forEach(c=>{v[c.chip]=chipOn(c.chip)});
 SAT.list.forEach((s,i)=>{const on=v[SAT_CATS[s.cat].chip];const p=SAT.pts[i];if(p)p.show=on&&p.__ok;const l=SAT.labels[i];if(l)l.show=on&&p.__ok})}
const nowMs=()=>C.JulianDate.toDate(viewer.clock.currentTime).getTime();
function propAll(t){const d=new Date(t),g=satellite.gstime(d),o=new Float64Array(SAT.list.length*3);
 SAT.list.forEach((s,i)=>{let p=null;try{const pv=satellite.propagate(s.rec||(s.rec=satellite.twoline2satrec(s.l1,s.l2)),d);p=pv&&pv.position}catch(e){}
  if(p&&isFinite(p.x)){const f=satellite.eciToEcf(p,g);o[i*3]=f.x*1e3;o[i*3+1]=f.y*1e3;o[i*3+2]=f.z*1e3}else o[i*3]=NaN});return o}
function makeWorker(){const lib=document.querySelector('script[src*="satellite"]');if(!lib||!window.Worker||!window.Blob)return null;
 const url=new URL(lib.getAttribute('src'),location.href).href;
 const code=`importScripts(${JSON.stringify(url)});let R=[];onmessage=e=>{const m=e.data;if(m.init){R=m.init.map(t=>{try{return satellite.twoline2satrec(t[0],t[1])}catch(x){return null}});return}
const d=new Date(m.t),g=satellite.gstime(d),o=new Float64Array(R.length*3);for(let i=0;i<R.length;i++){const r=R[i];let p=null;if(r){try{const pv=satellite.propagate(r,d);p=pv&&pv.position}catch(x){}}
if(p&&isFinite(p.x)){const f=satellite.eciToEcf(p,g);o[i*3]=f.x*1e3;o[i*3+1]=f.y*1e3;o[i*3+2]=f.z*1e3}else o[i*3]=NaN}postMessage({t:m.t,pos:o},[o.buffer])}`;
 try{const w=new Worker(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));w.onmessage=e=>onSnap(e.data);w.onerror=()=>{SAT.worker=null;SAT.busy=false};return w}catch(e){return null}}
function onSnap(m){SAT.busy=false;SAT.snaps.push(m);SAT.snaps.sort((a,b)=>a.t-b.t);while(SAT.snaps.length>3)SAT.snaps.shift()}
function request(t){if(SAT.busy)return;SAT.busy=true;if(SAT.worker)SAT.worker.postMessage({t});else setTimeout(()=>onSnap({t,pos:propAll(t)}),0)}
async function loadCatalog(){let src=null;
 try{const r=await fetch('data/orbits.json?h='+Math.floor(Date.now()/36e5));if(r.ok)src=await r.json()}catch(e){}
 let list;
 if(src&&src.sats&&src.sats.length)list=src.sats.map(([name,kind,l1,l2])=>({name,kind,l1,l2}));
 else{const S=window.SNAP||{};const rn={ISS:'ISS (ZARYA)',Tiangong:'CSS (TIANHE)',Hubble:'HST'};
  list=[...(S.tle||[]).map(([n,l1,l2])=>({name:rn[n]||n,kind:'a',l1,l2})),...(S.tleGroups||[]).flatMap(g=>g.sats.map(([name,l1,l2])=>({name,kind:'a',l1,l2})))]}
 const seen=new Set();list=list.filter(s=>{const id=parseInt(String(s.l1).slice(2,7));if(!id||seen.has(id))return false;seen.add(id);s.id=id;s.cat=satCat(s.name,s.l2,s.kind);return true});
 SAT.asOf=src&&src.asOf||null;SAT.fromCatalog=!!src;return list}
async function startSats(){if(!window.satellite)return;const list=await loadCatalog();if(!list.length)return;
 satPts.removeAll();satLbl.removeAll();SAT.list=list;SAT.snaps=[];SAT.busy=false;SAT.pts=[];SAT.labels=[];
 const lblFont='600 12px Public Sans, sans-serif';
 list.forEach((s,i)=>{const c=SAT_CATS[s.cat];const p=satPts.add({position:C.Cartesian3.ZERO,pixelSize:c.size,color:C.Color.fromCssColorString(c.color).withAlpha(s.cat==='broadband'||/deb/.test(s.cat)?.75:.95),
   outlineColor:C.Color.BLACK.withAlpha(.5),outlineWidth:c.size>=5?1:0,scaleByDistance:new C.NearFarScalar(1.5e6,1.8,4e7,.7),id:{sat:i},show:false});p.__ok=false;SAT.pts.push(p);
  if(/^(ISS \(ZARYA\)|CSS \(TIANHE\)|HST)$/.test(s.name)){const short=s.name.replace(/^ISS \(ZARYA\)$/,'ISS').replace(/^CSS \(TIANHE\)$/,'Tiangong').replace(/^HST$/,'Hubble');
   SAT.labels[i]=satLbl.add({text:short,font:lblFont,fillColor:C.Color.WHITE,outlineColor:C.Color.BLACK,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(10,0),horizontalOrigin:C.HorizontalOrigin.LEFT,show:false})}});
 if(SAT.worker)SAT.worker.terminate();SAT.worker=makeWorker();if(SAT.worker)SAT.worker.postMessage({init:list.map(s=>[s.l1,s.l2])});
 SAT.ready=true;
 const counts={};Object.values(SAT_CATS).forEach(c=>{counts[c.chip]=0});list.forEach(s=>{counts[SAT_CATS[s.cat].chip]++});
 const ct=(id,t)=>{const c=document.querySelector('#chip-'+id+' .ct');if(c)c.textContent=t};
 Object.entries(counts).forEach(([id,n])=>{if(id==='sat')ct(id,n+' live');else if(/^deb-/.test(id)&&!SAT.fromCatalog)ct(id,'after next collection');else ct(id,fmtN(n))});
 const ob=document.getElementById('chip-deb-other');if(ob)ob.hidden=!counts['deb-other'];syncSatVis()}
const scr=new C.Cartesian3();
scene.preUpdate.addEventListener(()=>{if(!SAT.ready)return;const t=nowMs();let s=SAT.snaps;const last=s[s.length-1];
 if(last&&last.t<t-SAT.step*2){SAT.snaps=s=[];}
 const tail=s[s.length-1];if(!tail)request(Math.floor(t/SAT.step)*SAT.step);else if(tail.t<t+SAT.step)request(tail.t+SAT.step);
 let a=null,b=null;for(let i=0;i<s.length-1;i++)if(s[i].t<=t&&s[i+1].t>=t){a=s[i];b=s[i+1];break}
 if(!a){if(s.length===1){a=b=s[0]}else return}
 const f=b.t>a.t?(t-a.t)/(b.t-a.t):0,A=a.pos,B=b.pos,n=SAT.pts.length;let changed=false;
 // Far out, a LEO satellite moves well under a pixel per frame: refresh the whole set ~5x/s there, every frame up close.
 const h=viewer.camera.positionCartographic.height,every=h>8e6?200:h>1.5e6?66:0,full=t-(SAT.lastFull||0)>=every||t<(SAT.lastFull||0);
 if(full)SAT.lastFull=t;
 for(let i=full?0:Math.max(0,SAT.sel),end=full?n:(SAT.sel>=0?SAT.sel+1:0);i<end;i++){const p=SAT.pts[i],k=i*3;if(isNaN(A[k])||isNaN(B[k])){if(p.__ok){p.__ok=false;p.show=false;changed=true}continue}
  scr.x=A[k]+(B[k]-A[k])*f;scr.y=A[k+1]+(B[k+1]-A[k+1])*f;scr.z=A[k+2]+(B[k+2]-A[k+2])*f;p.position=scr;
  if(!p.__ok){p.__ok=true;changed=true}const l=SAT.labels[i];if(l)l.position=scr}
 if(changed)syncSatVis();
 if(SAT.sel>=0&&SAT.follow)SAT.followPos=C.Cartesian3.clone(SAT.pts[SAT.sel].position,SAT.followPos)});
// selection: orbit ring, ground track, live facts
const card=document.createElement('div');card.id='satCard';card.className='sat-card';card.hidden=true;host.appendChild(card);
function satFacts(s){const rec=s.rec||(s.rec=satellite.twoline2satrec(s.l1,s.l2));const d=new Date(nowMs());const pv=satellite.propagate(rec,d);if(!pv||!pv.position)return null;
 const gd=satellite.eciToGeodetic(pv.position,satellite.gstime(d));const v=pv.velocity;const spd=Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z);
 const a=Math.cbrt(398600.4418/Math.pow(rec.no/60,2));const per=a*(1-rec.ecco)-6378.137,apo=a*(1+rec.ecco)-6378.137;
 const ep=(Date.now()-(rec.jdsatepoch-2440587.5)*864e5)/36e5;
 return {alt:gd.height,lat:satellite.degreesLat(gd.latitude),lon:satellite.degreesLong(gd.longitude),spd,inc:rec.inclo*180/Math.PI,period:2*Math.PI/rec.no,per,apo,ep}}
function drawOrbit(i){satPath.entities.removeAll();const s=SAT.list[i];if(!s)return;const rec=s.rec||(s.rec=satellite.twoline2satrec(s.l1,s.l2));
 const t0=nowMs(),g0=satellite.gstime(new Date(t0)),per=2*Math.PI/rec.no*6e4,N=Math.min(720,Math.max(180,Math.round(per/6e4*2)));const ring=[],track=[];
 for(let k=0;k<=N;k++){const d=new Date(t0+k/N*per);const pv=satellite.propagate(rec,d);if(!pv||!pv.position)continue;
  const f=satellite.eciToEcf(pv.position,g0);ring.push(new C.Cartesian3(f.x*1e3,f.y*1e3,f.z*1e3));
  const gd=satellite.eciToGeodetic(pv.position,satellite.gstime(d));track.push(C.Cartesian3.fromRadians(gd.longitude,gd.latitude,0))}
 const c=C.Color.fromCssColorString(SAT_CATS[s.cat].color);
 satPath.entities.add({polyline:{positions:ring,width:2,material:new C.PolylineGlowMaterialProperty({glowPower:.18,color:c.withAlpha(.9)}),arcType:C.ArcType.NONE}});
 if(per<6*36e5)satPath.entities.add({polyline:{positions:track,width:1.5,clampToGround:true,material:new C.PolylineDashMaterialProperty({color:c.withAlpha(.8),dashLength:12})}})}
function renderCard(){const i=SAT.sel,s=SAT.list[i];if(!s){card.hidden=true;return}const f=satFacts(s);if(!f)return;const cat=SAT_CATS[s.cat];
 card.innerHTML=`<div class="sc-h"><b>${esc(s.name)}</b><button class="sc-x" aria-label="Close">×</button></div>
 <div class="sc-cat"><span class="dot" style="background:${cat.color}"></span>${esc(cat.name)} · NORAD ${s.id}</div>
 <div class="sc-row"><span>Altitude</span><b>${fmtN(Math.round(f.alt))} km</b></div>
 <div class="sc-row"><span>Speed</span><b>${f.spd.toFixed(2)} km/s</b></div>
 <div class="sc-row"><span>Over</span><b>${f.lat.toFixed(2)}°, ${f.lon.toFixed(2)}°</b></div>
 <div class="sc-row"><span>Orbit</span><b>${f.inc.toFixed(1)}° · ${f.period<120?f.period.toFixed(1)+' min':(f.period/60).toFixed(1)+' h'} · ${fmtN(Math.round(f.per))}–${fmtN(Math.round(f.apo))} km</b></div>
 <p class="sc-note">Solid line: one full orbit. Dashed: the ground path for that orbit. Orbital elements from <a href="https://celestrak.org/NORAD/elements/gp.php?CATNR=${s.id}&FORMAT=tle" target="_blank" rel="noopener">CelesTrak</a>, ${f.ep<48?f.ep.toFixed(0)+' h':Math.round(f.ep/24)+' days'} old; position computed in your browser, accurate to a few km.</p>
 <div class="sc-act"><button class="chip sc-follow" aria-pressed="${!!SAT.follow}">${SAT.follow?'Stop following':'Follow'}</button></div>`;
 card.hidden=false;card.querySelector('.sc-x').onclick=()=>selectSat(-1);card.querySelector('.sc-follow').onclick=()=>setFollow(!SAT.follow)}
let cardTimer=null,orbitTimer=null;
function selectSat(i){SAT.sel=i;setFollow(false,true);clearInterval(cardTimer);clearInterval(orbitTimer);if(i<0){satPath.entities.removeAll();card.hidden=true;return}
 drawOrbit(i);renderCard();cardTimer=setInterval(renderCard,1000);orbitTimer=setInterval(()=>drawOrbit(i),20000)}
const followEnt=satPath.entities;let followE=null;
function setFollow(v,silent){SAT.follow=v&&SAT.sel>=0;if(followE){viewer.trackedEntity=undefined;viewer.entities.remove(followE);followE=null}
 if(SAT.follow){spin=false;followE=viewer.entities.add({position:new C.CallbackProperty(()=>SAT.pts[SAT.sel]&&SAT.pts[SAT.sel].position,false),point:{pixelSize:1,color:C.Color.TRANSPARENT},viewFrom:new C.Cartesian3(0,-2.5e6,1.5e6)});viewer.trackedEntity=followE}
 if(!silent)renderCard()}
setInterval(()=>{if(SAT.ready)startSats()},3*36e5);
// situations (SIT): conflict countries, disaster alerts
function buildSit(){const T=window.SIT||{};const w=clear('war');const by={};const ALIAS={'Democratic Republic of the Congo':'Dem. Rep. Congo','Central African Republic':'Central African Rep.','South Sudan':'S. Sudan','Bosnia and Herzegovina':'Bosnia and Herz.','Dominican Republic':'Dominican Rep.','Western Sahara':'W. Sahara','United States':'United States of America','Ivory Coast':"Côte d'Ivoire",'Myanmar':'Myanmar','Czech Republic':'Czechia'};
 (T.wars||[]).forEach(x=>x[3].forEach(n=>{const k=ALIAS[n]||n;(by[k]=by[k]||[]).push(x)}));
 O.countries.filter(f=>by[f.properties.name]).forEach(f=>{const wars=by[f.properties.name];const major=wars.some(x=>x[0]==='major');
  rings(f).forEach(r=>w.add({polyline:{positions:C.Cartesian3.fromDegreesArray(r.flat()),width:1.6,clampToGround:true,material:col(major?'--sev-red':'--warn',.9)}}));
  polys(f).forEach(h=>w.add({polygon:{hierarchy:h,material:col(major?'--sev-red':'--warn',.14),outline:false,classificationType:C.ClassificationType.TERRAIN},
   description:`<b>${esc(f.properties.name)}</b>${wars.map(x=>'· '+esc(x[1])+(x[4]?' ('+esc(x[4])+')':'')).join('<br>')}<br><span style="opacity:.75">Wikipedia, List of ongoing armed conflicts</span>`}))});
 const g=clear('gdacs');const GD={EQ:'Earthquake',TC:'Tropical cyclone',FL:'Flood',DR:'Drought',VO:'Volcano',WF:'Wildfire',TS:'Tsunami'};
 (T.gdacs||[]).forEach(x=>g.add({position:deg(x[8],x[9],0),point:{pixelSize:11,color:col(x[2]==='Red'?'--sev-red':'--warn'),outlineColor:col('--panel'),outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(GD[x[0]]||x[0])} · ${esc(x[2])} alert</b>${esc(x[1])}<br>${esc(x[5]).slice(0,160)}<br><span style="opacity:.75">GDACS</span>`}));
}
function rings(f){const g=f.geometry;return (g.type==='Polygon'?[g.coordinates]:g.coordinates).map(r=>r[0]).filter(r=>r.length>3)}
function polys(f){const g=f.geometry;const rings=g.type==='Polygon'?[g.coordinates]:g.coordinates;return rings.map(r=>new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(r[0].flat()),r.slice(1).map(h=>new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(h.flat())))))}
// signals (SIG): volcanoes, GPS cells, ground stations, fireballs at their real burst altitude
function buildSig(){const Z=window.SIG||{};const v=clear('volc');(Z.volcano?.items||[]).filter(x=>x[5]!=null).forEach(x=>v.add({position:deg(x[5],x[6],0),point:{pixelSize:10,color:col('--l-volc'),outlineColor:col('--ink'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(x[0])}, ${esc(x[1])}</b>${esc(x[3])} · ${esc(x[2])}<br>${esc(x[4]).slice(0,200)}…<br><span style="opacity:.75">Smithsonian / USGS Weekly Volcanic Activity Report</span>`}));
 const gp=clear('gps');(Z.gpsjam?.cells||[]).forEach(c=>{let lon,lat,pct,n;if(typeof c==='string'){if(!window.h3)return;const [hex,g,b]=c.split(':');n=+g+ +b;pct=Math.round(+b/n*100);[lat,lon]=window.h3.cellToLatLng(hex)}else{[lon,lat,pct,n]=c}
  cell('gps',lon,lat,.55,'--l-gps',Math.min(.7,.3+pct/150),pct/100,`<b>${pct}% of aircraft reported bad GPS</b>${n} aircraft seen in this cell on ${esc(Z.gpsjam.date)}<br><span style="opacity:.75">GPSJAM</span>`)});
 const gs=clear('gs');(Z.satnogs?.stations||[]).forEach(p=>gs.add({position:deg(p[0],p[1],0),point:{pixelSize:4,color:col('--l-sat',.9),disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>SatNOGS ground station</b>A volunteer antenna receiving satellites<br><span style="opacity:.75">SatNOGS Network</span>`}));
 const fb=clear('fb');(Z.fireballs||[]).filter(x=>x[2]!=null).forEach(x=>{const h=(x[5]||30)*1000;fb.add({position:deg(x[3],x[2],h),point:{pixelSize:Math.max(6,Math.sqrt(x[1])*3),color:col('--l-volc'),outlineColor:col('--ink'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},polyline:{positions:[deg(x[3],x[2],0),deg(x[3],x[2],h)],width:1,material:col('--l-volc',.5)},description:`<b>Fireball · ${x[1]} kt of energy</b>${esc(x[0])} UTC${x[4]?' · '+x[4]+' km/s':''}${x[5]?' · burst at '+x[5]+' km altitude (drawn at that height)':' · altitude unknown, drawn at 30 km'}<br><span style="opacity:.75">NASA JPL Fireball database</span>`})});
}
// nature (NAT)
const NGROUPS=[['birds','--n-bird'],['butterflies','--n-bfly'],['whales','--n-whale'],['mammals','--n-mammal'],['amphibians','--n-amph'],['plants','--n-plant']];
function buildNat(){const N=window.NAT||{};
 NGROUPS.forEach(([id,color])=>{const g=(N.sightings?.groups||[]).find(x=>x.id===id);const e=clear('nat-'+id);if(!g)return;const cells=parseCells(g.cells);const mx=Math.max(1,...cells.map(d=>d.n));
  cells.forEach(d=>cell('nat-'+id,d.lon,d.lat,.95,color,.18+.42*Math.sqrt(d.n/mx),d.n/mx,`<b>${fmtN(d.n)} ${esc(g.name.toLowerCase())} sightings</b>in this 2° cell, in a sample of ${fmtN(g.sampled)} of ${fmtN(g.total)} research-grade observations this week<br><span style="opacity:.75">iNaturalist · counts follow where people look</span>`))});
 const th=clear('nat-threat');parseCells(N.threatened?.cells).forEach(d=>cell('nat-threat',d.lon,d.lat,.95,'--n-threat',Math.min(.6,.2+d.n/30),d.n/25,`<b>${fmtN(d.n)} sightings of threatened species</b>in this 2° cell this week · exact locations are blurred<br><span style="opacity:.75">iNaturalist</span>`));
 const eb=clear('nat-ebird');parseCells(N.ebird?.cells).forEach(d=>cell('nat-ebird',d.lon,d.lat,.95,'--n-bird',Math.min(.6,.25+d.n/12),d.n/10,`<b>${fmtN(d.n)} notable bird reports</b>in this 2° cell, past 7 days<br><span style="opacity:.75">eBird (Cornell Lab)</span>`));
 const mg=clear('nat-mig');(N.migration||[]).filter(m=>m.sci&&!m.withheld).forEach(m=>{const pts=m.months.filter(x=>x[1]!=null);if(pts.length<2)return;const last=pts[pts.length-1];
  (O.migLines?O.migLines(m):[pts.map(p=>[p[1],p[2]])]).forEach(line=>mg.add({polyline:{positions:C.Cartesian3.fromDegreesArrayHeights(line.flatMap(p=>[p[0],p[1],20000])),width:2.5,material:new C.PolylineGlowMaterialProperty({glowPower:.25,color:col('--n-mig')}),arcType:C.ArcType.RHUMB},description:`<b>${esc(m.name)}: where sightings centred, month by month</b>${m.population?esc(m.population)+' · ':''}${pts[0][0]} → ${last[0]}${m.marine?'<br>Drawn offshore between months; the real route is not tracked':''}<br><span style="opacity:.75">iNaturalist · a seasonal centre of attention, not a tracked animal</span>`}));
  mg.add({position:deg(last[1],last[2],20000),point:{pixelSize:8,color:col('--n-mig'),outlineColor:col('--panel'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{text:m.name,font:'600 12px Public Sans, sans-serif',fillColor:col('--ink'),outlineColor:col('--ocean'),outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(10,0),horizontalOrigin:C.HorizontalOrigin.LEFT,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(m.name)}${m.population?' · '+esc(m.population):''}</b>The most central of ${fmtN(last[4]||last[3])} sightings in ${last[0]}<br><span style="opacity:.75">iNaturalist</span>`})});
}
// unexplained: seismic events that were not earthquakes (USGS ComCat); unclassified types drawn larger, in red
function buildOdd(){const U=window.UNEXP||{};const e=clear('odd');const R=/other event|not reported|sonic boom|meteor|acoustic|nuclear|experimental|induced|rock burst|collapse/;(U.seismic?.odd||[]).forEach(p=>{const rare=R.test(p[0]);e.add({position:deg(p[4],p[5],0),point:{pixelSize:rare?10:5,color:col(rare?'--sev-red':'--l-odd',.9),outlineColor:col('--panel'),outlineWidth:1,disableDepthTestDistance:Number.POSITIVE_INFINITY},description:`<b>${esc(p[1])}</b>${esc(p[0])} · ${esc(String(p[3]).replace('T',' '))}${p[7]?' · '+p[7]+' felt reports':''}<br><span style="opacity:.75">USGS ComCat, classified by the reporting network</span>`})})}
// economy choropleth: reuse the colors the 2D layer computed
function buildEcon(){const e=clear('econ');document.querySelectorAll('#g-econ path').forEach(p=>{const f=d3.select(p).datum();const fill=p.getAttribute('fill');if(!f||!fill||fill.startsWith('var('))return;polys(f).forEach(h=>e.add({polygon:{hierarchy:h,material:col(fill,.5),classificationType:C.ClassificationType.TERRAIN},description:`<b>${esc(f.properties.name)}</b>${esc(p.querySelector('title')?.textContent||'')}<br><span style="opacity:.75">World Bank</span>`}))})}
// invisible country shapes for clicking
const cty=new C.CustomDataSource('cty');viewer.dataSources.add(cty);
O.countries.forEach(f=>polys(f).forEach(h=>cty.entities.add({polygon:{hierarchy:h,material:C.Color.WHITE.withAlpha(0.004),classificationType:C.ClassificationType.TERRAIN},properties:{country:f.properties.name}})));


const LABEL=(text)=>({text,font:'600 12px Public Sans, sans-serif',fillColor:col('--ink'),outlineColor:col('--ocean'),outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(10,0),horizontalOrigin:C.HorizontalOrigin.LEFT,disableDepthTestDistance:Number.POSITIVE_INFINITY});
// ----- the Moon: marker where it is overhead, and an Earth-and-Moon view (CesiumJS draws the real Moon) -----
function buildMoon(){if(!O.moonNow)return;const m=O.moonNow();const e=clear('moon');
 e.add({position:deg(m.lon,m.lat,0),point:{pixelSize:12,color:C.Color.fromCssColorString('#f2efe4'),outlineColor:C.Color.fromCssColorString('#2b2f36'),outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},
  label:LABEL('Moon overhead · '+Math.round(m.frac*100)+'% lit'),description:`<b>The Moon is straight overhead here</b>${m.name}, ${Math.round(m.frac*100)}% lit, ${fmtN(Math.round(m.dist))} km up<br><span style="opacity:.75">Astronomy Engine, computed in your browser</span>`})}
scene.moon=new C.Moon({onlySunLighting:true});
let moonView=false;const homeMax=sscc.maximumZoomDistance;
function setMoonView(v){moonView=v;const b=document.getElementById('moonViewBtn');if(b)b.setAttribute('aria-pressed',v);
 if(!v){sscc.maximumZoomDistance=homeMax;viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(-75,25,2.3e7),duration:1.6});return}
 if(!O.moonNow)return;const m=O.moonNow();sscc.maximumZoomDistance=1.5e9;spin=false;
 const mp=C.Cartesian3.fromDegrees(m.lon,m.lat,m.dist*1000-6371000),mid=C.Cartesian3.multiplyByScalar(mp,.5,new C.Cartesian3());
 const side=C.Cartesian3.normalize(C.Cartesian3.cross(mp,C.Cartesian3.UNIT_Z,new C.Cartesian3()),new C.Cartesian3());
 const dest=C.Cartesian3.add(mid,C.Cartesian3.multiplyByScalar(side,C.Cartesian3.magnitude(mp)*.95,new C.Cartesian3()),new C.Cartesian3());
 const dir=C.Cartesian3.normalize(C.Cartesian3.subtract(mid,dest,new C.Cartesian3()),new C.Cartesian3());
 viewer.camera.flyTo({destination:dest,orientation:{direction:dir,up:C.Cartesian3.UNIT_Z},duration:2.5})}
// ----- AI model releases by country -----
function buildAi(){const e=clear('ai');if(!O.aiByCountry)return;O.aiByCountry().filter(d=>d.lon!=null).forEach(d=>e.add({position:deg(d.lon,d.lat,0),
 point:{pixelSize:9+5*Math.sqrt(d.n),color:col('--l-ai',.85),outlineColor:col('--panel'),outlineWidth:1.5,disableDepthTestDistance:Number.POSITIVE_INFINITY},
 label:{...LABEL(d.n>1?String(d.n):''),pixelOffset:new C.Cartesian2(0,0),horizontalOrigin:C.HorizontalOrigin.CENTER,font:'700 11px Public Sans, sans-serif'},description:O.aiTip(d)}))}
setInterval(buildMoon,60e3);


// ----- weather & ocean overlays (NASA GIBS, public domain; 3D globe only) -----
// Clouds: geostationary infrared (GOES-East, GOES-West, Himawari), cold cloud tops kept, warm ground made transparent.
// Rain & snow: NASA IMERG, last half hour. Sea temperature vs normal: GHRSST MUR 0.25° daily anomaly (EPSG:4326 grid).
const GIBS3857='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/',GIBS4326='https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/';
const gibs4326=(layer,set,maxLevel)=>new C.UrlTemplateImageryProvider({url:GIBS4326+layer+'/default/'+set+'/{z}/{y}/{x}.png',
 // GIBS geographic tiles start from a 2x1 grid of 512 px tiles covering 576° x 288° (the extra width is empty)
 tilingScheme:new C.GeographicTilingScheme({rectangle:C.Rectangle.fromDegrees(-180,-198,396,90),numberOfLevelZeroTilesX:2,numberOfLevelZeroTilesY:1}),
 tileWidth:512,tileHeight:512,maximumLevel:maxLevel,credit:new C.Credit('NASA GIBS',false)});
const gibs3857=(layer,level)=>new C.UrlTemplateImageryProvider({url:GIBS3857+layer+'/default/GoogleMapsCompatible_Level'+level+'/{z}/{y}/{x}.png',tilingScheme:merc,maximumLevel:level,credit:new C.Credit('NASA GIBS',false)});
const WX={
 'wx-clouds':{name:'Clouds now (infrared)',color:'#e8eef5',legend:'https://gibs.earthdata.nasa.gov/legends/Clean_Longwave_Infrared_Window_Band_H.svg',
  note:'Every 10 minutes from GOES-East, GOES-West and Himawari. Not covered: Europe, Africa and the Indian Ocean (their Meteosat satellites are not in NASA GIBS).',
  make:()=>['GOES-East_ABI_Band13_Clean_Infrared','GOES-West_ABI_Band13_Clean_Infrared','Himawari_AHI_Band13_Clean_Infrared'].map(l=>{const L=new C.ImageryLayer(gibs3857(l,6),{alpha:.75});L.colorToAlpha=C.Color.BLACK;L.colorToAlphaThreshold=.38;return L})},
 'wx-rain':{name:'Rain & snow, last 30 min',color:'#4cc9f0',legend:'https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.svg',
  note:'NASA IMERG satellite estimate, about 4–6 hours behind real time.',make:()=>[new C.ImageryLayer(gibs3857('IMERG_Precipitation_Rate_30min',6),{alpha:.85})]},
 'wx-sst':{name:'Sea temperature vs normal',color:'#ff6b6b',legend:'https://gibs.earthdata.nasa.gov/legends/GHRSST_Sea_Surface_Temperature_Anomalies_H.svg',
  note:'Daily difference from the long-term average (GHRSST MUR, 0.25°). The warm tongue along the equator in the Pacific is El Niño.',make:()=>[new C.ImageryLayer(gibs4326('GHRSST_L4_MUR25_Sea_Surface_Temperature_Anomalies','2km',5),{alpha:.8})]},
};
const wxLayers={};
Object.entries(WX).forEach(([id,w])=>{document.documentElement.style.setProperty('--c-'+id,w.color);O.addLayer({id,name:w.name,color:'--c-'+id,shape:'square',count:'3D only',on:false,group:'Weather & ocean'});
 const b=document.getElementById('chip-'+id);if(b)b.title=w.note});
function syncWx(){Object.entries(WX).forEach(([id,w])=>{const on=chipOn(id)&&active;if(on&&!wxLayers[id]){wxLayers[id]=w.make();wxLayers[id].forEach(L=>viewer.imageryLayers.add(L));if(nightLayer)viewer.imageryLayers.raiseToTop(nightLayer)}
 if(wxLayers[id])wxLayers[id].forEach(L=>L.show=on);
 let lg=document.getElementById('lg-'+id);const chip=document.getElementById('chip-'+id);
 if(on&&!lg&&chip){lg=document.createElement('div');lg.id='lg-'+id;lg.className='wx-legend';lg.innerHTML=`<img src="${w.legend}" alt="Legend: ${esc(w.name)}" loading="lazy"><span>${esc(w.note)}</span>`;chip.after(lg)}
 if(lg)lg.hidden=!on})}
// the Niño 3.4 box (5°N–5°S, 170°W–120°W) where NOAA measures El Niño
const n34=clear('nino34');n34.add({polyline:{positions:C.Cartesian3.fromDegreesArray([-170,-5,-120,-5,-120,5,-170,5,-170,-5]),width:2.5,clampToGround:true,material:new C.PolylineDashMaterialProperty({color:C.Color.fromCssColorString('#ffd166'),dashLength:14})},
 position:deg(-145,5.6,0),label:{...LABEL('Niño 3.4 region'),horizontalOrigin:C.HorizontalOrigin.CENTER,pixelOffset:new C.Cartesian2(0,-10)},description:'<b>Niño 3.4 region</b>5°N–5°S, 170°W–120°W. NOAA declares El Niño or La Niña from the sea temperature here.'});
DS.nino34.show=false;
O.showNino34=(v=true)=>{DS.nino34.show=v;if(v){const c=document.getElementById('chip-wx-sst');if(c&&c.getAttribute('aria-pressed')!=='true')c.click();spin=false;viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(-140,0,1.6e7),duration:1.6})}};
new MutationObserver(ms=>{if(ms.some(m=>/^chip-wx-/.test(m.target.id||'')))syncWx()}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});

// ----- see-through Earth (earthquake depth) -----
let xray=false;const DEPTH_X=25;
function setXray(v){xray=v;globe.translucency.enabled=v;globe.translucency.frontFaceAlpha=v?.55:1;globe.translucency.backFaceAlpha=v?.1:1;buildSnap();document.getElementById('xrayBtn')?.setAttribute('aria-pressed',v)}

// ----- tooltips, clicks -----
const tip=document.getElementById('tip');const handler=new C.ScreenSpaceEventHandler(scene.canvas);
handler.setInputAction(m=>{const p=scene.pick(m.endPosition);const ent=p&&p.id;let d=ent&&ent.description&&(ent.description.getValue?ent.description.getValue(viewer.clock.currentTime):ent.description);
 if(ent&&ent.sat!=null){const s=SAT.list[ent.sat];const f=s&&satFacts(s);if(s)d=`<b>${esc(s.name)}</b>${esc(SAT_CATS[s.cat].name)}${f?' · '+fmtN(Math.round(f.alt))+' km up':''}<br><span style="opacity:.75">Click for its orbit · CelesTrak</span>`}
 if(d&&tip){tip.innerHTML=d;tip.hidden=false;const r=el.getBoundingClientRect();tip.style.left=Math.min(m.endPosition.x+14,r.width-270)+'px';tip.style.top=(m.endPosition.y+14)+'px';tip.style.position='absolute';if(tip.parentElement!==host)host.appendChild(tip)}
 else if(tip&&!tip.hidden&&tip.parentElement===host)tip.hidden=true;
 scene.canvas.style.cursor=p&&p.id&&(p.id.properties?.country||p.id.sat!=null)?'pointer':'default'},C.ScreenSpaceEventType.MOUSE_MOVE);
handler.setInputAction(m=>{const picked=scene.drillPick(m.position,6);const sp=picked.find(p=>p.id&&p.id.sat!=null);if(sp){selectSat(sp.id.sat);return}if(SAT.sel>=0&&!picked.some(p=>p.id&&p.id.properties)){selectSat(-1)}const c=picked.find(p=>p.id&&p.id.properties&&p.id.properties.country);if(c){const name=c.id.properties.country.getValue();const f=O.countries.find(x=>x.properties.name===name);if(f&&O.openCountry)O.openCountry(f)}},C.ScreenSpaceEventType.LEFT_CLICK);

// ----- spin, fly-to, mode switch -----
let spin=!matchMedia('(prefers-reduced-motion: reduce)').matches,idle=true;
viewer.clock.onTick.addEventListener(()=>{if(spin&&idle&&active)viewer.scene.camera.rotate(C.Cartesian3.UNIT_Z,-0.0006)});
['pointerdown','wheel','touchstart'].forEach(ev=>el.addEventListener(ev,()=>{spin=false;O.setSpin&&O.setSpin(false)},{passive:true}));
const origFly=O.flyTo,origSpin=O.setSpin;
O.flyTo=(lon,lat)=>{if(active){spin=false;viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(lon,lat,1.6e7),duration:1.6})}else origFly(lon,lat)};
O.setSpin=v=>{spin=v;origSpin(v)};
// zoom buttons drive the 3D camera while it is active
const zc=document.getElementById('zoomctl')||document.querySelector('.zoomctl');if(zc){host.appendChild(zc);zc.style.zIndex=4;
 const Z={zin:()=>viewer.camera.zoomIn(viewer.camera.positionCartographic.height*.4),zout:()=>viewer.camera.zoomOut(viewer.camera.positionCartographic.height*.6),zreset:()=>{if(moonView){setMoonView(false);return}spin=true;viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(-75,25,2.3e7),duration:1.2})},zspin:()=>{spin=!spin;origSpin(spin)}};
 Object.entries(Z).forEach(([id,fn])=>{const b=document.getElementById(id);if(b)b.addEventListener('click',e=>{if(!active)return;e.stopImmediatePropagation();fn()},true)})}
let active=true;
function setActive(v){active=v;try{syncWx()}catch(e){}el.style.display=v?'block':'none';if(mapbox)mapbox.style.visibility=v?'hidden':'visible';if(!v&&origSpin)origSpin(spin);document.querySelectorAll('#viewseg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===(v?'3d':O.mode())));if(v)viewer.resize();const zs=document.getElementById('zspin');if(zs)zs.hidden=false}
const seg=document.getElementById('viewseg');
if(seg){const b=document.createElement('button');b.dataset.mode='3d';b.textContent='3D';b.setAttribute('aria-pressed','true');b.onclick=()=>setActive(true);seg.insertBefore(b,seg.firstChild);
 seg.querySelectorAll('button:not([data-mode="3d"])').forEach(x=>x.addEventListener('click',()=>setActive(false)))}
// imagery + see-through controls in the rail
const rail=document.getElementById('ops-rail');
if(rail){const d=document.createElement('div');d.className='rail-group';d.innerHTML=`<span class="gl">Imagery</span><div class="seg" id="imgSeg" role="group" aria-label="Imagery">${Object.entries(IMAGERY).filter(([k,v])=>!v.needsToken||window.OBS_ION_TOKEN).map(([k,v])=>`<button data-k="${k}" aria-pressed="${k===imageryChoice}" title="${esc(v.name)}">${v.label||(k==='bing'?'Bing':'Basic')}</button>`).join('')}</div><p class="theme-note" id="imgNote"></p><span class="gl" style="padding-top:8px">Lighting</span><div class="seg" id="lightSeg" role="group" aria-label="Lighting"><button data-l="sun" aria-pressed="true" title="Sunlight where the Sun is shining right now; city lights on the night side">Real sun</button><button data-l="day" aria-pressed="false" title="The whole planet lit evenly, no night side">Whole globe lit</button></div><button class="chip" id="moonViewBtn" aria-pressed="false" style="width:100%"><span>Earth and Moon view</span></button><button class="chip" id="xrayBtn" aria-pressed="false" style="width:100%"><span>See-through Earth: quake depths ×${DEPTH_X}</span></button>`;
 const mapGroup=[...rail.querySelectorAll('.rail-group')].find(g=>g.querySelector('.gl')?.textContent==='Map');rail.insertBefore(d,mapGroup?mapGroup.nextSibling:rail.children[1]);
 d.querySelectorAll('#imgSeg button').forEach(b=>b.onclick=()=>setImagery(b.dataset.k));document.getElementById('xrayBtn').onclick=()=>setXray(!xray);
 document.getElementById('moonViewBtn').onclick=()=>setMoonView(!moonView);
 const setLight=v=>{globe.enableLighting=v;if(nightLayer)nightLayer.show=v;O.lightingOn=v;document.querySelectorAll('#lightSeg button').forEach(x=>x.setAttribute('aria-pressed',(x.dataset.l==='sun')===v));try{localStorage.setItem('obs-light',v?'1':'0')}catch(x){}};
 document.querySelectorAll('#lightSeg button').forEach(x=>x.onclick=()=>setLight(x.dataset.l==='sun'));
 try{if(localStorage.getItem('obs-light')==='0')setLight(false)}catch(x){}
 const foot=rail.querySelector('.rail-foot');if(foot)foot.appendChild(credits)}

// ----- wire live rebuilds -----
const wrap=(fn,after)=>{const f=O[fn];if(!f)return;O[fn]=function(){const r=f.apply(this,arguments);try{after()}catch(e){}return r}};
wrap('setSnap',()=>{buildSnap();buildAi()});wrap('setQuakes',buildSnap);wrap('buildSitLayers',buildSit);wrap('buildSigLayers',buildSig);wrap('buildNatureLayers',buildNat);wrap('buildEconLayer',buildEcon);wrap('buildOddLayer',buildOdd);
buildSnap();buildSit();buildSig();buildNat();buildEcon();buildOdd();buildMoon();buildAi();
startSats();
setActive(true);
// If the globe surface never appears (a sandbox blocking tiles or workers), fall back to the 2D map and say so.
let gaveUp=false;
function giveUp(why){if(gaveUp)return;gaveUp=true;setActive(false);const b=seg&&seg.querySelector('button[data-mode="3d"]');if(b){b.disabled=true;b.title=why}note(why);console.warn('3D globe disabled: '+why)}
window.addEventListener('securitypolicyviolation',e=>{if(/cesium|gibs|jsdelivr/i.test(e.blockedURI||'')&&/worker|img|connect/.test(e.violatedDirective||''))giveUp('The 3D globe can\u2019t load here (this preview blocks map tiles and background workers). It works on the public site.')});
const probe=setInterval(()=>{try{const n=(globe._surface&&globe._surface._tilesToRender||[]).length;if(n>0){clearInterval(probe);return}}catch(e){}},1000);
setTimeout(()=>{try{const n=(globe._surface&&globe._surface._tilesToRender||[]).length;if(!n)giveUp('The 3D globe could not start here (no map tiles arrived). It works on the public site; showing the 2D globe instead.')}catch(e){}},12000);
new MutationObserver(()=>{buildSnap();buildSit();buildSig();buildNat();buildEcon();buildOdd();buildMoon();buildAi()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
window.__obs3d={viewer,setImagery,setXray,DS,SAT,selectSat,setMoonView};
})();
