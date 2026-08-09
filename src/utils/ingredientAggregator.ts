/**
 * Pure by-name ingredient aggregation (CookCLI shopping-list style).
 *
 * The parser's group_ingredients only merges *references* into their definition;
 * it leaves separate same-name definitions apart (e.g. `@flour{5%cups}` written
 * twice = two entries). This merges rows by display name and sums quantities
 * that share a compatible Math.js unit. The total is rendered with Math.js's
 * best-fitting unit ("150 g + 1.35 kg" becomes "1.5 kg"). Unrecognized or
 * incompatible units are shown side by side; ranges / textual amounts are
 * listed as-is.
 */

import {
    addDependencies,
    create,
    createUnitDependencies,
    unitDependencies,
    type Unit,
} from 'mathjs';

export interface RecipeRefTarget {
    /** Display name of the referenced recipe (e.g. "Beans"). */
    name: string;
    /** Path components from the reference, e.g. [".", "Components"]. */
    components: string[];
}

export interface AggInput {
    name: string;
    /** Numeric quantity when the amount is a plain number; null otherwise. */
    quantityValue: number | null;
    /** Unit string for a numeric quantity, or null. */
    unit: string | null;
    /** Pre-formatted text for non-summable amounts (ranges/text), else null. */
    quantityText: string | null;
    note: string | null;
    /** Present when this ingredient is a recipe reference. */
    reference: RecipeRefTarget | null;
}

export interface IngredientRow {
    name: string;
    /** Combined quantity text, or null when there's no amount. */
    displayQty: string | null;
    note: string | null;
    reference: RecipeRefTarget | null;
}

/** Round to 2 decimals and drop trailing zeros: 5.6667 -> "5.67", 16.5 -> "16.5". */
export function formatQuantity(n: number): string {
    return String(Math.round(n * 100) / 100);
}

const unitMath = create({ addDependencies, createUnitDependencies, unitDependencies });
unitMath.createUnit('tbsp', { definition: '1 tablespoon', aliases: ['tbs'] });
unitMath.createUnit('tsp', '1 teaspoon');

type QuantityBucket =
    | { type: 'unit'; total: Unit }
    | { type: 'raw'; key: string; sum: number; unitDisplay: string };

const MATHJS_UNIT_ALIASES: Record<string, string> = {
    'fl oz': 'floz',
    'fl. oz.': 'floz',
};

/** Normalizes plural labels so "cup" and "cups" share a bucket. */
function normalizeUnit(unit: string | null): string {
    return (unit ?? '').trim().toLowerCase().replace(/s$/, '');
}

function parsedUnit(value: number, unit: string | null): Unit | null {
    if (!unit?.trim()) return null;
    try {
        const normalized = unit.trim().toLowerCase();
        return unitMath.unit(value, MATHJS_UNIT_ALIASES[normalized] ?? unit);
    } catch {
        return null;
    }
}

export function aggregateIngredients(items: AggInput[]): IngredientRow[] {
    const order: string[] = [];
    const groups = new Map<string, {
        name: string;
        quantities: QuantityBucket[];
        textParts: string[];
        note: string | null;
        reference: RecipeRefTarget | null;
    }>();

    for (const item of items) {
        let group = groups.get(item.name);
        if (!group) {
            group = {
                name: item.name,
                quantities: [],
                textParts: [],
                note: null,
                reference: null,
            };
            groups.set(item.name, group);
            order.push(item.name);
        }

        if (item.quantityValue !== null) {
            const quantity = parsedUnit(item.quantityValue, item.unit);
            if (quantity) {
                const bucket = group.quantities.find(
                    (candidate): candidate is Extract<QuantityBucket, { type: 'unit' }> =>
                        candidate.type === 'unit' && candidate.total.equalBase(quantity),
                );
                if (bucket) {
                    bucket.total = unitMath.add(bucket.total, quantity) as Unit;
                } else {
                    group.quantities.push({ type: 'unit', total: quantity });
                }
            } else {
                const key = normalizeUnit(item.unit);
                const bucket = group.quantities.find(
                    (candidate): candidate is Extract<QuantityBucket, { type: 'raw' }> =>
                        candidate.type === 'raw' && candidate.key === key,
                );
                if (bucket) {
                    bucket.sum += item.quantityValue;
                } else {
                    group.quantities.push({
                        type: 'raw',
                        key,
                        sum: item.quantityValue,
                        unitDisplay: item.unit ?? '',
                    });
                }
            }
        } else if (item.quantityText) {
            group.textParts.push(item.quantityText);
        }

        if (group.note === null && item.note) group.note = item.note;
        if (group.reference === null && item.reference) group.reference = item.reference;
    }

    return order.map(name => {
        const group = groups.get(name)!;
        const parts = group.quantities.map(bucket => bucket.type === 'unit'
            ? bucket.total.toBest().format({ precision: 3 })
            : bucket.unitDisplay
                ? `${formatQuantity(bucket.sum)} ${bucket.unitDisplay}`
                : formatQuantity(bucket.sum));
        parts.push(...group.textParts);
        return {
            name: group.name,
            displayQty: parts.length ? parts.join(' + ') : null,
            note: group.note,
            reference: group.reference,
        };
    });
}
