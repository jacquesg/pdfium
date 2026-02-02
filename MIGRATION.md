# Migration Guide: @hyzyla/pdfium v2 to @scaryterry/pdfium v3

This guide covers all breaking changes and how to migrate your code.

## Breaking Changes

### 1. Package Name

```diff
- import { PDFiumLibrary } from '@hyzyla/pdfium';
+ import { PDFium } from '@scaryterry/pdfium';
```

### 2. Node.js Version

v3 requires **Node.js 22 LTS** or later. Older versions are not supported.

### 3. ESM Only

v3 is ESM-only. CommonJS `require()` is not supported.

```diff
- const { PDFiumLibrary } = require('@hyzyla/pdfium');
+ import { PDFium } from '@scaryterry/pdfium';
```

### 4. Initialisation

```diff
- const library = await PDFiumLibrary.init();
+ const pdfium = await PDFium.init({ wasmBinary });
```

The `wasmBinary` option accepts an `ArrayBuffer` with the pre-loaded WASM binary. In Node.js, the library auto-detects the WASM path if not provided.

Custom limits can be set at initialisation:

```typescript
const pdfium = await PDFium.init({
  wasmBinary,
  limits: {
    maxDocumentSize: 100 * 1024 * 1024, // 100 MB
    maxRenderDimension: 16384,
    maxTextCharCount: 5_000_000,
  },
});
```

### 5. Error Handling

All operations throw typed error subclasses instead of generic exceptions.

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
import { PDFium, DocumentError, InitialisationError, PDFiumErrorCode } from '@scaryterry/pdfium';

try {
  using pdfium = await PDFium.init({ wasmBinary });
  using document = await pdfium.openDocument(buff);
} catch (error) {
  if (error instanceof DocumentError) {
    console.error(error.code, error.message);
    if (error.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {
      // Prompt for password
    }
  } else if (error instanceof InitialisationError) {
    console.error('Init failed:', error.message);
  }
}
```

Each error has a numeric `code` property for programmatic handling, a `context` property with optional debugging information, and a `toJSON()` method for serialisation.

### 6. Resource Cleanup

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
using pdfium = await PDFium.init({ wasmBinary });
using document = await pdfium.openDocument(buff);
// Resources are automatically cleaned up when scope exits
```

Documents now track their child pages. When a document is disposed, all open pages are automatically disposed too.

### 7. Properties vs Methods

Several methods have been replaced with getter properties.

| v2 Method | v3 Property |
|-----------|-------------|
| `document.getPageCount()` | `document.pageCount` |
| `page.getSize()` | `page.size` |
| `page.number` | `page.index` |

### 8. Rendering

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
const png = await sharp(data, {
  raw: { width, height, channels: 4 },
}).png().toBuffer();
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

### 10. Form Fields

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

## New Features in v3

### Document Save

Save documents to bytes, with optional version and flags:

```typescript
const bytes = document.save();
const versionedBytes = document.save({ version: 17 });
```

### Bookmarks

Extract the bookmark tree from documents:

```typescript
const bookmarks = document.getBookmarks();
for (const bookmark of bookmarks) {
  console.log(bookmark.title, bookmark.pageIndex);
  for (const child of bookmark.children) {
    console.log('  ', child.title);
  }
}
```

### Annotations

Read annotation metadata from pages:

```typescript
const count = page.annotationCount;
const annotations = page.getAnnotations();
for (const annotation of annotations) {
  console.log(annotation.type, annotation.bounds);
}
```

### Page Objects

Inspect page objects (text, images, paths, etc.):

```typescript
const objects = page.getObjects();
for (const obj of objects) {
  console.log(obj.type, obj.bounds);
}
```

### Page Rotation

Read page rotation:

```typescript
const rotation = page.rotation; // 0, 90, 180, or 270
```

### Text Search

Search for text with position information:

```typescript
for (const result of page.findText('hello', TextSearchFlags.MatchCase)) {
  console.log(result.charIndex, result.charCount, result.rects);
}
```

### Character Positioning

Get character bounding boxes and character-at-position:

```typescript
const box = page.getCharBox(0);
const charIndex = page.getCharIndexAtPos(100, 200);
const regionText = page.getTextInRect(0, 0, 300, 400);
```

### Structure Tree (Tagged PDF)

Extract accessibility structure tree:

```typescript
const tree = page.getStructureTree();
if (tree) {
  for (const element of tree) {
    console.log(element.type, element.altText);
  }
}
```

### Attachments

Extract file attachments from documents:

```typescript
const count = document.attachmentCount;
const attachments = document.getAttachments();
for (const attachment of attachments) {
  console.log(attachment.name, attachment.data.length);
}
```

### PDF Creation

Create new PDF documents from scratch:

```typescript
using builder = pdfium.createDocument();
const font = builder.loadStandardFont('Helvetica');
using page = builder.addPage({ width: 612, height: 792 });
page.addRectangle(100, 100, 200, 50, { fill: { r: 255, g: 0, b: 0, a: 255 } });
page.addText('Hello!', 100, 700, font, 24);
page.generateContent();
const bytes = builder.save();
```

### Progressive Loading

Detect linearised documents and check page availability:

```typescript
using loader = pdfium.createProgressiveLoader(partialData);
if (loader.isLinearised) {
  console.log('First page:', loader.firstPageNumber);
}
using doc = loader.getDocument();
```

## API Mapping Reference

| @hyzyla/pdfium v2 | @scaryterry/pdfium v3 |
|-------------------|---------------------|
| `PDFiumLibrary.init()` | `PDFium.init({ wasmBinary })` |
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
| N/A | `document.save()` |
| N/A | `document.getBookmarks()` |
| N/A | `document.getAttachments()` |
| N/A | `page.getAnnotations()` |
| N/A | `page.findText(query)` |
| N/A | `page.getStructureTree()` |
| N/A | `pdfium.createDocument()` |
| N/A | `pdfium.createProgressiveLoader(data)` |
