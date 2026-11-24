import { useState } from 'preact/hooks';
import { askingWage, expectedRole, negotiate, type ContractOffer } from '../../core/systems/contracts';
import type { GameState } from '../../core/state';
import type { Player, SquadRole } from '../../core/types';
import { Card } from '../components';
import { money } from '../store';
import { Choice, Stepper, niceStep } from './widgets';

/** Personal terms / renewal negotiation (max 3 rounds). */
export function ContractTerms({ s, p, clubId, onAgreed, onFailed, title = 'Personal terms' }: { s: GameState; p: Player; clubId: number; onAgreed: (o: ContractOffer) => void; onFailed?: (msg: string) => void; title?: string }) {
  const ask0 = askingWage(s, p, clubId);
  const [wage, setWage] = useState(Math.round(ask0 * 0.85));
  const [years, setYears] = useState(s.season - p.birthYear >= 31 ? 1 : 3);
  const [role, setRole] = useState<SquadRole>(expectedRole(s, p, clubId));
  const [release, setRelease] = useState(false);
  const [round, setRound] = useState(1);
  const [msg, setMsg] = useState<string>('');
  const [done, setDone] = useState(false);
  const relVal = Math.max(1000, Math.round(p.value * 2.5));
  const submit = () => {
    const offer: ContractOffer = { wage, years, role, clauses: release ? { release: relVal } : {} };
    const r = negotiate(s, p, clubId, offer, round);
    setMsg(r.message);
    if (r.result === 'accept') {
      setDone(true);
      onAgreed(offer);
    } else if (r.result === 'reject') {
      setDone(true);
      onFailed?.(r.message);
    } else {
      setRound(round + 1);
    }
  };
  return (
    <Card title={`${title} · round ${Math.min(round, 3)}/3`}>
      <div class="small dim" style={{ marginBottom: 8 }}>{p.last} is looking for about <b class="gold">{money(ask0)}</b> a week. Expected role: {expectedRole(s, p, clubId)}.</div>
      <div class="between" style={{ marginBottom: 8 }}><span>Wage / week</span><Stepper value={wage} onChange={setWage} step={niceStep(ask0)} /></div>
      <div class="between" style={{ marginBottom: 8 }}><span>Years</span><Stepper value={years} onChange={setYears} step={1} min={1} max={5} fmt={(v) => `${v} yr`} /></div>
      <div class="small dim">Squad role</div>
      <Choice options={[['star', 'Star'], ['starter', 'Starter'], ['rotation', 'Rotation'], ['backup', 'Backup']]} value={role} onChange={setRole} />
      <label class="between small" style={{ margin: '6px 0 10px' }}><span>Release clause ({money(relVal)})</span><input type="checkbox" checked={release} onChange={(e) => setRelease((e.target as HTMLInputElement).checked)} /></label>
      {msg && <div class={`small ${done ? (msg.includes('accept') ? 'green' : 'red') : 'amber'}`} style={{ marginBottom: 8 }}>{msg}</div>}
      {!done && <button class="btn primary block" onClick={submit}>Offer contract</button>}
    </Card>
  );
}
