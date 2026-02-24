import type { ReactNode } from 'react';
import type { PDFiumStores } from './stores-context.js';

interface InitialDocument {
  data: ArrayBuffer | Uint8Array;
  name: string;
}

interface PDFiumProviderCoreOptions {
  /** Pre-fetched WASM binary. Takes priority over `wasmUrl`. */
  wasmBinary?: ArrayBuffer;
  /** URL to fetch the WASM binary from. Ignored if `wasmBinary` is provided. */
  wasmUrl?: string;
  workerUrl: string;
  initialDocument?: InitialDocument;
  maxCachedPages?: number;
  /** Optional custom stores (advanced usage/testing). Defaults to provider-scoped stores. */
  stores?: PDFiumStores;
}

interface PDFiumProviderProps extends PDFiumProviderCoreOptions {
  children: ReactNode;
}

interface UsePDFiumProviderControllerOptions {
  wasmBinary: ArrayBuffer | undefined;
  wasmUrl: string | undefined;
  workerUrl: string;
  initialDocument: InitialDocument | undefined;
  maxCachedPages: number | undefined;
  stores: PDFiumStores | undefined;
}

export type { InitialDocument, PDFiumProviderCoreOptions, PDFiumProviderProps, UsePDFiumProviderControllerOptions };
