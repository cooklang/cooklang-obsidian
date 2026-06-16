/**
 * MarkdownRecipeRenderer — renders a `cook` code block embedded in a markdown
 * note as a compact, read-only recipe: a combined ingredient list followed by
 * numbered method steps. No hero, scaler, two-column layout, or interactivity.
 *
 * It reuses IngredientListRenderer and MethodStepsRenderer unchanged, driven by
 * a static RenderContext (no-op callbacks, scale 1, no checked ingredients, no
 * active step) and the embed settings override. Recipe-reference links resolve
 * relative to the host note (`file`).
 */
import { App, TFile } from 'obsidian';
import type { CooklangRecipe } from '@cooklang/cooklang';
import type { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';
import { getSections } from '../utils/sectionHelpers';
import { embedSettings } from '../utils/embedSettings';
import { IngredientListRenderer } from './IngredientListRenderer';
import { MethodStepsRenderer } from './MethodStepsRenderer';
import type { RenderContext } from './types';

export class MarkdownRecipeRenderer {
    constructor(private app: App, private timerService: TimerService) {}

    public render(
        container: HTMLElement,
        file: TFile | null,
        recipe: CooklangRecipe,
        baseSettings: CooklangSettings,
    ): void {
        container.empty();
        container.addClass('cook-embed');

        const settings = embedSettings(baseSettings);
        const ingredientRenderer = new IngredientListRenderer(this.app, settings);
        const methodStepsRenderer = new MethodStepsRenderer(this.app, settings, this.timerService);

        const ctx: RenderContext = {
            recipe,
            file,
            state: {
                scale: 1,
                baseServings: null,
                displayServings: null,
                checkedIngredients: new Set<string>(),
                currentStep: -1,
            },
            callbacks: {
                onScaleChange: () => {},
                onIngredientToggle: () => {},
                onStepActivate: () => {},
            },
        };

        const sections = getSections(recipe);
        ingredientRenderer.render(container, ctx);
        methodStepsRenderer.render(container, ctx, sections, file, []);
    }
}
