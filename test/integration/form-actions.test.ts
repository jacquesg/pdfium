/**
 * Integration tests for form action execution methods.
 *
 * Tests the document and page action execution methods that trigger
 * JavaScript actions associated with document/page lifecycle events.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { DocumentActionType, PageActionType } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Form Actions - Document Level', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  describe('DocumentActionType enum values', () => {
    test('should have correct values', () => {
      expect(DocumentActionType.WillClose).toBe(0);
      expect(DocumentActionType.WillSave).toBe(1);
      expect(DocumentActionType.DidSave).toBe(2);
      expect(DocumentActionType.WillPrint).toBe(3);
      expect(DocumentActionType.DidPrint).toBe(4);
    });
  });

  describe('executeDocumentAction', () => {
    test('should exist as a method on the document', () => {
      expect(typeof document.executeDocumentAction).toBe('function');
    });

    test('should not throw for WillClose action', () => {
      expect(() => document.executeDocumentAction(DocumentActionType.WillClose)).not.toThrow();
    });

    test('should not throw for WillSave action', () => {
      expect(() => document.executeDocumentAction(DocumentActionType.WillSave)).not.toThrow();
    });

    test('should not throw for DidSave action', () => {
      expect(() => document.executeDocumentAction(DocumentActionType.DidSave)).not.toThrow();
    });

    test('should not throw for WillPrint action', () => {
      expect(() => document.executeDocumentAction(DocumentActionType.WillPrint)).not.toThrow();
    });

    test('should not throw for DidPrint action', () => {
      expect(() => document.executeDocumentAction(DocumentActionType.DidPrint)).not.toThrow();
    });
  });

  describe('executeDocumentJSAction', () => {
    test('should exist as a method on the document', () => {
      expect(typeof document.executeDocumentJSAction).toBe('function');
    });

    test('should not throw', () => {
      expect(() => document.executeDocumentJSAction()).not.toThrow();
    });
  });

  describe('executeDocumentOpenAction', () => {
    test('should exist as a method on the document', () => {
      expect(typeof document.executeDocumentOpenAction).toBe('function');
    });

    test('should not throw', () => {
      expect(() => document.executeDocumentOpenAction()).not.toThrow();
    });
  });
});

describe('Form Actions - Page Level', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('PageActionType enum values', () => {
    test('should have correct values', () => {
      expect(PageActionType.Open).toBe(0);
      expect(PageActionType.Close).toBe(1);
    });
  });

  describe('executePageAction', () => {
    test('should exist as a method on the page', () => {
      expect(typeof page.executePageAction).toBe('function');
    });

    test('should not throw for Open action', () => {
      expect(() => page.executePageAction(PageActionType.Open)).not.toThrow();
    });

    test('should not throw for Close action', () => {
      expect(() => page.executePageAction(PageActionType.Close)).not.toThrow();
    });
  });
});

describe('Form Actions with form document', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should handle document actions on form PDF', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');

    expect(() => doc.executeDocumentAction(DocumentActionType.WillSave)).not.toThrow();
    expect(() => doc.executeDocumentAction(DocumentActionType.DidSave)).not.toThrow();
    expect(() => doc.executeDocumentJSAction()).not.toThrow();
    expect(() => doc.executeDocumentOpenAction()).not.toThrow();
  });

  test('should handle page actions on form PDF', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    expect(() => page.executePageAction(PageActionType.Open)).not.toThrow();
    expect(() => page.executePageAction(PageActionType.Close)).not.toThrow();
  });
});

describe('Form Actions post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on executeDocumentAction after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.executeDocumentAction(DocumentActionType.WillClose)).toThrow();
  });

  test('should throw on executeDocumentJSAction after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.executeDocumentJSAction()).toThrow();
  });

  test('should throw on executeDocumentOpenAction after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.executeDocumentOpenAction()).toThrow();
  });

  test('should throw on executePageAction after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    page.dispose();
    expect(() => page.executePageAction(PageActionType.Open)).toThrow();
    doc.dispose();
  });
});
