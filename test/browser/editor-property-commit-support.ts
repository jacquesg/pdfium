import { expect, type Locator, type Page } from '@playwright/test';

export async function dragRangeInputBetweenValues(
  page: Page,
  locator: Locator,
  startValue: number,
  endValue: number,
  steps = 10,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  const min = Number((await locator.getAttribute('min')) ?? '0');
  const max = Number((await locator.getAttribute('max')) ?? '1');
  const safeStart = clampRangeValue(startValue, min, max);
  const safeEnd = clampRangeValue(endValue, min, max);
  const y = box!.y + box!.height / 2;
  const startX = box!.x + normaliseRangeRatio(safeStart, min, max) * box!.width;
  const endX = box!.x + normaliseRangeRatio(safeEnd, min, max) * box!.width;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    await page.mouse.move(startX + (endX - startX) * t, y, { steps: 1 });
  }
  await page.mouse.up();
}

function clampRangeValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normaliseRangeRatio(value: number, min: number, max: number): number {
  return max === min ? 0 : (value - min) / (max - min);
}
