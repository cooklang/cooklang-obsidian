/**
 * Pure resolution of Cooklang recipe references to a vault path.
 *
 * A reference like `@./Components/Beans` parses to
 * { name: "Beans", components: [".", "Components"] }. The components are a path
 * relative to the referencing recipe's own folder; "." stays, ".." goes up.
 * This resolves that to concrete vault paths, with `.cook` remaining the
 * primary Cooklang target and a `.md` recipe as a plugin-specific fallback.
 */

/**
 * Resolve a reference to a `.cook` vault path, relative to the folder of the
 * recipe that contains the reference.
 *
 * @param recipeFolder - Vault path of the referencing recipe's folder ('' = root)
 * @param components - Reference path components (e.g. [".", "Components"])
 * @param name - Referenced recipe name (e.g. "Beans")
 * @returns Normalised vault path like "Breakfast/Components/Beans.cook"
 */
export function resolveReferencePath(
    recipeFolder: string,
    components: string[],
    name: string,
): string {
    return resolveReferenceBasePath(recipeFolder, components, name) + '.cook';
}

/**
 * Resolve the ordered vault-path candidates for a recipe reference. `.cook`
 * remains first to preserve the Cooklang convention; callers may use the
 * `.md` path only when it is known to be a Cooklang recipe in Obsidian.
 */
export function resolveReferenceCandidatePaths(
    recipeFolder: string,
    components: string[],
    name: string,
): [cookPath: string, markdownPath: string] {
    const basePath = resolveReferenceBasePath(recipeFolder, components, name);
    return [basePath + '.cook', basePath + '.md'];
}

function resolveReferenceBasePath(
    recipeFolder: string,
    components: string[],
    name: string,
): string {
    const segments = recipeFolder ? recipeFolder.split('/').filter(Boolean) : [];

    for (const component of components) {
        if (component === '' || component === '.') continue;
        if (component === '..') {
            segments.pop();
        } else {
            segments.push(component);
        }
    }
    segments.push(name);

    return segments.join('/');
}
