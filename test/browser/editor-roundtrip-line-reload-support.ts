import { expect, type Page } from '@playwright/test';
import {
  lineLength,
  parseLineEndpoints,
  saveEditedDocument,
  selectNewestHitTargetOnPage,
  switchToViewerSelectText,
  uploadPdfFile,
} from './editor-test-support.js';

export async function saveReloadAndAssertSelectedLine(
  page: Page,
  savedPath: string,
  expectedCount: number,
  expectedLength: number,
): Promise<void> {
  const download = await saveEditedDocument(page);
  await download.saveAs(savedPath);

  await uploadPdfFile(page, savedPath, 'edited-line.pdf');
  await switchToViewerSelectText(page);
  await expect
    .poll(() => page.locator('[data-testid="select-hit-target"]').count(), { timeout: 10_000 })
    .toBe(expectedCount);

  await selectNewestHitTargetOnPage(page, 0);
  await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
  const persistedText = await page.locator('[data-testid="line-info"]').innerText();
  const persistedEndpoints = parseLineEndpoints(persistedText);
  expect(persistedEndpoints).not.toBeNull();
  const persistedLength = lineLength(persistedEndpoints!);
  expect(Math.abs(persistedLength - expectedLength)).toBeLessThan(2);
  await expect
    .poll(async () => await page.locator('[data-testid="border-width-input"]').inputValue())
    .toMatch(/^2(?:\.0+)?$/);
  await expect(page.locator('[data-testid="annotation-property-panel"]')).toContainText(/(49|50|51)%/);
}
