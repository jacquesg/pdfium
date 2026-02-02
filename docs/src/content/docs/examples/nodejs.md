---
title: Node.js Examples
description: Complete Node.js examples for @scaryterry/pdfium
---

This page provides complete, runnable Node.js examples.

## Using the Native Backend

For best performance, use the native backend:

```typescript
import { PDFium, NativePDFiumInstance } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function processWithNative() {
  // Prefer native backend (falls back to WASM if unavailable)
  const pdfium = await PDFium.init({ useNative: true });

  // Check which backend is being used
  const isNative = pdfium instanceof NativePDFiumInstance;
  console.log(`Backend: ${isNative ? 'Native' : 'WASM'}`);

  try {
    const data = await fs.readFile('document.pdf');

    if (isNative) {
      // Native API (synchronous document loading)
      using doc = pdfium.openDocument(data);
      for (const page of doc.pages()) {
        using p = page;
        console.log(p.getText());
      }
    } else {
      // WASM API (async document loading)
      using doc = await (pdfium as PDFium).openDocument(data);
      for (const page of doc.pages()) {
        using p = page;
        console.log(p.getText());
      }
    }
  } finally {
    pdfium.dispose();
  }
}

processWithNative();
```

**Note:** Install the platform package first:

```bash
pnpm add @scaryterry/pdfium-darwin-arm64  # macOS Apple Silicon
pnpm add @scaryterry/pdfium-linux-x64-gnu # Linux x64
```

## Basic Text Extraction

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function extractText(inputPath: string, outputPath: string) {
  const data = await fs.readFile(inputPath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  const texts: string[] = [];

  for (const page of document.pages()) {
    using p = page;
    texts.push(`--- Page ${p.index + 1} ---\n${p.getText()}`);
  }

  await fs.writeFile(outputPath, texts.join('\n\n'));
  console.log(`Extracted ${document.pageCount} pages to ${outputPath}`);
}

extractText('input.pdf', 'output.txt');
```

## Render All Pages to PNG

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';
import sharp from 'sharp';

async function renderAllPages(
  inputPath: string,
  outputDir: string,
  scale = 2
) {
  const data = await fs.readFile(inputPath);
  await fs.mkdir(outputDir, { recursive: true });

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  console.log(`Rendering ${document.pageCount} pages at ${scale}x scale...`);

  for (const page of document.pages()) {
    using p = page;

    const { data: pixels, width, height } = p.render({ scale });

    const png = await sharp(pixels, {
      raw: { width, height, channels: 4 },
    }).png().toBuffer();

    const outputPath = `${outputDir}/page-${String(p.index + 1).padStart(4, '0')}.png`;
    await fs.writeFile(outputPath, png);

    console.log(`  Page ${p.index + 1}: ${width}x${height}px`);
  }

  console.log('Done!');
}

renderAllPages('document.pdf', './output', 3);
```

## PDF Information Tool

```typescript
import { PDFium, PageRotation, PageObjectType, AnnotationType } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function pdfInfo(filePath: string) {
  const data = await fs.readFile(filePath);
  const stat = await fs.stat(filePath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  console.log('='.repeat(50));
  console.log(`PDF Information: ${filePath}`);
  console.log('='.repeat(50));
  console.log();
  console.log(`File size: ${(stat.size / 1024).toFixed(1)} KB`);
  console.log(`Pages: ${document.pageCount}`);
  console.log(`Attachments: ${document.attachmentCount}`);
  console.log(`Bookmarks: ${document.getBookmarks().length}`);
  console.log();

  let totalObjects = 0;
  let totalAnnotations = 0;
  let totalChars = 0;

  const objectCounts = new Map<PageObjectType, number>();
  const annotCounts = new Map<AnnotationType, number>();

  console.log('Page Details:');
  console.log('-'.repeat(50));

  for (const page of document.pages()) {
    using p = page;

    const text = p.getText();
    totalChars += text.length;
    totalObjects += p.objectCount;
    totalAnnotations += p.annotationCount;

    // Count object types
    for (const obj of p.getObjects()) {
      objectCounts.set(obj.type, (objectCounts.get(obj.type) || 0) + 1);
    }

    // Count annotation types
    for (const annot of p.getAnnotations()) {
      annotCounts.set(annot.type, (annotCounts.get(annot.type) || 0) + 1);
    }

    const rotation = PageRotation[p.rotation];
    console.log(
      `  Page ${String(p.index + 1).padStart(3)}: ` +
      `${p.width.toFixed(0)}×${p.height.toFixed(0)} pt, ` +
      `${rotation}, ` +
      `${text.length} chars, ` +
      `${p.objectCount} objs, ` +
      `${p.annotationCount} annots`
    );
  }

  console.log();
  console.log('Summary:');
  console.log('-'.repeat(50));
  console.log(`  Total characters: ${totalChars.toLocaleString()}`);
  console.log(`  Total objects: ${totalObjects.toLocaleString()}`);
  console.log(`  Total annotations: ${totalAnnotations.toLocaleString()}`);

  if (objectCounts.size > 0) {
    console.log();
    console.log('Object Types:');
    for (const [type, count] of objectCounts) {
      console.log(`  ${PageObjectType[type]}: ${count}`);
    }
  }

  if (annotCounts.size > 0) {
    console.log();
    console.log('Annotation Types:');
    for (const [type, count] of annotCounts) {
      console.log(`  ${AnnotationType[type]}: ${count}`);
    }
  }
}

pdfInfo('document.pdf');
```

## Search and Extract

```typescript
import { PDFium, TextSearchFlags } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

interface SearchResult {
  page: number;
  charIndex: number;
  context: string;
}

async function searchPDF(
  filePath: string,
  query: string,
  options: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    contextLength?: number;
  } = {}
): Promise<SearchResult[]> {
  const data = await fs.readFile(filePath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  let flags = TextSearchFlags.None;
  if (options.caseSensitive) flags |= TextSearchFlags.MatchCase;
  if (options.wholeWord) flags |= TextSearchFlags.MatchWholeWord;

  const contextLen = options.contextLength ?? 40;
  const results: SearchResult[] = [];

  for (const page of document.pages()) {
    using p = page;
    const text = p.getText();

    for (const match of p.findText(query, flags)) {
      const start = Math.max(0, match.charIndex - contextLen);
      const end = Math.min(text.length, match.charIndex + match.charCount + contextLen);

      let context = text.slice(start, end).replace(/\n/g, ' ');
      if (start > 0) context = '...' + context;
      if (end < text.length) context = context + '...';

      results.push({
        page: p.index + 1,
        charIndex: match.charIndex,
        context,
      });
    }
  }

  return results;
}

async function main() {
  const results = await searchPDF('document.pdf', 'invoice', {
    caseSensitive: false,
  });

  console.log(`Found ${results.length} occurrences:\n`);

  for (const result of results) {
    console.log(`Page ${result.page}, char ${result.charIndex}:`);
    console.log(`  "${result.context}"`);
    console.log();
  }
}

main();
```

## Extract Attachments

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';
import path from 'path';

async function extractAttachments(
  inputPath: string,
  outputDir: string
) {
  const data = await fs.readFile(inputPath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  if (document.attachmentCount === 0) {
    console.log('No attachments found.');
    return;
  }

  await fs.mkdir(outputDir, { recursive: true });

  console.log(`Extracting ${document.attachmentCount} attachments...`);

  for (const attachment of document.getAttachments()) {
    const safeName = path.basename(attachment.name)
      .replace(/[<>:"/\\|?*]/g, '_');

    const outputPath = path.join(outputDir, safeName);
    await fs.writeFile(outputPath, attachment.data);

    const size = attachment.data.byteLength;
    console.log(`  ${safeName} (${(size / 1024).toFixed(1)} KB)`);
  }

  console.log('Done!');
}

extractAttachments('document.pdf', './attachments');
```

## Create PDF Report

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

interface ReportData {
  title: string;
  date: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
}

async function createReport(data: ReportData, outputPath: string) {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const regular = builder.loadStandardFont('Helvetica');
  const bold = builder.loadStandardFont('Helvetica-Bold');
  const mono = builder.loadStandardFont('Courier');

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 72;

  {
    using page = builder.addPage({ width: pageWidth, height: pageHeight });

    // Header
    page.addRect(0, pageHeight - 100, pageWidth, 100, {
      fill: { r: 51, g: 102, b: 153, a: 255 },
    });

    page.addText(data.title, margin, pageHeight - 60, bold, 28);
    page.addText(data.date, margin, pageHeight - 85, regular, 12);

    // Content
    let y = pageHeight - 150;

    for (const section of data.sections) {
      // Heading
      page.addText(section.heading, margin, y, bold, 14);
      y -= 25;

      // Content (simple word wrap)
      const words = section.content.split(' ');
      let line = '';
      const maxWidth = pageWidth - 2 * margin;

      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const estimatedWidth = testLine.length * 6; // ~6pt per char at 12pt

        if (estimatedWidth > maxWidth) {
          page.addText(line, margin, y, regular, 12);
          y -= 18;
          line = word;
        } else {
          line = testLine;
        }
      }

      if (line) {
        page.addText(line, margin, y, regular, 12);
        y -= 30;
      }
    }

    // Footer
    page.addRect(margin, 36, pageWidth - 2 * margin, 1, {
      fill: { r: 200, g: 200, b: 200, a: 255 },
    });
    page.addText('Generated with @scaryterry/pdfium', margin, 20, regular, 8);

    page.finalize();
  }

  const bytes = builder.save({ version: 17 });
  await fs.writeFile(outputPath, bytes);

  console.log(`Report saved to ${outputPath}`);
}

// Usage
createReport({
  title: 'Monthly Report',
  date: '15 January 2024',
  sections: [
    {
      heading: 'Executive Summary',
      content: 'This report summarises the key activities and achievements for the month. Performance metrics exceeded targets across all departments.',
    },
    {
      heading: 'Key Metrics',
      content: 'Revenue increased by 15% compared to the previous month. Customer satisfaction scores remained high at 4.5 out of 5.',
    },
  ],
}, 'report.pdf');
```

## Batch Processing Script

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';
import path from 'path';

async function batchProcess(
  inputDir: string,
  outputDir: string,
  operation: 'text' | 'info' | 'render'
) {
  const files = await fs.readdir(inputDir);
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    console.log('No PDF files found.');
    return;
  }

  await fs.mkdir(outputDir, { recursive: true });

  using pdfium = await PDFium.init();

  console.log(`Processing ${pdfFiles.length} files...`);

  const results: Array<{ file: string; pages: number; success: boolean }> = [];

  for (const file of pdfFiles) {
    const inputPath = path.join(inputDir, file);
    const baseName = path.basename(file, '.pdf');

    try {
      const data = await fs.readFile(inputPath);
      using document = await pdfium.openDocument(data);

      switch (operation) {
        case 'text': {
          const texts: string[] = [];
          for (const page of document.pages()) {
            using p = page;
            texts.push(p.getText());
          }
          await fs.writeFile(
            path.join(outputDir, `${baseName}.txt`),
            texts.join('\n\n--- Page Break ---\n\n')
          );
          break;
        }

        case 'info': {
          const info = {
            file,
            pages: document.pageCount,
            attachments: document.attachmentCount,
            bookmarks: document.getBookmarks().length,
          };
          await fs.writeFile(
            path.join(outputDir, `${baseName}.json`),
            JSON.stringify(info, null, 2)
          );
          break;
        }

        case 'render': {
          using page = document.getPage(0);
          const result = page.render({ scale: 1 });

          // Would need sharp for actual PNG conversion
          await fs.writeFile(
            path.join(outputDir, `${baseName}.raw`),
            result.data
          );
          break;
        }
      }

      results.push({ file, pages: document.pageCount, success: true });
      console.log(`  ✓ ${file} (${document.pageCount} pages)`);
    } catch (error) {
      results.push({ file, pages: 0, success: false });
      console.log(`  ✗ ${file}: ${error}`);
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  console.log(`\nProcessed: ${successful}/${pdfFiles.length} files`);
}

// Usage
batchProcess('./pdfs', './output', 'text');
```

## See Also

- [Native vs WASM Backends](/pdfium/concepts/backends/) — Backend comparison
- [Native Troubleshooting](/pdfium/guides/native-troubleshooting/) — Common issues
- [Browser Examples](/pdfium/examples/browser/) — Client-side examples
- [Patterns](/pdfium/examples/patterns/) — Common patterns
- [Installation](/pdfium/installation/) — Setup guide
