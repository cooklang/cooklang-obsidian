/**
 * Renders a Cooklang recipe reference (e.g. `@./Components/Beans`) as a link to
 * the referenced `.cook` file, or a same-path `.md` file marked `recipe: true`.
 * If neither target can be found, it falls back to plain styled text (no dead
 * link).
 */
import { App, TFile } from 'obsidian';
import { resolveReferenceCandidatePaths } from '../utils/recipeReferences';
import type { RecipeRefTarget } from '../utils/ingredientAggregator';

export function renderReferenceLink(
    app: App,
    sourceFile: TFile | null,
    ref: RecipeRefTarget,
    parent: HTMLElement,
): void {
    const folder = sourceFile?.parent?.path ?? '';
    const normalizedFolder = folder === '/' ? '' : folder;
    const [cookPath, markdownPath] = resolveReferenceCandidatePaths(
        normalizedFolder,
        ref.components ?? [],
        ref.name,
    );
    const cookTarget = app.vault.getAbstractFileByPath(cookPath);
    const markdownTarget = app.vault.getAbstractFileByPath(markdownPath);
    const target = cookTarget instanceof TFile
        ? cookTarget
        : markdownTarget instanceof TFile
            && app.metadataCache.getFileCache(markdownTarget)?.frontmatter?.recipe === true
            ? markdownTarget
            : null;

    if (target) {
        const link = parent.createEl('a', {
            cls: 'cook-ref-link',
            text: ref.name,
            href: '#',
        });
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // don't trigger ingredient/step toggles
            app.workspace.openLinkText(target.path, sourceFile?.path ?? '', false);
        });
    } else {
        parent.createSpan({ cls: 'cook-ref-missing', text: ref.name });
    }
}
