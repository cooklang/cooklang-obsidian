/**
 * IngredientListRenderer — a single combined ingredient checklist for the whole
 * recipe. Rows are merged by name and quantities summed per unit (see
 * aggregateIngredients); recipe references render as links to the target recipe.
 * Quantities reflect the already-scaled recipe (CookView re-parses with scale).
 * Checkboxes are keyed by ingredient name so scaling / re-render preserves state.
 */
import { App } from 'obsidian';
import { CooklangSettings } from '../settings';
import {
    ingredient_should_be_listed,
    ingredient_display_name,
    getQuantityValue,
    getQuantityUnit,
    quantity_display,
} from '../recipeHelpers';
import { aggregateIngredients, type AggInput } from '../utils/ingredientAggregator';
import { renderReferenceLink } from './referenceLink';
import type { RenderContext } from './types';

export class IngredientListRenderer {
    constructor(private app: App, private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext): void {
        if (!this.settings.showIngredientList) return;

        const inputs: AggInput[] = ctx.recipe.ingredients
            .filter((ing: any) => ingredient_should_be_listed(ing))
            .map((ing: any) => this.toAggInput(ing));
        const rows = aggregateIngredients(inputs);
        if (!rows.length) return;

        const region = container.createDiv({ cls: 'cook-ingredients' });
        region.id = 'cook-ingredients';
        region.createEl('h2', {
            cls: 'cook-section-title',
            text: this.settings.ingredientLabel || 'Ingredients',
        });

        const ul = region.createEl('ul', { cls: 'cook-ing-list' });
        const checked = ctx.state.checkedIngredients;

        for (const row of rows) {
            const isChecked = checked.has(row.name);
            const li = ul.createEl('li', { cls: isChecked ? 'cook-ing done' : 'cook-ing' });
            li.createSpan({ cls: 'cook-ing-box' });

            const nameEl = li.createSpan({ cls: 'cook-ing-name' });
            if (row.reference) {
                renderReferenceLink(this.app, ctx.file, row.reference, nameEl);
            } else {
                nameEl.setText(row.name);
            }

            if (row.displayQty) {
                li.createSpan({ cls: 'cook-ing-qty', text: row.displayQty });
            }

            li.addEventListener('click', (e) => {
                // Ignore clicks on the reference link itself.
                if ((e.target as HTMLElement).closest('a')) return;
                if (checked.has(row.name)) checked.delete(row.name);
                else checked.add(row.name);
                ctx.callbacks.onIngredientToggle();
            });
        }
    }

    private toAggInput(ing: any): AggInput {
        const q = ing.quantity;
        let quantityValue: number | null = null;
        let unit: string | null = null;
        let quantityText: string | null = null;

        if (q) {
            if (q.value?.type === 'number') {
                quantityValue = getQuantityValue(q);
                unit = getQuantityUnit(q);
            } else {
                // range or text amount — show as-is, don't sum
                quantityText = quantity_display(q);
            }
        }

        return {
            name: ingredient_display_name(ing),
            quantityValue,
            unit,
            quantityText,
            note: ing.note ?? null,
            reference: ing.reference
                ? { name: ing.reference.name, components: ing.reference.components ?? [] }
                : null,
        };
    }
}
