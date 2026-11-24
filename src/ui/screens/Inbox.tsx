import { useEffect, useState } from 'preact/hooks';
import { Card, Overlay } from '../components';
import { store, useStore } from '../store';
import { inboxAction } from '../inboxActions';

export function InboxScreen() {
  const s = useStore().state!;
  const [cat, setCat] = useState<string>('All');
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => () => {
    // mark visible as read on close
    for (const m of s.inbox) m.read = true;
    store.bump();
  }, []);
  const cats = ['All', ...new Set(s.inbox.map((m) => m.cat))];
  const list = s.inbox.filter((m) => cat === 'All' || m.cat === cat).slice().reverse();
  const pending = list.filter((m) => m.action && !m.resolved);
  const rest = list.filter((m) => !(m.action && !m.resolved));
  return (
    <Overlay title="Inbox" sub={`${s.inbox.filter((m) => !m.read).length} unread`}>
      <div class="chips">{cats.map((c) => <button key={c} class={`chip ${c === cat ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      {pending.length > 0 && (
        <Card title="Needs a decision">
          {pending.map((m) => (
            <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <div class="name">{m.title}</div>
              <div class="small dim" style={{ margin: '4px 0 8px', whiteSpace: 'pre-line' }}>{m.body}</div>
              {inboxAction(s, m)}
            </div>
          ))}
        </Card>
      )}
      <Card>
        {rest.length === 0 && <div class="empty">Nothing here.</div>}
        {rest.map((m) => (
          <div key={m.id} class={`item inbox-item ${m.read ? '' : 'unread'}`} style={{ flexDirection: 'column', alignItems: 'stretch' }} onClick={() => { m.read = true; setOpen(open === m.id ? null : m.id); }}>
            <div class="between"><span class="name">{m.title}</span><span class="tiny dim">{m.cat} · {m.season}/{String(m.season + 1).slice(2)} wk {m.week}</span></div>
            {open === m.id && <div class="small dim" style={{ whiteSpace: 'pre-line', marginTop: 6 }}>{m.body}</div>}
          </div>
        ))}
      </Card>
    </Overlay>
  );
}
