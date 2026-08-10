import { describe, expect, it } from 'vitest';
import { compareVersions, releaseNotesForUpdate, releaseNotesSince } from './releaseNotes';

const changelog = `# Changelog

## [1.3.0](https://example.com/1.3.0) (2026-08-10)

### Features

* newest feature

## [1.2.0](https://example.com/1.2.0) (2026-08-01)

### Bug Fixes

* middle fix

## 1.1.0

### Added

* oldest feature
`;

describe('compareVersions', () => {
    it('compares semantic versions including prereleases', () => {
        expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0);
        expect(compareVersions('1.3.0-beta.2', '1.3.0-beta.10')).toBeLessThan(0);
        expect(compareVersions('1.3.0', '1.3.0-beta.10')).toBeGreaterThan(0);
        expect(compareVersions('not-a-version', '1.3.0')).toBeNull();
    });
});

describe('releaseNotesSince', () => {
    it('returns only the current release when no previous version is known', () => {
        const notes = releaseNotesSince(changelog, '1.3.0');

        expect(notes).toContain('newest feature');
        expect(notes).not.toContain('middle fix');
    });

    it('returns every release missed since the previous version', () => {
        const notes = releaseNotesSince(changelog, '1.3.0', '1.1.0');

        expect(notes).toContain('newest feature');
        expect(notes).toContain('middle fix');
        expect(notes).not.toContain('oldest feature');
    });

    it('does not return notes for the same version or a downgrade', () => {
        expect(releaseNotesSince(changelog, '1.3.0', '1.3.0')).toBeNull();
        expect(releaseNotesSince(changelog, '1.2.0', '1.3.0')).toBeNull();
    });

    it('returns null when the current release is absent from the changelog', () => {
        expect(releaseNotesSince(changelog, '2.0.0', '1.1.0')).toBeNull();
    });
});

describe('releaseNotesForUpdate', () => {
    it('suppresses release notes on a fresh installation', () => {
        expect(releaseNotesForUpdate(changelog, '1.3.0', undefined, true)).toBeNull();
    });

    it('shows the current notes when upgrading from a version without a marker', () => {
        const notes = releaseNotesForUpdate(changelog, '1.3.0', undefined, false);

        expect(notes).toContain('newest feature');
        expect(notes).not.toContain('middle fix');
    });
});
