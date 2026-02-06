import { PDFium, type PDFiumDocument } from '@scaryterry/pdfium/browser';
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface PDFiumContextType {
  pdfium: PDFium | null;
  document: PDFiumDocument | null;
  loadDocument: (data: Uint8Array | ArrayBuffer, name: string) => Promise<void>;
  documentName: string | null;
  error: Error | null;
  isLoading: boolean;
}

const PDFiumContext = createContext<PDFiumContextType | undefined>(undefined);

export function PDFiumProvider({ children }: { children: ReactNode }) {
  const [pdfium, setPdfium] = useState<PDFium | null>(null);
  const [document, setDocument] = useState<PDFiumDocument | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialise PDFium on mount
  useEffect(() => {
    async function init() {
      try {
        const wasmRes = await fetch(wasmUrl);
        const wasmBinary = await wasmRes.arrayBuffer();
        
        // We use 'using' pattern in guides, but here we need a persistent instance
        const instance = await PDFium.init({ wasmBinary });
        setPdfium(instance);
        
        // Load sample automatically
        await loadSample(instance);
      } catch (err) {
        console.error("Failed to init PDFium:", err);
        setError(err instanceof Error ? err : new Error('Failed to initialise PDFium'));
      } finally {
        setIsLoading(false);
      }
    }
    init();

    // Cleanup on unmount
    return () => {
      // We can't easily access the current 'pdfium' state here in strict mode without refs,
      // but for a single-page app root, explicit cleanup isn't strictly critical 
      // as the browser tab closing cleans up WASM memory.
      // Ideally, we'd store pdfium in a useRef to clean it up.
    };
  }, []);

  async function loadSample(instance: PDFium) {
    try {
      const res = await fetch('/sample.pdf');
      const data = await res.arrayBuffer();
      await loadDocumentInternal(instance, data, 'sample.pdf');
    } catch (err) {
      console.error("Failed to load sample:", err);
    }
  }

  async function loadDocumentInternal(instance: PDFium, data: Uint8Array | ArrayBuffer, name: string) {
    if (document) {
      document.dispose();
    }
    
    try {
      const newDoc = await instance.openDocument(new Uint8Array(data));
      setDocument(newDoc);
      setDocumentName(name);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to open document'));
    }
  }

  const loadDocument = async (data: Uint8Array | ArrayBuffer, name: string) => {
    if (!pdfium) return;
    await loadDocumentInternal(pdfium, data, name);
  };

  return (
    <PDFiumContext.Provider value={{ pdfium, document, loadDocument, documentName, error, isLoading }}>
      {children}
    </PDFiumContext.Provider>
  );
}

export function usePDFium() {
  const context = useContext(PDFiumContext);
  if (context === undefined) {
    throw new Error('usePDFium must be used within a PDFiumProvider');
  }
  return context;
}
