import { registerEditorRedactionBasicApplyTests } from './editor-redaction-basic-apply-tests.js';
import { registerEditorRedactionHandToolTests } from './editor-redaction-hand-tool-tests.js';
import { registerEditorRedactionPageScopeTests } from './editor-redaction-page-scope-tests.js';

export function registerEditorRedactionToolTests(): void {
  registerEditorRedactionBasicApplyTests();
  registerEditorRedactionHandToolTests();
  registerEditorRedactionPageScopeTests();
}
