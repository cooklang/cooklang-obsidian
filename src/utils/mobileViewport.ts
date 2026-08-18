export interface ViewportBounds {
    height: number;
    offsetTop: number;
}

export function availableViewportHeight(
    elementTop: number,
    containerHeight: number,
    viewport: ViewportBounds,
): number {
    const viewportBottom = viewport.offsetTop + viewport.height;
    return Math.max(0, Math.min(containerHeight, viewportBottom - elementTop));
}

export function caretScrollDelta(
    caretTop: number,
    caretBottom: number,
    viewportTop: number,
    viewportBottom: number,
    padding = 8,
): number {
    if (caretBottom > viewportBottom - padding) {
        return caretBottom - viewportBottom + padding;
    }
    if (caretTop < viewportTop + padding) {
        return caretTop - viewportTop - padding;
    }
    return 0;
}
