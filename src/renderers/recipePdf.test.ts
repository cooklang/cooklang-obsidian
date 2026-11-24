import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { CooklangParser } from '@cooklang/cooklang';
import { createPdf } from './recipePdf';
import { recipeSections } from '../utils/recipePdfModel';

describe('recipe PDF', () => {
    const [recipe] = new CooklangParser().parse('Steep for ~{3-5%minutes}.');
    recipe.title = 'Tea';
    it('keeps a timer range as printable text', () => {
        expect(recipeSections(recipe)[0].entries[0]).toEqual({ text: 'Steep for 3–5 minutes.', timers: ['3–5 minutes'] });
    });
    it('writes a single titled page for a short recipe', async () => {
        const pdf = await PDFDocument.load(await createPdf({ recipe, file: null }));
        expect(pdf.getTitle()).toBe('Tea');
        expect(pdf.getPageCount()).toBe(1);
        const fonts = pdf.context.enumerateIndirectObjects().map(([, obj]) => obj.toString().slice(0, 160));
        expect(fonts.some(value => value.includes('/BaseFont /Helvetica-Bold'))).toBe(true);
        expect(fonts.some(value => value.includes('/BaseFont /Helvetica'))).toBe(true);
    });
});

it('draws whole bidi lines and Unicode continuation titles through the image path', async () => {
    const { vi } = await import('vitest');
    const { PDFPage } = await import('pdf-lib');
    const painted: { text: string; direction: string }[] = [];
    const imageDraw = vi.spyOn(PDFPage.prototype, 'drawImage');
    vi.stubGlobal('document', {
        createElement: () => {
            const context = {
                font: '', fillStyle: '', direction: 'ltr', textAlign: 'left',
                measureText: (text: string) => ({ width: [...text].length * 15 }),
                fillText(text: string) { painted.push({ text, direction: this.direction }); },
            };
            return { width: 0, height: 0, getContext: () => context,
                toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==' };
        },
    });
    try {
        const [recipe] = new CooklangParser().parse(Array(90).fill('اخلط الدقيق مع الماء.').join('\n\n'));
        recipe.title = '麻婆豆腐';
        const pdf = await PDFDocument.load(await createPdf({ recipe, file: null }));
        expect(pdf.getPageCount()).toBeGreaterThan(1);
        expect(painted).toContainEqual({ text: 'اخلط الدقيق مع الماء.', direction: 'rtl' });
        expect(painted).toContainEqual({ text: '麻婆豆腐', direction: 'ltr' });
        expect(new Set(imageDraw.mock.contexts).size).toBe(pdf.getPageCount());
    } finally {
        imageDraw.mockRestore();
        vi.unstubAllGlobals();
    }
});
