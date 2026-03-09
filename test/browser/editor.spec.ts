import { test } from '@playwright/test';
import { registerEditorCreationAndMarkupTests } from './editor-creation-and-markup-tests.js';
import { registerEditorGeometryAndSelectionTests } from './editor-geometry-and-selection-tests.js';
import { registerEditorHistoryAndModeTests } from './editor-history-and-mode-tests.js';
import { registerEditorPersistenceAndPropertyTests } from './editor-persistence-and-property-tests.js';

test.describe('Editor — end-to-end in browser', () => {
  registerEditorCreationAndMarkupTests();
  registerEditorPersistenceAndPropertyTests();
  registerEditorGeometryAndSelectionTests();
  registerEditorHistoryAndModeTests();
});
