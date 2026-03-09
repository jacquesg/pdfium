import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  drawRectangle,
  editorBtn,
  expectNoPageErrors,
  switchToEditor,
  switchToTool,
  switchToViewerHandTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorLineActivationTests(): void {
  test('line tool creates a visible annotation', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Line');
      await drawRectangle(page);
      await expect(editorBtn(page, 'Line')).toHaveAttribute('aria-pressed', 'false');

      await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    });
  });

  test('line tool works when activated from hand mode', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerHandTool(page);

      const countBefore = await countHitTargets(page);
      await switchToTool(page, 'Line');
      await expect(editorBtn(page, 'Line')).toHaveAttribute('aria-pressed', 'true');
      await drawRectangle(page);
      await expect(editorBtn(page, 'Line')).toHaveAttribute('aria-pressed', 'false');

      await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    });
  });
}
