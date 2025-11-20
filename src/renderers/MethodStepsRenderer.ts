/**
 * MethodStepsRenderer - Renders recipe method steps
 *
 * Handles rendering of method steps with inline ingredients,
 * cookware, and interactive timers.
 */

import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';
import {
    getSteps,
    ingredient_display_name,
    cookware_display_name,
    quantity_display,
    getQuantityValue
} from '../recipeHelpers';
import { formatTime, createUnitMap } from '../utils/timeFormatters';

/**
 * Renders recipe method steps with inline components
 */
export class MethodStepsRenderer {
    constructor(
        private settings: CooklangSettings,
        private timerService: TimerService
    ) {}

    /**
     * Render method steps section
     * @param recipe - Parsed recipe object
     * @param container - Container element to render into
     */
    public render(recipe: CooklangRecipe, container: HTMLElement): void {
        const steps = getSteps(recipe);

        // Add the Method header
        container.createEl('h2', {
            cls: 'method-header',
            text: this.settings.methodLabel || 'Method'
        });

        // Add the Method list
        const methodOl = container.createEl('ol', { cls: 'method' });

        // Create unit map for time conversion
        const unitMap = createUnitMap(
            this.settings.minutesLabel || "m,min,minute,minutes",
            this.settings.hoursLabel || "h,hr,hrs,hour,hours"
        );

        steps.forEach((step, i) => {
            const li = methodOl.createEl('li');

            // Add step text with inline components
            const text = li.createEl('div', { cls: 'step-text' });

            step.forEach((part) => {
                if (part.type === 'text') {
                    text.appendText(part.value);
                } else {
                    const span = text.createEl('span');

                    if (part.type === "ingredient") {
                        this.renderInlineIngredient(span, part.ingredient);
                    } else if (part.type === "cookware") {
                        this.renderInlineCookware(span, part.cookware);
                    } else if (part.type === "timer") {
                        this.renderInlineTimer(span, part.timer, unitMap);
                    }
                }
            });
        });
    }

    /**
     * Render inline ingredient component
     */
    private renderInlineIngredient(span: HTMLSpanElement, ingredient: any): void {
        span.addClass('ingredient');
        span.appendText(ingredient_display_name(ingredient));

        if (ingredient.quantity) {
            span.appendText(' (');
            span.createEl('span', {
                cls: 'amount',
                text: quantity_display(ingredient.quantity)
            });
            span.appendText(')');
        }
    }

    /**
     * Render inline cookware component
     */
    private renderInlineCookware(span: HTMLSpanElement, cookware: any): void {
        span.addClass('cookware');
        span.appendText(cookware_display_name(cookware));

        if (cookware.quantity) {
            span.appendText(' (');
            span.createEl('span', {
                cls: 'amount',
                text: quantity_display(cookware.quantity)
            });
            span.appendText(')');
        }
    }

    /**
     * Render inline timer component with interactive button
     */
    private renderInlineTimer(
        span: HTMLSpanElement,
        timer: any,
        unitMap: Record<string, number>
    ): void {
        span.addClass('timer');
        const button = span.createEl('button', { cls: 'timer-button' });
        button.appendText('⏲');

        const numericQty = getQuantityValue(timer.quantity);
        if (numericQty !== null) {
            button.appendText(' ');
            const unit = timer.quantity?.unit;
            const multiplier = unit ? unitMap[unit.toLowerCase()] ?? 1 : 1;
            const seconds = numericQty * multiplier;

            button.createEl('span', { cls: 'amount', text: formatTime(seconds) });

            // Attach timer functionality to button
            this.timerService.attachTimerToButton(button, seconds, timer.name ?? '');
        }

        if (timer.name) {
            button.appendText(' ');
            button.createEl('span', { cls: 'name', text: timer.name });
        }
    }
}
