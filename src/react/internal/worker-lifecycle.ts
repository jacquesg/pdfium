import { disposeSafely } from './dispose-safely.js';
import { toError } from './error-normalization.js';

interface DisposableWorker {
  dispose: () => void | Promise<void>;
}

interface WorkerInstanceRef<TWorker extends DisposableWorker> {
  current: TWorker | null;
}

interface StartWorkerInitialisationOptions<TWorker extends DisposableWorker> {
  workerUrl: string | URL;
  wasmBinary: ArrayBuffer;
  createWorker: (options: { workerUrl: string | URL; wasmBinary: ArrayBuffer }) => Promise<TWorker>;
  instanceRef: WorkerInstanceRef<TWorker>;
  setInstance: (instance: TWorker | null) => void;
  setIsInitialising: (value: boolean) => void;
  setError: (error: Error) => void;
}

function startWorkerInitialisation<TWorker extends DisposableWorker>({
  workerUrl,
  wasmBinary,
  createWorker,
  instanceRef,
  setInstance,
  setIsInitialising,
  setError,
}: StartWorkerInitialisationOptions<TWorker>): () => void {
  let disposed = false;
  let createdInstance: TWorker | null = null;

  // Expose a null instance while the next worker is being constructed.
  setInstance(null);
  setIsInitialising(true);

  let createWorkerPromise: Promise<TWorker>;
  try {
    createWorkerPromise = createWorker({ workerUrl, wasmBinary });
  } catch (error) {
    setError(toError(error));
    setIsInitialising(false);
    return () => {};
  }

  createWorkerPromise.then(
    (instance) => {
      if (disposed) {
        disposeSafely(instance);
        return;
      }
      createdInstance = instance;
      instanceRef.current = instance;
      setInstance(instance);
      setIsInitialising(false);
    },
    (error: unknown) => {
      if (disposed) return;
      setError(toError(error));
      setIsInitialising(false);
    },
  );

  return () => {
    disposed = true;
    const instanceToDispose = createdInstance ?? instanceRef.current;
    if (!instanceToDispose) return;
    if (instanceRef.current === instanceToDispose) {
      instanceRef.current = null;
    }
    disposeSafely(instanceToDispose, {
      onError: (error) => {
        setError(toError(error));
      },
    });
  };
}

export { startWorkerInitialisation };
export type { DisposableWorker, StartWorkerInitialisationOptions, WorkerInstanceRef };
