# Data policy

Open Planet Observatory is built to inform, not to surveil. These rules are part of the project, not suggestions. A change that breaks one of them will not be merged.

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

## Forecast where you click

- Clicking the 3D globe asks Open-Meteo (CC BY 4.0) for a 7-day forecast. The visitor's browser sends only the clicked point, rounded to 0.01°, directly to Open-Meteo; the project never sees it. Turn off "Forecast where I click" to stop these requests. Open-Meteo's free service is for non-commercial use; see the cost ledger before any monetization.

## Visitors

- No account, no ad networks, no tracking scripts, no visitor logs kept by the project.
- Libraries are served from the site itself rather than third-party CDNs.
- Sponsors, if any, are clearly labeled, limited to science, education and public-data organizations, never receive visitor data and never influence content.

## Not included, on purpose

Public CCTV, street and traffic cameras, license-plate readers; tracking named people's aircraft; conflict data with non-commercial licenses (e.g. ACLED); network scanning or "recon" tools.
