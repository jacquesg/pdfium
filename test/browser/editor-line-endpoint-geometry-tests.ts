import { registerEditorLineEndpointPersistenceTests } from './editor-line-endpoint-persistence-tests.js';
import { registerEditorLineEndpointSnapTests } from './editor-line-endpoint-snap-tests.js';

export function registerEditorLineEndpointGeometryTests(): void {
  registerEditorLineEndpointPersistenceTests();
  registerEditorLineEndpointSnapTests();
}
