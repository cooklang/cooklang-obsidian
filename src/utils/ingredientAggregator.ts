/**
 * Pure by-name ingredient aggregation (CookCLI shopping-list style).
 *
 * The parser's group_ingredients only merges *references* into their definition;
 * it leaves separate same-name definitions apart (e.g. `@flour{5%cups}` written
 * twice = two entries). This merges rows by display name and sums quantities
 * that share a unit. Different units are shown side by side ("5 cups + 2 tbsp");
 * ranges / textual amounts are listed as-is. No cross-unit conversion.
 */

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

/** Group key that treats "cup"/"cups" as the same unit. */
function unitKey(unit: string | null): string {
    return (unit ?? '').trim().toLowerCase().replace(/s$/, '');
}

export function aggregateIngredients(items: AggInput[]): IngredientRow[] {
    const order: string[] = [];
    const groups = new Map<string, {
        name: string;
        units: Map<string, { sum: number; unitDisplay: string }>;
        unitOrder: string[];
        textParts: string[];
        note: string | null;
        reference: RecipeRefTarget | null;
    }>();

    for (const item of items) {
        let group = groups.get(item.name);
        if (!group) {
            group = {
                name: item.name,
                units: new Map(),
                unitOrder: [],
                textParts: [],
                note: null,
                reference: null,
            };
            groups.set(item.name, group);
            order.push(item.name);
        }

        if (item.quantityValue !== null) {
            const key = unitKey(item.unit);
            let bucket = group.units.get(key);
            if (!bucket) {
                bucket = { sum: 0, unitDisplay: item.unit ?? '' };
                group.units.set(key, bucket);
                group.unitOrder.push(key);
            }
            bucket.sum += item.quantityValue;
        } else if (item.quantityText) {
            group.textParts.push(item.quantityText);
        }

        if (group.note === null && item.note) group.note = item.note;
        if (group.reference === null && item.reference) group.reference = item.reference;
    }

    return order.map(name => {
        const group = groups.get(name)!;
        const parts: string[] = [];
        for (const key of group.unitOrder) {
            const bucket = group.units.get(key)!;
            parts.push(bucket.unitDisplay
                ? `${formatQuantity(bucket.sum)} ${bucket.unitDisplay}`
                : formatQuantity(bucket.sum));
        }
        parts.push(...group.textParts);
        return {
            name: group.name,
            displayQty: parts.length ? parts.join(' + ') : null,
            note: group.note,
            reference: group.reference,
        };
    });
}
