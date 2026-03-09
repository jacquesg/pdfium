import { registerEditorCreationToolTests } from './editor-creation-tool-tests.js';
import { registerEditorMarkupSelectionTests } from './editor-markup-selection-tests.js';

export function registerEditorCreationAndMarkupTests(): void {
  registerEditorCreationToolTests();
  registerEditorMarkupSelectionTests();
}
