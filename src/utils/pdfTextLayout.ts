/// <reference lib="es2022.intl" />
/** Canvas receives complete logical lines so its bidi algorithm can order runs. */
export function textDirection(text: string): 'rtl' | 'ltr' {
    for (const character of text) {
        if (!/\p{Letter}/u.test(character)) continue;
        return /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(character) ? 'rtl' : 'ltr';
    }
    return 'ltr';
}

export function canvasTextLines(text: string, width: number, measure: (text: string) => number): string[] {
    return canvasTextLineRanges(text,width,(start,end) => measure(text.slice(start,end))).map(([start,end]) => text.slice(start,end));
}

/** Keep offsets into the logical text, including protected phrases and bidi runs. */
export function canvasTextLineRanges(text: string, width: number, measure: (start: number, end: number) => number,
    protectedRanges: [number, number][] = []): [number, number][] {
    const lines: [number, number][] = [];
    const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    let start = -1, end = 0;
    const flush = () => { if (start >= 0) lines.push([start, end]); start = -1; };
    let consumed = 0;
    for (const match of text.matchAll(/\S+/gu)) {
        if (match.index < consumed) continue;
        const phrase = protectedRanges.find(([a]) => a === match.index);
        const phraseEnd = phrase ? phrase[1] + (text.slice(phrase[1]).match(/^\S*/u)?.[0].length ?? 0) : 0;
        const tokenEnd = phrase && measure(phrase[0], phraseEnd) <= width ? phraseEnd : match.index + match[0].length;
        if (start >= 0 && (/\r?\n/.test(text.slice(end, match.index)) || measure(start, tokenEnd) > width)) flush();
        if (measure(match.index, tokenEnd) > width) {
            for (const part of graphemes.segment(text.slice(match.index, tokenEnd))) {
                const a = match.index + part.index, b = a + part.segment.length;
                if (start >= 0 && measure(start, b) > width) flush();
                if (start < 0) start = a;
                end = b;
            }
        } else {
            if (start < 0) start = match.index;
            end = tokenEnd;
        }
        consumed = tokenEnd;
    }
    flush();
    return lines;
}
