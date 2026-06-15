/**
 * HeroRenderer — title image, title, description, and meta pills.
 */
import { App, TFile } from 'obsidian';
import { CooklangSettings } from '../settings';
import { buildMetaPills } from '../utils/heroModel';
import type { RenderContext } from './types';

export class HeroRenderer {
    constructor(private app: App, private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext, mainImage: TFile | null): void {
        const hero = container.createDiv({ cls: 'cook-hero' });

        const body = hero.createDiv({ cls: 'cook-hero-body' });

        const title = ctx.recipe.title?.trim();
        body.createEl('h1', { cls: 'cook-hero-title', text: title || 'Recipe' });

        const description = ctx.recipe.description?.trim();
        if (description) {
            body.createEl('p', { cls: 'cook-hero-desc', text: description });
        }

        const pills = buildMetaPills(ctx.recipe, ctx.state.displayServings);
        if (pills.length) {
            const row = body.createDiv({ cls: 'cook-pills' });
            for (const pill of pills) {
                const cls = pill.kind === 'tag' ? 'cook-pill cook-pill-tag' : 'cook-pill';
                if (pill.url && (pill.kind === 'source' || pill.kind === 'author')) {
                    const a = row.createEl('a', {
                        cls,
                        href: pill.url,
                        attr: { target: '_blank', rel: 'noopener' },
                    });
                    if (pill.icon) a.createSpan({ cls: 'cook-pill-icon', text: pill.icon });
                    a.appendText(pill.text);
                } else {
                    const el = row.createSpan({ cls });
                    if (pill.icon) el.createSpan({ cls: 'cook-pill-icon', text: pill.icon });
                    el.appendText(pill.text);
                }
            }
        }

        if (this.settings.showImages && mainImage) {
            const figure = hero.createDiv({ cls: 'cook-hero-image' });
            const img = figure.createEl('img');
            img.src = this.app.vault.getResourcePath(mainImage);
            img.alt = title || 'Recipe image';
        }
    }
}
