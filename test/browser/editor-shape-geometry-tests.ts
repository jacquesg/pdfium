import { registerEditorCircleGeometryTests } from './editor-circle-geometry-tests.js';
import { registerEditorRectangleGeometryTests } from './editor-rectangle-geometry-tests.js';
import { registerEditorShapeConstraintTests } from './editor-shape-constraint-tests.js';

export function registerEditorShapeGeometryTests(): void {
  registerEditorShapeConstraintTests();
  registerEditorRectangleGeometryTests();
  registerEditorCircleGeometryTests();
}
