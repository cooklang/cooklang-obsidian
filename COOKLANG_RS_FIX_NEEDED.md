# Fixes Needed in cooklang-rs for NPM Package

## ✅ Problem 1: FIXED (commit 9b3aeb8)
**Missing `pkg/cooklang_wasm_bg.js`**
- Status: ✅ **FIXED** - File is now included in the package

## ✅ Problem 2: FIXED (commit cecfab9)
**TypeScript source files in package**
- Status: ✅ **FIXED** - Now compiling TypeScript to JavaScript
- The package now includes `dist/index.js` and `dist/index.d.ts`
- `package.json` correctly points to `"main": "dist/index.js"`

## ❌ Problem 3: STILL NEEDS FIX (found in cecfab9)
**Incorrect relative import path in compiled output**

### The Issue:
The source file `typescript/index.ts` has:
```typescript
import { ... } from "./pkg/cooklang_wasm.js";
```

This works fine when the source is at the package root, but when TypeScript compiles it to `dist/index.js`, the relative path is wrong:

```
node_modules/@cooklang/cooklang-ts/
├── dist/
│   ├── index.js        ← imports from "./pkg/..." (WRONG!)
│   └── index.d.ts
└── pkg/
    ├── cooklang_wasm.js  ← actual location
    ├── cooklang_wasm_bg.js
    └── cooklang_wasm_bg.wasm
```

The compiled `dist/index.js` tries to import from `./pkg/` (relative to dist/), but `pkg/` is actually one level up at the package root.

### The Error:
```
RollupError: Could not resolve "./pkg/cooklang_wasm.js" from "node_modules/@cooklang/cooklang-ts/dist/index.js"
```

### The Fix:

**Option A: Change source imports** (Recommended)
Update `typescript/index.ts` to use the correct relative path from the dist directory:
```typescript
import { ... } from "../pkg/cooklang_wasm.js";
export type {ScaledRecipeWithReport} from "../pkg/cooklang_wasm.js";
```

**Option B: Move compiled output**
Compile directly to the package root instead of `dist/`:
```json
{
  "main": "index.js",
  "types": "index.d.ts",
  "files": [
    "index.js",
    "index.d.ts",
    "pkg/"
  ]
}
```

And in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "outDir": ".",  // Compile to root instead of dist/
    "rootDir": "."
  }
}
```

**Option C: Copy pkg/ into dist/**
Copy the `pkg/` directory into `dist/` during the build process so the relative paths work.

### Recommendation:
**Option A** is cleanest - just change the import paths in the source to `"../pkg/..."` since the code will be compiled into a subdirectory.

## Summary of Progress

| Issue | Status | Commit |
|-------|--------|--------|
| Missing `cooklang_wasm_bg.js` | ✅ FIXED | 9b3aeb8 |
| TypeScript source in package | ✅ FIXED | cecfab9 |
| Wrong relative import path | ❌ NEEDS FIX | - |

## Current Workaround

The Obsidian plugin uses locally-built WASM files in `src/parser/` with corrected import paths. Once the relative path issue is fixed in cooklang-rs, we can switch to using the NPM package directly.

## Test Case

Once fixed, this should work:
```bash
npm install @cooklang/cooklang-ts@latest
npm run build  # Should succeed without local parser files
```
