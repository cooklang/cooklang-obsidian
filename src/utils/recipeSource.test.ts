import { describe, expect, it, vi } from 'vitest';
import { isRecipeSource } from './recipeSource';

describe('recipe source eligibility', () => {
    // JSON is a YAML subset; Obsidian supplies the YAML implementation at runtime.
    const parse = JSON.parse;

    it.each(['Dinner.cook', 'Dinner.cook.md'])('recognizes %s without consulting YAML', path => {
        const yaml = vi.fn(() => { throw new Error('Invalid YAML'); });
        expect(isRecipeSource(path, '---\n[broken', yaml)).toBe(true);
        expect(yaml).not.toHaveBeenCalled();
    });

    it.each([true, false, 'true', null, 1])('requires a Boolean true, not %j', recipe => {
        expect(isRecipeSource('Dinner.md', `---\n${JSON.stringify({ recipe })}\n---\nMix.`, parse))
            .toBe(recipe === true);
    });

    it('extracts BOM, CRLF and YAML closing markers without passing body text to the parser', () => {
        const yaml = vi.fn(() => ({ recipe: true }));
        expect(isRecipeSource('Dinner.md', '\uFEFF---\r\nrecipe: true\r\n...\r\nMix @rice.', yaml)).toBe(true);
        expect(yaml).toHaveBeenCalledWith('recipe: true\r\n');
    });

    it.each(['', 'recipe: true', '---\n{"recipe":true}', '---\n{broken}\n---\n',
        '---\nnull\n---', '---\n[]\n---', 'text\n---\n{"recipe":true}\n---'])
    ('rejects missing or invalid frontmatter: %s', source => {
        expect(isRecipeSource('Dinner.md', source, parse)).toBe(false);
    });

    it('uses immediate buffer edits and ignores markers outside Markdown files', () => {
        const source = '---\n{"recipe":true}\n---\n@rice';
        expect(isRecipeSource('Dinner.md', source, parse)).toBe(true);
        expect(isRecipeSource('Dinner.md', source.replace('true', 'false'), parse)).toBe(false);
        expect(isRecipeSource('Dinner.txt', source, parse)).toBe(false);
    });
});
