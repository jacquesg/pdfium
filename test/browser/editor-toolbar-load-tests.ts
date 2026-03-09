import { expect, test } from '@playwright/test';
import { editorBtn, expectNoPageErrors, isViewerSelectTextActive, switchToEditor } from './editor-test-support.js';

export function registerEditorToolbarLoadTests(): void {
  test('editor toolbar renders after loading PDF', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await expect(editorBtn(page, 'Select')).toHaveCount(0);
      await expect.poll(async () => isViewerSelectTextActive(page)).toBe(true);
    });
  });
}
