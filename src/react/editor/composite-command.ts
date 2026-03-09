import type { EditorCommand } from './command-shared.js';

/**
 * Batches multiple commands into a single undoable operation.
 *
 * Execute runs commands in order; undo reverses them.
 */
export class CompositeCommand implements EditorCommand {
  readonly description: string;
  readonly #commands: readonly EditorCommand[];

  constructor(description: string, commands: readonly EditorCommand[]) {
    this.description = description;
    this.#commands = commands;
  }

  async execute(): Promise<void> {
    for (const command of this.#commands) {
      await command.execute();
    }
  }

  async undo(): Promise<void> {
    for (let index = this.#commands.length - 1; index >= 0; index--) {
      const command = this.#commands[index];
      if (command !== undefined) {
        await command.undo();
      }
    }
  }
}
