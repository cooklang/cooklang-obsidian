# release-please Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual `version.yml` + tag-triggered `release.yml` workflows with a single release-please pipeline that bumps the version, generates the changelog, tags, creates the GitHub Release, and attaches the Obsidian assets on merge of an auto-generated release PR.

**Architecture:** release-please runs on every push to `main` and maintains a standing release PR. Merging it produces a no-`v` tag (e.g. `0.8.1`) and a GitHub Release; a gated `build` job in the same workflow run builds the plugin and uploads `main.js`, `manifest.json`, `styles.css`, and `cooklang-obsidian-<tag>.zip`. Version is kept in sync across `package.json`, `package-lock.json`, and `manifest.json`.

**Tech Stack:** GitHub Actions, `googleapis/release-please-action@v4` (release-type `node`), `gh` CLI, Node 20.

---

## File Structure

- Create: `release-please-config.json` — release-please configuration (release type, tag format, manifest.json sync).
- Create: `.release-please-manifest.json` — seeds the current released version (`0.8.0`).
- Rewrite: `.github/workflows/release.yml` — release-please job + gated build/upload job.
- Delete: `.github/workflows/version.yml` — manual bump fully replaced.

Verification is JSON/YAML syntax validation plus a structural read-back; there is no application unit test for CI config.

---

### Task 1: Add release-please config and manifest seed

**Files:**
- Create: `release-please-config.json`
- Create: `.release-please-manifest.json`

- [ ] **Step 1: Create `release-please-config.json`**

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

- [ ] **Step 2: Create `.release-please-manifest.json`**

```json
{
  ".": "0.8.0"
}
```

- [ ] **Step 3: Validate both files are well-formed JSON**

Run: `node -e "require('./release-please-config.json'); require('./.release-please-manifest.json'); console.log('ok')"`
Expected: prints `ok` with no error.

- [ ] **Step 4: Confirm the seed matches the current released version**

Run: `node -e "const m=require('./manifest.json'),r=require('./.release-please-manifest.json'); if(m.version!==r['.']) {throw new Error('mismatch: '+m.version+' vs '+r['.'])}; console.log('versions match:', m.version)"`
Expected: prints `versions match: 0.8.0`.

- [ ] **Step 5: Commit**

```bash
git add release-please-config.json .release-please-manifest.json
git commit -m "ci: add release-please config and manifest seed"
```

---

### Task 2: Rewrite the release workflow

**Files:**
- Modify (full rewrite): `.github/workflows/release.yml`

- [ ] **Step 1: Replace the entire contents of `.github/workflows/release.yml`**

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

- [ ] **Step 2: Validate the workflow YAML parses**

Run: `node -e "const fs=require('fs'); const s=fs.readFileSync('.github/workflows/release.yml','utf8'); if(!/release-please-action@v4/.test(s)||!/release_created/.test(s)) throw new Error('content check failed'); console.log('release.yml ok')"`
Expected: prints `release.yml ok`.

> Note: if `python3` with PyYAML or a `yamllint` binary is available, prefer `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/release.yml')); print('valid yaml')"` for a true parse check. The Node check above is the fallback when no YAML parser is installed.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: drive releases with release-please"
```

---

### Task 3: Remove the manual version-bump workflow

**Files:**
- Delete: `.github/workflows/version.yml`

- [ ] **Step 1: Delete the file**

Run: `git rm .github/workflows/version.yml`
Expected: `rm '.github/workflows/version.yml'`.

- [ ] **Step 2: Confirm only the new workflow remains**

Run: `ls .github/workflows`
Expected: lists `release.yml` only (no `version.yml`).

- [ ] **Step 3: Commit**

```bash
git commit -m "ci: remove manual version bump workflow"
```

---

## Post-merge verification (manual, after this lands on `main`)

These cannot be checked locally — confirm them on GitHub after the branch merges:

- [ ] release-please opens a release PR titled for `0.8.1`, with a generated `CHANGELOG.md` entry for `fix: use 1-based step image numbering to match cookcli`, and version `0.8.1` staged in `package.json`, `package-lock.json`, and `manifest.json`.
- [ ] Merging that PR creates tag `0.8.1` (no `v` prefix) and a GitHub Release.
- [ ] The Release has assets: `main.js`, `manifest.json` (version `0.8.1`), `styles.css`, and `cooklang-obsidian-0.8.1.zip`.

## Housekeeping (out of scope, note for the maintainer)

- The `PAT` repository secret is no longer used by any workflow and can be deleted from repo settings.
- No `versions.json` is maintained; unchanged by this work.
