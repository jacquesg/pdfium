import { describe, expect, it, vi } from 'vitest';
import type { WorkerPDFiumDocument } from '../../../../src/context/worker-client.js';
import { PDFiumError, PDFiumErrorCode } from '../../../../src/core/errors.js';
import { runDocumentLoadPipeline } from '../../../../src/react/internal/document-load-pipeline.js';

function createDocument(id: string): WorkerPDFiumDocument {
  return {
    id,
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as WorkerPDFiumDocument;
}

function getDisposeMock(document: WorkerPDFiumDocument): ReturnType<typeof vi.fn> {
  return (document as unknown as { dispose: ReturnType<typeof vi.fn> }).dispose;
}

describe('runDocumentLoadPipeline', () => {
  it('loads and swaps document, then disposes previous document', async () => {
    const nextDocument = createDocument('doc-next');
    const callOrder: string[] = [];

    await runDocumentLoadPipeline({
      data: new ArrayBuffer(8),
      generation: 4,
      getCurrentGeneration: () => 4,
      openDocument: vi.fn(async () => nextDocument),
      disposePreviousDocument: async () => {
        callOrder.push('dispose-previous');
      },
      onLoadSuccess: () => {
        callOrder.push('load-success');
      },
      onPasswordRequired: vi.fn(),
      onPasswordIncorrect: vi.fn(),
      onGenericError: vi.fn(),
    });

    expect(callOrder).toEqual(['load-success', 'dispose-previous']);
  });

  it('disposes stale newly-opened document and skips other callbacks', async () => {
    const staleDocument = createDocument('doc-stale');
    const disposePreviousDocument = vi.fn(async () => undefined);
    const onLoadSuccess = vi.fn();
    const onStaleDocumentDisposeError = vi.fn();

    await runDocumentLoadPipeline({
      data: new ArrayBuffer(8),
      generation: 1,
      getCurrentGeneration: () => 2,
      openDocument: vi.fn(async () => staleDocument),
      disposePreviousDocument,
      onLoadSuccess,
      onPasswordRequired: vi.fn(),
      onPasswordIncorrect: vi.fn(),
      onGenericError: vi.fn(),
      onStaleDocumentDisposeError,
    });

    expect(getDisposeMock(staleDocument)).toHaveBeenCalledTimes(1);
    expect(disposePreviousDocument).not.toHaveBeenCalled();
    expect(onLoadSuccess).not.toHaveBeenCalled();
    expect(onStaleDocumentDisposeError).not.toHaveBeenCalled();
  });

  it('routes password-required errors and disposes previous document', async () => {
    const onPasswordRequired = vi.fn();
    const disposePreviousDocument = vi.fn(async () => undefined);

    await runDocumentLoadPipeline({
      data: new ArrayBuffer(8),
      generation: 5,
      getCurrentGeneration: () => 5,
      openDocument: vi.fn(async () => {
        throw new PDFiumError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED, 'password required');
      }),
      disposePreviousDocument,
      onLoadSuccess: vi.fn(),
      onPasswordRequired,
      onPasswordIncorrect: vi.fn(),
      onGenericError: vi.fn(),
    });

    expect(disposePreviousDocument).toHaveBeenCalledTimes(1);
    expect(onPasswordRequired).toHaveBeenCalledTimes(1);
  });

  it('routes password-incorrect errors and disposes previous document', async () => {
    const onPasswordIncorrect = vi.fn();
    const disposePreviousDocument = vi.fn(async () => undefined);

    await runDocumentLoadPipeline({
      data: new ArrayBuffer(8),
      generation: 5,
      getCurrentGeneration: () => 5,
      openDocument: vi.fn(async () => {
        throw new PDFiumError(PDFiumErrorCode.DOC_PASSWORD_INCORRECT, 'wrong password');
      }),
      disposePreviousDocument,
      onLoadSuccess: vi.fn(),
      onPasswordRequired: vi.fn(),
      onPasswordIncorrect,
      onGenericError: vi.fn(),
    });

    expect(disposePreviousDocument).toHaveBeenCalledTimes(1);
    expect(onPasswordIncorrect).toHaveBeenCalledTimes(1);
  });

  it('normalizes unknown errors and routes to generic error callback', async () => {
    const onGenericError = vi.fn();
    const disposePreviousDocument = vi.fn(async () => undefined);

    await runDocumentLoadPipeline({
      data: new ArrayBuffer(8),
      generation: 3,
      getCurrentGeneration: () => 3,
      openDocument: vi.fn(async () => {
        throw 'boom';
      }),
      disposePreviousDocument,
      onLoadSuccess: vi.fn(),
      onPasswordRequired: vi.fn(),
      onPasswordIncorrect: vi.fn(),
      onGenericError,
    });

    expect(disposePreviousDocument).toHaveBeenCalledTimes(1);
    expect(onGenericError).toHaveBeenCalledTimes(1);
    expect(onGenericError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect((onGenericError.mock.calls[0]?.[0] as Error).message).toContain('boom');
  });

  it('ignores stale errors without disposing previous document', async () => {
    const disposePreviousDocument = vi.fn(async () => undefined);
    const onGenericError = vi.fn();

    await runDocumentLoadPipeline({
      data: new ArrayBuffer(8),
      generation: 3,
      getCurrentGeneration: () => 4,
      openDocument: vi.fn(async () => {
        throw new Error('stale');
      }),
      disposePreviousDocument,
      onLoadSuccess: vi.fn(),
      onPasswordRequired: vi.fn(),
      onPasswordIncorrect: vi.fn(),
      onGenericError,
    });

    expect(disposePreviousDocument).not.toHaveBeenCalled();
    expect(onGenericError).not.toHaveBeenCalled();
  });

  it('reports stale-document dispose errors through callback', async () => {
    const staleDocument = createDocument('doc-stale');
    const disposeError = new Error('dispose failed');
    getDisposeMock(staleDocument).mockRejectedValueOnce(disposeError);
    const onStaleDocumentDisposeError = vi.fn();

    await runDocumentLoadPipeline({
      data: new ArrayBuffer(8),
      generation: 1,
      getCurrentGeneration: () => 2,
      openDocument: vi.fn(async () => staleDocument),
      disposePreviousDocument: vi.fn(async () => undefined),
      onLoadSuccess: vi.fn(),
      onPasswordRequired: vi.fn(),
      onPasswordIncorrect: vi.fn(),
      onGenericError: vi.fn(),
      onStaleDocumentDisposeError,
    });

    expect(onStaleDocumentDisposeError).toHaveBeenCalledWith(disposeError);
  });
});
