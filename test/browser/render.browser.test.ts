import { registerRenderBrowserDisposalTests } from './render-browser-disposal-tests.js';
import { registerRenderBrowserPageTests } from './render-browser-page-tests.js';
import { registerRenderBrowserRuntimeTests } from './render-browser-runtime-tests.js';

registerRenderBrowserRuntimeTests();
registerRenderBrowserPageTests();
registerRenderBrowserDisposalTests();
