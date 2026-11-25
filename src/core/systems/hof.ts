/**
 * Club Hall of Fame (DESIGN 13.3a): a ledger of everyone who has played for the user's club, kept even after they
 * leave, retire or disappear from the database. Synced once a week after the weekly systems (so it sees a player's
 * last games before a transfer or retirement), it adds each player's games at the club, highest OVR and wage, and
 * the fees paid and received for him. Saves from before this feature are backfilled from the players' career logs.
 */
import { emptyStats, type GameState } from '../state';
import type { Player, SeasonStats } from '../types';
import type { Position } from '../data/positions';
import { seasons } from './chronicle';

type Tot = Pick<SeasonStats, 'apps' | 'goals' | 'assists' | 'cs' | 'ratingSum'>;

export interface HofRec {
  id: number;
  name: string;
  pos: Position;
  nat: string;
  birthYear: number;
  /** completed spells and seasons */
  apps: number; goals: number; assists: number; cs: number; ratingSum: number;
  /** seasons with the club on the books */
  seasons: number[];
  maxOvr: number;
  maxWage: number;
  feeIn: number;
  feeOut: number;
  /** best season: average match rating (8+ apps) */
  bestAvg?: { v: number; season: number };
  bestGoals?: { v: number; season: number };
  /** the open season at the club: stats when it started (or he joined) and at the last sync */
  cur?: { season: number; base: Tot; last: Tot };
  academy?: boolean;
}

export interface Hof { recs: Record<number, HofRec>; backfilled: boolean }

const pick = (t: SeasonStats | Tot): Tot => ({ apps: t.apps, goals: t.goals, assists: t.assists, cs: t.cs, ratingSum: t.ratingSum });
const minus = (a: Tot, b: Tot): Tot => ({ apps: Math.max(0, a.apps - b.apps), goals: Math.max(0, a.goals - b.goals), assists: Math.max(0, a.assists - b.assists), cs: Math.max(0, a.cs - b.cs), ratingSum: Math.max(0, a.ratingSum - b.ratingSum) });

export function hof(s: GameState): Hof {
  return ((s.ext.hof as Hof | undefined) ??= { recs: {}, backfilled: false }) as Hof;
}

function newRec(p: Player): HofRec {
  return { id: p.id, name: `${p.first} ${p.last}`, pos: p.pos, nat: p.nat, birthYear: p.birthYear, apps: 0, goals: 0, assists: 0, cs: 0, ratingSum: 0, seasons: [], maxOvr: p.ovr, maxWage: 0, feeIn: 0, feeOut: 0 };
}

function addSeason(r: HofRec, season: number, t: Tot) {
  r.apps += t.apps; r.goals += t.goals; r.assists += t.assists; r.cs += t.cs; r.ratingSum += t.ratingSum;
  if (t.apps >= 8) {
    const avg = t.ratingSum / t.apps;
    if (!r.bestAvg || avg > r.bestAvg.v) r.bestAvg = { v: avg, season };
  }
  if (t.goals > 0 && (!r.bestGoals || t.goals > r.bestGoals.v)) r.bestGoals = { v: t.goals, season };
}

/** Old saves: rebuild what the career logs still hold (apps and goals per season at the club). */
function backfill(s: GameState, h: Hof) {
  h.backfilled = true;
  for (const p of s.players.values()) {
    const logs = p.career.filter((c) => c.c === s.userClubId);
    const here = p.clubId === s.userClubId;
    if (!logs.length && !here) continue;
    const r = (h.recs[p.id] ??= newRec(p));
    for (const c of logs) {
      addSeason(r, c.s, { apps: c.apps, goals: c.goals, assists: 0, cs: 0, ratingSum: 0 });
      if (!r.seasons.includes(c.s)) r.seasons.push(c.s);
      r.maxOvr = Math.max(r.maxOvr, c.ovr);
    }
    // a current player is counted from the start of this season
    if (here) r.cur = { season: s.season, base: pick(emptyStats()), last: pick(emptyStats()) };
  }
}

export function hofSync(s: GameState) {
  const h = hof(s);
  if (!h.backfilled) backfill(s, h);
  const user = s.userClubId;
  // 1. players at the club: open or continue this season's spell
  for (const p of s.players.values()) {
    if (p.clubId !== user || p.retired) continue;
    const r = (h.recs[p.id] ??= newRec(p));
    r.name = `${p.first} ${p.last}`;
    r.pos = p.pos;
    if (p.academy) r.academy = true;
    if (r.cur && r.cur.season !== s.season) { addSeason(r, r.cur.season, r.cur.last); r.cur = undefined; }
    if (!r.cur) r.cur = { season: s.season, base: pick(p.stats), last: pick(emptyStats()) };
    r.cur.last = minus(pick(p.stats), r.cur.base);
    if (!r.seasons.includes(s.season)) r.seasons.push(s.season);
    r.maxOvr = Math.max(r.maxOvr, p.ovr);
    if (p.contract && p.contract.type !== 'loan') r.maxWage = Math.max(r.maxWage, p.contract.wage);
  }
  // 2. players who left (sold, released, retired or gone from the database): close the spell
  for (const r of Object.values(h.recs)) {
    if (!r.cur) continue;
    const p = s.players.get(r.id);
    if (p && p.clubId === user && !p.retired) continue;
    // same season: transfers happen after the week's matches, so everything since the base was played for us
    const t = p && r.cur.season === s.season ? minus(pick(p.stats), r.cur.base) : r.cur.last;
    addSeason(r, r.cur.season, t);
    r.cur = undefined;
  }
  // 3. fees paid and received
  for (const t of s.transfers) {
    if (t.fee <= 0) continue;
    const r = h.recs[t.pid];
    if (!r) continue;
    if (t.to === user) r.feeIn = Math.max(r.feeIn, t.fee);
    if (t.from === user) r.feeOut = Math.max(r.feeOut, t.fee);
  }
}

/** A player's totals including the season in progress. */
export function hofTotals(r: HofRec): Tot {
  const c = r.cur?.last;
  return c ? { apps: r.apps + c.apps, goals: r.goals + c.goals, assists: r.assists + c.assists, cs: r.cs + c.cs, ratingSum: r.ratingSum + c.ratingSum } : { apps: r.apps, goals: r.goals, assists: r.assists, cs: r.cs, ratingSum: r.ratingSum };
}

/** League titles and cups won by the club while he was on the books. */
export function hofTrophies(s: GameState, r: HofRec): number {
  let n = 0;
  for (const u of seasons(s)) {
    if (!r.seasons.includes(u.season)) continue;
    if (u.pos === 1) n++;
    if (u.cup?.won) n++;
  }
  return n;
}
