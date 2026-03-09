import type { Locator } from '@playwright/test';

export async function isLocatorAlreadySelected(locator: Locator): Promise<boolean> {
  return locator.evaluate((node) => {
    const pointerEvents = getComputedStyle(node).pointerEvents;
    const presentationPointerEvents = node.getAttribute('pointer-events');
    if (pointerEvents !== 'none' && presentationPointerEvents !== 'none') {
      return false;
    }
    return (
      document.querySelector('[data-testid="annotation-property-panel"]') !== null ||
      document.querySelector('[data-testid="selection-overlay"]') !== null ||
      document.querySelector('[data-testid="selection-markup-overlay"]') !== null
    );
  });
}
