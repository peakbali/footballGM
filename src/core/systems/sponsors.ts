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

let nextId = 1;
function newId(s: GameState) {
  nextId = Math.max(nextId, ...s.sponsors.map((d) => d.id + 1), 1);
  return nextId++;
}

export function makeOffers(s: GameState, rng: Rng, half: boolean): SponsorDeal[] {
  const c = s.clubs[s.userClubId];
  const lvl = staffLevel(s, 'commercial') || 5;
  const base = ECONOMY[c.div].sponsor * (0.8 + lvl / 160) * (0.7 + c.rep / 150) * (half ? 0.35 : 1);
  const n = Math.min(4, 2 + (lvl >= 40 ? 1 : 0) + (lvl >= 70 ? 1 : 0));
  const shapes: SponsorDeal['shape'][] = half ? ['safe', 'performance'] : ['safe', 'performance', 'long_term', 'performance'];
  const names = rng.shuffle([...SPONSOR_NAMES]);
  const out: SponsorDeal[] = [];
  for (let i = 0; i < n; i++) {
    const shape = shapes[i % shapes.length];
    const jitter = rng.range(0.9, 1.15);
    const d: SponsorDeal = {
      id: newId(s), name: names[i], shape, startSeason: s.season, endSeason: s.season, status: 'offered', half,
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

export function offerSponsors(s: GameState, rng: Rng, half: boolean) {
  const offers = makeOffers(s, rng, half);
  s.sponsors.push(...offers);
  addMessage(s, {
    cat: 'Finance',
    title: half ? 'Half-season sponsor offers' : 'Choose your shirt sponsor',
    body: half ? 'A secondary sponsor wants in for the rest of the season. Pick one or decline.' : 'Your commercial manager has brought offers for this season. Pick one.',
    action: { kind: 'sponsor_choice', data: offers.map((o) => o.id) },
  });
}

export function acceptSponsor(s: GameState, msgId: number, dealId: number | null) {
  const m = s.inbox.find((x) => x.id === msgId);
  if (!m || !m.action) return;
  const ids = m.action.data as number[];
  for (const d of s.sponsors) {
    if (!ids.includes(d.id)) continue;
    d.status = d.id === dealId ? 'active' : 'declined';
  }
  m.resolved = true;
  m.read = true;
}

function weeksOfDeal(d: SponsorDeal) {
  return d.half ? 26 : 52;
}

registerSystem({
  name: 'sponsors',
  init(s, rng) {
    offerSponsors(s, rng, false);
  },
  weekly(s, rng, _idx, res) {
    for (const d of s.sponsors) {
      if (d.status !== 'active') continue;
      txn(s, 'sponsor', d.base / weeksOfDeal(d));
    }
    const uf = res.userFixture;
    if (uf && uf.hg != null) {
      const won = (uf.home === s.userClubId && uf.hg > uf.ag!) || (uf.away === s.userClubId && uf.ag! > uf.hg);
      if (won) for (const d of s.sponsors) if (d.status === 'active' && d.perWin) txn(s, 'sponsor', d.perWin);
    }
    if (s.week === 27) offerSponsors(s, rng, true);
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
    const longTerm = s.sponsors.some((d) => d.status === 'active' && !d.half && d.endSeason >= s.season);
    if (!longTerm) offerSponsors(s, rng, false);
    else addMessage(s, { cat: 'Finance', title: 'Sponsor deal continues', body: 'Your long-term shirt sponsor stays on this season.' });
  },
});
