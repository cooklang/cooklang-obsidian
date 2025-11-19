/**
 * CookwareListRenderer - Renders recipe cookware list
 *
 * Handles rendering of the cookware section with quantities.
 */

import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';
import { getFlatCookware } from '../recipeHelpers';

/**
 * Renders recipe cookware list section
 */
export class CookwareListRenderer {
    constructor(private settings: CooklangSettings) {}

    /**
     * Render cookware list section if enabled and cookware exists
     * @param recipe - Parsed recipe object
     * @param container - Container element to render into
     */
    public render(recipe: CooklangRecipe, container: HTMLElement): void {
        if (!this.settings.showCookwareList) {
            return; // Feature disabled
        }

        const cookwares = getFlatCookware(recipe);

        if (!cookwares || cookwares.length === 0) {
            return; // No cookware to render
        }

        // Add the Cookware header
        container.createEl('h2', {
            cls: 'cookware-header',
            text: this.settings.cookwareLabel || 'Cookware'
        });

        // Add the Cookware list
        const ul = container.createEl('ul', { cls: 'cookware' });

        cookwares.forEach(item => {
            const li = ul.createEl('li');

            // Add quantity if present
            if (item.displayText) {
                li.createEl('span', { cls: 'amount', text: item.displayText });
                li.appendText(' ');
            }

            // Add cookware name
            li.appendText(item.name);
        });
    }
}
