import { describe, expect, it } from 'vitest';
import type { CooklangRecipe } from '@cooklang/cooklang';
import { getAdditionalMetadata } from './metadataEntries';

function recipe(
    metadata: Array<[string, string]>,
    fields: Partial<CooklangRecipe> = {},
): CooklangRecipe {
    return {
        rawMetadata: new Map(metadata),
        tags: new Set(),
        ...fields,
    } as unknown as CooklangRecipe;
}

describe('getAdditionalMetadata', () => {
    it('omits canonical metadata that is represented elsewhere in the preview', () => {
        const result = getAdditionalMetadata(recipe([
            ['title', 'Dinner'],
            ['description', 'Fast.'],
            ['servings', '4'],
            ['time', '45 min'],
            ['tags', 'quick'],
            ['source', 'https://example.com'],
            ['author', 'Jane'],
            ['difficulty', 'easy'],
            ['course', 'dinner'],
            ['cuisine', 'Thai'],
            ['diet', 'vegan'],
            ['image', 'https://example.com/dinner.jpg'],
            ['oven', '220 C'],
        ], {
            title: 'Dinner',
            description: 'Fast.',
            servings: 4,
            time: 45,
            tags: new Set(['quick']),
            source: { name: undefined, url: 'https://example.com' },
            author: { name: 'Jane', url: undefined },
            difficulty: 'easy',
            course: 'dinner',
            cuisine: 'Thai',
            diet: 'vegan',
            images: 'https://example.com/dinner.jpg',
        }));

        expect(result).toEqual([{ key: 'oven', value: '220 C' }]);
    });

    it('preserves unsupported aliases even when a related canonical field exists', () => {
        const result = getAdditionalMetadata(recipe([
            ['servings', '4'],
            ['serves', '6'],
            ['yield', '2 loaves'],
            ['tags', 'quick'],
            ['tag', 'weeknight'],
            ['image', 'https://example.com/main.jpg'],
            ['images', 'https://example.com/other.jpg'],
            ['picture', 'https://example.com/picture.jpg'],
            ['pictures', 'https://example.com/pictures.jpg'],
            ['prep_time', '10 min'],
            ['cook_time', '20 min'],
        ], {
            servings: 4,
            tags: new Set(['quick']),
            images: 'https://example.com/main.jpg',
        }));

        expect(result).toEqual([
            { key: 'serves', value: '6' },
            { key: 'yield', value: '2 loaves' },
            { key: 'tag', value: 'weeknight' },
            { key: 'images', value: 'https://example.com/other.jpg' },
            { key: 'picture', value: 'https://example.com/picture.jpg' },
            { key: 'pictures', value: 'https://example.com/pictures.jpg' },
            { key: 'prep_time', value: '10 min' },
            { key: 'cook_time', value: '20 min' },
        ]);
    });

    it('preserves case variants because parser metadata keys are case-sensitive', () => {
        const result = getAdditionalMetadata(recipe([
            ['title', 'Canonical title'],
            ['Title', 'Unparsed title'],
            ['TIME', '45 min'],
            ['Image', 'https://example.com/dinner.jpg'],
        ], {
            title: 'Canonical title',
        }));

        expect(result).toEqual([
            { key: 'Title', value: 'Unparsed title' },
            { key: 'TIME', value: '45 min' },
            { key: 'Image', value: 'https://example.com/dinner.jpg' },
        ]);
    });

    it('preserves canonical keys when the parser did not produce renderable values', () => {
        const result = getAdditionalMetadata(recipe([
            ['time', 'whenever'],
            ['tags', ''],
            ['image', 'javascript:alert(1)'],
        ], {
            time: undefined,
            tags: new Set(),
            images: 'javascript:alert(1)',
        }));

        expect(result).toEqual([
            { key: 'time', value: 'whenever' },
            { key: 'tags', value: '' },
            { key: 'image', value: 'javascript:alert(1)' },
        ]);
    });

    it('handles prep and cook time independently', () => {
        const result = getAdditionalMetadata(recipe([
            ['prep time', '10 min'],
            ['cook time', 'unknown'],
        ], {
            time: { prep_time: 10, cook_time: undefined },
        }));

        expect(result).toEqual([{ key: 'cook time', value: 'unknown' }]);
    });

    it('preserves parsed time fields when no time pill can be rendered', () => {
        const result = getAdditionalMetadata(recipe([
            ['prep time', '0 min'],
        ], {
            time: { prep_time: 0, cook_time: undefined },
        }));

        expect(result).toEqual([{ key: 'prep time', value: '0 min' }]);
    });

    it('preserves raw Map ordering and object-special keys', () => {
        const result = getAdditionalMetadata(recipe([
            ['2', 'second'],
            ['1', 'first'],
            ['__proto__', 'prototype value'],
        ]));

        expect(result).toEqual([
            { key: '2', value: 'second' },
            { key: '1', value: 'first' },
            { key: '__proto__', value: 'prototype value' },
        ]);
    });
});
