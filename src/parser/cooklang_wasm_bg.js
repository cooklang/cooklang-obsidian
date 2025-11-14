let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}


const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_export_2.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

let WASM_VECTOR_LEN = 0;

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}
/**
 * @param {Quantity} _this
 * @returns {string}
 */
export function quantity_display(_this) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.quantity_display(_this);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {Cookware} _this
 * @returns {boolean}
 */
export function cookware_should_be_listed(_this) {
    const ret = wasm.cookware_should_be_listed(_this);
    return ret !== 0;
}

/**
 * @param {Ingredient} _this
 * @returns {string}
 */
export function ingredient_display_name(_this) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.ingredient_display_name(_this);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {Ingredient} _this
 * @returns {boolean}
 */
export function ingredient_should_be_listed(_this) {
    const ret = wasm.ingredient_should_be_listed(_this);
    return ret !== 0;
}

/**
 * @returns {string}
 */
export function version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {GroupedQuantity} _this
 * @returns {boolean}
 */
export function grouped_quantity_is_empty(_this) {
    const ret = wasm.grouped_quantity_is_empty(_this);
    return ret !== 0;
}

/**
 * @param {GroupedQuantity} _this
 * @returns {string}
 */
export function grouped_quantity_display(_this) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.grouped_quantity_display(_this);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {Cookware} _this
 * @returns {string}
 */
export function cookware_display_name(_this) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.cookware_display_name(_this);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_export_2.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

const FallibleResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_fallibleresult_free(ptr >>> 0, 1));

export class FallibleResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(FallibleResult.prototype);
        obj.__wbg_ptr = ptr;
        FallibleResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FallibleResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_fallibleresult_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get value() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_fallibleresult_value(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} arg0
     */
    set value(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_fallibleresult_value(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {string}
     */
    get error() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_fallibleresult_error(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} arg0
     */
    set error(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_fallibleresult_error(this.__wbg_ptr, ptr0, len0);
    }
}

const ParserFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_parser_free(ptr >>> 0, 1));

export class Parser {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ParserFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_parser_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get extensions() {
        const ret = wasm.parser_extensions(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    get load_units() {
        const ret = wasm.parser_load_units(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {string} input
     * @param {boolean} json
     * @returns {FallibleResult}
     */
    parse_full(input, json) {
        const ptr0 = passStringToWasm0(input, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.parser_parse_full(this.__wbg_ptr, ptr0, len0, json);
        return FallibleResult.__wrap(ret);
    }
    /**
     * @param {string} input
     * @returns {string}
     */
    parse_events(input) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ptr0 = passStringToWasm0(input, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.parser_parse_events(this.__wbg_ptr, ptr0, len0);
            deferred2_0 = ret[0];
            deferred2_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {string} input
     * @param {number | null} [scale]
     * @returns {FallibleResult}
     */
    parse_render(input, scale) {
        const ptr0 = passStringToWasm0(input, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.parser_parse_render(this.__wbg_ptr, ptr0, len0, !isLikeNone(scale), isLikeNone(scale) ? 0 : scale);
        return FallibleResult.__wrap(ret);
    }
    /**
     * @param {string} input
     * @returns {FallibleResult}
     */
    std_metadata(input) {
        const ptr0 = passStringToWasm0(input, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.parser_std_metadata(this.__wbg_ptr, ptr0, len0);
        return FallibleResult.__wrap(ret);
    }
    /**
     * returns vector of indices in r.recipe.cookware and their quantities
     * @param {ScaledRecipeWithReport} r
     * @returns {GroupedIndexAndQuantity[]}
     */
    group_cookware(r) {
        const ret = wasm.parser_group_cookware(this.__wbg_ptr, r);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {number} bits
     */
    set extensions(bits) {
        wasm.parser_set_extensions(this.__wbg_ptr, bits);
    }
    /**
     * @param {boolean} load
     */
    set load_units(load) {
        wasm.parser_set_load_units(this.__wbg_ptr, load);
    }
    /**
     * returns vector of indices in r.recipe.ingredients and their quantities
     * @param {ScaledRecipeWithReport} r
     * @returns {GroupedIndexAndQuantity[]}
     */
    group_ingredients(r) {
        const ret = wasm.parser_group_ingredients(this.__wbg_ptr, r);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    constructor() {
        const ret = wasm.parser_new();
        this.__wbg_ptr = ret >>> 0;
        ParserFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} input
     * @param {number | null} [scale]
     * @returns {ScaledRecipeWithReport}
     */
    parse(input, scale) {
        const ptr0 = passStringToWasm0(input, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.parser_parse(this.__wbg_ptr, ptr0, len0, !isLikeNone(scale), isLikeNone(scale) ? 0 : scale);
        return ret;
    }
    /**
     * @param {string} input
     * @param {boolean} json
     * @returns {FallibleResult}
     */
    parse_ast(input, json) {
        const ptr0 = passStringToWasm0(input, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.parser_parse_ast(this.__wbg_ptr, ptr0, len0, json);
        return FallibleResult.__wrap(ret);
    }
}

export function __wbg_parse_def2e24ef1252aff() { return handleError(function (arg0, arg1) {
    const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
    return ret;
}, arguments) };

export function __wbg_stringify_f7ed6987935b4a24() { return handleError(function (arg0) {
    const ret = JSON.stringify(arg0);
    return ret;
}, arguments) };

export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_export_2;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
    ;
};

export function __wbindgen_is_undefined(arg0) {
    const ret = arg0 === undefined;
    return ret;
};

export function __wbindgen_string_get(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

