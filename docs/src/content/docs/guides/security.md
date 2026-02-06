---
title: Security Guide
description: Security best practices for @scaryterry/pdfium
---

PDF processing involves parsing complex, potentially untrusted binary data. This guide covers the security considerations and recommended practices for using `@scaryterry/pdfium` safely.

## Content Security Policy (CSP)

When running PDFium in the browser via WASM, strict CSP headers are recommended.

### Required Directives

PDFium WASM execution requires:

```http
Content-Security-Policy: script-src 'self' 'wasm-unsafe-eval';
```

- `'self'`: Allows loading the JS glue code and worker scripts from your domain.
- `'wasm-unsafe-eval'`: Required by V8 and other engines to compile and instantiate WASM modules.

If you load the WASM binary from a CDN or different origin:

```http
Content-Security-Policy: script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://cdn.example.com;
```

### Worker Isolation

If using `WorkerProxy`, ensure your worker script is served with appropriate headers:

```http
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

These headers are required if you use `SharedArrayBuffer` (which PDFium might use for optimisation in future versions, though currently it uses structured cloning).

### Subresource Integrity (SRI)

When loading the WASM binary from a CDN, consider using SRI hashes to verify integrity:

```html
<script>
  // Verify the WASM binary hash after fetching
  const response = await fetch('/pdfium.wasm');
  const buffer = await response.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Compare against known hash (from build output)
  if (hashHex !== expectedHash) {
    throw new Error('WASM binary integrity check failed');
  }
</script>
```

The library exposes `__WASM_HASH__` at build time for this purpose.

## WASM Isolation

WebAssembly runs in a sandboxed environment. It cannot access the DOM, cookies, or local storage directly. However, memory corruption within the WASM heap *is* possible (buffer overflows inside the virtual machine).

To mitigate impact:

1. **Process untrusted PDFs in a Worker:** Even if the WASM module crashes or hangs, the main thread remains responsive.
2. **Use resource limits:** Set `maxDocumentSize` and `maxRenderDimension` to prevent memory exhaustion attacks.
3. **Set timeouts:** Use worker timeouts to prevent infinite loops from hanging your application.

```typescript
using pdfium = await PDFium.init({
  limits: {
    maxDocumentSize: 50 * 1024 * 1024,  // 50 MB
    maxRenderDimension: 4096,             // 4096×4096 max
  },
});
```

## Input Validation

Always validate untrusted input before passing it to PDFium:

### File Size

Reject files larger than your application's limit *before* passing to `openDocument`:

```typescript
const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB

function validatePDFInput(data: Uint8Array): void {
  if (data.byteLength === 0) {
    throw new Error('Empty file');
  }
  if (data.byteLength > MAX_PDF_SIZE) {
    throw new Error(`File too large: ${data.byteLength} bytes (max ${MAX_PDF_SIZE})`);
  }
}
```

### File Type

Check the PDF magic bytes before processing:

```typescript
function isPDFHeader(data: Uint8Array): boolean {
  // PDF files start with %PDF-
  return data[0] === 0x25 && data[1] === 0x50 &&
         data[2] === 0x44 && data[3] === 0x46;
}
```

### Render Dimensions

Validate scale factors and dimensions to prevent memory exhaustion:

```typescript
function safeRender(page: PDFiumPage, scale: number) {
  const maxDimension = 8192;
  const width = Math.ceil(page.width * scale);
  const height = Math.ceil(page.height * scale);

  if (width > maxDimension || height > maxDimension) {
    throw new Error(`Render dimensions ${width}×${height} exceed limit of ${maxDimension}`);
  }

  return page.render({ scale });
}
```

### Filename Sanitisation

When extracting attachments, sanitise filenames to prevent path traversal:

```typescript
import path from 'path';

function sanitiseFilename(name: string): string {
  // Remove path components
  name = path.basename(name);
  // Remove problematic characters
  name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  // Prevent empty or dot-only names
  if (!name || name === '.' || name === '..') {
    name = 'attachment';
  }
  return name;
}
```

## Password Handling

When working with password-protected PDFs:

- Pass passwords via the `password` option in `openDocument()`.
- The library's internal helpers use `secure: true` to zero out password buffers after use.
- Never log or persist passwords.

```typescript
using document = await pdfium.openDocument(data, {
  password: userProvidedPassword,
});
// Password buffer is zeroed after use internally
```

## Document Permissions

PDFs can restrict operations (printing, copying, editing) via permission flags. The library respects these and throws `PermissionsError` when a restricted operation is attempted:

```typescript
import { PermissionsError } from '@scaryterry/pdfium';

try {
  const bytes = document.save();
} catch (error) {
  if (error instanceof PermissionsError) {
    console.error('This document does not allow modification');
  }
}
```

## Server-Side Considerations

### Resource Limits

In server environments processing user-uploaded PDFs, always set strict limits:

```typescript
using pdfium = await PDFium.init({
  limits: {
    maxDocumentSize: 20 * 1024 * 1024,  // 20 MB for uploads
    maxRenderDimension: 4096,
    maxTextCharCount: 500_000,
  },
});
```

### Global Configuration

For applications that process PDFs across multiple instances, use `configure()` to set limits globally rather than per-instance:

```typescript
import { configure, getConfig } from '@scaryterry/pdfium';

configure({
  limits: {
    maxDocumentSize: 20 * 1024 * 1024,  // 20 MB
    maxRenderDimension: 4096,
    maxTextCharCount: 500_000,
  },
});

// Verify the current configuration
const config = getConfig();
console.log(config.limits.maxDocumentSize); // 20971520
```

:::tip
Per-instance limits passed to `PDFium.init({ limits })` override the global configuration for that instance. Use `configure()` for sensible defaults, then override per-instance when needed.
:::

### Process Isolation

For high-security environments, consider running PDF processing in a separate process or container:

- Use Node.js `worker_threads` for process-level isolation
- Run in a container with limited memory and CPU
- Set OS-level resource limits (`ulimit` on Linux)

### Error Information Leakage

In production, error context is automatically sanitised to strip internal WASM details. Avoid exposing raw `PDFiumError.context` to end users:

```typescript
try {
  using document = await pdfium.openDocument(data);
} catch (error) {
  if (error instanceof PDFiumError) {
    // Log full details internally
    logger.error('PDF processing failed', { code: error.code, context: error.context });

    // Return sanitised message to user
    res.status(400).json({ error: 'Invalid PDF file' });
  }
}
```

## Dependency Scanning

The library:

- Has **zero runtime dependencies** — PDFium is compiled to WASM and bundled
- Runs `npm audit` as part of CI
- Uses `pnpm` lockfile for reproducible installs

## See Also

- [Error Handling](/pdfium/concepts/error-handling/) — Error recovery patterns
- [Error Reference](/pdfium/errors/) — Complete error code listing
- [Worker Mode](/pdfium/guides/worker-mode/) — Off-main-thread processing
- [Memory Management](/pdfium/concepts/memory/) — WASM memory considerations
