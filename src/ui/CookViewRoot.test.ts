// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import CookViewRoot from './CookViewRoot.svelte';
import type { RecipeRenderModel } from './types';

afterEach(cleanup);

describe('CookViewRoot', () => {
    it('mounts a preview without creating a source editor', () => {
        const preview = writable<RecipeRenderModel | null>(null);
        const view = render(CookViewRoot, { preview });

        const source = view.container.querySelector('.cook-source-view-full');
        const previewElement = view.container.querySelector('.cook-preview-view');
        expect(source).toBeNull();
        expect(previewElement).not.toBeNull();
    });
});
