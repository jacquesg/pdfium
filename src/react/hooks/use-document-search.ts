'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { TextSearchResult } from '../../core/types.js';
import { TextSearchFlags } from '../../core/types.js';

interface DocumentSearchMatch {
  pageIndex: number;
  /** Index within the page's search results. */
  localIndex: number;
  rects: Array<{ left: number; top: number; right: number; bottom: number }>;
}

interface UseDocumentSearchOptions {
  /** Debounce delay in ms before starting search after query changes. Default: 300. */
  debounce?: number;
  /** Case-sensitive search. Default: false. */
  caseSensitive?: boolean;
}

interface UseDocumentSearchResult {
  /** All matches found so far (grows incrementally as pages are searched). */
  matches: DocumentSearchMatch[];
  /** Results grouped by page index, for passing to PDFDocumentView. */
  resultsByPage: Map<number, TextSearchResult[]>;
  /** Index map for resolving global match index to { pageIndex, localIndex }. */
  matchIndexMap: Array<{ pageIndex: number; localIndex: number }>;
  /** Current match index (0-based). */
  currentIndex: number;
  /** Total matches found so far. */
  totalMatches: number;
  /** True while pages are still being searched. */
  isSearching: boolean;
  /** Page index of the current match (for scroll-to-page). */
  currentMatchPageIndex: number | undefined;
  /** Navigate to next match. */
  next: () => void;
  /** Navigate to previous match. */
  prev: () => void;
  /** Jump to a specific match by global index. */
  goToMatch: (index: number) => void;
}

/**
 * Cross-document search. Searches all pages incrementally (page 0, then page 1, etc.).
 *
 * Uses a generation counter to cancel in-progress searches when the query changes.
 * Uses debounce to avoid firing searches on every keystroke.
 *
 * Results accumulate progressively — the UI can show partial results while
 * remaining pages are still being searched.
 */
export function useDocumentSearch(
  document: WorkerPDFiumDocument | null,
  query: string,
  options?: UseDocumentSearchOptions,
): UseDocumentSearchResult {
  const debounceMs = options?.debounce ?? 300;
  const caseSensitive = options?.caseSensitive ?? false;

  const [matches, setMatches] = useState<DocumentSearchMatch[]>([]);
  const [resultsByPage, setResultsByPage] = useState<Map<number, TextSearchResult[]>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const generationRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Search effect: debounce, then search page-by-page
  useEffect(() => {
    // Clear results on empty query
    if (!query.trim() || !document) {
      setMatches([]);
      setResultsByPage(new Map());
      setIsSearching(false);
      setCurrentIndex(0);
      return;
    }

    setIsSearching(true);
    setCurrentIndex(0); // Reset match navigation on new search
    setMatches([]); // Clear stale results immediately
    setResultsByPage(new Map()); // Clear stale highlights
    const generation = ++generationRef.current;

    // Debounce
    debounceTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          if (generation !== generationRef.current) return;

          const pageCount = document.pageCount;
          const accumulatedMatches: DocumentSearchMatch[] = [];
          const accumulatedByPage = new Map<number, TextSearchResult[]>();

          for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
            if (generation !== generationRef.current) return; // Cancelled

            try {
              const page = await document.getPage(pageIdx);
              try {
                const flags = caseSensitive ? TextSearchFlags.MatchCase : 0;
                const pageResults = await page.findText(query, flags);

                if (generation !== generationRef.current) return; // Cancelled

                if (pageResults.length > 0) {
                  accumulatedByPage.set(pageIdx, pageResults);
                  for (let localIdx = 0; localIdx < pageResults.length; localIdx++) {
                    const result = pageResults[localIdx];
                    if (result) {
                      accumulatedMatches.push({
                        pageIndex: pageIdx,
                        localIndex: localIdx,
                        rects: result.rects,
                      });
                    }
                  }
                }

                // Update state incrementally so UI shows partial results
                setMatches([...accumulatedMatches]);
                setResultsByPage(new Map(accumulatedByPage));
              } finally {
                await page.dispose();
              }
            } catch {
              // Silently skip failed pages (may be disposed)
              if (generation !== generationRef.current) return;
            }
          }
        } catch {
          // Swallow synchronous query/document failures (e.g., disposed document access).
          // The hook fails closed and keeps external state consistent.
        } finally {
          if (generation === generationRef.current) {
            setIsSearching(false);
          }
        }
      })();
    }, debounceMs);

    return () => {
      generationRef.current++;
      clearTimeout(debounceTimerRef.current);
    };
  }, [document, query, caseSensitive, debounceMs]);

  // Build match index map for PDFDocumentView (memoised to prevent unnecessary re-renders)
  const matchIndexMap = useMemo(
    () => matches.map((m) => ({ pageIndex: m.pageIndex, localIndex: m.localIndex })),
    [matches],
  );

  const next = useCallback(() => {
    setCurrentIndex((i) => (matches.length === 0 ? 0 : (i + 1) % matches.length));
  }, [matches.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => (matches.length === 0 ? 0 : (i - 1 + matches.length) % matches.length));
  }, [matches.length]);

  const goToMatch = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, matches.length - 1)));
    },
    [matches.length],
  );

  const currentMatchPageIndex = matches[currentIndex]?.pageIndex;

  return {
    matches,
    resultsByPage,
    matchIndexMap,
    currentIndex,
    totalMatches: matches.length,
    isSearching,
    currentMatchPageIndex,
    next,
    prev,
    goToMatch,
  };
}

export type { DocumentSearchMatch, UseDocumentSearchOptions, UseDocumentSearchResult };
