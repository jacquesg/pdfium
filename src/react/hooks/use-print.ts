'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import {
  buildPrintDocumentHtml,
  renderPrintPageToBlobUrl,
  resolvePrintPages,
  waitForIframeLoad,
  waitForImageLoad,
} from '../internal/print-pipeline.js';

interface PrintOptions {
  scale?: number;
  pageRange?: readonly number[];
}

interface PrintState {
  isPrinting: boolean;
  progress: number;
  print: () => void;
  cancel: () => void;
}

function usePrint(document: WorkerPDFiumDocument | null, options?: PrintOptions): PrintState {
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const printRunIdRef = useRef(0);
  const cleanedUpRef = useRef(false);
  const isPrintingRef = useRef(false);
  const previousDocumentRef = useRef<WorkerPDFiumDocument | null | undefined>(undefined);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current === null) return;
    globalThis.clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = null;
  }, []);

  const cleanup = useCallback(
    (runId?: number) => {
      if (runId !== undefined && runId !== printRunIdRef.current) return;
      if (cleanedUpRef.current) return;
      cleanedUpRef.current = true;
      isPrintingRef.current = false;
      clearFallbackTimer();
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
      blobUrlsRef.current = [];
      if (iframeRef.current) {
        iframeRef.current.remove();
        iframeRef.current = null;
      }
      setIsPrinting(false);
      setProgress(0);
    },
    [clearFallbackTimer],
  );

  const print = useCallback(async () => {
    if (!document || isPrintingRef.current) return;
    const runId = ++printRunIdRef.current;
    clearFallbackTimer();

    cleanedUpRef.current = false;
    isPrintingRef.current = true;
    setIsPrinting(true);
    setProgress(0);

    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    const scale = options?.scale ?? 2;
    const pages = resolvePrintPages(document.pageCount, options?.pageRange);
    const totalPages = pages.length;
    const urls: string[] = [];

    try {
      for (let i = 0; i < totalPages; i++) {
        if (signal.aborted) return;
        const pageIndex = pages[i];
        if (pageIndex === undefined) continue;
        const url = await renderPrintPageToBlobUrl({ document, pageIndex, scale, signal });
        if (!url) continue;
        urls.push(url);
        blobUrlsRef.current = urls;
        setProgress((i + 1) / totalPages);
      }

      if (signal.aborted) return;
      const html = buildPrintDocumentHtml(urls);

      const iframe = globalThis.document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;';
      iframe.srcdoc = html;
      globalThis.document.body.appendChild(iframe);
      iframeRef.current = iframe;

      // Wait for iframe to load its srcdoc content
      await waitForIframeLoad(iframe, signal);

      if (signal.aborted) return;

      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) {
        cleanup(runId);
        return;
      }

      // Wait for all images to load before triggering print
      const images = Array.from(iframeDoc.querySelectorAll('img'));
      await Promise.all(images.map((img) => waitForImageLoad(img, signal)));

      if (signal.aborted) return;

      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) {
        cleanup(runId);
        return;
      }

      // Cleanup after print completes — afterprint fires on dialogue close;
      // 60s safety timeout covers edge-cases where the event never fires.
      fallbackTimerRef.current = globalThis.setTimeout(() => cleanup(runId), 60_000);
      iframeWindow.addEventListener(
        'afterprint',
        () => {
          cleanup(runId);
        },
        { once: true },
      );

      iframeWindow.print();
    } catch {
      cleanup(runId);
    }
  }, [document, options?.scale, options?.pageRange, cleanup, clearFallbackTimer]);

  const cancel = useCallback(() => {
    printRunIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    const previousDocument = previousDocumentRef.current;
    previousDocumentRef.current = document;

    // Ignore initial mount; only react to document identity changes.
    if (previousDocument === undefined || previousDocument === document) return;

    if (isPrintingRef.current) {
      printRunIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      cleanup();
    }
  }, [document, cleanup]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      printRunIdRef.current += 1;
      abortRef.current?.abort();
      clearFallbackTimer();
      // Force cleanup regardless of flag
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
      blobUrlsRef.current = [];
      if (iframeRef.current) {
        iframeRef.current.remove();
        iframeRef.current = null;
      }
    };
  }, [clearFallbackTimer]);

  return { isPrinting, progress, print, cancel };
}

export { usePrint };
export type { PrintState };
