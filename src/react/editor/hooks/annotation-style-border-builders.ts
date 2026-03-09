import type { AnnotationBorder } from '../../../core/types.js';
import { clampBorderWidth } from './annotation-style-border-clamp.js';

function buildDefaultEditableBorder(borderWidth: number): AnnotationBorder {
  return {
    borderWidth: clampBorderWidth(borderWidth),
    horizontalRadius: 0,
    verticalRadius: 0,
  };
}

export function getEditableBorder(
  annotationBorder: AnnotationBorder | null,
  canEditBorder: boolean,
  borderWidth: number,
): AnnotationBorder | null {
  if (annotationBorder !== null) {
    return {
      ...annotationBorder,
      borderWidth: clampBorderWidth(borderWidth),
    };
  }
  if (!canEditBorder) {
    return null;
  }
  return buildDefaultEditableBorder(borderWidth);
}

export function getPersistedEditableBorder(
  annotationBorder: AnnotationBorder | null,
  canEditBorder: boolean,
): AnnotationBorder | null {
  if (annotationBorder !== null) {
    return {
      ...annotationBorder,
      borderWidth: clampBorderWidth(annotationBorder.borderWidth),
    };
  }
  if (!canEditBorder) {
    return null;
  }
  return buildDefaultEditableBorder(1);
}

export function getPreservedBorder(
  annotationBorder: AnnotationBorder | null,
  canEditBorder: boolean,
  localBorderWidth: number,
): AnnotationBorder | null {
  if (annotationBorder === null) {
    if (!canEditBorder) {
      return null;
    }
    return buildDefaultEditableBorder(Math.max(1, clampBorderWidth(localBorderWidth)));
  }
  return {
    ...annotationBorder,
    borderWidth: clampBorderWidth(localBorderWidth),
  };
}
