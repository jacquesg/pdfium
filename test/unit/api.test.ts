/**
 * Tests for the public API surface.
 * Ensures we are exporting what we expect.
 */

import { describe, expect, test } from 'vitest';
import * as PublicAPI from '../../src/index.js';

describe('Public API', () => {
  test('should export expected symbols', () => {
    const exports = Object.keys(PublicAPI).sort();
    expect(exports).toMatchSnapshot();
  });

  test('should export version and hash', () => {
    expect(typeof PublicAPI.VERSION).toBe('string');
    expect(typeof PublicAPI.WASM_HASH).toBe('string');
  });

  test('should export classes', () => {
    expect(typeof PublicAPI.PDFium).toBe('function');
    expect(typeof PublicAPI.PDFiumDocument).toBe('function');
    expect(typeof PublicAPI.PDFiumPage).toBe('function');
    expect(typeof PublicAPI.PDFiumFont).toBe('function');
    expect(typeof PublicAPI.WorkerProxy).toBe('function');
  });

  test('should not export WASM internals', () => {
    expect('BitmapFormat' in PublicAPI).toBe(false);
    expect('PDFiumNativeErrorCode' in PublicAPI).toBe(false);
    expect('RenderFlags' in PublicAPI).toBe(false);
  });
});
