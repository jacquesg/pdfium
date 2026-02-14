import { describe, expect, test } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';

describe('buildCacheKey', () => {
  test('joins arguments with null-byte delimiter', () => {
    const key = buildCacheKey('doc-1', 'usePageInfo', 0, 'param1', 'param2');
    expect(key).toBe('doc-1\0usePageInfo\x000\0param1\0param2');
  });

  test('omits undefined params from the key', () => {
    const key = buildCacheKey('doc-1', 'usePageInfo', 0, undefined, 'visible');
    expect(key).toBe('doc-1\0usePageInfo\x000\0visible');
  });

  test('produces consistent keys for the same hook name and params', () => {
    const a = buildCacheKey('doc-1', 'useTextContent', 1, 'page-0');
    const b = buildCacheKey('doc-1', 'useTextContent', 1, 'page-0');
    expect(a).toBe(b);
  });

  test('produces different keys for different params', () => {
    const a = buildCacheKey('doc-1', 'usePageInfo', 0, 'page-0');
    const b = buildCacheKey('doc-1', 'usePageInfo', 0, 'page-1');
    expect(a).not.toBe(b);
  });

  test('produces different keys for different hook names', () => {
    const a = buildCacheKey('doc-1', 'usePageInfo', 0);
    const b = buildCacheKey('doc-1', 'useTextContent', 0);
    expect(a).not.toBe(b);
  });

  test('produces different keys for different document IDs', () => {
    const a = buildCacheKey('doc-1', 'usePageInfo', 0);
    const b = buildCacheKey('doc-2', 'usePageInfo', 0);
    expect(a).not.toBe(b);
  });

  test('includes numeric and boolean params', () => {
    const key = buildCacheKey('doc-1', 'hook', 0, 42, true, false);
    expect(key).toBe('doc-1\0hook\x000\x0042\0true\0false');
  });

  test('handles all params being undefined', () => {
    const key = buildCacheKey('doc-1', 'hook', 0, undefined, undefined);
    expect(key).toBe('doc-1\0hook\x000');
  });

  test('does not collide when string params contain pipe characters', () => {
    const a = buildCacheKey('doc-1', 'textSearch', 0, 0, 'A|B');
    const b = buildCacheKey('doc-1', 'textSearch', 0, 0, 'A', 'B');
    expect(a).not.toBe(b);
  });
});
