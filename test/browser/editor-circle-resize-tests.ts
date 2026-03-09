import { registerEditorCircleEastResizeTests } from './editor-circle-east-resize-tests.js';
import { registerEditorCircleSquarePreviewTests } from './editor-circle-square-preview-tests.js';

export function registerEditorCircleResizeTests(): void {
  registerEditorCircleEastResizeTests();
  registerEditorCircleSquarePreviewTests();
}
