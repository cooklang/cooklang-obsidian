import { describe, expect, it } from 'vitest';
import { availableViewportHeight } from './mobileViewport';

describe('availableViewportHeight', () => {
    it('uses the container height when the whole editor is visible', () => {
        expect(availableViewportHeight(120, 600, { height: 800, offsetTop: 0 })).toBe(600);
    });

    it('limits the editor to the area above the software keyboard', () => {
        expect(availableViewportHeight(120, 600, { height: 500, offsetTop: 0 })).toBe(380);
    });

    it('accounts for a visual viewport shifted within the layout viewport', () => {
        expect(availableViewportHeight(200, 600, { height: 400, offsetTop: 80 })).toBe(280);
    });

    it('never returns a negative height', () => {
        expect(availableViewportHeight(600, 600, { height: 500, offsetTop: 0 })).toBe(0);
    });
});
