import { registerEditorHistoryBasicTests } from './editor-history-basic-tests.js';
import { registerEditorHistoryStyleChainTests } from './editor-history-style-chain-tests.js';

export function registerEditorHistoryStateTests(): void {
  registerEditorHistoryBasicTests();
  registerEditorHistoryStyleChainTests();
}
