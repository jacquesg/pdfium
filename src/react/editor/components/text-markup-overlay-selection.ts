import type { Rect } from '../../../core/types.js';
import { clearNativeSelection } from './text-markup-native-selection.js';
import { resolveTextMarkupPdfSelection } from './text-markup-selection-geometry.js';

interface ProcessTextMarkupSelectionOptions {
  readonly containerElement: HTMLDivElement | null;
  readonly height: number;
  readonly onCreate?: ((rects: readonly Rect[], boundingRect: Rect) => void) | undefined;
  readonly originalHeight: number;
  readonly scale: number;
  readonly width: number;
}

export function processTextMarkupSelection({
  containerElement,
  height,
  onCreate,
  originalHeight,
  scale,
  width,
}: ProcessTextMarkupSelectionOptions): boolean {
  const selection = document.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
  if (!containerElement) {
    return false;
  }

  const containerRect = containerElement.getBoundingClientRect();
  if (containerRect.width === 0 || containerRect.height === 0) return false;

  const range = selection.getRangeAt(0);
  const pdfSelection = resolveTextMarkupPdfSelection({
    containerRect,
    height,
    originalHeight,
    range,
    scale,
    width,
  });
  if (pdfSelection === null) return false;

  onCreate?.(pdfSelection.rects, pdfSelection.boundingRect);
  clearNativeSelection(selection);
  return true;
}

export { shouldIgnoreTextMarkupPointerUpTarget } from './text-markup-native-selection.js';
