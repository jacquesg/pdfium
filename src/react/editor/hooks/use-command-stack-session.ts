import { useRef } from 'react';
import { ObservableCommandStack } from '../observable-command-stack.js';

export function useCommandStackSession(maxUndoDepth?: number): ObservableCommandStack {
  const stackRef = useRef<ObservableCommandStack | null>(null);
  if (stackRef.current === null) {
    stackRef.current = new ObservableCommandStack(maxUndoDepth);
  }
  return stackRef.current;
}
