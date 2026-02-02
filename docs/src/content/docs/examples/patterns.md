---
title: Common Patterns
description: Reusable patterns for working with PDFs
---

This page collects common patterns and recipes for working with the library.

## Error Handling Patterns

### Typed Error Handler

```typescript
import {
  PDFiumError,
  PDFiumErrorCode,
  DocumentError,
  PageError,
  RenderError,
} from '@scaryterry/pdfium';

interface ErrorResult {
  type: 'document' | 'page' | 'render' | 'unknown';
  code: number;
  message: string;
  recoverable: boolean;
}

function handlePDFiumError(error: unknown): ErrorResult {
  if (!(error instanceof PDFiumError)) {
    return {
      type: 'unknown',
      code: -1,
      message: String(error),
      recoverable: false,
    };
  }

  const recoverable = [
    PDFiumErrorCode.DOC_PASSWORD_REQUIRED,
    PDFiumErrorCode.DOC_PASSWORD_INCORRECT,
    PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE,
    PDFiumErrorCode.RENDER_INVALID_DIMENSIONS,
  ].includes(error.code);

  if (error instanceof DocumentError) {
    return { type: 'document', code: error.code, message: error.message, recoverable };
  }
  if (error instanceof PageError) {
    return { type: 'page', code: error.code, message: error.message, recoverable };
  }
  if (error instanceof RenderError) {
    return { type: 'render', code: error.code, message: error.message, recoverable };
  }

  return { type: 'unknown', code: error.code, message: error.message, recoverable };
}
```

### Password Retry Pattern

```typescript
async function openWithRetry(
  pdfium: PDFium,
  data: Uint8Array,
  getPassword: () => Promise<string | null>,
  maxAttempts = 3
): Promise<PDFiumDocument> {
  let password: string | undefined;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      return await pdfium.openDocument(data, { password });
    } catch (error) {
      if (!(error instanceof DocumentError)) throw error;

      if (error.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED ||
          error.code === PDFiumErrorCode.DOC_PASSWORD_INCORRECT) {
        password = (await getPassword()) ?? undefined;
        if (!password) throw new Error('Password required');
        attempts++;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max password attempts exceeded');
}
```

## Resource Management Patterns

### Safe Page Access

```typescript
function withPage<T>(
  document: PDFiumDocument,
  pageIndex: number,
  fn: (page: PDFiumPage) => T
): T {
  using page = document.getPage(pageIndex);
  return fn(page);
}

// Usage
const text = withPage(document, 0, (page) => page.getText());
const size = withPage(document, 0, (page) => page.size);
```

### Process All Pages

```typescript
async function processAllPages<T>(
  document: PDFiumDocument,
  fn: (page: PDFiumPage) => T | Promise<T>
): Promise<T[]> {
  const results: T[] = [];

  for (const page of document.pages()) {
    using p = page;
    results.push(await fn(p));
  }

  return results;
}

// Usage
const texts = await processAllPages(document, (page) => page.getText());
```

### Batched Processing

```typescript
async function processBatches<T>(
  document: PDFiumDocument,
  batchSize: number,
  fn: (page: PDFiumPage) => Promise<T>
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < document.pageCount; i += batchSize) {
    const batch: Promise<T>[] = [];

    for (let j = i; j < Math.min(i + batchSize, document.pageCount); j++) {
      const page = document.getPage(j);
      batch.push(
        fn(page).finally(() => page.dispose())
      );
    }

    results.push(...await Promise.all(batch));
  }

  return results;
}
```

## Rendering Patterns

### Render with Fallback Scale

```typescript
function renderWithFallback(
  page: PDFiumPage,
  preferredScale: number,
  minScale = 0.5
) {
  let scale = preferredScale;

  while (scale >= minScale) {
    try {
      return page.render({ scale });
    } catch (error) {
      if (error instanceof RenderError &&
          error.code === PDFiumErrorCode.RENDER_INVALID_DIMENSIONS) {
        scale *= 0.75;
        continue;
      }
      throw error;
    }
  }

  return page.render({ scale: minScale });
}
```

### Render to Target Width

```typescript
function renderToWidth(page: PDFiumPage, targetWidth: number) {
  const scale = targetWidth / page.width;
  return page.render({ scale });
}

function renderToFit(page: PDFiumPage, maxWidth: number, maxHeight: number) {
  const scaleX = maxWidth / page.width;
  const scaleY = maxHeight / page.height;
  const scale = Math.min(scaleX, scaleY);
  return page.render({ scale });
}
```

## Search Patterns

### Search with Context

```typescript
interface SearchMatch {
  pageIndex: number;
  charIndex: number;
  charCount: number;
  context: string;
  rects: TextRect[];
}

function searchWithContext(
  document: PDFiumDocument,
  query: string,
  contextChars = 50
): SearchMatch[] {
  const matches: SearchMatch[] = [];

  for (const page of document.pages()) {
    using p = page;
    const text = p.getText();

    for (const result of p.findText(query)) {
      const start = Math.max(0, result.charIndex - contextChars);
      const end = Math.min(text.length, result.charIndex + result.charCount + contextChars);

      matches.push({
        pageIndex: p.index,
        charIndex: result.charIndex,
        charCount: result.charCount,
        context: text.slice(start, end),
        rects: result.rects,
      });
    }
  }

  return matches;
}
```

### Find and Replace (in memory)

```typescript
interface Replacement {
  pageIndex: number;
  original: string;
  charIndex: number;
}

function findAllOccurrences(
  document: PDFiumDocument,
  searchText: string
): Replacement[] {
  const occurrences: Replacement[] = [];

  for (const page of document.pages()) {
    using p = page;

    for (const result of p.findText(searchText)) {
      occurrences.push({
        pageIndex: p.index,
        original: searchText,
        charIndex: result.charIndex,
      });
    }
  }

  return occurrences;
}
```

## Caching Patterns

### Page Cache

```typescript
class PageCache {
  private cache = new Map<string, { data: Uint8Array; width: number; height: number }>();
  private maxSize: number;

  constructor(maxSize = 10) {
    this.maxSize = maxSize;
  }

  private key(docId: string, pageIndex: number, scale: number): string {
    return `${docId}:${pageIndex}:${scale}`;
  }

  get(docId: string, pageIndex: number, scale: number) {
    return this.cache.get(this.key(docId, pageIndex, scale));
  }

  set(docId: string, pageIndex: number, scale: number, result: { data: Uint8Array; width: number; height: number }) {
    const key = this.key(docId, pageIndex, scale);

    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, result);
  }

  clear() {
    this.cache.clear();
  }
}
```

### Lazy Text Extractor

```typescript
class LazyTextExtractor {
  private texts = new Map<number, string>();

  constructor(private document: PDFiumDocument) {}

  getText(pageIndex: number): string {
    if (this.texts.has(pageIndex)) {
      return this.texts.get(pageIndex)!;
    }

    using page = this.document.getPage(pageIndex);
    const text = page.getText();
    this.texts.set(pageIndex, text);
    return text;
  }

  preloadAll(): void {
    for (const page of this.document.pages()) {
      using p = page;
      if (!this.texts.has(p.index)) {
        this.texts.set(p.index, p.getText());
      }
    }
  }
}
```

## Validation Patterns

### PDF Validator

```typescript
interface ValidationResult {
  valid: boolean;
  pageCount?: number;
  encrypted: boolean;
  error?: string;
}

async function validatePDF(
  pdfium: PDFium,
  data: Uint8Array
): Promise<ValidationResult> {
  try {
    using document = await pdfium.openDocument(data);

    // Check all pages are accessible
    for (const page of document.pages()) {
      using p = page;
      // Just accessing the page validates it
    }

    return {
      valid: true,
      pageCount: document.pageCount,
      encrypted: false,
    };
  } catch (error) {
    if (error instanceof DocumentError) {
      if (error.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {
        return { valid: true, encrypted: true };
      }
      return { valid: false, encrypted: false, error: error.message };
    }
    return { valid: false, encrypted: false, error: String(error) };
  }
}
```

## Progress Tracking

### Progress Reporter

```typescript
interface Progress {
  current: number;
  total: number;
  percentage: number;
  stage: string;
}

type ProgressCallback = (progress: Progress) => void;

async function processWithProgress(
  document: PDFiumDocument,
  onProgress: ProgressCallback
) {
  const total = document.pageCount;

  for (const page of document.pages()) {
    using p = page;

    onProgress({
      current: p.index + 1,
      total,
      percentage: Math.round(((p.index + 1) / total) * 100),
      stage: `Processing page ${p.index + 1}`,
    });

    // Process page...
    await new Promise(resolve => setTimeout(resolve, 10)); // Yield to event loop
  }
}
```

## Utility Functions

### Format Page Size

```typescript
function formatPageSize(page: PDFiumPage): string {
  const widthIn = (page.width / 72).toFixed(2);
  const heightIn = (page.height / 72).toFixed(2);
  const widthCm = (page.width * 0.0352778).toFixed(1);
  const heightCm = (page.height * 0.0352778).toFixed(1);

  return `${page.width}×${page.height} pt (${widthIn}"×${heightIn}" / ${widthCm}×${heightCm} cm)`;
}
```

### Safe Filename

```typescript
function sanitiseFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 255) || 'unnamed';
}
```

## See Also

- [Node.js Examples](/pdfium/examples/nodejs/) — Complete Node.js examples
- [Browser Examples](/pdfium/examples/browser/) — Browser examples
- [Error Handling](/pdfium/concepts/error-handling/) — Error patterns
