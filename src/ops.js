// ---------- Ops-room shell: rearranges the logbook page into a full-screen map with floating panels ----------
// Runs last. Everything is moved, not rebuilt, so the render functions keep working on the same elements.
(function(){
const O=window.__obs;if(!O)return;
const $=s=>document.querySelector(s);const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const html=document.documentElement;
// theme: "owl" (warm near-black, cream ink, ochre accent: the Owlmanac art) by default, remembered per browser.
// "light" and the older blue "dark" stay available. Browsers that stored "dark" before the owl theme existed move to owl once.
const THEMES=['owl','light','dark'];
let theme='owl';try{theme=localStorage.getItem('obs-theme')||'owl';if(!localStorage.getItem('obs-theme-v2')){if(theme==='dark')theme='owl';localStorage.setItem('obs-theme-v2','1');localStorage.setItem('obs-theme',theme)}}catch(e){}
if(!THEMES.includes(theme))theme='owl';
html.dataset.theme=theme;
html.classList.add('ops');

// ----- structure -----
const ops=document.createElement('div');ops.id='ops';
ops.innerHTML=`<div id="ops-map"></div>
<div id="ops-top" class="glass"></div>
<div id="ops-mid"><aside id="ops-rail" class="glass" aria-label="Map layers"></aside><div id="ops-center"><button class="fab iconbtn" id="railOpen" aria-label="Show layers" title="Layers">☰</button></div><aside id="ops-drawer" class="glass" aria-label="Panels"><div class="dh"><h2 id="drawerTitle"></h2><button class="iconbtn" id="drawerClose" aria-label="Close panel">×</button></div><div class="dbody" id="drawerBody"></div></aside></div>
<div id="ops-bottom" class="glass"><div class="regions" id="regions" role="group" aria-label="Fly to a region"></div><div class="ticker" aria-label="Latest, in the sources' own words"><span class="lab"><i></i>Latest</span><div class="clip"><div class="track" id="track"></div></div></div></div>`;
document.body.appendChild(ops);

// map: the whole instrument box becomes the background
const mapbox=$('#mapbox');if(!mapbox){html.classList.remove('ops');ops.remove();return}$('#ops-map').appendChild(mapbox);
const tip=$('#tip');if(tip)document.body.appendChild(tip);

// top bar
const top=$('#ops-top');
top.innerHTML=`<div class="brand"><img class="brand-logo" src="${window.OBS_LOGO||'brand/owlmanac-96.png'}" width="40" height="40" alt="The Owlmanac" title="The Owlmanac"><h1>Open Planet Observatory</h1><span class="eyebrow">Free public data · research &amp; education only</span></div>
<div class="right"><div class="stamp" id="stampSlot"></div><button class="tbtn" id="themeBtn" title="Switch light / dark"></button></div>
<div class="tabs" id="panelTabs" role="tablist"></div>`;
const qf=$('#qform');if(qf){const qb=document.createElement('div');qb.className='qslot';qb.appendChild(qf);top.insertBefore(qb,$('#panelTabs'));qf.addEventListener('submit',()=>openPanel('search'));$('#q').addEventListener('input',()=>{if($('#q').value.trim())openPanel('search')})}
const stamp=$('header.top .stamp');if(stamp){$('#stampSlot').append(...stamp.querySelectorAll('.pill'))}
const tb=$('#themeBtn');const TLABEL={owl:'Light mode',light:'Night mode',dark:'Owl mode'};const tlabel=()=>{tb.textContent=TLABEL[theme];tb.title='Theme: '+({owl:'Owl (warm dark)',light:'Light',dark:'Night (blue dark)'})[theme]+'. Click to switch.'};tlabel();tb.onclick=()=>{theme=THEMES[(THEMES.indexOf(theme)+1)%THEMES.length];html.dataset.theme=theme;tlabel();try{localStorage.setItem('obs-theme',theme)}catch(e){}};

// rail: view presets + map mode + layer groups
const rail=$('#ops-rail');
const GROUPS={Earth:['quake','fire','event','alert','volc','gdacs','odd'],Space:['sat','gs','fb'],'People & systems':['air','gps','war','econ'],Nature:[]};
rail.innerHTML=`<div class="rh"><span class="eyebrow">Views</span><button class="iconbtn" id="railClose" aria-label="Hide layers" title="Hide">‹</button></div>`;
[$('#themes'),$('#themeNote')].forEach(e=>{if(e)rail.appendChild(e)});
const seg=$('#viewseg');if(seg){const segRow=document.createElement('div');segRow.className='rail-group';segRow.innerHTML='<span class="gl">Map</span>';segRow.appendChild(seg);rail.appendChild(segRow)}
const chips=[...document.querySelectorAll('#layerbar .chip')];
const groupEl={};for(const g of Object.keys(GROUPS)){const d=document.createElement('div');d.className='rail-group';d.innerHTML=`<span class="gl">${g}</span>`;groupEl[g]=d;rail.appendChild(d)}
const place=c=>{const id=c.id.slice(5);let g=Object.keys(GROUPS).find(k=>GROUPS[k].includes(id));if(!g&&c.dataset.group)g=c.dataset.group;if(!g&&id.startsWith('nat-'))g='Nature';if(!g&&/^(sat|deb)-/.test(id))g='Space';
 if(g&&!groupEl[g]){const d=document.createElement('div');d.className='rail-group';d.innerHTML=`<span class="gl">${g}</span>`;groupEl[g]=d;rail.appendChild(d)}(groupEl[g]||groupEl.Earth).appendChild(c)};
chips.forEach(place);
// Switches created later (satellites, debris, Moon, AI releases…) are moved into their group as they appear.
const lb=document.getElementById('layerbar');if(lb)new MutationObserver(()=>lb.querySelectorAll('.chip').forEach(place)).observe(lb,{childList:true});
const foot=document.createElement('div');foot.className='rail-foot';if($('#keys'))foot.appendChild($('#keys'));foot.insertAdjacentHTML('beforeend','<span>Drag to turn, scroll to zoom, tap a mark for its source.</span>');rail.appendChild(foot);
$('#railClose').onclick=()=>html.classList.add('rail-closed');$('#railOpen').onclick=()=>html.classList.remove('rail-closed');

// drawer: one panel per section
const PANELS=[
 ['situations','Situations',['#situations']],
 ['disruptions','Disruptions',['#disruptions']],
 ['signals','Signals',['#readings','#signals']],
 ['climate','Climate',['#climate']],
 ['relief','Relief',['#relief']],
 ['worlds','Other worlds',['#worlds']],
 ['watch','Watch',['#watch']],
 ['unexplained','Unexplained',['#unexplained']],
 ['economy','Economy',['#economy']],
 ['nature','Nature',['#nature']],
 ['watchlist','Watchlist',['#watchlist']],
 ['country','Country brief',['#country']],
 ['search','Search',['#search']],
 ['cams','Live cams',['#cams']],
 ['layers','Layers & readings',['section[aria-labelledby="h-notes"]','section[aria-labelledby="h-read"]']],
 ['library','Sources',['#library']],
 ['classroom','Classroom',['#classroom']],
 ['free','Keep it free',['#free']],
 ['about','About',['.notice','section[aria-labelledby="h-resp"]','#use','section[aria-labelledby="h-how"]','footer']],
];
const body=$('#drawerBody');const tabs=$('#panelTabs');
const lede=$('header.top .lede');
PANELS.forEach(([k,label,sels])=>{const p=document.createElement('div');p.className='panel';p.dataset.k=k;if(k==='about'&&lede){const d=document.createElement('p');d.className='muted';d.textContent=lede.textContent;p.appendChild(d)}
 sels.forEach(s=>{const el=document.querySelector(s);if(el)p.appendChild(el)});body.appendChild(p);
 if(k==='country'||k==='search')return;const b=document.createElement('button');b.role='tab';b.dataset.k=k;b.textContent=label;b.onclick=()=>openPanel(k,true);tabs.appendChild(b)});
let cur=null;
function openPanel(k,toggle){if(toggle&&cur===k&&!html.classList.contains('drawer-closed')){closeDrawer();return}
 cur=k;html.classList.remove('drawer-closed');document.querySelectorAll('#drawerBody .panel').forEach(p=>p.dataset.on=p.dataset.k===k);
 document.querySelectorAll('#panelTabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===k));
 $('#drawerTitle').textContent=PANELS.find(p=>p[0]===k)[1];body.scrollTop=0;
 if(innerWidth<=860)html.classList.add('rail-closed');
 try{const v=(location.hash.match(/view=\w+/)||[])[0];history.replaceState(null,'','#'+(v?v+'&':'')+'panel='+k)}catch(e){}}
function closeDrawer(){html.classList.add('drawer-closed');document.querySelectorAll('#panelTabs button').forEach(b=>b.setAttribute('aria-pressed',false))}
$('#drawerClose').onclick=closeDrawer;
// in-page links (#use, #free, #situations…) open the matching panel
document.addEventListener('click',e=>{if(e.target.closest('button[data-layer]')&&innerWidth<=860){closeDrawer();return}const a=e.target.closest('a[href^="#"]');if(!a)return;const id=a.getAttribute('href').slice(1);const p=PANELS.find(([k,,s])=>k===id||s.includes('#'+id));if(p){e.preventDefault();openPanel(p[0])}else if(id==='map-sec'){e.preventDefault();if(innerWidth<=860)closeDrawer()}});
// "Show on map" buttons scroll to #map-sec in the logbook; here they should close the drawer on phones only
const hp=(location.hash.match(/panel=(\w+)/)||[])[1];
if(hp&&PANELS.some(p=>p[0]===hp))openPanel(hp);else if(innerWidth>860)openPanel('situations');else closeDrawer();
if(innerWidth<=860)html.classList.add('rail-closed');

// regions
const REGIONS=[['World',-30,20,true],['N. America',-98,42],['S. America',-60,-18],['Europe',12,50],['Africa',20,4],['Middle East',45,30],['S. Asia',78,22],['E. Asia',115,35],['SE Asia & Oceania',135,-10],['Arctic',0,80],['Antarctica',0,-80],['Pacific',-160,5],['Atlantic',-35,20]];
$('#regions').innerHTML=REGIONS.map(([n])=>`<button>${n}</button>`).join('');
[...$('#regions').children].forEach((b,i)=>b.onclick=()=>{const r=REGIONS[i];O.flyTo(r[1],r[2]);if(r[3])O.setSpin(true)});

// ticker: newest items, verbatim, each linked to its source
function buildTicker(){const items=[];
 const S=window.SIT||{},D=window.DIS||{};
 (S.gdacs||[]).slice(0,6).forEach(g=>items.push(['Disaster alert',g[1]+' · '+g[2]+' alert',g[7]||'https://www.gdacs.org','GDACS']));
 (S.who||[]).slice(0,3).forEach(w=>items.push(['Outbreak',w[0],w[3],'WHO']));
 Object.entries(D.news||{}).forEach(([k,arr])=>{if(Array.isArray(arr))arr.slice(0,2).forEach(a=>items.push(['Disruption · '+k,a[0],a[3],a[1]]))});
 (D.faa?.groundStops||[]).slice(0,3).forEach(g=>items.push(['Ground stop',g[0]+': '+g[1],'https://nasstatus.faa.gov/','FAA']));
 (D.services||[]).filter(s=>s[1]!=='none').slice(0,4).forEach(s=>items.push(['Status',s[0]+': '+s[2],s[5],s[0]+' status page']));
 (S.elections||[]).slice(0,3).forEach(e=>items.push(['Election '+e[0],e[1],e[2],'Wikipedia']));
 if(window.VOYAGER_TICK)items.unshift(window.VOYAGER_TICK);
 if(!items.length)items.push(['Quiet','No situations or disruptions collected yet','#','']);
 const one=items.map(([k,t,u,s])=>`<span><span class="k">${esc(k)}</span>${u&&u!=='#'?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`:`<span class="t">${esc(t)}</span>`}<span class="src">${esc(s)}</span></span>`).join('');
 const tr=$('#track');tr.innerHTML=one+one;tr.style.setProperty('--tick-s',Math.max(40,items.length*9)+'s')}
buildTicker();O.buildTicker=buildTicker;
// rebuild the ticker when live data arrives
['renderSit','renderDis'].forEach(fn=>{const f=O[fn];O[fn]=function(){f.apply(this,arguments);buildTicker()}});

// first-visit notice
let seen=false;try{seen=localStorage.getItem('obs-notice')==='1'}catch(e){}
if(!seen){const t=document.createElement('div');t.id='ops-toast';t.className='glass';t.innerHTML='<span><b>For research and education only.</b> Public data, shown as published. Not for tracking anyone or for emergency decisions.</span><button>OK</button>';document.body.appendChild(t);t.querySelector('button').onclick=()=>{t.remove();try{localStorage.setItem('obs-notice','1')}catch(e){}}}

window.__obs.openPanel=k=>openPanel(k);
// the map svg now fills the window; re-render once so the projection fits
requestAnimationFrame(()=>O.render());
})();
