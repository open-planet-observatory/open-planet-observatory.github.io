# Open Planet Observatory

A free, open-source live map of the planet from public data: earthquakes, fires, storms, aircraft density, satellites, disaster alerts, armed conflicts, disruptions, and the planet's vital signs, plus official nature and space cams. Built for research and education. Built to inform, not to surveil. See [DATA_POLICY.md](DATA_POLICY.md).

## How it works

```
GitHub Actions (every 10 min)
  collector/collect.mjs ──► dist/data/*.json + *.js   (each source on its own schedule;
  │   ├─ snap.mjs          map layers                  failures keep the last good data)
  │   └─ collectors.json   situations, signals, disruptions
  build/build.mjs ───────► dist/index.html             (libraries served locally)
  deploy ────────────────► GitHub Pages
Visitor's browser
  loads data/*.js, then every minute fetches earthquakes from USGS directly,
  and every 5 minutes checks data/meta.json for new data and updates in place.
```

Every run's log is public under the repository's **Actions** tab, and `data/meta.json` lists when each source last updated and any errors.

## Run it yourself

1. Fork or create this repository on GitHub (public).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Actions** tab → enable workflows → run **Collect and publish** once by hand.
4. Optional repository secrets (**Settings → Secrets and variables → Actions**):
   - `NASA_API_KEY` (free at api.nasa.gov), `EIA_API_KEY` (free at eia.gov/opendata). Without them the shared, rate-limited `DEMO_KEY` is used.
   - `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` (free OpenSky account → API client) for reliable aircraft counts.
   - `EBIRD_API_KEY` (free at ebird.org/api/keygen) for the rare-bird layer.
   - `CESIUM_ION_TOKEN` (free Cesium ion account) adds the Bing aerial imagery option to the 3D globe; without it NASA Blue Marble and daily VIIRS imagery are used (no key).
   - `CLOUDFLARE_RADAR_TOKEN` (free Cloudflare account → API token with the "Radar: Read" permission) for internet-outage annotations in the Disruptions board.

Local build: `npm ci`, then `npm run collect && npm run build` (needs internet), or `npm run build:seed` to build from the bundled sample data.

## Layout

| Path | What |
|---|---|
| `src/page.tmpl.html` | The page. `<!--DATA:x-->` and `<!--EXTRAS_JS-->` are filled by the build. |
| `src/extras.js` | Theme views, live cams, NASA story links, classroom samples, open-data links. |
| `src/nature.js` | Nature layers and panel (sightings, seasonal movement, threatened, trends). |
| `src/country.js` | Country briefs (click a country) and the browser-only watchlist. |
| `src/ops.js`, `src/ops.css` | The full-screen "ops room" shell: map, layer rail, panels, region presets, ticker. |
| `src/globe3d.js` | The 3D globe (CesiumJS): NASA GIBS imagery, satellites on real orbits, fireballs at burst altitude, see-through Earth for quake depths. Falls back to the 2D map without WebGL. |
| `docs/DATA.md` | What each published data file contains. |
| `src/live.js` | Live updates on the public site. |
| `collector/` | Data collection: `snap.mjs` (map layers), `nature.mjs` (iNaturalist, GBIF, eBird), `collectors.json` steps (situations, signals, disruptions, watch) run in Node. |
| `data-seed/` | A sample snapshot used before the first collection and for offline builds. |
| `build/` | `build.mjs` builds both targets; `rebase.cjs <published.html> --check` rebuilds the template from the claude.ai prototype when another session edited it there. |

## License

Code: AGPL-3.0-or-later. Data: each source's own terms (see the source library on the page).

## Notes

- GDELT (news volume and disruption headlines) refuses requests from GitHub's runners on some days; the page keeps the last good news data and says when it was collected.

- One `economy` step (Alpha Vantage via a connected MCP server) only works inside Claude; in GitHub Actions it fails harmlessly and the previous values are kept.

- GitHub runs scheduled workflows on a best-effort basis; runs can be delayed during busy periods.
- GitHub pauses scheduled workflows in a repository with no commits for 60 days. Any commit, or re-enabling the workflow, restarts it.
