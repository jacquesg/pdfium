import { useCallback, useRef, useState } from 'react';
import type { TextMarkupActionTool } from '../types.js';

export function useEditorProviderMarkupActions() {
  const [pendingMarkupAction, setPendingMarkupAction] = useState<{
    tool: TextMarkupActionTool;
    requestId: number;
  } | null>(null);
  const markupActionCounterRef = useRef(0);

  const resetPendingMarkupAction = useCallback(() => {
    setPendingMarkupAction(null);
  }, []);

  const triggerMarkupAction = useCallback((tool: TextMarkupActionTool) => {
    markupActionCounterRef.current += 1;
    setPendingMarkupAction({ tool, requestId: markupActionCounterRef.current });
  }, []);

  const clearPendingMarkupAction = useCallback((requestId?: number) => {
    setPendingMarkupAction((previous) => {
      if (previous === null) return null;
      if (requestId !== undefined && previous.requestId !== requestId) {
        return previous;
      }
      return null;
    });
  }, []);

  return {
    clearPendingMarkupAction,
    pendingMarkupAction,
    resetPendingMarkupAction,
    triggerMarkupAction,
  };
}
