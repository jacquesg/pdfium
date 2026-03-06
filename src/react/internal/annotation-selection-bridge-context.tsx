import { createContext, useContext } from 'react';

interface AnnotationSelectionBridgeSelection {
  readonly pageIndex: number;
  readonly annotationIndex: number;
}

interface AnnotationSelectionBridgeValue {
  readonly selection: AnnotationSelectionBridgeSelection | null;
  setSelection(selection: AnnotationSelectionBridgeSelection | null): void;
}

const AnnotationSelectionBridgeContext = createContext<AnnotationSelectionBridgeValue | null>(null);

function useAnnotationSelectionBridgeOptional(): AnnotationSelectionBridgeValue | null {
  return useContext(AnnotationSelectionBridgeContext);
}

export { AnnotationSelectionBridgeContext, useAnnotationSelectionBridgeOptional };
export type { AnnotationSelectionBridgeSelection, AnnotationSelectionBridgeValue };
