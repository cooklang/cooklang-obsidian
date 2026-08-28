import { describe, expect, it } from 'vitest';
import { getRecipeImageUrls } from './recipeImages';

describe('getRecipeImageUrls', () => {
    it('normalizes a single image URL', () => {
        expect(getRecipeImageUrls(' https://example.com/dinner.jpg ')).toEqual([
            'https://example.com/dinner.jpg',
        ]);
    });

    it('preserves valid URLs from image arrays in parser order', () => {
        expect(getRecipeImageUrls([
            'https://example.com/first.jpg',
            null,
            '',
            'http://example.com/second.png',
            42,
        ])).toEqual([
            'https://example.com/first.jpg',
            'http://example.com/second.png',
        ]);
    });

    it('rejects malformed and non-web image values', () => {
        expect(getRecipeImageUrls('dinner.jpg')).toEqual([]);
        expect(getRecipeImageUrls('javascript:alert(1)')).toEqual([]);
        expect(getRecipeImageUrls({ url: 'https://example.com/dinner.jpg' })).toEqual([]);
    });
});
