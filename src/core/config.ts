/**
 * Global configuration for PDFium.
 *
 * @module core/config
 */

import { InitialisationError, PDFiumErrorCode } from './errors.js';
import { DEFAULT_LIMITS, type PDFiumLimits } from './types.js';

export interface PDFiumConfig {
  /** Resource limits for security and stability. */
  readonly limits: Required<PDFiumLimits>;
}

const defaultConfig: PDFiumConfig = {
  limits: DEFAULT_LIMITS,
};

let currentConfig: PDFiumConfig = { ...defaultConfig };

/**
 * Get the current configuration.
 */
export function getConfig(): PDFiumConfig {
  return currentConfig;
}

/**
 * Update the global configuration.
 *
 * @param config - Partial configuration to merge.
 * @throws {InitialisationError} If limit values are invalid.
 */
export function configure(config: Partial<Omit<PDFiumConfig, 'limits'> & { limits?: Partial<PDFiumLimits> }>): void {
  if (config.limits !== undefined) {
    if (
      config.limits.maxDocumentSize !== undefined &&
      (!Number.isSafeInteger(config.limits.maxDocumentSize) || config.limits.maxDocumentSize <= 0)
    ) {
      throw new InitialisationError(PDFiumErrorCode.INIT_INVALID_OPTIONS, 'maxDocumentSize must be a positive integer');
    }
    if (
      config.limits.maxRenderDimension !== undefined &&
      (!Number.isSafeInteger(config.limits.maxRenderDimension) || config.limits.maxRenderDimension <= 0)
    ) {
      throw new InitialisationError(
        PDFiumErrorCode.INIT_INVALID_OPTIONS,
        'maxRenderDimension must be a positive integer',
      );
    }
    if (
      config.limits.maxTextCharCount !== undefined &&
      (!Number.isSafeInteger(config.limits.maxTextCharCount) || config.limits.maxTextCharCount <= 0)
    ) {
      throw new InitialisationError(
        PDFiumErrorCode.INIT_INVALID_OPTIONS,
        'maxTextCharCount must be a positive integer',
      );
    }
  }

  currentConfig = {
    ...currentConfig,
    ...config,
    limits: {
      ...currentConfig.limits,
      ...config.limits,
    },
  };
}

/**
 * Reset the configuration to defaults.
 *
 * @internal Primarily for test isolation.
 */
export function resetConfig(): void {
  currentConfig = { ...defaultConfig };
}
