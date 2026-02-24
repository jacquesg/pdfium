import { createContext, useContext } from 'react';
import { QueryStore } from './query-store.js';
import { LRURenderStore } from './render-store.js';

interface PDFiumStores {
  queryStore: QueryStore;
  renderStore: LRURenderStore;
}

function createPDFiumStores(options?: { maxCachedPages?: number }): PDFiumStores {
  return {
    queryStore: new QueryStore(),
    renderStore: new LRURenderStore(options?.maxCachedPages),
  };
}

const PDFiumStoresContext = createContext<PDFiumStores | null>(null);

function usePDFiumStores(): PDFiumStores {
  const stores = useContext(PDFiumStoresContext);
  if (!stores) {
    throw new Error('usePDFiumStores must be used within <PDFiumProvider>');
  }
  return stores;
}

export { createPDFiumStores, PDFiumStoresContext, usePDFiumStores };
export type { PDFiumStores };
