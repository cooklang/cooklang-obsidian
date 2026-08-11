# AGENTS.md

## Scope and source of truth

These instructions apply to the entire repository.

Use the current source, tests, and build configuration as the source of truth. The files under `docs/superpowers/`, plus root-level `plan.md` and `research.md`, are historical design material and can be stale. In particular, `README.md`, old design notes, and `test-recipes/curry.0.png` still show a zero-based step-image example; the current implementation, tests, and changelog use one-based names.

## Project overview

Cooklang Editor is a TypeScript Obsidian plugin for editing and rendering Cooklang recipes. It supports `.cook` files, Markdown files whose frontmatter contains the Boolean `recipe: true`, and fenced `cook`/`cooklang` blocks rendered by a Markdown reading-mode postprocessor. Rollup produces a CommonJS Obsidian bundle from `src/main.ts`.

- Runtime baseline: Obsidian 1.8.0 or newer.
- Supported platforms: desktop and mobile (`isDesktopOnly` is `false`). Do not add Node-only runtime assumptions.
- Package manager: npm with `package-lock.json`.
- CI runtime: Node 20.x.

## Setup and commands

Use Node 20.x to match CI.

| Task | Command | Notes |
| --- | --- | --- |
| Reproducible install | `npm ci` | Preferred when using the existing lockfile. |
| Add or update dependencies | `npm install` | Commit the resulting `package-lock.json` change. |
| Development build/watch | `npm run dev` | Rebuilds with Rollup on changes. |
| Full test suite | `npm test` | Runs Vitest once in the Node environment. |
| Focused test | `npm test -- src/utils/scaling.test.ts` | A filename or Vitest filter is acceptable. |
| Test watch mode | `npm run test:watch` | Interactive local use. |
| Production/type gate | `npm run build` | Runs Rollup with TypeScript `noEmitOnError`; emits `main.js` and `styles.css`. |

There is no source lint or formatting command. Do not claim one was run, and do not reformat unrelated code. A standalone `tsc --noEmit` is not the authoritative gate and can expose declaration/dependency errors outside the Rollup build; use `npm run build` for project validation.

The misspelled `instal-deps` package script is legacy and is not the canonical setup command.

## Repository map

- `src/main.ts`: plugin lifecycle, settings loading, view/extension registration, commands, menus, Markdown code-block processors, and `recipe: true` auto-detection.
- `src/cookView.ts`: the `TextFileView`, CodeMirror editor, source/preview switching, per-view checklist state, persisted mode/scale/current-step state, and rich-preview entry point.
- `src/services/ParserService.ts`: singleton initialization and access to the Cooklang WASM parser.
- `src/services/TimerService.ts`: timer intervals, Howler audio, notices, and cleanup.
- `src/renderers/`: focused Obsidian DOM renderers. `PreviewRenderer` composes the full recipe; `MarkdownRecipeRenderer` composes compact fenced-block output. Shared state and callbacks live in `renderers/types.ts`.
- `src/utils/`: mostly pure transformations and view models, with colocated `*.test.ts` files.
- `src/mode/cook/`: CodeMirror `StreamLanguage` highlighting and its tests.
- `src/settings.ts`: settings defaults and the Obsidian settings UI.
- `src/styles.scss`: editor, full-preview, and Markdown-embed styling.
- `test-recipes/`: fixtures for manual testing in Obsidian.
- `manifest.json`, `rollup.config.js`, `vitest.config.ts`, and `tsconfig.json`: runtime and build configuration.

The two rendering flows are:

```text
`.cook` or whole-file Markdown recipe
  -> CookPlugin registration
  -> ParserService.initialize() / parse()
  -> CookView interactive state
  -> PreviewRenderer -> focused child renderers
  -> Obsidian DOM and vault APIs

fenced `cook` / `cooklang` block in Markdown reading mode
  -> registered code-block processor
  -> ParserService.initialize() / parse()
  -> MarkdownRecipeRenderer static context
  -> IngredientListRenderer + MethodStepsRenderer
  -> Obsidian DOM and vault APIs
```

## Architecture contracts

- Keep `ParserService` a singleton and keep initialization idempotent. The WASM bindings use shared global state; creating independent parser/WASM instances can corrupt it. Await `initialize()` before parsing in flows that may run before plugin startup completes.
- `CookView` owns interactive full-preview state. Pass state and callbacks through `RenderContext`; focused renderers should not become competing state owners. Interactions normally update `CookView` and trigger a full preview render.
- Only `mode`, `scale`, and `currentStep` are persisted in leaf state. Checked ingredients and active timers are in-memory session state and are cleared during view cleanup.
- Scaling intentionally parses twice: parse with the current scale for displayed quantities, and parse unscaled data to derive base servings. Never derive base servings from an already scaled recipe.
- Section step tracking uses one global zero-based index across the recipe. Step-image filenames are one-based: `Recipe.1.jpg` is the first step. Convert between them explicitly where needed.
- Recipe images are siblings of the recipe. The main image shares its basename; step images add a numeric suffix. Use `app.vault.getResourcePath()` for display URLs.
- Recipe references resolve relative to their source recipe or, for fenced blocks, the host Markdown note. They prefer `.cook` and may fall back to `.md` only when its frontmatter has the Boolean `recipe: true`.
- Markdown embeds inherit most user settings, but `embedSettings()` deliberately disables images, live timers, step tracking, and the two-column layout without mutating the shared settings object.
- Preserve navigation behavior for frontmatter-detected Markdown recipes: the transient view switch uses `sync: true` so Back returns to the previous note.
- Dispose timers/intervals and audio resources, destroy editors, and unregister lifecycle resources through Obsidian APIs.
- Keep the Rollup WASM plugin before the other plugins and preserve synchronous handling of `cooklang_wasm_bg.wasm`. Keep `obsidian` and `codemirror` external unless a packaging change explicitly requires otherwise.

## Implementation conventions

- Follow the surrounding file's style; the repository is not uniformly formatted. Newer TypeScript generally uses four-space indentation, single quotes, PascalCase class files, and camelCase utility files.
- Preserve the compiler guarantees in `tsconfig.json`, especially `noImplicitAny`, `strictNullChecks`, and `isolatedModules`; prefer precise types over adding new `any` values.
- Put calculations, parser-shape normalization, ordering, and path matching in pure utilities. Use type-only imports or small generic/duck-typed shapes so those utilities remain runnable under Node-based Vitest.
- Preserve Cooklang parser order and first-seen ordering unless a feature explicitly requires sorting. Several tests rely on these semantics.
- Keep DOM composition in renderers. Prefer Obsidian helpers such as `createDiv`, `createEl`, `createSpan`, `appendText`, and `empty` over HTML strings.
- Keep render markup and selectors synchronized. Prefix new plugin classes with `cook-`, scope preview/embed styles appropriately, use Obsidian semantic CSS variables, and retain narrow-pane/mobile behavior through container-responsive styles.
- A new render-affecting setting normally requires a typed default in `CooklangSettings`, a settings control, `saveData`, refresh of open cook views, and an explicit decision about behavior in Markdown embeds.
- Avoid broad edits to the legacy `src/lib/codemirror.js` stub; current syntax support lives in `src/mode/cook/` and CodeMirror 6 packages.
- Preserve the README's privacy promise. Do not introduce telemetry, data collection, or outbound network behavior without an explicit product decision and matching documentation.

## Mobile WebView compatibility

- Treat iOS WKWebView and Android WebView as first-class runtimes. Prefer semantic `button`, `a`, `input`, `label`, `details`, and `summary` elements so keyboard, touch, assistive technology, and synthesized click behavior share one path.
- Use `click` or `change` for discrete actions. Reserve pointer events for continuous gestures such as sliders, and do not add parallel touch and mouse handlers for the same interaction.
- Do not synchronously remove, replace, or rerender an active pointer target from its `pointerup` or `pointercancel` handler. Range inputs can use implicit pointer capture; release capture when present and defer teardown until a later task so Android WebView can finish pointer cleanup and restore scrolling.
- Decide gesture ownership explicitly for controls embedded in host apps. When a horizontal range must win over host-level swipe navigation, give it `touch-action: none`, capture the pointer on `pointerdown`, and stop propagation for its complete pointer stream. Svelte 5 delegates declarative pointer handlers, so use a component action with native element listeners when propagation must stop before reaching an Obsidian ancestor. Obsidian mobile can also observe legacy touch events; isolation-only touch listeners may stop those events without duplicating the pointer-driven action logic. The deliberate tradeoff is that a gesture beginning on the control adjusts it and cannot scroll the page. Initialize new ranges at an interior, step-aligned value when possible as an additional safeguard.
- Give custom controls coarse-pointer hit areas of at least 48 CSS pixels where layout permits. Keep their visible glyphs compact with padding, and preserve spacing between adjacent actions. Scope hover-only feedback to `(hover: hover) and (pointer: fine)` and provide `:active` feedback for touch.
- Include both `appearance: none` and `-webkit-appearance: none` when replacing native form-control styling. Keep focus-visible outlines, accessible names, and keyboard behavior intact.
- Programmatic focus after a reactive render should use `{ preventScroll: true }` with a fallback, especially for popovers and range inputs. Avoid `aria-live` on values that update every second or continuously while dragging; the control's accessible name or `aria-valuetext` should expose the current value without flooding VoiceOver or TalkBack.
- Avoid viewport-width sizing inside padded panes; prefer container-relative `width: 100%`, `max-width: 100%`, and `box-sizing: border-box`. Lazy-load below-the-fold step images to reduce memory and decoding pressure on mobile.

## Testing and definition of done

- Add or update a colocated `*.test.ts` when changing pure behavior. Vitest discovers `src/**/*.test.ts`.
- Avoid runtime imports from `obsidian` in Node tests. Extract pure logic instead of trying to instantiate Obsidian views in Vitest.
- Run the narrowest relevant test while iterating, then run `npm test` and `npm run build` before handing off a code change.
- DOM, lifecycle, or CSS changes also need proportionate manual verification in Obsidian because there is no automated Obsidian integration suite. Rebuild, reload/re-enable the plugin, and check the affected source/preview flow. For layout changes, check light and dark themes plus a narrow pane/mobile-sized view; for shared renderers, also check fenced Markdown embeds.
- For touch interaction changes, manually verify both iOS and Android when devices are available: confirm range sliders open at their midpoint, every gesture beginning on the slider adjusts it without scrolling or host navigation, gestures beginning outside it still scroll, pointer cancellation leaves the selector usable, tap every adjacent action, rotate the device, and confirm VoiceOver/TalkBack does not announce continuous timer ticks.
- A local manual setup can symlink the repository into `<vault>/.obsidian/plugins/cooklang-obsidian`; `test-recipes/curry.cook` is the starting fixture.
- Treat build warnings separately from failures, but confirm that `main.js` and `styles.css` were actually produced.

## Generated files, commits, and releases

- `main.js` and `styles.css` are generated and gitignored. Never edit or commit them directly.
- Do not commit `node_modules`, `build/`, generated WASM, source maps, or local Obsidian `data.json`.
- Pull-request CI runs `npm ci`, `npm test`, and `npm run build`, and it checks commit messages. Use Conventional Commit subjects such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `ci:`, or `chore:`.
- Release Please owns release PRs, `CHANGELOG.md`, version synchronization across `package.json`, `package-lock.json`, `manifest.json`, and `.release-please-manifest.json`, tags, and GitHub releases. Do not manually bump versions or create release tags unless the task explicitly changes the release process.
