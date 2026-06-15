import { describe, it, expect } from 'vitest';
import { extractStepIndex, getStepImageFor } from './stepImages';

describe('extractStepIndex', () => {
    it('parses the numeric suffix', () => {
        expect(extractStepIndex('Curry.0', 'Curry')).toBe(0);
        expect(extractStepIndex('Curry.12', 'Curry')).toBe(12);
    });
    it('returns null for the main image (no suffix)', () => {
        expect(extractStepIndex('Curry', 'Curry')).toBeNull();
    });
    it('returns null for non-numeric suffixes', () => {
        expect(extractStepIndex('Curry.banner', 'Curry')).toBeNull();
        expect(extractStepIndex('Curry.0.thumb', 'Curry')).toBeNull();
    });
    it('returns null when basename does not match recipe', () => {
        expect(extractStepIndex('Other.0', 'Curry')).toBeNull();
    });
});

describe('getStepImageFor', () => {
    const images = [
        { basename: 'Curry', extension: 'jpg' },
        { basename: 'Curry.0', extension: 'png' },
        { basename: 'Curry.2', extension: 'jpg' },
    ];
    it('finds the image for a step index', () => {
        expect(getStepImageFor(0, 'Curry', images)).toBe(images[1]);
        expect(getStepImageFor(2, 'Curry', images)).toBe(images[2]);
    });
    it('returns null when no image matches the step', () => {
        expect(getStepImageFor(1, 'Curry', images)).toBeNull();
    });
});
