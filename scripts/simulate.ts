/**
 * Headless balance runner: `npm run sim -- [seasons] [seed]`.
 * Prints goals/game, home/draw/away split, champion points, and division OVR drift.
 */
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { computeTable } from '../src/core/league';
import { buildSquadIndex } from '../src/core/state';
import { DIV_AVG_OVR } from '../src/core/data/pyramid';
import '../src/core/systems/all';

const seasons = +(process.argv[2] ?? 3);
const seed = +(process.argv[3] ?? 12345);
const lg = startingLeagues()[0];
const club = clubsInLeague(lg.key)[0];
let t0 = performance.now();
const s = newGame(seed, club);
console.log(`newGame: ${(performance.now() - t0).toFixed(0)} ms, players ${s.players.size}, clubs ${s.clubs.length}, user ${club} (${lg.name})`);

for (let i = 0; i < seasons; i++) {
  const season = s.season;
  let goals = 0, games = 0, hw = 0, dr = 0, aw = 0;
  t0 = performance.now();
  let maxWeek = 0;
  const champPts: number[] = [];
  const tables = new Map<number, ReturnType<typeof computeTable>>();
  while (s.season === season) {
    const wt = performance.now();
    if (s.week === 46) {
      for (const l of s.leagues) tables.set(l.div, computeTable(s, l));
      for (const f of s.fixtures) if (!f.playoff && f.hg != null) { if (f.hg > f.ag!) hw++; else if (f.hg === f.ag) dr++; else aw++; }
    }
    const r = advanceWeek(s);
    maxWeek = Math.max(maxWeek, performance.now() - wt);
    void r;
    if (s.week === 47 || (s.week === 1 && s.season !== season)) {
      // collected below
    }
  }
  const secs = performance.now() - t0;
  for (const [, t] of tables) {
    champPts.push(t[0].pts);
    for (const row of t) { goals += row.gf; games += row.p; }
  }
  const hist = s.history.filter((h) => h.season === season);
  void hist;
  // home/draw/away from last season's history is not stored per match; recompute from tables is not possible, so sample via fixtures before rollover
  const idx = buildSquadIndex(s);
  const drift = s.leagues.map((l) => {
    const avg = l.clubIds.map((id) => (idx.get(id) ?? []).map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11)).flat();
    return (avg.reduce((a, b) => a + b, 0) / avg.length - DIV_AVG_OVR[l.div]).toFixed(1);
  });
  const u = s.clubs[s.userClubId];
  const L = s.fin.last;
  console.log(`  user ${u.name} div ${u.div} cash ${u.cash} | last season ${JSON.stringify(L)} | transfers ${s.transfers.filter((t) => t.season === season || t.season === season + 1).length}`);
  console.log(`Season ${season}: ${(secs / 1000).toFixed(2)} s (max week ${maxWeek.toFixed(0)} ms) | goals/game ${(goals / (games / 2)).toFixed(2)} | H/D/A ${pct(hw, hw + dr + aw)}/${pct(dr, hw + dr + aw)}/${pct(aw, hw + dr + aw)} | champion pts ${champPts.join(',')} | XI OVR vs band: ${drift.join(' ')} | players ${s.players.size}`);
  void hw; void dr; void aw;
}

function pct(a: number, b: number) { return Math.round((a / b) * 100) + '%'; }
