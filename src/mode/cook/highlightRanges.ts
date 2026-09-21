import { highlightTree } from '@lezer/highlight';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { cooklang, cooklangHighlighter } from './cook';

export interface CookHighlightRange {
    from: number;
    to: number;
    classes: string;
}

/** An independent parse leaves Obsidian's Markdown syntax tree untouched. */
export function cookHighlightRanges(source: string): CookHighlightRange[] {
    const ranges: CookHighlightRange[] = [];
    // Supply a parse context without installing a language in the host editor.
    const state = EditorState.create({ doc: source, extensions: [cooklang] });
    const tree = ensureSyntaxTree(state, source.length, 1000) ?? syntaxTree(state);
    highlightTree(tree, cooklangHighlighter, (from, to, classes) => {
        ranges.push({ from, to, classes });
    });
    return ranges;
}
