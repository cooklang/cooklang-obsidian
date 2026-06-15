/**
 * PreviewRenderer — layout orchestrator.
 *
 * Emits the rich single-page layout: hero → sticky scaler bar → two-column
 * (ingredients | steps). Honors the layout settings; falls back to a stacked
 * single column when twoColumnLayout is off.
 */
import { App, TFile } from 'obsidian';
import { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';
import { getSections } from '../utils/sectionHelpers';
import { findRecipeImages } from '../utils/imageHelpers';
import { HeroRenderer } from './HeroRenderer';
import { ScalerBarRenderer } from './ScalerBarRenderer';
import { IngredientListRenderer } from './IngredientListRenderer';
import { CookwareListRenderer } from './CookwareListRenderer';
import { TimerListRenderer } from './TimerListRenderer';
import { MethodStepsRenderer } from './MethodStepsRenderer';
import { MetadataRenderer } from './MetadataRenderer';
import type { RenderContext } from './types';

export class PreviewRenderer {
    private hero: HeroRenderer;
    private scalerBar: ScalerBarRenderer;
    private ingredientRenderer: IngredientListRenderer;
    private cookwareRenderer: CookwareListRenderer;
    private timerListRenderer: TimerListRenderer;
    private methodStepsRenderer: MethodStepsRenderer;
    private metadataRenderer: MetadataRenderer;

    constructor(
        private app: App,
        private settings: CooklangSettings,
        private timerService: TimerService,
    ) {
        this.buildRenderers();
    }

    private buildRenderers(): void {
        this.hero = new HeroRenderer(this.app, this.settings);
        this.scalerBar = new ScalerBarRenderer(this.settings);
        this.ingredientRenderer = new IngredientListRenderer(this.settings);
        this.cookwareRenderer = new CookwareListRenderer(this.settings);
        this.timerListRenderer = new TimerListRenderer(this.settings);
        this.methodStepsRenderer = new MethodStepsRenderer(this.app, this.settings, this.timerService);
        this.metadataRenderer = new MetadataRenderer(this.settings);
    }

    public updateSettings(settings: CooklangSettings): void {
        this.settings = settings;
        this.buildRenderers();
    }

    public render(container: HTMLElement, file: TFile | null, ctx: RenderContext): void {
        container.empty();
        container.addClass('cook-rich');

        const sections = getSections(ctx.recipe);
        const images = findRecipeImages(file);

        // Hero (title image, title, description, pills)
        this.hero.render(container, ctx, images.mainImage);

        // Sticky scaler/nav bar
        this.scalerBar.render(container, ctx);

        // Two-column (or stacked) body
        const cols = container.createDiv({ cls: 'cook-cols' });
        if (!this.settings.twoColumnLayout) cols.addClass('cook-cols-stacked');

        const aside = cols.createDiv({ cls: 'cook-aside' });
        this.ingredientRenderer.render(aside, ctx, sections);
        this.cookwareRenderer.render(ctx.recipe, aside);
        this.timerListRenderer.render(ctx.recipe, aside);

        const main = cols.createDiv({ cls: 'cook-main' });
        this.methodStepsRenderer.render(main, ctx, sections, file, images.allImages);

        // Leftover custom metadata ("More details")
        this.metadataRenderer.render(ctx.recipe, container);
    }
}
