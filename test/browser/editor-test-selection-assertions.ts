import { expect, type Page } from '@playwright/test';

export async function expectNativeTextSelection(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(() => window.getSelection()?.toString().length ?? 0)).toBeGreaterThan(0);
}
