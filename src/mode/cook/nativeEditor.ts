import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { editorInfoField, parseYaml } from 'obsidian';
import { isRecipeSource } from '../../utils/recipeSource';
import { cookHighlightRanges } from './highlightRanges';

export function nativeCookEditor(onEligibilityChange: () => void) {
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet = Decoration.none;
        cookware: DecorationSet = Decoration.none;
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
            const ranges = eligible ? cookHighlightRanges(source) : [];
            this.decorations = Decoration.set(ranges.map(({ from, to, classes }) =>
                Decoration.mark({ class: classes }).range(from, to)));
            // Keep a wrapper outside native hashtag marks regardless of their
            // precedence, so tag themes can be neutralized only inside cookware.
            this.cookware = Decoration.set(ranges
                .filter(({ classes }) => classes.split(' ').includes('cook-token-cookware'))
                .map(({ from, to }) => Decoration.mark({ class: 'cook-source-cookware' }).range(from, to)));
        }
    }, {
        decorations: plugin => plugin.decorations,
        provide: plugin => EditorView.outerDecorations.of(view => view.plugin(plugin)?.cookware ?? Decoration.none),
    });
}
