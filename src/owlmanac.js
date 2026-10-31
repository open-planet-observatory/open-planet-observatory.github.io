// ---------- The Owlmanac: the channel behind the Observatory ----------
// Header lockup + YouTube button, an episode shelf where each episode is paired with the map layer it explains,
// and links from the Moon card. Episode titles are the channel's own; links open YouTube (nothing embedded or re-hosted).
(function(){
const O=window.__obs;
const CH='https://www.youtube.com/@TheOwlmanac';
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// [title, url, series, layer chip id or '', fly-to [lon,lat] or null, why it pairs]
const EPISODES=[
 ['Something Exploded Over Siberia... and Left No Crater','https://www.youtube.com/shorts/xS1eBg9lEKI','Space','fb',[101.9,60.9],'Rocks from space still burst in the sky every week. The Fireballs layer shows the latest ones NASA recorded, at the height they exploded.'],
 ['In 1835, a Newspaper Said the Moon Had Bat-People','https://www.youtube.com/shorts/ZfCVucbsu7o','Space','moon',null,'Where the real Moon is right now, and how full it is, is in Signals.'],
 ['Venus Might Have Eaten Its Own Moon','https://www.youtube.com/shorts/ekZSpE7CdSM','Space','moon',null,'Our own Moon, live: phase, distance and the spot it is overhead.'],
 ["Nature's Sneakiest Hunters, Ranked",'https://www.youtube.com/watch?v=IQWoCqec3pU','Nature','nat-mammals',null,'Where people are spotting mammals this week (iNaturalist).'],
 ['This Bird Is as Loud as a Jackhammer, and He Aims It at His Date','https://www.youtube.com/shorts/YOrMZrlYIHE','Nature','nat-birds',[-60,4],'The white bellbird lives in the Amazon. The Birds layer shows where people are logging birds this week.'],
 ['Australia Declared War on Emus... and Lost','https://www.youtube.com/shorts/I_1bIQ7wHS8','History','nat-birds',[134,-26],'Bird sightings across Australia this week.'],
 ['Rats Are Snatching Bats Out of the Air in a German Cave','https://www.youtube.com/shorts/OdPFe8yTpTE','Nature','nat-mammals',[10.4,51.2],'Mammal sightings in Germany and the rest of Europe this week.'],
 ['Wild Chimps Keep Throwing Rocks at the Same Trees, and No One Knows Why','https://www.youtube.com/shorts/IvLN8fgyncw','Nature','nat-mammals',[-8,8],'Mammal sightings across West Africa this week.'],
 ["This Tortoise Hatched in 1832. He's Still Alive, and Scientists Just Read His DNA",'https://www.youtube.com/shorts/zT0zazGqGhk','Nature','nat-amphibians',[-5.7,-15.9],'Reptile and amphibian sightings this week.'],
 ['This Spider Builds a Catapult That Launches Ants Faster Than You Can See','https://www.youtube.com/shorts/p43jsCYEJKM','Nature','',null,''],
 ['Are Slugs Jealous of Snails? The Science Is a Plot Twist','https://www.youtube.com/shorts/jleqN8J8nQg','Nature','',null,''],
 ['The WWII Army Made of Balloons','https://www.youtube.com/shorts/vAxbid2E0N4','History','',null,''],
 ['The Chess "Robot" That Beat Napoleon Was a Lie','https://www.youtube.com/shorts/BHH2LTwna2I','History','',null,''],
 ['The 1904 Olympic Marathon Winner Was Fed Rat Poison by His Own Coaches','https://www.youtube.com/shorts/lraWgBJa-Gg','History','',null,''],
 ['Two Kids Fooled Sherlock Holmes\' Creator With Paper Fairies','https://www.youtube.com/shorts/kPGPzQFsFZI','History','',null,''],
];
const yt='<svg class="yt" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-4.8.5-4.8s0-3.2-.5-4.8ZM9.7 15.1V8.9l5.8 3.1-5.8 3.1Z"/></svg>';
// header: lockup + channel button
const brand=document.querySelector('#ops-top .brand');
if(brand&&!brand.querySelector('.owl-kicker')){const h1=brand.querySelector('h1');
 if(h1){const w=document.createElement('div');w.className='lockup';h1.parentNode.insertBefore(w,h1);w.innerHTML=`<a class="owl-kicker" href="${CH}" target="_blank" rel="noopener">The Owlmanac</a>`;w.appendChild(h1)}
 const logo=brand.querySelector('.brand-logo');if(logo&&!logo.closest('a')){const a=document.createElement('a');a.href=CH;a.target='_blank';a.rel='noopener';a.title='The Owlmanac on YouTube';logo.parentNode.insertBefore(a,logo);a.appendChild(logo)}}
const right=document.querySelector('#ops-top .top-right')||document.querySelector('#ops-top .themebtn')?.parentElement||document.querySelector('#ops-top');
if(right&&!document.getElementById('owlYt')){const b=document.createElement('a');b.id='owlYt';b.className='tbtn owl-yt';b.href=CH;b.target='_blank';b.rel='noopener';b.innerHTML=`${yt}<span>Watch The Owlmanac</span>`;b.title='The Owlmanac on YouTube: strange, true, seriously';
 const theme=[...right.querySelectorAll('button')].find(x=>/mode/i.test(x.textContent));if(theme)theme.parentNode.insertBefore(b,theme);else right.appendChild(b)}
// episode shelf, above NASA's stories
const sg=document.getElementById('storyGrid');
if(sg&&!document.getElementById('owlGrid')){const head=sg.previousElementSibling;
 const sec=document.createElement('div');sec.innerHTML=`<div class="owl-shelf-head"><img src="brand/owl-poly-256.png" alt="" loading="lazy"><div class="sec-head"><h3>From The Owlmanac</h3><p class="small muted">Strange, true, seriously. Short videos from the channel behind this site. Where an episode connects to something on the map, the button turns that layer on. <a href="${CH}" target="_blank" rel="noopener">All episodes on YouTube ↗</a></p></div></div><div class="cam-grid" id="owlGrid"></div>`;
 (head&&head.classList.contains('sec-head')?head:sg).before(...sec.childNodes);
 document.getElementById('owlGrid').innerHTML=EPISODES.map((e,i)=>`<article class="cam owl-ep"><span class="kind owl-kind" style="align-self:flex-start">The Owlmanac · ${esc(e[2])}</span><h3>${esc(e[0])}</h3>${e[5]?`<p class="small">${esc(e[5])}</p>`:''}<div class="owl-act"><a class="go" href="${esc(e[1])}" target="_blank" rel="noopener">${yt} Watch on YouTube ↗</a>${e[3]?`<button class="linkbtn" data-ep="${i}">Show on the map</button>`:''}</div></article>`).join('');
 document.querySelectorAll('#owlGrid [data-ep]').forEach(b=>b.onclick=()=>{const e=EPISODES[+b.dataset.ep];const c=document.getElementById('chip-'+e[3]);if(c&&c.getAttribute('aria-pressed')!=='true')c.click();
  let ll=e[4];if(!ll&&e[3]==='moon'&&O&&O.moonNow){const m=O.moonNow();ll=[m.lon,m.lat]}if(ll&&O&&O.flyTo)O.flyTo(ll[0],ll[1]);if(innerWidth<=860&&window.__opsCloseDrawer)window.__opsCloseDrawer()})}
// Moon card: the two Moon episodes
function moonLinks(){const c=document.getElementById('moonCard');if(!c||c.querySelector('.owl-moon'))return;const foot=c.querySelector('.sg-foot');const d=document.createElement('p');d.className='small owl-moon';
 d.innerHTML=`<b>From The Owlmanac:</b> ${EPISODES.filter(e=>e[3]==='moon').map(e=>`<a href="${esc(e[1])}" target="_blank" rel="noopener">${esc(e[0])} ↗</a>`).join(' · ')}`;if(foot)foot.before(d);else c.appendChild(d)}
moonLinks();const mh=document.getElementById('moonHost');if(mh)new MutationObserver(moonLinks).observe(mh,{childList:true});
// Intro splash (markup is written by the build before any script): hide it when the globe has drawn its first tiles, never before 1.6 s and never later than 7 s; any click or key skips it.
const sp=document.getElementById('owlSplash');
if(sp){const t0=performance.now();let ready=false,gone=false;const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const go=()=>{if(gone)return;gone=true;try{sessionStorage.setItem('owl-splash','1')}catch(e){}sp.classList.add('out');document.documentElement.classList.remove('owl-splash-on');sp.setAttribute('aria-hidden','true');setTimeout(()=>sp.remove(),rm?0:800);document.removeEventListener('keydown',go)};
 const minWait=rm?800:1600;const maybe=()=>{if(!ready)return;const left=minWait-(performance.now()-t0);if(left>0)setTimeout(go,left);else go()};
 document.addEventListener('obs:globe-ready',()=>{ready=true;maybe()},{once:true});
 sp.addEventListener('click',go);document.addEventListener('keydown',go);sp.querySelector('.go')?.focus({preventScroll:true});
 setTimeout(()=>{if(!document.getElementById('cesium'))go()},2500);
 setTimeout(go,7000)}
})();
