import { registerMarkupGapSelectionGuard } from './editor-markup-gap-guard-support.js';

export function registerEditorHighlightGapGuardTests(): void {
  registerMarkupGapSelectionGuard(
    'Highlight',
    'multi-segment highlight hit targets do not select through the gap between quads',
  );
}
