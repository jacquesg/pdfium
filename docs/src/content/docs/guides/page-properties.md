---
title: Page Properties
description: Accessing page dimensions, rotation, and counts
---

This guide covers how to access and work with page properties.

## Page Dimensions

### Size Object

```typescript
using page = document.getPage(0);

const size = page.size;
console.log(`Width: ${size.width} points`);
console.log(`Height: ${size.height} points`);
```

### Individual Properties

```typescript
console.log(`Width: ${page.width} points`);
console.log(`Height: ${page.height} points`);
```

### Convert to Other Units

```typescript
// Points to inches
const widthInches = page.width / 72;
const heightInches = page.height / 72;

// Points to centimetres
const widthCM = page.width * 0.0352778;
const heightCM = page.height * 0.0352778;

// Points to millimetres
const widthMM = page.width * 0.352778;
const heightMM = page.height * 0.352778;
```

### Detect Page Format

```typescript
function detectPageFormat(width: number, height: number): string {
  // Allow 1 point tolerance
  const formats: Record<string, [number, number]> = {
    'US Letter': [612, 792],
    'US Legal': [612, 1008],
    'A4': [595, 842],
    'A3': [842, 1191],
    'A5': [420, 595],
  };

  for (const [name, [w, h]] of Object.entries(formats)) {
    if (Math.abs(width - w) < 1 && Math.abs(height - h) < 1) {
      return name;
    }
    // Check landscape
    if (Math.abs(width - h) < 1 && Math.abs(height - w) < 1) {
      return `${name} (Landscape)`;
    }
  }

  return `Custom (${width} × ${height} pt)`;
}

const format = detectPageFormat(page.width, page.height);
console.log(`Page format: ${format}`);
```

## Page Rotation

```typescript
import { PageRotation } from '@scaryterry/pdfium';

const rotation = page.rotation;

switch (rotation) {
  case PageRotation.None:
    console.log('No rotation (0°)');
    break;
  case PageRotation.Clockwise90:
    console.log('Rotated 90° clockwise');
    break;
  case PageRotation.Rotate180:
    console.log('Rotated 180°');
    break;
  case PageRotation.CounterClockwise90:
    console.log('Rotated 270° (90° counter-clockwise)');
    break;
}
```

### Effective Dimensions

For rotated pages, effective dimensions may differ:

```typescript
function getEffectiveDimensions(page: PDFiumPage) {
  const isRotated90 =
    page.rotation === PageRotation.Clockwise90 ||
    page.rotation === PageRotation.CounterClockwise90;

  return isRotated90
    ? { width: page.height, height: page.width }
    : { width: page.width, height: page.height };
}
```

## Page Index

```typescript
// Zero-based index
console.log(`Page index: ${page.index}`);
console.log(`Page number: ${page.index + 1}`);
```

## Object and Annotation Counts

```typescript
// Number of content objects
console.log(`Objects: ${page.objectCount}`);

// Number of annotations
console.log(`Annotations: ${page.annotationCount}`);
```

## All Pages Summary

```typescript
interface PageInfo {
  index: number;
  width: number;
  height: number;
  rotation: PageRotation;
  objects: number;
  annotations: number;
}

function getDocumentPageInfo(document: PDFiumDocument): PageInfo[] {
  const pages: PageInfo[] = [];

  for (const page of document.pages()) {
    using p = page;
    pages.push({
      index: p.index,
      width: p.width,
      height: p.height,
      rotation: p.rotation,
      objects: p.objectCount,
      annotations: p.annotationCount,
    });
  }

  return pages;
}

const pageInfo = getDocumentPageInfo(document);
for (const info of pageInfo) {
  console.log(
    `Page ${info.index + 1}: ` +
    `${info.width}×${info.height} pt, ` +
    `${info.objects} objects, ` +
    `${info.annotations} annotations`
  );
}
```

## Document Statistics

```typescript
interface DocumentStats {
  pageCount: number;
  totalObjects: number;
  totalAnnotations: number;
  uniqueSizes: Set<string>;
  hasRotatedPages: boolean;
}

function getDocumentStats(document: PDFiumDocument): DocumentStats {
  const stats: DocumentStats = {
    pageCount: document.pageCount,
    totalObjects: 0,
    totalAnnotations: 0,
    uniqueSizes: new Set(),
    hasRotatedPages: false,
  };

  for (const page of document.pages()) {
    using p = page;
    stats.totalObjects += p.objectCount;
    stats.totalAnnotations += p.annotationCount;
    stats.uniqueSizes.add(`${p.width}×${p.height}`);
    if (p.rotation !== PageRotation.None) {
      stats.hasRotatedPages = true;
    }
  }

  return stats;
}
```

## Complete Example

```typescript
import { PDFium, PageRotation } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function analyseDocument(filePath: string) {
  const data = await fs.readFile(filePath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  console.log(`File: ${filePath}`);
  console.log(`Pages: ${document.pageCount}`);
  console.log(`Attachments: ${document.attachmentCount}`);
  console.log(`Bookmarks: ${document.getBookmarks().length}`);
  console.log();

  for (const page of document.pages()) {
    using p = page;

    const widthIn = (p.width / 72).toFixed(2);
    const heightIn = (p.height / 72).toFixed(2);
    const rotation = PageRotation[p.rotation];

    console.log(`Page ${p.index + 1}:`);
    console.log(`  Size: ${p.width} × ${p.height} pt (${widthIn}" × ${heightIn}")`);
    console.log(`  Rotation: ${rotation}`);
    console.log(`  Objects: ${p.objectCount}`);
    console.log(`  Annotations: ${p.annotationCount}`);
  }
}

analyseDocument('document.pdf');
```

## See Also

- [PDFiumPage](/pdfium/api/classes/pdfiumpage/) — Page API reference
- [PageRotation](/pdfium/api/enumerations/pagerotation/) — Rotation values
- [Render PDF Guide](/pdfium/guides/render-pdf/) — Rendering pages
- [Coordinates](/pdfium/concepts/coordinates/) — Coordinate system
