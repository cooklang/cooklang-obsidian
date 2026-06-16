# Render `cook` Code Blocks in Markdown Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render fenced ` ```cook ` (and ` ```cooklang `) blocks inside `.md` notes as a compact, read-only recipe (ingredients list + numbered steps) in reading mode.

**Architecture:** A `registerMarkdownCodeBlockProcessor` in `main.ts` parses the block via the existing singleton `parserService` and hands the recipe to a new `MarkdownRecipeRenderer`. That renderer reuses the existing `IngredientListRenderer` and `MethodStepsRenderer` unchanged, driven by a static `RenderContext` (no-op callbacks, no scaling/tracking) and an embed-specific settings override produced by a pure `embedSettings()` helper.

**Tech Stack:** TypeScript, Obsidian Plugin API, Rollup, Vitest, SCSS, `@cooklang/cooklang` WASM parser.

---

### Task 1: `embedSettings` pure helper (TDD)

Forces the four interactive flags off while inheriting all other user settings, without mutating the shared settings object. Pure and node-testable (no `obsidian` runtime import — uses `import type` and a spread clone, mirroring `src/utils/quantityValue.ts`).

**Files:**
- Create: `src/utils/embedSettings.ts`
- Test: `src/utils/embedSettings.test.ts`

- [ ] **Step 1: Create the feature branch**

Run:
```bash
git checkout -b feat/cook-markdown-codeblock
```
Expected: `Switched to a new branch 'feat/cook-markdown-codeblock'`

- [ ] **Step 2: Write the failing test**

Create `src/utils/embedSettings.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { CooklangSettings } from '../settings';
import { embedSettings } from './embedSettings';

function makeSettings(overrides: Partial<CooklangSettings> = {}): CooklangSettings {
    return {
        showImages: true,
        showIngredientList: true,
        showCookwareList: true,
        showTimersList: false,
        showTotalTime: true,
        showTimersInline: true,
        showQuantitiesInline: false,
        timersTick: true,
        timersRing: true,
        lineWrap: true,
        highlightIngredientCookware: true,
        defaultView: 'source',
        showServingsScaler: true,
        twoColumnLayout: true,
        enableStepTracking: true,
        servingsLabel: '',
        metadataLabel: '',
        ingredientLabel: 'Stuff',
        cookwareLabel: '',
        timersLabel: '',
        methodLabel: 'Steps',
        minutesLabel: '',
        hoursLabel: '',
        ...overrides,
    } as CooklangSettings;
}

describe('embedSettings', () => {
    it('forces interactive/layout flags off for embeds', () => {
        const result = embedSettings(makeSettings());
        expect(result.enableStepTracking).toBe(false);
        expect(result.showTimersInline).toBe(false);
        expect(result.twoColumnLayout).toBe(false);
        expect(result.showImages).toBe(false);
    });

    it('inherits all other user settings unchanged', () => {
        const result = embedSettings(makeSettings());
        expect(result.ingredientLabel).toBe('Stuff');
        expect(result.methodLabel).toBe('Steps');
        expect(result.highlightIngredientCookware).toBe(true);
        expect(result.showQuantitiesInline).toBe(false);
    });

    it('does not mutate the input settings', () => {
        const base = makeSettings();
        embedSettings(base);
        expect(base.enableStepTracking).toBe(true);
        expect(base.showTimersInline).toBe(true);
        expect(base.twoColumnLayout).toBe(true);
        expect(base.showImages).toBe(true);
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- embedSettings`
Expected: FAIL — `Failed to resolve import "./embedSettings"` (file does not exist yet).

- [ ] **Step 4: Write the implementation**

Create `src/utils/embedSettings.ts`:
```ts
/**
 * Returns a clone of the user's settings with the flags that don't make sense
 * for an embedded `cook` block forced off, leaving everything else inherited.
 *
 * Embedded blocks render compact and read-only: no two-column layout, no live
 * timers, no tap-to-track step state, and no per-step image lookup. The input
 * is spread (not mutated) so the shared plugin settings object is untouched.
 *
 * Type-only import of CooklangSettings keeps this node-testable (no `obsidian`
 * runtime dependency), matching the duck-typed pattern in quantityValue.ts.
 */
import type { CooklangSettings } from '../settings';

export function embedSettings(base: CooklangSettings): CooklangSettings {
    return {
        ...base,
        enableStepTracking: false,
        showTimersInline: false,
        twoColumnLayout: false,
        showImages: false,
    };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- embedSettings`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/embedSettings.ts src/utils/embedSettings.test.ts
git commit -m "feat: add embedSettings helper for compact cook embeds (#73)"
```

---

### Task 2: `MarkdownRecipeRenderer`

A single-column orchestrator that renders the compact embed by reusing the existing sub-renderers with a static context. DOM/Obsidian-bound, so it is verified via `tsc` + build rather than a unit test (consistent with the other renderers).

**Files:**
- Create: `src/renderers/MarkdownRecipeRenderer.ts`

- [ ] **Step 1: Write the renderer**

Create `src/renderers/MarkdownRecipeRenderer.ts`:
```ts
/**
 * MarkdownRecipeRenderer — renders a `cook` code block embedded in a markdown
 * note as a compact, read-only recipe: a combined ingredient list followed by
 * numbered method steps. No hero, scaler, two-column layout, or interactivity.
 *
 * It reuses IngredientListRenderer and MethodStepsRenderer unchanged, driven by
 * a static RenderContext (no-op callbacks, scale 1, no checked ingredients, no
 * active step) and the embed settings override. Recipe-reference links resolve
 * relative to the host note (`file`).
 */
import { App, TFile } from 'obsidian';
import type { CooklangRecipe } from '@cooklang/cooklang';
import type { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';
import { getSections } from '../utils/sectionHelpers';
import { embedSettings } from '../utils/embedSettings';
import { IngredientListRenderer } from './IngredientListRenderer';
import { MethodStepsRenderer } from './MethodStepsRenderer';
import type { RenderContext } from './types';

export class MarkdownRecipeRenderer {
    constructor(private app: App, private timerService: TimerService) {}

    public render(
        container: HTMLElement,
        file: TFile | null,
        recipe: CooklangRecipe,
        baseSettings: CooklangSettings,
    ): void {
        container.empty();
        container.addClass('cook-embed');

        const settings = embedSettings(baseSettings);
        const ingredientRenderer = new IngredientListRenderer(this.app, settings);
        const methodStepsRenderer = new MethodStepsRenderer(this.app, settings, this.timerService);

        const ctx: RenderContext = {
            recipe,
            file,
            state: {
                scale: 1,
                baseServings: null,
                displayServings: null,
                checkedIngredients: new Set<string>(),
                currentStep: -1,
            },
            callbacks: {
                onScaleChange: () => {},
                onIngredientToggle: () => {},
                onStepActivate: () => {},
            },
        };

        const sections = getSections(recipe);
        ingredientRenderer.render(container, ctx);
        methodStepsRenderer.render(container, ctx, sections, file, []);
    }
}
```

- [ ] **Step 2: Type-check the new file**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "MarkdownRecipeRenderer|embedSettings" || echo "no new errors"`
Expected: `no new errors` (the pre-existing node_modules / `types.d.ts` errors are unrelated and ignored).

- [ ] **Step 3: Commit**

```bash
git add src/renderers/MarkdownRecipeRenderer.ts
git commit -m "feat: add MarkdownRecipeRenderer for compact cook embeds (#73)"
```

---

### Task 3: Register the code-block processor in `main.ts`

Wire ` ```cook ` and ` ```cooklang ` to the renderer, constructing a plugin-level `TimerService` (required by `MethodStepsRenderer`'s constructor; never used to start countdowns because the embed override turns inline timers off) and disposing it on unload.

**Files:**
- Modify: `src/main.ts` (imports near top; body of `onload`)

- [ ] **Step 1: Add imports**

In `src/main.ts`, the existing first two lines are:
```ts
import './styles.scss'
import { Plugin, WorkspaceLeaf, addIcon, TFile, TFolder, Menu } from 'obsidian';
```
Change the second line and add the new imports directly below the existing `import { CooklangSettings, CookSettingsTab } from './settings'` line so the import group reads:
```ts
import './styles.scss'
import { Plugin, WorkspaceLeaf, addIcon, TFile, TFolder, Menu, MarkdownPostProcessorContext } from 'obsidian';
import { CookView } from './cookView'
import { CooklangSettings, CookSettingsTab } from './settings'
import alarmMp3 from './alarm.mp3';
import timerMp3 from './timer.mp3';
import { parserService } from './services/ParserService';
import { TimerService } from './services/TimerService';
import { MarkdownRecipeRenderer } from './renderers/MarkdownRecipeRenderer';
```

- [ ] **Step 2: Add the error-render helper**

At the bottom of `src/main.ts` (module scope, after the class closing brace), add:
```ts
function renderEmbedError(el: HTMLElement, source: string, message: string): void {
  el.empty();
  const wrap = el.createDiv({ cls: 'cook-embed-error' });
  wrap.createDiv({ cls: 'cook-embed-error-msg', text: message });
  wrap.createEl('pre').createEl('code', { text: source });
}
```

- [ ] **Step 3: Add fields to the plugin class**

In `src/main.ts`, just below the existing `settings: CooklangSettings;` field declaration, add:
```ts
  embedTimerService: TimerService;
  markdownRecipeRenderer: MarkdownRecipeRenderer;
```

- [ ] **Step 4: Register the processor in `onload`**

In `src/main.ts`, the `onload` method currently contains (around line 20-22):
```ts
    // register the view and extensions
    this.registerView("cook", this.cookViewCreator);
    this.registerExtensions(["cook"], "cook");
```
Immediately after the `this.registerExtensions(["cook"], "cook");` line, insert:
```ts

    // Render ```cook / ```cooklang fenced blocks inside markdown notes as a
    // compact, read-only recipe (#73).
    this.embedTimerService = new TimerService(this.settings, {
      tickSoundUrl: timerMp3,
      alarmSoundUrl: alarmMp3,
      tickVolume: 0.3,
      alarmVolume: 0.3,
    });
    this.register(() => this.embedTimerService.dispose());
    this.markdownRecipeRenderer = new MarkdownRecipeRenderer(this.app, this.embedTimerService);

    const renderRecipeBlock = async (
      source: string,
      el: HTMLElement,
      ctx: MarkdownPostProcessorContext,
    ): Promise<void> => {
      if (!source.trim()) {
        el.empty();
        el.createDiv({ cls: 'cook-embed-empty', text: 'Empty recipe block.' });
        return;
      }
      try {
        await parserService.initialize();
      } catch (e) {
        renderEmbedError(el, source, 'Cooklang parser failed to load.');
        return;
      }
      let recipe;
      try {
        [recipe] = parserService.parse(source);
      } catch (e) {
        renderEmbedError(el, source, 'Could not parse this recipe.');
        return;
      }
      const abstract = ctx.sourcePath
        ? this.app.vault.getAbstractFileByPath(ctx.sourcePath)
        : null;
      const file = abstract instanceof TFile ? abstract : null;
      this.markdownRecipeRenderer.render(el, file, recipe, this.settings);
    };

    this.registerMarkdownCodeBlockProcessor('cook', renderRecipeBlock);
    this.registerMarkdownCodeBlockProcessor('cooklang', renderRecipeBlock);
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "main.ts" || echo "no new errors in main.ts"`
Expected: `no new errors in main.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts
git commit -m "feat: render cook/cooklang code blocks in markdown notes (#73)"
```

---

### Task 4: Embed styles

Add minimal spacing for the embed wrapper plus the error/empty states. The ingredient/step/section classes are already styled globally (not scoped under `.cook-rich`), so they apply inside `.cook-embed` automatically.

**Files:**
- Modify: `src/styles.scss` (append at end of file)

- [ ] **Step 1: Append the styles**

At the end of `src/styles.scss`, add:
```scss
/* Embedded ```cook blocks in markdown notes (#73) */
.cook-embed {
  margin: var(--size-4-2, 8px) 0;
}
.cook-embed .cook-section-title {
  margin-top: var(--size-4-3, 12px);
}
.cook-embed-empty {
  color: var(--text-muted);
  font-size: var(--font-ui-small);
  font-style: italic;
}
.cook-embed-error-msg {
  color: var(--text-error);
  font-size: var(--font-ui-small);
  margin-bottom: var(--size-2-2, 6px);
}
```

- [ ] **Step 2: Build to compile SCSS and bundle**

Run: `npm run build`
Expected: ends with `created main.js` (the rollup WASM-binding warnings are pre-existing and harmless).

- [ ] **Step 3: Commit**

```bash
git add src/styles.scss main.js
git commit -m "style: spacing and error states for cook embeds (#73)"
```

---

### Task 5: Changelog + full verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add the changelog entry**

In `CHANGELOG.md`, under the existing `## Unreleased` section, add an `### Added` block above the existing `### Fixed` block so it reads:
```markdown
## Unreleased

### Added
- ` ```cook ` (and ` ```cooklang `) fenced code blocks inside markdown notes now
  render as a compact, read-only recipe — ingredients list plus numbered steps —
  in reading mode (#73).

### Fixed
```
(Leave the existing two `### Fixed` bullets untouched below.)

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all test files pass (the existing 40 tests plus the 3 new `embedSettings` tests = 43).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: ends with `created main.js`.

- [ ] **Step 4: Manual verification in Obsidian**

In a test vault using this build, create a `.md` note containing a fenced block with language `cook`:
````markdown
```cook
Crack the @eggs{3} into a #bowl{} and whisk for ~{2%minutes}.
Add @flour{200%g} and stir.
```
````
Switch to reading mode and confirm:
- an **Ingredients** list shows eggs and flour (with quantities),
- a numbered **Method** shows the two steps with inline ingredient/cookware/timer highlighting and a static `⏱ 2:00` timer (no countdown button),
- changing the block to an obviously malformed recipe shows the error message with the raw text preserved,
- a `cooklang`-tagged block renders identically to a `cook`-tagged one.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog for cook code blocks in markdown (#73)"
```

---

## Notes for the implementer

- **Do not modify** `IngredientListRenderer`, `MethodStepsRenderer`, or `getSections` — they are reused as-is. The no-op callbacks make the existing click handlers inert (they mutate ephemeral state nothing reads/re-renders).
- The pre-existing `tsc` errors in `node_modules/*` and `src/types.d.ts` (duplicate `CodeMirror`, missing WASM enum types) are unrelated to this work — only check that no *new* errors appear in the files you touch.
- `parserService` is the same singleton used by the `.cook` view; calling `initialize()` is idempotent and safe to await on every block render.
