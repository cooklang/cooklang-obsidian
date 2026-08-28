import { describe, it, expect } from 'vitest';
import { aggregateIngredients, formatQuantity, type AggInput } from './ingredientAggregator';

function ing(partial: Partial<AggInput>): AggInput {
    return {
        name: 'x', quantityValue: null, unit: null,
        quantityText: null, note: null, reference: null, ...partial,
    };
}

describe('formatQuantity', () => {
    it('rounds to 2 decimals and drops trailing zeros', () => {
        expect(formatQuantity(5.6667)).toBe('5.67');
        expect(formatQuantity(16.5)).toBe('16.5');
        expect(formatQuantity(11)).toBe('11');
    });
});

describe('aggregateIngredients', () => {
    it('sums quantities sharing a unit, treating cup/cups as one', () => {
        const rows = aggregateIngredients([
            ing({ name: 'all-purpose flour', quantityValue: 5, unit: 'cups' }),
            ing({ name: 'all-purpose flour', quantityValue: 2 / 3, unit: 'cup' }),
            ing({ name: 'all-purpose flour' }), // no amount
        ]);
        expect(rows).toHaveLength(1);
        expect(rows[0].displayQty).toBe('5.67 cups');
    });

    it('shows different units side by side', () => {
        const rows = aggregateIngredients([
            ing({ name: 'egg yolks', quantityValue: 7, unit: null }),
            ing({ name: 'egg yolks', quantityValue: 4, unit: 'large' }),
            ing({ name: 'dressing', quantityValue: 100, unit: 'g' }),
            ing({ name: 'dressing', quantityValue: 25, unit: 'ml' }),
        ]);
        expect(rows[0].displayQty).toBe('7 + 4 large');
        expect(rows[1].displayQty).toBe('100 g + 25 ml');
    });

    it('combines grams and kilograms using the largest denomination present', () => {
        const rows = aggregateIngredients([
            ing({ name: 'pizza flour', quantityValue: 150, unit: 'g' }),
            ing({ name: 'pizza flour', quantityValue: 1.35, unit: 'kg' }),
        ]);
        expect(rows[0].displayQty).toBe('1.5 kg');

        const reversed = aggregateIngredients([
            ing({ name: 'pizza flour', quantityValue: 1.35, unit: 'kilograms' }),
            ing({ name: 'pizza flour', quantityValue: 150, unit: 'grams' }),
        ]);
        expect(reversed[0].displayQty).toBe('1.5 kilograms');
    });

    it('uses Math.js to combine compatible units and select the best display unit', () => {
        const rows = aggregateIngredients([
            ing({ name: 'stock', quantityValue: 750, unit: 'ml' }),
            ing({ name: 'stock', quantityValue: 0.5, unit: 'l' }),
            ing({ name: 'butter', quantityValue: 1, unit: 'lb' }),
            ing({ name: 'butter', quantityValue: 8, unit: 'oz' }),
            ing({ name: 'vanilla', quantityValue: 1, unit: 'tbsp' }),
            ing({ name: 'vanilla', quantityValue: 3, unit: 'tsp' }),
        ]);
        expect(rows[0].displayQty).toBe('1.25 l');
        expect(rows[1].displayQty).toBe('1.5 lb');
        expect(rows[2].displayQty).toBe('2 tbsp');
    });

    it('lists range/textual amounts as-is', () => {
        const rows = aggregateIngredients([
            ing({ name: 'sugar', quantityText: '1.5-2.25 cups' }),
            ing({ name: 'sugar', quantityValue: 1, unit: 'cup' }),
        ]);
        expect(rows[0].displayQty).toBe('1 cup + 1.5-2.25 cups');
    });

    it('keeps distinct names separate and preserves first-seen order', () => {
        const rows = aggregateIngredients([
            ing({ name: 'butter', quantityValue: 1, unit: 'sticks' }),
            ing({ name: 'flour', quantityValue: 2, unit: 'cups' }),
            ing({ name: 'butter', quantityValue: 2, unit: 'sticks' }),
        ]);
        expect(rows.map(r => r.name)).toEqual(['butter', 'flour']);
        // unit display comes from the first occurrence in the group
        expect(rows[0].displayQty).toBe('3 sticks');
    });

    it('null displayQty when no amounts', () => {
        const rows = aggregateIngredients([ing({ name: 'salt' })]);
        expect(rows[0].displayQty).toBeNull();
        expect(rows[0].preparations).toEqual([]);
    });

    it('carries the first reference and preparation found', () => {
        const ref = {
            name: 'Beans',
            components: ['.', 'Components'],
            quantity: 2,
            unit: 'servings',
        };
        const rows = aggregateIngredients([
            ing({ name: 'Beans', quantityValue: 2, unit: 'servings', reference: ref, note: 'warm' }),
        ]);
        expect(rows[0].reference).toEqual(ref);
        expect(rows[0].preparations).toEqual([{ name: 'warm', displayQty: '2 servings' }]);
        expect(rows[0].displayQty).toBe('2 servings');
    });

    it('keeps preparation quantities separate and in first-seen order', () => {
        const rows = aggregateIngredients([
            ing({ name: 'lemon', quantityValue: 1, note: 'juice' }),
            ing({ name: 'lemon', quantityValue: 0.5, note: 'zest' }),
        ]);

        expect(rows[0].displayQty).toBe('1.5');
        expect(rows[0].preparations).toEqual([
            { name: 'juice', displayQty: '1' },
            { name: 'zest', displayQty: '0.5' },
        ]);
    });

    it('combines repeated preparations with the normal quantity rules', () => {
        const rows = aggregateIngredients([
            ing({ name: 'onion', quantityValue: 150, unit: 'g', note: 'diced' }),
            ing({ name: 'onion', quantityValue: 1.35, unit: 'kg', note: 'diced' }),
            ing({ name: 'onion', quantityValue: 1, unit: 'tbsp', note: 'fried' }),
        ]);

        expect(rows[0].preparations).toEqual([
            { name: 'diced', displayQty: '1.5 kg' },
            { name: 'fried', displayQty: '1 tbsp' },
        ]);
    });

    it('omits unprepared and empty-note occurrences from the breakdown', () => {
        const rows = aggregateIngredients([
            ing({ name: 'lemon', quantityValue: 1 }),
            ing({ name: 'lemon', quantityValue: 0.5, note: 'juice' }),
            ing({ name: 'lemon', quantityValue: 0.25, note: '   ' }),
        ]);

        expect(rows[0].displayQty).toBe('1.75');
        expect(rows[0].preparations).toEqual([{ name: 'juice', displayQty: '0.5' }]);
    });
});
