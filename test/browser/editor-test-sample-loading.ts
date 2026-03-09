import { expect, type Page } from '@playwright/test';
import { PAGE_SELECTOR } from './editor-test-geometry.js';

export async function ensureSampleLoaded(page: Page): Promise<void> {
  const pageLocator = page.locator(PAGE_SELECTOR);
  if (await pageLocator.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  const sampleTile = page.locator('main button').filter({ hasText: /\.pdf/i }).first();
  if (await sampleTile.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await sampleTile.click();
    return;
  }

  const sampleButton = page.locator('button', { hasText: 'Sample PDFs' });
  if (await sampleButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await sampleButton.click();
  }
}

export async function tryLoadSampleFromPicker(page: Page, sampleName: string): Promise<boolean> {
  const pickerButton = page.getByRole('button', { name: 'Sample PDFs' }).first();
  await expect(pickerButton).toBeVisible({ timeout: 10_000 });
  await pickerButton.click();

  const option = page.locator('button').filter({ hasText: sampleName }).first();
  if ((await option.count()) === 0) {
    await page.keyboard.press('Escape');
    return false;
  }

  await option.click();
  await expect(page.locator(PAGE_SELECTOR)).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => page.locator(`${PAGE_SELECTOR} span`).count(), { timeout: 20_000 }).toBeGreaterThan(0);
  return true;
}
