import type { RefObject } from 'react';

const PAGE_INDEX_ATTRIBUTE = 'data-page-index';

export function findPageRoot(container: HTMLDivElement | null, pageIndex: number): HTMLElement | null {
  const root = container?.closest<HTMLElement>(`[${PAGE_INDEX_ATTRIBUTE}]`);
  if (root) return root;
  return globalThis.document.querySelector<HTMLElement>(`[${PAGE_INDEX_ATTRIBUTE}="${String(pageIndex)}"]`);
}

export function eventBelongsToPageRoot(
  containerRef: RefObject<HTMLDivElement | null>,
  pageIndex: number,
  point: { x: number; y: number },
  targetElement: Element | null,
): boolean {
  const pageRoot = findPageRoot(containerRef.current, pageIndex);
  if (!pageRoot) return false;
  const pageSelector = `[${PAGE_INDEX_ATTRIBUTE}="${String(pageIndex)}"]`;
  let targetBelongsToPage = targetElement?.closest(pageSelector) === pageRoot;
  if (!targetBelongsToPage && typeof globalThis.document.elementsFromPoint === 'function') {
    const elementsAtPoint = globalThis.document.elementsFromPoint(point.x, point.y);
    targetBelongsToPage = elementsAtPoint.some((element) => element === pageRoot || pageRoot.contains(element));
  }
  return targetBelongsToPage;
}

export function selectionRangeBelongsToPageRoot(
  containerRef: RefObject<HTMLDivElement | null>,
  pageIndex: number,
  range: Range,
): boolean {
  const pageRoot = findPageRoot(containerRef.current, pageIndex);
  if (!pageRoot) return false;
  return pageRoot.contains(range.startContainer) || pageRoot.contains(range.endContainer);
}
