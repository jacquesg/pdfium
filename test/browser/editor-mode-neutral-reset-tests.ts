import { expect, test } from '@playwright/test';
import {
  editorBtn,
  expectNoPageErrors,
  isViewerSelectTextActive,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorModeNeutralResetTests(): void {
  test('Escape returns active editor tool to neutral mode', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToTool(page, 'Rectangle');
      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'true');

      await page.keyboard.press('Escape');

      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(async () => isViewerSelectTextActive(page)).toBe(true);
    });
  });

  test('viewer Select text control returns active editor tool to neutral mode', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToTool(page, 'Rectangle');
      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'true');

      await switchToViewerSelectText(page);

      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  test('V shortcut returns active editor tool to neutral mode', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToTool(page, 'Rectangle');
      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'true');

      await page.keyboard.press('v');

      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(async () => isViewerSelectTextActive(page)).toBe(true);
    });
  });
}
