// ---------- The menus stay reachable in the space views ----------
// The maintainer, 5 and 21 Nov 2026: the Solar System, Milky Way, cosmic web and edge views covered the whole header, so the
// only ways out were Back, the Earth pill and Esc. Now:
//  - on a wide screen the header shows in its slim form above the space view, which starts just below it;
//  - on a phone the space view gets one "Menu" button; pressing it reveals the header above the view, pressing it again hides it;
//  - choosing anything that is not itself a space view leaves the space view first, so the choice opens on Earth.
// The bar steps aside for the tours, the fly-through, "Hide controls" and the games. The Moon view and the games keep their own controls.
(function(){
'use strict';
const O=window.__obs;if(!O)return;const html=document.documentElement,hc=html.classList;
const uni=()=>document.getElementById('uni'),top=()=>document.getElementById('ops-top');
const phone=()=>innerWidth<861;
const isOn=()=>{const u=uni();return !!u&&!u.hidden&&u.classList.contains('on')};
const quiet=()=>{const c=uni().classList;return c.contains('clean')||c.contains('flight')||c.contains('touring')};
const gameUp=()=>hc.contains('game-on')||['spacefind','hunt','weekly','woe','findowl'].some(id=>{const e=document.getElementById(id);return !!e&&!e.hidden&&e.getClientRects().length>0});
let saved=null,acted=false,busy=false,poll=0,leaving=false;
function button(){const u=uni();if(!u)return null;let b=document.getElementById('uniMenu');if(!b){const back=u.querySelector('#uniBack');if(!back)return null;b=document.createElement('button');b.type='button';b.id='uniMenu';b.className='chip';b.innerHTML='☰<span class="um-t"> Menu</span>';b.setAttribute('aria-label','Menu');b.setAttribute('aria-expanded','false');b.title='Show the site\'s menus';b.onclick=()=>{hc.toggle('uni-menu');apply()};u.appendChild(b) /* its own corner, outside the view's top row: one more button in that row made it wrap and overlap on phones */}return b}
function apply(){if(busy)return;busy=true;try{const u=uni();if(!u)return;const on=isOn();
 if(on&&!saved){saved={slim:hc.contains('slim'),rail:hc.contains('rail-closed'),drawer:hc.contains('drawer-closed')};acted=false;clearInterval(poll);poll=setInterval(apply,1200)}
 const show=on&&!quiet()&&!gameUp()&&(!phone()||hc.contains('uni-menu'));
 hc.toggle('uni-on',on);hc.toggle('uni-bar',show);
 const b=on?button():document.getElementById('uniMenu');if(b){b.hidden=!phone()||(on&&(quiet()||gameUp()));b.setAttribute('aria-expanded',String(show&&phone()));const open=show&&phone();b.innerHTML=open?'✕<span class="um-t"> Close menu</span>':'☰<span class="um-t"> Menu</span>';b.setAttribute('aria-label',open?'Close menu':'Menu')}
 if(show&&leaving){/* a choice is being carried out: leave the header as that choice sets it */}
 else if(show){if(!phone()&&!hc.contains('slim')&&O.setSlim)O.setSlim(true);const t=top();const y=t?Math.ceil(t.getBoundingClientRect().bottom)+6:0;if(u.style.top!==y+'px')u.style.top=y+'px'}
 else if(u.style.top)u.style.top='';
 if(!on)leaving=false;
 if(!on&&saved){clearInterval(poll);hc.remove('uni-menu','uni-bar');if(!acted){hc.toggle('slim',saved.slim);hc.toggle('rail-closed',saved.rail);hc.toggle('drawer-closed',saved.drawer)}saved=null}
 }finally{busy=false}}
// anything chosen from the header that does not itself open a space view leaves the space view
const PICK='.gn-m button,.gn-m a,#gnPlay,#gnSiteTour,#gnNet,#gnVoyager,#gnDeck,#featRow button,#featRow a,#netBanner .nb-open';
document.addEventListener('click',e=>{if(!isOn()||!e.target.closest||!e.target.closest(PICK))return;
 leaving=true;let asked=false;const orig=O.openUniverse;if(orig&&!orig.__sb){const w=function(){w.__asked&&w.__asked();return orig.apply(this,arguments)};w.__sb=true;O.openUniverse=w}
 O.openUniverse.__asked=()=>{asked=true};
 setTimeout(()=>{if(O.openUniverse)O.openUniverse.__asked=null;if(isOn()&&!asked&&O.closeUniverse){acted=true;O.closeUniverse()}else leaving=false; /* stays set until the view has really closed (it fades out) */hc.remove('uni-menu');apply()},80)},true);
const st=document.createElement('style');st.textContent=`
html.uni-bar #uni{transition:opacity .7s ease,top .25s ease}
html.uni-bar #ops{z-index:auto}
#uniMenu{position:absolute;top:14px;right:14px;z-index:3}
#uniMenu[hidden]{display:none}
@media (max-width:479px){#uniMenu .um-t{display:none}#uniMenu{min-width:40px;justify-content:center}} /* the view's title needs the room on narrow phones */
@media (max-width:860px){html.uni-bar #ops-top{max-height:70vh;overflow:auto}}
`;document.head.appendChild(st);
const watch=()=>{const u=uni();if(!u)return false;new MutationObserver(apply).observe(u,{attributes:true,attributeFilter:['class','hidden']});new MutationObserver(apply).observe(html,{attributes:true,attributeFilter:['class']});addEventListener('resize',apply);apply();return true};
if(!watch()){const t=setInterval(()=>{if(watch())clearInterval(t)},1000)}
window.OwlSpaceBar={apply,state:()=>({on:isOn(),bar:hc.contains('uni-bar'),top:uni()&&uni().style.top})};
})();
