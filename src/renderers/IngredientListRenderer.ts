/**
 * IngredientListRenderer — checklist grouped by Cooklang section when the recipe
 * has named sections. Quantities come from the already-scaled recipe (CookView
 * re-parses with scale). Checkboxes are keyed by ingredient name so scaling /
 * re-render preserves checked state.
 */
import { CooklangSettings } from '../settings';
import { getFlatIngredients } from '../recipeHelpers';
import type { FlatIngredient } from '@cooklang/cooklang-ts';
import { hasNamedSections, type SectionView } from '../utils/sectionHelpers';
import type { RenderContext } from './types';

export class IngredientListRenderer {
    constructor(private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext, sections: SectionView[]): void {
        if (!this.settings.showIngredientList) return;

        const all = getFlatIngredients(ctx.recipe);
        if (!all.length) return;

        const region = container.createDiv({ cls: 'cook-ingredients' });
        region.id = 'cook-ingredients';
        region.createEl('h2', {
            cls: 'cook-section-title',
            text: this.settings.ingredientLabel || 'Ingredients',
        });

        if (hasNamedSections(sections) && sections.length > 1) {
            // Group ingredients by section using each section's ingredientIndices.
            sections.forEach(section => {
                const items = section.ingredientIndices
                    .map(i => all[i])
                    .filter((x): x is FlatIngredient => !!x);
                if (!items.length) return;
                if (section.name) {
                    region.createEl('h3', { cls: 'cook-subhead', text: section.name });
                }
                this.renderList(region, items, ctx);
            });
        } else {
            this.renderList(region, all, ctx);
        }
    }

    private renderList(parent: HTMLElement, items: FlatIngredient[], ctx: RenderContext): void {
        const ul = parent.createEl('ul', { cls: 'cook-ing-list' });
        const checked = ctx.state.checkedIngredients;

        items.forEach(ing => {
            const key = ing.name;
            const isChecked = checked.has(key);

            const li = ul.createEl('li', {
                cls: isChecked ? 'cook-ing done' : 'cook-ing',
            });
            li.createSpan({ cls: 'cook-ing-box' });
            li.createSpan({ cls: 'cook-ing-name', text: ing.name });
            // displayText already includes the unit (e.g. "3/4 tsp"), so it is
            // used as-is — concatenating ing.unit would duplicate it.
            if (ing.displayText) {
                li.createSpan({ cls: 'cook-ing-qty', text: ing.displayText });
            }

            li.addEventListener('click', () => {
                if (checked.has(key)) checked.delete(key);
                else checked.add(key);
                ctx.callbacks.onIngredientToggle();
            });
        });
    }
}
