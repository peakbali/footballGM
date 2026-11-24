import { describe, expect, it } from 'vitest';
import { lookOf, facePixels } from '../src/ui/portrait';

describe('portraits', () => {
  it('are deterministic per player', () => {
    expect(lookOf(123, 24)).toEqual(lookOf(123, 24));
    expect(JSON.stringify(facePixels(lookOf(55), ['#aa0000', '#ffffff']))).toBe(JSON.stringify(facePixels(lookOf(55), ['#aa0000', '#ffffff'])));
  });

  it('are varied: thousands of players give hundreds of distinct faces', () => {
    const faces = new Set<string>();
    for (let id = 1; id <= 3000; id++) faces.add(JSON.stringify(lookOf(id, 25)));
    expect(faces.size).toBeGreaterThan(600);
  });

  it('keep every pixel on the 16x18 grid', () => {
    for (let id = 1; id <= 200; id++) {
      const f = facePixels(lookOf(id, 20 + (id % 20)), ['#123456', '#ffffff']);
      for (const r of [...f.head, ...f.eyes, ...f.front, ...f.shirt]) {
        const [x, y, w, h] = r;
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(16);
        expect(y + h).toBeLessThanOrEqual(18);
      }
    }
  });
});
