import { describe, expect, it } from 'vitest';
import { newGame, clubsInLeague, startingLeagues } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { CAL } from '../src/core/state';
import { hof, hofTotals } from '../src/core/systems/hof';

describe('Hall of Fame ledger', () => {
  it('keeps a full season of appearances and goals, also for players who are gone', () => {
    const s = newGame(21, clubsInLeague(startingLeagues()[0].key)[0]);
    const first = s.season;
    for (let i = 0; i < CAL.weeks + 2; i++) advanceWeek(s);
    expect(s.season).toBe(first + 1);
    const recs = Object.values(hof(s).recs);
    expect(recs.length).toBeGreaterThan(15);
    // compare with the career log of everyone still in the database
    let logApps = 0, ledgerApps = 0, goals = 0;
    for (const r of recs) {
      const p = s.players.get(r.id);
      const t = hofTotals(r);
      goals += t.goals;
      if (!p) continue;
      logApps += p.career.filter((c) => c.s === first && c.c === s.userClubId).reduce((a, c) => a + c.apps, 0);
      ledgerApps += t.apps;
    }
    expect(goals).toBeGreaterThan(20);
    expect(ledgerApps).toBeGreaterThanOrEqual(logApps);
    expect(recs.every((r) => r.seasons.length >= 1 && r.maxOvr > 0)).toBe(true);
  });
});
