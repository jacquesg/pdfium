import {
  COMMAND_COALESCE_WINDOW_MS,
  type EditorCommand,
  INVALID_CLEAN_CURSOR,
  isCoalescibleCommand,
} from './command-shared.js';
import { recordPushedCommandCleanCursor } from './command-stack-history-support.js';
import type { MutableCommandStackState } from './command-stack-support.types.js';

export function tryCoalescePushedCommand(
  state: MutableCommandStackState,
  command: EditorCommand,
  now: number,
): boolean {
  const previous = state.commands[state.cursor];
  const previousTimestamp = state.commandTimestamps[state.cursor] ?? 0;
  if (
    previous === undefined ||
    now - previousTimestamp > COMMAND_COALESCE_WINDOW_MS ||
    !isCoalescibleCommand(previous)
  ) {
    return false;
  }

  const merged = previous.coalesce(command);
  if (merged === null) {
    return false;
  }

  state.commands[state.cursor] = merged;
  state.commandTimestamps[state.cursor] = now;
  if (state.cleanCursor === state.cursor) {
    state.cleanCursor = INVALID_CLEAN_CURSOR;
  }
  return true;
}

export function recordPushedCommand(state: MutableCommandStackState, command: EditorCommand, now: number): void {
  state.commands.push(command);
  state.commandTimestamps.push(now);
  recordPushedCommandCleanCursor(state);
}
