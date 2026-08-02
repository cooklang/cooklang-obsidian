/**
 * Preserve line boundaries between adjacent Cooklang note lines.
 *
 * The canonical parser joins consecutive `>` lines with a space. Adding its
 * continuation marker keeps the newline in the parsed note; the repeated `>`
 * is removed later when the section view model is built.
 */
export function preserveAdjacentNoteLineBreaks(input: string): string {
    return input.replace(
        /^([ \t]*>(?!>)[^\r\n]*)(\r?\n)(?=[ \t]*>(?!>))/gm,
        (_match, line: string, newline: string) => {
            const trailingWhitespace = line.match(/[ \t]*$/)?.[0] ?? '';
            const content = line.slice(0, line.length - trailingWhitespace.length);

            // Keep an existing continuation marker and ensure it remains the
            // final character before the newline.
            if (content.endsWith('\\')) {
                return content + newline;
            }

            return line + '\\' + newline;
        },
    );
}
