import { expect, type Page } from '@playwright/test';
import { setNumberInput, setRangeInput } from './editor-test-support.js';

export async function applySelectedLineStyleEdits(page: Page): Promise<void> {
  const borderWidthInput = page.locator('[data-testid="border-width-input"]');
  const opacityInput = page.locator('[data-testid="opacity-input"]');
  await setNumberInput(borderWidthInput, 2);
  await setRangeInput(page, opacityInput, 0.5);
  await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2(?:\.0+)?$/);
  await expect(page.locator('[data-testid="annotation-property-panel"]')).toContainText(/(49|50|51)%/);
}
