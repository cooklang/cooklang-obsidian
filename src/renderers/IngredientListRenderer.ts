/**
 * IngredientListRenderer — a single combined ingredient checklist for the whole
 * recipe (CookCLI-style). Duplicate ingredients are merged and their quantities
 * summed by the parser's own grouping (`recipe.groupedIngredients`), which
 * handles fractions and mixed units (e.g. "1 cup + 2 tbsp"). Quantities reflect
 * the already-scaled recipe (CookView re-parses with scale). Checkboxes are
 * keyed by ingredient name so scaling / re-render preserves checked state.
 */
import { CooklangSettings } from '../settings';
import {
    ingredient_should_be_listed,
    ingredient_display_name,
    grouped_quantity_is_empty,
    grouped_quantity_display,
} from '../recipeHelpers';
import type { RenderContext } from './types';

export class IngredientListRenderer {
    constructor(private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext): void {
        if (!this.settings.showIngredientList) return;

        const grouped = ctx.recipe.groupedIngredients
            .filter(([ingredient]) => ingredient_should_be_listed(ingredient));
        if (!grouped.length) return;

        const region = container.createDiv({ cls: 'cook-ingredients' });
        region.id = 'cook-ingredients';
        region.createEl('h2', {
            cls: 'cook-section-title',
            text: this.settings.ingredientLabel || 'Ingredients',
        });

        const ul = region.createEl('ul', { cls: 'cook-ing-list' });
        const checked = ctx.state.checkedIngredients;

        for (const [ingredient, quantity] of grouped) {
            const name = ingredient_display_name(ingredient);
            const isChecked = checked.has(name);

            const li = ul.createEl('li', { cls: isChecked ? 'cook-ing done' : 'cook-ing' });
            li.createSpan({ cls: 'cook-ing-box' });
            li.createSpan({ cls: 'cook-ing-name', text: name });

            if (!grouped_quantity_is_empty(quantity)) {
                li.createSpan({ cls: 'cook-ing-qty', text: grouped_quantity_display(quantity) });
            }

            li.addEventListener('click', () => {
                if (checked.has(name)) checked.delete(name);
                else checked.add(name);
                ctx.callbacks.onIngredientToggle();
            });
        }
    }
}
