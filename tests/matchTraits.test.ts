import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { buildSquadIndex } from '../src/core/state';
import { expectedGoals, makeSide, simulateMatch } from '../src/core/match';
import { Rng } from '../src/core/rng';
import { computeTraits } from '../src/core/traits';
import '../src/core/systems/all';

const lg = startingLeagues()[0];
const s = newGame(4242, clubsInLeague(lg.key)[0]);
const idx = buildSquadIndex(s);
const ids = s.leagues[4].clubIds; // a mid-table division
const squadOf = (id: number) => idx.get(id) ?? [];

const PACE = 19, ACC = 20, HEAD = 6, JUMP = 24, STR = 22, FIN = 0, COMP = 12, REF = 25, HAND = 26, ONE = 27, GKP = 30;

describe('attribute traits in the match sim', () => {
  it('equal teams get equal expected goals apart from home advantage', () => {
    const c = s.clubs[ids[0]];
    const a = makeSide(c, squadOf(c.id));
    const b = makeSide(c, squadOf(c.id));
    const h = expectedGoals(a.units, b.units, a.morale, b.morale, true, a.tr, b.tr);
    const w = expectedGoals(b.units, a.units, b.morale, a.morale, false, b.tr, a.tr);
    expect(h / w).toBeCloseTo(1.13 / 0.91, 1);
  });

  it('pace, creativity and aerial edges each raise expected goals; a stronger back line lowers them', () => {
    const c = s.clubs[ids[0]];
    const x = makeSide(c, squadOf(c.id));
    const base = expectedGoals(x.units, x.units, 60, 60, true, x.tr, x.tr);
    const up = (k: keyof typeof x.tr, v: number) => expectedGoals(x.units, x.units, 60, 60, true, { ...x.tr, [k]: x.tr[k] + v }, x.tr);
    const down = (k: keyof typeof x.tr, v: number) => expectedGoals(x.units, x.units, 60, 60, true, x.tr, { ...x.tr, [k]: x.tr[k] + v });
    expect(up('paceA', 15)).toBeGreaterThan(base);
    expect(up('create', 15)).toBeGreaterThan(base);
    expect(up('airA', 15)).toBeGreaterThan(base);
    expect(down('paceD', 15)).toBeLessThan(base);
    expect(down('stop', 15)).toBeLessThan(base);
    expect(down('airD', 15)).toBeLessThan(base);
  });

  it('computes traits from the XI attributes', () => {
    const c = s.clubs[ids[1]];
    const side = makeSide(c, squadOf(c.id));
    const t = computeTraits(side.lineup);
    for (const v of Object.values(t)) expect(v).toBeGreaterThan(0);
    for (const p of side.lineup.xi) if (p && p.pos !== 'GK') { p.attrs[PACE] = 99; p.attrs[ACC] = 99; }
    expect(computeTraits(side.lineup).paceA).toBeGreaterThan(t.paceA + 5);
  });

  // run many matches between two copies of the same club, then change one attribute group on one side
  const play = (mod: (side: ReturnType<typeof makeSide>) => void, n = 500) => {
    const c = s.clubs[ids[2]], d = s.clubs[ids[3]];
    const rng = new Rng(99);
    const saved = [...squadOf(c.id), ...squadOf(d.id)].map((p) => [p, p.attrs.slice()] as const);
    let g0 = 0, g1 = 0, kinds: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      for (const p of [...squadOf(c.id), ...squadOf(d.id)]) { p.fitness = 100; p.injury = 0; p.ban = 0; }
      const a = makeSide(c, squadOf(c.id));
      const b = makeSide(d, squadOf(d.id));
      mod(a);
      const r = simulateMatch(rng, a, b, i, 2025, true);
      g0 += r.hg; g1 += r.ag;
      for (const e of r.report!.events) if (e.t === 'goal' && e.c === c.id && e.k) kinds[e.k] = (kinds[e.k] ?? 0) + 1;
    }
    for (const [p, at] of saved) p.attrs = at; // leave the world as it was
    return { g0, g1, kinds };
  };

  it('attackers with much better pace score more, mostly from runs in behind', () => {
    const base = play(() => {});
    const fast = play((side) => {
      for (const p of side.lineup.xi) if (p && p.pos !== 'GK') { p.attrs[PACE] = Math.min(99, p.attrs[PACE] + 25); p.attrs[ACC] = Math.min(99, p.attrs[ACC] + 25); }
      side.tr = computeTraits(side.lineup);
    });
    expect(fast.g0).toBeGreaterThan(base.g0);
    expect(fast.kinds.brk ?? 0).toBeGreaterThan(base.kinds.brk ?? 0);
  });

  it('a keeper with better shot-stopping concedes less', () => {
    const base = play(() => {});
    const wall = play((side) => {
      // improve the opponent side's keeper by improving this side's keeper and checking goals against
      const gk = side.lineup.xi.find((p, i) => p && side.lineup.slots[i].pos === 'GK')!;
      for (const k of [REF, HAND, ONE, GKP]) gk.attrs[k] = 99;
    });
    expect(wall.g1).toBeLessThan(base.g1);
  });

  it('keeps goals per game realistic', () => {
    const r = play(() => {}, 400);
    const perGame = (r.g0 + r.g1) / 400;
    expect(perGame).toBeGreaterThan(2.1);
    expect(perGame).toBeLessThan(3.3);
  });
});
void HEAD; void JUMP; void STR; void FIN; void COMP;
