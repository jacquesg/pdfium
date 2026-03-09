import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  editorBtn,
  expectNoPageErrors,
  selectTextOnFirstPage,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorPropertyMarkupToolExitTests(): void {
  test('markup action clicked from active drawing tool exits drawing mode first', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToTool(page, 'Rectangle');
      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'true');

      const countBefore = await countHitTargets(page);
      await selectTextOnFirstPage(page);
      await switchToTool(page, 'Highlight');

      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
      await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    });
  });
}
