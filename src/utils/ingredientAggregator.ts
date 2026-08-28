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
    /** Numeric reference request (`{2}`, `{4%servings}`, `{150%ml}`). */
    quantity: number | null;
    /** Unit for servings/yield scaling; null means a direct multiplier. */
    unit: string | null;
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
    /** Preparation-specific quantities, in first-seen order. */
    preparations: IngredientPreparationRow[];
    reference: RecipeRefTarget | null;
}

export interface IngredientPreparationRow {
    name: string;
    displayQty: string | null;
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

interface QuantityAccumulator {
    quantities: QuantityBucket[];
    textParts: string[];
}

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

function addQuantity(accumulator: QuantityAccumulator, item: AggInput): void {
    if (item.quantityValue !== null) {
        const quantity = parsedUnit(item.quantityValue, item.unit);
        if (quantity) {
            const bucket = accumulator.quantities.find(
                (candidate): candidate is Extract<QuantityBucket, { type: 'unit' }> =>
                    candidate.type === 'unit' && candidate.total.equalBase(quantity),
            );
            if (bucket) {
                bucket.total = unitMath.add(bucket.total, quantity) as Unit;
            } else {
                accumulator.quantities.push({ type: 'unit', total: quantity });
            }
        } else {
            const key = normalizeUnit(item.unit);
            const bucket = accumulator.quantities.find(
                (candidate): candidate is Extract<QuantityBucket, { type: 'raw' }> =>
                    candidate.type === 'raw' && candidate.key === key,
            );
            if (bucket) {
                bucket.sum += item.quantityValue;
            } else {
                accumulator.quantities.push({
                    type: 'raw',
                    key,
                    sum: item.quantityValue,
                    unitDisplay: item.unit ?? '',
                });
            }
        }
    } else if (item.quantityText) {
        accumulator.textParts.push(item.quantityText);
    }
}

function displayQuantity(accumulator: QuantityAccumulator): string | null {
    const parts = accumulator.quantities.map(bucket => bucket.type === 'unit'
        ? bucket.total.toBest().format({ precision: 3 })
        : bucket.unitDisplay
            ? `${formatQuantity(bucket.sum)} ${bucket.unitDisplay}`
            : formatQuantity(bucket.sum));
    parts.push(...accumulator.textParts);
    return parts.length ? parts.join(' + ') : null;
}

export function aggregateIngredients(items: AggInput[]): IngredientRow[] {
    const order: string[] = [];
    const groups = new Map<string, {
        name: string;
        total: QuantityAccumulator;
        preparationOrder: string[];
        preparations: Map<string, QuantityAccumulator>;
        reference: RecipeRefTarget | null;
    }>();

    for (const item of items) {
        let group = groups.get(item.name);
        if (!group) {
            group = {
                name: item.name,
                total: { quantities: [], textParts: [] },
                preparationOrder: [],
                preparations: new Map(),
                reference: null,
            };
            groups.set(item.name, group);
            order.push(item.name);
        }

        addQuantity(group.total, item);

        const preparationName = item.note?.trim();
        if (preparationName) {
            let preparation = group.preparations.get(preparationName);
            if (!preparation) {
                preparation = { quantities: [], textParts: [] };
                group.preparations.set(preparationName, preparation);
                group.preparationOrder.push(preparationName);
            }
            addQuantity(preparation, item);
        }

        if (group.reference === null && item.reference) group.reference = item.reference;
    }

    return order.map(name => {
        const group = groups.get(name)!;
        return {
            name: group.name,
            displayQty: displayQuantity(group.total),
            preparations: group.preparationOrder.map(preparationName => ({
                name: preparationName,
                displayQty: displayQuantity(group.preparations.get(preparationName)!),
            })),
            reference: group.reference,
        };
    });
}
