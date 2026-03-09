import { registerEditorLineGeometryTests } from './editor-line-geometry-tests.js';
import { registerEditorShapeGeometryTests } from './editor-shape-geometry-tests.js';

export function registerEditorGeometryAndSelectionTests(): void {
  registerEditorShapeGeometryTests();
  registerEditorLineGeometryTests();
}
