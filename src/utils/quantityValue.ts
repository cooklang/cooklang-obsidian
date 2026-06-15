/**
 * Extract a numeric value from a raw WASM Quantity.
 *
 * The library's getQuantityValue returns NaN for fraction quantities because a
 * fraction's value is an object ({whole, num, den}), not a number. This reads
 * both representations:
 *   regular:  { type: 'number', value: { type: 'regular',  value: 5.5 } }
 *   fraction: { type: 'number', value: { type: 'fraction', value: { whole, num, den } } }
 * Range / text quantities return null (they aren't summable).
 *
 * Duck-typed (`any`) so it can be unit-tested without the WASM runtime.
 */
export function numericFromQuantity(quantity: any): number | null {
    const value = quantity?.value;
    if (!value || value.type !== 'number') return null;

    const inner = value.value;
    if (inner?.type === 'regular') {
        const n = Number(inner.value);
        return Number.isFinite(n) ? n : null;
    }
    if (inner?.type === 'fraction') {
        const f = inner.value;
        if (f && typeof f.den === 'number' && f.den !== 0) {
            const n = (f.whole ?? 0) + (f.num ?? 0) / f.den;
            return Number.isFinite(n) ? n : null;
        }
    }
    return null;
}
