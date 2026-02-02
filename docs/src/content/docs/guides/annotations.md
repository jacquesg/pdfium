---
title: Annotations
description: Working with PDF annotations
---

PDF annotations are interactive or visual elements overlaid on page content. This guide explains how to read and inspect annotations.

## Overview

Annotations include:
- Text highlights, underlines, strikethroughs
- Comments and sticky notes
- Links and hyperlinks
- Form widgets
- Stamps and signatures
- Drawing markups

## Getting Annotations

### Single Annotation by Index

```typescript
using page = document.getPage(0);

const annotation = page.getAnnotation(0);
console.log(`Type: ${annotation.type}`);
console.log(`Bounds: ${JSON.stringify(annotation.bounds)}`);
```

### All Annotations

```typescript
const annotations = page.getAnnotations();
console.log(`Found ${annotations.length} annotations`);
```

### Check Annotation Count

```typescript
console.log(`Page has ${page.annotationCount} annotations`);
```

## Annotation Properties

Each annotation has:

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | Zero-based index on page |
| `type` | `AnnotationType` | Annotation subtype |
| `bounds` | `AnnotationBounds` | Bounding rectangle |
| `colour` | `Colour \| undefined` | Annotation colour (if set) |

### Bounds

```typescript
interface AnnotationBounds {
  left: number;   // Left edge in points
  top: number;    // Top edge in points
  right: number;  // Right edge in points
  bottom: number; // Bottom edge in points
}
```

### Colour

```typescript
interface Colour {
  r: number; // Red (0-255)
  g: number; // Green (0-255)
  b: number; // Blue (0-255)
  a: number; // Alpha (0-255, 255 = opaque)
}
```

## Annotation Types

The `AnnotationType` enum includes 28 types:

```typescript
import { AnnotationType } from '@scaryterry/pdfium';
```

### Text Markup

| Type | Description |
|------|-------------|
| `Highlight` | Yellow highlight |
| `Underline` | Underline markup |
| `Squiggly` | Wavy underline |
| `Strikeout` | Strikethrough |

### Comments

| Type | Description |
|------|-------------|
| `Text` | Sticky note (popup comment) |
| `FreeText` | Text box annotation |
| `Popup` | Popup window for comments |
| `Caret` | Insert text marker |

### Shapes

| Type | Description |
|------|-------------|
| `Line` | Line annotation |
| `Square` | Rectangle |
| `Circle` | Ellipse |
| `Polygon` | Closed polygon |
| `Ink` | Freehand drawing |

### Links & Actions

| Type | Description |
|------|-------------|
| `Link` | Hyperlink |
| `FileAttachment` | Embedded file |
| `Sound` | Audio annotation |
| `Screen` | Screen annotation |

### Forms & Widgets

| Type | Description |
|------|-------------|
| `Widget` | Form field |
| `XFAWidget` | XFA form field |

### Other

| Type | Description |
|------|-------------|
| `Stamp` | Stamp annotation |
| `PrinterMark` | Printer marks |
| `TrapNet` | Trapping annotation |
| `Watermark` | Watermark |
| `ThreeD` | 3D annotation |
| `RichMedia` | Rich media |
| `Redact` | Redaction |
| `Unknown` | Unknown type |

## Filtering by Type

### Find Highlights

```typescript
import { AnnotationType } from '@scaryterry/pdfium';

const highlights = page.getAnnotations()
  .filter(a => a.type === AnnotationType.Highlight);

console.log(`Found ${highlights.length} highlights`);
for (const h of highlights) {
  console.log(`Highlight at: ${JSON.stringify(h.bounds)}`);
  if (h.colour) {
    console.log(`Colour: rgba(${h.colour.r}, ${h.colour.g}, ${h.colour.b}, ${h.colour.a})`);
  }
}
```

### Find Links

```typescript
const links = page.getAnnotations()
  .filter(a => a.type === AnnotationType.Link);

console.log(`Found ${links.length} links`);
```

### Find Comments

```typescript
const commentTypes = [
  AnnotationType.Text,
  AnnotationType.FreeText,
  AnnotationType.Popup,
];

const comments = page.getAnnotations()
  .filter(a => commentTypes.includes(a.type));
```

### Find Form Fields

```typescript
const formFields = page.getAnnotations()
  .filter(a => a.type === AnnotationType.Widget);

console.log(`Found ${formFields.length} form fields`);
```

## Processing All Pages

```typescript
import { AnnotationType } from '@scaryterry/pdfium';

interface AnnotationSummary {
  pageIndex: number;
  type: AnnotationType;
  bounds: AnnotationBounds;
}

function getAllAnnotations(document: PDFiumDocument): AnnotationSummary[] {
  const result: AnnotationSummary[] = [];

  for (const page of document.pages()) {
    using p = page;

    for (const annot of p.getAnnotations()) {
      result.push({
        pageIndex: p.index,
        type: annot.type,
        bounds: annot.bounds,
      });
    }
  }

  return result;
}

// Usage
const allAnnotations = getAllAnnotations(document);
console.log(`Total annotations: ${allAnnotations.length}`);
```

## Annotation Statistics

```typescript
function getAnnotationStats(document: PDFiumDocument) {
  const stats = new Map<AnnotationType, number>();

  for (const page of document.pages()) {
    using p = page;

    for (const annot of p.getAnnotations()) {
      stats.set(annot.type, (stats.get(annot.type) || 0) + 1);
    }
  }

  return stats;
}

// Usage
const stats = getAnnotationStats(document);
for (const [type, count] of stats) {
  console.log(`${AnnotationType[type]}: ${count}`);
}
```

## Rendering with Annotations

By default, `render()` does **not** include annotations. Use `renderFormFields` for form widgets:

```typescript
// Without annotations (default)
const result1 = page.render({ scale: 2 });

// With form fields rendered
const result2 = page.render({ scale: 2, renderFormFields: true });
```

:::note
Currently, `renderFormFields` primarily affects interactive form widgets. Other annotation types may render automatically depending on the PDF.
:::

## Converting Annotation Bounds to Pixels

```typescript
function boundsToPixels(
  bounds: AnnotationBounds,
  pageHeight: number,
  scale: number
) {
  return {
    left: bounds.left * scale,
    top: (pageHeight - bounds.top) * scale, // Flip Y axis
    right: bounds.right * scale,
    bottom: (pageHeight - bounds.bottom) * scale,
  };
}

// Usage
const { width, height } = page.render({ scale: 2 });
const annotation = page.getAnnotation(0);
const pixelBounds = boundsToPixels(annotation.bounds, page.height, 2);
```

## Complete Example

```typescript
import { PDFium, AnnotationType } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function analyseAnnotations(filename: string) {
  const data = await fs.readFile(filename);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  console.log(`Analysing annotations in ${filename}`);
  console.log(`Total pages: ${document.pageCount}\n`);

  const typeCounts = new Map<AnnotationType, number>();

  for (const page of document.pages()) {
    using p = page;

    if (p.annotationCount === 0) continue;

    console.log(`Page ${p.index + 1}: ${p.annotationCount} annotations`);

    for (const annot of p.getAnnotations()) {
      typeCounts.set(annot.type, (typeCounts.get(annot.type) || 0) + 1);

      const typeName = AnnotationType[annot.type] || 'Unknown';
      const { left, top, right, bottom } = annot.bounds;

      console.log(`  [${typeName}] at (${left.toFixed(1)}, ${top.toFixed(1)}) - ` +
                  `(${right.toFixed(1)}, ${bottom.toFixed(1)})`);

      if (annot.colour) {
        const { r, g, b, a } = annot.colour;
        console.log(`    Colour: rgba(${r}, ${g}, ${b}, ${a})`);
      }
    }
  }

  console.log('\nSummary:');
  for (const [type, count] of typeCounts) {
    const typeName = AnnotationType[type] || 'Unknown';
    console.log(`  ${typeName}: ${count}`);
  }
}

analyseAnnotations('document.pdf');
```

## See Also

- [PDFiumPage](/pdfium/api/classes/pdfium-page/) — Page API reference
- [AnnotationType Enum](/pdfium/api/enums/annotation-type/) — All annotation types
- [Render PDF Guide](/pdfium/guides/render-pdf/) — Rendering with annotations
