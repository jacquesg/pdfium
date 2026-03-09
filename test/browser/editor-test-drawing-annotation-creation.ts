import type { Page } from '@playwright/test';
import { drawRectangleOnPage, getFirstPageBox } from './editor-test-geometry.js';

export async function drawInkStroke(page: Page): Promise<void> {
  const box = await getFirstPageBox(page);
  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.3;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(startX + i * 12, startY + i * 8);
  }
  await page.mouse.up();
}

export async function drawRectangle(page: Page): Promise<void> {
  await drawRectangleOnPage(page, 0);
}
