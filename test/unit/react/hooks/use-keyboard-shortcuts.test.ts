import { fireEvent, render, renderHook } from '@testing-library/react';
import { createElement, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from '../../../../src/react/hooks/use-keyboard-shortcuts.js';

function dispatchKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  document.dispatchEvent(event);
  return event;
}

function KeyboardTargetHarness({ onNextPage }: { onNextPage: () => void }) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  useKeyboardShortcuts({ nextPage: onNextPage }, { target: targetRef, scrollMode: 'single' });
  return createElement('div', { ref: targetRef, 'data-testid': 'keyboard-target', tabIndex: 0 });
}

describe('useKeyboardShortcuts', () => {
  it('calls nextPage on ArrowDown in single scroll mode', () => {
    const nextPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ nextPage }, { scrollMode: 'single' }));

    dispatchKey('ArrowDown');
    expect(nextPage).toHaveBeenCalledOnce();
  });

  it('calls nextPage on ArrowRight in single scroll mode', () => {
    const nextPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ nextPage }, { scrollMode: 'single' }));

    dispatchKey('ArrowRight');
    expect(nextPage).toHaveBeenCalledOnce();
  });

  it('calls nextPage on PageDown', () => {
    const nextPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ nextPage }));

    dispatchKey('PageDown');
    expect(nextPage).toHaveBeenCalledOnce();
  });

  it('calls prevPage on ArrowUp in single scroll mode', () => {
    const prevPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ prevPage }, { scrollMode: 'single' }));

    dispatchKey('ArrowUp');
    expect(prevPage).toHaveBeenCalledOnce();
  });

  it('calls prevPage on ArrowLeft in single scroll mode', () => {
    const prevPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ prevPage }, { scrollMode: 'single' }));

    dispatchKey('ArrowLeft');
    expect(prevPage).toHaveBeenCalledOnce();
  });

  it('calls prevPage on PageUp', () => {
    const prevPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ prevPage }));

    dispatchKey('PageUp');
    expect(prevPage).toHaveBeenCalledOnce();
  });

  it('calls zoomIn on Ctrl+=', () => {
    const zoomIn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ zoomIn }));

    dispatchKey('=', { ctrlKey: true });
    expect(zoomIn).toHaveBeenCalledOnce();
  });

  it('calls zoomIn on Ctrl++', () => {
    const zoomIn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ zoomIn }));

    dispatchKey('+', { ctrlKey: true });
    expect(zoomIn).toHaveBeenCalledOnce();
  });

  it('calls zoomOut on Ctrl+-', () => {
    const zoomOut = vi.fn();
    renderHook(() => useKeyboardShortcuts({ zoomOut }));

    dispatchKey('-', { ctrlKey: true });
    expect(zoomOut).toHaveBeenCalledOnce();
  });

  it('calls zoomReset on Ctrl+0', () => {
    const zoomReset = vi.fn();
    renderHook(() => useKeyboardShortcuts({ zoomReset }));

    dispatchKey('0', { ctrlKey: true });
    expect(zoomReset).toHaveBeenCalledOnce();
  });

  it('calls toggleSearch on Ctrl+F', () => {
    const toggleSearch = vi.fn();
    renderHook(() => useKeyboardShortcuts({ toggleSearch }));

    dispatchKey('f', { ctrlKey: true });
    expect(toggleSearch).toHaveBeenCalledOnce();
  });

  it('calls toggleSearch on Ctrl+Shift+F', () => {
    const toggleSearch = vi.fn();
    renderHook(() => useKeyboardShortcuts({ toggleSearch }));

    dispatchKey('F', { ctrlKey: true });
    expect(toggleSearch).toHaveBeenCalledOnce();
  });

  it('calls nextMatch on Enter', () => {
    const nextMatch = vi.fn();
    renderHook(() => useKeyboardShortcuts({ nextMatch }));

    dispatchKey('Enter');
    expect(nextMatch).toHaveBeenCalledOnce();
  });

  it('calls prevMatch on Shift+Enter', () => {
    const prevMatch = vi.fn();
    renderHook(() => useKeyboardShortcuts({ prevMatch }));

    dispatchKey('Enter', { shiftKey: true });
    expect(prevMatch).toHaveBeenCalledOnce();
  });

  it('does not call nextPage when action is undefined', () => {
    renderHook(() => useKeyboardShortcuts({}));

    // Should not throw
    dispatchKey('ArrowDown');
  });

  it('does not fire when enabled is false', () => {
    const nextPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ nextPage }, { enabled: false }));

    dispatchKey('ArrowDown');
    expect(nextPage).not.toHaveBeenCalled();
  });

  it('supports Meta key (Cmd) for zoom shortcuts', () => {
    const zoomIn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ zoomIn }));

    dispatchKey('=', { metaKey: true });
    expect(zoomIn).toHaveBeenCalledOnce();
  });

  it('does not fire navigation keys when target is a text input', () => {
    const nextPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ nextPage }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    try {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
      expect(nextPage).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(input);
    }
  });

  it('does not fire navigation keys when target is a textarea', () => {
    const nextPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ nextPage }));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    try {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      textarea.dispatchEvent(event);
      expect(nextPage).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(textarea);
    }
  });

  it('does not fire navigation keys when target is contentEditable', () => {
    const nextPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ nextPage }));

    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    try {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      div.dispatchEvent(event);
      expect(nextPage).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(div);
    }
  });

  // ── New keyboard shortcuts ──────────────────────────────────────────────

  it('calls rotateClockwise on Ctrl+]', () => {
    const rotateClockwise = vi.fn();
    renderHook(() => useKeyboardShortcuts({ rotateClockwise }));

    dispatchKey(']', { ctrlKey: true });
    expect(rotateClockwise).toHaveBeenCalledOnce();
  });

  it('calls rotateCounterClockwise on Ctrl+[', () => {
    const rotateCounterClockwise = vi.fn();
    renderHook(() => useKeyboardShortcuts({ rotateCounterClockwise }));

    dispatchKey('[', { ctrlKey: true });
    expect(rotateCounterClockwise).toHaveBeenCalledOnce();
  });

  it('calls toggleFullscreen on F11', () => {
    const toggleFullscreen = vi.fn();
    renderHook(() => useKeyboardShortcuts({ toggleFullscreen }));

    dispatchKey('F11');
    expect(toggleFullscreen).toHaveBeenCalledOnce();
  });

  it('calls print on Ctrl+P', () => {
    const print = vi.fn();
    renderHook(() => useKeyboardShortcuts({ print }));

    dispatchKey('p', { ctrlKey: true });
    expect(print).toHaveBeenCalledOnce();
  });

  it('calls print on Cmd+P', () => {
    const print = vi.fn();
    renderHook(() => useKeyboardShortcuts({ print }));

    dispatchKey('P', { metaKey: true });
    expect(print).toHaveBeenCalledOnce();
  });

  it('calls firstPage on Home', () => {
    const firstPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ firstPage }));

    dispatchKey('Home');
    expect(firstPage).toHaveBeenCalledOnce();
  });

  it('calls lastPage on End', () => {
    const lastPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ lastPage }));

    dispatchKey('End');
    expect(lastPage).toHaveBeenCalledOnce();
  });

  it('calls escape on Escape', () => {
    const onEscape = vi.fn();
    renderHook(() => useKeyboardShortcuts({ escape: onEscape }));

    dispatchKey('Escape');
    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('calls setPointerMode on V', () => {
    const setPointerMode = vi.fn();
    renderHook(() => useKeyboardShortcuts({ setPointerMode }));

    dispatchKey('v');
    expect(setPointerMode).toHaveBeenCalledOnce();
  });

  it('calls setPanMode on H', () => {
    const setPanMode = vi.fn();
    renderHook(() => useKeyboardShortcuts({ setPanMode }));

    dispatchKey('h');
    expect(setPanMode).toHaveBeenCalledOnce();
  });

  it('calls setMarqueeMode on Z', () => {
    const setMarqueeMode = vi.fn();
    renderHook(() => useKeyboardShortcuts({ setMarqueeMode }));

    dispatchKey('z');
    expect(setMarqueeMode).toHaveBeenCalledOnce();
  });

  it('does not fire single-letter shortcuts when target is a text input', () => {
    const setPointerMode = vi.fn();
    const setPanMode = vi.fn();
    const setMarqueeMode = vi.fn();
    renderHook(() => useKeyboardShortcuts({ setPointerMode, setPanMode, setMarqueeMode }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    try {
      for (const key of ['v', 'h', 'z']) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      }
      expect(setPointerMode).not.toHaveBeenCalled();
      expect(setPanMode).not.toHaveBeenCalled();
      expect(setMarqueeMode).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(input);
    }
  });

  it('does not fire Home/End when target is a text input', () => {
    const firstPage = vi.fn();
    const lastPage = vi.fn();
    renderHook(() => useKeyboardShortcuts({ firstPage, lastPage }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    try {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      expect(firstPage).not.toHaveBeenCalled();
      expect(lastPage).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(input);
    }
  });

  it('rebinds listeners when options.target.current changes', () => {
    const nextPage = vi.fn();
    const firstTarget = document.createElement('div');
    const secondTarget = document.createElement('div');
    document.body.appendChild(firstTarget);
    document.body.appendChild(secondTarget);
    const targetRef: { current: HTMLElement | null } = { current: firstTarget };

    try {
      const { rerender } = renderHook(
        ({ tick }: { tick: number }) => {
          void tick;
          useKeyboardShortcuts({ nextPage }, { target: targetRef, scrollMode: 'single' });
        },
        { initialProps: { tick: 0 } },
      );

      firstTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      expect(nextPage).toHaveBeenCalledTimes(1);

      targetRef.current = secondTarget;
      rerender({ tick: 1 });

      secondTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      expect(nextPage).toHaveBeenCalledTimes(2);
    } finally {
      document.body.removeChild(firstTarget);
      document.body.removeChild(secondTarget);
    }
  });

  it('ignores stale keydown callback from previous target after target switch', () => {
    const nextPage = vi.fn();
    const firstTarget = document.createElement('div');
    const secondTarget = document.createElement('div');
    const addSpy = vi.spyOn(firstTarget, 'addEventListener');
    document.body.appendChild(firstTarget);
    document.body.appendChild(secondTarget);
    const targetRef: { current: HTMLElement | null } = { current: firstTarget };

    try {
      const { rerender } = renderHook(
        ({ tick }: { tick: number }) => {
          void tick;
          useKeyboardShortcuts({ nextPage }, { target: targetRef, scrollMode: 'single' });
        },
        { initialProps: { tick: 0 } },
      );

      const listener = addSpy.mock.calls.find(([event]) => event === 'keydown')?.[1] as EventListener;
      expect(listener).toBeTypeOf('function');

      targetRef.current = secondTarget;
      rerender({ tick: 1 });

      listener(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));

      expect(nextPage).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(firstTarget);
      document.body.removeChild(secondTarget);
    }
  });

  it('does not bind to document when a target ref is provided but currently null', () => {
    const nextPage = vi.fn();
    const targetRef: { current: HTMLElement | null } = { current: null };
    const addSpy = vi.spyOn(document, 'addEventListener');

    try {
      renderHook(() => useKeyboardShortcuts({ nextPage }, { target: targetRef, scrollMode: 'single' }));

      dispatchKey('ArrowDown');
      expect(nextPage).not.toHaveBeenCalled();
      expect(addSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));
    } finally {
      addSpy.mockRestore();
    }
  });

  it('binds once target ref attaches after initial null render without requiring explicit rerender', () => {
    const nextPage = vi.fn();
    const { getByTestId } = render(createElement(KeyboardTargetHarness, { onNextPage: nextPage }));

    fireEvent.keyDown(getByTestId('keyboard-target'), { key: 'ArrowDown', bubbles: true, cancelable: true });

    expect(nextPage).toHaveBeenCalledOnce();
  });

  it('does not prevent default for modifier shortcuts when corresponding actions are missing', () => {
    renderHook(() => useKeyboardShortcuts({}));

    const keys = ['=', '-', '0', 'f', ']', '[', 'p'] as const;
    for (const key of keys) {
      const event = dispatchKey(key, { ctrlKey: true });
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('does not prevent default for non-modifier shortcuts when corresponding actions are missing', () => {
    renderHook(() => useKeyboardShortcuts({}, { scrollMode: 'single' }));

    const keys = [
      'Enter',
      'F11',
      'Escape',
      'ArrowDown',
      'ArrowUp',
      'PageDown',
      'PageUp',
      'Home',
      'End',
      'v',
      'h',
      'z',
    ] as const;
    for (const key of keys) {
      const event = dispatchKey(key);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('ignores stale events from old target element after target ref switches', () => {
    const nextPage = vi.fn();
    const firstTarget = document.createElement('div');
    const secondTarget = document.createElement('div');
    document.body.appendChild(firstTarget);
    document.body.appendChild(secondTarget);
    const targetRef: { current: HTMLElement | null } = { current: firstTarget };

    try {
      const { rerender } = renderHook(
        ({ tick }: { tick: number }) => {
          void tick;
          useKeyboardShortcuts({ nextPage }, { target: targetRef, scrollMode: 'single' });
        },
        { initialProps: { tick: 0 } },
      );

      targetRef.current = secondTarget;
      rerender({ tick: 1 });

      firstTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      expect(nextPage).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(firstTarget);
      document.body.removeChild(secondTarget);
    }
  });
});
