import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CooklangParser } from '@cooklang/cooklang';
import { recipeSections, recipePdfDetails } from './recipePdfModel';
const parser = new CooklangParser();
const parse = (source: string, scale = 1) => parser.parse(source, scale)[0];

describe('PDF recipe model', () => {
    it('includes separately declared ingredients and filters hidden definitions', () => {
        const recipe = parse(readFileSync(new URL('../../test-recipes/pdf-separate-ingredients.cook', import.meta.url), 'utf8'));
        expect(recipeSections(recipe)[0].ingredients).toEqual(['100 g flour', '50 ml water']);
        expect(recipePdfDetails(recipe)).toEqual(['12', '45 min']);
    });
    it('keeps reference quantities in the definition section, including scaling', () => {
        const recipe = parse('== Dough ==\nAdd @flour{100%g}.\n\n== Sauce ==\nAdd @&flour{50%g}.', 2);
        const sections = recipeSections(recipe);
        expect(sections[0].ingredients).toEqual(['300 g flour']);
        expect(sections[1].ingredients).toEqual([]);
        expect(sections[1].entries[0]).toMatchObject({text: 'Add flour.'});
    });
    it('keeps hidden ingredient mentions in method text', () => {
        const sections = recipeSections(parse('Add @-water{1%L}.'));
        expect(sections[0].ingredients).toEqual([]);
        expect(sections[0].entries[0]).toMatchObject({text: 'Add water.'});
    });
    it('retains ingredient-only recipes without steps', () => {
        expect(recipeSections(parse('>> [mode]: ingredients\n@flour{100%g}'))[0].ingredients).toEqual(['100 g flour']);
    });
    it('uses the existing duration formatter for prep and cook times', () => {
        expect(recipePdfDetails(parse('---\nprep time: 10\ncook time: 80\n---\nMix.'))).toEqual(['Prep 10 min', 'Cook 1 h 20 min']);
    });
    it('uses scaled servings without printing the unscaled yield', () => {
        const recipe = parse('---\nservings: 2\nyield: 12\n---\nMix.');
        expect(recipePdfDetails(recipe, { scale: 2, displayServings: 4 })).toEqual(['Serves 4']);
    });
});
