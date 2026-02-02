---
title: PDFiumDocumentBuilder
description: Builder for creating new PDF documents from scratch
---

The `PDFiumDocumentBuilder` class enables creating new PDF documents programmatically. It provides methods to add pages, load fonts, and save the completed document.

## Import

```typescript
import { PDFium } from '@scaryterry/pdfium';

using pdfium = await PDFium.init();
using builder = pdfium.createDocument();
```

## Properties

### pageCount

The number of pages currently in the document being built.

```typescript
get pageCount(): number
```

#### Example

```typescript
console.log(`Document has ${builder.pageCount} pages`);
```

---

### handle

The internal document handle for advanced WASM operations.

```typescript
get handle(): DocumentHandle
```

:::caution
This is an internal property for advanced use cases.
:::

## Methods

### addPage()

Adds a new page to the document and returns a builder for adding content.

```typescript
addPage(options?: PageCreationOptions): PDFiumPageBuilder
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `PageCreationOptions` | Optional page settings |

#### PageCreationOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | `number` | `612` | Page width in points (8.5" = 612pt) |
| `height` | `number` | `792` | Page height in points (11" = 792pt) |

#### Common Page Sizes

| Format | Width (pt) | Height (pt) |
|--------|-----------|-------------|
| US Letter | 612 | 792 |
| US Legal | 612 | 1008 |
| A4 | 595 | 842 |
| A3 | 842 | 1191 |

#### Returns

[`PDFiumPageBuilder`](/pdfium/api/classes/pdfium-page-builder/) — A builder for adding content to the page.

#### Throws

- [`DocumentError`](/pdfium/errors/#documenterror) with code `DOC_CREATE_FAILED` (208)

#### Example

```typescript
// US Letter size (default)
using page1 = builder.addPage();

// A4 size
using page2 = builder.addPage({ width: 595, height: 842 });

// Custom size (5" x 7")
using page3 = builder.addPage({ width: 360, height: 504 });
```

---

### deletePage()

Removes a page from the document by its zero-based index.

```typescript
deletePage(pageIndex: number): void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageIndex` | `number` | Zero-based page index to delete |

#### Throws

- [`PageError`](/pdfium/errors/#pageerror) with code `PAGE_INDEX_OUT_OF_RANGE` (303)

#### Example

```typescript
// Add several pages
using page1 = builder.addPage();
page1.finalize();
using page2 = builder.addPage();
page2.finalize();
using page3 = builder.addPage();
page3.finalize();

// Delete the middle page
builder.deletePage(1);
console.log(builder.pageCount); // 2
```

---

### loadStandardFont()

Loads one of the 14 standard PDF fonts.

```typescript
loadStandardFont(fontName: string): FontHandle
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fontName` | `string` | Standard font name |

#### Standard Fonts

| Font Name | Description |
|-----------|-------------|
| `Courier` | Monospace |
| `Courier-Bold` | Monospace bold |
| `Courier-Oblique` | Monospace italic |
| `Courier-BoldOblique` | Monospace bold italic |
| `Helvetica` | Sans-serif |
| `Helvetica-Bold` | Sans-serif bold |
| `Helvetica-Oblique` | Sans-serif italic |
| `Helvetica-BoldOblique` | Sans-serif bold italic |
| `Times-Roman` | Serif |
| `Times-Bold` | Serif bold |
| `Times-Italic` | Serif italic |
| `Times-BoldItalic` | Serif bold italic |
| `Symbol` | Symbol characters |
| `ZapfDingbats` | Decorative symbols |

#### Returns

`FontHandle` — A handle to use with `PDFiumPageBuilder.addText()`.

#### Example

```typescript
const helvetica = builder.loadStandardFont('Helvetica');
const courierBold = builder.loadStandardFont('Courier-Bold');
const times = builder.loadStandardFont('Times-Roman');
```

---

### save()

Saves the document to a byte array.

```typescript
save(options?: SaveOptions): Uint8Array
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `SaveOptions` | Optional save settings |

#### SaveOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `flags` | `SaveFlags` | `None` | Save behaviour flags |
| `version` | `number` | — | PDF version (e.g., 17 for 1.7) |

#### Returns

`Uint8Array` — The saved PDF data.

#### Throws

- [`DocumentError`](/pdfium/errors/#documenterror) with code `DOC_SAVE_FAILED` (207)

#### Example

```typescript
import { SaveFlags } from '@scaryterry/pdfium';

// Basic save
const bytes = builder.save();

// Save as PDF 1.7
const bytes = builder.save({ version: 17 });
```

## Resource Management

`PDFiumDocumentBuilder` implements the `Disposable` interface:

```typescript
// Recommended: using keyword
using builder = pdfium.createDocument();
// Builder disposed when scope exits

// Alternative: manual disposal
const builder = pdfium.createDocument();
try {
  // Build document...
  const bytes = builder.save();
} finally {
  builder.dispose();
}
```

### dispose()

Releases all resources held by the builder.

```typescript
dispose(): void
```

:::caution
After calling `dispose()`, the builder and any associated page builders cannot be used.
:::

## Complete Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function createInvoice() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  // Load fonts
  const helvetica = builder.loadStandardFont('Helvetica');
  const helveticaBold = builder.loadStandardFont('Helvetica-Bold');

  // Create first page (US Letter)
  {
    using page = builder.addPage({ width: 612, height: 792 });

    // Add header
    page.addText('INVOICE', 72, 720, helveticaBold, 24);
    page.addText('Invoice #: INV-2024-001', 72, 690, helvetica, 12);
    page.addText('Date: 2024-01-15', 72, 675, helvetica, 12);

    // Add company info
    page.addText('Acme Corporation', 400, 720, helveticaBold, 14);
    page.addText('123 Business Street', 400, 705, helvetica, 10);
    page.addText('London, UK EC1A 1BB', 400, 690, helvetica, 10);

    // Add a separator line
    page.addRect(72, 650, 468, 1, { fill: { r: 0, g: 0, b: 0, a: 255 } });

    // Add line items
    page.addText('Description', 72, 620, helveticaBold, 10);
    page.addText('Amount', 450, 620, helveticaBold, 10);

    page.addText('Professional Services', 72, 600, helvetica, 10);
    page.addText('$1,500.00', 450, 600, helvetica, 10);

    page.addText('Software Licence', 72, 580, helvetica, 10);
    page.addText('$500.00', 450, 580, helvetica, 10);

    // Total
    page.addRect(72, 540, 468, 1, { fill: { r: 0, g: 0, b: 0, a: 255 } });
    page.addText('Total:', 380, 520, helveticaBold, 12);
    page.addText('$2,000.00', 450, 520, helveticaBold, 12);

    page.finalize();
  }

  // Save to file
  const pdfBytes = builder.save({ version: 17 });
  await fs.writeFile('invoice.pdf', pdfBytes);
  console.log('Invoice created successfully');
}

createInvoice();
```

## Multi-Page Document

```typescript
async function createReport() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const font = builder.loadStandardFont('Helvetica');
  const boldFont = builder.loadStandardFont('Helvetica-Bold');

  const chapters = ['Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion'];

  for (let i = 0; i < chapters.length; i++) {
    using page = builder.addPage();

    // Chapter title
    page.addText(`Chapter ${i + 1}: ${chapters[i]}`, 72, 720, boldFont, 18);

    // Page number
    page.addText(`Page ${i + 1} of ${chapters.length}`, 72, 36, font, 10);

    // Content placeholder
    page.addText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.', 72, 680, font, 12);

    page.finalize();
  }

  const pdfBytes = builder.save();
  await fs.writeFile('report.pdf', pdfBytes);
}
```

## See Also

- [PDFium](/pdfium/api/classes/pdfium/) — Creating document builders
- [PDFiumPageBuilder](/pdfium/api/classes/pdfium-page-builder/) — Adding content to pages
- [Create Document Guide](/pdfium/guides/create-document/) — Step-by-step guide
- [Add Text Guide](/pdfium/guides/add-text/) — Text positioning and fonts
- [Add Shapes Guide](/pdfium/guides/add-shapes/) — Drawing rectangles
