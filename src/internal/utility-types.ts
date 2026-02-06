/**
 * Internal utility types.
 *
 * @internal
 * @module internal/utility-types
 */

/**
 * Utility type to remove readonly modifiers.
 * @internal
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};
