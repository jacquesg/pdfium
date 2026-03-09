import { expect, type Page } from '@playwright/test';
import {
  countHitTargets,
  editorBtn,
  selectNewestHitTargetOnPage,
  selectTextAcrossTwoLinesOnFirstPage,
  setColourInput,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export async function createStyledHighlight(page: Page): Promise<number> {
  const countBefore = await countHitTargets(page);

  await selectTextAcrossTwoLinesOnFirstPage(page);
  await switchToTool(page, 'Highlight');
  await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
  await switchToViewerSelectText(page);
  await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore + 1);
  const countAfterCreate = await countHitTargets(page);

  await selectNewestHitTargetOnPage(page, 0);
  const fillInput = page.locator('[data-testid="interior-colour-input"]');
  await expect(fillInput).toBeVisible();
  await setColourInput(fillInput, '#00ff00');
  await expect.poll(async () => await fillInput.inputValue()).toBe('#00ff00');

  return countAfterCreate;
}
