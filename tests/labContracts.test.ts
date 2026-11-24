import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { squadOf } from '../src/core/state';
import { facState, syncFacilities } from '../src/core/systems/facilities';
import { applyItem, cannotUse, labState, learnablePositions } from '../src/core/systems/lab';
import { contractNotices, contractWeeksLeft, decisionChoices, pendingDecisions, resolveDecision } from '../src/core/systems/decisions';
import '../src/core/systems/all';

const club = clubsInLeague(startingLeagues()[3].key)[2];

describe('skills lab', () => {
  it('is locked until built, then makes items that teach, boost and calm players', () => {
    const s = newGame(41, club);
    const p = squadOf(s, s.userClubId).filter((x) => x.pos !== 'GK' && !x.academy)[0];
    expect(cannotUse(s, p, 'stat')).toMatch(/Skills lab/);
    facState(s).tracks.lab = 3;
    syncFacilities(s);
    advanceWeek(s);
    const st = labState(s);
    expect(st.stock.stat).toBe(1);
    const fin = p.attrs[0];
    expect(applyItem(s, p, 'stat', 'finishing')).toMatch(/\+3/);
    expect(p.attrs[0]).toBe(Math.min(99, fin + 3));
    expect(st.stock.stat).toBe(0);
    // cooldown per player
    const q = squadOf(s, s.userClubId).filter((x) => x.pos !== 'GK' && !x.academy && x.id !== p.id)[0];
    expect(cannotUse(s, p, 'pers')).toMatch(/weeks/);
    const pos = learnablePositions(s, q)[0];
    expect(pos).toBeTruthy();
    applyItem(s, q, 'pos', pos);
    expect(q.fam[pos]).toBe('N');
    const r = squadOf(s, s.userClubId).filter((x) => !x.academy && x.id !== p.id && x.id !== q.id)[0];
    const pers = r.personality;
    applyItem(s, r, 'pers');
    expect(r.personality).toBe(Math.min(99, pers + 10));
  });
});

describe('contract reminders', () => {
  it('pops up at 6, 3 and 1 months for a key player and stops once he signs', () => {
    const s = newGame(42, club);
    const team = squadOf(s, s.userClubId).filter((x) => !x.academy).sort((a, b) => b.ovr - a.ovr);
    const star = team[0];
    for (const p of team) if (p.contract) p.contract.endSeason = s.season + 3; // only the star expires
    star.contract!.endSeason = s.season;
    contractNotices(s); // first look: counts from now, no popup
    const mine = () => pendingDecisions(s).filter((m) => (m.action!.data as { type: string; pid: number }).type === 'contract_expiring' && (m.action!.data as { pid: number }).pid === star.id);
    expect(mine().length).toBe(0);
    const step = () => { advanceWeek(s); for (const m of pendingDecisions(s)) if (!mine().includes(m)) m.resolved = true; };
    for (let i = 0; i < 60 && !mine().length; i++) step();
    expect(mine().length).toBe(1);
    expect(contractWeeksLeft(s, star)).toBeLessThanOrEqual(26);
    expect(mine()[0].title).toMatch(/6 months/);
    const wait = decisionChoices(s, mine()[0]).findIndex((c) => c.label.startsWith('Wait'));
    resolveDecision(s, mine()[0].id, wait);
    for (let i = 0; i < 60 && !mine().length; i++) step();
    expect(mine()[0].title).toMatch(/3 months/);
    star.morale = 80;
    star.personality = 70;
    resolveDecision(s, mine()[0].id, 0); // sign the 3-year deal
    expect(star.contract!.endSeason).toBeGreaterThan(s.season);
    for (let i = 0; i < 14; i++) step();
    expect(mine().length).toBe(0);
  });
});
