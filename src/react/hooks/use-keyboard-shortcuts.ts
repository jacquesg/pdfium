'use client';

import type { RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface KeyboardActions {
  nextPage?: (() => void) | undefined;
  prevPage?: (() => void) | undefined;
  zoomIn?: (() => void) | undefined;
  zoomOut?: (() => void) | undefined;
  zoomReset?: (() => void) | undefined;
  toggleSearch?: (() => void) | undefined;
  nextMatch?: (() => void) | undefined;
  prevMatch?: (() => void) | undefined;
  rotateClockwise?: (() => void) | undefined;
  rotateCounterClockwise?: (() => void) | undefined;
  toggleFullscreen?: (() => void) | undefined;
  print?: (() => void) | undefined;
  firstPage?: (() => void) | undefined;
  lastPage?: (() => void) | undefined;
  escape?: (() => void) | undefined;
  setPointerMode?: (() => void) | undefined;
  setPanMode?: (() => void) | undefined;
  setMarqueeMode?: (() => void) | undefined;
}

interface UseKeyboardShortcutsOptions {
  /** Element to attach listeners to. Defaults to document. */
  target?: RefObject<HTMLElement | null>;
  /** Enable/disable shortcuts. Default: true. */
  enabled?: boolean;
  /** Current scroll mode. Arrow keys only navigate pages in 'single' mode. */
  scrollMode?: 'continuous' | 'single' | 'horizontal';
}

/**
 * Attaches keyboard event listeners for PDF viewer navigation.
 *
 * Key bindings (matches pdf.js and Google Docs):
 * - ArrowRight / ArrowDown / PageDown -> nextPage
 * - ArrowLeft / ArrowUp / PageUp -> prevPage
 * - Ctrl/Cmd + = -> zoomIn
 * - Ctrl/Cmd + - -> zoomOut
 * - Ctrl/Cmd + 0 -> zoomReset
 * - Ctrl/Cmd + F -> toggleSearch
 * - Enter (no modifier) -> nextMatch
 * - Shift + Enter -> prevMatch
 *
 * All shortcuts call preventDefault() to avoid browser default behaviour
 * (e.g. Ctrl+F opening browser find, Ctrl+= zooming the page).
 *
 * Arrow keys only fire when the target is NOT a text input/textarea
 * (to avoid hijacking text editing navigation).
 */
export function useKeyboardShortcuts(actions: KeyboardActions, options?: UseKeyboardShortcutsOptions): void {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const enabled = options?.enabled ?? true;
  const scrollMode = options?.scrollMode ?? 'continuous';
  const targetRef = options?.target;
  const [trackedTarget, setTrackedTarget] = useState<EventTarget | null>(() =>
    targetRef ? targetRef.current : globalThis.document,
  );

  // Ref targets are assigned after render. Mirror targetRef.current into state so
  // listener binding re-runs when the element becomes available without parent rerenders.
  useLayoutEffect(() => {
    const nextTarget = targetRef ? targetRef.current : globalThis.document;
    if (nextTarget !== trackedTarget) {
      setTrackedTarget(nextTarget);
    }
  });

  useEffect(() => {
    if (!enabled) return;

    const target = trackedTarget;
    if (!target) return;

    const handleKeyDown = (event: Event) => {
      if (targetRef && targetRef.current !== target) return;
      if (!(event instanceof KeyboardEvent)) return;
      const a = actionsRef.current;
      const isMod = event.metaKey || event.ctrlKey;
      const isTextInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable);

      // Ctrl/Cmd shortcuts
      if (isMod) {
        switch (event.key) {
          case '=':
          case '+':
            if (a.zoomIn) {
              event.preventDefault();
              a.zoomIn();
            }
            return;
          case '-':
            if (a.zoomOut) {
              event.preventDefault();
              a.zoomOut();
            }
            return;
          case '0':
            if (a.zoomReset) {
              event.preventDefault();
              a.zoomReset();
            }
            return;
          case 'f':
          case 'F':
            if (a.toggleSearch) {
              event.preventDefault();
              a.toggleSearch();
            }
            return;
          case ']':
            if (a.rotateClockwise) {
              event.preventDefault();
              a.rotateClockwise();
            }
            return;
          case '[':
            if (a.rotateCounterClockwise) {
              event.preventDefault();
              a.rotateCounterClockwise();
            }
            return;
          case 'p':
          case 'P':
            if (a.print) {
              event.preventDefault();
              a.print();
            }
            return;
        }
      }

      // Enter for search match navigation (only when not in a text input or when in search input)
      if (event.key === 'Enter' && !isMod) {
        if (event.shiftKey && a.prevMatch) {
          event.preventDefault();
          a.prevMatch();
          return;
        }
        if (!event.shiftKey && a.nextMatch) {
          event.preventDefault();
          a.nextMatch();
          return;
        }
      }

      // F11 fullscreen toggle (prevent default browser fullscreen)
      if (event.key === 'F11') {
        if (a.toggleFullscreen) {
          event.preventDefault();
          a.toggleFullscreen();
        }
        return;
      }

      // Escape — close search or reset interaction mode
      if (event.key === 'Escape') {
        if (a.escape) {
          event.preventDefault();
          a.escape();
        }
        return;
      }

      // Arrow keys, PageDown/PageUp, Home, End, and single-letter mode shortcuts — skip if in text input
      if (isTextInput) return;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          // Arrow keys only navigate pages in single mode; in continuous/horizontal
          // modes the browser handles native scrolling.
          if (scrollMode === 'single' && a.nextPage) {
            event.preventDefault();
            a.nextPage();
          }
          return;
        case 'ArrowLeft':
        case 'ArrowUp':
          if (scrollMode === 'single' && a.prevPage) {
            event.preventDefault();
            a.prevPage();
          }
          return;
        case 'PageDown':
          if (a.nextPage) {
            event.preventDefault();
            a.nextPage();
          }
          return;
        case 'PageUp':
          if (a.prevPage) {
            event.preventDefault();
            a.prevPage();
          }
          return;
        case 'Home':
          if (a.firstPage) {
            event.preventDefault();
            a.firstPage();
          }
          return;
        case 'End':
          if (a.lastPage) {
            event.preventDefault();
            a.lastPage();
          }
          return;
        case 'v':
        case 'V':
          if (!isMod && a.setPointerMode) {
            event.preventDefault();
            a.setPointerMode();
          }
          return;
        case 'h':
        case 'H':
          if (!isMod && a.setPanMode) {
            event.preventDefault();
            a.setPanMode();
          }
          return;
        case 'z':
        case 'Z':
          if (!isMod && a.setMarqueeMode) {
            event.preventDefault();
            a.setMarqueeMode();
          }
          return;
      }
    };

    target.addEventListener('keydown', handleKeyDown);
    return () => target.removeEventListener('keydown', handleKeyDown);
  }, [enabled, trackedTarget, scrollMode, targetRef]);
}

export type { KeyboardActions, UseKeyboardShortcutsOptions };
