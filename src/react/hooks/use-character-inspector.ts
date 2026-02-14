'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CharAtPosResponse } from '../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { CharacterInfo, CharBox } from '../../core/types.js';
import { useRequestCounter } from '../internal/async-guards.js';

interface CharInspectorDimensions {
  width: number;
  height: number;
  originalHeight: number;
  originalWidth: number;
}

interface PinnedCharacter {
  info: CharacterInfo;
  box: CharBox;
}

function useCharacterInspector(
  document: WorkerPDFiumDocument | null,
  pageIndex: number,
  dimensions: CharInspectorDimensions,
) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const pendingRequests = useRequestCounter();
  const lastCharIndexRef = useRef(-1);
  const lastDispatchTimeRef = useRef(0);

  const [charInfo, setCharInfo] = useState<CharacterInfo | undefined>(undefined);
  const [charBox, setCharBox] = useState<CharBox | undefined>(undefined);
  const [pinned, setPinned] = useState<PinnedCharacter | null>(null);

  const { width, height, originalHeight, originalWidth } = dimensions;
  const scaleX = originalWidth > 0 ? width / originalWidth : 1;
  const scaleY = originalHeight > 0 ? height / originalHeight : 1;

  const queryCharAtPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = overlayRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const deviceX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const deviceY = (e.clientY - rect.top) * (canvas.height / rect.height);

      return { pageX: deviceX / scaleX, pageY: originalHeight - deviceY / scaleY };
    },
    [scaleX, scaleY, originalHeight],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // When pinned, ignore hover — info stays locked
      if (pinned || !document) return;

      const now = performance.now();
      if (now - lastDispatchTimeRef.current < 50) return;
      lastDispatchTimeRef.current = now;

      const pos = queryCharAtPos(e);
      if (!pos) return;

      const requestId = pendingRequests.next();

      Promise.resolve()
        .then(() => document.getPage(pageIndex))
        .then((page) => {
          if (!pendingRequests.isCurrent(requestId)) {
            page.dispose();
            return;
          }

          return page
            .getCharAtPos(pos.pageX, pos.pageY)
            .then((result: CharAtPosResponse | null) => {
              if (!pendingRequests.isCurrent(requestId)) return;

              if (!result || result.index < 0) {
                if (lastCharIndexRef.current === -1) return;
                lastCharIndexRef.current = -1;
                setCharInfo(undefined);
                setCharBox(undefined);
                return;
              }

              if (result.index === lastCharIndexRef.current) return;
              lastCharIndexRef.current = result.index;
              setCharInfo(result.info);
              setCharBox(result.box);
            })
            .finally(() => page.dispose());
        })
        .catch((err: unknown) => {
          if (!pendingRequests.isCurrent(requestId)) return;
          if (__DEV__) {
            const isDisposed = err instanceof Error && err.message.includes('disposed');
            if (!isDisposed) console.warn('[PDFium] Character inspector error:', err);
          }
          setCharInfo(undefined);
          setCharBox(undefined);
        });
    },
    [pinned, document, pageIndex, queryCharAtPos, pendingRequests],
  );

  const onMouseLeave = useCallback(() => {
    if (pinned) return; // Pinned — don't clear
    pendingRequests.invalidate();
    lastCharIndexRef.current = -1;
    setCharInfo(undefined);
    setCharBox(undefined);
  }, [pinned, pendingRequests]);

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!document) return;

      if (pinned) {
        // Already pinned — pin to whatever character is under the cursor
        const pos = queryCharAtPos(e);
        if (!pos) return;

        const requestId = pendingRequests.next();
        Promise.resolve()
          .then(() => document.getPage(pageIndex))
          .then((page) => {
            if (!pendingRequests.isCurrent(requestId)) {
              page.dispose();
              return;
            }
            return page
              .getCharAtPos(pos.pageX, pos.pageY)
              .then((result: CharAtPosResponse | null) => {
                if (!pendingRequests.isCurrent(requestId)) return;
                const info = result?.info;
                const box = result?.box;
                if (!result || result.index < 0 || !info || !box) {
                  // Clicked empty space — unpin
                  setPinned(null);
                  setCharInfo(undefined);
                  setCharBox(undefined);
                  lastCharIndexRef.current = -1;
                } else {
                  // Pin to new character
                  lastCharIndexRef.current = result.index;
                  setPinned({ info, box });
                  setCharInfo(info);
                  setCharBox(box);
                }
              })
              .finally(() => page.dispose());
          })
          .catch((err: unknown) => {
            if (!pendingRequests.isCurrent(requestId)) return;
            if (__DEV__) {
              const isDisposed = err instanceof Error && err.message.includes('disposed');
              if (!isDisposed) console.warn('[PDFium] Character inspector error:', err);
            }
          });
      } else if (charInfo && charBox) {
        // Not pinned — pin current hover
        setPinned({ info: charInfo, box: charBox });
      }
    },
    [pinned, document, pageIndex, charInfo, charBox, queryCharAtPos, pendingRequests],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: document/page transitions intentionally reset inspector-local state
  useLayoutEffect(() => {
    // Page/document changes invalidate in-flight queries and stale pinned/hover state.
    pendingRequests.invalidate();
    lastCharIndexRef.current = -1;
    setPinned(null);
    setCharInfo(undefined);
    setCharBox(undefined);
  }, [document, pageIndex, pendingRequests]);

  useEffect(() => {
    return () => {
      // Invalidate in-flight requests to avoid stale async updates after unmount.
      pendingRequests.invalidate();
      lastCharIndexRef.current = -1;
    };
  }, [pendingRequests]);

  return { charInfo, charBox, isPinned: pinned !== null, onMouseMove, onMouseLeave, onClick, overlayRef };
}

export { useCharacterInspector };
export type { CharInspectorDimensions };
