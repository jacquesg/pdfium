import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';

/**
 * Props for the `EditorOverlay` component.
 */
export interface EditorOverlayProps {
  /** Zero-based page index. */
  readonly pageIndex: number;
  /** Scale factor. */
  readonly scale: number;
  /** Original page height in PDF points. */
  readonly originalHeight: number;
  /** Container width in pixels. */
  readonly width: number;
  /** Container height in pixels. */
  readonly height: number;
  /** Annotations on this page (from `useAnnotations`). */
  readonly annotations: readonly SerialisedAnnotation[];
  /** Whether annotation data for this page is still resolving. */
  readonly annotationsPending?: boolean;
  /** The worker document instance. */
  readonly document: WorkerPDFiumDocument | null;
  /** Whether annotation selection/hit-target interactions are enabled. */
  readonly selectionEnabled?: boolean;
}
