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
 /* The Owlmanac's Voyager videos lead the shelf; before release each shows its date instead of a link (the maintainer, 4 Nov 2026) */
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
// starting points under it (the maintainer, 7 Nov 2026: no automatic switch to the home page; site tour, universe tour, fly-through and the YouTube channel from here).
/* the turning emblem (a real 3D model: assets/emblem/emblem.js) lives in the splash's lower right */
/* where the bright star of the artwork is on screen (it sits in the image's top-right corner; the picture is drawn with object-fit:cover at 62% 50%) */
function starAt(sp){const im=sp.querySelector('img');if(!im||!im.naturalWidth)return null;const ph=/phone/.test(im.currentSrc||'');const fx=ph?.965:.996,fy=ph?.031:.071;
 const ox=parseFloat(getComputedStyle(im).objectPosition)/100;const W=innerWidth,H=innerHeight,w=im.naturalWidth,h=im.naturalHeight,k=Math.max(W/w,H/h);return [(W-w*k)*(isNaN(ox)?.62:ox)+fx*w*k,(H-h*k)*.5+fy*h*k]}
function emblem(sp){const box=sp.querySelector('.mark3d');if(!box)return null;let stop=null,dead=false;import('./assets/emblem/emblem.js').then(m=>{if(!dead)stop=m.mountEmblem(box,{star:()=>starAt(sp)})}).catch(e=>console.warn('emblem',e));return()=>{dead=true;if(stop)stop()}}
function wire(sp,again){let gone=false;const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;const em=emblem(sp);
 const go=()=>{if(gone)return;gone=true;try{sessionStorage.setItem('owl-splash','1')}catch(e){}sp.classList.add('out');document.documentElement.classList.remove('owl-splash-on');sp.setAttribute('aria-hidden','true');setTimeout(()=>{sp.remove();if(em)em()},rm?0:800);document.removeEventListener('keydown',key)};
 const key=e=>{if(e.key==='Escape')go()};
 if(again)sp.classList.add('ready');else document.addEventListener('obs:globe-ready',()=>{sp.classList.add('ready')},{once:true});
 sp.querySelector('.go')?.addEventListener('click',go);document.addEventListener('keydown',key);sp.querySelector('.go')?.focus({preventScroll:true});
 /* the starting points wait for the page behind to be ready enough, then run */
 const when=(ok,fn,t0=Date.now())=>{if(ok())fn();else if(Date.now()-t0<20000)setTimeout(()=>when(ok,fn,t0),200)};
 sp.querySelectorAll('[data-sp]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.sp;go();
  if(k==='site')when(()=>window.OwlSiteTour,()=>window.OwlSiteTour.start());
  else if(k==='owl')when(()=>window.OwlFindOwl&&window.__obs3d&&window.__obs3d.viewer,()=>dispatchEvent(new Event('obs:findowl'))); /* 9 Nov 2026: Find the owl and the Classroom featured on the landing page */
  else if(k==='new')when(()=>window.__obs&&window.__obs.openPanel&&window.OwlPage,()=>{window.__obs.openPanel('changes');window.OwlPage.open('changes',{solo:true})});
  else if(k==='class')when(()=>window.__obs&&window.__obs.openPanel&&window.OwlPage,()=>window.__obs.openPanel('classroom'));
  else{const M=window.OwlMusic;if(k==='fly'){if(M&&M.start&&!M.on){M.start(true);window.__owlTempMusic=true}}/* start the score inside the click, where browsers allow sound; the flight hands it back afterwards */else if(M&&M.autoOn)M.autoOn();
   when(()=>window.__obs&&window.__obs.openUniverse,()=>window.__obs.openUniverse(k==='fly'?'flight':'tour'))}}))}
const sp=document.getElementById('owlSplash');if(sp)wire(sp,false);
/* the wordmark in the header brings people back here (the maintainer, 8 Nov 2026: "the nicest looking, with the highest level options") */
window.OwlSplash={show(){if(document.getElementById('owlSplash')||!window.__owlSplashHTML)return;const t=document.createElement('div');t.innerHTML=window.__owlSplashHTML;const el=t.firstElementChild;el.classList.add('again');document.body.appendChild(el);document.documentElement.classList.add('owl-splash-on');wire(el,true)}};
/* The Owlmanac end card (9 Nov 2026: "end all tours with that"): fade to black, the turning 3D emblem, the name and the
   address, then ways on. OwlEndCard.show({ again: [label, fn], home: [label, fn] }). Esc, ×, or a click outside the buttons closes it. */
window.OwlEndCard={show(o){o=o||{};if(document.getElementById('uniOutro'))return;const w=document.createElement('div');w.id='uniOutro';w.setAttribute('role','dialog');w.setAttribute('aria-label','The Owlmanac Observatory');
 const btn=(k,t)=>`<button type="button" data-o="${k}">${t}</button>`;
 w.innerHTML='<div class="uo-in"><div class="uo-em" aria-hidden="true"></div><div class="uo-t"><b>The Owlmanac<sup>™</sup> Observatory</b><span>theowlmanac.com</span></div><div class="uo-b">'+(o.again?btn('again','↻ '+o.again[0]):'')+(o.home?btn('home',o.home[0]):'')+'<a href="https://www.youtube.com/@TheOwlmanac" target="_blank" rel="noopener" data-o="yt">The Owlmanac on YouTube ↗</a></div></div><button type="button" class="uo-x" aria-label="Close">×</button>';
 document.body.appendChild(w);let stopE=null,done=false;import('./assets/emblem/emblem.js').then(m=>{if(!done)stopE=m.mountEmblem(w.querySelector('.uo-em'))}).catch(e=>console.warn('emblem',e));
 const end=()=>{if(done)return;done=true;removeEventListener('keydown',key,true);w.classList.remove('on');setTimeout(()=>{if(stopE)stopE();w.remove()},700);if(o.onClose)try{o.onClose()}catch(e){}};
 const key=e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();end()}};addEventListener('keydown',key,true);
 w.addEventListener('click',e=>{const b=e.target.closest('[data-o]');if(!b){if(!e.target.closest('.uo-in'))end();return}if(b.dataset.o==='yt')return;end();const f=b.dataset.o==='again'?o.again&&o.again[1]:o.home&&o.home[1];if(f)setTimeout(f,300)});
 w.querySelector('.uo-x').onclick=end;requestAnimationFrame(()=>w.classList.add('on'));setTimeout(()=>{const f=w.querySelector('[data-o]');if(f)f.focus({preventScroll:true})},700)}};

/* the emblem at the top of About (9 Nov 2026: "look for other places to incorporate that image") */
(function aboutEmblem(){const p=document.querySelector('#drawerBody .panel[data-k="about"]');if(!p){setTimeout(aboutEmblem,1500);return}
 const box=document.createElement('div');box.className='ab-em';box.innerHTML='<div class="ab-em-g" aria-hidden="true"></div><div><b>The Owlmanac<sup>™</sup> Observatory</b><span>Free public data on one globe, for research and education.</span></div>';p.insertBefore(box,p.firstChild);
 let stop=null;const sync=()=>{const on=p.dataset.on==='true'&&p.offsetParent;if(on&&!stop){stop='…';import('./assets/emblem/emblem.js').then(m=>{stop=m.mountEmblem(box.querySelector('.ab-em-g'))}).catch(()=>{stop=null})}else if(!on&&stop&&typeof stop==='function'){stop();stop=null}};
 new MutationObserver(sync).observe(p,{attributes:true,attributeFilter:['data-on']});new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});sync()})();

/* What the emblem is, and where to go next: opened by a click on any turning emblem (assets/emblem/emblem.js) */
window.OwlEmblemCard={show(){if(document.getElementById('owlEmCard'))return;const w=document.createElement('div');w.id='owlEmCard';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');w.setAttribute('aria-labelledby','oecH');
 w.innerHTML='<div class="oec"><button type="button" class="oec-x" aria-label="Close">×</button><h3 id="oecH">Many eyes, one world</h3><p>Owls are patient watchers that see in the dark. Here, sixty of them look out in every direction from one shape: many viewpoints, many sources, all turned on the same world, which is how this site works. Every figure comes from someone who measured it, and every source shows what it cannot see.</p><p>The shape is a <b>small stellated dodecahedron</b>, a star with twelve points, like light reaching out in all directions. Among the sixty owls, <b>one is ochre</b>: that one is you, the observer who joins in. Drag the emblem to find her.</p><p class="oec-note">The engraved owls come from the site’s banner art, made with an AI image tool.</p><div class="oec-go"><button type="button" data-g="owl">🦉 Find the owl</button><button type="button" data-g="class">✎ Classroom</button><button type="button" data-g="tour">ⓘ Take the site tour</button></div></div>';
 document.body.appendChild(w);const close=()=>{w.remove();removeEventListener('keydown',k,true)};const k=e=>{if(e.key==='Escape'){e.stopPropagation();close()}};addEventListener('keydown',k,true);
 w.addEventListener('click',e=>{if(e.target===w||e.target.closest('.oec-x'))return close();const b=e.target.closest('[data-g]');if(!b)return;close();const sp=document.getElementById('owlSplash');if(sp){const go=sp.querySelector(`[data-sp="${b.dataset.g==='tour'?'site':b.dataset.g}"]`);if(go){go.click();return}}
  const uo=document.getElementById('uniOutro');if(uo)uo.querySelector('.uo-x')?.click();const O=window.__obs||{};if(document.querySelector('#uni.on')&&O.closeUniverse)O.closeUniverse();
  if(b.dataset.g==='owl')setTimeout(()=>dispatchEvent(new Event('obs:findowl')),400);else if(b.dataset.g==='class'){if(O.openPanel)O.openPanel('classroom')}else if(window.OwlSiteTour)setTimeout(()=>window.OwlSiteTour.start(),400)});
 setTimeout(()=>w.querySelector('[data-g]').focus({preventScroll:true}),50)}};

/* What's new: a curated list (assets/site/changes.json), newest first, each with a way to try it */
(function changes(){const h=document.getElementById('changesHost');if(!h)return;const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 fetch('assets/site/changes.json?h='+Math.floor(Date.now()/36e5)).then(r=>r.json()).then(J=>{const it=J.items||[];
  h.innerHTML='<div class="chg-list">'+it.map((x,i)=>`<article class="chg"><time datetime="${esc(x.d)}">${esc(new Date(x.d+'T12:00Z').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}))}</time><div><h4>${esc(x.t)}</h4><p>${esc(x.p)}</p>${x.try?`<button type="button" class="chg-try" data-i="${i}">Try it ›</button>`:''}</div></article>`).join('')+'</div>';
  h.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const t=it[+b.dataset.i].try,O=window.__obs||{};if(window.OwlPage&&window.OwlPage.isOpen())window.OwlPage.close();setTimeout(chgBack,400);
   if(t[0]==='panel'){if(O.openPanel)O.openPanel(t[1])}else if(t[0]==='universe'){if(window.__opsCloseDrawer)window.__opsCloseDrawer();if(O.openUniverse)O.openUniverse(t[1])}else if(t[0]==='hub'){setTimeout(()=>{if(window.__owlHub)window.__owlHub(t[1])},0)}else if(t[0]==='event'){if(window.__opsCloseDrawer)window.__opsCloseDrawer();dispatchEvent(new Event(t[1]))}});
  const n=document.getElementById('chgNew');if(n&&it[0])n.textContent=it[0].t;}).catch(()=>{h.innerHTML='<p class="small muted">The list of changes did not load. Try again later.</p>'})})();
})();

/* "Try it" from What's new leaves a way back (11 Nov 2026: "you are only able to get back to Earth"): a small pill under the
   header returns to the list; it goes away when used, when another page opens, or after two minutes */
function chgBack(){let b=document.getElementById('chgBack');if(b)b.remove();b=document.createElement('button');b.type='button';b.id='chgBack';b.className='chg-back glass';b.textContent='← Back to What\u2019s new';document.body.appendChild(b);
 const go=()=>{b.remove();clearTimeout(tm);const O=window.__obs||{};if(window.OwlPage&&window.OwlPage.isOpen())window.OwlPage.close();const u=document.getElementById('uniBack');if(document.querySelector('#uni.on')&&u)u.click();if(document.documentElement.classList.contains('moon-on')&&O.closeMoon)O.closeMoon();setTimeout(()=>{const it=document.querySelector('.gn-m button[data-k="changes"]');if(it&&it.onclick)it.onclick();else{if(O.openPanel)O.openPanel('changes');if(window.OwlPage)window.OwlPage.open('changes',{solo:true})}},300)};
 b.onclick=go;const tm=setTimeout(()=>b.remove(),120000);const t0=Date.now();const iv=setInterval(()=>{if(!b.isConnected){clearInterval(iv);return}const P=window.OwlPage;if(P&&P.isOpen()&&P.current()==='changes'){b.remove();clearInterval(iv)}},800)}

/* One way to put the turning emblem anywhere (11 Nov 2026: "the more places you can include the rotating image, the better"):
   OwlEmblemMount(box, opt) loads the 3D emblem into box and stops it (freeing its WebGL context) when the box leaves the page
   or is hidden, so only the copies on screen cost anything. */
window.OwlEmblemMount=function(box,opt){if(!box)return()=>{};let stop=null,dead=false,busy=false;
 const vis=()=>box.isConnected&&!!box.offsetParent&&!document.hidden;
 const tick=()=>{if(dead)return;if(!box.isConnected){halt();return}if(vis()&&!stop&&!busy){busy=true;import('./assets/emblem/emblem.js').then(m=>{busy=false;if(!dead&&vis())stop=m.mountEmblem(box,opt||{})}).catch(()=>{busy=false})}else if(!vis()&&typeof stop==='function'){stop();stop=null}};
 const iv=setInterval(tick,900);const halt=()=>{dead=true;clearInterval(iv);if(typeof stop==='function')stop();stop=null};tick();return halt};
/* the header logo: a small emblem turns beside the wordmark while the pointer rests on it */
(function(){const b=document.querySelector('#ops-top .brand');const w=b&&b.querySelector('.brand-wm');if(!w||!matchMedia('(hover: hover)').matches)return;const e=document.createElement('span');e.className='brand-em';e.setAttribute('aria-hidden','true');w.appendChild(e);let halt=null,t=0;
 b.addEventListener('mouseenter',()=>{clearTimeout(t);b.classList.add('em-on');if(!halt)halt=window.OwlEmblemMount(e,{static:true})});
 b.addEventListener('mouseleave',()=>{b.classList.remove('em-on');t=setTimeout(()=>{if(halt){halt();halt=null;e.innerHTML=''}},400)})})();
