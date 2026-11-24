/**
 * Local-only import of real player ratings (DESIGN 3.4, DATA_FEASIBILITY.md).
 *
 *   1. Download an EA FC 26 player CSV (SoFIFA-style columns) yourself, e.g. from Kaggle.
 *   2. Put it in data/private/ (that folder and every *.csv are ignored by git).
 *   3. npm run import:eafc            (or: npm run import:eafc -- path/to/file.csv)
 *
 * It writes data/private/real-players.json. The game picks it up in local builds only; without it
 * every player is generated. Never commit either file: EA data is fine for a private build only.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { A, ATTRS, POSITIONS, type Position } from '../src/core/data/positions';
import { posOvr } from '../src/core/ratings';

/** Surname from a name's words: the last word plus any lower-case particles before it ("van Dijk", "de la Cruz"). */
const PARTICLES = new Set(['de', 'van', 'von', 'der', 'den', 'da', 'das', 'dos', 'di', 'del', 'della', 'la', 'le', 'el', 'al', 'bin', 'ter', 'ten', 'du', 'dos', 'e']);
function surname(words: string[]): string {
  let i = words.length - 1;
  while (i > 0 && PARTICLES.has(words[i - 1].toLowerCase()) && words[i - 1] === words[i - 1].toLowerCase()) i--;
  return words.slice(i).join(' ');
}
import type { RealData, RealPlayer } from '../src/core/realData';

const DIR = 'data/private';
const OUT = join(DIR, 'real-players.json');
const SEASON = 2025;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// SoFIFA / EA column names, with a few alternatives seen in different dumps
const COL: Record<string, string[]> = {
  short: ['short_name', 'name', 'Name'],
  long: ['long_name', 'full_name', 'Full Name'],
  pos: ['player_positions', 'positions', 'Position', 'position'],
  ovr: ['overall', 'OVR', 'Overall'],
  pot: ['potential', 'Potential', 'POT'],
  age: ['age', 'Age'],
  dob: ['dob', 'birth_date', 'Date of Birth'],
  nat: ['nationality_name', 'nationality', 'Nation', 'country'],
  club: ['club_name', 'club', 'Team', 'team'],
  league: ['league_name', 'league', 'League'],
  foot: ['preferred_foot', 'foot', 'Preferred foot'],
};

// our attribute <- one or more source columns (averaged)
const MAP: Record<string, string[]> = {
  finishing: ['attacking_finishing'], longShots: ['power_long_shots'], passing: ['attacking_short_passing', 'skill_long_passing'],
  crossing: ['attacking_crossing'], dribbling: ['skill_dribbling'], firstTouch: ['skill_ball_control'], heading: ['attacking_heading_accuracy'],
  tackling: ['defending_standing_tackle', 'defending_sliding_tackle'], marking: ['defending_marking_awareness', 'defending_marking'],
  setPieces: ['skill_fk_accuracy', 'skill_curve'], vision: ['mentality_vision'], decisions: ['movement_reactions', 'mentality_composure'],
  composure: ['mentality_composure'], positioning: ['mentality_interceptions', 'defending_marking_awareness'], offTheBall: ['mentality_positioning'],
  anticipation: ['movement_reactions'], workRate: ['power_stamina', 'mentality_aggression'], aggression: ['mentality_aggression'],
  leadership: ['mentality_composure'], pace: ['movement_sprint_speed'], acceleration: ['movement_acceleration'], stamina: ['power_stamina'],
  strength: ['power_strength'], agility: ['movement_agility', 'movement_balance'], jumping: ['power_jumping'],
  reflexes: ['goalkeeping_reflexes'], handling: ['goalkeeping_handling'], oneOnOnes: ['goalkeeping_diving'], aerialCommand: ['goalkeeping_positioning', 'goalkeeping_handling'],
  kicking: ['goalkeeping_kicking'], gkPositioning: ['goalkeeping_positioning'],
};
// face-stat fallbacks when detailed columns are missing
const FACE: Record<string, string> = {
  finishing: 'shooting', longShots: 'shooting', passing: 'passing', crossing: 'passing', dribbling: 'dribbling', firstTouch: 'dribbling',
  tackling: 'defending', marking: 'defending', positioning: 'defending', pace: 'pace', acceleration: 'pace', strength: 'physic', stamina: 'physic',
};

const POS_MAP: Record<string, Position> = { GK: 'GK', CB: 'CB', LB: 'LB', RB: 'RB', LWB: 'LWB', RWB: 'RWB', CDM: 'DM', DM: 'DM', CM: 'CM', CAM: 'AM', AM: 'AM', LM: 'LM', RM: 'RM', LW: 'LW', RW: 'RW', ST: 'ST', CF: 'ST', LF: 'LW', RF: 'RW', LCB: 'CB', RCB: 'CB' };

const NAT: Record<string, string> = {
  England: 'ENG', Scotland: 'SCO', Wales: 'WAL', 'Northern Ireland': 'NIR', 'Republic of Ireland': 'IRL', Ireland: 'IRL', France: 'FRA', Spain: 'ESP',
  Germany: 'GER', Italy: 'ITA', Portugal: 'POR', Netherlands: 'NED', Holland: 'NED', Belgium: 'BEL', Brazil: 'BRA', Argentina: 'ARG', Nigeria: 'NGA',
  Ghana: 'GHA', Jamaica: 'JAM', Denmark: 'DEN', Poland: 'POL', Norway: 'NOR', Sweden: 'SWE', 'United States': 'USA', Uruguay: 'URU', Colombia: 'COL',
  Croatia: 'CRO', Serbia: 'SRB', Switzerland: 'SUI', Austria: 'AUT', Senegal: 'SEN', "Côte d'Ivoire": 'CIV', 'Ivory Coast': 'CIV', Morocco: 'MAR',
  Japan: 'JPN', 'Korea Republic': 'KOR', 'South Korea': 'KOR', Mexico: 'MEX', Canada: 'CAN', Australia: 'AUS', Egypt: 'EGY', Cameroon: 'CMR',
};

function pick(header: string[], keys: string[]): number {
  for (const k of keys) {
    const i = header.indexOf(k);
    if (i >= 0) return i;
  }
  return -1;
}

function main() {
  const arg = process.argv[2];
  const file = arg ?? (existsSync(DIR) ? readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.csv')).map((f) => join(DIR, f))[0] : undefined);
  if (!file || !existsSync(file)) {
    console.error(`No CSV found. Put an EA FC 26 player CSV in ${DIR}/ or pass its path.`);
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const header = rows[0].map((h) => h.trim());
  const col = Object.fromEntries(Object.entries(COL).map(([k, v]) => [k, pick(header, v)])) as Record<keyof typeof COL, number>;
  if (col.ovr < 0 || col.pos < 0 || col.club < 0) {
    console.error('The CSV needs at least overall, positions and club columns. Found:', header.slice(0, 30).join(', '));
    process.exit(1);
  }
  const src = Object.fromEntries(header.map((h, i) => [h, i]));
  const num = (r: string[], c: string) => (src[c] != null ? parseFloat(r[src[c]]) : NaN);

  const players: RealPlayer[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const club = r[col.club]?.trim();
    const ovr = parseInt(r[col.ovr], 10);
    const posList = (r[col.pos] ?? '').split(/[,/ ]+/).map((x) => POS_MAP[x.trim().toUpperCase()]).filter(Boolean) as Position[];
    if (!club || !ovr || !posList.length) { skipped++; continue; }
    const pos = posList[0];
    const attrs = ATTRS.map((a) => {
      const vals = (MAP[a] ?? []).map((c) => num(r, c)).filter((v) => !isNaN(v));
      if (vals.length) return vals.reduce((x, y) => x + y, 0) / vals.length;
      const f = FACE[a] ? num(r, FACE[a]) : NaN;
      return isNaN(f) ? ovr - 5 : f;
    });
    // outfielders: low GK values; keepers: outfield values pulled down
    if (pos !== 'GK') for (let i = A.reflexes; i < ATTRS.length; i++) attrs[i] = Math.min(attrs[i], 25);
    // calibrate so the game's position formula reproduces the source overall
    for (let it = 0; it < 4; it++) {
      const d = ovr - posOvr(attrs.map((v) => Math.max(1, Math.min(99, v))), pos);
      if (Math.abs(d) < 0.5) break;
      for (let i = 0; i < ATTRS.length; i++) if (pos === 'GK' ? i >= A.reflexes : i < A.reflexes) attrs[i] += d;
    }
    const long = col.long >= 0 ? r[col.long] : '';
    const short = col.short >= 0 ? r[col.short] : long;
    const full = (long || short).trim().split(/\s+/);
    const last = surname((short || long).trim().split(/\s+/)) || full.slice(-1)[0];
    const first = full.length > 1 ? full[0] : '';
    const dob = col.dob >= 0 ? r[col.dob] : '';
    const birthYear = dob && /^\d{4}/.test(dob) ? parseInt(dob.slice(0, 4), 10) : SEASON - (parseInt(r[col.age], 10) || 25);
    const natName = col.nat >= 0 ? r[col.nat]?.trim() ?? '' : '';
    const foot = (col.foot >= 0 ? r[col.foot] : 'Right').toLowerCase().startsWith('l') ? 'L' : 'R';
    players.push({
      first, last, birthYear,
      nat: NAT[natName] ?? (natName.slice(0, 3).toUpperCase() || 'ENG'),
      club, league: col.league >= 0 ? r[col.league] : undefined,
      pos, alt: [...new Set(posList.slice(1))].filter((p) => POSITIONS.includes(p)),
      foot, ovr, pot: col.pot >= 0 ? parseInt(r[col.pot], 10) || ovr : ovr,
      attrs: attrs.map((v) => Math.round(Math.max(1, Math.min(99, v)))),
    });
  }
  const data: RealData = { version: 1, source: file.split(/[\\/]/).pop()!, season: SEASON, players };
  mkdirSync(DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(data));
  const clubs = new Set(players.map((p) => p.club)).size;
  console.log(`Wrote ${OUT}: ${players.length} players from ${clubs} clubs (${skipped} rows skipped).`);
  console.log('Rebuild or restart the dev server and start a new career to use them. Do not commit this file.');
}

main();
