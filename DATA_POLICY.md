# Data policy

The Owlmanac Observatory (formerly Open Planet Observatory) is built to inform, not to surveil. These rules are part of the project, not suggestions. A change that breaks one of them will not be merged.

## What the page shows

- **Places, not people.** No data about identifiable individuals. Aircraft are counted per map cell; individual tracks, callsigns and registrations are never stored or shown.
- **Source words only.** Situation descriptions, incident text and headlines are the source's own words. The site does not write, summarize or rephrase them, and no AI-written summaries appear in data panels.
- **Every number has a source.** Each layer and card names its provider and links to the original.
- **Blind spots shown.** Coverage gaps, delays and sensor limits are stated where they shape what you see.
- **Notable deaths** are listed only with a cited Wikidata date of death, an English Wikipedia article, at least 40 language editions and at least 48 hours' delay.

## Nature sightings

- Community sightings (iNaturalist, eBird) are counted in 2-degree cells. Exact coordinates, observer names and photos are never stored or shown.
- Threatened species keep the location blurring their sources apply, and are shown only as cells, never as a place to go looking.
- Every count is labeled as observer effort, not population. "Seasonal movement" lines join each month's most central sighting for one named population, never tracked animals. Marine species are kept at sea; a segment with no sea route is left out. Species ids are verified against iNaturalist on every update and a layer is withheld if one does not match.

## Country briefs

- A brief lists what the page's own layers hold inside a country's outline, each linked to its source. No scores, rankings or risk ratings are computed or shown.

## Sources

- Free, public sources only. Each source's own license applies to its data and is noted in the source library.
- Clearly untrustworthy sources are excluded. Proprietary aggregators (for example Downdetector, PowerOutage.us) are linked, never scraped.
- Read-only. Nothing in this project probes, scans or contacts any system beyond reading published feeds.

## Live cams

A cam is listed only if:
- it is run by or with the owner of the place (a science agency, park, observatory, aquarium or nonprofit);
- it points at nature, the sky, space or a science site;
- people in view are too small or far away to be identified;
- the site links to it, never copies, stores or re-streams it.

Never listed: street, traffic, city-square and business cams; private or unsecured cameras; beach, campus or venue cams where faces or plates are readable; cams in or near active conflict zones. A cam whose view changes to show identifiable people is removed. Owners can ask for removal at any time.

## Satellites

- The 3D globe shows every active satellite and the debris clouds from major break-ups that CelesTrak republishes publicly, computed in the visitor's browser from CelesTrak orbital elements (accurate to a few km). Objects are spacecraft and debris only. Nothing on the globe tracks an aircraft, ship, vehicle or person.
- The full U.S. Space Force catalog (Space-Track) is not republished here without Space-Track's approval.

## AI model releases

- Model names, organisations, dates and countries are Epoch AI's own records (CC BY 4.0). The country is the developing organisation's, not where a model is used or hosted. Counts are releases, not a ranking.

## The Moon

- Phase, distance, overhead point, quarters and eclipses are computed in the visitor's browser (Astronomy Engine, MIT). Nothing is fetched.

## Imagery

- NASA GIBS (public domain) for the planet and yesterday's view; EOX Sentinel-2 cloudless 2016 (CC BY 4.0, Contains modified Copernicus Sentinel data 2016 & 2017) for close-up detail. Attribution is shown on the page. No paid or per-visitor imagery is used.

## Storms, ground radiation and relief

- Tropical storm tracks, forecast tracks and cones are GDACS's automatic estimates, shown with GDACS's own labels and a link to the official forecaster for each ocean basin. The page says plainly that they are not official forecasts.
- Ground radiation comes from Safecast's volunteer sensors (CC0). The collector keeps only each reading's counts and position, then publishes 1° area medians with a sensor count. Device ids, owners, contact details and exact positions are dropped before anything is saved.
- Relief appeals are IFRC GO's records, in IFRC's own names and Swiss-franc amounts. Sorting by unfunded amount is a sort, not a rating. The "How to help" list is the site's own guide, not an endorsement, and no group on it pays or is paid.

## Gravity, water and ice

- GRACE-FO ice-mass series and the monthly water map are NASA JPL's mascon solution, downloaded from NASA PO.DAAC with the project's own free NASA Earthdata Login (kept as repository secrets, never in the page). JPL's trend line is quoted in its own words; the site computes no trends. The water map is coloured by this site from JPL's values and shown over land only.
- The geoid layer is NGA's EGM96 model (public domain), rendered once to an image.

## Solar System view

- Planets, the Moon and Jupiter's four large moons are computed in the visitor's browser (Astronomy Engine, MIT). Spacecraft positions are NASA JPL Horizons' own; comet orbits come from the JPL Small-Body Database and are propagated as simple two-body orbits (stated on the page); close approaches are JPL CNEOS's list. Collected once a day by the project; nothing is sent from the visitor except the page's own file requests (and one NASA image request for Earth's surface map).
- Distances are always real. "Visible sizes" enlarges bodies smaller than a few pixels and moves moons out from enlarged planets, and the page says so; "True scale" shows everything at its real size. No invented stars or scenery: the background stays empty until real star catalogues are added.

## Stars and the Milky Way

- Stars come from ESA's Gaia DR3 (about a million stars) and Hipparcos catalogues, under ESA's CC BY-NC 3.0 IGO licence: free with credit ("ESA, Gaia DPAC") for non-commercial use. The project will not add ads, paid sponsorship or paid tiers while it uses them without ESA's written permission.
- Each star is drawn as bright as it would look from the camera's position, from its measured distance (1/parallax, stars with parallax measured to better than 20%); no dimming by interstellar dust is modelled.
- The galaxy's glow is a model drawn by the site from published measurements: spiral arms from Reid et al. 2019 (continued past their measured stretches with the same winding, drawn fainter and described as a guess), a central bar from Wegg, Gerhard & Portail 2015, and a disc from Bland-Hawthorn & Gerhard 2016. Pink knots (star-forming clouds) are scattered at random along the arms, and dark dust lanes are drawn along the arms' inner edges, where dust collects in spiral galaxies; neither marks a real cloud. From far away a smooth glow painted from the same model sits under the particles. The page labels all of this as a model, not a photograph, whenever the galaxy is in view; it can be turned off. No artist's impressions or invented stars: every star point is a measured star.
- Near the Sun the sky background is ESA Gaia's real all-sky map (ESA/Gaia/DPAC, CC BY-SA 3.0 IGO; credit shown, share-alike respected by publishing the site's source), fetched once by the "Build sky image" workflow. It fades out beyond about 60 parsecs, because that view is only correct from the Sun's neighbourhood.
- Bright stars get a glow and the brightest get camera-style spikes. This is a look, like a photograph, not data.
- Today's Sun is NASA's latest Solar Dynamics Observatory image (AIA 304 Å, public), fetched every collector run. If NASA does not answer, or the image is more than two days old, the page says so and draws the Sun plain instead.
- Star stories: clicking one of about 3,500 Hipparcos stars shows the opening of its English Wikipedia article, fetched by the visitor's browser from Wikipedia and shown word for word with a link and the CC BY-SA 4.0 licence. Which article goes with which star comes from Wikidata (CC0), matched by Hipparcos number.
- "The light you see left when…" pairs a star's light-travel time with a short list of well-dated events written by the site.

## Our galactic neighbourhood (nearby galaxies)

- Galaxies within 12 megaparsecs (about 39 million light-years) come from NASA/IPAC's NED-D compilation of redshift-independent distances (Steer et al. 2017, version 17.1.2, 2020): the site shows the median of each galaxy's published measurements and says how many there were. Positions come from NED. No redshift-based distances are used in this step.
- A galaxy is drawn as a soft disc only when Wikidata records a diameter for it, face-on because no tilt is recorded; otherwise it is a marker. Names and Wikipedia articles are matched by title; their text is Wikipedia's, word for word, on click.
- Distances farther out (clusters, walls) will state the assumed expansion rate (Hubble constant) on every card when they are added.

## The cosmic web

- 43,107 galaxies from the 2MASS Redshift Survey (Huchra et al. 2012, ApJS 199, 26; every galaxy brighter than Ks = 11.75 over the whole sky), read from NASA HEASARC's copy. Each dot is one catalogued galaxy; nothing is placed by the site.
- Distance = recession velocity ÷ the Hubble constant, which the page always shows (70 km/s per megaparsec by default; 67 and 73, the two main measurements, can be switched). These distances are approximate. Galaxies moving slower than 1,000 km/s are left out, because their own motions swamp the expansion; the Neighbours layer, with measured distances, covers them.
- Blind spots, stated on the page: our galaxy hides the band within about 7° of its plane (the zone of avoidance, drawn as a faint red wedge); far away only the brightest galaxies are bright enough to be in the survey, so the web looks thinner at the edge; and galaxies' own motions stretch clusters along our line of sight.
- Brightness follows how many other survey galaxies lie within 5 megaparsecs, compared with the average for galaxies at the same distance (the survey sees fewer galaxies far away, so a raw count would only make the middle glow). Clusters and filaments glow and voids stay dark. It is a way of drawing, not a score, and no number from it is shown.
- Cluster labels: positions and redshifts from NASA/IPAC NED; their text on click is Wikipedia's, word for word.

## The edge of the observable universe

- The sphere at the edge carries ESA's Planck map of the cosmic microwave background (Planck Legacy release, 2018), credited "ESA and the Planck Collaboration" under the ESA Standard Licence, which allows education, editorial and information use and no commercial use. The site has no advertising or paid features, and will not add any while it uses this map without ESA's written permission.
- collector/build-cmb.mjs reprojects ESA's published Mollweide image to a rectangular map in galactic coordinates; nothing in the pattern is changed. The colours are ESA's.
- The radius, about 46 billion light-years, is today's distance to where that light left, from the Planck 2018 cosmology. It is not linked to the Hubble-constant switch of the cosmic web, and the card says so. The gap between the cosmic web (about a billion light-years) and the edge is shown empty because no survey maps galaxies across it in this view; it is not empty in reality.

## This date in history

- Stories come from Wikipedia's "On this day" events for the date (Wikimedia feed API), word for word, under CC BY-SA 4.0, each linked to its article. The site keeps only stories that belong to topics it covers (space, earthquakes and volcanoes, weather and climate, science and health, exploration, technology, nature, money) and leaves out stories about war, violence and crime. The site writes no story text: it only filters, sorts and labels the topic.
- Earthquakes are USGS's own records: the largest of magnitude 7 or more since 1900 that happened on this month and day (UTC), with USGS's place text and a link to each event.
- The file covers yesterday, today and tomorrow (UTC) so each visitor sees their own date. Each date is fetched once a day; if a source fails, the page says so and shows nothing older in its place.
- Blind spots, stated on the page: Wikipedia's list is chosen by its editors and leans toward Europe and North America; the earthquake catalogue is thin before the 1960s.

## Records

- Records (Learn menu) are rebuilt weekly by collector/records.mjs. Every figure is its source's own, in the source's units: measured values of places, objects and structures from Wikidata (CC0), and agency lists from USGS (largest earthquakes since 1900), the Smithsonian Global Volcanism Program (VEI 7 eruptions), NASA JPL CNEOS (largest fireballs), NOAA NCEI (warmest years), NSIDC (lowest September Arctic sea ice) and the NASA Exoplanet Archive. Voyager 1's distance is counted on from NASA JPL Horizons, as on the countdown.
- From Wikidata the value marked preferred is shown first; the item's other published values follow, with Wikidata's own notes on what was measured and how (for example "snow height", "equator", "architectural height") and the year where given. Deprecated values are left out. Bracketed unit conversions are the site's arithmetic.
- Where a record depends on the definition (highest mountain, longest river, nearest galaxy, strongest storm), every rival is shown side by side. The site writes only the record titles and the notes saying what each definition measures; it ranks nothing itself. "Read" shows the Wikipedia summary of the item, word for word (CC BY-SA 4.0).
- Official weather and climate extremes are the World Meteorological Organization's; the page links to the WMO archive and copies nothing from it.
- Records held by a named person are not listed. Human feats are shown by vessel or mission.
- If a source does not answer, that record says so and is retried within the hour; nothing older is shown in its place.

## Music

- The score is generated in the browser with the Web Audio API from a few oscillators and filtered noise: no recordings, no samples, nothing licensed. It plays by default from the visitor's first click, tap or key (browsers allow no sound before one); ♪ stops it, and that choice is remembered on that device only. It changes with the camera's distance from Earth: a high, bright melody in D major near Earth that sinks about two octaves and turns minor, then dissonant, as you fly out, and comes back as you return. It does not encode any data.

## Other worlds (exoplanets)

- Every figure is the NASA Exoplanet Archive's own (Planetary Systems Composite Parameters), refreshed weekly. The site writes only the explanations of discovery methods.
- "Small and temperate" is a plain filter on NASA's radius (at most 1.75 Earths) and equilibrium-temperature (180–320 K) fields, printed beside the table. It is not a habitability score; the site makes none.
- Each planet links to its NASA page. "Fly there" opens the star view at the host star's measured position.

## From the old almanacs

- Passages come from two public-domain editions scanned by the Internet Archive: the 1846 Farmer's Almanack (Robert B. Thomas) and the 1923 Old Farmer's Almanac. Each passage is the scan's OCR text word for word; the only change is rejoining hyphens left by line breaks in the scan. OCR slips are left as scanned.
- collector/build-almanac.mjs checks every passage against the scan's text and fails the build if one does not match. Each card links to the scan opened at that passage.
- The one-line "Then and now" note under each passage is the site's own: it says what the passage is, and, where the page has a live counterpart, links to it.

## Voyager 1 countdown

- The moment Voyager 1 first reaches one light-day from Earth (173.1446 AU) is computed by the collector from NASA JPL Horizons' geocentric range for Voyager 1 (6-hour grid, refined to the minute), and recomputed daily. The distance on the banner counts up from Horizons' latest hourly value at its stated range-rate. If Horizons does not answer, the banner says the figure is yesterday's. The banner retires itself a week after the moment.
- Video links on the banner are The Owlmanac's own.

## Forecast where you click

- Clicking the 3D globe asks Open-Meteo (CC BY 4.0) for a 7-day forecast. The visitor's browser sends only the clicked point, rounded to 0.01°, directly to Open-Meteo; the project never sees it. Turn off "Forecast where I click" to stop these requests. Open-Meteo's free service is for non-commercial use; see the cost ledger before any monetization.

## Where on Earth? (the daily game)

- Five rounds a day, the same for everyone, built once at the first data update after 00:00 UTC by `collector/game.mjs` and kept unchanged until the next UTC day. Each round is a real reading with its place hidden: a NASA GIBS true-colour satellite image of a 4° patch from the last complete day (public domain), Open-Meteo's hourly model values for one grid point over that day (CC BY 4.0; free for non-commercial use), or a cluster of USGS earthquakes from the past 7 days, read from USGS's live feed and used only if the feed was generated in the last 3 hours (public domain). The whole build has a 3-minute budget so it can't hold up the site's data run. Patches with more than about a third cloud or with gaps in the satellite pass are skipped.
- If a source fails, its rounds are skipped and the other sources fill in; with fewer than three rounds the day is published as failed and the page says so. An older puzzle is never shown as today's; it can only be played as labelled practice.
- The reveal shows USGS's own place text, unedited, for the three largest quakes, and coordinates, the source's link, licence and cadence, and its blind spot. The scoring rule is the site's own: 5,000 points within 50 km (or anywhere inside the satellite patch), halving every 500 km (satellite), 750 km (earthquakes) or 1,000 km (weather). It is a game score, not a measurement.
- Nothing about the player is asked for, sent or kept by the project. The player's own location is never used. Scores, streaks and progress stay in the visitor's browser (localStorage); clearing the browser's site data erases them. The satellite image is loaded by the visitor's browser straight from NASA GIBS, as the globe's imagery already is.
- No prizes, paid entries or sponsors are attached to the game.

## Source Bounty

- Anyone can suggest a free public data feed through a GitHub issue form (`.github/ISSUE_TEMPLATE/source-bounty.yml`). Submissions are public on GitHub and hold only what the submitter writes there and their GitHub name. A source is added only if it passes all five tests (open terms quoted from the publisher, machine-readable, locates no one, not a proprietary aggregator, adds something new); accepted finds are added to the Source library. Contributors are not named on the site unless that is decided separately.

## Visitors

- No account, no ad networks, no tracking scripts, no visitor logs kept by the project.
- Libraries are served from the site itself rather than third-party CDNs.
- Sponsors, if any, are clearly labeled, limited to science, education and public-data organizations, never receive visitor data and never influence content.

## Not included, on purpose

Public CCTV, street and traffic cameras, license-plate readers; tracking named people's aircraft; conflict data with non-commercial licenses (e.g. ACLED); network scanning or "recon" tools.
