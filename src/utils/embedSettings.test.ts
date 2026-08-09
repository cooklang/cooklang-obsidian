import { describe, it, expect } from 'vitest';
import type { CooklangSettings } from '../settings';
import { embedSettings } from './embedSettings';

function makeSettings(overrides: Partial<CooklangSettings> = {}): CooklangSettings {
    return {
        showImages: true,
        showIngredientList: true,
        showCookwareList: true,
        showTimersList: false,
        showTotalTime: true,
        showTimersInline: true,
        showQuantitiesInline: false,
        timersTick: true,
        timersRing: true,
        lineWrap: true,
        highlightIngredientCookware: true,
        defaultView: 'source',
        showServingsScaler: true,
        twoColumnLayout: true,
        enableStepTracking: true,
        servingsLabel: '',
        metadataLabel: '',
        ingredientLabel: 'Stuff',
        cookwareLabel: '',
        timersLabel: '',
        methodLabel: 'Steps',
        secondsLabel: 'segundo',
        minutesLabel: '',
        hoursLabel: '',
        ...overrides,
    } as CooklangSettings;
}

describe('embedSettings', () => {
    it('forces interactive/layout flags off for embeds', () => {
        const result = embedSettings(makeSettings());
        expect(result.enableStepTracking).toBe(false);
        expect(result.showTimersInline).toBe(false);
        expect(result.twoColumnLayout).toBe(false);
        expect(result.showImages).toBe(false);
    });

    it('inherits all other user settings unchanged', () => {
        const result = embedSettings(makeSettings());
        expect(result.ingredientLabel).toBe('Stuff');
        expect(result.methodLabel).toBe('Steps');
        expect(result.secondsLabel).toBe('segundo');
        expect(result.highlightIngredientCookware).toBe(true);
        expect(result.showQuantitiesInline).toBe(false);
    });

    it('does not mutate the input settings', () => {
        const base = makeSettings();
        embedSettings(base);
        expect(base.enableStepTracking).toBe(true);
        expect(base.showTimersInline).toBe(true);
        expect(base.twoColumnLayout).toBe(true);
        expect(base.showImages).toBe(true);
    });
});
