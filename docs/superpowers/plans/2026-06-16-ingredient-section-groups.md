# Group Ingredients by Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in setting that renders the recipe ingredient list grouped by named Cooklang section, aggregating quantities within each section.

**Architecture:** A new pure helper `buildSectionGroups()` turns the section view-models (which already carry `ingredientIndices`) into per-section aggregated ingredient rows. `IngredientListRenderer` branches on the new `groupIngredientsBySection` setting (and only when the recipe has named sections), reusing an extracted `renderRow()` for both the flat and grouped paths. A settings toggle and one CSS rule complete it.

**Tech Stack:** TypeScript, Obsidian Plugin API, Rollup, Vitest, SCSS.

---

### Task 1: `buildSectionGroups` pure helper (TDD)

Groups ingredients per section and aggregates within each section. Pure (depends only on the existing `aggregateIngredients` plus an injected index→input mapper), so fully node-testable.

**Files:**
- Create: `src/utils/ingredientSectionGroups.ts`
- Test:   `src/utils/ingredientSectionGroups.test.ts`

- [ ] **Step 1: Create the feature branch (off `main`)**

Run:
```bash
git checkout -b feat/ingredient-section-groups main
```
Expected: `Switched to a new branch 'feat/ingredient-section-groups'`. (Any untracked planning docs carry over — that's fine.)

- [ ] **Step 2: Write the failing test**

Create `src/utils/ingredientSectionGroups.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { SectionView } from './sectionHelpers';
import type { AggInput } from './ingredientAggregator';
import { buildSectionGroups } from './ingredientSectionGroups';

function section(name: string | null, ingredientIndices: number[]): SectionView {
    return { name, steps: [], notes: [], ingredientIndices };
}

// index -> AggInput (or null for an ingredient that should not be listed)
const INPUTS: Record<number, AggInput | null> = {
    0: { name: 'strawberry', quantityValue: 200, unit: 'g', quantityText: null, note: null, reference: null },
    1: { name: 'sugar', quantityValue: 50, unit: 'g', quantityText: null, note: null, reference: null },
    2: { name: 'cream', quantityValue: 300, unit: 'ml', quantityText: null, note: null, reference: null },
    3: null, // not listable
    4: { name: 'salt', quantityValue: null, unit: null, quantityText: 'a pinch', note: null, reference: null },
    5: { name: 'flour', quantityValue: 100, unit: 'g', quantityText: null, note: null, reference: null },
    6: { name: 'flour', quantityValue: 50, unit: 'g', quantityText: null, note: null, reference: null },
};
const inputForIndex = (i: number): AggInput | null => INPUTS[i] ?? null;

describe('buildSectionGroups', () => {
    it('groups ingredients per section, preserving order', () => {
        const groups = buildSectionGroups(
            [section('Coulis', [0, 1]), section('Panna cotta', [2, 1])],
            inputForIndex,
        );
        expect(groups.map(g => g.name)).toEqual(['Coulis', 'Panna cotta']);
        expect(groups[0].rows.map(r => [r.name, r.displayQty])).toEqual([
            ['strawberry', '200 g'],
            ['sugar', '50 g'],
        ]);
    });

    it('aggregates within each section independently (shared ingredient repeats)', () => {
        const groups = buildSectionGroups(
            [section('Coulis', [0, 1]), section('Panna cotta', [2, 1])],
            inputForIndex,
        );
        // sugar appears in both sections, each with its own per-section amount
        expect(groups[1].rows.map(r => [r.name, r.displayQty])).toEqual([
            ['cream', '300 ml'],
            ['sugar', '50 g'],
        ]);
    });

    it('sums same-name ingredients within one section', () => {
        const groups = buildSectionGroups([section('Dough', [5, 6])], inputForIndex);
        expect(groups[0].rows.map(r => [r.name, r.displayQty])).toEqual([['flour', '150 g']]);
    });

    it('skips sections with no listable ingredients', () => {
        const groups = buildSectionGroups(
            [section('Empty', [3]), section('Coulis', [0])],
            inputForIndex,
        );
        expect(groups.map(g => g.name)).toEqual(['Coulis']);
    });

    it('keeps a null name for the unnamed section and formats text amounts', () => {
        const groups = buildSectionGroups([section(null, [4])], inputForIndex);
        expect(groups).toHaveLength(1);
        expect(groups[0].name).toBeNull();
        expect(groups[0].rows[0]).toMatchObject({ name: 'salt', displayQty: 'a pinch' });
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- ingredientSectionGroups`
Expected: FAIL — cannot resolve import `./ingredientSectionGroups`.

- [ ] **Step 4: Write the implementation**

Create `src/utils/ingredientSectionGroups.ts`:
```ts
/**
 * Builds per-section ingredient groups for the "group ingredients by section"
 * option (#69). Each section's ingredients are aggregated independently (within
 * the section), so a shared ingredient appears under each section it's used in
 * with its own summed amount.
 *
 * Pure: it relies only on aggregateIngredients and an injected `inputForIndex`
 * mapper, so it is unit-testable without the WASM recipe / Obsidian runtime.
 */
import type { SectionView } from './sectionHelpers';
import { aggregateIngredients, type AggInput, type IngredientRow } from './ingredientAggregator';

export interface IngredientGroup {
    /** Section name, or null for the unnamed/default section. */
    name: string | null;
    rows: IngredientRow[];
}

export function buildSectionGroups(
    sections: SectionView[],
    inputForIndex: (index: number) => AggInput | null,
): IngredientGroup[] {
    const groups: IngredientGroup[] = [];
    for (const section of sections) {
        const inputs: AggInput[] = [];
        for (const index of section.ingredientIndices) {
            const input = inputForIndex(index);
            if (input) inputs.push(input);
        }
        const rows = aggregateIngredients(inputs);
        if (rows.length) {
            groups.push({ name: section.name, rows });
        }
    }
    return groups;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- ingredientSectionGroups`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/ingredientSectionGroups.ts src/utils/ingredientSectionGroups.test.ts
git commit -m "feat: add buildSectionGroups helper for per-section ingredients (#69)"
```

---

### Task 2: Branch `IngredientListRenderer` on the setting (extract `renderRow`)

Adds the grouped rendering path and refactors the per-row markup into a shared private method so both paths are DRY. The `render(container, ctx)` signature is unchanged.

**Files:**
- Modify: `src/renderers/IngredientListRenderer.ts` (replace the whole file)

- [ ] **Step 1: Replace the file contents**

Overwrite `src/renderers/IngredientListRenderer.ts` with:
```ts
/**
 * IngredientListRenderer — the recipe's ingredient checklist.
 *
 * By default rows are merged across the whole recipe by name and quantities
 * summed per unit (see aggregateIngredients); recipe references render as links
 * to the target recipe. Quantities reflect the already-scaled recipe (CookView
 * re-parses with scale). Checkboxes are keyed by ingredient name so scaling /
 * re-render preserves state.
 *
 * When `groupIngredientsBySection` is enabled and the recipe has named sections,
 * ingredients are instead grouped under each section's title and aggregated
 * within that section (#69).
 */
import { App } from 'obsidian';
import { CooklangSettings } from '../settings';
import {
    ingredient_should_be_listed,
    ingredient_display_name,
    quantity_display,
} from '../recipeHelpers';
import { numericFromQuantity } from '../utils/quantityValue';
import {
    aggregateIngredients,
    type AggInput,
    type IngredientRow,
} from '../utils/ingredientAggregator';
import { getSections, hasNamedSections } from '../utils/sectionHelpers';
import { buildSectionGroups } from '../utils/ingredientSectionGroups';
import { renderReferenceLink } from './referenceLink';
import type { RenderContext } from './types';

export class IngredientListRenderer {
    constructor(private app: App, private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext): void {
        if (!this.settings.showIngredientList) return;

        const inputForIndex = (index: number): AggInput | null => {
            const ing = ctx.recipe.ingredients[index];
            if (!ing || !ingredient_should_be_listed(ing)) return null;
            return this.toAggInput(ing);
        };

        // Grouped path: only when enabled AND the recipe actually has named sections.
        if (this.settings.groupIngredientsBySection) {
            const sections = getSections(ctx.recipe);
            if (hasNamedSections(sections)) {
                const groups = buildSectionGroups(sections, inputForIndex);
                if (!groups.length) return;
                const region = this.createRegion(container);
                for (const group of groups) {
                    if (group.name) {
                        region.createEl('div', { cls: 'cook-ing-group-title', text: group.name });
                    }
                    const ul = region.createEl('ul', { cls: 'cook-ing-list' });
                    for (const row of group.rows) this.renderRow(ul, row, ctx);
                }
                return;
            }
        }

        // Flat combined list (default).
        const inputs: AggInput[] = ctx.recipe.ingredients
            .filter((ing: any) => ingredient_should_be_listed(ing))
            .map((ing: any) => this.toAggInput(ing));
        const rows = aggregateIngredients(inputs);
        if (!rows.length) return;

        const region = this.createRegion(container);
        const ul = region.createEl('ul', { cls: 'cook-ing-list' });
        for (const row of rows) this.renderRow(ul, row, ctx);
    }

    private createRegion(container: HTMLElement): HTMLElement {
        const region = container.createDiv({ cls: 'cook-ingredients' });
        region.id = 'cook-ingredients';
        region.createEl('h2', {
            cls: 'cook-section-title',
            text: this.settings.ingredientLabel || 'Ingredients',
        });
        return region;
    }

    private renderRow(ul: HTMLElement, row: IngredientRow, ctx: RenderContext): void {
        const checked = ctx.state.checkedIngredients;
        const isChecked = checked.has(row.name);
        const li = ul.createEl('li', { cls: isChecked ? 'cook-ing done' : 'cook-ing' });
        li.createSpan({ cls: 'cook-ing-box' });

        const nameEl = li.createSpan({ cls: 'cook-ing-name' });
        if (row.reference) {
            renderReferenceLink(this.app, ctx.file, row.reference, nameEl);
        } else {
            nameEl.setText(row.name);
        }

        if (row.displayQty) {
            li.createSpan({ cls: 'cook-ing-qty', text: row.displayQty });
        }

        li.addEventListener('click', (e) => {
            // Ignore clicks on the reference link itself.
            if ((e.target as HTMLElement).closest('a')) return;
            if (checked.has(row.name)) checked.delete(row.name);
            else checked.add(row.name);
            ctx.callbacks.onIngredientToggle();
        });
    }

    private toAggInput(ing: any): AggInput {
        const q = ing.quantity;
        let quantityValue: number | null = null;
        let unit: string | null = null;
        let quantityText: string | null = null;

        if (q) {
            const num = numericFromQuantity(q);
            if (num !== null) {
                quantityValue = num;
                unit = q.unit ?? null; // author's unit ("cups"), not the abbreviated canonical form
            } else {
                // range or text amount — show as-is, don't sum
                quantityText = quantity_display(q);
            }
        }

        return {
            name: ingredient_display_name(ing),
            quantityValue,
            unit,
            quantityText,
            note: ing.note ?? null,
            reference: ing.reference
                ? { name: ing.reference.name, components: ing.reference.components ?? [] }
                : null,
        };
    }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "IngredientListRenderer|ingredientSectionGroups" || echo "no new errors"`
Expected: `no new errors`. (Pre-existing unrelated errors in `node_modules/*` and `src/types.d.ts` are ignored.)

- [ ] **Step 3: Run the full test suite (no regressions)**

Run: `npm test`
Expected: all tests pass (existing 43 + 5 new from Task 1 = 48).

- [ ] **Step 4: Commit**

```bash
git add src/renderers/IngredientListRenderer.ts
git commit -m "feat: render ingredients grouped by section when enabled (#69)"
```

---

### Task 3: Settings field + toggle

**Files:**
- Modify: `src/settings.ts` (add field to `CooklangSettings`; add toggle in `CookSettingsTab.display()`)

- [ ] **Step 1: Add the settings field**

In `src/settings.ts`, the `CooklangSettings` class has the line:
```ts
  highlightIngredientCookware: boolean = false;
```
Immediately AFTER that line, add:
```ts
  groupIngredientsBySection: boolean = false;
```

- [ ] **Step 2: Add the toggle**

In `src/settings.ts`, find the existing "Show ingredient list" setting block:
```ts
    new Setting(containerEl)
      .setName('Show ingredient list')
      .setDesc('Show the list of ingredients at the top of the recipe')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showIngredientList)
        .onChange((value: boolean) => {
          this.plugin.settings.showIngredientList = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));
```
Immediately AFTER that block (after its closing `}));`), insert:
```ts

    new Setting(containerEl)
      .setName('Group ingredients by section')
      .setDesc('List ingredients under each recipe section’s title (only affects recipes that use = Section headers)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.groupIngredientsBySection)
        .onChange((value: boolean) => {
          this.plugin.settings.groupIngredientsBySection = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "settings\.ts" || echo "no new errors in settings.ts"`
Expected: `no new errors in settings.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/settings.ts
git commit -m "feat: add 'Group ingredients by section' setting toggle (#69)"
```

---

### Task 4: Section sub-heading style

**Files:**
- Modify: `src/styles.scss` (append at end)

- [ ] **Step 1: Append the style**

At the end of `src/styles.scss`, add:
```scss
/* Per-section ingredient sub-headings (#69) */
.cook-ing-group-title {
  margin: var(--size-4-3, 12px) 0 var(--size-2-2, 6px);
  font-size: 0.8em;
  font-weight: 700;
  color: var(--text-muted);
}
```

- [ ] **Step 2: Build to compile SCSS + bundle**

Run: `npm run build`
Expected: ends with `created main.js` (rollup WASM-binding warnings are pre-existing and harmless).

- [ ] **Step 3: Commit**

```bash
git add src/styles.scss
git commit -m "style: per-section ingredient sub-heading (#69)"
```
(Note: `main.js` and `styles.css` are gitignored build artifacts — do NOT add them.)

---

### Task 5: Changelog + full verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add the changelog entry**

This branch is off `main`, so `CHANGELOG.md` has no `## Unreleased` section yet — it
starts `# Changelog` then `## 0.7.1`. Insert a new Unreleased block between them.
Replace:
```markdown
# Changelog

## 0.7.1
```
with:
```markdown
# Changelog

## Unreleased

### Added
- New **Group ingredients by section** setting (off by default): when a recipe
  uses `= Section` headers, the ingredient list is split under each section's
  title, with quantities aggregated within each section (#69).

## 0.7.1
```
(If the #73 branch has merged first and an `## Unreleased` section already exists,
add just the bullet under its `### Added` instead of creating a second section.)

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all pass (48 tests).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: ends with `created main.js`.

- [ ] **Step 4: Manual verification in Obsidian**

In a test vault with this build, create a `.cook` recipe with named sections, e.g.:
```
= Strawberry coulis
Blend @strawberries{200%g} with @sugar{50%g}.

= Panna cotta
Heat @cream{300%ml} with @sugar{30%g} and @gelatin{2%sheets}.
```
Then:
- With **Group ingredients by section** OFF: confirm a single combined ingredient list (sugar merged to one row, 80 g).
- Turn the setting ON: confirm two sub-lists — "Strawberry coulis" (strawberries 200 g, sugar 50 g) and "Panna cotta" (cream 300 ml, sugar 30 g, gelatin 2 sheets); sugar appears under both with its per-section amount.
- A single-section recipe looks identical with the setting ON or OFF.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog for group-ingredients-by-section (#69)"
```

---

## Notes for the implementer

- **Do not change** `aggregateIngredients`, `getSections`, or `sectionHelpers` — they're reused as-is. `getSections` already populates `SectionView.ingredientIndices` (unique, first-seen order) which is exactly what `buildSectionGroups` consumes.
- The grouped path intentionally engages only when `groupIngredientsBySection` is true AND `hasNamedSections(sections)` is true; everything else falls through to the unchanged flat list.
- Pre-existing `tsc` errors in `node_modules/*` and `src/types.d.ts` (duplicate `CodeMirror`, missing WASM enum types) are unrelated — only check for NEW errors in the files you touch.
- The markdown embed (`MarkdownRecipeRenderer`) reuses this renderer and `embedSettings` does not override the new flag, so embeds honor the setting automatically — no embed changes needed.
