'use client';

type ToolbarRovingKey = 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

function isToolbarRovingKey(key: string): key is ToolbarRovingKey {
  return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End';
}

function getNextRovingIndex(key: ToolbarRovingKey, currentIndex: number, totalItems: number): number {
  if (totalItems <= 0) return -1;

  if (key === 'Home') return 0;
  if (key === 'End') return totalItems - 1;
  if (key === 'ArrowRight') return currentIndex + 1 >= totalItems ? 0 : currentIndex + 1;
  return currentIndex - 1 < 0 ? totalItems - 1 : currentIndex - 1;
}

function getToolbarInitialTabStop(container: HTMLElement, focusables: HTMLElement[]): HTMLElement | null {
  if (focusables.length === 0) return null;

  const currentTabStop = focusables.find((node) => node.getAttribute('tabindex') === '0');
  if (currentTabStop) return currentTabStop;

  const focused = container.ownerDocument.activeElement;
  if (focused instanceof HTMLElement) {
    const focusedItem = focusables.find((node) => node === focused);
    if (focusedItem) return focusedItem;
  }

  return focusables[0] ?? null;
}

function applyToolbarTabStops(focusables: HTMLElement[], active: HTMLElement | null): void {
  for (const node of focusables) {
    node.setAttribute('tabindex', node === active ? '0' : '-1');
  }
}

export { applyToolbarTabStops, getNextRovingIndex, getToolbarInitialTabStop, isToolbarRovingKey };
export type { ToolbarRovingKey };
