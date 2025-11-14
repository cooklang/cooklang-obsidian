/**
 * Adapter to make the new WASM parser compatible with the old TypeScript parser API
 * This allows us to use the new parser without rewriting all the existing code
 */

import { CooklangParser, CooklangRecipe } from '@cooklang/cooklang-ts';
import type { Content, Item, Quantity as WasmQuantity, Value } from '@cooklang/cooklang-ts/pkg/cooklang_wasm';

// Old API types that the rest of the code expects
export interface Text {
    type: 'text';
    value: string;
}

export interface Ingredient {
    type: 'ingredient';
    name: string | null;
    quantity: number | null;
    units: string | null;
}

export interface Cookware {
    type: 'cookware';
    name: string | null;
    quantity: number | null;
}

export interface Timer {
    type: 'timer';
    name: string | null;
    quantity: number | null;
    units: string | null;
}

export type StepPart = Text | Ingredient | Cookware | Timer;

/**
 * Helper to extract numeric value from the WASM Value type
 */
function extractNumericValue(value: Value): number | null {
    if (value.type === 'number') {
        return Number(value.value);
    } else if (value.type === 'range') {
        // For ranges, use the start value
        return Number(value.value.start);
    }
    // For text values, return null
    return null;
}

/**
 * Helper to extract quantity info from WASM Quantity
 */
function extractQuantity(quantity: WasmQuantity | null): { value: number | null; unit: string | null } {
    if (!quantity) {
        return { value: null, unit: null };
    }
    return {
        value: extractNumericValue(quantity.value),
        unit: quantity.unit
    };
}

/**
 * Adapter class that mimics the old Recipe API
 */
export class Recipe {
    metadata: Record<string, string> = {};
    ingredients: Ingredient[] = [];
    cookwares: Cookware[] = [];
    steps: StepPart[][] = [];

    constructor(input: string) {
        const parser = new CooklangParser();
        const [recipe, report] = parser.parse(input);

        // Convert metadata from Map to plain object
        this.metadata = {};
        recipe.rawMetadata.forEach((value, key) => {
            this.metadata[String(key)] = String(value);
        });

        // Convert ingredients - flatten from all sections
        const ingredientMap = new Map<number, Ingredient>();
        recipe.ingredients.forEach((ing, index) => {
            const { value, unit } = extractQuantity(ing.quantity);
            ingredientMap.set(index, {
                type: 'ingredient',
                name: ing.name || null,
                quantity: value,
                units: unit
            });
        });

        // Convert cookware
        const cookwareMap = new Map<number, Cookware>();
        recipe.cookware.forEach((cw, index) => {
            const { value } = extractQuantity(cw.quantity);
            cookwareMap.set(index, {
                type: 'cookware',
                name: cw.name || null,
                quantity: value
            });
        });

        // Convert timers
        const timerMap = new Map<number, Timer>();
        recipe.timers.forEach((tm, index) => {
            const { value, unit } = extractQuantity(tm.quantity);
            timerMap.set(index, {
                type: 'timer',
                name: tm.name || null,
                quantity: value,
                units: unit
            });
        });

        // Build unique lists for the old API
        this.ingredients = Array.from(ingredientMap.values());
        this.cookwares = Array.from(cookwareMap.values());

        // Convert sections and steps to the old flat steps format
        recipe.sections.forEach(section => {
            section.content.forEach((content: Content) => {
                if (content.type === 'step') {
                    const step: StepPart[] = [];
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
                                name: ing.name || null,
                                quantity: value,
                                units: unit
                            });
                        } else if (item.type === 'cookware') {
                            const cw = recipe.cookware[item.index];
                            const { value } = extractQuantity(cw.quantity);
                            step.push({
                                type: 'cookware',
                                name: cw.name || null,
                                quantity: value
                            });
                        } else if (item.type === 'timer') {
                            const tm = recipe.timers[item.index];
                            const { value, unit } = extractQuantity(tm.quantity);
                            step.push({
                                type: 'timer',
                                name: tm.name || null,
                                quantity: value,
                                units: unit
                            });
                        }
                    });
                    this.steps.push(step);
                } else if (content.type === 'text') {
                    // Handle text content outside of steps
                    this.steps.push([{
                        type: 'text',
                        value: content.value
                    }]);
                }
            });
        });
    }
}
