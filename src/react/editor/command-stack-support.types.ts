import type { EditorCommand } from './command-shared.js';

export interface MutableCommandStackState {
  readonly commands: EditorCommand[];
  readonly commandTimestamps: number[];
  readonly maxSize: number;
  cursor: number;
  cleanCursor: number;
}
