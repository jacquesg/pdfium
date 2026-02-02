---
title: Create Documents
description: Creating new PDF documents from scratch
---

The library supports creating new PDF documents programmatically. This guide explains how to build PDFs from scratch.

## Overview

Document creation workflow:

1. Get a `PDFiumDocumentBuilder` from `pdfium.createDocument()`
2. Load fonts with `builder.loadStandardFont()`
3. Add pages with `builder.addPage()`
4. Add content to each page
5. Call `page.finalize()` for each page
6. Save with `builder.save()`

## Basic Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function createSimplePDF() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const font = builder.loadStandardFont('Helvetica');

  {
    using page = builder.addPage(); // US Letter size (default)
    page.addText('Hello, World!', 72, 720, font, 24);
    page.finalize();
  }

  const pdfBytes = builder.save();
  await fs.writeFile('hello.pdf', pdfBytes);
}
```

## Page Sizes

### Standard Sizes

```typescript
// US Letter (default)
using page = builder.addPage(); // 612 x 792 pt

// US Letter explicit
using page = builder.addPage({ width: 612, height: 792 });

// A4
using page = builder.addPage({ width: 595, height: 842 });

// A3
using page = builder.addPage({ width: 842, height: 1191 });

// US Legal
using page = builder.addPage({ width: 612, height: 1008 });
```

### Size Reference

| Format | Width (pt) | Height (pt) | Inches |
|--------|-----------|-------------|--------|
| US Letter | 612 | 792 | 8.5 × 11 |
| US Legal | 612 | 1008 | 8.5 × 14 |
| A4 | 595 | 842 | 8.27 × 11.69 |
| A3 | 842 | 1191 | 11.69 × 16.54 |
| A5 | 420 | 595 | 5.83 × 8.27 |

### Custom Sizes

```typescript
// 5" x 7" (inches × 72 = points)
using page = builder.addPage({ width: 360, height: 504 });

// 100mm x 150mm (mm × 2.835 = points)
using page = builder.addPage({ width: 283.5, height: 425.25 });
```

### Landscape Orientation

```typescript
// Landscape A4
using page = builder.addPage({ width: 842, height: 595 });
```

## Standard Fonts

The 14 standard PDF fonts are available without embedding:

### Sans-Serif (Helvetica)

```typescript
const helvetica = builder.loadStandardFont('Helvetica');
const helveticaBold = builder.loadStandardFont('Helvetica-Bold');
const helveticaOblique = builder.loadStandardFont('Helvetica-Oblique');
const helveticaBoldOblique = builder.loadStandardFont('Helvetica-BoldOblique');
```

### Serif (Times)

```typescript
const times = builder.loadStandardFont('Times-Roman');
const timesBold = builder.loadStandardFont('Times-Bold');
const timesItalic = builder.loadStandardFont('Times-Italic');
const timesBoldItalic = builder.loadStandardFont('Times-BoldItalic');
```

### Monospace (Courier)

```typescript
const courier = builder.loadStandardFont('Courier');
const courierBold = builder.loadStandardFont('Courier-Bold');
const courierOblique = builder.loadStandardFont('Courier-Oblique');
const courierBoldOblique = builder.loadStandardFont('Courier-BoldOblique');
```

### Symbols

```typescript
const symbol = builder.loadStandardFont('Symbol');
const zapf = builder.loadStandardFont('ZapfDingbats');
```

## Adding Text

### Basic Text

```typescript
const font = builder.loadStandardFont('Helvetica');

// Position is (x, y) from bottom-left, y is baseline
page.addText('Hello, World!', 72, 720, font, 24);
```

### Coordinate System

- Origin (0, 0) is at the **bottom-left** of the page
- X increases to the right
- Y increases upward
- Text is positioned at its **baseline**

```typescript
// One inch from left edge, one inch from top on US Letter
page.addText('Top-left area', 72, 792 - 72, font, 12);

// Centred horizontally (approximate)
const text = 'Centred Text';
const approxWidth = text.length * 7; // ~7pt per char for 12pt font
page.addText(text, (612 - approxWidth) / 2, 400, font, 12);
```

### Multiple Text Blocks

```typescript
const titleFont = builder.loadStandardFont('Helvetica-Bold');
const bodyFont = builder.loadStandardFont('Helvetica');

page.addText('Document Title', 72, 720, titleFont, 24);
page.addText('Subtitle here', 72, 690, bodyFont, 14);
page.addText('Body text content...', 72, 650, bodyFont, 12);
```

## Adding Shapes

### Rectangles

```typescript
// Filled rectangle
page.addRect(72, 700, 200, 50, {
  fill: { r: 200, g: 220, b: 255, a: 255 },
});

// Border only
page.addRect(72, 600, 200, 50, {
  stroke: { r: 0, g: 0, b: 0, a: 255 },
  strokeWidth: 1,
});

// Fill and border
page.addRect(72, 500, 200, 50, {
  fill: { r: 255, g: 255, b: 200, a: 255 },
  stroke: { r: 0, g: 0, b: 0, a: 255 },
  strokeWidth: 2,
});
```

### Lines

```typescript
// Horizontal line (thin rectangle)
page.addRect(72, 650, 468, 1, {
  fill: { r: 0, g: 0, b: 0, a: 255 },
});

// Thicker line
page.addRect(72, 600, 468, 3, {
  fill: { r: 100, g: 100, b: 100, a: 255 },
});
```

### Paths (Polygons)

```typescript
// Triangle
page.addPath([
  { x: 200, y: 400 },
  { x: 300, y: 500 },
  { x: 100, y: 500 },
  { x: 200, y: 400 }, // Close path
], {
  fill: { r: 255, g: 200, b: 100, a: 255 },
  stroke: { r: 0, g: 0, b: 0, a: 255 },
  strokeWidth: 1,
});

// Diamond
page.addPath([
  { x: 400, y: 350 },
  { x: 450, y: 400 },
  { x: 400, y: 450 },
  { x: 350, y: 400 },
  { x: 400, y: 350 },
], {
  fill: { r: 100, g: 200, b: 255, a: 255 },
});
```

## Multi-Page Documents

```typescript
const font = builder.loadStandardFont('Helvetica');
const boldFont = builder.loadStandardFont('Helvetica-Bold');

for (let i = 0; i < 5; i++) {
  using page = builder.addPage();

  page.addText(`Page ${i + 1}`, 72, 720, boldFont, 18);
  page.addText(`Content for page ${i + 1}...`, 72, 680, font, 12);

  // Page number at bottom
  page.addText(
    `${i + 1} of 5`,
    306, // Centred on US Letter
    36,
    font,
    10
  );

  page.finalize();
}
```

## Saving Options

### Basic Save

```typescript
const bytes = builder.save();
```

### Specify PDF Version

```typescript
// PDF 1.7
const bytes = builder.save({ version: 17 });

// PDF 2.0
const bytes = builder.save({ version: 20 });
```

## Complete Example: Invoice

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function createInvoice() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const regular = builder.loadStandardFont('Helvetica');
  const bold = builder.loadStandardFont('Helvetica-Bold');

  {
    using page = builder.addPage();

    // Header background
    page.addRect(0, 742, 612, 50, {
      fill: { r: 50, g: 100, b: 150, a: 255 },
    });

    // Header text
    page.addText('INVOICE', 72, 760, bold, 28);

    // Company info (right side)
    page.addText('Acme Corporation', 400, 720, bold, 12);
    page.addText('123 Business Street', 400, 705, regular, 10);
    page.addText('London, UK EC1A 1BB', 400, 690, regular, 10);

    // Invoice details
    page.addText('Invoice #: INV-2024-001', 72, 680, regular, 10);
    page.addText('Date: 15 January 2024', 72, 665, regular, 10);
    page.addText('Due: 15 February 2024', 72, 650, regular, 10);

    // Bill to
    page.addText('Bill To:', 72, 610, bold, 11);
    page.addText('Customer Name', 72, 595, regular, 10);
    page.addText('456 Customer Ave', 72, 580, regular, 10);
    page.addText('Manchester, UK M1 1AA', 72, 565, regular, 10);

    // Table header
    const tableTop = 520;
    page.addRect(72, tableTop - 20, 468, 25, {
      fill: { r: 240, g: 240, b: 240, a: 255 },
    });
    page.addText('Description', 80, tableTop - 10, bold, 10);
    page.addText('Qty', 350, tableTop - 10, bold, 10);
    page.addText('Price', 400, tableTop - 10, bold, 10);
    page.addText('Total', 480, tableTop - 10, bold, 10);

    // Table rows
    const items = [
      { desc: 'Professional Services', qty: 10, price: 150 },
      { desc: 'Software Licence', qty: 1, price: 500 },
      { desc: 'Support Package', qty: 1, price: 200 },
    ];

    let y = tableTop - 45;
    let subtotal = 0;

    for (const item of items) {
      const total = item.qty * item.price;
      subtotal += total;

      page.addText(item.desc, 80, y, regular, 10);
      page.addText(String(item.qty), 355, y, regular, 10);
      page.addText(`$${item.price.toFixed(2)}`, 395, y, regular, 10);
      page.addText(`$${total.toFixed(2)}`, 475, y, regular, 10);

      y -= 20;
    }

    // Separator line
    page.addRect(72, y - 10, 468, 1, {
      fill: { r: 0, g: 0, b: 0, a: 255 },
    });

    // Totals
    y -= 30;
    const tax = subtotal * 0.2;
    const grandTotal = subtotal + tax;

    page.addText('Subtotal:', 380, y, regular, 10);
    page.addText(`$${subtotal.toFixed(2)}`, 475, y, regular, 10);

    y -= 18;
    page.addText('VAT (20%):', 380, y, regular, 10);
    page.addText(`$${tax.toFixed(2)}`, 475, y, regular, 10);

    y -= 18;
    page.addRect(370, y - 5, 170, 25, {
      fill: { r: 50, g: 100, b: 150, a: 255 },
    });
    page.addText('TOTAL:', 380, y + 5, bold, 11);
    page.addText(`$${grandTotal.toFixed(2)}`, 470, y + 5, bold, 11);

    // Footer
    page.addText('Payment terms: Net 30', 72, 100, regular, 9);
    page.addText('Thank you for your business!', 72, 85, regular, 9);

    page.finalize();
  }

  const bytes = builder.save({ version: 17 });
  await fs.writeFile('invoice.pdf', bytes);
  console.log('Invoice created successfully');
}

createInvoice();
```

## See Also

- [PDFiumDocumentBuilder](/pdfium/api/classes/pdfium-document-builder/) — API reference
- [PDFiumPageBuilder](/pdfium/api/classes/pdfium-page-builder/) — Page content API
- [Add Text Guide](/pdfium/guides/add-text/) — Text positioning details
- [Add Shapes Guide](/pdfium/guides/add-shapes/) — Shape styling guide
