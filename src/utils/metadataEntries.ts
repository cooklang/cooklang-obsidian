import type { CooklangRecipe } from '@cooklang/cooklang';
import { getMetadata } from '../recipeHelpers';

const SHOWN_KEYS = new Set([
    'title', 'description', 'servings', 'serves', 'yield', 'time', 'prep time',
    'prep_time', 'cook time', 'cook_time', 'tags', 'tag', 'source', 'author',
    'difficulty', 'course', 'cuisine', 'diet', 'images', 'image',
]);

export interface MetadataEntry {
    key: string;
    value: string;
}

export function getAdditionalMetadata(recipe: CooklangRecipe): MetadataEntry[] {
    return Object.entries(getMetadata(recipe))
        .filter(([key]) => !SHOWN_KEYS.has(key.toLowerCase().trim()))
        .map(([key, value]) => ({ key, value }));
}
