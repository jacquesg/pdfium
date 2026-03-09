import type { Locator } from '@playwright/test';

export async function getNewestAnnotationIndexFromLocator(locator: Locator): Promise<number | null> {
  const indices = await locator.evaluateAll((nodes) =>
    nodes
      .map((node) => Number.parseInt(node.getAttribute('data-annotation-index') ?? '', 10))
      .filter((index) => Number.isFinite(index)),
  );

  return indices.length > 0 ? Math.max(...indices) : null;
}
