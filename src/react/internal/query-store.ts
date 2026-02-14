interface CacheEntry<T> {
  data: T;
  status: 'success';
}

interface PendingEntry {
  status: 'pending';
  promise: Promise<void>;
}

interface ErrorEntry {
  status: 'error';
  error: Error;
}

type StoreEntry<T> = CacheEntry<T> | PendingEntry | ErrorEntry;

class QueryStore {
  private entries = new Map<string, StoreEntry<unknown>>();
  private listeners = new Set<() => void>();
  private notifyScheduled = false;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  // SAFETY: The cache key contract guarantees that entries stored under key K
  // are always StoreEntry<T> where T matches the hook that wrote the entry.
  // This is the one unavoidable cast in the system — a heterogeneous Map
  // cannot be type-safe at the read boundary without it.
  getSnapshot = <T>(key: string | null): StoreEntry<T> | undefined => {
    if (key === null) return undefined;
    return this.entries.get(key) as StoreEntry<T> | undefined;
  };

  getServerSnapshot = (): undefined => undefined;

  /** Batch listener notifications via microtask to coalesce rapid writes. */
  private notify(): void {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    queueMicrotask(() => {
      this.notifyScheduled = false;
      for (const listener of this.listeners) listener();
    });
  }

  set<T>(key: string, entry: StoreEntry<T>): void {
    this.entries.set(key, entry);
    this.notify();
  }

  delete(key: string): void {
    if (!this.entries.delete(key)) return;
    this.notify();
  }

  /** Purge all entries whose key starts with the given prefix. */
  purgeByPrefix(prefix: string): void {
    let changed = false;
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }

  /** Clear the entire cache. */
  clear(): void {
    this.entries.clear();
    this.notify();
  }
}

const queryStore = new QueryStore();

export { queryStore };
export { QueryStore };
export type { StoreEntry, CacheEntry, PendingEntry, ErrorEntry };
