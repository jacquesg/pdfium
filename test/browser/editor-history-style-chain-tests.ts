import { registerEditorHistoryStyleCreateChainTests } from './editor-history-style-create-chain-tests.js';
import { registerEditorHistoryStyleFlushTests } from './editor-history-style-flush-tests.js';

export function registerEditorHistoryStyleChainTests(): void {
  registerEditorHistoryStyleFlushTests();
  registerEditorHistoryStyleCreateChainTests();
}
