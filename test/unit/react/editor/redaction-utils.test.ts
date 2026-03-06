import { describe, expect, it } from 'vitest';
import { AnnotationType } from '../../../../src/core/types.js';
import {
  getUnknownErrorMessage,
  isEditorRedactionAnnotation,
  isFallbackRedactionAnnotation,
  isNativeRedactionAnnotation,
  isUnsupportedAnnotationCreateError,
  REDACTION_FALLBACK_CONTENTS_MARKER,
} from '../../../../src/react/editor/redaction-utils.js';

describe('react/editor/redaction-utils', () => {
  it('detects native and fallback redaction annotations', () => {
    expect(
      isFallbackRedactionAnnotation({
        type: AnnotationType.Square,
        contents: REDACTION_FALLBACK_CONTENTS_MARKER,
      }),
    ).toBe(true);
    expect(isNativeRedactionAnnotation({ type: AnnotationType.Redact })).toBe(true);
    expect(
      isEditorRedactionAnnotation({
        type: AnnotationType.Square,
        contents: REDACTION_FALLBACK_CONTENTS_MARKER,
      }),
    ).toBe(true);
    expect(isEditorRedactionAnnotation({ type: AnnotationType.Redact, contents: '' })).toBe(true);
    expect(isEditorRedactionAnnotation({ type: AnnotationType.Highlight, contents: '' })).toBe(false);
  });

  it('normalises unknown error payloads into messages', () => {
    expect(getUnknownErrorMessage(new Error('boom'))).toBe('boom');
    expect(getUnknownErrorMessage({ message: 'worker failed' })).toBe('worker failed');
    expect(getUnknownErrorMessage({ message: 123 })).toBe('[object Object]');
    expect(getUnknownErrorMessage('plain string')).toBe('plain string');
  });

  it('detects unsupported annotation create errors by subtype', () => {
    expect(isUnsupportedAnnotationCreateError(new Error('Failed to create annotation of type Redact'), 'Redact')).toBe(
      true,
    );
    expect(isUnsupportedAnnotationCreateError({ message: 'Failed to create annotation of type Line' }, 'Line')).toBe(
      true,
    );
    expect(isUnsupportedAnnotationCreateError(new Error('something else'), 'Line')).toBe(false);
  });
});
