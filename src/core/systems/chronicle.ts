import { computeTable } from '../league';
import { squadOf, type GameState } from '../state';
import { registerSystem } from '../systems';
import { INCOME_CATS, COST_CATS, type ClubSeasonRecord } from '../types';
import { boardState } from './board';
import { prizeMoney } from './finance';
import { ROUND_NAMES, type CupState } from './cup';

/** Club history, records and the data for the end-of-season reel (DESIGN 12.3). */

export interface PlayerHighlight {
  id: number;
  name: string;
  value: number; // rating, goals or OVR gain
  pos?: string;
}

export interface UserSeason {
  season: number;
  div: number;
  league: string;
  pos: number;
  outcome: ClubSeasonRecord['outcome'];
  p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number;
  cs: number;
  avgAtt: number;
  bestAtt: number;
  bigWin?: { text: string; margin: number };
  income: number;
  costs: number;
  /** league prize money for the final position (paid at season end) */
  prize?: number;
  cashStart: number;
  cashEnd: number;
  avgOvr: number;
  table: { id: number; short: string; pts: number; gd: number }[];
  stars: { pots?: PlayerHighlight; scorer?: PlayerHighlight; young?: PlayerHighlight; breakthrough?: PlayerHighlight };
  topSale?: { name: string; fee: number };
  topSigning?: { name: string; fee: number };
  board?: { before: number; after: number; goals: { text: string; met: boolean }[]; cash: number; discount: number };
  cup?: { text: string; reached: number; won: boolean };
  records: string[];
}

export interface Records {
  pts?: { v: number; season: number };
  goals?: { v: number; season: number; name: string };
  signing?: { v: number; season: number; name: string };
  sale?: { v: number; season: number; name: string };
  attendance?: { v: number; season: number };
  bestFinish?: { div: number; pos: number; season: number };
  cup?: { reached: number; won: boolean; season: number };
  scorers: Record<number, { name: string; goals: number }>;
}

export function seasons(s: GameState): UserSeason[] {
  return ((s.ext.seasons as UserSeason[] | undefined) ??= []) as UserSeason[];
}
export function records(s: GameState): Records {
  return ((s.ext.records as Records | undefined) ??= { scorers: {} }) as Records;
}

function markStart(s: GameState) {
  s.ext.cashStart = s.clubs[s.userClubId].cash;
  const m: Record<number, number> = {};
  for (const p of squadOf(s, s.userClubId)) m[p.id] = p.ovr;
  s.ext.ovrStart = m;
}

function better(a: { div: number; pos: number }, b?: { div: number; pos: number }) {
  return !b || a.div < b.div || (a.div === b.div && a.pos < b.pos);
}

export function recordSeason(s: GameState): UserSeason {
  const user = s.clubs[s.userClubId];
  const rec = s.history.find((h) => h.season === s.season && h.clubId === user.id)!;
  const lg = s.leagues[rec.div - 1];
  const fx = s.fixtures.filter((f) => f.hg != null && (f.home === user.id || f.away === user.id));
  const homeFx = fx.filter((f) => f.home === user.id && f.att);
  const avgAtt = homeFx.length ? Math.round(homeFx.reduce((a, f) => a + f.att!, 0) / homeFx.length) : 0;
  const bestAtt = homeFx.reduce((a, f) => Math.max(a, f.att!), 0);
  let cs = 0;
  let bigWin: UserSeason['bigWin'];
  for (const f of fx) {
    const home = f.home === user.id;
    const gf = home ? f.hg! : f.ag!;
    const ga = home ? f.ag! : f.hg!;
    if (ga === 0) cs++;
    if (gf - ga > 0 && (!bigWin || gf - ga > bigWin.margin)) bigWin = { margin: gf - ga, text: `${gf}-${ga} ${home ? 'v' : 'at'} ${s.clubs[home ? f.away : f.home].short}` };
  }
  const income = INCOME_CATS.reduce((a, k) => a + (s.fin.season[k] ?? 0), 0);
  const costs = -COST_CATS.reduce((a, k) => a + (s.fin.season[k] ?? 0), 0);
  const squad = squadOf(s, user.id).filter((p) => !p.academy);
  const top = squad.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11);
  const avgOvr = top.length ? Math.round((top.reduce((a, b) => a + b, 0) / top.length) * 10) / 10 : 0;
  const t = computeTable(s, lg);
  const name = (p: { first: string; last: string }) => `${p.first} ${p.last}`;
  const played = squad.filter((p) => p.stats.apps >= 8);
  const avg = (p: (typeof squad)[0]) => p.stats.ratingSum / Math.max(1, p.stats.apps);
  const pots = [...played].sort((a, b) => avg(b) - avg(a))[0];
  const scorer = [...squad].sort((a, b) => b.stats.goals - a.stats.goals)[0];
  const young = played.filter((p) => s.season - p.birthYear <= 21).sort((a, b) => avg(b) - avg(a))[0];
  const start = (s.ext.ovrStart as Record<number, number> | undefined) ?? {};
  const gains = squadOf(s, user.id).filter((p) => start[p.id] != null).map((p) => ({ p, d: p.ovr - start[p.id] })).sort((a, b) => b.d - a.d);
  const tr = s.transfers.filter((x) => x.season === s.season);
  const sales = tr.filter((x) => x.from === user.id && x.fee > 0).sort((a, b) => b.fee - a.fee);
  const buys = tr.filter((x) => x.to === user.id && x.fee > 0).sort((a, b) => b.fee - a.fee);
  const b = boardState(s).last;
  const cupS = s.ext.cup as CupState | undefined;
  let cup: UserSeason['cup'];
  if (cupS && cupS.season === s.season) {
    const reached = cupS.userWon ? ROUND_NAMES.length : cupS.userExit ?? (cupS.byes.includes(user.id) ? 1 : 0);
    cup = { reached, won: !!cupS.userWon, text: cupS.userWon ? 'Winners!' : cupS.userExit != null ? `Out in the ${ROUND_NAMES[cupS.userExit].toLowerCase()}` : 'Did not take part' };
  }

  const us: UserSeason = {
    season: s.season, div: rec.div, league: lg.name, pos: rec.pos, outcome: rec.outcome,
    p: rec.p, w: rec.w, d: rec.d, l: rec.l, gf: rec.gf, ga: rec.ga, pts: rec.pts,
    cs, avgAtt, bestAtt, bigWin, income, costs, prize: prizeMoney(rec.div, rec.pos, lg.clubIds.length),
    cashStart: (s.ext.cashStart as number | undefined) ?? user.cash, cashEnd: user.cash, avgOvr,
    table: t.map((r) => ({ id: r.clubId, short: s.clubs[r.clubId].short, pts: r.pts, gd: r.gf - r.ga })),
    stars: {
      pots: pots && { id: pots.id, name: name(pots), value: Math.round(avg(pots) * 100) / 100, pos: pots.pos },
      scorer: scorer && scorer.stats.goals > 0 ? { id: scorer.id, name: name(scorer), value: scorer.stats.goals, pos: scorer.pos } : undefined,
      young: young && { id: young.id, name: name(young), value: Math.round(avg(young) * 100) / 100, pos: young.pos },
      breakthrough: gains[0] && gains[0].d > 0 ? { id: gains[0].p.id, name: name(gains[0].p), value: gains[0].d, pos: gains[0].p.pos } : undefined,
    },
    topSale: sales[0] && { name: sales[0].name, fee: sales[0].fee },
    topSigning: buys[0] && { name: buys[0].name, fee: buys[0].fee },
    board: b && b.season === s.season ? { before: b.before, after: b.after, goals: b.goals.map((g) => ({ text: g.text, met: !!g.met })), cash: b.cash, discount: b.discount } : undefined,
    cup,
    records: [],
  };

  // records (only after the first season do they count as "new")
  const R = records(s);
  const first = seasons(s).length === 0;
  const nr = (txt: string) => !first && us.records.push(txt);
  if (!R.pts || rec.pts > R.pts.v) { if (R.pts) nr(`Most points in a season: ${rec.pts}`); R.pts = { v: rec.pts, season: s.season }; }
  if (scorer && (!R.goals || scorer.stats.goals > R.goals.v)) { if (R.goals) nr(`Most goals in a season: ${name(scorer)}, ${scorer.stats.goals}`); R.goals = { v: scorer.stats.goals, season: s.season, name: name(scorer) }; }
  if (bestAtt && (!R.attendance || bestAtt > R.attendance.v)) { if (R.attendance) nr(`Record attendance: ${bestAtt.toLocaleString()}`); R.attendance = { v: bestAtt, season: s.season }; }
  if (buys[0] && (!R.signing || buys[0].fee > R.signing.v)) { nr(`Record signing: ${buys[0].name}`); R.signing = { v: buys[0].fee, season: s.season, name: buys[0].name }; }
  if (sales[0] && (!R.sale || sales[0].fee > R.sale.v)) { nr(`Record sale: ${sales[0].name}`); R.sale = { v: sales[0].fee, season: s.season, name: sales[0].name }; }
  if (better({ div: rec.div, pos: rec.pos }, R.bestFinish)) { if (R.bestFinish) nr(`Best finish ever: ${rec.pos}${rec.pos === 1 ? 'st' : rec.pos === 2 ? 'nd' : rec.pos === 3 ? 'rd' : 'th'} in division ${rec.div}`); R.bestFinish = { div: rec.div, pos: rec.pos, season: s.season }; }
  if (cup && (!R.cup || cup.reached > R.cup.reached)) { if (R.cup || cup.won) nr(cup.won ? 'FA Cup winners for the first time!' : `Best FA Cup run: ${cup.text.replace('Out in the ', '')}`); R.cup = { reached: cup.reached, won: cup.won, season: s.season }; }
  const prevTop = topScorerAllTime(s);
  for (const p of squadOf(s, user.id)) {
    if (!p.stats.goals) continue;
    const e = (R.scorers[p.id] ??= { name: name(p), goals: 0 });
    e.goals += p.stats.goals;
  }
  const nowTop = topScorerAllTime(s);
  if (nowTop && prevTop && nowTop.id !== prevTop.id) nr(`New all-time top scorer: ${nowTop.name}, ${nowTop.goals}`);
  seasons(s).push(us);
  if (seasons(s).length > 80) seasons(s).shift();
  return us;
}

export function topScorerAllTime(s: GameState): { id: number; name: string; goals: number } | null {
  let best: { id: number; name: string; goals: number } | null = null;
  for (const [id, e] of Object.entries(records(s).scorers)) if (!best || e.goals > best.goals) best = { id: +id, ...e };
  return best;
}

registerSystem({
  name: 'chronicle',
  init(s) {
    markStart(s);
  },
  seasonEnd(s) {
    recordSeason(s);
    s.ext.reelPending = s.season;
  },
  rollover(s) {
    markStart(s);
    // keep the scorer table small
    const sc = records(s).scorers;
    const ids = Object.keys(sc);
    if (ids.length > 200) {
      const keep = ids.sort((a, b) => sc[+b].goals - sc[+a].goals).slice(0, 100);
      records(s).scorers = Object.fromEntries(keep.map((k) => [k, sc[+k]]));
    }
  },
});
