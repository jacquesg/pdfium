import { STALE_SETTLED_PATCH_GRACE_MS } from './annotation-mutation-patch.types.js';

export function clearStaleEntryTimer(staleEntryTimers: Map<string, ReturnType<typeof setTimeout>>, key: string): void {
  const timer = staleEntryTimers.get(key);
  if (timer === undefined) return;
  clearTimeout(timer);
  staleEntryTimers.delete(key);
}

export function scheduleStaleEntryTimer(
  staleEntryTimers: Map<string, ReturnType<typeof setTimeout>>,
  key: string,
  onExpire: () => void,
): void {
  clearStaleEntryTimer(staleEntryTimers, key);
  const timer = setTimeout(() => {
    staleEntryTimers.delete(key);
    onExpire();
  }, STALE_SETTLED_PATCH_GRACE_MS);
  staleEntryTimers.set(key, timer);
}
