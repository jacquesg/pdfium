import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { RenderResult } from '../../../../src/core/types.js';
import { renderStore } from '../../../../src/react/internal/render-store.js';

/** Helper to create a minimal RenderResult for testing. */
function makeResult(label: string): RenderResult {
  return {
    width: 100,
    height: 100,
    originalWidth: 612,
    originalHeight: 792,
    data: new Uint8Array([label.charCodeAt(0)]),
  };
}

describe('LRURenderStore', () => {
  let originalMaxEntries: number;

  beforeEach(() => {
    originalMaxEntries = renderStore.maxEntries;
  });

  afterEach(() => {
    renderStore.maxEntries = originalMaxEntries;
  });

  // react-setup.ts already clears stores between tests

  describe('LRU eviction', () => {
    test('evicts least-recently-used entry when capacity is exceeded', async () => {
      renderStore.maxEntries = 3;
      renderStore.set('A', makeResult('A'));
      renderStore.set('B', makeResult('B'));
      renderStore.set('C', makeResult('C'));

      // Touch A to promote it — B is now the oldest
      renderStore.touch('A');

      // Insert D — should evict B (the least recently used)
      renderStore.set('D', makeResult('D'));

      expect(renderStore.getSnapshot('A')).toBeDefined();
      expect(renderStore.getSnapshot('B')).toBeUndefined();
      expect(renderStore.getSnapshot('C')).toBeDefined();
      expect(renderStore.getSnapshot('D')).toBeDefined();
    });

    test('holds exactly maxEntries items at capacity', () => {
      renderStore.maxEntries = 2;
      renderStore.set('X', makeResult('X'));
      renderStore.set('Y', makeResult('Y'));

      expect(renderStore.getSnapshot('X')).toBeDefined();
      expect(renderStore.getSnapshot('Y')).toBeDefined();
    });

    test('evicts when inserting one over capacity', () => {
      renderStore.maxEntries = 2;
      renderStore.set('X', makeResult('X'));
      renderStore.set('Y', makeResult('Y'));
      renderStore.set('Z', makeResult('Z'));

      // X was oldest, should be evicted
      expect(renderStore.getSnapshot('X')).toBeUndefined();
      expect(renderStore.getSnapshot('Y')).toBeDefined();
      expect(renderStore.getSnapshot('Z')).toBeDefined();
    });
  });

  describe('purgeByPrefix', () => {
    test('removes entries whose keys start with the given prefix', async () => {
      renderStore.set('doc-1|page-0', makeResult('A'));
      renderStore.set('doc-1|page-1', makeResult('B'));
      renderStore.set('doc-2|page-0', makeResult('C'));

      renderStore.purgeByPrefix('doc-1');

      expect(renderStore.getSnapshot('doc-1|page-0')).toBeUndefined();
      expect(renderStore.getSnapshot('doc-1|page-1')).toBeUndefined();
      expect(renderStore.getSnapshot('doc-2|page-0')).toBeDefined();
    });

    test('notifies listeners when entries are purged', async () => {
      renderStore.set('prefix-a', makeResult('A'));
      await Promise.resolve(); // flush initial notification
      const listener = vi.fn();
      renderStore.subscribe(listener);
      renderStore.purgeByPrefix('prefix-');
      await Promise.resolve();
      expect(listener).toHaveBeenCalledOnce();
    });

    test('does not notify when no entries match', async () => {
      const listener = vi.fn();
      renderStore.subscribe(listener);
      renderStore.purgeByPrefix('nonexistent');
      await Promise.resolve();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('touch (access-order promotion)', () => {
    test('moves an entry to most-recently-used position', () => {
      renderStore.maxEntries = 3;
      renderStore.set('A', makeResult('A'));
      renderStore.set('B', makeResult('B'));
      renderStore.set('C', makeResult('C'));

      // Touch A so it becomes most recent; B is now oldest
      renderStore.touch('A');
      renderStore.set('D', makeResult('D'));

      expect(renderStore.getSnapshot('A')).toBeDefined();
      expect(renderStore.getSnapshot('B')).toBeUndefined();
    });
  });

  describe('getSnapshot purity', () => {
    test('calling getSnapshot does not alter eviction order', () => {
      renderStore.maxEntries = 2;
      renderStore.set('A', makeResult('A'));
      renderStore.set('B', makeResult('B'));

      // Read A multiple times — should NOT promote it
      renderStore.getSnapshot('A');
      renderStore.getSnapshot('A');

      // Insert C — A should still be evicted (oldest) because getSnapshot is pure
      renderStore.set('C', makeResult('C'));
      expect(renderStore.getSnapshot('A')).toBeUndefined();
      expect(renderStore.getSnapshot('B')).toBeDefined();
      expect(renderStore.getSnapshot('C')).toBeDefined();
    });

    test('returns undefined for null key', () => {
      expect(renderStore.getSnapshot(null)).toBeUndefined();
    });
  });

  describe('notify', () => {
    test('fires listeners via microtask', async () => {
      const listener = vi.fn();
      renderStore.subscribe(listener);
      renderStore.notify();
      expect(listener).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('getServerSnapshot', () => {
    test('always returns undefined', () => {
      expect(renderStore.getServerSnapshot()).toBeUndefined();
    });
  });

  describe('clear', () => {
    test('removes all entries', () => {
      renderStore.set('A', makeResult('A'));
      renderStore.set('B', makeResult('B'));
      renderStore.clear();
      expect(renderStore.getSnapshot('A')).toBeUndefined();
      expect(renderStore.getSnapshot('B')).toBeUndefined();
    });

    test('notifies listeners on clear', async () => {
      const listener = vi.fn();
      renderStore.subscribe(listener);
      renderStore.clear();
      await Promise.resolve();
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('subscribe / unsubscribe', () => {
    test('unsubscribed listener is not notified', async () => {
      const listener = vi.fn();
      const unsubscribe = renderStore.subscribe(listener);
      unsubscribe();
      renderStore.set('after-unsub', makeResult('A'));
      await Promise.resolve();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('set (update existing key)', () => {
    test('updates value in place without duplicating in order array', () => {
      renderStore.maxEntries = 2;
      renderStore.set('A', makeResult('A'));
      renderStore.set('B', makeResult('B'));

      // Update A in place — should promote it
      const updated = makeResult('A');
      renderStore.set('A', updated);
      expect(renderStore.getSnapshot('A')).toEqual(updated);

      // Insert C — B should be evicted, not A (A was promoted by the update)
      renderStore.set('C', makeResult('C'));
      expect(renderStore.getSnapshot('A')).toBeDefined();
      expect(renderStore.getSnapshot('B')).toBeUndefined();
    });
  });
});
