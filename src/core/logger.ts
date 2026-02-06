/**
 * Logging abstraction for PDFium.
 *
 * Allows consumers to intercept or suppress internal logs.
 *
 * @module core/logger
 */

/**
 * Interface for handling log messages.
 */
export interface Logger {
  /** Log a debug message. */
  debug(message: string, ...args: unknown[]): void;
  /** Log an informational message. */
  info(message: string, ...args: unknown[]): void;
  /** Log a warning message. */
  warn(message: string, ...args: unknown[]): void;
  /** Log an error message. */
  error(message: string, ...args: unknown[]): void;
}

/**
 * Default logger implementation that delegates to the global console.
 */
export class ConsoleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[PDFium] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[PDFium] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[PDFium] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[PDFium] ${message}`, ...args);
  }
}

/**
 * Silent logger implementation that discards all messages.
 */
export class SilentLogger implements Logger {
  debug(_message: string, ..._args: unknown[]): void {}
  info(_message: string, ..._args: unknown[]): void {}
  warn(_message: string, ..._args: unknown[]): void {}
  error(_message: string, ..._args: unknown[]): void {}
}

let currentLogger: Logger = new ConsoleLogger();

/**
 * Get the current logger instance.
 */
export function getLogger(): Logger {
  return currentLogger;
}

/**
 * Set the global logger instance.
 *
 * @param logger - The new logger to use
 */
export function setLogger(logger: Logger): void {
  currentLogger = logger;
}

/**
 * Reset the logger to the default ConsoleLogger.
 *
 * @internal Primarily for test isolation.
 */
export function resetLogger(): void {
  currentLogger = new ConsoleLogger();
}
