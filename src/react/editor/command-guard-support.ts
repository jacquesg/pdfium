import type { CoalescibleCommand, EditorCommand } from './command-runtime.types.js';

export function assertMutationSucceeded(operation: string, success: boolean): void {
  if (success) return;
  throw new Error(`Failed to ${operation}`);
}

export function assertInkStrokeSucceeded(strokeIndex: number): void {
  if (strokeIndex >= 0) return;
  throw new Error('Failed to add ink stroke');
}

export function isCoalescibleCommand(command: EditorCommand): command is CoalescibleCommand {
  return typeof (command as CoalescibleCommand).coalesce === 'function';
}

export const COMMAND_COALESCE_WINDOW_MS = 400;
export const INVALID_CLEAN_CURSOR = Number.MIN_SAFE_INTEGER;
