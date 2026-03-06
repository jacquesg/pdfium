/**
 * Editor save hook.
 *
 * Calls `document.save()` and marks the editor state as clean.
 *
 * @module react/editor/hooks/use-editor-save
 */

import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { useEditor } from '../context.js';
import { useAnnotationMutationStore } from '../internal/annotation-mutation-store.js';
import { flushPendingEditorCommits } from '../internal/flush-pending-editor-commits.js';

/**
 * Return type of `useEditorSave`.
 */
export interface EditorSaveActions {
  /** Save the document. Returns the saved bytes. */
  save(): Promise<Uint8Array | null>;
  /** Whether a save operation is in progress. */
  readonly isSaving: boolean;
  /** Whether the document has unsaved changes. */
  readonly isDirty: boolean;
}

/**
 * Provides a save function that serialises the document
 * and marks the editor state as clean.
 *
 * Must be called within an `EditorProvider` and `PDFiumProvider`.
 */
export function useEditorSave(document: WorkerPDFiumDocument | null): EditorSaveActions {
  const { isDirty, markClean } = useEditor();
  const mutationStore = useAnnotationMutationStore();
  const [isSaving, setIsSaving] = useState(false);
  const inFlightSaveRef = useRef<Promise<Uint8Array | null> | null>(null);

  const save = useCallback(async (): Promise<Uint8Array | null> => {
    if (!document) return null;
    if (inFlightSaveRef.current !== null) {
      return inFlightSaveRef.current;
    }

    const saveOperation = (async (): Promise<Uint8Array | null> => {
      setIsSaving(true);
      try {
        await flushPendingEditorCommits(mutationStore);
        const bytes = await document.save();
        flushSync(() => {
          markClean();
        });
        return bytes;
      } finally {
        setIsSaving(false);
        inFlightSaveRef.current = null;
      }
    })();

    inFlightSaveRef.current = saveOperation;
    return saveOperation;
  }, [document, markClean, mutationStore]);

  return { save, isSaving, isDirty };
}
