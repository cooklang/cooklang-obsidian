import { describe, expect, it } from 'vitest';
import { PDFDocument, type PDFFont as PdfFontType } from 'pdf-lib';
import { CooklangParser } from '@cooklang/cooklang';
import { createPdf } from './recipePdf';
import { recipeSections } from '../utils/recipePdfModel';

describe('recipe PDF', () => {
    const [recipe] = new CooklangParser().parse('Steep for ~{3-5%minutes}.');
    recipe.title = 'Tea';
    it('keeps a timer range as printable text', () => {
        expect(recipeSections(recipe)[0].entries[0]).toEqual({ text: 'Steep for 3-5 minutes.', timers: ['3-5 minutes'] });
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

it.each([
    'Stir gently gently gently gently gently gently for ~{1%minute} to ~{2%minutes}.',
    'Stir well well well well well well well well for 1 minute to ~{2%minutes}.',
])('keeps an entire written timer range bold on one line: %s', async source => {
    const { vi } = await import('vitest');
    const { PDFPage } = await import('pdf-lib');
    const draw = vi.spyOn(PDFPage.prototype, 'drawText');
    try {
        const [recipe] = new CooklangParser().parse(source);
        await createPdf({ recipe, file: null });
        const words = draw.mock.calls.filter(([text]) => ['1', 'minute', 'to', '2', 'minutes.'].includes(text));
        expect(words.map(([text]) => text)).toEqual(['1', 'minute', 'to', '2', 'minutes.']);
        expect(new Set(words.map(([, opts]) => opts!.y)).size).toBe(1);
        expect(words.every(([, opts]) => opts!.font!.name === 'Helvetica-Bold')).toBe(true);
    } finally { draw.mockRestore(); }
});

it.each(['Cook @豆腐{100%g} for ~{3-5%minutes}.', 'Cook @flour{100%g} for ~{3-5%minutes}.'])(
    'retains semantic styles in whole-line fallback: %s', async source => {
    const { vi } = await import('vitest');
    const { PDFFont, PDFPage } = await import('pdf-lib');
    const svgs: string[] = [];
    const imageDraw = vi.spyOn(PDFPage.prototype, 'drawImage');
    const characterSet = PDFFont.prototype.getCharacterSet;
    // Model a regular face covering a character absent from the selected bold face.
    const coverage = vi.spyOn(PDFFont.prototype, 'getCharacterSet').mockImplementation(function(this: PdfFontType) {
        return characterSet.call(this).filter(code => this.name !== 'Helvetica-Bold' || code !== 'f'.charCodeAt(0));
    });
    vi.stubGlobal('Image', class {
        onload = () => {};
        set src(value: string) { svgs.push(decodeURIComponent(value.split(',').slice(1).join(','))); queueMicrotask(() => this.onload()); }
    });
    vi.stubGlobal('document', {
        createElement: () => ({ width:0, height:0, getContext: () => ({
            font:'', fillStyle:'', direction:'ltr', textAlign:'left',
            measureText:(text: string) => ({width:[...text].length*15}), fillText:() => {}, drawImage:() => {},
        }), toDataURL:() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==' }),
    });
    try {
        const [recipe] = new CooklangParser().parse(source);
        const pdf = await PDFDocument.load(await createPdf({recipe,file:null}));
        const method = svgs.find(svg => svg.includes('Cook '));
        expect(method).toContain('font-weight="700" fill="rgb(74,59,51)">' + (source.includes('豆腐') ? '豆腐' : 'flour'));
        expect(method).toContain('font-weight="700" fill="rgb(79,102,122)">3-5 minutes');
        expect(method).toContain('direction="ltr"');
        expect(imageDraw).toHaveBeenCalled();
        expect(pdf.getPageCount()).toBe(1);
    } finally { imageDraw.mockRestore(); coverage.mockRestore(); vi.unstubAllGlobals(); }
});
