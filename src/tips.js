// ---------- Quick hover explanations ----------
// Any control with a title (or data-tip) shows its explanation after a short pause, instead of the browser's slow
// native tooltip. Controls that had no explanation get one here. Also a one-time pointer to the Solar System view.
(function(){
const TIPS={zspin:'Start or stop the globe turning',zin:'Zoom in (you can also pinch or scroll)',zout:'Zoom out. Keep going past the globe to reach the Solar System',zreset:'Back to the starting view',
 'zuni':'Fly out from Earth to the Solar System: planets, moons, spacecraft and comets, live'};
const MODE={'3d':'3D globe: satellites, weather, gravity and every live layer',globe:'Lighter 2D globe for slower computers',flat:'Flat world map'};
function label(){Object.entries(TIPS).forEach(([id,t])=>{const e=document.getElementById(id);if(e&&!e.dataset.tip&&!e.title)e.title=t});
 document.querySelectorAll('#viewseg button').forEach(b=>{if(!b.title&&!b.dataset.tip&&MODE[b.dataset.mode])b.title=MODE[b.dataset.mode]})}
label();setTimeout(label,2500);setTimeout(label,8000);
const tip=document.createElement('div');tip.id='qtip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.appendChild(tip);
let timer=null,cur=null;
function show(el){const t=el.dataset.tip;if(!t)return;tip.textContent=t;tip.hidden=false;const r=el.getBoundingClientRect(),w=Math.min(280,innerWidth-16);tip.style.maxWidth=w+'px';
 const tw=tip.offsetWidth,th=tip.offsetHeight;let x=r.left+r.width/2-tw/2;x=Math.max(8,Math.min(innerWidth-tw-8,x));let y=r.top-th-8;if(y<8)y=r.bottom+8;tip.style.left=x+'px';tip.style.top=y+'px'}
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const el=e.target.closest&&e.target.closest('[title],[data-tip]');if(!el||el===cur)return;
 if(el.title){el.dataset.tip=el.title;el.removeAttribute('title')}cur=el;clearTimeout(timer);timer=setTimeout(()=>show(el),280)},true);
document.addEventListener('pointerout',e=>{if(!cur)return;if(e.relatedTarget&&cur.contains(e.relatedTarget))return;clearTimeout(timer);tip.hidden=true;cur=null},true);
document.addEventListener('focusin',e=>{const el=e.target.closest&&e.target.closest('[title],[data-tip]');if(!el)return;if(el.title){el.dataset.tip=el.title;el.removeAttribute('title')}cur=el;show(el)});
document.addEventListener('focusout',()=>{tip.hidden=true;cur=null});
addEventListener('scroll',()=>{tip.hidden=true},true);
// one-time pointer to the Solar System view
function hint(){let seen=false;try{seen=localStorage.getItem('obs-hint-solar')==='1'}catch(e){}if(seen)return;const b=document.getElementById('zuni');if(!b||!b.offsetParent)return;
 const h=document.createElement('div');h.className='hint-bubble';h.innerHTML='<b>New:</b> fly out to the Solar System, live. <button aria-label="Dismiss">×</button>';document.body.appendChild(h);
 const place=()=>{const r=b.getBoundingClientRect();h.style.left=Math.max(8,Math.min(innerWidth-h.offsetWidth-8,r.left+r.width/2-h.offsetWidth/2))+'px';h.style.top=Math.max(8,r.top-h.offsetHeight-10)+'px'};place();
 const done=()=>{h.remove();try{localStorage.setItem('obs-hint-solar','1')}catch(e){}};h.querySelector('button').onclick=done;b.addEventListener('click',done,{once:true});setTimeout(done,12000);addEventListener('resize',place)}
setTimeout(hint,6000);
})();
