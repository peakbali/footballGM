import { useState } from 'preact/hooks';
import { hashSeed, Rng } from '../../core/rng';
import { askingPrice, canTransferNow, completeDeal, submitBid, willingToJoin } from '../../core/systems/transfers';
import { isWindowOpen, userClub } from '../../core/state';
import type { OfferType, TransferOffer } from '../../core/types';
import { Badge, Card, Overlay } from '../components';
import { money, nav, store, useStore } from '../store';
import { registerOverlay } from '../overlays';
import { ContractTerms } from './contractTerms';
import { Choice, Stepper, niceStep } from './widgets';
import { knowledge } from '../playerExtras';
import { seniorCount, SQUAD_MAX } from '../../core/systems/contracts';

function DealScreen({ pid }: { pid: number }) {
  const s = useStore().state!;
  const p = s.players.get(pid)!;
  const free = p.clubId == null;
  const club = p.clubId != null ? s.clubs[p.clubId] : null;
  const window = isWindowOpen(s.week);
  const [type, setType] = useState<OfferType>(free ? 'free' : window ? 'permanent' : 'loan');
  const k = knowledge(s, p);
  const estVal = p.value;
  const [fee, setFee] = useState(free ? 0 : Math.round(estVal * 0.9));
  const [sellOn, setSellOn] = useState(0);
  const [share, setShare] = useState(100);
  const [optFee, setOptFee] = useState(Math.round(estVal * 1.1));
  const [len, setLen] = useState<'half' | 'full'>('full');
  const [offer, setOffer] = useState<TransferOffer | null>(free ? null : null);
  const [stage, setStage] = useState<'bid' | 'terms' | 'done'>(free ? 'terms' : 'bid');
  const [note, setNote] = useState('');
  const refusal = willingToJoin(s, p, type);
  const timing = canTransferNow(s, type);
  const user = userClub(s);
  const full = seniorCount(s) >= SQUAD_MAX && s.season - p.birthYear > 18;

  const rng = () => new Rng(hashSeed(s.seed, s.season, s.week, s.nextOfferId));
  const bid = (feeOverride?: number) => {
    const r = submitBid(s, rng(), { pid, type, fee: type === 'permanent' ? (feeOverride ?? fee) : 0, sellOnPct: sellOn || undefined, wageSharePct: type.startsWith('loan') ? share : undefined, optionFee: type === 'loan_option' || type === 'loan_obligation' ? (feeOverride ?? optFee) : undefined, loanLength: len }, offer && offer.status === 'countered' ? offer.round + 1 : 1);
    setOffer(r);
    if (r.status === 'accepted') {
      if (type.startsWith('loan')) {
        const err = completeDeal(s, r, { wage: p.contract?.wage ?? 0, years: 1, clauses: {}, role: 'rotation' });
        setNote(err ?? `${p.last} joins on loan.`);
        setStage('done');
        void store.persist();
      } else setStage('terms');
    }
    store.bump();
  };

  return (
    <Overlay title={`Sign ${p.first[0]}. ${p.last}`} sub={club ? `${club.name} · div ${club.div}` : 'Free agent'}>
      <Card>
        <div class="row">
          {club && <Badge club={club} size={36} />}
          <div class="grow small">
            <div>Value: <b>{money(estVal)}</b>{!k.exact && <span class="dim"> (estimate)</span>}</div>
            {p.contract && <div class="dim">Wage {money(p.contract.wage)}/wk · contract to {p.contract.endSeason + 1}</div>}
            <div class="dim">Your cash: <b class={user.cash < 0 ? 'red' : 'gold'}>{money(user.cash)}</b> · squad {seniorCount(s)}/{SQUAD_MAX}</div>
          </div>
        </div>
      </Card>
      {refusal && stage !== 'done' && <Card><div class="red small">{refusal}</div></Card>}
      {full && stage !== 'done' && <Card><div class="red small">Your squad is full. Release or sell a player first.</div></Card>}
      {stage === 'bid' && !free && (
        <Card title="Offer">
          <Choice options={[['permanent', 'Buy'], ['loan', 'Loan'], ['loan_option', 'Loan+opt'], ['loan_obligation', 'Loan+obl']]} value={type} onChange={(t) => { setType(t); setOffer(null); }} />
          {timing && <div class="amber small" style={{ marginBottom: 8 }}>{timing}</div>}
          {type === 'permanent' && (
            <>
              <div class="between" style={{ marginBottom: 8 }}><span>Fee</span><Stepper value={fee} onChange={setFee} step={niceStep(estVal)} /></div>
              <div class="small dim">Sell-on clause (share of a future sale)</div>
              <Choice options={[[0, 'None'], [10, '10%'], [20, '20%'], [30, '30%']]} value={sellOn} onChange={setSellOn} />
            </>
          )}
          {type.startsWith('loan') && (
            <>
              <div class="small dim">Length</div>
              <Choice options={[['half', 'Half season'], ['full', 'Full season']]} value={len} onChange={setLen} />
              <div class="small dim">You pay this share of his {money(p.contract?.wage ?? 0)}/wk wage</div>
              <Choice options={[[50, '50%'], [75, '75%'], [100, '100%']]} value={share} onChange={setShare} />
              {type !== 'loan' && <div class="between" style={{ margin: '8px 0' }}><span>{type === 'loan_option' ? 'Option fee' : 'Obligation fee'}</span><Stepper value={optFee} onChange={setOptFee} step={niceStep(estVal)} /></div>}
              {type === 'loan_obligation' && <div class="tiny dim">Fee is paid automatically if he plays 10+ games.</div>}
            </>
          )}
          {offer?.status === 'countered' && (
            <div class="amber small" style={{ margin: '8px 0' }}>
              {club!.short} want {money(offer.counterFee!)}.
              <button class="btn small gold" style={{ marginLeft: 8 }} disabled={offer.counterFee! > user.cash} onClick={() => { type === 'permanent' ? setFee(offer.counterFee!) : setOptFee(offer.counterFee!); bid(offer.counterFee!); }}>Pay {money(offer.counterFee!)}</button>
            </div>
          )}
          {offer?.status === 'rejected' && <div class="red small" style={{ margin: '8px 0' }}>{club!.short} reject the offer{type.startsWith('loan') ? '. They want a bigger wage share or see him as a key player.' : ' and end talks.'}</div>}
          <button class="btn primary block" disabled={!!refusal || !!timing || full || offer?.status === 'rejected' || (type === 'permanent' && fee > user.cash)} onClick={() => bid()}>
            {type === 'permanent' ? `Bid ${money(fee)}` : 'Offer loan'}
          </button>
          {type === 'permanent' && <div class="tiny dim" style={{ marginTop: 6 }}>Hint: they would probably take about {money(askingPrice(s, p) * (1 - sellOn / 200))}.</div>}
        </Card>
      )}
      {stage === 'terms' && !refusal && !full && (
        <ContractTerms
          s={s}
          p={p}
          clubId={s.userClubId}
          onAgreed={(terms) => {
            const o = offer ?? submitBid(s, rng(), { pid, type: 'free', fee: 0 });
            const err = completeDeal(s, o, terms);
            setNote(err ?? `${p.first} ${p.last} signs for ${user.short}!`);
            setStage('done');
            store.bump();
            void store.persist();
          }}
          onFailed={(m) => setNote(m)}
        />
      )}
      {stage === 'done' && (
        <Card>
          <div class="gold px" style={{ marginBottom: 10 }}>{note}</div>
          <button class="btn block" onClick={() => nav.pop()}>Done</button>
        </Card>
      )}
      {stage !== 'done' && note && <div class="red small">{note}</div>}
    </Overlay>
  );
}

registerOverlay('deal', (d) => <DealScreen pid={d as number} />);
