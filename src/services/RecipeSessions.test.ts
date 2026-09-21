import { describe, expect, it, vi } from 'vitest';
import { RecipeSessions } from './RecipeSessions';

function setup() {
    const create = vi.fn(() => ({ scale: 1, currentStep: -1, checkedIngredients: new Set<string>(),
        timers: new Map<string, number>(), dispose: vi.fn() }));
    return { sessions: new RecipeSessions<object, ReturnType<typeof create>>(create), create, leaf: {} };
}

describe('recipe sessions', () => {
    it('retains interactive state and timer identity through view replacement, independently per leaf', async () => {
        const { sessions, leaf, create } = setup();
        const first = sessions.acquire(leaf, 'Dinner.cook');
        first.scale = 3;
        first.currentStep = 2;
        first.checkedIngredients.add('rice');
        first.timers.set('step-1', 60);
        await sessions.preserve(leaf, async () => {
            sessions.reconcile(new Map()); // Intermediate empty leaf during replacement.
            expect(first.dispose).not.toHaveBeenCalled();
        });
        sessions.reconcile(new Map([[leaf, 'Dinner.cook']]));
        expect(sessions.acquire(leaf, 'Dinner.cook')).toBe(first);
        expect(first.timers.get('step-1')).toBe(60);
        expect(first.checkedIngredients.has('rice')).toBe(true);
        const other = sessions.acquire({}, 'Dinner.cook');
        expect(other.scale).toBe(1);
        expect(other.currentStep).toBe(-1);
        expect(other.checkedIngredients.size).toBe(0);
        expect(create).toHaveBeenCalledTimes(2);
    });

    it('retains the same session on rename and format conversion', () => {
        const { sessions, leaf } = setup();
        const first = sessions.acquire(leaf, 'Dinner.cook');
        sessions.rename('Dinner.cook', 'Lunch.cook.md');
        sessions.reconcile(new Map([[leaf, 'Lunch.cook.md']]));
        expect(sessions.acquire(leaf, 'Lunch.cook.md')).toBe(first);
        expect(first.dispose).not.toHaveBeenCalled();
    });

    it('disposes on navigation and leaf closure', () => {
        const { sessions, leaf } = setup();
        const first = sessions.acquire(leaf, 'Dinner.cook');
        const second = sessions.acquire(leaf, 'Lunch.cook');
        expect(first.dispose).toHaveBeenCalledOnce();
        sessions.reconcile(new Map());
        expect(second.dispose).toHaveBeenCalledOnce();
        sessions.dispose();
        expect(second.dispose).toHaveBeenCalledOnce();
    });

    it('disposes sessions when navigating to a non-recipe without acquiring another session', () => {
        const { sessions, leaf } = setup();
        const first = sessions.acquire(leaf, 'Dinner.cook');
        sessions.reconcile(new Map([[leaf, 'Notes.md']]));
        expect(first.dispose).toHaveBeenCalledOnce();
    });

    it('disposes all leaves of a deleted file and cleans up remaining sessions on unload', () => {
        const { sessions, leaf } = setup();
        const first = sessions.acquire(leaf, 'Dinner.cook');
        const duplicate = sessions.acquire({}, 'Dinner.cook');
        const other = sessions.acquire({}, 'Lunch.cook');
        sessions.delete('Dinner.cook');
        expect(first.dispose).toHaveBeenCalledOnce();
        expect(duplicate.dispose).toHaveBeenCalledOnce();
        expect(other.dispose).not.toHaveBeenCalled();
        sessions.dispose();
        expect(other.dispose).toHaveBeenCalledOnce();
    });

    it('releases transition protection after a failed switch', async () => {
        const { sessions, leaf } = setup();
        const first = sessions.acquire(leaf, 'Dinner.cook');
        await expect(sessions.preserve(leaf, async () => { throw new Error('failed'); })).rejects.toThrow('failed');
        sessions.reconcile(new Map());
        expect(first.dispose).toHaveBeenCalledOnce();
    });
});
