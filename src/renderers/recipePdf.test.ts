import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createPdf, recipeSections } from './recipePdf';

// Match the data URLs emitted by Rollup for the two bundled typefaces.
async function fontAsset(name: string) {
    const { readFile } = await import('node:fs/promises');
    const font = await readFile(new URL('./fonts/' + name, import.meta.url));
    return { default: 'data:font/ttf;base64,' + font.toString('base64') };
}
vi.mock('./fonts/Geist-Regular.ttf', () => fontAsset('Geist-Regular.ttf'));
vi.mock('./fonts/Geist-SemiBold.ttf', () => fontAsset('Geist-SemiBold.ttf'));

describe('recipe PDF', () => {
    const recipe = {
        title: 'Tea', rawMetadata: new Map(), timers: [{ name: null, quantity: { value: { type: 'text', value: '3–5' }, unit: 'minutes' } }],
        sections: [{ name: null, content: [{ type: 'step', value: { items: [{ type: 'text', value: 'Steep for ' }, { type: 'timer', index: 0 }] } }] }],
    };
    it('keeps a timer range as printable text', () => {
        expect(recipeSections(recipe)[0].entries[0]).toEqual({ text: 'Steep for 3–5 minutes', timers: ['3–5 minutes'] });
    });
    it('writes a single titled page for a short recipe', async () => {
        const pdf = await PDFDocument.load(await createPdf({ recipe, file: { basename: 'Tea' } }));
        expect(pdf.getTitle()).toBe('Tea');
        expect(pdf.getPageCount()).toBe(1);
        const fonts = pdf.context.enumerateIndirectObjects().map(([, obj]) => obj.toString().slice(0, 160));
        expect(fonts.some(value => value.includes('/BaseFont /Geist-SemiBold'))).toBe(true);
        expect(fonts.some(value => value.includes('/BaseFont /Geist-Regular'))).toBe(true);
    });
});
