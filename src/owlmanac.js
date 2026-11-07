// ---------- The Owlmanac: the channel behind the Observatory ----------
// Header lockup + YouTube button, an episode shelf where each episode is paired with the map layer it explains,
// and links from the Moon card. Episode titles are the channel's own; episode links open YouTube. The channel card plays the teasers in YouTube's own player, loaded only on press (nothing re-hosted).
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
if(brand&&!brand.querySelector('.owl-kicker')){
 const logo=brand.querySelector('.brand-logo');if(logo&&!logo.closest('a')){const a=document.createElement('a');a.href=CH;a.target='_blank';a.rel='noopener';a.title='The Owlmanac on YouTube';logo.parentNode.insertBefore(a,logo);a.appendChild(logo)}}
const right=document.querySelector('#ops-top .top-right')||document.querySelector('#ops-top .themebtn')?.parentElement||document.querySelector('#ops-top');
if(right&&!document.getElementById('owlYt')){const b=document.createElement('a');b.id='owlYt';b.className='tbtn owl-yt';b.href=CH;b.target='_blank';b.rel='noopener';b.innerHTML=`${yt}<span>The Owlmanac on YouTube</span>`;b.title='The Owlmanac on YouTube: watch the trailer, subscribe';b.setAttribute('aria-haspopup','dialog');
 /* a plain click opens the channel card (trailer, Short, subscribe); a modified click still opens YouTube (the maintainer, 6 Nov 2026) */
 b.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;e.preventDefault();channelCard()});
 const theme=[...right.querySelectorAll('button')].find(x=>/mode/i.test(x.textContent));if(theme)theme.parentNode.insertBefore(b,theme);else right.appendChild(b)}

// ---------- the channel card: the YouTube channel's own videos, clearly the channel's, not the Observatory's ----------
let chEl=null,chBack=null;
function chClose(){if(!chEl||chEl.hidden)return;chEl.hidden=true;chEl.querySelectorAll('.och-v').forEach(v=>{const f=v.querySelector('iframe,video');if(f){if(f.pause)f.pause();f.remove();v.classList.remove('on')}});try{window.OwlMusic&&OwlMusic.duck(false)}catch(e){}if(chBack&&chBack.focus)chBack.focus()}
function channelCard(){chBack=document.activeElement;
 if(!chEl){chEl=document.createElement('div');chEl.id='owlCh';chEl.className='och';chEl.hidden=true;document.body.appendChild(chEl);
  chEl.addEventListener('click',e=>{if(e.target===chEl)chClose()});document.addEventListener('keydown',e=>{if(e.key==='Escape')chClose()})}
 const T=(window.OWL_TEASERS||[]);const VY=(window.voyagerVideoList?window.voyagerVideoList():[]);
 const slot=t=>{const ok=t.src||t.id;return `<figure class="och-v och-${t.kind}${ok?'':' soon'}">${ok?`<button type="button" class="och-play" ${t.src?`data-src="${esc(t.src)}"`:`data-yt="${esc(t.id)}"`} data-poster="${esc(t.poster)}" aria-label="Play ${esc(t.title)}${t.src?'':' (from YouTube)'}">`:'<div class="och-play">'}<img src="${esc(t.poster)}" alt="" loading="lazy"><span class="och-tri" aria-hidden="true">${ok?'▶':''}</span>${ok?'':'<span class="och-soon">Coming soon to YouTube</span>'}${ok?'</button>':'</div>'}<figcaption><b>${t.kind==='short'?'Short':'Trailer'}</b> · ${esc(t.title)}${t.id?` · <a href="https://www.youtube.com/${t.kind==='short'?'shorts/':'watch?v='}${esc(t.id)}" target="_blank" rel="noopener">YouTube ↗</a>`:''}</figcaption></figure>`};
 chEl.innerHTML=`<div class="och-box glass" role="dialog" aria-modal="true" aria-labelledby="ochH">
  <div class="och-h"><span class="och-logo">${yt}</span><div><div class="och-k">YouTube channel</div><h2 id="ochH">The Owlmanac</h2></div><button type="button" class="och-x" aria-label="Close">×</button></div>
  <p class="och-s">Strange, true, seriously: short videos from the channel behind this site. They are the channel's own work, not part of the Observatory's data: many of their pictures are AI illustrations, which the videos mark, and real images such as NASA's are credited.</p>
  <div class="och-vids">${T.map(slot).join('')}</div>
  ${VY.length?`<p class="och-next"><b>Coming up:</b> ${VY.map(v=>v.live?`<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)} ↗</a>`:`${esc(v.title)} <span class="och-when">(${esc(v.when)})</span>`).join(' · ')}</p>`:''}
  <div class="och-act"><a class="och-sub" href="${CH}?sub_confirmation=1" target="_blank" rel="noopener">${yt} Subscribe on YouTube</a><a class="tbtn" href="${CH}" target="_blank" rel="noopener">The channel on YouTube ↗</a><button type="button" class="tbtn" data-och="shelf">Episodes paired with the map</button></div>
  <p class="och-fine">Nothing plays or downloads until you press play. The trailer is stored on this site; YouTube's player (youtube-nocookie.com) loads only for videos hosted there.</p></div>`;
 chEl.querySelector('.och-x').onclick=chClose;
 chEl.querySelector('[data-och="shelf"]').onclick=()=>{chClose();if(O&&O.openPanel)O.openPanel('cams');setTimeout(()=>{const g=document.getElementById('owlGrid');g&&g.scrollIntoView({block:'start'})},300)};
 chEl.querySelectorAll('[data-src]').forEach(b=>b.onclick=()=>{const v=b.closest('.och-v');const m=document.createElement('video');m.src=b.dataset.src;m.poster=b.dataset.poster;m.controls=true;m.playsInline=true;m.preload='auto';m.setAttribute('aria-label',b.getAttribute('aria-label').replace('Play ',''));v.classList.add('on');b.after(m);try{window.OwlMusic&&OwlMusic.duck(true)}catch(e){}const p=m.play();if(p&&p.catch)p.catch(()=>{})});
 chEl.querySelectorAll('[data-yt]').forEach(b=>b.onclick=()=>{const v=b.closest('.och-v');const f=document.createElement('iframe');f.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.yt)}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;f.title=b.getAttribute('aria-label').replace(' (from YouTube)','');f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';v.classList.add('on');b.after(f);try{window.OwlMusic&&OwlMusic.duck(true)}catch(e){}});
 chEl.hidden=false;chEl.querySelector('.och-x').focus()}
window.OwlChannel={open:channelCard,close:chClose};
// episode shelf, above NASA's stories
const sg=document.getElementById('storyGrid');
if(sg&&!document.getElementById('owlGrid')){const head=sg.previousElementSibling;
 const sec=document.createElement('div');sec.innerHTML=`<div class="owl-shelf-head"><img src="brand/owl-poly-256.png" alt="" loading="lazy"><div class="sec-head"><h3>From The Owlmanac</h3><p class="small muted">Strange, true, seriously. Short videos from the channel behind this site. Where an episode connects to something on the map, the button turns that layer on. <a href="${CH}" target="_blank" rel="noopener">All episodes on YouTube ↗</a></p></div></div><div class="cam-grid" id="owlGrid"></div>`;
 (head&&head.classList.contains('sec-head')?head:sg).before(...sec.childNodes);
 /* The Owlmanac's Voyager videos lead the shelf; before release each shows its date instead of a link (Derik, 4 Nov 2026) */
 const VY=(window.voyagerVideoList?window.voyagerVideoList():[]).map(v=>({v,html:`<article class="cam owl-ep owl-vy"><span class="kind owl-kind" style="align-self:flex-start">The Owlmanac · Space · ${v.kind==='film'?'Full film':'Short'}</span><h3>${esc(v.title)}</h3><p class="small">Voyager 1 becomes the first spacecraft one light-day from Earth: the site counts down to the moment with NASA JPL's distances.</p><div class="owl-act">${v.live?`<a class="go" href="${esc(v.url)}" target="_blank" rel="noopener">${yt} Watch on YouTube ↗</a>`:`<span class="owl-soon">Coming ${esc(v.when)}</span>`}<button class="linkbtn" data-vy="1">Open the countdown</button></div></article>`}));
 document.getElementById('owlGrid').innerHTML=VY.map(x=>x.html).join('')+EPISODES.map((e,i)=>`<article class="cam owl-ep"><span class="kind owl-kind" style="align-self:flex-start">The Owlmanac · ${esc(e[2])}</span><h3>${esc(e[0])}</h3>${e[5]?`<p class="small">${esc(e[5])}</p>`:''}<div class="owl-act"><a class="go" href="${esc(e[1])}" target="_blank" rel="noopener">${yt} Watch on YouTube ↗</a>${e[3]?`<button class="linkbtn" data-ep="${i}">Show on the map</button>`:''}</div></article>`).join('');
 document.querySelectorAll('#owlGrid [data-vy]').forEach(b=>b.onclick=()=>{const c=document.getElementById('gnVoyager');if(c&&!c.hidden)c.click();else if(O&&O.openPanel)O.openPanel('situations')});
 document.querySelectorAll('#owlGrid [data-ep]').forEach(b=>b.onclick=()=>{const e=EPISODES[+b.dataset.ep];const c=document.getElementById('chip-'+e[3]);if(c&&c.getAttribute('aria-pressed')!=='true')c.click();
  let ll=e[4];if(!ll&&e[3]==='moon'&&O&&O.moonNow){const m=O.moonNow();ll=[m.lon,m.lat]}if(ll&&O&&O.flyTo)O.flyTo(ll[0],ll[1]);if(innerWidth<=860&&window.__opsCloseDrawer)window.__opsCloseDrawer()})}
// Moon card: the two Moon episodes
function moonLinks(){const c=document.getElementById('moonCard');if(!c||c.querySelector('.owl-moon'))return;const foot=c.querySelector('.sg-foot');const d=document.createElement('p');d.className='small owl-moon';
 d.innerHTML=`<b>From The Owlmanac:</b> ${EPISODES.filter(e=>e[3]==='moon').map(e=>`<a href="${esc(e[1])}" target="_blank" rel="noopener">${esc(e[0])} ↗</a>`).join(' · ')}`;if(foot)foot.before(d);else c.appendChild(d)}
moonLinks();const mh=document.getElementById('moonHost');if(mh)new MutationObserver(moonLinks).observe(mh,{childList:true});
// Intro splash (markup is written by the build before any script). It stays until the visitor chooses: Enter, Esc, or one of the
// starting points under it (Derik, 7 Nov 2026: no automatic switch to the home page; site tour, universe tour, fly-through and the YouTube channel from here).
const sp=document.getElementById('owlSplash');
if(sp){let gone=false;const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const go=()=>{if(gone)return;gone=true;try{sessionStorage.setItem('owl-splash','1')}catch(e){}sp.classList.add('out');document.documentElement.classList.remove('owl-splash-on');sp.setAttribute('aria-hidden','true');setTimeout(()=>sp.remove(),rm?0:800);document.removeEventListener('keydown',key)};
 const key=e=>{if(e.key==='Escape')go()};
 document.addEventListener('obs:globe-ready',()=>{sp.classList.add('ready')},{once:true});
 sp.querySelector('.go')?.addEventListener('click',go);document.addEventListener('keydown',key);sp.querySelector('.go')?.focus({preventScroll:true});
 /* the starting points wait for the page behind to be ready enough, then run */
 const when=(ok,fn,t0=Date.now())=>{if(ok())fn();else if(Date.now()-t0<20000)setTimeout(()=>when(ok,fn,t0),200)};
 sp.querySelectorAll('[data-sp]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.sp;go();
  if(k==='site')when(()=>window.OwlSiteTour,()=>window.OwlSiteTour.start());
  else when(()=>window.__obs&&window.__obs.openUniverse,()=>{if(window.OwlMusic&&window.OwlMusic.autoOn)window.OwlMusic.autoOn();window.__obs.openUniverse(k==='fly'?'flight':'tour')})}))}
})();
