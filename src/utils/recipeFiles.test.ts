import { describe, expect, it, vi } from 'vitest';
import { convertRecipeContent, isRecipeFile, newRecipeContent, recipeConversionPath, recipeFormat,
    recipeImageBasenames, recipeName, type RecipeFormat } from './recipeFiles';
import { getRecipeStepImage } from './stepImages';
import { getRecipeMainImage } from './recipeImages';

describe('recipe file formats', () => {
    it.each([
        ['Dinner.cook', undefined, true], ['Dinner.cook.md', undefined, true],
        ['Dinner.cook.md', { recipe: false }, true], ['Dinner.md', { recipe: true }, true],
        ['Dinner.md', { recipe: 'true' }, false], ['Dinner.md', { recipe: false }, false],
        ['Dinner.md', undefined, false], ['Dinner.txt', { recipe: true }, false],
    ])('recognizes %s with %j', (path, metadata, expected) => {
        expect(isRecipeFile(path, metadata)).toBe(expected);
    });

    it('treats the compound suffix as one format, including names containing dots', () => {
        expect(recipeFormat('Meals/Dinner.v2.cook.md')).toBe('cook.md');
        expect(recipeName('Meals/Dinner.v2.cook.md')).toBe('Dinner.v2');
        for (const source of ['cook', 'cook.md', 'md']) {
            for (const target of ['cook', 'cook.md', 'md'] as RecipeFormat[]) {
                expect(recipeConversionPath(`Meals/Dinner.${source}`, target)).toBe(`Meals/Dinner.${target}`);
            }
        }
    });

    it('only creates a marker in Markdown formats', () => {
        expect(newRecipeContent('cook')).toBe('');
        expect(newRecipeContent('md')).toBe('---\nrecipe: true\n---\n\n');
        expect(newRecipeContent('cook.md')).toBe(newRecipeContent('md'));
    });

    it('uses canonical step images before legacy compound names, independently for each step', () => {
        const names = recipeImageBasenames('Meals/Dinner.cook.md');
        const images = [
            { basename: 'Dinner.cook.1', extension: 'jpg' },
            { basename: 'Dinner.1', extension: 'png' },
            { basename: 'Dinner.cook.2', extension: 'jpg' },
        ];
        expect(names).toEqual(['Dinner', 'Dinner.cook']);
        expect(getRecipeStepImage(1, names, images)).toBe(images[1]);
        expect(getRecipeStepImage(2, names, images)).toBe(images[2]);
        expect(getRecipeStepImage(3, names, images)).toBeNull();
        expect(recipeImageBasenames('Meals/Dinner.md')).toEqual(['Dinner']);
    });

    it('prefers a canonical main image, falling back to the legacy compound basename', () => {
        const legacy = { basename: 'Dinner.cook' };
        const canonical = { basename: 'Dinner' };
        expect(getRecipeMainImage('Meals/Dinner.cook.md', [legacy, canonical])).toBe(canonical);
        expect(getRecipeMainImage('Meals/Dinner.cook.md', [legacy])).toBe(legacy);
        expect(getRecipeMainImage('Meals/Dinner.md', [legacy])).toBeNull();
    });
});

describe('recipe frontmatter conversion', () => {
    // JSON is a YAML subset; the host supplies Obsidian's YAML codec at runtime.
    const yaml = { parse: JSON.parse, stringify: JSON.stringify };

    it('preserves nested metadata values and the exact Cooklang body', () => {
        const metadata = { title: 'Dinner', servings: 4, tags: ['dinner'], author: { name: 'A' }, recipe: false };
        const body = '\nMix @rice{2%cup}.\n\n>> source: book\n';
        const converted = convertRecipeContent(`---\n${JSON.stringify(metadata)}\n---\n${body}`, 'md', yaml);
        expect(converted).toBe(`---\n${JSON.stringify({ ...metadata, recipe: true })}\n---\n${body}`);
        expect(convertRecipeContent(converted, 'cook', yaml)).toBe(converted);
    });

    it('preserves an existing Boolean marker without reserializing frontmatter', () => {
        const codec = { parse: vi.fn(() => ({ recipe: true })), stringify: vi.fn() };
        const source = '---\n# Keep this comment\nrecipe: true\n---\nMix.';
        expect(convertRecipeContent(source, 'cook.md', codec)).toBe(source);
        expect(codec.stringify).not.toHaveBeenCalled();
    });

    it('preserves BOM, CRLF, and body when adding properties', () => {
        const source = '\uFEFFMix @rice{}\r\n\r\nServe.';
        expect(convertRecipeContent(source, 'md', yaml))
            .toBe('\uFEFF---\r\n{"recipe":true}\r\n---\r\nMix @rice{}\r\n\r\nServe.');
    });

    it('accepts an empty mapping and the YAML end marker', () => {
        const codec = { parse: () => null, stringify: () => 'recipe: true\n' };
        expect(convertRecipeContent('---\n\n...\nMix.', 'md', codec)).toBe('---\nrecipe: true\n---\nMix.');
    });

    it.each(['---\nrecipe: true', '---\n[1,2]\n---\nMix.', '---\n"scalar"\n---\nMix.', '---\n{bad}\n---\nMix.'])
    ('rejects malformed or non-mapping YAML before modifying content: %s', source => {
        expect(() => convertRecipeContent(source, 'md', yaml)).toThrow();
        expect(() => convertRecipeContent(source, 'cook', yaml)).toThrow();
    });
});
