import { describe, it, expect } from 'vitest';
import { parseServingsValue, computeScale, clampServings, deriveServingsState } from './scaling';

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

describe('deriveServingsState', () => {
    it('displays base * scale, not base * scale^2', () => {
        // Regression for #83: base servings must be the UNSCALED count.
        // Scaling 1 serving by 4 must display 4 servings (with ingredients x4),
        // never 2 (which is what squaring the scale produced).
        expect(deriveServingsState(1, 4)).toEqual({ baseServings: 1, displayServings: 4 });
        expect(deriveServingsState(1, 1)).toEqual({ baseServings: 1, displayServings: 1 });
        expect(deriveServingsState(2, 3)).toEqual({ baseServings: 2, displayServings: 6 });
    });

    it('rounds and clamps the display to a positive integer', () => {
        expect(deriveServingsState(3, 0.5)).toEqual({ baseServings: 3, displayServings: 2 });
        expect(deriveServingsState(1, 0.1)).toEqual({ baseServings: 1, displayServings: 1 });
    });

    it('returns nulls when there is no numeric base', () => {
        expect(deriveServingsState(null, 4)).toEqual({ baseServings: null, displayServings: null });
    });

    it('every integer serving target round-trips through computeScale', () => {
        // The +/- stepper computes a new scale from an integer target; rendering
        // that scale must display exactly that target (so no target is skipped).
        const base = 1;
        for (let target = 1; target <= 12; target++) {
            const scale = computeScale(target, base);
            expect(deriveServingsState(base, scale).displayServings).toBe(target);
        }
    });
});
