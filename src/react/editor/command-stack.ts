import type { EditorCommand } from './command-shared.js';
import {
  getCommandStackCanRedo,
  getCommandStackCanUndo,
  getCommandStackIsDirty,
  getCommandStackSizeValue,
  markCommandStackAsClean,
} from './command-stack-accessors.js';
import {
  clearCommandStackHistory,
  pushCommandOnStack,
  redoCommandOnStack,
  undoCommandOnStack,
} from './command-stack-mutations.js';
import {
  type CommandStackRuntime,
  createCommandStackRuntime,
  enqueueCommandStackMutation,
} from './command-stack-runtime.js';

/**
 * Manages a stack of undoable/redoable editor commands.
 *
 * The stack maintains a cursor that tracks the current position.
 * Pushing a new command truncates any redo history.
 */
export class CommandStack {
  readonly #runtime: CommandStackRuntime;

  constructor(maxSize = 100) {
    this.#runtime = createCommandStackRuntime(maxSize);
  }

  get canUndo(): boolean {
    return getCommandStackCanUndo(this.#runtime.state);
  }

  get canRedo(): boolean {
    return getCommandStackCanRedo(this.#runtime.state);
  }

  get isDirty(): boolean {
    return getCommandStackIsDirty(this.#runtime.state);
  }

  get size(): number {
    return getCommandStackSizeValue(this.#runtime.state);
  }

  async push(command: EditorCommand): Promise<void> {
    await enqueueCommandStackMutation(this.#runtime, async () => {
      await pushCommandOnStack(this.#runtime.state, command);
    });
  }

  async undo(): Promise<void> {
    await enqueueCommandStackMutation(this.#runtime, async () => {
      await undoCommandOnStack(this.#runtime.state);
    });
  }

  async redo(): Promise<void> {
    await enqueueCommandStackMutation(this.#runtime, async () => {
      await redoCommandOnStack(this.#runtime.state);
    });
  }

  markClean(): void {
    markCommandStackAsClean(this.#runtime.state);
  }

  clear(): void {
    clearCommandStackHistory(this.#runtime.state);
  }
}
