import { expect, type Page } from '@playwright/test';
import { countHitTargets } from './editor-test-annotation-counts.js';
import { selectNewestHitTarget } from './editor-test-annotation-selection.js';
import { editorBtn, switchToTool, switchToViewerSelectText } from './editor-test-controls.js';
import type { MarkupCase } from './editor-test-markup-cases.js';
import { selectTextOnFirstPage } from './editor-test-text-selection.js';

export async function createTextMarkupAndOpenProperties(page: Page, scenario: MarkupCase): Promise<void> {
  await switchToViewerSelectText(page);
  const countBefore = await countHitTargets(page);
  await selectTextOnFirstPage(page);
  await switchToTool(page, scenario.toolLabel);
  await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
  await switchToViewerSelectText(page);
  await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
  await selectNewestHitTarget(page);

  const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
  await expect(propertyPanel).toBeVisible();
  await expect(page.locator('[data-testid^="handle-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="annotation-type-label"]')).toContainText(
    `Type: ${scenario.expectedTypeLabel}`,
  );
  await expect(propertyPanel).toContainText(`${String(scenario.expectedOpacityPercent)}%`);
}
