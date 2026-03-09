import { test } from '@playwright/test';
import {
  createStyledRectangle,
  saveReloadAndAssertStyledRectangle,
} from './editor-roundtrip-rectangle-style-support.js';
import { expectNoPageErrors, switchToEditor } from './editor-test-support.js';

export function registerEditorRoundtripRectangleStyleTests(): void {
  test('saved rectangle styles round-trip through demo download and upload', async ({ page }, testInfo) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      const savedPath = testInfo.outputPath('edited.pdf');
      const expectedCount = await createStyledRectangle(page);
      await saveReloadAndAssertStyledRectangle(page, savedPath, expectedCount);
    });
  });
}
