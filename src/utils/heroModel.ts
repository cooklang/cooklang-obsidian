/**
 * Pure model for hero meta pills, derived from the typed recipe fields.
 */
import type { CooklangRecipe } from '@cooklang/cooklang-ts';

// `@cooklang/cooklang-ts` does not re-export its `RecipeTime` type, so mirror it
// locally (minutes as a number, or a prep/cook breakdown).
type RecipeTime = number | { prep_time?: number; cook_time?: number };

export type PillKind =
    | 'time' | 'servings' | 'difficulty' | 'source'
    | 'course' | 'cuisine' | 'diet' | 'tag';

export interface MetaPill {
    kind: PillKind;
    /** Short emoji/glyph icon, or '' for tags. */
    icon: string;
    text: string;
    /** Present for source pills that link out. */
    url?: string;
}

/** Total minutes from a RecipeTime (number or {prep,cook}). */
function totalMinutes(time: RecipeTime | undefined): number | null {
    if (typeof time === 'number') return time > 0 ? time : null;
    if (time && typeof time === 'object') {
        const sum = (time.prep_time ?? 0) + (time.cook_time ?? 0);
        return sum > 0 ? sum : null;
    }
    return null;
}

export function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h <= 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
}

function asText(value: unknown): string | null {
    if (value == null) return null;
    const s = String(value).trim();
    return s.length ? s : null;
}

/**
 * @param displayServings overrides the servings pill text (e.g. scaled count).
 *        Pass null to use the recipe's own servings value.
 */
export function buildMetaPills(
    recipe: CooklangRecipe,
    displayServings: number | null,
): MetaPill[] {
    const pills: MetaPill[] = [];

    const minutes = totalMinutes(recipe.time);
    if (minutes !== null) {
        pills.push({ kind: 'time', icon: '⏱', text: formatDuration(minutes) });
    }

    const servingsText = displayServings != null
        ? String(displayServings)
        : asText(recipe.servings);
    if (servingsText) {
        const n = Number(servingsText);
        const label = Number.isFinite(n)
            ? `${servingsText} serving${n === 1 ? '' : 's'}`
            : servingsText;
        pills.push({ kind: 'servings', icon: '🍽', text: label });
    }

    const difficulty = asText(recipe.difficulty);
    if (difficulty) pills.push({ kind: 'difficulty', icon: '🔥', text: difficulty });

    const course = asText(recipe.course);
    if (course) pills.push({ kind: 'course', icon: '🍴', text: course });

    const cuisine = asText(recipe.cuisine);
    if (cuisine) pills.push({ kind: 'cuisine', icon: '🌍', text: cuisine });

    const diet = asText(recipe.diet);
    if (diet) pills.push({ kind: 'diet', icon: '🌱', text: diet });

    if (recipe.source) {
        const text = recipe.source.name ?? recipe.source.url ?? null;
        if (text) {
            pills.push({ kind: 'source', icon: '↗', text, url: recipe.source.url });
        }
    }

    if (recipe.tags) {
        for (const tag of recipe.tags) {
            const t = asText(tag);
            if (t) pills.push({ kind: 'tag', icon: '', text: `#${t}` });
        }
    }

    return pills;
}
