import { registerEditorPropertyEditingTests } from './editor-property-editing-tests.js';
import { registerEditorRoundtripTests } from './editor-roundtrip-tests.js';

export function registerEditorPersistenceAndPropertyTests(): void {
  registerEditorRoundtripTests();
  registerEditorPropertyEditingTests();
}
