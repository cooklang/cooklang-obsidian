import { describe, it, expect } from 'vitest';
import { extractStepNumber, getStepImageFor } from './stepImages';

describe('extractStepNumber', () => {
    it('parses the numeric suffix', () => {
        expect(extractStepNumber('Curry.1', 'Curry')).toBe(1);
        expect(extractStepNumber('Curry.12', 'Curry')).toBe(12);
    });
    it('returns null for the main image (no suffix)', () => {
        expect(extractStepNumber('Curry', 'Curry')).toBeNull();
    });
    it('returns null for non-numeric suffixes', () => {
        expect(extractStepNumber('Curry.banner', 'Curry')).toBeNull();
        expect(extractStepNumber('Curry.1.thumb', 'Curry')).toBeNull();
    });
    it('returns null when basename does not match recipe', () => {
        expect(extractStepNumber('Other.1', 'Curry')).toBeNull();
    });
});

describe('getStepImageFor', () => {
    const images = [
        { basename: 'Curry', extension: 'jpg' },
        { basename: 'Curry.1', extension: 'png' },
        { basename: 'Curry.3', extension: 'jpg' },
    ];
    it('finds the image for a 1-based step number', () => {
        expect(getStepImageFor(1, 'Curry', images)).toBe(images[1]);
        expect(getStepImageFor(3, 'Curry', images)).toBe(images[2]);
    });
    it('returns null when no image matches the step', () => {
        expect(getStepImageFor(2, 'Curry', images)).toBeNull();
    });
});
