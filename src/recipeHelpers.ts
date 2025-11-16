// Helper functions to work with CooklangRecipe
import { CooklangRecipe } from '@cooklang/cooklang-ts';
import type { Content, Step, Item, Quantity, Value } from '@cooklang/cooklang-ts/pkg/cooklang_wasm';

/** Extract numeric value from WASM Value type */
export function extractNumericValue(value: Value): number | null {
    if (!value) {
        return null;
    }

    if (value.type === 'number') {
        return Number(value.value);
    } else if (value.type === 'range') {
        return Number(value.value.start);
    }
    return null;
}

/** Extract quantity value and unit */
export function extractQuantity(quantity: Quantity | null): { value: number | null; unit: string | null } {
    if (!quantity) {
        return { value: null, unit: null };
    }
    return {
        value: extractNumericValue(quantity.value),
        unit: quantity.unit
    };
}

/** Convert raw metadata Map to plain object */
export function getMetadata(recipe: CooklangRecipe): Record<string, string> {
    const metadata: Record<string, string> = {};
    recipe.rawMetadata.forEach((value, key) => {
        metadata[String(key)] = String(value);
    });
    return metadata;
}

/** Get all ingredients with their quantities */
export function getIngredients(recipe: CooklangRecipe) {
    return recipe.ingredients.map(ing => {
        const { value, unit } = extractQuantity(ing.quantity);
        return {
            name: ing.name,
            quantity: value,
            units: unit
        };
    });
}

/** Get all cookware */
export function getCookware(recipe: CooklangRecipe) {
    return recipe.cookware.map(cw => {
        const { value } = extractQuantity(cw.quantity);
        return {
            name: cw.name,
            quantity: value
        };
    });
}

/** Get all timers from steps */
export function getTimers(recipe: CooklangRecipe) {
    const timers: Array<{ name: string | null; quantity: number | null; units: string | null }> = [];

    recipe.sections.forEach(section => {
        section.content.forEach((content: Content) => {
            if (content.type === 'step') {
                content.value.items.forEach((item: Item) => {
                    if (item.type === 'timer') {
                        const tm = recipe.timers[item.index];
                        const { value, unit } = extractQuantity(tm.quantity);
                        timers.push({
                            name: tm.name,
                            quantity: value,
                            units: unit
                        });
                    }
                });
            }
        });
    });

    return timers;
}

/** Get all steps with their parts expanded */
export function getSteps(recipe: CooklangRecipe) {
    const steps: Array<Array<any>> = [];

    recipe.sections.forEach(section => {
        section.content.forEach((content: Content) => {
            if (content.type === 'step') {
                const step: any[] = [];
                content.value.items.forEach((item: Item) => {
                    if (item.type === 'text') {
                        step.push({
                            type: 'text',
                            value: item.value
                        });
                    } else if (item.type === 'ingredient') {
                        const ing = recipe.ingredients[item.index];
                        const { value, unit } = extractQuantity(ing.quantity);
                        step.push({
                            type: 'ingredient',
                            name: ing.name,
                            quantity: value,
                            units: unit
                        });
                    } else if (item.type === 'cookware') {
                        const cw = recipe.cookware[item.index];
                        const { value } = extractQuantity(cw.quantity);
                        step.push({
                            type: 'cookware',
                            name: cw.name,
                            quantity: value
                        });
                    } else if (item.type === 'timer') {
                        const tm = recipe.timers[item.index];
                        const { value, unit } = extractQuantity(tm.quantity);
                        step.push({
                            type: 'timer',
                            name: tm.name,
                            quantity: value,
                            units: unit
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
