import { expect, test } from '@playwright/test';
import {
  clearSelectionByClickingBlankPoint,
  drawRectangle,
  editorBtn,
  expectNoPageErrors,
  getSidebarAnnotationIndices,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorMarkupSidebarSelectionTests(): void {
  test('annotations sidebar selection opens the editor property panel', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const sidebarCountBefore = (await getSidebarAnnotationIndices(page)).length;

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
      await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
      await expect.poll(async () => (await getSidebarAnnotationIndices(page)).length).toBe(sidebarCountBefore + 1);

      const indices = await getSidebarAnnotationIndices(page);
      expect(indices.length).toBeGreaterThan(0);
      const newestIndex = Math.max(...indices);

      await clearSelectionByClickingBlankPoint(page, 0);
      await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

      const panelItem = page.getByRole('button', { name: new RegExp(`#${String(newestIndex)} \\[`) }).first();
      await panelItem.click();

      await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="annotation-type-label"]')).toContainText('Rectangle');
    });
  });
}
