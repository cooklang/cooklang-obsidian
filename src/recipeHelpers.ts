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

import type { CooklangRecipe } from '@cooklang/cooklang-ts';

/** Convert raw metadata Map to plain object */
export function getMetadata(recipe: CooklangRecipe): Record<string, string> {
    const metadata: Record<string, string> = {};
    recipe.rawMetadata.forEach((value, key) => {
        metadata[String(key)] = String(value);
    });
    return metadata;
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
