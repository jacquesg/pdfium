import { useEffect } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { useRotation } from '../hooks/use-rotation.js';

function useViewerRotationState(pageCount: number, document: WorkerPDFiumDocument | null) {
  const rotation = useRotation(pageCount);
  const resetAllRotations = rotation.resetAllRotations;

  // biome-ignore lint/correctness/useExhaustiveDependencies: document intentionally triggers reset on document swap
  useEffect(() => {
    resetAllRotations();
  }, [document, resetAllRotations]);

  return rotation;
}

export { useViewerRotationState };
