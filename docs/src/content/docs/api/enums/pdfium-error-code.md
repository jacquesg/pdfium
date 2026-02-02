---
title: PDFiumErrorCode
description: Error codes for all PDFium operations
---

Numeric error codes used by all `PDFiumError` instances.

## Import

```typescript
import { PDFiumErrorCode } from '@scaryterry/pdfium';
```

## Initialisation Errors (1xx)

| Code | Member | Description |
|------|--------|-------------|
| 100 | `INIT_WASM_LOAD_FAILED` | Failed to load WASM binary |
| 101 | `INIT_LIBRARY_FAILED` | PDFium library initialisation failed |
| 102 | `INIT_INVALID_OPTIONS` | Invalid initialisation options |

## Document Errors (2xx)

| Code | Member | Description |
|------|--------|-------------|
| 200 | `DOC_FILE_NOT_FOUND` | File not found |
| 201 | `DOC_FORMAT_INVALID` | Invalid PDF format |
| 202 | `DOC_PASSWORD_REQUIRED` | Document requires password |
| 203 | `DOC_PASSWORD_INCORRECT` | Incorrect password |
| 204 | `DOC_SECURITY_UNSUPPORTED` | Unsupported security handler |
| 205 | `DOC_ALREADY_CLOSED` | Document already closed |
| 206 | `DOC_LOAD_UNKNOWN` | Unknown load error |
| 207 | `DOC_SAVE_FAILED` | Failed to save document |
| 208 | `DOC_CREATE_FAILED` | Failed to create document |

## Page Errors (3xx)

| Code | Member | Description |
|------|--------|-------------|
| 300 | `PAGE_NOT_FOUND` | Page not found |
| 301 | `PAGE_LOAD_FAILED` | Failed to load page |
| 302 | `PAGE_ALREADY_CLOSED` | Page already closed |
| 303 | `PAGE_INDEX_OUT_OF_RANGE` | Page index out of range |

## Render Errors (4xx)

| Code | Member | Description |
|------|--------|-------------|
| 400 | `RENDER_BITMAP_FAILED` | Failed to create bitmap |
| 401 | `RENDER_INVALID_DIMENSIONS` | Dimensions exceed limit |
| 402 | `RENDER_FAILED` | Rendering failed |

## Memory Errors (5xx)

| Code | Member | Description |
|------|--------|-------------|
| 500 | `MEMORY_ALLOCATION_FAILED` | WASM allocation failed |
| 501 | `MEMORY_BUFFER_OVERFLOW` | Buffer overflow |
| 502 | `MEMORY_INVALID_POINTER` | Invalid memory pointer |

## Text Errors (6xx)

| Code | Member | Description |
|------|--------|-------------|
| 600 | `TEXT_EXTRACTION_FAILED` | Text extraction failed |
| 601 | `TEXT_PAGE_FAILED` | Failed to load text page |
| 602 | `TEXT_LOAD_FAILED` | Failed to load text |

## Object/Annotation Errors (7xx)

| Code | Member | Description |
|------|--------|-------------|
| 700 | `OBJECT_TYPE_UNKNOWN` | Unknown object type |
| 701 | `OBJECT_ACCESS_FAILED` | Failed to access object |
| 750 | `ANNOT_INDEX_OUT_OF_RANGE` | Annotation index out of range |
| 751 | `ANNOT_LOAD_FAILED` | Failed to load annotation |

## Worker Errors (8xx)

| Code | Member | Description |
|------|--------|-------------|
| 800 | `WORKER_CREATE_FAILED` | Failed to create worker |
| 801 | `WORKER_COMMUNICATION_FAILED` | Worker communication failed |
| 802 | `WORKER_TIMEOUT` | Worker operation timed out |
| 803 | `WORKER_RESOURCE_LIMIT` | Worker resource limit reached |

## Resource Errors (9xx)

| Code | Member | Description |
|------|--------|-------------|
| 900 | `RESOURCE_DISPOSED` | Resource already disposed |

## Usage

### Check Specific Error

```typescript
import { PDFiumError, PDFiumErrorCode, DocumentError } from '@scaryterry/pdfium';

try {
  using document = await pdfium.openDocument(data);
} catch (error) {
  if (error instanceof DocumentError) {
    switch (error.code) {
      case PDFiumErrorCode.DOC_PASSWORD_REQUIRED:
        console.error('Password required');
        break;
      case PDFiumErrorCode.DOC_PASSWORD_INCORRECT:
        console.error('Wrong password');
        break;
      case PDFiumErrorCode.DOC_FORMAT_INVALID:
        console.error('Invalid PDF');
        break;
    }
  }
}
```

### Error Code Categories

```typescript
function getErrorCategory(code: PDFiumErrorCode): string {
  if (code >= 100 && code < 200) return 'Initialisation';
  if (code >= 200 && code < 300) return 'Document';
  if (code >= 300 && code < 400) return 'Page';
  if (code >= 400 && code < 500) return 'Render';
  if (code >= 500 && code < 600) return 'Memory';
  if (code >= 600 && code < 700) return 'Text';
  if (code >= 700 && code < 800) return 'Object';
  if (code >= 800 && code < 900) return 'Worker';
  if (code >= 900) return 'Resource';
  return 'Unknown';
}
```

## See Also

- [Error Reference](/pdfium/errors/) — Complete error documentation
- [Error Handling](/pdfium/concepts/error-handling/) — Error handling patterns
