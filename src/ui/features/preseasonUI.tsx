/** The weekly pre-season update window (DESIGN 13.2za), styled like the welcome window. */
import type { InboxMessage } from '../../core/types';
import { PRE_WEEKS } from '../../core/systems/preseason';
import { nav, store, useStore } from '../store';
import { registerOverlay } from '../overlays';

const ICON = ['📋', '🔭', '🧑‍💼', '⚽'];

function Preseason({ id }: { id: number }) {
  const s = useStore().state!;
  const m = s.inbox.find((x) => x.id === id) as InboxMessage | undefined;
  if (!m) return <></>;
  const n = m.week;
  const title = m.title.replace(/^Pre-season \d+\/\d+: /, '');
  const toDecide = s.inbox.filter((x) => x.action && !x.resolved).length;
  const close = () => { m.read = true; nav.pop(); store.bump(); };
  return (
    <div class="overlay welcome-bg" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="welcome pre-win">
        <div class="pre-head">
          <div class="wel-ribbon pre-ribbon">PRE-SEASON · WEEK {n} OF {PRE_WEEKS}</div>
          <div class="pre-pips">{Array.from({ length: PRE_WEEKS }, (_, k) => <i key={k} class={k < n ? 'on' : ''} />)}</div>
          <div class="pre-ico" aria-hidden="true">{ICON[n - 1] ?? '⚽'}</div>
          <div class="wel-hi">{title.toUpperCase()}</div>
        </div>
        <div class="wel-body pre-body">
          {m.body.split('\n').map((l, k) => (l.trim() === '' ? <div class="pre-gap" key={k} /> : l.startsWith('• ') ? <div class="wel-goal pre-li" key={k}><i />{l.slice(2)}</div> : <div class={l.endsWith(':') ? 'wel-label' : 'small'} key={k}>{l.endsWith(':') ? l.slice(0, -1).toUpperCase() : l}</div>))}
          <div class="pre-btns">
            {toDecide > 0 && <button class="btn block" onClick={() => { m.read = true; nav.pop(); nav.push({ kind: 'inbox' }); }}>Inbox · {toDecide} to decide</button>}
            <button class="btn gold block wel-go" onClick={close}>OK ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
registerOverlay('preseason', (data) => <Preseason id={data as number} />);
