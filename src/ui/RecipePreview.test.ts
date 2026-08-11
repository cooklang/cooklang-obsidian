// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import type { CooklangRecipe } from '@cooklang/cooklang';
import RecipePreview from './RecipePreview.svelte';
import ReferenceLink from './components/ReferenceLink.svelte';
import TimerButton from './components/TimerButton.svelte';
import type {
    RecipeHostAdapter,
    RecipeRenderModel,
    ResolvedRecipeReference,
    TimerController,
} from './types';
import type { TimerSnapshot } from '../services/TimerService';

vi.mock('@cooklang/cooklang', () => ({
    ingredient_should_be_listed: () => true,
    ingredient_display_name: (ingredient: { name: string }) => ingredient.name,
    cookware_display_name: (cookware: { name: string }) => cookware.name,
    quantity_display: (quantity: { display?: string }) => quantity.display ?? '',
    getFlatCookware: (recipe: { cookware: Array<{ name: string; quantity?: { display?: string } }> }) =>
        recipe.cookware.map(item => ({
            name: item.name,
            displayText: item.quantity?.display ?? null,
        })),
    getFlatTimers: (recipe: { timers: Array<{ name: string | null; quantity?: { display?: string } }> }) =>
        recipe.timers.map(item => ({
            name: item.name,
            displayText: item.quantity?.display ?? null,
        })),
}));

afterEach(cleanup);

function settings() {
    return {
        showImages: true,
        showIngredientList: true,
        showCookwareList: true,
        showTimersList: true,
        showTotalTime: true,
        showTimersInline: true,
        showQuantitiesInline: true,
        timersTick: false,
        timersRing: false,
        lineWrap: true,
        highlightIngredientCookware: true,
        groupIngredientsBySection: false,
        defaultView: 'source' as const,
        showServingsScaler: true,
        twoColumnLayout: true,
        enableStepTracking: true,
        servingsLabel: '',
        metadataLabel: '',
        ingredientLabel: '',
        cookwareLabel: '',
        timersLabel: '',
        methodLabel: '',
        secondsLabel: '',
        minutesLabel: '',
        hoursLabel: '',
    };
}

function recipe(): CooklangRecipe {
    const timerQuantity = {
        value: {
            type: 'range',
            value: {
                start: { type: 'regular', value: 2 },
                end: { type: 'regular', value: 4 },
            },
        },
        unit: 'min',
        display: '2-4 min',
    };
    return {
        title: 'Weeknight curry',
        description: 'Fast and warming.',
        servings: 4,
        tags: new Set(['quick']),
        ingredients: [{
            name: 'flour',
            note: null,
            reference: null,
            quantity: {
                value: { type: 'number', value: { type: 'regular', value: 2 } },
                unit: 'cups',
                display: '2 cups',
            },
        }],
        cookware: [{ name: 'bowl', note: null, quantity: null }],
        timers: [{ name: 'rest', quantity: timerQuantity }],
        inlineQuantities: [{ display: '50 g' }],
        sections: [{
            name: null,
            content: [{
                type: 'step',
                value: {
                    number: 1,
                    items: [
                        { type: 'text', value: 'Mix ' },
                        { type: 'ingredient', index: 0 },
                        { type: 'text', value: ' in a ' },
                        { type: 'cookware', index: 0 },
                        { type: 'text', value: ' for ' },
                        { type: 'timer', index: 0 },
                        { type: 'text', value: ' with ' },
                        { type: 'inlineQuantity', index: 0 },
                        { type: 'text', value: '.' },
                    ],
                },
            }],
        }],
        rawMetadata: new Map([['title', 'Weeknight curry'], ['oven', '220 C']]),
    } as unknown as CooklangRecipe;
}

function model(overrides: Partial<RecipeRenderModel> = {}): RecipeRenderModel {
    const callbacks = {
        onScaleChange: vi.fn(),
        onIngredientToggle: vi.fn(),
        onStepActivate: vi.fn(),
    };
    const host: RecipeHostAdapter = {
        getResourcePath: file => file.path,
        resolveReference: () => null,
        openReference: vi.fn(),
    };
    const timers: TimerController = {
        toggle: vi.fn(),
        reset: vi.fn(),
        subscribe: () => () => {},
    };
    return {
        instanceId: 'test-recipe',
        interactive: true,
        recipe: recipe(),
        file: null,
        settings: settings(),
        state: {
            scale: 1,
            baseServings: 4,
            displayServings: 4,
            checkedIngredients: new Set(),
            currentStep: -1,
        },
        callbacks,
        host,
        timers,
        ...overrides,
    };
}

describe('RecipePreview', () => {
    it('renders the shared recipe surface and exposes accessible interactions', async () => {
        const renderModel = model();
        render(RecipePreview, { model: renderModel });

        expect(screen.getByRole('heading', { name: 'Weeknight curry' })).toBeTruthy();
        expect(screen.getByText('Fast and warming.')).toBeTruthy();
        expect(screen.getByText('2:00–4:00')).toBeTruthy();
        expect(screen.getByText('220 C')).toBeTruthy();

        const checkbox = screen.getByRole('checkbox', { name: 'Check flour' });
        expect(checkbox.closest('label')?.classList.contains('cook-ing-checkbox-hit')).toBe(true);
        await fireEvent.click(checkbox);
        expect(renderModel.callbacks.onIngredientToggle).toHaveBeenCalledWith('flour');

        await fireEvent.click(screen.getByRole('button', { name: 'More servings' }));
        expect(renderModel.callbacks.onScaleChange).toHaveBeenCalledWith(5);

        await fireEvent.click(screen.getByRole('button', { name: 'Mark step 1 as current' }));
        expect(renderModel.callbacks.onStepActivate).toHaveBeenCalledWith(0);

        await fireEvent.click(screen.getByRole('button', { name: /Start rest/ }));
        expect(screen.getByRole('dialog', { name: 'Choose duration for rest' })).toBeTruthy();
        expect(renderModel.timers?.toggle).not.toHaveBeenCalled();
    });

    it('honors settings that hide optional recipe regions', () => {
        const renderModel = model({
            settings: {
                ...settings(),
                showIngredientList: false,
                showCookwareList: false,
                showTimersList: false,
                showServingsScaler: false,
            },
        });
        render(RecipePreview, { model: renderModel });

        expect(screen.queryByRole('heading', { name: 'Ingredients' })).toBeNull();
        expect(screen.queryByRole('heading', { name: 'Cookware' })).toBeNull();
        expect(screen.queryByRole('heading', { name: 'Timers' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'More servings' })).toBeNull();
    });

});

describe('ReferenceLink', () => {
    it('delegates recipe navigation through the host adapter', async () => {
        const reference: ResolvedRecipeReference = {
            targetPath: 'Components/Sauce.cook',
            sourcePath: 'Dinner.cook',
        };
        const renderModel = model({
            host: {
                getResourcePath: file => file.path,
                resolveReference: () => reference,
                openReference: vi.fn(),
            },
        });
        render(ReferenceLink, {
            model: renderModel,
            reference: { name: 'Sauce', components: ['Components'] },
        });

        await fireEvent.click(screen.getByRole('link', { name: 'Sauce' }));
        expect(renderModel.host.openReference).toHaveBeenCalledWith(reference);
    });
});

describe('TimerButton', () => {
    it('starts a fixed-duration timer immediately', async () => {
        const controller: TimerController = {
            toggle: vi.fn(),
            reset: vi.fn(),
            subscribe: () => () => {},
        };
        render(TimerButton, {
            controller,
            timerKey: 'timer',
            duration: { minimumSeconds: 60, maximumSeconds: 60 },
            label: 'rest',
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Start rest (1:00)' }));
        expect(controller.toggle).toHaveBeenCalledOnce();
        expect(controller.toggle).toHaveBeenCalledWith('timer', 60, 'rest');
        expect(screen.queryByText('1:00')?.closest('[aria-live]')).toBeNull();
    });

    it('releases pointer capture before starting the selected range duration', async () => {
        const controller: TimerController = {
            toggle: vi.fn(),
            reset: vi.fn(),
            subscribe: () => () => {},
        };
        render(TimerButton, {
            controller,
            timerKey: 'timer',
            duration: { minimumSeconds: 60, maximumSeconds: 180 },
            label: 'rest',
        });

        const button = screen.getByRole('button', { name: 'Start rest (1:00–3:00)' });
        await fireEvent.click(button);

        const dialog = screen.getByRole('dialog', { name: 'Choose duration for rest' });
        const anchor = button.closest('.cook-timer-range-anchor');
        expect(anchor).toBeTruthy();
        expect(dialog.parentElement).toBe(anchor);
        const slider = screen.getByRole('slider', { name: 'Duration for rest' });
        expect(document.activeElement).toBe(slider);
        expect(slider.getAttribute('min')).toBe('60');
        expect(slider.getAttribute('max')).toBe('180');
        expect(slider.getAttribute('step')).toBe('60');
        expect((slider as HTMLInputElement).value).toBe('120');
        expect(slider.getAttribute('aria-valuetext')).toBe('2:00');
        expect(screen.getAllByText('1:00')).toHaveLength(1);
        expect(screen.getByText('3:00')).toBeTruthy();
        expect(screen.getByText('Release to start · Keyboard: Enter')).toBeTruthy();
        expect(dialog.querySelector('[aria-live]')).toBeNull();
        expect(controller.toggle).not.toHaveBeenCalled();

        await fireEvent.input(slider, { target: { value: '120' } });
        expect(slider.getAttribute('aria-valuetext')).toBe('2:00');
        const hasPointerCapture = vi.fn(() => true);
        const releasePointerCapture = vi.fn();
        Object.assign(slider, { hasPointerCapture, releasePointerCapture });
        await fireEvent.pointerUp(slider, { pointerId: 7 });

        expect(hasPointerCapture).toHaveBeenCalledWith(7);
        expect(releasePointerCapture).toHaveBeenCalledWith(7);
        expect(controller.toggle).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeTruthy();

        await new Promise(resolve => window.setTimeout(resolve, 0));

        expect(controller.toggle).toHaveBeenCalledOnce();
        expect(controller.toggle).toHaveBeenCalledWith('timer', 120, 'rest');
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('uses second precision for a range with sub-minute bounds', async () => {
        render(TimerButton, {
            controller: { toggle: vi.fn(), reset: vi.fn(), subscribe: () => () => {} },
            timerKey: 'timer',
            duration: { minimumSeconds: 30, maximumSeconds: 90 },
            label: '',
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Start timer (30s–1:30)' }));
        expect(screen.getByRole('slider').getAttribute('step')).toBe('1');
    });

    it('pauses and resumes an existing range timer without opening the selector', async () => {
        const listeners: Array<(snapshot: TimerSnapshot | null) => void> = [];
        const controller: TimerController = {
            toggle: vi.fn(),
            reset: vi.fn(),
            subscribe: (_key, callback) => {
                listeners.push(callback);
                return () => {};
            },
        };
        render(TimerButton, {
            controller,
            timerKey: 'timer',
            duration: { minimumSeconds: 60, maximumSeconds: 180 },
            label: 'rest',
        });

        const listener = listeners[0];
        if (!listener) throw new Error('Expected the timer component to subscribe.');
        listener({ id: 'id', duration: 120, remaining: 90, label: 'rest', status: 'running' });
        const runningButton = await screen.findByRole('button', { name: 'Pause rest (1:30)' });
        expect(runningButton.parentElement?.classList.contains('cook-timer-running')).toBe(true);
        await fireEvent.click(runningButton);
        expect(screen.queryByRole('dialog')).toBeNull();

        listener({ id: 'id', duration: 120, remaining: 90, label: 'rest', status: 'paused' });
        const pausedButton = await screen.findByRole('button', { name: 'Resume rest (1:30)' });
        expect(pausedButton.parentElement?.classList.contains('cook-timer-running')).toBe(false);
        await fireEvent.click(pausedButton);
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(controller.toggle).toHaveBeenCalledTimes(2);
    });

    it('resets an active timer and allows a new range duration to be selected', async () => {
        const listeners: Array<(snapshot: TimerSnapshot | null) => void> = [];
        const reset = vi.fn(() => {
            for (const listener of listeners) listener(null);
        });
        const controller: TimerController = {
            toggle: vi.fn(),
            reset,
            subscribe: (_key, callback) => {
                listeners.push(callback);
                return () => {};
            },
        };
        render(TimerButton, {
            controller,
            timerKey: 'timer',
            duration: { minimumSeconds: 60, maximumSeconds: 180 },
            label: 'rest',
        });

        listeners[0]?.({ id: 'id', duration: 120, remaining: 90, label: 'rest', status: 'running' });
        const activeTimer = await screen.findByRole('button', { name: 'Pause rest (1:30)' });
        const resetButton = screen.getByRole('button', { name: 'Reset rest timer' });
        expect(resetButton.parentElement).toBe(activeTimer.parentElement);
        expect(activeTimer.parentElement?.classList.contains('cook-timer-chip')).toBe(true);
        expect(activeTimer.querySelector('.cook-timer-icon')).toBeNull();
        await fireEvent.click(resetButton);

        expect(reset).toHaveBeenCalledWith('timer');
        const timerButton = await screen.findByRole('button', { name: 'Start rest (1:00–3:00)' });
        expect(screen.queryByRole('button', { name: 'Reset rest timer' })).toBeNull();

        await fireEvent.click(timerButton);
        const slider = screen.getByRole('slider');
        await fireEvent.input(slider, { target: { value: '180' } });
        await fireEvent.pointerUp(slider);
        await new Promise(resolve => window.setTimeout(resolve, 0));
        expect(controller.toggle).toHaveBeenCalledWith('timer', 180, 'rest');
    });

    it('reopens a completed range at its midpoint', async () => {
        const listeners: Array<(snapshot: TimerSnapshot | null) => void> = [];
        const controller: TimerController = {
            toggle: vi.fn(),
            reset: vi.fn(),
            subscribe: (_key, callback) => {
                listeners.push(callback);
                return () => {};
            },
        };
        render(TimerButton, {
            controller,
            timerKey: 'timer',
            duration: { minimumSeconds: 60, maximumSeconds: 180 },
            label: 'rest',
        });

        listeners[0]?.({ id: 'id', duration: 120, remaining: 0, label: 'rest', status: 'completed' });
        await fireEvent.click(await screen.findByRole('button', { name: 'Start rest (0s)' }));
        expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('120');
        expect(controller.toggle).not.toHaveBeenCalled();
    });

    it('dismisses without starting and supports keyboard activation', async () => {
        const controller: TimerController = {
            toggle: vi.fn(),
            reset: vi.fn(),
            subscribe: () => () => {},
        };
        render(TimerButton, {
            controller,
            timerKey: 'timer',
            duration: { minimumSeconds: 60, maximumSeconds: 180 },
            label: 'rest',
        });
        const button = screen.getByRole('button', { name: 'Start rest (1:00–3:00)' });

        await fireEvent.click(button);
        await fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(button);
        expect(controller.toggle).not.toHaveBeenCalled();

        await fireEvent.click(button);
        await fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(controller.toggle).not.toHaveBeenCalled();

        await fireEvent.click(button);
        await fireEvent.click(screen.getByRole('button', { name: 'Close timer range selector' }));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(controller.toggle).not.toHaveBeenCalled();

        await fireEvent.click(button);
        const slider = screen.getByRole('slider');
        await fireEvent.input(slider, { target: { value: '180' } });
        await fireEvent.keyDown(slider, { key: 'Enter' });
        expect(controller.toggle).toHaveBeenCalledOnce();
        expect(controller.toggle).toHaveBeenCalledWith('timer', 180, 'rest');
    });

    it('reflects subscribed pause state and unsubscribes on unmount', async () => {
        const listeners: Array<(snapshot: TimerSnapshot | null) => void> = [];
        const unsubscribe = vi.fn();
        const controller: TimerController = {
            toggle: vi.fn(),
            reset: vi.fn(),
            subscribe: (_key, callback) => {
                listeners.push(callback);
                return unsubscribe;
            },
        };
        const view = render(TimerButton, {
            controller,
            timerKey: 'timer',
            duration: { minimumSeconds: 60, maximumSeconds: 60 },
            label: 'rest',
        });

        const listener = listeners[0];
        if (!listener) throw new Error('Expected the timer component to subscribe.');
        listener({
            id: 'id',
            duration: 60,
            remaining: 42,
            label: 'rest',
            status: 'paused',
        });
        expect(await screen.findByRole('button', { name: 'Resume rest (42s)' })).toBeTruthy();

        view.unmount();
        expect(unsubscribe).toHaveBeenCalledOnce();
    });
});
