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
                    { type: 'step', value: { number: 1, items: [
                        { type: 'text', value: 'Blitz the ' },
                        { type: 'ingredient', index: 0 },
                        { type: 'text', value: ' in a ' },
                        { type: 'cookware', index: 0 },
                        { type: 'text', value: '.' },
                    ] } },
                    { type: 'text', value: 'Make double and freeze.' },
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
        expect(s[0].steps[0].globalIndex).toBe(0);
        expect(s[1].steps[0].globalIndex).toBe(1);
    });

    it('resolves step parts to ingredient/cookware/timer objects', () => {
        const s = getSections(makeRecipe());
        const parts = s[0].steps[0].parts;
        expect(parts[0]).toEqual({ type: 'text', value: 'Blitz the ' });
        expect(parts[1]).toEqual({ type: 'ingredient', ingredient: { name: 'paste' } });
        expect(parts[3]).toEqual({ type: 'cookware', cookware: { name: 'blender' } });
        expect(s[1].steps[0].parts[1]).toEqual({ type: 'timer', timer: { name: null } });
    });

    it('collects text blocks as notes', () => {
        const s = getSections(makeRecipe());
        expect(s[0].notes).toEqual(['Make double and freeze.']);
        expect(s[1].notes).toEqual([]);
    });

    it('removes a repeated note marker after a backslash-created newline', () => {
        const recipe = makeRecipe();
        recipe.sections[0].content[1].value = 'First line\n> second line';

        const s = getSections(recipe);

        expect(s[0].notes).toEqual(['First line\nsecond line']);
    });

    it('collects unique ingredient indices per section in first-seen order', () => {
        const s = getSections(makeRecipe());
        expect(s[0].ingredientIndices).toEqual([0]);
        expect(s[1].ingredientIndices).toEqual([1]);
    });
});
