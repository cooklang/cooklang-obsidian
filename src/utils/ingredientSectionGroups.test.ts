import { describe, it, expect } from 'vitest';
import type { SectionView } from './sectionHelpers';
import type { AggInput } from './ingredientAggregator';
import { buildSectionGroups } from './ingredientSectionGroups';

function section(name: string | null, ingredientIndices: number[]): SectionView {
    return { name, entries: [], ingredientIndices };
}

// index -> AggInput (or null for an ingredient that should not be listed)
const INPUTS: Record<number, AggInput | null> = {
    0: { name: 'strawberry', quantityValue: 200, unit: 'g', quantityText: null, note: null, reference: null },
    1: { name: 'sugar', quantityValue: 50, unit: 'g', quantityText: null, note: null, reference: null },
    2: { name: 'cream', quantityValue: 300, unit: 'ml', quantityText: null, note: null, reference: null },
    3: null, // not listable
    4: { name: 'salt', quantityValue: null, unit: null, quantityText: 'a pinch', note: null, reference: null },
    5: { name: 'flour', quantityValue: 100, unit: 'g', quantityText: null, note: null, reference: null },
    6: { name: 'flour', quantityValue: 50, unit: 'g', quantityText: null, note: null, reference: null },
};
const inputForIndex = (i: number): AggInput | null => INPUTS[i] ?? null;

describe('buildSectionGroups', () => {
    it('groups ingredients per section, preserving order', () => {
        const groups = buildSectionGroups(
            [section('Coulis', [0, 1]), section('Panna cotta', [2, 1])],
            inputForIndex,
        );
        expect(groups.map(g => g.name)).toEqual(['Coulis', 'Panna cotta']);
        expect(groups[0].rows.map(r => [r.name, r.displayQty])).toEqual([
            ['strawberry', '200 g'],
            ['sugar', '50 g'],
        ]);
    });

    it('aggregates within each section independently (shared ingredient repeats)', () => {
        const groups = buildSectionGroups(
            [section('Coulis', [0, 1]), section('Panna cotta', [2, 1])],
            inputForIndex,
        );
        expect(groups[1].rows.map(r => [r.name, r.displayQty])).toEqual([
            ['cream', '300 ml'],
            ['sugar', '50 g'],
        ]);
    });

    it('sums same-name ingredients within one section', () => {
        const groups = buildSectionGroups([section('Dough', [5, 6])], inputForIndex);
        expect(groups[0].rows.map(r => [r.name, r.displayQty])).toEqual([['flour', '150 g']]);
    });

    it('skips sections with no listable ingredients', () => {
        const groups = buildSectionGroups(
            [section('Empty', [3]), section('Coulis', [0])],
            inputForIndex,
        );
        expect(groups.map(g => g.name)).toEqual(['Coulis']);
    });

    it('keeps a null name for the unnamed section and formats text amounts', () => {
        const groups = buildSectionGroups([section(null, [4])], inputForIndex);
        expect(groups).toHaveLength(1);
        expect(groups[0].name).toBeNull();
        expect(groups[0].rows[0]).toMatchObject({ name: 'salt', displayQty: 'a pinch' });
    });
});
