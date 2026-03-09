import { expect, test } from '@playwright/test';
import {
  applyRectangleStyleDrafts,
  assertRectangleStyleDrafts,
  createSecondRectangleFromDrafts,
  undoRedoRectangleCreateChain,
} from './editor-history-style-chain-support.js';
import {
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorHistoryStyleCreateChainTests(): void {
  test('style edits + create stay coherent across undo/redo chain', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      await selectNewestHitTarget(page);
      await applyRectangleStyleDrafts(page);
      const { countAfterFirst, countAfterSecond } = await createSecondRectangleFromDrafts(page);
      await assertRectangleStyleDrafts(page);
      await undoRedoRectangleCreateChain(page, countAfterFirst, countAfterSecond);
      await assertRectangleStyleDrafts(page);
    });
  });
}
