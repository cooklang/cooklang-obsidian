import { describe, expect, it, vi } from 'vitest';
import { convertRecipe, synchronizeRecipeBuffers } from './RecipeConversion';

function setup(source = 'Mix @rice{}.') {
    const state = { path: 'Dinner.cook', source };
    const host = {
        path: () => state.path,
        exists: vi.fn(() => false),
        save: vi.fn(async () => {}),
        read: vi.fn(async () => state.source),
        process: vi.fn(async (update: (text: string) => string) => { state.source = update(state.source); }),
        synchronize: vi.fn(async () => {}),
        rename: vi.fn(async (path: string) => { state.path = path; }),
        refreshMetadata: vi.fn(async () => {}),
    };
    return { host, state };
}
const yaml = { parse: JSON.parse, stringify: JSON.stringify };

describe('recipe conversion', () => {
    it('flushes pending edits, adds the marker, and renames through the host', async () => {
        const { host, state } = setup();
        host.save.mockImplementation(async () => { state.source = 'Unsaved @rice{2%cup}.'; });
        await convertRecipe(host, 'cook.md', yaml);
        expect(state).toEqual({ path: 'Dinner.cook.md', source: '---\n{"recipe":true}\n---\nUnsaved @rice{2%cup}.' });
        expect(host.rename).toHaveBeenCalledWith('Dinner.cook.md');
    });

    it('rejects an existing destination before saving or modifying', async () => {
        const { host } = setup();
        host.exists.mockReturnValue(true);
        await expect(convertRecipe(host, 'md', yaml)).rejects.toThrow('already exists');
        expect(host.save).not.toHaveBeenCalled();
        expect(host.process).not.toHaveBeenCalled();
        expect(host.rename).not.toHaveBeenCalled();
    });

    it.each(['md', 'cook.md'] as const)('requests indexing after the file becomes .%s', async target => {
        const { host, state } = setup();
        host.refreshMetadata.mockImplementation(async () => {
            expect(state.path).toBe(`Dinner.${target}`);
            expect(state.source).toContain('"recipe":true');
        });
        await convertRecipe(host, target, yaml);
        expect(host.refreshMetadata).toHaveBeenCalledOnce();
    });

    it('refreshes indexing even when the recipe already contains its recognition property', async () => {
        const source = '---\n{"recipe":true,"servings":4}\n---\nMix @rice{}.';
        const { host, state } = setup(source);
        await convertRecipe(host, 'cook.md', yaml);
        expect(host.process).not.toHaveBeenCalled();
        expect(host.refreshMetadata).toHaveBeenCalledOnce();
        expect(state.source).toBe(source);
    });

    it('does not request Markdown indexing for a .cook destination or a failed rename', async () => {
        const first = setup();
        first.state.path = 'Dinner.cook.md';
        await convertRecipe(first.host, 'cook', yaml);
        expect(first.host.refreshMetadata).not.toHaveBeenCalled();
        const second = setup();
        second.host.rename.mockRejectedValue(new Error('Rename failed'));
        await expect(convertRecipe(second.host, 'md', yaml)).rejects.toThrow('Rename failed');
        expect(second.host.refreshMetadata).not.toHaveBeenCalled();
    });

    it('validates YAML before changing the source or extension', async () => {
        const { host, state } = setup('---\n{bad}\n---\nMix.');
        await expect(convertRecipe(host, 'md', yaml)).rejects.toThrow();
        expect(host.process).not.toHaveBeenCalled();
        expect(state.path).toBe('Dinner.cook');
    });

    it('does not overwrite edits arriving after the read', async () => {
        const { host, state } = setup();
        host.process.mockImplementation(async update => {
            state.source = 'Changed in another editor';
            state.source = update(state.source);
        });
        await expect(convertRecipe(host, 'md', yaml)).rejects.toThrow('changed during conversion');
        expect(state.source).toBe('Changed in another editor');
        expect(host.rename).not.toHaveBeenCalled();
    });

    it('does not roll back newer edits if the rename fails', async () => {
        const { host, state } = setup();
        host.rename.mockImplementation(async () => {
            state.source += '\nConcurrent edit';
            throw new Error('Rename failed');
        });
        await expect(convertRecipe(host, 'md', yaml)).rejects.toThrow('Rename failed');
        expect(state.path).toBe('Dinner.cook');
        expect(state.source).toContain('Concurrent edit');
        expect(host.process).toHaveBeenCalledTimes(1);
    });

    it('rechecks collisions and renames after asynchronous work', async () => {
        const { host } = setup();
        host.exists.mockReturnValueOnce(false).mockReturnValue(true);
        await expect(convertRecipe(host, 'md', yaml)).rejects.toThrow('already exists');
        expect(host.process).not.toHaveBeenCalled();
        const second = setup();
        second.host.save.mockImplementation(async () => { second.state.path = 'Other.cook'; });
        await expect(convertRecipe(second.host, 'md', yaml)).rejects.toThrow('renamed');
        expect(second.host.rename).not.toHaveBeenCalled();
    });

    it('does not perform writes when the target is already the current format', async () => {
        const { host } = setup();
        await convertRecipe(host, 'cook', yaml);
        expect(host.save).not.toHaveBeenCalled();
    });

    it('synchronizes open editors before renaming and aborts if an editor has newer changes', async () => {
        const { host } = setup();
        host.synchronize.mockRejectedValue(new Error('Editor changed'));
        await expect(convertRecipe(host, 'md', yaml)).rejects.toThrow('Editor changed');
        expect(host.rename).not.toHaveBeenCalled();
    });

    it('refreshes only unchanged editor buffers', async () => {
        const replace = vi.fn();
        await synchronizeRecipeBuffers([{ read: () => 'old', replace }], 'old', 'new');
        expect(replace).toHaveBeenCalledWith('new');
        replace.mockClear();
        await synchronizeRecipeBuffers([{ read: () => 'new', replace }], 'old', 'new');
        expect(replace).not.toHaveBeenCalled();
        await expect(synchronizeRecipeBuffers([{ read: () => 'user edit', replace }], 'old', 'new')).rejects.toThrow('changed');
        expect(replace).not.toHaveBeenCalled();
    });
});
