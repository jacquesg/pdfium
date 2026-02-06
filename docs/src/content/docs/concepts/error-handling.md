---
title: Error Handling
description: Understanding error patterns and recovery strategies in @scaryterry/pdfium
---

The library uses a structured error system with specific error codes and specialised error classes. This guide explains how to handle errors effectively.

## Error Philosophy

The library follows these principles:

1. **Fail fast**: Errors are thrown immediately when detected
2. **Be specific**: Each error has a unique code and descriptive message
3. **Provide context**: Errors include relevant details for debugging
4. **Enable recovery**: Error types indicate whether recovery is possible

## Error Hierarchy

All library errors extend `PDFiumError`:

```typescript
import {
  PDFiumError,
  InitialisationError,
  NetworkError,        // extends InitialisationError
  DocumentError,
  PermissionsError,    // extends DocumentError
  PageError,
  RenderError,
  MemoryError,
  TextError,
  ObjectError,
  WorkerError,
} from '@scaryterry/pdfium';
```

```
PDFiumError (base)
├── InitialisationError  — WASM/library init failures
│   └── NetworkError     — Network fetch failures (e.g. WASM URL unreachable)
├── DocumentError        — Document loading/saving
│   └── PermissionsError — Document permission restrictions
├── PageError            — Page access issues
├── RenderError          — Rendering failures
├── MemoryError          — WASM memory issues
├── TextError            — Text extraction failures
├── ObjectError          — Page object/annotation access
└── WorkerError          — Worker communication
```

## Error Properties

All `PDFiumError` instances have:

```typescript
interface PDFiumError {
  code: PDFiumErrorCode;     // Numeric error code
  message: string;            // Human-readable description
  context?: Record<string, unknown>; // Additional details
  name: string;               // Error class name
}
```

Example:

```typescript
try {
  using document = await pdfium.openDocument(corruptedData);
} catch (error) {
  if (error instanceof PDFiumError) {
    console.log(error.code);    // 201
    console.log(error.message); // "Invalid PDF format"
    console.log(error.name);    // "DocumentError"
    console.log(error.context); // { fileSize: 12345 }
  }
}
```

## Basic Error Handling

### Catch All PDFium Errors

```typescript
try {
  using pdfium = await PDFium.init();
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

### Handle Specific Error Types

```typescript
try {
  using document = await pdfium.openDocument(data);
} catch (error) {
  if (error instanceof DocumentError) {
    // Document-specific handling
  } else if (error instanceof InitialisationError) {
    // Init-specific handling
  } else if (error instanceof PDFiumError) {
    // Generic PDFium error
  } else {
    throw error;
  }
}
```

### Handle Specific Error Codes

```typescript
import { PDFiumErrorCode, DocumentError } from '@scaryterry/pdfium';

try {
  using document = await pdfium.openDocument(data);
} catch (error) {
  if (error instanceof DocumentError) {
    switch (error.code) {
      case PDFiumErrorCode.DOC_PASSWORD_REQUIRED:
        // Prompt user for password
        break;
      case PDFiumErrorCode.DOC_PASSWORD_INCORRECT:
        // Show "wrong password" message
        break;
      case PDFiumErrorCode.DOC_FORMAT_INVALID:
        // File is not a valid PDF
        break;
      default:
        // Other document errors
        throw error;
    }
  }
}
```

## Common Error Scenarios

### Password-Protected PDFs

```typescript
import { PDFiumErrorCode, DocumentError } from '@scaryterry/pdfium';

async function openWithPassword(
  pdfium: PDFium,
  data: Uint8Array,
  maxAttempts = 3
): Promise<PDFiumDocument> {
  let password: string | undefined;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      return await pdfium.openDocument(data, { password });
    } catch (error) {
      if (!(error instanceof DocumentError)) throw error;

      if (error.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {
        password = await promptPassword('Enter PDF password:');
        attempts++;
      } else if (error.code === PDFiumErrorCode.DOC_PASSWORD_INCORRECT) {
        password = await promptPassword('Incorrect password. Try again:');
        attempts++;
      } else {
        throw error;
      }
    }
  }

  throw new Error('Maximum password attempts exceeded');
}
```

### Invalid PDF Files

```typescript
import { PDFiumErrorCode, DocumentError } from '@scaryterry/pdfium';

async function loadPDFSafely(
  pdfium: PDFium,
  data: Uint8Array
): Promise<PDFiumDocument | null> {
  try {
    return await pdfium.openDocument(data);
  } catch (error) {
    if (error instanceof DocumentError) {
      if (error.code === PDFiumErrorCode.DOC_FORMAT_INVALID) {
        console.error('File is not a valid PDF');
        return null;
      }
    }
    throw error;
  }
}
```

### Render Dimension Limits

```typescript
import { PDFiumErrorCode, RenderError } from '@scaryterry/pdfium';

function renderWithFallback(page: PDFiumPage, scale: number) {
  try {
    return page.render({ scale });
  } catch (error) {
    if (error instanceof RenderError) {
      if (error.code === PDFiumErrorCode.RENDER_INVALID_DIMENSIONS) {
        // Try with lower scale
        console.warn(`Scale ${scale} too large, falling back to 1`);
        return page.render({ scale: 1 });
      }
    }
    throw error;
  }
}
```

### Resource Disposal Errors

```typescript
import { PDFiumErrorCode, PDFiumError } from '@scaryterry/pdfium';

function safelyAccessPage(document: PDFiumDocument, index: number) {
  try {
    return document.getPage(index);
  } catch (error) {
    if (error instanceof PDFiumError) {
      if (error.code === PDFiumErrorCode.RESOURCE_DISPOSED) {
        throw new Error('Document has been closed');
      }
    }
    throw error;
  }
}
```

## Error Recovery Strategies

### Recoverable vs Non-Recoverable

| Error Type | Recoverable? | Strategy |
|------------|--------------|----------|
| `DOC_PASSWORD_REQUIRED` | Yes | Prompt for password |
| `DOC_PASSWORD_INCORRECT` | Yes | Prompt again |
| `DOC_FORMAT_INVALID` | No | Reject file |
| `PAGE_INDEX_OUT_OF_RANGE` | Yes | Validate index |
| `RENDER_INVALID_DIMENSIONS` | Yes | Reduce scale |
| `MEMORY_ALLOCATION_FAILED` | Maybe | Free resources, retry |
| `WORKER_TIMEOUT` | Yes | Increase timeout, retry |
| `RESOURCE_DISPOSED` | No | Logic error, fix code |

### Graceful Degradation

```typescript
async function extractText(page: PDFiumPage): Promise<string | null> {
  try {
    return page.getText();
  } catch (error) {
    if (error instanceof TextError) {
      console.warn('Text extraction failed:', error.message);
      return null; // Graceful degradation
    }
    throw error;
  }
}

// Usage
const text = await extractText(page);
if (text === null) {
  console.log('Text extraction unavailable for this page');
}
```

### Retry with Exponential Backoff

```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Only retry on specific errors
      if (error instanceof WorkerError) {
        const delay = Math.pow(2, i) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error; // Don't retry other errors
    }
  }

  throw lastError;
}
```

## Error Logging

### Structured Logging

```typescript
import { PDFiumError } from '@scaryterry/pdfium';

function logError(error: unknown, context: Record<string, unknown> = {}) {
  if (error instanceof PDFiumError) {
    console.error({
      type: 'PDFiumError',
      errorName: error.name,
      errorCode: error.code,
      message: error.message,
      context: {
        ...error.context,
        ...context,
      },
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    console.error({
      type: 'Error',
      message: error.message,
      context,
      stack: error.stack,
    });
  } else {
    console.error({
      type: 'Unknown',
      value: error,
      context,
    });
  }
}

// Usage
try {
  using document = await pdfium.openDocument(data);
} catch (error) {
  logError(error, { fileName: 'input.pdf', fileSize: data.length });
}
```

### Error Reporting

```typescript
interface ErrorReport {
  code: number;
  type: string;
  message: string;
  recoverable: boolean;
  userMessage: string;
}

function createErrorReport(error: unknown): ErrorReport {
  if (!(error instanceof PDFiumError)) {
    return {
      code: -1,
      type: 'Unknown',
      message: String(error),
      recoverable: false,
      userMessage: 'An unexpected error occurred',
    };
  }

  const userMessages: Record<number, string> = {
    [PDFiumErrorCode.DOC_PASSWORD_REQUIRED]: 'This PDF requires a password',
    [PDFiumErrorCode.DOC_PASSWORD_INCORRECT]: 'The password is incorrect',
    [PDFiumErrorCode.DOC_FORMAT_INVALID]: 'This file is not a valid PDF',
    [PDFiumErrorCode.RENDER_INVALID_DIMENSIONS]: 'The image would be too large',
    // ... more mappings
  };

  return {
    code: error.code,
    type: error.name,
    message: error.message,
    recoverable: isRecoverable(error.code),
    userMessage: userMessages[error.code] || 'An error occurred processing the PDF',
  };
}

function isRecoverable(code: PDFiumErrorCode): boolean {
  return [
    PDFiumErrorCode.DOC_PASSWORD_REQUIRED,
    PDFiumErrorCode.DOC_PASSWORD_INCORRECT,
    PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE,
    PDFiumErrorCode.RENDER_INVALID_DIMENSIONS,
    PDFiumErrorCode.WORKER_TIMEOUT,
  ].includes(code);
}
```

## Testing Error Handling

### Unit Testing Errors

```typescript
import { describe, it, expect } from 'vitest';
import { PDFium, DocumentError, PDFiumErrorCode } from '@scaryterry/pdfium';

describe('error handling', () => {
  it('throws DocumentError for invalid PDF', async () => {
    using pdfium = await PDFium.init();

    await expect(
      pdfium.openDocument(new Uint8Array([1, 2, 3]))
    ).rejects.toThrow(DocumentError);
  });

  it('throws correct error code for password-protected PDF', async () => {
    using pdfium = await PDFium.init();
    const encryptedPdf = await loadEncryptedTestPDF();

    try {
      await pdfium.openDocument(encryptedPdf);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentError);
      expect((error as DocumentError).code).toBe(
        PDFiumErrorCode.DOC_PASSWORD_REQUIRED
      );
    }
  });
});
```

## Best Practices

### Do

- ✓ Always catch `PDFiumError` at appropriate boundaries
- ✓ Handle specific error codes for recoverable situations
- ✓ Log errors with context for debugging
- ✓ Provide user-friendly messages for common errors
- ✓ Clean up resources in `finally` blocks or use `using`

### Don't

- ✗ Swallow errors silently
- ✗ Catch and ignore `RESOURCE_DISPOSED` — fix the code
- ✗ Assume all errors are recoverable
- ✗ Expose internal error codes to end users
- ✗ Retry infinitely without backoff

## See Also

- [Error Reference](/pdfium/errors/) — Complete error code listing
- [Resource Management](/pdfium/concepts/resource-management/) — Preventing disposal errors
- [Examples](/pdfium/examples/patterns/) — Error handling examples
