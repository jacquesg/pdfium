import { createContext, useContext } from 'react';
import type { PDFiumProviderProps } from './internal/provider-config-types.js';
import type { PDFiumDocumentContextValue, PDFiumInstanceContextValue } from './internal/provider-context-values.js';
import { usePDFiumContextValues } from './internal/provider-context-values.js';
import { PDFiumStoresContext } from './internal/stores-context.js';
import { usePDFiumProviderController } from './internal/use-pdfium-provider-controller.js';

// ── Split Contexts ─────────────────────────────────────────────

const PDFiumInstanceContext = createContext<PDFiumInstanceContextValue | null>(null);
const PDFiumDocumentContext = createContext<PDFiumDocumentContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────

function PDFiumProvider({
  children,
  wasmBinary,
  wasmUrl,
  workerUrl,
  initialDocument,
  maxCachedPages,
  stores,
}: PDFiumProviderProps) {
  if (!wasmBinary && !wasmUrl) {
    throw new Error('PDFiumProvider requires either `wasmBinary` or `wasmUrl` prop');
  }

  const {
    scopedStores,
    instance,
    document,
    documentName,
    documentRevision,
    error,
    isInitialising,
    stableDocCallbacks,
    passwordValue,
  } = usePDFiumProviderController({
    wasmBinary,
    wasmUrl,
    workerUrl,
    initialDocument,
    maxCachedPages,
    stores,
  });

  const { instanceValue, documentValue } = usePDFiumContextValues({
    instance,
    document,
    documentName,
    documentRevision,
    stableDocCallbacks,
    error,
    isInitialising,
    passwordValue,
  });

  return (
    <PDFiumStoresContext.Provider value={scopedStores}>
      <PDFiumInstanceContext.Provider value={instanceValue}>
        <PDFiumDocumentContext.Provider value={documentValue}>{children}</PDFiumDocumentContext.Provider>
      </PDFiumInstanceContext.Provider>
    </PDFiumStoresContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────

function usePDFiumInstance(): PDFiumInstanceContextValue {
  const ctx = useContext(PDFiumInstanceContext);
  if (!ctx) throw new Error('usePDFiumInstance must be used within <PDFiumProvider>');
  return ctx;
}

function usePDFiumDocument(): PDFiumDocumentContextValue {
  const ctx = useContext(PDFiumDocumentContext);
  if (!ctx) throw new Error('usePDFiumDocument must be used within <PDFiumProvider>');
  return ctx;
}

/** Merged convenience hook — re-renders on both instance AND document changes. */
function usePDFium(): PDFiumInstanceContextValue & PDFiumDocumentContextValue {
  return { ...usePDFiumInstance(), ...usePDFiumDocument() };
}

export { PDFiumProvider, usePDFium, usePDFiumInstance, usePDFiumDocument };
export type { PDFiumProviderProps, PDFiumDocumentContextValue as PDFiumContextValue };
