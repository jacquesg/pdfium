import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationCrudActions } from '../hooks/use-annotation-crud.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import type { ToolConfigKey, ToolConfigMap } from '../types.js';

/**
 * Props for the `AnnotationPropertyPanel` component.
 */
export interface AnnotationPropertyPanelProps {
  /** The selected annotation's serialised data. */
  readonly annotation: SerialisedAnnotation;
  /** Annotation CRUD actions for applying changes. */
  readonly crud: AnnotationCrudActions;
  /** Whether annotation mutations are currently in-flight for this selection. */
  readonly mutationPending?: boolean;
  /**
   * Optional callback for syncing edited annotation style values back into
   * tool defaults used for newly created annotations.
   */
  readonly onToolConfigChange?: <T extends ToolConfigKey>(tool: T, config: Partial<ToolConfigMap[T]>) => void;
  /**
   * Optional callback to publish transient preview patches while a property
   * interaction is in progress (for live visual updates without persistence).
   */
  readonly onPreviewPatch?: (annotationIndex: number, patch: OptimisticAnnotationPatch) => void;
  /** Optional callback to clear any active preview patch for this annotation. */
  readonly onClearPreviewPatch?: (annotationIndex: number) => void;
}
