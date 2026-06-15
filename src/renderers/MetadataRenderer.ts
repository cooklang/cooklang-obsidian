/**
 * MetadataRenderer — collapsible "More details" for custom metadata keys not
 * already surfaced as hero pills / typed fields.
 */
import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';
import { isValidUrl } from '../utils/urlValidators';
import { getMetadata } from '../recipeHelpers';

// Keys already shown in the hero or handled elsewhere.
const SHOWN_KEYS = new Set([
    'title', 'description', 'servings', 'serves', 'yield', 'time', 'prep time',
    'prep_time', 'cook time', 'cook_time', 'tags', 'tag', 'source', 'author',
    'difficulty', 'course', 'cuisine', 'diet', 'images', 'image',
]);

export class MetadataRenderer {
    constructor(private settings: CooklangSettings) {}

    render(recipe: CooklangRecipe, container: HTMLElement): void {
        const metadata = getMetadata(recipe);
        const entries = Object.entries(metadata)
            .filter(([key]) => !SHOWN_KEYS.has(key.toLowerCase().trim()));
        if (!entries.length) return;

        const details = container.createEl('details', { cls: 'cook-more' });
        details.createEl('summary', {
            cls: 'cook-more-summary',
            text: this.settings.metadataLabel || 'More details',
        });
        const ul = details.createEl('ul', { cls: 'cook-more-list' });

        entries.forEach(([key, value]) => {
            const li = ul.createEl('li');
            li.createSpan({ cls: 'cook-more-key', text: key });
            if (isValidUrl(value)) {
                li.createEl('a', {
                    text: value,
                    attr: { href: value, target: '_blank', rel: 'noopener' },
                });
            } else {
                li.appendText(String(value));
            }
        });
    }
}
