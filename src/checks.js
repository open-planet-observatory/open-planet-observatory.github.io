// ---------- Automatic data checks: a badge in the top bar and the full list in Sources ----------
// Reads data/checks.json (written by collector/checks.mjs on every collection). Only on the public site.
(function(){
if(!window.OBS_HOSTED)return;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ICON={pass:'✓',fail:'✕',warn:'!',skip:'–'},WORD={pass:'Passed',fail:'Failed',warn:'Warning',skip:'Not testable yet'};
async function load(){let c;try{c=await (await fetch('data/checks.json?t='+Date.now(),{cache:'no-store'})).json()}catch(e){return}
 // badge
 const slot=document.getElementById('stampSlot')||document.querySelector('header.top .stamp');if(slot){let b=document.getElementById('checksPill');
  if(!b){b=document.createElement('button');b.id='checksPill';b.type='button';b.onclick=()=>{const t=[...document.querySelectorAll('#panelTabs button')].find(x=>/Sources/.test(x.textContent));if(t)t.click();setTimeout(()=>document.getElementById('checksCard')?.scrollIntoView({block:'start'}),250)};slot.appendChild(b)}
  const tested=c.passed+c.failed+c.warnings;b.className='pill checks '+(c.failed?'bad':c.warnings?'warn':'ok');
  b.innerHTML=`<i></i>Data checks ${c.passed}/${tested}${c.failed?` · ${c.failed} failed`:''}`;b.title='Automatic checks run on every update. Click for the list.'}
 // card at the top of Sources
 const lib=document.getElementById('library');if(!lib)return;let card=document.getElementById('checksCard');
 if(!card){card=document.createElement('article');card.id='checksCard';card.className='dis checks-card';const h=lib.querySelector('.sec-head');(h||lib.firstChild).after(card)}
 const areas=[...new Set(c.results.map(r=>r.area))];
 card.innerHTML=`<h3>Automatic data checks</h3><p class="small muted">Run on every update (every 10 minutes) against facts a specialist would sign off on: where whales are in February, how high the space station flies, whether earthquakes have real positions. A failed check in a map layer keeps that item off the map instead of showing something wrong. Last run ${esc(c.asOf.replace('T',' ').replace('Z',' UTC'))}: <b>${c.passed} passed</b>, ${c.failed} failed, ${c.warnings} warnings.</p>`+
  areas.map(a=>`<p class="small" style="margin:10px 0 4px"><b>${esc(a)}</b></p><div class="sg-list">${c.results.filter(r=>r.area===a).map(r=>`<div class="sg-row chk ${r.status}"><span class="t"><span class="ic" title="${WORD[r.status]}">${ICON[r.status]}</span> ${esc(r.rule)}${r.detail?`<span class="sub">${esc(r.detail)}</span>`:''}</span><span class="v">${WORD[r.status]}</span></div>`).join('')}</div>`).join('')+
  `<div class="sg-foot"><span>The rules are in <a href="https://github.com/open-planet-observatory/open-planet-observatory.github.io/blob/main/collector/checks.mjs" target="_blank" rel="noopener">collector/checks.mjs</a>; suggest one by opening an issue.</span></div>`}
load();setInterval(load,5*60e3);
})();
