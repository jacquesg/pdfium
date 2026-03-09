import { useRef } from 'react';
import type {
  AnnotationStyleLocalState,
  UseAnnotationStyleLocalStateOptions,
} from './annotation-style-local-state.types.js';
import { useAnnotationStyleBorderLocalState } from './use-annotation-style-border-local-state.js';
import { useAnnotationStyleColourLocalState } from './use-annotation-style-colour-local-state.js';
import { useAnnotationStyleFillLocalState } from './use-annotation-style-fill-local-state.js';

export function useAnnotationStyleLocalState({
  annotation,
  canEditBorder,
  effectiveType,
  fillColourType,
  getPersistedEditableBorderForAnnotation,
  inFlightStyleCommitsRef,
  pendingBorderCommitRef,
  pendingColourCommitRef,
  persistedBorderForCommitRef,
}: UseAnnotationStyleLocalStateOptions): AnnotationStyleLocalState {
  const colourState = useAnnotationStyleColourLocalState({
    annotation,
    effectiveType,
    fillColourType,
    inFlightStyleCommitsRef,
    pendingColourCommitRef,
  });
  const fillState = useAnnotationStyleFillLocalState({
    annotation,
    effectiveType,
    fillColourType,
    inFlightStyleCommitsRef,
    pendingColourCommitRef,
  });
  const borderState = useAnnotationStyleBorderLocalState({
    annotation,
    canEditBorder,
    getPersistedEditableBorderForAnnotation,
    inFlightStyleCommitsRef,
    pendingBorderCommitRef,
    persistedBorderForCommitRef,
  });
  const panelRootRef = useRef<HTMLDivElement | null>(null);

  return {
    ...borderState,
    ...colourState,
    ...fillState,
    panelRootRef,
  };
}
