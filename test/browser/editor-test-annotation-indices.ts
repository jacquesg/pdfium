import type { Page } from '@playwright/test';
import { HIT_TARGET_SELECTOR } from './editor-test-hit-target.constants.js';

export async function getHitTargetIndices(page: Page): Promise<number[]> {
  const hitTargets = page.locator(HIT_TARGET_SELECTOR);
  return hitTargets.evaluateAll((nodes) =>
    nodes
      .map((node) => Number.parseInt(node.getAttribute('data-annotation-index') ?? '', 10))
      .filter((index) => Number.isFinite(index)),
  );
}

export async function getSidebarAnnotationIndices(page: Page): Promise<number[]> {
  const panelItems = page.locator('[data-panel-item]');
  return panelItems.evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const text = (node.textContent ?? '').trim();
        const match = text.match(/^#(\d+)\b/);
        return match ? Number.parseInt(match[1]!, 10) : Number.NaN;
      })
      .filter((index) => Number.isFinite(index)),
  );
}
