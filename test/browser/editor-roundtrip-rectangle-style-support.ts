import { expect, type Page } from '@playwright/test';
import {
  applyRectangleStyleDraft,
  assertRectangleStyleDraft,
  type RectangleStyleDraft,
} from './editor-rectangle-style-support.js';
import {
  countHitTargets,
  drawRectangle,
  saveEditedDocument,
  selectNewestHitTargetOnPage,
  switchToTool,
  switchToViewerSelectText,
  uploadPdfFile,
} from './editor-test-support.js';

const ROUNDTRIP_RECTANGLE_DRAFT: RectangleStyleDraft = {
  stroke: '#ff0000',
  fill: '#00ff00',
  borderWidth: 5,
  opacity: 1,
  opacityPattern: /(99|100)%/,
};

export async function createStyledRectangle(page: Page): Promise<number> {
  const countBefore = await countHitTargets(page);

  await switchToTool(page, 'Rectangle');
  await drawRectangle(page);
  await switchToViewerSelectText(page);
  await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

  await selectNewestHitTargetOnPage(page, 0);
  await applyRectangleStyleDraft(page, ROUNDTRIP_RECTANGLE_DRAFT);
  await assertRectangleStyleDraft(page, ROUNDTRIP_RECTANGLE_DRAFT);

  return countBefore + 1;
}

export async function saveReloadAndAssertStyledRectangle(
  page: Page,
  savedPath: string,
  expectedCount: number,
): Promise<void> {
  const download = await saveEditedDocument(page);
  await download.saveAs(savedPath);

  await uploadPdfFile(page, savedPath, 'edited.pdf');
  await switchToViewerSelectText(page);
  await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(expectedCount);

  await selectNewestHitTargetOnPage(page, 0);
  await assertRectangleStyleDraft(page, ROUNDTRIP_RECTANGLE_DRAFT);
}
