# Group ingredients by section (#69)

## Problem

When a recipe is split into named Cooklang sections (`= Strawberry coulis`,
`= Panna cotta`), the preview's ingredient list still shows a single combined
list for the whole recipe. Users want the ingredient list broken into the same
sub-sections — a "sub-recipe" / HelloFresh-style layout — so each part's
ingredients are grouped under its section title.

## Goal

Add an opt-in setting that, when a recipe has named sections, renders the
ingredient list grouped by section: each named section's ingredients under a
sub-heading, aggregated within that section. When the setting is off, or the
recipe has no named sections, the list renders exactly as today (one combined
list).

## Decisions (from brainstorming)

- **Default: off (opt-in).** Existing users keep the current single list until
  they enable grouping in settings.
- **Aggregation: within each section.** Each section's list sums only that
  section's ingredients. An ingredient used in two sections (e.g. sugar in both
  the coulis and the panna cotta) appears under each, with its own per-section
  amount.

## Activation rule

Grouped rendering happens only when **both**:
1. `settings.groupIngredientsBySection` is true, **and**
2. the recipe has at least one named section (`hasNamedSections(sections)`).

Otherwise the renderer falls back to the existing flat combined list. This keeps
single-section recipes and opted-out users completely unaffected.

## Architecture

The change is isolated to the ingredient list. No render-signature changes ripple
to other renderers.

### 1. Pure helper — `src/utils/ingredientSectionGroups.ts`

```
buildSectionGroups(
  sections: SectionView[],
  inputForIndex: (index: number) => AggInput | null,
): IngredientGroup[]
```

where `IngredientGroup = { name: string | null; rows: IngredientRow[] }`.

- Iterates sections in order. For each section, maps every entry in
  `section.ingredientIndices` (already computed first-seen by `getSections`)
  through `inputForIndex`, dropping `null`s (non-listable ingredients).
- Runs the existing `aggregateIngredients(inputs)` on each section's inputs, so
  quantities sum **within** the section.
- `name` is the section's name (or `null` for the unnamed/default section).
- Groups whose `rows` are empty are skipped (a section with no listable
  ingredients produces no heading).

Pure: depends only on `aggregateIngredients` and the injected mapper, so it is
unit-tested with a fake mapper and fabricated `SectionView`s (no WASM/Obsidian).

### 2. `IngredientListRenderer` — branch on the setting

`render(container, ctx)` signature is unchanged. Inside:

- Build a reusable `inputForIndex(i)`:
  `const ing = ctx.recipe.ingredients[i]; return ingredient_should_be_listed(ing) ? this.toAggInput(ing) : null;`
- If `this.settings.groupIngredientsBySection` is true, compute
  `const sections = getSections(ctx.recipe)` (pure, cheap — keeps the change
  local) and, when `hasNamedSections(sections)`, render grouped:
  - the existing `<h2 class="cook-section-title">Ingredients</h2>` header once,
  - then for each group: an optional `<div class="cook-ing-group-title">` with
    the section name (omitted when `name` is null), followed by a
    `<ul class="cook-ing-list">` of rows.
- Otherwise render the current flat list.
- The per-row markup (checkbox span, name / reference link, quantity span, and
  the toggle click handler) is extracted into a private `renderRow(ul, row, ctx)`
  used by **both** the flat and grouped paths (DRY). Behavior of a row is
  identical to today.

### 3. Settings — `src/settings.ts`

- Add field: `groupIngredientsBySection: boolean = false;` to `CooklangSettings`.
- Add a toggle in `CookSettingsTab.display()` near the other ingredient/preview
  toggles:
  - Name: "Group ingredients by section"
  - Desc: "List ingredients under each recipe section's title (only affects
    recipes that use `= Section` headers)"
  - `onChange`: set the field, `saveData(settings)`, `reloadCookViews()` — same
    pattern as the existing toggles.

### 4. Styles — `src/styles.scss`

Add one rule for the per-section sub-heading, e.g.:
```scss
.cook-ing-group-title {
  margin: var(--size-4-3, 12px) 0 var(--size-2-2, 6px);
  font-size: 0.8em;
  font-weight: 700;
  color: var(--text-muted);
}
```

## Reach into the markdown embed

`MarkdownRecipeRenderer` reuses `IngredientListRenderer`, and `embedSettings`
does **not** override `groupIngredientsBySection`. So embedded `cook` blocks honor
the user's grouping choice automatically — no special-casing.

## Edge cases

- Recipe with only the default unnamed section → `hasNamedSections` is false →
  flat list (grouping never engages).
- A named section that references no listable ingredients → produces no group
  (skipped), so no empty heading.
- An unnamed (intro) section alongside named ones → its rows render first with no
  sub-heading; named sections follow with headings.
- Same ingredient name appearing in two sections → appears in both groups; the
  ingredient checkbox state is keyed by name only, so checking it in one group
  reflects in the other. Acceptable.

## Testing

- **Unit (node/vitest):** `buildSectionGroups`
  - groups ingredients by section using `ingredientIndices`,
  - aggregates within each section (shared ingredient appears per section with
    its own summed amount),
  - skips groups with no listable rows,
  - returns `name: null` for the unnamed section,
  - preserves section order.
  - `aggregateIngredients` is already covered by existing tests.
- **Not unit-tested (DOM/Obsidian-bound):** `IngredientListRenderer` changes and
  the settings toggle. Verified via `tsc` (no new errors in touched files) +
  `npm run build` + manual check in Obsidian:
  - a multi-section recipe with grouping ON shows per-section ingredient
    sub-lists with headings,
  - the same recipe with grouping OFF shows the single combined list,
  - a single-section recipe looks identical regardless of the setting,
  - an embedded ```cook block with named sections honors the setting.

## Files touched

- `src/utils/ingredientSectionGroups.ts` (new) + `src/utils/ingredientSectionGroups.test.ts` (new)
- `src/renderers/IngredientListRenderer.ts` (modify: extract `renderRow`, add grouped path)
- `src/settings.ts` (new field + toggle)
- `src/styles.scss` (`.cook-ing-group-title`)
- `CHANGELOG.md` (note under Unreleased / Added)
