import { registerEditorRectangleHandToolTests } from './editor-rectangle-hand-tool-tests.js';
import { registerEditorRectangleRotationRepaintTests } from './editor-rectangle-rotation-repaint-tests.js';
import { registerEditorRectangleZoomCreationTests } from './editor-rectangle-zoom-creation-tests.js';

export function registerEditorRectangleCreationToolTests(): void {
  registerEditorRectangleZoomCreationTests();
  registerEditorRectangleRotationRepaintTests();
  registerEditorRectangleHandToolTests();
}
