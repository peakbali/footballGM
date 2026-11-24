import { roundMoney } from '../data/economy';
import { roleForRank, signContract } from '../generate';
import { addNews } from '../season';
import type { Rng } from '../rng';
import { isWindowOpen, type GameState } from '../state';
import { registerSystem } from '../systems';
import type { Player } from '../types';
import { LINE } from '../data/positions';
import { refreshClubRatings } from '../selection';
import { dirtyPlayers } from './dirty';

function fmt(v: number) {
  return v >= 1e6 ? `£${(v / 1e6).toFixed(1)}m` : v >= 1e3 ? `£${Math.round(v / 1e3)}k` : `£${v}`;
}

/**
 * AI transfer market (DESIGN 7.6). In window weeks, simulated clubs in divisions 1-8 look at their
 * weakest line and buy a better player from a lower or similar club they can afford. Divisions
 * 9-10 and off-chain clubs mostly use free agents.
 */
function aiWindowWeek(s: GameState, rng: Rng, idx: Map<number, Player[]>) {
  const userTargets = new Set(s.offers.filter((o) => o.buyer === s.userClubId && (o.status === 'accepted' || o.status === 'countered')).map((o) => o.pid));
  const freeAgents = [...s.players.values()].filter((p) => p.clubId == null && !p.retired);
  let moves = 0;
  for (const lg of s.leagues) {
    for (const cid of lg.clubIds) {
      if (cid === s.userClubId) continue;
      const club = s.clubs[cid];
      if (!rng.chance(lg.div <= 8 ? 0.12 : 0.06)) continue;
      const squad = idx.get(cid) ?? [];
      if (squad.length >= 28) continue;
      // weakest line among likely starters
      const byLine: Record<string, Player[]> = { GK: [], DEF: [], MID: [], ATT: [] };
      for (const p of squad) byLine[LINE[p.pos]].push(p);
      const need: Record<string, number> = { GK: 1, DEF: 4, MID: 4, ATT: 2 };
      let worstLine = 'MID';
      let worstVal = 999;
      for (const k of Object.keys(byLine)) {
        const top = byLine[k].map((p) => p.ovr).sort((a, b) => b - a).slice(0, need[k]);
        const v = top.length < need[k] ? 0 : top[top.length - 1];
        if (v < worstVal) { worstVal = v; worstLine = k; }
      }
      const budget = Math.max(0, club.cash * (club.ai === 'buyer' ? 0.5 : 0.3));
      let target: Player | undefined;
      if (lg.div <= 8 && budget > 1000) {
        // scan a handful of nearby-division clubs
        const pool: Player[] = [];
        for (const other of s.leagues) {
          if (other.div < lg.div || other.div > lg.div + 2) continue;
          for (let k = 0; k < 4; k++) {
            const oid = rng.pick(other.clubIds);
            if (oid === cid || oid === s.userClubId) continue;
            for (const p of idx.get(oid) ?? []) if (LINE[p.pos] === worstLine && p.ovr > worstVal + 2 && p.contract?.type === 'permanent' && !userTargets.has(p.id)) pool.push(p);
          }
        }
        const age = (p: Player) => s.season - p.birthYear;
        const pref = (p: Player) => (club.ai === 'developer' ? (age(p) <= 23 ? 2 : 0.6) : club.ai === 'buyer' ? (age(p) >= 24 && age(p) <= 29 ? 1.5 : 0.8) : 1) * (p.ovr - worstVal);
        const afford = pool.filter((p) => p.value * 1.3 <= budget).sort((a, b) => pref(b) - pref(a));
        target = afford[0];
      }
      if (target) {
        const fee = roundMoney(target.value * rng.range(1.0, 1.5));
        const seller = s.clubs[target.clubId!];
        const sellerSquad = idx.get(seller.id) ?? [];
        if (sellerSquad.length <= 18) continue;
        club.cash -= fee;
        seller.cash += fee;
        const from = target.clubId!;
        sellerSquad.splice(sellerSquad.indexOf(target), 1);
        signContract(rng, target, cid, club.div, s.season, roleForRank(squad.filter((q) => q.ovr > target!.ovr).length));
        squad.push(target);
        dirtyPlayers.add(target.id);
        s.transfers.push({ season: s.season, week: s.week, pid: target.id, name: `${target.first} ${target.last}`, from, to: cid, fee, type: 'permanent' });
        const userDiv = s.clubs[s.userClubId].div;
        if (lg.div === 1 || lg.div === userDiv || s.clubs[from].div === userDiv) addNews(s, `${club.short} sign ${target.first} ${target.last} from ${seller.short} for ${fmt(fee)}.`);
        moves++;
      } else {
        // free agent at the right level
        const fa = freeAgents.filter((p) => LINE[p.pos] === worstLine && p.ovr > worstVal && p.clubId == null).sort((a, b) => b.ovr - a.ovr)[0];
        if (fa && fa.ovr <= worstVal + 8) {
          signContract(rng, fa, cid, club.div, s.season, 'rotation');
          squad.push(fa);
          dirtyPlayers.add(fa.id);
          s.transfers.push({ season: s.season, week: s.week, pid: fa.id, name: `${fa.first} ${fa.last}`, from: null, to: cid, fee: 0, type: 'free' });
        }
      }
    }
  }
  if (moves) for (const lg of s.leagues) for (const id of lg.clubIds) refreshClubRatings(s.clubs[id], idx.get(id) ?? []);
}

registerSystem({
  name: 'aiTransfers',
  weekly(s, rng, idx) {
    if (isWindowOpen(s.week)) aiWindowWeek(s, rng, idx);
    if (s.transfers.length > 2000) s.transfers.splice(0, s.transfers.length - 2000);
  },
});
