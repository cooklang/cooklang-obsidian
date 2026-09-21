import { describe, expect, it, vi } from 'vitest';
import { RecipeViewRouter } from './RecipeViewRouter';

function setup(defaultView: 'source' | 'preview' = 'preview') {
    const leaf = { state: { type: 'markdown', state: { file: 'Dinner.md', mode: 'source', source: true } as Record<string, unknown> },
        getViewState() { return this.state; } };
    const recognized = vi.fn<(path: string) => boolean | undefined>(() => true);
    const switchView = vi.fn(async (target: typeof leaf, type: 'cook' | 'markdown', path: string, isCurrent: () => boolean) => {
        if (isCurrent()) target.state = { type, state: { file: path, mode: type === 'cook' ? 'preview' : 'source', source: true, sync: true } };
    });
    const error = vi.fn();
    const router = new RecipeViewRouter(recognized, switchView, error, () => defaultView);
    return { leaf, recognized, switchView, router, error };
}

describe('Markdown recipe routing', () => {
    it.each(['Dinner.cook', 'Dinner.cook.md', 'Dinner.md'])('uses native Source mode for %s with the source default', async path => {
        const { leaf, router, switchView } = setup('source');
        leaf.state.state = { file: path, mode: 'source', source: false };
        await router.route(leaf);
        expect(leaf.state).toEqual({ type: 'markdown', state: { file: path, mode: 'source', source: true, sync: true } });
        await router.route(leaf);
        expect(switchView).toHaveBeenCalledTimes(1);
    });

    it('routes Reading View to the recipe preview even after explicit source selection', async () => {
        const { leaf, router } = setup('source');
        router.editAsMarkdown(leaf, 'Dinner.md');
        leaf.state.state.mode = 'preview';
        await router.route(leaf);
        expect(leaf.state.type).toBe('cook');
    });

    it('uses the source default on new navigation even when Obsidian carries over Reading View', async () => {
        const { leaf, router } = setup('source');
        leaf.state.state.mode = 'preview';
        await router.route(leaf);
        expect(leaf.state.type).toBe('markdown');
        expect(leaf.state.state.mode).toBe('source');
        leaf.state.state.mode = 'preview';
        await router.route(leaf);
        expect(leaf.state.type).toBe('cook');
    });

    it('does not jump to preview when an unsaved property makes an existing note a recipe', async () => {
        const { leaf, router, recognized, switchView } = setup();
        recognized.mockReturnValue(false);
        await router.route(leaf);
        recognized.mockReturnValue(true);
        await router.route(leaf);
        expect(switchView).not.toHaveBeenCalled();
    });

    it('forces Source again when a recipe is switched to Live Preview', async () => {
        const { leaf, router } = setup('source');
        await router.route(leaf);
        leaf.state.state.source = false;
        await router.route(leaf);
        expect(leaf.state.state.source).toBe(true);
    });

    it('leaves ordinary Markdown and explicitly opened unmarked recipe previews alone', async () => {
        const { leaf, router, recognized, switchView } = setup();
        recognized.mockReturnValue(false);
        await router.route(leaf);
        leaf.state.type = 'cook';
        router.openAsRecipe(leaf);
        await router.route(leaf);
        expect(switchView).not.toHaveBeenCalled();
    });

    it('waits for metadata and opens the same leaf in preview without a history entry', async () => {
        const { leaf, recognized, router, switchView } = setup();
        recognized.mockReturnValue(undefined);
        await router.route(leaf);
        expect(switchView).not.toHaveBeenCalled();
        recognized.mockReturnValue(true);
        await router.route(leaf);
        expect(leaf.state).toEqual({ type: 'cook', state: { file: 'Dinner.md', mode: 'preview', source: true, sync: true } });
    });

    it('does not override an explicitly restored CookView', async () => {
        const { leaf, router, switchView } = setup();
        leaf.state = { type: 'cook', state: { file: 'Dinner.md', mode: 'source', scale: 2, currentStep: 4 } };
        await router.route(leaf);
        expect(switchView).not.toHaveBeenCalled();
        expect(leaf.state.state.scale).toBe(2);
    });

    it('keeps native editing through focus/metadata changes, independently per leaf', async () => {
        const { leaf, router, switchView } = setup();
        router.editAsMarkdown(leaf, 'Dinner.md');
        await router.route(leaf);
        await router.route(leaf);
        expect(switchView).not.toHaveBeenCalled();
        const other = { ...leaf, state: { ...leaf.state } };
        await router.route(other);
        expect(other.state.type).toBe('cook');
        expect(leaf.state.type).toBe('markdown');
        router.openAsRecipe(leaf);
        leaf.state.state.mode = 'preview';
        await router.route(leaf);
        expect(leaf.state.type).toBe('cook');
    });

    it('clears native preference on navigation and retains it on rename', async () => {
        const { leaf, router } = setup();
        router.editAsMarkdown(leaf, 'Dinner.md');
        router.rename(leaf, 'Dinner.md', 'Lunch.md');
        leaf.state.state.file = 'Lunch.md';
        await router.route(leaf);
        expect(leaf.state.type).toBe('markdown');
        leaf.state.state.file = 'Other.txt';
        await router.route(leaf);
        leaf.state.state.file = 'Lunch.md';
        await router.route(leaf);
        expect(leaf.state.type).toBe('cook');
    });

    it('cancels a stale switch during rapid navigation and routes the new recipe', async () => {
        const { leaf, router, switchView } = setup();
        const first = router.route(leaf);
        leaf.state = { type: 'markdown', state: { file: 'Lunch.md' } };
        await router.route(leaf);
        await first;
        await Promise.resolve();
        expect(switchView).toHaveBeenCalledTimes(1);
        expect(leaf.state.state.file).toBe('Lunch.md');
        expect(leaf.state.type).toBe('cook');
    });

    it('rechecks eligibility after an asynchronous save', async () => {
        const { leaf, router, switchView } = setup();
        switchView.mockImplementation(async (target, type, path, isCurrent) => {
            router.editAsMarkdown(target, path);
            await Promise.resolve();
            if (isCurrent()) target.state = { type, state: { file: path } };
        });
        await router.route(leaf);
        expect(leaf.state.type).toBe('markdown');
    });

    it('returns automatically opened recipes to Markdown when the property is removed', async () => {
        const { leaf, router, recognized } = setup();
        await router.route(leaf);
        recognized.mockReturnValue(false);
        await router.route(leaf);
        expect(leaf.state.type).toBe('markdown');
    });

    it('suspends conversion routing and reports switch failures without repeated retries', async () => {
        const { leaf, router, switchView, error } = setup();
        router.suspend('Dinner.md');
        await router.route(leaf);
        expect(switchView).not.toHaveBeenCalled();
        router.resume('Dinner.md');
        switchView.mockRejectedValue(new Error('failed'));
        await router.route(leaf);
        expect(error).toHaveBeenCalledOnce();
    });

    it('cancels pending routing when the plugin unloads', async () => {
        const { leaf, router, switchView } = setup();
        const pending = router.route(leaf);
        router.dispose();
        await pending;
        await router.route(leaf);
        expect(switchView).not.toHaveBeenCalled();
    });
});
