import { describe, expect, it } from 'vitest';
import { preserveAdjacentNoteLineBreaks } from './noteBlocks';

describe('preserveAdjacentNoteLineBreaks', () => {
    it('preserves boundaries between adjacent note lines', () => {
        expect(preserveAdjacentNoteLineBreaks('> First line\n> Second line'))
            .toBe('> First line\\\n> Second line');
    });

    it('preserves every boundary in a multiline note block', () => {
        expect(preserveAdjacentNoteLineBreaks('> First\n> Second\n> Third'))
            .toBe('> First\\\n> Second\\\n> Third');
    });

    it('does not add a second continuation marker', () => {
        expect(preserveAdjacentNoteLineBreaks('> First\\\n> Second'))
            .toBe('> First\\\n> Second');
    });

    it('does not join note blocks separated by a blank line', () => {
        expect(preserveAdjacentNoteLineBreaks('> First\n\n> Second'))
            .toBe('> First\n\n> Second');
    });

    it('does not alter adjacent metadata lines', () => {
        expect(preserveAdjacentNoteLineBreaks('>> servings: 2\n>> time: 30 min'))
            .toBe('>> servings: 2\n>> time: 30 min');
    });

    it('preserves CRLF line endings', () => {
        expect(preserveAdjacentNoteLineBreaks('> First\r\n> Second'))
            .toBe('> First\\\r\n> Second');
    });
});
