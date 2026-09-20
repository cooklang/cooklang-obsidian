export type RecipeFormat = 'cook' | 'cook.md' | 'md';

export const RECIPE_FORMATS: RecipeFormat[] = ['cook', 'cook.md', 'md'];

export function recipeFormat(path: string): RecipeFormat | null {
    if (path.endsWith('.cook.md')) return 'cook.md';
    if (path.endsWith('.cook')) return 'cook';
    if (path.endsWith('.md')) return 'md';
    return null;
}

export function isRecipeFile(path: string, frontmatter?: unknown): boolean {
    const format = recipeFormat(path);
    return format === 'cook' || format === 'cook.md'
        || (format === 'md' && !!frontmatter && typeof frontmatter === 'object'
            && 'recipe' in frontmatter && frontmatter.recipe === true);
}

export function recipeStem(path: string): string {
    const format = recipeFormat(path);
    return format ? path.slice(0, -(format.length + 1)) : path;
}

export function recipeName(path: string): string {
    return recipeStem(path).split('/').pop() ?? '';
}

export function recipeConversionPath(path: string, target: RecipeFormat): string {
    return `${recipeStem(path)}.${target}`;
}

export function newRecipeContent(format: RecipeFormat): string {
    return format === 'cook' ? '' : '---\nrecipe: true\n---\n\n';
}

/** Canonical names first, followed by the pre-existing compound basename. */
export function recipeImageBasenames(path: string): string[] {
    const name = recipeName(path);
    return recipeFormat(path) === 'cook.md' ? [name, `${name}.cook`] : [name];
}

export interface YamlCodec {
    parse(source: string): unknown;
    stringify(value: Record<string, unknown>): string;
}

/** Only YAML may be rewritten; the Cooklang body is preserved byte for byte. */
export function convertRecipeContent(source: string, target: RecipeFormat, yaml: YamlCodec): string {
    const opening = /^(\uFEFF)?---[ \t]*\r?\n/.exec(source);
    const bom = source.startsWith('\uFEFF') ? '\uFEFF' : '';
    let metadata: Record<string, unknown> = {};
    let body = source.slice(bom.length);
    if (opening) {
        const rest = source.slice(opening[0].length);
        const closing = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/m.exec(rest);
        if (!closing) throw new Error('The YAML frontmatter is missing its closing delimiter.');
        const parsed = yaml.parse(rest.slice(0, closing.index));
        if (parsed != null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
            throw new Error('Recipe frontmatter must contain a YAML property mapping.');
        }
        metadata = (parsed ?? {}) as Record<string, unknown>;
        body = rest.slice(closing.index + closing[0].length);
    }
    if (target === 'cook' || metadata.recipe === true) return source;

    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const frontmatter = yaml.stringify({ ...metadata, recipe: true }).trimEnd().replace(/\r?\n/g, newline);
    return `${bom}---${newline}${frontmatter}${newline}---${newline}${body}`;
}
