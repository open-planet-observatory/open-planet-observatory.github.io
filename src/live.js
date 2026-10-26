// ---------- live updates (public site only) ----------
// Earthquakes come straight from USGS every minute. Everything else is collected every
// 10 minutes by the scheduled job and published as data/*.json; this script picks it up.
(function(){
if(!window.OBS_HOSTED||!window.__obs)return;
const O=window.__obs;
const pill=document.querySelector('.pill.snap');
let updated=null,isSeed=false;
const ago=t=>{const m=Math.round((Date.now()-t)/6e4);return m<1?'just now':m<60?m+' min ago':Math.round(m/60)+' h ago'};
function setPill(){if(!pill||!updated||isSeed)return;pill.className='pill live';pill.innerHTML='<i></i>Updated '+ago(updated)+' · refreshes every 10 min'}

// USGS: M2.5+ in the past week, same compact format the collector writes.
async function quakes(){try{
 const d=await (await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson',{cache:'no-store'})).json();
 const now=Date.now(),r1=x=>Math.round(x*10)/10;
 const s=d.features.map(f=>{const [lon,lat,dep]=f.geometry.coordinates,p=f.properties;const b=[r1(lon),r1(lat),r1(p.mag),Math.round(dep),Math.max(0,Math.round((now-p.time)/36e5))].join(',');
  return p.mag>=5&&p.place?b+'|'+p.place.replace(/^\s*\d+\s*km\s+[NSEW]{1,3}\s+of\s+/i,'').replace(/[|;]/g,' '):b}).join(';');
 O.setQuakes(s);
}catch(e){}}

async function data(){try{
 const m=await (await fetch('data/meta.json',{cache:'no-store'})).json();
 const t=new Date(m.updated).getTime();
 if(updated&&t<=updated){setPill();return}
 const first=!updated;updated=t;if(m.seed){isSeed=true;if(pill){pill.className='pill snap';pill.innerHTML='<i></i>Sample data · first collection pending'}return}setPill(); // on first load too: the browser may have served cached data files
 const get=n=>fetch('data/'+n+'.json',{cache:'no-store'}).then(r=>r.json());
 const [sit,sig,dis,snap,nat,wat,eco]=await Promise.all(['situations','signals','disruptions','snap','nature','watch','economy'].map(n=>get(n).catch(()=>null)));
 if(sit?.asOf>(window.SIT?.asOf||'')){window.SIT=sit;O.renderSit();O.buildSitLayers()}
 if(sig?.asOf>(window.SIG?.asOf||'')){window.SIG=sig;O.renderSig();O.buildSigLayers()}
 if(dis?.asOf>(window.DIS?.asOf||'')){window.DIS=dis;O.renderDis()}
 if(snap?.asOf>(window.SNAP?.asOf||'')){window.SNAP=snap;O.setSnap(snap)}
 if(nat?.asOf>(window.NAT?.asOf||'')){window.NAT=nat;O.buildNatureLayers?.();O.renderNature?.()}
 if(wat?.asOf>(window.WATCH?.asOf||'')){window.WATCH=wat;O.renderWatchLists?.()}
 if(eco?.asOf>(window.ECON?.asOf||'')){window.ECON=eco;O.renderEcon?.();O.buildEconLayer?.()}
 O.render();
}catch(e){}}

quakes();setInterval(quakes,60e3);
data();setInterval(data,5*60e3);setInterval(setPill,30e3);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){quakes();data()}});
})();
