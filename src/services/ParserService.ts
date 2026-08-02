/**
 * Parser Service - Handles WASM initialization and recipe parsing
 *
 * This service encapsulates Cooklang WASM parser initialization and provides
 * a clean API for parsing recipe content. Uses singleton pattern to ensure
 * WASM is initialized only once across all recipe views.
 */

import type { CooklangRecipe } from '@cooklang/cooklang';
import * as wasmBindings from '@cooklang/cooklang/pkg/cooklang_wasm_bg.js';
import { default as wasmbin } from '@cooklang/cooklang/pkg/cooklang_wasm_bg.wasm';
import { CooklangRecipe as CooklangRecipeClass } from '@cooklang/cooklang';

/**
 * Parser interface wrapping the raw WASM parser
 */
interface Parser {
    parse: (input: string, scale?: number | null) => [CooklangRecipe, any];
    units: boolean;
    extensions: number;
}

/**
 * ParserService - Singleton service for Cooklang recipe parsing
 *
 * Global WASM initialization is shared across all instances to prevent
 * memory corruption when opening multiple recipe views.
 */
class ParserService {
    private static instance: ParserService;
    private wasmInitPromise: Promise<void> | null = null;
    private parser: Parser | null = null;

    private constructor() {}

    /**
     * Get singleton instance
     */
    public static getInstance(): ParserService {
        if (!ParserService.instance) {
            ParserService.instance = new ParserService();
        }
        return ParserService.instance;
    }

    /**
     * Initialize WASM and create parser instance
     * Safe to call multiple times - initialization happens only once
     *
     * @throws Error if WASM initialization fails
     */
    public async initialize(): Promise<void> {
        // If already initializing or initialized, return existing promise
        if (this.wasmInitPromise) {
            return this.wasmInitPromise;
        }

        this.wasmInitPromise = (async () => {
            try {
                // Get the WASM Module from Rollup
                let wasmModule;
                if (typeof wasmbin === 'function') {
                    wasmModule = await wasmbin();
                } else {
                    wasmModule = wasmbin;
                }

                // Provide the entire wasm-bindgen glue module as the import
                // namespace. The wasm only pulls the functions it needs, so
                // passing everything keeps this resilient to wasm-bindgen build
                // changes (e.g. glue symbols that get added/removed/renamed
                // between versions) instead of hand-listing a fragile subset.
                const imports = {
                    './cooklang_wasm_bg.js': wasmBindings as unknown as WebAssembly.ModuleImports
                };

                // Instantiate the WASM module
                // Note: When passed a Module, WebAssembly.instantiate returns an Instance directly
                // TypeScript types are incorrect for this overload, so we cast through any
                const wasmInstance = await WebAssembly.instantiate(wasmModule, imports) as any as WebAssembly.Instance;

                // Set the WASM exports for the bindings to use (this is global state)
                wasmBindings.__wbg_set_wasm(wasmInstance.exports);

                // Run wasm-bindgen's start (initialises the externref table, etc.)
                // when the build exports it. Older builds exposed
                // __wbindgen_init_externref_table on the glue; current builds run
                // __wbindgen_start from the instance instead. Guarded so it works
                // either way.
                const wasmExports = wasmInstance.exports as any;
                if (typeof wasmExports.__wbindgen_start === 'function') {
                    wasmExports.__wbindgen_start();
                } else if (typeof (wasmBindings as any).__wbindgen_init_externref_table === 'function') {
                    (wasmBindings as any).__wbindgen_init_externref_table();
                }

                // Create the parser instance (using the shared WASM instance)
                const rawParser = new wasmBindings.Parser();

                // Create a wrapper that uses the library's CooklangRecipe wrapper
                this.parser = {
                    parse: (input: string, scale?: number | null) => {
                        const raw = rawParser.parse(input, scale);
                        return [
                            new CooklangRecipeClass(
                                raw,
                                rawParser.group_ingredients(raw),
                                rawParser.group_cookware(raw)
                            ),
                            raw.report
                        ];
                    },
                    set units(value: boolean) {
                        rawParser.load_units = value;
                    },
                    get units(): boolean {
                        return rawParser.load_units;
                    },
                    set extensions(value: number) {
                        rawParser.extensions = value;
                    },
                    get extensions(): number {
                        return rawParser.extensions;
                    }
                };
            } catch (error) {
                console.error('Failed to initialize Cooklang parser:', error);
                this.wasmInitPromise = null; // Allow retry on failure
                throw error;
            }
        })();

        return this.wasmInitPromise;
    }

    /**
     * Parse recipe content
     * @param content - Raw recipe text
     * @param scale - Optional scaling factor
     * @returns Tuple of [parsed recipe, report]
     * @throws Error if parser is not initialized
     */
    public parse(content: string, scale?: number | null): [CooklangRecipe, any] {
        if (!this.parser) {
            throw new Error('Parser not initialized. Call initialize() first.');
        }
        return this.parser.parse(content, scale);
    }

    /**
     * Check if parser is ready
     */
    public isReady(): boolean {
        return this.parser !== null;
    }

    /**
     * Get the parser instance (for advanced usage)
     */
    public getParser(): Parser | null {
        return this.parser;
    }
}

// Export singleton instance
export const parserService = ParserService.getInstance();
