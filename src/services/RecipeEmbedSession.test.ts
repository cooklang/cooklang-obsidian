import { describe, expect, it, vi } from 'vitest';
import type { CooklangRecipe } from '@cooklang/cooklang';
import type { RecipeRenderModel } from '../ui/types';
import { RecipeEmbedSession } from './RecipeEmbedSession';

function setup() {
    const recipe = { title: 'Dinner' } as CooklangRecipe;
    const host = {
        read: vi.fn(async () => 'Mix @rice{}.'),
        initialize: vi.fn(async () => {}),
        parse: vi.fn(() => recipe),
        model: vi.fn((value: CooklangRecipe) => ({ recipe: value }) as RecipeRenderModel),
        publish: vi.fn(),
    };
    return { host, session: new RecipeEmbedSession(host) };
}

describe('recipe embed rendering', () => {
    it('loads, parses, and refreshes from the latest file content', async () => {
        const { host, session } = setup();
        await session.refresh();
        expect(host.publish.mock.calls.map(([state]) => state.status)).toEqual(['loading', 'ready']);
        host.read.mockResolvedValue('Updated @rice{2%cup}.');
        await session.refresh();
        expect(host.parse).toHaveBeenLastCalledWith('Updated @rice{2%cup}.');
    });

    it('skips the parser for empty content', async () => {
        const { host, session } = setup();
        host.read.mockResolvedValue(' \n');
        await session.refresh();
        expect(host.publish).toHaveBeenLastCalledWith({ status: 'empty' });
        expect(host.initialize).not.toHaveBeenCalled();
    });

    it('preserves source when WASM initialization or parsing fails', async () => {
        const { host, session } = setup();
        host.initialize.mockRejectedValueOnce(new Error('WASM'));
        await session.refresh();
        expect(host.publish).toHaveBeenLastCalledWith({ status: 'error', source: 'Mix @rice{}.', message: 'Cooklang parser failed to load.' });
        host.parse.mockImplementationOnce(() => { throw new Error('Parse'); });
        await session.refresh();
        expect(host.publish).toHaveBeenLastCalledWith({ status: 'error', source: 'Mix @rice{}.', message: 'Could not parse this recipe.' });
    });

    it('reports a missing or unreadable source', async () => {
        const { host, session } = setup();
        host.read.mockRejectedValue(new Error('Missing'));
        await session.refresh();
        expect(host.publish).toHaveBeenLastCalledWith({ status: 'error', source: '', message: 'Could not read this recipe.' });
    });

    it('does not publish stale asynchronous work over a newer render', async () => {
        const { host, session } = setup();
        let resolve!: (value: string) => void;
        host.read.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
        const old = session.refresh();
        await session.refresh();
        resolve('Old content');
        await old;
        expect(host.parse).toHaveBeenCalledTimes(1);
        expect(host.parse).toHaveBeenCalledWith('Mix @rice{}.');
    });

    it('stops work and updates after unload', async () => {
        const { host, session } = setup();
        const pending = session.refresh();
        session.dispose();
        await pending;
        await session.refresh();
        expect(host.publish).toHaveBeenCalledTimes(1);
        expect(host.parse).not.toHaveBeenCalled();
        expect(host.read).toHaveBeenCalledTimes(1);
    });
});
