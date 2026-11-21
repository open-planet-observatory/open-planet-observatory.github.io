// Internet traffic and attack trends, worldwide, as Cloudflare Radar publishes them (CC BY-NC 4.0). A section of the
// Internet & cloud status page (src/netstatus.js calls OwlNetTrends.html() and .wire()). Data: disruptions.radarTrends
// (collector/radartrends.mjs), about hourly. Every value is Cloudflare's own normalized figure: this week and the week
// before are drawn on the scale Cloudflare returned them on, and the site computes no change, score or ranking from them.
// Where attacks come from or whom they hit is not collected: the project attributes attacks to no one.
(function(){
'use strict';
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const STALE_H=6;
const data=()=>(window.DIS||{}).radarTrends||null;
const fresh=()=>{const d=data();return !!(d&&!d.failed&&d.asOf&&Date.now()-Date.parse(d.asOf)<STALE_H*36e5)};
const fmtT=iso=>{try{return new Date(iso).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return iso}};
const fmtH=ms=>new Date(ms).toLocaleString([], {weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const NORM={MIN0_MAX:'Each hour is a share of the busiest hour in these two weeks (busiest = 1).',MIN_MAX:'Scaled by Cloudflare between the lowest (0) and highest (1) hour of these two weeks.',PERCENTAGE:'Percent.',PERCENTAGE_CHANGE:'Percent change from Cloudflare\'s baseline.',RAW_VALUES:'Raw values.'};
const PROD={ddos:'DDoS protection',waf:'Web application firewall',ip_reputation:'IP reputation',access_rules:'Access rules',bot_management:'Bot management',api_shield:'API Shield',data_loss_prevention:'Data loss prevention'};
const CH=[['traffic','Internet traffic','All traffic reaching Cloudflare\'s network worldwide (NetFlows), not only web pages.'],
 ['l7','Application-layer attacks','Web requests Cloudflare blocked or challenged worldwide (mitigated HTTP requests).'],
 ['l3','Network-layer attacks','Denial-of-service traffic Cloudflare absorbed at the network layer worldwide, by volume.']];
const st=document.createElement('style');st.textContent=`
.nt-figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px;margin:10px 0}
.nt-fig{margin:0;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--panel);min-width:0}
.nt-fig figcaption{display:flex;flex-direction:column;gap:2px;margin-bottom:6px}.nt-fig figcaption b{font-size:.95rem}.nt-fig figcaption span,.nt-what{font-size:.78rem;color:var(--ink-3)}
.nt-leg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.76rem;color:var(--ink-2);margin-bottom:4px}.nt-leg span{display:inline-flex;align-items:center;gap:6px}
.nt-sw{display:inline-block;width:18px;height:0;border-top:2px solid var(--accent)}.nt-sw.prev{border-top:2px dashed var(--ink-3)}
.nt-plot{position:relative}.nt-plot svg{display:block;width:100%;height:auto;touch-action:pan-y}
.nt-grid{stroke:var(--line);stroke-width:1}.nt-ax{font-size:12.5px;fill:var(--ink-3)}
.nt-l{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}.nt-l.now{stroke:var(--accent)}.nt-l.prev{stroke:var(--ink-3);stroke-width:1.5;stroke-dasharray:4 4}
.nt-cross{stroke:var(--ink-3);stroke-width:1}.nt-dot{fill:var(--accent);stroke:var(--panel);stroke-width:2}
.nt-tip{position:absolute;top:0;pointer-events:none;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:6px 9px;font-size:.74rem;color:var(--ink);display:flex;flex-direction:column;gap:2px;white-space:nowrap;box-shadow:0 2px 10px rgb(0 0 0 / .18)}.nt-tip[hidden],.nt-cross[hidden],.nt-dot[hidden]{display:none}.nt-tip span{display:inline-flex;align-items:center;gap:6px;color:var(--ink-2)}
.nt-note{font-size:.74rem;color:var(--ink-3);margin:6px 0 0}
.nt-tab{margin-top:6px;font-size:.78rem}.nt-tab summary{cursor:pointer;color:var(--ink-2)}.nt-tab table{border-collapse:collapse;margin-top:6px;width:100%}.nt-tab th,.nt-tab td{text-align:left;padding:3px 8px 3px 0;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
.nt-mixes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px;margin:4px 0 10px}
.nt-mix{padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--panel);display:flex;flex-direction:column;gap:4px;min-width:0}.nt-mix b{font-size:.9rem}
.nt-mix ul{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}.nt-mix li{display:grid;grid-template-columns:minmax(0,11em) 1fr 3.6em;gap:8px;align-items:center;font-size:.8rem}
.nt-mn{color:var(--ink-2);overflow-wrap:anywhere}.nt-bar{height:8px;display:block}.nt-bar i{display:block;height:8px;min-width:2px;border-radius:0 4px 4px 0;background:var(--accent)}.nt-mv{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink)}
`;document.head.appendChild(st);
const W=560,H=150,L=34,R=8,T=8,B=22;
function chart(key,title,what,c){
 const now=c.now.v,prev=c.prev&&c.prev.v&&c.prev.v.length===now.length?c.prev.v:null;const n=now.length;
 const all=now.concat(prev||[]).filter(v=>v!=null);const max=Math.max(1e-9,...all);const top=max<=1.0001?1:max;
 const x=i=>L+(W-L-R)*i/(n-1),y=v=>T+(H-T-B)*(1-v/top);
 const path=a=>{let d='',pen=false;a.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);pen=true});return d};
 const t0=Date.parse(c.now.t0),days=[];for(let i=0;i<n;i++){const d=new Date(t0+i*36e5);if(d.getUTCHours()===0)days.push([i,d.toLocaleDateString([], {weekday:'short',timeZone:'UTC'})])}
 const ticks=[0,top/2,top].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="nt-grid"/><text x="${L-5}" y="${(y(v)+3.5).toFixed(1)}" text-anchor="end" class="nt-ax">${+v.toFixed(2)}</text>`).join('');
 return `<figure class="nt-fig" data-k="${key}"><figcaption><b>${esc(title)}</b><span>${esc(what)}</span></figcaption>
 <div class="nt-leg"><span><i class="nt-sw now"></i>Last 7 days</span>${prev?'<span><i class="nt-sw prev"></i>The 7 days before</span>':''}</div>
 <div class="nt-plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}, hourly, last 7 days${prev?' and the 7 days before':''}. The table below holds the values.">${ticks}
 ${days.map(([i,l])=>`<line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${H-B}" y2="${H-B+4}" class="nt-grid"/><text x="${x(i).toFixed(1)}" y="${H-6}" text-anchor="middle" class="nt-ax">${esc(l)}</text>`).join('')}
 ${prev?`<path d="${path(prev)}" class="nt-l prev"/>`:''}<path d="${path(now)}" class="nt-l now"/>
 <line class="nt-cross" x1="0" x2="0" y1="${T}" y2="${H-B}" hidden/><circle class="nt-dot" r="4" hidden/></svg><div class="nt-tip" hidden></div></div>
 <p class="nt-note">${esc(NORM[c.norm]||'Scaled by Cloudflare'+(c.norm?' ('+c.norm+')':'')+'.')} Times are UTC. The two lines share one scale because they came in one answer.</p>
 <details class="nt-tab"><summary>Values as a table (daily highest and lowest hour)</summary><table><thead><tr><th>Day (UTC)</th><th>Last 7 days: low – high</th>${prev?'<th>7 days before: low – high</th>':''}</tr></thead><tbody>${(()=>{const rows=[];for(let s=0;s<n;s+=24){const rng=a=>{const v=a.slice(s,s+24).filter(q=>q!=null);return v.length?Math.min(...v).toFixed(2)+' – '+Math.max(...v).toFixed(2):'no data'};rows.push(`<tr><td>${esc(new Date(t0+s*36e5).toLocaleDateString([], {weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}))}</td><td>${rng(now)}</td>${prev?'<td>'+rng(prev)+'</td>':''}</tr>`)}return rows.join('')})()}</tbody></table></details></figure>`;
}
function mix(title,what,m,label){const top=Math.max(...m.rows.map(r=>r[1]),1e-9);
 return `<div class="nt-mix"><b>${esc(title)}</b><span class="nt-what">${esc(what)}</span><ul>${m.rows.filter(r=>r[1]>=0.05).map(r=>`<li><span class="nt-mn">${esc(label(r[0]))}</span><span class="nt-bar"><i style="width:${(100*r[1]/top).toFixed(1)}%"></i></span><span class="nt-mv">${r[1].toFixed(1)}%</span></li>`).join('')}</ul></div>`}
function html(){const d=data();if(!d)return '';
 const src=`<p class="small muted nt-src">Source: <a href="https://radar.cloudflare.com/" target="_blank" rel="noopener">Cloudflare Radar ↗</a> (CC BY-NC 4.0)${d.asOf?' · collected '+esc(fmtT(d.asOf)):''} · read about once an hour.</p>`;
 if(!fresh())return `<section class="ns-g nt"><h3>Internet traffic and attacks, worldwide</h3><p class="small muted">Cloudflare Radar's trend figures ${d.failed?'could not be read':'are more than '+STALE_H+' hours old'}${d.asOf?' ('+esc(fmtT(d.asOf))+')':''}, so nothing is drawn. An older answer is never shown as current.</p>${src}</section>`;
 const charts=CH.filter(([k])=>d[k]&&d[k].now&&Array.isArray(d[k].now.v)&&d[k].now.v.length>=24).map(([k,t,w])=>chart(k,t,w,d[k])).join('');
 const mixes=(d.l7mix&&d.l7mix.rows&&d.l7mix.rows.length?mix('How application-layer attacks were stopped, last 24 hours','Share of mitigated requests by the Cloudflare product that stopped them.',d.l7mix,k=>{const q=String(k).toLowerCase();return PROD[q]||q.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase())}):'')+(d.l3mix&&d.l3mix.rows&&d.l3mix.rows.length?mix('Network-layer attacks by protocol, last 24 hours','Share of network-layer attack traffic by the protocol it used.',d.l3mix,k=>k.toUpperCase()):'');
 if(!charts&&!mixes)return '';
 const miss=(d.errors||[]).length?`<p class="small muted">Not read this time: ${esc(d.errors.map(e=>e.split(':')[0]).map(k=>({traffic:'traffic',l7:'application-layer attacks',l3:'network-layer attacks',l7mix:'the product shares',l3mix:'the protocol shares'}[k]||k)).join(', '))}. Nothing is drawn in their place.</p>`:'';
 return `<section class="ns-g nt"><h3>Internet traffic and attacks, worldwide</h3><p class="small muted">What Cloudflare measures on its own network, which carries a large share of the web. It is one company's view, not the whole internet, and the figures are Cloudflare's scaled values, not counts.</p>
 <div class="nt-figs">${charts}</div>${mixes?`<div class="nt-mixes">${mixes}</div>`:''}${miss}
 <p class="small muted"><b>Not shown, on purpose:</b> where attacks come from. Cloudflare can only see the last machine an attack passed through, which says nothing about who is behind it, and this site attributes attacks to no one.</p>${src}</section>`}
function wire(host){if(!host)return;host.querySelectorAll('.nt-fig').forEach(fig=>{const d=data();const c=d&&d[fig.dataset.k];if(!c)return;const svg=fig.querySelector('svg'),tip=fig.querySelector('.nt-tip'),cr=fig.querySelector('.nt-cross'),dot=fig.querySelector('.nt-dot'),plot=fig.querySelector('.nt-plot');
 const now=c.now.v,prev=c.prev&&c.prev.v&&c.prev.v.length===now.length?c.prev.v:null,n=now.length,t0=Date.parse(c.now.t0);const all=now.concat(prev||[]).filter(v=>v!=null);const max=Math.max(1e-9,...all),top=max<=1.0001?1:max;
 const show=cx=>{const r=svg.getBoundingClientRect();const fx=(cx-r.left)/r.width*W;let i=Math.round((fx-L)/(W-L-R)*(n-1));i=Math.max(0,Math.min(n-1,i));const X=L+(W-L-R)*i/(n-1);
  cr.setAttribute('x1',X);cr.setAttribute('x2',X);cr.hidden=false;if(now[i]!=null){dot.setAttribute('cx',X);dot.setAttribute('cy',T+(H-T-B)*(1-now[i]/top));dot.hidden=false}else dot.hidden=true;
  tip.innerHTML=`<b>${esc(fmtH(t0+i*36e5))}</b><span><i class="nt-sw now"></i>${now[i]==null?'no data':now[i].toFixed(3)}</span>${prev?`<span><i class="nt-sw prev"></i>a week earlier: ${prev[i]==null?'no data':prev[i].toFixed(3)}</span>`:''}`;tip.hidden=false;
  const pr=plot.getBoundingClientRect();const px=X/W*r.width;tip.style.left=Math.max(0,Math.min(pr.width-tip.offsetWidth,px+(px>pr.width/2?-tip.offsetWidth-10:10)))+'px'};
 const hide=()=>{tip.hidden=true;cr.hidden=true;dot.hidden=true};
 svg.addEventListener('pointermove',e=>show(e.clientX));svg.addEventListener('pointerdown',e=>show(e.clientX));svg.addEventListener('pointerleave',hide)})}
window.OwlNetTrends={html,wire,fresh,data,staleHours:STALE_H};
})();
