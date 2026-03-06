/**
 * Redaction workflow hook.
 *
 * Two-step workflow: mark regions for redaction, then apply.
 *
 * @module react/editor/hooks/use-redaction
 */

import { useCallback, useRef, useState } from 'react';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { AnnotationType, type Rect } from '../../../core/types.js';
import { usePDFiumDocument, usePDFiumInstance } from '../../context.js';
import { disposeSafelyAsync } from '../../internal/dispose-safely.js';
import { ApplyRedactionsCommand, type CreateAnnotationOptions } from '../command.js';
import { useEditor } from '../context.js';
import {
  isEditorRedactionAnnotation,
  isUnsupportedAnnotationCreateError,
  REDACTION_FALLBACK_CONTENTS_MARKER,
} from '../redaction-utils.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

const BLACK = { r: 0, g: 0, b: 0, a: 255 } as const;

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
  const [isApplying, setIsApplying] = useState(false);
  const isApplyingRef = useRef(false);

  const markRedaction = useCallback(
    async (rect: Rect, options?: CreateAnnotationOptions): Promise<number | undefined> => {
      try {
        return await crud.createAnnotation(AnnotationType.Redact, rect, options);
      } catch (error) {
        if (!isUnsupportedAnnotationCreateError(error, 'Redact')) {
          throw error;
        }

        const fillColour = options?.colour ?? BLACK;
        return crud.createAnnotation(AnnotationType.Square, rect, {
          contents: REDACTION_FALLBACK_CONTENTS_MARKER,
          strokeColour: fillColour,
          interiorColour: fillColour,
        });
      }
    },
    [crud],
  );

  const applyRedactions = useCallback(
    async (pageIndex: number): Promise<void> => {
      if (!document || !instance || isApplyingRef.current) return;
      isApplyingRef.current = true;
      setIsApplying(true);
      try {
        const page = await document.getPage(pageIndex);
        try {
          const annotations = await page.getAnnotations();
          const markedRedactionCount = annotations.filter(isEditorRedactionAnnotation).length;
          if (markedRedactionCount === 0) {
            return;
          }
        } finally {
          await disposeSafelyAsync(page);
        }

        await commandStack.push(new ApplyRedactionsCommand(document, (data) => instance.openDocument(data), pageIndex));
        bumpPageRevision(pageIndex);
      } finally {
        isApplyingRef.current = false;
        setIsApplying(false);
      }
    },
    [document, instance, bumpPageRevision, commandStack],
  );

  return { markRedaction, applyRedactions, isApplying };
}
