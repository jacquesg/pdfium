import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  drawRectangle,
  editorBtn,
  expectNoPageErrors,
  getSidebarAnnotationIndices,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorRectangleCreationSelectionTests(): void {
  test('rectangle tool creates shape annotation', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');

      await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    });
  });

  test('newly created rectangle is auto-selected for immediate editing', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const sidebarCountBefore = (await getSidebarAnnotationIndices(page)).length;
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);

      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
      await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
      await expect.poll(async () => (await getSidebarAnnotationIndices(page)).length).toBe(sidebarCountBefore + 1);
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="annotation-type-label"]')).toContainText('Rectangle');
    });
  });
}
