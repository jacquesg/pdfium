import { describe, expect, it } from 'vitest';
import {
  DocumentError,
  getErrorMessage,
  InitialisationError,
  MemoryError,
  ObjectError,
  PageError,
  PDFiumError,
  PDFiumErrorCode,
  RenderError,
  TextError,
  WorkerError,
} from '../../../src/core/errors.js';

describe('PDFiumErrorCode', () => {
  it('has unique codes in each category', () => {
    const codes = Object.values(PDFiumErrorCode).filter((v) => typeof v === 'number');
    const uniqueCodes = new Set(codes);
    expect(codes.length).toBe(uniqueCodes.size);
  });

  it('has exact initialisation codes', () => {
    expect(PDFiumErrorCode.INIT_WASM_LOAD_FAILED).toBe(100);
    expect(PDFiumErrorCode.INIT_LIBRARY_FAILED).toBe(101);
    expect(PDFiumErrorCode.INIT_INVALID_OPTIONS).toBe(102);
  });

  it('has exact document codes', () => {
    expect(PDFiumErrorCode.DOC_FILE_NOT_FOUND).toBe(200);
    expect(PDFiumErrorCode.DOC_FORMAT_INVALID).toBe(201);
    expect(PDFiumErrorCode.DOC_PASSWORD_REQUIRED).toBe(202);
    expect(PDFiumErrorCode.DOC_PASSWORD_INCORRECT).toBe(203);
    expect(PDFiumErrorCode.DOC_SECURITY_UNSUPPORTED).toBe(204);
    expect(PDFiumErrorCode.DOC_ALREADY_CLOSED).toBe(205);
    expect(PDFiumErrorCode.DOC_LOAD_UNKNOWN).toBe(206);
    expect(PDFiumErrorCode.DOC_SAVE_FAILED).toBe(207);
  });

  it('has exact page codes', () => {
    expect(PDFiumErrorCode.PAGE_NOT_FOUND).toBe(300);
    expect(PDFiumErrorCode.PAGE_LOAD_FAILED).toBe(301);
    expect(PDFiumErrorCode.PAGE_ALREADY_CLOSED).toBe(302);
    expect(PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE).toBe(303);
  });

  it('has exact render codes', () => {
    expect(PDFiumErrorCode.RENDER_BITMAP_FAILED).toBe(400);
    expect(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS).toBe(401);
    expect(PDFiumErrorCode.RENDER_FAILED).toBe(402);
  });

  it('has exact memory codes', () => {
    expect(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED).toBe(500);
    expect(PDFiumErrorCode.MEMORY_BUFFER_OVERFLOW).toBe(501);
    expect(PDFiumErrorCode.MEMORY_INVALID_POINTER).toBe(502);
  });

  it('has exact text codes', () => {
    expect(PDFiumErrorCode.TEXT_EXTRACTION_FAILED).toBe(600);
    expect(PDFiumErrorCode.TEXT_PAGE_FAILED).toBe(601);
    expect(PDFiumErrorCode.TEXT_LOAD_FAILED).toBe(602);
  });

  it('has exact object codes', () => {
    expect(PDFiumErrorCode.OBJECT_TYPE_UNKNOWN).toBe(700);
    expect(PDFiumErrorCode.OBJECT_ACCESS_FAILED).toBe(701);
  });

  it('has exact worker codes', () => {
    expect(PDFiumErrorCode.WORKER_CREATE_FAILED).toBe(800);
    expect(PDFiumErrorCode.WORKER_COMMUNICATION_FAILED).toBe(801);
    expect(PDFiumErrorCode.WORKER_TIMEOUT).toBe(802);
    expect(PDFiumErrorCode.WORKER_RESOURCE_LIMIT).toBe(803);
  });

  it('has exact resource disposed code', () => {
    expect(PDFiumErrorCode.RESOURCE_DISPOSED).toBe(900);
  });
});

describe('getErrorMessage()', () => {
  it('returns correct message for each known code', () => {
    // Verify every code has a non-empty message
    const numericCodes = Object.values(PDFiumErrorCode).filter((v): v is number => typeof v === 'number');
    for (const code of numericCodes) {
      const message = getErrorMessage(code);
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(/^Unknown error \(code: \d+\)$/);
    }
  });

  it('returns specific message for DOC_PASSWORD_REQUIRED', () => {
    expect(getErrorMessage(PDFiumErrorCode.DOC_PASSWORD_REQUIRED)).toBe('The document requires a password to open');
  });

  it('returns specific message for MEMORY_ALLOCATION_FAILED', () => {
    expect(getErrorMessage(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED)).toBe(
      'Failed to allocate memory in the WASM heap',
    );
  });

  it('returns specific message for RESOURCE_DISPOSED', () => {
    expect(getErrorMessage(PDFiumErrorCode.RESOURCE_DISPOSED)).toBe(
      'Attempted to use a resource that has been disposed',
    );
  });

  it('returns fallback message for unknown code', () => {
    const message = getErrorMessage(9999);
    expect(message).toContain('Unknown error');
    expect(message).toContain('9999');
  });
});

describe('PDFiumError', () => {
  it('creates error with code and default message', () => {
    const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID);
    expect(error.code).toBe(PDFiumErrorCode.DOC_FORMAT_INVALID);
    expect(error.message).toBe('The document format is invalid or unsupported');
    expect(error.name).toBe('PDFiumError');
  });

  it('creates error with custom message', () => {
    const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Custom message');
    expect(error.message).toBe('Custom message');
  });

  it('creates error with context', () => {
    const context = { fileName: 'test.pdf', size: 1024 };
    const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Error', context);
    expect(error.context).toEqual(context);
  });

  it('is instanceof Error', () => {
    const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID);
    expect(error).toBeInstanceOf(Error);
  });

  it('has proper stack trace', () => {
    const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID);
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('PDFiumError');
  });

  describe('toJSON()', () => {
    it('serialises without context', () => {
      const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Test message');
      const json = error.toJSON();
      expect(json).toEqual({
        name: 'PDFiumError',
        code: PDFiumErrorCode.DOC_FORMAT_INVALID,
        message: 'Test message',
      });
    });

    it('serialises with context', () => {
      const context = { foo: 'bar' };
      const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Test', context);
      const json = error.toJSON();
      expect(json.context).toEqual(context);
    });

    it('does not include context key when undefined', () => {
      const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Test');
      const json = error.toJSON();
      expect(Object.keys(json)).toEqual(['name', 'code', 'message']);
      expect(json).not.toHaveProperty('context');
    });
  });

  it('does not store context when undefined', () => {
    const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID);
    expect(error.context).toBeUndefined();
  });

  it('stores context when provided', () => {
    const ctx = { a: 1 };
    const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'msg', ctx);
    expect(error.context).toBe(ctx);
  });

  it('sanitises internal context keys in production mode', () => {
    // Save current __DEV__ mode
    const originalDev = (globalThis as Record<string, unknown>).__DEV__;

    // Mock production mode
    Object.defineProperty(globalThis, '__DEV__', {
      value: false,
      writable: true,
      configurable: true,
    });

    try {
      const context = {
        ptr: 12345,
        heapSize: 1024,
        alignment: 8,
        userKey: 'value',
      };
      const error = new PDFiumError(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED, 'Test', context);

      // In production, internal keys should be stripped
      expect(error.context).toBeDefined();
      expect(error.context).not.toHaveProperty('ptr');
      expect(error.context).not.toHaveProperty('heapSize');
      expect(error.context).not.toHaveProperty('alignment');
      expect(error.context).toHaveProperty('userKey');
      expect(error.context?.userKey).toBe('value');
    } finally {
      // Restore __DEV__ mode
      Object.defineProperty(globalThis, '__DEV__', {
        value: originalDev,
        writable: true,
        configurable: true,
      });
    }
  });

  it('preserves all context keys in dev mode', () => {
    // Ensure we're in dev mode
    const originalDev = (globalThis as Record<string, unknown>).__DEV__;
    Object.defineProperty(globalThis, '__DEV__', {
      value: true,
      writable: true,
      configurable: true,
    });

    try {
      const context = {
        ptr: 12345,
        heapSize: 1024,
        alignment: 8,
        userKey: 'value',
      };
      const error = new PDFiumError(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED, 'Test', context);

      // In dev mode, all keys should be preserved
      expect(error.context).toBe(context);
      expect(error.context?.ptr).toBe(12345);
      expect(error.context?.heapSize).toBe(1024);
      expect(error.context?.alignment).toBe(8);
      expect(error.context?.userKey).toBe('value');
    } finally {
      Object.defineProperty(globalThis, '__DEV__', {
        value: originalDev,
        writable: true,
        configurable: true,
      });
    }
  });
});

describe('Error subclasses', () => {
  describe('InitialisationError', () => {
    it('has correct name', () => {
      const error = new InitialisationError(PDFiumErrorCode.INIT_WASM_LOAD_FAILED);
      expect(error.name).toBe('InitialisationError');
    });

    it('extends PDFiumError', () => {
      const error = new InitialisationError(PDFiumErrorCode.INIT_WASM_LOAD_FAILED);
      expect(error).toBeInstanceOf(PDFiumError);
    });
  });

  describe('DocumentError', () => {
    it('has correct name', () => {
      const error = new DocumentError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED);
      expect(error.name).toBe('DocumentError');
    });

    it('extends PDFiumError', () => {
      const error = new DocumentError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED);
      expect(error).toBeInstanceOf(PDFiumError);
    });
  });

  describe('PageError', () => {
    it('has correct name', () => {
      const error = new PageError(PDFiumErrorCode.PAGE_NOT_FOUND);
      expect(error.name).toBe('PageError');
    });

    it('extends PDFiumError', () => {
      const error = new PageError(PDFiumErrorCode.PAGE_NOT_FOUND);
      expect(error).toBeInstanceOf(PDFiumError);
    });
  });

  describe('RenderError', () => {
    it('has correct name', () => {
      const error = new RenderError(PDFiumErrorCode.RENDER_BITMAP_FAILED);
      expect(error.name).toBe('RenderError');
    });

    it('extends PDFiumError', () => {
      const error = new RenderError(PDFiumErrorCode.RENDER_BITMAP_FAILED);
      expect(error).toBeInstanceOf(PDFiumError);
    });
  });

  describe('MemoryError', () => {
    it('has correct name', () => {
      const error = new MemoryError(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED);
      expect(error.name).toBe('MemoryError');
    });

    it('extends PDFiumError', () => {
      const error = new MemoryError(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED);
      expect(error).toBeInstanceOf(PDFiumError);
    });
  });

  describe('TextError', () => {
    it('has correct name', () => {
      const error = new TextError(PDFiumErrorCode.TEXT_EXTRACTION_FAILED);
      expect(error.name).toBe('TextError');
    });

    it('extends PDFiumError', () => {
      const error = new TextError(PDFiumErrorCode.TEXT_EXTRACTION_FAILED);
      expect(error).toBeInstanceOf(PDFiumError);
    });
  });

  describe('ObjectError', () => {
    it('has correct name', () => {
      const error = new ObjectError(PDFiumErrorCode.OBJECT_TYPE_UNKNOWN);
      expect(error.name).toBe('ObjectError');
    });

    it('extends PDFiumError', () => {
      const error = new ObjectError(PDFiumErrorCode.OBJECT_TYPE_UNKNOWN);
      expect(error).toBeInstanceOf(PDFiumError);
    });
  });

  describe('WorkerError', () => {
    it('has correct name', () => {
      const error = new WorkerError(PDFiumErrorCode.WORKER_CREATE_FAILED);
      expect(error.name).toBe('WorkerError');
    });

    it('extends PDFiumError', () => {
      const error = new WorkerError(PDFiumErrorCode.WORKER_CREATE_FAILED);
      expect(error).toBeInstanceOf(PDFiumError);
    });
  });
});
