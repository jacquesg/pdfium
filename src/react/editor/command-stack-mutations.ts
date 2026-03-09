import type { EditorCommand } from './command-shared.js';
import { type CommandStackRuntimeState, canRedoCommandStack, canUndoCommandStack } from './command-stack-state.js';
import {
  clearCommandStackState,
  recordPushedCommand,
  truncateRedoHistory,
  tryCoalescePushedCommand,
} from './command-stack-support.js';

export async function pushCommandOnStack(
  state: CommandStackRuntimeState,
  command: EditorCommand,
  now = Date.now(),
): Promise<void> {
  await command.execute();
  truncateRedoHistory(state);
  if (!tryCoalescePushedCommand(state, command, now)) {
    recordPushedCommand(state, command, now);
  }
}

export async function undoCommandOnStack(state: CommandStackRuntimeState): Promise<void> {
  if (!canUndoCommandStack(state)) return;

  const command = state.commands[state.cursor];
  if (command === undefined) return;

  await command.undo();
  state.cursor--;
}

export async function redoCommandOnStack(state: CommandStackRuntimeState): Promise<void> {
  if (!canRedoCommandStack(state)) return;

  state.cursor++;
  const command = state.commands[state.cursor];
  if (command === undefined) {
    state.cursor--;
    return;
  }

  await command.execute();
}

export function clearCommandStackHistory(state: CommandStackRuntimeState): void {
  clearCommandStackState(state);
}
