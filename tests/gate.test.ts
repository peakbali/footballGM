import { describe, expect, it } from 'vitest';
import { newGame, clubsInLeague, startingLeagues } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { CAL, START_SEASON } from '../src/core/state';
import { gateBlocks, markLoadedCareer, markNewCareer } from '../src/core/gate';
import { FICTIONAL_LEAGUES } from '../src/core/data/pyramid';
import { FICTIONAL_FOREIGN } from '../src/core/data/foreign';
import { REAL_WORLD } from '../src/core/edition';

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

describe('fictional world (Play build data, DESIGN 13.2y)', () => {
  it('ships no real club or league names', () => {
    const names = FICTIONAL_LEAGUES.flatMap((l) => [l.name, ...l.clubs.split('\n').flatMap((x) => x.split('|').slice(0, 2))])
      .concat(FICTIONAL_FOREIGN.flatMap((l) => [l.name, ...l.clubs.split(';').map((x) => x.split(':')[0])]));
    for (const real of ['Arsenal', 'Liverpool', 'Chelsea', 'Real Madrid', 'Barcelona', 'Bayern', 'Juventus', 'Celtic FC', 'Premier League', 'Championship', 'National League', 'Anfield', 'Wembley'])
      expect(names.some((n) => n.includes(real))).toBe(false);
  });
  it('web build plays the real pyramid', () => {
    expect(REAL_WORLD).toBe(true);
    expect(newGame(10, club).clubs.some((c) => c.name === 'Arsenal')).toBe(true);
  });
});
