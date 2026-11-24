import { ECONOMY } from '../data/economy';
import { SPONSOR_NAMES } from '../data/names';
import { addMessage } from '../season';
import type { Rng } from '../rng';
import type { GameState } from '../state';
import { registerSystem } from '../systems';
import type { SponsorDeal } from '../types';
import { txn } from './finance';
import { staffLevel } from './staff';
import { roundMoney } from '../data/economy';
import { trackLevel } from './facilities';

let nextId = 1;
function newId(s: GameState) {
  nextId = Math.max(nextId, ...s.sponsors.map((d) => d.id + 1), 1);
  return nextId++;
}

/**
 * Sponsor slots (DESIGN 13.2j): several sponsors at once. Three slots to start, up to six with the
 * Sponsorship office (Commercial). Each slot pays its own share of the division's sponsor money.
 */
export const SLOTS: { key: string; label: string; share: number }[] = [
  { key: 'shirt', label: 'Shirt sponsor', share: 0.7 },
  { key: 'sleeve', label: 'Sleeve sponsor', share: 0.35 },
  { key: 'training', label: 'Training kit', share: 0.3 },
  { key: 'stadium', label: 'Stadium naming', share: 0.35 },
  { key: 'partner', label: 'Official partner', share: 0.2 },
  { key: 'digital', label: 'Digital partner', share: 0.15 },
];
export const slotLabel = (key?: string) => SLOTS.find((x) => x.key === key)?.label ?? 'Sponsor';

/** Number of sponsor slots: 3, plus one at Sponsorship office levels 2, 4 and 5. */
export function sponsorSlots(s: GameState): number {
  const lvl = trackLevel(s, 'partners');
  return 3 + (lvl >= 2 ? 1 : 0) + (lvl >= 4 ? 1 : 0) + (lvl >= 5 ? 1 : 0);
}

/** Old saves: deals without a slot become the shirt (season deals) or sleeve (half-season deals). */
export function migrateSponsors(s: GameState) {
  if (!s.sponsors.some((d) => !d.slot)) return;
  const taken = new Set(s.sponsors.filter((d) => d.status === 'active' && d.slot).map((d) => d.slot));
  for (const d of s.sponsors) {
    if (d.slot) continue;
    const want = d.half ? 'sleeve' : 'shirt';
    if (d.status === 'active') {
      d.slot = taken.has(want) ? SLOTS.find((x) => !taken.has(x.key))?.key ?? want : want;
      taken.add(d.slot);
    } else d.slot = want;
  }
}

const activeIn = (s: GameState, slot: string) => s.sponsors.find((d) => d.status === 'active' && d.slot === slot && d.endSeason >= s.season);

export function emptySlots(s: GameState): string[] {
  migrateSponsors(s);
  return SLOTS.slice(0, sponsorSlots(s)).map((x) => x.key).filter((k) => !activeIn(s, k));
}

export function makeOffers(s: GameState, rng: Rng, slot: string, names = rng.shuffle(SPONSOR_NAMES.filter((x) => !s.sponsors.some((d) => d.status === 'active' && d.name === x)))): SponsorDeal[] {
  const c = s.clubs[s.userClubId];
  const lvl = staffLevel(s, 'commercial') || 5;
  const share = SLOTS.find((x) => x.key === slot)?.share ?? 0.3;
  const late = s.week > 26 && s.week < 49;
  const base = ECONOMY[c.div].sponsor * share * (0.8 + lvl / 160) * (0.7 + c.rep / 150);
  const n = Math.min(3, 2 + (lvl >= 50 ? 1 : 0));
  const shapes: SponsorDeal['shape'][] = late ? ['safe', 'performance', 'safe'] : ['safe', 'performance', 'long_term'];
  const out: SponsorDeal[] = [];
  for (let i = 0; i < n; i++) {
    const shape = shapes[i % shapes.length];
    const jitter = rng.range(0.9, 1.15);
    const d: SponsorDeal = {
      id: newId(s), name: names.shift() ?? SPONSOR_NAMES[i], shape, startSeason: s.season, endSeason: s.season, status: 'offered', slot,
      base: roundMoney(base * jitter * (shape === 'safe' ? 1 : shape === 'performance' ? 0.6 : 0.9)),
    };
    if (shape === 'performance') {
      d.perWin = roundMoney((base * 0.6) / 19);
      d.promoBonus = roundMoney(base * 0.5);
    }
    if (shape === 'long_term') d.endSeason = s.season + 2;
    out.push(d);
  }
  return out;
}

/** One inbox message with offers for every empty slot. */
export function offerSponsors(s: GameState, rng: Rng) {
  const slots = emptySlots(s);
  if (!slots.length) return;
  if (s.inbox.some((m) => m.action?.kind === 'sponsor_choice' && !m.resolved)) return;
  const names = rng.shuffle(SPONSOR_NAMES.filter((x) => !s.sponsors.some((d) => d.status === 'active' && d.name === x)));
  const offers = slots.flatMap((k) => makeOffers(s, rng, k, names));
  s.sponsors.push(...offers);
  addMessage(s, {
    cat: 'Finance',
    title: slots.length === 1 ? `Offers for your ${slotLabel(slots[0]).toLowerCase()}` : `Sponsor offers for ${slots.length} slots`,
    body: `Your commercial manager has offers for: ${slots.map((k) => slotLabel(k).toLowerCase()).join(', ')}. Pick one per slot. Deals pay weekly until they end.`,
    action: { kind: 'sponsor_choice', data: offers.map((o) => o.id) },
  });
  s.ext.sponsorAsked = s.season * 52 + s.week;
}

/** Sign one offer (dealId) or skip its slot (dealId null with a slot), or decline everything left (both null). */
export function acceptSponsor(s: GameState, msgId: number, dealId: number | null, skipSlot?: string) {
  const m = s.inbox.find((x) => x.id === msgId);
  if (!m || !m.action) return;
  migrateSponsors(s);
  const ids = m.action.data as number[];
  const mine = s.sponsors.filter((d) => ids.includes(d.id));
  const pick = mine.find((d) => d.id === dealId);
  const slot = pick?.slot ?? skipSlot;
  for (const d of mine) {
    if (d.status !== 'offered') continue;
    if (slot == null) d.status = 'declined';
    else if (d.slot === slot) d.status = d.id === dealId ? 'active' : 'declined';
  }
  if (!mine.some((d) => d.status === 'offered')) {
    m.resolved = true;
    m.read = true;
  }
}

function weeksOfDeal(d: SponsorDeal) {
  return d.half ? 26 : 52;
}

registerSystem({
  name: 'sponsors',
  init(s, rng) {
    offerSponsors(s, rng);
  },
  weekly(s, rng, _idx, res) {
    for (const d of s.sponsors) {
      if (d.status !== 'active') continue;
      txn(s, 'sponsor', (d.base / weeksOfDeal(d)) * ((s.ext.sponsorMult as number | undefined) ?? 1));
    }
    const uf = res.userFixture;
    if (uf && uf.hg != null) {
      const won = (uf.home === s.userClubId && uf.hg > uf.ag!) || (uf.away === s.userClubId && uf.ag! > uf.hg);
      if (won) for (const d of s.sponsors) if (d.status === 'active' && d.perWin) txn(s, 'sponsor', d.perWin);
    }
    // new offers at the start of the season, in January, and whenever a new slot opens
    const n = sponsorSlots(s);
    const opened = n > ((s.ext.sponsorSlotCount as number | undefined) ?? n);
    s.ext.sponsorSlotCount = n;
    if (s.week === 1 || s.week === 27 || opened) offerSponsors(s, rng);
  },
  seasonEnd(s) {
    const rec = s.history.find((h) => h.season === s.season && h.clubId === s.userClubId);
    const promoted = rec && (rec.outcome === 'champion' || rec.outcome === 'promoted' || rec.outcome === 'playoff_winner') && rec.div > 1;
    for (const d of s.sponsors) if (d.status === 'active' && promoted && d.promoBonus) txn(s, 'sponsor', d.promoBonus);
  },
  rollover(s, rng) {
    for (const d of s.sponsors) {
      if (d.status === 'active' && d.endSeason < s.season) d.status = 'expired';
      if (d.status === 'offered') d.status = 'declined';
    }
    s.sponsors = s.sponsors.filter((d) => d.status === 'active' || d.startSeason >= s.season - 3);
    // offers for the empty slots arrive in week 1 (weekly)
    for (const m of s.inbox) if (m.action?.kind === 'sponsor_choice' && !m.resolved) { m.resolved = true; m.read = true; }
  },
});
