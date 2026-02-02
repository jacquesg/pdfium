---
title: PageObjectType
description: Types of objects that can appear on a PDF page
---

Identifies the type of content object on a PDF page.

## Import

```typescript
import { PageObjectType } from '@scaryterry/pdfium';
```

## Values

| Member | Value | Description |
|--------|-------|-------------|
| `Unknown` | 0 | Unknown or unsupported object type |
| `Text` | 1 | Text content |
| `Path` | 2 | Vector path (lines, curves) |
| `Image` | 3 | Embedded image |
| `Shading` | 4 | Gradient or pattern shading |
| `Form` | 5 | Form XObject (reusable content) |

## Usage

### Filter by Type

```typescript
using page = document.getPage(0);

// Get all images
const images = page.getObjects().filter(obj => obj.type === PageObjectType.Image);
console.log(`Found ${images.length} images`);

// Get all text objects
const textObjects = page.getObjects().filter(obj => obj.type === PageObjectType.Text);
console.log(`Found ${textObjects.length} text objects`);
```

### Switch on Type

```typescript
for (const obj of page.getObjects()) {
  switch (obj.type) {
    case PageObjectType.Text:
      console.log(`Text: "${obj.text}" at ${obj.fontSize}pt`);
      break;
    case PageObjectType.Image:
      console.log(`Image: ${obj.width}×${obj.height}px`);
      break;
    case PageObjectType.Path:
      console.log(`Path at ${JSON.stringify(obj.bounds)}`);
      break;
    case PageObjectType.Shading:
      console.log(`Shading at ${JSON.stringify(obj.bounds)}`);
      break;
    case PageObjectType.Form:
      console.log(`Form XObject at ${JSON.stringify(obj.bounds)}`);
      break;
    default:
      console.log(`Unknown object at ${JSON.stringify(obj.bounds)}`);
  }
}
```

### Count by Type

```typescript
function countObjectsByType(page: PDFiumPage): Map<PageObjectType, number> {
  const counts = new Map<PageObjectType, number>();

  for (const obj of page.getObjects()) {
    counts.set(obj.type, (counts.get(obj.type) || 0) + 1);
  }

  return counts;
}

const counts = countObjectsByType(page);
for (const [type, count] of counts) {
  console.log(`${PageObjectType[type]}: ${count}`);
}
```

## Object Properties by Type

### TextObject

```typescript
interface TextObject {
  type: PageObjectType.Text;
  bounds: ObjectBounds;
  text: string;
  fontSize: number;
}
```

### ImageObject

```typescript
interface ImageObject {
  type: PageObjectType.Image;
  bounds: ObjectBounds;
  width: number;   // Pixel width
  height: number;  // Pixel height
}
```

### PathObject / ShadingObject / FormObject

```typescript
interface PathObject {
  type: PageObjectType.Path;
  bounds: ObjectBounds;
}

interface ShadingObject {
  type: PageObjectType.Shading;
  bounds: ObjectBounds;
}

interface FormObject {
  type: PageObjectType.Form;
  bounds: ObjectBounds;
}
```

## See Also

- [PDFiumPage](/pdfium/api/classes/pdfium-page/) — Getting page objects
- [Page Objects Guide](/pdfium/guides/page-objects/) — Working with page content
- [Extract Images Guide](/pdfium/guides/extract-images/) — Image extraction
