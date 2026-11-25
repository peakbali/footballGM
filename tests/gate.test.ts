import { describe, expect, it } from 'vitest';
import { newGame, clubsInLeague, startingLeagues } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { CAL, START_SEASON } from '../src/core/state';
import { gateBlocks, markLoadedCareer, markNewCareer } from '../src/core/gate';

const club = clubsInLeague(startingLeagues()[0].key)[0];

describe('free first season gate', () => {
  it('lets a new career play the whole first season, then blocks season two until unlocked', () => {
    const s = newGame(7, club);
    markNewCareer(s);
    let weeks = 0;
    while (!gateBlocks(s, false) && weeks < 60) { advanceWeek(s); weeks++; }
    expect(s.season).toBe(START_SEASON);
    expect(s.week).toBe(CAL.seasonEndWeek + 1); // right after the season review
    expect(s.history.some((h) => h.season === START_SEASON && h.clubId === s.userClubId)).toBe(true);
    expect(gateBlocks(s, true)).toBe(false);
  });

  it('keeps saves from before the gate fully playable', () => {
    const s = newGame(8, club);
    s.week = CAL.seasonEndWeek + 2; // an old save in the first off-season
    markLoadedCareer(s);
    expect(gateBlocks(s, false)).toBe(false);
    const t = newGame(9, club);
    markNewCareer(t);
    markLoadedCareer(t); // reloading a new career does not grandfather it
    t.week = CAL.seasonEndWeek + 2;
    expect(gateBlocks(t, false)).toBe(true);
  });
});

describe('fictional world', () => {
  it('ships no real club or league names', () => {
    const s = newGame(10, club);
    const names = s.clubs.map((c) => c.name).concat(s.leagues.map((l) => l.name), s.clubs.map((c) => c.stadium));
    for (const real of ['Arsenal', 'Liverpool', 'Chelsea', 'Real Madrid', 'Barcelona', 'Bayern', 'Juventus', 'Celtic FC', 'Premier League', 'Championship', 'National League', 'Anfield', 'Wembley'])
      expect(names.some((n) => n.includes(real))).toBe(false);
  });
});
