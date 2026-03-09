import { registerRenderBrowserMultiPageTests } from './render-browser-multi-page-tests.js';
import { registerRenderBrowserRenderPageTests } from './render-browser-render-page-tests.js';
import { registerRenderBrowserTextTests } from './render-browser-text-tests.js';

export function registerRenderBrowserPageTests(): void {
  registerRenderBrowserRenderPageTests();
  registerRenderBrowserTextTests();
  registerRenderBrowserMultiPageTests();
}
