/**
 * Pre-season (DESIGN 13.2za): the first four weeks of every season have no matches. Continue stops at the start of
 * pre-season and after each of its weeks, and each week brings one update: the board's new targets and sponsors,
 * the scouts' transfer targets, the staff market, and a final check before the opening match.
 */
import { CAL, type GameState } from '../state';
import type { Player } from '../types';
import { registerSystem } from '../systems';
import { addMessage } from '../season';
import { boardState } from './board';
import { refreshStaffPool, roleLabel } from './staff';
import { autoPick, teamOvr } from '../selection';

export const PRE_WEEKS = 4;
export const inPreseason = (s: GameState) => s.week >= 1 && s.week <= PRE_WEEKS;

const fmt = (n: number) => (n >= 1e6 ? `£${(n / 1e6).toFixed(1)}m` : n >= 1e3 ? `£${Math.round(n / 1e3)}k` : `£${n}`);
const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

function weekOne(s: GameState): string {
  const lines = [`Four weeks of pre-season: no matches, just business. The transfer window is open until week ${CAL.summerWindowEnd}.`];
  const goals = boardState(s).goals;
  if (goals.length) lines.push('', 'The board\'s targets this season:', ...goals.map((g) => `• ${g.text}`));
  const offered = s.sponsors.filter((d) => d.status === 'offered').length;
  lines.push('', offered ? `Sponsors: ${offered} offer${offered > 1 ? 's' : ''} waiting for you in the inbox.` : 'Sponsors: no new offers this summer.');
  const leaving = s.staff.filter((x) => x.endSeason === s.season);
  if (leaving.length) lines.push(`Staff: ${leaving.map((x) => `${x.first} ${x.last} (${roleLabel(x.role).toLowerCase()})`).join(', ')} ${leaving.length > 1 ? 'are' : 'is'} in the last year of contract.`);
  return lines.join('\n');
}

function weekTwo(s: GameState): string {
  const lines = ['Your scouts report back on summer targets.'];
  const picks = s.scouting.shortlist.map((id) => s.players.get(id)).filter((p): p is Player => !!p && p.clubId !== s.userClubId).slice(0, 6);
  if (picks.length) {
    lines.push('', 'Top of the shortlist:');
    for (const p of picks) {
      const r = s.scouting.reports[p.id];
      const ovr = r && typeof r.ovr === 'number' ? r.ovr : '?';
      lines.push(`• ${p.first} ${p.last} (${p.pos}, ${s.season - p.birthYear}), OVR ${ovr}, POT ${r?.pot ?? '?'}${p.clubId == null ? ', free agent' : ''}`);
    }
  } else lines.push('', 'No recommendations yet. Give your scout an assignment in the Transfers tab.');
  const bids = s.offers.filter((o) => o.seller === s.userClubId && o.status === 'pending' && o.season === s.season);
  if (bids.length) lines.push('', `Bids for your players: ${bids.map((o) => { const p = s.players.get(o.pid); return p ? `${p.last} (${fmt(o.fee)})` : ''; }).filter(Boolean).join(', ')}.`);
  const squad = [...s.players.values()].filter((p) => p.clubId === s.userClubId).length;
  lines.push('', `Squad size: ${squad}.`);
  return lines.join('\n');
}

function weekThree(s: GameState, rng: Parameters<typeof refreshStaffPool>[1]): string {
  refreshStaffPool(s, rng); // fresh candidates for the staff market
  const lines = ['New staff are on the market this week.'];
  const better: string[] = [];
  const roles = [...new Set(s.staffPool.map((x) => x.role))];
  for (const role of roles) {
    const best = s.staffPool.filter((x) => x.role === role).sort((a, b) => b.level - a.level)[0];
    const mine = s.staff.filter((x) => x.role === role).reduce((m, x) => Math.max(m, x.level), 0);
    if (best && best.level >= mine + 5) better.push(`• ${roleLabel(role)}: ${best.first} ${best.last}, level ${Math.round(best.level)} (yours ${mine ? Math.round(mine) : 'none'}), ${fmt(best.wage)}/wk`);
  }
  if (better.length) lines.push('', 'Upgrades available:', ...better.slice(0, 6), '', 'Hire them from Club > Staff.');
  else lines.push('', 'Nobody better than your current staff this time.');
  return lines.join('\n');
}

function weekFour(s: GameState): string {
  const club = s.clubs[s.userClubId];
  const lg = s.leagues.find((l) => l.clubIds.includes(club.id))!;
  const lines = ['Last week of pre-season. The league starts next.'];
  const f = s.fixtures.filter((x) => x.week >= CAL.firstRoundWeek && (x.home === club.id || x.away === club.id) && !x.cup).sort((a, b) => a.week - b.week)[0];
  if (f) {
    const opp = s.clubs[f.home === club.id ? f.away : f.home];
    lines.push('', `Opening match: ${f.home === club.id ? 'home to' : 'away at'} ${opp.name} in week ${f.week}.`);
  }
  const idx = new Map<number, Player[]>();
  for (const p of s.players.values()) if (p.clubId != null && lg.clubIds.includes(p.clubId)) (idx.get(p.clubId) ?? idx.set(p.clubId, []).get(p.clubId)!).push(p);
  const ovr = (id: number) => teamOvr(autoPick(idx.get(id) ?? [], s.clubs[id].formation, 7, id === club.id));
  const mine = ovr(club.id);
  const rank = 1 + lg.clubIds.filter((id) => id !== club.id && ovr(id) > mine).length;
  lines.push(`Squad strength: ${ord(rank)} of ${lg.clubIds.length} in ${lg.short} (OVR ${Math.round(mine)}).`);
  const mineP = idx.get(club.id) ?? [];
  const hurt = mineP.filter((p) => p.injury > 0);
  if (hurt.length) lines.push(`Injured: ${hurt.map((p) => p.last).join(', ')}.`);
  const ending = mineP.filter((p) => p.contract?.type === 'permanent' && p.contract.endSeason === s.season);
  if (ending.length) lines.push(`Contracts ending this season: ${ending.length}. Renew the ones you want to keep from the Squad tab.`);
  lines.push('', `The window stays open until week ${CAL.summerWindowEnd}.`);
  return lines.join('\n');
}

const TITLES = ['welcome back', 'transfer targets', 'staff market', 'ready for kick-off'];

registerSystem({
  name: 'preseason',
  weekly(s, rng, _idx, res) {
    // Continue stops when pre-season starts (after the last off-season week) and after each pre-season week
    if (s.week === CAL.weeks || inPreseason(s)) res.stop = true;
    if (!inPreseason(s)) return;
    const n = s.week;
    const body = n === 1 ? weekOne(s) : n === 2 ? weekTwo(s) : n === 3 ? weekThree(s, rng) : weekFour(s);
    addMessage(s, { cat: 'Club', title: `Pre-season ${n}/${PRE_WEEKS}: ${TITLES[n - 1]}`, body });
  },
});
