import { registerEditorLinePreviewHandleTests } from './editor-line-preview-handle-tests.js';
import { registerEditorLinePreviewLiveInfoTests } from './editor-line-preview-live-info-tests.js';

export function registerEditorLineSelectionPreviewTests(): void {
  registerEditorLinePreviewHandleTests();
  registerEditorLinePreviewLiveInfoTests();
}
