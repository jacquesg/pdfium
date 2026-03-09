import { registerEditorRectangleBorderRepaintTests } from './editor-rectangle-border-repaint-tests.js';
import { registerEditorRectangleLivePreviewTests } from './editor-rectangle-live-preview-tests.js';
import { registerEditorRectangleResizeRepaintTests } from './editor-rectangle-resize-repaint-tests.js';

export function registerEditorRectangleRepaintTests(): void {
  registerEditorRectangleBorderRepaintTests();
  registerEditorRectangleResizeRepaintTests();
  registerEditorRectangleLivePreviewTests();
}
