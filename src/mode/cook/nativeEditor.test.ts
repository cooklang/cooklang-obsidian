// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorState, Prec, type Extension } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import { StreamLanguage, language } from '@codemirror/language';
import { compile } from 'sass';
import { editorInfoField, type MarkdownFileInfo } from 'obsidian';
import { nativeCookEditor } from './nativeEditor';

vi.mock('obsidian', async () => {
    const { StateField } = await import('@codemirror/state');
    return { editorInfoField: StateField.define({ create: () => null, update: value => value }), parseYaml: JSON.parse };
});

const views: EditorView[] = [];
afterEach(() => {
    for (const view of views.splice(0)) view.destroy();
    document.body.replaceChildren();
    document.head.replaceChildren();
});

function setup(path: string, source: string, hostExtensions: Extension = []) {
    const changed = vi.fn();
    const extension = nativeCookEditor(changed);
    const info = { file: { path } } as MarkdownFileInfo;
    const hostLanguage = StreamLanguage.define({ token: stream => { stream.skipToEnd(); return 'comment'; } });
    const parent = document.createElement('div');
    parent.className = 'markdown-source-view';
    document.body.append(parent);
    const view = new EditorView({ parent, state: EditorState.create({ doc: source,
        extensions: [hostLanguage, editorInfoField.init(() => info), hostExtensions, extension] }) });
    views.push(view);
    return { view, info, changed, hostLanguage, decorations: () => view.plugin(extension)!.decorations };
}

describe('native editor decorations', () => {
    it.each(['Dinner.cook', 'Dinner.md'])('isolates native tag styling inside cookware in %s', path => {
        const source = '---\n{"recipe":true,"tags":["recipe"]}\n---\nUse #baking sheet{} and #pot.';
        const start = source.indexOf('#baking');
        const pot = source.indexOf('#pot');
        // Model Obsidian's split hashtag marks, including a low-precedence
        // decoration from a tag plugin that would otherwise wrap our marks.
        const tags = Decoration.set([
            Decoration.mark({ class: 'cm-hashtag cm-hashtag-begin' }).range(start, start + 1),
            Decoration.mark({ class: 'cm-hashtag cm-hashtag-end cm-tag-baking',
                attributes: { style: 'background: red; color: red' } }).range(start + 1, start + 7),
            Decoration.mark({ class: 'cm-hashtag' }).range(pot, pot + 4),
        ]);
        const { view, hostLanguage } = setup(path, source, Prec.lowest(EditorView.decorations.of(tags)));
        const style = document.createElement('style');
        style.textContent = '.cm-hashtag { padding: 4px 8px; border: 2px solid red; border-radius: 10px; }\n'
            + compile('src/styles.scss', { logger: { warn: () => {} } }).css;
        document.head.append(style);

        const wrappers = view.dom.querySelectorAll('.cook-source-cookware');
        expect([...wrappers].map(node => node.textContent)).toEqual(['#baking sheet', '#pot']);
        const nativeTags = view.dom.querySelectorAll<HTMLElement>('.cm-hashtag');
        expect(nativeTags.length).toBe(3);
        for (const tag of nativeTags) {
            expect(tag.closest('.cook-source-cookware')).not.toBeNull();
            const css = getComputedStyle(tag);
            expect(css.padding).toBe('0px');
            expect(css.borderRadius).toBe('0px');
        }
        expect(view.state.facet(language)).toBe(hostLanguage);
        // Removing recipe eligibility restores normal Markdown tag styling.
        view.dispatch({ changes: { from: source.indexOf('true'), to: source.indexOf('true') + 4, insert: 'false' } });
        expect(view.dom.querySelector('.cook-source-cookware') === null).toBe(path.endsWith('.md'));
    });

    it('leaves ordinary Markdown hashtags and recipe frontmatter tags alone', () => {
        const tag = EditorView.decorations.of(Decoration.set([
            Decoration.mark({ class: 'cm-hashtag' }).range(0, 7),
        ]));
        const { view } = setup('Note.md', '#baking', tag);
        expect(view.dom.querySelector('.cm-hashtag')?.textContent).toBe('#baking');
        expect(view.dom.querySelector('.cook-source-cookware')).toBeNull();
        const recipe = setup('Dinner.cook', '---\ntags: [#recipe]\n---\nUse #pot.');
        expect([...recipe.view.dom.querySelectorAll('.cook-source-cookware')].map(node => node.textContent)).toEqual(['#pot']);
    });

    it('keeps the host language while applying and updating Cooklang marks', () => {
        const { view, decorations, hostLanguage } = setup('Dinner.cook', 'Mix @rice in #pot.');
        expect(decorations().size).toBe(2);
        expect(view.state.facet(language)).toBe(hostLanguage);
        view.dispatch({ changes: { from: 4, to: 9, insert: '@Möhre{2%g}' } });
        expect(decorations().size).toBe(3);
        expect(view.state.facet(language)).toBe(hostLanguage);
    });

    it('rechecks associated file changes even when text does not change', () => {
        const { view, info, decorations } = setup('Dinner.cook', 'Mix @rice.');
        expect(decorations().size).toBe(1);
        info.file!.path = 'Dinner.md';
        view.dispatch({});
        expect(decorations().size).toBe(0);
        info.file!.path = 'Dinner.cook.md';
        view.dispatch({});
        expect(decorations().size).toBe(1);
    });

    it('activates and deactivates immediately for unsaved Boolean property edits', () => {
        const source = '---\n{"recipe":false}\n---\n@rice';
        const { view, changed, decorations } = setup('Dinner.md', source);
        expect(decorations().size).toBe(0);
        view.dispatch({ changes: { from: 0, to: source.length, insert: source.replace('false', 'true') } });
        expect(decorations().size).toBeGreaterThan(0);
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } });
        expect(decorations().size).toBe(0);
        expect(changed).toHaveBeenCalledTimes(3);
    });
});
