import { playerValue, roundMoney } from '../data/economy';
import { DIV_AVG_OVR } from '../data/pyramid';
import { addMessage, addNews } from '../season';
import { clamp, type Rng } from '../rng';
import { buildSquadIndex, CAL, invalidateSquads, isWindowOpen, squadOf, type GameState } from '../state';
import { registerSystem } from '../systems';
import type { Contract, OfferType, Player, TransferOffer } from '../types';
import { txn } from './finance';
import { applyContract, counts, seniorCount, SQUAD_MAX, type ContractOffer } from './contracts';
import { dirtyPlayers } from './dirty';

export function playerAge(s: GameState, p: Player) {
  return s.season - p.birthYear;
}

/** Rank of the player inside his club (0 = best). */
export function clubRank(s: GameState, p: Player): number {
  if (p.clubId == null) return 99;
  return squadOf(s, p.clubId).filter((q) => q.ovr > p.ovr && !q.academy).length;
}

/** Fee the selling AI club wants. */
export function askingPrice(s: GameState, p: Player): number {
  if (p.clubId == null) return 0;
  const seller = s.clubs[p.clubId];
  const rank = clubRank(s, p);
  const age = playerAge(s, p);
  let mult = seller.ai === 'seller' ? 1.0 : seller.ai === 'developer' ? (age <= 23 ? 1.4 : 1.05) : 1.35;
  mult *= rank < 3 ? 1.6 : rank < 11 ? 1.3 : rank < 16 ? 1.05 : 0.85;
  if (p.listed) mult *= 0.8;
  const w = isWindowOpen(s.week);
  if (w === 'summer' && s.week >= 6 && s.week <= CAL.summerWindowEnd) mult *= 1.1; // deadline premium
  const release = p.contract?.clauses.release;
  const ask = roundMoney(Math.max(500, p.value * mult));
  return release ? Math.min(ask, release) : ask;
}

export type Refusal = string | null;

/** Will the player consider joining the user's club at all? */
export function willingToJoin(s: GameState, p: Player, type: OfferType): Refusal {
  const user = s.clubs[s.userClubId];
  if (p.clubId === s.userClubId) return 'Already your player.';
  const fromDiv = p.clubId != null ? s.clubs[p.clubId].div : user.div;
  const rank = clubRank(s, p);
  if (type.startsWith('loan')) {
    if (fromDiv < user.div - 3) return `${p.last}'s club won't loan him that far down the pyramid.`;
    return null;
  }
  if (fromDiv < user.div - 1 && rank < 11) return `${p.last} is a regular at a bigger club and won't drop ${user.div - fromDiv} divisions.`;
  if (fromDiv < user.div - 2) return `${p.last} won't drop ${user.div - fromDiv} divisions.`;
  if (s.offers.some((o) => o.pid === p.id && o.status === 'accepted' && o.buyer !== s.userClubId)) return 'Another club has already agreed a fee.';
  const nat = naturalDiv(p.ovr);
  if (user.div > nat + 2 && s.season - p.birthYear < 33) return `${p.last} believes he belongs around division ${nat} and won't sign for a division ${user.div} club.`;
  return null;
}

/** Division whose typical starter matches this OVR. */
export function naturalDiv(ovr: number): number {
  let best = 10;
  let bd = Infinity;
  for (let d = 1; d <= 10; d++) {
    const diff = Math.abs(DIV_AVG_OVR[d] - ovr);
    if (diff < bd) { bd = diff; best = d; }
  }
  return best;
}

export function canTransferNow(s: GameState, type: OfferType): Refusal {
  if (type === 'free' || type.startsWith('loan')) return null;
  return isWindowOpen(s.week) ? null : 'The transfer window is closed. Permanent transfers open in summer (June to August) and January.';
}

export interface OfferInput {
  pid: number;
  type: OfferType;
  fee: number;
  sellOnPct?: number;
  wageSharePct?: number;
  optionFee?: number;
  loanLength?: 'half' | 'full';
}

/** Make a bid to an AI club. AI answers immediately (accept / counter / reject). */
export function submitBid(s: GameState, rng: Rng, input: OfferInput, round = 1): TransferOffer {
  const p = s.players.get(input.pid)!;
  const offer: TransferOffer = {
    id: s.nextOfferId++, pid: p.id, seller: p.clubId, buyer: s.userClubId, type: input.type, fee: input.fee,
    sellOnPct: input.sellOnPct, wageSharePct: input.wageSharePct, optionFee: input.optionFee, loanLength: input.loanLength,
    status: 'pending', round, week: s.week, season: s.season,
  };
  s.offers.push(offer);
  if (p.clubId == null) {
    offer.status = 'accepted';
    return offer;
  }
  const seller = s.clubs[p.clubId];
  const rank = clubRank(s, p);
  if (input.type === 'permanent') {
    let ask = askingPrice(s, p);
    // sell-on clause makes the fee worth less to the seller... and a request for one is worth more
    ask *= 1 - (input.sellOnPct ?? 0) / 200;
    if (input.fee >= ask) offer.status = 'accepted';
    else if (round < 3 && input.fee >= ask * 0.6) {
      offer.status = 'countered';
      offer.counterFee = roundMoney(ask * (round === 1 ? 1 : 0.95));
    } else offer.status = 'rejected';
  } else {
    // loans: club keeps important players; wants wage share and maybe a fee
    const important = rank < (seller.div <= s.clubs[s.userClubId].div ? 11 : 6);
    const share = input.wageSharePct ?? 100;
    const minShare = seller.ai === 'developer' ? 50 : 75;
    let ok = !important && share >= minShare;
    if (input.type !== 'loan') {
      const ask = askingPrice(s, p) * 1.05;
      const fee = input.optionFee ?? 0;
      if (fee < ask * (input.type === 'loan_obligation' ? 0.9 : 1)) {
        ok = false;
        if (round < 3 && fee >= ask * 0.6) {
          offer.status = 'countered';
          offer.counterFee = roundMoney(ask);
          return offer;
        }
      } else if (important && rank >= 3) ok = share >= minShare;
    }
    offer.status = ok ? 'accepted' : 'rejected';
  }
  return offer;
}

/** Finish a deal after personal terms are agreed. */
export function completeDeal(s: GameState, offer: TransferOffer, terms: ContractOffer): string | null {
  const p = s.players.get(offer.pid)!;
  const toUser = offer.buyer === s.userClubId;
  if (toUser && counts(s, p) && seniorCount(s) >= SQUAD_MAX) return `Your squad is full (${SQUAD_MAX} players over 18).`;
  const buyer = s.clubs[offer.buyer];
  if (toUser && offer.fee > 0 && buyer.cash < offer.fee) return 'Not enough cash for the fee.';
  const sellerId = p.clubId;
  if (offer.type === 'permanent' || offer.type === 'free') {
    payFee(s, p, offer.buyer, sellerId, offer.fee);
    p.clubId = offer.buyer;
    applyContract(s, p, offer.buyer, terms);
    if (offer.sellOnPct && sellerId != null) {
      p.contract!.clauses.sellOnPct = offer.sellOnPct;
      p.contract!.clauses.sellOnClub = sellerId;
    }
  } else {
    // loan
    const orig = p.contract ?? undefined;
    const endWeek = offer.loanLength === 'half' ? (s.week < 27 ? 27 : 52) : 52;
    const endSeason = s.week >= 47 ? s.season + 1 : s.season;
    if (offer.fee > 0) payFee(s, p, offer.buyer, sellerId, offer.fee);
    const c: Contract = {
      type: offer.type as Contract['type'],
      wage: orig?.wage ?? terms.wage,
      endSeason: orig?.endSeason ?? s.season,
      role: terms.role,
      parentClubId: sellerId ?? undefined,
      wageSharePct: offer.wageSharePct ?? 100,
      loanEndSeason: endSeason,
      loanEndWeek: endWeek,
      optionFee: offer.optionFee,
      obligationApps: offer.type === 'loan_obligation' ? 10 : undefined,
      clauses: {},
      signedSeason: s.season,
      orig,
    };
    p.contract = c;
    p.clubId = offer.buyer;
  }
  p.listed = false;
  p.loanListed = false;
  p.locked = false;
  p.joinedSeason = s.season;
  invalidateSquads();
  offer.status = 'completed';
  dirtyPlayers.add(p.id);
  s.transfers.push({ season: s.season, week: s.week, pid: p.id, name: `${p.first} ${p.last}`, from: sellerId, to: offer.buyer, fee: offer.fee, type: offer.type });
  const sellerName = sellerId != null ? s.clubs[sellerId].short : 'free agency';
  if (toUser || sellerId === s.userClubId) {
    addNews(s, `${buyer.short} sign ${p.first} ${p.last} from ${sellerName}${offer.type.startsWith('loan') ? ' on loan' : offer.fee ? ` for ${fmt(offer.fee)}` : ''}.`);
  }
  // withdraw other offers for this player
  for (const o of s.offers) if (o.pid === p.id && o.id !== offer.id && (o.status === 'pending' || o.status === 'accepted' || o.status === 'countered')) o.status = 'withdrawn';
  return null;
}

function fmt(v: number) {
  return v >= 1e6 ? `£${(v / 1e6).toFixed(1)}m` : v >= 1e3 ? `£${Math.round(v / 1e3)}k` : `£${v}`;
}

function payFee(s: GameState, p: Player, buyerId: number, sellerId: number | null, fee: number) {
  if (fee <= 0) return;
  const buyer = s.clubs[buyerId];
  if (buyer.user) txn(s, 'purchases', -fee);
  else buyer.cash -= fee;
  if (sellerId == null) return;
  // sell-on clause from the player's current contract
  const so = p.contract?.clauses.sellOnPct;
  const soClub = p.contract?.clauses.sellOnClub;
  let sellerGets = fee;
  if (so && soClub != null) {
    const cut = Math.round((fee * so) / 100);
    sellerGets -= cut;
    if (soClub === s.userClubId) {
      txn(s, 'sales', cut);
      addMessage(s, { cat: 'Finance', title: 'Sell-on payment', body: `You received ${fmt(cut)} from the sale of ${p.first} ${p.last}.` });
    } else s.clubs[soClub].cash += cut;
  }
  const seller = s.clubs[sellerId];
  if (seller.user) txn(s, 'sales', sellerGets);
  else seller.cash += sellerGets;
}

// ---------------- Selling (AI offers for the user's players)

export function aiBuyerFor(s: GameState, rng: Rng, p: Player, idx: Map<number, Player[]>, loan: boolean): number | null {
  const user = s.clubs[s.userClubId];
  const cands: number[] = [];
  for (const lg of s.leagues) {
    if (loan ? lg.div < user.div : lg.div > user.div + 1) continue;
    if (!loan && lg.div < user.div - 3) continue;
    for (const id of lg.clubIds) {
      if (id === s.userClubId) continue;
      const sq = idx.get(id) ?? [];
      const better = sq.filter((q) => q.ovr >= p.ovr && q.pos === p.pos).length;
      if (better <= (loan ? 1 : 0) && (loan || s.clubs[id].cash > p.value)) cands.push(id);
    }
  }
  return cands.length ? rng.pick(cands) : null;
}

/** An AI club's pending bid (or loan request) for one of the user's players, without any message. */
export function makeIncomingOffer(s: GameState, rng: Rng, p: Player, buyer: number, loan: boolean): TransferOffer {
  const offer: TransferOffer = {
    id: s.nextOfferId++, pid: p.id, seller: s.userClubId, buyer, type: loan ? 'loan' : 'permanent',
    fee: loan ? 0 : roundMoney(p.value * rng.range(0.75, 1.25) * (p.listed ? 0.9 : 1.3)),
    wageSharePct: loan ? rng.pick([50, 75, 100]) : undefined,
    loanLength: loan ? (s.week < 27 && s.week > 9 ? 'half' : 'full') : undefined,
    status: 'pending', round: 1, week: s.week, season: s.season,
  };
  s.offers.push(offer);
  return offer;
}

export function aiOfferFor(s: GameState, rng: Rng, p: Player, buyer: number, loan: boolean) {
  const offer = makeIncomingOffer(s, rng, p, buyer, loan);
  const b = s.clubs[buyer];
  addMessage(s, {
    cat: 'Transfers',
    title: loan ? `Loan offer for ${p.first} ${p.last}` : `${fmt(offer.fee)} bid for ${p.first} ${p.last}`,
    body: loan
      ? `${b.name} (division ${b.div}) want ${p.last} on a ${offer.loanLength} season loan and will pay ${offer.wageSharePct}% of his wage.`
      : `${b.name} (division ${b.div}) bid ${fmt(offer.fee)}. His value is ${fmt(p.value)}.`,
    action: { kind: 'offer_in', ref: offer.id },
  });
}

/** User accepts an incoming offer. */
export function acceptIncoming(s: GameState, offerId: number): string | null {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'pending') return 'This offer is no longer available.';
  const p = s.players.get(o.pid)!;
  if (o.type === 'permanent') {
    const age = s.season - p.birthYear;
    return completeDeal(s, o, { wage: p.contract?.wage ?? 100, years: age > 30 ? 1 : 3, clauses: {}, role: 'starter' });
  }
  return completeDeal(s, o, { wage: p.contract?.wage ?? 100, years: 1, clauses: {}, role: 'starter' });
}

export function rejectIncoming(s: GameState, offerId: number) {
  const o = s.offers.find((x) => x.id === offerId);
  if (o) o.status = 'rejected';
  const p = o && s.players.get(o.pid);
  if (p && !p.listed && o!.type === 'permanent') p.morale = clamp(p.morale - (p.personality < 40 ? 12 : 4), 0, 100);
}

/** Counter at a higher fee: AI accepts if still reasonable. */
export function counterIncoming(s: GameState, rng: Rng, offerId: number, fee: number): 'accepted' | 'rejected' {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o) return 'rejected';
  const p = s.players.get(o.pid)!;
  const limit = p.value * (p.listed ? 1.4 : 1.9);
  if (fee <= limit && rng.chance(fee <= o.fee * 1.2 ? 0.85 : 0.5)) {
    o.fee = fee;
    return 'accepted';
  }
  o.status = 'rejected';
  return 'rejected';
}

// ---------------- Loans returning / options

function endLoan(s: GameState, p: Player) {
  invalidateSquads();
  const c = p.contract!;
  p.clubId = c.parentClubId ?? null;
  p.contract = c.orig ?? null;
  if (p.contract) p.contract.role = 'rotation';
  dirtyPlayers.add(p.id);
}

function processLoans(s: GameState) {
  for (const p of [...s.players.values()]) {
    const c = p.contract;
    if (!c || !c.type.startsWith('loan') || c.loanEndWeek == null) continue;
    if (!(s.season === c.loanEndSeason && s.week === c.loanEndWeek) && !(s.season > (c.loanEndSeason ?? s.season))) continue;
    const borrower = p.clubId!;
    const userBorrower = borrower === s.userClubId;
    const userParent = c.parentClubId === s.userClubId;
    const name = `${p.first} ${p.last}`;
    if (c.type === 'loan_obligation' && p.stats.apps >= (c.obligationApps ?? 0)) {
      const fee = c.optionFee ?? 0;
      payFee(s, p, borrower, c.parentClubId ?? null, fee);
      p.contract = { ...(c.orig ?? c), type: 'permanent', parentClubId: undefined, orig: undefined, loanEndWeek: undefined, loanEndSeason: undefined, wageSharePct: undefined, endSeason: Math.max(c.orig?.endSeason ?? s.season, s.season + 2) };
      s.transfers.push({ season: s.season, week: s.week, pid: p.id, name, from: c.parentClubId ?? null, to: borrower, fee, type: 'permanent' });
      if (userBorrower || userParent) addMessage(s, { cat: 'Transfers', title: `${name}'s move is now permanent`, body: `The loan obligation triggered: ${fmt(fee)} paid.` });
      continue;
    }
    if (c.type === 'loan_option' && userBorrower) {
      addMessage(s, { cat: 'Transfers', title: `Option to buy ${name}`, body: `His loan has ended. Buy him for ${fmt(c.optionFee ?? 0)} or send him back.`, action: { kind: 'loan_option', ref: p.id } });
      continue;
    }
    if (c.type === 'loan_option' && !userBorrower) {
      const sq = squadOf(s, borrower);
      const good = sq.filter((q) => q.ovr > p.ovr).length < 14 && s.clubs[borrower].cash > (c.optionFee ?? 0);
      if (good) {
        payFee(s, p, borrower, c.parentClubId ?? null, c.optionFee ?? 0);
        p.contract = { ...(c.orig ?? c), type: 'permanent', parentClubId: undefined, orig: undefined, loanEndWeek: undefined, loanEndSeason: undefined, wageSharePct: undefined, endSeason: s.season + 2 };
        if (userParent) addMessage(s, { cat: 'Transfers', title: `${name} sold`, body: `${s.clubs[borrower].name} took up the ${fmt(c.optionFee ?? 0)} option.` });
        continue;
      }
    }
    endLoan(s, p);
    if (userBorrower || userParent) addMessage(s, { cat: 'Transfers', title: `${name}'s loan has ended`, body: userParent ? `He is back in your squad (${p.stats.apps} apps on loan).` : `He returns to ${s.clubs[p.clubId!]?.name ?? 'his club'}.` });
  }
}

export function exerciseOption(s: GameState, pid: number, buy: boolean, msgId: number): string | null {
  const p = s.players.get(pid);
  const m = s.inbox.find((x) => x.id === msgId);
  if (!p || !p.contract) return 'Player not found.';
  const c = p.contract;
  if (buy) {
    if (s.clubs[s.userClubId].cash < (c.optionFee ?? 0)) return 'Not enough cash.';
    payFee(s, p, s.userClubId, c.parentClubId ?? null, c.optionFee ?? 0);
    applyContract(s, p, s.userClubId, { wage: c.wage, years: 3, clauses: {}, role: c.role });
    s.transfers.push({ season: s.season, week: s.week, pid, name: `${p.first} ${p.last}`, from: c.parentClubId ?? null, to: s.userClubId, fee: c.optionFee ?? 0, type: 'permanent' });
  } else endLoan(s, p);
  if (m) m.resolved = m.read = true;
  return null;
}

registerSystem({
  name: 'transfers',
  weekly(s, rng, idx) {
    processLoans(s);
    // expire stale offers
    for (const o of s.offers) {
      if ((o.status === 'pending' || o.status === 'countered' || o.status === 'accepted') && (s.season > o.season || s.week - o.week > 3)) {
        o.status = 'withdrawn';
        const m = s.inbox.find((x) => x.action?.kind === 'offer_in' && x.action.ref === o.id && !x.resolved);
        if (m) m.resolved = true;
      }
    }
    if (s.offers.length > 300) s.offers = s.offers.filter((o) => s.season - o.season < 1 || o.status === 'pending');
    // AI offers for the user's players
    const window = isWindowOpen(s.week);
    const squad = squadOf(s, s.userClubId);
    const pending = new Set(s.offers.filter((o) => o.seller === s.userClubId && o.status === 'pending').map((o) => o.pid));
    let made = 0;
    for (const p of squad) {
      if (pending.has(p.id) || made >= 2 || p.contract?.type !== 'permanent') continue;
      if (window && (p.listed ? rng.chance(0.3) : p.ovr > (s.clubs[s.userClubId].strength + 6) && rng.chance(0.03))) {
        const b = aiBuyerFor(s, rng, p, idx, false);
        if (b != null) { aiOfferFor(s, rng, p, b, false); made++; }
      } else if (p.loanListed && rng.chance(0.25)) {
        const b = aiBuyerFor(s, rng, p, idx, true);
        if (b != null) { aiOfferFor(s, rng, p, b, true); made++; }
      }
    }
    if (s.week === CAL.summerWindowStart) addMessage(s, { cat: 'Transfers', title: 'Summer transfer window open', body: 'Permanent transfers are allowed until the end of August.' });
    if (s.week === CAL.summerWindowEnd) addMessage(s, { cat: 'Transfers', title: 'Deadline week', body: 'The summer window closes at the end of this week.' });
    if (s.week === CAL.winterWindow[0]) addMessage(s, { cat: 'Transfers', title: 'January window open', body: 'Permanent transfers are allowed for four weeks.' });
    void buildSquadIndex;
  },
});

export { playerValue };
