// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { wholeRecipeEmbedRoot, WholeRecipeEmbedRegistry } from './wholeRecipeEmbeds';

function embed(source: string) {
    const root = document.createElement('div');
    root.className = 'internal-embed markdown-embed';
    root.setAttribute('src', source);
    const section = root.appendChild(document.createElement('div'));
    return { root, section };
}

describe('whole-note recipe embed ownership', () => {
    it('finds transclusions but leaves ordinary notes, headings and blocks alone', async () => {
        const whole = embed('Recipes/Dinner.cook');
        expect(await wholeRecipeEmbedRoot(whole.section)).toBe(whole.root);
        expect(await wholeRecipeEmbedRoot(embed('Dinner#Steps').section)).toBeNull();
        expect(await wholeRecipeEmbedRoot(embed('Dinner#^step').section)).toBeNull();
        expect(await wholeRecipeEmbedRoot(document.createElement('div'))).toBeNull();
    });

    it('waits for detached Live Preview sections to acquire their embed parent', async () => {
        const root = embed('Dinner').root;
        const section = document.createElement('div');
        const pending = wholeRecipeEmbedRoot(section);
        root.appendChild(section);
        expect(await pending).toBe(root);
    });

    it('deduplicates sections in one container but allows repeated embeds and remounts', () => {
        const registry = new WholeRecipeEmbedRegistry();
        const first = embed('Dinner').root;
        const second = embed('Dinner').root;
        const cleanup = vi.fn();
        const unrelated = vi.fn();
        expect(registry.claim(first, cleanup)).toBe(true);
        expect(registry.claim(first, unrelated)).toBe(false);
        expect(registry.claim(second, unrelated)).toBe(true);
        registry.release(first, unrelated);
        expect(unrelated).not.toHaveBeenCalled();
        registry.release(first, cleanup);
        registry.release(first, cleanup);
        expect(cleanup).toHaveBeenCalledOnce();
        expect(registry.claim(first, unrelated)).toBe(true);
    });
});
