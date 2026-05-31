/**
 * Number formatting utilities
 */

/**
 * Formats a number as an integer or simple fraction string
 * @param n - The number to format
 * @returns Formatted string (e.g., "5", "1/2", "1 3/4")
 *
 * @example
 * formatNumber(5)    // "5"
 * formatNumber(0.5)  // "1/2"
 * formatNumber(1.75) // "1 3/4"
 */
export function formatNumber(n: number): string {
    if (Number.isInteger(n)) return String(n);
    const denominators = [2, 3, 4, 6, 8];
    for (const d of denominators) {
        const numerator = Math.round(n * d);
        if (Math.abs(numerator / d - n) < 0.001) {
            const whole = Math.floor(numerator / d);
            const rem = numerator % d;
            if (rem === 0) return String(whole);
            if (whole === 0) return `${rem}/${d}`;
            return `${whole} ${rem}/${d}`;
        }
    }
    return parseFloat(n.toFixed(2)).toString();
}
