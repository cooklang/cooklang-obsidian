import { isRecipeFile } from './recipeFiles';

/** Read the current buffer, not the metadata cache (which can lag behind edits). */
export function isRecipeSource(path: string, source: string, parseYaml: (yaml: string) => unknown): boolean {
    if (isRecipeFile(path)) return true;
    if (!path.endsWith('.md')) return false;
    const opening = /^(?:\uFEFF)?---[ \t]*\r?\n/.exec(source);
    if (!opening) return false;
    const rest = source.slice(opening[0].length);
    const closing = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/m.exec(rest);
    if (!closing) return false;
    try {
        return isRecipeFile(path, parseYaml(rest.slice(0, closing.index)));
    } catch {
        return false;
    }
}
