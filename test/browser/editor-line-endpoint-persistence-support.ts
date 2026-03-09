import { expect, type Locator, type Page } from '@playwright/test';
import { clickBlankPointOnPage, clickReachableLocator, lineLength, parseLineEndpoints } from './editor-test-support.js';

export async function dragLineEndHandle(page: Page, handle: Locator): Promise<number> {
  const lineInfo = page.locator('[data-testid="line-info"]');
  await expect(lineInfo).toBeVisible();
  const beforeText = await lineInfo.innerText();
  const beforeEndpoints = parseLineEndpoints(beforeText);
  expect(beforeEndpoints).not.toBeNull();
  const beforeLength = lineLength(beforeEndpoints!);

  await expect(handle).toBeVisible();
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
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

export async function reselectionPreservesLineLength(
  page: Page,
  target: Locator,
  expectedLength: number,
): Promise<void> {
  const lineInfo = page.locator('[data-testid="line-info"]');

  await clickBlankPointOnPage(page, 0);
  await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

  await clickReachableLocator(page, target);
  await expect(lineInfo).toBeVisible();
  const persistedText = await lineInfo.innerText();
  const persistedEndpoints = parseLineEndpoints(persistedText);
  expect(persistedEndpoints).not.toBeNull();
  const persistedLength = lineLength(persistedEndpoints!);
  expect(Math.abs(persistedLength - expectedLength)).toBeLessThan(2);
}
