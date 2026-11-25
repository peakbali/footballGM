/**
 * Rating inflation audit: `npx tsx scripts/pot-audit.ts [seasons] [seed]`.
 * Prints, at the start and after each season, how many players sit at 80+/85+/90+ OVR and POT,
 * how many of them are free agents, and where the 85+ players came from (initial world or generated later).
 */
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { buildSquadIndex } from '../src/core/state';
import { DIV_AVG_OVR } from '../src/core/data/pyramid';
import '../src/core/systems/all';
import type { GameState } from '../src/core/state';

const seasons = +(process.argv[2] ?? 8);
const seed = +(process.argv[3] ?? 12345);
const lg = startingLeagues()[0];
const s = newGame(seed, clubsInLeague(lg.key)[0]);
const firstGenId = s.nextPlayerId;

function report(label: string, st: GameState) {
  const ps = [...st.players.values()].filter((p) => !p.retired);
  const fa = ps.filter((p) => p.clubId == null);
  const n = (arr: typeof ps, f: (p: (typeof ps)[0]) => number, t: number) => arr.filter((p) => f(p) >= t).length;
  const top = ps.filter((p) => p.ovr >= 85);
  const late = top.filter((p) => p.id >= firstGenId).length;
  const idx = buildSquadIndex(st);
  // div of club for top players
  const byDiv: Record<string, number> = {};
  for (const p of top) { const d = p.clubId == null ? 'FA' : String(st.clubs[p.clubId].div ?? '?'); byDiv[d] = (byDiv[d] ?? 0) + 1; }
  const potYoung = ps.filter((p) => st.season - p.birthYear <= 21);
  void idx;
  const ov = ps.map((p) => p.ovr).sort((a, b) => a - b);
  const q = (x: number) => ov[Math.floor(x * (ov.length - 1))];
  const xi = st.leagues.sort((a, b) => a.div - b.div).map((l) => {
    const all = l.clubIds.map((id) => (idx.get(id) ?? []).map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11)).flat();
    const avg = all.reduce((a, b) => a + b, 0) / all.length;
    const best = Math.max(...l.clubIds.map((id) => Math.max(...(idx.get(id) ?? []).map((p) => p.ovr))));
    return `D${l.div} ${avg.toFixed(1)}(${(avg - DIV_AVG_OVR[l.div] >= 0 ? '+' : '') + (avg - DIV_AVG_OVR[l.div]).toFixed(1)}) best ${best}`;
  });
  const cnt = [50, 60, 70, 80, 85, 90].map((t) => `${t}+ ${ps.filter((p) => p.ovr >= t).length}`).join(' ');
  console.log(`${label} | pct p10 ${q(0.1)} p50 ${q(0.5)} p90 ${q(0.9)} p99 ${q(0.99)} p99.9 ${q(0.999)} | ${cnt}`);
  const inLeague = new Set(st.leagues.flatMap((l) => l.clubIds));
  const where = (min: number) => { const g = ps.filter((p) => p.ovr >= min); const e = g.filter((p) => p.clubId != null && inLeague.has(p.clubId)).length; const fa = g.filter((p) => p.clubId == null).length; return `${min}+: eng ${e} other ${g.length - e - fa} FA ${fa}`; };
  const ages = (min: number) => { const g = ps.filter((p) => p.ovr >= min); const b = [0, 0, 0, 0]; for (const p of g) { const a = st.season - p.birthYear; b[a <= 23 ? 0 : a <= 27 ? 1 : a <= 30 ? 2 : 3]++; } return `ages <=23/24-27/28-30/31+ ${b.join('/')}`; };
  console.log(`   ${where(70)} | ${where(80)} | ${ages(80)}`);
  console.log(`   XI avg vs band: ${xi.join(' | ')}`);
  console.log(`${label} players ${ps.length} FA ${fa.length} | OVR 80+ ${n(ps, (p) => p.ovr, 80)} 85+ ${n(ps, (p) => p.ovr, 85)} 90+ ${n(ps, (p) => p.ovr, 90)} | POT 85+ ${n(ps, (p) => p.pot, 85)} 90+ ${n(ps, (p) => p.pot, 90)} | FA OVR 70+ ${n(fa, (p) => p.ovr, 70)} 80+ ${n(fa, (p) => p.ovr, 80)} 85+ ${n(fa, (p) => p.ovr, 85)} | 85+ generated later ${late}/${top.length} by div ${JSON.stringify(byDiv)} | U21 POT 85+ ${n(potYoung, (p) => p.pot, 85)}/${potYoung.length}`);
}
report('start', s);
for (let i = 0; i < seasons; i++) {
  const season = s.season;
  while (s.season === season) advanceWeek(s);
  report(`after ${season}`, s);
}
const fa = [...s.players.values()].filter((p) => p.clubId == null && p.ovr >= 75).sort((a, b) => b.ovr - a.ovr).slice(0, 12);
console.log('top FAs:', fa.map((p) => `${p.ovr}/${p.pot} age ${s.season - p.birthYear} ${p.dev} gen${p.id >= firstGenId ? 'late' : '0'}`).join(' | '));
