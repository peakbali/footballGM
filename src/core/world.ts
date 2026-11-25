import { ECONOMY, USER_START_CASH } from './data/economy';
import { DIV_AVG_OVR, LEAGUES, type LeagueDef } from './data/pyramid';
import { generatePlayer, generateSquad, pickNationality, randomAge, signContract } from './generate';
import { makeFixtures } from './league';
import { Rng, clamp, hashString } from './rng';
import { refreshClubRatings } from './selection';
import { buildSquadIndex, SAVE_VERSION, START_SEASON, type GameState, type SimLeague } from './state';
import type { AiType, Club, Player } from './types';
import { POSITIONS } from './data/positions';
import { runInitSystems } from './systems';
import { FOREIGN, FOREIGN_COLORS } from './data/foreign';
import { randomName } from './generate';

export interface ClubDef {
  name: string;
  stadium?: string;
  capacity?: number;
  league: LeagueDef;
}

/** All clubs, deduplicated (a club listed twice keeps its highest division). */
export function clubDefs(): ClubDef[] {
  const seen = new Set<string>();
  const out: ClubDef[] = [];
  for (const lg of [...LEAGUES].sort((a, b) => a.div - b.div)) {
    for (const line of lg.clubs.split('\n')) {
      const [name, stadium, cap] = line.split('|').map((x) => x.trim());
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({ name, stadium: stadium || undefined, capacity: cap ? +cap : undefined, league: lg });
    }
  }
  return out;
}

export function startingLeagues(): LeagueDef[] {
  return LEAGUES.filter((l) => l.div === 9);
}

export function clubsInLeague(key: string): string[] {
  return clubDefs().filter((c) => c.league.key === key).map((c) => c.name);
}

/** The regional chain (league keys for divs 6..10) for a starting div-9 league. */
export function chainFor(startKey: string): string[] {
  const byKey = new Map(LEAGUES.map((l) => [l.key, l]));
  const l9 = byKey.get(startKey)!;
  const l8 = byKey.get(l9.feeds!)!;
  const l7 = byKey.get(l8.feeds!)!;
  const l6 = byKey.get(l7.feeds!)!;
  let l10 = LEAGUES.find((l) => l.div === 10 && l.feeds === startKey);
  if (!l10) l10 = nearest(LEAGUES.filter((l) => l.div === 10), l9.lat, l9.lon);
  return [l6.key, l7.key, l8.key, l9.key, l10.key];
}

export function nearest<T extends { lat: number; lon: number }>(items: T[], lat: number, lon: number): T {
  let best = items[0];
  let bd = Infinity;
  for (const it of items) {
    const d = (it.lat - lat) ** 2 + ((it.lon - lon) * 0.6) ** 2;
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

const PALETTE = ['#c8102e', '#003399', '#ffd200', '#1b5e20', '#ffffff', '#111111', '#6a1b9a', '#ff6f00', '#00838f', '#7b1e3c', '#87ceeb', '#e65100', '#2e7d32', '#0d47a1', '#b71c1c', '#f5f5f5'];
const KNOWN_COLORS: Record<string, [string, string]> = {
  'Belwell Harriers': ['#ef0107', '#ffffff'], 'Walwood Colliery': ['#670e36', '#95bfe5'], 'Woldmere Athletic': ['#da291c', '#000000'], 'Ottwick Swifts': ['#e30613', '#ffffff'],
  'Falstow FC': ['#0057b8', '#ffffff'], 'Whitham Olympic': ['#6c1d45', '#99d6ea'], 'Quenham Olympic': ['#034694', '#ffffff'], 'Ashbridge United': ['#1b458f', '#c4122e'],
  'Dunbridge Town': ['#003399', '#ffffff'], 'AFC Ulstead': ['#ffffff', '#000000'], 'Rushstead Dynamos': ['#ffffff', '#1d428a'], 'Coldwood FC': ['#c8102e', '#f6eb61'],
  'Oakbridge Victoria': ['#6cabdd', '#ffffff'], 'Woldbury Colliery': ['#da291c', '#fbe122'], 'Lindfield Rovers': ['#241f20', '#ffffff'], 'Ormwell Sports': ['#dd0000', '#ffffff'],
  'Ashmouth Celtic': ['#eb172b', '#ffffff'], 'Ludham Victoria': ['#ffffff', '#132257'], 'Ramston Rangers': ['#7a263a', '#1bb1e7'], 'Ulwood Sports': ['#fdb913', '#231f20'],
};

/** Relative strength offsets for well-known clubs at the start (OVR points vs division average). */
const KNOWN_QUALITY: Record<string, number> = {
  'Oakbridge Victoria': 5, 'Belwell Harriers': 5, 'Coldwood FC': 5, 'Quenham Olympic': 4, 'Woldbury Colliery': 3, 'Ludham Victoria': 3, 'Lindfield Rovers': 3, 'Walwood Colliery': 2.5,
  'Ormwell Sports': 1, 'Falstow FC': 1, 'Ashbridge United': 0.5, 'Ottwick Swifts': 0, 'AFC Ulstead': 0, 'Woldmere Athletic': 0, 'Dunbridge Town': -0.5, 'Ramston Rangers': 0,
  'Ulwood Sports': -1.5, 'Rushstead Dynamos': -2, 'Whitham Olympic': -3, 'Ashmouth Celtic': -2.5,
  'Kesgate Corinthians': 3, 'AFC Scardale': 3, 'Gilby Town': 2.5, 'AFC Wexmere': 2, 'Carrcliffe Sports': 1.5, 'Langwell Villa': 1, 'Rushby Rangers': 1.5,
  'Calmore FC': 2, 'Vercott Wanderers': 1.5, 'Falmere Town': 1.5, 'Kesthorpe Villa': 1.5, 'Paddale Town': 2, 'Belford FC': 1,
};

export function abbrev(name: string): string {
  const words = name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter((w) => w && !['FC', 'AFC', 'and', 'of', 'the', 'Town', 'United', 'City'].includes(w));
  const w = words.length ? words : name.split(/\s+/);
  if (w.length >= 3) return (w[0][0] + w[1][0] + w[2][0]).toUpperCase();
  if (w.length === 2) return (w[0].slice(0, 2) + w[1][0]).toUpperCase();
  return w[0].slice(0, 3).toUpperCase();
}

export function shortName(name: string): string {
  if (name.length <= 14) return name;
  return name.replace(/ (Football Club|Town|United|City|Athletic|Rovers|Wanderers|Albion|Hotspur)$/, '').slice(0, 16);
}

const STADIUM_SUFFIX = ['Park', 'Road', 'Lane', 'Ground', 'Meadow', 'Field', 'Stadium', 'Arena'];

export function makeClub(id: number, def: ClubDef, rng: Rng): Club {
  const div = def.league.div;
  const eco = ECONOMY[div];
  const h = hashString(def.name);
  const colors = KNOWN_COLORS[def.name] ?? [PALETTE[h % PALETTE.length], PALETTE[(h >>> 8) % PALETTE.length] === PALETTE[h % PALETTE.length] ? '#ffffff' : PALETTE[(h >>> 8) % PALETTE.length]];
  const capacity = def.capacity ?? Math.round(eco.capacity * rng.range(0.5, 1.4) / 50) * 50;
  const town = def.name.split(' ')[0];
  const ai: AiType = rng.pick(['buyer', 'developer', 'seller', 'seller', 'developer'] as const);
  return {
    id,
    name: def.name,
    short: shortName(def.name),
    abbrev: abbrev(def.name),
    colors,
    stadium: def.stadium ?? `${town} ${STADIUM_SUFFIX[(h >>> 4) % STADIUM_SUFFIX.length]}`,
    capacity,
    seats: Math.round(capacity * (div <= 4 ? 1 : div <= 6 ? 0.4 : 0.15)),
    rep: clamp(Math.round(100 - div * 9 + rng.normal(0, 4)), 1, 100),
    ai,
    cash: Math.round(eco.startCash * rng.range(0.6, 1.5)),
    ticket: eco.ticket,
    formation: rng.pick(['4-4-2', '4-4-2', '4-3-3', '4-2-3-1', '4-1-4-1', '3-5-2']),
    div,
    leagueKey: def.league.key,
    lat: def.league.lat + rng.normal(0, 0.15),
    lon: def.league.lon + rng.normal(0, 0.15),
    strength: DIV_AVG_OVR[div],
    att: 0, mid: 0, def: 0, gk: 0,
  };
}

/** Division whose average is closest to a foreign league's level (for wages and values). */
function equivDiv(ovr: number): number {
  let best = 1;
  for (let d = 1; d <= 10; d++) if (Math.abs(DIV_AVG_OVR[d] - ovr) < Math.abs(DIV_AVG_OVR[best] - ovr)) best = d;
  return best;
}

/** Clubs abroad: squads only, no fixtures (DESIGN 3.1). */
function addForeign(s: GameState, rng: Rng) {
  for (const fl of FOREIGN) {
    for (const entry of fl.clubs.split(';')) {
      const [name, qs] = entry.split(':');
      const q = Number(qs);
      const ovr = fl.avg + q * 0.8;
      const div = equivDiv(ovr);
      const eco = ECONOMY[div];
      const h = hashString(name);
      const colors = FOREIGN_COLORS[name] ?? [PALETTE[h % PALETTE.length], '#ffffff'];
      const town = name.replace(/^(1\. FC|FC|SC|AC|RB|VfB|VfL|TSG|AS|OGC|RC|SL|CD|UD|CA|AZ|NEC|PEC|NAC|SV|TSV|US|SS|SD|VV|GD|Real|Racing|Deportivo|Eintracht|Sportfreunde|Virtus|Sporting|Stade|Quick|Sportclub|União|Académico|Desportivo) /, '').split(' ')[0];
      const c: Club = {
        id: s.clubs.length, name, short: shortName(name), abbrev: abbrev(name), colors,
        stadium: `${fl.suffix[0]}${town}${fl.suffix[1]}`,
        capacity: Math.round((eco.capacity * rng.range(0.6, 1.5)) / 500) * 500,
        seats: 0, rep: clamp(Math.round(ovr + 10 + rng.normal(0, 3)), 1, 100),
        ai: rng.pick(['buyer', 'developer', 'seller', 'seller'] as const),
        cash: Math.round(eco.startCash * rng.range(0.6, 1.5)), ticket: eco.ticket,
        formation: rng.pick(['4-3-3', '4-2-3-1', '4-4-2', '3-5-2']),
        div, leagueKey: fl.key, lat: 45, lon: 5, strength: ovr, att: 0, mid: 0, def: 0, gk: 0,
        country: fl.country,
      };
      c.seats = c.capacity;
      s.clubs.push(c);
      for (const p of generateSquad(rng, () => s.nextPlayerId++, c.id, div, ovr - DIV_AVG_OVR[div], s.season, 24)) {
        if (rng.chance(0.65)) {
          p.nat = fl.country;
          const n = randomName(rng, fl.country);
          p.first = n.first;
          p.last = n.last;
        }
        s.players.set(p.id, p);
      }
    }
  }
}

export function foreignLeagueName(c: Club): string | null {
  return c.country ? FOREIGN.find((f) => f.key === c.leagueKey)?.name ?? c.country : null;
}

/** Create a new world. `userClubName` must be a club in a division 9 league. */
export function newGame(seed: number, userClubName: string): GameState {
  const rng = new Rng(seed);
  const defs = clubDefs();
  const userDef = defs.find((d) => d.name === userClubName);
  if (!userDef || userDef.league.div !== 9) throw new Error(`Unknown division 9 club: ${userClubName}`);
  const chain = chainFor(userDef.league.key);
  const season = START_SEASON;

  const s: GameState = {
    version: SAVE_VERSION, seed, season, week: 1, userClubId: -1, chain,
    clubs: [], players: new Map(), nextPlayerId: 1, leagues: [], fixtures: [], nextFixtureId: 1,
    reports: new Map(), history: [], inbox: [], nextMsgId: 1, news: [],
    settings: { muted: false, music: 0.6, sfx: 0.8 }, ext: {},
    fin: { season: {}, last: {}, cashHistory: [] }, sponsors: [], offers: [], nextOfferId: 1,
    scouting: { assignments: {}, reports: {}, shortlist: [], starred: [], lastList: {} },
    staff: [], staffPool: [], nextStaffId: 1, transfers: [],
  };
  const nextId = () => s.nextPlayerId++;

  defs.forEach((d, i) => {
    const c = makeClub(i, d, rng);
    s.clubs.push(c);
    if (d.name === userClubName) {
      c.user = true;
      s.userClubId = i;
      c.cash = USER_START_CASH;
      c.ai = 'developer';
      c.formation = '4-4-2';
    }
  });

  // Squads
  for (const c of s.clubs) {
    const q = KNOWN_QUALITY[c.name] ?? rng.normal(0, 2.2);
    const size = c.div <= 4 ? 24 : 21 + rng.int(0, 2);
    for (const p of generateSquad(rng, nextId, c.id, c.div, q, season, size)) s.players.set(p.id, p);
  }
  addForeign(s, rng);
  // Free agents (spread across levels)
  for (let i = 0; i < 400; i++) {
    const div = rng.int(3, 10);
    const pos = rng.pick(POSITIONS);
    const p = generatePlayer(rng, nextId(), { ovr: DIV_AVG_OVR[div] - 4 + rng.normal(0, 4), pos, age: randomAge(rng), season, div, nat: pickNationality(rng, div) });
    s.players.set(p.id, p);
  }
  const idx = buildSquadIndex(s);
  for (const c of s.clubs) refreshClubRatings(c, idx.get(c.id) ?? []);

  // Simulated leagues
  for (let div = 1; div <= 10; div++) {
    const key = div <= 5 ? LEAGUES.find((l) => l.div === div)!.key : chain[div - 6];
    const def = LEAGUES.find((l) => l.key === key)!;
    let members = s.clubs.filter((c) => c.leagueKey === key);
    members.sort((a, b) => (b.user ? 1 : 0) - (a.user ? 1 : 0) || b.strength - a.strength);
    members = members.slice(0, 20);
    if (members.length < 20) {
      const pool = s.clubs.filter((c) => c.div === div && !c.country && !members.includes(c));
      pool.sort((a, b) => dist(a, def) - dist(b, def));
      const near = pool.slice(0, 12).sort((a, b) => b.strength - a.strength);
      members.push(...near.slice(0, 20 - members.length));
    }
    const lg: SimLeague = { div, key, name: def.name, short: def.short, clubIds: members.map((c) => c.id) };
    for (const c of members) c.leagueKey = key;
    s.leagues.push(lg);
  }
  makeFixtures(s, rng);
  runInitSystems(s, rng);
  return s;
}

export function dist(c: { lat: number; lon: number }, l: { lat: number; lon: number }): number {
  return (c.lat - l.lat) ** 2 + ((c.lon - l.lon) * 0.6) ** 2;
}

export function playersOf(s: GameState, clubId: number): Player[] {
  return buildSquadIndex(s).get(clubId) ?? [];
}

/** Re-export for tools. */
export { signContract };
