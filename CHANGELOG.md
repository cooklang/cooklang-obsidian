# Changelog

## [0.8.1](https://github.com/cooklang/cooklang-obsidian/compare/0.8.0...0.8.1) (2026-06-29)


### Bug Fixes

* correct servings scaling factor and reachable targets ([#83](https://github.com/cooklang/cooklang-obsidian/issues/83)) ([405d72c](https://github.com/cooklang/cooklang-obsidian/commit/405d72c5882c6f39afd03643dcdce1a5bd9c2efe))
* correct servings scaling factor and reachable targets ([#83](https://github.com/cooklang/cooklang-obsidian/issues/83)) ([61b0227](https://github.com/cooklang/cooklang-obsidian/commit/61b022709fa09b60220a3b449573417072876ce1))
* use 1-based step image numbering to match cookcli ([dbcb806](https://github.com/cooklang/cooklang-obsidian/commit/dbcb8063ff902d6105c4a0198ee33d3f59e4c878)), closes [#80](https://github.com/cooklang/cooklang-obsidian/issues/80)

## 0.8.0

### Added
- ` ```cook ` (and ` ```cooklang `) fenced code blocks inside markdown notes now
  render as a compact, read-only recipe — ingredients list plus numbered steps —
  in reading mode (#73).
- New **Group ingredients by section** setting (off by default): when a recipe
  uses `= Section` headers, the ingredient list is split under each section's
  title, with quantities aggregated within each section (#69).

### Fixed
- Clicking a running timer in the recipe preview no longer starts a second
  countdown; repeat clicks while a timer is counting down are ignored, fixing the
  erratic display caused by overlapping intervals (#74).
- Ingredient, cookware, and timer names with umlauts or accents (e.g. `@Möhre`,
  `#Schäler`) are now fully highlighted in the editor instead of being cut off at
  the first non-ASCII letter (#29).

## 0.7.1

### Added
- Ingredient list now combines the same ingredient listed multiple times into one
  row, summing quantities that share a unit (different units shown side by side;
  ranges/textual amounts listed as-is).
- Recipe references (`@./Components/Beans`) render as clickable links to the
  referenced `.cook` file — both in the ingredient list and inline in the steps —
  falling back to plain text when the target isn't found.

## 0.7.0

### Added
- Redesigned recipe preview into a single rich page: hero with title image and meta
  pills (time, servings, difficulty, source, tags), a sticky servings scaler that
  rescales quantities live, a two-column ingredients/steps layout, Cooklang section &
  note support, per-step images, and tap-to-track current step. Fully themed via
  Obsidian CSS variables, so it adapts to any theme.
- Ingredients are now a single combined list (CookCLI-style): duplicates are merged
  and their quantities summed (handles fractions and mixed units).
- New settings: **Default view** (open recipes in source or preview), **Servings
  scaler**, **Two-column layout**, **Step tracking**, and a **Servings label**.

### Changed
- Switched the parser dependency from the temporary `@cooklang/cooklang-ts` preview
  build to the published `@cooklang/cooklang` package, so the plugin builds and
  releases reproducibly.

## 0.6.3

### Fixed
- Fixed bug on mobile where all .md files appeared as cooklang recipes after opening a .cook file (#62)

## 0.6.2

## 0.6.1

### Fixed
- Fixed manifest name

## 0.6.0

### Added
- Support for .md files with `recipe: true` frontmatter
- Context menu option to open .md files as recipes
- Mark ingredients as added
