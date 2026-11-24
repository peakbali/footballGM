import { useEffect, useState } from 'preact/hooks';
import { Overlay } from '../components';
import { store, useStore } from '../store';
import { inboxAction } from '../inboxActions';
import { Avatar, KINDS, Pixel, senderKind } from '../senderArt';
import { DecisionCard, Outcome } from '../features/decisionUI';
import type { InboxMessage } from '../../core/types';

const WEEK = (m: InboxMessage) => `${m.season}/${String(m.season + 1).slice(2)} · Wk ${m.week}`;

export function InboxScreen() {
  const s = useStore().state!;
  const [cat, setCat] = useState<string>('All');
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => () => {
    // mark visible as read on close
    for (const m of s.inbox) m.read = true;
    store.bump();
  }, []);
  const kinds = ['All', ...new Set(s.inbox.map((m) => senderKind(m)))];
  const list = s.inbox.filter((m) => cat === 'All' || senderKind(m) === cat).slice().reverse();
  const needs = (m: InboxMessage) => !!m.action && !m.resolved;
  const pending = list.filter(needs);
  const rest = list.filter((m) => !needs(m));
  const unread = s.inbox.filter((m) => !m.read).length;
  return (
    <Overlay title="Inbox" sub={`${unread} unread${pending.length ? ` · ${pending.length} to decide` : ''}`}>
      <div class="chips">
        {kinds.map((c) => {
          const k = c === 'All' ? null : KINDS[c as keyof typeof KINDS];
          return (
            <button key={c} class={`chip ${c === cat ? 'on' : ''}`} onClick={() => setCat(c)}>
              {k && <span class="chip-ico"><Pixel icon={k.icon} color={k.color} size={14} /></span>}
              {k ? k.label : 'All'}
            </button>
          );
        })}
      </div>
      {pending.length > 0 && (
        <div class="mail-section">
          <div class="mail-sec-title">Needs a decision</div>
          {pending.map((m) => (m.action!.kind === 'decision' ? <DecisionCard key={m.id} s={s} m={m} /> : (
            <div key={m.id} class="mailcard" style={{ '--k': KINDS[senderKind(m)].color } as never}>
              <div class="mailcard-head">
                <Avatar s={s} m={m} size={44} />
                <div class="grow"><div class="mail-from">{KINDS[senderKind(m)].label} · Wk {m.week}</div><div class="mail-title big">{m.title}</div></div>
              </div>
              <div class="small dim mail-body">{m.body}</div>
              {inboxAction(s, m)}
            </div>
          )))}
        </div>
      )}
      <div class="mail-section">
        {pending.length > 0 && <div class="mail-sec-title">Earlier</div>}
        {rest.length === 0 && <div class="empty">Nothing here.</div>}
        {rest.map((m) => {
          const k = KINDS[senderKind(m)];
          const isOpen = open === m.id;
          const dec = m.action?.kind === 'decision';
          return (
            <div key={m.id} class={`mail ${m.read ? '' : 'unread'}`} style={{ '--k': k.color } as never} onClick={() => { m.read = true; setOpen(isOpen ? null : m.id); store.bump(); }}>
              <Avatar s={s} m={m} size={40} />
              <div class="mail-main">
                <div class="mail-top"><span class="mail-title">{m.title}</span><span class="mail-wk">{WEEK(m)}</span></div>
                <div class="mail-sub">
                  <span class="mail-tag">{k.label}</span>
                  {!m.read && <span class="mail-tag new">NEW</span>}
                  {dec && <span class="mail-tag dec">DECISION</span>}
                  {dec && m.pick && <span class="mail-tag done">✓ {m.pick}</span>}
                </div>
                {isOpen ? (
                  <div class="mail-open">
                    <div class="small dim" style={{ whiteSpace: 'pre-line' }}>{m.body}</div>
                    {dec && <Outcome m={m} />}
                  </div>
                ) : (
                  <div class="mail-snip">{dec && m.outcome ? m.outcome : m.body}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Overlay>
  );
}
