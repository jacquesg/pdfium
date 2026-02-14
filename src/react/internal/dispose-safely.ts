'use client';

interface DisposableLike {
  dispose: () => void | Promise<void>;
}

interface DisposeSafelyOptions {
  onError?: (error: unknown) => void;
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

function disposeSafely(resource: DisposableLike | null | undefined, options?: DisposeSafelyOptions): void {
  if (!resource) return;

  try {
    const result = resource.dispose();
    if (isPromiseLike(result)) {
      void result.catch((error: unknown) => {
        options?.onError?.(error);
      });
    }
  } catch (error) {
    options?.onError?.(error);
  }
}

async function disposeSafelyAsync(
  resource: DisposableLike | null | undefined,
  options?: DisposeSafelyOptions,
): Promise<void> {
  if (!resource) return;

  try {
    await resource.dispose();
  } catch (error) {
    options?.onError?.(error);
  }
}

export { disposeSafely, disposeSafelyAsync };
export type { DisposableLike, DisposeSafelyOptions };
