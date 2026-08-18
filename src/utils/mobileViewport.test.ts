import { describe, expect, it } from 'vitest';
import { availableViewportHeight, caretScrollDelta } from './mobileViewport';

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

describe('caretScrollDelta', () => {
    it('moves a caret hidden below the visual viewport into view', () => {
        expect(caretScrollDelta(823, 837, 64, 498)).toBe(347);
    });

    it('moves a caret hidden above the visual viewport into view', () => {
        expect(caretScrollDelta(100, 114, 120, 500)).toBe(-28);
    });

    it('leaves a visible caret in place', () => {
        expect(caretScrollDelta(200, 214, 120, 500)).toBe(0);
    });
});
