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
    const lines: string[] = [];
    const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    for (const paragraph of text.split(/\r?\n/)) {
        let line = '';
        for (const word of paragraph.match(/\S+/gu) ?? []) {
            const candidate = line ? line + ' ' + word : word;
            if (line && measure(candidate) > width) { lines.push(line); line = ''; }
            if (measure(word) > width) {
                for (const { segment } of graphemes.segment(word)) {
                    if (line && measure(line + segment) > width) { lines.push(line); line = ''; }
                    line += segment;
                }
            } else line = line ? line + ' ' + word : word;
        }
        lines.push(line);
    }
    return lines;
}
