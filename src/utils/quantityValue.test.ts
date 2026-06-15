import { describe, it, expect } from 'vitest';
import { numericFromQuantity } from './quantityValue';

const regular = (n: number) => ({ value: { type: 'number', value: { type: 'regular', value: n } } });
const fraction = (whole: number, num: number, den: number) =>
    ({ value: { type: 'number', value: { type: 'fraction', value: { whole, num, den, err: 0 } } } });

describe('numericFromQuantity', () => {
    it('reads regular numbers (including decimals)', () => {
        expect(numericFromQuantity(regular(5.5))).toBe(5.5);
        expect(numericFromQuantity(regular(2))).toBe(2);
    });

    it('reads fractions', () => {
        expect(numericFromQuantity(fraction(0, 2, 3))).toBeCloseTo(0.6667, 4);
        expect(numericFromQuantity(fraction(0, 1, 8))).toBe(0.125);
        expect(numericFromQuantity(fraction(1, 1, 2))).toBe(1.5);
    });

    it('returns null for ranges, text, and missing quantities', () => {
        expect(numericFromQuantity({ value: { type: 'range', value: {} } })).toBeNull();
        expect(numericFromQuantity({ value: { type: 'text', value: 'a pinch' } })).toBeNull();
        expect(numericFromQuantity(null)).toBeNull();
        expect(numericFromQuantity(undefined)).toBeNull();
    });

    it('returns null for a zero denominator', () => {
        expect(numericFromQuantity(fraction(0, 1, 0))).toBeNull();
    });
});
