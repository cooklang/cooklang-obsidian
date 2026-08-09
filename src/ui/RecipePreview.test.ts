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

        await fireEvent.click(screen.getByRole('checkbox', { name: 'Check flour' }));
        expect(renderModel.callbacks.onIngredientToggle).toHaveBeenCalledWith('flour');

        await fireEvent.click(screen.getByRole('button', { name: 'More servings' }));
        expect(renderModel.callbacks.onScaleChange).toHaveBeenCalledWith(5);

        await fireEvent.click(screen.getByRole('button', { name: 'Mark step 1 as current' }));
        expect(renderModel.callbacks.onStepActivate).toHaveBeenCalledWith(0);

        await fireEvent.click(screen.getByRole('button', { name: /Start rest/ }));
        expect(renderModel.timers?.toggle).toHaveBeenCalledWith(
            'test-recipe:step-0:part-5',
            120,
            'rest',
        );
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
    it('reflects subscribed pause state and unsubscribes on unmount', async () => {
        const listeners: Array<(snapshot: TimerSnapshot) => void> = [];
        const unsubscribe = vi.fn();
        const controller: TimerController = {
            toggle: vi.fn(),
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
