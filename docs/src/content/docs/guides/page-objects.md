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

:::tip[Large Pages]
For pages with many objects, use the `objects()` generator for lazy iteration:

```typescript
for (const obj of page.objects()) {
  // Objects are yielded one at a time — no array allocation
}
```
:::

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

All page objects extend `PDFiumPageObject`, which provides:

```typescript
import { PDFiumPageObject } from '@scaryterry/pdfium';

obj.type;           // PageObjectType
obj.bounds;         // { left, top, right, bottom } in points
obj.fillColour;     // Colour | null
obj.strokeColour;   // Colour | null
obj.strokeWidth;    // number | null
obj.matrix;         // TransformMatrix | null
obj.lineCap;        // LineCapStyle
obj.lineJoin;       // LineJoinStyle
obj.dashPattern;    // DashPattern | null
obj.hasTransparency; // boolean
obj.rotatedBounds;  // QuadPoints | null
obj.markCount;      // number — content marks
obj.marks;          // PageObjectMark[]
```

### PDFiumTextObject

Text objects expose content, font size, render mode, and font access:

```typescript
import { PDFiumTextObject } from '@scaryterry/pdfium';

// PDFiumTextObject extends PDFiumPageObject
obj.text;           // The text content
obj.fontSize;       // Font size in points
obj.renderMode;     // TextRenderMode (Fill, Stroke, etc.)
obj.getFont();      // PDFiumFont | null (dispose when done)
```

### PDFiumImageObject

Image objects expose dimensions, raw data, and metadata:

```typescript
import { PDFiumImageObject } from '@scaryterry/pdfium';

// PDFiumImageObject extends PDFiumPageObject
obj.width;           // Image width in pixels
obj.height;          // Image height in pixels
obj.getDecodedData(); // Uint8Array | null — decoded pixel data
obj.getRawData();     // Uint8Array | null — raw compressed data
obj.getMetadata();    // ImageMetadata | null — colour space, bpp, etc.
```

### PDFiumPathObject

Path objects expose segments and drawing operations:

```typescript
import { PDFiumPathObject, PDFiumPathSegment } from '@scaryterry/pdfium';

// PDFiumPathObject extends PDFiumPageObject
obj.segmentCount;        // Number of segments
obj.getSegment(0);       // PDFiumPathSegment | null
obj.getDrawMode();       // { fillMode, stroke } | null

// PDFiumPathSegment
segment.point;    // { x, y } | null
segment.type;     // PathSegmentType (MoveTo, LineTo, BezierTo)
segment.isClosing; // Whether this segment closes the subpath
```

### Shading, Form Objects

These only have the base properties (type and bounds).

## Common Patterns

### Filter by Type

```typescript
import { PageObjectType, PDFiumTextObject, PDFiumImageObject } from '@scaryterry/pdfium';

const objects = page.getObjects();

// Get only text objects
const textObjects = objects.filter(
  (obj): obj is PDFiumTextObject => obj.type === PageObjectType.Text
);

// Get only images
const imageObjects = objects.filter(
  (obj): obj is PDFiumImageObject => obj.type === PageObjectType.Image
);
```

### Extract All Text with Positions

```typescript
function getTextWithPositions(page: PDFiumPage) {
  const objects = page.getObjects();

  return objects
    .filter((obj): obj is PDFiumTextObject => obj.type === PageObjectType.Text)
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
function findLargestImage(page: PDFiumPage): PDFiumImageObject | undefined {
  const images = page.getObjects().filter(
    (obj): obj is PDFiumImageObject => obj.type === PageObjectType.Image
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

### Font Inspection

Text objects provide access to their font via `getFont()`, which returns a `PDFiumFont` instance:

```typescript
import { PDFiumTextObject, PDFiumFont, PageObjectType } from '@scaryterry/pdfium';

using page = document.getPage(0);

for (const obj of page.objects()) {
  if (obj.type === PageObjectType.Text) {
    const textObj = obj as PDFiumTextObject;
    using font = textObj.getFont();

    if (font) {
      console.log(`Family: ${font.familyName}`);
      console.log(`PostScript name: ${font.fontName}`);
      console.log(`Weight: ${font.weight}`);
      console.log(`Italic angle: ${font.italicAngle}`);
      console.log(`Embedded: ${font.isEmbedded}`);
    }
  }
}
```

#### `PDFiumFont` Properties

| Property | Type | Description |
|----------|------|-------------|
| `familyName` | `string` | Family name (e.g., 'Helvetica', 'Times New Roman') |
| `fontName` | `string` | PostScript/base font name |
| `weight` | `number` | Font weight (100–900; 400 = normal, 700 = bold) |
| `italicAngle` | `number` | Italic angle in degrees (0 for upright) |
| `isEmbedded` | `boolean` | Whether the font data is embedded in the PDF |
| `isFixedPitch` | `boolean` | Whether the font is monospaced |
| `isSerif` | `boolean` | Whether the font has serifs |
| `isItalic` | `boolean` | Whether the font is italic |
| `isBold` | `boolean` | Whether the font is bold (weight >= 700 or ForceBold flag) |

#### `PDFiumFont` Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getInfo()` | `FontInfo` | All font properties in a single object (more efficient than individual reads) |
| `getMetrics(fontSize)` | `FontMetrics` | Ascent and descent at a given font size in points |
| `getGlyphWidth(glyphIndex, fontSize)` | `number` | Width of a specific glyph at a given size |
| `getFontData()` | `Uint8Array \| undefined` | Raw embedded font data (returns `undefined` if not embedded) |

#### Batch Font Analysis

Collect unique fonts across an entire document:

```typescript
async function collectFonts(document: PDFiumDocument) {
  const fonts = new Map<string, FontInfo>();

  for (let i = 0; i < document.pageCount; i++) {
    using page = document.getPage(i);

    for (const obj of page.objects()) {
      if (obj.type !== PageObjectType.Text) continue;

      const textObj = obj as PDFiumTextObject;
      using font = textObj.getFont();
      if (!font) continue;

      const info = font.getInfo();
      if (!fonts.has(info.familyName)) {
        fonts.set(info.familyName, info);
      }
    }
  }

  return [...fonts.values()];
}
```

:::tip
`PDFiumFont` holds a borrow on the parent page's native resources. Always dispose fonts (or use `using`) before disposing the page to avoid keeping page memory alive longer than necessary.
:::

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
import { PDFium, PageObjectType, PDFiumTextObject, PDFiumImageObject } from '@scaryterry/pdfium';
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
    const textObjs = byType.get(PageObjectType.Text) as PDFiumTextObject[] | undefined;
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
    const imageObjs = byType.get(PageObjectType.Image) as PDFiumImageObject[] | undefined;
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

- `getObjects()` loads all objects into memory at once — use `objects()` generator for lazy iteration on large pages
- The `objects()` generator yields objects one at a time without array allocation
- Object bounds are computed on demand and cached

## Limitations

- Shading and Form XObject content is not inspectable beyond bounds
- Image raw data requires calling `getDecodedData()` or `getRawData()` on the `PDFiumImageObject` directly

## See Also

- [Extract Images Guide](/pdfium/guides/extract-images/) — Extracting image data
- [Extract Text Guide](/pdfium/guides/extract-text/) — Text extraction methods
- [PageObjectType](/pdfium/api/enumerations/pageobjecttype/) — Object type enum
- [PDFiumPage](/pdfium/api/classes/pdfiumpage/) — Page API reference
