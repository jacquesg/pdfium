import {
  type CommandStackRuntimeState,
  canRedoCommandStack,
  canUndoCommandStack,
  getCommandStackSize,
  isCommandStackDirty,
  markCommandStackClean,
} from './command-stack-state.js';

export function getCommandStackCanUndo(state: CommandStackRuntimeState): boolean {
  return canUndoCommandStack(state);
}

export function getCommandStackCanRedo(state: CommandStackRuntimeState): boolean {
  return canRedoCommandStack(state);
}

export function getCommandStackIsDirty(state: CommandStackRuntimeState): boolean {
  return isCommandStackDirty(state);
}

export function getCommandStackSizeValue(state: CommandStackRuntimeState): number {
  return getCommandStackSize(state);
}

export function markCommandStackAsClean(state: CommandStackRuntimeState): void {
  markCommandStackClean(state);
}
