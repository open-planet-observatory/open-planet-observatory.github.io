// ---------- Start view: a calmer first screen (27 Nov 2026, the maintainer: people found the site overwhelming) ----------
// A first-time visitor's globe starts "Calm": earthquakes, storms and wildfires, volcanoes, tropical storms and the moving
// wind. The layers in CALM_OFF (satellites, armed conflicts, the Moon, animal movement and sightings) start switched off; nothing is
// removed: each is one click away in the layer list, and "Full" switches them all back on.
// How: this file only presses the existing layer switches, once, as they appear. It does not change any layer's own code,
// so each layer keeps its default for the "Everything" view.
// The choice is kept in this browser only (localStorage "owl-view"), never sent anywhere. ?view=full or ?view=calm in the
// address sets it for that visit (used by tests and by links that need the full globe).
// Undo completely: remove this file from build/build.mjs.
(function(){
if(!window.OBS_HOSTED)return;
const KEY='owl-view',VIEWS=['calm','full'];
// the switches that start off in the Calm view (their ids are the layer ids: chip-<id>)
const CALM_OFF=['sat','sat-nav','sat-broadband','sat-earth','sat-geo','sat-other','war','moon','nat-mig','nat-whales'];
const fromUrl=(location.search.match(/[?&]view=(calm|full)\b/)||[])[1];
let view='calm';try{const s=localStorage.getItem(KEY);if(VIEWS.includes(s))view=s}catch(e){}
if(fromUrl)view=fromUrl;
const chip=id=>document.getElementById('chip-'+id);
const isOn=c=>c.getAttribute('aria-pressed')==='true';
const press=(id,want)=>{const c=chip(id);if(!c)return false;if(isOn(c)!==want)c.click();return true};
// At start-up: in the Calm view, switch each listed layer off once, when its switch first appears (some are made late:
// the satellite groups arrive with the 3D globe). After that the visitor's own clicks are never undone.
const pending=new Set(view==='calm'?CALM_OFF:[]);
function settle(){for(const id of [...pending])if(press(id,false))pending.delete(id);return pending.size===0}
function watch(){if(settle())return;const t0=Date.now();const mo=new MutationObserver(()=>{if(settle()||Date.now()-t0>60000)mo.disconnect()});
 mo.observe(document.body,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),60000)}
// The visitor picks a view: every listed switch is set to match, and the choice is remembered.
function set(v,opts){if(!VIEWS.includes(v))return;view=v;pending.clear();try{if(!(opts&&opts.temp))localStorage.setItem(KEY,v)}catch(e){}
 CALM_OFF.forEach(id=>press(id,v==='full'));paint();quick();document.dispatchEvent(new CustomEvent('owl:view',{detail:{view:v}}))}
// The quick filters below (src/extras.js) show "Everything" as chosen, with a note that lists conflicts and the space
// stations. In the Calm view that would be untrue, so its button is shown as not chosen and the note says what is on.
let allNote=null;
function quick(){const b=document.querySelector('#themes button[data-k="all"]'),n=document.getElementById('themeNote');if(!b||!n)return;
 if(allNote===null)allNote=n.textContent;const anyChosen=[...document.querySelectorAll('#themes button')].some(x=>x!==b&&x.getAttribute('aria-pressed')==='true');if(anyChosen)return;
 if(view==='calm'){b.setAttribute('aria-pressed','false');n.textContent='Calm start: earthquakes, storms and wildfires, volcanoes and wind. A quick filter swaps in a different set.'}
 else{b.setAttribute('aria-pressed','true');n.textContent=allNote}}
// The control at the top of the layer list.
let box=null;
function paint(){if(!box)return;box.querySelectorAll('button[data-v]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===view)));
 box.querySelector('.sv-note').textContent=view==='calm'?'Calm starts with earthquakes, storms and wildfires, volcanoes and wind. Every other layer is in the list below.':'Full also starts with satellites, armed conflicts, the Moon overhead, animal movement and whale sightings.'}
// It sits just above the quick filters and the layer groups. Its class is not "rail-group" on purpose: src/railfmt.js files
// every rail-group away as a folding layer group.
function control(){if(box)return true;const rail=document.getElementById('ops-rail');const filt=rail&&rail.querySelector(':scope > .rail-filters');if(!filt)return false;
 box=document.createElement('div');box.className='sv-box';
 box.innerHTML='<span class="gl">Start with</span><div class="seg sv-seg" role="group" aria-label="How much the globe starts with"><button type="button" data-v="calm">Calm</button><button type="button" data-v="full">Full</button></div><span class="sv-note"></span>';
 filt.before(box);box.querySelectorAll('button[data-v]').forEach(b=>b.onclick=()=>set(b.dataset.v));paint();quick();return true}
const st=document.createElement('style');st.textContent='#ops-rail .sv-box{display:flex;flex-direction:column;gap:3px;margin:4px 0 8px}#ops-rail .sv-box>.gl{font-size:.72rem;font-weight:700;color:var(--ink-3);text-transform:uppercase;letter-spacing:.08em;padding:4px 2px 2px}#ops-rail .sv-seg{display:flex;gap:4px}#ops-rail .sv-seg button{flex:1}#ops-rail .sv-note{font-size:.7rem;line-height:1.35;color:var(--ink-3);padding:2px 2px 0}';document.head.appendChild(st);
function start(){watch();if(!control()){let n=0;const t=setInterval(()=>{if(control()||++n>80)clearInterval(t)},250)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.OwlView={get:()=>view,set,views:VIEWS.slice(),calmOff:CALM_OFF.slice()};
})();
