import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  drawInkStroke,
  editorBtn,
  ensureRectangleCreatedOnPage,
  expectNoPageErrors,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorHistoryBasicTests(): void {
  test('undo reverses last action and enables redo', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToTool(page, 'Draw');
      await drawInkStroke(page);

      const undoBtn = editorBtn(page, 'Undo');
      const redoBtn = editorBtn(page, 'Redo');
      await expect(undoBtn).toBeEnabled({ timeout: 10_000 });

      await undoBtn.click();
      await expect(redoBtn).toBeEnabled({ timeout: 10_000 });
      await expect(undoBtn).toBeDisabled();
      await expect(page.locator('[title="Unsaved changes"]')).not.toBeVisible();
    });
  });

  test('undo clears selected annotation UI state (selection box + property sidebar)', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await ensureRectangleCreatedOnPage(page, 0, countBefore);

      await selectNewestHitTarget(page);
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="editor-property-sidebar"]')).toBeVisible();

      const undoBtn = editorBtn(page, 'Undo');
      await expect(undoBtn).toBeEnabled({ timeout: 10_000 });
      await undoBtn.click({ force: true });

      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="editor-property-sidebar"]')).toHaveCount(0);
      await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countBefore);
    });
  });
}
