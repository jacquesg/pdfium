import { registerEditorRectangleHorizontalHandleTests } from './editor-rectangle-horizontal-handle-tests.js';
import { registerEditorRectangleVerticalHandleTests } from './editor-rectangle-vertical-handle-tests.js';

export function registerEditorRectangleHandleGeometryTests(): void {
  registerEditorRectangleHorizontalHandleTests();
  registerEditorRectangleVerticalHandleTests();
}
