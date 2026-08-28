import { describe, expect, it } from 'vitest';
import { getSafeExternalUrl } from './urlValidators';

describe('getSafeExternalUrl', () => {
    it('normalizes HTTP(S) URLs', () => {
        expect(getSafeExternalUrl(' https://example.com/recipe?q=one '))
            .toBe('https://example.com/recipe?q=one');
        expect(getSafeExternalUrl('http://localhost:8080')).toBe('http://localhost:8080');
        expect(getSafeExternalUrl('HTTPS://EXAMPLE.COM')).toBe('HTTPS://EXAMPLE.COM');
    });

    it.each([
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///tmp/recipe.cook',
        'ftp://example.com/recipe',
        'mailto:cook@example.com',
        'obsidian://open?vault=Recipes',
        'blob:https://example.com/id',
        '/relative/path',
        'not a url',
        '',
    ])('rejects non-web or malformed URL %s', value => {
        expect(getSafeExternalUrl(value)).toBeNull();
    });

    it('rejects non-string values', () => {
        expect(getSafeExternalUrl(null)).toBeNull();
        expect(getSafeExternalUrl({ url: 'https://example.com' })).toBeNull();
    });
});
