import { expect, type Page } from '@playwright/test';
import { lineLength, parseLineEndpoints, selectNewestHitTargetOnPage } from './editor-test-support.js';

export async function stretchSelectedLineEnd(page: Page, lineInfoTestId = 'line-info'): Promise<number> {
  const lineInfo = page.locator(`[data-testid="${lineInfoTestId}"]`);
  await expect(lineInfo).toBeVisible();
  const beforeText = await lineInfo.innerText();
  const beforeEndpoints = parseLineEndpoints(beforeText);
  expect(beforeEndpoints).not.toBeNull();
  const beforeLength = lineLength(beforeEndpoints!);

  await page.locator('[data-testid="handle-end"]').waitFor();
  await page.keyboard.press('Escape');
  await selectNewestHitTargetOnPage(page, 0);
  await page.locator('[data-testid="handle-end"]').waitFor();
  await page.locator('[data-testid="handle-end"]').hover();
  await page.mouse.down();
  const handle = page.locator('[data-testid="handle-end"]');
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 90, handleBox!.y + handleBox!.height / 2, {
    steps: 8,
  });
  await page.mouse.up();

  await expect.poll(async () => await lineInfo.innerText(), { timeout: 10_000 }).not.toBe(beforeText);
  const afterText = await lineInfo.innerText();
  const afterEndpoints = parseLineEndpoints(afterText);
  expect(afterEndpoints).not.toBeNull();
  const afterLength = lineLength(afterEndpoints!);
  expect(afterLength).toBeGreaterThan(beforeLength + 5);
  return afterLength;
}
