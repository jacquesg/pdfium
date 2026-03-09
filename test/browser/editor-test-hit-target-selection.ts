import { expect, type Locator, type Page } from '@playwright/test';
import { getHitTargetIndices } from './editor-test-annotation-indices.js';
import { clearSelectionByClickingBlankPoint, clickReachableLocator } from './editor-test-geometry.js';
import { HIT_TARGET_SELECTOR } from './editor-test-hit-target.constants.js';

export async function selectHitTargetByIndex(page: Page, annotationIndex: number): Promise<Locator> {
  const selector = `${HIT_TARGET_SELECTOR}[data-annotation-index="${String(annotationIndex)}"]`;
  const target = page.locator(selector).last();
  const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
  await expect.poll(async () => page.locator(selector).count()).toBeGreaterThan(0);
  await clickReachableLocator(page, target);
  if (!(await propertyPanel.isVisible().catch(() => false))) {
    const pageIndex = await target
      .evaluate((node) => {
        const container = node.closest('[data-page-index]');
        const value = container?.getAttribute('data-page-index');
        const parsed = Number.parseInt(value ?? '', 10);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
      })
      .catch(() => Number.NaN);
    if (Number.isFinite(pageIndex)) {
      await clearSelectionByClickingBlankPoint(page, pageIndex);
      await clickReachableLocator(page, target);
    }
  }
  return target;
}

export async function selectNewestHitTarget(page: Page): Promise<Locator> {
  const indices = await getHitTargetIndices(page);
  expect(indices.length).toBeGreaterThan(0);
  const newestIndex = Math.max(...indices);
  return selectHitTargetByIndex(page, newestIndex);
}
