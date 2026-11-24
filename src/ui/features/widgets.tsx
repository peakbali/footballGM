import { money } from '../store';

export function Stepper({ value, onChange, step, min = 0, max = Infinity, fmt = money }: { value: number; onChange: (v: number) => void; step: number; min?: number; max?: number; fmt?: (v: number) => string }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v))));
  return (
    <div class="row" style={{ gap: 6 }}>
      <button class="btn small" onClick={() => set(value - step * 5)}>«</button>
      <button class="btn small" onClick={() => set(value - step)}>-</button>
      <div class="px" style={{ minWidth: 80, textAlign: 'center' }}>{fmt(value)}</div>
      <button class="btn small" onClick={() => set(value + step)}>+</button>
      <button class="btn small" onClick={() => set(value + step * 5)}>»</button>
    </div>
  );
}

export function niceStep(v: number): number {
  if (v <= 0) return 50;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return Math.max(1, (n < 2 ? 0.1 : n < 5 ? 0.25 : 0.5) * p);
}

export function Choice<T extends string | number>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div class="seg" style={{ marginBottom: 6 }}>
      {options.map(([v, l]) => (
        <button key={String(v)} class={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}
