import type { RenderResult } from '../../core/types.js';

/**
 * LRU cache for rendered page bitmaps, backed by a `Map` whose insertion
 * order tracks recency. All operations are O(1) amortised.
 *
 * Designed for use with `useSyncExternalStore` — `getSnapshot` is pure
 * (no side effects) and `touch` must only be called from `useLayoutEffect`.
 */
class LRURenderStore {
  #cache = new Map<string, RenderResult>();
  #listeners = new Set<() => void>();
  #notifyScheduled = false;
  maxEntries: number;

  constructor(maxEntries = 30) {
    this.maxEntries = maxEntries;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  /**
   * Pure read — no side effects. React may call getSnapshot multiple times
   * per render in concurrent mode; mutating internal state here would
   * violate the useSyncExternalStore contract.
   */
  getSnapshot = (key: string | null): RenderResult | undefined => {
    if (key === null) return undefined;
    return this.#cache.get(key);
  };

  getServerSnapshot = (): undefined => undefined;

  /**
   * Promote a key to most-recently-used position (O(1) via Map
   * delete-then-reinsert). Call from `useLayoutEffect` only.
   */
  touch(key: string): void {
    const val = this.#cache.get(key);
    if (val === undefined) return;
    this.#cache.delete(key);
    this.#cache.set(key, val);
  }

  /** Batch listener notifications via microtask to coalesce rapid writes. */
  #scheduleNotify(): void {
    if (this.#notifyScheduled) return;
    this.#notifyScheduled = true;
    queueMicrotask(() => {
      this.#notifyScheduled = false;
      for (const listener of this.#listeners) listener();
    });
  }

  set(key: string, result: RenderResult): void {
    // Delete first so re-insert moves the key to the end (most recent)
    this.#cache.delete(key);
    // Evict oldest entries until we have room
    while (this.#cache.size >= this.maxEntries) {
      const oldest = this.#cache.keys().next().value;
      if (oldest !== undefined) this.#cache.delete(oldest);
      else break;
    }
    this.#cache.set(key, result);
    this.#scheduleNotify();
  }

  /** Purge all entries whose key starts with the given prefix. */
  purgeByPrefix(prefix: string): void {
    let purged = false;
    for (const key of this.#cache.keys()) {
      if (key.startsWith(prefix)) {
        this.#cache.delete(key);
        purged = true;
      }
    }
    if (purged) this.#scheduleNotify();
  }

  clear(): void {
    this.#cache.clear();
    this.#scheduleNotify();
  }

  /** Notify all subscribers without changing data. Used by useRenderPage to surface errors. */
  notify(): void {
    this.#scheduleNotify();
  }
}

const renderStore = new LRURenderStore();

export { renderStore, LRURenderStore };
