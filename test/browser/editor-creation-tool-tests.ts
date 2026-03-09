import { registerEditorBasicCreationToolTests } from './editor-basic-creation-tool-tests.js';
import { registerEditorLineCreationToolTests } from './editor-line-creation-tool-tests.js';
import { registerEditorRectangleCreationToolTests } from './editor-rectangle-creation-tool-tests.js';
import { registerEditorRedactionToolTests } from './editor-redaction-tool-tests.js';

export function registerEditorCreationToolTests(): void {
  registerEditorBasicCreationToolTests();
  registerEditorLineCreationToolTests();
  registerEditorRectangleCreationToolTests();
  registerEditorRedactionToolTests();
}
