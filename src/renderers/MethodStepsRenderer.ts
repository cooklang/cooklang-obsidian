/**
 * MethodStepsRenderer — section bands, note callouts, numbered steps with inline
 * ingredients/cookware/timers, per-step images, and current-step tracking.
 */
import { App, TFile } from 'obsidian';
import { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';
import {
    ingredient_display_name,
    cookware_display_name,
    quantity_display,
    getQuantityValue,
} from '../recipeHelpers';
import { formatTime, createUnitMap } from '../utils/timeFormatters';
import type { SectionView, StepView, StepPart } from '../utils/sectionHelpers';
import { getStepImageFor } from '../utils/stepImages';
import { renderReferenceLink } from './referenceLink';
import type { RenderContext } from './types';

export class MethodStepsRenderer {
    constructor(
        private app: App,
        private settings: CooklangSettings,
        private timerService: TimerService,
    ) {}

    render(
        container: HTMLElement,
        ctx: RenderContext,
        sections: SectionView[],
        file: TFile | null,
        allImages: TFile[],
    ): void {
        const region = container.createDiv({ cls: 'cook-steps' });
        region.id = 'cook-steps';
        region.createEl('h2', {
            cls: 'cook-section-title',
            text: this.settings.methodLabel || 'Method',
        });

        const unitMap = createUnitMap(
            this.settings.minutesLabel || 'm,min,minute,minutes',
            this.settings.hoursLabel || 'h,hr,hrs,hour,hours',
        );

        sections.forEach(section => {
            if (section.name && sections.length > 1) {
                region.createEl('div', { cls: 'cook-section-band', text: section.name });
            }

            section.entries.forEach(entry => {
                if (entry.type === 'step') {
                    this.renderStep(region, entry.step, ctx, unitMap, file, allImages);
                    return;
                }
                const callout = region.createDiv({ cls: 'cook-note' });
                callout.createSpan({ cls: 'cook-note-icon', text: '💡' });
                callout.createSpan({ cls: 'cook-note-text', text: entry.note });
            });
        });
    }

    private renderStep(
        region: HTMLElement,
        step: StepView,
        ctx: RenderContext,
        unitMap: Record<string, number>,
        file: TFile | null,
        allImages: TFile[],
    ): void {
        const tracking = this.settings.enableStepTracking;
        const isCurrent = tracking && ctx.state.currentStep === step.globalIndex;
        const isDone = tracking && ctx.state.currentStep > step.globalIndex;

        const li = region.createDiv({
            cls: 'cook-step' + (isCurrent ? ' cur' : '') + (isDone ? ' done' : ''),
        });

        li.createSpan({ cls: 'cook-step-n', text: `${step.globalIndex + 1}.` });

        const bodyWrap = li.createDiv({ cls: 'cook-step-bodywrap' });
        const body = bodyWrap.createDiv({ cls: 'cook-step-text' });
        step.parts.forEach(part => this.renderPart(body, part, unitMap, file));

        // Per-step image
        if (this.settings.showImages && file) {
            // Step images use 1-based numbering per the Cooklang convention,
            // while globalIndex is 0-based — hence the +1.
            const img = getStepImageFor(step.globalIndex + 1, file.basename, allImages);
            if (img) {
                const fig = bodyWrap.createDiv({ cls: 'cook-step-image' });
                const el = fig.createEl('img');
                el.src = this.app.vault.getResourcePath(img);
                el.alt = '';
            }
        }

        if (tracking) {
            li.addEventListener('click', () => ctx.callbacks.onStepActivate(step.globalIndex));
        }
    }

    private renderPart(body: HTMLElement, part: StepPart, unitMap: Record<string, number>, file: TFile | null): void {
        if (part.type === 'text') {
            body.appendText(part.value);
            return;
        }
        const span = body.createEl('span');
        if (part.type === 'ingredient') {
            span.addClass('cook-ig');
            const ref = (part.ingredient as any).reference;
            if (ref) {
                renderReferenceLink(this.app, file,
                    { name: ref.name, components: ref.components ?? [] }, span);
            } else {
                span.appendText(ingredient_display_name(part.ingredient));
                if (this.settings.highlightIngredientCookware) span.addClass('cook-ig-hl');
            }
            if (this.settings.showQuantitiesInline && part.ingredient.quantity) {
                span.appendText(' ');
                span.createEl('span', {
                    cls: 'cook-amt',
                    text: '(' + quantity_display(part.ingredient.quantity) + ')',
                });
            }
        } else if (part.type === 'cookware') {
            span.addClass('cook-cw');
            span.appendText(cookware_display_name(part.cookware));
            if (this.settings.highlightIngredientCookware) span.addClass('cook-cw-hl');
        } else if (part.type === 'timer') {
            this.renderTimer(span, part.timer, unitMap);
        }
    }

    private renderTimer(span: HTMLElement, timer: any, unitMap: Record<string, number>): void {
        span.addClass('cook-timer');
        let target: HTMLElement = span;
        if (this.settings.showTimersInline) {
            target = span.createEl('button', { cls: 'cook-timer-btn' });
            // Don't let a timer click bubble to the step's tap-to-track handler,
            // which would re-render and destroy the timer the moment it starts.
            target.addEventListener('click', (e) => e.stopPropagation());
        }
        target.appendText('⏱');
        const numericQty = getQuantityValue(timer.quantity);
        if (numericQty !== null) {
            target.appendText(' ');
            const unit = timer.quantity?.unit;
            const multiplier = unit ? unitMap[String(unit).toLowerCase()] ?? 1 : 1;
            const seconds = numericQty * multiplier;
            // `amount` class is required: TimerService.attachTimerToButton updates
            // the live countdown via button.querySelector('.amount').
            target.createEl('span', { cls: 'cook-amt amount', text: formatTime(seconds) });
            if (target instanceof HTMLButtonElement) {
                this.timerService.attachTimerToButton(target, seconds, timer.name ?? '');
            }
        }
        if (timer.name) {
            target.createEl('span', { cls: 'cook-timer-name', text: timer.name });
        }
    }
}
