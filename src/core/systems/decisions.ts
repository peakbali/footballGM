import { ECONOMY, marketWage, playerValue, roundMoney } from '../data/economy';
import { DIV_AVG_OVR } from '../data/pyramid';
import type { Position } from '../data/positions';
import { generatePlayer } from '../generate';
import { clamp, hashSeed, Rng } from '../rng';
import { addMessage, injurePlayer } from '../season';
import { buildSquadIndex, CAL, invalidateSquads, isWindowOpen, squadOf, type GameState } from '../state';
import { registerSystem } from '../systems';
import type { InboxMessage, Player } from '../types';
import { boardState } from './board';
import { applyContract, contractAsk, type ContractOffer } from './contracts';
import { dirtyPlayers } from './dirty';
import { txn } from './finance';
import { academyCap } from './people';
import { acceptIncoming, aiBuyerFor, counterIncoming, makeIncomingOffer, rejectIncoming } from './transfers';

/**
 * Decision events: short popups with 2-3 choices and visible consequences (DESIGN 14).
 * A decision is stored as an inbox message whose action is { kind: 'decision', data: ctx }; the choices are
 * rebuilt from the type and ctx every time (functions are never saved), so saves stay plain JSON.
 */
export interface DecisionCtx {
  type: string;
  pid?: number;
  pid2?: number;
  club?: number;
  offerId?: number;
  amount?: number;
  amount2?: number;
  pos?: Position;
  /** free-form key (window_news: which window event) */
  key?: string;
}
export interface Chip {
  t: string;
  tone: 'good' | 'bad' | 'neutral';
}
export interface Choice {
  label: string;
  chips: Chip[];
  /** Why the choice cannot be taken right now (shown instead of the chips). */
  disabled?: string;
  apply(s: GameState, rng: Rng): string;
}
type Phase = 'pre' | 'window' | 'season';
interface DecisionDef {
  type: string;
  cat: InboxMessage['cat'];
  phases: Phase[];
  weight: number;
  from(s: GameState, c: DecisionCtx): InboxMessage['from'];
  make(s: GameState, rng: Rng): DecisionCtx | null;
  title(s: GameState, c: DecisionCtx): string;
  body(s: GameState, c: DecisionCtx): string;
  choices(s: GameState, c: DecisionCtx): Choice[];
}

const DEFS: DecisionDef[] = [];
export const decisionDef = (type: string) => DEFS.find((d) => d.type === type);

// ---------------- helpers

const fmt = (v: number) => (v >= 1e6 ? `£${(v / 1e6).toFixed(1)}m` : v >= 1e3 ? `£${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k` : `£${Math.round(v)}`);
const good = (t: string): Chip => ({ t, tone: 'good' });
const bad = (t: string): Chip => ({ t, tone: 'bad' });
const meh = (t: string): Chip => ({ t, tone: 'neutral' });
const eco = (s: GameState) => ECONOMY[s.clubs[s.userClubId].div];
const name = (p: Player) => `${p.first} ${p.last}`;
const firstTeam = (s: GameState) => squadOf(s, s.userClubId).filter((p) => !p.academy && !p.contract?.type.startsWith('loan'));
const byOvr = (a: Player, b: Player) => b.ovr - a.ovr;
const player = (s: GameState, id?: number) => (id != null ? s.players.get(id) : undefined);
const mood = (p: Player, d: number) => {
  p.morale = clamp(p.morale + d, 0, 100);
  dirtyPlayers.add(p.id);
};
const moodAll = (s: GameState, d: number) => firstTeam(s).forEach((p) => mood(p, d));
const approve = (s: GameState, d: number) => {
  const b = boardState(s);
  b.approval = clamp(b.approval + d, 0, 100);
};
const gone = (): Choice[] => [{ label: 'Close', chips: [meh('No longer relevant')], apply: () => 'Nothing came of it.' }];

function register(d: DecisionDef) {
  DEFS.push(d);
}

// ---------------- pre-season

register({
  type: 'pre_tour', cat: 'Club', phases: ['pre'], weight: 3,
  from: () => ({ kind: 'club' }),
  make: (s) => ({ type: 'pre_tour', amount: Math.max(300, roundMoney(eco(s).sponsor * 0.3)) }),
  title: () => 'Pre-season tour offer',
  body: (s, c) => `A tournament organiser invites the squad on a pre-season tour and will pay ${fmt(c.amount!)} in appearance money. It is a long trip with a few tired legs.`,
  choices: (s, c) => [
    {
      label: 'Take the tour', chips: [good(`+${fmt(c.amount!)}`), good('Morale +4'), bad('One player may pick up a knock')],
      apply: (s2, rng) => {
        txn(s2, 'other_in', c.amount!);
        moodAll(s2, 4);
        const p = rng.pick(firstTeam(s2));
        if (p && rng.chance(0.6)) { injurePlayer(rng, p, 0.5); dirtyPlayers.add(p.id); return `The tour pays ${fmt(c.amount!)} and the squad bonds, but ${p.last} picks up a knock (${p.injuryName ?? 'injury'}).`; }
        return `The tour pays ${fmt(c.amount!)} and the squad comes home closer.`;
      },
    },
    { label: 'Local friendlies only', chips: [good('Morale +1'), meh('No income')], apply: (s2) => { moodAll(s2, 1); return 'A quiet set of friendlies at home. Everyone is fresh.'; } },
    { label: 'Decline', chips: [meh('Nothing changes')], apply: () => 'You politely turn the organisers down.' },
  ],
});

register({
  type: 'pre_kit', cat: 'Finance', phases: ['pre'], weight: 2,
  from: () => ({ kind: 'sponsor' }),
  make: (s) => ({ type: 'pre_kit', amount: Math.max(300, roundMoney(eco(s).sponsor * 0.25)) }),
  title: () => 'Training kit sponsor',
  body: (s, c) => `A local firm will pay ${fmt(c.amount!)} to put its logo on the training kit and the team bus. Some supporters think it cheapens the club.`,
  choices: (s, c) => [
    { label: 'Take the money', chips: [good(`+${fmt(c.amount!)}`), bad('Board approval −2')], apply: (s2) => { txn(s2, 'sponsor', c.amount!); approve(s2, -2); return `${fmt(c.amount!)} lands in the account. A few fans grumble.`; } },
    { label: 'Keep the kit clean', chips: [good('Morale +1'), good('Board approval +1')], apply: (s2) => { moodAll(s2, 1); approve(s2, 1); return 'Supporters like that you said no.'; } },
  ],
});

register({
  type: 'star_talks', cat: 'Squad', phases: ['pre', 'season'], weight: 2,
  from: (s, c) => ({ kind: 'player', pid: c.pid }),
  make: (s) => {
    // at most once every 2 years: 2+ seasons after he signed, and 2+ seasons since he last asked (DESIGN 13.2m)
    const asked = ((s.ext.raiseAsked as Record<number, number> | undefined) ??= {});
    const p = firstTeam(s).filter((x) => x.contract && x.contract.type === 'permanent' && !x.academy).sort(byOvr)[0];
    if (!p || s.season - p.contract!.signedSeason < 2 || s.season - (asked[p.id] ?? -99) < 2) return null;
    asked[p.id] = s.season;
    return { type: 'star_talks', pid: p.id, amount: Math.max(1, Math.round(p.contract!.wage * 0.25)) };
  },
  title: (s, c) => `${player(s, c.pid)?.last ?? 'Your star'} wants to talk`,
  body: (s, c) => {
    const p = player(s, c.pid);
    return p ? `${name(p)}, your best player, knows what he is worth and asks for a pay rise of ${fmt(c.amount!)} a week.` : 'Your star has changed his mind.';
  },
  choices: (s, c) => {
    const p = player(s, c.pid);
    if (!p?.contract) return gone();
    const proud = p.personality < 40;
    return [
      { label: 'Agree the raise', chips: [bad(`+${fmt(c.amount!)}/wk wages`), good('Morale +12')], apply: (s2) => { p.contract!.wage += c.amount!; mood(p, 12); return `${p.last} signs the new terms and says he is happy here.`; } },
      { label: 'Refuse', chips: [bad(`Morale −${proud ? 15 : 6}`), proud ? bad('Hot-headed: may sulk') : meh('Takes it well')], apply: (s2) => { mood(p, proud ? -15 : -6); return proud ? `${p.last} storms out of the meeting.` : `${p.last} accepts it, a little disappointed.`; } },
      { label: 'Promise a new deal soon', chips: [good('Morale +4'), meh('Expects it kept')], apply: (s2) => { mood(p, 4); return `${p.last} takes you at your word.`; } },
    ];
  },
});

register({
  type: 'youth_trial', cat: 'Squad', phases: ['pre'], weight: 2,
  from: () => ({ kind: 'scout' }),
  make: (s, rng) => ({ type: 'youth_trial', pos: rng.pick(['GK', 'CB', 'CM', 'AM', 'LW', 'RW', 'ST', 'LB', 'RB', 'DM'] as Position[]), amount: Math.max(100, roundMoney(eco(s).wage * 12)) }),
  title: () => 'Youth trial request',
  body: (s, c) => `Your scouts spotted a 16-year-old ${c.pos} who looks like a real talent. A trial and a place in the academy would cost ${fmt(c.amount!)}.`,
  choices: (s, c) => {
    const full = squadOf(s, s.userClubId).filter((p) => p.academy).length >= academyCap(s);
    return [
      {
        label: 'Offer a trial', chips: [bad(`−${fmt(c.amount!)}`), good('Talented academy player')], disabled: full ? 'The academy is full' : undefined,
        apply: (s2, rng) => {
          const user = s2.clubs[s2.userClubId];
          const ovr = DIV_AVG_OVR[user.div] - 13 + rng.normal(0, 3);
          const p = generatePlayer(rng, s2.nextPlayerId++, { ovr, current: true, pos: c.pos!, age: 16, season: s2.season, div: user.div, potBoost: 6 });
          p.clubId = user.id;
          p.academy = true;
          p.contract = { type: 'permanent', wage: Math.max(1, Math.round(marketWage(p.ovr, user.div, DIV_AVG_OVR[user.div]) * 0.15)), endSeason: s2.season + 2, role: 'youth', clauses: {}, signedSeason: s2.season };
          p.value = playerValue(p.ovr, p.pot, 16, 3);
          s2.players.set(p.id, p);
          dirtyPlayers.add(p.id);
          invalidateSquads();
          txn(s2, 'other_out', -c.amount!);
          return `${name(p)} joins the academy. The coaches are excited.`;
        },
      },
      { label: 'Pass', chips: [meh('Another club will take him')], apply: () => 'You pass. The boy signs elsewhere.' },
    ];
  },
});

register({
  type: 'board_target', cat: 'Board', phases: ['pre'], weight: 2,
  from: () => ({ kind: 'board' }),
  make: (s) => ({ type: 'board_target', amount: Math.max(500, roundMoney(eco(s).sponsor * 0.4)) }),
  title: () => 'The board wants more',
  body: (s, c) => `The chairman asks whether you will commit to a stretch target this season. In return the board will release ${fmt(c.amount!)} for the squad.`,
  choices: (s, c) => [
    { label: 'Commit to the stretch', chips: [good(`+${fmt(c.amount!)}`), good('Approval +3'), bad('Fans expect more')], apply: (s2) => { txn(s2, 'other_in', c.amount!); approve(s2, 3); return `The board is delighted and releases ${fmt(c.amount!)}.`; } },
    { label: 'Stay realistic', chips: [meh('No change'), bad('Approval −1')], apply: (s2) => { approve(s2, -1); return 'The chairman nods, a little unconvinced.'; } },
  ],
});

// ---------------- transfer windows

register({
  type: 'rival_bid', cat: 'Transfers', phases: ['window'], weight: 3,
  from: (s, c) => ({ kind: 'club', club: c.club, pid: c.pid }),
  make: (s, rng) => {
    const squad = firstTeam(s).sort(byOvr);
    const pool = squad.filter((p, i) => i > 1 && i < 16 && p.contract?.type === 'permanent');
    if (pool.length < 3) return null;
    const p = rng.pick(pool);
    const idx = buildSquadIndex(s);
    const buyer = aiBuyerFor(s, rng, p, idx, false);
    if (buyer == null) return null;
    const o = makeIncomingOffer(s, rng, p, buyer, false);
    return { type: 'rival_bid', pid: p.id, club: buyer, offerId: o.id, amount: o.fee };
  },
  title: (s, c) => `${s.clubs[c.club!]?.short ?? 'A rival'} bid for ${player(s, c.pid)?.last ?? 'a player'}`,
  body: (s, c) => {
    const p = player(s, c.pid);
    return p ? `${s.clubs[c.club!].name} have offered ${fmt(c.amount!)} for ${name(p)} (value ${fmt(p.value)}). They want an answer today.` : 'The offer was withdrawn.';
  },
  choices: (s, c) => {
    const p = player(s, c.pid);
    const o = s.offers.find((x) => x.id === c.offerId);
    if (!p || !o || o.status !== 'pending') return gone();
    const starter = squadOf(s, s.userClubId).filter((q) => !q.academy).sort(byOvr).slice(0, 11).includes(p);
    const ask = Math.round(o.fee * 1.3);
    return [
      { label: 'Sell', chips: [good(`+${fmt(o.fee)}`), starter ? bad('Loses a starter') : meh('Squad player')], apply: (s2) => { const err = acceptIncoming(s2, o.id); return err ? `Deal failed: ${err}` : `Sold. ${p.last} leaves for ${fmt(o.fee)}.`; } },
      { label: `Ask ${fmt(ask)}`, chips: [good(`+${fmt(ask)}`), meh('Maybe 50-85% they agree'), bad('They may walk away')], apply: (s2, rng) => {
        if (counterIncoming(s2, rng, o.id, ask) === 'accepted') { const err = acceptIncoming(s2, o.id); return err ? `Deal failed: ${err}` : `Sold. They agreed to ${fmt(ask)} and ${p.last} has gone.`; }
        return `They walk away at ${fmt(ask)}. ${p.last} stays.`;
      } },
      { label: 'Refuse', chips: [meh(`${p.last} stays`), bad(`Morale −${p.personality < 40 ? 12 : 4}`)], apply: (s2) => { rejectIncoming(s2, o.id); return `${p.last} stays, a little restless.`; } },
    ];
  },
});

register({
  type: 'wants_leave', cat: 'Squad', phases: ['window', 'season'], weight: 2,
  from: (s, c) => ({ kind: 'player', pid: c.pid }),
  make: (s, rng) => {
    const pool = firstTeam(s).filter((p) => p.personality < 60 && p.morale < 55 && !p.listed);
    const p = pool.length ? rng.pick(pool) : null;
    return p ? { type: 'wants_leave', pid: p.id } : null;
  },
  title: (s, c) => `${player(s, c.pid)?.last ?? 'A player'} is thinking of leaving`,
  body: (s, c) => { const p = player(s, c.pid); return p ? `${name(p)} says he is unhappy and wants to know where he stands.` : 'He has settled down.'; },
  choices: (s, c) => {
    const p = player(s, c.pid);
    if (!p?.contract) return gone();
    const chance = clamp(0.3 + p.personality / 200 + (p.morale > 30 ? 0.1 : 0), 0.2, 0.85);
    const raise = Math.max(1, Math.round(p.contract.wage * 0.2));
    return [
      { label: 'Talk him round', chips: [meh(`About ${Math.round(chance * 100)}% he stays`), good('Morale +12 if he does'), bad('Morale −8 if not')], apply: (s2, rng) => { if (rng.chance(chance)) { mood(p, 12); return `${p.last} listens and decides to stay.`; } mood(p, -8); return `${p.last} is not convinced and keeps sulking.`; } },
      { label: `Offer a raise (+${fmt(raise)}/wk)`, chips: [bad(`+${fmt(raise)}/wk wages`), good('Morale +15')], apply: () => { p.contract!.wage += raise; mood(p, 15); return `${p.last} is happy with the new terms.`; } },
      { label: 'Transfer-list him', chips: [meh('Bids may arrive'), good('Morale +10')], apply: () => { p.listed = true; mood(p, 10); return `${p.last} goes on the transfer list.`; } },
    ];
  },
});

register({
  type: 'loyal_extend', cat: 'Squad', phases: ['window'], weight: 2,
  from: (s, c) => ({ kind: 'player', pid: c.pid }),
  make: (s) => {
    const p = firstTeam(s).filter((x) => x.contract?.type === 'permanent' && x.contract.endSeason <= s.season && s.season - x.birthYear >= 28 && x.personality >= 65).sort(byOvr)[0];
    return p ? { type: 'loyal_extend', pid: p.id } : null;
  },
  title: (s, c) => `${player(s, c.pid)?.last ?? 'A veteran'} offers to stay`,
  body: (s, c) => { const p = player(s, c.pid); return p ? `${name(p)} loves the club and offers a two-year extension at a 10% pay cut.` : 'The offer lapsed.'; },
  choices: (s, c) => {
    const p = player(s, c.pid);
    if (!p?.contract) return gone();
    const cut = Math.round(p.contract.wage * 0.1);
    return [
      { label: 'Accept the extension', chips: [good(`−${fmt(cut)}/wk wages`), good('Contract +2 years'), good('Morale +6')], apply: () => { p.contract!.wage -= cut; p.contract!.endSeason += 2; mood(p, 6); return `${p.last} signs until ${p.contract!.endSeason + 1}.`; } },
      { label: 'Not now', chips: [meh('Contract runs down'), bad('Morale −2')], apply: () => { mood(p, -2); return `${p.last} understands, but says he will not wait forever.`; } },
    ];
  },
});

register({
  type: 'loan_request', cat: 'Transfers', phases: ['window'], weight: 2,
  from: (s, c) => ({ kind: 'club', club: c.club, pid: c.pid }),
  make: (s, rng) => {
    const squad = firstTeam(s).sort(byOvr);
    const pool = rng.shuffle(squad.filter((p, i) => i >= 12 && s.season - p.birthYear <= 25 && p.contract?.type === 'permanent'));
    const idx = buildSquadIndex(s);
    let p: Player | undefined;
    let buyer: number | null = null;
    for (const q of pool.slice(0, 4)) {
      buyer = aiBuyerFor(s, rng, q, idx, true);
      if (buyer != null) { p = q; break; }
    }
    if (!p || buyer == null) return null;
    const o = makeIncomingOffer(s, rng, p, buyer, true);
    return { type: 'loan_request', pid: p.id, club: buyer, offerId: o.id, amount: o.wageSharePct };
  },
  title: (s, c) => `${s.clubs[c.club!]?.short ?? 'A club'} want ${player(s, c.pid)?.last ?? 'a player'} on loan`,
  body: (s, c) => { const p = player(s, c.pid); return p ? `${s.clubs[c.club!].name} want ${name(p)} (${s.season - p.birthYear}) on loan to give him minutes. They would pay ${c.amount}% of his wage.` : 'The request lapsed.'; },
  choices: (s, c) => {
    const p = player(s, c.pid);
    const o = s.offers.find((x) => x.id === c.offerId);
    if (!p || !o || o.status !== 'pending') return gone();
    return [
      { label: 'Let him go on loan', chips: [good(`Saves ${c.amount}% of his wage`), good('Gets match minutes'), meh('Back at the end of the loan')], apply: (s2) => { const err = acceptIncoming(s2, o.id); if (!err) mood(p, 8); return err ? `Deal failed: ${err}` : `Deal done. ${p.last} heads out on loan.`; } },
      { label: 'Keep him', chips: [meh('Stays in the squad'), bad('Morale −3')], apply: (s2) => { rejectIncoming(s2, o.id); mood(p, -3); return `${p.last} stays, hoping for more minutes.`; } },
    ];
  },
});

// ---------------- in season

register({
  type: 'dressing_room', cat: 'Squad', phases: ['season'], weight: 3,
  from: (s, c) => ({ kind: 'player', pid: c.pid }),
  make: (s, rng) => {
    const t = firstTeam(s);
    if (t.length < 8) return null;
    const [a, b] = rng.shuffle([...t]).slice(0, 2);
    return { type: 'dressing_room', pid: a.id, pid2: b.id, amount: Math.max(50, roundMoney(eco(s).wage * 2)) };
  },
  title: () => 'Row in the dressing room',
  body: (s, c) => { const a = player(s, c.pid), b = player(s, c.pid2); return a && b ? `${name(a)} and ${name(b)} had a heated argument after training. The squad is watching how you react.` : 'It has blown over.'; },
  choices: (s, c) => {
    const a = player(s, c.pid), b = player(s, c.pid2);
    if (!a || !b) return gone();
    const hot = a.personality < 40 || b.personality < 40;
    const senior = s.season - a.birthYear >= s.season - b.birthYear ? a : b;
    const junior = senior === a ? b : a;
    return [
      { label: `Fine both (${fmt(c.amount!)})`, chips: [bad(`−${fmt(c.amount!)}`), good('Morale +2 both')], apply: (s2) => { txn(s2, 'other_out', -c.amount!); mood(a, 2); mood(b, 2); return 'Both pay up and shake hands.'; } },
      { label: `Back ${senior.last}`, chips: [good(`${senior.last} +5`), bad(`${junior.last} −6`)], apply: () => { mood(senior, 5); mood(junior, -6); return `${junior.last} is not happy, but the dressing room settles.`; } },
      { label: 'Let them sort it out', chips: [hot ? bad('Risky: someone is hot-headed') : good('Likely blows over')], apply: (s2, rng) => { if (rng.chance(hot ? 0.7 : 0.15)) { mood(a, -5); mood(b, -5); return 'It drags on and both sulk for a week.'; } return 'They sort it out themselves.'; } },
    ];
  },
});

register({
  type: 'injury_gamble', cat: 'Squad', phases: ['season'], weight: 3,
  from: (s, c) => ({ kind: 'staff', pid: c.pid }),
  make: (s) => {
    const p = firstTeam(s).sort(byOvr).slice(0, 11).filter((x) => x.injury === 0)[0];
    return p ? { type: 'injury_gamble', pid: p.id } : null;
  },
  title: (s, c) => `${player(s, c.pid)?.last ?? 'A starter'} is carrying a knock`,
  body: (s, c) => { const p = player(s, c.pid); return p ? `The physio says ${name(p)} is carrying a knock. He insists he can play on.` : 'He is fine.'; },
  choices: (s, c) => {
    const p = player(s, c.pid);
    if (!p) return gone();
    const risk = p.personality >= 65 ? 15 : 25;
    return [
      { label: 'Rest him', chips: [meh('Misses the next match'), good('No risk')], apply: () => { p.injury = Math.max(p.injury, 1); p.injuryName = 'Minor knock'; dirtyPlayers.add(p.id); return `${p.last} sits out a week.`; } },
      { label: 'Play him', chips: [good('Morale +3'), bad(`About ${risk}% a longer injury`)], apply: (s2, rng) => { if (rng.chance(risk / 100)) { injurePlayer(rng, p); dirtyPlayers.add(p.id); return `${p.last} aggravates it: ${p.injuryName}, out ${p.injury} weeks.`; } mood(p, 3); return `${p.last} plays on and is grateful for the trust.`; } },
    ];
  },
});

register({
  type: 'fan_group', cat: 'Club', phases: ['season'], weight: 2,
  from: () => ({ kind: 'fans' }),
  make: (s) => ({ type: 'fan_group', amount: Math.max(100, roundMoney(eco(s).sponsor * 0.06)) }),
  title: () => 'Supporters ask for a ticket offer',
  body: (s, c) => `The supporters' group asks for a cheap-ticket weekend. It would cost about ${fmt(c.amount!)} in gate money but fill the stands with noise.`,
  choices: (s, c) => [
    { label: 'Agree', chips: [bad(`−${fmt(c.amount!)}`), good('Morale +2'), good('Board approval +2')], apply: (s2) => { txn(s2, 'other_out', -c.amount!); moodAll(s2, 2); approve(s2, 2); return 'The ground is rocking on the day.'; } },
    { label: 'Politely refuse', chips: [meh('No change')], apply: () => 'The supporters understand.' },
  ],
});

register({
  type: 'press', cat: 'Club', phases: ['season'], weight: 2,
  from: () => ({ kind: 'press' }),
  make: () => ({ type: 'press' }),
  title: () => 'Local radio wants a word',
  body: () => 'The local radio station asks for an interview about the season so far. What tone do you take?',
  choices: () => [
    { label: 'Praise the squad', chips: [good('Morale +2')], apply: (s2) => { moodAll(s2, 2); return 'The players hear it and walk a little taller.'; } },
    { label: 'Demand more', chips: [good('Board approval +2'), bad('Morale −2')], apply: (s2) => { moodAll(s2, -2); approve(s2, 2); return 'The board likes the ambition. The squad, less so.'; } },
    { label: 'Decline', chips: [meh('No change')], apply: () => 'You have no comment.' },
  ],
});

// ---------------- contract expiry notices (6 months and 1 month before the end, DESIGN 13.2m)

export const NOTICE_WEEKS = [26, 4];
/** "6 months", "1 month": from the weeks actually left, so old reminders read right too. */
const leftLabel = (w: number) => { const m = Math.max(1, Math.round(w / 4.33)); return `${m} month${m === 1 ? '' : 's'}`; };

/** Weeks until a permanent contract runs out (it ends with the last week of its end season). */
export function contractWeeksLeft(s: GameState, p: Player): number {
  return p.contract ? (p.contract.endSeason - s.season) * 52 + (CAL.weeks - s.week) + 1 : 0;
}
const stagesPassed = (w: number) => NOTICE_WEEKS.filter((x) => w <= x).length;

/** The wage he asks to stay on a 3-year deal (see contractAsk for other lengths). */
export function renewalAsk(s: GameState, p: Player): number {
  return contractAsk(s, p, s.userClubId, 3);
}

register({
  type: 'contract_expiring', cat: 'Squad', phases: [], weight: 0, // never rolled at random: see contractNotices
  from: (s, c) => ({ kind: 'player', pid: c.pid }),
  make: (s) => {
    const p = firstTeam(s).filter((x) => x.contract?.type === 'permanent').sort((a, b) => contractWeeksLeft(s, a) - contractWeeksLeft(s, b))[0];
    return p ? { type: 'contract_expiring', pid: p.id, amount: clamp(stagesPassed(contractWeeksLeft(s, p)) - 1, 0, NOTICE_WEEKS.length - 1) } : null;
  },
  title: (s, c) => { const p = player(s, c.pid); return `${p?.last ?? 'A player'}: ${p ? leftLabel(contractWeeksLeft(s, p)) : 'not long'} left on his contract`; },
  body: (s, c) => {
    const p = player(s, c.pid);
    if (!p?.contract) return 'This contract has already been sorted out.';
    const last = contractWeeksLeft(s, p) <= NOTICE_WEEKS[NOTICE_WEEKS.length - 1] + 1;
    return `${name(p)} (${p.pos}, ${p.ovr} OVR, age ${s.season - p.birthYear}) earns ${fmt(p.contract.wage)} a week and his deal ends this summer. ${last ? 'This is the last chance: he leaves on a free in a few weeks.' : 'Set the wage and length and make an offer, or wait.'}`;
  },
  choices: (s, c) => {
    const p = player(s, c.pid);
    if (!p?.contract || p.clubId !== s.userClubId || contractWeeksLeft(s, p) > 60) return gone();
    // the offer itself is made in the negotiation form above these choices (decisionUI: RenewalForm, signRenewal)
    const stage = Math.min(c.amount ?? 0, NOTICE_WEEKS.length - 1);
    const out: Choice[] = [];
    const notLast = contractWeeksLeft(s, p) > NOTICE_WEEKS[NOTICE_WEEKS.length - 1] + 1;
    if (notLast) out.push({ label: 'Wait for now', chips: [meh('Reminder at 1 month')], apply: () => `You'll talk again with 1 month left.` });
    void stage;
    out.push(
      notLast
        ? { label: 'Put him on the transfer list', chips: [good('Sell before he can leave for free'), bad('Morale −5')], apply: () => { p.listed = true; mood(p, -5); return `${p.last} is on the transfer list.`; } }
        : { label: 'Let him go in the summer', chips: [meh('He leaves on a free'), good('Wages off the books')], apply: () => { mood(p, -3); return `${p.last} will leave when his deal ends.`; } },
    );
    return out;
  },
});

/** Weekly: post the notices that are due (most valuable players first, at most two new a week; the rest wait a week). */
export function contractNotices(s: GameState) {
  if (s.ext.noticesV !== 2) { s.ext.notices = {}; s.ext.noticesV = 2; } // the stages changed (were 1y/6m/3m/1m): count afresh
  const st = ((s.ext.notices as Record<number, { end: number; n: number }> | undefined) ??= {});
  const squad = firstTeam(s).filter((p) => p.contract?.type === 'permanent').sort(byOvr);
  const key = squad.slice(0, 18);
  const keyIds = new Set(key.map((p) => p.id));
  let posted = 0;
  for (const p of squad) {
    const end = p.contract!.endSeason;
    const n = stagesPassed(contractWeeksLeft(s, p));
    const rec = st[p.id];
    if (!rec || rec.end !== end) { st[p.id] = { end, n }; continue; } // first seen or a fresh deal: count from now
    if (n <= rec.n) continue;
    if (!keyIds.has(p.id)) { rec.n = n; continue; } // fringe players get the summary message instead
    if (posted >= 2) continue;
    for (const m of pendingDecisions(s)) {
      const c = m.action?.data as DecisionCtx | undefined;
      if (c?.type === 'contract_expiring' && c.pid === p.id) { m.resolved = true; m.read = true; m.pick = 'Superseded'; m.outcome = 'A newer reminder replaced this one.'; }
    }
    const ctx: DecisionCtx = { type: 'contract_expiring', pid: p.id, amount: n - 1 };
    const d = decisionDef('contract_expiring')!;
    addMessage(s, { cat: d.cat, title: d.title(s, ctx), body: d.body(s, ctx), from: d.from(s, ctx), action: { kind: 'decision', data: ctx } });
    rec.n = n;
    posted++;
  }
  for (const id of Object.keys(st)) if (!s.players.get(+id) || s.players.get(+id)!.clubId !== s.userClubId) delete st[+id];
}


// ---------------- transfer window news (DESIGN 13.2p): a popup when a window opens and when it shuts

const WINDOW_TEXT: Record<string, [string, string]> = {
  summer_open: ['Summer transfer window open', 'Clubs can buy and sell players again until the end of August (week 9). Bids for your players will start to come in.'],
  summer_close: ['Summer transfer window closed', 'The summer window has shut. Until January only free agents and loans can come in.'],
  winter_open: ['January transfer window open', 'The January window is open for four weeks, until week 30. Time to strengthen for the run-in.'],
  winter_close: ['January transfer window closed', 'The January window has shut. The squad you have now finishes the season.'],
};

register({
  type: 'window_news', cat: 'Transfers', phases: [], weight: 0, // posted by windowNews, never rolled
  from: () => undefined,
  make: () => null,
  title: (s, c) => WINDOW_TEXT[c.key ?? '']?.[0] ?? 'Transfer window',
  body: (s, c) => WINDOW_TEXT[c.key ?? '']?.[1] ?? '',
  choices: () => [{ label: 'Got it', chips: [], apply: () => 'Noted.' }],
});

/** Posted in the week before the change, so the popup shows when the new week (open or shut) appears. */
export function windowNews(s: GameState) {
  const key =
    s.week === CAL.summerWindowStart - 1 ? 'summer_open'
    : s.week === CAL.summerWindowEnd ? 'summer_close'
    : s.week === CAL.winterWindow[0] - 1 ? 'winter_open'
    : s.week === CAL.winterWindow[1] ? 'winter_close'
    : null;
  if (!key) return;
  // an older one nobody answered is out of date now
  for (const m of pendingDecisions(s)) if ((m.action?.data as DecisionCtx | undefined)?.type === 'window_news') { m.resolved = true; m.read = true; m.pick = 'Got it'; }
  const ctx: DecisionCtx = { type: 'window_news', key };
  const d = decisionDef('window_news')!;
  addMessage(s, { cat: d.cat, title: d.title(s, ctx), body: d.body(s, ctx), action: { kind: 'decision', data: ctx } });
}

// ---------------- life events (DESIGN 13.2p): two a season, a player's news and a chance to send a gift

interface LifeKind { key: string; title: (p: Player) => string; body: (p: Player) => string; boost: number; cost: number; young?: boolean; old?: boolean }
const LIFE: LifeKind[] = [
  { key: 'wedding', title: (p) => `${p.last} is getting married`, body: (p) => `${name(p)} is marrying his long-time partner this weekend. The whole dressing room is talking about it.`, boost: 12, cost: 8 },
  { key: 'baby', title: (p) => `${p.last} becomes a father`, body: (p) => `${name(p)} and his partner have welcomed a baby. He is over the moon.`, boost: 12, cost: 6 },
  { key: 'birthday', title: (p) => `Happy birthday, ${p.last}`, body: (p) => `${name(p)} turns a year older this week and the lads have a cake ready in the canteen.`, boost: 6, cost: 2 },
  { key: 'house', title: (p) => `${p.last} buys his first house`, body: (p) => `${name(p)} has just got the keys to a new house near the training ground.`, boost: 8, cost: 4, young: true },
  { key: 'degree', title: (p) => `${p.last} finishes his degree`, body: (p) => `${name(p)} has been studying in the evenings and has just passed his final exams.`, boost: 8, cost: 3 },
  { key: 'charity', title: (p) => `${p.last} runs a charity marathon`, body: (p) => `${name(p)} ran a marathon for the local children's hospital on his day off.`, boost: 8, cost: 4 },
  { key: 'driving', title: (p) => `${p.last} passes his driving test`, body: (p) => `${name(p)} finally passed his driving test, at the fourth attempt.`, boost: 6, cost: 2, young: true },
  { key: 'family', title: (p) => `${p.last}'s family move over`, body: (p) => `${name(p)}'s parents have moved to town to be closer to him.`, boost: 8, cost: 3 },
  { key: 'anniversary', title: (p) => `${p.last}'s ten years in the game`, body: (p) => `${name(p)} marks ten years as a professional this week.`, boost: 8, cost: 5, old: true },
];

register({
  type: 'life_event', cat: 'Squad', phases: [], weight: 0, // posted by lifeEvents, never rolled
  from: (s, c) => ({ kind: 'player', pid: c.pid }),
  make: (s, rng) => {
    const t = firstTeam(s);
    if (!t.length) return null;
    const p = rng.pick(t);
    const age = s.season - p.birthYear;
    const kinds = LIFE.map((k, i) => ({ k, i })).filter(({ k }) => (!k.young || age <= 25) && (!k.old || age >= 27));
    const { i } = rng.pick(kinds);
    return { type: 'life_event', pid: p.id, amount: i, amount2: Math.max(20, roundMoney(eco(s).wage * LIFE[i].cost)) };
  },
  title: (s, c) => { const p = player(s, c.pid); return p ? LIFE[c.amount ?? 0].title(p) : 'Player news'; },
  body: (s, c) => { const p = player(s, c.pid); return p ? `${LIFE[c.amount ?? 0].body(p)} Do you want to mark it?` : 'He has since left the club.'; },
  choices: (s, c) => {
    const p = player(s, c.pid);
    if (!p || p.clubId !== s.userClubId) return gone();
    const k = LIFE[c.amount ?? 0];
    const gift = c.amount2 ?? 50;
    const pals = firstTeam(s).filter((x) => x.id !== p.id && x.nat === p.nat).slice(0, 3);
    return [
      { label: `Send a gift (${fmt(gift)})`, chips: [bad(`−${fmt(gift)}`), good(`${p.last} morale +${k.boost}`), good('Squad morale +1')], apply: (s2) => { txn(s2, 'other_out', -gift); mood(p, k.boost); moodAll(s2, 1); return `${p.last} is delighted with the gift and thanks you in front of the whole squad.`; } },
      { label: 'Send a card', chips: [good(`${p.last} morale +${Math.round(k.boost / 3)}`)], apply: () => { mood(p, Math.round(k.boost / 3)); pals.forEach((x) => mood(x, 1)); return `${p.last} is happy you remembered.`; } },
      { label: 'Do nothing', chips: [bad(`${p.last} morale −2`)], apply: () => { mood(p, -2); return `${p.last} notices that nobody from the club said anything.`; } },
    ];
  },
});

/** Two life events a season, on weeks picked when the season starts (one in each half). */
export function lifeEvents(s: GameState, rng: Rng) {
  let st = s.ext.life as { season: number; weeks: number[] } | undefined;
  if (!st || st.season !== s.season) {
    const r = new Rng(hashSeed(s.seed, s.season, 4242));
    st = { season: s.season, weeks: [r.int(6, 24), r.int(30, 46)] };
    s.ext.life = st;
  }
  if (!st.weeks.includes(s.week)) return;
  if (firstTeam(s).length < 11) return;
  fire(s, rng, decisionDef('life_event')!);
}

// ---------------- engine

export function pendingDecisions(s: GameState): InboxMessage[] {
  return s.inbox.filter((m) => m.action?.kind === 'decision' && !m.resolved);
}

export function decisionChoices(s: GameState, m: InboxMessage): Choice[] {
  const c = m.action?.data as DecisionCtx | undefined;
  const d = c && decisionDef(c.type);
  return d && c ? d.choices(s, c) : gone();
}

const BAD = /\b(rejects?|refuses?|refused|turns? (it )?down|not convinced|walks? away|broke down|storms?|won't|will not|declin\w*|fails?|failed|falls? through|pulls? out|no deal|sulk\w*|not happy|unhappy|leaves? on a free|grumble|injur\w*|knock|aggravates)\b/i;
const GOOD = /\b(signs?|signed|accepts?|agreed|agrees|joins?|arrives|completed?|deal done|sold|lands in the account|happy|delighted|decides to stay|grateful|excited|releases|bonds|closer)\b/i;
/** Was this outcome good or bad for the user? Read from the outcome text (bad words win). */
export function outcomeTone(text: string | undefined | null): 'good' | 'bad' | 'neutral' {
  if (!text) return 'neutral';
  if (BAD.test(text)) return 'bad';
  if (GOOD.test(text)) return 'good';
  return 'neutral';
}

export function resolveDecision(s: GameState, msgId: number, index: number): string | null {
  const m = s.inbox.find((x) => x.id === msgId);
  if (!m || m.resolved || m.action?.kind !== 'decision') return null;
  const choices = decisionChoices(s, m);
  const ch = choices[index];
  if (!ch || ch.disabled) return null;
  const outcome = ch.apply(s, new Rng(hashSeed(s.seed, msgId, index + 1)));
  m.resolved = true;
  m.read = true;
  m.pick = ch.label;
  m.outcome = outcome;
  m.tone = outcomeTone(outcome);
  return outcome;
}

function state(s: GameState): { last: Record<string, number> } {
  let d = s.ext.decisions as { last: Record<string, number> } | undefined;
  if (!d) {
    d = { last: {} };
    s.ext.decisions = d;
  }
  return d;
}

const absWeek = (s: GameState) => s.season * 52 + s.week;

function phaseOf(week: number): Phase | null {
  if (week <= CAL.firstRoundWeek - 1) return 'pre';
  if (isWindowOpen(week)) return 'window';
  if (week >= 8 && week < CAL.playoffSemiWeek) return 'season';
  return null;
}

function fire(s: GameState, rng: Rng, d: DecisionDef): boolean {
  const ctx = d.make(s, rng);
  if (!ctx) return false;
  state(s).last[d.type] = absWeek(s);
  addMessage(s, { cat: d.cat, title: d.title(s, ctx), body: d.body(s, ctx), from: d.from(s, ctx), action: { kind: 'decision', data: ctx } });
  return true;
}

/** Roll this week's decision events (at most one). */
export function rollDecisions(s: GameState, rng: Rng) {
  // contract reminders have their own pace and do not hold back the other events
  if (pendingDecisions(s).filter((m) => (m.action?.data as DecisionCtx | undefined)?.type !== 'contract_expiring').length >= 2) return;
  if (firstTeam(s).length < 14) return;
  const w = s.week;
  const phase = phaseOf(w);
  if (!phase) return;
  let p = 0;
  if (phase === 'pre') p = [0, 1, 0.75, 0.7, 0.6, 0.5][w] ?? 0.5;
  else if (phase === 'window') p = 0.35;
  else p = 0.12;
  const last = state(s).last;
  const ok = (d: DecisionDef) => d.weight > 0 && (last[d.type] == null || absWeek(s) - last[d.type] >= 20);
  const phases: Phase[] = phase === 'pre' ? ['pre', 'window'] : [phase];
  if (rng.chance(p)) {
    const cands = DEFS.filter((d) => ok(d) && d.phases.some((x) => phases.includes(x)));
    const left = [...cands];
    while (left.length) {
      const d = rng.weighted(left, (x) => x.weight);
      if (fire(s, rng, d)) break;
      left.splice(left.indexOf(d), 1);
    }
  }
}

registerSystem({
  name: 'decisions',
  weekly(s, rng) {
    contractNotices(s);
    windowNews(s);
    lifeEvents(s, rng);
    rollDecisions(s, rng);
  },
});

/** Create one decision of a given type right now (used by tests and tools). */
export function fireDecision(s: GameState, rng: Rng, type: string): InboxMessage | null {
  const d = decisionDef(type);
  if (!d || !fire(s, rng, d)) return null;
  return s.inbox[s.inbox.length - 1];
}

export const DECISION_TYPES = DEFS.map((d) => d.type);

/** Sign the renewal agreed in the popup's negotiation form and close the reminder. */
export function signRenewal(s: GameState, msgId: number, pid: number, offer: ContractOffer): string | null {
  const m = s.inbox.find((x) => x.id === msgId);
  const p = s.players.get(pid);
  if (!m || m.resolved || !p || p.clubId !== s.userClubId) return null;
  applyContract(s, p, s.userClubId, offer);
  dirtyPlayers.add(p.id);
  const out = `${p.last} signs for ${offer.years} year${offer.years === 1 ? '' : 's'} on ${fmt(offer.wage)} a week.`;
  m.resolved = true;
  m.read = true;
  m.pick = `New ${offer.years}-year deal`;
  m.outcome = out;
  m.tone = 'good';
  return out;
}

/** Talks in the popup broke down: he is a bit put out, and the reminder closes (the next one still comes). */
export function failRenewal(s: GameState, msgId: number, pid: number, msg: string): string | null {
  const m = s.inbox.find((x) => x.id === msgId);
  const p = s.players.get(pid);
  if (!m || m.resolved || !p) return null;
  mood(p, -4);
  m.resolved = true;
  m.read = true;
  m.pick = 'Talks broke down';
  m.outcome = msg;
  m.tone = 'bad';
  return msg;
}

