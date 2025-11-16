declare module '@cooklang/cooklang-ts/pkg/cooklang_wasm_bg.wasm' {
    const content: any;
    export default content;
}

declare module '@cooklang/cooklang-ts/pkg/cooklang_wasm.js' {
    export function initSync(module: any): void;
    export default function init(module: any): Promise<void>;
    export class Parser {
        parse(input: string, scale?: number | null): any;
        group_ingredients(raw: any): any;
        group_cookware(raw: any): any;
        load_units: boolean;
        extensions: number;
    }
}
