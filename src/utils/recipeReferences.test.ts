import { describe, it, expect } from 'vitest';
import { resolveReferencePath } from './recipeReferences';

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
