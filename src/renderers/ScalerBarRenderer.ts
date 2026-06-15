import { CooklangSettings } from '../settings';
import type { RenderContext } from './types';

export class ScalerBarRenderer {
    constructor(private settings: CooklangSettings) {}
    render(_container: HTMLElement, _ctx: RenderContext): void {}
}
