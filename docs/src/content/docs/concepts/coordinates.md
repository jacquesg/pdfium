---
title: Coordinate Systems
description: Understanding PDF coordinate systems and unit conversions
---

PDF uses a specific coordinate system that differs from typical screen coordinates. Understanding this is essential for positioning content and interpreting bounds.

## PDF Coordinate System

### Origin and Axes

- **Origin**: Bottom-left corner of the page
- **X-axis**: Increases to the right
- **Y-axis**: Increases upward
- **Units**: Points (1 point = 1/72 inch)

```
  Y
  ↑
  │
  │    (100, 500)
  │         •
  │
  │    (50, 200)
  │         •
  │
  ├───────────────→ X
(0,0)
```

### Screen Coordinates (Comparison)

Most screen/canvas systems use:
- **Origin**: Top-left corner
- **Y-axis**: Increases downward

```
(0,0)───────────────→ X
  │
  │    (50, 100)
  │         •
  │
  │    (100, 400)
  │         •
  │
  ↓
  Y
```

## Points and DPI

### Points

PDF uses **points** as the primary unit:
- 1 point = 1/72 inch
- 72 points = 1 inch

### Common Page Sizes in Points

| Format | Width (pt) | Height (pt) | Inches |
|--------|-----------|-------------|--------|
| US Letter | 612 | 792 | 8.5 × 11 |
| A4 | 595 | 842 | 8.27 × 11.69 |

### Scale and DPI Relationship

When rendering:
- `scale: 1` → 72 DPI (1 pixel per point)
- `scale: 2` → 144 DPI (2 pixels per point)
- `scale: 3` → 216 DPI (3 pixels per point)

```typescript
// Calculate pixels from points
function pointsToPixels(points: number, scale: number): number {
  return points * scale;
}

// Calculate DPI from scale
function scaleToDPI(scale: number): number {
  return 72 * scale;
}
```

## Coordinate Conversions

### PDF to Screen Coordinates

```typescript
function pdfToScreen(
  pdfX: number,
  pdfY: number,
  pageHeight: number,
  scale: number
): { x: number; y: number } {
  return {
    x: pdfX * scale,
    y: (pageHeight - pdfY) * scale, // Flip Y
  };
}

// Usage
const screenCoords = pdfToScreen(100, 500, 792, 2);
// { x: 200, y: 584 }
```

### Screen to PDF Coordinates

```typescript
function screenToPDF(
  screenX: number,
  screenY: number,
  pageHeight: number,
  scale: number
): { x: number; y: number } {
  return {
    x: screenX / scale,
    y: pageHeight - (screenY / scale), // Flip Y
  };
}
```

### Bounding Box Conversion

```typescript
interface PDFBounds {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function boundsToScreenRect(
  bounds: PDFBounds,
  pageHeight: number,
  scale: number
): ScreenRect {
  return {
    x: bounds.left * scale,
    y: (pageHeight - bounds.top) * scale,
    width: (bounds.right - bounds.left) * scale,
    height: (bounds.top - bounds.bottom) * scale,
  };
}
```

## Working with Text Positions

### Character Bounds

`getCharBox()` returns bounds in PDF coordinates:

```typescript
const box = page.getCharBox(0);
if (box) {
  // PDF coordinates (origin bottom-left)
  console.log(`Left: ${box.left}, Bottom: ${box.bottom}`);
  console.log(`Right: ${box.right}, Top: ${box.top}`);

  // Convert to screen coordinates
  const screenRect = boundsToScreenRect(
    { left: box.left, bottom: box.bottom, right: box.right, top: box.top },
    page.height,
    2
  );
}
```

### Character at Position

`getCharIndexAtPos()` expects PDF coordinates:

```typescript
// Convert screen click to PDF coordinates first
function handleClick(screenX: number, screenY: number) {
  const pdfCoords = screenToPDF(screenX, screenY, page.height, scale);
  const charIndex = page.getCharIndexAtPos(pdfCoords.x, pdfCoords.y);

  if (charIndex >= 0) {
    console.log(`Clicked on character ${charIndex}`);
  }
}
```

## Working with Annotations

### Annotation Bounds

```typescript
const annotation = page.getAnnotation(0);
const { left, top, right, bottom } = annotation.bounds;

// Note: 'top' and 'bottom' follow PDF convention
// top > bottom (higher Y value is at top)

// Convert to screen rectangle
const rect = boundsToScreenRect(
  { left, bottom, right, top },
  page.height,
  scale
);
```

## Creating Content

### Text Positioning

When adding text with `PDFiumPageBuilder`:

```typescript
// Position from bottom-left
page.addText('Hello', 72, 720, font, 24);
// 72pt from left edge, 720pt from bottom (near top on US Letter)

// For top-relative positioning:
function positionFromTop(fromTop: number, pageHeight: number): number {
  return pageHeight - fromTop;
}

page.addText('Title', 72, positionFromTop(72, 792), font, 24);
// 72pt from left, 72pt from top
```

### Rectangle Positioning

```typescript
// Origin is bottom-left corner of rectangle
page.addRect(72, 700, 200, 50, style);
// Creates rectangle at (72, 700) with width 200, height 50
// Bottom edge at y=700, top edge at y=750
```

## Unit Conversions

### Points to Inches

```typescript
function pointsToInches(points: number): number {
  return points / 72;
}

function inchesToPoints(inches: number): number {
  return inches * 72;
}
```

### Points to Millimetres

```typescript
function pointsToMM(points: number): number {
  return points * 0.352778; // 25.4mm per inch / 72pt per inch
}

function mmToPoints(mm: number): number {
  return mm * 2.834646; // 72pt per inch / 25.4mm per inch
}
```

### Points to Centimetres

```typescript
function pointsToCM(points: number): number {
  return points * 0.0352778;
}

function cmToPoints(cm: number): number {
  return cm * 28.34646;
}
```

## Practical Examples

### Highlight Text Match

```typescript
function drawHighlight(
  ctx: CanvasRenderingContext2D,
  result: TextSearchResult,
  pageHeight: number,
  scale: number
) {
  ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';

  for (const rect of result.rects) {
    const screenRect = boundsToScreenRect(
      { left: rect.left, bottom: rect.bottom, right: rect.right, top: rect.top },
      pageHeight,
      scale
    );

    ctx.fillRect(screenRect.x, screenRect.y, screenRect.width, screenRect.height);
  }
}
```

### Click-to-Text Selection

```typescript
function getTextAtClick(
  page: PDFiumPage,
  clickX: number,
  clickY: number,
  scale: number
): string | null {
  const pdf = screenToPDF(clickX, clickY, page.height, scale);
  const charIndex = page.getCharIndexAtPos(pdf.x, pdf.y, 5, 5);

  if (charIndex < 0) return null;

  const text = page.getText();
  // Find word boundaries
  let start = charIndex;
  let end = charIndex;

  while (start > 0 && /\w/.test(text[start - 1])) start--;
  while (end < text.length && /\w/.test(text[end])) end++;

  return text.slice(start, end);
}
```

## See Also

- [Render PDF Guide](/pdfium/guides/render-pdf/) — Rendering with scale
- [Search Text Guide](/pdfium/guides/search-text/) — Working with text bounds
- [Annotations Guide](/pdfium/guides/annotations/) — Annotation bounds
