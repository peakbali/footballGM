import { useState } from 'preact/hooks';
import type { GameState } from '../../core/state';
import type { InboxMessage } from '../../core/types';
import { decisionChoices, pendingDecisions, resolveDecision, type Choice } from '../../core/systems/decisions';
import { CardArt } from '../cardArt';
import { Avatar, KINDS, senderKind } from '../senderArt';
import { nav, store, useStore } from '../store';
import { sfx } from '../audio';

export function Chips({ chips }: { chips: Choice['chips'] }) {
  return <div class="dchips">{chips.map((c, i) => <span key={i} class={`dchip ${c.tone}`}>{c.t}</span>)}</div>;
}

/** The choice buttons of a pending decision, each with its consequence chips. */
export function ChoiceList({ s, m, onDone }: { s: GameState; m: InboxMessage; onDone?: (outcome: string | null) => void }) {
  const choices = decisionChoices(s, m);
  return (
    <div class="dchoices">
      {choices.map((ch, i) => (
        <button
          key={i}
          class={`dchoice ${ch.disabled ? 'off' : ''}`}
          disabled={!!ch.disabled}
          onClick={() => {
            const out = resolveDecision(s, m.id, i);
            sfx('click');
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

/** The popup: the oldest undecided decision, over everything but a match report. */
export function DecisionPopup() {
  const st = useStore();
  const s = st.state!;
  const top = nav.stack[nav.stack.length - 1];
  const [result, setResult] = useState<{ title: string; pick: string; outcome: string; id: number } | null>(null);
  const pend = pendingDecisions(s).filter((m) => m.id > st.hiddenUpTo);
  const m = pend[0];
  if (top?.kind === 'match' || st.busy) return null;
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
          <ChoiceList s={s} m={m} onDone={(out) => { if (out) setResult({ title: m.title, pick: m.pick ?? '', outcome: out, id: m.id }); }} />
          <button class="linkbtn later" onClick={() => { st.hiddenUpTo = m.id; store.bump(); }}>Decide later</button>
        </div>
      </div>
    </div>
  );
}
