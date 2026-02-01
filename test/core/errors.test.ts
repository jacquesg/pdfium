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
} from '../../src/core/errors.js';

describe('PDFiumErrorCode', () => {
  it('has unique codes in each category', () => {
    const codes = Object.values(PDFiumErrorCode).filter((v) => typeof v === 'number');
    const uniqueCodes = new Set(codes);
    expect(codes.length).toBe(uniqueCodes.size);
  });

  it('initialisation codes are in 1xx range', () => {
    expect(PDFiumErrorCode.INIT_WASM_LOAD_FAILED).toBeGreaterThanOrEqual(100);
    expect(PDFiumErrorCode.INIT_WASM_LOAD_FAILED).toBeLessThan(200);
    expect(PDFiumErrorCode.INIT_LIBRARY_FAILED).toBeGreaterThanOrEqual(100);
    expect(PDFiumErrorCode.INIT_LIBRARY_FAILED).toBeLessThan(200);
  });

  it('document codes are in 2xx range', () => {
    expect(PDFiumErrorCode.DOC_FILE_NOT_FOUND).toBeGreaterThanOrEqual(200);
    expect(PDFiumErrorCode.DOC_FILE_NOT_FOUND).toBeLessThan(300);
    expect(PDFiumErrorCode.DOC_PASSWORD_REQUIRED).toBeGreaterThanOrEqual(200);
    expect(PDFiumErrorCode.DOC_PASSWORD_REQUIRED).toBeLessThan(300);
  });

  it('page codes are in 3xx range', () => {
    expect(PDFiumErrorCode.PAGE_NOT_FOUND).toBeGreaterThanOrEqual(300);
    expect(PDFiumErrorCode.PAGE_NOT_FOUND).toBeLessThan(400);
  });

  it('render codes are in 4xx range', () => {
    expect(PDFiumErrorCode.RENDER_BITMAP_FAILED).toBeGreaterThanOrEqual(400);
    expect(PDFiumErrorCode.RENDER_BITMAP_FAILED).toBeLessThan(500);
  });

  it('memory codes are in 5xx range', () => {
    expect(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED).toBeGreaterThanOrEqual(500);
    expect(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED).toBeLessThan(600);
  });

  it('worker codes are in 8xx range', () => {
    expect(PDFiumErrorCode.WORKER_CREATE_FAILED).toBeGreaterThanOrEqual(800);
    expect(PDFiumErrorCode.WORKER_CREATE_FAILED).toBeLessThan(900);
  });
});

describe('getErrorMessage()', () => {
  it('returns message for known code', () => {
    const message = getErrorMessage(PDFiumErrorCode.DOC_PASSWORD_REQUIRED);
    expect(message).toBe('The document requires a password to open');
  });

  it('returns fallback message for unknown code', () => {
    const message = getErrorMessage(9999 as PDFiumErrorCode);
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
