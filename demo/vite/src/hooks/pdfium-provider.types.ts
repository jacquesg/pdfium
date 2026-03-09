import type { ReactNode } from 'react';
import type { WorkerPDFium, WorkerPDFiumDocument } from '@scaryterry/pdfium/browser';

type DemoPDFium = WorkerPDFium;
type DemoPDFiumDocument = WorkerPDFiumDocument;

interface DemoPasswordState {
  required: boolean;
  attempted: boolean;
  error: string | null;
  submit: (password: string) => Promise<void>;
  cancel: () => void;
}

interface DemoPDFiumContextValue {
  instance: DemoPDFium | null;
  document: DemoPDFiumDocument | null;
  documentName: string | null;
  documentRevision: number;
  pageRevisionVersion: number;
  error: Error | null;
  isInitialising: boolean;
  password: DemoPasswordState;
  bumpDocumentRevision: () => void;
  bumpPageRevision: (pageIndex: number) => void;
  getPageRevision: (pageIndex: number) => number;
  invalidateCache: () => void;
  loadDocument: (data: ArrayBuffer | Uint8Array, name: string) => Promise<void>;
  loadDocumentFromUrl: (url: string, name: string) => Promise<void>;
  retryInitialisation: () => void;
}

type PDFiumProviderMode = 'runtime' | 'mock';

interface MockPDFiumProviderOptions {
  initialisationError?: Error;
  initDelayMs?: number;
  protectedPassword?: string;
}

interface DemoPDFiumProviderProps {
  children: ReactNode;
  mode?: PDFiumProviderMode;
  loadSampleDocument?: boolean;
  mockOptions?: MockPDFiumProviderOptions;
}

export type {
  DemoPDFium,
  DemoPDFiumDocument,
  DemoPasswordState,
  DemoPDFiumContextValue,
  DemoPDFiumProviderProps,
  MockPDFiumProviderOptions,
  PDFiumProviderMode,
};
