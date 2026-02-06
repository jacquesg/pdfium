/**
 * Integration tests for form action execution methods.
 *
 * Tests the document and page action execution methods that trigger
 * JavaScript actions associated with document/page lifecycle events.
 */

import { describe, expect, test } from 'vitest';
import { DocumentActionType, PageActionType } from '../../src/core/types.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Form Actions - Document Level', () => {
  describe('DocumentActionType enum values', () => {
    test('should have correct values', () => {
      expect(DocumentActionType.WillClose).toBe('WillClose');
      expect(DocumentActionType.WillSave).toBe('WillSave');
      expect(DocumentActionType.DidSave).toBe('DidSave');
      expect(DocumentActionType.WillPrint).toBe('WillPrint');
      expect(DocumentActionType.DidPrint).toBe('DidPrint');
    });
  });

  describe('executeDocumentAction', () => {
    test('should exist as a method on the document', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(typeof document.executeDocumentAction).toBe('function');
    });

    test('should not throw for WillClose action', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.executeDocumentAction(DocumentActionType.WillClose)).not.toThrow();
    });

    test('should not throw for WillSave action', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.executeDocumentAction(DocumentActionType.WillSave)).not.toThrow();
    });

    test('should not throw for DidSave action', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.executeDocumentAction(DocumentActionType.DidSave)).not.toThrow();
    });

    test('should not throw for WillPrint action', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.executeDocumentAction(DocumentActionType.WillPrint)).not.toThrow();
    });

    test('should not throw for DidPrint action', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.executeDocumentAction(DocumentActionType.DidPrint)).not.toThrow();
    });
  });

  describe('executeDocumentJSAction', () => {
    test('should exist as a method on the document', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(typeof document.executeDocumentJSAction).toBe('function');
    });

    test('should not throw', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.executeDocumentJSAction()).not.toThrow();
    });
  });

  describe('executeDocumentOpenAction', () => {
    test('should exist as a method on the document', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(typeof document.executeDocumentOpenAction).toBe('function');
    });

    test('should not throw', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.executeDocumentOpenAction()).not.toThrow();
    });
  });
});

describe('Form Actions - Page Level', () => {
  describe('PageActionType enum values', () => {
    test('should have correct values', () => {
      expect(PageActionType.Open).toBe('Open');
      expect(PageActionType.Close).toBe('Close');
    });
  });

  describe('executePageAction', () => {
    test('should exist as a method on the page', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(typeof page.executePageAction).toBe('function');
    });

    test('should not throw for Open action', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.executePageAction(PageActionType.Open)).not.toThrow();
    });

    test('should not throw for Close action', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.executePageAction(PageActionType.Close)).not.toThrow();
    });
  });
});

describe('Form Actions with form document', () => {
  test('should handle document actions on form PDF', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');

    expect(() => doc.executeDocumentAction(DocumentActionType.WillSave)).not.toThrow();
    expect(() => doc.executeDocumentAction(DocumentActionType.DidSave)).not.toThrow();
    expect(() => doc.executeDocumentJSAction()).not.toThrow();
    expect(() => doc.executeDocumentOpenAction()).not.toThrow();
  });

  test('should handle page actions on form PDF', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    expect(() => page.executePageAction(PageActionType.Open)).not.toThrow();
    expect(() => page.executePageAction(PageActionType.Close)).not.toThrow();
  });
});

describe('Form Actions post-dispose guards', () => {
  test('should throw on executeDocumentAction after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.executeDocumentAction(DocumentActionType.WillClose)).toThrow();
  });

  test('should throw on executeDocumentJSAction after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.executeDocumentJSAction()).toThrow();
  });

  test('should throw on executeDocumentOpenAction after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.executeDocumentOpenAction()).toThrow();
  });

  test('should throw on executePageAction after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.executePageAction(PageActionType.Open)).toThrow();
  });
});
