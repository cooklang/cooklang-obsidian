import { describe, expect, it } from 'vitest';
import {
    createUnitMap,
    DEFAULT_HOURS_LABELS,
    DEFAULT_MINUTES_LABELS,
    DEFAULT_SECONDS_LABELS,
    formatTimerDuration,
    timerRangeStep,
    timerDurationFromQuantity,
} from './timeFormatters';

const units = createUnitMap(
    DEFAULT_MINUTES_LABELS,
    DEFAULT_HOURS_LABELS,
    DEFAULT_SECONDS_LABELS,
);

function regular(value: number, unit: string) {
    return {
        value: { type: 'number', value: { type: 'regular', value } },
        unit,
    };
}

function text(value: string) {
    return { value: { type: 'text', value }, unit: null };
}

describe('timerDurationFromQuantity', () => {
    it.each([
        ['seconds', 2],
        ['s', 2],
        ['minutes', 120],
        ['m', 120],
        ['hours', 7200],
        ['h', 7200],
    ])('converts structured %s values', (unit, seconds) => {
        expect(timerDurationFromQuantity(regular(2, unit), units)).toEqual({
            minimumSeconds: seconds,
            maximumSeconds: seconds,
        });
    });

    it.each([
        ['30s', 30],
        ['5m', 300],
        ['2h', 7200],
        ['1h 30m 5s', 5405],
    ])('converts compact %s values', (value, seconds) => {
        expect(timerDurationFromQuantity(text(value), units)).toEqual({
            minimumSeconds: seconds,
            maximumSeconds: seconds,
        });
    });

    it('converts structured fractional values', () => {
        const quantity = {
            value: {
                type: 'number',
                value: { type: 'fraction', value: { whole: 0, num: 1, den: 2 } },
            },
            unit: 'h',
        };
        expect(timerDurationFromQuantity(quantity, units)).toEqual({
            minimumSeconds: 1800,
            maximumSeconds: 1800,
        });
    });

    it('retains both bounds of structured and compact ranges', () => {
        const structured = {
            value: {
                type: 'range',
                value: {
                    start: { type: 'regular', value: 10 },
                    end: { type: 'regular', value: 15 },
                },
            },
            unit: 'min',
        };
        const expected = { minimumSeconds: 600, maximumSeconds: 900 };
        expect(timerDurationFromQuantity(structured, units)).toEqual(expected);
        expect(timerDurationFromQuantity(text('10-15m'), units)).toEqual(expected);
        expect(formatTimerDuration(expected)).toBe('10:00–15:00');
    });

    it('rejects text that is not entirely a supported duration', () => {
        expect(timerDurationFromQuantity(text('until golden'), units)).toBeNull();
        expect(timerDurationFromQuantity(text('5fortnights'), units)).toBeNull();
        expect(timerDurationFromQuantity(text('5m later'), units)).toBeNull();
    });

    it('matches configured labels case-insensitively', () => {
        const localized = createUnitMap('minuto', 'hora', 'segundo');
        expect(timerDurationFromQuantity(text('1HORA 2MINUTO 3SEGUNDO'), localized))
            .toEqual({ minimumSeconds: 3723, maximumSeconds: 3723 });
    });
});

describe('timerRangeStep', () => {
    it('uses minute steps when both bounds are whole minutes', () => {
        expect(timerRangeStep({ minimumSeconds: 600, maximumSeconds: 900 })).toBe(60);
    });

    it('uses second steps when either bound includes seconds', () => {
        expect(timerRangeStep({ minimumSeconds: 30, maximumSeconds: 90 })).toBe(1);
        expect(timerRangeStep({ minimumSeconds: 60, maximumSeconds: 90 })).toBe(1);
    });
});
