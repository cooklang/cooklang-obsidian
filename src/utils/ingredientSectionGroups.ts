/**
 * Builds per-section ingredient groups for the "group ingredients by section"
 * option (#69). Each section's ingredients are aggregated independently (within
 * the section), so a shared ingredient appears under each section it's used in
 * with its own summed amount.
 *
 * Pure: it relies only on aggregateIngredients and an injected `inputForIndex`
 * mapper, so it is unit-testable without the WASM recipe / Obsidian runtime.
 */
import type { SectionView } from './sectionHelpers';
import { aggregateIngredients, type AggInput, type IngredientRow } from './ingredientAggregator';

export interface IngredientGroup {
    /** Section name, or null for the unnamed/default section. */
    name: string | null;
    rows: IngredientRow[];
}

export function buildSectionGroups(
    sections: SectionView[],
    inputForIndex: (index: number) => AggInput | null,
): IngredientGroup[] {
    const groups: IngredientGroup[] = [];
    for (const section of sections) {
        const inputs: AggInput[] = [];
        for (const index of section.ingredientIndices) {
            const input = inputForIndex(index);
            if (input) inputs.push(input);
        }
        const rows = aggregateIngredients(inputs);
        if (rows.length) {
            groups.push({ name: section.name, rows });
        }
    }
    return groups;
}
