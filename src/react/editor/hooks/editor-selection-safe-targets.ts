import { isEditableElement } from './editor-interaction-bridge-support.js';

const SELECTION_SAFE_SELECTORS = [
  '[data-testid="editor-property-sidebar"]',
  '[data-annotation-index]',
  '[data-testid="selection-overlay"]',
] as const;

export function shouldIgnoreSelectionPrimaryDown(
  targetElement: Element | null,
  pathElements: readonly Element[],
): boolean {
  if (isEditableElement(targetElement)) {
    return true;
  }
  return SELECTION_SAFE_SELECTORS.some(
    (selector) =>
      pathElements.some((element) => element.closest(selector) !== null) || targetElement?.closest(selector) !== null,
  );
}
