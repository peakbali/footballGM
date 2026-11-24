import { NAMES } from '../data/names';
import { ECONOMY } from '../data/economy';
import { clamp, type Rng } from '../rng';
import type { GameState } from '../state';
import { registerSystem } from '../systems';
import type { Staff, StaffRole } from '../types';

export const STAFF_ROLES: { role: StaffRole; label: string; facility: 'training' | 'academy' | 'commercial' | 'stadium'; desc: string }[] = [
  { role: 'scout', label: 'Scout', facility: 'academy', desc: 'Finds players. Level sets coverage and accuracy.' },
  { role: 'coach_att', label: 'Attacking coach', facility: 'training', desc: 'Develops forwards and attacking midfielders.' },
  { role: 'coach_mid', label: 'Midfield coach', facility: 'training', desc: 'Develops midfielders.' },
  { role: 'coach_def', label: 'Defensive coach', facility: 'training', desc: 'Develops defenders.' },
  { role: 'coach_gk', label: 'Goalkeeping coach', facility: 'training', desc: 'Develops goalkeepers.' },
  { role: 'physio', label: 'Physio', facility: 'training', desc: 'Shorter injuries (with the doctor).' },
  { role: 'doctor', label: 'Doctor', facility: 'training', desc: 'Shorter major injuries, fewer injuries.' },
  { role: 'youth_coach', label: 'Youth coach', facility: 'academy', desc: 'Better academy intakes and youth development.' },
  { role: 'commercial', label: 'Commercial manager', facility: 'commercial', desc: 'Better sponsor offers and merchandise income.' },
];

export function roleLabel(r: StaffRole) {
  return STAFF_ROLES.find((x) => x.role === r)!.label;
}

/** Weekly wage for a staff member of this level at a club in division `div`. */
export function staffWage(level: number, div: number): number {
  const base = ECONOMY[Math.min(10, Math.max(1, div))].wage;
  return Math.round(clamp(base * 0.35 * Math.exp((level - 30) / 22), 3, 80000));
}

export function makeStaff(s: GameState, rng: Rng, role: StaffRole, level: number, div: number): Staff {
  const pool = NAMES.ENG;
  return {
    id: s.nextStaffId++,
    first: rng.pick(pool.first),
    last: rng.pick(pool.last),
    age: rng.int(28, 64),
    role,
    level: clamp(Math.round(level), 1, 100),
    wage: staffWage(level, div),
    endSeason: s.season + rng.int(1, 3),
  };
}

/** Max number of scouts the club can employ. */
export function maxScouts(s: GameState): number {
  return 1 + Math.floor(((s.ext.facilities as Record<string, number> | undefined)?.academy ?? 1) / 2);
}

/** Effective level of a role (best holder, capped by facilities). */
export function staffLevel(s: GameState, role: StaffRole): number {
  const list = s.staff.filter((x) => x.role === role);
  if (!list.length) return 0;
  const cap = staffCap(s, role);
  return Math.min(cap, Math.max(...list.map((x) => x.level)));
}

export function staffCap(s: GameState, role: StaffRole): number {
  const fac = (s.ext.facilities as Record<string, number> | undefined) ?? {};
  const branch = STAFF_ROLES.find((x) => x.role === role)!.facility;
  return (fac[branch] ?? 1) * 10 + 10;
}

export function refreshStaffPool(s: GameState, rng: Rng) {
  const div = s.clubs[s.userClubId].div;
  s.staffPool = [];
  for (const r of STAFF_ROLES) {
    const n = rng.int(2, 3);
    for (let i = 0; i < n; i++) {
      const lvl = clamp(rng.normal(55 - div * 4, 14), 3, 95);
      s.staffPool.push(makeStaff(s, rng, r.role, lvl, div));
    }
  }
}

registerSystem({
  name: 'staff',
  init(s, rng) {
    for (const r of STAFF_ROLES) s.staff.push(makeStaff(s, rng, r.role, rng.int(5, 15), 9));
    refreshStaffPool(s, rng);
  },
  weekly(s, rng) {
    if (s.week % 4 === 1) refreshStaffPool(s, rng);
  },
  rollover(s) {
    const gone = s.staff.filter((x) => x.endSeason < s.season);
    s.staff = s.staff.filter((x) => x.endSeason >= s.season);
    for (const g of gone) {
      s.inbox.push({ id: s.nextMsgId++, season: s.season, week: s.week, read: false, cat: 'Staff', title: `${g.first} ${g.last} has left`, body: `Your ${roleLabel(g.role).toLowerCase()}'s contract ran out. Hire a replacement from the Club tab.` });
    }
  },
});
