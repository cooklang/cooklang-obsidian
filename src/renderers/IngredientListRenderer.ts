/**
 * IngredientListRenderer - Renders recipe ingredients list
 *
 * Handles rendering of the ingredients section with quantities.
 */

import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';
import { getFlatIngredients } from '../recipeHelpers';

/**
 * Renders recipe ingredients list section
 */
export class IngredientListRenderer {
    constructor(private settings: CooklangSettings) {}

    /**
     * Render ingredients list section if enabled and ingredients exist
     * @param recipe - Parsed recipe object
     * @param container - Container element to render into
     */
    public render(recipe: CooklangRecipe, container: HTMLElement): void {
        if (!this.settings.showIngredientList) {
            return; // Feature disabled
        }

        const ingredients = getFlatIngredients(recipe);

        if (!ingredients || ingredients.length === 0) {
            return; // No ingredients to render
        }

        // Add the Ingredients header
        container.createEl('h2', {
            cls: 'ingredients-header',
            text: this.settings.ingredientLabel || 'Ingredients'
        });

        // Add the ingredients list
        const ul = container.createEl('ul', { cls: 'ingredients' });

        ingredients.forEach(ingredient => {
            const li = ul.createEl('li');

            // Add quantity if present
            if (ingredient.displayText) {
                li.createEl('span', { cls: 'amount', text: ingredient.displayText });
                li.appendText(' ');
            }

            // Add ingredient name
            li.appendText(ingredient.name);
        });
    }
}
