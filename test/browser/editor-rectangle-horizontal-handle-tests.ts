import { registerEditorRectangleEastHandleTests } from './editor-rectangle-east-handle-tests.js';
import { registerEditorRectangleSideSquareResizeTests } from './editor-rectangle-side-square-resize-tests.js';
import { registerEditorRectangleWestHandleTests } from './editor-rectangle-west-handle-tests.js';

export function registerEditorRectangleHorizontalHandleTests(): void {
  registerEditorRectangleEastHandleTests();
  registerEditorRectangleWestHandleTests();
  registerEditorRectangleSideSquareResizeTests();
}
