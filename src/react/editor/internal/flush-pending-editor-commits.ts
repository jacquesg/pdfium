import type { AnnotationMutationStore } from './annotation-mutation-store.js';

function isEditableElement(element: Element | null): boolean {
  if (element === null) return false;
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }
  return element instanceof HTMLElement && element.isContentEditable;
}

function blurActiveEditableElement(): void {
  if (typeof globalThis.document === 'undefined') return;
  const activeElement = globalThis.document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return;
  if (!isEditableElement(activeElement)) return;
  activeElement.blur();
}

async function flushPendingEditorCommits(mutationStore: Pick<AnnotationMutationStore, 'waitForIdle'>): Promise<void> {
  blurActiveEditableElement();
  if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
    globalThis.dispatchEvent(new CustomEvent('pdfium-editor-flush-pending-commits'));
  }
  // Let blur handlers enqueue command mutations before awaiting idleness.
  await Promise.resolve();
  await mutationStore.waitForIdle();
}

export { flushPendingEditorCommits };
