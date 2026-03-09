import { registerEditorPropertyRapidConvergenceTests } from './editor-property-rapid-convergence-tests.js';
import { registerEditorPropertyShapePersistenceTests } from './editor-property-shape-persistence-tests.js';

export function registerEditorPropertyPersistenceTests(): void {
  registerEditorPropertyShapePersistenceTests();
  registerEditorPropertyRapidConvergenceTests();
}
