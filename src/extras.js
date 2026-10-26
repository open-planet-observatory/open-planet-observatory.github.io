// ---------- theme views, cams, lessons, open data (runs after the main app) ----------
(function(){
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Theme views: one click sets the map layers and the signals tab. Layers can still be toggled by hand.
const THEMES=[
 ['all','Everything',['quake','event','sat','war','volc'],'all','The default view: hazards, conflicts, volcanoes and the space stations.'],
 ['space','Space',['sat','gs','fb'],'science','Space stations and Hubble in real time, volunteer ground stations listening to satellites, and recent fireballs. The night side of Earth is shaded.'],
 ['earth','Earth & hazards',['quake','fire','event','volc','gdacs','alert'],'planet','Earthquakes, satellite fire detections, storms, erupting volcanoes and disaster alerts.'],
 ['disrupt','Disruptions',['alert','gps','air'],'people','Severe U.S. weather alerts, GPS interference and air-traffic density. The Disruptions board below shows outages and delays.'],
 ['world','Conflict & politics',['war','gdacs'],'civic','Countries in armed conflicts and major disasters. See Situations below for elections and outbreaks, all in the sources’ own words.'],
];
const tb=document.getElementById('themes');
if(tb){
 THEMES.forEach(([k,label])=>{const b=document.createElement('button');b.dataset.k=k;b.textContent=label;b.setAttribute('aria-pressed',k==='all');b.onclick=()=>applyTheme(k);tb.appendChild(b)});
 document.getElementById('themeNote').textContent=THEMES[0][4];
}
function applyTheme(k){const t=THEMES.find(x=>x[0]===k);if(!t)return;
 document.querySelectorAll('#layerbar .chip').forEach(c=>{const id=c.id.slice(5);const want=t[2].includes(id);if((c.getAttribute('aria-pressed')==='true')!==want)c.click()});
 const st=document.querySelector(`#sigTabs button[data-k="${t[3]}"]`);if(st&&st.getAttribute('aria-pressed')!=='true')st.click();
 document.querySelectorAll('#themes button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===k));
 document.getElementById('themeNote').textContent=t[4];
 try{const p=(location.hash.match(/panel=\w+/)||[])[0];history.replaceState(null,'','#view='+k+(p?'&'+p:''))}catch(e){}
}
const hv=(location.hash.match(/view=(\w+)/)||[])[1];if(hv)setTimeout(()=>applyTheme(hv),0);

// Live cams: vetted official pages only. Link out; never embed copies or record.
const CAMS=[
 ['space','Earth from the International Space Station','Canadian Space Agency, relaying NASA’s live station cameras','https://asc-csa.gc.ca/eng/iss/watch-live.asp','Live video','Cameras on the station look down at Earth. The picture goes dark on the night side and drops out when the station is between relay satellites.','Points away from people, at Earth from 400 km up.'],
 ['volcano','Kīlauea webcams','USGS Hawaiian Volcano Observatory','https://www.usgs.gov/volcanoes/kilauea/webcams','Stills, refreshed every few minutes','Visible and thermal cameras the observatory’s scientists use to watch the summit and rift zones.','Scientific cameras on closed or remote ground. Public domain.'],
 ['volcano','Kīlauea livestreams','USGS Hawaiian Volcano Observatory','https://www.usgs.gov/kilauea-webcams-yt24','Live video','Continuous video of the summit caldera, run by USGS.','Remote scientific view; no visitor areas.'],
 ['volcano','Old Faithful geyser','USGS and the National Park Service','https://www.usgs.gov/media/webcams/old-faithful-live-streaming-webcam','Live video','The geyser erupts about every 60 to 110 minutes; the park posts predicted times.','Visitors on the boardwalk appear as tiny distant figures.'],
 ['volcano','Reykjanes eruption sites','Visit Reykjanes (regional tourism office), Iceland','https://visitreykjanes.is/en/volcano-eruption/eruption-information/webcams-from-the-eruption-site','Live video, several cams','Links to the cameras covering the recent eruption fissures near Grindavík.','Wide views of lava fields and fissures.'],
 ['wildlife','Brooks Falls bear cams','Katmai National Park with explore.org','https://www.nps.gov/katm/photosmultimedia/webcams.htm','Live video, summer to fall','Brown bears fishing for salmon at Brooks Falls, Alaska. Most active July and September.','Wildlife cams set up by the park; visitors stay on distant platforms.'],
 ['wildlife','Bird cams','Cornell Lab of Ornithology','https://www.allaboutbirds.org/cams/','Live video','Nests and feeders around the world, from albatrosses to hawks. Some cams are seasonal.','Research cams aimed at nests and feeders.'],
 ['wildlife','Kelp forest cam','Monterey Bay Aquarium','https://www.montereybayaquarium.org/cams-videos/live-cams/kelp-forest-cam','Live video','Inside the aquarium’s 28-foot kelp forest exhibit: fish, sharks and divers at feeding time.','Inside the exhibit tank; aquarium staff only.'],
 ['wildlife','Jelly cam','Monterey Bay Aquarium','https://www.montereybayaquarium.org/cams-videos/live-cams/jelly-cam','Live video','Sea nettles drifting in their exhibit. Good for a calm classroom background.','Inside the exhibit tank.'],
 ['wildlife','ReefCam','The Nature Conservancy Australia','https://www.natureaustralia.org.au/our-work/oceans/reefcam/','Live video','An underwater camera on a reef off Australia, part of a reef-health project.','Underwater, aimed at the reef.'],
 ['sky','Mount Washington summit','Mount Washington Observatory, New Hampshire','https://mountwashington.org/webcams/','Stills and live video','The weather station on the summit known for some of the worst weather on Earth. Views in every direction.','Wide landscape views from a weather observatory.'],
 ['sky','Northern lights cam','Polar Bears International with explore.org, Churchill, Manitoba','https://polarbearsinternational.org/northern-lights-live-cam','Live video at night, fall to spring','Aurora over Hudson Bay. Best when the Kp index in the Signals section is 4 or higher.','Points at the sky.'],
 ['sky','Monterey Bay view','Monterey Bay Aquarium','https://www.montereybayaquarium.org/animals/live-cams/monterey-bay-cam','Live video','Open-ocean view across the bay: weather, waves, whales and birds.','Wide view out to sea.'],
];
const CT=[['all','All'],['space','Space'],['volcano','Volcanoes & geology'],['wildlife','Wildlife & nature'],['sky','Weather, sky & ocean']];
let camTab='all';
function drawCams(){const g=document.getElementById('camGrid');if(!g)return;
 document.getElementById('camTabs').innerHTML=CT.map(([k,l])=>`<button data-k="${k}" aria-pressed="${k===camTab}">${l} <span class="ct">${k==='all'?CAMS.length:CAMS.filter(c=>c[0]===k).length}</span></button>`).join('');
 document.querySelectorAll('#camTabs button').forEach(b=>b.onclick=()=>{camTab=b.dataset.k;drawCams()});
 g.innerHTML=CAMS.filter(c=>camTab==='all'||c[0]===camTab).map(c=>`<article class="cam"><span class="kind" style="align-self:flex-start">${esc(c[4])}</span><h3>${esc(c[1])}</h3><div class="by">${esc(c[2])}</div><p class="small">${esc(c[5])}</p><p class="why"><b>Why it’s here:</b> ${esc(c[6])}</p><a class="go" href="${esc(c[3])}" target="_blank" rel="noopener">Watch on the official page ↗</a></article>`).join('');
}
drawCams();

// Stories from NASA: official channels only, paired with a map layer. Derik adds specific videos as [title, url, layer, note].
const STORIES=[
 ['NASA on YouTube','https://www.youtube.com/@NASA','sat','Launches, station life and mission stories. Pair with the Space stations layer.'],
 ['NASA Jet Propulsion Laboratory','https://www.youtube.com/@NASAJPL','fb','Asteroids, planets and the robots that visit them. Pair with Fireballs and the asteroid card in Signals.'],
 ['NASA Goddard','https://www.youtube.com/@NASAGoddard','event','Earth science, climate and the satellites that watch storms and fires. Pair with Storms & wildfires.'],
 ['NASA+ streaming','https://plus.nasa.gov','sat','NASA’s own free streaming service: live launches and documentaries.'],
 ['NASA Image and Video Library','https://images.nasa.gov','event','Searchable public-domain images and video from every mission.'],
];
const sg=document.getElementById('storyGrid');
if(sg)sg.innerHTML=STORIES.map(([n,u,l,d])=>`<article class="cam"><span class="kind" style="align-self:flex-start">Official channel</span><h3>${esc(n)}</h3><p class="small">${esc(d)}</p><a class="go" href="${esc(u)}" target="_blank" rel="noopener">Open ↗</a></article>`).join('');
// Classroom samples
const LESSONS=[
 ['Why do earthquakes line up?','Grades 6–10 · 40 min',['Turn on Earthquakes only and switch to the Flat map.','Have students sketch where the dots cluster.','Compare the sketch with a plate-boundary map. What do the lines have in common?','Find the largest quake this week. Hover it: how deep was it? Why might deep quakes cause less damage?'],'Uses: Earthquakes layer (USGS), readings strip.'],
 ['Is the space station over us right now?','Grades 4–8 · 30 min',['Choose the Space view. Find the ISS on the globe.','Watch for five minutes: which way does it move, and how far?','It circles Earth about every 92 minutes. Ask: how many sunrises does the crew see each day?','Open the ISS live cam and see if the station is on the day or night side.'],'Uses: Space stations layer (CelesTrak), day/night shading, ISS live cam.'],
 ['Reading the planet’s vital signs','Grades 8–12 · 50 min',['Open Signals and choose Planet vital signs.','Record today’s carbon dioxide level and last year’s. Work out the change.','Compare Arctic sea ice to its 1979–2025 average for this date.','Discuss: what can one day’s number tell you, and what can’t it?'],'Uses: NOAA carbon dioxide, NSIDC sea ice, NOAA global temperature.'],
];
const ls=document.getElementById('lessons');
if(ls)ls.innerHTML=LESSONS.map(([t,m,steps,u])=>`<article class="lesson"><span class="meta">${esc(m)} · sample</span><h3>${esc(t)}</h3><ol>${steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="uses">${esc(u)}</p></article>`).join('');

// Open data downloads (only meaningful on the hosted site, where data/*.json exist)
const dl=document.getElementById('dl');
if(dl){if(window.OBS_HOSTED){dl.innerHTML=['snap','nature','situations','signals','disruptions','meta'].map(n=>`<a href="data/${n}.json" download>${n}.json</a>`).join('')+'<span class="muted">Refreshed every 10 minutes · <a href="https://github.com/" target="_blank" rel="noopener">field guide (docs/DATA.md)</a></span>'}
 else dl.innerHTML='<span class="muted">Downloads appear on the public site, which refreshes these files every 10 minutes.</span>'}
})();
