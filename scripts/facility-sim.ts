/**
 * Multi-season check of the facility economy: the same career twice, once never building and once
 * building whenever it can afford to (keeping a cash buffer). `npx tsx scripts/facility-sim.ts [seasons] [seed]`
 */
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { squadOf } from '../src/core/state';
import { decisionChoices, pendingDecisions, resolveDecision } from '../src/core/systems/decisions';
import { TRACKS, effects, facState, nextUpgrade, startUpgrade, costOf, building } from '../src/core/systems/facilities';
import { labState } from '../src/core/systems/lab';
import { seasons } from '../src/core/systems/chronicle';
import '../src/core/systems/all';

const N = Number(process.argv[2] ?? 6);
const SEED = Number(process.argv[3] ?? 777);
const club = clubsInLeague(startingLeagues()[3].key)[2];

function run(build: boolean) {
  const s = newGame(SEED, club);
  const rows: string[] = [];
  let spent = 0;
  const start = s.season;
  while (s.season < start + N) {
    // decisions: renew contracts, otherwise take the first choice that is open
    for (const m of pendingDecisions(s)) {
      const ch = decisionChoices(s, m);
      const k = Math.max(0, ch.findIndex((c) => !c.disabled));
      resolveDecision(s, m.id, k);
    }
    for (const m of s.inbox) if (m.action && !m.resolved && m.action.kind !== 'decision') m.resolved = true;
    if (build) {
      const user = s.clubs[s.userClubId];
      const wages = squadOf(s, user.id).reduce((a, p) => a + (p.contract?.wage ?? 0), 0);
      // cheapest next level first, keep half a season of wages in the bank
      const opts = TRACKS.map((t) => (building(s, t.key) ? null : nextUpgrade(s, t.key))).filter((u) => u).sort((a, b) => a!.cost - b!.cost);
      for (const u of opts) {
        if (user.cash - costOf(s, u!) > wages * 26 + 5000) { spent += costOf(s, u!); startUpgrade(s, u!.id); }
      }
    }
    const before = s.season;
    advanceWeek(s);
    if (s.season !== before) {
      const u = seasons(s).at(-1)!;
      const user = s.clubs[s.userClubId];
      const lv = facState(s).levels;
      const xi = squadOf(s, user.id).map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11);
      rows.push(`${u.season} div ${u.div} pos ${String(u.pos).padStart(2)} ${u.outcome?.padEnd(14)} inc ${Math.round(u.income / 1000)}k cost ${Math.round(u.costs / 1000)}k cash ${Math.round(user.cash / 1000)}k | fac S${lv.stadium} T${lv.training} A${lv.academy} C${lv.commercial} upkeep ${Math.round(Number(s.ext.upkeep))}/wk | XI ${(xi.reduce((a, b) => a + b, 0) / 11).toFixed(1)} squad ${squadOf(s, user.id).length} cap ${user.capacity}`);
    }
  }
  const e = effects(s);
  return { rows, spent, e, lab: labState(s) };
}

for (const b of [false, true]) {
  const r = run(b);
  console.log(b ? '\n=== builder' : '=== no building');
  r.rows.forEach((x) => console.log(x));
  if (b) console.log('spent', Math.round(r.spent / 1000) + 'k', 'effects', JSON.stringify(Object.fromEntries(Object.entries(r.e).filter(([, v]) => v).map(([k, v]) => [k, Math.round(v * 100) / 100]))), 'lab stock', JSON.stringify(r.lab.stock));
}
