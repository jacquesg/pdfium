---
title: Annotations
description: Working with PDF annotations
---

PDF annotations are interactive or visual elements overlaid on page content. This guide explains how to read, create, modify, and remove annotations.

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

`getAnnotation()` returns a `PDFiumAnnotation` — a disposable wrapper with full read/write access:

```typescript
using page = document.getPage(0);
using annotation = page.getAnnotation(0);

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

`PDFiumAnnotation` provides both read-only and mutable access:

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `index` | `number` | Zero-based index on page |
| `type` | `AnnotationType` | Annotation subtype |
| `bounds` | `Rect` | Bounding rectangle |
| `colour` | `Colour \| null` | Stroke colour (cached) |
| `flags` | `AnnotationFlags` | Annotation flags bitmask |
| `objectCount` | `number` | Page objects inside (ink/stamp) |
| `contents` | `string \| undefined` | Text body (get/set) |
| `author` | `string \| undefined` | Author name (get/set) |
| `subject` | `string \| undefined` | Subject line (get/set) |

### Rect & Colour

```typescript
interface Rect {
  left: number;   // Left edge in points
  top: number;    // Top edge in points
  right: number;  // Right edge in points
  bottom: number; // Bottom edge in points
}

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

## Creating Annotations

Use `page.createAnnotation()` to add a new annotation:

```typescript
import { AnnotationType } from '@scaryterry/pdfium';

using page = document.getPage(0);

// Create a text (sticky note) annotation
using annot = page.createAnnotation(AnnotationType.Text);
if (annot) {
  annot.setRect({ left: 100, bottom: 700, right: 120, top: 720 });
  annot.setColour({ r: 255, g: 255, b: 0, a: 255 }); // Yellow
  annot.contents = 'Review this section';
  annot.author = 'Reviewer';
}
```

### Create a Highlight

```typescript
using annot = page.createAnnotation(AnnotationType.Highlight);
if (annot) {
  annot.setRect({ left: 72, bottom: 700, right: 300, top: 712 });
  annot.setColour({ r: 255, g: 255, b: 0, a: 128 });

  // Set quad points to define the highlighted region
  annot.appendAttachmentPoints({
    x1: 72, y1: 712,
    x2: 300, y2: 712,
    x3: 72, y3: 700,
    x4: 300, y4: 700,
  });
}
```

### Create an Ink Annotation

```typescript
using annot = page.createAnnotation(AnnotationType.Ink);
if (annot) {
  annot.setRect({ left: 50, bottom: 400, right: 200, top: 500 });
  annot.setColour({ r: 255, g: 0, b: 0, a: 255 });

  // Add freehand stroke points
  annot.addInkStroke([
    { x: 50, y: 450 },
    { x: 100, y: 480 },
    { x: 150, y: 420 },
    { x: 200, y: 460 },
  ]);
}
```

### Create a Link Annotation

```typescript
using annot = page.createAnnotation(AnnotationType.Link);
if (annot) {
  annot.setRect({ left: 72, bottom: 650, right: 200, top: 665 });
  annot.setURI('https://example.com');
}
```

### Check Supported Types

```typescript
// Check if an annotation type supports object manipulation
const supported = page.isAnnotationSubtypeSupported(AnnotationType.Stamp);
```

## Modifying Annotations

Open an existing annotation, change properties, and the changes persist when you save the document:

```typescript
using annot = page.getAnnotation(0);

// Update rectangle
annot.setRect({ left: 100, bottom: 700, right: 200, top: 750 });

// Change colours
annot.setColour({ r: 0, g: 128, b: 255, a: 255 });             // stroke
annot.setColour({ r: 200, g: 200, b: 255, a: 128 }, 'interior'); // fill

// Update text content
annot.contents = 'Updated comment text';
annot.author = 'Editor';

// Update border
annot.setBorder({ horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 });

// Update flags
annot.setFlags(0x04); // Print flag

// Set/clear appearance
annot.setAppearance('normal', undefined); // Clear to force re-render
```

### Dictionary Key/Value Access

Annotations store arbitrary key/value pairs in their PDF dictionary:

```typescript
using annot = page.getAnnotation(0);

// Check if a key exists
if (annot.hasKey('Contents')) {
  const value = annot.getStringValue('Contents');
  console.log(`Contents: ${value}`);
}

// Set a custom string value
annot.setStringValue('NM', 'unique-annotation-id');
```

## Removing Annotations

```typescript
using page = document.getPage(0);

// Remove annotation at index 0
const removed = page.removeAnnotation(0);
console.log(`Removed: ${removed}`);
```

:::caution
Removing an annotation shifts the indices of all subsequent annotations on the page. When removing multiple annotations, iterate in reverse order:

```typescript
for (let i = page.annotationCount - 1; i >= 0; i--) {
  const annot = page.getAnnotation(i);
  if (annot.type === AnnotationType.Highlight) {
    annot.dispose();
    page.removeAnnotation(i);
  }
}
```
:::

## Saving Changes

After creating or modifying annotations, save the document to persist changes:

```typescript
const bytes = document.save();
await fs.writeFile('annotated.pdf', bytes);
```

## See Also

- [PDFiumAnnotation](/pdfium/api/classes/pdfiumannotation/) — Annotation API reference
- [PDFiumPage](/pdfium/api/classes/pdfiumpage/) — Page API reference
- [AnnotationType Enum](/pdfium/api/enumerations/annotationtype/) — All annotation types
- [Render PDF Guide](/pdfium/guides/render-pdf/) — Rendering with annotations
