'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Colour, FlattenResult } from '../../core/types.js';
import { type FlattenFlags, FormFieldType } from '../../core/types.js';
import { usePDFViewer } from '../components/pdf-viewer.js';
import { useDocumentFormActions } from '../hooks/use-document-form-actions.js';
import { useDocumentInfo } from '../hooks/use-document-info.js';
import { useFormWidgets } from '../hooks/use-form-widgets.js';
import { usePageFormActions } from '../hooks/use-page-form-actions.js';
import { useRequestCounter } from './async-guards.js';
import { parseHexColour } from './forms-panel-helpers.js';
import type { FormsPanelViewProps } from './forms-panel-view.js';

function useFormsPanelController(): FormsPanelViewProps {
  const { viewer } = usePDFViewer();
  const doc = viewer.document;
  const pageIndex = viewer.navigation.pageIndex;

  const { data: widgets = [] } = useFormWidgets(doc, pageIndex);
  const { data: docInfo } = useDocumentInfo(doc);
  const { killFocus, setHighlight } = useDocumentFormActions(doc);
  const { undo, flatten } = usePageFormActions(doc, pageIndex);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [highlightColour, setHighlightColour] = useState('#FFFF00');
  const [highlightAlpha, setHighlightAlpha] = useState(100);
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [flattenResult, setFlattenResult] = useState<FlattenResult | null>(null);
  const [confirmingFlatten, setConfirmingFlatten] = useState<FlattenFlags | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lifecycleGuard = useRequestCounter();
  const highlightRequests = useRequestCounter();
  const killFocusRequests = useRequestCounter();
  const undoRequests = useRequestCounter();
  const flattenRequests = useRequestCounter();
  const highlightAlphaInputId = useId();

  // biome-ignore lint/correctness/useExhaustiveDependencies: page/document transitions reset panel-local ephemeral state
  useEffect(() => {
    lifecycleGuard.invalidate();
    highlightRequests.invalidate();
    killFocusRequests.invalidate();
    undoRequests.invalidate();
    flattenRequests.invalidate();
    setSelectedIndex(null);
    setFlattenResult(null);
    setFormError(null);
    setConfirmingFlatten(null);
    if (confirmTimerRef.current !== null) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
  }, [doc, pageIndex, lifecycleGuard, highlightRequests, killFocusRequests, undoRequests, flattenRequests]);

  const handleHighlightToggle = useCallback(async () => {
    if (!doc) return;
    const lifecycleToken = lifecycleGuard.getCurrent();
    const requestId = highlightRequests.next();
    const isStale = () => lifecycleGuard.getCurrent() !== lifecycleToken || !highlightRequests.isCurrent(requestId);

    try {
      if (highlightEnabled) {
        await setHighlight(FormFieldType.Unknown, { r: 0, g: 0, b: 0, a: 0 } satisfies Colour, 0);
        if (isStale()) return;
        setHighlightEnabled(false);
      } else {
        const { r, g, b } = parseHexColour(highlightColour);
        await setHighlight(FormFieldType.Unknown, { r, g, b, a: highlightAlpha } satisfies Colour, highlightAlpha);
        if (isStale()) return;
        setHighlightEnabled(true);
      }
    } catch (error) {
      if (isStale()) return;
      setFormError(error instanceof Error ? error.message : 'Highlight toggle failed');
    }
  }, [doc, highlightColour, highlightAlpha, highlightEnabled, setHighlight, lifecycleGuard, highlightRequests]);

  const handleKillFocus = useCallback(async () => {
    const lifecycleToken = lifecycleGuard.getCurrent();
    const requestId = killFocusRequests.next();
    const isStale = () => lifecycleGuard.getCurrent() !== lifecycleToken || !killFocusRequests.isCurrent(requestId);
    try {
      await killFocus();
    } catch (error) {
      if (isStale()) return;
      setFormError(error instanceof Error ? error.message : 'Kill focus failed');
    }
  }, [killFocus, lifecycleGuard, killFocusRequests]);

  const handleUndo = useCallback(async () => {
    const lifecycleToken = lifecycleGuard.getCurrent();
    const requestId = undoRequests.next();
    const isStale = () => lifecycleGuard.getCurrent() !== lifecycleToken || !undoRequests.isCurrent(requestId);
    try {
      await undo();
    } catch (error) {
      if (isStale()) return;
      setFormError(error instanceof Error ? error.message : 'Undo failed');
    }
  }, [undo, lifecycleGuard, undoRequests]);

  const resetFlattenConfirm = useCallback(() => {
    setConfirmingFlatten(null);
    if (confirmTimerRef.current !== null) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
  }, []);

  const handleFlatten = useCallback(
    async (flags: FlattenFlags) => {
      if (confirmingFlatten !== flags) {
        resetFlattenConfirm();
        setConfirmingFlatten(flags);
        confirmTimerRef.current = setTimeout(resetFlattenConfirm, 3000);
        return;
      }

      resetFlattenConfirm();
      const lifecycleToken = lifecycleGuard.getCurrent();
      const requestId = flattenRequests.next();
      const isStale = () => lifecycleGuard.getCurrent() !== lifecycleToken || !flattenRequests.isCurrent(requestId);
      try {
        const result = await flatten(flags);
        if (isStale()) return;
        setFlattenResult(result);
      } catch (error) {
        if (isStale()) return;
        setFormError(error instanceof Error ? error.message : 'Flatten failed');
      }
    },
    [confirmingFlatten, flatten, resetFlattenConfirm, lifecycleGuard, flattenRequests],
  );

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current !== null) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  return {
    widgets,
    hasForm: docInfo?.hasForm,
    selectedIndex,
    onSelectIndex: setSelectedIndex,
    formError,
    onDismissError: () => setFormError(null),
    highlightColour,
    onHighlightColourChange: setHighlightColour,
    highlightAlpha,
    highlightAlphaInputId,
    onHighlightAlphaChange: setHighlightAlpha,
    onHighlightToggle: voidAsync(handleHighlightToggle),
    highlightEnabled,
    onKillFocus: voidAsync(handleKillFocus),
    onUndo: voidAsync(handleUndo),
    confirmingFlatten,
    onFlatten: (flags) => {
      void handleFlatten(flags);
    },
    flattenResult,
  };
}

function voidAsync<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
  return (...args: T): void => {
    void fn(...args);
  };
}

export { useFormsPanelController };
