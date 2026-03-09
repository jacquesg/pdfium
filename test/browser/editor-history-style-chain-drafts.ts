import type { Page } from '@playwright/test';
import {
  applyRectangleStyleDraft,
  assertRectangleStyleDraft,
  type RectangleStyleDraft,
} from './editor-rectangle-style-support.js';
import {
  clickBlankPointOnPage,
  countHitTargets,
  ensureRectangleCreatedOnPage,
  selectNewestHitTarget,
} from './editor-test-support.js';

const HISTORY_STYLE_CHAIN_DRAFT: RectangleStyleDraft = {
  stroke: '#228833',
  fill: '#1144aa',
  borderWidth: 4,
  opacity: 0.6,
  opacityPattern: /(59|60|61)%/,
};

export async function applyRectangleStyleDrafts(page: Page): Promise<void> {
  await applyRectangleStyleDraft(page, HISTORY_STYLE_CHAIN_DRAFT);
  await assertRectangleStyleDraft(page, HISTORY_STYLE_CHAIN_DRAFT);
}

export async function createSecondRectangleFromDrafts(
  page: Page,
): Promise<{ countAfterFirst: number; countAfterSecond: number }> {
  const countAfterFirst = await countHitTargets(page);
  await clickBlankPointOnPage(page, 0);
  await ensureRectangleCreatedOnPage(page, 0, countAfterFirst);
  const countAfterSecond = await countHitTargets(page);
  return { countAfterFirst, countAfterSecond };
}

export async function assertRectangleStyleDrafts(page: Page): Promise<void> {
  await selectNewestHitTarget(page);
  await assertRectangleStyleDraft(page, HISTORY_STYLE_CHAIN_DRAFT);
}
