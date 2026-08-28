import { describe, it, expect } from 'vitest';
import { buildMetaPills, formatDuration } from './heroModel';

describe('formatDuration', () => {
    it('formats minutes', () => {
        expect(formatDuration(45)).toBe('45 min');
    });
    it('formats hours and minutes', () => {
        expect(formatDuration(90)).toBe('1 h 30 min');
        expect(formatDuration(120)).toBe('2 h');
    });
});

describe('buildMetaPills', () => {
    it('builds time, servings, difficulty, source, and tag pills', () => {
        const recipe = {
            time: 45,
            servings: 4,
            difficulty: 'medium',
            source: { url: 'https://seriouseats.com', name: undefined },
            course: 'dinner',
            cuisine: undefined,
            diet: undefined,
            tags: new Set(['thai', 'quick']),
        } as any;
        const pills = buildMetaPills(recipe, 8);
        const kinds = pills.map(p => p.kind);
        expect(kinds).toContain('time');
        expect(kinds).toContain('servings');
        expect(kinds).toContain('difficulty');
        expect(kinds).toContain('source');
        expect(kinds.filter(k => k === 'tag').length).toBe(2);
        // displayServings overrides base servings in the text
        expect(pills.find(p => p.kind === 'servings')!.text).toContain('8');
    });

    it('handles prep/cook time objects', () => {
        const recipe = { time: { prep_time: 10, cook_time: 20 }, tags: new Set() } as any;
        const pills = buildMetaPills(recipe, null);
        expect(pills.find(p => p.kind === 'time')!.text).toBe('30 min');
    });

    it('builds an author pill with its url', () => {
        const recipe = { author: { name: 'Jane Cook', url: 'https://jane.example' }, tags: new Set() } as any;
        const pill = buildMetaPills(recipe, null).find(p => p.kind === 'author');
        expect(pill).toBeTruthy();
        expect(pill!.text).toBe('Jane Cook');
        expect(pill!.url).toBe('https://jane.example');
    });

    it('keeps unsafe author and source URLs visible as text but not as links', () => {
        const recipe = {
            author: { name: 'Jane Cook', url: 'javascript:alert(1)' },
            source: { name: null, url: 'data:text/html,dinner' },
            tags: new Set(),
        } as any;
        const pills = buildMetaPills(recipe, null);

        expect(pills.find(p => p.kind === 'author')).toEqual({
            kind: 'author',
            icon: '✍',
            text: 'Jane Cook',
        });
        expect(pills.find(p => p.kind === 'source')).toEqual({
            kind: 'source',
            icon: '↗',
            text: 'data:text/html,dinner',
        });
    });

    it('emits no pills when nothing is present', () => {
        const recipe = { tags: new Set() } as any;
        expect(buildMetaPills(recipe, null)).toEqual([]);
    });
});
