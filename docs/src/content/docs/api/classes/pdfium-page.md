---
title: PDFiumPage
description: Represents a single page within a PDF document
---

The `PDFiumPage` class represents a single page within a PDF document. It provides methods for rendering, text extraction, annotations, page objects, and structure information.

## Import

```typescript
import { PDFium } from '@scaryterry/pdfium';

using pdfium = await PDFium.init();
using document = await pdfium.openDocument(data);
using page = document.getPage(0);
```

## Properties

### index

The zero-based index of this page within the document.

```typescript
get index(): number
```

---

### size

The page dimensions in points (1 point = 1/72 inch).

```typescript
get size(): PageSize
```

#### PageSize Interface

| Property | Type | Description |
|----------|------|-------------|
| `width` | `number` | Width in points |
| `height` | `number` | Height in points |

#### Example

```typescript
const { width, height } = page.size;
console.log(`Page size: ${width} x ${height} points`);
console.log(`In inches: ${width / 72} x ${height / 72}`);
```

---

### width

The page width in points.

```typescript
get width(): number
```

---

### height

The page height in points.

```typescript
get height(): number
```

---

### rotation

The page rotation as defined in the PDF.

```typescript
get rotation(): PageRotation
```

#### PageRotation Values

| Value | Degrees | Description |
|-------|---------|-------------|
| `None` | 0 | No rotation |
| `Clockwise90` | 90 | Rotated 90° clockwise |
| `Rotate180` | 180 | Rotated 180° |
| `CounterClockwise90` | 270 | Rotated 90° counter-clockwise |

---

### objectCount

The number of objects (text, images, paths, etc.) on this page.

```typescript
get objectCount(): number
```

---

### annotationCount

The number of annotations on this page.

```typescript
get annotationCount(): number
```

---

### handle

The internal page handle for advanced WASM operations.

```typescript
get handle(): PageHandle
```

:::caution
This is an internal property for advanced use cases.
:::

## Rendering Methods

### render()

Renders the page to an RGBA pixel buffer.

```typescript
render(options?: RenderOptions): RenderResult
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `RenderOptions` | Optional rendering settings |

#### RenderOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scale` | `number` | `1` | Scale factor (1 = 72 DPI) |
| `width` | `number` | — | Target width in pixels (overrides scale) |
| `height` | `number` | — | Target height in pixels (overrides scale) |
| `renderFormFields` | `boolean` | `false` | Include interactive form fields |
| `backgroundColour` | `number` | `0xFFFFFFFF` | ARGB background colour |
| `rotation` | `PageRotation` | — | Additional rotation to apply |

#### RenderResult

| Property | Type | Description |
|----------|------|-------------|
| `data` | `Uint8Array` | RGBA pixel data (4 bytes per pixel) |
| `width` | `number` | Rendered width in pixels |
| `height` | `number` | Rendered height in pixels |
| `originalWidth` | `number` | Original page width in points |
| `originalHeight` | `number` | Original page height in points |

#### Throws

- [`RenderError`](/pdfium/errors/#rendererror) with code:
  - `RENDER_INVALID_DIMENSIONS` (401) — Dimensions exceed limits
  - `RENDER_BITMAP_FAILED` (400) — Failed to create bitmap
  - `RENDER_FAILED` (402) — Rendering failed

#### Example

```typescript
// Basic render at 72 DPI
const result = page.render();

// High-quality render (3x scale = 216 DPI)
const { data, width, height } = page.render({ scale: 3 });

// Specific dimensions
const result = page.render({ width: 1200, height: 1600 });

// With form fields and transparent background
const result = page.render({
  scale: 2,
  renderFormFields: true,
  backgroundColour: 0x00000000, // Transparent
});

// Convert to PNG with sharp
import sharp from 'sharp';

const { data, width, height } = page.render({ scale: 3 });
const png = await sharp(data, {
  raw: { width, height, channels: 4 },
}).png().toBuffer();
```

## Text Methods

### getText()

Extracts all text content from the page.

```typescript
getText(): string
```

#### Returns

`string` — The extracted text with layout-aware spacing.

#### Throws

- [`TextError`](/pdfium/errors/#texterror) with code `TEXT_EXTRACTION_FAILED` (600)

#### Example

```typescript
const text = page.getText();
console.log(text);
```

---

### findText()

Searches for text occurrences on the page with position information.

```typescript
*findText(query: string, flags?: TextSearchFlags): Generator<TextSearchResult>
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | `string` | — | Text to search for |
| `flags` | `TextSearchFlags` | `None` | Search options |

#### TextSearchFlags

| Flag | Description |
|------|-------------|
| `None` | Case-insensitive, partial match |
| `MatchCase` | Case-sensitive search |
| `MatchWholeWord` | Match complete words only |
| `Consecutive` | Match consecutive occurrences |

#### TextSearchResult

| Property | Type | Description |
|----------|------|-------------|
| `charIndex` | `number` | Starting character index |
| `charCount` | `number` | Number of matched characters |
| `rects` | `TextRect[]` | Bounding rectangles |

#### Example

```typescript
import { TextSearchFlags } from '@scaryterry/pdfium';

// Case-insensitive search
for (const match of page.findText('invoice')) {
  console.log(`Found at char ${match.charIndex}`);
}

// Case-sensitive, whole word
for (const match of page.findText('Invoice', TextSearchFlags.MatchCase | TextSearchFlags.MatchWholeWord)) {
  console.log(`Found "${match.charCount}" chars at ${match.rects[0]}`);
}
```

---

### getCharBox()

Gets the bounding box of a specific character.

```typescript
getCharBox(charIndex: number): CharBox | undefined
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `charIndex` | `number` | Zero-based character index |

#### CharBox Interface

| Property | Type | Description |
|----------|------|-------------|
| `left` | `number` | Left edge in points |
| `right` | `number` | Right edge in points |
| `bottom` | `number` | Bottom edge in points |
| `top` | `number` | Top edge in points |

#### Returns

`CharBox | undefined` — Character bounds, or `undefined` if not found.

#### Example

```typescript
const box = page.getCharBox(0);
if (box) {
  console.log(`First character: (${box.left}, ${box.bottom}) to (${box.right}, ${box.top})`);
}
```

---

### getCharIndexAtPos()

Finds which character is at a given position.

```typescript
getCharIndexAtPos(
  x: number,
  y: number,
  xTolerance?: number,
  yTolerance?: number
): number
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `x` | `number` | — | X coordinate in points |
| `y` | `number` | — | Y coordinate in points |
| `xTolerance` | `number` | `5` | Horizontal tolerance |
| `yTolerance` | `number` | `5` | Vertical tolerance |

#### Returns

`number` — Character index, or `-1` if no character found.

#### Example

```typescript
const charIndex = page.getCharIndexAtPos(100, 200);
if (charIndex >= 0) {
  const text = page.getText();
  console.log(`Character at position: "${text[charIndex]}"`);
}
```

---

### getTextInRect()

Extracts text within a rectangular region.

```typescript
getTextInRect(
  left: number,
  top: number,
  right: number,
  bottom: number
): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `left` | `number` | Left edge in points |
| `top` | `number` | Top edge in points |
| `right` | `number` | Right edge in points |
| `bottom` | `number` | Bottom edge in points |

#### Returns

`string` — Text within the specified region.

#### Example

```typescript
// Extract text from upper-left quadrant
const text = page.getTextInRect(0, page.height / 2, page.width / 2, page.height);
console.log(`Upper-left text: ${text}`);
```

## Object Methods

### getObjects()

Gets all page objects (text, images, paths, etc.).

```typescript
getObjects(): PageObject[]
```

#### Returns

`PageObject[]` — Array of typed page objects.

#### PageObject Types

| Type | Properties |
|------|------------|
| `TextObject` | `type`, `bounds`, `text`, `fontSize` |
| `ImageObject` | `type`, `bounds`, `width`, `height` |
| `PathObject` | `type`, `bounds` |
| `ShadingObject` | `type`, `bounds` |
| `FormObject` | `type`, `bounds` |
| `UnknownObject` | `type`, `bounds` |

#### Example

```typescript
import { PageObjectType } from '@scaryterry/pdfium';

for (const obj of page.getObjects()) {
  switch (obj.type) {
    case PageObjectType.Text:
      console.log(`Text: "${obj.text}" at ${obj.fontSize}pt`);
      break;
    case PageObjectType.Image:
      console.log(`Image: ${obj.width}x${obj.height}px`);
      break;
    case PageObjectType.Path:
      console.log(`Path at ${JSON.stringify(obj.bounds)}`);
      break;
  }
}
```

## Annotation Methods

### getAnnotation()

Gets a specific annotation by its zero-based index.

```typescript
getAnnotation(index: number): Annotation
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `index` | `number` | Zero-based annotation index |

#### Annotation Interface

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | Annotation index |
| `type` | `AnnotationType` | Annotation subtype |
| `bounds` | `AnnotationBounds` | Bounding rectangle |
| `colour` | `Colour \| undefined` | Annotation colour |

#### Throws

- [`ObjectError`](/pdfium/errors/#objecterror) with code `ANNOT_INDEX_OUT_OF_RANGE` (750)

#### Example

```typescript
const annotation = page.getAnnotation(0);
console.log(`Type: ${annotation.type}, Bounds: ${JSON.stringify(annotation.bounds)}`);
```

---

### getAnnotations()

Gets all annotations on the page.

```typescript
getAnnotations(): Annotation[]
```

#### Returns

`Annotation[]` — Array of all annotations.

#### Example

```typescript
import { AnnotationType } from '@scaryterry/pdfium';

const annotations = page.getAnnotations();

const highlights = annotations.filter(a => a.type === AnnotationType.Highlight);
console.log(`Found ${highlights.length} highlights`);
```

## Structure Methods

### getStructureTree()

Gets the structure tree for tagged (accessible) PDFs.

```typescript
getStructureTree(): StructureElement[] | undefined
```

#### StructureElement Interface

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Structure type (e.g., "P", "H1", "Table") |
| `title` | `string \| undefined` | Element title |
| `altText` | `string \| undefined` | Alternative text |
| `lang` | `string \| undefined` | Language code |
| `children` | `StructureElement[]` | Child elements |

#### Returns

`StructureElement[] | undefined` — Structure tree, or `undefined` if not tagged.

#### Example

```typescript
const tree = page.getStructureTree();
if (tree) {
  function printTree(elements: StructureElement[], indent = 0) {
    for (const el of elements) {
      const prefix = '  '.repeat(indent);
      console.log(`${prefix}${el.type}${el.altText ? `: "${el.altText}"` : ''}`);
      printTree(el.children, indent + 1);
    }
  }
  printTree(tree);
} else {
  console.log('Document is not tagged');
}
```

## Resource Management

`PDFiumPage` implements the `Disposable` interface:

```typescript
// Recommended: using keyword
using page = document.getPage(0);
// Page closed when scope exits

// In loops
for (const page of document.pages()) {
  using p = page;
  // Process page...
}
```

### dispose()

Closes the page and releases resources.

```typescript
dispose(): void
```

## Complete Example

```typescript
import { PDFium, PageObjectType, TextSearchFlags } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';
import sharp from 'sharp';

async function analysePage() {
  const data = await fs.readFile('document.pdf');

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);
  using page = document.getPage(0);

  // Page info
  console.log(`Page ${page.index + 1}`);
  console.log(`  Size: ${page.width} x ${page.height} points`);
  console.log(`  Rotation: ${page.rotation}`);
  console.log(`  Objects: ${page.objectCount}`);
  console.log(`  Annotations: ${page.annotationCount}`);

  // Render to PNG
  const { data: pixels, width, height } = page.render({ scale: 2 });
  const png = await sharp(pixels, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
  await fs.writeFile('page.png', png);

  // Extract text
  const text = page.getText();
  console.log(`\nText (first 500 chars):\n${text.slice(0, 500)}`);

  // Search for keywords
  console.log('\nSearching for "invoice":');
  for (const match of page.findText('invoice')) {
    console.log(`  Found at char ${match.charIndex}, ${match.rects.length} rects`);
  }

  // List images
  const images = page.getObjects().filter(o => o.type === PageObjectType.Image);
  console.log(`\nImages: ${images.length}`);
  for (const img of images) {
    if (img.type === PageObjectType.Image) {
      console.log(`  ${img.width}x${img.height}px`);
    }
  }

  // List annotations
  const annotations = page.getAnnotations();
  console.log(`\nAnnotations: ${annotations.length}`);
  for (const annot of annotations) {
    console.log(`  ${annot.type} at ${JSON.stringify(annot.bounds)}`);
  }
}

analysePage();
```

## See Also

- [PDFiumDocument](/pdfium/api/classes/pdfium-document/) — Document-level operations
- [Render PDF Guide](/pdfium/guides/render-pdf/) — Detailed rendering guide
- [Extract Text Guide](/pdfium/guides/extract-text/) — Text extraction patterns
- [Annotations Guide](/pdfium/guides/annotations/) — Working with annotations
- [Page Objects Guide](/pdfium/guides/page-objects/) — Inspecting page content
