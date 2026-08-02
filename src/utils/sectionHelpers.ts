/**
 * Section view-model helpers.
 *
 * Reads recipe.sections into a structure the renderers can consume directly,
 * preserving section names and content order, and assigning each
 * step a global 0-based index (used for per-step images and current-step
 * tracking). Pure — imports types only, no WASM/Obsidian runtime.
 */
import type {
    CooklangRecipe,
    Ingredient,
    Cookware,
    Timer,
} from '@cooklang/cooklang';

export type StepPart =
    | { type: 'text'; value: string }
    | { type: 'ingredient'; ingredient: Ingredient }
    | { type: 'cookware'; cookware: Cookware }
    | { type: 'timer'; timer: Timer };

export interface StepView {
    /** Step number within its section (1-based, from parser). */
    number: number;
    /** Global 0-based index across all steps in the recipe. */
    globalIndex: number;
    parts: StepPart[];
}

export type SectionEntry =
    | { type: 'step'; step: StepView }
    | { type: 'note'; note: string };

export interface SectionView {
    name: string | null;
    /** Steps and notes in the order they appear in the Cooklang source. */
    entries: SectionEntry[];
    /** Unique ingredient indices referenced in this section, first-seen order. */
    ingredientIndices: number[];
}

/**
 * The parser preserves a repeated note marker as literal text when it follows
 * a backslash continuation, e.g. `> first\\\n> second` becomes
 * `first\n> second`. Remove that structural marker before rendering.
 */
export function normalizeNoteText(note: string): string {
    return note.replace(/\n[ \t]*>[ \t]?/g, '\n');
}

export function getSections(recipe: CooklangRecipe): SectionView[] {
    const result: SectionView[] = [];
    let globalIndex = 0;

    for (const section of recipe.sections) {
        const view: SectionView = {
            name: section.name ?? null,
            entries: [],
            ingredientIndices: [],
        };
        const seen = new Set<number>();

        for (const content of section.content) {
            if (content.type === 'text') {
                view.entries.push({ type: 'note', note: normalizeNoteText(content.value) });
                continue;
            }
            // content.type === 'step'
            const step = content.value;
            const parts: StepPart[] = [];
            for (const item of step.items) {
                if (item.type === 'text') {
                    parts.push({ type: 'text', value: item.value });
                } else if (item.type === 'ingredient') {
                    const ingredient = recipe.ingredients[item.index];
                    parts.push({ type: 'ingredient', ingredient });
                    if (!seen.has(item.index)) {
                        seen.add(item.index);
                        view.ingredientIndices.push(item.index);
                    }
                } else if (item.type === 'cookware') {
                    parts.push({ type: 'cookware', cookware: recipe.cookware[item.index] });
                } else if (item.type === 'timer') {
                    parts.push({ type: 'timer', timer: recipe.timers[item.index] });
                }
                // 'inlineQuantity' items are ignored in the preview
            }
            view.entries.push({
                type: 'step',
                step: { number: step.number, globalIndex: globalIndex++, parts },
            });
        }
        result.push(view);
    }
    return result;
}

/** True when the recipe has more than one named section worth showing as bands. */
export function hasNamedSections(sections: SectionView[]): boolean {
    return sections.filter(s => s.name && s.name.trim().length > 0).length > 0;
}
