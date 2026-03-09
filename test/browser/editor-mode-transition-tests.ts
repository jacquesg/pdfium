import { registerEditorModeNeutralToolTests } from './editor-mode-neutral-tool-tests.js';
import { registerEditorModePageSelectionTests } from './editor-mode-page-selection-tests.js';

export function registerEditorModeTransitionTests(): void {
  registerEditorModePageSelectionTests();
  registerEditorModeNeutralToolTests();
}
