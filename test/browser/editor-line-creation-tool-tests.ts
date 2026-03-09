import { registerEditorLineActivationTests } from './editor-line-activation-tests.js';
import { registerEditorLineSelectionPreviewTests } from './editor-line-selection-preview-tests.js';

export function registerEditorLineCreationToolTests(): void {
  registerEditorLineActivationTests();
  registerEditorLineSelectionPreviewTests();
}
