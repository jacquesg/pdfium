'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { WorkerPDFium } from '../../context/worker-client.js';
import type { DocumentLifecycleAction, DocumentLifecycleState } from './document-lifecycle.js';
import { toError } from './error-normalization.js';
import type { ProviderPasswordValue, ProviderStableDocCallbacks } from './provider-types.js';
import type { PDFiumStores } from './stores-context.js';

type SetDocumentRevision = (updater: (prev: number) => number) => void;
type SetProviderError = (error: Error) => void;

type LoadDocumentInternal = (
  instance: WorkerPDFium,
  data: ArrayBuffer | Uint8Array,
  name: string,
  password?: string,
) => Promise<void>;

interface UseProviderDocumentApiOptions {
  instance: WorkerPDFium | null;
  documentLifecycle: DocumentLifecycleState;
  dispatchDocumentLifecycle: (action: DocumentLifecycleAction) => void;
  scopedStores: PDFiumStores;
  loadDocumentInternal: LoadDocumentInternal;
  loadDocumentBufferFromUrl: (url: string, signal?: AbortSignal) => Promise<ArrayBuffer>;
  setDocumentRevision: SetDocumentRevision;
  setError: SetProviderError;
}

interface UseProviderDocumentApiResult {
  stableDocCallbacks: ProviderStableDocCallbacks;
  passwordValue: ProviderPasswordValue;
}

function useProviderDocumentApi({
  instance,
  documentLifecycle,
  dispatchDocumentLifecycle,
  scopedStores,
  loadDocumentInternal,
  loadDocumentBufferFromUrl,
  setDocumentRevision,
  setError,
}: UseProviderDocumentApiOptions): UseProviderDocumentApiResult {
  const loadRequestRef = useRef(0);
  const urlLoadAbortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(true);
  const latestInstanceRef = useRef(instance);
  const latestPendingDocumentRef = useRef(documentLifecycle.pendingDocument);
  latestInstanceRef.current = instance;
  latestPendingDocumentRef.current = documentLifecycle.pendingDocument;

  const cancelActiveUrlLoad = useCallback(() => {
    const activeController = urlLoadAbortRef.current;
    if (!activeController) return;
    activeController.abort();
    urlLoadAbortRef.current = null;
  }, []);

  const beginLoadRequest = useCallback(() => {
    loadRequestRef.current += 1;
    cancelActiveUrlLoad();
    return loadRequestRef.current;
  }, [cancelActiveUrlLoad]);

  const loadDocument = useCallback(
    async (data: ArrayBuffer | Uint8Array, name: string) => {
      if (!activeRef.current) return;
      if (!instance) throw new Error('PDFium not initialised');
      beginLoadRequest();
      if (!activeRef.current) return;
      if (latestInstanceRef.current !== instance) return;
      await loadDocumentInternal(instance, data, name);
    },
    [beginLoadRequest, instance, loadDocumentInternal],
  );

  const loadDocumentFromUrl = useCallback(
    async (url: string, name: string) => {
      if (!activeRef.current) return;
      if (!instance) throw new Error('PDFium not initialised');
      const requestId = beginLoadRequest();
      if (!activeRef.current) return;
      const controller = new AbortController();
      urlLoadAbortRef.current = controller;
      try {
        const buffer = await loadDocumentBufferFromUrl(url, controller.signal);
        if (!activeRef.current) return;
        if (controller.signal.aborted) return;
        if (urlLoadAbortRef.current !== controller) return;
        if (latestInstanceRef.current !== instance) return;
        if (requestId !== loadRequestRef.current) return;
        urlLoadAbortRef.current = null;
        await loadDocumentInternal(instance, buffer, name);
      } catch (error) {
        if (urlLoadAbortRef.current === controller) {
          urlLoadAbortRef.current = null;
        }
        if (!activeRef.current) return;
        if (controller.signal.aborted) return;
        if (latestInstanceRef.current === instance && requestId === loadRequestRef.current) {
          setError(toError(error));
        }
      }
    },
    [beginLoadRequest, instance, loadDocumentBufferFromUrl, loadDocumentInternal, setError],
  );

  const bumpDocumentRevision = useCallback(() => {
    setDocumentRevision((prev) => prev + 1);
  }, [setDocumentRevision]);

  const invalidateCache = useCallback(() => {
    scopedStores.queryStore.clear();
    scopedStores.renderStore.clear();
    setDocumentRevision((prev) => prev + 1);
  }, [scopedStores, setDocumentRevision]);

  const passwordSubmit = useCallback(
    async (password: string) => {
      if (!activeRef.current) return;
      const pendingDocument = documentLifecycle.pendingDocument;
      if (!instance || !pendingDocument) return;
      if (latestInstanceRef.current !== instance) return;
      if (latestPendingDocumentRef.current !== pendingDocument) return;
      beginLoadRequest();
      if (!activeRef.current) return;
      const { data, name } = pendingDocument;
      dispatchDocumentLifecycle({ type: 'passwordSubmit' });
      await loadDocumentInternal(instance, data, name, password);
    },
    [beginLoadRequest, instance, documentLifecycle.pendingDocument, dispatchDocumentLifecycle, loadDocumentInternal],
  );

  const passwordCancel = useCallback(() => {
    if (!activeRef.current) return;
    const pendingDocument = documentLifecycle.pendingDocument;
    if (!pendingDocument) return;
    if (latestPendingDocumentRef.current !== pendingDocument) return;
    beginLoadRequest();
    if (!activeRef.current) return;
    dispatchDocumentLifecycle({ type: 'passwordCancel' });
  }, [beginLoadRequest, dispatchDocumentLifecycle, documentLifecycle.pendingDocument]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      cancelActiveUrlLoad();
    };
  }, [cancelActiveUrlLoad]);

  const passwordValue = useMemo<ProviderPasswordValue>(
    () => ({
      required: documentLifecycle.password.required,
      attempted: documentLifecycle.password.attempted,
      error: documentLifecycle.password.error,
      submit: passwordSubmit,
      cancel: passwordCancel,
    }),
    [documentLifecycle.password, passwordSubmit, passwordCancel],
  );

  const stableDocCallbacks = useMemo<ProviderStableDocCallbacks>(
    () => ({ bumpDocumentRevision, invalidateCache, loadDocument, loadDocumentFromUrl }),
    [bumpDocumentRevision, invalidateCache, loadDocument, loadDocumentFromUrl],
  );

  return {
    stableDocCallbacks,
    passwordValue,
  };
}

export { useProviderDocumentApi };
export type {
  LoadDocumentInternal,
  SetDocumentRevision,
  SetProviderError,
  UseProviderDocumentApiOptions,
  UseProviderDocumentApiResult,
};
