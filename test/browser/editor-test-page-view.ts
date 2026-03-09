import { expect, type Page } from '@playwright/test';

export const PAGE_SELECTOR = '[data-page-index="0"]';

export interface PageBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export async function getPageBox(page: Page, pageIndex: number): Promise<PageBox> {
  const selector = `[data-page-index="${String(pageIndex)}"]`;
  const pageRoot = page.locator(selector);
  await expect(pageRoot).toBeVisible({ timeout: 10_000 });
  await pageRoot.scrollIntoViewIfNeeded();
  const box = await pageRoot.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

export async function getFirstPageBox(page: Page): Promise<PageBox> {
  return getPageBox(page, 0);
}

export async function centerPageInView(page: Page, pageIndex: number): Promise<void> {
  await page
    .locator(`[data-page-index="${String(pageIndex)}"]`)
    .first()
    .evaluate((node) => {
      if (node instanceof HTMLElement) {
        node.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    });
}

export async function getSelectionOverlayBox(page: Page): Promise<PageBox> {
  const overlay = page.locator('[data-testid="selection-overlay"]');
  await expect(overlay).toBeVisible();
  const box = await overlay.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}
