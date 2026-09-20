// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notice } from 'obsidian';
import { TimerNotice } from './TimerNotice';

afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
});

describe('TimerNotice', () => {
    it('uses an indefinite duration and renders recipe labels as text', () => {
        const notice = new TimerNotice('<img src=x onerror=alert(1)>', vi.fn());
        expect(notice).toHaveProperty('duration', 0);
        expect(document.querySelector('img')).toBeNull();
        expect(document.body.textContent).toContain('<img src=x onerror=alert(1)>');
        notice.hide();
    });

    it('acknowledges native/programmatic hiding exactly once', () => {
        const onDismiss = vi.fn();
        const hide = vi.spyOn(Notice.prototype, 'hide');
        const notice = new TimerNotice('rest', onDismiss);
        notice.hide();
        notice.hide();
        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(hide).toHaveBeenCalledTimes(1);
        expect(document.querySelector('.notice')).toBeNull();
    });
});
