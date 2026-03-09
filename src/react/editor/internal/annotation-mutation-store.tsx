export type { OptimisticAnnotationPatch, ResolvedEditorAnnotationsOptions } from './annotation-mutation-patch-utils.js';
export {
  AnnotationMutationStoreProvider,
  type AnnotationMutationStoreProviderProps,
  useAnnotationMutationStore,
} from './annotation-mutation-store-context.js';
export { AnnotationMutationStore } from './annotation-mutation-store-core.js';
export {
  useAnnotationMutationPending,
  useAnyAnnotationMutationPending,
} from './use-annotation-mutation-pending.js';
export { useResolvedEditorAnnotations } from './use-resolved-editor-annotations.js';
