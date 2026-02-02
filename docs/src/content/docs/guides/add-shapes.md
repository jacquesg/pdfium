---
title: Add Shapes
description: Drawing rectangles and shapes on PDF pages
---

This guide covers adding shapes to PDF pages when creating documents from scratch using `PDFiumDocumentBuilder`.

## Prerequisites

- Familiarity with [Create Document](/pdfium/guides/create-document/) guide
- Understanding of [Coordinate Systems](/pdfium/concepts/coordinates/)

## Adding Rectangles

Use `addRectangle()` on a `PDFiumPageBuilder`:

```typescript
page.addRectangle(x, y, width, height, style);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Left edge in points |
| `y` | `number` | Bottom edge in points |
| `width` | `number` | Width in points |
| `height` | `number` | Height in points |
| `style` | `ShapeStyle` | Optional fill and stroke styling |

### ShapeStyle Interface

```typescript
interface ShapeStyle {
  fill?: Colour;      // Fill colour
  stroke?: Colour;    // Stroke (border) colour
  strokeWidth?: number; // Stroke width in points
}

interface Colour {
  r: number;  // Red (0-255)
  g: number;  // Green (0-255)
  b: number;  // Blue (0-255)
  a: number;  // Alpha (0-255, where 255 = opaque)
}
```

## Basic Examples

### Filled Rectangle

```typescript
const page = builder.addPage();

// Red filled rectangle
page.addRectangle(72, 700, 200, 50, {
  fill: { r: 255, g: 0, b: 0, a: 255 },
});
```

### Stroked Rectangle (Border Only)

```typescript
// Blue border, no fill
page.addRectangle(72, 600, 200, 50, {
  stroke: { r: 0, g: 0, b: 255, a: 255 },
  strokeWidth: 2,
});
```

### Filled with Stroke

```typescript
// Green fill with black border
page.addRectangle(72, 500, 200, 50, {
  fill: { r: 0, g: 255, b: 0, a: 255 },
  stroke: { r: 0, g: 0, b: 0, a: 255 },
  strokeWidth: 1,
});
```

### Semi-Transparent Rectangle

```typescript
// Semi-transparent blue overlay
page.addRectangle(72, 400, 200, 100, {
  fill: { r: 0, g: 100, b: 200, a: 128 }, // 50% transparent
});
```

## Common Patterns

### Horizontal Line

```typescript
// Thin horizontal line (1 point tall rectangle)
page.addRectangle(72, 650, 468, 1, {
  fill: { r: 0, g: 0, b: 0, a: 255 },
});
```

### Vertical Line

```typescript
// Thin vertical line (1 point wide rectangle)
page.addRectangle(306, 200, 1, 400, {
  fill: { r: 128, g: 128, b: 128, a: 255 },
});
```

### Background Colour

```typescript
// Full-page background (must be added first)
const page = builder.addPage();
page.addRectangle(0, 0, 612, 792, {
  fill: { r: 245, g: 245, b: 245, a: 255 }, // Light grey
});

// Then add other content on top
page.addText('Content', 72, 700, font, 12);
```

### Highlight Box

```typescript
// Yellow highlight behind text
page.addRectangle(70, 695, 150, 20, {
  fill: { r: 255, g: 255, b: 0, a: 128 }, // Semi-transparent yellow
});
page.addText('Highlighted text', 72, 700, font, 12);
```

### Table Cells

```typescript
function drawTableCell(
  page: PDFiumPageBuilder,
  x: number,
  y: number,
  width: number,
  height: number,
  isHeader: boolean,
): void {
  page.addRectangle(x, y, width, height, {
    fill: isHeader
      ? { r: 220, g: 220, b: 220, a: 255 }  // Grey for header
      : { r: 255, g: 255, b: 255, a: 255 }, // White for cells
    stroke: { r: 0, g: 0, b: 0, a: 255 },
    strokeWidth: 0.5,
  });
}

// Draw a simple 2x3 table
const startX = 72;
const startY = 600;
const cellWidth = 150;
const cellHeight = 30;

for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 2; col++) {
    drawTableCell(
      page,
      startX + col * cellWidth,
      startY - row * cellHeight,
      cellWidth,
      cellHeight,
      row === 0, // First row is header
    );
  }
}
```

### Progress Bar

```typescript
function drawProgressBar(
  page: PDFiumPageBuilder,
  x: number,
  y: number,
  width: number,
  height: number,
  progress: number, // 0-100
): void {
  // Background (grey)
  page.addRectangle(x, y, width, height, {
    fill: { r: 220, g: 220, b: 220, a: 255 },
    stroke: { r: 180, g: 180, b: 180, a: 255 },
    strokeWidth: 1,
  });

  // Progress fill (blue)
  const fillWidth = (width - 2) * (progress / 100);
  if (fillWidth > 0) {
    page.addRectangle(x + 1, y + 1, fillWidth, height - 2, {
      fill: { r: 0, g: 120, b: 215, a: 255 },
    });
  }
}

// Usage
drawProgressBar(page, 72, 500, 200, 20, 75); // 75% complete
```

## Complete Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function createShapesDocument() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const font = builder.loadStandardFont('Helvetica');
  const boldFont = builder.loadStandardFont('Helvetica-Bold');

  const page = builder.addPage();

  // Background
  page.addRectangle(0, 0, 612, 792, {
    fill: { r: 250, g: 250, b: 250, a: 255 },
  });

  // Header bar
  page.addRectangle(0, 742, 612, 50, {
    fill: { r: 0, g: 80, b: 160, a: 255 },
  });
  page.addText('Shape Examples', 72, 760, boldFont, 18);

  // Colour swatches
  const colours = [
    { r: 255, g: 0, b: 0 },     // Red
    { r: 255, g: 165, b: 0 },   // Orange
    { r: 255, g: 255, b: 0 },   // Yellow
    { r: 0, g: 255, b: 0 },     // Green
    { r: 0, g: 0, b: 255 },     // Blue
    { r: 128, g: 0, b: 128 },   // Purple
  ];

  page.addText('Colour Swatches:', 72, 690, boldFont, 12);
  colours.forEach((colour, i) => {
    page.addRectangle(72 + i * 50, 650, 40, 30, {
      fill: { ...colour, a: 255 },
      stroke: { r: 0, g: 0, b: 0, a: 255 },
      strokeWidth: 1,
    });
  });

  // Transparency demo
  page.addText('Transparency:', 72, 600, boldFont, 12);
  page.addRectangle(72, 520, 100, 60, {
    fill: { r: 255, g: 0, b: 0, a: 255 },
  });
  page.addRectangle(122, 540, 100, 60, {
    fill: { r: 0, g: 0, b: 255, a: 180 },
  });

  // Border styles
  page.addText('Border Widths:', 72, 470, boldFont, 12);
  [0.5, 1, 2, 4].forEach((width, i) => {
    page.addRectangle(72 + i * 110, 420, 90, 40, {
      stroke: { r: 0, g: 0, b: 0, a: 255 },
      strokeWidth: width,
    });
    page.addText(`${width}pt`, 105 + i * 110, 435, font, 10);
  });

  const pdfBytes = builder.save();
  await fs.writeFile('shapes-example.pdf', pdfBytes);
}

createShapesDocument();
```

## Colour Reference

### Common Colours

| Colour | R | G | B |
|--------|---|---|---|
| Black | 0 | 0 | 0 |
| White | 255 | 255 | 255 |
| Red | 255 | 0 | 0 |
| Green | 0 | 255 | 0 |
| Blue | 0 | 0 | 255 |
| Yellow | 255 | 255 | 0 |
| Cyan | 0 | 255 | 255 |
| Magenta | 255 | 0 | 255 |
| Grey | 128 | 128 | 128 |
| Light Grey | 211 | 211 | 211 |

### Transparency Values

| Alpha | Opacity |
|-------|---------|
| 255 | 100% (opaque) |
| 191 | 75% |
| 128 | 50% |
| 64 | 25% |
| 0 | 0% (invisible) |

## Limitations

- **Rectangles only** — complex paths are not exposed in the high-level API
- **No gradients** — only solid colours are supported
- **No rounded corners** — rectangles have sharp corners only
- **No shadows** — drop shadows must be simulated with overlapping shapes

## See Also

- [Create Document Guide](/pdfium/guides/create-document/) — Full document creation workflow
- [Add Text Guide](/pdfium/guides/add-text/) — Adding text content
- [PDFiumPageBuilder](/pdfium/api/classes/pdfium-page-builder/) — Page builder API
- [Coordinate Systems](/pdfium/concepts/coordinates/) — Understanding PDF coordinates
