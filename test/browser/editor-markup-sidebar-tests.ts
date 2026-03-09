import { registerEditorMarkupColourPersistenceTests } from './editor-markup-colour-persistence-tests.js';
import { registerEditorMarkupSidebarSelectionTests } from './editor-markup-sidebar-selection-tests.js';

export function registerEditorMarkupSidebarTests(): void {
  registerEditorMarkupSidebarSelectionTests();
  registerEditorMarkupColourPersistenceTests();
}
