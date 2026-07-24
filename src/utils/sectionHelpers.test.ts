import { describe, it, expect } from 'vitest';
import { getSections } from './sectionHelpers';

// Minimal recipe shaped like CooklangRecipe (only fields getSections reads)
function makeRecipe() {
    return {
        ingredients: [{ name: 'paste' }, { name: 'coconut milk' }],
        cookware: [{ name: 'blender' }],
        timers: [{ name: null }],
        sections: [
            {
                name: 'Curry paste',
                content: [
                    { type: 'text', value: 'Prep everything before starting.' },
                    { type: 'step', value: { number: 1, items: [
                        { type: 'text', value: 'Blitz the ' },
                        { type: 'ingredient', index: 0 },
                        { type: 'text', value: ' in a ' },
                        { type: 'cookware', index: 0 },
                        { type: 'text', value: '.' },
                    ] } },
                    { type: 'text', value: 'Make double and freeze.' },
                    { type: 'step', value: { number: 2, items: [
                        { type: 'text', value: 'Set aside.' },
                    ] } },
                    { type: 'text', value: 'Keep it warm.' },
                ],
            },
            {
                name: 'Cooking',
                content: [
                    { type: 'step', value: { number: 1, items: [
                        { type: 'text', value: 'Fry for ' },
                        { type: 'timer', index: 0 },
                        { type: 'text', value: ' then add ' },
                        { type: 'ingredient', index: 1 },
                    ] } },
                ],
            },
        ],
    } as any;
}

describe('getSections', () => {
    it('returns one entry per section with names', () => {
        const s = getSections(makeRecipe());
        expect(s.map(x => x.name)).toEqual(['Curry paste', 'Cooking']);
    });

    it('assigns a global 0-based step index across sections', () => {
        const s = getSections(makeRecipe());
        expect(s[0].entries[1]).toMatchObject({ type: 'step', step: { globalIndex: 0 } });
        expect(s[0].entries[3]).toMatchObject({ type: 'step', step: { globalIndex: 1 } });
        expect(s[1].entries[0]).toMatchObject({ type: 'step', step: { globalIndex: 2 } });
    });

    it('resolves step parts to ingredient/cookware/timer objects', () => {
        const s = getSections(makeRecipe());
        const entry = s[0].entries[1];
        expect(entry.type).toBe('step');
        if (entry.type !== 'step') throw new Error('Expected a step entry');
        const parts = entry.step.parts;
        expect(parts[0]).toEqual({ type: 'text', value: 'Blitz the ' });
        expect(parts[1]).toEqual({ type: 'ingredient', ingredient: { name: 'paste' } });
        expect(parts[3]).toEqual({ type: 'cookware', cookware: { name: 'blender' } });
        const timerEntry = s[1].entries[0];
        expect(timerEntry.type).toBe('step');
        if (timerEntry.type !== 'step') throw new Error('Expected a step entry');
        expect(timerEntry.step.parts[1]).toEqual({ type: 'timer', timer: { name: null } });
    });

    it('preserves notes before, between, and after steps', () => {
        const s = getSections(makeRecipe());
        expect(s[0].entries.map(entry => entry.type === 'step' ? 'step' : entry.note)).toEqual([
            'Prep everything before starting.',
            'step',
            'Make double and freeze.',
            'step',
            'Keep it warm.',
        ]);
    });

    it('collects unique ingredient indices per section in first-seen order', () => {
        const s = getSections(makeRecipe());
        expect(s[0].ingredientIndices).toEqual([0]);
        expect(s[1].ingredientIndices).toEqual([1]);
    });
});
