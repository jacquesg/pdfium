import { expect, type Locator, type Page } from '@playwright/test';
import { centerPageInView, clearSelectionByClickingBlankPoint, clickReachableLocator } from './editor-test-geometry.js';
import { HIT_TARGET_SELECTOR } from './editor-test-hit-target.constants.js';
import { getNewestAnnotationIndexFromLocator } from './editor-test-page-hit-target-index.js';
import { clickSidebarItemForAnnotation } from './editor-test-sidebar-item-selection.js';

export async function selectNewestHitTargetOnPage(page: Page, pageIndex: number): Promise<Locator> {
  await centerPageInView(page, pageIndex);
  const scopedHitTargets = page.locator(`[data-page-index="${String(pageIndex)}"] ${HIT_TARGET_SELECTOR}`);
  await expect.poll(() => scopedHitTargets.count(), { timeout: 10_000 }).toBeGreaterThan(0);
  const newestIndex = await getNewestAnnotationIndexFromLocator(scopedHitTargets);
  if (newestIndex === null) {
    const fallbackTarget = scopedHitTargets.last();
    await clickReachableLocator(page, fallbackTarget);
    return fallbackTarget;
  }
  const selector = `[data-page-index="${String(pageIndex)}"] ${HIT_TARGET_SELECTOR}[data-annotation-index="${String(newestIndex)}"]`;
  const target = page.locator(selector).last();
  await expect.poll(async () => page.locator(selector).count()).toBeGreaterThan(0);
  await clickReachableLocator(page, target);
  return target;
}

export async function ensureNewestHitTargetOnPageOpensProperties(page: Page, pageIndex: number): Promise<Locator> {
  const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
  let target: Locator | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    await centerPageInView(page, pageIndex);
    target = await selectNewestHitTargetOnPage(page, pageIndex);
    if (await propertyPanel.isVisible().catch(() => false)) {
      return target;
    }
    await clearSelectionByClickingBlankPoint(page, pageIndex);
  }
  if (target !== null) {
    const annotationIndex = await target
      .getAttribute('data-annotation-index')
      .then((value) => Number.parseInt(value ?? '', 10))
      .catch(() => Number.NaN);
    if (Number.isFinite(annotationIndex) && (await clickSidebarItemForAnnotation(page, annotationIndex))) {
      if (await propertyPanel.isVisible().catch(() => false)) {
        return target;
      }
    }
  }
  await expect(propertyPanel).toBeVisible();
  return target!;
}
