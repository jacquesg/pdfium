import { registerMarkupGapSelectionGuard } from './editor-markup-gap-guard-support.js';

export function registerEditorStrikeoutGapGuardTests(): void {
  registerMarkupGapSelectionGuard(
    'Strikeout',
    'multi-segment strikeout hit targets do not select through the gap between segments',
  );
}
