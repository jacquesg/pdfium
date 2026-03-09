import { registerEditorHighlightGapGuardTests } from './editor-highlight-gap-guard-tests.js';
import { registerEditorStrikeoutGapGuardTests } from './editor-strikeout-gap-guard-tests.js';
import { registerEditorUnderlineGapGuardTests } from './editor-underline-gap-guard-tests.js';

export function registerEditorMarkupGapGuardTests(): void {
  registerEditorHighlightGapGuardTests();
  registerEditorUnderlineGapGuardTests();
  registerEditorStrikeoutGapGuardTests();
}
