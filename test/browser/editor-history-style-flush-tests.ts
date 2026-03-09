import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  drawRectangle,
  editorBtn,
  expectNoPageErrors,
  getHitTargetIndices,
  selectHitTargetByIndex,
  setColourInput,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorHistoryStyleFlushTests(): void {
  test('undo flushes pending style drafts before history navigation', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const indicesBefore = await getHitTargetIndices(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      const indicesAfterCreate = await getHitTargetIndices(page);
      const createdAnnotationIndex = indicesAfterCreate.find((index) => !indicesBefore.includes(index));
      expect(createdAnnotationIndex).toBeDefined();
      const countAfterCreate = await countHitTargets(page);
      await selectHitTargetByIndex(page, createdAnnotationIndex!);
      const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
      await expect(strokeInput).toBeVisible();

      await setColourInput(strokeInput, '#00ff00');

      await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
      await editorBtn(page, 'Undo').click();
      await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countAfterCreate);
      await selectHitTargetByIndex(page, createdAnnotationIndex!);
      await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
    });
  });
}
