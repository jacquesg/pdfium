import { registerEditorPropertyDefaultStyleTests } from './editor-property-default-style-tests.js';
import { registerEditorPropertyPersistenceTests } from './editor-property-persistence-tests.js';

export function registerEditorPropertyStyleTests(): void {
  registerEditorPropertyPersistenceTests();
  registerEditorPropertyDefaultStyleTests();
}
