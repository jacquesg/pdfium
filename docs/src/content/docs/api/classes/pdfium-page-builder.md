---
title: PDFiumPageBuilder
description: Builder for adding content to a new PDF page
---

The `PDFiumPageBuilder` class provides methods for adding text and shapes to a page being created with `PDFiumDocumentBuilder`.

:::note
`PDFiumPageBuilder` is not disposable. It does not implement `Symbol.dispose`. The page is managed by the parent `PDFiumDocumentBuilder`.
:::

## Import

```typescript
import { PDFium } from '@scaryterry/pdfium';

using pdfium = await PDFium.init();
using builder = pdfium.createDocument();
const page = builder.addPage(); // Not using 'using' - page is not disposable
```

## Properties

### handle

The internal page handle for advanced WASM operations.

```typescript
get handle(): PageHandle
```

:::caution
This is an internal property for advanced use cases.
:::

## Methods

### addRectangle()

Adds a rectangle to the page.

```typescript
addRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  style?: ShapeStyle
): void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Left edge in points |
| `y` | `number` | Bottom edge in points |
| `width` | `number` | Width in points |
| `height` | `number` | Height in points |
| `style` | `ShapeStyle` | Optional fill and stroke |

#### ShapeStyle

| Property | Type | Description |
|----------|------|-------------|
| `fill` | `Colour` | Fill colour (RGBA) |
| `stroke` | `Colour` | Stroke colour (RGBA) |
| `strokeWidth` | `number` | Stroke width in points |

#### Colour

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `r` | `number` | 0-255 | Red component |
| `g` | `number` | 0-255 | Green component |
| `b` | `number` | 0-255 | Blue component |
| `a` | `number` | 0-255 | Alpha (255 = opaque) |

#### Example

```typescript
// Filled rectangle (red)
page.addRectangle(72, 700, 200, 50, {
  fill: { r: 255, g: 0, b: 0, a: 255 },
});

// Stroked rectangle (blue border)
page.addRectangle(72, 600, 200, 50, {
  stroke: { r: 0, g: 0, b: 255, a: 255 },
  strokeWidth: 2,
});

// Filled with stroke (green fill, black border)
page.addRectangle(72, 500, 200, 50, {
  fill: { r: 0, g: 255, b: 0, a: 128 }, // Semi-transparent
  stroke: { r: 0, g: 0, b: 0, a: 255 },
  strokeWidth: 1,
});

// Thin horizontal line
page.addRectangle(72, 400, 468, 1, {
  fill: { r: 0, g: 0, b: 0, a: 255 },
});
```

---

### addText()

Adds text to the page.

```typescript
addText(
  text: string,
  x: number,
  y: number,
  font: FontHandle,
  fontSize: number
): void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | `string` | Text content |
| `x` | `number` | Left edge in points |
| `y` | `number` | Baseline position in points |
| `font` | `FontHandle` | Font from `loadStandardFont()` |
| `fontSize` | `number` | Font size in points |

#### Coordinate System

- Origin (0, 0) is at the bottom-left of the page
- X increases to the right
- Y increases upward
- Text is positioned at its baseline

#### Example

```typescript
const font = builder.loadStandardFont('Helvetica');
const boldFont = builder.loadStandardFont('Helvetica-Bold');

// Title at top of page (US Letter)
page.addText('Document Title', 72, 750, boldFont, 24);

// Body text
page.addText('This is paragraph text.', 72, 700, font, 12);

// Footer at bottom
page.addText('Page 1', 72, 36, font, 10);

// Right-aligned (calculate position)
const text = 'Right aligned';
const approxWidth = text.length * 6; // Rough estimate
page.addText(text, 540 - approxWidth, 700, font, 12);
```

---

### generateContent()

Generates the page content stream. Call after adding all objects to commit them to the page.

```typescript
generateContent(): void
```

:::note
Calling `generateContent()` is optional. The parent `PDFiumDocumentBuilder.save()` method automatically generates content for all pages before saving.
:::

#### Example

```typescript
const page = builder.addPage();
page.addText('Hello, World!', 72, 720, font, 24);
page.generateContent(); // Optional - save() calls this automatically
```

## Complete Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function createBusinessCard() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  // Business card size (3.5" x 2")
  const width = 252;  // 3.5 inches * 72 points
  const height = 144; // 2 inches * 72 points

  const helvetica = builder.loadStandardFont('Helvetica');
  const helveticaBold = builder.loadStandardFont('Helvetica-Bold');

  const page = builder.addPage({ width, height });

  // Background rectangle
  page.addRectangle(0, 0, width, height, {
    fill: { r: 245, g: 245, b: 245, a: 255 },
  });

  // Accent bar
  page.addRectangle(0, height - 10, width, 10, {
    fill: { r: 0, g: 102, b: 204, a: 255 },
  });

  // Name
  page.addText('Jane Smith', 18, 105, helveticaBold, 16);

  // Title
  page.addText('Software Engineer', 18, 85, helvetica, 10);

  // Contact info
  page.addText('jane.smith@example.com', 18, 55, helvetica, 8);
  page.addText('+44 20 1234 5678', 18, 42, helvetica, 8);
  page.addText('www.example.com', 18, 29, helvetica, 8);

  // save() automatically generates content for all pages
  const pdfBytes = builder.save();
  await fs.writeFile('business-card.pdf', pdfBytes);
}
```

## Drawing a Simple Chart

```typescript
async function createBarChart() {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const font = builder.loadStandardFont('Helvetica');
  const boldFont = builder.loadStandardFont('Helvetica-Bold');

  const page = builder.addPage();

  // Chart title
  page.addText('Monthly Sales 2024', 200, 720, boldFont, 18);

  // Chart area
  const chartLeft = 100;
  const chartBottom = 200;
  const chartWidth = 400;
  const chartHeight = 400;

  // Axes
  page.addRectangle(chartLeft, chartBottom, 2, chartHeight, {
    fill: { r: 0, g: 0, b: 0, a: 255 },
  });
  page.addRectangle(chartLeft, chartBottom, chartWidth, 2, {
    fill: { r: 0, g: 0, b: 0, a: 255 },
  });

  // Data
  const data = [
    { label: 'Jan', value: 65 },
    { label: 'Feb', value: 45 },
    { label: 'Mar', value: 80 },
    { label: 'Apr', value: 55 },
    { label: 'May', value: 90 },
    { label: 'Jun', value: 70 },
  ];

  const barWidth = 50;
  const gap = 15;
  const maxValue = 100;

  data.forEach((item, index) => {
    const barHeight = (item.value / maxValue) * chartHeight;
    const barX = chartLeft + 20 + index * (barWidth + gap);
    const barY = chartBottom + 2;

    // Bar
    page.addRectangle(barX, barY, barWidth, barHeight, {
      fill: { r: 0, g: 102, b: 204, a: 255 },
    });

    // Label
    page.addText(item.label, barX + 15, chartBottom - 20, font, 10);

    // Value
    page.addText(item.value.toString(), barX + 18, barY + barHeight + 5, font, 9);
  });

  // Y-axis label
  page.addText('Sales (units)', 30, 400, font, 10);

  const pdfBytes = builder.save();
  await fs.writeFile('chart.pdf', pdfBytes);
}
```

## See Also

- [PDFiumDocumentBuilder](/pdfium/api/classes/pdfium-document-builder/) — Creating documents
- [Create Document Guide](/pdfium/guides/create-document/) — Full document creation workflow
