import { registerEditorHistoryStateTests } from './editor-history-state-tests.js';
import { registerEditorModeTransitionTests } from './editor-mode-transition-tests.js';

export function registerEditorHistoryAndModeTests(): void {
  registerEditorModeTransitionTests();
  registerEditorHistoryStateTests();
}
