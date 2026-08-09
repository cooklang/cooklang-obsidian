/**
 * Time formatting utilities for recipe timers
 */

export const DEFAULT_SECONDS_LABELS = 's,sec,secs,second,seconds';
export const DEFAULT_MINUTES_LABELS = 'm,min,mins,minute,minutes';
export const DEFAULT_HOURS_LABELS = 'h,hr,hrs,hour,hours';

export interface TimerDuration {
    minimumSeconds: number;
    maximumSeconds: number;
}

interface TimerQuantityLike {
    value?: {
        type?: unknown;
        value?: unknown;
    };
    unit?: unknown;
}

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

/** Format a single duration or a range of durations for an inline timer. */
export function formatTimerDuration(duration: TimerDuration): string {
    const minimum = formatTime(duration.minimumSeconds);
    if (duration.minimumSeconds === duration.maximumSeconds) return minimum;
    return `${minimum}–${formatTime(duration.maximumSeconds)}`;
}

/**
 * Creates a unit map for converting time units to seconds
 * @param minutesLabel - Comma-separated labels for minutes (e.g., "m,min,minute,minutes")
 * @param hoursLabel - Comma-separated labels for hours (e.g., "h,hr,hrs,hour,hours")
 * @param secondsLabel - Comma-separated labels for seconds (e.g., "s,sec,second,seconds")
 * @returns A map of unit labels to their multiplier in seconds
 *
 * @example
 * const units = createUnitMap("m,min", "h,hr");
 * units["min"] // 60
 * units["hr"] // 3600
 */
export function createUnitMap(
    minutesLabel: string,
    hoursLabel: string,
    secondsLabel: string = DEFAULT_SECONDS_LABELS,
): Record<string, number> {
    const unitMap: Record<string, number> = {};

    addUnitLabels(unitMap, secondsLabel, 1);
    addUnitLabels(unitMap, minutesLabel, 60);
    addUnitLabels(unitMap, hoursLabel, 3600);

    return unitMap;
}

function addUnitLabels(unitMap: Record<string, number>, labels: string, multiplier: number): void {
    labels
        .split(',')
        .map(label => label.trim().toLowerCase())
        .filter(Boolean)
        .forEach(label => {
            unitMap[label] = multiplier;
        });
}

/**
 * Convert a Cooklang timer quantity to seconds.
 *
 * Cooklang represents spaced values such as `2 h` as structured numbers, but
 * compact values such as `2h` as text. Supporting both shapes here keeps the
 * renderer independent of that parser distinction. Ranges retain both bounds.
 */
export function timerDurationFromQuantity(
    quantity: TimerQuantityLike | null | undefined,
    unitMap: Record<string, number>,
): TimerDuration | null {
    const value = quantity?.value;
    if (!value) return null;

    if (value.type === 'text') {
        return timerDurationFromText(String(value.value), unitMap);
    }

    const unit = quantity.unit;
    const multiplier = unit === null || unit === undefined
        ? 1
        : unitMap[String(unit).trim().toLowerCase()];
    if (multiplier === undefined) return null;

    if (value.type === 'number') {
        const amount = numberFromParserValue(value.value);
        return amount === null ? null : normalizedDuration(amount * multiplier);
    }

    if (value.type === 'range') {
        const range = objectRecord(value.value);
        const start = numberFromParserValue(range?.start);
        const end = numberFromParserValue(range?.end);
        if (start === null || end === null) return null;
        return normalizedDuration(start * multiplier, end * multiplier);
    }

    return null;
}

function numberFromParserValue(value: unknown): number | null {
    const parserValue = objectRecord(value);
    if (!parserValue) return null;
    if (parserValue.type === 'regular') return finiteNumber(parserValue.value);
    if (parserValue.type !== 'fraction') return null;

    const fraction = objectRecord(parserValue.value);
    const denominator = finiteNumber(fraction?.den);
    if (denominator === null || denominator === 0) return null;
    const whole = finiteNumber(fraction?.whole) ?? 0;
    const numerator = finiteNumber(fraction?.num) ?? 0;
    return finiteNumber(whole + numerator / denominator);
}

function objectRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null
        ? value as Record<string, unknown>
        : null;
}

function finiteNumber(value: unknown): number | null {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function normalizedDuration(first: number, second: number = first): TimerDuration | null {
    if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
    const minimumSeconds = Math.round(Math.min(first, second));
    const maximumSeconds = Math.round(Math.max(first, second));
    if (minimumSeconds <= 0) return null;
    return { minimumSeconds, maximumSeconds };
}

function timerDurationFromText(text: string, unitMap: Record<string, number>): TimerDuration | null {
    const units = Object.keys(unitMap)
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp);
    if (units.length === 0) return null;

    const numberPattern = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|(?:\\d+(?:\\.\\d+)?|\\.\\d+))';
    const tokenPattern = new RegExp(
        `(${numberPattern})(?:\\s*[-–—]\\s*(${numberPattern}))?\\s*(${units.join('|')})`,
        'gi',
    );

    let minimumSeconds = 0;
    let maximumSeconds = 0;
    let lastIndex = 0;
    let matched = false;
    for (const match of text.matchAll(tokenPattern)) {
        const index = match.index ?? 0;
        if (text.slice(lastIndex, index).trim() !== '') return null;

        const start = numberFromText(match[1]);
        const end = match[2] ? numberFromText(match[2]) : start;
        const multiplier = unitMap[match[3].toLowerCase()];
        if (start === null || end === null || multiplier === undefined) return null;

        minimumSeconds += Math.min(start, end) * multiplier;
        maximumSeconds += Math.max(start, end) * multiplier;
        lastIndex = index + match[0].length;
        matched = true;
    }

    if (!matched || text.slice(lastIndex).trim() !== '') return null;
    return normalizedDuration(minimumSeconds, maximumSeconds);
}

function numberFromText(value: string): number | null {
    const mixed = value.trim().match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
    if (!mixed) return finiteNumber(value);

    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    return Number(mixed[1] ?? 0) + Number(mixed[2]) / denominator;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
