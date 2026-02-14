import { afterEach, describe, expect, it } from 'vitest';
import { configure, getConfig, resetConfig } from '../../../src/core/config.js';

describe('Config', () => {
  afterEach(() => {
    resetConfig();
  });

  it('should return default limits initially', () => {
    const config = getConfig();
    expect(config.limits).toBeDefined();
    expect(config.limits.maxDocumentSize).toBeGreaterThan(0);
    expect(config.limits.maxRenderDimension).toBeGreaterThan(0);
    expect(config.limits.maxTextCharCount).toBeGreaterThan(0);
  });

  it('should update config deeply', () => {
    const original = getConfig().limits.maxDocumentSize;
    const newLimit = original + 100;

    configure({
      limits: { maxDocumentSize: newLimit },
    });

    expect(getConfig().limits.maxDocumentSize).toBe(newLimit);
    // Should preserve other limits
    expect(getConfig().limits.maxRenderDimension).toBeGreaterThan(0);
  });

  describe('configure validation - maxDocumentSize', () => {
    it('should throw for maxDocumentSize = 0', () => {
      expect(() => configure({ limits: { maxDocumentSize: 0 } })).toThrow('maxDocumentSize must be a positive integer');
    });

    it('should throw for maxDocumentSize = -1', () => {
      expect(() => configure({ limits: { maxDocumentSize: -1 } })).toThrow(
        'maxDocumentSize must be a positive integer',
      );
    });

    it('should throw for maxDocumentSize = NaN', () => {
      expect(() => configure({ limits: { maxDocumentSize: NaN } })).toThrow(
        'maxDocumentSize must be a positive integer',
      );
    });

    it('should throw for maxDocumentSize = 1.5 (non-integer)', () => {
      expect(() => configure({ limits: { maxDocumentSize: 1.5 } })).toThrow(
        'maxDocumentSize must be a positive integer',
      );
    });

    it('should throw for maxDocumentSize = Infinity', () => {
      expect(() => configure({ limits: { maxDocumentSize: Infinity } })).toThrow(
        'maxDocumentSize must be a positive integer',
      );
    });
  });

  describe('configure validation - maxRenderDimension', () => {
    it('should throw for maxRenderDimension = 0', () => {
      expect(() => configure({ limits: { maxRenderDimension: 0 } })).toThrow(
        'maxRenderDimension must be a positive integer',
      );
    });

    it('should throw for maxRenderDimension = -1', () => {
      expect(() => configure({ limits: { maxRenderDimension: -1 } })).toThrow(
        'maxRenderDimension must be a positive integer',
      );
    });

    it('should throw for maxRenderDimension = NaN', () => {
      expect(() => configure({ limits: { maxRenderDimension: NaN } })).toThrow(
        'maxRenderDimension must be a positive integer',
      );
    });
  });

  describe('configure validation - maxTextCharCount', () => {
    it('should throw for maxTextCharCount = 0', () => {
      expect(() => configure({ limits: { maxTextCharCount: 0 } })).toThrow(
        'maxTextCharCount must be a positive integer',
      );
    });

    it('should throw for maxTextCharCount = -1', () => {
      expect(() => configure({ limits: { maxTextCharCount: -1 } })).toThrow(
        'maxTextCharCount must be a positive integer',
      );
    });

    it('should throw for maxTextCharCount = NaN', () => {
      expect(() => configure({ limits: { maxTextCharCount: NaN } })).toThrow(
        'maxTextCharCount must be a positive integer',
      );
    });
  });

  describe('configure with valid limits', () => {
    it('should accept valid positive integer limits', () => {
      configure({ limits: { maxDocumentSize: 5000, maxRenderDimension: 2000, maxTextCharCount: 10000 } });
      const config = getConfig();
      expect(config.limits.maxDocumentSize).toBe(5000);
      expect(config.limits.maxRenderDimension).toBe(2000);
      expect(config.limits.maxTextCharCount).toBe(10000);
    });

    it('should merge partial limits (only set one, others unchanged)', () => {
      const before = getConfig().limits;
      configure({ limits: { maxDocumentSize: 9999 } });
      const after = getConfig().limits;
      expect(after.maxDocumentSize).toBe(9999);
      expect(after.maxRenderDimension).toBe(before.maxRenderDimension);
      expect(after.maxTextCharCount).toBe(before.maxTextCharCount);
    });
  });

  describe('resetConfig', () => {
    it('should restore defaults after configure()', () => {
      const defaults = getConfig().limits;
      configure({ limits: { maxDocumentSize: 12345 } });
      expect(getConfig().limits.maxDocumentSize).toBe(12345);

      resetConfig();
      expect(getConfig().limits.maxDocumentSize).toBe(defaults.maxDocumentSize);
      expect(getConfig().limits.maxRenderDimension).toBe(defaults.maxRenderDimension);
      expect(getConfig().limits.maxTextCharCount).toBe(defaults.maxTextCharCount);
    });
  });
});
