import { useMemo } from 'react';
import type { WorkerPDFium, WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { ProviderPasswordValue, ProviderStableDocCallbacks } from './provider-types.js';

interface PDFiumInstanceContextValue {
  instance: WorkerPDFium | null;
}

interface PDFiumDocumentContextValue extends ProviderStableDocCallbacks {
  document: WorkerPDFiumDocument | null;
  documentName: string | null;
  documentRevision: number;
  pageRevisionVersion: number;
  error: Error | null;
  isInitialising: boolean;
  password: ProviderPasswordValue;
}

interface BuildPDFiumDocumentContextValueOptions {
  document: WorkerPDFiumDocument | null;
  documentName: string | null;
  documentRevision: number;
  pageRevisionVersion: number;
  stableDocCallbacks: ProviderStableDocCallbacks;
  error: Error | null;
  isInitialising: boolean;
  passwordValue: ProviderPasswordValue;
}

function buildPDFiumInstanceContextValue(instance: WorkerPDFium | null): PDFiumInstanceContextValue {
  return { instance };
}

function buildPDFiumDocumentContextValue({
  document,
  documentName,
  documentRevision,
  pageRevisionVersion,
  stableDocCallbacks,
  error,
  isInitialising,
  passwordValue,
}: BuildPDFiumDocumentContextValueOptions): PDFiumDocumentContextValue {
  return {
    document,
    documentName,
    documentRevision,
    pageRevisionVersion,
    ...stableDocCallbacks,
    error,
    isInitialising,
    password: passwordValue,
  };
}

function usePDFiumContextValues({
  instance,
  document,
  documentName,
  documentRevision,
  pageRevisionVersion,
  stableDocCallbacks,
  error,
  isInitialising,
  passwordValue,
}: BuildPDFiumDocumentContextValueOptions & { instance: WorkerPDFium | null }): {
  instanceValue: PDFiumInstanceContextValue;
  documentValue: PDFiumDocumentContextValue;
} {
  const instanceValue = useMemo<PDFiumInstanceContextValue>(
    () => buildPDFiumInstanceContextValue(instance),
    [instance],
  );

  const documentValue = useMemo<PDFiumDocumentContextValue>(
    () =>
      buildPDFiumDocumentContextValue({
        document,
        documentName,
        documentRevision,
        pageRevisionVersion,
        stableDocCallbacks,
        error,
        isInitialising,
        passwordValue,
      }),
    [
      document,
      documentName,
      documentRevision,
      pageRevisionVersion,
      stableDocCallbacks,
      error,
      isInitialising,
      passwordValue,
    ],
  );

  return {
    instanceValue,
    documentValue,
  };
}

export { buildPDFiumDocumentContextValue, buildPDFiumInstanceContextValue, usePDFiumContextValues };
export type { BuildPDFiumDocumentContextValueOptions, PDFiumDocumentContextValue, PDFiumInstanceContextValue };
