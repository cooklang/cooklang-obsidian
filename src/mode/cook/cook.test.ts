import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { classHighlighter, type Highlighter, highlightTree } from '@lezer/highlight';
import { describe, expect, it } from 'vitest';

import { cooklang, cooklangHighlighter } from './cook';

type HighlightRange = {
    from: number;
    to: number;
    classes: string;
};

function highlightedRanges(doc: string, highlighter: Highlighter = classHighlighter): HighlightRange[] {
    const state = EditorState.create({ doc, extensions: [cooklang] });
    const tree = ensureSyntaxTree(state, doc.length, 1_000);

    expect(tree).not.toBeNull();

    const ranges: HighlightRange[] = [];
    highlightTree(tree!, highlighter, (from, to, classes) => {
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

    it('assigns stable plugin classes to Cooklang tokens', () => {
        const doc = [
            '---',
            'servings: 2',
            '---',
            'Add @flour{200%g} to a #bowl and wait for ~rest{5%min}.',
            '-- This is a comment.',
        ].join('\n');

        expect(highlightedRanges(doc, cooklangHighlighter).map(({ from, to, classes }) => ({
            text: doc.slice(from, to),
            classes,
        }))).toEqual([
            { text: '---', classes: 'cook-token-meta' },
            { text: 'servings: 2', classes: 'cook-token-meta' },
            { text: '---', classes: 'cook-token-meta' },
            { text: '@flour', classes: 'cook-token-ingredient' },
            { text: 'g', classes: 'cook-token-unit' },
            { text: '#bowl', classes: 'cook-token-cookware' },
            { text: '~rest', classes: 'cook-token-timer' },
            { text: 'min', classes: 'cook-token-unit' },
            { text: '-- This is a comment.', classes: 'cook-token-comment' },
        ]);
    });
});
