import { expect, type Page } from '@playwright/test';
import { findReachableHandlePoint } from './editor-test-handle-points.js';
import type { EditorAnnotationHandle, SelectionAnnotationHandle } from './editor-test-hit-target.types.js';

export async function dragAnnotationHandle(
  page: Page,
  handle: EditorAnnotationHandle,
  delta: { x: number; y: number },
  options: { shiftKey?: boolean } = {},
): Promise<void> {
  const handleLocator = page.locator(`[data-testid="handle-${handle}"]`);
  await expect(handleLocator).toBeVisible();
  await handleLocator.hover();
  const start = await findReachableHandlePoint(page, handle);
  const startX = start.x;
  const startY = start.y;
  const steps = Math.max(16, Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.y)) / 4));
  if (options.shiftKey) {
    await page.keyboard.down('Shift');
  }
  try {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + delta.x, startY + delta.y, { steps });
    await page.mouse.up();
  } finally {
    if (options.shiftKey) {
      await page.keyboard.up('Shift');
    }
  }
}

export async function dragSelectionHandle(
  page: Page,
  handle: SelectionAnnotationHandle,
  delta: { x: number; y: number },
  options: { shiftKey?: boolean } = {},
): Promise<void> {
  await dragAnnotationHandle(page, handle, delta, options);
}
