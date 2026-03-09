/**
 * Public command surface for editor undo/redo operations.
 *
 * The implementation is split by concern:
 * - shared contracts/helpers
 * - command stack orchestration
 * - annotation commands
 * - page commands
 * - composite commands
 *
 * This barrel preserves the stable import path used across the editor and demo.
 *
 * @module react/editor/command
 */

export type {
  AnnotationStyleBorderMutation,
  AnnotationStyleColourMutation,
  CreateAnnotationOptions,
  SetAnnotationStyleCommandOptions,
  SnapshotRestoreOptions,
} from './annotation-commands.js';
export {
  CreateAnnotationCommand,
  RemoveAnnotationCommand,
  SetAnnotationBorderCommand,
  SetAnnotationColourCommand,
  SetAnnotationRectCommand,
  SetAnnotationStringCommand,
  SetAnnotationStyleCommand,
} from './annotation-commands.js';
export type { DocumentOpener, EditorCommand, PageAccessor } from './command-shared.js';
export { CommandStack } from './command-stack.js';
export { CompositeCommand } from './composite-command.js';
export type { ApplyRedactionsCommandOptions } from './page-commands.js';
export {
  ApplyRedactionsCommand,
  DeletePageCommand,
  InsertBlankPageCommand,
  MovePageCommand,
} from './page-commands.js';
