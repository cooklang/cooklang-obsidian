# Changelog

## Unreleased

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
