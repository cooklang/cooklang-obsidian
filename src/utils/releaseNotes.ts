interface ParsedVersion {
    core: [number, number, number];
    prerelease: string[];
}

interface ChangelogSection {
    version: string;
    markdown: string;
}

const VERSION_PATTERN = '(\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?)';
const RELEASE_HEADING = new RegExp(
    `^##[ \\t]+(?:\\[v?${VERSION_PATTERN}\\]\\([^)]+\\)|v?${VERSION_PATTERN})(?:[ \\t].*)?$`,
    'gm',
);

function parseVersion(version: string): ParsedVersion | null {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version);
    if (!match) return null;

    return {
        core: [Number(match[1]), Number(match[2]), Number(match[3])],
        prerelease: match[4]?.split('.') ?? [],
    };
}

function compareIdentifiers(left: string, right: string): number {
    const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
    const rightNumber = /^\d+$/.test(right) ? Number(right) : null;

    if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
    if (leftNumber !== null) return -1;
    if (rightNumber !== null) return 1;
    return left.localeCompare(right);
}

export function compareVersions(left: string, right: string): number | null {
    const parsedLeft = parseVersion(left);
    const parsedRight = parseVersion(right);
    if (!parsedLeft || !parsedRight) return null;

    for (let index = 0; index < parsedLeft.core.length; index += 1) {
        const difference = parsedLeft.core[index] - parsedRight.core[index];
        if (difference !== 0) return difference;
    }

    if (parsedLeft.prerelease.length === 0 && parsedRight.prerelease.length === 0) return 0;
    if (parsedLeft.prerelease.length === 0) return 1;
    if (parsedRight.prerelease.length === 0) return -1;

    const identifierCount = Math.max(parsedLeft.prerelease.length, parsedRight.prerelease.length);
    for (let index = 0; index < identifierCount; index += 1) {
        const leftIdentifier = parsedLeft.prerelease[index];
        const rightIdentifier = parsedRight.prerelease[index];
        if (leftIdentifier === undefined) return -1;
        if (rightIdentifier === undefined) return 1;

        const difference = compareIdentifiers(leftIdentifier, rightIdentifier);
        if (difference !== 0) return difference;
    }

    return 0;
}

function changelogSections(changelog: string): ChangelogSection[] {
    const matches = Array.from(changelog.matchAll(RELEASE_HEADING));

    return matches.map((match, index) => ({
        version: match[1] ?? match[2],
        markdown: changelog
            .slice(match.index, matches[index + 1]?.index ?? changelog.length)
            .trim(),
    }));
}

/**
 * Returns the release sections newer than the last version the user saw.
 * With no usable previous version, only the current release is returned. The
 * caller separately suppresses this for a fresh install; this fallback lets
 * users upgrading from a version that predates the stored marker see what's new.
 */
export function releaseNotesSince(
    changelog: string,
    currentVersion: string,
    previousVersion?: string,
): string | null {
    const currentComparison = compareVersions(currentVersion, currentVersion);
    if (currentComparison === null) return null;

    const previousComparison = previousVersion
        ? compareVersions(previousVersion, currentVersion)
        : null;
    if (previousComparison !== null && previousComparison >= 0) return null;

    const sections = changelogSections(changelog);
    const hasCurrentRelease = sections.some(
        section => compareVersions(section.version, currentVersion) === 0,
    );
    if (!hasCurrentRelease) return null;

    const selected = previousComparison === null
        ? sections.filter(section => compareVersions(section.version, currentVersion) === 0)
        : sections.filter(section => {
            const afterPrevious = compareVersions(section.version, previousVersion as string);
            const atOrBeforeCurrent = compareVersions(section.version, currentVersion);
            return afterPrevious !== null
                && afterPrevious > 0
                && atOrBeforeCurrent !== null
                && atOrBeforeCurrent <= 0;
        });

    return selected.length > 0
        ? selected.map(section => section.markdown).join('\n\n')
        : null;
}

export function releaseNotesForUpdate(
    changelog: string,
    currentVersion: string,
    previousVersion: string | undefined,
    isFirstInstall: boolean,
): string | null {
    return isFirstInstall
        ? null
        : releaseNotesSince(changelog, currentVersion, previousVersion);
}
