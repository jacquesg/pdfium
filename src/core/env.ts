/**
 * Environment detection utilities.
 *
 * @module core/env
 */

/**
 * Check if running in a Node.js environment.
 */
export function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && process.versions !== undefined && process.versions.node !== undefined;
}
