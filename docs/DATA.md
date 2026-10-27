# Open data files

The public site publishes the exact files the page runs on, refreshed by the collector (every 10 minutes; each source on its own schedule). Fetch them from `<site>/data/<name>.json`. Each source's own license applies to its data; see the source library on the page.

| File | Contents | Main fields |
|---|---|---|
| `meta.json` | When each source last updated and the last run's status | `updated`, `snap`, `nature`, `steps`, `lastRun`, `seed` (true until the first real collection) |
| `snap.json` | Map layers | `quakes` (`lon,lat,mag,depth,hoursAgo[|place];…`), `fires` (`total`, 5° `cells`), `alerts` (`total`, `byEvent`, `severeLand`), `eonet`, `tle`, `satGroups`, `kp`, `kpStart`, `scales`, `air` (10° cells, no individual aircraft), `news` |
| `orbits.json` | Orbital catalog (3D globe only, loaded on demand) | `asOf`, `source`, `groups` (`[group, kind, count]`), `sats` (`[name, kind a=active/d=debris, TLE line 1, TLE line 2]`) from CelesTrak, refreshed every 6 h |
| `nature.json` | Sightings aggregated to 2° cells; no observer names or exact coordinates | `sightings.groups[]` (`id`, `name`, `total`, `sampled`, `cells`, `top`), `threatened`, `ebird`, `migration[]` (`name`, `sci`, `population`, `marine`, `months` [month, lon, lat, total, sample] = most central sighting, `via` offshore waypoints, `breaks`), `trends[]` (GBIF records per year, IUCN code) |
| `situations.json` | Verbatim text from sources | `gdacs`, `who`, `wars`, `elections`, `deaths` (48-hour delay, cited), `errors` |
| `signals.json` | Planet and society indicators | `co2`, `temp`, `seaice`, `rivers`, `grid`, `wiki`, `launches`, `neo`, `cad`, `fireballs`, `volcano`, `fedreg`, `sanctions`, `fdaFood`, `cpsc`, `shortages`, `wspr`, `satnogs`, `gpsjam` |
| `disruptions.json` | Official status feeds and headlines | `services`, `transit`, `nvd`, `weather`, `faa`, `kev`, `news` |

Cell strings are `lon,lat,count;lon,lat,count;…` where `lon,lat` is the cell centre.

A documented, rate-limited API with history is the planned Supporter feature; these files are and will stay free.
