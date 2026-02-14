import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkerPDFium, WorkerPDFiumDocument } from '../../../../src/context/worker-client.js';
import {
  buildPDFiumDocumentContextValue,
  buildPDFiumInstanceContextValue,
  usePDFiumContextValues,
} from '../../../../src/react/internal/provider-context-values.js';
import type {
  ProviderPasswordValue,
  ProviderStableDocCallbacks,
} from '../../../../src/react/internal/provider-types.js';

function createStableDocCallbacks(): ProviderStableDocCallbacks {
  return {
    bumpDocumentRevision: vi.fn(),
    invalidateCache: vi.fn(),
    loadDocument: vi.fn(async () => undefined),
    loadDocumentFromUrl: vi.fn(async () => undefined),
  };
}

function createPasswordValue(): ProviderPasswordValue {
  return {
    required: false,
    attempted: false,
    error: null,
    submit: vi.fn(async () => undefined),
    cancel: vi.fn(),
  };
}

function createMockWorker(): WorkerPDFium {
  return { dispose: vi.fn(), openDocument: vi.fn() } as unknown as WorkerPDFium;
}

function createMockDocument(id: string): WorkerPDFiumDocument {
  return { id } as unknown as WorkerPDFiumDocument;
}

describe('buildPDFiumInstanceContextValue', () => {
  it('maps instance into context shape', () => {
    const instance = createMockWorker();
    expect(buildPDFiumInstanceContextValue(instance)).toEqual({ instance });
    expect(buildPDFiumInstanceContextValue(null)).toEqual({ instance: null });
  });
});

describe('buildPDFiumDocumentContextValue', () => {
  it('builds document context payload with callbacks and password', () => {
    const document = createMockDocument('doc-1');
    const stableDocCallbacks = createStableDocCallbacks();
    const passwordValue = createPasswordValue();

    const value = buildPDFiumDocumentContextValue({
      document,
      documentName: 'a.pdf',
      documentRevision: 7,
      stableDocCallbacks,
      error: null,
      isInitialising: false,
      passwordValue,
    });

    expect(value.document).toBe(document);
    expect(value.documentName).toBe('a.pdf');
    expect(value.documentRevision).toBe(7);
    expect(value.error).toBeNull();
    expect(value.isInitialising).toBe(false);
    expect(value.password).toBe(passwordValue);
    expect(value.loadDocument).toBe(stableDocCallbacks.loadDocument);
    expect(value.loadDocumentFromUrl).toBe(stableDocCallbacks.loadDocumentFromUrl);
  });
});

describe('usePDFiumContextValues', () => {
  it('memoizes values when inputs are unchanged', () => {
    const stableDocCallbacks = createStableDocCallbacks();
    const passwordValue = createPasswordValue();
    const props = {
      instance: createMockWorker(),
      document: createMockDocument('doc-1'),
      documentName: 'a.pdf',
      documentRevision: 1,
      stableDocCallbacks,
      error: null as Error | null,
      isInitialising: false,
      passwordValue,
    };

    const { result, rerender } = renderHook((nextProps) => usePDFiumContextValues(nextProps), {
      initialProps: props,
    });

    const firstInstanceValue = result.current.instanceValue;
    const firstDocumentValue = result.current.documentValue;

    rerender(props);

    expect(result.current.instanceValue).toBe(firstInstanceValue);
    expect(result.current.documentValue).toBe(firstDocumentValue);
  });

  it('updates only affected memoized value when instance changes', () => {
    const stableDocCallbacks = createStableDocCallbacks();
    const passwordValue = createPasswordValue();
    const sharedProps = {
      document: createMockDocument('doc-1'),
      documentName: 'a.pdf',
      documentRevision: 1,
      stableDocCallbacks,
      error: null as Error | null,
      isInitialising: false,
      passwordValue,
    };

    const workerA = createMockWorker();
    const workerB = createMockWorker();
    const { result, rerender } = renderHook((props) => usePDFiumContextValues(props), {
      initialProps: { ...sharedProps, instance: workerA },
    });

    const firstDocumentValue = result.current.documentValue;
    rerender({ ...sharedProps, instance: workerB });

    expect(result.current.instanceValue.instance).toBe(workerB);
    expect(result.current.documentValue).toBe(firstDocumentValue);
  });
});
