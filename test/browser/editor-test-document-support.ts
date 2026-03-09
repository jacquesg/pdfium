import { type Download, expect, type Locator, type Page } from '@playwright/test';
import { PAGE_SELECTOR } from './editor-test-geometry.js';

export async function saveEditedDocument(page: Page): Promise<Download> {
  const saveButton = page.locator('button[aria-label="Save"]');
  await expect(saveButton).toHaveAttribute('title', 'Save document');
  const downloadPromise = page.waitForEvent('download');
  await saveButton.click();
  const download = await downloadPromise;
  await expect(saveButton).toHaveAttribute('title', 'No unsaved changes');
  await expect(page.locator('[title="Unsaved changes"]')).toHaveCount(0);
  return download;
}

export async function uploadPdfFile(page: Page, filePath: string, expectedName: string): Promise<void> {
  await page.locator('input[type="file"]').first().setInputFiles(filePath);
  await expect(page.locator('header').first()).toContainText(expectedName);
  await expect(page.locator(PAGE_SELECTOR)).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => page.locator(`${PAGE_SELECTOR} span`).count(), { timeout: 20_000 }).toBeGreaterThan(0);
}

export async function setColourInput(locator: Locator, hex: string): Promise<void> {
  await locator.fill(hex);
}

export async function setNumberInput(locator: Locator, value: number): Promise<void> {
  await locator.fill(String(value));
  await locator.blur();
}

export async function setRangeInput(page: Page, locator: Locator, value: number): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  const min = Number((await locator.getAttribute('min')) ?? '0');
  const max = Number((await locator.getAttribute('max')) ?? '1');
  const clamped = Math.max(min, Math.min(max, value));
  const ratio = max === min ? 0 : (clamped - min) / (max - min);

  const targetX = box!.x + ratio * box!.width;
  const targetY = box!.y + box!.height / 2;
  await page.mouse.move(targetX, targetY);
  await page.mouse.down();
  await page.mouse.up();
}
