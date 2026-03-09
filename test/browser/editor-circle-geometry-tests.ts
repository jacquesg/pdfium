import { registerEditorCircleHitTargetGuardTests } from './editor-circle-hit-target-guard-tests.js';
import { registerEditorCircleResizeTests } from './editor-circle-resize-tests.js';

export function registerEditorCircleGeometryTests(): void {
  registerEditorCircleResizeTests();
  registerEditorCircleHitTargetGuardTests();
}
