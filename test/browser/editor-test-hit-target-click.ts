import { expect, type Locator, type Page } from '@playwright/test';
import { resolveBoundsReachableClickPoint } from './editor-test-hit-target-bounds-click-point.js';
import { isLocatorAlreadySelected } from './editor-test-hit-target-selection-state.js';
import {
  resolveSvgEllipseReachableClickPoint,
  resolveSvgHitTargetKind,
  resolveSvgLineReachableClickPoint,
  resolveSvgPolygonReachableClickPoint,
} from './editor-test-hit-target-svg-click-point.js';

export async function clickReachableLocator(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const alreadySelected = await isLocatorAlreadySelected(locator);
  if (alreadySelected) {
    return;
  }

  const resolvePoint = async () => {
    const svgKind = await locator.evaluate(resolveSvgHitTargetKind).catch(() => 'other');
    const svgPoint =
      svgKind === 'line'
        ? await locator.evaluate(resolveSvgLineReachableClickPoint).catch(() => null)
        : svgKind === 'polygon'
          ? await locator.evaluate(resolveSvgPolygonReachableClickPoint).catch(() => null)
          : svgKind === 'ellipse'
            ? await locator.evaluate(resolveSvgEllipseReachableClickPoint).catch(() => null)
            : null;
    if (svgPoint !== null) {
      return svgPoint;
    }
    return locator.evaluate(resolveBoundsReachableClickPoint);
  };

  let point = await resolvePoint().catch(() => null);
  if (point === null) {
    await locator.scrollIntoViewIfNeeded();
    point = await resolvePoint().catch(() => null);
  }

  expect(point).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}
