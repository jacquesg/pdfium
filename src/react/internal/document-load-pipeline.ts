'use client';

import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { PDFiumError, PDFiumErrorCode } from '../../core/errors.js';
import { disposeDocumentSafely } from './document-cleanup.js';
import { toError } from './error-normalization.js';

interface OpenDocumentOptions {
  password?: string;
}

type OpenDocumentFn = (data: ArrayBuffer | Uint8Array, options: OpenDocumentOptions) => Promise<WorkerPDFiumDocument>;

interface RunDocumentLoadPipelineOptions {
  data: ArrayBuffer | Uint8Array;
  password?: string;
  generation: number;
  getCurrentGeneration: () => number;
  openDocument: OpenDocumentFn;
  disposePreviousDocument: () => Promise<void>;
  onLoadSuccess: (document: WorkerPDFiumDocument) => void | Promise<void>;
  onPasswordRequired: () => void;
  onPasswordIncorrect: () => void;
  onGenericError: (error: Error) => void;
  onStaleDocumentDisposeError?: (error: unknown) => void;
}

async function runDocumentLoadPipeline({
  data,
  password,
  generation,
  getCurrentGeneration,
  openDocument,
  disposePreviousDocument,
  onLoadSuccess,
  onPasswordRequired,
  onPasswordIncorrect,
  onGenericError,
  onStaleDocumentDisposeError,
}: RunDocumentLoadPipelineOptions): Promise<void> {
  try {
    const newDocument = await openDocument(data, password !== undefined ? { password } : {});

    if (generation !== getCurrentGeneration()) {
      if (onStaleDocumentDisposeError) {
        await disposeDocumentSafely({
          document: newDocument,
          onError: onStaleDocumentDisposeError,
        });
      } else {
        await disposeDocumentSafely({
          document: newDocument,
        });
      }
      return;
    }

    await onLoadSuccess(newDocument);
    await disposePreviousDocument();
  } catch (error) {
    if (generation !== getCurrentGeneration()) {
      return;
    }

    await disposePreviousDocument();

    if (error instanceof PDFiumError && error.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {
      onPasswordRequired();
      return;
    }

    if (error instanceof PDFiumError && error.code === PDFiumErrorCode.DOC_PASSWORD_INCORRECT) {
      onPasswordIncorrect();
      return;
    }

    onGenericError(toError(error));
  }
}

export { runDocumentLoadPipeline };
export type { OpenDocumentFn, OpenDocumentOptions, RunDocumentLoadPipelineOptions };
