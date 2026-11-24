import { useState } from 'preact/hooks';
import { hashSeed, Rng } from '../../core/rng';
import { acceptSponsor } from '../../core/systems/sponsors';
import { acceptIncoming, counterIncoming, exerciseOption, rejectIncoming } from '../../core/systems/transfers';
import { projection } from '../../core/systems/finance';
import type { GameState } from '../../core/state';
import type { InboxMessage } from '../../core/types';
import { registerInboxAction } from '../inboxActions';
import { registerHubCard } from '../hubExtras';
import { Card } from '../components';
import { money, nav, store } from '../store';
import { CashChart } from './clubTab';

registerInboxAction('sponsor_choice', (s, m) => {
  const ids = (m.action!.data as number[]) ?? [];
  const deals = s.sponsors.filter((d) => ids.includes(d.id));
  return (
    <div>
      {deals.map((d) => (
        <div class="item" key={d.id}>
          <div class="grow">
            <div class="name">{d.name}</div>
            <div class="tiny dim">
              {d.shape === 'safe' && `Fixed ${money(d.base)}${d.half ? ' for the rest of the season' : ' this season'}`}
              {d.shape === 'performance' && `${money(d.base)} + ${money(d.perWin!)} per win + ${money(d.promoBonus!)} if promoted`}
              {d.shape === 'long_term' && `${money(d.base)} a season for 3 seasons`}
            </div>
          </div>
          <button class="btn small primary" onClick={() => { acceptSponsor(s, m.id, d.id); store.bump(); void store.persist(); }}>Sign</button>
        </div>
      ))}
      <button class="linkbtn" onClick={() => { acceptSponsor(s, m.id, null); store.bump(); }}>Decline all</button>
    </div>
  );
});

function OfferIn({ s, m }: { s: GameState; m: InboxMessage }) {
  const o = s.offers.find((x) => x.id === m.action!.ref);
  const [note, setNote] = useState('');
  if (!o) return null;
  const p = s.players.get(o.pid);
  const close = (txt: string) => { m.resolved = true; m.read = true; setNote(txt); store.bump(); void store.persist(); };
  if (!p || o.status !== 'pending') return <div class="tiny dim">{note || 'No longer available.'}</div>;
  return (
    <div class="row" style={{ flexWrap: 'wrap' }}>
      <button class="btn small primary" onClick={() => { const err = acceptIncoming(s, o.id); close(err ?? `${p.last} has left.`); }}>Accept</button>
      {o.type === 'permanent' && (
        <button class="btn small" onClick={() => {
          const fee = Math.round(o.fee * 1.3);
          const r = counterIncoming(s, new Rng(hashSeed(s.seed, o.id, 3)), o.id, fee);
          if (r === 'accepted') { const err = acceptIncoming(s, o.id); close(err ?? `They agreed to ${money(fee)}. ${p.last} has left.`); } else close(`They walked away at ${money(fee)}.`);
        }}>Ask {money(Math.round(o.fee * 1.3))}</button>
      )}
      <button class="btn small danger" onClick={() => { rejectIncoming(s, o.id); close('Rejected.'); }}>Reject</button>
      <button class="linkbtn" onClick={() => nav.push({ kind: 'player', id: p.id })}>View player</button>
    </div>
  );
}
registerInboxAction('offer_in', (s, m) => <OfferIn s={s} m={m} />);

registerInboxAction('loan_option', (s, m) => {
  const pid = m.action!.ref!;
  return (
    <div class="row">
      <button class="btn small primary" onClick={() => { const err = exerciseOption(s, pid, true, m.id); if (err) alert(err); store.bump(); }}>Buy him</button>
      <button class="btn small" onClick={() => { exerciseOption(s, pid, false, m.id); store.bump(); }}>Send back</button>
    </div>
  );
});

registerHubCard((s) => {
  const c = s.clubs[s.userClubId];
  const pr = projection(s);
  return (
    <Card title="Money" action={<button class="linkbtn" onClick={() => nav.setTab('club')}>Details</button>}>
      <div class="between small"><span>Cash</span><b class={c.cash < 0 ? 'red' : 'gold'}>{money(c.cash)}</b></div>
      <div class="between small"><span>Projected 30 June</span><b class={pr.end < 0 ? 'red' : 'green'}>{money(pr.end)}</b></div>
      <CashChart s={s} />
    </Card>
  );
});
