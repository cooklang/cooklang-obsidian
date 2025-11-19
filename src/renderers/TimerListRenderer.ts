/**
 * TimerListRenderer - Renders recipe timers list
 *
 * Handles rendering of the timers section with durations.
 */

import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';
import { getFlatTimers } from '../recipeHelpers';

/**
 * Renders recipe timers list section
 */
export class TimerListRenderer {
    constructor(private settings: CooklangSettings) {}

    /**
     * Render timers list section if enabled and timers exist
     * @param recipe - Parsed recipe object
     * @param container - Container element to render into
     */
    public render(recipe: CooklangRecipe, container: HTMLElement): void {
        if (!this.settings.showTimersList) {
            return; // Feature disabled
        }

        const timers = getFlatTimers(recipe);

        if (!timers || timers.length === 0) {
            return; // No timers to render
        }

        // Add the Timer header
        container.createEl('h2', {
            cls: 'timer-header',
            text: this.settings.timersLabel || 'Timers'
        });

        // Add the Timer list
        const timerUl = container.createEl('ul', { cls: 'timers' });

        timers.forEach(timer => {
            const li = timerUl.createEl('li');

            // Add duration if present
            if (timer.displayText) {
                li.createEl('span', { cls: 'amount', text: timer.displayText });
                li.appendText(' ');
            }

            // Add timer name
            li.appendText(timer.name ?? '');
        });
    }
}
