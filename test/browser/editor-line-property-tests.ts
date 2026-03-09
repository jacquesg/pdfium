import { registerEditorLinePropertyEscapeGuardTests } from './editor-line-property-escape-guard-tests.js';
import { registerEditorLineStylePersistenceTests } from './editor-line-style-persistence-tests.js';

export function registerEditorLinePropertyTests(): void {
  registerEditorLineStylePersistenceTests();
  registerEditorLinePropertyEscapeGuardTests();
}
