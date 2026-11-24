import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague, chainFor, clubDefs } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { computeTable, roundRobin } from '../src/core/league';
import { Rng } from '../src/core/rng';
import { snapshot, restore, diff } from '../src/storage/serialize';
import '../src/core/systems/all';

const lg = startingLeagues()[0];
const club = clubsInLeague(lg.key)[0];

describe('world', () => {
  it('has ~1,000+ unique real clubs and 16 starting leagues', () => {
    expect(clubDefs().length).toBeGreaterThan(1000);
    expect(startingLeagues().length).toBe(16);
  });
  it('builds a chain for every starting league', () => {
    for (const l of startingLeagues()) expect(chainFor(l.key)).toHaveLength(5);
  });
  it('creates 10 simulated leagues of 20 with the user in division 9', () => {
    const s = newGame(1, club);
    expect(s.leagues).toHaveLength(10);
    for (const l of s.leagues) expect(l.clubIds).toHaveLength(20);
    expect(s.leagues[8].clubIds).toContain(s.userClubId);
    expect(s.fixtures.length).toBe(10 * 380);
  });
});

describe('fixtures', () => {
  it('double round robin: every pair plays home and away once', () => {
    const ids = Array.from({ length: 20 }, (_, i) => i);
    const rounds = roundRobin(new Rng(3), ids);
    expect(rounds).toHaveLength(38);
    const seen = new Set<string>();
    for (const r of rounds) {
      expect(r).toHaveLength(10);
      const inRound = new Set<number>();
      for (const [h, a] of r) {
        expect(inRound.has(h) || inRound.has(a)).toBe(false);
        inRound.add(h); inRound.add(a);
        seen.add(`${h}-${a}`);
      }
    }
    expect(seen.size).toBe(380);
  });
});

describe('season', () => {
  it('plays a full season, promotes/relegates 3 each way and keeps leagues at 20', () => {
    const s = newGame(7, club);
    const before = s.leagues.map((l) => [...l.clubIds]);
    while (s.season === 2025) advanceWeek(s);
    for (const l of s.leagues) expect(l.clubIds).toHaveLength(20);
    // div 9 lost 3 up and 3 down
    const stayed = s.leagues[8].clubIds.filter((id) => before[8].includes(id));
    expect(stayed.length).toBe(14);
    const recs = s.history.filter((h) => h.season === 2025);
    expect(recs).toHaveLength(200);
    expect(s.fixtures.length).toBe(3800);
  });
  it('is deterministic for the same seed', () => {
    const a = newGame(99, club);
    const b = newGame(99, club);
    for (let i = 0; i < 12; i++) { advanceWeek(a); advanceWeek(b); }
    const ta = computeTable(a, a.leagues[8]).map((r) => r.pts);
    const tb = computeTable(b, b.leagues[8]).map((r) => r.pts);
    expect(ta).toEqual(tb);
  });
});

describe('save', () => {
  it('round-trips state through a snapshot', () => {
    const s = newGame(5, club);
    for (let i = 0; i < 8; i++) advanceWeek(s);
    const snap = snapshot(s);
    const r = restore(snap);
    expect(r.players.size).toBe(s.players.size);
    expect(r.week).toBe(s.week);
    expect(computeTable(r, r.leagues[8])).toEqual(computeTable(s, s.leagues[8]));
    expect(diff(snap, snapshot(r, snap))).toHaveLength(0);
  });
});
