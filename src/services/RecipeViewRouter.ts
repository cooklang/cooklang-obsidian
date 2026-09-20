export interface RecipeLeaf {
    getViewState(): { type: string; state?: Record<string, unknown> };
}

/** Session-only routing choices; no view state or file content is persisted here. */
export class RecipeViewRouter<L extends RecipeLeaf> {
    private native = new WeakMap<L, string>();
    private automatic = new WeakMap<L, string>();
    private pending = new WeakMap<L, string>();
    private reroute = new WeakSet<L>();
    private suspended = new Set<string>();
    private disposed = false;

    constructor(
        private recognized: (path: string) => boolean | undefined,
        private switchView: (leaf: L, type: 'cook' | 'markdown', path: string, isCurrent: () => boolean) => Promise<void>,
        private onError: (error: unknown) => void,
    ) {}

    editAsMarkdown(leaf: L, path: string): void {
        this.native.set(leaf, path);
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
    }

    async route(leaf: L): Promise<void> {
        if (this.disposed) return;
        const state = leaf.getViewState();
        const path = typeof state.state?.file === 'string' ? state.state.file : '';
        if (this.native.get(leaf) !== path) this.native.delete(leaf);
        if (this.automatic.get(leaf) !== path) this.automatic.delete(leaf);
        if (this.pending.has(leaf)) { this.reroute.add(leaf); return; }
        if (!path.endsWith('.md') || this.suspended.has(path)) return;
        const recognized = this.recognized(path);
        const type = state.type === 'markdown' && recognized === true && this.native.get(leaf) !== path
            ? 'cook'
            : state.type === 'cook' && recognized === false && this.automatic.get(leaf) === path
                ? 'markdown'
                : null;
        if (!type) return;
        this.pending.set(leaf, path);
        const isCurrent = () => {
            const current = leaf.getViewState();
            return !this.disposed && current.type === state.type && current.state?.file === path && !this.suspended.has(path)
                && (type === 'cook' ? this.native.get(leaf) !== path && this.recognized(path) === true
                    : this.recognized(path) === false);
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
