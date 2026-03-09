export function clearNativeSelection(selection: Selection): void {
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

export function shouldIgnoreTextMarkupPointerUpTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, input, textarea, select, [role="toolbar"]') !== null;
}
