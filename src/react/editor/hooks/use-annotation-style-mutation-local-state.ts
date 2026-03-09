import type { UseAnnotationStyleEditingMutationStateOptions } from './annotation-style-editing-mutation-state.types.js';
import type { UseAnnotationStyleLocalStateOptions } from './annotation-style-local-state.types.js';
import { useAnnotationStyleLocalState } from './use-annotation-style-local-state.js';
import { useAnnotationStylePresets } from './use-annotation-style-presets.js';

interface UseAnnotationStyleMutationLocalStateOptions
  extends Pick<
      UseAnnotationStyleEditingMutationStateOptions,
      | 'annotation'
      | 'canEditBorder'
      | 'effectiveType'
      | 'fillColourType'
      | 'getPersistedEditableBorderForAnnotation'
      | 'localBorderWidthRef'
      | 'onToolConfigChange'
    >,
    Pick<
      UseAnnotationStyleLocalStateOptions,
      'inFlightStyleCommitsRef' | 'pendingBorderCommitRef' | 'pendingColourCommitRef' | 'persistedBorderForCommitRef'
    > {}

export function useAnnotationStyleMutationLocalState({
  annotation,
  canEditBorder,
  effectiveType,
  fillColourType,
  getPersistedEditableBorderForAnnotation,
  inFlightStyleCommitsRef,
  pendingBorderCommitRef,
  pendingColourCommitRef,
  persistedBorderForCommitRef,
  localBorderWidthRef,
  onToolConfigChange,
}: UseAnnotationStyleMutationLocalStateOptions) {
  const localState = useAnnotationStyleLocalState({
    annotation,
    canEditBorder,
    effectiveType,
    fillColourType,
    getPersistedEditableBorderForAnnotation,
    inFlightStyleCommitsRef,
    pendingBorderCommitRef,
    pendingColourCommitRef,
    persistedBorderForCommitRef,
  });

  localBorderWidthRef.current = localState.localBorderWidth;

  const presets = useAnnotationStylePresets({
    effectiveType,
    localBorderWidth: localState.localBorderWidth,
    onToolConfigChange,
  });

  return {
    ...localState,
    ...presets,
  };
}
