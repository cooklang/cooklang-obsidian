# Modularization Implementation Plan

**Project**: cooklang-obsidian
**Date**: 2025-11-19
**Based on**: research.md
**Target**: Refactor cookView.ts (624 lines) into modular architecture

---

## Plan Overview

### Goals
1. Split cookView.ts into 5-7 focused modules (target: ~70 lines per file)
2. Apply Single Responsibility Principle throughout
3. Maintain 100% backward compatibility
4. Improve testability and maintainability
5. Keep all existing functionality working

### Success Criteria
- [ ] All 624 lines of cookView.ts distributed across focused modules
- [ ] No file exceeds 200 lines
- [ ] All features work identically to current implementation
- [ ] Build succeeds without errors
- [ ] Plugin loads and functions correctly in Obsidian

### Estimated Timeline
- **Phase 1**: 4-6 hours
- **Phase 2**: 6-8 hours
- **Phase 3**: 8-12 hours
- **Phase 4**: 3-5 hours
- **Phase 5**: 2-4 hours
- **Total**: 23-35 hours of focused development

---

## Phase 1: Extract Utilities (Low Risk)

### Objective
Extract pure utility functions from cookView.ts into dedicated modules. These have no dependencies and can be safely extracted.

### Tasks

#### 1.1 Create utils directory structure
```bash
mkdir -p src/utils
```

#### 1.2 Extract time formatting utilities → `utils/timeFormatters.ts`
**Target code location**: cookView.ts (search for time formatting functions)

**File structure**:
```typescript
// src/utils/timeFormatters.ts
export function formatDuration(minutes: number): string {
  // Extract time formatting logic
}

export function parseTimeString(timeStr: string): number {
  // Extract time parsing logic
}
```

**Actions**:
- [ ] Create `src/utils/timeFormatters.ts`
- [ ] Copy time formatting functions from cookView.ts
- [ ] Add proper exports
- [ ] Add JSDoc comments
- [ ] Update imports in cookView.ts
- [ ] Test: Verify time display in preview works

#### 1.3 Extract image helpers → `utils/imageHelpers.ts`
**Target code location**: cookView.ts (image detection and display logic)

**File structure**:
```typescript
// src/utils/imageHelpers.ts
export function isImageFile(filename: string): boolean {
  // Extract image detection logic
}

export function getImagePath(filename: string, recipePath: string): string {
  // Extract image path resolution logic
}
```

**Actions**:
- [ ] Create `src/utils/imageHelpers.ts`
- [ ] Extract image-related functions from cookView.ts
- [ ] Add proper exports
- [ ] Add JSDoc comments
- [ ] Update imports in cookView.ts
- [ ] Test: Verify images display correctly in preview

#### 1.4 Extract URL validators → `utils/urlValidators.ts`
**Target code location**: cookView.ts (URL validation logic)

**File structure**:
```typescript
// src/utils/urlValidators.ts
export function isValidUrl(url: string): boolean {
  // Extract URL validation logic
}

export function sanitizeUrl(url: string): string {
  // Extract URL sanitization logic if present
}
```

**Actions**:
- [ ] Create `src/utils/urlValidators.ts`
- [ ] Extract URL validation functions from cookView.ts
- [ ] Add proper exports
- [ ] Add JSDoc comments
- [ ] Update imports in cookView.ts
- [ ] Test: Verify URL links work in preview

### Phase 1 Acceptance Criteria
- [ ] All utility functions extracted to separate files
- [ ] cookView.ts imports utilities from new modules
- [ ] All tests pass (manual testing if no automated tests)
- [ ] Plugin builds successfully
- [ ] Plugin functions identically in Obsidian

### Phase 1 Commit Strategy
```bash
git add src/utils/
git commit -m "refactor: extract utility functions to utils/ directory

- Create utils/timeFormatters.ts for time formatting logic
- Create utils/imageHelpers.ts for image detection/display
- Create utils/urlValidators.ts for URL validation
- Update cookView.ts to import from new utility modules
- No functional changes, pure code organization"
```

---

## Phase 2: Extract Services (Medium Risk)

### Objective
Extract business logic services with clear APIs. These modules manage state and external dependencies.

### Tasks

#### 2.1 Create services directory structure
```bash
mkdir -p src/services
```

#### 2.2 Extract ParserService → `services/ParserService.ts`
**Target code location**: cookView.ts (~45 lines, WASM initialization and parsing)

**File structure**:
```typescript
// src/services/ParserService.ts
import { Recipe } from '@cooklang/cooklang-ts';

class ParserService {
  private static instance: ParserService;
  private parserInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): ParserService {
    if (!ParserService.instance) {
      ParserService.instance = new ParserService();
    }
    return ParserService.instance;
  }

  public async initialize(): Promise<void> {
    // Move WASM initialization logic here
  }

  public parse(content: string): Recipe {
    // Move parsing logic here
  }
}

export const parserService = ParserService.getInstance();
```

**Actions**:
- [ ] Read cookView.ts to identify WASM initialization code
- [ ] Create `src/services/ParserService.ts`
- [ ] Implement singleton pattern for WASM instance
- [ ] Move `initializeParser()` logic to service
- [ ] Move parsing logic to `parse()` method
- [ ] Add error handling
- [ ] Add JSDoc comments
- [ ] Export singleton instance
- [ ] Update cookView.ts to use parserService
- [ ] Test: Verify recipe parsing works correctly

#### 2.3 Extract TimerService → `services/TimerService.ts`
**Target code location**: cookView.ts (~50 lines, timer management + Howler.js)

**File structure**:
```typescript
// src/services/TimerService.ts
import { Howl } from 'howler';

export interface Timer {
  id: string;
  duration: number;
  remaining: number;
  label: string;
  isRunning: boolean;
}

export class TimerService {
  private timers: Map<string, Timer> = new Map();
  private intervals: Map<string, number> = new Map();
  private tickSound: Howl;
  private alarmSound: Howl;

  constructor(tickSoundUrl: string, alarmSoundUrl: string) {
    // Initialize Howler sounds
  }

  public createTimer(id: string, duration: number, label: string): Timer {
    // Timer creation logic
  }

  public startTimer(id: string, onTick: (remaining: number) => void): void {
    // Timer start logic
  }

  public pauseTimer(id: string): void {
    // Timer pause logic
  }

  public resetTimer(id: string): void {
    // Timer reset logic
  }

  public playTick(): void {
    // Play tick sound
  }

  public playAlarm(): void {
    // Play alarm sound
  }

  public dispose(): void {
    // Cleanup all timers and sounds
  }
}
```

**Actions**:
- [ ] Read cookView.ts to identify timer management code
- [ ] Create `src/services/TimerService.ts`
- [ ] Move timer state management to service
- [ ] Move `makeTimer()` logic to service methods
- [ ] Move Howler.js integration to service
- [ ] Add interface for Timer data structure
- [ ] Add JSDoc comments
- [ ] Update cookView.ts to use TimerService
- [ ] Test: Verify all timer functionality works
  - [ ] Timer countdown
  - [ ] Timer pause/resume
  - [ ] Tick sound
  - [ ] Alarm sound

### Phase 2 Acceptance Criteria
- [ ] ParserService successfully handles all parsing
- [ ] TimerService manages all timer state and audio
- [ ] cookView.ts uses services via clean APIs
- [ ] No global state except in services
- [ ] All tests pass
- [ ] Plugin builds successfully
- [ ] All features work identically

### Phase 2 Commit Strategy
```bash
git add src/services/
git commit -m "refactor: extract business logic to services layer

- Create services/ParserService.ts for WASM parsing (singleton)
- Create services/TimerService.ts for timer management and audio
- Update cookView.ts to delegate to services
- Isolate business logic from UI layer
- Maintain full backward compatibility"
```

---

## Phase 3: Extract Renderers (Medium Risk)

### Objective
Break down the monolithic `renderPreview()` function (~200 lines) into focused renderer modules. This is the most complex phase.

### Tasks

#### 3.1 Create renderers directory structure
```bash
mkdir -p src/renderers
```

#### 3.2 Analyze current renderPreview() function
**Actions**:
- [ ] Read cookView.ts lines 424-623 (renderPreview function)
- [ ] Identify distinct rendering sections:
  - Metadata rendering
  - Ingredient list rendering
  - Cookware list rendering
  - Timer list rendering
  - Method steps rendering
- [ ] Document dependencies for each section

#### 3.3 Create MetadataRenderer → `renderers/MetadataRenderer.ts`
**Target code location**: cookView.ts (metadata rendering section)

**File structure**:
```typescript
// src/renderers/MetadataRenderer.ts
import { Recipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';

export class MetadataRenderer {
  constructor(private settings: CooklangSettings) {}

  public render(recipe: Recipe, container: HTMLElement): void {
    // Render metadata section
  }

  private renderMetadataItem(key: string, value: string): HTMLElement {
    // Helper method
  }
}
```

**Actions**:
- [ ] Create `src/renderers/MetadataRenderer.ts`
- [ ] Extract metadata rendering logic from renderPreview()
- [ ] Create clean API: `render(recipe, container)`
- [ ] Add JSDoc comments
- [ ] Create temporary test in cookView to verify rendering
- [ ] Test: Verify metadata displays correctly

#### 3.4 Create IngredientListRenderer → `renderers/IngredientListRenderer.ts`
**Target code location**: cookView.ts (ingredients section)

**File structure**:
```typescript
// src/renderers/IngredientListRenderer.ts
import { Recipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';

export class IngredientListRenderer {
  constructor(private settings: CooklangSettings) {}

  public render(recipe: Recipe, container: HTMLElement): void {
    // Render ingredient list
  }

  private renderIngredient(ingredient: any): HTMLElement {
    // Helper method
  }
}
```

**Actions**:
- [ ] Create `src/renderers/IngredientListRenderer.ts`
- [ ] Extract ingredient rendering logic from renderPreview()
- [ ] Create clean API: `render(recipe, container)`
- [ ] Add JSDoc comments
- [ ] Test: Verify ingredient list displays correctly

#### 3.5 Create CookwareListRenderer → `renderers/CookwareListRenderer.ts`
**Target code location**: cookView.ts (cookware section)

**File structure**:
```typescript
// src/renderers/CookwareListRenderer.ts
import { Recipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';

export class CookwareListRenderer {
  constructor(private settings: CooklangSettings) {}

  public render(recipe: Recipe, container: HTMLElement): void {
    // Render cookware list
  }

  private renderCookware(cookware: any): HTMLElement {
    // Helper method
  }
}
```

**Actions**:
- [ ] Create `src/renderers/CookwareListRenderer.ts`
- [ ] Extract cookware rendering logic from renderPreview()
- [ ] Create clean API: `render(recipe, container)`
- [ ] Add JSDoc comments
- [ ] Test: Verify cookware list displays correctly

#### 3.6 Create TimerListRenderer → `renderers/TimerListRenderer.ts`
**Target code location**: cookView.ts (timers section)

**File structure**:
```typescript
// src/renderers/TimerListRenderer.ts
import { Recipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';

export class TimerListRenderer {
  constructor(
    private settings: CooklangSettings,
    private timerService: TimerService
  ) {}

  public render(recipe: Recipe, container: HTMLElement): void {
    // Render timer list with interactive controls
  }

  private createTimerElement(timer: any): HTMLElement {
    // Helper method
  }
}
```

**Actions**:
- [ ] Create `src/renderers/TimerListRenderer.ts`
- [ ] Extract timer list rendering logic from renderPreview()
- [ ] Integrate with TimerService
- [ ] Create interactive timer UI elements
- [ ] Add JSDoc comments
- [ ] Test: Verify timer list displays and functions correctly

#### 3.7 Create MethodStepsRenderer → `renderers/MethodStepsRenderer.ts`
**Target code location**: cookView.ts (method steps section)

**File structure**:
```typescript
// src/renderers/MethodStepsRenderer.ts
import { Recipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';

export class MethodStepsRenderer {
  constructor(
    private settings: CooklangSettings,
    private timerService: TimerService
  ) {}

  public render(recipe: Recipe, container: HTMLElement): void {
    // Render method steps with inline components
  }

  private renderStep(step: any, index: number): HTMLElement {
    // Helper method
  }

  private renderInlineComponent(component: any): HTMLElement {
    // Render ingredients/cookware/timers inline
  }
}
```

**Actions**:
- [ ] Create `src/renderers/MethodStepsRenderer.ts`
- [ ] Extract method steps rendering logic from renderPreview()
- [ ] Handle inline ingredients, cookware, and timers
- [ ] Integrate with TimerService for inline timers
- [ ] Add JSDoc comments
- [ ] Test: Verify method steps display with inline components

#### 3.8 Create PreviewRenderer orchestrator → `renderers/PreviewRenderer.ts`
**Target code location**: New orchestration layer

**File structure**:
```typescript
// src/renderers/PreviewRenderer.ts
import { Recipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';
import { MetadataRenderer } from './MetadataRenderer';
import { IngredientListRenderer } from './IngredientListRenderer';
import { CookwareListRenderer } from './CookwareListRenderer';
import { TimerListRenderer } from './TimerListRenderer';
import { MethodStepsRenderer } from './MethodStepsRenderer';

export class PreviewRenderer {
  private metadataRenderer: MetadataRenderer;
  private ingredientRenderer: IngredientListRenderer;
  private cookwareRenderer: CookwareListRenderer;
  private timerListRenderer: TimerListRenderer;
  private methodStepsRenderer: MethodStepsRenderer;

  constructor(
    settings: CooklangSettings,
    timerService: TimerService
  ) {
    this.metadataRenderer = new MetadataRenderer(settings);
    this.ingredientRenderer = new IngredientListRenderer(settings);
    this.cookwareRenderer = new CookwareListRenderer(settings);
    this.timerListRenderer = new TimerListRenderer(settings, timerService);
    this.methodStepsRenderer = new MethodStepsRenderer(settings, timerService);
  }

  public render(recipe: Recipe, container: HTMLElement): void {
    container.empty();

    // Orchestrate rendering in correct order
    this.metadataRenderer.render(recipe, container);
    this.ingredientRenderer.render(recipe, container);
    this.cookwareRenderer.render(recipe, container);
    this.timerListRenderer.render(recipe, container);
    this.methodStepsRenderer.render(recipe, container);
  }

  public updateSettings(settings: CooklangSettings): void {
    // Update settings for all renderers
  }
}
```

**Actions**:
- [ ] Create `src/renderers/PreviewRenderer.ts`
- [ ] Compose all renderer modules
- [ ] Implement orchestration logic
- [ ] Handle container clearing and setup
- [ ] Add method to update settings
- [ ] Add JSDoc comments
- [ ] Update cookView.ts to use PreviewRenderer
- [ ] Test: Full preview rendering end-to-end

### Phase 3 Acceptance Criteria
- [ ] All 6 renderer files created and working
- [ ] PreviewRenderer orchestrates all rendering
- [ ] cookView.ts delegates all rendering to PreviewRenderer
- [ ] Preview displays identically to before
- [ ] All interactive features work (timers, links, etc.)
- [ ] All tests pass
- [ ] Plugin builds successfully

### Phase 3 Commit Strategy
```bash
git add src/renderers/
git commit -m "refactor: split preview rendering into modular renderers

- Create renderers/MetadataRenderer.ts for metadata section
- Create renderers/IngredientListRenderer.ts for ingredients
- Create renderers/CookwareListRenderer.ts for cookware
- Create renderers/TimerListRenderer.ts for timer list
- Create renderers/MethodStepsRenderer.ts for method steps
- Create renderers/PreviewRenderer.ts as orchestrator
- Update cookView.ts to use PreviewRenderer
- Maintain full rendering functionality and behavior"
```

---

## Phase 4: Reorganize View Components (Low Risk)

### Objective
Extract remaining view management logic into focused modules, creating a clean orchestration layer.

### Tasks

#### 4.1 Create view directory structure
```bash
mkdir -p src/view
```

#### 4.2 Extract ViewStateManager → `view/ViewStateManager.ts`
**Target code location**: cookView.ts (view mode switching logic)

**File structure**:
```typescript
// src/view/ViewStateManager.ts
export enum ViewMode {
  Source = 'source',
  Preview = 'preview'
}

export class ViewStateManager {
  private currentMode: ViewMode = ViewMode.Source;
  private onModeChange?: (mode: ViewMode) => void;

  constructor(onModeChange?: (mode: ViewMode) => void) {
    this.onModeChange = onModeChange;
  }

  public switchToPreview(): void {
    this.currentMode = ViewMode.Preview;
    this.onModeChange?.(ViewMode.Preview);
  }

  public switchToSource(): void {
    this.currentMode = ViewMode.Source;
    this.onModeChange?.(ViewMode.Source);
  }

  public toggleMode(): void {
    if (this.currentMode === ViewMode.Source) {
      this.switchToPreview();
    } else {
      this.switchToSource();
    }
  }

  public getMode(): ViewMode {
    return this.currentMode;
  }

  public isPreviewMode(): boolean {
    return this.currentMode === ViewMode.Preview;
  }
}
```

**Actions**:
- [ ] Create `src/view/ViewStateManager.ts`
- [ ] Extract view mode state management from cookView.ts
- [ ] Create clean state management API
- [ ] Add ViewMode enum
- [ ] Add callback support for mode changes
- [ ] Add JSDoc comments
- [ ] Test: Verify mode switching works

#### 4.3 Extract EditorManager → `view/EditorManager.ts`
**Target code location**: cookView.ts (CodeMirror setup ~40 lines)

**File structure**:
```typescript
// src/view/EditorManager.ts
import { EditorView, basicSetup } from '@codemirror/basic-setup';
import { EditorState } from '@codemirror/state';
import { cook } from '../mode/cook/cook';

export class EditorManager {
  private editor?: EditorView;
  private container?: HTMLElement;

  public createEditor(
    container: HTMLElement,
    initialContent: string,
    onChange: (content: string) => void
  ): EditorView {
    // CodeMirror initialization logic
  }

  public applyTheme(theme: 'light' | 'dark'): void {
    // Theme application logic
  }

  public getContent(): string {
    return this.editor?.state.doc.toString() ?? '';
  }

  public setContent(content: string): void {
    // Update editor content
  }

  public focus(): void {
    this.editor?.focus();
  }

  public destroy(): void {
    this.editor?.destroy();
  }
}
```

**Actions**:
- [ ] Create `src/view/EditorManager.ts`
- [ ] Extract CodeMirror setup from cookView.ts
- [ ] Move editor state management
- [ ] Move theme handling
- [ ] Create clean editor API
- [ ] Add JSDoc comments
- [ ] Test: Verify editor works with syntax highlighting

#### 4.4 Refactor CookView → `view/CookView.ts` (orchestrator)
**Target code location**: Move cookView.ts to view/ directory

**New structure**:
```typescript
// src/view/CookView.ts
import { TextFileView } from 'obsidian';
import { parserService } from '../services/ParserService';
import { TimerService } from '../services/TimerService';
import { PreviewRenderer } from '../renderers/PreviewRenderer';
import { ViewStateManager } from './ViewStateManager';
import { EditorManager } from './EditorManager';

export class CookView extends TextFileView {
  private viewStateManager: ViewStateManager;
  private editorManager: EditorManager;
  private timerService: TimerService;
  private previewRenderer: PreviewRenderer;

  async onOpen() {
    // Initialize all managers and services
  }

  async onClose() {
    // Cleanup
  }

  getViewData(): string {
    // Delegate to EditorManager
  }

  setViewData(data: string, clear: boolean): void {
    // Delegate to EditorManager and trigger preview if needed
  }

  clear(): void {
    // Cleanup
  }
}
```

**Actions**:
- [ ] Move `src/cookView.ts` to `src/view/CookView.ts`
- [ ] Refactor to use ViewStateManager
- [ ] Refactor to use EditorManager
- [ ] Refactor to use PreviewRenderer
- [ ] Refactor to use services
- [ ] Remove all extracted code
- [ ] Ensure class is thin orchestration layer (~120 lines target)
- [ ] Add JSDoc comments
- [ ] Update imports in main.ts
- [ ] Test: Full integration test of all features

#### 4.5 Update main.ts imports
**Actions**:
- [ ] Update import path for CookView (now at view/CookView)
- [ ] Verify all other imports still work
- [ ] Test: Plugin loads correctly

### Phase 4 Acceptance Criteria
- [ ] ViewStateManager handles all mode switching
- [ ] EditorManager handles all CodeMirror logic
- [ ] CookView is ~120 lines (down from 624)
- [ ] CookView is pure orchestration, delegates everything
- [ ] All imports updated correctly
- [ ] All tests pass
- [ ] Plugin builds successfully
- [ ] All features work identically

### Phase 4 Commit Strategy
```bash
git add src/view/
git commit -m "refactor: reorganize view layer with focused managers

- Create view/ViewStateManager.ts for mode switching
- Create view/EditorManager.ts for CodeMirror management
- Move cookView.ts to view/CookView.ts
- Refactor CookView to thin orchestration layer (~120 lines)
- Update main.ts imports
- Complete modularization of view layer"
```

---

## Phase 5: Polish and Optimize

### Objective
Final cleanup, documentation, and verification of the refactored codebase.

### Tasks

#### 5.1 Review all interfaces and APIs
**Actions**:
- [ ] Review all public methods in services
- [ ] Review all public methods in renderers
- [ ] Review all public methods in managers
- [ ] Ensure consistent naming conventions
- [ ] Ensure consistent error handling
- [ ] Ensure proper TypeScript types everywhere

#### 5.2 Add comprehensive JSDoc documentation
**Actions**:
- [ ] Add JSDoc to all public methods in utils/
- [ ] Add JSDoc to all public methods in services/
- [ ] Add JSDoc to all public methods in renderers/
- [ ] Add JSDoc to all public methods in view/
- [ ] Add file-level JSDoc comments explaining purpose
- [ ] Document complex algorithms or patterns

#### 5.3 Verify error handling
**Actions**:
- [ ] Check error handling in ParserService
- [ ] Check error handling in TimerService
- [ ] Check error handling in all renderers
- [ ] Add try-catch blocks where appropriate
- [ ] Ensure errors are logged properly
- [ ] Test error scenarios

#### 5.4 Update build configuration (if needed)
**Actions**:
- [ ] Review rollup.config.js
- [ ] Check if path aliases would help (tsconfig.json)
- [ ] Verify all imports resolve correctly
- [ ] Run production build
- [ ] Check bundle size (should be similar)

#### 5.5 Update documentation
**Actions**:
- [ ] Create architecture diagram showing module relationships
- [ ] Update README.md with new structure
- [ ] Document the module architecture
- [ ] Add "Architecture" section to README
- [ ] Document how to contribute (which file to modify for what)

#### 5.6 Create architecture diagram
```
┌─────────────────────────────────────────────────────┐
│                     main.ts                          │
│                 (Plugin Entry)                       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│                view/CookView.ts                      │
│              (Orchestrator ~120 lines)               │
└─────┬───────────┬────────────┬──────────┬───────────┘
      │           │            │          │
      ▼           ▼            ▼          ▼
┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐
│ViewState │ │  Editor  │ │ Preview │ │  services/ │
│ Manager  │ │ Manager  │ │Renderer │ │            │
└──────────┘ └──────────┘ └────┬────┘ │ ├─Parser   │
                                │      │ └─Timer    │
                                │      └────────────┘
                                ▼
                    ┌───────────────────────┐
                    │    renderers/         │
                    │ ├─Metadata            │
                    │ ├─IngredientList      │
                    │ ├─CookwareList        │
                    │ ├─TimerList           │
                    │ └─MethodSteps         │
                    └───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │      utils/           │
                    │ ├─timeFormatters      │
                    │ ├─imageHelpers        │
                    │ └─urlValidators       │
                    └───────────────────────┘
```

#### 5.7 Final comprehensive testing
**Actions**:
- [ ] Test creating new recipe
- [ ] Test editing existing recipe
- [ ] Test preview mode
- [ ] Test source mode
- [ ] Test mode switching
- [ ] Test timer functionality (start, pause, reset)
- [ ] Test timer sounds (tick, alarm)
- [ ] Test metadata display
- [ ] Test ingredient list display
- [ ] Test cookware list display
- [ ] Test method steps display
- [ ] Test inline components in steps
- [ ] Test image display
- [ ] Test URL links
- [ ] Test theme switching (light/dark)
- [ ] Test settings changes
- [ ] Test file save/load
- [ ] Performance test (large recipes)

#### 5.8 Code metrics comparison
**Actions**:
- [ ] Measure final file sizes
- [ ] Count total TypeScript files (before: 7, target: 17)
- [ ] Calculate average file size (before: ~177, target: ~70)
- [ ] Verify largest file < 200 lines
- [ ] Document improvements in plan.md

### Phase 5 Acceptance Criteria
- [ ] All code has JSDoc documentation
- [ ] Error handling is comprehensive
- [ ] Build configuration works correctly
- [ ] README updated with architecture
- [ ] All manual tests pass
- [ ] Plugin is production-ready

### Phase 5 Commit Strategy
```bash
git add .
git commit -m "docs: add comprehensive documentation and architecture diagram

- Add JSDoc comments to all public APIs
- Create architecture diagram showing module relationships
- Update README with modularization details
- Document contribution guidelines
- Verify error handling across all modules
- Final polish and cleanup complete"
```

---

## Testing Checklist

### Manual Testing After Each Phase

#### Phase 1 Testing
- [ ] Plugin loads without errors
- [ ] Recipe preview renders correctly
- [ ] Images display correctly
- [ ] Times format correctly
- [ ] URLs work correctly

#### Phase 2 Testing
- [ ] Recipe parsing works
- [ ] WASM initializes correctly
- [ ] Timers count down correctly
- [ ] Timer sounds play (tick and alarm)
- [ ] Timer pause/resume works

#### Phase 3 Testing
- [ ] Metadata section renders
- [ ] Ingredient list renders
- [ ] Cookware list renders
- [ ] Timer list renders
- [ ] Method steps render
- [ ] Inline components render correctly
- [ ] Overall preview layout is correct

#### Phase 4 Testing
- [ ] Source/preview mode switching works
- [ ] Editor syntax highlighting works
- [ ] Editor editing works
- [ ] Content saves correctly
- [ ] Theme changes apply correctly

#### Phase 5 Testing
- [ ] Complete end-to-end testing
- [ ] Performance testing with large files
- [ ] Edge case testing

---

## Rollback Strategy

### If Issues Arise During Any Phase

1. **Immediate Rollback**:
   ```bash
   git reset --hard HEAD~1  # Roll back last commit
   ```

2. **Partial Rollback** (keep some changes):
   ```bash
   git revert <commit-hash>  # Revert specific commit
   ```

3. **Start Over** (if needed):
   ```bash
   git checkout main
   git branch -D claude/research-code-modularity-01LBP2KzLYTq7q6crVwG2mZ7
   git checkout -b claude/research-code-modularity-01LBP2KzLYTq7q6crVwG2mZ7
   ```

### Mitigation Strategies

- **Commit after each sub-task**: Small, focused commits enable easy rollback
- **Test after each file extraction**: Catch issues immediately
- **Keep backups**: Copy cookView.ts to cookView.ts.backup before starting
- **Use feature flags**: If needed, add flags to switch between old/new code

---

## Success Metrics

### Before Refactoring
- Files: 7 TypeScript files
- Largest file: cookView.ts (624 lines)
- Average file size: ~177 lines
- Responsibilities per file: cookView.ts has 10+

### After Refactoring (Target)
- Files: 17 TypeScript files
- Largest file: PreviewRenderer.ts (~150 lines)
- Average file size: ~70 lines
- Responsibilities per file: 1-2 maximum

### Quality Improvements
- **Testability**: Each module can be tested independently
- **Maintainability**: Changes isolated to specific modules
- **Readability**: Smaller files are easier to understand
- **Scalability**: Easy to add new features
- **Collaboration**: Less merge conflicts, clearer ownership

---

## Risk Assessment

### Phase 1 - Low Risk ⚠️
- Pure utility extraction
- No state management
- Easy to test and verify
- Easy to rollback

### Phase 2 - Medium Risk ⚠️⚠️
- Involves state management (WASM, timers)
- Requires careful singleton implementation
- Audio integration must work correctly
- Moderate testing required

### Phase 3 - Medium-High Risk ⚠️⚠️⚠️
- Most complex phase
- Large amount of code movement (~200 lines)
- Multiple interdependent renderers
- UI must look and behave identically
- Extensive testing required

### Phase 4 - Low-Medium Risk ⚠️⚠️
- Reorganizing view layer
- Mostly moving existing code
- Well-defined interfaces
- Moderate testing required

### Phase 5 - Low Risk ⚠️
- Documentation and polish
- No functional changes
- Low risk of breaking anything

---

## Next Steps

1. **Review this plan** - Ensure all tasks are clear and achievable
2. **Set up testing** - Consider adding automated tests before starting
3. **Create backup** - Copy cookView.ts to backup location
4. **Start Phase 1** - Begin with utility extraction
5. **Progress iteratively** - Complete each phase fully before moving to next

---

## Appendix: File Size Targets

| Module | Target Lines | Responsibility |
|--------|-------------|----------------|
| timeFormatters.ts | ~30 | Time formatting utilities |
| imageHelpers.ts | ~40 | Image detection/display |
| urlValidators.ts | ~30 | URL validation |
| ParserService.ts | ~60 | WASM parsing |
| TimerService.ts | ~80 | Timer management & audio |
| MetadataRenderer.ts | ~30 | Render metadata |
| IngredientListRenderer.ts | ~35 | Render ingredients |
| CookwareListRenderer.ts | ~30 | Render cookware |
| TimerListRenderer.ts | ~40 | Render timer list |
| MethodStepsRenderer.ts | ~40 | Render method steps |
| PreviewRenderer.ts | ~150 | Orchestrate rendering |
| ViewStateManager.ts | ~60 | View mode management |
| EditorManager.ts | ~80 | CodeMirror management |
| CookView.ts | ~120 | Main orchestrator |

**Total Lines**: ~825 lines (across 14 new modules)
**Original**: 624 lines (in 1 file)
**Overhead**: ~200 lines for cleaner interfaces and documentation

This overhead is acceptable and beneficial for maintainability.

---

**Status**: Ready for implementation
**Last Updated**: 2025-11-19
