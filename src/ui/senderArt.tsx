import type { ArtKey } from './cardArt';
import type { GameState } from '../core/state';
import type { InboxMessage } from '../core/types';
import { Badge } from './components';
import { Portrait } from './portrait';

/**
 * Who a message is from: a colour, a pixel icon, a banner scene and, for decisions, a portrait (player)
 * or a club badge (rival club). Older messages have no sender and use their category.
 */
export type SenderKind = 'board' | 'sponsor' | 'scout' | 'player' | 'club' | 'staff' | 'fans' | 'press' | 'transfer' | 'squad' | 'office' | 'finance' | 'league';

const PAL: Record<string, string> = { d: '#0b1024', w: '#e8ecff', g: '#ffcc4d', y: '#d9a520', r: '#e0525a', G: '#2f9e57', s: '#5b6694', o: '#ff9640', k: '#0b1024' };

// 12 x 12 sprites. b = the sender's colour, other letters are fixed (see PAL).
const ICONS: Record<string, string[]> = {
  briefcase: ['............', '............', '...kkkkkk...', '...k....k...', '.kkkkkkkkkk.', '.kbbbbbbbbk.', '.kbbbggbbbk.', '.kbbbggbbbk.', '.kbbbbbbbbk.', '.kkkkkkkkkk.', '............', '............'],
  coin: ['............', '....gggg....', '...gyyyyg...', '..gyywwyyg..', '..gywyyyyg..', '..gywwwyyg..', '..gywyyyyg..', '..gywyyyyg..', '..gywwwwyg..', '...gyyyyg...', '....gggg....', '............'],
  magnifier: ['............', '..bbbb......', '.bwwwwb.....', 'bwwwwwwb....', 'bwwwwwwb....', 'bwwwwwwb....', '.bwwwwb.....', '..bbbbb.....', '.....ook....', '......ook...', '.......ook..', '............'],
  shirt: ['............', '.bbbwwwwbbb.', 'bbbbbwwbbbbb', 'bbbbbbbbbbbb', '.bbbbbbbbbb.', '..bbbbbbbb..', '..bbbbbbbb..', '..bbbbbbbb..', '..bbbbbbbb..', '..bbbbbbbb..', '............', '............'],
  house: ['............', '.....bb.....', '....bbbb....', '...bbbbbb...', '..bbbbbbbb..', '.bbbbbbbbbb.', '.bbwwbbwwbb.', '.bbwwbbwwbb.', '.bbbbggbbbb.', '.bbbbggbbbb.', '.bbbbggbbbb.', '............'],
  cross: ['............', '....rrrr....', '....rwwr....', '..rrrwwrrr..', '..rwwwwwwr..', '..rwwwwwwr..', '..rrrwwrrr..', '....rwwr....', '....rrrr....', '............', '............', '............'],
  flag: ['.s..........', '.sbbbbbbbb..', '.sbbwwwwbbb.', '.sbbwwwwbbb.', '.sbbbbbbbb..', '.s..........', '.s..........', '.s..........', '.s..........', '.s..........', 'ssss........', '............'],
  mic: ['....kkkk....', '...kwwwwk...', '...kwwwwk...', '...kwwwwk...', '...kkkkkk...', '.k..kbbk..k.', '.k..kbbk..k.', '.kkkkbbkkkk.', '......bb....', '......bb....', '....bbbbbb..', '............'],
  arrows: ['............', '..bb........', '..bbb.......', 'bbbbbbbbbb..', '..bbb.......', '..bb........', '........bb..', '.......bbb..', '..bbbbbbbbbb', '.......bbb..', '........bb..', '............'],
  clip: ['....kkkk....', '...ksssk....', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwbbbbbbwk.', '.kwwwwwwwwk.', '.kwbbbbbwwk.', '.kwwwwwwwwk.', '.kwbbbbbbwk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............'],
  cup: ['............', '.gg.gggg.gg.', '.g.gggggg.g.', '.g.gggggg.g.', '..gggggggg..', '...gggggg...', '....gggg....', '.....gg.....', '.....gg.....', '....gggg....', '...kkkkkk...', '............'],
};

export const KINDS: Record<SenderKind, { label: string; color: string; icon: string; art: ArtKey }> = {
  board: { label: 'The Board', color: '#8a5ac8', icon: 'briefcase', art: 'board' },
  sponsor: { label: 'Sponsor', color: '#e0a020', icon: 'coin', art: 'sponsors' },
  scout: { label: 'Scouting', color: '#3aa0d8', icon: 'magnifier', art: 'staff' },
  player: { label: 'Player', color: '#38b26a', icon: 'shirt', art: 'training' },
  club: { label: 'Club', color: '#5a78e0', icon: 'house', art: 'stadium' },
  staff: { label: 'Medical', color: '#e0525a', icon: 'cross', art: 'whistle' },
  fans: { label: 'Supporters', color: '#e8803a', icon: 'flag', art: 'tickets' },
  press: { label: 'Press', color: '#8e9ad8', icon: 'mic', art: 'scoreboard' },
  transfer: { label: 'Transfers', color: '#3aa0d8', icon: 'arrows', art: 'staff' },
  squad: { label: 'Squad', color: '#38b26a', icon: 'shirt', art: 'training' },
  office: { label: 'Staff', color: '#9a7a52', icon: 'clip', art: 'staff' },
  finance: { label: 'Finance', color: '#d9a520', icon: 'coin', art: 'money' },
  league: { label: 'League', color: '#d9b45c', icon: 'cup', art: 'trophy' },
};

const CAT_KIND: Record<InboxMessage['cat'], SenderKind> = { Transfers: 'transfer', Squad: 'squad', Staff: 'office', Finance: 'finance', Board: 'board', League: 'league', Club: 'club' };

export const senderKind = (m: InboxMessage): SenderKind => m.from?.kind ?? CAT_KIND[m.cat];

export function Pixel({ icon, color, size = 28 }: { icon: string; color: string; size?: number }) {
  const rows = ICONS[icon] ?? ICONS.clip;
  const rects: { x: number; y: number; w: number; c: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      if (ch !== '.') rects.push({ x, y, w, c: ch === 'b' ? color : PAL[ch] ?? color });
      x += w;
    }
  });
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} shape-rendering="crispEdges" aria-hidden="true" style={{ display: 'block' }}>
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />)}
    </svg>
  );
}

/** Round tile: a player's portrait, a club badge, or the sender's pixel icon on its colour. */
export function Avatar({ s, m, size = 36 }: { s: GameState; m: InboxMessage; size?: number }) {
  const kind = senderKind(m);
  const k = KINDS[kind];
  const p = m.from?.pid != null ? s.players.get(m.from.pid) : undefined;
  const club = m.from?.club != null ? s.clubs[m.from.club] : undefined;
  let inner;
  if (kind === 'club' && club) inner = <Badge club={club} size={size - 8} />;
  else if (p && (kind === 'player' || kind === 'staff')) inner = <Portrait p={p} size={size - 4} />;
  else inner = <Pixel icon={k.icon} color={k.color} size={size - 12} />;
  return (
    <span class="avatar" style={{ width: size, height: size, borderColor: k.color, background: `linear-gradient(180deg, ${k.color}33, ${k.color}14)` }}>
      {inner}
    </span>
  );
}
