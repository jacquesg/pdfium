import { registerEditorRectangleNorthHandleTests } from './editor-rectangle-north-handle-tests.js';
import { registerEditorRectangleSouthHandleTests } from './editor-rectangle-south-handle-tests.js';

export function registerEditorRectangleVerticalHandleTests(): void {
  registerEditorRectangleNorthHandleTests();
  registerEditorRectangleSouthHandleTests();
}
