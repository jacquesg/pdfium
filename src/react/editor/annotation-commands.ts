/**
 * Public annotation-command surface for editor undo/redo operations.
 *
 * The implementation is split by concern:
 * - command payload types
 * - small annotation helpers
 * - create/remove snapshot-backed commands
 * - mutation commands
 *
 * This barrel preserves the stable import path for editor internals.
 */

export type {
  AnnotationStyleBorderMutation,
  AnnotationStyleColourMutation,
  CreateAnnotationOptions,
  SetAnnotationStyleCommandOptions,
  SnapshotRestoreOptions,
} from './annotation-command-types.js';
export {
  CreateAnnotationCommand,
  RemoveAnnotationCommand,
} from './annotation-create-remove-commands.js';
export {
  SetAnnotationBorderCommand,
  SetAnnotationColourCommand,
  SetAnnotationRectCommand,
  SetAnnotationStringCommand,
  SetAnnotationStyleCommand,
} from './annotation-mutation-commands.js';
