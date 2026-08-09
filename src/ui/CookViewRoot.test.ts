// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import CookViewRoot from './CookViewRoot.svelte';
import type { CookViewMode, RecipeRenderModel } from './types';

afterEach(cleanup);

describe('CookViewRoot', () => {
    it('provides the CodeMirror host and switches modes reactively without remounting', async () => {
        const mode = writable<CookViewMode>('source');
        const preview = writable<RecipeRenderModel | null>(null);
        const onSourceReady = vi.fn();
        const view = render(CookViewRoot, { mode, preview, onSourceReady });

        const source = view.container.querySelector('.cook-source-view-full');
        const previewElement = view.container.querySelector('.cook-preview-view');
        expect(onSourceReady).toHaveBeenCalledWith(source);
        expect(source?.classList.contains('cook-view-hidden')).toBe(false);
        expect(previewElement?.classList.contains('cook-view-hidden')).toBe(true);

        mode.set('preview');
        await waitFor(() => {
            expect(source?.classList.contains('cook-view-hidden')).toBe(true);
            expect(previewElement?.classList.contains('cook-view-hidden')).toBe(false);
        });
        expect(onSourceReady).toHaveBeenCalledTimes(1);
    });
});
