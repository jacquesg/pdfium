import type { Page } from '@playwright/test';

export interface ShapeDragOptions {
  readonly shiftKey?: boolean;
}

export async function dragBetweenPoints(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  options: ShapeDragOptions = {},
): Promise<void> {
  if (options.shiftKey) {
    await page.keyboard.down('Shift');
  }
  try {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 5 });
    await page.mouse.up();
  } finally {
    if (options.shiftKey) {
      await page.keyboard.up('Shift');
    }
  }
}
