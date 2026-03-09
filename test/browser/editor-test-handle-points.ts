import { expect, type Page } from '@playwright/test';
import type { EditorAnnotationHandle } from './editor-test-hit-target.types.js';

export async function findReachableHandlePoint(
  page: Page,
  handle: EditorAnnotationHandle,
): Promise<{ x: number; y: number }> {
  const selector = `[data-testid="handle-${handle}"]`;
  const resolvePoint = async () => {
    return page.evaluate((handleSelector) => {
      const handleElement = document.querySelector<HTMLElement>(handleSelector);
      if (!handleElement) {
        return null;
      }

      const rect = handleElement.getBoundingClientRect();
      const left = Math.max(rect.left, 0);
      const top = Math.max(rect.top, 0);
      const right = Math.min(rect.right, window.innerWidth);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      const steps = 4;

      for (let row = 0; row <= steps; row++) {
        for (let col = 0; col <= steps; col++) {
          const x = left + (right - left) * ((col + 0.5) / (steps + 1));
          const y = top + (bottom - top) * ((row + 0.5) / (steps + 1));
          const elements = document.elementsFromPoint(x, y);
          const hitsHandle = elements.some((element) => {
            return element === handleElement || (element instanceof HTMLElement && handleElement.contains(element));
          });
          if (hitsHandle) {
            return { x, y };
          }
        }
      }

      return null;
    }, selector);
  };

  let point = await resolvePoint();
  if (point === null) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    point = await resolvePoint();
  }

  expect(point).not.toBeNull();
  return point!;
}
