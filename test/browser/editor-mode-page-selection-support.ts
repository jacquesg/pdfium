import { expect, type Page } from '@playwright/test';
import {
  countHitTargetsOnPage,
  ensureRectangleCreatedOnPage,
  selectNewestHitTargetOnPage,
} from './editor-test-support.js';

export async function createRectanglesOnFirstTwoPages(page: Page): Promise<{
  page0Before: number;
  page1Before: number;
  page0AfterCreate: number;
  page1AfterCreate: number;
}> {
  const page0Before = await countHitTargetsOnPage(page, 0);
  const page1Before = await countHitTargetsOnPage(page, 1);

  await ensureRectangleCreatedOnPage(page, 0, page0Before);
  await ensureRectangleCreatedOnPage(page, 1, page1Before);

  return {
    page0Before,
    page1Before,
    page0AfterCreate: await countHitTargetsOnPage(page, 0),
    page1AfterCreate: await countHitTargetsOnPage(page, 1),
  };
}

export async function expectOnlyPageSelectionVisible(page: Page, pageIndex: 0 | 1): Promise<void> {
  await expect(page.locator('[data-page-index="0"] [data-testid="selection-overlay"]')).toHaveCount(
    pageIndex === 0 ? 1 : 0,
  );
  await expect(page.locator('[data-page-index="1"] [data-testid="selection-overlay"]')).toHaveCount(
    pageIndex === 1 ? 1 : 0,
  );
}

export async function selectNewestHitTargetAndAssertPageSelection(page: Page, pageIndex: 0 | 1): Promise<void> {
  await selectNewestHitTargetOnPage(page, pageIndex);
  await expectOnlyPageSelectionVisible(page, pageIndex);
}
