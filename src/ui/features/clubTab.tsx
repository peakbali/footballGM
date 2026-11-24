import { useState } from 'preact/hooks';
import { userClub, type GameState } from '../../core/state';
import { projection, ticketRange, totals, userWageBill, staffWageBill, upkeep } from '../../core/systems/finance';
import { STAFF_ROLES, staffCap, maxScouts } from '../../core/systems/staff';
import { ECONOMY } from '../../core/data/economy';
import type { FinCat, Staff, StaffRole } from '../../core/types';
import { INCOME_CATS, COST_CATS } from '../../core/types';
import { Card } from '../components';
import { money, store, useStore } from '../store';
import { setClubScreen } from '../tabs';
import { Stepper } from './widgets';
import { clubSections } from './clubSections';

const LABEL: Record<FinCat, string> = {
  gate: 'Gate receipts', tv: 'TV & central', prize: 'Prize money', sponsor: 'Sponsors', merch: 'Merchandise', sales: 'Player sales', other_in: 'Other income',
  wages: 'Player wages', staff: 'Staff wages', upkeep: 'Upkeep', build: 'Construction', purchases: 'Transfer fees', other_out: 'Other costs',
};

export function CashChart({ s }: { s: GameState }) {
  const pts = s.fin.cashHistory.slice(-52);
  if (pts.length < 2) return null;
  const vals = pts.map((p) => p.cash);
  const min = Math.min(0, ...vals);
  const max = Math.max(1, ...vals);
  const W = 300, H = 70;
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * (H - 6) - 3;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 70 }}>
      {min < 0 && <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--red)" stroke-dasharray="3 3" stroke-width="1" />}
      <path d={d} fill="none" stroke="var(--gold)" stroke-width="2" />
    </svg>
  );
}

function Finances({ s }: { s: GameState }) {
  const c = userClub(s);
  const pr = projection(s);
  const t = totals(s.fin.season);
  const last = totals(s.fin.last);
  const [lo, hi] = ticketRange(c, s);
  return (
    <>
      <Card title="Finances" art="money">
        <div class="kv">
          <span>Cash</span><b class={c.cash < 0 ? 'red' : 'gold'}>{money(c.cash)}</b>
          <span>Projected 30 June</span><b class={pr.end < 0 ? 'red' : 'green'}>{money(pr.end)}</b>
          <span>Weekly costs</span><span>{money(pr.weeklyCost)} <span class="tiny dim">(wages {money(userWageBill(s))}, staff {money(staffWageBill(s))}, upkeep {money(upkeep(s))})</span></span>
          <span>Weekly income (avg)</span><span>{money(pr.weeklyIncome)}</span>
          <span>Expected prize money</span><span>{money(pr.prize)}</span>
        </div>
        <CashChart s={s} />
        {c.cash < 0 && <div class="red small">You can't start transfers or building work with negative cash.</div>}
      </Card>
      <Card title={`This season · net ${money(t.net)}`}>
        {INCOME_CATS.filter((k) => s.fin.season[k]).map((k) => <div class="between small" key={k} style={{ padding: '3px 0' }}><span>{LABEL[k]}</span><span class="green">{money(s.fin.season[k]!)}</span></div>)}
        {COST_CATS.filter((k) => s.fin.season[k]).map((k) => <div class="between small" key={k} style={{ padding: '3px 0' }}><span>{LABEL[k]}</span><span class="red">{money(s.fin.season[k]!)}</span></div>)}
        {Object.keys(s.fin.last).length > 0 && <div class="tiny dim" style={{ marginTop: 6 }}>Last season: income {money(last.inc)}, costs {money(-last.cost)}, net {money(last.net)}</div>}
      </Card>
      <Card title="Tickets" art="tickets">
        <div class="between"><span class="small">Price</span><Stepper value={c.ticket} onChange={(v) => { c.ticket = v; store.bump(); }} step={1} min={lo} max={hi} fmt={(v) => `£${v}`} /></div>
        <div class="tiny dim" style={{ marginTop: 6 }}>Division average £{ECONOMY[c.div].ticket}. Cheaper tickets bring bigger crowds. Last crowd: {c.lastAttendance?.toLocaleString() ?? '-'} of {c.capacity.toLocaleString()}.</div>
      </Card>
    </>
  );
}

function Sponsors({ s }: { s: GameState }) {
  const active = s.sponsors.filter((d) => d.status === 'active');
  return (
    <Card title="Sponsors" art="sponsors">
      {active.length === 0 && <div class="empty">No active sponsor. Offers arrive at the start of each season.</div>}
      {active.map((d) => (
        <div class="item" key={d.id}>
          <div class="grow">
            <div class="name">{d.name}{d.half ? ' (sleeve)' : ''}</div>
            <div class="tiny dim">{d.shape.replace('_', '-')} · {money(d.base)}/season{d.perWin ? ` + ${money(d.perWin)}/win` : ''}{d.promoBonus ? ` + ${money(d.promoBonus)} if promoted` : ''} · until {d.endSeason + 1}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

/** Pixel role tag shown before each staff role, e.g. [S] for scout. */
export const ROLE_TAG: Record<StaffRole, { tag: string; color: string; short: string }> = {
  scout: { tag: 'S', color: '#5aa0ff', short: 'Scout' },
  coach_att: { tag: 'AC', color: '#e0525a', short: 'Attack' },
  coach_mid: { tag: 'MC', color: '#ffcc4d', short: 'Midfield' },
  coach_def: { tag: 'DC', color: '#4cc38a', short: 'Defence' },
  coach_gk: { tag: 'GC', color: '#35c0c0', short: 'Keepers' },
  physio: { tag: 'P', color: '#ff9640', short: 'Physio' },
  doctor: { tag: '+', color: '#e8ecff', short: 'Doctor' },
  youth_coach: { tag: 'Y', color: '#b48cff', short: 'Youth' },
  commercial: { tag: '£', color: '#d9a520', short: 'Commercial' },
};

export function RoleTag({ role }: { role: StaffRole }) {
  const t = ROLE_TAG[role];
  return <span class="role-tag" style={{ background: t.color }}>{t.tag}</span>;
}

const STAFF_FILTERS: { key: string; label: string; roles: StaffRole[] }[] = [
  { key: 'all', label: 'All', roles: STAFF_ROLES.map((r) => r.role) },
  { key: 'coaches', label: 'Coaches', roles: ['coach_att', 'coach_mid', 'coach_def', 'coach_gk'] },
  { key: 'medical', label: 'Medical', roles: ['physio', 'doctor'] },
  ...STAFF_ROLES.map((r) => ({ key: r.role, label: ROLE_TAG[r.role].short, roles: [r.role] })),
];

function StaffCard({ s }: { s: GameState }) {
  const [hiring, setHiring] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const roles = STAFF_FILTERS.find((f) => f.key === filter)!.roles;
  const div = userClub(s).div;
  const hire = (st: Staff) => {
    if (st.role !== 'scout') s.staff = s.staff.filter((x) => x.role !== st.role);
    s.staff.push(st);
    s.staffPool = s.staffPool.filter((x) => x.id !== st.id);
    if (st.role === 'scout') s.scouting.assignments[st.id] = { pos: 'ANY', minAge: 16, maxAge: 32, maxFee: 10000, maxWage: 200 };
    setHiring(null);
    store.bump();
    void store.persist();
  };
  return (
    <Card title={`Staff · ${money(staffWageBill(s))}/wk`} art="staff">
      <div class="chips">
        {STAFF_FILTERS.map((f) => (
          <button key={f.key} class={`chip ${filter === f.key ? 'on' : ''}`} onClick={() => { setFilter(f.key); setHiring(null); }}>
            {f.roles.length === 1 && <RoleTag role={f.roles[0]} />}{f.label}
          </button>
        ))}
      </div>
      {STAFF_ROLES.filter((r) => roles.includes(r.role)).map((r) => {
        const list = s.staff.filter((x) => x.role === r.role);
        const cap = staffCap(s, r.role);
        return (
          <div key={r.role} style={{ borderBottom: '1px solid var(--line)', padding: '6px 0' }}>
            <div class="between">
              <div>
                <div class="name small"><RoleTag role={r.role} />{r.label}</div>
                {list.map((x) => <div class="tiny" key={x.id}>{x.first} {x.last} · <b class={x.level > cap ? 'amber' : ''}>{Math.min(x.level, cap)}</b>{x.level > cap ? `/${x.level}` : ''} · {money(x.wage)}/wk · to {x.endSeason + 1} <button class="linkbtn" onClick={() => { s.staff = s.staff.filter((y) => y.id !== x.id); store.bump(); }}>dismiss</button></div>)}
                {list.length === 0 && <div class="tiny red">Vacant</div>}
              </div>
              <button class="btn small" disabled={r.role === 'scout' && list.length >= maxScouts(s) && hiring !== r.role} onClick={() => setHiring(hiring === r.role ? null : r.role)}>{hiring === r.role ? 'Close' : r.role === 'scout' && list.length < maxScouts(s) ? 'Add' : 'Replace'}</button>
            </div>
            {hiring === r.role && (
              <div style={{ marginTop: 6 }}>
                <div class="tiny dim">{r.desc} Facility cap: {cap}.</div>
                {s.staffPool.filter((x) => x.role === r.role).sort((a, b) => b.level - a.level).map((x) => (
                  <div class="item" key={x.id}>
                    <div class="grow small">{x.first} {x.last}, {x.age} · level <b>{x.level}</b>{x.level > cap ? <span class="amber"> (works at {cap})</span> : ''}</div>
                    <button class="btn small primary" onClick={() => hire({ ...x, endSeason: s.season + 2 })}>{money(x.wage)}/wk</button>
                  </div>
                ))}
                <div class="tiny dim">New candidates every month. Wages scale with division {div}.</div>
              </div>
            )}
          </div>
        );
      })}
      <div class="tiny dim" style={{ marginTop: 6 }}>Staff above the facility cap work at the cap. Upgrade facilities to raise it.</div>
    </Card>
  );
}

function ClubTab() {
  const s = useStore().state!;
  const [seg, setSeg] = useState<string>('money');
  const extra = clubSections();
  return (
    <div>
      <div class="seg">
        {[['money', 'Money'], ['staff', 'Staff'], ...extra.map((e) => [e.key, e.label])].map(([k, l]) => <button key={k} class={seg === k ? 'on' : ''} onClick={() => setSeg(k)}>{l}</button>)}
      </div>
      {seg === 'money' && <><Finances s={s} /><Sponsors s={s} /></>}
      {seg === 'staff' && <StaffCard s={s} />}
      {extra.filter((e) => e.key === seg).map((e) => <div key={e.key}>{e.render(s)}</div>)}
    </div>
  );
}

setClubScreen(() => <ClubTab />);
