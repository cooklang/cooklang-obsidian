/**
 * ScalerBarRenderer — sticky bar with section jump-links and a servings stepper.
 * The stepper is hidden when the recipe has no numeric servings or the setting
 * is off. Anchors target the #cook-ingredients / #cook-steps regions.
 */
import { CooklangSettings } from '../settings';
import { clampServings } from '../utils/scaling';
import type { RenderContext } from './types';

export class ScalerBarRenderer {
    constructor(private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext): void {
        const bar = container.createDiv({ cls: 'cook-bar' });

        const nav = bar.createDiv({ cls: 'cook-bar-nav' });
        const ingLink = nav.createEl('a', {
            cls: 'cook-bar-link',
            text: this.settings.ingredientLabel || 'Ingredients',
            href: '#cook-ingredients',
        });
        ingLink.addEventListener('click', (e) => {
            e.preventDefault();
            container.querySelector('#cook-ingredients')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        const stepLink = nav.createEl('a', {
            cls: 'cook-bar-link',
            text: this.settings.methodLabel || 'Steps',
            href: '#cook-steps',
        });
        stepLink.addEventListener('click', (e) => {
            e.preventDefault();
            container.querySelector('#cook-steps')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        const showScaler = this.settings.showServingsScaler
            && ctx.state.baseServings != null
            && ctx.state.displayServings != null;
        if (!showScaler) return;

        const current = ctx.state.displayServings as number;
        const stepper = bar.createDiv({ cls: 'cook-stepper' });

        const dec = stepper.createEl('button', { cls: 'cook-stepper-btn', text: '−' });
        dec.setAttr('aria-label', 'Fewer servings');
        dec.addEventListener('click', () => {
            ctx.callbacks.onScaleChange(clampServings(current - 1));
        });

        const val = stepper.createSpan({ cls: 'cook-stepper-val' });
        val.createEl('b', { text: String(current) });
        val.appendText(' ' + (this.settings.servingsLabel || 'servings'));

        const inc = stepper.createEl('button', { cls: 'cook-stepper-btn', text: '+' });
        inc.setAttr('aria-label', 'More servings');
        inc.addEventListener('click', () => {
            ctx.callbacks.onScaleChange(clampServings(current + 1));
        });
    }
}
