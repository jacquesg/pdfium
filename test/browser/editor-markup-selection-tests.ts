import { registerEditorMarkupCreationTests } from './editor-markup-creation-tests.js';
import { registerEditorMarkupGapGuardTests } from './editor-markup-gap-guard-tests.js';
import { registerEditorMarkupSidebarTests } from './editor-markup-sidebar-tests.js';

export function registerEditorMarkupSelectionTests(): void {
  registerEditorMarkupCreationTests();
  registerEditorMarkupSidebarTests();
  registerEditorMarkupGapGuardTests();
}
