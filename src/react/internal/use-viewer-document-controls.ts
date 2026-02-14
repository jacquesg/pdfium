'use client';

import type { RefObject } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { useFullscreen } from '../hooks/use-fullscreen.js';
import { usePrint } from '../hooks/use-print.js';

function useViewerDocumentControls(
  document: WorkerPDFiumDocument | null,
  fullscreenRef: RefObject<HTMLDivElement | null>,
) {
  const fullscreen = useFullscreen(fullscreenRef);
  const print = usePrint(document);
  return { fullscreen, print };
}

export { useViewerDocumentControls };
