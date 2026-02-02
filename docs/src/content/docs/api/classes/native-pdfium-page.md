---
title: NativePDFiumPage
description: API reference for NativePDFiumPage class
---

`NativePDFiumPage` represents a single page in a PDF document backed by the native PDFium addon. It supports page dimensions, text extraction, rendering, annotations, and links.

## Import

Pages are obtained from `NativePDFiumDocument.getPage()`:

```typescript
const pdfium = await PDFium.initNative();
if (pdfium) {
  using doc = pdfium.openDocument(pdfBytes);
  using page = doc.getPage(0);
}
```

## Properties

### index

Zero-based page index.

```typescript
get index(): number
```

### width

Page width in points (1/72 inch).

```typescript
get width(): number
```

### height

Page height in points.

```typescript
get height(): number
```

### size

Page dimensions as an object.

```typescript
get size(): { width: number; height: number }
```

### charCount

Number of characters on the page.

```typescript
get charCount(): number
```

### rotation

Page rotation (0, 90, 180, or 270 degrees).

```typescript
get rotation(): PageRotation
```

### annotationCount

Number of annotations on the page.

```typescript
get annotationCount(): number
```

### Page Boxes

```typescript
get mediaBox(): PageBox | undefined
get cropBox(): PageBox | undefined
get bleedBox(): PageBox | undefined
get trimBox(): PageBox | undefined
get artBox(): PageBox | undefined
```

## Text Extraction

### getText()

Extract all text from the page.

```typescript
getText(): string
```

**Example:**

```typescript
const text = page.getText();
console.log(text);
```

### getBoundedText()

Get text within a bounding rectangle.

```typescript
getBoundedText(
  left: number,
  top: number,
  right: number,
  bottom: number
): string
```

### findText()

Search for text on the page.

```typescript
*findText(
  query: string,
  flags?: TextSearchFlags
): Generator<TextSearchResult>
```

**Example:**

```typescript
for (const result of page.findText('invoice')) {
  console.log(`Found at char ${result.charIndex}`);
}
```

### getCharIndexAtPos()

Get character index at a page position.

```typescript
getCharIndexAtPos(
  x: number,
  y: number,
  xTolerance?: number,
  yTolerance?: number
): number
```

Returns -1 if no character found.

## Character Information

### getCharUnicode()

Get Unicode codepoint of a character.

```typescript
getCharUnicode(charIndex: number): number
```

### getCharBox()

Get bounding box of a character.

```typescript
getCharBox(charIndex: number): CharBox | undefined
```

### getCharLooseBox()

Get loose bounding box of a character.

```typescript
getCharLooseBox(charIndex: number): TextRect | undefined
```

### getCharOrigin()

Get origin point of a character.

```typescript
getCharOrigin(charIndex: number): { x: number; y: number } | undefined
```

### getCharFontSize()

Get font size of a character.

```typescript
getCharFontSize(charIndex: number): number
```

### getCharFontWeight()

Get font weight of a character (100-900).

```typescript
getCharFontWeight(charIndex: number): number
```

### getCharFontName()

Get font name of a character.

```typescript
getCharFontName(charIndex: number): string | undefined
```

### getCharRenderMode()

Get text render mode for a character.

```typescript
getCharRenderMode(charIndex: number): TextRenderMode
```

### getCharAngle()

Get rotation angle (radians) of a character.

```typescript
getCharAngle(charIndex: number): number
```

### Character Flags

```typescript
isCharGenerated(charIndex: number): boolean
isCharHyphen(charIndex: number): boolean
hasCharUnicodeMapError(charIndex: number): boolean
```

### Character Colours

```typescript
getCharFillColour(charIndex: number): Colour | undefined
getCharStrokeColour(charIndex: number): Colour | undefined
```

### getCharMatrix()

Get transformation matrix [a, b, c, d, e, f] of a character.

```typescript
getCharMatrix(charIndex: number): number[] | undefined
```

## Rendering

### render()

Render the page to an RGBA bitmap.

```typescript
render(options?: RenderOptions): RenderResult
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `scale` | `number` | Scale factor (default: 1) |
| `width` | `number` | Target width (overrides scale) |
| `height` | `number` | Target height (overrides scale) |
| `rotation` | `PageRotation` | Additional rotation |
| `backgroundColour` | `number` | ARGB background (default: white) |

**Example:**

```typescript
const result = page.render({ scale: 2 });
console.log(`${result.width}x${result.height} pixels`);
// result.data is Uint8Array of RGBA pixels
```

## Annotations

### getAnnotations()

Get all annotations on the page.

```typescript
getAnnotations(): Annotation[]
```

### createAnnotation()

Create a new annotation.

```typescript
createAnnotation(subtype: AnnotationType): number
```

Returns the index of the new annotation.

### removeAnnotation()

Remove an annotation by index.

```typescript
removeAnnotation(index: number): boolean
```

### Annotation Modification

```typescript
setAnnotationRect(index: number, bounds: AnnotationBounds): boolean
setAnnotationColour(index: number, colour: Colour, colourType?: number): boolean
getAnnotationFlags(index: number): number
setAnnotationFlags(index: number, flags: number): boolean
setAnnotationStringValue(index: number, key: string, value: string): boolean
setAnnotationBorder(index: number, hRadius: number, vRadius: number, width: number): boolean
setAnnotationUri(index: number, uri: string): boolean
```

**Example:**

```typescript
const idx = page.createAnnotation(AnnotationType.Text);
page.setAnnotationRect(idx, { left: 100, top: 200, right: 150, bottom: 180 });
page.setAnnotationColour(idx, { r: 255, g: 0, b: 0, a: 255 });
page.setAnnotationStringValue(idx, 'Contents', 'Note text');
```

## Links

### getLinks()

Get all links on the page.

```typescript
getLinks(): PDFLink[]
```

**Example:**

```typescript
for (const link of page.getLinks()) {
  console.log(`Link at (${link.bounds.left}, ${link.bounds.top})`);
  if (link.action?.uri) {
    console.log(`  URL: ${link.action.uri}`);
  }
  if (link.destination) {
    console.log(`  Goes to page ${link.destination.pageIndex}`);
  }
}
```

## Page Operations

### hasTransparency()

Check if the page has transparency.

```typescript
hasTransparency(): boolean
```

### flatten()

Flatten annotations and form fields into page content.

```typescript
flatten(flags?: FlattenFlags): FlattenResult
```

### generateContent()

Generate the page content stream after modifications.

```typescript
generateContent(): boolean
```

### Page Box Operations

```typescript
getPageBox(boxType: PageBoxType): PageBox | undefined
setPageBox(boxType: PageBoxType, box: PageBox): void
```

## Coordinate Conversion

### deviceToPage()

Convert device coordinates to page coordinates.

```typescript
deviceToPage(
  context: CoordinateTransformContext,
  deviceX: number,
  deviceY: number
): PageCoordinate
```

### pageToDevice()

Convert page coordinates to device coordinates.

```typescript
pageToDevice(
  context: CoordinateTransformContext,
  pageX: number,
  pageY: number
): DeviceCoordinate
```

**Example:**

```typescript
const context = {
  startX: 0,
  startY: 0,
  sizeX: Math.round(page.width),
  sizeY: Math.round(page.height),
  rotate: PageRotation.None,
};

const pageCoord = page.deviceToPage(context, 100, 100);
const deviceCoord = page.pageToDevice(context, pageCoord.x, pageCoord.y);
```

## Resource Management

```typescript
// Automatic cleanup
{
  using page = doc.getPage(0);
  const text = page.getText();
} // Page disposed automatically

// Manual cleanup
const page = doc.getPage(0);
try {
  const text = page.getText();
} finally {
  page.dispose();
}
```

## See Also

- [NativePDFiumDocument](/pdfium/api/classes/native-pdfium-document/) — Document class
- [PDFiumPage](/pdfium/api/classes/pdfium-page/) — WASM page class
- [Coordinate System](/pdfium/concepts/coordinates/) — Coordinate conversion
