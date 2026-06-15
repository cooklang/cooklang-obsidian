import { App } from 'obsidian';
import { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';
import type { SectionView, StepPart } from '../utils/sectionHelpers';
import type { TFile } from 'obsidian';
import type { RenderContext } from './types';

export class MethodStepsRenderer {
    constructor(
        private app: App,
        private settings: CooklangSettings,
        private timerService: TimerService,
    ) {}

    render(
        container: HTMLElement,
        _ctx: RenderContext,
        sections: SectionView[],
        _file: TFile | null,
        _allImages: TFile[],
    ): void {
        const region = container.createDiv({ cls: 'cook-steps' });
        region.id = 'cook-steps';
        region.createEl('h2', { cls: 'cook-section-title', text: this.settings.methodLabel || 'Method' });
        sections.forEach(section => {
            section.steps.forEach(step => {
                const li = region.createDiv({ cls: 'cook-step' });
                li.createSpan({ cls: 'cook-step-n', text: `${step.globalIndex + 1}.` });
                const body = li.createDiv({ cls: 'cook-step-text' });
                step.parts.forEach((part: StepPart) => {
                    if (part.type === 'text') body.appendText(part.value);
                    else if (part.type === 'ingredient') body.createSpan({ text: part.ingredient.name });
                    else if (part.type === 'cookware') body.createSpan({ text: part.cookware.name });
                    else if (part.type === 'timer') body.createSpan({ text: '⏱' });
                });
            });
        });
        void this.timerService; void this.app;
    }
}
