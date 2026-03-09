import { registerEditorModeNeutralResetTests } from './editor-mode-neutral-reset-tests.js';
import { registerEditorModeSwitchStabilityTests } from './editor-mode-switch-stability-tests.js';
import { registerEditorModeToolAvailabilityTests } from './editor-mode-tool-availability-tests.js';

export function registerEditorModeNeutralToolTests(): void {
  registerEditorModeSwitchStabilityTests();
  registerEditorModeNeutralResetTests();
  registerEditorModeToolAvailabilityTests();
}
