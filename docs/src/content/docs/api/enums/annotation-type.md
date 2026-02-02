---
title: AnnotationType
description: PDF annotation subtypes
---

Identifies the type (subtype) of a PDF annotation.

## Import

```typescript
import { AnnotationType } from '@scaryterry/pdfium';
```

## Values

| Member | Value | Description |
|--------|-------|-------------|
| `Unknown` | 0 | Unknown annotation type |
| `Text` | 1 | Sticky note (popup comment) |
| `Link` | 2 | Hyperlink |
| `FreeText` | 3 | Text box |
| `Line` | 4 | Line annotation |
| `Square` | 5 | Rectangle |
| `Circle` | 6 | Ellipse |
| `Polygon` | 7 | Closed polygon |
| `Highlight` | 8 | Yellow highlight |
| `Underline` | 9 | Underline markup |
| `Squiggly` | 10 | Wavy underline |
| `Strikeout` | 11 | Strikethrough |
| `Stamp` | 12 | Stamp annotation |
| `Caret` | 13 | Insert text marker |
| `Ink` | 14 | Freehand drawing |
| `Popup` | 15 | Popup window |
| `FileAttachment` | 16 | Embedded file |
| `Sound` | 17 | Audio annotation |
| `Widget` | 20 | Form field |
| `Screen` | 21 | Screen annotation |
| `PrinterMark` | 22 | Printer marks |
| `TrapNet` | 23 | Trapping annotation |
| `Watermark` | 24 | Watermark |
| `ThreeD` | 25 | 3D annotation |
| `RichMedia` | 26 | Rich media |
| `XFAWidget` | 27 | XFA form field |
| `Redact` | 28 | Redaction |

## Categories

### Text Markup

```typescript
const textMarkupTypes = [
  AnnotationType.Highlight,
  AnnotationType.Underline,
  AnnotationType.Squiggly,
  AnnotationType.Strikeout,
];
```

### Comments

```typescript
const commentTypes = [
  AnnotationType.Text,      // Sticky note
  AnnotationType.FreeText,  // Text box
  AnnotationType.Popup,     // Popup window
  AnnotationType.Caret,     // Insert marker
];
```

### Shapes

```typescript
const shapeTypes = [
  AnnotationType.Line,
  AnnotationType.Square,
  AnnotationType.Circle,
  AnnotationType.Polygon,
  AnnotationType.Ink,
];
```

### Links & Media

```typescript
const mediaTypes = [
  AnnotationType.Link,
  AnnotationType.FileAttachment,
  AnnotationType.Sound,
  AnnotationType.Screen,
  AnnotationType.RichMedia,
];
```

### Forms

```typescript
const formTypes = [
  AnnotationType.Widget,
  AnnotationType.XFAWidget,
];
```

## Usage

### Filter Annotations

```typescript
import { AnnotationType } from '@scaryterry/pdfium';

// Find all highlights
const highlights = page.getAnnotations()
  .filter(a => a.type === AnnotationType.Highlight);

// Find all links
const links = page.getAnnotations()
  .filter(a => a.type === AnnotationType.Link);

// Find all form fields
const formFields = page.getAnnotations()
  .filter(a => a.type === AnnotationType.Widget);
```

### Get Readable Name

```typescript
function getAnnotationTypeName(type: AnnotationType): string {
  return AnnotationType[type] || 'Unknown';
}

for (const annot of page.getAnnotations()) {
  console.log(`${getAnnotationTypeName(annot.type)} at ${JSON.stringify(annot.bounds)}`);
}
```

### Statistics

```typescript
function getAnnotationStats(document: PDFiumDocument): Map<AnnotationType, number> {
  const stats = new Map<AnnotationType, number>();

  for (const page of document.pages()) {
    using p = page;
    for (const annot of p.getAnnotations()) {
      stats.set(annot.type, (stats.get(annot.type) || 0) + 1);
    }
  }

  return stats;
}
```

## See Also

- [PDFiumPage](/pdfium/api/classes/pdfium-page/) — Getting annotations
- [Annotations Guide](/pdfium/guides/annotations/) — Working with annotations
