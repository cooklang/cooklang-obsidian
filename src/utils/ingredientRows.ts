import type { CooklangRecipe, Ingredient } from '@cooklang/cooklang';
import type { CooklangSettings } from '../settings';
import {
    ingredient_display_name,
    ingredient_should_be_listed,
    quantity_display,
} from '../recipeHelpers';
import {
    aggregateIngredients,
    type AggInput,
    type IngredientRow,
} from './ingredientAggregator';
import { buildSectionGroups } from './ingredientSectionGroups';
import { numericFromQuantity } from './quantityValue';
import { getSections, hasNamedSections } from './sectionHelpers';

export interface IngredientDisplayGroup {
    name: string | null;
    rows: IngredientRow[];
}

export function ingredientToAggInput(ingredient: Ingredient): AggInput {
    const quantity = ingredient.quantity;
    let quantityValue: number | null = null;
    let unit: string | null = null;
    let quantityText: string | null = null;

    if (quantity) {
        const numeric = numericFromQuantity(quantity);
        if (numeric !== null) {
            quantityValue = numeric;
            unit = quantity.unit ?? null;
        } else {
            quantityText = quantity_display(quantity);
        }
    }

    return {
        name: ingredient_display_name(ingredient),
        quantityValue,
        unit,
        quantityText,
        note: ingredient.note ?? null,
        reference: ingredient.reference
            ? {
                name: ingredient.reference.name,
                components: ingredient.reference.components ?? [],
            }
            : null,
    };
}

export function buildIngredientDisplayGroups(
    recipe: CooklangRecipe,
    settings: CooklangSettings,
): IngredientDisplayGroup[] {
    if (!settings.showIngredientList) return [];

    const inputForIndex = (index: number): AggInput | null => {
        const ingredient = recipe.ingredients[index];
        return ingredient && ingredient_should_be_listed(ingredient)
            ? ingredientToAggInput(ingredient)
            : null;
    };

    if (settings.groupIngredientsBySection) {
        const sections = getSections(recipe);
        if (hasNamedSections(sections)) {
            return buildSectionGroups(sections, inputForIndex);
        }
    }

    const rows = aggregateIngredients(
        recipe.ingredients
            .filter(ingredient => ingredient_should_be_listed(ingredient))
            .map(ingredientToAggInput),
    );
    return rows.length ? [{ name: null, rows }] : [];
}
