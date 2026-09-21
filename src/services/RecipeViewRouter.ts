export interface RecipeLeaf {
    getViewState(): { type: string; state?: Record<string, unknown> };
}

/** Session-only routing choices; no view state or file content is persisted here. */
export class RecipeViewRouter<L extends RecipeLeaf> {
    private native = new WeakMap<L, string>();
    private automatic = new WeakMap<L, string>();
    private seen = new WeakMap<L, string>();
    private pending = new WeakMap<L, string>();
    private reroute = new WeakSet<L>();
    private suspended = new Set<string>();
    private disposed = false;

    constructor(
        private recognized: (path: string, leaf: L) => boolean | undefined,
        private switchView: (leaf: L, type: 'cook' | 'markdown', path: string, isCurrent: () => boolean) => Promise<void>,
        private onError: (error: unknown) => void,
        private defaultView: () => 'source' | 'preview' = () => 'source',
    ) {}

    editAsMarkdown(leaf: L, path: string): void {
        this.native.set(leaf, path);
        this.seen.set(leaf, path);
        this.automatic.delete(leaf);
    }

    openAsRecipe(leaf: L): void {
        this.native.delete(leaf);
        this.automatic.delete(leaf);
    }

    suspend(path: string): void { this.suspended.add(path); }
    resume(path: string): void { this.suspended.delete(path); }
    dispose(): void { this.disposed = true; this.suspended.clear(); }

    rename(leaf: L, oldPath: string, newPath: string): void {
        if (this.native.get(leaf) === oldPath) this.native.set(leaf, newPath);
        if (this.automatic.get(leaf) === oldPath) this.automatic.set(leaf, newPath);
        if (this.seen.get(leaf) === oldPath) this.seen.set(leaf, newPath);
    }

    async route(leaf: L): Promise<void> {
        if (this.disposed) return;
        const state = leaf.getViewState();
        const path = typeof state.state?.file === 'string' ? state.state.file : '';
        if (this.native.get(leaf) !== path) this.native.delete(leaf);
        if (this.automatic.get(leaf) !== path) this.automatic.delete(leaf);
        if (this.pending.has(leaf)) { this.reroute.add(leaf); return; }
        if (this.seen.get(leaf) !== path) this.seen.delete(leaf);
        if ((!path.endsWith('.md') && !path.endsWith('.cook')) || this.suspended.has(path)) return;
        const recognized = this.recognized(path, leaf);
        if (recognized === undefined) return;
        const fresh = this.seen.get(leaf) !== path;
        this.seen.set(leaf, path);
        const reading = state.state?.mode === 'preview';
        const wantsPreview = fresh
            ? this.defaultView() === 'preview' && this.native.get(leaf) !== path
            : reading;
        const type = state.type === 'markdown' && recognized
            ? wantsPreview ? 'cook'
                : state.state?.mode !== 'source' || state.state?.source !== true ? 'markdown' : null
            : state.type === 'cook' && !recognized && this.automatic.get(leaf) === path ? 'markdown' : null;
        if (!type) return;
        this.pending.set(leaf, path);
        const isCurrent = () => {
            const current = leaf.getViewState();
            return !this.disposed && current.type === state.type && current.state?.file === path && !this.suspended.has(path)
                && current.state?.mode === state.state?.mode
                && (type === 'cook' ? this.recognized(path, leaf) === true
                    && (reading || this.native.get(leaf) !== path)
                    : this.recognized(path, leaf) === recognized);
        };
        try {
            // Allow concurrent navigation/metadata events to settle, then verify the target.
            await Promise.resolve();
            if (!isCurrent()) return;
            if (type === 'cook') this.automatic.set(leaf, path);
            else this.automatic.delete(leaf);
            await this.switchView(leaf, type, path, isCurrent);
        } catch (error) {
            this.automatic.delete(leaf);
            this.onError(error);
        } finally {
            this.pending.delete(leaf);
            if (this.reroute.delete(leaf) || leaf.getViewState().state?.file !== path) void this.route(leaf);
        }
    }
}
