import { PDFiumProvider as LibPDFiumProvider, usePDFium as useLibPDFium } from '@scaryterry/pdfium/react';
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';
import { useEffect, useRef, type ReactNode } from 'react';

function SampleDocumentBootstrap() {
  const { isInitialising, document, loadDocument } = useLibPDFium();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current || isInitialising || document) return;
    attemptedRef.current = true;

    let active = true;
    fetch('/sample.pdf')
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((ab) => {
        if (!active || !ab) return;
        return loadDocument(new Uint8Array(ab), 'sample.pdf');
      })
      .catch(() => {
        // Best-effort bootstrap: sample loading failures should not block the demo.
      });

    return () => {
      active = false;
    };
  }, [document, isInitialising, loadDocument]);

  return null;
}

export function PDFiumProvider({ children }: { children: ReactNode }) {
  return (
    <LibPDFiumProvider wasmUrl={wasmUrl} workerUrl="/worker.js">
      <SampleDocumentBootstrap />
      {children}
    </LibPDFiumProvider>
  );
}

/** Re-export SDK hook as the canonical import path for demo consumers. */
export function usePDFium() {
  return useLibPDFium();
}
