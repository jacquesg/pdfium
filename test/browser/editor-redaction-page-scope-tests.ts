import { expect, test } from '@playwright/test';
import {
  countRedactionsOnPage,
  editorBtn,
  ensureAtLeastTwoPages,
  ensureRedactionCreatedOnPage,
  expectNoPageErrors,
  switchToEditor,
} from './editor-test-support.js';

export function registerEditorRedactionPageScopeTests(): void {
  test('multi-page redaction status and apply messaging stay page-scoped', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await ensureAtLeastTwoPages(page);

      const page0RedactionsBefore = await countRedactionsOnPage(page, 0);
      await ensureRedactionCreatedOnPage(page, 0, page0RedactionsBefore);
      const page1RedactionsBefore = await countRedactionsOnPage(page, 1);
      await ensureRedactionCreatedOnPage(page, 1, page1RedactionsBefore);
      await expect
        .poll(async () => (await page.getByRole('button', { name: 'Page number' }).innerText()).startsWith('2 /'), {
          timeout: 10_000,
        })
        .toBe(true);

      const status = page.locator('[data-testid="redaction-status"]');
      await expect(status).toContainText('Page 2: 1', { timeout: 10_000 });
      await expect(status).toContainText('Total: 2', { timeout: 10_000 });
      await expect(status).toHaveAttribute('title', /Pages:\s*P1: 1,\s*P2: 1/);

      const flattenBtn = editorBtn(page, 'Apply redactions on current page');
      await expect(flattenBtn).toHaveAttribute('title', /Apply 1 marked redaction on page 2 \(2 total marked\)/);

      await flattenBtn.click();
      const confirmDialog = page.getByRole('dialog');
      await expect(confirmDialog).toContainText('Apply marked redactions?');
      await expect(confirmDialog).toContainText('Current page: apply 1 marked redaction on page 2.');
      await expect(confirmDialog).toContainText('Other pages: 1 marked redaction will remain marked and unapplied.');
      await page.getByRole('button', { name: 'Apply Redactions' }).click();

      await expect(status).toContainText('Page 2: 0', { timeout: 10_000 });
      await expect(status).toContainText('Total: 1', { timeout: 10_000 });
      await expect(flattenBtn).toBeDisabled();
      await expect(flattenBtn).toHaveAttribute('title', /No marked redactions on page 2 \(1 on other pages\)/);
    });
  });
}
