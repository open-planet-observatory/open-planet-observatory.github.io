// Which Hipparcos stars have an English Wikipedia article (for "click a star for its story").
//   node collector/build-starwiki.mjs src/assets/stars
// Source: Wikidata (CC0) — catalogue code (P528) qualified "Hipparcos Catalogue" (Q537199) + an en.wikipedia sitelink.
// Only stars present in bright.json are kept. The article text itself is fetched by the visitor's browser on click,
// from Wikipedia's own summary API, and shown word for word with a link (CC BY-SA 4.0).
import fs from 'node:fs/promises';
import path from 'node:path';
const OUT = process.argv[2] || 'src/assets/stars';
const Q = 'SELECT ?v ?article WHERE { ?st pq:P972 wd:Q537199 ; ps:P528 ?v . ?item p:P528 ?st . ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }';
const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(Q), { headers: { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://open-planet-observatory.github.io/)', Accept: 'application/sparql-results+json' } });
if (!r.ok) throw new Error('Wikidata HTTP ' + r.status);
const rows = (await r.json()).results.bindings;
const B = JSON.parse(await fs.readFile(path.join(OUT, 'bright.json'), 'utf8')); const hips = new Set(B.stars.map(s => s[0]));
const hip = {};
for (const b of rows) { const h = +b.v.value.replace(/^HIP\s*/, ''); if (!h || !hips.has(h) || hip[h]) continue; hip[h] = decodeURIComponent(b.article.value.split('/wiki/')[1]); }
if (Object.keys(hip).length < 1000) throw new Error('only ' + Object.keys(hip).length + ' articles matched');
await fs.writeFile(path.join(OUT, 'wiki.json'), JSON.stringify({ about: 'Wikipedia article for each Hipparcos star, from Wikidata (CC0): catalogue code P528 with qualifier Hipparcos Catalogue (Q537199) and an English Wikipedia sitelink. Built ' + new Date().toISOString().slice(0, 10) + '.', hip }));
console.log('wiki.json', Object.keys(hip).length, 'stars');
