// One-time migration: turns src/page.html (the prototype page with its data removed)
// into src/page.tmpl.html by adding the new sections and live hooks. Kept for the record.
const fs=require('fs');let s=fs.readFileSync(process.argv[2]||'src/page.html','utf8'); // src/page.html was the prototype page with its data removed
const parts={};fs.readFileSync('src/extras.html','utf8').split(/<!--PART:(\w+)-->\n/).slice(1).forEach((v,i,a)=>{if(i%2===0)parts[v]=a[i+1]});
const rep=(a,b)=>{const n=s.split(a).length-1;if(n!==1)throw new Error((n?'not unique: ':'missing: ')+a.slice(0,70));s=s.replace(a,()=>b)};
rep('@media (prefers-reduced-motion:reduce)',fs.readFileSync('src/extras.css','utf8')+'@media (prefers-reduced-motion:reduce)');
rep('  <div class="eyebrow">Free public data · one map · built to learn from</div>\n','  <div class="eyebrow">Free public data · one map · built to learn from</div>\n'+parts.nav);
rep('</header>','  <div class="sponsor-line">Free and open source. <a href="#free">Support the project</a> · Sponsor slot open to science and education organizations</div>\n</header>');
rep('<section aria-label="Map">\n','<section aria-label="Map" id="map-sec">\n'+parts.themes);
rep('<section aria-labelledby="h-notes">',parts.cams+'\n<section aria-labelledby="h-notes">');
rep('<section aria-labelledby="h-resp">',parts.classroom+'\n'+parts.free+'\n<section aria-labelledby="h-resp">');
rep('Aircraft are shown as counts per region, never as individual tracks. No camera feeds, no license-plate readers.','Aircraft are shown as counts per region, never as individual tracks. The only cameras are official nature, space and science cams where no one can be identified; no street cameras, no license-plate readers.');
rep(`    <div><h3>Today</h3><ul>
      <li>Claude pulled each feed through a browser and saved a compact snapshot into this page.</li>`,`    <div><h3>How the data stays fresh</h3><ul>
      <li>On the public site, a scheduled job collects every feed every 10 minutes (slow-changing ones hourly or daily) and publishes the files this page reads. Its run logs are public.</li>
      <li>Earthquakes are fetched straight from USGS by your browser every minute.</li>
      <li>If a source fails, the last good data stays up, with its own timestamp.</li>`);
rep(`    <div><h3>To make it fully live</h3><ul>
      <li>Host the same page on a free static host (GitHub Pages or Cloudflare Pages), where visitors' browsers can fetch most feeds directly.</li>
      <li>Fires, aircraft and news need a tiny relay, because those servers block direct browser requests. A free Cloudflare Worker covers it.</li>
      <li>Ships need a free aisstream.io key, kept on the relay rather than in the page.</li>
    </ul></div>`,`    <div><h3>Open source</h3><ul>
      <li>The page, the collectors and the publishing workflow are all in one public repository, licensed AGPL-3.0.</li>
      <li>Anyone can run their own copy for free; improvements to a public copy must stay open too.</li>
      <li>Every source is credited, and its own license applies to its data.</li>
    </ul></div>`);
rep('      <li>Public CCTV and license-plate camera maps</li>','      <li>Public CCTV, street and traffic cameras, license-plate readers</li>');
for(const v of ['fireSel=G.fire','airSel=G.air','qSel=G.quake','evSel=G.event','alSel=G.alert'])rep('const '+v,'let '+v);
rep("// ---------- daily refresh from the page's database ----------",fs.readFileSync('src/hooks.js','utf8')+"\n// ---------- daily refresh from the page's database ----------");
rep('})();\n</script>\n\n','})();\n</script>\n<!--EXTRAS_JS-->\n');
fs.writeFileSync('src/page.tmpl.html',s);console.log('ok',s.length);
