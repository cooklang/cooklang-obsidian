/**
 * URL validation utilities
 */

/**
 * Validates if a string is a valid URL
 * @param str - The string to validate
 * @returns true if the string is a valid URL, false otherwise
 *
 * @example
 * isValidUrl('https://example.com') // true
 * isValidUrl('not a url') // false
 * isValidUrl('ftp://files.example.com') // true
 */
export function isValidUrl(str: string): boolean {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}
