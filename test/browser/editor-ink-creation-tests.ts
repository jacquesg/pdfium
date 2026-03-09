import { expect, test } from '@playwright/test';
import { drawInkStroke, editorBtn, expectNoPageErrors, switchToEditor, switchToTool } from './editor-test-support.js';

export function registerEditorInkCreationTests(): void {
  test('ink tool draws stroke and enables undo/dirty state', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToTool(page, 'Draw');

      const undoBtn = editorBtn(page, 'Undo');
      await expect(undoBtn).toBeDisabled();

      await drawInkStroke(page);
      await expect(undoBtn).toBeEnabled({ timeout: 10_000 });
      await expect(page.locator('[title="Unsaved changes"]')).toBeVisible();
      await expect(editorBtn(page, 'Save')).toBeEnabled();
    });
  });
}
