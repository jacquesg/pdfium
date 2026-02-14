import { describe, expect, it } from 'vitest';
import {
  getMissingContextMessage,
  mergeClassNames,
  requireContextValue,
} from '../../../../src/react/internal/component-api.js';

describe('component-api', () => {
  it('merges class names while dropping falsy tokens', () => {
    expect(mergeClassNames('a', undefined, false, 'b', null)).toBe('a b');
    expect(mergeClassNames(undefined, null, false)).toBeUndefined();
  });

  it('builds consistent missing-context messages', () => {
    expect(getMissingContextMessage('usePDFViewer', 'PDFViewer')).toBe(
      'usePDFViewer() must be called inside a <PDFViewer> component.',
    );
  });

  it('returns non-null context values or throws', () => {
    expect(requireContextValue(42, 'missing')).toBe(42);
    expect(() => requireContextValue(null, 'missing')).toThrow('missing');
  });
});
