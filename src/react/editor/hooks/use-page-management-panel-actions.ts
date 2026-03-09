import { useCallback, useMemo } from 'react';
import type { PageManagementActions } from './use-page-management.js';

interface UsePageManagementPanelActionsOptions {
  readonly actions: PageManagementActions;
  readonly pageHeight: number;
  readonly pageIndex: number;
  readonly pageCount: number;
  readonly pageWidth: number;
}

export function usePageManagementPanelActions({
  actions,
  pageHeight,
  pageIndex,
  pageCount,
  pageWidth,
}: UsePageManagementPanelActionsOptions) {
  const canDelete = pageCount > 1;
  const canMoveUp = pageIndex > 0;
  const canMoveDown = pageIndex < pageCount - 1;
  const pageLabel = useMemo(() => `Page ${pageIndex + 1} of ${pageCount}`, [pageCount, pageIndex]);

  const handleDelete = useCallback(() => {
    if (!canDelete) return;
    void actions.deletePage(pageIndex, pageWidth, pageHeight);
  }, [actions, canDelete, pageHeight, pageIndex, pageWidth]);

  const handleInsertBefore = useCallback(() => {
    void actions.insertBlankPage(pageIndex);
  }, [actions, pageIndex]);

  const handleInsertAfter = useCallback(() => {
    void actions.insertBlankPage(pageIndex + 1);
  }, [actions, pageIndex]);

  const handleMoveUp = useCallback(() => {
    if (!canMoveUp) return;
    void actions.movePage(pageIndex, pageIndex - 1);
  }, [actions, canMoveUp, pageIndex]);

  const handleMoveDown = useCallback(() => {
    if (!canMoveDown) return;
    void actions.movePage(pageIndex, pageIndex + 2);
  }, [actions, canMoveDown, pageIndex]);

  return {
    canDelete,
    canMoveDown,
    canMoveUp,
    handleDelete,
    handleInsertAfter,
    handleInsertBefore,
    handleMoveDown,
    handleMoveUp,
    pageLabel,
  };
}
