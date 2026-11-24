import { ECONOMY } from '../data/economy';
import { roundMoney } from '../data/economy';
import { addMessage } from '../season';
import { clamp } from '../rng';
import { CAL, type GameState } from '../state';
import { registerSystem } from '../systems';
import { txn } from './finance';

/** Facilities (DESIGN 9.2): four branches, levels 1..10, some levels are either/or choices. */
export type Branch = 'stadium' | 'training' | 'academy' | 'commercial';
export const BRANCHES: { key: Branch; label: string; desc: string }[] = [
  { key: 'stadium', label: 'Stadium', desc: 'Capacity, comfort, ticket prices and the look of your ground.' },
  { key: 'training', label: 'Training', desc: 'Coach caps, development speed and injuries.' },
  { key: 'academy', label: 'Academy', desc: 'Youth coach and scout caps, intake size and quality.' },
  { key: 'commercial', label: 'Commercial', desc: 'Merchandise, matchday spend and commercial manager cap.' },
];

export interface FacEffect {
  capacity?: number; // seats added
  comfort?: number; // + attendance factor
  ticketMax?: number; // + ticket price ceiling factor
  homeMorale?: number; // home atmosphere: morale points for the XI at home
  merch?: number; // + merchandise multiplier
  matchday?: number; // matchday spend per fan, as a share of the ticket price
  rentals?: number; // weekly rentals, as a share of the division's sponsor money per season / 52
  injury?: number; // injury chance/duration factor (negative is better)
  dev?: number; // + development factor for all
  devPrime?: number; // + development factor for ages 21-26
  youthCount?: number;
  youthQuality?: number;
}

export interface Upgrade {
  id: string;
  branch: Branch;
  level: number; // the branch level reached when finished
  name: string;
  desc: string;
  cost: number;
  weeks: number;
  upkeep: number; // per week
  eff: FacEffect;
}

type Def = [name: string, desc: string, eff: FacEffect, extraWeeks?: number];
const DEFS: Record<Branch, Record<number, Def[]>> = {
  stadium: {
    2: [['Floodlights & turnstiles', 'Evening games and quicker entry.', { comfort: 0.05 }]],
    3: [
      ['North stand: terrace', 'Cheap standing room. Loud home crowd.', { capacity: 700, homeMorale: 3 }, 6],
      ['North stand: seated', 'Fewer places but fans pay more.', { capacity: 450, comfort: 0.05, ticketMax: 0.15 }, 8],
    ],
    4: [['Roofs on all sides', 'Rain no longer keeps fans away.', { comfort: 0.07 }]],
    5: [['Big screen', 'Replays and adverts on match day.', { comfort: 0.04, merch: 0.05 }]],
    6: [
      ['South stand: terrace', 'A big end for the ultras.', { capacity: 2500, homeMorale: 3 }, 12],
      ['South stand: seated', 'Comfortable seats for families.', { capacity: 1600, comfort: 0.06, ticketMax: 0.2 }, 14],
    ],
    7: [['Hospitality boxes', 'Corporate guests pay premium prices.', { ticketMax: 0.25, comfort: 0.03 }]],
    8: [['East stand rebuild', 'Two tiers along the touchline.', { capacity: 6000, comfort: 0.03 }, 16]],
    9: [['Corner infills', 'Closes the bowl. Big atmosphere.', { capacity: 9000, homeMorale: 2 }, 18]],
    10: [['Super stadium', 'A modern arena worthy of the top flight.', { capacity: 20000, comfort: 0.08, ticketMax: 0.2 }, 26]],
  },
  training: {
    2: [['Proper pitches', 'Flat, drained grass to train on.', { dev: 0.02 }]],
    3: [['Gym', 'Strength and conditioning.', { dev: 0.02 }]],
    4: [['Medical room', 'Treatment on site.', { injury: -0.1 }]],
    5: [['Video room', 'Players learn from their games.', { dev: 0.02 }]],
    6: [
      ['Sports science lab', 'Fewer and shorter injuries.', { injury: -0.2 }],
      ['Analysis suite', 'Players aged 21 to 26 develop faster.', { devPrime: 0.15 }],
    ],
    7: [['Hydrotherapy pool', 'Shorter injuries.', { injury: -0.1 }]],
    8: [['Goalkeeping area', 'Specialist kit for keepers.', { dev: 0.03 }]],
    9: [['Indoor dome', 'Train in any weather.', { dev: 0.03 }]],
    10: [['Performance centre', 'Elite training complex.', { dev: 0.04, injury: -0.1 }]],
  },
  academy: {
    2: [['Youth pitches', 'Room for an extra age group.', { youthCount: 1 }]],
    3: [
      ['Dorms', 'Players from further away can join.', { youthCount: 1 }],
      ['School partnership', 'Better local talent.', { youthQuality: 3 }],
    ],
    4: [['Youth scouting network', 'Wider net for young players.', { youthQuality: 2 }]],
    5: [['Youth coaching centre', 'Full-time youth coaching staff.', { youthQuality: 2 }]],
    6: [
      ['Regional hubs', 'More players every year.', { youthCount: 2 }],
      ['Elite programme', 'Fewer but better prospects.', { youthQuality: 4 }],
    ],
    7: [['Sports school', 'Education and football together.', { youthQuality: 2 }]],
    8: [['International network', 'Prospects from abroad.', { youthQuality: 2, youthCount: 1 }]],
    9: [['Academy stadium', 'Youth games in front of crowds.', { youthQuality: 2 }]],
    10: [['Category One status', 'The best academy in the country.', { youthQuality: 4, youthCount: 1 }]],
  },
  commercial: {
    2: [['Club shop', 'Shirts and scarves on sale.', { merch: 0.15 }]],
    3: [['Clubhouse bar', 'Fans spend before and after games.', { matchday: 0.2 }]],
    4: [['Online store', 'Sell to fans everywhere.', { merch: 0.25 }]],
    5: [['Conference rooms', 'Rent rooms on non-match days.', { rentals: 0.05 }]],
    6: [
      ['Megastore', 'A big shop next to the ground.', { merch: 0.35 }],
      ['Fan zone', 'Food, music and games before kick-off.', { matchday: 0.25, comfort: 0.03 }],
    ],
    7: [['Car park', 'Paid parking on match days.', { matchday: 0.1 }]],
    8: [['Club hotel', 'Rooms and events all year.', { rentals: 0.08 }]],
    9: [['Museum & tours', 'History pays.', { rentals: 0.05, merch: 0.1 }]],
    10: [['Global brand office', 'Sell the club around the world.', { merch: 0.4, rentals: 0.05 }]],
  },
};

// DESIGN 11.5: about £10k for level 2 up to ~£80m for level 10; build time 4 to 52 weeks
const BASE_COST: Record<Branch, number> = { stadium: 10000, training: 10000, academy: 8000, commercial: 8000 };
const WEEKS = [0, 0, 4, 6, 8, 12, 16, 20, 26, 36, 52];

function slug(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const UPGRADES: Upgrade[] = [];
for (const b of BRANCHES) {
  for (const [lvlStr, defs] of Object.entries(DEFS[b.key])) {
    const level = Number(lvlStr);
    for (const [name, desc, eff, extraWeeks] of defs) {
      const seated = name.includes('seated') ? 1.4 : 1;
      const cost = roundMoney(BASE_COST[b.key] * Math.pow(3.1, level - 2) * seated);
      UPGRADES.push({ id: `${b.key}-${level}-${slug(name)}`, branch: b.key, level, name, desc, cost, weeks: WEEKS[level] + Math.round((extraWeeks ?? 0) / 3), upkeep: Math.max(1, Math.round(cost * 0.003)), eff });
    }
  }
}

export interface FacilitiesState {
  levels: Record<Branch, number>;
  built: string[];
  projects: { id: string; weeksLeft: number }[];
}

export function facState(s: GameState): FacilitiesState {
  let f = s.ext.fac as FacilitiesState | undefined;
  if (!f) {
    f = { levels: { stadium: 1, training: 1, academy: 1, commercial: 1 }, built: [], projects: [] };
    s.ext.fac = f;
  }
  return f;
}

export function upgradeById(id: string) {
  return UPGRADES.find((u) => u.id === id);
}

/** Options for the next level of a branch (empty at level 10 or while building). */
export function nextOptions(s: GameState, b: Branch): Upgrade[] {
  const f = facState(s);
  return UPGRADES.filter((u) => u.branch === b && u.level === f.levels[b] + 1);
}

export function building(s: GameState, b: Branch) {
  const f = facState(s);
  const p = f.projects.find((x) => upgradeById(x.id)?.branch === b);
  return p ? { ...p, up: upgradeById(p.id)! } : null;
}

/** Sum of all built effects. */
export function effects(s: GameState): Required<FacEffect> {
  const tot: Required<FacEffect> = { capacity: 0, comfort: 0, ticketMax: 0, homeMorale: 0, merch: 0, matchday: 0, rentals: 0, injury: 0, dev: 0, devPrime: 0, youthCount: 0, youthQuality: 0 };
  for (const id of facState(s).built) {
    const u = upgradeById(id);
    if (!u) continue;
    for (const [k, v] of Object.entries(u.eff)) tot[k as keyof FacEffect] += v as number;
  }
  return tot;
}

export function facilityUpkeep(s: GameState): number {
  return facState(s).built.reduce((a, id) => a + (upgradeById(id)?.upkeep ?? 0), 0);
}

/** Copy derived values into s.ext so finance/staff/stadium read them without importing this module. */
export function syncFacilities(s: GameState) {
  const f = facState(s);
  const e = effects(s);
  const c = s.clubs[s.userClubId];
  s.ext.facilities = { ...f.levels };
  s.ext.comfort = 1 + e.comfort;
  s.ext.merchMult = 1 + e.merch + (f.levels.commercial - 1) * 0.04;
  s.ext.upkeep = Math.round((s.ext.baseUpkeep as number | undefined ?? c.capacity * 0.03) + facilityUpkeep(s));
  s.ext.ticketMax = e.ticketMax;
  s.ext.homeMorale = e.homeMorale;
  s.ext.stadiumLevel = clamp(f.levels.stadium + 1, 1, 11);
}

/** Price after any board discount. */
export function costOf(s: GameState, u: Upgrade): number {
  const d = (s.ext.facDiscount as number | undefined) ?? 0;
  return Math.round(u.cost * (1 - d));
}

export function canStart(s: GameState, u: Upgrade): string | null {
  const f = facState(s);
  if (f.levels[u.branch] + 1 !== u.level) return 'Not the next level.';
  if (building(s, u.branch)) return 'Already building in this branch.';
  if (s.clubs[s.userClubId].cash < costOf(s, u)) return 'Not enough cash.';
  return null;
}

export function startUpgrade(s: GameState, id: string): string | null {
  const u = upgradeById(id);
  if (!u) return 'Unknown upgrade.';
  const err = canStart(s, u);
  if (err) return err;
  txn(s, 'build', -costOf(s, u));
  s.ext.facDiscount = 0;
  facState(s).projects.push({ id, weeksLeft: u.weeks });
  return null;
}

function finish(s: GameState, u: Upgrade) {
  const f = facState(s);
  f.built.push(u.id);
  f.levels[u.branch] = u.level;
  const c = s.clubs[s.userClubId];
  if (u.eff.capacity) c.capacity += u.eff.capacity;
  syncFacilities(s);
  addMessage(s, { cat: 'Club', title: `${u.name} finished`, body: `${BRANCHES.find((b) => b.key === u.branch)!.label} is now level ${u.level}. ${u.desc}` });
}

/** Extra matchday and rental income for the week. */
function commercialIncome(s: GameState) {
  const e = effects(s);
  const c = s.clubs[s.userClubId];
  const home = s.fixtures.find((f) => f.week === s.week && f.home === c.id && f.hg != null);
  let inc = 0;
  if (home?.att && e.matchday) inc += home.att * c.ticket * e.matchday;
  if (e.rentals) inc += (ECONOMY[c.div].sponsor * e.rentals) / 52;
  if (inc > 0) txn(s, 'other_in', inc);
}

registerSystem({
  name: 'facilities',
  init(s) {
    facState(s);
    s.ext.baseUpkeep = Math.round(s.clubs[s.userClubId].capacity * 0.03);
    syncFacilities(s);
  },
  weekly(s, _rng, _idx, res) {
    const f = facState(s);
    if (s.ext.baseUpkeep == null) {
      s.ext.baseUpkeep = Math.round(s.clubs[s.userClubId].capacity * 0.03);
      syncFacilities(s);
    }
    for (const p of [...f.projects]) {
      p.weeksLeft--;
      if (p.weeksLeft <= 0) {
        f.projects = f.projects.filter((x) => x !== p);
        const u = upgradeById(p.id);
        if (u) {
          finish(s, u);
          res.stop = true;
        }
      }
    }
    commercialIncome(s);
  },
});

/** Ground grading note for the UI (DESIGN 9.2, informational only in this sandbox). */
export function gradingNote(s: GameState): string | null {
  const c = s.clubs[s.userClubId];
  const seated = facState(s).built.some((id) => id.includes('seated'));
  if (c.div <= 5 && !seated) return 'National League grounds need a seated stand. Build one to meet ground grading.';
  return null;
}

void CAL;
