import { describe, expect, it } from 'vitest';
import { canvasTextLines, textDirection } from './pdfTextLayout';

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
