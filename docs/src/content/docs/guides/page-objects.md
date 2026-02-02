---
title: Page Objects
description: Inspecting and working with page content objects
---

This guide covers inspecting page objects — the individual elements (text, images, paths, etc.) that make up a PDF page.

## What are Page Objects?

PDF pages contain multiple **page objects**:

- **Text objects** — Text strings with font and position
- **Image objects** — Embedded images
- **Path objects** — Lines, curves, and shapes
- **Shading objects** — Gradient fills
- **Form objects** — XObject forms (reusable content)

## Prerequisites

- Familiarity with [Open Document](/pdfium/guides/open-document/)
- Understanding of [Coordinate Systems](/pdfium/concepts/coordinates/)

## Getting Page Objects

Use `getObjects()` to retrieve all objects on a page:

```typescript
using pdfium = await PDFium.init();
using document = await pdfium.openDocument(pdfData);
using page = document.getPage(0);

const objects = page.getObjects();
console.log(`Page has ${objects.length} objects`);
```

## PageObject Types

Each object has a `type` property from `PageObjectType`:

```typescript
import { PageObjectType } from '@scaryterry/pdfium';

for (const obj of objects) {
  switch (obj.type) {
    case PageObjectType.Text:
      console.log(`Text: "${obj.text}" (${obj.fontSize}pt)`);
      break;
    case PageObjectType.Image:
      console.log(`Image: ${obj.width}×${obj.height}`);
      break;
    case PageObjectType.Path:
      console.log('Path object');
      break;
    case PageObjectType.Shading:
      console.log('Shading object');
      break;
    case PageObjectType.Form:
      console.log('Form XObject');
      break;
    case PageObjectType.Unknown:
      console.log('Unknown object type');
      break;
  }
}
```

### PageObjectType Enum

| Value | Description |
|-------|-------------|
| `Unknown` | Unknown or unsupported object type |
| `Text` | Text string with font information |
| `Path` | Vector path (lines, curves, shapes) |
| `Image` | Embedded bitmap image |
| `Shading` | Gradient or shading pattern |
| `Form` | Form XObject (reusable content group) |

## Object Properties

### Common Properties (All Objects)

All page objects have bounding box coordinates:

```typescript
interface PageObjectBase {
  type: PageObjectType;
  bounds: {
    left: number;    // Left edge in points
    top: number;     // Top edge in points
    right: number;   // Right edge in points
    bottom: number;  // Bottom edge in points
  };
}
```

### Text Object Properties

```typescript
interface TextObject extends PageObjectBase {
  type: PageObjectType.Text;
  text: string;      // The text content
  fontSize: number;  // Font size in points
}
```

### Image Object Properties

```typescript
interface ImageObject extends PageObjectBase {
  type: PageObjectType.Image;
  width: number;   // Image width in pixels
  height: number;  // Image height in pixels
}
```

### Path, Shading, Form Objects

These only have the base properties (type and bounds).

## Common Patterns

### Filter by Type

```typescript
import { PageObjectType } from '@scaryterry/pdfium';

const objects = page.getObjects();

// Get only text objects
const textObjects = objects.filter(
  (obj): obj is TextObject => obj.type === PageObjectType.Text
);

// Get only images
const imageObjects = objects.filter(
  (obj): obj is ImageObject => obj.type === PageObjectType.Image
);
```

### Extract All Text with Positions

```typescript
function getTextWithPositions(page: PDFiumPage) {
  const objects = page.getObjects();

  return objects
    .filter((obj): obj is TextObject => obj.type === PageObjectType.Text)
    .map(obj => ({
      text: obj.text,
      x: obj.bounds.left,
      y: obj.bounds.bottom,
      fontSize: obj.fontSize,
    }));
}

const textItems = getTextWithPositions(page);
for (const item of textItems) {
  console.log(`"${item.text}" at (${item.x}, ${item.y}), ${item.fontSize}pt`);
}
```

### Find Objects in Region

```typescript
function getObjectsInRegion(
  page: PDFiumPage,
  left: number,
  bottom: number,
  right: number,
  top: number,
): PageObject[] {
  return page.getObjects().filter(obj => {
    const b = obj.bounds;
    return b.left >= left && b.right <= right &&
           b.bottom >= bottom && b.top <= top;
  });
}

// Get objects in top half of page
const topHalf = getObjectsInRegion(page, 0, 396, 612, 792);
```

### Count Objects by Type

```typescript
function countObjectsByType(page: PDFiumPage): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const obj of page.getObjects()) {
    const typeName = PageObjectType[obj.type];
    counts[typeName] = (counts[typeName] ?? 0) + 1;
  }

  return counts;
}

const counts = countObjectsByType(page);
console.log(counts);
// { Text: 45, Image: 3, Path: 12 }
```

### Find Largest Image

```typescript
function findLargestImage(page: PDFiumPage): ImageObject | undefined {
  const images = page.getObjects().filter(
    (obj): obj is ImageObject => obj.type === PageObjectType.Image
  );

  if (images.length === 0) return undefined;

  return images.reduce((largest, current) => {
    const largestArea = largest.width * largest.height;
    const currentArea = current.width * current.height;
    return currentArea > largestArea ? current : largest;
  });
}

const largest = findLargestImage(page);
if (largest) {
  console.log(`Largest image: ${largest.width}×${largest.height}`);
}
```

### Analyse Document Structure

```typescript
async function analyseDocument(pdfData: Uint8Array) {
  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(pdfData);

  const analysis = {
    totalPages: document.pageCount,
    totalObjects: 0,
    textObjects: 0,
    imageObjects: 0,
    pathObjects: 0,
    otherObjects: 0,
  };

  for (let i = 0; i < document.pageCount; i++) {
    using page = document.getPage(i);
    const objects = page.getObjects();

    analysis.totalObjects += objects.length;

    for (const obj of objects) {
      switch (obj.type) {
        case PageObjectType.Text:
          analysis.textObjects++;
          break;
        case PageObjectType.Image:
          analysis.imageObjects++;
          break;
        case PageObjectType.Path:
          analysis.pathObjects++;
          break;
        default:
          analysis.otherObjects++;
      }
    }
  }

  return analysis;
}
```

## Complete Example

```typescript
import { PDFium, PageObjectType, type TextObject, type ImageObject } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function inspectPageObjects(filePath: string) {
  const pdfData = await fs.readFile(filePath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(pdfData);

  console.log(`Document: ${filePath}`);
  console.log(`Pages: ${document.pageCount}\n`);

  for (let pageIndex = 0; pageIndex < document.pageCount; pageIndex++) {
    using page = document.getPage(pageIndex);
    const objects = page.getObjects();

    console.log(`=== Page ${pageIndex + 1} ===`);
    console.log(`Objects: ${objects.length}`);

    // Group by type
    const byType = new Map<PageObjectType, PageObject[]>();
    for (const obj of objects) {
      const list = byType.get(obj.type) ?? [];
      list.push(obj);
      byType.set(obj.type, list);
    }

    // Report text objects
    const textObjs = byType.get(PageObjectType.Text) as TextObject[] | undefined;
    if (textObjs?.length) {
      console.log(`\nText objects (${textObjs.length}):`);
      for (const text of textObjs.slice(0, 5)) {
        const preview = text.text.substring(0, 40);
        console.log(`  "${preview}${text.text.length > 40 ? '...' : ''}" (${text.fontSize}pt)`);
      }
      if (textObjs.length > 5) {
        console.log(`  ... and ${textObjs.length - 5} more`);
      }
    }

    // Report image objects
    const imageObjs = byType.get(PageObjectType.Image) as ImageObject[] | undefined;
    if (imageObjs?.length) {
      console.log(`\nImage objects (${imageObjs.length}):`);
      for (const img of imageObjs) {
        const { left, bottom, right, top } = img.bounds;
        console.log(`  ${img.width}×${img.height}px at (${left.toFixed(0)}, ${bottom.toFixed(0)})`);
      }
    }

    // Report other types
    const pathCount = byType.get(PageObjectType.Path)?.length ?? 0;
    const shadingCount = byType.get(PageObjectType.Shading)?.length ?? 0;
    const formCount = byType.get(PageObjectType.Form)?.length ?? 0;

    if (pathCount + shadingCount + formCount > 0) {
      console.log(`\nOther objects:`);
      if (pathCount) console.log(`  Paths: ${pathCount}`);
      if (shadingCount) console.log(`  Shadings: ${shadingCount}`);
      if (formCount) console.log(`  Forms: ${formCount}`);
    }

    console.log('');
  }
}

inspectPageObjects('document.pdf').catch(console.error);
```

## Performance Considerations

- `getObjects()` loads all objects into memory at once
- For pages with many objects (1000+), consider processing in batches
- Object bounds are computed on demand and cached

## Limitations

- Object modification is not supported (read-only access)
- Path geometry (control points) is not exposed
- Font name and style information is not available
- Image raw data is not accessible through `getObjects()` (use [Extract Images](/pdfium/guides/extract-images/) instead)

## See Also

- [Extract Images Guide](/pdfium/guides/extract-images/) — Extracting image data
- [Extract Text Guide](/pdfium/guides/extract-text/) — Text extraction methods
- [PageObjectType](/pdfium/api/enums/page-object-type/) — Object type enum
- [PDFiumPage](/pdfium/api/classes/pdfium-page/) — Page API reference
