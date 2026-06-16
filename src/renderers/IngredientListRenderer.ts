/**
 * IngredientListRenderer — the recipe's ingredient checklist.
 *
 * By default rows are merged across the whole recipe by name and quantities
 * summed per unit (see aggregateIngredients); recipe references render as links
 * to the target recipe. Quantities reflect the already-scaled recipe (CookView
 * re-parses with scale). Checkboxes are keyed by ingredient name so scaling /
 * re-render preserves state.
 *
 * When `groupIngredientsBySection` is enabled and the recipe has named sections,
 * ingredients are instead grouped under each section's title and aggregated
 * within that section (#69).
 */
import { App } from 'obsidian';
import { CooklangSettings } from '../settings';
import {
    ingredient_should_be_listed,
    ingredient_display_name,
    quantity_display,
} from '../recipeHelpers';
import { numericFromQuantity } from '../utils/quantityValue';
import {
    aggregateIngredients,
    type AggInput,
    type IngredientRow,
} from '../utils/ingredientAggregator';
import { getSections, hasNamedSections } from '../utils/sectionHelpers';
import { buildSectionGroups } from '../utils/ingredientSectionGroups';
import { renderReferenceLink } from './referenceLink';
import type { RenderContext } from './types';

export class IngredientListRenderer {
    constructor(private app: App, private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext): void {
        if (!this.settings.showIngredientList) return;

        const inputForIndex = (index: number): AggInput | null => {
            const ing = ctx.recipe.ingredients[index];
            if (!ing || !ingredient_should_be_listed(ing)) return null;
            return this.toAggInput(ing);
        };

        // Grouped path: only when enabled AND the recipe actually has named sections.
        if (this.settings.groupIngredientsBySection) {
            const sections = getSections(ctx.recipe);
            if (hasNamedSections(sections)) {
                const groups = buildSectionGroups(sections, inputForIndex);
                if (!groups.length) return;
                const region = this.createRegion(container);
                for (const group of groups) {
                    if (group.name) {
                        region.createEl('div', { cls: 'cook-ing-group-title', text: group.name });
                    }
                    const ul = region.createEl('ul', { cls: 'cook-ing-list' });
                    for (const row of group.rows) this.renderRow(ul, row, ctx);
                }
                return;
            }
        }

        // Flat combined list (default).
        const inputs: AggInput[] = ctx.recipe.ingredients
            .filter((ing: any) => ingredient_should_be_listed(ing))
            .map((ing: any) => this.toAggInput(ing));
        const rows = aggregateIngredients(inputs);
        if (!rows.length) return;

        const region = this.createRegion(container);
        const ul = region.createEl('ul', { cls: 'cook-ing-list' });
        for (const row of rows) this.renderRow(ul, row, ctx);
    }

    private createRegion(container: HTMLElement): HTMLElement {
        const region = container.createDiv({ cls: 'cook-ingredients' });
        region.id = 'cook-ingredients';
        region.createEl('h2', {
            cls: 'cook-section-title',
            text: this.settings.ingredientLabel || 'Ingredients',
        });
        return region;
    }

    private renderRow(ul: HTMLElement, row: IngredientRow, ctx: RenderContext): void {
        const checked = ctx.state.checkedIngredients;
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

    private toAggInput(ing: any): AggInput {
        const q = ing.quantity;
        let quantityValue: number | null = null;
        let unit: string | null = null;
        let quantityText: string | null = null;

        if (q) {
            const num = numericFromQuantity(q);
            if (num !== null) {
                quantityValue = num;
                unit = q.unit ?? null; // author's unit ("cups"), not the abbreviated canonical form
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
