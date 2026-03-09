import { registerMarkupGapSelectionGuard } from './editor-markup-gap-guard-support.js';

export function registerEditorUnderlineGapGuardTests(): void {
  registerMarkupGapSelectionGuard(
    'Underline',
    'multi-segment underline hit targets do not select through the gap between segments',
  );
}
