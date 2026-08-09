// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import RecipeEmbed from './RecipeEmbed.svelte';
import type { EmbedRenderState, RecipeRenderModel } from './types';

afterEach(cleanup);

describe('RecipeEmbed', () => {
    it('reactively renders loading, empty, and parser error states', async () => {
        const renderState = writable<EmbedRenderState>({ status: 'loading' });
        render(RecipeEmbed, { renderState });
        expect(screen.getByRole('status').textContent).toContain('Loading recipe');

        renderState.set({ status: 'empty' });
        expect(await screen.findByText('Empty recipe block.')).toBeTruthy();

        renderState.set({ status: 'error', message: 'Could not parse this recipe.', source: '@bad{' });
        expect((await screen.findByRole('alert')).textContent).toContain('Could not parse this recipe.');
        expect(screen.getByText('@bad{')).toBeTruthy();
    });

    it('uses the compact ready-state component without full-preview chrome', async () => {
        const model = {
            instanceId: 'embed',
            interactive: false,
            recipe: {
                ingredients: [],
                cookware: [],
                timers: [],
                inlineQuantities: [],
                sections: [],
                rawMetadata: new Map(),
                tags: new Set(),
            },
            file: null,
            settings: {
                showIngredientList: false,
                showImages: false,
                showCookwareList: false,
                showTimersList: false,
                showTimersInline: false,
                showQuantitiesInline: false,
                highlightIngredientCookware: false,
                groupIngredientsBySection: false,
                enableStepTracking: false,
                methodLabel: '',
                minutesLabel: '',
                hoursLabel: '',
                secondsLabel: '',
            },
            state: {
                scale: 1,
                baseServings: null,
                displayServings: null,
                checkedIngredients: new Set(),
                currentStep: -1,
            },
            callbacks: {
                onScaleChange: () => {},
                onIngredientToggle: () => {},
                onStepActivate: () => {},
            },
            host: {
                getResourcePath: () => '',
                resolveReference: () => null,
                openReference: () => {},
            },
            timers: null,
        } as unknown as RecipeRenderModel;
        const renderState = writable<EmbedRenderState>({ status: 'ready', model });
        const view = render(RecipeEmbed, { renderState });

        expect(await screen.findByRole('heading', { name: 'Method' })).toBeTruthy();
        expect(view.container.querySelector('.cook-embed')).toBeTruthy();
        expect(view.container.querySelector('.cook-hero')).toBeNull();
        expect(view.container.querySelector('.cook-bar')).toBeNull();
    });
});
