import { expect, test } from '@playwright/test';
import {
  drawRectangle,
  editorBtn,
  expectNoPageErrors,
  switchToEditor,
  switchToTool,
  switchToViewerHandTool,
} from './editor-test-support.js';

export function registerEditorRedactionHandToolTests(): void {
  test('redaction tool works when activated from hand mode', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerHandTool(page);

      await switchToTool(page, 'Redact');
      await expect(editorBtn(page, 'Redact')).toHaveAttribute('aria-pressed', 'true');
      await drawRectangle(page);
      await expect(editorBtn(page, 'Redact')).toHaveAttribute('aria-pressed', 'false');

      const flattenBtn = editorBtn(page, 'Apply redactions on current page');
      await expect.poll(async () => (await flattenBtn.isEnabled()) || (await flattenBtn.isDisabled())).toBe(true);
      await expect(flattenBtn).toBeEnabled({ timeout: 10_000 });
      await flattenBtn.click();
      const confirmDialog = page.getByRole('dialog');
      await expect(confirmDialog).toContainText('Apply marked redactions?');
      await page.getByRole('button', { name: 'Apply Redactions' }).click();
      await expect(flattenBtn).toBeDisabled({ timeout: 10_000 });
    });
  });
}
