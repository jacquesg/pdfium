import { describe, expect, it } from 'vitest';
import { configure, getConfig } from '../../../src/core/config.js';

describe('Config', () => {
  // Reset config before each test if possible, but the module has global state.
  // We can just verify behavior relative to current state.

  it('should return default limits initially', () => {
    // Note: other tests might have modified it, but we can check structure
    const config = getConfig();
    expect(config.limits).toBeDefined();
    expect(config.limits.maxDocumentSize).toBeGreaterThan(0);
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
});
