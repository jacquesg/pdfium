import { CommandStackOperationQueue } from './command-stack-operation-queue.js';
import { type CommandStackRuntimeState, createCommandStackRuntimeState } from './command-stack-state.js';

export interface CommandStackRuntime {
  readonly operationQueue: CommandStackOperationQueue;
  readonly state: CommandStackRuntimeState;
}

export function createCommandStackRuntime(maxSize: number): CommandStackRuntime {
  return {
    operationQueue: new CommandStackOperationQueue(),
    state: createCommandStackRuntimeState(maxSize),
  };
}

export function enqueueCommandStackMutation<T>(runtime: CommandStackRuntime, operation: () => Promise<T>): Promise<T> {
  return runtime.operationQueue.enqueue(operation);
}
