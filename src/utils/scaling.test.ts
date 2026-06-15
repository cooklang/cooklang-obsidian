import { describe, it, expect } from 'vitest';
import { parseServingsValue, computeScale, clampServings } from './scaling';

describe('parseServingsValue', () => {
    it('accepts positive numbers', () => {
        expect(parseServingsValue(4)).toBe(4);
    });
    it('extracts leading number from strings like "4 servings"', () => {
        expect(parseServingsValue('4 servings')).toBe(4);
        expect(parseServingsValue('serves 6')).toBe(6);
    });
    it('returns null for non-positive or non-numeric', () => {
        expect(parseServingsValue(0)).toBeNull();
        expect(parseServingsValue('a lot')).toBeNull();
        expect(parseServingsValue(undefined)).toBeNull();
    });
});

describe('computeScale', () => {
    it('divides target by base', () => {
        expect(computeScale(8, 4)).toBe(2);
        expect(computeScale(2, 4)).toBe(0.5);
    });
    it('returns 1 when base is non-positive', () => {
        expect(computeScale(8, 0)).toBe(1);
    });
});

describe('clampServings', () => {
    it('rounds and clamps to [1, 1000]', () => {
        expect(clampServings(3.6)).toBe(4);
        expect(clampServings(0)).toBe(1);
        expect(clampServings(99999)).toBe(1000);
    });
});
