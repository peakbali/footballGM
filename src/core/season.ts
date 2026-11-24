import { DIV_AVG_OVR, LEAGUES } from './data/pyramid';
import { generatePlayer, randomAge, roleForRank, signContract } from './generate';
import { computeTable, makeFixtures } from './league';
import { makeSide, shootout, simulateMatch } from './match';
import { DEFAULT_DEV, developPlayer, retireChance } from './progression';
import { Rng, clamp, hashSeed } from './rng';
import { refreshClubRatings } from './selection';
import { buildSquadIndex, CAL, emptyStats, invalidateSquads, type GameState } from './state';
import type { Club, ClubSeasonRecord, Fixture, InboxMessage, Player } from './types';
import { dist, nearest } from './world';
import { POSITIONS, type Position } from './data/positions';
import { playerValue } from './data/economy';
import { runWeeklySystems, runSeasonEndSystems, runRolloverSystems, hooks } from './systems';

export interface WeekResult {
  week: number;
  season: number;
  userFixture?: Fixture;
  /** True when the UI should stop auto-advancing (match played, decision needed, season end...). */
  stop: boolean;
  messages: InboxMessage[];
  seasonEnded?: boolean;
}

export function addMessage(s: GameState, m: Omit<InboxMessage, 'id' | 'season' | 'week' | 'read'>): InboxMessage {
  const msg: InboxMessage = { id: s.nextMsgId++, season: s.season, week: s.week, read: false, ...m };
  s.inbox.push(msg);
  if (s.inbox.length > 300) s.inbox.splice(0, s.inbox.length - 300);
  return msg;
}

export function addNews(s: GameState, text: string) {
  s.news.push({ season: s.season, week: s.week, text });
  if (s.news.length > 200) s.news.splice(0, s.news.length - 200);
}

const INJURIES: [string, number, number][] = [
  ['Hamstring strain', 2, 5], ['Ankle sprain', 1, 4], ['Calf strain', 1, 3], ['Knee ligament damage', 6, 16], ['Groin strain', 1, 4],
  ['Broken foot', 6, 12], ['Concussion', 1, 2], ['Thigh strain', 2, 4], ['Back spasm', 1, 2], ['Torn ACL', 26, 40],
];

export function injurePlayer(rng: Rng, p: Player, durationMult = 1): void {
  const pick = rng.weighted(INJURIES, (x) => (x[2] > 20 ? 0.15 : x[2] > 10 ? 0.6 : 2));
  p.injury = Math.max(1, Math.round(rng.int(pick[1], pick[2]) * durationMult));
  p.injuryName = pick[0];
}

/** Advance one week. */
export function advanceWeek(s: GameState): WeekResult {
  const rng = new Rng(hashSeed(s.seed, s.season, s.week));
  const res: WeekResult = { week: s.week, season: s.season, stop: false, messages: [] };
  const msgStart = s.inbox.length;
  const idx = buildSquadIndex(s);
  const userLeague = s.leagues.find((l) => l.clubIds.includes(s.userClubId))!;
  const user = s.clubs[s.userClubId];

  // Weekly recovery (before matches)
  const physioBoost = hooks.recoveryBonus?.(s) ?? 0;
  for (const p of s.players.values()) {
    if (p.clubId == null) continue;
    const isUser = p.clubId === s.userClubId;
    p.fitness = clamp(p.fitness + 20 + (isUser ? physioBoost : 0), 0, 100);
    if (p.injury > 0) {
      p.injury--;
      if (p.injury === 0) p.injuryName = undefined;
    }
  }

  // Playoffs
  if (s.week === CAL.playoffSemiWeek) createPlayoffSemis(s);
  if (s.week === CAL.playoffFinalWeek) createPlayoffFinals(s);

  const weekFixtures = s.fixtures.filter((f) => f.week === s.week && f.hg == null);
  for (const f of weekFixtures) {
    const home = s.clubs[f.home];
    const away = s.clubs[f.away];
    const userTie = f.home === s.userClubId || f.away === s.userClubId;
    const full = f.div === userLeague.div || (!!f.cup && userTie);
    const hs = makeSide(home, idx.get(home.id) ?? []);
    const as = makeSide(away, idx.get(away.id) ?? []);
    if (home.user) hs.morale += (s.ext.homeMorale as number | undefined) ?? 0;
    // serve bans for clubs playing this week
    for (const side of [idx.get(home.id) ?? [], idx.get(away.id) ?? []]) for (const p of side) if (p.ban > 0 && !hs.lineup.xi.includes(p) && !as.lineup.xi.includes(p)) p.ban--;
    const r = simulateMatch(rng, hs, as, f.id, s.season, full);
    f.hg = r.hg;
    f.ag = r.ag;
    f.full = full;
    if ((f.playoff || f.cup) && r.hg === r.ag) {
      const so = shootout(rng);
      f.pens = so.score;
    }
    const docMult = hooks.injuryMult?.(s) ?? 1;
    for (const p of r.injuries) injurePlayer(rng, p, p.clubId === s.userClubId ? docMult : 1);
    if (r.report) {
      s.reports.set(f.id, r.report);
    }
    f.att = attendanceFor(s, home, away, rng);
    if (userTie) {
      if (!res.userFixture || !f.cup) res.userFixture = f;
      res.stop = true;
    }
  }

  // Monthly: club ratings for simulated leagues + AI squad top-ups for injuries
  if (s.week % 4 === 0) {
    for (const lg of s.leagues) for (const id of lg.clubIds) refreshClubRatings(s.clubs[id], idx.get(id) ?? []);
  }

  runWeeklySystems(s, rng, idx, res);

  if (s.week === CAL.seasonEndWeek) {
    endSeason(s);
    runSeasonEndSystems(s, rng);
    res.seasonEnded = true;
    res.stop = true;
  }

  // Advance calendar
  s.week++;
  if (s.week > CAL.weeks) {
    rollover(s);
    runRolloverSystems(s, new Rng(hashSeed(s.seed, s.season, 999)));
  }
  res.messages = s.inbox.slice(msgStart);
  if (res.messages.some((m) => m.action && !m.resolved)) res.stop = true;
  void user;
  return res;
}

function attendanceFor(s: GameState, home: Club, away: Club, rng: Rng): number {
  if (hooks.attendance) return hooks.attendance(s, home, away, rng);
  const base = home.capacity * clamp(0.35 + home.rep / 150 + rng.normal(0, 0.05), 0.15, 1);
  return Math.round(Math.min(home.capacity, base + away.rep * 3));
}

// ---------------- Playoffs

function createPlayoffSemis(s: GameState) {
  for (const lg of s.leagues) {
    if (lg.div === 1) continue;
    const t = computeTable(s, lg);
    const [p3, p4, p5, p6] = [t[2], t[3], t[4], t[5]].map((r) => r.clubId);
    s.fixtures.push({ id: s.nextFixtureId++, div: lg.div, week: CAL.playoffSemiWeek, home: p3, away: p6, hg: null, ag: null, playoff: 'semi' });
    s.fixtures.push({ id: s.nextFixtureId++, div: lg.div, week: CAL.playoffSemiWeek, home: p4, away: p5, hg: null, ag: null, playoff: 'semi' });
  }
}

export function fixtureWinner(f: Fixture): number {
  if (f.hg! > f.ag!) return f.home;
  if (f.hg! < f.ag!) return f.away;
  const [h, a] = (f.pens ?? '1-0').split('-').map(Number);
  return h > a ? f.home : f.away;
}

function createPlayoffFinals(s: GameState) {
  for (const lg of s.leagues) {
    if (lg.div === 1) continue;
    const semis = s.fixtures.filter((f) => f.div === lg.div && f.playoff === 'semi');
    if (semis.length !== 2) continue;
    const t = computeTable(s, lg);
    const rank = (id: number) => t.findIndex((r) => r.clubId === id);
    const w = semis.map(fixtureWinner).sort((a, b) => rank(a) - rank(b));
    s.fixtures.push({ id: s.nextFixtureId++, div: lg.div, week: CAL.playoffFinalWeek, home: w[0], away: w[1], hg: null, ag: null, playoff: 'final' });
  }
}

export function playoffWinner(s: GameState, div: number): number | undefined {
  const f = s.fixtures.find((x) => x.div === div && x.playoff === 'final' && x.hg != null);
  return f ? fixtureWinner(f) : undefined;
}

// ---------------- Season end

function endSeason(s: GameState) {
  for (const lg of s.leagues) {
    const t = computeTable(s, lg);
    const pw = playoffWinner(s, lg.div);
    t.forEach((r, i) => {
      let outcome: ClubSeasonRecord['outcome'] = 'stayed';
      if (i === 0) outcome = 'champion';
      else if (lg.div > 1 && i === 1) outcome = 'promoted';
      else if (r.clubId === pw) outcome = 'playoff_winner';
      if (i >= 17) outcome = 'relegated';
      s.history.push({ season: s.season, clubId: r.clubId, div: lg.div, pos: i + 1, p: r.p, w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, pts: r.pts, outcome });
    });
    const champ = s.clubs[t[0].clubId];
    addNews(s, `${champ.name} are ${lg.name} champions with ${t[0].pts} points.`);
  }
  const rec = s.history.find((h) => h.season === s.season && h.clubId === s.userClubId)!;
  const lg = s.leagues[rec.div - 1];
  const txt: Record<string, string> = {
    champion: rec.div === 1 ? 'Champions of England!' : `Champions! Promoted from the ${lg.name}.`,
    promoted: `Promoted! Finished 2nd in the ${lg.name}.`,
    playoff_winner: 'Promoted through the playoffs!',
    relegated: `Relegated from the ${lg.name}.`,
    stayed: `Finished ${ordinal(rec.pos)} in the ${lg.name}.`,
  };
  addMessage(s, { cat: 'League', title: 'Season over', body: `${txt[rec.outcome ?? 'stayed']} ${rec.pts} points from ${rec.p} games.` });
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ---------------- Rollover (new season)

export function rollover(s: GameState) {
  const prev = s.season;
  const rng = new Rng(hashSeed(s.seed, prev, 777));
  // 1. Pyramid movement
  movePyramid(s, prev, rng);
  s.season = prev + 1;
  s.week = 1;

  // 2. Players: career log, development, retirement, contracts
  const idx = buildSquadIndex(s);
  const devCtxFn = hooks.devContext;
  for (const p of [...s.players.values()]) {
    if (p.retired) continue;
    if (p.stats.apps > 0 || p.clubId != null) p.career.push({ s: prev, c: p.clubId ?? -1, apps: p.stats.apps, goals: p.stats.goals, ovr: p.ovr });
    if (p.career.length > 25) p.career.shift();
    const ageNow = s.season - p.birthYear;
    const share = p.minutesShare ?? estimateShare(p, idx);
    // own squad develops monthly (stage 3); everyone else once a year here
    if (p.clubId !== s.userClubId) developPlayer(rng, p, ageNow, devCtxFn ? devCtxFn(s, p) : { ...DEFAULT_DEV, playtime: share }, 1);
    p.stats = emptyStats();
    p.yellowAcc = 0;
    p.ban = 0;
    p.minutesShare = undefined;
    if (rng.chance(retireChance(ageNow, p.pos === 'GK', p.ovr))) {
      if (p.clubId === s.userClubId) addMessage(s, { cat: 'Squad', title: `${p.first} ${p.last} retires`, body: `${p.first} ${p.last} (${ageNow}) has hung up his boots.` });
      p.retired = true;
      invalidateSquads();
      p.clubId = null;
      p.contract = null;
      s.players.delete(p.id);
      continue;
    }
    // contract expiry for AI clubs (user handled by contracts system)
    if (p.contract && p.clubId !== s.userClubId && p.contract.type === 'permanent' && p.contract.endSeason < s.season) {
      const club = s.clubs[p.clubId!];
      const squad = idx.get(club.id) ?? [];
      const rank = squad.filter((q) => q.ovr > p.ovr).length;
      if (rank < 18 && ageNow < 34 && rng.chance(0.8)) {
        signContract(rng, p, club.id, club.div, s.season, roleForRank(rank));
      } else {
        p.clubId = null;
        p.contract = null;
        invalidateSquads();
      }
    }
    p.value = playerValue(p.ovr, p.pot, ageNow, p.contract ? p.contract.endSeason - s.season + 1 : 0);
  }

  // 3. AI squad maintenance (keep 20-24, regress toward division level)
  maintainSquads(s, rng);

  // 4. Free agent pool upkeep
  const fas = [...s.players.values()].filter((p) => p.clubId == null);
  for (const p of fas) if (s.season - p.birthYear > 34 || rng.chance(0.25)) s.players.delete(p.id);

  // 5. Ratings and fixtures
  const idx2 = buildSquadIndex(s);
  for (const c of s.clubs) refreshClubRatings(c, idx2.get(c.id) ?? []);
  s.fixtures = [];
  // keep last season's user reports? prune to save size
  s.reports.clear();
  makeFixtures(s, rng);
  addMessage(s, { cat: 'League', title: `Season ${s.season}/${String(s.season + 1).slice(2)} begins`, body: `Fixtures for the ${s.leagues.find((l) => l.clubIds.includes(s.userClubId))!.name} are out. The summer transfer window is open.` });
}

function estimateShare(p: Player, idx: Map<number, Player[]>): number {
  if (p.stats.apps > 0) return clamp(p.stats.mins / (38 * 90), 0, 1);
  if (p.clubId == null) return 0;
  const squad = idx.get(p.clubId) ?? [];
  const rank = squad.filter((q) => q.ovr > p.ovr).length;
  return rank < 11 ? 0.85 : rank < 16 ? 0.4 : 0.1;
}

function movePyramid(s: GameState, season: number, rng: Rng) {
  invalidateSquads();
  const recs = s.history.filter((h) => h.season === season);
  const up: number[][] = [];
  const down: number[][] = [];
  for (const lg of s.leagues) {
    const r = recs.filter((h) => h.div === lg.div).sort((a, b) => a.pos - b.pos);
    up[lg.div] = lg.div > 1 ? r.filter((h) => h.outcome === 'champion' || h.outcome === 'promoted' || h.outcome === 'playoff_winner').map((h) => h.clubId) : [];
    down[lg.div] = r.filter((h) => h.outcome === 'relegated').map((h) => h.clubId);
    // the user's club never drops out of the simulated pyramid: at the bottom tier it survives
    if (lg.div === 10 && down[10].includes(s.userClubId)) {
      const spare = r.filter((h) => h.outcome !== 'relegated' && !up[10].includes(h.clubId)).pop();
      down[10] = down[10].filter((id) => id !== s.userClubId);
      if (spare) down[10].push(spare.clubId);
      addMessage(s, { cat: 'League', title: 'Reprieve', body: 'There is no lower simulated league, so the club keeps its place in the bottom division.' });
    }
  }
  const newMembers: number[][] = [];
  for (const lg of s.leagues) {
    const d = lg.div;
    let m = lg.clubIds.filter((id) => !up[d].includes(id) && !down[d].includes(id));
    if (d > 1) m = m.concat(down[d - 1]);
    if (d < 10) m = m.concat(up[d + 1]);
    newMembers[d] = m;
  }
  // Division 10: relegated clubs drop to the regional pool, replaced by the strongest nearby pool clubs
  const l10 = s.leagues[9];
  const l10def = LEAGUES.find((l) => l.key === l10.key)!;
  const pool10 = s.clubs.filter((c) => c.div === 10 && !l10.clubIds.includes(c.id) && !newMembers[10].includes(c.id));
  pool10.sort((a, b) => dist(a, l10def) - dist(b, l10def));
  const cands = pool10.slice(0, 25).sort((a, b) => b.strength - a.strength).slice(0, 20 - newMembers[10].length);
  newMembers[10].push(...cands.map((c) => c.id));

  // Apply membership
  for (const lg of s.leagues) {
    lg.clubIds = newMembers[lg.div];
    for (const id of lg.clubIds) {
      const c = s.clubs[id];
      c.div = lg.div;
      c.leagueKey = lg.key;
    }
  }
  for (const id of down[10]) {
    const c = s.clubs[id];
    c.div = 10;
    c.leagueKey = nearest(LEAGUES.filter((l) => l.div === 10), c.lat, c.lon).key;
  }

  // Pool swap: strongest pool club vs weakest club just relegated into the tier
  for (let d = 2; d <= 10; d++) {
    const lg = s.leagues[d - 1];
    const def = LEAGUES.find((l) => l.key === lg.key)!;
    const relegatedIn = (down[d - 1] ?? []).map((id) => s.clubs[id]).filter((c) => !c.user);
    if (!relegatedIn.length) continue;
    const weakest = relegatedIn.reduce((a, b) => (a.strength < b.strength ? a : b));
    const pool = s.clubs.filter((c) => c.div === d && !lg.clubIds.includes(c.id) && !c.user);
    const near = d >= 6 ? pool.sort((a, b) => dist(a, def) - dist(b, def)).slice(0, 25) : pool;
    if (!near.length) continue;
    const best = near.reduce((a, b) => (a.strength > b.strength ? a : b));
    if (best.strength > weakest.strength + 1) {
      lg.clubIds = lg.clubIds.map((id) => (id === weakest.id ? best.id : id));
      best.leagueKey = lg.key;
      weakest.leagueKey = d >= 6 ? nearest(LEAGUES.filter((l) => l.div === d), weakest.lat, weakest.lon).key : weakest.leagueKey;
      addNews(s, `${best.name} take the ${lg.short} place of ${weakest.name}, who drop into the regional pool.`);
    }
  }

  // Off-chain virtual reshuffle between tiers (by strength)
  const inSim = new Set(s.leagues.flatMap((l) => l.clubIds));
  for (let d = 2; d <= 9; d++) {
    const upper = s.clubs.filter((c) => c.div === d && !inSim.has(c.id)).sort((a, b) => a.strength - b.strength);
    const lower = s.clubs.filter((c) => c.div === d + 1 && !inSim.has(c.id)).sort((a, b) => b.strength - a.strength);
    const n = Math.min(Math.ceil(upper.length * 0.08), lower.length);
    for (let i = 0; i < n; i++) {
      if (lower[i].strength <= upper[i].strength) break;
      const a = upper[i];
      const b = lower[i];
      a.div = d + 1;
      b.div = d;
      if (d + 1 >= 6) a.leagueKey = nearest(LEAGUES.filter((l) => l.div === d + 1), a.lat, a.lon).key;
      if (d >= 6) b.leagueKey = nearest(LEAGUES.filter((l) => l.div === d), b.lat, b.lon).key;
      else b.leagueKey = LEAGUES.find((l) => l.div === d)!.key;
    }
  }
  // reputation drifts with division
  for (const c of s.clubs) c.rep = clamp(Math.round(c.rep * 0.85 + (100 - c.div * 9) * 0.15), 1, 100);
  void rng;
}

const POS_NEEDS: Position[] = ['GK', 'GK', 'CB', 'CB', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST', 'ST', 'ST'];

/** AI clubs: replace departures so squads stay 20-24, pulling quality toward the division level. */
export function maintainSquads(s: GameState, rng: Rng) {
  const idx = buildSquadIndex(s);
  const fas = [...s.players.values()].filter((p) => p.clubId == null && !p.retired);
  for (const c of s.clubs) {
    if (c.user) continue;
    const squad = idx.get(c.id) ?? [];
    const target = c.div <= 4 ? 24 : 21;
    if (squad.length >= target) continue;
    const avg = DIV_AVG_OVR[c.div];
    const cur = squad.length ? squad.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 14).reduce((x, y) => x + y, 0) / Math.min(14, squad.length) : avg;
    const quality = (cur - avg) * 0.3 - 1;
    while (squad.length < target) {
      const counts: Record<string, number> = {};
      for (const p of squad) counts[p.pos] = (counts[p.pos] ?? 0) + 1;
      const need = POS_NEEDS.find((pos, i) => (counts[pos] ?? 0) < POS_NEEDS.slice(0, i + 1).filter((x) => x === pos).length) ?? rng.pick(POSITIONS.slice(1));
      // try a free agent of the right position and level first
      const faIdx = fas.findIndex((p) => p.pos === need && Math.abs(p.ovr - (avg + quality - 3)) < 4);
      let p: Player;
      if (faIdx >= 0) {
        p = fas.splice(faIdx, 1)[0];
      } else {
        const young = rng.chance(0.45);
        const a = young ? rng.int(17, 20) : randomAge(rng);
        p = generatePlayer(rng, s.nextPlayerId++, { ovr: avg + quality - (young ? 7 : 3) + rng.normal(0, 3), pos: need, age: a, season: s.season, div: c.div, potBoost: young ? 3 : 0 });
        s.players.set(p.id, p);
      }
      signContract(rng, p, c.id, c.div, s.season, roleForRank(squad.filter((q) => q.ovr > p.ovr).length));
      squad.push(p);
    }
  }
  // Keep the free agent pool stocked
  const faCount = [...s.players.values()].filter((p) => p.clubId == null).length;
  for (let i = faCount; i < 450; i++) {
    const div = rng.int(4, 10);
    const p = generatePlayer(rng, s.nextPlayerId++, { ovr: DIV_AVG_OVR[div] - 4 + rng.normal(0, 4), pos: rng.pick(POSITIONS), age: randomAge(rng), season: s.season, div });
    s.players.set(p.id, p);
  }
}
