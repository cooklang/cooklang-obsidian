import { describe, expect, it } from 'vitest';
import { canvasTextLines, canvasTextLineRanges, textDirection } from './pdfTextLayout';

describe('canvas PDF text layout', () => {
    it('passes complete logical lines to canvas for Arabic and mixed Hebrew text', () => {
        for (const text of ['اخلط الدقيق مع الماء', 'מערבבים flour עם 50 g מים']) {
            expect(textDirection(text)).toBe('rtl');
            expect(canvasTextLines(text, 100, s => s.length)).toEqual([text]);
        }
        expect(textDirection('Mix 50 g מים')).toBe('ltr');
    });
    it('wraps logical lines without reversing words or dropping explicit breaks', () => {
        expect(canvasTextLines('אחד שני שלוש\nארבע', 8, s => s.length)).toEqual(['אחד שני', 'שלוש', 'ארבע']);
    });
    it('does not break combining marks in oversized words', () => {
        expect(canvasTextLines('a\u0301b\u0301', 2, s => [...s].length)).toEqual(['a\u0301', 'b\u0301']);
    });
});

it('wraps protected ranges together and retains original logical offsets', () => {
    const text = 'מערבבים flour עם 1 minute to 2 minutes עכשיו';
    const start = text.indexOf('1 minute'), end = text.indexOf(' עכשיו');
    const lines = canvasTextLineRanges(text, 25, (a,b) => b-a, [[start,end]]).map(([a,b]) => text.slice(a,b));
    expect(lines).toEqual(['מערבבים flour עם', '1 minute to 2 minutes', 'עכשיו']);
});


it('retains punctuation after a protected phrase at the end of a line', () => {
    const text = 'Cook 豆腐 for 3-5 minutes.';
    const lines = canvasTextLineRanges(text,100,(a,b) => b-a,[[12,22]]);
    expect(lines.map(([a,b]) => text.slice(a,b))).toEqual([text]);
});
