import type { EditorCommand } from './command-shared.js';
import type { MutableCommandStackState } from './command-stack-support.js';

export interface CommandStackRuntimeState extends MutableCommandStackState {
  readonly commands: EditorCommand[];
  readonly commandTimestamps: number[];
}

export function createCommandStackRuntimeState(maxSize: number): CommandStackRuntimeState {
  return {
    cleanCursor: -1,
    commandTimestamps: [],
    commands: [],
    cursor: -1,
    maxSize,
  };
}

export function canUndoCommandStack(state: CommandStackRuntimeState): boolean {
  return state.cursor >= 0;
}

export function canRedoCommandStack(state: CommandStackRuntimeState): boolean {
  return state.cursor < state.commands.length - 1;
}

export function isCommandStackDirty(state: CommandStackRuntimeState): boolean {
  return state.cursor !== state.cleanCursor;
}

export function getCommandStackSize(state: CommandStackRuntimeState): number {
  return state.commands.length;
}

export function markCommandStackClean(state: CommandStackRuntimeState): void {
  state.cleanCursor = state.cursor;
}
