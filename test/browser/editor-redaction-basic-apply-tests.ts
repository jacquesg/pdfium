import { expect, test } from '@playwright/test';
import { drawRectangle, editorBtn, expectNoPageErrors, switchToEditor, switchToTool } from './editor-test-support.js';

export function registerEditorRedactionBasicApplyTests(): void {
  test('redaction tool marks and then applies current-page redactions', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToTool(page, 'Redact');
      await drawRectangle(page);

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
