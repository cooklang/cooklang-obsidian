# Render `cook` code blocks in markdown notes (#73)

## Problem

Fenced ` ```cook ` blocks inside regular `.md` notes are not rendered — they
show as raw text. Users want to embed a recipe inside a normal markdown note
(alongside other prose) and have it display as a recipe in reading mode.

Today the plugin only renders recipes for `.cook` files (custom view) and `.md`
files with `recipe: true` frontmatter (whole-file). Neither handles an inline
fenced block within an otherwise-normal note.

## Goal

In reading mode, a ` ```cook ` (and ` ```cooklang `) fenced block renders as a
**compact, read-only** recipe: an ingredients list followed by numbered method
steps. No hero image, no sticky servings scaler, no two-column layout, no
interactive scaling / step-tracking / checkboxes.

Out of scope: editing the block as a recipe, live timers, servings scaling, and
step tracking inside the embed. These remain features of the full `.cook` view.

## Architecture

Three pieces:

### 1. `MarkdownRecipeRenderer` (new — `src/renderers/MarkdownRecipeRenderer.ts`)

A small single-column orchestrator for the compact embed. It reuses the existing
sub-renderers **without modifying them**:

- `IngredientListRenderer.render(container, ctx)`
- `MethodStepsRenderer.render(main, ctx, sections, file, allImages)`

It builds a `div.cook-embed` wrapper and calls the two renderers with:

- A **static** `RenderContext`:
  - `state`: `{ scale: 1, baseServings: null, displayServings: null,
    checkedIngredients: new Set(), currentStep: -1 }`
  - `callbacks`: no-ops (`onScaleChange`, `onIngredientToggle`, `onStepActivate`).
    Because they do nothing, the existing click handlers in the sub-renderers
    mutate ephemeral state that is never read and never re-rendered — i.e. the
    block is effectively static with zero changes to those files.
- An **embed settings override** (see helper below).

`sections` comes from the existing `getSections(recipe)` util. `allImages` is
passed as `[]` (no per-step images in embeds), and `showImages` is overridden
off so `MethodStepsRenderer` never looks for them.

### 2. Embed settings override (pure, unit-tested helper)

A pure function `embedSettings(base: CooklangSettings): CooklangSettings` that
returns a shallow clone with embed-specific flags forced:

```
enableStepTracking: false   // no tap-to-track in a flowing note
showTimersInline:   false   // timers render as plain text, no live countdown
twoColumnLayout:    false   // single column (also enforced by the wrapper)
showImages:         false   // no per-step image lookup against the note basename
```

All other settings/labels (`ingredientLabel`, `methodLabel`,
`highlightIngredientCookware`, `showQuantitiesInline`, etc.) are inherited from
the user's configuration. Cloning (not mutating) avoids touching the shared
plugin settings object.

### 3. Code-block processor (wired in `main.ts` `onload`)

```
this.registerMarkdownCodeBlockProcessor('cook', this.renderRecipeBlock);
this.registerMarkdownCodeBlockProcessor('cooklang', this.renderRecipeBlock);
```

The handler `(source, el, ctx)`:

1. `await parserService.initialize()` — idempotent; covers the case where the
   block renders before the WASM parser has finished initializing.
2. If `source` is blank → render a subtle empty-state message; return.
3. `const [recipe, report] = parserService.parse(source)`. On a thrown
   parse error (or a fatal report), render a subtle inline error **and** the raw
   source in a `<pre>` so the user's content is never lost.
4. Resolve the host note `TFile` from `ctx.sourcePath`
   (`app.vault.getAbstractFileByPath`) so recipe-reference links resolve
   relative to the note's folder.
5. `markdownRecipeRenderer.render(el, file, recipe)`.

The renderer is constructed once in `onload` from `this.app`, `this.settings`,
and a plugin-level `TimerService` (created once; with `showTimersInline` off in
the embed override it is never actually used to attach countdowns, but
`MethodStepsRenderer`'s constructor requires an instance).

## Behavior summary

- **Layout:** Ingredients list, then numbered Method steps, single column. No
  title heading by default (the note supplies its own context).
- **Static:** no scaler, no step tracking, no live checkbox toggle. Inline
  ingredient/cookware/timer highlighting, Cooklang sections, and notes are
  preserved. Timers show as plain text (`⏱ 25:00`).
- **Reference links** (`@./Components/Beans`) resolve relative to the host note
  and stay clickable — navigation, not recipe interactivity.
- **Errors / empty block:** subtle inline message; raw text preserved on error.

## Edge cases

- Parser not yet ready when the block renders → awaited init makes it safe.
- Reading mode re-renders the block on each view → each call rebuilds from
  scratch; no persistent or leaked state (no live timers, no intervals).
- A note with multiple ` ```cook ` blocks → each renders independently.
- An invalid recipe → inline error + raw source, no thrown exception bubbling to
  Obsidian.

## Testing

- **Unit (node/vitest):** `embedSettings()` — asserts the four flags are forced
  off and all other fields pass through unchanged; asserts the input object is
  not mutated. Aggregation/section utils are already covered by existing tests.
- **Not unit-tested (Obsidian/DOM-bound, consistent with the other renderers):**
  `MarkdownRecipeRenderer` and the code-block handler. Verified via `tsc`
  (no new type errors) + `npm run build` + manual check in Obsidian:
  - a ` ```cook ` block renders ingredients + steps in reading mode,
  - inline highlighting and sections appear,
  - a malformed block shows the error + raw text,
  - a recipe reference link navigates to the target note.

## Files touched

- `src/renderers/MarkdownRecipeRenderer.ts` (new)
- `src/utils/embedSettings.ts` (new) + `src/utils/embedSettings.test.ts` (new)
- `src/main.ts` (register processors, construct renderer + TimerService)
- `src/styles.scss` (add `.cook-embed` spacing)
- `CHANGELOG.md` (note the feature under Unreleased)
