import { describe, expect, test, vi } from 'vitest';
import type { StoreEntry } from '../../../../src/react/internal/query-store.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';

describe('QueryStore', () => {
  // react-setup.ts already clears stores between tests

  describe('subscribe / getSnapshot contract', () => {
    test('getSnapshot returns undefined for unknown key', () => {
      expect(queryStore.getSnapshot('nonexistent')).toBeUndefined();
    });

    test('getSnapshot returns undefined for null key', () => {
      expect(queryStore.getSnapshot(null)).toBeUndefined();
    });

    test('getServerSnapshot always returns undefined', () => {
      expect(queryStore.getServerSnapshot()).toBeUndefined();
    });

    test('subscribe returns an unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = queryStore.subscribe(listener);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('set', () => {
    test('stores an entry retrievable via getSnapshot', async () => {
      const entry: StoreEntry<string> = { status: 'success', data: 'hello' };
      queryStore.set('key-1', entry);
      expect(queryStore.getSnapshot<string>('key-1')).toEqual(entry);
    });

    test('notifies listeners after set via microtask', async () => {
      const listener = vi.fn();
      queryStore.subscribe(listener);
      queryStore.set('key-2', { status: 'success', data: 42 });
      // Listener is batched via microtask, not synchronous
      expect(listener).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(listener).toHaveBeenCalledOnce();
    });

    test('coalesces rapid writes into a single notification', async () => {
      const listener = vi.fn();
      queryStore.subscribe(listener);
      queryStore.set('a', { status: 'success', data: 1 });
      queryStore.set('b', { status: 'success', data: 2 });
      queryStore.set('c', { status: 'success', data: 3 });
      await Promise.resolve();
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('purgeByPrefix', () => {
    test('removes entries matching the prefix', async () => {
      queryStore.set('doc-1\0usePageInfo\x000', { status: 'success', data: 'a' });
      queryStore.set('doc-1\0useTextContent\x000', { status: 'success', data: 'b' });
      queryStore.set('doc-2\0usePageInfo\x000', { status: 'success', data: 'c' });
      queryStore.purgeByPrefix('doc-1');
      expect(queryStore.getSnapshot('doc-1\0usePageInfo\x000')).toBeUndefined();
      expect(queryStore.getSnapshot('doc-1\0useTextContent\x000')).toBeUndefined();
      expect(queryStore.getSnapshot<string>('doc-2\0usePageInfo\x000')).toBeDefined();
    });

    test('notifies listeners when entries are purged', async () => {
      queryStore.set('prefix-a', { status: 'success', data: 1 });
      await Promise.resolve(); // flush first notification
      const listener = vi.fn();
      queryStore.subscribe(listener);
      queryStore.purgeByPrefix('prefix-');
      await Promise.resolve();
      expect(listener).toHaveBeenCalledOnce();
    });

    test('does not notify when no entries match', async () => {
      const listener = vi.fn();
      queryStore.subscribe(listener);
      queryStore.purgeByPrefix('nonexistent-prefix');
      await Promise.resolve();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    test('removes all entries', async () => {
      queryStore.set('x', { status: 'success', data: 'one' });
      queryStore.set('y', { status: 'success', data: 'two' });
      queryStore.clear();
      expect(queryStore.getSnapshot('x')).toBeUndefined();
      expect(queryStore.getSnapshot('y')).toBeUndefined();
    });

    test('notifies listeners on clear', async () => {
      const listener = vi.fn();
      queryStore.subscribe(listener);
      queryStore.clear();
      await Promise.resolve();
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('concurrent access', () => {
    test('handles multiple keys independently', () => {
      queryStore.set('k1', { status: 'success', data: 'val1' });
      queryStore.set('k2', { status: 'error', error: new Error('fail') });
      queryStore.set('k3', { status: 'pending', promise: Promise.resolve() });

      const e1 = queryStore.getSnapshot<string>('k1');
      const e2 = queryStore.getSnapshot<string>('k2');
      const e3 = queryStore.getSnapshot<string>('k3');

      expect(e1?.status).toBe('success');
      expect(e2?.status).toBe('error');
      expect(e3?.status).toBe('pending');
    });
  });

  describe('unsubscribe', () => {
    test('unsubscribed listener does not receive notifications', async () => {
      const listener = vi.fn();
      const unsubscribe = queryStore.subscribe(listener);
      unsubscribe();
      queryStore.set('after-unsub', { status: 'success', data: 'ignored' });
      await Promise.resolve();
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
