/**
 * Redaction workflow hook.
 *
 * Two-step workflow: mark regions for redaction, then apply.
 *
 * @module react/editor/hooks/use-redaction
 */

import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { Rect } from '../../../core/types.js';
import { usePDFiumDocument, usePDFiumInstance } from '../../context.js';
import type { CreateAnnotationOptions } from '../command.js';
import { useEditor } from '../context.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';
import { useRedactionApplyAction } from './use-redaction-apply-action.js';
import { useRedactionMarkAction } from './use-redaction-mark-action.js';

/**
 * Return type of `useRedaction`.
 */
export interface RedactionActions {
  /** Mark a region for redaction. Creates a Redact annotation. */
  markRedaction(rect: Rect, options?: CreateAnnotationOptions): Promise<number | undefined>;
  /** Apply all pending redactions by removing overlapping page content. */
  applyRedactions(pageIndex: number): Promise<void>;
  /** Whether redactions are currently being applied. */
  readonly isApplying: boolean;
}

/**
 * Provides a two-step redaction workflow: mark regions, then apply.
 *
 * Must be called within an `EditorProvider` and `PDFiumProvider`.
 */
export function useRedaction(crud: AnnotationCrudActions, document: WorkerPDFiumDocument | null): RedactionActions {
  const { instance } = usePDFiumInstance();
  const { bumpPageRevision } = usePDFiumDocument();
  const { commandStack } = useEditor();
  const markRedaction = useRedactionMarkAction(crud);
  const { applyRedactions, isApplying } = useRedactionApplyAction({
    bumpPageRevision,
    commandStack,
    document,
    instance,
  });

  return { markRedaction, applyRedactions, isApplying };
}
