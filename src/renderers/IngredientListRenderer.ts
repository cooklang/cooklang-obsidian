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
     * @param checkedIngredients - Set of checked ingredient IDs
     * @param onToggle - Callback when ingredient is toggled
     */
    public render(
        recipe: CooklangRecipe, 
        container: HTMLElement,
        checkedIngredients?: Set<string>,
        onToggle?: () => void
    ): void {
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
            // Create unique ID for this ingredient
            const ingredientId = `${ingredient.name}-${ingredient.displayText || 'none'}`;
            const isChecked = checkedIngredients?.has(ingredientId) || false;

            console.log('Rendering ingredient:', ingredientId, 'isChecked:', isChecked);

            const li = ul.createEl('li', { 
                cls: `cook-ingredient ${isChecked ? 'ingredient-checked' : ''}`
            });

            // Apply inline styles for checked state
            if (isChecked) {
                li.style.textDecoration = 'line-through';
                li.style.opacity = '0.5';
            }

            // Add click handler if checkedIngredients is provided
            if (checkedIngredients && onToggle) {
                li.style.cursor = 'pointer';
                li.onclick = () => {
                    if (isChecked) {
                        checkedIngredients.delete(ingredientId);
                        console.log('Unchecked:', ingredientId, 'Set now has:', checkedIngredients.size);
                    } else {
                        checkedIngredients.add(ingredientId);
                        console.log('Checked:', ingredientId, 'Set now has:', checkedIngredients.size);
                    }
                    console.log('Current checked ingredients:', Array.from(checkedIngredients));
                    onToggle();
                };
            }

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
