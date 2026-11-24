import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { Rng } from '../src/core/rng';
import { formationPositions, scoutShortlist } from '../src/core/systems/scouting';
import '../src/core/systems/all';

const lg = startingLeagues()[0];
const s = newGame(31337, clubsInLeague(lg.key)[0]);

describe('scouting follows the formation', () => {
  it('lists only the positions the formation uses', () => {
    s.clubs[s.userClubId].formation = '4-3-3';
    const fp = formationPositions(s);
    expect(fp).toContain('LB');
    expect(fp).toContain('LW');
    for (const none of ['LWB', 'RWB', 'LM', 'RM', 'AM'] as const) expect(fp).not.toContain(none);
    s.clubs[s.userClubId].formation = '5-3-2';
    expect(formationPositions(s)).toContain('LWB');
    expect(formationPositions(s)).not.toContain('LB');
  });

  it('shortlists never contain a position outside the formation, even for an ANY assignment', () => {
    s.clubs[s.userClubId].formation = '4-3-3';
    const scout = s.staffPool.find((x) => x.role === 'scout')!;
    s.scouting.assignments[scout.id] = { pos: 'ANY', minAge: 16, maxAge: 40, maxFee: Infinity, maxWage: Infinity };
    const wanted = new Set(formationPositions(s));
    let total = 0;
    for (let i = 0; i < 40; i++) {
      const list = scoutShortlist(s, new Rng(1000 + i), { ...scout, level: 90 });
      for (const p of list) expect(wanted.has(p.pos)).toBe(true);
      total += list.length;
    }
    expect(total).toBeGreaterThan(0);
  });

  it('an assignment for a position the formation does not use falls back to all formation positions', () => {
    s.clubs[s.userClubId].formation = '4-3-3';
    const scout = s.staffPool.find((x) => x.role === 'scout')!;
    s.scouting.assignments[scout.id] = { pos: 'LWB', minAge: 16, maxAge: 40, maxFee: Infinity, maxWage: Infinity };
    let total = 0;
    for (let i = 0; i < 20; i++) total += scoutShortlist(s, new Rng(5 + i), { ...scout, level: 90 }).length;
    expect(total).toBeGreaterThan(0);
  });
});

describe('no fitness in the game', () => {
  it('players have no fitness value', () => {
    for (const p of s.players.values()) expect('fitness' in p).toBe(false);
  });
});
