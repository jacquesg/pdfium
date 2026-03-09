import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { OptimisticAnnotationPatch } from './annotation-mutation-patch-utils.js';

interface AnnotationMutationStoreLifecycleApi {
  subscribe(listener: () => void): () => void;
  getSnapshot(): number;
  destroy(): void;
  reset(): void;
}

interface AnnotationMutationStoreQueryApi {
  getPatch(pageIndex: number, annotationIndex: number): OptimisticAnnotationPatch | undefined;
  getPreviewPatch(pageIndex: number, annotationIndex: number): OptimisticAnnotationPatch | undefined;
  hasPending(pageIndex: number, annotationIndex: number): boolean;
  hasAnyPending(): boolean;
  waitForIdle(): Promise<void>;
  mergeForPage(
    pageIndex: number,
    annotations: readonly SerialisedAnnotation[],
    includePreview?: boolean,
  ): readonly SerialisedAnnotation[];
}

interface AnnotationMutationStoreWriteApi {
  begin(pageIndex: number, annotationIndex: number, patch: OptimisticAnnotationPatch): () => void;
  clear(pageIndex: number, annotationIndex: number): void;
  preview(pageIndex: number, annotationIndex: number, patch: OptimisticAnnotationPatch): void;
  clearPreview(pageIndex: number, annotationIndex: number): void;
  acknowledge(pageIndex: number, annotations: readonly SerialisedAnnotation[]): void;
}

interface AnnotationMutationStoreRuntimeShape {
  readonly lifecycle: AnnotationMutationStoreLifecycleApi;
  readonly queries: AnnotationMutationStoreQueryApi;
  readonly writes: AnnotationMutationStoreWriteApi;
}

export function createAnnotationMutationStorePublicApi(runtime: AnnotationMutationStoreRuntimeShape) {
  return {
    acknowledge(pageIndex: number, annotations: readonly SerialisedAnnotation[]): void {
      runtime.writes.acknowledge(pageIndex, annotations);
    },
    begin(pageIndex: number, annotationIndex: number, patch: OptimisticAnnotationPatch): () => void {
      return runtime.writes.begin(pageIndex, annotationIndex, patch);
    },
    clear(pageIndex: number, annotationIndex: number): void {
      runtime.writes.clear(pageIndex, annotationIndex);
    },
    clearPreview(pageIndex: number, annotationIndex: number): void {
      runtime.writes.clearPreview(pageIndex, annotationIndex);
    },
    destroy(): void {
      runtime.lifecycle.destroy();
    },
    getPatch(pageIndex: number, annotationIndex: number): OptimisticAnnotationPatch | undefined {
      return runtime.queries.getPatch(pageIndex, annotationIndex);
    },
    getPreviewPatch(pageIndex: number, annotationIndex: number): OptimisticAnnotationPatch | undefined {
      return runtime.queries.getPreviewPatch(pageIndex, annotationIndex);
    },
    getSnapshot(): number {
      return runtime.lifecycle.getSnapshot();
    },
    hasAnyPending(): boolean {
      return runtime.queries.hasAnyPending();
    },
    hasPending(pageIndex: number, annotationIndex: number): boolean {
      return runtime.queries.hasPending(pageIndex, annotationIndex);
    },
    mergeForPage(
      pageIndex: number,
      annotations: readonly SerialisedAnnotation[],
      includePreview = true,
    ): readonly SerialisedAnnotation[] {
      return runtime.queries.mergeForPage(pageIndex, annotations, includePreview);
    },
    preview(pageIndex: number, annotationIndex: number, patch: OptimisticAnnotationPatch): void {
      runtime.writes.preview(pageIndex, annotationIndex, patch);
    },
    reset(): void {
      runtime.lifecycle.reset();
    },
    subscribe(listener: () => void): () => void {
      return runtime.lifecycle.subscribe(listener);
    },
    waitForIdle(): Promise<void> {
      return runtime.queries.waitForIdle();
    },
  };
}
