import { applyToolbarTabStops, getToolbarInitialTabStop } from './toolbar-roving.js';

/** Collect all focusable toolbar controls that are not disabled. */
function getFocusableToolbarItems(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)'),
  );
}

/**
 * Ensure one and only one toolbar control has tabindex=0 for roving focus.
 * Returns the list of focusable controls for further keyboard handling.
 */
function initialiseToolbarRovingTabStop(container: HTMLElement): HTMLElement[] {
  const focusables = getFocusableToolbarItems(container);
  if (focusables.length === 0) return focusables;

  const active = getToolbarInitialTabStop(container, focusables);
  applyToolbarTabStops(focusables, active);
  return focusables;
}

export { getFocusableToolbarItems, initialiseToolbarRovingTabStop };
