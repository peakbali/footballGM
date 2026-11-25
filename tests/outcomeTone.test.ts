import { describe, expect, it } from 'vitest';
import { outcomeTone } from '../src/core/systems/decisions';

describe('outcome tone', () => {
  it('reads success, failure and neutral outcomes', () => {
    expect(outcomeTone('Hall signs for 4 years on £20 a week.')).toBe('good');
    expect(outcomeTone('Henry Dean arrives and Riley moves on.')).toBe('good');
    expect(outcomeTone('Hall turns it down. He wants £20 a week.')).toBe('bad');
    expect(outcomeTone('Hall rejects the offer and ends talks.')).toBe('bad');
    expect(outcomeTone('Smith is not happy, but the dressing room settles.')).toBe('bad');
    expect(outcomeTone("You'll talk again with 1 month left.")).toBe('neutral');
  });
});
