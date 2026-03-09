import { expect, type Page } from '@playwright/test';
import { countHitTargets, editorBtn } from './editor-test-support.js';

export async function undoRedoRectangleCreateChain(
  page: Page,
  countAfterFirst: number,
  countAfterSecond: number,
): Promise<void> {
  await page.evaluate(() => {
    globalThis.dispatchEvent(new Event('pdfium-editor-flush-pending-commits'));
  });
  const undoBtn = editorBtn(page, 'Undo');
  const redoBtn = editorBtn(page, 'Redo');
  await expect(undoBtn).toBeEnabled({ timeout: 10_000 });
  await undoBtn.click({ force: true });
  await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countAfterFirst);

  await expect(redoBtn).toBeEnabled({ timeout: 10_000 });
  await redoBtn.click({ force: true });
  await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countAfterSecond);
}
