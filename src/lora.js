// ---------- Low-power radio networks: LoRaWAN gateways on The Things Network ----------
// TTN Mapper's gateway list (PDDL 1.0), counted by the collector into 0.5° areas: no gateway ids, names or exact
// positions reach the page. Meshtastic and other mesh networks are linked, not collected (see DATA_POLICY.md).
(function(){
const O=window.__obs;if(!O)return;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtN=n=>Number(n).toLocaleString('en-US');
const L=()=>(window.SNAP||{}).lora;
O.addLayer({id:'lora',name:'LoRaWAN gateways (by area)',color:'--c-lora',shape:'square',count:'',on:false,group:'People & systems'});
document.documentElement.style.setProperty('--c-lora','#c77dff');
{const b=document.getElementById('chip-lora');if(b)b.title='The Things Network gateways that TTN Mapper heard in the past 5 days, counted in 0.5° areas (about 55 km). No single gateway is shown.'}
const chipOn=()=>{const c=document.getElementById('chip-lora');return !c||c.getAttribute('aria-pressed')==='true'};
const turnOn=()=>{const c=document.getElementById('chip-lora');if(c&&c.getAttribute('aria-pressed')!=='true')c.click()};
const setCount=t=>{const c=document.querySelector('#chip-lora .ct');if(c)c.textContent=t};
function cells(){return String((L()||{}).cells||'').split(';').filter(Boolean).map(x=>{const [lon,lat,n]=x.split(',').map(Number);return {lon,lat,n}})}
const col=n=>n>=20?'#f15bb5':n>=5?'#c77dff':n>=2?'#9d8df1':'#7b9acc';

// ----- 3D globe -----
let G3=null;
function draw(){if(!G3)return;const C=window.Cesium,{viewer,DS}=G3;
 if(!DS.lora){const d=new C.CustomDataSource('lora');viewer.dataSources.add(d);DS.lora=d}
 const d=DS.lora;d.show=chipOn()&&!document.documentElement.classList.contains('game-on');d.entities.removeAll();
 const A=cells(),half=((L()||{}).cell||.5)/2;
 A.forEach(c=>d.entities.add({position:C.Cartesian3.fromDegrees(c.lon,c.lat,2000),
  rectangle:{coordinates:C.Rectangle.fromDegrees(c.lon-half,c.lat-half,c.lon+half,c.lat+half),material:C.Color.fromCssColorString(col(c.n)).withAlpha(.55),height:1500,outline:false},
  description:`<b>${fmtN(c.n)} LoRaWAN gateway${c.n>1?'s':''} in this area</b>The Things Network gateways TTN Mapper heard in the past 5 days, in a 0.5° area around ${Math.abs(c.lat).toFixed(2)}°${c.lat>=0?'N':'S'}, ${Math.abs(c.lon).toFixed(2)}°${c.lon>=0?'E':'W'}.<br><span style="opacity:.75">TTN Mapper, PDDL 1.0 · counted by area, not placed at any gateway</span>`}));
 setCount(A.length?fmtN((L()||{}).gateways||0):'')}
function hook(){const g=window.__obs3d;if(!g||!window.Cesium)return false;G3=g;
 new MutationObserver(ms=>{if(ms.some(m=>m.target.id==='chip-lora'))draw()}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
 draw();return true}
if(!hook()){let n=0;const t=setInterval(()=>{if(hook()||++n>40)clearInterval(t)},500)}

// ----- Signals panel card -----
function render(){const R=L();const grid=document.getElementById('sigGrid');if(!grid)return;
 const anchor=document.getElementById('gradHost')||document.getElementById('radHost');let h=document.getElementById('loraHost');
 if(!h){h=document.createElement('div');h.id='loraHost';h.className='sg-grid';h.style.marginBottom='12px';anchor?anchor.after(h):grid.before(h)}
 const link=(t,u)=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
 const A=cells().sort((a,b)=>b.n-a.n);
 const nums=R?`<div class="enso-nums"><div><b>${fmtN(R.gateways)}</b><span>gateways heard in the past 5 days</span></div><div><b>${fmtN(A.length)}</b><span>0.5° areas with at least one</span></div>${A[0]?`<div><b>${fmtN(A[0].n)}</b><span>in the busiest area</span></div>`:''}</div>`
  :`<p class="small muted">Paused: TTN Mapper's server refused the site's daily request, so no gateway counts are shown until TTN Mapper agrees. Nothing is shown rather than old or copied numbers. TTN Mapper's own map is linked below.</p>`;
 h.innerHTML=`<article class="dis"><h3>Low-power radio networks (LoRa)</h3>${nums}
 <p class="small">LoRa is a long-range, low-power radio method that sends tiny messages a few kilometres in cities and much farther from hills, without a phone network. Two kinds of network use it. <b>LoRaWAN</b> links sensors (water meters, weather stations, parking bays, trackers on goods) to the internet through fixed gateways; The Things Network is a free community LoRaWAN that anyone can add a gateway to. <b>Mesh</b> networks such as Meshtastic link hand-held radios to each other with no internet at all, for hiking, events and emergencies. ${R?`Switch on "LoRaWAN gateways (by area)" under People &amp; systems to see where The Things Network has gateways.`:''}</p>
 <p class="small muted">Blind spots: this counts only The Things Network and networks that share data with it, as TTN Mapper sees them, and only gateways whose owners made their location public. Private company LoRaWANs, Helium and every mesh network are missing. Owners set their gateways' positions themselves. Shown only as counts per 0.5° area (about 55 km): gateway names, ids and exact positions are dropped before anything is saved, because many gateways sit in people's homes. For the same reason the site shows no Meshtastic nodes: their public map reports carry node names and positions. A count is not coverage; for measured coverage use TTN Mapper's own heatmap.</p>
 <div class="sg-foot"><span>${link('TTN Mapper','https://ttnmapper.org/heatmap/')} gateway list, PDDL 1.0, daily${R?' · collected '+esc(R.asOf):''} · ${link('The Things Network','https://www.thethingsnetwork.org/')} · ${link('Meshtastic','https://meshtastic.org/')} (link only) · ${R?'<button class="more" id="loraMap">Show on globe</button> · ':''}The Owlmanac is not affiliated with any of them.</span></div></article>`;
 const b=h.querySelector('#loraMap');if(b)b.onclick=()=>{turnOn();const c=A[0];if(c&&O.flyTo)O.flyTo(c.lon,c.lat)}}

function all(){try{render()}catch(e){console.warn(e)}try{draw()}catch(e){console.warn(e)}}
all();
const prev=O.setSnap;if(prev)O.setSnap=function(){const r=prev.apply(this,arguments);all();return r};
})();
