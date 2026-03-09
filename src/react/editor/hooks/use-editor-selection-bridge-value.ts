import { useMemo } from 'react';

export function useEditorSelectionBridgeValue(
  selection: { pageIndex: number; annotationIndex: number } | null,
  setSelection: (selection: { pageIndex: number; annotationIndex: number } | null) => void,
) {
  return useMemo(
    () => ({
      selection,
      setSelection,
    }),
    [selection, setSelection],
  );
}
