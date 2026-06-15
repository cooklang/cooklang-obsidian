# Rich Cooklang Preview Redesign — Design

**Date**: 2026-06-15
**Project**: cooklang-obsidian
**Status**: Approved layout (visual mockup), pending spec review

---

## Goal

Bring the Cooklang preview view up to the richness of the cook.md share page — a single,
polished page that surfaces everything in a recipe — while staying **native to Obsidian**
(theme CSS variables, accent color, native fonts; no imported brand palette/fonts).

This is a **preview overhaul only**. The source/preview toggle, CodeMirror editor, timer
service, and parser layer are unchanged.

## Non-Goals

- No change to the source (editor) mode or the `.cook` file format.
- No screen wake-lock / "cook mode" lock (can be a later addition).
- No new parser; we use the existing `@cooklang/cooklang-ts` WASM parser as-is.
- No print/export view.

---

## Approved Visual Target

A single scrolling preview composed of:

1. **Hero** — recipe title, description, and meta **pills** (total time, servings,
   difficulty, source, course/cuisine/diet when present) plus tag pills. Replaces the
   current flat metadata key/value list. **Title image** shown prominently beside/above
   the hero text (as on the cook.md page).
2. **Sticky utility bar** — section jump-links (`Ingredients` · `Steps`) and a live
   **servings stepper** `[ − N servings + ]`.
3. **Two-column body** (wide panes):
   - Left: sticky **ingredient checklist** with scaled quantities, grouped by Cooklang
     section when sections are named.
   - Right: **steps** with section headers, **note callouts**, inline highlighted
     ingredients/cookware, tappable timer chips, **per-step images**, and **current-step**
     highlighting.
4. On narrow panes the columns collapse to one (ingredients, then steps). Sticky bar and
   scaler remain.

All colors derive from Obsidian variables so the view adapts to any theme (light/dark/custom).

---

## Data Model (already available — no parser work)

The `CooklangRecipe` from `@cooklang/cooklang-ts` already exposes everything needed:

- Typed metadata: `title`, `description`, `tags: Set`, `author`, `source`, `time`,
  `servings`, `difficulty`, `cuisine`, `diet`, `course`, `images`, `custom_metadata`,
  `rawMetadata`.
- `sections: Section[]`, each with `name?` and `content` (steps **and** text/notes).
- `groupedIngredients`, `ingredients`, `cookware`, `timers`, plus display helpers
  (`ingredient_display_name`, `quantity_display`, …).
- **Scaling is native**: `parserService.parse(data, scale)` re-parses with quantities
  (including inline step quantities) rescaled by the WASM parser.

The current `getSteps()` flattens all sections and drops section names + text notes. The
redesign reads `recipe.sections` directly so sections and notes are surfaced.

---

## Architecture

Keeps the existing `renderers/` + `services/` pattern. `CookView` stays the orchestrator.

### CookView state additions

- `scale: number` (default 1) — current servings multiplier.
- `currentStep: number` (default 0) — index of the active step for cook tracking.
- `checkedIngredients` is **re-keyed by ingredient name only** (not name+displayText), so
  re-parsing on scale change preserves checked state.
- `scale` and `currentStep` persisted via `getState()`/`setState()` alongside the existing
  `mode`, so reopening a recipe restores the cooking session.

### Rendering flow

```
CookView.renderPreview()
  → parserService.parse(data, scale)          // rescaled recipe
  → PreviewRenderer.render(recipe, el, file, state, callbacks)
       HeroRenderer            → title, description, meta pills, main image
       ScalerBarRenderer       → sticky nav links + servings stepper
       layout container (.cook-cols)
         IngredientListRenderer → section-grouped checklist, scaled qty
         MethodStepsRenderer    → sections, notes, inline parts, step tracking
```

Callbacks passed down from `CookView`:
- `onScaleChange(scale)` → updates `scale`, re-parses, re-renders.
- `onIngredientToggle()` → re-renders (as today).
- `onStepActivate(index)` → updates `currentStep`, re-renders.

### Components

| Module | Status | Responsibility |
|--------|--------|----------------|
| `PreviewRenderer` | rewritten | Layout orchestration: hero → bar → two columns. Honors layout settings. |
| `HeroRenderer` | **new** | Title, description, meta pills, tags, **title image**. |
| `ScalerBarRenderer` | **new** | Sticky bar: section links + servings stepper. Hidden if no numeric servings. |
| `IngredientListRenderer` | updated | Section-grouped list; scaled quantities; name-keyed checkboxes. |
| `MethodStepsRenderer` | updated | Iterate `recipe.sections`: section bands, note callouts, numbered steps, inline parts, **per-step images**, current-step highlight, tap-to-activate. |
| `CookwareListRenderer` | updated | Render as a compact block within the ingredients column (or hidden per setting). |
| `TimerListRenderer` | kept | Standalone timers list (setting-gated, as today). |
| `MetadataRenderer` | repurposed | "More details" collapsible for leftover custom metadata not shown as pills. |

### Section grouping helper

Add a `getSections(recipe)` helper in `recipeHelpers.ts` that returns, per section:
`{ name?, steps: Step[], notes: string[], ingredients: FlatIngredient[] }`, deriving each
section's ingredient subset from the parts referenced in that section's steps. Used by both
the ingredient and step renderers so grouping is consistent. `getSteps()` stays for
backward compatibility / single-section recipes.

---

## Images

Follows the [Cooklang picture convention](https://cooklang.org/docs/spec/#adding-pictures),
already partly supported by `utils/imageHelpers.ts`:

- **Title image** — sibling file with the same basename as the recipe (`Recipe.jpg`).
  Rendered in the hero (returned today by `findRecipeImages().mainImage`).
- **Step images** — sibling file indexed by **0-based step number**: `Recipe.0.jpg` for the
  first step, `Recipe.1.png` for the second, etc. Rendered inside the matching step block.
- Resolve image URLs with `app.vault.getResourcePath(file)` (as the current main image does).
- Step images are matched by parsing the numeric suffix segment of each related image's
  basename (`<recipeBasename>.<n>.<ext>`), so non-numeric suffixes (e.g. `Recipe.banner.jpg`)
  are not mistaken for step images.

Add `getStepImage(file, stepIndex, allImages)` to `imageHelpers.ts` (pure lookup over the
`allImages` array `findRecipeImages` already returns). Gated by the existing `showImages`
setting — off → no title or step images.

## Inline highlight colors

- Ingredients and cookware remain visually distinct.
- Use Obsidian semantic vars: ingredients `var(--color-green)`, cookware
  `var(--color-orange)`, with `var(--text-accent)` fallback via CSS `var(x, fallback)`.
- Gated by the existing `highlightIngredientCookware` setting (off → inherit normal text,
  only weight/underline to mark them).

---

## Servings scaler behavior

- Base servings = numeric value of `recipe.servings` (fallback 1; bar hidden if no servings
  metadata at all).
- Stepper `−`/`+` adjusts an integer servings count; `scale = targetServings / baseServings`.
- On change: `onScaleChange` re-parses with the new scale and re-renders. Quantities in the
  ingredient list and inline in steps update together (parser handles both).
- Non-numeric quantities (e.g. "a pinch") pass through unscaled — parser behavior.

---

## Responsiveness

- `previewEl` gets `container-type: inline-size`; `.cook-cols` uses a `@container` query:
  two columns above a breakpoint (~600px), one column below. Works in narrow sidebars,
  split panes, and on mobile (`isDesktopOnly: false`).
- Sticky elements use `position: sticky` scoped within the scroll container.

---

## Settings

All existing settings are still honored: `showImages`, `showIngredientList`,
`showCookwareList`, `showTimersList`, `showTotalTime`, `showTimersInline`,
`showQuantitiesInline`, `highlightIngredientCookware`, and all `*Label` strings.

New settings (each defaulting to the rich behavior, with an off path to the old simple stack):

- `showServingsScaler: boolean` (default true) — show the stepper + rescaling.
- `twoColumnLayout: boolean` (default true) — sticky ingredients beside steps; off → stacked.
- `enableStepTracking: boolean` (default true) — tap-to-activate current-step highlighting.

Labels for new UI (`servingsLabel`, etc.) follow the existing label-setting pattern.

---

## Styling

- All new CSS in `src/styles.scss`, scoped under `.cook-preview-view`.
- Only Obsidian variables: `--background-primary/secondary`, `--background-modifier-border`,
  `--text-normal/muted/faint`, `--text-accent`, `--interactive-accent`, `--color-green/orange`,
  `--radius-*`, `--size-*`. No hardcoded hex brand colors, no custom font imports.
- Pills reuse Obsidian tag/badge styling conventions.

---

## Edge Cases

- **No metadata** → no hero pills; title falls back to file basename.
- **No servings** → scaler hidden; layout otherwise unchanged.
- **Single unnamed section** → no section bands; renders as a flat list + steps (current behavior, prettier).
- **Parse failure** → existing behavior (no recipe → nothing rendered); preview shows raw nothing rather than crashing.
- **Text-only content blocks** between steps → rendered as note callouts.
- **Scale + checked ingredients** → checks preserved (name-keyed); quantities update.
- **Mobile** → single column; sticky bar/scaler usable with touch.
- **Step images** → step with no matching numbered image renders text only; numbering is
  0-based against the visible step sequence (notes/text blocks don't consume an index).
- **Missing title image** → hero renders text-only, no empty image box.

---

## Testing / Verification

- Manual verification in Obsidian (desktop + a narrow pane) using sample recipes:
  multi-section recipe, recipe with notes, recipe without servings, recipe without metadata.
- Verify: scaler updates both list and inline quantities; checklist survives scaling; section
  grouping correct; light + dark + a custom theme all look native; settings toggles fall back
  to the simple stack.
- No automated test harness exists in the repo today; add lightweight unit tests for the new
  `getSections()` helper if a test runner is introduced (out of scope otherwise).

---

## Rollout

Incremental, each step independently shippable:

1. `getSections()` helper + name-keyed ingredient checks (no visual change).
2. `HeroRenderer` + meta pills + title image (replaces metadata list).
3. CSS two-column layout + container query.
4. `ScalerBarRenderer` + scale state/re-parse.
5. Section/notes in `IngredientListRenderer` + `MethodStepsRenderer`.
6. Per-step images (`getStepImage` helper) + current-step tracking.
7. New settings toggles + labels.
8. Polish pass across light/dark/custom themes.
