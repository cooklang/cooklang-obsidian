// Type declarations for WASM bindings
declare module '@cooklang/cooklang-ts/pkg/cooklang_wasm_bg.js' {
    export class Parser {
        constructor();
        parse(input: string, scale?: number | null): any;
        group_ingredients(recipe: any): any;
        group_cookware(recipe: any): any;
        load_units: boolean;
        extensions: number;
    }

    export function __wbg_set_wasm(wasm: any): void;
    export function __wbindgen_init_externref_table(): void;
    export function __wbindgen_is_undefined(arg0: any): boolean;
    export function __wbindgen_string_get(arg0: any, arg1: any): any;
    export function __wbg_parse_def2e24ef1252aff(): any;
    export function __wbg_stringify_f7ed6987935b4a24(): any;
    export function __wbindgen_throw(arg0: any, arg1: any): void;
}

declare module '@cooklang/cooklang-ts/pkg/cooklang_wasm_bg.wasm' {
    const wasmbin: any;
    export default wasmbin;
}
