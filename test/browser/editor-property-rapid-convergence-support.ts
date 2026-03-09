import { expect, type Locator, type Page } from '@playwright/test';
import {
  clearSelectionByClickingBlankPoint,
  clickReachableLocator,
  setColourInput,
  setNumberInput,
  setRangeInput,
} from './editor-test-support.js';

export async function applyRapidRectanglePropertyEdits(page: Page, propertyPanel: Locator): Promise<void> {
  const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
  const fillEnabledInput = page.locator('[data-testid="fill-enabled-input"]');
  const fillInput = page.locator('[data-testid="interior-colour-input"]');
  const borderWidthInput = page.locator('[data-testid="border-width-input"]');
  const opacityInput = page.locator('[data-testid="opacity-input"]');
  await expect(propertyPanel).toBeVisible();

  await fillEnabledInput.check();
  await setColourInput(strokeInput, '#ff0000');
  await setColourInput(strokeInput, '#00ff00');
  await setColourInput(strokeInput, '#112233');
  await setColourInput(fillInput, '#00ffff');
  await setColourInput(fillInput, '#445566');
  await setNumberInput(borderWidthInput, 1.5);
  await setNumberInput(borderWidthInput, 4);
  await setNumberInput(borderWidthInput, 2.5);
  await setRangeInput(page, opacityInput, 0.2);
  await setRangeInput(page, opacityInput, 0.8);
  await setRangeInput(page, opacityInput, 0.35);
}

export async function assertRapidRectanglePropertyEdits(page: Page, propertyPanel: Locator): Promise<void> {
  const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
  const fillInput = page.locator('[data-testid="interior-colour-input"]');
  const borderWidthInput = page.locator('[data-testid="border-width-input"]');
  await expect.poll(async () => await strokeInput.inputValue()).toBe('#112233');
  await expect.poll(async () => await fillInput.inputValue()).toBe('#445566');
  await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2\.5(?:0+)?$/);
  await expect(propertyPanel).toContainText(/(33|34|35|36)%/);
}

export async function reselectRectangleAndAssertRapidEdits(
  page: Page,
  propertyPanel: Locator,
  target: Locator,
): Promise<void> {
  await clearSelectionByClickingBlankPoint(page, 0);
  await expect(propertyPanel).not.toBeVisible();
  await clickReachableLocator(page, target);
  await expect(propertyPanel).toBeVisible();
  await assertRapidRectanglePropertyEdits(page, propertyPanel);
}
