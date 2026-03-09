import { expect, type Page } from '@playwright/test';
import { selectTextRangeOnFirstLine } from './editor-test-first-line-selection.js';
import { PAGE_SELECTOR } from './editor-test-geometry.js';
import { expectNativeTextSelection } from './editor-test-selection-assertions.js';
import { selectTextRangeAcrossTwoLines } from './editor-test-two-line-selection.js';

export async function selectTextOnFirstPage(page: Page): Promise<void> {
  const didSelect = await page.locator(PAGE_SELECTOR).evaluate(selectTextRangeOnFirstLine);

  expect(didSelect).toBe(true);
  await expectNativeTextSelection(page);
}

export async function selectTextAcrossTwoLinesOnFirstPage(page: Page): Promise<void> {
  const didSelect = await page.locator(PAGE_SELECTOR).evaluate(selectTextRangeAcrossTwoLines);

  expect(didSelect).toBe(true);
  await expectNativeTextSelection(page);
}
