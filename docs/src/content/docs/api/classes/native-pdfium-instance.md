---
title: NativePDFiumInstance
description: API reference for NativePDFiumInstance class
---

`NativePDFiumInstance` is the main entry point for the native PDFium backend in Node.js. It provides document loading backed by platform-specific native addons.

## Import

```typescript
import { PDFium, NativePDFiumInstance } from '@scaryterry/pdfium';
```

## Creating an Instance

### Using PDFium.init() with native preference

```typescript
const pdfium = await PDFium.init({ useNative: true });

if (pdfium instanceof NativePDFiumInstance) {
  console.log('Using native backend');
}
```

### Using PDFium.initNative() directly

```typescript
const pdfium = await PDFium.initNative();

if (pdfium) {
  // Native backend available
  using doc = pdfium.openDocument(data);
} else {
  // Native backend unavailable, use WASM
}
```

## Methods

### openDocument()

Open a PDF document from binary data.

```typescript
openDocument(
  data: Uint8Array | ArrayBuffer,
  options?: OpenDocumentOptions
): NativePDFiumDocument
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Uint8Array \| ArrayBuffer` | PDF file data |
| `options.password` | `string` | Password for encrypted documents |

**Returns:** `NativePDFiumDocument`

**Throws:** `DocumentError` if the document cannot be opened

**Example:**

```typescript
using doc = pdfium.openDocument(pdfBytes);
console.log(`Pages: ${doc.pageCount}`);

// With password
using encrypted = pdfium.openDocument(data, { password: 'secret' });
```

### dispose()

Release all resources held by this instance.

```typescript
dispose(): void
```

Resources are automatically cleaned up when using the `using` keyword.

**Example:**

```typescript
// Automatic cleanup
{
  using pdfium = await PDFium.initNative();
  // Use pdfium...
} // Disposed automatically

// Manual cleanup
const pdfium = await PDFium.initNative();
try {
  // Use pdfium...
} finally {
  pdfium?.dispose();
}
```

## Properties

### limits

Get the configured resource limits.

```typescript
get limits(): Readonly<Required<PDFiumLimits>>
```

**Example:**

```typescript
const pdfium = await PDFium.initNative({ limits: { maxDocumentSize: 10_000_000 } });
console.log(pdfium?.limits.maxDocumentSize); // 10000000
```

## Resource Management

`NativePDFiumInstance` implements `Symbol.dispose`, enabling automatic cleanup:

```typescript
// Documents opened through this instance are tracked
{
  using pdfium = await PDFium.initNative();
  const doc1 = pdfium!.openDocument(data1);
  const doc2 = pdfium!.openDocument(data2);
  // When pdfium is disposed, both documents are automatically closed
}
```

## Error Handling

```typescript
import { DocumentError, PDFiumErrorCode } from '@scaryterry/pdfium';

const pdfium = await PDFium.initNative();
if (!pdfium) {
  throw new Error('Native backend unavailable');
}

try {
  using doc = pdfium.openDocument(corruptData);
} catch (error) {
  if (error instanceof DocumentError) {
    switch (error.code) {
      case PDFiumErrorCode.DOC_FORMAT_INVALID:
        console.error('Invalid PDF format');
        break;
      case PDFiumErrorCode.DOC_PASSWORD_REQUIRED:
        console.error('Password required');
        break;
    }
  }
} finally {
  pdfium.dispose();
}
```

## See Also

- [NativePDFiumDocument](/pdfium/api/classes/native-pdfium-document/) — Document class
- [NativePDFiumPage](/pdfium/api/classes/native-pdfium-page/) — Page class
- [Native vs WASM Backends](/pdfium/concepts/backends/) — Backend comparison
- [Troubleshooting](/pdfium/guides/native-troubleshooting/) — Common issues
