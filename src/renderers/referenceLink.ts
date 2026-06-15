/**
 * Renders a Cooklang recipe reference (e.g. `@./Components/Beans`) as a link to
 * the referenced `.cook` file. If the target file can't be found in the vault,
 * it falls back to plain styled text (no dead link).
 */
import { App, TFile } from 'obsidian';
import { resolveReferencePath } from '../utils/recipeReferences';
import type { RecipeRefTarget } from '../utils/ingredientAggregator';

export function renderReferenceLink(
    app: App,
    sourceFile: TFile | null,
    ref: RecipeRefTarget,
    parent: HTMLElement,
): void {
    const folder = sourceFile?.parent?.path ?? '';
    const normalizedFolder = folder === '/' ? '' : folder;
    const targetPath = resolveReferencePath(normalizedFolder, ref.components ?? [], ref.name);
    const target = app.vault.getAbstractFileByPath(targetPath);

    if (target instanceof TFile) {
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
