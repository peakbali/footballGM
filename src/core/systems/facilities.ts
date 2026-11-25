import { ECONOMY, roundMoney } from '../data/economy';
import { addMessage } from '../season';
import { clamp } from '../rng';
import type { GameState } from '../state';
import { registerSystem } from '../systems';
import { txn } from './finance';

/**
 * Facilities (DESIGN 9.2, reworked in 13.2i). Four main branches, each made of five sub-facilities
 * ("tracks") with five levels. Every level has a clear reward. Prices follow the club's current
 * division (a share of what a club of that division earns in a season), so an upgrade always costs
 * about the same effort, whatever the tier. The main branch level (1..10) is derived from its tracks
 * and still drives staff caps, academy size and the stadium art.
 */
export type Branch = 'stadium' | 'training' | 'academy' | 'commercial';
export const BRANCHES: { key: Branch; label: string; desc: string }[] = [
  { key: 'stadium', label: 'Stadium', desc: 'Seats, lights, pitch, screens and hospitality.' },
  { key: 'training', label: 'Training ground', desc: 'Development, injuries and the skills lab.' },
  { key: 'academy', label: 'Academy', desc: 'Intake size, prospect quality and the path to the first team.' },
  { key: 'commercial', label: 'Commercial', desc: 'Shop, catering, sponsors, events and media.' },
];

export interface FacEffect {
  capacityPct?: number; // seats added, as a share of the current capacity (applied when finished)
  comfort?: number; // + attendance factor
  ticketMax?: number; // + ticket price ceiling factor
  homeMorale?: number; // home atmosphere: morale points for the XI at home
  merch?: number; // + merchandise multiplier
  matchday?: number; // matchday spend per fan, as a share of the ticket price
  rentals?: number; // yearly rentals, as a share of the division's sponsor money
  sponsor?: number; // + sponsor deal income
  injury?: number; // injury chance/duration factor (negative is better)
  dev?: number; // + development factor for all
  devPrime?: number; // + development factor for ages 21-26
  youthDev?: number; // + development factor for academy players
  youthCount?: number;
  youthQuality?: number;
  grad?: number; // OVR and POT added when an academy player is promoted
  lab?: number; // skills lab level (training items)
}

export interface Track {
  key: string;
  branch: Branch;
  label: string;
  desc: string;
  tc: number; // cost factor
  slow?: number; // build time factor
  names: string[];
  per: FacEffect; // effect of each level
}

export const MAX_TRACK = 5;

export const TRACKS: Track[] = [
  // ---- stadium
  { key: 'stands', branch: 'stadium', label: 'Seats & stands', tc: 1, slow: 1.5, desc: 'More seats for when the ground fills up, and a louder home end.', names: ['Extra terrace steps', 'Covered stand', 'Corner infills', 'Two-tier main stand', 'Bowl stadium'], per: { capacityPct: 0.15, homeMorale: 0.6 } },
  { key: 'lights', branch: 'stadium', label: 'Lighting', tc: 0.6, desc: 'Evening games and a better matchday. More fans turn up.', names: ['Floodlights', 'LED floodlights', 'Concourse lighting', 'Roof lighting', 'Light show'], per: { comfort: 0.05 } },
  { key: 'pitch', branch: 'stadium', label: 'Pitch', tc: 0.6, desc: 'A better surface: fewer injuries and a home edge.', names: ['Drainage', 'Hybrid grass', 'Undersoil heating', 'Full-time groundstaff', 'Perfect pitch'], per: { injury: -0.04, dev: 0.008, homeMorale: 0.4 } },
  { key: 'screens', branch: 'stadium', label: 'Scoreboard & screens', tc: 0.6, desc: 'Advertising space and a show for the fans: sponsor money and crowds.', names: ['Scoreboard', 'Big screen', 'LED advertising boards', 'Giant video wall', 'Digital arena'], per: { sponsor: 0.06, comfort: 0.02 } },
  { key: 'lounge', branch: 'stadium', label: 'Hospitality & lounges', tc: 0.8, desc: 'Premium places: higher ticket prices and more matchday spending.', names: ['Waiting lounge', 'Hospitality boxes', 'Club restaurant', 'Executive suites', 'Presidential lounge'], per: { ticketMax: 0.06, matchday: 0.04 } },
  // ---- training ground
  { key: 'grounds', branch: 'training', label: 'Training pitches', tc: 0.9, desc: 'Better daily training: every player develops faster.', names: ['Grass pitches', 'Floodlit pitches', 'Full-size 3G pitch', 'Training complex', 'Elite training campus'], per: { dev: 0.025 } },
  { key: 'gym', branch: 'training', label: 'Gym & conditioning', tc: 0.7, desc: 'Stronger, fitter players: faster development and fewer knocks.', names: ['Weights room', 'Gym', 'Conditioning centre', 'Sports science unit', 'Performance gym'], per: { dev: 0.012, injury: -0.03 } },
  { key: 'medical', branch: 'training', label: 'Medical centre', tc: 0.7, desc: 'Fewer and shorter injuries.', names: ['Physio room', 'Treatment rooms', 'Rehab pool', 'Medical centre', 'Elite recovery clinic'], per: { injury: -0.07 } },
  { key: 'analysis', branch: 'training', label: 'Analysis suite', tc: 0.8, desc: 'Players aged 21 to 26 develop much faster.', names: ['Video room', 'Analysis suite', 'Data team', 'Tracking system', 'Biomechanics lab'], per: { devPrime: 0.08 } },
  { key: 'lab', branch: 'training', label: 'Skills lab', tc: 0.9, desc: 'Makes training items: teach a position, boost a stat, improve personality.', names: ['Skills room', 'Positional coaching', 'Individual coaching', 'Mind coaching', 'Elite skills lab'], per: { lab: 1 } },
  // ---- academy
  { key: 'youthPitch', branch: 'academy', label: 'Youth pitches', tc: 0.6, desc: 'More players in every intake.', names: ['Youth pitch', 'Second youth pitch', 'Floodlit youth pitches', 'Youth stadium', 'Academy complex'], per: { youthCount: 0.5 } },
  { key: 'network', branch: 'academy', label: 'Youth scouting', tc: 0.7, desc: 'Better prospects in every intake.', names: ['Local scouts', 'Regional network', 'National network', 'Partner schools', 'International network'], per: { youthQuality: 1.2 } },
  { key: 'coaching', branch: 'academy', label: 'Youth coaching', tc: 0.8, desc: 'Academy players develop faster and arrive better.', names: ['Coaching room', 'Coaching centre', 'Full-time coaches', 'Development centre', 'Elite programme'], per: { youthDev: 0.06, youthQuality: 0.6 } },
  { key: 'dorms', branch: 'academy', label: 'Dorms & school', tc: 0.7, desc: 'Talent from further away: bigger and better intakes.', names: ['Host families', 'Dorms', 'School partnership', 'Boarding house', 'Sports school'], per: { youthCount: 0.4, youthQuality: 0.5 } },
  { key: 'pathway', branch: 'academy', label: 'First-team pathway', tc: 0.7, desc: 'Graduates join the first team stronger.', names: ['Reserve team', 'Under-21 squad', 'B team', 'Loan partner club', 'First-team pathway'], per: { grad: 1 } },
  // ---- commercial
  { key: 'shop', branch: 'commercial', label: 'Club shop', tc: 0.5, desc: 'Sell shirts and scarves: much more merchandise money.', names: ['Club shop', 'Online store', 'Megastore', 'Shops in town', 'Global store'], per: { merch: 0.3 } },
  { key: 'catering', branch: 'commercial', label: 'Matchday catering', tc: 0.7, desc: 'Fans spend money on match days.', names: ['Tea hut', 'Food stands', 'Clubhouse bar', 'Fan zone', 'Matchday village'], per: { matchday: 0.08 } },
  { key: 'partners', branch: 'commercial', label: 'Sponsorship office', tc: 0.6, desc: 'Every sponsor deal pays more, and levels 2, 4 and 5 each open a new sponsor slot (3 up to 6).', names: ['Sponsorship desk', 'Commercial office', 'Partnership team', 'Global partners', 'Brand agency'], per: { sponsor: 0.07 } },
  { key: 'events', branch: 'commercial', label: 'Conference & events', tc: 0.6, desc: 'Rent the ground out all week.', names: ['Function room', 'Conference centre', 'Events team', 'Club hotel', 'Concert venue'], per: { rentals: 0.12 } },
  { key: 'media', branch: 'commercial', label: 'Media & brand', tc: 0.5, desc: 'A bigger fan base: merchandise, crowds and sponsors.', names: ['Club website', 'Social media team', 'Club TV', 'Media centre', 'Global media'], per: { merch: 0.1, comfort: 0.02, sponsor: 0.02 } },
];
export const trackOf = (key: string) => TRACKS.find((t) => t.key === key);

/** Share of a season's division income that each level costs, and its build time in weeks. */
const COST_K = [0.08, 0.16, 0.3, 0.5, 0.8];
const WEEKS = [3, 5, 8, 12, 18];
const UPKEEP_RATE = 0.0015; // per week, of the build cost

/** What a typical club of this division earns in a season (gate, TV, sponsor, merchandise). */
export function divisionIncome(div: number): number {
  const e = ECONOMY[clamp(div, 1, 10)];
  return e.attendance * e.ticket * 19 + e.tv + e.sponsor + e.merch;
}

export interface Upgrade {
  id: string; // `${track}.${level}`
  branch: Branch;
  track: string;
  level: number;
  name: string;
  desc: string;
  cost: number;
  weeks: number;
  upkeep: number; // per week
  eff: FacEffect;
}

export function upgradeFor(t: Track, level: number, div: number): Upgrade {
  const cost = roundMoney(divisionIncome(div) * COST_K[level - 1] * t.tc);
  return {
    id: `${t.key}.${level}`,
    branch: t.branch,
    track: t.key,
    level,
    name: t.names[level - 1],
    desc: t.desc,
    cost,
    weeks: Math.round(WEEKS[level - 1] * (t.slow ?? 1)),
    upkeep: Math.max(1, Math.round(cost * UPKEEP_RATE)),
    eff: t.per,
  };
}

export interface FacilitiesState {
  v?: number;
  levels: Record<Branch, number>; // derived main-branch level 1..10
  tracks: Record<string, number>; // 0..5
  built: string[];
  projects: { id: string; weeksLeft: number; cost?: number; upkeep?: number }[];
  upkeep: number; // weekly, sum of finished upgrades
}

function branchLevel(f: FacilitiesState, b: Branch): number {
  const sum = TRACKS.filter((t) => t.branch === b).reduce((a, t) => a + (f.tracks[t.key] ?? 0), 0);
  return 1 + Math.floor((sum * 9) / 25);
}

function relevel(f: FacilitiesState) {
  for (const b of BRANCHES) f.levels[b.key] = branchLevel(f, b.key);
}

/** Cost of a project under the original ten-level scheme (only for refunds when an old save is converted). */
function legacyCost(id: string): number {
  const m = /^(stadium|training|academy|commercial)-(\d+)-/.exec(id);
  if (!m) return 0;
  const base = { stadium: 10000, training: 10000, academy: 8000, commercial: 8000 }[m[1] as Branch];
  return roundMoney(base * Math.pow(3.1, Number(m[2]) - 2) * (id.includes('seated') ? 1.4 : 1));
}

/** Converts a save from the ten-level branches: each branch level becomes track levels, running projects are refunded. */
function migrate(s: GameState, old: { levels: Record<Branch, number>; built: string[]; projects: { id: string }[] }): FacilitiesState {
  const f: FacilitiesState = { v: 2, levels: { stadium: 1, training: 1, academy: 1, commercial: 1 }, tracks: {}, built: [], projects: [], upkeep: 0 };
  const div = s.clubs[s.userClubId]?.div ?? 9;
  for (const b of BRANCHES) {
    const ts = TRACKS.filter((t) => t.branch === b.key);
    let n = Math.round((((old.levels?.[b.key] ?? 1) - 1) * 25) / 9);
    for (let i = 0; n > 0; i = (i + 1) % ts.length) {
      const t = ts[i];
      if ((f.tracks[t.key] ?? 0) >= MAX_TRACK) continue;
      const lvl = (f.tracks[t.key] = (f.tracks[t.key] ?? 0) + 1);
      f.built.push(`${t.key}.${lvl}`);
      f.upkeep += upgradeFor(t, lvl, div).upkeep;
      n--;
    }
  }
  relevel(f);
  const refund = (old.projects ?? []).reduce((a, p) => a + legacyCost(p.id), 0);
  if (refund > 0 && s.clubs[s.userClubId]) txn(s, 'build', refund);
  const board = s.ext.board as { builtAtStart?: number } | undefined;
  if (board) board.builtAtStart = Math.max(0, f.built.length - Math.max(0, (old.built?.length ?? 0) - (board.builtAtStart ?? 0)));
  if (s.clubs[s.userClubId]) {
    addMessage(s, {
      cat: 'Club',
      title: 'Facilities have been reorganised',
      body: `Each branch now has five sub-facilities you can upgrade on their own. Your existing buildings carried over.${refund > 0 ? ` Building work in progress was refunded (${refund.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}).` : ''}`,
    });
  }
  return f;
}

export function facState(s: GameState): FacilitiesState {
  let f = s.ext.fac as FacilitiesState | undefined;
  if (!f) {
    f = { v: 2, levels: { stadium: 1, training: 1, academy: 1, commercial: 1 }, tracks: {}, built: [], projects: [], upkeep: 0 };
    s.ext.fac = f;
  } else if (f.v !== 2) {
    f = migrate(s, f as never);
    s.ext.fac = f;
    syncFacilities(s);
  }
  return f;
}

export const trackLevel = (s: GameState, key: string) => facState(s).tracks[key] ?? 0;

export function upgradeById(s: GameState, id: string): Upgrade | undefined {
  const [key, l] = id.split('.');
  const t = trackOf(key);
  return t ? upgradeFor(t, Number(l), s.clubs[s.userClubId].div) : undefined;
}

/** The next level of a track at today's prices, or null when it is maxed out. */
export function nextUpgrade(s: GameState, key: string): Upgrade | null {
  const t = trackOf(key);
  const lvl = trackLevel(s, key);
  return t && lvl < MAX_TRACK ? upgradeFor(t, lvl + 1, s.clubs[s.userClubId].div) : null;
}

export function building(s: GameState, key: string) {
  const p = facState(s).projects.find((x) => x.id.split('.')[0] === key);
  return p ? { ...p, up: upgradeById(s, p.id)! } : null;
}

/** Sum of the effects of every finished level. */
export function effects(s: GameState): Required<FacEffect> {
  const tot: Required<FacEffect> = { capacityPct: 0, comfort: 0, ticketMax: 0, homeMorale: 0, merch: 0, matchday: 0, rentals: 0, sponsor: 0, injury: 0, dev: 0, devPrime: 0, youthDev: 0, youthCount: 0, youthQuality: 0, grad: 0, lab: 0 };
  const f = facState(s);
  for (const t of TRACKS) {
    const lvl = f.tracks[t.key] ?? 0;
    if (!lvl) continue;
    for (const [k, v] of Object.entries(t.per)) tot[k as keyof FacEffect] += (v as number) * lvl;
  }
  return tot;
}

export function facilityUpkeep(s: GameState): number {
  return Math.round(facState(s).upkeep);
}

/** Copy derived values into s.ext so finance/staff/stadium read them without importing this module. */
export function syncFacilities(s: GameState) {
  const f = facState(s);
  const e = effects(s);
  const c = s.clubs[s.userClubId];
  s.ext.facilities = { ...f.levels };
  s.ext.comfort = 1 + e.comfort;
  s.ext.merchMult = 1 + e.merch + (f.levels.commercial - 1) * 0.04;
  s.ext.sponsorMult = 1 + e.sponsor;
  s.ext.upkeep = Math.round((s.ext.baseUpkeep as number | undefined ?? c.capacity * 0.03) + facilityUpkeep(s));
  s.ext.ticketMax = e.ticketMax;
  s.ext.homeMorale = Math.round(e.homeMorale);
  s.ext.stadiumLevel = clamp(f.levels.stadium + 1, 1, 11);
}

/** Price after any board discount. */
export function costOf(s: GameState, u: Upgrade): number {
  const d = (s.ext.facDiscount as number | undefined) ?? 0;
  return Math.round(u.cost * (1 - d));
}

export function canStart(s: GameState, u: Upgrade): string | null {
  if (trackLevel(s, u.track) + 1 !== u.level) return 'Not the next level.';
  if (building(s, u.track)) return 'Already being built.';
  if (s.clubs[s.userClubId].cash < costOf(s, u)) return 'Not enough cash.';
  return null;
}

export function startUpgrade(s: GameState, id: string): string | null {
  const u = upgradeById(s, id);
  if (!u) return 'Unknown upgrade.';
  const err = canStart(s, u);
  if (err) return err;
  const cost = costOf(s, u);
  txn(s, 'build', -cost);
  s.ext.facDiscount = 0;
  facState(s).projects.push({ id, weeksLeft: u.weeks, cost, upkeep: u.upkeep });
  return null;
}

function finish(s: GameState, u: Upgrade, upkeep: number) {
  const f = facState(s);
  f.built.push(u.id);
  f.tracks[u.track] = u.level;
  f.upkeep += upkeep;
  relevel(f);
  const c = s.clubs[s.userClubId];
  let extra = '';
  if (u.eff.capacityPct) {
    const add = Math.round((c.capacity * u.eff.capacityPct) / 50) * 50 || 50;
    c.capacity += add;
    extra = ` ${add.toLocaleString()} new seats: capacity ${c.capacity.toLocaleString()}.`;
  }
  syncFacilities(s);
  const t = trackOf(u.track)!;
  addMessage(s, { cat: 'Club', title: `${u.name} finished`, body: `${t.label} is now level ${u.level} of ${MAX_TRACK}. ${effectText(t.per)}.${extra}` });
}

/** Short reward text for one level (also used by the UI). */
export function effectText(e: FacEffect, times = 1): string {
  const pct = (v: number) => `${Math.round(v * times * 100)}%`;
  const parts: string[] = [];
  if (e.capacityPct) parts.push(`+${pct(e.capacityPct)} seats`);
  if (e.comfort) parts.push(`+${pct(e.comfort)} attendance`);
  if (e.ticketMax) parts.push(`+${pct(e.ticketMax)} ticket price ceiling`);
  if (e.matchday) parts.push(`fans spend ${pct(e.matchday)} of the ticket price on top`);
  if (e.homeMorale) parts.push('louder home crowd');
  if (e.merch) parts.push(`+${pct(e.merch)} merchandise`);
  if (e.sponsor) parts.push(`+${pct(e.sponsor)} sponsor money`);
  if (e.rentals) parts.push(`rentals worth ${pct(e.rentals)} of a division sponsor deal a year`);
  if (e.injury) parts.push(`${pct(-e.injury)} fewer injury weeks`);
  if (e.dev) parts.push(`+${pct(e.dev)} development`);
  if (e.devPrime) parts.push(`+${pct(e.devPrime)} development (ages 21-26)`);
  if (e.youthDev) parts.push(`+${pct(e.youthDev)} academy development`);
  if (e.youthCount) parts.push(`+${Math.round(e.youthCount * times * 10) / 10} intake size`);
  if (e.youthQuality) parts.push(`+${Math.round(e.youthQuality * times * 10) / 10} prospect quality`);
  if (e.grad) parts.push(`graduates join +${Math.round(e.grad * times)} OVR and POT`);
  if (e.lab) parts.push(times > 1 ? `skills lab level ${times}` : 'more and stronger training items');
  return parts.join(', ');
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
        const u = upgradeById(s, p.id);
        if (u) {
          finish(s, u, p.upkeep ?? u.upkeep);
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
  if (c.div <= 5 && trackLevel(s, 'stands') < 2) return 'Grounds in the top five divisions need a covered stand. Build Seats & stands to level 2 to meet ground grading.';
  return null;
}
