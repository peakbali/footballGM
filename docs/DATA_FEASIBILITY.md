# Data feasibility: clubs and players (2025/26)

Status: research only, November 2026. Nothing has been downloaded into this repo.

## TL;DR

- **Clubs: fully available.** Every English club in tiers 1 to 10 for 2025/26 is listed in official FA allocation PDFs and on Wikipedia.
- **Real players with ratings: tiers 1 to 4 only.** EA SPORTS FC 26 is the only usable source of ratings, and it covers the Premier League and the EFL (92 clubs) but not the National League or anything below it.
- **Tiers 5 to 10 must be generated.** No public source has ratings for non-league players, and real squad lists below tier 5 are patchy.
- **Foreign pools are easy.** The same FC 26 data covers about 25 men's leagues and roughly 16,000 to 18,000 players, so it can supply most of the 24-30k target.
- **Big design catch:** tiers 9 and 10 are not single leagues. Tier 9 is 16 regional leagues and tier 10 is 17. See [Pyramid shape](#1-english-clubs-per-division-202526).
- **Licensing:** fine for a private, offline, non-commercial build. Do not commit EA-derived data to a public repo and do not publish the app with it.

## 1. English clubs per division (2025/26)

| Tier | FA step | Divisions | Clubs (approx.) | Real club names? |
|---|---|---|---|---|
| 1 | Premier League | 1 | 20 | Yes |
| 2-4 | EFL | 3 | 72 | Yes |
| 5 | Step 1 (National League) | 1 | 24 | Yes |
| 6 | Step 2 (National League North, South) | 2 | ~48 | Yes |
| 7 | Step 3 (NPL Premier, Southern Central, Southern South, Isthmian Premier) | 4 | ~88 | Yes |
| 8 | Step 4 | 8 | ~170 | Yes |
| 9 | Step 5 | 16 | ~320 | Yes |
| 10 | Step 6 | 17 | ~320 | Yes |
| | **Total** | **53** | **~1,060** | |

Club counts for steps 1-4 come from "20 to 24 clubs each". Steps 5-6 are my estimate at about 20 per division.

**Sources**
- FA 2025/26 allocations, steps 2-6 (official, has PDFs with every club): <https://www.thefa.com/news/2025/may/15/nls-allocations>
  - Steps 2-4 PDF: <https://www.thefa.com/-/media/thefacom-new/files/competitions/2024-25/nls/nls-2-to-4-club-allocations-2025-26.ashx>
  - Steps 5-6 PDF: <https://www.thefa.com/-/media/thefacom-new/files/competitions/2024-25/nls/nls-56-club-allocations-202526.ashx>
- Wikipedia, National League System and each league's 2025-26 season page: <https://en.wikipedia.org/wiki/National_League_System>
- openfootball/clubs (CC0, plain text): <https://github.com/openfootball/clubs>. Good for top-flight clubs. Non-league coverage not confirmed.

**Design implication.** "10 divisions, start at division 9" really means 7 levels with regional splits from tier 6 down. A full 1,060-club pyramid with 25 players each is ~26,500 players on its own, before any foreign pool. Recommendation:

1. When the user picks a starting club in a tier-9 league, the game uses **that club's regional chain**: its tier-10 feeder, its tier-9 league, the tier-8 and tier-7 leagues it promotes into, then National League North or South. That's one league per tier, about 220 clubs in total.
2. Promotion and relegation at the edges of the chain swap clubs with an off-screen pool (name plus strength only). The data for the whole country is cheap to ship as names, so the pool can use real clubs.
3. Real FA pyramid moves between regions (lateral moves, uneven promotion spots) are not modelled. Every league in the chain uses simple fixed promotion and relegation spots.

## 2. Player data with ratings

### EA SPORTS FC 26 (best option)

FC 26 ratings reflect the 2025/26 season, which matches the chosen start season. FC 27 is now out and reflects 2026/27, if the start season ever moves.

- **Coverage of England:** Premier League, Championship, League One and League Two. The National League is not included ([Goal list of FC 26 licences](https://www.goal.com/en/news/ea-sports-fc-26-teams-competitions-licenses/blt48e6b26b48acb339)).
- **Fields:** overall, potential, around 30 attributes on a 1-99 scale (pace, finishing, vision, tackling, GK skills and so on), positions, age, nationality, club, height, preferred foot, weak foot, skill moves, wage, value, contract end. That maps directly onto the planned OVR, POT and FM-style attribute groups.
- **Where to get it (Kaggle, all scraped from SoFIFA or EA's ratings site):**
  - [FC 26 (FIFA 26) Player Data](https://www.kaggle.com/datasets/rovnez/fc-26-fifa-26-player-data): ~18,000 players, 110+ columns including potential and contract. Figure from a [project that uses it](https://github.com/ismailoksuz/EAFC26-DataHub), not checked first-hand.
  - [EA Sports FC 26 Player Ratings](https://www.kaggle.com/datasets/justdhia/ea-sports-fc-26-player-ratings): "16,000+ players".
  - [EAFC26 Player Database](https://www.kaggle.com/datasets/flynn28/eafc26-player-database): men and women, updated April 2026.
  - Official browser (no potential, no export): <https://www.ea.com/games/ea-sports-fc/ratings>
  - I could not read the Kaggle licence fields without a login. Check them on download.
- **Scale check:** EA's averages roughly fit the planned scale for tier 1 (around 75-80). Tiers 3-4 sit around 55-65 in EA. The game will need a small rescale per tier so that neighbouring divisions overlap the way the design wants.

### Transfermarkt (no ratings, useful extras)

- [dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets): 50,000+ players, market values, transfers and appearances across 65 competitions (major European leagues and cups). No OVR, POT or attributes.
- Updates paused in July 2026, with data up to 6 July 2026. The README states no licence.
- Useful for realistic market values, contract lengths and transfer history. Not needed for v1.
- Transfermarkt's own website has National League and some step 2 squads, but its terms forbid scraping, so this is not a recommended source.

### Non-league players (tiers 5 to 10)

No dataset with ratings exists. Real squad names appear on club sites, Wikipedia (National League only, patchily), and Transfermarkt, but none are clean or licensed for reuse. **Recommendation: generate every player at tiers 5-10** with English-weighted name lists and tier-based rating distributions. This fits the design, which already allowed generated players where data is thin.

## 3. Licensing and terms

| Source | Terms | Fit for this project |
|---|---|---|
| FA allocation PDFs | © The FA. Club names and league membership are facts. | OK. Use names only, no crests or logos. |
| Wikipedia | CC BY-SA 4.0. Credit and share-alike on derived data. | OK. Add a credits screen. |
| openfootball | CC0, public domain | OK, no conditions. |
| EA FC 26 ratings (Kaggle, SoFIFA, ea.com) | EA's database. Kaggle uploaders cannot grant rights to EA's data, whatever licence label they pick. EA's terms forbid commercial use and scraping. | **OK only for a private, non-distributed build.** Keep raw files out of git; build the SQLite file locally with an import script. |
| Transfermarkt / dcaribou | No licence stated; Transfermarkt's terms forbid scraping. | Avoid for now. |
| Real club and player names | Club names are trademarks, and player names carry image rights. | Fine privately. A store release would need fictional names, which the generator can provide. |

If the project ever becomes public or commercial, the plan B is easy: swap the EA import for the generator and a fictional-name pack. Keeping the importer separate from the game's database code makes that swap cheap.

## 4. Foreign leagues worth including

All of these are covered by FC 26 data, so they cost no extra work. Pick by what makes transfers interesting for a club climbing from tier 9:

| Priority | League | Why |
|---|---|---|
| High | Scotland Premiership | Common source of loans and bargains for EFL clubs |
| High | Ireland Premier Division | Cheap, realistic targets for non-league and lower EFL |
| High | Denmark, Sweden, Norway | Good-value players who often move to the Championship |
| High | Netherlands, Belgium, Portugal | Classic selling leagues for young talent |
| Medium | Germany Bundesliga and 3. Liga, Austria, Switzerland, Poland, Romania | Depth at mid-level ratings |
| Medium | Spain, Italy, France top flights | Stars and aspirational targets late in a save |
| Low | MLS, Saudi, China, Argentina, Australia, Korea | Mostly buyers of ageing players; good as AI destinations |

The article lists about 25 men's leagues and says "35+" overall, so the download may also include second tiers such as Serie B or Ligue 2. Confirm on download.

## 5. Recommendation

| Layer | Source | Players |
|---|---|---|
| England tiers 1-4 | EA FC 26 (real) | ~2,600 |
| England tiers 5-10, active chain | Generated | ~3,300 |
| England off-screen clubs | Names only, strength rating | 0 |
| Foreign pools | EA FC 26 (real) | ~13,000-15,000 |
| Free agents and youth | Generated | ~2,000-5,000 |
| **Total** | | **~21,000-26,000** |

Add generated foreign players if the total needs to reach 30k.

**Must be generated:** all tier 5-10 players; youth intakes; hidden traits (personality, loyalty); staff (no dataset has scouts, coaches or physios); finances per club (no public source for non-league budgets, so derive from tier and stadium size).

**Gaps and open questions**
1. Choose the regional-chain approach for tiers 6-10, or decide another way to handle 16-17 parallel leagues.
2. Confirm the Kaggle licence labels and exact columns on download.
3. Stadium capacities for non-league grounds are on Wikipedia for most step 1-4 clubs, but are patchy below. Generate where missing.
4. Real player-to-tier rescaling needs one calibration pass once the data is loaded.

**Next step when ready:** a small local import script (not committed data) that reads the FC 26 CSV and the FA club lists and writes the game's SQLite seed.
