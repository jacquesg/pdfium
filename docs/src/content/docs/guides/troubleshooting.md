---
title: Troubleshooting
description: Common issues and solutions for @scaryterry/pdfium
---

## Common Errors

### `INIT_WASM_LOAD_FAILED`

**Cause:** The WASM binary could not be loaded.
**Solution:**
- Ensure `pdfium.wasm` is served with the correct MIME type: `application/wasm`.
- Check if the URL provided to `wasmUrl` is correct and accessible.
- If using a bundler (Vite, Webpack), ensure the WASM file is copied to the output directory.

### `WORKER_TIMEOUT`

**Cause:** The worker thread did not respond in time (default 30s).
**Solution:**
- Increase timeout with `WorkerProxy.create(workerUrl, wasmBinary, { timeout: 60000 })`.
- Or in high-level worker mode, use `PDFium.init({ useWorker: true, workerTimeout: 60000, ... })`.
- Ensure the worker script is loaded correctly (check network tab).
- Check if the operation (e.g. rendering a large page) is simply taking too long.

### `RENDER_INVALID_DIMENSIONS`

**Cause:** Requested width/height or scale results in invalid dimensions (0, negative, or too large).
**Solution:**
- Validate inputs before calling `render()`.
- Check `limits.maxRenderDimension` in initialisation options.

### `DOC_PASSWORD_REQUIRED` (code 202)

**Cause:** The document is encrypted and requires a password to open.
**Solution:** Prompt the user for a password and pass it to `openDocument()`:

```typescript
try {
  using document = await pdfium.openDocument(data);
} catch (error) {
  if (error instanceof DocumentError && error.code === 202) {
    const password = await promptUser('Enter PDF password:');
    using document = await pdfium.openDocument(data, { password });
  }
}
```

### `DOC_PASSWORD_INCORRECT` (code 203)

**Cause:** The provided password does not match the document's encryption.
**Solution:** Allow the user to retry with a limit:

```typescript
const MAX_ATTEMPTS = 3;

for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
  try {
    const password = await promptUser('Enter password:');
    using document = await pdfium.openDocument(data, { password });
    return document;
  } catch (error) {
    if (error instanceof DocumentError && error.code === 203) {
      console.warn(`Incorrect password (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
      continue;
    }
    throw error;
  }
}
throw new Error('Maximum password attempts exceeded');
```

### `DOC_FORMAT_INVALID` (code 201)

**Cause:** The data is not a valid PDF or is corrupted.
**Solution:** Validate the PDF magic bytes before opening:

```typescript
function isPDF(data: Uint8Array): boolean {
  return data[0] === 0x25 && data[1] === 0x50 &&
         data[2] === 0x44 && data[3] === 0x46; // %PDF
}

if (!isPDF(data)) {
  throw new Error('Not a PDF file');
}

using document = await pdfium.openDocument(data);
```

### `PAGE_INDEX_OUT_OF_RANGE` (code 303)

**Cause:** Requested page index is negative or exceeds the document's page count.
**Solution:** Check `pageCount` before accessing pages:

```typescript
const pageIndex = 5;

if (pageIndex < 0 || pageIndex >= document.pageCount) {
  throw new Error(`Page ${pageIndex} does not exist (document has ${document.pageCount} pages)`);
}

using page = document.getPage(pageIndex);
```

### `RESOURCE_DISPOSED` (code 900)

**Cause:** Attempting to use a resource (document, page, font) after it has been disposed.
**Solution:** Ensure resources are used within their `using` scope:

```typescript
// BAD: page used after disposal
let savedPage: PDFiumPage;
{
  using page = document.getPage(0);
  savedPage = page;
} // page disposed here
savedPage.getText(); // Throws RESOURCE_DISPOSED

// GOOD: use within scope
{
  using page = document.getPage(0);
  const text = page.getText(); // Works — page is still alive
}
```

### `MEMORY_ALLOCATION_FAILED` (code 500)

**Cause:** WASM memory is exhausted, typically from rendering very large pages or processing many documents without disposal.
**Solution:** Reduce limits and process documents sequentially:

```typescript
using pdfium = await PDFium.init({
  limits: {
    maxRenderDimension: 2048,  // Reduce from default
    maxDocumentSize: 20 * 1024 * 1024,
  },
});

// Process one document at a time
for (const file of files) {
  using document = await pdfium.openDocument(file);
  using page = document.getPage(0);
  const result = page.render({ scale: 1 });
  await saveToDisk(result);
  // document and page disposed — memory freed
}
```

### `INIT_NETWORK_ERROR` (code 103)

**Cause:** The WASM binary could not be fetched (network error, wrong URL, CORS, or incorrect MIME type).
**Solution:** Verify the URL is correct, the server returns `application/wasm`, and CORS headers are set:

```typescript
try {
  using pdfium = await PDFium.init({ wasmBinary });
} catch (error) {
  if (error instanceof InitialisationError && error.code === 103) {
    // Check:
    // 1. Is the WASM URL correct and accessible?
    // 2. Does the server return Content-Type: application/wasm?
    // 3. Are CORS headers set for cross-origin requests?
    console.error('Failed to load WASM binary:', error.message);
  }
}
```

## Environment Specifics

### Next.js / React

If you see errors about `fs` or `path`:
- Ensure you are importing from `@scaryterry/pdfium/browser` or handling the Node.js polyfills correctly in your bundler config.

### Electron

- Use the Node.js entry point (`@scaryterry/pdfium/node`) for main process.
- Use the Browser entry point for renderer process, or enable Node integration (not recommended).

## Debugging

Pass a custom `logger` to `PDFium.init()` for verbose output:

```typescript
import { PDFium } from '@scaryterry/pdfium';

using pdfium = await PDFium.init({
  logger: {
    debug: (...args) => console.debug('[PDFium]', ...args),
    info: (...args) => console.info('[PDFium]', ...args),
    warn: (...args) => console.warn('[PDFium]', ...args),
    error: (...args) => console.error('[PDFium]', ...args),
  },
});
```

To silence all internal logging, pass no-op functions:

```typescript
using pdfium = await PDFium.init({
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
});
```
