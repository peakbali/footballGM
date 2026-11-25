import { ResultStamp } from '../resultStamp';
import { useState } from 'preact/hooks';
import { applyContract, releaseCost, releasePlayer } from '../../core/systems/contracts';
import { makeReport, coverage } from '../../core/systems/scouting';
import { staffLevel } from '../../core/systems/staff';
import type { GameState } from '../../core/state';
import type { Player } from '../../core/types';
import { Card, Overlay } from '../components';
import { money, nav, store, useStore } from '../store';
import { registerPlayerAction, setKnowledgeFn } from '../playerExtras';
import { isInterested, knowledgeOf } from '../../core/systems/scouting';
import { registerOverlay } from '../overlays';
import { ContractTerms } from './contractTerms';

setKnowledgeFn(knowledgeOf);

function OwnActions({ s, p }: { s: GameState; p: Player }) {
  const [confirmRelease, setConfirmRelease] = useState(false);
  const onLoan = p.contract?.type.startsWith('loan') && p.contract.parentClubId !== s.userClubId;
  const lentOut = p.contract?.parentClubId === s.userClubId && p.clubId !== s.userClubId;
  if (lentOut) return <Card><div class="small dim">On loan at {s.clubs[p.clubId!].name} until week {p.contract!.loanEndWeek}.</div></Card>;
  return (
    <Card title="Actions">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button class={`btn small ${p.locked ? 'gold' : ''}`} onClick={() => { p.locked = !p.locked; store.bump(); }}>{p.locked ? '🔒 Locked in XI' : 'Lock in XI'}</button>
        {!onLoan && <button class="btn small" onClick={() => nav.push({ kind: 'custom', key: 'renew', data: p.id })}>New contract</button>}
        {!onLoan && <button class={`btn small ${p.listed ? 'gold' : ''}`} onClick={() => { p.listed = !p.listed; store.bump(); }}>{p.listed ? 'Listed for sale' : 'Transfer list'}</button>}
        {!onLoan && <button class={`btn small ${p.loanListed ? 'gold' : ''}`} onClick={() => { p.loanListed = !p.loanListed; store.bump(); }}>{p.loanListed ? 'Loan listed' : 'Loan list'}</button>}
        {!onLoan && <button class="btn small danger" onClick={() => setConfirmRelease(true)}>Release</button>}
      </div>
      {confirmRelease && (
        <div style={{ marginTop: 10 }} class="small">
          Releasing {p.last} costs {money(releaseCost(s, p))} (half his remaining wages).
          <div class="row" style={{ marginTop: 8 }}>
            <button class="btn small danger" onClick={() => { releasePlayer(s, p); nav.pop(); void store.persist(); }}>Release</button>
            <button class="btn small" onClick={() => setConfirmRelease(false)}>Cancel</button>
          </div>
        </div>
      )}
    </Card>
  );
}

function OtherActions({ s, p }: { s: GameState; p: Player }) {
  const starred = s.scouting.starred.includes(p.id);
  const lvl = staffLevel(s, 'scout');
  const div = p.clubId != null ? s.clubs[p.clubId].div : s.clubs[s.userClubId].div;
  const inRange = Math.abs(div - s.clubs[s.userClubId].div) <= coverage(lvl);
  const r = s.scouting.reports[p.id];
  return (
    <Card title="Actions">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button class="btn small primary" onClick={() => nav.push({ kind: 'custom', key: 'deal', data: p.id })}>{p.clubId == null ? 'Sign' : 'Make offer'}</button>
        <button class={`btn small ${starred ? 'gold' : ''}`} onClick={() => { s.scouting.starred = starred ? s.scouting.starred.filter((x) => x !== p.id) : [p.id, ...s.scouting.starred]; store.bump(); }}>{starred ? '★ Shortlisted' : '☆ Shortlist'}</button>
        <button class="btn small" disabled={!inRange || (r && r.season === s.season && r.level >= lvl)} onClick={() => { makeReport(s, p, lvl); store.bump(); }}>
          {!inRange ? 'Out of scout range' : r && r.season === s.season ? 'Scouted' : 'Scout him'}
        </button>
      </div>
      {r && <div class="small" style={{ marginTop: 8 }}>Interest in joining: {isInterested(s, p) ? <b class="green">Open to a move</b> : <b class="red">Not interested</b>}</div>}
      {r && <div class="tiny dim" style={{ marginTop: 6 }}>Scout report: level {r.level}, {r.season}/{String(r.season + 1).slice(2)} wk {r.week}</div>}
    </Card>
  );
}

registerPlayerAction((s, p) => (p.clubId === s.userClubId || p.contract?.parentClubId === s.userClubId ? <OwnActions s={s} p={p} /> : <OtherActions s={s} p={p} />));

function RenewScreen({ pid }: { pid: number }) {
  const s = useStore().state!;
  const p = s.players.get(pid)!;
  const [done, setDone] = useState('');
  return (
    <Overlay title={`Contract: ${p.last}`} sub={p.contract ? `Now ${money(p.contract.wage)}/wk to June ${p.contract.endSeason + 1}` : ''}>
      {!done && <ContractTerms s={s} p={p} clubId={s.userClubId} title="New contract" onAgreed={(o) => { applyContract(s, p, s.userClubId, o); setDone(`${p.last} signs a new ${o.years}-year deal.`); store.bump(); void store.persist(); }} onFailed={(m) => setDone(m)} />}
      {done && <Card><ResultStamp tone={/signs/.test(done) ? 'good' : 'bad'} stamp={/signs/.test(done) ? 'Signed' : 'No deal'} text={done} /><button class="btn block" onClick={() => nav.pop()}>Done</button></Card>}
    </Overlay>
  );
}
registerOverlay('renew', (d) => <RenewScreen pid={d as number} />);
