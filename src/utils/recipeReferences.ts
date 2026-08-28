/**
 * Pure resolution of Cooklang recipe references to a vault path.
 *
 * A reference like `@./Components/Beans` parses to
 * { name: "Beans", components: [".", "Components"] }. The components are a path
 * relative to the root of the recipe collection. In Obsidian, the vault root
 * is the recipe collection root. This resolves that to concrete vault paths,
 * with `.cook` remaining the primary Cooklang target and a `.md` recipe as a
 * plugin-specific fallback.
 */

/**
 * Resolve a reference to a `.cook` vault path from the recipe collection root.
 *
 * @param recipesRoot - Vault path of the recipe collection root ('' = vault root)
 * @param components - Reference path components (e.g. [".", "Components"])
 * @param name - Referenced recipe name (e.g. "Beans")
 * @returns Normalised vault path like "Breakfast/Components/Beans.cook"
 */
export function resolveReferencePath(
    recipesRoot: string,
    components: string[],
    name: string,
): string {
    return resolveReferenceBasePath(recipesRoot, components, name) + '.cook';
}

/**
 * Resolve the ordered vault-path candidates for a recipe reference. `.cook`
 * remains first to preserve the Cooklang convention; callers may use the
 * `.md` path only when it is known to be a Cooklang recipe in Obsidian.
 */
export function resolveReferenceCandidatePaths(
    recipesRoot: string,
    components: string[],
    name: string,
): [cookPath: string, markdownPath: string] {
    const basePath = resolveReferenceBasePath(recipesRoot, components, name);
    return [basePath + '.cook', basePath + '.md'];
}

function resolveReferenceBasePath(
    recipesRoot: string,
    components: string[],
    name: string,
): string {
    const segments = recipesRoot ? recipesRoot.split('/').filter(Boolean) : [];

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
