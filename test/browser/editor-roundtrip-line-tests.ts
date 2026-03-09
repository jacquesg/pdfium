import { expect, test } from '@playwright/test';
import {
  applySelectedLineStyleEdits,
  saveReloadAndAssertSelectedLine,
  stretchSelectedLineEnd,
} from './editor-roundtrip-line-support.js';
import {
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  selectNewestHitTargetOnPage,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorRoundtripLineTests(): void {
  test('saved line geometry and style round-trip through demo download and upload', async ({ page }, testInfo) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Line');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
      const countAfterCreate = await countHitTargets(page);

      await selectNewestHitTargetOnPage(page, 0);
      const savedPath = testInfo.outputPath('edited-line.pdf');
      const afterLength = await stretchSelectedLineEnd(page);
      await applySelectedLineStyleEdits(page);
      await saveReloadAndAssertSelectedLine(page, savedPath, countAfterCreate, afterLength);
    });
  });
}
