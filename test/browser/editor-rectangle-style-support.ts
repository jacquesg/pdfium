import { expect, type Page } from '@playwright/test';
import { setColourInput, setNumberInput, setRangeInput } from './editor-test-support.js';

export type RectangleStyleDraft = {
  stroke: string;
  fill: string;
  borderWidth: number;
  opacity: number;
  opacityPattern: RegExp;
};

export async function applyRectangleStyleDraft(page: Page, draft: RectangleStyleDraft): Promise<void> {
  const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
  const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
  const fillEnabledInput = page.locator('[data-testid="fill-enabled-input"]');
  const fillInput = page.locator('[data-testid="interior-colour-input"]');
  const borderWidthInput = page.locator('[data-testid="border-width-input"]');
  const opacityInput = page.locator('[data-testid="opacity-input"]');
  await expect(propertyPanel).toBeVisible();

  if (!(await fillEnabledInput.isChecked())) {
    await fillEnabledInput.check();
  }
  await setColourInput(strokeInput, draft.stroke);
  await setColourInput(fillInput, draft.fill);
  await setNumberInput(borderWidthInput, draft.borderWidth);
  await setRangeInput(page, opacityInput, draft.opacity);
}

export async function assertRectangleStyleDraft(page: Page, draft: RectangleStyleDraft): Promise<void> {
  const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
  const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
  const fillEnabledInput = page.locator('[data-testid="fill-enabled-input"]');
  const fillInput = page.locator('[data-testid="interior-colour-input"]');
  const borderWidthInput = page.locator('[data-testid="border-width-input"]');

  await expect(propertyPanel).toBeVisible();
  await expect(fillEnabledInput).toBeChecked();
  await expect.poll(async () => await strokeInput.inputValue()).toBe(draft.stroke);
  await expect.poll(async () => await fillInput.inputValue()).toBe(draft.fill);
  await expect
    .poll(async () => await borderWidthInput.inputValue())
    .toMatch(new RegExp(`^${String(draft.borderWidth).replace('.', '\\.')}(?:\\.0+)?$`));
  await expect(propertyPanel).toContainText(draft.opacityPattern);
}
