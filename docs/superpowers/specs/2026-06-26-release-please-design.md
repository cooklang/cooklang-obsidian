# Automated releases with release-please

**Date:** 2026-06-26
**Status:** Approved

## Goal

Replace the manual release process with [release-please](https://github.com/googleapis/release-please-action) so that releasing the plugin requires only merging an auto-generated release PR. Version bumping, changelog generation, tagging, GitHub Release creation, and asset upload all happen automatically.

## Background / current process

Two workflows handle releases today:

- **`.github/workflows/version.yml`** — manual `workflow_dispatch`. Runs `npm version <type>`, syncs `manifest.json`, commits + force-tags, and pushes the tag using a `PAT` secret (needed so the tag push triggers the release workflow).
- **`.github/workflows/release.yml`** — triggered on tag push. Builds, packages a zip, creates a GitHub Release, and uploads `main.js`, `manifest.json`, `styles.css`, and the zip as assets.

The repo already uses conventional commits (`fix:`, `chore:`, `style:`, `docs:`) and keeps a curated prose `CHANGELOG.md`. Tags have **no `v` prefix** (`0.8.0`, `0.7.1`, …). There is no `versions.json`.

## Design

release-please runs on every push to `main` and maintains a standing release PR. The PR bumps the version and prepends generated changelog entries derived from conventional commits since the last release. Merging the PR triggers the tag + GitHub Release, and a build job in the same workflow run attaches the Obsidian assets.

### Decisions

- **Changelog: fully automatic.** release-please owns `CHANGELOG.md`. Entries are generated from commit subjects, grouped by type. Existing curated entries are preserved (release-please only prepends new sections).
- **Replace both existing workflows.** `version.yml` is deleted; `release.yml` is rewritten as the release-please pipeline. The `PAT` secret is no longer required.
- **No `v` prefix on tags** (`include-v-in-tag: false`) — matches existing tag history and Obsidian's requirement that the release tag exactly equals the `manifest.json` version.
- **Default `GITHUB_TOKEN` only.** The build job runs in the same workflow run as the release (gated on the `release_created` output), so there is no cross-workflow trigger problem — which was the only reason the old setup needed a PAT.

### Files

#### 1. `release-please-config.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "include-v-in-tag": false,
  "packages": {
    ".": {
      "release-type": "node",
      "extra-files": [
        {
          "type": "json",
          "path": "manifest.json",
          "jsonpath": "$.version"
        }
      ]
    }
  }
}
```

`release-type: node` bumps `package.json` and `package-lock.json` and generates the changelog. The `extra-files` entry keeps `manifest.json`'s `version` field in sync.

#### 2. `.release-please-manifest.json`

```json
{
  ".": "0.8.0"
}
```

Seeds the current released version so release-please bootstraps correctly.

#### 3. `.github/workflows/release.yml` (rewritten)

```yaml
name: Release
on:
  push:
    branches:
      - main

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
      tag_name: ${{ steps.release.outputs.tag_name }}
    steps:
      - uses: googleapis/release-please-action@v4
        id: release

  build:
    needs: release-please
    if: ${{ needs.release-please.outputs.release_created }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Package
        env:
          TAG: ${{ needs.release-please.outputs.tag_name }}
        run: |
          mkdir ${{ github.event.repository.name }}
          cp main.js manifest.json styles.css README.md ${{ github.event.repository.name }}
          zip -r "${{ github.event.repository.name }}-${TAG}.zip" ${{ github.event.repository.name }}
      - name: Upload release assets
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAG: ${{ needs.release-please.outputs.tag_name }}
        run: |
          gh release upload "${TAG}" \
            main.js manifest.json styles.css "${{ github.event.repository.name }}-${TAG}.zip" \
            --clobber
```

The `build` job checks out the merge commit of the release PR, which already contains the bumped `manifest.json`, so the attached `manifest.json` carries the new version. The zip asset keeps the tagged name (`cooklang-obsidian-<tag>.zip`) for parity with the previous release workflow.

#### 4. Delete `.github/workflows/version.yml`

The manual bump is fully replaced.

## Out of scope

- **`versions.json`** (Obsidian compatibility map) is not maintained in this repo today and is left as-is. If community-store submission later needs it, release-please can be extended with a `generic` updater for it.
- The `PAT` repository secret becomes unused; removing it from repo settings is a manual housekeeping step, not part of this change.

## Expected first run

release-please bootstraps from the seeded `0.8.0`. Its first PR will include all conventional commits since `0.8.0` — currently one (`fix: use 1-based step image numbering to match cookcli`) — producing a `0.8.1` patch release.

## Testing / verification

- Validate YAML and JSON syntax of the new files.
- After merge to `main`, confirm release-please opens a release PR proposing `0.8.1` with a generated changelog entry.
- Merging that PR should: create tag `0.8.1`, create the GitHub Release, and attach `main.js`, `manifest.json` (version `0.8.1`), `styles.css`, and the zip.
