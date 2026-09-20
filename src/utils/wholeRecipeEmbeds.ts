/** Only whole-note transclusions are owned here, never heading/block embeds. */
export async function wholeRecipeEmbedRoot(el: HTMLElement): Promise<HTMLElement | null> {
    // Obsidian postprocesses detached sections, then inserts them before awaiting
    // processor promises. Wait one microtask so Live Preview has an ancestor chain.
    await Promise.resolve();
    const root = el.closest<HTMLElement>('.internal-embed');
    const source = root?.getAttribute('src');
    return root && source && !source.includes('#') ? root : null;
}

/** A separate owner per DOM container allows repeated embeds of the same file. */
export class WholeRecipeEmbedRegistry {
    private owners = new WeakMap<HTMLElement, () => void>();

    claim(root: HTMLElement, cleanup: () => void): boolean {
        if (this.owners.has(root)) return false;
        this.owners.set(root, cleanup);
        return true;
    }

    release(root: HTMLElement, cleanup: () => void): void {
        if (this.owners.get(root) !== cleanup) return;
        this.owners.delete(root);
        cleanup();
    }
}
