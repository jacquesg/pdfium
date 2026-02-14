'use client';

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { ToolbarContext } from './pdf-toolbar-context.js';
import { getFocusableToolbarItems, initialiseToolbarRovingTabStop } from './pdf-toolbar-focus.js';
import type { ToolbarContextValue } from './pdf-toolbar-types.js';
import { applyToolbarTabStops, getNextRovingIndex, isToolbarRovingKey } from './toolbar-roving.js';

interface PDFToolbarRootProps {
  contextValue: ToolbarContextValue;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

function PDFToolbarRoot({ contextValue, children, ...rest }: PDFToolbarRootProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = toolbarRef.current;
    if (!element) return;
    initialiseToolbarRovingTabStop(element);
  });

  const handleToolbarKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const element = toolbarRef.current;
    if (!element) return;

    if (!isToolbarRovingKey(event.key)) return;

    const focusables = getFocusableToolbarItems(element);
    if (focusables.length === 0) return;

    const activeElement = element.ownerDocument.activeElement;
    if (!(activeElement instanceof HTMLElement)) return;

    const currentIndex = focusables.indexOf(activeElement);
    if (currentIndex === -1) return;

    event.preventDefault();

    const nextIndex = getNextRovingIndex(event.key, currentIndex, focusables.length);
    if (nextIndex < 0) return;

    const nextElement = focusables[nextIndex];
    if (!nextElement) return;

    applyToolbarTabStops(focusables, nextElement);
    nextElement.focus();
  }, []);

  return (
    <ToolbarContext.Provider value={contextValue}>
      <div ref={toolbarRef} role="toolbar" aria-orientation="horizontal" onKeyDown={handleToolbarKeyDown} {...rest}>
        {children}
      </div>
    </ToolbarContext.Provider>
  );
}

export { PDFToolbarRoot };
export type { PDFToolbarRootProps };
