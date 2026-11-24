# footballGM: Game Design Document

> Status: **Draft v0.3** (2026-11-24). Captures the concept agreed in project chat, plus proposals needed to make it buildable.
> Sections marked **[Agreed]** reflect decisions already made. Sections marked **[Proposal]** are starting points for tuning and review. Anything unresolved lives in [Open questions](#15-open-questions).

## Contents

1. [Vision and pillars](#1-vision-and-pillars)
2. [Platform and tech stack](#2-platform-and-tech-stack)
3. [World and data](#3-world-and-data)
4. [Ratings and player model](#4-ratings-and-player-model)
5. [Time, calendar and game loop](#5-time-calendar-and-game-loop)
6. [Match and league simulation](#6-match-and-league-simulation)
7. [Squad, contracts and transfers](#7-squad-contracts-and-transfers)
8. [Scouting](#8-scouting)
9. [Staff, facilities and academy](#9-staff-facilities-and-academy)
10. [Progression, personality and morale](#10-progression-personality-and-morale)
11. [Finance and economy](#11-finance-and-economy)
12. [Board, inbox and end-of-season reel](#12-board-inbox-and-end-of-season-reel)
13. [UI, art and audio](#13-ui-art-and-audio)
14. [Data schema](#14-data-schema)
15. [Open questions](#15-open-questions)
16. [Roadmap](#16-roadmap)

---

## 1. Vision and pillars

**[Agreed]** A mobile, offline, single-player **soccer** GM/franchise game played over many seasons. Personal project, not commercial.

You are the **General Manager** of a club starting in division 9 of the English pyramid. You never coach: you build the club (money, players, staff, facilities) and pick a formation, then watch the results come in.

| Pillar | What it means in practice |
|---|---|
| **GM, not coach** | Finance, transfers, contracts, staff, facilities, formation choice. No tactics, no training focus, no team talks. |
| **Light and fast** | A season should take a focused evening, not a week. Every screen is one or two taps from the hub. |
| **Decisions, not busywork** | The Continue button stops only when something needs you. Batch the noise into the inbox. |
| **A long climb** | Nine promotions from division 9 to the top. The reward is watching the club and its history grow. |
| **Feels alive** | Real clubs, real players where data exists, an evolving pixel stadium, and a season-end reel that celebrates progress. |

**Non-goals for v1:** online play, multiple saves, tactics/coaching, international football, cup competitions (later), monetisation.

---

## 2. Platform and tech stack

**[Agreed]**

| Layer | Choice |
|---|---|
| Language | TypeScript |
| App shell | Capacitor (iOS + Android), also runs in a desktop browser for development |
| Storage | SQLite (Capacitor SQLite plugin on device; sql.js/wasm in browser dev) |
| UI | SVG-based components (crisp scaling for pixel chrome, badges, graphs) |
| Match view | HTML Canvas (2D pixel pitch) |
| Audio | Web Audio API, chiptune, with a mute option |

**[Proposal] Architecture notes**

- **Pure simulation core.** All game logic (sim, progression, AI, finance) lives in a UI-free `core/` module with a seeded RNG, so it can be unit-tested and run headless in Node for balance testing ("sim 50 seasons, print the stats").
- **Deterministic per week.** Each week's advance uses `seed = hash(saveSeed, seasonId, week)`. Makes bugs reproducible.
- **Web Worker for the advance.** The weekly sim runs off the UI thread; the hub shows a short progress animation.
- **Performance budget:** one weekly advance under 300 ms on a mid-range phone; end-of-season rollover (all yearly updates for ~27k players) under 5 s.
- **Save size budget:** under 50 MB after 30 seasons. Old match events are pruned (keep scores/stats, drop event streams older than 1 season).

---

## 3. World and data

### 3.1 The pyramid **[Agreed + Proposal]**

The English pyramid, Steps 1 to 6 of the National League System, gives 10 divisions in play. The player starts in **division 9**.

Only **one league per tier is simulated**: the single leagues at divisions 1 to 5, plus the player's **regional chain** at divisions 6 to 10 (the one regional league per tier that the club's region feeds into). **[Agreed]**

**Every simulated league has exactly 20 teams** (38 rounds, home and away). **[Agreed]**

| Div | Real level | Real leagues at this tier | Real clubs (all) | Simulated league | Unsimulated pool at start | Sim depth |
|---|---|---|---|---|---|---|
| 1 | Premier League | 1 | 20 | 20 | 0 | Bulk |
| 2 | Championship | 1 | 24 | 20 | 4 | Bulk |
| 3 | League One | 1 | 24 | 20 | 4 | Bulk |
| 4 | League Two | 1 | 24 | 20 | 4 | Bulk |
| 5 | National League | 1 | 24 | 20 | 4 | Bulk |
| 6 | National League North / South | 2 | 48 | 20 (chain) | ~28 | Bulk |
| 7 | Step 3 (NPL Premier, Isthmian Premier, Southern Premier Central/South) | 4 | ~88 | 20 (chain) | ~68 | Bulk |
| 8 | Step 4 (8 regional leagues) | 8 | ~170 | 20 (chain) | ~150 | Bulk |
| 9 | Step 5 (~16 regional leagues) | ~16 | ~320 | 20 (chain) | ~300 | **Own league: full sim** |
| 10 | Step 6 (~17 regional leagues) | ~17 | ~340 | 20 (chain) | ~320 | Bulk |

That is **10 simulated leagues and exactly 200 clubs with fixtures**, out of roughly **1,100 clubs** in the world.

**Which real clubs make up each 20-team league [Proposal]**

- **Division 1:** the 20 real 2025/26 Premier League clubs.
- **Divisions 2 to 5** (real leagues have 24): the 20 clubs with the **highest squad strength** at the start form the league. The 4 weakest go into that tier's unsimulated pool. They are not relegated, they just sit out of the fixture list until the yearly reshuffle pulls them back in (see below).
- **Divisions 6 to 10 (chain):** start from the real chain league's clubs (real sizes vary from 18 to 24). If it has more than 20, keep the 20 strongest and send the rest to the pool. If it has fewer, top up with the strongest pool clubs nearest the league's region.
- **The user's club is always included** in its starting league, whatever its strength.
- Unsimulated pool clubs at divisions 2 to 5 behave exactly like off-chain clubs (below): names + strength only, players fully in the database.

**Promotion and relegation (same rule in every league) [Proposal]**

| Places | Outcome |
|---|---|
| 1st and 2nd | Promoted automatically |
| 3rd to 6th | Playoffs (single-match semis, 3v6 and 4v5, then a final) for the 3rd promotion place |
| 18th to 20th | Relegated |

So 3 up and 3 down between every pair of tiers. Division 1 has no promotion; division 10's relegated clubs drop into the feeder pool below.

- **Full sim** = event-stream match engine for every match in the player's current league.
- **Bulk sim** = fast strength-based score generation for the other 9 simulated leagues (see [6.4](#64-bulk-sim-for-other-leagues)).
- **Off-chain clubs** (the other regional leagues at divisions 6 to 10, plus the unsimulated pool at divisions 2 to 5) exist as **name, region, division and a strength rating only**. They have no fixtures, tables or match stats. **Their players are fully real in the database**: they can be scouted, bought, loaned, and they develop yearly like everyone else. The goal is an immersive transfer market while keeping the simulation small and fast.
- **Off-chain strength** is a single number recalculated yearly from the club's best 14 players, plus small random drift. It drives AI transfer behaviour and who moves between tiers.

**The regional chain [Proposal]**

- The chain is fixed when the player picks a club: for each of divisions 6 to 10, the regional league that the club's own league feeds into (by the real feeder structure, falling back to nearest league centroid).
- When the player is promoted or relegated, the chain does not change; the club just moves to the chain league at the new tier.
- **Promotion and relegation across the chain boundary** keep every simulated league at a fixed size:
  - Clubs relegated out of a chain league drop into the off-chain pool of the tier below (assigned to their nearest regional league).
  - Their replacements come up from that tier's pool: the off-chain clubs with the highest strength rating, weighted toward clubs nearest the chain league's region.
  - Clubs promoted out of division 6 into division 5 come from the chain league as normal; division 5 relegations into division 6 go to the chain league if the club is in its region, otherwise to the off-chain pool and a pool club is pulled into the chain to keep the size.
  - Every league ends the rollover at exactly 20 clubs: 3 out, 3 in, at each boundary.
- Off-chain clubs reshuffle between tiers once a year by strength (a light "virtual" promotion/relegation), so the world doesn't stagnate.
- **Pool swap at divisions 2 to 5:** once a year, if a tier's strongest pool club is stronger than the weakest of the 3 clubs just relegated into that tier, the two swap (the relegated club waits in the pool). Promoted clubs and the user's club are never swapped out.
- Below division 10 is a virtual "feeder" pool: relegated div 10 clubs drop out of play and are replaced by generated or real Step 7 clubs.

### 3.2 Clubs **[Agreed]**

- Real club names for all 10 divisions (2025/26 season membership).
- Each club has: name, short name, colours (primary/secondary for kits and badge), region, stadium name and capacity, a reputation value, and an AI personality (buyer / developer / seller, see [7.6](#76-ai-clubs)).
- No real crests. Badges are generated pixel shields from club colours.

### 3.3 Players **[Agreed]**

- **Real players** for the 2025/26 season where data exists (realistically Premier League to National League North/South). Generated players everywhere else.
- **Generated players** use English name lists weighted by region, with a small share of other nationalities in higher divisions.
- **Country field from day 1** on every player, so foreign pools can be added later.
- **Foreign pools (later, stage 5):** players only, no match simulation. They exist as transfer targets and as buyers/sellers via a simple "abroad" pseudo-club per country.
- **Target total:** 24,000 to 30,000 players (about 1,100 clubs x ~22 contracted players, plus free agents and later foreign pools).

### 3.4 Data pipeline **[Proposal]**

1. Build-time script (Node, not in the app) assembles `seed.db` from: club list CSV, real player CSV (name, DOB, nationality, positions, club), and a rating-estimation step.
2. Real players get ratings **estimated** from their league level, age, minutes played and market-value tier, then normalised into the division OVR bands in [4.4](#44-division-rating-bands).
3. Any club with fewer than 20 real players is topped up with generated players.
4. `seed.db` ships inside the app. A new game copies it and applies a randomisation pass (small rating jitter, hidden POT rolls) so each save differs.

Data source and licensing questions are in [Open questions](#15-open-questions).

---

## 4. Ratings and player model

### 4.1 Scale **[Agreed]**

All ratings are integers **1 to 100**: OVR, POT and every attribute.

| OVR | Meaning |
|---|---|
| 100 | Effectively impossible. Maybe once in a very long save. |
| 95+ | Generational (one or two in the world at a time) |
| 90+ | Superstar |
| 75 to 85 | Typical Premier League starter |
| 35 to 45 | Typical division 9 to 10 player |

### 4.2 Attributes **[Proposal]**

FM-style groups. Outfield players have 24 attributes, goalkeepers have 6 GK attributes plus the mental and physical groups.

| Group | Attributes |
|---|---|
| **Technical** | Finishing, Long Shots, Passing, Crossing, Dribbling, First Touch, Heading, Tackling, Marking, Set Pieces |
| **Mental** | Vision, Decisions, Composure, Positioning, Off the Ball, Anticipation, Work Rate, Aggression, Leadership |
| **Physical** | Pace, Acceleration, Stamina, Strength, Agility, Jumping |
| **Goalkeeping** | Reflexes, Handling, One-on-Ones, Aerial Command, Kicking, GK Positioning |

Hidden attributes (not shown as numbers): **Personality** (1 to 100), **Injury proneness**, **Consistency**, **Development type** (see [10.1](#101-development)).

### 4.3 Positions and position OVR **[Agreed approach, Proposal weights]**

Positions: `GK, CB, LB, RB, LWB, RWB, DM, CM, AM, LM, RM, LW, RW, ST`.

**Position OVR** is a weighted average of attributes, then rescaled so that the formula output matches the 1 to 100 scale:

```
raw(pos)   = Σ attr_i × w_i(pos) / Σ w_i(pos)
posOVR     = clamp(round(a(pos) × raw(pos) + b(pos)), 1, 100)
playerOVR  = max over natural positions of posOVR
```

`a` and `b` per position are calibrated once against the seed data so a "typical" player at each position lands on the same OVR (stops strikers looking better than defenders just because of the weights).

Starting weights (only non-zero weights shown; 3 = key, 2 = important, 1 = minor):

| Pos | Weights |
|---|---|
| GK | Reflexes 3, Handling 3, One-on-Ones 2, Aerial Command 2, GK Positioning 3, Kicking 1, Decisions 1, Composure 1 |
| CB | Tackling 3, Marking 3, Heading 3, Positioning 3, Strength 2, Jumping 2, Anticipation 2, Decisions 1, Composure 1, Pace 1, Passing 1 |
| LB/RB | Tackling 2, Marking 2, Positioning 2, Pace 3, Stamina 2, Crossing 2, Acceleration 2, Work Rate 1, Passing 1, Anticipation 1 |
| LWB/RWB | Pace 3, Stamina 3, Crossing 3, Dribbling 2, Tackling 2, Acceleration 2, Work Rate 2, Marking 1, Passing 1 |
| DM | Tackling 3, Positioning 3, Passing 2, Anticipation 2, Marking 2, Decisions 2, Strength 1, Work Rate 2, Stamina 1, Composure 1 |
| CM | Passing 3, Vision 2, Decisions 3, First Touch 2, Stamina 2, Work Rate 2, Tackling 1, Composure 2, Long Shots 1, Off the Ball 1 |
| AM | Passing 3, Vision 3, Dribbling 2, First Touch 3, Off the Ball 2, Long Shots 2, Composure 2, Decisions 2, Finishing 1, Agility 1 |
| LM/RM | Crossing 3, Pace 2, Stamina 2, Dribbling 2, Passing 2, Work Rate 2, First Touch 1, Acceleration 1, Off the Ball 1 |
| LW/RW | Dribbling 3, Pace 3, Acceleration 3, Crossing 2, First Touch 2, Off the Ball 2, Finishing 2, Agility 2, Long Shots 1 |
| ST | Finishing 3, Off the Ball 3, Composure 2, First Touch 2, Heading 2, Pace 2, Acceleration 2, Strength 1, Dribbling 1, Anticipation 2 |

Weights live in a data file (`core/data/positionWeights.json`) so they can be tuned without code changes.

**Familiarity and out-of-position penalty.** Each player has a familiarity per position: `natural`, `accomplished`, `unfamiliar`. When playing a position, effective OVR is:

| Familiarity | Multiplier | Shown as |
|---|---|---|
| Natural | 1.00 | Green |
| Accomplished | 0.95 | Yellow |
| Unfamiliar but adjacent (e.g. CB → DM, LB → LWB) | 0.85 | Orange |
| Unfamiliar | 0.70 | Red |

Adjacency is a fixed graph over the position list. Familiarity can grow with minutes played in a position (accomplished after ~20 matches).

### 4.4 Division rating bands **[Proposal, Claude's pick]**

Neighbouring divisions overlap: a good div 9 player is an average div 8 player.

| Div | Avg starter OVR | Typical range (10th to 90th pct) | Best in division |
|---|---|---|---|
| 1 | 80 | 72 to 87 | 92 to 95 |
| 2 | 72 | 65 to 78 | 82 |
| 3 | 66 | 60 to 72 | 76 |
| 4 | 61 | 55 to 67 | 71 |
| 5 | 56 | 50 to 62 | 66 |
| 6 | 52 | 46 to 58 | 62 |
| 7 | 48 | 42 to 54 | 58 |
| 8 | 44 | 38 to 50 | 55 |
| 9 | 40 | 34 to 46 | 51 |
| 10 | 36 | 30 to 42 | 47 |

### 4.5 POT and unscouted values **[Agreed]**

- **POT** is the hidden ceiling the player can reach. Shown to the user only through scouting (or, for your own players, your coaches).
- OVR and POT are always shown as **one number, never a range**: either the correct value or `?` (reference game style). Unscouted values show as `?`. (Changed 2026-11-24 after playtesting: ranges felt clunky.)

---

## 5. Time, calendar and game loop

### 5.1 Calendar **[Agreed + Proposal]**

The game advances in **weeks**. A season runs from **1 July to 30 June**.

| Period | Weeks (approx) | What happens |
|---|---|---|
| Pre-season | July (4) | Summer window open, sponsor choice, season goals set, friendlies skipped (auto) |
| League season | August to early May (38) | 38 rounds, one league match per week in every division. No midweek rounds. |
| Summer window | 1 June to 31 August | Transfers and loans |
| Winter window | January (4) | Transfers and loans; half-season sponsor review |
| End of season | Mid May | Playoffs (2 weeks), then promotion/relegation, awards, **season reel**, contracts expire 30 June |
| Off-season | Late May to June | Yearly progression for non-squad players, retirements, academy intake, new fixtures |

Free agents and loans are allowed **any time**.

### 5.2 Core loop **[Agreed]**

1. Hub screen shows next match, league position, money, alerts, and the evolving stadium.
2. Player makes decisions (optional).
3. Tap **Continue**. The game advances week by week and **stops at events**: offers received, contract expiring, scout report ready, facility finished, window opening/closing, board message, end of season.
   When the week includes your match, its report opens with a second **Continue** button in the same bottom-right spot, which takes you back to the hub.
4. Inbox batches minor items (results of other leagues, small news).
5. **Autosave every week**, single save slot.

No quick-season mode. Fast, but the player still makes the decisions.

### 5.3 Update cadence **[Agreed]**

| Who | Progression | Morale |
|---|---|---|
| Own squad | Monthly | Weekly |
| All other players | Yearly (off-season) | Not tracked |

---

## 6. Match and league simulation

### 6.1 Player inputs **[Agreed]**

- Choose a **formation** (4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2, 4-1-4-1, 3-4-3 to start).
- **Auto-pick XI**: best effective OVR per slot, adjusted for fitness and morale. A "lock" toggle per player is an open question.
- Match = one tap for the result, then a **match report** (score, scorers, player ratings, events, stats). The 2D watch mode was dropped on 2026-11-24 (Khen: not needed).

### 6.2 Event-stream engine (own league) **[Proposal]**

The match is a sequence of ~90 to 110 "possessions". Each possession runs:

```
1. Who has the ball:   P(home) = midStrength_home / (midStrength_home + midStrength_away)
2. Progression:        does the attack reach the final third?  attackStrength vs defenseStrength
3. Chance:             chance quality xG ∈ [0.02, 0.6] sampled from attacker vs defender ratings
4. Shot outcome:       goal / saved / off target, from xG, finisher OVR, GK OVR
5. Side events:        fouls, cards, injuries, corners (light-weight probabilities)
```

Unit strengths are computed from the XI's effective position OVRs:

| Unit | Positions (weight) |
|---|---|
| Attack | ST, LW, RW, AM (1.0); LM, RM (0.7); CM (0.3) |
| Midfield | CM, DM, AM (1.0); LM, RM, LWB, RWB (0.6) |
| Defence | CB, LB, RB (1.0); DM, LWB, RWB (0.6); GK (0.4) |
| Goalkeeper | GK |

**Modifiers:**

| Modifier | Effect on team strength |
|---|---|
| Home advantage | +3% (mild) |
| Morale | -5% (very low) to +4% (very high) |
| Fatigue | Player effective OVR scales down linearly below 70% fitness, to 0.85 at 40% |
| Consistency (hidden) | Per-match random swing per player, ±0 to ±4 OVR |

**Calibration targets** (checked by headless sim runs): about 2.6 to 2.9 goals per game, home win ~44%, draw ~26%, away win ~30%, champions usually 80 to 95 points.

The engine emits an **event stream** (`{minute, type, team, playerIds, x, y}`), which feeds the event list and the stats panel. Result-only mode skips rendering but runs the same engine.

### 6.3 Fitness, injuries, suspensions **[Proposal]**

- Fitness drops 15 to 30% after a match, recovers ~20% per week (more with a better physio/facilities).
- Injury chance per match per player ≈ 0.5% × proneness factor. Doctor and physio levels reduce duration.
- 5 yellow cards = 1-match ban; red = 1 to 3 matches.

### 6.4 Bulk sim for other leagues **[Proposal]**

For the other 9 simulated leagues, each match uses a Poisson model:

```
λ_home = baseGoals × (attack_home / defence_away)^k × 1.03
λ_away = baseGoals × (attack_away / defence_home)^k
```

`attack` and `defence` are club-level numbers recalculated monthly from the top 14 players. Goals are then assigned to players weighted by position and finishing, so the top scorer charts in every simulated league stay believable. No events are stored.

**Off-chain clubs play no matches.** For yearly progression, their players get an estimated playing-time share from their rank in the club's squad (top 11 by OVR = regular starter, next 5 = rotation, rest = backup). Their season stats stay empty, and scouting reports show "regional league" instead of numbers.

---

## 7. Squad, contracts and transfers

### 7.1 Squad rules **[Agreed]**

- First-team squad: **20 to 30 players**.
- Players **aged 18 and under** and **academy players** do not count toward the limit.
- The game blocks deals that would push the squad above 30, and warns when it falls below 20 (the auto-picker can promote academy players to fill the bench).

### 7.2 Contract types **[Agreed]**

| Type | Notes |
|---|---|
| Permanent | 1 to 5 years, weekly wage |
| Loan | Fee (optional), wage split %, duration (half or full season) |
| Loan + option to buy | Fixed fee the buying club may pay at the end |
| Loan + obligation to buy | Fee is paid automatically at the end (can be conditional on appearances) |

**Clauses:** sell-on % (seller gets a share of the next sale profit), release clause (any club paying it triggers a forced negotiation with the player), appearance bonus, goal bonus, promotion bonus, yearly wage rise %.

**No agent fees.**

### 7.3 Negotiation **[Proposal]**

- Player asks for a wage based on `OVR`, `age`, `division`, `reputation of club` and **personality**.
  - High personality: calm, loyal, accepts up to 20% under market.
  - Low personality: demands up to 40% over market, and may refuse to renew.
- The user offers wage, length and bonuses. Each offer is accepted, countered (once or twice), or rejected. Keep it to at most three rounds so it stays fast.

### 7.4 Transfer windows **[Agreed]**

- Permanent transfers only during the **summer** and **winter** windows.
- **Free agents and loans any time.**
- **No stealing targets:** once a club has an accepted bid for a player, other clubs (including AI) cannot bid for that player.

### 7.5 Selling **[Proposal]**

- AI clubs send offers for listed players and occasionally for unlisted ones.
- The user can accept, reject or counter. Sell-on clauses from earlier deals are applied automatically.

### 7.6 AI clubs **[Agreed + Proposal]**

Each AI club has a type that drives its behaviour:

| Type | Buys | Sells | Wages |
|---|---|---|---|
| **Buyer** | Prime age (24 to 29), high OVR | Rarely | Pays above market |
| **Developer** | Young (17 to 22), high POT, loans in | Sells once players peak | Pays market |
| **Seller** | Cheap, free agents | Sells whenever offered fair value | Pays below market |

AI transfer logic runs in the windows: each club checks its weakest position against its budget and makes 0 to 3 moves. Only simulated-league clubs in divisions 1 to 8 run full logic. Divisions 9 to 10 mostly use free agents. Off-chain clubs run a light version once per window: they sell to whoever bids fair value and backfill from free agents, so their squads stay around 20 players.

### 7.7 News feed **[Agreed]**

Minimal: notable transfers in your division and the top division, record fees, your own deals.

---

## 8. Scouting

**[Agreed]**

- Scouts produce a **shortlist of recommended players** that fit your needs (position, age, max fee, max wage), not a raw database search.
- **Coverage** (how many players they can find, and from which divisions/regions) depends on **number of scouts** and their **level**.
- **Accuracy** of reported ratings depends on scout level. Hidden POT and traits are revealed by higher scout levels.

**[Proposal] Mechanics**

A scout report always shows the player's **true OVR**. POT is either the **true number** or `?`. Scout level decides how many players' POT the scout can read: a good scout gives the correct POT for most players, a poor one leaves most as `?`. Which players a scout can read is stable, so a better scout always sees at least what a worse one sees.

| Scout level | POT read for | Divisions covered |
|---|---|---|
| 1 to 20 | about 25 to 40% of players | Own division ±1 |
| 21 to 40 | about 40 to 55% | ±2 |
| 41 to 60 | about 55 to 65% | ±3 |
| 61 to 80 | about 70 to 80% | ±5 |
| 81 to 100 | about 80 to 95%, traits visible | All (and foreign pools later) |

- Scouts only recommend players who are **open to joining your club**. Interest (0 to 100, needs 50) rises when the move is up the pyramid, when he would start, with better training and stadium facilities, a calm personality, low morale or no playing time at his club, being a free agent, or being 30+; it falls for a step down or a bench role. The player screen shows "Open to a move" or "Not interested" for scouted players, and the existing willingness rules for offers still apply.
- Each scout delivers **one shortlist (3 to 6 players) every 2 weeks**. More scouts = more lists.
- Once a player is scouted, the report is stored and stays current for this season and the next. Your own squad's OVR is always known; whether you see a player's POT uses your best coach's level the same way. Players in your own league show their OVR (you watch them every week) and `?` for POT until scouted.

---

## 9. Staff, facilities and academy

### 9.1 Staff **[Agreed]**

| Role | Count | Effect |
|---|---|---|
| Scout | 1 to N (N set by facilities) | Shortlists, coverage, accuracy |
| Attacking coach | 1 | Development of attacking attributes |
| Midfield coach | 1 | Development of midfield attributes |
| Defensive coach | 1 | Development of defensive attributes |
| Goalkeeping coach | 1 | Development of GK attributes |
| Physio | 1 | Fitness recovery, minor injury duration |
| Doctor | 1 | Major injury duration, injury prevention |
| Youth coach | 1 | Academy intake quality and youth development |
| Commercial manager | 1 | Sponsor offers, merch income |

- Staff have a **level 1 to 100**, a wage and a contract length.
- **Staff level is capped by facilities**: e.g. a coach above the training ground's cap works at the cap level.
- Staff are hired from a generated pool that refreshes every month.
- The Staff screen has filter chips by type (All, Coaches, Medical, then each role) and every role carries a small pixel tag: `S` scout, `AC`/`MC`/`DC`/`GC` attacking/midfield/defensive/goalkeeping coach, `P` physio, `+` doctor, `Y` youth coach, `£` commercial manager.

### 9.2 Facilities **[Agreed]**

Four branches, each with tiers and **choices** (some upgrades are either/or). Every upgrade has a **cost**, **build time** (weeks), **upkeep** (per week) and **effects**.

| Branch | Example upgrades | Effects |
|---|---|---|
| **Stadium** | Extra stand (choose: seated or terrace), roof, floodlights, hospitality boxes, big screen | Capacity, ticket price ceiling, attendance, hub visuals |
| **Training** | Pitches, gym, medical centre, analysis room, GK area | Coach caps, development speed, injury/recovery |
| **Academy** | Youth pitches, dorms, school partnership, scouting network | Youth coach cap, intake size and quality |
| **Commercial** | Club shop, online store, bar, conference rooms, car park | Merch income, matchday income, commercial manager cap |

Each facility has a **level 1 to 10**. The **staff cap** for a related role is `facilityLevel × 10`.

**[Proposal] Example either/or choices:**

- New stand: **Terrace** (cheaper, +capacity, +atmosphere/home morale) vs **Seated** (more expensive, +ticket price, required for division 5+ ground grading).
- Training level 6: **Sports science lab** (−injuries) vs **Analysis suite** (+development for 21 to 26 year olds).

Ground grading: promotion to divisions 5 and up requires minimum capacity/seating. Promotion still happens (sandbox), but you must upgrade within a season or pay a fine.

Build times range from 2 weeks (small items) to 30+ weeks (new stand). Stadium works may reduce capacity while building.

### 9.3 Academy **[Agreed + Proposal]**

- **Yearly intake** in March: 3 to 8 players aged 15 to 16.
- Count and quality scale with **academy facility level** and **youth coach level**.
- Intake POT: mostly near your division's band, with a small chance of a big outlier ("golden generation" event, rare).
- Academy players do not count toward squad size and can be promoted at any time.

---

## 10. Progression, personality and morale

### 10.1 Development **[Agreed]**

Each player has a development type rolled at creation:

| Type | Share | Behaviour |
|---|---|---|
| Standard | 70% | Follows the age curve toward POT |
| Off-curve | 20% | Early bloomer, late bloomer, or early decliner (curve shifted by 2 to 4 years) |
| Fully random | 10% | Random swings each update, can exceed or fall short of POT |

**No manual training focus.** Influences on development: age, POT gap, **playing time**, **coach levels** (by attribute group), **training facilities**.

### 10.2 Age curve **[Proposal]**

Monthly change toward POT for the own squad (yearly change for others is the sum of 12 months, computed at once):

| Age | Expected OVR change per season (standard type) |
|---|---|
| 16 to 19 | +4 to +8 |
| 20 to 23 | +2 to +5 |
| 24 to 27 | 0 to +2 |
| 28 to 30 | −1 to +1 |
| 31 to 33 | −2 to −4 |
| 34+ | −4 to −8 (physical attributes drop fastest) |

```
monthlyGain = curve(age) × gapFactor(POT − OVR) × playtime(minutesShare) × coachFactor × facilityFactor × noise
playtime:       0.6 (no minutes) to 1.2 (regular starter)
coachFactor:    0.85 (level 1) to 1.25 (level 100)
facilityFactor: 0.9 (level 1) to 1.15 (level 10)
```

Gains are distributed across attributes weighted by the player's main position, then OVR is recomputed.

Retirement: probability rises from age 33, near certain at 40 (GKs +2 years).

### 10.3 Personality **[Agreed]**

A hidden 1 to 100 value, shown as a label (Volatile / Demanding / Balanced / Professional / Model Pro).

- **High:** calm, loyal, accepts lower pay, morale falls slowly.
- **Low:** angry, demands more money, unsettles when not playing, may push for a transfer.

### 10.4 Morale **[Agreed + Proposal]**

Per player, 0 to 100, updated weekly. Drivers:

| Driver | Effect |
|---|---|
| Playing time vs expectation (star/starter/rotation/backup) | Biggest driver |
| Team results (last 5) | ± |
| Contract status (wage vs value, expiring soon) | − if underpaid |
| Rejected transfer request or bid | Big one-off − |
| Promotion, trophies | Big one-off + |
| Personality | Scales how much each driver moves morale |

Team morale (average of XI) feeds the match modifier in [6.2](#62-event-stream-engine-own-league).

---

## 11. Finance and economy

### 11.1 Rules **[Agreed]**

- **Sandbox:** no failure state, no administration, no points deductions. Money can go negative (shown in red) but nothing breaks. Debt only limits spending: you cannot start transfers or builds with negative cash.
- **Projections** are always visible: projected season-end balance, wage bill vs income, effect of a deal before you confirm it.

### 11.2 Income and costs **[Agreed]**

| Income | Cost |
|---|---|
| Gate receipts (home matches) | Player wages |
| TV and prize money (central distribution, by division and finish) | Staff wages |
| Sponsors (chosen each season or half season) | Stadium/facility upkeep |
| Merchandise and shop | Facility construction |
| Player sales (incl. sell-on income) | Transfer fees and loan fees |

### 11.3 Starting numbers per division **[Proposal, for tuning]**

All money in GBP. These are starting points tuned to feel right, not real accounts.

| Div | Avg wage / week (starter) | Stadium capacity (typical) | Avg attendance | Avg ticket | TV + central / season | Main sponsor / season | Merch / season | Avg transfer fee (avg player) |
|---|---|---|---|---|---|---|---|---|
| 1 | £60,000 | 40,000 | 38,000 | £50 | £110m (+£2m/place) | £15m | £20m | £25m |
| 2 | £12,000 | 25,000 | 17,000 | £28 | £9m | £1.5m | £2m | £2.5m |
| 3 | £3,500 | 12,000 | 8,000 | £24 | £1.5m | £350k | £500k | £300k |
| 4 | £1,800 | 8,000 | 4,500 | £20 | £1m | £150k | £200k | £80k |
| 5 | £800 | 5,000 | 2,000 | £18 | £120k | £60k | £60k | £20k |
| 6 | £350 | 3,000 | 700 | £14 | £40k | £25k | £20k | £5k |
| 7 | £180 | 2,000 | 350 | £12 | £10k | £12k | £8k | £1k |
| 8 | £100 | 1,500 | 200 | £10 | £5k | £6k | £4k | Free or nominal |
| 9 | £50 | 1,000 | 110 | £7 | £2.5k | £3k | £1.5k | Free |
| 10 | £25 | 600 | 60 | £5 | £1k | £1.5k | £500 | Free |

**Starting the game in division 9:** cash £40,000 (enough for a few wages and a first small facility). Facilities all level 1, staff level 5 to 15, squad of ~22 players OVR 34 to 46.

**Season shape for money:** every club plays **19 home matches** a season (plus a home playoff tie if drawn), so season gate ≈ 19 × attendance × ticket.

**Prize money by finish:** `prize = base(div) × (1.5 − (position − 1) / 19)`, so 1st gets 1.5× base, last gets 0.5×. Promotion bonus = 25% of the next division's central payment.

**Attendance model:**

```
attendance = min(capacity,
  baseAttendance(div)
  × reputationFactor   (0.7 to 1.5, grows with success over seasons)
  × formFactor         (0.85 to 1.15, last 5 home results)
  × priceFactor        (lower ticket price → more fans, elasticity ~ −0.6)
  × facilityFactor     (stadium comfort, 1.0 to 1.2))
```

Ticket price is set by the user within a range allowed by stadium tier.

### 11.4 Sponsors **[Agreed + Proposal]**

- At the start of each season (and optionally at the half-season point) the commercial manager brings **2 to 4 offers**.
- Offer shapes: **Safe** (fixed amount), **Performance** (lower base + bonus per win / for promotion), **Long-term** (2 to 3 seasons fixed, slightly lower per year).
- Commercial manager level raises the amounts and the number of offers.

### 11.5 Facility costs **[Proposal]**

Cost scales with level, not with division, so early levels are affordable in division 9:

| Facility level | Build cost | Build time | Upkeep / week |
|---|---|---|---|
| 1 → 2 | £10k | 4 weeks | £50 |
| 2 → 3 | £30k | 6 weeks | £150 |
| 3 → 4 | £100k | 8 weeks | £400 |
| 4 → 5 | £300k | 12 weeks | £1k |
| 5 → 6 | £1m | 16 weeks | £3k |
| 6 → 7 | £3m | 20 weeks | £8k |
| 7 → 8 | £10m | 26 weeks | £20k |
| 8 → 9 | £30m | 36 weeks | £50k |
| 9 → 10 | £80m | 52 weeks | £120k |

Stadium stands are priced per seat instead (about £300 per terrace place, £1,200 per seat at low tiers, scaling up).

### 11.6 Player value **[Proposal]**

```
value = baseValue(OVR) × ageFactor × potFactor × contractFactor × divisionFactor
baseValue(OVR) ≈ £1k × 1.12^(OVR − 35)       (≈ £1k at 35, ≈ £30k at 65, ≈ £14m at 90+)
ageFactor:      1.4 at 18 → 1.0 at 25 → 0.3 at 33
contractFactor: 1.0 with 3+ years, down to 0.3 with < 6 months left
```

---

## 12. Board, inbox and end-of-season reel

### 12.1 Board **[Agreed]**

- An **approval meter** (0 to 100), informational only. **No sacking.**
- Each season the board sets **soft goals**: e.g. "Finish top half", "Promotion", "Keep wages under 70% of income", "Give academy players minutes".
- Feedback messages through the season.
- **Small rewards** for meeting goals: a bonus cash injection, or a discount on the next facility build.

### 12.2 Inbox **[Agreed]**

- Batched messages grouped by category (Transfers, Squad, Staff, Finance, Board, League).
- Only messages that need a decision stop the Continue button.

### 12.3 End-of-season reel **[Agreed, an important reward]**

A swipeable sequence of full-screen cards:

1. **The result:** final position, promotion/relegation moment, final table.
2. **By the numbers:** goals, points, clean sheets, attendance, biggest win.
3. **Stars:** player of the season, top scorer, young player, breakthrough.
4. **Money:** income vs costs, biggest sale, biggest signing, balance change.
5. **Board verdict:** goals hit/missed, approval change, reward.
6. **History graphs:** league level, finish position, points, attendance, revenue, squad avg OVR across **all previous seasons**.
7. **Records:** new club records (most points, record signing, record sale, record attendance, top scorer all-time).
8. **Next season preview:** new division, predicted finish, board goals, contracts expiring.

---

## 13. UI, art and audio

### 13.1 Style **[Agreed]**

- **Modern pixel, "night match day" mood.** Palette: navy and charcoal backgrounds, pitch green, gold highlights, floodlight white, with a red/amber/green set for status.
- **Pixel chrome** (frames, buttons, icons, badges) plus a **clean compact font** for data and tables.
- **Not** Kairosoft or cartoon.
- Reference game: an American-football GM app. Borrow: hub screen with a big **Advance/Continue** button, **hexagon OVR badges**, **bottom tab bar**, `?` for unscouted values.
- **Feature card backdrops**: cards for distinct features, mostly on the Club tab, carry a faded pixel scene in the top-right corner (stadium stands for Stadium, goal and cones for Training, school building for Academy, shop front for Commercial, bank and coins for Finances, ticket for Tickets, billboard for Sponsors, clipboard for Staff, boardroom for Board, trophy for History). Lists and data-heavy cards stay plain.

### 13.2 Screens **[Proposal]**

Bottom tabs: **Hub · Squad · Transfers · Club · League**.

| Tab | Contents |
|---|---|
| Hub | One screen, no scrolling: starting XI OVR (focal point) and next match over the pixel stadium, league table, money, inbox, Continue button. See 13.2a |
| Squad | Squad list (OVR hex, position, age, morale, fitness, contract), formation picker, player detail, academy |
| Transfers | Scout shortlists, offers in/out, loan market, free agents, news feed |
| Club | Finances & projections, facilities builder, staff, sponsors, board goals |
| League | Table, fixtures/results, stats leaders, other divisions, club history |

### 13.2a Hub layout **[Agreed]**

Redone 2026-11-24 on Khen's feedback. The hub must fit one phone screen with no scrolling. Top to bottom:

1. **Hero** over the evolving pixel stadium (13.3): on the left the **starting XI OVR** as a large hexagon (average effective rating of the auto-picked XI, with its rank in the league and the attack/midfield/defence/keeper unit ratings); on the right the **next match** (opponent, home/away, week and date, opponent's league position, playoff tag) and the last result as a coloured chip.
2. **League table**: five rows around your club with form, played, goal difference and points, promotion/playoff/relegation colour bars, a link to the full table, and the cup status line when a cup run is active.
3. **Money**: cash, projected balance at 30 June and a small cash sparkline.
4. **Inbox**: decisions waiting for you first, then the newest messages, as many as fit; a gold Season review button shows when a review is unseen.
5. **Continue** stays bottom right.

Board, building projects and the cup card moved off the hub (Board and Facilities live in the Club tab, the cup in its overlay from the table card). On short screens (under 720px high) the hero shrinks and the inbox shows two items.

### 13.2b Install as an app **[Agreed]**

The web build is an installable PWA: web app manifest, pixel icons (a ball under floodlights), and a service worker that precaches the whole game so it loads and plays offline, under any base path (it is hosted at /footballGM/). An **Install app** button appears on the title screen and in Settings (Chrome/Edge/Android use the install prompt; iPhone/iPad show the Share, Add to Home Screen steps). Each deploy stamps a new cache version, so updates arrive on the next online launch. The single-file artifact build has no service worker.

### 13.2c Back button **[Agreed]**

The browser and phone back button must never leave the game (that showed a blank page). Browser history is kept in step with the screens: one entry for the hub, one more while a tab other than the hub is open, one more per overlay on top. Back closes the top overlay, then returns to the hub, and stays on the hub. Entries are only added from a tap (Chrome skips entries added without a user gesture, which was the cause of the blank page), the first one on the first touch rather than on load, and never from inside a back event. Logic lives in `src/ui/backNav.ts` with a test (`tests/back.test.ts`) that models Chrome's skipping and opens every kind of screen; `scripts/e2e-back.cjs` repeats the check in a real browser, including the installed-app mode.

### 13.3 Evolving stadium hub **[Agreed]**

The hub scene is built from layered pixel sprites that reflect facility upgrades: a lone rail and a portacabin in division 9, stands and floodlights later, a full bowl in division 1. Crowd density reflects last home attendance. Day/night tint follows match day.

### 13.4 Match report **[Agreed]**

Opens after Continue (with its own Continue back to the hub). Top card: a pixel stadium backdrop tinted in the two clubs' colours, a big pixel-font score, and each side's goal scorers centred under its badge and name (minutes beside each scorer). Below, in order: **Player ratings** (man of the match banner, then both XIs with coloured rating chips), **Match events**, **Stats**. Cards carry the same faded pixel art as the Club tab (scoreboard, whistle, pitch). There is no watch mode (removed 2026-11-24).

### 13.5 Audio **[Agreed]**

Chiptune via Web Audio: hub loop, match-day loop, goal sting, promotion fanfare, UI clicks. Global **mute** toggle (and separate music/SFX sliders).

### 13.6 Player portraits **[Agreed]**

Every player has a unique **pixel portrait** (16 by 18 grid), drawn from his id so it never changes: 6 skin tones, 7 hair colours (grey for veterans), 7 hair styles, 3 eye styles, 5 mouth and facial hair options (beards only from 21), and an extra (headband, glasses, earring, freckles, scar). The shirt uses his club's colours (neutral for free agents). The backdrop colour shows the position group (keeper amber, defence blue, midfield green, attack red).

Portraits appear on squad rows, club squad lists, scout recommendations, the starred shortlist, free agents, and large on the player screen. Each position group has its own idle animation: **keepers** bounce their gloves, **defenders** shake their head ("no way past"), **midfielders** scan left and right with their eyes, **forwards** do a quick sprint bounce with speed streaks. Animations stop with the system's reduced-motion setting.

---

## 14. Data schema

**[Proposal]** SQLite, one file per save. Integer primary keys. Money stored as integer pounds. Dates stored as `season` + `week` integers (game time), not wall-clock dates.

### 14.1 World

```sql
CREATE TABLE save_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,           -- schema version for migrations
  seed INTEGER NOT NULL,
  user_club_id INTEGER NOT NULL,
  chain_json TEXT NOT NULL,           -- league id per division 6..10 for the user's regional chain
  current_season INTEGER NOT NULL,    -- e.g. 2025 = 2025/26
  current_week INTEGER NOT NULL,      -- 1..52 (week 1 = first week of July)
  settings_json TEXT                  -- mute, speed, etc.
);

CREATE TABLE country (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,          -- ISO 3166 alpha-3
  name TEXT NOT NULL,
  has_league_sim INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE region (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL, lon REAL
);

CREATE TABLE league (
  id INTEGER PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES country(id),
  division INTEGER NOT NULL,          -- 1..10
  name TEXT NOT NULL,
  short_name TEXT,
  num_teams INTEGER NOT NULL DEFAULT 20 CHECK (num_teams = 20 OR is_simulated = 0),
  promo_spots INTEGER NOT NULL DEFAULT 2,     -- automatic
  playoff_spots INTEGER NOT NULL DEFAULT 4,   -- 3rd-6th, one extra promotion place
  releg_spots INTEGER NOT NULL DEFAULT 3,
  is_simulated INTEGER NOT NULL DEFAULT 0, -- 1 = divisions 1-5 + the user's regional chain
  center_lat REAL, center_lon REAL         -- for regional assignment
);

CREATE TABLE club (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  abbrev TEXT NOT NULL,               -- 3 letters
  country_id INTEGER NOT NULL REFERENCES country(id),
  region_id INTEGER REFERENCES region(id),
  color_primary TEXT NOT NULL,
  color_secondary TEXT NOT NULL,
  stadium_name TEXT,
  capacity INTEGER NOT NULL,
  seats INTEGER NOT NULL,
  reputation INTEGER NOT NULL,        -- 1..100
  ai_type TEXT CHECK (ai_type IN ('buyer','developer','seller')),
  cash INTEGER NOT NULL DEFAULT 0,
  ticket_price INTEGER NOT NULL,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  strength REAL                       -- off-chain clubs: yearly strength rating (top 14 players)
);

CREATE TABLE club_season (           -- membership per season; standings only for simulated leagues
  club_id INTEGER NOT NULL REFERENCES club(id),
  season INTEGER NOT NULL,
  league_id INTEGER NOT NULL REFERENCES league(id),
  played INTEGER DEFAULT 0, won INTEGER DEFAULT 0, drawn INTEGER DEFAULT 0, lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0, goals_against INTEGER DEFAULT 0, points INTEGER DEFAULT 0,
  final_position INTEGER,
  outcome TEXT,                       -- 'promoted','relegated','champion', etc.
  attack_rating REAL, defence_rating REAL,  -- cached for bulk sim
  avg_attendance INTEGER,
  PRIMARY KEY (club_id, season)
);
```

### 14.2 People

```sql
CREATE TABLE player (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date INTEGER NOT NULL,        -- game-days or YYYYMMDD
  country_id INTEGER NOT NULL REFERENCES country(id),
  is_real INTEGER NOT NULL DEFAULT 0,
  club_id INTEGER REFERENCES club(id),        -- NULL = free agent
  is_academy INTEGER NOT NULL DEFAULT 0,
  preferred_foot TEXT CHECK (preferred_foot IN ('L','R','B')),
  ovr INTEGER NOT NULL,               -- cached best position OVR
  pot INTEGER NOT NULL,               -- hidden
  main_position TEXT NOT NULL,
  personality INTEGER NOT NULL,       -- hidden 1..100
  dev_type TEXT NOT NULL,             -- 'standard','early','late','decliner','random'
  injury_proneness INTEGER NOT NULL,
  consistency INTEGER NOT NULL,
  morale INTEGER NOT NULL DEFAULT 60,
  fitness INTEGER NOT NULL DEFAULT 100,
  value INTEGER NOT NULL,
  retired INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_player_club ON player(club_id);

CREATE TABLE player_attributes (     -- one row per player, wide table for speed
  player_id INTEGER PRIMARY KEY REFERENCES player(id),
  finishing INTEGER, long_shots INTEGER, passing INTEGER, crossing INTEGER, dribbling INTEGER,
  first_touch INTEGER, heading INTEGER, tackling INTEGER, marking INTEGER, set_pieces INTEGER,
  vision INTEGER, decisions INTEGER, composure INTEGER, positioning INTEGER, off_the_ball INTEGER,
  anticipation INTEGER, work_rate INTEGER, aggression INTEGER, leadership INTEGER,
  pace INTEGER, acceleration INTEGER, stamina INTEGER, strength INTEGER, agility INTEGER, jumping INTEGER,
  reflexes INTEGER, handling INTEGER, one_on_ones INTEGER, aerial_command INTEGER, kicking INTEGER, gk_positioning INTEGER
);

CREATE TABLE player_position (
  player_id INTEGER NOT NULL REFERENCES player(id),
  position TEXT NOT NULL,
  familiarity TEXT NOT NULL CHECK (familiarity IN ('natural','accomplished')),
  apps_in_position INTEGER DEFAULT 0,
  PRIMARY KEY (player_id, position)
);

CREATE TABLE player_rating_history ( -- for graphs; own squad monthly, others yearly
  player_id INTEGER NOT NULL REFERENCES player(id),
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  ovr INTEGER NOT NULL,
  PRIMARY KEY (player_id, season, week)
);

CREATE TABLE injury (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES player(id),
  type TEXT NOT NULL,
  start_season INTEGER, start_week INTEGER,
  weeks_out INTEGER NOT NULL
);

CREATE TABLE staff (
  id INTEGER PRIMARY KEY,
  first_name TEXT, last_name TEXT,
  birth_date INTEGER,
  role TEXT NOT NULL CHECK (role IN ('scout','coach_att','coach_mid','coach_def','coach_gk',
                                     'physio','doctor','youth_coach','commercial')),
  level INTEGER NOT NULL,             -- 1..100
  club_id INTEGER REFERENCES club(id),       -- NULL = available to hire
  wage_weekly INTEGER NOT NULL,
  contract_end_season INTEGER
);
```

### 14.3 Contracts and transfers

```sql
CREATE TABLE contract (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES player(id),
  club_id INTEGER NOT NULL REFERENCES club(id),
  type TEXT NOT NULL CHECK (type IN ('permanent','loan','loan_option','loan_obligation')),
  parent_club_id INTEGER REFERENCES club(id), -- for loans
  start_season INTEGER NOT NULL, start_week INTEGER NOT NULL,
  end_season INTEGER NOT NULL, end_week INTEGER NOT NULL,
  wage_weekly INTEGER NOT NULL,
  wage_share_pct INTEGER,             -- loans: % paid by loaning club
  squad_role TEXT CHECK (squad_role IN ('star','starter','rotation','backup','youth')),
  option_fee INTEGER,                 -- loan_option / loan_obligation
  obligation_condition TEXT,          -- e.g. 'apps>=20' or NULL
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_contract_player ON contract(player_id, active);

CREATE TABLE contract_clause (
  id INTEGER PRIMARY KEY,
  contract_id INTEGER NOT NULL REFERENCES contract(id),
  kind TEXT NOT NULL CHECK (kind IN ('sell_on','release','appearance_bonus','goal_bonus',
                                     'promotion_bonus','yearly_rise')),
  value INTEGER NOT NULL,             -- £ or % depending on kind
  beneficiary_club_id INTEGER REFERENCES club(id)  -- for sell_on
);

CREATE TABLE transfer_offer (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES player(id),
  from_club_id INTEGER REFERENCES club(id),   -- selling club
  to_club_id INTEGER NOT NULL REFERENCES club(id),
  type TEXT NOT NULL,                 -- same enum as contract.type
  fee INTEGER NOT NULL DEFAULT 0,
  terms_json TEXT,                    -- proposed clauses, loan details
  status TEXT NOT NULL CHECK (status IN ('pending','countered','accepted','rejected','completed','expired')),
  round INTEGER NOT NULL DEFAULT 1,
  created_season INTEGER, created_week INTEGER
);

CREATE TABLE transfer_history (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES player(id),
  from_club_id INTEGER, to_club_id INTEGER,
  type TEXT NOT NULL,
  fee INTEGER NOT NULL,
  season INTEGER NOT NULL, week INTEGER NOT NULL
);
```

### 14.4 Matches

```sql
CREATE TABLE fixture (
  id INTEGER PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES league(id),
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  home_club_id INTEGER NOT NULL REFERENCES club(id),
  away_club_id INTEGER NOT NULL REFERENCES club(id),
  home_goals INTEGER, away_goals INTEGER,     -- NULL until played
  attendance INTEGER,
  is_full_sim INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_fixture_week ON fixture(season, week);

CREATE TABLE match_event (           -- only full-sim matches; pruned after 1 season
  fixture_id INTEGER NOT NULL REFERENCES fixture(id),
  seq INTEGER NOT NULL,
  minute INTEGER NOT NULL,
  type TEXT NOT NULL,                 -- 'shot','goal','save','foul','yellow','red','injury','sub',...
  club_id INTEGER,
  player_id INTEGER, player2_id INTEGER,
  x INTEGER, y INTEGER,
  xg REAL,
  PRIMARY KEY (fixture_id, seq)
);

CREATE TABLE player_match_stats (    -- own league only
  fixture_id INTEGER NOT NULL REFERENCES fixture(id),
  player_id INTEGER NOT NULL REFERENCES player(id),
  club_id INTEGER NOT NULL,
  position TEXT, minutes INTEGER, goals INTEGER, assists INTEGER,
  rating REAL,                        -- 1.0..10.0 match rating
  PRIMARY KEY (fixture_id, player_id)
);

CREATE TABLE player_season_stats (   -- all players, all leagues
  player_id INTEGER NOT NULL REFERENCES player(id),
  season INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  apps INTEGER DEFAULT 0, minutes INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0, yellow INTEGER DEFAULT 0, red INTEGER DEFAULT 0,
  avg_rating REAL,
  PRIMARY KEY (player_id, season, club_id)
);
```

### 14.5 Club management

```sql
CREATE TABLE facility (
  club_id INTEGER NOT NULL REFERENCES club(id),
  branch TEXT NOT NULL CHECK (branch IN ('stadium','training','academy','commercial')),
  level INTEGER NOT NULL DEFAULT 1,
  choices_json TEXT,                  -- either/or picks taken so far
  PRIMARY KEY (club_id, branch)
);

CREATE TABLE facility_project (
  id INTEGER PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES club(id),
  branch TEXT NOT NULL,
  upgrade_key TEXT NOT NULL,          -- id from facilities data file
  cost INTEGER NOT NULL,
  start_season INTEGER, start_week INTEGER,
  weeks_total INTEGER NOT NULL,
  weeks_left INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('building','done','cancelled'))
);

CREATE TABLE sponsor_deal (
  id INTEGER PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES club(id),
  sponsor_name TEXT NOT NULL,
  shape TEXT NOT NULL CHECK (shape IN ('safe','performance','long_term')),
  base_amount INTEGER NOT NULL,
  bonus_json TEXT,
  start_season INTEGER, end_season INTEGER,
  status TEXT NOT NULL CHECK (status IN ('offered','active','expired','declined'))
);

CREATE TABLE finance_txn (           -- ledger; aggregated per week for older seasons
  id INTEGER PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES club(id),
  season INTEGER NOT NULL, week INTEGER NOT NULL,
  category TEXT NOT NULL,             -- 'gate','tv','prize','sponsor','merch','sale','wages','staff','upkeep','build','purchase',...
  amount INTEGER NOT NULL,            -- + income, - cost
  ref_id INTEGER, note TEXT
);
CREATE INDEX idx_fin_club_season ON finance_txn(club_id, season);
```

AI clubs do not get a full ledger: their cash is updated with a single weekly net figure.

### 14.6 Scouting, board, inbox, history

```sql
CREATE TABLE scout_assignment (
  id INTEGER PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  position TEXT, min_age INTEGER, max_age INTEGER,
  max_fee INTEGER, max_wage INTEGER,
  next_report_week INTEGER
);

CREATE TABLE scout_report (          -- what the user knows about a player
  player_id INTEGER PRIMARY KEY REFERENCES player(id),
  ovr_low INTEGER, ovr_high INTEGER,
  pot_low INTEGER, pot_high INTEGER, -- NULL = '?'
  traits_known INTEGER NOT NULL DEFAULT 0,
  scout_level INTEGER NOT NULL,
  season INTEGER, week INTEGER
);

CREATE TABLE shortlist_entry (
  player_id INTEGER NOT NULL REFERENCES player(id),
  source TEXT NOT NULL,               -- 'scout','user'
  added_season INTEGER, added_week INTEGER,
  PRIMARY KEY (player_id)
);

CREATE TABLE board_goal (
  id INTEGER PRIMARY KEY,
  season INTEGER NOT NULL,
  kind TEXT NOT NULL,                 -- 'finish_position','promotion','wage_ratio','youth_minutes',...
  target INTEGER,
  achieved INTEGER,                   -- NULL until evaluated
  reward_json TEXT
);

CREATE TABLE board_state (
  season INTEGER PRIMARY KEY,
  approval INTEGER NOT NULL
);

CREATE TABLE inbox_message (
  id INTEGER PRIMARY KEY,
  season INTEGER, week INTEGER,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  action_json TEXT,                   -- buttons and their targets, NULL = info only
  blocks_continue INTEGER NOT NULL DEFAULT 0,
  read INTEGER NOT NULL DEFAULT 0,
  resolved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE news_item (
  id INTEGER PRIMARY KEY,
  season INTEGER, week INTEGER,
  kind TEXT, text TEXT
);

CREATE TABLE season_summary (        -- one row per season for the user club, feeds reel + graphs
  season INTEGER PRIMARY KEY,
  division INTEGER, league_id INTEGER,
  position INTEGER, points INTEGER, goals_for INTEGER, goals_against INTEGER,
  avg_attendance INTEGER, revenue INTEGER, costs INTEGER, cash_end INTEGER,
  squad_avg_ovr REAL, approval_end INTEGER,
  player_of_season_id INTEGER, top_scorer_id INTEGER, young_player_id INTEGER,
  data_json TEXT                      -- anything extra the reel needs
);

CREATE TABLE club_record (
  key TEXT PRIMARY KEY,               -- 'most_points','record_signing','record_sale','record_attendance',...
  value INTEGER NOT NULL,
  player_id INTEGER, season INTEGER, note TEXT
);
```

### 14.7 Static data files (not in the save)

| File | Contents |
|---|---|
| `positionWeights.json` | Attribute weights and `a`, `b` scale per position |
| `positionAdjacency.json` | Which positions count as adjacent |
| `formations.json` | Slots and coordinates per formation |
| `economy.json` | Per-division table from [11.3](#113-starting-numbers-per-division) |
| `facilities.json` | Upgrade tree, costs, times, upkeep, effects, either/or groups |
| `names/*.json` | Name lists per country/region |
| `seed.db` | Initial world (clubs, leagues, players) |

---

## 15. Open questions

| # | Question | Default if not decided |
|---|---|---|
| 1 | **Real player data source and licensing.** Which dataset for 2025/26 squads, and is scraping acceptable for a personal, non-commercial app? | Build the pipeline against a CSV so the source can be swapped; ship generated-only until decided. |
| 2 | How to **estimate ratings for real players** without copying another game's ratings? | Estimate from league level, minutes, age and market-value tier (see [3.4](#34-data-pipeline)). |
| 3 | ~~Parallel league reallocation~~ **Decided:** simulate only the player's regional chain; off-chain clubs are names + strength, players still in the database (see [3.1](#31-the-pyramid-agreed--proposal)). Remaining question: should the chain ever change (e.g. if the user wants to start somewhere else in a new save)? | Chain fixed per save. |
| 4 | Does the user **pick any club** in division 9, or from a curated list? | Any club in any div 9 league. |
| 5 | ~~Playoffs~~ **Decided with the 20-team rule:** 2 automatic + 1 via playoffs (3rd to 6th), 3 relegated, in every league. Remaining question: neutral-venue final or higher seed at home? | Higher seed at home. |
| 6 | Can the user **lock players** into the XI, or is auto-pick final? | Auto-pick plus a "lock" toggle per player. |
| 7 | Should **ground grading** block promotion, fine the club, or be cosmetic? | Fine + one season grace (sandbox friendly). |
| 8 | **Board rewards**: cash only, or also unlocks? | Cash or facility discount. |
| 9 | **Cups** (FA Cup, FA Trophy, FA Vase): which, and when? | Later stage (5); schema leaves room via `league`-like `competition` rows. |
| 10 | How many **seasons** should a save support before performance degrades? | Target 50 seasons; prune events and ledgers older than 1 to 2 seasons. |
| 11 | **Name generation** for generated players: English only, or mix by region/diaspora? | Weighted mix by region. |
| 12 | Do **AI clubs** in divisions 9 to 10 develop facilities over time? | Light: reputation and capacity drift with success. |
| 13 | Is there any **difficulty** setting (e.g. starting cash, AI aggressiveness)? | No difficulty in v1. |
| 14 | ~~Watch mode length~~ | Dropped: the 2D watch mode was removed. |
| 15 | **Pool swap at divisions 2 to 5**: is swapping a relegated club for a stronger pool club fair, or should pool clubs just drift down a tier each year? | One swap per tier per year (see [3.1](#31-the-pyramid-agreed--proposal)). |

---

## 16. Roadmap

**[Proposed, pending Khen's OK]**

| Stage | Goal | Main deliverables | Done when |
|---|---|---|---|
| **1. Foundation** | A world that plays itself | SQLite schema + migrations, seed pipeline (generated players first), pyramid with promotion/relegation, match engine (event + bulk), fixtures, tables, headless sim runner | 20 seasons sim headless with believable tables and goal totals |
| **2. Management core** | Be a GM | Squad screen, formation + auto-pick, contracts & negotiation, transfers & loans & clauses, scouting shortlists, AI club behaviour, finances & projections, inbox, Continue flow, autosave | A full season can be played with signings and sales |
| **3. Club building** | Grow the club | Facilities tree, staff hiring + caps, academy intake, progression & age curve, personality & morale, injuries | Club visibly improves over 5 seasons from div 9 |
| **4. Reward & polish** | Make it feel great | End-of-season reel, history graphs & records, board goals, pixel art pass, evolving stadium hub, chiptune audio | The reel is something you look forward to |
| **5. Extras** | Depth | Cups, foreign player pools, real player data | As prioritised |

Each stage ends with a playable build on device (Capacitor) and a balance pass using the headless sim.
