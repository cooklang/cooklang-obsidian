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
