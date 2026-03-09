import type { ReturnTypeTakeAtomicStyleCommitPayload } from './annotation-style-atomic-commit.types.js';
import type { AnnotationStyleQueueCommittersOptions } from './annotation-style-committers.types.js';

interface RunAtomicStyleCommitOptions
  extends Pick<
    AnnotationStyleQueueCommittersOptions,
    'annotationIndex' | 'crud' | 'flushPreviewIfStyleIdle' | 'inFlightStyleCommitsRef' | 'persistedBorderForCommitRef'
  > {
  readonly styleCommit: ReturnTypeTakeAtomicStyleCommitPayload;
}

export function runAtomicStyleCommit({
  annotationIndex,
  crud,
  flushPreviewIfStyleIdle,
  inFlightStyleCommitsRef,
  persistedBorderForCommitRef,
  styleCommit,
}: RunAtomicStyleCommitOptions): void {
  if (styleCommit === null) {
    flushPreviewIfStyleIdle();
    return;
  }

  inFlightStyleCommitsRef.current += 1;
  void crud.setAnnotationStyle?.(annotationIndex, styleCommit).finally(() => {
    if (styleCommit.border !== undefined) {
      persistedBorderForCommitRef.current = styleCommit.border.newBorder;
    }
    inFlightStyleCommitsRef.current = Math.max(0, inFlightStyleCommitsRef.current - 1);
    flushPreviewIfStyleIdle();
  });
}
