import { expect, type Page } from '@playwright/test';
import {
  countHitTargets,
  getHitTargetIndices,
  HIT_TARGET_SELECTOR,
  saveEditedDocument,
  selectNewestHitTargetOnPage,
  switchToViewerSelectText,
  uploadPdfFile,
} from './editor-test-support.js';

export async function saveReloadAndAssertHighlightColour(
  page: Page,
  savedPath: string,
  expectedCount: number,
): Promise<void> {
  const download = await saveEditedDocument(page);
  await download.saveAs(savedPath);

  await uploadPdfFile(page, savedPath, 'edited-highlight.pdf');
  await switchToViewerSelectText(page);
  await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(expectedCount);

  const newestIndex = await getNewestHighlightIndex(page);
  const segmentTargets = page.locator(`${HIT_TARGET_SELECTOR}[data-annotation-index="${String(newestIndex)}"]`);
  await expect(segmentTargets).toHaveCount(2);
  await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
  await selectNewestHitTargetOnPage(page, 0);

  await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="selection-markup-overlay"]')).toBeVisible();
  await expect
    .poll(async () => await page.locator('[data-testid="interior-colour-input"]').inputValue())
    .toBe('#00ff00');
}

async function getNewestHighlightIndex(page: Page): Promise<number> {
  const indices = await getHitTargetIndices(page);
  expect(indices.length).toBeGreaterThan(0);
  return Math.max(...indices);
}
