import { registerEditorInkCreationTests } from './editor-ink-creation-tests.js';
import { registerEditorRectangleCreationSelectionTests } from './editor-rectangle-creation-selection-tests.js';
import { registerEditorToolbarLoadTests } from './editor-toolbar-load-tests.js';

export function registerEditorBasicCreationToolTests(): void {
  registerEditorToolbarLoadTests();
  registerEditorInkCreationTests();
  registerEditorRectangleCreationSelectionTests();
}
