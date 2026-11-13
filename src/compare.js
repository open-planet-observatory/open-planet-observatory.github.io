// ---------- Compare two dates: one place, two days of NASA satellite imagery, side by side with a divider ----------
// Uses Cesium's split screen (ImageryLayer.splitDirection + scene.splitPosition) on the 3D globe. Each side is one day's
// NASA GIBS "corrected reflectance" picture, clouds included; each side is labelled with its date and satellite.
// The site does not measure or score what changed: the visitor looks and decides.
// SWITCH: while LIVE is false the "Compare two dates" button appears only when the address carries ?compare=1, so merging
// this file changes nothing a visitor sees. Set LIVE to true to show it to everyone. Undo: remove this file from build/build.mjs.
(function(){
if(!window.OBS_HOSTED)return;
const LIVE=false;
if(!LIVE&&!/[?&]compare=1\b/.test(location.search))return;
const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
// Satellites offered, oldest record first. min = first day NASA GIBS serves for that layer (checked 12 Nov 2026).
const SATS={terra:{layer:'MODIS_Terra_CorrectedReflectance_TrueColor',name:'NASA Terra, MODIS',min:'2000-02-24',lvl:9},
            noaa20:{layer:'VIIRS_NOAA20_CorrectedReflectance_TrueColor',name:'NOAA-20, VIIRS',min:'2018-01-01',lvl:9}};
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const day=d=>d.toISOString().slice(0,10);
const yesterday=()=>day(new Date(Date.now()-864e5));
const yearsBack=(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCFullYear(d.getUTCFullYear()-n);return day(d)};
let C,viewer,prevLight=null,open=false,sat='terra',L={left:null,right:null},dates={left:null,right:null},pos=.5,card,bar,tags={};
function provider(s,date){const S=SATS[s];return new C.UrlTemplateImageryProvider({url:GIBS+S.layer+'/default/'+date+'/GoogleMapsCompatible_Level'+S.lvl+'/{z}/{y}/{x}.jpg',
 tilingScheme:new C.WebMercatorTilingScheme(),maximumLevel:S.lvl,credit:new C.Credit('Imagery: NASA GIBS ('+S.name+', '+date+')',false)})}
// One small tile tells whether NASA has a picture for that day (GIBS answers 404 outside a layer's dates).
async function hasDay(s,date){try{const r=await fetch(GIBS+SATS[s].layer+'/default/'+date+'/GoogleMapsCompatible_Level'+SATS[s].lvl+'/2/1/1.jpg');return r.ok}catch(e){return null}}
function drop(side){if(L[side]){try{viewer.imageryLayers.remove(L[side],true)}catch(e){}L[side]=null}}
async function show(side){const date=dates[side];drop(side);const msg=card.querySelector('#cmpMsg');
 const S=SATS[sat];if(!date||date<S.min||date>yesterday()){setTag(side,'No picture: '+S.name+' covers '+S.min+' to yesterday');return}
 setTag(side,date+' · '+S.name+' · loading…');const ok=await hasDay(sat,date);if(!open||dates[side]!==date)return;
 if(ok===false){setTag(side,'NASA has no '+S.name+' picture for '+date);return}
 const lay=new C.ImageryLayer(provider(sat,date));lay.splitDirection=side==='left'?C.SplitDirection.LEFT:C.SplitDirection.RIGHT;
 viewer.imageryLayers.add(lay);L[side]=lay;setTag(side,date+' · '+S.name);if(msg)msg.textContent='';viewer.scene.requestRender&&viewer.scene.requestRender()}
function setTag(side,t){if(tags[side])tags[side].textContent=(side==='left'?'◀ ':'')+t+(side==='right'?' ▶':'')}
// The part of the globe canvas a visitor can actually see: inside the header, side panels and bottom bar.
function vis(){const c=viewer.canvas.getBoundingClientRect();let l=c.left,r=c.right,t=c.top,b=c.bottom;const on=el=>{if(!el)return null;const x=el.getBoundingClientRect();return x.width>0&&x.height>0&&getComputedStyle(el).visibility!=='hidden'?x:null};
 const top=on(document.getElementById('ops-top')),rail=on(document.getElementById('ops-rail')),dr=on(document.getElementById('ops-drawer')),bot=on(document.getElementById('ops-bottom'));
 if(top&&top.bottom<c.top+c.height*.5)t=Math.max(t,top.bottom);if(bot&&bot.top>c.top+c.height*.5)b=Math.min(b,bot.top);
 if(rail&&rail.right<c.left+c.width*.5)l=Math.max(l,rail.right);if(dr&&dr.left>c.left+c.width*.5)r=Math.min(r,dr.left);
 if(r-l<120){l=c.left;r=c.right}if(b-t<120){t=c.top;b=c.bottom}return{c,l,r,t,b}}
function place(){if(!bar)return;const v=vis(),x=v.c.left+v.c.width*pos;bar.style.left=x+'px';bar.style.top=v.t+'px';bar.style.height=(v.b-v.t)+'px';viewer.scene.splitPosition=pos}
function start(){if(open)return;open=true;const b=document.getElementById('cmpBtn');if(b)b.setAttribute('aria-pressed','true');
 const y=yesterday();dates={right:y,left:yearsBack(y,10)};
 bar=document.createElement('div');bar.id='cmpBar';bar.setAttribute('role','separator');bar.setAttribute('aria-label','Drag to compare the two dates');bar.tabIndex=0;
 bar.innerHTML='<i class="cmp-grip">⇆</i><span class="cmp-tag l"></span><span class="cmp-tag r"></span>';document.body.appendChild(bar);
 tags={left:bar.querySelector('.cmp-tag.l'),right:bar.querySelector('.cmp-tag.r')};
 const move=x=>{const r=viewer.canvas.getBoundingClientRect();pos=Math.min(.97,Math.max(.03,(x-r.left)/r.width));place()};
 bar.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();bar.setPointerCapture(e.pointerId);const mv=ev=>move(ev.clientX),up=()=>{bar.removeEventListener('pointermove',mv);bar.removeEventListener('pointerup',up)};bar.addEventListener('pointermove',mv);bar.addEventListener('pointerup',up)});
 bar.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){pos=Math.min(.97,Math.max(.03,pos+(e.key==='ArrowLeft'?-.02:.02)));place();e.preventDefault()}});
 card=document.createElement('section');card.id='cmpCard';card.className='cmp-card';card.setAttribute('aria-label','Compare two dates');
 const opts=Object.entries(SATS).map(([k,v])=>`<option value="${k}"${k===sat?' selected':''}>${esc(v.name)} (from ${v.min.slice(0,4)})</option>`).join('');
 card.innerHTML=`<div class="cmp-head"><b>Compare two dates</b><button type="button" class="cmp-x" aria-label="Close compare">×</button></div>
 <label class="cmp-row"><span>Satellite</span> <select id="cmpSat">${opts}</select></label>
 <div class="cmp-dates"><label>Left <input type="date" id="cmpL" value="${dates.left}"></label><label>Right <input type="date" id="cmpR" value="${dates.right}"></label></div>
 <details class="cmp-note"><summary>Drag the divider · about these pictures</summary>Each side is one day’s picture from NASA, with that day’s clouds; pick the same season in both years for a fair look. The site does not measure or score what changed. Imagery: NASA GIBS / EOSDIS.</details><p class="cmp-note" id="cmpMsg" aria-live="polite"></p>`;
 document.body.appendChild(card);
 const lim=()=>{const S=SATS[sat];['cmpL','cmpR'].forEach(id=>{const i=card.querySelector('#'+id);i.min=S.min;i.max=yesterday()})};lim();
 card.querySelector('.cmp-x').onclick=stop;
 card.querySelector('#cmpSat').onchange=e=>{sat=e.target.value;lim();show('left');show('right')};
 card.querySelector('#cmpL').onchange=e=>{dates.left=e.target.value;show('left')};
 card.querySelector('#cmpR').onchange=e=>{dates.right=e.target.value;show('right')};
 {const v=vis();pos=((v.l+v.r)/2-v.c.left)/v.c.width}
 // Daily pictures are daytime pictures: light the whole globe evenly while comparing, and put the lighting back after.
 prevLight=viewer.scene.globe.enableLighting;viewer.scene.globe.enableLighting=false;
 addEventListener('resize',place);place();{const v=vis();card.style.left=((v.l+v.r)/2)+'px'}show('left');show('right')}
function stop(){if(!open)return;open=false;drop('left');drop('right');viewer.scene.splitPosition=.5;if(prevLight!==null){viewer.scene.globe.enableLighting=prevLight;prevLight=null}
 if(bar)bar.remove();if(card)card.remove();bar=card=null;tags={};removeEventListener('resize',place);
 const b=document.getElementById('cmpBtn');if(b)b.setAttribute('aria-pressed','false');viewer.scene.requestRender&&viewer.scene.requestRender()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)stop()});
// Leave compare whenever the 3D globe is not what's on screen (flat map, a game, the Moon or a space view).
new MutationObserver(()=>{const h=document.documentElement.classList;if(open&&(h.contains('map2d')||h.contains('game-on')))stop()}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
document.addEventListener('click',e=>{if(open&&e.target.closest('#zmoon,#zuni,#zgal,#zweb,#imgSeg button'))stop()},true);
let tries=0;const wait=setInterval(()=>{const o=window.__obs3d,g=document.getElementById('imgGroup');
 if(o&&o.viewer&&window.Cesium&&g){clearInterval(wait);C=window.Cesium;viewer=o.viewer;
  if(!C.SplitDirection)return; // older Cesium: no split screen, so no button
  const b=document.createElement('button');b.type='button';b.className='chip';b.id='cmpBtn';b.setAttribute('aria-pressed','false');b.style.cssText='width:100%;margin-top:6px';
  b.title='Two days of NASA satellite pictures of the same place, side by side with a divider';b.innerHTML='<span>⇆ Compare two dates</span>';
  b.onclick=()=>open?stop():start();const seg=g.querySelector('#imgSeg');(seg||g.lastChild).after(b)}
 else if(++tries>240)clearInterval(wait)},500);
window.__owlCompare={start,stop,state:()=>({open,sat,dates:{...dates},pos,left:!!L.left,right:!!L.right,split:viewer&&viewer.scene.splitPosition})};
const st=document.createElement('style');st.textContent=`
#cmpBar{position:fixed;z-index:2990;width:4px;margin-left:-2px;background:var(--owl-cream,#EFE4CC);box-shadow:0 0 0 1px rgb(0 0 0 / .5);cursor:ew-resize;touch-action:none}
#cmpBar:focus-visible{outline:2px solid var(--owl-yellow,#F2C43C);outline-offset:2px}
#cmpBar .cmp-grip{position:absolute;top:28%;left:50%;transform:translate(-50%,-50%);width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;background:var(--glass,#16110a);color:var(--ink,#EFE4CC);border:2px solid var(--owl-cream,#EFE4CC)}
#cmpBar .cmp-tag{position:absolute;top:10px;white-space:nowrap;font-size:.78rem;padding:3px 8px;border-radius:999px;background:var(--glass,#16110a);color:var(--ink,#EFE4CC);border:1px solid var(--glass-line,rgb(255 255 255 / .15))}
#cmpBar .cmp-tag.l{right:10px}#cmpBar .cmp-tag.r{left:10px}
.cmp-card{position:fixed;z-index:3001;left:50%;transform:translateX(-50%);bottom:calc(var(--botH,56px) + 64px);width:min(380px,calc(100vw - 24px));padding:12px 14px;border-radius:14px;background:var(--glass,#16110a);color:var(--ink,#EFE4CC);border:1px solid var(--glass-line,rgb(255 255 255 / .15));box-shadow:0 16px 40px rgb(0 0 0 / .45);font-size:.9rem}
.cmp-card .cmp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.cmp-card .cmp-x{background:none;border:0;color:inherit;font-size:1.3rem;cursor:pointer;line-height:1}
.cmp-card .cmp-row,.cmp-card .cmp-dates label{display:flex;gap:8px;align-items:center;margin:4px 0}
.cmp-card .cmp-dates{display:flex;gap:10px}.cmp-card .cmp-dates label{flex:1;min-width:0}.cmp-card .cmp-dates input{min-width:0;width:100%}.cmp-card select{min-width:0;flex:1}.cmp-card summary{cursor:pointer}
.cmp-card select,.cmp-card input{font:inherit;color:inherit;background:var(--glass-2,rgb(255 255 255 / .06));border:1px solid var(--glass-line,rgb(255 255 255 / .15));border-radius:8px;padding:3px 6px}
.cmp-card .cmp-note{margin:6px 0 0;font-size:.78rem;opacity:.85}.cmp-card #cmpMsg:empty{display:none}
@media (max-width:640px){#cmpBar .cmp-tag{max-width:42vw;overflow:hidden;text-overflow:ellipsis}.cmp-card{bottom:calc(var(--botH,56px) + 8px);padding:10px 12px;font-size:.85rem}}`;
document.head.appendChild(st);
})();
