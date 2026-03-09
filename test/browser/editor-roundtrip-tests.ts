import { registerEditorRoundtripLineTests } from './editor-roundtrip-line-tests.js';
import { registerEditorRoundtripRectangleHighlightTests } from './editor-roundtrip-rectangle-highlight-tests.js';

export function registerEditorRoundtripTests(): void {
  registerEditorRoundtripRectangleHighlightTests();
  registerEditorRoundtripLineTests();
}
