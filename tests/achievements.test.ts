import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { ACHIEVEMENTS, buildCtx, newlyEarned } from '../src/core/achievements';
import { userStats } from '../src/core/systems/stats';
import '../src/core/systems/all';

const club = clubsInLeague(startingLeagues()[3].key)[2];

describe('achievements', () => {
  it('has exactly 100 unique, club-independent achievements across all tiers', () => {
    expect(ACHIEVEMENTS.length).toBe(100);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(100);
    for (const t of [1, 2, 3, 4]) expect(ACHIEVEMENTS.filter((a) => a.tier === t).length).toBeGreaterThan(5);
    expect(ACHIEVEMENTS.filter((a) => a.hidden).length).toBeGreaterThanOrEqual(3);
    expect(ACHIEVEMENTS.every((a) => a.goal > 0 && a.name && a.desc)).toBe(true);
  });

  it('starts empty on a new game and unlocks real milestones after a season', () => {
    const s = newGame(31, club);
    expect(newlyEarned(s, new Set())).toEqual([]);
    for (let i = 0; i < 200 && !s.ext.reelPending; i++) {
      for (const m of s.inbox) if (m.action?.kind === 'decision') m.resolved = true;
      advanceWeek(s);
    }
    const st = userStats(s);
    expect(st.w + st.d + st.l).toBeGreaterThanOrEqual(30);
    expect(st.gf).toBeGreaterThan(0);
    const got = new Set(newlyEarned(s, new Set()));
    expect(got.has('seasons_1')).toBe(true);
    expect(got.has('win_1')).toBe(true);
    expect(buildCtx(s).se.length).toBe(1);
    // already-held achievements are not offered again
    expect(newlyEarned(s, got)).toEqual([]);
  });
});
