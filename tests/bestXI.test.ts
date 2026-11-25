import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { autoPick, bestAssignment, teamOvr } from '../src/core/selection';
import { squadOf } from '../src/core/state';
import { FORMATION_NAMES } from '../src/core/data/formations';
import { Rng } from '../src/core/rng';
import '../src/core/systems/all';

function brute(score: number[][]): number {
  const n = score.length, m = score[0].length;
  let best = -Infinity;
  const used = new Array(m).fill(false);
  const go = (i: number, sum: number) => {
    if (i === n) { best = Math.max(best, sum); return; }
    for (let j = 0; j < m; j++) if (!used[j]) { used[j] = true; go(i + 1, sum + score[i][j]); used[j] = false; }
  };
  go(0, 0);
  return best;
}

describe('best XI', () => {
  it('the assignment matches brute force on small random cases', () => {
    const rng = new Rng(5);
    for (let k = 0; k < 40; k++) {
      const n = 2 + (k % 4), m = n + (k % 3);
      const sc = Array.from({ length: n }, () => Array.from({ length: m }, () => Math.round(rng.range(20, 90))));
      const pick = bestAssignment(sc);
      expect(new Set(pick).size).toBe(n);
      expect(pick.reduce((a, j, i) => a + sc[i][j], 0)).toBe(brute(sc));
    }
  });

  it('optimal pick is never worse than greedy, for every formation and many clubs', () => {
    const s = newGame(41, clubsInLeague(startingLeagues()[3].key)[2]);
    let better = 0;
    for (const c of s.clubs.slice(0, 60)) {
      const squad = squadOf(s, c.id);
      if (squad.length < 11) continue;
      for (const f of FORMATION_NAMES) {
        const g = teamOvr(autoPick(squad, f));
        const o = teamOvr(autoPick(squad, f, 7, true));
        expect(o).toBeGreaterThanOrEqual(g - 0.5); // morale weighting can trade a fraction of a point
        if (o > g + 0.05) better++;
      }
    }
    expect(better).toBeGreaterThan(0);
  });

  it('keeps locked players in the XI', () => {
    const s = newGame(42, clubsInLeague(startingLeagues()[3].key)[2]);
    const squad = squadOf(s, s.userClubId).filter((p) => !p.academy);
    const worst = [...squad].sort((a, b) => a.ovr - b.ovr)[0];
    worst.locked = true;
    expect(autoPick(squad, '4-4-2', 7, true).xi).toContain(worst);
  });
});
