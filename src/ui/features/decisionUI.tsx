import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '../../core/state';
import type { InboxMessage } from '../../core/types';
import { decisionChoices, failRenewal, pendingDecisions, resolveDecision, signRenewal, type Choice } from '../../core/systems/decisions';
import { ContractTerms } from './contractTerms';
import { CardArt } from '../cardArt';
import { Avatar, KINDS, messagePlayer, senderKind } from '../senderArt';
import { nav, store, useStore } from '../store';
import { sfx } from '../audio';

export function Chips({ chips }: { chips: Choice['chips'] }) {
  return <div class="dchips">{chips.map((c, i) => <span key={i} class={`dchip ${c.tone}`}>{c.t}</span>)}</div>;
}

/** The choice buttons of a pending decision, each with its consequence chips. */
export function ChoiceList({ s, m, onDone }: { s: GameState; m: InboxMessage; onDone?: (outcome: string | null) => void }) {
  const choices = decisionChoices(s, m);
  const ctx = m.action?.data as { type?: string; pid?: number } | undefined;
  const renewal = ctx?.type === 'contract_expiring' ? s.players.get(ctx.pid ?? -1) : undefined;
  const finish = (out: string | null) => { store.bump(); void store.persist(); onDone?.(out); };
  return (
    <div class="dchoices">
      {renewal && renewal.clubId === s.userClubId && renewal.contract && (
        <div class="renewal">
          <div class="mail-from">Offer a new contract</div>
          <ContractTerms s={s} p={renewal} clubId={s.userClubId} bare
            onAgreed={(o) => { sfx('confirm'); finish(signRenewal(s, m.id, renewal.id, o)); }}
            onFailed={(msg) => finish(failRenewal(s, m.id, renewal.id, msg))} />
          {choices.length > 0 && <div class="mail-from" style={{ marginTop: 6 }}>Or</div>}
        </div>
      )}
      {choices.map((ch, i) => (
        <button
          key={i}
          data-nosfx
          class={`dchoice ${ch.disabled ? 'off' : ''}`}
          disabled={!!ch.disabled}
          onClick={() => {
            const out = resolveDecision(s, m.id, i);
            sfx('confirm');
            store.bump();
            void store.persist();
            onDone?.(out);
          }}
        >
          <span class="dlabel">{ch.label}</span>
          {ch.disabled ? <span class="dchip bad">{ch.disabled}</span> : <Chips chips={ch.chips} />}
        </button>
      ))}
    </div>
  );
}

/** A decision as a card (inbox). Pending shows the choices, resolved shows what you picked and what came of it. */
export function DecisionCard({ s, m }: { s: GameState; m: InboxMessage }) {
  const k = KINDS[senderKind(m)];
  return (
    <div class="mailcard" style={{ '--k': k.color } as never}>
      <div class="mailcard-head">
        <Avatar s={s} m={m} size={44} />
        <div class="grow">
          <div class="mail-from">{k.label} · Wk {m.week}</div>
          <div class="mail-title big">{m.title}</div>
        </div>
      </div>
      <div class="small dim mail-body">{m.body}</div>
      {m.resolved ? <Outcome m={m} /> : <ChoiceList s={s} m={m} />}
    </div>
  );
}

export function Outcome({ m }: { m: InboxMessage }) {
  if (!m.pick) return null;
  return (
    <div class="outcome">
      <span class="dchip good">✓ {m.pick}</span>
      {m.outcome && <div class="small">{m.outcome}</div>}
    </div>
  );
}

/** A different sound for each kind of popup: offers chime like coins, contract reminders rustle paper, the board is lower. */
function popupSound(m: InboxMessage) {
  const type = String((m.action?.data as { type?: string } | undefined)?.type ?? '');
  if (type.startsWith('contract')) return 'contract' as const;
  const k = senderKind(m);
  if (/offer|bid|loan|sponsor|sell|buy/.test(type) || k === 'sponsor' || k === 'finance' || k === 'transfer' || k === 'club') return 'offer' as const;
  if (k === 'board') return 'board' as const;
  return 'pop' as const;
}

/** The popup: the oldest undecided decision, over everything but a match report. */
export function DecisionPopup() {
  const st = useStore();
  const s = st.state!;
  const top = nav.stack[nav.stack.length - 1];
  const [result, setResult] = useState<{ title: string; pick: string; outcome: string; id: number } | null>(null);
  const pend = pendingDecisions(s).filter((m) => m.id > st.hiddenUpTo);
  const m = pend[0];
  const shown = !!m && !top && !st.busy;
  useEffect(() => { if (shown) sfx(popupSound(m)); }, [shown ? m.id : 0]);
  if (top || st.busy) return null; // any overlay (a player page opened from the offer, a match) hides it; it returns when that closes
  if (result && (!m || m.id !== result.id)) {
    const k = KINDS.player;
    return (
      <div class="dpop-back">
        <div class="dpop" style={{ '--k': k.color } as never}>
          <div class="dpop-body">
            <div class="mail-from">Done</div>
            <h2>{result.title}</h2>
            <div class="outcome"><span class="dchip good">✓ {result.pick}</span><div class="small">{result.outcome}</div></div>
            <button class="btn gold block" onClick={() => setResult(null)}>OK</button>
          </div>
        </div>
      </div>
    );
  }
  if (!m) return null;
  const k = KINDS[senderKind(m)];
  return (
    <div class="dpop-back">
      <div class="dpop" style={{ '--k': k.color } as never}>
        <div class="dpop-banner">
          <CardArt art={k.art} wide />
          <Avatar s={s} m={m} size={64} />
          <div class="dpop-from">{k.label}</div>
        </div>
        <div class="dpop-body">
          <h2>{m.title}</h2>
          <div class="dpop-text">{m.body}</div>
          {messagePlayer(s, m) && <div class="tiny dim dpop-hint">Tap {messagePlayer(s, m)!.last}'s picture to open his page</div>}
          <ChoiceList s={s} m={m} onDone={(out) => { if (out) setResult({ title: m.title, pick: m.pick ?? '', outcome: out, id: m.id }); }} />
          <button class="linkbtn later" onClick={() => { st.hiddenUpTo = m.id; store.bump(); }}>Decide later</button>
        </div>
      </div>
    </div>
  );
}
