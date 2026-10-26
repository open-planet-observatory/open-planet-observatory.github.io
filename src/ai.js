// ---------- AI model releases by where they were built (Epoch AI, CC BY 4.0) ----------
// Country = the developing organisation's country as Epoch records it. Model and organisation names are Epoch's own.
(function(){
const O=window.__obs;if(!O)return;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtN=n=>Number(n).toLocaleString('en-US');
// Epoch country names → map country names; places too small for the world map get a fixed point.
const ALIAS={'United Kingdom of Great Britain and Northern Ireland':'United Kingdom','Korea (Republic of)':'South Korea','Republic of Korea':'South Korea','Russian Federation':'Russia','Czech Republic':'Czechia','Viet Nam':'Vietnam','Türkiye':'Turkey','Turkiye':'Turkey','Iran (Islamic Republic of)':'Iran','United Arab Emirates':'United Arab Emirates'};
const POINT={'Singapore':[103.82,1.35],'Hong Kong':[114.17,22.32],'Luxembourg':[6.13,49.61],'Malta':[14.5,35.9],'Bahrain':[50.56,26.07],'Monaco':[7.42,43.74]};
const firstLink=l=>(String(l||'').match(/https?:\/\/[^\s,]+/)||[''])[0];
function data(){const a=window.SNAP&&window.SNAP.aiModels;if(!a||!a.models)return null;return a}
function byCountry(days=120){const a=data();if(!a)return [];const cut=new Date(Date.now()-days*864e5).toISOString().slice(0,10);const m={};
 a.models.filter(x=>x[0]>=cut).forEach(x=>[...new Set(String(x[3]||'').split(',').map(s=>s.trim()).filter(Boolean))].forEach(c=>{(m[c]=m[c]||[]).push(x)}));
 return Object.entries(m).map(([c,models])=>{const name=ALIAS[c]||c;let lon,lat;
  if(POINT[c])[lon,lat]=POINT[c];else{const f=O.countries.find(f=>f.properties.name===name);if(f){const g=f.geometry;const big=g.type==='MultiPolygon'?g.coordinates.map(p=>({type:'Polygon',coordinates:p})).sort((x,y)=>d3.geoArea(y)-d3.geoArea(x))[0]:g;[lon,lat]=d3.geoCentroid(big)}}
  return {country:c,lon,lat,n:models.length,models}}).sort((a,b)=>b.n-a.n)}
O.aiByCountry=byCountry;
const tipHtml=d=>`<b>${esc(d.country)}: ${d.n} AI model${d.n>1?'s':''} released in 120 days</b>${d.models.slice(0,6).map(x=>`· ${esc(x[1])} (${esc(x[2])}, ${x[0]})`).join('<br>')}${d.n>6?'<br>…':''}<br><span style="opacity:.75">Epoch AI, Data on AI models · country of the developer</span>`;
O.aiTip=tipHtml;
// map layer (2D); the 3D globe draws its own from O.aiByCountry
const G=O.addLayer({id:'ai',name:'AI model releases',color:'--l-ai',shape:'circle',count:'',on:false,group:'People & systems'});
let sel=null;
function draw(){const rows=byCountry().filter(d=>d.lon!=null);
 sel=G.selectAll('g').data(rows,d=>d.country).join(en=>{const g=en.append('g').attr('class','ai-mk');g.append('circle');g.append('text').attr('class','nml').attr('text-anchor','middle').attr('dy',4);return g});
 sel.select('circle').attr('r',d=>5+3.2*Math.sqrt(d.n)).attr('fill','var(--l-ai)').attr('fill-opacity',.8).attr('stroke','var(--panel)').attr('stroke-width',1.5);
 sel.select('text').text(d=>d.n>1?d.n:'').attr('fill','#fff').style('font-size','10px').style('font-weight','700');
 O.bindTip(sel,tipHtml);const a=data();const ct=document.querySelector('#chip-ai .ct');if(ct)ct.textContent=a?fmtN(a.models.length)+' / 120 d':'next collection';O.render()}
O.onRender(()=>{if(sel)O.place(sel,d=>[d.lon,d.lat])});

// Watch → AI & tech: a card at the top of that tab
function card(){const a=data();if(!a)return `<article class="dis" id="aiCard"><h3>AI model releases, by where they were built</h3><p class="small muted">Arrives with the next data collection.</p></article>`;
 const yr=(a.byCountry365||[]).slice(0,8),mx=yr[0]?yr[0][1]:1;
 const badge=(t,c)=>`<span class="ai-b ${c}">${t}</span>`;
 return `<article class="dis" id="aiCard"><h3>AI model releases, by where they were built</h3>
 <p class="small muted">Every model in Epoch AI's database with a publication date in the past 120 days, with the country of the organisation that built it, as Epoch records it. Epoch adds models after release, so recent weeks keep filling in. Counts are releases, not a ranking of quality or size. <button class="linkbtn" id="aiMap">Show on map</button></p>
 <p class="small muted" style="margin:6px 0 4px"><b>Releases in the past 12 months, by country</b></p>
 <div class="ai-bars">${yr.map(([c,n])=>`<div class="ai-bar"><span class="t">${esc(c)}</span><span class="b"><i style="width:${Math.max(3,n/mx*100)}%"></i></span><span class="v">${fmtN(n)}</span></div>`).join('')}</div>
 <p class="small muted" style="margin:10px 0 4px"><b>Latest releases</b></p>
 <table class="tbl"><thead><tr><th>Date</th><th>Model</th><th>Built by</th><th>Where</th></tr></thead><tbody>${a.models.slice(0,14).map(x=>{const l=firstLink(x[8]);
  return `<tr><td class="n">${x[0]}</td><td>${l?`<a href="${esc(l)}" target="_blank" rel="noopener">${esc(x[1])}</a>`:esc(x[1])}${x[4]==='Y'?badge('open weights','ow'):''}${x[5]?badge('frontier','fr'):''}${x[6]?badge('notable','nt'):''}</td><td>${esc(x[2])}</td><td>${esc(x[3])}</td></tr>`}).join('')}</tbody></table>
 <div class="sg-foot"><span>Source: <a href="https://epoch.ai/data/ai-models" target="_blank" rel="noopener">Epoch AI, "Data on AI models"</a> (CC BY 4.0), updated daily; collected ${esc(a.asOf.replace('T',' ').replace('Z',' UTC'))}. "Frontier" and "notable" are Epoch's own labels.</span></div></article>`}
function aiTabActive(){const b=[...document.querySelectorAll('#wTabs button')].find(b=>b.getAttribute('aria-pressed')==='true');return b&&/AI/.test(b.textContent)}
function inject(){const body=document.getElementById('wBody');if(!body||!aiTabActive()||document.getElementById('aiCard'))return;
 body.insertAdjacentHTML('afterbegin',card());const btn=document.getElementById('aiMap');
 if(btn)btn.onclick=()=>{const c=document.getElementById('chip-ai');if(c&&c.getAttribute('aria-pressed')!=='true')c.click();const top=byCountry()[0];if(top&&top.lon!=null)O.flyTo(top.lon,top.lat)}}
const wb=document.getElementById('wBody');if(wb)new MutationObserver(inject).observe(wb,{childList:true});
draw();inject();
const prevSet=O.setSnap;if(prevSet)O.setSnap=function(){const r=prevSet.apply(this,arguments);try{draw();const c=document.getElementById('aiCard');if(c){c.remove();inject()}}catch(e){}return r};
})();
