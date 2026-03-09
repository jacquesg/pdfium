import { registerEditorLineEndpointGeometryTests } from './editor-line-endpoint-geometry-tests.js';
import { registerEditorLineHitTargetGuardTests } from './editor-line-hit-target-guard-tests.js';
import { registerEditorLinePropertyTests } from './editor-line-property-tests.js';

export function registerEditorLineGeometryTests(): void {
  registerEditorLinePropertyTests();
  registerEditorLineEndpointGeometryTests();
  registerEditorLineHitTargetGuardTests();
}
