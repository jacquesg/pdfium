import { describe, expect, it } from 'vitest';
import { queryStore } from '../../../src/react/internal/query-store.js';
import { renderStore } from '../../../src/react/internal/render-store.js';

describe('invalidateCache pattern', () => {
  it('queryStore.clear() removes all entries', () => {
    queryStore.set('key1', { status: 'success', data: 'a' });
    queryStore.set('key2', { status: 'success', data: 'b' });
    queryStore.clear();
    expect(queryStore.getSnapshot('key1')).toBeUndefined();
    expect(queryStore.getSnapshot('key2')).toBeUndefined();
  });

  it('renderStore.clear() removes all entries', () => {
    renderStore.set('r1', {
      data: new Uint8Array(4),
      width: 10,
      height: 10,
      originalWidth: 612,
      originalHeight: 792,
    });
    renderStore.clear();
    expect(renderStore.getSnapshot('r1')).toBeUndefined();
  });

  it('clearing stores and bumping revision invalidates all cache keys', () => {
    // Simulate: key with revision 0
    const key0 = 'doc\0hook\x000';
    const key1 = 'doc\0hook\x001';
    queryStore.set(key0, { status: 'success', data: 'old' });

    // Simulate invalidateCache: clear + bump revision
    queryStore.clear();
    renderStore.clear();
    // After bump, hooks build key1 instead of key0
    expect(queryStore.getSnapshot(key0)).toBeUndefined();
    expect(queryStore.getSnapshot(key1)).toBeUndefined();
  });
});
