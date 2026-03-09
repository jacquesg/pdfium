import { CommandStack } from './command.js';

export class ObservableCommandStack extends CommandStack {
  readonly #listeners = new Set<() => void>();
  #version = 0;

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  getSnapshot(): number {
    return this.#version;
  }

  #notify(): void {
    this.#version++;
    for (const listener of this.#listeners) {
      listener();
    }
  }

  override async push(command: Parameters<CommandStack['push']>[0]): Promise<void> {
    await super.push(command);
    this.#notify();
  }

  override async undo(): Promise<void> {
    await super.undo();
    this.#notify();
  }

  override async redo(): Promise<void> {
    await super.redo();
    this.#notify();
  }

  override markClean(): void {
    super.markClean();
    this.#notify();
  }

  override clear(): void {
    super.clear();
    this.#notify();
  }
}
