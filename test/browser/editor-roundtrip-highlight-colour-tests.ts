import { test } from '@playwright/test';
import {
  createStyledHighlight,
  saveReloadAndAssertHighlightColour,
} from './editor-roundtrip-highlight-colour-support.js';
import { expectNoPageErrors, switchToEditor } from './editor-test-support.js';

export function registerEditorRoundtripHighlightColourTests(): void {
  test('saved multi-segment highlight colour round-trips through demo download and upload', async ({
    page,
  }, testInfo) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      const savedPath = testInfo.outputPath('edited-highlight.pdf');
      const expectedCount = await createStyledHighlight(page);
      await saveReloadAndAssertHighlightColour(page, savedPath, expectedCount);
    });
  });
}
