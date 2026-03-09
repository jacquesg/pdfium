import { expect, type Page } from '@playwright/test';
import { resolveBlankPointOnPage } from './editor-test-blank-point-resolver.js';

export async function clickBlankPointOnPage(page: Page, pageIndex: number): Promise<void> {
  const resolveBlankPoint = async () => {
    return page.evaluate(resolveBlankPointOnPage, pageIndex);
  };

  let point = await resolveBlankPoint();
  if (point === null) {
    await page
      .locator(`[data-page-index="${String(pageIndex)}"]`)
      .first()
      .evaluate((node) => {
        if (node instanceof HTMLElement) {
          node.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
      });
    point = await resolveBlankPoint();
  }

  expect(point).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

export async function clearSelectionByClickingBlankPoint(page: Page, pageIndex: number): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await clickBlankPointOnPage(page, pageIndex);
    if ((await page.locator('[data-testid="selection-overlay"]').count()) === 0) {
      return;
    }
  }
}
