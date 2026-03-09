import { registerEditorPropertyDeleteGuardTests } from './editor-property-delete-guard-tests.js';
import { registerEditorPropertyMarkupToolExitTests } from './editor-property-markup-tool-exit-tests.js';
import { registerEditorPropertySelectionClearTests } from './editor-property-selection-clear-tests.js';

export function registerEditorPropertyInteractionTests(): void {
  registerEditorPropertyMarkupToolExitTests();
  registerEditorPropertySelectionClearTests();
  registerEditorPropertyDeleteGuardTests();
}
