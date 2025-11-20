/**
 * Time formatting utilities for recipe timers
 */

/**
 * Formats seconds into a human-readable time string
 * @param seconds - The number of seconds to format
 * @returns Formatted time string (e.g., "1:30:45", "5:30", "45s")
 *
 * @example
 * formatTime(45) // "45s"
 * formatTime(330) // "5:30"
 * formatTime(3665) // "1:01:05"
 */
export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Creates a unit map for converting time units to seconds
 * @param minutesLabel - Comma-separated labels for minutes (e.g., "m,min,minute,minutes")
 * @param hoursLabel - Comma-separated labels for hours (e.g., "h,hr,hrs,hour,hours")
 * @returns A map of unit labels to their multiplier in seconds
 *
 * @example
 * const units = createUnitMap("m,min", "h,hr");
 * units["min"] // 60
 * units["hr"] // 3600
 */
export function createUnitMap(minutesLabel: string, hoursLabel: string): Record<string, number> {
    const unitMap: Record<string, number> = {};

    minutesLabel
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(label => {
            unitMap[label] = 60;
        });

    hoursLabel
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(label => {
            unitMap[label] = 3600;
        });

    return unitMap;
}
