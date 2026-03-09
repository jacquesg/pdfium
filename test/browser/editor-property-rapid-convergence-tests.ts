import { expect, test } from '@playwright/test';
import {
  applyRapidRectanglePropertyEdits,
  assertRapidRectanglePropertyEdits,
  reselectRectangleAndAssertRapidEdits,
} from './editor-property-rapid-convergence-support.js';
import {
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorPropertyRapidConvergenceTests(): void {
  test('rapid rectangle property edits converge to the final values', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      const target = await selectNewestHitTarget(page);
      const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
      await applyRapidRectanglePropertyEdits(page, propertyPanel);
      await assertRapidRectanglePropertyEdits(page, propertyPanel);
      await reselectRectangleAndAssertRapidEdits(page, propertyPanel, target);
    });
  });
}
