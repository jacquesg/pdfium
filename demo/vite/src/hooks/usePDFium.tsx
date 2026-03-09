import { PDFiumProvider as LibPDFiumProvider, usePDFium as useLibPDFium } from '@scaryterry/pdfium/react';
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DemoPDFiumContextValue, DemoPDFiumProviderProps } from './pdfium-provider.types';
import { useMockPDFiumValue } from './mock-pdfium-provider';

const workerUrl = new URL('../pdfium.worker.ts', import.meta.url).toString();

const DemoPDFiumContext = createContext<DemoPDFiumContextValue | null>(null);

function SampleDocumentBootstrap({
  enabled,
  pdfium,
}: {
  enabled: boolean;
  pdfium: Pick<DemoPDFiumContextValue, 'document' | 'error' | 'isInitialising' | 'loadDocument'>;
}) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!enabled || attemptedRef.current || pdfium.isInitialising || pdfium.document || pdfium.error) return;
    attemptedRef.current = true;

    let active = true;
    fetch('/sample.pdf')
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((ab) => {
        if (!active || !ab) return;
        return pdfium.loadDocument(new Uint8Array(ab), 'sample.pdf');
      })
      .catch(() => {
        // Best-effort bootstrap: sample loading failures should not block the demo.
      });

    return () => {
      active = false;
    };
  }, [enabled, pdfium]);

  return null;
}

function RuntimeProviderBridge({
  children,
  loadSampleDocument,
  retryInitialisation,
}: {
  children: DemoPDFiumProviderProps['children'];
  loadSampleDocument: boolean;
  retryInitialisation: () => void;
}) {
  const pdfium = useLibPDFium();

  const value = useMemo<DemoPDFiumContextValue>(
    () => ({
      ...pdfium,
      retryInitialisation,
    }),
    [pdfium, retryInitialisation],
  );

  return (
    <DemoPDFiumContext.Provider value={value}>
      <SampleDocumentBootstrap enabled={loadSampleDocument} pdfium={value} />
      {children}
    </DemoPDFiumContext.Provider>
  );
}

function MockProviderBridge({
  children,
  retryInitialisation,
  mockOptions,
}: {
  children: DemoPDFiumProviderProps['children'];
  retryInitialisation: () => void;
  mockOptions: DemoPDFiumProviderProps['mockOptions'];
}) {
  const value = useMockPDFiumValue(retryInitialisation, mockOptions);

  return <DemoPDFiumContext.Provider value={value}>{children}</DemoPDFiumContext.Provider>;
}

export function PDFiumProvider({
  children,
  mode = 'runtime',
  loadSampleDocument = true,
  mockOptions,
}: DemoPDFiumProviderProps) {
  const [providerGeneration, setProviderGeneration] = useState(0);

  const retryInitialisation = useCallback(() => {
    setProviderGeneration((current) => current + 1);
  }, []);

  if (mode === 'mock') {
    return (
      <MockProviderBridge key={providerGeneration} retryInitialisation={retryInitialisation} mockOptions={mockOptions}>
        {children}
      </MockProviderBridge>
    );
  }

  return (
    <LibPDFiumProvider key={providerGeneration} wasmUrl={wasmUrl} workerUrl={workerUrl}>
      <RuntimeProviderBridge loadSampleDocument={loadSampleDocument} retryInitialisation={retryInitialisation}>
        {children}
      </RuntimeProviderBridge>
    </LibPDFiumProvider>
  );
}

/** Re-export demo wrapper hook as the canonical import path for demo consumers. */
export function usePDFium() {
  const ctx = useContext(DemoPDFiumContext);
  if (!ctx) {
    throw new Error('usePDFium must be used within a PDFiumProvider');
  }
  return ctx;
}

export type { DemoPDFiumContextValue, DemoPDFiumProviderProps, MockPDFiumProviderOptions } from './pdfium-provider.types';
