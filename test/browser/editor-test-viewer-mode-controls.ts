import { expect, type Page } from '@playwright/test';
import { viewerHandToolButtonCandidates, viewerSelectTextButtonCandidates } from './editor-test-toolbar-buttons.js';

export async function isViewerSelectTextActive(page: Page): Promise<boolean> {
  for (const button of viewerSelectTextButtonCandidates(page)) {
    if ((await button.count()) === 0) continue;
    if ((await button.getAttribute('aria-pressed')) === 'true') return true;
  }
  return false;
}

export async function isViewerHandToolActive(page: Page): Promise<boolean> {
  for (const button of viewerHandToolButtonCandidates(page)) {
    if ((await button.count()) === 0) continue;
    if ((await button.getAttribute('aria-pressed')) === 'true') return true;
  }
  return false;
}

export async function switchToViewerSelectText(page: Page): Promise<void> {
  for (const button of viewerSelectTextButtonCandidates(page)) {
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      return;
    }
  }

  await page.keyboard.press('v');
  await expect.poll(async () => isViewerSelectTextActive(page)).toBe(true);
}

export async function switchToViewerHandTool(page: Page): Promise<void> {
  for (const button of viewerHandToolButtonCandidates(page)) {
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      return;
    }
  }

  await page.keyboard.press('h');
  await expect.poll(async () => isViewerHandToolActive(page)).toBe(true);
}
