---
title: Error Reference
description: Complete reference for PDFium error codes and error classes
---

The `@scaryterry/pdfium` library uses a structured error system with specific error codes and specialised error classes. This enables precise error handling and debugging.

## Error Hierarchy

All errors extend the base `PDFiumError` class:

```typescript
import {
  PDFiumError,
  InitialisationError,
  DocumentError,
  PageError,
  RenderError,
  MemoryError,
  TextError,
  ObjectError,
  WorkerError,
} from '@scaryterry/pdfium';
```

### PDFiumError (Base Class)

All library errors extend this class.

| Property | Type | Description |
|----------|------|-------------|
| `code` | `PDFiumErrorCode` | Numeric error code |
| `message` | `string` | Human-readable message |
| `context` | `Record<string, unknown>` | Additional context |

```typescript
try {
  using document = await pdfium.openDocument(data);
} catch (error) {
  if (error instanceof PDFiumError) {
    console.error(`Error ${error.code}: ${error.message}`);
    console.error('Context:', error.context);
  }
}
```

## Error Classes

### InitialisationError

Thrown when WASM or library initialisation fails.

**Error Codes:** 100-102

```typescript
try {
  using pdfium = await PDFium.init({ wasmUrl: '/invalid.wasm' });
} catch (error) {
  if (error instanceof InitialisationError) {
    console.error('Failed to initialise PDFium:', error.message);
  }
}
```

---

### DocumentError

Thrown for document loading, access, and save operations.

**Error Codes:** 200-208

```typescript
try {
  using document = await pdfium.openDocument(data, { password: 'wrong' });
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

---

### PageError

Thrown for page access and loading issues.

**Error Codes:** 300-303

```typescript
try {
  using page = document.getPage(999);
} catch (error) {
  if (error instanceof PageError) {
    if (error.code === PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE) {
      console.error('Page does not exist');
    }
  }
}
```

---

### RenderError

Thrown when page rendering fails.

**Error Codes:** 400-402

```typescript
try {
  const result = page.render({ width: 100000, height: 100000 });
} catch (error) {
  if (error instanceof RenderError) {
    if (error.code === PDFiumErrorCode.RENDER_INVALID_DIMENSIONS) {
      console.error('Dimensions exceed limit');
    }
  }
}
```

---

### MemoryError

Thrown for WASM memory allocation failures.

**Error Codes:** 500-502

```typescript
try {
  using document = await pdfium.openDocument(hugeBuffer);
} catch (error) {
  if (error instanceof MemoryError) {
    console.error('Memory allocation failed:', error.message);
  }
}
```

---

### TextError

Thrown when text extraction operations fail.

**Error Codes:** 600-602

```typescript
try {
  const text = page.getText();
} catch (error) {
  if (error instanceof TextError) {
    console.error('Text extraction failed:', error.message);
  }
}
```

---

### ObjectError

Thrown for page object and annotation access errors.

**Error Codes:** 700-751

```typescript
try {
  const annot = page.getAnnotation(999);
} catch (error) {
  if (error instanceof ObjectError) {
    if (error.code === PDFiumErrorCode.ANNOT_INDEX_OUT_OF_RANGE) {
      console.error('Annotation does not exist');
    }
  }
}
```

---

### WorkerError

Thrown for worker communication and timeout issues.

**Error Codes:** 800-803

```typescript
try {
  using proxy = await WorkerProxy.create(workerUrl, wasmBinary, { timeout: 5000 });
} catch (error) {
  if (error instanceof WorkerError) {
    if (error.code === PDFiumErrorCode.WORKER_TIMEOUT) {
      console.error('Worker operation timed out');
    }
  }
}
```

## Error Codes

### Initialisation Errors (1xx)

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 100 | `INIT_WASM_LOAD_FAILED` | Failed to load WASM binary | Check WASM URL/path; verify file exists |
| 101 | `INIT_LIBRARY_FAILED` | PDFium library init failed | Check WASM binary integrity |
| 102 | `INIT_INVALID_OPTIONS` | Invalid initialisation options | Validate options against `PDFiumInitOptions` |

---

### Document Errors (2xx)

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 200 | `DOC_FILE_NOT_FOUND` | File not found | Verify file path |
| 201 | `DOC_FORMAT_INVALID` | Invalid PDF format | Verify file is valid PDF |
| 202 | `DOC_PASSWORD_REQUIRED` | Document is encrypted | Provide password in options |
| 203 | `DOC_PASSWORD_INCORRECT` | Wrong password | Verify password |
| 204 | `DOC_SECURITY_UNSUPPORTED` | Unsupported security handler | Document uses proprietary DRM |
| 205 | `DOC_ALREADY_CLOSED` | Document already closed | Don't use disposed documents |
| 206 | `DOC_LOAD_UNKNOWN` | Unknown load error | Check PDF validity |
| 207 | `DOC_SAVE_FAILED` | Failed to save document | Check save options; verify disk space |
| 208 | `DOC_CREATE_FAILED` | Failed to create document | Check memory availability |

---

### Page Errors (3xx)

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 300 | `PAGE_NOT_FOUND` | Page not found | Verify page exists |
| 301 | `PAGE_LOAD_FAILED` | Failed to load page | PDF may be corrupted |
| 302 | `PAGE_ALREADY_CLOSED` | Page already closed | Don't use disposed pages |
| 303 | `PAGE_INDEX_OUT_OF_RANGE` | Page index out of range | Use index 0 to pageCount-1 |

---

### Render Errors (4xx)

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 400 | `RENDER_BITMAP_FAILED` | Failed to create bitmap | Check memory; reduce dimensions |
| 401 | `RENDER_INVALID_DIMENSIONS` | Dimensions exceed limit | Reduce scale/dimensions or increase `maxRenderDimension` |
| 402 | `RENDER_FAILED` | Rendering failed | Check page validity |

---

### Memory Errors (5xx)

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 500 | `MEMORY_ALLOCATION_FAILED` | WASM allocation failed | Reduce document size; close unused resources |
| 501 | `MEMORY_BUFFER_OVERFLOW` | Buffer overflow | Document too large; increase `maxDocumentSize` |
| 502 | `MEMORY_INVALID_POINTER` | Invalid memory pointer | Internal error; report bug |

---

### Text Errors (6xx)

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 600 | `TEXT_EXTRACTION_FAILED` | Text extraction failed | Page may lack text content |
| 601 | `TEXT_PAGE_FAILED` | Failed to load text page | Check page validity |
| 602 | `TEXT_LOAD_FAILED` | Failed to load text | Internal error |

---

### Object/Annotation Errors (7xx)

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 700 | `OBJECT_TYPE_UNKNOWN` | Unknown object type | Object type not supported |
| 701 | `OBJECT_ACCESS_FAILED` | Failed to access object | Check object index |
| 750 | `ANNOT_INDEX_OUT_OF_RANGE` | Annotation index out of range | Use index 0 to annotationCount-1 |
| 751 | `ANNOT_LOAD_FAILED` | Failed to load annotation | Annotation may be malformed |

---

### Worker Errors (8xx)

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 800 | `WORKER_CREATE_FAILED` | Failed to create worker | Check worker URL |
| 801 | `WORKER_COMMUNICATION_FAILED` | Worker communication failed | Worker may have crashed |
| 802 | `WORKER_TIMEOUT` | Worker operation timed out | Increase timeout or reduce work |
| 803 | `WORKER_RESOURCE_LIMIT` | Worker resource limit reached | Close unused resources |

---

### Resource Errors (9xx)

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 900 | `RESOURCE_DISPOSED` | Resource already disposed | Don't use after `dispose()` |

## Error Handling Patterns

### Basic Try-Catch

```typescript
try {
  using document = await pdfium.openDocument(data);
  using page = document.getPage(0);
  const text = page.getText();
} catch (error) {
  if (error instanceof PDFiumError) {
    console.error(`PDFium error ${error.code}: ${error.message}`);
  } else {
    throw error; // Re-throw non-PDFium errors
  }
}
```

### Handling Specific Error Types

```typescript
import {
  PDFiumError,
  PDFiumErrorCode,
  DocumentError,
  RenderError,
} from '@scaryterry/pdfium';

async function loadAndRender(data: Uint8Array, password?: string) {
  try {
    using document = await pdfium.openDocument(data, { password });
    using page = document.getPage(0);
    return page.render({ scale: 2 });
  } catch (error) {
    if (error instanceof DocumentError) {
      switch (error.code) {
        case PDFiumErrorCode.DOC_PASSWORD_REQUIRED:
          throw new Error('This PDF requires a password');
        case PDFiumErrorCode.DOC_PASSWORD_INCORRECT:
          throw new Error('Incorrect password');
        case PDFiumErrorCode.DOC_FORMAT_INVALID:
          throw new Error('This file is not a valid PDF');
        default:
          throw new Error(`Document error: ${error.message}`);
      }
    }
    if (error instanceof RenderError) {
      if (error.code === PDFiumErrorCode.RENDER_INVALID_DIMENSIONS) {
        throw new Error('Image dimensions too large');
      }
    }
    throw error;
  }
}
```

### Password Retry Loop

```typescript
async function openWithPasswordPrompt(data: Uint8Array): Promise<PDFiumDocument> {
  let password: string | undefined;

  while (true) {
    try {
      return await pdfium.openDocument(data, { password });
    } catch (error) {
      if (error instanceof DocumentError) {
        if (error.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED ||
            error.code === PDFiumErrorCode.DOC_PASSWORD_INCORRECT) {
          password = await promptForPassword(); // Your UI function
          if (!password) {
            throw new Error('Password entry cancelled');
          }
          continue;
        }
      }
      throw error;
    }
  }
}
```

### Graceful Degradation

```typescript
async function extractTextSafely(page: PDFiumPage): Promise<string | null> {
  try {
    return page.getText();
  } catch (error) {
    if (error instanceof TextError) {
      console.warn(`Text extraction failed for page ${page.index}: ${error.message}`);
      return null;
    }
    throw error;
  }
}
```

## Getting Error Messages

Use `getErrorMessage()` to get human-readable messages:

```typescript
import { getErrorMessage, PDFiumErrorCode } from '@scaryterry/pdfium';

const message = getErrorMessage(PDFiumErrorCode.DOC_PASSWORD_REQUIRED);
// "Document requires a password"
```

## See Also

- [Error Handling Concept](/pdfium/concepts/error-handling/) — Understanding error patterns
- [PDFium Class](/pdfium/api/classes/pdfium/) — Main API entry point
- [Examples](/pdfium/examples/patterns/) — Error handling examples
