# FootballGM

An offline, single-player soccer GM game for mobile. You run a club from division 9 of a fictional ten-division pyramid and try to reach the Premier Division. Free to play for the first season, with a one-time Full game unlock after that (see [docs/PLAY_STORE.md](docs/PLAY_STORE.md)). See [docs/DESIGN.md](docs/DESIGN.md) for the design.

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
| `src/core/data/pyramid.ts` | ~1,080 fictional clubs in a ten-division pyramid by league, with grounds and capacities. |
| `src/storage/` | SQLite save (sql.js), persisted to IndexedDB; only changed rows are rewritten each week. |
| `src/ui/` | Preact UI: hub, squad, transfers, club, league tabs. |
| `scripts/` | Headless sim runner and e2e checks. |
| `twa/` | Android (Trusted Web Activity) build config for Google Play. |
| `store/` | Google Play listing text and graphics. |

## Data

Every club, stadium, league and player is fictional and generated; no real club names, crests or player ratings ship with the game. Clubs abroad (Spanish, German, Italian, French, Portuguese, Dutch and Scottish leagues) exist as squads in the transfer database only; no fixtures are played for them.
