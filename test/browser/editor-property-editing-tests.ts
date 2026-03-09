import { registerEditorPropertyCommitTests } from './editor-property-commit-tests.js';
import { registerEditorPropertyInteractionTests } from './editor-property-interaction-tests.js';
import { registerEditorPropertyStyleTests } from './editor-property-style-tests.js';

export function registerEditorPropertyEditingTests(): void {
  registerEditorPropertyInteractionTests();
  registerEditorPropertyStyleTests();
  registerEditorPropertyCommitTests();
}
