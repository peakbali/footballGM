import { useState } from 'preact/hooks';
import { askFor, expectedRole, negotiate, prefersLong, reactionTo, type ContractOffer } from '../../core/systems/contracts';
import type { GameState } from '../../core/state';
import type { Player, SquadRole } from '../../core/types';
import { Card } from '../components';
import { money } from '../store';
import { Choice, Stepper, niceStep } from './widgets';
import { ResultStamp } from '../resultStamp';

const REACT = {
  accept: { t: 'He signs', cls: 'green' },
  counter: { t: 'He will ask for more', cls: 'amber' },
  reject: { t: 'Too low: he walks away', cls: 'red' },
} as const;

/**
 * Personal terms and renewals (DESIGN 13.2m): pick any wage and any length from 1 to 5 years, see what he asks for
 * each length and how he would react, then offer (max 3 rounds). Most players ask less for a longer deal.
 * `bare` drops the card frame (used inside the contract reminder popup).
 */
export function ContractTerms({ s, p, clubId, onAgreed, onFailed, title = 'Personal terms', bare }: { s: GameState; p: Player; clubId: number; onAgreed: (o: ContractOffer) => void; onFailed?: (msg: string) => void; title?: string; bare?: boolean }) {
  const exp = expectedRole(s, p, clubId);
  const [years, setYears] = useState(s.season - p.birthYear >= 31 ? 1 : 3);
  const [role, setRole] = useState<SquadRole>(exp);
  const [release, setRelease] = useState(false);
  const [round, setRound] = useState(1);
  const relVal = Math.max(1000, Math.round(p.value * 2.5));
  const clauses = release ? { release: relVal } : {};
  const askOf = (y: number) => Math.round(askFor(s, p, clubId, { years: y, clauses, role }) * (1 - (round - 1) * 0.03));
  const ask = askOf(years);
  const [wage, setWage] = useState(ask);
  const [msg, setMsg] = useState<string>('');
  const [done, setDone] = useState(false);
  const react = reactionTo(wage, ask, round >= 3);
  const step = niceStep(ask);
  const lo = Math.max(step, Math.round((ask * 0.4) / step) * step);
  const hi = Math.round((ask * 1.6) / step) * step;
  const submit = () => {
    const offer: ContractOffer = { wage, years, role, clauses };
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
  const body = (
    <div class="cterms">
      <div class="small dim" style={{ marginBottom: 6 }}>
        {p.last} {prefersLong(p) ? 'would take less for a longer deal.' : 'prefers a short deal and wants more to sign for longer.'} Expected role: {exp}.
      </div>
      <div class="tiny dim">Length · his ask per week</div>
      <div class="cyears">
        {[1, 2, 3, 4, 5].map((y) => (
          <button key={y} class={`cyear ${y === years ? 'on' : ''}`} onClick={() => { const keep = wage === ask; setYears(y); if (keep) setWage(askOf(y)); }}>
            <b>{y} yr</b>
            <span>{money(askOf(y))}</span>
          </button>
        ))}
      </div>
      <div class="between" style={{ margin: '8px 0 4px' }}><span>Wage/wk</span><Stepper value={wage} onChange={setWage} step={step} min={step} /></div>
      <input class="cwage" type="range" min={lo} max={hi} step={step} value={Math.min(hi, Math.max(lo, wage))} onInput={(e) => setWage(+(e.target as HTMLInputElement).value)} />
      <div class={`small ${REACT[react].cls}`} style={{ margin: '2px 0 8px' }}>
        {REACT[react].t} · he asks {money(ask)} for {years} year{years === 1 ? '' : 's'}
        {wage !== ask && <button class="linkbtn" style={{ marginLeft: 6 }} onClick={() => setWage(ask)}>Match his ask</button>}
      </div>
      <div class="small dim">Squad role</div>
      <Choice options={[['star', 'Star'], ['starter', 'Starter'], ['rotation', 'Rotation'], ['backup', 'Backup']]} value={role} onChange={setRole} />
      <label class="between small" style={{ margin: '6px 0 10px' }}><span>Release clause ({money(relVal)})</span><input type="checkbox" checked={release} onChange={(e) => setRelease((e.target as HTMLInputElement).checked)} /></label>
      {msg && (done ? <ResultStamp tone={msg.includes('accept') ? 'good' : 'bad'} stamp={msg.includes('accept') ? 'Agreed' : 'No deal'} text={msg} /> : <div class="small amber" style={{ marginBottom: 8 }}>{msg}</div>)}
      {!done && <button class="btn primary block" data-nosfx onClick={submit}>Offer {years} year{years === 1 ? '' : 's'} at {money(wage)}/wk</button>}
    </div>
  );
  if (bare) return body;
  return <Card title={`${title} · round ${Math.min(round, 3)}/3`}>{body}</Card>;
}
