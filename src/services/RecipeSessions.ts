import type { RecipeReferenceScaleRequest } from '../utils/scaling';
import type { TimerService } from './TimerService';

export interface RecipeSession {
    instanceId: string;
    scale: number;
    currentStep: number;
    checkedIngredients: Set<string>;
    pendingReferenceScale: RecipeReferenceScaleRequest | null;
    timers: TimerService;
    dispose(): void;
}

/** Owns resources across view replacement, but never across file navigation. */
export class RecipeSessions<L extends object, S extends { dispose(): void }> {
    private entries = new Map<L, { path: string; session: S }>();
    private held = new Map<L, number>();

    constructor(private create: () => S) {}

    acquire(leaf: L, path: string): S {
        const entry = this.entries.get(leaf);
        if (entry?.path === path) return entry.session;
        entry?.session.dispose();
        const session = this.create();
        this.entries.set(leaf, { path, session });
        return session;
    }

    async preserve<T>(leaf: L, action: () => Promise<T>): Promise<T> {
        this.held.set(leaf, (this.held.get(leaf) ?? 0) + 1);
        try { return await action(); }
        finally {
            const count = (this.held.get(leaf) ?? 1) - 1;
            if (count) this.held.set(leaf, count);
            else this.held.delete(leaf);
        }
    }

    reconcile(leaves: Map<L, string>): void {
        for (const [leaf, entry] of this.entries) {
            if (this.held.has(leaf)) continue;
            if (leaves.get(leaf) !== entry.path) {
                entry.session.dispose();
                this.entries.delete(leaf);
            }
        }
    }

    rename(oldPath: string, newPath: string): void {
        for (const entry of this.entries.values()) {
            if (entry.path === oldPath) entry.path = newPath;
        }
    }

    delete(path: string): void {
        for (const [leaf, entry] of this.entries) {
            if (entry.path === path) {
                entry.session.dispose();
                this.entries.delete(leaf);
            }
        }
    }

    dispose(): void {
        for (const entry of this.entries.values()) entry.session.dispose();
        this.entries.clear();
        this.held.clear();
    }
}
