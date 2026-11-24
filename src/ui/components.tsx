import type { ComponentChildren } from 'preact';
import { LINE, type Position } from '../core/data/positions';
import type { Club, Player } from '../core/types';
import { nav } from './store';
import { CardArt, type ArtKey } from './cardArt';
import { Portrait } from './portrait';

/** Hexagon OVR badge (reference style). `value` null = unknown "?". */
export function Hex({ value, size = 34, label, color }: { value: number | string | null; size?: number; label?: string; color?: string }) {
  const v = typeof value === 'number' ? value : null;
  const c = color ?? (v == null ? '#4a5590' : ovrColor(v));
  const h = size;
  const w = size * 0.9;
  return (
    <svg width={w} height={h} viewBox="0 0 36 40" style={{ flex: 'none' }} aria-label={label ?? `OVR ${value ?? '?'}`}>
      <polygon points="18,1 34,10 34,30 18,39 2,30 2,10" fill={c} stroke="#070b18" stroke-width="2" />
      <polygon points="18,4 31,11.5 31,13 18,6 5,13 5,11.5" fill="rgba(255,255,255,.25)" />
      <text x="18" y="25" text-anchor="middle" font-family="Silkscreen, monospace" font-size={String(value ?? '?').length > 2 ? 11 : 14} fill="#0b1020">{value ?? '?'}</text>
    </svg>
  );
}

export function ovrColor(v: number): string {
  if (v >= 85) return '#ffcc4d';
  if (v >= 75) return '#9be15d';
  if (v >= 65) return '#3ddc84';
  if (v >= 55) return '#2fbfa8';
  if (v >= 45) return '#5aa8ff';
  if (v >= 35) return '#8c96c4';
  return '#6b7090';
}

/** Crest outlines (outer, dark) and fills (inner, also the clip for the pattern), by CREST_SHAPES index. */
const SHAPES: { outer: string; inner: string }[] = [
  { outer: 'M2 1h12v8l-1 2-2 2-3 2-3-2-2-2-1-2z', inner: 'M3 2h10v7l-1 1-1 2-3 1.6-3-1.6-1-2-1-1z' },
  { outer: 'M8 .5a7.5 7.5 0 1 1 0 15a7.5 7.5 0 1 1 0-15z', inner: 'M8 1.6a6.4 6.4 0 1 1 0 12.8a6.4 6.4 0 1 1 0-12.8z' },
  { outer: 'M1 1h14v14H1z', inner: 'M2 2h12v12H2z' },
  { outer: 'M8 .3L15.7 8 8 15.7 .3 8z', inner: 'M8 1.8L14.2 8 8 14.2 1.8 8z' },
  { outer: 'M1 1h14v6c0 4-3 7-7 8.5C4 14 1 11 1 7z', inner: 'M2 2h12v5c0 3.4-2.5 6-6 7.4C4.5 13 2 10.4 2 7z' },
];
/** Second-colour patterns, drawn inside the clip, by CREST_PATTERNS index. */
const PATTERNS: string[] = [
  'M7 0h2v16H7z',
  'M0 6h16v2H0z',
  'M0 0h8v16H0z',
  'M0 0h16v5H0z',
  '',
  'M0 5l8 5 8-5v3l-8 5-8-5z',
  'M0 0h8v8H0zM8 8h8v8H8z',
  'M3 0h2v16H3zM7 0h2v16H7zM11 0h2v16h-2z',
  'M0 4h16v2H0zM0 8h16v2H0zM0 12h16v2H0z',
  'M-1 3l4-4 14 14-4 4z',
];
/** Small centre emblems, by CREST_ICONS index (0 = none). */
const ICONS: string[] = [
  '',
  'M8 4.3l1.1 2.3 2.5.3-1.9 1.7.5 2.5L8 9.8l-2.2 1.3.5-2.5-1.9-1.7 2.5-.3z',
  'M8 5a3 3 0 1 1 0 6a3 3 0 1 1 0-6z',
  'M4.8 10.6h6.4V6.3L9.6 7.9 8 5.3 6.4 7.9 4.8 6.3z',
  'M5.4 5h1.1v1h1V5h1v1h1V5h1.1v2.2h-.8v3.9H6.2V7.2h-.8z',
  'M7 4.4h2v2.6h2.6v2H9v3H7v-3H4.4V7H7z',
  'M7.5 4.4h1v1.1h.6v1h-.6v3.7c1 0 1.8-.6 2.2-1.4l.9.4c-.6 1.3-1.9 2.1-3.6 2.1s-3-.8-3.6-2.1l.9-.4c.4.8 1.2 1.4 2.2 1.4V6.5h-.6v-1h.6z',
  'M8 4.3c1.7 0 2.9 1.2 2.9 2.7 0 1.4-1 2.4-2.4 2.5v2h-1v-2C6.1 9.4 5.1 8.4 5.1 7c0-1.5 1.2-2.7 2.9-2.7z',
];

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/** Pixel crest from the club's colours and crest design (DESIGN 13.2k). Clubs without a design keep the original shield. */
export function Badge({ club, size = 32 }: { club: Pick<Club, 'id' | 'name' | 'colors' | 'crest'>; size?: number }) {
  const [a, b] = club.colors;
  const cr = club.crest ?? { shape: 0, pattern: club.id % 4, icon: 0 };
  const sh = SHAPES[cr.shape] ?? SHAPES[0];
  const pat = PATTERNS[cr.pattern] ?? '';
  const icon = ICONS[cr.icon] ?? '';
  const clip = `crest-clip-${cr.shape}`;
  const ic = cr.iconColor ?? (lum(a) > 0.7 ? '#111111' : '#ffffff');
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shape-rendering={cr.shape === 1 || cr.shape === 4 ? 'auto' : 'crispEdges'} style={{ flex: 'none' }} aria-label={club.name}>
      <defs><clipPath id={clip}><path d={sh.inner} /></clipPath></defs>
      <path d={sh.outer} fill="#070b18" />
      <path d={sh.inner} fill={a} />
      <g clip-path={`url(#${clip})`}>
        {pat && <path d={pat} fill={b} />}
        <rect x="0" y="0" width="16" height="3" fill="rgba(255,255,255,.22)" />
      </g>
      {icon && <path d={icon} fill="#070b18" opacity=".55" transform="translate(.5 .5)" />}
      {icon && <path d={icon} fill={ic} />}
    </svg>
  );
}

export function PosPill({ pos }: { pos: Position }) {
  return <span class={`pill pos-${LINE[pos]}`}>{pos}</span>;
}

export function Form({ form }: { form: string }) {
  return (
    <span class="form">
      {form.split('').map((c, i) => (
        <span key={i} class={c}>{c}</span>
      ))}
    </span>
  );
}

export function Card({ title, action, children, art, wide, cls }: { title?: ComponentChildren; action?: ComponentChildren; children: ComponentChildren; art?: ArtKey; wide?: boolean; cls?: string }) {
  return (
    <div class={`${art ? 'card has-art' : 'card'}${cls ? ` ${cls}` : ''}`}>
      {art && <CardArt art={art} wide={wide} />}
      {title && (
        <h3>
          <span>{title}</span>
          {action}
        </h3>
      )}
      {children}
    </div>
  );
}

export function Overlay({ title, sub, children, right }: { title: ComponentChildren; sub?: ComponentChildren; children: ComponentChildren; right?: ComponentChildren }) {
  return (
    <div class="overlay">
      <div class="topbar">
        <button class="back" onClick={() => nav.pop()} aria-label="Back">‹</button>
        <div style={{ minWidth: 0 }}>
          <div class="title">{title}</div>
          {sub && <div class="sub">{sub}</div>}
        </div>
        <div class="spacer" />
        {right}
      </div>
      <div class="content">{children}</div>
    </div>
  );
}

export function Bar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const c = color ?? (pct > 70 ? 'var(--green)' : pct > 40 ? 'var(--amber)' : 'var(--red)');
  return (
    <div class="bar">
      <div style={{ width: `${pct}%`, background: c }} />
    </div>
  );
}

export function PlayerRow({ p, right, sub, onClick, compact }: { p: Player; right?: ComponentChildren; sub?: ComponentChildren; onClick?: () => void; compact?: boolean }) {
  return (
    <div class={compact ? 'item sq-item' : 'item'} onClick={onClick ?? (() => nav.push({ kind: 'player', id: p.id }))}>
      <Portrait p={p} size={compact ? 32 : undefined} />
      <div class="grow">
        <div class="name">{p.first[0]}. {p.last}</div>
        <div class="tiny dim row" style={{ gap: 6 }}>
          <PosPill pos={p.pos} /> {sub}
        </div>
      </div>
      {right}
      <Hex value={p.ovr} size={compact ? 28 : undefined} />
    </div>
  );
}

export function Icon({ name }: { name: 'hub' | 'squad' | 'transfers' | 'club' | 'league' }) {
  const paths: Record<string, string> = {
    hub: 'M2 9l6-6 6 6v6h-4v-4H6v4H2z',
    squad: 'M5 2h6v3h3v9H2V5h3zM7 4v2h2V4z',
    transfers: 'M1 5h10V3l4 3-4 3V7H1zM15 11H5v2l-4-3 4-3v2h10z',
    club: 'M2 6l6-4 6 4v1H2zM3 8h2v5H3zm4 0h2v5H7zm4 0h2v5h-2zM1 14h14v1H1z',
    league: 'M3 2h10v3a5 5 0 01-4 4.9V12h3v2H4v-2h3V9.9A5 5 0 013 5zM1 3h2v3H1zm12 0h2v3h-2z',
  };
  return (
    <svg viewBox="0 0 16 16" shape-rendering="crispEdges">
      <path d={paths[name]} fill="currentColor" />
    </svg>
  );
}
