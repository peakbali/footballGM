# footballGM

An offline, single-player soccer GM game for mobile. You run a club from division 9 of the English pyramid (FA Step 5) and try to reach the Premier League. See [docs/DESIGN.md](docs/DESIGN.md) for the design.

## Run it

```bash
npm install
npm run dev          # open http://localhost:5173 (use your browser's phone view)
npm test             # unit tests
npm run sim -- 10    # headless balance run: 10 seasons, prints goals/game, home/draw/away, OVR drift
npm run build        # production build in dist/ (used by Capacitor)
npm run build:single # one self-contained HTML file in dist-single/ (easy to share or open on a phone)
```

### On a phone (Capacitor)

```bash
npm run build
npx cap add android   # or: npx cap add ios   (needs Android Studio / Xcode)
npx cap sync
npx cap open android
```

## Layout

| Path | What |
|---|---|
| `src/core/` | Pure game logic, no UI: world builder, match engine, season loop, systems. Seeded RNG, runs headless in Node. |
| `src/core/data/pyramid.ts` | All ~1,080 real clubs of the 2025/26 pyramid (divisions 1-10) by league, with grounds and capacities where known. |
| `src/storage/` | SQLite save (sql.js), persisted to IndexedDB; only changed rows are rewritten each week. |
| `src/ui/` | Preact UI: hub, squad, transfers, club, league tabs. |
| `scripts/` | Headless sim runner and the local real-data import script. |

## Data

Club names and league membership come from the 2025/26 Wikipedia season pages (CC BY-SA 4.0). Clubs abroad (LaLiga, Bundesliga, Serie A, Ligue 1, Liga Portugal, Eredivisie, Scottish Premiership) exist as squads in the transfer database only; no fixtures are played for them. By default every player is generated.

### Real players (optional, local only)

EA FC ratings are fine for a private build only, so they never go into git (`data/private/` and `*.csv` are ignored).

1. Download an EA FC 26 player CSV with SoFIFA-style columns (for example from Kaggle) yourself.
2. Put it in `data/private/`.
3. Run `npm run import:eafc`. It writes `data/private/real-players.json`.
4. Restart `npm run dev` (or rebuild) and start a new career. Clubs with 16 or more matched players get their real squads, everyone else stays generated. Settings → Credits shows what was imported.

Delete `data/private/` before sharing a build with anyone.
