import { expect, type Page } from '@playwright/test';
import { EDITOR_BASE_URL } from './editor-test-config.js';
import { PAGE_SELECTOR } from './editor-test-geometry.js';
import { ensureSampleLoaded, tryLoadSampleFromPicker } from './editor-test-sample-loading.js';
import { editorBtn, viewerSelectTextButtons } from './editor-test-toolbar-buttons.js';
import { switchToViewerSelectText } from './editor-test-viewer-mode-controls.js';

export async function switchToEditor(page: Page): Promise<void> {
  await page.goto(`${EDITOR_BASE_URL}/#editor`);
  await ensureSampleLoaded(page);

  await expect(page.locator(PAGE_SELECTOR)).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => viewerSelectTextButtons(page).count()).toBeGreaterThan(0);
  await expect(editorBtn(page, 'Draw')).toBeVisible({ timeout: 10_000 });
  await expect.poll(async () => page.locator(`${PAGE_SELECTOR} span`).count()).toBeGreaterThan(0);
  await switchToViewerSelectText(page);
}

export async function ensureAtLeastTwoPages(page: Page): Promise<void> {
  if ((await page.locator('[data-page-index="1"]').count()) > 0) {
    return;
  }

  const loadedReference = await tryLoadSampleFromPicker(page, 'Reference (Multi-page)');
  if (!loadedReference) {
    await tryLoadSampleFromPicker(page, 'Sample Document');
  }

  await expect.poll(async () => page.locator('[data-page-index="1"]').count(), { timeout: 20_000 }).toBeGreaterThan(0);
  await switchToViewerSelectText(page);
}
