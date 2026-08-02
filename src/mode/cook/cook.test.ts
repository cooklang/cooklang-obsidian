import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { classHighlighter, highlightTree } from '@lezer/highlight';
import { describe, expect, it } from 'vitest';

import { cooklang } from './cook';

type HighlightRange = {
    from: number;
    to: number;
    classes: string;
};

function highlightedRanges(doc: string): HighlightRange[] {
    const state = EditorState.create({ doc, extensions: [cooklang] });
    const tree = ensureSyntaxTree(state, doc.length, 1_000);

    expect(tree).not.toBeNull();

    const ranges: HighlightRange[] = [];
    highlightTree(tree!, classHighlighter, (from, to, classes) => {
        ranges.push({ from, to, classes });
    });
    return ranges;
}

describe('Cooklang syntax highlighting', () => {
    it('ends note highlighting at the end of the line', () => {
        const doc = [
            '> Recommendation: 280 g per portion.',
            '',
            'Shape the dough in a #dough_box.',
            'Dust with @semolina and rest for ~hours.',
        ].join('\n');
        const ranges = highlightedRanges(doc);

        const noteEnd = doc.indexOf('\n');
        const noteRanges = ranges.filter(({ from }) => from < noteEnd);
        const rangesAfterNote = ranges.filter(({ from }) => from > noteEnd);

        expect(noteRanges).toHaveLength(1);
        expect(noteRanges[0]).toMatchObject({
            from: 0,
            to: noteEnd,
            classes: 'tok-comment',
        });
        expect(rangesAfterNote.some(({ classes }) => classes.includes('tok-comment'))).toBe(false);
        expect(rangesAfterNote.map(({ classes }) => classes)).toEqual([
            'tok-keyword',
            'tok-variableName',
            'tok-number',
        ]);
    });
});
