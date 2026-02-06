/**
 * Plugin system for PDFium.
 *
 * @module core/plugin
 */

import type { IDocumentReader } from './interfaces.js';

/**
 * Interface for PDFium plugins.
 *
 * Plugins can hook into document and page lifecycle events.
 */
export interface PDFiumPlugin {
  /** Plugin name. */
  name: string;
  /** Called when a document is opened. */
  onDocumentOpened?(document: IDocumentReader): void;
}

const plugins: PDFiumPlugin[] = [];

/**
 * Register a plugin.
 *
 * @param plugin - The plugin to register
 */
export function registerPlugin(plugin: PDFiumPlugin): void {
  plugins.push(plugin);
}

/**
 * Get all registered plugins.
 */
export function getPlugins(): readonly PDFiumPlugin[] {
  return plugins;
}

/**
 * Remove all registered plugins.
 *
 * @internal Primarily for test isolation.
 */
export function clearPlugins(): void {
  plugins.length = 0;
}
