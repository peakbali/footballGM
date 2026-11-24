import { describe, expect, it } from 'vitest';
import { newGame, startingLeagues, clubsInLeague } from '../src/core/world';
import { advanceWeek } from '../src/core/season';
import { Rng } from '../src/core/rng';
import { squadOf } from '../src/core/state';
import '../src/core/systems/all';
import { decisionChoices, fireDecision, pendingDecisions, resolveDecision, DECISION_TYPES } from '../src/core/systems/decisions';

describe('decision events', () => {
  it('fire at a sane rate, every choice resolves, outcomes are kept in history', () => {
    const lg = startingLeagues()[0];
    const s = newGame(4242, clubsInLeague(lg.key)[0]);
    const rng = new Rng(7);
    const perSeason = new Map<number, number>();
    const pre = new Map<number, number>();
    const seen = new Set<string>();
    for (let i = 0; i < 52 * 3; i++) {
      const season = s.season, week = s.week;
      advanceWeek(s);
      const fresh = s.inbox.filter((m) => m.action?.kind === 'decision' && !m.resolved);
      const before = fresh.length;
      for (const m of fresh) {
        const ch = decisionChoices(s, m);
        expect(ch.length).toBeGreaterThanOrEqual(1);
        const ok = ch.map((c, k) => [c, k] as const).filter(([c]) => !c.disabled);
        const [, k] = rng.pick(ok);
        const out = resolveDecision(s, m.id, k);
        expect(out).toBeTruthy();
        expect(m.resolved).toBe(true);
        expect(m.outcome).toBe(out);
        seen.add((m.action!.data as { type: string }).type);
        perSeason.set(season, (perSeason.get(season) ?? 0) + 1);
        if (week <= 5) pre.set(season, (pre.get(season) ?? 0) + 1);
      }
      expect(before).toBeLessThanOrEqual(2);
      expect(pendingDecisions(s).length).toBe(0);
    }
    console.log('per season', [...perSeason], 'pre', [...pre], 'types', [...seen].join(','), `${seen.size}/${DECISION_TYPES.length}`);
    expect(DECISION_TYPES.length).toBeGreaterThanOrEqual(15);
    for (const n of pre.values()) expect(n).toBeGreaterThanOrEqual(2);
    for (const n of perSeason.values()) expect(n).toBeLessThan(18);
  });
});

describe('every decision type', () => {
  it('can be created and every choice applies cleanly', { timeout: 180_000 }, () => {
    const lg = startingLeagues()[0];
    const club = clubsInLeague(lg.key)[0];
    for (const type of DECISION_TYPES) {
      let n = 1;
      for (let i = 0; i < n; i++) {
        const s = newGame(99, club);
        // make the situations most decisions need exist
        const team = squadOf(s, s.userClubId).filter((p) => !p.academy).sort((a, b) => b.ovr - a.ovr);
        team.slice(5, 9).forEach((p) => { p.morale = 30; p.personality = 30; p.listed = false; });
        team.slice(13, 18).forEach((p) => { p.birthYear = s.season - 20; });
        const vet = team[2];
        vet.birthYear = s.season - 31; vet.personality = 80; vet.contract!.endSeason = s.season;
        const m = fireDecision(s, new Rng(5), type);
        expect(m, `${type} could not be created`).not.toBeNull();
        const choices = decisionChoices(s, m!);
        n = choices.length;
        expect(choices.length).toBeGreaterThanOrEqual(2);
        for (const c of choices) expect(c.chips.length).toBeGreaterThan(0);
        if (choices[i].disabled) continue;
        const out = resolveDecision(s, m!.id, i);
        expect(out, `${type} choice ${i}`).toBeTruthy();
        expect(m!.pick).toBe(choices[i].label);
      }
    }
  });
});
