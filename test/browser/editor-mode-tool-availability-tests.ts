import { expect, test } from '@playwright/test';
import { editorBtn, expectNoPageErrors, switchToEditor } from './editor-test-support.js';

export function registerEditorModeToolAvailabilityTests(): void {
  test('all editor tools can be activated without errors', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);

      const tools = [
        { name: 'Highlight', shouldPress: false },
        { name: 'Underline', shouldPress: false },
        { name: 'Strikeout', shouldPress: false },
        { name: 'Draw', shouldPress: true },
        { name: 'Text', shouldPress: true },
        { name: 'Rectangle', shouldPress: true },
        { name: 'Circle', shouldPress: true },
        { name: 'Line', shouldPress: true },
        { name: 'Stamp', shouldPress: true },
        { name: 'Redact', shouldPress: true },
      ] as const;

      for (const { name, shouldPress } of tools) {
        const button = editorBtn(page, name);
        await expect(button).toBeVisible();
        await button.click();
        if (shouldPress) {
          await expect(button).toHaveAttribute('aria-pressed', 'true');
        } else {
          await expect(button).toHaveAttribute('aria-pressed', 'false');
        }
      }
    });
  });
}
