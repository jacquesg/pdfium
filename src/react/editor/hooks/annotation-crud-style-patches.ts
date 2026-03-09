import type { AnnotationStyleBorderMutation, AnnotationStyleColourMutation } from '../command.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import { bordersEqual, coloursEqual } from './annotation-crud-comparisons.js';

export function hasColourStyleMutation(
  mutation: AnnotationStyleColourMutation | undefined,
): mutation is AnnotationStyleColourMutation {
  if (mutation === undefined) {
    return false;
  }

  return !coloursEqual(mutation.oldColour, mutation.newColour);
}

export function hasBorderStyleMutation(
  mutation: AnnotationStyleBorderMutation | undefined,
): mutation is AnnotationStyleBorderMutation {
  if (mutation === undefined) {
    return false;
  }

  return !bordersEqual(mutation.oldBorder, mutation.newBorder);
}

export function getStringMutationPatch(key: string, newValue: string): OptimisticAnnotationPatch | undefined {
  if (key === 'Contents') {
    return { contents: newValue };
  }
  if (key === 'T') {
    return { author: newValue };
  }
  if (key === 'Subj') {
    return { subject: newValue };
  }

  return undefined;
}

export function buildStyleMutationPatch(options: {
  readonly stroke?: AnnotationStyleColourMutation | undefined;
  readonly interior?: AnnotationStyleColourMutation | undefined;
  readonly border?: AnnotationStyleBorderMutation | undefined;
}): OptimisticAnnotationPatch {
  const { stroke, interior, border } = options;

  return {
    ...(stroke !== undefined || interior !== undefined
      ? {
          colour: {
            ...(stroke !== undefined ? { stroke: stroke.newColour } : {}),
            ...(interior !== undefined ? { interior: interior.newColour } : {}),
          },
        }
      : {}),
    ...(border !== undefined ? { border: border.newBorder } : {}),
  };
}
