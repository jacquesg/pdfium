---
title: Add Text
description: Adding text to PDF pages with fonts and positioning
---

This guide covers adding text to PDF pages when creating documents from scratch using `PDFiumDocumentBuilder`.

## Prerequisites

- Familiarity with [Create Document](/pdfium/guides/create-document/) guide
- Understanding of [Coordinate Systems](/pdfium/concepts/coordinates/)

## Loading Fonts

Before adding text, you must load a font using `loadStandardFont()`:

```typescript
using pdfium = await PDFium.init();
using builder = pdfium.createDocument();

const helvetica = builder.loadStandardFont('Helvetica');
const helveticaBold = builder.loadStandardFont('Helvetica-Bold');
const times = builder.loadStandardFont('Times-Roman');
const courier = builder.loadStandardFont('Courier');
```

### Available Standard Fonts

| Font Name | Description |
|-----------|-------------|
| `Helvetica` | Sans-serif font (similar to Arial) |
| `Helvetica-Bold` | Bold variant |
| `Helvetica-Oblique` | Italic variant |
| `Helvetica-BoldOblique` | Bold italic variant |
| `Times-Roman` | Serif font (similar to Times New Roman) |
| `Times-Bold` | Bold variant |
| `Times-Italic` | Italic variant |
| `Times-BoldItalic` | Bold italic variant |
| `Courier` | Monospace font |
| `Courier-Bold` | Bold variant |
| `Courier-Oblique` | Italic variant |
| `Courier-BoldOblique` | Bold italic variant |
| `Symbol` | Symbol characters |
| `ZapfDingbats` | Decorative symbols |

## Adding Text

Use `addText()` on a `PDFiumPageBuilder`:

```typescript
page.addText(text, x, y, font, fontSize);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | `string` | The text content to add |
| `x` | `number` | X position in points (from left edge) |
| `y` | `number` | Y position in points (from bottom edge) |
| `font` | `FontHandle` | Font from `loadStandardFont()` |
| `fontSize` | `number` | Font size in points |

### Coordinate System

- Origin (0, 0) is at the **bottom-left** of the page
- X increases to the right
- Y increases upward
- Text is positioned at its **baseline** (not top or bottom)

```typescript
// US Letter page: 612 × 792 points
const page = builder.addPage();

// Text at top of page (y = 750, near the top)
page.addText('Header', 72, 750, font, 18);

// Text at bottom of page (y = 36, near the bottom)
page.addText('Footer', 72, 36, font, 10);
```

## Common Patterns

### Title and Body Text

```typescript
const font = builder.loadStandardFont('Helvetica');
const boldFont = builder.loadStandardFont('Helvetica-Bold');

const page = builder.addPage();

// Title
page.addText('Document Title', 72, 720, boldFont, 24);

// Subtitle
page.addText('A Comprehensive Guide', 72, 690, font, 14);

// Body text (1-inch margins = 72 points)
const lineHeight = 14;
let y = 650;

page.addText('This is the first paragraph of body text.', 72, y, font, 12);
y -= lineHeight;
page.addText('This is the second line of text.', 72, y, font, 12);
```

### Multi-line Text

PDF does not have automatic text wrapping. You must handle line breaks manually:

```typescript
function addMultilineText(
  page: PDFiumPageBuilder,
  text: string,
  x: number,
  startY: number,
  font: FontHandle,
  fontSize: number,
  lineHeight: number,
  maxWidth: number,
): number {
  const words = text.split(' ');
  let line = '';
  let y = startY;
  const charWidth = fontSize * 0.5; // Approximate character width

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = testLine.length * charWidth;

    if (testWidth > maxWidth && line) {
      page.addText(line, x, y, font, fontSize);
      line = word;
      y -= lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    page.addText(line, x, y, font, fontSize);
    y -= lineHeight;
  }

  return y; // Return final Y position
}

// Usage
const page = builder.addPage();
const font = builder.loadStandardFont('Helvetica');

const longText = 'This is a long paragraph that needs to wrap across multiple lines...';
addMultilineText(page, longText, 72, 700, font, 12, 16, 468); // 468 = 612 - 72*2
```

### Page Numbers

```typescript
function addPageNumber(
  page: PDFiumPageBuilder,
  pageNum: number,
  totalPages: number,
  font: FontHandle,
): void {
  const text = `Page ${pageNum} of ${totalPages}`;
  // Centre at bottom of page
  const approxWidth = text.length * 5;
  const x = (612 - approxWidth) / 2;
  page.addText(text, x, 36, font, 10);
}
```

### Headers and Footers

```typescript
async function createDocumentWithHeaderFooter() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const font = builder.loadStandardFont('Helvetica');
  const boldFont = builder.loadStandardFont('Helvetica-Bold');

  const pages = ['Page 1 content', 'Page 2 content', 'Page 3 content'];

  for (let i = 0; i < pages.length; i++) {
    const page = builder.addPage();

    // Header
    page.addText('Company Name', 72, 756, boldFont, 10);
    page.addText('Confidential', 450, 756, font, 10);

    // Content
    page.addText(pages[i]!, 72, 700, font, 12);

    // Footer
    page.addText(`Page ${i + 1} of ${pages.length}`, 280, 36, font, 10);
  }

  return builder.save();
}
```

## Complete Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function createTextDocument() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const helvetica = builder.loadStandardFont('Helvetica');
  const helveticaBold = builder.loadStandardFont('Helvetica-Bold');
  const courier = builder.loadStandardFont('Courier');

  const page = builder.addPage();

  // Title
  page.addText('PDF Text Example', 72, 720, helveticaBold, 24);

  // Section heading
  page.addText('1. Introduction', 72, 680, helveticaBold, 14);

  // Body text
  page.addText('This document demonstrates text capabilities.', 72, 655, helvetica, 12);
  page.addText('Multiple fonts and sizes can be used.', 72, 640, helvetica, 12);

  // Code example in monospace
  page.addText('Code Example:', 72, 600, helveticaBold, 12);
  page.addText('const x = 42;', 90, 580, courier, 11);
  page.addText('console.log(x);', 90, 565, courier, 11);

  // Footer
  page.addText('Generated by @scaryterry/pdfium', 200, 36, helvetica, 8);

  const pdfBytes = builder.save();
  await fs.writeFile('text-example.pdf', pdfBytes);
}

createTextDocument();
```

## Limitations

- **No automatic text wrapping** — you must calculate line breaks
- **No text measurement** — character widths must be estimated
- **Standard fonts only** — custom font embedding is not supported
- **No text colour** — text is rendered in black

## See Also

- [Create Document Guide](/pdfium/guides/create-document/) — Full document creation workflow
- [Add Shapes Guide](/pdfium/guides/add-shapes/) — Drawing rectangles
- [PDFiumPageBuilder](/pdfium/api/classes/pdfiumpagebuilder/) — Page builder API
- [Coordinate Systems](/pdfium/concepts/coordinates/) — Understanding PDF coordinates
