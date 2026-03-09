import { expect, type Page } from '@playwright/test';
import { dragBetweenPoints, type ShapeDragOptions } from './editor-test-shape-drag.js';
import { pickShapeDragPoints } from './editor-test-shape-drag-points.js';
import { resolveShapeDragSnapshot } from './editor-test-shape-drag-snapshot.js';

export type DrawRectangleOptions = ShapeDragOptions;

export async function drawRectangleOnPage(
  page: Page,
  pageIndex: number,
  options: DrawRectangleOptions = {},
): Promise<void> {
  const shapeOverlay = page
    .locator(`[data-page-index="${String(pageIndex)}"] [data-testid="shape-creation-overlay"]`)
    .first();
  await expect(shapeOverlay).toBeVisible({ timeout: 10_000 });
  const pageRoot = page.locator(`[data-page-index="${String(pageIndex)}"]`).first();

  const resolveDragPoints = async () => {
    const snapshot = await page.evaluate(resolveShapeDragSnapshot, pageIndex);
    return pickShapeDragPoints(snapshot);
  };

  let dragPoints = await resolveDragPoints();
  if (dragPoints === null) {
    await pageRoot.evaluate((node) => {
      if (node instanceof HTMLElement) {
        node.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    });
    await expect(shapeOverlay).toBeVisible({ timeout: 10_000 });
    dragPoints = await resolveDragPoints();
  }

  expect(dragPoints).not.toBeNull();
  await dragBetweenPoints(page, dragPoints!.start, dragPoints!.end, options);
}
