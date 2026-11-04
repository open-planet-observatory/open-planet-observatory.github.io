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
- Sea floor, depth colours (the default): NOAA NCEI's ETOPO1 bedrock grid (1 arc-minute, public domain), fetched by the visitor's browser from NCEI's DEM mosaic image service as heights in metres, coloured on a fixed depth scale (the Haxby scale, 8,000 m deep to sea level, shown as a legend) and shaded from its slopes, which are exaggerated so the relief reads at globe scale. Land is drawn grey. The colours and shading are the site's rendering of NOAA's numbers; nothing is added. The globe is lit evenly while the sea floor is shown.
- Sea floor, GEBCO relief (the alternative): GEBCO's Web Map Service shows the GEBCO 2026 Grid (15 arc-second ocean depths and land heights), acknowledged on the page in the wording GEBCO requests. GEBCO says its imagery is not for navigation or safety at sea, and the page repeats that. "Measured only" overlays GEBCO's own layer of cells based on measured data (largely ship tracks) and dims the rest, which GEBCO fills by interpolation and satellite-derived estimates.

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

## The Moon

- The Moon globe uses NASA's Lunar Reconnaissance Orbiter Wide Angle Camera global mosaic, served as map tiles by NASA Moon Trek and loaded directly by the visitor's browser. The same mosaic covers the Moon in the Earth and Moon view.
- Names come from the IAU Gazetteer of Planetary Nomenclature (USGS Astrogeology, public domain), rebuilt weekly from its nightly shapefile: seas, craters 20 km across or larger, mountains, valleys, scarps and similar features, and the gazetteer's landing-site names ("Statio"). Lettered satellite craters and the gazetteer's astronaut-named features are left out, because the site names no individuals; landing sites are labelled by mission (Apollo 11, Chang'e 4…), taken from the gazetteer's own description. The gazetteer has station names for six landings so far; other landing and impact sites come from Wikidata (CC0): spacecraft and missions with a position on the Moon, labelled by mission where Wikidata says the craft belongs to one, with Wikidata's own description on the card. Missions the gazetteer already places are taken from the gazetteer only (Wikidata gives one of them the wrong sign of longitude).
- "All names (advanced)" loads every name the IAU has adopted on the Moon (about 9,000, including lettered satellite craters; the astronaut-named features are still left out), shown as you zoom in.
- "Earth from the Moon" (Earthrise) puts the camera 110 km above the Moon, a typical lunar-orbit height, at a point 105° around from the spot under Earth, so Earth sits a few degrees above the lunar horizon; of those points, the one with the most sunlight on the ground below is used. Scrolling or pinching changes the lens, not the position.
- The Sun's direction on the Moon, Earth's position in the Moon's sky and Earth's rotation are computed in the browser with Astronomy Engine (the IAU rotation models); the Moon-fixed frame agrees with the libration Astronomy Engine reports to about 0.03°. Earth seen from the Moon wears NASA Blue Marble (GIBS) at its true size, phase and rotation.
- In the Earth and Moon view the Moon is drawn 4 times larger by default, and labelled so; "Moon at true size" shows it as it is.

## Cost of living around the world

- Price level vs the U.S.: the World Bank's PPP conversion factor for household consumption (PA.NUS.PRVT.PP) divided by its official exchange rate (PA.NUS.FCRF) for the same year, × 100. This is how the World Bank itself defines the price level ratio (U.S. = 100); the division is the site's arithmetic on the World Bank's two numbers (CC BY 4.0). Countries whose ratio comes out below 5 or above 300 are left out and named, because that points to mismatched units or an official rate far from the market rate.
- Pay vs prices: the ILO's average monthly earnings of employees (ILOSTAT EAR_EMTA_SEX_NB, both sexes, local currency; CC BY 4.0) for the two latest years of one source series, as a % change, next to the World Bank's consumer-price inflation for the same year. Years the ILO marks as a break in the series are skipped. Pay minus prices is the site's subtraction.
- City cost-of-living rankings (Numbeo, Mercer, EIU) are proprietary: linked, not shown.
- Blind spots: national averages say nothing about cities, regions or who gained; survey methods change; some countries' latest year is old (the year is always shown).

## Untold history

- History from below (Derik's decisions, 3 Nov 2026): stories usually told by the winning side, told here through the words of the people they happened to. World-balanced; viewer discretion advised. Anyone named in the cited historical record may be named; living private individuals never are. The site's war and violence filters elsewhere (This date in history) do not apply to this section.
- Each story has: primary-source quotations, word for word, public domain, each linked to the copy it was checked against (checked in the browser against the live page or scan; scan transcriptions say so); the official account given at the time, word for word; "What the record shows", a short summary in the site's own words in which every sentence is footnoted to its source (an exception to the verbatim-only rule, approved for this section); "Still disputed", giving each side's sources; and a blind spot.
- Copyrighted histories (e.g. Howard Zinn's) are linked as further reading only, never quoted at length. No scores or rankings of events.
- Data: src/assets/history/untold.json, edited by hand; no collector.

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
- The player's own location is never asked for or used. Progress and streaks stay in the visitor's browser (localStorage). A finished game's guesses are sent to the games server, which scores them itself from the published answers (see "Leaderboards"); a player can keep everything on their device instead.
- No prizes, paid entries or sponsors are attached to the game.

## The Forecast Desk (the daily numbers game)

- `collector/forecastdesk.mjs` builds three questions once per UTC day, each about a number a public source publishes for tomorrow (UTC): the count of magnitude-5+ earthquakes USGS lists for the day (FDSN event count), NOAA SWPC's observed daily sunspot number, and the highest of NOAA SWPC's eight 3-hourly planetary K-index values. Each question carries a "typical spread": the standard deviation of the source's own last ~30 daily values (7 days for the K-index), with a floor. The questions are the site's own wording; nothing is a forecast by the site.
- The morning after the day ends, the collector reads each source's value for that day and stores it; a source that has not published yet leaves the day open, and no answer is estimated. Values are taken as first published.
- Players' guesses are kept in their own browser (localStorage `owl-fd-v1`, last 30 days) and also sent to the games server unless the player keeps scores on their device (see "Leaderboards"). Scoring is the games spec's rule: up to 3,000 for the point guess, halving for every typical spread it is off; 2,000 if the answer lands in the player's range, less 500 for every 10% the range is wider than 2.56 typical spreads. The leaderboard and the crowd's middle guess come from the games server (see "Leaderboards"). No prizes, paid entries or sponsors.

## Record watch

- `collector/recordwatch.mjs` checks every 6 hours: NOAA NCEI's monthly Global Climate Report (the text the report page loads from its content endpoint) and Copernicus C3S's monthly surface-air-temperature and sea-ice bulletins for the last three months, NSIDC's Sea Ice Today feed, NASA's news-release feed and USGS's news-release list (Derik's choice of sources, 2 Nov 2026).
- From the two climate reports, a sentence is kept only when it declares a record set, broken, tied or surpassed (for example "surpassing the previous 2024 record", "set a new record-high", "reached record highs"); rankings below first ("second-warmest on record"), negatives ("no land or ocean areas experienced a record-cold September") and near-misses ("shy of the record", "trailed") are left out. From the news feeds, a headline is kept only when it says "record" and names no person. Every item is shown word for word, grouped by its report or release, with its link and the source's licence. Nothing is added or reworded.
- Items stay listed for about 400 days from their date; a source that fails is named on the page and its earlier items stay with their own dates. The detector errs toward leaving a borderline sentence out.

## Predictions (Polymarket)

- `collector/predictions.mjs` reads Polymarket's public Gamma API hourly into `data/predictions.json`: open events tagged space, SpaceX, NASA, climate, weather, global temperature, hurricanes, earthquakes, volcanoes, AI, tech or science (Derik's scope, 2 Nov 2026). Left out: anything also tagged politics, elections, sports, crypto, finance, business, pop culture, war or similar; daily city-temperature and daily-quake bets; disease, health and drug-approval markets; mergers, listings and company-value markets; and any market whose title or question names a person (a list of surnames plus a check for two capitalised words in a row that are not a known place, body, programme or product). Events with under $1,000 traded are skipped; at most 12 per topic.
- Shown as Polymarket publishes them: the event title, each market's question or outcome label and its outcomes, word for word; each price as a percentage (a price of 0.63 is 63%); Polymarket's own 24-hour price change; the amount traded and the end date; a link to the event. The site adds no forecast, score or ranking of its own beyond the busiest-first order.
- If the API fails, the page says so and shows no odds; older odds are never shown as current. Polymarket's API terms allow use and redistribution with credit; the panel credits and links Polymarket. No ads, affiliate links or referral codes are attached.

## 3D relief (needs a Cesium ion token)

- When the repository secret `CESIUM_ION_TOKEN` is set, the build puts the token in the page (as Cesium requires for browser streaming) and two switches appear: "3D relief (heights ×10)" under Sea floor on Earth (Cesium World Bathymetry, GEBCO-based, heights stretched 10 times and labelled so) and "3D relief" on the Moon (Cesium Moon, true heights). Without the token neither switch shows. The token should be restricted in Cesium ion to the site's own address; Cesium ion's free Community plan is for non-commercial use and has a monthly streaming allowance, which fits the site's no-ads rule; if the allowance runs out the relief stops loading and the flat maps stay.
- The same token adds the "Close-up" imagery button: Bing Maps Aerial (Microsoft) streamed through Cesium ion (asset 2). It is a mosaic of aerial and satellite photos taken over past years, sharper than NASA's daily images but not current; the page says so in the button's description, and Microsoft's credit shows on the globe.

## Inside the Earth

- The cutaway, the boundary table and the wave-speed and density profiles come from three published seismic reference models: PREM (Physics of the Earth and Planetary Interiors, 1981; isotropic form), IASP91 (Geophysical Journal International, 1991) and ak135 (Geophysical Journal International, 1995). The values are read from the model files distributed with ObsPy's TauP module and stored unchanged in `src/assets/earth/models.json` (depth, P-wave speed, S-wave speed, density). IASP91 defines no density, so none is shown for it (the file's density column copies ak135's). Layer boundaries are the depths where each model's values jump; the cutaway is drawn to true scale.
- "Settled" and "debated" items are limited to peer-reviewed work. Each paper is cited in the usual scientific way (authors, with "et al." past three; year; title as published; journal; DOI link); every citation was checked against Crossref. Abstracts are quoted word for word only where the paper is open access under CC BY 4.0 (two papers); for the others only the title and link appear. Derik approved showing authors in citations on 2 Nov 2026; they appear only as paper authors, never with anything personal. The explanations of what each question is are the site's own words. No fringe ideas (hollow Earth or the like) appear, not even as history.
- The proposed innermost inner core is drawn dashed at the two sizes the cited papers state (about 300 km and about 650 km) only when the visitor switches it on. The deep-mantle "blobs" (LLSVPs) are described but not drawn, because their shapes differ between imaging models.
- Blind spot: these are one-dimensional, spherically averaged models; the real Earth varies sideways.

## Sky tonight

- Everything is computed in the visitor's browser; the project's servers are not involved. The Moon's phase, rise and set, planet positions, brightness and rise and set, twilight times and eclipses use Astronomy Engine (MIT). Space-station passes (ISS, catalogue 25544; Tiangong, 48274) use satellite.js (MIT) with the CelesTrak orbital elements the globe already loads; a pass counts as visible when the station is at least 10° up, in sunlight, and the Sun is at least 6° below the visitor's horizon. The page states how old the elements are.
- The all-sky chart uses the site's star file (ESA Hipparcos new reduction, CC BY-NC 3.0 IGO; stars to magnitude 5) and d3-celestial's constellation figures (BSD-3-Clause), drawn as a stereographic view of the whole sky for the visitor's place and time.
- Meteor showers: the names, peak nights and activity dates are the International Meteor Organization's 2026/2027 Meteor Shower Calendar, as published, with a link to IMO for each shower's own description, which is not copied. IMO states no licence; only the names and dates are used, credited and linked. The Moon's brightness on each peak night is the site's own computation. When the calendar runs out (after August 2027) the page says so until the next calendar is added; old dates are never shown as current.
- Location: the browser is asked only when the visitor presses "Use my location"; the page never asks on its own. The position is rounded to 0.1° (about 10 km) and kept only in this browser (localStorage); it is never sent to the project or anyone else. Visitors who decline can click a spot on the globe or type a place name; a typed name (and nothing else) goes from the visitor's browser to Open-Meteo's place search (CC BY 4.0), which returns candidate places and their time zones.
- Blind spot: these are positions computed from orbits and star catalogues, not observations. Clouds, haze, light pollution and the visitor's local horizon decide what can really be seen; satellite predictions drift as orbits change.

## Find it in the sky (the daily star game)

- Five targets a day for the visitor's own sky: named stars brighter than magnitude 2.1 and at least 15° up, plus planets and the Moon at least 10° up, picked with a seed made from the date and the rounded position, so the same place gets the same targets all day. The player taps the Sky tonight chart with the names hidden; the score is the site's own rule (1,000 points within 3°, halving every 8° beyond). It is a game score, not a measurement.
- Scores, streaks and progress stay in the visitor's browser (localStorage); a finished day's per-target points (never the location or the targets) go to the games server as a self-reported score unless the player keeps scores on their device. The copied result contains the date, the score and coloured squares, never the location. No prizes, paid entries or sponsors.

## One Light-Day (the Voyager-week scavenger hunt) and the Play page

- Five stops, open until 22 November 2026 (UTC). Each clue is the site's own wording; each answer is checked, at the moment the player answers, against the same data the site shows: the Voyager 1 countdown (NASA JPL Horizons, data/voyager.json), Proxima Centauri's distance (ESA Hipparcos), Andromeda's count of published distance measurements (NASA/IPAC NED-D), and the edge card's 380,000 years (ESA Planck). If a data file does not load, nothing is counted and the card says so. The hunt's points are a game rule, not a measurement.
- Two "look up" bonus stops (Jupiter, Saturn) are on the honour system. Their best viewing times are computed in the visitor's browser (Astronomy Engine) for a city the player picks from a list, or for the place they already set in Sky tonight. The hunt never asks for or uses the player's location.
- The Play page and its field journal read what each game keeps in this browser, plus anonymous play counts and boards from the games server (see "Leaderboards"). If the browser refuses storage, progress lasts only for that visit and the page says so.

## Source Bounty

- Anyone can suggest a free public data feed through a GitHub issue form (`.github/ISSUE_TEMPLATE/source-bounty.yml`). Submissions are public on GitHub and hold only what the submitter writes there and their GitHub name. A source is added only if it passes all five tests (open terms quoted from the publisher, machine-readable, locates no one, not a proprietary aggregator, adds something new); accepted finds are added to the Source library. A finder is credited on the site by GitHub name only if they ticked the credit box on the form (opt-in); otherwise the find is listed without a name. Only the GitHub name is shown, nothing else about the person.

## Leaderboards and play counts (the games server)

- The games server is a Cloudflare Worker with a D1 database (code in `worker/`, deployed by `.github/workflows/worker.yml`). For each player it stores a player id (a one-way hash of a random token that the player's own browser makes and keeps; the token itself is never stored), when the id was first seen, and the nickname with the time it was chosen, if any. For each finished game it stores the game, the day, the score, per-round points and the time. For the Forecast Desk it stores each guess (best guess and range) and its time. No IP address, user agent, location, email or account is stored, and the server keeps no request logs.
- Scores count anonymously. A player appears on a public board only after choosing a nickname (3–20 characters, filtered for abuse and look-alikes of other names), and only for games finished after the name was chosen. "Remove my name" takes it off; "Erase my scores" deletes everything the server holds for that browser; "Keep my scores on this device" stops every request to the server. Derik can remove any nickname, or a player and all their scores, with a key only he holds.
- Checking: only the Forecast Desk is checked, because guesses are locked in before the sources publish and the server grades them from the published numbers. Where on Earth?'s answers travel with the puzzle, and Find it in the sky and the hunt can't be checked without data the server never receives (the player's place or progress), so those three boards are labelled "honour system". The hunt board lists finishers only.
- Forecast Desk guesses can be changed until midnight UTC; the crowd's middle guess shows only after guessing has closed and is players' guesses, not a forecast by the site. Guesses are deleted after 35 days. Scores stay as the boards' history until the player erases them.
- Play counts on the Play page are totals of these records ("312 played today"); nothing else is measured. Boards and counts are cached for a minute.
- Cloudflare runs the server; its free plan's limits apply. Requests are rate-limited per connecting address (IPv6: per /64) in Cloudflare's memory; the address is not stored.

## Visitors

- No account, no ad networks, no cookies, no visitor logs kept by the project. The only server the project runs is the games server (above), which stores anonymous game scores and nothing about visits.
- **Visit counts.** The site counts visits in aggregate with [GoatCounter](https://www.goatcounter.com) (open source; privacy policy: https://www.goatcounter.com/help/privacy), so the project can see whether anyone finds it useful and which parts they use. The page sends one plain request per page load and one when a visitor opens a panel, a space view, a game, a tour or a YouTube link (the name of that thing, e.g. `panel/records` or `game/where-on-earth`). No third-party script runs on the page and nothing is stored in the browser. GoatCounter keeps totals by page or event, referrer (including `?ref=` campaign tags), browser and system name, screen size and country; it is set to record no regions, no languages and no individual pageviews. It works out unique visits from a short-lived hash it keeps for at most 8 hours, never a cookie or an account. Nothing it receives identifies a person, and the project never combines it with anything else. Code: `src/stats.js`.
- **Opting out.** Open the site once with `?stats=off` (e.g. https://theowlmanac.com/?stats=off) and that browser is never counted again; `?stats=on` undoes it. Browsers that block trackers usually block the count too, and that is fine.
- Libraries are served from the site itself rather than third-party CDNs.
- Sponsors, if any, are clearly labeled, limited to science, education and public-data organizations, never receive visitor data and never influence content.

## Not included, on purpose

Public CCTV, street and traffic cameras, license-plate readers; tracking named people's aircraft; conflict data with non-commercial licenses (e.g. ACLED); network scanning or "recon" tools.
