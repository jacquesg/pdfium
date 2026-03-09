import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { pointsEqual } from './annotation-mutation-value-match.js';

export function linesEqual(a: SerialisedAnnotation['line'], b: SerialisedAnnotation['line']): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return pointsEqual(a.start, b.start) && pointsEqual(a.end, b.end);
}

export function inkPathsEqual(a: SerialisedAnnotation['inkPaths'], b: SerialisedAnnotation['inkPaths']): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;
  for (let pathIndex = 0; pathIndex < a.length; pathIndex += 1) {
    const pathA = a[pathIndex];
    const pathB = b[pathIndex];
    if ((pathA?.length ?? 0) !== (pathB?.length ?? 0)) {
      return false;
    }
    for (let pointIndex = 0; pointIndex < (pathA?.length ?? 0); pointIndex += 1) {
      if (!pointsEqual(pathA?.[pointIndex], pathB?.[pointIndex])) {
        return false;
      }
    }
  }
  return true;
}
