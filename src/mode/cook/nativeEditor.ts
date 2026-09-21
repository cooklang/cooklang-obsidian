import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import { editorInfoField, parseYaml } from 'obsidian';
import { isRecipeSource } from '../../utils/recipeSource';
import { cookHighlightRanges } from './highlightRanges';

export function nativeCookEditor(onEligibilityChange: () => void) {
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet = Decoration.none;
        private path = '';
        private eligible = false;

        constructor(view: EditorView) { this.refresh(view); }

        update(update: ViewUpdate): void {
            const path = update.state.field(editorInfoField, false)?.file?.path ?? '';
            if (update.docChanged || path !== this.path) this.refresh(update.view);
        }

        private refresh(view: EditorView): void {
            const path = view.state.field(editorInfoField, false)?.file?.path ?? '';
            const source = view.state.doc.toString();
            const eligible = isRecipeSource(path, source, parseYaml);
            if (path !== this.path || eligible !== this.eligible) onEligibilityChange();
            this.path = path;
            this.eligible = eligible;
            this.decorations = eligible
                ? Decoration.set(cookHighlightRanges(source).map(({ from, to, classes }) =>
                    Decoration.mark({ class: classes }).range(from, to)))
                : Decoration.none;
        }
    }, { decorations: plugin => plugin.decorations });
}
