// Helper functions to work with CooklangRecipe
// Re-export library functions for convenience
export {
    type CooklangRecipe,
    type FlatIngredient,
    type FlatCookware,
    type FlatTimer,
    getFlatIngredients,
    getFlatCookware,
    getFlatTimers,
    getNumericValue,
    getQuantityValue,
    getQuantityUnit,
    quantity_display,
    ingredient_display_name,
    cookware_display_name
} from '@cooklang/cooklang-ts';

import type { CooklangRecipe, Ingredient } from '@cooklang/cooklang-ts';
import { getQuantityValue, getQuantityUnit, quantity_display } from '@cooklang/cooklang-ts';
import { formatNumber } from './utils/numberFormatters';

/** Convert raw metadata Map to plain object */
export function getMetadata(recipe: CooklangRecipe): Record<string, string> {
    const metadata: Record<string, string> = {};
    recipe.rawMetadata.forEach((value, key) => {
        metadata[String(key)] = String(value);
    });
    return metadata;
}

/** Ingredient with consolidated quantity across all uses in the recipe */
export interface ConsolidatedIngredient {
    name: string;
    displayText: string | null;
    isDivided: boolean;
}

/**
 * Groups duplicate ingredient names and sums compatible quantities.
 * Ingredients used more than once are marked as divided.
 * @param ingredients - Raw ingredient list from the parsed recipe
 * @returns One entry per unique ingredient name
 */
export function consolidateIngredients(ingredients: Ingredient[]): ConsolidatedIngredient[] {
    const groups = new Map<string, Ingredient[]>();

    ingredients.forEach(ing => {
        const name = ing.alias ?? ing.name;
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name)!.push(ing);
    });

    const result: ConsolidatedIngredient[] = [];

    groups.forEach((group, name) => {
        const isDivided = group.length > 1;

        if (!isDivided) {
            const ing = group[0];
            result.push({
                name,
                displayText: ing.quantity ? quantity_display(ing.quantity) : null,
                isDivided: false
            });
            return;
        }

        // Group numeric quantities by unit, collect non-numeric display texts
        const unitTotals = new Map<string | null, number>();
        const fallbackTexts: string[] = [];

        group.forEach(ing => {
            if (!ing.quantity) return;
            const num = getQuantityValue(ing.quantity);
            const unit = getQuantityUnit(ing.quantity);
            if (num !== null) {
                unitTotals.set(unit, (unitTotals.get(unit) ?? 0) + num);
            } else {
                fallbackTexts.push(quantity_display(ing.quantity));
            }
        });

        const parts: string[] = [];
        unitTotals.forEach((total, unit) => {
            parts.push(unit ? `${formatNumber(total)} ${unit}` : formatNumber(total));
        });
        parts.push(...fallbackTexts);

        result.push({
            name,
            displayText: parts.length > 0 ? parts.join(', ') : null,
            isDivided: true
        });
    });

    return result;
}

/** Get all steps with their parts expanded */
export function getSteps(recipe: CooklangRecipe) {
    const steps: Array<Array<any>> = [];

    recipe.sections.forEach(section => {
        section.content.forEach((content) => {
            if (content.type === 'step') {
                const step: any[] = [];
                content.value.items.forEach((item) => {
                    if (item.type === 'text') {
                        step.push({
                            type: 'text',
                            value: item.value
                        });
                    } else if (item.type === 'ingredient') {
                        const ing = recipe.ingredients[item.index];
                        step.push({
                            type: 'ingredient',
                            ingredient: ing
                        });
                    } else if (item.type === 'cookware') {
                        const cw = recipe.cookware[item.index];
                        step.push({
                            type: 'cookware',
                            cookware: cw
                        });
                    } else if (item.type === 'timer') {
                        const tm = recipe.timers[item.index];
                        step.push({
                            type: 'timer',
                            timer: tm
                        });
                    }
                });
                steps.push(step);
            } else if (content.type === 'text') {
                steps.push([{
                    type: 'text',
                    value: content.value
                }]);
            }
        });
    });

    return steps;
}
