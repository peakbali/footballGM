import { useState } from 'preact/hooks';
import { hashSeed, Rng } from '../../core/rng';
import { acceptSponsor, migrateSponsors, slotLabel } from '../../core/systems/sponsors';
import { acceptIncoming, counterIncoming, exerciseOption, rejectIncoming } from '../../core/systems/transfers';
import type { GameState } from '../../core/state';
import type { InboxMessage } from '../../core/types';
import { registerInboxAction } from '../inboxActions';
import { ResultStamp } from '../resultStamp';
import { money, nav, store } from '../store';

registerInboxAction('sponsor_choice', (s, m) => {
  migrateSponsors(s);
  const ids = (m.action!.data as number[]) ?? [];
  const deals = s.sponsors.filter((d) => ids.includes(d.id));
  const slots = [...new Set(deals.map((d) => d.slot ?? 'shirt'))];
  const act = (id: number | null, slot?: string) => { acceptSponsor(s, m.id, id, slot); store.bump(); void store.persist(); };
  return (
    <div>
      {slots.map((slot) => {
        const list = deals.filter((d) => (d.slot ?? 'shirt') === slot);
        const signed = list.find((d) => d.status === 'active');
        const open = list.some((d) => d.status === 'offered');
        return (
          <div class="spon-slot" key={slot}>
            <div class="mail-sec-title">{slotLabel(slot)}</div>
            {signed && <div class="small green">✓ Signed {signed.name}</div>}
            {!signed && !open && <div class="tiny dim">Skipped</div>}
            {open && list.map((d) => (
              <div class="item" key={d.id}>
                <div class="grow">
                  <div class="name">{d.name}</div>
                  <div class="tiny dim">
                    {d.shape === 'safe' && `Fixed ${money(d.base)} a season, paid weekly`}
                    {d.shape === 'performance' && `${money(d.base)} + ${money(d.perWin!)} per win + ${money(d.promoBonus!)} if promoted`}
                    {d.shape === 'long_term' && `${money(d.base)} a season for 3 seasons`}
                  </div>
                </div>
                <button class="btn small primary" onClick={() => act(d.id)}>Sign</button>
              </div>
            ))}
            {open && <button class="linkbtn" onClick={() => act(null, slot)}>Skip this slot</button>}
          </div>
        );
      })}
      {deals.some((d) => d.status === 'offered') && <button class="linkbtn" onClick={() => act(null)}>Decline all</button>}
    </div>
  );
});

/** Incoming bid in the inbox: sell, ask for more or reject, then a big Success / Failed stamp (DESIGN 13.2n). */
function OfferIn({ s, m }: { s: GameState; m: InboxMessage }) {
  const o = s.offers.find((x) => x.id === m.action!.ref);
  const [fresh, setFresh] = useState(false);
  // the result is kept on the message so it still shows after leaving the inbox
  if (m.pick) return <ResultStamp quiet={!fresh} tone={m.tone ?? 'neutral'} title={m.pick} text={m.outcome} />;
  if (!o) return null;
  const p = s.players.get(o.pid);
  const close = (pick: string, tone: 'good' | 'bad' | 'neutral', txt: string) => {
    m.resolved = true; m.read = true; m.pick = pick; m.tone = tone; m.outcome = txt;
    setFresh(true); store.bump(); void store.persist();
  };
  if (!p || o.status !== 'pending') return <div class="tiny dim">No longer available.</div>;
  const ask = Math.round(o.fee * 1.3);
  return (
    <div class="row" style={{ flexWrap: 'wrap' }}>
      <button class="btn small primary" data-nosfx onClick={() => {
        const err = acceptIncoming(s, o.id);
        if (err) close('Accept', 'bad', err); else close('Accept', 'good', `Sold. ${p.last} leaves for ${money(o.fee)}.`);
      }}>Accept</button>
      {o.type === 'permanent' && (
        <button class="btn small" data-nosfx onClick={() => {
          const r = counterIncoming(s, new Rng(hashSeed(s.seed, o.id, 3)), o.id, ask);
          if (r !== 'accepted') return close(`Ask ${money(ask)}`, 'bad', `They walked away at ${money(ask)}. ${p.last} stays.`);
          const err = acceptIncoming(s, o.id);
          if (err) close(`Ask ${money(ask)}`, 'bad', err); else close(`Ask ${money(ask)}`, 'good', `They agreed to ${money(ask)}. ${p.last} has left.`);
        }}>Ask {money(ask)}</button>
      )}
      <button class="btn small danger" onClick={() => { rejectIncoming(s, o.id); close('Reject', 'neutral', `You turned the bid down. ${p.last} stays.`); }}>Reject</button>
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

