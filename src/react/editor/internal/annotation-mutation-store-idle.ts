export function resolveIdleWaiters(idleWaiters: Set<() => void>): void {
  if (idleWaiters.size === 0) return;
  for (const resolve of idleWaiters) {
    resolve();
  }
  idleWaiters.clear();
}

export function waitForMutationStoreIdle(idleWaiters: Set<() => void>, hasAnyPending: () => boolean): Promise<void> {
  if (!hasAnyPending()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    idleWaiters.add(resolve);
  });
}
