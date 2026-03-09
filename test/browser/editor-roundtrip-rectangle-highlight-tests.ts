import { registerEditorRoundtripHighlightColourTests } from './editor-roundtrip-highlight-colour-tests.js';
import { registerEditorRoundtripRectangleStyleTests } from './editor-roundtrip-rectangle-style-tests.js';

export function registerEditorRoundtripRectangleHighlightTests(): void {
  registerEditorRoundtripRectangleStyleTests();
  registerEditorRoundtripHighlightColourTests();
}
