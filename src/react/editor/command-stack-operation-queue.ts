export class CommandStackOperationQueue {
  #queue: Promise<void> = Promise.resolve();

  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const queued = this.#queue.then(operation, operation);
    this.#queue = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }
}
