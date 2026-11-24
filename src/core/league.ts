import { CAL, type GameState, type SimLeague } from './state';
import type { Rng } from './rng';
import type { Fixture, TableRow } from './types';

/** Double round-robin (circle method), 38 rounds for 20 clubs, home/away balanced. */
export function roundRobin(rng: Rng, clubIds: number[]): [number, number][][] {
  const ids = rng.shuffle([...clubIds]);
  if (ids.length % 2) ids.push(-1);
  const n = ids.length;
  const rounds: [number, number][][] = [];
  const arr = [...ids];
  for (let r = 0; r < n - 1; r++) {
    const round: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a < 0 || b < 0) continue;
      round.push(r % 2 === 0 ? (i === 0 ? [a, b] : [a, b]) : [b, a]);
    }
    rounds.push(round);
    arr.splice(1, 0, arr.pop()!);
  }
  const second = rounds.map((rd) => rd.map(([h, a]) => [a, h] as [number, number]));
  return [...rounds, ...second];
}

export function makeFixtures(s: GameState, rng: Rng): void {
  s.fixtures = [];
  for (const lg of s.leagues) {
    const rounds = roundRobin(rng, lg.clubIds);
    rounds.forEach((rd, r) => {
      for (const [h, a] of rd) {
        s.fixtures.push({ id: s.nextFixtureId++, div: lg.div, week: CAL.firstRoundWeek + r, home: h, away: a, hg: null, ag: null });
      }
    });
  }
}

export function computeTable(s: GameState, lg: SimLeague, uptoWeek = 99): TableRow[] {
  const rows = new Map<number, TableRow>();
  for (const id of lg.clubIds) rows.set(id, { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: '' });
  for (const f of s.fixtures) {
    if (f.div !== lg.div || f.playoff || f.hg == null || f.ag == null || f.week > uptoWeek) continue;
    const h = rows.get(f.home);
    const a = rows.get(f.away);
    if (!h || !a) continue;
    h.p++; a.p++;
    h.gf += f.hg; h.ga += f.ag; a.gf += f.ag; a.ga += f.hg;
    if (f.hg > f.ag) { h.w++; a.l++; h.pts += 3; h.form += 'W'; a.form += 'L'; }
    else if (f.hg < f.ag) { a.w++; h.l++; a.pts += 3; h.form += 'L'; a.form += 'W'; }
    else { h.d++; a.d++; h.pts++; a.pts++; h.form += 'D'; a.form += 'D'; }
  }
  const list = [...rows.values()];
  for (const r of list) r.form = r.form.slice(-5);
  const name = (id: number) => s.clubs[id].name;
  list.sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || name(x.clubId).localeCompare(name(y.clubId)));
  return list;
}

export function positionOf(s: GameState, clubId: number): number {
  const lg = s.leagues.find((l) => l.clubIds.includes(clubId));
  if (!lg) return 0;
  return computeTable(s, lg).findIndex((r) => r.clubId === clubId) + 1;
}

export function fixturesForWeek(s: GameState, week: number): Fixture[] {
  return s.fixtures.filter((f) => f.week === week);
}

export function nextFixture(s: GameState, clubId: number): Fixture | undefined {
  return s.fixtures.filter((f) => f.hg == null && (f.home === clubId || f.away === clubId)).sort((a, b) => a.week - b.week)[0];
}
