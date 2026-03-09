import { createAnnotationMutationStorePublicApi } from './annotation-mutation-store-public-api.js';
import { createAnnotationMutationStoreRuntime } from './annotation-mutation-store-runtime.js';

/**
 * Mutable store of optimistic annotation mutations.
 */
export class AnnotationMutationStore {
  readonly acknowledge;
  readonly begin;
  readonly clear;
  readonly clearPreview;
  readonly destroy;
  readonly getPatch;
  readonly getPreviewPatch;
  readonly getSnapshot;
  readonly hasAnyPending;
  readonly hasPending;
  readonly mergeForPage;
  readonly preview;
  readonly reset;
  readonly subscribe;
  readonly waitForIdle;

  constructor() {
    const api = createAnnotationMutationStorePublicApi(createAnnotationMutationStoreRuntime());
    this.acknowledge = api.acknowledge;
    this.begin = api.begin;
    this.clear = api.clear;
    this.clearPreview = api.clearPreview;
    this.destroy = api.destroy;
    this.getPatch = api.getPatch;
    this.getPreviewPatch = api.getPreviewPatch;
    this.getSnapshot = api.getSnapshot;
    this.hasAnyPending = api.hasAnyPending;
    this.hasPending = api.hasPending;
    this.mergeForPage = api.mergeForPage;
    this.preview = api.preview;
    this.reset = api.reset;
    this.subscribe = api.subscribe;
    this.waitForIdle = api.waitForIdle;
  }
}
