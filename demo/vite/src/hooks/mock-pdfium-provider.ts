import {
  DocumentError,
  PageError,
  PageRotation,
  PDFiumErrorCode,
  type WorkerPDFium,
  type WorkerPDFiumDocument,
} from '@scaryterry/pdfium/browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DemoPDFiumContextValue, MockPDFiumProviderOptions } from './pdfium-provider.types';

const DEFAULT_INIT_DELAY_MS = 40;
const DEFAULT_PROTECTED_PASSWORD = '12345678';
const SAMPLE_PAGE_WIDTH = 612;
const SAMPLE_PAGE_HEIGHT = 792;

interface PendingProtectedDocument {
  data: ArrayBuffer | Uint8Array;
  name: string;
}

function toUint8Array(data: ArrayBuffer | Uint8Array): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function isPdfBinary(data: ArrayBuffer | Uint8Array): boolean {
  const bytes = toUint8Array(data);
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function isProtectedDocumentName(name: string): boolean {
  return name.toLowerCase() === 'protected.pdf';
}

function isProtectedBinary(data: ArrayBuffer | Uint8Array): boolean {
  return toUint8Array(data).byteLength >= 300_000;
}

function createRenderedPage(width: number, height: number): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = 255;
  }
  return data;
}

function createMockPage() {
  return {
    width: SAMPLE_PAGE_WIDTH,
    height: SAMPLE_PAGE_HEIGHT,
    async render(options?: { scale?: number }) {
      const scale = options?.scale ?? 1;
      const width = Math.max(1, Math.round(SAMPLE_PAGE_WIDTH * scale));
      const height = Math.max(1, Math.round(SAMPLE_PAGE_HEIGHT * scale));
      return {
        width,
        height,
        originalWidth: SAMPLE_PAGE_WIDTH,
        originalHeight: SAMPLE_PAGE_HEIGHT,
        data: createRenderedPage(width, height),
      };
    },
    async getPageInfo() {
      return {
        rotation: PageRotation.None,
        hasTransparency: false,
        boundingBox: { left: 0, top: SAMPLE_PAGE_HEIGHT, right: SAMPLE_PAGE_WIDTH, bottom: 0 },
        charCount: 128,
        pageBoxes: {
          media: { left: 0, top: SAMPLE_PAGE_HEIGHT, right: SAMPLE_PAGE_WIDTH, bottom: 0 },
          crop: { left: 0, top: SAMPLE_PAGE_HEIGHT, right: SAMPLE_PAGE_WIDTH, bottom: 0 },
          bleed: undefined,
          trim: undefined,
          art: undefined,
        },
      };
    },
    async getAnnotations() {
      return [];
    },
    async dispose() {},
    async [Symbol.asyncDispose]() {},
  };
}

function createMockDocument(name: string, id: string, pageCount = 1): WorkerPDFiumDocument {
  const pageFactory = () => createMockPage();

  const mockDocument = {
    id,
    pageCount,
    async getPage(pageIndex: number) {
      if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) {
        throw new PageError(PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE, `Page ${String(pageIndex)} is out of range`);
      }
      return pageFactory();
    },
    async renderPage(pageIndex: number, options?: { scale?: number }) {
      const page = await this.getPage(pageIndex);
      return page.render(options);
    },
    async importPages() {},
    async createNUp() {
      return createMockDocument(`${name}-nup`, `${id}-nup`, 1);
    },
    async save() {
      return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    },
    async dispose() {},
    async [Symbol.asyncDispose]() {},
  };

  return mockDocument as unknown as WorkerPDFiumDocument;
}

async function resolveMockDocument(
  data: ArrayBuffer | Uint8Array,
  name: string,
  nextDocumentId: () => string,
  password?: string,
  protectedPassword = DEFAULT_PROTECTED_PASSWORD,
): Promise<WorkerPDFiumDocument> {
  if (isProtectedDocumentName(name) || isProtectedBinary(data)) {
    if (!password) {
      throw new DocumentError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED, 'The document requires a password to open');
    }
    if (password !== protectedPassword) {
      throw new DocumentError(PDFiumErrorCode.DOC_PASSWORD_INCORRECT, 'Incorrect password');
    }
    return createMockDocument(name, nextDocumentId(), 1);
  }

  if (!isPdfBinary(data)) {
    throw new DocumentError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'The document format is invalid or unsupported');
  }

  return createMockDocument(name, nextDocumentId(), 2);
}

function createMockInstance(
  nextDocumentId: () => string,
  protectedPassword: string,
): WorkerPDFium {
  const mockInstance = {
    async openDocument(data: ArrayBuffer | Uint8Array, options?: { password?: string }) {
      return resolveMockDocument(data, 'document.pdf', nextDocumentId, options?.password, protectedPassword);
    },
    async createDocumentBuilder() {
      const pageBuilder = {
        async addText() {
          return pageBuilder;
        },
        async addRectangle() {
          return pageBuilder;
        },
        async addLine() {
          return pageBuilder;
        },
        async addEllipse() {
          return pageBuilder;
        },
      };

      const builder = {
        async loadStandardFont(name: string) {
          void name;
          return {};
        },
        async addPage() {
          return pageBuilder;
        },
        async save() {
          return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
        },
        async dispose() {},
        async [Symbol.asyncDispose]() {},
      };

      return builder;
    },
    async dispose() {},
    async [Symbol.asyncDispose]() {},
  };

  return mockInstance as unknown as WorkerPDFium;
}

function useMockPDFiumValue(
  retryInitialisation: () => void,
  options?: MockPDFiumProviderOptions,
): DemoPDFiumContextValue {
  const protectedPassword = options?.protectedPassword ?? DEFAULT_PROTECTED_PASSWORD;
  const [instance, setInstance] = useState<WorkerPDFium | null>(null);
  const [document, setDocument] = useState<WorkerPDFiumDocument | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [documentRevision, setDocumentRevision] = useState(0);
  const [pageRevisionVersion, setPageRevisionVersion] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialising, setIsInitialising] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordAttempted, setPasswordAttempted] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const pageRevisionsRef = useRef<Map<number, number>>(new Map());
  const pendingProtectedRef = useRef<PendingProtectedDocument | null>(null);
  const nextDocumentIdRef = useRef(1);

  const nextDocumentId = useCallback(() => {
    const id = `mock-doc-${String(nextDocumentIdRef.current)}`;
    nextDocumentIdRef.current += 1;
    return id;
  }, []);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      if (options?.initialisationError) {
        setInstance(null);
        setError(options.initialisationError);
        setIsInitialising(false);
        return;
      }

      setInstance(createMockInstance(nextDocumentId, protectedPassword));
      setError(null);
      setIsInitialising(false);
    }, options?.initDelayMs ?? DEFAULT_INIT_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [nextDocumentId, options?.initDelayMs, options?.initialisationError, protectedPassword]);

  const resetPasswordState = useCallback(() => {
    pendingProtectedRef.current = null;
    setPasswordRequired(false);
    setPasswordAttempted(false);
    setPasswordError(null);
  }, []);

  const clearLoadedDocument = useCallback(() => {
    setDocument(null);
    setDocumentName(null);
  }, []);

  const bumpDocumentRevision = useCallback(() => {
    setDocumentRevision((current) => current + 1);
  }, []);

  const bumpPageRevision = useCallback((pageIndex: number) => {
    if (!Number.isInteger(pageIndex) || pageIndex < 0) return;
    pageRevisionsRef.current.set(pageIndex, (pageRevisionsRef.current.get(pageIndex) ?? 0) + 1);
    setPageRevisionVersion((current) => current + 1);
  }, []);

  const getPageRevision = useCallback((pageIndex: number) => {
    return pageRevisionsRef.current.get(pageIndex) ?? 0;
  }, []);

  const invalidateCache = useCallback(() => {
    pageRevisionsRef.current.clear();
    setPageRevisionVersion((current) => current + 1);
    setDocumentRevision((current) => current + 1);
  }, []);

  const commitLoadedDocument = useCallback(
    (loadedDocument: WorkerPDFiumDocument, name: string) => {
      pageRevisionsRef.current.clear();
      setPageRevisionVersion((current) => current + 1);
      setDocument(loadedDocument);
      setDocumentName(name);
      setDocumentRevision((current) => current + 1);
      setError(null);
      resetPasswordState();
    },
    [resetPasswordState],
  );

  const loadDocument = useCallback(
    async (data: ArrayBuffer | Uint8Array, name: string) => {
      if (!instance) {
        throw new Error('PDFium not initialised');
      }

      clearLoadedDocument();
      setError(null);
      resetPasswordState();

      if (isProtectedDocumentName(name)) {
        pendingProtectedRef.current = { data, name };
        setPasswordRequired(true);
        return;
      }

      try {
        const loadedDocument = await resolveMockDocument(data, name, nextDocumentId, undefined, protectedPassword);
        commitLoadedDocument(loadedDocument, name);
      } catch (nextError) {
        clearLoadedDocument();
        setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
      }
    },
    [clearLoadedDocument, commitLoadedDocument, instance, nextDocumentId, protectedPassword, resetPasswordState],
  );

  const loadDocumentFromUrl = useCallback(
    async (url: string, name: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch document: HTTP ${String(response.status)}`);
        }
        await loadDocument(await response.arrayBuffer(), name);
      } catch (nextError) {
        clearLoadedDocument();
        setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
      }
    },
    [clearLoadedDocument, loadDocument],
  );

  const submitPassword = useCallback(
    async (password: string) => {
      const pending = pendingProtectedRef.current;
      if (!pending) return;

      setPasswordRequired(true);
      setPasswordAttempted(true);
      setPasswordError(null);
      setError(null);

      try {
        const loadedDocument = await resolveMockDocument(
          pending.data,
          pending.name,
          nextDocumentId,
          password,
          protectedPassword,
        );
        commitLoadedDocument(loadedDocument, pending.name);
      } catch (nextError) {
        if (nextError instanceof DocumentError && nextError.code === PDFiumErrorCode.DOC_PASSWORD_INCORRECT) {
          clearLoadedDocument();
          setPasswordRequired(true);
          setPasswordAttempted(true);
          setPasswordError('Incorrect password');
          return;
        }
        clearLoadedDocument();
        setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
      }
    },
    [clearLoadedDocument, commitLoadedDocument, nextDocumentId, protectedPassword],
  );

  const cancelPassword = useCallback(() => {
    resetPasswordState();
    clearLoadedDocument();
  }, [clearLoadedDocument, resetPasswordState]);

  return useMemo<DemoPDFiumContextValue>(
    () => ({
      instance,
      document,
      documentName,
      documentRevision,
      pageRevisionVersion,
      error,
      isInitialising,
      password: {
        required: passwordRequired,
        attempted: passwordAttempted,
        error: passwordError,
        submit: submitPassword,
        cancel: cancelPassword,
      },
      bumpDocumentRevision,
      bumpPageRevision,
      getPageRevision,
      invalidateCache,
      loadDocument,
      loadDocumentFromUrl,
      retryInitialisation,
    }),
    [
      bumpDocumentRevision,
      bumpPageRevision,
      cancelPassword,
      document,
      documentName,
      documentRevision,
      error,
      getPageRevision,
      instance,
      invalidateCache,
      isInitialising,
      loadDocument,
      loadDocumentFromUrl,
      pageRevisionVersion,
      passwordAttempted,
      passwordError,
      passwordRequired,
      retryInitialisation,
      submitPassword,
    ],
  );
}

export { useMockPDFiumValue };
