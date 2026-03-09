import { INVALID_CLEAN_CURSOR } from './command-shared.js';
import type { MutableCommandStackState } from './command-stack-support.types.js';

export function truncateRedoHistory(state: MutableCommandStackState): void {
  if (state.cleanCursor > state.cursor) {
    state.cleanCursor = INVALID_CLEAN_CURSOR;
  }
  state.commands.length = state.cursor + 1;
  state.commandTimestamps.length = state.cursor + 1;
}

export function recordPushedCommandCleanCursor(state: MutableCommandStackState): void {
  if (state.commands.length > state.maxSize) {
    state.commands.shift();
    state.commandTimestamps.shift();
    if (state.cleanCursor > 0) {
      state.cleanCursor--;
    } else if (state.cleanCursor === 0) {
      state.cleanCursor = INVALID_CLEAN_CURSOR;
    }
    return;
  }

  state.cursor++;
}

export function clearCommandStackState(state: MutableCommandStackState): void {
  state.commands.length = 0;
  state.commandTimestamps.length = 0;
  state.cursor = -1;
  state.cleanCursor = -1;
}
