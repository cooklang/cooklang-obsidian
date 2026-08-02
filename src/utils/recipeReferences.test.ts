import { describe, it, expect } from 'vitest';
import { resolveReferenceCandidatePaths, resolveReferencePath } from './recipeReferences';

describe('resolveReferencePath', () => {
    it('resolves a "./Sub/Name" reference relative to the recipe folder', () => {
        expect(resolveReferencePath('Breakfast', ['.', 'Components'], 'Beans'))
            .toBe('Breakfast/Components/Beans.cook');
    });

    it('resolves a same-folder reference', () => {
        expect(resolveReferencePath('Breakfast', ['.'], 'Salsa'))
            .toBe('Breakfast/Salsa.cook');
    });

    it('handles parent navigation with ".."', () => {
        expect(resolveReferencePath('Breakfast/Quick', ['..', 'Sauces'], 'Aioli'))
            .toBe('Breakfast/Sauces/Aioli.cook');
    });

    it('works from the vault root', () => {
        expect(resolveReferencePath('', ['.'], 'Beans'))
            .toBe('Beans.cook');
    });

    it('ignores empty/dot components', () => {
        expect(resolveReferencePath('A', [], 'B')).toBe('A/B.cook');
    });
});

describe('resolveReferenceCandidatePaths', () => {
    it('returns the .cook target before the same-path .md fallback', () => {
        expect(resolveReferenceCandidatePaths('Breakfast', ['.', 'Components'], 'Beans'))
            .toEqual(['Breakfast/Components/Beans.cook', 'Breakfast/Components/Beans.md']);
    });

    it('keeps parent navigation identical for both candidate extensions', () => {
        expect(resolveReferenceCandidatePaths('Breakfast/Quick', ['..', 'Sauces'], 'Aioli'))
            .toEqual(['Breakfast/Sauces/Aioli.cook', 'Breakfast/Sauces/Aioli.md']);
    });

    it('returns both candidates from the vault root', () => {
        expect(resolveReferenceCandidatePaths('', ['.'], 'Beans'))
            .toEqual(['Beans.cook', 'Beans.md']);
    });
});
