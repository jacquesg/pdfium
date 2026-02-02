---
title: Open Document
description: Loading PDF documents with various options
---

This guide covers all the ways to open and load PDF documents.

## Basic Loading

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

const data = await fs.readFile('document.pdf');

using pdfium = await PDFium.init();
using document = await pdfium.openDocument(data);

console.log(`Loaded ${document.pageCount} pages`);
```

## Input Types

### Uint8Array

```typescript
const uint8 = new Uint8Array(buffer);
using document = await pdfium.openDocument(uint8);
```

### ArrayBuffer

```typescript
const arrayBuffer = await file.arrayBuffer();
using document = await pdfium.openDocument(arrayBuffer);
```

### Node.js Buffer

```typescript
const buffer = await fs.readFile('document.pdf');
// Buffer is compatible with Uint8Array
using document = await pdfium.openDocument(buffer);
```

## Password-Protected PDFs

### Known Password

```typescript
using document = await pdfium.openDocument(data, {
  password: 'secret123',
});
```

### Prompt for Password

```typescript
import { DocumentError, PDFiumErrorCode } from '@scaryterry/pdfium';

async function openWithPasswordPrompt(
  pdfium: PDFium,
  data: Uint8Array
): Promise<PDFiumDocument> {
  let password: string | undefined;

  while (true) {
    try {
      return await pdfium.openDocument(data, { password });
    } catch (error) {
      if (!(error instanceof DocumentError)) throw error;

      if (error.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {
        password = await promptUser('Enter password:');
      } else if (error.code === PDFiumErrorCode.DOC_PASSWORD_INCORRECT) {
        password = await promptUser('Incorrect. Try again:');
      } else {
        throw error;
      }

      if (!password) {
        throw new Error('Password required');
      }
    }
  }
}
```

## Error Handling

```typescript
import {
  DocumentError,
  PDFiumErrorCode,
} from '@scaryterry/pdfium';

try {
  using document = await pdfium.openDocument(data);
} catch (error) {
  if (error instanceof DocumentError) {
    switch (error.code) {
      case PDFiumErrorCode.DOC_FORMAT_INVALID:
        console.error('Not a valid PDF file');
        break;
      case PDFiumErrorCode.DOC_PASSWORD_REQUIRED:
        console.error('Password required');
        break;
      case PDFiumErrorCode.DOC_PASSWORD_INCORRECT:
        console.error('Wrong password');
        break;
      case PDFiumErrorCode.DOC_SECURITY_UNSUPPORTED:
        console.error('Unsupported encryption');
        break;
      default:
        console.error(`Document error: ${error.message}`);
    }
  } else {
    throw error;
  }
}
```

## Loading from Different Sources

### Node.js File

```typescript
import { promises as fs } from 'fs';

const data = await fs.readFile('path/to/document.pdf');
using document = await pdfium.openDocument(data);
```

### Browser File Input

```typescript
async function handleFileInput(input: HTMLInputElement) {
  const file = input.files?.[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  using document = await pdfium.openDocument(data);
  // Use document...
}
```

### Fetch from URL

```typescript
const response = await fetch('https://example.com/document.pdf');
const data = await response.arrayBuffer();
using document = await pdfium.openDocument(data);
```

### Base64 Encoded

```typescript
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const data = base64ToUint8Array(base64String);
using document = await pdfium.openDocument(data);
```

## Document Information

After opening:

```typescript
using document = await pdfium.openDocument(data);

console.log(`Pages: ${document.pageCount}`);
console.log(`Attachments: ${document.attachmentCount}`);

// Check for bookmarks
const bookmarks = document.getBookmarks();
console.log(`Bookmarks: ${bookmarks.length}`);
```

## Resource Limits

Configure limits when initialising PDFium:

```typescript
const pdfium = await PDFium.init({
  limits: {
    maxDocumentSize: 50 * 1024 * 1024, // 50 MB max
  },
});

// Loading a larger file will throw MemoryError
try {
  using document = await pdfium.openDocument(hugeFile);
} catch (error) {
  if (error instanceof MemoryError) {
    console.error('File too large');
  }
}
```

## Validation Pattern

```typescript
interface ValidationResult {
  valid: boolean;
  pageCount?: number;
  encrypted?: boolean;
  error?: string;
}

async function validatePDF(
  pdfium: PDFium,
  data: Uint8Array
): Promise<ValidationResult> {
  try {
    using document = await pdfium.openDocument(data);
    return {
      valid: true,
      pageCount: document.pageCount,
      encrypted: false,
    };
  } catch (error) {
    if (error instanceof DocumentError) {
      if (error.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {
        return {
          valid: true,
          encrypted: true,
        };
      }
      return {
        valid: false,
        error: error.message,
      };
    }
    throw error;
  }
}
```

## Complete Example

```typescript
import { PDFium, DocumentError, PDFiumErrorCode } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function loadPDF(filePath: string, password?: string) {
  // Read file
  const data = await fs.readFile(filePath);

  // Initialise library
  using pdfium = await PDFium.init({
    limits: {
      maxDocumentSize: 100 * 1024 * 1024,
    },
  });

  // Attempt to open
  try {
    using document = await pdfium.openDocument(data, { password });

    console.log(`Loaded: ${filePath}`);
    console.log(`Pages: ${document.pageCount}`);

    // Process document...
    for (const page of document.pages()) {
      using p = page;
      console.log(`Page ${p.index + 1}: ${p.width} x ${p.height} points`);
    }

    return true;
  } catch (error) {
    if (error instanceof DocumentError) {
      switch (error.code) {
        case PDFiumErrorCode.DOC_FORMAT_INVALID:
          console.error(`Invalid PDF: ${filePath}`);
          break;
        case PDFiumErrorCode.DOC_PASSWORD_REQUIRED:
          console.error('Password required. Use --password option.');
          break;
        case PDFiumErrorCode.DOC_PASSWORD_INCORRECT:
          console.error('Incorrect password.');
          break;
        default:
          console.error(`Error: ${error.message}`);
      }
      return false;
    }
    throw error;
  }
}

// Usage
loadPDF('document.pdf');
loadPDF('encrypted.pdf', 'secret123');
```

## See Also

- [PDFium](/pdfium/api/classes/pdfium/) — openDocument API
- [PDFiumDocument](/pdfium/api/classes/pdfium-document/) — Document API
- [Error Handling](/pdfium/concepts/error-handling/) — Error patterns
- [Progressive Loading](/pdfium/guides/progressive-loading/) — Streaming large PDFs
