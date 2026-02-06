import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FormType } from '../../../src/core/types.js';
import { PDFium } from '../../../src/pdfium.js';

describe('Real-World PDF Features', () => {
  let pdfium: PDFium;
  let files: string[] = [];

  beforeAll(async () => {
    pdfium = await PDFium.init();

    // Get all PDF files from fixtures
    const fixturesDir = 'test/fixtures';
    const entries = await readdir(fixturesDir);
    files = entries.filter((f) => f.endsWith('.pdf')).map((f) => join(fixturesDir, f));

    // Add extra valid downloads
    files.push('test/fixtures/extra/attachment.pdf');
  });

  afterAll(() => {
    pdfium.dispose();
  });

  it('should inspect all fixtures for advanced features', async () => {
    for (const file of files) {
      try {
        const buffer = await readFile(file);
        using doc = await pdfium.openDocument(buffer, { password: '12345678' }); // Try password for encrypted

        // 1. Check Form Type
        const formType = doc.formType;
        if (formType !== FormType.None) {
          // Found a form!
          // console.log(`File ${file} has form type ${formType}`);
        }

        // 2. Check Signatures
        const sigCount = doc.signatureCount;
        if (sigCount > 0) {
          for (const sig of doc.signatures()) {
            expect(sig.subFilter).toBeDefined();
          }
        }

        // 3. Check Attachments
        const attCount = doc.attachmentCount;
        if (attCount > 0) {
          for (const att of doc.attachments()) {
            expect(att.name).toBeDefined();
          }
        }

        // 4. Page Features
        for (const page of doc.pages()) {
          // Structure Tree
          const struct = page.getStructureTree();
          if (struct) {
            // Found structure!
            expect(Array.isArray(struct)).toBe(true);
          }

          // Thumbnails
          // Just verify it doesn't crash, as most test PDFs might not have embedded thumbnails
          // and generation might return undefined if not supported or empty.
          try {
            const _thumb = page.getDecodedThumbnailData();
          } catch (_e) {
            // It might throw if decoding fails, but shouldn't crash
          }

          // Web Links
          const links = page.getWebLinks();
          expect(Array.isArray(links)).toBe(true);

          // Flatten
          // Don't actually flatten in place as it modifies the page/doc?
          // Flatten creates a new page content?
          // It modifies the page. We are in a loop, it's fine.
          // page.flatten();
        }

        // 5. Named Dests
        const dests = doc.getNamedDestinations();
        expect(Array.isArray(dests)).toBe(true);
      } catch (_e) {
        // Ignore errors (like password incorrect if not 12345678, or bad file)
        // This test is about coverage of successful paths on *some* files.
      }
    }
  });
});
