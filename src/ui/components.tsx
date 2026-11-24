import type { ComponentChildren } from 'preact';
import { LINE, type Position } from '../core/data/positions';
import type { Club, Player } from '../core/types';
import { nav } from './store';
import { CardArt, type ArtKey } from './cardArt';

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

/** Generated pixel shield from club colours. */
export function Badge({ club, size = 32 }: { club: Club; size?: number }) {
  const [a, b] = club.colors;
  const pattern = club.id % 4;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shape-rendering="crispEdges" style={{ flex: 'none' }} aria-label={club.name}>
      <path d="M2 1h12v8l-1 2-2 2-3 2-3-2-2-2-1-2z" fill="#070b18" />
      <path d="M3 2h10v7l-1 1-1 2-3 1.6-3-1.6-1-2-1-1z" fill={a} />
      {pattern === 0 && <path d="M7 2h2v11.5l-1 .5-1-.5z" fill={b} />}
      {pattern === 1 && <path d="M3 6h10v2H3z" fill={b} />}
      {pattern === 2 && <path d="M3 2h5v11.5l-3-1.6-1-2-1-1z" fill={b} />}
      {pattern === 3 && <path d="M3 2h10v3H3z" fill={b} />}
      <path d="M3 2h10v1H3z" fill="rgba(255,255,255,.25)" />
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

export function Card({ title, action, children, art }: { title?: ComponentChildren; action?: ComponentChildren; children: ComponentChildren; art?: ArtKey }) {
  return (
    <div class={art ? 'card has-art' : 'card'}>
      {art && <CardArt art={art} />}
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

export function PlayerRow({ p, right, sub, onClick }: { p: Player; right?: ComponentChildren; sub?: ComponentChildren; onClick?: () => void }) {
  return (
    <div class="item" onClick={onClick ?? (() => nav.push({ kind: 'player', id: p.id }))}>
      <Hex value={p.ovr} />
      <div class="grow">
        <div class="name">{p.first[0]}. {p.last}</div>
        <div class="tiny dim row" style={{ gap: 6 }}>
          <PosPill pos={p.pos} /> {sub}
        </div>
      </div>
      {right}
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
