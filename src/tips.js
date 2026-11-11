// ---------- Quick hover explanations ----------
// Any control with a title (or data-tip) shows its explanation after a short pause, instead of the browser's slow
// native tooltip. Controls that had no explanation get one here. Also a one-time pointer to the Solar System view.
(function(){
const TIPS={zspin:'Start or stop the globe turning',zin:'Zoom in (you can also pinch or scroll)',zout:'Zoom out. Keep going past the globe to reach the Solar System',zreset:'Back to the starting view',
 'zuni':'Fly out from Earth to the Solar System: planets, moons, spacecraft and comets, live','zgal':'Fly from Earth past the stars to the whole Milky Way','zweb':'Fly out past our galaxy to the cosmic web: 43,000 real galaxies in clusters and filaments, out to about a billion light-years'};
const MODE={'3d':'3D globe: satellites, weather, gravity and every live layer',globe:'Lighter 2D globe for slower computers',flat:'Flat world map'};
function label(){Object.entries(TIPS).forEach(([id,t])=>{const e=document.getElementById(id);if(e&&!e.dataset.tip&&!e.title)e.title=t});
 document.querySelectorAll('#viewseg button').forEach(b=>{if(!b.title&&!b.dataset.tip&&MODE[b.dataset.mode])b.title=MODE[b.dataset.mode]})}
label();setTimeout(label,2500);setTimeout(label,8000);
const tip=document.createElement('div');tip.id='qtip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.appendChild(tip);
let timer=null,cur=null;
function show(el){const t=el.dataset.tip;if(!t)return;tip.textContent=t;tip.hidden=false;const r=el.getBoundingClientRect(),w=Math.min(280,innerWidth-16);tip.style.maxWidth=w+'px';
 const tw=tip.offsetWidth,th=tip.offsetHeight;let x=r.left+r.width/2-tw/2;x=Math.max(8,Math.min(innerWidth-tw-8,x));let y=r.top-th-8;if(y<8)y=r.bottom+8;tip.style.left=x+'px';tip.style.top=y+'px'}
/* "Explain options" (8 Nov 2026): the left rail stays quiet unless the visitor switches explanations on; off by default,
   remembered on this device. Layers that had no explanation get one here (the site's own words; each names its source). */
const RAIL={'chip-quake':'Earthquakes of magnitude 2.5 and up in the past week, from the U.S. Geological Survey. Bigger dots, bigger quakes.','chip-fire':'Hot spots seen by NASA satellites in the past 24 hours (FIRMS): wildfires, farm burning, gas flares.','chip-event':'Open storms, wildfires, icebergs and other natural events tracked by NASA EONET.','chip-alert':'U.S. National Weather Service warnings in force now, on land only.','chip-gdacs':'Red and orange disaster alerts from GDACS, a UN and European Commission system.','chip-volc':'Volcanoes reported erupting this week by the Smithsonian Global Volcanism Program.','chip-odd':'Shaking that was not an earthquake: blasts, quarries, sonic booms and unlabelled events, as USGS classified them.','chip-sat':'The space stations and Hubble, placed live from their published orbits (CelesTrak).','chip-gs':'Volunteer antennas that receive satellites and share the data (SatNOGS).','chip-fb':'Bright meteors (fireballs) detected by U.S. government sensors, from NASA JPL CNEOS.','chip-moon':'The spot on Earth where the Moon is straight overhead right now.','chip-air':'How many aircraft volunteer receivers hear in each area (OpenSky). Areas, not individual planes.','chip-war':'Countries in ongoing armed conflicts, from Wikipedia\u2019s list.','chip-gps':'Areas where aircraft reported poor GPS accuracy yesterday (GPSJam). Jamming clusters around war zones.','chip-ai':'New AI models released, from Epoch AI\u2019s database.','xrayBtn':'Look through the Earth: quakes drawn at their real depth, 25 times deeper so you can see them.','img2dGo':'Imagery and lighting work on the 3D globe; this switches to it.'};
const QF={'Everything':'The default view: hazards, conflicts, volcanoes and the space stations.','Space':'Space stations and Hubble, volunteer ground stations and recent fireballs.','Earth & hazards':'Earthquakes, fire detections, storms, erupting volcanoes and disaster alerts.','Disruptions':'Severe U.S. weather alerts, GPS interference and air-traffic density.','Conflict & politics':'Countries in armed conflicts, and major disasters.'};
let explain=true;try{explain=localStorage.getItem('owl-explain')!=='0'}catch(e){}/* on unless the visitor switched it off (11 Nov 2026) */
function railTips(){Object.entries(RAIL).forEach(([id,t])=>{const e=document.getElementById(id);if(e&&!e.title&&!e.dataset.tipOff&&!e.dataset.tip)e.dataset.tipOff=t});
 document.querySelectorAll('#ops-rail .rail-filters button').forEach(b=>{const t=QF[b.textContent.trim()];if(t&&!b.title&&!b.dataset.tipOff)b.dataset.tipOff=t})}
setTimeout(railTips,1500);setTimeout(railTips,6000);setTimeout(railTips,15000);
function explainSwitch(){const rail=document.getElementById('ops-rail'),head=rail&&rail.querySelector('.rh');if(!head||document.getElementById('railExplain'))return!!head;
 const b=document.createElement('button');b.type='button';b.id='railExplain';b.className='rail-explain';b.setAttribute('role','switch');
 const set=v=>{explain=v;b.setAttribute('aria-checked',String(v));b.innerHTML=`<span class="re-q" aria-hidden="true">?</span><span class="re-t">Explain options</span><span class="re-s" aria-hidden="true"><i></i></span><span class="re-v">${v?'On':'Off'}</span>`;try{localStorage.setItem('owl-explain',v?'1':'0')}catch(e){}if(v)railTips()};
 set(explain);b.onclick=()=>{set(!explain);if(explain){b.dataset.tip='Explanations on: rest the pointer on any option to see what it does.';show(b);setTimeout(()=>{if(cur!==b)tip.hidden=true},2600);delete b.dataset.tip}else tip.hidden=true};
 head.after(b);return true}
(function tryS(n){if(!explainSwitch()&&n<40)setTimeout(()=>tryS(n+1),500)})(0);
const quiet=el=>{if(el.closest('.rail-filters')){if(el.title){el.dataset.tipOff=el.title;el.removeAttribute('title')}if(el.dataset.tip){el.dataset.tipOff=el.dataset.tip;delete el.dataset.tip}return true}/* no hover explanations on the quick filters (11 Nov 2026) */if(!el.closest('#ops-rail'))return false;if(el.id==='railExplain')return true;if(explain){if(el.title){el.dataset.tipOff=el.title;el.removeAttribute('title')}if(el.dataset.tipOff){el.dataset.tip=el.dataset.tipOff;delete el.dataset.tipOff}return false}if(el.dataset.tip&&!el.dataset.tipOff){el.dataset.tipOff=el.dataset.tip;delete el.dataset.tip}if(el.title){if(!el.getAttribute('aria-label')&&!el.textContent.trim())el.setAttribute('aria-label',el.title);el.dataset.tipOff=el.title;el.removeAttribute('title')}return true};/* no hover pop-ups in the left rail */
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const el=e.target.closest&&e.target.closest('[title],[data-tip],[data-tip-off]');if(!el||el===cur)return;if(quiet(el))return;
 if(el.title){el.dataset.tip=el.title;el.removeAttribute('title')}cur=el;clearTimeout(timer);timer=setTimeout(()=>show(el),280)},true);
document.addEventListener('pointerout',e=>{if(!cur)return;if(e.relatedTarget&&cur.contains(e.relatedTarget))return;clearTimeout(timer);tip.hidden=true;cur=null},true);
document.addEventListener('focusin',e=>{const el=e.target.closest&&e.target.closest('[title],[data-tip],[data-tip-off]');if(!el||quiet(el))return;if(el.title){el.dataset.tip=el.title;el.removeAttribute('title')}cur=el;show(el)});
document.addEventListener('focusout',()=>{tip.hidden=true;cur=null});
addEventListener('scroll',()=>{tip.hidden=true},true);
// one-time pointer to the Solar System view
function hint(){let seen=false;try{seen=localStorage.getItem('obs-hint-solar')==='1'}catch(e){}if(seen)return;const b=document.getElementById('zuni');if(!b||!b.offsetParent)return;
 const h=document.createElement('div');h.className='hint-bubble';h.innerHTML='<b>New:</b> fly out to the Solar System, live. <button aria-label="Dismiss">×</button>';document.body.appendChild(h);
 const place=()=>{const r=b.getBoundingClientRect();h.style.left=Math.max(8,Math.min(innerWidth-h.offsetWidth-8,r.left+r.width/2-h.offsetWidth/2))+'px';h.style.top=Math.max(8,r.top-h.offsetHeight-10)+'px'};place();
 const done=()=>{h.remove();try{localStorage.setItem('obs-hint-solar','1')}catch(e){}};h.querySelector('button').onclick=done;b.addEventListener('click',done,{once:true});setTimeout(done,12000);addEventListener('resize',place)}
setTimeout(hint,6000);
})();
