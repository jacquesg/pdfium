import { expect, test } from '@playwright/test';
import { dragLineEndHandle, reselectionPreservesLineLength } from './editor-line-endpoint-persistence-support.js';
import {
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorLineEndpointPersistenceTests(): void {
  test('line endpoint resize updates line geometry and persists after reselection', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Line');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      const target = await selectNewestHitTarget(page);
      const handle = page.locator('[data-testid="handle-end"]');
      const afterLength = await dragLineEndHandle(page, handle);
      await reselectionPreservesLineLength(page, target, afterLength);
    });
  });
}
