import { describe, expect, it } from 'vitest';
import { NAMES } from '../src/core/data/names';

describe('name pools', () => {
  it('keeps prefixed surnames whole (van Dijk, de Jong)', () => {
    expect(NAMES.NED.last).toContain('van Dijk');
    expect(NAMES.NED.last).toContain('de Jong');
    for (const [k, v] of Object.entries(NAMES)) for (const l of v.last) expect(['de', 'van', 'von', 'da', 'di', 'del', 'le', 'la'], `${k}: ${l}`).not.toContain(l);
  });
});
