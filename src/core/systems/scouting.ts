import { POSITIONS, type Position } from '../data/positions';
import { hashSeed, Rng } from '../rng';
import { squadOf, type GameState } from '../state';
import { registerSystem } from '../systems';
import type { Player, ScoutReport, Staff } from '../types';
import { askingPrice } from './transfers';
import { askingWage } from './contracts';
import { addMessage } from '../season';
import { staffCap } from './staff';

/** Scout level table (DESIGN 8). A scouted OVR is always the true number; POT is either the true number or "?". */
export function scoutAccuracy(level: number): { potChance: number; range: number; traits: boolean } {
  const potChance = Math.min(0.95, 0.25 + (0.7 * level) / 100);
  if (level <= 20) return { potChance, range: 1, traits: false };
  if (level <= 40) return { potChance, range: 2, traits: false };
  if (level <= 60) return { potChance, range: 3, traits: false };
  if (level <= 80) return { potChance, range: 5, traits: false };
  return { potChance, range: 10, traits: true };
}

function effLevel(s: GameState, st: Staff) {
  return Math.min(st.level, staffCap(s, 'scout'));
}

/** Whether a judge of this level reads this player's POT. Stable per player, so a better judge sees everything a worse one does. */
export function seesPot(seed: number, pid: number, level: number): boolean {
  return new Rng(hashSeed(seed, pid, 313)).next() < scoutAccuracy(level).potChance;
}

export function makeReport(s: GameState, p: Player, level: number): ScoutReport {
  const prev = s.scouting.reports[p.id];
  if (prev && typeof prev.ovr === 'number' && prev.level > level && prev.season === s.season) return prev;
  const rep: ScoutReport = {
    pid: p.id,
    ovr: p.ovr,
    pot: seesPot(s.seed, p.id, level) ? p.pot : null,
    level, season: s.season, week: s.week, traits: scoutAccuracy(level).traits,
  };
  s.scouting.reports[p.id] = rep;
  return rep;
}

/** What the user knows about a player: each value is the true number or null ("?"). */
export function knowledgeOf(s: GameState, p: Player): { ovr: number | null; pot: number | null } {
  if (p.clubId === s.userClubId || p.contract?.parentClubId === s.userClubId) {
    // own players: OVR known; POT read by the best coach
    const coach = Math.max(0, ...s.staff.filter((x) => x.role.startsWith('coach')).map((x) => x.level));
    return { ovr: p.ovr, pot: seesPot(s.seed ^ 91, p.id, coach + 20) ? p.pot : null };
  }
  const r = s.scouting.reports[p.id];
  if (r && typeof r.ovr === 'number') {
    // a report is current for this season and the next; ratings move, so the numbers shown are today's
    const fresh = s.season - r.season <= 1;
    return { ovr: fresh ? p.ovr : null, pot: r.pot != null ? p.pot : null };
  }
  // Players in your own league are known from watching them
  const userLeague = s.leagues.find((l) => l.clubIds.includes(s.userClubId))!;
  if (p.clubId != null && userLeague.clubIds.includes(p.clubId)) return { ovr: p.ovr, pot: null };
  return { ovr: null, pot: null };
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
