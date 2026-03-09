import { registerEditorRectangleHandleGeometryTests } from './editor-rectangle-handle-geometry-tests.js';
import { registerEditorRectangleRepaintTests } from './editor-rectangle-repaint-tests.js';

export function registerEditorRectangleGeometryTests(): void {
  registerEditorRectangleRepaintTests();
  registerEditorRectangleHandleGeometryTests();
}
