import { useEffect } from 'preact/hooks';
import { sfx } from './audio';

export type Tone = 'good' | 'bad' | 'neutral';
const LABEL: Record<Tone, { stamp: string; icon: string }> = {
  good: { stamp: 'Success', icon: '✓' },
  bad: { stamp: 'Failed', icon: '✗' },
  neutral: { stamp: 'Done', icon: '•' },
};

/**
 * Big result banner for deals and decisions (DESIGN 13.2n): a coloured stamp that slams in, the result in large
 * text, and a sound (cheerful for success, a low thud for failure). `quiet` skips the sound and animation (inbox).
 */
export function ResultStamp({ tone, title, text, stamp, quiet }: { tone: Tone; title?: string; text?: string; stamp?: string; quiet?: boolean }) {
  useEffect(() => {
    if (quiet) return;
    sfx('stamp');
    const t = setTimeout(() => sfx(tone === 'good' ? 'win' : tone === 'bad' ? 'loss' : 'confirm'), 180);
    return () => clearTimeout(t);
  }, []);
  const l = LABEL[tone];
  return (
    <div class={`rstamp rs-${tone} ${quiet ? 'quiet' : ''}`} role="status">
      <div class="rstamp-badge"><span class="rstamp-icon">{l.icon}</span><span class="rstamp-word">{stamp ?? l.stamp}</span></div>
      {title && <div class="rstamp-title">{title}</div>}
      {text && <div class="rstamp-text">{text}</div>}
    </div>
  );
}
