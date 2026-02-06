---
title: Iterate Pages
description: Patterns for processing multiple pages
---

This guide covers different patterns for iterating through document pages.

## Generator Pattern

The `pages()` method returns a generator:

```typescript
for (const page of document.pages()) {
  using p = page;
  console.log(`Page ${p.index}: ${p.width} × ${p.height}`);
}
```

:::tip
Always use `using` inside the loop to ensure each page is disposed after processing.
:::

## Index Pattern

Access pages by index:

```typescript
for (let i = 0; i < document.pageCount; i++) {
  using page = document.getPage(i);
  console.log(`Page ${i + 1}: ${page.getText().slice(0, 100)}`);
}
```

## Process Specific Pages

### Page Range

```typescript
function processPageRange(
  document: PDFiumDocument,
  start: number,
  end: number
) {
  for (let i = start; i <= end && i < document.pageCount; i++) {
    using page = document.getPage(i);
    // Process page...
  }
}

// Process pages 5-10 (indices 4-9)
processPageRange(document, 4, 9);
```

### Selected Pages

```typescript
function processSelectedPages(
  document: PDFiumDocument,
  indices: number[]
) {
  for (const i of indices) {
    if (i >= 0 && i < document.pageCount) {
      using page = document.getPage(i);
      // Process page...
    }
  }
}

// Process pages 1, 5, 10 (indices 0, 4, 9)
processSelectedPages(document, [0, 4, 9]);
```

### Every Nth Page

```typescript
function processEveryNthPage(
  document: PDFiumDocument,
  n: number
) {
  for (let i = 0; i < document.pageCount; i += n) {
    using page = document.getPage(i);
    // Process page...
  }
}

// Process every 5th page
processEveryNthPage(document, 5);
```

### Odd/Even Pages

```typescript
function processOddPages(document: PDFiumDocument) {
  for (let i = 0; i < document.pageCount; i += 2) {
    using page = document.getPage(i);
    // Process odd page (1, 3, 5, ...)
  }
}

function processEvenPages(document: PDFiumDocument) {
  for (let i = 1; i < document.pageCount; i += 2) {
    using page = document.getPage(i);
    // Process even page (2, 4, 6, ...)
  }
}
```

## Collecting Results

### Array of Results

```typescript
function extractAllText(document: PDFiumDocument): string[] {
  const texts: string[] = [];

  for (const page of document.pages()) {
    using p = page;
    texts.push(p.getText());
  }

  return texts;
}
```

### Map of Results

```typescript
interface PageResult {
  text: string;
  width: number;
  height: number;
}

function processAllPages(
  document: PDFiumDocument
): Map<number, PageResult> {
  const results = new Map<number, PageResult>();

  for (const page of document.pages()) {
    using p = page;
    results.set(p.index, {
      text: p.getText(),
      width: p.width,
      height: p.height,
    });
  }

  return results;
}
```

## Early Exit

### Find First Match

```typescript
function findPageWithText(
  document: PDFiumDocument,
  searchText: string
): number | null {
  for (const page of document.pages()) {
    using p = page;

    for (const _ of p.findText(searchText)) {
      return p.index; // Found, return immediately
    }
  }

  return null; // Not found
}
```

### Process Until Condition

```typescript
function processUntilError(document: PDFiumDocument): number {
  let processed = 0;

  for (const page of document.pages()) {
    using p = page;

    try {
      const text = p.getText();
      if (text.includes('STOP')) {
        break;
      }
      processed++;
    } catch {
      break;
    }
  }

  return processed;
}
```

## Async Processing

### Sequential with Async Operations

```typescript
async function renderAllPages(
  document: PDFiumDocument,
  outputDir: string
) {
  for (const page of document.pages()) {
    using p = page;

    const { data, width, height } = p.render({ scale: 2 });

    // Async save operation
    await saveImage(data, width, height, `${outputDir}/page-${p.index}.png`);
  }
}
```

### Limited Concurrency

```typescript
async function processWithConcurrency(
  document: PDFiumDocument,
  concurrency: number
) {
  const results: string[] = [];
  const indices = Array.from({ length: document.pageCount }, (_, i) => i);

  // Process in batches
  for (let i = 0; i < indices.length; i += concurrency) {
    const batch = indices.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (index) => {
        using page = document.getPage(index);
        return page.getText();
      })
    );

    results.push(...batchResults);
  }

  return results;
}
```

## Progress Tracking

```typescript
interface Progress {
  current: number;
  total: number;
  percentage: number;
}

async function processWithProgress(
  document: PDFiumDocument,
  onProgress: (progress: Progress) => void
) {
  const total = document.pageCount;

  for (const page of document.pages()) {
    using p = page;

    // Process page...
    const text = p.getText();

    onProgress({
      current: p.index + 1,
      total,
      percentage: Math.round(((p.index + 1) / total) * 100),
    });
  }
}

// Usage
await processWithProgress(document, (progress) => {
  console.log(`Processing: ${progress.percentage}%`);
});
```

## Reverse Order

```typescript
function processInReverse(document: PDFiumDocument) {
  for (let i = document.pageCount - 1; i >= 0; i--) {
    using page = document.getPage(i);
    // Process page...
  }
}
```

## Complete Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';
import sharp from 'sharp';

async function processPDF(inputPath: string, outputDir: string) {
  const data = await fs.readFile(inputPath);
  await fs.mkdir(outputDir, { recursive: true });

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  console.log(`Processing ${document.pageCount} pages...`);

  const results: Array<{ index: number; chars: number }> = [];

  for (const page of document.pages()) {
    using p = page;

    // Extract text
    const text = p.getText();
    results.push({ index: p.index, chars: text.length });

    // Render to image
    const { data: pixels, width, height } = p.render({ scale: 2 });

    const png = await sharp(pixels, {
      raw: { width, height, channels: 4 },
    }).png().toBuffer();

    await fs.writeFile(`${outputDir}/page-${p.index + 1}.png`, png);

    console.log(`Page ${p.index + 1}: ${text.length} chars`);
  }

  // Summary
  const totalChars = results.reduce((sum, r) => sum + r.chars, 0);
  console.log(`\nTotal characters: ${totalChars}`);
}

processPDF('document.pdf', './output');
```

## See Also

- [PDFiumDocument](/pdfium/api/classes/pdfiumdocument/) — pages() method
- [Resource Management](/pdfium/concepts/resource-management/) — Disposal patterns
- [Performance](/pdfium/concepts/performance/) — Optimisation tips
