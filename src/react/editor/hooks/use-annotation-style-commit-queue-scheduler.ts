import { useCallback, useRef } from 'react';

const STYLE_COMMIT_DEBOUNCE_MS = 220;

export function useAnnotationStyleCommitQueueScheduler() {
  const styleCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushStyleCommitsRef = useRef<() => void>(() => {});

  const clearStyleCommitTimer = useCallback(() => {
    const timer = styleCommitTimerRef.current;
    if (timer === null) return;
    clearTimeout(timer);
    styleCommitTimerRef.current = null;
  }, []);

  const scheduleStyleCommit = useCallback(() => {
    clearStyleCommitTimer();
    styleCommitTimerRef.current = setTimeout(() => {
      styleCommitTimerRef.current = null;
      flushStyleCommitsRef.current();
    }, STYLE_COMMIT_DEBOUNCE_MS);
  }, [clearStyleCommitTimer]);

  return {
    clearStyleCommitTimer,
    flushStyleCommitsRef,
    scheduleStyleCommit,
  };
}
