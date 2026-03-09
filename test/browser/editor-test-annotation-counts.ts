import type { Page } from '@playwright/test';
import { HIT_TARGET_SELECTOR } from './editor-test-hit-target.constants.js';

export async function countHitTargets(page: Page): Promise<number> {
  return page.locator(HIT_TARGET_SELECTOR).count();
}

export async function countHitTargetsOnPage(page: Page, pageIndex: number): Promise<number> {
  return page.locator(`[data-page-index="${String(pageIndex)}"] ${HIT_TARGET_SELECTOR}`).count();
}

export async function countRedactionsOnPage(page: Page, pageIndex: number): Promise<number> {
  return page.locator(`[data-page-index="${String(pageIndex)}"] [data-testid^="redaction-rect-"]`).count();
}
