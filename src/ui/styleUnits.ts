import { options } from 'preact';

/**
 * Preact 11 no longer adds "px" to numeric style values (`style={{ marginTop: 6 }}` was silently ignored).
 * This hook turns them into pixels again, except for the properties that really are unitless.
 */
const UNITLESS = /^(flex|flexGrow|flexShrink|opacity|zIndex|lineHeight|fontWeight|order|zoom|scale|aspectRatio|columnCount|WebkitLineClamp|lineClamp|gridRow|gridColumn|tabSize)$/;

const prev = options.vnode;
options.vnode = (vnode) => {
  const st = (vnode.props as { style?: unknown } | null)?.style;
  if (st && typeof st === 'object') {
    let out: Record<string, unknown> | null = null;
    for (const k in st as Record<string, unknown>) {
      const v = (st as Record<string, unknown>)[k];
      if (typeof v === 'number' && v !== 0 && k[0] !== '-' && !UNITLESS.test(k)) {
        out ??= { ...(st as Record<string, unknown>) };
        out[k] = `${v}px`;
      }
    }
    if (out) (vnode.props as { style?: unknown }).style = out;
  }
  prev?.(vnode);
};
