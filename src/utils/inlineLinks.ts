export type InlineSegment =
    | { type: "text"; value: string }
    | { type: "wiki"; linktext: string; label: string }
    | { type: "url"; href: string; label: string };

const LINK = /\[\[([^\[\]\n]+?)\]\]|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

function wikiParts(inner: string): { linktext: string; label: string } {
    const [target, alias] = inner.split("|");
    const linktext = target.trim();
    const label = (alias ?? target).trim();
    return { linktext, label: label || linktext };
}

export function splitInlineLinks(value: string): InlineSegment[] {
    const segments: InlineSegment[] = [];
    let cursor = 0;
    for (const match of value.matchAll(LINK)) {
        const start = match.index ?? 0;
        if (start > cursor) segments.push({ type: "text", value: value.slice(cursor, start) });
        if (match[1] !== undefined) {
            segments.push({ type: "wiki", ...wikiParts(match[1]) });
        } else {
            segments.push({ type: "url", label: match[2].trim(), href: match[3] });
        }
        cursor = start + match[0].length;
    }
    if (cursor < value.length) segments.push({ type: "text", value: value.slice(cursor) });
    return segments;
}
