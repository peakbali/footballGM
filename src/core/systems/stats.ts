import type { GameState } from '../state';
import type { TransferRecord } from '../types';
import { registerSystem } from '../systems';

/**
 * Career counters for the user's club that cannot be rebuilt from the season history: streaks, transfer
 * counts and so on. Achievements read these (they are not tied to which club you picked).
 */
export interface UserStats {
  w: number; d: number; l: number; gf: number; ga: number; cs: number;
  streakW: number; bestW: number; streakU: number; bestU: number; streakL: number; bestL: number; streakCS: number; bestCS: number;
  bigWin: number; bigLoss: number; highScore: number;
  buys: number; sells: number; frees: number; loansIn: number; loansOut: number; releases: number;
  spent: number; earned: number; maxBuy: number; maxSell: number; grads: number;
}

export function userStats(s: GameState): UserStats {
  return ((s.ext.stats as UserStats | undefined) ??= {
    w: 0, d: 0, l: 0, gf: 0, ga: 0, cs: 0,
    streakW: 0, bestW: 0, streakU: 0, bestU: 0, streakL: 0, bestL: 0, streakCS: 0, bestCS: 0,
    bigWin: 0, bigLoss: 0, highScore: 0,
    buys: 0, sells: 0, frees: 0, loansIn: 0, loansOut: 0, releases: 0,
    spent: 0, earned: 0, maxBuy: 0, maxSell: 0, grads: 0,
  });
}

export function bumpStat(s: GameState, key: keyof UserStats, n = 1) {
  userStats(s)[key] += n;
}

/** Call right after a transfer is pushed to the log. */
export function noteTransfer(s: GameState, r: TransferRecord) {
  const st = userStats(s);
  const loan = r.type.startsWith('loan');
  if (r.to === s.userClubId) {
    if (loan) st.loansIn++;
    else if (r.type === 'free' || r.from == null) st.frees++;
    else { st.buys++; st.spent += r.fee; st.maxBuy = Math.max(st.maxBuy, r.fee); }
  } else if (r.from === s.userClubId && r.to != null) {
    if (loan) st.loansOut++;
    else { st.sells++; st.earned += r.fee; st.maxSell = Math.max(st.maxSell, r.fee); }
  }
}

registerSystem({
  name: 'stats',
  weekly(s) {
    const st = userStats(s);
    for (const f of s.fixtures) {
      if (f.week !== s.week || f.hg == null || f.cup || f.div <= 0) continue;
      const home = f.home === s.userClubId;
      if (!home && f.away !== s.userClubId) continue;
      const gf = home ? f.hg : f.ag!;
      const ga = home ? f.ag! : f.hg;
      st.gf += gf; st.ga += ga;
      st.highScore = Math.max(st.highScore, gf);
      if (ga === 0) { st.cs++; st.streakCS++; st.bestCS = Math.max(st.bestCS, st.streakCS); } else st.streakCS = 0;
      if (gf > ga) {
        st.w++; st.streakW++; st.streakU++; st.streakL = 0;
        st.bigWin = Math.max(st.bigWin, gf - ga);
      } else if (gf === ga) {
        st.d++; st.streakW = 0; st.streakU++; st.streakL = 0;
      } else {
        st.l++; st.streakW = 0; st.streakU = 0; st.streakL++;
        st.bigLoss = Math.max(st.bigLoss, ga - gf);
      }
      st.bestW = Math.max(st.bestW, st.streakW);
      st.bestU = Math.max(st.bestU, st.streakU);
      st.bestL = Math.max(st.bestL, st.streakL);
    }
  },
});
