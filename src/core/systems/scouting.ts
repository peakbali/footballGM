import { POSITIONS, type Position } from '../data/positions';
import { hashSeed, Rng, clamp } from '../rng';
import { squadOf, type GameState } from '../state';
import { registerSystem } from '../systems';
import type { Player, ScoutReport, Staff } from '../types';
import { askingPrice } from './transfers';
import { askingWage } from './contracts';
import { addMessage } from '../season';
import { staffCap } from './staff';

/** Scout level table (DESIGN 8). */
export function scoutAccuracy(level: number): { ovr: number; pot: number | null; range: number; traits: boolean } {
  if (level <= 20) return { ovr: 8, pot: null, range: 1, traits: false };
  if (level <= 40) return { ovr: 5, pot: 12, range: 2, traits: false };
  if (level <= 60) return { ovr: 3, pot: 8, range: 3, traits: false };
  if (level <= 80) return { ovr: 1, pot: 4, range: 5, traits: false };
  return { ovr: 0, pot: 2, range: 10, traits: true };
}

function effLevel(s: GameState, st: Staff) {
  return Math.min(st.level, staffCap(s, 'scout'));
}

/** Stable (per player + level) noisy range around the true value. */
function noisyRange(seed: number, pid: number, v: number, err: number): [number, number] {
  if (err <= 0) return [v, v];
  const r = new Rng(hashSeed(seed, pid, err));
  const shift = Math.round(r.range(-err, err) * 0.6);
  return [clamp(v + shift - err, 1, 99), clamp(v + shift + err, 1, 99)];
}

export function makeReport(s: GameState, p: Player, level: number): ScoutReport {
  const acc = scoutAccuracy(level);
  const prev = s.scouting.reports[p.id];
  const rep: ScoutReport = {
    pid: p.id,
    ovr: noisyRange(s.seed, p.id, p.ovr, acc.ovr),
    pot: acc.pot == null ? null : noisyRange(s.seed ^ 77, p.id, p.pot, acc.pot),
    level, season: s.season, week: s.week, traits: acc.traits,
  };
  if (prev && prev.level > level && prev.season === s.season) return prev;
  s.scouting.reports[p.id] = rep;
  return rep;
}

/** What the user knows about a player. */
export function knowledgeOf(s: GameState, p: Player): { exact: boolean; ovrRange?: [number, number]; potRange?: [number, number] } {
  if (p.clubId === s.userClubId || p.contract?.parentClubId === s.userClubId) {
    // own players: exact OVR; POT accuracy from best coach
    const coach = Math.max(0, ...s.staff.filter((x) => x.role.startsWith('coach')).map((x) => x.level));
    const acc = scoutAccuracy(coach + 20).pot ?? 10;
    return { exact: true, potRange: noisyRange(s.seed ^ 91, p.id, p.pot, acc) };
  }
  const r = s.scouting.reports[p.id];
  if (r) {
    const fresh = s.season - r.season <= 1;
    if (r.ovr[0] === r.ovr[1] && fresh) return { exact: true, ovrRange: r.ovr, potRange: r.pot ?? undefined };
    return { exact: false, ovrRange: fresh ? r.ovr : [r.ovr[0] - 3, r.ovr[1] + 3], potRange: r.pot ?? undefined };
  }
  // Players in your own league are roughly known from watching them
  const userLeague = s.leagues.find((l) => l.clubIds.includes(s.userClubId))!;
  if (p.clubId != null && userLeague.clubIds.includes(p.clubId)) return { exact: false, ovrRange: noisyRange(s.seed ^ 5, p.id, p.ovr, 6) };
  return { exact: false };
}

/** Divisions a scout of this level covers relative to the user's division. */
export function coverage(level: number): number {
  return scoutAccuracy(level).range;
}

/** Build a shortlist for one scout's assignment. */
export function scoutShortlist(s: GameState, rng: Rng, st: Staff): Player[] {
  const a = s.scouting.assignments[st.id] ?? { pos: 'ANY', minAge: 16, maxAge: 34, maxFee: Infinity, maxWage: Infinity };
  const level = effLevel(s, st);
  const range = coverage(level);
  const userDiv = s.clubs[s.userClubId].div;
  const squad = squadOf(s, s.userClubId);
  const posAvg = (pos: Position) => {
    const v = squad.filter((p) => p.pos === pos).map((p) => p.ovr).sort((x, y) => y - x);
    return v.length ? v[0] : 0;
  };
  const cands: Player[] = [];
  for (const p of s.players.values()) {
    if (p.clubId === s.userClubId || p.retired) continue;
    const div = p.clubId == null ? userDiv : s.clubs[p.clubId].div;
    if (Math.abs(div - userDiv) > range) continue;
    if (a.pos !== 'ANY' && p.pos !== a.pos) continue;
    const age = s.season - p.birthYear;
    if (age < a.minAge || age > a.maxAge) continue;
    if (p.ovr < posAvg(p.pos) - 4 && p.pot < posAvg(p.pos) + 4) continue;
    cands.push(p);
  }
  // affordability filter (fee + wage) on a sample to keep it fast
  rng.shuffle(cands);
  const out: Player[] = [];
  for (const p of cands.slice(0, 400)) {
    const fee = p.clubId == null ? 0 : askingPrice(s, p);
    if (fee > a.maxFee) continue;
    if (askingWage(s, p, s.userClubId) > a.maxWage) continue;
    out.push(p);
  }
  // recommend: improvement over current best at that position, plus youth upside (seen through scout's eyes)
  const score = (p: Player) => {
    const age = s.season - p.birthYear;
    const imp = p.ovr - posAvg(p.pos);
    const up = age <= 22 ? (p.pot - p.ovr) * 0.4 : 0;
    return imp + up + rng.normal(0, 8 - level / 15);
  };
  out.sort((x, y) => score(y) - score(x));
  return out.slice(0, rng.int(3, 6));
}

registerSystem({
  name: 'scouting',
  init(s) {
    const scout = s.staff.find((x) => x.role === 'scout');
    if (scout) s.scouting.assignments[scout.id] = { pos: 'ANY', minAge: 16, maxAge: 32, maxFee: 10000, maxWage: 200 };
  },
  weekly(s, rng) {
    const scouts = s.staff.filter((x) => x.role === 'scout');
    const got: Player[] = [];
    for (const st of scouts) {
      const last = s.scouting.lastList[st.id] ?? -99;
      const now = s.season * 52 + s.week;
      if (now - last < 2) continue;
      s.scouting.lastList[st.id] = now;
      const list = scoutShortlist(s, new Rng(hashSeed(s.seed, now, st.id)), st);
      for (const p of list) {
        makeReport(s, p, effLevel(s, st));
        s.scouting.shortlist = [p.id, ...s.scouting.shortlist.filter((x) => x !== p.id)].slice(0, 40);
        got.push(p);
      }
    }
    // drop reports for players who no longer exist
    if (s.week === 1) for (const k of Object.keys(s.scouting.reports)) if (!s.players.has(+k)) delete s.scouting.reports[+k];
    if (got.length && s.week % 4 === 0) addMessage(s, { cat: 'Transfers', title: 'Scout reports', body: `New recommendations:\n${got.slice(0, 6).map((p) => `• ${p.first} ${p.last} (${p.pos}, ${s.season - p.birthYear})`).join('\n')}` });
    void rng;
  },
});

export { POSITIONS };
