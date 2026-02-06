---
title: Add Pages
description: Creating and managing pages in PDF documents
---

This guide covers adding and managing pages when creating PDF documents from scratch using `PDFiumDocumentBuilder`.

## Prerequisites

- Familiarity with [Create Document](/pdfium/guides/create-document/) guide

## Creating Pages

Use `addPage()` on `PDFiumDocumentBuilder` to create new pages:

```typescript
using pdfium = await PDFium.init();
using builder = pdfium.createDocument();

// Add a page with default dimensions (US Letter)
const page = builder.addPage();
```

### Page Dimensions

By default, pages are created with US Letter dimensions (612 × 792 points = 8.5 × 11 inches).

```typescript
// Custom dimensions
const page = builder.addPage({
  width: 595,   // A4 width in points
  height: 842,  // A4 height in points
});
```

### Common Page Sizes

| Size | Width (points) | Height (points) | Inches |
|------|----------------|-----------------|--------|
| US Letter | 612 | 792 | 8.5 × 11 |
| US Legal | 612 | 1008 | 8.5 × 14 |
| A4 | 595 | 842 | 8.27 × 11.69 |
| A5 | 420 | 595 | 5.83 × 8.27 |
| A3 | 842 | 1191 | 11.69 × 16.54 |

:::note
1 inch = 72 points. To convert inches to points, multiply by 72.
:::

### Landscape Orientation

Swap width and height for landscape:

```typescript
// Landscape US Letter
const page = builder.addPage({
  width: 792,
  height: 612,
});
```

## Adding Multiple Pages

### Sequential Page Creation

```typescript
using pdfium = await PDFium.init();
using builder = pdfium.createDocument();

const font = builder.loadStandardFont('Helvetica');

// Create 5 pages
for (let i = 0; i < 5; i++) {
  const page = builder.addPage();
  page.addText(`Page ${i + 1}`, 72, 720, font, 24);
}

const pdfBytes = builder.save();
```

### Pages with Different Sizes

```typescript
using builder = pdfium.createDocument();

// Cover page (US Letter)
const cover = builder.addPage({ width: 612, height: 792 });
cover.addText('Cover Page', 200, 400, font, 36);

// Content pages (A4)
for (let i = 0; i < 10; i++) {
  const page = builder.addPage({ width: 595, height: 842 });
  page.addText(`Chapter ${i + 1}`, 72, 780, font, 18);
}

// Appendix (US Legal)
const appendix = builder.addPage({ width: 612, height: 1008 });
appendix.addText('Appendix', 72, 950, font, 18);
```

## Page Count

Access the current page count:

```typescript
console.log(`Document has ${builder.pageCount} pages`);
```

## Deleting Pages

Remove pages by index using `deletePage()`:

```typescript
// Delete the second page (index 1)
builder.deletePage(1);
```

:::caution
Deleting a page shifts the indices of all subsequent pages. Delete from highest index to lowest when removing multiple pages.
:::

### Deleting Multiple Pages

```typescript
// Delete pages 3, 5, and 7 (indices 2, 4, 6)
// Delete in reverse order to maintain correct indices
const indicesToDelete = [6, 4, 2];
for (const index of indicesToDelete) {
  builder.deletePage(index);
}
```

## Common Patterns

### Document with Cover and Content

```typescript
async function createDocumentWithCover(
  title: string,
  chapters: string[],
) {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const font = builder.loadStandardFont('Helvetica');
  const boldFont = builder.loadStandardFont('Helvetica-Bold');

  // Cover page
  const cover = builder.addPage();
  cover.addText(title, 150, 450, boldFont, 36);
  cover.addText('Generated Document', 200, 400, font, 14);

  // Table of contents
  const toc = builder.addPage();
  toc.addText('Table of Contents', 72, 720, boldFont, 18);

  let tocY = 680;
  chapters.forEach((chapter, i) => {
    toc.addText(`${i + 1}. ${chapter}`, 90, tocY, font, 12);
    tocY -= 20;
  });

  // Chapter pages
  for (const chapter of chapters) {
    const page = builder.addPage();
    page.addText(chapter, 72, 720, boldFont, 18);
    page.addText('Chapter content goes here...', 72, 680, font, 12);
  }

  return builder.save();
}
```

### Multi-page Report

```typescript
async function createReport(data: ReportData[]) {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const font = builder.loadStandardFont('Helvetica');
  const boldFont = builder.loadStandardFont('Helvetica-Bold');

  const itemsPerPage = 20;
  const totalPages = Math.ceil(data.length / itemsPerPage);

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const page = builder.addPage();

    // Header
    page.addText('Monthly Report', 72, 750, boldFont, 18);
    page.addText(`Page ${pageNum + 1} of ${totalPages}`, 480, 750, font, 10);

    // Content
    const startIndex = pageNum * itemsPerPage;
    const pageData = data.slice(startIndex, startIndex + itemsPerPage);

    let y = 700;
    for (const item of pageData) {
      page.addText(`${item.name}: ${item.value}`, 72, y, font, 11);
      y -= 16;
    }

    // Footer
    page.addText(`Generated: ${new Date().toLocaleDateString()}`, 72, 36, font, 8);
  }

  return builder.save();
}
```

### Business Card (Small Page)

```typescript
async function createBusinessCard() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const font = builder.loadStandardFont('Helvetica');
  const boldFont = builder.loadStandardFont('Helvetica-Bold');

  // Business card: 3.5" × 2"
  const page = builder.addPage({
    width: 252,   // 3.5 * 72
    height: 144,  // 2 * 72
  });

  page.addText('Jane Smith', 18, 100, boldFont, 14);
  page.addText('Software Engineer', 18, 82, font, 10);
  page.addText('jane@example.com', 18, 50, font, 8);
  page.addText('+44 20 1234 5678', 18, 38, font, 8);

  return builder.save();
}
```

## Complete Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function createMultiPageDocument() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const font = builder.loadStandardFont('Helvetica');
  const boldFont = builder.loadStandardFont('Helvetica-Bold');

  // Page 1: Title page (US Letter)
  const titlePage = builder.addPage();
  titlePage.addRectangle(0, 0, 612, 792, {
    fill: { r: 30, g: 60, b: 90, a: 255 },
  });
  titlePage.addText('Annual Report 2024', 150, 450, boldFont, 32);

  // Page 2: Executive Summary (US Letter)
  const summaryPage = builder.addPage();
  summaryPage.addText('Executive Summary', 72, 720, boldFont, 18);
  summaryPage.addText('Key highlights from the year...', 72, 680, font, 12);

  // Pages 3-5: Content pages (A4 for international readers)
  for (let i = 1; i <= 3; i++) {
    const contentPage = builder.addPage({ width: 595, height: 842 });
    contentPage.addText(`Section ${i}`, 72, 780, boldFont, 16);
    contentPage.addText(`Content for section ${i}...`, 72, 750, font, 11);
  }

  // Page 6: Appendix (US Legal for detailed tables)
  const appendixPage = builder.addPage({ width: 612, height: 1008 });
  appendixPage.addText('Appendix: Detailed Data', 72, 950, boldFont, 18);

  console.log(`Created document with ${builder.pageCount} pages`);

  const pdfBytes = builder.save();
  await fs.writeFile('multi-page-report.pdf', pdfBytes);
}

createMultiPageDocument();
```

## See Also

- [Create Document Guide](/pdfium/guides/create-document/) — Full document creation workflow
- [Add Text Guide](/pdfium/guides/add-text/) — Adding text content
- [Add Shapes Guide](/pdfium/guides/add-shapes/) — Drawing rectangles
- [Save Document Guide](/pdfium/guides/save-document/) — Saving options
- [PDFiumDocumentBuilder](/pdfium/api/classes/pdfiumdocumentbuilder/) — Document builder API
