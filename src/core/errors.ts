/**
 * Error types and codes for PDFium operations.
 *
 * Provides a comprehensive error hierarchy with specific codes
 * for each category of error.
 *
 * @module core/errors
 */

/**
 * Error codes for PDFium operations, grouped by category.
 *
 * - 1xx: Initialisation errors
 * - 2xx: Document errors
 * - 3xx: Page errors
 * - 4xx: Render errors
 * - 5xx: Memory errors
 * - 6xx: Text errors
 * - 7xx: Object errors
 * - 8xx: Worker errors
 */
export enum PDFiumErrorCode {
  // Initialisation errors (1xx)
  /** Failed to load the WASM module */
  INIT_WASM_LOAD_FAILED = 100,
  /** Failed to initialise the PDFium library */
  INIT_LIBRARY_FAILED = 101,
  /** Invalid initialisation options provided */
  INIT_INVALID_OPTIONS = 102,
  /** Network error while fetching resources */
  INIT_NETWORK_ERROR = 103,

  // Document errors (2xx)
  /** The specified file was not found */
  DOC_FILE_NOT_FOUND = 200,
  /** The document format is invalid or unsupported */
  DOC_FORMAT_INVALID = 201,
  /** The document requires a password to open */
  DOC_PASSWORD_REQUIRED = 202,
  /** The provided password is incorrect */
  DOC_PASSWORD_INCORRECT = 203,
  /** The document uses unsupported security features */
  DOC_SECURITY_UNSUPPORTED = 204,
  /** Attempted to use a document that has been closed */
  DOC_ALREADY_CLOSED = 205,
  /** Unknown error while loading document */
  DOC_LOAD_UNKNOWN = 206,
  /** Failed to save document */
  DOC_SAVE_FAILED = 207,
  /** Failed to create a new document */
  DOC_CREATE_FAILED = 208,
  /** Operation not permitted by document permissions */
  DOC_PERMISSION_DENIED = 209,

  // Page errors (3xx)
  /** The specified page index is out of bounds */
  PAGE_NOT_FOUND = 300,
  /** Failed to load the page */
  PAGE_LOAD_FAILED = 301,
  /** Attempted to use a page that has been closed */
  PAGE_ALREADY_CLOSED = 302,
  /** Page index is out of valid range */
  PAGE_INDEX_OUT_OF_RANGE = 303,

  // Render errors (4xx)
  /** Failed to create the bitmap for rendering */
  RENDER_BITMAP_FAILED = 400,
  /** Invalid dimensions specified for rendering */
  RENDER_INVALID_DIMENSIONS = 401,
  /** Rendering operation failed */
  RENDER_FAILED = 402,

  // Memory errors (5xx)
  /** Failed to allocate memory in the WASM heap */
  MEMORY_ALLOCATION_FAILED = 500,
  /** Buffer overflow detected */
  MEMORY_BUFFER_OVERFLOW = 501,
  /** Invalid pointer operation */
  MEMORY_INVALID_POINTER = 502,

  // Text errors (6xx)
  /** Failed to extract text from the page */
  TEXT_EXTRACTION_FAILED = 600,
  /** Failed to create text page object */
  TEXT_PAGE_FAILED = 601,
  /** Failed to load text page for text extraction */
  TEXT_LOAD_FAILED = 602,

  // Annotation errors (7xx)
  /** Unknown or unsupported object type */
  OBJECT_TYPE_UNKNOWN = 700,
  /** Failed to access page object */
  OBJECT_ACCESS_FAILED = 701,
  /** Annotation index is out of range */
  ANNOT_INDEX_OUT_OF_RANGE = 750,
  /** Failed to load annotation */
  ANNOT_LOAD_FAILED = 751,

  // Worker errors (8xx)
  /** Failed to create worker */
  WORKER_CREATE_FAILED = 800,
  /** Worker communication error */
  WORKER_COMMUNICATION_FAILED = 801,
  /** Worker operation timed out */
  WORKER_TIMEOUT = 802,
  /** Worker resource limit exceeded */
  WORKER_RESOURCE_LIMIT = 803,

  // Resource errors (9xx)
  /** Attempted to use a resource that has been disposed */
  RESOURCE_DISPOSED = 900,
}

/**
 * Maps PDFium error codes to human-readable messages.
 */
const ERROR_MESSAGES: Record<PDFiumErrorCode, string> = {
  [PDFiumErrorCode.INIT_WASM_LOAD_FAILED]: 'Failed to load the PDFium WASM module',
  [PDFiumErrorCode.INIT_LIBRARY_FAILED]: 'Failed to initialise the PDFium library',
  [PDFiumErrorCode.INIT_INVALID_OPTIONS]: 'Invalid initialisation options provided',
  [PDFiumErrorCode.INIT_NETWORK_ERROR]: 'Network error while fetching resources',
  [PDFiumErrorCode.DOC_FILE_NOT_FOUND]: 'The specified file was not found',
  [PDFiumErrorCode.DOC_FORMAT_INVALID]: 'The document format is invalid or unsupported',
  [PDFiumErrorCode.DOC_PASSWORD_REQUIRED]: 'The document requires a password to open',
  [PDFiumErrorCode.DOC_PASSWORD_INCORRECT]: 'The provided password is incorrect',
  [PDFiumErrorCode.DOC_SECURITY_UNSUPPORTED]: 'The document uses unsupported security features',
  [PDFiumErrorCode.DOC_ALREADY_CLOSED]: 'Attempted to use a document that has been closed',
  [PDFiumErrorCode.DOC_LOAD_UNKNOWN]: 'Unknown error while loading document',
  [PDFiumErrorCode.DOC_SAVE_FAILED]: 'Failed to save document',
  [PDFiumErrorCode.DOC_CREATE_FAILED]: 'Failed to create a new document',
  [PDFiumErrorCode.DOC_PERMISSION_DENIED]: 'Operation not permitted by document permissions',
  [PDFiumErrorCode.PAGE_NOT_FOUND]: 'The specified page index is out of bounds',
  [PDFiumErrorCode.PAGE_LOAD_FAILED]: 'Failed to load the page',
  [PDFiumErrorCode.PAGE_ALREADY_CLOSED]: 'Attempted to use a page that has been closed',
  [PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE]: 'Page index is out of valid range',
  [PDFiumErrorCode.RENDER_BITMAP_FAILED]: 'Failed to create the bitmap for rendering',
  [PDFiumErrorCode.RENDER_INVALID_DIMENSIONS]: 'Invalid dimensions specified for rendering',
  [PDFiumErrorCode.RENDER_FAILED]: 'Rendering operation failed',
  [PDFiumErrorCode.MEMORY_ALLOCATION_FAILED]: 'Failed to allocate memory in the WASM heap',
  [PDFiumErrorCode.MEMORY_BUFFER_OVERFLOW]: 'Buffer overflow detected',
  [PDFiumErrorCode.MEMORY_INVALID_POINTER]: 'Invalid pointer operation',
  [PDFiumErrorCode.TEXT_EXTRACTION_FAILED]: 'Failed to extract text from the page',
  [PDFiumErrorCode.TEXT_PAGE_FAILED]: 'Failed to create text page object',
  [PDFiumErrorCode.TEXT_LOAD_FAILED]: 'Failed to load text page for text extraction',
  [PDFiumErrorCode.OBJECT_TYPE_UNKNOWN]: 'Unknown or unsupported object type',
  [PDFiumErrorCode.OBJECT_ACCESS_FAILED]: 'Failed to access page object',
  [PDFiumErrorCode.ANNOT_INDEX_OUT_OF_RANGE]: 'Annotation index is out of range',
  [PDFiumErrorCode.ANNOT_LOAD_FAILED]: 'Failed to load annotation',
  [PDFiumErrorCode.WORKER_CREATE_FAILED]: 'Failed to create worker',
  [PDFiumErrorCode.WORKER_COMMUNICATION_FAILED]: 'Worker communication error',
  [PDFiumErrorCode.WORKER_TIMEOUT]: 'Worker operation timed out',
  [PDFiumErrorCode.WORKER_RESOURCE_LIMIT]: 'Worker resource limit exceeded',
  [PDFiumErrorCode.RESOURCE_DISPOSED]: 'Attempted to use a resource that has been disposed',
};

/**
 * Gets the default message for an error code.
 */
export function getErrorMessage(code: number): string {
  return ERROR_MESSAGES[code as PDFiumErrorCode] ?? `Unknown error (code: ${code})`;
}

/**
 * Base error class for all PDFium errors.
 *
 * Provides structured error information including:
 * - A numeric error code for programmatic handling
 * - A human-readable message
 * - Optional context data for debugging
 *
 * @example
 * ```typescript
 * const error = new PDFiumError(
 *   PDFiumErrorCode.DOC_PASSWORD_REQUIRED,
 *   'Document requires password',
 *   { documentSize: 1024000 }
 * );
 * ```
 */
export class PDFiumError extends Error {
  /** The error code identifying the type of error */
  readonly code: PDFiumErrorCode;

  /** Optional context data providing additional information */
  readonly context?: Record<string, unknown>;

  constructor(code: PDFiumErrorCode, message?: string, context?: Record<string, unknown> | undefined) {
    const cause = context?.cause instanceof Error ? context.cause : undefined;
    super(message ?? getErrorMessage(code), cause !== undefined ? { cause } : undefined);
    this.name = 'PDFiumError';
    this.code = code;
    if (context !== undefined) {
      this.context = __DEV__ ? context : sanitiseContext(context);
    }

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Creates a JSON-serialisable representation of the error.
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      name: this.name,
      code: this.code,
      message: this.message,
    };
    if (this.context !== undefined) {
      result.context = this.context;
    }
    return result;
  }
}

/**
 * Error during library initialisation.
 *
 * Thrown when the PDFium library fails to initialise, typically due to
 * WASM loading issues or invalid configuration.
 */
export class InitialisationError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message?: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'InitialisationError';
  }
}

/**
 * Error during network operations.
 *
 * Thrown when fetching WASM resources fails.
 */
export class NetworkError extends InitialisationError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(PDFiumErrorCode.INIT_NETWORK_ERROR, message, context);
    this.name = 'NetworkError';
  }
}

/**
 * Error loading or accessing a document.
 *
 * Thrown when a PDF document cannot be opened or accessed, such as when
 * the file is corrupted, password-protected, or uses unsupported features.
 */
export class DocumentError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message?: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'DocumentError';
  }
}

/**
 * Error due to insufficient permissions.
 *
 * Thrown when an operation is blocked by the document's security settings.
 */
export class PermissionsError extends DocumentError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(PDFiumErrorCode.DOC_PERMISSION_DENIED, message, context);
    this.name = 'PermissionsError';
  }
}

/**
 * Error accessing or rendering a page.
 *
 * Thrown when a page cannot be loaded or an operation on a page fails.
 */
export class PageError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message?: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'PageError';
  }
}

/**
 * Error during rendering operations.
 *
 * Thrown when page rendering fails, such as when bitmap creation fails
 * or invalid dimensions are specified.
 */
export class RenderError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message?: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'RenderError';
  }
}

/**
 * Error during memory operations.
 *
 * Thrown when WASM memory allocation or manipulation fails.
 */
export class MemoryError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message?: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'MemoryError';
  }
}

/**
 * Error during text extraction.
 *
 * Thrown when text cannot be extracted from a page.
 */
export class TextError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message?: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'TextError';
  }
}

/**
 * Error accessing page objects.
 *
 * Thrown when page objects cannot be accessed or have an unsupported type.
 */
export class ObjectError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message?: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'ObjectError';
  }
}

/**
 * Error during worker operations.
 *
 * Thrown when worker creation, communication, or operations fail.
 */
export class WorkerError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message?: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'WorkerError';
  }
}

/**
 * Keys that may contain internal details (WASM pointers, heap addresses)
 * and should be stripped from error context in production.
 */
const INTERNAL_CONTEXT_KEYS = new Set(['ptr', 'heapSize', 'alignment']);

/**
 * Strip internal implementation details from error context in production.
 *
 * Removes keys that expose WASM memory layout (pointers, heap sizes)
 * which are not useful to library consumers and could leak internal state.
 */
function sanitiseContext(context: Record<string, unknown>): Record<string, unknown> {
  const sanitised: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (!INTERNAL_CONTEXT_KEYS.has(key)) {
      sanitised[key] = value;
    }
  }
  return sanitised;
}
