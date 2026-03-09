import { expect, test } from '@playwright/test';
import {
  drawRectangleOnPage,
  expectNoPageErrors,
  getHitTargetIndices,
  selectHitTargetByIndex,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorLineSnapConstraintTests(): void {
  test('shift-constrained line creation snaps to cardinal or 45-degree geometry', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);

      const lineIndicesBefore = new Set(await getHitTargetIndices(page));
      await switchToTool(page, 'Line');
      await drawRectangleOnPage(page, 0, { shiftKey: true });
      await switchToViewerSelectText(page);

      let lineIndex = -1;
      await expect
        .poll(async () => {
          const current = await getHitTargetIndices(page);
          const created = current.filter((index) => !lineIndicesBefore.has(index));
          if (created.length > 0) {
            lineIndex = created[0] ?? -1;
          }
          return created.length;
        })
        .toBeGreaterThan(0);
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      await selectHitTargetByIndex(page, lineIndex);

      const typeLabel = page.locator('[data-testid="annotation-type-label"]');
      await expect(typeLabel).toContainText('Type: Line');

      const lineInfo = page.locator('[data-testid="line-info"]');
      await expect(lineInfo).toBeVisible();
      const text = await lineInfo.innerText();
      const match = text.match(/Line:\s*\(([-\d.]+),\s*([-\d.]+)\)\s+to\s+\(([-\d.]+),\s*([-\d.]+)\)/);
      expect(match).not.toBeNull();
      const startX = Number.parseFloat(match?.[1] ?? 'NaN');
      const startY = Number.parseFloat(match?.[2] ?? 'NaN');
      const endX = Number.parseFloat(match?.[3] ?? 'NaN');
      const endY = Number.parseFloat(match?.[4] ?? 'NaN');
      const dx = Math.abs(endX - startX);
      const dy = Math.abs(endY - startY);
      expect(dx < 1 || dy < 1 || Math.abs(dx - dy) < 1).toBe(true);
    });
  });
}
