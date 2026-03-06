/**
 * Shared redaction utility helpers.
 *
 * @module react/editor/redaction-utils
 */

import type { SerialisedAnnotation } from '../../context/protocol.js';
import { AnnotationType } from '../../core/types.js';
import { REDACTION_FALLBACK_CONTENTS_MARKER } from '../../internal/redaction-markers.js';

export { REDACTION_FALLBACK_CONTENTS_MARKER };

/**
 * Returns true for pseudo-redaction fallback square annotations.
 */
export function isFallbackRedactionAnnotation(annotation: Pick<SerialisedAnnotation, 'type' | 'contents'>): boolean {
  return annotation.type === AnnotationType.Square && annotation.contents === REDACTION_FALLBACK_CONTENTS_MARKER;
}

/**
 * Returns true for native Redact annotations.
 */
export function isNativeRedactionAnnotation(annotation: Pick<SerialisedAnnotation, 'type'>): boolean {
  return annotation.type === AnnotationType.Redact;
}

/**
 * Returns true when an annotation should be treated as a redaction region
 * by editor UI (native Redact or pseudo-redaction fallback square).
 */
export function isEditorRedactionAnnotation(annotation: Pick<SerialisedAnnotation, 'type' | 'contents'>): boolean {
  return isNativeRedactionAnnotation(annotation) || isFallbackRedactionAnnotation(annotation);
}

/**
 * Return a best-effort string message from unknown errors.
 */
export function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return String(error);
}

/**
 * Detect unsupported-annotation-create errors emitted by the worker layer.
 */
export function isUnsupportedAnnotationCreateError(error: unknown, subtype: 'Line' | 'Redact'): boolean {
  return getUnknownErrorMessage(error).includes(`Failed to create annotation of type ${subtype}`);
}
