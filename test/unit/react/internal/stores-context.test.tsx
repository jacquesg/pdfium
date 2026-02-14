import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { QueryStore } from '../../../../src/react/internal/query-store.js';
import { LRURenderStore } from '../../../../src/react/internal/render-store.js';
import { createPDFiumStores, usePDFiumStores } from '../../../../src/react/internal/stores-context.js';

// Mock WorkerPDFium so PDFiumProvider can initialise without a real worker
vi.mock('../../../../src/context/worker-client.js', () => ({
  WorkerPDFium: {
    create: vi.fn().mockResolvedValue({
      openDocument: vi.fn(),
      dispose: vi.fn(),
    }),
  },
}));

const { PDFiumProvider } = await import('../../../../src/react/context.js');

describe('usePDFiumStores', () => {
  it('throws when used outside PDFiumProvider', () => {
    expect(() => {
      renderHook(() => usePDFiumStores());
    }).toThrow('usePDFiumStores must be used within <PDFiumProvider>');
  });

  it('returns scoped stores when inside PDFiumProvider', () => {
    const stores = createPDFiumStores();

    const { result } = renderHook(() => usePDFiumStores(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <PDFiumProvider wasmBinary={new ArrayBuffer(0)} workerUrl="worker.js" stores={stores}>
          {children}
        </PDFiumProvider>
      ),
    });

    expect(result.current.queryStore).toBeInstanceOf(QueryStore);
    expect(result.current.renderStore).toBeInstanceOf(LRURenderStore);
    expect(result.current.queryStore).toBe(stores.queryStore);
    expect(result.current.renderStore).toBe(stores.renderStore);
  });
});

describe('createPDFiumStores', () => {
  it('creates fresh store instances', () => {
    const a = createPDFiumStores();
    const b = createPDFiumStores();

    expect(a.queryStore).toBeInstanceOf(QueryStore);
    expect(a.renderStore).toBeInstanceOf(LRURenderStore);
    expect(a.queryStore).not.toBe(b.queryStore);
    expect(a.renderStore).not.toBe(b.renderStore);
  });

  it('passes maxCachedPages to render store', () => {
    const stores = createPDFiumStores({ maxCachedPages: 10 });

    expect(stores.renderStore.maxEntries).toBe(10);
  });
});
