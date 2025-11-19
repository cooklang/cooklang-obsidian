/**
 * MetadataRenderer - Renders recipe metadata section
 *
 * Handles rendering of recipe metadata (author, time, servings, etc.)
 * with special handling for tags and URLs.
 */

import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';
import { isValidUrl } from '../utils/urlValidators';
import { getMetadata } from '../recipeHelpers';

/**
 * Renders recipe metadata section
 */
export class MetadataRenderer {
    constructor(private settings: CooklangSettings) {}

    /**
     * Render metadata section if metadata exists
     * @param recipe - Parsed recipe object
     * @param container - Container element to render into
     */
    public render(recipe: CooklangRecipe, container: HTMLElement): void {
        const metadata = getMetadata(recipe);

        if (!metadata || Object.keys(metadata).length === 0) {
            return; // No metadata to render
        }

        // Add the metadata header
        container.createEl('h2', {
            cls: 'metadata-header',
            text: this.settings.metadataLabel || 'Metadata'
        });

        // Create metadata list
        const ul = container.createEl('ul', { cls: 'metadata' });

        Object.entries(metadata).forEach(([key, value]) => {
            const li = ul.createEl('li');
            li.createEl('span', { cls: 'metadata-key', text: key });

            // Special handling for tags - prefix with hashtag
            if (key === 'tags') {
                const tags = value
                    .split(",")
                    .map(s => `#${s.trim()}`)
                    .join(", ");
                li.appendText(tags);
            }
            // Special handling for URLs - create clickable link
            else if (isValidUrl(value)) {
                li.createEl('a', {
                    text: value,
                    attr: { href: value, target: '_blank', rel: 'noopener' }
                });
            }
            // Default - just append text
            else {
                li.appendText(`${value}`);
            }
        });
    }
}
