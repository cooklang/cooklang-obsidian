import { App } from 'obsidian';
import { CooklangSettings } from '../settings';
import type { RenderContext } from './types';
import type { TFile } from 'obsidian';

export class HeroRenderer {
    constructor(private app: App, private settings: CooklangSettings) {}
    render(_container: HTMLElement, _ctx: RenderContext, _mainImage: TFile | null): void {}
}
