import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createPdf, recipeSections } from './recipePdf';

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
    });
});
