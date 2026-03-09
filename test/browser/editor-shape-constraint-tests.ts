import { registerEditorCircleConstraintTests } from './editor-circle-constraint-tests.js';
import { registerEditorLineSnapConstraintTests } from './editor-line-snap-constraint-tests.js';
import { registerEditorRectangleSquareConstraintTests } from './editor-rectangle-square-constraint-tests.js';

export function registerEditorShapeConstraintTests(): void {
  registerEditorRectangleSquareConstraintTests();
  registerEditorCircleConstraintTests();
  registerEditorLineSnapConstraintTests();
}
