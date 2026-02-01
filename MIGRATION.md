# Migration Guide: @hyzyla/pdfium v2 to @jacquesg/pdfium v3

This guide covers all breaking changes and how to migrate your code.

## Breaking Changes

### 1. Package Name

```diff
- import { PDFiumLibrary } from '@hyzyla/pdfium';
+ import { PDFium } from '@jacquesg/pdfium';
```

### 2. Node.js Version

v3 requires **Node.js 22 LTS** or later. Older versions are not supported.

### 3. ESM Only

v3 is ESM-only. CommonJS `require()` is not supported.

```diff
- const { PDFiumLibrary } = require('@hyzyla/pdfium');
+ import { PDFium } from '@jacquesg/pdfium';
```

### 4. Error Handling

All operations now throw typed error subclasses instead of generic exceptions.

**Before (v2):**
```typescript
try {
  const library = await PDFiumLibrary.init();
  const document = await library.loadDocument(buff);
} catch (error) {
  console.error(error);
}
```

**After (v3):**
```typescript
import { PDFium, DocumentError, InitialisationError } from '@jacquesg/pdfium';

try {
  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(buff);
} catch (error) {
  if (error instanceof DocumentError) {
    console.error(error.code, error.message);
  } else if (error instanceof InitialisationError) {
    console.error('Init failed:', error.message);
  }
}
```

Each error has a numeric `code` property for programmatic handling and a `context` property with optional debugging information.

### 5. Resource Cleanup

`destroy()` is replaced by `dispose()` and `Symbol.dispose` (`using` keyword).

**Before (v2):**
```typescript
const library = await PDFiumLibrary.init();
const document = await library.loadDocument(buff);
try {
  // use document
} finally {
  document.destroy();
  library.destroy();
}
```

**After (v3):**
```typescript
using pdfium = await PDFium.init();
using document = await pdfium.openDocument(buff);
// Resources are automatically cleaned up when scope exits
```

Or with explicit disposal:
```typescript
const pdfium = await PDFium.init();
try {
  const document = await pdfium.openDocument(buff);
  try {
    // use document
  } finally {
    document.dispose();
  }
} finally {
  pdfium.dispose();
}
```

### 6. Properties vs Methods

Several methods have been replaced with getter properties.

| v2 Method | v3 Property |
|-----------|-------------|
| `document.getPageCount()` | `document.pageCount` |
| `page.getSize()` | `page.size` |
| `page.number` | `page.index` |

### 7. Rendering

The render function no longer accepts a custom render callback. It returns raw RGBA pixel data.

**Before (v2):**
```typescript
const image = await page.render({
  scale: 3,
  render: async (options) => {
    return sharp(options.data, {
      raw: { width: options.width, height: options.height, channels: 4 },
    }).png().toBuffer();
  },
});
```

**After (v3):**
```typescript
const { data, width, height } = page.render({ scale: 3 });
// data is Uint8Array of RGBA pixels
// Convert to PNG using your preferred library:
const png = await sharp(data, {
  raw: { width, height, channels: 4 },
}).png().toBuffer();
```

### 8. Form Fields

Form field support is now automatic. No need to call `initializeFormFields()`.

**Before (v2):**
```typescript
document.initializeFormFields();
const image = await page.render({ scale: 2, render: renderFn });
```

**After (v3):**
```typescript
const result = page.render({ scale: 2, renderFormFields: true });
```

### 9. Password-Protected Documents

**Before (v2):**
```typescript
const document = await library.loadDocument(buff, 'password123');
```

**After (v3):**
```typescript
using document = await pdfium.openDocument(buff, { password: 'password123' });
```

## API Mapping Reference

| @hyzyla/pdfium v2 | @jacquesg/pdfium v3 |
|-------------------|---------------------|
| `PDFiumLibrary.init()` | `PDFium.init()` |
| `library.loadDocument(buff)` | `pdfium.openDocument(data)` |
| `library.loadDocument(buff, pass)` | `pdfium.openDocument(data, { password: pass })` |
| `library.destroy()` | `pdfium.dispose()` or `using` |
| `document.getPageCount()` | `document.pageCount` |
| `document.getPage(i)` | `document.getPage(i)` |
| `document.pages()` | `document.pages()` |
| `document.destroy()` | `document.dispose()` or `using` |
| `document.initializeFormFields()` | Automatic (use `renderFormFields: true`) |
| `page.number` | `page.index` |
| `page.getSize()` | `page.size` |
| `page.render({ scale, render })` | `page.render({ scale })` |
| `page.getText()` | `page.getText()` |
| `page.close()` | `page.dispose()` or `using` |
