import type { SerialisedAnnotation } from '../../../context/protocol.js';

export function clearNativeSelection(): void {
  const selection = globalThis.getSelection?.();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  selection.removeAllRanges();

  const clearAgain = () => {
    globalThis.getSelection?.()?.removeAllRanges();
  };

  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(() => {
      clearAgain();
    });
    return;
  }

  globalThis.setTimeout(clearAgain, 0);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}

export function findSelectionSnapshot(
  annotations: readonly SerialisedAnnotation[],
  annotationIndex: number,
): SerialisedAnnotation | undefined {
  return annotations.find((annotation) => annotation.index === annotationIndex);
}
