import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { acknowledgeMutationEntries } from './annotation-mutation-store-entry-operations.js';
import type { AnnotationMutationStoreState } from './annotation-mutation-store-state.js';
import { buildMutationStoreAcknowledgeContext } from './annotation-mutation-store-write-context.js';

export function acknowledgeMutationStorePage(
  state: AnnotationMutationStoreState,
  pageIndex: number,
  annotations: readonly SerialisedAnnotation[],
  notify: () => void,
): void {
  acknowledgeMutationEntries(buildMutationStoreAcknowledgeContext(state), pageIndex, annotations, notify);
}
