/** Prints population means of the match traits (used to centre them in src/core/match.ts): `npx tsx scripts/balance.ts` */
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { buildSquadIndex } from '../src/core/state';
import { autoPick } from '../src/core/selection';
import { computeTraits, finishQ, keeperQ } from '../src/core/traits';
import '../src/core/systems/all';
const lg = startingLeagues()[0];
const s = newGame(12345, clubsInLeague(lg.key)[0]);
const idx = buildSquadIndex(s);
const keys = ['paceA', 'paceD', 'create', 'stop', 'airA', 'airD', 'stam'] as const;
const byDiv = new Map<number, Record<string, number[]>>();
for (const c of s.clubs) {
  const sq = idx.get(c.id) ?? [];
  if (sq.length < 11) continue;
  const lu = autoPick(sq, c.formation);
  const t = computeTraits(lu);
  const r = byDiv.get(c.div) ?? {};
  for (const k of keys) (r[k] ??= []).push(t[k]);
  const gk = lu.xi.find((p, i) => p && lu.slots[i].pos === 'GK');
  if (gk) (r.gk ??= []).push(keeperQ(gk, false));
  for (const p of lu.xi) if (p && p.pos !== 'GK' && ['ST', 'LW', 'RW', 'AM'].includes(p.pos)) (r.fin ??= []).push(finishQ.open(p));
  byDiv.set(c.div, r);
}
const m = (a: number[]) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
for (const [div, r] of [...byDiv].sort((a, b) => a[0] - b[0])) console.log('div', div, Object.entries(r).map(([k, v]) => `${k} ${m(v)}`).join(' | '));
