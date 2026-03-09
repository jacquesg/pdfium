import { useCallback, useSyncExternalStore } from 'react';
import type { ObservableCommandStack } from '../observable-command-stack.js';

export function useObservableCommandStackVersion(stack: ObservableCommandStack): number {
  const subscribe = useCallback((listener: () => void) => stack.subscribe(listener), [stack]);
  const getSnapshot = useCallback(() => stack.getSnapshot(), [stack]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
