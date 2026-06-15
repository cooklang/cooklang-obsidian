import { CooklangSettings } from '../settings';
import { getFlatIngredients } from '../recipeHelpers';
import type { SectionView } from '../utils/sectionHelpers';
import type { RenderContext } from './types';

export class IngredientListRenderer {
    constructor(private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext, _sections: SectionView[]): void {
        if (!this.settings.showIngredientList) return;
        const items = getFlatIngredients(ctx.recipe);
        if (!items.length) return;
        const region = container.createDiv({ cls: 'cook-ingredients' });
        region.id = 'cook-ingredients';
        region.createEl('h2', { cls: 'cook-section-title', text: this.settings.ingredientLabel || 'Ingredients' });
        const ul = region.createEl('ul', { cls: 'cook-ing-list' });
        items.forEach(ing => {
            const li = ul.createEl('li', { cls: 'cook-ing' });
            li.createSpan({ cls: 'cook-ing-name', text: ing.name });
            if (ing.displayText) li.createSpan({ cls: 'cook-ing-qty', text: ing.displayText });
        });
    }
}
