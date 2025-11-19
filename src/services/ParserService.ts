/**
 * Parser Service - Handles WASM initialization and recipe parsing
 *
 * This service encapsulates Cooklang WASM parser initialization and provides
 * a clean API for parsing recipe content. Uses singleton pattern to ensure
 * WASM is initialized only once across all recipe views.
 */

import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import * as wasmBindings from '@cooklang/cooklang-ts/pkg/cooklang_wasm_bg.js';
import { default as wasmbin } from '@cooklang/cooklang-ts/pkg/cooklang_wasm_bg.wasm';
import { CooklangRecipe as CooklangRecipeClass } from '@cooklang/cooklang-ts';

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

                // Provide wasm-bindgen glue functions as imports
                const imports = {
                    './cooklang_wasm_bg.js': {
                        __wbindgen_is_undefined: wasmBindings.__wbindgen_is_undefined,
                        __wbindgen_string_get: wasmBindings.__wbindgen_string_get,
                        __wbg_parse_def2e24ef1252aff: wasmBindings.__wbg_parse_def2e24ef1252aff,
                        __wbg_stringify_f7ed6987935b4a24: wasmBindings.__wbg_stringify_f7ed6987935b4a24,
                        __wbindgen_throw: wasmBindings.__wbindgen_throw,
                        __wbindgen_init_externref_table: wasmBindings.__wbindgen_init_externref_table
                    }
                };

                // Instantiate the WASM module
                // Note: When passed a Module, WebAssembly.instantiate returns an Instance directly
                // TypeScript types are incorrect for this overload, so we cast through any
                const wasmInstance = await WebAssembly.instantiate(wasmModule, imports) as any as WebAssembly.Instance;

                // Set the WASM exports for the bindings to use (this is global state)
                wasmBindings.__wbg_set_wasm(wasmInstance.exports);
                wasmBindings.__wbindgen_init_externref_table();

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
